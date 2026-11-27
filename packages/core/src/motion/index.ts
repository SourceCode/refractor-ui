export {
  compileSpringToCssLinear,
  computeScaleCorrectedRadius,
  computeScaleCorrectedShadow,
  evaluateSpringAt,
  simulateSpring,
  type CompiledCssSpring,
  type ScaleCorrectedRadius,
  type SpringPhysicsConfig,
  type SpringSimulationResult,
} from './springPhysics';

export {
  createMotionTheme,
  MOTION_THEME,
  type MotionThemeOverrides,
  type MotionTokenName,
  type MotionTokenSpec,
  type SemanticMotionTheme,
} from './motion.theme';

export {
  animateHybrid,
  isCompositorProperty,
  supportsScrollTimeline,
  supportsWaapi,
  type HybridAnimateOptions,
  type HybridAnimationHandle,
  type HybridEngineBackend,
  type HybridKeyframe,
} from './hybridEngine';

export {
  MotionConfigProvider,
  useMotionConfig,
  type MotionConfigContextValue,
  type MotionConfigProviderProps,
  type ReducedMotionPolicy,
} from './MotionConfigProvider';

export {
  mapScrollRange,
  measureScrollProgress,
  scrollProgress,
  useScrollProgress,
  type ScrollOffsetEdge,
  type ScrollProgressOptions,
  type ScrollProgressState,
} from './scrollLinked';

export {
  auditMotionSource,
  computeMotionScore,
  evaluateFrameTimings,
  type FrameTimingSummary,
  type MotionAuditFinding,
  type MotionFindingSeverity,
  type MotionGrade,
  type MotionScoreReport,
} from './motionScore';
