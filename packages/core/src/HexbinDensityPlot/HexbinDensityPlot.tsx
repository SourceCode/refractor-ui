'use client';

import {
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
import { themeProps } from '../utils/themeProps';

export type HexbinTone = 'primary' | 'secondary' | 'emerald' | 'info';

export interface HexbinPoint {
  /** Horizontal numeric coordinate in data units (e.g. Request Size in KB). */
  x: number;
  /** Vertical numeric coordinate in data units (e.g. Response Time in ms). */
  y: number;
}

export interface HexbinCluster {
  /** Stable deterministic hexagon bin identifier (`hex-<col>-<row>`). */
  id: string;
  /** Zero-based horizontal column index in the honeycomb grid. */
  col: number;
  /** Zero-based vertical row index in the honeycomb grid. */
  row: number;
  /** Mean X value (centroid) of points aggregated into this hexagon bin. */
  centerX: number;
  /** Mean Y value (centroid) of points aggregated into this hexagon bin. */
  centerY: number;
  /** Number of finite observations assigned to this hexagon bin. */
  count: number;
  /** Percentage share of total valid points aggregated into this bin (`0..100`). */
  sharePct: number;
}

export interface HexbinDensityPlotProps extends BaseProps<HTMLDivElement> {
  /** 2D observations aggregated into hexagonal bins. Defaults to a 64-point bi-cluster dataset when omitted; pass `[]` for an empty state. */
  points?: ReadonlyArray<HexbinPoint>;
  /** Horizontal hexagonal grid columns across the plot area (default `10`, clamped `5..16`). */
  columns?: number;
  /** Semantic `--prism-*` optical tone ramp applied to populated hexagons and intensity legend (default `'emerald'`). */
  tone?: HexbinTone;
  /** Horizontal X-axis caption (default `'Request Size (KB)'`). */
  xLabel?: string;
  /** Vertical Y-axis caption (default `'Response Time (ms)'`). */
  yLabel?: string;
  /** Visible heading rendered in the prism-slab header (default `'Hexbin Spatial Aggregation'`). */
  title?: string;
  /** Callback fired when a populated hexagon bin is clicked or activated/stepped via keyboard. */
  onSelectHex?: (bin: HexbinCluster) => void;
}

interface ToneTokenPair {
  main: string;
  contrast: string;
}

interface IntensityStep {
  id: string;
  level: number;
  opacity: number;
}

interface EmptyHexCell {
  id: string;
  pointsAttr: string;
}

interface RenderedHexBin extends HexbinCluster {
  index: number;
  svgX: number;
  svgY: number;
  pointsAttr: string;
  ringPointsAttr: string;
  fillOpacity: number;
  intensityLevel: number;
  labelFill: string;
}

interface AxisTick {
  key: string;
  coord: number;
  label: string;
}

interface BinAccumulator {
  col: number;
  row: number;
  sumX: number;
  sumY: number;
  count: number;
}

const SVG_WIDTH = 440;
const SVG_HEIGHT = 250;
const PLOT_LEFT = 54;
const PLOT_RIGHT = 426;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 208;
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;

const MIN_COLUMNS = 5;
const MAX_COLUMNS = 16;
const DEFAULT_COLUMNS = 10;

const SQRT3 = Math.sqrt(3);
const X_TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];
const Y_TICK_FRACTIONS: ReadonlyArray<number> = [0, 1 / 3, 2 / 3, 1];

const TONE_TOKEN_MAP: Record<HexbinTone, ToneTokenPair> = {
  primary: {
    main: 'var(--prism-primary-main)',
    contrast: 'var(--prism-primary-contrast)',
  },
  secondary: {
    main: 'var(--prism-secondary-main)',
    contrast: 'var(--prism-secondary-contrast)',
  },
  emerald: {
    main: 'var(--prism-success-main)',
    contrast: 'var(--prism-success-contrast)',
  },
  info: {
    main: 'var(--prism-info-main)',
    contrast: 'var(--prism-info-contrast)',
  },
};

const INTENSITY_STEPS: ReadonlyArray<IntensityStep> = [
  { id: 'step-1', level: 1, opacity: 0.2 },
  { id: 'step-2', level: 2, opacity: 0.38 },
  { id: 'step-3', level: 3, opacity: 0.56 },
  { id: 'step-4', level: 4, opacity: 0.75 },
  { id: 'step-5', level: 5, opacity: 0.94 },
];

/** Default 64-point bi-cluster optical dataset (fast cache-hit cluster + heavy analytics payload cluster). */
export const DEFAULT_HEXBIN_POINTS: ReadonlyArray<HexbinPoint> = [
  // Cluster A: 34 fast cache-hit requests (~14–36 KB, ~38–96 ms)
  { x: 14, y: 42 },
  { x: 16, y: 48 },
  { x: 18, y: 54 },
  { x: 19, y: 61 },
  { x: 20, y: 56 },
  { x: 21, y: 60 },
  { x: 22, y: 58 },
  { x: 22, y: 63 },
  { x: 23, y: 60 },
  { x: 23, y: 64 },
  { x: 24, y: 62 },
  { x: 24, y: 65 },
  { x: 25, y: 61 },
  { x: 25, y: 66 },
  { x: 26, y: 63 },
  { x: 26, y: 71 },
  { x: 27, y: 68 },
  { x: 28, y: 74 },
  { x: 29, y: 70 },
  { x: 30, y: 78 },
  { x: 31, y: 72 },
  { x: 32, y: 84 },
  { x: 34, y: 88 },
  { x: 35, y: 92 },
  { x: 17, y: 72 },
  { x: 20, y: 78 },
  { x: 24, y: 82 },
  { x: 28, y: 86 },
  { x: 15, y: 38 },
  { x: 21, y: 45 },
  { x: 27, y: 50 },
  { x: 31, y: 58 },
  { x: 12, y: 52 },
  { x: 36, y: 66 },

  // Cluster B: 26 analytical batch payload requests (~62–92 KB, ~176–268 ms)
  { x: 64, y: 184 },
  { x: 66, y: 192 },
  { x: 68, y: 198 },
  { x: 70, y: 206 },
  { x: 72, y: 210 },
  { x: 73, y: 214 },
  { x: 74, y: 216 },
  { x: 74, y: 220 },
  { x: 75, y: 218 },
  { x: 76, y: 215 },
  { x: 76, y: 221 },
  { x: 77, y: 219 },
  { x: 78, y: 224 },
  { x: 79, y: 228 },
  { x: 80, y: 222 },
  { x: 81, y: 234 },
  { x: 82, y: 230 },
  { x: 84, y: 242 },
  { x: 86, y: 248 },
  { x: 88, y: 256 },
  { x: 90, y: 262 },
  { x: 92, y: 268 },
  { x: 70, y: 236 },
  { x: 75, y: 244 },
  { x: 83, y: 204 },
  { x: 62, y: 214 },

  // Bridge & outer observations: 4 scattered points across low-density regions
  { x: 42, y: 118 },
  { x: 49, y: 142 },
  { x: 56, y: 164 },
  { x: 18, y: 192 },
];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function formatAxisNumber(value: number): string {
  const safe = normalizeZero(value);
  if (Math.abs(safe) >= 100 || Number.isInteger(safe)) {
    return String(Math.round(safe));
  }
  return String(Number(safe.toFixed(1)));
}

function formatCenterNumber(value: number): string {
  const safe = normalizeZero(value);
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(1)));
}

function buildHexPolygonPoints(cx: number, cy: number, radius: number): string {
  const coords: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angleRad = ((60 * i - 30) * Math.PI) / 180;
    const vx = roundTwo(cx + radius * Math.cos(angleRad));
    const vy = roundTwo(cy + radius * Math.sin(angleRad));
    coords.push(`${vx},${vy}`);
  }
  return coords.join(' ');
}

function resolveIntensityStep(count: number, maxCount: number): IntensityStep {
  const ratio = count / maxCount;
  const idx = Math.min(
    INTENSITY_STEPS.length - 1,
    Math.max(0, Math.ceil(ratio * INTENSITY_STEPS.length) - 1)
  );
  return INTENSITY_STEPS[idx]!;
}

export function HexbinDensityPlot({
  points,
  columns = DEFAULT_COLUMNS,
  tone = 'emerald',
  xLabel = 'Request Size (KB)',
  yLabel = 'Response Time (ms)',
  title = 'Hexbin Spatial Aggregation',
  onSelectHex,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: HexbinDensityPlotProps) {
  const headingId = useId();
  const override = useComponentOverride('HexbinDensityPlot');
  const binRefs = useRef<Map<string, SVGGElement | null>>(new Map());
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);

  const safeColumns = Math.round(clampNumber(columns, MIN_COLUMNS, MAX_COLUMNS, DEFAULT_COLUMNS));
  const toneTokens = TONE_TOKEN_MAP[tone];
  const sourcePoints = points ?? DEFAULT_HEXBIN_POINTS;

  const validPoints = useMemo<HexbinPoint[]>(() => {
    const cleaned: HexbinPoint[] = [];
    for (const pt of sourcePoints) {
      if (Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
        cleaned.push({
          x: normalizeZero(pt.x),
          y: normalizeZero(pt.y),
        });
      }
    }
    return cleaned;
  }, [sourcePoints]);

  const isEmpty = validPoints.length === 0;

  const geometry = useMemo(() => {
    if (validPoints.length === 0) {
      return {
        emptyCells: [] as EmptyHexCell[],
        populatedBins: [] as RenderedHexBin[],
        peakBinIndex: -1,
        xTicks: [] as AxisTick[],
        yTicks: [] as AxisTick[],
      };
    }

    let rawMinX = Number.POSITIVE_INFINITY;
    let rawMaxX = Number.NEGATIVE_INFINITY;
    let rawMinY = Number.POSITIVE_INFINITY;
    let rawMaxY = Number.NEGATIVE_INFINITY;

    for (const pt of validPoints) {
      if (pt.x < rawMinX) rawMinX = pt.x;
      if (pt.x > rawMaxX) rawMaxX = pt.x;
      if (pt.y < rawMinY) rawMinY = pt.y;
      if (pt.y > rawMaxY) rawMaxY = pt.y;
    }

    let domainMinX = rawMinX;
    let domainMaxX = rawMaxX;
    if (domainMinX === domainMaxX) {
      const padX = domainMinX === 0 ? 1 : Math.abs(domainMinX) * 0.1;
      domainMinX -= padX;
      domainMaxX += padX;
    }

    let domainMinY = rawMinY;
    let domainMaxY = rawMaxY;
    if (domainMinY === domainMaxY) {
      const padY = domainMinY === 0 ? 1 : Math.abs(domainMinY) * 0.1;
      domainMinY -= padY;
      domainMaxY += padY;
    }

    const spanX = domainMaxX - domainMinX;
    const spanY = domainMaxY - domainMinY;

    const hexRadius = PLOT_WIDTH / ((safeColumns + 0.5) * SQRT3);
    const hexWidth = SQRT3 * hexRadius;
    const rowStepY = 1.5 * hexRadius;
    const rows = Math.floor((PLOT_HEIGHT - 2 * hexRadius) / rowStepY) + 1;

    const totalGridHeight = 2 * hexRadius + (rows - 1) * rowStepY;
    const originX = PLOT_LEFT + hexWidth / 2;
    const originY = PLOT_TOP + (PLOT_HEIGHT - totalGridHeight) / 2 + hexRadius;

    const minCellX = originX;
    const maxCellX = originX + (safeColumns - 0.5) * hexWidth;
    const minCellY = originY;
    const maxCellY = originY + (rows - 1) * rowStepY;

    const cellSpanX = maxCellX - minCellX;
    const cellSpanY = maxCellY - minCellY;

    const buckets = new Map<string, BinAccumulator>();

    for (const pt of validPoints) {
      const tx = (pt.x - domainMinX) / spanX;
      const ty = (pt.y - domainMinY) / spanY;
      const sx = minCellX + tx * cellSpanX;
      const sy = maxCellY - ty * cellSpanY;

      const dx = sx - originX;
      const dy = sy - originY;
      const qf = ((SQRT3 / 3) * dx - dy / 3) / hexRadius;
      const rf = ((2 / 3) * dy) / hexRadius;
      const sf = -qf - rf;

      let rq = Math.round(qf);
      let rr = Math.round(rf);
      const rs = Math.round(sf);

      const qDiff = Math.abs(rq - qf);
      const rDiff = Math.abs(rr - rf);
      const sDiff = Math.abs(rs - sf);

      if (qDiff > rDiff && qDiff > sDiff) {
        rq = -rr - rs;
      } else if (rDiff > sDiff) {
        rr = -rq - rs;
      }

      const rawCol = rq + (rr - (rr & 1)) / 2;
      const col = Math.max(0, Math.min(safeColumns - 1, rawCol));
      const row = Math.max(0, Math.min(rows - 1, rr));
      const binId = `hex-${col}-${row}`;

      const existing = buckets.get(binId);
      if (existing) {
        existing.sumX += pt.x;
        existing.sumY += pt.y;
        existing.count += 1;
      } else {
        buckets.set(binId, {
          col,
          row,
          sumX: pt.x,
          sumY: pt.y,
          count: 1,
        });
      }
    }

    let maxCount = 1;
    for (const acc of buckets.values()) {
      if (acc.count > maxCount) {
        maxCount = acc.count;
      }
    }

    const totalCount = validPoints.length;
    const drawRadius = hexRadius * 0.93;
    const ringRadius = hexRadius * 0.99;

    const emptyCells: EmptyHexCell[] = [];
    const populatedBins: RenderedHexBin[] = [];
    let peakBinIndex = 0;
    let peakCount = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < safeColumns; col += 1) {
        const binId = `hex-${col}-${row}`;
        const svgX = roundTwo(originX + (col + (row % 2 === 1 ? 0.5 : 0)) * hexWidth);
        const svgY = roundTwo(originY + row * rowStepY);
        const pointsAttr = buildHexPolygonPoints(svgX, svgY, drawRadius);
        const acc = buckets.get(binId);

        if (!acc) {
          emptyCells.push({ id: binId, pointsAttr });
          continue;
        }

        const step = resolveIntensityStep(acc.count, maxCount);
        const labelFill =
          step.opacity >= 0.56 ? toneTokens.contrast : 'var(--prism-text-primary)';
        const binIndex = populatedBins.length;

        populatedBins.push({
          id: binId,
          col,
          row,
          centerX: roundTwo(acc.sumX / acc.count),
          centerY: roundTwo(acc.sumY / acc.count),
          count: acc.count,
          sharePct: roundTwo((acc.count / totalCount) * 100),
          index: binIndex,
          svgX,
          svgY,
          pointsAttr,
          ringPointsAttr: buildHexPolygonPoints(svgX, svgY, ringRadius),
          fillOpacity: step.opacity,
          intensityLevel: step.level,
          labelFill,
        });

        if (acc.count > peakCount) {
          peakCount = acc.count;
          peakBinIndex = binIndex;
        }
      }
    }

    const xTicks: AxisTick[] = X_TICK_FRACTIONS.map((frac) => ({
      key: `hx-tick-${frac}`,
      coord: roundTwo(minCellX + frac * cellSpanX),
      label: formatAxisNumber(domainMinX + frac * spanX),
    }));

    const yTicks: AxisTick[] = Y_TICK_FRACTIONS.map((frac) => ({
      key: `hy-tick-${frac}`,
      coord: roundTwo(maxCellY - frac * cellSpanY),
      label: formatAxisNumber(domainMinY + frac * spanY),
    }));

    return {
      emptyCells,
      populatedBins,
      peakBinIndex,
      xTicks,
      yTicks,
    };
  }, [validPoints, safeColumns, toneTokens.contrast]);

  const activeBin = useMemo<RenderedHexBin | null>(() => {
    if (geometry.populatedBins.length === 0) return null;
    if (selectedBinId !== null) {
      const matched = geometry.populatedBins.find((bin) => bin.id === selectedBinId);
      if (matched) return matched;
    }
    return geometry.populatedBins[geometry.peakBinIndex]!;
  }, [geometry.peakBinIndex, geometry.populatedBins, selectedBinId]);

  const selectBinAt = useCallback(
    (targetIndex: number, shouldFocus = false) => {
      const target = geometry.populatedBins[targetIndex]!;
      setSelectedBinId(target.id);
      onSelectHex?.({
        id: target.id,
        col: target.col,
        row: target.row,
        centerX: target.centerX,
        centerY: target.centerY,
        count: target.count,
        sharePct: target.sharePct,
      });
      if (shouldFocus) {
        binRefs.current.get(target.id)?.focus();
      }
    },
    [geometry.populatedBins, onSelectHex]
  );

  const handleBinKeyDown = useCallback(
    (bin: RenderedHexBin) => (event: ReactKeyboardEvent<SVGGElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectBinAt(bin.index);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevIndex = Math.max(0, bin.index - 1);
        selectBinAt(prevIndex, true);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = Math.min(geometry.populatedBins.length - 1, bin.index + 1);
        selectBinAt(nextIndex, true);
      }
    },
    [geometry.populatedBins.length, selectBinAt]
  );

  const merged = mergeProps({
    themeTarget: themeProps('hexbin-density-plot', {
      tone,
      empty: isEmpty,
      columns: safeColumns,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-3.5 min-w-0 max-w-full overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('hexbin-density-plot', 'header');
  const legendClass = stableClassName('hexbin-density-plot', 'legend');
  const wellClass = stableClassName('hexbin-density-plot', 'well');
  const svgClass = stableClassName('hexbin-density-plot', 'svg');
  const inspectorClass = stableClassName('hexbin-density-plot', 'inspector');

  const pointSummary = validPoints.length === 1 ? '1 point' : `${validPoints.length} points`;
  const binSummary =
    geometry.populatedBins.length === 1
      ? '1 populated bin'
      : `${geometry.populatedBins.length} populated bins`;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h4
            id={headingId}
            className="text-sm font-semibold tracking-tight min-w-0"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </h4>
          <span
            data-testid="hexbin-telemetry-pill"
            className="prism-crystal rounded-full px-2.5 py-0.5 text-[11px] font-mono tabular-nums font-medium shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {`${pointSummary} · ${binSummary}`}
          </span>
        </div>

        <div
          data-testid="hexbin-legend"
          aria-label="Density intensity scale from low to peak"
          className={cx(
            legendClass,
            'prism-crystal px-2.5 py-1 rounded-full inline-flex flex-wrap items-center gap-1.5 text-[11px] font-medium shrink-0'
          )}
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          <span>Low</span>
          <span className="inline-flex items-center gap-1" aria-hidden="true">
            {INTENSITY_STEPS.map((step) => (
              <span
                key={step.id}
                data-role="hexbin-legend-step"
                data-level={String(step.level)}
                data-opacity={String(step.opacity)}
                className="prism-well relative overflow-hidden w-3.5 h-3.5 rounded-[4px] inline-block"
              >
                <span
                  className="absolute inset-0"
                  style={{
                    backgroundColor: toneTokens.main,
                    opacity: step.opacity,
                  }}
                />
              </span>
            ))}
          </span>
          <span>Peak</span>
        </div>
      </div>

      {!activeBin ? (
        <div
          role="status"
          data-testid="hexbin-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium min-w-0 max-w-full"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No spatial points available for hexagonal aggregation.
        </div>
      ) : (
        <>
          <div
            className={cx(
              wellClass,
              'prism-well rounded-2xl p-2.5 sm:p-3 min-w-0 max-w-full overflow-hidden'
            )}
          >
            <svg
              role="img"
              aria-label={`${title} hexbin density plot aggregating ${pointSummary} into ${binSummary}`}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none block')}
            >
              <g data-role="hexbin-axes" aria-hidden="true">
                <line
                  x1={PLOT_LEFT - 4}
                  y1={PLOT_TOP}
                  x2={PLOT_LEFT - 4}
                  y2={PLOT_BOTTOM + 2}
                  stroke="var(--prism-divider)"
                  strokeWidth={1}
                />
                <line
                  x1={PLOT_LEFT - 4}
                  y1={PLOT_BOTTOM + 2}
                  x2={PLOT_RIGHT + 2}
                  y2={PLOT_BOTTOM + 2}
                  stroke="var(--prism-divider)"
                  strokeWidth={1}
                />

                {geometry.xTicks.map((tick) => (
                  <text
                    key={tick.key}
                    data-role="hexbin-x-tick"
                    x={tick.coord}
                    y={PLOT_BOTTOM + 15}
                    textAnchor="middle"
                    fill="var(--prism-text-secondary)"
                    className="text-[8.5px] font-mono tabular-nums"
                  >
                    {tick.label}
                  </text>
                ))}

                {geometry.yTicks.map((tick) => (
                  <text
                    key={tick.key}
                    data-role="hexbin-y-tick"
                    x={PLOT_LEFT - 8}
                    y={tick.coord + 3}
                    textAnchor="end"
                    fill="var(--prism-text-secondary)"
                    className="text-[8.5px] font-mono tabular-nums"
                  >
                    {tick.label}
                  </text>
                ))}

                <text
                  data-role="hexbin-x-label"
                  x={roundTwo((PLOT_LEFT + PLOT_RIGHT) / 2)}
                  y={SVG_HEIGHT - 6}
                  textAnchor="middle"
                  fill="var(--prism-text-secondary)"
                  className="text-[9.5px] font-medium"
                >
                  {xLabel}
                </text>

                <text
                  data-role="hexbin-y-label"
                  x={13}
                  y={roundTwo((PLOT_TOP + PLOT_BOTTOM) / 2)}
                  transform={`rotate(-90 13 ${roundTwo((PLOT_TOP + PLOT_BOTTOM) / 2)})`}
                  textAnchor="middle"
                  fill="var(--prism-text-secondary)"
                  className="text-[9.5px] font-medium"
                >
                  {yLabel}
                </text>
              </g>

              <g data-role="hexbin-empty-grid" aria-hidden="true">
                {geometry.emptyCells.map((cell) => (
                  <polygon
                    key={cell.id}
                    data-role="hexbin-empty-cell"
                    points={cell.pointsAttr}
                    fill="var(--prism-divider)"
                    fillOpacity={0.22}
                    stroke="var(--prism-divider)"
                    strokeWidth={0.9}
                    strokeOpacity={0.75}
                  />
                ))}
              </g>

              <g data-role="hexbin-populated-layer">
                {geometry.populatedBins.map((bin) => {
                  const isSelected = activeBin.id === bin.id;
                  const countUnit = bin.count === 1 ? 'point' : 'points';
                  const ariaSummary = `Hex Bin (${bin.col}, ${bin.row}), center (${formatCenterNumber(bin.centerX)}, ${formatCenterNumber(bin.centerY)}), ${bin.count} ${countUnit}, ${bin.sharePct.toFixed(1)}% share`;

                  return (
                    <g
                      key={bin.id}
                      ref={(node) => {
                        if (node) {
                          binRefs.current.set(bin.id, node);
                        } else {
                          binRefs.current.delete(bin.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={ariaSummary}
                      data-testid={`hexbin-cell-${bin.id}`}
                      data-bin-id={bin.id}
                      data-col={String(bin.col)}
                      data-row={String(bin.row)}
                      data-count={String(bin.count)}
                      data-level={String(bin.intensityLevel)}
                      data-selected={isSelected ? 'true' : 'false'}
                      className="prism-focus-ring cursor-pointer"
                      onClick={() => selectBinAt(bin.index)}
                      onKeyDown={handleBinKeyDown(bin)}
                    >
                      <polygon
                        data-role="hexbin-polygon"
                        points={bin.pointsAttr}
                        fill={toneTokens.main}
                        fillOpacity={bin.fillOpacity}
                        stroke={isSelected ? 'var(--prism-text-primary)' : toneTokens.main}
                        strokeWidth={isSelected ? 1.8 : 1}
                        strokeOpacity={isSelected ? 1 : 0.72}
                      />
                      {bin.count >= 2 ? (
                        <text
                          data-role="hexbin-count-label"
                          x={bin.svgX}
                          y={roundTwo(bin.svgY + 3.2)}
                          textAnchor="middle"
                          fill={bin.labelFill}
                          pointerEvents="none"
                          className="text-[9px] font-mono font-semibold tabular-nums"
                        >
                          {bin.count}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>

              <polygon
                data-role="hexbin-selection-ring"
                points={activeBin.ringPointsAttr}
                fill="none"
                stroke="var(--prism-text-primary)"
                strokeWidth={1.75}
                strokeOpacity={0.95}
                pointerEvents="none"
              />
            </svg>
          </div>

          <div
            data-testid="hexbin-inspector"
            aria-live="polite"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs tabular-nums min-w-0 max-w-full'
            )}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            <span className="inline-flex items-center gap-1.5 font-semibold min-w-0">
              <span
                aria-hidden="true"
                className="prism-well relative overflow-hidden w-2.5 h-2.5 rounded-[3px] shrink-0"
              >
                <span
                  className="absolute inset-0"
                  style={{
                    backgroundColor: toneTokens.main,
                    opacity: activeBin.fillOpacity,
                  }}
                />
              </span>
              <span data-testid="inspector-bin">{`Hex Bin (${activeBin.col}, ${activeBin.row})`}</span>
            </span>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] min-w-0">
              <span data-testid="inspector-center">
                {`Center (${formatCenterNumber(activeBin.centerX)}, ${formatCenterNumber(activeBin.centerY)})`}
              </span>
              <span aria-hidden="true" style={{ color: 'var(--prism-text-disabled)' }}>
                ·
              </span>
              <span data-testid="inspector-count">
                {`${activeBin.count} ${activeBin.count === 1 ? 'point' : 'points'}`}
              </span>
              <span aria-hidden="true" style={{ color: 'var(--prism-text-disabled)' }}>
                ·
              </span>
              <span
                data-testid="inspector-share"
                className="font-semibold"
                style={{ color: toneTokens.main }}
              >
                {`${activeBin.sharePct.toFixed(1)}% share`}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

HexbinDensityPlot.displayName = 'HexbinDensityPlot';
