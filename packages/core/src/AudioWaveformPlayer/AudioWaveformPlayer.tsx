'use client';

import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { AudioLines, Pause, Play } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface AudioWaveformPlayerProps extends BaseProps<HTMLDivElement> {
  /** Primary track title displayed in the player header (defaults to 'Audio Track'). */
  title?: string;
  /** Optional artist, speaker, or recording subtitle rendered as literal text. */
  subtitle?: string;
  /** Normalized amplitude peaks (0..1); each value is sanitized and clamped to [0.08..1]. */
  peaks: ReadonlyArray<number>;
  /** Total track duration in seconds, clamped safely to [1..86400] (defaults to 120). */
  durationSeconds?: number;
  /** Controlled playback timestamp in seconds. */
  currentTimeSeconds?: number;
  /** Initial playback timestamp in seconds for uncontrolled mode (defaults to 0). */
  defaultTimeSeconds?: number;
  /** Callback fired whenever the playback timestamp changes via bar click or keyboard seek. */
  onSeek?: (seconds: number) => void;
  /** Callback fired whenever playback toggles between playing and paused. */
  onPlayStateChange?: (playing: boolean) => void;
  /** Initial playback speed multiplier (defaults to 1). */
  defaultSpeed?: number;
}

interface WaveformBar {
  id: string;
  barIndex: number;
  amplitude: number;
  targetSeconds: number;
  ratio: number;
}

const AUDIO_SPEED_OPTIONS: readonly number[] = [1, 1.25, 1.5, 2, 0.75];
const FALLBACK_PEAKS: readonly number[] = [
  0.24, 0.42, 0.68, 0.52, 0.84, 0.92, 0.61, 0.45,
  0.76, 0.88, 0.54, 0.36, 0.72, 0.64, 0.48, 0.3,
];
const DEFAULT_DURATION_SECONDS = 120;
const MIN_DURATION_SECONDS = 1;
const MAX_DURATION_SECONDS = 86400;
const MIN_PEAK_AMPLITUDE = 0.08;
const MAX_PEAK_AMPLITUDE = 1;

function normalizeAudioSpeed(raw: number): number {
  return AUDIO_SPEED_OPTIONS.includes(raw) ? raw : 1;
}

function getNextAudioSpeed(current: number): number {
  switch (current) {
    case 1:
      return 1.25;
    case 1.25:
      return 1.5;
    case 1.5:
      return 2;
    case 2:
      return 0.75;
    default:
      return 1;
  }
}

function formatAudioTime(rawSeconds: number): string {
  const safe = Math.max(0, Math.floor(rawSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const waveformClass = /*#__PURE__*/ stableClassName('audio-waveform-player', 'waveform');

function AudioWaveformPlayerInner({
  title = 'Audio Track',
  subtitle,
  peaks,
  durationSeconds = DEFAULT_DURATION_SECONDS,
  currentTimeSeconds,
  defaultTimeSeconds = 0,
  onSeek,
  onPlayStateChange,
  defaultSpeed = 1,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AudioWaveformPlayerProps) {
  const override = useComponentOverride('AudioWaveformPlayer');

  const safeDuration = clampNumber(
    durationSeconds,
    MIN_DURATION_SECONDS,
    MAX_DURATION_SECONDS,
    DEFAULT_DURATION_SECONDS
  );
  const safeDefaultTime = clampNumber(defaultTimeSeconds, 0, safeDuration, 0);
  const controlledTime =
    currentTimeSeconds !== undefined
      ? clampNumber(currentTimeSeconds, 0, safeDuration, 0)
      : undefined;

  const [rawCurrentTime, setCurrentTime] = useControllableState<number>({
    value: controlledTime,
    defaultValue: safeDefaultTime,
    onChange: onSeek,
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(() => normalizeAudioSpeed(defaultSpeed));

  const safeCurrentTime = clampNumber(rawCurrentTime, 0, safeDuration, 0);
  const progressRatio = clampNumber(safeCurrentTime / safeDuration, 0, 1, 0);
  const isFallbackWaveform = peaks.length === 0;

  const bars = useMemo<readonly WaveformBar[]>(() => {
    const sourcePeaks = peaks.length > 0 ? peaks : FALLBACK_PEAKS;
    const count = sourcePeaks.length;
    const items: WaveformBar[] = [];
    let barIndex = 0;
    for (const rawPeak of sourcePeaks) {
      const amplitude = clampNumber(
        rawPeak,
        MIN_PEAK_AMPLITUDE,
        MAX_PEAK_AMPLITUDE,
        MIN_PEAK_AMPLITUDE
      );
      const targetSeconds =
        count <= 1 ? 0 : Math.round((barIndex / (count - 1)) * safeDuration);
      items.push({
        id: `wf-bar-${count}-${barIndex}`,
        barIndex,
        amplitude,
        targetSeconds: clampNumber(targetSeconds, 0, safeDuration, 0),
        ratio: barIndex / count,
      });
      barIndex += 1;
    }
    return items;
  }, [peaks, safeDuration]);

  const seekTo = useCallback(
    (nextSeconds: number) => {
      const clamped = clampNumber(nextSeconds, 0, safeDuration, 0);
      setCurrentTime(clamped);
    },
    [safeDuration, setCurrentTime]
  );

  const handleTogglePlay = useCallback(() => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    onPlayStateChange?.(nextPlaying);
  }, [isPlaying, onPlayStateChange]);

  const handleCycleSpeed = useCallback(() => {
    setSpeed((prev) => getNextAudioSpeed(prev));
  }, []);

  const handleScrubberKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;

      const seekStep = Math.max(1, Math.min(10, Math.round(safeDuration / 24)));

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekTo(safeCurrentTime + seekStep);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekTo(safeCurrentTime - seekStep);
      } else if (event.key === 'Home') {
        event.preventDefault();
        seekTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        seekTo(safeDuration);
      }
    },
    [safeCurrentTime, safeDuration, seekTo]
  );

  const merged = mergeProps({
    themeTarget: themeProps('audio-waveform-player', {
      playing: isPlaying,
      fallback: isFallbackWaveform,
    }),
    baseClassName: 'prism-slab w-full p-4 space-y-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const formattedCurrent = formatAudioTime(safeCurrentTime);
  const formattedDuration = formatAudioTime(safeDuration);

  return (
    <div ref={ref} role="region" aria-label={title} {...rest} {...merged}>
      {/* Header Transport Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            data-testid="audio-play-button"
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            aria-pressed={isPlaying}
            onClick={handleTogglePlay}
            className="prism-btn-primary prism-focus-ring w-11 h-11 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 relative z-10" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 relative z-10" aria-hidden="true" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <AudioLines
                className="w-3.5 h-3.5 shrink-0"
                aria-hidden="true"
                style={{
                  color: isPlaying ? 'var(--prism-primary-main)' : 'var(--prism-secondary-main)',
                }}
              />
              <span
                data-testid="audio-title"
                className="text-sm font-semibold truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                {title}
              </span>
            </div>

            {subtitle ? (
              <p
                data-testid="audio-subtitle"
                className="text-xs truncate mt-0.5"
                style={STYLE_TEXT_SECONDARY}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            data-testid="audio-time-readout"
            className="prism-well px-2.5 py-1 rounded-full font-mono text-xs font-medium tabular-nums"
            style={STYLE_TEXT_SECONDARY}
          >
            {formattedCurrent} / {formattedDuration}
          </span>

          <button
            type="button"
            data-testid="audio-speed-button"
            aria-label={`Playback speed ${speed}x`}
            onClick={handleCycleSpeed}
            className="prism-crystal prism-focus-ring h-8 px-2.5 rounded-full font-mono text-xs font-semibold tabular-nums cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_PRIMARY}
          >
            {speed}x
          </button>
        </div>
      </div>

      {/* Interactive Optical Waveform Scrubber */}
      <div
        role="slider"
        tabIndex={0}
        data-testid="audio-waveform-scrubber"
        data-fallback-waveform={isFallbackWaveform ? 'true' : undefined}
        aria-label={`${title} waveform scrubber`}
        aria-valuemin={0}
        aria-valuemax={safeDuration}
        aria-valuenow={Math.round(safeCurrentTime)}
        aria-valuetext={`${formattedCurrent} of ${formattedDuration}`}
        onKeyDown={handleScrubberKeyDown}
        className={cx(
          waveformClass,
          'prism-well prism-focus-ring rounded-2xl px-3 py-3 h-20 flex items-end gap-1'
        )}
      >
        {bars.map((bar) => {
          const isPlayed =
            progressRatio > 0 && (progressRatio >= 1 || bar.ratio < progressRatio);
          return (
            <button
              key={bar.id}
              type="button"
              tabIndex={-1}
              data-testid={`waveform-bar-${bar.barIndex}`}
              data-played={isPlayed ? 'true' : 'false'}
              data-amplitude={bar.amplitude.toFixed(2)}
              aria-label={`Seek to ${formatAudioTime(bar.targetSeconds)}`}
              onClick={() => seekTo(bar.targetSeconds)}
              style={{
                height: `${Math.round(bar.amplitude * 100)}%`,
                backgroundColor: isPlayed
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-secondary-main)',
                opacity: isPlayed ? 1 : 0.35,
              }}
              className="flex-1 min-w-[3px] rounded-full cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-110 transition-[color,background-color,border-color,opacity,transform] duration-150"
            />
          );
        })}
      </div>
    </div>
  );
}

export const AudioWaveformPlayer = /*#__PURE__*/ memoWithDisplayName(AudioWaveformPlayerInner, 'AudioWaveformPlayer');
