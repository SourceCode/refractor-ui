import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  InteractiveLegend,
  type LegendSeriesItem,
  type LegendTone,
  type LegendToneMap,
} from './index';

const SAMPLE_ITEMS: LegendSeriesItem[] = [
  { id: 'p50', label: 'P50 Median', value: 42.5, unit: 'ms', tone: 'emerald' },
  { id: 'p95', label: 'P95 Tail', value: 118, unit: 'ms', tone: 'primary' },
  { id: 'sla', label: 'SLA Target', value: '120', unit: 'ms', tone: 'amber', dashed: true },
];

describe('InteractiveLegend', () => {
  it('renders optical slab with ref, theme override, --prism-* swatches, readouts, and active count', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            InteractiveLegend: {
              className: 'theme-legend-override',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <InteractiveLegend
          ref={ref}
          title="API Latency Legend"
          items={SAMPLE_ITEMS}
          className="local-legend-class"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '12px' }}
          data-testid="legend-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('legend-root');
    expect(ref.current).toBe(root);
    expect(InteractiveLegend.displayName).toBe('InteractiveLegend');
    expect(root).toHaveClass(
      'refractor-interactive-legend',
      'prism-slab',
      'theme-legend-override',
      'local-legend-class'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', marginTop: '12px' });
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-allow-solo', 'true');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-has-hidden');
    expect(root).not.toHaveAttribute('data-all-hidden');

    // No raw color literals or NaN anywhere in rendered DOM
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(root.innerHTML).not.toContain('NaN');

    expect(screen.getByRole('heading', { name: 'API Latency Legend' })).toBeInTheDocument();

    const activeCount = screen.getByTestId('interactive-legend-active-count');
    expect(activeCount).toHaveTextContent('3 / 3 active');
    expect(activeCount).toHaveClass('prism-emerald');
    expect(screen.queryByTestId('interactive-legend-show-all')).not.toBeInTheDocument();

    // Verify dot swatch vs dashed SVG line swatch and tabular value/unit readouts
    const p50Item = screen.getByTestId('interactive-legend-item-p50');
    expect(p50Item).toHaveClass('prism-crystal');
    expect(p50Item).toHaveAttribute('data-visible', 'true');

    const p50Swatch = screen.getByTestId('interactive-legend-swatch-p50');
    expect(p50Swatch).toHaveAttribute('data-swatch', 'dot');
    expect(p50Swatch.style.backgroundColor).toBe('var(--prism-success-main)');
    expect(screen.getByTestId('interactive-legend-value-p50')).toHaveTextContent('42.5ms');

    const p95Swatch = screen.getByTestId('interactive-legend-swatch-p95');
    expect(p95Swatch.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(screen.getByTestId('interactive-legend-value-p95')).toHaveTextContent('118ms');

    const slaSwatch = screen.getByTestId('interactive-legend-swatch-sla');
    expect(slaSwatch).toHaveAttribute('data-swatch', 'dashed');
    const slaLine = slaSwatch.querySelector('line');
    expect(slaLine).toHaveAttribute('stroke', 'var(--prism-warning-main)');
    expect(slaLine).toHaveAttribute('stroke-dasharray', '4 3');
    expect(screen.getByTestId('interactive-legend-value-sla')).toHaveTextContent('120ms');
  });

  it('assigns all 5 default tones cyclically, supports vertical orientation, and formats zero/unitless readouts', () => {
    const toneKeys: Array<keyof LegendToneMap> = [
      'primary',
      'secondary',
      'emerald',
      'amber',
      'rose',
    ];
    const fiveItems: LegendSeriesItem[] = [
      { id: 't1', label: 'One', value: 0, unit: '%' },
      { id: 't2', label: 'Two', value: -0 },
      { id: 't3', label: 'Three', value: '99.4', unit: '  ' },
      { id: 't4', label: 'Four' },
      { id: 't5', label: 'Five', value: '  ' },
    ];

    render(
      <InteractiveLegend
        items={fiveItems}
        orientation="vertical"
        data-testid="vertical-root"
      />
    );

    // Default title when omitted
    expect(screen.getByRole('heading', { name: 'Series Legend' })).toBeInTheDocument();
    expect(screen.getByTestId('vertical-root')).toHaveAttribute('data-orientation', 'vertical');
    expect(screen.getByTestId('interactive-legend-list')).toHaveClass('flex-col');

    const expectedTokens: Record<LegendTone, string> = {
      primary: 'var(--prism-primary-main)',
      secondary: 'var(--prism-secondary-main)',
      emerald: 'var(--prism-success-main)',
      amber: 'var(--prism-warning-main)',
      rose: 'var(--prism-error-main)',
    };

    toneKeys.forEach((tone, index) => {
      const id = `t${index + 1}`;
      expect(screen.getByTestId(`interactive-legend-item-${id}`)).toHaveAttribute(
        'data-tone',
        tone
      );
      expect(screen.getByTestId(`interactive-legend-swatch-${id}`).style.backgroundColor).toBe(
        expectedTokens[tone]
      );
    });

    expect(screen.getByTestId('interactive-legend-value-t1')).toHaveTextContent('0%');
    expect(screen.getByTestId('interactive-legend-value-t2')).toHaveTextContent('0');
    expect(screen.getByTestId('interactive-legend-value-t3')).toHaveTextContent('99.4');
    expect(screen.queryByTestId('interactive-legend-value-t4')).not.toBeInTheDocument();
    expect(screen.queryByTestId('interactive-legend-value-t5')).not.toBeInTheDocument();
  });

  it('toggles visibility in uncontrolled mode with defaultHiddenIds, handles all-hidden, and resets via Show All', () => {
    const onHiddenIdsChange = vi.fn<(hiddenIds: string[]) => void>();

    render(
      <InteractiveLegend
        items={SAMPLE_ITEMS}
        defaultHiddenIds={['sla', 'stale-unknown-id']}
        onHiddenIdsChange={onHiddenIdsChange}
        data-testid="uncontrolled-root"
      />
    );

    // Stale ID is ignored; only 'sla' counts as hidden
    expect(screen.getByTestId('interactive-legend-active-count')).toHaveTextContent(
      '2 / 3 active'
    );
    expect(screen.getByTestId('interactive-legend-active-count')).toHaveClass('prism-well');
    expect(screen.getByTestId('uncontrolled-root')).toHaveAttribute('data-has-hidden', 'true');

    const slaItem = screen.getByTestId('interactive-legend-item-sla');
    const slaToggle = screen.getByTestId('interactive-legend-toggle-sla');
    expect(slaItem).toHaveClass('prism-well');
    expect(slaItem).toHaveAttribute('data-visible', 'false');
    expect(slaToggle).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('interactive-legend-swatch-sla').querySelector('line')
    ).toHaveAttribute('stroke', 'var(--prism-text-disabled)');

    // Hide remaining visible series -> all-hidden state
    fireEvent.click(screen.getByTestId('interactive-legend-toggle-p50'));
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith(['p50', 'sla']);

    fireEvent.click(screen.getByTestId('interactive-legend-toggle-p95'));
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith(['p50', 'p95', 'sla']);
    expect(screen.getByTestId('uncontrolled-root')).toHaveAttribute('data-all-hidden', 'true');
    expect(screen.getByTestId('interactive-legend-active-count')).toHaveTextContent(
      '0 / 3 active'
    );
    expect(screen.getByTestId('interactive-legend-swatch-p50').style.backgroundColor).toBe(
      'var(--prism-text-disabled)'
    );

    // Click p50 again to unhide just p50
    fireEvent.click(screen.getByTestId('interactive-legend-toggle-p50'));
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith(['p95', 'sla']);
    expect(screen.getByTestId('interactive-legend-toggle-p50')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Click Show All to reset hidden list to []
    const showAllBtn = screen.getByTestId('interactive-legend-show-all');
    fireEvent.click(showAllBtn);
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByTestId('interactive-legend-active-count')).toHaveTextContent(
      '3 / 3 active'
    );
    expect(screen.queryByTestId('interactive-legend-show-all')).not.toBeInTheDocument();
  });

  it('supports controlled hiddenIds mode without mutating state unless parent updates prop', () => {
    const onHiddenIdsChange = vi.fn<(hiddenIds: string[]) => void>();

    const { rerender } = render(
      <InteractiveLegend
        items={SAMPLE_ITEMS}
        hiddenIds={['p95']}
        onHiddenIdsChange={onHiddenIdsChange}
      />
    );

    expect(screen.getByTestId('interactive-legend-active-count')).toHaveTextContent(
      '2 / 3 active'
    );
    expect(screen.getByTestId('interactive-legend-toggle-p95')).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Clicking p50 requests ['p50', 'p95'] but stays visually ['p95'] until parent rerenders
    fireEvent.click(screen.getByTestId('interactive-legend-toggle-p50'));
    expect(onHiddenIdsChange).toHaveBeenCalledWith(['p50', 'p95']);
    expect(screen.getByTestId('interactive-legend-toggle-p50')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Parent applies the update
    rerender(
      <InteractiveLegend
        items={SAMPLE_ITEMS}
        hiddenIds={['p50', 'p95']}
        onHiddenIdsChange={onHiddenIdsChange}
      />
    );
    expect(screen.getByTestId('interactive-legend-active-count')).toHaveTextContent(
      '1 / 3 active'
    );
    expect(screen.getByTestId('interactive-legend-toggle-p50')).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Show All calls onHiddenIdsChange([])
    fireEvent.click(screen.getByTestId('interactive-legend-show-all'));
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith([]);
  });

  it('isolates a series via Solo button or double-click, switches solo target, and restores all when soloing an already-soloed series', () => {
    const onHiddenIdsChange = vi.fn<(hiddenIds: string[]) => void>();

    render(
      <InteractiveLegend
        items={SAMPLE_ITEMS}
        onHiddenIdsChange={onHiddenIdsChange}
      />
    );

    const p50Solo = screen.getByTestId('interactive-legend-solo-p50');
    const p95Solo = screen.getByTestId('interactive-legend-solo-p95');
    const slaToggle = screen.getByTestId('interactive-legend-toggle-sla');

    // Click Solo on p50 -> hides p95 & sla
    fireEvent.click(p50Solo);
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith(['p95', 'sla']);
    expect(p50Solo).toHaveAttribute('aria-pressed', 'true');
    expect(p50Solo).toHaveClass('prism-emerald');
    expect(screen.getByTestId('interactive-legend-item-p50')).toHaveAttribute(
      'data-soloed',
      'true'
    );
    expect(screen.getByTestId('interactive-legend-active-count')).toHaveTextContent(
      '1 / 3 active'
    );

    // Click Solo on already-soloed p50 -> restores ALL series
    fireEvent.click(p50Solo);
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith([]);
    expect(p50Solo).toHaveAttribute('aria-pressed', 'false');
    expect(p50Solo).toHaveClass('prism-well');
    expect(screen.getByTestId('interactive-legend-active-count')).toHaveTextContent(
      '3 / 3 active'
    );

    // Double-click sla toggle -> solos sla
    fireEvent.doubleClick(slaToggle);
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith(['p50', 'p95']);
    expect(screen.getByTestId('interactive-legend-solo-sla')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Click Solo on currently hidden p95 -> switches solo isolation to p95
    fireEvent.click(p95Solo);
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith(['p50', 'sla']);
    expect(p95Solo).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('interactive-legend-solo-sla')).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Double-click already-soloed p95 toggle -> restores all series
    fireEvent.doubleClick(screen.getByTestId('interactive-legend-toggle-p95'));
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByTestId('interactive-legend-active-count')).toHaveTextContent(
      '3 / 3 active'
    );
  });

  it('disables Solo button and double-click isolation when allowSolo=false or fewer than 2 items exist', () => {
    const onHiddenIdsChange = vi.fn<(hiddenIds: string[]) => void>();

    const { rerender } = render(
      <InteractiveLegend
        items={SAMPLE_ITEMS}
        allowSolo={false}
        onHiddenIdsChange={onHiddenIdsChange}
        data-testid="no-solo-root"
      />
    );

    expect(screen.getByTestId('no-solo-root')).not.toHaveAttribute('data-allow-solo');
    expect(screen.queryByTestId('interactive-legend-solo-p50')).not.toBeInTheDocument();

    fireEvent.doubleClick(screen.getByTestId('interactive-legend-toggle-p50'));
    expect(onHiddenIdsChange).not.toHaveBeenCalled();

    // Single-item legend hides Solo even when allowSolo=true
    rerender(
      <InteractiveLegend
        items={[{ id: 'only', label: 'Single Series', value: 12, unit: 'ms' }]}
        allowSolo
        onHiddenIdsChange={onHiddenIdsChange}
      />
    );
    expect(screen.queryByTestId('interactive-legend-solo-only')).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByTestId('interactive-legend-toggle-only'));
    expect(onHiddenIdsChange).not.toHaveBeenCalled();
  });

  it('fires deduplicated onHighlightSeries callbacks on pointer, mouse, and focus/blur events', () => {
    const onHighlightSeries = vi.fn<(seriesId: string | null) => void>();

    render(
      <InteractiveLegend
        items={SAMPLE_ITEMS}
        onHighlightSeries={onHighlightSeries}
      />
    );

    const p50Toggle = screen.getByTestId('interactive-legend-toggle-p50');
    const p95Toggle = screen.getByTestId('interactive-legend-toggle-p95');
    const p50Item = screen.getByTestId('interactive-legend-item-p50');

    // Pointer enter + immediate mouse enter deduplicates to a single callback
    fireEvent.pointerEnter(p50Toggle);
    fireEvent.mouseEnter(p50Toggle);
    expect(onHighlightSeries).toHaveBeenCalledTimes(1);
    expect(onHighlightSeries).toHaveBeenLastCalledWith('p50');
    expect(p50Item).toHaveAttribute('data-highlighted', 'true');

    // Pointer leave + immediate mouse leave deduplicates to a single null callback
    fireEvent.pointerLeave(p50Toggle);
    fireEvent.mouseLeave(p50Toggle);
    expect(onHighlightSeries).toHaveBeenCalledTimes(2);
    expect(onHighlightSeries).toHaveBeenLastCalledWith(null);
    expect(p50Item).not.toHaveAttribute('data-highlighted');

    // Mouse enter -> focus on next item -> stale mouse leave on first item does not wipe second highlight
    fireEvent.mouseEnter(p50Toggle);
    expect(onHighlightSeries).toHaveBeenLastCalledWith('p50');
    fireEvent.focus(p95Toggle);
    expect(onHighlightSeries).toHaveBeenLastCalledWith('p95');
    fireEvent.mouseLeave(p50Toggle);
    expect(onHighlightSeries).toHaveBeenLastCalledWith('p95');
    expect(screen.getByTestId('interactive-legend-item-p95')).toHaveAttribute(
      'data-highlighted',
      'true'
    );

    // Blur active item clears highlight
    fireEvent.blur(p95Toggle);
    expect(onHighlightSeries).toHaveBeenLastCalledWith(null);
    expect(screen.getByTestId('interactive-legend-item-p95')).not.toHaveAttribute(
      'data-highlighted'
    );
  });

  it('handles IME-safe Enter and Space keyboard activation across toggle, Solo, and Show All buttons', () => {
    const onHiddenIdsChange = vi.fn<(hiddenIds: string[]) => void>();

    render(
      <InteractiveLegend
        items={SAMPLE_ITEMS}
        onHiddenIdsChange={onHiddenIdsChange}
      />
    );

    const p50Toggle = screen.getByTestId('interactive-legend-toggle-p50');
    const p95Solo = screen.getByTestId('interactive-legend-solo-p95');

    // Enter toggles visibility
    fireEvent.keyDown(p50Toggle, { key: 'Enter' });
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith(['p50']);

    // Space toggles visibility back
    fireEvent.keyDown(p50Toggle, { key: ' ' });
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith([]);

    // Unrelated key does nothing
    const callsBefore = onHiddenIdsChange.mock.calls.length;
    fireEvent.keyDown(p50Toggle, { key: 'Escape' });
    expect(onHiddenIdsChange).toHaveBeenCalledTimes(callsBefore);

    // IME composing Enter is ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    p50Toggle.dispatchEvent(imeEvent);
    expect(onHiddenIdsChange).toHaveBeenCalledTimes(callsBefore);

    // Keyboard Enter on Solo isolates p95
    fireEvent.keyDown(p95Solo, { key: 'Enter' });
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith(['p50', 'sla']);

    // Keyboard Space on Show All restores all
    const showAllBtn = screen.getByTestId('interactive-legend-show-all');
    fireEvent.keyDown(showAllBtn, { key: ' ' });
    expect(onHiddenIdsChange).toHaveBeenLastCalledWith([]);
  });

  it('deduplicates duplicate IDs, defends against prototype pollution, NaN/Infinity, XSS payloads, and renders empty role="status"', () => {
    const xssTitle = '<script>window.__legendXss=1</script><img src=x onerror=alert(1)>';
    const xssLabel = '<svg onload=alert(1)>Injected Series';

    const { rerender } = render(
      <InteractiveLegend
        title={xssTitle}
        items={[
          { id: '__proto__', label: xssLabel, value: Number.NaN, unit: 'ms' },
          { id: '__proto__', label: 'Duplicate Should Be Dropped', value: 999 },
          { id: 'constructor', label: 'Constructor Safe', value: Number.POSITIVE_INFINITY, unit: '%' },
          { id: 'toString', label: 'ToString Safe', value: Number.NEGATIVE_INFINITY },
        ]}
        defaultHiddenIds={['__proto__', 'constructor']}
      />
    );

    // XSS is rendered strictly as text, never parsed HTML
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssTitle })).toBeInTheDocument();
    expect(screen.getByText(xssLabel)).toBeInTheDocument();
    expect(screen.queryByText('Duplicate Should Be Dropped')).not.toBeInTheDocument();

    // Deduplicated to 3 unique items, 2 hidden -> 1 / 3 active
    expect(screen.getByTestId('interactive-legend-active-count')).toHaveTextContent(
      '1 / 3 active'
    );

    // Non-finite numbers do not render NaN or Infinity
    expect(screen.queryByTestId('interactive-legend-value-__proto__')).not.toBeInTheDocument();
    expect(screen.queryByTestId('interactive-legend-value-constructor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('interactive-legend-value-toString')).not.toBeInTheDocument();

    // Toggle prototype-keyed series works without polluting Object.prototype
    fireEvent.click(screen.getByTestId('interactive-legend-toggle-__proto__'));
    expect(screen.getByTestId('interactive-legend-active-count')).toHaveTextContent(
      '2 / 3 active'
    );
    expect(({} as Record<string, string>)['__proto__']).not.toBe('__proto__');

    // Empty state exposes role="status" and clean counter
    rerender(<InteractiveLegend items={[]} data-testid="empty-legend" />);
    expect(screen.getByTestId('empty-legend')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('interactive-legend-active-count')).toHaveTextContent(
      '0 / 0 active'
    );
    expect(screen.queryByTestId('interactive-legend-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('interactive-legend-show-all')).not.toBeInTheDocument();

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No series available in legend.');
  });
});
