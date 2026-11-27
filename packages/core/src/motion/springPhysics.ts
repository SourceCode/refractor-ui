/**
 * Physics-Driven Spring Solver, CSS linear() Compiler, and Scale-Correction Math.
 *
 * Zero external dependencies, deterministic numerical integration, and zero `any`/`unknown`.
 */

export interface SpringPhysicsConfig {
  /** Spring tension / stiffness (N/m). Default: 320. */
  stiffness: number;
  /** Friction / damping coefficient (N·s/m). Default: 28. */
  damping: number;
  /** Simulated mass (kg). Default: 1. */
  mass: number;
  /** Initial velocity in units/second. Default: 0. */
  velocity?: number;
  /** Position threshold below which spring is considered at rest. Default: 0.001. */
  restDelta?: number;
  /** Velocity threshold below which spring is considered at rest. Default: 0.001. */
  restSpeed?: number;
  /** Maximum simulation duration cap in milliseconds. Default: 2400. */
  maxDurationMs?: number;
}

export interface SpringSimulationResult {
  /** Normalized position values sampled over [0..durationMs], starting at 0 and settling at 1. */
  values: ReadonlyArray<number>;
  /** Total settle duration in milliseconds. */
  durationMs: number;
  /** Sampling interval in milliseconds. */
  stepMs: number;
  /** Peak overshoot above 1.0 (0 when critically/over-damped). */
  overshoot: number;
}

export interface CompiledCssSpring {
  /** Valid CSS `linear(...)` easing function string. */
  easing: string;
  /** Recommended CSS transition/animation duration in milliseconds. */
  durationMs: number;
  /** Peak overshoot ratio. */
  overshoot: number;
}

export interface ScaleCorrectedRadius {
  /** Counter-scaled horizontal border-radius string (e.g. `16px`). */
  radiusX: string;
  /** Counter-scaled vertical border-radius string (e.g. `12px`). */
  radiusY: string;
  /** Full CSS border-radius value (`${radiusX} / ${radiusY}`). */
  cssValue: string;
}

function sanitizePositive(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * Simulates a 1D damped harmonic oscillator from 0 -> 1 using semi-implicit Euler integration
 * at a 1ms internal physics sub-step for numerical stability even at high stiffness.
 */
export function simulateSpring(
  config: Partial<SpringPhysicsConfig> = {},
  sampleStepMs = 16
): SpringSimulationResult {
  const stiffness = sanitizePositive(config.stiffness ?? 320, 320, 10, 2000);
  const damping = sanitizePositive(config.damping ?? 28, 28, 1, 200);
  const mass = sanitizePositive(config.mass ?? 1, 1, 0.1, 20);
  const initialVelocity = Number.isFinite(config.velocity ?? 0) ? (config.velocity ?? 0) : 0;
  const restDelta = sanitizePositive(config.restDelta ?? 0.001, 0.001, 0.0001, 0.05);
  const restSpeed = sanitizePositive(config.restSpeed ?? 0.001, 0.001, 0.0001, 0.05);
  const maxDurationMs = Math.round(sanitizePositive(config.maxDurationMs ?? 2400, 2400, 100, 6000));
  const stepMs = Math.round(sanitizePositive(sampleStepMs, 16, 4, 64));

  let position = 0;
  let velocity = initialVelocity;
  const dt = 0.001; // 1ms fixed physics step
  const values: number[] = [0];
  let overshoot = 0;
  let elapsedMs = 0;
  let settledFrames = 0;

  while (elapsedMs < maxDurationMs) {
    const displacement = position - 1;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration * dt;
    position += velocity * dt;
    elapsedMs += 1;

    if (position > 1) {
      overshoot = Math.max(overshoot, position - 1);
    }

    if (elapsedMs % stepMs === 0) {
      values.push(Number(position.toFixed(4)));
    }

    if (Math.abs(1 - position) <= restDelta && Math.abs(velocity) <= restSpeed) {
      settledFrames += 1;
      if (settledFrames >= 8) {
        break;
      }
    } else {
      settledFrames = 0;
    }
  }

  if (values[values.length - 1] !== 1) {
    values.push(1);
  }

  return {
    values,
    durationMs: Math.max(stepMs, elapsedMs),
    stepMs,
    overshoot: Number(overshoot.toFixed(4)),
  };
}

/**
 * Evaluates a pre-simulated spring curve at normalized progress `t` in [0..1].
 */
export function evaluateSpringAt(result: SpringSimulationResult, progress: number): number {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const lastIndex = result.values.length - 1;
  if (lastIndex <= 0) return 1;
  const exact = clamped * lastIndex;
  const low = Math.floor(exact);
  const high = Math.min(lastIndex, low + 1);
  const frac = exact - low;
  const a = result.values[low] ?? 0;
  const b = result.values[high] ?? 1;
  return a + (b - a) * frac;
}

/**
 * Compiles spring physics into a zero-runtime CSS `linear(...)` easing function
 * so lightweight hover and micro-interaction states run purely on the compositor.
 */
export function compileSpringToCssLinear(
  config: Partial<SpringPhysicsConfig> = {},
  sampleCount = 24
): CompiledCssSpring {
  const count = Math.round(sanitizePositive(sampleCount, 24, 6, 64));
  const sim = simulateSpring(config, 8);
  const stops: string[] = [];

  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const val = i === 0 ? 0 : i === count ? 1 : Number(evaluateSpringAt(sim, t).toFixed(4));
    stops.push(String(val));
  }

  return {
    easing: `linear(${stops.join(', ')})`,
    durationMs: sim.durationMs,
    overshoot: sim.overshoot,
  };
}

/**
 * Computes inverse-scale border-radius values so thick glass pills and cards
 * do not distort into elliptical corners while FLIP scale transforms run.
 */
export function computeScaleCorrectedRadius(
  baseRadiusPx: number,
  scaleX: number,
  scaleY: number
): ScaleCorrectedRadius {
  const safeBase = sanitizePositive(baseRadiusPx, 12, 0, 999);
  const safeSx = sanitizePositive(Math.abs(scaleX), 1, 0.05, 20);
  const safeSy = sanitizePositive(Math.abs(scaleY), 1, 0.05, 20);
  const rx = Number((safeBase / safeSx).toFixed(2));
  const ry = Number((safeBase / safeSy).toFixed(2));
  const radiusX = `${rx}px`;
  const radiusY = `${ry}px`;
  return {
    radiusX,
    radiusY,
    cssValue: `${radiusX} / ${radiusY}`,
  };
}

/**
 * Computes inverse-scale box-shadow blur/spread offsets so refractive elevation
 * shadows remain optically uniform during FLIP scale transitions.
 */
export function computeScaleCorrectedShadow(
  elevationPx: number,
  scaleX: number,
  scaleY: number
): string {
  const safeElevation = sanitizePositive(elevationPx, 16, 0, 96);
  const avgScale = (sanitizePositive(Math.abs(scaleX), 1, 0.1, 10) + sanitizePositive(Math.abs(scaleY), 1, 0.1, 10)) / 2;
  const offsetY = Number(((safeElevation * 0.45) / avgScale).toFixed(2));
  const blur = Number(((safeElevation * 1.35) / avgScale).toFixed(2));
  return `0 ${offsetY}px ${blur}px rgba(var(--prism-shadow-rgb), 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.28)`;
}
