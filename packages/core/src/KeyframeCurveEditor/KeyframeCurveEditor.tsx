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
import { Plus, Spline, Trash2 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_DIVIDER, STYLE_FILL_PRIMARY, STYLE_FILL_SECONDARY, STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type EasingPresetId = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'overshoot';

export type CubicBezierTuple = [number, number, number, number];

export interface AnimationKeyframe {
  /** Stable identifier for the keyframe. */
  id: string;
  /** Timeline position percentage clamped to [0..100]. */
  timePct: number;
  /** Animated property value at this keyframe. */
  value: number;
  /** Outgoing cubic-bezier easing tuple [x1, y1, x2, y2] (x clamped 0..1, y clamped -0.5..1.5). */
  easing: CubicBezierTuple;
}

export interface KeyframeCurveEditorProps extends BaseProps<HTMLDivElement> {
  /** Animated property label shown in the card header (defaults to 'Opacity'). */
  propertyName?: string;
  /** Unit suffix appended to keyframe values (defaults to '%'). */
  unit?: string;
  /** Controlled keyframes list. */
  keyframes?: ReadonlyArray<AnimationKeyframe>;
  /** Uncontrolled initial keyframes list (defaults to 3 keyframes at 0%, 50%, 100%). */
  defaultKeyframes?: ReadonlyArray<AnimationKeyframe>;
  /** Callback fired with the updated sorted keyframes array on any edit. */
  onKeyframesChange?: (keyframes: AnimationKeyframe[]) => void;
  /** Disables adding, deleting, nudging, preset selection, and curve handle dragging. */
  disabled?: boolean;
}

type ControlPointHandle = 'p1' | 'p2';

interface EasingPresetDefinition {
  id: EasingPresetId;
  label: string;
  tuple: CubicBezierTuple;
}

const SVG_WIDTH = 260;
const SVG_HEIGHT = 220;
const PLOT_X0 = 38;
const PLOT_X1 = 238;
const PLOT_WIDTH = PLOT_X1 - PLOT_X0;
const PLOT_Y_TOP = 60;
const PLOT_Y_BOTTOM = 156;
const PLOT_HEIGHT = PLOT_Y_BOTTOM - PLOT_Y_TOP;

const TIME_NUDGE_STEP = 5;
const BEZIER_NUDGE_STEP = 0.05;
const MIN_Y = -0.5;
const MAX_Y = 1.5;

const DEFAULT_EASING: CubicBezierTuple = [0.42, 0, 0.58, 1];

export const EASING_PRESETS: ReadonlyArray<EasingPresetDefinition> = [
  { id: 'linear', label: 'Linear', tuple: [0, 0, 1, 1] },
  { id: 'ease-in', label: 'Ease In', tuple: [0.42, 0, 1, 1] },
  { id: 'ease-out', label: 'Ease Out', tuple: [0, 0, 0.58, 1] },
  { id: 'ease-in-out', label: 'Ease In-Out', tuple: [0.42, 0, 0.58, 1] },
  { id: 'overshoot', label: 'Overshoot', tuple: [0.34, 1.5, 0.64, 1] },
];

const DEFAULT_KEYFRAMES: ReadonlyArray<AnimationKeyframe> = [
  { id: 'kf-start', timePct: 0, value: 0, easing: [0.42, 0, 0.58, 1] },
  { id: 'kf-mid', timePct: 50, value: 100, easing: [0, 0, 0.58, 1] },
  { id: 'kf-end', timePct: 100, value: 100, easing: [0, 0, 1, 1] },
];

const LANE_TICKS: ReadonlyArray<number> = [0, 25, 50, 75, 100];
const GRID_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];
const Y_AXIS_LABELS: ReadonlyArray<{ value: number; text: string }> = [
  { value: 1, text: '1.0' },
  { value: 0.5, text: '0.5' },
  { value: 0, text: '0.0' },
];
const X_AXIS_LABELS: ReadonlyArray<{ value: number; text: string }> = [
  { value: 0, text: '0.0' },
  { value: 0.5, text: '0.5' },
  { value: 1, text: '1.0' },
];

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function sanitizeEasing(easing: CubicBezierTuple): CubicBezierTuple {
  return [
    roundTwo(clampNumber(easing[0], 0, 1, DEFAULT_EASING[0])),
    roundTwo(clampNumber(easing[1], MIN_Y, MAX_Y, DEFAULT_EASING[1])),
    roundTwo(clampNumber(easing[2], 0, 1, DEFAULT_EASING[2])),
    roundTwo(clampNumber(easing[3], MIN_Y, MAX_Y, DEFAULT_EASING[3])),
  ];
}

function sanitizeKeyframes(raw: ReadonlyArray<AnimationKeyframe>): AnimationKeyframe[] {
  const seen = new Map<string, number>();
  const normalized: AnimationKeyframe[] = raw.map((kf, index) => {
    const trimmed = kf.id.trim();
    const baseId = trimmed.length > 0 ? trimmed : `kf-${index + 1}`;
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
    return {
      id,
      timePct: roundTwo(clampNumber(kf.timePct, 0, 100, 0)),
      value: Number.isFinite(kf.value) ? roundTwo(kf.value) : 0,
      easing: sanitizeEasing(kf.easing),
    };
  });
  normalized.sort((a, b) => a.timePct - b.timePct);
  return normalized;
}

function formatCoord(value: number): string {
  const safe = roundTwo(value);
  return safe.toFixed(2);
}

function formatCubicBezier(easing: CubicBezierTuple): string {
  return `cubic-bezier(${formatCoord(easing[0])}, ${formatCoord(easing[1])}, ${formatCoord(easing[2])}, ${formatCoord(easing[3])})`;
}

function formatKeyframeValue(value: number, unit: string): string {
  const formatted = String(roundTwo(value));
  const trimmed = unit.trim();
  return trimmed ? `${formatted}${trimmed}` : formatted;
}

function bezierToSvg(x: number, y: number): { x: number; y: number } {
  return {
    x: roundTwo(PLOT_X0 + x * PLOT_WIDTH),
    y: roundTwo(PLOT_Y_BOTTOM - y * PLOT_HEIGHT),
  };
}

function svgToBezier(svgX: number, svgY: number): { x: number; y: number } {
  const x = roundTwo(clampNumber((svgX - PLOT_X0) / PLOT_WIDTH, 0, 1, 0));
  const y = roundTwo(clampNumber((PLOT_Y_BOTTOM - svgY) / PLOT_HEIGHT, MIN_Y, MAX_Y, 0));
  return { x, y };
}

function easingEquals(a: CubicBezierTuple, b: CubicBezierTuple): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function matchEasingPreset(easing: CubicBezierTuple): EasingPresetId | null {
  for (const preset of EASING_PRESETS) {
    if (
      Math.abs(easing[0] - preset.tuple[0]) < 0.005 &&
      Math.abs(easing[1] - preset.tuple[1]) < 0.005 &&
      Math.abs(easing[2] - preset.tuple[2]) < 0.005 &&
      Math.abs(easing[3] - preset.tuple[3]) < 0.005
    ) {
      return preset.id;
    }
  }
  return null;
}

function computeInsertedKeyframe(
  keyframes: ReadonlyArray<AnimationKeyframe>,
  selectedId: string | null,
  newId: string
): AnimationKeyframe {
  if (keyframes.length === 0) {
    return { id: newId, timePct: 0, value: 0, easing: [...DEFAULT_EASING] };
  }
  if (keyframes.length === 1) {
    const only = keyframes[0]!;
    const timePct = only.timePct < 50 ? 100 : 0;
    return { id: newId, timePct, value: only.value, easing: [...DEFAULT_EASING] };
  }

  const selectedIdx = keyframes.findIndex((kf) => kf.id === selectedId);
  if (selectedIdx >= 0 && selectedIdx < keyframes.length - 1) {
    const current = keyframes[selectedIdx]!;
    const next = keyframes[selectedIdx + 1]!;
    if (next.timePct - current.timePct >= 2) {
      return {
        id: newId,
        timePct: roundTwo((current.timePct + next.timePct) / 2),
        value: roundTwo((current.value + next.value) / 2),
        easing: [...DEFAULT_EASING],
      };
    }
  }

  let bestGap = -1;
  let bestTime = 50;
  let bestValue = keyframes[0]!.value;
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    const left = keyframes[i]!;
    const right = keyframes[i + 1]!;
    const gap = right.timePct - left.timePct;
    if (gap > bestGap) {
      bestGap = gap;
      bestTime = roundTwo((left.timePct + right.timePct) / 2);
      bestValue = roundTwo((left.value + right.value) / 2);
    }
  }

  return { id: newId, timePct: bestTime, value: bestValue, easing: [...DEFAULT_EASING] };
}

function KeyframeCurveEditorInner({
  propertyName = 'Opacity',
  unit = '%',
  keyframes,
  defaultKeyframes,
  onKeyframesChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: KeyframeCurveEditorProps) {
  const override = useComponentOverride('KeyframeCurveEditor');
  const headingId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const nextIdCounterRef = useRef<number>(1);

  const [rawKeyframes, setRawKeyframes] = useControllableState<ReadonlyArray<AnimationKeyframe>>({
    value: keyframes,
    defaultValue: defaultKeyframes ?? DEFAULT_KEYFRAMES,
  });

  const normalizedKeyframes = useMemo<AnimationKeyframe[]>(
    () => sanitizeKeyframes(rawKeyframes),
    [rawKeyframes]
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    () => normalizedKeyframes[0]?.id ?? null
  );
  const [activeDrag, setActiveDrag] = useState<ControlPointHandle | null>(null);

  const isEmpty = normalizedKeyframes.length === 0;
  const selectedKeyframe = useMemo<AnimationKeyframe | null>(() => {
    if (normalizedKeyframes.length === 0) return null;
    return normalizedKeyframes.find((kf) => kf.id === selectedId) ?? normalizedKeyframes[0]!;
  }, [normalizedKeyframes, selectedId]);

  const isDragging = activeDrag !== null && !disabled;
  const activeEasing: CubicBezierTuple = selectedKeyframe?.easing ?? DEFAULT_EASING;
  const activePresetId = selectedKeyframe ? matchEasingPreset(activeEasing) : null;
  const activePresetLabel =
    EASING_PRESETS.find((preset) => preset.id === activePresetId)?.label ?? 'Custom';
  const bezierCss = formatCubicBezier(activeEasing);

  const commitKeyframes = useCallback(
    (nextRaw: ReadonlyArray<AnimationKeyframe>) => {
      const sanitized = sanitizeKeyframes(nextRaw);
      setRawKeyframes(sanitized);
      onKeyframesChange?.(sanitized);
    },
    [setRawKeyframes, onKeyframesChange]
  );

  const updateSelectedEasing = useCallback(
    (target: AnimationKeyframe, nextRaw: CubicBezierTuple) => {
      const sanitized = sanitizeEasing(nextRaw);
      if (easingEquals(target.easing, sanitized)) return;
      const updated = normalizedKeyframes.map((kf) =>
        kf.id === target.id ? { ...kf, easing: sanitized } : kf
      );
      commitKeyframes(updated);
    },
    [normalizedKeyframes, commitKeyframes]
  );

  const updateHandlePosition = useCallback(
    (target: AnimationKeyframe, handle: ControlPointHandle, nextX: number, nextY: number) => {
      const [x1, y1, x2, y2] = target.easing;
      const candidate: CubicBezierTuple =
        handle === 'p1' ? [nextX, nextY, x2, y2] : [x1, y1, nextX, nextY];
      updateSelectedEasing(target, candidate);
    },
    [updateSelectedEasing]
  );

  const latestRef = useRef({ selectedKeyframe, updateHandlePosition });
  latestRef.current = { selectedKeyframe, updateHandlePosition };

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (disabled || isEmpty) {
      cleanupDragRef.current?.();
      setActiveDrag(null);
    }
  }, [disabled, isEmpty]);

  const handleAddKeyframe = () => {
    const existingIds = new Set(normalizedKeyframes.map((kf) => kf.id));
    let candidateId = `kf-${nextIdCounterRef.current}`;
    while (existingIds.has(candidateId)) {
      nextIdCounterRef.current += 1;
      candidateId = `kf-${nextIdCounterRef.current}`;
    }
    nextIdCounterRef.current += 1;

    const inserted = computeInsertedKeyframe(
      normalizedKeyframes,
      selectedKeyframe?.id ?? null,
      candidateId
    );
    setSelectedId(inserted.id);
    commitKeyframes([...normalizedKeyframes, inserted]);
  };

  const handleDeleteKeyframe = (target: AnimationKeyframe) => {
    if (normalizedKeyframes.length <= 1) return;
    const deleteIndex = normalizedKeyframes.findIndex((kf) => kf.id === target.id);
    const remaining = normalizedKeyframes.filter((kf) => kf.id !== target.id);
    const fallbackIndex = Math.max(0, deleteIndex - 1);
    setSelectedId(remaining[fallbackIndex]!.id);
    commitKeyframes(remaining);
  };

  const updateKeyframeTime = (kf: AnimationKeyframe, targetTimePct: number) => {
    const clamped = roundTwo(clampNumber(targetTimePct, 0, 100, kf.timePct));
    setSelectedId(kf.id);
    if (clamped === kf.timePct) return;

    const updated = normalizedKeyframes.map((item) =>
      item.id === kf.id ? { ...item, timePct: clamped } : item
    );
    commitKeyframes(updated);
  };

  const handleKeyframeKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    kf: AnimationKeyframe
  ) => {
    if (disabled || event.nativeEvent.isComposing) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      updateKeyframeTime(kf, kf.timePct - TIME_NUDGE_STEP);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      updateKeyframeTime(kf, kf.timePct + TIME_NUDGE_STEP);
    } else if (event.key === 'Home') {
      event.preventDefault();
      updateKeyframeTime(kf, 0);
    } else if (event.key === 'End') {
      event.preventDefault();
      updateKeyframeTime(kf, 100);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      handleDeleteKeyframe(kf);
    }
  };

  const handleControlKeyDown =
    (target: AnimationKeyframe, handle: ControlPointHandle) =>
    (event: ReactKeyboardEvent<SVGGElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      const curX = handle === 'p1' ? target.easing[0] : target.easing[2];
      const curY = handle === 'p1' ? target.easing[1] : target.easing[3];

      let nextX = curX;
      let nextY = curY;

      if (event.key === 'ArrowLeft') {
        nextX = curX - BEZIER_NUDGE_STEP;
      } else if (event.key === 'ArrowRight') {
        nextX = curX + BEZIER_NUDGE_STEP;
      } else if (event.key === 'ArrowUp') {
        nextY = curY + BEZIER_NUDGE_STEP;
      } else if (event.key === 'ArrowDown') {
        nextY = curY - BEZIER_NUDGE_STEP;
      } else {
        return;
      }

      event.preventDefault();
      updateHandlePosition(target, handle, nextX, nextY);
    };

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

  const handleControlPointerDown =
    (target: AnimationKeyframe, handle: ControlPointHandle) =>
    (event: ReactPointerEvent<SVGGElement>) => {
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();

      if (!getSvgRect()) return;

      cleanupDragRef.current?.();
      const pointerId = event.pointerId;
      let lastX = handle === 'p1' ? target.easing[0] : target.easing[2];
      let lastY = handle === 'p1' ? target.easing[1] : target.easing[3];

      setActiveDrag(handle);

      const handleWindowPointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const rect = getSvgRect();
        const liveTarget = latestRef.current.selectedKeyframe;
        if (!rect || !liveTarget) return;
        const svgX = ((moveEvent.clientX - rect.left) / rect.width) * SVG_WIDTH;
        const svgY = ((moveEvent.clientY - rect.top) / rect.height) * SVG_HEIGHT;
        const { x, y } = svgToBezier(svgX, svgY);
        if (x === lastX && y === lastY) return;
        lastX = x;
        lastY = y;
        latestRef.current.updateHandlePosition(liveTarget, handle, x, y);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handleWindowPointerMove);
        window.removeEventListener('pointerup', handleWindowPointerEnd);
        window.removeEventListener('pointercancel', handleWindowPointerEnd);
        cleanupDragRef.current = null;
      };

      const handleWindowPointerEnd = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== pointerId) return;
        cleanup();
        setActiveDrag(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
      window.addEventListener('pointerup', handleWindowPointerEnd);
      window.addEventListener('pointercancel', handleWindowPointerEnd);
    };

  const p1Svg = bezierToSvg(activeEasing[0], activeEasing[1]);
  const p2Svg = bezierToSvg(activeEasing[2], activeEasing[3]);
  const curvePath = `M ${PLOT_X0},${PLOT_Y_BOTTOM} C ${p1Svg.x},${p1Svg.y} ${p2Svg.x},${p2Svg.y} ${PLOT_X1},${PLOT_Y_TOP}`;
  const overshootTopY = bezierToSvg(0, MAX_Y).y;
  const overshootBottomY = bezierToSvg(0, MIN_Y).y;

  const merged = mergeProps({
    themeTarget: themeProps('keyframe-curve-editor', {
      disabled,
      empty: isEmpty,
      dragging: isDragging,
      preset: activePresetId ?? 'custom',
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('keyframe-curve-editor', 'header');
  const laneClass = stableClassName('keyframe-curve-editor', 'lane');
  const graphClass = stableClassName('keyframe-curve-editor', 'graph');
  const handleClass = stableClassName('keyframe-curve-editor', 'handle');
  const presetsClass = stableClassName('keyframe-curve-editor', 'presets');
  const readoutClass = stableClassName('keyframe-curve-editor', 'readout');

  const canDelete = !disabled && normalizedKeyframes.length > 1;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Spline className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            data-testid="keyframe-property-name"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {propertyName}
          </h4>
          <code
            data-testid="keyframe-bezier-badge"
            className="prism-crystal px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap"
            style={STYLE_TEXT_PRIMARY}
          >
            {selectedKeyframe ? bezierCss : 'No keyframes'}
          </code>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={disabled}
            data-testid="keyframe-add-button"
            onClick={handleAddKeyframe}
            className="prism-btn-primary prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          >
            <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
            <span className="relative z-10">Add Keyframe</span>
          </button>

          <button
            type="button"
            disabled={!canDelete}
            data-testid="keyframe-delete-button"
            onClick={() => handleDeleteKeyframe(selectedKeyframe!)}
            className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          >
            <Trash2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {isEmpty || !selectedKeyframe ? (
        <div
          role="status"
          data-testid="keyframe-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No keyframes configured for {propertyName}. Click Add Keyframe to create an animation curve.
        </div>
      ) : (
        <>
          <div
            data-testid="keyframe-lane"
            className={cx(
              laneClass,
              'prism-well rounded-2xl px-4 py-3 space-y-2',
              disabled ? 'opacity-60' : ''
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span
                className="font-semibold tracking-tight"
                style={STYLE_TEXT_SECONDARY}
              >
                Keyframe Lane ({normalizedKeyframes.length})
              </span>
              <span
                data-testid="keyframe-selected-summary"
                className="font-mono font-semibold tabular-nums"
                style={STYLE_TEXT_PRIMARY}
              >
                {selectedKeyframe.timePct}% · {formatKeyframeValue(selectedKeyframe.value, unit)}
              </span>
            </div>

            <div className="relative h-16 mx-4 flex items-center" data-testid="keyframe-track">
              <div
                aria-hidden="true"
                className="w-full h-1 rounded-full"
                style={STYLE_BG_DIVIDER}
              />

              {LANE_TICKS.map((pct) => (
                <span
                  key={`tick-${pct}`}
                  aria-hidden="true"
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-3 pointer-events-none"
                  style={{
                    left: `${pct}%`,
                    backgroundColor: 'var(--prism-divider)',
                  }}
                />
              ))}

              {normalizedKeyframes.map((kf) => {
                const isSelected = kf.id === selectedKeyframe.id;
                const formattedVal = formatKeyframeValue(kf.value, unit);
                return (
                  <button
                    key={kf.id}
                    type="button"
                    role="button"
                    disabled={disabled}
                    aria-pressed={isSelected}
                    aria-label={`Keyframe at ${kf.timePct}%, value ${formattedVal}`}
                    data-testid={`keyframe-marker-${kf.id}`}
                    data-selected={isSelected ? 'true' : undefined}
                    data-time-pct={kf.timePct}
                    onClick={() => setSelectedId(kf.id)}
                    onKeyDown={(event) => handleKeyframeKeyDown(event, kf)}
                    style={{ left: `${kf.timePct}%` }}
                    className={cx(
                      'prism-focus-ring absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 rounded-lg px-1 py-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-transform',
                      isSelected ? 'z-20' : 'z-10'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="text-[9px] font-mono font-semibold tabular-nums whitespace-nowrap leading-none"
                      style={{
                        color: isSelected
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-text-secondary)',
                      }}
                    >
                      {kf.timePct}%
                    </span>
                    <span
                      aria-hidden="true"
                      data-testid={`keyframe-diamond-${kf.id}`}
                      className="w-3.5 h-3.5 rotate-45 rounded-[2px] border-2 transition-[color,background-color,border-color,opacity,transform]"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-bg-start)',
                        borderColor: isSelected
                          ? 'var(--prism-primary-contrast)'
                          : 'var(--prism-secondary-main)',
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="text-[9px] font-mono tabular-nums whitespace-nowrap leading-none"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {formattedVal}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              aria-hidden="true"
              className="flex items-center justify-between px-3 text-[10px] font-mono tabular-nums"
              style={STYLE_TEXT_DISABLED}
            >
              {LANE_TICKS.map((pct) => (
                <span key={`label-${pct}`}>{pct}%</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,220px)] gap-3.5 items-stretch">
            <div
              className={cx(
                graphClass,
                'prism-well rounded-2xl p-3 flex items-center justify-center min-w-0'
              )}
            >
              <svg
                ref={svgRef}
                role="img"
                aria-label={`${propertyName} cubic-bezier easing curve graph: ${bezierCss}`}
                data-testid="keyframe-curve-svg"
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="w-full max-w-[300px] h-auto block overflow-visible select-none touch-none"
                style={{ touchAction: 'none' }}
              >
                <line
                  x1={PLOT_X0}
                  y1={overshootTopY}
                  x2={PLOT_X1}
                  y2={overshootTopY}
                  stroke="var(--prism-divider)"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  strokeOpacity={0.7}
                />
                <line
                  x1={PLOT_X0}
                  y1={overshootBottomY}
                  x2={PLOT_X1}
                  y2={overshootBottomY}
                  stroke="var(--prism-divider)"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  strokeOpacity={0.7}
                />

                {GRID_FRACTIONS.map((fraction) => {
                  const gx = roundTwo(PLOT_X0 + fraction * PLOT_WIDTH);
                  const gy = roundTwo(PLOT_Y_BOTTOM - fraction * PLOT_HEIGHT);
                  return (
                    <g key={`grid-${fraction}`} data-testid="keyframe-curve-gridline">
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
                        y1={PLOT_Y_TOP}
                        x2={gx}
                        y2={PLOT_Y_BOTTOM}
                        stroke="var(--prism-divider)"
                        strokeWidth={1}
                      />
                    </g>
                  );
                })}

                {Y_AXIS_LABELS.map((tick) => (
                  <text
                    key={`y-${tick.text}`}
                    x={PLOT_X0 - 8}
                    y={roundTwo(PLOT_Y_BOTTOM - tick.value * PLOT_HEIGHT + 3)}
                    textAnchor="end"
                    className="text-[9px] font-mono tabular-nums"
                    style={STYLE_FILL_SECONDARY}
                  >
                    {tick.text}
                  </text>
                ))}

                {X_AXIS_LABELS.map((tick) => (
                  <text
                    key={`x-${tick.text}`}
                    x={roundTwo(PLOT_X0 + tick.value * PLOT_WIDTH)}
                    y={PLOT_Y_BOTTOM + 14}
                    textAnchor="middle"
                    className="text-[9px] font-mono tabular-nums"
                    style={STYLE_FILL_SECONDARY}
                  >
                    {tick.text}
                  </text>
                ))}

                <line
                  data-testid="keyframe-curve-linear-ref"
                  x1={PLOT_X0}
                  y1={PLOT_Y_BOTTOM}
                  x2={PLOT_X1}
                  y2={PLOT_Y_TOP}
                  stroke="var(--prism-text-disabled)"
                  strokeWidth={1.25}
                  strokeDasharray="4 4"
                />

                <line
                  data-testid="keyframe-tangent-p1"
                  x1={PLOT_X0}
                  y1={PLOT_Y_BOTTOM}
                  x2={p1Svg.x}
                  y2={p1Svg.y}
                  stroke="var(--prism-secondary-main)"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                />
                <line
                  data-testid="keyframe-tangent-p2"
                  x1={PLOT_X1}
                  y1={PLOT_Y_TOP}
                  x2={p2Svg.x}
                  y2={p2Svg.y}
                  stroke="var(--prism-secondary-main)"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                />

                <path
                  data-testid="keyframe-curve-path"
                  d={curvePath}
                  fill="none"
                  stroke="var(--prism-primary-main)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />

                <circle
                  cx={PLOT_X0}
                  cy={PLOT_Y_BOTTOM}
                  r={4}
                  fill="var(--prism-bg-start)"
                  stroke="var(--prism-primary-main)"
                  strokeWidth={2}
                />
                <circle
                  cx={PLOT_X1}
                  cy={PLOT_Y_TOP}
                  r={4}
                  fill="var(--prism-bg-start)"
                  stroke="var(--prism-primary-main)"
                  strokeWidth={2}
                />

                <g
                  role="slider"
                  tabIndex={disabled ? -1 : 0}
                  aria-label="Control point P1"
                  aria-valuemin={0}
                  aria-valuemax={1}
                  aria-valuenow={activeEasing[0]}
                  aria-valuetext={`x ${formatCoord(activeEasing[0])}, y ${formatCoord(activeEasing[1])}`}
                  aria-disabled={disabled || undefined}
                  data-testid="keyframe-handle-p1"
                  data-handle="p1"
                  data-dragging={activeDrag === 'p1' ? 'true' : undefined}
                  onPointerDown={handleControlPointerDown(selectedKeyframe, 'p1')}
                  onKeyDown={handleControlKeyDown(selectedKeyframe, 'p1')}
                  className={cx(
                    handleClass,
                    'prism-focus-ring',
                    disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : activeDrag === 'p1'
                        ? 'cursor-grabbing'
                        : 'cursor-grab'
                  )}
                >
                  <circle
                    cx={p1Svg.x}
                    cy={p1Svg.y}
                    r={14}
                    fill="var(--prism-bg-start)"
                    fillOpacity={0}
                  />
                  <circle
                    cx={p1Svg.x}
                    cy={p1Svg.y}
                    r={activeDrag === 'p1' ? 7.5 : 6.5}
                    fill={
                      activeDrag === 'p1'
                        ? 'var(--prism-primary-main)'
                        : 'var(--prism-secondary-main)'
                    }
                    stroke="var(--prism-primary-contrast)"
                    strokeWidth={2}
                  />
                  <text
                    x={p1Svg.x}
                    y={p1Svg.y - 10}
                    textAnchor="middle"
                    className="text-[9px] font-mono font-bold pointer-events-none"
                    style={STYLE_FILL_PRIMARY}
                  >
                    P1
                  </text>
                </g>

                <g
                  role="slider"
                  tabIndex={disabled ? -1 : 0}
                  aria-label="Control point P2"
                  aria-valuemin={0}
                  aria-valuemax={1}
                  aria-valuenow={activeEasing[2]}
                  aria-valuetext={`x ${formatCoord(activeEasing[2])}, y ${formatCoord(activeEasing[3])}`}
                  aria-disabled={disabled || undefined}
                  data-testid="keyframe-handle-p2"
                  data-handle="p2"
                  data-dragging={activeDrag === 'p2' ? 'true' : undefined}
                  onPointerDown={handleControlPointerDown(selectedKeyframe, 'p2')}
                  onKeyDown={handleControlKeyDown(selectedKeyframe, 'p2')}
                  className={cx(
                    handleClass,
                    'prism-focus-ring',
                    disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : activeDrag === 'p2'
                        ? 'cursor-grabbing'
                        : 'cursor-grab'
                  )}
                >
                  <circle
                    cx={p2Svg.x}
                    cy={p2Svg.y}
                    r={14}
                    fill="var(--prism-bg-start)"
                    fillOpacity={0}
                  />
                  <circle
                    cx={p2Svg.x}
                    cy={p2Svg.y}
                    r={activeDrag === 'p2' ? 7.5 : 6.5}
                    fill={
                      activeDrag === 'p2'
                        ? 'var(--prism-primary-main)'
                        : 'var(--prism-secondary-main)'
                    }
                    stroke="var(--prism-primary-contrast)"
                    strokeWidth={2}
                  />
                  <text
                    x={p2Svg.x}
                    y={p2Svg.y - 10}
                    textAnchor="middle"
                    className="text-[9px] font-mono font-bold pointer-events-none"
                    style={STYLE_FILL_PRIMARY}
                  >
                    P2
                  </text>
                </g>
              </svg>
            </div>

            <div className="flex flex-col justify-between gap-3 min-w-0">
              <div className="space-y-2">
                <span
                  className="block text-xs font-semibold tracking-tight"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Easing Presets
                </span>
                <div
                  role="group"
                  aria-label="Easing presets"
                  data-testid="keyframe-preset-group"
                  className={cx(presetsClass, 'flex flex-wrap gap-1.5')}
                >
                  {EASING_PRESETS.map((preset) => {
                    const isActive = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={disabled}
                        aria-pressed={isActive}
                        data-testid={`keyframe-preset-${preset.id}`}
                        onClick={() => updateSelectedEasing(selectedKeyframe, [...preset.tuple])}
                        className={cx(
                          'prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                          isActive
                            ? 'prism-btn-primary'
                            : 'prism-crystal opacity-85 enabled:hover:opacity-100'
                        )}
                        style={isActive ? undefined : { color: 'var(--prism-text-primary)' }}
                      >
                        <span className="relative z-10">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                aria-live="polite"
                data-testid="keyframe-readout"
                className={cx(
                  readoutClass,
                  'prism-well rounded-2xl p-3 space-y-1.5 text-xs font-mono tabular-nums'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span style={STYLE_TEXT_SECONDARY}>Curve</span>
                  <span
                    data-testid="keyframe-preset-label"
                    className="font-sans font-semibold"
                    style={STYLE_PRIMARY_MAIN}
                  >
                    {activePresetLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={STYLE_TEXT_SECONDARY}>P1</span>
                  <span
                    data-testid="keyframe-p1-coords"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    ({formatCoord(activeEasing[0])}, {formatCoord(activeEasing[1])})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={STYLE_TEXT_SECONDARY}>P2</span>
                  <span
                    data-testid="keyframe-p2-coords"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    ({formatCoord(activeEasing[2])}, {formatCoord(activeEasing[3])})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const KeyframeCurveEditor = memo(KeyframeCurveEditorInner);
KeyframeCurveEditor.displayName = 'KeyframeCurveEditor';
