'use client';

import { useMemo, type KeyboardEvent } from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

type FrameStepperRateSelectorBaseProps = Omit<BaseProps<HTMLDivElement>, 'onRateChange'>;

export interface FrameStepperRateSelectorProps extends FrameStepperRateSelectorBaseProps {
  /** Controlled current frame index clamped to [0..totalFrames]. */
  frame?: number;
  /** Initial frame index in uncontrolled mode (defaults to 0). */
  defaultFrame?: number;
  /** Total frame count representing the inclusive upper frame bound (defaults to 1800, clamped >= 1). */
  totalFrames?: number;
  /** Frame rate in frames per second used to compute MM:SS.cc timecode (defaults to 30, clamped 1..120). */
  fps?: number;
  /** Large frame-jump delta for -{jumpStep}f / +{jumpStep}f buttons and Shift+Arrow keys (defaults to 10, clamped 2..120). */
  jumpStep?: number;
  /** Callback fired whenever the clamped frame index changes. */
  onFrameChange?: (frame: number) => void;
  /** Controlled playback rate multiplier. */
  rate?: number;
  /** Initial playback rate multiplier in uncontrolled mode (defaults to 1). */
  defaultRate?: number;
  /** Available positive finite playback rates (defaults to [0.25, 0.5, 1, 1.5, 2], deduplicated). */
  rates?: ReadonlyArray<number>;
  /** Callback fired whenever the selected playback rate changes. */
  onRateChange?: (rate: number) => void;
  /** Disables frame stepping buttons, readout keyboard control, and playback rate pills. */
  disabled?: boolean;
}

type NonEmptyRateList = readonly [number, ...number[]];

const DEFAULT_TOTAL_FRAMES = 1800;
const MIN_TOTAL_FRAMES = 1;
const DEFAULT_FPS = 30;
const MIN_FPS = 1;
const MAX_FPS = 120;
const DEFAULT_JUMP_STEP = 10;
const MIN_JUMP_STEP = 2;
const MAX_JUMP_STEP = 120;
const DEFAULT_RATE = 1;
const DEFAULT_RATES: NonEmptyRateList = [0.25, 0.5, 1, 1.5, 2];

function sanitizeTotalFrames(totalFrames: number): number {
  return Math.round(
    clampNumber(totalFrames, MIN_TOTAL_FRAMES, Number.MAX_SAFE_INTEGER, DEFAULT_TOTAL_FRAMES)
  );
}

function sanitizeFps(fps: number): number {
  return clampNumber(fps, MIN_FPS, MAX_FPS, DEFAULT_FPS);
}

function sanitizeJumpStep(jumpStep: number): number {
  return Math.round(clampNumber(jumpStep, MIN_JUMP_STEP, MAX_JUMP_STEP, DEFAULT_JUMP_STEP));
}

function sanitizeFrame(frame: number, totalFrames: number, fallback: number): number {
  return Math.round(clampNumber(frame, 0, totalFrames, fallback));
}

function sanitizeRates(rates?: ReadonlyArray<number>): NonEmptyRateList {
  if (!rates || rates.length === 0) {
    return DEFAULT_RATES;
  }
  const seen = new Set<number>();
  const clean: number[] = [];
  for (const candidate of rates) {
    if (Number.isFinite(candidate) && candidate > 0 && !seen.has(candidate)) {
      seen.add(candidate);
      clean.push(candidate);
    }
  }
  const [first, ...rest] = clean;
  return first !== undefined ? [first, ...rest] : DEFAULT_RATES;
}

function resolveRate(
  candidate: number,
  safeRates: NonEmptyRateList,
  fallback: number
): number {
  if (Number.isFinite(candidate) && safeRates.includes(candidate)) {
    return candidate;
  }
  return fallback;
}

function formatFrameNumber(frame: number, totalFrames: number): string {
  const width = Math.max(4, String(totalFrames).length);
  return String(frame).padStart(width, '0');
}

function formatTimecode(frame: number, fps: number): string {
  const totalCentiseconds = Math.round((frame / fps) * 100);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function formatRateLabel(rate: number): string {
  return `${rate}\u00D7`;
}

export function FrameStepperRateSelector({
  frame,
  defaultFrame = 0,
  totalFrames = DEFAULT_TOTAL_FRAMES,
  fps = DEFAULT_FPS,
  jumpStep = DEFAULT_JUMP_STEP,
  onFrameChange,
  rate,
  defaultRate = DEFAULT_RATE,
  rates,
  onRateChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FrameStepperRateSelectorProps) {
  const override = useComponentOverride('FrameStepperRateSelector');

  const safeTotalFrames = sanitizeTotalFrames(totalFrames);
  const safeFps = sanitizeFps(fps);
  const safeJumpStep = sanitizeJumpStep(jumpStep);
  const safeRates = useMemo<NonEmptyRateList>(() => sanitizeRates(rates), [rates]);

  const safeDefaultFrame = sanitizeFrame(defaultFrame, safeTotalFrames, 0);
  const baseFallbackRate = safeRates.includes(DEFAULT_RATE) ? DEFAULT_RATE : safeRates[0];
  const safeDefaultRate = resolveRate(defaultRate, safeRates, baseFallbackRate);

  const [rawFrame, setRawFrame] = useControllableState<number>({
    value: frame,
    defaultValue: safeDefaultFrame,
    onChange: onFrameChange,
  });

  const [rawRate, setRawRate] = useControllableState<number>({
    value: rate,
    defaultValue: safeDefaultRate,
    onChange: onRateChange,
  });

  const currentFrame = sanitizeFrame(rawFrame, safeTotalFrames, safeDefaultFrame);
  const currentRate = resolveRate(rawRate, safeRates, safeDefaultRate);

  const canStepBackward = !disabled && currentFrame > 0;
  const canStepForward = !disabled && currentFrame < safeTotalFrames;

  const paddedFrame = formatFrameNumber(currentFrame, safeTotalFrames);
  const timecode = formatTimecode(currentFrame, safeFps);
  const readoutValueText = `Frame ${currentFrame} of ${safeTotalFrames}, ${timecode} at ${safeFps} fps`;

  const commitFrame = (nextRaw: number) => {
    const next = sanitizeFrame(nextRaw, safeTotalFrames, currentFrame);
    if (next !== currentFrame) {
      setRawFrame(next);
    }
  };

  const handleReadoutKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || e.nativeEvent.isComposing) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        commitFrame(currentFrame - (e.shiftKey ? safeJumpStep : 1));
        break;
      case 'ArrowRight':
        e.preventDefault();
        commitFrame(currentFrame + (e.shiftKey ? safeJumpStep : 1));
        break;
      case 'Home':
        e.preventDefault();
        commitFrame(0);
        break;
      case 'End':
        e.preventDefault();
        commitFrame(safeTotalFrames);
        break;
      default:
        break;
    }
  };

  const handleSelectRate = (nextRate: number) => {
    if (nextRate !== currentRate) {
      setRawRate(nextRate);
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('frame-stepper-rate-selector', {
      disabled,
      atStart: currentFrame <= 0,
      atEnd: currentFrame >= safeTotalFrames,
      rate: currentRate,
    }),
    baseClassName:
      'prism-slab flex flex-wrap items-center justify-between gap-3 px-3 py-2 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const stepperGroupMerged = mergeProps({
    themeTarget: themeProps('frame-stepper-rate-selector', { disabled }, 'stepper-group'),
    baseClassName: 'flex flex-wrap items-center gap-1.5 max-w-full',
  });

  const stepButtonClass = cx(
    themeProps('frame-stepper-rate-selector', undefined, 'step-button').className,
    'prism-crystal prism-focus-ring h-8 px-2.5 rounded-xl font-mono text-xs font-semibold tabular-nums inline-flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all'
  );

  const readoutMerged = mergeProps({
    themeTarget: themeProps('frame-stepper-rate-selector', { disabled }, 'readout'),
    baseClassName: cx(
      'prism-well prism-focus-ring h-8 px-3 rounded-xl inline-flex items-center justify-center gap-0.5 font-mono text-xs tabular-nums whitespace-nowrap shrink-0 select-none focus:outline-none transition-opacity',
      disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-default'
    ),
  });

  const rateGroupMerged = mergeProps({
    themeTarget: themeProps('frame-stepper-rate-selector', { disabled }, 'rate-group'),
    baseClassName:
      'prism-crystal inline-flex flex-wrap items-center gap-1 p-1 rounded-full max-w-full',
  });

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Frame stepper and playback rate"
      {...rest}
      {...merged}
    >
      <div role="group" aria-label="Frame stepper" {...stepperGroupMerged}>
        <button
          type="button"
          aria-label={`Step back ${safeJumpStep} frames (-${safeJumpStep}f)`}
          disabled={!canStepBackward}
          onClick={() => commitFrame(currentFrame - safeJumpStep)}
          className={stepButtonClass}
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {`-${safeJumpStep}f`}
        </button>

        <button
          type="button"
          aria-label="Step back 1 frame (-1f)"
          disabled={!canStepBackward}
          onClick={() => commitFrame(currentFrame - 1)}
          className={stepButtonClass}
          style={{ color: 'var(--prism-text-primary)' }}
        >
          -1f
        </button>

        <div
          role="spinbutton"
          tabIndex={disabled ? -1 : 0}
          aria-label="Current frame"
          aria-valuemin={0}
          aria-valuemax={safeTotalFrames}
          aria-valuenow={currentFrame}
          aria-valuetext={readoutValueText}
          aria-disabled={disabled || undefined}
          onKeyDown={handleReadoutKeyDown}
          {...readoutMerged}
        >
          <span className="font-semibold" style={{ color: 'var(--prism-text-primary)' }}>
            {`F ${paddedFrame} / ${safeTotalFrames}`}
          </span>
          <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
            {' \u00B7 '}
          </span>
          <span style={{ color: 'var(--prism-text-secondary)' }}>{timecode}</span>
        </div>

        <button
          type="button"
          aria-label="Step forward 1 frame (+1f)"
          disabled={!canStepForward}
          onClick={() => commitFrame(currentFrame + 1)}
          className={stepButtonClass}
          style={{ color: 'var(--prism-text-primary)' }}
        >
          +1f
        </button>

        <button
          type="button"
          aria-label={`Step forward ${safeJumpStep} frames (+${safeJumpStep}f)`}
          disabled={!canStepForward}
          onClick={() => commitFrame(currentFrame + safeJumpStep)}
          className={stepButtonClass}
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {`+${safeJumpStep}f`}
        </button>
      </div>

      <div role="group" aria-label="Playback rate" {...rateGroupMerged}>
        {safeRates.map((rateOption) => {
          const selected = rateOption === currentRate;
          const rateOptionMerged = mergeProps({
            themeTarget: themeProps(
              'frame-stepper-rate-selector',
              { selected, disabled },
              'rate-option'
            ),
            baseClassName: cx(
              'prism-focus-ring h-7 px-2.5 rounded-full font-mono text-xs tabular-nums inline-flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-all',
              selected
                ? 'prism-btn-primary font-semibold'
                : 'font-medium enabled:hover:brightness-105'
            ),
            baseStyle: {
              color: selected ? 'var(--prism-primary-contrast)' : 'var(--prism-text-secondary)',
            },
          });

          return (
            <button
              key={rateOption}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => handleSelectRate(rateOption)}
              {...rateOptionMerged}
            >
              <span className="relative z-10">{formatRateLabel(rateOption)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

FrameStepperRateSelector.displayName = 'FrameStepperRateSelector';
