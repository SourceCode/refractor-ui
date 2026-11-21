'use client';

import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Layers } from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type TimelineTrackKind = 'video' | 'audio' | 'effect' | 'subtitle';

export interface TimelineClip {
  id: string;
  label: string;
  startSec: number;
  durationSec: number;
}

export interface TimelineTrack {
  id: string;
  name: string;
  kind: TimelineTrackKind;
  muted?: boolean;
  locked?: boolean;
  clips: ReadonlyArray<TimelineClip>;
}

export interface MultiTrackTimelineProps extends BaseProps<HTMLDivElement> {
  /** Ordered sequence tracks rendered across the track rail and scrollable timeline lanes. */
  tracks: ReadonlyArray<TimelineTrack>;
  /** Total timeline duration in seconds (default derived from max clip end or 60, clamped >= 1). */
  durationSec?: number;
  /** Controlled playhead timestamp in seconds. */
  currentTimeSec?: number;
  /** Initial playhead timestamp in seconds in uncontrolled mode (defaults to 0). */
  defaultCurrentTimeSec?: number;
  /** Callback invoked whenever the playhead position changes via ruler click or keyboard scrubbing. */
  onTimeChange?: (timeSec: number) => void;
  /** Controlled selected clip ID. */
  selectedClipId?: string | null;
  /** Callback invoked when an unlocked clip pill is selected via pointer or Enter/Space. */
  onSelectClip?: (clip: TimelineClip, track: TimelineTrack) => void;
  /** Callback invoked when a track's Mute (M) button is toggled. */
  onToggleTrackMute?: (trackId: string, muted: boolean) => void;
  /** Callback invoked when a track's Lock (L) button is toggled. */
  onToggleTrackLock?: (trackId: string, locked: boolean) => void;
  /** Header title displayed at the top of the optical workspace (defaults to 'Sequence Multi-Track Timeline'). */
  title?: string;
}

type TimelineZoomScale = 1 | 2 | 4;

interface NormalizedTimelineClip {
  raw: TimelineClip;
  id: string;
  label: string;
  startSec: number;
  durationSec: number;
  endSec: number;
}

interface NormalizedTimelineTrack {
  raw: TimelineTrack;
  id: string;
  name: string;
  kind: TimelineTrackKind;
  propMuted: boolean;
  propLocked: boolean;
  clips: ReadonlyArray<NormalizedTimelineClip>;
}

interface ResolvedTimelineTrack extends NormalizedTimelineTrack {
  isMuted: boolean;
  isLocked: boolean;
}

interface TrackToggleOverride {
  value: boolean;
  baseProp: boolean;
}

interface RulerTick {
  sec: number;
  leftPct: number;
  label: string;
}

interface TrackKindVisual {
  label: string;
  dotColorVar: string;
  clipClassName: string;
  clipStyle: OpticalStyleTokens;
}

const DEFAULT_DURATION_SEC = 60;
const MIN_DURATION_SEC = 1;
const MAX_DURATION_SEC = 86400;
const MIN_CLIP_DURATION_SEC = 0.1;
const BASE_TIMELINE_WIDTH_PX = 640;
const TRACK_ROW_HEIGHT_PX = 52;
const RULER_HEIGHT_PX = 40;
const DEFAULT_STEP_SEC = 1;
const COARSE_STEP_SEC = 5;

const ZOOM_OPTIONS: ReadonlyArray<{ value: TimelineZoomScale; label: string }> = [
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
];

const NICE_TICK_INTERVALS_SEC: readonly number[] = [
  0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600,
];

function getTrackKindVisual(kind: TimelineTrackKind): TrackKindVisual {
  switch (kind) {
    case 'video':
      return {
        label: 'Video',
        dotColorVar: 'var(--prism-primary-main)',
        clipClassName: 'prism-btn-primary',
        clipStyle: {
          color: 'var(--prism-primary-contrast)',
        },
      };
    case 'audio':
      return {
        label: 'Audio',
        dotColorVar: 'var(--prism-secondary-main)',
        clipClassName: 'prism-crystal',
        clipStyle: {
          color: 'var(--prism-text-primary)',
          borderColor: 'var(--prism-secondary-main)',
          borderWidth: '1.5px',
          borderStyle: 'solid',
        },
      };
    case 'effect':
      return {
        label: 'Effect',
        dotColorVar: 'var(--prism-success-main)',
        clipClassName: 'prism-emerald',
        clipStyle: {
          color: 'var(--prism-success-contrast)',
        },
      };
    case 'subtitle':
      return {
        label: 'Subtitle',
        dotColorVar: 'var(--prism-warning-main)',
        clipClassName: 'prism-crystal',
        clipStyle: {
          color: 'var(--prism-text-primary)',
          borderColor: 'var(--prism-warning-main)',
          borderWidth: '1.5px',
          borderStyle: 'solid',
        },
      };
  }
}

function formatTimecodeSec(rawSeconds: number): string {
  const safe = Number.isFinite(rawSeconds) && rawSeconds > 0 ? rawSeconds : 0;
  const totalCentis = Math.round(safe * 100);
  const centis = totalCentis % 100;
  const totalWholeSec = Math.floor(totalCentis / 100);
  const secs = totalWholeSec % 60;
  const mins = Math.floor(totalWholeSec / 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

function formatRulerLabel(sec: number, showTenths: boolean): string {
  const totalTenths = Math.round(Math.max(0, sec) * 10);
  const tenths = totalTenths % 10;
  const totalWholeSec = Math.floor(totalTenths / 10);
  const secs = totalWholeSec % 60;
  const mins = Math.floor(totalWholeSec / 60);
  const base = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return showTenths && tenths > 0 ? `${base}.${tenths}` : base;
}

function formatSecondsCompact(sec: number): string {
  const rounded = Math.round(Math.max(0, sec) * 100) / 100;
  return String(rounded);
}

function buildRulerTicks(durationSec: number, zoom: TimelineZoomScale): RulerTick[] {
  const maxTicks = zoom * 8;
  const chosenInterval =
    NICE_TICK_INTERVALS_SEC.find((step) => durationSec / step <= maxTicks) ??
    Math.max(1, Math.ceil(durationSec / maxTicks));
  const showTenths = chosenInterval < 1;
  const totalSteps = Math.min(64, Math.floor(durationSec / chosenInterval));
  const ticks: RulerTick[] = [];

  for (let i = 0; i <= totalSteps; i += 1) {
    const sec = Math.min(durationSec, Math.round(i * chosenInterval * 100) / 100);
    ticks.push({
      sec,
      leftPct: (sec / durationSec) * 100,
      label: formatRulerLabel(sec, showTenths),
    });
  }

  return ticks;
}

export function MultiTrackTimeline({
  tracks,
  durationSec,
  currentTimeSec,
  defaultCurrentTimeSec = 0,
  onTimeChange,
  selectedClipId,
  onSelectClip,
  onToggleTrackMute,
  onToggleTrackLock,
  title = 'Sequence Multi-Track Timeline',
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: MultiTrackTimelineProps) {
  const override = useComponentOverride('MultiTrackTimeline');

  const [zoom, setZoom] = useState<TimelineZoomScale>(1);
  const [internalSelectedClipId, setInternalSelectedClipId] = useState<string | null>(null);
  const [muteOverrides, setMuteOverrides] = useState<ReadonlyMap<string, TrackToggleOverride>>(
    () => new Map()
  );
  const [lockOverrides, setLockOverrides] = useState<ReadonlyMap<string, TrackToggleOverride>>(
    () => new Map()
  );

  const { normalizedTracks, totalClipCount, maxClipEndSec } = useMemo(() => {
    const seenTrackIds = new Set<string>();
    const out: NormalizedTimelineTrack[] = [];
    let clipsTotal = 0;
    let maxEnd = 0;

    for (const track of tracks) {
      if (seenTrackIds.has(track.id)) continue;
      seenTrackIds.add(track.id);

      const seenClipIds = new Set<string>();
      const normalizedClips: NormalizedTimelineClip[] = [];

      for (const clip of track.clips) {
        if (seenClipIds.has(clip.id)) continue;
        seenClipIds.add(clip.id);

        const safeStart = clampNumber(clip.startSec, 0, MAX_DURATION_SEC, 0);
        const safeClipDuration = clampNumber(
          clip.durationSec,
          MIN_CLIP_DURATION_SEC,
          MAX_DURATION_SEC,
          1
        );
        const endSec = Math.round((safeStart + safeClipDuration) * 100) / 100;
        if (endSec > maxEnd) {
          maxEnd = endSec;
        }
        normalizedClips.push({
          raw: clip,
          id: clip.id,
          label: clip.label.trim() || 'Untitled Clip',
          startSec: safeStart,
          durationSec: safeClipDuration,
          endSec,
        });
      }

      clipsTotal += normalizedClips.length;
      out.push({
        raw: track,
        id: track.id,
        name: track.name.trim() || 'Untitled Track',
        kind: track.kind,
        propMuted: Boolean(track.muted),
        propLocked: Boolean(track.locked),
        clips: normalizedClips,
      });
    }

    return {
      normalizedTracks: out,
      totalClipCount: clipsTotal,
      maxClipEndSec: maxEnd,
    };
  }, [tracks]);

  const hasStaleMute = normalizedTracks.some((track) => {
    const ov = muteOverrides.get(track.id);
    return ov !== undefined && ov.baseProp !== track.propMuted;
  });
  if (hasStaleMute) {
    const next = new Map(muteOverrides);
    for (const track of normalizedTracks) {
      const ov = next.get(track.id);
      if (ov !== undefined && ov.baseProp !== track.propMuted) {
        next.delete(track.id);
      }
    }
    setMuteOverrides(next);
  }

  const hasStaleLock = normalizedTracks.some((track) => {
    const ov = lockOverrides.get(track.id);
    return ov !== undefined && ov.baseProp !== track.propLocked;
  });
  if (hasStaleLock) {
    const next = new Map(lockOverrides);
    for (const track of normalizedTracks) {
      const ov = next.get(track.id);
      if (ov !== undefined && ov.baseProp !== track.propLocked) {
        next.delete(track.id);
      }
    }
    setLockOverrides(next);
  }

  const resolvedTracks = useMemo<ReadonlyArray<ResolvedTimelineTrack>>(() => {
    return normalizedTracks.map((track) => {
      const muteOv = muteOverrides.get(track.id);
      const lockOv = lockOverrides.get(track.id);
      const isMuted =
        muteOv && muteOv.baseProp === track.propMuted ? muteOv.value : track.propMuted;
      const isLocked =
        lockOv && lockOv.baseProp === track.propLocked ? lockOv.value : track.propLocked;
      return {
        ...track,
        isMuted,
        isLocked,
      };
    });
  }, [normalizedTracks, muteOverrides, lockOverrides]);

  const derivedDurationSec =
    maxClipEndSec > 0
      ? clampNumber(maxClipEndSec, MIN_DURATION_SEC, MAX_DURATION_SEC, DEFAULT_DURATION_SEC)
      : DEFAULT_DURATION_SEC;

  const safeDurationSec =
    durationSec !== undefined && Number.isFinite(durationSec)
      ? clampNumber(durationSec, MIN_DURATION_SEC, MAX_DURATION_SEC, derivedDurationSec)
      : derivedDurationSec;

  const safeDefaultTimeSec = clampNumber(defaultCurrentTimeSec, 0, safeDurationSec, 0);
  const controlledTimeSec =
    currentTimeSec !== undefined
      ? clampNumber(currentTimeSec, 0, safeDurationSec, 0)
      : undefined;

  const [rawTimeSec, setRawTimeSec] = useControllableState<number>({
    value: controlledTimeSec,
    defaultValue: safeDefaultTimeSec,
    onChange: onTimeChange,
  });

  const activeTimeSec = Math.round(clampNumber(rawTimeSec, 0, safeDurationSec, 0) * 100) / 100;
  const playheadPct = clampNumber((activeTimeSec / safeDurationSec) * 100, 0, 100, 0);
  const activeSelectedClipId =
    selectedClipId !== undefined ? selectedClipId : internalSelectedClipId;

  const canvasWidthPx = BASE_TIMELINE_WIDTH_PX * zoom;
  const totalLanesHeightPx = Math.max(
    TRACK_ROW_HEIGHT_PX,
    resolvedTracks.length * TRACK_ROW_HEIGHT_PX
  );

  const rulerTicks = useMemo(
    () => buildRulerTicks(safeDurationSec, zoom),
    [safeDurationSec, zoom]
  );

  const selectedClipEntry = useMemo(() => {
    if (!activeSelectedClipId) return null;
    for (const track of resolvedTracks) {
      for (const clip of track.clips) {
        if (clip.id === activeSelectedClipId) {
          return { track, clip };
        }
      }
    }
    return null;
  }, [activeSelectedClipId, resolvedTracks]);

  const activePlayheadClipCount = useMemo(() => {
    let count = 0;
    for (const track of resolvedTracks) {
      if (track.isMuted) continue;
      for (const clip of track.clips) {
        if (activeTimeSec >= clip.startSec && activeTimeSec <= clip.endSec) {
          count += 1;
        }
      }
    }
    return count;
  }, [activeTimeSec, resolvedTracks]);

  const commitTimeSec = useCallback(
    (nextRaw: number) => {
      const clamped = clampNumber(nextRaw, 0, safeDurationSec, activeTimeSec);
      const rounded = Math.round(clamped * 100) / 100;
      if (rounded !== activeTimeSec) {
        setRawTimeSec(rounded);
      }
    },
    [safeDurationSec, activeTimeSec, setRawTimeSec]
  );

  const handleRulerClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.currentTarget.focus();
    const rect = e.currentTarget.getBoundingClientRect();
    const effectiveWidth = rect.width > 0 ? rect.width : canvasWidthPx;
    const ratio = clampNumber((e.clientX - rect.left) / effectiveWidth, 0, 1, 0);
    commitTimeSec(ratio * safeDurationSec);
  };

  const handleRulerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.nativeEvent.isComposing) return;
    const stepSec = e.shiftKey ? COARSE_STEP_SEC : DEFAULT_STEP_SEC;
    let targetSec: number | null = null;

    if (e.key === 'ArrowRight') {
      targetSec = activeTimeSec + stepSec;
    } else if (e.key === 'ArrowLeft') {
      targetSec = activeTimeSec - stepSec;
    } else if (e.key === 'Home') {
      targetSec = 0;
    } else if (e.key === 'End') {
      targetSec = safeDurationSec;
    }

    if (targetSec === null) return;
    e.preventDefault();
    commitTimeSec(targetSec);
  };

  const handleSelectClip = (clip: NormalizedTimelineClip, track: ResolvedTimelineTrack) => {
    if (track.isLocked) return;
    if (selectedClipId === undefined) {
      setInternalSelectedClipId(clip.id);
    }
    onSelectClip?.(clip.raw, track.raw);
  };

  const handleClipKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    clip: NormalizedTimelineClip,
    track: ResolvedTimelineTrack
  ) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectClip(clip, track);
    }
  };

  const handleToggleMute = (track: ResolvedTimelineTrack) => {
    const nextMuted = !track.isMuted;
    setMuteOverrides((prev) => {
      const next = new Map(prev);
      next.set(track.id, { value: nextMuted, baseProp: track.propMuted });
      return next;
    });
    onToggleTrackMute?.(track.id, nextMuted);
  };

  const handleToggleLock = (track: ResolvedTimelineTrack) => {
    const nextLocked = !track.isLocked;
    setLockOverrides((prev) => {
      const next = new Map(prev);
      next.set(track.id, { value: nextLocked, baseProp: track.propLocked });
      return next;
    });
    onToggleTrackLock?.(track.id, nextLocked);
  };

  const merged = mergeProps({
    themeTarget: themeProps('multi-track-timeline', {
      zoom,
      empty: resolvedTracks.length === 0,
      hasSelection: Boolean(selectedClipEntry),
    }),
    baseClassName: 'prism-slab p-4 space-y-4 overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('multi-track-timeline', 'header');
  const railClass = stableClassName('multi-track-timeline', 'rail');
  const lanesClass = stableClassName('multi-track-timeline', 'lanes');
  const inspectorClass = stableClassName('multi-track-timeline', 'inspector');

  return (
    <div ref={ref} role="region" aria-label={ariaLabel ?? title} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3 min-w-0')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <Layers className="w-4 h-4 shrink-0" />
          </span>
          <div className="min-w-0">
            <h4
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {title}
            </h4>
            <p
              data-testid="timeline-timecode"
              className="text-xs font-mono tabular-nums truncate"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {formatTimecodeSec(activeTimeSec)} / {formatTimecodeSec(safeDurationSec)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <span
            data-testid="timeline-counts"
            className="prism-crystal px-2.5 py-1 rounded-full text-xs font-mono tabular-nums whitespace-nowrap shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {resolvedTracks.length} {resolvedTracks.length === 1 ? 'track' : 'tracks'} ·{' '}
            {totalClipCount} {totalClipCount === 1 ? 'clip' : 'clips'}
          </span>

          <div
            role="group"
            aria-label="Timeline zoom"
            className="prism-crystal p-1 rounded-full inline-flex items-center gap-1 shrink-0"
          >
            {ZOOM_OPTIONS.map((opt) => {
              const isSelected = zoom === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setZoom(opt.value)}
                  className={cx(
                    'prism-focus-ring px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold cursor-pointer transition-colors',
                    isSelected ? 'prism-well' : 'opacity-75 hover:opacity-100'
                  )}
                  style={{
                    color: isSelected
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {resolvedTracks.length === 0 ? (
        <div
          role="status"
          data-testid="timeline-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No timeline tracks configured. Add video, audio, effect, or subtitle tracks to begin
          sequencing.
        </div>
      ) : (
        <>
          <div
            className="flex overflow-hidden prism-well rounded-2xl border"
            style={{ borderColor: 'var(--prism-well-border)' }}
          >
            <div
              className={cx(railClass, 'w-32 sm:w-44 shrink-0 border-r')}
              style={{ borderColor: 'var(--prism-divider)' }}
            >
              <div
                className="px-2.5 sm:px-3 flex items-center text-[11px] font-semibold uppercase tracking-wide border-b"
                style={{
                  height: `${RULER_HEIGHT_PX}px`,
                  borderColor: 'var(--prism-divider)',
                  color: 'var(--prism-text-secondary)',
                }}
              >
                Tracks
              </div>

              <div>
                {resolvedTracks.map((track) => {
                  const kindVisual = getTrackKindVisual(track.kind);
                  return (
                    <div
                      key={track.id}
                      data-track-rail={track.id}
                      data-muted={track.isMuted ? 'true' : undefined}
                      data-locked={track.isLocked ? 'true' : undefined}
                      className="px-2 sm:px-2.5 flex items-center justify-between gap-1.5 border-b"
                      style={{
                        height: `${TRACK_ROW_HEIGHT_PX}px`,
                        borderColor: 'var(--prism-divider)',
                      }}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          data-track-kind-dot={track.kind}
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: kindVisual.dotColorVar }}
                        />
                        <div className="min-w-0 flex-1">
                          <span
                            className="block text-xs font-semibold truncate"
                            style={{ color: 'var(--prism-text-primary)' }}
                          >
                            {track.name}
                          </span>
                          <span
                            className="block text-[10px] font-mono uppercase tracking-wide truncate"
                            style={{ color: 'var(--prism-text-secondary)' }}
                          >
                            {kindVisual.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-pressed={track.isMuted}
                          aria-label={`Mute ${track.name}`}
                          data-track-mute={track.id}
                          onClick={() => handleToggleMute(track)}
                          className={cx(
                            'prism-focus-ring w-6 h-6 rounded-md text-[10px] font-mono font-bold inline-flex items-center justify-center cursor-pointer transition-colors',
                            track.isMuted ? '' : 'prism-crystal'
                          )}
                          style={
                            track.isMuted
                              ? {
                                  backgroundColor: 'var(--prism-warning-main)',
                                  color: 'var(--prism-warning-contrast)',
                                }
                              : { color: 'var(--prism-text-secondary)' }
                          }
                        >
                          M
                        </button>
                        <button
                          type="button"
                          aria-pressed={track.isLocked}
                          aria-label={`Lock ${track.name}`}
                          data-track-lock={track.id}
                          onClick={() => handleToggleLock(track)}
                          className={cx(
                            'prism-focus-ring w-6 h-6 rounded-md text-[10px] font-mono font-bold inline-flex items-center justify-center cursor-pointer transition-colors',
                            track.isLocked ? '' : 'prism-crystal'
                          )}
                          style={
                            track.isLocked
                              ? {
                                  backgroundColor: 'var(--prism-primary-main)',
                                  color: 'var(--prism-primary-contrast)',
                                }
                              : { color: 'var(--prism-text-secondary)' }
                          }
                        >
                          L
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={cx(lanesClass, 'flex-1 min-w-0 overflow-x-auto')}>
              <div
                data-testid="timeline-canvas"
                className="relative"
                style={{ width: `${canvasWidthPx}px`, minWidth: '100%' }}
              >
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label="Timeline playhead ruler"
                  aria-valuemin={0}
                  aria-valuemax={safeDurationSec}
                  aria-valuenow={activeTimeSec}
                  aria-valuetext={formatTimecodeSec(activeTimeSec)}
                  data-testid="timeline-ruler"
                  onClick={handleRulerClick}
                  onKeyDown={handleRulerKeyDown}
                  className="prism-focus-ring relative select-none cursor-ew-resize border-b"
                  style={{
                    height: `${RULER_HEIGHT_PX}px`,
                    borderColor: 'var(--prism-divider)',
                  }}
                >
                  {rulerTicks.map((tick) => {
                    const isStart = tick.leftPct <= 0;
                    const isEnd = tick.leftPct >= 99.5;
                    return (
                      <div
                        key={`tick-${tick.sec}`}
                        data-ruler-tick={String(tick.sec)}
                        aria-hidden="true"
                        className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
                        style={{ left: `${tick.leftPct}%` }}
                      >
                        <span
                          className={cx(
                            'pt-1.5 text-[10px] font-mono tabular-nums whitespace-nowrap',
                            isStart
                              ? 'pl-1.5'
                              : isEnd
                                ? '-translate-x-full pr-1.5'
                                : '-translate-x-1/2'
                          )}
                          style={{ color: 'var(--prism-text-secondary)' }}
                        >
                          {tick.label}
                        </span>
                        <span
                          className="w-px h-2"
                          style={{ backgroundColor: 'var(--prism-well-border)' }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="relative" style={{ height: `${totalLanesHeightPx}px` }}>
                  <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                    {rulerTicks.map((tick) => (
                      <div
                        key={`grid-${tick.sec}`}
                        className="absolute top-0 bottom-0 w-px"
                        style={{
                          left: `${tick.leftPct}%`,
                          backgroundColor: 'var(--prism-divider)',
                        }}
                      />
                    ))}
                  </div>

                  {resolvedTracks.map((track) => {
                    const kindVisual = getTrackKindVisual(track.kind);
                    return (
                      <div
                        key={`lane-${track.id}`}
                        data-track-lane={track.id}
                        data-track-kind={track.kind}
                        data-muted={track.isMuted ? 'true' : undefined}
                        data-locked={track.isLocked ? 'true' : undefined}
                        className={cx(
                          'relative border-b transition-opacity',
                          track.isMuted ? 'opacity-45' : ''
                        )}
                        style={{
                          height: `${TRACK_ROW_HEIGHT_PX}px`,
                          borderColor: 'var(--prism-divider)',
                        }}
                      >
                        {track.clips.map((clip) => {
                          const isSelected = activeSelectedClipId === clip.id;
                          const leftPct = clampNumber(
                            (clip.startSec / safeDurationSec) * 100,
                            0,
                            96,
                            0
                          );
                          const rawWidthPct = (clip.durationSec / safeDurationSec) * 100;
                          const widthPct = clampNumber(
                            rawWidthPct,
                            3,
                            100 - leftPct,
                            Math.min(4, 100 - leftPct)
                          );

                          const clipTarget = themeProps(
                            'multi-track-timeline',
                            {
                              clipId: clip.id,
                              trackId: track.id,
                              kind: track.kind,
                              selected: isSelected,
                              locked: track.isLocked,
                            },
                            'clip'
                          );

                          return (
                            <button
                              key={`${track.id}-${clip.id}`}
                              type="button"
                              disabled={track.isLocked}
                              aria-pressed={isSelected}
                              aria-label={`${clip.label} on ${track.name} (${formatSecondsCompact(clip.startSec)}s to ${formatSecondsCompact(clip.endSec)}s${track.isLocked ? ', locked' : ''})`}
                              onClick={() => handleSelectClip(clip, track)}
                              onKeyDown={(e) => handleClipKeyDown(e, clip, track)}
                              {...mergeProps({
                                themeTarget: clipTarget,
                                baseClassName: cx(
                                  kindVisual.clipClassName,
                                  'prism-focus-ring absolute top-2 bottom-2 rounded-full overflow-hidden flex items-center px-2.5 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-shadow',
                                  isSelected ? 'z-10' : 'z-[5]'
                                ),
                                baseStyle: {
                                  ...kindVisual.clipStyle,
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                  ...(isSelected
                                    ? {
                                        outline: '2px solid var(--prism-focus-ring)',
                                        outlineOffset: '1px',
                                      }
                                    : {}),
                                },
                              })}
                            >
                              <span className="relative z-10 truncate text-[11px] font-semibold leading-none">
                                {clip.label}
                              </span>
                              <span className="relative z-10 ml-auto pl-1.5 text-[10px] font-mono tabular-nums opacity-85 shrink-0">
                                {formatSecondsCompact(clip.durationSec)}s
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                <div
                  aria-hidden="true"
                  data-testid="timeline-playhead"
                  data-time-sec={String(activeTimeSec)}
                  className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-20"
                  style={{
                    left: `${playheadPct}%`,
                    backgroundColor: 'var(--prism-primary-main)',
                  }}
                >
                  <span
                    className="absolute top-0 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: 'var(--prism-primary-main)' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            aria-live="polite"
            data-testid="timeline-inspector"
            className={cx(
              inspectorClass,
              'prism-well rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0'
            )}
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {selectedClipEntry ? (
              <div className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: getTrackKindVisual(selectedClipEntry.track.kind).dotColorVar,
                  }}
                />
                <span
                  className="font-medium truncate"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {selectedClipEntry.track.name} · {selectedClipEntry.clip.label} ·{' '}
                  {formatSecondsCompact(selectedClipEntry.clip.startSec)}s–
                  {formatSecondsCompact(selectedClipEntry.clip.endSec)}s
                </span>
              </div>
            ) : (
              <span className="font-mono tabular-nums truncate">
                Playhead {formatTimecodeSec(activeTimeSec)} / {formatTimecodeSec(safeDurationSec)}{' '}
                · {activePlayheadClipCount}{' '}
                {activePlayheadClipCount === 1 ? 'active clip' : 'active clips'}
              </span>
            )}

            <span className="font-mono text-[11px] tabular-nums shrink-0">Zoom {zoom}×</span>
          </div>
        </>
      )}
    </div>
  );
}

MultiTrackTimeline.displayName = 'MultiTrackTimeline';
