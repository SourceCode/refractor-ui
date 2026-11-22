import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_SMALL_MULTIPLES_LABELS,
  DEFAULT_SMALL_MULTIPLES_SERIES,
  SmallMultiplesGrid,
  type SmallMultipleSeries,
  type SmallMultiplesSyncSnapshot,
} from './index';

describe('SmallMultiplesGrid', () => {
  it('renders 6 default regional KPI facets on a shared Y-axis, forwards ref, merges theme overrides, and uses --prism-* tokens exclusively', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SmallMultiplesGrid: {
              className: 'theme-small-multiples',
              style: { maxWidth: '920px' },
            },
          },
        }}
      >
        <SmallMultiplesGrid
          ref={ref}
          className="consumer-trellis"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="smg-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('smg-root');
    expect(ref.current).toBe(root);
    expect(SmallMultiplesGrid.displayName).toBe('SmallMultiplesGrid');
    expect(root).toHaveClass(
      'refractor-small-multiples-grid',
      'prism-slab',
      'theme-small-multiples',
      'consumer-trellis'
    );
    expect(root).toHaveStyle({ maxWidth: '920px', marginTop: '6px' });
    expect(root).toHaveAttribute('data-chart-kind', 'area');
    expect(root).toHaveAttribute('data-shared-y-scale', 'true');
    expect(root).toHaveAttribute('data-columns', '3');
    expect(root).toHaveAttribute('data-facet-count', String(DEFAULT_SMALL_MULTIPLES_SERIES.length));
    expect(root).not.toHaveAttribute('data-empty');

    expect(
      screen.getByRole('heading', { name: 'Synchronized Small Multiples' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: May');

    const areaBtn = screen.getByRole('button', { name: 'Area' });
    const barBtn = screen.getByRole('button', { name: 'Bar' });
    const scaleBtn = screen.getByTestId('small-multiples-scale-toggle');
    expect(areaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(barBtn).toHaveAttribute('aria-pressed', 'false');
    expect(scaleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(scaleBtn).toHaveTextContent('Shared Scale');

    const trellis = screen.getByTestId('small-multiples-trellis');
    expect(trellis).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');

    const svgs = root.querySelectorAll('svg');
    expect(svgs).toHaveLength(DEFAULT_SMALL_MULTIPLES_SERIES.length);

    const crosshairXs = new Set<string>();
    for (const svg of svgs) {
      expect(svg).toHaveAttribute('viewBox', '0 0 180 72');
      expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
      expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
      expect(svg.innerHTML).not.toContain('NaN');
      expect(svg.querySelectorAll('[data-role="facet-area"]')).toHaveLength(1);
      expect(svg.querySelectorAll('[data-role="facet-line"]')).toHaveLength(1);
      expect(svg.querySelectorAll('[data-role="period-hit"]')).toHaveLength(
        DEFAULT_SMALL_MULTIPLES_LABELS.length
      );
      const crosshair = svg.querySelector('[data-role="sync-crosshair"]');
      expect(crosshair).not.toBeNull();
      crosshairXs.add(crosshair?.getAttribute('x1') ?? '');
    }
    // Every miniature facet shares the exact same synchronized vertical crosshair position
    expect(crosshairXs.size).toBe(1);

    // Every facet is locked to the identical global Y domain (28..164)
    for (const facet of DEFAULT_SMALL_MULTIPLES_SERIES) {
      const card = screen.getByTestId(`small-multiple-facet-${facet.id}`);
      expect(card).toHaveClass('prism-well', 'rounded-2xl', 'p-3');
      expect(card).toHaveAttribute('data-y-min', '28');
      expect(card).toHaveAttribute('data-y-max', '164');
    }

    expect(screen.getByTestId('facet-value-na')).toHaveTextContent('142k');
    expect(screen.getByTestId('facet-delta-na')).toHaveTextContent('+30k');
    expect(screen.getByTestId('facet-value-anz')).toHaveTextContent('34k');
    expect(screen.getByTestId('facet-delta-anz')).toHaveTextContent('-2k');

    const summary = screen.getByTestId('small-multiples-summary');
    expect(summary).toHaveClass('prism-well');
    expect(summary).toHaveAttribute('aria-live', 'polite');
    expect(summary).toHaveTextContent('Active Period: May');
    expect(summary).toHaveTextContent('Global Y Domain: 28k–164k');
    expect(summary).toHaveTextContent('Highest: North America (142k)');
    expect(summary).toHaveTextContent('Lowest: ANZ (34k)');
  });

  it('switches between Area and Bar mini-charts in uncontrolled and controlled modes', () => {
    const { rerender } = render(<SmallMultiplesGrid data-testid="smg-kind" />);
    const root = screen.getByTestId('smg-kind');

    fireEvent.click(screen.getByRole('button', { name: 'Bar' }));
    expect(root).toHaveAttribute('data-chart-kind', 'bar');
    expect(screen.getByRole('button', { name: 'Bar' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Area' })).toHaveAttribute('aria-pressed', 'false');
    expect(root.querySelectorAll('[data-role="facet-area"]')).toHaveLength(0);
    expect(root.querySelectorAll('[data-role="facet-bar"]')).toHaveLength(
      DEFAULT_SMALL_MULTIPLES_SERIES.length * DEFAULT_SMALL_MULTIPLES_LABELS.length
    );
    expect(root.querySelectorAll('[data-role="facet-bar"][data-active="true"]')).toHaveLength(
      DEFAULT_SMALL_MULTIPLES_SERIES.length
    );
    expect(root.querySelectorAll('[data-role="sync-crosshair"]')).toHaveLength(
      DEFAULT_SMALL_MULTIPLES_SERIES.length
    );
    expect(root.querySelectorAll('[data-role="sync-dot"]')).toHaveLength(
      DEFAULT_SMALL_MULTIPLES_SERIES.length
    );

    fireEvent.click(screen.getByRole('button', { name: 'Area' }));
    expect(root).toHaveAttribute('data-chart-kind', 'area');
    expect(root.querySelectorAll('[data-role="facet-area"]')).toHaveLength(
      DEFAULT_SMALL_MULTIPLES_SERIES.length
    );

    // Controlled chartKind holds value until prop changes
    rerender(<SmallMultiplesGrid chartKind="bar" data-testid="smg-kind" />);
    expect(root).toHaveAttribute('data-chart-kind', 'bar');
    fireEvent.click(screen.getByRole('button', { name: 'Area' }));
    expect(root).toHaveAttribute('data-chart-kind', 'bar');

    rerender(<SmallMultiplesGrid chartKind="area" data-testid="smg-kind" />);
    expect(root).toHaveAttribute('data-chart-kind', 'area');
  });

  it('toggles between Shared Scale and Local Scale, updates geometry, and resyncs when sharedYScale prop changes', () => {
    const { rerender } = render(<SmallMultiplesGrid data-testid="smg-scale" />);
    const root = screen.getByTestId('smg-scale');
    const latamFacet = screen.getByTestId('small-multiple-facet-latam');
    const naFacet = screen.getByTestId('small-multiple-facet-na');

    const getLatamPath = () =>
      latamFacet.querySelector('[data-role="facet-line"]')?.getAttribute('d') ?? '';

    const sharedLatamPath = getLatamPath();
    expect(latamFacet).toHaveAttribute('data-y-min', '28');
    expect(latamFacet).toHaveAttribute('data-y-max', '164');
    expect(screen.getByTestId('facet-domain-latam')).toHaveTextContent('28k–164k');

    // Toggle to Local Scale
    const scaleBtn = screen.getByTestId('small-multiples-scale-toggle');
    fireEvent.click(scaleBtn);

    expect(scaleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(scaleBtn).toHaveTextContent('Local Scale');
    expect(root).not.toHaveAttribute('data-shared-y-scale');
    expect(latamFacet).toHaveAttribute('data-y-min', '28');
    expect(latamFacet).toHaveAttribute('data-y-max', '53');
    expect(screen.getByTestId('facet-domain-latam')).toHaveTextContent('28k–53k');
    expect(naFacet).toHaveAttribute('data-y-min', '112');
    expect(naFacet).toHaveAttribute('data-y-max', '164');
    expect(getLatamPath()).not.toBe(sharedLatamPath);

    // Toggle back to Shared Scale
    fireEvent.click(scaleBtn);
    expect(scaleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(scaleBtn).toHaveTextContent('Shared Scale');
    expect(getLatamPath()).toBe(sharedLatamPath);

    // Prop update resyncs internal scale mode
    rerender(<SmallMultiplesGrid sharedYScale={false} data-testid="smg-scale" />);
    expect(scaleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(scaleBtn).toHaveTextContent('Local Scale');
    expect(latamFacet).toHaveAttribute('data-y-max', '53');

    rerender(<SmallMultiplesGrid sharedYScale={true} data-testid="smg-scale" />);
    expect(scaleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(latamFacet).toHaveAttribute('data-y-max', '164');
  });

  it('synchronizes hover, click, steppers, and IME-safe keyboard stepping across ALL facets and fires onSyncIndexChange', () => {
    const snapshots: SmallMultiplesSyncSnapshot[] = [];
    const onSyncIndexChange = vi.fn((snapshot: SmallMultiplesSyncSnapshot) => {
      snapshots.push(snapshot);
    });

    render(
      <SmallMultiplesGrid
        onSyncIndexChange={onSyncIndexChange}
        data-testid="smg-sync"
      />
    );
    const root = screen.getByTestId('smg-sync');

    const getAllCrosshairXs = () =>
      Array.from(root.querySelectorAll('[data-role="sync-crosshair"]')).map((el) =>
        el.getAttribute('x1')
      );

    const initialXs = getAllCrosshairXs();

    // 1. Hover period index 1 (Feb) on LATAM facet -> moves ALL 6 crosshairs in lockstep
    const latamFebHit = root.querySelector(
      '[data-role="period-hit"][data-series-id="latam"][data-period-index="1"]'
    );
    expect(latamFebHit).not.toBeNull();
    fireEvent.mouseEnter(latamFebHit!);

    const febXs = getAllCrosshairXs();
    expect(new Set(febXs).size).toBe(1);
    expect(febXs[0]).not.toBe(initialXs[0]);
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: Feb');
    expect(screen.getByTestId('facet-value-na')).toHaveTextContent('118k');
    expect(screen.getByTestId('facet-delta-na')).toHaveTextContent('+6k');
    expect(screen.getByTestId('facet-value-anz')).toHaveTextContent('35k');
    expect(screen.getByTestId('facet-delta-anz')).toHaveTextContent('-1k');
    expect(onSyncIndexChange).toHaveBeenCalledTimes(1);
    expect(snapshots[0]).toEqual({
      index: 1,
      periodLabel: 'Feb',
      entries: [
        { seriesId: 'na', title: 'North America', value: 118 },
        { seriesId: 'emea', title: 'EMEA', value: 91 },
        { seriesId: 'apac', title: 'APAC', value: 61 },
        { seriesId: 'latam', title: 'LATAM', value: 31 },
        { seriesId: 'nordics', title: 'Nordics', value: 45 },
        { seriesId: 'anz', title: 'ANZ', value: 35 },
      ],
    });

    // Clicking the already-active period does not emit a duplicate snapshot
    fireEvent.click(latamFebHit!);
    expect(onSyncIndexChange).toHaveBeenCalledTimes(1);

    // 2. Click period index 0 (Jan) on APAC facet -> delta becomes 0k and Previous stepper disables
    const apacJanHit = root.querySelector(
      '[data-role="period-hit"][data-series-id="apac"][data-period-index="0"]'
    );
    fireEvent.click(apacJanHit!);
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: Jan');
    expect(screen.getByTestId('facet-delta-na')).toHaveTextContent('0k');
    expect(screen.getByTestId('facet-delta-anz')).toHaveTextContent('0k');
    expect(screen.getByRole('button', { name: 'Previous period' })).toBeDisabled();
    expect(onSyncIndexChange).toHaveBeenCalledTimes(2);

    // 3. Header > and < steppers
    fireEvent.click(screen.getByRole('button', { name: 'Next period' }));
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: Feb');
    expect(onSyncIndexChange).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole('button', { name: 'Previous period' }));
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: Jan');
    expect(onSyncIndexChange).toHaveBeenCalledTimes(4);

    // 4. Keyboard stepping on ANY focused facet card
    const naFacet = screen.getByTestId('small-multiple-facet-na');

    // IME composing must be ignored
    fireEvent.keyDown(naFacet, { key: 'ArrowRight', isComposing: true });
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: Jan');
    expect(onSyncIndexChange).toHaveBeenCalledTimes(4);

    // Unrecognized key ignored
    fireEvent.keyDown(naFacet, { key: 'Escape' });
    expect(onSyncIndexChange).toHaveBeenCalledTimes(4);

    // ArrowRight -> Feb
    fireEvent.keyDown(naFacet, { key: 'ArrowRight' });
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: Feb');
    expect(onSyncIndexChange).toHaveBeenCalledTimes(5);

    // End -> Aug (disables Next period stepper)
    fireEvent.keyDown(naFacet, { key: 'End' });
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: Aug');
    expect(screen.getByRole('button', { name: 'Next period' })).toBeDisabled();
    expect(onSyncIndexChange).toHaveBeenCalledTimes(6);
    expect(snapshots[5]?.index).toBe(7);
    expect(snapshots[5]?.periodLabel).toBe('Aug');

    // ArrowRight at upper boundary clamps cleanly without duplicate callback
    fireEvent.keyDown(naFacet, { key: 'ArrowRight' });
    expect(onSyncIndexChange).toHaveBeenCalledTimes(6);

    // ArrowLeft -> Jul
    fireEvent.keyDown(naFacet, { key: 'ArrowLeft' });
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: Jul');
    expect(onSyncIndexChange).toHaveBeenCalledTimes(7);

    // Home -> Jan
    fireEvent.keyDown(naFacet, { key: 'Home' });
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: Jan');
    expect(onSyncIndexChange).toHaveBeenCalledTimes(8);
  });

  it('adapts trellis columns (2 and 4), supports custom unit/decimals, cycles omitted tones, and handles omitted subtitles', () => {
    const customSeries: ReadonlyArray<SmallMultipleSeries> = [
      { id: 's1', title: 'Alpha', values: [1.25, 2.5, 3.75] },
      { id: 's2', title: 'Beta', values: [4.5, 4.1, 4.9] },
      { id: 's3', title: 'Gamma', values: [0.5, 1.5, 2.25] },
      { id: 's4', title: 'Delta', values: [2.0, 2.0, 2.0] },
      { id: 's5', title: 'Epsilon', values: [3.2, 2.8, 3.6] },
    ];

    const { rerender } = render(
      <SmallMultiplesGrid
        title="Cluster Metrics"
        labels={['Q1', 'Q2', 'Q3']}
        series={customSeries}
        columns={2}
        unit=""
        defaultChartKind="bar"
        data-testid="smg-cols"
      />
    );

    const root = screen.getByTestId('smg-cols');
    const trellis = screen.getByTestId('small-multiples-trellis');
    expect(root).toHaveAttribute('data-columns', '2');
    expect(root).toHaveAttribute('data-chart-kind', 'bar');
    expect(trellis).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
    expect(trellis).not.toHaveClass('lg:grid-cols-3');

    // Cycles tones automatically when omitted
    expect(screen.getByTestId('small-multiple-facet-s1')).toHaveAttribute('data-tone', 'primary');
    expect(screen.getByTestId('small-multiple-facet-s2')).toHaveAttribute('data-tone', 'secondary');
    expect(screen.getByTestId('small-multiple-facet-s3')).toHaveAttribute('data-tone', 'emerald');
    expect(screen.getByTestId('small-multiple-facet-s4')).toHaveAttribute('data-tone', 'amber');
    expect(screen.getByTestId('small-multiple-facet-s5')).toHaveAttribute('data-tone', 'info');

    // Empty unit renders bare formatted numbers
    expect(screen.getByTestId('facet-value-s1')).toHaveTextContent('3.75');
    expect(screen.getByTestId('facet-delta-s1')).toHaveTextContent('+2.5');
    expect(screen.getByTestId('small-multiples-summary')).toHaveTextContent(
      'Global Y Domain: 0.5–4.9'
    );

    rerender(
      <SmallMultiplesGrid
        title="Cluster Metrics"
        labels={['Q1', 'Q2', 'Q3']}
        series={customSeries}
        columns={4}
        unit="%"
        data-testid="smg-cols"
      />
    );
    expect(root).toHaveAttribute('data-columns', '4');
    expect(trellis).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
    expect(screen.getByTestId('facet-value-s1')).toHaveTextContent('3.75%');

    // Stepping period without an onSyncIndexChange handler still updates UI cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Previous period' }));
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: Q2');
    expect(screen.getByTestId('facet-value-s1')).toHaveTextContent('2.5%');
  });

  it('renders a clean role="status" empty state for empty series, empty labels, or all-non-finite series', () => {
    const { rerender } = render(<SmallMultiplesGrid series={[]} data-testid="smg-empty" />);
    const root = screen.getByTestId('smg-empty');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No small multiples series to display.');
    expect(screen.queryByTestId('small-multiples-trellis')).not.toBeInTheDocument();
    expect(screen.queryByTestId('small-multiples-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('small-multiples-scale-toggle')).not.toBeInTheDocument();

    rerender(<SmallMultiplesGrid labels={[]} data-testid="smg-empty" />);
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(
      <SmallMultiplesGrid
        labels={['Jan', 'Feb']}
        series={[
          { id: 'bad-1', title: 'Bad 1', values: [Number.NaN, Number.POSITIVE_INFINITY] },
          { id: 'bad-2', title: 'Bad 2', values: [] },
        ]}
        data-testid="smg-empty"
      />
    );
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('handles adversarial datasets: single period, flat/zero/negative values, partial NaN padding, blank labels, and shrinking labels', () => {
    const { rerender } = render(
      <SmallMultiplesGrid
        labels={['  ', 'Feb', 'Mar']}
        series={[
          { id: 'skip', title: 'Invalid', values: [Number.NaN, Number.NEGATIVE_INFINITY] },
          { id: 'neg', title: 'Net Cash', values: [-20, Number.NaN, 15] },
          { id: 'zero', title: 'Zero Flat', values: [0, -0, 0] },
          { id: 'short', title: 'Short Series', values: [12] },
        ]}
        sharedYScale={false}
        defaultChartKind="bar"
        unit="M"
        data-testid="smg-adv"
      />
    );

    const root = screen.getByTestId('smg-adv');
    expect(root).toHaveAttribute('data-facet-count', '3');
    expect(screen.queryByTestId('small-multiple-facet-skip')).not.toBeInTheDocument();
    // Blank first label falls back to P1
    expect(screen.getByTestId('small-multiple-facet-neg')).toHaveTextContent('P1');

    // Switch to Area mode to verify constant/zero/negative area geometry with zero NaN
    fireEvent.click(screen.getByRole('button', { name: 'Area' }));
    for (const svg of root.querySelectorAll('svg')) {
      expect(svg.innerHTML).not.toContain('NaN');
      expect(svg.innerHTML).not.toContain('Infinity');
    }

    // Single-period dataset & dynamic label shrinking clamps activeIndex cleanly
    rerender(
      <SmallMultiplesGrid
        labels={['Only']}
        series={[{ id: 'single', title: 'Single Point', values: [42] }]}
        unit="k"
        data-testid="smg-adv"
      />
    );
    expect(screen.getByTestId('small-multiples-period-badge')).toHaveTextContent('Period: Only');
    expect(screen.getByRole('button', { name: 'Previous period' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next period' })).toBeDisabled();
    expect(screen.getByTestId('facet-value-single')).toHaveTextContent('42k');
    expect(screen.getByTestId('facet-delta-single')).toHaveTextContent('0k');
    expect(root.querySelector('svg')?.innerHTML).not.toContain('NaN');

    // Also render single-period all-zero in bar mode to exercise zero-span bar branch
    rerender(
      <SmallMultiplesGrid
        labels={['Only']}
        series={[{ id: 'zero-only', title: 'Zero Only', values: [0] }]}
        chartKind="bar"
        unit="k"
        data-testid="smg-adv"
      />
    );
    expect(root.querySelector('[data-role="facet-bar"]')).toHaveAttribute('height', '2');
    expect(root.querySelector('svg')?.innerHTML).not.toContain('NaN');
  });
});
