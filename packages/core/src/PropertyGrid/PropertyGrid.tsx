'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { Check, Copy, Inbox, Search, SlidersHorizontal, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type PropertyGridDensity = 'compact' | 'comfortable';
export type PropertyGridLayout = 'horizontal' | 'stacked';

export interface PropertyGridEntry {
  /** Unique identifier for this metadata property row. */
  id: string;
  /** Human-readable field label rendered inside the semantic `<dt>`. */
  label: string;
  /** Arbitrary value or interactive control (text, badges, switches, pills, links) rendered inside `<dd>`. */
  value: ReactNode;
  /** Optional plain-text payload enabling the inline copy button for this entry. */
  copyValue?: string;
  /** Optional secondary descriptive hint rendered beneath the label and indexed by search. */
  hint?: string;
  /** Spans both grid columns on `sm:` and wider viewports when `columns={2}`. */
  spanFull?: boolean;
  /** Formats the value container using monospace and tabular numerals. */
  monospace?: boolean;
}

export interface PropertyGridProps extends BaseProps<HTMLDivElement> {
  /** Metadata entries to inspect; defaults to 6 deployment inspector entries when omitted. Pass `[]` for an empty state. */
  entries?: ReadonlyArray<PropertyGridEntry>;
  /** Responsive column count (`1` single-column or `2` with `grid-cols-1 sm:grid-cols-2`). Defaults to `1`. */
  columns?: 1 | 2;
  /** Vertical spacing density (`'compact'` | `'comfortable'`). Defaults to `'comfortable'`. */
  density?: PropertyGridDensity;
  /** Row arrangement (`'horizontal'` label/value split on `sm:`+ or `'stacked'` vertically). Defaults to `'horizontal'`. */
  layout?: PropertyGridLayout;
  /** Displays a compact live filter input matching entries by `label` and `hint`. Defaults to `false`. */
  searchable?: boolean;
  /** Visible inspector panel heading linked via `aria-labelledby`. Defaults to `'Object Metadata Inspector'`. */
  title?: string;
  /** Callback invoked with the copied entry and text payload whenever an entry copy button is activated. */
  onCopyEntry?: (entry: PropertyGridEntry, copiedText: string) => void;
}

interface PreparedEntry {
  key: string;
  label: string;
  hint?: string;
  copyValue?: string;
  original: PropertyGridEntry;
}

const DEFAULT_TITLE = 'Object Metadata Inspector';
const COPY_FEEDBACK_DURATION_MS = 1600;

const DEFAULT_ENTRIES: ReadonlyArray<PropertyGridEntry> = [
  {
    id: 'deployment-id',
    label: 'Deployment ID',
    value: 'dpl_9f4a2c8e7b10',
    copyValue: 'dpl_9f4a2c8e7b10',
    monospace: true,
    hint: 'Immutable control-plane rollout identifier',
  },
  {
    id: 'release-status',
    label: 'Release Status',
    value: (
      <span className="prism-emerald inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold">
        Active · Healthy
      </span>
    ),
    hint: 'All 12 regional edge replicas passing readiness probes',
  },
  {
    id: 'git-revision',
    label: 'Git Revision',
    value: 'main@7c3e91f4',
    copyValue: '7c3e91f4a82d1e0b6c4f9201d3b7e5a1',
    monospace: true,
    hint: 'Signed commit SHA verified by release pipeline',
  },
  {
    id: 'region-cluster',
    label: 'Region & Cluster',
    value: 'us-east-1 · prism-edge-04',
    copyValue: 'us-east-1/prism-edge-04',
    monospace: true,
    hint: 'Primary optical routing cluster',
  },
  {
    id: 'runtime-digest',
    label: 'Runtime Digest',
    value: 'ghcr.io/refractor/gateway:v2.14.0',
    copyValue: 'ghcr.io/refractor/gateway:v2.14.0',
    monospace: true,
    hint: 'OCI container artifact digest',
  },
  {
    id: 'traffic-policy',
    label: 'Traffic Policy',
    value: '100% Production · mTLS Enforced',
    hint: 'Zero-downtime canary promotion completed',
  },
];

const headerClass = /*#__PURE__*/ stableClassName('property-grid', 'header');
const searchClass = /*#__PURE__*/ stableClassName('property-grid', 'search');
const listClass = /*#__PURE__*/ stableClassName('property-grid', 'list');
const rowClass = /*#__PURE__*/ stableClassName('property-grid', 'row');
const labelClass = /*#__PURE__*/ stableClassName('property-grid', 'label');
const valueClass = /*#__PURE__*/ stableClassName('property-grid', 'value');

function PropertyGridInner({
  entries,
  columns = 1,
  density = 'comfortable',
  layout = 'horizontal',
  searchable = false,
  title = DEFAULT_TITLE,
  onCopyEntry,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: PropertyGridProps) {
  const override = useComponentOverride('PropertyGrid');
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const searchId = `${baseId}-search`;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCopyTimer = useCallback(() => {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCopyTimer();
    };
  }, [clearCopyTimer]);

  const safeTitle = title.trim() || DEFAULT_TITLE;
  const sourceEntries = entries ?? DEFAULT_ENTRIES;

  const preparedEntries = useMemo<ReadonlyArray<PreparedEntry>>(() => {
    const seenCounts = new Map<string, number>();
    return sourceEntries.map((entry, idx) => {
      const baseKey = entry.id.trim() || `entry-${idx + 1}`;
      const seen = seenCounts.get(baseKey) ?? 0;
      seenCounts.set(baseKey, seen + 1);
      const key = seen === 0 ? baseKey : `${baseKey}-${seen + 1}`;
      const cleanLabel = entry.label.trim() || baseKey;
      const cleanHint = entry.hint?.trim() || undefined;
      const cleanCopyValue =
        typeof entry.copyValue === 'string' && entry.copyValue.length > 0
          ? entry.copyValue
          : undefined;
      return {
        key,
        label: cleanLabel,
        hint: cleanHint,
        copyValue: cleanCopyValue,
        original: entry,
      };
    });
  }, [sourceEntries]);

  const normalizedQuery = searchable ? searchQuery.trim().toLowerCase() : '';
  const hasActiveFilter = normalizedQuery.length > 0;

  const visibleEntries = useMemo<ReadonlyArray<PreparedEntry>>(() => {
    if (!hasActiveFilter) {
      return preparedEntries;
    }
    return preparedEntries.filter((entry) => {
      const matchesLabel = entry.label.toLowerCase().includes(normalizedQuery);
      const matchesHint = entry.hint ? entry.hint.toLowerCase().includes(normalizedQuery) : false;
      return matchesLabel || matchesHint;
    });
  }, [hasActiveFilter, normalizedQuery, preparedEntries]);

  const isEmpty = preparedEntries.length === 0;
  const isCompact = density === 'compact';
  const isStacked = layout === 'stacked';

  const handleCopyEntry = useCallback(
    (entry: PreparedEntry, copyText: string) => {
      try {
        const clipboard = navigator.clipboard;
        if (clipboard && typeof clipboard.writeText === 'function') {
          void Promise.resolve(clipboard.writeText(copyText)).catch(() => undefined);
        }
      } catch {
        // Clipboard API unavailable or restricted; continue with callback and confirmation state.
      }

      onCopyEntry?.(entry.original, copyText);
      setCopiedKey(entry.key);
      setStatusMessage(`Copied ${entry.label} to clipboard.`);

      clearCopyTimer();
      copyTimerRef.current = setTimeout(() => {
        setCopiedKey(null);
        copyTimerRef.current = null;
      }, COPY_FEEDBACK_DURATION_MS);
    },
    [clearCopyTimer, onCopyEntry]
  );

  const handleCopyKeyDown = useCallback(
    (entry: PreparedEntry, copyText: string) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleCopyEntry(entry, copyText);
      }
    },
    [handleCopyEntry]
  );

  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Escape' && searchQuery.length > 0) {
        event.preventDefault();
        setSearchQuery('');
      }
    },
    [searchQuery]
  );

  const merged = mergeProps({
    themeTarget: themeProps('property-grid', {
      columns,
      density,
      layout,
      searchable,
      empty: isEmpty,
      filtered: hasActiveFilter,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 flex flex-col',
      isCompact ? 'p-3.5 sm:p-4 gap-2.5' : 'p-4 sm:p-5 gap-3.5'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const countLabel = hasActiveFilter
    ? `${visibleEntries.length} / ${preparedEntries.length} ${preparedEntries.length === 1 ? 'property' : 'properties'}`
    : `${preparedEntries.length} ${preparedEntries.length === 1 ? 'property' : 'properties'}`;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      {/* Sculpted Optical Inspector Header */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <SlidersHorizontal aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          </span>
          <h3
            id={headingId}
            className="m-0 text-sm font-semibold tracking-tight truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {safeTitle}
          </h3>
          <span
            data-testid="property-grid-count"
            className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {countLabel}
          </span>
        </div>

        {searchable ? (
          <div
            className={cx(
              searchClass,
              'prism-well rounded-full px-3 h-8 flex items-center gap-2 min-w-0 max-w-full w-full sm:w-60'
            )}
          >
            <Search
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <input
              id={searchId}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Filter properties..."
              aria-label={`Filter ${safeTitle} properties`}
              data-testid="property-grid-search-input"
              className="bg-transparent border-0 outline-none text-xs w-full min-w-0 prism-focus-ring rounded-full"
              style={STYLE_TEXT_PRIMARY}
            />
            {searchQuery.length > 0 ? (
              <button
                type="button"
                aria-label="Clear filter"
                data-testid="property-grid-clear-search"
                onClick={() => setSearchQuery('')}
                className="prism-focus-ring rounded-full p-0.5 inline-flex items-center justify-center shrink-0 cursor-pointer transition-opacity hover:opacity-80"
                style={STYLE_TEXT_SECONDARY}
              >
                <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Body: Empty State, No-Matches State, or Semantic <dl> Grid */}
      {isEmpty ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="property-grid-empty"
          className="prism-well rounded-2xl px-4 py-6 flex flex-col items-center justify-center text-center gap-1.5 min-w-0 max-w-full"
          style={STYLE_TEXT_SECONDARY}
        >
          <Inbox aria-hidden="true" className="w-5 h-5 shrink-0 opacity-75" />
          <p className="m-0 text-xs font-semibold" style={STYLE_TEXT_PRIMARY}>
            No properties available
          </p>
          <p className="m-0 text-xs">
            Provide metadata entries to inspect object attributes and controls.
          </p>
        </div>
      ) : visibleEntries.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="property-grid-no-matches"
          className="prism-well rounded-2xl px-4 py-6 flex flex-col items-center justify-center text-center gap-2 min-w-0 max-w-full"
          style={STYLE_TEXT_SECONDARY}
        >
          <Search aria-hidden="true" className="w-5 h-5 shrink-0 opacity-75" />
          <p className="m-0 text-xs font-semibold" style={STYLE_TEXT_PRIMARY}>
            No matching properties
          </p>
          <p className="m-0 text-xs">No fields matched &ldquo;{searchQuery.trim()}&rdquo;.</p>
          <button
            type="button"
            data-testid="property-grid-reset-filter"
            onClick={() => setSearchQuery('')}
            className="prism-crystal prism-focus-ring mt-1 h-7 px-3 rounded-full text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform] hover:brightness-105"
            style={STYLE_TEXT_PRIMARY}
          >
            Clear filter
          </button>
        </div>
      ) : (
        <>
          <dl
            data-testid="property-grid-list"
            className={cx(
              listClass,
              'm-0 grid min-w-0 max-w-full',
              columns === 2 ? 'grid-cols-1 sm:grid-cols-2 sm:gap-x-6' : 'grid-cols-1'
            )}
            style={{
              borderTopWidth: '1px',
              borderTopStyle: 'solid',
              borderTopColor: 'var(--prism-divider)',
            }}
          >
            {visibleEntries.map((entry) => {
              const isCopied = copiedKey === entry.key;
              const copyText = entry.copyValue;

              return (
                <div
                  key={entry.key}
                  data-testid={`property-grid-row-${entry.key}`}
                  data-entry-id={entry.original.id}
                  data-span-full={entry.original.spanFull ? 'true' : undefined}
                  className={cx(
                    rowClass,
                    'min-w-0 max-w-full flex',
                    isCompact ? 'py-2 gap-1.5' : 'py-3 gap-2.5',
                    isStacked ? 'flex-col' : 'flex-col sm:flex-row sm:items-start sm:justify-between',
                    columns === 2 && entry.original.spanFull ? 'sm:col-span-2' : undefined
                  )}
                  style={{
                    borderBottomWidth: '1px',
                    borderBottomStyle: 'solid',
                    borderBottomColor: 'var(--prism-divider)',
                  }}
                >
                  <dt
                    className={cx(
                      labelClass,
                      'min-w-0 max-w-full flex flex-col gap-0.5',
                      isStacked ? undefined : 'sm:w-2/5 sm:max-w-[14rem] sm:shrink-0'
                    )}
                  >
                    <span
                      className="text-xs font-medium leading-snug break-words"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {entry.label}
                    </span>
                    {entry.hint ? (
                      <span
                        data-testid={`property-grid-hint-${entry.key}`}
                        className="text-[11px] leading-snug break-words opacity-80"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {entry.hint}
                      </span>
                    ) : null}
                  </dt>

                  <dd
                    className={cx(
                      valueClass,
                      'm-0 min-w-0 max-w-full flex-1 flex flex-wrap items-center justify-between gap-2'
                    )}
                  >
                    <div
                      data-testid={`property-grid-value-${entry.key}`}
                      data-monospace={entry.original.monospace ? 'true' : undefined}
                      className={cx(
                        'min-w-0 max-w-full flex-1 break-words text-xs sm:text-sm leading-relaxed',
                        entry.original.monospace ? 'font-mono tabular-nums' : 'font-medium'
                      )}
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {entry.original.value}
                    </div>

                    {copyText !== undefined ? (
                      <button
                        type="button"
                        aria-label={isCopied ? `Copied ${entry.label}` : `Copy ${entry.label}`}
                        data-copied={isCopied ? 'true' : undefined}
                        data-testid={`property-grid-copy-${entry.key}`}
                        onClick={() => handleCopyEntry(entry, copyText)}
                        onKeyDown={handleCopyKeyDown(entry, copyText)}
                        className={cx(
                          'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center justify-center gap-1 text-[11px] font-medium whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer hover:brightness-105',
                          isCopied ? 'prism-emerald font-semibold' : 'prism-crystal'
                        )}
                        style={isCopied ? undefined : STYLE_TEXT_SECONDARY}
                      >
                        {isCopied ? (
                          <>
                            <Check aria-hidden="true" className="w-3 h-3 shrink-0" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy aria-hidden="true" className="w-3 h-3 shrink-0" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    ) : null}
                  </dd>
                </div>
              );
            })}
          </dl>

          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="property-grid-live-status"
            className="sr-only"
          >
            {statusMessage}
          </span>
        </>
      )}
    </div>
  );
}

export const PropertyGrid = /*#__PURE__*/ memoWithDisplayName(PropertyGridInner, 'PropertyGrid');
