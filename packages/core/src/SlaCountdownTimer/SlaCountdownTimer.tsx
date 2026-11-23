'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { AlertTriangle, Check, Clock, Pause, Play, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type SlaUrgencyState = 'nominal' | 'approaching' | 'critical' | 'breached';

export type SlaCountdownVariant = 'card' | 'compact';

export interface SlaEscalationEvent {
  /** Active SLA urgency tier at the moment of escalation or breach. */
  urgency: SlaUrgencyState;
  /** Signed remaining seconds (<= 0 when breached). */
  remainingSeconds: number;
  /** Ticket or incident identifier associated with the SLA countdown. */
  ticketId: string;
}

type SlaCountdownTimerBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface SlaCountdownTimerProps extends SlaCountdownTimerBaseProps {
  /** Heading label rendered inside the sculpted optical SLA card and accessible region name. */
  title?: string;
  /** Monospace incident or ticket identifier surfaced in the card and emitted in callbacks. */
  ticketId?: string;
  /** SLA policy tier badge label (e.g. "P1 · First Response"). */
  policyLabel?: string;
  /** Initial remaining seconds; takes precedence over deadlineIso when finite. */
  remainingSeconds?: number;
  /** ISO-8601 deadline timestamp used when remainingSeconds is omitted or non-finite. */
  deadlineIso?: string;
  /** Total SLA window duration in seconds used to compute remaining progress percentage. */
  totalWindowSeconds?: number;
  /** Threshold in seconds at or below which urgency transitions from nominal to approaching. */
  warningThresholdSeconds?: number;
  /** Threshold in seconds at or below which urgency transitions from approaching to critical. */
  criticalThresholdSeconds?: number;
  /** Starts the 1-second live countdown immediately on mount when true. */
  autoStart?: boolean;
  /** Layout variant: full sculpted optical 'card' slab or inline 'compact' pill. */
  variant?: SlaCountdownVariant;
  /** Renders Pause/Resume, Reset, and Escalate controls (or Escalate in compact mode). */
  showControls?: boolean;
  /** Callback invoked when the operator triggers Escalate. */
  onEscalate?: (event: SlaEscalationEvent) => void;
  /** Callback invoked at most once when remaining time crosses from > 0 to <= 0. */
  onBreach?: (event: SlaEscalationEvent) => void;
  /** Pauses live ticking and disables all interactive controls. */
  disabled?: boolean;
}

interface SlaUrgencyMeta {
  label: string;
  colorToken: string;
  ringShadow: string;
}

interface SanitizedThresholds {
  warning: number;
  critical: number;
  totalWindow: number;
}

export const DEFAULT_SLA_REMAINING_SECONDS = 1420;
export const DEFAULT_SLA_TOTAL_WINDOW_SECONDS = 3600;
export const DEFAULT_SLA_WARNING_THRESHOLD_SECONDS = 1800;
export const DEFAULT_SLA_CRITICAL_THRESHOLD_SECONDS = 300;

const SECONDS_PER_DAY = 86400;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

const URGENCY_META: Record<SlaUrgencyState, SlaUrgencyMeta> = {
  nominal: {
    label: 'Nominal',
    colorToken: 'var(--prism-success-main)',
    ringShadow: 'inset 0 0 0 1px var(--prism-success-main)',
  },
  approaching: {
    label: 'Approaching SLA',
    colorToken: 'var(--prism-warning-main)',
    ringShadow: 'inset 0 0 0 1px var(--prism-warning-main)',
  },
  critical: {
    label: 'Critical SLA',
    colorToken: 'var(--prism-primary-main)',
    ringShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)',
  },
  breached: {
    label: 'SLA Breached',
    colorToken: 'var(--prism-error-main)',
    ringShadow: 'inset 0 0 0 1.5px var(--prism-error-main)',
  },
};

function normalizeSignedZero(value: number): number {
  return value === 0 ? 0 : value;
}

function resolveInitialSeconds(remainingSeconds?: number, deadlineIso?: string): number {
  if (typeof remainingSeconds === 'number' && Number.isFinite(remainingSeconds)) {
    return normalizeSignedZero(Math.round(remainingSeconds));
  }
  if (typeof deadlineIso === 'string' && deadlineIso.trim().length > 0) {
    const parsedMs = Date.parse(deadlineIso);
    if (Number.isFinite(parsedMs)) {
      return normalizeSignedZero(Math.round((parsedMs - Date.now()) / 1000));
    }
  }
  return DEFAULT_SLA_REMAINING_SECONDS;
}

function sanitizeThresholds(
  warningThresholdSeconds?: number,
  criticalThresholdSeconds?: number,
  totalWindowSeconds?: number
): SanitizedThresholds {
  const warning =
    typeof warningThresholdSeconds === 'number' && Number.isFinite(warningThresholdSeconds)
      ? Math.max(0, Math.round(warningThresholdSeconds))
      : DEFAULT_SLA_WARNING_THRESHOLD_SECONDS;

  const rawCritical =
    typeof criticalThresholdSeconds === 'number' && Number.isFinite(criticalThresholdSeconds)
      ? Math.max(0, Math.round(criticalThresholdSeconds))
      : DEFAULT_SLA_CRITICAL_THRESHOLD_SECONDS;

  const critical = Math.min(rawCritical, warning);

  const totalWindow =
    typeof totalWindowSeconds === 'number' &&
    Number.isFinite(totalWindowSeconds) &&
    totalWindowSeconds > 0
      ? Math.max(1, Math.round(totalWindowSeconds))
      : DEFAULT_SLA_TOTAL_WINDOW_SECONDS;

  return { warning, critical, totalWindow };
}

function computeUrgencyState(
  remainingSeconds: number,
  warningThreshold: number,
  criticalThreshold: number
): SlaUrgencyState {
  if (remainingSeconds <= 0) return 'breached';
  if (remainingSeconds <= criticalThreshold) return 'critical';
  if (remainingSeconds <= warningThreshold) return 'approaching';
  return 'nominal';
}

function formatDurationClock(totalSeconds: number): string {
  const absSeconds = Math.floor(Math.abs(totalSeconds));
  const days = Math.floor(absSeconds / SECONDS_PER_DAY);
  const hours = Math.floor((absSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  const minutes = Math.floor((absSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = absSeconds % SECONDS_PER_MINUTE;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (days > 0) {
    return `${String(days).padStart(2, '0')}d ${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}:${ss}`;
}

function formatSlaReadout(remainingSeconds: number): string {
  const clock = formatDurationClock(remainingSeconds);
  if (remainingSeconds <= 0) {
    return `BREACHED +${clock}`;
  }
  return clock;
}

const headerClass = /*#__PURE__*/ stableClassName('sla-countdown-timer', 'header');
const policyClass = /*#__PURE__*/ stableClassName('sla-countdown-timer', 'policy');
const readoutClass = /*#__PURE__*/ stableClassName('sla-countdown-timer', 'readout');
const progressClass = /*#__PURE__*/ stableClassName('sla-countdown-timer', 'progress');
const controlsClass = /*#__PURE__*/ stableClassName('sla-countdown-timer', 'controls');
const statusClass = /*#__PURE__*/ stableClassName('sla-countdown-timer', 'status');
const dotClass = /*#__PURE__*/ stableClassName('sla-countdown-timer', 'dot');

function SlaCountdownTimerInner({
  title = 'SLA Response Countdown',
  ticketId = 'INC-4821',
  policyLabel = 'P1 · First Response',
  remainingSeconds,
  deadlineIso,
  totalWindowSeconds = DEFAULT_SLA_TOTAL_WINDOW_SECONDS,
  warningThresholdSeconds = DEFAULT_SLA_WARNING_THRESHOLD_SECONDS,
  criticalThresholdSeconds = DEFAULT_SLA_CRITICAL_THRESHOLD_SECONDS,
  autoStart = true,
  variant = 'card',
  showControls = true,
  onEscalate,
  onBreach,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SlaCountdownTimerProps) {
  const override = useComponentOverride('SlaCountdownTimer');
  const headingId = useId();

  const safeVariant: SlaCountdownVariant = variant === 'compact' ? 'compact' : 'card';

  const thresholds = useMemo<SanitizedThresholds>(
    () => sanitizeThresholds(warningThresholdSeconds, criticalThresholdSeconds, totalWindowSeconds),
    [warningThresholdSeconds, criticalThresholdSeconds, totalWindowSeconds]
  );

  const [currentSeconds, setCurrentSeconds] = useState<number>(() =>
    resolveInitialSeconds(remainingSeconds, deadlineIso)
  );
  const [running, setRunning] = useState<boolean>(autoStart);
  const [escalated, setEscalated] = useState<boolean>(false);

  const currentSecondsRef = useRef<number>(currentSeconds);
  currentSecondsRef.current = currentSeconds;

  const breachFiredRef = useRef<boolean>(currentSeconds <= 0);
  const onBreachRef = useRef<((event: SlaEscalationEvent) => void) | undefined>(onBreach);
  onBreachRef.current = onBreach;
  const ticketIdRef = useRef<string>(ticketId);
  ticketIdRef.current = ticketId;

  const lastSourceRef = useRef<{
    remainingSeconds: number | undefined;
    deadlineIso: string | undefined;
  }>({
    remainingSeconds,
    deadlineIso,
  });

  useEffect(() => {
    const prevSource = lastSourceRef.current;
    if (
      Object.is(prevSource.remainingSeconds, remainingSeconds) &&
      Object.is(prevSource.deadlineIso, deadlineIso)
    ) {
      return;
    }

    lastSourceRef.current = { remainingSeconds, deadlineIso };
    const nextSeconds = resolveInitialSeconds(remainingSeconds, deadlineIso);
    const prevSeconds = currentSecondsRef.current;
    currentSecondsRef.current = nextSeconds;
    setCurrentSeconds(nextSeconds);
    setEscalated(false);

    if (nextSeconds > 0) {
      breachFiredRef.current = false;
    } else if (prevSeconds > 0 && !breachFiredRef.current) {
      breachFiredRef.current = true;
      onBreachRef.current?.({
        urgency: 'breached',
        remainingSeconds: nextSeconds,
        ticketId: ticketIdRef.current,
      });
    } else {
      breachFiredRef.current = true;
    }
  }, [remainingSeconds, deadlineIso]);

  useEffect(() => {
    if (!running || disabled) return;

    const intervalId = window.setInterval(() => {
      const prev = currentSecondsRef.current;
      const next = normalizeSignedZero(prev - 1);
      currentSecondsRef.current = next;
      setCurrentSeconds(next);

      if (prev > 0 && next <= 0 && !breachFiredRef.current) {
        breachFiredRef.current = true;
        onBreachRef.current?.({
          urgency: 'breached',
          remainingSeconds: next,
          ticketId: ticketIdRef.current,
        });
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [running, disabled]);

  const urgency: SlaUrgencyState = computeUrgencyState(
    currentSeconds,
    thresholds.warning,
    thresholds.critical
  );
  const urgencyMeta = URGENCY_META[urgency];
  const formattedReadout = formatSlaReadout(currentSeconds);
  const isActiveRunning = running && !disabled;

  const progressPercent =
    currentSeconds <= 0
      ? 0
      : Math.round(clampNumber((currentSeconds / thresholds.totalWindow) * 100, 0, 100, 0));

  const handleToggleRunning = () => {
    setRunning((prev) => !prev);
  };

  const handleReset = () => {
    const resetSeconds = resolveInitialSeconds(remainingSeconds, deadlineIso);
    currentSecondsRef.current = resetSeconds;
    breachFiredRef.current = resetSeconds <= 0;
    setCurrentSeconds(resetSeconds);
    setEscalated(false);
    setRunning(autoStart);
  };

  const handleEscalate = () => {
    setEscalated(true);
    onEscalate?.({
      urgency,
      remainingSeconds: currentSecondsRef.current,
      ticketId,
    });
  };

  const handleButtonKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    action: () => void
  ) => {
    if (disabled || event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const lifecycleLabel = disabled ? 'Disabled' : running ? 'Live' : 'Paused';
  const liveStatusText = escalated
    ? `Escalated ${ticketId} — ${urgencyMeta.label} (${lifecycleLabel})`
    : `${urgencyMeta.label} — ${lifecycleLabel} · ${ticketId}`;

  const merged = mergeProps({
    themeTarget: themeProps('sla-countdown-timer', {
      variant: safeVariant,
      urgency,
      running: isActiveRunning,
      escalated,
      disabled,
    }),
    baseClassName:
      safeVariant === 'compact'
        ? cx(
            'prism-slab rounded-full px-3 py-1.5 inline-flex flex-wrap items-center gap-2 max-w-full min-w-0',
            disabled ? 'opacity-65' : undefined
          )
        : cx(
            'prism-slab p-4 sm:p-5 w-full max-w-full space-y-4 min-w-0 overflow-hidden',
            disabled ? 'opacity-65' : undefined
          ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const isSevere = urgency === 'breached' || urgency === 'critical';

  if (safeVariant === 'compact') {
    return (
      <div
        ref={ref}
        role="region"
        aria-label={`${title} (${ticketId})`}
        {...rest}
        {...merged}
      >
        <span
          aria-hidden="true"
          data-testid="sla-timer-dot"
          className={cx(dotClass, 'w-2.5 h-2.5 rounded-full shrink-0')}
          style={{ backgroundColor: urgencyMeta.colorToken }}
        />
        <span
          data-testid="sla-timer-ticket"
          className="font-mono text-xs font-medium whitespace-nowrap"
          style={STYLE_TEXT_SECONDARY}
        >
          {ticketId}
        </span>
        <span
          data-testid="sla-timer-readout"
          className={cx(readoutClass, 'font-mono text-xs font-bold tabular-nums whitespace-nowrap')}
          style={{ color: urgencyMeta.colorToken }}
        >
          {formattedReadout}
        </span>
        {showControls && (
          <button
            type="button"
            disabled={disabled}
            aria-pressed={escalated}
            data-testid="sla-timer-escalate"
            onClick={handleEscalate}
            onKeyDown={(event) => handleButtonKeyDown(event, handleEscalate)}
            className="prism-focus-ring prism-crystal rounded-full px-2.5 py-0.5 inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
            style={{
              color: urgencyMeta.colorToken,
              boxShadow: urgencyMeta.ringShadow,
            }}
          >
            {escalated ? (
              <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
            )}
            <span>{escalated ? 'Escalated' : 'Escalate'}</span>
          </button>
        )}
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="sla-timer-status"
          className={cx(statusClass, 'sr-only')}
        >
          {liveStatusText}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      {...rest}
      {...merged}
    >
      <div
        aria-hidden="true"
        data-testid="sla-timer-accent"
        className="w-full h-1 rounded-full transition-colors duration-200"
        style={{ backgroundColor: urgencyMeta.colorToken }}
      />

      <div className={cx(headerClass, 'flex flex-wrap items-start justify-between gap-2.5 min-w-0')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
            style={{
              color: urgencyMeta.colorToken,
              boxShadow: urgencyMeta.ringShadow,
            }}
          >
            {isSevere ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 shrink-0" />
            )}
          </span>
          <div className="min-w-0">
            <h4
              id={headingId}
              data-testid="sla-timer-title"
              className="text-sm font-semibold tracking-tight truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </h4>
            <p
              data-testid="sla-timer-ticket"
              className="font-mono text-xs tabular-nums truncate"
              style={STYLE_TEXT_SECONDARY}
            >
              {ticketId}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span
            data-testid="sla-timer-policy"
            className={cx(
              policyClass,
              'prism-crystal rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap'
            )}
            style={STYLE_TEXT_SECONDARY}
          >
            {policyLabel}
          </span>
          <span
            data-testid="sla-timer-urgency-badge"
            className="prism-well rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
            style={{
              color: urgencyMeta.colorToken,
              boxShadow: urgencyMeta.ringShadow,
            }}
          >
            <span
              aria-hidden="true"
              data-testid="sla-timer-dot"
              className={cx(dotClass, 'w-2 h-2 rounded-full shrink-0')}
              style={{ backgroundColor: urgencyMeta.colorToken }}
            />
            <span>{urgencyMeta.label}</span>
          </span>
        </div>
      </div>

      <div
        className="prism-well rounded-2xl p-4 space-y-3 min-w-0"
        style={{ boxShadow: urgencyMeta.ringShadow }}
      >
        <div
          data-testid="sla-timer-readout"
          className={cx(
            readoutClass,
            'font-mono text-2xl sm:text-3xl font-bold tracking-tight tabular-nums break-words'
          )}
          style={{ color: urgencyMeta.colorToken }}
        >
          {formattedReadout}
        </div>

        <div className={cx(progressClass, 'space-y-1.5 min-w-0')}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs min-w-0">
            <span
              className="font-medium truncate"
              style={STYLE_TEXT_SECONDARY}
            >
              {urgency === 'breached' ? 'SLA window exhausted' : 'SLA window remaining'}
            </span>
            <span
              data-testid="sla-timer-progress-label"
              className="font-mono font-semibold tabular-nums whitespace-nowrap shrink-0"
              style={{ color: urgencyMeta.colorToken }}
            >
              {progressPercent}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="SLA time remaining"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-valuetext={`${progressPercent}% remaining (${urgencyMeta.label})`}
            data-testid="sla-timer-progressbar"
            className="prism-well w-full h-2.5 rounded-full overflow-hidden p-0.5"
          >
            <div
              data-testid="sla-timer-progress-fill"
              className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-300"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: urgencyMeta.colorToken,
              }}
            />
          </div>
        </div>
      </div>

      {showControls && (
        <div className={cx(controlsClass, 'flex flex-wrap items-center justify-between gap-2 min-w-0')}>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <button
              type="button"
              disabled={disabled}
              aria-pressed={isActiveRunning}
              data-testid="sla-timer-toggle"
              onClick={handleToggleRunning}
              onKeyDown={(event) => handleButtonKeyDown(event, handleToggleRunning)}
              className="prism-focus-ring prism-crystal rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
              style={STYLE_TEXT_PRIMARY}
            >
              {isActiveRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Resume</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={disabled}
              data-testid="sla-timer-reset"
              onClick={handleReset}
              onKeyDown={(event) => handleButtonKeyDown(event, handleReset)}
              className="prism-focus-ring prism-crystal rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
              style={STYLE_TEXT_PRIMARY}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>

          <button
            type="button"
            disabled={disabled}
            aria-pressed={escalated}
            data-testid="sla-timer-escalate"
            onClick={handleEscalate}
            onKeyDown={(event) => handleButtonKeyDown(event, handleEscalate)}
            className={cx(
              'prism-focus-ring rounded-full px-3.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
              isSevere ? 'prism-btn-primary' : 'prism-btn-secondary'
            )}
          >
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {escalated ? (
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{escalated ? 'Escalated' : 'Escalate'}</span>
            </span>
          </button>
        </div>
      )}

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="sla-timer-status"
        className={cx(statusClass, 'text-xs flex flex-wrap items-center justify-between gap-2 min-w-0 pt-2.5')}
        style={{
          color: escalated ? urgencyMeta.colorToken : 'var(--prism-text-secondary)',
          borderTop: '1px solid var(--prism-divider)',
        }}
      >
        <span className="truncate">{liveStatusText}</span>
        <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
          {escalated ? 'Escalation logged' : lifecycleLabel}
        </span>
      </div>
    </div>
  );
}

export const SlaCountdownTimer = /*#__PURE__*/ memoWithDisplayName(SlaCountdownTimerInner, 'SlaCountdownTimer');
