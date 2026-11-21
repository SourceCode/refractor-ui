import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ScatterBubblePlot,
  type ScatterPoint,
  type ScatterTone,
} from './index';

const SAMPLE_POINTS: ScatterPoint[] = [
  { id: 'alpha', label: 'Alpha Node', x: 10, y: 20, size: 100, group: 'Core', tone: 'emerald' },
  { id: 'beta', label: 'Beta Node', x: 40, y: 80, size: 500, group: 'ML', tone: 'primary' },
  { id: 'gamma', label: 'Gamma Node', x: 70, y: 50, size: 300, group: 'Core' },
  { id: 'delta', label: 'Delta Node', x: 90, y: 30, group: 'Edge', tone: 'rose' },
];

describe('ScatterBubblePlot', () => {
  it('renders optical scatter/bubble plot with ref, theme override, --prism-* tokens, size radii 6..20, and readout', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ScatterBubblePlot: {
              className: 'theme-scatter',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <ScatterBubblePlot
          ref={ref}
          title="Latency vs Throughput"
          xLabel="Throughput"
          yLabel="Latency"
          sizeLabel="Errors"
          points={SAMPLE_POINTS}
          showQuadrants
          className="local-scatter"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="scatter-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('scatter-root');
    expect(ref.current).toBe(root);
    expect(ScatterBubblePlot.displayName).toBe('ScatterBubblePlot');
    expect(root).toHaveClass(
      'refractor-scatter-bubble-plot',
      'prism-slab',
      'theme-scatter',
      'local-scatter'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', marginTop: '6px' });
    expect(root).toHaveAttribute('data-quadrants', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    const svg = screen.getByRole('img', { name: 'Latency vs Throughput' });
    expect(svg).toHaveAttribute('viewBox', '0 0 640 260');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');
    expect(screen.getAllByTestId('scatter-gridline-x')).toHaveLength(5);
    expect(screen.getAllByTestId('scatter-gridline-y')).toHaveLength(5);
    expect(screen.getByTestId('scatter-quadrant-x')).toHaveAttribute('stroke-dasharray', '6 4');
    expect(screen.getByTestId('scatter-quadrant-y')).toHaveAttribute('stroke-dasharray', '6 4');
    expect(screen.getByTestId('scatter-x-axis-label')).toHaveTextContent('Throughput');
    expect(screen.getByTestId('scatter-y-axis-label')).toHaveTextContent('Latency');

    // Bubble radii: min size (100) -> 6, max size (500) -> 20, mid (300) -> 13, unsized -> 7
    const alpha = screen.getByTestId('scatter-point-alpha');
    const beta = screen.getByTestId('scatter-point-beta');
    const gamma = screen.getByTestId('scatter-point-gamma');
    const delta = screen.getByTestId('scatter-point-delta');

    expect(Number(alpha.getAttribute('r'))).toBeCloseTo(6, 5);
    expect(Number(beta.getAttribute('r'))).toBeCloseTo(20, 5);
    expect(Number(gamma.getAttribute('r'))).toBeCloseTo(13, 5);
    expect(Number(delta.getAttribute('r'))).toBeCloseTo(7, 5);

    expect(alpha).toHaveAttribute('fill', 'var(--prism-success-main)');
    expect(alpha).toHaveAttribute('fill-opacity', '0.72');
    expect(beta).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(delta).toHaveAttribute('fill', 'var(--prism-error-main)');

    // Active ring and recessed readout default to first visible point
    expect(screen.getByTestId('scatter-active-ring-alpha')).toBeInTheDocument();
    const readout = screen.getByTestId('scatter-plot-readout');
    expect(readout).toHaveTextContent('Alpha Node');
    expect(readout).toHaveTextContent('Throughput: 10');
    expect(readout).toHaveTextContent('Latency: 20');
    expect(readout).toHaveTextContent('Errors: 100');
    expect(readout).toHaveTextContent('Core');
  });

  it('cycles all 5 semantic tones cleanly when ungrouped, clamps height 160..520, and omits quadrants by default', () => {
    const fivePoints: ScatterPoint[] = [
      { id: 'p1', label: 'P1', x: 1, y: 10, size: 25 },
      { id: 'p2', label: 'P2', x: 2, y: 20, size: 25 },
      { id: 'p3', label: 'P3', x: 3, y: 30 },
      { id: 'p4', label: 'P4', x: 4, y: 40 },
      { id: 'p5', label: 'P5', x: 5, y: 50 },
    ];
    const expectedTones: ScatterTone[] = ['primary', 'secondary', 'emerald', 'amber', 'rose'];

    const { rerender } = render(
      <ScatterBubblePlot points={fivePoints} height={80} />
    );

    expect(screen.queryByTestId('scatter-group-filters')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scatter-quadrants')).not.toBeInTheDocument();
    expect(screen.getByTestId('scatter-plot-svg')).toHaveAttribute('viewBox', '0 0 640 160');

    expectedTones.forEach((tone, index) => {
      expect(screen.getByTestId(`scatter-point-p${index + 1}`)).toHaveAttribute('data-tone', tone);
    });
    expect(screen.getByTestId('scatter-point-p2')).toHaveAttribute('fill', 'var(--prism-secondary-main)');
    expect(screen.getByTestId('scatter-point-p4')).toHaveAttribute('fill', 'var(--prism-warning-main)');

    // Equal positive sizes map to midpoint radius 13 and default sizeLabel falls back to 'Size'
    expect(Number(screen.getByTestId('scatter-point-p1').getAttribute('r'))).toBeCloseTo(13, 5);
    expect(screen.getByTestId('scatter-plot-readout')).toHaveTextContent('Size: 25');

    // Upper clamp 520 and NaN fallback 260
    rerender(<ScatterBubblePlot points={fivePoints} height={999} />);
    expect(screen.getByTestId('scatter-plot-svg')).toHaveAttribute('viewBox', '0 0 640 520');

    rerender(<ScatterBubblePlot points={fivePoints} height={Number.NaN} />);
    expect(screen.getByTestId('scatter-plot-svg')).toHaveAttribute('viewBox', '0 0 640 260');
  });

  it('invokes onSelectPoint via click and IME-safe keyboard Enter/Space and updates active ring & readout', () => {
    const onSelectPoint = vi.fn<(point: ScatterPoint) => void>();

    render(
      <ScatterBubblePlot
        points={SAMPLE_POINTS}
        xLabel="X Metric"
        yLabel="Y Metric"
        sizeLabel="Weight"
        onSelectPoint={onSelectPoint}
      />
    );

    const beta = screen.getByTestId('scatter-point-beta');
    fireEvent.click(beta);
    expect(onSelectPoint).toHaveBeenCalledWith(SAMPLE_POINTS[1]);
    expect(beta).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('scatter-active-ring-beta')).toBeInTheDocument();
    expect(screen.getByTestId('scatter-plot-readout')).toHaveTextContent('Beta Node');
    expect(screen.getByTestId('scatter-plot-readout')).toHaveTextContent('Weight: 500');

    // Keyboard Enter selects unsized point and omits size segment in readout
    const delta = screen.getByTestId('scatter-point-delta');
    fireEvent.keyDown(delta, { key: 'Enter' });
    expect(onSelectPoint).toHaveBeenLastCalledWith(SAMPLE_POINTS[3]);
    expect(screen.getByTestId('scatter-plot-readout')).toHaveTextContent('Delta Node');
    expect(screen.getByTestId('scatter-plot-readout')).not.toHaveTextContent('Weight:');

    // Keyboard Space selects gamma
    const gamma = screen.getByTestId('scatter-point-gamma');
    fireEvent.keyDown(gamma, { key: ' ' });
    expect(onSelectPoint).toHaveBeenLastCalledWith(SAMPLE_POINTS[2]);

    // Unrelated key does not fire callback
    const countBefore = onSelectPoint.mock.calls.length;
    fireEvent.keyDown(gamma, { key: 'Escape' });
    expect(onSelectPoint).toHaveBeenCalledTimes(countBefore);

    // IME composition event is ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    gamma.dispatchEvent(imeEvent);
    expect(onSelectPoint).toHaveBeenCalledTimes(countBefore);
  });

  it('toggles group filter pills, shows clean empty state when all groups hidden, and restores cleanly', () => {
    render(
      <ScatterBubblePlot
        points={SAMPLE_POINTS}
        data-testid="group-root"
      />
    );

    const coreBtn = screen.getByTestId('scatter-group-Core');
    const mlBtn = screen.getByTestId('scatter-group-ML');
    const edgeBtn = screen.getByTestId('scatter-group-Edge');

    // Select Beta then hide ML -> readout falls back cleanly to visible point
    fireEvent.click(screen.getByTestId('scatter-point-beta'));
    fireEvent.click(mlBtn);
    expect(mlBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('scatter-point-beta')).not.toBeInTheDocument();
    expect(screen.getByTestId('scatter-plot-readout')).toHaveTextContent('Alpha Node');

    // Hide remaining groups -> clean empty state with filters still clickable
    fireEvent.click(coreBtn);
    fireEvent.click(edgeBtn);
    expect(screen.getByTestId('group-root')).toHaveAttribute('data-all-hidden', 'true');
    expect(screen.getByTestId('scatter-plot-empty')).toHaveTextContent('All groups hidden');
    expect(screen.queryByTestId('scatter-plot-svg')).not.toBeInTheDocument();

    // Restore ML group
    fireEvent.click(mlBtn);
    expect(mlBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('group-root')).not.toHaveAttribute('data-all-hidden');
    expect(screen.getByTestId('scatter-point-beta')).toBeInTheDocument();
  });

  it('filters non-finite coords, handles identical coordinates, invalid sizes, duplicate IDs, empty points, and XSS', () => {
    const xssTitle = '<script>window.__scatterXss=1</script><img src=x onerror=alert(1)>';
    const { rerender } = render(
      <ScatterBubblePlot
        title={xssTitle}
        points={[
          { id: 'bad-x', label: 'Bad X', x: Number.NaN, y: 10 },
          { id: 'bad-y', label: 'Bad Y', x: 10, y: Number.POSITIVE_INFINITY },
          { id: 'dup', label: '<svg onload=alert(1)>Zero', x: 0, y: 0, size: -5, group: '   ' },
          { id: 'dup', label: 'Zero Dup', x: 0, y: 0, size: 0 },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssTitle })).toBeInTheDocument();
    expect(screen.queryByTestId('scatter-point-bad-x')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scatter-point-bad-y')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('scatter-point-dup')).toHaveLength(2);
    expect(screen.getByTestId('scatter-plot-svg').innerHTML).not.toContain('NaN');
    // Invalid sizes (<= 0) fall back to default radius 7
    expect(Number(screen.getAllByTestId('scatter-point-dup')[0]!.getAttribute('r'))).toBe(7);

    // Identical non-zero coordinates (single point at 50, -25)
    rerender(
      <ScatterBubblePlot
        points={[{ id: 'solo', label: 'Solo', x: 50, y: -25 }]}
      />
    );
    expect(screen.getByTestId('scatter-plot-svg').innerHTML).not.toContain('NaN');

    // All invalid / empty points -> clean empty state
    rerender(
      <ScatterBubblePlot
        points={[{ id: 'nan', label: 'Invalid', x: Number.NaN, y: Number.NEGATIVE_INFINITY }]}
        data-testid="empty-scatter"
      />
    );
    expect(screen.getByTestId('empty-scatter')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('scatter-plot-empty')).toHaveTextContent(
      'No valid scatter points available.'
    );
  });
});
