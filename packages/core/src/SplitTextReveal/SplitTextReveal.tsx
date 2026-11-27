'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import type { MotionTokenName } from '../motion/motion.theme';
import { useMotionConfig } from '../motion/MotionConfigProvider';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type SplitTextMode = 'words' | 'chars' | 'lines';

export interface SplitTextRevealProps extends BaseProps<HTMLDivElement> {
  /** Headline or label text broken into animated masked segments. */
  text: string;
  /** Segmentation granularity: `'words'`, `'chars'`, or `'lines'` (default: `'words'`). */
  splitBy?: SplitTextMode;
  /** Controls whether the masked sweep is revealed (default: true). */
  revealed?: boolean;
  /** Per-segment stagger delay in milliseconds (default: 28). */
  staggerMs?: number;
  /** Semantic motion token (default: `'ui'`). */
  transitionToken?: MotionTokenName;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('split-text-reveal');
const MASK_CLASS = /*#__PURE__*/ stableClassName('split-text-reveal', 'mask');
const SEG_CLASS = /*#__PURE__*/ stableClassName('split-text-reveal', 'segment');

interface TextSegment {
  readonly id: string;
  readonly value: string;
}

function segmentText(text: string, mode: SplitTextMode): TextSegment[] {
  if (mode === 'lines') {
    return text.split(/\r?\n/).map((line, i) => ({ id: `l-${i}-${line.length}`, value: line }));
  }
  if (mode === 'chars') {
    return Array.from(text).map((ch, i) => ({ id: `c-${i}-${ch.codePointAt(0) ?? 0}`, value: ch }));
  }
  return text.split(/(\s+)/).filter((part) => part.length > 0).map((word, i) => ({
    id: `w-${i}-${word.length}`,
    value: word,
  }));
}

function SplitTextRevealInner({
  text,
  splitBy = 'words',
  revealed = true,
  staggerMs = 28,
  transitionToken = 'ui',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SplitTextRevealProps) {
  const override = useComponentOverride('SplitTextReveal');
  const { isCalmMotion, getToken } = useMotionConfig();
  const token = getToken(transitionToken);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const [resizeGeneration, setResizeGeneration] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.round(entry.contentRect.width);
      if (Math.abs(nextWidth - lastWidth) >= 12) {
        lastWidth = nextWidth;
        setResizeGeneration((g) => g + 1);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const segments = useMemo(() => segmentText(text, splitBy), [text, splitBy]);
  const duration = isCalmMotion ? token.calmOpacityMs : Math.min(480, token.durationMs);
  const safeStagger = isCalmMotion ? 0 : Math.min(120, Math.max(0, staggerMs));

  const merged = mergeProps({
    themeTarget: themeProps('SplitTextReveal', {
      splitBy,
      revealed,
      calm: isCalmMotion,
    }),
    baseClassName: `${ROOT_CLASS} inline-flex flex-wrap items-baseline`,
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: STYLE_TEXT_PRIMARY,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={mergedRef}
      aria-label={text}
      {...rest}
      {...merged}
      data-resize-gen={String(resizeGeneration)}
    >
      {segments.map((seg, idx) => {
        const isWhitespace = /^\s+$/.test(seg.value);
        if (isWhitespace) {
          return (
            <span key={seg.id} aria-hidden="true">
              {'\u00A0'}
            </span>
          );
        }
        return (
          <span
            key={seg.id}
            aria-hidden="true"
            className={`${MASK_CLASS} inline-block overflow-hidden align-bottom`}
          >
            <span
              className={`${SEG_CLASS} inline-block`}
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed || isCalmMotion ? 'translate3d(0, 0, 0)' : 'translate3d(0, 105%, 0)',
                transition: `transform ${duration}ms ${token.cssEasing} ${idx * safeStagger}ms, opacity ${duration}ms ease-out ${idx * safeStagger}ms`,
              }}
            >
              {seg.value}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export const SplitTextReveal = /*#__PURE__*/ memoWithDisplayName(SplitTextRevealInner, 'SplitTextReveal');
