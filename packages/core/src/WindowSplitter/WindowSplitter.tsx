'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type WindowSplitterOrientation = 'horizontal' | 'vertical';

export interface WindowSplitterPane {
  /** Unique identifier for the pane. */
  id: string;
  /** Optional visible header and accessible region label for the pane. */
  label?: string;
  /** Content rendered inside the recessed frosted pane. */
  content: ReactNode;
  /** Minimum percentage size (0-100, defaults to 10). */
  minSize?: number;
  /** Maximum percentage size (0-100, defaults to 90). */
  maxSize?: number;
}

type WindowSplitterBaseProps = Omit<BaseProps<HTMLDivElement>, 'children'>;

export interface WindowSplitterProps extends WindowSplitterBaseProps {
  /** Ordered list of 2 or more resizable panes (0 or 1 pane handled gracefully). */
  panes: ReadonlyArray<WindowSplitterPane>;
  /** Split layout axis: 'horizontal' arranges panes left-to-right; 'vertical' stacks top-to-bottom. */
  orientation?: WindowSplitterOrientation;
  /** Controlled pane size percentages summing to 100. */
  sizes?: ReadonlyArray<number>;
  /** Uncontrolled initial pane size percentages (defaults to equal split). */
  defaultSizes?: ReadonlyArray<number>;
  /** Callback invoked whenever pane sizes change via drag, keyboard, or reset. */
  onSizesChange?: (sizes: number[]) => void;
  /** Keyboard resize increment in percent (defaults to 5). */
  step?: number;
}

interface PaneBounds {
  min: number;
  max: number;
}

interface PaneSlot extends PaneBounds {
  size: number;
}

const DEFAULT_MIN_PCT = 10;
const DEFAULT_MAX_PCT = 90;
const EPSILON = 0.001;

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function getPaneBounds(pane: WindowSplitterPane, count: number): PaneBounds {
  const fallbackMin = Math.min(DEFAULT_MIN_PCT, 100 / count);
  const rawMin =
    pane.minSize === undefined ? fallbackMin : clampNumber(pane.minSize, 0, 100, fallbackMin);
  const rawMax =
    pane.maxSize === undefined ? DEFAULT_MAX_PCT : clampNumber(pane.maxSize, 0, 100, DEFAULT_MAX_PCT);
  return {
    min: Math.min(rawMin, rawMax),
    max: Math.max(rawMin, rawMax),
  };
}

function normalizeSizes(
  rawSizes: ReadonlyArray<number> | undefined,
  panes: ReadonlyArray<WindowSplitterPane>
): number[] {
  const count = panes.length;
  if (count === 0) return [];
  if (count === 1) return [100];

  const equal = 100 / count;
  const cleaned =
    rawSizes && rawSizes.length === count
      ? rawSizes.map((size) => clampNumber(size, 0, 100, 0))
      : null;
  const cleanedTotal = cleaned ? cleaned.reduce((acc, val) => acc + val, 0) : 0;

  const slots: PaneSlot[] = panes.map((pane, idx) => {
    const { min, max } = getPaneBounds(pane, count);
    const scaled =
      cleaned && cleanedTotal > 0 ? ((cleaned[idx] ?? 0) / cleanedTotal) * 100 : equal;
    return {
      size: clampNumber(scaled, min, max, min),
      min,
      max,
    };
  });

  for (let pass = 0; pass < count + 2; pass += 1) {
    const sum = slots.reduce((acc, slot) => acc + slot.size, 0);
    const diff = 100 - sum;
    if (Math.abs(diff) <= EPSILON) break;

    const growing = diff > 0;
    const totalCapacity = slots.reduce(
      (acc, slot) =>
        acc + (growing ? Math.max(0, slot.max - slot.size) : Math.max(0, slot.size - slot.min)),
      0
    );
    if (totalCapacity <= EPSILON) break;

    const amount = Math.min(Math.abs(diff), totalCapacity);
    for (const slot of slots) {
      const cap = growing
        ? Math.max(0, slot.max - slot.size)
        : Math.max(0, slot.size - slot.min);
      if (cap <= EPSILON) continue;
      const share = (cap / totalCapacity) * amount;
      slot.size = growing ? slot.size + share : slot.size - share;
    }
  }

  for (const slot of slots) {
    slot.size = roundPercent(slot.size);
  }

  const roundedDiff = roundPercent(100 - slots.reduce((acc, slot) => acc + slot.size, 0));
  if (Math.abs(roundedDiff) > 0) {
    for (const slot of [...slots].reverse()) {
      const candidate = roundPercent(slot.size + roundedDiff);
      if (candidate >= slot.min && candidate <= slot.max) {
        slot.size = candidate;
        break;
      }
    }
  }

  return slots.map((slot) => slot.size);
}

function getPairLeadRange(
  leadPane: WindowSplitterPane,
  trailPane: WindowSplitterPane,
  leadSize: number,
  trailSize: number,
  count: number
): { minLead: number; maxLead: number; pairTotal: number } {
  const leadBounds = getPaneBounds(leadPane, count);
  const trailBounds = getPaneBounds(trailPane, count);
  const pairTotal = leadSize + trailSize;
  const rawMinLead = Math.max(leadBounds.min, pairTotal - trailBounds.max);
  const rawMaxLead = Math.min(leadBounds.max, pairTotal - trailBounds.min);

  return {
    minLead: Math.min(rawMinLead, rawMaxLead),
    maxLead: Math.max(rawMinLead, rawMaxLead),
    pairTotal,
  };
}

function resizeAdjacentPair(
  baseSizes: ReadonlyArray<number>,
  index: number,
  desiredLead: number,
  leadPane: WindowSplitterPane,
  trailPane: WindowSplitterPane,
  leadSize: number,
  trailSize: number,
  count: number
): number[] {
  const { minLead, maxLead, pairTotal } = getPairLeadRange(
    leadPane,
    trailPane,
    leadSize,
    trailSize,
    count
  );
  const nextLead = roundPercent(clampNumber(desiredLead, minLead, maxLead, leadSize));
  const nextTrail = roundPercent(pairTotal - nextLead);

  const next = [...baseSizes];
  next[index] = nextLead;
  next[index + 1] = nextTrail;
  return next;
}

const paneClass = /*#__PURE__*/ stableClassName('window-splitter', 'pane');
const separatorClass = /*#__PURE__*/ stableClassName('window-splitter', 'separator');

function WindowSplitterInner({
  panes,
  orientation = 'horizontal',
  sizes,
  defaultSizes,
  onSizesChange,
  step = 5,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: WindowSplitterProps) {
  const override = useComponentOverride('WindowSplitter');
  const containerRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const isControlled = sizes !== undefined;
  const resetBaseline = useMemo(
    () => normalizeSizes(defaultSizes, panes),
    [defaultSizes, panes]
  );

  const [uncontrolledSizes, setUncontrolledSizes] = useState<number[]>(() => resetBaseline);
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);

  const currentSizes = useMemo(() => {
    if (isControlled) {
      return normalizeSizes(sizes, panes);
    }
    if (uncontrolledSizes.length !== panes.length) {
      return resetBaseline;
    }
    return normalizeSizes(uncontrolledSizes, panes);
  }, [isControlled, sizes, uncontrolledSizes, panes, resetBaseline]);

  const safeStep = Number.isFinite(step) && step > 0 ? clampNumber(step, 0.5, 50, 5) : 5;

  const commitSizes = useCallback(
    (next: number[]) => {
      if (!isControlled) {
        setUncontrolledSizes(next);
      }
      onSizesChange?.(next);
    },
    [isControlled, onSizesChange]
  );

  const latestRef = useRef({
    commitSizes,
    orientation,
    panes,
  });
  latestRef.current = { commitSizes, orientation, panes };

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const handleSeparatorPointerDown = useCallback(
    (
      index: number,
      leadPane: WindowSplitterPane,
      trailPane: WindowSplitterPane,
      startLead: number,
      startTrail: number,
      event: ReactPointerEvent<HTMLDivElement>
    ) => {
      if (event.button > 0) return;
      event.preventDefault();
      cleanupDragRef.current?.();

      const startCoord = orientation === 'horizontal' ? event.clientX : event.clientY;
      const startSizes = [...currentSizes];
      setActiveDragIndex(index);

      const handlePointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const { orientation: liveOrientation, panes: livePanes, commitSizes: liveCommit } =
          latestRef.current;
        const totalPx = liveOrientation === 'horizontal' ? rect.width : rect.height;
        if (!Number.isFinite(totalPx) || totalPx <= 0) return;

        const currentCoord = liveOrientation === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
        const deltaPct = ((currentCoord - startCoord) / totalPx) * 100;
        const nextSizes = resizeAdjacentPair(
          startSizes,
          index,
          startLead + deltaPct,
          leadPane,
          trailPane,
          startLead,
          startTrail,
          livePanes.length
        );
        liveCommit(nextSizes);
      });

      const cleanup = () => {
        handlePointerMove.cancel();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setActiveDragIndex(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [currentSizes, orientation]
  );

  const handleSeparatorDoubleClick = useCallback(() => {
    commitSizes(resetBaseline);
  }, [commitSizes, resetBaseline]);

  const handleSeparatorKeyDown = useCallback(
    (
      index: number,
      leadPane: WindowSplitterPane,
      trailPane: WindowSplitterPane,
      leadSize: number,
      trailSize: number,
      event: KeyboardEvent<HTMLDivElement>
    ) => {
      if (event.nativeEvent.isComposing) return;

      const { minLead, maxLead } = getPairLeadRange(
        leadPane,
        trailPane,
        leadSize,
        trailSize,
        panes.length
      );
      const shrinkKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      const growKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

      if (event.key === shrinkKey) {
        event.preventDefault();
        commitSizes(
          resizeAdjacentPair(
            currentSizes,
            index,
            leadSize - safeStep,
            leadPane,
            trailPane,
            leadSize,
            trailSize,
            panes.length
          )
        );
      } else if (event.key === growKey) {
        event.preventDefault();
        commitSizes(
          resizeAdjacentPair(
            currentSizes,
            index,
            leadSize + safeStep,
            leadPane,
            trailPane,
            leadSize,
            trailSize,
            panes.length
          )
        );
      } else if (event.key === 'Home') {
        event.preventDefault();
        commitSizes(
          resizeAdjacentPair(
            currentSizes,
            index,
            minLead,
            leadPane,
            trailPane,
            leadSize,
            trailSize,
            panes.length
          )
        );
      } else if (event.key === 'End') {
        event.preventDefault();
        commitSizes(
          resizeAdjacentPair(
            currentSizes,
            index,
            maxLead,
            leadPane,
            trailPane,
            leadSize,
            trailSize,
            panes.length
          )
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        commitSizes(resetBaseline);
      }
    },
    [commitSizes, currentSizes, orientation, panes.length, resetBaseline, safeStep]
  );

  const isHorizontal = orientation === 'horizontal';
  const merged = mergeProps({
    themeTarget: themeProps('window-splitter', {
      orientation,
      dragging: activeDragIndex !== null,
      panes: panes.length,
    }),
    baseClassName: cx(
      'prism-slab p-2 overflow-hidden flex w-full h-full min-w-0 min-h-0',
      isHorizontal ? 'flex-row' : 'flex-col'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const paneEntries = panes.map((pane, index) => ({
    pane,
    sizePct: currentSizes[index] ?? 100,
  }));

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      {paneEntries.map(({ pane, sizePct }, index) => {
        const nextEntry = paneEntries[index + 1];
        const isDragging = activeDragIndex === index;
        const pairRange = nextEntry
          ? getPairLeadRange(pane, nextEntry.pane, sizePct, nextEntry.sizePct, panes.length)
          : null;

        return (
          <Fragment key={pane.id}>
            <div
              role={pane.label ? 'region' : undefined}
              aria-label={pane.label}
              data-pane-id={pane.id}
              data-pane-size={String(sizePct)}
              style={{ flex: `${sizePct} 1 0%` }}
              className={cx(
                paneClass,
                'prism-well rounded-[18px] overflow-auto min-w-0 min-h-0 flex flex-col'
              )}
            >
              {pane.label ? (
                <div className="px-3.5 py-2 border-b border-[var(--prism-divider)] flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold tracking-[-0.01em] text-slate-700 dark:text-slate-200 truncate">
                    {pane.label}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {Math.round(sizePct)}%
                  </span>
                </div>
              ) : null}
              <div className="p-3.5 flex-1 min-w-0 min-h-0 text-sm text-slate-700 dark:text-slate-200">
                {pane.content}
              </div>
            </div>

            {nextEntry && pairRange ? (
              <div
                role="separator"
                tabIndex={0}
                aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
                aria-valuenow={Math.round(sizePct)}
                aria-valuemin={Math.round(pairRange.minLead)}
                aria-valuemax={Math.round(pairRange.maxLead)}
                aria-label={`Resize ${pane.label ?? pane.id} and ${nextEntry.pane.label ?? nextEntry.pane.id} panes`}
                data-separator-index={String(index)}
                data-dragging={isDragging ? 'true' : undefined}
                onPointerDown={(e) =>
                  handleSeparatorPointerDown(index, pane, nextEntry.pane, sizePct, nextEntry.sizePct, e)
                }
                onDoubleClick={handleSeparatorDoubleClick}
                onKeyDown={(e) =>
                  handleSeparatorKeyDown(index, pane, nextEntry.pane, sizePct, nextEntry.sizePct, e)
                }
                className={cx(
                  separatorClass,
                  'prism-focus-ring group shrink-0 relative flex items-center justify-center select-none touch-none rounded-full transition-[color,background-color,border-color,opacity,transform] duration-150',
                  isHorizontal ? 'w-3.5 mx-0.5 cursor-col-resize' : 'h-3.5 my-0.5 cursor-row-resize'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    'prism-crystal rounded-full flex items-center justify-center gap-1 transition-[color,background-color,border-color,opacity,transform] duration-150',
                    isHorizontal
                      ? 'w-2 h-14 flex-col group-hover:scale-y-110'
                      : 'h-2 w-14 flex-row group-hover:scale-x-110',
                    isDragging
                      ? 'brightness-110 ring-2 ring-[var(--prism-secondary-main)]'
                      : 'group-hover:brightness-105 group-focus-visible:ring-2 group-focus-visible:ring-[var(--prism-focus-ring)]'
                  )}
                >
                  <span
                    className={cx(
                      'w-1 h-1 rounded-full transition-colors',
                      isDragging
                        ? 'bg-[var(--prism-primary-main)]'
                        : 'bg-[var(--prism-text-secondary)]/55 group-hover:bg-[var(--prism-secondary-main)]'
                    )}
                  />
                  <span
                    className={cx(
                      'w-1 h-1 rounded-full transition-colors',
                      isDragging
                        ? 'bg-[var(--prism-primary-main)]'
                        : 'bg-[var(--prism-text-secondary)]/55 group-hover:bg-[var(--prism-secondary-main)]'
                    )}
                  />
                  <span
                    className={cx(
                      'w-1 h-1 rounded-full transition-colors',
                      isDragging
                        ? 'bg-[var(--prism-primary-main)]'
                        : 'bg-[var(--prism-text-secondary)]/55 group-hover:bg-[var(--prism-secondary-main)]'
                    )}
                  />
                </span>
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}

export const WindowSplitter = /*#__PURE__*/ memoWithDisplayName(WindowSplitterInner, 'WindowSplitter');
