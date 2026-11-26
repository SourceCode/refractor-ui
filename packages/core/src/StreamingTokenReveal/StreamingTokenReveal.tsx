'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BaseProps } from '../BaseProps';
import { isDocumentVisible } from '../hooks/useRafCallback';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';
import { clampFinite, prefersReducedMotion } from '../utils/webglShader';

export interface StreamingTokenRevealProps extends BaseProps<HTMLDivElement> {
  /** Full or incrementally appended text stream to reveal smoothly. */
  text: string;
  /** Indicates the upstream AI stream is still producing tokens (displays soft leading gradient edge). */
  streaming?: boolean;
  /** Interval in milliseconds between revealed token chunks (clamped 16–300). */
  revealRateMs?: number;
  /** Number of word tokens revealed per tick (clamped 1–6). */
  chunkSize?: number;
  /** Immediately reveals all text without progressive typewriter delay. */
  skipAnimation?: boolean;
  /** Callback fired once every currently buffered token has been revealed. */
  onRevealComplete?: () => void;
  /** Accessible aria-label for the live streaming output region. */
  label?: string;
}

const STREAM_BODY_CLASS = /*#__PURE__*/ stableClassName('streaming-token-reveal', 'body');
const STREAM_TOKEN_CLASS = /*#__PURE__*/ stableClassName('streaming-token-reveal', 'token');
const STREAM_EDGE_CLASS = /*#__PURE__*/ stableClassName('streaming-token-reveal', 'leading-edge');

interface StreamTokenUnit {
  id: string;
  value: string;
  order: number;
}

function tokenizeText(input: string): ReadonlyArray<StreamTokenUnit> {
  if (!input) return [];
  const raw = input.match(/\S+\s*/g) ?? [input];
  return raw.map((value, order) => ({
    id: `tok-${order}-${value}`,
    value,
    order,
  }));
}

function StreamingTokenRevealInner({
  text,
  streaming = false,
  revealRateMs = 45,
  chunkSize = 1,
  skipAnimation = false,
  onRevealComplete,
  label = 'Streaming AI response',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: StreamingTokenRevealProps) {
  const override = useComponentOverride('StreamingTokenReveal');
  const tokens = useMemo(() => tokenizeText(text), [text]);
  const safeRate = Math.round(clampFinite(revealRateMs, 16, 300, 45));
  const safeChunk = Math.round(clampFinite(chunkSize, 1, 6, 1));
  const instant = skipAnimation || prefersReducedMotion();

  const [visibleCount, setVisibleCount] = useState<number>(() => (instant ? tokens.length : 0));
  const completedForLengthRef = useRef<number>(-1);
  const onCompleteRef = useRef(onRevealComplete);
  onCompleteRef.current = onRevealComplete;

  useEffect(() => {
    if (instant) {
      setVisibleCount(tokens.length);
      return;
    }
    setVisibleCount((prev) => (prev > tokens.length ? tokens.length : prev));
  }, [instant, tokens.length]);

  useEffect(() => {
    if (instant || visibleCount >= tokens.length) {
      if (tokens.length > 0 && visibleCount >= tokens.length && completedForLengthRef.current !== tokens.length) {
        completedForLengthRef.current = tokens.length;
        onCompleteRef.current?.();
      }
      return undefined;
    }

    const timer = setInterval(() => {
      if (!isDocumentVisible()) return;
      setVisibleCount((prev) => Math.min(tokens.length, prev + safeChunk));
    }, safeRate);

    return () => clearInterval(timer);
  }, [instant, safeChunk, safeRate, tokens.length, visibleCount]);

  const isRevealing = streaming || visibleCount < tokens.length;
  const revealedTokens = tokens.slice(0, visibleCount);
  const recentWindowStart = Math.max(0, revealedTokens.length - 3);

  const merged = mergeProps({
    themeTarget: themeProps('streaming-token-reveal', {
      streaming: isRevealing,
      complete: !isRevealing,
    }),
    baseClassName:
      'prism-slab prism-contain-leaf rounded-2xl p-4 min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      aria-live="polite"
      aria-busy={isRevealing}
      {...rest}
      {...merged}
    >
      <div
        data-testid="streaming-token-reveal-body"
        className={`${STREAM_BODY_CLASS} text-sm leading-relaxed whitespace-pre-wrap break-words`}
        style={STYLE_TEXT_PRIMARY}
      >
        {revealedTokens.map((tok) => {
          const isLeading = isRevealing && tok.order >= recentWindowStart;
          return (
            <span
              key={tok.id}
              className={`${STREAM_TOKEN_CLASS} ${instant ? '' : 'prism-fx-token-word'} ${
                isLeading ? 'opacity-90' : 'opacity-100'
              }`}
            >
              {tok.value}
            </span>
          );
        })}
        {isRevealing ? (
          <span
            aria-hidden="true"
            data-testid="streaming-token-reveal-edge"
            className={`${STREAM_EDGE_CLASS} prism-fx-gradient-caret inline-block w-2 h-4 align-middle rounded-full ml-0.5`}
          />
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]" style={STYLE_TEXT_SECONDARY}>
        <span className="font-mono tabular-nums">
          {visibleCount}/{tokens.length} tokens
        </span>
        <span>{isRevealing ? 'Streaming…' : 'Complete'}</span>
      </div>
    </div>
  );
}

export const StreamingTokenReveal = /*#__PURE__*/ memoWithDisplayName(
  StreamingTokenRevealInner,
  'StreamingTokenReveal'
);
