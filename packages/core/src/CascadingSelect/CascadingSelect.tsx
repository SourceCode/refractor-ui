'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface CascadeOptionNode {
  /** Unique identifier for this hierarchy node within its level. */
  id: string;
  /** Visible label displayed in level columns and the trigger breadcrumb. */
  label: string;
  /** Optional nested child nodes that expand an adjacent level column. */
  children?: CascadeOptionNode[];
  /** Disables expanding or selecting this node. */
  disabled?: boolean;
}

type CascadingSelectBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface CascadingSelectProps extends CascadingSelectBaseProps {
  /** Hierarchical tree of cascade option nodes. */
  options: CascadeOptionNode[];
  /** Controlled array of node IDs representing the selected path. */
  value?: string[];
  /** Initial selected path of node IDs for uncontrolled usage. */
  defaultValue?: string[];
  /** Callback fired with the committed path IDs and corresponding node chain. */
  onChange?: (pathIds: string[], nodes: CascadeOptionNode[]) => void;
  /** Placeholder text shown when no hierarchy path is selected (defaults to 'Select hierarchy...'). */
  placeholder?: string;
  /** Delimiter inserted between breadcrumb segment labels (defaults to ' / '). */
  separator?: string;
  /** Whether the cascading menu popover starts open (defaults to false). */
  defaultOpen?: boolean;
  /** Visible field label rendered above the trigger (defaults to 'Hierarchy'). */
  label?: string;
  /** Disables opening, navigating, selecting, and clearing. */
  disabled?: boolean;
}

interface CascadeColumn {
  key: string;
  depth: number;
  level: number;
  nodes: CascadeOptionNode[];
}

function dedupeLevelNodes(nodes: ReadonlyArray<CascadeOptionNode>): CascadeOptionNode[] {
  const seen = new Set<string>();
  const out: CascadeOptionNode[] = [];
  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    out.push(node);
  }
  return out;
}

function resolvePathNodes(
  options: ReadonlyArray<CascadeOptionNode>,
  ids: ReadonlyArray<string>
): CascadeOptionNode[] {
  const resolved: CascadeOptionNode[] = [];
  let levelNodes: ReadonlyArray<CascadeOptionNode> = options;

  for (const id of ids) {
    const match = levelNodes.find((node) => node.id === id);
    if (!match) break;
    resolved.push(match);
    levelNodes = match.children ?? [];
  }

  return resolved;
}

export function CascadingSelect({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select hierarchy...',
  separator = ' / ',
  defaultOpen = false,
  label = 'Hierarchy',
  disabled = false,
  className,
  style,
  xstyle,
  onKeyDown,
  ref,
  ...rest
}: CascadingSelectProps) {
  const [selectedPath, setSelectedPath] = useControllableState<string[]>({
    value,
    defaultValue: defaultValue ?? [],
  });
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [activePath, setActivePath] = useState<string[]>(() => value ?? defaultValue ?? []);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const labelId = useId();
  const menuId = useId();
  const override = useComponentOverride('CascadingSelect');

  const isOpen = open && !disabled;

  const selectedNodes = useMemo(
    () => resolvePathNodes(options, selectedPath),
    [options, selectedPath]
  );

  const hasSelection = selectedNodes.length > 0;
  const breadcrumbText = useMemo(
    () => selectedNodes.map((node) => node.label).join(separator),
    [selectedNodes, separator]
  );

  const columns = useMemo<CascadeColumn[]>(() => {
    const rootNodes = dedupeLevelNodes(options);
    if (rootNodes.length === 0) return [];

    const cols: CascadeColumn[] = [
      {
        key: 'level-1-root',
        depth: 0,
        level: 1,
        nodes: rootNodes,
      },
    ];

    let currentNodes = rootNodes;
    for (let depth = 0; depth < activePath.length; depth += 1) {
      const activeId = activePath[depth];
      const matched = currentNodes.find((node) => node.id === activeId);
      if (!matched || matched.disabled || !matched.children || matched.children.length === 0) {
        break;
      }
      const childNodes = dedupeLevelNodes(matched.children);
      cols.push({
        key: `level-${depth + 2}-${matched.id}`,
        depth: depth + 1,
        level: depth + 2,
        nodes: childNodes,
      });
      currentNodes = childNodes;
    }

    return cols;
  }, [options, activePath]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
  }, [isOpen]);

  const commitPath = useCallback(
    (nextIds: string[], nextNodes: CascadeOptionNode[]) => {
      setSelectedPath(nextIds);
      onChange?.(nextIds, nextNodes);
    },
    [setSelectedPath, onChange]
  );

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setActivePath(selectedPath);
      }
      return next;
    });
  }, [disabled, selectedPath]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    setActivePath([]);
    commitPath([], []);
    triggerRef.current?.focus();
  }, [disabled, commitPath]);

  const handleNodeClick = useCallback(
    (depth: number, node: CascadeOptionNode) => {
      if (disabled || node.disabled) return;
      const nextIds = [...activePath.slice(0, depth), node.id];
      const hasChildren = Boolean(node.children && node.children.length > 0);
      setActivePath(nextIds);

      if (!hasChildren) {
        const nextNodes = resolvePathNodes(options, nextIds);
        commitPath(nextIds, nextNodes);
        setOpen(false);
        triggerRef.current?.focus();
      }
    },
    [disabled, activePath, options, commitPath]
  );

  const handleKeyDown = composeEventHandlers(onKeyDown, (event) => {
    if (disabled || event.nativeEvent.isComposing) return;

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (!isOpen && event.key === 'ArrowDown' && event.target === triggerRef.current) {
      event.preventDefault();
      setActivePath(selectedPath);
      setOpen(true);
    }
  });

  const merged = mergeProps({
    themeTarget: themeProps('cascading-select', {
      open: isOpen,
      disabled,
      hasSelection,
      empty: options.length === 0,
    }),
    baseClassName: 'relative w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const triggerClass = stableClassName('cascading-select', 'trigger');
  const clearClass = stableClassName('cascading-select', 'clear');
  const popoverClass = stableClassName('cascading-select', 'popover');
  const columnClass = stableClassName('cascading-select', 'column');
  const optionClass = stableClassName('cascading-select', 'option');

  return (
    <div ref={mergedRef} onKeyDown={handleKeyDown} {...rest} {...merged}>
      {label ? (
        <span
          id={labelId}
          className="block text-xs font-semibold mb-1.5 ml-1"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {label}
        </span>
      ) : null}

      <div className="relative flex items-center">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls={isOpen ? menuId : undefined}
          aria-labelledby={label ? labelId : undefined}
          aria-label={!label ? placeholder : undefined}
          onClick={handleToggle}
          className={cx(
            triggerClass,
            'prism-crystal prism-focus-ring w-full min-h-12 rounded-2xl pl-4 pr-3.5 py-2.5 flex items-center justify-between gap-2 text-left transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <span
            className={cx(
              'text-sm font-medium truncate',
              hasSelection && !disabled ? 'pr-8' : undefined
            )}
            style={{
              color: hasSelection ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
            }}
          >
            {hasSelection ? breadcrumbText : placeholder}
          </span>

          <ChevronDown
            aria-hidden="true"
            className={cx(
              'w-4 h-4 shrink-0 transition-transform duration-150',
              isOpen ? 'rotate-180' : undefined
            )}
            style={{ color: 'var(--prism-text-secondary)' }}
          />
        </button>

        {hasSelection && !disabled ? (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={handleClear}
            className={cx(
              clearClass,
              'prism-well prism-focus-ring absolute right-9 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full inline-flex items-center justify-center text-sm leading-none cursor-pointer enabled:hover:opacity-80 transition-opacity'
            )}
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={label ? labelId : undefined}
          aria-label={!label ? placeholder : undefined}
          className={cx(
            popoverClass,
            'prism-slab absolute left-0 mt-2 z-40 min-w-full max-w-full overflow-x-auto p-1.5'
          )}
        >
          {columns.length === 0 ? (
            <div
              role="status"
              data-testid="cascading-select-empty"
              className="px-4 py-5 text-center text-xs font-medium"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              No hierarchy options available
            </div>
          ) : (
            <div className="flex items-stretch">
              {columns.map((column) => (
                <div
                  key={column.key}
                  data-level={column.level}
                  className={cx(
                    columnClass,
                    'min-w-[11rem] max-h-64 overflow-y-auto px-1.5 py-1 flex flex-col gap-0.5'
                  )}
                  style={
                    column.depth > 0
                      ? { borderLeft: '1px solid var(--prism-divider)' }
                      : undefined
                  }
                >
                  <div
                    className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    Level {column.level}
                  </div>

                  {column.nodes.map((node) => {
                    const hasChildren = Boolean(node.children && node.children.length > 0);
                    const isActiveBranch = activePath[column.depth] === node.id;
                    const isSelectedNode = selectedPath[column.depth] === node.id;
                    const isSelectedLeaf =
                      !hasChildren &&
                      isSelectedNode &&
                      selectedPath.length === column.depth + 1;
                    const isNodeDisabled = Boolean(node.disabled);

                    return (
                      <button
                        key={`${column.key}-${node.id}`}
                        type="button"
                        role="menuitem"
                        disabled={isNodeDisabled}
                        aria-disabled={isNodeDisabled ? 'true' : undefined}
                        aria-haspopup={hasChildren ? 'menu' : undefined}
                        aria-expanded={hasChildren ? isActiveBranch : undefined}
                        data-active={isActiveBranch ? 'true' : undefined}
                        data-selected={isSelectedNode ? 'true' : undefined}
                        onClick={() => handleNodeClick(column.depth, node)}
                        className={cx(
                          optionClass,
                          'prism-focus-ring w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-left text-sm font-medium transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:bg-white/60 dark:enabled:hover:bg-white/10',
                          isActiveBranch ? 'prism-well' : undefined
                        )}
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        <span className="truncate">{node.label}</span>
                        {hasChildren ? (
                          <ChevronRight
                            aria-hidden="true"
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: 'var(--prism-text-secondary)' }}
                          />
                        ) : isSelectedLeaf ? (
                          <span
                            aria-hidden="true"
                            className="prism-emerald w-4 h-4 rounded-full inline-flex items-center justify-center shrink-0"
                          >
                            <Check className="w-3 h-3 stroke-[2.6]" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

CascadingSelect.displayName = 'CascadingSelect';
