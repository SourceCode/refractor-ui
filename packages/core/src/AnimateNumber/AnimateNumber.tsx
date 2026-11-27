'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BaseProps } from '../BaseProps';
import { useMotionConfig } from '../motion/MotionConfigProvider';
import { evaluateSpringAt, simulateSpring } from '../motion/springPhysics';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface AnimateNumberProps extends BaseProps<HTMLSpanElement> {
  /** Numeric value to roll and interpolate smoothly. */
  value: number;
  /** Number of decimal places to display (default: 0). */
  decimals?: number;
  /** Locale for number formatting (default: `'en-US'`). */
  locale?: string;
  /** Optional prefix (e.g. `'$'`, `'+'`). */
  prefix?: string;
  /** Optional suffix (e.g. `' dB'`, `' tokens'`, `'%'`). */
  suffix?: string;
  /** Transition duration in milliseconds (default: 420). */
  durationMs?: number;
  /** Accessible live-region politeness (default: `'off'`). */
  live?: 'off' | 'polite';
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('animate-number');

function AnimateNumberInner({
  value,
  decimals = 0,
  locale = 'en-US',
  prefix = '',
  suffix = '',
  durationMs = 420,
  live = 'off',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AnimateNumberProps) {
  const override = useComponentOverride('AnimateNumber');
  const { isCalmMotion } = useMotionConfig();
  const safeTarget = Number.isFinite(value) ? value : 0;
  const safeDecimals = Math.min(6, Math.max(0, Math.round(decimals)));
  const [displayed, setDisplayed] = useState<number>(safeTarget);
  const currentRef = useRef<number>(safeTarget);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: safeDecimals,
        maximumFractionDigits: safeDecimals,
      }),
    [locale, safeDecimals]
  );

  useEffect(() => {
    const startVal = currentRef.current;
    if (isCalmMotion || durationMs <= 0 || startVal === safeTarget) {
      currentRef.current = safeTarget;
      setDisplayed(safeTarget);
      return;
    }

    const springSim = simulateSpring({ stiffness: 280, damping: 28, mass: 1 }, 12);
    const startTime = performance.now();
    let rafId: number | null = null;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = evaluateSpringAt(springSim, progress);
      const nextVal = startVal + (safeTarget - startVal) * eased;
      currentRef.current = nextVal;
      setDisplayed(nextVal);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        currentRef.current = safeTarget;
        setDisplayed(safeTarget);
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      rafId = window.requestAnimationFrame(tick);
    } else {
      currentRef.current = safeTarget;
      setDisplayed(safeTarget);
    }

    return () => {
      if (rafId !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [safeTarget, durationMs, isCalmMotion]);

  const formatted = `${prefix}${formatter.format(displayed)}${suffix}`;

  const merged = mergeProps({
    themeTarget: themeProps('AnimateNumber', { calm: isCalmMotion }),
    baseClassName: `${ROOT_CLASS} inline-flex items-baseline tabular-nums font-semibold`,
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: STYLE_TEXT_PRIMARY,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <span
      ref={ref}
      aria-live={live === 'polite' ? 'polite' : undefined}
      {...rest}
      {...merged}
      data-target-value={String(safeTarget)}
    >
      {formatted}
    </span>
  );
}

export const AnimateNumber = /*#__PURE__*/ memoWithDisplayName(AnimateNumberInner, 'AnimateNumber');
