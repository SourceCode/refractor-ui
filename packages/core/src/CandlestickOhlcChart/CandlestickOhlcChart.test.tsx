import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CandlestickOhlcChart,
  DEFAULT_OHLC_DATA,
  type CandleStyleMode,
  type CandleStyleModeMap,
  type OhlcCandlePoint,
} from './index';

const CUSTOM_SESSIONS: OhlcCandlePoint[] = [
  { id: 'd1', label: 'Mon', open: 100, high: 108, low: 98, close: 105, volume: 450 },
  { id: 'd2', label: 'Tue', open: 105, high: 107, low: 96, close: 99, volume: 12_500 },
  { id: 'd3', label: 'Wed', open: 99, high: 102, low: 97, close: 99, volume: 2_400_000 },
  { id: 'd4', label: 'Thu', open: 99, high: 112, low: 98, close: 110, volume: 1_350_000_000 },
];

describe('CandlestickOhlcChart', () => {
  it('renders 14 default market sessions, forwards ref, applies overrides/tokens, and avoids raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const modeMapCheck: CandleStyleModeMap = { candlestick: true, ohlc: true };
    expect(modeMapCheck.candlestick).toBe(true);
    expect(modeMapCheck.ohlc).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CandlestickOhlcChart: {
              className: 'theme-candle-override',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <CandlestickOhlcChart
          ref={ref}
          className="consumer-candle-chart"
          xstyle={{ '--prism-blur-px': '14px' }}
          style={{ minWidth: '0px' }}
          data-testid="candle-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('candle-root');
    expect(ref.current).toBe(root);
    expect(CandlestickOhlcChart.displayName).toBe('CandlestickOhlcChart');
    expect(root).toHaveClass(
      'refractor-candlestick-ohlc-chart',
      'prism-slab',
      'theme-candle-override',
      'consumer-candle-chart',
      'min-w-0',
      'max-w-full'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-mode', 'candlestick');
    expect(root).toHaveAttribute('data-show-volume', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    expect(
      screen.getByRole('heading', { name: 'Market OHLC / Candlestick' })
    ).toBeInTheDocument();

    const candlestickToggle = screen.getByTestId('candle-mode-candlestick');
    const ohlcToggle = screen.getByTestId('candle-mode-ohlc');
    expect(candlestickToggle).toHaveAttribute('aria-pressed', 'true');
    expect(ohlcToggle).toHaveAttribute('aria-pressed', 'false');

    const latestPill = screen.getByTestId('candlestick-latest-pill');
    expect(latestPill).toHaveAttribute('data-direction', 'bullish');
    expect(latestPill.style.color).toBe('var(--prism-success-main)');
    expect(latestPill).toHaveTextContent('$192.60');
    expect(latestPill).toHaveTextContent('+1.58%');

    const svg = screen.getByRole('img', {
      name: 'Market OHLC / Candlestick candlestick chart across 14 sessions',
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 460 220');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.parentElement).toHaveClass('prism-well');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    expect(svg.querySelectorAll('line[data-role="price-gridline"]')).toHaveLength(5);
    expect(svg.querySelectorAll('text[data-role="price-tick-label"]')).toHaveLength(5);
    expect(svg.querySelectorAll('line[data-role="candle-wick"]')).toHaveLength(
      DEFAULT_OHLC_DATA.length
    );
    expect(svg.querySelectorAll('rect[data-role="candle-body"]')).toHaveLength(
      DEFAULT_OHLC_DATA.length
    );
    expect(svg.querySelectorAll('rect[data-role="volume-bar"]')).toHaveLength(
      DEFAULT_OHLC_DATA.length
    );

    // Bullish (including doji s-07 where close === open) use --prism-success-main; bearish use --prism-error-main
    const bullishHit = screen.getByTestId('candle-hit-s-01');
    const bearishHit = screen.getByTestId('candle-hit-s-03');
    const dojiHit = screen.getByTestId('candle-hit-s-07');
    expect(bullishHit).toHaveAttribute('data-direction', 'bullish');
    expect(dojiHit).toHaveAttribute('data-direction', 'bullish');
    expect(bearishHit).toHaveAttribute('data-direction', 'bearish');

    expect(bullishHit.querySelector('rect[data-role="candle-body"]')).toHaveAttribute(
      'fill',
      'var(--prism-success-main)'
    );
    expect(bullishHit.querySelector('rect[data-role="candle-body"]')).toHaveAttribute(
      'data-fill-variant',
      'hollow'
    );
    expect(bearishHit.querySelector('rect[data-role="candle-body"]')).toHaveAttribute(
      'fill',
      'var(--prism-error-main)'
    );
    expect(bearishHit.querySelector('rect[data-role="candle-body"]')).toHaveAttribute(
      'data-fill-variant',
      'filled'
    );

    // Active crosshair & inspector default to latest session (s-14)
    const crosshair = svg.querySelector('line[data-role="active-crosshair"]');
    expect(crosshair).not.toBeNull();
    const inspector = screen.getByTestId('candlestick-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveClass('prism-well');
    expect(screen.getByTestId('inspector-session')).toHaveTextContent('May 20');
    expect(screen.getByTestId('inspector-open')).toHaveTextContent('O $189.60');
    expect(screen.getByTestId('inspector-high')).toHaveTextContent('H $193.40');
    expect(screen.getByTestId('inspector-low')).toHaveTextContent('L $188.80');
    expect(screen.getByTestId('inspector-close')).toHaveTextContent('C $192.60');
    expect(screen.getByTestId('inspector-delta')).toHaveTextContent('Δ +1.58%');
    expect(screen.getByTestId('inspector-volume')).toHaveTextContent('Vol 2.89M');
  });

  it('switches between Candlestick and OHLC modes in uncontrolled and controlled configurations', () => {
    const onModeChange = vi.fn<(mode: CandleStyleMode) => void>();
    const { rerender } = render(
      <CandlestickOhlcChart
        data={CUSTOM_SESSIONS}
        defaultMode="candlestick"
        onModeChange={onModeChange}
        data-testid="chart-uncontrolled"
      />
    );

    const svg = screen.getByRole('img');
    expect(svg.querySelectorAll('rect[data-role="candle-body"]')).toHaveLength(4);
    expect(svg.querySelectorAll('line[data-role="ohlc-open-tick"]')).toHaveLength(0);

    fireEvent.click(screen.getByTestId('candle-mode-ohlc'));
    expect(onModeChange).toHaveBeenCalledWith('ohlc');
    expect(screen.getByTestId('candle-mode-ohlc')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('candle-mode-candlestick')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('chart-uncontrolled')).toHaveAttribute('data-mode', 'ohlc');
    expect(svg.querySelectorAll('rect[data-role="candle-body"]')).toHaveLength(0);
    expect(svg.querySelectorAll('line[data-role="ohlc-open-tick"]')).toHaveLength(4);
    expect(svg.querySelectorAll('line[data-role="ohlc-close-tick"]')).toHaveLength(4);

    // Verify OHLC tick geometry: open tick goes left of wick, close tick goes right of wick
    const firstHit = screen.getByTestId('candle-hit-d1');
    const wick = firstHit.querySelector('line[data-role="candle-wick"]')!;
    const openTick = firstHit.querySelector('line[data-role="ohlc-open-tick"]')!;
    const closeTick = firstHit.querySelector('line[data-role="ohlc-close-tick"]')!;
    const wickX = Number(wick.getAttribute('x1'));
    expect(Number(openTick.getAttribute('x1'))).toBeLessThan(wickX);
    expect(Number(openTick.getAttribute('x2'))).toBe(wickX);
    expect(Number(closeTick.getAttribute('x1'))).toBe(wickX);
    expect(Number(closeTick.getAttribute('x2'))).toBeGreaterThan(wickX);
    expect(openTick).toHaveAttribute('stroke', 'var(--prism-success-main)');
    expect(closeTick).toHaveAttribute('stroke', 'var(--prism-success-main)');

    // Controlled mode remains driven by caller prop
    onModeChange.mockClear();
    rerender(
      <CandlestickOhlcChart
        data={CUSTOM_SESSIONS}
        mode="ohlc"
        onModeChange={onModeChange}
        data-testid="chart-uncontrolled"
      />
    );
    fireEvent.click(screen.getByTestId('candle-mode-candlestick'));
    expect(onModeChange).toHaveBeenCalledWith('candlestick');
    expect(screen.getByTestId('chart-uncontrolled')).toHaveAttribute('data-mode', 'ohlc');
    expect(svg.querySelectorAll('line[data-role="ohlc-open-tick"]')).toHaveLength(4);
  });

  it('supports click selection, IME-safe Enter/Space activation, and ArrowLeft/ArrowRight focus stepping', () => {
    const onSelectCandle = vi.fn();
    render(
      <CandlestickOhlcChart
        title="ACME Equity"
        data={CUSTOM_SESSIONS}
        currencyPrefix="€"
        onSelectCandle={onSelectCandle}
      />
    );

    const d1 = screen.getByTestId('candle-hit-d1');
    const d2 = screen.getByTestId('candle-hit-d2');
    const d3 = screen.getByTestId('candle-hit-d3');
    const d4 = screen.getByTestId('candle-hit-d4');

    // Default active session is d4 (volume in Billions)
    expect(d4).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('inspector-volume')).toHaveTextContent('Vol 1.35B');

    // Click bearish session d2 (volume in K)
    fireEvent.click(d2);
    expect(onSelectCandle).toHaveBeenCalledWith(CUSTOM_SESSIONS[1], 1);
    expect(d2).toHaveAttribute('data-active', 'true');
    expect(d2).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('inspector-session')).toHaveTextContent('Tue');
    expect(screen.getByTestId('inspector-open')).toHaveTextContent('O €105.00');
    expect(screen.getByTestId('inspector-close')).toHaveTextContent('C €99.00');
    expect(screen.getByTestId('inspector-delta')).toHaveTextContent('Δ -5.71%');
    expect(screen.getByTestId('inspector-delta').style.color).toBe('var(--prism-error-main)');
    expect(screen.getByTestId('inspector-volume')).toHaveTextContent('Vol 12.5K');

    // IME composing events must be ignored
    fireEvent.keyDown(d3, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(d3, { key: 'ArrowRight', isComposing: true });
    expect(onSelectCandle).toHaveBeenCalledTimes(1);

    // Non-navigation key is ignored
    fireEvent.keyDown(d2, { key: 'Escape' });
    expect(onSelectCandle).toHaveBeenCalledTimes(1);

    // ArrowRight steps from d2 -> d3 and moves focus
    fireEvent.keyDown(d2, { key: 'ArrowRight' });
    expect(onSelectCandle).toHaveBeenLastCalledWith(CUSTOM_SESSIONS[2], 2);
    expect(document.activeElement).toBe(d3);
    expect(screen.getByTestId('inspector-delta')).toHaveTextContent('Δ 0.00%');
    expect(screen.getByTestId('inspector-volume')).toHaveTextContent('Vol 2.40M');

    // ArrowRight from last element clamps at last index
    fireEvent.keyDown(d4, { key: 'ArrowRight' });
    expect(onSelectCandle).toHaveBeenLastCalledWith(CUSTOM_SESSIONS[3], 3);
    expect(document.activeElement).toBe(d4);

    // ArrowLeft steps backward d2 -> d1 and clamps at 0
    fireEvent.keyDown(d2, { key: 'ArrowLeft' });
    expect(onSelectCandle).toHaveBeenLastCalledWith(CUSTOM_SESSIONS[0], 0);
    expect(document.activeElement).toBe(d1);
    expect(screen.getByTestId('inspector-volume')).toHaveTextContent('Vol 450');

    fireEvent.keyDown(d1, { key: 'ArrowLeft' });
    expect(onSelectCandle).toHaveBeenLastCalledWith(CUSTOM_SESSIONS[0], 0);

    // Enter and Space activate focused candle
    fireEvent.keyDown(d3, { key: 'Enter' });
    expect(onSelectCandle).toHaveBeenLastCalledWith(CUSTOM_SESSIONS[2], 2);

    fireEvent.keyDown(d4, { key: ' ' });
    expect(onSelectCandle).toHaveBeenLastCalledWith(CUSTOM_SESSIONS[3], 3);
  });

  it('hides the volume histogram when showVolume is false and supports sessions without volume', () => {
    const noVolSessions: OhlcCandlePoint[] = [
      { id: 'nv1', label: '09:30', open: 50, high: 52, low: 48, close: 49 },
      { id: 'nv2', label: '10:00', open: 49, high: 50, low: 45, close: 46 },
    ];
    const { rerender } = render(
      <CandlestickOhlcChart data={noVolSessions} showVolume={false} data-testid="no-vol-chart" />
    );

    expect(screen.getByTestId('no-vol-chart')).not.toHaveAttribute('data-show-volume');
    const svg = screen.getByRole('img');
    expect(svg.querySelector('g[data-role="volume-section"]')).toBeNull();
    expect(svg.querySelectorAll('rect[data-role="volume-bar"]')).toHaveLength(0);
    expect(screen.getByTestId('inspector-volume')).toHaveTextContent('Vol —');

    // Latest session is bearish -> header pill uses --prism-error-main
    const latestPill = screen.getByTestId('candlestick-latest-pill');
    expect(latestPill).toHaveAttribute('data-direction', 'bearish');
    expect(latestPill.style.color).toBe('var(--prism-error-main)');

    // Even with showVolume=true, omitted volume gracefully renders no volume bars
    rerender(<CandlestickOhlcChart data={noVolSessions} showVolume />);
    expect(svg.querySelector('g[data-role="volume-section"]')).not.toBeNull();
    expect(svg.querySelectorAll('rect[data-role="volume-bar"]')).toHaveLength(0);
  });

  it('renders a clean role="status" empty state when data is []', () => {
    render(<CandlestickOhlcChart data={[]} data-testid="empty-candle" />);

    expect(screen.getByTestId('empty-candle')).toHaveAttribute('data-empty', 'true');
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No market OHLC sessions to display.');
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('candlestick-latest-pill')).toBeNull();
    expect(screen.queryByTestId('candlestick-inspector')).toBeNull();
  });

  it('sanitizes adversarial non-finite, inverted, flat, negative, and duplicate/blank inputs and recovers on data shrink', () => {
    const adversarial: OhlcCandlePoint[] = [
      {
        id: '   ',
        label: '  ',
        open: Number.NaN,
        high: Number.POSITIVE_INFINITY,
        low: Number.NEGATIVE_INFINITY,
        close: Number.NaN,
        volume: -500,
      },
      {
        id: 'dup',
        label: 'Spread',
        open: -12.5,
        high: -20,
        low: -5,
        close: -8.25,
        volume: Number.NaN,
      },
      {
        id: 'dup',
        label: 'Flat',
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0,
      },
    ];

    const { rerender } = render(
      <CandlestickOhlcChart data={adversarial} data-testid="adv-chart" />
    );

    const svg = screen.getByRole('img');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.querySelectorAll('line[data-role="candle-wick"]')).toHaveLength(3);

    // Select index 2, then shrink data to a single flat non-zero candle
    const hitButtons = screen.getAllByRole('button').filter((el) =>
      el.hasAttribute('data-candle-id')
    );
    expect(hitButtons).toHaveLength(3);
    fireEvent.click(hitButtons[1]!);
    expect(screen.getByTestId('inspector-open')).toHaveTextContent('O -$12.50');
    expect(screen.getByTestId('inspector-high')).toHaveTextContent('H -$5.00');
    expect(screen.getByTestId('inspector-low')).toHaveTextContent('L -$20.00');
    expect(screen.getByTestId('inspector-close')).toHaveTextContent('C -$8.25');

    fireEvent.click(hitButtons[2]!);
    expect(screen.getByTestId('inspector-delta')).toHaveTextContent('Δ 0.00%');

    // Shrink data to 1 flat non-zero candle (triggers domainMin === domainMax non-zero branch + index fallback)
    rerender(
      <CandlestickOhlcChart
        data={[{ id: 'solo', label: 'Solo', open: 50, high: 50, low: 50, close: 50 }]}
      />
    );
    expect(screen.getByTestId('inspector-session')).toHaveTextContent('Solo');
    expect(screen.getByTestId('inspector-close')).toHaveTextContent('C $50.00');
    expect(svg.innerHTML).not.toContain('NaN');

    // Single flat zero candle (triggers domainMin === domainMax === 0 branch)
    rerender(
      <CandlestickOhlcChart
        data={[{ id: 'zero', label: 'Zero', open: 0, high: 0, low: 0, close: 0 }]}
      />
    );
    expect(screen.getByTestId('inspector-session')).toHaveTextContent('Zero');
    expect(svg.innerHTML).not.toContain('NaN');
  });
});
