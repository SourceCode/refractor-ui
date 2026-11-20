'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface AccordionItem {
  id: string;
  title: string;
  body: string;
}

export interface AccordionProps extends BaseProps<HTMLDivElement> {
  /** Collapsible panel definitions rendered in vertical optical slabs. */
  items: ReadonlyArray<AccordionItem>;
  /** Permits multiple panels to stay open simultaneously. */
  allowMultiple?: boolean;
}

export function Accordion({
  items,
  allowMultiple = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AccordionProps) {
  const override = useComponentOverride('Accordion');
  const baseId = useId();
  const [openIds, setOpenIds] = useState<string[]>(() => (items[0] ? [items[0].id] : []));

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return allowMultiple ? [...prev, id] : [id];
    });
  };

  const merged = mergeProps({
    themeTarget: themeProps('accordion', { allowMultiple, empty: items.length === 0 }),
    baseClassName: 'space-y-2.5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      {items.map((item) => {
        const expanded = openIds.includes(item.id);
        const triggerId = `${baseId}-trigger-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;

        return (
          <div key={item.id} className="prism-slab overflow-hidden">
            <button
              id={triggerId}
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
              className="prism-focus-ring w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left cursor-pointer"
            >
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {item.title}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`w-4 h-4 text-slate-500 transition-transform duration-150 shrink-0 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </button>
            {expanded ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="px-5 pb-4 pt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-700/50"
              >
                {item.body}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

Accordion.displayName = 'Accordion';
