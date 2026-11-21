import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ChartCrosshairTooltip,
  type CrosshairSeries,
  type CrosshairSnapshot,
  type CrosshairTone,
} from './index';

const SAMPLE_LABELS = ['09:00', '10:00', '11:00', '12:00'];

const SAMPLE_SERIES: CrosshairSeries[] = [
  { id: 'p95', label: 'P95 Latency', tone: 'primary', unit: 'ms', values: [40, 44.2, 42.4, 42.4] },
  { id: 'p50', label: 'P50 Median', tone: 'emerald', unit: 'ms', values: [20, 18.2, 22.4, 21.0] },
];

function mockSvgRect(svg: Element, width = 600, height = 240, left = 0): void {
  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: (): DOMRect => ({
      x: left,
      y: 0,
      left,
      top: 0,
      width,
      height,
      right: left + width,
      bottom: height,
      toJSON: () => ({}),
    }),
  });
}

describe('ChartCrosshairTooltip', () => {
  it('renders Astryx optical slab, forwards ref, composes theme overrides, clamps height, and cycles all 5 tones', () => {
    const ref = createRef<HTMLDivElement>();
    const fiveUntoned: CrosshairSeries[] = [
      { id: 's1', label: 'Primary', values: [10, 20] },
      { id: 's2', label: 'Secondary', values: [15, 25] },
      { id: 's3', label: 'Emerald', values: [20, 30] },
      { id: 's4', label: 'Amber', values: [25, 35] },
      { id: 's5', label: 'Rose', values: [30, 40] },
    ];

    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: {
            ChartCrosshairTooltip: {
              className: 'theme-crosshair',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <ChartCrosshairTooltip
          ref={ref}
          labels={['Q1', 'Q2']}
          series={fiveUntoned}
          className="local-crosshair"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="crosshair-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('crosshair-root');
    expect(ref.current).toBe(root);
    expect(ChartCrosshairTooltip.displayName).toBe('ChartCrosshairTooltip');
    expect(root).toHaveClass(
      'refractor-chart-crosshair-tooltip',
      'prism-slab',
      'theme-crosshair',
      'local-crosshair'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', marginTop: '6px' });
    expect(root).toHaveAttribute('data-horizontal-guide', 'true');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-active');
    expect(root).not.toHaveAttribute('data-pinned');
    expect(screen.getByTestId('crosshair-idle-hint')).toHaveTextContent(
      'Hover or focus to inspect'
    );

    const svg = screen.getByRole('img', {
      name: 'Crosshair Multi-Series Inspector',
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 600 240');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');
    expect(screen.getAllByTestId('crosshair-gridline')).toHaveLength(4);

    expect(screen.getByTestId('crosshair-series-s1')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('crosshair-series-s2')).toHaveAttribute(
      'stroke',
      'var(--prism-secondary-main)'
    );
    expect(screen.getByTestId('crosshair-series-s3')).toHaveAttribute(
      'stroke',
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('crosshair-series-s4')).toHaveAttribute(
      'stroke',
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('crosshair-series-s5')).toHaveAttribute(
      'stroke',
      'var(--prism-error-main)'
    );

    // Height lower clamp -> 160
    rerender(
      <ChartCrosshairTooltip
        labels={['Q1', 'Q2']}
        series={fiveUntoned}
        height={60}
      />
    );
    expect(screen.getByTestId('crosshair-svg')).toHaveAttribute(
      'viewBox',
      '0 0 600 160'
    );

    // Height upper clamp -> 460
    rerender(
      <ChartCrosshairTooltip
        labels={['Q1', 'Q2']}
        series={fiveUntoned}
        height={900}
      />
    );
    expect(screen.getByTestId('crosshair-svg')).toHaveAttribute(
      'viewBox',
      '0 0 600 460'
    );

    // NaN height fallback -> 240
    rerender(
      <ChartCrosshairTooltip
        labels={['Q1', 'Q2']}
        series={fiveUntoned}
        height={Number.NaN}
      />
    );
    expect(screen.getByTestId('crosshair-svg')).toHaveAttribute(
      'viewBox',
      '0 0 600 240'
    );
  });

  it('snaps vertical and horizontal crosshair guides on pointerMove, flips floating tooltip left/right, computes signed deltas, and clears on pointerLeave', () => {
    const onActiveIndexChange = vi.fn<(snapshot: CrosshairSnapshot | null) => void>();

    const { rerender } = render(
      <ChartCrosshairTooltip
        title="Gateway Telemetry"
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        onActiveIndexChange={onActiveIndexChange}
        data-testid="pointer-root"
      />
    );

    const svg = screen.getByTestId('crosshair-svg');

    // Defensive zero-width rect does nothing
    mockSvgRect(svg, 0, 240);
    fireEvent.pointerMove(svg, { clientX: 120 });
    expect(onActiveIndexChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('crosshair-tooltip')).not.toBeInTheDocument();

    // Valid rect geometry
    mockSvgRect(svg, 600, 240);

    // Move near index 0 (x = 52)
    fireEvent.pointerMove(svg, { clientX: 55 });
    expect(onActiveIndexChange).toHaveBeenCalledTimes(1);
    const snap0 = onActiveIndexChange.mock.calls[0]?.[0];
    expect(snap0).toEqual({
      index: 0,
      label: '09:00',
      items: [
        { seriesId: 'p95', label: 'P95 Latency', value: 40, unit: 'ms', delta: null, tone: 'primary' },
        { seriesId: 'p50', label: 'P50 Median', value: 20, unit: 'ms', delta: null, tone: 'emerald' },
      ],
    });

    const tooltip = screen.getByTestId('crosshair-tooltip');
    expect(tooltip).toHaveAttribute('role', 'status');
    expect(tooltip).toHaveAttribute('aria-live', 'polite');
    expect(tooltip).toHaveAttribute('data-side', 'right');
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('09:00');
    expect(screen.getByTestId('crosshair-tooltip-mode')).toHaveTextContent('Live');
    expect(screen.getByTestId('crosshair-value-p95')).toHaveTextContent('40 ms');
    expect(screen.getByTestId('crosshair-delta-p95')).toHaveTextContent('—');
    expect(screen.getByTestId('crosshair-vertical-guide')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('crosshair-horizontal-guide')).toBeInTheDocument();
    expect(screen.getByTestId('crosshair-halo-p95')).toBeInTheDocument();
    expect(screen.getByTestId('crosshair-halo-p50')).toBeInTheDocument();

    // Moving slightly within the same column does not emit duplicate callbacks
    fireEvent.pointerMove(svg, { clientX: 60 });
    expect(onActiveIndexChange).toHaveBeenCalledTimes(1);

    // Move to index 1 (x = 52 + 528/3 = 228): +4.2 and -1.8 deltas
    fireEvent.pointerMove(svg, { clientX: 228 });
    expect(onActiveIndexChange).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('crosshair-value-p95')).toHaveTextContent('44.2 ms');
    expect(screen.getByTestId('crosshair-delta-p95')).toHaveTextContent('+4.2');
    expect(screen.getByTestId('crosshair-delta-p95').style.color).toBe(
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('crosshair-value-p50')).toHaveTextContent('18.2 ms');
    expect(screen.getByTestId('crosshair-delta-p50')).toHaveTextContent('-1.8');
    expect(screen.getByTestId('crosshair-delta-p50').style.color).toBe(
      'var(--prism-error-main)'
    );

    // Move to rightmost column (index 3, x = 580): flips tooltip to left side and shows 0 delta
    fireEvent.pointerMove(svg, { clientX: 575 });
    expect(screen.getByTestId('crosshair-tooltip')).toHaveAttribute('data-side', 'left');
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('12:00');
    expect(screen.getByTestId('crosshair-delta-p95')).toHaveTextContent('0');
    expect(screen.getByTestId('crosshair-delta-p95').style.color).toBe(
      'var(--prism-text-secondary)'
    );

    // Disable horizontal guide while active
    rerender(
      <ChartCrosshairTooltip
        title="Gateway Telemetry"
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        showHorizontalGuide={false}
        onActiveIndexChange={onActiveIndexChange}
        data-testid="pointer-root"
      />
    );
    expect(screen.getByTestId('crosshair-vertical-guide')).toBeInTheDocument();
    expect(screen.queryByTestId('crosshair-horizontal-guide')).not.toBeInTheDocument();

    // Pointer leave clears unpinned state
    fireEvent.pointerLeave(screen.getByTestId('crosshair-svg'));
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByTestId('crosshair-tooltip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('crosshair-vertical-guide')).not.toBeInTheDocument();
  });

  it('locks active column on click pin, ignores hover/leave/focus while pinned, re-pins on another column, and unlocks via toggle or header Unpin', () => {
    const onActiveIndexChange = vi.fn<(snapshot: CrosshairSnapshot | null) => void>();

    render(
      <ChartCrosshairTooltip
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        defaultActiveIndex={1}
        onActiveIndexChange={onActiveIndexChange}
        data-testid="pin-root"
      />
    );

    const svg = screen.getByTestId('crosshair-svg');
    mockSvgRect(svg, 600, 240);

    // Starts active at defaultActiveIndex=1 (unpinned)
    expect(screen.getByTestId('crosshair-active-badge')).toHaveTextContent('10:00');
    const pinButton = screen.getByTestId('crosshair-pin-button');
    expect(pinButton).toHaveAttribute('aria-pressed', 'false');
    expect(pinButton).toHaveTextContent('Pin');

    // Pin via header Pin button
    fireEvent.click(pinButton);
    expect(screen.getByTestId('pin-root')).toHaveAttribute('data-pinned', 'true');
    expect(screen.getByTestId('crosshair-pin-button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('crosshair-pin-button')).toHaveTextContent('Pinned · Unpin');
    expect(screen.getByTestId('crosshair-tooltip-mode')).toHaveTextContent('Pinned');

    // Pointer move, pointer leave, and focus on another column do NOT overwrite pinned column
    fireEvent.pointerMove(svg, { clientX: 575 });
    fireEvent.pointerLeave(svg);
    fireEvent.focus(screen.getByTestId('crosshair-column-3'));
    expect(screen.getByTestId('crosshair-active-badge')).toHaveTextContent('10:00');
    expect(onActiveIndexChange).not.toHaveBeenCalled();

    // Click column 2 -> re-pins to column 2
    const col2 = screen.getByTestId('crosshair-column-2');
    fireEvent.click(col2);
    expect(col2).toHaveAttribute('aria-pressed', 'true');
    expect(col2).toHaveAttribute('data-pinned', 'true');
    expect(screen.getByTestId('crosshair-active-badge')).toHaveTextContent('11:00');
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ index: 2, label: '11:00' })
    );

    // Clicking the already-pinned column 2 toggles pin off and clears selection
    fireEvent.click(col2);
    expect(screen.queryByTestId('crosshair-tooltip')).not.toBeInTheDocument();
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(null);

    // Click column 0 to pin, then unlock using header Unpin button
    fireEvent.click(screen.getByTestId('crosshair-column-0'));
    expect(screen.getByTestId('crosshair-active-badge')).toHaveTextContent('09:00');
    fireEvent.click(screen.getByTestId('crosshair-pin-button'));
    expect(screen.queryByTestId('crosshair-tooltip')).not.toBeInTheDocument();
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(null);
  });

  it('supports full IME-safe keyboard navigation (ArrowLeft, ArrowRight, Home, End, Enter, Space, Escape)', () => {
    const onActiveIndexChange = vi.fn<(snapshot: CrosshairSnapshot | null) => void>();

    render(
      <ChartCrosshairTooltip
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        onActiveIndexChange={onActiveIndexChange}
      />
    );

    const col0 = screen.getByRole('button', { name: 'Inspect 09:00' });
    const col1 = screen.getByRole('button', { name: 'Inspect 10:00' });
    const col3 = screen.getByRole('button', { name: 'Inspect 12:00' });

    // Focus activates column 0
    fireEvent.focus(col0);
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('09:00');

    // ArrowRight moves to column 1 and shifts focus
    fireEvent.keyDown(col0, { key: 'ArrowRight' });
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('10:00');
    expect(document.activeElement).toBe(col1);

    // End jumps to last column
    fireEvent.keyDown(col1, { key: 'End' });
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('12:00');
    expect(document.activeElement).toBe(col3);

    // Home jumps back to index 0
    fireEvent.keyDown(col3, { key: 'Home' });
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('09:00');
    expect(document.activeElement).toBe(col0);

    // ArrowLeft at index 0 clamps cleanly at 0
    fireEvent.keyDown(col0, { key: 'ArrowLeft' });
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('09:00');

    // Enter pins index 0; ArrowRight while pinned shifts pin to index 1
    fireEvent.keyDown(col0, { key: 'Enter' });
    expect(col0).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(col0, { key: 'ArrowRight' });
    expect(col1).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('10:00');

    // Space toggles off pin on current column
    fireEvent.keyDown(col1, { key: ' ' });
    expect(screen.queryByTestId('crosshair-tooltip')).not.toBeInTheDocument();

    // Pin again via Enter, then clear via Escape
    fireEvent.keyDown(col1, { key: 'Enter' });
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('10:00');
    fireEvent.keyDown(col1, { key: 'Escape' });
    expect(screen.queryByTestId('crosshair-tooltip')).not.toBeInTheDocument();

    // Unrelated key does nothing
    const callsBefore = onActiveIndexChange.mock.calls.length;
    fireEvent.keyDown(col1, { key: 'a' });
    expect(onActiveIndexChange).toHaveBeenCalledTimes(callsBefore);

    // IME composition events are safely ignored
    const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeEnter, 'isComposing', { value: true });
    col1.dispatchEvent(imeEnter);
    expect(onActiveIndexChange).toHaveBeenCalledTimes(callsBefore);
    expect(screen.queryByTestId('crosshair-tooltip')).not.toBeInTheDocument();
  });

  it('supports controlled activeIndex mode including clamping, null, and callback emission', () => {
    const onActiveIndexChange = vi.fn<(snapshot: CrosshairSnapshot | null) => void>();

    const { rerender } = render(
      <ChartCrosshairTooltip
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        activeIndex={2}
        onActiveIndexChange={onActiveIndexChange}
      />
    );

    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('11:00');

    const svg = screen.getByTestId('crosshair-svg');
    mockSvgRect(svg, 600, 240);

    // Moving pointer emits snapshot for column 0 while controlled UI remains on prop index 2
    fireEvent.pointerMove(svg, { clientX: 55 });
    expect(onActiveIndexChange).toHaveBeenCalledWith(
      expect.objectContaining({ index: 0, label: '09:00' })
    );
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('11:00');

    // Out-of-range controlled index clamps cleanly
    rerender(
      <ChartCrosshairTooltip
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        activeIndex={99}
        onActiveIndexChange={onActiveIndexChange}
      />
    );
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('12:00');

    // NaN or null clears active tooltip
    rerender(
      <ChartCrosshairTooltip
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        activeIndex={Number.NaN}
        onActiveIndexChange={onActiveIndexChange}
      />
    );
    expect(screen.queryByTestId('crosshair-tooltip')).not.toBeInTheDocument();

    rerender(
      <ChartCrosshairTooltip
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        activeIndex={null}
        onActiveIndexChange={onActiveIndexChange}
      />
    );
    expect(screen.queryByTestId('crosshair-tooltip')).not.toBeInTheDocument();
  });

  it('handles empty datasets, all-non-finite series, single point, zero-span domains, duplicates, shrinking labels, and XSS safely', () => {
    const xssTitle = '<script>window.__crosshairXss=1</script><img src=x onerror=alert(1)>';
    const tones: CrosshairTone[] = ['rose', 'amber'];

    const { rerender, unmount } = render(
      <ChartCrosshairTooltip
        title={xssTitle}
        labels={['Dup', 'Dup', 'End']}
        defaultActiveIndex={2}
        series={[
          {
            id: 'dup',
            label: '<svg onload=alert(1)>Neg',
            tone: tones[0],
            unit: '   ',
            values: [-15.5, Number.NaN, Number.POSITIVE_INFINITY],
          },
          {
            id: 'dup',
            label: 'Duplicate ID Series',
            tone: tones[1],
            values: [12.3],
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssTitle })).toBeInTheDocument();
    expect(screen.getByTestId('crosshair-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('End');

    // Pin index 2 then shrink labels to 1 item -> pin gracefully clears without crash
    fireEvent.click(screen.getByTestId('crosshair-column-2'));
    rerender(
      <ChartCrosshairTooltip
        labels={['Solo']}
        series={[{ id: 'solo', label: 'Solo Metric', values: [42.25] }]}
      />
    );
    const soloSvg = screen.getByTestId('crosshair-svg');
    mockSvgRect(soloSvg, 600, 240);
    fireEvent.pointerMove(soloSvg, { clientX: 300 });
    expect(screen.getByTestId('crosshair-tooltip-label')).toHaveTextContent('Solo');
    expect(screen.getByTestId('crosshair-value-solo')).toHaveTextContent('42.25');
    expect(screen.getByTestId('crosshair-delta-solo')).toHaveTextContent('—');

    // Flat all-zero zero-span domain
    rerender(
      <ChartCrosshairTooltip
        labels={['A', 'B']}
        series={[{ id: 'zero', label: 'Zero', values: [0, 0] }]}
      />
    );
    expect(screen.getByTestId('crosshair-svg').innerHTML).not.toContain('NaN');

    // Flat non-zero zero-span domain
    rerender(
      <ChartCrosshairTooltip
        labels={['A', 'B']}
        series={[{ id: 'flat', label: 'Flat', values: [50, 50] }]}
      />
    );
    expect(screen.getByTestId('crosshair-svg').innerHTML).not.toContain('NaN');

    // Empty labels -> role="status" empty state
    rerender(
      <ChartCrosshairTooltip
        labels={[]}
        series={SAMPLE_SERIES}
        data-testid="empty-root"
      />
    );
    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('crosshair-empty')).toHaveAttribute('role', 'status');

    // Empty series -> role="status" empty state
    rerender(
      <ChartCrosshairTooltip
        labels={SAMPLE_LABELS}
        series={[]}
        data-testid="empty-root"
      />
    );
    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('crosshair-empty')).toHaveAttribute('role', 'status');

    // Non-empty labels & series with NO finite values -> role="status" empty state
    rerender(
      <ChartCrosshairTooltip
        labels={['A', 'B']}
        series={[
          { id: 'bad', label: 'Bad', values: [Number.NaN, Number.POSITIVE_INFINITY] },
          { id: 'empty-vals', label: 'Empty Values', values: [] },
        ]}
        data-testid="empty-root"
      />
    );
    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('crosshair-empty')).toHaveAttribute('role', 'status');

    unmount();
  });
});
