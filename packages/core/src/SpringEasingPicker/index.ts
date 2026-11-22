export interface MotionCurveModeMap {
  spring: true;
  bezier: true;
}

export {
  SpringEasingPicker,
  DEFAULT_MOTION_CURVE_CONFIG,
  SPRING_EASING_PRESETS,
} from './SpringEasingPicker';
export type {
  MotionCurveMode,
  SpringPresetKey,
  SpringDampingRegime,
  SpringPhysicsParams,
  MotionCurveConfig,
  SpringEasingPreset,
  SpringEasingPickerProps,
} from './SpringEasingPicker';
