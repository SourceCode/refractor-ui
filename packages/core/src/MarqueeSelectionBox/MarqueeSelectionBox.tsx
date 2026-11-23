'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  BoxSelect,
  Check,
  CheckSquare,
  FileCode,
  FileImage,
  FileText,
  Folder,
  Inbox,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type MarqueeSelectableItemKind = 'image' | 'code' | 'document' | 'folder';

export interface MarqueeSelectableItem {
  /** Unique stable identifier for the selectable file or folder tile. */
  id: string;
  /** Visible file or directory name rendered safely as literal text. */
  name: string;
  /** Semantic file kind driving icon glyph, label, and optical accent token. */
  kind: MarqueeSelectableItemKind;
  /** Human-readable file size or item count badge (e.g. `'2.4 MB'`, `'14 items'`). */
  sizeLabel: string;
}

type MarqueeSelectionBoxBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface MarqueeSelectionBoxProps extends MarqueeSelectionBoxBaseProps {
  /** Panel header title and accessible region/listbox heading (defaults to `'Optical Marquee Selection'`). */
  title?: string;
  /** Selectable file and folder items; defaults to an 8-item realistic workspace grid. Pass `[]` for an empty state. */
  items?: ReadonlyArray<MarqueeSelectableItem>;
  /** Controlled array of selected item IDs. */
  selectedIds?: ReadonlyArray<string>;
  /** Initial uncontrolled array of selected item IDs (defaults to `[]`). */
  defaultSelectedIds?: ReadonlyArray<string>;
  /** Callback invoked whenever the normalized selection array changes via click, lasso drag, button, or keyboard. */
  onSelectionChange?: (selectedIds: ReadonlyArray<string>) => void;
  /** Disables tile clicking, marquee pointer dragging, keyboard navigation, and header bulk actions. */
  disabled?: boolean;
}

interface MarqueeKindMeta {
  label: string;
  colorToken: string;
}

interface LassoRect {
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

const DEFAULT_TITLE = 'Optical Marquee Selection';
const DEFAULT_GRID_COLUMNS = 4;
const DRAG_ACTIVATION_THRESHOLD_PX = 4;
const EMPTY_IDS: ReadonlyArray<string> = [];

const DEFAULT_ITEMS: ReadonlyArray<MarqueeSelectableItem> = [
  { id: 'hero-prism', name: 'Hero_Prism.png', kind: 'image', sizeLabel: '2.4 MB' },
  { id: 'optical-tokens', name: 'OpticalTokens.ts', kind: 'code', sizeLabel: '18 KB' },
  { id: 'release-notes', name: 'ReleaseNotes.md', kind: 'document', sizeLabel: '6.2 KB' },
  { id: 'shaders', name: 'Shaders', kind: 'folder', sizeLabel: '14 items' },
  { id: 'caustic-pass', name: 'CausticPass.glsl', kind: 'code', sizeLabel: '9.4 KB' },
  { id: 'budget-q4', name: 'Budget_Q4.csv', kind: 'document', sizeLabel: '42 KB' },
  { id: 'audio-master', name: 'AudioMaster.wav', kind: 'document', sizeLabel: '14.8 MB' },
  { id: 'archive-zip', name: 'Archive.zip', kind: 'document', sizeLabel: '38.6 MB' },
];

const KIND_META: Readonly<Record<MarqueeSelectableItemKind, MarqueeKindMeta>> = {
  image: { label: 'Image', colorToken: 'var(--prism-success-main)' },
  code: { label: 'Code', colorToken: 'var(--prism-info-main)' },
  document: { label: 'Document', colorToken: 'var(--prism-secondary-dark)' },
  folder: { label: 'Folder', colorToken: 'var(--prism-warning-main)' },
};

function renderKindIcon(kind: MarqueeSelectableItemKind, colorToken: string) {
  const iconStyle = { color: colorToken };
  switch (kind) {
    case 'image':
      return <FileImage aria-hidden="true" className="w-4 h-4 shrink-0" style={iconStyle} />;
    case 'code':
      return <FileCode aria-hidden="true" className="w-4 h-4 shrink-0" style={iconStyle} />;
    case 'folder':
      return <Folder aria-hidden="true" className="w-4 h-4 shrink-0" style={iconStyle} />;
    default:
      return <FileText aria-hidden="true" className="w-4 h-4 shrink-0" style={iconStyle} />;
  }
}

function normalizeSelection(
  ids: ReadonlyArray<string>,
  items: ReadonlyArray<MarqueeSelectableItem>
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

function arraysEqual(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function clampCoord(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rectsIntersect(a: ClientRectBox, b: ClientRectBox): boolean {
  if (b.right <= b.left || b.bottom <= b.top) return false;
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function resolveGridColumns(
  itemCount: number,
  tileNodes: Map<string, HTMLDivElement>
): number {
  if (itemCount <= 1) return 1;
  let firstTop: number | null = null;
  let columns = 0;
  for (const node of tileNodes.values()) {
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) {
      return DEFAULT_GRID_COLUMNS;
    }
    if (firstTop === null) {
      firstTop = rect.top;
      columns = 1;
    } else if (Math.abs(rect.top - firstTop) <= 4) {
      columns += 1;
    } else {
      break;
    }
  }
  return columns;
}

function itemIdAt(items: ReadonlyArray<MarqueeSelectableItem>, index: number): string {
  const bounded = clampCoord(index, 0, items.length - 1);
  return items[bounded]!.id;
}

function formatSelectionSummary(
  selectedItems: ReadonlyArray<MarqueeSelectableItem>,
  totalCount: number
): string {
  if (totalCount === 0) {
    return 'No items available in this folder.';
  }
  if (selectedItems.length === 0) {
    return `0 of ${totalCount} selected. Drag across the grid to lasso or use arrow keys and Space to select.`;
  }
  const previewNames = selectedItems
    .slice(0, 3)
    .map((item) => item.name)
    .join(', ');
  if (selectedItems.length <= 3) {
    return `${selectedItems.length} of ${totalCount} selected: ${previewNames}.`;
  }
  return `${selectedItems.length} of ${totalCount} selected: ${previewNames}, and ${selectedItems.length - 3} more.`;
}

function MarqueeSelectionBoxInner({
  title = DEFAULT_TITLE,
  items = DEFAULT_ITEMS,
  selectedIds,
  defaultSelectedIds = EMPTY_IDS,
  onSelectionChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MarqueeSelectionBoxProps) {
  const override = useComponentOverride('MarqueeSelectionBox');
  const titleId = useId();

  const isControlled = selectedIds !== undefined;
  const [uncontrolledSelected, setUncontrolledSelected] = useState<string[]>(() =>
    normalizeSelection(defaultSelectedIds, items)
  );

  const currentSelectedIds = useMemo(
    () => normalizeSelection(isControlled ? selectedIds : uncontrolledSelected, items),
    [isControlled, items, selectedIds, uncontrolledSelected]
  );

  const selectedSet = useMemo(() => new Set(currentSelectedIds), [currentSelectedIds]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedSet.has(item.id)),
    [items, selectedSet]
  );

  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const safeFocusedIndex = items.length === 0 ? 0 : Math.min(focusedIndex, items.length - 1);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lassoRect, setLassoRect] = useState<LassoRect | null>(null);

  const tileNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const cleanupPointerRef = useRef<(() => void) | null>(null);
  const suppressClickItemIdRef = useRef<string | null>(null);

  const latestRef = useRef({
    currentSelectedIds,
    isControlled,
    items,
    onSelectionChange,
  });
  latestRef.current = {
    currentSelectedIds,
    isControlled,
    items,
    onSelectionChange,
  };

  const setTileRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      tileNodesRef.current.set(id, node);
    } else {
      tileNodesRef.current.delete(id);
    }
  }, []);

  const abortActiveDrag = useCallback(() => {
    cleanupPointerRef.current?.();
    suppressClickItemIdRef.current = null;
    setIsDragging(false);
    setLassoRect(null);
  }, []);

  useEffect(() => {
    if (disabled || items.length === 0) {
      abortActiveDrag();
    }
  }, [abortActiveDrag, disabled, items.length]);

  useEffect(() => {
    return () => {
      cleanupPointerRef.current?.();
    };
  }, []);

  const commitSelection = useCallback(
    (nextIds: ReadonlyArray<string>) => {
      const normalized = normalizeSelection(nextIds, items);
      if (arraysEqual(currentSelectedIds, normalized)) return;
      if (!isControlled) {
        setUncontrolledSelected(normalized);
      }
      onSelectionChange?.(normalized);
    },
    [currentSelectedIds, isControlled, items, onSelectionChange]
  );

  const handleSelectAll = useCallback(() => {
    commitSelection(items.map((item) => item.id));
  }, [commitSelection, items]);

  const handleClear = useCallback(() => {
    commitSelection(EMPTY_IDS);
  }, [commitSelection]);

  const handleItemClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>, itemId: string, index: number) => {
      if (disabled) return;
      if (suppressClickItemIdRef.current === itemId) {
        suppressClickItemIdRef.current = null;
        return;
      }
      suppressClickItemIdRef.current = null;
      setFocusedIndex(index);

      const isToggleModifier = event.ctrlKey || event.metaKey || event.shiftKey;
      if (isToggleModifier) {
        const nextIds = selectedSet.has(itemId)
          ? currentSelectedIds.filter((id) => id !== itemId)
          : [...currentSelectedIds, itemId];
        commitSelection(nextIds);
      } else {
        commitSelection([itemId]);
      }
    },
    [commitSelection, currentSelectedIds, disabled, selectedSet]
  );

  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0) return;

      cleanupPointerRef.current?.();
      suppressClickItemIdRef.current = null;

      const stageEl = event.currentTarget;
      const optionEl = (event.target as HTMLElement).closest('[role="option"]');
      const startedOnOption = optionEl !== null;
      const startedOptionId = optionEl?.getAttribute('data-item-id') ?? null;

      if (!startedOnOption) {
        event.preventDefault();
      }

      const additive = event.shiftKey || event.ctrlKey || event.metaKey;
      const baseSelection = additive ? [...latestRef.current.currentSelectedIds] : [];
      const startClientX = event.clientX;
      const startClientY = event.clientY;

      let lassoActive = !startedOnOption;
      let didMove = false;
      let workingSelection = latestRef.current.currentSelectedIds;

      const applyDragSelection = (nextIds: ReadonlyArray<string>) => {
        const normalized = normalizeSelection(nextIds, latestRef.current.items);
        if (arraysEqual(workingSelection, normalized)) return;
        workingSelection = normalized;
        if (!latestRef.current.isControlled) {
          setUncontrolledSelected(normalized);
        }
        latestRef.current.onSelectionChange?.(normalized);
      };

      const computeStageClampedPoint = (
        clientX: number,
        clientY: number,
        stageRect: DOMRect
      ) => {
        const hasBounds = stageRect.width > 0 && stageRect.height > 0;
        return {
          x: hasBounds ? clampCoord(clientX, stageRect.left, stageRect.right) : clientX,
          y: hasBounds ? clampCoord(clientY, stageRect.top, stageRect.bottom) : clientY,
        };
      };

      const updateLasso = (currentClientX: number, currentClientY: number) => {
        const stageRect = stageEl.getBoundingClientRect();
        const start = computeStageClampedPoint(startClientX, startClientY, stageRect);
        const end = computeStageClampedPoint(currentClientX, currentClientY, stageRect);

        const boxLeft = Math.min(start.x, end.x);
        const boxRight = Math.max(start.x, end.x);
        const boxTop = Math.min(start.y, end.y);
        const boxBottom = Math.max(start.y, end.y);

        setLassoRect({
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

        const intersectedIds: string[] = [];
        for (const [id, tileNode] of tileNodesRef.current) {
          if (rectsIntersect(lassoBox, tileNode.getBoundingClientRect())) {
            intersectedIds.push(id);
          }
        }

        const combined = additive ? [...baseSelection, ...intersectedIds] : intersectedIds;
        applyDragSelection(combined);
      };

      if (lassoActive) {
        const initialRect = stageEl.getBoundingClientRect();
        const origin = computeStageClampedPoint(startClientX, startClientY, initialRect);
        setIsDragging(true);
        setLassoRect({
          left: Math.round(origin.x - initialRect.left),
          top: Math.round(origin.y - initialRect.top),
          width: 0,
          height: 0,
        });
      }

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const distance = Math.hypot(
          moveEvent.clientX - startClientX,
          moveEvent.clientY - startClientY
        );
        if (!lassoActive) {
          if (distance < DRAG_ACTIVATION_THRESHOLD_PX) return;
          lassoActive = true;
          suppressClickItemIdRef.current = startedOptionId;
          setIsDragging(true);
        }
        didMove = true;
        updateLasso(moveEvent.clientX, moveEvent.clientY);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerCancel);
        cleanupPointerRef.current = null;
      };

      const handlePointerUp = () => {
        cleanup();
        setIsDragging(false);
        setLassoRect(null);
        if (!startedOnOption && !didMove && !additive) {
          applyDragSelection(EMPTY_IDS);
        }
      };

      const handlePointerCancel = () => {
        cleanup();
        setIsDragging(false);
        setLassoRect(null);
        suppressClickItemIdRef.current = null;
      };

      cleanupPointerRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerCancel);
    },
    [disabled]
  );

  const handleStageKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing || items.length === 0) return;

      const lowerKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if ((event.ctrlKey || event.metaKey) && lowerKey === 'a') {
        event.preventDefault();
        commitSelection(items.map((item) => item.id));
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        abortActiveDrag();
        commitSelection(EMPTY_IDS);
        return;
      }

      const optionEl = (event.target as HTMLElement).closest('[data-item-index]');
      const rawIndex = optionEl?.getAttribute('data-item-index');
      const currentIndex = rawIndex
        ? clampCoord(Number(rawIndex), 0, items.length - 1)
        : safeFocusedIndex;

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        const targetId = itemIdAt(items, currentIndex);
        const nextIds = selectedSet.has(targetId)
          ? currentSelectedIds.filter((id) => id !== targetId)
          : [...currentSelectedIds, targetId];
        commitSelection(nextIds);
        return;
      }

      const columns = resolveGridColumns(items.length, tileNodesRef.current);
      let nextIndex: number;

      if (event.key === 'ArrowRight') {
        nextIndex = Math.min(items.length - 1, currentIndex + 1);
      } else if (event.key === 'ArrowLeft') {
        nextIndex = Math.max(0, currentIndex - 1);
      } else if (event.key === 'ArrowDown') {
        nextIndex = Math.min(items.length - 1, currentIndex + columns);
      } else if (event.key === 'ArrowUp') {
        nextIndex = Math.max(0, currentIndex - columns);
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = items.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      setFocusedIndex(nextIndex);
      tileNodesRef.current.get(itemIdAt(items, nextIndex))?.focus();
    },
    [
      abortActiveDrag,
      commitSelection,
      currentSelectedIds,
      disabled,
      items,
      safeFocusedIndex,
      selectedSet,
    ]
  );

  const selectedCount = currentSelectedIds.length;
  const totalCount = items.length;
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const liveSummaryText = formatSelectionSummary(selectedItems, totalCount);

  const merged = mergeProps({
    themeTarget: themeProps('marquee-selection-box', {
      disabled,
      dragging: isDragging,
      empty: totalCount === 0,
      hasSelection: selectedCount > 0,
    }),
    baseClassName: 'prism-slab w-full max-w-full p-4 sm:p-5 space-y-4 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('marquee-selection-box', 'header');
  const stageClass = stableClassName('marquee-selection-box', 'stage');
  const tileClass = stableClassName('marquee-selection-box', 'tile');
  const lassoClass = stableClassName('marquee-selection-box', 'lasso');
  const footerClass = stableClassName('marquee-selection-box', 'footer');

  return (
    <div ref={ref} role="region" aria-labelledby={titleId} {...rest} {...merged}>
      {/* Header Toolbar */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex items-center gap-2 min-w-0">
          <BoxSelect
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color:
                isDragging || selectedCount > 0
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-secondary)',
            }}
          />
          <h3
            id={titleId}
            data-testid="marquee-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            data-testid="marquee-selection-count"
            className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  selectedCount > 0 ? 'var(--prism-primary-main)' : 'var(--prism-text-disabled)',
              }}
            />
            <span>
              {selectedCount} of {totalCount} selected
            </span>
          </span>

          <button
            type="button"
            disabled={disabled || totalCount === 0 || allSelected}
            data-testid="marquee-select-all"
            onClick={handleSelectAll}
            className={cx(
              'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed shrink-0',
              disabled || totalCount === 0 || allSelected ? 'opacity-50' : ''
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <CheckSquare aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Select All</span>
          </button>

          <button
            type="button"
            disabled={disabled || selectedCount === 0}
            data-testid="marquee-clear"
            onClick={handleClear}
            className={cx(
              'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed shrink-0',
              disabled || selectedCount === 0 ? 'opacity-50' : ''
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Marquee Selection Stage or Empty State */}
      {totalCount === 0 ? (
        <div
          role="status"
          data-testid="marquee-empty"
          className={cx(
            stageClass,
            'prism-well rounded-2xl px-4 py-8 flex flex-col items-center justify-center text-center gap-2 min-w-0'
          )}
        >
          <Inbox
            aria-hidden="true"
            className="w-7 h-7"
            style={STYLE_TEXT_DISABLED}
          />
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            No selectable files
          </p>
          <p className="text-xs max-w-sm" style={STYLE_TEXT_SECONDARY}>
            Provide file or folder entries to enable optical lasso marquee selection.
          </p>
        </div>
      ) : (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={titleId}
          aria-disabled={disabled || undefined}
          data-testid="marquee-stage"
          data-dragging={isDragging ? 'true' : undefined}
          onPointerDown={handleStagePointerDown}
          onKeyDown={handleStageKeyDown}
          style={{ touchAction: 'none' }}
          className={cx(
            stageClass,
            'prism-well relative rounded-2xl p-3 sm:p-4 min-w-0 max-w-full overflow-hidden touch-none',
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-crosshair'
          )}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
            {items.map((item, idx) => {
              const isSelected = selectedSet.has(item.id);
              const meta = KIND_META[item.kind];

              return (
                <div
                  key={item.id}
                  ref={(node) => setTileRef(item.id, node)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={disabled || undefined}
                  tabIndex={disabled ? -1 : idx === safeFocusedIndex ? 0 : -1}
                  data-testid={`marquee-item-${item.id}`}
                  data-item-id={item.id}
                  data-item-index={String(idx)}
                  data-selected={isSelected ? 'true' : undefined}
                  onClick={(event) => handleItemClick(event, item.id, idx)}
                  onFocus={() => setFocusedIndex(idx)}
                  className={cx(
                    tileClass,
                    'prism-crystal prism-focus-ring relative flex flex-col justify-between gap-2.5 rounded-xl p-3 min-w-0 text-left border transition-colors',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                  style={{
                    borderColor: isSelected
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-divider)',
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)'
                      : undefined,
                    boxShadow: isSelected ? '0 0 0 1px var(--prism-primary-main)' : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--prism-well-start) 75%, transparent)',
                        border: '1px solid var(--prism-divider)',
                      }}
                    >
                      {renderKindIcon(item.kind, meta.colorToken)}
                    </span>

                    <span
                      aria-hidden="true"
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full border shrink-0 transition-colors"
                      style={{
                        borderColor: isSelected
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-well-border)',
                        backgroundColor: isSelected
                          ? 'var(--prism-primary-main)'
                          : 'transparent',
                        color: isSelected
                          ? 'var(--prism-primary-contrast)'
                          : 'transparent',
                      }}
                    >
                      {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div
                      className="text-xs font-semibold truncate"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {item.name}
                    </div>
                    <div
                      className="flex items-center justify-between gap-1.5 text-[11px] min-w-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      <span className="truncate">{meta.label}</span>
                      <span className="tabular-nums shrink-0">{item.sizeLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {lassoRect && (
            <div
              aria-hidden="true"
              data-testid="marquee-lasso-rect"
              className={cx(lassoClass, 'pointer-events-none absolute rounded-lg border-2')}
              style={{
                left: `${lassoRect.left}px`,
                top: `${lassoRect.top}px`,
                width: `${lassoRect.width}px`,
                height: `${lassoRect.height}px`,
                borderColor: 'var(--prism-primary-main)',
                backgroundColor: 'color-mix(in srgb, var(--prism-primary-main) 18%, transparent)',
              }}
            />
          )}
        </div>
      )}

      {/* Polite Live Selection Summary Footer */}
      <div
        className={cx(
          footerClass,
          'flex flex-wrap items-center justify-between gap-2 text-xs min-w-0'
        )}
      >
        <p
          data-testid="marquee-live-summary"
          aria-live="polite"
          aria-atomic="true"
          className="min-w-0 truncate"
          style={STYLE_TEXT_SECONDARY}
        >
          {liveSummaryText}
        </p>
        <span
          className="text-[11px] shrink-0"
          style={STYLE_TEXT_DISABLED}
        >
          Drag to lasso · Shift/Ctrl+Click · Ctrl+A · Esc
        </span>
      </div>
    </div>
  );
}

export const MarqueeSelectionBox = memo(MarqueeSelectionBoxInner);
MarqueeSelectionBox.displayName = 'MarqueeSelectionBox';
