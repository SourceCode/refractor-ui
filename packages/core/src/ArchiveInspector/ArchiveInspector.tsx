'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  ArrowDownToLine,
  Eye,
  FileArchive,
  FileText,
  Folder,
  Inbox,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_ERROR_MAIN, STYLE_INFO_MAIN, STYLE_SUCCESS_DARK, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type ArchiveFormatKind = 'zip' | 'tar' | '7z';

export interface ArchiveVirtualEntry {
  /** Unique identifier for the virtual archive entry. */
  id: string;
  /** Relative archive path rendered strictly as literal text and validated against Zip-Slip traversal. */
  path: string;
  /** Semantic entry kind controlling folder/file iconography and zero-byte formatting. */
  kind: 'file' | 'folder';
  /** Uncompressed payload size in bytes (sanitized against zero, negative, and non-finite inputs). */
  uncompressedBytes: number;
  /** Compressed payload size in bytes inside the archive. */
  compressedBytes: number;
  /** Human-readable modification timestamp displayed in entry metadata and preview pane. */
  modifiedAt: string;
  /** Optional virtual text preview rendered strictly as literal text inside the recessed preview pane. */
  previewText?: string;
}

type ArchiveInspectorBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ArchiveInspectorProps extends ArchiveInspectorBaseProps {
  /** Display archive filename rendered in the slab header. Defaults to `'refractor-optical-assets.zip'`. */
  archiveName?: string;
  /** Archive container format badge (`.zip`, `.tar`, or `.7z`). Defaults to `'zip'`. */
  format?: ArchiveFormatKind;
  /** Virtual archive entries to inspect; omit for realistic built-in sample entries or pass `[]` for an empty state. */
  entries?: ReadonlyArray<ArchiveVirtualEntry>;
  /** Callback invoked with the safe selected (or all safe) entries when extraction is triggered. */
  onExtract?: (entries: ReadonlyArray<ArchiveVirtualEntry>) => void;
  /** Disables archive search, selection checkboxes, entry previews, and extraction actions. */
  disabled?: boolean;
}

interface ArchiveFormatMeta {
  extension: string;
  label: string;
  accentToken: string;
}

interface AnnotatedArchiveEntry {
  renderKey: string;
  entry: ArchiveVirtualEntry;
  isSafe: boolean;
  savingsPercent: number;
}

const DEFAULT_ARCHIVE_NAME = 'refractor-optical-assets.zip';
const WINDOWS_DRIVE_PREFIX_RE = /^[A-Za-z]:/;

const DEFAULT_ARCHIVE_ENTRIES: ReadonlyArray<ArchiveVirtualEntry> = [
  {
    id: 'entry-shaders-dir',
    path: 'shaders/',
    kind: 'folder',
    uncompressedBytes: 0,
    compressedBytes: 0,
    modifiedAt: '2026-11-20 09:15 UTC',
    previewText: 'Directory containing WGSL caustic and optical dispersion fragment shaders.',
  },
  {
    id: 'entry-caustics-wgsl',
    path: 'shaders/caustics.wgsl',
    kind: 'file',
    uncompressedBytes: 18_432,
    compressedBytes: 5_120,
    modifiedAt: '2026-11-20 09:18 UTC',
    previewText: [
      '@fragment',
      'fn fs_caustics(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {',
      '  let dispersion = sin(uv.x * 6.28318) * 0.14;',
      '  return vec4<f32>(0.91, 0.36 + dispersion, 0.14, 0.84);',
      '}',
    ].join('\n'),
  },
  {
    id: 'entry-manifest-json',
    path: 'manifest.json',
    kind: 'file',
    uncompressedBytes: 4_096,
    compressedBytes: 1_280,
    modifiedAt: '2026-11-21 14:05 UTC',
    previewText: [
      '{',
      '  "bundle": "refractor-optical-assets",',
      '  "version": "1.3.9",',
      '  "format": "zip",',
      '  "integrity": "sha256-verified"',
      '}',
    ].join('\n'),
  },
  {
    id: 'entry-tokens-css',
    path: 'tokens/alabaster-glass.css',
    kind: 'file',
    uncompressedBytes: 12_288,
    compressedBytes: 3_072,
    modifiedAt: '2026-11-21 16:40 UTC',
    previewText: [
      ':root {',
      '  --prism-blur-px: 18px;',
      '  --prism-caustic-opacity: 1;',
      '  --prism-radius-slab: 24px;',
      '}',
    ].join('\n'),
  },
  {
    id: 'entry-lut-cube',
    path: 'assets/refraction-lut.cube',
    kind: 'file',
    uncompressedBytes: 65_536,
    compressedBytes: 22_528,
    modifiedAt: '2026-11-19 11:30 UTC',
    previewText: [
      'TITLE "Refractor Optical P3 LUT"',
      'LUT_3D_SIZE 17',
      '0.000000 0.000000 0.000000',
      '0.062500 0.058824 0.066667',
    ].join('\n'),
  },
  {
    id: 'entry-readme-md',
    path: 'README.md',
    kind: 'file',
    uncompressedBytes: 6_144,
    compressedBytes: 2_304,
    modifiedAt: '2026-11-22 08:00 UTC',
    previewText:
      '# Refractor Optical Assets\n\nVerified optical shaders, cascade glass tokens, and 3D LUT calibration files.',
  },
];

/**
 * Pure Zip-Slip / path-traversal guard for virtual archive entries.
 * Rejects empty paths, null bytes (`\0`), leading `/` or `\`, Windows drive prefixes (`C:`),
 * and any `..` traversal segment across forward or backward slash separators.
 */
export function isSafeArchiveEntryPath(entryPath: string): boolean {
  if (entryPath.trim().length === 0) {
    return false;
  }
  if (entryPath.includes('\0')) {
    return false;
  }
  if (entryPath.startsWith('/') || entryPath.startsWith('\\')) {
    return false;
  }
  const segments = entryPath.split(/[\\/]/);
  for (const segment of segments) {
    if (segment === '..' || WINDOWS_DRIVE_PREFIX_RE.test(segment)) {
      return false;
    }
  }
  return true;
}

function sanitizeByteCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value;
}

function formatArchiveBytes(bytes: number, kind: 'file' | 'folder' = 'file'): string {
  const safe = sanitizeByteCount(bytes);
  if (kind === 'folder' && safe === 0) {
    return '—';
  }
  if (safe < 1024) {
    return `${Math.round(safe)} B`;
  }
  if (safe < 1024 * 1024) {
    return `${(safe / 1024).toFixed(1)} KB`;
  }
  if (safe < 1024 * 1024 * 1024) {
    return `${(safe / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(safe / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function computeCompressionSavingsPercent(
  uncompressedBytes: number,
  compressedBytes: number
): number {
  if (
    !Number.isFinite(uncompressedBytes) ||
    !Number.isFinite(compressedBytes) ||
    uncompressedBytes <= 0 ||
    compressedBytes < 0
  ) {
    return 0;
  }
  const rawPercent = ((uncompressedBytes - compressedBytes) / uncompressedBytes) * 100;
  return Math.max(0, Math.min(100, Math.round(rawPercent)));
}

function getFormatMeta(format: ArchiveFormatKind): ArchiveFormatMeta {
  switch (format) {
    case 'zip':
      return {
        extension: '.zip',
        label: 'ZIP Archive',
        accentToken: 'var(--prism-info-main)',
      };
    case 'tar':
      return {
        extension: '.tar',
        label: 'TAR Archive',
        accentToken: 'var(--prism-warning-main)',
      };
    case '7z':
      return {
        extension: '.7z',
        label: '7-Zip Archive',
        accentToken: 'var(--prism-primary-main)',
      };
  }
}

function formatEntryNoun(count: number): string {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`;
}

const headerClass = /*#__PURE__*/ stableClassName('archive-inspector', 'header');
const tableClass = /*#__PURE__*/ stableClassName('archive-inspector', 'table');
const previewClass = /*#__PURE__*/ stableClassName('archive-inspector', 'preview');
const footerClass = /*#__PURE__*/ stableClassName('archive-inspector', 'footer');
const announcementClass = /*#__PURE__*/ stableClassName('archive-inspector', 'announcement');

function ArchiveInspectorInner({
  archiveName = DEFAULT_ARCHIVE_NAME,
  format = 'zip',
  entries,
  onExtract,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: ArchiveInspectorProps) {
  const override = useComponentOverride('ArchiveInspector');
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const selectAllRef = useRef<HTMLInputElement>(null);

  const safeArchiveName = archiveName.trim() || DEFAULT_ARCHIVE_NAME;
  const formatMeta = getFormatMeta(format);
  const resolvedEntries = entries === undefined ? DEFAULT_ARCHIVE_ENTRIES : entries;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [previewEntryId, setPreviewEntryId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>(
    'Ready to inspect and extract safe archive entries.'
  );

  const annotatedEntries = useMemo<ReadonlyArray<AnnotatedArchiveEntry>>(() => {
    const idCounts = new Map<string, number>();
    return resolvedEntries.map((entry) => {
      const seenCount = idCounts.get(entry.id) ?? 0;
      idCounts.set(entry.id, seenCount + 1);
      return {
        renderKey: seenCount === 0 ? entry.id : `${entry.id}~${seenCount + 1}`,
        entry,
        isSafe: isSafeArchiveEntryPath(entry.path),
        savingsPercent: computeCompressionSavingsPercent(
          entry.uncompressedBytes,
          entry.compressedBytes
        ),
      };
    });
  }, [resolvedEntries]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredEntries = useMemo<ReadonlyArray<AnnotatedArchiveEntry>>(() => {
    if (normalizedQuery.length === 0) {
      return annotatedEntries;
    }
    return annotatedEntries.filter((item) =>
      item.entry.path.toLowerCase().includes(normalizedQuery)
    );
  }, [annotatedEntries, normalizedQuery]);

  const {
    safeEntries,
    unsafeCount,
    totalUncompressed,
    totalCompressed,
    totalSavingsPercent,
  } = useMemo(() => {
    const safeList: ArchiveVirtualEntry[] = [];
    let blockedCount = 0;
    let uncompressedSum = 0;
    let compressedSum = 0;
    let validSavingsUncompressed = 0;
    let validSavingsCompressed = 0;

    for (const item of annotatedEntries) {
      if (item.isSafe) {
        safeList.push(item.entry);
      } else {
        blockedCount += 1;
      }

      const safeUncompressed = sanitizeByteCount(item.entry.uncompressedBytes);
      const safeCompressed = sanitizeByteCount(item.entry.compressedBytes);
      uncompressedSum += safeUncompressed;
      compressedSum += safeCompressed;

      if (
        Number.isFinite(item.entry.uncompressedBytes) &&
        Number.isFinite(item.entry.compressedBytes) &&
        item.entry.uncompressedBytes > 0 &&
        item.entry.compressedBytes >= 0
      ) {
        validSavingsUncompressed += item.entry.uncompressedBytes;
        validSavingsCompressed += item.entry.compressedBytes;
      }
    }

    return {
      safeEntries: safeList,
      unsafeCount: blockedCount,
      totalUncompressed: uncompressedSum,
      totalCompressed: compressedSum,
      totalSavingsPercent: computeCompressionSavingsPercent(
        validSavingsUncompressed,
        validSavingsCompressed
      ),
    };
  }, [annotatedEntries]);

  const visibleSafeEntries = useMemo<ReadonlyArray<ArchiveVirtualEntry>>(
    () => filteredEntries.filter((item) => item.isSafe).map((item) => item.entry),
    [filteredEntries]
  );

  const selectedSafeEntries = useMemo<ReadonlyArray<ArchiveVirtualEntry>>(
    () => safeEntries.filter((entry) => selectedIds.has(entry.id)),
    [safeEntries, selectedIds]
  );

  const selectedVisibleSafeCount = useMemo<number>(() => {
    let count = 0;
    for (const entry of visibleSafeEntries) {
      if (selectedIds.has(entry.id)) {
        count += 1;
      }
    }
    return count;
  }, [visibleSafeEntries, selectedIds]);

  const allVisibleSafeSelected =
    visibleSafeEntries.length > 0 && selectedVisibleSafeCount === visibleSafeEntries.length;
  const someVisibleSafeSelected =
    selectedVisibleSafeCount > 0 && selectedVisibleSafeCount < visibleSafeEntries.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSafeSelected;
    }
  }, [someVisibleSafeSelected]);

  const previewedItem = useMemo<AnnotatedArchiveEntry | null>(() => {
    if (previewEntryId === null) {
      return null;
    }
    return annotatedEntries.find((item) => item.entry.id === previewEntryId) ?? null;
  }, [annotatedEntries, previewEntryId]);

  const selectedCount = selectedSafeEntries.length;
  const canToggleSelectAll = !disabled && visibleSafeEntries.length > 0;
  const canExtractSelected = !disabled && selectedCount > 0;
  const canExtractAllSafe = !disabled && safeEntries.length > 0;

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape' && searchQuery.length > 0) {
      event.preventDefault();
      setSearchQuery('');
      setAnnouncement('Cleared archive search filter.');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setAnnouncement('Cleared archive search filter.');
  };

  const handleToggleRow = (entry: ArchiveVirtualEntry) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entry.id)) {
        next.delete(entry.id);
      } else {
        next.add(entry.id);
      }
      return next;
    });
  };

  const handleToggleSelectAllSafe = () => {
    if (allVisibleSafeSelected) {
      const visibleSafeIds = new Set(visibleSafeEntries.map((entry) => entry.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleSafeIds) {
          next.delete(id);
        }
        return next;
      });
      setAnnouncement(`Deselected ${formatEntryNoun(visibleSafeEntries.length)}.`);
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const entry of visibleSafeEntries) {
        next.add(entry.id);
      }
      return next;
    });
    setAnnouncement(`Selected ${formatEntryNoun(visibleSafeEntries.length)} safe for extraction.`);
  };

  const handlePreviewEntry = (entry: ArchiveVirtualEntry) => {
    setPreviewEntryId(entry.id);
    setAnnouncement(`Previewing ${entry.path}.`);
  };

  const handleClosePreview = () => {
    setPreviewEntryId(null);
    setAnnouncement('Closed virtual entry preview.');
  };

  const handleExtractSelected = () => {
    onExtract?.(selectedSafeEntries);
    setAnnouncement(
      `Extracted ${formatEntryNoun(selectedSafeEntries.length)} selected from ${safeArchiveName}.`
    );
  };

  const handleExtractAllSafe = () => {
    onExtract?.(safeEntries);
    setAnnouncement(
      unsafeCount > 0
        ? `Extracted all ${formatEntryNoun(safeEntries.length)} safe from ${safeArchiveName} (${unsafeCount} unsafe ${unsafeCount === 1 ? 'path' : 'paths'} skipped).`
        : `Extracted all ${formatEntryNoun(safeEntries.length)} safe from ${safeArchiveName}.`
    );
  };

  const merged = mergeProps({
    themeTarget: themeProps('archive-inspector', {
      format,
      disabled,
      empty: resolvedEntries.length === 0,
      hasUnsafe: unsafeCount > 0,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 flex flex-col gap-3.5 p-4 sm:p-5',
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
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Header: Archive Name, Format Badge, Telemetry, Compression Ratio Pill & Search */}
      <div
        data-testid="archive-inspector-header"
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-3 pb-3 border-b min-w-0 max-w-full'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: formatMeta.accentToken }}
          >
            <FileArchive aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>

          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h2
                id={headingId}
                data-testid="archive-inspector-name"
                className="m-0 text-sm font-semibold tracking-tight break-words min-w-0"
                style={STYLE_TEXT_PRIMARY}
              >
                {safeArchiveName}
              </h2>

              <span
                data-testid="archive-inspector-format"
                title={formatMeta.label}
                className="prism-crystal rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide shrink-0 border"
                style={{
                  color: formatMeta.accentToken,
                  borderColor: `color-mix(in srgb, ${formatMeta.accentToken} 40%, transparent)`,
                }}
              >
                {formatMeta.extension}
              </span>

              <span
                data-testid="archive-inspector-ratio"
                className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums shrink-0"
                style={STYLE_SUCCESS_DARK}
              >
                {totalSavingsPercent}% saved
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
              <span
                data-testid="archive-inspector-telemetry"
                className="font-mono text-[11px] tabular-nums"
                style={STYLE_TEXT_SECONDARY}
              >
                {formatArchiveBytes(totalUncompressed)} → {formatArchiveBytes(totalCompressed)}
              </span>

              <span
                className="font-mono text-[11px] tabular-nums"
                style={STYLE_TEXT_SECONDARY}
              >
                · {formatEntryNoun(resolvedEntries.length)}
              </span>

              {unsafeCount > 0 ? (
                <span
                  data-testid="archive-inspector-unsafe-summary"
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold tabular-nums"
                  style={STYLE_ERROR_MAIN}
                >
                  <ShieldAlert aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  <span>{unsafeCount} unsafe blocked</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative flex items-center min-w-[200px] w-full sm:w-auto sm:min-w-[240px] max-w-full">
          <Search
            aria-hidden="true"
            className="w-3.5 h-3.5 absolute left-3 pointer-events-none shrink-0"
            style={STYLE_TEXT_SECONDARY}
          />
          <input
            type="search"
            aria-label="Search archive entries"
            placeholder="Filter archive paths..."
            value={searchQuery}
            disabled={disabled}
            data-testid="archive-inspector-search"
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            className="prism-well prism-focus-ring w-full h-9 pl-8 pr-8 rounded-full text-xs min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
            style={STYLE_TEXT_PRIMARY}
          />
          {searchQuery.length > 0 && !disabled ? (
            <button
              type="button"
              aria-label="Clear search"
              data-testid="archive-inspector-clear-search"
              onClick={handleClearSearch}
              className="prism-focus-ring absolute right-2 w-5 h-5 rounded-full inline-flex items-center justify-center cursor-pointer"
              style={STYLE_TEXT_SECONDARY}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Virtual Directory Table wrapped DIRECTLY inside overflow-x-auto */}
      <div className="overflow-x-auto">
        <table
          aria-label={`${safeArchiveName} virtual directory`}
          data-testid="archive-inspector-table"
          className={cx(tableClass, 'w-full border-collapse text-xs')}
        >
          <thead>
            <tr className="border-b" style={STYLE_BORDER_DIVIDER}>
              <th scope="col" className="w-11 px-3 py-2.5 text-left">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label="Select All Safe"
                  data-testid="archive-select-all-safe"
                  checked={allVisibleSafeSelected}
                  disabled={!canToggleSelectAll}
                  onChange={canToggleSelectAll ? handleToggleSelectAllSafe : undefined}
                  className="prism-focus-ring w-4 h-4 rounded cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  style={{ accentColor: 'var(--prism-success-main)' }}
                />
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-[11px] min-w-[220px]"
                style={STYLE_TEXT_SECONDARY}
              >
                Entry Path
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap"
                style={STYLE_TEXT_SECONDARY}
              >
                Uncompressed
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap"
                style={STYLE_TEXT_SECONDARY}
              >
                Compressed
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap"
                style={STYLE_TEXT_SECONDARY}
              >
                Ratio
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap"
                style={STYLE_TEXT_SECONDARY}
              >
                Preview
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6">
                  <div
                    role="status"
                    data-testid="archive-inspector-empty"
                    className="prism-well rounded-2xl px-4 py-7 flex flex-col items-center justify-center text-center gap-2"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <Inbox aria-hidden="true" className="w-5 h-5 opacity-75 shrink-0" />
                    <p
                      className="m-0 text-xs font-semibold"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {resolvedEntries.length === 0
                        ? 'Archive is empty'
                        : 'No matching archive entries'}
                    </p>
                    <p className="m-0 text-[11px] max-w-md break-words">
                      {resolvedEntries.length === 0
                        ? `No virtual files or folders were found inside ${safeArchiveName}.`
                        : `No paths match "${searchQuery.trim()}". Clear the search filter or press Escape.`}
                    </p>
                    {resolvedEntries.length > 0 && !disabled ? (
                      <button
                        type="button"
                        data-testid="archive-empty-clear-search"
                        onClick={handleClearSearch}
                        className="prism-crystal prism-focus-ring mt-1 rounded-full px-3 py-1 text-[11px] font-semibold cursor-pointer"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        Clear Search
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              filteredEntries.map(({ renderKey, entry, isSafe, savingsPercent }) => {
                const isSelected = isSafe && selectedIds.has(entry.id);
                const isPreviewed = previewedItem?.entry.id === entry.id;
                const rowCheckboxDisabled = disabled || !isSafe;
                const isZeroFolder =
                  entry.kind === 'folder' && sanitizeByteCount(entry.uncompressedBytes) === 0;

                return (
                  <tr
                    key={renderKey}
                    data-testid={`archive-row-${entry.id}`}
                    data-safe={isSafe ? 'true' : 'false'}
                    data-selected={isSelected ? 'true' : undefined}
                    className="border-t transition-colors"
                    style={{
                      borderColor: 'var(--prism-divider)',
                      backgroundColor: !isSafe
                        ? 'color-mix(in srgb, var(--prism-error-main) 6%, transparent)'
                        : isSelected
                          ? 'color-mix(in srgb, var(--prism-success-main) 9%, transparent)'
                          : undefined,
                    }}
                  >
                    <td className="px-3 py-2.5 align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={rowCheckboxDisabled}
                        aria-label={
                          isSafe
                            ? `Select ${entry.path}`
                            : `Unsafe path ${entry.path} cannot be selected`
                        }
                        data-testid={`archive-checkbox-${entry.id}`}
                        onChange={rowCheckboxDisabled ? undefined : () => handleToggleRow(entry)}
                        className="prism-focus-ring w-4 h-4 rounded cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                        style={{ accentColor: 'var(--prism-success-main)' }}
                      />
                    </td>

                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        {entry.kind === 'folder' ? (
                          <Folder
                            aria-hidden="true"
                            className="w-4 h-4 shrink-0"
                            style={STYLE_WARNING_MAIN}
                          />
                        ) : (
                          <FileText
                            aria-hidden="true"
                            className="w-4 h-4 shrink-0"
                            style={{
                              color: isSafe
                                ? 'var(--prism-secondary-dark)'
                                : 'var(--prism-error-main)',
                            }}
                          />
                        )}

                        <span
                          data-testid={`archive-path-${entry.id}`}
                          className="font-mono text-xs font-medium break-all min-w-0"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          {entry.path}
                        </span>

                        {!isSafe ? (
                          <span
                            data-testid={`archive-unsafe-badge-${entry.id}`}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0 border"
                            style={{
                              color: 'var(--prism-error-main)',
                              borderColor:
                                'color-mix(in srgb, var(--prism-error-main) 45%, transparent)',
                              backgroundColor:
                                'color-mix(in srgb, var(--prism-error-main) 12%, transparent)',
                            }}
                          >
                            <ShieldAlert aria-hidden="true" className="w-3 h-3 shrink-0" />
                            <span>Unsafe Path</span>
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td
                      data-testid={`archive-uncompressed-${entry.id}`}
                      className="px-3 py-2.5 text-right align-middle font-mono tabular-nums whitespace-nowrap"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {formatArchiveBytes(entry.uncompressedBytes, entry.kind)}
                    </td>

                    <td
                      data-testid={`archive-compressed-${entry.id}`}
                      className="px-3 py-2.5 text-right align-middle font-mono tabular-nums whitespace-nowrap"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {formatArchiveBytes(entry.compressedBytes, entry.kind)}
                    </td>

                    <td
                      data-testid={`archive-ratio-${entry.id}`}
                      className="px-3 py-2.5 text-right align-middle font-mono tabular-nums whitespace-nowrap"
                      style={STYLE_SUCCESS_DARK}
                    >
                      {isZeroFolder ? '—' : `${savingsPercent}% saved`}
                    </td>

                    <td className="px-3 py-2.5 text-right align-middle whitespace-nowrap">
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={isPreviewed}
                        aria-label={`Preview ${entry.path}`}
                        data-testid={`archive-preview-btn-${entry.id}`}
                        onClick={disabled ? undefined : () => handlePreviewEntry(entry)}
                        className={cx(
                          isPreviewed ? 'prism-btn-cobalt' : 'prism-crystal',
                          'prism-focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed'
                        )}
                        style={isPreviewed ? undefined : STYLE_TEXT_PRIMARY}
                      >
                        <Eye aria-hidden="true" className="w-3 h-3 shrink-0" />
                        <span>Preview</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Recessed Virtual Entry Preview Pane */}
      <section
        aria-label="Virtual Entry Preview"
        data-testid="archive-preview-pane"
        className={cx(
          previewClass,
          'prism-well rounded-2xl p-3.5 flex flex-col gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Eye
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_INFO_MAIN}
            />
            <span
              className="text-xs font-semibold tracking-tight"
              style={STYLE_TEXT_PRIMARY}
            >
              Virtual Entry Preview
            </span>
            {previewedItem ? (
              <code
                data-testid="archive-preview-path"
                className="font-mono text-[11px] px-2 py-0.5 rounded-full prism-crystal break-all min-w-0"
                style={STYLE_TEXT_PRIMARY}
              >
                {previewedItem.entry.path}
              </code>
            ) : null}
            {previewedItem && !previewedItem.isSafe ? (
              <span
                data-testid="archive-preview-unsafe-warning"
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                style={{
                  color: 'var(--prism-error-main)',
                  borderColor: 'color-mix(in srgb, var(--prism-error-main) 45%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--prism-error-main) 12%, transparent)',
                }}
              >
                <ShieldAlert aria-hidden="true" className="w-3 h-3 shrink-0" />
                <span>Unsafe Path — Extraction Blocked</span>
              </span>
            ) : null}
          </div>

          {previewedItem ? (
            <button
              type="button"
              disabled={disabled}
              aria-label="Close preview"
              data-testid="archive-preview-close"
              onClick={disabled ? undefined : handleClosePreview}
              className="prism-crystal prism-focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              <X aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Close</span>
            </button>
          ) : null}
        </div>

        {previewedItem ? (
          <>
            <div
              data-testid="archive-preview-stats"
              className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums"
              style={STYLE_TEXT_SECONDARY}
            >
              <span>
                Uncompressed:{' '}
                {formatArchiveBytes(
                  previewedItem.entry.uncompressedBytes,
                  previewedItem.entry.kind
                )}
              </span>
              <span>
                Compressed:{' '}
                {formatArchiveBytes(previewedItem.entry.compressedBytes, previewedItem.entry.kind)}
              </span>
              <span>
                Ratio:{' '}
                {previewedItem.entry.kind === 'folder' &&
                sanitizeByteCount(previewedItem.entry.uncompressedBytes) === 0
                  ? '—'
                  : `${previewedItem.savingsPercent}% saved`}
              </span>
              <span>Modified: {previewedItem.entry.modifiedAt}</span>
            </div>

            <pre
              data-testid="archive-preview-content"
              className="m-0 rounded-xl px-3 py-2.5 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words overflow-x-auto border"
              style={{
                color: 'var(--prism-text-primary)',
                borderColor: 'var(--prism-divider)',
                backgroundColor: 'var(--prism-well-end)',
              }}
            >
              {previewedItem.entry.previewText && previewedItem.entry.previewText.length > 0
                ? previewedItem.entry.previewText
                : 'No virtual text preview available for this entry.'}
            </pre>
          </>
        ) : (
          <p
            data-testid="archive-preview-placeholder"
            className="m-0 text-xs"
            style={STYLE_TEXT_SECONDARY}
          >
            Select Preview on any row to inspect its virtual path, compression telemetry, and
            literal text contents.
          </p>
        )}
      </section>

      {/* Footer: Selection Count, Extract Selected (N), Extract All Safe & Polite Announcement */}
      <div
        data-testid="archive-inspector-footer"
        className={cx(
          footerClass,
          'flex flex-col gap-2.5 pt-3 border-t min-w-0 max-w-full'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              data-testid="archive-inspector-selected-count"
              className="prism-well rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums"
              style={STYLE_TEXT_PRIMARY}
            >
              {selectedCount} selected
            </span>
            <span
              className="font-mono text-[11px] tabular-nums"
              style={STYLE_TEXT_SECONDARY}
            >
              {safeEntries.length} safe available
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!canExtractSelected}
              data-testid="archive-extract-selected"
              onClick={canExtractSelected ? handleExtractSelected : undefined}
              className="prism-btn-primary prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <ArrowDownToLine
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0 relative z-10"
              />
              <span className="relative z-10">Extract Selected ({selectedCount})</span>
            </button>

            <button
              type="button"
              disabled={!canExtractAllSafe}
              data-testid="archive-extract-all-safe"
              onClick={canExtractAllSafe ? handleExtractAllSafe : undefined}
              className="prism-btn-secondary prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <ArrowDownToLine
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0 relative z-10"
              />
              <span className="relative z-10">Extract All Safe</span>
            </button>
          </div>
        </div>

        <div
          aria-live="polite"
          aria-atomic="true"
          data-testid="archive-inspector-announcement"
          className={cx(
            announcementClass,
            'prism-well rounded-xl px-3 py-2 text-xs flex flex-wrap items-center gap-2 min-w-0 max-w-full'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: disabled
                ? 'var(--prism-text-disabled)'
                : unsafeCount > 0
                  ? 'var(--prism-warning-main)'
                  : 'var(--prism-success-main)',
            }}
          />
          <span className="min-w-0 break-words">{announcement}</span>
        </div>
      </div>
    </div>
  );
}

export const ArchiveInspector = /*#__PURE__*/ memoWithDisplayName(ArchiveInspectorInner, 'ArchiveInspector');
