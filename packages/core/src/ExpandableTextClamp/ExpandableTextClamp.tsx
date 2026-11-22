'use client';

import { useCallback, useId, useMemo, type CSSProperties } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type TextClampLines = 2 | 3 | 4 | 5 | 6;

export interface ExpandableTextClampProps extends BaseProps<HTMLDivElement> {
  /** Plain text content rendered literally (zero HTML parsing or injection). */
  text: string;
  /** Maximum visible lines while collapsed (2 | 3 | 4 | 5 | 6, defaults to 3). */
  lines?: TextClampLines;
  /** Character count threshold above which the expand/collapse toggle appears (clamped 20..2000, defaults to 140). */
  charThreshold?: number;
  /** Controlled expanded state. */
  expanded?: boolean;
  /** Initial expanded state for uncontrolled mode (defaults to false). */
  defaultExpanded?: boolean;
  /** Callback fired whenever the expanded state toggles. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Toggle label shown while collapsed (defaults to 'Read more'). */
  expandLabel?: string;
  /** Toggle label shown while expanded (defaults to 'Show less'). */
  collapseLabel?: string;
  /** Renders a soft optical bottom fade overlay via --prism-surface while clamped (defaults to true). */
  showFadeMask?: boolean;
}

const DEFAULT_LINES: TextClampLines = 3;
const MIN_LINES = 2;
const MAX_LINES = 6;
const DEFAULT_CHAR_THRESHOLD = 140;
const MIN_CHAR_THRESHOLD = 20;
const MAX_CHAR_THRESHOLD = 2000;
const DEFAULT_EXPAND_LABEL = 'Read more';
const DEFAULT_COLLAPSE_LABEL = 'Show less';

function countWords(trimmedText: string): number {
  if (trimmedText.length === 0) {
    return 0;
  }
  return trimmedText.split(/\s+/).length;
}

export function ExpandableTextClamp({
  text,
  lines = DEFAULT_LINES,
  charThreshold = DEFAULT_CHAR_THRESHOLD,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  expandLabel = DEFAULT_EXPAND_LABEL,
  collapseLabel = DEFAULT_COLLAPSE_LABEL,
  showFadeMask = true,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ExpandableTextClampProps) {
  const override = useComponentOverride('ExpandableTextClamp');
  const contentId = useId();

  const safeLines = Math.round(
    clampNumber(lines, MIN_LINES, MAX_LINES, DEFAULT_LINES)
  );
  const safeCharThreshold = Math.round(
    clampNumber(
      charThreshold,
      MIN_CHAR_THRESHOLD,
      MAX_CHAR_THRESHOLD,
      DEFAULT_CHAR_THRESHOLD
    )
  );

  const { charCount, wordCount } = useMemo(() => {
    const trimmed = text.trim();
    return {
      charCount: trimmed.length,
      wordCount: countWords(trimmed),
    };
  }, [text]);

  const isEmpty = charCount === 0;
  const isExpandable = charCount > safeCharThreshold;

  const [isExpanded, setIsExpanded] = useControllableState<boolean>({
    value: expanded,
    defaultValue: defaultExpanded,
    onChange: onExpandedChange,
  });

  const effectiveExpanded = isExpandable && isExpanded;
  const isClamped = isExpandable && !isExpanded;
  const isFadeVisible = isClamped && showFadeMask;

  const resolvedExpandLabel = expandLabel.trim() || DEFAULT_EXPAND_LABEL;
  const resolvedCollapseLabel = collapseLabel.trim() || DEFAULT_COLLAPSE_LABEL;

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, [setIsExpanded]);

  const textStyle = useMemo<CSSProperties>(() => {
    if (isClamped) {
      return {
        color: 'var(--prism-text-primary)',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: safeLines,
        lineClamp: safeLines,
        overflow: 'hidden',
      };
    }
    return {
      color: 'var(--prism-text-primary)',
    };
  }, [isClamped, safeLines]);

  const merged = mergeProps({
    themeTarget: themeProps('expandable-text-clamp', {
      expanded: effectiveExpanded,
      clamped: isClamped,
      expandable: isExpandable,
      lines: safeLines,
      fadeMask: isFadeVisible,
      empty: isEmpty,
    }),
    baseClassName:
      'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 flex flex-col gap-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const bodyClass = stableClassName('expandable-text-clamp', 'body');
  const contentClass = stableClassName('expandable-text-clamp', 'content');
  const fadeClass = stableClassName('expandable-text-clamp', 'fade');
  const footerClass = stableClassName('expandable-text-clamp', 'footer');
  const toggleClass = stableClassName('expandable-text-clamp', 'toggle');
  const telemetryClass = stableClassName('expandable-text-clamp', 'telemetry');

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(bodyClass, 'relative min-w-0 max-w-full')}>
        <p
          id={contentId}
          data-testid="expandable-text-content"
          data-clamped={isClamped ? 'true' : undefined}
          data-lines={String(safeLines)}
          className={cx(
            contentClass,
            'm-0 text-sm leading-relaxed whitespace-pre-line break-words min-w-0 max-w-full'
          )}
          style={textStyle}
        >
          {text}
        </p>

        {isFadeVisible ? (
          <span
            aria-hidden="true"
            data-testid="expandable-text-fade"
            className={cx(
              fadeClass,
              'pointer-events-none absolute inset-x-0 bottom-0 h-10 transition-opacity duration-200'
            )}
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--prism-surface, var(--prism-slab-bottom)))',
            }}
          />
        ) : null}
      </div>

      {isExpandable ? (
        <div
          className={cx(
            footerClass,
            'flex flex-wrap items-center justify-between gap-2 pt-2 border-t min-w-0 max-w-full'
          )}
          style={{ borderColor: 'var(--prism-divider)' }}
        >
          <button
            type="button"
            aria-expanded={effectiveExpanded}
            aria-controls={contentId}
            data-testid="expandable-text-toggle"
            onClick={handleToggle}
            className={cx(
              toggleClass,
              'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-150 hover:brightness-105 shrink-0'
            )}
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <span>
              {effectiveExpanded ? resolvedCollapseLabel : resolvedExpandLabel}
            </span>
            {effectiveExpanded ? (
              <ChevronUp
                aria-hidden="true"
                data-testid="expandable-text-icon-up"
                className="w-3.5 h-3.5 shrink-0 transition-transform duration-150"
              />
            ) : (
              <ChevronDown
                aria-hidden="true"
                data-testid="expandable-text-icon-down"
                className="w-3.5 h-3.5 shrink-0 transition-transform duration-150"
              />
            )}
          </button>

          {effectiveExpanded ? (
            <span
              data-testid="expandable-text-telemetry"
              className={cx(
                telemetryClass,
                'prism-well inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono tabular-nums shrink-0'
              )}
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <span>
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{charCount} chars</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

ExpandableTextClamp.displayName = 'ExpandableTextClamp';
