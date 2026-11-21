'use client';

import { useState, type ReactNode } from 'react';
import { FileCode, Folder, FolderOpen } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { formatFileSize, getChildrenNodes, type TreeNodeItem } from '../utils/dateGrid';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

const DEFAULT_EXPANDED_IDS: ReadonlyArray<string> = [
  'dir-root-design',
  'dir-root-components',
  'dir-buttons',
];

export interface TreeViewProps<T extends TreeNodeItem = TreeNodeItem>
  extends BaseProps<HTMLDivElement> {
  /** Flat collection of folder and file nodes linked via parentId. */
  nodes: ReadonlyArray<T>;
  /** Currently selected node ID, or null when nothing is selected. */
  selectedNodeId: string | null;
  /** Invoked when any folder or file node is clicked. */
  onSelectNode: (node: T) => void;
  /** Optional initial expanded folder IDs. */
  defaultExpandedIds?: ReadonlyArray<string>;
}

export function TreeView<T extends TreeNodeItem = TreeNodeItem>({
  nodes,
  selectedNodeId,
  onSelectNode,
  defaultExpandedIds = DEFAULT_EXPANDED_IDS,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TreeViewProps<T>) {
  const override = useComponentOverride('TreeView');
  const [expandedIds, setExpandedIds] = useState<string[]>(() => [...defaultExpandedIds]);

  const toggleFolder = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const merged = mergeProps({
    themeTarget: themeProps('tree-view', { empty: nodes.length === 0 }),
    baseClassName: 'prism-slab p-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const renderBranch = (
    parentId: string | null,
    depth: number,
    visited: ReadonlySet<string>
  ): ReactNode => {
    const children = getChildrenNodes(nodes, parentId).filter((node) => !visited.has(node.id));
    if (children.length === 0) return null;

    return (
      <ul role={depth === 0 ? 'tree' : 'group'} className="space-y-0.5">
        {children.map((node) => {
          const isFolder = node.type === 'folder';
          const isOpen = expandedIds.includes(node.id);
          const isSelected = selectedNodeId === node.id;
          const nextVisited = new Set(visited);
          nextVisited.add(node.id);

          return (
            <li
              key={node.id}
              role="treeitem"
              aria-selected={isSelected}
              aria-expanded={isFolder ? isOpen : undefined}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectNode(node);
                  if (isFolder) toggleFolder(node.id);
                }}
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
                className={`prism-focus-ring w-full pr-3 py-1.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'prism-emerald text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-white/55 dark:hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {isFolder ? (
                    isOpen ? (
                      <FolderOpen aria-hidden="true" className="w-4 h-4 shrink-0 text-amber-500" />
                    ) : (
                      <Folder aria-hidden="true" className="w-4 h-4 shrink-0 text-amber-500" />
                    )
                  ) : (
                    <FileCode aria-hidden="true" className="w-4 h-4 shrink-0 opacity-80" />
                  )}
                  <span className="truncate">{node.name}</span>
                </span>
                {node.sizeBytes !== undefined ? (
                  <span
                    className={`font-mono tabular-nums text-[11px] shrink-0 ${
                      isSelected ? 'text-white/90' : 'text-slate-400'
                    }`}
                  >
                    {formatFileSize(node.sizeBytes)}
                  </span>
                ) : null}
              </button>
              {isFolder && isOpen ? renderBranch(node.id, depth + 1, nextVisited) : null}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div ref={ref} {...rest} {...merged}>
      {renderBranch(null, 0, new Set())}
    </div>
  );
}

TreeView.displayName = 'TreeView';
