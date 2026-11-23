'use client';

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type StickyActionPosition = 'bottom' | 'top' | 'inline';
export type StickyActionTone = 'primary' | 'secondary' | 'cobalt' | 'destructive';

export interface StickyActionItem {
  /** Stable unique identifier for the bulk action button. */
  id: string;
  /** Visible action label. */
  label: string;
  /** Optional icon rendered before the label. */
  icon?: ReactNode;
  /** Refractive glass surface tone ('primary' | 'secondary' | 'cobalt' | 'destructive'). */
  tone?: StickyActionTone;
  /** Disables interaction for this individual action capsule. */
  disabled?: boolean;
  /** Callback invoked when this enabled action capsule is clicked. */
  onClick: () => void;
}

export interface StickyActionBarProps extends BaseProps<HTMLDivElement> {
  /** Number of selected items; bar stays hidden when <= 0 or NaN unless alwaysVisible is true. */
  selectedCount: number;
  /** Optional total selectable count displayed beside the readout and used to guard Select all. */
  totalCount?: number;
  /** Keeps the toolbar rendered even when selectedCount is 0 or invalid. */
  alwaysVisible?: boolean;
  /** Sticky viewport edge or inline layout ('bottom' | 'top' | 'inline'). */
  position?: StickyActionPosition;
  /** Bulk action buttons displayed as optical glass capsules. */
  actions: ReadonlyArray<StickyActionItem>;
  /** Optional callback enabling the "Select all" micro-control. */
  onSelectAll?: () => void;
  /** Optional callback enabling the "Clear" micro-control and Escape-key dismissal. */
  onClearSelection?: () => void;
  /** Custom selection summary formatter (defaults to `${count} selected`). */
  selectionLabel?: (count: number) => string;
}

function getPositionClass(position: StickyActionPosition): string {
  switch (position) {
    case 'top':
      return 'sticky top-4 z-30';
    case 'inline':
      return 'relative';
    case 'bottom':
    default:
      return 'sticky bottom-4 z-30';
  }
}

function getActionToneClass(tone: StickyActionTone): string {
  switch (tone) {
    case 'primary':
      return 'prism-btn-primary';
    case 'cobalt':
      return 'prism-btn-cobalt';
    case 'destructive':
      return 'rounded-full bg-gradient-to-b from-red-600 to-rose-700 text-white shadow-sm ring-1 ring-inset ring-white/30 enabled:hover:brightness-105 enabled:hover:-translate-y-0.5 enabled:active:scale-[0.99] transition-[color,background-color,border-color,opacity,transform]';
    case 'secondary':
    default:
      return 'prism-btn-secondary';
  }
}

function StickyActionBarInner({
  selectedCount,
  totalCount,
  alwaysVisible = false,
  position = 'bottom',
  actions,
  onSelectAll,
  onClearSelection,
  selectionLabel,
  className,
  style,
  xstyle,
  onKeyDown,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: StickyActionBarProps) {
  const override = useComponentOverride('StickyActionBar');
  const handledEscapeRef = useRef<Event | null>(null);

  const safeSelectedCount =
    Number.isFinite(selectedCount) && selectedCount > 0 ? Math.floor(selectedCount) : 0;
  const safeTotalCount =
    typeof totalCount === 'number' && Number.isFinite(totalCount) && totalCount > 0
      ? Math.floor(totalCount)
      : undefined;
  const isVisible = alwaysVisible || safeSelectedCount > 0;
  const allSelected = safeTotalCount !== undefined && safeSelectedCount >= safeTotalCount;

  useEffect(() => {
    if (!isVisible || safeSelectedCount === 0 || !onClearSelection) return undefined;
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented || event.key !== 'Escape') return;
      if (handledEscapeRef.current === event) {
        handledEscapeRef.current = null;
        return;
      }
      onClearSelection();
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isVisible, safeSelectedCount, onClearSelection]);

  if (!isVisible) return null;

  const formattedLabel = selectionLabel
    ? selectionLabel(safeSelectedCount)
    : `${safeSelectedCount} selected`;

  const handleKeyDown = composeEventHandlers<ReactKeyboardEvent<HTMLDivElement>>(onKeyDown, (e) => {
    if (e.nativeEvent.isComposing || e.key !== 'Escape') return;
    if (safeSelectedCount > 0 && onClearSelection) {
      handledEscapeRef.current = e.nativeEvent;
      onClearSelection();
    }
  });

  const merged = mergeProps({
    themeTarget: themeProps('sticky-action-bar', {
      position,
      selectedCount: safeSelectedCount,
      alwaysVisible,
    }),
    baseClassName: `${getPositionClass(
      position
    )} prism-crystal rounded-full px-3 py-2 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3.5 w-fit max-w-full mx-auto`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={ariaLabel ?? 'Bulk selection actions'}
      onKeyDown={handleKeyDown}
      {...rest}
      {...merged}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <span
          aria-hidden="true"
          className="prism-btn-primary inline-flex items-center justify-center min-w-7 h-7 px-2 text-xs font-semibold font-mono tabular-nums shrink-0 pointer-events-none select-none"
        >
          <span className="relative z-10">{safeSelectedCount}</span>
        </span>

        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            aria-live="polite"
            aria-atomic="true"
            className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap"
          >
            {formattedLabel}
          </span>
          {safeTotalCount !== undefined ? (
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
              of {safeTotalCount}
            </span>
          ) : null}
        </div>

        {onSelectAll ? (
          <button
            type="button"
            disabled={allSelected}
            onClick={onSelectAll}
            className="prism-focus-ring h-7 px-2.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 enabled:hover:bg-white/60 dark:enabled:hover:bg-white/10 enabled:hover:text-slate-950 dark:enabled:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Select all
          </button>
        ) : null}

        {onClearSelection ? (
          <button
            type="button"
            disabled={safeSelectedCount === 0}
            onClick={onClearSelection}
            className="prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 enabled:hover:bg-white/60 dark:enabled:hover:bg-white/10 enabled:hover:text-slate-900 dark:enabled:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear</span>
          </button>
        ) : null}
      </div>

      {actions.length > 0 ? (
        <>
          <span
            aria-hidden="true"
            className="hidden sm:block h-6 w-px bg-slate-400/35 dark:bg-slate-600/50 shrink-0"
          />
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => {
              const tone: StickyActionTone = action.tone ?? 'secondary';
              const isDisabled = Boolean(action.disabled);
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={isDisabled}
                  data-tone={tone}
                  onClick={action.onClick}
                  className={`${getActionToneClass(
                    tone
                  )} prism-focus-ring inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3.5 sm:px-4 text-xs font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {action.icon ? (
                    <span className="relative z-10 shrink-0 inline-flex items-center">
                      {action.icon}
                    </span>
                  ) : null}
                  <span className="relative z-10">{action.label}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

export const StickyActionBar = /*#__PURE__*/ memoWithDisplayName(StickyActionBarInner, 'StickyActionBar');
