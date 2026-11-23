'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type UptimeDayState =
  | 'operational'
  | 'degraded'
  | 'outage'
  | 'maintenance';

export interface UptimeDaySlot {
  /** Stable identifier for the day slot. */
  id: string;
  /** Human-readable calendar date label (e.g., 'Nov 21'). */
  dateLabel: string;
  /** Semantic service health state for the day. */
  state: UptimeDayState;
  /** Daily uptime percentage in the range 0..100. */
  uptimePct: number;
  /** Optional incident description shown in the recessed readout. */
  incidentSummary?: string;
  /** Optional recorded downtime duration in minutes (0..1440). */
  downtimeMinutes?: number;
}

export interface UptimeStatusBarProps extends BaseProps<HTMLDivElement> {
  /** Monitored service name rendered in the panel header (defaults to 'Core API Edge Gateway'). */
  serviceName?: string;
  /** Daily uptime history rendered left-to-right (defaults to 60-day history; pass [] for empty state). */
  days?: ReadonlyArray<UptimeDaySlot>;
  /** Target SLA uptime percentage clamped to 50..100 (defaults to 99.9). */
  slaTargetPct?: number;
  /** Callback fired when a user clicks or keyboard-activates/navigates to a day bar. */
  onSelectDay?: (day: UptimeDaySlot, index: number) => void;
}

type SlaHealth = 'met' | 'warning' | 'breach';

interface StateVisualMeta {
  label: string;
  colorVar: string;
  defaultSummary: string;
}

interface NormalizedUptimeDay {
  key: string;
  index: number;
  slot: UptimeDaySlot;
  uptimePct: number;
  downtimeMinutes: number;
  summary: string;
  hasIncident: boolean;
}

interface ReadyUptimeView {
  days: ReadonlyArray<NormalizedUptimeDay>;
  firstDay: NormalizedUptimeDay;
  latestDay: NormalizedUptimeDay;
  activeDay: NormalizedUptimeDay;
  overallUptimePct: number;
  slaHealth: SlaHealth;
}

const DEFAULT_SERVICE_NAME = 'Core API Edge Gateway';
const DEFAULT_SLA_TARGET_PCT = 99.9;
const MIN_SLA_TARGET_PCT = 50;
const MAX_SLA_TARGET_PCT = 100;
const SLA_WARNING_MARGIN_PCT = 1;
const MAX_MINUTES_PER_DAY = 1440;
const MS_PER_DAY = 86_400_000;
const DEFAULT_ANCHOR_UTC_MS = Date.UTC(2026, 10, 21);

const STATE_META: Record<UptimeDayState, StateVisualMeta> = {
  operational: {
    label: 'Operational',
    colorVar: 'var(--prism-success-main)',
    defaultSummary: 'All systems operational; no incidents reported.',
  },
  degraded: {
    label: 'Degraded',
    colorVar: 'var(--prism-warning-main)',
    defaultSummary: 'Degraded performance observed during this window.',
  },
  outage: {
    label: 'Outage',
    colorVar: 'var(--prism-error-main)',
    defaultSummary: 'Service interruption detected during this window.',
  },
  maintenance: {
    label: 'Maintenance',
    colorVar: 'var(--prism-info-main)',
    defaultSummary: 'Scheduled maintenance window completed.',
  },
};

const SLA_COLOR_VAR: Record<SlaHealth, string> = {
  met: 'var(--prism-success-main)',
  warning: 'var(--prism-warning-main)',
  breach: 'var(--prism-error-main)',
};

function formatUtcDayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatUtcIsoId(ms: number): string {
  const date = new Date(ms);
  const yyyy = String(date.getUTCFullYear()).padStart(4, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildDefaultUptimeDays(): ReadonlyArray<UptimeDaySlot> {
  const totalDays = 60;
  const incidentPresets = new Map<
    number,
    Pick<UptimeDaySlot, 'state' | 'uptimePct' | 'downtimeMinutes' | 'incidentSummary'>
  >([
    [
      17,
      {
        state: 'degraded',
        uptimePct: 99.65,
        downtimeMinutes: 5,
        incidentSummary:
          'Elevated TLS handshake latency in us-east edge POPs; traffic rerouted automatically.',
      },
    ],
    [
      33,
      {
        state: 'outage',
        uptimePct: 97.55,
        downtimeMinutes: 35,
        incidentSummary:
          'Minor regional ingress failover interrupted edge routing during BGP convergence.',
      },
    ],
    [
      45,
      {
        state: 'degraded',
        uptimePct: 99.2,
        downtimeMinutes: 12,
        incidentSummary:
          'Transient upstream cache invalidation lag caused elevated p99 gateway latency.',
      },
    ],
  ]);

  const slots: UptimeDaySlot[] = [];
  for (let i = 0; i < totalDays; i += 1) {
    const ms = DEFAULT_ANCHOR_UTC_MS - (totalDays - 1 - i) * MS_PER_DAY;
    const preset = incidentPresets.get(i);
    if (preset) {
      slots.push({
        id: formatUtcIsoId(ms),
        dateLabel: formatUtcDayLabel(ms),
        ...preset,
      });
    } else {
      slots.push({
        id: formatUtcIsoId(ms),
        dateLabel: formatUtcDayLabel(ms),
        state: 'operational',
        uptimePct: 100,
      });
    }
  }
  return slots;
}

const DEFAULT_UPTIME_DAYS: ReadonlyArray<UptimeDaySlot> = buildDefaultUptimeDays();

function formatUptimePct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatSlaPct(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

function formatDowntime(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded <= 0) {
    return '0m downtime';
  }
  if (rounded < 60) {
    return `${rounded}m downtime`;
  }
  const hours = Math.floor(rounded / 60);
  const rem = rounded % 60;
  return rem === 0 ? `${hours}h downtime` : `${hours}h ${rem}m downtime`;
}

function resolveSlaHealth(overallPct: number, slaTargetPct: number): SlaHealth {
  if (overallPct >= slaTargetPct) {
    return 'met';
  }
  if (overallPct >= slaTargetPct - SLA_WARNING_MARGIN_PCT) {
    return 'warning';
  }
  return 'breach';
}

function renderStateIcon(state: UptimeDayState, iconClassName: string) {
  switch (state) {
    case 'operational':
      return <CheckCircle2 aria-hidden="true" className={iconClassName} />;
    case 'degraded':
      return <AlertTriangle aria-hidden="true" className={iconClassName} />;
    case 'outage':
      return <XCircle aria-hidden="true" className={iconClassName} />;
    case 'maintenance':
      return <Wrench aria-hidden="true" className={iconClassName} />;
  }
}

function UptimeStatusBarInner({
  serviceName = DEFAULT_SERVICE_NAME,
  days,
  slaTargetPct = DEFAULT_SLA_TARGET_PCT,
  onSelectDay,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: UptimeStatusBarProps) {
  const headingId = useId();
  const override = useComponentOverride('UptimeStatusBar');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const barElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const resolvedServiceName = serviceName.trim() || DEFAULT_SERVICE_NAME;
  const safeSlaTargetPct = clampNumber(
    slaTargetPct,
    MIN_SLA_TARGET_PCT,
    MAX_SLA_TARGET_PCT,
    DEFAULT_SLA_TARGET_PCT
  );

  const normalizedDays = useMemo<ReadonlyArray<NormalizedUptimeDay>>(() => {
    const sourceDays = days ?? DEFAULT_UPTIME_DAYS;
    const seenKeys = new Map<string, number>();
    const out: NormalizedUptimeDay[] = [];

    let index = 0;
    for (const slot of sourceDays) {
      const rawBase = slot.id.trim() || slot.dateLabel.trim() || 'day';
      const baseKey = `slot:${rawBase}`;
      const seen = seenKeys.get(baseKey) ?? 0;
      seenKeys.set(baseKey, seen + 1);
      const key = seen === 0 ? baseKey : `${baseKey}#${seen + 1}`;

      const clampedUptime = clampNumber(slot.uptimePct, 0, 100, 0);
      const rawDowntime = slot.downtimeMinutes;
      const downtimeMinutes =
        rawDowntime !== undefined && Number.isFinite(rawDowntime) && rawDowntime > 0
          ? Math.min(rawDowntime, MAX_MINUTES_PER_DAY)
          : 0;
      const trimmedSummary = slot.incidentSummary?.trim() ?? '';
      const summary = trimmedSummary || STATE_META[slot.state].defaultSummary;
      const hasIncident =
        slot.state !== 'operational' ||
        trimmedSummary.length > 0 ||
        downtimeMinutes > 0;

      out.push({
        key,
        index,
        slot,
        uptimePct: clampedUptime,
        downtimeMinutes,
        summary,
        hasIncident,
      });
      index += 1;
    }

    return out;
  }, [days]);

  const readyView = useMemo<ReadyUptimeView | null>(() => {
    const firstDay = normalizedDays[0];
    if (!firstDay) {
      return null;
    }

    let latestDay: NormalizedUptimeDay = firstDay;
    let mostRecentIncident: NormalizedUptimeDay | null = null;
    let uptimeSum = 0;

    for (const entry of normalizedDays) {
      uptimeSum += entry.uptimePct;
      latestDay = entry;
      if (entry.hasIncident) {
        mostRecentIncident = entry;
      }
    }

    const defaultActiveDay = mostRecentIncident ?? latestDay;
    const matchedSelected =
      selectedKey !== null
        ? normalizedDays.find((entry) => entry.key === selectedKey)
        : undefined;
    const activeDay = matchedSelected ?? defaultActiveDay;
    const overallUptimePct = uptimeSum / normalizedDays.length;
    const slaHealth = resolveSlaHealth(overallUptimePct, safeSlaTargetPct);

    return {
      days: normalizedDays,
      firstDay,
      latestDay,
      activeDay,
      overallUptimePct,
      slaHealth,
    };
  }, [normalizedDays, safeSlaTargetPct, selectedKey]);

  const registerBarRef = useCallback(
    (key: string, node: HTMLDivElement | null) => {
      if (node) {
        barElementsRef.current.set(key, node);
      } else {
        barElementsRef.current.delete(key);
      }
    },
    []
  );

  const selectEntry = useCallback(
    (entry: NormalizedUptimeDay) => {
      setSelectedKey(entry.key);
      onSelectDay?.(entry.slot, entry.index);
    },
    [onSelectDay]
  );

  const handleBarKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLDivElement>,
      entry: NormalizedUptimeDay,
      firstDay: NormalizedUptimeDay,
      latestDay: NormalizedUptimeDay
    ) => {
      if (event.nativeEvent.isComposing) return;

      switch (event.key) {
        case 'Enter':
        case ' ': {
          event.preventDefault();
          selectEntry(entry);
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          const prev = normalizedDays[entry.index - 1];
          if (prev) {
            selectEntry(prev);
            barElementsRef.current.get(prev.key)?.focus();
          }
          break;
        }
        case 'ArrowRight': {
          event.preventDefault();
          const next = normalizedDays[entry.index + 1];
          if (next) {
            selectEntry(next);
            barElementsRef.current.get(next.key)?.focus();
          }
          break;
        }
        case 'Home': {
          event.preventDefault();
          selectEntry(firstDay);
          if (firstDay.key !== entry.key) {
            barElementsRef.current.get(firstDay.key)?.focus();
          }
          break;
        }
        case 'End': {
          event.preventDefault();
          selectEntry(latestDay);
          if (latestDay.key !== entry.key) {
            barElementsRef.current.get(latestDay.key)?.focus();
          }
          break;
        }
        default:
          break;
      }
    },
    [normalizedDays, selectEntry]
  );

  const isEmpty = readyView === null;

  const merged = mergeProps({
    themeTarget: themeProps('uptime-status-bar', {
      state: readyView?.latestDay.slot.state,
      slaStatus: readyView?.slaHealth,
      empty: isEmpty,
      days: normalizedDays.length,
    }),
    baseClassName: 'prism-slab p-5 w-full max-w-full min-w-0 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('uptime-status-bar', 'header');
  const stripWellClass = stableClassName('uptime-status-bar', 'strip-well');
  const barClass = stableClassName('uptime-status-bar', 'bar');
  const captionsClass = stableClassName('uptime-status-bar', 'captions');
  const readoutClass = stableClassName('uptime-status-bar', 'readout');
  const emptyClass = stableClassName('uptime-status-bar', 'empty');

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      {...rest}
      {...merged}
    >
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-3 min-w-0'
        )}
      >
        <div className="min-w-0 flex flex-wrap items-center gap-2.5">
          <Activity
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color: readyView
                ? STATE_META[readyView.latestDay.slot.state].colorVar
                : 'var(--prism-text-secondary)',
            }}
          />
          <h4
            id={headingId}
            className="text-sm font-semibold truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {resolvedServiceName}
          </h4>

          {readyView ? (
            <span
              data-testid="uptime-current-status"
              data-state={readyView.latestDay.slot.state}
              className="prism-well inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0"
              style={{
                color: STATE_META[readyView.latestDay.slot.state].colorVar,
              }}
            >
              {renderStateIcon(
                readyView.latestDay.slot.state,
                'w-3.5 h-3.5 shrink-0'
              )}
              <span>{STATE_META[readyView.latestDay.slot.state].label}</span>
            </span>
          ) : null}
        </div>

        {readyView ? (
          <span
            data-testid="uptime-overall-pill"
            data-sla-status={readyView.slaHealth}
            className="prism-crystal inline-flex items-center rounded-full px-3 py-1 text-xs font-mono font-semibold tabular-nums shrink-0"
            style={{ color: SLA_COLOR_VAR[readyView.slaHealth] }}
          >
            {formatUptimePct(readyView.overallUptimePct)} uptime
          </span>
        ) : (
          <span
            data-testid="uptime-empty-sla"
            className="prism-well inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-mono tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            SLA Target {formatSlaPct(safeSlaTargetPct)}
          </span>
        )}
      </div>

      {readyView === null ? (
        <div
          role="status"
          data-testid="uptime-empty-state"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl px-4 py-8 text-center text-xs min-w-0'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          No uptime history recorded for {resolvedServiceName}.
        </div>
      ) : (
        <>
          <div
            className={cx(
              stripWellClass,
              'prism-well rounded-2xl p-3 space-y-2.5 min-w-0'
            )}
          >
            <div
              role="group"
              aria-label={`${resolvedServiceName} daily uptime bars`}
              data-testid="uptime-bar-strip"
              className="flex items-stretch gap-[2px] h-10 w-full min-w-0"
            >
              {readyView.days.map((entry) => {
                const stateMeta = STATE_META[entry.slot.state];
                const isActive = entry.key === readyView.activeDay.key;
                return (
                  <div
                    key={entry.key}
                    ref={(node) => registerBarRef(entry.key, node)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    aria-label={`${entry.slot.dateLabel}: ${stateMeta.label}, ${formatUptimePct(entry.uptimePct)} uptime`}
                    data-testid={`uptime-bar-${entry.index}`}
                    data-state={entry.slot.state}
                    data-active={isActive ? 'true' : undefined}
                    onClick={() => selectEntry(entry)}
                    onKeyDown={(event) =>
                      handleBarKeyDown(
                        event,
                        entry,
                        readyView.firstDay,
                        readyView.latestDay
                      )
                    }
                    className={cx(
                      barClass,
                      'prism-focus-ring flex-1 min-w-[2px] rounded-full cursor-pointer transition-transform duration-150 hover:scale-y-105'
                    )}
                    style={{
                      backgroundColor: stateMeta.colorVar,
                      opacity: isActive ? 1 : 0.82,
                      boxShadow: isActive
                        ? '0 0 0 2px var(--prism-well-end), 0 0 0 4px var(--prism-focus-ring)'
                        : undefined,
                      transform: isActive ? 'scaleY(1.08)' : undefined,
                    }}
                  />
                );
              })}
            </div>

            <div
              data-testid="uptime-baseline-captions"
              className={cx(
                captionsClass,
                'flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums min-w-0'
              )}
              style={STYLE_TEXT_SECONDARY}
            >
              <span data-testid="uptime-caption-start" className="shrink-0">
                {readyView.days.length}{' '}
                {readyView.days.length === 1 ? 'day' : 'days'} ago
              </span>
              <span
                aria-hidden="true"
                className="hidden sm:block flex-1 h-px min-w-[16px]"
                style={STYLE_BG_DIVIDER}
              />
              <span data-testid="uptime-caption-sla" className="shrink-0">
                SLA Target {formatSlaPct(safeSlaTargetPct)}
              </span>
              <span
                aria-hidden="true"
                className="hidden sm:block flex-1 h-px min-w-[16px]"
                style={STYLE_BG_DIVIDER}
              />
              <span data-testid="uptime-caption-end" className="shrink-0">
                Today
              </span>
            </div>
          </div>

          <div
            aria-live="polite"
            aria-atomic="true"
            data-testid="uptime-incident-readout"
            data-state={readyView.activeDay.slot.state}
            className={cx(
              readoutClass,
              'prism-well rounded-2xl px-3.5 py-3 space-y-1.5 min-w-0'
            )}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs min-w-0">
              <span
                data-testid="uptime-readout-date"
                className="font-semibold"
                style={STYLE_TEXT_PRIMARY}
              >
                {readyView.activeDay.slot.dateLabel}
              </span>
              <span
                aria-hidden="true"
                style={STYLE_TEXT_SECONDARY}
              >
                ·
              </span>
              <span
                data-testid="uptime-readout-status"
                className="inline-flex items-center gap-1 font-semibold"
                style={{
                  color: STATE_META[readyView.activeDay.slot.state].colorVar,
                }}
              >
                {renderStateIcon(
                  readyView.activeDay.slot.state,
                  'w-3.5 h-3.5 shrink-0'
                )}
                <span>{STATE_META[readyView.activeDay.slot.state].label}</span>
              </span>
              <span
                aria-hidden="true"
                style={STYLE_TEXT_SECONDARY}
              >
                ·
              </span>
              <span
                data-testid="uptime-readout-pct"
                className="font-mono font-semibold tabular-nums"
                style={STYLE_TEXT_PRIMARY}
              >
                {formatUptimePct(readyView.activeDay.uptimePct)}
              </span>
              <span
                aria-hidden="true"
                style={STYLE_TEXT_SECONDARY}
              >
                ·
              </span>
              <span
                data-testid="uptime-readout-downtime"
                className="font-mono tabular-nums"
                style={STYLE_TEXT_SECONDARY}
              >
                {formatDowntime(readyView.activeDay.downtimeMinutes)}
              </span>
            </div>

            <p
              data-testid="uptime-readout-summary"
              className="text-xs leading-relaxed break-words"
              style={STYLE_TEXT_SECONDARY}
            >
              {readyView.activeDay.summary}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export const UptimeStatusBar = memo(UptimeStatusBarInner);
UptimeStatusBar.displayName = 'UptimeStatusBar';
