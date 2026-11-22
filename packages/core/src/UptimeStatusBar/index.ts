export interface UptimeDayStateMap {
  operational: true;
  degraded: true;
  outage: true;
  maintenance: true;
}

export { UptimeStatusBar } from './UptimeStatusBar';
export type {
  UptimeDaySlot,
  UptimeDayState,
  UptimeStatusBarProps,
} from './UptimeStatusBar';
