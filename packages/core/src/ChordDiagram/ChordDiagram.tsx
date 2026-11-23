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
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ChordTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface ChordEntity {
  /** Stable unique identifier referenced by `ChordFlow.source` and `ChordFlow.target`. */
  id: string;
  /** Human-readable entity label rendered in legend pills, aria labels, and telemetry. */
  label: string;
  /** Optional semantic optical tone token used for the entity arc and outbound chords. */
  tone?: ChordTone;
}

export interface ChordFlow {
  /** Identifier of the originating `ChordEntity`. */
  source: string;
  /** Identifier of the receiving `ChordEntity`. */
  target: string;
  /** Positive finite flow magnitude; non-positive, non-finite, or dangling flows are filtered out. */
  value: number;
}

export interface ChordDiagramProps extends BaseProps<HTMLDivElement> {
  /** Ordered entity nodes arranged along the circular chord perimeter (requires at least 2 unique entities). */
  entities: ChordEntity[];
  /** Directed flow records connecting entities via proportional quadratic-bezier SVG chords. */
  flows: ChordFlow[];
  /** Chart card heading linked to the region and SVG diagram (defaults to 'Bi-Directional Chord Flows'). */
  title?: string;
  /** Square SVG viewport dimension in pixels (defaults to 280, clamped to 180..420). */
  size?: number;
  /** Optional unit suffix appended to outbound, inbound, and total flow readouts. */
  valueUnit?: string;
  /** Callback fired when an entity arc or legend pill is selected (not fired when clearing focus). */
  onSelectEntity?: (entity: ChordEntity, inbound: number, outbound: number) => void;
}

interface EntityAccumulator {
  id: string;
  label: string;
  tone: ChordTone;
  color: string;
  original: ChordEntity;
  outbound: number;
  inbound: number;
}

interface ComputedChordEntity {
  id: string;
  key: string;
  label: string;
  tone: ChordTone;
  color: string;
  outbound: number;
  inbound: number;
  totalVolume: number;
  startAngle: number;
  endAngle: number;
  arcSpan: number;
  pathD: string;
  original: ChordEntity;
}

interface ComputedChordRibbon {
  key: string;
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  value: number;
  color: string;
  pathD: string;
}

interface Point2D {
  x: number;
  y: number;
}

const FULL_CIRCLE = Math.PI * 2;
const MIN_VISIBLE_RIBBON_RAD = 0.012;
const DIMMED_CHORD_OPACITY = 0.14;

const TONE_TOKEN_MAP: Record<ChordTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  rose: 'var(--prism-error-main)',
};

const TONE_CYCLE: ReadonlyArray<ChordTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'rose',
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

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleRadians: number
): Point2D {
  return {
    x: roundCoord(centerX + radius * Math.cos(angleRadians)),
    y: roundCoord(centerY + radius * Math.sin(angleRadians)),
  };
}

function buildEntityArcPath(
  center: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  const largeArcFlag = sweep > Math.PI ? 1 : 0;
  const rOut = roundCoord(outerRadius);
  const rIn = roundCoord(innerRadius);

  const outerStart = polarToCartesian(center, center, outerRadius, startAngle);
  const outerEnd = polarToCartesian(center, center, outerRadius, endAngle);
  const innerEnd = polarToCartesian(center, center, innerRadius, endAngle);
  const innerStart = polarToCartesian(center, center, innerRadius, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOut} ${rOut} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rIn} ${rIn} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function clampVisibleSubArc(
  a0: number,
  a1: number,
  minAngle: number,
  maxAngle: number
): { start: number; end: number } {
  const minVisible = Math.min(MIN_VISIBLE_RIBBON_RAD, maxAngle - minAngle);
  if (a1 - a0 >= minVisible) {
    return { start: a0, end: a1 };
  }
  const mid = (a0 + a1) / 2;
  const start = Math.max(minAngle, Math.min(maxAngle - minVisible, mid - minVisible / 2));
  return { start, end: start + minVisible };
}

function buildChordRibbonPath(
  center: number,
  radius: number,
  sa0: number,
  sa1: number,
  ta0: number,
  ta1: number
): string {
  const cxR = roundCoord(center);
  const r = roundCoord(radius);
  const ps0 = polarToCartesian(center, center, radius, sa0);
  const ps1 = polarToCartesian(center, center, radius, sa1);
  const pt0 = polarToCartesian(center, center, radius, ta0);
  const pt1 = polarToCartesian(center, center, radius, ta1);

  return [
    `M ${ps0.x} ${ps0.y}`,
    `A ${r} ${r} 0 0 1 ${ps1.x} ${ps1.y}`,
    `Q ${cxR},${cxR} ${pt0.x} ${pt0.y}`,
    `A ${r} ${r} 0 0 1 ${pt1.x} ${pt1.y}`,
    `Q ${cxR},${cxR} ${ps0.x} ${ps0.y}`,
    'Z',
  ].join(' ');
}

function ChordDiagramInner({
  entities,
  flows,
  title = 'Bi-Directional Chord Flows',
  size = 280,
  valueUnit,
  onSelectEntity,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ChordDiagramProps) {
  const headingId = useId();
  const override = useComponentOverride('ChordDiagram');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const clampedSize = clampNumber(size, 180, 420, 280);

  const geometry = useMemo(() => {
    const center = clampedSize / 2;
    const outerRadius = roundCoord(center - 14);
    const arcThickness = Math.max(10, Math.min(16, roundCoord(outerRadius * 0.13)));
    const innerRadius = roundCoord(outerRadius - arcThickness);
    const chordRadius = roundCoord(innerRadius - 2);

    const entityMap = new Map<string, EntityAccumulator>();
    const orderedEntities: EntityAccumulator[] = [];

    for (const entity of entities) {
      if (entityMap.has(entity.id)) {
        continue;
      }
      const resolvedTone: ChordTone =
        entity.tone ?? (TONE_CYCLE[orderedEntities.length % TONE_CYCLE.length] as ChordTone);
      const accumulator: EntityAccumulator = {
        id: entity.id,
        label: entity.label,
        tone: resolvedTone,
        color: TONE_TOKEN_MAP[resolvedTone],
        original: entity,
        outbound: 0,
        inbound: 0,
      };
      entityMap.set(entity.id, accumulator);
      orderedEntities.push(accumulator);
    }

    const validFlows: ChordFlow[] = [];
    let totalFlowVolume = 0;

    for (const flow of flows) {
      if (!Number.isFinite(flow.value) || flow.value <= 0) {
        continue;
      }
      const src = entityMap.get(flow.source);
      const tgt = entityMap.get(flow.target);
      if (!src || !tgt) {
        continue;
      }
      src.outbound += flow.value;
      tgt.inbound += flow.value;
      validFlows.push(flow);
      totalFlowVolume += flow.value;
    }

    if (orderedEntities.length < 2 || validFlows.length === 0) {
      return {
        center,
        chordRadius,
        totalFlowVolume: 0,
        computedEntities: [] as ComputedChordEntity[],
        computedEntityMap: new Map<string, ComputedChordEntity>(),
        chords: [] as ComputedChordRibbon[],
      };
    }

    const entityCount = orderedEntities.length;
    const gapAngle = Math.min(0.06, (FULL_CIRCLE * 0.25) / entityCount);
    const totalArcAngle = FULL_CIRCLE - gapAngle * entityCount;

    let totalWeight = 0;
    for (const item of orderedEntities) {
      totalWeight += Math.max(1, item.outbound + item.inbound);
    }

    const computedEntities: ComputedChordEntity[] = [];
    const computedEntityMap = new Map<string, ComputedChordEntity>();
    const angleCursorMap = new Map<string, number>();

    let cursor = -Math.PI / 2;
    for (const item of orderedEntities) {
      const weight = Math.max(1, item.outbound + item.inbound);
      const arcSpan = (weight / totalWeight) * totalArcAngle;
      const startAngle = cursor;
      const endAngle = cursor + arcSpan;
      cursor = endAngle + gapAngle;

      const computed: ComputedChordEntity = {
        id: item.id,
        key: `chord-entity-${item.id}`,
        label: item.label,
        tone: item.tone,
        color: item.color,
        outbound: item.outbound,
        inbound: item.inbound,
        totalVolume: item.outbound + item.inbound,
        startAngle,
        endAngle,
        arcSpan,
        pathD: buildEntityArcPath(center, innerRadius, outerRadius, startAngle, endAngle),
        original: item.original,
      };
      computedEntities.push(computed);
      computedEntityMap.set(item.id, computed);
      angleCursorMap.set(item.id, startAngle);
    }

    const pairOccurrenceMap = new Map<string, number>();
    const chords: ComputedChordRibbon[] = [];

    for (const flow of validFlows) {
      const srcEntity = computedEntityMap.get(flow.source)!;
      const tgtEntity = computedEntityMap.get(flow.target)!;

      const srcSubSpan = (flow.value / srcEntity.totalVolume) * srcEntity.arcSpan;
      const rawS0 = angleCursorMap.get(srcEntity.id)!;
      const rawS1 = rawS0 + srcSubSpan;
      angleCursorMap.set(srcEntity.id, rawS1);

      const tgtSubSpan = (flow.value / tgtEntity.totalVolume) * tgtEntity.arcSpan;
      const rawT0 = angleCursorMap.get(tgtEntity.id)!;
      const rawT1 = rawT0 + tgtSubSpan;
      angleCursorMap.set(tgtEntity.id, rawT1);

      const isSelfLoop = flow.source === flow.target;
      let sa0: number;
      let sa1: number;
      let ta0: number;
      let ta1: number;

      if (isSelfLoop) {
        const selfPad = Math.min(0.008, srcSubSpan * 0.15);
        sa0 = rawS0;
        sa1 = rawS1 - selfPad;
        ta0 = rawT0 + selfPad;
        ta1 = rawT1;
      } else {
        const srcClamped = clampVisibleSubArc(rawS0, rawS1, srcEntity.startAngle, srcEntity.endAngle);
        const tgtClamped = clampVisibleSubArc(rawT0, rawT1, tgtEntity.startAngle, tgtEntity.endAngle);
        sa0 = srcClamped.start;
        sa1 = srcClamped.end;
        ta0 = tgtClamped.start;
        ta1 = tgtClamped.end;
      }

      const pairSig = `${flow.source}->${flow.target}`;
      const occurrence = (pairOccurrenceMap.get(pairSig) ?? 0) + 1;
      pairOccurrenceMap.set(pairSig, occurrence);

      chords.push({
        key: `chord-ribbon-${pairSig}-${occurrence}`,
        sourceId: srcEntity.id,
        targetId: tgtEntity.id,
        sourceLabel: srcEntity.label,
        targetLabel: tgtEntity.label,
        value: flow.value,
        color: srcEntity.color,
        pathD: buildChordRibbonPath(center, chordRadius, sa0, sa1, ta0, ta1),
      });
    }

    return {
      center,
      chordRadius,
      totalFlowVolume,
      computedEntities,
      computedEntityMap,
      chords,
    };
  }, [entities, flows, clampedSize]);

  const isEmpty = geometry.computedEntities.length < 2 || geometry.chords.length === 0;

  const activeEntity = useMemo(() => {
    if (selectedEntityId === null) {
      return null;
    }
    return geometry.computedEntityMap.get(selectedEntityId) ?? null;
  }, [geometry.computedEntityMap, selectedEntityId]);

  const { connectedEntityIds, connectedChordCount } = useMemo(() => {
    const ids = new Set<string>();
    if (!activeEntity) {
      return { connectedEntityIds: ids, connectedChordCount: 0 };
    }
    ids.add(activeEntity.id);
    let count = 0;
    for (const chord of geometry.chords) {
      if (chord.sourceId === activeEntity.id || chord.targetId === activeEntity.id) {
        ids.add(chord.sourceId);
        ids.add(chord.targetId);
        count += 1;
      }
    }
    return { connectedEntityIds: ids, connectedChordCount: count };
  }, [activeEntity, geometry.chords]);

  const handleToggleEntity = useCallback(
    (entity: ComputedChordEntity) => {
      if (activeEntity?.id === entity.id) {
        setSelectedEntityId(null);
        return;
      }
      setSelectedEntityId(entity.id);
      onSelectEntity?.(entity.original, entity.inbound, entity.outbound);
    },
    [activeEntity, onSelectEntity]
  );

  const handleEntityKeyDown = useCallback(
    (entity: ComputedChordEntity) =>
      (event: ReactKeyboardEvent<SVGPathElement | HTMLButtonElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleToggleEntity(entity);
        }
      },
    [handleToggleEntity]
  );

  const merged = mergeProps({
    themeTarget: themeProps('chord-diagram', {
      empty: isEmpty,
      focused: activeEntity !== null,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('chord-diagram', 'header');
  const svgClass = stableClassName('chord-diagram', 'svg');
  const legendClass = stableClassName('chord-diagram', 'legend');
  const telemetryClass = stableClassName('chord-diagram', 'telemetry');

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

        {!isEmpty && activeEntity ? (
          <button
            type="button"
            onClick={() => setSelectedEntityId(null)}
            className="prism-focus-ring prism-crystal px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-100"
            style={STYLE_TEXT_PRIMARY}
          >
            Clear Focus
          </button>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="chord-diagram-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          At least two entities and one positive flow are required to render chords.
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="shrink-0 flex items-center justify-center">
              <svg
                role="img"
                aria-label={
                  activeEntity
                    ? `${title} focused on ${activeEntity.label}`
                    : `${title} chord diagram`
                }
                viewBox={`0 0 ${clampedSize} ${clampedSize}`}
                width={clampedSize}
                height={clampedSize}
                style={{ width: `${clampedSize}px`, height: `${clampedSize}px` }}
                className={cx(svgClass, 'block max-w-full overflow-visible')}
              >
                <circle
                  cx={geometry.center}
                  cy={geometry.center}
                  r={geometry.chordRadius}
                  fill="none"
                  stroke="var(--prism-divider)"
                  strokeWidth={0.75}
                  strokeOpacity={0.45}
                  pointerEvents="none"
                />

                <g data-testid="chord-ribbons">
                  {geometry.chords.map((chord) => {
                    const isConnected =
                      activeEntity !== null &&
                      (chord.sourceId === activeEntity.id || chord.targetId === activeEntity.id);
                    const isDimmed = activeEntity !== null && !isConnected;
                    const chordOpacity = isDimmed ? DIMMED_CHORD_OPACITY : 1;
                    const chordFillOpacity = isConnected ? 0.76 : isDimmed ? 1 : 0.44;
                    const strokeOpacity = isConnected ? 0.55 : isDimmed ? 0.14 : 0.24;

                    return (
                      <path
                        key={chord.key}
                        d={chord.pathD}
                        fill={chord.color}
                        fillOpacity={chordFillOpacity}
                        opacity={chordOpacity}
                        stroke={chord.color}
                        strokeOpacity={strokeOpacity}
                        strokeWidth={isConnected ? 1 : 0.6}
                        data-chord-source={chord.sourceId}
                        data-chord-target={chord.targetId}
                        data-chord-value={String(chord.value)}
                        data-highlighted={isConnected ? 'true' : 'false'}
                        data-dimmed={isDimmed ? 'true' : 'false'}
                        className="transition-opacity duration-150"
                      >
                        <title>
                          {`${chord.sourceLabel} → ${chord.targetLabel}: ${formatMetric(chord.value, valueUnit)}`}
                        </title>
                      </path>
                    );
                  })}
                </g>

                <g data-testid="chord-arcs">
                  {geometry.computedEntities.map((entity) => {
                    const isSelected = activeEntity?.id === entity.id;
                    const isRelated =
                      activeEntity === null || connectedEntityIds.has(entity.id);
                    const arcFillOpacity = isSelected ? 1 : isRelated ? 0.9 : 0.35;

                    return (
                      <path
                        key={entity.key}
                        d={entity.pathD}
                        fill={entity.color}
                        fillOpacity={arcFillOpacity}
                        stroke={isSelected ? 'var(--prism-text-primary)' : 'var(--prism-divider)'}
                        strokeWidth={isSelected ? 2 : 1}
                        strokeLinejoin="round"
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        aria-label={`${entity.label}: Outbound ${formatMetric(entity.outbound, valueUnit)}, Inbound ${formatMetric(entity.inbound, valueUnit)}`}
                        data-entity-id={entity.id}
                        data-selected={isSelected ? 'true' : 'false'}
                        className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                        onClick={() => handleToggleEntity(entity)}
                        onKeyDown={handleEntityKeyDown(entity)}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>

            <div
              role="group"
              aria-label="Entity legend"
              className={cx(legendClass, 'w-full flex-1 flex flex-wrap sm:flex-col gap-2')}
            >
              {geometry.computedEntities.map((entity) => {
                const isSelected = activeEntity?.id === entity.id;
                return (
                  <button
                    key={`${entity.key}-pill`}
                    type="button"
                    aria-pressed={isSelected}
                    data-entity-id={entity.id}
                    onClick={() => handleToggleEntity(entity)}
                    onKeyDown={handleEntityKeyDown(entity)}
                    className={cx(
                      'prism-focus-ring flex items-center justify-between gap-3 px-3 py-2 rounded-full sm:rounded-xl text-xs cursor-pointer transition-colors text-left',
                      isSelected ? 'prism-well font-semibold' : 'prism-crystal'
                    )}
                    style={STYLE_TEXT_PRIMARY}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden="true"
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entity.color }}
                      />
                      <span className="truncate">{entity.label}</span>
                    </span>

                    <span
                      className="shrink-0 font-mono tabular-nums text-[11px]"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {formatMetric(entity.totalVolume, valueUnit)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            data-testid="chord-diagram-telemetry"
            aria-live="polite"
            className={cx(
              telemetryClass,
              'prism-well rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {activeEntity ? (
              <>
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeEntity.color }}
                  />
                  <span className="font-medium truncate">
                    {`${activeEntity.label} · Outbound: ${formatMetric(activeEntity.outbound, valueUnit)} · Inbound: ${formatMetric(activeEntity.inbound, valueUnit)}`}
                  </span>
                </span>
                <span
                  className="shrink-0 font-mono font-medium"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`${connectedChordCount} ${connectedChordCount === 1 ? 'flow' : 'flows'}`}
                </span>
              </>
            ) : (
              <>
                <span style={STYLE_TEXT_SECONDARY}>
                  Select any entity arc or legend pill to inspect bi-directional flows.
                </span>
                <span
                  className="shrink-0 font-mono font-medium"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`Total Flow: ${formatMetric(geometry.totalFlowVolume, valueUnit)}`}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const ChordDiagram = memo(ChordDiagramInner);
ChordDiagram.displayName = 'ChordDiagram';
