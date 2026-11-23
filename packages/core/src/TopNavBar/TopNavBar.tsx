'use client';

import { memo } from 'react';

import { Search } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface NavLinkItem {
  id: string;
  label: string;
}

export interface TopNavBarProps extends BaseProps<HTMLElement> {
  /** Brand wordmark or application title displayed on the leading edge. */
  brand: string;
  /** Navigation links rendered in the center bar. */
  links: NavLinkItem[];
  /** Identifier of the currently active link. */
  activeLinkId: string;
  /** Callback invoked when a navigation link is selected. */
  onSelectLink: (id: string) => void;
  /** Optional callback enabling the quick-search trigger pill. */
  onSearchClick?: () => void;
  /** Avatar initials shown on the trailing edge. */
  userInitials?: string;
}

function TopNavBarInner({
  brand,
  links,
  activeLinkId,
  onSelectLink,
  onSearchClick,
  userInitials = 'CV',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TopNavBarProps) {
  const override = useComponentOverride('TopNavBar');

  const merged = mergeProps({
    themeTarget: themeProps('top-nav-bar', { hasSearch: Boolean(onSearchClick) }),
    baseClassName:
      'prism-crystal rounded-full px-5 py-2.5 flex items-center justify-between gap-6 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <nav ref={ref} aria-label="Top Navigation Bar" {...rest} {...merged}>
      <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
        {brand}
      </span>

      <div className="hidden sm:flex items-center gap-5 text-xs font-medium">
        {links.map((link) => {
          const active = link.id === activeLinkId;
          return (
            <button
              key={link.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onSelectLink(link.id)}
              className={`prism-focus-ring rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors py-1 ${
                active
                  ? 'text-orange-600 dark:text-orange-400 font-semibold underline underline-offset-4'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onSearchClick ? (
          <button
            type="button"
            aria-label="Quick search"
            onClick={onSearchClick}
            className="prism-well prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Search</span>
          </button>
        ) : null}
        <span
          aria-label="Signed in user"
          className="prism-btn-cobalt w-8 h-8 rounded-full inline-flex items-center justify-center text-xs font-semibold"
        >
          {userInitials}
        </span>
      </div>
    </nav>
  );
}

export const TopNavBar = memo(TopNavBarInner);
TopNavBar.displayName = 'TopNavBar';
