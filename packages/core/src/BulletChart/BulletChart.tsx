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

export type BulletTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface BulletChartItem {
  /** Stable unique identifier for this KPI bullet row. */
  id: string;
  /** Primary metric heading shown on the row and in the telemetry strip. */
  label: string;
  /** Optional contextual subtitle displayed beside or beneath the metric label. */
  subtitle?: string;
  /** Current achieved value (non-finite or negative values safely clamp to 0). */
  actual: number;
  /** Target threshold value marked by the crisp vertical bar (non-finite or negative clamp to 0). */
  target: number;
  /** Optional explicit upper scale bound; expands automatically if smaller than data or ranges. */
  max?: number;
  /** Optional qualitative range cutoffs [poorMax, satisfactoryMax, goodMax]; defaults to [0.5, 0.8, 1] of scaleMax. */
  ranges?: [number, number, number];
  /** Optional unit suffix appended to actual and target values (e.g. '%', 'k', 'ms'). */
  unit?: string;
  /** Optional semantic optical tone for the actual measure bar (cycles when omitted). */
  tone?: BulletTone;
}

export interface BulletChartProps extends BaseProps<HTMLDivElement> {
  /** Ordered list of target-performance KPI metrics rendered as horizontal bullet tracks. */
  items: BulletChartItem[];
  /** Chart card heading (defaults to 'Target Performance Bullet Chart'). */
  title?: string;
  /** Displays actual-vs-target percentage variance badges on each row (defaults to true). */
  showVariance?: boolean;
  /** Callback fired when a user clicks or activates a metric row via keyboard. */
  onSelectItem?: (item: BulletChartItem, achievementPct: number) => void;
}

type BulletBandStatus = 'Below Plan' | 'On Track' | 'Exceeding Target';
type BulletBandSlug = 'below-plan' | 'on-track' | 'exceeding-target';
type VarianceTone = 'emerald' | 'amber' | 'rose';

interface NormalizedBulletItem {
  key: string;
  index: number;
  item: BulletChartItem;
  id: string;
  label: string;
  subtitle?: string;
  unit?: string;
  actual: number;
  target: number;
  scaleMax: number;
  ranges: [number, number, number];
  tone: BulletTone;
  color: string;
  poorWidthPct: number;
  satisfactoryEndPct: number;
  satisfactoryWidthPct: number;
  goodWidthPct: number;
  actualWidthPct: number;
  targetPct: number;
  achievementPct: number;
  variancePct: number;
  band: BulletBandStatus;
  bandSlug: BulletBandSlug;
  varianceTone: VarianceTone;
}

const TRACK_HEIGHT = 28;
const BAND_Y = 4;
const BAND_HEIGHT = 20;
const MEASURE_Y = 9;
const MEASURE_HEIGHT = 10;
const TARGET_Y1 = 2;
const TARGET_Y2 = 26;

const TONE_CYCLE: ReadonlyArray<BulletTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'rose',
];

const TONE_TOKEN_MAP: Record<BulletTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  rose: 'var(--prism-error-main)',
};

const BAND_SLUG_MAP: Record<BulletBandStatus, BulletBandSlug> = {
  'Below Plan': 'below-plan',
  'On Track': 'on-track',
  'Exceeding Target': 'exceeding-target',
};

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function sanitizeNonNegative(raw: number): number {
  if (!Number.isFinite(raw) || raw < 0) {
    return 0;
  }
  return normalizeZero(raw);
}

function roundOneDecimal(value: number): number {
  return normalizeZero(Math.round(value * 10) / 10);
}

function formatNumeric(value: number): string {
  const safe = normalizeZero(value);
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(2)));
}

function formatMetric(value: number, unit?: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
}

function formatVarianceBadge(variancePct: number): string {
  const safe = normalizeZero(variancePct);
  if (safe > 0) {
    return `+${formatNumeric(safe)}%`;
  }
  if (safe < 0) {
    return `${formatNumeric(safe)}%`;
  }
  return '0%';
}

function computeScaleAndRanges(
  actual: number,
  target: number,
  rawMax: number | undefined,
  rawRanges: [number, number, number] | undefined
): { scaleMax: number; ranges: [number, number, number] } {
  const explicitMax = rawMax !== undefined ? sanitizeNonNegative(rawMax) : 0;
  const sanitizedRanges: [number, number, number] | null = rawRanges
    ? [
        sanitizeNonNegative(rawRanges[0]),
        sanitizeNonNegative(rawRanges[1]),
        sanitizeNonNegative(rawRanges[2]),
      ]
    : null;

  const hasPositiveRange =
    sanitizedRanges !== null &&
    (sanitizedRanges[0] > 0 || sanitizedRanges[1] > 0 || sanitizedRanges[2] > 0);

  const maxRange = hasPositiveRange
    ? Math.max(sanitizedRanges[0], sanitizedRanges[1], sanitizedRanges[2])
    : 0;

  const candidateMax = Math.max(actual, target, explicitMax, maxRange);
  const scaleMax = candidateMax > 0 ? candidateMax : 1;

  if (!hasPositiveRange) {
    return {
      scaleMax,
      ranges: [0.5 * scaleMax, 0.8 * scaleMax, scaleMax],
    };
  }

  const sorted = [...sanitizedRanges].sort((a, b) => a - b);
  const poorEnd = clampNumber(sorted[0]!, 0, scaleMax, 0);
  const satisfactoryEnd = clampNumber(sorted[1]!, poorEnd, scaleMax, scaleMax);
  const goodEnd = clampNumber(sorted[2]!, satisfactoryEnd, scaleMax, scaleMax);

  return {
    scaleMax,
    ranges: [poorEnd, satisfactoryEnd, goodEnd],
  };
}

function classifyBand(actual: number, target: number, poorEnd: number): BulletBandStatus {
  if (actual > target) {
    return 'Exceeding Target';
  }
  if (actual < target && (actual < poorEnd || actual === 0)) {
    return 'Below Plan';
  }
  return 'On Track';
}

function resolveVarianceTone(
  actual: number,
  target: number,
  band: BulletBandStatus
): VarianceTone {
  if (actual >= target) {
    return 'emerald';
  }
  return band === 'Below Plan' ? 'rose' : 'amber';
}

function getTelemetryBandAppearance(
  band: BulletBandStatus,
  varianceTone: VarianceTone
): { className: string; color?: string } {
  if (band === 'Exceeding Target') {
    return { className: 'prism-emerald' };
  }
  if (band === 'Below Plan') {
    return { className: 'prism-crystal', color: 'var(--prism-error-main)' };
  }
  return {
    className: 'prism-crystal',
    color:
      varianceTone === 'emerald'
        ? 'var(--prism-success-main)'
        : 'var(--prism-warning-main)',
  };
}

export function BulletChart({
  items,
  title = 'Target Performance Bullet Chart',
  showVariance = true,
  onSelectItem,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: BulletChartProps) {
  const headingId = useId();
  const clipBaseId = useId();
  const override = useComponentOverride('BulletChart');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const isEmpty = items.length === 0;

  const normalizedItems = useMemo<NormalizedBulletItem[]>(() => {
    if (items.length === 0) return [];

    const result: NormalizedBulletItem[] = [];
    for (let idx = 0; idx < items.length; idx += 1) {
      const item = items[idx]!;
      const actual = sanitizeNonNegative(item.actual);
      const target = sanitizeNonNegative(item.target);
      const { scaleMax, ranges } = computeScaleAndRanges(actual, target, item.max, item.ranges);

      const tone: BulletTone =
        item.tone ?? (TONE_CYCLE[idx % TONE_CYCLE.length] as BulletTone);
      const color = TONE_TOKEN_MAP[tone];

      const poorEndPct = roundOneDecimal(clampNumber((ranges[0] / scaleMax) * 100, 0, 100, 0));
      const satisfactoryEndPct = roundOneDecimal(
        clampNumber((ranges[1] / scaleMax) * 100, poorEndPct, 100, 100)
      );
      const goodEndPct = roundOneDecimal(
        clampNumber((ranges[2] / scaleMax) * 100, satisfactoryEndPct, 100, 100)
      );
      const poorWidthPct = poorEndPct;
      const satisfactoryWidthPct = roundOneDecimal(Math.max(0, satisfactoryEndPct - poorEndPct));
      const goodWidthPct = roundOneDecimal(Math.max(0, goodEndPct - satisfactoryEndPct));
      const actualWidthPct = roundOneDecimal(clampNumber((actual / scaleMax) * 100, 0, 100, 0));
      const targetPct = roundOneDecimal(clampNumber((target / scaleMax) * 100, 0, 100, 0));

      const achievementPct = target > 0 ? roundOneDecimal((actual / target) * 100) : 0;
      const variancePct =
        target > 0 ? roundOneDecimal(((actual - target) / target) * 100) : 0;
      const band = classifyBand(actual, target, ranges[0]);
      const varianceTone = resolveVarianceTone(actual, target, band);

      result.push({
        key: `bullet-${item.id}-${idx}`,
        index: idx,
        item,
        id: item.id,
        label: item.label,
        subtitle: item.subtitle,
        unit: item.unit,
        actual,
        target,
        scaleMax,
        ranges,
        tone,
        color,
        poorWidthPct,
        satisfactoryEndPct,
        satisfactoryWidthPct,
        goodWidthPct,
        actualWidthPct,
        targetPct,
        achievementPct,
        variancePct,
        band,
        bandSlug: BAND_SLUG_MAP[band],
        varianceTone,
      });
    }

    return result;
  }, [items]);

  const selectedItem = useMemo<NormalizedBulletItem | null>(() => {
    if (!selectedItemId) return null;
    return normalizedItems.find((entry) => entry.id === selectedItemId) ?? null;
  }, [normalizedItems, selectedItemId]);

  const handleSelectItem = useCallback(
    (entry: NormalizedBulletItem) => {
      setSelectedItemId(entry.id);
      onSelectItem?.(entry.item, entry.achievementPct);
    },
    [onSelectItem]
  );

  const handleItemKeyDown = useCallback(
    (entry: NormalizedBulletItem) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectItem(entry);
      }
    },
    [handleSelectItem]
  );

  const merged = mergeProps({
    themeTarget: themeProps('bullet-chart', {
      empty: isEmpty,
      variance: showVariance,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('bullet-chart', 'header');
  const legendClass = stableClassName('bullet-chart', 'legend');
  const rowsClass = stableClassName('bullet-chart', 'rows');
  const trackClass = stableClassName('bullet-chart', 'track');
  const telemetryClass = stableClassName('bullet-chart', 'telemetry');

  const itemCountLabel = `${normalizedItems.length} ${normalizedItems.length === 1 ? 'metric' : 'metrics'}`;
  const selectedBandAppearance = selectedItem
    ? getTelemetryBandAppearance(selectedItem.band, selectedItem.varianceTone)
    : null;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'space-y-2.5')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h4
              id={headingId}
              className="text-sm font-semibold tracking-tight"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {title}
            </h4>
            <span
              data-testid="bullet-count-badge"
              className="prism-crystal px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tabular-nums"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {itemCountLabel}
            </span>
          </div>

          <div
            data-testid="bullet-legend"
            aria-label="Qualitative range and target legend"
            className={cx(legendClass, 'flex flex-wrap items-center gap-2 text-[11px]')}
          >
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: 'var(--prism-text-secondary)', opacity: 0.34 }}
              />
              <span>Poor</span>
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: 'var(--prism-text-secondary)', opacity: 0.18 }}
              />
              <span>Satisfactory</span>
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: 'var(--prism-divider)', opacity: 0.9 }}
              />
              <span>Good</span>
            </span>
            <span
              className="inline-flex items-center gap-1.5 font-medium"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <span
                aria-hidden="true"
                className="w-0.5 h-3 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--prism-text-primary)' }}
              />
              <span>Target</span>
            </span>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="bullet-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No bullet chart metrics to display.
        </div>
      ) : (
        <div data-testid="bullet-rows" className={cx(rowsClass, 'space-y-2.5')}>
          {normalizedItems.map((entry) => {
            const isSelected = selectedItem?.id === entry.id;
            const clipId = `${clipBaseId}-clip-${entry.index}`;
            const actualFormatted = formatMetric(entry.actual, entry.unit);
            const targetFormatted = formatMetric(entry.target, entry.unit);

            return (
              <button
                key={entry.key}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${entry.label}: ${actualFormatted} / ${targetFormatted} (${formatNumeric(entry.achievementPct)}% of target, ${entry.band})`}
                data-item-id={entry.id}
                data-selected={isSelected ? 'true' : 'false'}
                data-band={entry.bandSlug}
                onClick={() => handleSelectItem(entry)}
                onKeyDown={handleItemKeyDown(entry)}
                className={cx(
                  'prism-focus-ring w-full rounded-2xl p-3 text-left cursor-pointer transition-all duration-150 space-y-2',
                  isSelected ? 'prism-crystal' : 'prism-well opacity-95 hover:opacity-100'
                )}
                style={{
                  border: isSelected
                    ? `1.5px solid ${entry.color}`
                    : '1px solid var(--prism-divider)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span
                      className="inline-flex items-center gap-2 font-semibold min-w-0"
                      style={{ color: 'var(--prism-text-primary)' }}
                    >
                      <span
                        aria-hidden="true"
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="truncate">{entry.label}</span>
                    </span>
                    {entry.subtitle ? (
                      <span
                        data-testid={`bullet-subtitle-${entry.id}`}
                        className="text-[11px] pl-4.5 truncate"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {entry.subtitle}
                      </span>
                    ) : null}
                  </div>

                  <div className="inline-flex items-center gap-2 shrink-0">
                    <span
                      data-testid={`bullet-readout-${entry.id}`}
                      className="font-mono font-semibold tabular-nums"
                      style={{ color: 'var(--prism-text-primary)' }}
                    >
                      {`${actualFormatted} / ${targetFormatted}`}
                    </span>

                    {showVariance ? (
                      <span
                        data-testid={`bullet-variance-${entry.id}`}
                        data-variance-tone={entry.varianceTone}
                        className={cx(
                          'px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold tabular-nums',
                          entry.varianceTone === 'emerald' ? 'prism-emerald' : 'prism-crystal'
                        )}
                        style={
                          entry.varianceTone === 'emerald'
                            ? undefined
                            : {
                                color:
                                  entry.varianceTone === 'rose'
                                    ? 'var(--prism-error-main)'
                                    : 'var(--prism-warning-main)',
                                border:
                                  entry.varianceTone === 'rose'
                                    ? '1px solid var(--prism-error-main)'
                                    : '1px solid var(--prism-warning-main)',
                              }
                        }
                      >
                        {formatVarianceBadge(entry.variancePct)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <svg
                  role="img"
                  aria-label={`${entry.label} bullet track: actual ${actualFormatted} against target ${targetFormatted}`}
                  data-testid={`bullet-track-${entry.id}`}
                  width="100%"
                  height={TRACK_HEIGHT}
                  className={cx(trackClass, 'w-full block overflow-visible')}
                >
                  <defs>
                    <clipPath id={clipId}>
                      <rect x="0" y={BAND_Y} width="100%" height={BAND_HEIGHT} rx={6} />
                    </clipPath>
                  </defs>

                  <rect
                    x="0"
                    y={BAND_Y}
                    width="100%"
                    height={BAND_HEIGHT}
                    rx={6}
                    fill="var(--prism-divider)"
                    fillOpacity={0.35}
                  />

                  <g clipPath={`url(#${clipId})`}>
                    <rect
                      data-testid={`bullet-band-poor-${entry.id}`}
                      data-range-end={String(entry.ranges[0])}
                      x="0%"
                      y={BAND_Y}
                      width={`${entry.poorWidthPct}%`}
                      height={BAND_HEIGHT}
                      fill="var(--prism-text-secondary)"
                      fillOpacity={0.34}
                    />
                    <rect
                      data-testid={`bullet-band-satisfactory-${entry.id}`}
                      data-range-end={String(entry.ranges[1])}
                      x={`${entry.poorWidthPct}%`}
                      y={BAND_Y}
                      width={`${entry.satisfactoryWidthPct}%`}
                      height={BAND_HEIGHT}
                      fill="var(--prism-text-secondary)"
                      fillOpacity={0.18}
                    />
                    <rect
                      data-testid={`bullet-band-good-${entry.id}`}
                      data-range-end={String(entry.ranges[2])}
                      x={`${entry.satisfactoryEndPct}%`}
                      y={BAND_Y}
                      width={`${entry.goodWidthPct}%`}
                      height={BAND_HEIGHT}
                      fill="var(--prism-divider)"
                      fillOpacity={0.9}
                    />
                  </g>

                  <rect
                    data-testid={`bullet-actual-${entry.id}`}
                    data-width-pct={String(entry.actualWidthPct)}
                    x="0%"
                    y={MEASURE_Y}
                    width={`${entry.actualWidthPct}%`}
                    height={MEASURE_HEIGHT}
                    rx={4}
                    fill={entry.color}
                    fillOpacity={isSelected ? 1 : 0.9}
                  />

                  <line
                    data-testid={`bullet-target-${entry.id}`}
                    data-target-pct={String(entry.targetPct)}
                    x1={`${entry.targetPct}%`}
                    y1={TARGET_Y1}
                    x2={`${entry.targetPct}%`}
                    y2={TARGET_Y2}
                    stroke="var(--prism-text-primary)"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            );
          })}
        </div>
      )}

      {!isEmpty ? (
        <div
          data-testid="bullet-telemetry"
          aria-live="polite"
          className={cx(
            telemetryClass,
            'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums'
          )}
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {selectedItem && selectedBandAppearance ? (
            <>
              <div className="inline-flex flex-wrap items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: selectedItem.color }}
                />
                <span className="font-semibold truncate">{selectedItem.label}</span>
                <span
                  data-testid="bullet-telemetry-band"
                  className={cx(
                    'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                    selectedBandAppearance.className
                  )}
                  style={
                    selectedBandAppearance.color
                      ? { color: selectedBandAppearance.color }
                      : undefined
                  }
                >
                  {selectedItem.band}
                </span>
              </div>

              <span
                data-testid="bullet-telemetry-metrics"
                className="font-mono font-medium tabular-nums"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {`Actual ${formatMetric(selectedItem.actual, selectedItem.unit)} · Target ${formatMetric(selectedItem.target, selectedItem.unit)} · ${formatNumeric(selectedItem.achievementPct)}% achieved`}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--prism-text-secondary)' }}>
              Select any metric row to inspect qualitative band classification, actual vs. target, and achievement percentage.
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

BulletChart.displayName = 'BulletChart';
