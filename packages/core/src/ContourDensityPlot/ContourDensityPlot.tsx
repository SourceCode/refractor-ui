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

export type ContourTone = 'primary' | 'secondary' | 'emerald' | 'info';

export interface ContourSamplePoint {
  /** Optional unique identifier for this 2D sample observation. */
  id?: string;
  /** Finite horizontal coordinate. */
  x: number;
  /** Finite vertical coordinate. */
  y: number;
  /** Optional positive observation weight (defaults to 1). */
  weight?: number;
}

export interface ContourCellReading {
  /** Zero-based grid row index (0 = top / highest Y). */
  row: number;
  /** Zero-based grid column index (0 = left / lowest X). */
  col: number;
  /** Data-space X coordinate at the cell center. */
  x: number;
  /** Data-space Y coordinate at the cell center. */
  y: number;
  /** Peak-normalized Gaussian kernel density in [0, 1]. */
  density: number;
  /** Quantized contour density band index in [1..levels]. */
  level: number;
}

export interface ContourDensityPlotProps extends BaseProps<HTMLDivElement> {
  /** 2D sample observations; defaults to a 32-point bimodal optical sensor cluster when omitted. */
  points?: ReadonlyArray<ContourSamplePoint>;
  /** Number of quantized isoline density bands (defaults to 5, clamped to 3..8). */
  levels?: number;
  /** Whether to overlay scatter sample markers over the contour field (defaults to true). */
  showPoints?: boolean;
  /** Semantic optical tone ramp derived strictly from --prism-* tokens (defaults to 'primary'). */
  tone?: ContourTone;
  /** Horizontal axis label (defaults to 'X Axis'). */
  xLabel?: string;
  /** Vertical axis label (defaults to 'Y Axis'). */
  yLabel?: string;
  /** Card heading rendered in the prism-slab header (defaults to '2D Contour Density Plot'). */
  title?: string;
  /** Callback fired when a user clicks or keyboard-navigates to a contour density probe cell. */
  onSelectCell?: (cell: ContourCellReading) => void;
}

interface ToneTokens {
  main: string;
  dark: string;
  contrast: string;
}

interface SanitizedPoint {
  key: string;
  x: number;
  y: number;
  weight: number;
}

interface ProjectedPoint {
  key: string;
  svgX: number;
  svgY: number;
  radius: number;
}

interface ComputedCell extends ContourCellReading {
  key: string;
  coordKey: string;
  rectX: number;
  rectY: number;
  rectW: number;
  rectH: number;
  centerX: number;
  centerY: number;
  opacity: number;
}

interface ContourIsoline {
  key: string;
  level: number;
  d: string;
  strokeWidth: number;
  strokeOpacity: number;
}

interface AxisTick {
  key: string;
  pos: number;
  label: string;
}

interface LegendBand {
  key: string;
  level: number;
  opacity: number;
}

interface GridSelection {
  row: number;
  col: number;
}

interface ComputedContourField {
  cells: ReadonlyArray<ComputedCell>;
  isolines: ReadonlyArray<ContourIsoline>;
  projectedPoints: ReadonlyArray<ProjectedPoint>;
  xTicks: ReadonlyArray<AxisTick>;
  yTicks: ReadonlyArray<AxisTick>;
  peakCell: ComputedCell;
  peakRawDensity: number;
}

type EdgeId = 0 | 1 | 2 | 3;

export const CONTOUR_GRID_COLS = 16;
export const CONTOUR_GRID_ROWS = 12;

/**
 * Default realistic bimodal 2D optical sensor cluster (32 observations).
 * Mode A centers around (28, 36) and Mode B centers around (71, 68).
 */
export const DEFAULT_CONTOUR_POINTS: ReadonlyArray<ContourSamplePoint> = [
  { id: 'sensor-01', x: 24.2, y: 31.4, weight: 1.0 },
  { id: 'sensor-02', x: 26.8, y: 34.1, weight: 1.2 },
  { id: 'sensor-03', x: 28.4, y: 36.2, weight: 1.35 },
  { id: 'sensor-04', x: 29.5, y: 35.4, weight: 1.3 },
  { id: 'sensor-05', x: 31.1, y: 37.8, weight: 1.15 },
  { id: 'sensor-06', x: 27.3, y: 39.0, weight: 1.05 },
  { id: 'sensor-07', x: 25.1, y: 37.2, weight: 0.95 },
  { id: 'sensor-08', x: 32.6, y: 33.6, weight: 1.0 },
  { id: 'sensor-09', x: 22.8, y: 35.5, weight: 0.9 },
  { id: 'sensor-10', x: 30.2, y: 32.1, weight: 1.1 },
  { id: 'sensor-11', x: 28.9, y: 40.8, weight: 0.95 },
  { id: 'sensor-12', x: 34.4, y: 38.9, weight: 0.85 },
  { id: 'sensor-13', x: 20.6, y: 29.8, weight: 0.8 },
  { id: 'sensor-14', x: 26.0, y: 28.4, weight: 0.9 },
  { id: 'sensor-15', x: 35.8, y: 43.2, weight: 0.85 },
  { id: 'sensor-16', x: 41.2, y: 47.6, weight: 0.8 },
  { id: 'sensor-17', x: 66.5, y: 63.4, weight: 1.05 },
  { id: 'sensor-18', x: 69.2, y: 66.8, weight: 1.25 },
  { id: 'sensor-19', x: 71.4, y: 68.5, weight: 1.35 },
  { id: 'sensor-20', x: 72.8, y: 67.2, weight: 1.3 },
  { id: 'sensor-21', x: 70.1, y: 70.4, weight: 1.2 },
  { id: 'sensor-22', x: 74.6, y: 71.2, weight: 1.1 },
  { id: 'sensor-23', x: 67.8, y: 71.9, weight: 1.0 },
  { id: 'sensor-24', x: 75.3, y: 65.1, weight: 1.0 },
  { id: 'sensor-25', x: 64.1, y: 66.2, weight: 0.9 },
  { id: 'sensor-26', x: 73.2, y: 62.6, weight: 0.95 },
  { id: 'sensor-27', x: 77.9, y: 69.4, weight: 0.9 },
  { id: 'sensor-28', x: 68.7, y: 75.3, weight: 0.85 },
  { id: 'sensor-29', x: 79.4, y: 74.1, weight: 0.8 },
  { id: 'sensor-30', x: 62.3, y: 60.8, weight: 0.85 },
  { id: 'sensor-31', x: 56.8, y: 57.4, weight: 0.8 },
  { id: 'sensor-32', x: 82.1, y: 66.8, weight: 0.75 },
];

const SVG_WIDTH = 420;
const SVG_HEIGHT = 260;
const PAD_TOP = 16;
const PAD_RIGHT = 18;
const PAD_BOTTOM = 44;
const PAD_LEFT = 52;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;
const CELL_WIDTH = PLOT_WIDTH / CONTOUR_GRID_COLS;
const CELL_HEIGHT = PLOT_HEIGHT / CONTOUR_GRID_ROWS;

const MIN_LEVELS = 3;
const MAX_LEVELS = 8;
const DEFAULT_LEVELS = 5;

const TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];

const TONE_TOKEN_MAP: Record<ContourTone, ToneTokens> = {
  primary: {
    main: 'var(--prism-primary-main)',
    dark: 'var(--prism-primary-dark)',
    contrast: 'var(--prism-primary-contrast)',
  },
  secondary: {
    main: 'var(--prism-secondary-main)',
    dark: 'var(--prism-secondary-dark)',
    contrast: 'var(--prism-secondary-contrast)',
  },
  emerald: {
    main: 'var(--prism-success-main)',
    dark: 'var(--prism-success-dark)',
    contrast: 'var(--prism-success-contrast)',
  },
  info: {
    main: 'var(--prism-info-main)',
    dark: 'var(--prism-info-dark)',
    contrast: 'var(--prism-info-contrast)',
  },
};

/**
 * Marching-squares edge connectivity table indexed by 4-bit corner mask:
 * bit 3 (8) = top-left, bit 2 (4) = top-right, bit 1 (2) = bottom-right, bit 0 (1) = bottom-left.
 * Edges: 0 = top, 1 = right, 2 = bottom, 3 = left.
 */
const MARCHING_EDGES: ReadonlyArray<ReadonlyArray<readonly [EdgeId, EdgeId]>> = [
  [],
  [[3, 2]],
  [[2, 1]],
  [[3, 1]],
  [[0, 1]],
  [
    [3, 0],
    [2, 1],
  ],
  [[0, 2]],
  [[3, 0]],
  [[3, 0]],
  [[0, 2]],
  [
    [3, 2],
    [0, 1],
  ],
  [[0, 1]],
  [[3, 1]],
  [[2, 1]],
  [[3, 2]],
  [],
];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundThree(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function formatNumber(value: number): string {
  const safe = normalizeZero(value);
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(1)));
}

function computeLevelOpacity(level: number, totalLevels: number): number {
  const ratio = (level - 1) / (totalLevels - 1);
  return roundTwo(0.08 + ratio * 0.68);
}

function sanitizePoints(source: ReadonlyArray<ContourSamplePoint>): SanitizedPoint[] {
  const valid: SanitizedPoint[] = [];
  for (let idx = 0; idx < source.length; idx += 1) {
    const pt = source[idx]!;
    if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
      continue;
    }
    const weight =
      typeof pt.weight === 'number' && Number.isFinite(pt.weight) && pt.weight > 0
        ? pt.weight
        : 1;
    const trimmedId = pt.id?.trim();
    const idToken = trimmedId ? trimmedId : `pt-${idx}`;
    valid.push({
      key: `sample-${idToken}-${idx}`,
      x: normalizeZero(pt.x),
      y: normalizeZero(pt.y),
      weight,
    });
  }
  return valid;
}

function computeContourField(
  validPoints: ReadonlyArray<SanitizedPoint>,
  safeLevels: number
): ComputedContourField | null {
  if (validPoints.length === 0) {
    return null;
  }

  let rawMinX = Number.POSITIVE_INFINITY;
  let rawMaxX = Number.NEGATIVE_INFINITY;
  let rawMinY = Number.POSITIVE_INFINITY;
  let rawMaxY = Number.NEGATIVE_INFINITY;
  let totalWeight = 0;

  for (const pt of validPoints) {
    if (pt.x < rawMinX) rawMinX = pt.x;
    if (pt.x > rawMaxX) rawMaxX = pt.x;
    if (pt.y < rawMinY) rawMinY = pt.y;
    if (pt.y > rawMaxY) rawMaxY = pt.y;
    totalWeight += pt.weight;
  }

  const padX =
    rawMaxX === rawMinX
      ? rawMinX === 0
        ? 1
        : Math.abs(rawMinX) * 0.15
      : (rawMaxX - rawMinX) * 0.14;
  const padY =
    rawMaxY === rawMinY
      ? rawMinY === 0
        ? 1
        : Math.abs(rawMinY) * 0.15
      : (rawMaxY - rawMinY) * 0.14;

  const xMin = rawMinX - padX;
  const xMax = rawMaxX + padX;
  const yMin = rawMinY - padY;
  const yMax = rawMaxY + padY;
  const spanX = xMax - xMin;
  const spanY = yMax - yMin;

  const normalizedSamples = validPoints.map((pt) => ({
    key: pt.key,
    u: (pt.x - xMin) / spanX,
    v: (pt.y - yMin) / spanY,
    weight: pt.weight,
  }));

  const sigma = clampNumber(0.24 * Math.pow(validPoints.length, -1 / 6), 0.09, 0.18, 0.13);
  const twoSigmaSq = 2 * sigma * sigma;
  const kernelNorm = 1 / (totalWeight * 2 * Math.PI * sigma * sigma);

  const evaluateRawDensity = (u: number, v: number): number => {
    let sum = 0;
    for (const sample of normalizedSamples) {
      const du = u - sample.u;
      const dv = v - sample.v;
      sum += sample.weight * Math.exp(-(du * du + dv * dv) / twoSigmaSq);
    }
    return sum * kernelNorm;
  };

  // Evaluate raw 2D Gaussian kernel density at every cell center
  const rawCellDensities: number[] = [];
  let peakRawDensity = 0;
  let peakIndex = 0;

  for (let row = 0; row < CONTOUR_GRID_ROWS; row += 1) {
    const v = 1 - (row + 0.5) / CONTOUR_GRID_ROWS;
    for (let col = 0; col < CONTOUR_GRID_COLS; col += 1) {
      const u = (col + 0.5) / CONTOUR_GRID_COLS;
      const raw = evaluateRawDensity(u, v);
      const flatIdx = rawCellDensities.length;
      rawCellDensities.push(raw);
      if (raw > peakRawDensity) {
        peakRawDensity = raw;
        peakIndex = flatIdx;
      }
    }
  }

  // Build quantized contour density cells
  const cells: ComputedCell[] = [];
  for (let row = 0; row < CONTOUR_GRID_ROWS; row += 1) {
    const v = 1 - (row + 0.5) / CONTOUR_GRID_ROWS;
    const dataY = normalizeZero(yMin + v * spanY);
    const rectY = roundTwo(PAD_TOP + row * CELL_HEIGHT);
    const centerY = roundTwo(PAD_TOP + (row + 0.5) * CELL_HEIGHT);

    for (let col = 0; col < CONTOUR_GRID_COLS; col += 1) {
      const u = (col + 0.5) / CONTOUR_GRID_COLS;
      const dataX = normalizeZero(xMin + u * spanX);
      const rectX = roundTwo(PAD_LEFT + col * CELL_WIDTH);
      const centerX = roundTwo(PAD_LEFT + (col + 0.5) * CELL_WIDTH);

      const raw = rawCellDensities[row * CONTOUR_GRID_COLS + col]!;
      const normDensity = clampNumber(raw / peakRawDensity, 0, 1, 0);
      const density = roundThree(normDensity);
      const level = Math.min(safeLevels, Math.max(1, Math.floor(normDensity * safeLevels) + 1));

      cells.push({
        key: `contour-cell-${row}-${col}`,
        coordKey: `${row}:${col}`,
        row,
        col,
        x: roundTwo(dataX),
        y: roundTwo(dataY),
        density,
        level,
        rectX,
        rectY,
        rectW: roundTwo(CELL_WIDTH),
        rectH: roundTwo(CELL_HEIGHT),
        centerX,
        centerY,
        opacity: computeLevelOpacity(level, safeLevels),
      });
    }
  }

  const peakCell = cells[peakIndex]!;

  // Evaluate normalized corner vertices for smooth Marching-Squares isolines
  const vertexCols = CONTOUR_GRID_COLS + 1;
  const vertexRows = CONTOUR_GRID_ROWS + 1;
  const vertexNorm: number[] = [];

  for (let vr = 0; vr < vertexRows; vr += 1) {
    const v = 1 - vr / CONTOUR_GRID_ROWS;
    for (let vc = 0; vc < vertexCols; vc += 1) {
      const u = vc / CONTOUR_GRID_COLS;
      const raw = evaluateRawDensity(u, v);
      vertexNorm.push(clampNumber(raw / peakRawDensity, 0, 1, 0));
    }
  }

  const isolines: ContourIsoline[] = [];
  for (let band = 1; band < safeLevels; band += 1) {
    const threshold = band / safeLevels;
    const segments: string[] = [];

    for (let row = 0; row < CONTOUR_GRID_ROWS; row += 1) {
      const y0 = PAD_TOP + row * CELL_HEIGHT;
      const topRowOffset = row * vertexCols;
      const botRowOffset = (row + 1) * vertexCols;

      for (let col = 0; col < CONTOUR_GRID_COLS; col += 1) {
        const tl = vertexNorm[topRowOffset + col]!;
        const tr = vertexNorm[topRowOffset + col + 1]!;
        const br = vertexNorm[botRowOffset + col + 1]!;
        const bl = vertexNorm[botRowOffset + col]!;

        const mask =
          (tl >= threshold ? 8 : 0) |
          (tr >= threshold ? 4 : 0) |
          (br >= threshold ? 2 : 0) |
          (bl >= threshold ? 1 : 0);

        const pairs = MARCHING_EDGES[mask]!;
        if (pairs.length === 0) continue;

        const x0 = PAD_LEFT + col * CELL_WIDTH;

        const resolveEdgePoint = (edge: EdgeId): readonly [number, number] => {
          if (edge === 0) {
            const t = clampNumber((threshold - tl) / (tr - tl), 0, 1, 0.5);
            return [x0 + t * CELL_WIDTH, y0];
          }
          if (edge === 1) {
            const t = clampNumber((threshold - tr) / (br - tr), 0, 1, 0.5);
            return [x0 + CELL_WIDTH, y0 + t * CELL_HEIGHT];
          }
          if (edge === 2) {
            const t = clampNumber((threshold - bl) / (br - bl), 0, 1, 0.5);
            return [x0 + t * CELL_WIDTH, y0 + CELL_HEIGHT];
          }
          const t = clampNumber((threshold - tl) / (bl - tl), 0, 1, 0.5);
          return [x0, y0 + t * CELL_HEIGHT];
        };

        for (const [edgeA, edgeB] of pairs) {
          const [ax, ay] = resolveEdgePoint(edgeA);
          const [bx, by] = resolveEdgePoint(edgeB);
          segments.push(`M ${roundTwo(ax)} ${roundTwo(ay)} L ${roundTwo(bx)} ${roundTwo(by)}`);
        }
      }
    }

    if (segments.length > 0) {
      const bandRatio = band / (safeLevels - 1);
      isolines.push({
        key: `contour-isoline-L${band + 1}`,
        level: band + 1,
        d: segments.join(' '),
        strokeWidth: roundTwo(0.95 + bandRatio * 0.65),
        strokeOpacity: roundTwo(0.42 + bandRatio * 0.45),
      });
    }
  }

  const projectedPoints: ProjectedPoint[] = normalizedSamples.map((sample) => ({
    key: sample.key,
    svgX: roundTwo(PAD_LEFT + sample.u * PLOT_WIDTH),
    svgY: roundTwo(PAD_TOP + (1 - sample.v) * PLOT_HEIGHT),
    radius: roundTwo(clampNumber(2.1 + sample.weight * 0.75, 2.2, 4.2, 2.8)),
  }));

  const xTicks: AxisTick[] = TICK_FRACTIONS.map((frac) => ({
    key: `contour-xtick-${frac}`,
    pos: roundTwo(PAD_LEFT + frac * PLOT_WIDTH),
    label: formatNumber(xMin + frac * spanX),
  }));

  const yTicks: AxisTick[] = TICK_FRACTIONS.map((frac) => ({
    key: `contour-ytick-${frac}`,
    pos: roundTwo(PAD_TOP + (1 - frac) * PLOT_HEIGHT),
    label: formatNumber(yMin + frac * spanY),
  }));

  return {
    cells,
    isolines,
    projectedPoints,
    xTicks,
    yTicks,
    peakCell,
    peakRawDensity: roundTwo(peakRawDensity),
  };
}

export function ContourDensityPlot({
  points,
  levels = DEFAULT_LEVELS,
  showPoints = true,
  tone = 'primary',
  xLabel = 'X Axis',
  yLabel = 'Y Axis',
  title = '2D Contour Density Plot',
  onSelectCell,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ContourDensityPlotProps) {
  const headingId = useId();
  const override = useComponentOverride('ContourDensityPlot');
  const cellRefs = useRef<Map<string, SVGRectElement>>(new Map());

  const [pointsVisible, setPointsVisible] = useState<boolean>(showPoints);
  const [prevShowPointsProp, setPrevShowPointsProp] = useState<boolean>(showPoints);
  if (prevShowPointsProp !== showPoints) {
    setPrevShowPointsProp(showPoints);
    setPointsVisible(showPoints);
  }

  const [selectedCoord, setSelectedCoord] = useState<GridSelection | null>(null);

  const safeLevels = Math.round(clampNumber(levels, MIN_LEVELS, MAX_LEVELS, DEFAULT_LEVELS));
  const toneTokens = TONE_TOKEN_MAP[tone];

  const sourcePoints = points === undefined ? DEFAULT_CONTOUR_POINTS : points;
  const validPoints = useMemo(() => sanitizePoints(sourcePoints), [sourcePoints]);

  const field = useMemo(
    () => computeContourField(validPoints, safeLevels),
    [validPoints, safeLevels]
  );

  const legendBands = useMemo<ReadonlyArray<LegendBand>>(() => {
    const items: LegendBand[] = [];
    for (let lvl = 1; lvl <= safeLevels; lvl += 1) {
      items.push({
        key: `legend-L${lvl}`,
        level: lvl,
        opacity: computeLevelOpacity(lvl, safeLevels),
      });
    }
    return items;
  }, [safeLevels]);

  const isEmpty = field === null;

  const handleSelectCell = useCallback(
    (cell: ComputedCell) => {
      setSelectedCoord({ row: cell.row, col: cell.col });
      onSelectCell?.({
        row: cell.row,
        col: cell.col,
        x: cell.x,
        y: cell.y,
        density: cell.density,
        level: cell.level,
      });
    },
    [onSelectCell]
  );

  const handleCellKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<SVGRectElement>,
      cell: ComputedCell,
      cells: ReadonlyArray<ComputedCell>
    ) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectCell(cell);
        return;
      }

      let nextRow = cell.row;
      let nextCol = cell.col;

      if (event.key === 'ArrowLeft') {
        nextCol = Math.max(0, cell.col - 1);
      } else if (event.key === 'ArrowRight') {
        nextCol = Math.min(CONTOUR_GRID_COLS - 1, cell.col + 1);
      } else if (event.key === 'ArrowUp') {
        nextRow = Math.max(0, cell.row - 1);
      } else if (event.key === 'ArrowDown') {
        nextRow = Math.min(CONTOUR_GRID_ROWS - 1, cell.row + 1);
      } else {
        return;
      }

      event.preventDefault();
      if (nextRow === cell.row && nextCol === cell.col) return;

      const targetCell = cells[nextRow * CONTOUR_GRID_COLS + nextCol]!;
      handleSelectCell(targetCell);
      cellRefs.current.get(targetCell.coordKey)?.focus();
    },
    [handleSelectCell]
  );

  const merged = mergeProps({
    themeTarget: themeProps('contour-density-plot', {
      tone,
      levels: safeLevels,
      showPoints: pointsVisible,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-3.5 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('contour-density-plot', 'header');
  const legendClass = stableClassName('contour-density-plot', 'legend');
  const canvasClass = stableClassName('contour-density-plot', 'canvas');
  const svgClass = stableClassName('contour-density-plot', 'svg');
  const readoutClass = stableClassName('contour-density-plot', 'readout');

  const sampleBadgeLabel =
    validPoints.length === 1 ? '1 sample' : `${validPoints.length} samples`;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'space-y-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            <h4
              id={headingId}
              className="text-sm font-semibold tracking-tight truncate max-w-full"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {title}
            </h4>
            <span
              data-testid="contour-sample-count"
              className="prism-crystal rounded-full px-2.5 py-0.5 text-[11px] font-mono tabular-nums font-medium shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {sampleBadgeLabel}
            </span>
          </div>

          {!isEmpty ? (
            <button
              type="button"
              aria-pressed={pointsVisible}
              data-testid="contour-toggle-points"
              onClick={() => setPointsVisible((prev) => !prev)}
              className={cx(
                'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-all shrink-0',
                pointsVisible ? 'prism-crystal' : 'prism-well opacity-70'
              )}
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: pointsVisible
                    ? toneTokens.main
                    : 'var(--prism-text-disabled)',
                }}
              />
              <span>Show Points</span>
            </button>
          ) : null}
        </div>

        <div
          data-testid="contour-level-legend"
          aria-label={`Quantized contour density bands L1 to L${safeLevels}`}
          className={cx(
            legendClass,
            'prism-crystal rounded-full px-3 py-1 inline-flex flex-wrap items-center gap-2 text-[11px] font-medium max-w-full'
          )}
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          <span>Density</span>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {legendBands.map((band) => (
              <span
                key={band.key}
                data-role="contour-legend-band"
                data-level={String(band.level)}
                data-opacity={String(band.opacity)}
                className="inline-flex items-center gap-1 font-mono text-[10px] tabular-nums"
              >
                <span className="prism-well relative overflow-hidden w-3 h-3 rounded-[3px] inline-block shrink-0">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      backgroundColor: toneTokens.main,
                      opacity: band.opacity,
                    }}
                  />
                </span>
                <span>{`L${band.level}`}</span>
              </span>
            ))}
          </span>
        </div>
      </div>

      {field === null ? (
        <div
          role="status"
          data-testid="contour-density-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No 2D sample observations available to compute contour density.
        </div>
      ) : (() => {
        const activeCell =
          selectedCoord === null
            ? field.peakCell
            : field.cells[selectedCoord.row * CONTOUR_GRID_COLS + selectedCoord.col]!;
        return (
        <>
          <div
            className={cx(
              canvasClass,
              'prism-well rounded-2xl p-2 sm:p-3 w-full max-w-full min-w-0 overflow-hidden'
            )}
          >
            <svg
              role="img"
              aria-label={`${title} 2D contour density plot with ${validPoints.length} samples across ${safeLevels} density bands`}
              data-testid="contour-density-svg"
              data-tone={tone}
              data-levels={String(safeLevels)}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none block')}
            >
              <rect
                x={PAD_LEFT}
                y={PAD_TOP}
                width={PLOT_WIDTH}
                height={PLOT_HEIGHT}
                rx={4}
                fill="var(--prism-bg-start)"
                fillOpacity={0.35}
                stroke="var(--prism-divider)"
                strokeWidth={1}
              />

              <g data-testid="contour-cells-layer">
                {field.cells.map((cell) => {
                  const isActive =
                    activeCell.row === cell.row && activeCell.col === cell.col;

                  return (
                    <rect
                      key={cell.key}
                      ref={(node) => {
                        if (node) {
                          cellRefs.current.set(cell.coordKey, node);
                        } else {
                          cellRefs.current.delete(cell.coordKey);
                        }
                      }}
                      role="button"
                      tabIndex={isActive ? 0 : -1}
                      aria-pressed={isActive}
                      aria-label={`Row ${cell.row + 1}, Col ${cell.col + 1}: Coord (${formatNumber(cell.x)}, ${formatNumber(cell.y)}), Normalized Density ${cell.density.toFixed(2)}, Contour Band L${cell.level}`}
                      data-role="contour-cell"
                      data-row={String(cell.row)}
                      data-col={String(cell.col)}
                      data-level={String(cell.level)}
                      data-density={cell.density.toFixed(3)}
                      data-selected={isActive ? 'true' : 'false'}
                      x={cell.rectX}
                      y={cell.rectY}
                      width={cell.rectW}
                      height={cell.rectH}
                      fill={toneTokens.main}
                      fillOpacity={cell.opacity}
                      stroke="var(--prism-divider)"
                      strokeWidth={0.35}
                      strokeOpacity={0.35}
                      className="prism-focus-ring cursor-pointer"
                      onClick={() => handleSelectCell(cell)}
                      onKeyDown={(event) => handleCellKeyDown(event, cell, field.cells)}
                    />
                  );
                })}
              </g>

              <g data-testid="contour-isolines-layer" pointerEvents="none" aria-hidden="true">
                {field.isolines.map((isoline) => (
                  <path
                    key={isoline.key}
                    data-role="contour-isoline"
                    data-level={String(isoline.level)}
                    d={isoline.d}
                    fill="none"
                    stroke={toneTokens.dark}
                    strokeWidth={isoline.strokeWidth}
                    strokeOpacity={isoline.strokeOpacity}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </g>

              {pointsVisible ? (
                <g data-testid="contour-points-layer" pointerEvents="none" aria-hidden="true">
                  {field.projectedPoints.map((pt) => (
                    <circle
                      key={pt.key}
                      data-role="contour-sample-point"
                      cx={pt.svgX}
                      cy={pt.svgY}
                      r={pt.radius}
                      fill="var(--prism-bg-start)"
                      fillOpacity={0.86}
                      stroke="var(--prism-text-primary)"
                      strokeWidth={1.1}
                      strokeOpacity={0.85}
                    />
                  ))}
                </g>
              ) : null}

              <g data-testid="contour-active-highlight" pointerEvents="none" aria-hidden="true">
                <rect
                  x={activeCell.rectX}
                  y={activeCell.rectY}
                  width={activeCell.rectW}
                  height={activeCell.rectH}
                  rx={2}
                  fill="none"
                  stroke="var(--prism-text-primary)"
                  strokeWidth={1.5}
                />
                <circle
                  cx={activeCell.centerX}
                  cy={activeCell.centerY}
                  r={2.2}
                  fill={toneTokens.contrast}
                  stroke="var(--prism-text-primary)"
                  strokeWidth={1}
                />
              </g>

              <g data-testid="contour-axes-layer" aria-hidden="true">
                <line
                  x1={PAD_LEFT}
                  y1={PAD_TOP + PLOT_HEIGHT}
                  x2={PAD_LEFT + PLOT_WIDTH}
                  y2={PAD_TOP + PLOT_HEIGHT}
                  stroke="var(--prism-divider)"
                  strokeWidth={1.2}
                />
                <line
                  x1={PAD_LEFT}
                  y1={PAD_TOP}
                  x2={PAD_LEFT}
                  y2={PAD_TOP + PLOT_HEIGHT}
                  stroke="var(--prism-divider)"
                  strokeWidth={1.2}
                />

                {field.xTicks.map((tick) => (
                  <g key={tick.key}>
                    <line
                      x1={tick.pos}
                      y1={PAD_TOP + PLOT_HEIGHT}
                      x2={tick.pos}
                      y2={PAD_TOP + PLOT_HEIGHT + 4}
                      stroke="var(--prism-divider)"
                      strokeWidth={1}
                    />
                    <text
                      x={tick.pos}
                      y={PAD_TOP + PLOT_HEIGHT + 15}
                      textAnchor="middle"
                      fill="var(--prism-text-secondary)"
                      className="text-[9px] font-mono tabular-nums"
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}

                {field.yTicks.map((tick) => (
                  <g key={tick.key}>
                    <line
                      x1={PAD_LEFT - 4}
                      y1={tick.pos}
                      x2={PAD_LEFT}
                      y2={tick.pos}
                      stroke="var(--prism-divider)"
                      strokeWidth={1}
                    />
                    <text
                      x={PAD_LEFT - 7}
                      y={tick.pos + 3}
                      textAnchor="end"
                      fill="var(--prism-text-secondary)"
                      className="text-[9px] font-mono tabular-nums"
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}

                <text
                  data-testid="contour-x-label"
                  x={roundTwo(PAD_LEFT + PLOT_WIDTH / 2)}
                  y={SVG_HEIGHT - 8}
                  textAnchor="middle"
                  fill="var(--prism-text-primary)"
                  className="text-[10px] font-medium"
                >
                  {xLabel}
                </text>

                <text
                  data-testid="contour-y-label"
                  x={14}
                  y={roundTwo(PAD_TOP + PLOT_HEIGHT / 2)}
                  textAnchor="middle"
                  transform={`rotate(-90 14 ${roundTwo(PAD_TOP + PLOT_HEIGHT / 2)})`}
                  fill="var(--prism-text-primary)"
                  className="text-[10px] font-medium"
                >
                  {yLabel}
                </text>
              </g>
            </svg>
          </div>

          <div
            data-testid="contour-density-readout"
            aria-live="polite"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums min-w-0'
            )}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            <span className="inline-flex flex-wrap items-center gap-2 font-mono text-[11px] min-w-0">
              <span
                aria-hidden="true"
                className="prism-well relative overflow-hidden w-3 h-3 rounded-[4px] shrink-0"
              >
                <span
                  className="absolute inset-0"
                  style={{
                    backgroundColor: toneTokens.main,
                    opacity: activeCell.opacity,
                  }}
                />
              </span>
              <span>
                {`Coord (${formatNumber(activeCell.x)}, ${formatNumber(activeCell.y)}) · Normalized Density ${activeCell.density.toFixed(2)} · Contour Band L${activeCell.level} · Peak Density ${field.peakRawDensity.toFixed(2)}`}
              </span>
            </span>
          </div>
        </>
        );
      })()}
    </div>
  );
}

ContourDensityPlot.displayName = 'ContourDensityPlot';
