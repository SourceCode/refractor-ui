export interface ToneChannelMap {
  luma: true;
  red: true;
  green: true;
  blue: true;
}

export {
  ToneCurveEditor,
  TONE_CURVE_CHANNELS,
  TONE_CURVE_PRESETS,
} from './ToneCurveEditor';
export type {
  ToneCurveChannel,
  ToneCurvePresetId,
  ToneCurvePoint,
  ToneCurveChannelMap,
  ToneCurveEditorProps,
} from './ToneCurveEditor';
