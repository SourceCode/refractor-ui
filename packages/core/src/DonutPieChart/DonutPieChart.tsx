'use client';

import {
  memo,
  useCallback,
  useEffect,
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

export type DonutSliceTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';
export type DonutPieVariant = 'donut' | 'pie';

export interface DonutSlice {
  /** Stable unique identifier for this slice. */
  id: string;
  /** Human-readable label shown in the legend, tooltip, and center readout. */
  label: string;
  /** Positive finite numeric magnitude; non-positive or non-finite values are filtered out. */
  value: number;
  /** Optional semantic optical tone token used to fill this slice. */
  tone?: DonutSliceTone;
}

export interface DonutPieChartProps extends BaseProps<HTMLDivElement> {
  /** Proportional part-to-whole slice definitions. */
  slices: DonutSlice[];
  /** Initial or synced chart geometry ('donut' | 'pie', defaults to 'donut'). */
  variant?: DonutPieVariant;
  /** Chart card heading (defaults to 'Composition Share'). */
  title?: string;
  /** Center cutout subtitle shown in donut mode when no slice is selected (defaults to 'Total'). */
  centerLabel?: string;
  /** Optional custom center cutout headline override shown in donut mode when no slice is selected. */
  centerValue?: string;
  /** Optional unit suffix appended to values in center headline, legend, and readout. */
  valueUnit?: string;
  /** Square SVG viewport dimension in pixels (defaults to 220, clamped to 140..360). */
  size?: number;
  /** Callback fired when a slice or its legend row is clicked or activated via keyboard. */
  onSelectSlice?: (slice: DonutSlice, sharePct: number) => void;
}

interface ComputedDonutSlice {
  id: string;
  key: string;
  label: string;
  value: number;
  sharePct: number;
  tone: DonutSliceTone;
  color: string;
  pathD: string;
  isFullCircle: boolean;
  original: DonutSlice;
}

const TONE_TOKEN_MAP: Record<DonutSliceTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  rose: 'var(--prism-error-main)',
};

const TONE_CYCLE: ReadonlyArray<DonutSliceTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'rose',
];

const VARIANT_OPTIONS: ReadonlyArray<{ value: DonutPieVariant; label: string }> = [
  { value: 'donut', label: 'Donut' },
  { value: 'pie', label: 'Pie' },
];

const FULL_CIRCLE_EPSILON = 0.0001;

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
): { x: number; y: number } {
  return {
    x: roundCoord(centerX + radius * Math.cos(angleRadians)),
    y: roundCoord(centerY + radius * Math.sin(angleRadians)),
  };
}

function buildFullCirclePath(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number
): string {
  const cxR = roundCoord(centerX);
  const outerTop = roundCoord(centerY - outerRadius);
  const outerBottom = roundCoord(centerY + outerRadius);
  const rOut = roundCoord(outerRadius);

  const outerRing = [
    `M ${cxR} ${outerTop}`,
    `A ${rOut} ${rOut} 0 0 1 ${cxR} ${outerBottom}`,
    `A ${rOut} ${rOut} 0 0 1 ${cxR} ${outerTop}`,
    'Z',
  ].join(' ');

  if (innerRadius <= 0) {
    return outerRing;
  }

  const innerTop = roundCoord(centerY - innerRadius);
  const innerBottom = roundCoord(centerY + innerRadius);
  const rIn = roundCoord(innerRadius);

  const innerHole = [
    `M ${cxR} ${innerTop}`,
    `A ${rIn} ${rIn} 0 0 0 ${cxR} ${innerBottom}`,
    `A ${rIn} ${rIn} 0 0 0 ${cxR} ${innerTop}`,
    'Z',
  ].join(' ');

  return `${outerRing} ${innerHole}`;
}

function buildSlicePath(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): { d: string; isFullCircle: boolean } {
  const sweepAngle = endAngle - startAngle;
  if (sweepAngle >= Math.PI * 2 - FULL_CIRCLE_EPSILON) {
    return {
      d: buildFullCirclePath(centerX, centerY, outerRadius, innerRadius),
      isFullCircle: true,
    };
  }

  const largeArcFlag = sweepAngle > Math.PI ? 1 : 0;
  const rOut = roundCoord(outerRadius);
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle);

  if (innerRadius <= 0) {
    const cxR = roundCoord(centerX);
    const cyR = roundCoord(centerY);
    return {
      d: `M ${cxR} ${cyR} L ${outerStart.x} ${outerStart.y} A ${rOut} ${rOut} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y} Z`,
      isFullCircle: false,
    };
  }

  const rIn = roundCoord(innerRadius);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);

  return {
    d: [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${rOut} ${rOut} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${rIn} ${rIn} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' '),
    isFullCircle: false,
  };
}

function DonutPieChartInner({
  slices,
  variant = 'donut',
  title = 'Composition Share',
  centerLabel = 'Total',
  centerValue,
  valueUnit,
  size = 220,
  onSelectSlice,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DonutPieChartProps) {
  const headingId = useId();
  const override = useComponentOverride('DonutPieChart');
  const [activeVariant, setActiveVariant] = useState<DonutPieVariant>(variant);
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);

  useEffect(() => {
    setActiveVariant(variant);
  }, [variant]);

  const clampedSize = clampNumber(size, 140, 360, 220);

  const { totalValue, computedSlices } = useMemo(() => {
    const validEntries: DonutSlice[] = [];
    let sum = 0;

    for (const entry of slices) {
      if (Number.isFinite(entry.value) && entry.value > 0) {
        validEntries.push(entry);
        sum += entry.value;
      }
    }

    if (validEntries.length === 0) {
      return {
        totalValue: 0,
        computedSlices: [] as ComputedDonutSlice[],
      };
    }

    const center = clampedSize / 2;
    const outerRadius = center - 12;
    const innerRadius = activeVariant === 'donut' ? outerRadius * 0.6 : 0;

    const items: ComputedDonutSlice[] = [];
    let cursorAngle = -Math.PI / 2;

    for (let idx = 0; idx < validEntries.length; idx += 1) {
      const entry = validEntries[idx]!;
      const fraction = entry.value / sum;
      const sweep = validEntries.length === 1 ? Math.PI * 2 : fraction * Math.PI * 2;
      const startAngle = cursorAngle;
      const endAngle = cursorAngle + sweep;
      cursorAngle = endAngle;

      const resolvedTone = entry.tone ?? (TONE_CYCLE[idx % TONE_CYCLE.length] as DonutSliceTone);
      const sharePct = Number((fraction * 100).toFixed(2));
      const { d, isFullCircle } = buildSlicePath(
        center,
        center,
        outerRadius,
        innerRadius,
        startAngle,
        endAngle
      );

      items.push({
        id: entry.id,
        key: `slice-${entry.id}-${idx}`,
        label: entry.label,
        value: entry.value,
        sharePct,
        tone: resolvedTone,
        color: TONE_TOKEN_MAP[resolvedTone],
        pathD: d,
        isFullCircle,
        original: entry,
      });
    }

    return {
      totalValue: sum,
      computedSlices: items,
    };
  }, [slices, clampedSize, activeVariant]);

  const isEmpty = computedSlices.length === 0;

  const activeSelection = useMemo(() => {
    if (selectedSliceId === null) return null;
    return computedSlices.find((slice) => slice.id === selectedSliceId) ?? null;
  }, [computedSlices, selectedSliceId]);

  const handleSelectSlice = useCallback(
    (slice: ComputedDonutSlice) => {
      setSelectedSliceId(slice.id);
      onSelectSlice?.(slice.original, slice.sharePct);
    },
    [onSelectSlice]
  );

  const handleSliceKeyDown = useCallback(
    (slice: ComputedDonutSlice) =>
      (event: ReactKeyboardEvent<SVGPathElement | HTMLButtonElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectSlice(slice);
        }
      },
    [handleSelectSlice]
  );

  const merged = mergeProps({
    themeTarget: themeProps('donut-pie-chart', {
      variant: activeVariant,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('donut-pie-chart', 'header');
  const svgClass = stableClassName('donut-pie-chart', 'svg');
  const legendClass = stableClassName('donut-pie-chart', 'legend');
  const readoutClass = stableClassName('donut-pie-chart', 'readout');

  const centerHeadline = activeSelection
    ? `${formatNumeric(activeSelection.sharePct)}%`
    : (centerValue ?? formatMetric(totalValue, valueUnit));
  const centerSubtitle = activeSelection ? activeSelection.label : centerLabel;

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
          role="group"
          aria-label="Chart variant"
          className="prism-crystal p-1 rounded-full inline-flex gap-1"
        >
          {VARIANT_OPTIONS.map((opt) => {
            const pressed = activeVariant === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={pressed}
                onClick={() => setActiveVariant(opt.value)}
                className={cx(
                  'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors',
                  pressed ? 'prism-well font-semibold' : 'opacity-75 hover:opacity-100'
                )}
                style={{
                  color: pressed ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="donut-pie-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No positive slice values to display.
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="shrink-0 flex items-center justify-center">
              <svg
                role="img"
                aria-label={`${title} ${activeVariant} chart`}
                viewBox={`0 0 ${clampedSize} ${clampedSize}`}
                width={clampedSize}
                height={clampedSize}
                style={{ width: `${clampedSize}px`, height: `${clampedSize}px` }}
                className={cx(svgClass, 'block overflow-visible')}
              >
                {computedSlices.map((slice) => {
                  const isSelected = activeSelection?.id === slice.id;
                  const fillOpacity =
                    activeSelection === null ? 0.9 : isSelected ? 1 : 0.6;
                  const strokeColor = isSelected
                    ? 'var(--prism-text-primary)'
                    : slice.isFullCircle
                      ? 'none'
                      : 'var(--prism-divider)';
                  const strokeWidth = isSelected ? 2 : slice.isFullCircle ? 0 : 1.5;

                  return (
                    <path
                      key={slice.key}
                      d={slice.pathD}
                      fill={slice.color}
                      fillOpacity={fillOpacity}
                      fillRule={slice.isFullCircle && activeVariant === 'donut' ? 'evenodd' : undefined}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeLinejoin="round"
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`${slice.label}: ${formatMetric(slice.value, valueUnit)} (${formatNumeric(slice.sharePct)}%)`}
                      data-slice-id={slice.id}
                      data-selected={isSelected ? 'true' : 'false'}
                      className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                      onClick={() => handleSelectSlice(slice)}
                      onKeyDown={handleSliceKeyDown(slice)}
                    />
                  );
                })}

                {activeVariant === 'donut' ? (
                  <g data-testid="donut-pie-center" pointerEvents="none">
                    <text
                      x={clampedSize / 2}
                      y={clampedSize / 2 - 4}
                      textAnchor="middle"
                      fill="var(--prism-text-primary)"
                      className="text-base font-bold font-mono tabular-nums"
                    >
                      {centerHeadline}
                    </text>
                    <text
                      x={clampedSize / 2}
                      y={clampedSize / 2 + 14}
                      textAnchor="middle"
                      fill="var(--prism-text-secondary)"
                      className="text-[11px] font-medium"
                    >
                      {centerSubtitle}
                    </text>
                  </g>
                ) : null}
              </svg>
            </div>

            <div
              role="group"
              aria-label="Slice legend"
              className={cx(legendClass, 'w-full flex-1 flex flex-col gap-2')}
            >
              {computedSlices.map((slice) => {
                const isSelected = activeSelection?.id === slice.id;
                return (
                  <button
                    key={slice.key}
                    type="button"
                    aria-pressed={isSelected}
                    data-slice-id={slice.id}
                    onClick={() => handleSelectSlice(slice)}
                    onKeyDown={handleSliceKeyDown(slice)}
                    className={cx(
                      'prism-focus-ring w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors text-left',
                      isSelected ? 'prism-well font-semibold' : 'prism-crystal'
                    )}
                    style={STYLE_TEXT_PRIMARY}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden="true"
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="truncate">{slice.label}</span>
                    </span>

                    <span className="inline-flex items-center gap-2 shrink-0 font-mono tabular-nums">
                      <span style={STYLE_TEXT_SECONDARY}>
                        {formatMetric(slice.value, valueUnit)}
                      </span>
                      <span className="font-semibold">{`${formatNumeric(slice.sharePct)}%`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            data-testid="donut-pie-readout"
            aria-live="polite"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 text-xs tabular-nums'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {activeSelection ? (
              <span className="inline-flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeSelection.color }}
                />
                <span className="font-medium truncate">
                  {`${activeSelection.label}: ${formatMetric(activeSelection.value, valueUnit)} (${formatNumeric(activeSelection.sharePct)}%)`}
                </span>
              </span>
            ) : (
              <span style={STYLE_TEXT_SECONDARY}>
                Select any slice to inspect exact composition share.
              </span>
            )}
            <span
              className="shrink-0 font-mono font-medium"
              style={STYLE_TEXT_SECONDARY}
            >
              {`${centerLabel}: ${centerValue ?? formatMetric(totalValue, valueUnit)}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export const DonutPieChart = memo(DonutPieChartInner);
DonutPieChart.displayName = 'DonutPieChart';
