'use client';

import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface TabItem {
  id: string;
  label: string;
  content?: ReactNode;
}

type PrismTabsBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface PrismTabsProps extends PrismTabsBaseProps {
  /** Tab definitions with labels and optional panel content. */
  tabs: TabItem[];
  /** Identifier of the active tab. */
  activeTabId: string;
  /** Callback invoked when the active tab changes. */
  onChange: (id: string) => void;
  /** Renders the signature crystal "Tabs" cycle pill alongside the tablist. */
  showSpecimenPill?: boolean;
}

function PrismTabsInner({
  tabs,
  activeTabId,
  onChange,
  showSpecimenPill = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PrismTabsProps) {
  const baseId = useId();
  const override = useComponentOverride('PrismTabs');
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const cycleNextTab = () => {
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const next = tabs.length > 0 ? tabs[(idx + 1) % tabs.length] : undefined;
    if (next) {
      onChange(next.id);
    }
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIdx = (idx + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (idx - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = tabs.length - 1;
    }

    const target = nextIdx !== null ? tabs[nextIdx] : undefined;
    if (target) {
      e.preventDefault();
      onChange(target.id);
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('prism-tabs', { specimen: showSpecimenPill }),
    baseClassName: 'space-y-3 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const activePanelId = activeTab ? `${baseId}-panel-${activeTab.id}` : undefined;
  const activeTabButtonId = activeTab ? `${baseId}-tab-${activeTab.id}` : undefined;

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex flex-wrap items-center gap-3">
        {showSpecimenPill ? (
          <button
            type="button"
            onClick={cycleNextTab}
            aria-label="Cycle active tab"
            className="prism-crystal prism-focus-ring h-12 px-6 rounded-full inline-flex items-center gap-3 text-[15px] font-medium text-slate-800 dark:text-slate-100 cursor-pointer hover:-translate-y-0.5 transition-transform"
          >
            <ChevronsUpDown className="w-4 h-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
            <span>Tabs</span>
          </button>
        ) : null}

        <div
          role="tablist"
          aria-label="Content views"
          className="prism-crystal p-1 rounded-full inline-flex items-center gap-1 overflow-x-auto max-w-full"
        >
          {tabs.map((tab, idx) => {
            const active = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                id={`${baseId}-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={tab.content ? `${baseId}-panel-${tab.id}` : undefined}
                onClick={() => onChange(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`prism-focus-ring h-9 px-4 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-[color,background-color,border-color,opacity,transform] ${
                  active
                    ? 'prism-well text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab?.content ? (
        <div
          id={activePanelId}
          role="tabpanel"
          aria-labelledby={activeTabButtonId}
          className="prism-slab p-4 text-sm text-slate-700 dark:text-slate-200"
        >
          {activeTab.content}
        </div>
      ) : null}
    </div>
  );
}

export const PrismTabs = /*#__PURE__*/ memoWithDisplayName(PrismTabsInner, 'PrismTabs');
