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
import { themeProps } from '../utils/themeProps';

export type GeoFlowTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface GeoHub {
  /** Stable unique identifier for the geographic hub. */
  id: string;
  /** Human-readable hub label rendered safely as literal text. */
  label: string;
  /** Geographic latitude in degrees (finite values clamped to [-90, 90]). */
  lat: number;
  /** Geographic longitude in degrees (finite values clamped to [-180, 180]). */
  lng: number;
  /** Optional semantic optical tone for the hub marker and its outgoing arcs. */
  tone?: GeoFlowTone;
}

export interface GeoFlowArc {
  /** Stable unique identifier for the directional flow arc. */
  id: string;
  /** Origin hub identifier. */
  origin: string;
  /** Destination hub identifier. */
  destination: string;
  /** Positive finite flow volume used to scale arc stroke thickness. */
  volume: number;
  /** Optional descriptive route label displayed in the inspector readout. */
  label?: string;
  /** Optional semantic optical tone overriding the origin hub tone. */
  tone?: GeoFlowTone;
}

export interface GeoFlowArcMapProps extends BaseProps<HTMLDivElement> {
  /** Geographic hubs plotted with equirectangular projection (deduplicated by id). */
  hubs: GeoHub[];
  /** Directed origin-to-destination flow routes (filters positive finite volumes between distinct valid hubs). */
  flows: GeoFlowArc[];
  /** Card heading displayed in the optical glass header (defaults to 'Global Flow Arc Map'). */
  title?: string;
  /** Optional unit suffix appended to formatted volume figures (defaults to ''). */
  valueUnit?: string;
  /** SVG viewport height in pixels (defaults to 280, clamped to 180..480). */
  height?: number;
  /** Callback fired when a user clicks or activates any flow arc via keyboard. */
  onSelectFlow?: (flow: GeoFlowArc, originHub: GeoHub, destinationHub: GeoHub) => void;
}

type GeoSelection =
  | { kind: 'none' }
  | { kind: 'flow'; id: string }
  | { kind: 'hub'; id: string };

interface RawHubEntry {
  hub: GeoHub;
  lat: number;
  lng: number;
  x: number;
  y: number;
  origIdx: number;
}

interface FilteredFlowEntry {
  flow: GeoFlowArc;
  originEntry: RawHubEntry;
  destinationEntry: RawHubEntry;
}

interface ComputedGeoHub {
  id: string;
  label: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  radius: number;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'middle' | 'end';
  tone: GeoFlowTone;
  color: string;
  outbound: number;
  inbound: number;
  original: GeoHub;
}

interface ComputedGeoFlowArc {
  id: string;
  origin: string;
  destination: string;
  volume: number;
  label?: string;
  tone: GeoFlowTone;
  color: string;
  pathD: string;
  strokeWidth: number;
  midX: number;
  midY: number;
  midAngleDeg: number;
  original: GeoFlowArc;
  originHub: GeoHub;
  destinationHub: GeoHub;
}

interface GraticuleLine {
  id: string;
  coord: number;
  isPrimaryAxis: boolean;
}

interface LandmassPath {
  id: string;
  d: string;
}

const SVG_WIDTH = 640;
const SVG_HEIGHT = 320;
const MIN_HEIGHT = 180;
const MAX_HEIGHT = 480;
const DEFAULT_HEIGHT = 280;
const MIN_STROKE_WIDTH = 1.5;
const MAX_STROKE_WIDTH = 6;
const DEFAULT_STROKE_WIDTH = 3.25;
const MIN_HUB_RADIUS = 4.5;
const MAX_HUB_RADIUS = 7.5;

const TONE_CYCLE: readonly GeoFlowTone[] = ['primary', 'secondary', 'emerald', 'amber', 'rose'];

const TONE_COLOR_MAP = new Map<GeoFlowTone, string>([
  ['primary', 'var(--prism-primary-main)'],
  ['secondary', 'var(--prism-secondary-main)'],
  ['emerald', 'var(--prism-success-main)'],
  ['amber', 'var(--prism-warning-main)'],
  ['rose', 'var(--prism-error-main)'],
]);

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function projectLatLng(lat: number, lng: number): { x: number; y: number } {
  return {
    x: roundCoord(((lng + 180) / 360) * SVG_WIDTH),
    y: roundCoord(((90 - lat) / 180) * SVG_HEIGHT),
  };
}

const LATITUDE_LINES: ReadonlyArray<GraticuleLine> = [-60, -30, 0, 30, 60].map((lat) => ({
  id: `lat-${lat}`,
  coord: projectLatLng(lat, 0).y,
  isPrimaryAxis: lat === 0,
}));

const LONGITUDE_LINES: ReadonlyArray<GraticuleLine> = [-120, -60, 0, 60, 120].map((lng) => ({
  id: `lng-${lng}`,
  coord: projectLatLng(0, lng).x,
  isPrimaryAxis: lng === 0,
}));

const CONTINENT_PATHS: ReadonlyArray<LandmassPath> = [
  {
    id: 'north-america',
    d: 'M 27,44 L 80,36 L 142,32 L 213,57 L 194,76 L 187,89 L 176,114 L 160,115 L 169,142 L 154,140 L 133,124 L 103,94 L 94,72 L 75,57 Z',
  },
  {
    id: 'greenland',
    d: 'M 222,21 L 284,16 L 267,39 L 240,53 L 226,39 Z',
  },
  {
    id: 'south-america',
    d: 'M 181,142 L 210,142 L 258,171 L 244,201 L 204,235 L 196,256 L 190,224 L 176,169 Z',
  },
  {
    id: 'europe',
    d: 'M 304,92 L 313,69 L 338,50 L 370,34 L 418,43 L 408,74 L 388,82 L 348,89 L 311,96 Z',
  },
  {
    id: 'africa',
    d: 'M 304,100 L 377,105 L 386,125 L 411,140 L 391,178 L 356,220 L 341,192 L 336,153 L 290,133 Z',
  },
  {
    id: 'asia',
    d: 'M 384,92 L 420,43 L 560,34 L 631,44 L 604,68 L 551,96 L 523,121 L 505,142 L 484,122 L 459,146 L 440,115 L 416,130 L 388,114 Z',
  },
  {
    id: 'maritime-se-asia',
    d: 'M 498,158 L 534,173 L 528,180 L 494,166 Z',
  },
  {
    id: 'australia',
    d: 'M 523,199 L 562,181 L 592,206 L 583,228 L 551,219 L 524,220 Z',
  },
  {
    id: 'antarctica',
    d: 'M 44,296 L 195,286 L 340,292 L 510,287 L 605,296 L 605,312 L 44,312 Z',
  },
];

function formatNumeric(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toFixed(2)));
}

function formatValue(value: number, unit: string): string {
  const formatted = formatNumeric(value);
  return unit ? `${formatted}${unit}` : formatted;
}

function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(1)}°${latDir}, ${Math.abs(lng).toFixed(1)}°${lngDir}`;
}

function resolveHubTone(tone: GeoFlowTone | undefined, fallbackIndex: number): GeoFlowTone {
  if (tone !== undefined && TONE_COLOR_MAP.has(tone)) {
    return tone;
  }
  return TONE_CYCLE[fallbackIndex % TONE_CYCLE.length]!;
}

function resolveFlowTone(tone: GeoFlowTone | undefined, fallbackTone: GeoFlowTone): GeoFlowTone {
  if (tone !== undefined && TONE_COLOR_MAP.has(tone)) {
    return tone;
  }
  return fallbackTone;
}

export function GeoFlowArcMap({
  hubs,
  flows,
  title = 'Global Flow Arc Map',
  valueUnit = '',
  height = DEFAULT_HEIGHT,
  onSelectFlow,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: GeoFlowArcMapProps) {
  const headingId = useId();
  const override = useComponentOverride('GeoFlowArcMap');
  const [selection, setSelection] = useState<GeoSelection>({ kind: 'none' });

  const clampedHeight = Math.round(clampNumber(height, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT));

  const geometry = useMemo(() => {
    const rawHubMap = new Map<string, RawHubEntry>();
    for (let i = 0; i < hubs.length; i += 1) {
      const hub = hubs[i]!;
      if (!Number.isFinite(hub.lat) || !Number.isFinite(hub.lng)) {
        continue;
      }
      if (hub.id.trim().length === 0 || rawHubMap.has(hub.id)) {
        continue;
      }
      const clampedLat = clampNumber(hub.lat, -90, 90, 0);
      const clampedLng = clampNumber(hub.lng, -180, 180, 0);
      const projected = projectLatLng(clampedLat, clampedLng);
      rawHubMap.set(hub.id, {
        hub,
        lat: clampedLat,
        lng: clampedLng,
        x: projected.x,
        y: projected.y,
        origIdx: i,
      });
    }

    const seenFlowIds = new Set<string>();
    const filteredFlows: FilteredFlowEntry[] = [];
    for (let i = 0; i < flows.length; i += 1) {
      const flow = flows[i]!;
      if (flow.id.trim().length === 0 || seenFlowIds.has(flow.id)) {
        continue;
      }
      if (!Number.isFinite(flow.volume) || flow.volume <= 0) {
        continue;
      }
      if (flow.origin === flow.destination) {
        continue;
      }
      const originEntry = rawHubMap.get(flow.origin);
      const destinationEntry = rawHubMap.get(flow.destination);
      if (!originEntry || !destinationEntry) {
        continue;
      }
      seenFlowIds.add(flow.id);
      filteredFlows.push({ flow, originEntry, destinationEntry });
    }

    if (rawHubMap.size < 2 || filteredFlows.length === 0) {
      return {
        hubs: [] as ComputedGeoHub[],
        flows: [] as ComputedGeoFlowArc[],
        totalVolume: 0,
        hubLookup: new Map<string, ComputedGeoHub>(),
        flowLookup: new Map<string, ComputedGeoFlowArc>(),
        neighborsByHub: new Map<string, Set<string>>(),
      };
    }

    const outboundMap = new Map<string, number>();
    const inboundMap = new Map<string, number>();
    const neighborsByHub = new Map<string, Set<string>>();

    let totalVolume = 0;
    let minVolume = Number.POSITIVE_INFINITY;
    let maxVolume = Number.NEGATIVE_INFINITY;

    for (const { flow } of filteredFlows) {
      totalVolume += flow.volume;
      if (flow.volume < minVolume) {
        minVolume = flow.volume;
      }
      if (flow.volume > maxVolume) {
        maxVolume = flow.volume;
      }

      outboundMap.set(flow.origin, (outboundMap.get(flow.origin) ?? 0) + flow.volume);
      inboundMap.set(flow.destination, (inboundMap.get(flow.destination) ?? 0) + flow.volume);

      let originNeighbors = neighborsByHub.get(flow.origin);
      if (!originNeighbors) {
        originNeighbors = new Set<string>();
        neighborsByHub.set(flow.origin, originNeighbors);
      }
      originNeighbors.add(flow.destination);

      let destNeighbors = neighborsByHub.get(flow.destination);
      if (!destNeighbors) {
        destNeighbors = new Set<string>();
        neighborsByHub.set(flow.destination, destNeighbors);
      }
      destNeighbors.add(flow.origin);
    }

    let maxHubTraffic = 0;
    for (const entry of rawHubMap.values()) {
      const traffic = (outboundMap.get(entry.hub.id) ?? 0) + (inboundMap.get(entry.hub.id) ?? 0);
      if (traffic > maxHubTraffic) {
        maxHubTraffic = traffic;
      }
    }

    const computedHubs: ComputedGeoHub[] = [];
    const hubLookup = new Map<string, ComputedGeoHub>();

    for (const entry of rawHubMap.values()) {
      const hubId = entry.hub.id;
      const outbound = outboundMap.get(hubId) ?? 0;
      const inbound = inboundMap.get(hubId) ?? 0;
      const trafficRatio = (outbound + inbound) / maxHubTraffic;
      const radius = roundCoord(
        MIN_HUB_RADIUS + trafficRatio * (MAX_HUB_RADIUS - MIN_HUB_RADIUS)
      );
      const tone = resolveHubTone(entry.hub.tone, entry.origIdx);
      const color = TONE_COLOR_MAP.get(tone)!;

      const labelAnchor: 'start' | 'middle' | 'end' =
        entry.x < 56 ? 'start' : entry.x > SVG_WIDTH - 56 ? 'end' : 'middle';
      const labelX =
        entry.x < 56
          ? roundCoord(entry.x + radius + 4)
          : entry.x > SVG_WIDTH - 56
            ? roundCoord(entry.x - radius - 4)
            : entry.x;
      const labelY =
        entry.y < 24 ? roundCoord(entry.y + radius + 12) : roundCoord(entry.y - radius - 5);

      const computed: ComputedGeoHub = {
        id: hubId,
        label: entry.hub.label,
        lat: entry.lat,
        lng: entry.lng,
        x: entry.x,
        y: entry.y,
        radius,
        labelX,
        labelY,
        labelAnchor,
        tone,
        color,
        outbound,
        inbound,
        original: entry.hub,
      };

      computedHubs.push(computed);
      hubLookup.set(hubId, computed);
    }

    const volumeSpan = maxVolume - minVolume;
    const computedFlows: ComputedGeoFlowArc[] = [];
    const flowLookup = new Map<string, ComputedGeoFlowArc>();

    for (const { flow, originEntry, destinationEntry } of filteredFlows) {
      const originComputed = hubLookup.get(flow.origin)!;
      const x1 = originEntry.x;
      const y1 = originEntry.y;
      const x2 = destinationEntry.x;
      const y2 = destinationEntry.y;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.hypot(dx, dy);
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const loft = Math.min(88, Math.max(12, dist * 0.28));
      const nx = dist > 0.001 ? dy / dist : 0;
      const ny = dist > 0.001 ? -dx / dist : -1;

      const ctrlX = roundCoord(clampNumber(mx + nx * loft, 8, SVG_WIDTH - 8, mx));
      const ctrlY = roundCoord(clampNumber(my + ny * loft, 8, SVG_HEIGHT - 8, my));
      const pathD = `M ${x1},${y1} Q ${ctrlX},${ctrlY} ${x2},${y2}`;

      const midX = roundCoord(0.25 * x1 + 0.5 * ctrlX + 0.25 * x2);
      const midY = roundCoord(0.25 * y1 + 0.5 * ctrlY + 0.25 * y2);
      const midAngleDeg = dist > 0.001 ? roundCoord((Math.atan2(dy, dx) * 180) / Math.PI) : 0;

      const strokeWidth =
        volumeSpan > 0
          ? roundCoord(
              MIN_STROKE_WIDTH +
                ((flow.volume - minVolume) / volumeSpan) * (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH)
            )
          : DEFAULT_STROKE_WIDTH;

      const tone = resolveFlowTone(flow.tone, originComputed.tone);
      const color = TONE_COLOR_MAP.get(tone)!;

      const computed: ComputedGeoFlowArc = {
        id: flow.id,
        origin: flow.origin,
        destination: flow.destination,
        volume: flow.volume,
        ...(flow.label !== undefined ? { label: flow.label } : {}),
        tone,
        color,
        pathD,
        strokeWidth,
        midX,
        midY,
        midAngleDeg,
        original: flow,
        originHub: originEntry.hub,
        destinationHub: destinationEntry.hub,
      };

      computedFlows.push(computed);
      flowLookup.set(flow.id, computed);
    }

    return {
      hubs: computedHubs,
      flows: computedFlows,
      totalVolume,
      hubLookup,
      flowLookup,
      neighborsByHub,
    };
  }, [hubs, flows]);

  const isEmpty = geometry.hubs.length < 2 || geometry.flows.length === 0;

  const activeFlow = useMemo(() => {
    if (selection.kind !== 'flow') return null;
    return geometry.flowLookup.get(selection.id) ?? null;
  }, [geometry.flowLookup, selection]);

  const activeHub = useMemo(() => {
    if (selection.kind !== 'hub') return null;
    return geometry.hubLookup.get(selection.id) ?? null;
  }, [geometry.hubLookup, selection]);

  const hasActiveSelection = activeFlow !== null || activeHub !== null;
  const activeHubNeighbors = activeHub
    ? (geometry.neighborsByHub.get(activeHub.id) ?? null)
    : null;

  const handleClearFocus = useCallback(() => {
    setSelection({ kind: 'none' });
  }, []);

  const handleSelectFlow = useCallback(
    (arc: ComputedGeoFlowArc) => {
      setSelection({ kind: 'flow', id: arc.id });
      onSelectFlow?.(arc.original, arc.originHub, arc.destinationHub);
    },
    [onSelectFlow]
  );

  const handleSelectHub = useCallback((hub: ComputedGeoHub) => {
    setSelection({ kind: 'hub', id: hub.id });
  }, []);

  const handleFlowKeyDown = useCallback(
    (arc: ComputedGeoFlowArc) => (event: ReactKeyboardEvent<SVGPathElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectFlow(arc);
      } else if (event.key === 'Escape') {
        handleClearFocus();
      }
    },
    [handleClearFocus, handleSelectFlow]
  );

  const handleHubKeyDown = useCallback(
    (hub: ComputedGeoHub) => (event: ReactKeyboardEvent<SVGCircleElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectHub(hub);
      } else if (event.key === 'Escape') {
        handleClearFocus();
      }
    },
    [handleClearFocus, handleSelectHub]
  );

  const merged = mergeProps({
    themeTarget: themeProps('geo-flow-arc-map', {
      empty: isEmpty,
      selection: activeFlow ? 'flow' : activeHub ? 'hub' : undefined,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('geo-flow-arc-map', 'header');
  const svgClass = stableClassName('geo-flow-arc-map', 'svg');
  const readoutClass = stableClassName('geo-flow-arc-map', 'readout');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {title}
        </h4>

        {!isEmpty ? (
          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
            <span
              data-testid="geo-flow-summary-pill"
              className="prism-crystal inline-flex items-center px-3 py-1 rounded-full font-medium"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {`${geometry.hubs.length} hubs · ${geometry.flows.length} routes · ${formatValue(geometry.totalVolume, valueUnit)}`}
            </span>

            {hasActiveSelection ? (
              <button
                type="button"
                data-testid="geo-flow-clear-focus"
                onClick={handleClearFocus}
                className="prism-crystal prism-focus-ring inline-flex items-center px-2.5 py-1 rounded-full font-semibold cursor-pointer transition-opacity hover:opacity-90"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                Clear Focus
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="geo-flow-arc-map-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          Provide at least two valid geographic hubs and one positive flow route to render arcs.
        </div>
      ) : (
        <>
          <div className="prism-well rounded-2xl p-2 overflow-hidden">
            <svg
              role="img"
              aria-label={`${title} geospatial arc map with ${geometry.hubs.length} hubs and ${geometry.flows.length} routes`}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ height: `${clampedHeight}px` }}
              className={cx(svgClass, 'w-full block')}
            >
              {/* Equirectangular Graticule Grid */}
              <g data-role="geo-flow-graticule" pointerEvents="none">
                {LATITUDE_LINES.map((line) => (
                  <line
                    key={line.id}
                    x1={0}
                    y1={line.coord}
                    x2={SVG_WIDTH}
                    y2={line.coord}
                    stroke="var(--prism-divider)"
                    strokeWidth={line.isPrimaryAxis ? 1 : 0.75}
                    strokeDasharray={line.isPrimaryAxis ? '5 3' : '2 4'}
                    data-role="geo-flow-lat-line"
                  />
                ))}
                {LONGITUDE_LINES.map((line) => (
                  <line
                    key={line.id}
                    x1={line.coord}
                    y1={0}
                    x2={line.coord}
                    y2={SVG_HEIGHT}
                    stroke="var(--prism-divider)"
                    strokeWidth={line.isPrimaryAxis ? 1 : 0.75}
                    strokeDasharray={line.isPrimaryAxis ? '5 3' : '2 4'}
                    data-role="geo-flow-lng-line"
                  />
                ))}
              </g>

              {/* Stylized Continental Landmasses */}
              <g data-role="geo-flow-landmasses" pointerEvents="none">
                {CONTINENT_PATHS.map((landmass) => (
                  <path
                    key={landmass.id}
                    d={landmass.d}
                    fill="var(--prism-text-secondary)"
                    fillOpacity={0.12}
                    stroke="var(--prism-divider)"
                    strokeWidth={0.9}
                    strokeLinejoin="round"
                    data-role="geo-flow-landmass"
                  />
                ))}
              </g>

              {/* Curved Quadratic-Bezier Flow Arcs & Midpoint Directional Arrows */}
              <g data-role="geo-flow-arcs">
                {geometry.flows.map((arc) => {
                  const isSelectedFlow = activeFlow !== null && activeFlow.id === arc.id;
                  const isIncidentToHub =
                    activeHub !== null &&
                    (arc.origin === activeHub.id || arc.destination === activeHub.id);
                  const isHighlighted = isSelectedFlow || isIncidentToHub;
                  const arcOpacity = !hasActiveSelection ? 0.72 : isHighlighted ? 0.95 : 0.16;
                  const flowAriaLabel = `${arc.originHub.label} → ${arc.destinationHub.label} · ${formatValue(arc.volume, valueUnit)}${arc.label ? ` (${arc.label})` : ''}`;

                  return (
                    <g key={arc.id}>
                      <path
                        d={arc.pathD}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth={arc.strokeWidth}
                        strokeLinecap="round"
                        opacity={arcOpacity}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelectedFlow}
                        aria-label={flowAriaLabel}
                        data-role="geo-flow-arc"
                        data-flow-id={arc.id}
                        data-origin={arc.origin}
                        data-destination={arc.destination}
                        data-tone={arc.tone}
                        data-highlighted={isHighlighted ? 'true' : 'false'}
                        data-selected={isSelectedFlow ? 'true' : 'false'}
                        className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                        onClick={() => handleSelectFlow(arc)}
                        onKeyDown={handleFlowKeyDown(arc)}
                      />
                      <polygon
                        points="-4.5,-3 4.5,0 -4.5,3 -2.2,0"
                        transform={`translate(${arc.midX} ${arc.midY}) rotate(${arc.midAngleDeg})`}
                        fill={arc.color}
                        opacity={arcOpacity}
                        pointerEvents="none"
                        data-role="geo-flow-arrow"
                        data-flow-id={arc.id}
                      />
                    </g>
                  );
                })}
              </g>

              {/* Interactive Hub Nodes */}
              <g data-role="geo-flow-hubs">
                {geometry.hubs.map((hub) => {
                  const isSelectedHub = activeHub !== null && activeHub.id === hub.id;
                  const isFlowEndpoint =
                    activeFlow !== null &&
                    (activeFlow.origin === hub.id || activeFlow.destination === hub.id);
                  const isConnectedNeighbor =
                    activeHubNeighbors !== null && activeHubNeighbors.has(hub.id);
                  const hubOpacity = !hasActiveSelection
                    ? 0.92
                    : isSelectedHub || isFlowEndpoint
                      ? 1
                      : isConnectedNeighbor
                        ? 0.9
                        : 0.32;
                  const haloOpacity = !hasActiveSelection
                    ? 0.24
                    : isSelectedHub || isFlowEndpoint
                      ? 0.45
                      : isConnectedNeighbor
                        ? 0.28
                        : 0.08;

                  return (
                    <g key={hub.id}>
                      <circle
                        cx={hub.x}
                        cy={hub.y}
                        r={roundCoord(hub.radius + 4)}
                        fill={hub.color}
                        fillOpacity={haloOpacity}
                        pointerEvents="none"
                      />
                      <circle
                        cx={hub.x}
                        cy={hub.y}
                        r={hub.radius}
                        fill={hub.color}
                        opacity={hubOpacity}
                        stroke="var(--prism-text-primary)"
                        strokeWidth={isSelectedHub || isFlowEndpoint ? 1.75 : 0.9}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelectedHub}
                        aria-label={`${hub.label} hub: outbound ${formatValue(hub.outbound, valueUnit)}, inbound ${formatValue(hub.inbound, valueUnit)}`}
                        data-role="geo-flow-hub"
                        data-hub-id={hub.id}
                        data-tone={hub.tone}
                        data-selected={isSelectedHub ? 'true' : 'false'}
                        className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                        onClick={() => handleSelectHub(hub)}
                        onKeyDown={handleHubKeyDown(hub)}
                      />
                      <text
                        x={hub.labelX}
                        y={hub.labelY}
                        textAnchor={hub.labelAnchor}
                        fill="var(--prism-text-primary)"
                        opacity={hubOpacity}
                        pointerEvents="none"
                        className="text-[10px] font-medium"
                      >
                        {hub.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <div
            data-testid="geo-flow-arc-map-readout"
            aria-live="polite"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums'
            )}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {activeFlow ? (
              <>
                <div className="inline-flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeFlow.color }}
                  />
                  <span className="font-semibold">
                    {`${activeFlow.originHub.label} → ${activeFlow.destinationHub.label} · ${formatValue(activeFlow.volume, valueUnit)}`}
                  </span>
                  {activeFlow.label ? (
                    <span
                      data-testid="geo-flow-readout-label"
                      className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      {activeFlow.label}
                    </span>
                  ) : null}
                </div>
                <span
                  data-testid="geo-flow-share-badge"
                  className="prism-emerald inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                >
                  {`${formatNumeric((activeFlow.volume / geometry.totalVolume) * 100)}% share`}
                </span>
              </>
            ) : activeHub ? (
              <>
                <div className="inline-flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeHub.color }}
                  />
                  <span className="font-semibold">{activeHub.label}</span>
                  <span
                    className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-mono"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    {formatCoordinates(activeHub.lat, activeHub.lng)}
                  </span>
                </div>
                <div className="inline-flex flex-wrap items-center gap-2 font-mono">
                  <span
                    data-testid="geo-flow-hub-outbound"
                    className="prism-emerald inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  >
                    {`Outbound: ${formatValue(activeHub.outbound, valueUnit)}`}
                  </span>
                  <span
                    data-testid="geo-flow-hub-inbound"
                    className="prism-crystal inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    {`Inbound: ${formatValue(activeHub.inbound, valueUnit)}`}
                  </span>
                </div>
              </>
            ) : (
              <span style={{ color: 'var(--prism-text-secondary)' }}>
                Select any flow arc or hub node to inspect route volume and hub throughput.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

GeoFlowArcMap.displayName = 'GeoFlowArcMap';
