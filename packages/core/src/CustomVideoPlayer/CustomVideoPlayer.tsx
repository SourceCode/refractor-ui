'use client';

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import {
  Captions,
  Film,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export interface VideoChapter {
  /** Unique identifier for the chapter marker. */
  id: string;
  /** Human-readable chapter title rendered strictly as literal text. */
  title: string;
  /** Timestamp offset in seconds where the chapter begins. */
  timeSeconds: number;
}

export interface CustomVideoPlayerProps extends BaseProps<HTMLDivElement> {
  /** Optional video stream URL validated strictly via sanitizeUrl(src, false). */
  src?: string;
  /** Optional poster image URL validated strictly via sanitizeUrl(poster, true). */
  poster?: string;
  /** Media title displayed on the optical stage and player region (defaults to 'Optical Media Stream'). */
  title?: string;
  /** Total media duration in seconds, clamped safely to [1..86400] (defaults to 180). */
  durationSeconds?: number;
  /** Optional chapter markers rendered along the timeline track and quick-jump pill strip. */
  chapters?: ReadonlyArray<VideoChapter>;
  /** Optional caption copy displayed inside the frosted optical subtitle pill when captions are enabled. */
  captionsText?: string;
  /** Initial captions toggle state (defaults to false). */
  defaultCaptionsEnabled?: boolean;
  /** Initial playback speed multiplier (defaults to 1). */
  defaultSpeed?: number;
  /** Callback invoked when the playback timestamp updates via scrubber, video playback, or chapter jump. */
  onTimeChange?: (seconds: number) => void;
  /** Callback invoked when playback toggles between playing and paused. */
  onPlayStateChange?: (playing: boolean) => void;
}

interface NormalizedChapter {
  id: string;
  reactKey: string;
  title: string;
  timeSeconds: number;
  percent: number;
}

const SPEED_OPTIONS: readonly number[] = [0.5, 1, 1.25, 1.5, 2];
const DEFAULT_DURATION_SECONDS = 180;
const MIN_DURATION_SECONDS = 1;
const MAX_DURATION_SECONDS = 86400;
const DEFAULT_VOLUME = 80;

function normalizeSpeed(raw: number): number {
  return SPEED_OPTIONS.includes(raw) ? raw : 1;
}

function getNextVideoSpeed(current: number): number {
  switch (current) {
    case 0.5:
      return 1;
    case 1:
      return 1.25;
    case 1.25:
      return 1.5;
    case 1.5:
      return 2;
    default:
      return 0.5;
  }
}

function swallowRejection(): void {
  // Intentionally ignores rejected media/fullscreen promises in restricted environments
}

function formatMediaTime(rawSeconds: number): string {
  const safe = Math.max(0, Math.floor(rawSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function CustomVideoPlayer({
  src,
  poster,
  title = 'Optical Media Stream',
  durationSeconds = DEFAULT_DURATION_SECONDS,
  chapters,
  captionsText,
  defaultCaptionsEnabled = false,
  defaultSpeed = 1,
  onTimeChange,
  onPlayStateChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CustomVideoPlayerProps) {
  const override = useComponentOverride('CustomVideoPlayer');
  const scrubberId = useId();
  const volumeId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mergedRef = useMergedRefs(containerRef, ref);

  const safeSrc = useMemo(() => (src ? sanitizeUrl(src, false) : ''), [src]);
  const safePoster = useMemo(() => (poster ? sanitizeUrl(poster, true) : ''), [poster]);
  const safeDuration = clampNumber(
    durationSeconds,
    MIN_DURATION_SECONDS,
    MAX_DURATION_SECONDS,
    DEFAULT_DURATION_SECONDS
  );

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(() => normalizeSpeed(defaultSpeed));
  const [volume, setVolume] = useState<number>(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(defaultCaptionsEnabled);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const clampedTime = clampNumber(currentTime, 0, safeDuration, 0);
  const progressPct = clampNumber((clampedTime / safeDuration) * 100, 0, 100, 0);

  const normalizedChapters = useMemo<readonly NormalizedChapter[]>(() => {
    if (!chapters || chapters.length === 0) {
      return [];
    }
    const keyCounts = new Map<string, number>();
    const items: NormalizedChapter[] = [];
    for (const chapter of chapters) {
      const safeTime = clampNumber(chapter.timeSeconds, 0, safeDuration, 0);
      const seenCount = keyCounts.get(chapter.id) ?? 0;
      keyCounts.set(chapter.id, seenCount + 1);
      const reactKey = seenCount === 0 ? `ch-${chapter.id}` : `ch-${chapter.id}-${seenCount}`;
      items.push({
        id: chapter.id,
        reactKey,
        title: chapter.title,
        timeSeconds: safeTime,
        percent: clampNumber((safeTime / safeDuration) * 100, 0, 100, 0),
      });
    }
    return items.sort((a, b) => a.timeSeconds - b.timeSeconds);
  }, [chapters, safeDuration]);

  const activeChapter = useMemo<NormalizedChapter | null>(() => {
    let current: NormalizedChapter | null = null;
    for (const chapter of normalizedChapters) {
      if (chapter.timeSeconds <= clampedTime) {
        current = chapter;
      }
    }
    return current;
  }, [clampedTime, normalizedChapters]);

  const handleTogglePlay = useCallback(() => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    onPlayStateChange?.(nextPlaying);

    const media = videoRef.current;
    if (media) {
      try {
        if (nextPlaying) {
          void Promise.resolve(media.play?.()).catch(swallowRejection);
        } else {
          media.pause?.();
        }
      } catch {
        // Headless environments or autoplay policies may block programmatic media playback
      }
    }
  }, [isPlaying, onPlayStateChange]);

  const handleSeek = useCallback(
    (rawSeconds: number) => {
      const nextTime = clampNumber(rawSeconds, 0, safeDuration, 0);
      setCurrentTime(nextTime);
      if (videoRef.current) {
        videoRef.current.currentTime = nextTime;
      }
      onTimeChange?.(nextTime);
    },
    [onTimeChange, safeDuration]
  );

  const handleCycleSpeed = useCallback(() => {
    const nextSpeed = getNextVideoSpeed(speed);
    setSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  }, [speed]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const restoredVolume = !nextMuted && volume === 0 ? 50 : volume;
    if (restoredVolume !== volume) {
      setVolume(restoredVolume);
    }
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      videoRef.current.volume = restoredVolume / 100;
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((rawVolume: number) => {
    const nextVolume = clampNumber(rawVolume, 0, 100, 0);
    const nextMuted = nextVolume === 0;
    setVolume(nextVolume);
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.volume = nextVolume / 100;
      videoRef.current.muted = nextMuted;
    }
  }, []);

  const handleToggleCaptions = useCallback(() => {
    setCaptionsEnabled((prev) => !prev);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const nextFullscreen = !isFullscreen;
    try {
      if (nextFullscreen) {
        void Promise.resolve(containerRef.current?.requestFullscreen?.()).catch(swallowRejection);
      } else if (document.fullscreenElement) {
        void Promise.resolve(document.exitFullscreen?.()).catch(swallowRejection);
      }
    } catch {
      // Visual expanded slab state provides a deterministic fallback when Fullscreen API is unavailable
    }
    setIsFullscreen(nextFullscreen);
  }, [isFullscreen]);

  const merged = mergeProps({
    themeTarget: themeProps('custom-video-player', {
      playing: isPlaying,
      muted: isMuted,
      captions: captionsEnabled,
      fullscreen: isFullscreen,
      hasMedia: safeSrc.length > 0,
    }),
    baseClassName: cx(
      'prism-slab overflow-hidden w-full p-4 space-y-3',
      isFullscreen && 'fixed inset-4 z-50 flex flex-col justify-between'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const stageClass = stableClassName('custom-video-player', 'stage');
  const controlsClass = stableClassName('custom-video-player', 'controls');
  const displayedVolume = isMuted ? 0 : volume;
  const formattedCurrent = formatMediaTime(clampedTime);
  const formattedDuration = formatMediaTime(safeDuration);

  return (
    <div ref={mergedRef} role="region" aria-label={title} {...rest} {...merged}>
      {/* Optical Media Stage */}
      <div
        data-testid="video-stage"
        className={cx(
          stageClass,
          'prism-well relative w-full aspect-video rounded-[18px] overflow-hidden flex items-center justify-center'
        )}
      >
        {safeSrc ? (
          <video
            ref={videoRef}
            data-testid="video-element"
            src={safeSrc}
            poster={safePoster || undefined}
            muted={isMuted}
            playsInline
            aria-label={title}
            onTimeUpdate={(event) => {
              const nextTime = clampNumber(event.currentTarget.currentTime, 0, safeDuration, 0);
              setCurrentTime(nextTime);
              onTimeChange?.(nextTime);
            }}
            onEnded={() => {
              setIsPlaying(false);
              onPlayStateChange?.(false);
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            data-testid="video-preview-stage"
            className="relative w-full h-full flex items-center justify-center"
          >
            {safePoster ? (
              <img
                data-testid="video-poster-image"
                src={safePoster}
                alt={title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : null}

            <div className="prism-crystal relative z-10 max-w-[85%] rounded-2xl px-5 py-4 flex flex-col items-center gap-2 text-center">
              <span
                className="prism-well w-11 h-11 rounded-full inline-flex items-center justify-center shrink-0"
                style={{
                  color: isPlaying ? 'var(--prism-primary-main)' : 'var(--prism-secondary-main)',
                }}
              >
                <Film className="w-5 h-5" aria-hidden="true" />
              </span>
              <span
                data-testid="video-stage-title"
                className="text-sm font-semibold tracking-tight break-words"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {title}
              </span>
              <span
                role="status"
                aria-live="polite"
                data-testid="video-playback-badge"
                className={cx(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                  isPlaying ? 'prism-emerald' : 'prism-well'
                )}
                style={isPlaying ? undefined : { color: 'var(--prism-text-secondary)' }}
              >
                <span>{isPlaying ? 'Playing' : 'Paused'}</span>
                {activeChapter ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate max-w-[160px]">{activeChapter.title}</span>
                  </>
                ) : null}
              </span>
            </div>
          </div>
        )}

        {/* Top-left live overlay badge when native <video> is mounted */}
        {safeSrc ? (
          <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2 max-w-[85%]">
            <span
              data-testid="video-stage-title"
              className="prism-crystal px-3 py-1 rounded-full text-xs font-semibold truncate"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {title}
            </span>
            <span
              role="status"
              aria-live="polite"
              data-testid="video-playback-badge"
              className={cx(
                'px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0',
                isPlaying ? 'prism-emerald' : 'prism-crystal'
              )}
              style={isPlaying ? undefined : { color: 'var(--prism-text-secondary)' }}
            >
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        ) : null}

        {/* Frosted Optical Subtitle Pill */}
        {captionsEnabled ? (
          <div
            role="status"
            aria-live="polite"
            data-testid="video-captions-overlay"
            className="prism-crystal pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[90%] px-4 py-1.5 rounded-full text-xs font-medium text-center break-words"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {captionsText ?? 'Live optical captions enabled'}
          </div>
        ) : null}
      </div>

      {/* Crystal Control Dock */}
      <div className={cx(controlsClass, 'prism-crystal rounded-[20px] p-3 space-y-2.5')}>
        {/* Timeline Scrubber with Chapter Markers */}
        <div className="relative flex items-center h-6">
          <div
            aria-hidden="true"
            className="prism-well absolute inset-x-0 h-2 rounded-full overflow-hidden pointer-events-none"
          >
            <div
              className="prism-emerald h-full rounded-full transition-all duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <input
            id={scrubberId}
            type="range"
            aria-label="Timeline scrubber"
            aria-valuetext={`${formattedCurrent} of ${formattedDuration}`}
            min={0}
            max={safeDuration}
            step={1}
            value={clampedTime}
            onChange={(event) => handleSeek(Number(event.target.value))}
            className="peer relative z-10 w-full h-6 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          <div
            aria-hidden="true"
            className="prism-thumb pointer-events-none absolute z-10 w-4 h-4 rounded-full -ml-2 transition-all duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
            style={{ left: `${progressPct}%` }}
          />

          {normalizedChapters.map((chapter) => {
            const isCurrentChapter = activeChapter?.reactKey === chapter.reactKey;
            return (
              <button
                key={chapter.reactKey}
                type="button"
                data-testid={`video-chapter-marker-${chapter.id}`}
                aria-label={`Jump to chapter ${chapter.title} at ${formatMediaTime(chapter.timeSeconds)}`}
                onClick={() => handleSeek(chapter.timeSeconds)}
                style={{
                  left: `${chapter.percent}%`,
                  backgroundColor: isCurrentChapter
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-secondary-main)',
                }}
                className="prism-focus-ring absolute z-20 w-2.5 h-2.5 -ml-1.25 rounded-full cursor-pointer disabled:cursor-not-allowed enabled:hover:scale-125 transition-transform"
              />
            );
          })}
        </div>

        {/* Transport & Utility Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              data-testid="video-play-button"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              aria-pressed={isPlaying}
              onClick={handleTogglePlay}
              className="prism-btn-primary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer disabled:cursor-not-allowed"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
              ) : (
                <Play className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
              )}
              <span className="relative z-10">{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <span
              data-testid="video-time-readout"
              className="prism-well px-2.5 py-1 rounded-full font-mono text-xs font-medium tabular-nums"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {formattedCurrent} / {formattedDuration}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mute Toggle & Volume Slider */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="video-mute-button"
                aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                aria-pressed={isMuted}
                onClick={handleToggleMute}
                className="prism-well prism-focus-ring h-8 w-8 rounded-full inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {isMuted || displayedVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>

              <input
                id={volumeId}
                type="range"
                data-testid="video-volume-slider"
                aria-label="Volume"
                min={0}
                max={100}
                step={1}
                value={displayedVolume}
                onChange={(event) => handleVolumeChange(Number(event.target.value))}
                className="prism-focus-ring w-20 accent-[var(--prism-primary-main)] cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Playback Speed Cycle */}
            <button
              type="button"
              data-testid="video-speed-button"
              aria-label={`Playback speed ${speed}x`}
              onClick={handleCycleSpeed}
              className="prism-well prism-focus-ring h-8 px-2.5 rounded-full font-mono text-xs font-semibold tabular-nums cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {speed}x
            </button>

            {/* Captions Toggle */}
            <button
              type="button"
              data-testid="video-captions-button"
              aria-label="Toggle captions"
              aria-pressed={captionsEnabled}
              onClick={handleToggleCaptions}
              className={cx(
                'prism-focus-ring h-8 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-semibold cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all',
                captionsEnabled ? 'prism-emerald' : 'prism-well'
              )}
              style={captionsEnabled ? undefined : { color: 'var(--prism-text-primary)' }}
            >
              <Captions className="w-3.5 h-3.5" aria-hidden="true" />
              <span>CC</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              data-testid="video-fullscreen-button"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-pressed={isFullscreen}
              onClick={handleToggleFullscreen}
              className="prism-well prism-focus-ring h-8 w-8 rounded-full inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Chapter Pill Strip */}
        {normalizedChapters.length > 0 ? (
          <div
            role="group"
            aria-label="Video chapters"
            data-testid="video-chapter-strip"
            className="flex flex-wrap items-center gap-1.5 pt-2 border-t"
            style={{ borderColor: 'var(--prism-divider)' }}
          >
            {normalizedChapters.map((chapter) => {
              const isCurrentChapter = activeChapter?.reactKey === chapter.reactKey;
              return (
                <button
                  key={chapter.reactKey}
                  type="button"
                  data-testid={`video-chapter-pill-${chapter.id}`}
                  aria-pressed={isCurrentChapter}
                  onClick={() => handleSeek(chapter.timeSeconds)}
                  className={cx(
                    'prism-focus-ring px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all',
                    isCurrentChapter ? 'prism-emerald' : 'prism-well'
                  )}
                  style={isCurrentChapter ? undefined : { color: 'var(--prism-text-primary)' }}
                >
                  <span className="font-mono text-[11px] tabular-nums">
                    {formatMediaTime(chapter.timeSeconds)}
                  </span>
                  <span className="truncate max-w-[180px]">{chapter.title}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

CustomVideoPlayer.displayName = 'CustomVideoPlayer';
