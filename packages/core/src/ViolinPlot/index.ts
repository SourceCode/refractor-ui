export interface ViolinToneMap {
  primary: true;
  secondary: true;
  emerald: true;
  amber: true;
  info: true;
}

export {
  DEFAULT_VIOLIN_SERIES,
  ViolinPlot,
  computeGaussianKde,
  computeViolinStats,
} from './ViolinPlot';
export type {
  ViolinKdeBin,
  ViolinKdeResult,
  ViolinPlotProps,
  ViolinSeries,
  ViolinStatsSummary,
  ViolinTone,
} from './ViolinPlot';
