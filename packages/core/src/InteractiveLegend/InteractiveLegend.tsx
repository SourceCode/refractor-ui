'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Layers, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type LegendTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';
export type InteractiveLegendOrientation = 'horizontal' | 'vertical';

export interface LegendSeriesItem {
  /** Stable unique identifier for the series (duplicate IDs are deduplicated by first occurrence). */
  id: string;
  /** Human-readable label shown in the legend pill or row. */
  label: string;
  /** Optional formatted or numeric summary value rendered in tabular numerals. */
  value?: string | number;
  /** Optional unit suffix appended to the formatted readout (e.g. 'ms', '%', 'req/s'). */
  unit?: string;
  /** Semantic optical tone mapped to --prism-* CSS custom properties. */
  tone?: LegendTone;
  /** Renders a dashed stroke swatch sample instead of a solid dot when true. */
  dashed?: boolean;
}

export interface InteractiveLegendProps extends BaseProps<HTMLDivElement> {
  /** Ordered series items to display in the legend (deduplicated by `id`). */
  items: LegendSeriesItem[];
  /** Optional legend panel heading (defaults to 'Series Legend'). */
  title?: string;
  /** Layout orientation for series items ('horizontal' | 'vertical', defaults to 'horizontal'). */
  orientation?: InteractiveLegendOrientation;
  /** Controlled list of hidden series IDs. */
  hiddenIds?: string[];
  /** Uncontrolled initial list of hidden series IDs. */
  defaultHiddenIds?: string[];
  /** Callback invoked with the updated hidden series ID list whenever visibility changes. */
  onHiddenIdsChange?: (hiddenIds: string[]) => void;
  /** Callback invoked on pointer enter or focus with the series ID, and on leave or blur with null. */
  onHighlightSeries?: (seriesId: string | null) => void;
  /** Enables double-click series isolation and compact Solo buttons when at least 2 items exist (defaults to true). */
  allowSolo?: boolean;
}

interface NormalizedLegendItem {
  key: string;
  id: string;
  label: string;
  tone: LegendTone;
  colorToken: string;
  dashed: boolean;
  formattedReadout: string | null;
}

const EMPTY_HIDDEN_IDS: string[] = [];

function getDefaultTone(index: number): LegendTone {
  switch (index % 5) {
    case 0:
      return 'primary';
    case 1:
      return 'secondary';
    case 2:
      return 'emerald';
    case 3:
      return 'amber';
    default:
      return 'rose';
  }
}

function getToneToken(tone: LegendTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'secondary':
      return 'var(--prism-secondary-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'rose':
      return 'var(--prism-error-main)';
  }
}

function formatReadout(value: string | number | undefined, unit?: string): string | null {
  if (value === undefined) return null;
  let formatted: string;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const safe = value === 0 ? 0 : value;
    formatted = String(safe);
  } else {
    const trimmed = value.trim();
    if (!trimmed) return null;
    formatted = trimmed;
  }
  const cleanUnit = unit?.trim() ?? '';
  return cleanUnit ? `${formatted}${cleanUnit}` : formatted;
}

const headerClass = /*#__PURE__*/ stableClassName('interactive-legend', 'header');
const listClass = /*#__PURE__*/ stableClassName('interactive-legend', 'list');
const itemClass = /*#__PURE__*/ stableClassName('interactive-legend', 'item');
const swatchClass = /*#__PURE__*/ stableClassName('interactive-legend', 'swatch');
const readoutClass = /*#__PURE__*/ stableClassName('interactive-legend', 'readout');
const soloClass = /*#__PURE__*/ stableClassName('interactive-legend', 'solo');
const emptyClass = /*#__PURE__*/ stableClassName('interactive-legend', 'empty');

function InteractiveLegendInner({
  items,
  title = 'Series Legend',
  orientation = 'horizontal',
  hiddenIds,
  defaultHiddenIds,
  onHiddenIdsChange,
  onHighlightSeries,
  allowSolo = true,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: InteractiveLegendProps) {
  const override = useComponentOverride('InteractiveLegend');
  const headingId = useId();
  const activeHighlightRef = useRef<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [rawHiddenIds, setHiddenIds] = useControllableState<string[]>({
    value: hiddenIds,
    defaultValue: defaultHiddenIds ?? EMPTY_HIDDEN_IDS,
    onChange: onHiddenIdsChange,
  });

  const normalizedItems = useMemo<NormalizedLegendItem[]>(() => {
    const seen = new Map<string, NormalizedLegendItem>();
    const result: NormalizedLegendItem[] = [];
    for (const item of items) {
      if (seen.has(item.id)) continue;
      const tone = item.tone ?? getDefaultTone(result.length);
      const normalized: NormalizedLegendItem = {
        key: `legend:${item.id}`,
        id: item.id,
        label: item.label,
        tone,
        colorToken: getToneToken(tone),
        dashed: Boolean(item.dashed),
        formattedReadout: formatReadout(item.value, item.unit),
      };
      seen.set(item.id, normalized);
      result.push(normalized);
    }
    return result;
  }, [items]);

  const hiddenIdSet = useMemo<ReadonlySet<string>>(() => {
    const validIds = new Set<string>(normalizedItems.map((item) => item.id));
    const next = new Set<string>();
    for (const id of rawHiddenIds) {
      if (validIds.has(id)) {
        next.add(id);
      }
    }
    return next;
  }, [normalizedItems, rawHiddenIds]);

  const totalCount = normalizedItems.length;
  const visibleCount = totalCount - hiddenIdSet.size;
  const isEmpty = totalCount === 0;
  const hasHidden = hiddenIdSet.size > 0;
  const allHidden = !isEmpty && visibleCount === 0;
  const canSolo = allowSolo && totalCount >= 2;

  const updateHighlight = (seriesId: string) => {
    if (activeHighlightRef.current === seriesId) return;
    activeHighlightRef.current = seriesId;
    setHighlightedId(seriesId);
    onHighlightSeries?.(seriesId);
  };

  const clearHighlight = (seriesId: string) => {
    if (activeHighlightRef.current !== seriesId) return;
    activeHighlightRef.current = null;
    setHighlightedId(null);
    onHighlightSeries?.(null);
  };

  const handleToggleSeries = (seriesId: string) => {
    const nextHiddenSet = new Set<string>(hiddenIdSet);
    if (nextHiddenSet.has(seriesId)) {
      nextHiddenSet.delete(seriesId);
    } else {
      nextHiddenSet.add(seriesId);
    }
    const nextHidden = normalizedItems
      .filter((item) => nextHiddenSet.has(item.id))
      .map((item) => item.id);
    setHiddenIds(nextHidden);
  };

  const handleSoloSeries = (seriesId: string) => {
    const isAlreadySoloed = visibleCount === 1 && !hiddenIdSet.has(seriesId);
    if (isAlreadySoloed) {
      setHiddenIds([]);
      return;
    }
    const nextHidden = normalizedItems
      .filter((item) => item.id !== seriesId)
      .map((item) => item.id);
    setHiddenIds(nextHidden);
  };

  const handleDoubleClickSeries = (seriesId: string) => {
    if (!canSolo) return;
    handleSoloSeries(seriesId);
  };

  const handleShowAll = () => {
    setHiddenIds([]);
  };

  const handleButtonKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    action: () => void
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('interactive-legend', {
      orientation,
      allowSolo,
      empty: isEmpty,
      hasHidden,
      allHidden,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full space-y-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const isAllActive = !isEmpty && !hasHidden;

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5')}>
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Layers aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="interactive-legend-active-count"
            className={cx(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-mono tabular-nums',
              isAllActive ? 'prism-emerald' : 'prism-well'
            )}
            style={isAllActive ? undefined : STYLE_TEXT_SECONDARY}
          >
            {visibleCount} / {totalCount} active
          </span>

          {hasHidden ? (
            <button
              type="button"
              data-testid="interactive-legend-show-all"
              onClick={handleShowAll}
              onKeyDown={(event) => handleButtonKeyDown(event, handleShowAll)}
              className="prism-crystal prism-focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform]"
              style={STYLE_TEXT_PRIMARY}
            >
              <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Show All</span>
            </button>
          ) : null}
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="interactive-legend-empty"
          className={cx(emptyClass, 'prism-well rounded-2xl px-4 py-6 text-center text-xs')}
          style={STYLE_TEXT_SECONDARY}
        >
          No series available in legend.
        </div>
      ) : (
        <div
          role="group"
          aria-labelledby={headingId}
          data-testid="interactive-legend-list"
          data-orientation={orientation}
          className={cx(
            listClass,
            orientation === 'vertical'
              ? 'flex flex-col gap-2'
              : 'flex flex-wrap items-center gap-2'
          )}
        >
          {normalizedItems.map((item) => {
            const isHidden = hiddenIdSet.has(item.id);
            const isSoloed = canSolo && visibleCount === 1 && !isHidden;
            const isHighlighted = highlightedId === item.id;
            const swatchColor = isHidden ? 'var(--prism-text-disabled)' : item.colorToken;

            return (
              <div
                key={item.key}
                data-testid={`interactive-legend-item-${item.id}`}
                data-series-id={item.id}
                data-tone={item.tone}
                data-visible={isHidden ? 'false' : 'true'}
                data-highlighted={isHighlighted ? 'true' : undefined}
                data-soloed={isSoloed ? 'true' : undefined}
                className={cx(
                  itemClass,
                  orientation === 'vertical'
                    ? 'flex items-center justify-between gap-2 rounded-2xl px-3 py-2 transition-[color,background-color,border-color,opacity,transform]'
                    : 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-[color,background-color,border-color,opacity,transform]',
                  isHidden ? 'prism-well opacity-60' : 'prism-crystal'
                )}
                style={
                  isHighlighted
                    ? { boxShadow: `0 0 0 2px ${item.colorToken}` }
                    : undefined
                }
              >
                <button
                  type="button"
                  aria-pressed={!isHidden}
                  data-testid={`interactive-legend-toggle-${item.id}`}
                  data-tone={item.tone}
                  onClick={() => handleToggleSeries(item.id)}
                  onDoubleClick={() => handleDoubleClickSeries(item.id)}
                  onKeyDown={(event) =>
                    handleButtonKeyDown(event, () => handleToggleSeries(item.id))
                  }
                  onPointerEnter={() => updateHighlight(item.id)}
                  onPointerLeave={() => clearHighlight(item.id)}
                  onMouseEnter={() => updateHighlight(item.id)}
                  onMouseLeave={() => clearHighlight(item.id)}
                  onFocus={() => updateHighlight(item.id)}
                  onBlur={() => clearHighlight(item.id)}
                  className={cx(
                    'prism-focus-ring inline-flex items-center gap-2 min-w-0 text-left text-xs font-medium cursor-pointer rounded-full bg-transparent border-0 px-0.5 py-0.5 transition-opacity',
                    orientation === 'vertical' ? 'flex-1 justify-between' : ''
                  )}
                  style={{
                    color: isHidden
                      ? 'var(--prism-text-secondary)'
                      : 'var(--prism-text-primary)',
                  }}
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    {item.dashed ? (
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="6"
                        viewBox="0 0 16 6"
                        data-testid={`interactive-legend-swatch-${item.id}`}
                        data-swatch="dashed"
                        className={cx(swatchClass, 'shrink-0', 'prism-contain-box')}
                      >
                        <line
                          x1="0"
                          y1="3"
                          x2="16"
                          y2="3"
                          stroke={swatchColor}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray="4 3"
                        />
                      </svg>
                    ) : (
                      <span
                        aria-hidden="true"
                        data-testid={`interactive-legend-swatch-${item.id}`}
                        data-swatch="dot"
                        className={cx(swatchClass, 'w-2.5 h-2.5 rounded-full shrink-0')}
                        style={{ backgroundColor: swatchColor }}
                      />
                    )}
                    <span className={cx('truncate', isHidden ? 'line-through' : '')}>
                      {item.label}
                    </span>
                  </span>

                  {item.formattedReadout !== null ? (
                    <span
                      data-testid={`interactive-legend-value-${item.id}`}
                      className={cx(
                        readoutClass,
                        'font-mono font-semibold tabular-nums shrink-0 text-[11px]'
                      )}
                      style={{
                        color: isHidden
                          ? 'var(--prism-text-disabled)'
                          : 'var(--prism-text-secondary)',
                      }}
                    >
                      {item.formattedReadout}
                    </span>
                  ) : null}
                </button>

                {canSolo ? (
                  <button
                    type="button"
                    aria-pressed={isSoloed}
                    aria-label={
                      isSoloed
                        ? `Solo ${item.label} (active — activate to show all series)`
                        : `Solo ${item.label}`
                    }
                    data-testid={`interactive-legend-solo-${item.id}`}
                    onClick={() => handleSoloSeries(item.id)}
                    onKeyDown={(event) =>
                      handleButtonKeyDown(event, () => handleSoloSeries(item.id))
                    }
                    className={cx(
                      soloClass,
                      'prism-focus-ring shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                      isSoloed ? 'prism-emerald' : 'prism-well'
                    )}
                    style={isSoloed ? undefined : STYLE_TEXT_SECONDARY}
                  >
                    Solo
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const InteractiveLegend = /*#__PURE__*/ memoWithDisplayName(InteractiveLegendInner, 'InteractiveLegend');
