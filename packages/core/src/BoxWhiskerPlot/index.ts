export interface BoxWhiskerToneMap {
  primary: true;
  secondary: true;
  emerald: true;
  amber: true;
  rose: true;
}

export { BoxWhiskerPlot, computeBoxStats } from './BoxWhiskerPlot';
export type {
  BoxWhiskerPlotProps,
  BoxWhiskerSeries,
  BoxWhiskerStats,
  BoxWhiskerTone,
} from './BoxWhiskerPlot';
