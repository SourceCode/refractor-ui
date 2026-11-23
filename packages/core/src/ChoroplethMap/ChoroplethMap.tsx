'use client';

import {
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
import { STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type ChoroplethTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface ChoroplethRegion {
  /** Stable unique identifier (built-in macro-regions: 'na', 'sa', 'eu', 'af', 'me', 'as', 'oc', or custom). */
  id: string;
  /** Human-readable region name displayed on the map, pills, and live readout. */
  name: string;
  /** Non-negative finite metric value determining shaded fill intensity and total share. */
  value: number;
  /** Optional custom SVG path definition (`d`) validated against safe path commands. */
  pathD?: string;
  /** Optional horizontal label anchor inside the 640×320 viewBox. */
  labelX?: number;
  /** Optional vertical label anchor inside the 640×320 viewBox. */
  labelY?: number;
  /** Optional contextual detail appended to the recessed readout when selected. */
  detail?: string;
}

export interface ChoroplethMapProps extends BaseProps<HTMLDivElement> {
  /** Regional records plotted onto the stylized world canvas; negative or non-finite values are filtered out. */
  regions: ChoroplethRegion[];
  /** Card heading rendered in the optical slab header (defaults to 'Regional Choropleth Map'). */
  title?: string;
  /** Optional unit suffix appended to legend bounds, pills, and live readouts (defaults to ''). */
  valueUnit?: string;
  /** Semantic --prism-* optical tone applied to shaded regions and legend ramp (defaults to 'primary'). */
  tone?: ChoroplethTone;
  /** SVG viewport height in pixels, safely clamped to 180..480 (defaults to 260). */
  height?: number;
  /** Callback invoked when a region polygon or pill is selected via pointer or keyboard. */
  onSelectRegion?: (region: ChoroplethRegion, sharePct: number) => void;
}

interface MacroRegionGeometry {
  pathD: string;
  labelX: number;
  labelY: number;
}

type GeometryKind = 'builtin' | 'custom' | 'fallback';

interface ResolvedRegion {
  id: string;
  key: string;
  name: string;
  shortLabel: string;
  value: number;
  sharePct: number;
  baseOpacity: number;
  pathD: string;
  labelX: number;
  labelY: number;
  geometryKind: GeometryKind;
  detail?: string;
  original: ChoroplethRegion;
}

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 320;
const MIN_HEIGHT = 180;
const MAX_HEIGHT = 480;
const DEFAULT_HEIGHT = 260;

const MIN_FILL_OPACITY = 0.16;
const MAX_FILL_OPACITY = 0.9;
const MID_FILL_OPACITY = 0.53;
const DIMMED_OPACITY_FACTOR = 0.45;
const MIN_DIMMED_OPACITY = 0.08;

const SAFE_SVG_PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-]+$/;
const STARTS_WITH_MOVETO_RE = /^[Mm]/;
const HAS_DIGIT_RE = /\d/;

const LATITUDE_LINES: ReadonlyArray<{ id: string; y: number }> = [
  { id: 'lat-64', y: 64 },
  { id: 'lat-128', y: 128 },
  { id: 'lat-192', y: 192 },
  { id: 'lat-256', y: 256 },
];

const LONGITUDE_LINES: ReadonlyArray<{ id: string; x: number }> = [
  { id: 'lon-128', x: 128 },
  { id: 'lon-256', x: 256 },
  { id: 'lon-384', x: 384 },
  { id: 'lon-512', x: 512 },
];

const LEGEND_STEPS: ReadonlyArray<{ id: string; opacity: number }> = [
  { id: 'ramp-1', opacity: 0.16 },
  { id: 'ramp-2', opacity: 0.35 },
  { id: 'ramp-3', opacity: 0.53 },
  { id: 'ramp-4', opacity: 0.72 },
  { id: 'ramp-5', opacity: 0.9 },
];

const TONE_TOKEN_MAP = new Map<ChoroplethTone, string>([
  ['primary', 'var(--prism-primary-main)'],
  ['secondary', 'var(--prism-secondary-main)'],
  ['emerald', 'var(--prism-success-main)'],
  ['amber', 'var(--prism-warning-main)'],
  ['rose', 'var(--prism-error-main)'],
]);

const BUILT_IN_REGIONS = new Map<string, MacroRegionGeometry>([
  [
    'na',
    {
      pathD:
        'M 44 62 L 106 38 L 194 42 L 220 72 L 196 106 L 168 124 L 154 146 L 138 164 L 116 154 L 100 132 L 74 118 L 54 92 Z',
      labelX: 126,
      labelY: 88,
    },
  ],
  [
    'sa',
    {
      pathD:
        'M 156 172 L 196 172 L 236 202 L 244 232 L 218 266 L 192 294 L 176 286 L 166 244 L 152 204 Z',
      labelX: 196,
      labelY: 224,
    },
  ],
  [
    'eu',
    {
      pathD:
        'M 278 96 L 292 64 L 318 38 L 354 38 L 376 56 L 372 94 L 348 112 L 318 116 L 288 112 Z',
      labelX: 328,
      labelY: 78,
    },
  ],
  [
    'af',
    {
      pathD:
        'M 280 132 L 342 126 L 366 154 L 376 186 L 358 230 L 336 272 L 316 270 L 306 226 L 292 192 L 274 170 Z',
      labelX: 326,
      labelY: 190,
    },
  ],
  [
    'me',
    {
      pathD: 'M 378 106 L 418 104 L 438 124 L 434 156 L 404 172 L 382 162 L 372 134 Z',
      labelX: 406,
      labelY: 138,
    },
  ],
  [
    'as',
    {
      pathD:
        'M 388 52 L 456 36 L 548 40 L 594 68 L 580 116 L 552 154 L 528 192 L 496 178 L 480 154 L 458 184 L 442 150 L 444 114 L 420 96 L 388 94 Z',
      labelX: 504,
      labelY: 106,
    },
  ],
  [
    'oc',
    {
      pathD: 'M 498 232 L 538 212 L 580 218 L 604 246 L 596 278 L 558 288 L 516 278 L 494 256 Z',
      labelX: 550,
      labelY: 252,
    },
  ],
]);

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function formatNumeric(value: number): string {
  const safe = normalizeZero(value);
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(2)));
}

function formatMetric(value: number, unit: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
}

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 1)}…`;
}

function sanitizeSvgPath(rawPath: string | undefined): string | null {
  if (!rawPath) {
    return null;
  }
  const trimmed = rawPath.trim();
  if (
    !trimmed ||
    !SAFE_SVG_PATH_RE.test(trimmed) ||
    !STARTS_WITH_MOVETO_RE.test(trimmed) ||
    !HAS_DIGIT_RE.test(trimmed)
  ) {
    return null;
  }
  return trimmed;
}

function inferPathCenter(pathD: string): { x: number; y: number } {
  const matches = pathD.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) {
    return { x: VIEWBOX_WIDTH / 2, y: VIEWBOX_HEIGHT / 2 };
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const pairCount = Math.floor(matches.length / 2);

  for (let i = 0; i < pairCount; i += 1) {
    const x = Number(matches[i * 2]);
    const y = Number(matches[i * 2 + 1]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return {
    x: roundCoord(clampNumber((minX + maxX) / 2, 24, VIEWBOX_WIDTH - 24, VIEWBOX_WIDTH / 2)),
    y: roundCoord(clampNumber((minY + maxY) / 2, 20, VIEWBOX_HEIGHT - 20, VIEWBOX_HEIGHT / 2)),
  };
}

function buildHexBadgePath(cxPos: number, cyPos: number, radius: number): string {
  const halfR = radius * 0.5;
  const dy = radius * 0.866;
  const pts: ReadonlyArray<readonly [number, number]> = [
    [roundCoord(cxPos + radius), roundCoord(cyPos)],
    [roundCoord(cxPos + halfR), roundCoord(cyPos + dy)],
    [roundCoord(cxPos - halfR), roundCoord(cyPos + dy)],
    [roundCoord(cxPos - radius), roundCoord(cyPos)],
    [roundCoord(cxPos - halfR), roundCoord(cyPos - dy)],
    [roundCoord(cxPos + halfR), roundCoord(cyPos - dy)],
  ];
  const segments = pts.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`);
  return `${segments.join(' ')} Z`;
}

function computeFillOpacity(value: number, minVal: number, maxVal: number): number {
  const span = maxVal - minVal;
  if (span <= 0) {
    return MID_FILL_OPACITY;
  }
  const ratio = clampNumber((value - minVal) / span, 0, 1, 0);
  return Number((MIN_FILL_OPACITY + ratio * (MAX_FILL_OPACITY - MIN_FILL_OPACITY)).toFixed(2));
}

const headerClass = /*#__PURE__*/ stableClassName('choropleth-map', 'header');
const legendClass = /*#__PURE__*/ stableClassName('choropleth-map', 'legend');
const canvasClass = /*#__PURE__*/ stableClassName('choropleth-map', 'canvas');
const pillsClass = /*#__PURE__*/ stableClassName('choropleth-map', 'pills');
const readoutClass = /*#__PURE__*/ stableClassName('choropleth-map', 'readout');

function ChoroplethMapInner({
  regions,
  title = 'Regional Choropleth Map',
  valueUnit = '',
  tone = 'primary',
  height = DEFAULT_HEIGHT,
  onSelectRegion,
  onKeyDown,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ChoroplethMapProps) {
  const headingId = useId();
  const override = useComponentOverride('ChoroplethMap');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const clampedHeight = Math.round(clampNumber(height, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT));
  const toneColor = TONE_TOKEN_MAP.get(tone) ?? 'var(--prism-primary-main)';

  const { resolvedRegions, regionMap, minVal, maxVal, totalValue } = useMemo(() => {
    const validEntries: Array<{
      id: string;
      name: string;
      value: number;
      detail?: string;
      original: ChoroplethRegion;
    }> = [];
    const seenIds = new Set<string>();
    let sum = 0;

    for (const region of regions) {
      const trimmedId = region.id.trim();
      if (!trimmedId || seenIds.has(trimmedId)) {
        continue;
      }
      if (!Number.isFinite(region.value) || region.value < 0) {
        continue;
      }
      seenIds.add(trimmedId);
      const cleanValue = normalizeZero(region.value);
      const displayName = region.name.trim() || trimmedId;
      const trimmedDetail = region.detail?.trim();

      validEntries.push({
        id: trimmedId,
        name: displayName,
        value: cleanValue,
        ...(trimmedDetail ? { detail: trimmedDetail } : {}),
        original: region,
      });
      sum += cleanValue;
    }

    if (validEntries.length === 0) {
      return {
        resolvedRegions: [] as ResolvedRegion[],
        regionMap: new Map<string, ResolvedRegion>(),
        minVal: 0,
        maxVal: 0,
        totalValue: 0,
      };
    }

    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (const entry of validEntries) {
      if (entry.value < lo) lo = entry.value;
      if (entry.value > hi) hi = entry.value;
    }

    const list: ResolvedRegion[] = [];
    const map = new Map<string, ResolvedRegion>();
    let fallbackIndex = 0;

    for (const entry of validEntries) {
      const customPath = sanitizeSvgPath(entry.original.pathD);
      const builtIn = BUILT_IN_REGIONS.get(entry.id.toLowerCase());

      let pathD: string;
      let labelX: number;
      let labelY: number;
      let geometryKind: GeometryKind;

      if (customPath !== null) {
        const inferred = inferPathCenter(customPath);
        pathD = customPath;
        labelX = roundCoord(
          clampNumber(entry.original.labelX ?? inferred.x, 20, VIEWBOX_WIDTH - 20, inferred.x)
        );
        labelY = roundCoord(
          clampNumber(entry.original.labelY ?? inferred.y, 18, VIEWBOX_HEIGHT - 18, inferred.y)
        );
        geometryKind = 'custom';
      } else if (builtIn !== undefined) {
        pathD = builtIn.pathD;
        labelX = roundCoord(
          clampNumber(
            entry.original.labelX ?? builtIn.labelX,
            20,
            VIEWBOX_WIDTH - 20,
            builtIn.labelX
          )
        );
        labelY = roundCoord(
          clampNumber(
            entry.original.labelY ?? builtIn.labelY,
            18,
            VIEWBOX_HEIGHT - 18,
            builtIn.labelY
          )
        );
        geometryKind = 'builtin';
      } else {
        const slotX = 76 + (fallbackIndex % 6) * 96;
        const slotY = 282 - Math.floor(fallbackIndex / 6) * 44;
        labelX = roundCoord(
          clampNumber(entry.original.labelX ?? slotX, 28, VIEWBOX_WIDTH - 28, slotX)
        );
        labelY = roundCoord(
          clampNumber(entry.original.labelY ?? slotY, 24, VIEWBOX_HEIGHT - 24, slotY)
        );
        pathD = buildHexBadgePath(labelX, labelY, 22);
        geometryKind = 'fallback';
        fallbackIndex += 1;
      }

      const sharePct = sum > 0 ? Number(((entry.value / sum) * 100).toFixed(1)) : 0;
      const baseOpacity = computeFillOpacity(entry.value, lo, hi);

      const resolved: ResolvedRegion = {
        id: entry.id,
        key: `choropleth-region-${entry.id}`,
        name: entry.name,
        shortLabel: truncateLabel(entry.name, 18),
        value: entry.value,
        sharePct,
        baseOpacity,
        pathD,
        labelX,
        labelY,
        geometryKind,
        ...(entry.detail ? { detail: entry.detail } : {}),
        original: entry.original,
      };

      list.push(resolved);
      map.set(resolved.id, resolved);
    }

    return {
      resolvedRegions: list,
      regionMap: map,
      minVal: lo,
      maxVal: hi,
      totalValue: sum,
    };
  }, [regions]);

  const isEmpty = resolvedRegions.length === 0;

  const activeRegion = useMemo(() => {
    if (selectedRegionId === null) {
      return null;
    }
    return regionMap.get(selectedRegionId) ?? null;
  }, [regionMap, selectedRegionId]);

  const handleSelectRegion = useCallback(
    (region: ResolvedRegion) => {
      setSelectedRegionId(region.id);
      onSelectRegion?.(region.original, region.sharePct);
    },
    [onSelectRegion]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedRegionId(null);
  }, []);

  const handleRegionKeyDown = useCallback(
    (region: ResolvedRegion) =>
      (event: ReactKeyboardEvent<SVGPathElement | HTMLButtonElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectRegion(region);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setSelectedRegionId(null);
        }
      },
    [handleSelectRegion]
  );

  const handleRootKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!event.nativeEvent.isComposing && event.key === 'Escape') {
        setSelectedRegionId(null);
      }
      onKeyDown?.(event);
    },
    [onKeyDown]
  );

  const merged = mergeProps({
    themeTarget: themeProps('choropleth-map', {
      tone,
      empty: isEmpty,
      focused: activeRegion !== null,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const regionCountLabel =
    resolvedRegions.length === 1 ? '1 region' : `${resolvedRegions.length} regions`;
  const rangeLabel = `[${formatNumeric(minVal)}..${formatNumeric(maxVal)}]${valueUnit}`;

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      onKeyDown={handleRootKeyDown}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <h4
            id={headingId}
            className="text-sm font-semibold tracking-tight"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>

          <span
            data-testid="choropleth-region-count"
            className="prism-crystal px-2.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-medium"
            style={STYLE_TEXT_SECONDARY}
          >
            {regionCountLabel}
          </span>
        </div>

        <div
          data-testid="choropleth-legend"
          aria-label={
            isEmpty
              ? 'Intensity scale from low to high'
              : `Intensity scale from low to high, range ${rangeLabel}`
          }
          className={cx(
            legendClass,
            'prism-crystal px-3 py-1 rounded-full inline-flex flex-wrap items-center gap-1.5 text-[11px] font-medium'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          <span>Low</span>
          <span className="inline-flex items-center gap-1" aria-hidden="true">
            {LEGEND_STEPS.map((step) => (
              <span
                key={step.id}
                data-role="choropleth-legend-step"
                data-opacity={String(step.opacity)}
                className="prism-well relative overflow-hidden w-3.5 h-3.5 rounded-[4px] inline-block"
              >
                <span
                  className="absolute inset-0"
                  style={{
                    backgroundColor: toneColor,
                    opacity: step.opacity,
                  }}
                />
              </span>
            ))}
          </span>
          <span>High</span>
          {!isEmpty ? (
            <span
              data-testid="choropleth-legend-range"
              className="font-mono tabular-nums pl-1"
              style={STYLE_TEXT_PRIMARY}
            >
              {rangeLabel}
            </span>
          ) : null}
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="choropleth-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No valid regional data to display.
        </div>
      ) : (
        <>
          <div
            data-testid="choropleth-canvas-frame"
            className={cx(
              canvasClass,
              'prism-well relative w-full rounded-2xl overflow-hidden border'
            )}
            style={STYLE_BORDER_DIVIDER}
            onClick={handleClearSelection}
          >
            <svg
              role="img"
              aria-label={
                activeRegion
                  ? `${title} focused on ${activeRegion.name}`
                  : `${title} regional choropleth map`
              }
              data-testid="choropleth-svg"
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ height: `${clampedHeight}px` }}
              className="block w-full prism-contain-box"
            >
              {/* Subtle Latitude & Longitude Graticule */}
              <g data-testid="choropleth-graticule" aria-hidden="true">
                {LATITUDE_LINES.map((line) => (
                  <line
                    key={line.id}
                    x1={0}
                    y1={line.y}
                    x2={VIEWBOX_WIDTH}
                    y2={line.y}
                    stroke="var(--prism-divider)"
                    strokeWidth={0.85}
                    strokeDasharray="3 4"
                  />
                ))}
                {LONGITUDE_LINES.map((line) => (
                  <line
                    key={line.id}
                    x1={line.x}
                    y1={0}
                    x2={line.x}
                    y2={VIEWBOX_HEIGHT}
                    stroke="var(--prism-divider)"
                    strokeWidth={0.85}
                    strokeDasharray="3 4"
                  />
                ))}
              </g>

              {/* Shaded Regional Polygons & Crisp Labels */}
              <g data-testid="choropleth-regions">
                {resolvedRegions.map((region) => {
                  const isSelected = activeRegion?.id === region.id;
                  const isDimmed = activeRegion !== null && !isSelected;
                  const effectiveOpacity = isDimmed
                    ? Number(
                        Math.max(
                          MIN_DIMMED_OPACITY,
                          region.baseOpacity * DIMMED_OPACITY_FACTOR
                        ).toFixed(2)
                      )
                    : region.baseOpacity;
                  const formattedValue = formatMetric(region.value, valueUnit);

                  return (
                    <g key={region.key}>
                      <path
                        d={region.pathD}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        aria-label={`${region.name}: ${formattedValue} (${region.sharePct}% of total)`}
                        data-testid={`choropleth-region-${region.id}`}
                        data-region-id={region.id}
                        data-geometry-kind={region.geometryKind}
                        data-value={String(region.value)}
                        data-share-pct={String(region.sharePct)}
                        data-base-opacity={String(region.baseOpacity)}
                        data-fill-opacity={String(effectiveOpacity)}
                        data-selected={isSelected ? 'true' : 'false'}
                        data-dimmed={isDimmed ? 'true' : 'false'}
                        fill={toneColor}
                        fillOpacity={effectiveOpacity}
                        stroke={isSelected ? 'var(--prism-text-primary)' : 'var(--prism-divider)'}
                        strokeWidth={isSelected ? 2.2 : 1.1}
                        strokeLinejoin="round"
                        className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectRegion(region);
                        }}
                        onKeyDown={handleRegionKeyDown(region)}
                      >
                        <title>{`${region.name}: ${formattedValue} (${region.sharePct}%)`}</title>
                      </path>

                      <text
                        x={region.labelX}
                        y={region.labelY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        pointerEvents="none"
                        fill="var(--prism-text-primary)"
                        stroke="var(--prism-bg-start)"
                        strokeWidth={2.5}
                        paintOrder="stroke"
                        opacity={isDimmed ? 0.55 : 0.96}
                        className="text-[10px] font-semibold select-none"
                      >
                        {region.shortLabel}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Compact Interactive Regional Pill Strip */}
          <div
            role="group"
            aria-label="Regional breakdown"
            data-testid="choropleth-pills"
            className={cx(pillsClass, 'flex flex-wrap items-center gap-2')}
          >
            {resolvedRegions.map((region) => {
              const isSelected = activeRegion?.id === region.id;
              const isEmeraldActive = isSelected && tone === 'emerald';
              const formattedValue = formatMetric(region.value, valueUnit);

              return (
                <button
                  key={`${region.key}-pill`}
                  type="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  data-testid={`choropleth-pill-${region.id}`}
                  data-region-id={region.id}
                  data-selected={isSelected ? 'true' : 'false'}
                  onClick={() => handleSelectRegion(region)}
                  onKeyDown={handleRegionKeyDown(region)}
                  className={cx(
                    'prism-focus-ring inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-[color,background-color,border-color,opacity,transform] duration-150 border',
                    isSelected
                      ? isEmeraldActive
                        ? 'prism-emerald font-semibold'
                        : 'prism-well font-semibold'
                      : 'prism-crystal font-medium'
                  )}
                  style={
                    isEmeraldActive
                      ? { borderColor: 'var(--prism-success-dark)' }
                      : {
                          color: 'var(--prism-text-primary)',
                          borderColor: isSelected
                            ? 'var(--prism-text-primary)'
                            : 'var(--prism-divider)',
                        }
                  }
                >
                  <span
                    aria-hidden="true"
                    className="prism-well relative overflow-hidden w-2.5 h-2.5 rounded-full shrink-0"
                  >
                    <span
                      className="absolute inset-0"
                      style={{
                        backgroundColor: toneColor,
                        opacity: region.baseOpacity,
                      }}
                    />
                  </span>
                  <span className="truncate max-w-[160px]">{region.name}</span>
                  <span
                    className="font-mono tabular-nums text-[11px]"
                    style={{
                      color: isEmeraldActive
                        ? 'var(--prism-success-contrast)'
                        : 'var(--prism-text-secondary)',
                    }}
                  >
                    {formattedValue}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Recessed Optical Well Live Readout */}
          <div
            data-testid="choropleth-readout"
            aria-live="polite"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {activeRegion ? (
              <>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="prism-well relative overflow-hidden w-3 h-3 rounded-[4px] shrink-0"
                  >
                    <span
                      className="absolute inset-0"
                      style={{
                        backgroundColor: toneColor,
                        opacity: activeRegion.baseOpacity,
                      }}
                    />
                  </span>
                  <span data-testid="choropleth-readout-summary" className="font-mono font-medium">
                    {`${activeRegion.name} · ${formatMetric(activeRegion.value, valueUnit)} · ${activeRegion.sharePct}% of total`}
                  </span>
                  {activeRegion.detail ? (
                    <span
                      data-testid="choropleth-readout-detail"
                      className="text-xs"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {activeRegion.detail}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  aria-label="Clear selected region"
                  onClick={handleClearSelection}
                  className="prism-focus-ring prism-crystal px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer shrink-0"
                  style={STYLE_TEXT_PRIMARY}
                >
                  Clear
                </button>
              </>
            ) : (
              <>
                <span style={STYLE_TEXT_SECONDARY}>
                  Select any region polygon or pill to inspect share and details. Press Escape to
                  clear.
                </span>
                <span
                  data-testid="choropleth-total"
                  className="font-mono font-medium shrink-0"
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

export const ChoroplethMap = /*#__PURE__*/ memoWithDisplayName(ChoroplethMapInner, 'ChoroplethMap');
