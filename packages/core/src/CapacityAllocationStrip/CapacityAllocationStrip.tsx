'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type AllocationTone =
  | 'primary'
  | 'secondary'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'info';

export interface CapacitySegment {
  /** Unique category identifier. */
  id: string;
  /** Human-readable category label displayed in pills and tooltips. */
  label: string;
  /** Consumed capacity amount in the configured unit (sanitized to finite value >= 0). */
  value: number;
  /** Semantic optical tone mapped exclusively to --prism-* CSS tokens. */
  tone?: AllocationTone;
  /** Optional concise breakdown detail surfaced in the telemetry footer when selected. */
  description?: string;
}

export interface CapacityAllocationStripProps extends BaseProps<HTMLDivElement> {
  /** Categorized capacity segments; defaults to 5 cluster storage segments when omitted. */
  segments?: ReadonlyArray<CapacitySegment>;
  /** Total capacity quota; defaults to 1000 or the sum of segments if higher. */
  total?: number;
  /** Display unit appended to formatted capacity amounts (defaults to 'GB'). */
  unit?: string;
  /** Utilization percentage (clamped 1..100) where the Near Capacity warning activates (defaults to 80). */
  warningThresholdPct?: number;
  /** Utilization percentage (clamped warningThresholdPct..100) where Critical Quota activates (defaults to 92). */
  criticalThresholdPct?: number;
  /** Visible panel title linked to the region via aria-labelledby (defaults to 'Cluster Storage Quota'). */
  title?: string;
  /** Callback invoked with the selected segment and its percentage share of total quota. */
  onSelectSegment?: (segment: CapacitySegment, sharePct: number) => void;
}

type QuotaHealth = 'healthy' | 'warning' | 'critical';

interface QuotaHealthMeta {
  label: string;
  colorToken: string;
}

interface ComputedSegment {
  key: string;
  id: string;
  label: string;
  value: number;
  tone: AllocationTone;
  colorToken: string;
  description?: string;
  sharePct: number;
  barWidthPct: number;
  original: CapacitySegment;
}

const DEFAULT_TITLE = 'Cluster Storage Quota';
const DEFAULT_UNIT = 'GB';
const DEFAULT_TOTAL_QUOTA = 1000;
const DEFAULT_WARNING_PCT = 80;
const DEFAULT_CRITICAL_PCT = 92;

const TONE_CYCLE: ReadonlyArray<AllocationTone> = [
  'primary',
  'secondary',
  'emerald',
  'info',
  'amber',
  'rose',
];

const DEFAULT_SEGMENTS: ReadonlyArray<CapacitySegment> = [
  {
    id: 'postgres-volumes',
    label: 'Postgres Volumes',
    value: 268,
    tone: 'primary',
    description: 'Primary transactional WAL & replica volumes',
  },
  {
    id: 'vector-index',
    label: 'Vector Index',
    value: 196,
    tone: 'secondary',
    description: 'HNSW embedding shards & hot memory-mapped indexes',
  },
  {
    id: 'media-assets',
    label: 'Media Assets',
    value: 142,
    tone: 'emerald',
    description: 'Object storage cache & transcoded media blobs',
  },
  {
    id: 'container-layers',
    label: 'Container Layers',
    value: 112,
    tone: 'info',
    description: 'Immutable OCI image layers & overlayfs snapshots',
  },
  {
    id: 'logs-traces',
    label: 'Logs & Traces',
    value: 66,
    tone: 'amber',
    description: 'Structured OpenTelemetry traces & audit ring buffers',
  },
];

const AMOUNT_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

function sanitizeAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value;
}

function formatAmount(value: number): string {
  return AMOUNT_FORMATTER.format(sanitizeAmount(value));
}

function formatPercent(pct: number): string {
  const safe = Number.isFinite(pct) && pct > 0 ? pct : 0;
  const rounded = Math.round(safe * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function getToneColorToken(tone: AllocationTone): string {
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
    case 'info':
      return 'var(--prism-info-main)';
  }
}

function getHealthMeta(health: QuotaHealth): QuotaHealthMeta {
  switch (health) {
    case 'critical':
      return {
        label: 'Critical Quota',
        colorToken: 'var(--prism-error-main)',
      };
    case 'warning':
      return {
        label: 'Near Capacity',
        colorToken: 'var(--prism-warning-main)',
      };
    case 'healthy':
      return {
        label: 'Healthy',
        colorToken: 'var(--prism-success-main)',
      };
  }
}

function resolveQuotaTotal(total: number | undefined, usedTotal: number): number {
  if (total === undefined) {
    return Math.max(DEFAULT_TOTAL_QUOTA, usedTotal);
  }
  if (!Number.isFinite(total) || total <= 0) {
    return usedTotal > 0 ? usedTotal : 0;
  }
  return total;
}

function CapacityAllocationStripInner({
  segments,
  total,
  unit = DEFAULT_UNIT,
  warningThresholdPct = DEFAULT_WARNING_PCT,
  criticalThresholdPct = DEFAULT_CRITICAL_PCT,
  title = DEFAULT_TITLE,
  onSelectSegment,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CapacityAllocationStripProps) {
  const headingId = useId();
  const override = useComponentOverride('CapacityAllocationStrip');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const safeTitle = title.trim() || DEFAULT_TITLE;
  const safeUnit = unit.trim() || DEFAULT_UNIT;
  const safeWarningPct = clampNumber(warningThresholdPct, 1, 100, DEFAULT_WARNING_PCT);
  const safeCriticalPct = clampNumber(
    criticalThresholdPct,
    safeWarningPct,
    100,
    Math.max(safeWarningPct, DEFAULT_CRITICAL_PCT)
  );

  const sourceSegments = segments ?? DEFAULT_SEGMENTS;

  const {
    computedSegments,
    usedTotal,
    quotaTotal,
    freeCapacity,
    usagePct,
    freeBarWidthPct,
    markerPositionPct,
    isEmpty,
  } = useMemo(() => {
    const keyCounts = new Map<string, number>();
    const prepared = sourceSegments.map((segment, idx) => {
      const cleanId = segment.id.trim() || `segment-${idx + 1}`;
      const seen = keyCounts.get(cleanId) ?? 0;
      keyCounts.set(cleanId, seen + 1);
      const key = seen === 0 ? cleanId : `${cleanId}-${seen + 1}`;
      const cleanLabel = segment.label.trim() || cleanId;
      const value = sanitizeAmount(segment.value);
      const tone = segment.tone ?? TONE_CYCLE[idx % TONE_CYCLE.length]!;
      const description = segment.description?.trim() || undefined;
      return {
        key,
        id: cleanId,
        label: cleanLabel,
        value,
        tone,
        colorToken: getToneColorToken(tone),
        description,
        original: segment,
      };
    });

    const sum = prepared.reduce((acc, item) => acc + item.value, 0);
    const resolvedTotal = resolveQuotaTotal(total, sum);

    if (resolvedTotal <= 0) {
      return {
        computedSegments: [] as ComputedSegment[],
        usedTotal: 0,
        quotaTotal: 0,
        freeCapacity: 0,
        usagePct: 0,
        freeBarWidthPct: 0,
        markerPositionPct: safeWarningPct,
        isEmpty: true,
      };
    }

    const barDenominator = Math.max(resolvedTotal, sum);
    const free = Math.max(0, resolvedTotal - sum);
    const computed: ComputedSegment[] = prepared.map((item) => ({
      ...item,
      sharePct: Number(((item.value / resolvedTotal) * 100).toFixed(1)),
      barWidthPct: (item.value / barDenominator) * 100,
    }));

    return {
      computedSegments: computed,
      usedTotal: sum,
      quotaTotal: resolvedTotal,
      freeCapacity: free,
      usagePct: (sum / resolvedTotal) * 100,
      freeBarWidthPct: (free / barDenominator) * 100,
      markerPositionPct: clampNumber(
        (resolvedTotal / barDenominator) * safeWarningPct,
        0,
        100,
        safeWarningPct
      ),
      isEmpty: false,
    };
  }, [sourceSegments, total, safeWarningPct]);

  const activeSelection = useMemo<ComputedSegment | null>(() => {
    if (selectedKey === null) return null;
    return computedSegments.find((segment) => segment.key === selectedKey) ?? null;
  }, [computedSegments, selectedKey]);

  const health: QuotaHealth =
    usagePct >= safeCriticalPct
      ? 'critical'
      : usagePct >= safeWarningPct
        ? 'warning'
        : 'healthy';

  const healthMeta = getHealthMeta(health);
  const hasSelection = activeSelection !== null;

  const handleSelectSegment = useCallback(
    (segment: ComputedSegment) => {
      setSelectedKey(segment.key);
      onSelectSegment?.(segment.original, segment.sharePct);
    },
    [onSelectSegment]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedKey(null);
  }, []);

  const handleSegmentKeyDown = useCallback(
    (segment: ComputedSegment) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectSegment(segment);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleClearSelection();
      }
    },
    [handleClearSelection, handleSelectSegment]
  );

  const merged = mergeProps({
    themeTarget: themeProps('capacity-allocation-strip', {
      health: isEmpty ? 'empty' : health,
      empty: isEmpty,
      selectedSegment: activeSelection?.id,
    }),
    baseClassName: 'prism-slab p-4 w-full max-w-full min-w-0 space-y-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('capacity-allocation-strip', 'header');
  const barClass = stableClassName('capacity-allocation-strip', 'bar');
  const pillsClass = stableClassName('capacity-allocation-strip', 'pills');
  const footerClass = stableClassName('capacity-allocation-strip', 'footer');

  const positiveBarSegments = useMemo(
    () => computedSegments.filter((segment) => segment.value > 0),
    [computedSegments]
  );

  const formattedUsed = formatAmount(usedTotal);
  const formattedFree = formatAmount(freeCapacity);
  const formattedTotal = formatAmount(quotaTotal);
  const formattedUsagePct = formatPercent(usagePct);
  const usageSummaryText = `${formattedUsed} / ${formattedTotal} ${safeUnit} · ${formattedUsagePct}`;
  const ariaProgressValue = Math.min(100, Math.round(usagePct));

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      {/* Sculpted Optical Header */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={{
              color: isEmpty ? 'var(--prism-text-secondary)' : healthMeta.colorToken,
            }}
          >
            <HardDrive aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          </span>
          <h3
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {safeTitle}
          </h3>
        </div>

        {!isEmpty ? (
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            <span
              data-testid="capacity-usage-badge"
              className="prism-well rounded-full px-2.5 py-1 font-mono text-xs font-medium tabular-nums max-w-full truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {usageSummaryText}
            </span>

            <span
              data-testid="capacity-quota-badge"
              data-health={health}
              className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight shrink-0"
              style={{
                color: healthMeta.colorToken,
                borderColor: healthMeta.colorToken,
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
            >
              {health === 'critical' ? (
                <AlertOctagon aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              ) : health === 'warning' ? (
                <AlertTriangle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{healthMeta.label}</span>
            </span>
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="capacity-allocation-empty"
          className="prism-well rounded-2xl px-4 py-5 flex flex-col items-center justify-center text-center gap-1.5 min-w-0 max-w-full"
          style={STYLE_TEXT_SECONDARY}
        >
          <HardDrive aria-hidden="true" className="w-5 h-5 shrink-0 opacity-75" />
          <p className="text-xs font-semibold" style={STYLE_TEXT_PRIMARY}>
            No capacity quota configured
          </p>
          <p className="text-xs">
            Provide a positive total quota or storage allocation segments to track utilization.
          </p>
        </div>
      ) : (
        <>
          {/* Accessible progress readout + threshold legend */}
          <div className="space-y-1.5 min-w-0 max-w-full">
            <div
              role="progressbar"
              aria-labelledby={headingId}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={ariaProgressValue}
              aria-valuetext={usageSummaryText}
              data-testid="capacity-progressbar"
              className="flex flex-wrap items-center justify-between gap-2 text-[11px] min-w-0 max-w-full"
              style={STYLE_TEXT_SECONDARY}
            >
              <span className="font-mono tabular-nums">
                Allocated {formattedUsagePct} · Free {formatPercent(100 - Math.min(100, usagePct))}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums shrink-0">
                <span
                  aria-hidden="true"
                  className="inline-block w-3 border-t-2 border-dashed"
                  style={{ borderColor: 'var(--prism-warning-main)' }}
                />
                <span>
                  Warn {formatPercent(safeWarningPct)} · Crit {formatPercent(safeCriticalPct)}
                </span>
              </span>
            </div>

            {/* Segmented Horizontal Optical Bar */}
            <div
              role="group"
              aria-label={`${safeTitle} segmented allocation bar`}
              data-testid="capacity-bar"
              className={cx(
                barClass,
                'prism-well rounded-full h-5 relative overflow-hidden flex w-full min-w-0 max-w-full'
              )}
            >
              {positiveBarSegments.map((segment) => {
                const isSelected = activeSelection?.key === segment.key;
                return (
                  <button
                    key={segment.key}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${segment.label}: ${formatAmount(segment.value)} ${safeUnit} (${formatPercent(segment.sharePct)})`}
                    data-testid={`capacity-bar-segment-${segment.key}`}
                    data-segment-id={segment.id}
                    data-tone={segment.tone}
                    data-selected={isSelected ? 'true' : undefined}
                    onClick={() => handleSelectSegment(segment)}
                    onKeyDown={handleSegmentKeyDown(segment)}
                    className={cx(
                      'h-full relative shrink-0 cursor-pointer border-0 p-0 transition-[color,background-color,border-color,opacity,transform] duration-150 prism-focus-ring first:rounded-l-full',
                      isSelected
                        ? 'z-10 brightness-110'
                        : hasSelection
                          ? 'opacity-55 hover:opacity-90'
                          : 'hover:brightness-105'
                    )}
                    style={{
                      width: `${segment.barWidthPct}%`,
                      backgroundColor: segment.colorToken,
                      boxShadow: isSelected
                        ? 'inset 0 0 0 2px var(--prism-text-primary)'
                        : 'inset -1px 0 0 var(--prism-well-start)',
                    }}
                  />
                );
              })}

              {freeBarWidthPct > 0 ? (
                <div
                  aria-hidden="true"
                  data-testid="capacity-bar-free"
                  className="h-full shrink-0"
                  style={{
                    width: `${freeBarWidthPct}%`,
                    backgroundImage:
                      'repeating-linear-gradient(-45deg, transparent 0px, transparent 5px, var(--prism-divider) 5px, var(--prism-divider) 7px)',
                  }}
                />
              ) : null}

              {/* Crisp Vertical Dashed Warning Threshold Marker */}
              <span
                aria-hidden="true"
                data-testid="capacity-warning-marker"
                data-threshold-pct={String(safeWarningPct)}
                className="pointer-events-none absolute top-0 bottom-0 z-20"
                style={{
                  left: `${markerPositionPct}%`,
                  borderLeftWidth: '2px',
                  borderLeftStyle: 'dashed',
                  borderLeftColor: 'var(--prism-warning-main)',
                }}
              />
            </div>
          </div>

          {/* Interactive Category Breakdown Pills */}
          {computedSegments.length > 0 ? (
            <div
              role="group"
              aria-label="Category allocation breakdown"
              data-testid="capacity-category-pills"
              className={cx(pillsClass, 'flex flex-wrap gap-2 min-w-0 max-w-full')}
            >
              {computedSegments.map((segment) => {
                const isSelected = activeSelection?.key === segment.key;
                return (
                  <button
                    key={segment.key}
                    type="button"
                    aria-pressed={isSelected}
                    data-testid={`capacity-pill-${segment.key}`}
                    data-segment-id={segment.id}
                    data-tone={segment.tone}
                    data-selected={isSelected ? 'true' : undefined}
                    onClick={() => handleSelectSegment(segment)}
                    onKeyDown={handleSegmentKeyDown(segment)}
                    className={cx(
                      'prism-crystal inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform] duration-150 prism-focus-ring min-w-0 max-w-full',
                      isSelected
                        ? 'font-semibold'
                        : hasSelection
                          ? 'opacity-70 hover:opacity-100'
                          : 'hover:brightness-105'
                    )}
                    style={{
                      color: 'var(--prism-text-primary)',
                      borderColor: isSelected ? segment.colorToken : 'var(--prism-divider)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      backgroundColor: isSelected
                        ? `color-mix(in srgb, ${segment.colorToken} 16%, transparent)`
                        : undefined,
                      boxShadow: isSelected ? `0 0 0 1px ${segment.colorToken}` : undefined,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: segment.colorToken }}
                    />
                    <span className="truncate max-w-[12rem]">{segment.label}</span>
                    <span
                      className="font-mono tabular-nums shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {formatAmount(segment.value)} {safeUnit}
                    </span>
                    <span
                      className="font-mono tabular-nums font-semibold shrink-0"
                      style={{ color: segment.colorToken }}
                    >
                      {formatPercent(segment.sharePct)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              data-testid="capacity-no-segments"
              className="prism-well rounded-2xl px-3.5 py-2.5 text-xs min-w-0 max-w-full"
              style={STYLE_TEXT_SECONDARY}
            >
              No allocated categories — {formattedFree} {safeUnit} free space available.
            </div>
          )}

          {/* Recessed Live Telemetry Footer */}
          <div
            aria-live="polite"
            data-testid="capacity-telemetry-footer"
            className={cx(
              footerClass,
              'prism-well rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0 max-w-full'
            )}
            style={STYLE_TEXT_SECONDARY}
          >
            <div className="flex flex-wrap items-center gap-1.5 font-mono tabular-nums min-w-0 max-w-full">
              <span>
                Used{' '}
                <strong style={STYLE_TEXT_PRIMARY}>
                  {formattedUsed} {safeUnit}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Free{' '}
                <strong style={STYLE_TEXT_PRIMARY}>
                  {formattedFree} {safeUnit}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Total{' '}
                <strong style={STYLE_TEXT_PRIMARY}>
                  {formattedTotal} {safeUnit}
                </strong>
              </span>
            </div>

            <div
              data-testid="capacity-selected-breakdown"
              className="flex flex-wrap items-center gap-2 min-w-0 max-w-full"
            >
              {activeSelection ? (
                <>
                  <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: activeSelection.colorToken }}
                    />
                    <span
                      className="font-semibold truncate"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {activeSelection.label}
                    </span>
                    <span className="font-mono tabular-nums shrink-0">
                      {formatAmount(activeSelection.value)} {safeUnit} (
                      {formatPercent(activeSelection.sharePct)})
                    </span>
                    {activeSelection.description ? (
                      <span className="truncate min-w-0">· {activeSelection.description}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    aria-label="Clear selected segment"
                    data-testid="capacity-clear-selection"
                    onClick={handleClearSelection}
                    className="prism-crystal inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium cursor-pointer prism-focus-ring shrink-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <X aria-hidden="true" className="w-3 h-3 shrink-0" />
                    <span>Clear</span>
                  </button>
                </>
              ) : (
                <span>Select any segment or pill for category breakdown</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const CapacityAllocationStrip = memo(CapacityAllocationStripInner);
CapacityAllocationStrip.displayName = 'CapacityAllocationStrip';
