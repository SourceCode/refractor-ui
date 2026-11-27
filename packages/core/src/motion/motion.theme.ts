import {
  compileSpringToCssLinear,
  type CompiledCssSpring,
  type SpringPhysicsConfig,
} from './springPhysics';

/**
 * Semantic Motion Theme (`motion.theme.ts`)
 *
 * Standardizes the entire Refractor Optical Glass UI Kit into five purpose-named
 * transition tokens so editing one object retunes every component together.
 */

export type MotionTokenName = 'snap' | 'ui' | 'gentle' | 'lively' | 'ambient';

export interface MotionTokenSpec {
  readonly name: MotionTokenName;
  readonly description: string;
  readonly spring: Readonly<SpringPhysicsConfig>;
  readonly compiled: Readonly<CompiledCssSpring>;
  readonly durationMs: number;
  readonly cssEasing: string;
  /** Subtle opacity-only duration used under `reducedMotion="calm"`. */
  readonly calmOpacityMs: number;
}

export type SemanticMotionTheme = Readonly<Record<MotionTokenName, MotionTokenSpec>>;

export type MotionThemeOverrides = Partial<
  Record<MotionTokenName, Partial<SpringPhysicsConfig> & { calmOpacityMs?: number }>
>;

interface BaseTokenSeed {
  name: MotionTokenName;
  description: string;
  spring: SpringPhysicsConfig;
  calmOpacityMs: number;
}

const DEFAULT_SEEDS: ReadonlyArray<BaseTokenSeed> = /*#__PURE__*/ Object.freeze([
  {
    name: 'snap',
    description: 'Instant tactile feedback for buttons, toggles, checkboxes, and hover pills.',
    spring: { stiffness: 520, damping: 34, mass: 0.8 },
    calmOpacityMs: 110,
  },
  {
    name: 'ui',
    description: 'Balanced motion for popovers, menus, tabs, tooltips, and focused reveals.',
    spring: { stiffness: 360, damping: 30, mass: 1.0 },
    calmOpacityMs: 160,
  },
  {
    name: 'gentle',
    description: 'Measured deceleration for modals, drawers, window sheets, and large glass slabs.',
    spring: { stiffness: 220, damping: 28, mass: 1.15 },
    calmOpacityMs: 220,
  },
  {
    name: 'lively',
    description: 'Expressive spring with controlled overshoot for celebratory confirmations and badges.',
    spring: { stiffness: 340, damping: 18, mass: 0.95 },
    calmOpacityMs: 180,
  },
  {
    name: 'ambient',
    description: 'Continuous organic drift for background meshes, auras, and idle orbital indicators.',
    spring: { stiffness: 120, damping: 24, mass: 1.6 },
    calmOpacityMs: 260,
  },
]);

function buildTokenSpec(
  seed: BaseTokenSeed,
  override?: Partial<SpringPhysicsConfig> & { calmOpacityMs?: number }
): MotionTokenSpec {
  const spring: SpringPhysicsConfig = Object.freeze({
    stiffness: override?.stiffness ?? seed.spring.stiffness,
    damping: override?.damping ?? seed.spring.damping,
    mass: override?.mass ?? seed.spring.mass,
    velocity: override?.velocity ?? seed.spring.velocity ?? 0,
  });
  const compiled = Object.freeze(compileSpringToCssLinear(spring, 20));
  return Object.freeze({
    name: seed.name,
    description: seed.description,
    spring,
    compiled,
    durationMs: compiled.durationMs,
    cssEasing: compiled.easing,
    calmOpacityMs: override?.calmOpacityMs ?? seed.calmOpacityMs,
  });
}

/**
 * Creates a customized immutable semantic motion theme by merging optional
 * per-token spring overrides onto Refractor's canonical defaults.
 */
export function createMotionTheme(overrides: MotionThemeOverrides = {}): SemanticMotionTheme {
  const map: Partial<Record<MotionTokenName, MotionTokenSpec>> = {};
  for (const seed of DEFAULT_SEEDS) {
    map[seed.name] = buildTokenSpec(seed, overrides[seed.name]);
  }
  return Object.freeze(map as Record<MotionTokenName, MotionTokenSpec>);
}

/** Default canonical Refractor semantic motion theme. */
export const MOTION_THEME: SemanticMotionTheme = /*#__PURE__*/ createMotionTheme();
