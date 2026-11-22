export interface EasingPresetMap {
  linear: true;
  'ease-in': true;
  'ease-out': true;
  'ease-in-out': true;
  overshoot: true;
}

export { KeyframeCurveEditor, EASING_PRESETS } from './KeyframeCurveEditor';
export type {
  EasingPresetId,
  CubicBezierTuple,
  AnimationKeyframe,
  KeyframeCurveEditorProps,
} from './KeyframeCurveEditor';
