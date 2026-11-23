'use client';

import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { FileCode, Folder, FolderOpen } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { compareLocaleStrings } from '../utils/styles';
import { formatFileSize, type TreeNodeItem } from '../utils/dateGrid';
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

function TreeViewInner<T extends TreeNodeItem = TreeNodeItem>({
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
  const [expandedSet, setExpandedSet] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpandedIds)
  );

  // Pre-index and pre-sort children by parentId once in O(N log N) instead of O(N^2) during recursion
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, T[]>();
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i]!;
      const bucket = map.get(node.parentId);
      if (bucket) {
        bucket.push(node);
      } else {
        map.set(node.parentId, [node]);
      }
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return compareLocaleStrings(a.name, b.name);
      });
    }
    return map;
  }, [nodes]);

  const toggleFolder = useCallback((id: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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
    const rawChildren = childrenByParent.get(parentId);
    if (!rawChildren || rawChildren.length === 0) return null;
    const children =
      visited.size === 0 ? rawChildren : rawChildren.filter((node) => !visited.has(node.id));
    if (children.length === 0) return null;

    return (
      <ul role={depth === 0 ? 'tree' : 'group'} className="space-y-0.5">
        {children.map((node) => {
          const isFolder = node.type === 'folder';
          const isOpen = isFolder && expandedSet.has(node.id);
          const isSelected = selectedNodeId === node.id;
          let nextVisited: ReadonlySet<string> = visited;
          if (isOpen) {
            const copy = new Set(visited);
            copy.add(node.id);
            nextVisited = copy;
          }

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
              {isOpen ? renderBranch(node.id, depth + 1, nextVisited) : null}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div ref={ref} {...rest} {...merged}>
      {nodes.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
          No nodes in directory.
        </div>
      ) : (
        renderBranch(null, 0, new Set())
      )}
    </div>
  );
}

type TreeViewComponent = (<T extends TreeNodeItem = TreeNodeItem>(
  props: TreeViewProps<T>
) => ReactNode) & { displayName?: string };

export const TreeView = memo(TreeViewInner) as TreeViewComponent;
TreeView.displayName = 'TreeView';
