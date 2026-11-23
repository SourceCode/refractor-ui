'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Compass, MapPin as MapPinIcon, Maximize2, Minus, Plus, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export interface MapPin {
  /** Unique identifier for the map pin. */
  id: string;
  /** Visible human-readable label rendered safely as literal text. */
  label: string;
  /** Optional descriptive text displayed in the floating info popup card. */
  description?: string;
  /** Horizontal map position as a percentage (0..100). */
  x: number;
  /** Vertical map position as a percentage (0..100). */
  y: number;
  /** Optional category tag shown in the pin info popup card. */
  category?: string;
  /** Optional cluster count; values > 1 render as a numbered cluster orb. */
  clusterCount?: number;
}

export interface MapRoute {
  /** Unique identifier for the optical route line. */
  id: string;
  /** Starting pin identifier. */
  fromPinId: string;
  /** Destination pin identifier. */
  toPinId: string;
  /** Optional label displayed along the route midpoint. */
  label?: string;
}

export interface InteractiveMapViewerProps extends BaseProps<HTMLDivElement> {
  /** Pins positioned in normalized 0..100 geographic percentage coordinates. */
  pins: ReadonlyArray<MapPin>;
  /** Optional routes connecting pins by ID (dangling or self-loop routes are ignored). */
  routes?: ReadonlyArray<MapRoute>;
  /** Controlled selected pin ID (`null` clears selection). */
  selectedPinId?: string | null;
  /** Initial selected pin ID when used in uncontrolled mode. */
  defaultSelectedPinId?: string | null;
  /** Fired whenever a pin is selected or the info popup is closed (`null`). */
  onSelectPin?: (pin: MapPin | null) => void;
  /** Viewport height in pixels (clamped 200..700, default 340). */
  heightPx?: number;
}

interface Point2D {
  x: number;
  y: number;
}

interface ResolvedRoute {
  route: MapRoute;
  from: MapPin;
  to: MapPin;
  midX: number;
  midY: number;
}

interface GraticuleLine {
  id: string;
  coord: number;
}

interface ContourRing {
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number;
}

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 700;
const DEFAULT_HEIGHT = 340;

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 2.5;
const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.25;

const MIN_PAN = -1200;
const MAX_PAN = 1200;
const GRID_BASE_PX = 24;

const LATITUDE_LINES: ReadonlyArray<GraticuleLine> = [
  { id: 'lat-20', coord: 20 },
  { id: 'lat-40', coord: 40 },
  { id: 'lat-60', coord: 60 },
  { id: 'lat-80', coord: 80 },
];

const LONGITUDE_LINES: ReadonlyArray<GraticuleLine> = [
  { id: 'lon-20', coord: 20 },
  { id: 'lon-40', coord: 40 },
  { id: 'lon-60', coord: 60 },
  { id: 'lon-80', coord: 80 },
];

const TOPO_CONTOURS: ReadonlyArray<ContourRing> = [
  { id: 'ridge-nw-outer', cx: 26, cy: 30, rx: 22, ry: 14, rotation: -18 },
  { id: 'ridge-nw-inner', cx: 25, cy: 29, rx: 12, ry: 7.5, rotation: -18 },
  { id: 'basin-se-outer', cx: 74, cy: 66, rx: 25, ry: 15, rotation: 14 },
  { id: 'basin-se-inner', cx: 75, cy: 67, rx: 14, ry: 8.5, rotation: 14 },
  { id: 'saddle-center', cx: 52, cy: 48, rx: 32, ry: 20, rotation: -8 },
];

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function stopEventPropagation(event: { stopPropagation: () => void }): void {
  event.stopPropagation();
}

function sanitizePins(raw: ReadonlyArray<MapPin>): MapPin[] {
  if (raw.length === 0) return [];
  const seen = new Set<string>();
  const result: MapPin[] = [];

  for (const pin of raw) {
    const id = pin.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const sanitized: MapPin = {
      id,
      label: pin.label,
      x: roundTwo(clampNumber(pin.x, 0, 100, 50)),
      y: roundTwo(clampNumber(pin.y, 0, 100, 50)),
    };

    if (pin.description !== undefined) {
      sanitized.description = pin.description;
    }
    if (pin.category !== undefined) {
      sanitized.category = pin.category;
    }
    if (
      pin.clusterCount !== undefined &&
      Number.isFinite(pin.clusterCount) &&
      Math.floor(pin.clusterCount) > 1
    ) {
      sanitized.clusterCount = Math.floor(clampNumber(pin.clusterCount, 2, 9999, 2));
    }

    result.push(sanitized);
  }

  return result;
}

function resolveRoutes(
  raw: ReadonlyArray<MapRoute> | undefined,
  pinMap: ReadonlyMap<string, MapPin>
): ResolvedRoute[] {
  if (!raw || raw.length === 0) return [];
  const seenIds = new Set<string>();
  const resolved: ResolvedRoute[] = [];

  for (const route of raw) {
    const id = route.id.trim();
    const fromPinId = route.fromPinId.trim();
    const toPinId = route.toPinId.trim();
    if (!id || seenIds.has(id) || fromPinId === toPinId) continue;

    const from = pinMap.get(fromPinId);
    const to = pinMap.get(toPinId);
    if (!from || !to) continue;

    seenIds.add(id);
    const normalized: MapRoute =
      route.label !== undefined
        ? { id, fromPinId, toPinId, label: route.label }
        : { id, fromPinId, toPinId };

    resolved.push({
      route: normalized,
      from,
      to,
      midX: roundTwo((from.x + to.x) / 2),
      midY: roundTwo((from.y + to.y) / 2),
    });
  }

  return resolved;
}

function InteractiveMapViewerInner({
  pins,
  routes,
  selectedPinId,
  defaultSelectedPinId = null,
  onSelectPin,
  heightPx = DEFAULT_HEIGHT,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: InteractiveMapViewerProps) {
  const override = useComponentOverride('InteractiveMapViewer');
  const cleanupPointerRef = useRef<(() => void) | null>(null);
  const panMovedRef = useRef(false);

  const safeHeight = Math.round(clampNumber(heightPx, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT));

  const sanitizedPins = useMemo(() => sanitizePins(pins), [pins]);

  const pinMap = useMemo(() => {
    const map = new Map<string, MapPin>();
    for (const pin of sanitizedPins) {
      map.set(pin.id, pin);
    }
    return map;
  }, [sanitizedPins]);

  const resolvedRoutes = useMemo(() => resolveRoutes(routes, pinMap), [routes, pinMap]);

  const isSelectedControlled = selectedPinId !== undefined;
  const [uncontrolledSelectedId, setUncontrolledSelectedId] = useState<string | null>(
    () => defaultSelectedPinId ?? null
  );

  const activeSelectedId = isSelectedControlled ? selectedPinId : uncontrolledSelectedId;
  const selectedPin = activeSelectedId ? (pinMap.get(activeSelectedId) ?? null) : null;

  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
  const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);

  const zoomRef = useRef<number>(zoom);
  zoomRef.current = zoom;

  const panRef = useRef<Point2D>(pan);
  panRef.current = pan;

  const isSelectedControlledRef = useRef<boolean>(isSelectedControlled);
  isSelectedControlledRef.current = isSelectedControlled;

  const onSelectPinRef = useRef(onSelectPin);
  onSelectPinRef.current = onSelectPin;

  const selectPin = useCallback((pin: MapPin | null) => {
    const nextId = pin ? pin.id : null;
    if (!isSelectedControlledRef.current) {
      setUncontrolledSelectedId(nextId);
    }
    onSelectPinRef.current?.(pin);
  }, []);

  const updateZoom = useCallback((rawZoom: number) => {
    const nextZoom = roundTwo(clampNumber(rawZoom, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM));
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
  }, []);

  const updatePan = useCallback((next: Point2D) => {
    const clamped: Point2D = {
      x: roundTwo(clampNumber(next.x, MIN_PAN, MAX_PAN, 0)),
      y: roundTwo(clampNumber(next.y, MIN_PAN, MAX_PAN, 0)),
    };
    panRef.current = clamped;
    setPan(clamped);
  }, []);

  const handleZoomOut = useCallback(() => {
    updateZoom(zoomRef.current - ZOOM_STEP);
  }, [updateZoom]);

  const handleZoomIn = useCallback(() => {
    updateZoom(zoomRef.current + ZOOM_STEP);
  }, [updateZoom]);

  const handleResetView = useCallback(() => {
    updateZoom(DEFAULT_ZOOM);
    updatePan({ x: 0, y: 0 });
  }, [updatePan, updateZoom]);

  useEffect(() => {
    return () => {
      cleanupPointerRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!selectedPin) return;
    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        selectPin(null);
      }
    };
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [selectedPin, selectPin]);

  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button > 0) return;
      cleanupPointerRef.current?.();

      const startClientX = event.clientX;
      const startClientY = event.clientY;
      const startPanX = panRef.current.x;
      const startPanY = panRef.current.y;
      panMovedRef.current = false;

      setIsPanning(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startClientX;
        const dy = moveEvent.clientY - startClientY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          panMovedRef.current = true;
        }
        updatePan({ x: startPanX + dx, y: startPanY + dy });
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupPointerRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsPanning(false);
      };

      cleanupPointerRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [updatePan]
  );

  const handleCanvasClick = useCallback(() => {
    if (panMovedRef.current) {
      panMovedRef.current = false;
      return;
    }
    if (selectedPin !== null) {
      selectPin(null);
    }
  }, [selectPin, selectedPin]);

  const handleViewportKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        handleZoomIn();
        return;
      }

      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        handleZoomOut();
        return;
      }

      if (event.key === '0') {
        event.preventDefault();
        handleResetView();
      }
    },
    [handleResetView, handleZoomIn, handleZoomOut]
  );

  const gridStepPx = roundTwo(GRID_BASE_PX * zoom);

  const merged = mergeProps({
    themeTarget: themeProps('interactive-map-viewer', {
      empty: sanitizedPins.length === 0,
      panning: isPanning,
      hasSelection: selectedPin !== null,
    }),
    baseClassName: 'prism-slab relative w-full overflow-hidden select-none',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: { height: `${safeHeight}px` },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const viewportClass = stableClassName('interactive-map-viewer', 'viewport');
  const toolbarClass = stableClassName('interactive-map-viewer', 'toolbar');
  const pinClass = stableClassName('interactive-map-viewer', 'pin');
  const popupClass = stableClassName('interactive-map-viewer', 'popup');

  return (
    <div ref={ref} role="region" aria-label="Interactive map viewer" {...rest} {...merged}>
      {/* Floating Optical Crystal HUD Bar */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2">
        <div
          role="toolbar"
          aria-label="Map viewport controls"
          className={cx(
            toolbarClass,
            'prism-crystal pointer-events-auto rounded-2xl px-2.5 py-1.5 inline-flex flex-wrap items-center gap-1.5'
          )}
        >
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onClick={handleZoomOut}
            className="prism-well prism-focus-ring h-7 w-7 rounded-full inline-flex items-center justify-center text-[var(--prism-text-primary)] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <span
            data-testid="map-zoom-readout"
            className="text-xs font-mono tabular-nums font-semibold text-[var(--prism-text-primary)] min-w-[44px] text-center"
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onClick={handleZoomIn}
            className="prism-well prism-focus-ring h-7 w-7 rounded-full inline-flex items-center justify-center text-[var(--prism-text-primary)] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <span aria-hidden="true" className="w-px h-4 bg-[var(--prism-divider)] mx-0.5" />

          <button
            type="button"
            aria-label="Reset map view"
            onClick={handleResetView}
            className="prism-well prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium text-[var(--prism-text-primary)] cursor-pointer hover:brightness-105"
          >
            <Maximize2 className="w-3 h-3" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>

        <div
          data-testid="map-telemetry"
          className="prism-crystal pointer-events-auto rounded-full px-3 py-1.5 inline-flex items-center gap-2 text-[11px] font-mono tabular-nums font-medium text-[var(--prism-text-primary)]"
        >
          <Compass
            className="w-3.5 h-3.5 text-[var(--prism-secondary-main)] shrink-0"
            aria-hidden="true"
          />
          <span>
            {sanitizedPins.length === 1 ? '1 pin' : `${sanitizedPins.length} pins`} ·{' '}
            {resolvedRoutes.length === 1 ? '1 route' : `${resolvedRoutes.length} routes`}
          </span>
        </div>
      </div>

      {/* Optical Geographic Pan/Zoom Canvas */}
      <div
        role="application"
        tabIndex={0}
        aria-label="Interactive geographic map canvas. Drag to pan, use plus and minus keys to zoom, zero to reset view, and Escape to close pin details."
        data-testid="map-viewport"
        data-zoom={String(zoom)}
        data-pan-x={String(pan.x)}
        data-pan-y={String(pan.y)}
        onPointerDown={handleCanvasPointerDown}
        onClick={handleCanvasClick}
        onKeyDown={handleViewportKeyDown}
        style={{
          backgroundSize: `${gridStepPx}px ${gridStepPx}px, ${gridStepPx}px ${gridStepPx}px, 100% 100%`,
          backgroundPosition: `${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px, 0px 0px`,
          touchAction: 'none',
        }}
        className={cx(
          viewportClass,
          'prism-studio-grid prism-focus-ring relative w-full h-full overflow-hidden touch-none',
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        {/* World Transform Layer */}
        <div
          data-testid="map-world"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
          className="absolute inset-0 will-change-transform"
        >
          {/* Topographic Latitude, Longitude & Elevation Contour Layer */}
          <svg
            aria-hidden="true"
            data-testid="map-topo-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {LATITUDE_LINES.map((line) => (
              <line
                key={line.id}
                x1={0}
                y1={line.coord}
                x2={100}
                y2={line.coord}
                stroke="var(--prism-divider)"
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {LONGITUDE_LINES.map((line) => (
              <line
                key={line.id}
                x1={line.coord}
                y1={0}
                x2={line.coord}
                y2={100}
                stroke="var(--prism-divider)"
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {TOPO_CONTOURS.map((ring) => (
              <ellipse
                key={ring.id}
                cx={ring.cx}
                cy={ring.cy}
                rx={ring.rx}
                ry={ring.ry}
                transform={`rotate(${ring.rotation} ${ring.cx} ${ring.cy})`}
                fill="none"
                stroke="var(--prism-divider)"
                strokeWidth={1.1}
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Dashed Optical Route Paths Layer */}
          <svg
            aria-hidden="true"
            data-testid="map-routes-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {resolvedRoutes.map(({ route, from, to }) => {
              const highlighted =
                selectedPin !== null &&
                (route.fromPinId === selectedPin.id || route.toPinId === selectedPin.id);
              const strokeToken = highlighted
                ? 'var(--prism-primary-main)'
                : 'var(--prism-secondary-main)';

              return (
                <line
                  key={route.id}
                  data-testid={`map-route-${route.id}`}
                  data-highlighted={highlighted ? 'true' : undefined}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={strokeToken}
                  strokeWidth={highlighted ? 2.5 : 2}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {/* Optional Route Midpoint Labels */}
          {resolvedRoutes.map(({ route, midX, midY }) => {
            if (!route.label) return null;
            return (
              <div
                key={`label-${route.id}`}
                data-testid={`map-route-label-${route.id}`}
                onPointerDown={stopEventPropagation}
                onClick={stopEventPropagation}
                style={{
                  left: `${midX}%`,
                  top: `${midY}%`,
                }}
                className="prism-crystal pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-10 rounded-full px-2 py-0.5 text-[10px] font-medium text-[var(--prism-text-primary)] whitespace-nowrap"
              >
                {route.label}
              </div>
            );
          })}

          {/* Interactive Map Pins & Numbered Cluster Orbs */}
          {sanitizedPins.map((pin) => {
            const isSelected = selectedPin?.id === pin.id;
            const isCluster = pin.clusterCount !== undefined && pin.clusterCount > 1;
            const pinAriaLabel = isCluster
              ? `${pin.label} (${pin.clusterCount} clustered pins)`
              : pin.label;

            return (
              <button
                key={pin.id}
                type="button"
                aria-label={pinAriaLabel}
                aria-pressed={isSelected}
                data-testid={`map-pin-${pin.id}`}
                data-selected={isSelected ? 'true' : undefined}
                data-cluster={isCluster ? 'true' : undefined}
                onPointerDown={stopEventPropagation}
                onClick={(event) => {
                  event.stopPropagation();
                  selectPin(pin);
                }}
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                }}
                className={cx(
                  pinClass,
                  'prism-focus-ring absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-110',
                  isCluster ? 'min-w-[34px] h-[34px] px-2' : 'w-8 h-8',
                  isSelected
                    ? 'prism-btn-primary z-20 ring-2 ring-[var(--prism-primary-main)] scale-110'
                    : isCluster
                      ? 'prism-crystal z-10 border-2 border-[var(--prism-secondary-main)] text-[var(--prism-text-primary)]'
                      : 'prism-crystal z-10 border border-[var(--prism-divider)] text-[var(--prism-primary-main)]'
                )}
              >
                {isCluster ? (
                  <span
                    data-testid={`map-pin-cluster-count-${pin.id}`}
                    className="relative z-10 text-xs font-mono tabular-nums font-bold"
                  >
                    {pin.clusterCount}
                  </span>
                ) : (
                  <MapPinIcon className="relative z-10 w-4 h-4" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {/* Empty State Overlay */}
        {sanitizedPins.length === 0 ? (
          <div
            data-testid="map-empty-state"
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center"
          >
            <div className="prism-crystal rounded-2xl px-4 py-3 max-w-xs space-y-1">
              <p className="text-xs font-semibold text-[var(--prism-text-primary)]">
                No map pins available
              </p>
              <p className="text-[11px] text-[var(--prism-text-secondary)]">
                Provide pins with percentage coordinates to plot locations and routes.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Floating Optical Slab Pin Info Popup Card */}
      {selectedPin ? (
        <div
          role="dialog"
          aria-label={`${selectedPin.label} details`}
          data-testid="map-pin-popup"
          onPointerDown={stopEventPropagation}
          onClick={stopEventPropagation}
          className={cx(
            popupClass,
            'prism-slab absolute bottom-3 right-3 z-30 w-72 max-w-[calc(100%-1.5rem)] rounded-2xl p-3.5 space-y-2 border border-[var(--prism-divider)]'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-semibold text-[var(--prism-text-primary)] leading-tight break-words">
                {selectedPin.label}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedPin.category ? (
                  <span
                    data-testid="map-pin-popup-category"
                    className="prism-well rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--prism-secondary-dark)] dark:text-[var(--prism-secondary-light)]"
                  >
                    {selectedPin.category}
                  </span>
                ) : null}
                {selectedPin.clusterCount && selectedPin.clusterCount > 1 ? (
                  <span
                    data-testid="map-pin-popup-cluster"
                    className="prism-well rounded-full px-2 py-0.5 text-[10px] font-mono tabular-nums font-semibold text-[var(--prism-primary-main)]"
                  >
                    {selectedPin.clusterCount} locations
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              aria-label="Close pin details"
              onClick={(event) => {
                event.stopPropagation();
                selectPin(null);
              }}
              className="prism-well prism-focus-ring h-7 w-7 rounded-full inline-flex items-center justify-center shrink-0 text-[var(--prism-text-secondary)] hover:text-[var(--prism-text-primary)] cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {selectedPin.description ? (
            <p
              data-testid="map-pin-popup-description"
              className="text-xs text-[var(--prism-text-secondary)] leading-relaxed break-words"
            >
              {selectedPin.description}
            </p>
          ) : null}

          <div
            data-testid="map-pin-popup-coords"
            className="pt-1.5 border-t border-[var(--prism-divider)] flex items-center justify-between text-[11px] font-mono tabular-nums text-[var(--prism-text-secondary)]"
          >
            <span>Coordinates</span>
            <span className="font-semibold text-[var(--prism-text-primary)]">
              X {selectedPin.x.toFixed(1)}% · Y {selectedPin.y.toFixed(1)}%
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const InteractiveMapViewer = memo(InteractiveMapViewerInner);
InteractiveMapViewer.displayName = 'InteractiveMapViewer';
