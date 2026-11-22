export interface ParallelToneMap {
  primary: true;
  secondary: true;
  emerald: true;
  amber: true;
  info: true;
}

export {
  ParallelCoordinatesPlot,
  DEFAULT_PARALLEL_AXES,
  DEFAULT_PARALLEL_RECORDS,
} from './ParallelCoordinatesPlot';
export type {
  ParallelAxisSpec,
  ParallelCoordinatesPlotProps,
  ParallelRecord,
  ParallelTone,
} from './ParallelCoordinatesPlot';
