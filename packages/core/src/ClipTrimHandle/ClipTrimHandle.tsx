'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Film, MousePointer2, RotateCcw, Scissors } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ClipTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface ClipTrimState {
  inSec: number;
  outSec: number;
  fadeInSec: number;
  fadeOutSec: number;
  splits: ReadonlyArray<number>;
}

type ClipTrimHandleBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ClipTrimHandleProps extends ClipTrimHandleBaseProps {
  /** Clip title displayed in the optical inspector header (e.g. 'A004_OpticalIntro_4K.mov'). */
  label: string;
  /** Source media length in seconds, clamped >= 1 (defaults to 30). */
  totalDurationSec?: number;
  /** Controlled trim in-point in seconds. */
  inSec?: number;
  /** Initial trim in-point in seconds in uncontrolled mode (defaults to 3). */
  defaultInSec?: number;
  /** Controlled trim out-point in seconds. */
  outSec?: number;
  /** Initial trim out-point in seconds in uncontrolled mode (defaults to 25). */
  defaultOutSec?: number;
  /** Controlled fade-in ramp duration in seconds. */
  fadeInSec?: number;
  /** Initial fade-in ramp duration in seconds in uncontrolled mode (defaults to 2). */
  defaultFadeInSec?: number;
  /** Controlled fade-out ramp duration in seconds. */
  fadeOutSec?: number;
  /** Initial fade-out ramp duration in seconds in uncontrolled mode (defaults to 2.5). */
  defaultFadeOutSec?: number;
  /** Minimum enforced active clip duration in seconds (defaults to 1). */
  minClipSec?: number;
  /** Semantic --prism-* optical color tone (defaults to 'primary'). */
  tone?: ClipTone;
  /** Callback fired with the full normalized ClipTrimState whenever trim, fade, split, or reset changes. */
  onChange?: (state: ClipTrimState) => void;
  /** Callback fired when a razor split is inserted into the active clip range. */
  onSplit?: (splitAtSec: number, leftDurationSec: number, rightDurationSec: number) => void;
  /** Disables all trim handles, fade handles, razor splitting, tool toggling, and reset controls. */
  disabled?: boolean;
}

type ToolMode = 'select' | 'razor';
type HandleKind = 'in' | 'out' | 'fade-in' | 'fade-out';

interface WaveformBar {
  id: string;
  heightPct: number;
}

const DEFAULT_TOTAL_DURATION = 30;
const MIN_TOTAL_DURATION = 1;
const DEFAULT_IN_SEC = 3;
const DEFAULT_OUT_SEC = 25;
const DEFAULT_FADE_IN_SEC = 2;
const DEFAULT_FADE_OUT_SEC = 2.5;
const DEFAULT_MIN_CLIP = 1;
const MIN_CLIP_FLOOR = 0.1;
const SPLIT_EPSILON = 0.05;
const MIN_SPLIT_GAP = 0.1;
const MIN_SPLITTABLE_SPAN = 0.2;
const KEY_STEP_SEC = 0.5;
const KEY_FINE_STEP_SEC = 0.1;
const KEY_PAGE_STEP_SEC = 2;

const WAVEFORM_BARS: ReadonlyArray<WaveformBar> = [
  { id: 'w-01', heightPct: 30 },
  { id: 'w-02', heightPct: 52 },
  { id: 'w-03', heightPct: 44 },
  { id: 'w-04', heightPct: 74 },
  { id: 'w-05', heightPct: 62 },
  { id: 'w-06', heightPct: 86 },
  { id: 'w-07', heightPct: 54 },
  { id: 'w-08', heightPct: 40 },
  { id: 'w-09', heightPct: 68 },
  { id: 'w-10', heightPct: 92 },
  { id: 'w-11', heightPct: 76 },
  { id: 'w-12', heightPct: 58 },
  { id: 'w-13', heightPct: 46 },
  { id: 'w-14', heightPct: 80 },
  { id: 'w-15', heightPct: 64 },
  { id: 'w-16', heightPct: 48 },
  { id: 'w-17', heightPct: 72 },
  { id: 'w-18', heightPct: 88 },
  { id: 'w-19', heightPct: 60 },
  { id: 'w-20', heightPct: 38 },
  { id: 'w-21', heightPct: 66 },
  { id: 'w-22', heightPct: 84 },
  { id: 'w-23', heightPct: 70 },
  { id: 'w-24', heightPct: 50 },
  { id: 'w-25', heightPct: 42 },
  { id: 'w-26', heightPct: 78 },
  { id: 'w-27', heightPct: 62 },
  { id: 'w-28', heightPct: 34 },
];

function roundSec(value: number): number {
  const rounded = Number(value.toFixed(2));
  return rounded === 0 ? 0 : rounded;
}

function snapSec(value: number): number {
  const snapped = Math.round(value * 10) / 10;
  return snapped === 0 ? 0 : snapped;
}

function formatSec(value: number): string {
  return `${roundSec(value)}s`;
}

function sanitizeTotalDuration(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_TOTAL_DURATION;
  return Math.max(MIN_TOTAL_DURATION, roundSec(raw));
}

function sanitizeMinClip(raw: number, total: number): number {
  const fallback = Math.min(DEFAULT_MIN_CLIP, total);
  return roundSec(clampNumber(raw, MIN_CLIP_FLOOR, total, fallback));
}

function getToneColorVar(tone: ClipTone): string {
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

function normalizeSplits(
  rawSplits: ReadonlyArray<number>,
  inSec: number,
  outSec: number
): ReadonlyArray<number> {
  return rawSplits
    .filter((s) => s > inSec + SPLIT_EPSILON && s < outSec - SPLIT_EPSILON)
    .map((s) => roundSec(s))
    .sort((a, b) => a - b);
}

function normalizeClipState(
  raw: ClipTrimState,
  total: number,
  minClip: number
): ClipTrimState {
  const clampedIn = clampNumber(raw.inSec, 0, total, 0);
  const clampedOut = clampNumber(raw.outSec, 0, total, total);
  let start = Math.min(clampedIn, clampedOut);
  let end = Math.max(clampedIn, clampedOut);

  if (end - start < minClip) {
    end = Math.min(total, start + minClip);
    start = Math.max(0, end - minClip);
  }

  const inSec = roundSec(start);
  const outSec = roundSec(end);
  const duration = roundSec(outSec - inSec);

  const fadeInSec = roundSec(clampNumber(raw.fadeInSec, 0, duration, 0));
  const maxFadeOut = roundSec(Math.max(0, duration - fadeInSec));
  const fadeOutSec = roundSec(clampNumber(raw.fadeOutSec, 0, maxFadeOut, 0));
  const splits = normalizeSplits(raw.splits, inSec, outSec);

  return { inSec, outSec, fadeInSec, fadeOutSec, splits };
}

function statesEqual(a: ClipTrimState, b: ClipTrimState): boolean {
  return (
    a.inSec === b.inSec &&
    a.outSec === b.outSec &&
    a.fadeInSec === b.fadeInSec &&
    a.fadeOutSec === b.fadeOutSec &&
    a.splits.join(',') === b.splits.join(',')
  );
}

function findSegmentContaining(atSec: number, state: ClipTrimState): [number, number] {
  let segStart = state.inSec;
  for (const cut of state.splits) {
    if (atSec < cut) {
      return [segStart, cut];
    }
    segStart = cut;
  }
  return [segStart, state.outSec];
}

function findLongestSegment(state: ClipTrimState): [number, number] {
  let bestStart = state.inSec;
  let bestEnd = state.outSec;
  let bestLen = -1;
  let prev = state.inSec;

  for (const cut of state.splits) {
    const len = cut - prev;
    if (len > bestLen) {
      bestLen = len;
      bestStart = prev;
      bestEnd = cut;
    }
    prev = cut;
  }

  const tailLen = state.outSec - prev;
  if (tailLen > bestLen) {
    bestStart = prev;
    bestEnd = state.outSec;
  }

  return [bestStart, bestEnd];
}

function computeHandleState(
  handle: HandleKind,
  candidateValue: number,
  current: ClipTrimState,
  total: number,
  minClip: number
): ClipTrimState {
  if (handle === 'in') {
    const maxIn = roundSec(current.outSec - minClip);
    const nextIn = roundSec(clampNumber(candidateValue, 0, maxIn, current.inSec));
    return normalizeClipState({ ...current, inSec: nextIn }, total, minClip);
  }
  if (handle === 'out') {
    const minOut = roundSec(current.inSec + minClip);
    const nextOut = roundSec(clampNumber(candidateValue, minOut, total, current.outSec));
    return normalizeClipState({ ...current, outSec: nextOut }, total, minClip);
  }
  const duration = roundSec(current.outSec - current.inSec);
  if (handle === 'fade-in') {
    const maxFadeIn = roundSec(Math.max(0, duration - current.fadeOutSec));
    const nextFadeIn = roundSec(clampNumber(candidateValue, 0, maxFadeIn, current.fadeInSec));
    return { ...current, fadeInSec: nextFadeIn };
  }
  const maxFadeOut = roundSec(Math.max(0, duration - current.fadeInSec));
  const nextFadeOut = roundSec(clampNumber(candidateValue, 0, maxFadeOut, current.fadeOutSec));
  return { ...current, fadeOutSec: nextFadeOut };
}

function timelineSecToHandleValue(
  handle: HandleKind,
  timelineSec: number,
  current: ClipTrimState
): number {
  if (handle === 'fade-in') {
    return roundSec(timelineSec - current.inSec);
  }
  if (handle === 'fade-out') {
    return roundSec(current.outSec - timelineSec);
  }
  return timelineSec;
}

function ClipTrimHandleInner({
  label,
  totalDurationSec = DEFAULT_TOTAL_DURATION,
  inSec,
  defaultInSec = DEFAULT_IN_SEC,
  outSec,
  defaultOutSec = DEFAULT_OUT_SEC,
  fadeInSec,
  defaultFadeInSec = DEFAULT_FADE_IN_SEC,
  fadeOutSec,
  defaultFadeOutSec = DEFAULT_FADE_OUT_SEC,
  minClipSec = DEFAULT_MIN_CLIP,
  tone = 'primary',
  onChange,
  onSplit,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ClipTrimHandleProps) {
  const labelId = useId();
  const override = useComponentOverride('ClipTrimHandle');
  const trackRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const safeTotal = sanitizeTotalDuration(totalDurationSec);
  const safeMinClip = sanitizeMinClip(minClipSec, safeTotal);

  const defaultState = normalizeClipState(
    {
      inSec: defaultInSec,
      outSec: defaultOutSec,
      fadeInSec: defaultFadeInSec,
      fadeOutSec: defaultFadeOutSec,
      splits: [],
    },
    safeTotal,
    safeMinClip
  );

  const [uncontrolledIn, setUncontrolledIn] = useState<number>(defaultState.inSec);
  const [uncontrolledOut, setUncontrolledOut] = useState<number>(defaultState.outSec);
  const [uncontrolledFadeIn, setUncontrolledFadeIn] = useState<number>(defaultState.fadeInSec);
  const [uncontrolledFadeOut, setUncontrolledFadeOut] = useState<number>(defaultState.fadeOutSec);
  const [rawSplits, setRawSplits] = useState<ReadonlyArray<number>>([]);
  const [tool, setTool] = useState<ToolMode>('select');
  const [activeHandle, setActiveHandle] = useState<HandleKind | null>(null);
  const [razorHoverSec, setRazorHoverSec] = useState<number | null>(null);

  const isControlledIn = inSec !== undefined;
  const isControlledOut = outSec !== undefined;
  const isControlledFadeIn = fadeInSec !== undefined;
  const isControlledFadeOut = fadeOutSec !== undefined;

  const currentState = normalizeClipState(
    {
      inSec: isControlledIn ? inSec : uncontrolledIn,
      outSec: isControlledOut ? outSec : uncontrolledOut,
      fadeInSec: isControlledFadeIn ? fadeInSec : uncontrolledFadeIn,
      fadeOutSec: isControlledFadeOut ? fadeOutSec : uncontrolledFadeOut,
      splits: rawSplits,
    },
    safeTotal,
    safeMinClip
  );

  const latestRef = useRef({
    state: currentState,
    defaultState,
    safeTotal,
    safeMinClip,
    isControlledIn,
    isControlledOut,
    isControlledFadeIn,
    isControlledFadeOut,
    onChange,
    onSplit,
  });
  latestRef.current = {
    state: currentState,
    defaultState,
    safeTotal,
    safeMinClip,
    isControlledIn,
    isControlledOut,
    isControlledFadeIn,
    isControlledFadeOut,
    onChange,
    onSplit,
  };

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      cleanupDragRef.current?.();
      setActiveHandle(null);
      setRazorHoverSec(null);
    }
  }, [disabled]);

  const commitState = useCallback((nextState: ClipTrimState) => {
    const live = latestRef.current;
    if (statesEqual(nextState, live.state)) return;

    if (!live.isControlledIn) setUncontrolledIn(nextState.inSec);
    if (!live.isControlledOut) setUncontrolledOut(nextState.outSec);
    if (!live.isControlledFadeIn) setUncontrolledFadeIn(nextState.fadeInSec);
    if (!live.isControlledFadeOut) setUncontrolledFadeOut(nextState.fadeOutSec);
    setRawSplits(nextState.splits);

    live.state = {
      inSec: live.isControlledIn ? live.state.inSec : nextState.inSec,
      outSec: live.isControlledOut ? live.state.outSec : nextState.outSec,
      fadeInSec: live.isControlledFadeIn ? live.state.fadeInSec : nextState.fadeInSec,
      fadeOutSec: live.isControlledFadeOut ? live.state.fadeOutSec : nextState.fadeOutSec,
      splits: nextState.splits,
    };

    live.onChange?.(nextState);
  }, []);

  const clientXToSec = useCallback((clientX: number): number | null => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || !Number.isFinite(rect.width) || rect.width <= 0) return null;
    const ratio = clampNumber((clientX - rect.left) / rect.width, 0, 1, 0);
    return snapSec(ratio * latestRef.current.safeTotal);
  }, []);

  const applyHandleTimelineSec = useCallback(
    (handle: HandleKind, timelineSec: number) => {
      const live = latestRef.current;
      const candidate = timelineSecToHandleValue(handle, timelineSec, live.state);
      const next = computeHandleState(
        handle,
        candidate,
        live.state,
        live.safeTotal,
        live.safeMinClip
      );
      commitState(next);
    },
    [commitState]
  );

  const insertSplitAt = useCallback(
    (rawAtSec: number) => {
      const live = latestRef.current;
      const state = live.state;
      const atSec = roundSec(rawAtSec);
      if (atSec <= state.inSec + SPLIT_EPSILON || atSec >= state.outSec - SPLIT_EPSILON) {
        return;
      }
      if (state.splits.some((existing) => Math.abs(existing - atSec) < MIN_SPLIT_GAP)) {
        return;
      }

      const [segStart, segEnd] = findSegmentContaining(atSec, state);
      const leftDur = roundSec(atSec - segStart);
      const rightDur = roundSec(segEnd - atSec);
      const nextSplits = normalizeSplits([...state.splits, atSec], state.inSec, state.outSec);
      const nextState: ClipTrimState = { ...state, splits: nextSplits };

      commitState(nextState);
      live.onSplit?.(atSec, leftDur, rightDur);
    },
    [commitState]
  );

  const handleToggleTool = () => {
    setTool((prev) => {
      const next = prev === 'razor' ? 'select' : 'razor';
      if (next === 'select') {
        setRazorHoverSec(null);
      }
      return next;
    });
  };

  const handleSplitMidpoint = () => {
    const [segStart, segEnd] = findLongestSegment(currentState);
    const mid = roundSec((segStart + segEnd) / 2);
    insertSplitAt(mid);
  };

  const handleReset = () => {
    commitState(latestRef.current.defaultState);
  };

  const handleBodyClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (disabled || tool !== 'razor') return;
    const sec = clientXToSec(event.clientX);
    if (sec === null) return;
    insertSplitAt(sec);
  };

  const handleBodyPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || tool !== 'razor') return;
    const sec = clientXToSec(event.clientX);
    if (
      sec !== null &&
      sec > currentState.inSec + SPLIT_EPSILON &&
      sec < currentState.outSec - SPLIT_EPSILON
    ) {
      setRazorHoverSec(sec);
    } else {
      setRazorHoverSec(null);
    }
  };

  const handleBodyPointerLeave = () => {
    setRazorHoverSec(null);
  };

  const handleHandleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleHandlePointerDown =
    (handle: HandleKind) => (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || (typeof event.button === 'number' && event.button > 0)) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.focus();

      cleanupDragRef.current?.();

      const pointerId = event.pointerId;
      setActiveHandle(handle);

      const initialSec = clientXToSec(event.clientX);
      if (initialSec !== null) {
        applyHandleTimelineSec(handle, initialSec);
      }

      const handleWindowPointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const sec = clientXToSec(moveEvent.clientX);
        if (sec !== null) {
          applyHandleTimelineSec(handle, sec);
        }
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
        setActiveHandle(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
      window.addEventListener('pointerup', handleWindowPointerEnd);
      window.addEventListener('pointercancel', handleWindowPointerEnd);
    };

  const handleHandleKeyDown =
    (handle: HandleKind) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      const state = latestRef.current.state;
      const dur = roundSec(state.outSec - state.inSec);
      const step = event.shiftKey ? KEY_FINE_STEP_SEC : KEY_STEP_SEC;

      let currentVal: number;
      let minVal: number;
      let maxVal: number;

      if (handle === 'in') {
        currentVal = state.inSec;
        minVal = 0;
        maxVal = roundSec(state.outSec - safeMinClip);
      } else if (handle === 'out') {
        currentVal = state.outSec;
        minVal = roundSec(state.inSec + safeMinClip);
        maxVal = safeTotal;
      } else if (handle === 'fade-in') {
        currentVal = state.fadeInSec;
        minVal = 0;
        maxVal = roundSec(Math.max(0, dur - state.fadeOutSec));
      } else {
        currentVal = state.fadeOutSec;
        minVal = 0;
        maxVal = roundSec(Math.max(0, dur - state.fadeInSec));
      }

      let candidate: number;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          candidate = currentVal + step;
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          candidate = currentVal - step;
          break;
        case 'PageUp':
          candidate = currentVal + KEY_PAGE_STEP_SEC;
          break;
        case 'PageDown':
          candidate = currentVal - KEY_PAGE_STEP_SEC;
          break;
        case 'Home':
          candidate = minVal;
          break;
        case 'End':
          candidate = maxVal;
          break;
        default:
          return;
      }

      event.preventDefault();
      const next = computeHandleState(handle, candidate, state, safeTotal, safeMinClip);
      commitState(next);
    };

  const durationSec = roundSec(currentState.outSec - currentState.inSec);
  const segmentCount = currentState.splits.length + 1;
  const toneVar = getToneColorVar(tone);
  const isDragging = activeHandle !== null && !disabled;

  const [longestStart, longestEnd] = findLongestSegment(currentState);
  const canSplitMidpoint = !disabled && longestEnd - longestStart >= MIN_SPLITTABLE_SPAN;

  const inPct = clampNumber((currentState.inSec / safeTotal) * 100, 0, 100, 0);
  const outPct = clampNumber((currentState.outSec / safeTotal) * 100, 0, 100, 100);
  const clipWidthPct = Math.max(0, outPct - inPct);

  const fadeInPctOfClip = clampNumber((currentState.fadeInSec / durationSec) * 100, 0, 100, 0);
  const fadeOutPctOfClip = clampNumber((currentState.fadeOutSec / durationSec) * 100, 0, 100, 0);
  const fadeOutStartX = roundSec(100 - fadeOutPctOfClip);

  const fadeInAbsPct = clampNumber(
    ((currentState.inSec + currentState.fadeInSec) / safeTotal) * 100,
    inPct,
    outPct,
    inPct
  );
  const fadeOutAbsPct = clampNumber(
    ((currentState.outSec - currentState.fadeOutSec) / safeTotal) * 100,
    inPct,
    outPct,
    outPct
  );

  const maxAllowedIn = roundSec(currentState.outSec - safeMinClip);
  const minAllowedOut = roundSec(currentState.inSec + safeMinClip);
  const maxAllowedFadeIn = roundSec(Math.max(0, durationSec - currentState.fadeOutSec));
  const maxAllowedFadeOut = roundSec(Math.max(0, durationSec - currentState.fadeInSec));

  const fadeInZ =
    activeHandle === 'fade-in'
      ? 'z-50'
      : currentState.fadeInSec > 0 && currentState.fadeInSec === maxAllowedFadeIn
        ? 'z-40'
        : 'z-30';
  const fadeOutZ = activeHandle === 'fade-out' ? 'z-50' : 'z-30';

  const rulerTicks = [
    { id: 'tick-0', label: formatSec(0) },
    { id: 'tick-25', label: formatSec(safeTotal * 0.25) },
    { id: 'tick-50', label: formatSec(safeTotal * 0.5) },
    { id: 'tick-75', label: formatSec(safeTotal * 0.75) },
    { id: 'tick-100', label: formatSec(safeTotal) },
  ];

  const merged = mergeProps({
    themeTarget: themeProps('clip-trim-handle', {
      tone,
      tool,
      disabled,
      dragging: isDragging,
    }),
    baseClassName:
      'prism-slab p-4 sm:p-5 w-full max-w-full flex flex-col gap-3.5 select-none transition-shadow',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('clip-trim-handle', 'header');
  const trackClass = stableClassName('clip-trim-handle', 'track');
  const bodyClass = stableClassName('clip-trim-handle', 'body');
  const handleClass = stableClassName('clip-trim-handle', 'handle');
  const fadeHandleClass = stableClassName('clip-trim-handle', 'fade-handle');
  const telemetryClass = stableClassName('clip-trim-handle', 'telemetry');

  return (
    <div ref={ref} role="group" aria-labelledby={labelId} {...rest} {...merged}>
      {/* Header Row */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: toneVar }}
          >
            <Film className="w-3.5 h-3.5 shrink-0" />
          </span>
          <span
            id={labelId}
            data-testid="clip-trim-label"
            className="text-sm font-semibold tracking-tight truncate max-w-full"
            style={STYLE_TEXT_PRIMARY}
          >
            {label}
          </span>
          <span
            data-testid="clip-trim-duration-badge"
            className="prism-crystal px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={{ color: toneVar }}
          >
            {formatSec(durationSec)}
          </span>
          <span
            data-testid="clip-trim-segments-badge"
            className="prism-crystal px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={{
              color:
                currentState.splits.length > 0 ? toneVar : 'var(--prism-text-secondary)',
            }}
          >
            {segmentCount} {segmentCount === 1 ? 'segment' : 'segments'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 max-w-full">
          <button
            type="button"
            disabled={disabled}
            aria-pressed={tool === 'razor'}
            data-testid="clip-trim-tool-toggle"
            onClick={handleToggleTool}
            className={cx(
              'prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
              tool === 'razor' ? 'prism-btn-primary' : 'prism-btn-secondary'
            )}
          >
            {tool === 'razor' ? (
              <Scissors aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
            ) : (
              <MousePointer2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
            )}
            <span className="relative z-10">
              {tool === 'razor' ? 'Razor Split' : 'Select'}
            </span>
          </button>

          <button
            type="button"
            disabled={!canSplitMidpoint}
            data-testid="clip-trim-split-midpoint"
            onClick={handleSplitMidpoint}
            className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          >
            <Scissors aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Split at Midpoint</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            data-testid="clip-trim-reset"
            onClick={handleReset}
            className="prism-btn-secondary prism-focus-ring h-8 px-2.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          >
            <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Interactive Timeline Clip Track */}
      <div className={cx('flex flex-col gap-1.5 min-w-0', disabled ? 'opacity-55' : '')}>
        <div
          aria-hidden="true"
          className="flex items-center justify-between px-1 font-mono text-[10px] font-medium tabular-nums"
          style={STYLE_TEXT_SECONDARY}
        >
          {rulerTicks.map((tick) => (
            <span key={tick.id}>{tick.label}</span>
          ))}
        </div>

        <div
          ref={trackRef}
          data-testid="clip-trim-track"
          className={cx(trackClass, 'relative w-full h-24 touch-none')}
        >
          {/* Recessed Source Well + Decorative Filmstrip Waveform */}
          <div
            aria-hidden="true"
            className="prism-well absolute inset-0 rounded-2xl overflow-hidden pointer-events-none flex items-center justify-between px-2 gap-1"
          >
            {WAVEFORM_BARS.map((bar) => (
              <span
                key={bar.id}
                className="flex-1 rounded-full"
                style={{
                  height: `${bar.heightPct}%`,
                  backgroundColor: 'var(--prism-text-secondary)',
                  opacity: 0.16,
                }}
              />
            ))}
          </div>

          {/* Dimmed Source Head [0, inSec] */}
          <div
            aria-hidden="true"
            data-testid="clip-trim-head-dim"
            className="absolute inset-y-0 left-0 rounded-l-2xl pointer-events-none"
            style={{
              width: `${inPct}%`,
              backgroundColor: 'var(--prism-bg-end)',
              opacity: 0.72,
            }}
          />

          {/* Dimmed Source Tail [outSec, total] */}
          <div
            aria-hidden="true"
            data-testid="clip-trim-tail-dim"
            className="absolute inset-y-0 rounded-r-2xl pointer-events-none"
            style={{
              left: `${outPct}%`,
              width: `${Math.max(0, 100 - outPct)}%`,
              backgroundColor: 'var(--prism-bg-end)',
              opacity: 0.72,
            }}
          />

          {/* Active Optical Glass Clip Body [inSec, outSec] */}
          <div
            data-testid="clip-trim-body"
            data-razor-ready={tool === 'razor' && !disabled ? 'true' : undefined}
            onClick={handleBodyClick}
            onPointerMove={handleBodyPointerMove}
            onPointerLeave={handleBodyPointerLeave}
            style={{
              left: `${inPct}%`,
              width: `${clipWidthPct}%`,
              borderColor: toneVar,
            }}
            className={cx(
              bodyClass,
              'prism-crystal absolute inset-y-1 rounded-xl border-2 overflow-hidden z-10',
              disabled
                ? 'cursor-not-allowed'
                : tool === 'razor'
                  ? 'cursor-crosshair'
                  : 'cursor-default'
            )}
          >
            {/* Subtle Optical Tone Tint */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundColor: toneVar,
                opacity: 0.16,
              }}
            />

            {/* Live SVG Fade-In & Fade-Out Ramp Overlay Curves */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              data-testid="clip-trim-fade-svg"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              {fadeInPctOfClip > 0 ? (
                <g data-testid="clip-trim-fade-in-ramp">
                  <path
                    d={`M 0 0 L ${fadeInPctOfClip} 0 Q ${roundSec(fadeInPctOfClip * 0.45)} 18, 0 100 Z`}
                    fill="var(--prism-bg-start)"
                    fillOpacity={0.62}
                  />
                  <path
                    data-testid="clip-trim-fade-in-curve"
                    d={`M 0 100 Q ${roundSec(fadeInPctOfClip * 0.45)} 18, ${fadeInPctOfClip} 0`}
                    fill="none"
                    stroke={toneVar}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ) : null}

              {fadeOutPctOfClip > 0 ? (
                <g data-testid="clip-trim-fade-out-ramp">
                  <path
                    d={`M ${fadeOutStartX} 0 L 100 0 L 100 100 Q ${roundSec(fadeOutStartX + fadeOutPctOfClip * 0.55)} 18, ${fadeOutStartX} 0 Z`}
                    fill="var(--prism-bg-start)"
                    fillOpacity={0.62}
                  />
                  <path
                    data-testid="clip-trim-fade-out-curve"
                    d={`M ${fadeOutStartX} 0 Q ${roundSec(fadeOutStartX + fadeOutPctOfClip * 0.55)} 18, 100 100`}
                    fill="none"
                    stroke={toneVar}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ) : null}
            </svg>

            {/* Clip Span Watermark */}
            <div
              aria-hidden="true"
              className="relative z-10 h-full w-full flex items-center justify-center px-3 pointer-events-none"
            >
              <span
                className="font-mono text-[11px] font-semibold tabular-nums truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                {formatSec(currentState.inSec)} – {formatSec(currentState.outSec)}
              </span>
            </div>
          </div>

          {/* Razor Hover Preview Line */}
          {razorHoverSec !== null && tool === 'razor' && !disabled ? (
            <div
              aria-hidden="true"
              data-testid="clip-trim-razor-preview"
              className="absolute inset-y-1 w-0.5 -translate-x-1/2 pointer-events-none z-20"
              style={{
                left: `${(razorHoverSec / safeTotal) * 100}%`,
                backgroundColor: toneVar,
                opacity: 0.75,
              }}
            />
          ) : null}

          {/* Inserted Vertical Razor Cut Lines */}
          {currentState.splits.map((splitSec) => {
            const splitPct = clampNumber((splitSec / safeTotal) * 100, 0, 100, 0);
            return (
              <div
                key={`split-${splitSec}`}
                aria-hidden="true"
                data-testid="clip-trim-split-line"
                data-split-sec={String(splitSec)}
                className="absolute inset-y-1 w-0.5 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center justify-between"
                style={{
                  left: `${splitPct}%`,
                  backgroundColor: 'var(--prism-text-primary)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full -mt-1 shrink-0"
                  style={{ backgroundColor: toneVar }}
                />
                <span
                  className="w-2 h-2 rounded-full -mb-1 shrink-0"
                  style={{ backgroundColor: toneVar }}
                />
              </div>
            );
          })}

          {/* In-Point Trim Handle */}
          <div
            role="slider"
            aria-label="Trim clip start"
            aria-valuemin={0}
            aria-valuemax={maxAllowedIn}
            aria-valuenow={currentState.inSec}
            aria-valuetext={formatSec(currentState.inSec)}
            aria-disabled={disabled ? 'true' : undefined}
            tabIndex={disabled ? -1 : 0}
            data-testid="clip-trim-handle-in"
            data-handle="in"
            data-dragging={activeHandle === 'in' ? 'true' : undefined}
            onClick={handleHandleClick}
            onPointerDown={handleHandlePointerDown('in')}
            onKeyDown={handleHandleKeyDown('in')}
            style={{
              left: `${inPct}%`,
              borderColor: toneVar,
              touchAction: 'none',
            }}
            className={cx(
              handleClass,
              activeHandle === 'in' ? 'z-50' : 'z-20',
              'prism-crystal prism-focus-ring absolute inset-y-1 -translate-x-1/2 w-4 rounded-lg border-2 flex flex-col items-center justify-center gap-1 touch-none transition-transform duration-100',
              disabled
                ? 'cursor-not-allowed'
                : activeHandle === 'in'
                  ? 'scale-105 cursor-grabbing'
                  : 'cursor-ew-resize hover:scale-105'
            )}
          >
            <span
              aria-hidden="true"
              className="w-0.5 h-4 rounded-full pointer-events-none"
              style={{ backgroundColor: toneVar }}
            />
          </div>

          {/* Out-Point Trim Handle */}
          <div
            role="slider"
            aria-label="Trim clip end"
            aria-valuemin={minAllowedOut}
            aria-valuemax={safeTotal}
            aria-valuenow={currentState.outSec}
            aria-valuetext={formatSec(currentState.outSec)}
            aria-disabled={disabled ? 'true' : undefined}
            tabIndex={disabled ? -1 : 0}
            data-testid="clip-trim-handle-out"
            data-handle="out"
            data-dragging={activeHandle === 'out' ? 'true' : undefined}
            onClick={handleHandleClick}
            onPointerDown={handleHandlePointerDown('out')}
            onKeyDown={handleHandleKeyDown('out')}
            style={{
              left: `${outPct}%`,
              borderColor: toneVar,
              touchAction: 'none',
            }}
            className={cx(
              handleClass,
              activeHandle === 'out' ? 'z-50' : 'z-20',
              'prism-crystal prism-focus-ring absolute inset-y-1 -translate-x-1/2 w-4 rounded-lg border-2 flex flex-col items-center justify-center gap-1 touch-none transition-transform duration-100',
              disabled
                ? 'cursor-not-allowed'
                : activeHandle === 'out'
                  ? 'scale-105 cursor-grabbing'
                  : 'cursor-ew-resize hover:scale-105'
            )}
          >
            <span
              aria-hidden="true"
              className="w-0.5 h-4 rounded-full pointer-events-none"
              style={{ backgroundColor: toneVar }}
            />
          </div>

          {/* Fade-In Ramp Handle */}
          <div
            role="slider"
            aria-label="Adjust fade in"
            aria-valuemin={0}
            aria-valuemax={maxAllowedFadeIn}
            aria-valuenow={currentState.fadeInSec}
            aria-valuetext={formatSec(currentState.fadeInSec)}
            aria-disabled={disabled ? 'true' : undefined}
            tabIndex={disabled ? -1 : 0}
            data-testid="clip-trim-handle-fade-in"
            data-handle="fade-in"
            data-dragging={activeHandle === 'fade-in' ? 'true' : undefined}
            onClick={handleHandleClick}
            onPointerDown={handleHandlePointerDown('fade-in')}
            onKeyDown={handleHandleKeyDown('fade-in')}
            style={{
              left: `${fadeInAbsPct}%`,
              borderColor: toneVar,
              touchAction: 'none',
            }}
            className={cx(
              fadeHandleClass,
              fadeInZ,
              'prism-crystal prism-focus-ring absolute top-1 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center touch-none transition-transform duration-100',
              disabled
                ? 'cursor-not-allowed'
                : activeHandle === 'fade-in'
                  ? 'scale-115 cursor-grabbing'
                  : 'cursor-ew-resize hover:scale-110'
            )}
          >
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full pointer-events-none"
              style={{ backgroundColor: toneVar }}
            />
          </div>

          {/* Fade-Out Ramp Handle */}
          <div
            role="slider"
            aria-label="Adjust fade out"
            aria-valuemin={0}
            aria-valuemax={maxAllowedFadeOut}
            aria-valuenow={currentState.fadeOutSec}
            aria-valuetext={formatSec(currentState.fadeOutSec)}
            aria-disabled={disabled ? 'true' : undefined}
            tabIndex={disabled ? -1 : 0}
            data-testid="clip-trim-handle-fade-out"
            data-handle="fade-out"
            data-dragging={activeHandle === 'fade-out' ? 'true' : undefined}
            onClick={handleHandleClick}
            onPointerDown={handleHandlePointerDown('fade-out')}
            onKeyDown={handleHandleKeyDown('fade-out')}
            style={{
              left: `${fadeOutAbsPct}%`,
              borderColor: toneVar,
              touchAction: 'none',
            }}
            className={cx(
              fadeHandleClass,
              fadeOutZ,
              'prism-crystal prism-focus-ring absolute top-1 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center touch-none transition-transform duration-100',
              disabled
                ? 'cursor-not-allowed'
                : activeHandle === 'fade-out'
                  ? 'scale-115 cursor-grabbing'
                  : 'cursor-ew-resize hover:scale-110'
            )}
          >
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full pointer-events-none"
              style={{ backgroundColor: toneVar }}
            />
          </div>
        </div>
      </div>

      {/* Recessed Prism-Well Telemetry Readout */}
      <div
        aria-live="polite"
        data-testid="clip-trim-telemetry"
        className={cx(
          telemetryClass,
          'prism-well rounded-2xl px-3.5 py-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 min-w-0'
        )}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            In
          </span>
          <span
            data-testid="clip-trim-telemetry-in"
            className="font-mono text-xs sm:text-sm font-semibold tabular-nums truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {formatSec(currentState.inSec)}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            Out
          </span>
          <span
            data-testid="clip-trim-telemetry-out"
            className="font-mono text-xs sm:text-sm font-semibold tabular-nums truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {formatSec(currentState.outSec)}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            Dur
          </span>
          <span
            data-testid="clip-trim-telemetry-dur"
            className="font-mono text-xs sm:text-sm font-semibold tabular-nums truncate"
            style={{ color: toneVar }}
          >
            {formatSec(durationSec)}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            Fade In
          </span>
          <span
            data-testid="clip-trim-telemetry-fade-in"
            className="font-mono text-xs sm:text-sm font-semibold tabular-nums truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {formatSec(currentState.fadeInSec)}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            Fade Out
          </span>
          <span
            data-testid="clip-trim-telemetry-fade-out"
            className="font-mono text-xs sm:text-sm font-semibold tabular-nums truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {formatSec(currentState.fadeOutSec)}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            Splits
          </span>
          <span
            data-testid="clip-trim-telemetry-splits"
            className="font-mono text-xs sm:text-sm font-semibold tabular-nums truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {currentState.splits.length}
          </span>
        </div>
      </div>
    </div>
  );
}

export const ClipTrimHandle = memo(ClipTrimHandleInner);
ClipTrimHandle.displayName = 'ClipTrimHandle';
