'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type PanKnobSize = 'sm' | 'md' | 'lg';

type StereoPanKnobBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface StereoPanKnobProps extends StereoPanKnobBaseProps {
  /** Controlled stereo pan value in [-100..100], where -100 = L100, 0 = C, +100 = R100. */
  value?: number;
  /** Initial uncontrolled stereo pan value in [-100..100] (defaults to 0). */
  defaultValue?: number;
  /** Callback invoked when the stereo pan value changes, receiving the numeric pan and formatted readout (e.g. 'L45', 'C', 'R62'). */
  onChange?: (pan: number, formatted: string) => void;
  /** Visible control label and accessible slider name (defaults to 'Stereo Pan'). */
  label?: string;
  /** Responsive dial size preset ('sm' | 'md' | 'lg', defaults to 'md'). */
  size?: PanKnobSize;
  /** Magnetic snap-to-center deadzone width around 0 during pointer drag, clamped to [0..15] (defaults to 4). */
  centerDetentWidth?: number;
  /** Disables pointer dragging, double-click center reset, keyboard stepping, and L/C/R detent buttons (defaults to false). */
  disabled?: boolean;
}

type PanSide = 'left' | 'center' | 'right';

interface SizeConfig {
  dialPx: number;
  facePx: number;
  cardPaddingClass: string;
  buttonClass: string;
  readoutClass: string;
}

interface PanVisualMeta {
  side: PanSide;
  colorToken: string;
  contrastToken: string;
}

interface ScaleTick {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const MIN_PAN = -100;
const MAX_PAN = 100;
const DEFAULT_PAN = 0;
const DEFAULT_LABEL = 'Stereo Pan';
const DEFAULT_CENTER_DETENT_WIDTH = 4;
const MIN_CENTER_DETENT_WIDTH = 0;
const MAX_CENTER_DETENT_WIDTH = 15;

const COARSE_KEY_STEP = 5;
const FINE_KEY_STEP = 1;
const PAGE_KEY_STEP = 25;

const VIEWBOX_SIZE = 120;
const CENTER = 60;
const TRACK_RADIUS = 46;
const START_ANGLE_DEG = -135;
const END_ANGLE_DEG = 135;
const HALF_SWEEP_DEGREES = 135;

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function polarToCartesian(cxPos: number, cyPos: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: roundTwo(cxPos + radius * Math.cos(rad)),
    y: roundTwo(cyPos + radius * Math.sin(rad)),
  };
}

function clampPan(raw: number, fallback: number): number {
  const rounded = Math.round(clampNumber(raw, MIN_PAN, MAX_PAN, fallback));
  return rounded === 0 ? 0 : rounded;
}

function formatPanReadout(pan: number): string {
  if (pan < 0) return `L${Math.abs(pan)}`;
  if (pan > 0) return `R${pan}`;
  return 'C';
}

function formatPanAriaValueText(pan: number): string {
  if (pan < 0) return `${Math.abs(pan)}% Left`;
  if (pan > 0) return `${pan}% Right`;
  return 'Center';
}

function getSizeConfig(size: PanKnobSize): SizeConfig {
  if (size === 'sm') {
    return {
      dialPx: 88,
      facePx: 54,
      cardPaddingClass: 'p-3 gap-2.5',
      buttonClass: 'h-6 min-w-7 px-2 text-[11px]',
      readoutClass: 'px-2 py-0.5 text-[11px]',
    };
  }
  if (size === 'lg') {
    return {
      dialPx: 140,
      facePx: 86,
      cardPaddingClass: 'p-4 sm:p-5 gap-3.5',
      buttonClass: 'h-8 min-w-9 px-3 text-xs',
      readoutClass: 'px-2.5 py-1 text-xs',
    };
  }
  return {
    dialPx: 112,
    facePx: 68,
    cardPaddingClass: 'p-3.5 sm:p-4 gap-3',
    buttonClass: 'h-7 min-w-8 px-2.5 text-xs',
    readoutClass: 'px-2.5 py-0.5 text-xs',
  };
}

function getPanVisualMeta(pan: number): PanVisualMeta {
  if (pan < 0) {
    return {
      side: 'left',
      colorToken: 'var(--prism-info-main)',
      contrastToken: 'var(--prism-info-contrast)',
    };
  }
  if (pan > 0) {
    return {
      side: 'right',
      colorToken: 'var(--prism-primary-main)',
      contrastToken: 'var(--prism-primary-contrast)',
    };
  }
  return {
    side: 'center',
    colorToken: 'var(--prism-success-main)',
    contrastToken: 'var(--prism-success-contrast)',
  };
}

const TRACK_START = polarToCartesian(CENTER, CENTER, TRACK_RADIUS, START_ANGLE_DEG);
const TRACK_END = polarToCartesian(CENTER, CENTER, TRACK_RADIUS, END_ANGLE_DEG);
const TOP_POINT = polarToCartesian(CENTER, CENTER, TRACK_RADIUS, 0);
const TRACK_ARC_PATH = `M ${TRACK_START.x} ${TRACK_START.y} A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 1 1 ${TRACK_END.x} ${TRACK_END.y}`;

const CALIBRATION_TICKS: ReadonlyArray<ScaleTick> = [-135, -90, -45, 45, 90, 135].map((deg) => {
  const inner = polarToCartesian(CENTER, CENTER, 53.5, deg);
  const outer = polarToCartesian(CENTER, CENTER, 57, deg);
  return {
    id: `tick-${deg}`,
    x1: inner.x,
    y1: inner.y,
    x2: outer.x,
    y2: outer.y,
  };
});

function buildBidirectionalArcPath(pan: number, angleDeg: number): string {
  if (pan === 0) {
    return `M ${TOP_POINT.x} ${TOP_POINT.y} L ${TOP_POINT.x} ${TOP_POINT.y}`;
  }
  const end = polarToCartesian(CENTER, CENTER, TRACK_RADIUS, angleDeg);
  const sweepFlag = pan > 0 ? 1 : 0;
  return `M ${TOP_POINT.x} ${TOP_POINT.y} A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 0 ${sweepFlag} ${end.x} ${end.y}`;
}

export function StereoPanKnob({
  value,
  defaultValue = DEFAULT_PAN,
  onChange,
  label = DEFAULT_LABEL,
  size = 'md',
  centerDetentWidth = DEFAULT_CENTER_DETENT_WIDTH,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: StereoPanKnobProps) {
  const override = useComponentOverride('StereoPanKnob');

  const safeDefaultPan = clampPan(defaultValue, DEFAULT_PAN);
  const safeDetentWidth = clampNumber(
    centerDetentWidth,
    MIN_CENTER_DETENT_WIDTH,
    MAX_CENTER_DETENT_WIDTH,
    DEFAULT_CENTER_DETENT_WIDTH
  );

  const isControlled = value !== undefined;
  const [uncontrolledPan, setUncontrolledPan] = useState<number>(safeDefaultPan);
  const rawPan = isControlled ? value : uncontrolledPan;
  const currentPan = clampPan(rawPan, safeDefaultPan);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const latestRef = useRef({
    isControlled,
    onChange,
    safeDetentWidth,
  });
  latestRef.current = {
    isControlled,
    onChange,
    safeDetentWidth,
  };

  useEffect(() => {
    if (disabled) {
      cleanupDragRef.current?.();
      setIsDragging(false);
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const commitPan = useCallback(
    (targetRaw: number) => {
      if (disabled) return;
      const nextPan = clampPan(targetRaw, currentPan);
      if (nextPan === currentPan) return;
      if (!isControlled) {
        setUncontrolledPan(nextPan);
      }
      onChange?.(nextPan, formatPanReadout(nextPan));
    },
    [currentPan, disabled, isControlled, onChange]
  );

  const handleDialPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      cleanupDragRef.current?.();

      const activePointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      const startPan = currentPan;
      let lastEmitted = currentPan;

      setIsDragging(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== activePointerId) return;

        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const rawNext = clampNumber(startPan + (dx - dy), MIN_PAN, MAX_PAN, lastEmitted);
        const {
          safeDetentWidth: detent,
          isControlled: controlled,
          onChange: emitChange,
        } = latestRef.current;

        const snapped =
          detent > 0 && Math.abs(rawNext) <= detent ? 0 : clampPan(rawNext, lastEmitted);

        if (snapped !== lastEmitted) {
          lastEmitted = snapped;
          if (!controlled) {
            setUncontrolledPan(snapped);
          }
          emitChange?.(snapped, formatPanReadout(snapped));
        }
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== activePointerId) return;
        cleanup();
        setIsDragging(false);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [currentPan, disabled]
  );

  const handleDialDoubleClick = useCallback(() => {
    commitPan(0);
  }, [commitPan]);

  const handleDialKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        disabled ||
        event.nativeEvent.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      const arrowStep = event.shiftKey ? FINE_KEY_STEP : COARSE_KEY_STEP;
      let targetPan: number | null = null;

      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        targetPan = currentPan + arrowStep;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        targetPan = currentPan - arrowStep;
      } else if (event.key === 'PageUp') {
        targetPan = currentPan + PAGE_KEY_STEP;
      } else if (event.key === 'PageDown') {
        targetPan = currentPan - PAGE_KEY_STEP;
      } else if (event.key === 'Home') {
        targetPan = MIN_PAN;
      } else if (event.key === 'End') {
        targetPan = MAX_PAN;
      } else if (event.key === '0' || event.key === 'c' || event.key === 'C') {
        targetPan = 0;
      }

      if (targetPan === null) return;
      event.preventDefault();
      commitPan(targetPan);
    },
    [commitPan, currentPan, disabled]
  );

  const trimmedLabel = label.trim();
  const accessibleLabel = trimmedLabel.length > 0 ? trimmedLabel : DEFAULT_LABEL;
  const displayLabel = trimmedLabel.length > 0 ? label : DEFAULT_LABEL;

  const sizeConfig = getSizeConfig(size);
  const visualMeta = getPanVisualMeta(currentPan);
  const isCentered = currentPan === 0;
  const formattedReadout = formatPanReadout(currentPan);
  const ariaValueText = formatPanAriaValueText(currentPan);
  const angleDeg = roundTwo((currentPan / MAX_PAN) * HALF_SWEEP_DEGREES);
  const activeArcPath = buildBidirectionalArcPath(currentPan, angleDeg);

  const merged = mergeProps({
    themeTarget: themeProps('stereo-pan-knob', {
      size,
      side: visualMeta.side,
      centered: isCentered,
      dragging: isDragging,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab inline-flex flex-col items-center max-w-full min-w-0 select-none',
      sizeConfig.cardPaddingClass,
      disabled ? 'opacity-65' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('stereo-pan-knob', 'header');
  const labelClass = stableClassName('stereo-pan-knob', 'label');
  const readoutClass = stableClassName('stereo-pan-knob', 'readout');
  const dialClass = stableClassName('stereo-pan-knob', 'dial');
  const faceClass = stableClassName('stereo-pan-knob', 'face');
  const detentsClass = stableClassName('stereo-pan-knob', 'detents');

  const isHardLeft = currentPan === MIN_PAN;
  const isHardRight = currentPan === MAX_PAN;

  return (
    <div
      ref={ref}
      role="group"
      aria-label={`${accessibleLabel} control`}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Card Header: Label + Live Center-Aware Readout Pill */}
      <div
        className={cx(
          headerClass,
          'flex items-center justify-between gap-2 w-full min-w-0 max-w-full'
        )}
      >
        <span
          data-testid="stereo-pan-label"
          className={cx(
            labelClass,
            'text-xs font-semibold tracking-tight truncate min-w-0'
          )}
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {displayLabel}
        </span>

        <span
          role="status"
          aria-live="polite"
          data-testid="stereo-pan-readout"
          data-pan-side={visualMeta.side}
          className={cx(
            readoutClass,
            'prism-well inline-flex items-center gap-1.5 rounded-full font-mono font-bold tabular-nums shrink-0',
            sizeConfig.readoutClass
          )}
          style={{ color: visualMeta.colorToken }}
        >
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: visualMeta.colorToken }}
          />
          {formattedReadout}
        </span>
      </div>

      {/* Center-Detented Optical SVG Rotary Pan Dial */}
      <div
        role="slider"
        aria-label={accessibleLabel}
        aria-valuemin={MIN_PAN}
        aria-valuemax={MAX_PAN}
        aria-valuenow={currentPan}
        aria-valuetext={ariaValueText}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        data-testid="stereo-pan-dial"
        data-dragging={isDragging ? 'true' : undefined}
        data-centered={isCentered ? 'true' : undefined}
        onPointerDown={handleDialPointerDown}
        onDoubleClick={handleDialDoubleClick}
        onKeyDown={handleDialKeyDown}
        style={{
          width: `${sizeConfig.dialPx}px`,
          height: `${sizeConfig.dialPx}px`,
          touchAction: 'none',
        }}
        className={cx(
          dialClass,
          'prism-focus-ring relative inline-flex items-center justify-center max-w-full aspect-square rounded-full touch-none shrink-0 transition-transform duration-100',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
        )}
      >
        <svg
          width={sizeConfig.dialPx}
          height={sizeConfig.dialPx}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          aria-hidden="true"
          data-testid="stereo-pan-svg"
          className="block w-full h-full overflow-visible pointer-events-none"
        >
          {/* Outer Calibration Scale Ticks */}
          {CALIBRATION_TICKS.map((tick) => (
            <line
              key={tick.id}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="var(--prism-text-disabled)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ))}

          {/* 12-o'clock Center Detent Notch */}
          <line
            data-testid="stereo-pan-center-detent"
            x1={CENTER}
            y1={2}
            x2={CENTER}
            y2={8.5}
            stroke={isCentered ? 'var(--prism-success-main)' : 'var(--prism-text-secondary)'}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Outer 270-Degree Track Arc (-135deg to +135deg) */}
          <path
            data-testid="stereo-pan-track"
            d={TRACK_ARC_PATH}
            fill="none"
            stroke="var(--prism-divider)"
            strokeWidth={8}
            strokeLinecap="round"
          />

          {/* Bi-Directional Illuminated Arc Sweeping Outward from 12-o'clock Center */}
          <path
            data-testid="stereo-pan-active-arc"
            d={activeArcPath}
            fill="none"
            stroke={visualMeta.colorToken}
            strokeWidth={8}
            strokeLinecap="round"
            strokeOpacity={isCentered ? 0 : 1}
          />

          {/* 12-o'clock Magnetic Center Crown Dot */}
          <circle
            data-testid="stereo-pan-center-dot"
            cx={TOP_POINT.x}
            cy={TOP_POINT.y}
            r={3.25}
            fill="var(--prism-success-main)"
            fillOpacity={isCentered ? 1 : 0.35}
          />

          {/* Subtle L / R Scale Endpoint Markers */}
          <text
            x={22}
            y={112}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill={currentPan < 0 ? 'var(--prism-info-main)' : 'var(--prism-text-secondary)'}
          >
            L
          </text>
          <text
            x={98}
            y={112}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill={currentPan > 0 ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)'}
          >
            R
          </text>
        </svg>

        {/* Tactile Optical Crystal Dial Face with Radial Pointer Needle */}
        <div
          aria-hidden="true"
          data-testid="stereo-pan-face"
          style={{
            width: `${sizeConfig.facePx}px`,
            height: `${sizeConfig.facePx}px`,
          }}
          className={cx(
            faceClass,
            'prism-crystal pointer-events-none absolute rounded-full flex items-center justify-center border border-[var(--prism-divider)]'
          )}
        >
          <svg
            viewBox="0 0 64 64"
            width={sizeConfig.facePx}
            height={sizeConfig.facePx}
            aria-hidden="true"
            className="block pointer-events-none"
          >
            <circle
              cx={32}
              cy={32}
              r={25}
              fill="none"
              stroke="var(--prism-divider)"
              strokeWidth={1}
            />
            <g
              data-testid="stereo-pan-needle"
              transform={`rotate(${angleDeg} 32 32)`}
            >
              <line
                data-testid="stereo-pan-needle-line"
                x1={32}
                y1={23}
                x2={32}
                y2={7}
                stroke={visualMeta.colorToken}
                strokeWidth={4}
                strokeLinecap="round"
              />
              <circle
                cx={32}
                cy={32}
                r={4.5}
                fill="var(--prism-well-start)"
                stroke="var(--prism-well-border)"
                strokeWidth={1.5}
              />
              <circle
                cx={32}
                cy={32}
                r={1.8}
                fill={visualMeta.colorToken}
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Quick L / C / R Detent Buttons */}
      <div
        role="group"
        aria-label={`${accessibleLabel} quick detents`}
        className={cx(
          detentsClass,
          'flex items-center justify-center gap-1.5 w-full min-w-0 max-w-full'
        )}
      >
        <button
          type="button"
          disabled={disabled}
          aria-label={`Pan hard left (${accessibleLabel})`}
          aria-pressed={isHardLeft}
          data-testid="stereo-pan-detent-left"
          onClick={() => commitPan(MIN_PAN)}
          className={cx(
            'prism-focus-ring rounded-full font-mono font-bold inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all',
            sizeConfig.buttonClass,
            isHardLeft ? '' : 'prism-crystal'
          )}
          style={
            isHardLeft
              ? {
                  backgroundColor: 'var(--prism-info-main)',
                  color: 'var(--prism-info-contrast)',
                }
              : { color: 'var(--prism-text-secondary)' }
          }
        >
          L
        </button>

        <button
          type="button"
          disabled={disabled}
          aria-label={`Pan center (${accessibleLabel})`}
          aria-pressed={isCentered}
          data-testid="stereo-pan-detent-center"
          onClick={() => commitPan(0)}
          className={cx(
            'prism-focus-ring rounded-full font-mono font-bold inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all',
            sizeConfig.buttonClass,
            isCentered ? 'prism-emerald' : 'prism-crystal'
          )}
          style={isCentered ? undefined : { color: 'var(--prism-text-secondary)' }}
        >
          C
        </button>

        <button
          type="button"
          disabled={disabled}
          aria-label={`Pan hard right (${accessibleLabel})`}
          aria-pressed={isHardRight}
          data-testid="stereo-pan-detent-right"
          onClick={() => commitPan(MAX_PAN)}
          className={cx(
            'prism-focus-ring rounded-full font-mono font-bold inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all',
            sizeConfig.buttonClass,
            isHardRight ? '' : 'prism-crystal'
          )}
          style={
            isHardRight
              ? {
                  backgroundColor: 'var(--prism-primary-main)',
                  color: 'var(--prism-primary-contrast)',
                }
              : { color: 'var(--prism-text-secondary)' }
          }
        >
          R
        </button>
      </div>
    </div>
  );
}

StereoPanKnob.displayName = 'StereoPanKnob';
