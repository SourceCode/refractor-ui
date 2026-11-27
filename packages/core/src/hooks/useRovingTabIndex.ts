'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Roving Tabindex & Keyboard Navigation Engine (`useRovingTabIndex`)
 *
 * Provides arrow-key, Home/End, typeahead search, Escape, wrap-around, and
 * disabled-item skipping for menus, toolbars, tabs, trees, and window switchers.
 */

export type RovingOrientation = 'horizontal' | 'vertical' | 'both';

export interface RovingItemMeta {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface UseRovingTabIndexOptions {
  items: ReadonlyArray<RovingItemMeta>;
  orientation?: RovingOrientation;
  loop?: boolean;
  initialActiveId?: string;
  onActiveChange?: (id: string) => void;
  onEscape?: () => void;
}

export interface UseRovingTabIndexReturn {
  readonly activeId: string | null;
  readonly setActiveId: (id: string) => void;
  readonly getItemProps: (id: string) => {
    tabIndex: number;
    onFocus: () => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
    'data-roving-active': 'true' | 'false';
  };
}

function findNextEnabledIndex(
  items: ReadonlyArray<RovingItemMeta>,
  startIndex: number,
  delta: 1 | -1,
  loop: boolean
): number {
  const len = items.length;
  if (len === 0) return -1;
  let cursor = startIndex;
  for (let step = 0; step < len; step += 1) {
    cursor += delta;
    if (loop) {
      cursor = (cursor + len) % len;
    } else if (cursor < 0 || cursor >= len) {
      return startIndex;
    }
    if (!items[cursor]?.disabled) {
      return cursor;
    }
  }
  return startIndex;
}

export function useRovingTabIndex(options: UseRovingTabIndexOptions): UseRovingTabIndexReturn {
  const {
    items,
    orientation = 'horizontal',
    loop = true,
    initialActiveId,
    onActiveChange,
    onEscape,
  } = options;

  const firstEnabledId = items.find((i) => !i.disabled)?.id ?? null;
  const [activeId, setActiveIdState] = useState<string | null>(initialActiveId ?? firstEnabledId);
  const typeaheadRef = useRef<string>('');
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typeaheadTimerRef.current) {
        clearTimeout(typeaheadTimerRef.current);
      }
    };
  }, []);

  const setActiveId = useCallback(
    (id: string) => {
      setActiveIdState(id);
      onActiveChange?.(id);
    },
    [onActiveChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>, currentId: string) => {
      if (event.nativeEvent.isComposing || items.length === 0) return;
      const currentIdx = Math.max(
        0,
        items.findIndex((item) => item.id === currentId)
      );

      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      const nextKeys =
        orientation === 'horizontal'
          ? ['ArrowRight']
          : orientation === 'vertical'
            ? ['ArrowDown']
            : ['ArrowRight', 'ArrowDown'];
      const prevKeys =
        orientation === 'horizontal'
          ? ['ArrowLeft']
          : orientation === 'vertical'
            ? ['ArrowUp']
            : ['ArrowLeft', 'ArrowUp'];

      if (nextKeys.includes(event.key)) {
        event.preventDefault();
        const nextIdx = findNextEnabledIndex(items, currentIdx, 1, loop);
        const target = items[nextIdx];
        if (target) setActiveId(target.id);
        return;
      }

      if (prevKeys.includes(event.key)) {
        event.preventDefault();
        const prevIdx = findNextEnabledIndex(items, currentIdx, -1, loop);
        const target = items[prevIdx];
        if (target) setActiveId(target.id);
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        const first = items.find((item) => !item.disabled);
        if (first) setActiveId(first.id);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        for (let i = items.length - 1; i >= 0; i -= 1) {
          if (!items[i]?.disabled) {
            setActiveId(items[i]!.id);
            break;
          }
        }
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        typeaheadRef.current = `${typeaheadRef.current}${event.key.toLowerCase()}`;
        if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
        typeaheadTimerRef.current = setTimeout(() => {
          typeaheadRef.current = '';
        }, 500);

        const query = typeaheadRef.current;
        const match = items.find(
          (item) => !item.disabled && item.label.toLowerCase().startsWith(query)
        );
        if (match) {
          event.preventDefault();
          setActiveId(match.id);
        }
      }
    },
    [items, loop, onEscape, orientation, setActiveId]
  );

  const getItemProps = useCallback(
    (id: string) => {
      const isActive = activeId === id;
      return {
        tabIndex: isActive ? 0 : -1,
        onFocus: () => setActiveId(id),
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => handleKeyDown(event, id),
        'data-roving-active': (isActive ? 'true' : 'false') as 'true' | 'false',
      };
    },
    [activeId, handleKeyDown, setActiveId]
  );

  return { activeId, setActiveId, getItemProps };
}
