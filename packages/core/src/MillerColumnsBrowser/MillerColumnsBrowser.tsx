'use client';

import {
  memo,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  ChevronRight,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  FolderTree,
  Inbox,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type MillerNodeKind = 'folder' | 'code' | 'image' | 'document' | 'audio';

export interface MillerFileNode {
  /** Unique identifier for the folder or file node within its parent column. */
  id: string;
  /** Visible file or directory name rendered safely as literal text. */
  name: string;
  /** Semantic file kind controlling icon, badge styling, and preview presentation. */
  kind: MillerNodeKind;
  /** Optional formatted file size label (e.g., `'4.8 KB'`). */
  sizeLabel?: string;
  /** Optional human-readable last-modified timestamp (e.g., `'Today, 14:18'`). */
  modifiedAt?: string;
  /** Optional preview text shown in the right-hand File Preview Pane (rendered safely as literal text). */
  previewText?: string;
  /** Nested child nodes displayed in the adjacent column when a folder node is selected. */
  children?: ReadonlyArray<MillerFileNode>;
}

export interface MillerColumnsBrowserProps extends BaseProps<HTMLDivElement> {
  /** Hierarchical root entries; defaults to a 3-level project filesystem tree when omitted. Pass `[]` for an empty state. */
  roots?: ReadonlyArray<MillerFileNode>;
  /** Initial uncontrolled selection trail of node IDs from root to target folder or file. */
  defaultSelectedPath?: ReadonlyArray<string>;
  /** Callback invoked with the newly selected node and resolved path of node IDs. */
  onSelectNode?: (node: MillerFileNode, pathIds: string[]) => void;
  /** Visible explorer panel title linked to the region via `aria-labelledby`. Defaults to `'Miller Columns Explorer'`. */
  title?: string;
}

interface MillerKindDescriptor {
  label: string;
  badge: string;
  colorToken: string;
}

interface ResolvedColumnItem {
  key: string;
  node: MillerFileNode;
}

interface ResolvedColumn {
  key: string;
  depth: number;
  label: string;
  items: ReadonlyArray<ResolvedColumnItem>;
  selectedId: string | null;
}

interface ResolvedCrumb {
  key: string;
  depth: number;
  node: MillerFileNode;
}

interface ResolvedBrowserState {
  columns: ReadonlyArray<ResolvedColumn>;
  crumbs: ReadonlyArray<ResolvedCrumb>;
  selectedPathIds: string[];
  activeFile: MillerFileNode | null;
  depthCapped: boolean;
}

interface PendingFocusTarget {
  colIndex: number;
  itemIndex: number;
}

const DEFAULT_TITLE = 'Miller Columns Explorer';
const MAX_DEPTH = 10;

const KIND_META: Readonly<Record<MillerNodeKind, MillerKindDescriptor>> = {
  folder: {
    label: 'Folder',
    badge: 'folder',
    colorToken: 'var(--prism-warning-main)',
  },
  code: {
    label: 'Source Code',
    badge: 'code',
    colorToken: 'var(--prism-info-main)',
  },
  image: {
    label: 'Image Asset',
    badge: 'image',
    colorToken: 'var(--prism-success-main)',
  },
  document: {
    label: 'Document',
    badge: 'document',
    colorToken: 'var(--prism-secondary-dark)',
  },
  audio: {
    label: 'Audio Track',
    badge: 'audio',
    colorToken: 'var(--prism-primary-main)',
  },
};

const DEFAULT_ROOTS: ReadonlyArray<MillerFileNode> = [
  {
    id: 'packages',
    name: 'packages',
    kind: 'folder',
    modifiedAt: 'Today, 14:20',
    children: [
      {
        id: 'core',
        name: 'core',
        kind: 'folder',
        modifiedAt: 'Today, 14:18',
        children: [
          {
            id: 'primary-button',
            name: 'PrimaryButton.tsx',
            kind: 'code',
            sizeLabel: '4.8 KB',
            modifiedAt: 'Today, 14:18',
            previewText: [
              "import { mergeProps } from '../utils/mergeProps';",
              "import { themeProps } from '../utils/themeProps';",
              '',
              'export function PrimaryButton({ children, ref, ...rest }: PrimaryButtonProps) {',
              "  const merged = mergeProps({ themeTarget: themeProps('primary-button') });",
              '  return <button ref={ref} type="button" {...rest} {...merged}>{children}</button>;',
              '}',
            ].join('\n'),
          },
          {
            id: 'refractor-css',
            name: 'refractor.css',
            kind: 'code',
            sizeLabel: '14.2 KB',
            modifiedAt: 'Today, 13:55',
            previewText: [
              '.prism-slab {',
              '  border-radius: var(--prism-radius-slab);',
              '  backdrop-filter: blur(var(--prism-slab-blur-px)) saturate(175%);',
              '  color: var(--prism-text-primary);',
              '}',
            ].join('\n'),
          },
          {
            id: 'architecture-md',
            name: 'ARCHITECTURE.md',
            kind: 'document',
            sizeLabel: '6.1 KB',
            modifiedAt: 'Yesterday',
            previewText:
              'Refractor Optical Glass UI Kit aligns every component with React 19 ref props, Astryx themeProps composition, and strictly token-driven --prism-* optical surfaces.',
          },
        ],
      },
      {
        id: 'themes',
        name: 'themes',
        kind: 'folder',
        modifiedAt: 'Yesterday',
        children: [
          {
            id: 'alabaster-css',
            name: 'alabaster.css',
            kind: 'code',
            sizeLabel: '2.9 KB',
            modifiedAt: 'Yesterday',
            previewText: [
              '[data-refractor-theme="alabaster"] {',
              '  --prism-blur-px: 18px;',
              '  --prism-caustic-opacity: 1;',
              '}',
            ].join('\n'),
          },
        ],
      },
    ],
  },
  {
    id: 'assets',
    name: 'assets',
    kind: 'folder',
    modifiedAt: '2 days ago',
    children: [
      {
        id: 'media',
        name: 'media',
        kind: 'folder',
        modifiedAt: '2 days ago',
        children: [
          {
            id: 'prism-hero-png',
            name: 'prism-hero.png',
            kind: 'image',
            sizeLabel: '412 KB',
            modifiedAt: '2 days ago',
            previewText:
              '2560 x 1440 · sRGB PNG · Optical glass specimen hero render with subtle specular dispersion.',
          },
          {
            id: 'glass-chime-wav',
            name: 'glass-chime.wav',
            kind: 'audio',
            sizeLabel: '1.4 MB',
            modifiedAt: '3 days ago',
            previewText:
              '48 kHz · 24-bit PCM Stereo · 00:02.400 · Tactile crystal focus harmonic sample.',
          },
        ],
      },
    ],
  },
  {
    id: 'readme-md',
    name: 'README.md',
    kind: 'document',
    sizeLabel: '3.4 KB',
    modifiedAt: 'Today, 09:10',
    previewText:
      'Refractor Optical Glass UI Kit — Production React 19 optical-glass components with zero raw color literals and keyboard-first WAI-ARIA navigation.',
  },
];

const DEFAULT_SELECTED_PATH: ReadonlyArray<string> = ['packages', 'core', 'primary-button'];

function renderKindIcon(
  kind: MillerNodeKind,
  isOpenFolder: boolean,
  className: string,
  inheritColor = false
) {
  const colorStyle = inheritColor ? undefined : { color: KIND_META[kind].colorToken };
  switch (kind) {
    case 'folder':
      return isOpenFolder ? (
        <FolderOpen aria-hidden="true" className={className} style={colorStyle} />
      ) : (
        <Folder aria-hidden="true" className={className} style={colorStyle} />
      );
    case 'code':
      return <FileCode aria-hidden="true" className={className} style={colorStyle} />;
    case 'image':
      return <FileImage aria-hidden="true" className={className} style={colorStyle} />;
    case 'document':
      return <FileText aria-hidden="true" className={className} style={colorStyle} />;
    case 'audio':
      return <FileAudio aria-hidden="true" className={className} style={colorStyle} />;
  }
}

function buildColumnItems(
  columnKey: string,
  nodes: ReadonlyArray<MillerFileNode>
): ReadonlyArray<ResolvedColumnItem> {
  const seen = new Map<string, number>();
  return nodes.map((node) => {
    const count = seen.get(node.id) ?? 0;
    seen.set(node.id, count + 1);
    const suffix = count === 0 ? '' : `~${count + 1}`;
    return {
      key: `${columnKey}::${node.id}${suffix}`,
      node,
    };
  });
}

function resolveBrowserState(
  sourceRoots: ReadonlyArray<MillerFileNode>,
  requestedPath: ReadonlyArray<string>
): ResolvedBrowserState {
  if (sourceRoots.length === 0) {
    return {
      columns: [],
      crumbs: [],
      selectedPathIds: [],
      activeFile: null,
      depthCapped: false,
    };
  }

  let currentColumn: ResolvedColumn = {
    key: 'root',
    depth: 0,
    label: 'Root',
    items: buildColumnItems('root', sourceRoots),
    selectedId: null,
  };
  const columns: ResolvedColumn[] = [currentColumn];
  const crumbs: ResolvedCrumb[] = [];
  const selectedPathIds: string[] = [];
  let activeFile: MillerFileNode | null = null;
  let depthCapped = false;

  const boundedPath = requestedPath.slice(0, MAX_DEPTH);

  for (const [step, targetId] of boundedPath.entries()) {
    const matchedItem = currentColumn.items.find((candidate) => candidate.node.id === targetId);
    if (!matchedItem) break;

    const matched = matchedItem.node;
    currentColumn.selectedId = matched.id;
    selectedPathIds.push(matched.id);

    const crumbKey = `${currentColumn.key}/${matched.id}`;
    crumbs.push({
      key: crumbKey,
      depth: step,
      node: matched,
    });

    if (matched.kind === 'folder') {
      if (step + 1 >= MAX_DEPTH) {
        depthCapped = true;
        break;
      }
      currentColumn = {
        key: crumbKey,
        depth: step + 1,
        label: matched.name,
        items: buildColumnItems(crumbKey, matched.children ?? []),
        selectedId: null,
      };
      columns.push(currentColumn);
    } else {
      activeFile = matched;
      break;
    }
  }

  return {
    columns,
    crumbs,
    selectedPathIds,
    activeFile,
    depthCapped,
  };
}

function MillerColumnsBrowserInner({
  roots,
  defaultSelectedPath,
  onSelectNode,
  title = DEFAULT_TITLE,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: MillerColumnsBrowserProps) {
  const override = useComponentOverride('MillerColumnsBrowser');
  const baseId = useId();
  const headingId = `${baseId}-heading`;

  const sourceRoots = roots ?? DEFAULT_ROOTS;
  const safeTitle = title.trim() || DEFAULT_TITLE;

  const [selectedPath, setSelectedPath] = useState<string[]>(() => {
    if (defaultSelectedPath !== undefined) {
      return defaultSelectedPath.slice(0, MAX_DEPTH);
    }
    return roots === undefined ? [...DEFAULT_SELECTED_PATH] : [];
  });

  const itemButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingFocusRef = useRef<PendingFocusTarget | null>(null);
  const [focusNonce, setFocusNonce] = useState<number>(0);

  const resolved = useMemo(
    () => resolveBrowserState(sourceRoots, selectedPath),
    [sourceRoots, selectedPath]
  );

  useEffect(() => {
    const target = pendingFocusRef.current;
    if (!target) return;
    pendingFocusRef.current = null;
    const key = `${target.colIndex}:${target.itemIndex}`;
    const targetButton = itemButtonRefs.current.get(key);
    targetButton?.focus();
  }, [focusNonce, resolved.columns]);

  const registerItemRef = useCallback(
    (colIndex: number, itemIndex: number) => (element: HTMLButtonElement | null) => {
      const key = `${colIndex}:${itemIndex}`;
      if (element) {
        itemButtonRefs.current.set(key, element);
      } else {
        itemButtonRefs.current.delete(key);
      }
    },
    []
  );

  const scheduleFocus = useCallback((colIndex: number, itemIndex: number) => {
    pendingFocusRef.current = { colIndex, itemIndex };
    setFocusNonce((prev) => prev + 1);
  }, []);

  const selectNodeAt = useCallback(
    (colIndex: number, node: MillerFileNode) => {
      const prefix = resolved.selectedPathIds.slice(0, colIndex);
      const nextPath = [...prefix, node.id].slice(0, MAX_DEPTH);
      setSelectedPath(nextPath);
      onSelectNode?.(node, nextPath);
    },
    [onSelectNode, resolved.selectedPathIds]
  );

  const handleBreadcrumbActivate = useCallback(
    (crumbIndex: number, node: MillerFileNode) => {
      const nextPath = resolved.selectedPathIds.slice(0, crumbIndex + 1);
      setSelectedPath(nextPath);
      onSelectNode?.(node, nextPath);
    },
    [onSelectNode, resolved.selectedPathIds]
  );

  const handleBreadcrumbKeyDown = useCallback(
    (crumbIndex: number, node: MillerFileNode) =>
      (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleBreadcrumbActivate(crumbIndex, node);
        }
      },
    [handleBreadcrumbActivate]
  );

  const handleItemKeyDown = useCallback(
    (colIndex: number, column: ResolvedColumn, itemIndex: number, node: MillerFileNode) =>
      (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          const nextItem = column.items[itemIndex + 1];
          if (nextItem) {
            selectNodeAt(colIndex, nextItem.node);
            scheduleFocus(colIndex, itemIndex + 1);
          }
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          const prevItem = column.items[itemIndex - 1];
          if (prevItem) {
            selectNodeAt(colIndex, prevItem.node);
            scheduleFocus(colIndex, itemIndex - 1);
          }
          return;
        }

        if (event.key === 'ArrowRight') {
          event.preventDefault();
          if (node.kind === 'folder' && colIndex + 1 < MAX_DEPTH) {
            const firstChild = node.children?.[0];
            if (firstChild) {
              const prefix = resolved.selectedPathIds.slice(0, colIndex);
              const nextPath = [...prefix, node.id, firstChild.id].slice(0, MAX_DEPTH);
              setSelectedPath(nextPath);
              onSelectNode?.(firstChild, nextPath);
              scheduleFocus(colIndex + 1, 0);
            } else {
              selectNodeAt(colIndex, node);
            }
          } else {
            selectNodeAt(colIndex, node);
          }
          return;
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          const parentColumn = resolved.columns[colIndex - 1];
          const parentCrumb = resolved.crumbs[colIndex - 1];
          if (parentColumn && parentCrumb) {
            const parentPath = resolved.selectedPathIds.slice(0, colIndex);
            const parentIndex = Math.max(
              0,
              parentColumn.items.findIndex((candidate) => candidate.node.id === parentCrumb.node.id)
            );
            setSelectedPath(parentPath);
            onSelectNode?.(parentCrumb.node, parentPath);
            scheduleFocus(colIndex - 1, parentIndex);
          }
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectNodeAt(colIndex, node);
        }
      },
    [
      onSelectNode,
      resolved.columns,
      resolved.crumbs,
      resolved.selectedPathIds,
      scheduleFocus,
      selectNodeAt,
    ]
  );

  const isEmpty = sourceRoots.length === 0;
  const lastColumn = resolved.columns.at(-1);
  const activeColumnCount = lastColumn ? lastColumn.items.length : 0;
  const itemCountLabel = `${activeColumnCount} ${activeColumnCount === 1 ? 'item' : 'items'}`;

  const merged = mergeProps({
    themeTarget: themeProps('miller-columns-browser', {
      columns: resolved.columns.length,
      depth: resolved.crumbs.length,
      previewOpen: resolved.activeFile !== null,
      depthCapped: resolved.depthCapped,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab w-full max-w-full min-w-0 flex flex-col p-4 sm:p-5 gap-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('miller-columns-browser', 'header');
  const breadcrumbsClass = stableClassName('miller-columns-browser', 'breadcrumbs');
  const viewportClass = stableClassName('miller-columns-browser', 'viewport');
  const columnClass = stableClassName('miller-columns-browser', 'column');
  const itemClass = stableClassName('miller-columns-browser', 'item');
  const previewClass = stableClassName('miller-columns-browser', 'preview');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      {/* Sculpted Optical Slab Header with Title, Item Counter Pill, and Clickable Breadcrumb Trail */}
      <div
        data-testid="miller-columns-header"
        className={cx(
          headerClass,
          'prism-slab rounded-2xl px-3.5 py-3 flex flex-col gap-2 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full">
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            <span
              aria-hidden="true"
              className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
              style={STYLE_PRIMARY_MAIN}
            >
              <FolderTree aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
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
            {resolved.depthCapped ? (
              <span
                data-testid="miller-columns-depth-cap"
                className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium tabular-nums shrink-0"
                style={STYLE_WARNING_MAIN}
              >
                Max depth {MAX_DEPTH}
              </span>
            ) : null}
            <span
              data-testid="miller-columns-count"
              className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium tabular-nums shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {itemCountLabel}
            </span>
          </div>
        </div>

        <nav
          aria-label="Breadcrumb path"
          data-testid="miller-columns-breadcrumbs"
          className={cx(
            breadcrumbsClass,
            'prism-well rounded-xl px-2.5 py-1.5 min-w-0 max-w-full overflow-x-auto'
          )}
        >
          <ol className="m-0 p-0 list-none flex flex-wrap items-center gap-1 min-w-0 max-w-full text-xs">
            {resolved.crumbs.length === 0 ? (
              <li
                data-testid="miller-columns-breadcrumb-root"
                className="font-mono text-[11px] truncate"
                style={STYLE_TEXT_SECONDARY}
              >
                Root
              </li>
            ) : (
              resolved.crumbs.map((crumb) => {
                const isLast = crumb.depth === resolved.crumbs.length - 1;
                return (
                  <Fragment key={crumb.key}>
                    {crumb.depth > 0 ? (
                      <li
                        aria-hidden="true"
                        className="select-none px-0.5 text-[11px]"
                        style={STYLE_TEXT_DISABLED}
                      >
                        /
                      </li>
                    ) : null}
                    <li className="min-w-0 max-w-full flex items-center">
                      <button
                        type="button"
                        aria-current={isLast ? 'location' : undefined}
                        data-testid={`miller-columns-crumb-${crumb.depth}`}
                        onClick={() => handleBreadcrumbActivate(crumb.depth, crumb.node)}
                        onKeyDown={handleBreadcrumbKeyDown(crumb.depth, crumb.node)}
                        className={cx(
                          'prism-focus-ring rounded-lg px-1.5 py-0.5 text-xs truncate max-w-full cursor-pointer transition-opacity hover:opacity-80',
                          isLast ? 'font-semibold' : 'font-medium'
                        )}
                        style={{
                          color: isLast
                            ? 'var(--prism-text-primary)'
                            : 'var(--prism-text-secondary)',
                        }}
                      >
                        {crumb.node.name}
                      </button>
                    </li>
                  </Fragment>
                );
              })
            )}
          </ol>
        </nav>
      </div>

      {/* Body: Empty State or Horizontal Cascading Multi-Column Viewport + File Preview Pane */}
      {isEmpty ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="miller-columns-empty"
          className="prism-well rounded-2xl px-4 py-8 flex flex-col items-center justify-center text-center gap-1.5 min-w-0 max-w-full"
          style={STYLE_TEXT_SECONDARY}
        >
          <Inbox aria-hidden="true" className="w-5 h-5 shrink-0 opacity-75" />
          <p className="m-0 text-xs font-semibold" style={STYLE_TEXT_PRIMARY}>
            No files or folders
          </p>
          <p className="m-0 text-xs">
            Provide root directory entries to browse hierarchical files in cascading columns.
          </p>
        </div>
      ) : (
        <div
          data-testid="miller-columns-viewport"
          className={cx(
            viewportClass,
            'prism-well rounded-2xl overflow-x-auto flex divide-x divide-[var(--prism-divider)] min-w-0 max-w-full'
          )}
        >
          {resolved.columns.map((column) => {
            const colIndex = column.depth;
            const isDeepestColumn =
              colIndex === resolved.columns.length - 1 && resolved.activeFile === null;

            return (
              <div
                key={column.key}
                role="listbox"
                aria-label={`Column ${colIndex + 1}: ${column.label}`}
                data-testid={`miller-columns-col-${colIndex}`}
                data-column-depth={String(column.depth)}
                className={cx(
                  columnClass,
                  'w-52 sm:w-56 shrink-0 flex flex-col min-w-0 max-h-80 overflow-y-auto p-2 gap-1'
                )}
              >
                <div
                  className="px-2 py-1 flex items-center justify-between gap-2 text-[11px] font-medium shrink-0 min-w-0"
                  style={{
                    color: 'var(--prism-text-secondary)',
                    borderBottomWidth: '1px',
                    borderBottomStyle: 'solid',
                    borderBottomColor: 'var(--prism-divider)',
                  }}
                >
                  <span className="truncate min-w-0">{column.label}</span>
                  <span className="font-mono tabular-nums shrink-0">{column.items.length}</span>
                </div>

                {column.items.length === 0 ? (
                  <div
                    role="status"
                    data-testid={`miller-columns-col-empty-${colIndex}`}
                    className="flex-1 flex flex-col items-center justify-center text-center px-3 py-6 gap-1"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <Folder aria-hidden="true" className="w-4 h-4 opacity-60" />
                    <span className="text-xs">Empty folder</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {column.items.map((item, itemIndex) => {
                      const { node } = item;
                      const isSelected = column.selectedId === node.id;
                      const isActiveLeaf =
                        isSelected &&
                        colIndex === resolved.crumbs.length - 1 &&
                        (node.kind !== 'folder' || isDeepestColumn);
                      const isFolder = node.kind === 'folder';

                      return (
                        <button
                          key={item.key}
                          ref={registerItemRef(colIndex, itemIndex)}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          data-testid={`miller-columns-item-${colIndex}-${node.id}`}
                          data-node-id={node.id}
                          data-node-kind={node.kind}
                          data-selected={isSelected ? 'true' : undefined}
                          onClick={() => selectNodeAt(colIndex, node)}
                          onKeyDown={handleItemKeyDown(colIndex, column, itemIndex, node)}
                          className={cx(
                            itemClass,
                            'prism-focus-ring w-full min-w-0 px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-left text-xs cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                            isActiveLeaf
                              ? 'prism-emerald font-semibold'
                              : isSelected
                                ? 'prism-crystal font-semibold'
                                : 'hover:bg-[var(--prism-divider)] font-medium'
                          )}
                          style={isActiveLeaf ? undefined : { color: 'var(--prism-text-primary)' }}
                        >
                          <span className="flex items-center gap-2 min-w-0 flex-1">
                            {renderKindIcon(
                              node.kind,
                              isFolder && isSelected,
                              'w-4 h-4 shrink-0',
                              isActiveLeaf
                            )}
                            <span className="truncate min-w-0">{node.name}</span>
                          </span>

                          {isFolder ? (
                            <ChevronRight
                              aria-hidden="true"
                              className="w-3.5 h-3.5 shrink-0 opacity-75"
                            />
                          ) : node.sizeLabel ? (
                            <span
                              className="font-mono tabular-nums text-[10px] shrink-0 opacity-80"
                              style={
                                isActiveLeaf ? undefined : { color: 'var(--prism-text-secondary)' }
                              }
                            >
                              {node.sizeLabel}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {resolved.activeFile ? (
            <aside
              aria-label={`File preview: ${resolved.activeFile.name}`}
              data-testid="miller-columns-preview"
              data-preview-kind={resolved.activeFile.kind}
              className={cx(
                previewClass,
                'w-64 sm:w-72 shrink-0 flex-1 min-w-[15rem] max-w-full max-h-80 overflow-y-auto p-4 flex flex-col gap-3'
              )}
            >
              <div className="flex items-start gap-3 min-w-0 max-w-full">
                <span
                  aria-hidden="true"
                  className="prism-crystal w-10 h-10 rounded-2xl inline-flex items-center justify-center shrink-0"
                >
                  {renderKindIcon(resolved.activeFile.kind, false, 'w-5 h-5 shrink-0')}
                </span>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <h4
                    data-testid="miller-columns-preview-name"
                    className="m-0 text-sm font-semibold leading-snug break-words"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {resolved.activeFile.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      data-testid="miller-columns-preview-kind"
                      className="prism-crystal rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: KIND_META[resolved.activeFile.kind].colorToken }}
                    >
                      {KIND_META[resolved.activeFile.kind].badge}
                    </span>
                    <span
                      className="text-[11px]"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {KIND_META[resolved.activeFile.kind].label}
                    </span>
                  </div>
                </div>
              </div>

              <dl
                className="m-0 grid grid-cols-2 gap-2 py-2 text-xs min-w-0 max-w-full"
                style={{
                  borderTopWidth: '1px',
                  borderTopStyle: 'solid',
                  borderTopColor: 'var(--prism-divider)',
                  borderBottomWidth: '1px',
                  borderBottomStyle: 'solid',
                  borderBottomColor: 'var(--prism-divider)',
                }}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <dt
                    className="text-[10px] uppercase tracking-wide font-medium"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Size
                  </dt>
                  <dd
                    data-testid="miller-columns-preview-size"
                    className="m-0 font-mono tabular-nums text-xs truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {resolved.activeFile.sizeLabel ?? '—'}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <dt
                    className="text-[10px] uppercase tracking-wide font-medium"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Modified
                  </dt>
                  <dd
                    data-testid="miller-columns-preview-modified"
                    className="m-0 text-xs truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {resolved.activeFile.modifiedAt ?? '—'}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-col gap-1.5 min-w-0 max-w-full flex-1">
                <span
                  className="text-[10px] uppercase tracking-wide font-semibold"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Preview
                </span>
                {resolved.activeFile.previewText ? (
                  resolved.activeFile.kind === 'code' ? (
                    <pre
                      data-testid="miller-columns-preview-content"
                      className="prism-well rounded-xl p-3 m-0 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto max-w-full"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      <code>{resolved.activeFile.previewText}</code>
                    </pre>
                  ) : (
                    <div
                      data-testid="miller-columns-preview-content"
                      className="prism-well rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap break-words max-w-full"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {resolved.activeFile.previewText}
                    </div>
                  )
                ) : (
                  <p
                    data-testid="miller-columns-preview-empty"
                    className="prism-well rounded-xl p-3 m-0 text-xs italic"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    No preview text available for this file.
                  </p>
                )}
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}

export const MillerColumnsBrowser = memo(MillerColumnsBrowserInner);
MillerColumnsBrowser.displayName = 'MillerColumnsBrowser';
