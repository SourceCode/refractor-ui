'use client';

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type ParallelTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'info';

export interface ParallelAxisSpec {
  /** Stable unique identifier for this vertical dimension axis. */
  id: string;
  /** Human-readable axis heading shown above the rail and in the record inspector. */
  label: string;
  /** Optional unit suffix displayed alongside axis headers and inspector values (e.g. '%', 'ms', 'GB'). */
  unit?: string;
  /** Optional explicit lower bound for axis normalization (inferred from finite values when omitted). */
  min?: number;
  /** Optional explicit upper bound for axis normalization (inferred from finite values when omitted). */
  max?: number;
}

export interface ParallelRecord {
  /** Stable unique identifier for this multivariate record trajectory. */
  id: string;
  /** Human-readable record name displayed in accessible labels and the live inspector. */
  label: string;
  /** Optional category group enabling interactive trajectory filter pills. */
  group?: string;
  /** Optional semantic optical tone mapped strictly to `--prism-*` CSS tokens. */
  tone?: ParallelTone;
  /** Ordered numeric values aligned by index to `axes` (prototype-safe positional indexing). */
  values: ReadonlyArray<number>;
}

export interface ParallelCoordinatesPlotProps extends BaseProps<HTMLDivElement> {
  /** Dimension specifications defining vertical parallel axes (defaults to 5 ML model benchmark axes). */
  axes?: ReadonlyArray<ParallelAxisSpec>;
  /** Multivariate records plotted as normalized polylines across `axes` (defaults to 7 ML models). */
  records?: ReadonlyArray<ParallelRecord>;
  /** Chart card heading linked to the region and SVG graphic (defaults to 'Parallel Coordinates Analysis'). */
  title?: string;
  /** Callback invoked when a user clicks, activates, or arrow-navigates to a record trajectory. */
  onSelectRecord?: (record: ParallelRecord) => void;
}

interface ComputedAxis {
  key: string;
  index: number;
  id: string;
  label: string;
  headerText: string;
  unit?: string;
  domainMin: number;
  domainMax: number;
  midValue: number;
  x: number;
}

interface ComputedVertex {
  key: string;
  axisId: string;
  axisLabel: string;
  unit?: string;
  value: number | null;
  x: number;
  y: number;
}

interface ComputedRecord {
  key: string;
  id: string;
  label: string;
  group?: string;
  tone: ParallelTone;
  color: string;
  vertices: ComputedVertex[];
  polylinePoints: string;
  ariaSummary: string;
  original: ParallelRecord;
}

interface ComputedGroup {
  key: string;
  name: string;
  count: number;
  tone: ParallelTone;
  color: string;
}

const SVG_WIDTH = 480;
const SVG_HEIGHT = 230;
const PAD_LEFT = 46;
const PAD_RIGHT = 46;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const AXIS_LABEL_Y = 16;
const MAX_TICK_Y = 30;
const AXIS_TOP = 38;
const AXIS_BOTTOM = 196;
const AXIS_MID = (AXIS_TOP + AXIS_BOTTOM) / 2;
const PLOT_HEIGHT = AXIS_BOTTOM - AXIS_TOP;
const MIN_TICK_Y = 214;

export const DEFAULT_PARALLEL_AXES: ReadonlyArray<ParallelAxisSpec> = [
  { id: 'accuracy', label: 'Accuracy', unit: '%', min: 75, max: 100 },
  { id: 'latency', label: 'Latency', unit: 'ms', min: 10, max: 140 },
  { id: 'vram', label: 'VRAM', unit: 'GB', min: 4, max: 80 },
  { id: 'throughput', label: 'Throughput', min: 20, max: 320 },
  { id: 'cost', label: 'Cost', unit: '$/1M', min: 0.1, max: 15 },
];

export const DEFAULT_PARALLEL_RECORDS: ReadonlyArray<ParallelRecord> = [
  {
    id: 'prism-ultra',
    label: 'Prism Ultra 70B',
    group: 'Frontier',
    tone: 'primary',
    values: [96.4, 92, 72, 68, 12.5],
  },
  {
    id: 'prism-pro',
    label: 'Prism Pro 32B',
    group: 'Frontier',
    tone: 'secondary',
    values: [93.1, 58, 40, 124, 5.2],
  },
  {
    id: 'nova-dense',
    label: 'Nova Dense 27B',
    group: 'Balanced',
    tone: 'info',
    values: [90.8, 46, 32, 152, 3.4],
  },
  {
    id: 'optic-moe',
    label: 'Optic MoE 8x7B',
    group: 'Balanced',
    tone: 'emerald',
    values: [89.5, 34, 28, 210, 1.8],
  },
  {
    id: 'vertex-coder',
    label: 'Vertex Coder 14B',
    group: 'Balanced',
    tone: 'primary',
    values: [91.4, 41, 20, 178, 2.1],
  },
  {
    id: 'quartz-fast',
    label: 'Quartz Fast 8B',
    group: 'Edge',
    tone: 'amber',
    values: [84.2, 18, 12, 268, 0.5],
  },
  {
    id: 'lumen-mini',
    label: 'Lumen Mini 3B',
    group: 'Edge',
    tone: 'emerald',
    values: [79.6, 12, 6, 310, 0.2],
  },
];

function getDefaultTone(index: number): ParallelTone {
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
      return 'info';
  }
}

function getToneColor(tone: ParallelTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'secondary':
      return 'var(--prism-secondary-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'info':
      return 'var(--prism-info-main)';
  }
}

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

function formatValueWithUnit(value: number, unit?: string): string {
  const num = formatNumeric(value);
  return unit ? `${num} ${unit}` : num;
}

function formatAxisHeader(axis: ParallelAxisSpec): string {
  const trimmedUnit = axis.unit?.trim();
  if (!trimmedUnit) {
    return axis.label;
  }
  if (axis.label.endsWith(trimmedUnit)) {
    return axis.label;
  }
  return `${axis.label} ${trimmedUnit}`;
}

function truncateLabel(text: string, maxChars: number): string {
  const limit = Math.max(4, maxChars);
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit - 1)}…`;
}

const headerClass = /*#__PURE__*/ stableClassName('parallel-coordinates-plot', 'header');
const filtersClass = /*#__PURE__*/ stableClassName('parallel-coordinates-plot', 'filters');
const wellClass = /*#__PURE__*/ stableClassName('parallel-coordinates-plot', 'well');
const svgClass = /*#__PURE__*/ stableClassName('parallel-coordinates-plot', 'svg');
const inspectorClass = /*#__PURE__*/ stableClassName('parallel-coordinates-plot', 'inspector');

function ParallelCoordinatesPlotInner({
  axes,
  records,
  title = 'Parallel Coordinates Analysis',
  onSelectRecord,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ParallelCoordinatesPlotProps) {
  const headingId = useId();
  const override = useComponentOverride('ParallelCoordinatesPlot');
  const recordRefs = useRef<Map<string, SVGGElement>>(new Map());

  const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);
  const [focusedRecordKey, setFocusedRecordKey] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const sourceAxes = axes ?? DEFAULT_PARALLEL_AXES;
  const sourceRecords = records ?? DEFAULT_PARALLEL_RECORDS;

  const { computedAxes, computedRecords, groups, axisMaxChars } = useMemo(() => {
    if (sourceAxes.length < 2 || sourceRecords.length === 0) {
      return {
        computedAxes: [] as ComputedAxis[],
        computedRecords: [] as ComputedRecord[],
        groups: [] as ComputedGroup[],
        axisMaxChars: 14,
      };
    }

    const validSourceRecords: ParallelRecord[] = [];
    for (const record of sourceRecords) {
      let hasFinite = false;
      for (let aIdx = 0; aIdx < sourceAxes.length; aIdx += 1) {
        const raw = record.values[aIdx];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          hasFinite = true;
          break;
        }
      }
      if (hasFinite) {
        validSourceRecords.push(record);
      }
    }

    if (validSourceRecords.length === 0) {
      return {
        computedAxes: [] as ComputedAxis[],
        computedRecords: [] as ComputedRecord[],
        groups: [] as ComputedGroup[],
        axisMaxChars: 14,
      };
    }

    const axisCount = sourceAxes.length;
    const spacing = PLOT_WIDTH / (axisCount - 1);
    const maxChars = Math.max(6, Math.floor(spacing / 5.8));

    const axisList: ComputedAxis[] = sourceAxes.map((axis, aIdx) => {
      let obsMin = Number.POSITIVE_INFINITY;
      let obsMax = Number.NEGATIVE_INFINITY;
      let hasObs = false;

      for (const record of validSourceRecords) {
        const raw = record.values[aIdx];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          const val = normalizeZero(raw);
          if (val < obsMin) obsMin = val;
          if (val > obsMax) obsMax = val;
          hasObs = true;
        }
      }

      const explicitMin =
        axis.min !== undefined && Number.isFinite(axis.min) ? normalizeZero(axis.min) : null;
      const explicitMax =
        axis.max !== undefined && Number.isFinite(axis.max) ? normalizeZero(axis.max) : null;

      let domainMin = explicitMin ?? (hasObs ? obsMin : 0);
      let domainMax = explicitMax ?? (hasObs ? obsMax : 1);

      if (domainMin > domainMax) {
        const swapped = domainMin;
        domainMin = domainMax;
        domainMax = swapped;
      }

      if (domainMin === domainMax) {
        const pad = domainMin === 0 ? 1 : Math.abs(domainMin) * 0.1;
        domainMin -= pad;
        domainMax += pad;
      }

      domainMin = normalizeZero(domainMin);
      domainMax = normalizeZero(domainMax);

      return {
        key: `axis-${axis.id}-${aIdx}`,
        index: aIdx,
        id: axis.id,
        label: axis.label,
        headerText: formatAxisHeader(axis),
        unit: axis.unit?.trim() || undefined,
        domainMin,
        domainMax,
        midValue: normalizeZero((domainMin + domainMax) / 2),
        x: roundCoord(PAD_LEFT + aIdx * spacing),
      };
    });

    const groupMap = new Map<string, ComputedGroup>();

    const recordList: ComputedRecord[] = validSourceRecords.map((record, rIdx) => {
      const recordKey = `record-${record.id}-${rIdx}`;
      const resolvedTone = record.tone ?? getDefaultTone(rIdx);
      const color = getToneColor(resolvedTone);
      const normalizedGroup = record.group?.trim() || undefined;

      if (normalizedGroup) {
        const existing = groupMap.get(normalizedGroup);
        if (existing) {
          existing.count += 1;
        } else {
          groupMap.set(normalizedGroup, {
            key: `group-${normalizedGroup}`,
            name: normalizedGroup,
            count: 1,
            tone: resolvedTone,
            color,
          });
        }
      }

      const vertices: ComputedVertex[] = axisList.map((axis) => {
        const raw = record.values[axis.index];
        const isFiniteVal = typeof raw === 'number' && Number.isFinite(raw);
        if (isFiniteVal) {
          const val = normalizeZero(raw);
          const span = axis.domainMax - axis.domainMin;
          const ratio = clampNumber((val - axis.domainMin) / span, 0, 1, 0.5);
          const y = roundCoord(AXIS_BOTTOM - ratio * PLOT_HEIGHT);
          return {
            key: `${recordKey}::${axis.key}`,
            axisId: axis.id,
            axisLabel: axis.label,
            unit: axis.unit,
            value: val,
            x: axis.x,
            y,
          };
        }

        return {
          key: `${recordKey}::${axis.key}`,
          axisId: axis.id,
          axisLabel: axis.label,
          unit: axis.unit,
          value: null,
          x: axis.x,
          y: AXIS_MID,
        };
      });

      const polylinePoints = vertices.map((v) => `${v.x},${v.y}`).join(' ');
      const dimSummary = vertices
        .map((v) =>
          v.value !== null
            ? `${v.axisLabel}: ${formatValueWithUnit(v.value, v.unit)}`
            : `${v.axisLabel}: missing`
        )
        .join(', ');

      return {
        key: recordKey,
        id: record.id,
        label: record.label,
        group: normalizedGroup,
        tone: resolvedTone,
        color,
        vertices,
        polylinePoints,
        ariaSummary: `${record.label}${normalizedGroup ? ` (${normalizedGroup})` : ''}: ${dimSummary}`,
        original: record,
      };
    });

    return {
      computedAxes: axisList,
      computedRecords: recordList,
      groups: Array.from(groupMap.values()),
      axisMaxChars: maxChars,
    };
  }, [sourceAxes, sourceRecords]);

  const isEmpty = computedAxes.length < 2 || computedRecords.length === 0;

  const resolvedActiveGroup = useMemo(() => {
    if (activeGroup === null) return null;
    return groups.some((g) => g.name === activeGroup) ? activeGroup : null;
  }, [activeGroup, groups]);

  const { filteredRecords, contextRecords } = useMemo(() => {
    if (resolvedActiveGroup === null) {
      return {
        filteredRecords: computedRecords,
        contextRecords: [] as ComputedRecord[],
      };
    }

    const matching: ComputedRecord[] = [];
    const dimmedOut: ComputedRecord[] = [];
    for (const record of computedRecords) {
      if (record.group === resolvedActiveGroup) {
        matching.push(record);
      } else {
        dimmedOut.push(record);
      }
    }
    return {
      filteredRecords: matching,
      contextRecords: dimmedOut,
    };
  }, [computedRecords, resolvedActiveGroup]);

  const selectedRecord = useMemo(() => {
    if (selectedRecordKey === null) return null;
    return filteredRecords.find((record) => record.key === selectedRecordKey) ?? null;
  }, [filteredRecords, selectedRecordKey]);

  const focusedRecord = useMemo(() => {
    if (focusedRecordKey === null) return null;
    return filteredRecords.find((record) => record.key === focusedRecordKey) ?? null;
  }, [filteredRecords, focusedRecordKey]);

  const activeRecord = focusedRecord ?? selectedRecord;

  const registerRecordRef = useCallback((recordKey: string, node: SVGGElement | null) => {
    if (node) {
      recordRefs.current.set(recordKey, node);
    } else {
      recordRefs.current.delete(recordKey);
    }
  }, []);

  const handleSelectRecord = useCallback(
    (record: ComputedRecord) => {
      setSelectedRecordKey(record.key);
      onSelectRecord?.(record.original);
    },
    [onSelectRecord]
  );

  const handleSelectGroup = useCallback((groupName: string | null) => {
    setActiveGroup(groupName);
    setSelectedRecordKey(null);
    setFocusedRecordKey(null);
  }, []);

  const handleFocusRecord = useCallback((recordKey: string) => {
    setFocusedRecordKey(recordKey);
  }, []);

  const handleBlurRecord = useCallback((recordKey: string) => {
    setFocusedRecordKey((prev) => (prev === recordKey ? null : prev));
  }, []);

  const handleRecordKeyDown = useCallback(
    (recordIndex: number, record: ComputedRecord) =>
      (event: ReactKeyboardEvent<SVGGElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectRecord(record);
          return;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          setSelectedRecordKey(null);
          setFocusedRecordKey(null);
          return;
        }

        const count = filteredRecords.length;

        let targetRecord: ComputedRecord | null = null;
        if (event.key === 'ArrowDown') {
          targetRecord = filteredRecords[(recordIndex + 1) % count]!;
        } else if (event.key === 'ArrowUp') {
          targetRecord = filteredRecords[(recordIndex - 1 + count) % count]!;
        }

        if (targetRecord) {
          event.preventDefault();
          recordRefs.current.get(targetRecord.key)?.focus();
          handleSelectRecord(targetRecord);
        }
      },
    [filteredRecords, handleSelectRecord]
  );

  const merged = mergeProps({
    themeTarget: themeProps('parallel-coordinates-plot', {
      empty: isEmpty,
      axesCount: computedAxes.length,
      recordCount: filteredRecords.length,
      activeGroup: resolvedActiveGroup ?? 'all',
      hasSelection: activeRecord !== null,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-4 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const countBadgeText =
    resolvedActiveGroup !== null
      ? `${filteredRecords.length}/${computedRecords.length} records · ${computedAxes.length} axes`
      : `${computedRecords.length} ${computedRecords.length === 1 ? 'record' : 'records'} · ${computedAxes.length} axes`;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight min-w-0 break-words"
          style={STYLE_TEXT_PRIMARY}
        >
          {title}
        </h4>

        {!isEmpty ? (
          <span
            data-testid="parallel-coordinates-count-badge"
            className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium tabular-nums shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {countBadgeText}
          </span>
        ) : null}
      </div>

      {!isEmpty && groups.length > 0 ? (
        <div
          role="group"
          aria-label="Filter trajectories by group"
          data-testid="parallel-coordinates-group-filters"
          className={cx(filtersClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
        >
          <button
            type="button"
            aria-pressed={resolvedActiveGroup === null}
            data-group-filter="all"
            onClick={() => handleSelectGroup(null)}
            className={cx(
              'prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity duration-150',
              resolvedActiveGroup === null ? 'prism-crystal opacity-100' : 'prism-well opacity-70'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <span>All</span>
            <span
              className="font-mono text-[11px] tabular-nums"
              style={STYLE_TEXT_SECONDARY}
            >
              {String(computedRecords.length)}
            </span>
          </button>

          {groups.map((group) => {
            const isGroupSelected = resolvedActiveGroup === group.name;
            const isGroupDimmed = resolvedActiveGroup !== null && !isGroupSelected;

            return (
              <button
                key={group.key}
                type="button"
                aria-pressed={isGroupSelected}
                data-group-filter={group.name}
                data-tone={group.tone}
                onClick={() => handleSelectGroup(group.name)}
                className={cx(
                  'prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity duration-150',
                  isGroupSelected ? 'prism-crystal opacity-100' : 'prism-well',
                  isGroupDimmed ? 'opacity-55' : 'opacity-100'
                )}
                style={STYLE_TEXT_PRIMARY}
              >
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <span>{group.name}</span>
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {String(group.count)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {isEmpty ? (
        <div
          role="status"
          data-testid="parallel-coordinates-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          {sourceAxes.length < 2
            ? 'Provide at least 2 axes to plot parallel coordinates.'
            : 'No records available to plot parallel coordinates.'}
        </div>
      ) : (
        <>
          <div
            className={cx(
              wellClass,
              'prism-well rounded-2xl p-3 w-full max-w-full min-w-0 overflow-hidden'
            )}
          >
            <svg
              role="img"
              aria-label={`${title} parallel coordinates plot across ${computedAxes.length} axes and ${filteredRecords.length} records`}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none block', 'prism-contain-box')}
            >
              <g data-role="axis-rails">
                {computedAxes.map((axis) => {
                  const isLastAxis = axis.index === computedAxes.length - 1;
                  return (
                    <g key={axis.key} data-axis-id={axis.id}>
                      <text
                        x={axis.x}
                        y={AXIS_LABEL_Y}
                        textAnchor="middle"
                        fill="var(--prism-text-primary)"
                        className="text-[10px] font-semibold"
                      >
                        {truncateLabel(axis.headerText, axisMaxChars)}
                      </text>

                      <text
                        x={axis.x}
                        y={MAX_TICK_Y}
                        textAnchor="middle"
                        fill="var(--prism-text-secondary)"
                        data-role="axis-max-tick"
                        className="text-[9px] font-mono tabular-nums"
                      >
                        {formatNumeric(axis.domainMax)}
                      </text>

                      <line
                        data-role="axis-rail"
                        x1={axis.x}
                        y1={AXIS_TOP}
                        x2={axis.x}
                        y2={AXIS_BOTTOM}
                        stroke="var(--prism-divider)"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                      />

                      <line
                        x1={roundCoord(axis.x - 4)}
                        y1={AXIS_TOP}
                        x2={roundCoord(axis.x + 4)}
                        y2={AXIS_TOP}
                        stroke="var(--prism-divider)"
                        strokeWidth={1.25}
                      />

                      <line
                        data-role="axis-mid-tick"
                        x1={roundCoord(axis.x - 3.5)}
                        y1={AXIS_MID}
                        x2={roundCoord(axis.x + 3.5)}
                        y2={AXIS_MID}
                        stroke="var(--prism-divider)"
                        strokeWidth={1}
                      />

                      <text
                        x={isLastAxis ? roundCoord(axis.x - 6) : roundCoord(axis.x + 6)}
                        y={roundCoord(AXIS_MID + 3)}
                        textAnchor={isLastAxis ? 'end' : 'start'}
                        fill="var(--prism-text-secondary)"
                        opacity={0.72}
                        pointerEvents="none"
                        data-role="axis-mid-label"
                        className="text-[8px] font-mono tabular-nums"
                      >
                        {formatNumeric(axis.midValue)}
                      </text>

                      <line
                        x1={roundCoord(axis.x - 4)}
                        y1={AXIS_BOTTOM}
                        x2={roundCoord(axis.x + 4)}
                        y2={AXIS_BOTTOM}
                        stroke="var(--prism-divider)"
                        strokeWidth={1.25}
                      />

                      <text
                        x={axis.x}
                        y={MIN_TICK_Y}
                        textAnchor="middle"
                        fill="var(--prism-text-secondary)"
                        data-role="axis-min-tick"
                        className="text-[9px] font-mono tabular-nums"
                      >
                        {formatNumeric(axis.domainMin)}
                      </text>
                    </g>
                  );
                })}
              </g>

              {contextRecords.length > 0 ? (
                <g aria-hidden="true" pointerEvents="none" data-role="filtered-context-layer">
                  {contextRecords.map((record) => (
                    <polyline
                      key={`ctx-${record.key}`}
                      data-role="filtered-context-line"
                      points={record.polylinePoints}
                      fill="none"
                      stroke="var(--prism-divider)"
                      strokeWidth={1}
                      strokeOpacity={0.35}
                      strokeDasharray="3 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              ) : null}

              <g data-role="record-trajectories">
                {filteredRecords.map((record, recordIdx) => {
                  const isSelected = selectedRecord?.key === record.key;
                  const isActive = activeRecord?.key === record.key;
                  const isDimmed = activeRecord !== null && !isActive;

                  return (
                    <g
                      key={record.key}
                      ref={(node) => registerRecordRef(record.key, node)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={record.ariaSummary}
                      data-role="record-trajectory"
                      data-record-id={record.id}
                      data-group={record.group}
                      data-tone={record.tone}
                      data-selected={isSelected ? 'true' : 'false'}
                      data-active={isActive ? 'true' : 'false'}
                      data-dimmed={isDimmed ? 'true' : 'false'}
                      className="prism-focus-ring cursor-pointer"
                      onClick={() => handleSelectRecord(record)}
                      onFocus={() => handleFocusRecord(record.key)}
                      onBlur={() => handleBlurRecord(record.key)}
                      onKeyDown={handleRecordKeyDown(recordIdx, record)}
                    >
                      <polyline
                        points={record.polylinePoints}
                        fill="none"
                        stroke="var(--prism-divider)"
                        strokeOpacity={0}
                        strokeWidth={12}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      <polyline
                        data-role="record-polyline"
                        points={record.polylinePoints}
                        fill="none"
                        stroke={record.color}
                        strokeWidth={isActive ? 3 : isDimmed ? 1.25 : 1.75}
                        strokeOpacity={isActive ? 1 : isDimmed ? 0.18 : 0.82}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {isActive
                        ? record.vertices.map((vertex) =>
                            vertex.value !== null ? (
                              <circle
                                key={`dot-${vertex.key}`}
                                data-role="vertex-dot"
                                data-axis-id={vertex.axisId}
                                cx={vertex.x}
                                cy={vertex.y}
                                r={3.5}
                                fill={record.color}
                                stroke="var(--prism-bg-start)"
                                strokeWidth={1.5}
                                pointerEvents="none"
                              />
                            ) : null
                          )
                        : null}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <div
            data-testid="parallel-coordinates-inspector"
            aria-live="polite"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 w-full max-w-full min-w-0 text-xs tabular-nums'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {activeRecord ? (
              <div className="flex flex-wrap items-center gap-2 min-w-0 w-full">
                <span className="inline-flex items-center gap-2 font-semibold shrink-0">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeRecord.color }}
                  />
                  <span data-testid="parallel-inspector-name">{activeRecord.label}</span>
                  {activeRecord.group ? (
                    <span
                      className="prism-crystal rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {activeRecord.group}
                    </span>
                  ) : null}
                </span>

                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {activeRecord.vertices.map((vertex) => (
                    <span
                      key={`badge-${vertex.key}`}
                      data-testid={`parallel-inspector-badge-${vertex.axisId}`}
                      className="prism-crystal inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      <span style={STYLE_TEXT_SECONDARY}>
                        {`${vertex.axisLabel}:`}
                      </span>
                      <span className="font-semibold">
                        {vertex.value !== null
                          ? formatValueWithUnit(vertex.value, vertex.unit)
                          : '—'}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <span style={STYLE_TEXT_SECONDARY}>
                  Select or focus any trajectory (ArrowUp / ArrowDown) to inspect dimension values.
                </span>
                <span
                  className="font-mono font-medium shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {resolvedActiveGroup !== null
                    ? `${resolvedActiveGroup}: ${filteredRecords.length} shown`
                    : `${computedRecords.length} trajectories`}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const ParallelCoordinatesPlot = /*#__PURE__*/ memoWithDisplayName(ParallelCoordinatesPlotInner, 'ParallelCoordinatesPlot');
