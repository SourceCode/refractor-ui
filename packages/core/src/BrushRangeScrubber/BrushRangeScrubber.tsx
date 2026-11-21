'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type BrushTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface BrushPoint {
  /** Human-readable X-axis timestamp or category label for this sample. */
  label: string;
  /** Numeric metric value plotted in the overview sparkline (non-finite values are filtered). */
  value: number;
}

export type BrushIndexRange = [number, number];

export interface BrushRangeScrubberProps extends BaseProps<HTMLDivElement> {
  /** Ordered time-series data points; non-finite values are filtered and >= 2 finite points are required. */
  data: BrushPoint[];
  /** Card heading linked to the scrubber region (defaults to 'Timeline Brush Scrubber'). */
  title?: string;
  /** Controlled inclusive index selection [startIndex, endIndex]. */
  range?: BrushIndexRange;
  /** Uncontrolled initial inclusive index selection [startIndex, endIndex] (defaults to [0, data.length - 1]). */
  defaultRange?: BrushIndexRange;
  /** Minimum index separation between start and end handles, clamped to 1..maxSpan (defaults to 1). */
  minSpan?: number;
  /** Semantic --prism-* optical color tone (defaults to 'primary'). */
  tone?: BrushTone;
  /** Miniature overview SVG height in pixels, clamped to 64..200 (defaults to 96). */
  height?: number;
  /** Callback fired when the selected range changes with the normalized index tuple and inclusive point slice. */
  onRangeChange?: (range: BrushIndexRange, slice: BrushPoint[]) => void;
}

type DragMode = 'start' | 'end' | 'pan' | null;

interface SparklineGeometry {
  polylinePoints: string;
  areaPoints: string;
  plotHeight: number;
  baselineY: number;
}

interface PresetOption {
  id: 'all' | 'last-50' | 'last-25';
  label: 'All' | 'Last 50%' | 'Last 25%';
  range: BrushIndexRange;
}

const VIEW_WIDTH = 600;
const PAD_X = 12;
const PAD_TOP = 10;
const PAD_BOTTOM = 10;
const PLOT_WIDTH = VIEW_WIDTH - PAD_X * 2;
const HANDLE_WIDTH = 12;

const DEFAULT_HEIGHT = 96;
const MIN_HEIGHT = 64;
const MAX_HEIGHT = 200;

function getToneColorVar(tone: BrushTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'secondary':
      return 'var(--prism-secondary-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'rose':
      return 'var(--prism-error-main)';
  }
}

function sanitizeData(raw: ReadonlyArray<BrushPoint>): BrushPoint[] {
  const result: BrushPoint[] = [];
  for (const point of raw) {
    if (!point || !Number.isFinite(point.value)) {
      continue;
    }
    result.push({
      label: point.label,
      value: point.value === 0 ? 0 : point.value,
    });
  }
  return result;
}

function normalizeRange(
  candidate: BrushIndexRange | undefined,
  maxIndex: number,
  minSpan: number
): BrushIndexRange {
  if (!candidate) {
    return [0, maxIndex];
  }
  const a = Math.round(clampNumber(candidate[0], 0, maxIndex, 0));
  const b = Math.round(clampNumber(candidate[1], 0, maxIndex, maxIndex));
  let start = Math.min(a, b);
  let end = Math.max(a, b);

  if (end - start < minSpan) {
    end = Math.min(maxIndex, start + minSpan);
    if (end - start < minSpan) {
      start = Math.max(0, end - minSpan);
    }
  }

  return [start, end];
}

function computePresetRange(
  totalCount: number,
  fraction: number,
  minSpan: number
): BrushIndexRange {
  const maxIndex = totalCount - 1;
  if (fraction >= 1) {
    return [0, maxIndex];
  }
  const targetCount = Math.max(minSpan + 1, Math.ceil(totalCount * fraction));
  const start = Math.max(0, totalCount - targetCount);
  return normalizeRange([start, maxIndex], maxIndex, minSpan);
}

function normalizeValue(val: number, min: number, max: number): number {
  const span = max - min;
  if (span === 0) {
    return 0.5;
  }
  if (!Number.isFinite(span)) {
    const halfSpan = max / 2 - min / 2;
    return (val / 2 - min / 2) / halfSpan;
  }
  return (val - min) / span;
}

function buildSparklineGeometry(
  points: ReadonlyArray<BrushPoint>,
  height: number
): SparklineGeometry {
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const pt of points) {
    if (pt.value < minVal) minVal = pt.value;
    if (pt.value > maxVal) maxVal = pt.value;
  }

  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const baselineY = Number((height - PAD_BOTTOM).toFixed(2));
  const maxIndex = points.length - 1;

  const coords: string[] = [];
  let firstX = PAD_X;
  let lastX = VIEW_WIDTH - PAD_X;

  for (const [index, pt] of points.entries()) {
    const x = Number((PAD_X + (index / maxIndex) * PLOT_WIDTH).toFixed(2));
    const ratio = normalizeValue(pt.value, minVal, maxVal);
    const y = Number((PAD_TOP + (1 - ratio) * plotHeight).toFixed(2));
    coords.push(`${x},${y}`);
    if (index === 0) {
      firstX = x;
    }
    lastX = x;
  }

  const polylinePoints = coords.join(' ');
  const areaPoints = `${firstX},${baselineY} ${polylinePoints} ${lastX},${baselineY}`;
  return { polylinePoints, areaPoints, plotHeight, baselineY };
}

export function BrushRangeScrubber({
  data,
  title = 'Timeline Brush Scrubber',
  range,
  defaultRange,
  minSpan = 1,
  tone = 'primary',
  height = DEFAULT_HEIGHT,
  onRangeChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: BrushRangeScrubberProps) {
  const override = useComponentOverride('BrushRangeScrubber');
  const headingId = useId();
  const rawGradId = useId();
  const gradientId = `brush-grad-${rawGradId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const svgRef = useRef<SVGSVGElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragMode>(null);

  const safeHeight = Math.round(clampNumber(height, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT));
  const toneVar = getToneColorVar(tone);

  const sanitizedData = useMemo(() => sanitizeData(data), [data]);
  const isEmpty = sanitizedData.length < 2;
  const maxIndex = isEmpty ? 0 : sanitizedData.length - 1;
  const safeMinSpan = isEmpty ? 1 : Math.round(clampNumber(minSpan, 1, maxIndex, 1));

  const [rawRange, setRawRange] = useControllableState<BrushIndexRange | undefined>({
    value: range,
    defaultValue: defaultRange,
  });

  const [startIndex, endIndex]: BrushIndexRange = isEmpty
    ? [0, 0]
    : normalizeRange(rawRange, maxIndex, safeMinSpan);

  const pageStep = Math.max(2, Math.round(maxIndex * 0.1));

  const geometry = useMemo(
    () => (isEmpty ? null : buildSparklineGeometry(sanitizedData, safeHeight)),
    [isEmpty, sanitizedData, safeHeight]
  );

  const presets = useMemo<PresetOption[]>(() => {
    if (isEmpty) {
      return [];
    }
    return [
      {
        id: 'all',
        label: 'All',
        range: computePresetRange(sanitizedData.length, 1, safeMinSpan),
      },
      {
        id: 'last-50',
        label: 'Last 50%',
        range: computePresetRange(sanitizedData.length, 0.5, safeMinSpan),
      },
      {
        id: 'last-25',
        label: 'Last 25%',
        range: computePresetRange(sanitizedData.length, 0.25, safeMinSpan),
      },
    ];
  }, [isEmpty, sanitizedData.length, safeMinSpan]);

  useEffect(() => {
    if (isEmpty) {
      cleanupDragRef.current?.();
      setActiveDrag(null);
    }
  }, [isEmpty]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const commitRange = useCallback(
    (candidate: BrushIndexRange) => {
      const [nextStart, nextEnd] = normalizeRange(candidate, maxIndex, safeMinSpan);
      if (nextStart === startIndex && nextEnd === endIndex) return;
      const next: BrushIndexRange = [nextStart, nextEnd];
      setRawRange(next);
      onRangeChange?.(next, sanitizedData.slice(nextStart, nextEnd + 1));
    },
    [maxIndex, safeMinSpan, startIndex, endIndex, setRawRange, onRangeChange, sanitizedData]
  );

  const moveHandle = useCallback(
    (handle: 'start' | 'end', targetIndex: number) => {
      if (handle === 'start') {
        const nextStart = Math.round(
          clampNumber(targetIndex, 0, endIndex - safeMinSpan, startIndex)
        );
        commitRange([nextStart, endIndex]);
      } else {
        const nextEnd = Math.round(
          clampNumber(targetIndex, startIndex + safeMinSpan, maxIndex, endIndex)
        );
        commitRange([startIndex, nextEnd]);
      }
    },
    [startIndex, endIndex, safeMinSpan, maxIndex, commitRange]
  );

  const panToStart = useCallback(
    (targetStart: number, span: number) => {
      const clampedStart = Math.round(
        clampNumber(targetStart, 0, maxIndex - span, startIndex)
      );
      commitRange([clampedStart, clampedStart + span]);
    },
    [maxIndex, startIndex, commitRange]
  );

  const latestActionsRef = useRef({ moveHandle, panToStart });
  latestActionsRef.current = { moveHandle, panToStart };

  const getSvgRect = useCallback((): DOMRect | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !Number.isFinite(rect.width) || rect.width <= 0) {
      return null;
    }
    return rect;
  }, []);

  const attachWindowDrag = useCallback(
    (mode: Exclude<DragMode, null>, onMove: (moveEvent: PointerEvent) => void) => {
      cleanupDragRef.current?.();
      setActiveDrag(mode);

      const cleanup = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', handleEnd);
        window.removeEventListener('pointercancel', handleEnd);
        cleanupDragRef.current = null;
      };

      const handleEnd = () => {
        cleanup();
        setActiveDrag(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', handleEnd);
      window.addEventListener('pointercancel', handleEnd);
    },
    []
  );

  const handleEdgePointerDown = useCallback(
    (handle: 'start' | 'end') => (event: ReactPointerEvent<SVGGElement>) => {
      event.stopPropagation();
      if (event.button > 0) return;
      event.preventDefault();
      if (!getSvgRect()) return;

      attachWindowDrag(handle, (moveEvent: PointerEvent) => {
        const rect = getSvgRect();
        if (!rect) return;
        const svgX = ((moveEvent.clientX - rect.left) / rect.width) * VIEW_WIDTH;
        const ratio = clampNumber((svgX - PAD_X) / PLOT_WIDTH, 0, 1, 0);
        const nextIdx = Math.round(ratio * maxIndex);
        latestActionsRef.current.moveHandle(handle, nextIdx);
      });
    },
    [getSvgRect, attachWindowDrag, maxIndex]
  );

  const handleWindowPointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      event.stopPropagation();
      if (event.button > 0) return;
      event.preventDefault();
      if (!getSvgRect()) return;

      const originClientX = event.clientX;
      const originStart = startIndex;
      const span = endIndex - startIndex;

      attachWindowDrag('pan', (moveEvent: PointerEvent) => {
        const rect = getSvgRect();
        if (!rect) return;
        const deltaSvgX = ((moveEvent.clientX - originClientX) / rect.width) * VIEW_WIDTH;
        const deltaIndices = Math.round((deltaSvgX / PLOT_WIDTH) * maxIndex);
        latestActionsRef.current.panToStart(originStart + deltaIndices, span);
      });
    },
    [getSvgRect, startIndex, endIndex, attachWindowDrag, maxIndex]
  );

  const handleEdgeKeyDown = useCallback(
    (handle: 'start' | 'end') => (event: ReactKeyboardEvent<SVGGElement>) => {
      if (event.nativeEvent.isComposing) return;
      const current = handle === 'start' ? startIndex : endIndex;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        moveHandle(handle, current - 1);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveHandle(handle, current + 1);
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        moveHandle(handle, current - pageStep);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        moveHandle(handle, current + pageStep);
      } else if (event.key === 'Home') {
        event.preventDefault();
        moveHandle(handle, handle === 'start' ? 0 : startIndex + safeMinSpan);
      } else if (event.key === 'End') {
        event.preventDefault();
        moveHandle(handle, handle === 'start' ? endIndex - safeMinSpan : maxIndex);
      }
    },
    [startIndex, endIndex, pageStep, safeMinSpan, maxIndex, moveHandle]
  );

  const handleWindowKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGGElement>) => {
      if (event.nativeEvent.isComposing) return;
      const span = endIndex - startIndex;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        panToStart(startIndex - 1, span);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        panToStart(startIndex + 1, span);
      } else if (event.key === 'Home') {
        event.preventDefault();
        panToStart(0, span);
      } else if (event.key === 'End') {
        event.preventDefault();
        panToStart(maxIndex - span, span);
      }
    },
    [startIndex, endIndex, maxIndex, panToStart]
  );

  const merged = mergeProps({
    themeTarget: themeProps('brush-range-scrubber', {
      tone,
      empty: isEmpty,
      dragging: activeDrag !== null,
    }),
    baseClassName: 'prism-slab p-4 space-y-3 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('brush-range-scrubber', 'header');
  const presetsClass = stableClassName('brush-range-scrubber', 'presets');
  const overviewClass = stableClassName('brush-range-scrubber', 'overview');
  const windowClass = stableClassName('brush-range-scrubber', 'window');
  const handleClass = stableClassName('brush-range-scrubber', 'handle');
  const readoutClass = stableClassName('brush-range-scrubber', 'readout');

  const startPoint = isEmpty ? null : sanitizedData[startIndex]!;
  const endPoint = isEmpty ? null : sanitizedData[endIndex]!;

  const startX = isEmpty
    ? PAD_X
    : Number((PAD_X + (startIndex / maxIndex) * PLOT_WIDTH).toFixed(2));
  const endX = isEmpty
    ? VIEW_WIDTH - PAD_X
    : Number((PAD_X + (endIndex / maxIndex) * PLOT_WIDTH).toFixed(2));
  const selectionWidth = Math.max(0, Number((endX - startX).toFixed(2)));
  const leftScrimWidth = Math.max(0, Number((startX - PAD_X).toFixed(2)));
  const rightScrimWidth = Math.max(0, Number((VIEW_WIDTH - PAD_X - endX).toFixed(2)));

  const handleHeight = geometry
    ? Math.min(34, Math.max(22, Math.round(geometry.plotHeight * 0.45)))
    : 24;
  const handleY = geometry
    ? Number((PAD_TOP + (geometry.plotHeight - handleHeight) / 2).toFixed(2))
    : PAD_TOP;
  const gripTop = Number((handleY + 6).toFixed(2));
  const gripBottom = Number((handleY + handleHeight - 6).toFixed(2));

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2')}>
        <div className="min-w-0 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: toneVar }}
          />
          <h4
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </h4>
        </div>

        {!isEmpty ? (
          <div
            role="group"
            aria-label="Quick range presets"
            data-testid="brush-scrubber-presets"
            className={cx(
              presetsClass,
              'prism-crystal p-1 rounded-full inline-flex items-center gap-1'
            )}
          >
            {presets.map((preset) => {
              const isActive =
                startIndex === preset.range[0] && endIndex === preset.range[1];
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={isActive}
                  data-testid={`brush-preset-${preset.id}`}
                  onClick={() => commitRange(preset.range)}
                  className={cx(
                    'prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-medium cursor-pointer transition-all',
                    isActive ? 'prism-emerald font-semibold' : 'opacity-80 hover:opacity-100'
                  )}
                  style={{
                    color: isActive
                      ? 'var(--prism-success-contrast)'
                      : 'var(--prism-text-primary)',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {isEmpty || !geometry || !startPoint || !endPoint ? (
        <div
          role="status"
          data-testid="brush-scrubber-empty"
          className="prism-well rounded-2xl px-4 py-6 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          At least 2 finite data points are required to scrub a range.
        </div>
      ) : (
        <>
          <div className={cx(overviewClass, 'prism-well rounded-2xl p-2')}>
            <svg
              ref={svgRef}
              aria-labelledby={headingId}
              data-testid="brush-scrubber-svg"
              viewBox={`0 0 ${VIEW_WIDTH} ${safeHeight}`}
              preserveAspectRatio="none"
              className="w-full block overflow-visible touch-none"
              style={{ height: `${safeHeight}px`, touchAction: 'none' }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={toneVar} stopOpacity={0.42} />
                  <stop offset="100%" stopColor={toneVar} stopOpacity={0.04} />
                </linearGradient>
              </defs>

              <line
                x1={PAD_X}
                y1={geometry.baselineY}
                x2={VIEW_WIDTH - PAD_X}
                y2={geometry.baselineY}
                stroke="var(--prism-divider)"
                strokeWidth={1}
              />

              <polygon
                data-testid="brush-sparkline-area"
                points={geometry.areaPoints}
                fill={`url(#${gradientId})`}
              />

              <polyline
                data-testid="brush-sparkline-line"
                fill="none"
                stroke={toneVar}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={geometry.polylinePoints}
              />

              <rect
                data-testid="brush-scrim-left"
                x={PAD_X}
                y={PAD_TOP}
                width={leftScrimWidth}
                height={geometry.plotHeight}
                fill="var(--prism-bg-end)"
                fillOpacity={0.68}
                pointerEvents="none"
              />

              <rect
                data-testid="brush-scrim-right"
                x={endX}
                y={PAD_TOP}
                width={rightScrimWidth}
                height={geometry.plotHeight}
                fill="var(--prism-bg-end)"
                fillOpacity={0.68}
                pointerEvents="none"
              />

              <g
                role="group"
                aria-label="Pan selected range"
                tabIndex={0}
                data-testid="brush-selection-window"
                data-dragging={activeDrag === 'pan' ? 'true' : undefined}
                onPointerDown={handleWindowPointerDown}
                onKeyDown={handleWindowKeyDown}
                className={cx(
                  windowClass,
                  'prism-focus-ring',
                  activeDrag === 'pan' ? 'cursor-grabbing' : 'cursor-grab'
                )}
              >
                <rect
                  x={startX}
                  y={PAD_TOP}
                  width={selectionWidth}
                  height={geometry.plotHeight}
                  rx={4}
                  fill={toneVar}
                  fillOpacity={activeDrag === 'pan' ? 0.22 : 0.12}
                  stroke={toneVar}
                  strokeWidth={1.5}
                  strokeOpacity={0.75}
                />
              </g>

              <g
                role="slider"
                tabIndex={0}
                aria-label="Start brush handle"
                aria-valuemin={0}
                aria-valuemax={endIndex - safeMinSpan}
                aria-valuenow={startIndex}
                aria-valuetext={`${startPoint.label} (${startPoint.value})`}
                data-testid="brush-handle-start"
                data-handle="start"
                data-dragging={activeDrag === 'start' ? 'true' : undefined}
                onPointerDown={handleEdgePointerDown('start')}
                onKeyDown={handleEdgeKeyDown('start')}
                className={cx(
                  handleClass,
                  'prism-focus-ring',
                  activeDrag === 'start' ? 'cursor-grabbing' : 'cursor-ew-resize'
                )}
              >
                <rect
                  x={startX - 10}
                  y={PAD_TOP}
                  width={20}
                  height={geometry.plotHeight}
                  fill="var(--prism-bg-start)"
                  fillOpacity={0}
                />
                <line
                  x1={startX}
                  y1={PAD_TOP}
                  x2={startX}
                  y2={geometry.baselineY}
                  stroke={toneVar}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <rect
                  x={startX - HANDLE_WIDTH / 2}
                  y={handleY}
                  width={HANDLE_WIDTH}
                  height={handleHeight}
                  rx={6}
                  fill="var(--prism-bg-start)"
                  stroke={toneVar}
                  strokeWidth={2}
                />
                <line
                  x1={startX - 2}
                  y1={gripTop}
                  x2={startX - 2}
                  y2={gripBottom}
                  stroke={toneVar}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
                <line
                  x1={startX + 2}
                  y1={gripTop}
                  x2={startX + 2}
                  y2={gripBottom}
                  stroke={toneVar}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              </g>

              <g
                role="slider"
                tabIndex={0}
                aria-label="End brush handle"
                aria-valuemin={startIndex + safeMinSpan}
                aria-valuemax={maxIndex}
                aria-valuenow={endIndex}
                aria-valuetext={`${endPoint.label} (${endPoint.value})`}
                data-testid="brush-handle-end"
                data-handle="end"
                data-dragging={activeDrag === 'end' ? 'true' : undefined}
                onPointerDown={handleEdgePointerDown('end')}
                onKeyDown={handleEdgeKeyDown('end')}
                className={cx(
                  handleClass,
                  'prism-focus-ring',
                  activeDrag === 'end' ? 'cursor-grabbing' : 'cursor-ew-resize'
                )}
              >
                <rect
                  x={endX - 10}
                  y={PAD_TOP}
                  width={20}
                  height={geometry.plotHeight}
                  fill="var(--prism-bg-start)"
                  fillOpacity={0}
                />
                <line
                  x1={endX}
                  y1={PAD_TOP}
                  x2={endX}
                  y2={geometry.baselineY}
                  stroke={toneVar}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <rect
                  x={endX - HANDLE_WIDTH / 2}
                  y={handleY}
                  width={HANDLE_WIDTH}
                  height={handleHeight}
                  rx={6}
                  fill="var(--prism-bg-start)"
                  stroke={toneVar}
                  strokeWidth={2}
                />
                <line
                  x1={endX - 2}
                  y1={gripTop}
                  x2={endX - 2}
                  y2={gripBottom}
                  stroke={toneVar}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
                <line
                  x1={endX + 2}
                  y1={gripTop}
                  x2={endX + 2}
                  y2={gripBottom}
                  stroke={toneVar}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </div>

          <div
            aria-live="polite"
            data-testid="brush-scrubber-readout"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-mono tabular-nums'
            )}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: toneVar }}
            />
            <span>
              {startPoint.label} → {endPoint.label} · {endIndex - startIndex + 1} /{' '}
              {sanitizedData.length} points
            </span>
          </div>
        </>
      )}
    </div>
  );
}

BrushRangeScrubber.displayName = 'BrushRangeScrubber';
