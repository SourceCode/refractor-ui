'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckSquare,
  Code2,
  Copy,
  GripVertical,
  Heading,
  Info,
  Layers,
  Pilcrow,
  Quote,
  Trash2,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BG_DIVIDER, STYLE_ERROR_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type DocBlockKind =
  | 'paragraph'
  | 'heading'
  | 'callout'
  | 'checklist'
  | 'quote'
  | 'code';

export interface DocumentBlockItem {
  /** Stable unique identifier for the document block. */
  id: string;
  /** Semantic document block type governing visual presentation and icon badge. */
  kind: DocBlockKind;
  /** Text content rendered inside the block surface. */
  text: string;
  /** Completion state for checklist blocks. */
  checked?: boolean;
}

type BlockTransformHandleBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface BlockTransformHandleProps extends BlockTransformHandleBaseProps {
  /** Controlled ordered list of document blocks. Passing [] renders a clean role="status" empty state. */
  blocks?: ReadonlyArray<DocumentBlockItem>;
  /** Initial document blocks in uncontrolled mode. Defaults to 4 realistic blocks when omitted. */
  defaultBlocks?: ReadonlyArray<DocumentBlockItem>;
  /** Callback invoked with the updated block array after transform, reorder, duplicate, delete, or checklist toggle. */
  onChange?: (blocks: DocumentBlockItem[]) => void;
  /** Header title and default accessible region label for the canvas. */
  title?: string;
  /** Disables block handles, transformer menus, drag-and-drop reordering, and checklist checkboxes. */
  disabled?: boolean;
}

interface BlockKindMeta {
  readonly kind: DocBlockKind;
  readonly label: string;
  readonly shortTag: string;
  readonly accentToken: string;
}

type BlockFocusTarget =
  | { scope: 'menu' }
  | { scope: 'grip'; blockId: string };

const DEFAULT_TITLE = 'Block Editor Canvas';

const DOC_BLOCK_KINDS: ReadonlyArray<DocBlockKind> = [
  'paragraph',
  'heading',
  'callout',
  'checklist',
  'quote',
  'code',
];

const DEFAULT_DOCUMENT_BLOCKS: ReadonlyArray<DocumentBlockItem> = [
  {
    id: 'block-heading',
    kind: 'heading',
    text: 'Q3 Optical Design System Architecture',
  },
  {
    id: 'block-paragraph',
    kind: 'paragraph',
    text: 'Every surface refracts ambient light using semantic --prism-* CSS custom properties for consistent depth in both light and dark themes.',
  },
  {
    id: 'block-callout',
    kind: 'callout',
    text: 'All interactive surfaces preserve keyboard-only focus rings and IME-safe event handling across every locale.',
  },
  {
    id: 'block-checklist',
    kind: 'checklist',
    text: 'Audit WCAG 2.2 AA contrast tokens across all six block variants',
    checked: false,
  },
];

function getBlockKindMeta(kind: DocBlockKind): BlockKindMeta {
  switch (kind) {
    case 'paragraph':
      return {
        kind: 'paragraph',
        label: 'Paragraph',
        shortTag: 'Text',
        accentToken: 'var(--prism-text-secondary)',
      };
    case 'heading':
      return {
        kind: 'heading',
        label: 'Heading',
        shortTag: 'H1',
        accentToken: 'var(--prism-primary-main)',
      };
    case 'callout':
      return {
        kind: 'callout',
        label: 'Callout',
        shortTag: 'Callout',
        accentToken: 'var(--prism-warning-main)',
      };
    case 'checklist':
      return {
        kind: 'checklist',
        label: 'Checklist',
        shortTag: 'To-do',
        accentToken: 'var(--prism-success-main)',
      };
    case 'quote':
      return {
        kind: 'quote',
        label: 'Quote',
        shortTag: 'Quote',
        accentToken: 'var(--prism-secondary-main)',
      };
    case 'code':
      return {
        kind: 'code',
        label: 'Code',
        shortTag: 'Code',
        accentToken: 'var(--prism-info-main)',
      };
  }
}

function renderKindIcon(kind: DocBlockKind, className: string) {
  switch (kind) {
    case 'paragraph':
      return <Pilcrow aria-hidden="true" className={className} />;
    case 'heading':
      return <Heading aria-hidden="true" className={className} />;
    case 'callout':
      return <Info aria-hidden="true" className={className} />;
    case 'checklist':
      return <CheckSquare aria-hidden="true" className={className} />;
    case 'quote':
      return <Quote aria-hidden="true" className={className} />;
    case 'code':
      return <Code2 aria-hidden="true" className={className} />;
  }
}

function dedupeBlocks(list: ReadonlyArray<DocumentBlockItem>): DocumentBlockItem[] {
  const seen = new Set<string>();
  const out: DocumentBlockItem[] = [];
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push({ ...item });
    }
  }
  return out;
}

function createDuplicateBlockId(
  sourceId: string,
  existingBlocks: ReadonlyArray<DocumentBlockItem>
): string {
  const existingIds = new Set(existingBlocks.map((entry) => entry.id));
  const baseId = sourceId.replace(/-copy(?:-\d+)?$/, '');
  let candidate = `${baseId}-copy`;
  let counter = 2;
  while (existingIds.has(candidate)) {
    candidate = `${baseId}-copy-${counter}`;
    counter += 1;
  }
  return candidate;
}

function getBlockSummaryLabel(block: DocumentBlockItem, index: number): string {
  const trimmed = block.text.trim();
  if (trimmed.length === 0) {
    return `${getBlockKindMeta(block.kind).label} block ${index + 1}`;
  }
  if (trimmed.length <= 36) {
    return trimmed;
  }
  return `${trimmed.slice(0, 35)}…`;
}

function BlockTransformHandleInner({
  blocks,
  defaultBlocks,
  onChange,
  title = DEFAULT_TITLE,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': nativeAriaLabel,
  ref,
  ...rest
}: BlockTransformHandleProps) {
  const override = useComponentOverride('BlockTransformHandle');
  const idPrefix = useId();

  const isControlled = blocks !== undefined;
  const [internalBlocks, setInternalBlocks] = useState<DocumentBlockItem[]>(() =>
    dedupeBlocks(defaultBlocks ?? DEFAULT_DOCUMENT_BLOCKS)
  );
  const [openMenuBlockId, setOpenMenuBlockId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [focusRequest, setFocusRequest] = useState<BlockFocusTarget | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const gripNodesRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const currentBlocks = useMemo(
    () => (isControlled ? dedupeBlocks(blocks) : internalBlocks),
    [blocks, internalBlocks, isControlled]
  );

  const isEmpty = currentBlocks.length === 0;

  const effectiveOpenMenuBlockId = useMemo(() => {
    if (disabled || openMenuBlockId === null) return null;
    return currentBlocks.some((block) => block.id === openMenuBlockId) ? openMenuBlockId : null;
  }, [currentBlocks, disabled, openMenuBlockId]);

  useEffect(() => {
    if (disabled) {
      setOpenMenuBlockId(null);
      setDraggedIndex(null);
      setDropTargetIndex(null);
    }
  }, [disabled]);

  const registerGripNode = useCallback((blockId: string, node: HTMLButtonElement | null) => {
    if (node) {
      gripNodesRef.current.set(blockId, node);
    } else {
      gripNodesRef.current.delete(blockId);
    }
  }, []);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.scope === 'menu') {
      const firstEnabled = menuRef.current?.querySelector<HTMLButtonElement>(
        'button[role="menuitem"]:not(:disabled)'
      );
      firstEnabled?.focus();
    } else {
      gripNodesRef.current.get(focusRequest.blockId)?.focus();
    }
  }, [focusRequest]);

  useEffect(() => {
    if (effectiveOpenMenuBlockId === null) return undefined;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !menuRef.current?.contains(target) &&
        !gripNodesRef.current.get(effectiveOpenMenuBlockId)?.contains(target)
      ) {
        setOpenMenuBlockId(null);
      }
    };

    const handleWindowEscape = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenMenuBlockId(null);
        setFocusRequest({ scope: 'grip', blockId: effectiveOpenMenuBlockId });
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('keydown', handleWindowEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('keydown', handleWindowEscape);
    };
  }, [effectiveOpenMenuBlockId]);

  const commitBlocks = useCallback(
    (nextBlocks: DocumentBlockItem[], message: string) => {
      if (!isControlled) {
        setInternalBlocks(nextBlocks);
      }
      setAnnouncement(message);
      onChange?.(nextBlocks);
    },
    [isControlled, onChange]
  );

  const moveBlock = useCallback(
    (fromIndex: number, toIndex: number, restoreGripBlockId?: string) => {
      const sourceBlock = currentBlocks[fromIndex];
      if (
        disabled ||
        !sourceBlock ||
        !Number.isInteger(toIndex) ||
        toIndex < 0 ||
        toIndex >= currentBlocks.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      const nextBlocks = [...currentBlocks];
      nextBlocks.splice(fromIndex, 1);
      nextBlocks.splice(toIndex, 0, sourceBlock);

      setOpenMenuBlockId(null);
      commitBlocks(
        nextBlocks,
        `Moved ${getBlockKindMeta(sourceBlock.kind).label} block to position ${toIndex + 1} of ${nextBlocks.length}`
      );
      if (restoreGripBlockId) {
        setFocusRequest({ scope: 'grip', blockId: restoreGripBlockId });
      }
    },
    [commitBlocks, currentBlocks, disabled]
  );

  const handleTurnInto = useCallback(
    (target: DocumentBlockItem, index: number, nextKind: DocBlockKind) => {
      const nextMeta = getBlockKindMeta(nextKind);
      setOpenMenuBlockId(null);
      setFocusRequest({ scope: 'grip', blockId: target.id });

      if (target.kind === nextKind) {
        setAnnouncement(`Block ${index + 1} is already ${nextMeta.label}`);
        return;
      }

      const transformed: DocumentBlockItem =
        nextKind === 'checklist'
          ? { id: target.id, kind: 'checklist', text: target.text, checked: Boolean(target.checked) }
          : { id: target.id, kind: nextKind, text: target.text };

      const nextBlocks = currentBlocks.map((entry, idx) => (idx === index ? transformed : entry));
      commitBlocks(nextBlocks, `Transformed block ${index + 1} to ${nextMeta.label}`);
    },
    [commitBlocks, currentBlocks]
  );

  const handleDuplicate = useCallback(
    (target: DocumentBlockItem, index: number) => {
      const duplicateId = createDuplicateBlockId(target.id, currentBlocks);
      const duplicateBlock: DocumentBlockItem =
        target.kind === 'checklist'
          ? {
              id: duplicateId,
              kind: 'checklist',
              text: target.text,
              checked: Boolean(target.checked),
            }
          : {
              id: duplicateId,
              kind: target.kind,
              text: target.text,
            };

      const nextBlocks = [...currentBlocks];
      nextBlocks.splice(index + 1, 0, duplicateBlock);

      setOpenMenuBlockId(null);
      commitBlocks(
        nextBlocks,
        `Duplicated ${getBlockKindMeta(target.kind).label} block at position ${index + 2} of ${nextBlocks.length}`
      );
      setFocusRequest({ scope: 'grip', blockId: duplicateId });
    },
    [commitBlocks, currentBlocks]
  );

  const handleDelete = useCallback(
    (target: DocumentBlockItem, index: number) => {
      const nextBlocks = currentBlocks.filter((_, idx) => idx !== index);
      const remainingLabel = nextBlocks.length === 1 ? 'block' : 'blocks';

      setOpenMenuBlockId(null);
      commitBlocks(
        nextBlocks,
        `Deleted ${getBlockKindMeta(target.kind).label} block. ${nextBlocks.length} ${remainingLabel} remaining`
      );

      const neighbor = nextBlocks[Math.min(index, nextBlocks.length - 1)];
      if (neighbor) {
        setFocusRequest({ scope: 'grip', blockId: neighbor.id });
      }
    },
    [commitBlocks, currentBlocks]
  );

  const handleToggleChecklist = useCallback(
    (target: DocumentBlockItem, index: number) => {
      const nextChecked = !target.checked;
      const nextBlocks = currentBlocks.map((entry, idx) =>
        idx === index ? { ...entry, checked: nextChecked } : entry
      );
      commitBlocks(
        nextBlocks,
        `Marked checklist block ${index + 1} as ${nextChecked ? 'completed' : 'incomplete'}`
      );
    },
    [commitBlocks, currentBlocks]
  );

  const handleGripKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, block: DocumentBlockItem, index: number) => {
      if (disabled || event.nativeEvent.isComposing) return;

      if (event.altKey && event.key === 'ArrowUp') {
        event.preventDefault();
        moveBlock(index, index - 1, block.id);
      } else if (event.altKey && event.key === 'ArrowDown') {
        event.preventDefault();
        moveBlock(index, index + 1, block.id);
      } else if (!event.altKey && event.key === 'ArrowDown') {
        event.preventDefault();
        setOpenMenuBlockId(block.id);
        setFocusRequest({ scope: 'menu' });
      } else if (event.key === 'Escape' && effectiveOpenMenuBlockId === block.id) {
        event.preventDefault();
        setOpenMenuBlockId(null);
      }
    },
    [disabled, effectiveOpenMenuBlockId, moveBlock]
  );

  const handleMenuKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>, blockId: string) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenMenuBlockId(null);
        setFocusRequest({ scope: 'grip', blockId });
        return;
      }

      if (event.key === 'Tab') {
        setOpenMenuBlockId(null);
        return;
      }

      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        event.preventDefault();
        const items = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            'button[role="menuitem"]:not(:disabled)'
          )
        );

        const currentIndex = items.findIndex((item) => item === document.activeElement);
        const nextIndex =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : event.key === 'ArrowDown'
                ? currentIndex < 0
                  ? 0
                  : (currentIndex + 1) % items.length
                : currentIndex <= 0
                  ? items.length - 1
                  : currentIndex - 1;
        items[nextIndex]?.focus();
      }
    },
    []
  );

  const handleDragStart = useCallback(
    (event: ReactDragEvent<HTMLLIElement>, index: number, block: DocumentBlockItem) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      setOpenMenuBlockId(null);
      setDraggedIndex(index);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/x-refractor-block-id', block.id);
        event.dataTransfer.setData('text/plain', String(index));
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (event: ReactDragEvent<HTMLLIElement>, index: number) => {
      if (disabled) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      if (dropTargetIndex !== index) {
        setDropTargetIndex(index);
      }
    },
    [disabled, dropTargetIndex]
  );

  const handleDragLeave = useCallback((event: ReactDragEvent<HTMLLIElement>, index: number) => {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setDropTargetIndex((prev) => (prev === index ? null : prev));
    }
  }, []);

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLLIElement>, targetIndex: number) => {
      if (disabled) return;
      event.preventDefault();
      let fromIndex: number | null = draggedIndex;

      if (event.dataTransfer) {
        const transferId = event.dataTransfer.getData('application/x-refractor-block-id');
        const transferText = event.dataTransfer.getData('text/plain');
        if (transferId) {
          fromIndex = currentBlocks.findIndex((entry) => entry.id === transferId);
        } else if (transferText) {
          const trimmed = transferText.trim();
          fromIndex = /^\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : -1;
        }
      }

      setDraggedIndex(null);
      setDropTargetIndex(null);

      if (fromIndex !== null) {
        moveBlock(fromIndex, targetIndex);
      }
    },
    [currentBlocks, disabled, draggedIndex, moveBlock]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  }, []);

  const resolvedAriaLabel = nativeAriaLabel ?? title;

  const merged = mergeProps({
    themeTarget: themeProps('block-transform-handle', {
      disabled,
      empty: isEmpty,
      menuOpen: effectiveOpenMenuBlockId !== null,
      count: currentBlocks.length,
    }),
    baseClassName: 'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 space-y-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('block-transform-handle', 'header');
  const listClass = stableClassName('block-transform-handle', 'list');
  const menuClass = stableClassName('block-transform-handle', 'menu');
  const emptyClass = stableClassName('block-transform-handle', 'empty');
  const statusClass = stableClassName('block-transform-handle', 'status');

  const blockCountText = `${currentBlocks.length} ${currentBlocks.length === 1 ? 'block' : 'blocks'}`;

  return (
    <div ref={ref} role="region" aria-label={resolvedAriaLabel} {...rest} {...merged}>
      {/* Optical Slab Header & Live Status Bar */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Layers
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color: disabled ? 'var(--prism-text-disabled)' : 'var(--prism-primary-main)',
            }}
          />
          <span
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </span>
          <span
            data-testid="block-transform-count"
            className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {blockCountText}
          </span>
          {disabled ? (
            <span
              data-testid="block-transform-disabled-badge"
              className="prism-well px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
              style={STYLE_TEXT_DISABLED}
            >
              Read-only
            </span>
          ) : null}
        </div>

        <div
          data-testid="block-transform-status"
          aria-live="polite"
          aria-atomic="true"
          className={cx(
            statusClass,
            'prism-well inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium min-w-0 max-w-full'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: announcement
                ? 'var(--prism-secondary-main)'
                : 'var(--prism-divider)',
            }}
          />
          <span className="truncate">
            {announcement || 'Ready · Use block handle to transform or reorder'}
          </span>
        </div>
      </div>

      {/* Document Block List or Clean Empty State */}
      {isEmpty ? (
        <div
          role="status"
          data-testid="block-transform-empty"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl px-5 py-8 flex flex-col items-center justify-center text-center gap-1.5 min-w-0 max-w-full'
          )}
        >
          <span
            className="text-sm font-semibold"
            style={STYLE_TEXT_PRIMARY}
          >
            No document blocks
          </span>
          <span className="text-xs" style={STYLE_TEXT_SECONDARY}>
            Add blocks to transform, duplicate, or reorder content on this canvas.
          </span>
        </div>
      ) : (
        <ol
          aria-label={`${title} blocks`}
          className={cx(listClass, 'flex flex-col gap-2.5 min-w-0 max-w-full')}
        >
          {currentBlocks.map((block, index) => {
            const meta = getBlockKindMeta(block.kind);
            const blockLabel = getBlockSummaryLabel(block, index);
            const isMenuOpen = effectiveOpenMenuBlockId === block.id;
            const isDragging = draggedIndex === index;
            const isDropTarget = dropTargetIndex === index && draggedIndex !== index;
            const menuId = `${idPrefix}-menu-${block.id}`;
            const isFirst = index === 0;
            const isLast = index === currentBlocks.length - 1;

            const rowTarget = themeProps(
              'block-transform-handle',
              {
                blockId: block.id,
                kind: block.kind,
                menuOpen: isMenuOpen,
                dragging: isDragging,
                dropTarget: isDropTarget,
                disabled,
              },
              'block'
            );

            const rowMerged = mergeProps({
              themeTarget: rowTarget,
              baseClassName: cx(
                'prism-crystal rounded-2xl px-3 py-2.5 flex items-start gap-2.5 min-w-0 max-w-full transition-[color,background-color,border-color,opacity,transform]',
                isMenuOpen && 'z-30',
                isDragging && 'opacity-60 scale-[0.99]',
                disabled && 'opacity-75'
              ),
              baseStyle: isDropTarget
                ? { boxShadow: '0 0 0 2px var(--prism-secondary-main)' }
                : undefined,
            });

            return (
              <li
                key={block.id}
                data-testid={`block-row-${block.id}`}
                draggable={!disabled}
                onDragStart={(event) => handleDragStart(event, index, block)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDragLeave={(event) => handleDragLeave(event, index)}
                onDrop={(event) => handleDrop(event, index)}
                onDragEnd={handleDragEnd}
                {...rowMerged}
              >
                {/* Left-Hand Block Handle Grip + Anchored Transformer Menu */}
                <div className="relative shrink-0 pt-0.5">
                  <button
                    ref={(node) => registerGripNode(block.id, node)}
                    type="button"
                    disabled={disabled}
                    aria-label={`Block actions for ${blockLabel}`}
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    aria-controls={isMenuOpen ? menuId : undefined}
                    data-testid={`block-handle-${block.id}`}
                    onClick={() => {
                      setOpenMenuBlockId(isMenuOpen ? null : block.id);
                    }}
                    onKeyDown={(event) => handleGripKeyDown(event, block, index)}
                    style={{
                      color: isMenuOpen
                        ? 'var(--prism-primary-main)'
                        : 'var(--prism-text-secondary)',
                    }}
                    className={cx(
                      'prism-well prism-focus-ring w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors',
                      !disabled &&
                        'enabled:hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)]'
                    )}
                  >
                    <GripVertical aria-hidden="true" className="w-4 h-4 shrink-0" />
                  </button>

                  {isMenuOpen ? (
                    <div
                      ref={menuRef}
                      id={menuId}
                      role="menu"
                      aria-label={`Transform actions for ${blockLabel}`}
                      data-testid={`block-menu-${block.id}`}
                      onKeyDown={(event) => handleMenuKeyDown(event, block.id)}
                      className={cx(
                        menuClass,
                        'prism-slab absolute left-0 top-full mt-1.5 z-40 w-[min(15rem,calc(100vw-2rem))] p-1.5 flex flex-col gap-0.5'
                      )}
                    >
                      <div
                        aria-hidden="true"
                        className="px-2.5 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider select-none"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        Turn Into
                      </div>

                      {DOC_BLOCK_KINDS.map((kindOption) => {
                        const optionMeta = getBlockKindMeta(kindOption);
                        const isCurrentKind = block.kind === kindOption;
                        return (
                          <button
                            key={kindOption}
                            type="button"
                            role="menuitem"
                            aria-current={isCurrentKind ? 'true' : undefined}
                            data-testid={`block-turn-into-${kindOption}`}
                            data-current={isCurrentKind ? 'true' : undefined}
                            onClick={() => handleTurnInto(block, index, kindOption)}
                            style={{
                              color: 'var(--prism-text-primary)',
                              backgroundColor: isCurrentKind
                                ? 'color-mix(in srgb, var(--prism-secondary-main) 14%, transparent)'
                                : undefined,
                            }}
                            className="prism-focus-ring w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-xs font-medium cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)]"
                          >
                            <span className="inline-flex items-center gap-2 min-w-0">
                              <span style={{ color: optionMeta.accentToken }}>
                                {renderKindIcon(kindOption, 'w-3.5 h-3.5 shrink-0')}
                              </span>
                              <span className="truncate">{optionMeta.label}</span>
                            </span>
                            {isCurrentKind ? (
                              <Check
                                aria-hidden="true"
                                className="w-3.5 h-3.5 shrink-0"
                                style={STYLE_PRIMARY_MAIN}
                              />
                            ) : null}
                          </button>
                        );
                      })}

                      <div
                        role="separator"
                        className="my-1 mx-2 h-px"
                        style={STYLE_BG_DIVIDER}
                      />

                      <div
                        aria-hidden="true"
                        className="px-2.5 pt-0.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider select-none"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        Reorder &amp; Actions
                      </div>

                      <button
                        type="button"
                        role="menuitem"
                        disabled={isFirst}
                        aria-disabled={isFirst ? 'true' : undefined}
                        data-testid="block-action-move-up"
                        onClick={() => moveBlock(index, index - 1, block.id)}
                        style={{
                          color: isFirst
                            ? 'var(--prism-text-disabled)'
                            : 'var(--prism-text-primary)',
                        }}
                        className="prism-focus-ring w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)] transition-colors"
                      >
                        <ArrowUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        <span>Move Up</span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        disabled={isLast}
                        aria-disabled={isLast ? 'true' : undefined}
                        data-testid="block-action-move-down"
                        onClick={() => moveBlock(index, index + 1, block.id)}
                        style={{
                          color: isLast
                            ? 'var(--prism-text-disabled)'
                            : 'var(--prism-text-primary)',
                        }}
                        className="prism-focus-ring w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)] transition-colors"
                      >
                        <ArrowDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        <span>Move Down</span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        data-testid="block-action-duplicate"
                        onClick={() => handleDuplicate(block, index)}
                        style={STYLE_TEXT_PRIMARY}
                        className="prism-focus-ring w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)] transition-colors"
                      >
                        <Copy aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        <span>Duplicate</span>
                      </button>

                      <div
                        role="separator"
                        className="my-1 mx-2 h-px"
                        style={STYLE_BG_DIVIDER}
                      />

                      <button
                        type="button"
                        role="menuitem"
                        data-testid="block-action-delete"
                        onClick={() => handleDelete(block, index)}
                        style={STYLE_ERROR_MAIN}
                        className="prism-focus-ring w-full px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-[color-mix(in_srgb,var(--prism-error-main)_12%,transparent)] transition-colors"
                      >
                        <Trash2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* In-Place Transformed Block Content & Semantic Kind Tag */}
                <div className="flex-1 min-w-0 max-w-full space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <span
                      data-testid={`block-kind-badge-${block.id}`}
                      className="prism-well inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0"
                      style={{ color: meta.accentToken }}
                    >
                      {renderKindIcon(block.kind, 'w-3 h-3 shrink-0')}
                      <span>{meta.shortTag}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-mono text-[10px] tabular-nums shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      #{index + 1}
                    </span>
                  </div>

                  {block.kind === 'heading' ? (
                    <h3
                      data-testid={`block-body-${block.id}`}
                      className="text-base sm:text-lg font-bold tracking-tight leading-snug break-words min-w-0"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {block.text}
                    </h3>
                  ) : block.kind === 'callout' ? (
                    <div
                      data-testid={`block-body-${block.id}`}
                      className="prism-well rounded-xl px-3.5 py-2.5 flex items-start gap-2.5 min-w-0 max-w-full"
                      style={{
                        borderLeft: '3px solid var(--prism-warning-main)',
                        backgroundColor:
                          'color-mix(in srgb, var(--prism-warning-main) 10%, transparent)',
                      }}
                    >
                      <Info
                        aria-hidden="true"
                        className="w-4 h-4 shrink-0 mt-0.5"
                        style={STYLE_WARNING_MAIN}
                      />
                      <p
                        className="text-sm leading-relaxed break-words min-w-0 flex-1"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {block.text}
                      </p>
                    </div>
                  ) : block.kind === 'checklist' ? (
                    <div
                      data-testid={`block-body-${block.id}`}
                      className="flex items-start gap-2.5 min-w-0 max-w-full"
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={Boolean(block.checked)}
                        aria-label={
                          block.checked
                            ? `Mark "${blockLabel}" as incomplete`
                            : `Mark "${blockLabel}" as complete`
                        }
                        disabled={disabled}
                        data-testid={`block-checkbox-${block.id}`}
                        onClick={() => handleToggleChecklist(block, index)}
                        className={cx(
                          'prism-focus-ring mt-0.5 w-5 h-5 rounded-md inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors',
                          block.checked ? 'prism-emerald' : 'prism-well'
                        )}
                      >
                        {block.checked ? (
                          <Check aria-hidden="true" className="w-3.5 h-3.5" />
                        ) : null}
                      </button>
                      <span
                        className={cx(
                          'text-sm leading-relaxed break-words min-w-0 flex-1 transition-opacity',
                          block.checked && 'line-through opacity-65'
                        )}
                        style={{
                          color: block.checked
                            ? 'var(--prism-text-secondary)'
                            : 'var(--prism-text-primary)',
                        }}
                      >
                        {block.text}
                      </span>
                    </div>
                  ) : block.kind === 'quote' ? (
                    <blockquote
                      data-testid={`block-body-${block.id}`}
                      className="pl-3.5 py-0.5 italic text-sm leading-relaxed break-words min-w-0"
                      style={{
                        borderLeft: '3px solid var(--prism-secondary-main)',
                        color: 'var(--prism-text-secondary)',
                      }}
                    >
                      {block.text}
                    </blockquote>
                  ) : block.kind === 'code' ? (
                    <pre
                      data-testid={`block-body-${block.id}`}
                      className="prism-well rounded-xl px-3.5 py-2.5 text-xs leading-relaxed overflow-x-auto max-w-full whitespace-pre-wrap break-words"
                      style={{
                        fontFamily: 'var(--prism-font-mono)',
                        color: 'var(--prism-text-primary)',
                        borderLeft: '3px solid var(--prism-info-main)',
                      }}
                    >
                      <code>{block.text}</code>
                    </pre>
                  ) : (
                    <p
                      data-testid={`block-body-${block.id}`}
                      className="text-sm leading-relaxed break-words min-w-0"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {block.text}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export const BlockTransformHandle = memo(BlockTransformHandleInner);
BlockTransformHandle.displayName = 'BlockTransformHandle';
