'use client';

import { memo, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Globe, Minus, Plus, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ClusterMapTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface GeoPoint {
  /** Stable unique identifier used for deduplication and selection. */
  id: string;
  /** Visible human-readable label rendered safely as literal text. */
  label: string;
  /** Geographic latitude in degrees (finite values clamped to [-90, 90]). */
  lat: number;
  /** Geographic longitude in degrees (finite values clamped to [-180, 180]). */
  lng: number;
  /** Optional category enabling interactive header filter pills. */
  category?: string;
  /** Optional finite numeric metric displayed in the recessed inspector. */
  value?: number;
  /** Optional semantic optical tone mapped to --prism-* CSS custom properties. */
  tone?: ClusterMapTone;
}

export interface PointClusterMapProps extends BaseProps<HTMLDivElement> {
  /** Geographic points to project and spatially cluster (non-finite coords and duplicate IDs are filtered). */
  points: GeoPoint[];
  /** Card heading linked to the SVG graphic (defaults to 'Geospatial Point Cluster Map'). */
  title?: string;
  /** Initial zoom factor clamped to [1, 4] (defaults to 1). */
  defaultZoom?: number;
  /** Base SVG clustering cell size in pixels at 1x zoom, clamped to [16, 120] (defaults to 48). */
  clusterRadius?: number;
  /** SVG viewport height in pixels, clamped to [180, 480] (defaults to 280). */
  height?: number;
  /** Callback fired when an individual pin or cluster member pill is selected. */
  onSelectPoint?: (point: GeoPoint) => void;
  /** Callback fired when a multi-point cluster bubble is clicked or keyboard-activated. */
  onSelectCluster?: (points: GeoPoint[]) => void;
}

interface ProjectedPoint {
  point: GeoPoint;
  x: number;
  y: number;
  tone: ClusterMapTone;
  colorToken: string;
}

interface CategoryFilterItem {
  key: string;
  name: string;
  tone: ClusterMapTone;
  colorToken: string;
}

interface MapCluster {
  id: string;
  cx: number;
  cy: number;
  avgLat: number;
  avgLng: number;
  members: ProjectedPoint[];
  points: GeoPoint[];
}

interface MapFocus {
  x: number;
  y: number;
}

type InspectorSelection =
  | { kind: 'none' }
  | { kind: 'point'; pointId: string }
  | { kind: 'cluster'; clusterId: string; memberIds: ReadonlyArray<string> };

interface GraticuleLine {
  id: string;
  coord: number;
  primary: boolean;
}

interface LandmassPath {
  id: string;
  d: string;
}

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 320;
const CENTER_X = VIEW_WIDTH / 2;
const CENTER_Y = VIEW_HEIGHT / 2;

const MIN_HEIGHT = 180;
const MAX_HEIGHT = 480;
const DEFAULT_HEIGHT = 280;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.5;
const CLUSTER_ZOOM_INCREMENT = 1;

const MIN_CLUSTER_RADIUS = 16;
const MAX_CLUSTER_RADIUS = 120;
const DEFAULT_CLUSTER_RADIUS = 48;

const LAT_GRATICULES: ReadonlyArray<GraticuleLine> = [
  { id: 'lat-60n', coord: ((90 - 60) / 180) * VIEW_HEIGHT, primary: false },
  { id: 'lat-30n', coord: ((90 - 30) / 180) * VIEW_HEIGHT, primary: false },
  { id: 'lat-0', coord: CENTER_Y, primary: true },
  { id: 'lat-30s', coord: ((90 + 30) / 180) * VIEW_HEIGHT, primary: false },
  { id: 'lat-60s', coord: ((90 + 60) / 180) * VIEW_HEIGHT, primary: false },
];

const LNG_GRATICULES: ReadonlyArray<GraticuleLine> = [
  { id: 'lng-120w', coord: ((-120 + 180) / 360) * VIEW_WIDTH, primary: false },
  { id: 'lng-60w', coord: ((-60 + 180) / 360) * VIEW_WIDTH, primary: false },
  { id: 'lng-0', coord: CENTER_X, primary: true },
  { id: 'lng-60e', coord: ((60 + 180) / 360) * VIEW_WIDTH, primary: false },
  { id: 'lng-120e', coord: ((120 + 180) / 360) * VIEW_WIDTH, primary: false },
];

const CONTINENT_PATHS: ReadonlyArray<LandmassPath> = [
  {
    id: 'north-america',
    d: 'M 27 44 L 68 38 L 107 36 L 154 40 L 187 50 L 222 71 L 196 86 L 188 92 L 176 114 L 160 112 L 150 120 L 171 142 L 158 144 L 133 124 L 116 106 L 103 94 L 92 68 L 54 58 Z',
  },
  {
    id: 'greenland',
    d: 'M 228 25 L 258 18 L 281 16 L 284 36 L 260 48 L 242 53 L 232 42 Z',
  },
  {
    id: 'south-america',
    d: 'M 185 142 L 210 142 L 234 156 L 256 171 L 245 201 L 217 228 L 204 256 L 194 252 L 192 222 L 184 196 L 176 169 Z',
  },
  {
    id: 'europe',
    d: 'M 304 92 L 306 78 L 318 68 L 326 48 L 344 38 L 372 42 L 395 43 L 392 76 L 377 85 L 356 88 L 345 92 L 324 90 Z',
  },
  {
    id: 'africa',
    d: 'M 302 98 L 336 96 L 377 105 L 396 130 L 409 140 L 391 178 L 376 206 L 356 220 L 343 187 L 332 162 L 312 152 L 290 133 L 292 114 Z',
  },
  {
    id: 'asia',
    d: 'M 384 92 L 396 44 L 456 36 L 520 34 L 570 36 L 624 44 L 604 68 L 572 78 L 548 88 L 537 103 L 520 124 L 505 139 L 488 126 L 459 146 L 438 118 L 418 128 L 405 135 L 388 114 Z',
  },
  {
    id: 'australia',
    d: 'M 526 204 L 544 186 L 578 185 L 594 206 L 588 224 L 558 222 L 526 220 Z',
  },
  {
    id: 'antarctica',
    d: 'M 72 296 L 190 290 L 320 292 L 458 288 L 576 296 L 560 310 L 88 310 Z',
  },
];

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatZoom(zoom: number): string {
  return `${roundTwo(zoom)}×`;
}

function getDefaultTone(index: number): ClusterMapTone {
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

function getToneToken(tone: ClusterMapTone): string {
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

function clampFocus(x: number, y: number, zoomLevel: number): MapFocus {
  const halfWidth = VIEW_WIDTH / (2 * zoomLevel);
  const halfHeight = VIEW_HEIGHT / (2 * zoomLevel);
  return {
    x: roundTwo(clampNumber(x, halfWidth, VIEW_WIDTH - halfWidth, CENTER_X)),
    y: roundTwo(clampNumber(y, halfHeight, VIEW_HEIGHT - halfHeight, CENTER_Y)),
  };
}

function PointClusterMapInner({
  points,
  title = 'Geospatial Point Cluster Map',
  defaultZoom = DEFAULT_ZOOM,
  clusterRadius = DEFAULT_CLUSTER_RADIUS,
  height = DEFAULT_HEIGHT,
  onSelectPoint,
  onSelectCluster,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PointClusterMapProps) {
  const override = useComponentOverride('PointClusterMap');
  const headingId = useId();

  const initialZoom = roundTwo(clampNumber(defaultZoom, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM));
  const safeHeight = Math.round(clampNumber(height, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT));
  const safeClusterRadius = roundTwo(
    clampNumber(clusterRadius, MIN_CLUSTER_RADIUS, MAX_CLUSTER_RADIUS, DEFAULT_CLUSTER_RADIUS)
  );

  const [zoom, setZoom] = useState<number>(() => initialZoom);
  const [focus, setFocus] = useState<MapFocus>({ x: CENTER_X, y: CENTER_Y });
  const [hiddenCategories, setHiddenCategories] = useState<ReadonlySet<string>>(() => new Set());
  const [selection, setSelection] = useState<InspectorSelection>({ kind: 'none' });

  const { validPoints, categories } = useMemo(() => {
    const seenIds = new Set<string>();
    const categoryIndexMap = new Map<string, number>();
    const extractedCategories: CategoryFilterItem[] = [];
    const projected: ProjectedPoint[] = [];

    for (const rawPoint of points) {
      const id = rawPoint.id.trim();
      if (!id || seenIds.has(id)) continue;
      if (!Number.isFinite(rawPoint.lat) || !Number.isFinite(rawPoint.lng)) continue;
      seenIds.add(id);

      const safeLat = clampNumber(rawPoint.lat, -90, 90, 0);
      const safeLng = clampNumber(rawPoint.lng, -180, 180, 0);

      const trimmedCategory = rawPoint.category?.trim();
      const category = trimmedCategory ? trimmedCategory : undefined;
      const validValue =
        typeof rawPoint.value === 'number' && Number.isFinite(rawPoint.value)
          ? rawPoint.value
          : undefined;

      let tone: ClusterMapTone;
      if (category !== undefined) {
        let categoryIdx = categoryIndexMap.get(category);
        if (categoryIdx === undefined) {
          categoryIdx = extractedCategories.length;
          categoryIndexMap.set(category, categoryIdx);
          const categoryTone = rawPoint.tone ?? getDefaultTone(categoryIdx);
          extractedCategories.push({
            key: `cat:${category}`,
            name: category,
            tone: categoryTone,
            colorToken: getToneToken(categoryTone),
          });
        }
        tone = rawPoint.tone ?? extractedCategories[categoryIdx]!.tone;
      } else {
        tone = rawPoint.tone ?? getDefaultTone(projected.length);
      }

      const safePoint: GeoPoint = {
        id,
        label: rawPoint.label,
        lat: safeLat,
        lng: safeLng,
        ...(category !== undefined ? { category } : {}),
        ...(validValue !== undefined ? { value: validValue } : {}),
        ...(rawPoint.tone !== undefined ? { tone: rawPoint.tone } : {}),
      };

      const x = roundTwo(((safeLng + 180) / 360) * VIEW_WIDTH);
      const y = roundTwo(((90 - safeLat) / 180) * VIEW_HEIGHT);

      projected.push({
        point: safePoint,
        x,
        y,
        tone,
        colorToken: getToneToken(tone),
      });
    }

    return { validPoints: projected, categories: extractedCategories };
  }, [points]);

  const visiblePoints = useMemo(
    () =>
      validPoints.filter(
        (item) => item.point.category === undefined || !hiddenCategories.has(item.point.category)
      ),
    [validPoints, hiddenCategories]
  );

  const visiblePointMap = useMemo(() => {
    const map = new Map<string, ProjectedPoint>();
    for (const item of visiblePoints) {
      map.set(item.point.id, item);
    }
    return map;
  }, [visiblePoints]);

  const effectiveRadius = safeClusterRadius / zoom;

  const { clusters, singletons } = useMemo(() => {
    const buckets = new Map<string, ProjectedPoint[]>();

    for (const item of visiblePoints) {
      const cellX = Math.floor(item.x / effectiveRadius);
      const cellY = Math.floor(item.y / effectiveRadius);
      const cellKey = `${cellX}:${cellY}`;
      const existing = buckets.get(cellKey);
      if (existing) {
        existing.push(item);
      } else {
        buckets.set(cellKey, [item]);
      }
    }

    const nextClusters: MapCluster[] = [];
    const nextSingletons: ProjectedPoint[] = [];

    for (const [cellKey, members] of buckets.entries()) {
      if (members.length >= 2) {
        let sumX = 0;
        let sumY = 0;
        let sumLat = 0;
        let sumLng = 0;
        const memberPoints: GeoPoint[] = [];

        for (const member of members) {
          sumX += member.x;
          sumY += member.y;
          sumLat += member.point.lat;
          sumLng += member.point.lng;
          memberPoints.push(member.point);
        }

        nextClusters.push({
          id: `cell-${cellKey}`,
          cx: roundTwo(sumX / members.length),
          cy: roundTwo(sumY / members.length),
          avgLat: sumLat / members.length,
          avgLng: sumLng / members.length,
          members,
          points: memberPoints,
        });
      } else {
        nextSingletons.push(members[0]!);
      }
    }

    return { clusters: nextClusters, singletons: nextSingletons };
  }, [visiblePoints, effectiveRadius]);

  const activePoint = useMemo<ProjectedPoint | null>(() => {
    if (selection.kind !== 'point') return null;
    return visiblePointMap.get(selection.pointId) ?? null;
  }, [selection, visiblePointMap]);

  const activeClusterMembers = useMemo<ProjectedPoint[]>(() => {
    if (selection.kind !== 'cluster') return [];
    const members: ProjectedPoint[] = [];
    for (const id of selection.memberIds) {
      const found = visiblePointMap.get(id);
      if (found) {
        members.push(found);
      }
    }
    return members;
  }, [selection, visiblePointMap]);

  const activeClusterId = useMemo<string | null>(() => {
    if (selection.kind !== 'cluster') return null;
    const match = clusters.find((cluster) => cluster.id === selection.clusterId);
    return match ? match.id : null;
  }, [clusters, selection]);

  const isEmpty = validPoints.length === 0;
  const allHidden = !isEmpty && visiblePoints.length === 0;
  const hasSelection = activePoint !== null || activeClusterMembers.length > 0;
  const invScale = 1 / Math.sqrt(zoom);

  const handleToggleCategory = (categoryName: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const handleZoomOut = () => {
    const nextZoom = roundTwo(clampNumber(zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM));
    setZoom(nextZoom);
    setFocus((prev) => clampFocus(prev.x, prev.y, nextZoom));
  };

  const handleZoomIn = () => {
    const nextZoom = roundTwo(clampNumber(zoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM));
    setZoom(nextZoom);
    setFocus((prev) => clampFocus(prev.x, prev.y, nextZoom));
  };

  const handleZoomReset = () => {
    setZoom(initialZoom);
    setFocus({ x: CENTER_X, y: CENTER_Y });
  };

  const handleClearSelection = () => {
    setSelection({ kind: 'none' });
  };

  const handleSelectPoint = (item: ProjectedPoint) => {
    setSelection({ kind: 'point', pointId: item.point.id });
    onSelectPoint?.(item.point);
  };

  const handleSelectCluster = (cluster: MapCluster) => {
    const nextZoom = roundTwo(Math.min(MAX_ZOOM, zoom + CLUSTER_ZOOM_INCREMENT));
    setZoom(nextZoom);
    setFocus(clampFocus(cluster.cx, cluster.cy, nextZoom));
    setSelection({
      kind: 'cluster',
      clusterId: cluster.id,
      memberIds: cluster.members.map((member) => member.point.id),
    });
    onSelectCluster?.(cluster.points);
  };

  const handlePointKeyDown = (
    event: KeyboardEvent<SVGCircleElement>,
    item: ProjectedPoint
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectPoint(item);
      return;
    }
    if (event.key === 'Escape' && hasSelection) {
      event.preventDefault();
      handleClearSelection();
    }
  };

  const handleClusterKeyDown = (
    event: KeyboardEvent<SVGCircleElement>,
    cluster: MapCluster
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectCluster(cluster);
      return;
    }
    if (event.key === 'Escape' && hasSelection) {
      event.preventDefault();
      handleClearSelection();
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('point-cluster-map', {
      empty: isEmpty,
      allHidden,
      zoomed: zoom !== DEFAULT_ZOOM,
      selected: hasSelection,
    }),
    baseClassName: 'prism-slab p-5 w-full space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('point-cluster-map', 'header');
  const filtersClass = stableClassName('point-cluster-map', 'filters');
  const canvasClass = stableClassName('point-cluster-map', 'canvas');
  const inspectorClass = stableClassName('point-cluster-map', 'inspector');

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'space-y-2.5')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex flex-wrap items-center gap-2.5">
            <span
              className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
              style={STYLE_PRIMARY_MAIN}
            >
              <Globe aria-hidden="true" className="w-4 h-4 shrink-0" />
            </span>
            <h4
              id={headingId}
              className="text-sm font-semibold truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </h4>
            <span
              data-testid="cluster-map-telemetry"
              className="prism-crystal rounded-full px-2.5 py-0.5 text-[11px] font-mono tabular-nums font-medium shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {visiblePoints.length} markers · {clusters.length} clusters
            </span>
          </div>

          <div
            role="group"
            aria-label="Map zoom controls"
            data-testid="cluster-map-zoom-controls"
            className="prism-crystal rounded-full px-1.5 py-1 inline-flex items-center gap-1 shrink-0"
          >
            <button
              type="button"
              aria-label="Zoom Out"
              data-testid="cluster-map-zoom-out"
              disabled={zoom <= MIN_ZOOM}
              onClick={handleZoomOut}
              className="prism-well prism-focus-ring h-6 w-6 rounded-full inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
              style={STYLE_TEXT_PRIMARY}
            >
              <Minus aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Reset"
              data-testid="cluster-map-zoom-reset"
              onClick={handleZoomReset}
              className="prism-well prism-focus-ring h-6 rounded-full px-2 inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-medium cursor-pointer transition-opacity"
              style={STYLE_TEXT_PRIMARY}
            >
              <RotateCcw aria-hidden="true" className="w-3 h-3" />
              <span>Reset</span>
              <span
                data-testid="cluster-map-zoom-value"
                style={STYLE_TEXT_SECONDARY}
              >
                {formatZoom(zoom)}
              </span>
            </button>
            <button
              type="button"
              aria-label="Zoom In"
              data-testid="cluster-map-zoom-in"
              disabled={zoom >= MAX_ZOOM}
              onClick={handleZoomIn}
              className="prism-well prism-focus-ring h-6 w-6 rounded-full inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
              style={STYLE_TEXT_PRIMARY}
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {categories.length > 0 ? (
          <div
            role="group"
            aria-label="Filter point categories"
            data-testid="cluster-map-category-filters"
            className={cx(filtersClass, 'flex flex-wrap items-center gap-1.5')}
          >
            {categories.map((cat) => {
              const isVisible = !hiddenCategories.has(cat.name);
              return (
                <button
                  key={cat.key}
                  type="button"
                  aria-pressed={isVisible}
                  data-testid={`cluster-map-category-${cat.name}`}
                  data-tone={cat.tone}
                  onClick={() => handleToggleCategory(cat.name)}
                  className={cx(
                    'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                    isVisible ? 'prism-crystal' : 'prism-well opacity-55 line-through'
                  )}
                  style={STYLE_TEXT_PRIMARY}
                >
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: isVisible
                        ? cat.colorToken
                        : 'var(--prism-text-disabled)',
                    }}
                  />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {visiblePoints.length === 0 ? (
        <div
          role="status"
          data-testid="cluster-map-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs"
          style={STYLE_TEXT_SECONDARY}
        >
          {isEmpty
            ? 'No valid geographic points available.'
            : 'All point categories hidden — toggle a category filter above to display markers.'}
        </div>
      ) : (
        <>
          <div className={cx(canvasClass, 'prism-well rounded-2xl p-2 overflow-hidden')}>
            <svg
              role="img"
              aria-labelledby={headingId}
              aria-label={`${title} point cluster map`}
              data-testid="cluster-map-svg"
              data-zoom={String(zoom)}
              data-effective-radius={String(roundTwo(effectiveRadius))}
              viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
              className="w-full block overflow-hidden"
              style={{ height: `${safeHeight}px` }}
            >
              <g
                data-testid="cluster-map-stage"
                transform={`translate(${CENTER_X} ${CENTER_Y}) scale(${zoom}) translate(${-focus.x} ${-focus.y})`}
              >
                <g data-testid="cluster-map-graticule" aria-hidden="true">
                  {LAT_GRATICULES.map((line) => (
                    <line
                      key={line.id}
                      x1={0}
                      y1={line.coord}
                      x2={VIEW_WIDTH}
                      y2={line.coord}
                      stroke="var(--prism-divider)"
                      strokeWidth={line.primary ? 1.1 : 0.75}
                      strokeDasharray={line.primary ? '4 3' : '2 3'}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {LNG_GRATICULES.map((line) => (
                    <line
                      key={line.id}
                      x1={line.coord}
                      y1={0}
                      x2={line.coord}
                      y2={VIEW_HEIGHT}
                      stroke="var(--prism-divider)"
                      strokeWidth={line.primary ? 1.1 : 0.75}
                      strokeDasharray={line.primary ? '4 3' : '2 3'}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>

                <g data-testid="cluster-map-landmasses" aria-hidden="true">
                  {CONTINENT_PATHS.map((land) => (
                    <path
                      key={land.id}
                      d={land.d}
                      fill="var(--prism-text-secondary)"
                      fillOpacity={0.11}
                      stroke="var(--prism-divider)"
                      strokeWidth={0.9}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>

                <g data-testid="cluster-map-pins-layer">
                  {singletons.map((item) => {
                    const isSelected = activePoint?.point.id === item.point.id;
                    const pinRadius = roundTwo(6.5 * invScale);
                    const haloRadius = roundTwo(10 * invScale);
                    const ringRadius = roundTwo(12.5 * invScale);
                    const glintOffset = roundTwo(2 * invScale);
                    const glintRadius = roundTwo(1.8 * invScale);
                    const categorySuffix = item.point.category
                      ? `, ${item.point.category}`
                      : '';

                    return (
                      <g
                        key={item.point.id}
                        data-testid={`cluster-map-pin-group-${item.point.id}`}
                      >
                        <circle
                          cx={item.x}
                          cy={item.y}
                          r={haloRadius}
                          fill={item.colorToken}
                          fillOpacity={0.22}
                          pointerEvents="none"
                        />
                        {isSelected ? (
                          <circle
                            data-testid={`cluster-map-pin-ring-${item.point.id}`}
                            cx={item.x}
                            cy={item.y}
                            r={ringRadius}
                            fill="none"
                            stroke={item.colorToken}
                            strokeWidth={roundTwo(2 * invScale)}
                            strokeOpacity={0.95}
                            pointerEvents="none"
                          />
                        ) : null}
                        <circle
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`${item.point.label}${categorySuffix} (${item.point.lat.toFixed(2)}°, ${item.point.lng.toFixed(2)}°)`}
                          data-testid={`cluster-map-pin-${item.point.id}`}
                          data-tone={item.tone}
                          data-selected={isSelected ? 'true' : undefined}
                          cx={item.x}
                          cy={item.y}
                          r={pinRadius}
                          fill={item.colorToken}
                          fillOpacity={isSelected ? 1 : 0.9}
                          stroke={
                            isSelected ? 'var(--prism-text-primary)' : 'var(--prism-bg-start)'
                          }
                          strokeWidth={roundTwo((isSelected ? 2 : 1.4) * invScale)}
                          className="prism-focus-ring cursor-pointer transition-[color,background-color,border-color,opacity,transform]"
                          onClick={() => handleSelectPoint(item)}
                          onKeyDown={(event) => handlePointKeyDown(event, item)}
                        />
                        <circle
                          cx={roundTwo(item.x - glintOffset)}
                          cy={roundTwo(item.y - glintOffset)}
                          r={glintRadius}
                          fill="var(--prism-primary-contrast)"
                          fillOpacity={0.55}
                          pointerEvents="none"
                        />
                      </g>
                    );
                  })}
                </g>

                <g data-testid="cluster-map-clusters-layer">
                  {clusters.map((cluster) => {
                    const isSelected = activeClusterId === cluster.id;
                    const baseRadius = clampNumber(
                      12 + Math.log2(cluster.members.length) * 3,
                      14,
                      24,
                      15
                    );
                    const coreRadius = roundTwo(baseRadius * invScale);
                    const haloRadius = roundTwo((baseRadius + 6) * invScale);
                    const ringRadius = roundTwo((baseRadius + 9) * invScale);
                    const fontSize = roundTwo(10.5 * invScale);

                    return (
                      <g
                        key={cluster.id}
                        data-testid={`cluster-map-cluster-group-${cluster.id}`}
                      >
                        <circle
                          data-testid={`cluster-map-cluster-halo-${cluster.id}`}
                          cx={cluster.cx}
                          cy={cluster.cy}
                          r={haloRadius}
                          fill="var(--prism-primary-main)"
                          fillOpacity={0.22}
                          pointerEvents="none"
                        />
                        {isSelected ? (
                          <circle
                            data-testid={`cluster-map-cluster-ring-${cluster.id}`}
                            cx={cluster.cx}
                            cy={cluster.cy}
                            r={ringRadius}
                            fill="none"
                            stroke="var(--prism-primary-main)"
                            strokeWidth={roundTwo(2 * invScale)}
                            strokeOpacity={0.92}
                            pointerEvents="none"
                          />
                        ) : null}
                        <circle
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`Cluster of ${cluster.members.length} markers near ${cluster.avgLat.toFixed(2)}°, ${cluster.avgLng.toFixed(2)}°`}
                          data-testid={`cluster-map-cluster-${cluster.id}`}
                          data-count={String(cluster.members.length)}
                          data-selected={isSelected ? 'true' : undefined}
                          cx={cluster.cx}
                          cy={cluster.cy}
                          r={coreRadius}
                          fill="var(--prism-primary-main)"
                          stroke="var(--prism-primary-contrast)"
                          strokeWidth={roundTwo(1.5 * invScale)}
                          className="prism-focus-ring cursor-pointer transition-[color,background-color,border-color,opacity,transform]"
                          onClick={() => handleSelectCluster(cluster)}
                          onKeyDown={(event) => handleClusterKeyDown(event, cluster)}
                        />
                        <text
                          data-testid={`cluster-map-cluster-count-${cluster.id}`}
                          x={cluster.cx}
                          y={cluster.cy}
                          textAnchor="middle"
                          dominantBaseline="central"
                          pointerEvents="none"
                          className="font-mono font-bold select-none"
                          style={{
                            fill: 'var(--prism-primary-contrast)',
                            fontSize: `${fontSize}px`,
                          }}
                        >
                          {cluster.members.length}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </g>
            </svg>
          </div>

          <div
            aria-live="polite"
            data-testid="cluster-map-inspector"
            className={cx(inspectorClass, 'prism-well rounded-xl px-3.5 py-2.5 text-xs')}
          >
            {activePoint !== null ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activePoint.colorToken }}
                  />
                  <span
                    data-testid="cluster-map-inspector-summary"
                    className="font-semibold font-mono tabular-nums break-words"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {activePoint.point.label} · {activePoint.point.lat.toFixed(2)}°,{' '}
                    {activePoint.point.lng.toFixed(2)}°
                  </span>
                  {activePoint.point.category !== undefined ? (
                    <span
                      data-testid="cluster-map-inspector-category"
                      className="prism-crystal rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {activePoint.point.category}
                    </span>
                  ) : null}
                  {activePoint.point.value !== undefined ? (
                    <span
                      data-testid="cluster-map-inspector-value"
                      className="prism-emerald rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums font-medium shrink-0"
                    >
                      {roundTwo(activePoint.point.value)}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  aria-label="Clear selection"
                  data-testid="cluster-map-inspector-clear"
                  onClick={handleClearSelection}
                  className="prism-crystal prism-focus-ring rounded-full px-2 py-0.5 text-[11px] font-medium cursor-pointer shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Clear
                </button>
              </div>
            ) : activeClusterMembers.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      data-testid="cluster-map-inspector-cluster-count"
                      className="prism-emerald rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums font-medium shrink-0"
                    >
                      {activeClusterMembers.length} clustered markers
                    </span>
                    <span style={STYLE_TEXT_SECONDARY}>
                      Select a member to inspect coordinates
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label="Clear selection"
                    data-testid="cluster-map-inspector-clear"
                    onClick={handleClearSelection}
                    className="prism-crystal prism-focus-ring rounded-full px-2 py-0.5 text-[11px] font-medium cursor-pointer shrink-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Clear
                  </button>
                </div>

                <div
                  data-testid="cluster-map-inspector-members"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {activeClusterMembers.map((member) => (
                    <button
                      key={member.point.id}
                      type="button"
                      data-testid={`cluster-map-member-pill-${member.point.id}`}
                      onClick={() => handleSelectPoint(member)}
                      className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium cursor-pointer"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      <span
                        aria-hidden="true"
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: member.colorToken }}
                      />
                      <span>{member.point.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p style={STYLE_TEXT_SECONDARY}>
                Select a pin to inspect coordinates or click a cluster bubble to zoom in and
                explore grouped markers.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const PointClusterMap = memo(PointClusterMapInner);
PointClusterMap.displayName = 'PointClusterMap';
