'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { FileText, ListTree } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type TocHeadingLevel = 1 | 2 | 3;

export interface TocHeadingEntry {
  /** Stable anchor identifier matching a heading element ID in the document. */
  id: string;
  /** Visible heading text displayed inside the outline list. */
  title: string;
  /** Structural heading level (`1` = H1, `2` = H2, `3` = H3) controlling visual indentation and hierarchy. */
  level: TocHeadingLevel;
}

export interface FloatingTableOfContentsProps extends BaseProps<HTMLElement> {
  /** Ordered document headings rendered in the outline (defaults to 6 realistic nested H1/H2/H3 sections when omitted; renders a `role="status"` empty state when `[]`). */
  headings?: ReadonlyArray<TocHeadingEntry>;
  /** Controlled active heading identifier. */
  activeId?: string;
  /** Initial uncontrolled active heading identifier (defaults to the first heading ID). */
  defaultActiveId?: string;
  /** Optional reading progress percentage in `0..100`; computed automatically from the active heading position when omitted. */
  scrollProgressPct?: number;
  /** When `true`, attaches a passive window scroll-spy listener tracking matching DOM heading `id`s via `getBoundingClientRect().top` and cleans up on unmount (defaults to `false`). */
  observeDocumentScroll?: boolean;
  /** Callback invoked when a heading is activated via pointer click or keyboard selection. */
  onSelectHeading?: (heading: TocHeadingEntry) => void;
  /** Header title and semantic `<nav>` accessible label (defaults to `'On This Page'`). */
  title?: string;
  /** Applies sticky floating positioning (`sticky top-6`) so the outline remains visible while scrolling (defaults to `true`). */
  sticky?: boolean;
}

interface NormalizedTocHeading {
  reactKey: string;
  id: string;
  title: string;
  level: TocHeadingLevel;
  entry: TocHeadingEntry;
}

interface HeadingLevelVisualMeta {
  indentPx: number;
  textClass: string;
  defaultColorVar: string;
}

const DEFAULT_TOC_TITLE = 'On This Page';
const SCROLL_SPY_OFFSET_PX = 120;

const DEFAULT_TOC_HEADINGS: ReadonlyArray<TocHeadingEntry> = [
  { id: 'optical-overview', title: 'Optical Architecture Overview', level: 1 },
  { id: 'refraction-tokens', title: 'Refraction & Dispersion Tokens', level: 2 },
  { id: 'surface-layers', title: 'Crystal & Slab Surface Layers', level: 3 },
  { id: 'theme-cascade', title: 'Dual-Mode Theme Cascade', level: 2 },
  { id: 'accessibility-contracts', title: 'Keyboard & Focus Contracts', level: 3 },
  { id: 'migration-guide', title: 'Production Migration Guide', level: 1 },
];

function getHeadingLevelMeta(level: TocHeadingLevel): HeadingLevelVisualMeta {
  switch (level) {
    case 1:
      return {
        indentPx: 20,
        textClass: 'text-[13px] font-medium',
        defaultColorVar: 'var(--prism-text-primary)',
      };
    case 2:
      return {
        indentPx: 32,
        textClass: 'text-xs font-normal',
        defaultColorVar: 'var(--prism-text-secondary)',
      };
    case 3:
      return {
        indentPx: 44,
        textClass: 'text-[11px] font-normal',
        defaultColorVar: 'var(--prism-text-secondary)',
      };
  }
}

const headerClass = /*#__PURE__*/ stableClassName('floating-table-of-contents', 'header');
const titleClass = /*#__PURE__*/ stableClassName('floating-table-of-contents', 'title');
const progressPillClass = /*#__PURE__*/ stableClassName('floating-table-of-contents', 'progress-pill');
const progressTrackClass = /*#__PURE__*/ stableClassName('floating-table-of-contents', 'progress-track');
const railClass = /*#__PURE__*/ stableClassName('floating-table-of-contents', 'rail');
const listClass = /*#__PURE__*/ stableClassName('floating-table-of-contents', 'list');
const itemClass = /*#__PURE__*/ stableClassName('floating-table-of-contents', 'item');
const indicatorClass = /*#__PURE__*/ stableClassName('floating-table-of-contents', 'indicator');
const emptyClass = /*#__PURE__*/ stableClassName('floating-table-of-contents', 'empty');

function FloatingTableOfContentsInner({
  headings,
  activeId,
  defaultActiveId,
  scrollProgressPct,
  observeDocumentScroll = false,
  onSelectHeading,
  title = DEFAULT_TOC_TITLE,
  sticky = true,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FloatingTableOfContentsProps) {
  const override = useComponentOverride('FloatingTableOfContents');
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const resolvedTitle = title.trim() || DEFAULT_TOC_TITLE;

  const normalizedHeadings = useMemo<ReadonlyArray<NormalizedTocHeading>>(() => {
    const source = headings ?? DEFAULT_TOC_HEADINGS;
    const seenIds = new Map<string, number>();

    return source.map((item, idx) => {
      const trimmedId = item.id.trim();
      const resolvedId = trimmedId || `section-${idx + 1}`;
      const trimmedTitle = item.title.trim();
      const resolvedItemTitle = trimmedTitle || resolvedId;

      const seen = seenIds.get(resolvedId) ?? 0;
      seenIds.set(resolvedId, seen + 1);
      const reactKey =
        seen === 0 ? `toc:${resolvedId}` : `toc:${resolvedId}#${seen + 1}`;

      return {
        reactKey,
        id: resolvedId,
        title: resolvedItemTitle,
        level: item.level,
        entry: {
          id: resolvedId,
          title: resolvedItemTitle,
          level: item.level,
        },
      };
    });
  }, [headings]);

  const isEmpty = normalizedHeadings.length === 0;
  const firstHeadingId = normalizedHeadings[0]?.id ?? '';
  const initialActiveId = defaultActiveId?.trim() || firstHeadingId;

  const [currentActiveId, setCurrentActiveId] = useControllableState<string>({
    value: activeId,
    defaultValue: initialActiveId,
  });

  const matchedEntry = normalizedHeadings.find(
    (item) => item.id === currentActiveId
  );
  const activeEntry =
    matchedEntry ??
    (activeId === undefined ? normalizedHeadings[0] : undefined);
  const activeIndex = activeEntry
    ? normalizedHeadings.indexOf(activeEntry)
    : -1;
  const resolvedActiveId = activeEntry ? activeEntry.id : '';

  const computedProgressPct =
    activeIndex >= 0
      ? Math.round(((activeIndex + 1) / normalizedHeadings.length) * 100)
      : 0;

  const resolvedProgressPct =
    scrollProgressPct !== undefined && Number.isFinite(scrollProgressPct)
      ? Math.round(clampNumber(scrollProgressPct, 0, 100, 0))
      : computedProgressPct;

  const activeIdRef = useRef(resolvedActiveId);
  activeIdRef.current = resolvedActiveId;

  useEffect(() => {
    if (!observeDocumentScroll || normalizedHeadings.length === 0) {
      return;
    }

    const syncActiveHeadingFromScroll = () => {
      let firstFoundId: string | null = null;
      let passedCandidateId: string | null = null;

      for (const item of normalizedHeadings) {
        const element = document.getElementById(item.id);
        if (!element) {
          continue;
        }
        if (firstFoundId === null) {
          firstFoundId = item.id;
        }
        if (element.getBoundingClientRect().top <= SCROLL_SPY_OFFSET_PX) {
          passedCandidateId = item.id;
        }
      }

      const nextId = passedCandidateId ?? firstFoundId;
      if (nextId !== null && nextId !== activeIdRef.current) {
        activeIdRef.current = nextId;
        setCurrentActiveId(nextId);
      }
    };

    syncActiveHeadingFromScroll();
    window.addEventListener('scroll', syncActiveHeadingFromScroll, {
      passive: true,
    });
    window.addEventListener('resize', syncActiveHeadingFromScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', syncActiveHeadingFromScroll);
      window.removeEventListener('resize', syncActiveHeadingFromScroll);
    };
  }, [normalizedHeadings, observeDocumentScroll, setCurrentActiveId]);

  const handleSelectHeading = useCallback(
    (item: NormalizedTocHeading) => {
      setCurrentActiveId(item.id);
      const targetElement = document.getElementById(item.id);
      if (targetElement && typeof targetElement.scrollIntoView === 'function') {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      onSelectHeading?.(item.entry);
    },
    [onSelectHeading, setCurrentActiveId]
  );

  const handleItemKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      item: NormalizedTocHeading,
      index: number
    ) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectHeading(item);
        return;
      }

      const count = normalizedHeadings.length;
      let targetItem: NormalizedTocHeading | undefined;

      if (event.key === 'ArrowDown') {
        targetItem = normalizedHeadings[(index + 1) % count];
      } else if (event.key === 'ArrowUp') {
        targetItem = normalizedHeadings[(index - 1 + count) % count];
      } else if (event.key === 'Home') {
        targetItem = normalizedHeadings[0];
      } else if (event.key === 'End') {
        targetItem = normalizedHeadings[count - 1];
      }

      if (targetItem) {
        event.preventDefault();
        buttonRefs.current.get(targetItem.reactKey)?.focus();
      }
    },
    [handleSelectHeading, normalizedHeadings]
  );

  const merged = mergeProps({
    themeTarget: themeProps('floating-table-of-contents', {
      sticky,
      empty: isEmpty,
      observingScroll: observeDocumentScroll,
      activeId: resolvedActiveId || undefined,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 rounded-2xl p-4 flex flex-col gap-3',
      sticky && 'sticky top-6 self-start'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <nav ref={ref} aria-label={resolvedTitle} {...rest} {...merged}>
      <div
        className={cx(
          headerClass,
          'flex flex-col gap-2 min-w-0 max-w-full'
        )}
      >
        <div className="flex items-center justify-between gap-2 min-w-0 max-w-full">
          <div className="flex items-center gap-2 min-w-0">
            <ListTree
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_PRIMARY_MAIN}
            />
            <span
              data-testid="toc-title"
              className={cx(
                titleClass,
                'text-xs font-semibold uppercase tracking-wider truncate min-w-0'
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              {resolvedTitle}
            </span>
          </div>

          <span
            aria-hidden="true"
            data-testid="toc-progress-pill"
            className={cx(
              progressPillClass,
              'prism-well inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-mono font-medium tabular-nums shrink-0'
            )}
            style={STYLE_PRIMARY_MAIN}
          >
            {resolvedProgressPct}%
          </span>
        </div>

        <div
          role="progressbar"
          aria-label={`${resolvedTitle} reading progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={resolvedProgressPct}
          aria-valuetext={`${resolvedProgressPct}%`}
          data-testid="toc-progress-bar"
          className={cx(
            progressTrackClass,
            'prism-well relative h-1 w-full overflow-hidden rounded-full'
          )}
        >
          <span
            data-testid="toc-progress-fill"
            className="block h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-300"
            style={{
              width: `${resolvedProgressPct}%`,
              backgroundColor: 'var(--prism-primary-main)',
              boxShadow:
                resolvedProgressPct > 0
                  ? '0 0 8px var(--prism-primary-main)'
                  : undefined,
            }}
          />
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="toc-empty"
          className={cx(
            emptyClass,
            'prism-well rounded-xl px-3 py-4 text-center text-xs flex flex-col items-center gap-1.5 min-w-0 max-w-full'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          <FileText
            aria-hidden="true"
            className="w-4 h-4 shrink-0 opacity-75"
          />
          <span
            className="font-medium"
            style={STYLE_TEXT_PRIMARY}
          >
            No sections available
          </span>
          <span>Add document headings to populate the outline.</span>
        </div>
      ) : (
        <div className="relative min-w-0 max-w-full">
          <span
            aria-hidden="true"
            data-testid="toc-rail"
            className={cx(
              railClass,
              'pointer-events-none absolute top-1 bottom-1 left-2 w-[2px] rounded-full'
            )}
            style={STYLE_BG_DIVIDER}
          />

          <ol
            data-testid="toc-list"
            className={cx(
              listClass,
              'relative flex flex-col gap-0.5 min-w-0 max-w-full list-none m-0 p-0'
            )}
          >
            {normalizedHeadings.map((item, index) => {
              const isActive = item.id === resolvedActiveId;
              const levelMeta = getHeadingLevelMeta(item.level);

              return (
                <li
                  key={item.reactKey}
                  className="relative min-w-0 max-w-full"
                >
                  <button
                    ref={(node) => {
                      if (node) {
                        buttonRefs.current.set(item.reactKey, node);
                      } else {
                        buttonRefs.current.delete(item.reactKey);
                      }
                    }}
                    type="button"
                    aria-current={isActive ? 'location' : undefined}
                    data-testid={`toc-item-${item.id}`}
                    data-heading-id={item.id}
                    data-level={String(item.level)}
                    data-active={isActive ? 'true' : undefined}
                    onClick={() => handleSelectHeading(item)}
                    onKeyDown={(event) => handleItemKeyDown(event, item, index)}
                    className={cx(
                      itemClass,
                      'prism-focus-ring relative flex w-full min-w-0 max-w-full items-center rounded-lg pr-2.5 py-1.5 text-left cursor-pointer transition-[color,background-color,border-color,opacity,transform] duration-150',
                      levelMeta.textClass,
                      isActive && 'font-semibold'
                    )}
                    style={{
                      paddingLeft: `${levelMeta.indentPx}px`,
                      color: isActive
                        ? 'var(--prism-primary-main)'
                        : levelMeta.defaultColorVar,
                      backgroundColor: isActive
                        ? 'color-mix(in srgb, var(--prism-primary-main) 12%, transparent)'
                        : undefined,
                    }}
                  >
                    {isActive ? (
                      <span
                        aria-hidden="true"
                        data-testid="toc-active-indicator"
                        className={cx(
                          indicatorClass,
                          'pointer-events-none absolute left-[7px] top-1.5 bottom-1.5 w-[4px] rounded-full transition-[color,background-color,border-color,opacity,transform] duration-200'
                        )}
                        style={{
                          backgroundColor: 'var(--prism-primary-main)',
                          boxShadow:
                            '0 0 10px var(--prism-primary-main), 0 0 4px var(--prism-primary-light)',
                        }}
                      />
                    ) : null}
                    <span className="truncate min-w-0 max-w-full leading-snug">
                      {item.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </nav>
  );
}

export const FloatingTableOfContents = /*#__PURE__*/ memoWithDisplayName(FloatingTableOfContentsInner, 'FloatingTableOfContents');
