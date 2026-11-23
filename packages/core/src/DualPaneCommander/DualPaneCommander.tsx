'use client';

import {
  memo,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  Columns2,
  Copy,
  FileText,
  Folder,
  FolderOpen,
  GitCompareArrows,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_SECONDARY_DARK, STYLE_SUCCESS_DARK, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type CommanderPaneSide = 'left' | 'right';
export type CommanderActionKind = 'copy' | 'move' | 'compare' | 'sync' | 'swap';

export interface CommanderFileEntry {
  /** Unique identifier for the file or directory entry within its pane. */
  id: string;
  /** Visible file or directory name rendered safely as literal text. */
  name: string;
  /** Semantic entry kind controlling icon rendering and zero-byte folder size labels. */
  kind: 'folder' | 'file';
  /** Entry size in bytes formatted cleanly into B, KB, MB, or GB (or Folder for zero-byte folders). */
  sizeBytes: number;
  /** Modification epoch timestamp in milliseconds used for Compare diff badges and Sync Newer. */
  modifiedTimestamp: number;
  /** Human-readable modification time displayed alongside the file size. */
  modifiedLabel: string;
}

type DualPaneCommanderBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface DualPaneCommanderProps extends DualPaneCommanderBaseProps {
  /** Visible commander heading linked to the root region via `aria-labelledby`. Defaults to `'Dual-Pane Commander'`. */
  title?: string;
  /** Initial directory path displayed in the left pane badge. Defaults to `'/Volumes/StudioNVMe/Masters'`. */
  leftPath?: string;
  /** Initial directory path displayed in the right pane badge. Defaults to `'/Volumes/NAS-Backup/Masters'`. */
  rightPath?: string;
  /** Initial left-pane file and folder entries; defaults to realistic studio master entries with diffs against the right pane. */
  defaultLeftItems?: ReadonlyArray<CommanderFileEntry>;
  /** Initial right-pane file and folder entries; defaults to realistic NAS backup entries with diffs against the left pane. */
  defaultRightItems?: ReadonlyArray<CommanderFileEntry>;
  /** Callback fired after Copy, Move, Compare, Sync Newer, or Swap Panes completes. */
  onAction?: (
    action: CommanderActionKind,
    sourceSide: CommanderPaneSide,
    affectedNames: ReadonlyArray<string>
  ) => void;
  /** Disables all pane selection and cross-folder commander actions. */
  disabled?: boolean;
}

type CompareStatus = 'only-here' | 'newer' | 'match' | 'older';

interface CompareBadgeDescriptor {
  label: string;
  colorToken: string;
  borderToken: string;
}

interface RenderableCommanderRow {
  renderKey: string;
  entry: CommanderFileEntry;
}

const DEFAULT_TITLE = 'Dual-Pane Commander';
const DEFAULT_LEFT_PATH = '/Volumes/StudioNVMe/Masters';
const DEFAULT_RIGHT_PATH = '/Volumes/NAS-Backup/Masters';

const DEFAULT_LEFT_ITEMS: ReadonlyArray<CommanderFileEntry> = [
  {
    id: 'left-luts',
    name: 'LUTs',
    kind: 'folder',
    sizeBytes: 0,
    modifiedTimestamp: 1732200000000,
    modifiedLabel: 'Today, 09:15',
  },
  {
    id: 'left-grade',
    name: 'Final_Color_Grade.mov',
    kind: 'file',
    sizeBytes: 48_234_496,
    modifiedTimestamp: 1732286400000,
    modifiedLabel: 'Today, 14:40',
  },
  {
    id: 'left-score',
    name: 'Optical_Score_24bit.wav',
    kind: 'file',
    sizeBytes: 12_582_912,
    modifiedTimestamp: 1732204800000,
    modifiedLabel: 'Yesterday, 18:10',
  },
  {
    id: 'left-notes',
    name: 'Studio_Cut_Notes.md',
    kind: 'file',
    sizeBytes: 18_432,
    modifiedTimestamp: 1732290000000,
    modifiedLabel: 'Today, 15:20',
  },
  {
    id: 'left-poster',
    name: 'Poster_Hero_4K.png',
    kind: 'file',
    sizeBytes: 3_670_016,
    modifiedTimestamp: 1732120000000,
    modifiedLabel: 'Nov 20, 11:05',
  },
];

const DEFAULT_RIGHT_ITEMS: ReadonlyArray<CommanderFileEntry> = [
  {
    id: 'right-luts',
    name: 'LUTs',
    kind: 'folder',
    sizeBytes: 0,
    modifiedTimestamp: 1732200000000,
    modifiedLabel: 'Today, 09:15',
  },
  {
    id: 'right-grade',
    name: 'Final_Color_Grade.mov',
    kind: 'file',
    sizeBytes: 46_137_344,
    modifiedTimestamp: 1732192800000,
    modifiedLabel: 'Yesterday, 14:40',
  },
  {
    id: 'right-score',
    name: 'Optical_Score_24bit.wav',
    kind: 'file',
    sizeBytes: 12_582_912,
    modifiedTimestamp: 1732204800000,
    modifiedLabel: 'Yesterday, 18:10',
  },
  {
    id: 'right-poster',
    name: 'Poster_Hero_4K.png',
    kind: 'file',
    sizeBytes: 4_194_304,
    modifiedTimestamp: 1732288200000,
    modifiedLabel: 'Today, 15:10',
  },
  {
    id: 'right-manifest',
    name: 'Archive_Manifest.json',
    kind: 'file',
    sizeBytes: 6_144,
    modifiedTimestamp: 1732100000000,
    modifiedLabel: 'Nov 19, 16:30',
  },
];

const COMPARE_BADGE_META: Readonly<Record<CompareStatus, CompareBadgeDescriptor>> = {
  'only-here': {
    label: 'Only Here',
    colorToken: 'var(--prism-info-main)',
    borderToken: 'var(--prism-info-main)',
  },
  newer: {
    label: 'Newer',
    colorToken: 'var(--prism-warning-main)',
    borderToken: 'var(--prism-warning-main)',
  },
  match: {
    label: 'Match',
    colorToken: 'var(--prism-success-main)',
    borderToken: 'var(--prism-success-main)',
  },
  older: {
    label: 'Older',
    colorToken: 'var(--prism-text-secondary)',
    borderToken: 'var(--prism-divider)',
  },
};

function formatFileSize(sizeBytes: number, kind: 'folder' | 'file'): string {
  if (kind === 'folder' && sizeBytes <= 0) {
    return 'Folder';
  }
  const safeBytes = Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : 0;
  if (safeBytes < 1024) {
    return `${Math.round(safeBytes)} B`;
  }
  if (safeBytes < 1024 * 1024) {
    return `${(safeBytes / 1024).toFixed(1)} KB`;
  }
  if (safeBytes < 1024 * 1024 * 1024) {
    return `${(safeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(safeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function buildFilenameMap(
  items: ReadonlyArray<CommanderFileEntry>
): Map<string, CommanderFileEntry> {
  const map = new Map<string, CommanderFileEntry>();
  for (const entry of items) {
    map.set(entry.name, entry);
  }
  return map;
}

function getCompareStatus(
  entry: CommanderFileEntry,
  oppositeByName: ReadonlyMap<string, CommanderFileEntry>
): CompareStatus {
  const counterpart = oppositeByName.get(entry.name);
  if (!counterpart) {
    return 'only-here';
  }
  if (entry.modifiedTimestamp > counterpart.modifiedTimestamp) {
    return 'newer';
  }
  if (entry.modifiedTimestamp < counterpart.modifiedTimestamp) {
    return 'older';
  }
  return 'match';
}

function buildRenderableRows(
  side: CommanderPaneSide,
  items: ReadonlyArray<CommanderFileEntry>
): ReadonlyArray<RenderableCommanderRow> {
  const seen = new Map<string, number>();
  return items.map((entry) => {
    const count = seen.get(entry.id) ?? 0;
    seen.set(entry.id, count + 1);
    return {
      renderKey: count === 0 ? `${side}::${entry.id}` : `${side}::${entry.id}~${count + 1}`,
      entry,
    };
  });
}

function allocateCollisionSafeId(
  baseId: string,
  usedIds: Set<string>,
  seqCounter: { current: number }
): string {
  let candidate = `${baseId}-copy-${seqCounter.current}`;
  seqCounter.current += 1;
  while (usedIds.has(candidate)) {
    candidate = `${baseId}-copy-${seqCounter.current}`;
    seqCounter.current += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function mergeEntriesIntoTarget(
  targetItems: ReadonlyArray<CommanderFileEntry>,
  incomingEntries: ReadonlyArray<CommanderFileEntry>,
  usedIds: Set<string>,
  seqCounter: { current: number }
): CommanderFileEntry[] {
  const nextTarget = [...targetItems];
  const targetIndexByName = new Map<string, number>();
  nextTarget.forEach((item, index) => {
    targetIndexByName.set(item.name, index);
  });

  for (const entry of incomingEntries) {
    const existingIndex = targetIndexByName.get(entry.name);
    if (existingIndex !== undefined) {
      const existing = nextTarget[existingIndex]!;
      nextTarget[existingIndex] = {
        ...entry,
        id: existing.id,
      };
    } else {
      const safeId = allocateCollisionSafeId(entry.id, usedIds, seqCounter);
      targetIndexByName.set(entry.name, nextTarget.length);
      nextTarget.push({
        ...entry,
        id: safeId,
      });
    }
  }

  return nextTarget;
}

function collectDiffNames(
  leftItems: ReadonlyArray<CommanderFileEntry>,
  rightItems: ReadonlyArray<CommanderFileEntry>,
  leftByName: ReadonlyMap<string, CommanderFileEntry>,
  rightByName: ReadonlyMap<string, CommanderFileEntry>
): string[] {
  const diffSet = new Set<string>();
  for (const entry of leftItems) {
    if (getCompareStatus(entry, rightByName) !== 'match') {
      diffSet.add(entry.name);
    }
  }
  for (const entry of rightItems) {
    if (getCompareStatus(entry, leftByName) !== 'match') {
      diffSet.add(entry.name);
    }
  }
  return Array.from(diffSet);
}

function formatPaneLabel(side: CommanderPaneSide): string {
  return side === 'left' ? 'Left Pane' : 'Right Pane';
}

function formatCountNoun(count: number): string {
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

function DualPaneCommanderInner({
  title = DEFAULT_TITLE,
  leftPath = DEFAULT_LEFT_PATH,
  rightPath = DEFAULT_RIGHT_PATH,
  defaultLeftItems,
  defaultRightItems,
  onAction,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: DualPaneCommanderProps) {
  const override = useComponentOverride('DualPaneCommander');
  const baseId = useId();
  const headingId = `${baseId}-heading`;

  const safeTitle = title.trim() || DEFAULT_TITLE;
  const [currentLeftPath, setCurrentLeftPath] = useState<string>(
    () => leftPath.trim() || DEFAULT_LEFT_PATH
  );
  const [currentRightPath, setCurrentRightPath] = useState<string>(
    () => rightPath.trim() || DEFAULT_RIGHT_PATH
  );
  const [leftItems, setLeftItems] = useState<CommanderFileEntry[]>(() =>
    defaultLeftItems !== undefined ? [...defaultLeftItems] : [...DEFAULT_LEFT_ITEMS]
  );
  const [rightItems, setRightItems] = useState<CommanderFileEntry[]>(() =>
    defaultRightItems !== undefined ? [...defaultRightItems] : [...DEFAULT_RIGHT_ITEMS]
  );
  const [activePane, setActivePane] = useState<CommanderPaneSide>('left');
  const [leftSelectedIds, setLeftSelectedIds] = useState<Set<string>>(() => new Set());
  const [rightSelectedIds, setRightSelectedIds] = useState<Set<string>>(() => new Set());
  const [compareActive, setCompareActive] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Ready — Left Pane active. Select items to copy or move, or enable Compare.'
  );

  const copySeqRef = useRef<number>(1);

  const leftByName = useMemo(() => buildFilenameMap(leftItems), [leftItems]);
  const rightByName = useMemo(() => buildFilenameMap(rightItems), [rightItems]);

  const leftRows = useMemo(() => buildRenderableRows('left', leftItems), [leftItems]);
  const rightRows = useMemo(() => buildRenderableRows('right', rightItems), [rightItems]);

  const activeItems = activePane === 'left' ? leftItems : rightItems;
  const activeSelectedSet = activePane === 'left' ? leftSelectedIds : rightSelectedIds;
  const activeSelectedEntries = useMemo(
    () => activeItems.filter((entry) => activeSelectedSet.has(entry.id)),
    [activeItems, activeSelectedSet]
  );
  const activeSelectedCount = activeSelectedEntries.length;

  const canTransfer = !disabled && activeSelectedCount > 0;

  const toggleEntrySelection = (side: CommanderPaneSide, entryId: string) => {
    setActivePane(side);
    const setter = side === 'left' ? setLeftSelectedIds : setRightSelectedIds;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const handleRowKeyDown =
    (side: CommanderPaneSide, entryId: string) =>
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        toggleEntrySelection(side, entryId);
      }
    };

  const handleSelectAll = (side: CommanderPaneSide) => {
    setActivePane(side);
    const items = side === 'left' ? leftItems : rightItems;
    const setter = side === 'left' ? setLeftSelectedIds : setRightSelectedIds;
    setter(new Set(items.map((item) => item.id)));
    setStatusMessage(`Selected all ${formatCountNoun(items.length)} in ${formatPaneLabel(side)}.`);
  };

  const handleClearSelection = (side: CommanderPaneSide) => {
    setActivePane(side);
    const setter = side === 'left' ? setLeftSelectedIds : setRightSelectedIds;
    setter(new Set());
    setStatusMessage(`Cleared selection in ${formatPaneLabel(side)}.`);
  };

  const handleCopy = () => {
    const sourceSide: CommanderPaneSide = activePane;
    const targetSide: CommanderPaneSide = sourceSide === 'left' ? 'right' : 'left';
    const targetItems = targetSide === 'left' ? leftItems : rightItems;
    const usedIds = new Set<string>([
      ...leftItems.map((item) => item.id),
      ...rightItems.map((item) => item.id),
    ]);

    const nextTarget = mergeEntriesIntoTarget(
      targetItems,
      activeSelectedEntries,
      usedIds,
      copySeqRef
    );
    const affectedNames = activeSelectedEntries.map((entry) => entry.name);

    if (targetSide === 'right') {
      setRightItems(nextTarget);
      setLeftSelectedIds(new Set());
    } else {
      setLeftItems(nextTarget);
      setRightSelectedIds(new Set());
    }

    setStatusMessage(
      `Copied ${formatCountNoun(affectedNames.length)} from ${formatPaneLabel(sourceSide)} to ${formatPaneLabel(targetSide)}: ${affectedNames.join(', ')}.`
    );
    onAction?.('copy', sourceSide, affectedNames);
  };

  const handleMove = () => {
    const sourceSide: CommanderPaneSide = activePane;
    const targetSide: CommanderPaneSide = sourceSide === 'left' ? 'right' : 'left';
    const sourceItems = sourceSide === 'left' ? leftItems : rightItems;
    const targetItems = targetSide === 'left' ? leftItems : rightItems;
    const movingIds = new Set<string>(activeSelectedEntries.map((entry) => entry.id));
    const usedIds = new Set<string>([
      ...leftItems.map((item) => item.id),
      ...rightItems.map((item) => item.id),
    ]);

    const nextTarget = mergeEntriesIntoTarget(
      targetItems,
      activeSelectedEntries,
      usedIds,
      copySeqRef
    );
    const nextSource = sourceItems.filter((item) => !movingIds.has(item.id));
    const affectedNames = activeSelectedEntries.map((entry) => entry.name);

    if (sourceSide === 'left') {
      setLeftItems(nextSource);
      setRightItems(nextTarget);
      setLeftSelectedIds(new Set());
    } else {
      setRightItems(nextSource);
      setLeftItems(nextTarget);
      setRightSelectedIds(new Set());
    }

    setStatusMessage(
      `Moved ${formatCountNoun(affectedNames.length)} from ${formatPaneLabel(sourceSide)} to ${formatPaneLabel(targetSide)}: ${affectedNames.join(', ')}.`
    );
    onAction?.('move', sourceSide, affectedNames);
  };

  const handleToggleCompare = () => {
    const nextCompare = !compareActive;
    const diffNames = collectDiffNames(leftItems, rightItems, leftByName, rightByName);
    setCompareActive(nextCompare);
    if (nextCompare) {
      setStatusMessage(
        diffNames.length === 0
          ? 'Compare mode enabled — both panes match identically.'
          : `Compare mode enabled — ${diffNames.length} ${diffNames.length === 1 ? 'difference' : 'differences'} highlighted across panes.`
      );
    } else {
      setStatusMessage('Compare mode disabled.');
    }
    onAction?.('compare', activePane, diffNames);
  };

  const handleSyncNewer = () => {
    const sourceSide: CommanderPaneSide = activePane;
    const targetSide: CommanderPaneSide = sourceSide === 'left' ? 'right' : 'left';
    const sourceItems = sourceSide === 'left' ? leftItems : rightItems;
    const targetItems = targetSide === 'left' ? leftItems : rightItems;
    const targetByName = targetSide === 'left' ? leftByName : rightByName;

    const entriesToSync = sourceItems.filter((entry) => {
      const status = getCompareStatus(entry, targetByName);
      return status === 'only-here' || status === 'newer';
    });
    const affectedNames = entriesToSync.map((entry) => entry.name);

    if (entriesToSync.length === 0) {
      setStatusMessage(
        `${formatPaneLabel(targetSide)} is already up to date with ${formatPaneLabel(sourceSide)}.`
      );
      onAction?.('sync', sourceSide, []);
      return;
    }

    const usedIds = new Set<string>([
      ...leftItems.map((item) => item.id),
      ...rightItems.map((item) => item.id),
    ]);
    const nextTarget = mergeEntriesIntoTarget(targetItems, entriesToSync, usedIds, copySeqRef);

    if (targetSide === 'right') {
      setRightItems(nextTarget);
    } else {
      setLeftItems(nextTarget);
    }

    setStatusMessage(
      `Synced ${formatCountNoun(affectedNames.length)} from ${formatPaneLabel(sourceSide)} to ${formatPaneLabel(targetSide)}: ${affectedNames.join(', ')}.`
    );
    onAction?.('sync', sourceSide, affectedNames);
  };

  const handleSwapPanes = () => {
    const nextLeftPath = currentRightPath;
    const nextRightPath = currentLeftPath;
    const nextLeftItems = rightItems;
    const nextRightItems = leftItems;
    const nextLeftSelected = rightSelectedIds;
    const nextRightSelected = leftSelectedIds;

    setCurrentLeftPath(nextLeftPath);
    setCurrentRightPath(nextRightPath);
    setLeftItems(nextLeftItems);
    setRightItems(nextRightItems);
    setLeftSelectedIds(nextLeftSelected);
    setRightSelectedIds(nextRightSelected);

    const swappedPaths = [nextLeftPath, nextRightPath];
    setStatusMessage(
      `Swapped panes — Left Pane: ${nextLeftPath}, Right Pane: ${nextRightPath}.`
    );
    onAction?.('swap', activePane, swappedPaths);
  };

  const merged = mergeProps({
    themeTarget: themeProps('dual-pane-commander', {
      activePane,
      compareActive,
      disabled,
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

  const headerClass = stableClassName('dual-pane-commander', 'header');
  const paneClass = stableClassName('dual-pane-commander', 'pane');
  const actionsClass = stableClassName('dual-pane-commander', 'actions');
  const statusClass = stableClassName('dual-pane-commander', 'status');

  const renderPane = (params: {
    side: CommanderPaneSide;
    pathValue: string;
    rows: ReadonlyArray<RenderableCommanderRow>;
    selectedSet: ReadonlySet<string>;
    oppositeByName: ReadonlyMap<string, CommanderFileEntry>;
  }) => {
    const isActive = activePane === params.side;
    const paneLabel = formatPaneLabel(params.side);
    const totalCount = params.rows.length;
    const selectedCount = params.rows.filter((row) => params.selectedSet.has(row.entry.id)).length;
    const canSelectAll = !disabled && totalCount > 0;
    const canClear = !disabled && selectedCount > 0;

    return (
      <section
        aria-label={paneLabel}
        data-testid={`dual-pane-${params.side}`}
        data-active={isActive ? 'true' : undefined}
        onClick={disabled ? undefined : () => setActivePane(params.side)}
        className={cx(
          paneClass,
          'prism-well rounded-2xl p-3 flex flex-col gap-2.5 min-w-0 max-w-full transition-shadow'
        )}
        style={
          isActive
            ? {
                boxShadow:
                  '0 0 0 2px var(--prism-primary-main), inset 0 1px 0 var(--prism-divider)',
              }
            : {
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--prism-divider)',
              }
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <button
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            data-testid={`dual-pane-activate-${params.side}`}
            onClick={
              disabled
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    setActivePane(params.side);
                  }
            }
            className="prism-focus-ring inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer disabled:cursor-not-allowed transition-opacity"
            style={{
              color: isActive ? 'var(--prism-primary-main)' : 'var(--prism-text-primary)',
            }}
          >
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: isActive
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-disabled)',
              }}
            />
            <span>{paneLabel}</span>
          </button>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={!canSelectAll}
              data-testid={`dual-pane-select-all-${params.side}`}
              onClick={
                canSelectAll
                  ? (event) => {
                      event.stopPropagation();
                      handleSelectAll(params.side);
                    }
                  : undefined
              }
              className="prism-crystal prism-focus-ring rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            >
              Select All
            </button>
            <button
              type="button"
              disabled={!canClear}
              data-testid={`dual-pane-clear-${params.side}`}
              onClick={
                canClear
                  ? (event) => {
                      event.stopPropagation();
                      handleClearSelection(params.side);
                    }
                  : undefined
              }
              className="prism-crystal prism-focus-ring rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              style={STYLE_TEXT_SECONDARY}
            >
              Clear
            </button>
          </div>
        </div>

        <div
          data-testid={`dual-pane-path-${params.side}`}
          className="prism-crystal rounded-xl px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full"
        >
          <span className="inline-flex items-center gap-1.5 min-w-0 flex-1">
            <FolderOpen
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_WARNING_MAIN}
            />
            <span
              className="font-mono text-[11px] truncate min-w-0"
              style={STYLE_TEXT_PRIMARY}
            >
              {params.pathValue}
            </span>
          </span>
          <span
            data-testid={`dual-pane-count-${params.side}`}
            className="font-mono text-[11px] tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {selectedCount > 0 ? `${selectedCount}/${totalCount} selected` : formatCountNoun(totalCount)}
          </span>
        </div>

        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={`${paneLabel} files`}
          data-testid={`dual-pane-list-${params.side}`}
          className="flex-1 min-h-[196px] max-h-72 overflow-y-auto flex flex-col gap-1 pr-0.5 min-w-0"
        >
          {totalCount === 0 ? (
            <div
              role="status"
              data-testid={`dual-pane-empty-${params.side}`}
              className="prism-crystal rounded-xl px-3 py-8 flex-1 flex flex-col items-center justify-center text-center gap-1.5 min-w-0"
              style={STYLE_TEXT_SECONDARY}
            >
              <Inbox aria-hidden="true" className="w-5 h-5 opacity-70" />
              <p
                className="m-0 text-xs font-semibold"
                style={STYLE_TEXT_PRIMARY}
              >
                Empty directory
              </p>
              <p className="m-0 text-[11px]">
                Copy, move, or sync items from the opposite pane.
              </p>
            </div>
          ) : (
            params.rows.map(({ renderKey, entry }) => {
              const isSelected = params.selectedSet.has(entry.id);
              const compareStatus = compareActive
                ? getCompareStatus(entry, params.oppositeByName)
                : null;
              const badgeMeta = compareStatus ? COMPARE_BADGE_META[compareStatus] : null;
              const sizeLabel = formatFileSize(entry.sizeBytes, entry.kind);

              return (
                <button
                  key={renderKey}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={disabled}
                  data-testid={`dual-pane-row-${params.side}-${entry.id}`}
                  data-entry-name={entry.name}
                  data-compare-status={compareStatus ?? undefined}
                  onClick={
                    disabled
                      ? undefined
                      : (event) => {
                          event.stopPropagation();
                          toggleEntrySelection(params.side, entry.id);
                        }
                  }
                  onKeyDown={disabled ? undefined : handleRowKeyDown(params.side, entry.id)}
                  className={cx(
                    'prism-focus-ring w-full min-w-0 rounded-xl px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 text-left transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed',
                    isSelected ? 'prism-crystal' : 'enabled:hover:bg-[var(--prism-divider)]'
                  )}
                  style={{
                    color: 'var(--prism-text-primary)',
                    ...(isSelected
                      ? {
                          boxShadow: 'inset 0 0 0 1px var(--prism-primary-main)',
                        }
                      : {}),
                  }}
                >
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      aria-hidden="true"
                      className={cx(
                        'w-4 h-4 rounded-md inline-flex items-center justify-center shrink-0',
                        isSelected ? 'prism-emerald' : 'prism-well'
                      )}
                    >
                      <Check
                        className={cx(
                          'w-3 h-3 stroke-[2.8]',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </span>

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
                        style={STYLE_SECONDARY_DARK}
                      />
                    )}

                    <span className="text-xs font-medium truncate min-w-0">{entry.name}</span>
                  </span>

                  <span className="flex flex-wrap items-center gap-2 shrink-0">
                    {badgeMeta ? (
                      <span
                        data-testid={`dual-pane-badge-${params.side}-${entry.id}`}
                        className="prism-well rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-tight shrink-0"
                        style={{
                          color: badgeMeta.colorToken,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: badgeMeta.borderToken,
                        }}
                      >
                        {badgeMeta.label}
                      </span>
                    ) : null}

                    <span
                      className="font-mono text-[11px] tabular-nums shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {sizeLabel}
                    </span>
                    <span
                      className="font-mono text-[10px] tabular-nums shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {entry.modifiedLabel}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>
    );
  };

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
      {/* Header Bar */}
      <div
        data-testid="dual-pane-header"
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Columns2 aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <h3
            id={headingId}
            className="m-0 text-sm font-semibold tracking-tight truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {safeTitle}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span
            data-testid="dual-pane-active-indicator"
            className="prism-well rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            Active: {formatPaneLabel(activePane)}
          </span>
          {compareActive ? (
            <span
              data-testid="dual-pane-compare-indicator"
              className="prism-well rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0"
              style={STYLE_INFO_MAIN}
            >
              Compare Active
            </span>
          ) : null}
        </div>
      </div>

      {/* Dual-Pane Grid + Central Cross-Folder Action Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-3 items-stretch min-w-0">
        {renderPane({
          side: 'left',
          pathValue: currentLeftPath,
          rows: leftRows,
          selectedSet: leftSelectedIds,
          oppositeByName: rightByName,
        })}

        <div
          role="toolbar"
          aria-label="Cross-folder actions"
          data-testid="dual-pane-actions"
          className={cx(
            actionsClass,
            'flex flex-row flex-wrap lg:flex-col items-stretch justify-center gap-2 py-1 min-w-0'
          )}
        >
          <button
            type="button"
            disabled={!canTransfer}
            data-action="copy"
            data-testid="dual-pane-action-copy"
            onClick={canTransfer ? handleCopy : undefined}
            className="prism-btn-primary prism-focus-ring rounded-full px-3.5 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Copy aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>{activePane === 'left' ? 'Copy ->' : '<- Copy'}</span>
          </button>

          <button
            type="button"
            disabled={!canTransfer}
            data-action="move"
            data-testid="dual-pane-action-move"
            onClick={canTransfer ? handleMove : undefined}
            className="prism-btn-secondary prism-focus-ring rounded-full px-3.5 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {activePane === 'left' ? (
              <ArrowRight aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ArrowLeft aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{activePane === 'left' ? 'Move ->' : '<- Move'}</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            aria-pressed={compareActive}
            data-action="compare"
            data-testid="dual-pane-action-compare"
            onClick={disabled ? undefined : handleToggleCompare}
            className={cx(
              compareActive ? 'prism-btn-cobalt' : 'prism-crystal',
              'prism-focus-ring rounded-full px-3.5 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap'
            )}
            style={compareActive ? undefined : { color: 'var(--prism-text-primary)' }}
          >
            <GitCompareArrows aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Compare</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            data-action="sync"
            data-testid="dual-pane-action-sync"
            onClick={disabled ? undefined : handleSyncNewer}
            className="prism-crystal prism-focus-ring rounded-full px-3.5 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
            style={STYLE_SUCCESS_DARK}
          >
            <RefreshCw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Sync Newer</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            data-action="swap"
            data-testid="dual-pane-action-swap"
            onClick={disabled ? undefined : handleSwapPanes}
            className="prism-crystal prism-focus-ring rounded-full px-3.5 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
            style={STYLE_TEXT_PRIMARY}
          >
            <ArrowLeftRight aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Swap Panes</span>
          </button>
        </div>

        {renderPane({
          side: 'right',
          pathValue: currentRightPath,
          rows: rightRows,
          selectedSet: rightSelectedIds,
          oppositeByName: leftByName,
        })}
      </div>

      {/* Polite Live Status Bar */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="dual-pane-status"
        className={cx(
          statusClass,
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
              : 'var(--prism-success-main)',
          }}
        />
        <span className="min-w-0 break-words">{statusMessage}</span>
      </div>
    </div>
  );
}

export const DualPaneCommander = memo(DualPaneCommanderInner);
DualPaneCommander.displayName = 'DualPaneCommander';
