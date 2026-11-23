'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type WaterfallStepKind = 'start' | 'increase' | 'decrease' | 'total';

export interface WaterfallStep {
  /** Stable unique identifier for this waterfall step. */
  id: string;
  /** Human-readable category or line-item label plotted along the X-axis. */
  label: string;
  /** Numeric contribution or anchor value (non-finite values are sanitized to 0). */
  value: number;
  /** Semantic step kind; inferred as 'increase' (>= 0) or 'decrease' (< 0) when omitted. */
  kind?: WaterfallStepKind;
}

export interface WaterfallChartProps extends BaseProps<HTMLDivElement> {
  /** Ordered sequence of financial or metric bridge steps. */
  steps: WaterfallStep[];
  /** Chart card heading (defaults to 'P&L Waterfall'). */
  title?: string;
  /** SVG chart viewport height in pixels (defaults to 240, clamped to 160..480). */
  height?: number;
  /** Currency or unit prefix prepended to formatted values (defaults to '$'). */
  valuePrefix?: string;
  /** Unit suffix appended to formatted values such as 'k' or 'M' (defaults to ''). */
  valueSuffix?: string;
  /** Callback fired when a user clicks or activates any step bar via keyboard. */
  onSelectStep?: (step: WaterfallStep, runningTotal: number) => void;
}

interface TrajectoryItem {
  index: number;
  step: WaterfallStep;
  kind: WaterfallStepKind;
  startVal: number;
  endVal: number;
  delta: number;
  runningTotal: number;
}

interface ComputedWaterfallBar {
  key: string;
  index: number;
  step: WaterfallStep;
  kind: WaterfallStepKind;
  color: string;
  startVal: number;
  endVal: number;
  delta: number;
  runningTotal: number;
  x: number;
  y: number;
  cx: number;
  width: number;
  height: number;
  yEnd: number;
  valueLabel: string;
  valueLabelY: number;
}

interface ConnectorLine {
  key: string;
  x1: number;
  x2: number;
  y: number;
}

interface AxisTick {
  key: string;
  y: number;
  label: string;
  isZero: boolean;
}

const SVG_WIDTH = 580;
const PAD_TOP = 26;
const PAD_RIGHT = 20;
const PAD_BOTTOM = 38;
const PAD_LEFT = 64;
const TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];

const KIND_COLOR_MAP: Record<WaterfallStepKind, string> = {
  start: 'var(--prism-secondary-main)',
  increase: 'var(--prism-success-main)',
  decrease: 'var(--prism-error-main)',
  total: 'var(--prism-primary-main)',
};

const KIND_LABEL_MAP: Record<WaterfallStepKind, string> = {
  start: 'Start',
  increase: 'Increase',
  decrease: 'Decrease',
  total: 'Total',
};

const LEGEND_ITEMS: ReadonlyArray<{ kind: WaterfallStepKind; label: string; color: string }> = [
  { kind: 'start', label: KIND_LABEL_MAP.start, color: KIND_COLOR_MAP.start },
  { kind: 'increase', label: KIND_LABEL_MAP.increase, color: KIND_COLOR_MAP.increase },
  { kind: 'decrease', label: KIND_LABEL_MAP.decrease, color: KIND_COLOR_MAP.decrease },
  { kind: 'total', label: KIND_LABEL_MAP.total, color: KIND_COLOR_MAP.total },
];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function sanitizeStepValue(raw: number): number {
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return normalizeZero(raw);
}

function formatNumeric(value: number): string {
  const safe = normalizeZero(value);
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(2)));
}

function formatValue(value: number, prefix: string, suffix: string): string {
  const safe = normalizeZero(value);
  const sign = safe < 0 ? '-' : '';
  return `${sign}${prefix}${formatNumeric(Math.abs(safe))}${suffix}`;
}

function formatSignedDelta(value: number, prefix: string, suffix: string): string {
  const safe = normalizeZero(value);
  if (safe > 0) {
    return `+${prefix}${formatNumeric(safe)}${suffix}`;
  }
  if (safe < 0) {
    return `-${prefix}${formatNumeric(Math.abs(safe))}${suffix}`;
  }
  return `${prefix}0${suffix}`;
}

function WaterfallChartInner({
  steps,
  title = 'P&L Waterfall',
  height = 240,
  valuePrefix = '$',
  valueSuffix = '',
  onSelectStep,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: WaterfallChartProps) {
  const headingId = useId();
  const override = useComponentOverride('WaterfallChart');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const clampedHeight = clampNumber(height, 160, 480, 240);
  const isEmpty = steps.length === 0;

  const handleSelectBar = useCallback(
    (bar: ComputedWaterfallBar) => {
      setSelectedIndex(bar.index);
      onSelectStep?.(bar.step, bar.runningTotal);
    },
    [onSelectStep]
  );

  const handleBarKeyDown = useCallback(
    (bar: ComputedWaterfallBar) => (event: ReactKeyboardEvent<SVGRectElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectBar(bar);
      }
    },
    [handleSelectBar]
  );

  const geometry = useMemo(() => {
    const plotWidth = Math.max(80, SVG_WIDTH - PAD_LEFT - PAD_RIGHT);
    const plotHeight = Math.max(60, clampedHeight - PAD_TOP - PAD_BOTTOM);

    if (steps.length === 0) {
      return {
        plotWidth,
        plotHeight,
        zeroY: PAD_TOP + plotHeight,
        ticks: [] as AxisTick[],
        showZeroTickLabel: false,
        bars: [] as ComputedWaterfallBar[],
        connectors: [] as ConnectorLine[],
        hasNegative: false,
        finalRunningTotal: 0,
      };
    }

    let running = 0;
    let hasPriorDelta = false;
    let rawMin = 0;
    let rawMax = 0;
    let hasNegative = false;
    const trajectory: TrajectoryItem[] = [];

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i]!;
      const cleanVal = sanitizeStepValue(step.value);
      const resolvedKind: WaterfallStepKind =
        step.kind ?? (cleanVal < 0 ? 'decrease' : 'increase');

      let startVal: number;
      let endVal: number;
      let delta: number;

      if (resolvedKind === 'start') {
        startVal = 0;
        endVal = cleanVal;
        delta = cleanVal;
        running = cleanVal;
        hasPriorDelta = true;
      } else if (resolvedKind === 'total') {
        const totalVal = normalizeZero(hasPriorDelta ? running : cleanVal);
        startVal = 0;
        endVal = totalVal;
        delta = totalVal;
        running = totalVal;
        hasPriorDelta = true;
      } else if (resolvedKind === 'decrease') {
        startVal = running;
        delta = normalizeZero(-Math.abs(cleanVal));
        endVal = normalizeZero(running + delta);
        running = endVal;
        hasPriorDelta = true;
      } else {
        startVal = running;
        delta = cleanVal;
        endVal = normalizeZero(running + delta);
        running = endVal;
        hasPriorDelta = true;
      }

      if (endVal < rawMin) rawMin = endVal;
      if (endVal > rawMax) rawMax = endVal;
      if (endVal < 0) hasNegative = true;

      trajectory.push({
        index: i,
        step,
        kind: resolvedKind,
        startVal,
        endVal,
        delta,
        runningTotal: running,
      });
    }

    const domainMin = rawMin === 0 && rawMax === 0 ? 0 : rawMin;
    const domainMax = rawMin === 0 && rawMax === 0 ? 1 : rawMax;
    const domainSpan = domainMax - domainMin;

    const valueToY = (value: number): number => {
      const ratio = (value - domainMin) / domainSpan;
      return PAD_TOP + plotHeight * (1 - ratio);
    };

    const zeroY = valueToY(0);

    const ticks: AxisTick[] = TICK_FRACTIONS.map((frac) => {
      const y = PAD_TOP + plotHeight * (1 - frac);
      const tickVal = normalizeZero(domainMin + domainSpan * frac);
      return {
        key: `wf-tick-${frac}`,
        y,
        label: formatValue(tickVal, valuePrefix, valueSuffix),
        isZero: Math.abs(y - zeroY) < 0.5,
      };
    });

    const showZeroTickLabel = ticks.every((tick) => Math.abs(tick.y - zeroY) > 12);

    const bandWidth = plotWidth / trajectory.length;
    const barWidth = Math.min(54, Math.max(4, Math.min(bandWidth - 2, bandWidth * 0.58)));
    const bars: ComputedWaterfallBar[] = [];

    for (const item of trajectory) {
      const cxPos = PAD_LEFT + item.index * bandWidth + bandWidth / 2;
      const x = cxPos - barWidth / 2;
      const yStart = valueToY(item.startVal);
      const yEnd = valueToY(item.endVal);
      const rawHeight = Math.abs(yEnd - yStart);
      const barHeight = Math.max(2, rawHeight);
      const y =
        rawHeight >= 2
          ? Math.min(yStart, yEnd)
          : clampNumber(
              Math.min(yStart, yEnd) - (2 - rawHeight) / 2,
              PAD_TOP,
              PAD_TOP + plotHeight - 2,
              PAD_TOP
            );

      const valueLabel =
        item.kind === 'start' || item.kind === 'total'
          ? formatValue(item.endVal, valuePrefix, valueSuffix)
          : formatSignedDelta(item.delta, valuePrefix, valueSuffix);

      bars.push({
        key: `wf-step-${item.step.id}-${item.index}`,
        index: item.index,
        step: item.step,
        kind: item.kind,
        color: KIND_COLOR_MAP[item.kind],
        startVal: item.startVal,
        endVal: item.endVal,
        delta: item.delta,
        runningTotal: item.runningTotal,
        x,
        y,
        cx: cxPos,
        width: barWidth,
        height: barHeight,
        yEnd,
        valueLabel,
        valueLabelY: Math.max(12, y - 6),
      });
    }

    const connectors: ConnectorLine[] = [];
    for (let i = 0; i < bars.length - 1; i += 1) {
      const current = bars[i]!;
      const next = bars[i + 1]!;
      connectors.push({
        key: `wf-conn-${current.step.id}-${next.step.id}-${i}`,
        x1: current.x + current.width,
        x2: next.x,
        y: current.yEnd,
      });
    }

    return {
      plotWidth,
      plotHeight,
      zeroY,
      ticks,
      showZeroTickLabel,
      bars,
      connectors,
      hasNegative,
      finalRunningTotal: running,
    };
  }, [steps, clampedHeight, valuePrefix, valueSuffix]);

  const activeBar =
    selectedIndex !== null && selectedIndex < geometry.bars.length
      ? geometry.bars[selectedIndex]!
      : null;

  const merged = mergeProps({
    themeTarget: themeProps('waterfall-chart', {
      empty: isEmpty,
      hasNegative: geometry.hasNegative,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('waterfall-chart', 'header');
  const legendClass = stableClassName('waterfall-chart', 'legend');
  const svgClass = stableClassName('waterfall-chart', 'svg');
  const readoutClass = stableClassName('waterfall-chart', 'readout');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight"
          style={STYLE_TEXT_PRIMARY}
        >
          {title}
        </h4>

        {!isEmpty ? (
          <span
            data-testid="waterfall-net-badge"
            className={cx(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tabular-nums',
              geometry.finalRunningTotal > 0 ? 'prism-emerald' : 'prism-crystal'
            )}
            style={
              geometry.finalRunningTotal > 0
                ? undefined
                : {
                    color:
                      geometry.finalRunningTotal < 0
                        ? 'var(--prism-error-main)'
                        : 'var(--prism-text-primary)',
                  }
            }
          >
            {`Net: ${formatValue(geometry.finalRunningTotal, valuePrefix, valueSuffix)}`}
          </span>
        ) : null}
      </div>

      {!isEmpty ? (
        <div
          aria-label="Waterfall step legend"
          className={cx(legendClass, 'flex flex-wrap items-center gap-2 text-xs')}
        >
          {LEGEND_ITEMS.map((item) => (
            <span
              key={item.kind}
              className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      ) : null}

      {isEmpty ? (
        <div
          role="status"
          data-testid="waterfall-chart-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No waterfall steps to display.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            role="img"
            aria-label={`${title} waterfall chart across ${steps.length} steps`}
            viewBox={`0 0 ${SVG_WIDTH} ${clampedHeight}`}
            style={{ height: `${clampedHeight}px` }}
            className={cx(svgClass, 'w-full block overflow-visible')}
          >
            {geometry.ticks.map((tick) => (
              <g key={tick.key}>
                {!tick.isZero ? (
                  <line
                    x1={PAD_LEFT}
                    y1={tick.y}
                    x2={PAD_LEFT + geometry.plotWidth}
                    y2={tick.y}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                ) : null}
                <text
                  x={PAD_LEFT - 8}
                  y={tick.y + 3.5}
                  textAnchor="end"
                  fill="var(--prism-text-secondary)"
                  className="text-[10px] font-mono tabular-nums"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            <line
              x1={PAD_LEFT}
              y1={geometry.zeroY}
              x2={PAD_LEFT + geometry.plotWidth}
              y2={geometry.zeroY}
              stroke="var(--prism-text-secondary)"
              strokeWidth={1.5}
              data-role="zero-baseline"
            />

            {geometry.showZeroTickLabel ? (
              <text
                x={PAD_LEFT - 8}
                y={geometry.zeroY + 3.5}
                textAnchor="end"
                fill="var(--prism-text-primary)"
                data-role="zero-tick-label"
                className="text-[10px] font-mono font-semibold tabular-nums"
              >
                {formatValue(0, valuePrefix, valueSuffix)}
              </text>
            ) : null}

            {geometry.connectors.map((connector) => (
              <line
                key={connector.key}
                x1={connector.x1}
                y1={connector.y}
                x2={connector.x2}
                y2={connector.y}
                stroke="var(--prism-divider)"
                strokeWidth={1.25}
                strokeDasharray="3 3"
                data-role="waterfall-connector"
              />
            ))}

            {geometry.bars.map((bar) => {
              const isSelected = activeBar !== null && activeBar.index === bar.index;
              const opacity = activeBar === null ? 0.9 : isSelected ? 1 : 0.65;
              return (
                <g key={bar.key}>
                  <rect
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    rx={4}
                    fill={bar.color}
                    fillOpacity={opacity}
                    stroke={isSelected ? 'var(--prism-text-primary)' : 'none'}
                    strokeWidth={isSelected ? 1.5 : 0}
                    role="button"
                    tabIndex={0}
                    aria-label={`${bar.step.label} (${KIND_LABEL_MAP[bar.kind]}): ${formatSignedDelta(bar.delta, valuePrefix, valueSuffix)}, running total ${formatValue(bar.runningTotal, valuePrefix, valueSuffix)}`}
                    data-step-id={bar.step.id}
                    data-step-kind={bar.kind}
                    data-selected={isSelected ? 'true' : 'false'}
                    className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                    onClick={() => handleSelectBar(bar)}
                    onKeyDown={handleBarKeyDown(bar)}
                  />
                  <text
                    x={bar.cx}
                    y={bar.valueLabelY}
                    textAnchor="middle"
                    fill="var(--prism-text-secondary)"
                    pointerEvents="none"
                    className="text-[10px] font-mono tabular-nums"
                  >
                    {bar.valueLabel}
                  </text>
                  <text
                    x={bar.cx}
                    y={PAD_TOP + geometry.plotHeight + 20}
                    textAnchor="middle"
                    fill="var(--prism-text-primary)"
                    className="text-[11px] font-medium"
                  >
                    {bar.step.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {!isEmpty ? (
        <div
          data-testid="waterfall-chart-readout"
          aria-live="polite"
          className={cx(
            readoutClass,
            'prism-well rounded-xl px-3.5 py-2 flex flex-wrap items-center gap-2 text-xs tabular-nums'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          {activeBar ? (
            <>
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeBar.color }}
              />
              <span className="font-semibold">{activeBar.step.label}</span>
              <span
                className="font-mono font-semibold"
                style={{ color: activeBar.color }}
              >
                {formatSignedDelta(activeBar.delta, valuePrefix, valueSuffix)}
              </span>
              <span style={STYLE_TEXT_SECONDARY}>
                {`Running total: ${formatValue(activeBar.runningTotal, valuePrefix, valueSuffix)}`}
              </span>
            </>
          ) : (
            <span style={STYLE_TEXT_SECONDARY}>
              Select any step bar to inspect exact delta and running total.
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const WaterfallChart = memo(WaterfallChartInner);
WaterfallChart.displayName = 'WaterfallChart';
