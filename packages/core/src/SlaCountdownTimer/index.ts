export interface SlaUrgencyStateMap {
  nominal: true;
  approaching: true;
  critical: true;
  breached: true;
}

export interface SlaCountdownVariantMap {
  card: true;
  compact: true;
}

export {
  SlaCountdownTimer,
  DEFAULT_SLA_REMAINING_SECONDS,
  DEFAULT_SLA_TOTAL_WINDOW_SECONDS,
  DEFAULT_SLA_WARNING_THRESHOLD_SECONDS,
  DEFAULT_SLA_CRITICAL_THRESHOLD_SECONDS,
} from './SlaCountdownTimer';
export type {
  SlaUrgencyState,
  SlaCountdownVariant,
  SlaEscalationEvent,
  SlaCountdownTimerProps,
} from './SlaCountdownTimer';
