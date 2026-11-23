'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  AppWindow,
  ArrowUpDown,
  ExternalLink,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  Grid3x3,
  HardDrive,
  Inbox,
  Pin,
  Sparkles,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BADGE_ERROR, STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, compareNaturalStrings } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type DesktopWallpaperPreset =
  | 'prism-aurora'
  | 'alabaster-mist'
  | 'obsidian-grid'
  | 'solar-refraction';

export type DesktopIconKind =
  | 'folder'
  | 'app'
  | 'document'
  | 'archive'
  | 'image'
  | 'drive';

export interface DesktopIconItem {
  /** Unique stable identifier for the desktop icon. */
  id: string;
  /** Visible file, folder, app, or drive name rendered safely as literal text. */
  name: string;
  /** Semantic icon kind controlling glyph, aria description, and accent token. */
  kind: DesktopIconKind;
  /** Zero-based horizontal grid column coordinate (clamped to `[0 .. gridCols - 1]`). */
  col: number;
  /** Zero-based vertical grid row coordinate (clamped to `[0 .. gridRows - 1]`). */
  row: number;
  /** Optional short badge pill (e.g. `'12'`, `'v1.45'`, `'NVMe'`). */
  badge?: string;
  /** Marks the icon as pinned on the desktop surface. */
  pinned?: boolean;
}

export type DesktopSortKey = 'name' | 'kind' | 'position';

type DesktopIconCanvasBaseProps = Omit<
  BaseProps<HTMLDivElement>,
  'onSelect' | 'onChange'
>;

export interface DesktopIconCanvasProps extends DesktopIconCanvasBaseProps {
  /** Controlled array of desktop icon items. */
  items?: ReadonlyArray<DesktopIconItem>;
  /** Initial uncontrolled desktop icon items (defaults to 6 desktop items). */
  defaultItems?: ReadonlyArray<DesktopIconItem>;
  /** Controlled optical wallpaper preset. */
  wallpaper?: DesktopWallpaperPreset;
  /** Initial uncontrolled optical wallpaper preset (defaults to `'prism-aurora'`). */
  defaultWallpaper?: DesktopWallpaperPreset;
  /** Controlled snap-to-grid mode flag. */
  snapToGrid?: boolean;
  /** Initial uncontrolled snap-to-grid mode flag (defaults to `true`). */
  defaultSnapToGrid?: boolean;
  /** Number of invisible desktop grid columns, clamped to `[3..12]` (defaults to `6`). */
  gridCols?: number;
  /** Number of invisible desktop grid rows, clamped to `[2..8]` (defaults to `4`). */
  gridRows?: number;
  /** Controlled array of selected desktop icon IDs. */
  selectedIds?: ReadonlyArray<string>;
  /** Initial uncontrolled array of selected desktop icon IDs (defaults to `[]`). */
  defaultSelectedIds?: ReadonlyArray<string>;
  /** Callback fired when icon positions, arrangement, or names change. */
  onItemsChange?: (items: DesktopIconItem[]) => void;
  /** Callback fired whenever the normalized selection ID array changes. */
  onSelectionChange?: (ids: string[]) => void;
  /** Callback fired when an icon is opened via double-click, Enter key, or the Open toolbar action. */
  onOpenItem?: (item: DesktopIconItem) => void;
  /** Callback fired when the optical wallpaper preset changes. */
  onWallpaperChange?: (preset: DesktopWallpaperPreset) => void;
  /** Disables all icon selection, dragging, marquee, renaming, and toolbar interactions. */
  disabled?: boolean;
}

interface WallpaperOption {
  id: DesktopWallpaperPreset;
  label: string;
  swatchToken: string;
}

interface SortOption {
  key: DesktopSortKey;
  label: string;
}

interface DragPreviewState {
  id: string;
  col: number;
  row: number;
}

interface MarqueeBoxRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ClientRectBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

type SpatialDirection = 'up' | 'down' | 'left' | 'right';

const DEFAULT_GRID_COLS = 6;
const DEFAULT_GRID_ROWS = 4;
const MIN_GRID_COLS = 3;
const MAX_GRID_COLS = 12;
const MIN_GRID_ROWS = 2;
const MAX_GRID_ROWS = 8;
const DRAG_ACTIVATION_THRESHOLD_PX = 4;
const FALLBACK_CELL_WIDTH_PX = 112;
const FALLBACK_CELL_HEIGHT_PX = 104;
const EMPTY_IDS: ReadonlyArray<string> = [];

export const DEFAULT_DESKTOP_ICONS: ReadonlyArray<DesktopIconItem> = [
  {
    id: 'projects',
    name: 'Projects',
    kind: 'folder',
    col: 0,
    row: 0,
    badge: '12',
    pinned: true,
  },
  {
    id: 'refractor-studio',
    name: 'Refractor Studio',
    kind: 'app',
    col: 0,
    row: 1,
    badge: 'v1.45',
    pinned: true,
  },
  {
    id: 'q4-spec',
    name: 'Q4 Spec.pdf',
    kind: 'document',
    col: 0,
    row: 2,
  },
  {
    id: 'release-assets',
    name: 'Release Assets.zip',
    kind: 'archive',
    col: 1,
    row: 0,
    badge: 'ZIP',
  },
  {
    id: 'glass-study',
    name: 'Glass Study.png',
    kind: 'image',
    col: 1,
    row: 1,
  },
  {
    id: 'macintosh-hd',
    name: 'Macintosh HD',
    kind: 'drive',
    col: 5,
    row: 0,
    badge: 'NVMe',
    pinned: true,
  },
];

const WALLPAPER_OPTIONS: ReadonlyArray<WallpaperOption> = [
  {
    id: 'prism-aurora',
    label: 'Aurora',
    swatchToken: 'var(--prism-primary-main)',
  },
  {
    id: 'alabaster-mist',
    label: 'Mist',
    swatchToken: 'var(--prism-secondary-light)',
  },
  {
    id: 'obsidian-grid',
    label: 'Obsidian',
    swatchToken: 'var(--prism-info-main)',
  },
  {
    id: 'solar-refraction',
    label: 'Solar',
    swatchToken: 'var(--prism-warning-main)',
  },
];

const SORT_OPTIONS: ReadonlyArray<SortOption> = [
  { key: 'name', label: 'Name' },
  { key: 'kind', label: 'Kind' },
  { key: 'position', label: 'Grid' },
];

function getWallpaperBackground(preset: DesktopWallpaperPreset): string {
  switch (preset) {
    case 'prism-aurora':
      return [
        'radial-gradient(85% 75% at 16% 18%, color-mix(in srgb, var(--prism-primary-main) 24%, transparent) 0%, transparent 62%)',
        'radial-gradient(78% 72% at 84% 22%, color-mix(in srgb, var(--prism-secondary-main) 26%, transparent) 0%, transparent 60%)',
        'radial-gradient(72% 68% at 52% 88%, color-mix(in srgb, var(--prism-success-main) 18%, transparent) 0%, transparent 64%)',
        'linear-gradient(145deg, var(--prism-bg-start) 0%, var(--prism-bg-mid) 52%, var(--prism-bg-end) 100%)',
      ].join(', ');
    case 'alabaster-mist':
      return [
        'radial-gradient(92% 70% at 24% 12%, color-mix(in srgb, var(--prism-crystal-top) 82%, transparent) 0%, transparent 62%)',
        'radial-gradient(75% 65% at 80% 82%, color-mix(in srgb, var(--prism-secondary-light) 28%, transparent) 0%, transparent 64%)',
        'linear-gradient(160deg, var(--prism-well-end) 0%, var(--prism-bg-start) 52%, var(--prism-bg-mid) 100%)',
      ].join(', ');
    case 'obsidian-grid':
      return [
        'radial-gradient(72% 68% at 22% 20%, color-mix(in srgb, var(--prism-info-main) 22%, transparent) 0%, transparent 60%)',
        'radial-gradient(66% 62% at 82% 80%, color-mix(in srgb, var(--prism-secondary-dark) 20%, transparent) 0%, transparent 60%)',
        'linear-gradient(to right, color-mix(in srgb, var(--prism-divider) 90%, transparent) 1px, transparent 1px)',
        'linear-gradient(to bottom, color-mix(in srgb, var(--prism-divider) 90%, transparent) 1px, transparent 1px)',
        'linear-gradient(150deg, var(--prism-well-start) 0%, var(--prism-bg-end) 100%)',
      ].join(', ');
    case 'solar-refraction':
      return [
        'radial-gradient(82% 72% at 20% 16%, color-mix(in srgb, var(--prism-warning-main) 30%, transparent) 0%, transparent 60%)',
        'radial-gradient(76% 68% at 82% 26%, color-mix(in srgb, var(--prism-primary-light) 26%, transparent) 0%, transparent 60%)',
        'radial-gradient(72% 64% at 48% 90%, color-mix(in srgb, var(--prism-primary-main) 20%, transparent) 0%, transparent 62%)',
        'linear-gradient(135deg, var(--prism-bg-start) 0%, var(--prism-bg-mid) 54%, var(--prism-bg-end) 100%)',
      ].join(', ');
  }
}

function getWallpaperLabel(preset: DesktopWallpaperPreset): string {
  switch (preset) {
    case 'prism-aurora':
      return 'Aurora';
    case 'alabaster-mist':
      return 'Mist';
    case 'obsidian-grid':
      return 'Obsidian';
    case 'solar-refraction':
      return 'Solar';
  }
}

function getKindMeta(kind: DesktopIconKind): {
  label: string;
  accentVar: string;
} {
  switch (kind) {
    case 'folder':
      return { label: 'Folder', accentVar: 'var(--prism-warning-main)' };
    case 'app':
      return { label: 'Application', accentVar: 'var(--prism-primary-main)' };
    case 'document':
      return { label: 'Document', accentVar: 'var(--prism-info-main)' };
    case 'archive':
      return { label: 'Archive', accentVar: 'var(--prism-secondary-dark)' };
    case 'image':
      return { label: 'Image', accentVar: 'var(--prism-success-main)' };
    case 'drive':
      return { label: 'Drive', accentVar: 'var(--prism-text-primary)' };
  }
}

function renderKindGlyph(kind: DesktopIconKind, accentVar: string): ReactNode {
  const iconStyle = { color: accentVar };
  switch (kind) {
    case 'folder':
      return (
        <Folder
          aria-hidden="true"
          className="w-6 h-6 shrink-0"
          style={iconStyle}
        />
      );
    case 'app':
      return (
        <AppWindow
          aria-hidden="true"
          className="w-6 h-6 shrink-0"
          style={iconStyle}
        />
      );
    case 'document':
      return (
        <FileText
          aria-hidden="true"
          className="w-6 h-6 shrink-0"
          style={iconStyle}
        />
      );
    case 'archive':
      return (
        <FileArchive
          aria-hidden="true"
          className="w-6 h-6 shrink-0"
          style={iconStyle}
        />
      );
    case 'image':
      return (
        <FileImage
          aria-hidden="true"
          className="w-6 h-6 shrink-0"
          style={iconStyle}
        />
      );
    case 'drive':
      return (
        <HardDrive
          aria-hidden="true"
          className="w-6 h-6 shrink-0"
          style={iconStyle}
        />
      );
  }
}

function normalizeItems(
  rawItems: ReadonlyArray<DesktopIconItem>,
  cols: number,
  rows: number
): DesktopIconItem[] {
  const maxCol = cols - 1;
  const maxRow = rows - 1;
  return rawItems.map((item) => ({
    ...item,
    col: clampNumber(item.col, 0, maxCol, 0),
    row: clampNumber(item.row, 0, maxRow, 0),
  }));
}

function normalizeSelection(
  ids: ReadonlyArray<string>,
  items: ReadonlyArray<DesktopIconItem>
): string[] {
  if (ids.length === 0 || items.length === 0) return [];
  const requested = new Set(ids);
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of items) {
    if (requested.has(item.id) && !seen.has(item.id)) {
      seen.add(item.id);
      normalized.push(item.id);
    }
  }
  return normalized;
}

function arraysEqual(
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function rectsIntersect(a: ClientRectBox, b: ClientRectBox): boolean {
  if (b.right <= b.left || b.bottom <= b.top) return false;
  return (
    a.left <= b.right &&
    a.right >= b.left &&
    a.top <= b.bottom &&
    a.bottom >= b.top
  );
}

function buildOccupiedCellSet(
  items: ReadonlyArray<DesktopIconItem>,
  excludeId: string
): Set<string> {
  const occupied = new Set<string>();
  for (const item of items) {
    if (item.id === excludeId) continue;
    occupied.add(`${Math.round(item.col)}:${Math.round(item.row)}`);
  }
  return occupied;
}

function findNearestOpenCell(
  targetCol: number,
  targetRow: number,
  cols: number,
  rows: number,
  occupied: ReadonlySet<string>
): { col: number; row: number } {
  const startCol = Math.round(clampNumber(targetCol, 0, cols - 1, 0));
  const startRow = Math.round(clampNumber(targetRow, 0, rows - 1, 0));
  if (!occupied.has(`${startCol}:${startRow}`)) {
    return { col: startCol, row: startRow };
  }

  let bestCol = startCol;
  let bestRow = startRow;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (occupied.has(`${col}:${row}`)) continue;
      const dist = Math.hypot(col - startCol, row - startRow);
      if (dist < bestDist) {
        bestDist = dist;
        bestCol = col;
        bestRow = row;
      }
    }
  }

  return { col: bestCol, row: bestRow };
}

function arrangeItemsBySortKey(
  items: ReadonlyArray<DesktopIconItem>,
  sortKey: DesktopSortKey,
  cols: number,
  rows: number
): DesktopIconItem[] {
  const sorted = [...items].sort((a, b) => {
    if (sortKey === 'name') {
      return compareNaturalStrings(a.name, b.name);
    }
    if (sortKey === 'kind') {
      const kindDiff = a.kind.localeCompare(b.kind);
      return kindDiff !== 0
        ? kindDiff
        : compareNaturalStrings(a.name, b.name);
    }
    const rowDiff = a.row - b.row;
    if (rowDiff !== 0) return rowDiff;
    const colDiff = a.col - b.col;
    if (colDiff !== 0) return colDiff;
    return compareNaturalStrings(a.name, b.name);
  });

  const maxRow = rows - 1;
  return sorted.map((item, index) => ({
    ...item,
    col: index % cols,
    row: Math.min(maxRow, Math.floor(index / cols)),
  }));
}

function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

function validateDesktopIconName(
  rawName: string,
  targetId: string,
  items: ReadonlyArray<DesktopIconItem>
): string | null {
  const trimmed = rawName.trim();
  if (trimmed.length === 0) {
    return 'Name cannot be empty.';
  }
  if (
    trimmed === '.' ||
    trimmed === '..' ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('..') ||
    hasControlChar(trimmed)
  ) {
    return 'Name cannot contain path separators, traversal sequences, or control characters.';
  }
  const normalizedTarget = trimmed.toLowerCase();
  for (const item of items) {
    if (
      item.id !== targetId &&
      item.name.trim().toLowerCase() === normalizedTarget
    ) {
      return 'An icon with this name already exists.';
    }
  }
  return null;
}

function formatSelectionStatus(count: number): string {
  if (count === 0) return 'Selection cleared.';
  return `${count} desktop ${count === 1 ? 'icon' : 'icons'} selected.`;
}

function getReadingOrderIds(items: ReadonlyArray<DesktopIconItem>): string[] {
  return [...items]
    .sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      if (a.col !== b.col) return a.col - b.col;
      return compareNaturalStrings(a.name, b.name);
    })
    .map((item) => item.id);
}

function findSpatialNeighbor(
  current: DesktopIconItem,
  items: ReadonlyArray<DesktopIconItem>,
  direction: SpatialDirection
): DesktopIconItem | null {
  let best: DesktopIconItem | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of items) {
    if (candidate.id === current.id) continue;
    const dx = candidate.col - current.col;
    const dy = candidate.row - current.row;

    let primary: number;
    let secondary: number;
    if (direction === 'right') {
      if (dx <= 0) continue;
      primary = dx;
      secondary = Math.abs(dy);
    } else if (direction === 'left') {
      if (dx >= 0) continue;
      primary = -dx;
      secondary = Math.abs(dy);
    } else if (direction === 'down') {
      if (dy <= 0) continue;
      primary = dy;
      secondary = Math.abs(dx);
    } else {
      if (dy >= 0) continue;
      primary = -dy;
      secondary = Math.abs(dx);
    }

    const score = primary + secondary * 3;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

const toolbarClass = /*#__PURE__*/ stableClassName('desktop-icon-canvas', 'toolbar');
const stageClass = /*#__PURE__*/ stableClassName('desktop-icon-canvas', 'stage');
const iconClass = /*#__PURE__*/ stableClassName('desktop-icon-canvas', 'icon');
const marqueeClass = /*#__PURE__*/ stableClassName('desktop-icon-canvas', 'marquee');
const footerClass = /*#__PURE__*/ stableClassName('desktop-icon-canvas', 'footer');

function DesktopIconCanvasInner({
  items,
  defaultItems = DEFAULT_DESKTOP_ICONS,
  wallpaper,
  defaultWallpaper = 'prism-aurora',
  snapToGrid,
  defaultSnapToGrid = true,
  gridCols = DEFAULT_GRID_COLS,
  gridRows = DEFAULT_GRID_ROWS,
  selectedIds,
  defaultSelectedIds = EMPTY_IDS,
  onItemsChange,
  onSelectionChange,
  onOpenItem,
  onWallpaperChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DesktopIconCanvasProps) {
  const override = useComponentOverride('DesktopIconCanvas');
  const renameErrorId = useId();

  const safeCols = Math.round(
    clampNumber(gridCols, MIN_GRID_COLS, MAX_GRID_COLS, DEFAULT_GRID_COLS)
  );
  const safeRows = Math.round(
    clampNumber(gridRows, MIN_GRID_ROWS, MAX_GRID_ROWS, DEFAULT_GRID_ROWS)
  );

  const isItemsControlled = items !== undefined;
  const isWallpaperControlled = wallpaper !== undefined;
  const isSnapControlled = snapToGrid !== undefined;
  const isSelectionControlled = selectedIds !== undefined;

  const [internalItems, setInternalItems] = useState<DesktopIconItem[]>(() =>
    normalizeItems(defaultItems, safeCols, safeRows)
  );
  const [internalWallpaper, setInternalWallpaper] =
    useState<DesktopWallpaperPreset>(defaultWallpaper);
  const [internalSnapToGrid, setInternalSnapToGrid] =
    useState<boolean>(defaultSnapToGrid);
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(() =>
    normalizeSelection(defaultSelectedIds, items ?? defaultItems)
  );

  const normalizedItems = useMemo(
    () =>
      normalizeItems(
        isItemsControlled ? items : internalItems,
        safeCols,
        safeRows
      ),
    [internalItems, isItemsControlled, items, safeCols, safeRows]
  );

  const itemMap = useMemo(() => {
    const map = new Map<string, DesktopIconItem>();
    for (const item of normalizedItems) {
      map.set(item.id, item);
    }
    return map;
  }, [normalizedItems]);

  const resolvedWallpaper = isWallpaperControlled
    ? wallpaper
    : internalWallpaper;
  const isSnapEnabled = isSnapControlled ? snapToGrid : internalSnapToGrid;

  const currentSelectedIds = useMemo(
    () =>
      normalizeSelection(
        isSelectionControlled ? selectedIds : internalSelectedIds,
        normalizedItems
      ),
    [
      internalSelectedIds,
      isSelectionControlled,
      normalizedItems,
      selectedIds,
    ]
  );

  const selectedSet = useMemo(
    () => new Set(currentSelectedIds),
    [currentSelectedIds]
  );

  const [activeSort, setActiveSort] = useState<DesktopSortKey | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(
    () => normalizedItems[0]?.id ?? null
  );
  const [anchorId, setAnchorId] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeBoxRect | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Desktop ready. Select icons, drag to reposition, or drag background to marquee.'
  );

  const effectiveFocusedId = useMemo(() => {
    if (focusedId && itemMap.has(focusedId)) {
      return focusedId;
    }
    return normalizedItems[0]?.id ?? null;
  }, [focusedId, itemMap, normalizedItems]);

  const iconNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const cleanupPointerRef = useRef<(() => void) | null>(null);
  const suppressClickIdRef = useRef<string | null>(null);

  const latestRef = useRef({
    normalizedItems,
    currentSelectedIds,
    isItemsControlled,
    isSelectionControlled,
    isSnapEnabled,
    safeCols,
    safeRows,
    onItemsChange,
    onSelectionChange,
  });
  latestRef.current = {
    normalizedItems,
    currentSelectedIds,
    isItemsControlled,
    isSelectionControlled,
    isSnapEnabled,
    safeCols,
    safeRows,
    onItemsChange,
    onSelectionChange,
  };

  const setIconNodeRef = useCallback(
    (id: string, node: HTMLDivElement | null) => {
      if (node) {
        iconNodesRef.current.set(id, node);
      } else {
        iconNodesRef.current.delete(id);
      }
    },
    []
  );

  const abortPointerSession = useCallback(() => {
    cleanupPointerRef.current?.();
    suppressClickIdRef.current = null;
    setDragPreview(null);
    setMarqueeRect(null);
  }, []);

  useEffect(() => {
    if (disabled) {
      abortPointerSession();
      setRenamingId(null);
      setRenameError(null);
    }
  }, [abortPointerSession, disabled]);

  useEffect(() => {
    return () => {
      cleanupPointerRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (renamingId !== null) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  const commitItems = useCallback(
    (nextItems: DesktopIconItem[], nextStatus?: string) => {
      if (!isItemsControlled) {
        setInternalItems(nextItems);
      }
      onItemsChange?.(nextItems);
      if (nextStatus) {
        setStatusMessage(nextStatus);
      }
    },
    [isItemsControlled, onItemsChange]
  );

  const commitSelection = useCallback(
    (nextIds: ReadonlyArray<string>, nextStatus?: string) => {
      const normalized = normalizeSelection(nextIds, normalizedItems);
      if (arraysEqual(currentSelectedIds, normalized)) {
        return;
      }
      if (!isSelectionControlled) {
        setInternalSelectedIds(normalized);
      }
      onSelectionChange?.(normalized);
      if (nextStatus) {
        setStatusMessage(nextStatus);
      }
    },
    [
      currentSelectedIds,
      isSelectionControlled,
      normalizedItems,
      onSelectionChange,
    ]
  );

  const handleWallpaperSelect = useCallback(
    (preset: DesktopWallpaperPreset) => {
      if (preset === resolvedWallpaper) return;
      if (!isWallpaperControlled) {
        setInternalWallpaper(preset);
      }
      onWallpaperChange?.(preset);
      setStatusMessage(`Wallpaper changed to ${getWallpaperLabel(preset)}.`);
    },
    [isWallpaperControlled, onWallpaperChange, resolvedWallpaper]
  );

  const handleToggleSnapToGrid = useCallback(() => {
    const nextSnap = !isSnapEnabled;
    if (!isSnapControlled) {
      setInternalSnapToGrid(nextSnap);
    }
    setStatusMessage(
      nextSnap ? 'Snap to grid enabled.' : 'Snap to grid disabled.'
    );
  }, [isSnapControlled, isSnapEnabled]);

  const handleSortArrange = useCallback(
    (sortKey: DesktopSortKey) => {
      const arranged = arrangeItemsBySortKey(
        normalizedItems,
        sortKey,
        safeCols,
        safeRows
      );
      setActiveSort(sortKey);
      const sortLabel =
        sortKey === 'name'
          ? 'Name'
          : sortKey === 'kind'
            ? 'Kind'
            : 'Grid';
      commitItems(
        arranged,
        `Auto-arranged ${arranged.length} icons by ${sortLabel}.`
      );
    },
    [commitItems, normalizedItems, safeCols, safeRows]
  );

  const handleOpenSelected = useCallback(() => {
    const targets = normalizedItems.filter((item) => selectedSet.has(item.id));
    for (const target of targets) {
      onOpenItem?.(target);
    }
    setStatusMessage(
      targets.length === 1
        ? `Opened "${targets[0]!.name}".`
        : `Opened ${targets.length} items: ${targets.map((t) => t.name).join(', ')}.`
    );
  }, [normalizedItems, onOpenItem, selectedSet]);

  const handleClearSelection = useCallback(() => {
    commitSelection(EMPTY_IDS, 'Selection cleared.');
  }, [commitSelection]);

  const handleImeSafeButtonKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) {
        event.preventDefault();
      }
    },
    []
  );

  const startRename = useCallback((item: DesktopIconItem) => {
    setRenamingId(item.id);
    setRenameDraft(item.name);
    setRenameError(null);
    setStatusMessage(`Renaming "${item.name}".`);
  }, []);

  const cancelRename = useCallback((targetId: string) => {
    setRenamingId(null);
    setRenameError(null);
    setStatusMessage('Rename cancelled.');
    iconNodesRef.current.get(targetId)?.focus();
  }, []);

  const commitRename = useCallback(
    (targetId: string) => {
      const validationError = validateDesktopIconName(
        renameDraft,
        targetId,
        normalizedItems
      );
      if (validationError) {
        setRenameError(validationError);
        setStatusMessage(validationError);
        return;
      }

      const nextName = renameDraft.trim();
      const currentItem = itemMap.get(targetId);
      setRenamingId(null);
      setRenameError(null);

      if (currentItem && currentItem.name !== nextName) {
        const nextItems = normalizedItems.map((item) =>
          item.id === targetId ? { ...item, name: nextName } : item
        );
        commitItems(
          nextItems,
          `Renamed "${currentItem.name}" to "${nextName}".`
        );
      } else {
        setStatusMessage('Rename unchanged.');
      }

      iconNodesRef.current.get(targetId)?.focus();
    },
    [commitItems, itemMap, normalizedItems, renameDraft]
  );

  const handleRenameInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>, targetId: string) => {
      event.stopPropagation();
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        commitRename(targetId);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelRename(targetId);
      }
    },
    [cancelRename, commitRename]
  );

  const handleIconClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>, item: DesktopIconItem) => {
      if (disabled || renamingId === item.id) return;
      if (suppressClickIdRef.current === item.id) {
        suppressClickIdRef.current = null;
        return;
      }
      suppressClickIdRef.current = null;
      setFocusedId(item.id);

      if (event.ctrlKey || event.metaKey) {
        const nextIds = selectedSet.has(item.id)
          ? currentSelectedIds.filter((id) => id !== item.id)
          : [...currentSelectedIds, item.id];
        setAnchorId(item.id);
        commitSelection(nextIds, formatSelectionStatus(nextIds.length));
        return;
      }

      if (event.shiftKey) {
        const orderedIds = getReadingOrderIds(normalizedItems);
        const pivotId =
          anchorId && itemMap.has(anchorId)
            ? anchorId
            : currentSelectedIds[currentSelectedIds.length - 1] ?? null;
        if (pivotId) {
          const startIdx = orderedIds.indexOf(pivotId);
          const endIdx = orderedIds.indexOf(item.id);
          const low = Math.min(startIdx, endIdx);
          const high = Math.max(startIdx, endIdx);
          const rangeIds = orderedIds.slice(low, high + 1);
          const mergedIds = [...currentSelectedIds, ...rangeIds];
          const normalizedNext = normalizeSelection(mergedIds, normalizedItems);
          commitSelection(
            normalizedNext,
            formatSelectionStatus(normalizedNext.length)
          );
          return;
        }
        setAnchorId(item.id);
        commitSelection([item.id], `Selected "${item.name}".`);
        return;
      }

      setAnchorId(item.id);
      commitSelection([item.id], `Selected "${item.name}".`);
    },
    [
      anchorId,
      commitSelection,
      currentSelectedIds,
      disabled,
      itemMap,
      normalizedItems,
      renamingId,
      selectedSet,
    ]
  );

  const handleIconDoubleClick = useCallback(
    (item: DesktopIconItem) => {
      if (disabled || renamingId === item.id) return;
      onOpenItem?.(item);
      setStatusMessage(`Opened "${item.name}".`);
    },
    [disabled, onOpenItem, renamingId]
  );

  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0) return;

      if (renamingId !== null) {
        setRenamingId(null);
        setRenameError(null);
      }

      cleanupPointerRef.current?.();
      suppressClickIdRef.current = null;

      const stageEl = event.currentTarget;
      const targetEl = event.target as HTMLElement;
      const iconEl = targetEl.closest('[data-desktop-icon-id]');
      const iconId = iconEl?.getAttribute('data-desktop-icon-id') ?? null;
      const startClientX = event.clientX;
      const startClientY = event.clientY;

      if (iconId !== null) {
        const dragItem = latestRef.current.normalizedItems.find(
          (entry) => entry.id === iconId
        )!;

        const startCol = dragItem.col;
        const startRow = dragItem.row;
        let didDrag = false;
        let lastRawCol = startCol;
        let lastRawRow = startRow;

        const handleIconPointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
          const distance = Math.hypot(
            moveEvent.clientX - startClientX,
            moveEvent.clientY - startClientY
          );
          if (!didDrag && distance < DRAG_ACTIVATION_THRESHOLD_PX) {
            return;
          }
          didDrag = true;
          suppressClickIdRef.current = dragItem.id;

          const stageRect = stageEl.getBoundingClientRect();
          const { safeCols: cols, safeRows: rows } = latestRef.current;
          const cellWidth =
            stageRect.width > 0
              ? stageRect.width / cols
              : FALLBACK_CELL_WIDTH_PX;
          const cellHeight =
            stageRect.height > 0
              ? stageRect.height / rows
              : FALLBACK_CELL_HEIGHT_PX;

          lastRawCol = clampNumber(
            startCol + (moveEvent.clientX - startClientX) / cellWidth,
            0,
            cols - 1,
            startCol
          );
          lastRawRow = clampNumber(
            startRow + (moveEvent.clientY - startClientY) / cellHeight,
            0,
            rows - 1,
            startRow
          );

          setDragPreview({
            id: dragItem.id,
            col: lastRawCol,
            row: lastRawRow,
          });
        });

        const cleanupIconDrag = () => {
          handleIconPointerMove.cancel();
          window.removeEventListener('pointermove', handleIconPointerMove);
          window.removeEventListener('pointerup', handleIconPointerUp);
          window.removeEventListener('pointercancel', handleIconPointerCancel);
          cleanupPointerRef.current = null;
        };

        const handleIconPointerUp = () => {
          cleanupIconDrag();
          setDragPreview(null);
          if (!didDrag) return;

          const {
            normalizedItems: latestItems,
            isItemsControlled: controlledItems,
            isSnapEnabled: snapEnabled,
            safeCols: cols,
            safeRows: rows,
            onItemsChange: notifyItems,
          } = latestRef.current;

          let finalCol: number;
          let finalRow: number;

          if (snapEnabled) {
            const occupied = buildOccupiedCellSet(latestItems, dragItem.id);
            const resolved = findNearestOpenCell(
              Math.round(lastRawCol),
              Math.round(lastRawRow),
              cols,
              rows,
              occupied
            );
            finalCol = resolved.col;
            finalRow = resolved.row;
          } else {
            finalCol = Math.round(lastRawCol * 100) / 100;
            finalRow = Math.round(lastRawRow * 100) / 100;
          }

          const nextItems = latestItems.map((entry) =>
            entry.id === dragItem.id
              ? { ...entry, col: finalCol, row: finalRow }
              : entry
          );
          setActiveSort(null);
          if (!controlledItems) {
            setInternalItems(nextItems);
          }
          notifyItems?.(nextItems);
          setStatusMessage(
            `Moved "${dragItem.name}" to column ${Math.round(finalCol) + 1}, row ${Math.round(finalRow) + 1}.`
          );
        };

        const handleIconPointerCancel = () => {
          cleanupIconDrag();
          setDragPreview(null);
          suppressClickIdRef.current = null;
          setStatusMessage(`Cancelled moving "${dragItem.name}".`);
        };

        cleanupPointerRef.current = cleanupIconDrag;
        window.addEventListener('pointermove', handleIconPointerMove, { passive: true });
        window.addEventListener('pointerup', handleIconPointerUp);
        window.addEventListener('pointercancel', handleIconPointerCancel);
        return;
      }

      // Empty desktop background: start marquee selection
      event.preventDefault();
      const additive = event.shiftKey || event.ctrlKey || event.metaKey;
      const baseSelection = additive
        ? [...latestRef.current.currentSelectedIds]
        : [];
      let workingSelection = latestRef.current.currentSelectedIds;
      let didMove = false;

      const applyMarqueeSelection = (nextIds: ReadonlyArray<string>) => {
        const normalized = normalizeSelection(
          nextIds,
          latestRef.current.normalizedItems
        );
        if (arraysEqual(workingSelection, normalized)) return;
        workingSelection = normalized;
        if (!latestRef.current.isSelectionControlled) {
          setInternalSelectedIds(normalized);
        }
        latestRef.current.onSelectionChange?.(normalized);
        setStatusMessage(formatSelectionStatus(normalized.length));
      };

      const clampPointToStage = (
        clientX: number,
        clientY: number,
        stageRect: DOMRect
      ) => {
        const hasBounds = stageRect.width > 0 && stageRect.height > 0;
        return {
          x: hasBounds
            ? clampNumber(clientX, stageRect.left, stageRect.right, clientX)
            : clientX,
          y: hasBounds
            ? clampNumber(clientY, stageRect.top, stageRect.bottom, clientY)
            : clientY,
        };
      };

      const initialRect = stageEl.getBoundingClientRect();
      const origin = clampPointToStage(startClientX, startClientY, initialRect);
      setMarqueeRect({
        left: Math.round(origin.x - initialRect.left),
        top: Math.round(origin.y - initialRect.top),
        width: 0,
        height: 0,
      });

      const handleMarqueePointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        didMove = true;
        const stageRect = stageEl.getBoundingClientRect();
        const start = clampPointToStage(startClientX, startClientY, stageRect);
        const end = clampPointToStage(
          moveEvent.clientX,
          moveEvent.clientY,
          stageRect
        );

        const boxLeft = Math.min(start.x, end.x);
        const boxRight = Math.max(start.x, end.x);
        const boxTop = Math.min(start.y, end.y);
        const boxBottom = Math.max(start.y, end.y);

        setMarqueeRect({
          left: Math.round(boxLeft - stageRect.left),
          top: Math.round(boxTop - stageRect.top),
          width: Math.round(boxRight - boxLeft),
          height: Math.round(boxBottom - boxTop),
        });

        const lassoBox: ClientRectBox = {
          left: boxLeft,
          top: boxTop,
          right: boxRight,
          bottom: boxBottom,
        };

        const intersected: string[] = [];
        for (const [id, node] of iconNodesRef.current) {
          if (rectsIntersect(lassoBox, node.getBoundingClientRect())) {
            intersected.push(id);
          }
        }

        const combined = additive
          ? [...baseSelection, ...intersected]
          : intersected;
        applyMarqueeSelection(combined);
      });

      const cleanupMarquee = () => {
        handleMarqueePointerMove.cancel();
        window.removeEventListener('pointermove', handleMarqueePointerMove);
        window.removeEventListener('pointerup', handleMarqueePointerUp);
        window.removeEventListener('pointercancel', handleMarqueePointerCancel);
        cleanupPointerRef.current = null;
      };

      const handleMarqueePointerUp = () => {
        cleanupMarquee();
        setMarqueeRect(null);
        if (!didMove && !additive) {
          applyMarqueeSelection(EMPTY_IDS);
        }
      };

      const handleMarqueePointerCancel = () => {
        cleanupMarquee();
        setMarqueeRect(null);
      };

      cleanupPointerRef.current = cleanupMarquee;
      window.addEventListener('pointermove', handleMarqueePointerMove, { passive: true });
      window.addEventListener('pointerup', handleMarqueePointerUp);
      window.addEventListener('pointercancel', handleMarqueePointerCancel);
    },
    [disabled, renamingId]
  );

  const handleStageKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing || renamingId !== null) {
        return;
      }

      const lowerKey =
        event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if ((event.ctrlKey || event.metaKey) && lowerKey === 'a') {
        event.preventDefault();
        if (normalizedItems.length === 0) return;
        commitSelection(
          normalizedItems.map((item) => item.id),
          `Selected all ${normalizedItems.length} desktop icons.`
        );
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        abortPointerSession();
        commitSelection(EMPTY_IDS, 'Selection cleared.');
        return;
      }

      if (normalizedItems.length === 0) return;

      const iconEl = (event.target as HTMLElement).closest(
        '[data-desktop-icon-id]'
      );
      const targetId =
        iconEl?.getAttribute('data-desktop-icon-id') ?? effectiveFocusedId!;
      const currentItem = itemMap.get(targetId)!;

      if (event.key === 'F2') {
        event.preventDefault();
        startRename(currentItem);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        onOpenItem?.(currentItem);
        setStatusMessage(`Opened "${currentItem.name}".`);
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        const nextIds = selectedSet.has(currentItem.id)
          ? currentSelectedIds.filter((id) => id !== currentItem.id)
          : [...currentSelectedIds, currentItem.id];
        setAnchorId(currentItem.id);
        commitSelection(nextIds, formatSelectionStatus(nextIds.length));
        return;
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const orderedIds = getReadingOrderIds(normalizedItems);
        const boundaryId =
          event.key === 'Home'
            ? orderedIds[0]!
            : orderedIds[orderedIds.length - 1]!;
        setFocusedId(boundaryId);
        iconNodesRef.current.get(boundaryId)?.focus();
        return;
      }

      let direction: SpatialDirection | null = null;
      let dCol = 0;
      let dRow = 0;

      if (event.key === 'ArrowRight') {
        direction = 'right';
        dCol = 1;
      } else if (event.key === 'ArrowLeft') {
        direction = 'left';
        dCol = -1;
      } else if (event.key === 'ArrowDown') {
        direction = 'down';
        dRow = 1;
      } else if (event.key === 'ArrowUp') {
        direction = 'up';
        dRow = -1;
      }

      if (direction === null) return;
      event.preventDefault();

      if (event.altKey) {
        const targetCol = Math.round(
          clampNumber(Math.round(currentItem.col) + dCol, 0, safeCols - 1, 0)
        );
        const targetRow = Math.round(
          clampNumber(Math.round(currentItem.row) + dRow, 0, safeRows - 1, 0)
        );

        if (targetCol === currentItem.col && targetRow === currentItem.row) {
          return;
        }

        let finalCol = targetCol;
        let finalRow = targetRow;
        if (isSnapEnabled) {
          const occupied = buildOccupiedCellSet(normalizedItems, '');
          const resolved = findNearestOpenCell(
            targetCol,
            targetRow,
            safeCols,
            safeRows,
            occupied
          );
          finalCol = resolved.col;
          finalRow = resolved.row;
        }

        const nextItems = normalizedItems.map((item) =>
          item.id === currentItem.id
            ? { ...item, col: finalCol, row: finalRow }
            : item
        );
        setActiveSort(null);
        commitItems(
          nextItems,
          `Moved "${currentItem.name}" to column ${finalCol + 1}, row ${finalRow + 1}.`
        );
        return;
      }

      const neighbor = findSpatialNeighbor(
        currentItem,
        normalizedItems,
        direction
      );
      if (neighbor) {
        setFocusedId(neighbor.id);
        iconNodesRef.current.get(neighbor.id)?.focus();
      }
    },
    [
      abortPointerSession,
      commitItems,
      commitSelection,
      currentSelectedIds,
      disabled,
      effectiveFocusedId,
      isSnapEnabled,
      itemMap,
      normalizedItems,
      onOpenItem,
      renamingId,
      safeCols,
      safeRows,
      selectedSet,
      startRename,
    ]
  );

  const selectedCount = currentSelectedIds.length;
  const isInteracting = dragPreview !== null || marqueeRect !== null;

  const merged = mergeProps({
    themeTarget: themeProps('desktop-icon-canvas', {
      wallpaper: resolvedWallpaper,
      snap: isSnapEnabled ? 'true' : 'false',
      dragging: isInteracting,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-3.5 select-none',
      disabled ? 'opacity-65' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const stageMinWidthPx = safeCols * 96;
  const stageMinHeightPx = safeRows * 96;
  const wallpaperBg = getWallpaperBackground(resolvedWallpaper);

  return (
    <div
      ref={ref}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Top Optical Desktop Toolbar */}
      <div
        data-testid="desktop-toolbar"
        className={cx(
          toolbarClass,
          'flex flex-wrap items-center justify-between gap-2 min-w-0'
        )}
      >
        {/* Wallpaper Preset Pills */}
        <div
          role="group"
          aria-label="Wallpaper presets"
          className="flex flex-wrap items-center gap-1.5 min-w-0"
        >
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold mr-1 shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            <Sparkles
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_PRIMARY_MAIN}
            />
            <span>Desktop</span>
          </span>

          {WALLPAPER_OPTIONS.map((option) => {
            const isActive = resolvedWallpaper === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                aria-pressed={isActive}
                data-testid={`desktop-wallpaper-${option.id}`}
                onClick={() => handleWallpaperSelect(option.id)}
                onKeyDown={handleImeSafeButtonKeyDown}
                className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                style={{
                  color: isActive
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-text-primary)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: isActive
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-divider)',
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)'
                    : undefined,
                }}
              >
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: option.swatchToken }}
                />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Snap, Auto-Arrange, and Selection Telemetry Controls */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <button
            type="button"
            disabled={disabled}
            aria-pressed={isSnapEnabled}
            data-testid="desktop-snap-toggle"
            onClick={handleToggleSnapToGrid}
            onKeyDown={handleImeSafeButtonKeyDown}
            className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            style={{
              color: isSnapEnabled
                ? 'var(--prism-primary-main)'
                : 'var(--prism-text-secondary)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: isSnapEnabled
                ? 'color-mix(in srgb, var(--prism-primary-main) 55%, var(--prism-divider))'
                : 'var(--prism-divider)',
            }}
          >
            <Grid3x3 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Snap to Grid</span>
          </button>

          <div
            role="group"
            aria-label="Auto-arrange icons"
            className="inline-flex flex-wrap items-center gap-1"
          >
            <span
              aria-hidden="true"
              className="inline-flex items-center text-[11px] font-medium px-1"
              style={STYLE_TEXT_SECONDARY}
            >
              <ArrowUpDown className="w-3 h-3 mr-0.5 shrink-0" />
              Sort
            </span>
            {SORT_OPTIONS.map((option) => {
              const isCurrent = activeSort === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  disabled={disabled || normalizedItems.length === 0}
                  aria-pressed={isCurrent}
                  data-testid={`desktop-sort-${option.key}`}
                  onClick={() => handleSortArrange(option.key)}
                  onKeyDown={handleImeSafeButtonKeyDown}
                  className="prism-crystal prism-focus-ring inline-flex items-center h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                  style={{
                    color: isCurrent
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-primary)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: isCurrent
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-divider)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <span
            data-testid="desktop-selection-count"
            className="prism-well inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  selectedCount > 0
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-text-disabled)',
              }}
            />
            <span>{selectedCount} selected</span>
          </span>

          {selectedCount > 0 ? (
            <button
              type="button"
              disabled={disabled}
              data-testid="desktop-open-selected"
              onClick={handleOpenSelected}
              onKeyDown={handleImeSafeButtonKeyDown}
              className="prism-crystal prism-focus-ring inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
              style={{
                color: 'var(--prism-primary-main)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor:
                  'color-mix(in srgb, var(--prism-primary-main) 48%, var(--prism-divider))',
              }}
            >
              <ExternalLink aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Open</span>
            </button>
          ) : null}

          <button
            type="button"
            disabled={disabled || selectedCount === 0}
            data-testid="desktop-clear-selection"
            onClick={handleClearSelection}
            onKeyDown={handleImeSafeButtonKeyDown}
            className="prism-crystal prism-focus-ring inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            style={{
              color: 'var(--prism-text-primary)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--prism-divider)',
            }}
          >
            <X aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Desktop Canvas Stage */}
      <div className="min-w-0 w-full overflow-x-auto rounded-2xl">
        <div
          role="region"
          aria-label="Desktop icon canvas"
          aria-disabled={disabled || undefined}
          data-testid="desktop-canvas-stage"
          data-wallpaper={resolvedWallpaper}
          data-snap-to-grid={isSnapEnabled ? 'true' : 'false'}
          data-grid-cols={String(safeCols)}
          data-grid-rows={String(safeRows)}
          data-dragging-icon={dragPreview ? dragPreview.id : undefined}
          data-marquee-active={marqueeRect ? 'true' : undefined}
          onPointerDown={handleStagePointerDown}
          onKeyDown={handleStageKeyDown}
          className={cx(
            stageClass,
            'relative w-full rounded-2xl overflow-hidden touch-none',
            disabled ? 'cursor-not-allowed' : 'cursor-default'
          )}
          style={{
            minWidth: `${stageMinWidthPx}px`,
            height: `${stageMinHeightPx}px`,
            backgroundImage: wallpaperBg,
            backgroundSize:
              resolvedWallpaper === 'obsidian-grid'
                ? '100% 100%, 100% 100%, 28px 28px, 28px 28px, 100% 100%'
                : '100% 100%',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--prism-well-border)',
          }}
        >
          {/* Optical Grid Dot Guide when Snap to Grid is Active */}
          {isSnapEnabled ? (
            <div
              aria-hidden="true"
              data-testid="desktop-grid-guide"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(circle, color-mix(in srgb, var(--prism-text-secondary) 26%, transparent) 1.5px, transparent 1.5px)',
                backgroundSize: `${100 / safeCols}% ${100 / safeRows}%`,
                backgroundPosition: 'center',
              }}
            />
          ) : null}

          {normalizedItems.length === 0 ? (
            <div
              role="status"
              data-testid="desktop-canvas-empty"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center pointer-events-none"
            >
              <div className="prism-crystal rounded-2xl px-5 py-4 flex flex-col items-center gap-1.5">
                <Inbox
                  aria-hidden="true"
                  className="w-6 h-6"
                  style={STYLE_TEXT_DISABLED}
                />
                <span
                  className="text-xs font-semibold"
                  style={STYLE_TEXT_PRIMARY}
                >
                  Desktop is empty
                </span>
              </div>
            </div>
          ) : (
            normalizedItems.map((item) => {
              const isSelected = selectedSet.has(item.id);
              const isBeingDragged = dragPreview?.id === item.id;
              const isRenaming = renamingId === item.id;
              const isFocused = item.id === effectiveFocusedId;
              const displayCol = isBeingDragged ? dragPreview.col : item.col;
              const displayRow = isBeingDragged ? dragPreview.row : item.row;
              const kindMeta = getKindMeta(item.kind);

              return (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    left: `${(displayCol / safeCols) * 100}%`,
                    top: `${(displayRow / safeRows) * 100}%`,
                    width: `${100 / safeCols}%`,
                    height: `${100 / safeRows}%`,
                    padding: '6px',
                    zIndex: isBeingDragged ? 20 : isRenaming ? 15 : 1,
                    transition: isBeingDragged
                      ? 'none'
                      : 'left 160ms ease, top 160ms ease',
                  }}
                >
                  <div
                    ref={(node) => setIconNodeRef(item.id, node)}
                    role="button"
                    aria-pressed={isSelected}
                    aria-disabled={disabled || undefined}
                    aria-label={`${item.name}, ${kindMeta.label}, column ${Math.round(item.col) + 1} row ${Math.round(item.row) + 1}`}
                    tabIndex={disabled ? -1 : isFocused ? 0 : -1}
                    data-testid={`desktop-icon-${item.id}`}
                    data-desktop-icon-id={item.id}
                    data-kind={item.kind}
                    data-col={String(item.col)}
                    data-row={String(item.row)}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-dragging={isBeingDragged ? 'true' : undefined}
                    data-pinned={item.pinned ? 'true' : undefined}
                    onClick={(event) => handleIconClick(event, item)}
                    onDoubleClick={() => handleIconDoubleClick(item)}
                    onFocus={() => setFocusedId(item.id)}
                    className={cx(
                      iconClass,
                      'prism-focus-ring relative w-full h-full rounded-xl px-2 py-1.5 flex flex-col items-center justify-center gap-1 text-center transition-colors',
                      disabled
                        ? 'cursor-not-allowed'
                        : isBeingDragged
                          ? 'cursor-grabbing'
                          : 'cursor-grab'
                    )}
                    style={{
                      backgroundColor:
                        isSelected || isBeingDragged
                          ? 'color-mix(in srgb, var(--prism-primary-main) 18%, var(--prism-crystal-top))'
                          : 'color-mix(in srgb, var(--prism-crystal-top) 54%, transparent)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor:
                        isSelected || isBeingDragged
                          ? 'var(--prism-primary-main)'
                          : 'color-mix(in srgb, var(--prism-divider) 85%, transparent)',
                      boxShadow: isBeingDragged
                        ? '0 14px 26px -10px color-mix(in srgb, var(--prism-primary-main) 45%, transparent)'
                        : isSelected
                          ? '0 0 0 1px var(--prism-primary-main)'
                          : undefined,
                    }}
                  >
                    {/* Pinned Indicator */}
                    {item.pinned ? (
                      <span
                        aria-hidden="true"
                        data-testid={`desktop-icon-pin-${item.id}`}
                        className="absolute top-1.5 left-1.5 inline-flex items-center justify-center"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        <Pin className="w-2.5 h-2.5" />
                      </span>
                    ) : null}

                    {/* Optional Badge */}
                    {item.badge ? (
                      <span
                        data-testid={`desktop-icon-badge-${item.id}`}
                        className="absolute top-1 right-1 px-1.5 py-0.25 rounded-full font-mono text-[9px] font-semibold leading-tight max-w-[65%] truncate"
                        style={{
                          color: 'var(--prism-text-primary)',
                          backgroundColor:
                            'color-mix(in srgb, var(--prism-well-end) 85%, transparent)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: 'var(--prism-divider)',
                        }}
                      >
                        {item.badge}
                      </span>
                    ) : null}

                    {/* Optical Icon Emblem */}
                    <span
                      aria-hidden="true"
                      className="prism-crystal w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0"
                      style={{
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: `color-mix(in srgb, ${kindMeta.accentVar} 32%, var(--prism-divider))`,
                      }}
                    >
                      {renderKindGlyph(item.kind, kindMeta.accentVar)}
                    </span>

                    {/* Label or Inline Rename Input */}
                    {isRenaming ? (
                      <div
                        className="w-full flex flex-col items-center gap-0.5"
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameDraft}
                          aria-label={`Rename ${item.name}`}
                          aria-invalid={renameError ? 'true' : undefined}
                          aria-describedby={
                            renameError ? renameErrorId : undefined
                          }
                          data-testid="desktop-rename-input"
                          onChange={(event) => {
                            setRenameDraft(event.target.value);
                            if (renameError) {
                              setRenameError(null);
                            }
                          }}
                          onKeyDown={(event) =>
                            handleRenameInputKeyDown(event, item.id)
                          }
                          className="prism-well prism-focus-ring w-full rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-center"
                          style={{
                            color: 'var(--prism-text-primary)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: renameError
                              ? 'var(--prism-error-main)'
                              : 'var(--prism-primary-main)',
                          }}
                        />
                        {renameError ? (
                          <span
                            id={renameErrorId}
                            role="alert"
                            data-testid="desktop-rename-error"
                            className="text-[10px] font-semibold leading-tight px-1 rounded"
                            style={STYLE_BADGE_ERROR}
                          >
                            {renameError}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span
                        data-testid={`desktop-icon-label-${item.id}`}
                        className="w-full text-[11px] font-semibold leading-tight truncate px-0.5"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {item.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Desktop-Level Optical Marquee Lasso Rectangle */}
          {marqueeRect ? (
            <div
              aria-hidden="true"
              data-testid="desktop-marquee-box"
              className={cx(
                marqueeClass,
                'pointer-events-none absolute z-30 rounded-lg border-2'
              )}
              style={{
                left: `${marqueeRect.left}px`,
                top: `${marqueeRect.top}px`,
                width: `${marqueeRect.width}px`,
                height: `${marqueeRect.height}px`,
                borderColor: 'var(--prism-primary-main)',
                backgroundColor:
                  'color-mix(in srgb, var(--prism-primary-main) 18%, transparent)',
                boxShadow:
                  '0 0 0 1px color-mix(in srgb, var(--prism-primary-light) 42%, transparent)',
              }}
            />
          ) : null}
        </div>
      </div>

      {/* Polite Status Live Region & Keyboard Legend */}
      <div
        className={cx(
          footerClass,
          'flex flex-wrap items-center justify-between gap-2 text-xs min-w-0'
        )}
      >
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="desktop-status-live"
          className="min-w-0 truncate"
          style={STYLE_TEXT_SECONDARY}
        >
          {statusMessage}
        </p>
        <span
          className="text-[11px] shrink-0"
          style={STYLE_TEXT_DISABLED}
        >
          Drag icons · Lasso background · Alt+Arrows move · F2 rename · Enter open
        </span>
      </div>
    </div>
  );
}

export const DesktopIconCanvas = /*#__PURE__*/ memoWithDisplayName(DesktopIconCanvasInner, 'DesktopIconCanvas');
