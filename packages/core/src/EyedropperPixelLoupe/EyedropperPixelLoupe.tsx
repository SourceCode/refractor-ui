'use client';

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { hsvToRgb, rgbToHex, type RgbColor } from '../utils/colorMath';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type SampleRadius = '1x1' | '3x3' | '5x5';

export interface SampledRgbPixel {
  r: number;
  g: number;
  b: number;
  hex: string;
  x: number;
  y: number;
}

export interface EyedropperPixelLoupeProps extends BaseProps<HTMLDivElement> {
  /** Number of columns in the sampling canvas (clamped 5..24, defaults to 12). */
  gridWidth?: number;
  /** Number of rows in the sampling canvas (clamped 5..16, defaults to 8). */
  gridHeight?: number;
  /** Controlled sampling kernel size ('1x1' | '3x3' | '5x5'). */
  sampleRadius?: SampleRadius;
  /** Initial uncontrolled sampling kernel size (defaults to '1x1'). */
  defaultSampleRadius?: SampleRadius;
  /** Callback fired when the sampling radius changes. */
  onSampleRadiusChange?: (radius: SampleRadius) => void;
  /** Callback fired when a pixel or history swatch is sampled. */
  onSample?: (pixel: SampledRgbPixel) => void;
  /** Optional deterministic pixel color resolver; defaults to an optical chromatic gradient field. */
  pixelResolver?: (x: number, y: number, width: number, height: number) => { r: number; g: number; b: number };
  /** Visible heading label for the loupe panel (defaults to 'Eyedropper & Pixel Loupe'). */
  title?: string;
  /** Disables canvas navigation, radius switching, sampling, and history interactions. */
  disabled?: boolean;
}

interface PixelCell {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  hex: string;
}

interface GridPoint {
  x: number;
  y: number;
}

interface HistoryEntry {
  id: string;
  pixel: SampledRgbPixel;
}

interface SampleRadiusOption {
  value: SampleRadius;
  label: string;
  ariaLabel: string;
}

const MIN_GRID_WIDTH = 5;
const MAX_GRID_WIDTH = 24;
const DEFAULT_GRID_WIDTH = 12;

const MIN_GRID_HEIGHT = 5;
const MAX_GRID_HEIGHT = 16;
const DEFAULT_GRID_HEIGHT = 8;

const CANVAS_CELL_SIZE = 20;
const LOUPE_CENTER = 70;
const LOUPE_RADIUS = 62;
const LOUPE_CELL_SIZE = 25;
const LOUPE_ORIGIN = 7.5;
const MAX_HISTORY_SWATCHES = 6;

const SAMPLE_RADIUS_OPTIONS: ReadonlyArray<SampleRadiusOption> = [
  { value: '1x1', label: '1×1 Pt', ariaLabel: '1 by 1 point sample' },
  { value: '3x3', label: '3×3 Avg', ariaLabel: '3 by 3 average sample' },
  { value: '5x5', label: '5×5 Avg', ariaLabel: '5 by 5 average sample' },
];

function clampDimension(value: number, min: number, max: number, fallback: number): number {
  return Math.round(clampNumber(value, min, max, fallback));
}

function sanitizeChannel(channel: number): number {
  return Math.round(clampNumber(channel, 0, 255, 0));
}

function sanitizeRgb(raw: RgbColor): RgbColor {
  return {
    r: sanitizeChannel(raw.r),
    g: sanitizeChannel(raw.g),
    b: sanitizeChannel(raw.b),
  };
}

function defaultOpticalFieldResolver(x: number, y: number, width: number, height: number): RgbColor {
  const u = x / (width - 1);
  const v = y / (height - 1);
  const h = (18 + u * 290 + Math.sin(v * Math.PI) * 26) % 360;
  const s = 58 + (1 - Math.abs(v - 0.45)) * 34;
  const val = 94 - v * 52 + Math.cos(u * Math.PI * 2) * 5;
  return hsvToRgb({ h, s, v: val });
}

function getHalfSpan(radius: SampleRadius): number {
  if (radius === '3x3') return 1;
  if (radius === '5x5') return 2;
  return 0;
}

function getGridCell(
  grid: ReadonlyArray<ReadonlyArray<PixelCell>>,
  x: number,
  y: number
): PixelCell | undefined {
  const row = grid[y];
  return row ? row[x] : undefined;
}

function sampleNeighborhood(
  grid: ReadonlyArray<ReadonlyArray<PixelCell>>,
  cx: number,
  cy: number,
  radius: SampleRadius
): SampledRgbPixel {
  const half = getHalfSpan(radius);
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let dy = -half; dy <= half; dy += 1) {
    for (let dx = -half; dx <= half; dx += 1) {
      const cell = getGridCell(grid, cx + dx, cy + dy);
      if (!cell) continue;
      sumR += cell.r;
      sumG += cell.g;
      sumB += cell.b;
      count += 1;
    }
  }

  const r = Math.round(sumR / count);
  const g = Math.round(sumG / count);
  const b = Math.round(sumB / count);
  return {
    r,
    g,
    b,
    hex: rgbToHex({ r, g, b }),
    x: cx,
    y: cy,
  };
}

export function EyedropperPixelLoupe({
  gridWidth = DEFAULT_GRID_WIDTH,
  gridHeight = DEFAULT_GRID_HEIGHT,
  sampleRadius,
  defaultSampleRadius = '1x1',
  onSampleRadiusChange,
  onSample,
  pixelResolver,
  title = 'Eyedropper & Pixel Loupe',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: EyedropperPixelLoupeProps) {
  const override = useComponentOverride('EyedropperPixelLoupe');
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const loupeClipId = `${baseId}-loupe-clip`;
  const historySeqRef = useRef(0);

  const safeWidth = clampDimension(gridWidth, MIN_GRID_WIDTH, MAX_GRID_WIDTH, DEFAULT_GRID_WIDTH);
  const safeHeight = clampDimension(gridHeight, MIN_GRID_HEIGHT, MAX_GRID_HEIGHT, DEFAULT_GRID_HEIGHT);

  const [activeRadius, setActiveRadius] = useControllableState<SampleRadius>({
    value: sampleRadius,
    defaultValue: defaultSampleRadius,
    onChange: onSampleRadiusChange,
  });

  const [cursor, setCursor] = useState<GridPoint>(() => ({
    x: Math.floor(safeWidth / 2),
    y: Math.floor(safeHeight / 2),
  }));

  const [history, setHistory] = useState<ReadonlyArray<HistoryEntry>>([]);

  const safeCursorX = clampNumber(cursor.x, 0, safeWidth - 1, 0);
  const safeCursorY = clampNumber(cursor.y, 0, safeHeight - 1, 0);

  const pixelGrid = useMemo<ReadonlyArray<ReadonlyArray<PixelCell>>>(() => {
    const resolver = pixelResolver ?? defaultOpticalFieldResolver;
    const rows: PixelCell[][] = [];
    for (let y = 0; y < safeHeight; y += 1) {
      const row: PixelCell[] = [];
      for (let x = 0; x < safeWidth; x += 1) {
        const clean = sanitizeRgb(resolver(x, y, safeWidth, safeHeight));
        row.push({
          x,
          y,
          r: clean.r,
          g: clean.g,
          b: clean.b,
          hex: rgbToHex(clean),
        });
      }
      rows.push(row);
    }
    return rows;
  }, [pixelResolver, safeWidth, safeHeight]);

  const flatPixels = useMemo<ReadonlyArray<PixelCell>>(() => {
    const cells: PixelCell[] = [];
    for (const row of pixelGrid) {
      for (const cell of row) {
        cells.push(cell);
      }
    }
    return cells;
  }, [pixelGrid]);

  const activeSample = useMemo(
    () => sampleNeighborhood(pixelGrid, safeCursorX, safeCursorY, activeRadius),
    [pixelGrid, safeCursorX, safeCursorY, activeRadius]
  );

  const loupeCells = useMemo(() => {
    const cells: Array<{
      key: string;
      dx: number;
      dy: number;
      rectX: number;
      rectY: number;
      inBounds: boolean;
      fill: string;
    }> = [];

    for (let dy = -2; dy <= 2; dy += 1) {
      const rowIdx = dy + 2;
      for (let dx = -2; dx <= 2; dx += 1) {
        const colIdx = dx + 2;
        const cell = getGridCell(pixelGrid, safeCursorX + dx, safeCursorY + dy);
        cells.push({
          key: `loupe-${dx}-${dy}`,
          dx,
          dy,
          rectX: LOUPE_ORIGIN + colIdx * LOUPE_CELL_SIZE,
          rectY: LOUPE_ORIGIN + rowIdx * LOUPE_CELL_SIZE,
          inBounds: cell !== undefined,
          fill: cell ? cell.hex : 'var(--prism-well-start)',
        });
      }
    }
    return cells;
  }, [pixelGrid, safeCursorX, safeCursorY]);

  const moveCursor = useCallback(
    (nextX: number, nextY: number) => {
      const clampedX = Math.round(clampNumber(nextX, 0, safeWidth - 1, 0));
      const clampedY = Math.round(clampNumber(nextY, 0, safeHeight - 1, 0));
      setCursor((prev) => (prev.x === clampedX && prev.y === clampedY ? prev : { x: clampedX, y: clampedY }));
    },
    [safeWidth, safeHeight]
  );

  const commitSample = useCallback(
    (targetX: number, targetY: number) => {
      const clampedX = Math.round(clampNumber(targetX, 0, safeWidth - 1, 0));
      const clampedY = Math.round(clampNumber(targetY, 0, safeHeight - 1, 0));
      const sampled = sampleNeighborhood(pixelGrid, clampedX, clampedY, activeRadius);
      historySeqRef.current += 1;
      const entryId = `sample-${historySeqRef.current}`;
      setHistory((prev) => [{ id: entryId, pixel: sampled }, ...prev].slice(0, MAX_HISTORY_SWATCHES));
      onSample?.(sampled);
    },
    [pixelGrid, safeWidth, safeHeight, activeRadius, onSample]
  );

  const resolveCellFromEvent = useCallback(
    (event: ReactPointerEvent<HTMLDivElement> | ReactMouseEvent<HTMLDivElement>): GridPoint | null => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const normX = clampNumber((event.clientX - rect.left) / rect.width, 0, 0.999999, 0);
        const normY = clampNumber((event.clientY - rect.top) / rect.height, 0, 0.999999, 0);
        return {
          x: Math.floor(normX * safeWidth),
          y: Math.floor(normY * safeHeight),
        };
      }
      const targetEl = event.target as Element;
      const attrX = targetEl.getAttribute('data-cell-x');
      const attrY = targetEl.getAttribute('data-cell-y');
      if (attrX !== null && attrY !== null) {
        const px = Number(attrX);
        const py = Number(attrY);
        if (Number.isInteger(px) && Number.isInteger(py)) {
          return {
            x: clampNumber(px, 0, safeWidth - 1, 0),
            y: clampNumber(py, 0, safeHeight - 1, 0),
          };
        }
      }
      return null;
    },
    [safeWidth, safeHeight]
  );

  const handleCanvasPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const point = resolveCellFromEvent(event);
      if (point) {
        moveCursor(point.x, point.y);
      }
    },
    [disabled, resolveCellFromEvent, moveCursor]
  );

  const handleCanvasClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.currentTarget.focus();
      const point = resolveCellFromEvent(event);
      const targetX = point ? point.x : safeCursorX;
      const targetY = point ? point.y : safeCursorY;
      moveCursor(targetX, targetY);
      commitSample(targetX, targetY);
    },
    [disabled, resolveCellFromEvent, safeCursorX, safeCursorY, moveCursor, commitSample]
  );

  const handleCanvasKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveCursor(safeCursorX - 1, safeCursorY);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveCursor(safeCursorX + 1, safeCursorY);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveCursor(safeCursorX, safeCursorY - 1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveCursor(safeCursorX, safeCursorY + 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        moveCursor(0, safeCursorY);
      } else if (event.key === 'End') {
        event.preventDefault();
        moveCursor(safeWidth - 1, safeCursorY);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        commitSample(safeCursorX, safeCursorY);
      }
    },
    [disabled, moveCursor, safeCursorX, safeCursorY, safeWidth, commitSample]
  );

  const handleRadiusSelect = useCallback(
    (nextRadius: SampleRadius) => {
      setActiveRadius(nextRadius);
    },
    [setActiveRadius]
  );

  const handleHistorySwatchClick = useCallback(
    (pixel: SampledRgbPixel) => {
      moveCursor(pixel.x, pixel.y);
      onSample?.(pixel);
    },
    [moveCursor, onSample]
  );

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const merged = mergeProps({
    themeTarget: themeProps('eyedropper-pixel-loupe', {
      disabled,
      radius: activeRadius,
    }),
    baseClassName: 'prism-slab p-4 space-y-4 max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('eyedropper-pixel-loupe', 'header');
  const canvasClass = stableClassName('eyedropper-pixel-loupe', 'canvas');
  const loupeClass = stableClassName('eyedropper-pixel-loupe', 'loupe');
  const historyClass = stableClassName('eyedropper-pixel-loupe', 'history');

  const svgWidth = safeWidth * CANVAS_CELL_SIZE;
  const svgHeight = safeHeight * CANVAS_CELL_SIZE;
  const crosshairX = safeCursorX * CANVAS_CELL_SIZE + CANVAS_CELL_SIZE / 2;
  const crosshairY = safeCursorY * CANVAS_CELL_SIZE + CANVAS_CELL_SIZE / 2;
  const halfSpan = getHalfSpan(activeRadius);

  const footprintStartX = Math.max(0, safeCursorX - halfSpan) * CANVAS_CELL_SIZE;
  const footprintStartY = Math.max(0, safeCursorY - halfSpan) * CANVAS_CELL_SIZE;
  const footprintEndX = (Math.min(safeWidth - 1, safeCursorX + halfSpan) + 1) * CANVAS_CELL_SIZE;
  const footprintEndY = (Math.min(safeHeight - 1, safeCursorY + halfSpan) + 1) * CANVAS_CELL_SIZE;

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-crystal w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M11.6 2.4a1.7 1.7 0 0 1 2.4 2.4l-1.7 1.7.9.9-1.1 1.1-.9-.9-4.7 4.7a2 2 0 0 1-1.1.56l-2.3.34.34-2.3a2 2 0 0 1 .56-1.1l4.7-4.7-.9-.9L8.9 4.1l.9.9 1.8-2.6Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h3
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div
            role="group"
            aria-label="Sample radius"
            className="prism-well p-1 rounded-full inline-flex flex-wrap items-center gap-1"
          >
            {SAMPLE_RADIUS_OPTIONS.map((option) => {
              const isSelected = activeRadius === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={option.ariaLabel}
                  data-radius={option.value}
                  onClick={() => handleRadiusSelect(option.value)}
                  className={cx(
                    'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
                    isSelected ? 'prism-btn-secondary font-semibold' : 'bg-transparent'
                  )}
                  style={{
                    color: isSelected ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => commitSample(safeCursorX, safeCursorY)}
            className="prism-btn-primary prism-focus-ring px-3.5 py-1.5 text-xs font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sample Pixel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center min-w-0">
        <div className="prism-well rounded-2xl p-2.5 min-w-0 max-w-full">
          <div
            role="application"
            tabIndex={disabled ? -1 : 0}
            aria-roledescription="pixel color sampler"
            aria-label={`${title} sampling canvas, cursor at column ${safeCursorX}, row ${safeCursorY}, color ${activeSample.hex}`}
            aria-disabled={disabled || undefined}
            data-testid="eyedropper-canvas"
            data-cursor-x={String(safeCursorX)}
            data-cursor-y={String(safeCursorY)}
            onPointerMove={handleCanvasPointerMove}
            onClick={handleCanvasClick}
            onKeyDown={handleCanvasKeyDown}
            className={cx(
              canvasClass,
              'prism-focus-ring relative block w-full max-w-full overflow-hidden rounded-xl select-none',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'
            )}
          >
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto block max-w-full"
              aria-hidden="true"
              data-testid="eyedropper-mosaic-svg"
            >
              {flatPixels.map((cell) => (
                <rect
                  key={`cell-${cell.x}-${cell.y}`}
                  x={cell.x * CANVAS_CELL_SIZE}
                  y={cell.y * CANVAS_CELL_SIZE}
                  width={CANVAS_CELL_SIZE}
                  height={CANVAS_CELL_SIZE}
                  fill={cell.hex}
                  stroke="var(--prism-divider)"
                  strokeWidth={0.5}
                  data-cell-x={String(cell.x)}
                  data-cell-y={String(cell.y)}
                />
              ))}

              {halfSpan > 0 ? (
                <rect
                  x={footprintStartX + 1}
                  y={footprintStartY + 1}
                  width={footprintEndX - footprintStartX - 2}
                  height={footprintEndY - footprintStartY - 2}
                  fill="none"
                  stroke="var(--prism-secondary-main)"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                  pointerEvents="none"
                  data-testid="eyedropper-sample-footprint"
                />
              ) : null}

              <g pointerEvents="none" data-testid="eyedropper-crosshair">
                <line
                  x1={0}
                  y1={crosshairY}
                  x2={safeCursorX * CANVAS_CELL_SIZE}
                  y2={crosshairY}
                  stroke="var(--prism-primary-main)"
                  strokeWidth={1.25}
                  strokeOpacity={0.85}
                />
                <line
                  x1={(safeCursorX + 1) * CANVAS_CELL_SIZE}
                  y1={crosshairY}
                  x2={svgWidth}
                  y2={crosshairY}
                  stroke="var(--prism-primary-main)"
                  strokeWidth={1.25}
                  strokeOpacity={0.85}
                />
                <line
                  x1={crosshairX}
                  y1={0}
                  x2={crosshairX}
                  y2={safeCursorY * CANVAS_CELL_SIZE}
                  stroke="var(--prism-primary-main)"
                  strokeWidth={1.25}
                  strokeOpacity={0.85}
                />
                <line
                  x1={crosshairX}
                  y1={(safeCursorY + 1) * CANVAS_CELL_SIZE}
                  x2={crosshairX}
                  y2={svgHeight}
                  stroke="var(--prism-primary-main)"
                  strokeWidth={1.25}
                  strokeOpacity={0.85}
                />
                <rect
                  x={safeCursorX * CANVAS_CELL_SIZE}
                  y={safeCursorY * CANVAS_CELL_SIZE}
                  width={CANVAS_CELL_SIZE}
                  height={CANVAS_CELL_SIZE}
                  fill="none"
                  stroke="var(--prism-bg-start)"
                  strokeWidth={3}
                />
                <rect
                  x={safeCursorX * CANVAS_CELL_SIZE}
                  y={safeCursorY * CANVAS_CELL_SIZE}
                  width={CANVAS_CELL_SIZE}
                  height={CANVAS_CELL_SIZE}
                  fill="none"
                  stroke="var(--prism-primary-main)"
                  strokeWidth={1.75}
                />
              </g>
            </svg>
          </div>
        </div>

        <div className={cx(loupeClass, 'flex flex-col items-center gap-3 min-w-0')}>
          <div className="prism-crystal rounded-full p-1.5 inline-flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 140 140"
              className="w-36 h-36 mx-auto block"
              role="img"
              aria-label={`Magnified 5 by 5 pixel loupe at ${safeCursorX}, ${safeCursorY}, sampled color ${activeSample.hex}`}
              data-testid="eyedropper-loupe-svg"
            >
              <defs>
                <clipPath id={loupeClipId}>
                  <circle cx={LOUPE_CENTER} cy={LOUPE_CENTER} r={LOUPE_RADIUS} />
                </clipPath>
              </defs>

              <circle cx={LOUPE_CENTER} cy={LOUPE_CENTER} r={LOUPE_RADIUS} fill="var(--prism-well-start)" />

              <g clipPath={`url(#${loupeClipId})`}>
                {loupeCells.map((cell) => (
                  <rect
                    key={cell.key}
                    x={cell.rectX}
                    y={cell.rectY}
                    width={LOUPE_CELL_SIZE}
                    height={LOUPE_CELL_SIZE}
                    fill={cell.fill}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    data-loupe-cell={`${cell.dx},${cell.dy}`}
                    data-in-bounds={cell.inBounds ? 'true' : 'false'}
                  />
                ))}

                {halfSpan > 0 ? (
                  <rect
                    x={LOUPE_ORIGIN + (2 - halfSpan) * LOUPE_CELL_SIZE + 1}
                    y={LOUPE_ORIGIN + (2 - halfSpan) * LOUPE_CELL_SIZE + 1}
                    width={(halfSpan * 2 + 1) * LOUPE_CELL_SIZE - 2}
                    height={(halfSpan * 2 + 1) * LOUPE_CELL_SIZE - 2}
                    fill="none"
                    stroke="var(--prism-secondary-main)"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    data-testid="eyedropper-loupe-kernel"
                  />
                ) : null}

                <rect
                  x={LOUPE_ORIGIN + 2 * LOUPE_CELL_SIZE}
                  y={LOUPE_ORIGIN + 2 * LOUPE_CELL_SIZE}
                  width={LOUPE_CELL_SIZE}
                  height={LOUPE_CELL_SIZE}
                  fill="none"
                  stroke="var(--prism-bg-start)"
                  strokeWidth={3.5}
                />
                <rect
                  x={LOUPE_ORIGIN + 2 * LOUPE_CELL_SIZE}
                  y={LOUPE_ORIGIN + 2 * LOUPE_CELL_SIZE}
                  width={LOUPE_CELL_SIZE}
                  height={LOUPE_CELL_SIZE}
                  fill="none"
                  stroke="var(--prism-primary-main)"
                  strokeWidth={2}
                  data-testid="eyedropper-loupe-reticle"
                />
              </g>

              <circle
                cx={LOUPE_CENTER}
                cy={LOUPE_CENTER}
                r={LOUPE_RADIUS + 2}
                fill="none"
                stroke="var(--prism-divider)"
                strokeWidth={2}
              />
              <circle
                cx={LOUPE_CENTER}
                cy={LOUPE_CENTER}
                r={LOUPE_RADIUS}
                fill="none"
                stroke="var(--prism-primary-main)"
                strokeOpacity={0.5}
                strokeWidth={1.5}
              />
              <line x1={LOUPE_CENTER} y1={2} x2={LOUPE_CENTER} y2={8} stroke="var(--prism-primary-main)" strokeWidth={1.75} />
              <line x1={LOUPE_CENTER} y1={132} x2={LOUPE_CENTER} y2={138} stroke="var(--prism-primary-main)" strokeWidth={1.75} />
              <line x1={2} y1={LOUPE_CENTER} x2={8} y2={LOUPE_CENTER} stroke="var(--prism-primary-main)" strokeWidth={1.75} />
              <line x1={132} y1={LOUPE_CENTER} x2={138} y2={LOUPE_CENTER} stroke="var(--prism-primary-main)" strokeWidth={1.75} />
            </svg>
          </div>

          <div
            aria-live="polite"
            className="prism-well rounded-2xl px-3 py-2.5 w-full min-w-[180px] space-y-2"
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  data-testid="eyedropper-live-swatch"
                  className="w-5 h-5 rounded-full shrink-0 border"
                  style={{
                    backgroundColor: activeSample.hex,
                    borderColor: 'var(--prism-divider)',
                  }}
                />
                <span
                  data-testid="eyedropper-hex"
                  className="font-mono text-xs font-semibold tabular-nums"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {activeSample.hex}
                </span>
              </div>
              <span
                data-testid="eyedropper-coords"
                className="font-mono text-[11px] font-medium tabular-nums shrink-0"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                ({activeSample.x}, {activeSample.y})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px] tabular-nums">
              <div className="prism-crystal rounded-xl px-1.5 py-1">
                <span className="block text-[10px]" style={{ color: 'var(--prism-text-secondary)' }}>
                  R
                </span>
                <span
                  data-testid="eyedropper-channel-r"
                  className="font-semibold"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {activeSample.r}
                </span>
              </div>
              <div className="prism-crystal rounded-xl px-1.5 py-1">
                <span className="block text-[10px]" style={{ color: 'var(--prism-text-secondary)' }}>
                  G
                </span>
                <span
                  data-testid="eyedropper-channel-g"
                  className="font-semibold"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {activeSample.g}
                </span>
              </div>
              <div className="prism-crystal rounded-xl px-1.5 py-1">
                <span className="block text-[10px]" style={{ color: 'var(--prism-text-secondary)' }}>
                  B
                </span>
                <span
                  data-testid="eyedropper-channel-b"
                  className="font-semibold"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {activeSample.b}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        data-testid="eyedropper-history-tray"
        className={cx(
          historyClass,
          'prism-well rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {history.length === 0 ? (
            <span
              data-testid="eyedropper-history-empty"
              className="text-xs px-1"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              No sampled swatches yet — click the canvas or press Enter to capture up to {MAX_HISTORY_SWATCHES}.
            </span>
          ) : (
            history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                disabled={disabled}
                aria-label={`Re-sample ${entry.pixel.hex} at ${entry.pixel.x}, ${entry.pixel.y}`}
                data-testid="eyedropper-history-swatch"
                onClick={() => handleHistorySwatchClick(entry.pixel)}
                className="prism-crystal prism-focus-ring rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-mono tabular-nums cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 rounded-full shrink-0 border"
                  style={{
                    backgroundColor: entry.pixel.hex,
                    borderColor: 'var(--prism-divider)',
                  }}
                />
                <span>{entry.pixel.hex}</span>
              </button>
            ))
          )}
        </div>

        <button
          type="button"
          disabled={disabled || history.length === 0}
          onClick={handleClearHistory}
          className="prism-crystal prism-focus-ring rounded-full px-3 py-1 text-xs font-medium shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

EyedropperPixelLoupe.displayName = 'EyedropperPixelLoupe';
