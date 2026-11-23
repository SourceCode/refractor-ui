'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type ColorWheelZone = 'lift' | 'gamma' | 'gain';

export interface ColorWheelValue {
  /** Horizontal chromaticity offset normalized inside the unit circle (x^2 + y^2 <= 1). */
  x: number;
  /** Vertical chromaticity offset normalized inside the unit circle (x^2 + y^2 <= 1). */
  y: number;
  /** Master zone luminance adjustment clamped to [-100..100]. */
  luminance: number;
}

export type ThreeWayColorGrade = Record<ColorWheelZone, ColorWheelValue>;

type ThreeWayColorWheelsBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ThreeWayColorWheelsProps extends ThreeWayColorWheelsBaseProps {
  /** Controlled 3-way color grade (omitted zones default to neutral). */
  value?: Partial<ThreeWayColorGrade>;
  /** Initial uncontrolled 3-way color grade (defaults to neutral { x: 0, y: 0, luminance: 0 }). */
  defaultValue?: Partial<ThreeWayColorGrade>;
  /** Callback invoked whenever any wheel chromaticity or luminance changes. */
  onChange?: (grade: ThreeWayColorGrade, changedZone: ColorWheelZone) => void;
  /** Panel header title and accessible region label (defaults to '3-Way Color Balance'). */
  title?: string;
  /** Disables wheel dragging, keyboard nudging, luminance sliders, and reset controls. */
  disabled?: boolean;
}

interface WheelZoneMeta {
  id: ColorWheelZone;
  label: string;
  rangeLabel: string;
  token: string;
}

interface CardinalChromaMarker {
  id: string;
  cx: number;
  cy: number;
  tickX1: number;
  tickY1: number;
  tickX2: number;
  tickY2: number;
  token: string;
}

interface ReferenceRing {
  id: string;
  radius: number;
}

const DEFAULT_TITLE = '3-Way Color Balance';
const WHEEL_VIEWBOX = 140;
const WHEEL_CENTER = 70;
const WHEEL_RADIUS = 52;
const FINE_NUDGE_STEP = 0.05;
const SHIFT_NUDGE_STEP = 0.2;

const NEUTRAL_WHEEL_VALUE: ColorWheelValue = { x: 0, y: 0, luminance: 0 };

const LIFT_ZONE_META: WheelZoneMeta = {
  id: 'lift',
  label: 'Lift',
  rangeLabel: 'Shadows',
  token: 'var(--prism-info-main)',
};

const GAMMA_ZONE_META: WheelZoneMeta = {
  id: 'gamma',
  label: 'Gamma',
  rangeLabel: 'Midtones',
  token: 'var(--prism-secondary-main)',
};

const GAIN_ZONE_META: WheelZoneMeta = {
  id: 'gain',
  label: 'Gain',
  rangeLabel: 'Highlights',
  token: 'var(--prism-primary-main)',
};

const WHEEL_ZONES: readonly [WheelZoneMeta, WheelZoneMeta, WheelZoneMeta] = [
  LIFT_ZONE_META,
  GAMMA_ZONE_META,
  GAIN_ZONE_META,
];

const REFERENCE_RINGS: ReadonlyArray<ReferenceRing> = [
  { id: 'inner', radius: 17.33 },
  { id: 'mid', radius: 34.67 },
];

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100 + 0;
}

function polarToCartesian(cxPos: number, cyPos: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: roundTwo(cxPos + radius * Math.cos(rad)),
    y: roundTwo(cyPos + radius * Math.sin(rad)),
  };
}

const CARDINAL_CHROMA_SPECS: ReadonlyArray<{ id: string; angleDeg: number; token: string }> = [
  { id: 'error', angleDeg: 0, token: 'var(--prism-error-main)' },
  { id: 'primary', angleDeg: 60, token: 'var(--prism-primary-main)' },
  { id: 'warning', angleDeg: 120, token: 'var(--prism-warning-main)' },
  { id: 'success', angleDeg: 180, token: 'var(--prism-success-main)' },
  { id: 'secondary', angleDeg: 240, token: 'var(--prism-secondary-main)' },
  { id: 'info', angleDeg: 300, token: 'var(--prism-info-main)' },
];

const CARDINAL_CHROMA_MARKERS: ReadonlyArray<CardinalChromaMarker> = CARDINAL_CHROMA_SPECS.map(
  (spec) => {
    const dot = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, 59, spec.angleDeg);
    const tickInner = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, 47, spec.angleDeg);
    const tickOuter = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, 52, spec.angleDeg);
    return {
      id: spec.id,
      cx: dot.x,
      cy: dot.y,
      tickX1: tickInner.x,
      tickY1: tickInner.y,
      tickX2: tickOuter.x,
      tickY2: tickOuter.y,
      token: spec.token,
    };
  }
);

function clampUnitCircle(rawX: number, rawY: number): { x: number; y: number } {
  const safeX = Number.isFinite(rawX) ? rawX : 0;
  const safeY = Number.isFinite(rawY) ? rawY : 0;
  const magnitude = Math.hypot(safeX, safeY);
  const normX = magnitude > 1 ? safeX / magnitude : safeX;
  const normY = magnitude > 1 ? safeY / magnitude : safeY;
  let x = roundTwo(normX);
  let y = roundTwo(normY);

  if (x * x + y * y > 1) {
    x = Math.trunc(normX * 100) / 100 + 0;
    y = Math.trunc(normY * 100) / 100 + 0;
  }

  return { x, y };
}

function clampLuminance(raw: number, fallback = 0): number {
  return Math.round(clampNumber(raw, -100, 100, fallback)) + 0;
}

function normalizeWheelValue(raw?: Partial<ColorWheelValue>): ColorWheelValue {
  const { x, y } = clampUnitCircle(raw?.x ?? 0, raw?.y ?? 0);
  const luminance = clampLuminance(raw?.luminance ?? 0, 0);
  return { x, y, luminance };
}

function normalizeGrade(raw?: Partial<ThreeWayColorGrade>): ThreeWayColorGrade {
  return {
    lift: normalizeWheelValue(raw?.lift),
    gamma: normalizeWheelValue(raw?.gamma),
    gain: normalizeWheelValue(raw?.gain),
  };
}

function getZoneValue(grade: ThreeWayColorGrade, zone: ColorWheelZone): ColorWheelValue {
  switch (zone) {
    case 'lift':
      return grade.lift;
    case 'gamma':
      return grade.gamma;
    case 'gain':
      return grade.gain;
  }
}

function withZoneValue(
  grade: ThreeWayColorGrade,
  zone: ColorWheelZone,
  nextValue: ColorWheelValue
): ThreeWayColorGrade {
  switch (zone) {
    case 'lift':
      return { lift: nextValue, gamma: grade.gamma, gain: grade.gain };
    case 'gamma':
      return { lift: grade.lift, gamma: nextValue, gain: grade.gain };
    case 'gain':
      return { lift: grade.lift, gamma: grade.gamma, gain: nextValue };
  }
}

function getZoneMeta(zone: ColorWheelZone): WheelZoneMeta {
  switch (zone) {
    case 'lift':
      return LIFT_ZONE_META;
    case 'gamma':
      return GAMMA_ZONE_META;
    case 'gain':
      return GAIN_ZONE_META;
  }
}

function wheelValuesEqual(a: ColorWheelValue, b: ColorWheelValue): boolean {
  return a.x === b.x && a.y === b.y && a.luminance === b.luminance;
}

function isWheelNeutral(value: ColorWheelValue): boolean {
  return value.x === 0 && value.y === 0 && value.luminance === 0;
}

function formatSignedAxis(value: number): string {
  const safe = value + 0;
  const fixed = safe.toFixed(2);
  return safe > 0 ? `+${fixed}` : fixed;
}

function formatSignedLuminance(value: number): string {
  const safe = value + 0;
  return safe > 0 ? `+${safe}` : String(safe);
}

const headerClass = /*#__PURE__*/ stableClassName('three-way-color-wheels', 'header');
const gridClass = /*#__PURE__*/ stableClassName('three-way-color-wheels', 'grid');
const cardClass = /*#__PURE__*/ stableClassName('three-way-color-wheels', 'card');
const wheelClass = /*#__PURE__*/ stableClassName('three-way-color-wheels', 'wheel');
const luminanceClass = /*#__PURE__*/ stableClassName('three-way-color-wheels', 'luminance');

function ThreeWayColorWheelsInner({
  value,
  defaultValue,
  onChange,
  title = DEFAULT_TITLE,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ThreeWayColorWheelsProps) {
  const override = useComponentOverride('ThreeWayColorWheels');
  const idPrefix = useId();

  const isControlled = value !== undefined;
  const [uncontrolledGrade, setUncontrolledGrade] = useState<ThreeWayColorGrade>(() =>
    normalizeGrade(defaultValue)
  );
  const controlledGrade = useMemo(
    () => (isControlled ? normalizeGrade(value) : null),
    [isControlled, value]
  );
  const currentGrade = controlledGrade ?? uncontrolledGrade;

  const [activeZone, setActiveZone] = useState<ColorWheelZone>('lift');
  const [draggingZone, setDraggingZone] = useState<ColorWheelZone | null>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (disabled) {
      cleanupDragRef.current?.();
      setDraggingZone(null);
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const latestRef = useRef({
    currentGrade,
    isControlled,
    onChange,
  });
  latestRef.current = {
    currentGrade,
    isControlled,
    onChange,
  };

  const commitZoneValue = useCallback(
    (zone: ColorWheelZone, nextValue: ColorWheelValue) => {
      const prevValue = getZoneValue(currentGrade, zone);
      if (wheelValuesEqual(prevValue, nextValue)) return;
      const nextGrade = withZoneValue(currentGrade, zone, nextValue);
      if (!isControlled) {
        setUncontrolledGrade(nextGrade);
      }
      onChange?.(nextGrade, zone);
    },
    [currentGrade, isControlled, onChange]
  );

  const handleWheelPointerDown = useCallback(
    (zone: ColorWheelZone, event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      cleanupDragRef.current?.();

      const wheelEl = event.currentTarget;
      let workingGrade = latestRef.current.currentGrade;

      setActiveZone(zone);
      setDraggingZone(zone);

      const applyPoint = (clientX: number, clientY: number) => {
        const rect = wheelEl.getBoundingClientRect();
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
        const radiusX = (rect.width / WHEEL_VIEWBOX) * WHEEL_RADIUS;
        const radiusY = (rect.height / WHEEL_VIEWBOX) * WHEEL_RADIUS;
        const rawX = (clientX - centerX) / radiusX;
        const rawY = -(clientY - centerY) / radiusY;
        const { x, y } = clampUnitCircle(rawX, rawY);

        const baseGrade = latestRef.current.isControlled
          ? latestRef.current.currentGrade
          : workingGrade;
        const prevZoneValue = getZoneValue(workingGrade, zone);
        const currentLuminance = getZoneValue(baseGrade, zone).luminance;
        const nextZoneValue: ColorWheelValue = { x, y, luminance: currentLuminance };

        if (wheelValuesEqual(prevZoneValue, nextZoneValue)) return;

        const nextGrade = withZoneValue(baseGrade, zone, nextZoneValue);
        workingGrade = nextGrade;
        if (!latestRef.current.isControlled) {
          setUncontrolledGrade(nextGrade);
        }
        latestRef.current.onChange?.(nextGrade, zone);
      };

      applyPoint(event.clientX, event.clientY);

      const handlePointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        applyPoint(moveEvent.clientX, moveEvent.clientY);
      });

      const cleanup = () => {
        handlePointerMove.cancel();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setDraggingZone(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [disabled]
  );

  const handleWheelDoubleClick = useCallback(
    (zone: ColorWheelZone) => {
      if (disabled) return;
      setActiveZone(zone);
      const current = getZoneValue(currentGrade, zone);
      commitZoneValue(zone, { x: 0, y: 0, luminance: current.luminance });
    },
    [commitZoneValue, currentGrade, disabled]
  );

  const handleWheelKeyDown = useCallback(
    (zone: ColorWheelZone, event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      const step = event.shiftKey ? SHIFT_NUDGE_STEP : FINE_NUDGE_STEP;
      const current = getZoneValue(currentGrade, zone);
      let targetX = current.x;
      let targetY = current.y;

      if (event.key === 'ArrowRight') {
        targetX = current.x + step;
      } else if (event.key === 'ArrowLeft') {
        targetX = current.x - step;
      } else if (event.key === 'ArrowUp') {
        targetY = current.y + step;
      } else if (event.key === 'ArrowDown') {
        targetY = current.y - step;
      } else if (event.key === 'Home') {
        targetX = 0;
        targetY = 0;
      } else {
        return;
      }

      event.preventDefault();
      setActiveZone(zone);
      const { x, y } = clampUnitCircle(targetX, targetY);
      commitZoneValue(zone, { x, y, luminance: current.luminance });
    },
    [commitZoneValue, currentGrade, disabled]
  );

  const handleLuminanceChange = useCallback(
    (zone: ColorWheelZone, event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      setActiveZone(zone);
      const current = getZoneValue(currentGrade, zone);
      const nextLuminance = clampLuminance(Number(event.target.value), current.luminance);
      commitZoneValue(zone, { x: current.x, y: current.y, luminance: nextLuminance });
    },
    [commitZoneValue, currentGrade, disabled]
  );

  const handleResetZone = useCallback(
    (zone: ColorWheelZone) => {
      setActiveZone(zone);
      commitZoneValue(zone, { ...NEUTRAL_WHEEL_VALUE });
    },
    [commitZoneValue]
  );

  const dirtyZoneId: ColorWheelZone | null = !isWheelNeutral(currentGrade.lift)
    ? 'lift'
    : !isWheelNeutral(currentGrade.gamma)
      ? 'gamma'
      : !isWheelNeutral(currentGrade.gain)
        ? 'gain'
        : null;
  const hasAnyAdjustment = dirtyZoneId !== null;

  const handleResetAll = useCallback(() => {
    const reportedZone: ColorWheelZone =
      dirtyZoneId !== null && isWheelNeutral(getZoneValue(currentGrade, activeZone))
        ? dirtyZoneId
        : activeZone;
    const neutralGrade: ThreeWayColorGrade = {
      lift: { ...NEUTRAL_WHEEL_VALUE },
      gamma: { ...NEUTRAL_WHEEL_VALUE },
      gain: { ...NEUTRAL_WHEEL_VALUE },
    };

    setActiveZone(reportedZone);
    if (!isControlled) {
      setUncontrolledGrade(neutralGrade);
    }
    onChange?.(neutralGrade, reportedZone);
  }, [activeZone, currentGrade, dirtyZoneId, isControlled, onChange]);

  const activeZoneMeta = getZoneMeta(activeZone);
  const activeZoneValue = getZoneValue(currentGrade, activeZone);

  const merged = mergeProps({
    themeTarget: themeProps('three-way-color-wheels', {
      disabled,
      activeZone,
      draggingZone: draggingZone ?? undefined,
      modified: hasAnyAdjustment,
    }),
    baseClassName: 'prism-slab w-full max-w-full p-4 sm:p-5 space-y-4 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="region" aria-label={title} {...rest} {...merged}>
      {/* Panel Header */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex items-center gap-2 min-w-0">
          <Palette
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color:
                hasAnyAdjustment || draggingZone !== null
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-secondary)',
            }}
          />
          <span
            data-testid="color-wheels-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            data-testid="color-wheels-active-summary"
            className="prism-well inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-semibold tabular-nums max-w-full truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeZoneMeta.token }}
            />
            <span className="truncate">
              {activeZoneMeta.label} · X {formatSignedAxis(activeZoneValue.x)} · Y{' '}
              {formatSignedAxis(activeZoneValue.y)} · L{' '}
              {formatSignedLuminance(activeZoneValue.luminance)}
            </span>
          </span>

          <button
            type="button"
            disabled={disabled || !hasAnyAdjustment}
            data-testid="color-wheels-reset-all"
            aria-label="Reset all color wheels"
            onClick={handleResetAll}
            className={cx(
              'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed shrink-0',
              disabled || !hasAnyAdjustment ? 'opacity-50' : ''
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Reset All</span>
          </button>
        </div>
      </div>

      {/* Responsive 3-Column Color Grading Grid */}
      <div className={cx(gridClass, 'grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-full')}>
        {WHEEL_ZONES.map((zone) => {
          const zoneValue = getZoneValue(currentGrade, zone.id);
          const zoneNeutral = isWheelNeutral(zoneValue);
          const isDragging = draggingZone === zone.id;
          const isActive = activeZone === zone.id;
          const puckX = roundTwo(WHEEL_CENTER + zoneValue.x * WHEEL_RADIUS);
          const puckY = roundTwo(WHEEL_CENTER - zoneValue.y * WHEEL_RADIUS);
          const hasChromaOffset = zoneValue.x !== 0 || zoneValue.y !== 0;
          const saturationPct = Math.min(
            100,
            Math.round(Math.hypot(zoneValue.x, zoneValue.y) * 100)
          );
          const luminanceSliderId = `${idPrefix}-luminance-${zone.id}`;

          return (
            <div
              key={zone.id}
              data-testid={`wheel-card-${zone.id}`}
              data-active={isActive ? 'true' : undefined}
              data-modified={!zoneNeutral ? 'true' : undefined}
              className={cx(
                cardClass,
                'prism-well rounded-2xl p-3 flex flex-col gap-3 min-w-0 max-w-full'
              )}
            >
              {/* Zone Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    aria-hidden="true"
                    data-testid={`wheel-indicator-${zone.id}`}
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: zone.token,
                      opacity: zoneNeutral ? 0.55 : 1,
                    }}
                  />
                  <span
                    className="text-xs font-semibold tracking-tight truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {zone.label}
                  </span>
                  <span
                    className="text-[11px] truncate"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    ({zone.rangeLabel})
                  </span>
                </div>

                <button
                  type="button"
                  disabled={disabled || zoneNeutral}
                  data-testid={`wheel-reset-${zone.id}`}
                  aria-label={`Reset ${zone.label}`}
                  onClick={() => handleResetZone(zone.id)}
                  className={cx(
                    'prism-crystal prism-focus-ring inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-opacity cursor-pointer disabled:cursor-not-allowed shrink-0',
                    disabled || zoneNeutral ? 'opacity-45' : ''
                  )}
                  style={STYLE_TEXT_PRIMARY}
                >
                  <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Interactive Circular Chromaticity Wheel */}
              <div
                role="slider"
                aria-label={`${zone.label} color balance`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={saturationPct}
                aria-valuetext={`X ${formatSignedAxis(zoneValue.x)}, Y ${formatSignedAxis(zoneValue.y)}, Luminance ${formatSignedLuminance(zoneValue.luminance)}`}
                aria-disabled={disabled || undefined}
                tabIndex={disabled ? -1 : 0}
                data-testid={`wheel-slider-${zone.id}`}
                data-dragging={isDragging ? 'true' : undefined}
                onFocus={() => setActiveZone(zone.id)}
                onPointerDown={(event) => handleWheelPointerDown(zone.id, event)}
                onDoubleClick={() => handleWheelDoubleClick(zone.id)}
                onKeyDown={(event) => handleWheelKeyDown(zone.id, event)}
                style={{ touchAction: 'none' }}
                className={cx(
                  wheelClass,
                  'prism-crystal prism-focus-ring relative rounded-full p-1 touch-none flex items-center justify-center w-full max-w-[156px] mx-auto',
                  disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : isDragging
                      ? 'cursor-grabbing'
                      : 'cursor-crosshair'
                )}
              >
                <svg
                  viewBox={`0 0 ${WHEEL_VIEWBOX} ${WHEEL_VIEWBOX}`}
                  aria-hidden="true"
                  data-testid={`wheel-svg-${zone.id}`}
                  className="w-full max-w-[148px] mx-auto select-none block overflow-visible pointer-events-none prism-contain-leaf"
                >
                  {/* Outer Optical Crystal Rim */}
                  <circle
                    cx={WHEEL_CENTER}
                    cy={WHEEL_CENTER}
                    r={65}
                    fill="none"
                    stroke="var(--prism-divider)"
                    strokeWidth={1.25}
                  />

                  {/* Recessed Chromaticity Well */}
                  <circle
                    cx={WHEEL_CENTER}
                    cy={WHEEL_CENTER}
                    r={WHEEL_RADIUS}
                    fill="var(--prism-well-start)"
                    stroke="var(--prism-well-border)"
                    strokeWidth={1.5}
                  />

                  {/* Concentric Reference Rings */}
                  {REFERENCE_RINGS.map((ring) => (
                    <circle
                      key={ring.id}
                      data-testid={`wheel-ring-${zone.id}-${ring.id}`}
                      cx={WHEEL_CENTER}
                      cy={WHEEL_CENTER}
                      r={ring.radius}
                      fill="none"
                      stroke="var(--prism-divider)"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                    />
                  ))}

                  {/* Crosshair Axes */}
                  <line
                    x1={WHEEL_CENTER - WHEEL_RADIUS}
                    y1={WHEEL_CENTER}
                    x2={WHEEL_CENTER + WHEEL_RADIUS}
                    y2={WHEEL_CENTER}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                  <line
                    x1={WHEEL_CENTER}
                    y1={WHEEL_CENTER - WHEEL_RADIUS}
                    x2={WHEEL_CENTER}
                    y2={WHEEL_CENTER + WHEEL_RADIUS}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />

                  {/* Semantic Cardinal Chroma Markers */}
                  {CARDINAL_CHROMA_MARKERS.map((marker) => (
                    <g key={marker.id}>
                      <line
                        x1={marker.tickX1}
                        y1={marker.tickY1}
                        x2={marker.tickX2}
                        y2={marker.tickY2}
                        stroke={marker.token}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        opacity={0.75}
                      />
                      <circle
                        data-testid={`wheel-marker-${zone.id}-${marker.id}`}
                        cx={marker.cx}
                        cy={marker.cy}
                        r={3.5}
                        fill={marker.token}
                      />
                    </g>
                  ))}

                  {/* Center Neutral Anchor */}
                  <circle
                    cx={WHEEL_CENTER}
                    cy={WHEEL_CENTER}
                    r={2.8}
                    fill="var(--prism-well-end)"
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                  />

                  {/* Active Balance Vector Line */}
                  <line
                    data-testid={`wheel-vector-${zone.id}`}
                    x1={WHEEL_CENTER}
                    y1={WHEEL_CENTER}
                    x2={puckX}
                    y2={puckY}
                    stroke={zone.token}
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={hasChromaOffset ? 0.9 : 0}
                  />

                  {/* Draggable Chromaticity Puck */}
                  <g data-testid={`wheel-puck-${zone.id}`}>
                    <circle
                      cx={puckX}
                      cy={puckY}
                      r={10.5}
                      fill="none"
                      stroke={zone.token}
                      strokeWidth={1.5}
                      opacity={isDragging ? 0.95 : 0.45}
                    />
                    <circle
                      cx={puckX}
                      cy={puckY}
                      r={7}
                      fill="var(--prism-crystal-top)"
                      stroke={zone.token}
                      strokeWidth={2}
                    />
                    <circle cx={puckX} cy={puckY} r={2.6} fill={zone.token} />
                  </g>
                </svg>
              </div>

              {/* Paired Master Luminance Slider */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2 text-[11px] min-w-0">
                  <label
                    htmlFor={luminanceSliderId}
                    className="font-medium truncate"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Luminance
                  </label>
                  <span
                    className="font-mono font-semibold tabular-nums shrink-0"
                    style={{
                      color:
                        zoneValue.luminance === 0
                          ? 'var(--prism-text-secondary)'
                          : 'var(--prism-text-primary)',
                    }}
                  >
                    {formatSignedLuminance(zoneValue.luminance)}
                  </span>
                </div>

                <input
                  id={luminanceSliderId}
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={zoneValue.luminance}
                  disabled={disabled}
                  aria-label={`${zone.label} luminance`}
                  aria-valuetext={`Luminance ${formatSignedLuminance(zoneValue.luminance)}`}
                  data-testid={`wheel-luminance-${zone.id}`}
                  onFocus={() => setActiveZone(zone.id)}
                  onChange={(event) => handleLuminanceChange(zone.id, event)}
                  style={{ accentColor: zone.token }}
                  className={cx(
                    luminanceClass,
                    'prism-focus-ring w-full h-1.5 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                />
              </div>

              {/* Tabular Numeric Readout (X, Y, Lum) */}
              <div className="grid grid-cols-3 gap-1.5 min-w-0">
                <div className="prism-crystal rounded-xl px-1.5 py-1 flex flex-col items-center min-w-0">
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    X
                  </span>
                  <span
                    data-testid={`wheel-readout-x-${zone.id}`}
                    className="font-mono text-[11px] font-semibold tabular-nums truncate max-w-full"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {formatSignedAxis(zoneValue.x)}
                  </span>
                </div>

                <div className="prism-crystal rounded-xl px-1.5 py-1 flex flex-col items-center min-w-0">
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Y
                  </span>
                  <span
                    data-testid={`wheel-readout-y-${zone.id}`}
                    className="font-mono text-[11px] font-semibold tabular-nums truncate max-w-full"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {formatSignedAxis(zoneValue.y)}
                  </span>
                </div>

                <div className="prism-crystal rounded-xl px-1.5 py-1 flex flex-col items-center min-w-0">
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Lum
                  </span>
                  <span
                    data-testid={`wheel-readout-lum-${zone.id}`}
                    className="font-mono text-[11px] font-semibold tabular-nums truncate max-w-full"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {formatSignedLuminance(zoneValue.luminance)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ThreeWayColorWheels = /*#__PURE__*/ memoWithDisplayName(ThreeWayColorWheelsInner, 'ThreeWayColorWheels');
