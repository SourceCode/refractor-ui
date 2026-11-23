'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { memoWithDisplayName } from '../utils/memo';
import { STYLE_SUCCESS_CONTRAST } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type HoldToConfirmTone = 'destructive' | 'primary' | 'amber';

export interface HoldToConfirmButtonProps extends BaseProps<HTMLButtonElement> {
  /** Idle label rendered before holding begins. */
  label: string;
  /** Label rendered while the button is actively held (default 'Hold to confirm...'). */
  holdingLabel?: string;
  /** Label rendered alongside a check icon after hold reaches 100% (default 'Confirmed'). */
  confirmedLabel?: string;
  /** Required hold duration in milliseconds, clamped to 200..5000 (default 1200). */
  holdDurationMs?: number;
  /** Callback invoked once when hold progress reaches 100%. */
  onConfirm: () => void;
  /** Semantic optical tone ('destructive' | 'primary' | 'amber', default 'destructive'). */
  tone?: HoldToConfirmTone;
  /** Disables pointer and keyboard hold interactions. */
  disabled?: boolean;
  /** Duration in milliseconds before confirmed state resets back to idle (default 1800). */
  resetAfterMs?: number;
}

const TICK_INTERVAL_MS = 40;
const MIN_HOLD_DURATION_MS = 200;
const MAX_HOLD_DURATION_MS = 5000;
const DEFAULT_HOLD_DURATION_MS = 1200;
const DEFAULT_RESET_AFTER_MS = 1800;

interface ToneVisualTokens {
  textColorVar: string;
  borderColorVar: string;
  fillColorVar: string;
}

function getToneVisualTokens(tone: HoldToConfirmTone): ToneVisualTokens {
  switch (tone) {
    case 'primary':
      return {
        textColorVar: 'var(--prism-primary-main)',
        borderColorVar: 'var(--prism-primary-main)',
        fillColorVar: 'var(--prism-primary-main)',
      };
    case 'amber':
      return {
        textColorVar: 'var(--prism-amber-text, var(--prism-warning-main))',
        borderColorVar: 'var(--prism-amber-border, var(--prism-warning-main))',
        fillColorVar: 'var(--prism-warning-main)',
      };
    case 'destructive':
    default:
      return {
        textColorVar: 'var(--prism-rose-text, var(--prism-error-main))',
        borderColorVar: 'var(--prism-rose-border, var(--prism-error-main))',
        fillColorVar: 'var(--prism-error-main)',
      };
  }
}

function isHoldTriggerKey(key: string): boolean {
  return key === ' ' || key === 'Spacebar' || key === 'Enter';
}

const fillClass = /*#__PURE__*/ stableClassName('hold-to-confirm-button', 'fill');
const contentClass = /*#__PURE__*/ stableClassName('hold-to-confirm-button', 'content');

function HoldToConfirmButtonInner({
  label,
  holdingLabel = 'Hold to confirm...',
  confirmedLabel = 'Confirmed',
  holdDurationMs = DEFAULT_HOLD_DURATION_MS,
  onConfirm,
  tone = 'destructive',
  disabled = false,
  resetAfterMs = DEFAULT_RESET_AFTER_MS,
  className,
  style,
  xstyle,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
  onBlur,
  ref,
  ...rest
}: HoldToConfirmButtonProps) {
  const override = useComponentOverride('HoldToConfirmButton');

  const clampedDurationMs = clampNumber(
    holdDurationMs,
    MIN_HOLD_DURATION_MS,
    MAX_HOLD_DURATION_MS,
    DEFAULT_HOLD_DURATION_MS
  );
  const safeResetAfterMs = clampNumber(resetAfterMs, 0, 60000, DEFAULT_RESET_AFTER_MS);

  const [holding, setHolding] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const isConfirmedRef = useRef<boolean>(false);
  const onConfirmRef = useRef(onConfirm);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  const clearHoldInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearHoldInterval();
      clearResetTimer();
    };
  }, [clearHoldInterval, clearResetTimer]);

  useEffect(() => {
    if (disabled && isHoldingRef.current) {
      clearHoldInterval();
      isHoldingRef.current = false;
      elapsedRef.current = 0;
      setHolding(false);
      setProgress(0);
      setAnnouncement('');
    }
  }, [disabled, clearHoldInterval]);

  const startHold = useCallback(() => {
    if (disabled || isHoldingRef.current || isConfirmedRef.current) return;

    clearHoldInterval();
    isHoldingRef.current = true;
    elapsedRef.current = 0;
    setHolding(true);
    setProgress(0);
    setAnnouncement(holdingLabel);

    intervalRef.current = setInterval(() => {
      elapsedRef.current += TICK_INTERVAL_MS;
      const reachedEnd = elapsedRef.current >= clampedDurationMs;
      const nextProgress = reachedEnd
        ? 100
        : Math.min(99, Math.floor((elapsedRef.current / clampedDurationMs) * 100));

      setProgress(nextProgress);

      if (reachedEnd) {
        clearHoldInterval();
        isHoldingRef.current = false;
        isConfirmedRef.current = true;
        setHolding(false);
        setConfirmed(true);
        setAnnouncement(confirmedLabel);
        onConfirmRef.current();

        clearResetTimer();
        resetTimerRef.current = setTimeout(() => {
          resetTimerRef.current = null;
          isConfirmedRef.current = false;
          setConfirmed(false);
          setProgress(0);
          setAnnouncement('');
        }, safeResetAfterMs);
      }
    }, TICK_INTERVAL_MS);
  }, [
    disabled,
    clearHoldInterval,
    clearResetTimer,
    holdingLabel,
    confirmedLabel,
    clampedDurationMs,
    safeResetAfterMs,
  ]);

  const cancelHold = useCallback(() => {
    if (!isHoldingRef.current) return;

    clearHoldInterval();
    isHoldingRef.current = false;
    elapsedRef.current = 0;
    setHolding(false);
    setProgress(0);
    setAnnouncement('Hold cancelled');
  }, [clearHoldInterval]);

  const handlePointerDown = composeEventHandlers(onPointerDown, (event) => {
    if (typeof event.button === 'number' && event.button !== 0) return;
    startHold();
  });

  const handlePointerUp = composeEventHandlers(onPointerUp, () => {
    cancelHold();
  });

  const handlePointerLeave = composeEventHandlers(onPointerLeave, () => {
    cancelHold();
  });

  const handlePointerCancel = composeEventHandlers(onPointerCancel, () => {
    cancelHold();
  });

  const handleKeyDown = composeEventHandlers(onKeyDown, (event) => {
    if (event.nativeEvent.isComposing) return;
    if (!isHoldTriggerKey(event.key)) return;
    event.preventDefault();
    if (event.repeat) return;
    startHold();
  });

  const handleKeyUp = composeEventHandlers(onKeyUp, (event) => {
    if (event.nativeEvent.isComposing) return;
    if (!isHoldTriggerKey(event.key)) return;
    event.preventDefault();
    cancelHold();
  });

  const handleBlur = composeEventHandlers(onBlur, () => {
    cancelHold();
  });

  const visual = getToneVisualTokens(tone);

  const merged = mergeProps({
    themeTarget: themeProps('hold-to-confirm-button', {
      tone,
      holding,
      confirmed,
      progress,
      disabled,
    }),
    baseClassName: cx(
      confirmed ? 'prism-emerald border border-transparent' : 'prism-crystal border',
      'prism-focus-ring relative overflow-hidden inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-sm font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 select-none touch-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105'
    ),
    baseStyle: confirmed
      ? STYLE_SUCCESS_CONTRAST
      : { color: visual.textColorVar, borderColor: visual.borderColorVar },
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const displayLabel = confirmed ? confirmedLabel : holding ? holdingLabel : label;

  return (
    <>
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur}
        {...rest}
        {...merged}
      >
        <span
          aria-hidden="true"
          data-part="fill"
          className={cx(
            fillClass,
            'pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-75 ease-linear',
            confirmed ? 'opacity-25' : 'opacity-20'
          )}
          style={{
            width: `${progress}%`,
            backgroundColor: confirmed ? 'var(--prism-success-light)' : visual.fillColorVar,
          }}
        />
        <span className={cx(contentClass, 'relative z-10 inline-flex items-center gap-2')}>
          {confirmed ? <Check aria-hidden="true" className="w-4 h-4 shrink-0" /> : null}
          <span>{displayLabel}</span>
        </span>
      </button>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </>
  );
}

export const HoldToConfirmButton = /*#__PURE__*/ memoWithDisplayName(HoldToConfirmButtonInner, 'HoldToConfirmButton');
