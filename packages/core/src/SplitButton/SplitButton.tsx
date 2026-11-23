'use client';

import { memo, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type SplitButtonTone = 'primary' | 'crystal';

export interface SplitActionItem {
  /** Unique identifier for the menu action item. */
  id: string;
  /** Primary action label displayed in the dropdown menu. */
  label: string;
  /** Optional secondary description beneath the action label. */
  description?: string;
  /** Disables selecting this individual menu item. */
  disabled?: boolean;
}

export interface SplitButtonProps extends BaseProps<HTMLDivElement> {
  /** Primary button label. */
  label: string;
  /** Handler invoked when the primary action half is clicked. */
  onPrimaryClick: () => void;
  /** Secondary actions rendered inside the dropdown menu. */
  actions: SplitActionItem[];
  /** Handler invoked when a menu action is selected. */
  onSelectAction: (action: SplitActionItem) => void;
  /** Visual glass tone of the split capsule ('primary' or 'crystal'). */
  tone?: SplitButtonTone;
  /** Disables both the primary button and dropdown menu trigger. */
  disabled?: boolean;
}

function SplitButtonInner({
  label,
  onPrimaryClick,
  actions,
  onSelectAction,
  tone = 'primary',
  disabled = false,
  className,
  style,
  xstyle,
  onKeyDown,
  ref,
  ...rest
}: SplitButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const menuId = useId();
  const override = useComponentOverride('SplitButton');

  const hasActions = actions.length > 0;
  const isOpen = open && !disabled && hasActions;

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const shellClass =
    tone === 'primary'
      ? 'prism-btn-primary'
      : 'prism-crystal text-slate-800 dark:text-slate-100 rounded-full';

  const merged = mergeProps({
    themeTarget: themeProps('split-button', { tone, open: isOpen, disabled }),
    baseClassName: 'relative inline-block',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const handleKeyDown = composeEventHandlers(onKeyDown, (e) => {
    if (e.key === 'Escape' && isOpen) {
      setOpen(false);
    }
  });

  return (
    <div ref={mergedRef} onKeyDown={handleKeyDown} {...rest} {...merged}>
      <div className={`${shellClass} inline-flex items-stretch h-12 overflow-hidden`}>
        <button
          type="button"
          disabled={disabled}
          onClick={onPrimaryClick}
          className="prism-focus-ring px-6 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center rounded-l-full"
        >
          <span className="relative z-10">{label}</span>
        </button>
        <span
          aria-hidden="true"
          className={`w-px my-2 ${tone === 'primary' ? 'bg-white/35' : 'bg-slate-400/35'}`}
        />
        <button
          type="button"
          disabled={disabled || !hasActions}
          aria-label={`More actions for ${label}`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          onClick={() => setOpen((prev) => !prev)}
          className="prism-focus-ring px-3.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center enabled:hover:bg-white/10 transition-colors rounded-r-full"
        >
          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 relative z-10 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          className="prism-slab absolute right-0 mt-2 w-60 p-1.5 z-40"
        >
          {actions.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                onSelectAction(item);
                setOpen(false);
              }}
              className="prism-focus-ring w-full text-left px-3.5 py-2.5 rounded-2xl enabled:hover:bg-white/60 dark:enabled:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.label}</div>
              {item.description ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</div>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const SplitButton = memo(SplitButtonInner);
SplitButton.displayName = 'SplitButton';
