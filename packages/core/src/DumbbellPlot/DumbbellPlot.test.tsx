import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_DUMBBELL_ITEMS,
  DumbbellPlot,
  type DumbbellItem,
  type DumbbellSortModeMap,
} from './index';

function getRowIdsInOrder(): string[] {
  const rows = screen
    .getAllByRole('button')
    .filter((el) => el.hasAttribute('data-item-id'));
  return rows.map((el) => el.getAttribute('data-item-id') ?? '');
}

describe('DumbbellPlot', () => {
  it('renders sculpted prism-slab header, default 6 regional items, semantic tokens, ref forwarding, theme overrides, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const sortKeys: Array<keyof DumbbellSortModeMap> = [
      'original',
      'gap-desc',
      'target-desc',
    ];
    expect(sortKeys).toHaveLength(3);
    expect(DEFAULT_DUMBBELL_ITEMS).toHaveLength(6);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            DumbbellPlot: { className: 'theme-dumbbell', style: { maxWidth: '680px' } },
          },
        }}
      >
        <DumbbellPlot
          ref={ref}
          className="consumer-dumbbell"
          style={{ minWidth: '280px' }}
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="dumbbell-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('dumbbell-root');
    expect(ref.current).toBe(root);
    expect(DumbbellPlot.displayName).toBe('DumbbellPlot');
    expect(root).toHaveClass(
      'refractor-dumbbell-plot',
      'prism-slab',
      'theme-dumbbell',
      'consumer-dumbbell'
    );
    expect(root).toHaveStyle({ maxWidth: '680px', minWidth: '280px' });
    expect(root).toHaveAttribute('data-sort-by', 'original');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-has-selection');

    // Region + heading linkage
    expect(
      screen.getByRole('region', { name: 'Variance Gap Dumbbell Plot' })
    ).toBe(root);
    expect(
      screen.getByRole('heading', { name: 'Variance Gap Dumbbell Plot' })
    ).toBeInTheDocument();

    // Legend swatches use semantic --prism-info-main and --prism-primary-main tokens
    const legend = screen.getByTestId('dumbbell-legend');
    expect(legend).toHaveTextContent('Baseline');
    expect(legend).toHaveTextContent('Current');
    expect(legend.innerHTML).toContain('var(--prism-info-main)');
    expect(legend.innerHTML).toContain('var(--prism-primary-main)');

    // Sort pill switcher
    expect(screen.getByTestId('dumbbell-sort-original')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dumbbell-sort-gap-desc')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('dumbbell-sort-target-desc')).toHaveAttribute('aria-pressed', 'false');

    // Responsive SVG contract & vertical grid ticks
    const svg = screen.getByTestId('dumbbell-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 460 230');
    expect(svg).toHaveClass('refractor-dumbbell-plot__svg', 'w-full', 'h-auto', 'select-none');
    expect(screen.getAllByTestId('dumbbell-grid-tick')).toHaveLength(5);

    // Zero raw hex/rgb/hsl color literals anywhere in rendered markup
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(/i);

    // Gain vs regression semantic connectors & signed delta pills
    expect(getRowIdsInOrder()).toEqual(['na', 'emea', 'apac', 'latam', 'nordics', 'uk-ie']);
    expect(screen.getByTestId('dumbbell-row-na')).toHaveAttribute('data-direction', 'gain');
    expect(screen.getByTestId('dumbbell-connector-na')).toHaveAttribute(
      'stroke',
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('dumbbell-delta-na')).toHaveTextContent('+14.2%');

    expect(screen.getByTestId('dumbbell-row-emea')).toHaveAttribute('data-direction', 'regression');
    expect(screen.getByTestId('dumbbell-connector-emea')).toHaveAttribute(
      'stroke',
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('dumbbell-delta-emea')).toHaveTextContent('-3.5%');

    // Recessed aria-live="polite" readout initially reflects the top visible row
    const readout = screen.getByTestId('dumbbell-readout');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(readout).toHaveClass('prism-well');
    expect(screen.getByTestId('dumbbell-readout-category')).toHaveTextContent('North America');
    expect(screen.getByTestId('dumbbell-readout-values')).toHaveTextContent(
      'Baseline 42.4% → Current 56.6%'
    );
    expect(screen.getByTestId('dumbbell-readout-gap')).toHaveTextContent('+14.2%');
    expect(screen.getByTestId('dumbbell-readout-pct')).toHaveTextContent('+33.5% change');
  });

  it('reorders rows via uncontrolled sort pills, honors defaultSortBy and controlled sortBy, and breaks sort ties deterministically', () => {
    const { rerender } = render(
      <DumbbellPlot defaultSortBy="gap-desc" data-testid="sort-plot" />
    );

    expect(screen.getByTestId('sort-plot')).toHaveAttribute('data-sort-by', 'gap-desc');
    expect(getRowIdsInOrder()).toEqual(['apac', 'na', 'latam', 'uk-ie', 'emea', 'nordics']);
    expect(screen.getByTestId('dumbbell-readout-category')).toHaveTextContent('APAC');

    // Switch to Highest Current
    fireEvent.click(screen.getByTestId('dumbbell-sort-target-desc'));
    expect(screen.getByTestId('sort-plot')).toHaveAttribute('data-sort-by', 'target-desc');
    expect(getRowIdsInOrder()).toEqual(['nordics', 'apac', 'na', 'uk-ie', 'emea', 'latam']);
    expect(screen.getByTestId('dumbbell-readout-category')).toHaveTextContent('Nordics');

    // Switch back to Default
    fireEvent.click(screen.getByTestId('dumbbell-sort-original'));
    expect(getRowIdsInOrder()).toEqual(['na', 'emea', 'apac', 'latam', 'nordics', 'uk-ie']);

    // Tie-breakers across gap-desc and target-desc + controlled sortBy immutability
    const tiedItems: DumbbellItem[] = [
      { id: 'neg-tie', label: 'Neg Tie', baseline: 50, current: 40 }, // gap -10, current 40
      { id: 'pos-tie-a', label: 'Pos Tie A', baseline: 30, current: 40 }, // gap +10, current 40
      { id: 'pos-tie-b', label: 'Pos Tie B', baseline: 30, current: 40 }, // gap +10, current 40 (index tie)
    ];

    rerender(<DumbbellPlot items={tiedItems} sortBy="gap-desc" data-testid="sort-plot" />);
    // |gap| all 10 -> positive gaps (+10) beat -10, then originalIndex keeps pos-tie-a before pos-tie-b
    expect(getRowIdsInOrder()).toEqual(['pos-tie-a', 'pos-tie-b', 'neg-tie']);

    // Clicking another sort pill while controlled leaves controlled sortBy untouched
    fireEvent.click(screen.getByTestId('dumbbell-sort-original'));
    expect(screen.getByTestId('sort-plot')).toHaveAttribute('data-sort-by', 'gap-desc');
    expect(getRowIdsInOrder()).toEqual(['pos-tie-a', 'pos-tie-b', 'neg-tie']);

    // Controlled switch to target-desc: all current === 40 -> higher gap (+10) first, then originalIndex
    rerender(<DumbbellPlot items={tiedItems} sortBy="target-desc" data-testid="sort-plot" />);
    expect(getRowIdsInOrder()).toEqual(['pos-tie-a', 'pos-tie-b', 'neg-tie']);
  });

  it('supports click, focus/blur, IME-safe Enter/Space, ArrowUp/ArrowDown/Home/End navigation, and fires onSelectItem', () => {
    const onSelectItem = vi.fn();
    render(
      <DumbbellPlot
        baselineLabel="Q1"
        currentLabel="Q4"
        unit=" pts"
        onSelectItem={onSelectItem}
        data-testid="interactive-plot"
      />
    );

    const emeaRow = screen.getByTestId('dumbbell-row-emea');
    fireEvent.click(emeaRow);

    expect(onSelectItem).toHaveBeenCalledTimes(1);
    expect(onSelectItem).toHaveBeenLastCalledWith({
      id: 'emea',
      label: 'EMEA',
      baseline: 51.8,
      current: 48.3,
      gap: -3.5,
      gapPct: -6.8,
    });
    expect(emeaRow).toHaveAttribute('aria-pressed', 'true');
    expect(emeaRow).toHaveAttribute('data-selected', 'true');
    expect(emeaRow).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByTestId('interactive-plot')).toHaveAttribute('data-has-selection', 'true');
    expect(screen.getByTestId('dumbbell-readout-category')).toHaveTextContent('EMEA');
    expect(screen.getByTestId('dumbbell-readout-values')).toHaveTextContent(
      'Q1 51.8 pts → Q4 48.3 pts'
    );
    expect(screen.getByTestId('dumbbell-readout-gap')).toHaveTextContent('-3.5 pts');
    expect(screen.getByTestId('dumbbell-readout-pct')).toHaveTextContent('-6.8% change');

    // Focus/blur highlight management (including switching focus before blurring previous row)
    const apacRow = screen.getByTestId('dumbbell-row-apac');
    const latamRow = screen.getByTestId('dumbbell-row-latam');
    fireEvent.focus(apacRow);
    expect(apacRow).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByTestId('dumbbell-readout-category')).toHaveTextContent('APAC');

    // Focus moves to latam before blur fires on apac (covers prev !== row.key branch)
    fireEvent.focus(latamRow);
    fireEvent.blur(apacRow);
    expect(latamRow).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByTestId('dumbbell-readout-category')).toHaveTextContent('LATAM');

    // Blur latam reverts highlight back to selected row (emea)
    fireEvent.blur(latamRow);
    expect(emeaRow).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByTestId('dumbbell-readout-category')).toHaveTextContent('EMEA');

    // IME composing Enter must be ignored
    fireEvent.keyDown(apacRow, { key: 'Enter', isComposing: true });
    expect(onSelectItem).toHaveBeenCalledTimes(1);

    // Unrelated key must be ignored
    fireEvent.keyDown(apacRow, { key: 'Escape' });
    expect(onSelectItem).toHaveBeenCalledTimes(1);

    // Keyboard Enter activates APAC
    fireEvent.keyDown(apacRow, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenLastCalledWith({
      id: 'apac',
      label: 'APAC',
      baseline: 38,
      current: 59.4,
      gap: 21.4,
      gapPct: 56.3,
    });

    // Keyboard Space activates LATAM
    fireEvent.keyDown(latamRow, { key: ' ' });
    expect(onSelectItem).toHaveBeenLastCalledWith({
      id: 'latam',
      label: 'LATAM',
      baseline: 34.5,
      current: 44.1,
      gap: 9.6,
      gapPct: 27.8,
    });

    // ArrowDown moves from index 3 (latam) -> index 4 (nordics)
    fireEvent.keyDown(latamRow, { key: 'ArrowDown' });
    expect(onSelectItem).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'nordics' }));
    expect(document.activeElement).toBe(screen.getByTestId('dumbbell-row-nordics'));

    // End jumps to last row (uk-ie)
    fireEvent.keyDown(screen.getByTestId('dumbbell-row-nordics'), { key: 'End' });
    expect(onSelectItem).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'uk-ie' }));
    expect(document.activeElement).toBe(screen.getByTestId('dumbbell-row-uk-ie'));

    // ArrowDown from last wraps to index 0 (na)
    fireEvent.keyDown(screen.getByTestId('dumbbell-row-uk-ie'), { key: 'ArrowDown' });
    expect(onSelectItem).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'na' }));
    expect(document.activeElement).toBe(screen.getByTestId('dumbbell-row-na'));

    // ArrowUp from index 0 wraps to last (uk-ie)
    fireEvent.keyDown(screen.getByTestId('dumbbell-row-na'), { key: 'ArrowUp' });
    expect(onSelectItem).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'uk-ie' }));
    expect(document.activeElement).toBe(screen.getByTestId('dumbbell-row-uk-ie'));

    // Home jumps back to index 0 (na)
    fireEvent.keyDown(screen.getByTestId('dumbbell-row-uk-ie'), { key: 'Home' });
    expect(onSelectItem).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'na' }));
    expect(document.activeElement).toBe(screen.getByTestId('dumbbell-row-na'));
  });

  it('renders clean role="status" empty state for items={[]} and handles zero-baseline, negative, coincident, non-finite, duplicate-id, long-label, and XSS inputs', () => {
    const { rerender, unmount } = render(
      <DumbbellPlot items={[]} data-testid="edge-plot" />
    );

    const root = screen.getByTestId('edge-plot');
    expect(root).toHaveAttribute('data-empty', 'true');
    const emptyStatus = screen.getByTestId('dumbbell-empty');
    expect(emptyStatus).toHaveAttribute('role', 'status');
    expect(emptyStatus).toHaveTextContent('No variance comparison items to display.');
    expect(screen.queryByTestId('dumbbell-svg')).toBeNull();
    expect(screen.queryByTestId('dumbbell-readout')).toBeNull();

    // Adversarial numeric inputs: zero baseline, negative domain, coincident dots, NaN/Infinity/-0, duplicates, long label
    const onSelect = vi.fn();
    const edgeItems: DumbbellItem[] = [
      { id: 'zero-base', label: 'Zero Baseline', baseline: 0, current: 25 },
      { id: 'neg-shift', label: 'Negative To Positive', baseline: -20, current: 10 },
      { id: 'equal-pos', label: 'Equal Metric Value', baseline: 50, current: 50 },
      { id: 'corrupt', label: 'Corrupt Numbers', baseline: Number.NaN, current: Number.POSITIVE_INFINITY },
      { id: 'dup', label: 'Duplicate One', baseline: -0, current: -0 },
      { id: 'dup', label: 'Duplicate Two', baseline: -10, current: -30 },
    ];

    rerender(<DumbbellPlot items={edgeItems} onSelectItem={onSelect} data-testid="edge-plot" />);

    expect(root.innerHTML).not.toContain('NaN');
    expect(root.innerHTML).not.toContain('Infinity');
    expect(root.innerHTML).not.toContain('-0%');

    // Zero baseline -> gapPct is null and readout displays N/A change
    fireEvent.click(screen.getByTestId('dumbbell-row-zero-base'));
    expect(onSelect).toHaveBeenLastCalledWith({
      id: 'zero-base',
      label: 'Zero Baseline',
      baseline: 0,
      current: 25,
      gap: 25,
      gapPct: null,
    });
    expect(screen.getByTestId('dumbbell-readout-pct')).toHaveTextContent('N/A change');

    // Negative-to-positive shift -> gap +30, gapPct +150%
    fireEvent.click(screen.getByTestId('dumbbell-row-neg-shift'));
    expect(onSelect).toHaveBeenLastCalledWith({
      id: 'neg-shift',
      label: 'Negative To Positive',
      baseline: -20,
      current: 10,
      gap: 30,
      gapPct: 150,
    });
    expect(screen.getByTestId('dumbbell-readout-pct')).toHaveTextContent('+150% change');

    // Long label (>14 chars) truncated with ellipsis in SVG while full label shows in readout
    expect(screen.getByTestId('dumbbell-row-neg-shift').textContent).toContain('…');
    expect(screen.getByTestId('dumbbell-readout-category')).toHaveTextContent(
      'Negative To Positive'
    );

    // Coincident equal values -> concentric dots (unhighlighted & highlighted), gap 0, gapPct 0%
    const equalRow = screen.getByTestId('dumbbell-row-equal-pos');
    expect(screen.getByTestId('dumbbell-baseline-dot-equal-pos')).toHaveAttribute('r', '5.75');
    expect(screen.getByTestId('dumbbell-current-dot-equal-pos')).toHaveAttribute('r', '3.25');
    fireEvent.focus(equalRow);
    fireEvent.click(equalRow);
    expect(screen.getByTestId('dumbbell-baseline-dot-equal-pos')).toHaveAttribute('r', '6.5');
    expect(screen.getByTestId('dumbbell-current-dot-equal-pos')).toHaveAttribute('r', '3.75');
    expect(screen.getByTestId('dumbbell-delta-equal-pos')).toHaveTextContent('0%');
    expect(screen.getByTestId('dumbbell-readout-pct')).toHaveTextContent('0% change');

    // Constant zero dataset (minVal === maxVal === 0) & single category grammar + removed focus/selection fallback
    rerender(
      <DumbbellPlot
        items={[{ id: 'const-zero', label: 'All Zero', baseline: 0, current: 0 }]}
        data-testid="edge-plot"
      />
    );
    expect(screen.getByTestId('dumbbell-svg')).toHaveAttribute(
      'aria-label',
      'Variance Gap Dumbbell Plot comparing Baseline and Current across 1 category'
    );
    expect(screen.getByTestId('dumbbell-readout-category')).toHaveTextContent('All Zero');

    // Constant positive dataset (minVal === maxVal > 0)
    rerender(
      <DumbbellPlot
        items={[{ id: 'const-pos', label: 'Flat Positive', baseline: 50, current: 50 }]}
        data-testid="edge-plot"
      />
    );
    expect(screen.getByTestId('dumbbell-baseline-dot-const-pos')).toHaveAttribute('cx', '248');

    // Constant negative dataset (minVal === maxVal < 0)
    rerender(
      <DumbbellPlot
        items={[{ id: 'const-neg', label: 'Flat Negative', baseline: -40, current: -40 }]}
        data-testid="edge-plot"
      />
    );
    expect(screen.getByTestId('dumbbell-baseline-dot-const-neg')).toHaveAttribute('cx', '248');

    // XSS payload neutralization across title, labels, id, and unit
    const payload = '<script>window.__dumbbellXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <DumbbellPlot
        title={payload}
        baselineLabel={payload}
        currentLabel={payload}
        unit={payload}
        items={[{ id: payload, label: payload, baseline: 10, current: 20 }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();

    unmount();
  });
});
