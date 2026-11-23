'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Activity, Check, Copy, Pause, Play, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_DIVIDER, STYLE_FILL_SECONDARY, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type MotionCurveMode = 'spring' | 'bezier';

export type SpringPresetKey = 'snappy' | 'gentle' | 'bouncy' | 'stiff';

export type SpringDampingRegime = 'underdamped' | 'critically-damped' | 'overdamped';

export interface SpringPhysicsParams {
  /** Spring stiffness (k), clamped to [40..600]. */
  stiffness: number;
  /** Spring damping coefficient (c), clamped to [4..60]. */
  damping: number;
  /** Spring mass (m), clamped to [0.5..5]. */
  mass: number;
}

export interface MotionCurveConfig {
  /** Active motion model: physical damped harmonic oscillator or CSS cubic-bezier. */
  mode: MotionCurveMode;
  /** Damped harmonic oscillator parameters. */
  spring: SpringPhysicsParams;
  /** Cubic-bezier control points [x1, y1, x2, y2]. */
  bezier: [number, number, number, number];
  /** Playback & CSS bezier transition duration in milliseconds, clamped to [150..2000]. */
  durationMs: number;
}

export interface SpringEasingPreset {
  /** Stable preset identifier. */
  key: SpringPresetKey;
  /** Human-readable preset pill label. */
  label: string;
  /** Spring physics parameters for this preset. */
  spring: SpringPhysicsParams;
  /** Cubic-bezier control tuple [x1, y1, x2, y2] for this preset. */
  bezier: [number, number, number, number];
  /** Recommended duration in milliseconds for cubic-bezier playback. */
  durationMs: number;
}

type SpringEasingPickerBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface SpringEasingPickerProps extends SpringEasingPickerBaseProps {
  /** Controlled motion curve configuration. */
  value?: MotionCurveConfig;
  /** Initial uncontrolled motion curve configuration. */
  defaultValue?: MotionCurveConfig;
  /** Callback fired with the sanitized MotionCurveConfig on any edit. */
  onChange?: (config: MotionCurveConfig) => void;
  /** Visible heading label rendered inside the sculpted optical header. */
  title?: string;
  /** Disables mode switching, presets, sliders, scrubbing, playback, and copying. */
  disabled?: boolean;
}

interface SpringMetrics {
  dampingRatio: number;
  regime: SpringDampingRegime;
  settlingTimeMs: number;
  graphWindowSec: number;
}

interface RegimeMeta {
  label: string;
  colorToken: string;
}

interface CurveParameterSliderProps {
  label: string;
  value: number;
  formattedValue: string;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  testId: string;
  accentToken: string;
  onValueChange: (next: number) => void;
}

const SVG_WIDTH = 280;
const SVG_HEIGHT = 180;
const PLOT_X0 = 34;
const PLOT_X1 = 264;
const PLOT_WIDTH = PLOT_X1 - PLOT_X0;
const PLOT_Y_TOP = 16;
const PLOT_Y_BOTTOM = 156;
const PLOT_HEIGHT = PLOT_Y_BOTTOM - PLOT_Y_TOP;

const PLOT_VALUE_MIN = -0.5;
const PLOT_VALUE_MAX = 1.5;
const PLOT_VALUE_SPAN = PLOT_VALUE_MAX - PLOT_VALUE_MIN;

const STIFFNESS_MIN = 40;
const STIFFNESS_MAX = 600;
const DAMPING_MIN = 4;
const DAMPING_MAX = 60;
const MASS_MIN = 0.5;
const MASS_MAX = 5;
const BEZIER_Y_MIN = -0.5;
const BEZIER_Y_MAX = 1.5;
const DURATION_MIN = 150;
const DURATION_MAX = 2000;

const CURVE_SAMPLE_STEPS = 64;
const SETTLING_SCAN_STEPS = 120;
const COPY_RESET_MS = 1500;

const GRID_X_TICKS: ReadonlyArray<{ id: string; fraction: number; label: string }> = [
  { id: 'x-0', fraction: 0, label: '0%' },
  { id: 'x-25', fraction: 0.25, label: '' },
  { id: 'x-50', fraction: 0.5, label: '50%' },
  { id: 'x-75', fraction: 0.75, label: '' },
  { id: 'x-100', fraction: 1, label: '100%' },
];

const GRID_Y_TICKS: ReadonlyArray<{ id: string; value: number; label: string }> = [
  { id: 'y-150', value: 1.5, label: '' },
  { id: 'y-100', value: 1, label: '1.0' },
  { id: 'y-050', value: 0.5, label: '0.5' },
  { id: 'y-000', value: 0, label: '0.0' },
  { id: 'y-neg50', value: -0.5, label: '' },
];

const REGIME_META: Record<SpringDampingRegime, RegimeMeta> = {
  underdamped: {
    label: 'Underdamped',
    colorToken: 'var(--prism-primary-main)',
  },
  'critically-damped': {
    label: 'Critically Damped',
    colorToken: 'var(--prism-success-main)',
  },
  overdamped: {
    label: 'Overdamped',
    colorToken: 'var(--prism-info-main)',
  },
};

export const DEFAULT_MOTION_CURVE_CONFIG: MotionCurveConfig = {
  mode: 'spring',
  spring: { stiffness: 240, damping: 18, mass: 1 },
  bezier: [0.22, 1, 0.36, 1],
  durationMs: 650,
};

export const SPRING_EASING_PRESETS: ReadonlyArray<SpringEasingPreset> = [
  {
    key: 'snappy',
    label: 'Snappy',
    spring: { stiffness: 380, damping: 28, mass: 0.8 },
    bezier: [0.2, 0.95, 0.3, 1],
    durationMs: 360,
  },
  {
    key: 'gentle',
    label: 'Gentle',
    spring: { stiffness: 100, damping: 20, mass: 1 },
    bezier: [0.25, 0.1, 0.25, 1],
    durationMs: 750,
  },
  {
    key: 'bouncy',
    label: 'Bouncy',
    spring: { stiffness: 300, damping: 10, mass: 1 },
    bezier: [0.34, 1.45, 0.64, 1],
    durationMs: 850,
  },
  {
    key: 'stiff',
    label: 'Stiff',
    spring: { stiffness: 520, damping: 48, mass: 1 },
    bezier: [0.16, 1, 0.3, 1],
    durationMs: 280,
  },
];

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

function formatTrimmedNumber(value: number): string {
  return String(roundTo(value, 2));
}

function sanitizeMotionCurveConfig(raw: MotionCurveConfig): MotionCurveConfig {
  const mode: MotionCurveMode = raw.mode === 'bezier' ? 'bezier' : 'spring';
  const stiffness = roundTo(
    clampNumber(raw.spring.stiffness, STIFFNESS_MIN, STIFFNESS_MAX, DEFAULT_MOTION_CURVE_CONFIG.spring.stiffness),
    1
  );
  const damping = roundTo(
    clampNumber(raw.spring.damping, DAMPING_MIN, DAMPING_MAX, DEFAULT_MOTION_CURVE_CONFIG.spring.damping),
    1
  );
  const mass = roundTo(
    clampNumber(raw.spring.mass, MASS_MIN, MASS_MAX, DEFAULT_MOTION_CURVE_CONFIG.spring.mass),
    2
  );
  const bezier: [number, number, number, number] = [
    roundTo(clampNumber(raw.bezier[0], 0, 1, DEFAULT_MOTION_CURVE_CONFIG.bezier[0]), 2),
    roundTo(clampNumber(raw.bezier[1], BEZIER_Y_MIN, BEZIER_Y_MAX, DEFAULT_MOTION_CURVE_CONFIG.bezier[1]), 2),
    roundTo(clampNumber(raw.bezier[2], 0, 1, DEFAULT_MOTION_CURVE_CONFIG.bezier[2]), 2),
    roundTo(clampNumber(raw.bezier[3], BEZIER_Y_MIN, BEZIER_Y_MAX, DEFAULT_MOTION_CURVE_CONFIG.bezier[3]), 2),
  ];
  const durationMs = Math.round(
    clampNumber(raw.durationMs, DURATION_MIN, DURATION_MAX, DEFAULT_MOTION_CURVE_CONFIG.durationMs)
  );

  return {
    mode,
    spring: { stiffness, damping, mass },
    bezier,
    durationMs,
  };
}

/**
 * Evaluates the exact closed-form damped harmonic oscillator displacement x(t)
 * moving from x(0) = 0, v(0) = 0 toward equilibrium target 1.
 */
function evaluateSpringPosition(params: SpringPhysicsParams, timeSec: number): number {
  if (timeSec <= 0) return 0;

  const omega0 = Math.sqrt(params.stiffness / params.mass);
  const zeta = params.damping / (2 * Math.sqrt(params.stiffness * params.mass));

  if (zeta < 0.9999) {
    const dampingRoot = Math.sqrt(1 - zeta * zeta);
    const omegaD = omega0 * dampingRoot;
    const decay = Math.exp(-zeta * omega0 * timeSec);
    return 1 - decay * (Math.cos(omegaD * timeSec) + (zeta / dampingRoot) * Math.sin(omegaD * timeSec));
  }

  if (zeta <= 1.0001) {
    const decay = Math.exp(-omega0 * timeSec);
    return 1 - decay * (1 + omega0 * timeSec);
  }

  const s = Math.sqrt(zeta * zeta - 1);
  const r1 = -omega0 * (zeta - s);
  const r2 = -omega0 * (zeta + s);
  const c1 = 0.5 * (1 + zeta / s);
  const c2 = 0.5 * (1 - zeta / s);
  return 1 - (c1 * Math.exp(r1 * timeSec) + c2 * Math.exp(r2 * timeSec));
}

function computeSpringMetrics(params: SpringPhysicsParams): SpringMetrics {
  const omega0 = Math.sqrt(params.stiffness / params.mass);
  const dampingRatio = params.damping / (2 * Math.sqrt(params.stiffness * params.mass));

  let regime: SpringDampingRegime;
  if (dampingRatio < 0.97) {
    regime = 'underdamped';
  } else if (dampingRatio <= 1.03) {
    regime = 'critically-damped';
  } else {
    regime = 'overdamped';
  }

  let analyticalBoundSec: number;
  if (dampingRatio < 0.9999) {
    analyticalBoundSec = 4.605 / (dampingRatio * omega0);
  } else if (dampingRatio <= 1.0001) {
    analyticalBoundSec = 6.64 / omega0;
  } else {
    const s = Math.sqrt(dampingRatio * dampingRatio - 1);
    analyticalBoundSec = 4.605 / (omega0 * (dampingRatio - s));
  }

  const scanLimitSec = clampNumber(analyticalBoundSec * 1.45, 0.4, 8, 1);
  let lastUnsettledStep = 1;
  for (let i = 1; i <= SETTLING_SCAN_STEPS; i += 1) {
    const sampleTime = (i / SETTLING_SCAN_STEPS) * scanLimitSec;
    const position = evaluateSpringPosition(params, sampleTime);
    if (Math.abs(position - 1) > 0.01) {
      lastUnsettledStep = i;
    }
  }

  const settlingTimeSec = clampNumber(
    ((lastUnsettledStep + 1) / SETTLING_SCAN_STEPS) * scanLimitSec,
    0.1,
    8,
    0.5
  );
  const graphWindowSec = clampNumber(settlingTimeSec * 1.15, 0.35, 6, 0.8);

  return {
    dampingRatio: roundTo(dampingRatio, 2),
    regime,
    settlingTimeMs: Math.round(settlingTimeSec * 1000),
    graphWindowSec,
  };
}

function evaluateCubicBezierCoord(p1: number, p2: number, u: number): number {
  const inv = 1 - u;
  return 3 * inv * inv * u * p1 + 3 * inv * u * u * p2 + u * u * u;
}

function solveCubicBezierYForX(
  bezier: readonly [number, number, number, number],
  targetX: number
): number {
  const x = clampNumber(targetX, 0, 1, 0);
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 16; i += 1) {
    const mid = (lo + hi) / 2;
    const sampleX = evaluateCubicBezierCoord(bezier[0], bezier[2], mid);
    if (sampleX < x) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return evaluateCubicBezierCoord(bezier[1], bezier[3], (lo + hi) / 2);
}

function normalizedToSvg(xNorm: number, yValue: number): { x: number; y: number } {
  const clampedX = clampNumber(xNorm, 0, 1, 0);
  const clampedY = clampNumber(yValue, PLOT_VALUE_MIN, PLOT_VALUE_MAX, 0);
  const svgX = PLOT_X0 + clampedX * PLOT_WIDTH;
  const svgY = PLOT_Y_BOTTOM - ((clampedY - PLOT_VALUE_MIN) / PLOT_VALUE_SPAN) * PLOT_HEIGHT;
  return {
    x: roundTo(svgX, 2),
    y: roundTo(svgY, 2),
  };
}

function buildCurveSvgPath(config: MotionCurveConfig, graphWindowSec: number): string {
  const commands: string[] = [];

  for (let i = 0; i <= CURVE_SAMPLE_STEPS; i += 1) {
    const u = i / CURVE_SAMPLE_STEPS;
    const point =
      config.mode === 'spring'
        ? normalizedToSvg(u, evaluateSpringPosition(config.spring, u * graphWindowSec))
        : normalizedToSvg(
            evaluateCubicBezierCoord(config.bezier[0], config.bezier[2], u),
            evaluateCubicBezierCoord(config.bezier[1], config.bezier[3], u)
          );
    commands.push(`${i === 0 ? 'M' : 'L'} ${point.x},${point.y}`);
  }

  return commands.join(' ');
}

function formatCodeSummary(config: MotionCurveConfig): string {
  if (config.mode === 'spring') {
    const { stiffness, damping, mass } = config.spring;
    return `spring(stiffness: ${formatTrimmedNumber(stiffness)}, damping: ${formatTrimmedNumber(damping)}, mass: ${formatTrimmedNumber(mass)})`;
  }
  const [x1, y1, x2, y2] = config.bezier;
  return `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;
}

function matchPreset(config: MotionCurveConfig): SpringPresetKey | null {
  for (const preset of SPRING_EASING_PRESETS) {
    if (config.mode === 'spring') {
      if (
        Math.abs(config.spring.stiffness - preset.spring.stiffness) < 0.01 &&
        Math.abs(config.spring.damping - preset.spring.damping) < 0.01 &&
        Math.abs(config.spring.mass - preset.spring.mass) < 0.005
      ) {
        return preset.key;
      }
    } else if (
      Math.abs(config.bezier[0] - preset.bezier[0]) < 0.005 &&
      Math.abs(config.bezier[1] - preset.bezier[1]) < 0.005 &&
      Math.abs(config.bezier[2] - preset.bezier[2]) < 0.005 &&
      Math.abs(config.bezier[3] - preset.bezier[3]) < 0.005 &&
      config.durationMs === preset.durationMs
    ) {
      return preset.key;
    }
  }
  return null;
}

function CurveParameterSlider({
  label,
  value,
  formattedValue,
  min,
  max,
  step,
  disabled,
  testId,
  accentToken,
  onValueChange,
}: CurveParameterSliderProps) {
  const sliderId = useId();
  const pct = clampNumber(((value - min) / (max - min)) * 100, 0, 100, 0);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onValueChange(clampNumber(Number(event.target.value), min, max, value));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (disabled || event.nativeEvent.isComposing) return;
    if (event.key === 'Home') {
      event.preventDefault();
      onValueChange(min);
    } else if (event.key === 'End') {
      event.preventDefault();
      onValueChange(max);
    }
  };

  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2 text-xs min-w-0">
        <label
          htmlFor={sliderId}
          className="font-semibold tracking-tight truncate"
          style={STYLE_TEXT_SECONDARY}
        >
          {label}
        </label>
        <span
          data-testid={`${testId}-value`}
          className="font-mono font-semibold tabular-nums whitespace-nowrap shrink-0"
          style={STYLE_TEXT_PRIMARY}
        >
          {formattedValue}
        </span>
      </div>
      <div className={cx('relative h-6 flex items-center', disabled ? 'opacity-50' : undefined)}>
        <div className="prism-well w-full h-2.5 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
            style={{
              width: `${pct}%`,
              backgroundColor: accentToken,
            }}
          />
        </div>
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-valuetext={formattedValue}
          data-testid={testId}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="peer absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <span
          aria-hidden="true"
          className="prism-thumb w-4 h-4 rounded-full pointer-events-none absolute -ml-2 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SpringEasingPickerInner({
  value,
  defaultValue,
  onChange,
  title = 'Spring & Easing Curve Picker',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SpringEasingPickerProps) {
  const override = useComponentOverride('SpringEasingPicker');
  const headingId = useId();
  const scrubberId = useId();

  const [rawConfig, setRawConfig] = useControllableState<MotionCurveConfig>({
    value,
    defaultValue: defaultValue ?? DEFAULT_MOTION_CURVE_CONFIG,
  });

  const safeConfig = useMemo<MotionCurveConfig>(
    () => sanitizeMotionCurveConfig(rawConfig),
    [rawConfig]
  );

  const [previewProgress, setPreviewProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const previewProgressRef = useRef<number>(previewProgress);
  previewProgressRef.current = previewProgress;
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const springMetrics = useMemo<SpringMetrics>(
    () => computeSpringMetrics(safeConfig.spring),
    [safeConfig.spring]
  );

  const activePreset = useMemo<SpringPresetKey | null>(
    () => matchPreset(safeConfig),
    [safeConfig]
  );

  const playbackDurationMs =
    safeConfig.mode === 'spring'
      ? Math.round(springMetrics.graphWindowSec * 1000)
      : safeConfig.durationMs;

  const curvePath = useMemo<string>(
    () => buildCurveSvgPath(safeConfig, springMetrics.graphWindowSec),
    [safeConfig, springMetrics.graphWindowSec]
  );

  const currentMotionValue = useMemo<number>(() => {
    if (safeConfig.mode === 'spring') {
      return evaluateSpringPosition(
        safeConfig.spring,
        previewProgress * springMetrics.graphWindowSec
      );
    }
    return solveCubicBezierYForX(safeConfig.bezier, previewProgress);
  }, [safeConfig, previewProgress, springMetrics.graphWindowSec]);

  const codeSummary = useMemo<string>(() => formatCodeSummary(safeConfig), [safeConfig]);

  const commitConfig = useCallback(
    (nextRaw: MotionCurveConfig) => {
      const sanitized = sanitizeMotionCurveConfig(nextRaw);
      setRawConfig(sanitized);
      onChange?.(sanitized);
    },
    [setRawConfig, onChange]
  );

  useEffect(() => {
    if (disabled) {
      setIsPlaying(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (!isPlaying || disabled) return;

    let rafId = 0;
    let startTimestamp: number | null = null;
    const startOffsetMs = previewProgressRef.current * playbackDurationMs;

    const stepFrame = (timestamp: number) => {
      if (startTimestamp === null) {
        startTimestamp = timestamp - startOffsetMs;
      }
      const elapsedMs = Math.max(0, timestamp - startTimestamp);
      const nextProgress = clampNumber(elapsedMs / playbackDurationMs, 0, 1, 1);
      setPreviewProgress(nextProgress);

      if (nextProgress >= 1) {
        setIsPlaying(false);
        return;
      }
      rafId = window.requestAnimationFrame(stepFrame);
    };

    rafId = window.requestAnimationFrame(stepFrame);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isPlaying, disabled, playbackDurationMs]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleModeChange = (nextMode: MotionCurveMode) => {
    if (nextMode === safeConfig.mode) return;
    setIsPlaying(false);
    setPreviewProgress(0);
    commitConfig({
      ...safeConfig,
      mode: nextMode,
    });
  };

  const handlePresetClick = (preset: SpringEasingPreset) => {
    setIsPlaying(false);
    setPreviewProgress(0);
    commitConfig({
      mode: safeConfig.mode,
      spring: { ...preset.spring },
      bezier: [...preset.bezier],
      durationMs: preset.durationMs,
    });
  };

  const handleSpringParamChange = (key: keyof SpringPhysicsParams, nextVal: number) => {
    commitConfig({
      ...safeConfig,
      spring: {
        ...safeConfig.spring,
        [key]: nextVal,
      },
    });
  };

  const handleBezierCoordChange = (index: 0 | 1 | 2 | 3, nextVal: number) => {
    const nextBezier: [number, number, number, number] = [...safeConfig.bezier];
    nextBezier[index] = nextVal;
    commitConfig({
      ...safeConfig,
      bezier: nextBezier,
    });
  };

  const handleDurationChange = (nextDuration: number) => {
    commitConfig({
      ...safeConfig,
      durationMs: nextDuration,
    });
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (previewProgress >= 1) {
      setPreviewProgress(0);
    }
    setIsPlaying(true);
  };

  const handleResetPreview = () => {
    setIsPlaying(false);
    setPreviewProgress(0);
  };

  const handleScrubChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    setIsPlaying(false);
    const pct = clampNumber(Number(event.target.value), 0, 100, 0);
    setPreviewProgress(roundTo(pct / 100, 2));
  };

  const handleScrubberKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (disabled || event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTogglePlay();
    } else if (event.key === 'Home') {
      event.preventDefault();
      handleResetPreview();
    } else if (event.key === 'End') {
      event.preventDefault();
      setIsPlaying(false);
      setPreviewProgress(1);
    }
  };

  const handleCopyCode = async () => {
    try {
      const clipboard = navigator.clipboard;
      if (clipboard && typeof clipboard.writeText === 'function') {
        await clipboard.writeText(codeSummary);
      }
    } catch {
      // Clipboard access may be blocked in restricted environments; still confirm UI feedback.
    }
    setCopied(true);
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, COPY_RESET_MS);
  };

  const originSvg = normalizedToSvg(0, 0);
  const targetSvg = normalizedToSvg(1, 1);
  const p1Svg = normalizedToSvg(safeConfig.bezier[0], safeConfig.bezier[1]);
  const p2Svg = normalizedToSvg(safeConfig.bezier[2], safeConfig.bezier[3]);
  const dotSvg = normalizedToSvg(previewProgress, currentMotionValue);
  const progressPct = Math.round(previewProgress * 100);
  const trackLeftPct = roundTo(clampNumber(14 + currentMotionValue * 66, 2, 98, 14), 2);
  const regimeMeta = REGIME_META[springMetrics.regime];

  const merged = mergeProps({
    themeTarget: themeProps('spring-easing-picker', {
      mode: safeConfig.mode,
      preset: activePreset ?? 'custom',
      disabled,
      playing: isPlaying,
      dampingRegime: safeConfig.mode === 'spring' ? springMetrics.regime : undefined,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full space-y-4 min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('spring-easing-picker', 'header');
  const stageClass = stableClassName('spring-easing-picker', 'stage');
  const graphClass = stableClassName('spring-easing-picker', 'graph');
  const trackClass = stableClassName('spring-easing-picker', 'track');
  const controlsClass = stableClassName('spring-easing-picker', 'controls');
  const summaryClass = stableClassName('spring-easing-picker', 'summary');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'space-y-3 min-w-0')}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
              style={STYLE_PRIMARY_MAIN}
            >
              <Activity className="w-4 h-4 shrink-0" />
            </span>
            <h4
              id={headingId}
              data-testid="spring-easing-title"
              className="text-sm font-semibold tracking-tight truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </h4>
          </div>

          <div
            role="group"
            aria-label="Motion curve mode"
            data-testid="spring-easing-mode-group"
            className="flex flex-wrap items-center gap-1.5 min-w-0"
          >
            <button
              type="button"
              disabled={disabled}
              aria-pressed={safeConfig.mode === 'spring'}
              data-testid="spring-easing-mode-spring"
              onClick={() => handleModeChange('spring')}
              className={cx(
                'prism-focus-ring rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                safeConfig.mode === 'spring'
                  ? 'prism-btn-primary'
                  : 'prism-crystal opacity-85 enabled:hover:opacity-100'
              )}
              style={safeConfig.mode === 'spring' ? undefined : { color: 'var(--prism-text-primary)' }}
            >
              <span className="relative z-10">Spring Physics</span>
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={safeConfig.mode === 'bezier'}
              data-testid="spring-easing-mode-bezier"
              onClick={() => handleModeChange('bezier')}
              className={cx(
                'prism-focus-ring rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                safeConfig.mode === 'bezier'
                  ? 'prism-btn-primary'
                  : 'prism-crystal opacity-85 enabled:hover:opacity-100'
              )}
              style={safeConfig.mode === 'bezier' ? undefined : { color: 'var(--prism-text-primary)' }}
            >
              <span className="relative z-10">Cubic Bezier</span>
            </button>
          </div>
        </div>

        <div
          role="group"
          aria-label="Motion curve presets"
          data-testid="spring-easing-preset-group"
          className="flex flex-wrap items-center gap-1.5 min-w-0"
        >
          {SPRING_EASING_PRESETS.map((preset) => {
            const isSelected = activePreset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                data-testid={`spring-easing-preset-${preset.key}`}
                onClick={() => handlePresetClick(preset)}
                className={cx(
                  'prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-semibold border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                  isSelected
                    ? 'prism-crystal'
                    : 'prism-well opacity-85 enabled:hover:opacity-100'
                )}
                style={{
                  color: isSelected
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-text-secondary)',
                  borderColor: isSelected
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-divider)',
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={cx(stageClass, 'grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-4 items-start min-w-0')}>
        <div className="space-y-3 min-w-0">
          <div
            className={cx(
              graphClass,
              'prism-well rounded-2xl p-3 flex items-center justify-center min-w-0',
              disabled ? 'opacity-60' : undefined
            )}
          >
            <svg
              role="img"
              aria-label={`${title} ${safeConfig.mode === 'spring' ? 'spring physics' : 'cubic-bezier'} curve graph: ${codeSummary}`}
              data-testid="spring-easing-svg"
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-auto select-none block"
            >
              {GRID_Y_TICKS.map((tick) => {
                const gy = normalizedToSvg(0, tick.value).y;
                const isReference = tick.value === 1 || tick.value === 0;
                return (
                  <g key={tick.id}>
                    <line
                      x1={PLOT_X0}
                      y1={gy}
                      x2={PLOT_X1}
                      y2={gy}
                      stroke={isReference ? 'var(--prism-text-disabled)' : 'var(--prism-divider)'}
                      strokeWidth={isReference ? 1.1 : 1}
                      strokeDasharray={tick.value === 1 ? '4 3' : undefined}
                      strokeOpacity={isReference ? 0.85 : 0.7}
                    />
                    {tick.label ? (
                      <text
                        x={PLOT_X0 - 6}
                        y={roundTo(gy + 3, 2)}
                        textAnchor="end"
                        className="text-[9px] font-mono tabular-nums"
                        style={STYLE_FILL_SECONDARY}
                      >
                        {tick.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {GRID_X_TICKS.map((tick) => {
                const gx = normalizedToSvg(tick.fraction, 0).x;
                return (
                  <g key={tick.id}>
                    <line
                      x1={gx}
                      y1={PLOT_Y_TOP}
                      x2={gx}
                      y2={PLOT_Y_BOTTOM}
                      stroke="var(--prism-divider)"
                      strokeWidth={1}
                      strokeOpacity={0.7}
                    />
                    {tick.label ? (
                      <text
                        x={gx}
                        y={PLOT_Y_BOTTOM + 14}
                        textAnchor="middle"
                        className="text-[9px] font-mono tabular-nums"
                        style={STYLE_FILL_SECONDARY}
                      >
                        {tick.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {safeConfig.mode === 'bezier' ? (
                <g data-testid="spring-easing-bezier-handles">
                  <line
                    x1={originSvg.x}
                    y1={originSvg.y}
                    x2={p1Svg.x}
                    y2={p1Svg.y}
                    stroke="var(--prism-secondary-main)"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                  <line
                    x1={targetSvg.x}
                    y1={targetSvg.y}
                    x2={p2Svg.x}
                    y2={p2Svg.y}
                    stroke="var(--prism-secondary-main)"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                  <circle
                    cx={p1Svg.x}
                    cy={p1Svg.y}
                    r={4}
                    fill="var(--prism-bg-start)"
                    stroke="var(--prism-secondary-main)"
                    strokeWidth={2}
                  />
                  <circle
                    cx={p2Svg.x}
                    cy={p2Svg.y}
                    r={4}
                    fill="var(--prism-bg-start)"
                    stroke="var(--prism-secondary-main)"
                    strokeWidth={2}
                  />
                </g>
              ) : null}

              <path
                data-testid="spring-easing-curve-path"
                d={curvePath}
                fill="none"
                stroke="var(--prism-primary-main)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <line
                data-testid="spring-easing-playhead"
                x1={dotSvg.x}
                y1={PLOT_Y_TOP}
                x2={dotSvg.x}
                y2={PLOT_Y_BOTTOM}
                stroke="var(--prism-secondary-main)"
                strokeWidth={1.25}
                strokeDasharray="2 2"
                strokeOpacity={0.85}
              />

              <circle
                data-testid="spring-easing-curve-dot"
                cx={dotSvg.x}
                cy={dotSvg.y}
                r={5}
                fill="var(--prism-primary-main)"
                stroke="var(--prism-primary-contrast)"
                strokeWidth={2}
              />
            </svg>
          </div>

          <div
            data-testid="spring-easing-dot-track"
            className={cx(
              trackClass,
              'prism-well rounded-2xl p-3 space-y-2.5 min-w-0',
              disabled ? 'opacity-60' : undefined
            )}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] min-w-0">
              <span
                className="font-semibold tracking-tight truncate"
                style={STYLE_TEXT_SECONDARY}
              >
                Live Motion Track
              </span>
              <span
                data-testid="spring-easing-progress-readout"
                className="font-mono font-semibold tabular-nums whitespace-nowrap shrink-0"
                style={STYLE_TEXT_PRIMARY}
              >
                t={progressPct}% · x={currentMotionValue.toFixed(2)}
              </span>
            </div>

            <div className="relative h-8 flex items-center px-1">
              <div
                aria-hidden="true"
                className="w-full h-1.5 rounded-full"
                style={STYLE_BG_DIVIDER}
              />
              <span
                aria-hidden="true"
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-full"
                style={{ left: '14%', backgroundColor: 'var(--prism-text-disabled)' }}
              />
              <span
                aria-hidden="true"
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-full"
                style={{ left: '80%', backgroundColor: 'var(--prism-secondary-main)' }}
              />
              <span
                aria-hidden="true"
                data-testid="spring-easing-animated-dot"
                data-motion-value={currentMotionValue.toFixed(3)}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 shadow-md"
                style={{
                  left: `${trackLeftPct}%`,
                  backgroundColor: 'var(--prism-primary-main)',
                  borderColor: 'var(--prism-primary-contrast)',
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <button
                type="button"
                disabled={disabled}
                aria-pressed={isPlaying}
                data-testid="spring-easing-play-button"
                onClick={handleTogglePlay}
                className="prism-btn-primary prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
              >
                {isPlaying ? (
                  <Pause aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
                ) : (
                  <Play aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
                )}
                <span className="relative z-10">{isPlaying ? 'Pause' : 'Play Preview'}</span>
              </button>

              <button
                type="button"
                disabled={disabled}
                aria-label="Reset preview to start"
                data-testid="spring-easing-reset-button"
                onClick={handleResetPreview}
                className="prism-btn-secondary prism-focus-ring h-8 px-2.5 inline-flex items-center justify-center text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
              >
                <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              </button>

              <div className="relative flex-1 min-w-[110px] h-6 flex items-center">
                <label htmlFor={scrubberId} className="sr-only">
                  Preview playback progress
                </label>
                <div className="prism-crystal w-full h-2 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: 'var(--prism-secondary-main)',
                    }}
                  />
                </div>
                <input
                  id={scrubberId}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={progressPct}
                  disabled={disabled}
                  aria-label="Preview playback progress"
                  aria-valuetext={`${progressPct}%`}
                  data-testid="spring-easing-scrubber"
                  onChange={handleScrubChange}
                  onKeyDown={handleScrubberKeyDown}
                  className="peer absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <span
                  aria-hidden="true"
                  className="prism-thumb w-4 h-4 rounded-full pointer-events-none absolute -ml-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                  style={{ left: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={cx(controlsClass, 'space-y-3 min-w-0')}>
          {safeConfig.mode === 'spring' ? (
            <>
              <div
                data-testid="spring-easing-physics-metrics"
                className="prism-well rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 min-w-0"
              >
                <div className="space-y-0.5 min-w-0">
                  <div
                    data-testid="spring-easing-settling-time"
                    className="text-xs font-mono font-semibold tabular-nums"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    Settling ~{springMetrics.settlingTimeMs}ms
                  </div>
                  <div
                    data-testid="spring-easing-damping-ratio"
                    className="text-[11px] font-mono tabular-nums"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    ζ = {springMetrics.dampingRatio.toFixed(2)}
                  </div>
                </div>
                <span
                  data-testid="spring-easing-regime-pill"
                  data-regime={springMetrics.regime}
                  className="prism-crystal rounded-full px-2.5 py-1 text-[11px] font-semibold border whitespace-nowrap shrink-0"
                  style={{
                    color: regimeMeta.colorToken,
                    borderColor: regimeMeta.colorToken,
                  }}
                >
                  {regimeMeta.label}
                </span>
              </div>

              <div className="prism-well rounded-2xl p-3.5 space-y-3 min-w-0">
                <CurveParameterSlider
                  label="Stiffness"
                  value={safeConfig.spring.stiffness}
                  formattedValue={formatTrimmedNumber(safeConfig.spring.stiffness)}
                  min={STIFFNESS_MIN}
                  max={STIFFNESS_MAX}
                  step={5}
                  disabled={disabled}
                  testId="spring-easing-slider-stiffness"
                  accentToken="var(--prism-primary-main)"
                  onValueChange={(next) => handleSpringParamChange('stiffness', next)}
                />
                <CurveParameterSlider
                  label="Damping"
                  value={safeConfig.spring.damping}
                  formattedValue={formatTrimmedNumber(safeConfig.spring.damping)}
                  min={DAMPING_MIN}
                  max={DAMPING_MAX}
                  step={1}
                  disabled={disabled}
                  testId="spring-easing-slider-damping"
                  accentToken="var(--prism-secondary-main)"
                  onValueChange={(next) => handleSpringParamChange('damping', next)}
                />
                <CurveParameterSlider
                  label="Mass"
                  value={safeConfig.spring.mass}
                  formattedValue={safeConfig.spring.mass.toFixed(1)}
                  min={MASS_MIN}
                  max={MASS_MAX}
                  step={0.1}
                  disabled={disabled}
                  testId="spring-easing-slider-mass"
                  accentToken="var(--prism-info-main)"
                  onValueChange={(next) => handleSpringParamChange('mass', next)}
                />
              </div>
            </>
          ) : (
            <>
              <div
                data-testid="spring-easing-bezier-metrics"
                className="prism-well rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums min-w-0"
              >
                <span style={STYLE_TEXT_SECONDARY}>
                  P1 ({safeConfig.bezier[0].toFixed(2)}, {safeConfig.bezier[1].toFixed(2)})
                </span>
                <span style={STYLE_TEXT_SECONDARY}>
                  P2 ({safeConfig.bezier[2].toFixed(2)}, {safeConfig.bezier[3].toFixed(2)})
                </span>
                <span
                  data-testid="spring-easing-duration-pill"
                  className="prism-crystal rounded-full px-2 py-0.5 font-semibold"
                  style={STYLE_PRIMARY_MAIN}
                >
                  {safeConfig.durationMs}ms
                </span>
              </div>

              <div className="prism-well rounded-2xl p-3.5 space-y-2.5 min-w-0">
                <CurveParameterSlider
                  label="Control Point X1"
                  value={safeConfig.bezier[0]}
                  formattedValue={safeConfig.bezier[0].toFixed(2)}
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={disabled}
                  testId="spring-easing-slider-x1"
                  accentToken="var(--prism-primary-main)"
                  onValueChange={(next) => handleBezierCoordChange(0, next)}
                />
                <CurveParameterSlider
                  label="Control Point Y1"
                  value={safeConfig.bezier[1]}
                  formattedValue={safeConfig.bezier[1].toFixed(2)}
                  min={BEZIER_Y_MIN}
                  max={BEZIER_Y_MAX}
                  step={0.01}
                  disabled={disabled}
                  testId="spring-easing-slider-y1"
                  accentToken="var(--prism-primary-main)"
                  onValueChange={(next) => handleBezierCoordChange(1, next)}
                />
                <CurveParameterSlider
                  label="Control Point X2"
                  value={safeConfig.bezier[2]}
                  formattedValue={safeConfig.bezier[2].toFixed(2)}
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={disabled}
                  testId="spring-easing-slider-x2"
                  accentToken="var(--prism-secondary-main)"
                  onValueChange={(next) => handleBezierCoordChange(2, next)}
                />
                <CurveParameterSlider
                  label="Control Point Y2"
                  value={safeConfig.bezier[3]}
                  formattedValue={safeConfig.bezier[3].toFixed(2)}
                  min={BEZIER_Y_MIN}
                  max={BEZIER_Y_MAX}
                  step={0.01}
                  disabled={disabled}
                  testId="spring-easing-slider-y2"
                  accentToken="var(--prism-secondary-main)"
                  onValueChange={(next) => handleBezierCoordChange(3, next)}
                />
                <CurveParameterSlider
                  label="Duration (ms)"
                  value={safeConfig.durationMs}
                  formattedValue={`${safeConfig.durationMs}ms`}
                  min={DURATION_MIN}
                  max={DURATION_MAX}
                  step={10}
                  disabled={disabled}
                  testId="spring-easing-slider-duration"
                  accentToken="var(--prism-info-main)"
                  onValueChange={handleDurationChange}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className={cx(
          summaryClass,
          'prism-well rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 min-w-0'
        )}
      >
        <code
          aria-live="polite"
          data-testid="spring-easing-code-summary"
          className="font-mono text-xs font-semibold tabular-nums break-all min-w-0"
          style={STYLE_TEXT_PRIMARY}
        >
          {codeSummary}
        </code>

        <button
          type="button"
          disabled={disabled}
          data-testid="spring-easing-copy-button"
          onClick={() => {
            void handleCopyCode();
          }}
          className="prism-crystal prism-focus-ring rounded-full h-7 px-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          style={{
            color: copied ? 'var(--prism-success-main)' : 'var(--prism-text-primary)',
          }}
        >
          {copied ? (
            <Check aria-hidden="true" className="w-3 h-3 shrink-0" />
          ) : (
            <Copy aria-hidden="true" className="w-3 h-3 shrink-0" />
          )}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}

export const SpringEasingPicker = memo(SpringEasingPickerInner);
SpringEasingPicker.displayName = 'SpringEasingPicker';
