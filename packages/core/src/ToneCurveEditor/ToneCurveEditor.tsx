'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { RotateCcw, Spline } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type ToneCurveChannel = 'luma' | 'red' | 'green' | 'blue';

export type ToneCurvePresetId = 'linear' | 's-curve' | 'matte-lift';

export interface ToneCurvePoint {
  /** Stable point identifier within the channel. */
  id: string;
  /** Input tonal level in [0..255], kept sorted ascending. */
  x: number;
  /** Output tonal level in [0..255]. */
  y: number;
}

export type ToneCurveChannelMap = Record<ToneCurveChannel, ReadonlyArray<ToneCurvePoint>>;

type ToneCurveEditorBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ToneCurveEditorProps extends ToneCurveEditorBaseProps {
  /** Controlled per-channel tone curves (missing channels fall back to default diagonal). */
  curves?: Partial<ToneCurveChannelMap>;
  /** Initial per-channel tone curves for uncontrolled usage (default diagonal per channel). */
  defaultCurves?: Partial<ToneCurveChannelMap>;
  /** Controlled active grading channel. */
  activeChannel?: ToneCurveChannel;
  /** Initial active channel in uncontrolled mode (defaults to 'luma'). */
  defaultChannel?: ToneCurveChannel;
  /** Callback fired when the active channel changes. */
  onChannelChange?: (channel: ToneCurveChannel) => void;
  /** Callback fired whenever control points on the active channel change. */
  onChange?: (
    channel: ToneCurveChannel,
    points: ToneCurvePoint[],
    allCurves: ToneCurveChannelMap
  ) => void;
  /** Optional background luma histogram silhouette inside the curve grid (deterministic default if omitted). */
  histogram?: ReadonlyArray<number>;
  /** Visible heading label displayed in the optical card header (defaults to 'Tone Curve'). */
  title?: string;
  /** Disables channel switching, presets, resetting, adding, deleting, dragging, and nudging. */
  disabled?: boolean;
}

interface ChannelMeta {
  id: ToneCurveChannel;
  label: string;
  color: string;
}

interface PresetDefinition {
  id: ToneCurvePresetId;
  label: string;
  coords: ReadonlyArray<readonly [number, number]>;
}

interface HistogramBar {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const SVG_SIZE = 260;
const PLOT_X0 = 16;
const PLOT_Y0 = 16;
const PLOT_SIZE = 228;
const PLOT_X1 = PLOT_X0 + PLOT_SIZE;
const PLOT_Y1 = PLOT_Y0 + PLOT_SIZE;

const MIN_LEVEL = 0;
const MAX_LEVEL = 255;
const MAX_POINTS = 12;
const FINE_NUDGE_STEP = 4;
const COARSE_NUDGE_STEP = 16;

const GRID_LINES: ReadonlyArray<{ id: string; fraction: number }> = [
  { id: 'grid-0', fraction: 0 },
  { id: 'grid-25', fraction: 0.25 },
  { id: 'grid-50', fraction: 0.5 },
  { id: 'grid-75', fraction: 0.75 },
  { id: 'grid-100', fraction: 1 },
];

export const TONE_CURVE_CHANNELS: ReadonlyArray<ChannelMeta> = [
  { id: 'luma', label: 'Luma', color: 'var(--prism-text-primary)' },
  { id: 'red', label: 'Red', color: 'var(--prism-error-main)' },
  { id: 'green', label: 'Green', color: 'var(--prism-success-main)' },
  { id: 'blue', label: 'Blue', color: 'var(--prism-info-main)' },
];

export const TONE_CURVE_PRESETS: ReadonlyArray<PresetDefinition> = [
  {
    id: 'linear',
    label: 'Linear',
    coords: [
      [0, 0],
      [64, 64],
      [192, 192],
      [255, 255],
    ],
  },
  {
    id: 's-curve',
    label: 'S-Curve',
    coords: [
      [0, 0],
      [64, 44],
      [192, 212],
      [255, 255],
    ],
  },
  {
    id: 'matte-lift',
    label: 'Matte Lift',
    coords: [
      [0, 24],
      [64, 72],
      [192, 196],
      [255, 242],
    ],
  },
];

const DEFAULT_HISTOGRAM: ReadonlyArray<number> = [
  6, 10, 16, 24, 34, 46, 58, 68, 76, 82, 86, 80, 72, 64, 58, 62, 70, 80, 90, 96, 100, 92, 82, 70,
  58, 46, 36, 28, 22, 16, 11, 7,
];

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function createPresetPoints(
  channel: ToneCurveChannel,
  coords: ReadonlyArray<readonly [number, number]>
): ToneCurvePoint[] {
  return coords.map(([x, y], index) => ({
    id: `${channel}-p${index}`,
    x,
    y,
  }));
}

function createDefaultDiagonal(channel: ToneCurveChannel): ToneCurvePoint[] {
  return createPresetPoints(channel, TONE_CURVE_PRESETS[0]!.coords);
}

function makeUniqueId(base: string, seen: Map<string, number>): string {
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function sanitizeChannelPoints(
  channel: ToneCurveChannel,
  rawPoints: ReadonlyArray<ToneCurvePoint> | undefined
): ToneCurvePoint[] {
  if (!rawPoints || rawPoints.length === 0) {
    return createDefaultDiagonal(channel);
  }

  const seen = new Map<string, number>();
  const sliced = rawPoints.slice(0, MAX_POINTS);
  const normalized: ToneCurvePoint[] = sliced.map((pt, index) => {
    const trimmed = pt.id.trim();
    const baseId = trimmed.length > 0 ? trimmed : `${channel}-pt-${index + 1}`;
    return {
      id: makeUniqueId(baseId, seen),
      x: Math.round(clampNumber(pt.x, MIN_LEVEL, MAX_LEVEL, MIN_LEVEL)),
      y: Math.round(clampNumber(pt.y, MIN_LEVEL, MAX_LEVEL, MIN_LEVEL)),
    };
  });

  normalized.sort((a, b) => a.x - b.x);

  const first = normalized[0]!;
  if (first.x > MIN_LEVEL) {
    if (normalized.length < MAX_POINTS) {
      normalized.unshift({
        id: makeUniqueId(`${channel}-start`, seen),
        x: MIN_LEVEL,
        y: first.y,
      });
    } else {
      normalized[0] = { ...first, x: MIN_LEVEL };
    }
  }

  const lastIndex = normalized.length - 1;
  const last = normalized[lastIndex]!;
  if (last.x < MAX_LEVEL) {
    if (normalized.length < MAX_POINTS) {
      normalized.push({
        id: makeUniqueId(`${channel}-end`, seen),
        x: MAX_LEVEL,
        y: last.y,
      });
    } else {
      normalized[lastIndex] = { ...last, x: MAX_LEVEL };
    }
  }

  return normalized;
}

function buildInitialChannelMap(partial?: Partial<ToneCurveChannelMap>): ToneCurveChannelMap {
  return {
    luma: sanitizeChannelPoints('luma', partial?.luma),
    red: sanitizeChannelPoints('red', partial?.red),
    green: sanitizeChannelPoints('green', partial?.green),
    blue: sanitizeChannelPoints('blue', partial?.blue),
  };
}

const CHANNEL_META_BY_ID: Record<ToneCurveChannel, ChannelMeta> = {
  luma: TONE_CURVE_CHANNELS[0]!,
  red: TONE_CURVE_CHANNELS[1]!,
  green: TONE_CURVE_CHANNELS[2]!,
  blue: TONE_CURVE_CHANNELS[3]!,
};

function getChannelMeta(channel: ToneCurveChannel): ChannelMeta {
  return CHANNEL_META_BY_ID[channel];
}

function matchPreset(points: ReadonlyArray<ToneCurvePoint>): ToneCurvePresetId | null {
  for (const preset of TONE_CURVE_PRESETS) {
    if (points.length !== preset.coords.length) continue;
    let matches = true;
    for (let i = 0; i < points.length; i += 1) {
      const pt = points[i]!;
      const [px, py] = preset.coords[i]!;
      if (pt.x !== px || pt.y !== py) {
        matches = false;
        break;
      }
    }
    if (matches) return preset.id;
  }
  return null;
}

function levelToSvg(x: number, y: number): { x: number; y: number } {
  return {
    x: roundTwo(PLOT_X0 + (x / MAX_LEVEL) * PLOT_SIZE),
    y: roundTwo(PLOT_Y1 - (y / MAX_LEVEL) * PLOT_SIZE),
  };
}

function svgToLevel(svgX: number, svgY: number): { x: number; y: number } {
  const x = Math.round(
    clampNumber(((svgX - PLOT_X0) / PLOT_SIZE) * MAX_LEVEL, MIN_LEVEL, MAX_LEVEL, MIN_LEVEL)
  );
  const y = Math.round(
    clampNumber(((PLOT_Y1 - svgY) / PLOT_SIZE) * MAX_LEVEL, MIN_LEVEL, MAX_LEVEL, MIN_LEVEL)
  );
  return { x, y };
}

function buildMonotoneSplinePath(points: ReadonlyArray<ToneCurvePoint>): string {
  const n = points.length;
  const firstSvg = levelToSvg(points[0]!.x, points[0]!.y);

  if (n === 2) {
    const endSvg = levelToSvg(points[1]!.x, points[1]!.y);
    return `M ${firstSvg.x},${firstSvg.y} L ${endSvg.x},${endSvg.y}`;
  }

  const deltas: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const dx = Math.max(1e-6, points[i + 1]!.x - points[i]!.x);
    deltas.push((points[i + 1]!.y - points[i]!.y) / dx);
  }

  const tangents: number[] = new Array<number>(n).fill(0);
  tangents[0] = deltas[0]!;
  tangents[n - 1] = deltas[n - 2]!;
  for (let i = 1; i < n - 1; i += 1) {
    const dPrev = deltas[i - 1]!;
    const dNext = deltas[i]!;
    tangents[i] = dPrev * dNext <= 0 ? 0 : (dPrev + dNext) / 2;
  }

  for (let i = 0; i < n - 1; i += 1) {
    const d = deltas[i]!;
    if (d === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i]! / d;
      const b = tangents[i + 1]! / d;
      const h = Math.hypot(a, b);
      if (h > 3) {
        const tau = 3 / h;
        tangents[i] = tau * a * d;
        tangents[i + 1] = tau * b * d;
      }
    }
  }

  const segments: string[] = [`M ${firstSvg.x},${firstSvg.y}`];
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const dx = p1.x - p0.x;
    const cp1X = p0.x + dx / 3;
    const cp1Y = clampNumber(p0.y + (tangents[i]! * dx) / 3, MIN_LEVEL, MAX_LEVEL, p0.y);
    const cp2X = p1.x - dx / 3;
    const cp2Y = clampNumber(p1.y - (tangents[i + 1]! * dx) / 3, MIN_LEVEL, MAX_LEVEL, p1.y);
    const c1 = levelToSvg(cp1X, cp1Y);
    const c2 = levelToSvg(cp2X, cp2Y);
    const end = levelToSvg(p1.x, p1.y);
    segments.push(`C ${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`);
  }

  return segments.join(' ');
}

function getPointXBounds(
  points: ReadonlyArray<ToneCurvePoint>,
  index: number
): { minX: number; maxX: number; isEndpoint: boolean } {
  if (index === 0) {
    return { minX: MIN_LEVEL, maxX: MIN_LEVEL, isEndpoint: true };
  }
  if (index === points.length - 1) {
    return { minX: MAX_LEVEL, maxX: MAX_LEVEL, isEndpoint: true };
  }
  const prevX = points[index - 1]!.x;
  const nextX = points[index + 1]!.x;
  const minX = Math.max(MIN_LEVEL + 1, prevX + 1);
  const maxX = Math.min(MAX_LEVEL - 1, nextX - 1);
  if (minX > maxX) {
    return { minX: prevX, maxX: nextX, isEndpoint: false };
  }
  return { minX, maxX, isEndpoint: false };
}

function findNearestFreeInteriorX(
  points: ReadonlyArray<ToneCurvePoint>,
  desiredX: number
): number {
  const occupied = new Set(points.map((pt) => pt.x));
  const clamped = Math.round(clampNumber(desiredX, MIN_LEVEL + 1, MAX_LEVEL - 1, 128));
  if (!occupied.has(clamped)) return clamped;

  let candidate = clamped;
  for (let offset = 1; offset < MAX_LEVEL; offset += 1) {
    const right = clamped + offset;
    if (right <= MAX_LEVEL - 1 && !occupied.has(right)) {
      candidate = right;
      break;
    }
    const left = clamped - offset;
    if (left >= MIN_LEVEL + 1 && !occupied.has(left)) {
      candidate = left;
      break;
    }
  }
  return candidate;
}

function buildHistogramBars(rawHistogram: ReadonlyArray<number> | undefined): HistogramBar[] {
  const source = rawHistogram ?? DEFAULT_HISTOGRAM;
  if (source.length === 0) return [];

  const sanitized = source.map((val) => (Number.isFinite(val) && val > 0 ? val : 0));
  let peak = 1;
  for (const val of sanitized) {
    if (val > peak) peak = val;
  }

  const barWidth = PLOT_SIZE / sanitized.length;
  const maxBarHeight = PLOT_SIZE * 0.72;

  return sanitized.map((val, idx) => {
    const height = roundTwo((val / peak) * maxBarHeight);
    return {
      id: `tone-hist-${idx}`,
      x: roundTwo(PLOT_X0 + idx * barWidth),
      y: roundTwo(PLOT_Y1 - height),
      width: roundTwo(Math.max(0.5, barWidth - 0.6)),
      height,
    };
  });
}

const headerClass = /*#__PURE__*/ stableClassName('tone-curve-editor', 'header');
const channelsClass = /*#__PURE__*/ stableClassName('tone-curve-editor', 'channels');
const presetsClass = /*#__PURE__*/ stableClassName('tone-curve-editor', 'presets');
const graphClass = /*#__PURE__*/ stableClassName('tone-curve-editor', 'graph');
const pointClass = /*#__PURE__*/ stableClassName('tone-curve-editor', 'point');
const readoutClass = /*#__PURE__*/ stableClassName('tone-curve-editor', 'readout');

function ToneCurveEditorInner({
  curves,
  defaultCurves,
  activeChannel,
  defaultChannel = 'luma',
  onChannelChange,
  onChange,
  histogram,
  title = 'Tone Curve',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ToneCurveEditorProps) {
  const override = useComponentOverride('ToneCurveEditor');
  const headingId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const nextPointCounterRef = useRef<number>(1);

  const [currentChannel, setCurrentChannel] = useControllableState<ToneCurveChannel>({
    value: activeChannel,
    defaultValue: defaultChannel,
    onChange: onChannelChange,
  });

  const [internalCurves, setInternalCurves] = useState<ToneCurveChannelMap>(() =>
    buildInitialChannelMap(defaultCurves)
  );

  const allCurves = useMemo<ToneCurveChannelMap>(
    () => ({
      luma: curves?.luma !== undefined ? sanitizeChannelPoints('luma', curves.luma) : internalCurves.luma,
      red: curves?.red !== undefined ? sanitizeChannelPoints('red', curves.red) : internalCurves.red,
      green:
        curves?.green !== undefined ? sanitizeChannelPoints('green', curves.green) : internalCurves.green,
      blue: curves?.blue !== undefined ? sanitizeChannelPoints('blue', curves.blue) : internalCurves.blue,
    }),
    [curves, internalCurves]
  );

  const activeChannelMeta = getChannelMeta(currentChannel);
  const activePoints = allCurves[activeChannelMeta.id];
  const activePresetId = useMemo(() => matchPreset(activePoints), [activePoints]);
  const histogramBars = useMemo(() => buildHistogramBars(histogram), [histogram]);
  const splinePath = useMemo(() => buildMonotoneSplinePath(activePoints), [activePoints]);

  const [selectedPointId, setSelectedPointId] = useState<string>(() => activePoints[1]!.id);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);

  const selectedPoint =
    activePoints.find((pt) => pt.id === selectedPointId) ?? activePoints[1]!;

  const commitActiveChannel = useCallback(
    (nextRaw: ReadonlyArray<ToneCurvePoint>) => {
      const channel = activeChannelMeta.id;
      const sanitized = sanitizeChannelPoints(channel, nextRaw);
      const nextAll: ToneCurveChannelMap = {
        ...allCurves,
        [channel]: sanitized,
      };
      if (curves?.[channel] === undefined) {
        setInternalCurves(nextAll);
      }
      onChange?.(channel, sanitized, nextAll);
    },
    [activeChannelMeta.id, allCurves, curves, onChange]
  );

  const movePoint = useCallback(
    (pointId: string, rawX: number, rawY: number) => {
      const index = activePoints.findIndex((pt) => pt.id === pointId);
      if (index === -1) return;
      const target = activePoints[index]!;
      const { minX, maxX } = getPointXBounds(activePoints, index);
      const nextX = Math.round(clampNumber(rawX, minX, maxX, target.x));
      const nextY = Math.round(clampNumber(rawY, MIN_LEVEL, MAX_LEVEL, target.y));
      if (nextX === target.x && nextY === target.y) return;

      const updated = activePoints.map((pt) =>
        pt.id === pointId ? { ...pt, x: nextX, y: nextY } : pt
      );
      commitActiveChannel(updated);
    },
    [activePoints, commitActiveChannel]
  );

  const deletePoint = useCallback(
    (pointId: string) => {
      const index = activePoints.findIndex((pt) => pt.id === pointId);
      if (index <= 0 || index >= activePoints.length - 1) return;
      const remaining = activePoints.filter((pt) => pt.id !== pointId);
      setSelectedPointId(remaining[Math.max(0, index - 1)]!.id);
      commitActiveChannel(remaining);
    },
    [activePoints, commitActiveChannel]
  );

  const latestRef = useRef({ movePoint });
  latestRef.current = { movePoint };

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  useEffect(() => {
    cleanupDragRef.current?.();
    setDraggingPointId(null);
  }, [disabled, activeChannelMeta.id]);

  const getSvgRect = useCallback((): DOMRect | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (
      !rect ||
      !Number.isFinite(rect.width) ||
      !Number.isFinite(rect.height) ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return null;
    }
    return rect;
  }, []);

  const handleSelectChannel = (channel: ToneCurveChannel) => {
    if (channel === activeChannelMeta.id) return;
    setCurrentChannel(channel);
    const nextChannelPoints = allCurves[channel];
    setSelectedPointId(nextChannelPoints[1]!.id);
  };

  const handleApplyPreset = (preset: PresetDefinition) => {
    const nextPoints = createPresetPoints(activeChannelMeta.id, preset.coords);
    setSelectedPointId(nextPoints[1]!.id);
    commitActiveChannel(nextPoints);
  };

  const handleResetChannel = () => {
    const nextPoints = createDefaultDiagonal(activeChannelMeta.id);
    setSelectedPointId(nextPoints[1]!.id);
    commitActiveChannel(nextPoints);
  };

  const handleSvgClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (disabled || draggingPointId !== null || activePoints.length >= MAX_POINTS) return;
    const rect = getSvgRect();
    if (!rect) return;

    const svgX = ((event.clientX - rect.left) / rect.width) * SVG_SIZE;
    const svgY = ((event.clientY - rect.top) / rect.height) * SVG_SIZE;
    const { x, y } = svgToLevel(svgX, svgY);

    const freeX = findNearestFreeInteriorX(activePoints, x);
    const existingIds = new Set(activePoints.map((pt) => pt.id));
    let candidateId = `${activeChannelMeta.id}-pt-${nextPointCounterRef.current}`;
    while (existingIds.has(candidateId)) {
      nextPointCounterRef.current += 1;
      candidateId = `${activeChannelMeta.id}-pt-${nextPointCounterRef.current}`;
    }
    nextPointCounterRef.current += 1;

    const inserted: ToneCurvePoint = { id: candidateId, x: freeX, y };
    setSelectedPointId(inserted.id);
    commitActiveChannel([...activePoints, inserted]);
  };

  const handlePointPointerDown =
    (pointId: string) => (event: ReactPointerEvent<SVGGElement>) => {
      event.stopPropagation();
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      setSelectedPointId(pointId);

      if (!getSvgRect()) return;

      cleanupDragRef.current?.();
      const pointerId = event.pointerId;
      setDraggingPointId(pointId);

      const handleWindowPointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const rect = getSvgRect();
        if (!rect) return;
        const svgX = ((moveEvent.clientX - rect.left) / rect.width) * SVG_SIZE;
        const svgY = ((moveEvent.clientY - rect.top) / rect.height) * SVG_SIZE;
        const { x, y } = svgToLevel(svgX, svgY);
        latestRef.current.movePoint(pointId, x, y);
      });

      const cleanup = () => {
        handleWindowPointerMove.cancel();
        window.removeEventListener('pointermove', handleWindowPointerMove);
        window.removeEventListener('pointerup', handleWindowPointerEnd);
        window.removeEventListener('pointercancel', handleWindowPointerEnd);
        cleanupDragRef.current = null;
      };

      const handleWindowPointerEnd = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== pointerId) return;
        cleanup();
        setDraggingPointId(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
      window.addEventListener('pointerup', handleWindowPointerEnd);
      window.addEventListener('pointercancel', handleWindowPointerEnd);
    };

  const handlePointKeyDown =
    (point: ToneCurvePoint) => (event: ReactKeyboardEvent<SVGGElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      const step = event.shiftKey ? COARSE_NUDGE_STEP : FINE_NUDGE_STEP;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedPointId(point.id);
        movePoint(point.id, point.x - step, point.y);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedPointId(point.id);
        movePoint(point.id, point.x + step, point.y);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedPointId(point.id);
        movePoint(point.id, point.x, point.y + step);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedPointId(point.id);
        movePoint(point.id, point.x, point.y - step);
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deletePoint(point.id);
      }
    };

  const isDragging = draggingPointId !== null && !disabled;

  const merged = mergeProps({
    themeTarget: themeProps('tone-curve-editor', {
      channel: activeChannelMeta.id,
      disabled,
      dragging: isDragging,
      preset: activePresetId ?? 'custom',
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full space-y-3.5 min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'space-y-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
              style={{ color: activeChannelMeta.color }}
            >
              <Spline className="w-4 h-4 shrink-0" />
            </span>
            <h4
              id={headingId}
              data-testid="tone-curve-title"
              className="text-sm font-semibold tracking-tight truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </h4>
          </div>

          <div
            role="group"
            aria-label="Tone curve channels"
            data-testid="tone-curve-channel-group"
            className={cx(channelsClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
          >
            {TONE_CURVE_CHANNELS.map((ch) => {
              const isActive = ch.id === activeChannelMeta.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isActive}
                  data-testid={`tone-curve-channel-${ch.id}`}
                  data-channel={ch.id}
                  onClick={() => handleSelectChannel(ch.id)}
                  className={cx(
                    'prism-focus-ring rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 text-[11px] font-semibold border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                    isActive
                      ? 'prism-crystal'
                      : 'prism-well opacity-80 enabled:hover:opacity-100'
                  )}
                  style={{
                    color: isActive ? ch.color : 'var(--prism-text-secondary)',
                    borderColor: isActive ? ch.color : 'var(--prism-divider)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: ch.color }}
                  />
                  <span>{ch.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div
            role="group"
            aria-label="Tone curve presets"
            data-testid="tone-curve-preset-group"
            className={cx(presetsClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
          >
            {TONE_CURVE_PRESETS.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isActive}
                  data-testid={`tone-curve-preset-${preset.id}`}
                  onClick={() => handleApplyPreset(preset)}
                  className={cx(
                    'prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                    isActive
                      ? 'prism-btn-primary'
                      : 'prism-crystal opacity-85 enabled:hover:opacity-100'
                  )}
                  style={isActive ? undefined : STYLE_TEXT_PRIMARY}
                >
                  <span className="relative z-10">{preset.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={disabled}
            data-testid="tone-curve-reset-button"
            onClick={handleResetChannel}
            className="prism-btn-secondary prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          >
            <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span>Reset Channel</span>
          </button>
        </div>
      </div>

      <div
        className={cx(
          graphClass,
          'prism-well rounded-2xl p-3 flex items-center justify-center min-w-0',
          disabled ? 'opacity-60' : undefined
        )}
      >
        <svg
          ref={svgRef}
          role="img"
          aria-label={`${title} ${activeChannelMeta.label} curve graph with ${activePoints.length} control points`}
          data-testid="tone-curve-svg"
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          onClick={handleSvgClick}
          className={cx(
            'w-full h-auto max-w-[300px] block overflow-visible select-none touch-none prism-contain-leaf',
            disabled || activePoints.length >= MAX_POINTS ? 'cursor-default' : 'cursor-crosshair'
          )}
          style={{ touchAction: 'none' }}
        >
          <rect
            data-testid="tone-curve-plot-bg"
            x={PLOT_X0}
            y={PLOT_Y0}
            width={PLOT_SIZE}
            height={PLOT_SIZE}
            rx={6}
            fill="var(--prism-bg-start)"
            fillOpacity={0.22}
            stroke="var(--prism-divider)"
            strokeWidth={1}
          />

          <g data-testid="tone-curve-histogram" aria-hidden="true">
            {histogramBars.map((bar) => (
              <rect
                key={bar.id}
                data-testid="tone-curve-histogram-bar"
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={activeChannelMeta.color}
                fillOpacity={0.14}
              />
            ))}
          </g>

          {GRID_LINES.map((grid) => {
            const gx = roundTwo(PLOT_X0 + grid.fraction * PLOT_SIZE);
            const gy = roundTwo(PLOT_Y1 - grid.fraction * PLOT_SIZE);
            return (
              <g key={grid.id} data-testid="tone-curve-gridline" aria-hidden="true">
                <line
                  x1={PLOT_X0}
                  y1={gy}
                  x2={PLOT_X1}
                  y2={gy}
                  stroke="var(--prism-divider)"
                  strokeWidth={1}
                />
                <line
                  x1={gx}
                  y1={PLOT_Y0}
                  x2={gx}
                  y2={PLOT_Y1}
                  stroke="var(--prism-divider)"
                  strokeWidth={1}
                />
              </g>
            );
          })}

          <line
            data-testid="tone-curve-diagonal"
            aria-hidden="true"
            x1={PLOT_X0}
            y1={PLOT_Y1}
            x2={PLOT_X1}
            y2={PLOT_Y0}
            stroke="var(--prism-text-disabled)"
            strokeWidth={1.25}
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />

          <path
            data-testid="tone-curve-path"
            d={splinePath}
            fill="none"
            stroke={activeChannelMeta.color}
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {activePoints.map((point, index) => {
            const svgPos = levelToSvg(point.x, point.y);
            const isEndpoint = index === 0 || index === activePoints.length - 1;
            const isSelected = point.id === selectedPoint.id;
            const isDraggingThis = draggingPointId === point.id && !disabled;

            return (
              <g
                key={point.id}
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label={`${activeChannelMeta.label} control point ${index + 1}${isEndpoint ? ' endpoint' : ''}`}
                aria-valuemin={MIN_LEVEL}
                aria-valuemax={MAX_LEVEL}
                aria-valuenow={point.y}
                aria-valuetext={`In: ${point.x}, Out: ${point.y}`}
                aria-disabled={disabled || undefined}
                data-testid={`tone-curve-point-${point.id}`}
                data-point-id={point.id}
                data-x={String(point.x)}
                data-y={String(point.y)}
                data-endpoint={isEndpoint ? 'true' : undefined}
                data-selected={isSelected ? 'true' : undefined}
                data-dragging={isDraggingThis ? 'true' : undefined}
                onPointerDown={handlePointPointerDown(point.id)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!disabled) {
                    setSelectedPointId(point.id);
                  }
                }}
                onKeyDown={handlePointKeyDown(point)}
                className={cx(
                  pointClass,
                  'prism-focus-ring',
                  disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : isDraggingThis
                      ? 'cursor-grabbing'
                      : 'cursor-grab'
                )}
              >
                <circle
                  cx={svgPos.x}
                  cy={svgPos.y}
                  r={14}
                  fill="var(--prism-bg-start)"
                  fillOpacity={0}
                />
                {isSelected ? (
                  <circle
                    cx={svgPos.x}
                    cy={svgPos.y}
                    r={10}
                    fill={activeChannelMeta.color}
                    fillOpacity={0.18}
                  />
                ) : null}
                <circle
                  cx={svgPos.x}
                  cy={svgPos.y}
                  r={isDraggingThis ? 7 : isSelected ? 6 : 5}
                  fill={isSelected ? activeChannelMeta.color : 'var(--prism-bg-start)'}
                  stroke={isSelected ? 'var(--prism-primary-contrast)' : activeChannelMeta.color}
                  strokeWidth={2}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div
        aria-live="polite"
        data-testid="tone-curve-readout"
        className={cx(
          readoutClass,
          'prism-well rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums min-w-0'
        )}
      >
        <span
          data-testid="tone-curve-selected-coords"
          className="font-semibold"
          style={STYLE_TEXT_PRIMARY}
        >
          In: {selectedPoint.x} · Out: {selectedPoint.y}
        </span>
        <span
          data-testid="tone-curve-point-count"
          style={STYLE_TEXT_SECONDARY}
        >
          {activePoints.length} / {MAX_POINTS} points · {activeChannelMeta.label}
        </span>
      </div>
    </div>
  );
}

export const ToneCurveEditor = /*#__PURE__*/ memoWithDisplayName(ToneCurveEditorInner, 'ToneCurveEditor');
