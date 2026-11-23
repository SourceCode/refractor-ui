'use client';

import { memo, useMemo, type ReactNode } from 'react';
import {
  Code2,
  FileCode,
  Folder,
  Link2,
  Paperclip,
  Pin,
  PinOff,
  Plus,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_SECONDARY_MAIN, STYLE_SUCCESS_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type AttachedContextKind = 'file' | 'folder' | 'url' | 'snippet';

export interface AttachedContextItem {
  /** Stable unique identifier for the attached context item. */
  id: string;
  /** Literal display label (file path, folder name, URL host, or snippet title). */
  label: string;
  /** Semantic source kind selecting the chip's optical icon and accent token. */
  kind: AttachedContextKind;
  /** Optional finite non-negative token estimate for this item. */
  tokens?: number;
  /** Whether the context item is pinned in the active prompt budget. */
  pinned?: boolean;
}

export interface AttachedContextBarProps extends BaseProps<HTMLDivElement> {
  /** Controlled list of attached context items. */
  items?: AttachedContextItem[];
  /** Initial list of attached context items when operating in uncontrolled mode. */
  defaultItems?: AttachedContextItem[];
  /** Callback fired with the updated array whenever an item is pinned, unpinned, or removed. */
  onItemsChange?: (items: AttachedContextItem[]) => void;
  /** Callback fired with the removed item's id when its Remove button is activated. */
  onRemove?: (id: string) => void;
  /** Callback fired with the item's id and next pinned boolean when Pin/Unpin is toggled. */
  onTogglePin?: (id: string, pinned: boolean) => void;
  /** Optional click handler that reveals the "+ Attach Context" crystal trigger button. */
  onAddClick?: () => void;
  /** Label rendered inside the optional add trigger button (defaults to 'Attach Context'). */
  addLabel?: string;
  /** Fallback text rendered inside a recessed optical well when no items are attached. */
  emptyMessage?: string;
}

const DEFAULT_EMPTY_ITEMS: AttachedContextItem[] = [];

function sanitizeFiniteTokens(tokens: number | undefined): number | null {
  if (tokens === undefined || !Number.isFinite(tokens) || tokens < 0) {
    return null;
  }
  return Math.round(tokens);
}

function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return String(tokens);
  }
  const rounded = Math.round((tokens / 1000) * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}k` : `${rounded.toFixed(1)}k`;
}

function renderKindIcon(kind: AttachedContextKind): ReactNode {
  switch (kind) {
    case 'file':
      return (
        <FileCode
          aria-hidden="true"
          className="w-3.5 h-3.5 shrink-0"
          style={STYLE_PRIMARY_MAIN}
        />
      );
    case 'folder':
      return (
        <Folder
          aria-hidden="true"
          className="w-3.5 h-3.5 shrink-0"
          style={STYLE_WARNING_MAIN}
        />
      );
    case 'url':
      return (
        <Link2
          aria-hidden="true"
          className="w-3.5 h-3.5 shrink-0"
          style={STYLE_INFO_MAIN}
        />
      );
    case 'snippet':
      return (
        <Code2
          aria-hidden="true"
          className="w-3.5 h-3.5 shrink-0"
          style={STYLE_SUCCESS_MAIN}
        />
      );
  }
}

function AttachedContextBarInner({
  items,
  defaultItems = DEFAULT_EMPTY_ITEMS,
  onItemsChange,
  onRemove,
  onTogglePin,
  onAddClick,
  addLabel = 'Attach Context',
  emptyMessage = 'No context items attached.',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AttachedContextBarProps) {
  const override = useComponentOverride('AttachedContextBar');

  const [currentItems, setCurrentItems] = useControllableState<AttachedContextItem[]>({
    value: items,
    defaultValue: defaultItems,
    onChange: onItemsChange,
  });

  const { totalTokens, pinnedCount } = useMemo(() => {
    let tokenSum = 0;
    let pinnedTotal = 0;
    for (const item of currentItems) {
      const validTokens = sanitizeFiniteTokens(item.tokens);
      if (validTokens !== null) {
        tokenSum += validTokens;
      }
      if (item.pinned) {
        pinnedTotal += 1;
      }
    }
    return { totalTokens: tokenSum, pinnedCount: pinnedTotal };
  }, [currentItems]);

  const handleTogglePin = (targetId: string) => {
    let nextPinned = false;
    const nextItems = currentItems.map((item) => {
      if (item.id !== targetId) return item;
      nextPinned = !item.pinned;
      return { ...item, pinned: nextPinned };
    });
    setCurrentItems(nextItems);
    onTogglePin?.(targetId, nextPinned);
  };

  const handleRemove = (targetId: string) => {
    const nextItems = currentItems.filter((item) => item.id !== targetId);
    setCurrentItems(nextItems);
    onRemove?.(targetId);
  };

  const merged = mergeProps({
    themeTarget: themeProps('attached-context-bar', {
      empty: currentItems.length === 0,
      count: currentItems.length,
      pinnedCount,
    }),
    baseClassName: 'prism-slab p-3.5 w-full space-y-2.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('attached-context-bar', 'header');
  const listClass = stableClassName('attached-context-bar', 'list');
  const emptyClass = stableClassName('attached-context-bar', 'empty');

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            className="prism-well w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_SECONDARY_MAIN}
          >
            <Paperclip aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          </span>
          <span
            data-testid="attached-context-count"
            className="text-xs font-semibold tabular-nums whitespace-nowrap"
            style={STYLE_TEXT_PRIMARY}
          >
            {currentItems.length} attached
          </span>
          <span
            data-testid="attached-context-total-tokens"
            className="prism-well font-mono text-[11px] font-medium tabular-nums rounded-full px-2 py-0.5 whitespace-nowrap"
            style={STYLE_TEXT_SECONDARY}
          >
            {formatTokenCount(totalTokens)} tok
          </span>
        </div>

        {onAddClick ? (
          <button
            type="button"
            onClick={onAddClick}
            data-testid="attached-context-add"
            className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_PRIMARY}
          >
            <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>{addLabel}</span>
          </button>
        ) : null}
      </div>

      {currentItems.length === 0 ? (
        <div
          data-testid="attached-context-empty"
          className={cx(emptyClass, 'prism-well rounded-2xl px-3.5 py-2.5 text-xs')}
          style={STYLE_TEXT_SECONDARY}
        >
          {emptyMessage}
        </div>
      ) : (
        <ul
          aria-label="Attached context items"
          data-testid="attached-context-list"
          className={cx(listClass, 'flex flex-wrap items-center gap-2')}
        >
          {currentItems.map((item) => {
            const isPinned = Boolean(item.pinned);
            const validTokens = sanitizeFiniteTokens(item.tokens);

            return (
              <li
                key={item.id}
                data-testid={`attached-context-item-${item.id}`}
                data-kind={item.kind}
                data-pinned={isPinned ? 'true' : 'false'}
                className="prism-crystal inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-1.5 py-1 text-xs max-w-full border transition-[color,background-color,border-color,opacity,transform]"
                style={{
                  borderColor: isPinned
                    ? 'var(--prism-secondary-main)'
                    : 'transparent',
                }}
              >
                {renderKindIcon(item.kind)}

                <span
                  className="font-medium truncate max-w-[14rem]"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {item.label}
                </span>

                {validTokens !== null ? (
                  <span
                    data-testid={`attached-context-tokens-${item.id}`}
                    className="prism-well font-mono text-[10px] font-medium tabular-nums rounded-full px-1.5 py-0.5 whitespace-nowrap shrink-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {formatTokenCount(validTokens)} tok
                  </span>
                ) : null}

                <button
                  type="button"
                  aria-pressed={isPinned}
                  aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
                  onClick={() => handleTogglePin(item.id)}
                  className="prism-focus-ring w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed enabled:hover:opacity-80 transition-opacity"
                  style={{
                    color: isPinned
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {isPinned ? (
                    <PinOff aria-hidden="true" className="w-3 h-3 shrink-0" />
                  ) : (
                    <Pin aria-hidden="true" className="w-3 h-3 shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  aria-label={`Remove ${item.label}`}
                  onClick={() => handleRemove(item.id)}
                  className="prism-focus-ring w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed enabled:hover:opacity-80 transition-opacity"
                  style={STYLE_TEXT_SECONDARY}
                >
                  <X aria-hidden="true" className="w-3 h-3 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const AttachedContextBar = memo(AttachedContextBarInner);
AttachedContextBar.displayName = 'AttachedContextBar';
