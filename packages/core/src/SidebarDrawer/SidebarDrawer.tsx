'use client';

import { useState, type ReactNode } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface DrawerNavItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

type SidebarDrawerBaseProps = Omit<BaseProps<HTMLElement>, 'onSelect'>;

export interface SidebarDrawerProps extends SidebarDrawerBaseProps {
  /** Heading label and accessible landmark name for the drawer. */
  title: string;
  /** Navigation items rendered vertically inside the slab. */
  items: DrawerNavItem[];
  /** Identifier of the currently active navigation item. */
  activeId: string;
  /** Callback invoked when an item is selected. */
  onSelect: (id: string) => void;
  /** Whether the user can collapse the drawer to compact icon mode. */
  collapsible?: boolean;
}

export function SidebarDrawer({
  title,
  items,
  activeId,
  onSelect,
  collapsible = true,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SidebarDrawerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const override = useComponentOverride('SidebarDrawer');

  const merged = mergeProps({
    themeTarget: themeProps('sidebar-drawer', { collapsed, collapsible }),
    baseClassName: `prism-slab p-3 transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <aside ref={ref} aria-label={title} {...rest} {...merged}>
      <div className="flex items-center justify-between px-2 py-1.5 mb-2">
        {!collapsed ? (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
            {title}
          </span>
        ) : null}
        {collapsible ? (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand navigation drawer' : 'Collapse navigation drawer'}
            onClick={() => setCollapsed((c) => !c)}
            className="prism-focus-ring p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              aria-label={collapsed ? item.label : undefined}
              title={collapsed ? item.label : undefined}
              onClick={() => onSelect(item.id)}
              className={`prism-focus-ring w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl text-xs font-medium cursor-pointer transition-all ${
                active
                  ? 'prism-btn-primary text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-white/55 dark:hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0 relative z-10">
                {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </span>
              {!collapsed && item.count !== undefined ? (
                <span
                  className={`relative z-10 tabular-nums text-[11px] ${
                    active ? 'text-white/90' : 'text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

SidebarDrawer.displayName = 'SidebarDrawer';
