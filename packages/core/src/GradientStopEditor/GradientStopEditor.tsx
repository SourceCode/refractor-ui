'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ArrowLeftRight, Blend, Plus, Trash2 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type GradientKind = 'linear' | 'radial' | 'conic';

export type GradientStopToken =
  | 'primary'
  | 'secondary'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'info';

export interface GradientColorStop {
  /** Unique stable identifier for the color stop. */
  id: string;
  /** Stop position along the gradient axis in [0..100]. */
  positionPct: number;
  /** Semantic optical palette token mapped to a `--prism-*` CSS custom property. */
  token: GradientStopToken;
  /** Stop opacity percentage in [0..100] interpolated via `color-mix(in srgb, ...)`. */
  opacityPct: number;
  /** Optional transition midpoint in [15..85] between this stop and the next stop (defaults to 50). */
  midpointPct?: number;
}

export interface GradientEditorState {
  /** Gradient geometry mode. */
  kind: GradientKind;
  /** Gradient orientation angle in degrees [0..360] (applies to linear and conic modes). */
  angleDeg: number;
  /** Ordered list of gradient color stops (at least 2 stops). */
  stops: ReadonlyArray<GradientColorStop>;
}

export interface GradientKindMeta {
  id: GradientKind;
  label: string;
}

export interface GradientStopTokenMeta {
  id: GradientStopToken;
  label: string;
  cssVar: string;
}

type GradientStopEditorBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface GradientStopEditorProps extends GradientStopEditorBaseProps {
  /** Controlled gradient editor state. */
  value?: GradientEditorState;
  /** Initial gradient state for uncontrolled usage (default 3-stop optical prism gradient at 135deg linear). */
  defaultValue?: GradientEditorState;
  /** Callback fired with the normalized state and computed CSS gradient string on every change. */
  onChange?: (state: GradientEditorState, cssValue: string) => void;
  /** Visible panel heading (defaults to 'Multi-Stop Gradient Editor'). */
  title?: string;
  /** Disables all mode, angle, stop, midpoint, and inspector interactions (defaults to false). */
  disabled?: boolean;
}

interface ActiveDragTarget {
  kind: 'stop' | 'midpoint';
  stopId: string;
}

interface NormalizedGradientColorStop extends GradientColorStop {
  midpointPct: number;
}

interface NormalizedGradientEditorState extends GradientEditorState {
  stops: ReadonlyArray<NormalizedGradientColorStop>;
}

const DEFAULT_TITLE = 'Multi-Stop Gradient Editor';
const MIN_POSITION_PCT = 0;
const MAX_POSITION_PCT = 100;
const MIN_OPACITY_PCT = 0;
const MAX_OPACITY_PCT = 100;
const MIN_MIDPOINT_PCT = 15;
const MAX_MIDPOINT_PCT = 85;
const DEFAULT_MIDPOINT_PCT = 50;
const MIN_ANGLE_DEG = 0;
const MAX_ANGLE_DEG = 360;
const DEFAULT_ANGLE_DEG = 135;
const MIN_STOPS = 2;
const MAX_STOPS = 12;
const FINE_STEP_PCT = 2;
const COARSE_STEP_PCT = 10;

export const GRADIENT_KINDS: ReadonlyArray<GradientKindMeta> = [
  { id: 'linear', label: 'Linear' },
  { id: 'radial', label: 'Radial' },
  { id: 'conic', label: 'Conic' },
];

export const GRADIENT_STOP_TOKENS: ReadonlyArray<GradientStopTokenMeta> = [
  { id: 'primary', label: 'Primary', cssVar: 'var(--prism-primary-main)' },
  { id: 'secondary', label: 'Secondary', cssVar: 'var(--prism-secondary-main)' },
  { id: 'emerald', label: 'Emerald', cssVar: 'var(--prism-success-main)' },
  { id: 'amber', label: 'Amber', cssVar: 'var(--prism-warning-main)' },
  { id: 'rose', label: 'Rose', cssVar: 'var(--prism-error-main)' },
  { id: 'info', label: 'Info', cssVar: 'var(--prism-info-main)' },
];

export const DEFAULT_GRADIENT_STATE: GradientEditorState = {
  kind: 'linear',
  angleDeg: DEFAULT_ANGLE_DEG,
  stops: [
    {
      id: 'stop-1',
      positionPct: 0,
      token: 'primary',
      opacityPct: 100,
      midpointPct: DEFAULT_MIDPOINT_PCT,
    },
    {
      id: 'stop-2',
      positionPct: 52,
      token: 'secondary',
      opacityPct: 100,
      midpointPct: DEFAULT_MIDPOINT_PCT,
    },
    {
      id: 'stop-3',
      positionPct: 100,
      token: 'emerald',
      opacityPct: 100,
      midpointPct: DEFAULT_MIDPOINT_PCT,
    },
  ],
};

const TOKEN_META_BY_ID: Record<GradientStopToken, GradientStopTokenMeta> = {
  primary: GRADIENT_STOP_TOKENS[0]!,
  secondary: GRADIENT_STOP_TOKENS[1]!,
  emerald: GRADIENT_STOP_TOKENS[2]!,
  amber: GRADIENT_STOP_TOKENS[3]!,
  rose: GRADIENT_STOP_TOKENS[4]!,
  info: GRADIENT_STOP_TOKENS[5]!,
};

function isGradientKind(value: string): value is GradientKind {
  return value === 'linear' || value === 'radial' || value === 'conic';
}

function isGradientStopToken(value: string): value is GradientStopToken {
  return (
    value === 'primary' ||
    value === 'secondary' ||
    value === 'emerald' ||
    value === 'amber' ||
    value === 'rose' ||
    value === 'info'
  );
}

function formatStopColor(token: GradientStopToken, opacityPct: number): string {
  return `color-mix(in srgb, ${TOKEN_META_BY_ID[token].cssVar} ${opacityPct}%, transparent)`;
}

function normalizeStops(
  rawStops: ReadonlyArray<GradientColorStop> | undefined
): NormalizedGradientColorStop[] {
  if (!rawStops || rawStops.length === 0) {
    return DEFAULT_GRADIENT_STATE.stops.map((stop) => ({
      ...stop,
      midpointPct: DEFAULT_MIDPOINT_PCT,
    }));
  }

  const seen = new Map<string, number>();
  const sliced = rawStops.slice(0, MAX_STOPS);
  const sanitized: NormalizedGradientColorStop[] = sliced.map((stop, index) => {
    const trimmed = stop.id.trim();
    const baseId = trimmed.length > 0 ? trimmed : `stop-${index + 1}`;
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    return {
      id,
      positionPct: Math.round(
        clampNumber(stop.positionPct, MIN_POSITION_PCT, MAX_POSITION_PCT, MIN_POSITION_PCT)
      ),
      token: isGradientStopToken(stop.token) ? stop.token : 'primary',
      opacityPct: Math.round(
        clampNumber(stop.opacityPct, MIN_OPACITY_PCT, MAX_OPACITY_PCT, MAX_OPACITY_PCT)
      ),
      midpointPct: Math.round(
        clampNumber(
          stop.midpointPct ?? DEFAULT_MIDPOINT_PCT,
          MIN_MIDPOINT_PCT,
          MAX_MIDPOINT_PCT,
          DEFAULT_MIDPOINT_PCT
        )
      ),
    };
  });

  if (sanitized.length === 1) {
    const only = sanitized[0]!;
    sanitized.push({
      id: only.id === 'stop-fallback' ? 'stop-fallback-2' : 'stop-fallback',
      positionPct: only.positionPct < 50 ? MAX_POSITION_PCT : MIN_POSITION_PCT,
      token: only.token === 'primary' ? 'secondary' : 'primary',
      opacityPct: MAX_OPACITY_PCT,
      midpointPct: DEFAULT_MIDPOINT_PCT,
    });
  }

  sanitized.sort((a, b) => a.positionPct - b.positionPct);
  return sanitized;
}

function normalizeGradientState(
  raw: GradientEditorState | undefined
): NormalizedGradientEditorState {
  if (!raw) {
    return {
      kind: DEFAULT_GRADIENT_STATE.kind,
      angleDeg: DEFAULT_GRADIENT_STATE.angleDeg,
      stops: normalizeStops(undefined),
    };
  }

  return {
    kind: isGradientKind(raw.kind) ? raw.kind : 'linear',
    angleDeg: Math.round(
      clampNumber(raw.angleDeg, MIN_ANGLE_DEG, MAX_ANGLE_DEG, DEFAULT_ANGLE_DEG)
    ),
    stops: normalizeStops(raw.stops),
  };
}

function buildColorStopList(stops: ReadonlyArray<NormalizedGradientColorStop>): string {
  const parts: string[] = [];
  for (let i = 0; i < stops.length; i += 1) {
    const stop = stops[i]!;
    parts.push(`${formatStopColor(stop.token, stop.opacityPct)} ${stop.positionPct}%`);

    if (i < stops.length - 1) {
      const nextStop = stops[i + 1]!;
      const midpointPct = stop.midpointPct;
      if (midpointPct !== DEFAULT_MIDPOINT_PCT && nextStop.positionPct > stop.positionPct) {
        const rawHint =
          stop.positionPct + ((nextStop.positionPct - stop.positionPct) * midpointPct) / 100;
        const hintPct = Math.round(rawHint * 10) / 10;
        parts.push(`${hintPct}%`);
      }
    }
  }
  return parts.join(', ');
}

export function buildGradientCss(state: GradientEditorState): string {
  const normalized = normalizeGradientState(state);
  const stopList = buildColorStopList(normalized.stops);

  if (normalized.kind === 'radial') {
    return `radial-gradient(circle at center, ${stopList})`;
  }
  if (normalized.kind === 'conic') {
    return `conic-gradient(from ${normalized.angleDeg}deg, ${stopList})`;
  }
  return `linear-gradient(${normalized.angleDeg}deg, ${stopList})`;
}

function createInsertedStop(
  stops: ReadonlyArray<GradientColorStop>,
  counterRef: { current: number }
): GradientColorStop {
  let bestStart = stops[0]!.positionPct;
  let bestEnd = stops[1]!.positionPct;
  let maxGap = bestEnd - bestStart;

  for (let i = 1; i < stops.length - 1; i += 1) {
    const start = stops[i]!.positionPct;
    const end = stops[i + 1]!.positionPct;
    const gap = end - start;
    if (gap > maxGap) {
      maxGap = gap;
      bestStart = start;
      bestEnd = end;
    }
  }

  const positionPct = Math.round((bestStart + bestEnd) / 2);
  const usedTokens = new Set(stops.map((stop) => stop.token));
  const nextTokenMeta =
    GRADIENT_STOP_TOKENS.find((meta) => !usedTokens.has(meta.id)) ??
    GRADIENT_STOP_TOKENS[stops.length % GRADIENT_STOP_TOKENS.length]!;

  const existingIds = new Set(stops.map((stop) => stop.id));
  let candidateId = `stop-${counterRef.current}`;
  while (existingIds.has(candidateId)) {
    counterRef.current += 1;
    candidateId = `stop-${counterRef.current}`;
  }
  counterRef.current += 1;

  return {
    id: candidateId,
    positionPct,
    token: nextTokenMeta.id,
    opacityPct: MAX_OPACITY_PCT,
    midpointPct: DEFAULT_MIDPOINT_PCT,
  };
}

function reverseGradientStops(
  stops: ReadonlyArray<NormalizedGradientColorStop>
): NormalizedGradientColorStop[] {
  const count = stops.length;
  const reversed: NormalizedGradientColorStop[] = [];

  for (let i = 0; i < count; i += 1) {
    const origIdx = count - 1 - i;
    const origStop = stops[origIdx]!;
    const mirroredMidpoint =
      i < count - 1 ? 100 - stops[origIdx - 1]!.midpointPct : DEFAULT_MIDPOINT_PCT;

    reversed.push({
      ...origStop,
      positionPct: MAX_POSITION_PCT - origStop.positionPct,
      midpointPct: mirroredMidpoint,
    });
  }

  return reversed;
}

function GradientStopEditorInner({
  value,
  defaultValue,
  onChange,
  title = DEFAULT_TITLE,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: GradientStopEditorProps) {
  const override = useComponentOverride('GradientStopEditor');
  const headingId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const nextStopCounterRef = useRef<number>(4);

  const isControlled = value !== undefined;
  const [internalState, setInternalState] = useState<NormalizedGradientEditorState>(() =>
    normalizeGradientState(defaultValue)
  );

  const currentState = useMemo<NormalizedGradientEditorState>(
    () => (isControlled ? normalizeGradientState(value) : internalState),
    [isControlled, value, internalState]
  );

  const cssValue = useMemo(() => buildGradientCss(currentState), [currentState]);
  const trackRampCss = useMemo(
    () => `linear-gradient(90deg, ${buildColorStopList(currentState.stops)})`,
    [currentState.stops]
  );

  const [selectedStopId, setSelectedStopId] = useState<string>(
    () => currentState.stops[0]!.id
  );
  const [activeMidpointStopId, setActiveMidpointStopId] = useState<string | null>(null);
  const [draggingTarget, setDraggingTarget] = useState<ActiveDragTarget | null>(null);

  const selectedStop =
    currentState.stops.find((stop) => stop.id === selectedStopId) ?? currentState.stops[0]!;
  const selectedTokenMeta = TOKEN_META_BY_ID[selectedStop.token];

  const isRadial = currentState.kind === 'radial';
  const canAddStop = !disabled && currentState.stops.length < MAX_STOPS;
  const canDeleteStop = !disabled && currentState.stops.length > MIN_STOPS;
  const angleDisabled = disabled || isRadial;
  const isDragging = draggingTarget !== null && !disabled;
  const safeTitle = title.trim().length > 0 ? title.trim() : DEFAULT_TITLE;

  const commitState = useCallback(
    (nextRaw: GradientEditorState) => {
      const normalized = normalizeGradientState(nextRaw);
      if (!isControlled) {
        setInternalState(normalized);
      }
      onChange?.(normalized, buildGradientCss(normalized));
    },
    [isControlled, onChange]
  );

  const moveStop = useCallback(
    (stopId: string, rawPositionPct: number) => {
      const target = currentState.stops.find((stop) => stop.id === stopId);
      if (!target) return;
      const nextPosition = Math.round(
        clampNumber(rawPositionPct, MIN_POSITION_PCT, MAX_POSITION_PCT, target.positionPct)
      );
      if (nextPosition === target.positionPct) return;

      const updatedStops = currentState.stops.map((stop) =>
        stop.id === stopId ? { ...stop, positionPct: nextPosition } : stop
      );
      commitState({ ...currentState, stops: updatedStops });
    },
    [currentState, commitState]
  );

  const moveMidpoint = useCallback(
    (stopId: string, rawMidpointPct: number) => {
      const target = currentState.stops.find((stop) => stop.id === stopId)!;
      const nextMidpoint = Math.round(
        clampNumber(rawMidpointPct, MIN_MIDPOINT_PCT, MAX_MIDPOINT_PCT, target.midpointPct)
      );
      if (nextMidpoint === target.midpointPct) return;

      const updatedStops = currentState.stops.map((stop) =>
        stop.id === stopId ? { ...stop, midpointPct: nextMidpoint } : stop
      );
      commitState({ ...currentState, stops: updatedStops });
    },
    [currentState, commitState]
  );

  const deleteStop = useCallback(
    (stopId: string) => {
      if (currentState.stops.length <= MIN_STOPS) return;
      const index = currentState.stops.findIndex((stop) => stop.id === stopId);
      const remaining = currentState.stops.filter((stop) => stop.id !== stopId);
      setSelectedStopId(remaining[Math.max(0, index - 1)]!.id);
      setActiveMidpointStopId(null);
      commitState({ ...currentState, stops: remaining });
    },
    [currentState, commitState]
  );

  const latestRef = useRef({
    stops: currentState.stops,
    moveStop,
    moveMidpoint,
  });
  latestRef.current = {
    stops: currentState.stops,
    moveStop,
    moveMidpoint,
  };

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      cleanupDragRef.current?.();
      setDraggingTarget(null);
    }
  }, [disabled]);

  const getTrackRect = useCallback((): DOMRect | null => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || !Number.isFinite(rect.width) || rect.width <= 0) {
      return null;
    }
    return rect;
  }, []);

  const startWindowDrag = useCallback(
    (target: ActiveDragTarget, pointerId: number) => {
      cleanupDragRef.current?.();
      setDraggingTarget(target);

      const handleWindowPointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const rect = getTrackRect();
        if (!rect) return;
        const trackPct = ((moveEvent.clientX - rect.left) / rect.width) * 100;

        if (target.kind === 'stop') {
          latestRef.current.moveStop(target.stopId, trackPct);
          return;
        }

        const stops = latestRef.current.stops;
        const idx = stops.findIndex((stop) => stop.id === target.stopId);
        if (idx === -1 || idx >= stops.length - 1) return;
        const stopA = stops[idx]!;
        const stopB = stops[idx + 1]!;
        const span = stopB.positionPct - stopA.positionPct;
        if (span <= 0) return;

        const relativeMidpoint = ((trackPct - stopA.positionPct) / span) * 100;
        latestRef.current.moveMidpoint(target.stopId, relativeMidpoint);
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
        setDraggingTarget(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
      window.addEventListener('pointerup', handleWindowPointerEnd);
      window.addEventListener('pointercancel', handleWindowPointerEnd);
    },
    [getTrackRect]
  );

  const handleSelectKind = (kind: GradientKind) => {
    if (kind === currentState.kind) return;
    commitState({ ...currentState, kind });
  };

  const handleAngleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (angleDisabled) return;
    const nextAngle = Math.round(
      clampNumber(Number(event.target.value), MIN_ANGLE_DEG, MAX_ANGLE_DEG, currentState.angleDeg)
    );
    commitState({ ...currentState, angleDeg: nextAngle });
  };

  const handleAddStop = () => {
    const inserted = createInsertedStop(currentState.stops, nextStopCounterRef);
    setSelectedStopId(inserted.id);
    setActiveMidpointStopId(null);
    commitState({ ...currentState, stops: [...currentState.stops, inserted] });
  };

  const handleReverseStops = () => {
    commitState({ ...currentState, stops: reverseGradientStops(currentState.stops) });
  };

  const handleSelectToken = (token: GradientStopToken) => {
    if (selectedStop.token === token) return;
    const updatedStops = currentState.stops.map((stop) =>
      stop.id === selectedStop.id ? { ...stop, token } : stop
    );
    commitState({ ...currentState, stops: updatedStops });
  };

  const handleSelectedPositionChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    moveStop(selectedStop.id, Number(event.target.value));
  };

  const handleSelectedOpacityChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const nextOpacity = Math.round(
      clampNumber(
        Number(event.target.value),
        MIN_OPACITY_PCT,
        MAX_OPACITY_PCT,
        selectedStop.opacityPct
      )
    );
    const updatedStops = currentState.stops.map((stop) =>
      stop.id === selectedStop.id ? { ...stop, opacityPct: nextOpacity } : stop
    );
    commitState({ ...currentState, stops: updatedStops });
  };

  const handleStopThumbPointerDown =
    (stopId: string) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      setSelectedStopId(stopId);
      setActiveMidpointStopId(null);
      if (!getTrackRect()) return;
      startWindowDrag({ kind: 'stop', stopId }, event.pointerId);
    };

  const handleMidpointPointerDown =
    (stopId: string) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      setSelectedStopId(stopId);
      setActiveMidpointStopId(stopId);
      if (!getTrackRect()) return;
      startWindowDrag({ kind: 'midpoint', stopId }, event.pointerId);
    };

  const handleStopThumbKeyDown =
    (stop: GradientColorStop) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;
      const step = event.shiftKey ? COARSE_STEP_PCT : FINE_STEP_PCT;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedStopId(stop.id);
        setActiveMidpointStopId(null);
        moveStop(stop.id, stop.positionPct - step);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedStopId(stop.id);
        setActiveMidpointStopId(null);
        moveStop(stop.id, stop.positionPct + step);
      } else if (event.key === 'Home') {
        event.preventDefault();
        setSelectedStopId(stop.id);
        setActiveMidpointStopId(null);
        moveStop(stop.id, MIN_POSITION_PCT);
      } else if (event.key === 'End') {
        event.preventDefault();
        setSelectedStopId(stop.id);
        setActiveMidpointStopId(null);
        moveStop(stop.id, MAX_POSITION_PCT);
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteStop(stop.id);
      }
    };

  const handleMidpointKeyDown =
    (stop: NormalizedGradientColorStop) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;
      const step = event.shiftKey ? COARSE_STEP_PCT : FINE_STEP_PCT;
      const currentMidpoint = stop.midpointPct;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedStopId(stop.id);
        setActiveMidpointStopId(stop.id);
        moveMidpoint(stop.id, currentMidpoint - step);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedStopId(stop.id);
        setActiveMidpointStopId(stop.id);
        moveMidpoint(stop.id, currentMidpoint + step);
      } else if (event.key === 'Home') {
        event.preventDefault();
        setSelectedStopId(stop.id);
        setActiveMidpointStopId(stop.id);
        moveMidpoint(stop.id, MIN_MIDPOINT_PCT);
      } else if (event.key === 'End') {
        event.preventDefault();
        setSelectedStopId(stop.id);
        setActiveMidpointStopId(stop.id);
        moveMidpoint(stop.id, MAX_MIDPOINT_PCT);
      }
    };

  const merged = mergeProps({
    themeTarget: themeProps('gradient-stop-editor', {
      kind: currentState.kind,
      disabled,
      dragging: isDragging,
      stops: currentState.stops.length,
    }),
    baseClassName: cx(
      'prism-slab p-4 sm:p-5 w-full max-w-full space-y-3.5 min-w-0',
      disabled ? 'opacity-65' : undefined
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('gradient-stop-editor', 'header');
  const previewClass = stableClassName('gradient-stop-editor', 'preview');
  const trackClass = stableClassName('gradient-stop-editor', 'track');
  const thumbClass = stableClassName('gradient-stop-editor', 'thumb');
  const midpointClass = stableClassName('gradient-stop-editor', 'midpoint');
  const inspectorClass = stableClassName('gradient-stop-editor', 'inspector');
  const telemetryClass = stableClassName('gradient-stop-editor', 'telemetry');

  const anglePct = Math.round((currentState.angleDeg / MAX_ANGLE_DEG) * 100);

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'space-y-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
              style={{ color: selectedTokenMeta.cssVar }}
            >
              <Blend className="w-4 h-4 shrink-0" />
            </span>
            <h4
              id={headingId}
              data-testid="gradient-editor-title"
              className="text-sm font-semibold tracking-tight truncate min-w-0"
              style={STYLE_TEXT_PRIMARY}
            >
              {safeTitle}
            </h4>
            <span
              data-testid="gradient-stop-count"
              className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {currentState.stops.length} stops
            </span>
          </div>

          <div
            role="group"
            aria-label="Gradient type"
            data-testid="gradient-kind-group"
            className="flex flex-wrap items-center gap-1.5 min-w-0"
          >
            {GRADIENT_KINDS.map((kindMeta) => {
              const isActive = currentState.kind === kindMeta.id;
              return (
                <button
                  key={kindMeta.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isActive}
                  data-testid={`gradient-kind-${kindMeta.id}`}
                  onClick={() => handleSelectKind(kindMeta.id)}
                  className={cx(
                    'prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                    isActive
                      ? 'prism-btn-primary'
                      : 'prism-crystal opacity-85 enabled:hover:opacity-100'
                  )}
                  style={isActive ? undefined : { color: 'var(--prism-text-primary)' }}
                >
                  <span className="relative z-10">{kindMeta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div
            data-testid="gradient-angle-control"
            data-angle-inactive={isRadial ? 'true' : undefined}
            className={cx(
              'flex items-center gap-2 flex-1 min-w-[180px]',
              angleDisabled ? 'opacity-50' : undefined
            )}
          >
            <span
              aria-hidden="true"
              className="text-[11px] font-semibold uppercase tracking-wider shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              Angle
            </span>
            <div className="relative h-7 flex-1 min-w-[96px] flex items-center">
              <div className="prism-crystal w-full h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  data-testid="gradient-angle-fill"
                  className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                  style={{
                    width: `${anglePct}%`,
                    backgroundColor: 'var(--prism-primary-main)',
                  }}
                />
              </div>
              <input
                type="range"
                min={MIN_ANGLE_DEG}
                max={MAX_ANGLE_DEG}
                step={1}
                value={currentState.angleDeg}
                disabled={angleDisabled}
                aria-label="Gradient angle"
                aria-valuemin={MIN_ANGLE_DEG}
                aria-valuemax={MAX_ANGLE_DEG}
                aria-valuenow={currentState.angleDeg}
                aria-valuetext={`${currentState.angleDeg}°`}
                data-testid="gradient-angle-slider"
                onChange={handleAngleChange}
                className="peer absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div
                aria-hidden="true"
                className="prism-thumb w-4 h-4 rounded-full pointer-events-none absolute -ml-2 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                style={{ left: `${anglePct}%` }}
              />
            </div>
            <span
              data-testid="gradient-angle-readout"
              className="prism-crystal px-2 py-0.5 rounded-full font-mono text-xs font-semibold tabular-nums min-w-[48px] text-center shrink-0"
              style={STYLE_TEXT_PRIMARY}
            >
              {isRadial ? '—' : `${currentState.angleDeg}°`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={!canAddStop}
              data-testid="gradient-add-stop-button"
              onClick={handleAddStop}
              className="prism-btn-primary prism-focus-ring h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
            >
              <Plus aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span className="relative z-10">Add Stop</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              data-testid="gradient-reverse-button"
              onClick={handleReverseStops}
              className="prism-btn-secondary prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
            >
              <ArrowLeftRight aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Reverse</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className={cx(
          previewClass,
          'prism-well rounded-2xl h-16 relative overflow-hidden min-w-0'
        )}
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, var(--prism-divider) 0 8px, transparent 8px 16px)',
        }}
      >
        <div
          role="img"
          aria-label={`${safeTitle} ${currentState.kind} gradient preview`}
          data-testid="gradient-preview-bar"
          data-gradient-kind={currentState.kind}
          data-gradient-css={cssValue}
          className="absolute inset-0 rounded-2xl"
          style={{ backgroundImage: cssValue }}
        />
      </div>

      <div
        className={cx(
          trackClass,
          'prism-well rounded-2xl px-4 py-3 min-w-0',
          disabled ? 'opacity-60' : undefined
        )}
      >
        <div
          ref={trackRef}
          data-testid="gradient-stop-track"
          className="relative h-14 w-full select-none touch-none"
          style={{ touchAction: 'none' }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-2.5 h-px"
            style={STYLE_BG_DIVIDER}
          />

          {currentState.stops.slice(0, -1).map((stop, index) => {
            const nextStop = currentState.stops[index + 1]!;
            const midpointPct = stop.midpointPct;
            const midpointTrackPct =
              stop.positionPct + ((nextStop.positionPct - stop.positionPct) * midpointPct) / 100;
            const isMidpointActive = activeMidpointStopId === stop.id;
            const isMidpointDragging =
              draggingTarget?.kind === 'midpoint' && draggingTarget.stopId === stop.id;

            return (
              <div
                key={`midpoint-${stop.id}`}
                role="slider"
                aria-label={`Midpoint between stops ${index + 1} and ${index + 2}`}
                aria-valuemin={MIN_MIDPOINT_PCT}
                aria-valuemax={MAX_MIDPOINT_PCT}
                aria-valuenow={midpointPct}
                aria-valuetext={`${midpointPct}% midpoint`}
                aria-disabled={disabled ? 'true' : undefined}
                tabIndex={disabled ? -1 : 0}
                data-testid={`gradient-midpoint-${stop.id}`}
                data-midpoint={String(midpointPct)}
                data-active={isMidpointActive ? 'true' : undefined}
                onClick={() => {
                  if (disabled) return;
                  setSelectedStopId(stop.id);
                  setActiveMidpointStopId(stop.id);
                }}
                onDoubleClick={() => {
                  if (disabled) return;
                  setSelectedStopId(stop.id);
                  setActiveMidpointStopId(stop.id);
                  moveMidpoint(stop.id, DEFAULT_MIDPOINT_PCT);
                }}
                onPointerDown={handleMidpointPointerDown(stop.id)}
                onKeyDown={handleMidpointKeyDown(stop)}
                className={cx(
                  midpointClass,
                  'prism-crystal prism-focus-ring absolute top-1 -translate-x-1/2 w-3.5 h-3.5 rotate-45 rounded-[3px] border-2 touch-none transition-transform duration-100',
                  isMidpointActive || isMidpointDragging ? 'z-30' : 'z-10',
                  disabled
                    ? 'cursor-not-allowed'
                    : isMidpointDragging
                      ? 'scale-125 cursor-grabbing'
                      : 'cursor-grab hover:scale-110'
                )}
                style={{
                  left: `${midpointTrackPct}%`,
                  borderColor:
                    isMidpointActive || isMidpointDragging
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                  touchAction: 'none',
                }}
              />
            );
          })}

          <div
            aria-hidden="true"
            data-testid="gradient-stop-rail"
            className="prism-crystal absolute inset-x-0 bottom-2.5 h-3 rounded-full overflow-hidden"
            style={{ backgroundImage: trackRampCss }}
          />

          {currentState.stops.map((stop, index) => {
            const tokenMeta = TOKEN_META_BY_ID[stop.token];
            const isSelected = selectedStop.id === stop.id;
            const isStopDragging =
              draggingTarget?.kind === 'stop' && draggingTarget.stopId === stop.id;

            return (
              <div
                key={stop.id}
                role="slider"
                aria-label={`Gradient stop ${index + 1} position`}
                aria-valuemin={MIN_POSITION_PCT}
                aria-valuemax={MAX_POSITION_PCT}
                aria-valuenow={stop.positionPct}
                aria-valuetext={`${stop.positionPct}% (${tokenMeta.label}, ${stop.opacityPct}% opacity)`}
                aria-disabled={disabled ? 'true' : undefined}
                tabIndex={disabled ? -1 : 0}
                data-testid={`gradient-stop-${stop.id}`}
                data-stop-id={stop.id}
                data-token={stop.token}
                data-position={String(stop.positionPct)}
                data-opacity={String(stop.opacityPct)}
                data-selected={isSelected ? 'true' : undefined}
                onClick={() => {
                  if (disabled) return;
                  setSelectedStopId(stop.id);
                  setActiveMidpointStopId(null);
                }}
                onPointerDown={handleStopThumbPointerDown(stop.id)}
                onKeyDown={handleStopThumbKeyDown(stop)}
                className={cx(
                  thumbClass,
                  'prism-crystal prism-focus-ring absolute bottom-1 -translate-x-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center touch-none transition-transform duration-100',
                  isStopDragging ? 'z-30' : isSelected ? 'z-20' : 'z-10',
                  disabled
                    ? 'cursor-not-allowed'
                    : isStopDragging
                      ? 'scale-110 cursor-grabbing'
                      : 'cursor-grab hover:scale-105'
                )}
                style={{
                  left: `${stop.positionPct}%`,
                  borderColor: isSelected ? tokenMeta.cssVar : 'var(--prism-divider)',
                  touchAction: 'none',
                }}
              >
                <span
                  aria-hidden="true"
                  className="w-3 h-3 rounded-full pointer-events-none"
                  style={{ backgroundColor: formatStopColor(stop.token, stop.opacityPct) }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div
        role="group"
        aria-label="Selected stop inspector"
        data-testid="gradient-stop-inspector"
        className={cx(
          inspectorClass,
          'prism-well rounded-2xl p-3 flex flex-wrap items-center gap-3 min-w-0'
        )}
      >
        <div
          role="group"
          aria-label="Stop color token"
          data-testid="gradient-token-picker"
          className="flex flex-wrap items-center gap-1.5 min-w-0"
        >
          {GRADIENT_STOP_TOKENS.map((tokenMeta) => {
            const isSelectedToken = selectedStop.token === tokenMeta.id;
            return (
              <button
                key={tokenMeta.id}
                type="button"
                disabled={disabled}
                aria-pressed={isSelectedToken}
                data-testid={`gradient-token-${tokenMeta.id}`}
                onClick={() => handleSelectToken(tokenMeta.id)}
                className={cx(
                  'prism-focus-ring rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 text-[11px] font-semibold border cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                  isSelectedToken
                    ? 'prism-crystal'
                    : 'prism-well opacity-80 enabled:hover:opacity-100'
                )}
                style={{
                  color: isSelectedToken
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
                  borderColor: isSelectedToken ? tokenMeta.cssVar : 'var(--prism-divider)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tokenMeta.cssVar }}
                />
                <span>{tokenMeta.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className={cx(
            'flex items-center gap-2 flex-1 min-w-[160px]',
            disabled ? 'opacity-50' : undefined
          )}
        >
          <span
            aria-hidden="true"
            className="text-[11px] font-semibold uppercase tracking-wider shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            Pos
          </span>
          <div className="relative h-7 flex-1 min-w-[76px] flex items-center">
            <div className="prism-crystal w-full h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                data-testid="gradient-position-fill"
                className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                style={{
                  width: `${selectedStop.positionPct}%`,
                  backgroundColor: selectedTokenMeta.cssVar,
                }}
              />
            </div>
            <input
              type="range"
              min={MIN_POSITION_PCT}
              max={MAX_POSITION_PCT}
              step={1}
              value={selectedStop.positionPct}
              disabled={disabled}
              aria-label="Selected stop position"
              aria-valuemin={MIN_POSITION_PCT}
              aria-valuemax={MAX_POSITION_PCT}
              aria-valuenow={selectedStop.positionPct}
              aria-valuetext={`${selectedStop.positionPct}%`}
              data-testid="gradient-stop-position-slider"
              onChange={handleSelectedPositionChange}
              className="peer absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div
              aria-hidden="true"
              className="prism-thumb w-4 h-4 rounded-full pointer-events-none absolute -ml-2 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
              style={{ left: `${selectedStop.positionPct}%` }}
            />
          </div>
          <span
            data-testid="gradient-stop-position-readout"
            className="prism-crystal px-2 py-0.5 rounded-full font-mono text-xs font-semibold tabular-nums min-w-[44px] text-center shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {selectedStop.positionPct}%
          </span>
        </div>

        <div
          className={cx(
            'flex items-center gap-2 flex-1 min-w-[160px]',
            disabled ? 'opacity-50' : undefined
          )}
        >
          <span
            aria-hidden="true"
            className="text-[11px] font-semibold uppercase tracking-wider shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            Opacity
          </span>
          <div className="relative h-7 flex-1 min-w-[76px] flex items-center">
            <div className="prism-crystal w-full h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                data-testid="gradient-opacity-fill"
                className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                style={{
                  width: `${selectedStop.opacityPct}%`,
                  backgroundColor: selectedTokenMeta.cssVar,
                }}
              />
            </div>
            <input
              type="range"
              min={MIN_OPACITY_PCT}
              max={MAX_OPACITY_PCT}
              step={1}
              value={selectedStop.opacityPct}
              disabled={disabled}
              aria-label="Selected stop opacity"
              aria-valuemin={MIN_OPACITY_PCT}
              aria-valuemax={MAX_OPACITY_PCT}
              aria-valuenow={selectedStop.opacityPct}
              aria-valuetext={`${selectedStop.opacityPct}%`}
              data-testid="gradient-stop-opacity-slider"
              onChange={handleSelectedOpacityChange}
              className="peer absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div
              aria-hidden="true"
              className="prism-thumb w-4 h-4 rounded-full pointer-events-none absolute -ml-2 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
              style={{ left: `${selectedStop.opacityPct}%` }}
            />
          </div>
          <span
            data-testid="gradient-stop-opacity-readout"
            className="prism-crystal px-2 py-0.5 rounded-full font-mono text-xs font-semibold tabular-nums min-w-[44px] text-center shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {selectedStop.opacityPct}%
          </span>
        </div>

        <button
          type="button"
          disabled={!canDeleteStop}
          data-testid="gradient-delete-stop-button"
          onClick={() => deleteStop(selectedStop.id)}
          className="prism-crystal prism-focus-ring h-8 px-2.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] shrink-0"
          style={{
            color: canDeleteStop ? 'var(--prism-error-main)' : 'var(--prism-text-disabled)',
          }}
        >
          <Trash2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Delete Stop</span>
        </button>

        <div
          role="status"
          aria-live="polite"
          data-testid="gradient-css-telemetry"
          className={cx(
            telemetryClass,
            'prism-crystal rounded-xl px-3 py-2 w-full min-w-0 font-mono text-[11px] leading-relaxed break-all'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          {cssValue}
        </div>
      </div>
    </div>
  );
}

export const GradientStopEditor = memo(GradientStopEditorInner);
GradientStopEditor.displayName = 'GradientStopEditor';
