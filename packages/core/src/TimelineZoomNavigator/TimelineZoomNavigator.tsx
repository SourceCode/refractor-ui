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
import { Activity, Minus, Plus } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_PRIMARY, STYLE_SECONDARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface TimelineViewportWindow {
  /** Start of visible viewport as a percentage of total timeline duration (`0..100`). */
  startPct: number;
  /** End of visible viewport as a percentage of total timeline duration (`0..100`, with `endPct - startPct >= minWindowPct`). */
  endPct: number;
}

export interface TimelineZoomNavigatorProps extends BaseProps<HTMLDivElement> {
  /** Total timeline duration in seconds, clamped `>= 1` (defaults to `120`). */
  totalDurationSec?: number;
  /** Controlled viewport window `{ startPct, endPct }` (`0..100`). */
  windowRange?: TimelineViewportWindow;
  /** Uncontrolled initial viewport window (defaults to `{ startPct: 10, endPct: 60 }`). */
  defaultWindowRange?: TimelineViewportWindow;
  /** Minimum viewport span percentage, clamped `2..50` (defaults to `5`, enabling up to `50×` zoom at `2`). */
  minWindowPct?: number;
  /** Optional vertical playhead indicator position inside the overview bar (`0..100`). */
  playheadPct?: number;
  /** Optional miniature timeline activity or waveform amplitudes (`0..1`) rendered behind the viewport thumb. */
  peaks?: ReadonlyArray<number>;
  /** Callback fired whenever zoom buttons, edge dragging, viewport panning, track click, or keyboard navigation updates the window. */
  onWindowChange?: (windowRange: TimelineViewportWindow, zoomFactor: number) => void;
  /** Visible navigator title and accessible region heading (defaults to `'Timeline Navigator'`). */
  label?: string;
  /** Disables all zoom buttons, pointer dragging, and keyboard interactions (defaults to `false`). */
  disabled?: boolean;
}

type DragMode = 'start' | 'end' | 'pan' | null;

interface ActivityBar {
  id: string;
  barIndex: number;
  amplitude: number;
  centerPct: number;
}

const DEFAULT_TOTAL_DURATION_SEC = 120;
const MIN_TOTAL_DURATION_SEC = 1;
const DEFAULT_MIN_WINDOW_PCT = 5;
const MIN_WINDOW_PCT_LOWER = 2;
const MIN_WINDOW_PCT_UPPER = 50;
const DEFAULT_WINDOW_RANGE: TimelineViewportWindow = { startPct: 10, endPct: 60 };
const FIT_ALL_WINDOW: TimelineViewportWindow = { startPct: 0, endPct: 100 };

const ZOOM_STEP_RATIO = 1.5;
const BASE_KEY_STEP_PCT = 1;
const COARSE_KEY_STEP_PCT = 5;
const PAGE_KEY_STEP_PCT = 10;
const MIN_PEAK_AMPLITUDE = 0.14;
const MAX_PEAK_AMPLITUDE = 1;

const DEFAULT_ACTIVITY_PEAKS: readonly number[] = [
  0.24, 0.42, 0.65, 0.52, 0.78, 0.88, 0.62, 0.46,
  0.72, 0.91, 0.58, 0.34, 0.49, 0.81, 0.74, 0.55,
  0.38, 0.64, 0.86, 0.94, 0.69, 0.44, 0.57, 0.79,
  0.66, 0.41, 0.32, 0.59, 0.83, 0.71, 0.48, 0.28,
];

function roundPct(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function sanitizeTotalDuration(raw: number): number {
  if (!Number.isFinite(raw)) {
    return DEFAULT_TOTAL_DURATION_SEC;
  }
  return raw < MIN_TOTAL_DURATION_SEC ? MIN_TOTAL_DURATION_SEC : raw;
}

function sanitizeMinWindowPct(raw: number): number {
  return roundPct(
    clampNumber(raw, MIN_WINDOW_PCT_LOWER, MIN_WINDOW_PCT_UPPER, DEFAULT_MIN_WINDOW_PCT)
  );
}

function normalizeWindowRange(
  candidate: TimelineViewportWindow,
  minWindowPct: number
): TimelineViewportWindow {
  const rawStart = clampNumber(candidate.startPct, 0, 100, DEFAULT_WINDOW_RANGE.startPct);
  const rawEnd = clampNumber(candidate.endPct, 0, 100, DEFAULT_WINDOW_RANGE.endPct);
  let start = Math.min(rawStart, rawEnd);
  let end = Math.max(rawStart, rawEnd);

  if (end - start < minWindowPct) {
    end = Math.min(100, start + minWindowPct);
    if (end - start < minWindowPct) {
      start = Math.max(0, end - minWindowPct);
    }
  }

  return { startPct: roundPct(start), endPct: roundPct(end) };
}

function computeZoomFactor(windowRange: TimelineViewportWindow): number {
  const span = Math.max(MIN_WINDOW_PCT_LOWER, windowRange.endPct - windowRange.startPct);
  return Math.round((100 / span) * 100) / 100;
}

function formatTimelineTime(rawSeconds: number): string {
  const totalTenths = Math.round(Math.max(0, rawSeconds) * 10);
  const mins = Math.floor(totalTenths / 600);
  const remTenths = totalTenths % 600;
  const secs = Math.floor(remTenths / 10);
  const tenths = remTenths % 10;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

function zoomAroundCenter(
  current: TimelineViewportWindow,
  targetSpan: number,
  minWindowPct: number
): TimelineViewportWindow {
  const clampedSpan = clampNumber(targetSpan, minWindowPct, 100, minWindowPct);
  const center = (current.startPct + current.endPct) / 2;
  let nextStart = center - clampedSpan / 2;
  let nextEnd = center + clampedSpan / 2;

  if (nextStart < 0) {
    nextEnd = Math.min(100, nextEnd - nextStart);
    nextStart = 0;
  }
  if (nextEnd > 100) {
    nextStart = Math.max(0, nextStart - (nextEnd - 100));
    nextEnd = 100;
  }

  return normalizeWindowRange({ startPct: nextStart, endPct: nextEnd }, minWindowPct);
}

function TimelineZoomNavigatorInner({
  totalDurationSec = DEFAULT_TOTAL_DURATION_SEC,
  windowRange,
  defaultWindowRange = DEFAULT_WINDOW_RANGE,
  minWindowPct = DEFAULT_MIN_WINDOW_PCT,
  playheadPct,
  peaks,
  onWindowChange,
  label = 'Timeline Navigator',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TimelineZoomNavigatorProps) {
  const override = useComponentOverride('TimelineZoomNavigator');
  const headingId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragMode>(null);

  const safeTotalDuration = sanitizeTotalDuration(totalDurationSec);
  const safeMinWindowPct = sanitizeMinWindowPct(minWindowPct);
  const safeDefaultWindow = normalizeWindowRange(defaultWindowRange, safeMinWindowPct);

  const [rawWindow, setRawWindow] = useControllableState<TimelineViewportWindow>({
    value: windowRange,
    defaultValue: safeDefaultWindow,
  });

  const currentWindow = normalizeWindowRange(rawWindow, safeMinWindowPct);
  const { startPct, endPct } = currentWindow;
  const spanPct = roundPct(endPct - startPct);
  const zoomFactor = computeZoomFactor(currentWindow);
  const formattedZoom = `${zoomFactor.toFixed(1)}×`;

  const isFitAll = startPct === 0 && endPct === 100;
  const canZoomOut = spanPct < 100;
  const canZoomIn = spanPct > safeMinWindowPct;

  const safePlayheadPct =
    playheadPct !== undefined && Number.isFinite(playheadPct)
      ? roundPct(clampNumber(playheadPct, 0, 100, 0))
      : null;

  const activityBars = useMemo<readonly ActivityBar[]>(() => {
    const source = peaks && peaks.length > 0 ? peaks : DEFAULT_ACTIVITY_PEAKS;
    const count = source.length;
    const items: ActivityBar[] = [];
    let barIndex = 0;
    for (const rawPeak of source) {
      const amplitude = clampNumber(
        rawPeak,
        MIN_PEAK_AMPLITUDE,
        MAX_PEAK_AMPLITUDE,
        MIN_PEAK_AMPLITUDE
      );
      items.push({
        id: `tz-bar-${count}-${barIndex}`,
        barIndex,
        amplitude,
        centerPct: ((barIndex + 0.5) / count) * 100,
      });
      barIndex += 1;
    }
    return items;
  }, [peaks]);

  useEffect(() => {
    if (disabled) {
      cleanupDragRef.current?.();
      setActiveDrag(null);
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const commitWindow = useCallback(
    (candidate: TimelineViewportWindow) => {
      const next = normalizeWindowRange(candidate, safeMinWindowPct);
      if (next.startPct === startPct && next.endPct === endPct) return;
      setRawWindow(next);
      onWindowChange?.(next, computeZoomFactor(next));
    },
    [safeMinWindowPct, startPct, endPct, setRawWindow, onWindowChange]
  );

  const moveHandle = useCallback(
    (handle: 'start' | 'end', targetPct: number) => {
      if (handle === 'start') {
        const nextStart = roundPct(
          clampNumber(targetPct, 0, endPct - safeMinWindowPct, startPct)
        );
        commitWindow({ startPct: nextStart, endPct });
      } else {
        const nextEnd = roundPct(
          clampNumber(targetPct, startPct + safeMinWindowPct, 100, endPct)
        );
        commitWindow({ startPct, endPct: nextEnd });
      }
    },
    [startPct, endPct, safeMinWindowPct, commitWindow]
  );

  const panToStart = useCallback(
    (targetStart: number, targetSpan: number) => {
      const clampedStart = roundPct(
        clampNumber(targetStart, 0, Math.max(0, 100 - targetSpan), startPct)
      );
      const nextEnd = roundPct(Math.min(100, clampedStart + targetSpan));
      commitWindow({ startPct: clampedStart, endPct: nextEnd });
    },
    [startPct, commitWindow]
  );

  const latestActionsRef = useRef({ moveHandle, panToStart });
  latestActionsRef.current = { moveHandle, panToStart };

  const getTrackRect = useCallback((): DOMRect | null => {
    const rect = trackRef.current?.getBoundingClientRect();
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
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerup', handleEnd);
      window.addEventListener('pointercancel', handleEnd);
    },
    []
  );

  const handleEdgePointerDown = useCallback(
    (handle: 'start' | 'end') => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (disabled || event.button > 0) return;
      event.preventDefault();
      if (!getTrackRect()) return;

      attachWindowDrag(handle, (moveEvent: PointerEvent) => {
        const rect = getTrackRect();
        if (!rect) return;
        const nextPct = clampNumber(
          ((moveEvent.clientX - rect.left) / rect.width) * 100,
          0,
          100,
          0
        );
        latestActionsRef.current.moveHandle(handle, nextPct);
      });
    },
    [disabled, getTrackRect, attachWindowDrag]
  );

  const handleViewportPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (disabled || event.button > 0) return;
      event.preventDefault();
      if (!getTrackRect()) return;

      const originClientX = event.clientX;
      const originStart = startPct;
      const originSpan = spanPct;

      attachWindowDrag('pan', (moveEvent: PointerEvent) => {
        const rect = getTrackRect();
        if (!rect) return;
        const deltaPct = ((moveEvent.clientX - originClientX) / rect.width) * 100;
        latestActionsRef.current.panToStart(originStart + deltaPct, originSpan);
      });
    },
    [disabled, getTrackRect, startPct, spanPct, attachWindowDrag]
  );

  const handleTrackPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0) return;
      const rect = getTrackRect();
      if (!rect) return;
      event.preventDefault();
      const clickPct = clampNumber(((event.clientX - rect.left) / rect.width) * 100, 0, 100, 0);
      panToStart(clickPct - spanPct / 2, spanPct);
    },
    [disabled, getTrackRect, panToStart, spanPct]
  );

  const handleEdgeKeyDown = useCallback(
    (handle: 'start' | 'end') => (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;
      const current = handle === 'start' ? startPct : endPct;
      const step = event.shiftKey ? COARSE_KEY_STEP_PCT : BASE_KEY_STEP_PCT;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        moveHandle(handle, current - step);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveHandle(handle, current + step);
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        moveHandle(handle, current - PAGE_KEY_STEP_PCT);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        moveHandle(handle, current + PAGE_KEY_STEP_PCT);
      } else if (event.key === 'Home') {
        event.preventDefault();
        moveHandle(handle, handle === 'start' ? 0 : startPct + safeMinWindowPct);
      } else if (event.key === 'End') {
        event.preventDefault();
        moveHandle(handle, handle === 'start' ? endPct - safeMinWindowPct : 100);
      }
    },
    [disabled, startPct, endPct, safeMinWindowPct, moveHandle]
  );

  const handleViewportKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;
      const step = event.shiftKey ? COARSE_KEY_STEP_PCT : BASE_KEY_STEP_PCT;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        panToStart(startPct - step, spanPct);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        panToStart(startPct + step, spanPct);
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        panToStart(startPct - PAGE_KEY_STEP_PCT, spanPct);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        panToStart(startPct + PAGE_KEY_STEP_PCT, spanPct);
      } else if (event.key === 'Home') {
        event.preventDefault();
        panToStart(0, spanPct);
      } else if (event.key === 'End') {
        event.preventDefault();
        panToStart(100 - spanPct, spanPct);
      }
    },
    [disabled, startPct, spanPct, panToStart]
  );

  const handleZoomOut = useCallback(() => {
    commitWindow(zoomAroundCenter(currentWindow, spanPct * ZOOM_STEP_RATIO, safeMinWindowPct));
  }, [commitWindow, currentWindow, spanPct, safeMinWindowPct]);

  const handleZoomIn = useCallback(() => {
    commitWindow(zoomAroundCenter(currentWindow, spanPct / ZOOM_STEP_RATIO, safeMinWindowPct));
  }, [commitWindow, currentWindow, spanPct, safeMinWindowPct]);

  const handleFitAll = useCallback(() => {
    commitWindow(FIT_ALL_WINDOW);
  }, [commitWindow]);

  const startSec = (startPct / 100) * safeTotalDuration;
  const endSec = (endPct / 100) * safeTotalDuration;
  const visibleSec = Math.max(0, endSec - startSec);

  const startFormatted = formatTimelineTime(startSec);
  const endFormatted = formatTimelineTime(endSec);
  const totalFormatted = formatTimelineTime(safeTotalDuration);
  const visibleReadout = `${startFormatted} → ${endFormatted} · ${visibleSec.toFixed(1)}s visible`;

  const isDragging = activeDrag !== null && !disabled;

  const merged = mergeProps({
    themeTarget: themeProps('timeline-zoom-navigator', {
      disabled,
      dragging: isDragging,
      zoomed: !isFitAll,
    }),
    baseClassName: 'prism-slab p-4 space-y-3 w-full max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('timeline-zoom-navigator', 'header');
  const controlsClass = stableClassName('timeline-zoom-navigator', 'controls');
  const trackClass = stableClassName('timeline-zoom-navigator', 'track');
  const viewportClass = stableClassName('timeline-zoom-navigator', 'viewport');
  const handleClass = stableClassName('timeline-zoom-navigator', 'handle');
  const playheadClass = stableClassName('timeline-zoom-navigator', 'playhead');
  const footerClass = stableClassName('timeline-zoom-navigator', 'footer');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2 min-w-0')}>
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_SECONDARY_MAIN}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
          </span>
          <h4
            id={headingId}
            data-testid="timeline-navigator-label"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {label}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 max-w-full">
          <span
            data-testid="timeline-zoom-badge"
            className="prism-crystal px-2.5 py-1 rounded-full font-mono text-xs font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={{
              color: isFitAll ? 'var(--prism-text-secondary)' : 'var(--prism-primary-main)',
            }}
          >
            {formattedZoom}
          </span>

          <div
            role="group"
            aria-label="Timeline zoom controls"
            data-testid="timeline-zoom-controls"
            className={cx(
              controlsClass,
              'prism-crystal p-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0'
            )}
          >
            <button
              type="button"
              disabled={disabled || !canZoomOut}
              aria-label="Zoom out"
              data-testid="timeline-zoom-out"
              onClick={handleZoomOut}
              className="prism-focus-ring h-7 w-7 rounded-full inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-opacity opacity-85 enabled:hover:opacity-100"
              style={STYLE_TEXT_PRIMARY}
            >
              <Minus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              disabled={disabled}
              aria-label="Fit all (1.0×)"
              aria-pressed={isFitAll}
              data-testid="timeline-zoom-fit"
              onClick={handleFitAll}
              className={cx(
                'prism-focus-ring h-7 px-2.5 rounded-full text-[11px] font-semibold tracking-tight whitespace-nowrap inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                isFitAll ? 'prism-emerald' : 'opacity-80 enabled:hover:opacity-100'
              )}
              style={{
                color: isFitAll
                  ? 'var(--prism-success-contrast)'
                  : 'var(--prism-text-primary)',
              }}
            >
              <span>Fit All</span>
              <span className="hidden sm:inline font-mono text-[10px] opacity-85">1.0×</span>
            </button>

            <button
              type="button"
              disabled={disabled || !canZoomIn}
              aria-label="Zoom in"
              data-testid="timeline-zoom-in"
              onClick={handleZoomIn}
              className="prism-focus-ring h-7 w-7 rounded-full inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-opacity opacity-85 enabled:hover:opacity-100"
              style={STYLE_TEXT_PRIMARY}
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        data-testid="timeline-track"
        onPointerDown={handleTrackPointerDown}
        className={cx(
          trackClass,
          'prism-well h-11 relative select-none rounded-xl touch-none',
          disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
        )}
        style={{ touchAction: 'none' }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
        >
          <div
            data-testid="timeline-activity-bars"
            className="absolute inset-0 px-1.5 py-1.5 flex items-end gap-0.5"
          >
            {activityBars.map((bar) => {
              const isInWindow = bar.centerPct >= startPct && bar.centerPct <= endPct;
              return (
                <div
                  key={bar.id}
                  data-testid={`timeline-peak-${bar.barIndex}`}
                  data-in-window={isInWindow ? 'true' : 'false'}
                  className="flex-1 min-w-[2px] rounded-t-sm transition-opacity duration-100"
                  style={{
                    height: `${Math.round(bar.amplitude * 100)}%`,
                    backgroundColor: isInWindow
                      ? 'var(--prism-secondary-main)'
                      : 'var(--prism-text-disabled)',
                    opacity: isInWindow ? 0.62 : 0.3,
                  }}
                />
              );
            })}
          </div>

          <div
            data-testid="timeline-scrim-left"
            className="absolute top-0 bottom-0"
            style={{
              left: '0%',
              width: `${startPct}%`,
              backgroundColor: 'var(--prism-bg-end)',
              opacity: 0.55,
            }}
          />

          <div
            data-testid="timeline-scrim-right"
            className="absolute top-0 bottom-0"
            style={{
              left: `${endPct}%`,
              width: `${roundPct(100 - endPct)}%`,
              backgroundColor: 'var(--prism-bg-end)',
              opacity: 0.55,
            }}
          />
        </div>

        <div
          role="group"
          aria-label="Pan timeline window"
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          data-testid="timeline-viewport-window"
          data-dragging={activeDrag === 'pan' ? 'true' : undefined}
          onPointerDown={handleViewportPointerDown}
          onKeyDown={handleViewportKeyDown}
          className={cx(
            viewportClass,
            'prism-crystal prism-focus-ring absolute top-1 bottom-1 z-10 rounded-lg flex items-center justify-center gap-0.5',
            disabled
              ? 'cursor-not-allowed'
              : activeDrag === 'pan'
                ? 'cursor-grabbing'
                : 'cursor-grab'
          )}
          style={{
            left: `${startPct}%`,
            width: `${spanPct}%`,
            borderWidth: '1.5px',
            borderStyle: 'solid',
            borderColor:
              activeDrag === 'pan'
                ? 'var(--prism-primary-main)'
                : 'var(--prism-secondary-main)',
            opacity: activeDrag === 'pan' ? 0.92 : 0.78,
          }}
        >
          <span
            aria-hidden="true"
            className="w-0.5 h-3.5 rounded-full"
            style={{ backgroundColor: 'var(--prism-text-secondary)', opacity: 0.45 }}
          />
          <span
            aria-hidden="true"
            className="w-0.5 h-3.5 rounded-full"
            style={{ backgroundColor: 'var(--prism-text-secondary)', opacity: 0.45 }}
          />
          <span
            aria-hidden="true"
            className="w-0.5 h-3.5 rounded-full"
            style={{ backgroundColor: 'var(--prism-text-secondary)', opacity: 0.45 }}
          />
        </div>

        <div
          role="slider"
          aria-label="Zoom timeline start"
          aria-valuemin={0}
          aria-valuemax={roundPct(endPct - safeMinWindowPct)}
          aria-valuenow={startPct}
          aria-valuetext={`${startFormatted} (${startPct}%)`}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          data-testid="timeline-handle-start"
          data-handle="start"
          data-dragging={activeDrag === 'start' ? 'true' : undefined}
          onPointerDown={handleEdgePointerDown('start')}
          onKeyDown={handleEdgeKeyDown('start')}
          className={cx(
            handleClass,
            'prism-thumb prism-focus-ring absolute top-0.5 bottom-0.5 z-20 w-3 -translate-x-1/2 rounded-full flex items-center justify-center',
            disabled
              ? 'cursor-not-allowed'
              : activeDrag === 'start'
                ? 'cursor-grabbing'
                : 'cursor-ew-resize'
          )}
          style={{
            left: `${startPct}%`,
            borderWidth: '1.5px',
            borderStyle: 'solid',
            borderColor:
              activeDrag === 'start'
                ? 'var(--prism-primary-main)'
                : 'var(--prism-secondary-main)',
          }}
        >
          <span
            aria-hidden="true"
            className="w-0.5 h-4 rounded-full"
            style={{
              backgroundColor:
                activeDrag === 'start'
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-secondary-dark)',
            }}
          />
        </div>

        <div
          role="slider"
          aria-label="Zoom timeline end"
          aria-valuemin={roundPct(startPct + safeMinWindowPct)}
          aria-valuemax={100}
          aria-valuenow={endPct}
          aria-valuetext={`${endFormatted} (${endPct}%)`}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          data-testid="timeline-handle-end"
          data-handle="end"
          data-dragging={activeDrag === 'end' ? 'true' : undefined}
          onPointerDown={handleEdgePointerDown('end')}
          onKeyDown={handleEdgeKeyDown('end')}
          className={cx(
            handleClass,
            'prism-thumb prism-focus-ring absolute top-0.5 bottom-0.5 z-20 w-3 -translate-x-1/2 rounded-full flex items-center justify-center',
            disabled
              ? 'cursor-not-allowed'
              : activeDrag === 'end'
                ? 'cursor-grabbing'
                : 'cursor-ew-resize'
          )}
          style={{
            left: `${endPct}%`,
            borderWidth: '1.5px',
            borderStyle: 'solid',
            borderColor:
              activeDrag === 'end'
                ? 'var(--prism-primary-main)'
                : 'var(--prism-secondary-main)',
          }}
        >
          <span
            aria-hidden="true"
            className="w-0.5 h-4 rounded-full"
            style={{
              backgroundColor:
                activeDrag === 'end'
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-secondary-dark)',
            }}
          />
        </div>

        {safePlayheadPct !== null ? (
          <div
            aria-hidden="true"
            data-testid="timeline-playhead"
            data-playhead-pct={String(safePlayheadPct)}
            className={cx(
              playheadClass,
              'pointer-events-none absolute top-0 bottom-0 z-30 -translate-x-1/2 flex flex-col items-center'
            )}
            style={{ left: `${safePlayheadPct}%` }}
          >
            <span
              className="w-2 h-1.5 rounded-b-sm shrink-0"
              style={STYLE_BG_PRIMARY}
            />
            <span
              className="w-0.5 flex-1"
              style={STYLE_BG_PRIMARY}
            />
          </div>
        ) : null}
      </div>

      <div
        aria-live="polite"
        data-testid="timeline-footer"
        className={cx(
          footerClass,
          'prism-well rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums'
        )}
        style={STYLE_TEXT_PRIMARY}
      >
        <span data-testid="timeline-visible-span">{visibleReadout}</span>
        <span
          data-testid="timeline-total-duration"
          className="text-[11px]"
          style={STYLE_TEXT_SECONDARY}
        >
          Total {totalFormatted}
        </span>
      </div>
    </div>
  );
}

export const TimelineZoomNavigator = memo(TimelineZoomNavigatorInner);
TimelineZoomNavigator.displayName = 'TimelineZoomNavigator';
