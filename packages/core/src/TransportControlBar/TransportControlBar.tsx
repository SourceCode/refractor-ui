'use client';

import { memo, useCallback, type KeyboardEvent } from 'react';
import { Circle, Pause, Play, Repeat, SkipBack, SkipForward, Square } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type TransportPlaybackState = 'stopped' | 'playing' | 'paused' | 'recording';

export interface TransportControlBarProps extends BaseProps<HTMLDivElement> {
  /** Controlled transport playback state ('stopped' | 'playing' | 'paused' | 'recording'). */
  playbackState?: TransportPlaybackState;
  /** Initial transport playback state in uncontrolled mode (defaults to 'stopped'). */
  defaultPlaybackState?: TransportPlaybackState;
  /** Callback fired whenever the transport playback state transitions. */
  onPlaybackStateChange?: (state: TransportPlaybackState) => void;
  /** Controlled loop playback flag. */
  loop?: boolean;
  /** Initial loop state in uncontrolled mode (defaults to false). */
  defaultLoop?: boolean;
  /** Callback fired whenever loop mode toggles. */
  onLoopChange?: (loop: boolean) => void;
  /** Whether to render and enable the Record control and R shortcut (defaults to true). */
  allowRecord?: boolean;
  /** Callback fired when Jump to Start is activated or Home is pressed. */
  onJumpStart?: () => void;
  /** Callback fired when Jump to End is activated or End is pressed. */
  onJumpEnd?: () => void;
  /** Optional custom status readout displayed inside the recessed status well (e.g. 'REC · Ch 1–2'). */
  statusLabel?: string;
  /** Disables all transport buttons and ignores toolbar keyboard shortcuts (defaults to false). */
  disabled?: boolean;
}

interface PlaybackStateVisualMeta {
  label: string;
  dotClass: string;
  dotColorVar: string;
  textColorVar: string;
}

function getPlaybackStateVisualMeta(state: TransportPlaybackState): PlaybackStateVisualMeta {
  switch (state) {
    case 'playing':
      return {
        label: 'PLAYING',
        dotClass: 'animate-pulse motion-reduce:animate-none',
        dotColorVar: 'var(--prism-primary-main)',
        textColorVar: 'var(--prism-primary-main)',
      };
    case 'paused':
      return {
        label: 'PAUSED',
        dotClass: '',
        dotColorVar: 'var(--prism-warning-main)',
        textColorVar: 'var(--prism-warning-main)',
      };
    case 'recording':
      return {
        label: 'RECORDING',
        dotClass: 'animate-pulse motion-reduce:animate-none',
        dotColorVar: 'var(--prism-error-main)',
        textColorVar: 'var(--prism-error-main)',
      };
    case 'stopped':
      return {
        label: 'STOPPED',
        dotClass: '',
        dotColorVar: 'var(--prism-text-disabled)',
        textColorVar: 'var(--prism-text-secondary)',
      };
  }
}

function TransportControlBarInner({
  playbackState,
  defaultPlaybackState = 'stopped',
  onPlaybackStateChange,
  loop,
  defaultLoop = false,
  onLoopChange,
  allowRecord = true,
  onJumpStart,
  onJumpEnd,
  statusLabel,
  disabled = false,
  onKeyDown,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TransportControlBarProps) {
  const override = useComponentOverride('TransportControlBar');

  const [currentPlaybackState, setCurrentPlaybackState] =
    useControllableState<TransportPlaybackState>({
      value: playbackState,
      defaultValue: defaultPlaybackState,
      onChange: onPlaybackStateChange,
    });

  const [isLooping, setIsLooping] = useControllableState<boolean>({
    value: loop,
    defaultValue: defaultLoop,
    onChange: onLoopChange,
  });

  const isPlaying = currentPlaybackState === 'playing';
  const isRecording = currentPlaybackState === 'recording';
  const stateVisual = getPlaybackStateVisualMeta(currentPlaybackState);

  const handleTogglePlay = useCallback(() => {
    setCurrentPlaybackState(isPlaying ? 'paused' : 'playing');
  }, [isPlaying, setCurrentPlaybackState]);

  const handleStop = useCallback(() => {
    setCurrentPlaybackState('stopped');
  }, [setCurrentPlaybackState]);

  const handleToggleRecord = useCallback(() => {
    setCurrentPlaybackState(isRecording ? 'stopped' : 'recording');
  }, [isRecording, setCurrentPlaybackState]);

  const handleToggleLoop = useCallback(() => {
    setIsLooping(!isLooping);
  }, [isLooping, setIsLooping]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (
        disabled ||
        event.defaultPrevented ||
        event.nativeEvent.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      switch (event.key) {
        case ' ':
          if (event.target === event.currentTarget) {
            event.preventDefault();
            handleTogglePlay();
          }
          break;
        case 'Home':
          event.preventDefault();
          onJumpStart?.();
          break;
        case 'End':
          event.preventDefault();
          onJumpEnd?.();
          break;
        case 'l':
        case 'L':
          event.preventDefault();
          handleToggleLoop();
          break;
        case 'r':
        case 'R':
          if (allowRecord) {
            event.preventDefault();
            handleToggleRecord();
          }
          break;
        default:
          break;
      }
    },
    [
      allowRecord,
      disabled,
      handleToggleLoop,
      handleTogglePlay,
      handleToggleRecord,
      onJumpEnd,
      onJumpStart,
      onKeyDown,
    ]
  );

  const merged = mergeProps({
    themeTarget: themeProps('transport-control-bar', {
      state: currentPlaybackState,
      loop: isLooping,
      disabled,
    }),
    baseClassName:
      'prism-slab prism-focus-ring p-3 w-full max-w-full flex flex-wrap items-center justify-between gap-2.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const controlsGroupClass = stableClassName('transport-control-bar', 'controls');
  const statusGroupClass = stableClassName('transport-control-bar', 'status');

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Media transport controls"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      {...rest}
      {...merged}
      onKeyDown={handleKeyDown}
    >
      <div className={cx(controlsGroupClass, 'flex flex-wrap items-center gap-1.5 min-w-0 max-w-full')}>
        <button
          type="button"
          disabled={disabled}
          aria-label="Jump to start"
          data-testid="transport-jump-start"
          onClick={onJumpStart}
          className="prism-crystal prism-focus-ring h-9 w-9 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          style={STYLE_TEXT_PRIMARY}
        >
          <SkipBack aria-hidden="true" className="w-4 h-4 shrink-0" />
        </button>

        <button
          type="button"
          disabled={disabled}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
          data-testid="transport-play-pause"
          onClick={handleTogglePlay}
          className={cx(
            isPlaying
              ? 'prism-btn-primary font-semibold'
              : 'prism-crystal font-medium enabled:hover:brightness-105',
            'prism-focus-ring h-9 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]'
          )}
          style={isPlaying ? undefined : { color: 'var(--prism-text-primary)' }}
        >
          {isPlaying ? (
            <>
              <Pause aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
              <span className="relative z-10">Pause</span>
            </>
          ) : (
            <>
              <Play aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Play</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={disabled}
          aria-label="Stop"
          data-testid="transport-stop"
          onClick={handleStop}
          className="prism-crystal prism-focus-ring h-9 w-9 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          style={STYLE_TEXT_PRIMARY}
        >
          <Square aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
        </button>

        {allowRecord ? (
          <button
            type="button"
            disabled={disabled}
            aria-label="Record"
            aria-pressed={isRecording}
            data-testid="transport-record"
            data-recording={isRecording ? 'true' : undefined}
            onClick={handleToggleRecord}
            className="prism-crystal prism-focus-ring h-9 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={
              isRecording
                ? {
                    color: 'var(--prism-error-main)',
                    boxShadow: 'inset 0 0 0 1.5px var(--prism-error-main)',
                  }
                : { color: 'var(--prism-text-primary)' }
            }
          >
            <Circle
              aria-hidden="true"
              data-testid="transport-record-indicator"
              className={cx('w-3 h-3 shrink-0', isRecording && 'animate-pulse motion-reduce:animate-none')}
              style={{
                color: 'var(--prism-error-main)',
                fill: isRecording ? 'var(--prism-error-main)' : 'none',
              }}
            />
            <span>Rec</span>
          </button>
        ) : null}

        <button
          type="button"
          disabled={disabled}
          aria-label="Loop"
          aria-pressed={isLooping}
          data-testid="transport-loop"
          onClick={handleToggleLoop}
          className={cx(
            isLooping
              ? 'prism-emerald font-semibold'
              : 'prism-crystal font-medium enabled:hover:brightness-105',
            'prism-focus-ring h-9 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]'
          )}
          style={isLooping ? undefined : { color: 'var(--prism-text-primary)' }}
        >
          <Repeat aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Loop</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          aria-label="Jump to end"
          data-testid="transport-jump-end"
          onClick={onJumpEnd}
          className="prism-crystal prism-focus-ring h-9 w-9 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          style={STYLE_TEXT_PRIMARY}
        >
          <SkipForward aria-hidden="true" className="w-4 h-4 shrink-0" />
        </button>
      </div>

      <div
        role="status"
        aria-live="polite"
        data-testid="transport-status-badge"
        data-state={currentPlaybackState}
        className={cx(
          statusGroupClass,
          'prism-well px-3 py-1.5 rounded-full inline-flex flex-wrap items-center gap-2 min-w-0 max-w-full'
        )}
      >
        <span className="inline-flex items-center gap-1.5 shrink-0">
          <span
            aria-hidden="true"
            data-testid="transport-status-dot"
            className={cx('w-2 h-2 rounded-full shrink-0', stateVisual.dotClass)}
            style={{ backgroundColor: stateVisual.dotColorVar }}
          />
          <span
            data-testid="transport-state-text"
            className="font-mono text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap"
            style={{ color: stateVisual.textColorVar }}
          >
            {stateVisual.label}
          </span>
        </span>

        {statusLabel ? (
          <span
            data-testid="transport-status-label"
            className="text-xs font-medium truncate max-w-full pl-2 border-l"
            style={{
              color: 'var(--prism-text-secondary)',
              borderColor: 'var(--prism-divider)',
            }}
          >
            {statusLabel}
          </span>
        ) : null}

        {isLooping ? (
          <span
            data-testid="transport-loop-pill"
            className="prism-emerald inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap shrink-0"
          >
            LOOP
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const TransportControlBar = memo(TransportControlBarInner);
TransportControlBar.displayName = 'TransportControlBar';
