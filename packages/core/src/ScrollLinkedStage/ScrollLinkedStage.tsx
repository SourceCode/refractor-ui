'use client';

import { useRef, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useMotionConfig } from '../motion/MotionConfigProvider';
import { mapScrollRange, useScrollProgress } from '../motion/scrollLinked';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface ScrollLinkedStageProps extends BaseProps<HTMLDivElement> {
  /** Header title pinned inside the sticky optical header. */
  title?: string;
  /** Maximum glass blur intensity in pixels linked to scroll progress (default: 16). */
  maxBlurPx?: number;
  /** Vertical parallax offset distance in pixels (default: 24). */
  parallaxPx?: number;
  /** Scrollable viewport height in pixels (default: 240). */
  viewportHeightPx?: number;
  /** Shows a sticky reading progress bar linked to scroll progress (default: true). */
  showProgressBar?: boolean;
  children?: ReactNode;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('scroll-linked-stage');
const HEADER_CLASS = /*#__PURE__*/ stableClassName('scroll-linked-stage', 'header');
const BAR_CLASS = /*#__PURE__*/ stableClassName('scroll-linked-stage', 'bar');
const BODY_CLASS = /*#__PURE__*/ stableClassName('scroll-linked-stage', 'body');

function ScrollLinkedStageInner({
  title = 'Scroll-Linked Optical Stage',
  maxBlurPx = 16,
  parallaxPx = 24,
  viewportHeightPx = 240,
  showProgressBar = true,
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: ScrollLinkedStageProps) {
  const override = useComponentOverride('ScrollLinkedStage');
  const { isCalmMotion } = useMotionConfig();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(scrollRef, ref);

  const scrollState = useScrollProgress({ container: scrollRef });
  const blurPx = Number(mapScrollRange(scrollState.progressY, [0, 1], [4, maxBlurPx]).toFixed(1));
  const parallaxOffset = isCalmMotion
    ? 0
    : Number(mapScrollRange(scrollState.progressY, [0, 1], [0, -parallaxPx]).toFixed(1));
  const pct = Math.round(scrollState.progressY * 100);

  const merged = mergeProps({
    themeTarget: themeProps('ScrollLinkedStage', {
      hardware: scrollState.hardwareTimelineSupported,
      calm: isCalmMotion,
    }),
    baseClassName: `${ROOT_CLASS} prism-slab relative overflow-y-auto rounded-2xl`,
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: {
      maxHeight: `${Math.max(120, viewportHeightPx)}px`,
      '--prism-scroll-progress': String(scrollState.progressY),
    },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} {...rest} {...merged} data-scroll-progress={String(pct)}>
      <div
        className={`${HEADER_CLASS} sticky top-0 z-10 flex flex-col gap-1.5 px-4 py-2.5 border-b`}
        style={{
          backdropFilter: `blur(${blurPx}px)`,
          WebkitBackdropFilter: `blur(${blurPx}px)`,
          background: 'rgba(var(--prism-surface-rgb), 0.72)',
          borderColor: 'var(--prism-border-divider)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold tracking-tight" style={STYLE_TEXT_PRIMARY}>
            {title}
          </span>
          <span className="text-[11px] font-mono tabular-nums" style={STYLE_TEXT_SECONDARY}>
            {pct}% · {blurPx}px blur
          </span>
        </div>
        {showProgressBar ? (
          <div
            role="progressbar"
            aria-label="Scroll progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="h-1 w-full rounded-full overflow-hidden"
            style={{ background: 'rgba(var(--prism-ink-rgb), 0.12)' }}
          >
            <div
              className={`${BAR_CLASS} h-full origin-left rounded-full`}
              style={{
                transform: `scaleX(${scrollState.progressY})`,
                background: 'var(--prism-primary)',
              }}
            />
          </div>
        ) : null}
      </div>
      <div
        className={`${BODY_CLASS} p-4`}
        style={{ transform: `translate3d(0, ${parallaxOffset}px, 0)` }}
      >
        {children}
      </div>
    </div>
  );
}

export const ScrollLinkedStage = /*#__PURE__*/ memoWithDisplayName(ScrollLinkedStageInner, 'ScrollLinkedStage');
