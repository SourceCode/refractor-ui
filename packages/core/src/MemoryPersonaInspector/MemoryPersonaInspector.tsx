'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Brain, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BG_DIVIDER, STYLE_BORDER_DIVIDER, STYLE_ERROR_MAIN, STYLE_PRIMARY_CONTRAST, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type MemoryCategory = 'fact' | 'preference' | 'rule';

export interface AgentMemoryItem {
  /** Unique identifier for this stored memory entry. */
  id: string;
  /** Literal memory statement stored in agent context. */
  content: string;
  /** Semantic memory classification ('fact' | 'preference' | 'rule'). */
  category: MemoryCategory;
  /** Optional formatted timestamp showing when this memory was last updated. */
  updatedAt?: string;
}

export type MemoryPersonaMode = 'inline' | 'drawer';

export interface MemoryPersonaInspectorProps extends BaseProps<HTMLDivElement> {
  /** Controlled list of stored agent memories. */
  memories?: AgentMemoryItem[];
  /** Initial memories when operating in uncontrolled mode. */
  defaultMemories?: AgentMemoryItem[];
  /** Callback fired whenever memories are added, edited, or forgotten. */
  onMemoriesChange?: (items: AgentMemoryItem[]) => void;
  /** Layout presentation: embedded 'inline' slab or right-anchored overlay 'drawer' (defaults to 'inline'). */
  mode?: MemoryPersonaMode;
  /** Controlled visibility when mode is 'drawer'. */
  open?: boolean;
  /** Initial visibility in uncontrolled drawer mode (defaults to true). */
  defaultOpen?: boolean;
  /** Callback invoked when drawer visibility changes (Escape, backdrop click, or close button). */
  onOpenChange?: (open: boolean) => void;
  /** Heading rendered at the top of the inspector (defaults to 'Memory & Persona'). */
  title?: string;
  /** Prevents inline editing, forgetting, and adding memories (defaults to false). */
  readOnly?: boolean;
}

type MemoryFilter = 'all' | MemoryCategory;

interface MemoryCounts {
  all: number;
  fact: number;
  preference: number;
  rule: number;
}

interface FilterOptionMeta {
  key: MemoryFilter;
  label: string;
}

interface CategoryVisualMeta {
  label: string;
  badgeClass: string;
}

const DEFAULT_TITLE = 'Memory & Persona';
const EMPTY_MEMORIES: AgentMemoryItem[] = [];

const FILTER_OPTIONS: ReadonlyArray<FilterOptionMeta> = [
  { key: 'all', label: 'All' },
  { key: 'fact', label: 'Facts' },
  { key: 'preference', label: 'Preferences' },
  { key: 'rule', label: 'Rules' },
];

function getCategoryMeta(category: MemoryCategory): CategoryVisualMeta {
  switch (category) {
    case 'fact':
      return { label: 'Fact', badgeClass: 'prism-btn-secondary' };
    case 'preference':
      return { label: 'Preference', badgeClass: 'prism-btn-primary' };
    case 'rule':
      return { label: 'Rule', badgeClass: 'prism-emerald' };
  }
}

function getFilterCount(counts: MemoryCounts, filter: MemoryFilter): number {
  switch (filter) {
    case 'all':
      return counts.all;
    case 'fact':
      return counts.fact;
    case 'preference':
      return counts.preference;
    case 'rule':
      return counts.rule;
  }
}

function parseMemoryCategory(raw: string): MemoryCategory {
  if (raw === 'preference' || raw === 'rule') {
    return raw;
  }
  return 'fact';
}

function MemoryPersonaInspectorInner({
  memories,
  defaultMemories = EMPTY_MEMORIES,
  onMemoriesChange,
  mode = 'inline',
  open,
  defaultOpen = true,
  onOpenChange,
  title = DEFAULT_TITLE,
  readOnly = false,
  onClick,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MemoryPersonaInspectorProps) {
  const titleId = useId();
  const categorySelectId = useId();
  const addInputId = useId();
  const nextIdRef = useRef<number>(1);
  const override = useComponentOverride('MemoryPersonaInspector');

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [currentMemories, setCurrentMemories] = useControllableState<AgentMemoryItem[]>({
    value: memories,
    defaultValue: defaultMemories,
    onChange: onMemoriesChange,
  });

  const [activeFilter, setActiveFilter] = useState<MemoryFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');
  const [draftCategory, setDraftCategory] = useState<MemoryCategory>('fact');
  const [draftContent, setDraftContent] = useState<string>('');

  useEffect(() => {
    if (mode !== 'drawer' || !isOpen) return;

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing && editingId === null) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [mode, isOpen, editingId, setIsOpen]);

  const counts = useMemo<MemoryCounts>(() => {
    const result: MemoryCounts = {
      all: currentMemories.length,
      fact: 0,
      preference: 0,
      rule: 0,
    };
    for (const item of currentMemories) {
      switch (item.category) {
        case 'fact':
          result.fact += 1;
          break;
        case 'preference':
          result.preference += 1;
          break;
        case 'rule':
          result.rule += 1;
          break;
      }
    }
    return result;
  }, [currentMemories]);

  const filteredMemories = useMemo<AgentMemoryItem[]>(
    () =>
      activeFilter === 'all'
        ? currentMemories
        : currentMemories.filter((item) => item.category === activeFilter),
    [currentMemories, activeFilter]
  );

  const startEdit = useCallback((item: AgentMemoryItem) => {
    setEditingId(item.id);
    setEditDraft(item.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft('');
  }, []);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editDraft.trim();
    if (!trimmed || editingId === null) return;
    const next = currentMemories.map((item) =>
      item.id === editingId ? { ...item, content: trimmed } : item
    );
    setCurrentMemories(next);
    setEditingId(null);
    setEditDraft('');
  }, [currentMemories, editDraft, editingId, setCurrentMemories]);

  const handleForget = useCallback(
    (targetId: string) => {
      setCurrentMemories(currentMemories.filter((item) => item.id !== targetId));
    },
    [currentMemories, setCurrentMemories]
  );

  const handleAddMemory = useCallback(() => {
    const trimmed = draftContent.trim();
    if (!trimmed) return;

    const existingIds = new Set(currentMemories.map((item) => item.id));
    let nextNumber = nextIdRef.current;
    while (existingIds.has(`memory-${nextNumber}`)) {
      nextNumber += 1;
    }
    nextIdRef.current = nextNumber + 1;

    const created: AgentMemoryItem = {
      id: `memory-${nextNumber}`,
      content: trimmed,
      category: draftCategory,
      updatedAt: 'Just now',
    };

    setCurrentMemories([...currentMemories, created]);
    setDraftContent('');
  }, [currentMemories, draftCategory, draftContent, setCurrentMemories]);

  if (mode === 'drawer' && !isOpen) {
    return null;
  }

  const merged = mergeProps({
    themeTarget: themeProps('memory-persona-inspector', {
      mode,
      open: mode === 'drawer' ? isOpen : true,
      readOnly,
      filter: activeFilter,
    }),
    baseClassName:
      mode === 'drawer'
        ? 'fixed inset-0 z-50 prism-backdrop-scrim flex justify-end'
        : 'prism-slab w-full flex flex-col overflow-hidden',
    baseStyle: mode === 'drawer' ? STYLE_BG_DIVIDER : undefined,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const panelContent = (
    <>
      <div
        className="px-5 py-4 flex items-center justify-between gap-3 border-b"
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Brain className="w-4 h-4 shrink-0" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <h2
              id={titleId}
              className="text-base font-semibold truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </h2>
            <span
              data-testid="memory-total-count"
              className="prism-well px-2.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-medium shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {counts.all}
            </span>
            {readOnly ? (
              <span
                data-testid="memory-readonly-badge"
                className="prism-well px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                Read-only
              </span>
            ) : null}
          </div>
        </div>

        {mode === 'drawer' ? (
          <button
            type="button"
            aria-label="Close memory inspector"
            onClick={() => setIsOpen(false)}
            className="prism-focus-ring rounded-lg p-1.5 cursor-pointer enabled:hover:opacity-100 opacity-75 transition-opacity"
            style={STYLE_TEXT_SECONDARY}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div
        className="px-5 py-3 border-b flex flex-wrap items-center gap-1.5"
        style={STYLE_BORDER_DIVIDER}
        role="group"
        aria-label="Filter memories by category"
      >
        {FILTER_OPTIONS.map((filter) => {
          const isActive = activeFilter === filter.key;
          const count = getFilterCount(counts, filter.key);

          return (
            <button
              key={filter.key}
              type="button"
              aria-pressed={isActive}
              data-testid={`memory-filter-${filter.key}`}
              onClick={() => setActiveFilter(filter.key)}
              className={cx(
                isActive ? 'prism-btn-primary' : 'prism-crystal',
                'prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]'
              )}
              style={isActive ? undefined : STYLE_TEXT_PRIMARY}
            >
              <span className="relative z-10">{filter.label}</span>
              <span
                data-testid={`memory-filter-count-${filter.key}`}
                className={cx(
                  'relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums leading-none',
                  isActive ? '' : 'prism-well'
                )}
                style={
                  isActive
                    ? STYLE_PRIMARY_CONTRAST
                    : STYLE_TEXT_SECONDARY
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        {filteredMemories.length === 0 ? (
          <div
            data-testid="memory-empty-state"
            className="prism-well rounded-2xl px-5 py-8 text-center flex flex-col items-center gap-2"
          >
            <Brain
              aria-hidden="true"
              className="w-6 h-6 opacity-60"
              style={STYLE_TEXT_SECONDARY}
            />
            <p
              className="text-sm font-semibold"
              style={STYLE_TEXT_PRIMARY}
            >
              {currentMemories.length === 0 ? 'No memories stored yet' : 'No matching memories'}
            </p>
            <p
              className="text-xs leading-relaxed"
              style={STYLE_TEXT_SECONDARY}
            >
              {currentMemories.length === 0
                ? readOnly
                  ? 'No agent memories are available to inspect.'
                  : 'Add a fact, preference, or rule below to persist guidance.'
                : 'No stored items match the selected category filter.'}
            </p>
          </div>
        ) : (
          <ul aria-label="Stored memories" className="space-y-2.5">
            {filteredMemories.map((item) => {
              const meta = getCategoryMeta(item.category);
              const isEditing = !readOnly && editingId === item.id;

              return (
                <li
                  key={item.id}
                  data-testid={`memory-item-${item.id}`}
                  data-category={item.category}
                  className="prism-crystal rounded-2xl p-3.5 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        data-testid={`memory-category-${item.id}`}
                        data-category={item.category}
                        className={cx(
                          meta.badgeClass,
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap'
                        )}
                      >
                        <span className="relative z-10">{meta.label}</span>
                      </span>

                      {item.updatedAt ? (
                        <span
                          data-testid={`memory-updated-${item.id}`}
                          className="text-[11px] font-mono tabular-nums"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {item.updatedAt}
                        </span>
                      ) : null}
                    </div>

                    {!readOnly && !isEditing ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          aria-label={`Edit memory ${item.id}`}
                          onClick={() => startEdit(item)}
                          className="prism-well prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          <Pencil className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          aria-label={`Forget memory ${item.id}`}
                          onClick={() => handleForget(item.id)}
                          className="prism-well prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                          style={STYLE_ERROR_MAIN}
                        >
                          <Trash2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>Forget</span>
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        aria-label="Edit memory content"
                        data-testid={`memory-edit-input-${item.id}`}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing) return;
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEdit();
                          }
                        }}
                        className="prism-well prism-focus-ring w-full h-9 px-3 rounded-xl text-xs focus:outline-none"
                        style={STYLE_TEXT_PRIMARY}
                      />

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center justify-center text-xs font-semibold whitespace-nowrap cursor-pointer"
                        >
                          <span className="relative z-10">Cancel</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="prism-btn-primary prism-focus-ring h-8 px-3 inline-flex items-center justify-center gap-1 text-xs font-semibold whitespace-nowrap cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 relative z-10 shrink-0" aria-hidden="true" />
                          <span className="relative z-10">Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      data-testid={`memory-content-${item.id}`}
                      className="text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {item.content}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!readOnly ? (
        <div
          data-testid="memory-add-row"
          className="px-5 py-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          style={STYLE_BORDER_DIVIDER}
        >
          <select
            id={categorySelectId}
            aria-label="Memory category"
            value={draftCategory}
            onChange={(e) => setDraftCategory(parseMemoryCategory(e.target.value))}
            className="prism-well prism-focus-ring h-9 px-3 rounded-full text-xs font-semibold cursor-pointer shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <option value="fact">Fact</option>
            <option value="preference">Preference</option>
            <option value="rule">Rule</option>
          </select>

          <input
            id={addInputId}
            type="text"
            aria-label="Add memory"
            placeholder="Add a fact, preference, or rule..."
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleAddMemory();
              }
            }}
            className="prism-well prism-focus-ring flex-1 min-w-0 h-9 px-3.5 rounded-full text-xs focus:outline-none"
            style={STYLE_TEXT_PRIMARY}
          />

          <button
            type="button"
            onClick={handleAddMemory}
            className="prism-btn-primary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 relative z-10 shrink-0" aria-hidden="true" />
            <span className="relative z-10">Add</span>
          </button>
        </div>
      ) : null}
    </>
  );

  if (mode === 'inline') {
    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        onClick={onClick}
        {...rest}
        {...merged}
      >
        {panelContent}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={composeEventHandlers(onClick, () => setIsOpen(false))}
      {...rest}
      {...merged}
    >
      <div
        data-testid="memory-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        className="prism-slab ml-auto h-full w-full max-w-md rounded-l-[28px] rounded-r-none flex flex-col overflow-hidden"
      >
        {panelContent}
      </div>
    </div>
  );
}

export const MemoryPersonaInspector = /*#__PURE__*/ memoWithDisplayName(MemoryPersonaInspectorInner, 'MemoryPersonaInspector');
