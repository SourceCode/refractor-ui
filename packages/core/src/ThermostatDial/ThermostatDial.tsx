'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Flame, Leaf, Minus, Plus, Power, Snowflake, Thermometer } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type ThermostatMode = 'cooling' | 'heating' | 'eco' | 'off';
export type ThermostatUnit = 'F' | 'C';

type ThermostatDialBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ThermostatDialProps extends ThermostatDialBaseProps {
  /** Panel header title and accessible region/slider name prefix (defaults to 'Climate Control'). */
  title?: string;
  /** Controlled target temperature in canonical Fahrenheit degrees. */
  targetTempF?: number;
  /** Initial uncontrolled target temperature in canonical Fahrenheit degrees (defaults to 70). */
  defaultTargetTempF?: number;
  /** Ambient room temperature readout in canonical Fahrenheit degrees (defaults to 73). */
  ambientTempF?: number;
  /** Minimum inclusive target temperature bound in Fahrenheit (defaults to 50). */
  minTempF?: number;
  /** Maximum inclusive target temperature bound in Fahrenheit (defaults to 90). */
  maxTempF?: number;
  /** Controlled climate mode ('cooling' | 'heating' | 'eco' | 'off'). */
  mode?: ThermostatMode;
  /** Initial uncontrolled climate mode (defaults to 'cooling'). */
  defaultMode?: ThermostatMode;
  /** Controlled display temperature unit ('F' | 'C'). */
  unit?: ThermostatUnit;
  /** Initial uncontrolled display temperature unit (defaults to 'F'). */
  defaultUnit?: ThermostatUnit;
  /** Callback fired when the target temperature changes, always emitting canonical Fahrenheit. */
  onTargetChange?: (targetTempF: number) => void;
  /** Callback fired when the climate mode changes. */
  onModeChange?: (mode: ThermostatMode) => void;
  /** Callback fired when the display temperature unit changes. */
  onUnitChange?: (unit: ThermostatUnit) => void;
  /** Disables dial dragging, keyboard nudging, steppers, mode pills, and unit toggle (defaults to false). */
  disabled?: boolean;
}

interface ModeOptionMeta {
  value: ThermostatMode;
  label: string;
  badgeText: string;
  accentToken: string;
  contrastToken: string;
}

interface DialTick {
  id: string;
  angleDeg: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
}

const DEFAULT_TITLE = 'Climate Control';
const DEFAULT_MIN_TEMP_F = 50;
const DEFAULT_MAX_TEMP_F = 90;
const DEFAULT_TARGET_TEMP_F = 70;
const DEFAULT_AMBIENT_TEMP_F = 73;
const PAGE_STEP_DELTA = 5;

const SVG_SIZE = 240;
const CENTER = 120;
const TRACK_RADIUS = 92;
const START_ANGLE_DEG = 135;
const END_ANGLE_DEG = 405;
const SWEEP_DEGREES = 270;
const DEADZONE_CENTER_DEG = 90;

const COOLING_MODE_META: ModeOptionMeta = {
  value: 'cooling',
  label: 'Cooling',
  badgeText: 'COOLING',
  accentToken: 'var(--prism-info-main)',
  contrastToken: 'var(--prism-info-contrast)',
};

const HEATING_MODE_META: ModeOptionMeta = {
  value: 'heating',
  label: 'Heating',
  badgeText: 'HEATING',
  accentToken: 'var(--prism-primary-main)',
  contrastToken: 'var(--prism-primary-contrast)',
};

const ECO_MODE_META: ModeOptionMeta = {
  value: 'eco',
  label: 'Eco',
  badgeText: 'ECO',
  accentToken: 'var(--prism-success-main)',
  contrastToken: 'var(--prism-success-contrast)',
};

const OFF_MODE_META: ModeOptionMeta = {
  value: 'off',
  label: 'Off',
  badgeText: 'OFF',
  accentToken: 'var(--prism-text-muted, var(--prism-text-disabled))',
  contrastToken: 'var(--prism-text-primary)',
};

const MODE_OPTIONS: ReadonlyArray<ModeOptionMeta> = [
  COOLING_MODE_META,
  HEATING_MODE_META,
  ECO_MODE_META,
  OFF_MODE_META,
];

function getModeMeta(mode: ThermostatMode): ModeOptionMeta {
  switch (mode) {
    case 'cooling':
      return COOLING_MODE_META;
    case 'heating':
      return HEATING_MODE_META;
    case 'eco':
      return ECO_MODE_META;
    case 'off':
      return OFF_MODE_META;
  }
}

function ModeGlyph({ mode, className }: { mode: ThermostatMode; className: string }) {
  switch (mode) {
    case 'cooling':
      return <Snowflake aria-hidden="true" className={className} />;
    case 'heating':
      return <Flame aria-hidden="true" className={className} />;
    case 'eco':
      return <Leaf aria-hidden="true" className={className} />;
    case 'off':
      return <Power aria-hidden="true" className={className} />;
  }
}

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function normalizeInt(value: number): number {
  const rounded = Math.round(value);
  return rounded === 0 ? 0 : rounded;
}

function normalizeBoundsF(rawMin: number, rawMax: number): { minF: number; maxF: number } {
  const safeMinRaw = Number.isFinite(rawMin) ? normalizeInt(rawMin) : DEFAULT_MIN_TEMP_F;
  const safeMaxRaw = Number.isFinite(rawMax) ? normalizeInt(rawMax) : DEFAULT_MAX_TEMP_F;
  return {
    minF: Math.min(safeMinRaw, safeMaxRaw),
    maxF: Math.max(safeMinRaw, safeMaxRaw),
  };
}

function clampTempF(raw: number, minF: number, maxF: number, fallback: number): number {
  return normalizeInt(clampNumber(raw, minF, maxF, fallback));
}

function fahrenheitToCelsius(tempF: number): number {
  return normalizeInt(((tempF - 32) * 5) / 9);
}

function celsiusToFahrenheit(tempC: number): number {
  return normalizeInt((tempC * 9) / 5 + 32);
}

function toDisplayTemp(tempF: number, unit: ThermostatUnit): number {
  return unit === 'C' ? fahrenheitToCelsius(tempF) : tempF;
}

function formatTemp(tempF: number, unit: ThermostatUnit): string {
  return `${toDisplayTemp(tempF, unit)}°${unit}`;
}

function stepTemperatureF(
  currentF: number,
  deltaUnits: number,
  unit: ThermostatUnit,
  minF: number,
  maxF: number
): number {
  if (unit === 'F') {
    return clampTempF(currentF + deltaUnits, minF, maxF, currentF);
  }
  const currentC = fahrenheitToCelsius(currentF);
  const candidateF = celsiusToFahrenheit(currentC + deltaUnits);
  return clampTempF(candidateF, minF, maxF, currentF);
}

function polarToSvg(cxPos: number, cyPos: number, radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: roundTwo(cxPos + radius * Math.cos(rad)),
    y: roundTwo(cyPos + radius * Math.sin(rad)),
  };
}

function pointerPointToRatio(dx: number, dy: number): number | null {
  if (dx === 0 && dy === 0) return null;
  const rawDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  const maxWrapDeg = END_ANGLE_DEG - 360;

  if (rawDeg >= DEADZONE_CENTER_DEG && rawDeg < START_ANGLE_DEG) {
    return 0;
  }
  if (rawDeg > maxWrapDeg && rawDeg < DEADZONE_CENTER_DEG) {
    return 1;
  }

  const sweepDeg =
    rawDeg >= START_ANGLE_DEG
      ? rawDeg - START_ANGLE_DEG
      : rawDeg + 360 - START_ANGLE_DEG;

  return clampNumber(sweepDeg / SWEEP_DEGREES, 0, 1, 0.5);
}

function buildClimateSummary(
  mode: ThermostatMode,
  displayTarget: number,
  displayAmbient: number,
  unit: ThermostatUnit
): string {
  const unitSuffix = `°${unit}`;
  if (mode === 'off') {
    return `Thermostat off · Ambient ${displayAmbient}${unitSuffix}`;
  }
  if (mode === 'eco') {
    return `Eco mode · Target ${displayTarget}${unitSuffix} · Ambient ${displayAmbient}${unitSuffix}`;
  }
  const diff = displayAmbient - displayTarget;
  if (mode === 'cooling') {
    if (diff > 0) {
      return `Cooling to ${displayTarget}${unitSuffix} · Ambient ${displayAmbient}${unitSuffix} (${diff}${unitSuffix} above target)`;
    }
    return `Cooling standby · Target ${displayTarget}${unitSuffix} · Ambient ${displayAmbient}${unitSuffix}`;
  }
  if (diff < 0) {
    return `Heating to ${displayTarget}${unitSuffix} · Ambient ${displayAmbient}${unitSuffix} (${Math.abs(diff)}${unitSuffix} below target)`;
  }
  return `Heating standby · Target ${displayTarget}${unitSuffix} · Ambient ${displayAmbient}${unitSuffix}`;
}

const TRACK_START = polarToSvg(CENTER, CENTER, TRACK_RADIUS, START_ANGLE_DEG);
const TRACK_END = polarToSvg(CENTER, CENTER, TRACK_RADIUS, END_ANGLE_DEG);
const TRACK_ARC_PATH = `M ${TRACK_START.x} ${TRACK_START.y} A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 1 1 ${TRACK_END.x} ${TRACK_END.y}`;
const TOTAL_ARC_LENGTH = roundTwo((2 * Math.PI * TRACK_RADIUS * SWEEP_DEGREES) / 360);

const DIAL_TICKS: ReadonlyArray<DialTick> = Array.from({ length: 37 }, (_, idx) => {
  const angleDeg = START_ANGLE_DEG + idx * (SWEEP_DEGREES / 36);
  const major = idx % 6 === 0;
  const inner = polarToSvg(CENTER, CENTER, major ? 101 : 103.5, angleDeg);
  const outer = polarToSvg(CENTER, CENTER, major ? 109 : 107.5, angleDeg);
  return {
    id: `tick-${idx}`,
    angleDeg,
    x1: inner.x,
    y1: inner.y,
    x2: outer.x,
    y2: outer.y,
    major,
  };
});

export function ThermostatDial({
  title = DEFAULT_TITLE,
  targetTempF,
  defaultTargetTempF = DEFAULT_TARGET_TEMP_F,
  ambientTempF = DEFAULT_AMBIENT_TEMP_F,
  minTempF = DEFAULT_MIN_TEMP_F,
  maxTempF = DEFAULT_MAX_TEMP_F,
  mode,
  defaultMode = 'cooling',
  unit,
  defaultUnit = 'F',
  onTargetChange,
  onModeChange,
  onUnitChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ThermostatDialProps) {
  const override = useComponentOverride('ThermostatDial');
  const idPrefix = useId();
  const thumbGlowId = `${idPrefix}-thumb-glow`;
  const bezelHaloId = `${idPrefix}-bezel-halo`;

  const { minF, maxF } = useMemo(
    () => normalizeBoundsF(minTempF, maxTempF),
    [maxTempF, minTempF]
  );

  const safeFallbackTargetF = clampTempF(DEFAULT_TARGET_TEMP_F, minF, maxF, minF);
  const safeDefaultTargetF = clampTempF(defaultTargetTempF, minF, maxF, safeFallbackTargetF);
  const safeAmbientF = Number.isFinite(ambientTempF)
    ? normalizeInt(ambientTempF)
    : DEFAULT_AMBIENT_TEMP_F;

  const isTargetControlled = targetTempF !== undefined;
  const [uncontrolledTargetF, setUncontrolledTargetF] = useState<number>(safeDefaultTargetF);
  const rawTargetF = isTargetControlled ? targetTempF : uncontrolledTargetF;
  const currentTargetF = clampTempF(rawTargetF, minF, maxF, safeDefaultTargetF);

  const isModeControlled = mode !== undefined;
  const [uncontrolledMode, setUncontrolledMode] = useState<ThermostatMode>(defaultMode);
  const currentMode: ThermostatMode = isModeControlled ? mode : uncontrolledMode;

  const isUnitControlled = unit !== undefined;
  const [uncontrolledUnit, setUncontrolledUnit] = useState<ThermostatUnit>(defaultUnit);
  const currentUnit: ThermostatUnit = isUnitControlled ? unit : uncontrolledUnit;

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const isOff = currentMode === 'off';
  const isDialInteractive = !disabled && !isOff;

  const latestRef = useRef({
    minF,
    maxF,
    currentTargetF,
    isTargetControlled,
    onTargetChange,
  });
  latestRef.current = {
    minF,
    maxF,
    currentTargetF,
    isTargetControlled,
    onTargetChange,
  };

  useEffect(() => {
    if (!isDialInteractive) {
      cleanupDragRef.current?.();
      setIsDragging(false);
    }
  }, [isDialInteractive]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const commitTargetF = useCallback(
    (rawNextF: number) => {
      const nextF = clampTempF(rawNextF, minF, maxF, currentTargetF);
      if (nextF === currentTargetF) return;
      if (!isTargetControlled) {
        setUncontrolledTargetF(nextF);
      }
      onTargetChange?.(nextF);
    },
    [currentTargetF, isTargetControlled, maxF, minF, onTargetChange]
  );

  const commitMode = useCallback(
    (nextMode: ThermostatMode) => {
      if (nextMode === currentMode) return;
      if (!isModeControlled) {
        setUncontrolledMode(nextMode);
      }
      onModeChange?.(nextMode);
    },
    [currentMode, isModeControlled, onModeChange]
  );

  const commitUnit = useCallback(
    (nextUnit: ThermostatUnit) => {
      if (nextUnit === currentUnit) return;
      if (!isUnitControlled) {
        setUncontrolledUnit(nextUnit);
      }
      onUnitChange?.(nextUnit);
    },
    [currentUnit, isUnitControlled, onUnitChange]
  );

  const handleStep = useCallback(
    (deltaUnits: number) => {
      const nextF = stepTemperatureF(currentTargetF, deltaUnits, currentUnit, minF, maxF);
      commitTargetF(nextF);
    },
    [commitTargetF, currentTargetF, currentUnit, maxF, minF]
  );

  const handleDialPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDialInteractive || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      cleanupDragRef.current?.();

      const dialEl = event.currentTarget;
      const activePointerId = event.pointerId;
      let workingTempF = latestRef.current.currentTargetF;

      const applyFromClientPoint = (clientX: number, clientY: number) => {
        const rect = dialEl.getBoundingClientRect();
        if (
          !Number.isFinite(rect.width) ||
          !Number.isFinite(rect.height) ||
          rect.width <= 0 ||
          rect.height <= 0
        ) {
          return;
        }

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const ratio = pointerPointToRatio(clientX - centerX, clientY - centerY);
        if (ratio === null) return;

        const {
          minF: boundMinF,
          maxF: boundMaxF,
          isTargetControlled: controlled,
          onTargetChange: emitTarget,
        } = latestRef.current;

        const nextF = clampTempF(
          boundMinF + ratio * (boundMaxF - boundMinF),
          boundMinF,
          boundMaxF,
          workingTempF
        );

        if (nextF === workingTempF) return;
        workingTempF = nextF;
        if (!controlled) {
          setUncontrolledTargetF(nextF);
        }
        emitTarget?.(nextF);
      };

      setIsDragging(true);
      applyFromClientPoint(event.clientX, event.clientY);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (
          activePointerId !== undefined &&
          moveEvent.pointerId !== undefined &&
          moveEvent.pointerId !== activePointerId
        ) {
          return;
        }
        applyFromClientPoint(moveEvent.clientX, moveEvent.clientY);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = (endEvent: PointerEvent) => {
        if (
          activePointerId !== undefined &&
          endEvent.pointerId !== undefined &&
          endEvent.pointerId !== activePointerId
        ) {
          return;
        }
        cleanup();
        setIsDragging(false);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [isDialInteractive]
  );

  const handleDialKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        !isDialInteractive ||
        event.nativeEvent.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      let nextF: number | null = null;
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
        nextF = stepTemperatureF(currentTargetF, 1, currentUnit, minF, maxF);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
        nextF = stepTemperatureF(currentTargetF, -1, currentUnit, minF, maxF);
      } else if (event.key === 'PageUp') {
        nextF = stepTemperatureF(currentTargetF, PAGE_STEP_DELTA, currentUnit, minF, maxF);
      } else if (event.key === 'PageDown') {
        nextF = stepTemperatureF(currentTargetF, -PAGE_STEP_DELTA, currentUnit, minF, maxF);
      } else if (event.key === 'Home') {
        nextF = minF;
      } else if (event.key === 'End') {
        nextF = maxF;
      }

      if (nextF === null) return;
      event.preventDefault();
      commitTargetF(nextF);
    },
    [commitTargetF, currentTargetF, currentUnit, isDialInteractive, maxF, minF]
  );

  const trimmedTitle = title.trim();
  const accessibleTitle = trimmedTitle.length > 0 ? trimmedTitle : DEFAULT_TITLE;
  const displayTitle = trimmedTitle.length > 0 ? title : DEFAULT_TITLE;

  const modeMeta = getModeMeta(currentMode);
  const span = maxF - minF;
  const targetProgress = span === 0 ? 0 : clampNumber((currentTargetF - minF) / span, 0, 1, 0);
  const clampedAmbientF = clampNumber(safeAmbientF, minF, maxF, minF);
  const ambientProgress = span === 0 ? 0 : clampNumber((clampedAmbientF - minF) / span, 0, 1, 0);

  const targetAngleDeg = roundTwo(START_ANGLE_DEG + targetProgress * SWEEP_DEGREES);
  const ambientAngleDeg = roundTwo(START_ANGLE_DEG + ambientProgress * SWEEP_DEGREES);
  const activeArcLength = roundTwo(TOTAL_ARC_LENGTH * targetProgress);

  const thumbPos = polarToSvg(CENTER, CENTER, TRACK_RADIUS, targetAngleDeg);
  const ambientInner = polarToSvg(CENTER, CENTER, TRACK_RADIUS - 9, ambientAngleDeg);
  const ambientOuter = polarToSvg(CENTER, CENTER, TRACK_RADIUS + 9, ambientAngleDeg);
  const ambientPip = polarToSvg(CENTER, CENTER, TRACK_RADIUS - 14, ambientAngleDeg);

  const displayMin = toDisplayTemp(minF, currentUnit);
  const displayMax = toDisplayTemp(maxF, currentUnit);
  const displayTarget = toDisplayTemp(currentTargetF, currentUnit);
  const displayAmbient = toDisplayTemp(safeAmbientF, currentUnit);

  const targetReadout = isOff ? '--' : formatTemp(currentTargetF, currentUnit);
  const ambientReadout = `Ambient ${formatTemp(safeAmbientF, currentUnit)}`;
  const climateSummary = buildClimateSummary(currentMode, displayTarget, displayAmbient, currentUnit);
  const sliderValueText = isOff
    ? `Off, ${ambientReadout}`
    : `${formatTemp(currentTargetF, currentUnit)}, ${modeMeta.label}, ${ambientReadout}`;

  const atMin = currentTargetF <= minF;
  const atMax = currentTargetF >= maxF;

  const merged = mergeProps({
    themeTarget: themeProps('thermostat-dial', {
      mode: currentMode,
      unit: currentUnit,
      disabled,
      dragging: isDragging,
    }),
    baseClassName: 'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 space-y-4 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('thermostat-dial', 'header');
  const dialClass = stableClassName('thermostat-dial', 'dial');
  const bezelClass = stableClassName('thermostat-dial', 'bezel');
  const footerClass = stableClassName('thermostat-dial', 'footer');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={accessibleTitle}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Header */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2 min-w-0')}>
        <div className="flex items-center gap-2 min-w-0">
          <Thermometer
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{ color: modeMeta.accentToken }}
          />
          <span
            data-testid="thermostat-title"
            className="text-sm font-semibold tracking-tight truncate min-w-0"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {displayTitle}
          </span>
        </div>

        <span
          data-testid="thermostat-range-badge"
          className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums shrink-0"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          {displayMin}°–{displayMax}°{currentUnit}
        </span>
      </div>

      {/* Responsive Square Radial Dial Stage */}
      <div className="flex flex-col items-center justify-center w-full min-w-0">
        <div
          role="slider"
          aria-label={`${accessibleTitle} target temperature`}
          aria-valuemin={displayMin}
          aria-valuemax={displayMax}
          aria-valuenow={displayTarget}
          aria-valuetext={sliderValueText}
          aria-disabled={!isDialInteractive || undefined}
          tabIndex={isDialInteractive ? 0 : -1}
          data-testid="thermostat-dial-slider"
          data-mode={currentMode}
          data-dragging={isDragging ? 'true' : undefined}
          onPointerDown={handleDialPointerDown}
          onKeyDown={handleDialKeyDown}
          style={{ touchAction: 'none' }}
          className={cx(
            dialClass,
            'prism-focus-ring relative w-full max-w-[240px] aspect-square mx-auto rounded-full flex items-center justify-center touch-none',
            !isDialInteractive
              ? 'opacity-65 cursor-not-allowed'
              : isDragging
                ? 'cursor-grabbing'
                : 'cursor-grab'
          )}
        >
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            aria-hidden="true"
            data-testid="thermostat-dial-svg"
            className="block w-full h-full overflow-visible pointer-events-none"
          >
            <defs>
              <radialGradient id={thumbGlowId} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={modeMeta.accentToken} stopOpacity={0.55} />
                <stop offset="100%" stopColor={modeMeta.accentToken} stopOpacity={0} />
              </radialGradient>
              <radialGradient id={bezelHaloId} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={modeMeta.accentToken} stopOpacity={0.18} />
                <stop offset="100%" stopColor={modeMeta.accentToken} stopOpacity={0} />
              </radialGradient>
            </defs>

            {/* Recessed Outer Optical Bezel Housing */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={112}
              fill="var(--prism-well-start)"
              stroke="var(--prism-well-border)"
              strokeWidth={1.5}
            />

            {/* Subtle Mode-Tinted Optical Aura Behind Center Bezel */}
            <circle
              data-testid="thermostat-dial-aura"
              cx={CENTER}
              cy={CENTER}
              r={78}
              fill={`url(#${bezelHaloId})`}
              opacity={isOff ? 0 : 1}
            />

            {/* Fine Radial Calibration Tick Marks (135deg..405deg) */}
            <g data-testid="thermostat-dial-ticks">
              {DIAL_TICKS.map((tick) => {
                const isLit = !isOff && tick.angleDeg <= targetAngleDeg;
                return (
                  <line
                    key={tick.id}
                    x1={tick.x1}
                    y1={tick.y1}
                    x2={tick.x2}
                    y2={tick.y2}
                    stroke={isLit ? modeMeta.accentToken : 'var(--prism-divider)'}
                    strokeOpacity={isLit ? (tick.major ? 0.9 : 0.55) : tick.major ? 0.9 : 0.6}
                    strokeWidth={tick.major ? 2 : 1.15}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>

            {/* Recessed Glass Track Groove (270deg sweep: 135deg to 405deg) */}
            <path
              d={TRACK_ARC_PATH}
              fill="none"
              stroke="var(--prism-well-border)"
              strokeWidth={14}
              strokeLinecap="round"
            />
            <path
              data-testid="thermostat-dial-track"
              d={TRACK_ARC_PATH}
              fill="none"
              stroke="var(--prism-divider)"
              strokeWidth={10}
              strokeLinecap="round"
            />

            {/* Soft Optical Glow Under Active Target Arc */}
            <path
              d={TRACK_ARC_PATH}
              fill="none"
              stroke={modeMeta.accentToken}
              strokeWidth={16}
              strokeLinecap="round"
              strokeDasharray={`${activeArcLength} ${TOTAL_ARC_LENGTH}`}
              strokeOpacity={isOff || targetProgress <= 0 ? 0 : 0.22}
            />

            {/* Active Target Arc Tinted by Current Mode Token */}
            <path
              data-testid="thermostat-dial-active-arc"
              d={TRACK_ARC_PATH}
              fill="none"
              stroke={modeMeta.accentToken}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${activeArcLength} ${TOTAL_ARC_LENGTH}`}
              strokeOpacity={isOff ? (targetProgress > 0 ? 0.35 : 0) : targetProgress > 0 ? 1 : 0}
            />

            {/* Ambient Temperature Reference Indicator */}
            <g data-testid="thermostat-dial-ambient-marker">
              <line
                x1={ambientInner.x}
                y1={ambientInner.y}
                x2={ambientOuter.x}
                y2={ambientOuter.y}
                stroke="var(--prism-text-secondary)"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <circle
                cx={ambientPip.x}
                cy={ambientPip.y}
                r={3}
                fill="var(--prism-well-end)"
                stroke="var(--prism-text-secondary)"
                strokeWidth={1.5}
              />
            </g>

            {/* Scale Min / Max Endpoint Labels */}
            <text
              x={62}
              y={214}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="var(--prism-text-secondary)"
            >
              {displayMin}°
            </text>
            <text
              x={178}
              y={214}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="var(--prism-text-secondary)"
            >
              {displayMax}°
            </text>

            {/* Glowing Draggable Thumb Handle */}
            <g data-testid="thermostat-dial-thumb">
              <circle
                cx={thumbPos.x}
                cy={thumbPos.y}
                r={isDragging ? 18 : 15}
                fill={`url(#${thumbGlowId})`}
                opacity={isOff ? 0 : isDragging ? 0.95 : 0.72}
              />
              <circle
                data-testid="thermostat-dial-thumb-disc"
                cx={thumbPos.x}
                cy={thumbPos.y}
                r={isDragging ? 10.5 : 9.5}
                fill="var(--prism-well-end)"
                stroke={modeMeta.accentToken}
                strokeWidth={3}
              />
              <circle
                cx={thumbPos.x}
                cy={thumbPos.y}
                r={3.5}
                fill={modeMeta.accentToken}
              />
            </g>
          </svg>

          {/* Center Optical Glass Bezel */}
          <div
            aria-hidden="true"
            data-testid="thermostat-center-bezel"
            className={cx(
              bezelClass,
              'prism-crystal pointer-events-none absolute w-[58%] h-[58%] rounded-full flex flex-col items-center justify-center gap-1 px-2 text-center border border-[var(--prism-divider)]'
            )}
          >
            <span
              data-testid="thermostat-mode-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
              style={{ color: modeMeta.accentToken }}
            >
              <ModeGlyph mode={currentMode} className="w-3 h-3 shrink-0" />
              {modeMeta.badgeText}
            </span>

            <span
              data-testid="thermostat-target-readout"
              className="font-mono text-2xl sm:text-3xl font-bold tabular-nums leading-none tracking-tight"
              style={{
                color: isOff
                  ? 'var(--prism-text-muted, var(--prism-text-disabled))'
                  : 'var(--prism-text-primary)',
              }}
            >
              {targetReadout}
            </span>

            <span
              data-testid="thermostat-ambient-readout"
              className="text-[11px] font-medium tabular-nums truncate max-w-full"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {ambientReadout}
            </span>
          </div>
        </div>
      </div>

      {/* Controls Footer */}
      <div className={cx(footerClass, 'flex flex-col gap-3 min-w-0')}>
        {/* Fine Steppers (- / +) & °F / °C Unit Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div
            role="group"
            aria-label="Fine temperature controls"
            className="inline-flex items-center gap-2 shrink-0"
          >
            <button
              type="button"
              disabled={disabled || isOff || atMin}
              aria-label="Decrease target temperature"
              data-testid="thermostat-step-down"
              onClick={() => handleStep(-1)}
              className="prism-crystal prism-focus-ring inline-flex items-center justify-center w-9 h-9 rounded-full cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all shrink-0"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <Minus aria-hidden="true" className="w-4 h-4" />
            </button>

            <span
              className="font-mono text-[11px] font-semibold tabular-nums px-1"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              ±1°{currentUnit}
            </span>

            <button
              type="button"
              disabled={disabled || isOff || atMax}
              aria-label="Increase target temperature"
              data-testid="thermostat-step-up"
              onClick={() => handleStep(1)}
              className="prism-crystal prism-focus-ring inline-flex items-center justify-center w-9 h-9 rounded-full cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all shrink-0"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <Plus aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>

          <div
            role="group"
            aria-label="Temperature unit"
            className="prism-well inline-flex items-center p-0.5 rounded-full gap-0.5 shrink-0"
          >
            <button
              type="button"
              disabled={disabled}
              aria-pressed={currentUnit === 'F'}
              aria-label="Display temperature in Fahrenheit"
              data-testid="thermostat-unit-f"
              onClick={() => commitUnit('F')}
              className={cx(
                'prism-focus-ring px-2.5 py-1 rounded-full font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shrink-0',
                currentUnit === 'F' ? 'prism-crystal' : 'opacity-70'
              )}
              style={{
                color:
                  currentUnit === 'F'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              °F
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={currentUnit === 'C'}
              aria-label="Display temperature in Celsius"
              data-testid="thermostat-unit-c"
              onClick={() => commitUnit('C')}
              className={cx(
                'prism-focus-ring px-2.5 py-1 rounded-full font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shrink-0',
                currentUnit === 'C' ? 'prism-crystal' : 'opacity-70'
              )}
              style={{
                color:
                  currentUnit === 'C'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              °C
            </button>
          </div>
        </div>

        {/* Mode Selector Pills */}
        <div
          role="group"
          aria-label="Thermostat mode"
          className="flex flex-wrap items-center gap-1.5 min-w-0"
        >
          {MODE_OPTIONS.map((option) => {
            const isActive = currentMode === option.value;
            const isOffActive = isActive && option.value === 'off';
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                aria-pressed={isActive}
                data-testid={`thermostat-mode-${option.value}`}
                onClick={() => commitMode(option.value)}
                className={cx(
                  'prism-focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 shrink-0',
                  isOffActive ? 'prism-well border' : isActive ? '' : 'prism-crystal'
                )}
                style={
                  isOffActive
                    ? {
                        borderColor: option.accentToken,
                        color: 'var(--prism-text-primary)',
                      }
                    : isActive
                      ? {
                          backgroundColor: option.accentToken,
                          color: option.contrastToken,
                        }
                      : {
                          color: 'var(--prism-text-secondary)',
                        }
                }
              >
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      isActive && !isOffActive ? option.contrastToken : option.accentToken,
                  }}
                />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Polite Climate Summary Line */}
        <p
          role="status"
          aria-live="polite"
          data-testid="thermostat-summary"
          className="prism-well rounded-xl px-3 py-2 text-xs font-medium tabular-nums min-w-0"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          {climateSummary}
        </p>
      </div>
    </div>
  );
}

ThermostatDial.displayName = 'ThermostatDial';
