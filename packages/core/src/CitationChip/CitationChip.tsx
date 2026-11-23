'use client';

import { memo, useEffect, useId, useRef, useState } from 'react';
import { ExternalLink, FileSearch, Globe, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { sanitizeUrl } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_INFO_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface CitationChipProps extends BaseProps<HTMLSpanElement> {
  /** Optional citation index or marker displayed in brackets before the label (e.g. 1 or 'A'). */
  index?: number | string;
  /** Compact inline source label shown on the crystal trigger chip. */
  label: string;
  /** Optional full source title displayed in the preview popover (defaults to label). */
  title?: string;
  /** Optional cited excerpt rendered inside a recessed optical well in the popover. */
  snippet?: string;
  /** Optional external or relative source URL, sanitized with sanitizeUrl(href, false). */
  href?: string;
  /** Optional source domain or publisher readout (e.g. 'docs.refractor.dev'). */
  domain?: string;
  /** Optional callback invoked when the 'Inspect source' button inside the popover is clicked. */
  onInspect?: () => void;
}

function CitationChipInner({
  index,
  label,
  title,
  snippet,
  href,
  domain,
  onInspect,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CitationChipProps) {
  const override = useComponentOverride('CitationChip');
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const titleId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mergedRef = useMergedRefs(ref, containerRef);

  const safeHref = href ? sanitizeUrl(href, false) : '';
  const hasSafeHref = safeHref.length > 0;
  const hasIndex = index !== undefined && String(index).trim().length > 0;
  const headingText = title ?? label;
  const hasFooterActions = hasSafeHref || Boolean(onInspect);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const rootEl = containerRef.current;
      if (rootEl && event.target instanceof Node && !rootEl.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [open]);

  const merged = mergeProps({
    themeTarget: themeProps('citation-chip', {
      open,
      hasHref: hasSafeHref,
      inspectable: Boolean(onInspect),
    }),
    baseClassName: 'relative inline-flex items-center align-baseline',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <span ref={mergedRef} {...rest} {...merged}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
        style={STYLE_TEXT_PRIMARY}
      >
        {hasIndex ? (
          <span
            data-testid="citation-index"
            className="font-mono text-[11px] font-semibold tabular-nums"
            style={STYLE_INFO_MAIN}
          >
            [{index}]
          </span>
        ) : null}
        {hasIndex ? ' ' : null}
        <span className="truncate max-w-[14rem]">{label}</span>
      </button>

      {open ? (
        <span
          id={popoverId}
          role="dialog"
          aria-labelledby={titleId}
          className="prism-slab block absolute left-0 top-full mt-2 z-40 w-72 max-w-[calc(100vw-2rem)] p-3.5 text-left space-y-2.5"
        >
          <span className="flex items-start justify-between gap-2">
            <span
              id={titleId}
              className="text-xs font-semibold leading-snug break-words"
              style={STYLE_TEXT_PRIMARY}
            >
              {headingText}
            </span>

            <button
              type="button"
              aria-label="Close citation preview"
              onClick={() => setOpen(false)}
              className="prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed enabled:hover:opacity-80 transition-opacity"
              style={STYLE_TEXT_SECONDARY}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </span>

          {domain ? (
            <span
              data-testid="citation-domain"
              className="flex items-center gap-1.5 font-mono text-[11px] truncate"
              style={STYLE_TEXT_SECONDARY}
            >
              <Globe aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span className="truncate">{domain}</span>
            </span>
          ) : null}

          {snippet ? (
            <span
              data-testid="citation-snippet"
              className="prism-well block rounded-xl px-2.5 py-2 text-xs leading-relaxed break-words"
              style={STYLE_TEXT_SECONDARY}
            >
              {snippet}
            </span>
          ) : null}

          {hasFooterActions ? (
            <span
              className="flex flex-wrap items-center gap-2 pt-2 border-t"
              style={STYLE_BORDER_DIVIDER}
            >
              {hasSafeHref ? (
                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium cursor-pointer hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                  style={STYLE_INFO_MAIN}
                >
                  <span>Open source</span>
                  <ExternalLink aria-hidden="true" className="w-3 h-3 shrink-0" />
                </a>
              ) : null}

              {onInspect ? (
                <button
                  type="button"
                  onClick={onInspect}
                  className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                  style={STYLE_TEXT_PRIMARY}
                >
                  <FileSearch aria-hidden="true" className="w-3 h-3 shrink-0" />
                  <span>Inspect source</span>
                </button>
              ) : null}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export const CitationChip = memo(CitationChipInner);
CitationChip.displayName = 'CitationChip';
