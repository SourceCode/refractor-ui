'use client';

import { memo, useEffect, useId, useRef, useState } from 'react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface ContextMenuAction {
  id: string;
  label: string;
  shortcut?: string;
  destructive?: boolean;
}

type ContextMenuDropdownBaseProps = Omit<BaseProps<HTMLDivElement>, 'onSelect'>;

export interface ContextMenuDropdownProps extends ContextMenuDropdownBaseProps {
  /** Menu items displayed in the floating optical slab menu. */
  actions: ContextMenuAction[];
  /** Callback invoked when a menu action is selected. */
  onSelect: (action: ContextMenuAction) => void;
}

function ContextMenuDropdownInner({
  actions,
  onSelect,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ContextMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuOffsetX, setMenuOffsetX] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(wrapperRef, ref);
  const menuId = useId();
  const override = useComponentOverride('ContextMenuDropdown');

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        e.target instanceof Node &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const merged = mergeProps({
    themeTarget: themeProps('context-menu-dropdown', { open }),
    baseClassName: 'space-y-2.5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={open ? menuId : undefined}
          onClick={() => {
            setMenuOffsetX(null);
            setOpen((o) => !o);
          }}
          className="prism-btn-secondary prism-focus-ring inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer h-9 px-5 text-xs"
        >
          <span className="relative z-10">Actions Menu</span>
        </button>
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuOffsetX(Math.max(0, Math.min(e.clientX - rect.left, 160)));
            setOpen(true);
          }}
          className="prism-well flex-1 h-10 rounded-full px-4 flex items-center text-xs text-slate-600 dark:text-slate-300 select-none"
        >
          Right-click anywhere inside this crystal zone
        </div>
      </div>

      {open ? (
        <div
          id={menuId}
          role="menu"
          style={menuOffsetX !== null ? { marginLeft: menuOffsetX } : undefined}
          className="prism-slab w-56 p-1.5 z-30"
        >
          {actions.length === 0 ? (
            <div
              role="menuitem"
              aria-disabled="true"
              className="px-3.5 py-2 text-xs text-slate-500 dark:text-slate-400"
            >
              No actions available
            </div>
          ) : (
            actions.map((act) => (
              <button
                key={act.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  onSelect(act);
                  setOpen(false);
                }}
                className={`prism-focus-ring w-full px-3.5 py-2 rounded-xl flex items-center justify-between text-xs font-medium cursor-pointer transition-colors ${
                  act.destructive
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10'
                    : 'text-slate-800 dark:text-slate-100 hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                <span>{act.label}</span>
                {act.shortcut ? (
                  <span className="font-mono text-[11px] opacity-65">{act.shortcut}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export const ContextMenuDropdown = memo(ContextMenuDropdownInner);
ContextMenuDropdown.displayName = 'ContextMenuDropdown';
