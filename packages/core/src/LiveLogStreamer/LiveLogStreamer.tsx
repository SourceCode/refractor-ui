'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type UIEvent,
} from 'react';
import { ArrowDownToLine, Pause, Play, Search, Terminal, Trash2, X } from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_SECONDARY_DARK, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type LogSeverity = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  /** Stable unique identifier for the log line. */
  id: string;
  /** Formatted timestamp string displayed in tabular monospace numerals. */
  timestamp: string;
  /** Semantic severity level used for filtering and badge styling. */
  severity: LogSeverity;
  /** Optional emitter or subsystem tag (e.g. 'worker', 'api', 'bundler'). */
  source?: string;
  /** Literal log message text rendered without HTML interpretation. */
  message: string;
}

export interface LiveLogStreamerProps extends BaseProps<HTMLDivElement> {
  /** Chronological stream of structured log entries to display and filter. */
  entries: LogEntry[];
  /** Heading label rendered in the optical slab header (defaults to 'Live Log Stream'). */
  title?: string;
  /** Initial active severity filters (defaults to all four levels). */
  defaultSeverities?: LogSeverity[];
  /** Initial auto-follow tailing state (defaults to true). */
  defaultFollowing?: boolean;
  /** Optional callback that enables and handles the Clear log stream action button. */
  onClear?: () => void;
  /** Message rendered inside the recessed well when no log entries match active filters. */
  emptyMessage?: string;
  /** Maximum height of the scrollable log viewport in pixels (default 280, clamped 120..800). */
  maxHeight?: number;
}

interface SeverityMeta {
  label: string;
  badgeText: string;
  accentColor: string;
  badgeStyle: OpticalStyleTokens;
}

const DEFAULT_MAX_HEIGHT = 280;
const MIN_MAX_HEIGHT = 120;
const MAX_MAX_HEIGHT = 800;
const SCROLL_BOTTOM_THRESHOLD_PX = 24;

const SEVERITY_ORDER: readonly LogSeverity[] = ['debug', 'info', 'warn', 'error'];

const SEVERITY_META: Record<LogSeverity, SeverityMeta> = {
  debug: {
    label: 'Debug',
    badgeText: 'DEBUG',
    accentColor: 'var(--prism-text-secondary)',
    badgeStyle: {
      color: 'var(--prism-text-secondary)',
    },
  },
  info: {
    label: 'Info',
    badgeText: 'INFO',
    accentColor: 'var(--prism-info-main)',
    badgeStyle: {
      backgroundColor: 'var(--prism-info-main)',
      color: 'var(--prism-info-contrast)',
    },
  },
  warn: {
    label: 'Warn',
    badgeText: 'WARN',
    accentColor: 'var(--prism-warning-main)',
    badgeStyle: {
      backgroundColor: 'var(--prism-warning-main)',
      color: 'var(--prism-warning-contrast)',
    },
  },
  error: {
    label: 'Error',
    badgeText: 'ERROR',
    accentColor: 'var(--prism-error-main)',
    badgeStyle: {
      backgroundColor: 'var(--prism-error-main)',
      color: 'var(--prism-error-contrast)',
    },
  },
};

const headerClass = /*#__PURE__*/ stableClassName('live-log-streamer', 'header');
const controlsClass = /*#__PURE__*/ stableClassName('live-log-streamer', 'controls');
const viewportClass = /*#__PURE__*/ stableClassName('live-log-streamer', 'viewport');
const entryClass = /*#__PURE__*/ stableClassName('live-log-streamer', 'entry');

function LiveLogStreamerInner({
  entries,
  title = 'Live Log Stream',
  defaultSeverities,
  defaultFollowing = true,
  onClear,
  emptyMessage = 'No matching log entries.',
  maxHeight = DEFAULT_MAX_HEIGHT,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: LiveLogStreamerProps) {
  const override = useComponentOverride('LiveLogStreamer');
  const titleId = useId();
  const streamRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState<string>('');
  const [activeSeverities, setActiveSeverities] = useState<Set<LogSeverity>>(
    () => new Set<LogSeverity>(defaultSeverities ?? SEVERITY_ORDER)
  );
  const [following, setFollowing] = useState<boolean>(defaultFollowing);

  const safeMaxHeight = Math.trunc(
    clampNumber(maxHeight, MIN_MAX_HEIGHT, MAX_MAX_HEIGHT, DEFAULT_MAX_HEIGHT)
  );

  const severityCounts = useMemo<Record<LogSeverity, number>>(() => {
    const counts: Record<LogSeverity, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };
    for (const entry of entries) {
      switch (entry.severity) {
        case 'debug':
          counts.debug += 1;
          break;
        case 'info':
          counts.info += 1;
          break;
        case 'warn':
          counts.warn += 1;
          break;
        case 'error':
          counts.error += 1;
          break;
      }
    }
    return counts;
  }, [entries]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredEntries = useMemo<LogEntry[]>(() => {
    return entries.filter((entry) => {
      if (!activeSeverities.has(entry.severity)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const matchesMessage = entry.message.toLowerCase().includes(normalizedQuery);
      const matchesTimestamp = entry.timestamp.toLowerCase().includes(normalizedQuery);
      const matchesSource = entry.source
        ? entry.source.toLowerCase().includes(normalizedQuery)
        : false;
      return matchesMessage || matchesTimestamp || matchesSource;
    });
  }, [activeSeverities, entries, normalizedQuery]);

  useEffect(() => {
    if (!following) {
      return;
    }
    const container = streamRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [filteredEntries, following]);

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Escape' && query.length > 0) {
        event.preventDefault();
        setQuery('');
      }
    },
    [query.length]
  );

  const handleClearQuery = useCallback(() => {
    setQuery('');
  }, []);

  const handleToggleSeverity = useCallback((severity: LogSeverity) => {
    setActiveSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  }, []);

  const handleToggleFollowing = useCallback(() => {
    setFollowing((prev) => !prev);
  }, []);

  const handleJumpToBottom = useCallback(() => {
    const container = streamRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
    setFollowing(true);
  }, []);

  const handleStreamScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!following) {
        return;
      }
      const container = event.currentTarget;
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom > SCROLL_BOTTOM_THRESHOLD_PX) {
        setFollowing(false);
      }
    },
    [following]
  );

  const isFiltered =
    normalizedQuery.length > 0 || activeSeverities.size < SEVERITY_ORDER.length;

  const merged = mergeProps({
    themeTarget: themeProps('live-log-streamer', {
      following,
      empty: filteredEntries.length === 0,
      filtered: isFiltered,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full flex flex-col gap-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const controlButtonClass =
    'prism-focus-ring h-8 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed';

  return (
    <div
      ref={ref}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : titleId}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-col gap-3')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2.5">
            <span
              className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
              style={STYLE_PRIMARY_MAIN}
            >
              <Terminal aria-hidden="true" className="w-4 h-4 shrink-0" />
            </span>
            <span
              id={titleId}
              className="text-sm font-semibold truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </span>
            <span
              data-testid="live-log-count"
              className="prism-well rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {filteredEntries.length}/{entries.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-pressed={following}
              data-following={following ? 'true' : 'false'}
              onClick={handleToggleFollowing}
              className={cx(
                controlButtonClass,
                following ? 'prism-emerald font-semibold' : 'prism-crystal'
              )}
              style={following ? undefined : STYLE_TEXT_PRIMARY}
            >
              {following ? (
                <>
                  <Pause aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  <span>Follow</span>
                </>
              ) : (
                <>
                  <Play aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  <span>Paused</span>
                </>
              )}
            </button>

            {!following ? (
              <button
                type="button"
                onClick={handleJumpToBottom}
                className={cx(controlButtonClass, 'prism-btn-secondary')}
              >
                <ArrowDownToLine aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Jump to Bottom</span>
              </button>
            ) : null}

            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className={cx(controlButtonClass, 'prism-crystal')}
                style={STYLE_TEXT_PRIMARY}
              >
                <Trash2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Clear</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className={cx(controlsClass, 'flex flex-col sm:flex-row sm:items-center gap-2.5')}>
          <div className="prism-well rounded-full px-3 h-9 flex items-center gap-2 min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Filter logs by message, source, or timestamp..."
              aria-label="Filter log entries"
              className="prism-focus-ring bg-transparent border-0 outline-none w-full min-w-0 text-xs font-mono"
              style={STYLE_TEXT_PRIMARY}
            />
            {query.length > 0 ? (
              <button
                type="button"
                onClick={handleClearQuery}
                aria-label="Clear log search"
                className="prism-focus-ring w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer"
                style={STYLE_TEXT_SECONDARY}
              >
                <X aria-hidden="true" className="w-3 h-3" />
              </button>
            ) : null}
          </div>

          <div
            role="group"
            aria-label="Severity filters"
            className="flex flex-wrap items-center gap-1.5 shrink-0"
          >
            {SEVERITY_ORDER.map((severity) => {
              const meta = SEVERITY_META[severity];
              const isActive = activeSeverities.has(severity);
              const count = severityCounts[severity];

              return (
                <button
                  key={severity}
                  type="button"
                  aria-pressed={isActive}
                  data-severity={severity}
                  onClick={() => handleToggleSeverity(severity)}
                  className={cx(
                    'prism-focus-ring h-8 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105',
                    isActive ? 'prism-crystal' : 'prism-well opacity-60'
                  )}
                  style={{
                    color: isActive ? meta.accentColor : 'var(--prism-text-secondary)',
                  }}
                >
                  <span>{meta.label}</span>{' '}
                  <span
                    className="font-mono text-[11px] tabular-nums"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        ref={streamRef}
        role="log"
        aria-live={following ? 'polite' : 'off'}
        aria-relevant="additions text"
        aria-label={`${title} output`}
        onScroll={handleStreamScroll}
        className={cx(
          viewportClass,
          'prism-well rounded-2xl p-3 font-mono text-xs overflow-y-auto overflow-x-auto'
        )}
        style={{ maxHeight: `${safeMaxHeight}px` }}
      >
        {filteredEntries.length === 0 ? (
          <p
            data-testid="live-log-empty"
            className="py-8 text-center text-xs"
            style={STYLE_TEXT_SECONDARY}
          >
            {emptyMessage}
          </p>
        ) : (
          <ol className="m-0 p-0 list-none flex flex-col gap-1.5">
            {filteredEntries.map((entry) => {
              const meta = SEVERITY_META[entry.severity];
              return (
                <li
                  key={entry.id}
                  data-severity={entry.severity}
                  className={cx(
                    entryClass,
                    'prism-cv-row flex items-start gap-2 leading-relaxed py-0.5 border-b last:border-b-0'
                  )}
                  style={STYLE_BORDER_DIVIDER}
                >
                  <time
                    className="tabular-nums shrink-0 select-none"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {entry.timestamp}
                  </time>
                  <span
                    className={cx(
                      'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider shrink-0',
                      entry.severity === 'debug' ? 'prism-crystal' : undefined
                    )}
                    style={meta.badgeStyle}
                  >
                    {meta.badgeText}
                  </span>
                  {entry.source ? (
                    <span
                      className="prism-crystal rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0"
                      style={STYLE_SECONDARY_DARK}
                    >
                      {entry.source}
                    </span>
                  ) : null}
                  <span
                    className="min-w-0 flex-1 whitespace-pre-wrap break-words"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {entry.message}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

export const LiveLogStreamer = /*#__PURE__*/ memoWithDisplayName(LiveLogStreamerInner, 'LiveLogStreamer');
