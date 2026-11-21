export interface BarSeriesToneMap {
  primary: true;
  secondary: true;
  emerald: true;
  amber: true;
  rose: true;
}

export interface BarOrientationMap {
  vertical: true;
  horizontal: true;
}

export interface BarLayoutModeMap {
  grouped: true;
  stacked: true;
}

export { BarColumnChart } from './BarColumnChart';
export type {
  BarColumnChartProps,
  BarLayoutMode,
  BarOrientation,
  BarSeries,
  BarSeriesTone,
} from './BarColumnChart';
