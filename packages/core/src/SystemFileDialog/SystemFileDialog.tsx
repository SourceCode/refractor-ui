'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  Download,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Image,
  Save,
  Search,
  Star,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_ERROR_MAIN, STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_SUCCESS_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN, compareNaturalStrings } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type SystemFileDialogMode = 'inline' | 'modal';

export type SystemFileDialogKind = 'open' | 'save';

export type SystemFileNodeKind = 'folder' | 'file';

export interface SystemFileNode {
  id: string;
  name: string;
  kind: SystemFileNodeKind;
  parentPath: string;
  sizeLabel?: string;
  modifiedLabel?: string;
  extension?: string;
}

export interface SystemFilePlace {
  id: string;
  label: string;
  path: string;
  icon: 'star' | 'folder' | 'file' | 'download' | 'hard-drive';
}

export interface SystemFileFormatFilter {
  id: string;
  label: string;
  extensions: ReadonlyArray<string>;
}

export interface SystemFileDialogResult {
  dialogKind: SystemFileDialogKind;
  directoryPath: string;
  fileName: string;
  fullPath: string;
  formatId: string;
  selectedIds: string[];
}

type SystemFileDialogBaseProps = Omit<
  BaseProps<HTMLDivElement>,
  'onSelect' | 'onChange'
>;

export interface SystemFileDialogProps extends SystemFileDialogBaseProps {
  /** Presentation mode: `'inline'` renders an embedded `prism-slab`; `'modal'` renders a frosted-glass viewport backdrop. */
  mode?: SystemFileDialogMode;
  /** Controls dialog visibility when `mode="modal"`; renders `null` when `false` (defaults to `true`). */
  open?: boolean;
  /** Controlled dialog kind (`'open'` or `'save'`). */
  dialogKind?: SystemFileDialogKind;
  /** Initial uncontrolled dialog kind (defaults to `'open'`). */
  defaultDialogKind?: SystemFileDialogKind;
  /** Displays the Open / Save mode switcher in the header when `dialogKind` is uncontrolled (defaults to `true`). */
  allowKindSwitch?: boolean;
  /** Optional window title overriding the default `'Open File'` / `'Save As'` heading. */
  title?: string;
  /** Sidebar quick-access places (defaults to Favorites, Projects, Documents, Downloads, System Drive). */
  places?: ReadonlyArray<SystemFilePlace>;
  /** Controlled virtual filesystem entries. */
  entries?: ReadonlyArray<SystemFileNode>;
  /** Initial uncontrolled virtual filesystem entries. */
  defaultEntries?: ReadonlyArray<SystemFileNode>;
  /** Initial directory path displayed on mount (defaults to `'/Projects'`). */
  initialPath?: string;
  /** Initial filename prefilled in `save` mode (defaults to `'optical-theme.json'`). */
  defaultFileName?: string;
  /** File-format filter options shown in the footer `<select>` dropdown. */
  formats?: ReadonlyArray<SystemFileFormatFilter>;
  /** Allows selecting multiple files simultaneously when `dialogKind` is `'open'` (defaults to `false`). */
  allowMultiple?: boolean;
  /** Callback fired when the user confirms an Open or Save operation. */
  onConfirm?: (result: SystemFileDialogResult) => void;
  /** Callback fired when the dialog is canceled via Cancel button, close button, backdrop click, or Escape in modal mode. */
  onCancel?: () => void;
  /** Callback fired when a new folder is created with its normalized full path. */
  onCreateFolder?: (folderPath: string) => void;
  /** Disables all navigation, filtering, selection, folder creation, confirmation, and dismissal actions. */
  disabled?: boolean;
}

interface BreadcrumbSegment {
  label: string;
  path: string;
}

export const DEFAULT_FILE_DIALOG_PLACES: ReadonlyArray<SystemFilePlace> = [
  {
    id: 'place-favorites',
    label: 'Favorites',
    path: '/Projects/Refractor',
    icon: 'star',
  },
  {
    id: 'place-projects',
    label: 'Projects',
    path: '/Projects',
    icon: 'folder',
  },
  {
    id: 'place-documents',
    label: 'Documents',
    path: '/Documents',
    icon: 'file',
  },
  {
    id: 'place-downloads',
    label: 'Downloads',
    path: '/Downloads',
    icon: 'download',
  },
  {
    id: 'place-system-drive',
    label: 'System Drive',
    path: '/',
    icon: 'hard-drive',
  },
];

export const DEFAULT_FILE_DIALOG_FORMATS: ReadonlyArray<SystemFileFormatFilter> =
  [
    {
      id: 'all',
      label: 'All Files (*)',
      extensions: ['*'],
    },
    {
      id: 'typescript',
      label: 'TypeScript (.ts, .tsx)',
      extensions: ['.ts', '.tsx'],
    },
    {
      id: 'images',
      label: 'Images (.png, .svg)',
      extensions: ['.png', '.svg'],
    },
    {
      id: 'json',
      label: 'JSON (.json)',
      extensions: ['.json'],
    },
  ];

export const DEFAULT_FILE_DIALOG_ENTRIES: ReadonlyArray<SystemFileNode> = [
  {
    id: 'root-projects',
    name: 'Projects',
    kind: 'folder',
    parentPath: '/',
    modifiedLabel: 'Today, 09:42',
  },
  {
    id: 'root-documents',
    name: 'Documents',
    kind: 'folder',
    parentPath: '/',
    modifiedLabel: 'Yesterday',
  },
  {
    id: 'root-downloads',
    name: 'Downloads',
    kind: 'folder',
    parentPath: '/',
    modifiedLabel: 'Nov 19',
  },
  {
    id: 'root-manifest',
    name: 'system-manifest.json',
    kind: 'file',
    parentPath: '/',
    sizeLabel: '4.2 KB',
    modifiedLabel: 'Nov 14',
    extension: '.json',
  },
  {
    id: 'proj-refractor',
    name: 'Refractor',
    kind: 'folder',
    parentPath: '/Projects',
    modifiedLabel: 'Today, 10:15',
  },
  {
    id: 'proj-theme-json',
    name: 'optical-theme.json',
    kind: 'file',
    parentPath: '/Projects',
    sizeLabel: '18.4 KB',
    modifiedLabel: 'Today, 09:50',
    extension: '.json',
  },
  {
    id: 'proj-dialog-tsx',
    name: 'SystemFileDialog.tsx',
    kind: 'file',
    parentPath: '/Projects',
    sizeLabel: '24.6 KB',
    modifiedLabel: 'Today, 09:12',
    extension: '.tsx',
  },
  {
    id: 'proj-tokens-ts',
    name: 'prism-tokens.ts',
    kind: 'file',
    parentPath: '/Projects',
    sizeLabel: '9.1 KB',
    modifiedLabel: 'Yesterday',
    extension: '.ts',
  },
  {
    id: 'proj-caustic-png',
    name: 'caustic-preview.png',
    kind: 'file',
    parentPath: '/Projects',
    sizeLabel: '1.4 MB',
    modifiedLabel: 'Nov 20',
    extension: '.png',
  },
  {
    id: 'proj-mark-svg',
    name: 'refractor-mark.svg',
    kind: 'file',
    parentPath: '/Projects',
    sizeLabel: '12.8 KB',
    modifiedLabel: 'Nov 18',
    extension: '.svg',
  },
  {
    id: 'ref-create-theme',
    name: 'createPrismTheme.ts',
    kind: 'file',
    parentPath: '/Projects/Refractor',
    sizeLabel: '14.2 KB',
    modifiedLabel: 'Today, 10:15',
    extension: '.ts',
  },
  {
    id: 'ref-prism-card',
    name: 'PrismCard.tsx',
    kind: 'file',
    parentPath: '/Projects/Refractor',
    sizeLabel: '8.7 KB',
    modifiedLabel: 'Today, 08:40',
    extension: '.tsx',
  },
  {
    id: 'ref-presets-json',
    name: 'theme-presets.json',
    kind: 'file',
    parentPath: '/Projects/Refractor',
    sizeLabel: '6.3 KB',
    modifiedLabel: 'Yesterday',
    extension: '.json',
  },
  {
    id: 'ref-optics-svg',
    name: 'optics-diagram.svg',
    kind: 'file',
    parentPath: '/Projects/Refractor',
    sizeLabel: '42.1 KB',
    modifiedLabel: 'Nov 17',
    extension: '.svg',
  },
  {
    id: 'doc-spec-json',
    name: 'design-spec.json',
    kind: 'file',
    parentPath: '/Documents',
    sizeLabel: '31.0 KB',
    modifiedLabel: 'Yesterday',
    extension: '.json',
  },
  {
    id: 'doc-brand-png',
    name: 'brand-hero.png',
    kind: 'file',
    parentPath: '/Documents',
    sizeLabel: '3.2 MB',
    modifiedLabel: 'Nov 19',
    extension: '.png',
  },
  {
    id: 'doc-release-md',
    name: 'release-notes.md',
    kind: 'file',
    parentPath: '/Documents',
    sizeLabel: '7.5 KB',
    modifiedLabel: 'Nov 16',
    extension: '.md',
  },
  {
    id: 'dl-palette-json',
    name: 'alabaster-palette.json',
    kind: 'file',
    parentPath: '/Downloads',
    sizeLabel: '5.4 KB',
    modifiedLabel: 'Today, 07:30',
    extension: '.json',
  },
  {
    id: 'dl-wallpaper-png',
    name: 'glass-wallpaper.png',
    kind: 'file',
    parentPath: '/Downloads',
    sizeLabel: '4.8 MB',
    modifiedLabel: 'Nov 21',
    extension: '.png',
  },
  {
    id: 'dl-icons-svg',
    name: 'icon-pack.svg',
    kind: 'file',
    parentPath: '/Downloads',
    sizeLabel: '86.2 KB',
    modifiedLabel: 'Nov 15',
    extension: '.svg',
  },
];

const DEFAULT_INITIAL_PATH = '/Projects';
const DEFAULT_FILE_NAME = 'optical-theme.json';

function normalizeDirectoryPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }
  const normalizedSlashes = trimmed.split('\\').join('/');
  const rawSegments = normalizedSlashes.split('/');
  const safeSegments: string[] = [];
  for (const segment of rawSegments) {
    const clean = segment.trim();
    if (!clean || clean === '.') {
      continue;
    }
    if (clean === '..') {
      safeSegments.pop();
      continue;
    }
    safeSegments.push(clean);
  }
  return safeSegments.length === 0 ? '/' : `/${safeSegments.join('/')}`;
}

function getParentDirectoryPath(dirPath: string): string {
  const normalized = normalizeDirectoryPath(dirPath);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash <= 0 ? '/' : normalized.slice(0, lastSlash);
}

function joinDirectoryPath(dirPath: string, name: string): string {
  const normalized = normalizeDirectoryPath(dirPath);
  return normalized === '/' ? `/${name}` : `${normalized}/${name}`;
}

function getBreadcrumbSegments(dirPath: string): ReadonlyArray<BreadcrumbSegment> {
  const normalized = normalizeDirectoryPath(dirPath);
  const segments: BreadcrumbSegment[] = [{ label: 'System', path: '/' }];
  if (normalized === '/') {
    return segments;
  }
  const parts = normalized.slice(1).split('/');
  let acc = '';
  for (const part of parts) {
    acc = `${acc}/${part}`;
    segments.push({ label: part, path: acc });
  }
  return segments;
}

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

function isDotsOnly(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== '.') {
      return false;
    }
  }
  return value.length > 0;
}

function validateEntryName(
  rawName: string,
  kind: 'file' | 'folder'
): string | null {
  if (hasControlChars(rawName)) {
    return 'Name cannot contain control or null characters.';
  }
  const trimmed = rawName.trim();
  if (!trimmed) {
    return kind === 'folder'
      ? 'Folder name cannot be empty.'
      : 'File name cannot be empty.';
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return 'Path separators ("/" or "\\") are not allowed.';
  }
  if (trimmed.includes('..')) {
    return 'Path traversal ("..") is not allowed.';
  }
  if (isDotsOnly(trimmed)) {
    return 'Dots-only names ("." or "..") are not allowed.';
  }
  if (trimmed.endsWith('.')) {
    return 'Name cannot end with a trailing dot.';
  }
  return null;
}

function normalizeExtension(rawExt: string): string {
  const trimmed = rawExt.trim().toLowerCase();
  if (!trimmed || trimmed === '*' || trimmed === '.*') {
    return '*';
  }
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

function getNodeExtension(node: SystemFileNode): string {
  const explicit = node.extension?.trim();
  if (explicit) {
    return normalizeExtension(explicit);
  }
  const dotIdx = node.name.lastIndexOf('.');
  if (dotIdx > 0 && dotIdx < node.name.length - 1) {
    return node.name.slice(dotIdx).toLowerCase();
  }
  return '';
}

function matchesFormatFilter(
  node: SystemFileNode,
  filter: SystemFileFormatFilter
): boolean {
  if (node.kind === 'folder') {
    return true;
  }
  if (filter.extensions.length === 0) {
    return true;
  }
  const normalizedExts = filter.extensions.map(normalizeExtension);
  if (normalizedExts.includes('*')) {
    return true;
  }
  const ext = getNodeExtension(node);
  return normalizedExts.includes(ext);
}

function getPrimaryConcreteExtension(
  filter: SystemFileFormatFilter
): string | null {
  for (const rawExt of filter.extensions) {
    const normalized = normalizeExtension(rawExt);
    if (normalized !== '*') {
      return normalized;
    }
  }
  return null;
}

function applyFormatExtension(
  fileName: string,
  filter: SystemFileFormatFilter
): string {
  const trimmed = fileName.trim();
  const primaryExt = getPrimaryConcreteExtension(filter);
  if (!primaryExt) {
    return trimmed;
  }
  const dotIdx = trimmed.lastIndexOf('.');
  if (dotIdx > 0 && dotIdx < trimmed.length - 1) {
    return trimmed;
  }
  return `${trimmed}${primaryExt}`;
}

function renderPlaceIcon(
  icon: SystemFilePlace['icon'],
  className: string
): ReactNode {
  switch (icon) {
    case 'star':
      return <Star aria-hidden="true" className={className} />;
    case 'folder':
      return <Folder aria-hidden="true" className={className} />;
    case 'file':
      return <FileText aria-hidden="true" className={className} />;
    case 'download':
      return <Download aria-hidden="true" className={className} />;
    case 'hard-drive':
      return <HardDrive aria-hidden="true" className={className} />;
  }
}

function renderNodeIcon(node: SystemFileNode): ReactNode {
  if (node.kind === 'folder') {
    return (
      <Folder
        aria-hidden="true"
        className="w-4 h-4 shrink-0"
        style={STYLE_WARNING_MAIN}
      />
    );
  }
  const ext = getNodeExtension(node);
  if (ext === '.ts' || ext === '.tsx') {
    return (
      <FileCode2
        aria-hidden="true"
        className="w-4 h-4 shrink-0"
        style={STYLE_INFO_MAIN}
      />
    );
  }
  if (ext === '.png' || ext === '.svg') {
    return (
      <Image
        aria-hidden="true"
        className="w-4 h-4 shrink-0"
        style={STYLE_SUCCESS_MAIN}
      />
    );
  }
  if (ext === '.json') {
    return (
      <FileJson
        aria-hidden="true"
        className="w-4 h-4 shrink-0"
        style={STYLE_PRIMARY_MAIN}
      />
    );
  }
  return (
    <FileText
      aria-hidden="true"
      className="w-4 h-4 shrink-0"
      style={STYLE_TEXT_SECONDARY}
    />
  );
}

function SystemFileDialogInner({
  mode = 'inline',
  open = true,
  dialogKind,
  defaultDialogKind = 'open',
  allowKindSwitch = true,
  title,
  places,
  entries,
  defaultEntries,
  initialPath = DEFAULT_INITIAL_PATH,
  defaultFileName = DEFAULT_FILE_NAME,
  formats,
  allowMultiple = false,
  onConfirm,
  onCancel,
  onCreateFolder,
  disabled = false,
  'aria-label': ariaLabelProp,
  onClick,
  onKeyDown,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SystemFileDialogProps) {
  const instanceId = useId();
  const titleId = `${instanceId}-title`;
  const subtitleId = `${instanceId}-subtitle`;
  const fileNameInputId = `${instanceId}-filename`;
  const fileNameErrorId = `${instanceId}-filename-error`;
  const formatSelectId = `${instanceId}-format`;
  const searchInputId = `${instanceId}-search`;
  const newFolderInputId = `${instanceId}-new-folder`;
  const newFolderErrorId = `${instanceId}-new-folder-error`;

  const override = useComponentOverride('SystemFileDialog');

  const isKindControlled = dialogKind !== undefined;
  const [internalKind, setInternalKind] =
    useState<SystemFileDialogKind>(defaultDialogKind);
  const activeKind: SystemFileDialogKind = isKindControlled
    ? dialogKind
    : internalKind;
  const showKindSwitcher = allowKindSwitch && !isKindControlled;

  const isEntriesControlled = entries !== undefined;
  const [internalEntries, setInternalEntries] = useState<
    ReadonlyArray<SystemFileNode>
  >(() => defaultEntries ?? DEFAULT_FILE_DIALOG_ENTRIES);
  const activeEntries = isEntriesControlled ? entries : internalEntries;

  const activePlaces = places ?? DEFAULT_FILE_DIALOG_PLACES;
  const activeFormats =
    formats && formats.length > 0 ? formats : DEFAULT_FILE_DIALOG_FORMATS;
  const fallbackFormat = activeFormats[0] as SystemFileFormatFilter;

  const [selectedFormatId, setSelectedFormatId] = useState<string>(
    () => fallbackFormat.id
  );
  const activeFormat = useMemo<SystemFileFormatFilter>(
    () =>
      activeFormats.find((format) => format.id === selectedFormatId) ??
      fallbackFormat,
    [activeFormats, fallbackFormat, selectedFormatId]
  );

  const [history, setHistory] = useState<ReadonlyArray<string>>(() => [
    normalizeDirectoryPath(initialPath),
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const currentPath = history[historyIndex] as string;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<ReadonlyArray<string>>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fileNameInput, setFileNameInput] = useState<string>(defaultFileName);

  const [creatingFolder, setCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderError, setNewFolderError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const folderCounterRef = useRef<number>(1);
  const newFolderInputRef = useRef<HTMLInputElement | null>(null);

  const isMultiSelect = allowMultiple && activeKind === 'open';
  const canGoBack = historyIndex > 0;
  const canGoUp = currentPath !== '/';
  const breadcrumbs = useMemo(
    () => getBreadcrumbSegments(currentPath),
    [currentPath]
  );

  const currentDirectoryEntries = useMemo<ReadonlyArray<SystemFileNode>>(() => {
    const matched: SystemFileNode[] = [];
    for (const entry of activeEntries) {
      if (normalizeDirectoryPath(entry.parentPath) === currentPath) {
        matched.push(entry);
      }
    }
    return matched;
  }, [activeEntries, currentPath]);

  const visibleEntries = useMemo<ReadonlyArray<SystemFileNode>>(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered: SystemFileNode[] = [];
    for (const entry of currentDirectoryEntries) {
      if (!matchesFormatFilter(entry, activeFormat)) {
        continue;
      }
      if (query && !entry.name.toLowerCase().includes(query)) {
        continue;
      }
      filtered.push(entry);
    }
    filtered.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === 'folder' ? -1 : 1;
      }
      return compareNaturalStrings(a.name, b.name);
    });
    return filtered;
  }, [activeFormat, currentDirectoryEntries, searchQuery]);

  const visibleNodeMap = useMemo<Map<string, SystemFileNode>>(() => {
    const map = new Map<string, SystemFileNode>();
    for (const node of visibleEntries) {
      map.set(node.id, node);
    }
    return map;
  }, [visibleEntries]);

  const visibleSelectedIdSet = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    for (const id of selectedIds) {
      if (visibleNodeMap.has(id)) {
        set.add(id);
      }
    }
    return set;
  }, [selectedIds, visibleNodeMap]);

  const selectedFiles = useMemo<ReadonlyArray<SystemFileNode>>(() => {
    const files: SystemFileNode[] = [];
    for (const node of visibleEntries) {
      if (node.kind === 'file' && visibleSelectedIdSet.has(node.id)) {
        files.push(node);
      }
    }
    return files;
  }, [visibleEntries, visibleSelectedIdSet]);

  const resolvedActiveId =
    activeId !== null && visibleNodeMap.has(activeId) ? activeId : null;

  const fileNameError =
    activeKind === 'save' ? validateEntryName(fileNameInput, 'file') : null;
  const resolvedSaveFileName =
    activeKind === 'save' && fileNameError === null
      ? applyFormatExtension(fileNameInput, activeFormat)
      : '';
  const willAutoAppendExtension =
    activeKind === 'save' &&
    fileNameError === null &&
    resolvedSaveFileName !== fileNameInput.trim();
  const autoAppendedExt = willAutoAppendExtension
    ? getPrimaryConcreteExtension(activeFormat)
    : null;

  const canConfirm =
    !disabled &&
    (activeKind === 'open'
      ? selectedFiles.length > 0
      : fileNameError === null);

  const handleCancel = useCallback(
    (reason: 'escape' | 'backdrop' | 'button') => {
      if (disabled) {
        return;
      }
      setAnnouncement(
        reason === 'escape'
          ? 'Canceled file dialog via Escape.'
          : reason === 'backdrop'
            ? 'Canceled file dialog via backdrop.'
            : 'Canceled file dialog.'
      );
      onCancel?.();
    },
    [disabled, onCancel]
  );

  // Window Escape listener in modal mode with guaranteed cleanup
  useEffect(() => {
    if (mode !== 'modal' || !open || disabled) {
      return undefined;
    }

    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel('escape');
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [disabled, handleCancel, mode, open]);

  useEffect(() => {
    if (creatingFolder && !disabled) {
      newFolderInputRef.current?.focus();
    }
  }, [creatingFolder, disabled]);

  const navigateTo = useCallback(
    (targetPath: string) => {
      const normalized = normalizeDirectoryPath(targetPath);
      if (normalized === currentPath) {
        return;
      }
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), normalized]);
      setHistoryIndex((prev) => prev + 1);
      setSelectedIds([]);
      setActiveId(null);
      setCreatingFolder(false);
      setNewFolderName('');
      setNewFolderError(null);
      setAnnouncement(`Navigated to ${normalized}.`);
    },
    [currentPath, historyIndex]
  );

  const handleGoBack = useCallback(() => {
    const nextIndex = historyIndex - 1;
    const targetPath = history[nextIndex] as string;
    setHistoryIndex(nextIndex);
    setSelectedIds([]);
    setActiveId(null);
    setCreatingFolder(false);
    setNewFolderName('');
    setNewFolderError(null);
    setAnnouncement(`Navigated back to ${targetPath}.`);
  }, [history, historyIndex]);

  const handleGoUp = useCallback(() => {
    navigateTo(getParentDirectoryPath(currentPath));
  }, [currentPath, navigateTo]);

  const handleSwitchKind = useCallback(
    (nextKind: SystemFileDialogKind) => {
      if (nextKind === activeKind) {
        return;
      }
      setInternalKind(nextKind);
      if (nextKind === 'save') {
        const firstSelectedFile = selectedFiles[0];
        if (firstSelectedFile) {
          setFileNameInput(firstSelectedFile.name);
          setSelectedIds([firstSelectedFile.id]);
        }
      }
      setAnnouncement(
        nextKind === 'save'
          ? 'Switched to Save As mode.'
          : 'Switched to Open File mode.'
      );
    },
    [activeKind, selectedFiles]
  );

  const confirmOpenFiles = useCallback(
    (files: ReadonlyArray<SystemFileNode>) => {
      const primaryFile = files[0] as SystemFileNode;
      const fullPath = joinDirectoryPath(currentPath, primaryFile.name);
      const result: SystemFileDialogResult = {
        dialogKind: 'open',
        directoryPath: currentPath,
        fileName: primaryFile.name,
        fullPath,
        formatId: activeFormat.id,
        selectedIds: files.map((file) => file.id),
      };
      setAnnouncement(
        files.length > 1
          ? `Opened ${files.length} files in ${currentPath}.`
          : `Opened ${fullPath}.`
      );
      onConfirm?.(result);
    },
    [activeFormat.id, currentPath, onConfirm]
  );

  const confirmSaveFile = useCallback(
    (rawName: string) => {
      const error = validateEntryName(rawName, 'file');
      if (error !== null) {
        return;
      }
      const resolvedName = applyFormatExtension(rawName, activeFormat);
      const fullPath = joinDirectoryPath(currentPath, resolvedName);
      const matchingEntry = currentDirectoryEntries.find(
        (entry) =>
          entry.kind === 'file' &&
          entry.name.toLowerCase() === resolvedName.toLowerCase()
      );
      setFileNameInput(resolvedName);
      const result: SystemFileDialogResult = {
        dialogKind: 'save',
        directoryPath: currentPath,
        fileName: resolvedName,
        fullPath,
        formatId: activeFormat.id,
        selectedIds: matchingEntry ? [matchingEntry.id] : [],
      };
      setAnnouncement(`Saved ${fullPath}.`);
      onConfirm?.(result);
    },
    [activeFormat, currentDirectoryEntries, currentPath, onConfirm]
  );

  const handleConfirmClick = useCallback(() => {
    if (activeKind === 'open') {
      confirmOpenFiles(selectedFiles);
      return;
    }
    confirmSaveFile(fileNameInput);
  }, [
    activeKind,
    confirmOpenFiles,
    confirmSaveFile,
    fileNameInput,
    selectedFiles,
  ]);

  const toggleMultiFileSelection = useCallback(
    (node: SystemFileNode) => {
      const next = new Set<string>();
      for (const id of selectedIds) {
        const existing = visibleNodeMap.get(id);
        if (existing && existing.kind === 'file') {
          next.add(id);
        }
      }
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      const orderedIds: string[] = [];
      for (const entry of visibleEntries) {
        if (next.has(entry.id)) {
          orderedIds.push(entry.id);
        }
      }
      setSelectedIds(orderedIds);
    },
    [selectedIds, visibleEntries, visibleNodeMap]
  );

  const handleRowClick = useCallback(
    (node: SystemFileNode, event: ReactMouseEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      setActiveId(node.id);
      if (node.kind === 'folder') {
        setSelectedIds([node.id]);
        return;
      }
      if (isMultiSelect && (event.ctrlKey || event.metaKey)) {
        toggleMultiFileSelection(node);
        return;
      }
      if (isMultiSelect && event.shiftKey && resolvedActiveId !== null) {
        const anchorIndex = visibleEntries.findIndex(
          (item) => item.id === resolvedActiveId
        );
        const targetIndex = visibleEntries.findIndex(
          (item) => item.id === node.id
        );
        if (anchorIndex !== -1 && targetIndex !== -1) {
          const start = Math.min(anchorIndex, targetIndex);
          const end = Math.max(anchorIndex, targetIndex);
          const rangeIds: string[] = [];
          for (let i = start; i <= end; i += 1) {
            const candidate = visibleEntries[i];
            if (candidate && candidate.kind === 'file') {
              rangeIds.push(candidate.id);
            }
          }
          setSelectedIds(rangeIds);
          return;
        }
      }
      setSelectedIds([node.id]);
      if (activeKind === 'save') {
        setFileNameInput(node.name);
      }
    },
    [
      activeKind,
      disabled,
      isMultiSelect,
      resolvedActiveId,
      toggleMultiFileSelection,
      visibleEntries,
    ]
  );

  const handleRowDoubleClick = useCallback(
    (node: SystemFileNode) => {
      if (disabled) {
        return;
      }
      if (node.kind === 'folder') {
        navigateTo(joinDirectoryPath(currentPath, node.name));
        return;
      }
      if (activeKind === 'open') {
        setActiveId(node.id);
        setSelectedIds([node.id]);
        confirmOpenFiles([node]);
        return;
      }
      setActiveId(node.id);
      setSelectedIds([node.id]);
      setFileNameInput(node.name);
    },
    [activeKind, confirmOpenFiles, currentPath, disabled, navigateTo]
  );

  const handleListboxKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }
      if (visibleEntries.length === 0) {
        return;
      }

      const currentIndex =
        resolvedActiveId !== null
          ? visibleEntries.findIndex((item) => item.id === resolvedActiveId)
          : -1;

      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        event.preventDefault();
        let nextIndex = 0;
        if (event.key === 'ArrowDown') {
          nextIndex =
            currentIndex < 0
              ? 0
              : Math.min(visibleEntries.length - 1, currentIndex + 1);
        } else if (event.key === 'ArrowUp') {
          nextIndex =
            currentIndex < 0
              ? visibleEntries.length - 1
              : Math.max(0, currentIndex - 1);
        } else if (event.key === 'End') {
          nextIndex = visibleEntries.length - 1;
        }

        const nextNode = visibleEntries[nextIndex] as SystemFileNode;
        setActiveId(nextNode.id);
        if (!isMultiSelect) {
          setSelectedIds([nextNode.id]);
        }
        if (nextNode.kind === 'file' && activeKind === 'save') {
          setFileNameInput(nextNode.name);
        }
        return;
      }

      const activeNode =
        currentIndex >= 0 ? visibleEntries[currentIndex] : undefined;
      if (!activeNode) {
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        if (activeNode.kind === 'file') {
          if (isMultiSelect) {
            toggleMultiFileSelection(activeNode);
          } else {
            setSelectedIds([activeNode.id]);
            if (activeKind === 'save') {
              setFileNameInput(activeNode.name);
            }
          }
        }
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (activeNode.kind === 'folder') {
          navigateTo(joinDirectoryPath(currentPath, activeNode.name));
          return;
        }
        if (activeKind === 'open') {
          const filesToOpen = visibleSelectedIdSet.has(activeNode.id)
            ? selectedFiles
            : [activeNode];
          confirmOpenFiles(filesToOpen);
          return;
        }
        confirmSaveFile(activeNode.name);
      }
    },
    [
      activeKind,
      confirmOpenFiles,
      confirmSaveFile,
      currentPath,
      disabled,
      isMultiSelect,
      navigateTo,
      resolvedActiveId,
      selectedFiles,
      toggleMultiFileSelection,
      visibleEntries,
      visibleSelectedIdSet,
    ]
  );

  const handleFileNameChange = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      setFileNameInput(event.target.value);
    },
    []
  );

  const handleFileNameKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmSaveFile(fileNameInput);
      }
    },
    [confirmSaveFile, disabled, fileNameInput]
  );

  const handleFormatChange = useCallback(
    (event: ReactChangeEvent<HTMLSelectElement>) => {
      const nextFormatId = event.target.value;
      setSelectedFormatId(nextFormatId);
      const nextFormat = activeFormats.find((f) => f.id === nextFormatId);
      if (nextFormat) {
        setAnnouncement(`Filtered files by ${nextFormat.label}.`);
      }
    },
    [activeFormats]
  );

  const handleToggleCreateFolder = useCallback(() => {
    setCreatingFolder((prev) => {
      const next = !prev;
      setNewFolderName('');
      setNewFolderError(null);
      return next;
    });
  }, []);

  const handleCreateFolderSubmit = useCallback(() => {
    const baseError = validateEntryName(newFolderName, 'folder');
    if (baseError !== null) {
      setNewFolderError(baseError);
      return;
    }
    const trimmed = newFolderName.trim();
    const isDuplicate = currentDirectoryEntries.some(
      (entry) => entry.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setNewFolderError(
        `A folder or file named "${trimmed}" already exists here.`
      );
      return;
    }

    const folderPath = joinDirectoryPath(currentPath, trimmed);
    if (!isEntriesControlled) {
      const createdNode: SystemFileNode = {
        id: `created-folder-${folderCounterRef.current}`,
        name: trimmed,
        kind: 'folder',
        parentPath: currentPath,
        modifiedLabel: 'Just now',
      };
      folderCounterRef.current += 1;
      setInternalEntries((prev) => [...prev, createdNode]);
      setActiveId(createdNode.id);
      setSelectedIds([createdNode.id]);
    }
    setCreatingFolder(false);
    setNewFolderName('');
    setNewFolderError(null);
    setAnnouncement(`Created folder ${folderPath}.`);
    onCreateFolder?.(folderPath);
  }, [
    currentDirectoryEntries,
    currentPath,
    isEntriesControlled,
    newFolderName,
    onCreateFolder,
  ]);

  const handleNewFolderKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        handleCreateFolderSubmit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setCreatingFolder(false);
        setNewFolderName('');
        setNewFolderError(null);
      }
    },
    [disabled, handleCreateFolderSubmit]
  );

  const handleModalRootKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleCancel('escape');
      }
    },
    [disabled, handleCancel]
  );

  const composedModalKeyDown = composeEventHandlers<
    ReactKeyboardEvent<HTMLDivElement>
  >(onKeyDown, handleModalRootKeyDown);

  const composedBackdropClick = composeEventHandlers<
    ReactMouseEvent<HTMLDivElement>
  >(onClick, () => {
    handleCancel('backdrop');
  });

  if (mode === 'modal' && !open) {
    return null;
  }

  const resolvedTitle =
    title?.trim() || (activeKind === 'save' ? 'Save As' : 'Open File');
  const trimmedAriaLabel = ariaLabelProp?.trim() || undefined;

  const merged = mergeProps({
    themeTarget: themeProps('system-file-dialog', {
      mode,
      open,
      kind: activeKind,
      allowMultiple: isMultiSelect,
      disabled,
    }),
    baseClassName:
      mode === 'modal'
        ? 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 min-w-0'
        : cx(
            'prism-slab relative w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-3.5 overflow-hidden',
            disabled ? 'opacity-70' : ''
          ),
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle:
      mode === 'modal'
        ? {
            backgroundColor:
              'color-mix(in srgb, var(--prism-bg-end) 68%, transparent)',
            backdropFilter: 'blur(var(--prism-blur-px))',
          }
        : {
            color: 'var(--prism-text-primary)',
          },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const panelClass = stableClassName('system-file-dialog', 'panel');
  const headerClass = stableClassName('system-file-dialog', 'header');
  const toolbarClass = stableClassName('system-file-dialog', 'toolbar');
  const bodyClass = stableClassName('system-file-dialog', 'body');
  const sidebarClass = stableClassName('system-file-dialog', 'sidebar');
  const browserClass = stableClassName('system-file-dialog', 'browser');
  const footerClass = stableClassName('system-file-dialog', 'footer');
  const statusClass = stableClassName('system-file-dialog', 'status');

  const itemCountLabel = `${visibleEntries.length} ${
    visibleEntries.length === 1 ? 'item' : 'items'
  }`;
  const defaultStatusText = `${currentPath} · ${itemCountLabel}`;
  const liveStatusText = announcement ?? defaultStatusText;

  const selectedOpenPreview =
    selectedFiles.length === 0
      ? 'Select a file to open'
      : selectedFiles.length === 1
        ? (selectedFiles[0] as SystemFileNode).name
        : `${selectedFiles.length} files selected: ${selectedFiles
            .map((file) => file.name)
            .join(', ')}`;

  const dialogContent = (
    <>
      {/* Window Header */}
      <header
        data-part="header"
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full pb-2.5 border-b'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-crystal w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{
              color: 'var(--prism-primary-main)',
              boxShadow:
                '0 0 14px -4px color-mix(in srgb, var(--prism-primary-main) 42%, transparent)',
            }}
          >
            {activeKind === 'save' ? (
              <Save aria-hidden="true" className="w-4 h-4" />
            ) : (
              <FolderOpen aria-hidden="true" className="w-4 h-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-sm sm:text-base font-semibold tracking-[-0.01em] truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {resolvedTitle}
            </h2>
            <p
              id={subtitleId}
              className="text-[11px] font-mono truncate"
              style={STYLE_TEXT_SECONDARY}
            >
              {currentPath} · {itemCountLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showKindSwitcher ? (
            <div
              role="group"
              aria-label="Dialog mode"
              data-testid="system-file-dialog-kind-switcher"
              className="prism-well p-0.5 rounded-full inline-flex items-center gap-0.5"
            >
              <button
                type="button"
                disabled={disabled}
                aria-pressed={activeKind === 'open'}
                data-testid="system-file-dialog-kind-open"
                onClick={() => handleSwitchKind('open')}
                className={cx(
                  'prism-focus-ring h-7 px-3 rounded-full text-xs font-semibold transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                  activeKind === 'open' ? 'prism-crystal' : ''
                )}
                style={{
                  color:
                    activeKind === 'open'
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                }}
              >
                Open
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={activeKind === 'save'}
                data-testid="system-file-dialog-kind-save"
                onClick={() => handleSwitchKind('save')}
                className={cx(
                  'prism-focus-ring h-7 px-3 rounded-full text-xs font-semibold transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                  activeKind === 'save' ? 'prism-crystal' : ''
                )}
                style={{
                  color:
                    activeKind === 'save'
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                }}
              >
                Save
              </button>
            </div>
          ) : null}

          <button
            type="button"
            disabled={disabled}
            aria-label="Close file dialog"
            data-testid="system-file-dialog-close"
            onClick={() => handleCancel('button')}
            className="prism-crystal prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-opacity"
            style={STYLE_TEXT_SECONDARY}
          >
            <X aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Navigation Toolbar */}
      <div
        data-part="toolbar"
        className={cx(
          toolbarClass,
          'flex flex-wrap items-center gap-2 min-w-0 max-w-full'
        )}
      >
        <div className="inline-flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={disabled || !canGoBack}
            aria-label="Go back"
            data-testid="system-file-dialog-back"
            onClick={handleGoBack}
            className="prism-crystal prism-focus-ring w-8 h-8 rounded-xl inline-flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={STYLE_TEXT_PRIMARY}
          >
            <ArrowLeft aria-hidden="true" className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={disabled || !canGoUp}
            aria-label="Go to parent directory"
            data-testid="system-file-dialog-up"
            onClick={handleGoUp}
            className="prism-crystal prism-focus-ring w-8 h-8 rounded-xl inline-flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={STYLE_TEXT_PRIMARY}
          >
            <ArrowUp aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        {/* Clickable Breadcrumb Path Bar */}
        <nav
          aria-label="Current directory path"
          data-testid="system-file-dialog-breadcrumbs"
          className="prism-well flex-1 min-w-[10rem] h-8 px-2.5 rounded-xl flex items-center gap-1 overflow-x-auto"
        >
          {breadcrumbs.map((crumb, index) => {
            const isCurrent = crumb.path === currentPath;
            return (
              <div
                key={crumb.path}
                className="inline-flex items-center gap-1 shrink-0"
              >
                {index > 0 ? (
                  <ChevronRight
                    aria-hidden="true"
                    className="w-3 h-3 shrink-0"
                    style={STYLE_TEXT_SECONDARY}
                  />
                ) : null}
                <button
                  type="button"
                  disabled={disabled}
                  aria-current={isCurrent ? 'location' : undefined}
                  data-testid={`system-file-dialog-crumb-${crumb.path}`}
                  onClick={() => navigateTo(crumb.path)}
                  className="prism-focus-ring px-1.5 py-0.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                  style={{
                    color: isCurrent
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-secondary)',
                    fontWeight: isCurrent ? 600 : 500,
                  }}
                >
                  {crumb.label}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Inline Linear-Time Search Input */}
        <div className="prism-well h-8 px-2.5 rounded-xl inline-flex items-center gap-1.5 min-w-[9rem] flex-1 sm:flex-initial sm:w-44">
          <Search
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0"
            style={STYLE_TEXT_SECONDARY}
          />
          <input
            id={searchInputId}
            type="text"
            value={searchQuery}
            disabled={disabled}
            aria-label="Filter files"
            placeholder="Filter..."
            data-testid="system-file-dialog-search"
            onChange={(event) => setSearchQuery(event.target.value)}
            className="prism-focus-ring w-full min-w-0 bg-transparent text-xs outline-none disabled:cursor-not-allowed"
            style={STYLE_TEXT_PRIMARY}
          />
          {searchQuery ? (
            <button
              type="button"
              disabled={disabled}
              aria-label="Clear search filter"
              data-testid="system-file-dialog-search-clear"
              onClick={() => setSearchQuery('')}
              className="prism-focus-ring rounded-full p-0.5 inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
              style={STYLE_TEXT_SECONDARY}
            >
              <X aria-hidden="true" className="w-3 h-3" />
            </button>
          ) : null}
        </div>

        {/* New Folder Toggle Button */}
        <button
          type="button"
          disabled={disabled}
          aria-expanded={creatingFolder}
          data-testid="system-file-dialog-new-folder-btn"
          onClick={handleToggleCreateFolder}
          className="prism-crystal prism-focus-ring h-8 px-2.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-opacity"
          style={STYLE_TEXT_PRIMARY}
        >
          <FolderPlus
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0"
            style={STYLE_PRIMARY_MAIN}
          />
          <span>New Folder</span>
        </button>
      </div>

      {/* Inline New Folder Creation Form */}
      {creatingFolder ? (
        <div
          data-testid="system-file-dialog-new-folder-form"
          className="prism-well rounded-2xl p-2.5 flex flex-col gap-2 min-w-0"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: newFolderError
              ? 'var(--prism-error-main)'
              : 'var(--prism-well-border)',
          }}
        >
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <FolderPlus
              aria-hidden="true"
              className="w-4 h-4 shrink-0"
              style={STYLE_WARNING_MAIN}
            />
            <input
              ref={newFolderInputRef}
              id={newFolderInputId}
              type="text"
              value={newFolderName}
              disabled={disabled}
              aria-label="New folder name"
              aria-invalid={newFolderError ? 'true' : undefined}
              aria-describedby={newFolderError ? newFolderErrorId : undefined}
              placeholder="New folder name..."
              data-testid="system-file-dialog-new-folder-input"
              onChange={(event) => {
                setNewFolderName(event.target.value);
                if (newFolderError) {
                  setNewFolderError(null);
                }
              }}
              onKeyDown={handleNewFolderKeyDown}
              className="prism-focus-ring flex-1 min-w-[8rem] h-8 px-2.5 rounded-lg bg-transparent text-xs outline-none disabled:cursor-not-allowed"
              style={{
                color: 'var(--prism-text-primary)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--prism-divider)',
              }}
            />
            <button
              type="button"
              disabled={disabled}
              data-testid="system-file-dialog-new-folder-create"
              onClick={handleCreateFolderSubmit}
              className="prism-btn-primary prism-focus-ring h-8 px-3 inline-flex items-center justify-center text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">Create</span>
            </button>
            <button
              type="button"
              disabled={disabled}
              data-testid="system-file-dialog-new-folder-cancel"
              onClick={handleToggleCreateFolder}
              className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center justify-center text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">Dismiss</span>
            </button>
          </div>
          {newFolderError ? (
            <p
              id={newFolderErrorId}
              role="alert"
              data-testid="system-file-dialog-new-folder-error"
              className="flex items-center gap-1.5 text-[11px] font-medium"
              style={STYLE_ERROR_MAIN}
            >
              <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>{newFolderError}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Two-Pane Body */}
      <div
        data-part="body"
        className={cx(
          bodyClass,
          'flex flex-col sm:flex-row gap-3 min-w-0 max-w-full'
        )}
      >
        {/* Left Places Sidebar */}
        <nav
          aria-label="Places"
          data-part="sidebar"
          data-testid="system-file-dialog-places"
          className={cx(
            sidebarClass,
            'prism-well w-full sm:w-44 shrink-0 rounded-2xl p-2 flex flex-row sm:flex-col gap-1 overflow-x-auto'
          )}
        >
          {activePlaces.map((place) => {
            const placePath = normalizeDirectoryPath(place.path);
            const isActive = placePath === currentPath;
            return (
              <button
                key={place.id}
                type="button"
                disabled={disabled}
                aria-current={isActive ? 'location' : undefined}
                data-testid={`system-file-dialog-place-${place.id}`}
                onClick={() => navigateTo(placePath)}
                className={cx(
                  'prism-focus-ring flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap sm:w-full text-left transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                  isActive ? 'prism-crystal font-semibold' : ''
                )}
                style={{
                  color: isActive
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: isActive
                    ? 'color-mix(in srgb, var(--prism-primary-main) 42%, transparent)'
                    : 'transparent',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: isActive
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {renderPlaceIcon(place.icon, 'w-3.5 h-3.5 shrink-0')}
                </span>
                <span className="truncate">{place.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Directory Browser */}
        <div
          data-part="browser"
          className={cx(
            browserClass,
            'prism-well flex-1 min-w-0 rounded-2xl overflow-hidden flex flex-col'
          )}
        >
          {/* Column Header */}
          <div
            aria-hidden="true"
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-mono uppercase tracking-wider border-b min-w-0"
            style={{
              color: 'var(--prism-text-secondary)',
              borderColor: 'var(--prism-divider)',
            }}
          >
            <span className="flex-1 min-w-0 truncate">Name</span>
            <span className="hidden sm:inline-block w-24 text-right shrink-0">
              Modified
            </span>
            <span className="w-16 text-right shrink-0">Size</span>
          </div>

          {/* Listbox */}
          <div
            role="listbox"
            aria-label="Directory contents"
            aria-multiselectable={isMultiSelect}
            aria-activedescendant={
              resolvedActiveId
                ? `${instanceId}-opt-${resolvedActiveId}`
                : undefined
            }
            aria-disabled={disabled ? 'true' : undefined}
            tabIndex={disabled ? -1 : 0}
            data-testid="system-file-dialog-listbox"
            onKeyDown={handleListboxKeyDown}
            className="prism-focus-ring flex-1 min-h-[12rem] max-h-[16rem] overflow-y-auto p-1.5 flex flex-col gap-0.5 min-w-0"
          >
            {visibleEntries.length === 0 ? (
              <div
                data-testid="system-file-dialog-empty"
                className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center gap-1.5"
              >
                <FolderOpen
                  aria-hidden="true"
                  className="w-6 h-6"
                  style={STYLE_TEXT_SECONDARY}
                />
                <p
                  className="text-xs font-medium"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {searchQuery.trim()
                    ? 'No items match the current search or format filter.'
                    : 'This folder is empty.'}
                </p>
              </div>
            ) : (
              visibleEntries.map((node) => {
                const isSelected = visibleSelectedIdSet.has(node.id);
                const isActive = resolvedActiveId === node.id;
                const optionId = `${instanceId}-opt-${node.id}`;

                return (
                  <div
                    key={node.id}
                    id={optionId}
                    role="option"
                    aria-selected={isSelected}
                    data-kind={node.kind}
                    data-active={isActive ? 'true' : undefined}
                    data-testid={`system-file-dialog-row-${node.id}`}
                    onClick={(event) => handleRowClick(node, event)}
                    onDoubleClick={() => handleRowDoubleClick(node)}
                    className={cx(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs min-w-0 select-none transition-colors',
                      disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                      isSelected ? 'prism-crystal' : ''
                    )}
                    style={{
                      color: 'var(--prism-text-primary)',
                      backgroundColor:
                        !isSelected && isActive
                          ? 'color-mix(in srgb, var(--prism-primary-main) 10%, transparent)'
                          : undefined,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: isSelected
                        ? 'color-mix(in srgb, var(--prism-primary-main) 48%, transparent)'
                        : isActive
                          ? 'color-mix(in srgb, var(--prism-secondary-main) 45%, transparent)'
                          : 'transparent',
                    }}
                  >
                    {isMultiSelect && node.kind === 'file' ? (
                      <span
                        aria-hidden="true"
                        data-testid={`system-file-dialog-check-${node.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (disabled) {
                            return;
                          }
                          setActiveId(node.id);
                          toggleMultiFileSelection(node);
                        }}
                        className="w-4 h-4 rounded inline-flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--prism-primary-main)'
                            : 'transparent',
                          color: isSelected
                            ? 'var(--prism-primary-contrast)'
                            : 'transparent',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: isSelected
                            ? 'var(--prism-primary-main)'
                            : 'var(--prism-well-border)',
                        }}
                      >
                        <Check className="w-3 h-3 stroke-[2.75]" />
                      </span>
                    ) : null}

                    {renderNodeIcon(node)}

                    <span className="flex-1 min-w-0 truncate font-medium">
                      {node.name}
                    </span>

                    <span
                      className="hidden sm:inline-block w-24 text-right font-mono text-[11px] tabular-nums truncate shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {node.modifiedLabel ?? '—'}
                    </span>

                    <span
                      className="w-16 text-right font-mono text-[11px] tabular-nums whitespace-nowrap shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {node.kind === 'folder' ? 'Folder' : (node.sizeLabel ?? '—')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer Action Strip */}
      <footer
        data-part="footer"
        className={cx(
          footerClass,
          'pt-3 border-t flex flex-col gap-3 min-w-0 max-w-full'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="flex flex-col sm:flex-row sm:items-end gap-2.5 min-w-0">
          {activeKind === 'save' ? (
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={fileNameInputId}
                  className="text-[11px] font-semibold"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Save As
                </label>
                {autoAppendedExt ? (
                  <span
                    data-testid="system-file-dialog-auto-ext"
                    className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold whitespace-nowrap"
                    style={STYLE_PRIMARY_MAIN}
                  >
                    Auto {autoAppendedExt}
                  </span>
                ) : null}
              </div>
              <input
                id={fileNameInputId}
                type="text"
                value={fileNameInput}
                disabled={disabled}
                aria-invalid={fileNameError ? 'true' : undefined}
                aria-describedby={fileNameError ? fileNameErrorId : undefined}
                placeholder="Enter file name..."
                data-testid="system-file-dialog-filename-input"
                onChange={handleFileNameChange}
                onKeyDown={handleFileNameKeyDown}
                className="prism-well prism-focus-ring w-full h-9 px-3 rounded-xl text-xs font-mono outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--prism-text-primary)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: fileNameError
                    ? 'var(--prism-error-main)'
                    : 'var(--prism-well-border)',
                }}
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <span
                className="text-[11px] font-semibold"
                style={STYLE_TEXT_SECONDARY}
              >
                Selected File
              </span>
              <div
                data-testid="system-file-dialog-selected-preview"
                className="prism-well h-9 px-3 rounded-xl flex items-center min-w-0 text-xs font-mono"
                style={{
                  color:
                    selectedFiles.length > 0
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-secondary)',
                }}
              >
                <span className="truncate">{selectedOpenPreview}</span>
              </div>
            </div>
          )}

          {/* File Format Filter Dropdown */}
          <div className="w-full sm:w-52 shrink-0 flex flex-col gap-1">
            <label
              htmlFor={formatSelectId}
              className="text-[11px] font-semibold"
              style={STYLE_TEXT_SECONDARY}
            >
              File Format
            </label>
            <select
              id={formatSelectId}
              value={activeFormat.id}
              disabled={disabled}
              aria-label="File format filter"
              data-testid="system-file-dialog-format-select"
              onChange={handleFormatChange}
              className="prism-well prism-focus-ring w-full h-9 px-3 rounded-xl text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                color: 'var(--prism-text-primary)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--prism-well-border)',
              }}
            >
              {activeFormats.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filename Validation Error Alert */}
        {fileNameError ? (
          <p
            id={fileNameErrorId}
            role="alert"
            data-testid="system-file-dialog-filename-error"
            className="flex items-center gap-1.5 text-xs font-medium"
            style={STYLE_ERROR_MAIN}
          >
            <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span>{fileNameError}</span>
          </p>
        ) : null}

        {/* Status Banner + Cancel / Confirm Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div
            className="prism-well rounded-xl px-3 py-1.5 flex items-center gap-2 text-[11px] min-w-0 flex-1"
            style={STYLE_TEXT_SECONDARY}
          >
            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              data-testid="system-file-dialog-status"
              className={cx(statusClass, 'truncate min-w-0 flex-1')}
            >
              {liveStatusText}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={disabled}
              data-testid="system-file-dialog-cancel"
              onClick={() => handleCancel('button')}
              className="prism-btn-secondary prism-focus-ring h-9 px-4 inline-flex items-center justify-center text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">Cancel</span>
            </button>

            <button
              type="button"
              disabled={!canConfirm}
              data-testid="system-file-dialog-confirm"
              onClick={handleConfirmClick}
              className="prism-btn-primary prism-focus-ring h-9 px-5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">
                {activeKind === 'save' ? 'Save' : 'Open'}
              </span>
            </button>
          </div>
        </div>
      </footer>
    </>
  );

  if (mode === 'modal') {
    return (
      <div
        ref={ref}
        data-part="backdrop"
        data-testid="system-file-dialog-backdrop"
        {...rest}
        {...merged}
        onClick={composedBackdropClick}
        onKeyDown={composedModalKeyDown}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={trimmedAriaLabel}
          aria-labelledby={trimmedAriaLabel ? undefined : titleId}
          aria-describedby={subtitleId}
          aria-disabled={disabled ? 'true' : undefined}
          data-part="panel"
          data-testid="system-file-dialog-panel"
          onClick={(event) => event.stopPropagation()}
          className={cx(
            panelClass,
            'prism-slab relative w-full max-w-4xl min-w-0 p-4 sm:p-5 flex flex-col gap-3.5 overflow-hidden',
            disabled ? 'opacity-70' : ''
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          {dialogContent}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label={trimmedAriaLabel}
      aria-labelledby={trimmedAriaLabel ? undefined : titleId}
      aria-describedby={subtitleId}
      aria-disabled={disabled ? 'true' : undefined}
      {...rest}
      {...merged}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {dialogContent}
    </div>
  );
}

export const SystemFileDialog = memo(SystemFileDialogInner);
SystemFileDialog.displayName = 'SystemFileDialog';
