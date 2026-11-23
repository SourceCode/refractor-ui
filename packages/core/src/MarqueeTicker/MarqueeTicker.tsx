'use client';

import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Pause, Play } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type MarqueeDirection = 'left' | 'right';

export type MarqueeItemTone =
  | 'neutral'
  | 'primary'
  | 'emerald'
  | 'amber'
  | 'rose';

export interface MarqueeTickerItem {
  /** Stable identifier for the ticker pill. */
  id: string;
  /** Primary symbol, metric, or event label. */
  label: string;
  /** Optional formatted numeric value or price reading. */
  value?: string;
  /** Optional relative change or delta reading (e.g., '+2.4%'). */
  delta?: string;
  /** Semantic accent tone mapped strictly to --prism-* tokens (defaults to 'neutral'). */
  tone?: MarqueeItemTone;
}

export interface MarqueeTickerProps extends BaseProps<HTMLDivElement> {
  /** Ticker pills scrolled across the ribbon (defaults to 6 live market/telemetry items; pass [] for empty state). */
  items?: ReadonlyArray<MarqueeTickerItem>;
  /** Horizontal scroll travel direction ('left' | 'right', defaults to 'left'). */
  direction?: MarqueeDirection;
  /** Full loop animation duration in seconds, clamped to 6..120 (defaults to 24). */
  durationSec?: number;
  /** Pauses marquee motion while hovered or focused inside when true (defaults to true). */
  pauseOnHover?: boolean;
  /** Controlled paused state for the WCAG 2.2.2 Pause / Play control. */
  paused?: boolean;
  /** Uncontrolled initial paused state (defaults to false). */
  defaultPaused?: boolean;
  /** Callback fired whenever the user toggles Pause / Play. */
  onPausedChange?: (paused: boolean) => void;
  /** Callback fired when a user clicks or keyboard-activates a primary ticker pill. */
  onSelectItem?: (item: MarqueeTickerItem) => void;
  /** Accessible region label for the marquee ribbon (defaults to 'Live marquee ticker'). */
  ariaLabel?: string;
}

interface NormalizedTickerItem {
  key: string;
  index: number;
  item: MarqueeTickerItem;
  label: string;
  value?: string;
  delta?: string;
  tone: MarqueeItemTone;
}

const DEFAULT_ARIA_LABEL = 'Live marquee ticker';
const DEFAULT_DURATION_SEC = 24;
const MIN_DURATION_SEC = 6;
const MAX_DURATION_SEC = 120;

const DEFAULT_MARQUEE_ITEMS: ReadonlyArray<MarqueeTickerItem> = [
  {
    id: 'nvda-spot',
    label: 'NVDA',
    value: '$142.80',
    delta: '+2.4%',
    tone: 'emerald',
  },
  {
    id: 'edge-p99',
    label: 'Edge p99',
    value: '18.4ms',
    delta: '-1.2ms',
    tone: 'primary',
  },
  {
    id: 'h200-util',
    label: 'H200 Cluster',
    value: '84.2%',
    delta: '+4.1%',
    tone: 'amber',
  },
  {
    id: 'btc-usd',
    label: 'BTC/USD',
    value: '$94,210',
    delta: '+1.8%',
    tone: 'emerald',
  },
  {
    id: 'eu-west-5xx',
    label: 'EU-West 5xx',
    value: '0.14%',
    delta: '+0.06%',
    tone: 'rose',
  },
  {
    id: 'ingest-rps',
    label: 'Ingest RPS',
    value: '412.6k/s',
    delta: '0.0%',
    tone: 'neutral',
  },
];

const MARQUEE_KEYFRAMES_CSS = `
@keyframes refractor-marquee-left {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
}
@keyframes refractor-marquee-right {
  0% { transform: translate3d(-50%, 0, 0); }
  100% { transform: translate3d(0, 0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .refractor-marquee-ticker__track {
    animation-play-state: paused !important;
  }
}
`;

function getToneAccentVar(tone: MarqueeItemTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'rose':
      return 'var(--prism-error-main)';
    case 'neutral':
      return 'var(--prism-text-secondary)';
  }
}

function renderPillBody(entry: NormalizedTickerItem) {
  const accentVar = getToneAccentVar(entry.tone);
  return (
    <>
      <span
        aria-hidden="true"
        data-testid={`marquee-pill-dot-${entry.index}`}
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: accentVar }}
      />
      <span
        className="font-semibold tracking-tight"
        style={STYLE_TEXT_PRIMARY}
      >
        {entry.label}
      </span>
      {entry.value !== undefined ? (
        <span
          className="font-mono font-medium tabular-nums"
          style={STYLE_TEXT_SECONDARY}
        >
          {entry.value}
        </span>
      ) : null}
      {entry.delta !== undefined ? (
        <span
          className="font-mono font-semibold tabular-nums text-[11px]"
          style={{ color: accentVar }}
        >
          {entry.delta}
        </span>
      ) : null}
    </>
  );
}

function MarqueeTickerInner({
  items,
  direction = 'left',
  durationSec = DEFAULT_DURATION_SEC,
  pauseOnHover = true,
  paused,
  defaultPaused = false,
  onPausedChange,
  onSelectItem,
  ariaLabel = DEFAULT_ARIA_LABEL,
  className,
  style,
  xstyle,
  ref,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: MarqueeTickerProps) {
  const override = useComponentOverride('MarqueeTicker');
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  const [manualPaused, setManualPaused] = useControllableState<boolean>({
    value: paused,
    defaultValue: defaultPaused,
    onChange: onPausedChange,
  });

  const resolvedAriaLabel = ariaLabel.trim() || DEFAULT_ARIA_LABEL;
  const safeDurationSec = clampNumber(
    durationSec,
    MIN_DURATION_SEC,
    MAX_DURATION_SEC,
    DEFAULT_DURATION_SEC
  );

  const normalizedItems = useMemo<ReadonlyArray<NormalizedTickerItem>>(() => {
    const sourceItems = items ?? DEFAULT_MARQUEE_ITEMS;
    const seenKeys = new Map<string, number>();
    const out: NormalizedTickerItem[] = [];

    let index = 0;
    for (const item of sourceItems) {
      const trimmedId = item.id.trim();
      const trimmedLabel = item.label.trim();
      const rawBase = trimmedId || trimmedLabel || 'item';
      const baseKey = `item:${rawBase}`;
      const seen = seenKeys.get(baseKey) ?? 0;
      seenKeys.set(baseKey, seen + 1);
      const key = seen === 0 ? baseKey : `${baseKey}#${seen + 1}`;

      const label = trimmedLabel || trimmedId || 'Ticker item';
      const trimmedValue = item.value?.trim();
      const trimmedDelta = item.delta?.trim();
      const tone: MarqueeItemTone = item.tone ?? 'neutral';

      out.push({
        key,
        index,
        item,
        label,
        value: trimmedValue || undefined,
        delta: trimmedDelta || undefined,
        tone,
      });
      index += 1;
    }

    return out;
  }, [items]);

  const isEmpty = normalizedItems.length === 0;
  const effectivePaused =
    manualPaused || (pauseOnHover && (isHovered || isFocusWithin));

  const handleTogglePause = useCallback(() => {
    setManualPaused((prev) => !prev);
  }, [setManualPaused]);

  const handleToggleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleTogglePause();
      }
    },
    [handleTogglePause]
  );

  const handlePillKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, item: MarqueeTickerItem) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelectItem?.(item);
      }
    },
    [onSelectItem]
  );

  const handleMouseEnter = composeEventHandlers<MouseEvent<HTMLDivElement>>(
    onMouseEnter,
    () => {
      setIsHovered(true);
    }
  );

  const handleMouseLeave = composeEventHandlers<MouseEvent<HTMLDivElement>>(
    onMouseLeave,
    () => {
      setIsHovered(false);
    }
  );

  const handleFocus = composeEventHandlers<FocusEvent<HTMLDivElement>>(
    onFocus,
    (event) => {
      const toggleNode: EventTarget | null = toggleButtonRef.current;
      if (event.target !== toggleNode) {
        setIsFocusWithin(true);
      }
    }
  );

  const handleBlur = composeEventHandlers<FocusEvent<HTMLDivElement>>(
    onBlur,
    (event) => {
      const nextTarget = event.relatedTarget;
      const staysInsideItems =
        nextTarget instanceof Node &&
        event.currentTarget.contains(nextTarget) &&
        nextTarget !== toggleButtonRef.current;
      if (!staysInsideItems) {
        setIsFocusWithin(false);
      }
    }
  );

  const merged = mergeProps({
    themeTarget: themeProps('marquee-ticker', {
      direction,
      paused: effectivePaused,
      pauseOnHover,
      empty: isEmpty,
      count: normalizedItems.length,
    }),
    baseClassName:
      'prism-slab overflow-hidden relative flex items-center gap-2 w-full max-w-full min-w-0 px-2.5 py-2',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const controlsClass = stableClassName('marquee-ticker', 'controls');
  const toggleClass = stableClassName('marquee-ticker', 'toggle');
  const statusDotClass = stableClassName('marquee-ticker', 'status-dot');
  const viewportClass = stableClassName('marquee-ticker', 'viewport');
  const fadeLeftClass = stableClassName('marquee-ticker', 'fade-left');
  const fadeRightClass = stableClassName('marquee-ticker', 'fade-right');
  const trackClass = stableClassName('marquee-ticker', 'track');
  const stripClass = stableClassName('marquee-ticker', 'strip');
  const pillClass = stableClassName('marquee-ticker', 'pill');
  const emptyClass = stableClassName('marquee-ticker', 'empty');

  const animationName =
    direction === 'right'
      ? 'refractor-marquee-right'
      : 'refractor-marquee-left';

  return (
    <div
      ref={ref}
      role="region"
      aria-label={resolvedAriaLabel}
      {...rest}
      {...merged}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <style>{MARQUEE_KEYFRAMES_CSS}</style>

      {isEmpty ? (
        <div
          role="status"
          data-testid="marquee-empty-state"
          className={cx(
            emptyClass,
            'prism-well rounded-full px-3.5 py-1.5 w-full min-w-0 flex items-center justify-center gap-2 text-xs font-medium'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--prism-text-disabled)' }}
          />
          <span className="truncate">No live ticker items available.</span>
        </div>
      ) : (
        <>
          <div
            className={cx(
              controlsClass,
              'relative z-10 flex items-center shrink-0'
            )}
          >
            <button
              ref={toggleButtonRef}
              type="button"
              aria-pressed={manualPaused}
              aria-label={
                manualPaused ? 'Play marquee ticker' : 'Pause marquee ticker'
              }
              data-testid="marquee-toggle-pause"
              onClick={handleTogglePause}
              onKeyDown={handleToggleKeyDown}
              className={cx(
                toggleClass,
                'prism-crystal prism-focus-ring rounded-full h-8 px-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-[color,background-color,border-color,opacity,transform] hover:brightness-105'
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                data-testid="marquee-status-dot"
                data-status={effectivePaused ? 'paused' : 'live'}
                className={cx(
                  statusDotClass,
                  'w-2 h-2 rounded-full shrink-0 transition-colors'
                )}
                style={{
                  backgroundColor: effectivePaused
                    ? 'var(--prism-warning-main)'
                    : 'var(--prism-success-main)',
                }}
              />
              {manualPaused ? (
                <Play aria-hidden="true" className="w-3 h-3 shrink-0" />
              ) : (
                <Pause aria-hidden="true" className="w-3 h-3 shrink-0" />
              )}
              <span>{manualPaused ? 'Play' : 'Pause'}</span>
            </button>
          </div>

          <div
            data-testid="marquee-viewport"
            className={cx(
              viewportClass,
              'relative flex-1 min-w-0 overflow-hidden'
            )}
          >
            <span
              aria-hidden="true"
              data-testid="marquee-fade-left"
              className={cx(
                fadeLeftClass,
                'pointer-events-none absolute inset-y-0 left-0 z-10 w-6'
              )}
              style={{
                background:
                  'linear-gradient(to right, var(--prism-slab-top), transparent)',
              }}
            />

            <div
              data-testid="marquee-track"
              data-direction={direction}
              data-paused={effectivePaused ? 'true' : 'false'}
              className={cx(
                trackClass,
                'flex w-max items-center will-change-transform'
              )}
              style={{
                animationName,
                animationDuration: `${safeDurationSec}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationPlayState: effectivePaused ? 'paused' : 'running',
              }}
            >
              <div
                role="list"
                aria-label={`${resolvedAriaLabel} items`}
                data-testid="marquee-strip-primary"
                className={cx(
                  stripClass,
                  'flex items-center gap-2 pr-2 shrink-0'
                )}
              >
                {normalizedItems.map((entry) => (
                  <div key={entry.key} role="listitem" className="shrink-0">
                    <button
                      type="button"
                      data-testid={`marquee-pill-${entry.index}`}
                      data-tone={entry.tone}
                      onClick={() => onSelectItem?.(entry.item)}
                      onKeyDown={(event) =>
                        handlePillKeyDown(event, entry.item)
                      }
                      className={cx(
                        pillClass,
                        'prism-well prism-focus-ring rounded-full h-8 px-3 inline-flex items-center gap-2 text-xs whitespace-nowrap shrink-0 cursor-pointer transition-[color,background-color,border-color,opacity,transform] hover:brightness-105'
                      )}
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {renderPillBody(entry)}
                    </button>
                  </div>
                ))}
              </div>

              <div
                aria-hidden="true"
                data-testid="marquee-strip-duplicate"
                className={cx(
                  stripClass,
                  'flex items-center gap-2 pr-2 shrink-0 pointer-events-none select-none'
                )}
              >
                {normalizedItems.map((entry) => (
                  <span
                    key={`dup:${entry.key}`}
                    data-testid={`marquee-duplicate-pill-${entry.index}`}
                    data-tone={entry.tone}
                    className={cx(
                      pillClass,
                      'prism-well rounded-full h-8 px-3 inline-flex items-center gap-2 text-xs whitespace-nowrap shrink-0'
                    )}
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {renderPillBody(entry)}
                  </span>
                ))}
              </div>
            </div>

            <span
              aria-hidden="true"
              data-testid="marquee-fade-right"
              className={cx(
                fadeRightClass,
                'pointer-events-none absolute inset-y-0 right-0 z-10 w-6'
              )}
              style={{
                background:
                  'linear-gradient(to left, var(--prism-slab-bottom), transparent)',
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export const MarqueeTicker = memo(MarqueeTickerInner);
MarqueeTicker.displayName = 'MarqueeTicker';
