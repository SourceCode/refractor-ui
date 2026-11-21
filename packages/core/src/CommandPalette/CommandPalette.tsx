'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Command } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface CommandPaletteItem {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps extends BaseProps<HTMLDivElement> {
  /** Controls visibility of the modal command palette. */
  open: boolean;
  /** Callback invoked to close the palette (Escape, backdrop click, or selection). */
  onClose: () => void;
  /** Searchable list of command actions. */
  items: CommandPaletteItem[];
}

export function CommandPalette({
  open,
  onClose,
  items,
  onClick,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const override = useComponentOverride('CommandPalette');

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActiveIndex(0);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = items.filter(
    (item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
  );
  const visibleItems = filtered.slice(0, 18);
  const clampedIndex = visibleItems.length > 0 ? Math.min(activeIndex, visibleItems.length - 1) : 0;

  const merged = mergeProps({
    themeTarget: themeProps('command-palette', { open }),
    baseClassName:
      'fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/35 backdrop-blur-xs',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown' && visibleItems.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % visibleItems.length);
    } else if (e.key === 'ArrowUp' && visibleItems.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + visibleItems.length) % visibleItems.length);
    } else if (e.key === 'Enter') {
      const target = visibleItems[clampedIndex];
      if (target) {
        e.preventDefault();
        target.onSelect();
        onClose();
      }
    }
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      onClick={composeEventHandlers(onClick, () => onClose())}
      {...rest}
      {...merged}
    >
      <div
        className="prism-slab w-full max-w-xl p-3 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="prism-well rounded-full h-12 px-4 flex items-center gap-3">
          <Command className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search components or commands..."
            aria-label="Filter commands"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="prism-focus-ring text-[11px] font-mono text-slate-500 hover:text-slate-800 dark:hover:text-white px-2 py-0.5 rounded-md border border-slate-300/60 dark:border-slate-700 cursor-pointer"
          >
            ESC
          </button>
        </div>

        <div className="mt-2 max-h-80 overflow-y-auto divide-y divide-slate-200/50 dark:divide-slate-700/40">
          {visibleItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching components or commands for &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-1 space-y-0.5">
              {visibleItems.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  data-highlighted={idx === clampedIndex ? 'true' : undefined}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  className={`prism-focus-ring w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-left hover:bg-white/65 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                    idx === clampedIndex ? 'bg-white/65 dark:bg-white/10' : ''
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.label}
                    </span>
                    <span className="mx-2 text-slate-400">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{item.group}</span>
                  </div>
                  {item.shortcut ? (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {item.shortcut}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

CommandPalette.displayName = 'CommandPalette';
