export interface AudioCanvasModeMap {
  waveform: true;
  spectrogram: true;
  split: true;
}

export {
  WaveformSpectrogramView,
  DEFAULT_AUDIO_SAMPLES,
  DEFAULT_DURATION_SEC,
  MIN_DURATION_SEC,
  TRANSIENT_PEAK_THRESHOLD,
  SPECTROGRAM_BAND_COUNT,
} from './WaveformSpectrogramView';
export type {
  AudioCanvasMode,
  AudioZoomLevel,
  AudioEditAction,
  AudioSelectionRange,
  WaveformSpectrogramViewProps,
} from './WaveformSpectrogramView';
