import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_RIDGELINE_ROWS,
  RidgelinePlot,
  type RidgelineRow,
  type RidgelineSelection,
} from './index';

const LATENCY_ROWS: ReadonlyArray<RidgelineRow> = [
  {
    id: 'v1',
    label: 'Release v1.0 Baseline',
    tone: 'info',
    values: [40, 44, 48, 50, 52, 54, 58, 62],
  },
  {
    id: 'v2',
    label: 'Release v2',
    tone: 'emerald',
    values: [26, 30, 32, 34, 36, 38, 42, 46],
  },
  {
    id: 'v3',
    label: 'Release v3',
    tone: 'primary',
    values: [14, 16, 18, 20, 22, 24, 26, 28],
  },
];

describe('RidgelinePlot', () => {
  it('renders 6 default monthly cohorts, forwards ref, merges theme overrides, and uses semantic --prism-* tokens only', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            RidgelinePlot: { className: 'theme-ridge', style: { maxWidth: '720px' } },
          },
        }}
      >
        <RidgelinePlot
          ref={ref}
          className="consumer-ridge"
          xstyle={{ '--prism-blur-px': '18px' }}
          style={{ marginTop: '4px' }}
          data-testid="ridge-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('ridge-root');
    expect(ref.current).toBe(root);
    expect(RidgelinePlot.displayName).toBe('RidgelinePlot');
    expect(root).toHaveClass(
      'refractor-ridgeline-plot',
      'prism-slab',
      'theme-ridge',
      'consumer-ridge'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', marginTop: '4px' });
    expect(root).toHaveAttribute('data-cohort-count', String(DEFAULT_RIDGELINE_ROWS.length));
    expect(root).toHaveAttribute('data-overlap', '0.45');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-has-selection');

    expect(
      screen.getByRole('heading', { name: 'Ridgeline (Joy) Distribution' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('ridgeline-cohort-badge')).toHaveTextContent('6Cohorts');

    const tightBtn = screen.getByRole('button', { name: 'Tight' });
    const balancedBtn = screen.getByRole('button', { name: 'Balanced' });
    const separatedBtn = screen.getByRole('button', { name: 'Separated' });
    expect(balancedBtn).toHaveAttribute('aria-pressed', 'true');
    expect(tightBtn).toHaveAttribute('aria-pressed', 'false');
    expect(separatedBtn).toHaveAttribute('aria-pressed', 'false');

    const svg = screen.getByRole('img', {
      name: 'Ridgeline (Joy) Distribution ridgeline density plot across 6 cohorts',
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 460 250');
    expect(svg).toHaveClass('refractor-ridgeline-plot__svg', 'w-full', 'h-auto', 'select-none');

    // Enforce zero raw color literals in rendered SVG markup
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-warning-main)');
    expect(svg.innerHTML).toContain('var(--prism-info-main)');
    expect(svg.innerHTML).toContain('var(--prism-divider)');
    expect(svg.innerHTML).toContain('var(--prism-well-end)');
    expect(svg.querySelectorAll('linearGradient')).toHaveLength(5);

    expect(svg.querySelectorAll('[data-role="ridge-backdrop"]')).toHaveLength(6);
    expect(svg.querySelectorAll('[data-role="ridge-fill"]')).toHaveLength(6);
    expect(svg.querySelectorAll('[data-role="ridge-baseline"]')).toHaveLength(6);
    expect(svg.querySelectorAll('[data-role="ridge-crest"]')).toHaveLength(6);
    expect(svg.querySelectorAll('[data-role="ridge-peak-marker"]')).toHaveLength(0);

    const firstFill = svg.querySelector('[data-role="ridge-fill"]');
    expect(firstFill?.getAttribute('fill')).toMatch(/^url\(#.*-grad-info\)$/);

    const inspector = screen.getByTestId('ridgeline-inspector');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveTextContent(
      'Select or focus any ridge to inspect Cohort · Mode/Peak · Mean · Median · Samples.'
    );
    expect(inspector).toHaveTextContent('Domain:');
    expect(inspector).toHaveTextContent('°C');
  });

  it('switches overlap presets (Tight / Balanced / Separated), updates SVG geometry, and syncs/clamps overlap prop', () => {
    const { rerender } = render(<RidgelinePlot data-testid="ridge-overlap" />);
    const root = screen.getByTestId('ridge-overlap');
    const svg = screen.getByRole('img');

    const getFirstCrest = () =>
      svg.querySelector('[data-role="ridge-crest"]')?.getAttribute('d') ?? '';

    const balancedCrest = getFirstCrest();
    expect(balancedCrest).toContain('Q ');

    // Switch to Tight (0.75)
    fireEvent.click(screen.getByRole('button', { name: 'Tight' }));
    expect(root).toHaveAttribute('data-overlap', '0.75');
    expect(screen.getByRole('button', { name: 'Tight' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Balanced' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    const tightCrest = getFirstCrest();
    expect(tightCrest).not.toBe(balancedCrest);

    // Switch to Separated (0)
    fireEvent.click(screen.getByRole('button', { name: 'Separated' }));
    expect(root).toHaveAttribute('data-overlap', '0');
    expect(screen.getByRole('button', { name: 'Separated' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const separatedCrest = getFirstCrest();
    expect(separatedCrest).not.toBe(tightCrest);
    expect(separatedCrest).not.toBe(balancedCrest);

    // Switch back to Balanced (0.45)
    fireEvent.click(screen.getByRole('button', { name: 'Balanced' }));
    expect(root).toHaveAttribute('data-overlap', '0.45');
    expect(getFirstCrest()).toBe(balancedCrest);

    // Prop update overrides local preset and clamps out-of-range / NaN values
    rerender(<RidgelinePlot overlap={0.2} data-testid="ridge-overlap" />);
    expect(root).toHaveAttribute('data-overlap', '0.2');
    expect(screen.getByRole('button', { name: 'Tight' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Balanced' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Separated' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    rerender(<RidgelinePlot overlap={2.5} data-testid="ridge-overlap" />);
    expect(root).toHaveAttribute('data-overlap', '0.75');

    rerender(<RidgelinePlot overlap={-1} data-testid="ridge-overlap" />);
    expect(root).toHaveAttribute('data-overlap', '0');

    rerender(<RidgelinePlot overlap={Number.NaN} data-testid="ridge-overlap" />);
    expect(root).toHaveAttribute('data-overlap', '0.45');
  });

  it('supports click, focus/blur preview, sibling dimming, IME-safe Enter/Space, and ArrowUp/ArrowDown navigation', () => {
    const selections: RidgelineSelection[] = [];
    const onSelectRow = vi.fn((selection: RidgelineSelection) => {
      selections.push(selection);
    });

    render(
      <RidgelinePlot
        title="Release Latency"
        unit="ms"
        rows={LATENCY_ROWS}
        onSelectRow={onSelectRow}
        data-testid="ridge-interactive"
      />
    );

    const root = screen.getByTestId('ridge-interactive');
    const v1Band = screen.getByRole('button', { name: /Release v1\.0 Baseline:.*8 samples/ });
    const v2Band = screen.getByRole('button', { name: /Release v2:.*8 samples/ });
    const v3Band = screen.getByRole('button', { name: /Release v3:.*8 samples/ });

    // Long label is truncated cleanly in SVG while full text stays in aria-label and inspector
    expect(v1Band.querySelector('text')).toHaveTextContent('Release v…');

    // Click v1 -> selects, highlights, dims siblings, shows peak marker, fires callback
    fireEvent.click(v1Band);
    expect(root).toHaveAttribute('data-has-selection', 'true');
    expect(v1Band).toHaveAttribute('data-selected', 'true');
    expect(v1Band).toHaveAttribute('aria-pressed', 'true');
    expect(v1Band).toHaveAttribute('data-highlighted', 'true');
    expect(v1Band).toHaveAttribute('data-dimmed', 'false');
    expect(v2Band).toHaveAttribute('data-dimmed', 'true');
    expect(v3Band).toHaveAttribute('data-dimmed', 'true');
    expect(document.querySelectorAll('[data-role="ridge-peak-marker"]')).toHaveLength(1);

    expect(onSelectRow).toHaveBeenCalledTimes(1);
    expect(selections[0]).toMatchObject({
      id: 'v1',
      label: 'Release v1.0 Baseline',
      count: 8,
      mean: 51,
      median: 51,
    });
    expect(Number.isFinite(selections[0]?.peakValue)).toBe(true);

    const inspector = screen.getByTestId('ridgeline-inspector');
    expect(inspector).toHaveTextContent('Release v1.0 Baseline');
    expect(inspector).toHaveTextContent('Mode/Peak');
    expect(inspector).toHaveTextContent('Mean 51ms');
    expect(inspector).toHaveTextContent('Median 51ms');
    expect(inspector).toHaveTextContent('Samples 8');

    // Focus previews v2 without firing onSelectRow; blur restores selected v1
    fireEvent.focus(v2Band);
    expect(v2Band).toHaveAttribute('data-highlighted', 'true');
    expect(v1Band).toHaveAttribute('data-dimmed', 'true');
    expect(inspector).toHaveTextContent('Release v2');
    expect(inspector).toHaveTextContent('Mean 35.5ms');

    // Blurring an unfocused row leaves current focus intact
    fireEvent.blur(v3Band);
    expect(inspector).toHaveTextContent('Release v2');

    // Blurring focused v2 falls back cleanly to selected v1
    fireEvent.blur(v2Band);
    expect(inspector).toHaveTextContent('Release v1.0 Baseline');

    // IME composing Enter must be ignored
    fireEvent.keyDown(v2Band, { key: 'Enter', isComposing: true });
    expect(onSelectRow).toHaveBeenCalledTimes(1);

    // Unhandled key must be ignored
    fireEvent.keyDown(v2Band, { key: 'Escape' });
    expect(onSelectRow).toHaveBeenCalledTimes(1);

    // Enter activates v2
    fireEvent.keyDown(v2Band, { key: 'Enter' });
    expect(onSelectRow).toHaveBeenCalledTimes(2);
    expect(selections[1]?.id).toBe('v2');
    expect(v2Band).toHaveAttribute('data-selected', 'true');

    // Space activates v3
    fireEvent.keyDown(v3Band, { key: ' ' });
    expect(onSelectRow).toHaveBeenCalledTimes(3);
    expect(selections[2]?.id).toBe('v3');
    expect(v3Band).toHaveAttribute('data-selected', 'true');

    // ArrowDown on last row wraps to first row (v1)
    fireEvent.keyDown(v3Band, { key: 'ArrowDown' });
    expect(onSelectRow).toHaveBeenCalledTimes(4);
    expect(selections[3]?.id).toBe('v1');
    expect(document.activeElement).toBe(v1Band);

    // ArrowUp on first row wraps to last row (v3)
    fireEvent.keyDown(v1Band, { key: 'ArrowUp' });
    expect(onSelectRow).toHaveBeenCalledTimes(5);
    expect(selections[4]?.id).toBe('v3');
    expect(document.activeElement).toBe(v3Band);

    // Verify KDE mode/peak tracks distribution shifts across cohorts (v1 > v2 > v3)
    expect(selections[0]!.peakValue).toBeGreaterThan(selections[1]!.peakValue);
    expect(selections[1]!.peakValue).toBeGreaterThan(selections[2]!.peakValue);
  });

  it('auto-cycles all 5 tones, handles single-cohort, single-sample, constant, zero, non-finite values, and removed selection fallback', () => {
    const autoToneRows: ReadonlyArray<RidgelineRow> = [
      { id: 'c1', label: 'C1', values: [Number.NaN, 10, 12, 14, Number.POSITIVE_INFINITY] },
      { id: 'c2', label: 'C2', values: [15, 17, 19] },
      { id: 'c3', label: 'C3', values: [20, 20, 20, 30] },
      { id: 'c4', label: 'C4', values: [25, 25, 25] },
      { id: 'c5', label: 'C5', values: [30, 32, 34, 36] },
      { id: 'skipped', label: 'Invalid', values: [Number.NaN, Number.NEGATIVE_INFINITY] },
    ];

    const { rerender } = render(<RidgelinePlot rows={autoToneRows} unit="" />);
    const svg = screen.getByRole('img', {
      name: 'Ridgeline (Joy) Distribution ridgeline density plot across 5 cohorts',
    });
    expect(svg.querySelectorAll('[data-role="ridge-crest"]')).toHaveLength(5);
    expect(svg.innerHTML).not.toContain('NaN');

    const tones = Array.from(svg.querySelectorAll('[data-tone]')).map((el) =>
      el.getAttribute('data-tone')
    );
    expect(tones).toEqual(['primary', 'secondary', 'emerald', 'amber', 'info']);

    // Select and focus C4 (constant row -> exact peakValue === 25) and verify empty unit formatting
    const c4Band = screen.getByRole('button', { name: /C4:.*3 samples/ });
    fireEvent.focus(c4Band);
    fireEvent.click(c4Band);
    expect(screen.getByTestId('ridgeline-inspector')).toHaveTextContent(
      'C4·Mode/Peak 25·Mean 25·Median 25·Samples 3'
    );

    // Rerender to single-cohort, single-sample non-zero constant row -> selected & focused C4 disappear cleanly
    rerender(
      <RidgelinePlot rows={[{ id: 'solo', label: 'Solo', values: [42] }]} unit="k" />
    );
    expect(screen.getByTestId('ridgeline-cohort-badge')).toHaveTextContent('1Cohort');
    expect(
      screen.getByRole('img', {
        name: 'Ridgeline (Joy) Distribution ridgeline density plot across 1 cohort',
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Solo:.*1 sample$/ })).toBeInTheDocument();
    expect(screen.getByTestId('ridgeline-inspector')).toHaveTextContent(
      'Select or focus any ridge to inspect'
    );

    // Rerender to constant zero / negative-zero distribution -> no division-by-zero or -0 artifacts
    rerender(
      <RidgelinePlot rows={[{ id: 'zero', label: 'Zero', values: [-0, 0] }]} unit="" />
    );
    const zeroSvg = screen.getByRole('img');
    expect(zeroSvg.innerHTML).not.toContain('NaN');
    const zeroBand = screen.getByRole('button', { name: /Zero:.*2 samples/ });
    fireEvent.click(zeroBand);
    expect(screen.getByTestId('ridgeline-inspector')).toHaveTextContent(
      'Zero·Mode/Peak 0·Mean 0·Median 0·Samples 2'
    );
  });

  it('renders clean role="status" empty states for empty or invalid rows and neutralizes XSS strings', () => {
    const { rerender } = render(<RidgelinePlot rows={[]} data-testid="ridge-empty-root" />);
    const root = screen.getByTestId('ridge-empty-root');

    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveAttribute('data-cohort-count', '0');
    expect(screen.getByRole('status')).toHaveTextContent('No distribution cohorts to display.');
    expect(screen.queryByTestId('ridgeline-cohort-badge')).toBeNull();
    expect(screen.queryByTestId('ridgeline-inspector')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();

    // Non-finite-only rows also render empty state
    rerender(
      <RidgelinePlot
        rows={[
          { id: 'bad1', label: 'Bad 1', values: [] },
          { id: 'bad2', label: 'Bad 2', values: [Number.NaN, Number.POSITIVE_INFINITY] },
        ]}
        data-testid="ridge-empty-root"
      />
    );
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('ridgeline-empty')).toBeInTheDocument();

    // XSS payload strings render safely as escaped React text nodes
    const xssPayload = '<script>window.__ridgeXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <RidgelinePlot
        title={xssPayload}
        unit={xssPayload}
        rows={[{ id: 'xss', label: xssPayload, values: [1, 2, 3, 4, 5] }]}
      />
    );
    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
