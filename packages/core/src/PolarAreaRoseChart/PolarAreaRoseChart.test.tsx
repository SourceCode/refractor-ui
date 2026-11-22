import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_POLAR_ROSE_SLICES,
  PolarAreaRoseChart,
  type PolarRoseSlice,
  type RoseScaleMode,
} from './index';

describe('PolarAreaRoseChart', () => {
  it('renders default 8 cyclic wind-rose sectors with ref forwarding, theme overrides, concentric rings, spokes, and semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            PolarAreaRoseChart: { className: 'theme-polar-rose', style: { maxWidth: '640px' } },
          },
        }}
      >
        <PolarAreaRoseChart
          ref={ref}
          className="consumer-polar-rose"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="polar-rose-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('polar-rose-root');
    expect(ref.current).toBe(root);
    expect(PolarAreaRoseChart.displayName).toBe('PolarAreaRoseChart');
    expect(DEFAULT_POLAR_ROSE_SLICES).toHaveLength(8);
    expect(root).toHaveClass(
      'refractor-polar-area-rose-chart',
      'prism-slab',
      'theme-polar-rose',
      'consumer-polar-rose'
    );
    expect(root).toHaveStyle({ maxWidth: '640px' });
    expect(root).toHaveAttribute('data-scale-mode', 'area');
    expect(
      screen.getByRole('heading', { name: 'Polar Area (Nightingale Rose)' })
    ).toBeInTheDocument();

    const peakBadge = screen.getByTestId('polar-rose-peak-badge');
    expect(peakBadge).toHaveAttribute('data-peak-id', 'sw');
    expect(peakBadge).toHaveTextContent('Peak');
    expect(peakBadge).toHaveTextContent('SW · 36 kt');

    const areaBtn = screen.getByRole('button', { name: 'Area-Proportional' });
    const radiusBtn = screen.getByRole('button', { name: 'Linear Radius' });
    expect(areaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(radiusBtn).toHaveAttribute('aria-pressed', 'false');

    const svg = screen.getByTestId('polar-rose-svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('viewBox', '0 0 320 320');
    expect(svg).toHaveClass(
      'refractor-polar-area-rose-chart__svg',
      'w-full',
      'max-w-[320px]',
      'h-auto',
      'mx-auto',
      'select-none'
    );
    expect(svg.parentElement).toHaveClass('prism-well');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    // 4 concentric reference rings: 25%, 50%, 75%, 100%
    expect(screen.getByTestId('polar-rose-ring-25')).toHaveAttribute('data-ring-pct', '25');
    expect(screen.getByTestId('polar-rose-ring-50')).toHaveAttribute('data-ring-pct', '50');
    expect(screen.getByTestId('polar-rose-ring-75')).toHaveAttribute('data-ring-pct', '75');
    expect(screen.getByTestId('polar-rose-ring-100')).toHaveAttribute('data-ring-pct', '100');

    // 8 radial spoke guides and 8 perimeter labels
    expect(screen.getByTestId('polar-rose-spokes').querySelectorAll('line')).toHaveLength(8);
    expect(screen.getByTestId('polar-rose-labels').querySelectorAll('text')).toHaveLength(8);

    // 8 interactive wedges with all 5 semantic --prism-* tokens represented
    const wedges = svg.querySelectorAll('path[role="button"]');
    expect(wedges).toHaveLength(8);
    expect(svg.querySelector('path[data-slice-id="n"]')).toHaveAttribute(
      'fill',
      'var(--prism-primary-main)'
    );
    expect(svg.querySelector('path[data-slice-id="ne"]')).toHaveAttribute(
      'fill',
      'var(--prism-secondary-main)'
    );
    expect(svg.querySelector('path[data-slice-id="e"]')).toHaveAttribute(
      'fill',
      'var(--prism-success-main)'
    );
    expect(svg.querySelector('path[data-slice-id="se"]')).toHaveAttribute(
      'fill',
      'var(--prism-warning-main)'
    );
    expect(svg.querySelector('path[data-slice-id="s"]')).toHaveAttribute(
      'fill',
      'var(--prism-info-main)'
    );

    // 8 interactive legend chips
    const legendGroup = screen.getByRole('group', { name: 'Polar sector legend' });
    expect(legendGroup.querySelectorAll('button')).toHaveLength(8);

    // Live inspector idle state
    const inspector = screen.getByTestId('polar-rose-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveTextContent(
      'Select or focus any sector wedge to inspect magnitude and share.'
    );
    expect(inspector).toHaveTextContent('Area-Proportional · Total: 180 kt');
  });

  it('scales sector radii honestly with sqrt in Area-Proportional mode and linearly in Linear Radius mode (uncontrolled and controlled)', () => {
    const ratioSlices: PolarRoseSlice[] = [
      { id: 'max', label: 'Peak', value: 100, tone: 'primary' },
      { id: 'quarter', label: 'Quarter', value: 25, tone: 'secondary' },
    ];
    const onScaleModeChange = vi.fn<(mode: RoseScaleMode) => void>();

    const { rerender } = render(
      <PolarAreaRoseChart
        slices={ratioSlices}
        onScaleModeChange={onScaleModeChange}
        data-testid="scale-rose"
      />
    );

    const svg = screen.getByTestId('polar-rose-svg');
    const getRadii = () => ({
      maxR: Number(svg.querySelector('path[data-slice-id="max"]')?.getAttribute('data-radius')),
      quarterR: Number(
        svg.querySelector('path[data-slice-id="quarter"]')?.getAttribute('data-radius')
      ),
    });

    // Default 'area' mode: value 25 / 100 -> sqrt(0.25) = 0.5 radius ratio
    const areaRadii = getRadii();
    expect(areaRadii.maxR).toBeCloseTo(102, 2);
    expect(areaRadii.quarterR / areaRadii.maxR).toBeCloseTo(0.5, 2);

    // Switch uncontrolled to Linear Radius
    fireEvent.click(screen.getByRole('button', { name: 'Linear Radius' }));
    expect(onScaleModeChange).toHaveBeenCalledWith('radius');
    expect(screen.getByTestId('scale-rose')).toHaveAttribute('data-scale-mode', 'radius');
    expect(screen.getByRole('button', { name: 'Linear Radius' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Area-Proportional' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    const linearRadii = getRadii();
    expect(linearRadii.quarterR / linearRadii.maxR).toBeCloseTo(0.25, 2);
    expect(screen.getByTestId('polar-rose-inspector')).toHaveTextContent('Linear Radius');

    // Switch back to Area-Proportional
    fireEvent.click(screen.getByRole('button', { name: 'Area-Proportional' }));
    expect(onScaleModeChange).toHaveBeenLastCalledWith('area');
    expect(getRadii().quarterR / getRadii().maxR).toBeCloseTo(0.5, 2);

    // Controlled scaleMode ignores internal state until prop changes
    rerender(
      <PolarAreaRoseChart
        slices={ratioSlices}
        scaleMode="radius"
        onScaleModeChange={onScaleModeChange}
        data-testid="scale-rose"
      />
    );
    expect(screen.getByTestId('scale-rose')).toHaveAttribute('data-scale-mode', 'radius');
    expect(getRadii().quarterR / getRadii().maxR).toBeCloseTo(0.25, 2);

    fireEvent.click(screen.getByRole('button', { name: 'Area-Proportional' }));
    expect(onScaleModeChange).toHaveBeenLastCalledWith('area');
    // Still 'radius' because controlled prop remains 'radius'
    expect(screen.getByTestId('scale-rose')).toHaveAttribute('data-scale-mode', 'radius');
  });

  it('expands focused/selected wedges, synchronizes legend chips, updates live inspector, and invokes onSelectSlice', () => {
    const onSelectSlice = vi.fn<(slice: PolarRoseSlice, sharePct: number) => void>();
    render(<PolarAreaRoseChart defaultScaleMode="radius" onSelectSlice={onSelectSlice} />);

    const svg = screen.getByTestId('polar-rose-svg');
    const swWedge = svg.querySelector('path[data-slice-id="sw"]') as SVGPathElement;
    const nWedge = svg.querySelector('path[data-slice-id="n"]') as SVGPathElement;
    const baseSwRadius = Number(swWedge.getAttribute('data-radius'));

    // Focusing expands wedge and updates inspector without invoking onSelectSlice
    fireEvent.focus(swWedge);
    expect(onSelectSlice).not.toHaveBeenCalled();
    expect(swWedge).toHaveAttribute('data-expanded', 'true');
    expect(Number(swWedge.getAttribute('data-radius'))).toBeCloseTo(baseSwRadius + 5, 2);
    expect(nWedge).toHaveAttribute('data-dimmed', 'true');

    const inspector = screen.getByTestId('polar-rose-inspector');
    expect(inspector).toHaveTextContent('SW · 36 kt · 20% · Linear Radius');
    expect(inspector).toHaveTextContent('Total: 180 kt');

    // Blurring an unrelated wedge does not clear active focus
    fireEvent.blur(nWedge);
    expect(swWedge).toHaveAttribute('data-expanded', 'true');

    // Blurring the focused wedge returns to idle state
    fireEvent.blur(swWedge);
    expect(swWedge).toHaveAttribute('data-expanded', 'false');
    expect(inspector).toHaveTextContent(
      'Select or focus any sector wedge to inspect magnitude and share.'
    );

    // Clicking a wedge selects it, expands it, and calls onSelectSlice
    fireEvent.click(nWedge);
    expect(onSelectSlice).toHaveBeenCalledTimes(1);
    expect(onSelectSlice).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'n', label: 'N', value: 24, tone: 'primary' }),
      13.3
    );
    expect(nWedge).toHaveAttribute('aria-pressed', 'true');
    expect(nWedge).toHaveAttribute('data-selected', 'true');
    expect(nWedge).toHaveAttribute('data-expanded', 'true');
    expect(inspector).toHaveTextContent('N · 24 kt · 13.3% · Linear Radius');

    // Clicking the same wedge again toggles selection off cleanly
    fireEvent.click(nWedge);
    expect(onSelectSlice).toHaveBeenCalledTimes(1);
    expect(nWedge).toHaveAttribute('aria-pressed', 'false');
    expect(nWedge).toHaveAttribute('data-selected', 'false');

    // Clicking a legend chip selects and synchronizes the matching wedge
    const legendGroup = screen.getByTestId('polar-rose-legend');
    const swLegendBtn = within(legendGroup).getByRole('button', { name: /SW/i });
    fireEvent.click(swLegendBtn);
    expect(onSelectSlice).toHaveBeenCalledTimes(2);
    expect(onSelectSlice).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'sw', label: 'SW', value: 36 }),
      20
    );
    expect(swLegendBtn).toHaveAttribute('aria-pressed', 'true');
    expect(swWedge).toHaveAttribute('aria-pressed', 'true');
    expect(swWedge).toHaveAttribute('data-expanded', 'true');

    // Clicking the active legend chip toggles selection back off
    fireEvent.click(swLegendBtn);
    expect(swLegendBtn).toHaveAttribute('aria-pressed', 'false');
    expect(swWedge).toHaveAttribute('aria-pressed', 'false');
  });

  it('supports IME-safe Enter/Space toggle and ArrowLeft/ArrowRight cyclic wedge navigation', () => {
    const onSelectSlice = vi.fn<(slice: PolarRoseSlice, sharePct: number) => void>();
    const seasons: PolarRoseSlice[] = [
      { id: 'winter', label: 'Winter', value: 40, tone: 'info' },
      { id: 'spring', label: 'Spring', value: 30, tone: 'emerald' },
      { id: 'summer', label: 'Summer', value: 10, tone: 'amber' },
      { id: 'autumn', label: 'Autumn', value: 20, tone: 'primary' },
    ];

    render(<PolarAreaRoseChart slices={seasons} unit="mm" onSelectSlice={onSelectSlice} />);

    const svg = screen.getByTestId('polar-rose-svg');
    const winter = svg.querySelector('path[data-slice-id="winter"]') as SVGPathElement;
    const spring = svg.querySelector('path[data-slice-id="spring"]') as SVGPathElement;
    const autumn = svg.querySelector('path[data-slice-id="autumn"]') as SVGPathElement;

    // IME composition events must be ignored
    fireEvent.keyDown(winter, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(winter, { key: ' ', isComposing: true });
    fireEvent.keyDown(winter, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(winter, { key: 'ArrowLeft', isComposing: true });
    expect(onSelectSlice).not.toHaveBeenCalled();

    // Unrelated key must be ignored
    fireEvent.keyDown(winter, { key: 'Tab' });
    expect(onSelectSlice).not.toHaveBeenCalled();

    // Enter activates winter
    fireEvent.keyDown(winter, { key: 'Enter' });
    expect(onSelectSlice).toHaveBeenCalledTimes(1);
    expect(onSelectSlice).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'winter', label: 'Winter', value: 40 }),
      40
    );

    // Space toggles winter off, then Space on spring selects spring
    fireEvent.keyDown(winter, { key: ' ' });
    expect(winter).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(spring, { key: ' ' });
    expect(onSelectSlice).toHaveBeenCalledTimes(2);
    expect(onSelectSlice).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'spring', label: 'Spring', value: 30 }),
      30
    );

    // ArrowLeft from winter wraps counter-clockwise to autumn and moves focus
    fireEvent.keyDown(winter, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(autumn);
    expect(onSelectSlice).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'autumn', label: 'Autumn', value: 20 }),
      20
    );

    // ArrowRight from autumn wraps clockwise back to winter and moves focus
    fireEvent.keyDown(autumn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(winter);
    expect(onSelectSlice).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'winter', label: 'Winter', value: 40 }),
      40
    );
  });

  it('auto-cycles tones, handles zero/fractional/duplicate/single-slice edge cases, unit formatting, and stale selection cleanup', () => {
    const complexSlices: PolarRoseSlice[] = [
      { id: 'dup', label: 'VeryLongSectorTitle', value: 50.25 },
      { id: 'dup', label: 'ZeroWind', value: 0 },
      { id: 's3', label: 'NegativeClamped', value: -15 },
      { id: 's4', label: 'InvalidNum', value: Number.NaN },
      { id: 's5', label: 'Micro', value: 0.001 },
      { id: 's6', label: 'WrappedTone', value: 25.5 },
    ];

    const { rerender } = render(<PolarAreaRoseChart slices={complexSlices} unit="%" />);
    const svg = screen.getByTestId('polar-rose-svg');
    expect(svg.innerHTML).not.toContain('NaN');

    const wedges = Array.from(svg.querySelectorAll('path[role="button"]')) as SVGPathElement[];
    expect(wedges).toHaveLength(6);

    // Verify all 5 auto-cycled tones + wrap on index 5
    expect(wedges[0]).toHaveAttribute('data-tone', 'primary');
    expect(wedges[1]).toHaveAttribute('data-tone', 'secondary');
    expect(wedges[2]).toHaveAttribute('data-tone', 'emerald');
    expect(wedges[3]).toHaveAttribute('data-tone', 'amber');
    expect(wedges[4]).toHaveAttribute('data-tone', 'info');
    expect(wedges[5]).toHaveAttribute('data-tone', 'primary');

    // Truncated perimeter label for long label, full label preserved in inspector and legend
    expect(screen.getByTestId('polar-rose-label-0')).toHaveTextContent('VeryLong…');

    // Zero-value slice keeps zero radius and does not expand even when focused
    expect(wedges[1]).toHaveAttribute('data-radius', '0');
    expect(wedges[1]).toHaveAttribute('d', 'M 160 160 Z');
    fireEvent.focus(wedges[1]!);
    expect(wedges[1]).toHaveAttribute('data-expanded', 'false');
    expect(screen.getByTestId('polar-rose-inspector')).toHaveTextContent(
      'ZeroWind · 0% · 0% · Area-Proportional'
    );

    // Select and focus first slice and verify '%' formatting without space
    fireEvent.click(wedges[0]!);
    fireEvent.blur(wedges[1]!);
    fireEvent.focus(wedges[0]!);
    expect(screen.getByTestId('polar-rose-inspector')).toHaveTextContent('VeryLongSectorTitle');
    expect(screen.getByTestId('polar-rose-inspector')).toHaveTextContent('50.25%');

    // Rerender to single-slice full-circle chart with empty unit string -> resets stale selection & focus and draws two 180-deg arcs
    rerender(
      <PolarAreaRoseChart
        slices={[{ id: 'solo', label: 'All-Round', value: 42, tone: 'emerald' }]}
        unit=""
      />
    );
    const soloWedge = screen
      .getByTestId('polar-rose-svg')
      .querySelector('path[data-slice-id="solo"]') as SVGPathElement;
    expect(soloWedge.getAttribute('d')).toContain('A 102 102 0 1 1');
    expect(screen.getByTestId('polar-rose-peak-badge')).toHaveTextContent('All-Round · 42');
    expect(screen.getByTestId('polar-rose-inspector')).toHaveTextContent(
      'Select or focus any sector wedge to inspect magnitude and share.'
    );
    expect(screen.getByTestId('polar-rose-inspector')).toHaveTextContent('Total: 42');
  });

  it('renders clean role="status" empty state for empty/non-positive/non-finite data and neutralizes XSS payloads', () => {
    const { rerender } = render(<PolarAreaRoseChart slices={[]} data-testid="empty-rose" />);
    expect(screen.getByTestId('empty-rose')).toHaveAttribute('data-empty', 'true');
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No positive sector values to display.');
    expect(screen.queryByTestId('polar-rose-svg')).toBeNull();
    expect(screen.queryByTestId('polar-rose-peak-badge')).toBeNull();
    expect(screen.queryByTestId('polar-rose-legend')).toBeNull();
    expect(screen.queryByTestId('polar-rose-inspector')).toBeNull();

    // All non-positive / non-finite slices also trigger the clean empty state
    rerender(
      <PolarAreaRoseChart
        data-testid="empty-rose"
        slices={[
          { id: 'z', label: 'Zero', value: 0 },
          { id: 'neg', label: 'Neg', value: -12 },
          { id: 'nan', label: 'NaN', value: Number.NaN },
          { id: 'inf', label: 'Inf', value: Number.POSITIVE_INFINITY },
        ]}
      />
    );
    expect(screen.getByTestId('empty-rose')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Neutralizes XSS payloads in title, unit, and slice labels
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <PolarAreaRoseChart
        title={payload}
        unit={payload}
        slices={[{ id: 'xss', label: payload, value: 10, tone: 'primary' }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('polar-rose-svg').querySelectorAll('path[role="button"]')).toHaveLength(
      1
    );
  });
});
