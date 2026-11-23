'use client';

import {
  useCallback,
  useEffect,
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
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type BarSeriesTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';
export type BarOrientation = 'vertical' | 'horizontal';
export type BarLayoutMode = 'grouped' | 'stacked';

export interface BarSeries {
  /** Stable unique identifier for this data series. */
  id: string;
  /** Human-readable legend and readout label for the series. */
  label: string;
  /** Semantic optical tone token used to tint this series. */
  tone?: BarSeriesTone;
  /** Numeric values aligned index-for-index with `categories` (clamped >= 0). */
  values: number[];
}

export interface BarColumnChartProps extends BaseProps<HTMLDivElement> {
  /** Ordered category axis labels. */
  categories: string[];
  /** One or more data series plotted across categories. */
  series: BarSeries[];
  /** Initial or updated bar orientation ('vertical' | 'horizontal', defaults to 'vertical'). */
  orientation?: BarOrientation;
  /** Initial or updated bar layout mode ('grouped' | 'stacked', defaults to 'grouped'). */
  layout?: BarLayoutMode;
  /** Chart card heading (defaults to 'Category Comparison'). */
  title?: string;
  /** Chart SVG viewport height in pixels (defaults to 240, clamped to 140..520). */
  height?: number;
  /** Optional unit suffix appended to axis ticks and selection readouts (e.g. 'k', 'ms', '%'). */
  valueUnit?: string;
  /** Callback fired when a user clicks or activates any bar via keyboard. */
  onSelectBar?: (seriesId: string, categoryIndex: number, value: number) => void;
}

interface NormalizedBarSeries {
  id: string;
  key: string;
  label: string;
  tone: BarSeriesTone;
  color: string;
  values: number[];
}

interface RenderedBar {
  key: string;
  seriesId: string;
  seriesLabel: string;
  categoryIndex: number;
  categoryLabel: string;
  value: number;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GridLineItem {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
  textAnchor: 'middle' | 'end';
  label: string;
  isBaseline: boolean;
}

interface CategoryLabelItem {
  key: string;
  label: string;
  x: number;
  y: number;
  textAnchor: 'middle' | 'end';
}

interface SelectedBarRef {
  seriesId: string;
  categoryIndex: number;
}

const SVG_WIDTH = 560;
const TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];

const TONE_TOKEN_MAP: Record<BarSeriesTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  rose: 'var(--prism-error-main)',
};

const TONE_CYCLE: ReadonlyArray<BarSeriesTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'rose',
];

const ORIENTATION_OPTIONS: ReadonlyArray<{ value: BarOrientation; label: string }> = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'horizontal', label: 'Horizontal' },
];

const LAYOUT_OPTIONS: ReadonlyArray<{ value: BarLayoutMode; label: string }> = [
  { value: 'grouped', label: 'Grouped' },
  { value: 'stacked', label: 'Stacked' },
];

function sanitizeBarValue(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw) || raw < 0) {
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

function formatMetric(value: number, unit?: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
}

const headerClass = /*#__PURE__*/ stableClassName('bar-column-chart', 'header');
const legendClass = /*#__PURE__*/ stableClassName('bar-column-chart', 'legend');
const svgClass = /*#__PURE__*/ stableClassName('bar-column-chart', 'svg');
const readoutClass = /*#__PURE__*/ stableClassName('bar-column-chart', 'readout');

function BarColumnChartInner({
  categories,
  series,
  orientation = 'vertical',
  layout = 'grouped',
  title = 'Category Comparison',
  height = 240,
  valueUnit,
  onSelectBar,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: BarColumnChartProps) {
  const headingId = useId();
  const override = useComponentOverride('BarColumnChart');
  const [activeOrientation, setActiveOrientation] = useState<BarOrientation>(orientation);
  const [activeLayout, setActiveLayout] = useState<BarLayoutMode>(layout);
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<ReadonlyArray<string>>([]);
  const [selectedBar, setSelectedBar] = useState<SelectedBarRef | null>(null);

  useEffect(() => {
    setActiveOrientation(orientation);
  }, [orientation]);

  useEffect(() => {
    setActiveLayout(layout);
  }, [layout]);

  const clampedHeight = clampNumber(height, 140, 520, 240);
  const isEmpty = categories.length === 0 || series.length === 0;

  const normalizedSeries = useMemo<NormalizedBarSeries[]>(() => {
    const items: NormalizedBarSeries[] = [];
    for (let sIdx = 0; sIdx < series.length; sIdx += 1) {
      const entry = series[sIdx]!;
      const resolvedTone = entry.tone ?? (TONE_CYCLE[sIdx % TONE_CYCLE.length] as BarSeriesTone);
      const cleanValues: number[] = [];
      for (let cIdx = 0; cIdx < categories.length; cIdx += 1) {
        cleanValues.push(sanitizeBarValue(entry.values[cIdx]));
      }
      items.push({
        id: entry.id,
        key: `series-${entry.id}-${sIdx}`,
        label: entry.label,
        tone: resolvedTone,
        color: TONE_TOKEN_MAP[resolvedTone],
        values: cleanValues,
      });
    }
    return items;
  }, [categories.length, series]);

  const hiddenSet = useMemo(() => new Set(hiddenSeriesIds), [hiddenSeriesIds]);

  const visibleSeries = useMemo(
    () => normalizedSeries.filter((s) => !hiddenSet.has(s.id)),
    [normalizedSeries, hiddenSet]
  );

  const toggleSeries = useCallback((seriesId: string) => {
    setHiddenSeriesIds((prev) =>
      prev.includes(seriesId) ? prev.filter((id) => id !== seriesId) : [...prev, seriesId]
    );
  }, []);

  const handleSelectBar = useCallback(
    (seriesId: string, categoryIndex: number, value: number) => {
      setSelectedBar({ seriesId, categoryIndex });
      onSelectBar?.(seriesId, categoryIndex, value);
    },
    [onSelectBar]
  );

  const handleBarKeyDown = useCallback(
    (seriesId: string, categoryIndex: number, value: number) =>
      (event: ReactKeyboardEvent<SVGRectElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectBar(seriesId, categoryIndex, value);
        }
      },
    [handleSelectBar]
  );

  const geometry = useMemo(() => {
    const catCount = categories.length;
    const visCount = visibleSeries.length;
    if (catCount === 0 || visCount === 0) {
      return {
        axisMax: 1,
        gridLines: [] as GridLineItem[],
        categoryLabels: [] as CategoryLabelItem[],
        bars: [] as RenderedBar[],
      };
    }

    let rawMax = 0;
    if (activeLayout === 'stacked') {
      for (let cIdx = 0; cIdx < catCount; cIdx += 1) {
        let sum = 0;
        for (const s of visibleSeries) {
          sum += s.values[cIdx]!;
        }
        if (sum > rawMax) rawMax = sum;
      }
    } else {
      for (const s of visibleSeries) {
        for (let cIdx = 0; cIdx < catCount; cIdx += 1) {
          const val = s.values[cIdx]!;
          if (val > rawMax) rawMax = val;
        }
      }
    }
    const axisMax = rawMax > 0 ? rawMax : 1;

    const gridLines: GridLineItem[] = [];
    const categoryLabels: CategoryLabelItem[] = [];
    const bars: RenderedBar[] = [];

    if (activeOrientation === 'vertical') {
      const padTop = 16;
      const padRight = 18;
      const padBottom = 34;
      const padLeft = 52;
      const plotWidth = Math.max(80, SVG_WIDTH - padLeft - padRight);
      const plotHeight = Math.max(60, clampedHeight - padTop - padBottom);

      for (const frac of TICK_FRACTIONS) {
        const y = padTop + plotHeight * (1 - frac);
        gridLines.push({
          key: `v-grid-${frac}`,
          x1: padLeft,
          y1: y,
          x2: padLeft + plotWidth,
          y2: y,
          labelX: padLeft - 8,
          labelY: y + 3.5,
          textAnchor: 'end',
          label: formatMetric(axisMax * frac, valueUnit),
          isBaseline: frac === 0,
        });
      }

      const bandWidth = plotWidth / catCount;
      const bandInnerPad = Math.min(12, bandWidth * 0.14);
      const usableBandWidth = Math.max(8, bandWidth - bandInnerPad * 2);

      for (let cIdx = 0; cIdx < catCount; cIdx += 1) {
        const catLabel = categories[cIdx]!;
        categoryLabels.push({
          key: `v-cat-${catLabel}-${cIdx}`,
          label: catLabel,
          x: padLeft + cIdx * bandWidth + bandWidth / 2,
          y: padTop + plotHeight + 20,
          textAnchor: 'middle',
        });

        if (activeLayout === 'grouped') {
          const barGap = visCount > 1 ? Math.min(4, usableBandWidth * 0.08) : 0;
          const barWidth = Math.max(4, (usableBandWidth - barGap * (visCount - 1)) / visCount);
          for (let sIdx = 0; sIdx < visCount; sIdx += 1) {
            const s = visibleSeries[sIdx]!;
            const val = s.values[cIdx]!;
            const barHeight = Math.max(2, (val / axisMax) * plotHeight);
            const x = padLeft + cIdx * bandWidth + bandInnerPad + sIdx * (barWidth + barGap);
            const y = padTop + plotHeight - barHeight;
            bars.push({
              key: `vg-${s.id}-${cIdx}`,
              seriesId: s.id,
              seriesLabel: s.label,
              categoryIndex: cIdx,
              categoryLabel: catLabel,
              value: val,
              color: s.color,
              x,
              y,
              width: barWidth,
              height: barHeight,
            });
          }
        } else {
          const barWidth = Math.min(56, Math.max(8, usableBandWidth * 0.72));
          const x = padLeft + cIdx * bandWidth + (bandWidth - barWidth) / 2;
          let cumulative = 0;
          for (let sIdx = 0; sIdx < visCount; sIdx += 1) {
            const s = visibleSeries[sIdx]!;
            const val = s.values[cIdx]!;
            const bottomPx = (cumulative / axisMax) * plotHeight;
            cumulative += val;
            const topPx = (cumulative / axisMax) * plotHeight;
            const segHeight = val > 0 ? Math.max(2, topPx - bottomPx) : 0;
            const y = Math.max(padTop, padTop + plotHeight - topPx);
            bars.push({
              key: `vs-${s.id}-${cIdx}`,
              seriesId: s.id,
              seriesLabel: s.label,
              categoryIndex: cIdx,
              categoryLabel: catLabel,
              value: val,
              color: s.color,
              x,
              y,
              width: barWidth,
              height: segHeight,
            });
          }
        }
      }
    } else {
      const padTop = 14;
      const padRight = 24;
      const padBottom = 30;
      const padLeft = 88;
      const plotWidth = Math.max(80, SVG_WIDTH - padLeft - padRight);
      const plotHeight = Math.max(60, clampedHeight - padTop - padBottom);

      for (const frac of TICK_FRACTIONS) {
        const x = padLeft + plotWidth * frac;
        gridLines.push({
          key: `h-grid-${frac}`,
          x1: x,
          y1: padTop,
          x2: x,
          y2: padTop + plotHeight,
          labelX: x,
          labelY: padTop + plotHeight + 18,
          textAnchor: 'middle',
          label: formatMetric(axisMax * frac, valueUnit),
          isBaseline: frac === 0,
        });
      }

      const bandHeight = plotHeight / catCount;
      const bandInnerPad = Math.min(10, bandHeight * 0.14);
      const usableBandHeight = Math.max(8, bandHeight - bandInnerPad * 2);

      for (let cIdx = 0; cIdx < catCount; cIdx += 1) {
        const catLabel = categories[cIdx]!;
        categoryLabels.push({
          key: `h-cat-${catLabel}-${cIdx}`,
          label: catLabel,
          x: padLeft - 8,
          y: padTop + cIdx * bandHeight + bandHeight / 2 + 4,
          textAnchor: 'end',
        });

        if (activeLayout === 'grouped') {
          const barGap = visCount > 1 ? Math.min(4, usableBandHeight * 0.08) : 0;
          const barHeight = Math.max(4, (usableBandHeight - barGap * (visCount - 1)) / visCount);
          for (let sIdx = 0; sIdx < visCount; sIdx += 1) {
            const s = visibleSeries[sIdx]!;
            const val = s.values[cIdx]!;
            const barWidth = Math.max(2, (val / axisMax) * plotWidth);
            const x = padLeft;
            const y = padTop + cIdx * bandHeight + bandInnerPad + sIdx * (barHeight + barGap);
            bars.push({
              key: `hg-${s.id}-${cIdx}`,
              seriesId: s.id,
              seriesLabel: s.label,
              categoryIndex: cIdx,
              categoryLabel: catLabel,
              value: val,
              color: s.color,
              x,
              y,
              width: barWidth,
              height: barHeight,
            });
          }
        } else {
          const barHeight = Math.min(36, Math.max(8, usableBandHeight * 0.72));
          const y = padTop + cIdx * bandHeight + (bandHeight - barHeight) / 2;
          let cumulative = 0;
          for (let sIdx = 0; sIdx < visCount; sIdx += 1) {
            const s = visibleSeries[sIdx]!;
            const val = s.values[cIdx]!;
            const leftPx = (cumulative / axisMax) * plotWidth;
            cumulative += val;
            const rightPx = (cumulative / axisMax) * plotWidth;
            const segWidth = val > 0 ? Math.max(2, rightPx - leftPx) : 0;
            const x = padLeft + leftPx;
            bars.push({
              key: `hs-${s.id}-${cIdx}`,
              seriesId: s.id,
              seriesLabel: s.label,
              categoryIndex: cIdx,
              categoryLabel: catLabel,
              value: val,
              color: s.color,
              x,
              y,
              width: segWidth,
              height: barHeight,
            });
          }
        }
      }
    }

    return { axisMax, gridLines, categoryLabels, bars };
  }, [categories, visibleSeries, activeOrientation, activeLayout, clampedHeight, valueUnit]);

  const activeSelection = useMemo(() => {
    if (!selectedBar) return null;
    const catLabel = categories[selectedBar.categoryIndex];
    if (catLabel === undefined) return null;
    const matchedSeries = visibleSeries.find((s) => s.id === selectedBar.seriesId);
    if (!matchedSeries) return null;
    const value = matchedSeries.values[selectedBar.categoryIndex]!;
    return {
      categoryLabel: catLabel,
      seriesId: matchedSeries.id,
      seriesLabel: matchedSeries.label,
      color: matchedSeries.color,
      value,
      categoryIndex: selectedBar.categoryIndex,
    };
  }, [categories, selectedBar, visibleSeries]);

  const merged = mergeProps({
    themeTarget: themeProps('bar-column-chart', {
      orientation: activeOrientation,
      layout: activeLayout,
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

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Chart orientation"
            className="prism-crystal p-1 rounded-full inline-flex gap-1"
          >
            {ORIENTATION_OPTIONS.map((opt) => {
              const pressed = activeOrientation === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setActiveOrientation(opt.value)}
                  className={cx(
                    'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors',
                    pressed ? 'prism-well font-semibold' : 'opacity-75 hover:opacity-100'
                  )}
                  style={{
                    color: pressed ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Bar layout mode"
            className="prism-crystal p-1 rounded-full inline-flex gap-1"
          >
            {LAYOUT_OPTIONS.map((opt) => {
              const pressed = activeLayout === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setActiveLayout(opt.value)}
                  className={cx(
                    'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors',
                    pressed ? 'prism-well font-semibold' : 'opacity-75 hover:opacity-100'
                  )}
                  style={{
                    color: pressed ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!isEmpty ? (
        <div
          role="group"
          aria-label="Series legend"
          className={cx(legendClass, 'flex flex-wrap items-center gap-2')}
        >
          {normalizedSeries.map((s) => {
            const visible = !hiddenSet.has(s.id);
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={visible}
                onClick={() => toggleSeries(s.id)}
                className={cx(
                  'prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity',
                  visible ? 'prism-crystal' : 'prism-well opacity-50 line-through'
                )}
                style={STYLE_TEXT_PRIMARY}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {isEmpty ? (
        <div
          role="status"
          data-testid="bar-column-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No chart data to display.
        </div>
      ) : visibleSeries.length === 0 ? (
        <div
          role="status"
          data-testid="bar-column-all-hidden"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          All series are hidden. Select a series in the legend to display bars.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            role="img"
            aria-label={`${title} ${activeOrientation} ${activeLayout} bar chart`}
            viewBox={`0 0 ${SVG_WIDTH} ${clampedHeight}`}
            style={{ height: `${clampedHeight}px` }}
            className={cx(svgClass, 'w-full block overflow-visible', 'prism-contain-leaf')}
          >
            {geometry.gridLines.map((line) => (
              <g key={line.key}>
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="var(--prism-divider)"
                  strokeWidth={line.isBaseline ? 1.25 : 1}
                  strokeDasharray={line.isBaseline ? undefined : '3 3'}
                />
                <text
                  x={line.labelX}
                  y={line.labelY}
                  textAnchor={line.textAnchor}
                  fill="var(--prism-text-secondary)"
                  className="text-[10px] font-mono tabular-nums"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {geometry.categoryLabels.map((cat) => (
              <text
                key={cat.key}
                x={cat.x}
                y={cat.y}
                textAnchor={cat.textAnchor}
                fill="var(--prism-text-primary)"
                className="text-[11px] font-medium"
              >
                {cat.label}
              </text>
            ))}

            {geometry.bars.map((bar) => {
              const isSelected =
                activeSelection !== null &&
                activeSelection.seriesId === bar.seriesId &&
                activeSelection.categoryIndex === bar.categoryIndex;
              const opacity =
                activeSelection === null ? 0.9 : isSelected ? 1 : 0.65;
              return (
                <rect
                  key={bar.key}
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
                  aria-label={`${bar.categoryLabel} · ${bar.seriesLabel}: ${formatMetric(bar.value, valueUnit)}`}
                  data-series-id={bar.seriesId}
                  data-category-index={String(bar.categoryIndex)}
                  data-selected={isSelected ? 'true' : 'false'}
                  className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                  onClick={() => handleSelectBar(bar.seriesId, bar.categoryIndex, bar.value)}
                  onKeyDown={handleBarKeyDown(bar.seriesId, bar.categoryIndex, bar.value)}
                />
              );
            })}
          </svg>
        </div>
      )}

      {!isEmpty ? (
        <div
          data-testid="bar-column-readout"
          aria-live="polite"
          className={cx(
            readoutClass,
            'prism-well rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs tabular-nums'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          {activeSelection ? (
            <>
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeSelection.color }}
              />
              <span className="font-medium">
                {`${activeSelection.categoryLabel} · ${activeSelection.seriesLabel}: ${formatMetric(activeSelection.value, valueUnit)}`}
              </span>
            </>
          ) : (
            <span style={STYLE_TEXT_SECONDARY}>
              Select any bar to inspect exact category and series values.
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const BarColumnChart = /*#__PURE__*/ memoWithDisplayName(BarColumnChartInner, 'BarColumnChart');
