'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Box, Minus, Plus, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type MeshRenderStyle = 'shaded' | 'wireframe';

export interface SurfaceMeshCell {
  /** Zero-based facet row index in `[0 .. rows - 2]`. */
  row: number;
  /** Zero-based facet column index in `[0 .. cols - 2]`. */
  col: number;
  /** Mean finite elevation value across the facet's four corner vertices. */
  z: number;
  /** Normalized facet elevation clamped to `[0 .. 1]` across the surface Z range. */
  normalizedZ: number;
}

export interface SurfaceMesh3DPlotProps extends BaseProps<HTMLDivElement> {
  /** 2D `z[row][col]` elevation grid; defaults to a smooth 9×9 damped-sinc optical ripple surface. */
  grid?: ReadonlyArray<ReadonlyArray<number>>;
  /** Initial camera yaw angle in degrees (clamped to `-180..180`, defaults to `38`). */
  defaultYawDeg?: number;
  /** Initial camera pitch angle in degrees (clamped to `10..80`, defaults to `30`). */
  defaultPitchDeg?: number;
  /** Controlled surface mesh rendering style (`'shaded' | 'wireframe'`). */
  renderStyle?: MeshRenderStyle;
  /** Initial uncontrolled rendering style (defaults to `'shaded'`). */
  defaultRenderStyle?: MeshRenderStyle;
  /** Optional callback fired whenever the rendering style toggles. */
  onRenderStyleChange?: (style: MeshRenderStyle) => void;
  /** Unit suffix rendered in elevation telemetry readouts (defaults to `'dB'`). */
  zUnit?: string;
  /** Card heading rendered in the sculpted slab header (defaults to `'3D Surface & Mesh Plot'`). */
  title?: string;
  /** Callback fired when a user clicks or keyboard-activates a 3D surface quad facet. */
  onSelectCell?: (cell: SurfaceMeshCell) => void;
}

interface SanitizedGrid {
  rows: ReadonlyArray<ReadonlyArray<number>>;
  rowCount: number;
  colCount: number;
  minZ: number;
  maxZ: number;
  isValid: boolean;
}

interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
}

interface ProjectedFacet {
  id: string;
  row: number;
  col: number;
  z: number;
  normalizedZ: number;
  points: string;
  depth: number;
  fillToken: string;
  shadedOpacity: number;
}

interface SelectedCoord {
  row: number;
  col: number;
}

interface RenderStyleOption {
  id: MeshRenderStyle;
  label: string;
}

interface LegendItem {
  id: string;
  label: string;
  token: string;
}

export const DEFAULT_YAW_DEG = 38;
export const DEFAULT_PITCH_DEG = 30;
export const MIN_YAW_DEG = -180;
export const MAX_YAW_DEG = 180;
export const MIN_PITCH_DEG = 10;
export const MAX_PITCH_DEG = 80;
export const MIN_ZOOM = 0.7;
export const MAX_ZOOM = 1.6;
export const DEFAULT_ZOOM = 1;

const ZOOM_STEP = 0.15;
const KEYBOARD_YAW_STEP_DEG = 10;
const KEYBOARD_PITCH_STEP_DEG = 5;
const POINTER_YAW_SENSITIVITY = 0.6;
const POINTER_PITCH_SENSITIVITY = 0.4;

const VIEW_CENTER_X = 230;
const VIEW_CENTER_Y = 144;
const BASE_PROJECTION_SCALE = 76;
const ELEVATION_AMPLITUDE = 1.12;
const BASE_PLANE_Z = -0.6;

const RENDER_STYLE_OPTIONS: ReadonlyArray<RenderStyleOption> = [
  { id: 'shaded', label: 'Shaded' },
  { id: 'wireframe', label: 'Wireframe' },
];

const ELEVATION_LEGEND: ReadonlyArray<LegendItem> = [
  { id: 'valley', label: 'Valley', token: 'var(--prism-info-main)' },
  { id: 'mid', label: 'Mid', token: 'var(--prism-secondary-main)' },
  { id: 'peak', label: 'Peak', token: 'var(--prism-primary-main)' },
];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function roundTwo(value: number): number {
  return normalizeZero(Math.round(value * 100) / 100);
}

function roundThree(value: number): number {
  return normalizeZero(Math.round(value * 1000) / 1000);
}

function formatZoom(zoom: number): string {
  const fixed = zoom.toFixed(2);
  return fixed.endsWith('0') ? fixed.slice(0, -1) : fixed;
}

function formatElevation(value: number, zUnit: string): string {
  const trimmedUnit = zUnit.trim();
  const formatted = String(roundTwo(value));
  return trimmedUnit ? `${formatted} ${trimmedUnit}` : formatted;
}

function getElevationColorToken(normalizedZ: number): string {
  if (normalizedZ >= 0.67) {
    return 'var(--prism-primary-main)';
  }
  if (normalizedZ >= 0.34) {
    return 'var(--prism-secondary-main)';
  }
  return 'var(--prism-info-main)';
}

function buildDefaultSurfaceGrid(): ReadonlyArray<ReadonlyArray<number>> {
  const size = 9;
  const half = (size - 1) / 2;
  const matrix: number[][] = [];

  for (let row = 0; row < size; row += 1) {
    const line: number[] = [];
    const v = (row - half) / half;
    for (let col = 0; col < size; col += 1) {
      const u = (col - half) / half;
      const radius = Math.hypot(u, v) * Math.PI * 1.45;
      const sinc = radius === 0 ? 1 : Math.sin(radius) / radius;
      const envelope = Math.exp(-0.38 * (u * u + v * v));
      const opticalHarmonic = 2.4 * Math.cos(u * 2.2) * Math.cos(v * 2.2);
      line.push(roundTwo(sinc * envelope * 14 + opticalHarmonic));
    }
    matrix.push(line);
  }

  return matrix;
}

/** Deterministic 9×9 damped-sinc optical ripple surface used when `grid` is omitted. */
export const DEFAULT_SURFACE_GRID: ReadonlyArray<ReadonlyArray<number>> = buildDefaultSurfaceGrid();

function sanitizeGrid(rawGrid: ReadonlyArray<ReadonlyArray<number>>): SanitizedGrid {
  const rowCount = rawGrid.length;
  if (rowCount < 2) {
    return { rows: [], rowCount: 0, colCount: 0, minZ: 0, maxZ: 0, isValid: false };
  }

  let colCount = Number.POSITIVE_INFINITY;
  for (const row of rawGrid) {
    if (row.length < colCount) {
      colCount = row.length;
    }
  }

  if (!Number.isFinite(colCount) || colCount < 2) {
    return { rows: [], rowCount: 0, colCount: 0, minZ: 0, maxZ: 0, isValid: false };
  }

  const rows: number[][] = [];
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let r = 0; r < rowCount; r += 1) {
    const sourceRow = rawGrid[r]!;
    const cleanRow: number[] = [];
    for (let c = 0; c < colCount; c += 1) {
      const rawValue = sourceRow[c]!;
      const finiteVal = Number.isFinite(rawValue) ? normalizeZero(rawValue) : 0;
      if (finiteVal < minZ) minZ = finiteVal;
      if (finiteVal > maxZ) maxZ = finiteVal;
      cleanRow.push(finiteVal);
    }
    rows.push(cleanRow);
  }

  return {
    rows,
    rowCount,
    colCount,
    minZ,
    maxZ,
    isValid: true,
  };
}

function projectWorldPoint(
  wx: number,
  wy: number,
  wz: number,
  cosYaw: number,
  sinYaw: number,
  cosPitch: number,
  sinPitch: number,
  scale: number
): ProjectedPoint {
  const x1 = wx * cosYaw - wy * sinYaw;
  const y1 = wx * sinYaw + wy * cosYaw;
  const x = roundTwo(VIEW_CENTER_X + x1 * scale);
  const y = roundTwo(VIEW_CENTER_Y + (y1 * sinPitch - wz * cosPitch) * scale);
  const depth = roundThree(y1 * cosPitch + wz * sinPitch);
  return { x, y, depth };
}

function buildSurfaceScene(
  sanitized: SanitizedGrid,
  yawDeg: number,
  pitchDeg: number,
  zoom: number
) {
  const yawRad = (yawDeg * Math.PI) / 180;
  const pitchRad = (pitchDeg * Math.PI) / 180;
  const cosYaw = Math.cos(yawRad);
  const sinYaw = Math.sin(yawRad);
  const cosPitch = Math.cos(pitchRad);
  const sinPitch = Math.sin(pitchRad);
  const scale = BASE_PROJECTION_SCALE * zoom;

  const project = (wx: number, wy: number, wz: number) =>
    projectWorldPoint(wx, wy, wz, cosYaw, sinYaw, cosPitch, sinPitch, scale);

  const baseCorners = [
    project(-1, -1, BASE_PLANE_Z),
    project(1, -1, BASE_PLANE_Z),
    project(1, 1, BASE_PLANE_Z),
    project(-1, 1, BASE_PLANE_Z),
  ];
  const basePlanePoints = baseCorners.map((pt) => `${pt.x},${pt.y}`).join(' ');

  const axisOrigin = project(-1, -1, BASE_PLANE_Z);
  const axisXEnd = project(1.16, -1, BASE_PLANE_Z);
  const axisYEnd = project(-1, 1.16, BASE_PLANE_Z);
  const axisZEnd = project(-1, -1, 0.72);

  if (!sanitized.isValid) {
    return {
      facets: [] as ProjectedFacet[],
      facetLookup: new Map<string, SurfaceMeshCell>(),
      basePlanePoints,
      axes: {
        origin: axisOrigin,
        xEnd: axisXEnd,
        yEnd: axisYEnd,
        zEnd: axisZEnd,
      },
    };
  }

  const { rows, rowCount, colCount, minZ, maxZ } = sanitized;
  const zSpan = maxZ - minZ;
  const stepX = 2 / (colCount - 1);
  const stepY = 2 / (rowCount - 1);

  const projectedVertices: ProjectedPoint[][] = [];
  const normalizedVertices: number[][] = [];

  for (let r = 0; r < rowCount; r += 1) {
    const wy = r * stepY - 1;
    const projRow: ProjectedPoint[] = [];
    const normRow: number[] = [];
    const dataRow = rows[r]!;

    for (let c = 0; c < colCount; c += 1) {
      const wx = c * stepX - 1;
      const val = dataRow[c]!;
      const norm = zSpan > 0 ? clampNumber((val - minZ) / zSpan, 0, 1, 0.5) : 0.5;
      const wz = (norm - 0.5) * ELEVATION_AMPLITUDE;
      normRow.push(norm);
      projRow.push(project(wx, wy, wz));
    }

    normalizedVertices.push(normRow);
    projectedVertices.push(projRow);
  }

  const facets: ProjectedFacet[] = [];
  const facetLookup = new Map<string, SurfaceMeshCell>();

  for (let r = 0; r < rowCount - 1; r += 1) {
    for (let c = 0; c < colCount - 1; c += 1) {
      const p00 = projectedVertices[r]![c]!;
      const p01 = projectedVertices[r]![c + 1]!;
      const p11 = projectedVertices[r + 1]![c + 1]!;
      const p10 = projectedVertices[r + 1]![c]!;

      const z00 = rows[r]![c]!;
      const z01 = rows[r]![c + 1]!;
      const z11 = rows[r + 1]![c + 1]!;
      const z10 = rows[r + 1]![c]!;
      const meanZ = roundTwo((z00 + z01 + z11 + z10) / 4);

      const n00 = normalizedVertices[r]![c]!;
      const n01 = normalizedVertices[r]![c + 1]!;
      const n11 = normalizedVertices[r + 1]![c + 1]!;
      const n10 = normalizedVertices[r + 1]![c]!;
      const normalizedZ = roundThree((n00 + n01 + n11 + n10) / 4);

      // Compute rotated facet normal against key upper-left optical light for depth luminosity
      const dzDx = ((n01 - n00) * ELEVATION_AMPLITUDE) / stepX;
      const dzDy = ((n10 - n00) * ELEVATION_AMPLITUDE) / stepY;
      const nx = -dzDx;
      const ny = -dzDy;
      const nz = 1;
      const rnx = nx * cosYaw - ny * sinYaw;
      const rny = nx * sinYaw + ny * cosYaw;
      const normLen = Math.hypot(rnx, rny, nz);
      const lightDot = (rnx * -0.45 + rny * -0.35 + nz * 0.82) / normLen;
      const lightFactor = clampNumber((lightDot + 1) / 2, 0, 1, 0.5);
      const shadedOpacity = roundTwo(0.38 + normalizedZ * 0.34 + lightFactor * 0.22);

      const avgDepth = roundThree((p00.depth + p01.depth + p11.depth + p10.depth) / 4);
      const cell: SurfaceMeshCell = { row: r, col: c, z: meanZ, normalizedZ };
      facetLookup.set(`${r}:${c}`, cell);

      facets.push({
        id: `facet-${r}-${c}`,
        row: r,
        col: c,
        z: meanZ,
        normalizedZ,
        points: `${p00.x},${p00.y} ${p01.x},${p01.y} ${p11.x},${p11.y} ${p10.x},${p10.y}`,
        depth: avgDepth,
        fillToken: getElevationColorToken(normalizedZ),
        shadedOpacity,
      });
    }
  }

  // Painter's algorithm: draw farthest facets first so nearer peaks cleanly occlude behind them
  facets.sort((a, b) => a.depth - b.depth || a.row - b.row || a.col - b.col);

  return {
    facets,
    facetLookup,
    basePlanePoints,
    axes: {
      origin: axisOrigin,
      xEnd: axisXEnd,
      yEnd: axisYEnd,
      zEnd: axisZEnd,
    },
  };
}

function SurfaceMesh3DPlotInner({
  grid,
  defaultYawDeg = DEFAULT_YAW_DEG,
  defaultPitchDeg = DEFAULT_PITCH_DEG,
  renderStyle,
  defaultRenderStyle = 'shaded',
  onRenderStyleChange,
  zUnit = 'dB',
  title = '3D Surface & Mesh Plot',
  onSelectCell,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SurfaceMesh3DPlotProps) {
  const override = useComponentOverride('SurfaceMesh3DPlot');
  const headingId = useId();
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const initialYaw = normalizeZero(
    Math.round(clampNumber(defaultYawDeg, MIN_YAW_DEG, MAX_YAW_DEG, DEFAULT_YAW_DEG))
  );
  const initialPitch = normalizeZero(
    Math.round(clampNumber(defaultPitchDeg, MIN_PITCH_DEG, MAX_PITCH_DEG, DEFAULT_PITCH_DEG))
  );

  const [yawDeg, setYawDeg] = useState<number>(initialYaw);
  const [pitchDeg, setPitchDeg] = useState<number>(initialPitch);
  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedCoord, setSelectedCoord] = useState<SelectedCoord | null>(null);

  const [activeRenderStyle, setActiveRenderStyle] = useControllableState<MeshRenderStyle>({
    value: renderStyle,
    defaultValue: defaultRenderStyle,
    onChange: onRenderStyleChange,
  });

  const yawRef = useRef<number>(yawDeg);
  yawRef.current = yawDeg;

  const pitchRef = useRef<number>(pitchDeg);
  pitchRef.current = pitchDeg;

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
      cleanupDragRef.current = null;
    };
  }, []);

  const sourceGrid = grid ?? DEFAULT_SURFACE_GRID;
  const sanitizedGrid = useMemo(() => sanitizeGrid(sourceGrid), [sourceGrid]);
  const isEmpty = !sanitizedGrid.isValid;

  const scene = useMemo(
    () => buildSurfaceScene(sanitizedGrid, yawDeg, pitchDeg, zoom),
    [sanitizedGrid, yawDeg, pitchDeg, zoom]
  );

  const activeCell = useMemo<SurfaceMeshCell | null>(() => {
    if (!selectedCoord) return null;
    return scene.facetLookup.get(`${selectedCoord.row}:${selectedCoord.col}`) ?? null;
  }, [scene.facetLookup, selectedCoord]);

  const handleResetView = useCallback(() => {
    setYawDeg(initialYaw);
    setPitchDeg(initialPitch);
    setZoom(DEFAULT_ZOOM);
  }, [initialPitch, initialYaw]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => roundTwo(clampNumber(prev - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM)));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => roundTwo(clampNumber(prev + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM)));
  }, []);

  const handleSelectFacet = useCallback(
    (facet: ProjectedFacet) => {
      const cell: SurfaceMeshCell = {
        row: facet.row,
        col: facet.col,
        z: facet.z,
        normalizedZ: facet.normalizedZ,
      };
      setSelectedCoord({ row: facet.row, col: facet.col });
      onSelectCell?.(cell);
    },
    [onSelectCell]
  );

  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isEmpty || event.button > 0) return;
      cleanupDragRef.current?.();

      const startX = event.clientX;
      const startY = event.clientY;
      const startYaw = yawRef.current;
      const startPitch = pitchRef.current;
      setIsDragging(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const nextYaw = normalizeZero(
          Math.round(
            clampNumber(
              startYaw + dx * POINTER_YAW_SENSITIVITY,
              MIN_YAW_DEG,
              MAX_YAW_DEG,
              startYaw
            )
          )
        );
        const nextPitch = normalizeZero(
          Math.round(
            clampNumber(
              startPitch + dy * POINTER_PITCH_SENSITIVITY,
              MIN_PITCH_DEG,
              MAX_PITCH_DEG,
              startPitch
            )
          )
        );
        yawRef.current = nextYaw;
        pitchRef.current = nextPitch;
        setYawDeg(nextYaw);
        setPitchDeg(nextPitch);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsDragging(false);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [isEmpty]
  );

  const handleStageKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setYawDeg((prev) =>
          normalizeZero(
            clampNumber(prev - KEYBOARD_YAW_STEP_DEG, MIN_YAW_DEG, MAX_YAW_DEG, prev)
          )
        );
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setYawDeg((prev) =>
          normalizeZero(
            clampNumber(prev + KEYBOARD_YAW_STEP_DEG, MIN_YAW_DEG, MAX_YAW_DEG, prev)
          )
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setPitchDeg((prev) =>
          normalizeZero(
            clampNumber(prev + KEYBOARD_PITCH_STEP_DEG, MIN_PITCH_DEG, MAX_PITCH_DEG, prev)
          )
        );
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setPitchDeg((prev) =>
          normalizeZero(
            clampNumber(prev - KEYBOARD_PITCH_STEP_DEG, MIN_PITCH_DEG, MAX_PITCH_DEG, prev)
          )
        );
      } else if (event.key === '0') {
        event.preventDefault();
        handleResetView();
      }
    },
    [handleResetView]
  );

  const handleFacetKeyDown = useCallback(
    (facet: ProjectedFacet) => (event: ReactKeyboardEvent<SVGPolygonElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        handleSelectFacet(facet);
      }
    },
    [handleSelectFacet]
  );

  const merged = mergeProps({
    themeTarget: themeProps('surface-mesh-3d-plot', {
      renderStyle: activeRenderStyle,
      dragging: isDragging,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('surface-mesh-3d-plot', 'header');
  const stageClass = stableClassName('surface-mesh-3d-plot', 'stage');
  const telemetryClass = stableClassName('surface-mesh-3d-plot', 'telemetry');

  const isMinZoom = zoom <= MIN_ZOOM;
  const isMaxZoom = zoom >= MAX_ZOOM;
  const zoomLabel = `${formatZoom(zoom)}×`;
  const zRangeLabel = isEmpty
    ? '—'
    : `${roundTwo(sanitizedGrid.minZ)}..${formatElevation(sanitizedGrid.maxZ, zUnit)}`;
  const activeCellLabel = activeCell
    ? `(${activeCell.row}, ${activeCell.col}, ${formatElevation(activeCell.z, zUnit)})`
    : 'None';

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      {/* Sculpted Header Bar */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Box className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            data-testid="surface-mesh-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          {/* Shaded / Wireframe Render Style Toggle */}
          <div
            role="group"
            aria-label="Surface render style"
            data-testid="surface-mesh-style-group"
            className="prism-well inline-flex flex-wrap items-center gap-1 rounded-full p-1 max-w-full min-w-0"
          >
            {RENDER_STYLE_OPTIONS.map((option) => {
              const pressed = activeRenderStyle === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={pressed}
                  data-testid={`surface-mesh-style-${option.id}`}
                  onClick={() => setActiveRenderStyle(option.id)}
                  className={cx(
                    'prism-focus-ring rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                    pressed ? 'prism-crystal font-semibold shadow-sm' : 'opacity-75 hover:opacity-100'
                  )}
                  style={{
                    color: pressed ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Zoom Controls (0.7×..1.6×) */}
          <div
            role="group"
            aria-label="Zoom controls"
            data-testid="surface-mesh-zoom-group"
            className="prism-well inline-flex items-center gap-1 rounded-full p-1"
          >
            <button
              type="button"
              disabled={isMinZoom}
              aria-label="Zoom out"
              data-testid="surface-mesh-zoom-out"
              onClick={handleZoomOut}
              className="prism-focus-ring prism-crystal w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
              style={STYLE_TEXT_PRIMARY}
            >
              <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </button>
            <span
              data-testid="surface-mesh-zoom-badge"
              className="px-1.5 text-xs font-mono font-semibold tabular-nums min-w-[3.25rem] text-center"
              style={STYLE_TEXT_PRIMARY}
            >
              {zoomLabel}
            </span>
            <button
              type="button"
              disabled={isMaxZoom}
              aria-label="Zoom in"
              data-testid="surface-mesh-zoom-in"
              onClick={handleZoomIn}
              className="prism-focus-ring prism-crystal w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
              style={STYLE_TEXT_PRIMARY}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </button>
          </div>

          {/* Reset View Button */}
          <button
            type="button"
            data-testid="surface-mesh-reset"
            onClick={handleResetView}
            className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_PRIMARY}
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Recessed Optical Plot Stage */}
      {isEmpty ? (
        <div
          role="status"
          data-testid="surface-mesh-empty"
          className="prism-well rounded-2xl px-4 py-10 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          Surface mesh requires at least a 2×2 elevation grid to project 3D facets.
        </div>
      ) : (
        <div
          role="application"
          tabIndex={0}
          data-testid="surface-mesh-stage"
          data-yaw={String(yawDeg)}
          data-pitch={String(pitchDeg)}
          data-zoom={String(zoom)}
          data-render-style={activeRenderStyle}
          data-dragging={isDragging ? 'true' : undefined}
          aria-label={`${title} 3D interactive surface at yaw ${yawDeg} degrees, pitch ${pitchDeg} degrees, zoom ${zoomLabel}. Drag to orbit, use Arrow keys to rotate, press 0 to reset view, or select a surface facet.`}
          onPointerDown={handleStagePointerDown}
          onKeyDown={handleStageKeyDown}
          style={{ touchAction: 'none' }}
          className={cx(
            stageClass,
            'prism-well prism-focus-ring relative w-full max-w-full min-w-0 rounded-2xl p-2 sm:p-3 overflow-hidden touch-none',
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
        >
          {/* Elevation Token Legend Pill */}
          <div
            data-testid="surface-mesh-legend"
            aria-label="Elevation color ramp"
            className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1.5 text-[11px]"
            style={STYLE_TEXT_SECONDARY}
          >
            <span className="inline-flex flex-wrap items-center gap-2.5">
              {ELEVATION_LEGEND.map((item) => (
                <span key={item.id} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
                    style={{ backgroundColor: item.token }}
                  />
                  <span>{item.label}</span>
                </span>
              ))}
            </span>
            <span className="font-mono text-[10px] opacity-80">
              Drag or Arrow keys to orbit · 0 to reset
            </span>
          </div>

          <svg
            data-testid="surface-mesh-svg"
            viewBox="0 0 460 280"
            role="img"
            aria-label={`Projected 3D surface mesh plot with ${scene.facets.length} facets`}
            className="w-full h-auto select-none"
          >
            {/* Base Reference Plane */}
            <polygon
              data-testid="surface-mesh-base-plane"
              points={scene.basePlanePoints}
              fill="var(--prism-crystal-bottom)"
              fillOpacity={0.18}
              stroke="var(--prism-divider)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />

            {/* Projected 3D Coordinate Axes */}
            <g aria-hidden="true" data-testid="surface-mesh-axes">
              <line
                x1={scene.axes.origin.x}
                y1={scene.axes.origin.y}
                x2={scene.axes.xEnd.x}
                y2={scene.axes.xEnd.y}
                stroke="var(--prism-divider)"
                strokeWidth={1.1}
              />
              <line
                x1={scene.axes.origin.x}
                y1={scene.axes.origin.y}
                x2={scene.axes.yEnd.x}
                y2={scene.axes.yEnd.y}
                stroke="var(--prism-divider)"
                strokeWidth={1.1}
              />
              <line
                x1={scene.axes.origin.x}
                y1={scene.axes.origin.y}
                x2={scene.axes.zEnd.x}
                y2={scene.axes.zEnd.y}
                stroke="var(--prism-divider)"
                strokeWidth={1.1}
              />
              <text
                x={scene.axes.xEnd.x}
                y={scene.axes.xEnd.y}
                dx={5}
                dy={3}
                fontSize={10}
                fill="var(--prism-text-secondary)"
              >
                X
              </text>
              <text
                x={scene.axes.yEnd.x}
                y={scene.axes.yEnd.y}
                dx={5}
                dy={3}
                fontSize={10}
                fill="var(--prism-text-secondary)"
              >
                Y
              </text>
              <text
                x={scene.axes.zEnd.x}
                y={scene.axes.zEnd.y}
                dx={-4}
                dy={-5}
                fontSize={10}
                fill="var(--prism-text-secondary)"
              >
                Z
              </text>
            </g>

            {/* Back-to-Front Depth-Sorted Surface Quad Facets */}
            <g data-testid="surface-mesh-facets">
              {scene.facets.map((facet) => {
                const isSelected =
                  activeCell !== null &&
                  activeCell.row === facet.row &&
                  activeCell.col === facet.col;
                const isWireframe = activeRenderStyle === 'wireframe';

                return (
                  <polygon
                    key={facet.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`Surface cell row ${facet.row}, col ${facet.col}, elevation ${formatElevation(facet.z, zUnit)}`}
                    data-testid="surface-mesh-facet"
                    data-row={String(facet.row)}
                    data-col={String(facet.col)}
                    data-z={String(facet.z)}
                    data-normalized-z={String(facet.normalizedZ)}
                    data-depth={String(facet.depth)}
                    data-selected={isSelected ? 'true' : 'false'}
                    points={facet.points}
                    fill={facet.fillToken}
                    fillOpacity={
                      isWireframe
                        ? isSelected
                          ? 0.28
                          : 0.04
                        : isSelected
                          ? 0.96
                          : facet.shadedOpacity
                    }
                    stroke={
                      isSelected
                        ? 'var(--prism-text-primary)'
                        : isWireframe
                          ? facet.fillToken
                          : 'var(--prism-crystal-top)'
                    }
                    strokeOpacity={isSelected ? 1 : isWireframe ? 0.92 : 0.72}
                    strokeWidth={isSelected ? 2 : isWireframe ? 1.25 : 0.9}
                    strokeLinejoin="round"
                    onClick={() => handleSelectFacet(facet)}
                    onKeyDown={handleFacetKeyDown(facet)}
                    className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                  />
                );
              })}
            </g>
          </svg>
        </div>
      )}

      {/* Recessed Telemetry Footer */}
      <div
        role="status"
        aria-live="polite"
        data-testid="surface-mesh-telemetry"
        className={cx(
          telemetryClass,
          'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums min-w-0 max-w-full'
        )}
        style={STYLE_TEXT_PRIMARY}
      >
        <span data-testid="surface-mesh-telemetry-yaw">
          <span style={STYLE_TEXT_SECONDARY}>Yaw </span>
          {yawDeg}°
        </span>
        <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
          ·
        </span>
        <span data-testid="surface-mesh-telemetry-pitch">
          <span style={STYLE_TEXT_SECONDARY}>Pitch </span>
          {pitchDeg}°
        </span>
        <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
          ·
        </span>
        <span data-testid="surface-mesh-telemetry-zoom">
          <span style={STYLE_TEXT_SECONDARY}>Zoom </span>
          {zoomLabel}
        </span>
        <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
          ·
        </span>
        <span data-testid="surface-mesh-telemetry-z-range">
          <span style={STYLE_TEXT_SECONDARY}>Z Range </span>
          {zRangeLabel}
        </span>
        <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
          ·
        </span>
        <span data-testid="surface-mesh-telemetry-active-cell">
          <span style={STYLE_TEXT_SECONDARY}>Active Cell </span>
          {activeCellLabel}
        </span>
      </div>
    </div>
  );
}

export const SurfaceMesh3DPlot = memo(SurfaceMesh3DPlotInner);
SurfaceMesh3DPlot.displayName = 'SurfaceMesh3DPlot';
