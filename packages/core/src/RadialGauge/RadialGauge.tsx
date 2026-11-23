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
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type RadialGaugeTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface RadialGaugeThreshold {
  /** Upper inclusive bound for this threshold band within [min, max]. */
  upTo: number;
  /** Human-readable band label displayed in the header badge and footer readout. */
  label: string;
  /** Semantic optical tone token used to render this threshold band. */
  tone: RadialGaugeTone;
}

export interface RadialGaugeProps extends BaseProps<HTMLDivElement> {
  /** Current metric value plotted on the gauge arc (non-finite values fall back to min). */
  value: number;
  /** Minimum scale bound (defaults to 0). */
  min?: number;
  /** Maximum scale bound (defaults to 100; falls back to min + 100 when <= min). */
  max?: number;
  /** Unit suffix appended to metric readouts and endpoint ticks (defaults to '%'). */
  unit?: string;
  /** Optional metric caption displayed beneath the center headline value (e.g. 'Throughput'). */
  label?: string;
  /** Card heading linked to the gauge meter (defaults to 'KPI Radial Gauge'). */
  title?: string;
  /** Optional target marker tick along the gauge arc (ignored when non-finite). */
  target?: number;
  /** Angular arc sweep in degrees: 180 semi-circle or 270 speedometer (defaults to 180). */
  sweep?: 180 | 270;
  /** Semantic threshold bands covering [min, max]; defaults to Optimal / Elevated / Critical. */
  thresholds?: RadialGaugeThreshold[];
  /** SVG width in pixels, clamped to 160..360 (defaults to 240). */
  size?: number;
  /** Callback fired when a threshold arc band is clicked or activated via IME-safe Enter/Space. */
  onSelectBand?: (threshold: RadialGaugeThreshold) => void;
}

interface NormalizedBand {
  from: number;
  to: number;
  label: string;
  tone: RadialGaugeTone;
}

interface ComputedGaugeBand extends NormalizedBand {
  key: string;
  color: string;
  pathD: string;
  threshold: RadialGaugeThreshold;
}

const TONE_TOKEN_MAP: Record<RadialGaugeTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  rose: 'var(--prism-error-main)',
};

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function formatNumeric(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toFixed(2)));
}

function formatMetric(value: number, unit: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
}

function formatSignedDelta(delta: number, unit: string): string {
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${formatMetric(delta, unit)}`;
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

function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startDeg: number,
  endDeg: number
): string {
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const start = polarToCartesian(centerX, centerY, radius, startRad);
  const end = polarToCartesian(centerX, centerY, radius, endRad);
  const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;
  const r = roundCoord(radius);

  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function buildDefaultThresholds(min: number, max: number): RadialGaugeThreshold[] {
  const span = max - min;
  return [
    { upTo: roundCoord(min + span * 0.6), label: 'Optimal', tone: 'emerald' },
    { upTo: roundCoord(min + span * 0.85), label: 'Elevated', tone: 'amber' },
    { upTo: max, label: 'Critical', tone: 'rose' },
  ];
}

function normalizeThresholds(
  thresholds: RadialGaugeThreshold[] | undefined,
  min: number,
  max: number
): NormalizedBand[] {
  const source: RadialGaugeThreshold[] =
    thresholds && thresholds.length > 0
      ? thresholds
          .filter((entry) => Number.isFinite(entry.upTo))
          .map((entry) => ({
            upTo: clampNumber(entry.upTo, min, max, min),
            label: entry.label,
            tone: entry.tone,
          }))
          .sort((a, b) => a.upTo - b.upTo)
      : buildDefaultThresholds(min, max);

  const bands: NormalizedBand[] = [];
  let cursor = min;

  for (const entry of source) {
    if (entry.upTo <= cursor) {
      continue;
    }
    bands.push({
      from: cursor,
      to: entry.upTo,
      label: entry.label,
      tone: entry.tone,
    });
    cursor = entry.upTo;
  }

  if (bands.length === 0) {
    return normalizeThresholds(undefined, min, max);
  }

  return bands;
}

const headerClass = /*#__PURE__*/ stableClassName('radial-gauge', 'header');
const badgeClass = /*#__PURE__*/ stableClassName('radial-gauge', 'badge');
const svgClass = /*#__PURE__*/ stableClassName('radial-gauge', 'svg');
const footerClass = /*#__PURE__*/ stableClassName('radial-gauge', 'footer');

function RadialGaugeInner({
  value,
  min = 0,
  max = 100,
  unit = '%',
  label,
  title = 'KPI Radial Gauge',
  target,
  sweep = 180,
  thresholds,
  size = 240,
  onSelectBand,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RadialGaugeProps) {
  const headingId = useId();
  const override = useComponentOverride('RadialGauge');
  const [inspectedBandKey, setInspectedBandKey] = useState<string | null>(null);

  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 100;
  const span = safeMax - safeMin;
  const clampedValue = clampNumber(value, safeMin, safeMax, safeMin);
  const safeTarget =
    target !== undefined && Number.isFinite(target)
      ? clampNumber(target, safeMin, safeMax, safeMin)
      : null;
  const clampedSize = clampNumber(size, 160, 360, 240);
  const resolvedSweep: 180 | 270 = sweep === 270 ? 270 : 180;

  const geometry = useMemo(() => {
    const startAngleDeg = resolvedSweep === 270 ? 135 : 180;
    const endAngleDeg = startAngleDeg + resolvedSweep;
    const cxCoord = roundCoord(clampedSize / 2);
    const radius = roundCoord((clampedSize - 48) / 2);
    const strokeWidth = roundCoord(Math.max(10, radius * 0.16));
    const progressStrokeWidth = roundCoord(strokeWidth * 0.52);
    const cyCoord = roundCoord(22 + radius + strokeWidth / 2);

    const minTickPos =
      resolvedSweep === 270
        ? {
            x: roundCoord(cxCoord - radius * 0.78),
            y: roundCoord(cyCoord + radius * 0.78 + 16),
          }
        : {
            x: roundCoord(cxCoord - radius),
            y: roundCoord(cyCoord + 20),
          };

    const maxTickPos =
      resolvedSweep === 270
        ? {
            x: roundCoord(cxCoord + radius * 0.78),
            y: roundCoord(cyCoord + radius * 0.78 + 16),
          }
        : {
            x: roundCoord(cxCoord + radius),
            y: roundCoord(cyCoord + 20),
          };

    const valueTextY =
      resolvedSweep === 270 ? roundCoord(cyCoord + radius * 0.46 + 10) : roundCoord(cyCoord + 36);
    const labelTextY = roundCoord(valueTextY + 18);
    const svgHeight =
      resolvedSweep === 270
        ? Math.ceil(cyCoord + radius * 0.78 + 28)
        : Math.ceil(cyCoord + 64);

    const trackPathD = describeArc(cxCoord, cyCoord, radius, startAngleDeg, endAngleDeg);

    const normalized = normalizeThresholds(thresholds, safeMin, safeMax);
    const computedBands: ComputedGaugeBand[] = normalized.map((band) => {
      const bandStartDeg = startAngleDeg + ((band.from - safeMin) / span) * resolvedSweep;
      const bandEndDeg = startAngleDeg + ((band.to - safeMin) / span) * resolvedSweep;
      return {
        ...band,
        key: `band-${band.label}-${band.from}-${band.to}`,
        color: TONE_TOKEN_MAP[band.tone],
        pathD: describeArc(cxCoord, cyCoord, radius, bandStartDeg, bandEndDeg),
        threshold: {
          upTo: band.to,
          label: band.label,
          tone: band.tone,
        },
      };
    });

    const valueRatio = (clampedValue - safeMin) / span;
    const valueAngleDeg = startAngleDeg + valueRatio * resolvedSweep;
    const progressPathD =
      valueRatio > 0
        ? describeArc(cxCoord, cyCoord, radius, startAngleDeg, valueAngleDeg)
        : null;

    const valueRad = (valueAngleDeg * Math.PI) / 180;
    const perpRad = valueRad + Math.PI / 2;
    const needleTip = polarToCartesian(cxCoord, cyCoord, radius - strokeWidth * 0.38, valueRad);
    const needleTail = polarToCartesian(cxCoord, cyCoord, -10, valueRad);
    const baseLeft = polarToCartesian(cxCoord, cyCoord, 3.2, perpRad);
    const baseRight = polarToCartesian(cxCoord, cyCoord, -3.2, perpRad);
    const needlePathD = `M ${baseLeft.x} ${baseLeft.y} L ${needleTip.x} ${needleTip.y} L ${baseRight.x} ${baseRight.y} L ${needleTail.x} ${needleTail.y} Z`;

    let targetMarker: {
      value: number;
      inner: { x: number; y: number };
      outer: { x: number; y: number };
      labelPos: { x: number; y: number };
    } | null = null;

    if (safeTarget !== null) {
      const targetRatio = (safeTarget - safeMin) / span;
      const targetAngleDeg = startAngleDeg + targetRatio * resolvedSweep;
      const targetRad = (targetAngleDeg * Math.PI) / 180;
      targetMarker = {
        value: safeTarget,
        inner: polarToCartesian(cxCoord, cyCoord, radius - strokeWidth * 0.72, targetRad),
        outer: polarToCartesian(cxCoord, cyCoord, radius + strokeWidth * 0.78, targetRad),
        labelPos: polarToCartesian(cxCoord, cyCoord, radius + strokeWidth * 0.78 + 11, targetRad),
      };
    }

    return {
      cxCoord,
      cyCoord,
      strokeWidth,
      progressStrokeWidth,
      minTickPos,
      maxTickPos,
      valueTextY,
      labelTextY,
      svgHeight,
      trackPathD,
      computedBands,
      valueAngleDeg,
      progressPathD,
      needlePathD,
      targetMarker,
    };
  }, [clampedSize, clampedValue, resolvedSweep, safeMax, safeMin, safeTarget, span, thresholds]);

  const activeBand =
    geometry.computedBands.find((band) => clampedValue <= band.to) ??
    geometry.computedBands[geometry.computedBands.length - 1]!;

  const inspectedBand = useMemo(() => {
    if (inspectedBandKey === null) return null;
    return geometry.computedBands.find((band) => band.key === inspectedBandKey) ?? null;
  }, [geometry.computedBands, inspectedBandKey]);

  const handleSelectBand = useCallback(
    (band: ComputedGaugeBand) => {
      setInspectedBandKey(band.key);
      onSelectBand?.(band.threshold);
    },
    [onSelectBand]
  );

  const handleBandKeyDown = useCallback(
    (band: ComputedGaugeBand) => (event: ReactKeyboardEvent<SVGPathElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectBand(band);
        return;
      }
      if (event.key === 'Escape') {
        setInspectedBandKey(null);
      }
    },
    [handleSelectBand]
  );

  const merged = mergeProps({
    themeTarget: themeProps('radial-gauge', {
      sweep: resolvedSweep,
      tone: activeBand.tone,
      hasTarget: safeTarget !== null,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const formattedHeadline = formatMetric(clampedValue, unit);
  const ariaValueText = label
    ? `${label}: ${formattedHeadline} (${activeBand.label})`
    : `${formattedHeadline} (${activeBand.label})`;
  const targetSummary =
    safeTarget !== null
      ? `Target ${formatMetric(safeTarget, unit)} (${formatSignedDelta(
          Number((clampedValue - safeTarget).toFixed(2)),
          unit
        )})`
      : `Range ${formatMetric(safeMin, unit)}–${formatMetric(safeMax, unit)}`;
  const isEmeraldStatus = activeBand.tone === 'emerald';
  const displayedBand = inspectedBand ?? activeBand;

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

        <span
          data-testid="radial-gauge-status"
          data-tone={activeBand.tone}
          className={cx(
            badgeClass,
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            isEmeraldStatus ? 'prism-emerald' : 'prism-crystal'
          )}
          style={isEmeraldStatus ? undefined : STYLE_TEXT_PRIMARY}
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: isEmeraldStatus
                ? 'var(--prism-success-contrast)'
                : activeBand.color,
            }}
          />
          <span>{activeBand.label}</span>
        </span>
      </div>

      <div className="flex items-center justify-center">
        <svg
          role="meter"
          aria-labelledby={headingId}
          aria-valuenow={clampedValue}
          aria-valuemin={safeMin}
          aria-valuemax={safeMax}
          aria-valuetext={ariaValueText}
          viewBox={`0 0 ${clampedSize} ${geometry.svgHeight}`}
          width={clampedSize}
          height={geometry.svgHeight}
          style={{ width: `${clampedSize}px`, height: `${geometry.svgHeight}px` }}
          className={cx(svgClass, 'block overflow-visible', 'prism-contain-leaf')}
        >
          <path
            data-testid="radial-gauge-track"
            d={geometry.trackPathD}
            fill="none"
            stroke="var(--prism-divider)"
            strokeWidth={geometry.strokeWidth}
            strokeLinecap="round"
          />

          {geometry.computedBands.map((band) => {
            const isInspected = inspectedBand?.key === band.key;
            return (
              <path
                key={band.key}
                d={band.pathD}
                fill="none"
                stroke={band.color}
                strokeWidth={geometry.strokeWidth}
                strokeOpacity={isInspected ? 0.52 : 0.28}
                role="button"
                tabIndex={0}
                aria-pressed={isInspected}
                aria-label={`${band.label} band: ${formatMetric(band.from, unit)} to ${formatMetric(band.to, unit)}`}
                data-band-label={band.label}
                data-band-tone={band.tone}
                data-selected={isInspected ? 'true' : 'false'}
                className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                onClick={() => handleSelectBand(band)}
                onFocus={() => setInspectedBandKey(band.key)}
                onKeyDown={handleBandKeyDown(band)}
              />
            );
          })}

          {geometry.progressPathD ? (
            <path
              data-testid="radial-gauge-progress"
              d={geometry.progressPathD}
              fill="none"
              stroke={activeBand.color}
              strokeWidth={geometry.progressStrokeWidth}
              strokeLinecap="round"
              pointerEvents="none"
            />
          ) : null}

          {geometry.targetMarker ? (
            <g data-testid="radial-gauge-target" pointerEvents="none">
              <line
                x1={geometry.targetMarker.inner.x}
                y1={geometry.targetMarker.inner.y}
                x2={geometry.targetMarker.outer.x}
                y2={geometry.targetMarker.outer.y}
                stroke="var(--prism-text-primary)"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <text
                x={geometry.targetMarker.labelPos.x}
                y={geometry.targetMarker.labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--prism-text-secondary)"
                className="text-[10px] font-mono font-semibold tabular-nums"
              >
                {formatMetric(geometry.targetMarker.value, unit)}
              </text>
            </g>
          ) : null}

          <g
            data-testid="radial-gauge-needle"
            data-angle={String(roundCoord(geometry.valueAngleDeg))}
            pointerEvents="none"
          >
            <path d={geometry.needlePathD} fill="var(--prism-text-primary)" />
            <circle
              cx={geometry.cxCoord}
              cy={geometry.cyCoord}
              r={7}
              fill="var(--prism-text-primary)"
            />
            <circle cx={geometry.cxCoord} cy={geometry.cyCoord} r={3} fill={activeBand.color} />
          </g>

          <g data-testid="radial-gauge-endpoints" pointerEvents="none">
            <text
              x={geometry.minTickPos.x}
              y={geometry.minTickPos.y}
              textAnchor="middle"
              fill="var(--prism-text-secondary)"
              className="text-[11px] font-mono tabular-nums"
            >
              {formatMetric(safeMin, unit)}
            </text>
            <text
              x={geometry.maxTickPos.x}
              y={geometry.maxTickPos.y}
              textAnchor="middle"
              fill="var(--prism-text-secondary)"
              className="text-[11px] font-mono tabular-nums"
            >
              {formatMetric(safeMax, unit)}
            </text>
          </g>

          <g data-testid="radial-gauge-value" pointerEvents="none">
            <text
              x={geometry.cxCoord}
              y={geometry.valueTextY}
              textAnchor="middle"
              fill="var(--prism-text-primary)"
              className="text-xl font-bold font-mono tabular-nums"
            >
              {formattedHeadline}
            </text>
            {label ? (
              <text
                x={geometry.cxCoord}
                y={geometry.labelTextY}
                textAnchor="middle"
                fill="var(--prism-text-secondary)"
                className="text-[11px] font-medium"
              >
                {label}
              </text>
            ) : null}
          </g>
        </svg>
      </div>

      <div
        data-testid="radial-gauge-footer"
        aria-live="polite"
        className={cx(
          footerClass,
          'prism-well rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums'
        )}
        style={STYLE_TEXT_PRIMARY}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: displayedBand.color }}
          />
          <span className="font-medium truncate">
            {inspectedBand
              ? `Band: ${inspectedBand.label} (${formatMetric(inspectedBand.from, unit)}–${formatMetric(inspectedBand.to, unit)})`
              : `Zone: ${activeBand.label} (${formatMetric(activeBand.from, unit)}–${formatMetric(activeBand.to, unit)})`}
          </span>
        </span>

        <span
          className="shrink-0 font-mono font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          {targetSummary}
        </span>
      </div>
    </div>
  );
}

export const RadialGauge = /*#__PURE__*/ memoWithDisplayName(RadialGaugeInner, 'RadialGauge');
