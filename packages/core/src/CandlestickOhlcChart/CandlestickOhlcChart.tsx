'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type CandleStyleMode = 'candlestick' | 'ohlc';

export interface OhlcCandlePoint {
  /** Stable unique identifier for this market session. */
  id: string;
  /** Session label rendered on the X-axis and inspector strip (e.g. 'May 01'). */
  label: string;
  /** Opening price for the session. */
  open: number;
  /** Highest traded price for the session. */
  high: number;
  /** Lowest traded price for the session. */
  low: number;
  /** Closing price for the session. */
  close: number;
  /** Optional traded share or contract volume rendered in the lower histogram. */
  volume?: number;
}

export interface CandlestickOhlcChartProps extends BaseProps<HTMLDivElement> {
  /** Ordered OHLC market sessions. Defaults to 14 realistic sessions when omitted; pass `[]` for empty state. */
  data?: ReadonlyArray<OhlcCandlePoint>;
  /** Controlled chart rendering mode (`'candlestick'` | `'ohlc'`). */
  mode?: CandleStyleMode;
  /** Initial uncontrolled chart rendering mode (defaults to `'candlestick'`). */
  defaultMode?: CandleStyleMode;
  /** Callback fired when the user switches between Candlestick and OHLC modes. */
  onModeChange?: (mode: CandleStyleMode) => void;
  /** Toggles the lower translucent volume histogram overlay (defaults to `true`). */
  showVolume?: boolean;
  /** Currency or unit prefix prepended to prices (defaults to `'$'`). */
  currencyPrefix?: string;
  /** Visible heading displayed in the optical card header (defaults to `'Market OHLC / Candlestick'`). */
  title?: string;
  /** Callback invoked when a session candle is clicked or activated/stepped via keyboard. */
  onSelectCandle?: (candle: OhlcCandlePoint, index: number) => void;
}

interface ModeOption {
  id: CandleStyleMode;
  label: string;
}

interface SanitizedCandle {
  key: string;
  id: string;
  index: number;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  isBullish: boolean;
  deltaPct: number;
  toneToken: string;
  original: OhlcCandlePoint;
}

interface PlottedCandle extends SanitizedCandle {
  cx: number;
  hitX: number;
  hitWidth: number;
  bodyX: number;
  bodyY: number;
  bodyWidth: number;
  bodyHeight: number;
  tickHalfWidth: number;
  yHigh: number;
  yLow: number;
  yOpen: number;
  yClose: number;
  volY: number;
  volHeight: number;
  showAxisLabel: boolean;
}

interface PriceTick {
  key: string;
  y: number;
  label: string;
  isBaseline: boolean;
}

const SVG_WIDTH = 460;
const SVG_HEIGHT = 220;
const PLOT_X0 = 58;
const PLOT_X1 = 448;
const PLOT_WIDTH = PLOT_X1 - PLOT_X0;
const PRICE_TOP = 14;
const PRICE_BOTTOM_WITH_VOL = 146;
const PRICE_BOTTOM_FULL = 194;
const VOL_DIVIDER_Y = 152;
const VOL_TOP = 156;
const VOL_BOTTOM = 196;
const VOL_PLOT_HEIGHT = VOL_BOTTOM - VOL_TOP;
const X_AXIS_LABEL_Y = 212;
const TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];

const MODE_OPTIONS: ReadonlyArray<ModeOption> = [
  { id: 'candlestick', label: 'Candlestick' },
  { id: 'ohlc', label: 'OHLC' },
];

/** Default 14-session market OHLC dataset with realistic bullish, bearish, and doji price action. */
export const DEFAULT_OHLC_DATA: ReadonlyArray<OhlcCandlePoint> = [
  { id: 's-01', label: 'May 01', open: 174.2, high: 177.8, low: 172.9, close: 176.9, volume: 1_420_000 },
  { id: 's-02', label: 'May 02', open: 176.9, high: 179.4, low: 175.6, close: 178.6, volume: 1_580_000 },
  { id: 's-03', label: 'May 05', open: 178.5, high: 180.1, low: 174.8, close: 175.4, volume: 1_960_000 },
  { id: 's-04', label: 'May 06', open: 175.4, high: 176.8, low: 171.9, close: 173.1, volume: 2_140_000 },
  { id: 's-05', label: 'May 07', open: 173.2, high: 177.5, low: 172.4, close: 176.8, volume: 1_730_000 },
  { id: 's-06', label: 'May 08', open: 176.8, high: 181.2, low: 176.1, close: 180.4, volume: 2_310_000 },
  { id: 's-07', label: 'May 09', open: 180.4, high: 183.0, low: 179.2, close: 180.4, volume: 1_290_000 },
  { id: 's-08', label: 'May 12', open: 180.6, high: 184.9, low: 179.8, close: 184.2, volume: 2_480_000 },
  { id: 's-09', label: 'May 13', open: 184.1, high: 185.6, low: 180.7, close: 181.5, volume: 1_890_000 },
  { id: 's-10', label: 'May 14', open: 181.5, high: 186.4, low: 181.0, close: 185.8, volume: 2_110_000 },
  { id: 's-11', label: 'May 15', open: 185.7, high: 188.9, low: 184.6, close: 188.1, volume: 2_620_000 },
  { id: 's-12', label: 'May 16', open: 188.0, high: 189.2, low: 185.1, close: 186.2, volume: 1_750_000 },
  { id: 's-13', label: 'May 19', open: 186.4, high: 190.5, low: 185.9, close: 189.7, volume: 2_430_000 },
  { id: 's-14', label: 'May 20', open: 189.6, high: 193.4, low: 188.8, close: 192.6, volume: 2_890_000 },
];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function makeUniqueKey(base: string, seen: Map<string, number>): string {
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function formatPrice(value: number, prefix: string): string {
  const safe = normalizeZero(value);
  const sign = safe < 0 ? '-' : '';
  return `${sign}${prefix}${Math.abs(safe).toFixed(2)}`;
}

function formatSignedPct(pct: number): string {
  const rounded = roundTwo(pct);
  if (rounded > 0) {
    return `+${rounded.toFixed(2)}%`;
  }
  if (rounded < 0) {
    return `${rounded.toFixed(2)}%`;
  }
  return '0.00%';
}

function formatVolume(volume: number | undefined): string {
  if (volume === undefined) {
    return '—';
  }
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return String(Math.round(volume));
}

function sanitizeCandles(rawData: ReadonlyArray<OhlcCandlePoint>): SanitizedCandle[] {
  const seenKeys = new Map<string, number>();
  return rawData.map((point, index) => {
    const trimmedId = point.id.trim();
    const baseId = trimmedId.length > 0 ? trimmedId : `session-${index + 1}`;
    const uniqueKey = makeUniqueKey(baseId, seenKeys);
    const trimmedLabel = point.label.trim();
    const label = trimmedLabel.length > 0 ? trimmedLabel : `S${index + 1}`;

    const open = Number.isFinite(point.open) ? normalizeZero(point.open) : 0;
    const close = Number.isFinite(point.close) ? normalizeZero(point.close) : open;
    const rawHigh = Number.isFinite(point.high)
      ? normalizeZero(point.high)
      : Math.max(open, close);
    const rawLow = Number.isFinite(point.low)
      ? normalizeZero(point.low)
      : Math.min(open, close);

    const high = Math.max(rawHigh, rawLow, open, close);
    const low = Math.min(rawHigh, rawLow, open, close);
    const volume =
      point.volume !== undefined && Number.isFinite(point.volume)
        ? Math.max(0, normalizeZero(point.volume))
        : undefined;

    const isBullish = close >= open;
    const deltaPct = open === 0 ? 0 : ((close - open) / Math.abs(open)) * 100;
    const toneToken = isBullish ? 'var(--prism-success-main)' : 'var(--prism-error-main)';

    return {
      key: uniqueKey,
      id: baseId,
      index,
      label,
      open,
      high,
      low,
      close,
      volume,
      isBullish,
      deltaPct,
      toneToken,
      original: point,
    };
  });
}

function CandlestickOhlcChartInner({
  data,
  mode,
  defaultMode = 'candlestick',
  onModeChange,
  showVolume = true,
  currencyPrefix = '$',
  title = 'Market OHLC / Candlestick',
  onSelectCandle,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CandlestickOhlcChartProps) {
  const headingId = useId();
  const override = useComponentOverride('CandlestickOhlcChart');
  const hitRefs = useRef<Map<string, SVGGElement | null>>(new Map());

  const [activeMode, setActiveMode] = useControllableState<CandleStyleMode>({
    value: mode,
    defaultValue: defaultMode,
    onChange: onModeChange,
  });

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const sourceData = data ?? DEFAULT_OHLC_DATA;

  const candles = useMemo(() => sanitizeCandles(sourceData), [sourceData]);
  const isEmpty = candles.length === 0;

  const activeIndex =
    isEmpty
      ? -1
      : selectedIndex !== null && selectedIndex >= 0 && selectedIndex < candles.length
        ? selectedIndex
        : candles.length - 1;

  const geometry = useMemo(() => {
    const priceBottom = showVolume ? PRICE_BOTTOM_WITH_VOL : PRICE_BOTTOM_FULL;
    const pricePlotHeight = priceBottom - PRICE_TOP;

    if (candles.length === 0) {
      return {
        priceBottom,
        ticks: [] as PriceTick[],
        plotted: [] as PlottedCandle[],
        hasVolumeBars: false,
      };
    }

    let rawMin = Number.POSITIVE_INFINITY;
    let rawMax = Number.NEGATIVE_INFINITY;
    let maxVolume = 0;

    for (const candle of candles) {
      if (candle.low < rawMin) rawMin = candle.low;
      if (candle.high > rawMax) rawMax = candle.high;
      if (candle.volume !== undefined && candle.volume > maxVolume) {
        maxVolume = candle.volume;
      }
    }

    let domainMin = rawMin;
    let domainMax = rawMax;
    if (domainMin === domainMax) {
      const flatPad = domainMin === 0 ? 1 : Math.abs(domainMin) * 0.05;
      domainMin -= flatPad;
      domainMax += flatPad;
    } else {
      const rangePad = (domainMax - domainMin) * 0.06;
      domainMin -= rangePad;
      domainMax += rangePad;
    }

    const domainSpan = domainMax - domainMin;
    const priceToY = (price: number): number =>
      roundTwo(PRICE_TOP + pricePlotHeight * (1 - (price - domainMin) / domainSpan));

    const ticks: PriceTick[] = TICK_FRACTIONS.map((frac) => {
      const y = roundTwo(PRICE_TOP + pricePlotHeight * (1 - frac));
      const tickPrice = normalizeZero(domainMin + domainSpan * frac);
      return {
        key: `price-tick-${frac}`,
        y,
        label: formatPrice(tickPrice, currencyPrefix),
        isBaseline: frac === 0,
      };
    });

    const count = candles.length;
    const bandWidth = PLOT_WIDTH / count;
    const bodyWidth = roundTwo(Math.min(18, Math.max(4, bandWidth * 0.58)));
    const halfBody = bodyWidth / 2;
    const tickHalfWidth = roundTwo(Math.min(9, Math.max(3, bandWidth * 0.34)));
    const labelStride = Math.max(1, Math.ceil(count / 6));

    const plotted: PlottedCandle[] = candles.map((candle) => {
      const idx = candle.index;
      const cxPos = roundTwo(PLOT_X0 + idx * bandWidth + bandWidth / 2);
      const yHigh = priceToY(candle.high);
      const yLow = priceToY(candle.low);
      const yOpen = priceToY(candle.open);
      const yClose = priceToY(candle.close);
      const bodyTop = roundTwo(Math.min(yOpen, yClose));
      const bodyHeight = roundTwo(Math.max(2, Math.abs(yClose - yOpen)));
      const volHeight =
        showVolume && candle.volume !== undefined && candle.volume > 0 && maxVolume > 0
          ? roundTwo(Math.max(2, (candle.volume / maxVolume) * VOL_PLOT_HEIGHT))
          : 0;
      const volY = roundTwo(VOL_BOTTOM - volHeight);

      const isLast = idx === count - 1;
      const isStrideTick = idx % labelStride === 0;
      const farEnoughFromLast = count - 1 - idx >= Math.ceil(labelStride / 2);
      const showAxisLabel = count <= 6 || isLast || (isStrideTick && farEnoughFromLast);

      return {
        ...candle,
        cx: cxPos,
        hitX: roundTwo(PLOT_X0 + idx * bandWidth),
        hitWidth: roundTwo(bandWidth),
        bodyX: roundTwo(cxPos - halfBody),
        bodyY: bodyTop,
        bodyWidth,
        bodyHeight,
        tickHalfWidth,
        yHigh,
        yLow,
        yOpen,
        yClose,
        volY,
        volHeight,
        showAxisLabel,
      };
    });

    return {
      priceBottom,
      ticks,
      plotted,
      hasVolumeBars: showVolume && maxVolume > 0,
    };
  }, [candles, showVolume, currencyPrefix]);

  const activeCandle = activeIndex >= 0 ? geometry.plotted[activeIndex]! : null;
  const latestCandle = geometry.plotted.length > 0 ? geometry.plotted[geometry.plotted.length - 1]! : null;

  const selectCandleAt = useCallback(
    (nextIndex: number, shouldFocus = false) => {
      const target = geometry.plotted[nextIndex]!;
      setSelectedIndex(nextIndex);
      onSelectCandle?.(target.original, nextIndex);
      if (shouldFocus) {
        hitRefs.current.get(target.key)?.focus();
      }
    },
    [geometry.plotted, onSelectCandle]
  );

  const handleCandleKeyDown = useCallback(
    (candle: PlottedCandle) => (event: ReactKeyboardEvent<SVGGElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectCandleAt(candle.index);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevIdx = Math.max(0, candle.index - 1);
        selectCandleAt(prevIdx, true);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIdx = Math.min(geometry.plotted.length - 1, candle.index + 1);
        selectCandleAt(nextIdx, true);
      }
    },
    [geometry.plotted.length, selectCandleAt]
  );

  const merged = mergeProps({
    themeTarget: themeProps('candlestick-ohlc-chart', {
      mode: activeMode,
      empty: isEmpty,
      showVolume,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-3.5 min-w-0 max-w-full overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('candlestick-ohlc-chart', 'header');
  const svgClass = stableClassName('candlestick-ohlc-chart', 'svg');
  const inspectorClass = stableClassName('candlestick-ohlc-chart', 'inspector');

  const hitAreaBottom = showVolume ? VOL_BOTTOM : geometry.priceBottom;
  const hitAreaHeight = hitAreaBottom - PRICE_TOP;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight min-w-0"
          style={STYLE_TEXT_PRIMARY}
        >
          {title}
        </h4>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div
            role="group"
            aria-label="Chart rendering mode"
            className="prism-well rounded-full p-0.5 inline-flex flex-wrap items-center gap-0.5"
          >
            {MODE_OPTIONS.map((option) => {
              const isModeActive = activeMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isModeActive}
                  data-testid={`candle-mode-${option.id}`}
                  onClick={() => setActiveMode(option.id)}
                  className={cx(
                    'prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                    isModeActive ? 'prism-btn-primary' : 'opacity-80 hover:opacity-100'
                  )}
                  style={isModeActive ? undefined : { color: 'var(--prism-text-primary)' }}
                >
                  <span className="relative z-10">{option.label}</span>
                </button>
              );
            })}
          </div>

          {latestCandle ? (
            <span
              data-testid="candlestick-latest-pill"
              data-direction={latestCandle.isBullish ? 'bullish' : 'bearish'}
              className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums min-w-0"
              style={{ color: latestCandle.toneToken }}
            >
              <span style={STYLE_TEXT_PRIMARY}>
                {formatPrice(latestCandle.close, currencyPrefix)}
              </span>
              <span>{formatSignedPct(latestCandle.deltaPct)}</span>
            </span>
          ) : null}
        </div>
      </div>

      {!activeCandle ? (
        <div
          role="status"
          data-testid="candlestick-chart-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium min-w-0 max-w-full"
          style={STYLE_TEXT_SECONDARY}
        >
          No market OHLC sessions to display.
        </div>
      ) : (
        <>
          <div className="prism-well rounded-2xl p-2.5 sm:p-3 min-w-0 max-w-full overflow-hidden">
            <svg
              role="img"
              aria-label={`${title} ${activeMode === 'candlestick' ? 'candlestick' : 'OHLC'} chart across ${geometry.plotted.length} sessions`}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none block')}
            >
              {geometry.ticks.map((tick) => (
                <g key={tick.key}>
                  <line
                    data-role="price-gridline"
                    x1={PLOT_X0}
                    y1={tick.y}
                    x2={PLOT_X1}
                    y2={tick.y}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    strokeDasharray={tick.isBaseline ? undefined : '3 3'}
                  />
                  <text
                    data-role="price-tick-label"
                    x={PLOT_X0 - 6}
                    y={tick.y + 3}
                    textAnchor="end"
                    fill="var(--prism-text-secondary)"
                    className="text-[9px] font-mono tabular-nums"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {showVolume ? (
                <g data-role="volume-section">
                  <line
                    x1={PLOT_X0}
                    y1={VOL_DIVIDER_Y}
                    x2={PLOT_X1}
                    y2={VOL_DIVIDER_Y}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                  />
                  <text
                    x={PLOT_X0 - 6}
                    y={VOL_TOP + 12}
                    textAnchor="end"
                    fill="var(--prism-text-secondary)"
                    className="text-[8px] font-mono uppercase tracking-wider"
                  >
                    Vol
                  </text>
                </g>
              ) : null}

              <line
                data-role="active-crosshair"
                x1={activeCandle.cx}
                y1={PRICE_TOP}
                x2={activeCandle.cx}
                y2={hitAreaBottom}
                stroke="var(--prism-primary-main)"
                strokeWidth={1}
                strokeDasharray="3 3"
                strokeOpacity={0.75}
                pointerEvents="none"
              />

              {geometry.plotted.map((candle) => {
                const isActive = activeCandle.index === candle.index;
                const volLabel =
                  candle.volume !== undefined ? `, volume ${formatVolume(candle.volume)}` : '';
                const ariaSummary = `${candle.label}: open ${formatPrice(candle.open, currencyPrefix)}, high ${formatPrice(candle.high, currencyPrefix)}, low ${formatPrice(candle.low, currencyPrefix)}, close ${formatPrice(candle.close, currencyPrefix)}, change ${formatSignedPct(candle.deltaPct)}${volLabel}`;

                return (
                  <g
                    key={candle.key}
                    ref={(node) => {
                      if (node) {
                        hitRefs.current.set(candle.key, node);
                      } else {
                        hitRefs.current.delete(candle.key);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    aria-label={ariaSummary}
                    data-testid={`candle-hit-${candle.id}`}
                    data-candle-id={candle.id}
                    data-direction={candle.isBullish ? 'bullish' : 'bearish'}
                    data-active={isActive ? 'true' : 'false'}
                    className="prism-focus-ring cursor-pointer"
                    onClick={() => selectCandleAt(candle.index)}
                    onKeyDown={handleCandleKeyDown(candle)}
                  >
                    <rect
                      data-role="candle-hit-zone"
                      x={candle.hitX}
                      y={PRICE_TOP}
                      width={candle.hitWidth}
                      height={hitAreaHeight}
                      rx={3}
                      fill={isActive ? 'var(--prism-primary-main)' : 'var(--prism-bg-start)'}
                      fillOpacity={isActive ? 0.08 : 0}
                    />

                    <line
                      data-role="candle-wick"
                      x1={candle.cx}
                      y1={candle.yHigh}
                      x2={candle.cx}
                      y2={candle.yLow}
                      stroke={candle.toneToken}
                      strokeWidth={activeMode === 'ohlc' ? 1.75 : 1.5}
                      strokeLinecap="round"
                    />

                    {activeMode === 'candlestick' ? (
                      <rect
                        data-role="candle-body"
                        data-fill-variant={candle.isBullish ? 'hollow' : 'filled'}
                        x={candle.bodyX}
                        y={candle.bodyY}
                        width={candle.bodyWidth}
                        height={candle.bodyHeight}
                        rx={1.5}
                        fill={candle.toneToken}
                        fillOpacity={candle.isBullish ? (isActive ? 0.32 : 0.18) : isActive ? 1 : 0.88}
                        stroke={candle.toneToken}
                        strokeWidth={1.5}
                      />
                    ) : (
                      <>
                        <line
                          data-role="ohlc-open-tick"
                          x1={roundTwo(candle.cx - candle.tickHalfWidth)}
                          y1={candle.yOpen}
                          x2={candle.cx}
                          y2={candle.yOpen}
                          stroke={candle.toneToken}
                          strokeWidth={1.75}
                          strokeLinecap="round"
                        />
                        <line
                          data-role="ohlc-close-tick"
                          x1={candle.cx}
                          y1={candle.yClose}
                          x2={roundTwo(candle.cx + candle.tickHalfWidth)}
                          y2={candle.yClose}
                          stroke={candle.toneToken}
                          strokeWidth={1.75}
                          strokeLinecap="round"
                        />
                      </>
                    )}

                    {geometry.hasVolumeBars && candle.volHeight > 0 ? (
                      <rect
                        data-role="volume-bar"
                        x={candle.bodyX}
                        y={candle.volY}
                        width={candle.bodyWidth}
                        height={candle.volHeight}
                        rx={1.5}
                        fill={candle.toneToken}
                        fillOpacity={isActive ? 0.55 : 0.28}
                      />
                    ) : null}

                    {candle.showAxisLabel ? (
                      <text
                        data-role="session-axis-label"
                        x={candle.cx}
                        y={X_AXIS_LABEL_Y}
                        textAnchor="middle"
                        fill={
                          isActive
                            ? 'var(--prism-text-primary)'
                            : 'var(--prism-text-secondary)'
                        }
                        pointerEvents="none"
                        className="text-[8.5px] font-mono tabular-nums"
                      >
                        {candle.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            data-testid="candlestick-inspector"
            aria-live="polite"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs tabular-nums min-w-0 max-w-full'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <span className="inline-flex items-center gap-1.5 font-semibold min-w-0">
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: activeCandle.toneToken }}
              />
              <span data-testid="inspector-session">{activeCandle.label}</span>
            </span>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] min-w-0">
              <span data-testid="inspector-open">
                <span style={STYLE_TEXT_SECONDARY}>O </span>
                {formatPrice(activeCandle.open, currencyPrefix)}
              </span>
              <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                ·
              </span>
              <span data-testid="inspector-high">
                <span style={STYLE_TEXT_SECONDARY}>H </span>
                {formatPrice(activeCandle.high, currencyPrefix)}
              </span>
              <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                ·
              </span>
              <span data-testid="inspector-low">
                <span style={STYLE_TEXT_SECONDARY}>L </span>
                {formatPrice(activeCandle.low, currencyPrefix)}
              </span>
              <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                ·
              </span>
              <span data-testid="inspector-close">
                <span style={STYLE_TEXT_SECONDARY}>C </span>
                {formatPrice(activeCandle.close, currencyPrefix)}
              </span>
              <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                ·
              </span>
              <span
                data-testid="inspector-delta"
                className="font-semibold"
                style={{ color: activeCandle.toneToken }}
              >
                {`Δ ${formatSignedPct(activeCandle.deltaPct)}`}
              </span>
              <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                ·
              </span>
              <span data-testid="inspector-volume">
                <span style={STYLE_TEXT_SECONDARY}>Vol </span>
                {formatVolume(activeCandle.volume)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const CandlestickOhlcChart = memo(CandlestickOhlcChartInner);
CandlestickOhlcChart.displayName = 'CandlestickOhlcChart';
