/**
 * Render-Cost Performance Auditing (`MotionScore` / Performance Doctor)
 *
 * Profiles CSS/TSX animation source code and live runtime frame timings to grade
 * animation cost (0–100, A–F) and flag layout-thrashing bottlenecks when pairing
 * motion with glassmorphism and WebGL shaders.
 */

export type MotionFindingSeverity = 'info' | 'warning' | 'critical';
export type MotionGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface MotionAuditFinding {
  readonly id: string;
  readonly severity: MotionFindingSeverity;
  readonly category: 'layout-thrash' | 'blur-stack' | 'webgl-budget' | 'frame-drop' | 'reduced-motion';
  readonly message: string;
  readonly recommendation: string;
  readonly penalty: number;
}

export interface FrameTimingSummary {
  readonly sampleCount: number;
  readonly averageFrameMs: number;
  readonly p95FrameMs: number;
  readonly droppedFrames: number;
  readonly estimatedFps: number;
}

export interface MotionScoreReport {
  readonly score: number;
  readonly grade: MotionGrade;
  readonly findings: ReadonlyArray<MotionAuditFinding>;
  readonly frameSummary: FrameTimingSummary | null;
}

interface SourceRule {
  id: string;
  pattern: RegExp;
  severity: MotionFindingSeverity;
  category: MotionAuditFinding['category'];
  message: string;
  recommendation: string;
  penalty: number;
}

const SOURCE_RULES: ReadonlyArray<SourceRule> = /*#__PURE__*/ Object.freeze([
  {
    id: 'transition-all',
    pattern: /\btransition-all\b|transition\s*:\s*all\b/i,
    severity: 'critical',
    category: 'layout-thrash',
    message: 'Detected `transition-all`, which animates layout and paint properties unintentionally.',
    recommendation: 'Target compositor-only properties (`transform`, `opacity`) or use `MOTION_THEME` tokens.',
    penalty: 22,
  },
  {
    id: 'layout-property-animation',
    pattern: /(?:transition|animate|keyframes)[^;\n]{0,80}\b(?:width|height|top|left|right|bottom|margin|padding)\b/i,
    severity: 'critical',
    category: 'layout-thrash',
    message: 'Animating geometric layout properties triggers main-thread reflow on every frame.',
    recommendation: 'Use `LayoutMotionBox` (FLIP `transform` + scale-corrected border-radius) instead.',
    penalty: 25,
  },
  {
    id: 'heavy-blur-animation',
    pattern: /(?:transition|keyframes)[^;\n]{0,80}backdrop-filter/i,
    severity: 'warning',
    category: 'blur-stack',
    message: 'Continuously animating `backdrop-filter` radius causes expensive GPU readback passes.',
    recommendation: 'Fade opacity on a pre-blurred optical layer or cap blur via `OpticalMaterialSurface`.',
    penalty: 16,
  },
  {
    id: 'multiple-webgl-contexts',
    pattern: /getContext\(\s*['"]webgl2?['"]\s*\)/g,
    severity: 'warning',
    category: 'webgl-budget',
    message: 'Direct per-component WebGL context creation risks hitting browser context limits (8–16).',
    recommendation: 'Route glass shaders through `getSharedShaderPool()` single-context pooling.',
    penalty: 12,
  },
]);

/** Evaluates an array of frame durations (in milliseconds) into a summary report. */
export function evaluateFrameTimings(frameDurationsMs: ReadonlyArray<number>): FrameTimingSummary {
  const valid = frameDurationsMs.filter((ms) => Number.isFinite(ms) && ms > 0);
  if (valid.length === 0) {
    return {
      sampleCount: 0,
      averageFrameMs: 0,
      p95FrameMs: 0,
      droppedFrames: 0,
      estimatedFps: 60,
    };
  }

  let sum = 0;
  let droppedFrames = 0;
  for (let i = 0; i < valid.length; i += 1) {
    const ms = valid[i]!;
    sum += ms;
    if (ms > 20) droppedFrames += 1;
  }

  const sorted = [...valid].sort((a, b) => a - b);
  const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const averageFrameMs = Number((sum / valid.length).toFixed(2));
  const p95FrameMs = Number((sorted[p95Idx] ?? averageFrameMs).toFixed(2));
  const estimatedFps = Math.min(120, Math.max(1, Math.round(1000 / Math.max(8.33, averageFrameMs))));

  return {
    sampleCount: valid.length,
    averageFrameMs,
    p95FrameMs,
    droppedFrames,
    estimatedFps,
  };
}

/** Static source-code auditor flagging layout thrashing, blur churn, and WebGL context risk. */
export function auditMotionSource(sourceCode: string): MotionAuditFinding[] {
  const findings: MotionAuditFinding[] = [];
  if (!sourceCode.trim()) return findings;

  for (const rule of SOURCE_RULES) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(sourceCode)) {
      findings.push({
        id: rule.id,
        severity: rule.severity,
        category: rule.category,
        message: rule.message,
        recommendation: rule.recommendation,
        penalty: rule.penalty,
      });
    }
  }

  const hasAnimation = /@keyframes|animate\(|transition/i.test(sourceCode);
  const hasReducedMotionGuard =
    /prefers-reduced-motion|motion-reduce|reducedMotion|isCalmMotion/i.test(sourceCode);
  if (hasAnimation && !hasReducedMotionGuard) {
    findings.push({
      id: 'missing-reduced-motion-guard',
      severity: 'info',
      category: 'reduced-motion',
      message: 'Animated code does not reference reduced-motion or calm-motion fallbacks.',
      recommendation: 'Wrap with `MotionConfigProvider` (`reducedMotion="calm"`) or `motion-reduce:`.',
      penalty: 8,
    });
  }

  return findings;
}

function scoreToGrade(score: number): MotionGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 55) return 'D';
  return 'F';
}

/**
 * Computes a combined `MotionScoreReport` (0–100, A–F) from optional source code
 * and/or live runtime frame duration samples.
 */
export function computeMotionScore(options: {
  sourceCode?: string;
  frameDurationsMs?: ReadonlyArray<number>;
}): MotionScoreReport {
  const findings: MotionAuditFinding[] = options.sourceCode
    ? auditMotionSource(options.sourceCode)
    : [];

  const frameSummary =
    options.frameDurationsMs && options.frameDurationsMs.length > 0
      ? evaluateFrameTimings(options.frameDurationsMs)
      : null;

  if (frameSummary && frameSummary.p95FrameMs > 24) {
    findings.push({
      id: 'runtime-p95-jank',
      severity: 'critical',
      category: 'frame-drop',
      message: `p95 frame time (${frameSummary.p95FrameMs}ms) exceeds 60fps budget (${frameSummary.droppedFrames} dropped frames).`,
      recommendation: 'Step down GPU tier or switch to `performanceMode="high"` during heavy scroll/drag.',
      penalty: 24,
    });
  } else if (frameSummary && frameSummary.p95FrameMs > 17) {
    findings.push({
      id: 'runtime-p95-warning',
      severity: 'warning',
      category: 'frame-drop',
      message: `p95 frame time (${frameSummary.p95FrameMs}ms) approaches 60fps threshold.`,
      recommendation: 'Coalesce pointer handlers with rAF and avoid animating shadows or blur.',
      penalty: 10,
    });
  }

  const totalPenalty = findings.reduce((acc, item) => acc + item.penalty, 0);
  const score = Math.max(0, Math.min(100, 100 - totalPenalty));

  return {
    score,
    grade: scoreToGrade(score),
    findings,
    frameSummary,
  };
}
