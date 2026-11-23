'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_PRIMARY, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type RulerMarkerTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface RulerMarker {
  /** Stable unique identifier for the cue marker. */
  id: string;
  /** Cue timestamp in seconds (clamped to 0..durationSec; non-finite values are filtered). */
  timeSec: number;
  /** Human-readable cue flag label rendered safely as plain text. */
  label: string;
  /** Optional semantic --prism-* accent tone (defaults to 'secondary'). */
  tone?: RulerMarkerTone;
}

export interface PlayheadScrubRulerProps extends BaseProps<HTMLDivElement> {
  /** Total timeline duration in seconds, clamped to >= 1 (defaults to 60). */
  durationSec?: number;
  /** Controlled playhead timestamp in seconds. */
  timeSec?: number;
  /** Uncontrolled initial playhead timestamp in seconds (defaults to 0). */
  defaultTimeSec?: number;
  /** Frame rate used for frame snapping and MM:SS:FF timecode formatting, clamped to 1..120 (defaults to 30). */
  fps?: number;
  /** Snap scrubbing and arrow stepping to exact 1/fps frame boundaries (defaults to true). */
  snapToFrame?: boolean;
  /** Optional clickable cue markers pinned along the ruler. */
  markers?: ReadonlyArray<RulerMarker>;
  /** Minimum height in pixels of the track drop-line stage beneath the ruler, clamped to 48..280 (defaults to 96). */
  trackStageHeight?: number;
  /** Callback fired whenever the playhead position changes via scrub, keyboard, or marker jump. */
  onTimeChange?: (timeSec: number) => void;
  /** Callback fired when a user activates a pinned cue marker flag. */
  onSelectMarker?: (marker: RulerMarker) => void;
  /** Optional track lane content rendered beneath the continuous vertical playhead hairline. */
  children?: ReactNode;
  /** Disables pointer scrubbing, keyboard stepping, and cue marker jumps (defaults to false). */
  disabled?: boolean;
}

interface RulerTick {
  key: string;
  timeSec: number;
  percent: number;
  x: number;
  major: boolean;
  label: string;
  align: 'start' | 'center' | 'end';
}

interface MarkerToneTokens {
  accent: string;
  contrast: string;
}

interface ResolvedMarker {
  marker: RulerMarker;
  clampedTimeSec: number;
  percent: number;
  tone: RulerMarkerTone;
  tokens: MarkerToneTokens;
  align: 'start' | 'center' | 'end';
}

const DEFAULT_DURATION_SEC = 60;
const MIN_DURATION_SEC = 1;
const MAX_DURATION_SEC = 360000;

const DEFAULT_FPS = 30;
const MIN_FPS = 1;
const MAX_FPS = 120;

const DEFAULT_STAGE_HEIGHT = 96;
const MIN_STAGE_HEIGHT = 48;
const MAX_STAGE_HEIGHT = 280;

const RULER_VIEW_WIDTH = 1000;
const RULER_VIEW_HEIGHT = 28;
const MINOR_SUBDIVISIONS = 5;
const PAGE_STEP_SEC = 5;
const FREE_ARROW_STEP_SEC = 0.1;
const SHIFT_ARROW_STEP_SEC = 1;

const MAJOR_INTERVAL_CANDIDATES: ReadonlyArray<number> = [
  0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200,
];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function getMarkerToneTokens(tone: RulerMarkerTone): MarkerToneTokens {
  switch (tone) {
    case 'primary':
      return {
        accent: 'var(--prism-primary-main)',
        contrast: 'var(--prism-primary-contrast)',
      };
    case 'secondary':
      return {
        accent: 'var(--prism-secondary-main)',
        contrast: 'var(--prism-secondary-contrast)',
      };
    case 'emerald':
      return {
        accent: 'var(--prism-success-main)',
        contrast: 'var(--prism-success-contrast)',
      };
    case 'amber':
      return {
        accent: 'var(--prism-warning-main)',
        contrast: 'var(--prism-warning-contrast)',
      };
    case 'rose':
      return {
        accent: 'var(--prism-error-main)',
        contrast: 'var(--prism-error-contrast)',
      };
  }
}

function quantizeTime(
  rawSeconds: number,
  durationSec: number,
  fps: number,
  snapToFrame: boolean
): number {
  const clamped = clampNumber(rawSeconds, 0, durationSec, 0);
  if (snapToFrame) {
    const maxFrames = Math.floor(durationSec * fps + 1e-9);
    const frame = Math.max(0, Math.min(maxFrames, Math.round(clamped * fps)));
    const snapped = Math.min(durationSec, frame / fps);
    return normalizeZero(Number(snapped.toFixed(6)));
  }
  return normalizeZero(Math.min(durationSec, Number(clamped.toFixed(4))));
}

function formatTimecode(timeSec: number, fps: number): string {
  const totalFrames = Math.max(0, Math.round(timeSec * fps));
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

function formatTickLabel(timeSec: number): string {
  const whole = Math.floor(timeSec + 1e-9);
  const frac = timeSec - whole;
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  const base = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  if (frac > 0.01) {
    const sub = String(Math.round(frac * 100))
      .padStart(2, '0')
      .replace(/0+$/, '');
    return `${base}.${sub}`;
  }
  return base;
}

function selectMajorStep(durationSec: number): number {
  for (const candidate of MAJOR_INTERVAL_CANDIDATES) {
    if (durationSec / candidate <= 8) {
      return candidate;
    }
  }
  return Math.ceil(durationSec / 6);
}

function computeRulerTicks(durationSec: number): RulerTick[] {
  const majorStep = selectMajorStep(durationSec);
  const minorStep = majorStep / MINOR_SUBDIVISIONS;
  const totalSteps = Math.floor(durationSec / minorStep + 1e-6);
  const ticks: RulerTick[] = [];

  for (let step = 0; step <= totalSteps; step += 1) {
    const rawTime = step * minorStep;
    const timeSec = Math.min(durationSec, Number(rawTime.toFixed(6)));
    const major = step % MINOR_SUBDIVISIONS === 0;
    const ratio = timeSec / durationSec;
    const percent = Number((ratio * 100).toFixed(4));
    const x = Number((ratio * RULER_VIEW_WIDTH).toFixed(2));
    const align: 'start' | 'center' | 'end' =
      ratio <= 0.02 ? 'start' : ratio >= 0.98 ? 'end' : 'center';

    ticks.push({
      key: `${major ? 'M' : 'm'}-${timeSec}`,
      timeSec,
      percent,
      x,
      major,
      label: major ? formatTickLabel(timeSec) : '',
      align,
    });
  }

  return ticks;
}

function sanitizeMarkers(
  markers: ReadonlyArray<RulerMarker> | undefined,
  durationSec: number
): ResolvedMarker[] {
  if (!markers || markers.length === 0) {
    return [];
  }
  const seenIds = new Set<string>();
  const resolved: ResolvedMarker[] = [];

  for (const marker of markers) {
    if (!marker || !marker.id || !Number.isFinite(marker.timeSec) || seenIds.has(marker.id)) {
      continue;
    }
    seenIds.add(marker.id);
    const clampedTimeSec = normalizeZero(clampNumber(marker.timeSec, 0, durationSec, 0));
    const ratio = clampedTimeSec / durationSec;
    const percent = Number((ratio * 100).toFixed(4));
    const tone: RulerMarkerTone = marker.tone ?? 'secondary';
    const align: 'start' | 'center' | 'end' =
      ratio <= 0.06 ? 'start' : ratio >= 0.94 ? 'end' : 'center';

    resolved.push({
      marker,
      clampedTimeSec,
      percent,
      tone,
      tokens: getMarkerToneTokens(tone),
      align,
    });
  }

  return resolved;
}

function PlayheadScrubRulerInner({
  durationSec = DEFAULT_DURATION_SEC,
  timeSec,
  defaultTimeSec = 0,
  fps = DEFAULT_FPS,
  snapToFrame = true,
  markers,
  trackStageHeight = DEFAULT_STAGE_HEIGHT,
  onTimeChange,
  onSelectMarker,
  children,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PlayheadScrubRulerProps) {
  const override = useComponentOverride('PlayheadScrubRuler');

  const trackRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const safeDuration = clampNumber(
    durationSec,
    MIN_DURATION_SEC,
    MAX_DURATION_SEC,
    DEFAULT_DURATION_SEC
  );
  const safeFps = Math.round(clampNumber(fps, MIN_FPS, MAX_FPS, DEFAULT_FPS));
  const safeStageHeight = Math.round(
    clampNumber(trackStageHeight, MIN_STAGE_HEIGHT, MAX_STAGE_HEIGHT, DEFAULT_STAGE_HEIGHT)
  );

  const [rawTime, setRawTime] = useControllableState<number>({
    value: timeSec,
    defaultValue: defaultTimeSec,
  });

  const currentTime = normalizeZero(clampNumber(rawTime, 0, safeDuration, 0));
  const formattedTime = formatTimecode(currentTime, safeFps);
  const formattedDuration = formatTimecode(safeDuration, safeFps);
  const playheadPercent = Number(((currentTime / safeDuration) * 100).toFixed(4));

  const ticks = useMemo(() => computeRulerTicks(safeDuration), [safeDuration]);
  const majorTicks = useMemo(() => ticks.filter((tick) => tick.major), [ticks]);
  const resolvedMarkers = useMemo(
    () => sanitizeMarkers(markers, safeDuration),
    [markers, safeDuration]
  );

  useEffect(() => {
    if (disabled) {
      cleanupDragRef.current?.();
      setIsDragging(false);
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const commitTime = useCallback(
    (candidate: number) => {
      const next = normalizeZero(clampNumber(candidate, 0, safeDuration, 0));
      if (next === currentTime) return;
      setRawTime(next);
      onTimeChange?.(next);
    },
    [safeDuration, currentTime, setRawTime, onTimeChange]
  );

  const getTrackRect = useCallback((): DOMRect | null => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || !Number.isFinite(rect.width) || rect.width <= 0) {
      return null;
    }
    return rect;
  }, []);

  const scrubFromClientX = useCallback(
    (clientX: number) => {
      const rect = getTrackRect();
      if (!rect) return;
      const ratio = clampNumber((clientX - rect.left) / rect.width, 0, 1, 0);
      const rawSeconds = ratio * safeDuration;
      commitTime(quantizeTime(rawSeconds, safeDuration, safeFps, snapToFrame));
    },
    [getTrackRect, safeDuration, safeFps, snapToFrame, commitTime]
  );

  const latestScrubRef = useRef(scrubFromClientX);
  latestScrubRef.current = scrubFromClientX;

  const handleRulerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0) return;
      event.preventDefault();
      trackRef.current?.focus({ preventScroll: true });
      if (!getTrackRect()) return;

      latestScrubRef.current(event.clientX);

      cleanupDragRef.current?.();
      setIsDragging(true);

      const handleMove = (moveEvent: PointerEvent) => {
        latestScrubRef.current(moveEvent.clientX);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleEnd);
        window.removeEventListener('pointercancel', handleEnd);
        cleanupDragRef.current = null;
      };

      const handleEnd = () => {
        cleanup();
        setIsDragging(false);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handleMove, { passive: true });
      window.addEventListener('pointerup', handleEnd);
      window.addEventListener('pointercancel', handleEnd);
    },
    [disabled, getTrackRect]
  );

  const handleRulerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (
        disabled ||
        event.nativeEvent.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const stepByArrow = (direction: -1 | 1) => {
        event.preventDefault();
        const target = event.shiftKey
          ? currentTime + direction * SHIFT_ARROW_STEP_SEC
          : snapToFrame
            ? (Math.round(currentTime * safeFps) + direction) / safeFps
            : currentTime + direction * FREE_ARROW_STEP_SEC;
        commitTime(quantizeTime(target, safeDuration, safeFps, snapToFrame));
      };

      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        stepByArrow(-1);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        stepByArrow(1);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        commitTime(quantizeTime(currentTime + PAGE_STEP_SEC, safeDuration, safeFps, snapToFrame));
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        commitTime(quantizeTime(currentTime - PAGE_STEP_SEC, safeDuration, safeFps, snapToFrame));
      } else if (event.key === 'Home') {
        event.preventDefault();
        commitTime(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        commitTime(safeDuration);
      }
    },
    [disabled, currentTime, safeFps, safeDuration, snapToFrame, commitTime]
  );

  const handleMarkerClick = useCallback(
    (item: ResolvedMarker) => {
      commitTime(item.clampedTimeSec);
      onSelectMarker?.(item.marker);
    },
    [commitTime, onSelectMarker]
  );

  const merged = mergeProps({
    themeTarget: themeProps('playhead-scrub-ruler', {
      disabled,
      dragging: isDragging,
      snap: snapToFrame,
    }),
    baseClassName: 'prism-slab p-3.5 sm:p-4 space-y-3 select-none w-full max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('playhead-scrub-ruler', 'header');
  const rulerClass = stableClassName('playhead-scrub-ruler', 'ruler');
  const playheadClass = stableClassName('playhead-scrub-ruler', 'playhead');
  const markersClass = stableClassName('playhead-scrub-ruler', 'markers');
  const stageClass = stableClassName('playhead-scrub-ruler', 'stage');

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Playhead scrub ruler"
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div
            role="status"
            aria-live="polite"
            data-testid="playhead-timecode"
            className="prism-well rounded-full px-3 py-1 inline-flex items-center gap-2 font-mono text-xs sm:text-sm font-semibold tabular-nums whitespace-nowrap"
            style={STYLE_TEXT_PRIMARY}
          >
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={STYLE_BG_PRIMARY}
            />
            <span>{formattedTime}</span>
          </div>

          <span
            data-testid="playhead-snap-badge"
            data-snap={snapToFrame ? 'true' : 'false'}
            className={cx(
              snapToFrame ? 'prism-emerald font-semibold' : 'prism-crystal font-medium opacity-80',
              'rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wider uppercase whitespace-nowrap'
            )}
            style={snapToFrame ? undefined : { color: 'var(--prism-text-secondary)' }}
          >
            {snapToFrame ? `Snap · ${safeFps}fps` : `Free · ${safeFps}fps`}
          </span>
        </div>

        <div
          data-testid="playhead-duration"
          className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums whitespace-nowrap"
          style={STYLE_TEXT_SECONDARY}
        >
          <span className="text-[10px] uppercase tracking-wider opacity-75">Dur</span>
          <span style={STYLE_TEXT_PRIMARY}>{formattedDuration}</span>
        </div>
      </div>

      <div className="prism-well rounded-2xl px-3 pt-2 pb-2.5 overflow-x-clip">
        <div className="relative w-full">
          <div
            ref={trackRef}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label="Timeline playhead"
            aria-valuemin={0}
            aria-valuemax={safeDuration}
            aria-valuenow={currentTime}
            aria-valuetext={formattedTime}
            aria-disabled={disabled || undefined}
            data-testid="playhead-ruler-track"
            data-dragging={isDragging ? 'true' : undefined}
            onPointerDown={handleRulerPointerDown}
            onKeyDown={handleRulerKeyDown}
            className={cx(
              rulerClass,
              'prism-focus-ring relative h-12 w-full rounded-t-xl touch-none',
              disabled
                ? 'cursor-not-allowed opacity-60'
                : isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-pointer'
            )}
            style={{
              touchAction: 'none',
              borderBottom: '1px solid var(--prism-divider)',
            }}
          >
            <div
              aria-hidden="true"
              data-testid="playhead-elapsed-bar"
              className="pointer-events-none absolute inset-y-0 left-0 rounded-tl-xl"
              style={{
                width: `${playheadPercent}%`,
                backgroundColor: 'var(--prism-primary-main)',
                opacity: 0.12,
              }}
            />

            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0.5 h-4">
              {majorTicks.map((tick) => (
                <span
                  key={tick.key}
                  data-testid="playhead-major-label"
                  className="absolute top-0 font-mono text-[10px] leading-none tabular-nums whitespace-nowrap"
                  style={{
                    left: `${tick.percent}%`,
                    transform:
                      tick.align === 'start'
                        ? 'translateX(0)'
                        : tick.align === 'end'
                          ? 'translateX(-100%)'
                          : 'translateX(-50%)',
                    color: 'var(--prism-text-secondary)',
                  }}
                >
                  {tick.label}
                </span>
              ))}
            </div>

            <svg
              aria-hidden="true"
              data-testid="playhead-ruler-ticks"
              viewBox={`0 0 ${RULER_VIEW_WIDTH} ${RULER_VIEW_HEIGHT}`}
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-7 block overflow-visible"
            >
              {ticks.map((tick) => (
                <line
                  key={tick.key}
                  data-tick-kind={tick.major ? 'major' : 'minor'}
                  x1={tick.x}
                  y1={tick.major ? 4 : 15}
                  x2={tick.x}
                  y2={RULER_VIEW_HEIGHT}
                  stroke={tick.major ? 'var(--prism-text-secondary)' : 'var(--prism-divider)'}
                  strokeOpacity={tick.major ? 0.65 : 1}
                  strokeWidth={tick.major ? 1.5 : 1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            <div
              aria-hidden="true"
              data-testid="playhead-cap"
              className={cx(
                playheadClass,
                'absolute top-0 z-20',
                disabled ? 'cursor-not-allowed' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
              )}
              style={{
                left: `${playheadPercent}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <svg
                width="16"
                height="20"
                viewBox="0 0 16 20"
                className="block overflow-visible"
                aria-hidden="true"
              >
                <path
                  d="M2 1.5 H14 A1.5 1.5 0 0 1 15.5 3 V11.5 L8 19 L0.5 11.5 V3 A1.5 1.5 0 0 1 2 1.5 Z"
                  fill="var(--prism-primary-main)"
                  stroke="var(--prism-primary-contrast)"
                  strokeWidth="1.2"
                  strokeOpacity="0.85"
                />
                <line
                  x1="4"
                  y1="4.5"
                  x2="12"
                  y2="4.5"
                  stroke="var(--prism-primary-contrast)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeOpacity="0.7"
                />
              </svg>
            </div>
          </div>

          {resolvedMarkers.length > 0 ? (
            <div
              role="group"
              aria-label="Timeline cue markers"
              data-testid="playhead-markers-rail"
              className={cx(markersClass, 'relative h-7 w-full')}
              style={{ borderBottom: '1px solid var(--prism-divider)' }}
            >
              {resolvedMarkers.map((item) => {
                const isAtMarker =
                  Math.abs(currentTime - item.clampedTimeSec) <=
                  (snapToFrame ? 0.5 / safeFps : 0.01);
                const markerTimecode = formatTimecode(item.clampedTimeSec, safeFps);
                return (
                  <button
                    key={item.marker.id}
                    type="button"
                    disabled={disabled}
                    data-testid={`playhead-marker-${item.marker.id}`}
                    data-tone={item.tone}
                    data-active={isAtMarker ? 'true' : undefined}
                    aria-label={`Jump to marker ${item.marker.label} at ${markerTimecode}`}
                    onClick={() => handleMarkerClick(item)}
                    className="prism-crystal prism-focus-ring absolute z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap max-w-[140px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                    style={{
                      left: `${item.percent}%`,
                      top: '50%',
                      transform:
                        item.align === 'start'
                          ? 'translate(0, -50%)'
                          : item.align === 'end'
                            ? 'translate(-100%, -50%)'
                            : 'translate(-50%, -50%)',
                      color: 'var(--prism-text-primary)',
                      boxShadow: isAtMarker
                        ? `inset 0 0 0 1.5px ${item.tokens.accent}`
                        : undefined,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.tokens.accent }}
                    />
                    <span className="truncate">{item.marker.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div
            data-testid="playhead-track-stage"
            className={cx(stageClass, 'relative w-full pt-2')}
            style={{ minHeight: `${safeStageHeight}px` }}
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {majorTicks.map((tick) => (
                <span
                  key={tick.key}
                  className="absolute inset-y-0 w-px"
                  style={{
                    left: `${tick.percent}%`,
                    backgroundColor: 'var(--prism-divider)',
                  }}
                />
              ))}
              {resolvedMarkers.map((item) => (
                <span
                  key={item.marker.id}
                  data-testid={`playhead-marker-line-${item.marker.id}`}
                  className="absolute inset-y-0 w-px opacity-40"
                  style={{
                    left: `${item.percent}%`,
                    backgroundColor: item.tokens.accent,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 w-full h-full">{children}</div>
          </div>

          <div
            aria-hidden="true"
            data-testid="playhead-needle"
            className="pointer-events-none absolute top-4 bottom-0 z-20 w-0.5"
            style={{
              left: `${playheadPercent}%`,
              transform: 'translateX(-50%)',
              backgroundColor: 'var(--prism-primary-main)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export const PlayheadScrubRuler = memo(PlayheadScrubRulerInner);
PlayheadScrubRuler.displayName = 'PlayheadScrubRuler';
