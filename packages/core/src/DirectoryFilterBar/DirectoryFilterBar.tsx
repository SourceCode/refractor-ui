'use client';

import { useCallback, useId, useMemo } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FolderSearch,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_ERROR_MAIN, STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_SECONDARY_DARK, STYLE_SUCCESS_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN, compareLocaleStrings, compareNaturalStrings } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type DirectoryGroupBy = 'none' | 'kind' | 'date' | 'size';
export type DirectorySortDir = 'asc' | 'desc';
export type DirectoryTagTone = 'primary' | 'emerald' | 'amber' | 'info' | 'rose';

export interface DirectoryFilterItem {
  /** Unique identifier for the directory entry. */
  id: string;
  /** Visible filename rendered strictly as literal text. */
  name: string;
  /** File extension string (e.g., '.tsx', '.png', '.pdf'). */
  extension: string;
  /** Semantic file kind label used for grouping and metadata badges. */
  kind: string;
  /** File size in bytes used for size bucketing and human-readable display. */
  sizeBytes: number;
  /** Date recency group label (e.g., 'Today', 'This Week', 'Earlier'). */
  modifiedGroup: string;
  /** Optional semantic color tag tone rendered strictly with --prism-* tokens. */
  tag?: DirectoryTagTone;
}

export interface DirectoryFilterState {
  /** Case-insensitive literal filename substring query (never evaluated as RegExp). */
  query: string;
  /** Active file extension filter, or 'all' for every extension. */
  extension: string;
  /** Active color tag tone filter, or 'all' for every tag. */
  tag: DirectoryTagTone | 'all';
  /** Active grouping dimension for the live directory results preview. */
  groupBy: DirectoryGroupBy;
  /** Active alphabetical sort direction applied within each group. */
  sortDir: DirectorySortDir;
}

type DirectoryFilterBarBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface DirectoryFilterBarProps extends DirectoryFilterBarBaseProps {
  /** Optional visible heading linked via aria-labelledby. Defaults to 'Directory Filter & Grouping'. */
  title?: string;
  /** Directory items to filter, group, and sort; defaults to a realistic 8-item dataset when omitted. */
  items?: ReadonlyArray<DirectoryFilterItem>;
  /** Controlled filter and grouping state. */
  value?: DirectoryFilterState;
  /** Initial uncontrolled filter and grouping state. */
  defaultValue?: Partial<DirectoryFilterState>;
  /** Controls visibility of the live filtered & grouped directory preview panel. Defaults to true. */
  showResultsPreview?: boolean;
  /** Callback invoked with the updated normalized filter state and exact matching item count. */
  onChange?: (state: DirectoryFilterState, matchingCount: number) => void;
  /** Disables all search, pill, grouping, sorting, and reset controls. */
  disabled?: boolean;
}

type SizeBucketLabel = 'Small (< 100 KB)' | 'Medium (100 KB–10 MB)' | 'Large (> 10 MB)';

interface TagToneMeta {
  tone: DirectoryTagTone;
  label: string;
  dotColor: string;
  tintBg: string;
  tintBorder: string;
  activeBg: string;
}

interface ResolvedResultRow {
  key: string;
  item: DirectoryFilterItem;
}

interface ResolvedResultGroup {
  key: string;
  label: string | null;
  items: ReadonlyArray<ResolvedResultRow>;
}

const DEFAULT_TITLE = 'Directory Filter & Grouping';
const SIZE_SMALL_LIMIT_BYTES = 100 * 1024;
const SIZE_LARGE_THRESHOLD_BYTES = 10 * 1024 * 1024;

const DEFAULT_FILTER_STATE: DirectoryFilterState = {
  query: '',
  extension: 'all',
  tag: 'all',
  groupBy: 'none',
  sortDir: 'asc',
};

const DATE_GROUP_ORDER: ReadonlyArray<string> = ['Today', 'This Week', 'Earlier'];

const SIZE_BUCKET_ORDER: ReadonlyArray<string> = [
  'Small (< 100 KB)',
  'Medium (100 KB–10 MB)',
  'Large (> 10 MB)',
];

const TAG_TONE_LIST: ReadonlyArray<TagToneMeta> = [
  {
    tone: 'primary',
    label: 'Primary',
    dotColor: 'var(--prism-primary-main)',
    tintBg: 'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
    tintBorder: 'color-mix(in srgb, var(--prism-primary-main) 44%, transparent)',
    activeBg: 'color-mix(in srgb, var(--prism-primary-main) 24%, var(--prism-crystal-top))',
  },
  {
    tone: 'emerald',
    label: 'Emerald',
    dotColor: 'var(--prism-success-main)',
    tintBg: 'color-mix(in srgb, var(--prism-success-main) 14%, transparent)',
    tintBorder: 'color-mix(in srgb, var(--prism-success-main) 44%, transparent)',
    activeBg: 'color-mix(in srgb, var(--prism-success-main) 24%, var(--prism-crystal-top))',
  },
  {
    tone: 'amber',
    label: 'Amber',
    dotColor: 'var(--prism-warning-main)',
    tintBg: 'color-mix(in srgb, var(--prism-warning-main) 16%, transparent)',
    tintBorder: 'color-mix(in srgb, var(--prism-warning-main) 48%, transparent)',
    activeBg: 'color-mix(in srgb, var(--prism-warning-main) 26%, var(--prism-crystal-top))',
  },
  {
    tone: 'info',
    label: 'Info',
    dotColor: 'var(--prism-info-main)',
    tintBg: 'color-mix(in srgb, var(--prism-info-main) 14%, transparent)',
    tintBorder: 'color-mix(in srgb, var(--prism-info-main) 44%, transparent)',
    activeBg: 'color-mix(in srgb, var(--prism-info-main) 24%, var(--prism-crystal-top))',
  },
  {
    tone: 'rose',
    label: 'Rose',
    dotColor: 'var(--prism-error-main)',
    tintBg: 'color-mix(in srgb, var(--prism-error-main) 14%, transparent)',
    tintBorder: 'color-mix(in srgb, var(--prism-error-main) 44%, transparent)',
    activeBg: 'color-mix(in srgb, var(--prism-error-main) 24%, var(--prism-crystal-top))',
  },
];

const TAG_TONE_MAP: ReadonlyMap<DirectoryTagTone, TagToneMeta> = new Map(
  TAG_TONE_LIST.map((entry) => [entry.tone, entry])
);

const DEFAULT_DIRECTORY_ITEMS: ReadonlyArray<DirectoryFilterItem> = [
  {
    id: 'dfb-primary-button',
    name: 'PrimaryButton.tsx',
    extension: '.tsx',
    kind: 'TypeScript',
    sizeBytes: 4_920,
    modifiedGroup: 'Today',
    tag: 'primary',
  },
  {
    id: 'dfb-filter-bar',
    name: 'DirectoryFilterBar.tsx',
    extension: '.tsx',
    kind: 'TypeScript',
    sizeBytes: 18_432,
    modifiedGroup: 'Today',
    tag: 'info',
  },
  {
    id: 'dfb-prism-hero',
    name: 'Prism_Hero_4K.png',
    extension: '.png',
    kind: 'Image',
    sizeBytes: 2_621_440,
    modifiedGroup: 'Today',
    tag: 'emerald',
  },
  {
    id: 'dfb-architecture-spec',
    name: 'Architecture_Spec.pdf',
    extension: '.pdf',
    kind: 'Document',
    sizeBytes: 1_536_000,
    modifiedGroup: 'This Week',
    tag: 'rose',
  },
  {
    id: 'dfb-optical-icons',
    name: 'Optical_Icons_Pack.png',
    extension: '.png',
    kind: 'Image',
    sizeBytes: 420_864,
    modifiedGroup: 'This Week',
    tag: 'amber',
  },
  {
    id: 'dfb-release-bundle',
    name: 'Refractor_v138_Assets.zip',
    extension: '.zip',
    kind: 'Archive',
    sizeBytes: 18_874_368,
    modifiedGroup: 'This Week',
    tag: 'amber',
  },
  {
    id: 'dfb-ambient-master',
    name: 'Ambient_Studio_Master.wav',
    extension: '.wav',
    kind: 'Audio',
    sizeBytes: 29_360_128,
    modifiedGroup: 'Earlier',
    tag: 'emerald',
  },
  {
    id: 'dfb-audit-report',
    name: 'WCAG_Audit_Report.pdf',
    extension: '.pdf',
    kind: 'Document',
    sizeBytes: 76_800,
    modifiedGroup: 'Earlier',
  },
];

function parseGroupBy(raw: string | undefined): DirectoryGroupBy {
  if (raw === 'kind' || raw === 'date' || raw === 'size') {
    return raw;
  }
  return 'none';
}

function parseTagTone(raw: string | undefined): DirectoryTagTone | 'all' {
  if (
    raw === 'primary' ||
    raw === 'emerald' ||
    raw === 'amber' ||
    raw === 'info' ||
    raw === 'rose'
  ) {
    return raw;
  }
  return 'all';
}

function normalizeFilterState(raw?: Partial<DirectoryFilterState>): DirectoryFilterState {
  const query = raw?.query ?? '';
  const trimmedExt = raw?.extension?.trim() ?? '';
  const extension =
    trimmedExt.length > 0 && trimmedExt.toLowerCase() !== 'all' ? trimmedExt : 'all';
  const tag = parseTagTone(raw?.tag);
  const groupBy = parseGroupBy(raw?.groupBy);
  const sortDir: DirectorySortDir = raw?.sortDir === 'desc' ? 'desc' : 'asc';

  return {
    query,
    extension,
    tag,
    groupBy,
    sortDir,
  };
}

function sanitizeBytes(sizeBytes: number): number {
  return Number.isFinite(sizeBytes) && sizeBytes >= 0 ? sizeBytes : 0;
}

function getSizeBucket(sizeBytes: number): SizeBucketLabel {
  const safeBytes = sanitizeBytes(sizeBytes);
  if (safeBytes < SIZE_SMALL_LIMIT_BYTES) {
    return 'Small (< 100 KB)';
  }
  if (safeBytes <= SIZE_LARGE_THRESHOLD_BYTES) {
    return 'Medium (100 KB–10 MB)';
  }
  return 'Large (> 10 MB)';
}

function formatByteSize(sizeBytes: number): string {
  const safeBytes = sanitizeBytes(sizeBytes);
  if (safeBytes < 1024) {
    return `${Math.round(safeBytes)} B`;
  }
  if (safeBytes < 1024 * 1024) {
    const kb = safeBytes / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = safeBytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function filterDirectoryItems(
  items: ReadonlyArray<DirectoryFilterItem>,
  state: DirectoryFilterState
): DirectoryFilterItem[] {
  const normalizedQuery = state.query.trim().toLowerCase();

  return items.filter((item) => {
    if (normalizedQuery.length > 0 && !item.name.toLowerCase().includes(normalizedQuery)) {
      return false;
    }
    if (state.extension !== 'all' && item.extension.trim() !== state.extension) {
      return false;
    }
    if (state.tag !== 'all' && item.tag !== state.tag) {
      return false;
    }
    return true;
  });
}

function sortDirectoryItems(
  items: ReadonlyArray<DirectoryFilterItem>,
  sortDir: DirectorySortDir
): DirectoryFilterItem[] {
  const direction = sortDir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const byName = compareNaturalStrings(a.name, b.name);
    if (byName !== 0) {
      return byName * direction;
    }
    return compareLocaleStrings(a.id, b.id) * direction;
  });
}

function buildRowKeys(
  groupKey: string,
  items: ReadonlyArray<DirectoryFilterItem>
): ReadonlyArray<ResolvedResultRow> {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const count = seen.get(item.id) ?? 0;
    seen.set(item.id, count + 1);
    const suffix = count === 0 ? '' : `~${count + 1}`;
    return {
      key: `${groupKey}::${item.id}${suffix}`,
      item,
    };
  });
}

function groupAndSortItems(
  items: ReadonlyArray<DirectoryFilterItem>,
  groupBy: DirectoryGroupBy,
  sortDir: DirectorySortDir
): ReadonlyArray<ResolvedResultGroup> {
  if (items.length === 0) {
    return [];
  }

  if (groupBy === 'none') {
    const sorted = sortDirectoryItems(items, sortDir);
    return [
      {
        key: 'group::flat',
        label: null,
        items: buildRowKeys('flat', sorted),
      },
    ];
  }

  const buckets = new Map<string, DirectoryFilterItem[]>();

  for (const item of items) {
    let bucketKey: string;
    if (groupBy === 'kind') {
      bucketKey = item.kind.trim() || 'Other';
    } else if (groupBy === 'date') {
      bucketKey = item.modifiedGroup.trim() || 'Other';
    } else {
      bucketKey = getSizeBucket(item.sizeBytes);
    }

    const existing = buckets.get(bucketKey);
    if (existing) {
      existing.push(item);
    } else {
      buckets.set(bucketKey, [item]);
    }
  }

  const orderedEntries = Array.from(buckets.entries()).sort(([labelA], [labelB]) => {
    if (groupBy === 'size') {
      return SIZE_BUCKET_ORDER.indexOf(labelA) - SIZE_BUCKET_ORDER.indexOf(labelB);
    }
    if (groupBy === 'date') {
      const rankA = DATE_GROUP_ORDER.indexOf(labelA);
      const rankB = DATE_GROUP_ORDER.indexOf(labelB);
      const orderA = rankA === -1 ? DATE_GROUP_ORDER.length : rankA;
      const orderB = rankB === -1 ? DATE_GROUP_ORDER.length : rankB;
      if (orderA !== orderB) return orderA - orderB;
    }
    return compareLocaleStrings(labelA, labelB);
  });

  return orderedEntries.map(([label, bucketItems]) => {
    const groupKey = `group::${label}`;
    const sorted = sortDirectoryItems(bucketItems, sortDir);
    return {
      key: groupKey,
      label,
      items: buildRowKeys(groupKey, sorted),
    };
  });
}

function renderFileIcon(extension: string) {
  const ext = extension.trim().toLowerCase();
  const iconClass = 'w-4 h-4 shrink-0';

  if (ext === '.tsx' || ext === '.ts' || ext === '.js' || ext === '.jsx') {
    return (
      <FileCode
        aria-hidden="true"
        className={iconClass}
        style={STYLE_INFO_MAIN}
      />
    );
  }
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.svg' || ext === '.webp') {
    return (
      <FileImage
        aria-hidden="true"
        className={iconClass}
        style={STYLE_SUCCESS_MAIN}
      />
    );
  }
  if (ext === '.pdf' || ext === '.md' || ext === '.txt') {
    return (
      <FileText
        aria-hidden="true"
        className={iconClass}
        style={STYLE_ERROR_MAIN}
      />
    );
  }
  if (ext === '.zip' || ext === '.tar' || ext === '.gz') {
    return (
      <FileArchive
        aria-hidden="true"
        className={iconClass}
        style={STYLE_WARNING_MAIN}
      />
    );
  }
  if (ext === '.wav' || ext === '.mp3' || ext === '.flac') {
    return (
      <FileAudio
        aria-hidden="true"
        className={iconClass}
        style={STYLE_PRIMARY_MAIN}
      />
    );
  }
  return (
    <File
      aria-hidden="true"
      className={iconClass}
      style={STYLE_TEXT_SECONDARY}
    />
  );
}

const headerClass = /*#__PURE__*/ stableClassName('directory-filter-bar', 'header');
const controlsClass = /*#__PURE__*/ stableClassName('directory-filter-bar', 'controls');
const extensionsClass = /*#__PURE__*/ stableClassName('directory-filter-bar', 'extensions');
const tagsClass = /*#__PURE__*/ stableClassName('directory-filter-bar', 'tags');
const resultsClass = /*#__PURE__*/ stableClassName('directory-filter-bar', 'results');

function DirectoryFilterBarInner({
  title = DEFAULT_TITLE,
  items,
  value,
  defaultValue,
  showResultsPreview = true,
  onChange,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: DirectoryFilterBarProps) {
  const override = useComponentOverride('DirectoryFilterBar');
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const searchInputId = `${baseId}-search`;
  const groupSelectId = `${baseId}-group-by`;

  const sourceItems = items ?? DEFAULT_DIRECTORY_ITEMS;
  const safeTitle = title.trim() || DEFAULT_TITLE;

  const initialDefaultState = useMemo(() => normalizeFilterState(defaultValue), [defaultValue]);

  const [rawState, setRawState] = useControllableState<DirectoryFilterState>({
    value,
    defaultValue: initialDefaultState,
  });

  const state = useMemo(() => normalizeFilterState(rawState), [rawState]);

  const availableExtensions = useMemo(() => {
    const extSet = new Set<string>();
    for (const item of sourceItems) {
      const ext = item.extension.trim();
      if (ext.length > 0 && ext.toLowerCase() !== 'all') {
        extSet.add(ext);
      }
    }
    return Array.from(extSet).sort((a, b) => compareLocaleStrings(a, b));
  }, [sourceItems]);

  const filteredItems = useMemo(
    () => filterDirectoryItems(sourceItems, state),
    [sourceItems, state]
  );

  const groupedResults = useMemo(
    () => groupAndSortItems(filteredItems, state.groupBy, state.sortDir),
    [filteredItems, state.groupBy, state.sortDir]
  );

  const totalCount = sourceItems.length;
  const matchingCount = filteredItems.length;

  const hasActiveFilters =
    state.query.length > 0 ||
    state.extension !== 'all' ||
    state.tag !== 'all' ||
    state.groupBy !== 'none' ||
    state.sortDir !== 'asc';

  const commitState = useCallback(
    (draft: Partial<DirectoryFilterState>) => {
      if (disabled) return;
      const next = normalizeFilterState(draft);
      const nextMatchCount = filterDirectoryItems(sourceItems, next).length;
      setRawState(next);
      onChange?.(next, nextMatchCount);
    },
    [disabled, onChange, setRawState, sourceItems]
  );

  const handleSelectExtension = useCallback(
    (ext: string) => {
      const nextExtension = ext === 'all' || state.extension === ext ? 'all' : ext;
      commitState({ ...state, extension: nextExtension });
    },
    [commitState, state]
  );

  const handleSelectTag = useCallback(
    (tone: DirectoryTagTone | 'all') => {
      const nextTag: DirectoryTagTone | 'all' =
        tone === 'all' || state.tag === tone ? 'all' : tone;
      commitState({ ...state, tag: nextTag });
    },
    [commitState, state]
  );

  const handleToggleSortDir = useCallback(() => {
    const nextDir: DirectorySortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    commitState({ ...state, sortDir: nextDir });
  }, [commitState, state]);

  const handleResetFilters = useCallback(() => {
    commitState(DEFAULT_FILTER_STATE);
  }, [commitState]);

  const merged = mergeProps({
    themeTarget: themeProps('directory-filter-bar', {
      groupBy: state.groupBy,
      sortDir: state.sortDir,
      filtered: hasActiveFilters,
      empty: matchingCount === 0,
      preview: showResultsPreview,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 flex flex-col p-4 sm:p-5 gap-3.5',
      disabled && 'opacity-75'
    ),
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
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      {/* Sculpted Header: Title, Polite Live Match Count, and Reset Filters */}
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
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 min-w-0">
          <span
            aria-live="polite"
            aria-atomic="true"
            data-testid="directory-filter-match-count"
            data-matching-count={String(matchingCount)}
            data-total-count={String(totalCount)}
            className="prism-well rounded-full px-3 py-1 font-mono text-[11px] font-medium tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {`Showing ${matchingCount} of ${totalCount} items`}
          </span>

          {hasActiveFilters ? (
            <button
              type="button"
              disabled={disabled}
              data-testid="directory-filter-reset"
              onClick={handleResetFilters}
              className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-opacity"
              style={STYLE_TEXT_PRIMARY}
            >
              <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Reset Filters</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Inline Optical Toolbar Controls */}
      <div className={cx(controlsClass, 'flex flex-col gap-2.5 min-w-0 max-w-full')}>
        {/* Primary Row: Filename Search Well, Group By Select, Sort Asc / Desc Toggle */}
        <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
          <div className="prism-well flex-1 min-w-[200px] h-10 rounded-2xl px-3 flex items-center gap-2">
            <Search
              aria-hidden="true"
              className="w-4 h-4 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <label htmlFor={searchInputId} className="sr-only">
              Filter folder by filename
            </label>
            <input
              id={searchInputId}
              type="search"
              aria-label="Filter folder by filename"
              value={state.query}
              placeholder="Filter folder by filename..."
              disabled={disabled}
              onChange={(e) => commitState({ ...state, query: e.target.value })}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Escape' && state.query.length > 0) {
                  e.preventDefault();
                  commitState({ ...state, query: '' });
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              className="prism-focus-ring w-full min-w-0 bg-transparent text-xs sm:text-sm rounded-lg disabled:cursor-not-allowed disabled:opacity-60"
              style={STYLE_TEXT_PRIMARY}
            />
            {state.query.length > 0 ? (
              <button
                type="button"
                disabled={disabled}
                aria-label="Clear filename filter"
                data-testid="directory-filter-clear-query"
                onClick={() => commitState({ ...state, query: '' })}
                className="prism-focus-ring rounded-full p-1 shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={STYLE_TEXT_SECONDARY}
              >
                <X aria-hidden="true" className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 min-w-0">
            <label
              htmlFor={groupSelectId}
              className="text-xs font-medium shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              Group by
            </label>
            <select
              id={groupSelectId}
              aria-label="Group directory items by"
              data-testid="directory-filter-group-select"
              value={state.groupBy}
              disabled={disabled}
              onChange={(e) =>
                commitState({ ...state, groupBy: parseGroupBy(e.target.value) })
              }
              className="prism-well prism-focus-ring h-9 rounded-xl px-2.5 text-xs font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              style={STYLE_TEXT_PRIMARY}
            >
              <option value="none">None</option>
              <option value="kind">Kind</option>
              <option value="date">Date Modified</option>
              <option value="size">Size</option>
            </select>

            <button
              type="button"
              disabled={disabled}
              aria-pressed={state.sortDir === 'desc'}
              data-sort-dir={state.sortDir}
              data-testid="directory-filter-sort-toggle"
              onClick={handleToggleSortDir}
              className={cx(
                'prism-focus-ring h-9 px-3 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-[color,background-color,border-color,opacity,transform]',
                state.sortDir === 'desc' ? 'prism-crystal' : 'prism-well'
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              {state.sortDir === 'asc' ? (
                <ArrowUpNarrowWide
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0"
                  style={STYLE_PRIMARY_MAIN}
                />
              ) : (
                <ArrowDownWideNarrow
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0"
                  style={STYLE_SECONDARY_DARK}
                />
              )}
              <span>{state.sortDir === 'asc' ? 'Sort Asc' : 'Sort Desc'}</span>
            </button>
          </div>
        </div>

        {/* Secondary Row: Dynamic Extension Pills & --prism-* Tinted Color Tag Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full">
          <div
            role="group"
            aria-label="Filter by extension"
            data-testid="directory-filter-extensions"
            className={cx(extensionsClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wider mr-0.5 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              Extension
            </span>

            <button
              type="button"
              disabled={disabled}
              aria-pressed={state.extension === 'all'}
              data-extension="all"
              data-selected={state.extension === 'all' ? 'true' : undefined}
              data-testid="directory-filter-ext-all"
              onClick={() => handleSelectExtension('all')}
              className={cx(
                'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center text-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-[color,background-color,border-color,opacity,transform]',
                state.extension === 'all' ? 'prism-emerald font-semibold' : 'prism-crystal font-medium'
              )}
              style={
                state.extension === 'all' ? undefined : STYLE_TEXT_PRIMARY
              }
            >
              All
            </button>

            {availableExtensions.map((ext) => {
              const selected = state.extension === ext;
              return (
                <button
                  key={`ext::${ext}`}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  data-extension={ext}
                  data-selected={selected ? 'true' : undefined}
                  data-testid={`directory-filter-ext-${ext}`}
                  onClick={() => handleSelectExtension(ext)}
                  className={cx(
                    'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center font-mono text-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-[color,background-color,border-color,opacity,transform]',
                    selected ? 'prism-emerald font-semibold' : 'prism-crystal font-medium'
                  )}
                  style={selected ? undefined : STYLE_TEXT_PRIMARY}
                >
                  {ext}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Filter by color tag"
            data-testid="directory-filter-tags"
            className={cx(tagsClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wider mr-0.5 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              Tag
            </span>

            <button
              type="button"
              disabled={disabled}
              aria-pressed={state.tag === 'all'}
              data-tag="all"
              data-selected={state.tag === 'all' ? 'true' : undefined}
              data-testid="directory-filter-tag-all"
              onClick={() => handleSelectTag('all')}
              className={cx(
                'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center text-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-[color,background-color,border-color,opacity,transform]',
                state.tag === 'all' ? 'prism-emerald font-semibold' : 'prism-crystal font-medium'
              )}
              style={state.tag === 'all' ? undefined : STYLE_TEXT_PRIMARY}
            >
              All
            </button>

            {TAG_TONE_LIST.map((meta) => {
              const selected = state.tag === meta.tone;
              return (
                <button
                  key={meta.tone}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  data-tag={meta.tone}
                  data-selected={selected ? 'true' : undefined}
                  data-testid={`directory-filter-tag-${meta.tone}`}
                  onClick={() => handleSelectTag(meta.tone)}
                  className={cx(
                    'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-[color,background-color,border-color,opacity,transform]',
                    selected ? 'font-semibold' : 'font-medium'
                  )}
                  style={{
                    color: 'var(--prism-text-primary)',
                    backgroundColor: selected ? meta.activeBg : meta.tintBg,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: selected ? meta.dotColor : meta.tintBorder,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: meta.dotColor }}
                  />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Filtered & Grouped Directory Preview */}
      {showResultsPreview ? (
        matchingCount === 0 ? (
          <div
            role="status"
            data-testid="directory-filter-empty"
            className={cx(
              resultsClass,
              'prism-well rounded-2xl px-4 py-8 flex flex-col items-center justify-center text-center gap-1.5 min-w-0 max-w-full'
            )}
            style={STYLE_TEXT_SECONDARY}
          >
            <FolderSearch aria-hidden="true" className="w-5 h-5 shrink-0 opacity-80" />
            <p
              className="m-0 text-xs font-semibold"
              style={STYLE_TEXT_PRIMARY}
            >
              No matching directory items
            </p>
            <p className="m-0 text-xs">
              Adjust the filename query, extension filter, or color tag to inspect folder entries.
            </p>
          </div>
        ) : (
          <div
            data-testid="directory-filter-preview"
            className={cx(
              resultsClass,
              'prism-well rounded-2xl p-3 flex flex-col gap-3 min-w-0 max-w-full'
            )}
          >
            {groupedResults.map((group) => (
              <section
                key={group.key}
                aria-label={group.label ?? 'Matching directory items'}
                data-testid="directory-filter-group"
                data-group-label={group.label ?? 'flat'}
                className="flex flex-col gap-1.5 min-w-0 max-w-full"
              >
                {group.label !== null ? (
                  <div
                    data-testid="directory-filter-group-header"
                    className="px-2 py-1 flex items-center justify-between gap-2 min-w-0"
                    style={{
                      borderBottomWidth: '1px',
                      borderBottomStyle: 'solid',
                      borderBottomColor: 'var(--prism-divider)',
                    }}
                  >
                    <span
                      className="text-xs font-semibold truncate min-w-0"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {group.label}
                    </span>
                    <span
                      className="prism-crystal rounded-full px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {group.items.length}
                    </span>
                  </div>
                ) : null}

                <ul className="m-0 p-0 list-none flex flex-col gap-1.5 min-w-0">
                  {group.items.map(({ key, item }) => {
                    const tagMeta = item.tag ? TAG_TONE_MAP.get(item.tag) : undefined;
                    return (
                      <li
                        key={key}
                        data-testid="directory-filter-item"
                        data-item-id={item.id}
                        className="prism-crystal rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {renderFileIcon(item.extension)}
                          <span
                            className="text-xs font-semibold truncate min-w-0"
                            style={STYLE_TEXT_PRIMARY}
                          >
                            {item.name}
                          </span>
                          {tagMeta ? (
                            <span
                              data-testid="directory-filter-item-tag"
                              data-tag-tone={tagMeta.tone}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                              style={{
                                color: 'var(--prism-text-primary)',
                                backgroundColor: tagMeta.tintBg,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: tagMeta.tintBorder,
                              }}
                            >
                              <span
                                aria-hidden="true"
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: tagMeta.dotColor }}
                              />
                              <span>{tagMeta.label}</span>
                            </span>
                          ) : null}
                        </div>

                        <div
                          className="flex flex-wrap items-center gap-2 shrink-0 text-[11px] font-mono tabular-nums"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          <span className="prism-well rounded-full px-2 py-0.5">
                            {item.extension}
                          </span>
                          <span>{item.kind}</span>
                          <span>{item.modifiedGroup}</span>
                          <span
                            className="font-semibold"
                            style={STYLE_TEXT_PRIMARY}
                          >
                            {formatByteSize(item.sizeBytes)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

export const DirectoryFilterBar = /*#__PURE__*/ memoWithDisplayName(DirectoryFilterBarInner, 'DirectoryFilterBar');
