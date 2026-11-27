'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type LiveAnnouncePoliteness = 'polite' | 'assertive';

export interface LiveAnnouncerContextValue {
  readonly announce: (message: string, politeness?: LiveAnnouncePoliteness) => void;
  readonly clear: () => void;
  readonly politeMessage: string;
  readonly assertiveMessage: string;
}

const DEFAULT_ANNOUNCER: LiveAnnouncerContextValue = /*#__PURE__*/ Object.freeze({
  announce: () => undefined,
  clear: () => undefined,
  politeMessage: '',
  assertiveMessage: '',
});

const LiveAnnouncerContext = /*#__PURE__*/ createContext<LiveAnnouncerContextValue>(
  DEFAULT_ANNOUNCER
);

export interface LiveAnnouncerProviderProps {
  children: ReactNode;
}

/**
 * Provides app-wide `polite` and `assertive` ARIA live-region announcement channels
 * for streaming AI tokens, toast notifications, file transfers, and validation errors.
 */
export function LiveAnnouncerProvider({ children }: LiveAnnouncerProviderProps) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const [tick, setTick] = useState(0);

  const announce = useCallback(
    (message: string, politeness: LiveAnnouncePoliteness = 'polite') => {
      const trimmed = message.trim();
      if (!trimmed) return;
      setTick((prev) => prev + 1);
      // Append alternating zero-width space when repeating identical text so AT re-announces it.
      const suffix = tick % 2 === 0 ? '' : '\u200B';
      if (politeness === 'assertive') {
        setAssertiveMessage(`${trimmed}${suffix}`);
      } else {
        setPoliteMessage(`${trimmed}${suffix}`);
      }
    },
    [tick]
  );

  const clear = useCallback(() => {
    setPoliteMessage('');
    setAssertiveMessage('');
  }, []);

  const value = useMemo<LiveAnnouncerContextValue>(
    () => ({ announce, clear, politeMessage, assertiveMessage }),
    [announce, assertiveMessage, clear, politeMessage]
  );

  return (
    <LiveAnnouncerContext value={value}>
      {children}
      <LiveAnnouncerRegion
        politeMessage={politeMessage}
        assertiveMessage={assertiveMessage}
      />
    </LiveAnnouncerContext>
  );
}

/** Reads the live screen-reader announcement controller. */
export function useLiveAnnouncer(): LiveAnnouncerContextValue {
  return useContext(LiveAnnouncerContext);
}

export interface LiveAnnouncerRegionProps extends BaseProps<HTMLDivElement> {
  /** Message announced politely (status updates, streaming completions). */
  politeMessage?: string;
  /** Message announced assertively (urgent validation or system errors). */
  assertiveMessage?: string;
  /** Renders visible debug preview pills instead of visually hidden sr-only regions (default: false). */
  visible?: boolean;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('live-announcer-region');

function LiveAnnouncerRegionInner({
  politeMessage = '',
  assertiveMessage = '',
  visible = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: LiveAnnouncerRegionProps) {
  const override = useComponentOverride('LiveAnnouncerRegion');

  const merged = mergeProps({
    themeTarget: themeProps('LiveAnnouncerRegion', { visible }),
    baseClassName: `${ROOT_CLASS} ${visible ? 'prism-slab rounded-xl p-3 flex flex-col gap-1.5 text-xs' : 'sr-only'}`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div role="status" aria-live="polite" aria-atomic="true" data-channel="polite">
        {politeMessage}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" data-channel="assertive">
        {assertiveMessage}
      </div>
    </div>
  );
}

export const LiveAnnouncerRegion = /*#__PURE__*/ memoWithDisplayName(LiveAnnouncerRegionInner, 'LiveAnnouncerRegion');
