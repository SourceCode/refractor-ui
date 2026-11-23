'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Check, Film, MoveHorizontal, Music, Pencil, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_ERROR_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type TimecodeFormat = 'smpte' | 'musical';

export interface TimecodeScrubberProps extends BaseProps<HTMLDivElement> {
  /** Controlled current frame index (integer >= 0). */
  frame?: number;
  /** Initial frame index in uncontrolled mode (defaults to 0). */
  defaultFrame?: number;
  /** Maximum inclusive frame index, clamped >= 1 (defaults to 108000 = 1 hour @ 30fps). */
  maxFrame?: number;
  /** Frame rate in frames per second, clamped to [1..120] (defaults to 30). */
  fps?: number;
  /** Controlled timecode display format: SMPTE ('smpte' -> HH:MM:SS:FF) or musical ('musical' -> BBB:B:TTT). */
  format?: TimecodeFormat;
  /** Initial display format in uncontrolled mode (defaults to 'smpte'). */
  defaultFormat?: TimecodeFormat;
  /** Callback fired whenever the user toggles between SMPTE and musical BBT format. */
  onFormatChange?: (format: TimecodeFormat) => void;
  /** Musical tempo in beats per minute, clamped to [30..300] (defaults to 120). */
  bpm?: number;
  /** Musical time signature numerator (beats per bar), clamped to [2..12] (defaults to 4). */
  beatsPerBar?: number;
  /** Callback fired whenever the frame index changes via scrubbing, keyboard stepping, or direct edit. */
  onFrameChange?: (frame: number, formatted: string) => void;
  /** Header title and accessible slider label (defaults to 'Timecode'). */
  label?: string;
  /** Disables pointer scrubbing, keyboard navigation, format toggling, and direct text editing. */
  disabled?: boolean;
}

interface ScrubSession {
  pointerId: number;
  lastX: number;
  residualPx: number;
  workingFrame: number;
  lastEmitted: number;
}

interface ScrubSensitivityConfig {
  pxPerStep: number;
  framesPerStep: number;
}

const DEFAULT_MAX_FRAME = 108000;
const MIN_MAX_FRAME = 1;
const DEFAULT_FPS = 30;
const MIN_FPS = 1;
const MAX_FPS = 120;
const DEFAULT_BPM = 120;
const MIN_BPM = 30;
const MAX_BPM = 300;
const DEFAULT_BEATS_PER_BAR = 4;
const MIN_BEATS_PER_BAR = 2;
const MAX_BEATS_PER_BAR = 12;
const TICKS_PER_BEAT = 960;

const BASE_SCRUB_PX = 4;
const FINE_SCRUB_PX = 12;
const COARSE_FRAME_STEP = 10;

const DIGITS_ONLY_RE = /^\d+$/;
const SMPTE_RE = /^(\d+):(\d+):(\d+)[:;](\d+)$/;
const MUSICAL_RE = /^(\d+):(\d+):(\d+)$/;

function sanitizeFps(fps: number): number {
  return Math.round(clampNumber(fps, MIN_FPS, MAX_FPS, DEFAULT_FPS));
}

function sanitizeBpm(bpm: number): number {
  return Math.round(clampNumber(bpm, MIN_BPM, MAX_BPM, DEFAULT_BPM));
}

function sanitizeBeatsPerBar(beatsPerBar: number): number {
  return Math.round(clampNumber(beatsPerBar, MIN_BEATS_PER_BAR, MAX_BEATS_PER_BAR, DEFAULT_BEATS_PER_BAR));
}

function sanitizeMaxFrame(maxFrame: number): number {
  if (!Number.isFinite(maxFrame)) {
    return DEFAULT_MAX_FRAME;
  }
  const floored = Math.floor(maxFrame);
  return floored < MIN_MAX_FRAME ? MIN_MAX_FRAME : floored;
}

function clampFrame(raw: number, maxFrame: number, fallback = 0): number {
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  const floored = Math.floor(raw);
  if (floored <= 0) return 0;
  if (floored >= maxFrame) return maxFrame;
  return floored;
}

function sanitizeNonNegativeFrame(frame: number): number {
  if (!Number.isFinite(frame) || frame <= 0) {
    return 0;
  }
  return Math.floor(frame);
}

function getScrubConfig(shiftKey: boolean, altKey: boolean): ScrubSensitivityConfig {
  if (shiftKey) {
    return { pxPerStep: FINE_SCRUB_PX, framesPerStep: 1 };
  }
  if (altKey) {
    return { pxPerStep: BASE_SCRUB_PX, framesPerStep: COARSE_FRAME_STEP };
  }
  return { pxPerStep: BASE_SCRUB_PX, framesPerStep: 1 };
}

/**
 * Formats a non-negative frame index as an SMPTE timecode string (`HH:MM:SS:FF`).
 * Non-finite and negative frames clamp cleanly to `00:00:00:00`; fps clamps to `[1..120]`.
 */
export function formatSmpteTimecode(frame: number, fps: number = DEFAULT_FPS): string {
  const safeFps = sanitizeFps(fps);
  const safeFrame = sanitizeNonNegativeFrame(frame);

  const framesPerMinute = safeFps * 60;
  const framesPerHour = safeFps * 3600;

  const hours = Math.floor(safeFrame / framesPerHour);
  const remAfterHours = safeFrame % framesPerHour;
  const minutes = Math.floor(remAfterHours / framesPerMinute);
  const remAfterMinutes = remAfterHours % framesPerMinute;
  const seconds = Math.floor(remAfterMinutes / safeFps);
  const frames = remAfterMinutes % safeFps;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
    String(frames).padStart(2, '0'),
  ].join(':');
}

/**
 * Parses an SMPTE timecode string (`HH:MM:SS:FF` or `HH:MM:SS;FF`) into a frame index.
 * Returns `null` when malformed or when minutes >= 60, seconds >= 60, or frames >= fps.
 */
export function parseSmpteTimecode(input: string, fps: number = DEFAULT_FPS): number | null {
  const trimmed = input.trim();
  const match = SMPTE_RE.exec(trimmed);
  if (!match) return null;

  const safeFps = sanitizeFps(fps);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const frames = Number(match[4]);

  if (
    !Number.isSafeInteger(hours) ||
    minutes >= 60 ||
    seconds >= 60 ||
    frames >= safeFps
  ) {
    return null;
  }

  const totalFrames = (hours * 3600 + minutes * 60 + seconds) * safeFps + frames;
  return Number.isSafeInteger(totalFrames) ? totalFrames : null;
}

/**
 * Formats a non-negative frame index as a musical Bars:Beats:Ticks string (`BBB:B:TTT`, 960 PPQN).
 * Bars and beats are 1-indexed (`001:1:000` at frame 0); fps, bpm, and beatsPerBar are clamped safely.
 */
export function formatMusicalTimecode(
  frame: number,
  fps: number = DEFAULT_FPS,
  bpm: number = DEFAULT_BPM,
  beatsPerBar: number = DEFAULT_BEATS_PER_BAR
): string {
  const safeFps = sanitizeFps(fps);
  const safeBpm = sanitizeBpm(bpm);
  const safeBeatsPerBar = sanitizeBeatsPerBar(beatsPerBar);
  const safeFrame = sanitizeNonNegativeFrame(frame);

  const totalTicks = Math.round((safeFrame * safeBpm * TICKS_PER_BEAT) / (safeFps * 60));
  const ticksPerBar = safeBeatsPerBar * TICKS_PER_BEAT;
  const bar = Math.floor(totalTicks / ticksPerBar) + 1;
  const remAfterBars = totalTicks % ticksPerBar;
  const beat = Math.floor(remAfterBars / TICKS_PER_BEAT) + 1;
  const tick = remAfterBars % TICKS_PER_BEAT;

  return `${String(bar).padStart(3, '0')}:${beat}:${String(tick).padStart(3, '0')}`;
}

/**
 * Parses a musical Bars:Beats:Ticks string (`BBB:B:TTT`, 960 PPQN) into a rounded frame index.
 * Returns `null` when malformed or when bar < 1, beat is outside `[1..beatsPerBar]`, or ticks >= 960.
 */
export function parseMusicalTimecode(
  input: string,
  fps: number = DEFAULT_FPS,
  bpm: number = DEFAULT_BPM,
  beatsPerBar: number = DEFAULT_BEATS_PER_BAR
): number | null {
  const trimmed = input.trim();
  const match = MUSICAL_RE.exec(trimmed);
  if (!match) return null;

  const safeFps = sanitizeFps(fps);
  const safeBpm = sanitizeBpm(bpm);
  const safeBeatsPerBar = sanitizeBeatsPerBar(beatsPerBar);
  const bar = Number(match[1]);
  const beat = Number(match[2]);
  const tick = Number(match[3]);

  if (
    !Number.isSafeInteger(bar) ||
    bar < 1 ||
    beat < 1 ||
    beat > safeBeatsPerBar ||
    tick >= TICKS_PER_BEAT
  ) {
    return null;
  }

  const totalTicks = ((bar - 1) * safeBeatsPerBar + (beat - 1)) * TICKS_PER_BEAT + tick;
  const numerator = totalTicks * safeFps * 60;
  if (!Number.isSafeInteger(totalTicks) || !Number.isSafeInteger(numerator)) {
    return null;
  }

  return Math.round(numerator / (safeBpm * TICKS_PER_BEAT));
}

function formatTimecode(
  frame: number,
  format: TimecodeFormat,
  fps: number,
  bpm: number,
  beatsPerBar: number
): string {
  return format === 'musical'
    ? formatMusicalTimecode(frame, fps, bpm, beatsPerBar)
    : formatSmpteTimecode(frame, fps);
}

function parseTimecodeDraft(
  input: string,
  format: TimecodeFormat,
  fps: number,
  bpm: number,
  beatsPerBar: number
): number | null {
  const trimmed = input.trim();
  if (DIGITS_ONLY_RE.test(trimmed)) {
    const plainFrame = Number(trimmed);
    return Number.isSafeInteger(plainFrame) ? plainFrame : null;
  }
  return format === 'musical'
    ? parseMusicalTimecode(trimmed, fps, bpm, beatsPerBar)
    : parseSmpteTimecode(trimmed, fps);
}

function preventBlurOnMouseDown(e: ReactMouseEvent<HTMLButtonElement>): void {
  e.preventDefault();
}

function TimecodeScrubberInner({
  frame,
  defaultFrame = 0,
  maxFrame = DEFAULT_MAX_FRAME,
  fps = DEFAULT_FPS,
  format,
  defaultFormat = 'smpte',
  onFormatChange,
  bpm = DEFAULT_BPM,
  beatsPerBar = DEFAULT_BEATS_PER_BAR,
  onFrameChange,
  label = 'Timecode',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TimecodeScrubberProps) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const inputId = `${baseId}-input`;
  const errorId = `${baseId}-error`;
  const override = useComponentOverride('TimecodeScrubber');

  const inputRef = useRef<HTMLInputElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const scrubSessionRef = useRef<ScrubSession | null>(null);

  const safeMaxFrame = sanitizeMaxFrame(maxFrame);
  const safeFps = sanitizeFps(fps);
  const safeBpm = sanitizeBpm(bpm);
  const safeBeatsPerBar = sanitizeBeatsPerBar(beatsPerBar);
  const safeDefaultFrame = clampFrame(defaultFrame, safeMaxFrame, 0);

  const [rawFrame, setRawFrame] = useControllableState<number>({
    value: frame,
    defaultValue: safeDefaultFrame,
  });

  const [activeFormat, setActiveFormat] = useControllableState<TimecodeFormat>({
    value: format,
    defaultValue: defaultFormat,
    onChange: onFormatChange,
  });

  const [scrubbing, setScrubbing] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  const currentFrame = clampFrame(rawFrame, safeMaxFrame, safeDefaultFrame);
  const formatted = formatTimecode(currentFrame, activeFormat, safeFps, safeBpm, safeBeatsPerBar);
  const isScrubbing = scrubbing && !disabled;
  const editing = isEditing && !disabled;
  const progressPct = Math.round((currentFrame / safeMaxFrame) * 10000) / 100;

  const emitFrame = useCallback(
    (nextFrame: number) => {
      setRawFrame(nextFrame);
      onFrameChange?.(
        nextFrame,
        formatTimecode(nextFrame, activeFormat, safeFps, safeBpm, safeBeatsPerBar)
      );
    },
    [setRawFrame, onFrameChange, activeFormat, safeFps, safeBpm, safeBeatsPerBar]
  );

  const commitFrame = useCallback(
    (nextRaw: number) => {
      const next = clampFrame(nextRaw, safeMaxFrame, currentFrame);
      if (next !== currentFrame) {
        emitFrame(next);
      }
    },
    [safeMaxFrame, currentFrame, emitFrame]
  );

  const latestRef = useRef({
    emitFrame,
    safeMaxFrame,
  });
  latestRef.current = { emitFrame, safeMaxFrame };

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      cleanupDragRef.current?.();
      setScrubbing(false);
      setIsEditing(false);
      setEditError(null);
    }
  }, [disabled]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const enterEditMode = () => {
    if (disabled) return;
    cleanupDragRef.current?.();
    setScrubbing(false);
    setDraft(formatted);
    setEditError(null);
    setIsEditing(true);
  };

  const cancelEditMode = () => {
    setEditError(null);
    setDraft('');
    setIsEditing(false);
  };

  const commitDraft = () => {
    const parsed = parseTimecodeDraft(draft, activeFormat, safeFps, safeBpm, safeBeatsPerBar);
    if (parsed === null) {
      setEditError(
        activeFormat === 'musical'
          ? 'Invalid musical timecode. Enter BBB:B:TTT or a frame integer.'
          : 'Invalid SMPTE timecode. Enter HH:MM:SS:FF or a frame integer.'
      );
      return;
    }
    const nextFrame = clampFrame(parsed, safeMaxFrame, currentFrame);
    setEditError(null);
    setDraft('');
    setIsEditing(false);
    if (nextFrame !== currentFrame) {
      emitFrame(nextFrame);
    }
  };

  const handleFormatSelect = (nextFormat: TimecodeFormat) => {
    if (disabled || nextFormat === activeFormat) return;
    setEditError(null);
    setDraft('');
    setIsEditing(false);
    setActiveFormat(nextFormat);
  };

  const handleScrubPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.focus();
    cleanupDragRef.current?.();

    const session: ScrubSession = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      residualPx: 0,
      workingFrame: currentFrame,
      lastEmitted: currentFrame,
    };
    scrubSessionRef.current = session;
    setScrubbing(true);

    const handleWindowPointerMove = (moveEvent: PointerEvent) => {
      const activeSession = scrubSessionRef.current;
      if (!activeSession || moveEvent.pointerId !== activeSession.pointerId) return;

      const dx = moveEvent.clientX - activeSession.lastX;
      activeSession.lastX = moveEvent.clientX;

      const { pxPerStep, framesPerStep } = getScrubConfig(moveEvent.shiftKey, moveEvent.altKey);
      const totalPx = activeSession.residualPx + dx;
      const wholeSteps = Math.trunc(totalPx / pxPerStep);

      if (wholeSteps === 0) {
        activeSession.residualPx = totalPx;
        return;
      }

      activeSession.residualPx = totalPx - wholeSteps * pxPerStep;
      const { safeMaxFrame: liveMaxFrame, emitFrame: liveEmit } = latestRef.current;
      const nextFrame = clampFrame(
        activeSession.workingFrame + wholeSteps * framesPerStep,
        liveMaxFrame,
        activeSession.workingFrame
      );
      activeSession.workingFrame = nextFrame;

      if (nextFrame !== activeSession.lastEmitted) {
        activeSession.lastEmitted = nextFrame;
        liveEmit(nextFrame);
      }
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
      scrubSessionRef.current = null;
      cleanupDragRef.current = null;
    };

    const handleWindowPointerEnd = (endEvent: PointerEvent) => {
      const activeSession = scrubSessionRef.current;
      if (!activeSession || endEvent.pointerId !== activeSession.pointerId) return;
      cleanup();
      setScrubbing(false);
    };

    cleanupDragRef.current = cleanup;
    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);
  };

  const handleReadoutKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || e.nativeEvent.isComposing) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      enterEditMode();
      return;
    }

    const stepFrames = e.altKey ? COARSE_FRAME_STEP : 1;
    let targetFrame: number | null = null;

    if (e.key === 'ArrowRight') {
      targetFrame = currentFrame + stepFrames;
    } else if (e.key === 'ArrowLeft') {
      targetFrame = currentFrame - stepFrames;
    } else if (e.key === 'PageUp') {
      targetFrame = currentFrame + safeFps;
    } else if (e.key === 'PageDown') {
      targetFrame = currentFrame - safeFps;
    } else if (e.key === 'Home') {
      targetFrame = 0;
    } else if (e.key === 'End') {
      targetFrame = safeMaxFrame;
    }

    if (targetFrame === null) return;
    e.preventDefault();
    commitFrame(targetFrame);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
    if (editError) {
      setEditError(null);
    }
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditMode();
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('timecode-scrubber', {
      format: activeFormat,
      disabled,
      scrubbing: isScrubbing ? 'true' : 'false',
      editing: editing ? 'true' : 'false',
      invalid: Boolean(editError),
    }),
    baseClassName:
      'prism-slab p-4 sm:p-5 w-full max-w-full flex flex-col gap-3.5 transition-shadow',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: isScrubbing
      ? { outline: '2px solid var(--prism-focus-ring)', outlineOffset: '1px' }
      : undefined,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('timecode-scrubber', 'header');
  const wellClass = stableClassName('timecode-scrubber', 'well');
  const readoutClass = stableClassName('timecode-scrubber', 'readout');
  const badgeClass = stableClassName('timecode-scrubber', 'badge');

  return (
    <div ref={ref} role="group" aria-labelledby={labelId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2 min-w-0')}>
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            {activeFormat === 'musical' ? (
              <Music className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Film className="w-3.5 h-3.5 shrink-0" />
            )}
          </span>
          <span
            id={labelId}
            data-testid="timecode-label"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <div
            role="group"
            aria-label="Timecode format"
            data-testid="timecode-format-toggle"
            className="prism-crystal p-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0"
          >
            <button
              type="button"
              disabled={disabled}
              aria-pressed={activeFormat === 'smpte'}
              data-testid="timecode-format-smpte"
              onMouseDown={preventBlurOnMouseDown}
              onClick={() => handleFormatSelect('smpte')}
              className={cx(
                'prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                activeFormat === 'smpte' ? 'prism-btn-primary' : 'opacity-75 enabled:hover:opacity-100'
              )}
              style={
                activeFormat === 'smpte'
                  ? undefined
                  : { color: 'var(--prism-text-secondary)' }
              }
            >
              <span className="relative z-10">SMPTE</span>
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={activeFormat === 'musical'}
              data-testid="timecode-format-musical"
              onMouseDown={preventBlurOnMouseDown}
              onClick={() => handleFormatSelect('musical')}
              className={cx(
                'prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                activeFormat === 'musical'
                  ? 'prism-btn-primary'
                  : 'opacity-75 enabled:hover:opacity-100'
              )}
              style={
                activeFormat === 'musical'
                  ? undefined
                  : { color: 'var(--prism-text-secondary)' }
              }
            >
              <span className="relative z-10">BBT</span>
            </button>
          </div>

          <span
            data-testid="timecode-rate-badge"
            className={cx(
              badgeClass,
              'prism-crystal px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0'
            )}
            style={STYLE_TEXT_SECONDARY}
          >
            {activeFormat === 'musical' ? `${safeBpm} BPM` : `${safeFps} fps`}
          </span>
        </div>
      </div>

      <div
        data-testid="timecode-well"
        className={cx(
          wellClass,
          'prism-well rounded-2xl px-3.5 py-3 flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full transition-opacity',
          disabled ? 'opacity-55' : ''
        )}
        style={
          editError
            ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-error-main)' }
            : undefined
        }
      >
        {editing ? (
          <>
            <div className="flex-1 min-w-0 flex items-center">
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                aria-label={`Edit ${label}`}
                aria-invalid={Boolean(editError)}
                aria-describedby={editError ? errorId : undefined}
                placeholder={activeFormat === 'musical' ? 'BBB:B:TTT' : 'HH:MM:SS:FF'}
                value={draft}
                disabled={disabled}
                data-testid="timecode-input"
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onBlur={commitDraft}
                className="prism-focus-ring w-full min-w-0 bg-transparent font-mono text-2xl sm:text-3xl font-bold tracking-wider tabular-nums rounded-lg px-2 py-1 focus:outline-none disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={disabled}
                aria-label="Apply timecode"
                data-testid="timecode-apply-button"
                onMouseDown={preventBlurOnMouseDown}
                onClick={commitDraft}
                className="prism-btn-primary prism-focus-ring h-8 px-3 inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
              >
                <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
                <span className="relative z-10">Set</span>
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label="Cancel timecode edit"
                data-testid="timecode-cancel-button"
                onMouseDown={preventBlurOnMouseDown}
                onClick={cancelEditMode}
                className="prism-btn-secondary prism-focus-ring h-8 px-2.5 inline-flex items-center justify-center text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
              >
                <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={label}
              aria-valuenow={currentFrame}
              aria-valuemin={0}
              aria-valuemax={safeMaxFrame}
              aria-valuetext={formatted}
              aria-disabled={disabled || undefined}
              data-testid="timecode-readout"
              data-scrubbing={isScrubbing ? 'true' : 'false'}
              onPointerDown={handleScrubPointerDown}
              onDoubleClick={enterEditMode}
              onKeyDown={handleReadoutKeyDown}
              style={{
                touchAction: 'none',
                color: isScrubbing
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-primary)',
              }}
              className={cx(
                readoutClass,
                'prism-focus-ring flex-1 min-w-0 flex items-center gap-2.5 rounded-xl px-2 py-1 select-none touch-none transition-colors',
                disabled ? 'cursor-not-allowed' : 'cursor-ew-resize'
              )}
            >
              <MoveHorizontal
                aria-hidden="true"
                className="w-4 h-4 shrink-0"
                style={{
                  color: isScrubbing
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-text-secondary)',
                }}
              />
              <span className="font-mono text-2xl sm:text-3xl font-bold tracking-wider tabular-nums truncate">
                {formatted}
              </span>
            </div>

            <button
              type="button"
              disabled={disabled}
              aria-label={`Edit ${label}`}
              data-testid="timecode-edit-button"
              onClick={enterEditMode}
              className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
            >
              <Pencil aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Edit</span>
            </button>
          </>
        )}
      </div>

      {editError ? (
        <p
          id={errorId}
          role="alert"
          data-testid="timecode-error"
          className="px-1 text-xs font-medium"
          style={STYLE_ERROR_MAIN}
        >
          {editError}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5 min-w-0">
        <div
          aria-hidden="true"
          className="prism-well h-1.5 w-full rounded-full overflow-hidden"
        >
          <div
            data-testid="timecode-progress-bar"
            className="h-full rounded-full transition-[width] duration-75"
            style={{
              width: `${progressPct}%`,
              backgroundColor: 'var(--prism-primary-main)',
            }}
          />
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums"
          style={STYLE_TEXT_SECONDARY}
        >
          <span data-testid="timecode-frame-meta">
            Frame {currentFrame} / {safeMaxFrame}
            {activeFormat === 'musical' ? ` · ${safeBeatsPerBar}/4` : ''}
          </span>
          <span className="truncate">Drag to scrub · Shift fine · Alt ×10</span>
        </div>
      </div>
    </div>
  );
}

export const TimecodeScrubber = memo(TimecodeScrubberInner);
TimecodeScrubber.displayName = 'TimecodeScrubber';
