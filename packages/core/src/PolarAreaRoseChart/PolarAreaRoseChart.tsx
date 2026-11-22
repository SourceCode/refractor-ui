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
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type RoseTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'info';

export type RoseScaleMode = 'area' | 'radius';

export interface PolarRoseSlice {
  /** Stable identifier for this polar sector. */
  id: string;
  /** Human-readable sector label rendered around the outer perimeter, in legend chips, and in the inspector. */
  label: string;
  /** Non-negative finite magnitude for this sector (negative or non-finite values clamp to 0). */
  value: number;
  /** Optional semantic optical tone mapped strictly to `--prism-*` CSS custom properties. */
  tone?: RoseTone;
}

export interface PolarAreaRoseChartProps extends BaseProps<HTMLDivElement> {
  /**
   * Ordered cyclic polar sectors.
   * Defaults to 8 compass wind-rose sectors when omitted; pass `[]` or all non-positive values
   * to display the clean `role="status"` empty state.
   */
  slices?: ReadonlyArray<PolarRoseSlice>;
  /** Controlled radial scale mode (`'area'` for sqrt-proportional area honesty, or `'radius'` for linear radius). */
  scaleMode?: RoseScaleMode;
  /** Initial radial scale mode when uncontrolled (defaults to `'area'`). */
  defaultScaleMode?: RoseScaleMode;
  /** Optional callback fired when the user switches between `'area'` and `'radius'` scale modes. */
  onScaleModeChange?: (mode: RoseScaleMode) => void;
  /** Measurement unit appended to sector magnitudes and totals (defaults to `'kt'`). */
  unit?: string;
  /** Visible heading displayed in the sculpted `prism-slab` header (defaults to `'Polar Area (Nightingale Rose)'`). */
  title?: string;
  /** Callback fired with the selected slice and its percentage share of total magnitude. */
  onSelectSlice?: (slice: PolarRoseSlice, sharePct: number) => void;
}

interface ComputedRing {
  level: number;
  pct: number;
  radius: number;
  labelY: number;
}

interface ComputedRoseSlice {
  key: string;
  index: number;
  id: string;
  label: string;
  value: number;
  sharePct: number;
  tone: RoseTone;
  color: string;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  radius: number;
  spokeTipX: number;
  spokeTipY: number;
  labelX: number;
  labelY: number;
  textAnchor: 'start' | 'middle' | 'end';
  dominantBaseline: 'auto' | 'central' | 'hanging';
  original: PolarRoseSlice;
}

interface Point2D {
  x: number;
  y: number;
}

const SVG_SIZE = 320;
const CENTER = SVG_SIZE / 2;
const MAX_RADIUS = 102;
const EXPAND_OFFSET = 5;
const LABEL_RADIUS = 120;
const FULL_CIRCLE = Math.PI * 2;
const RING_LEVELS: ReadonlyArray<number> = [0.25, 0.5, 0.75, 1];

export const DEFAULT_POLAR_ROSE_SLICES: ReadonlyArray<PolarRoseSlice> = [
  { id: 'n', label: 'N', value: 24, tone: 'primary' },
  { id: 'ne', label: 'NE', value: 18, tone: 'secondary' },
  { id: 'e', label: 'E', value: 12, tone: 'emerald' },
  { id: 'se', label: 'SE', value: 15, tone: 'amber' },
  { id: 's', label: 'S', value: 28, tone: 'info' },
  { id: 'sw', label: 'SW', value: 36, tone: 'primary' },
  { id: 'w', label: 'W', value: 30, tone: 'secondary' },
  { id: 'nw', label: 'NW', value: 17, tone: 'emerald' },
];

function getDefaultTone(index: number): RoseTone {
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

function getToneColor(tone: RoseTone): string {
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

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function roundPct(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

function formatNumeric(value: number): string {
  const safe = value === 0 ? 0 : value;
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(2)));
}

function formatMetric(value: number, unit: string): string {
  const num = formatNumeric(value);
  const trimmedUnit = unit.trim();
  if (!trimmedUnit) {
    return num;
  }
  if (trimmedUnit === '%') {
    return `${num}%`;
  }
  return `${num} ${trimmedUnit}`;
}

function sanitizeValue(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  return raw;
}

function polarToCartesian(center: number, radius: number, angleRadians: number): Point2D {
  return {
    x: roundCoord(center + radius * Math.cos(angleRadians)),
    y: roundCoord(center + radius * Math.sin(angleRadians)),
  };
}

function getPerimeterTextAnchor(angleRadians: number): 'start' | 'middle' | 'end' {
  const cos = Math.cos(angleRadians);
  if (Math.abs(cos) < 0.2) {
    return 'middle';
  }
  return cos > 0 ? 'start' : 'end';
}

function getPerimeterBaseline(angleRadians: number): 'auto' | 'central' | 'hanging' {
  const sin = Math.sin(angleRadians);
  if (sin < -0.5) {
    return 'auto';
  }
  if (sin > 0.5) {
    return 'hanging';
  }
  return 'central';
}

function truncateLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 1)}…`;
}

function buildWedgePath(
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  isFullCircle: boolean
): string {
  if (radius <= 0) {
    return `M ${center} ${center} Z`;
  }
  const r = roundCoord(radius);
  if (isFullCircle) {
    const topY = roundCoord(center - r);
    const botY = roundCoord(center + r);
    return `M ${center} ${topY} A ${r} ${r} 0 1 1 ${center} ${botY} A ${r} ${r} 0 1 1 ${center} ${topY} Z`;
  }
  const start = polarToCartesian(center, radius, startAngle);
  const end = polarToCartesian(center, radius, endAngle);
  return `M ${center} ${center} L ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y} Z`;
}

export function PolarAreaRoseChart({
  slices,
  scaleMode,
  defaultScaleMode = 'area',
  onScaleModeChange,
  unit = 'kt',
  title = 'Polar Area (Nightingale Rose)',
  onSelectSlice,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PolarAreaRoseChartProps) {
  const headingId = useId();
  const override = useComponentOverride('PolarAreaRoseChart');
  const wedgeRefs = useRef<Map<string, SVGPathElement>>(new Map());

  const [activeScaleMode, setActiveScaleMode] = useControllableState<RoseScaleMode>({
    value: scaleMode,
    defaultValue: defaultScaleMode,
    onChange: onScaleModeChange,
  });

  const [selectedSliceKey, setSelectedSliceKey] = useState<string | null>(null);
  const [focusedSliceKey, setFocusedSliceKey] = useState<string | null>(null);

  const sourceSlices = slices ?? DEFAULT_POLAR_ROSE_SLICES;

  const { computedSlices, rings, totalValue, peakSlice } = useMemo(() => {
    const sanitizedValues = sourceSlices.map((item) => sanitizeValue(item.value));
    let maxVal = 0;
    let sumVal = 0;
    let peakIdx = -1;

    for (let i = 0; i < sanitizedValues.length; i += 1) {
      const val = sanitizedValues[i]!;
      sumVal += val;
      if (val > maxVal) {
        maxVal = val;
        peakIdx = i;
      }
    }

    if (sourceSlices.length === 0 || maxVal <= 0) {
      return {
        computedSlices: [] as ComputedRoseSlice[],
        rings: [] as ComputedRing[],
        totalValue: 0,
        peakSlice: null as ComputedRoseSlice | null,
      };
    }

    const ringList: ComputedRing[] = RING_LEVELS.map((level) => {
      const radius = roundCoord(MAX_RADIUS * level);
      return {
        level,
        pct: Math.round(level * 100),
        radius,
        labelY: roundCoord(CENTER - radius - 2),
      };
    });

    const count = sourceSlices.length;
    const angleStep = FULL_CIRCLE / count;
    const idCounts = new Map<string, number>();

    const sliceList: ComputedRoseSlice[] = sourceSlices.map((item, index) => {
      const seen = idCounts.get(item.id) ?? 0;
      idCounts.set(item.id, seen + 1);
      const key = seen === 0 ? `rose:${item.id}` : `rose:${item.id}#${seen + 1}`;
      const value = sanitizedValues[index]!;
      const normalized = value / maxVal;
      const radiusRatio = activeScaleMode === 'area' ? Math.sqrt(normalized) : normalized;
      const radius = roundCoord(MAX_RADIUS * radiusRatio);
      const midAngle = -Math.PI / 2 + index * angleStep;
      const startAngle = midAngle - angleStep / 2;
      const endAngle = midAngle + angleStep / 2;
      const spokeTip = polarToCartesian(CENTER, MAX_RADIUS, midAngle);
      const labelPos = polarToCartesian(CENTER, LABEL_RADIUS, midAngle);
      const resolvedTone = item.tone ?? getDefaultTone(index);
      const color = getToneColor(resolvedTone);

      return {
        key,
        index,
        id: item.id,
        label: item.label,
        value,
        sharePct: roundPct((value / sumVal) * 100),
        tone: resolvedTone,
        color,
        startAngle,
        endAngle,
        midAngle,
        radius,
        spokeTipX: spokeTip.x,
        spokeTipY: spokeTip.y,
        labelX: labelPos.x,
        labelY: labelPos.y,
        textAnchor: getPerimeterTextAnchor(midAngle),
        dominantBaseline: getPerimeterBaseline(midAngle),
        original: item,
      };
    });

    return {
      computedSlices: sliceList,
      rings: ringList,
      totalValue: sumVal,
      peakSlice: sliceList[peakIdx]!,
    };
  }, [sourceSlices, activeScaleMode]);

  const isEmpty = computedSlices.length === 0;
  const isFullCircle = computedSlices.length === 1;
  const scaleModeLabel = activeScaleMode === 'area' ? 'Area-Proportional' : 'Linear Radius';

  const selectedSlice = useMemo(() => {
    if (selectedSliceKey === null) return null;
    return computedSlices.find((item) => item.key === selectedSliceKey) ?? null;
  }, [computedSlices, selectedSliceKey]);

  const focusedSlice = useMemo(() => {
    if (focusedSliceKey === null) return null;
    return computedSlices.find((item) => item.key === focusedSliceKey) ?? null;
  }, [computedSlices, focusedSliceKey]);

  const inspectedSlice = focusedSlice ?? selectedSlice;

  const registerWedgeRef = useCallback((sliceKey: string, node: SVGPathElement | null) => {
    if (node) {
      wedgeRefs.current.set(sliceKey, node);
    } else {
      wedgeRefs.current.delete(sliceKey);
    }
  }, []);

  const handleSelectSlice = useCallback(
    (slice: ComputedRoseSlice) => {
      setSelectedSliceKey(slice.key);
      onSelectSlice?.(slice.original, slice.sharePct);
    },
    [onSelectSlice]
  );

  const handleToggleSlice = useCallback(
    (slice: ComputedRoseSlice) => {
      if (selectedSlice?.key === slice.key) {
        setSelectedSliceKey(null);
        return;
      }
      handleSelectSlice(slice);
    },
    [handleSelectSlice, selectedSlice]
  );

  const handleFocusSlice = useCallback((sliceKey: string) => {
    setFocusedSliceKey(sliceKey);
  }, []);

  const handleBlurSlice = useCallback((sliceKey: string) => {
    setFocusedSliceKey((prev) => (prev === sliceKey ? null : prev));
  }, []);

  const handleWedgeKeyDown = useCallback(
    (sliceIndex: number, slice: ComputedRoseSlice) =>
      (event: ReactKeyboardEvent<SVGPathElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleToggleSlice(slice);
          return;
        }

        const count = computedSlices.length;
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          const nextSlice = computedSlices[(sliceIndex + 1) % count]!;
          wedgeRefs.current.get(nextSlice.key)?.focus();
          handleSelectSlice(nextSlice);
          return;
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          const prevSlice = computedSlices[(sliceIndex - 1 + count) % count]!;
          wedgeRefs.current.get(prevSlice.key)?.focus();
          handleSelectSlice(prevSlice);
        }
      },
    [computedSlices, handleSelectSlice, handleToggleSlice]
  );

  const merged = mergeProps({
    themeTarget: themeProps('polar-area-rose-chart', {
      scaleMode: activeScaleMode,
      empty: isEmpty,
      hasSelection: inspectedSlice !== null,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-4 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('polar-area-rose-chart', 'header');
  const wellClass = stableClassName('polar-area-rose-chart', 'well');
  const svgClass = stableClassName('polar-area-rose-chart', 'svg');
  const legendClass = stableClassName('polar-area-rose-chart', 'legend');
  const inspectorClass = stableClassName('polar-area-rose-chart', 'inspector');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight min-w-0 break-words"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {title}
        </h4>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {!isEmpty && peakSlice ? (
            <span
              data-testid="polar-rose-peak-badge"
              data-peak-id={peakSlice.id}
              className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-semibold tabular-nums shrink-0"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: peakSlice.color }}
              />
              <span style={{ color: 'var(--prism-text-secondary)' }}>Peak</span>
              <span>{`${peakSlice.label} · ${formatMetric(peakSlice.value, unit)}`}</span>
            </span>
          ) : null}

          <div
            role="group"
            aria-label="Polar scale mode"
            className="prism-well inline-flex flex-wrap items-center gap-0.5 rounded-full p-0.5 min-w-0"
          >
            <button
              type="button"
              aria-pressed={activeScaleMode === 'area'}
              data-scale-mode="area"
              onClick={() => setActiveScaleMode('area')}
              className={cx(
                'prism-focus-ring rounded-full px-2.5 py-1 text-xs cursor-pointer transition-all',
                activeScaleMode === 'area' ? 'prism-crystal font-semibold' : 'font-medium opacity-75'
              )}
              style={{
                color:
                  activeScaleMode === 'area'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              Area-Proportional
            </button>
            <button
              type="button"
              aria-pressed={activeScaleMode === 'radius'}
              data-scale-mode="radius"
              onClick={() => setActiveScaleMode('radius')}
              className={cx(
                'prism-focus-ring rounded-full px-2.5 py-1 text-xs cursor-pointer transition-all',
                activeScaleMode === 'radius'
                  ? 'prism-crystal font-semibold'
                  : 'font-medium opacity-75'
              )}
              style={{
                color:
                  activeScaleMode === 'radius'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              Linear Radius
            </button>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="polar-rose-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No positive sector values to display.
        </div>
      ) : (
        <>
          <div className={cx(wellClass, 'prism-well rounded-2xl p-3 sm:p-4 w-full max-w-full min-w-0')}>
            <svg
              role="img"
              aria-label={`${title} polar area rose chart (${scaleModeLabel} scale across ${computedSlices.length} sectors)`}
              data-testid="polar-rose-svg"
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              className={cx(svgClass, 'w-full max-w-[320px] h-auto mx-auto select-none block')}
            >
              <g data-testid="polar-rose-rings" pointerEvents="none">
                {rings.map((ring) => (
                  <g key={`ring-${ring.pct}`}>
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={ring.radius}
                      fill="none"
                      stroke="var(--prism-divider)"
                      strokeWidth={ring.level === 1 ? 1.25 : 0.85}
                      strokeDasharray={ring.level === 1 ? undefined : '3 3'}
                      data-ring-pct={String(ring.pct)}
                      data-testid={`polar-rose-ring-${ring.pct}`}
                    />
                    <text
                      x={CENTER + 4}
                      y={ring.labelY}
                      aria-hidden="true"
                      fill="var(--prism-text-secondary)"
                      className="text-[8px] font-mono tabular-nums"
                    >
                      {`${ring.pct}%`}
                    </text>
                  </g>
                ))}
              </g>

              <g data-testid="polar-rose-spokes" pointerEvents="none">
                {computedSlices.map((slice) => {
                  const isActive = inspectedSlice?.key === slice.key;
                  return (
                    <line
                      key={`spoke-${slice.key}`}
                      x1={CENTER}
                      y1={CENTER}
                      x2={slice.spokeTipX}
                      y2={slice.spokeTipY}
                      stroke={isActive ? slice.color : 'var(--prism-divider)'}
                      strokeWidth={isActive ? 1.5 : 0.85}
                      strokeDasharray={isActive ? undefined : '2 3'}
                      data-slice-id={slice.id}
                      data-testid={`polar-rose-spoke-${slice.index}`}
                    />
                  );
                })}
              </g>

              <g data-testid="polar-rose-wedges">
                {computedSlices.map((slice) => {
                  const isSelected = selectedSlice?.key === slice.key;
                  const isActive = inspectedSlice?.key === slice.key;
                  const isDimmed = inspectedSlice !== null && !isActive;
                  const isExpanded = isActive && slice.radius > 0;
                  const effectiveRadius = isExpanded
                    ? roundCoord(slice.radius + EXPAND_OFFSET)
                    : slice.radius;
                  const pathD = buildWedgePath(
                    CENTER,
                    effectiveRadius,
                    slice.startAngle,
                    slice.endAngle,
                    isFullCircle
                  );

                  const fillOpacity = isActive ? 0.62 : isDimmed ? 0.16 : 0.38;
                  const strokeColor = isActive ? 'var(--prism-text-primary)' : slice.color;
                  const strokeWidth = isActive ? 2 : 1.25;
                  const strokeOpacity = isActive ? 1 : isDimmed ? 0.32 : 0.85;

                  return (
                    <path
                      key={slice.key}
                      ref={(node) => registerWedgeRef(slice.key, node)}
                      d={pathD}
                      fill={slice.color}
                      fillOpacity={fillOpacity}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      strokeLinejoin="round"
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`${slice.label}: ${formatMetric(slice.value, unit)}, ${formatNumeric(slice.sharePct)}% share`}
                      data-slice-id={slice.id}
                      data-tone={slice.tone}
                      data-value={String(slice.value)}
                      data-radius={String(effectiveRadius)}
                      data-selected={isSelected ? 'true' : 'false'}
                      data-expanded={isExpanded ? 'true' : 'false'}
                      data-dimmed={isDimmed ? 'true' : 'false'}
                      className="prism-focus-ring cursor-pointer transition-all duration-150"
                      onClick={() => handleToggleSlice(slice)}
                      onFocus={() => handleFocusSlice(slice.key)}
                      onBlur={() => handleBlurSlice(slice.key)}
                      onKeyDown={handleWedgeKeyDown(slice.index, slice)}
                    >
                      <title>{`${slice.label}: ${formatMetric(slice.value, unit)} (${formatNumeric(slice.sharePct)}%)`}</title>
                    </path>
                  );
                })}
              </g>

              <circle
                cx={CENTER}
                cy={CENTER}
                r={3}
                fill="var(--prism-text-primary)"
                fillOpacity={0.35}
                stroke="var(--prism-divider)"
                strokeWidth={1}
                pointerEvents="none"
              />

              <g data-testid="polar-rose-labels" pointerEvents="none">
                {computedSlices.map((slice) => {
                  const isActive = inspectedSlice?.key === slice.key;
                  return (
                    <text
                      key={`label-${slice.key}`}
                      x={slice.labelX}
                      y={slice.labelY}
                      textAnchor={slice.textAnchor}
                      dominantBaseline={slice.dominantBaseline}
                      fill={isActive ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)'}
                      data-slice-id={slice.id}
                      data-testid={`polar-rose-label-${slice.index}`}
                      className={cx(
                        'text-[10px] select-none transition-colors',
                        isActive ? 'font-bold' : 'font-medium'
                      )}
                    >
                      {truncateLabel(slice.label, 9)}
                    </text>
                  );
                })}
              </g>
            </svg>
          </div>

          <div
            role="group"
            aria-label="Polar sector legend"
            data-testid="polar-rose-legend"
            className={cx(legendClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
          >
            {computedSlices.map((slice) => {
              const isSelected = selectedSlice?.key === slice.key;
              const isDimmed = inspectedSlice !== null && inspectedSlice.key !== slice.key;

              return (
                <button
                  key={`legend-${slice.key}`}
                  type="button"
                  aria-pressed={isSelected}
                  data-slice-id={slice.id}
                  data-tone={slice.tone}
                  onClick={() => handleToggleSlice(slice)}
                  className={cx(
                    'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs cursor-pointer transition-all min-w-0 max-w-full',
                    isSelected ? 'prism-well font-semibold' : 'prism-crystal font-medium',
                    isDimmed ? 'opacity-55' : 'opacity-100'
                  )}
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate">{slice.label}</span>
                  <span
                    className="font-mono text-[11px] tabular-nums shrink-0"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    {formatMetric(slice.value, unit)}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            data-testid="polar-rose-inspector"
            aria-live="polite"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums min-w-0'
            )}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {inspectedSlice ? (
              <>
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: inspectedSlice.color }}
                  />
                  <span className="font-medium break-words min-w-0">
                    {`${inspectedSlice.label} · ${formatMetric(inspectedSlice.value, unit)} · ${formatNumeric(inspectedSlice.sharePct)}% · ${scaleModeLabel}`}
                  </span>
                </span>
                <span
                  className="shrink-0 font-mono font-medium"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  {`Total: ${formatMetric(totalValue, unit)}`}
                </span>
              </>
            ) : (
              <>
                <span className="min-w-0 break-words" style={{ color: 'var(--prism-text-secondary)' }}>
                  Select or focus any sector wedge to inspect magnitude and share.
                </span>
                <span
                  className="shrink-0 font-mono font-medium"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  {`${scaleModeLabel} · Total: ${formatMetric(totalValue, unit)}`}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

PolarAreaRoseChart.displayName = 'PolarAreaRoseChart';
