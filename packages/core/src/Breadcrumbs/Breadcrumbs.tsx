'use client';


import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface BreadcrumbCrumb {
  id: string;
  label: string;
}

export interface BreadcrumbsProps extends BaseProps<HTMLElement> {
  /** Ordered trail of ancestor crumbs ending in the current page. */
  items: BreadcrumbCrumb[];
  /** Callback invoked with a crumb ID when an ancestor item is clicked. */
  onNavigate: (id: string) => void;
}

function BreadcrumbsInner({
  items,
  onNavigate,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: BreadcrumbsProps) {
  const override = useComponentOverride('Breadcrumbs');

  const merged = mergeProps({
    themeTarget: themeProps('breadcrumbs', { count: items.length }),
    baseClassName:
      'prism-crystal rounded-2xl sm:rounded-full px-3.5 sm:px-4 py-2 inline-flex items-center max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <nav ref={ref} aria-label="Breadcrumb" {...rest} {...merged}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs min-w-0">
        {items.map((crumb, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={crumb.id} className="inline-flex items-center gap-2 min-w-0 max-w-full">
              {isLast ? (
                <span
                  aria-current="page"
                  className="font-semibold text-slate-900 dark:text-white break-words sm:whitespace-nowrap"
                >
                  {crumb.label}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate(crumb.id)}
                    className="prism-focus-ring rounded text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer text-left break-words sm:whitespace-nowrap"
                  >
                    {crumb.label}
                  </button>
                  <span aria-hidden="true" className="text-slate-400 shrink-0">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export const Breadcrumbs = /*#__PURE__*/ memoWithDisplayName(BreadcrumbsInner, 'Breadcrumbs');
