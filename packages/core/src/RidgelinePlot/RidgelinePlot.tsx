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
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type RidgelineTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'info';

export interface RidgelineRow {
  /** Stable unique identifier for this distribution cohort. */
  id: string;
  /** Human-readable cohort label displayed along the left axis and inspector. */
  label: string;
  /** Raw numeric observations (non-finite entries are safely filtered out). */
  values: ReadonlyArray<number>;
  /** Semantic optical tone mapped to --prism-* CSS tokens (cycles automatically when omitted). */
  tone?: RidgelineTone;
}

export interface RidgelineSelection {
  /** Identifier of the selected cohort row. */
  id: string;
  /** Human-readable label of the selected cohort row. */
  label: string;
  /** Number of finite numeric samples in the cohort. */
  count: number;
  /** Mode / peak density coordinate along the shared horizontal domain. */
  peakValue: number;
  /** Arithmetic mean of finite samples in the cohort. */
  mean: number;
  /** Median (50th percentile) of finite samples in the cohort. */
  median: number;
}

export interface RidgelinePlotProps extends BaseProps<HTMLDivElement> {
  /** Distribution cohorts rendered top-to-bottom as overlapping Gaussian KDE curves; defaults to 6 monthly temperature cohorts when omitted. */
  rows?: ReadonlyArray<RidgelineRow>;
  /** Vertical overlap ratio in [0, 0.75] controlling mountain stacking density (defaults to 0.45). */
  overlap?: number;
  /** Unit suffix appended to X-axis ticks and statistical readouts (defaults to '°C'). */
  unit?: string;
  /** Chart card heading linked to the region and SVG graphic (defaults to 'Ridgeline (Joy) Distribution'). */
  title?: string;
  /** Callback invoked when a user clicks, activates, or keyboard-navigates to a ridge band. */
  onSelectRow?: (selection: RidgelineSelection) => void;
}

interface OverlapPreset {
  id: 'tight' | 'balanced' | 'separated';
  label: string;
  value: number;
}

interface PreparedRow {
  rowKey: string;
  id: string;
  label: string;
  tone: RidgelineTone;
  color: string;
  values: ReadonlyArray<number>;
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  iqr: number;
}

interface ComputedRidgeRow {
  rowKey: string;
  rowIndex: number;
  id: string;
  label: string;
  tone: RidgelineTone;
  color: string;
  count: number;
  peakValue: number;
  mean: number;
  median: number;
  baselineY: number;
  labelHitY: number;
  labelHitHeight: number;
  peakX: number;
  peakY: number;
  crestPath: string;
  areaPath: string;
}

interface AxisTick {
  key: string;
  x: number;
  label: string;
  textAnchor: 'start' | 'middle' | 'end';
}

interface Point2D {
  x: number;
  y: number;
}

const SVG_WIDTH = 460;
const SVG_HEIGHT = 250;
const PAD_LEFT = 64;
const PAD_RIGHT = 18;
const PAD_TOP = 14;
const PAD_BOTTOM = 30;
const PLOT_X = PAD_LEFT;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_TOP = PAD_TOP;
const PLOT_BOTTOM = SVG_HEIGHT - PAD_BOTTOM;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const AXIS_LABEL_Y = SVG_HEIGHT - 10;
const KDE_SAMPLES = 48;
const SQRT_TWO_PI = Math.sqrt(2 * Math.PI);
const TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];

const TONE_LIST: ReadonlyArray<RidgelineTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'info',
];

const TONE_COLOR_MAP: Record<RidgelineTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  info: 'var(--prism-info-main)',
};

const OVERLAP_PRESETS: ReadonlyArray<OverlapPreset> = [
  { id: 'tight', label: 'Tight', value: 0.75 },
  { id: 'balanced', label: 'Balanced', value: 0.45 },
  { id: 'separated', label: 'Separated', value: 0 },
];

export const DEFAULT_RIDGELINE_ROWS: ReadonlyArray<RidgelineRow> = [
  {
    id: 'jan',
    label: 'Jan',
    tone: 'info',
    values: [2.4, 3.1, 3.8, 4.2, 4.7, 5.0, 5.3, 5.5, 5.8, 6.1, 6.4, 6.9, 7.3, 8.1, 8.6, 9.2],
  },
  {
    id: 'feb',
    label: 'Feb',
    tone: 'secondary',
    values: [4.1, 5.0, 5.8, 6.4, 6.9, 7.2, 7.6, 7.9, 8.2, 8.5, 9.0, 9.5, 10.1, 10.8, 11.4, 12.1],
  },
  {
    id: 'mar',
    label: 'Mar',
    tone: 'emerald',
    values: [7.2, 8.3, 9.1, 9.8, 10.4, 10.9, 11.2, 11.6, 12.0, 12.4, 12.9, 13.5, 14.2, 14.9, 15.6, 16.3],
  },
  {
    id: 'apr',
    label: 'Apr',
    tone: 'emerald',
    values: [10.5, 11.6, 12.4, 13.2, 13.8, 14.3, 14.7, 15.1, 15.6, 16.0, 16.5, 17.2, 17.9, 18.6, 19.3, 20.1],
  },
  {
    id: 'may',
    label: 'May',
    tone: 'amber',
    values: [14.2, 15.4, 16.3, 17.1, 17.8, 18.4, 18.9, 19.3, 19.8, 20.4, 21.0, 21.7, 22.3, 23.1, 23.8, 24.6],
  },
  {
    id: 'jun',
    label: 'Jun',
    tone: 'primary',
    values: [18.1, 19.3, 20.2, 21.1, 21.9, 22.4, 22.9, 23.4, 23.8, 24.3, 24.9, 25.6, 26.3, 27.1, 27.9, 28.8],
  },
];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function roundStat(value: number): number {
  const rounded = Number(value.toFixed(2));
  return normalizeZero(rounded);
}

function formatNumeric(value: number): string {
  const safe = normalizeZero(value);
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(2)));
}

function formatMetric(value: number, unit: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
}

function truncateLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 1)}…`;
}

function quantileSorted(sorted: ReadonlyArray<number>, p: number): number {
  const n = sorted.length;
  if (n === 1) {
    return sorted[0]!;
  }
  const pos = (n - 1) * p;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  const weight = pos - lower;
  const lowVal = sorted[lower]!;
  const highVal = sorted[upper]!;
  return normalizeZero(lowVal + (highVal - lowVal) * weight);
}

function buildRidgePaths(
  points: ReadonlyArray<Point2D>,
  baselineY: number
): { crestPath: string; areaPath: string } {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const curveParts: string[] = [];

  for (let i = 1; i < points.length - 1; i += 1) {
    const curr = points[i]!;
    const next = points[i + 1]!;
    const midX = roundCoord((curr.x + next.x) / 2);
    const midY = roundCoord((curr.y + next.y) / 2);
    curveParts.push(`Q ${curr.x} ${curr.y} ${midX} ${midY}`);
  }
  curveParts.push(`L ${last.x} ${last.y}`);

  const curveBody = curveParts.join(' ');
  const crestPath = `M ${first.x} ${first.y} ${curveBody}`;
  const areaPath = `M ${first.x} ${baselineY} L ${first.x} ${first.y} ${curveBody} L ${last.x} ${baselineY} Z`;

  return { crestPath, areaPath };
}

function toSelection(row: ComputedRidgeRow): RidgelineSelection {
  return {
    id: row.id,
    label: row.label,
    count: row.count,
    peakValue: row.peakValue,
    mean: row.mean,
    median: row.median,
  };
}

function RidgelinePlotInner({
  rows,
  overlap = 0.45,
  unit = '°C',
  title = 'Ridgeline (Joy) Distribution',
  onSelectRow,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RidgelinePlotProps) {
  const headingId = useId();
  const svgId = useId();
  const override = useComponentOverride('RidgelinePlot');
  const rowRefs = useRef<Map<string, SVGGElement>>(new Map());

  const clampedPropOverlap = clampNumber(overlap, 0, 0.75, 0.45);
  const [overlapState, setOverlapState] = useState<{
    syncedProp: number;
    value: number;
  }>(() => ({
    syncedProp: clampedPropOverlap,
    value: clampedPropOverlap,
  }));

  const effectiveOverlap =
    overlapState.syncedProp === clampedPropOverlap
      ? overlapState.value
      : clampedPropOverlap;

  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null);

  const sourceRows = rows ?? DEFAULT_RIDGELINE_ROWS;

  const geometry = useMemo(() => {
    const prepared: PreparedRow[] = [];
    let globalMin = Number.POSITIVE_INFINITY;
    let globalMax = Number.NEGATIVE_INFINITY;

    for (let rIdx = 0; rIdx < sourceRows.length; rIdx += 1) {
      const entry = sourceRows[rIdx]!;
      const finite: number[] = [];
      let sum = 0;

      for (const raw of entry.values) {
        if (Number.isFinite(raw)) {
          const val = normalizeZero(raw);
          finite.push(val);
          sum += val;
        }
      }

      if (finite.length === 0) continue;

      finite.sort((a, b) => a - b);
      const count = finite.length;
      const min = finite[0]!;
      const max = finite[count - 1]!;
      const mean = sum / count;
      const median = quantileSorted(finite, 0.5);
      const q1 = quantileSorted(finite, 0.25);
      const q3 = quantileSorted(finite, 0.75);
      const iqr = q3 - q1;

      let sqDiffSum = 0;
      for (const val of finite) {
        const diff = val - mean;
        sqDiffSum += diff * diff;
      }
      const stdDev = Math.sqrt(sqDiffSum / count);

      if (min < globalMin) globalMin = min;
      if (max > globalMax) globalMax = max;

      const resolvedTone = entry.tone ?? TONE_LIST[rIdx % TONE_LIST.length]!;
      prepared.push({
        rowKey: `${entry.id}::${rIdx}`,
        id: entry.id,
        label: entry.label,
        tone: resolvedTone,
        color: TONE_COLOR_MAP[resolvedTone],
        values: finite,
        count,
        min,
        max,
        mean,
        median,
        stdDev,
        iqr,
      });
    }

    if (prepared.length === 0) {
      return {
        computedRows: [] as ComputedRidgeRow[],
        ticks: [] as AxisTick[],
        domainMin: 0,
        domainMax: 0,
      };
    }

    const rawSpan = globalMax - globalMin;
    const fallbackSpread =
      rawSpan > 0 ? rawSpan * 0.06 : globalMin === 0 ? 0.5 : Math.abs(globalMin) * 0.05;
    const minBw = rawSpan > 0 ? rawSpan * 0.025 : fallbackSpread * 0.5;
    const maxBw = rawSpan > 0 ? rawSpan * 0.22 : fallbackSpread * 2;

    const bandwidths: number[] = [];
    let maxBandwidth = 0;

    for (const row of prepared) {
      const sigma = row.iqr > 0 ? Math.min(row.stdDev, row.iqr / 1.34) : row.stdDev;
      const rawBw = sigma > 0 ? 0.9 * sigma * Math.pow(row.count, -0.2) : fallbackSpread;
      const bw = clampNumber(rawBw, minBw, maxBw, fallbackSpread);
      bandwidths.push(bw);
      if (bw > maxBandwidth) {
        maxBandwidth = bw;
      }
    }

    const margin =
      rawSpan > 0 ? Math.max(rawSpan * 0.08, maxBandwidth * 2.2) : fallbackSpread * 3;
    const domainMin = normalizeZero(globalMin - margin);
    const domainMax = normalizeZero(globalMax + margin);
    const domainSpan = domainMax - domainMin;

    const gridX: number[] = [];
    for (let k = 0; k < KDE_SAMPLES; k += 1) {
      gridX.push(domainMin + (domainSpan * k) / (KDE_SAMPLES - 1));
    }

    const rowCount = prepared.length;
    const overlapFactor = 0.88 + effectiveOverlap * 2.1;
    const rowStep =
      rowCount === 1 ? PLOT_HEIGHT : PLOT_HEIGHT / (rowCount - 1 + overlapFactor);
    const peakHeight = rowCount === 1 ? PLOT_HEIGHT * 0.85 : overlapFactor * rowStep;

    const computedRows: ComputedRidgeRow[] = prepared.map((row, idx) => {
      const bw = bandwidths[idx]!;
      const invNorm = 1 / (row.count * bw * SQRT_TWO_PI);
      const densities: number[] = [];
      let maxDensity = 0;
      let maxDensityIndex = 0;

      for (let k = 0; k < KDE_SAMPLES; k += 1) {
        const xVal = gridX[k]!;
        let sumExp = 0;
        for (const sample of row.values) {
          const u = (xVal - sample) / bw;
          sumExp += Math.exp(-0.5 * u * u);
        }
        const density = sumExp * invNorm;
        densities.push(density);
        if (density > maxDensity) {
          maxDensity = density;
          maxDensityIndex = k;
        }
      }

      const baselineY =
        rowCount === 1
          ? PLOT_BOTTOM
          : roundCoord(PLOT_TOP + peakHeight + idx * rowStep);

      const points: Point2D[] = [];
      for (let k = 0; k < KDE_SAMPLES; k += 1) {
        const xPos = roundCoord(
          PLOT_X + ((gridX[k]! - domainMin) / domainSpan) * PLOT_WIDTH
        );
        const normalized = densities[k]! / maxDensity;
        const yPos = roundCoord(baselineY - normalized * peakHeight);
        points.push({ x: xPos, y: yPos });
      }

      const { crestPath, areaPath } = buildRidgePaths(points, baselineY);
      const peakPoint = points[maxDensityIndex]!;
      const peakValue =
        row.min === row.max
          ? roundStat(row.min)
          : roundStat(gridX[maxDensityIndex]!);

      const labelHitHeight = roundCoord(Math.max(18, Math.min(rowStep, 28)));
      const labelHitY = roundCoord(baselineY - labelHitHeight + 4);

      return {
        rowKey: row.rowKey,
        rowIndex: idx,
        id: row.id,
        label: row.label,
        tone: row.tone,
        color: row.color,
        count: row.count,
        peakValue,
        mean: roundStat(row.mean),
        median: roundStat(row.median),
        baselineY,
        labelHitY,
        labelHitHeight,
        peakX: peakPoint.x,
        peakY: peakPoint.y,
        crestPath,
        areaPath,
      };
    });

    const ticks: AxisTick[] = TICK_FRACTIONS.map((frac) => {
      const x = roundCoord(PLOT_X + frac * PLOT_WIDTH);
      const rawVal = normalizeZero(domainMin + domainSpan * frac);
      const textAnchor: AxisTick['textAnchor'] =
        frac === 0 ? 'start' : frac === 1 ? 'end' : 'middle';
      return {
        key: `ridge-tick-${frac}`,
        x,
        label: formatMetric(Number(rawVal.toFixed(1)), unit),
        textAnchor,
      };
    });

    return {
      computedRows,
      ticks,
      domainMin: roundStat(domainMin),
      domainMax: roundStat(domainMax),
    };
  }, [sourceRows, effectiveOverlap, unit]);

  const isEmpty = geometry.computedRows.length === 0;

  const selectedRow = useMemo(() => {
    if (selectedRowKey === null) return null;
    return geometry.computedRows.find((row) => row.rowKey === selectedRowKey) ?? null;
  }, [geometry.computedRows, selectedRowKey]);

  const focusedRow = useMemo(() => {
    if (focusedRowKey === null) return null;
    return geometry.computedRows.find((row) => row.rowKey === focusedRowKey) ?? null;
  }, [geometry.computedRows, focusedRowKey]);

  const inspectedRow = focusedRow ?? selectedRow;
  const hasActiveRow = inspectedRow !== null;

  const registerRowRef = useCallback((rowKey: string, node: SVGGElement | null) => {
    if (node) {
      rowRefs.current.set(rowKey, node);
    } else {
      rowRefs.current.delete(rowKey);
    }
  }, []);

  const handleSelectOverlapPreset = useCallback(
    (presetValue: number) => {
      setOverlapState({
        syncedProp: clampedPropOverlap,
        value: presetValue,
      });
    },
    [clampedPropOverlap]
  );

  const handleSelectRow = useCallback(
    (row: ComputedRidgeRow) => {
      setSelectedRowKey(row.rowKey);
      onSelectRow?.(toSelection(row));
    },
    [onSelectRow]
  );

  const handleFocusRow = useCallback((rowKey: string) => {
    setFocusedRowKey(rowKey);
  }, []);

  const handleBlurRow = useCallback((rowKey: string) => {
    setFocusedRowKey((prev) => (prev === rowKey ? null : prev));
  }, []);

  const handleRowKeyDown = useCallback(
    (rowIndex: number, row: ComputedRidgeRow) =>
      (event: ReactKeyboardEvent<SVGGElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectRow(row);
          return;
        }

        const rowCount = geometry.computedRows.length;
        let targetRow: ComputedRidgeRow | null = null;

        if (event.key === 'ArrowUp') {
          const nextIdx = (rowIndex - 1 + rowCount) % rowCount;
          targetRow = geometry.computedRows[nextIdx]!;
        } else if (event.key === 'ArrowDown') {
          const nextIdx = (rowIndex + 1) % rowCount;
          targetRow = geometry.computedRows[nextIdx]!;
        }

        if (targetRow) {
          event.preventDefault();
          rowRefs.current.get(targetRow.rowKey)?.focus();
          handleSelectRow(targetRow);
        }
      },
    [geometry.computedRows, handleSelectRow]
  );

  const merged = mergeProps({
    themeTarget: themeProps('ridgeline-plot', {
      empty: isEmpty,
      hasSelection: hasActiveRow,
      cohortCount: geometry.computedRows.length,
      overlap: formatNumeric(effectiveOverlap),
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-4 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('ridgeline-plot', 'header');
  const presetsClass = stableClassName('ridgeline-plot', 'presets');
  const wellClass = stableClassName('ridgeline-plot', 'well');
  const svgClass = stableClassName('ridgeline-plot', 'svg');
  const inspectorClass = stableClassName('ridgeline-plot', 'inspector');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h4
            id={headingId}
            className="text-sm font-semibold tracking-tight min-w-0 break-words"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>

          {!isEmpty ? (
            <span
              data-testid="ridgeline-cohort-badge"
              className="prism-crystal inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tabular-nums shrink-0"
              style={STYLE_TEXT_PRIMARY}
            >
              <span>{geometry.computedRows.length}</span>
              <span style={STYLE_TEXT_SECONDARY}>
                {geometry.computedRows.length === 1 ? 'Cohort' : 'Cohorts'}
              </span>
            </span>
          ) : null}
        </div>

        {!isEmpty ? (
          <div
            role="group"
            aria-label="Overlap density presets"
            className={cx(
              presetsClass,
              'prism-well inline-flex flex-wrap items-center gap-1 p-0.5 rounded-full max-w-full'
            )}
          >
            {OVERLAP_PRESETS.map((preset) => {
              const isPresetActive = Math.abs(effectiveOverlap - preset.value) < 0.001;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={isPresetActive}
                  data-overlap-preset={preset.id}
                  onClick={() => handleSelectOverlapPreset(preset.value)}
                  className={cx(
                    'prism-focus-ring px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-opacity duration-150',
                    isPresetActive ? 'prism-crystal font-semibold' : 'font-medium opacity-80'
                  )}
                  style={{
                    color: isPresetActive
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="ridgeline-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No distribution cohorts to display.
        </div>
      ) : (
        <>
          <div
            className={cx(
              wellClass,
              'prism-well rounded-2xl p-3 w-full max-w-full min-w-0 overflow-x-auto'
            )}
          >
            <svg
              role="img"
              aria-label={`${title} ridgeline density plot across ${geometry.computedRows.length} ${geometry.computedRows.length === 1 ? 'cohort' : 'cohorts'}`}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none block')}
            >
              <defs>
                {TONE_LIST.map((tone) => (
                  <linearGradient
                    key={tone}
                    id={`${svgId}-grad-${tone}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={TONE_COLOR_MAP[tone]} stopOpacity={0.64} />
                    <stop offset="55%" stopColor={TONE_COLOR_MAP[tone]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={TONE_COLOR_MAP[tone]} stopOpacity={0.08} />
                  </linearGradient>
                ))}
              </defs>

              {geometry.ticks.map((tick) => (
                <g key={tick.key} pointerEvents="none">
                  <line
                    x1={tick.x}
                    y1={PLOT_TOP}
                    x2={tick.x}
                    y2={PLOT_BOTTOM}
                    stroke="var(--prism-divider)"
                    strokeWidth={0.75}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={tick.x}
                    y={AXIS_LABEL_Y}
                    textAnchor={tick.textAnchor}
                    fill="var(--prism-text-secondary)"
                    className="text-[9px] font-mono tabular-nums"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {geometry.computedRows.map((row) => {
                const isSelected = selectedRow?.rowKey === row.rowKey;
                const isHighlighted = inspectedRow?.rowKey === row.rowKey;
                const isDimmed = hasActiveRow && !isHighlighted;

                return (
                  <g
                    key={row.rowKey}
                    ref={(node) => registerRowRef(row.rowKey, node)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${row.label}: peak ${formatMetric(row.peakValue, unit)}, mean ${formatMetric(row.mean, unit)}, median ${formatMetric(row.median, unit)}, ${row.count} ${row.count === 1 ? 'sample' : 'samples'}`}
                    data-row-id={row.id}
                    data-tone={row.tone}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-highlighted={isHighlighted ? 'true' : 'false'}
                    data-dimmed={isDimmed ? 'true' : 'false'}
                    className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                    onClick={() => handleSelectRow(row)}
                    onFocus={() => handleFocusRow(row.rowKey)}
                    onBlur={() => handleBlurRow(row.rowKey)}
                    onKeyDown={handleRowKeyDown(row.rowIndex, row)}
                  >
                    <rect
                      x={2}
                      y={row.labelHitY}
                      width={PAD_LEFT - 6}
                      height={row.labelHitHeight}
                      rx={4}
                      fill="var(--prism-bg-start)"
                      fillOpacity={isHighlighted ? 0.35 : 0}
                    />

                    <text
                      x={PAD_LEFT - 10}
                      y={row.baselineY - 2}
                      textAnchor="end"
                      fill={
                        isHighlighted
                          ? 'var(--prism-text-primary)'
                          : 'var(--prism-text-secondary)'
                      }
                      opacity={isDimmed ? 0.45 : 1}
                      className={
                        isHighlighted ? 'text-[10px] font-semibold' : 'text-[10px] font-medium'
                      }
                    >
                      {truncateLabel(row.label, 10)}
                    </text>

                    <path
                      data-role="ridge-backdrop"
                      d={row.areaPath}
                      fill="var(--prism-well-end)"
                      fillOpacity={isDimmed ? 0.42 : 0.8}
                    />

                    <path
                      data-role="ridge-fill"
                      d={row.areaPath}
                      fill={`url(#${svgId}-grad-${row.tone})`}
                      fillOpacity={isDimmed ? 0.25 : isHighlighted ? 1 : 0.88}
                    />

                    <line
                      data-role="ridge-baseline"
                      x1={PLOT_X}
                      y1={row.baselineY}
                      x2={PLOT_X + PLOT_WIDTH}
                      y2={row.baselineY}
                      stroke={isHighlighted ? row.color : 'var(--prism-divider)'}
                      strokeWidth={isHighlighted ? 1.4 : 1}
                      strokeOpacity={isDimmed ? 0.4 : 1}
                    />

                    <path
                      data-role="ridge-crest"
                      d={row.crestPath}
                      fill="none"
                      stroke={isHighlighted ? 'var(--prism-text-primary)' : row.color}
                      strokeWidth={isHighlighted ? 2.1 : 1.5}
                      strokeOpacity={isDimmed ? 0.32 : 0.95}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />

                    {isHighlighted ? (
                      <circle
                        data-role="ridge-peak-marker"
                        cx={row.peakX}
                        cy={row.peakY}
                        r={3.25}
                        fill={row.color}
                        stroke="var(--prism-text-primary)"
                        strokeWidth={1.5}
                      />
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            data-testid="ridgeline-inspector"
            aria-live="polite"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0 text-xs tabular-nums'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {inspectedRow ? (
              <div className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: inspectedRow.color }}
                />
                <span className="font-semibold">{inspectedRow.label}</span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-mono font-semibold">
                  {`Mode/Peak ${formatMetric(inspectedRow.peakValue, unit)}`}
                </span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-mono" style={STYLE_TEXT_SECONDARY}>
                  {`Mean ${formatMetric(inspectedRow.mean, unit)}`}
                </span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-mono" style={STYLE_TEXT_SECONDARY}>
                  {`Median ${formatMetric(inspectedRow.median, unit)}`}
                </span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-mono" style={STYLE_TEXT_SECONDARY}>
                  {`Samples ${inspectedRow.count}`}
                </span>
              </div>
            ) : (
              <>
                <span style={STYLE_TEXT_SECONDARY}>
                  Select or focus any ridge to inspect Cohort · Mode/Peak · Mean · Median · Samples.
                </span>
                <span
                  className="font-mono font-medium shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`Domain: ${formatMetric(geometry.domainMin, unit)} – ${formatMetric(geometry.domainMax, unit)}`}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const RidgelinePlot = memo(RidgelinePlotInner);
RidgelinePlot.displayName = 'RidgelinePlot';
