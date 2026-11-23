'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_ERROR, STYLE_BG_PRIMARY, STYLE_BG_SUCCESS, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface TreemapTile {
  /** Stable unique identifier for this hierarchical tile. */
  id: string;
  /** Human-readable tile label displayed inside the tile and inspector strip. */
  label: string;
  /** Optional parent group or category name shown on large tiles and in the inspector strip. */
  group?: string;
  /** Positive finite numeric magnitude determining proportional tile area. */
  value: number;
  /** Optional percentage delta tinting the tile emerald (> 0), rose (< 0), or neutral (0 / omitted). */
  changePct?: number;
}

export interface TreemapChartProps extends BaseProps<HTMLDivElement> {
  /** Flat or grouped hierarchical tile entries; non-positive or non-finite values are filtered out. */
  tiles: TreemapTile[];
  /** Chart card heading (defaults to 'Hierarchical Treemap'). */
  title?: string;
  /** Chart SVG viewport height in pixels (defaults to 240, clamped to 160..480). */
  height?: number;
  /** Optional unit suffix appended to tile values and inspector readouts (e.g. 'GB', 'k', '$'). */
  valueUnit?: string;
  /** Callback fired when any tile is clicked or activated via keyboard. */
  onSelectTile?: (tile: TreemapTile) => void;
}

type TileTone = 'positive' | 'negative' | 'neutral';

interface PreparedTile {
  id: string;
  key: string;
  label: string;
  group?: string;
  value: number;
  sharePct: number;
  changePct?: number;
  tone: TileTone;
  color: string;
  original: TreemapTile;
}

interface RectBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PositionedTile extends PreparedTile {
  x: number;
  y: number;
  width: number;
  height: number;
  clipId: string;
}

const SVG_WIDTH = 600;
const NEUTRAL_TOKENS: readonly [string, string] = [
  'var(--prism-primary-main)',
  'var(--prism-secondary-main)',
];

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function formatNumeric(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toFixed(2)));
}

function formatMetric(value: number, unit?: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
}

function formatSignedPct(pct: number): string {
  if (pct > 0) return `+${formatNumeric(pct)}%`;
  if (pct < 0) return `${formatNumeric(pct)}%`;
  return '0%';
}

function getDeltaColor(pct: number): string {
  if (pct > 0) return 'var(--prism-success-main)';
  if (pct < 0) return 'var(--prism-error-main)';
  return 'var(--prism-text-secondary)';
}

function partitionTreemap(
  items: ReadonlyArray<PreparedTile>,
  rect: RectBox,
  clipPrefix: string,
  out: PositionedTile[]
): void {
  if (items.length === 1) {
    const item = items[0]!;
    const inset = Math.min(2, rect.width * 0.1, rect.height * 0.1);
    out.push({
      ...item,
      x: roundCoord(rect.x + inset),
      y: roundCoord(rect.y + inset),
      width: Math.max(1, roundCoord(rect.width - inset * 2)),
      height: Math.max(1, roundCoord(rect.height - inset * 2)),
      clipId: `${clipPrefix}-${out.length}`,
    });
    return;
  }

  let total = 0;
  for (const item of items) {
    total += item.value;
  }

  const half = total / 2;
  let running = 0;
  let bestSplit = 1;
  let bestDiff = Number.POSITIVE_INFINITY;
  let bestLeftSum = items[0]!.value;

  for (let i = 0; i < items.length - 1; i += 1) {
    running += items[i]!.value;
    const diff = Math.abs(running - half);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i + 1;
      bestLeftSum = running;
    }
  }

  const leftItems = items.slice(0, bestSplit);
  const rightItems = items.slice(bestSplit);
  const leftRatio = bestLeftSum / total;

  if (rect.width >= rect.height) {
    const leftWidth = rect.width * leftRatio;
    partitionTreemap(
      leftItems,
      { x: rect.x, y: rect.y, width: leftWidth, height: rect.height },
      clipPrefix,
      out
    );
    partitionTreemap(
      rightItems,
      { x: rect.x + leftWidth, y: rect.y, width: rect.width - leftWidth, height: rect.height },
      clipPrefix,
      out
    );
  } else {
    const topHeight = rect.height * leftRatio;
    partitionTreemap(
      leftItems,
      { x: rect.x, y: rect.y, width: rect.width, height: topHeight },
      clipPrefix,
      out
    );
    partitionTreemap(
      rightItems,
      { x: rect.x, y: rect.y + topHeight, width: rect.width, height: rect.height - topHeight },
      clipPrefix,
      out
    );
  }
}

function TreemapChartInner({
  tiles,
  title = 'Hierarchical Treemap',
  height = 240,
  valueUnit,
  onSelectTile,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TreemapChartProps) {
  const headingId = useId();
  const clipPrefix = useId();
  const override = useComponentOverride('TreemapChart');
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);

  const clampedHeight = clampNumber(height, 160, 480, 240);

  const { totalValue, positionedTiles } = useMemo(() => {
    const indexedValid: Array<{ entry: TreemapTile; origIdx: number }> = [];
    let sum = 0;

    for (let i = 0; i < tiles.length; i += 1) {
      const entry = tiles[i]!;
      if (Number.isFinite(entry.value) && entry.value > 0) {
        indexedValid.push({ entry, origIdx: i });
        sum += entry.value;
      }
    }

    if (indexedValid.length === 0) {
      return {
        totalValue: 0,
        positionedTiles: [] as PositionedTile[],
      };
    }

    indexedValid.sort((a, b) => {
      if (b.entry.value !== a.entry.value) {
        return b.entry.value - a.entry.value;
      }
      return a.origIdx - b.origIdx;
    });

    let neutralCounter = 0;
    const prepared: PreparedTile[] = indexedValid.map(({ entry, origIdx }) => {
      const cleanChangePct =
        entry.changePct !== undefined && Number.isFinite(entry.changePct)
          ? entry.changePct
          : undefined;

      let tone: TileTone;
      let color: string;
      if (cleanChangePct !== undefined && cleanChangePct > 0) {
        tone = 'positive';
        color = 'var(--prism-success-main)';
      } else if (cleanChangePct !== undefined && cleanChangePct < 0) {
        tone = 'negative';
        color = 'var(--prism-error-main)';
      } else {
        tone = 'neutral';
        color = NEUTRAL_TOKENS[neutralCounter % 2]!;
        neutralCounter += 1;
      }

      return {
        id: entry.id,
        key: `tile-${entry.id}-${origIdx}`,
        label: entry.label,
        group: entry.group,
        value: entry.value,
        sharePct: Number(((entry.value / sum) * 100).toFixed(2)),
        changePct: cleanChangePct,
        tone,
        color,
        original: entry,
      };
    });

    const positioned: PositionedTile[] = [];
    partitionTreemap(
      prepared,
      { x: 2, y: 2, width: SVG_WIDTH - 4, height: clampedHeight - 4 },
      clipPrefix,
      positioned
    );

    return {
      totalValue: sum,
      positionedTiles: positioned,
    };
  }, [tiles, clampedHeight, clipPrefix]);

  const isEmpty = positionedTiles.length === 0;

  const activeTile = useMemo(() => {
    if (selectedTileId === null) return null;
    return positionedTiles.find((tile) => tile.id === selectedTileId) ?? null;
  }, [positionedTiles, selectedTileId]);

  const handleSelectTile = useCallback(
    (tile: PositionedTile) => {
      setSelectedTileId(tile.id);
      onSelectTile?.(tile.original);
    },
    [onSelectTile]
  );

  const handleTileKeyDown = useCallback(
    (tile: PositionedTile) => (event: ReactKeyboardEvent<SVGGElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectTile(tile);
      }
    },
    [handleSelectTile]
  );

  const merged = mergeProps({
    themeTarget: themeProps('treemap-chart', {
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('treemap-chart', 'header');
  const svgClass = stableClassName('treemap-chart', 'svg');
  const inspectorClass = stableClassName('treemap-chart', 'inspector');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight"
          style={STYLE_TEXT_PRIMARY}
        >
          {title}
        </h4>

        <div
          aria-hidden="true"
          className="inline-flex flex-wrap items-center gap-3 text-[11px] font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={STYLE_BG_SUCCESS}
            />
            <span>Positive</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={STYLE_BG_PRIMARY}
            />
            <span>Neutral</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={STYLE_BG_ERROR}
            />
            <span>Negative</span>
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="treemap-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No positive treemap values to display.
        </div>
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <svg
              role="img"
              aria-label={`${title} hierarchical treemap`}
              viewBox={`0 0 ${SVG_WIDTH} ${clampedHeight}`}
              style={{ height: `${clampedHeight}px` }}
              className={cx(svgClass, 'w-full block')}
            >
              <defs>
                {positionedTiles.map((tile) => (
                  <clipPath key={`clip-${tile.key}`} id={tile.clipId}>
                    <rect
                      x={tile.x}
                      y={tile.y}
                      width={tile.width}
                      height={tile.height}
                      rx={8}
                    />
                  </clipPath>
                ))}
              </defs>

              {positionedTiles.map((tile) => {
                const isSelected = activeTile?.id === tile.id;
                const fillOpacity = activeTile === null ? 0.24 : isSelected ? 0.36 : 0.14;
                const showLabel = tile.width >= 44 && tile.height >= 26;
                const showMetric = tile.width >= 60 && tile.height >= 44;
                const showGroup = Boolean(tile.group) && tile.width >= 88 && tile.height >= 64;

                const parts: string[] = [tile.label];
                if (tile.group) parts.push(`(${tile.group})`);
                parts.push(
                  `${formatMetric(tile.value, valueUnit)}, ${formatNumeric(tile.sharePct)}% of total`
                );
                if (tile.changePct !== undefined) {
                  parts.push(formatSignedPct(tile.changePct));
                }
                const ariaLabel = parts.join(' ');

                return (
                  <g
                    key={tile.key}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={ariaLabel}
                    data-tile-id={tile.id}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-tone={tile.tone}
                    className="prism-focus-ring cursor-pointer"
                    onClick={() => handleSelectTile(tile)}
                    onKeyDown={handleTileKeyDown(tile)}
                  >
                    <rect
                      x={tile.x}
                      y={tile.y}
                      width={tile.width}
                      height={tile.height}
                      rx={8}
                      fill={tile.color}
                      fillOpacity={fillOpacity}
                      stroke={isSelected ? 'var(--prism-text-primary)' : tile.color}
                      strokeWidth={isSelected ? 2 : 1.25}
                      strokeOpacity={isSelected ? 1 : 0.7}
                    />

                    <g clipPath={`url(#${tile.clipId})`} pointerEvents="none">
                      {showLabel ? (
                        <text
                          x={tile.x + 8}
                          y={tile.y + 18}
                          fill="var(--prism-text-primary)"
                          className="text-[11px] font-semibold"
                        >
                          {tile.label}
                        </text>
                      ) : null}

                      {showMetric ? (
                        <text
                          x={tile.x + 8}
                          y={tile.y + 34}
                          fill="var(--prism-text-secondary)"
                          className="text-[10px] font-mono tabular-nums"
                        >
                          {tile.changePct !== undefined
                            ? `${formatMetric(tile.value, valueUnit)} · ${formatSignedPct(tile.changePct)}`
                            : `${formatMetric(tile.value, valueUnit)} · ${formatNumeric(tile.sharePct)}%`}
                        </text>
                      ) : null}

                      {showGroup ? (
                        <text
                          x={tile.x + 8}
                          y={tile.y + 50}
                          fill="var(--prism-text-secondary)"
                          className="text-[9px] font-medium uppercase tracking-wider"
                        >
                          {tile.group}
                        </text>
                      ) : null}
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            data-testid="treemap-inspector"
            aria-live="polite"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {activeTile ? (
              <>
                <div className="inline-flex flex-wrap items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeTile.color }}
                  />
                  <span className="font-semibold">{activeTile.label}</span>
                  {activeTile.group ? (
                    <span
                      className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {activeTile.group}
                    </span>
                  ) : null}
                </div>

                <div className="inline-flex flex-wrap items-center gap-3 font-mono">
                  <span className="font-semibold">
                    {formatMetric(activeTile.value, valueUnit)}
                  </span>
                  <span style={STYLE_TEXT_SECONDARY}>
                    {`${formatNumeric(activeTile.sharePct)}% of total`}
                  </span>
                  {activeTile.changePct !== undefined ? (
                    <span
                      data-testid="treemap-inspector-delta"
                      className="font-semibold"
                      style={{ color: getDeltaColor(activeTile.changePct) }}
                    >
                      {formatSignedPct(activeTile.changePct)}
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <span style={STYLE_TEXT_SECONDARY}>
                  Select any tile to inspect value, share, and delta.
                </span>
                <span
                  className="font-mono font-medium"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`Total: ${formatMetric(totalValue, valueUnit)}`}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const TreemapChart = memo(TreemapChartInner);
TreemapChart.displayName = 'TreemapChart';
