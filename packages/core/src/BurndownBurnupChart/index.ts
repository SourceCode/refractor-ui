export interface BurnChartModeMap {
  burndown: true;
  burnup: true;
}

export {
  BurndownBurnupChart,
  DEFAULT_SPRINT_BURN_DATA,
} from './BurndownBurnupChart';
export type {
  BurnChartMode,
  BurnPaceStatus,
  SprintBurnPoint,
  BurndownBurnupChartProps,
} from './BurndownBurnupChart';
