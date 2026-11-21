export interface ColorScopeModeMap {
  histogram: true;
  waveform: true;
  vectorscope: true;
  all: true;
}

export {
  LiveColorScopes,
  CLIP_WARNING_THRESHOLD_PCT,
  WAVEFORM_WARNING_IRE,
  DEFAULT_HISTOGRAM,
  DEFAULT_WAVEFORM_COLUMNS,
  DEFAULT_VECTOR_SAMPLES,
} from './LiveColorScopes';
export type {
  ColorScopeMode,
  HistogramChannel,
  ScopeHistogramBins,
  VectorscopeSample,
  LiveColorScopesProps,
} from './LiveColorScopes';
