'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface ContextualPopoverProps extends BaseProps<HTMLDivElement> {
  /** Card header title. */
  title?: string;
  /** Interactive secondary text link below the title. */
  subtitle?: string;
  /** Label rendered inside the cobalt refractive CTA capsule. */
  ctaLabel?: string;
  /** Callback fired when either the subtitle action or CTA capsule is clicked. */
  onCtaClick?: () => void;
  /** Callback fired when the contextual card is dismissed. */
  onClose?: () => void;
  /** Renders the floating card inline without a toggle trigger button. */
  inlineSpecimen?: boolean;
  /** Label for the secondary trigger button when inlineSpecimen is false. */
  triggerLabel?: string;
}

export function ContextualPopover({
  title = 'Find files...',
  subtitle = 'Add collaborator',
  ctaLabel = 'Pro plan',
  onCtaClick,
  onClose,
  inlineSpecimen = false,
  triggerLabel = 'Open Contextual Card',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ContextualPopoverProps) {
  const [open, setOpen] = useState(inlineSpecimen);
  const cardId = useId();
  const override = useComponentOverride('ContextualPopover');

  useEffect(() => {
    if (inlineSpecimen || !open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inlineSpecimen, open, onClose]);

  const cardInner = (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[16px] font-medium text-slate-900 dark:text-white tracking-[-0.01em]">
            {title}
          </span>
          <button
            type="button"
            aria-label="Close contextual card"
            onClick={() => {
              if (!inlineSpecimen) setOpen(false);
              onClose?.();
            }}
            className="prism-focus-ring rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2]" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={onCtaClick}
          className="prism-focus-ring rounded text-[14px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer block text-left"
        >
          {subtitle}
        </button>
      </div>

      <button
        type="button"
        onClick={onCtaClick}
        className="prism-btn-cobalt prism-focus-ring w-full h-11 rounded-full text-[15px] font-medium flex items-center justify-center cursor-pointer"
      >
        <span className="relative z-10">{ctaLabel}</span>
      </button>
    </>
  );

  if (inlineSpecimen) {
    const mergedInline = mergeProps({
      themeTarget: themeProps('contextual-popover', { open: true, inline: true }),
      baseClassName: 'prism-slab w-full max-w-[280px] p-5 space-y-4',
      overrideClassName: override?.className,
      userClassName: className,
      overrideStyle: override?.style,
      xstyle,
      userStyle: style,
    });

    return (
      <div ref={ref} {...rest} {...mergedInline}>
        {cardInner}
      </div>
    );
  }

  const merged = mergeProps({
    themeTarget: themeProps('contextual-popover', { open, inline: false }),
    baseClassName: 'relative inline-block',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? cardId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="prism-btn-secondary prism-focus-ring inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer h-9 px-5 text-xs"
      >
        <span className="relative z-10">{triggerLabel}</span>
      </button>
      {open ? (
        <div id={cardId} className="mt-2.5 z-30">
          <div className="prism-slab w-full max-w-[280px] p-5 space-y-4">{cardInner}</div>
        </div>
      ) : null}
    </div>
  );
}

ContextualPopover.displayName = 'ContextualPopover';
