'use client';

import {
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
import { STYLE_BG_PRIMARY, STYLE_BG_SECONDARY, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface ComboDualAxisChartProps extends BaseProps<HTMLDivElement> {
  /** Ordered X-axis labels shared by the bar volume and line rate series. */
  labels: string[];
  /** Left Y-axis metric label describing the bar series. */
  barLabel: string;
  /** Numeric bar series values (non-finite or negative entries clamped to 0). */
  barValues: number[];
  /** Optional unit suffix for bar axis ticks and correlation readout (defaults to ''). */
  barUnit?: string;
  /** Right Y-axis metric label describing the overlaid line series. */
  lineLabel: string;
  /** Numeric line series values (finite numbers preserved, non-finite defaulted to 0). */
  lineValues: number[];
  /** Optional unit suffix for line axis ticks and correlation readout (defaults to '%'). */
  lineUnit?: string;
  /** Chart card heading (defaults to 'Volume vs. Rate'). */
  title?: string;
  /** Chart SVG viewport height in pixels (defaults to 240, clamped to 140..520). */
  height?: number;
  /** Callback fired with the selected X-axis index when any bar or marker is activated. */
  onSelectIndex?: (index: number) => void;
}

interface ComboPoint {
  key: string;
  index: number;
  label: string;
  barVal: number;
  lineVal: number;
  cx: number;
  barX: number;
  barY: number;
  barWidth: number;
  barHeight: number;
  lineY: number;
}

interface DualAxisTick {
  key: string;
  y: number;
  leftText: string;
  rightText: string;
  isBaseline: boolean;
}

const SVG_WIDTH = 580;
const PAD_TOP = 24;
const PAD_RIGHT = 64;
const PAD_BOTTOM = 34;
const PAD_LEFT = 64;
const TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];

function sanitizeBarValue(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw) || raw < 0) {
    return 0;
  }
  return raw;
}

function sanitizeLineValue(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) {
    return 0;
  }
  return raw;
}

function formatNumeric(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toFixed(2)));
}

function computeLineScale(values: ReadonlyArray<number>): { min: number; max: number } {
  let minVal = values[0]!;
  let maxVal = values[0]!;
  for (const val of values) {
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }
  if (minVal === maxVal) {
    if (maxVal === 0) return { min: 0, max: 1 };
    if (maxVal > 0) return { min: 0, max: maxVal };
    return { min: minVal, max: 0 };
  }
  return {
    min: minVal >= 0 ? 0 : minVal,
    max: maxVal,
  };
}

const headerClass = /*#__PURE__*/ stableClassName('combo-dual-axis-chart', 'header');
const svgClass = /*#__PURE__*/ stableClassName('combo-dual-axis-chart', 'svg');
const readoutClass = /*#__PURE__*/ stableClassName('combo-dual-axis-chart', 'readout');

function ComboDualAxisChartInner({
  labels,
  barLabel,
  barValues,
  barUnit = '',
  lineLabel,
  lineValues,
  lineUnit = '%',
  title = 'Volume vs. Rate',
  height = 240,
  onSelectIndex,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ComboDualAxisChartProps) {
  const headingId = useId();
  const glowFilterId = useId();
  const override = useComponentOverride('ComboDualAxisChart');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const clampedHeight = clampNumber(height, 140, 520, 240);
  const isEmpty = labels.length === 0;
  const safeSelectedIndex = isEmpty ? 0 : Math.min(selectedIndex, labels.length - 1);

  const handleSelect = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      onSelectIndex?.(index);
    },
    [onSelectIndex]
  );

  const handleItemKeyDown = useCallback(
    (index: number) => (event: ReactKeyboardEvent<SVGRectElement | SVGCircleElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelect(index);
      }
    },
    [handleSelect]
  );

  const geometry = useMemo(() => {
    const plotWidth = Math.max(80, SVG_WIDTH - PAD_LEFT - PAD_RIGHT);
    const plotHeight = Math.max(60, clampedHeight - PAD_TOP - PAD_BOTTOM);

    if (labels.length === 0) {
      return {
        plotWidth,
        plotHeight,
        points: [] as ComboPoint[],
        ticks: [] as DualAxisTick[],
        linePath: '',
      };
    }

    const cleanBars: number[] = [];
    const cleanLines: number[] = [];
    let rawBarMax = 0;

    for (let i = 0; i < labels.length; i += 1) {
      const b = sanitizeBarValue(barValues[i]);
      const l = sanitizeLineValue(lineValues[i]);
      cleanBars.push(b);
      cleanLines.push(l);
      if (b > rawBarMax) rawBarMax = b;
    }

    const barMax = rawBarMax > 0 ? rawBarMax : 1;
    const lineScale = computeLineScale(cleanLines);
    const lineSpan = lineScale.max - lineScale.min;

    const ticks: DualAxisTick[] = TICK_FRACTIONS.map((frac) => {
      const y = PAD_TOP + plotHeight * (1 - frac);
      const leftVal = barMax * frac;
      const rightVal = lineScale.min + lineSpan * frac;
      return {
        key: `dual-tick-${frac}`,
        y,
        leftText: `${formatNumeric(leftVal)}${barUnit}`,
        rightText: `${formatNumeric(rightVal)}${lineUnit}`,
        isBaseline: frac === 0,
      };
    });

    const bandWidth = plotWidth / labels.length;
    const barWidth = Math.min(44, Math.max(10, bandWidth * 0.48));
    const points: ComboPoint[] = [];

    for (let i = 0; i < labels.length; i += 1) {
      const label = labels[i]!;
      const barVal = cleanBars[i]!;
      const lineVal = cleanLines[i]!;
      const cxPos = PAD_LEFT + i * bandWidth + bandWidth / 2;
      const barHeight = Math.max(2, (barVal / barMax) * plotHeight);
      const barY = PAD_TOP + plotHeight - barHeight;
      const lineRatio = (lineVal - lineScale.min) / lineSpan;
      const lineY = PAD_TOP + plotHeight * (1 - lineRatio);

      points.push({
        key: `combo-pt-${label}-${i}`,
        index: i,
        label,
        barVal,
        lineVal,
        cx: cxPos,
        barX: cxPos - barWidth / 2,
        barY,
        barWidth,
        barHeight,
        lineY,
      });
    }

    const linePath =
      points.length === 1
        ? `M ${points[0]!.cx} ${points[0]!.lineY} L ${points[0]!.cx} ${points[0]!.lineY}`
        : points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.cx} ${pt.lineY}`).join(' ');

    return {
      plotWidth,
      plotHeight,
      points,
      ticks,
      linePath,
    };
  }, [labels, barValues, lineValues, barUnit, lineUnit, clampedHeight]);

  const activePoint = geometry.points[safeSelectedIndex];

  const merged = mergeProps({
    themeTarget: themeProps('combo-dual-axis-chart', {
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


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

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
            style={STYLE_TEXT_PRIMARY}
          >
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={STYLE_BG_SECONDARY}
            />
            <span>{barLabel}</span>
          </span>
          <span
            className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
            style={STYLE_TEXT_PRIMARY}
          >
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={STYLE_BG_PRIMARY}
            />
            <span>{lineLabel}</span>
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="combo-dual-axis-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No chart data to display.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            role="img"
            aria-label={`${title} dual-axis chart comparing ${barLabel} and ${lineLabel}`}
            viewBox={`0 0 ${SVG_WIDTH} ${clampedHeight}`}
            style={{ height: `${clampedHeight}px` }}
            className={cx(svgClass, 'w-full block overflow-visible', 'prism-contain-leaf')}
          >
            <defs>
              <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="prismLineGlow" />
                <feMerge>
                  <feMergeNode in="prismLineGlow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <text
              x={PAD_LEFT}
              y={12}
              textAnchor="start"
              fill="var(--prism-secondary-main)"
              data-axis="left-label"
              className="text-[10px] font-semibold"
            >
              {barLabel}
            </text>
            <text
              x={PAD_LEFT + geometry.plotWidth}
              y={12}
              textAnchor="end"
              fill="var(--prism-primary-main)"
              data-axis="right-label"
              className="text-[10px] font-semibold"
            >
              {lineLabel}
            </text>

            <line
              x1={PAD_LEFT}
              y1={PAD_TOP}
              x2={PAD_LEFT}
              y2={PAD_TOP + geometry.plotHeight}
              stroke="var(--prism-divider)"
              strokeWidth={1}
            />
            <line
              x1={PAD_LEFT + geometry.plotWidth}
              y1={PAD_TOP}
              x2={PAD_LEFT + geometry.plotWidth}
              y2={PAD_TOP + geometry.plotHeight}
              stroke="var(--prism-divider)"
              strokeWidth={1}
            />

            {geometry.ticks.map((tick) => (
              <g key={tick.key}>
                <line
                  x1={PAD_LEFT}
                  y1={tick.y}
                  x2={PAD_LEFT + geometry.plotWidth}
                  y2={tick.y}
                  stroke="var(--prism-divider)"
                  strokeWidth={tick.isBaseline ? 1.25 : 1}
                  strokeDasharray={tick.isBaseline ? undefined : '3 3'}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={tick.y + 3.5}
                  textAnchor="end"
                  fill="var(--prism-text-secondary)"
                  data-axis="left-tick"
                  className="text-[10px] font-mono tabular-nums"
                >
                  {tick.leftText}
                </text>
                <text
                  x={PAD_LEFT + geometry.plotWidth + 8}
                  y={tick.y + 3.5}
                  textAnchor="start"
                  fill="var(--prism-text-secondary)"
                  data-axis="right-tick"
                  className="text-[10px] font-mono tabular-nums"
                >
                  {tick.rightText}
                </text>
              </g>
            ))}

            {geometry.points.map((pt) => {
              const isSelected = pt.index === safeSelectedIndex;
              return (
                <g key={pt.key}>
                  <rect
                    x={pt.barX}
                    y={pt.barY}
                    width={pt.barWidth}
                    height={pt.barHeight}
                    rx={4}
                    fill="var(--prism-secondary-main)"
                    fillOpacity={isSelected ? 0.82 : 0.45}
                    stroke={isSelected ? 'var(--prism-secondary-dark)' : 'none'}
                    strokeWidth={isSelected ? 1.5 : 0}
                    role="button"
                    tabIndex={0}
                    aria-label={`${pt.label} · ${barLabel}: ${formatNumeric(pt.barVal)}${barUnit}`}
                    data-bar-index={String(pt.index)}
                    data-selected={isSelected ? 'true' : 'false'}
                    className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                    onClick={() => handleSelect(pt.index)}
                    onKeyDown={handleItemKeyDown(pt.index)}
                  />
                  <text
                    x={pt.cx}
                    y={PAD_TOP + geometry.plotHeight + 20}
                    textAnchor="middle"
                    fill="var(--prism-text-primary)"
                    className="text-[11px] font-medium"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}

            <path
              d={geometry.linePath}
              fill="none"
              stroke="var(--prism-primary-main)"
              strokeWidth={7}
              strokeOpacity={0.18}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
            <path
              d={geometry.linePath}
              fill="none"
              stroke="var(--prism-primary-main)"
              strokeWidth={2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowFilterId})`}
              data-series="line-path"
              pointerEvents="none"
            />

            {geometry.points.map((pt) => {
              const isSelected = pt.index === safeSelectedIndex;
              return (
                <circle
                  key={`marker-${pt.key}`}
                  cx={pt.cx}
                  cy={pt.lineY}
                  r={isSelected ? 6 : 4.5}
                  fill={isSelected ? 'var(--prism-primary-main)' : 'var(--prism-primary-contrast)'}
                  stroke="var(--prism-primary-main)"
                  strokeWidth={2.5}
                  role="button"
                  tabIndex={0}
                  aria-label={`${pt.label} · ${lineLabel}: ${formatNumeric(pt.lineVal)}${lineUnit}`}
                  data-marker-index={String(pt.index)}
                  data-selected={isSelected ? 'true' : 'false'}
                  className="prism-focus-ring cursor-pointer"
                  onClick={() => handleSelect(pt.index)}
                  onKeyDown={handleItemKeyDown(pt.index)}
                />
              );
            })}
          </svg>
        </div>
      )}

      {activePoint ? (
        <div
          data-testid="combo-dual-axis-readout"
          aria-live="polite"
          className={cx(
            readoutClass,
            'prism-well rounded-xl px-3.5 py-2 text-xs font-medium tabular-nums'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          {`${activePoint.label} · ${barLabel}: ${formatNumeric(activePoint.barVal)}${barUnit} · ${lineLabel}: ${formatNumeric(activePoint.lineVal)}${lineUnit}`}
        </div>
      ) : null}
    </div>
  );
}

export const ComboDualAxisChart = /*#__PURE__*/ memoWithDisplayName(ComboDualAxisChartInner, 'ComboDualAxisChart');
