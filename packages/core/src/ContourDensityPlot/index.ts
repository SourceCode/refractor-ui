export interface ContourToneMap {
  primary: true;
  secondary: true;
  emerald: true;
  info: true;
}

export {
  ContourDensityPlot,
  DEFAULT_CONTOUR_POINTS,
  CONTOUR_GRID_COLS,
  CONTOUR_GRID_ROWS,
} from './ContourDensityPlot';
export type {
  ContourTone,
  ContourSamplePoint,
  ContourCellReading,
  ContourDensityPlotProps,
} from './ContourDensityPlot';
