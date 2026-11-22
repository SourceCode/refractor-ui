export interface SequencerTrackToneMap {
  primary: true;
  amber: true;
  info: true;
  emerald: true;
}

export interface SequencerPresetIdMap {
  house: true;
  breakbeat: true;
  clear: true;
}

export { StepSequencerMatrix } from './StepSequencerMatrix';
export type {
  SequencerPresetId,
  SequencerTrackSpec,
  SequencerTrackTone,
  StepSequencerMatrixProps,
} from './StepSequencerMatrix';
