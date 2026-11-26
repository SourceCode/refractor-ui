import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CapacityAllocationStrip,
  type AllocationToneMap,
  type CapacitySegment,
} from './index';

describe('CapacityAllocationStrip', () => {
  it('renders Open-Internals contracts, default 5 cluster storage segments, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const toneMapCheck: AllocationToneMap = {
      primary: true,
      secondary: true,
      emerald: true,
      amber: true,
      rose: true,
      info: true,
    };
    expect(
      toneMapCheck.primary &&
        toneMapCheck.secondary &&
        toneMapCheck.emerald &&
        toneMapCheck.amber &&
        toneMapCheck.rose &&
        toneMapCheck.info
    ).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CapacityAllocationStrip: {
              className: 'theme-capacity-strip',
              style: { maxWidth: '860px' },
            },
          },
        }}
      >
        <CapacityAllocationStrip
          ref={ref}
          className="local-capacity-strip"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="capacity-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('capacity-root');
    expect(ref.current).toBe(root);
    expect(CapacityAllocationStrip.displayName).toBe('CapacityAllocationStrip');
    expect(root).toHaveClass(
      'refractor-capacity-allocation-strip',
      'prism-slab',
      'theme-capacity-strip',
      'local-capacity-strip',
      'min-w-0',
      'max-w-full'
    );
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-health', 'healthy');
    expect(root).toHaveStyle({ maxWidth: '860px', marginTop: '8px' });

    expect(
      screen.getByRole('heading', { name: 'Cluster Storage Quota' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('capacity-usage-badge')).toHaveTextContent(
      '784 / 1,000 GB · 78.4%'
    );

    const quotaBadge = screen.getByTestId('capacity-quota-badge');
    expect(quotaBadge).toHaveTextContent('Healthy');
    expect(quotaBadge).toHaveAttribute('data-health', 'healthy');
    expect(quotaBadge.style.color).toBe('var(--prism-success-main)');

    const progressbar = screen.getByTestId('capacity-progressbar');
    expect(progressbar).toHaveAttribute('role', 'progressbar');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuenow', '78');
    expect(progressbar).toHaveAttribute(
      'aria-valuetext',
      '784 / 1,000 GB · 78.4%'
    );

    const bar = screen.getByTestId('capacity-bar');
    expect(bar).toHaveClass(
      'prism-well',
      'rounded-full',
      'h-5',
      'relative',
      'overflow-hidden',
      'flex'
    );

    // 5 default cluster storage slices + free space + warning threshold marker
    expect(screen.getByTestId('capacity-bar-segment-postgres-volumes')).toHaveStyle({
      width: '26.8%',
    });
    expect(screen.getByTestId('capacity-bar-segment-vector-index')).toHaveStyle({
      width: '19.6%',
    });
    expect(screen.getByTestId('capacity-bar-segment-media-assets')).toHaveStyle({
      width: '14.2%',
    });
    expect(screen.getByTestId('capacity-bar-segment-container-layers')).toHaveStyle({
      width: '11.2%',
    });
    expect(screen.getByTestId('capacity-bar-segment-logs-traces')).toHaveStyle({
      width: '6.6%',
    });

    const freeSlice = screen.getByTestId('capacity-bar-free');
    expect(freeSlice).toHaveStyle({ width: '21.6%' });
    expect(freeSlice.style.backgroundImage).toContain('var(--prism-divider)');

    const marker = screen.getByTestId('capacity-warning-marker');
    expect(marker).toHaveAttribute('data-threshold-pct', '80');
    expect(marker.style.left).toBe('80%');
    expect(marker.style.borderLeftColor).toBe('var(--prism-warning-main)');
    expect(marker.style.borderLeftStyle).toBe('dashed');

    const pills = screen.getByTestId('capacity-category-pills');
    expect(pills).toHaveClass('flex', 'flex-wrap', 'gap-2');
    expect(screen.getByTestId('capacity-pill-postgres-volumes')).toHaveTextContent(
      'Postgres Volumes268 GB26.8%'
    );
    expect(screen.getByTestId('capacity-pill-vector-index')).toHaveTextContent(
      'Vector Index196 GB19.6%'
    );
    expect(screen.getByTestId('capacity-pill-media-assets')).toHaveTextContent(
      'Media Assets142 GB14.2%'
    );
    expect(screen.getByTestId('capacity-pill-container-layers')).toHaveTextContent(
      'Container Layers112 GB11.2%'
    );
    expect(screen.getByTestId('capacity-pill-logs-traces')).toHaveTextContent(
      'Logs & Traces66 GB6.6%'
    );

    const footer = screen.getByTestId('capacity-telemetry-footer');
    expect(footer).toHaveAttribute('aria-live', 'polite');
    expect(footer).toHaveTextContent('Used 784 GB');
    expect(footer).toHaveTextContent('Free 216 GB');
    expect(footer).toHaveTextContent('Total 1,000 GB');
    expect(screen.getByTestId('capacity-selected-breakdown')).toHaveTextContent(
      'Select any segment or pill for category breakdown'
    );
  });

  it('synchronizes bar slice and breakdown pill highlights on click, fires onSelectSegment, and clears selection', () => {
    const onSelectSegment = vi.fn();

    render(
      <CapacityAllocationStrip
        onSelectSegment={onSelectSegment}
        data-testid="capacity-root"
      />
    );

    const pgSlice = screen.getByTestId('capacity-bar-segment-postgres-volumes');
    const pgPill = screen.getByTestId('capacity-pill-postgres-volumes');
    const mediaSlice = screen.getByTestId('capacity-bar-segment-media-assets');
    const mediaPill = screen.getByTestId('capacity-pill-media-assets');

    // Click bar slice
    fireEvent.click(pgSlice);
    expect(pgSlice).toHaveAttribute('aria-pressed', 'true');
    expect(pgSlice).toHaveAttribute('data-selected', 'true');
    expect(pgPill).toHaveAttribute('aria-pressed', 'true');
    expect(pgPill).toHaveAttribute('data-selected', 'true');
    expect(mediaSlice).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('capacity-root')).toHaveAttribute(
      'data-selected-segment',
      'postgres-volumes'
    );
    expect(onSelectSegment).toHaveBeenCalledTimes(1);
    expect(onSelectSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'postgres-volumes', label: 'Postgres Volumes', value: 268 }),
      26.8
    );
    expect(screen.getByTestId('capacity-selected-breakdown')).toHaveTextContent(
      'Postgres Volumes'
    );
    expect(screen.getByTestId('capacity-selected-breakdown')).toHaveTextContent(
      '268 GB (26.8%)'
    );
    expect(screen.getByTestId('capacity-selected-breakdown')).toHaveTextContent(
      'Primary transactional WAL & replica volumes'
    );

    // Click breakdown pill
    fireEvent.click(mediaPill);
    expect(mediaSlice).toHaveAttribute('aria-pressed', 'true');
    expect(mediaPill).toHaveAttribute('aria-pressed', 'true');
    expect(pgSlice).toHaveAttribute('aria-pressed', 'false');
    expect(pgPill).toHaveAttribute('aria-pressed', 'false');
    expect(onSelectSegment).toHaveBeenCalledTimes(2);
    expect(onSelectSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'media-assets', label: 'Media Assets', value: 142 }),
      14.2
    );

    // Clear selection
    fireEvent.click(screen.getByTestId('capacity-clear-selection'));
    expect(mediaSlice).toHaveAttribute('aria-pressed', 'false');
    expect(mediaPill).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('capacity-selected-breakdown')).toHaveTextContent(
      'Select any segment or pill for category breakdown'
    );
  });

  it('supports IME-safe Enter and Space activation, Escape deselection, and ignores composing keydowns', () => {
    const onSelectSegment = vi.fn();

    render(<CapacityAllocationStrip onSelectSegment={onSelectSegment} />);

    const vectorSlice = screen.getByTestId('capacity-bar-segment-vector-index');
    const logsPill = screen.getByTestId('capacity-pill-logs-traces');

    // Guarded IME composition Enter should NOT fire selection
    const composingEnter = createEvent.keyDown(vectorSlice, { key: 'Enter' });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(vectorSlice, composingEnter);
    expect(onSelectSegment).not.toHaveBeenCalled();
    expect(vectorSlice).toHaveAttribute('aria-pressed', 'false');

    // Guarded IME composition Space should NOT fire selection
    const composingSpace = createEvent.keyDown(logsPill, { key: ' ' });
    Object.defineProperty(composingSpace, 'isComposing', { value: true });
    fireEvent(logsPill, composingSpace);
    expect(onSelectSegment).not.toHaveBeenCalled();

    // Unrelated key is ignored
    fireEvent.keyDown(vectorSlice, { key: 'ArrowRight' });
    expect(onSelectSegment).not.toHaveBeenCalled();

    // Non-composing Enter selects bar slice
    fireEvent.keyDown(vectorSlice, { key: 'Enter' });
    expect(vectorSlice).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('capacity-pill-vector-index')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(onSelectSegment).toHaveBeenCalledTimes(1);
    expect(onSelectSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'vector-index' }),
      19.6
    );

    // Non-composing Space selects breakdown pill
    fireEvent.keyDown(logsPill, { key: ' ' });
    expect(logsPill).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('capacity-bar-segment-logs-traces')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(onSelectSegment).toHaveBeenCalledTimes(2);
    expect(onSelectSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'logs-traces' }),
      6.6
    );

    // Escape clears active selection
    fireEvent.keyDown(logsPill, { key: 'Escape' });
    expect(logsPill).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('capacity-selected-breakdown')).toHaveTextContent(
      'Select any segment or pill for category breakdown'
    );
  });

  it('transitions quota alert badge across Near Capacity and Critical Quota and clamps thresholds safely', () => {
    const nearSegments: CapacitySegment[] = [
      { id: 'db', label: 'DB', value: 850, tone: 'primary' },
    ];

    const { rerender } = render(
      <CapacityAllocationStrip
        segments={nearSegments}
        total={1000}
        warningThresholdPct={80}
        criticalThresholdPct={92}
        data-testid="capacity-root"
      />
    );

    const badge = screen.getByTestId('capacity-quota-badge');
    expect(badge).toHaveTextContent('Near Capacity');
    expect(badge).toHaveAttribute('data-health', 'warning');
    expect(badge.style.color).toBe('var(--prism-warning-main)');
    expect(screen.getByTestId('capacity-root')).toHaveAttribute('data-health', 'warning');

    // Critical threshold reached
    rerender(
      <CapacityAllocationStrip
        segments={[{ id: 'db', label: 'DB', value: 940, tone: 'rose' }]}
        total={1000}
        warningThresholdPct={80}
        criticalThresholdPct={92}
        data-testid="capacity-root"
      />
    );

    expect(screen.getByTestId('capacity-quota-badge')).toHaveTextContent('Critical Quota');
    expect(screen.getByTestId('capacity-quota-badge')).toHaveAttribute(
      'data-health',
      'critical'
    );
    expect(screen.getByTestId('capacity-quota-badge').style.color).toBe(
      'var(--prism-error-main)'
    );

    // Out-of-bounds and inverted thresholds clamp to valid ranges
    rerender(
      <CapacityAllocationStrip
        segments={[{ id: 'db', label: 'DB', value: 50, tone: 'info' }]}
        total={100}
        warningThresholdPct={-40}
        criticalThresholdPct={0}
      />
    );
    expect(screen.getByTestId('capacity-warning-marker')).toHaveAttribute(
      'data-threshold-pct',
      '1'
    );
    expect(screen.getByTestId('capacity-quota-badge')).toHaveTextContent('Critical Quota');

    rerender(
      <CapacityAllocationStrip
        segments={[{ id: 'db', label: 'DB', value: 95, tone: 'emerald' }]}
        total={100}
        warningThresholdPct={150}
        criticalThresholdPct={50}
      />
    );
    expect(screen.getByTestId('capacity-warning-marker')).toHaveAttribute(
      'data-threshold-pct',
      '100'
    );
    expect(screen.getByTestId('capacity-quota-badge')).toHaveTextContent('Healthy');
  });

  it('maps all 6 allocation tones strictly to --prism-* tokens and auto-cycles tones when omitted', () => {
    const allTones: CapacitySegment[] = [
      { id: 't1', label: 'Primary', value: 100, tone: 'primary' },
      { id: 't2', label: 'Secondary', value: 100, tone: 'secondary' },
      { id: 't3', label: 'Emerald', value: 100, tone: 'emerald' },
      { id: 't4', label: 'Amber', value: 100, tone: 'amber' },
      { id: 't5', label: 'Rose', value: 100, tone: 'rose' },
      { id: 't6', label: 'Info', value: 100, tone: 'info' },
      { id: 't7', label: 'AutoCycled', value: 50 },
    ];

    render(<CapacityAllocationStrip segments={allTones} total={1000} />);

    expect(screen.getByTestId('capacity-bar-segment-t1').style.backgroundColor).toBe(
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('capacity-bar-segment-t2').style.backgroundColor).toBe(
      'var(--prism-secondary-main)'
    );
    expect(screen.getByTestId('capacity-bar-segment-t3').style.backgroundColor).toBe(
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('capacity-bar-segment-t4').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('capacity-bar-segment-t5').style.backgroundColor).toBe(
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('capacity-bar-segment-t6').style.backgroundColor).toBe(
      'var(--prism-info-main)'
    );
    expect(screen.getByTestId('capacity-bar-segment-t7')).toHaveAttribute(
      'data-tone',
      'primary'
    );

    // Selecting a segment without description omits the description separator cleanly
    fireEvent.click(screen.getByTestId('capacity-pill-t7'));
    const breakdown = screen.getByTestId('capacity-selected-breakdown');
    expect(breakdown).toHaveTextContent('AutoCycled');
    expect(breakdown).toHaveTextContent('50 GB (5%)');
  });

  it('handles total defaulting to segment sum when higher, over-allocation, zero/negative total with data, and empty segments with positive total', () => {
    // Omitted total with sum > 1000
    const { rerender } = render(
      <CapacityAllocationStrip
        segments={[
          { id: 'a', label: 'Shards A', value: 700, tone: 'primary' },
          { id: 'b', label: 'Shards B', value: 700, tone: 'secondary' },
        ]}
        unit="TB"
      />
    );

    expect(screen.getByTestId('capacity-usage-badge')).toHaveTextContent(
      '1,400 / 1,400 TB · 100%'
    );
    expect(screen.queryByTestId('capacity-bar-free')).not.toBeInTheDocument();

    // Explicit total lower than sum (over-allocated)
    rerender(
      <CapacityAllocationStrip
        segments={[
          { id: 'a', label: 'Shards A', value: 750, tone: 'primary' },
          { id: 'b', label: 'Shards B', value: 500, tone: 'amber' },
        ]}
        total={1000}
        unit="TB"
      />
    );

    expect(screen.getByTestId('capacity-usage-badge')).toHaveTextContent(
      '1,250 / 1,000 TB · 125%'
    );
    expect(screen.getByTestId('capacity-progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    expect(screen.getByTestId('capacity-bar-segment-a')).toHaveStyle({ width: '60%' });
    expect(screen.getByTestId('capacity-bar-segment-b')).toHaveStyle({ width: '40%' });
    expect(screen.getByTestId('capacity-warning-marker').style.left).toBe('64%');

    // Non-positive total with positive segments falls back safely to usedTotal
    rerender(
      <CapacityAllocationStrip
        segments={[{ id: 'a', label: 'Only', value: 250 }]}
        total={0}
      />
    );
    expect(screen.getByTestId('capacity-usage-badge')).toHaveTextContent(
      '250 / 250 GB · 100%'
    );

    // Empty segments with positive total displays 100% free space and no-segments notice
    rerender(<CapacityAllocationStrip segments={[]} total={500} unit="GiB" />);
    expect(screen.getByTestId('capacity-usage-badge')).toHaveTextContent(
      '0 / 500 GiB · 0%'
    );
    expect(screen.getByTestId('capacity-bar-free')).toHaveStyle({ width: '100%' });
    expect(screen.getByTestId('capacity-no-segments')).toHaveTextContent(
      'No allocated categories — 500 GiB free space available.'
    );
  });

  it('renders clean role="status" empty state when segments is [] and total <= 0 or non-finite', () => {
    const { rerender } = render(
      <CapacityAllocationStrip
        segments={[]}
        total={0}
        data-testid="capacity-root"
      />
    );

    expect(screen.getByTestId('capacity-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('capacity-root')).toHaveAttribute('data-health', 'empty');
    const emptyState = screen.getByRole('status');
    expect(emptyState).toHaveAttribute('data-testid', 'capacity-allocation-empty');
    expect(emptyState).toHaveTextContent('No capacity quota configured');
    expect(screen.queryByTestId('capacity-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('capacity-usage-badge')).not.toBeInTheDocument();

    // Negative total
    rerender(<CapacityAllocationStrip segments={[]} total={-100} />);
    expect(screen.getByRole('status')).toHaveTextContent('No capacity quota configured');

    // NaN total
    rerender(<CapacityAllocationStrip segments={[]} total={Number.NaN} />);
    expect(screen.getByRole('status')).toHaveTextContent('No capacity quota configured');
  });

  it('sanitizes adversarial segment values, duplicate IDs, blank text fallbacks, and dropped selections', () => {
    const adversarialSegments: CapacitySegment[] = [
      { id: 'dup', label: 'First', value: 200, tone: 'primary' },
      { id: 'dup', label: 'Second', value: -50, tone: 'secondary' },
      { id: '   ', label: '   ', value: Number.NaN, tone: 'emerald' },
      { id: 'inf', label: 'Infinite', value: Number.POSITIVE_INFINITY, tone: 'amber' },
    ];

    const { rerender } = render(
      <CapacityAllocationStrip
        segments={adversarialSegments}
        total={1000}
        title="   "
        unit="   "
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Cluster Storage Quota' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('capacity-usage-badge')).toHaveTextContent(
      '200 / 1,000 GB · 20%'
    );
    // Only the positive segment renders a bar slice
    expect(screen.getByTestId('capacity-bar-segment-dup')).toBeInTheDocument();
    expect(screen.queryByTestId('capacity-bar-segment-dup-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('capacity-bar-segment-segment-3')).not.toBeInTheDocument();

    // All 4 entries render safely with deduplicated keys in breakdown pills
    expect(screen.getByTestId('capacity-pill-dup')).toHaveTextContent('First200 GB20%');
    expect(screen.getByTestId('capacity-pill-dup-2')).toHaveTextContent('Second0 GB0%');
    expect(screen.getByTestId('capacity-pill-segment-3')).toHaveTextContent(
      'segment-30 GB0%'
    );
    expect(screen.getByTestId('capacity-pill-inf')).toHaveTextContent('Infinite0 GB0%');

    // Select a segment, then remove it via prop update — selection resets gracefully
    fireEvent.click(screen.getByTestId('capacity-pill-dup'));
    expect(screen.getByTestId('capacity-selected-breakdown')).toHaveTextContent('First');

    rerender(
      <CapacityAllocationStrip
        segments={[{ id: 'replacement', label: 'Replacement', value: 300 }]}
        total={1000}
      />
    );
    expect(screen.getByTestId('capacity-selected-breakdown')).toHaveTextContent(
      'Select any segment or pill for category breakdown'
    );
  });
});
