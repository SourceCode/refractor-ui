'use client';

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Activity } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_ERROR, STYLE_BG_SUCCESS, STYLE_ERROR_MAIN, STYLE_PRIMARY_MAIN, STYLE_SUCCESS_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type OrderBookSide = 'bid' | 'ask';

export interface OrderBookLevel {
  /** Limit order price level (finite, non-negative). */
  price: number;
  /** Aggregated resting order volume at this price level (finite, > 0). */
  size: number;
}

export interface OrderBookCumulativeLevel {
  /** Market side of this depth wall ('bid' for buyers, 'ask' for sellers). */
  side: OrderBookSide;
  /** Price level in quote currency. */
  price: number;
  /** Resting order size at this discrete price level. */
  size: number;
  /** Running cumulative volume from mid-price outward through this price level. */
  cumulative: number;
}

export interface OrderBookDepthChartProps extends BaseProps<HTMLDivElement> {
  /** Buy order levels; automatically sorted descending from mid-price (defaults to 8 realistic levels when omitted). */
  bids?: ReadonlyArray<OrderBookLevel>;
  /** Sell order levels; automatically sorted ascending from mid-price (defaults to 8 realistic levels when omitted). */
  asks?: ReadonlyArray<OrderBookLevel>;
  /** Trading pair or market instrument symbol badge (defaults to 'RFR / USD'). */
  symbol?: string;
  /** Quote currency prefix prepended to formatted prices and spreads (defaults to '$'). */
  currencyPrefix?: string;
  /** Callback fired when a user clicks or activates any bid/ask depth marker via keyboard. */
  onSelectLevel?: (level: OrderBookCumulativeLevel) => void;
  /** Visible heading displayed in the sculpted optical card header (defaults to 'Order Book Market Depth'). */
  title?: string;
}

interface PlottedDepthPoint {
  key: string;
  level: OrderBookCumulativeLevel;
  sideIndex: number;
  x: number;
  y: number;
}

interface StepPaths {
  strokePath: string;
  areaPath: string;
}

interface VolumeTick {
  key: string;
  y: number;
  label: string;
}

interface ComputedDepthGeometry {
  bidCount: number;
  askCount: number;
  midPrice: number;
  spread: number | null;
  spreadPct: number | null;
  totalBidDepth: number;
  totalAskDepth: number;
  bidSharePct: number;
  askSharePct: number;
  imbalancePct: number;
  bidPaths: StepPaths | null;
  askPaths: StepPaths | null;
  orderedMarkers: PlottedDepthPoint[];
  defaultMarker: PlottedDepthPoint | null;
  volumeTicks: VolumeTick[];
  lowestBidPrice: number | null;
  highestAskPrice: number | null;
}

const SVG_WIDTH = 460;
const SVG_HEIGHT = 200;
const PAD_LEFT = 46;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PLOT_X0 = PAD_LEFT;
const PLOT_X1 = SVG_WIDTH - PAD_RIGHT;
const PLOT_WIDTH = PLOT_X1 - PLOT_X0;
const HALF_PLOT_WIDTH = PLOT_WIDTH / 2;
const MID_X = PLOT_X0 + HALF_PLOT_WIDTH;
const PLOT_Y0 = PAD_TOP;
const PLOT_Y1 = SVG_HEIGHT - PAD_BOTTOM;
const PLOT_HEIGHT = PLOT_Y1 - PLOT_Y0;
const OUTER_SPAN_PADDING = 1.08;
const VOLUME_TICK_FRACTIONS: ReadonlyArray<number> = [0, 1 / 3, 2 / 3, 1];

export const DEFAULT_ORDER_BOOK_BIDS: ReadonlyArray<OrderBookLevel> = [
  { price: 499.8, size: 12.4 },
  { price: 499.5, size: 18.6 },
  { price: 499.1, size: 24.0 },
  { price: 498.6, size: 31.5 },
  { price: 498.0, size: 28.2 },
  { price: 497.4, size: 42.8 },
  { price: 496.8, size: 36.5 },
  { price: 496.0, size: 54.0 },
];

export const DEFAULT_ORDER_BOOK_ASKS: ReadonlyArray<OrderBookLevel> = [
  { price: 500.2, size: 10.8 },
  { price: 500.5, size: 15.2 },
  { price: 500.9, size: 21.0 },
  { price: 501.4, size: 25.5 },
  { price: 502.0, size: 30.5 },
  { price: 502.6, size: 35.0 },
  { price: 503.2, size: 41.0 },
  { price: 504.0, size: 45.0 },
];

function roundClean(value: number): number {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return rounded === 0 ? 0 : rounded;
}

function formatPrice(value: number, currencyPrefix: string): string {
  const safe = roundClean(value);
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  const fractionDigits = abs > 0 && abs < 0.01 ? 4 : 2;
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${sign}${currencyPrefix}${formatted}`;
}

function formatSize(value: number): string {
  const safe = roundClean(value);
  const abs = Math.abs(safe);
  const maxFractionDigits = abs > 0 && abs < 0.01 ? 4 : 2;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

function formatSpreadPct(value: number): string {
  return `${roundClean(value).toFixed(2)}%`;
}

function formatImbalancePct(value: number): string {
  const safe = roundClean(value);
  const sign = safe > 0 ? '+' : '';
  return `${sign}${safe.toFixed(1)}%`;
}

function getSideColor(side: OrderBookSide): string {
  return side === 'bid' ? 'var(--prism-success-main)' : 'var(--prism-error-main)';
}

function getSideLabel(side: OrderBookSide): string {
  return side === 'bid' ? 'Bid' : 'Ask';
}

function computeCumulativeSide(
  rawLevels: ReadonlyArray<OrderBookLevel>,
  side: OrderBookSide
): OrderBookCumulativeLevel[] {
  const aggregated = new Map<number, number>();
  for (const level of rawLevels) {
    if (
      !Number.isFinite(level.price) ||
      !Number.isFinite(level.size) ||
      level.price < 0 ||
      level.size <= 0
    ) {
      continue;
    }
    const cleanPrice = roundClean(level.price);
    const cleanSize = roundClean(level.size);
    const prev = aggregated.get(cleanPrice) ?? 0;
    aggregated.set(cleanPrice, roundClean(prev + cleanSize));
  }

  const sortedEntries = Array.from(aggregated.entries()).sort(([priceA], [priceB]) =>
    side === 'bid' ? priceB - priceA : priceA - priceB
  );

  let runningCumulative = 0;
  return sortedEntries.map(([price, size]) => {
    runningCumulative = roundClean(runningCumulative + size);
    return {
      side,
      price,
      size,
      cumulative: runningCumulative,
    };
  });
}

function buildStepPaths(
  points: ReadonlyArray<PlottedDepthPoint>,
  outerEdgeX: number
): StepPaths | null {
  const first = points[0];
  if (!first) {
    return null;
  }

  const strokeParts: string[] = [
    `M ${first.x.toFixed(2)},${PLOT_Y1.toFixed(2)}`,
    `L ${first.x.toFixed(2)},${first.y.toFixed(2)}`,
  ];

  let prevY = first.y;
  for (let i = 1; i < points.length; i += 1) {
    const pt = points[i]!;
    strokeParts.push(`L ${pt.x.toFixed(2)},${prevY.toFixed(2)}`);
    strokeParts.push(`L ${pt.x.toFixed(2)},${pt.y.toFixed(2)}`);
    prevY = pt.y;
  }

  strokeParts.push(`L ${outerEdgeX.toFixed(2)},${prevY.toFixed(2)}`);

  const strokePath = strokeParts.join(' ');
  const areaPath = `${strokePath} L ${outerEdgeX.toFixed(2)},${PLOT_Y1.toFixed(2)} Z`;

  return { strokePath, areaPath };
}

const headerClass = /*#__PURE__*/ stableClassName('order-book-depth-chart', 'header');
const canvasClass = /*#__PURE__*/ stableClassName('order-book-depth-chart', 'canvas');
const svgClass = /*#__PURE__*/ stableClassName('order-book-depth-chart', 'svg');
const summaryClass = /*#__PURE__*/ stableClassName('order-book-depth-chart', 'summary');
const inspectorClass = /*#__PURE__*/ stableClassName('order-book-depth-chart', 'inspector');
const emptyClass = /*#__PURE__*/ stableClassName('order-book-depth-chart', 'empty');

function OrderBookDepthChartInner({
  bids = DEFAULT_ORDER_BOOK_BIDS,
  asks = DEFAULT_ORDER_BOOK_ASKS,
  symbol = 'RFR / USD',
  currencyPrefix = '$',
  onSelectLevel,
  title = 'Order Book Market Depth',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: OrderBookDepthChartProps) {
  const override = useComponentOverride('OrderBookDepthChart');
  const headingId = useId();
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');
  const bidGradId = `ob-bid-grad-${uid}`;
  const askGradId = `ob-ask-grad-${uid}`;

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const markerNodesRef = useRef<Map<string, SVGGElement>>(new Map());

  const setMarkerNode = useCallback((key: string, node: SVGGElement | null) => {
    if (node) {
      markerNodesRef.current.set(key, node);
    } else {
      markerNodesRef.current.delete(key);
    }
  }, []);

  const geometry = useMemo<ComputedDepthGeometry>(() => {
    const cumulativeBids = computeCumulativeSide(bids, 'bid');
    const cumulativeAsks = computeCumulativeSide(asks, 'ask');

    if (cumulativeBids.length === 0 && cumulativeAsks.length === 0) {
      return {
        bidCount: 0,
        askCount: 0,
        midPrice: 0,
        spread: null,
        spreadPct: null,
        totalBidDepth: 0,
        totalAskDepth: 0,
        bidSharePct: 50,
        askSharePct: 50,
        imbalancePct: 0,
        bidPaths: null,
        askPaths: null,
        orderedMarkers: [],
        defaultMarker: null,
        volumeTicks: [],
        lowestBidPrice: null,
        highestAskPrice: null,
      };
    }

    const bestBid = cumulativeBids[0]?.price ?? null;
    const bestAsk = cumulativeAsks[0]?.price ?? null;
    const lowestBidPrice =
      cumulativeBids.length > 0 ? cumulativeBids[cumulativeBids.length - 1]!.price : null;
    const highestAskPrice =
      cumulativeAsks.length > 0 ? cumulativeAsks[cumulativeAsks.length - 1]!.price : null;

    let midPrice: number;
    let spread: number | null;
    let spreadPct: number | null;

    if (bestBid !== null && bestAsk !== null) {
      midPrice = roundClean((bestBid + bestAsk) / 2);
      spread = roundClean(bestAsk - bestBid);
      spreadPct = midPrice > 0 ? roundClean((spread / midPrice) * 100) : 0;
    } else if (bestBid !== null) {
      midPrice = bestBid;
      spread = null;
      spreadPct = null;
    } else {
      midPrice = bestAsk!;
      spread = null;
      spreadPct = null;
    }

    const totalBidDepth =
      cumulativeBids.length > 0 ? cumulativeBids[cumulativeBids.length - 1]!.cumulative : 0;
    const totalAskDepth =
      cumulativeAsks.length > 0 ? cumulativeAsks[cumulativeAsks.length - 1]!.cumulative : 0;
    const combinedDepth = totalBidDepth + totalAskDepth;
    const bidSharePct = roundClean((totalBidDepth / combinedDepth) * 100);
    const askSharePct = roundClean((totalAskDepth / combinedDepth) * 100);
    const imbalancePct = roundClean(((totalBidDepth - totalAskDepth) / combinedDepth) * 100);
    const maxCumulative = Math.max(totalBidDepth, totalAskDepth);

    const bidSpan = lowestBidPrice !== null ? Math.max(0, midPrice - lowestBidPrice) : 0;
    const askSpan = highestAskPrice !== null ? Math.max(0, highestAskPrice - midPrice) : 0;
    const maxHalfSpan = Math.max(bidSpan, askSpan);
    const domainHalfSpan = maxHalfSpan > 0 ? maxHalfSpan * OUTER_SPAN_PADDING : 0;

    const mapY = (cumulative: number): number =>
      roundClean(PLOT_Y1 - (cumulative / maxCumulative) * PLOT_HEIGHT);

    const bidPoints: PlottedDepthPoint[] = cumulativeBids.map((level, sideIndex) => {
      const x =
        domainHalfSpan > 0
          ? roundClean(
              MID_X -
                clampNumber((midPrice - level.price) / domainHalfSpan, 0, 1, 0) * HALF_PLOT_WIDTH
            )
          : roundClean(MID_X - HALF_PLOT_WIDTH * 0.5);
      return {
        key: `bid-${level.price}`,
        level,
        sideIndex,
        x,
        y: mapY(level.cumulative),
      };
    });

    const askPoints: PlottedDepthPoint[] = cumulativeAsks.map((level, sideIndex) => {
      const x =
        domainHalfSpan > 0
          ? roundClean(
              MID_X +
                clampNumber((level.price - midPrice) / domainHalfSpan, 0, 1, 0) * HALF_PLOT_WIDTH
            )
          : roundClean(MID_X + HALF_PLOT_WIDTH * 0.5);
      return {
        key: `ask-${level.price}`,
        level,
        sideIndex,
        x,
        y: mapY(level.cumulative),
      };
    });

    const bidPaths = buildStepPaths(bidPoints, PLOT_X0);
    const askPaths = buildStepPaths(askPoints, PLOT_X1);
    const orderedMarkers = [...bidPoints].reverse().concat(askPoints);
    const defaultMarker = bidPoints[0] ?? askPoints[0]!;

    const volumeTicks: VolumeTick[] = VOLUME_TICK_FRACTIONS.map((fraction, idx) => {
      const y = roundClean(PLOT_Y1 - fraction * PLOT_HEIGHT);
      const val = roundClean(maxCumulative * fraction);
      return {
        key: `vol-tick-${idx}`,
        y,
        label: formatSize(val),
      };
    });

    return {
      bidCount: cumulativeBids.length,
      askCount: cumulativeAsks.length,
      midPrice,
      spread,
      spreadPct,
      totalBidDepth,
      totalAskDepth,
      bidSharePct,
      askSharePct,
      imbalancePct,
      bidPaths,
      askPaths,
      orderedMarkers,
      defaultMarker,
      volumeTicks,
      lowestBidPrice,
      highestAskPrice,
    };
  }, [bids, asks]);

  const activeMarker = useMemo<PlottedDepthPoint | null>(() => {
    if (!geometry.defaultMarker) {
      return null;
    }
    if (selectedKey) {
      const found = geometry.orderedMarkers.find((marker) => marker.key === selectedKey);
      if (found) {
        return found;
      }
    }
    return geometry.defaultMarker;
  }, [geometry.defaultMarker, geometry.orderedMarkers, selectedKey]);

  const isEmpty = activeMarker === null;

  const selectMarker = useCallback(
    (marker: PlottedDepthPoint, shouldFocus = false) => {
      setSelectedKey(marker.key);
      onSelectLevel?.(marker.level);
      if (shouldFocus) {
        markerNodesRef.current.get(marker.key)?.focus();
      }
    },
    [onSelectLevel]
  );

  const handleMarkerKeyDown = useCallback(
    (marker: PlottedDepthPoint, orderedIndex: number) =>
      (event: ReactKeyboardEvent<SVGGElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectMarker(marker);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          if (orderedIndex > 0) {
            selectMarker(geometry.orderedMarkers[orderedIndex - 1]!, true);
          }
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          if (orderedIndex < geometry.orderedMarkers.length - 1) {
            selectMarker(geometry.orderedMarkers[orderedIndex + 1]!, true);
          }
        } else if (event.key === 'Home') {
          event.preventDefault();
          selectMarker(geometry.orderedMarkers[0]!, true);
        } else if (event.key === 'End') {
          event.preventDefault();
          selectMarker(geometry.orderedMarkers[geometry.orderedMarkers.length - 1]!, true);
        }
      },
    [geometry.orderedMarkers, selectMarker]
  );

  const imbalanceColor =
    geometry.imbalancePct > 0.05
      ? 'var(--prism-success-main)'
      : geometry.imbalancePct < -0.05
        ? 'var(--prism-error-main)'
        : 'var(--prism-text-secondary)';

  const imbalanceBiasLabel =
    geometry.imbalancePct > 0.05
      ? 'Bid Heavy'
      : geometry.imbalancePct < -0.05
        ? 'Ask Heavy'
        : 'Balanced';

  const merged = mergeProps({
    themeTarget: themeProps('order-book-depth-chart', {
      empty: isEmpty,
      hasBids: geometry.bidCount > 0,
      hasAsks: geometry.askCount > 0,
      selectedSide: activeMarker?.level.side,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 space-y-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Activity className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>
          <span
            data-testid="order-book-symbol"
            className="prism-crystal px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-wide whitespace-nowrap"
            style={STYLE_TEXT_PRIMARY}
          >
            {symbol}
          </span>
        </div>

        {!isEmpty ? (
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              data-testid="order-book-mid-price"
              className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs tabular-nums whitespace-nowrap"
            >
              <span className="font-medium" style={STYLE_TEXT_SECONDARY}>
                Mid-Price
              </span>
              <span
                className="font-mono font-semibold"
                style={STYLE_TEXT_PRIMARY}
              >
                {formatPrice(geometry.midPrice, currencyPrefix)}
              </span>
            </span>

            <span
              data-testid="order-book-spread"
              className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs tabular-nums whitespace-nowrap"
            >
              <span className="font-medium" style={STYLE_TEXT_SECONDARY}>
                Spread
              </span>
              <span
                className="font-mono font-semibold"
                style={{
                  color:
                    geometry.spread !== null
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                }}
              >
                {geometry.spread !== null && geometry.spreadPct !== null
                  ? `${formatPrice(geometry.spread, currencyPrefix)} · ${formatSpreadPct(geometry.spreadPct)}`
                  : '—'}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {!activeMarker ? (
        <div
          role="status"
          data-testid="order-book-empty"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl px-4 py-8 text-center space-y-1 min-w-0'
          )}
        >
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            No order book depth available
          </p>
          <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
            Provide bid or ask levels to visualize cumulative market liquidity.
          </p>
        </div>
      ) : (
        <>
          <div className={cx(canvasClass, 'prism-well rounded-2xl p-3 space-y-2 min-w-0')}>
            <div
              aria-label="Order book depth legend"
              className="flex flex-wrap items-center justify-between gap-2 text-[11px] min-w-0"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex items-center gap-1.5 font-medium"
                  style={STYLE_TEXT_PRIMARY}
                >
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={STYLE_BG_SUCCESS}
                  />
                  <span>{`Bids (${geometry.bidCount})`}</span>
                </span>
                <span
                  className="inline-flex items-center gap-1.5 font-medium"
                  style={STYLE_TEXT_PRIMARY}
                >
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={STYLE_BG_ERROR}
                  />
                  <span>{`Asks (${geometry.askCount})`}</span>
                </span>
              </div>
              <span
                className="font-mono tabular-nums"
                style={STYLE_TEXT_SECONDARY}
              >
                Cumulative Depth
              </span>
            </div>

            <svg
              role="img"
              aria-label={`${title} for ${symbol}: ${geometry.bidCount} bid levels and ${geometry.askCount} ask levels around mid-price ${formatPrice(geometry.midPrice, currencyPrefix)}`}
              data-testid="order-book-depth-svg"
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none block overflow-visible', 'prism-contain-leaf')}
            >
              <defs>
                <linearGradient id={bidGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--prism-success-main)" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="var(--prism-success-main)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id={askGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--prism-error-main)" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="var(--prism-error-main)" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <rect
                x={PLOT_X0}
                y={PLOT_Y0}
                width={PLOT_WIDTH}
                height={PLOT_HEIGHT}
                rx={6}
                fill="var(--prism-bg-start)"
                fillOpacity={0.22}
                stroke="var(--prism-divider)"
                strokeWidth={1}
              />

              {geometry.volumeTicks.map((tick) => (
                <g key={tick.key} aria-hidden="true">
                  <line
                    x1={PLOT_X0}
                    y1={tick.y}
                    x2={PLOT_X1}
                    y2={tick.y}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={PLOT_X0 - 6}
                    y={tick.y + 3}
                    textAnchor="end"
                    fontSize={9}
                    fill="var(--prism-text-secondary)"
                    className="font-mono tabular-nums"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              <line
                data-testid="order-book-mid-axis"
                x1={MID_X}
                y1={PLOT_Y0}
                x2={MID_X}
                y2={PLOT_Y1}
                stroke="var(--prism-text-secondary)"
                strokeWidth={1.25}
                strokeDasharray="4 3"
                strokeOpacity={0.75}
              />

              {geometry.bidPaths ? (
                <g data-testid="order-book-bid-layer">
                  <path
                    data-testid="order-book-bid-area"
                    d={geometry.bidPaths.areaPath}
                    fill={`url(#${bidGradId})`}
                  />
                  <path
                    data-testid="order-book-bid-curve"
                    d={geometry.bidPaths.strokePath}
                    fill="none"
                    stroke="var(--prism-success-main)"
                    strokeWidth={2}
                    strokeLinejoin="miter"
                  />
                </g>
              ) : null}

              {geometry.askPaths ? (
                <g data-testid="order-book-ask-layer">
                  <path
                    data-testid="order-book-ask-area"
                    d={geometry.askPaths.areaPath}
                    fill={`url(#${askGradId})`}
                  />
                  <path
                    data-testid="order-book-ask-curve"
                    d={geometry.askPaths.strokePath}
                    fill="none"
                    stroke="var(--prism-error-main)"
                    strokeWidth={2}
                    strokeLinejoin="miter"
                  />
                </g>
              ) : null}

              <g data-testid="order-book-active-crosshair" aria-hidden="true">
                <line
                  x1={activeMarker.x}
                  y1={PLOT_Y0}
                  x2={activeMarker.x}
                  y2={PLOT_Y1}
                  stroke={getSideColor(activeMarker.level.side)}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  strokeOpacity={0.7}
                />
                <line
                  x1={PLOT_X0}
                  y1={activeMarker.y}
                  x2={PLOT_X1}
                  y2={activeMarker.y}
                  stroke={getSideColor(activeMarker.level.side)}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  strokeOpacity={0.45}
                />
              </g>

              {geometry.orderedMarkers.map((marker, orderedIndex) => {
                const isSelected = activeMarker.key === marker.key;
                const sideColor = getSideColor(marker.level.side);
                const sideLabel = getSideLabel(marker.level.side);

                return (
                  <g
                    key={marker.key}
                    ref={(node) => setMarkerNode(marker.key, node)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${sideLabel} level at ${formatPrice(marker.level.price, currencyPrefix)}, size ${formatSize(marker.level.size)}, cumulative wall ${formatSize(marker.level.cumulative)}`}
                    data-testid={`order-book-marker-${marker.level.side}-${marker.sideIndex}`}
                    data-side={marker.level.side}
                    data-price={String(marker.level.price)}
                    data-selected={isSelected ? 'true' : 'false'}
                    className="prism-focus-ring cursor-pointer outline-none"
                    onClick={() => selectMarker(marker)}
                    onKeyDown={handleMarkerKeyDown(marker, orderedIndex)}
                  >
                    <circle cx={marker.x} cy={marker.y} r={11} fill="transparent" />
                    {isSelected ? (
                      <circle
                        cx={marker.x}
                        cy={marker.y}
                        r={7.5}
                        fill="none"
                        stroke={sideColor}
                        strokeWidth={1.5}
                        strokeOpacity={0.45}
                      />
                    ) : null}
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r={isSelected ? 4.5 : 3.25}
                      fill={isSelected ? 'var(--prism-primary-contrast)' : sideColor}
                      stroke={sideColor}
                      strokeWidth={isSelected ? 2 : 1.25}
                    />
                  </g>
                );
              })}

              {geometry.lowestBidPrice !== null ? (
                <text
                  x={PLOT_X0}
                  y={PLOT_Y1 + 16}
                  textAnchor="start"
                  fontSize={9}
                  fill="var(--prism-text-secondary)"
                  className="font-mono tabular-nums"
                >
                  {formatPrice(geometry.lowestBidPrice, currencyPrefix)}
                </text>
              ) : null}

              <text
                x={MID_X}
                y={PLOT_Y1 + 16}
                textAnchor="middle"
                fontSize={9.5}
                fill="var(--prism-text-primary)"
                className="font-mono font-semibold tabular-nums"
              >
                {formatPrice(geometry.midPrice, currencyPrefix)}
              </text>

              {geometry.highestAskPrice !== null ? (
                <text
                  x={PLOT_X1}
                  y={PLOT_Y1 + 16}
                  textAnchor="end"
                  fontSize={9}
                  fill="var(--prism-text-secondary)"
                  className="font-mono tabular-nums"
                >
                  {formatPrice(geometry.highestAskPrice, currencyPrefix)}
                </text>
              ) : null}
            </svg>
          </div>

          <div
            data-testid="order-book-summary"
            className={cx(summaryClass, 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-0')}
          >
            <div className="prism-crystal rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium"
                style={STYLE_TEXT_SECONDARY}
              >
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0"
                  style={STYLE_BG_SUCCESS}
                />
                <span>Total Bid Depth</span>
              </span>
              <span
                data-testid="order-book-total-bid"
                className="font-mono text-xs font-semibold tabular-nums"
                style={STYLE_SUCCESS_MAIN}
              >
                {formatSize(geometry.totalBidDepth)}
              </span>
            </div>

            <div className="prism-crystal rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium"
                style={STYLE_TEXT_SECONDARY}
              >
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0"
                  style={STYLE_BG_ERROR}
                />
                <span>Total Ask Depth</span>
              </span>
              <span
                data-testid="order-book-total-ask"
                className="font-mono text-xs font-semibold tabular-nums"
                style={STYLE_ERROR_MAIN}
              >
                {formatSize(geometry.totalAskDepth)}
              </span>
            </div>

            <div className="sm:col-span-2 prism-crystal rounded-xl px-3 py-2 space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs min-w-0">
                <span className="font-medium" style={STYLE_TEXT_SECONDARY}>
                  Imbalance %
                </span>
                <span
                  data-testid="order-book-imbalance"
                  className="font-mono font-semibold tabular-nums"
                  style={{ color: imbalanceColor }}
                >
                  {`${formatImbalancePct(geometry.imbalancePct)} · ${imbalanceBiasLabel}`}
                </span>
              </div>
              <div
                aria-hidden="true"
                className="prism-well h-1.5 w-full rounded-full overflow-hidden flex"
              >
                <span
                  style={{
                    width: `${geometry.bidSharePct}%`,
                    backgroundColor: 'var(--prism-success-main)',
                  }}
                />
                <span
                  style={{
                    width: `${geometry.askSharePct}%`,
                    backgroundColor: 'var(--prism-error-main)',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            aria-live="polite"
            data-testid="order-book-inspector"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs tabular-nums min-w-0'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <span
              data-testid="order-book-inspector-side"
              className="inline-flex items-center gap-1.5 font-semibold"
              style={{ color: getSideColor(activeMarker.level.side) }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getSideColor(activeMarker.level.side) }}
              />
              <span>{getSideLabel(activeMarker.level.side)}</span>
            </span>
            <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
              ·
            </span>
            <span data-testid="order-book-inspector-price" className="inline-flex items-center gap-1">
              <span style={STYLE_TEXT_SECONDARY}>Price</span>
              <span className="font-mono font-semibold">
                {formatPrice(activeMarker.level.price, currencyPrefix)}
              </span>
            </span>
            <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
              ·
            </span>
            <span data-testid="order-book-inspector-size" className="inline-flex items-center gap-1">
              <span style={STYLE_TEXT_SECONDARY}>Level Size</span>
              <span className="font-mono font-semibold">
                {formatSize(activeMarker.level.size)}
              </span>
            </span>
            <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
              ·
            </span>
            <span
              data-testid="order-book-inspector-cumulative"
              className="inline-flex items-center gap-1"
            >
              <span style={STYLE_TEXT_SECONDARY}>Cumulative Wall</span>
              <span
                className="font-mono font-semibold"
                style={{ color: getSideColor(activeMarker.level.side) }}
              >
                {formatSize(activeMarker.level.cumulative)}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export const OrderBookDepthChart = /*#__PURE__*/ memoWithDisplayName(OrderBookDepthChartInner, 'OrderBookDepthChart');
