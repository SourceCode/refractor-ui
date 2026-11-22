'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  ChevronsLeftRight,
  ChevronsUpDown,
  Columns2,
  Crosshair,
  Eye,
  EyeOff,
  Rows2,
  SlidersHorizontal,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type WipeOrientation = 'vertical' | 'horizontal';

export interface WipeCompareOverlayProps extends BaseProps<HTMLDivElement> {
  /** Controlled wipe split percentage in [0..100]. */
  positionPct?: number;
  /** Initial wipe split percentage in [0..100] in uncontrolled mode (defaults to 50). */
  defaultPositionPct?: number;
  /** Callback fired whenever the wipe split percentage changes via drag, keyboard, or 50/50 reset. */
  onPositionChange?: (positionPct: number) => void;
  /** Controlled wipe axis orientation ('vertical' | 'horizontal'). */
  orientation?: WipeOrientation;
  /** Initial wipe axis orientation in uncontrolled mode (defaults to 'vertical'). */
  defaultOrientation?: WipeOrientation;
  /** Callback fired when the user toggles between vertical and horizontal wipe orientations. */
  onOrientationChange?: (orientation: WipeOrientation) => void;
  /** Floating corner badge label for the ungraded/original layer (defaults to 'Original (Log-C)'). */
  beforeLabel?: string;
  /** Floating corner badge label for the graded layer (defaults to 'Graded (Prism LUT)'). */
  afterLabel?: string;
  /** Custom React content for the ungraded/original layer; renders a rich Log-C optical frame if omitted. */
  beforeContent?: ReactNode;
  /** Custom React content for the color-graded layer; renders a rich Prism LUT optical frame if omitted. */
  afterContent?: ReactNode;
  /** Callback fired when press-and-hold original bypass engages (true) or releases (false). */
  onHoldCompareChange?: (holdingOriginal: boolean) => void;
  /** Disables wipe dragging, keyboard stepping, orientation switching, 50/50 reset, and hold-compare bypass. */
  disabled?: boolean;
}

const MIN_POSITION = 0;
const MAX_POSITION = 100;
const DEFAULT_POSITION = 50;
const KEYBOARD_STEP = 2;
const KEYBOARD_SHIFT_STEP = 10;

interface ToneSwatch {
  id: string;
  x: number;
  colorVar: string;
  opacity: number;
}

const ORIGINAL_SWATCHES: ReadonlyArray<ToneSwatch> = [
  { id: 'orig-1', x: 18, colorVar: 'var(--prism-text-secondary)', opacity: 0.22 },
  { id: 'orig-2', x: 38, colorVar: 'var(--prism-text-secondary)', opacity: 0.34 },
  { id: 'orig-3', x: 58, colorVar: 'var(--prism-text-secondary)', opacity: 0.46 },
  { id: 'orig-4', x: 78, colorVar: 'var(--prism-text-secondary)', opacity: 0.58 },
  { id: 'orig-5', x: 98, colorVar: 'var(--prism-text-secondary)', opacity: 0.7 },
];

const GRADED_SWATCHES: ReadonlyArray<ToneSwatch> = [
  { id: 'grad-1', x: 18, colorVar: 'var(--prism-info-dark)', opacity: 0.92 },
  { id: 'grad-2', x: 38, colorVar: 'var(--prism-secondary-main)', opacity: 0.92 },
  { id: 'grad-3', x: 58, colorVar: 'var(--prism-success-main)', opacity: 0.9 },
  { id: 'grad-4', x: 78, colorVar: 'var(--prism-primary-main)', opacity: 0.95 },
  { id: 'grad-5', x: 98, colorVar: 'var(--prism-primary-light)', opacity: 0.95 },
];

function roundPercent(value: number): number {
  const clamped = clampNumber(value, MIN_POSITION, MAX_POSITION, DEFAULT_POSITION);
  const rounded = Math.round(clamped * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function isHoldTriggerKey(key: string): boolean {
  return key === ' ' || key === 'Spacebar' || key === 'Enter';
}

interface DefaultFrameProps {
  variant: 'original' | 'graded';
  gradientPrefix: string;
}

function DefaultOpticalFrame({ variant, gradientPrefix }: DefaultFrameProps) {
  const isGraded = variant === 'graded';
  const skyGradId = `${gradientPrefix}-${variant}-sky`;
  const sunGlowId = `${gradientPrefix}-${variant}-sun`;
  const causticGlowId = `${gradientPrefix}-${variant}-caustic`;
  const horizonGradId = `${gradientPrefix}-${variant}-horizon`;
  const swatches = isGraded ? GRADED_SWATCHES : ORIGINAL_SWATCHES;

  return (
    <div
      data-testid={isGraded ? 'wipe-after-placeholder' : 'wipe-before-placeholder'}
      className={cx(
        'relative w-full h-full overflow-hidden',
        isGraded ? 'prism-studio-surface' : 'prism-studio-grid'
      )}
    >
      <svg
        viewBox="0 0 640 360"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="w-full h-full block pointer-events-none"
      >
        <defs>
          <linearGradient id={skyGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              stopColor={isGraded ? 'var(--prism-info-dark)' : 'var(--prism-bg-start)'}
              stopOpacity={isGraded ? 0.88 : 0.72}
            />
            <stop
              offset="52%"
              stopColor={isGraded ? 'var(--prism-secondary-dark)' : 'var(--prism-bg-mid)'}
              stopOpacity={isGraded ? 0.62 : 0.78}
            />
            <stop
              offset="100%"
              stopColor={isGraded ? 'var(--prism-primary-dark)' : 'var(--prism-bg-end)'}
              stopOpacity={isGraded ? 0.76 : 0.84}
            />
          </linearGradient>

          <radialGradient id={sunGlowId} cx="68%" cy="34%" r="44%">
            <stop
              offset="0%"
              stopColor={isGraded ? 'var(--prism-primary-light)' : 'var(--prism-text-secondary)'}
              stopOpacity={isGraded ? 0.9 : 0.22}
            />
            <stop
              offset="48%"
              stopColor={isGraded ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)'}
              stopOpacity={isGraded ? 0.45 : 0.1}
            />
            <stop
              offset="100%"
              stopColor={isGraded ? 'var(--prism-primary-main)' : 'var(--prism-bg-end)'}
              stopOpacity={0}
            />
          </radialGradient>

          <radialGradient id={causticGlowId} cx="26%" cy="68%" r="46%">
            <stop
              offset="0%"
              stopColor={isGraded ? 'var(--prism-secondary-main)' : 'var(--prism-text-secondary)'}
              stopOpacity={isGraded ? 0.65 : 0.16}
            />
            <stop
              offset="60%"
              stopColor={isGraded ? 'var(--prism-success-main)' : 'var(--prism-bg-mid)'}
              stopOpacity={isGraded ? 0.28 : 0.08}
            />
            <stop
              offset="100%"
              stopColor={isGraded ? 'var(--prism-info-main)' : 'var(--prism-bg-end)'}
              stopOpacity={0}
            />
          </radialGradient>

          <linearGradient id={horizonGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={isGraded ? 'var(--prism-info-main)' : 'var(--prism-text-secondary)'}
              stopOpacity={isGraded ? 0.7 : 0.24}
            />
            <stop
              offset="100%"
              stopColor={isGraded ? 'var(--prism-primary-dark)' : 'var(--prism-text-secondary)'}
              stopOpacity={isGraded ? 0.86 : 0.34}
            />
          </linearGradient>
        </defs>

        {/* Base sky & optical grading washes */}
        <rect x="0" y="0" width="640" height="360" fill={`url(#${skyGradId})`} />
        <rect x="0" y="0" width="640" height="360" fill={`url(#${sunGlowId})`} />
        <rect x="0" y="0" width="640" height="360" fill={`url(#${causticGlowId})`} />

        {/* Matching cinema subject geometry across both frames */}
        <circle
          cx="436"
          cy="122"
          r="52"
          fill={isGraded ? 'var(--prism-primary-light)' : 'var(--prism-text-secondary)'}
          fillOpacity={isGraded ? 0.88 : 0.24}
        />
        <circle
          cx="436"
          cy="122"
          r="76"
          fill="none"
          stroke={isGraded ? 'var(--prism-secondary-light)' : 'var(--prism-text-secondary)'}
          strokeOpacity={isGraded ? 0.55 : 0.2}
          strokeWidth="1.5"
        />

        {/* Layered mountain silhouettes */}
        <path
          d="M0 252 L118 168 L224 222 L348 134 L474 216 L562 174 L640 218 L640 360 L0 360 Z"
          fill={`url(#${horizonGradId})`}
        />
        <path
          d="M0 288 L156 226 L286 270 L422 204 L548 258 L640 232 L640 360 L0 360 Z"
          fill={isGraded ? 'var(--prism-info-dark)' : 'var(--prism-text-secondary)'}
          fillOpacity={isGraded ? 0.72 : 0.26}
        />

        {/* Optical prism diamond refraction highlight */}
        <polygon
          points="320,86 382,180 320,274 258,180"
          fill={isGraded ? 'var(--prism-secondary-main)' : 'var(--prism-text-secondary)'}
          fillOpacity={isGraded ? 0.26 : 0.1}
          stroke={isGraded ? 'var(--prism-primary-contrast)' : 'var(--prism-text-secondary)'}
          strokeOpacity={isGraded ? 0.65 : 0.3}
          strokeWidth="1.5"
        />

        {/* Subtle safe-area rule-of-thirds reticles */}
        <g
          stroke={isGraded ? 'var(--prism-primary-contrast)' : 'var(--prism-text-secondary)'}
          strokeOpacity={isGraded ? 0.18 : 0.22}
          strokeWidth="1"
          strokeDasharray="4 4"
        >
          <line x1="213" y1="24" x2="213" y2="336" />
          <line x1="427" y1="24" x2="427" y2="336" />
          <line x1="24" y1="120" x2="616" y2="120" />
          <line x1="24" y1="240" x2="616" y2="240" />
        </g>

        {/* Calibration color chip strip */}
        <g transform="translate(18, 316)">
          {swatches.map((swatch) => (
            <rect
              key={swatch.id}
              x={swatch.x - 18}
              y="0"
              width="16"
              height="10"
              rx="3"
              fill={swatch.colorVar}
              fillOpacity={swatch.opacity}
            />
          ))}
        </g>
      </svg>

      {/* Subtle frame technical tag */}
      <span
        aria-hidden="true"
        className="prism-crystal pointer-events-none select-none absolute bottom-3 left-3 px-2 py-0.5 rounded-full font-mono text-[10px] font-medium tracking-tight opacity-85"
        style={{ color: 'var(--prism-text-secondary)' }}
      >
        {isGraded ? 'PRISM LUT · REC.709' : 'LOG-C3 · FLAT GAMMA'}
      </span>
    </div>
  );
}

export function WipeCompareOverlay({
  positionPct,
  defaultPositionPct = DEFAULT_POSITION,
  onPositionChange,
  orientation,
  defaultOrientation = 'vertical',
  onOrientationChange,
  beforeLabel = 'Original (Log-C)',
  afterLabel = 'Graded (Prism LUT)',
  beforeContent,
  afterContent,
  onHoldCompareChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: WipeCompareOverlayProps) {
  const headingId = useId();
  const gradientPrefix = useId();
  const override = useComponentOverride('WipeCompareOverlay');

  const stageRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const cleanupHoldRef = useRef<(() => void) | null>(null);
  const isHoldingRef = useRef<boolean>(false);

  const initialPosition = roundPercent(defaultPositionPct);
  const [rawPos, setRawPos] = useControllableState<number>({
    value: positionPct,
    defaultValue: initialPosition,
    onChange: onPositionChange,
  });

  const [rawOrientation, setRawOrientation] = useControllableState<WipeOrientation>({
    value: orientation,
    defaultValue: defaultOrientation,
    onChange: onOrientationChange,
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [holdingOriginal, setHoldingOriginal] = useState<boolean>(false);

  const safePos = roundPercent(rawPos);
  const roundedPos = Math.round(safePos);
  const safeOrientation: WipeOrientation =
    rawOrientation === 'horizontal' ? 'horizontal' : 'vertical';

  const updatePosition = useCallback(
    (next: number) => {
      setRawPos(roundPercent(next));
    },
    [setRawPos]
  );

  const latestRef = useRef({
    orientation: safeOrientation,
    updatePosition,
    onHoldCompareChange,
  });
  latestRef.current = {
    orientation: safeOrientation,
    updatePosition,
    onHoldCompareChange,
  };

  const stopHoldCompare = useCallback(() => {
    cleanupHoldRef.current?.();
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;
    setHoldingOriginal(false);
    latestRef.current.onHoldCompareChange?.(false);
  }, []);

  const startHoldCompare = useCallback(() => {
    if (disabled || isHoldingRef.current) return;
    cleanupDragRef.current?.();
    setIsDragging(false);
    isHoldingRef.current = true;
    setHoldingOriginal(true);
    latestRef.current.onHoldCompareChange?.(true);
  }, [disabled]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
      cleanupHoldRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      cleanupDragRef.current?.();
      setIsDragging(false);
      stopHoldCompare();
    }
  }, [disabled, stopHoldCompare]);

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (latestRef.current.orientation === 'vertical') {
      if (!Number.isFinite(rect.width) || rect.width <= 0) return;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      latestRef.current.updatePosition(pct);
    } else {
      if (!Number.isFinite(rect.height) || rect.height <= 0) return;
      const pct = ((clientY - rect.top) / rect.height) * 100;
      latestRef.current.updatePosition(pct);
    }
  }, []);

  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || isHoldingRef.current || event.button > 0) return;
      event.preventDefault();
      cleanupDragRef.current?.();

      setIsDragging(true);
      updateFromPointer(event.clientX, event.clientY);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        updateFromPointer(moveEvent.clientX, moveEvent.clientY);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsDragging(false);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [disabled, updateFromPointer]
  );

  const handleSliderKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;
      const step = event.shiftKey ? KEYBOARD_SHIFT_STEP : KEYBOARD_STEP;

      if (safeOrientation === 'vertical') {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          updatePosition(safePos - step);
          return;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          updatePosition(safePos + step);
          return;
        }
      } else {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          updatePosition(safePos - step);
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          updatePosition(safePos + step);
          return;
        }
      }

      if (event.key === 'Home') {
        event.preventDefault();
        updatePosition(MIN_POSITION);
      } else if (event.key === 'End') {
        event.preventDefault();
        updatePosition(MAX_POSITION);
      }
    },
    [disabled, safeOrientation, safePos, updatePosition]
  );

  const handleSelectOrientation = useCallback(
    (next: WipeOrientation) => {
      if (next === safeOrientation) return;
      setRawOrientation(next);
    },
    [safeOrientation, setRawOrientation]
  );

  const handleCenterSplit = useCallback(() => {
    updatePosition(DEFAULT_POSITION);
  }, [updatePosition]);

  const handleHoldPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (disabled || event.button > 0) return;
      cleanupHoldRef.current?.();
      startHoldCompare();

      const handleWindowRelease = () => {
        stopHoldCompare();
      };

      const cleanup = () => {
        window.removeEventListener('pointerup', handleWindowRelease);
        window.removeEventListener('pointercancel', handleWindowRelease);
        cleanupHoldRef.current = null;
      };

      cleanupHoldRef.current = cleanup;
      window.addEventListener('pointerup', handleWindowRelease);
      window.addEventListener('pointercancel', handleWindowRelease);
    },
    [disabled, startHoldCompare, stopHoldCompare]
  );

  const handleHoldKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;
      if (!isHoldTriggerKey(event.key)) return;
      event.preventDefault();
      if (event.repeat) return;
      startHoldCompare();
    },
    [disabled, startHoldCompare]
  );

  const handleHoldKeyUp = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (!isHoldTriggerKey(event.key)) return;
      event.preventDefault();
      stopHoldCompare();
    },
    [stopHoldCompare]
  );

  const beforeClipPath = holdingOriginal
    ? 'inset(0 0 0 0)'
    : safeOrientation === 'vertical'
      ? `inset(0 ${100 - safePos}% 0 0)`
      : `inset(0 0 ${100 - safePos}% 0)`;

  const orientationTitle = safeOrientation === 'vertical' ? 'Vertical' : 'Horizontal';
  const statusText = holdingOriginal
    ? 'Holding Original Bypass'
    : `Split: ${roundedPos}% · ${orientationTitle}`;

  const merged = mergeProps({
    themeTarget: themeProps('wipe-compare-overlay', {
      orientation: safeOrientation,
      holdingOriginal,
      dragging: isDragging,
      disabled,
    }),
    baseClassName:
      'prism-slab p-4 sm:p-5 w-full max-w-full flex flex-col gap-3.5 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('wipe-compare-overlay', 'header');
  const stageClass = stableClassName('wipe-compare-overlay', 'stage');
  const dividerClass = stableClassName('wipe-compare-overlay', 'divider');
  const handleClass = stableClassName('wipe-compare-overlay', 'handle');
  const statusClass = stableClassName('wipe-compare-overlay', 'status');

  const hasCustomBefore = beforeContent !== undefined && beforeContent !== null;
  const hasCustomAfter = afterContent !== undefined && afterContent !== null;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      {/* Sculpted Optical Control Header */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          </span>
          <span
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate max-w-full"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            Wipe Compare Overlay
          </span>
          {holdingOriginal ? (
            <span
              data-testid="wipe-bypass-indicator"
              className="prism-btn-primary pointer-events-none px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-wider uppercase whitespace-nowrap shrink-0"
            >
              <span className="relative z-10">BYPASSED · ORIGINAL</span>
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          {/* Vertical / Horizontal Orientation Toggle */}
          <div
            role="group"
            aria-label="Wipe orientation"
            className="prism-well p-1 rounded-full inline-flex flex-wrap items-center gap-1 max-w-full"
          >
            <button
              type="button"
              disabled={disabled}
              aria-pressed={safeOrientation === 'vertical'}
              data-testid="wipe-orientation-vertical"
              onClick={() => handleSelectOrientation('vertical')}
              className={cx(
                'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all',
                safeOrientation === 'vertical' ? 'prism-btn-primary' : 'prism-btn-secondary'
              )}
            >
              <Columns2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
              <span className="relative z-10">Vertical</span>
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={safeOrientation === 'horizontal'}
              data-testid="wipe-orientation-horizontal"
              onClick={() => handleSelectOrientation('horizontal')}
              className={cx(
                'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all',
                safeOrientation === 'horizontal' ? 'prism-btn-primary' : 'prism-btn-secondary'
              )}
            >
              <Rows2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
              <span className="relative z-10">Horizontal</span>
            </button>
          </div>

          {/* 50 / 50 Quick Center Button */}
          <button
            type="button"
            disabled={disabled}
            data-testid="wipe-center-button"
            onClick={handleCenterSplit}
            className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Crosshair aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>50 / 50</span>
          </button>

          {/* Signature Hold to Compare Original Safety Button */}
          <button
            type="button"
            disabled={disabled}
            aria-pressed={holdingOriginal}
            data-testid="wipe-hold-compare"
            onPointerDown={handleHoldPointerDown}
            onPointerCancel={stopHoldCompare}
            onKeyDown={handleHoldKeyDown}
            onKeyUp={handleHoldKeyUp}
            onBlur={stopHoldCompare}
            className={cx(
              'prism-focus-ring h-8 px-3.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 touch-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all',
              holdingOriginal ? 'prism-btn-primary' : 'prism-btn-secondary'
            )}
          >
            {holdingOriginal ? (
              <EyeOff aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
            ) : (
              <Eye aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
            )}
            <span className="relative z-10">Hold to Compare Original</span>
          </button>
        </div>
      </div>

      {/* Interactive Optical Comparison Stage */}
      <div
        ref={stageRef}
        data-testid="wipe-stage"
        data-dragging={isDragging ? 'true' : undefined}
        data-holding-original={holdingOriginal ? 'true' : undefined}
        onPointerDown={handleStagePointerDown}
        className={cx(
          stageClass,
          'prism-well rounded-2xl relative overflow-hidden aspect-video select-none w-full touch-none',
          disabled
            ? 'cursor-not-allowed opacity-60'
            : isDragging
              ? 'cursor-grabbing'
              : safeOrientation === 'vertical'
                ? 'cursor-ew-resize'
                : 'cursor-ns-resize'
        )}
      >
        {/* Bottom Full-Bleed Graded (After) Layer */}
        <div data-testid="wipe-after-layer" className="absolute inset-0 w-full h-full">
          {hasCustomAfter ? (
            <div className="w-full h-full">{afterContent}</div>
          ) : (
            <DefaultOpticalFrame variant="graded" gradientPrefix={gradientPrefix} />
          )}
        </div>

        {/* Top Clipped Original (Before) Layer */}
        <div
          data-testid="wipe-before-layer"
          style={{ clipPath: beforeClipPath }}
          className="absolute inset-0 w-full h-full"
        >
          {hasCustomBefore ? (
            <div className="w-full h-full">{beforeContent}</div>
          ) : (
            <DefaultOpticalFrame variant="original" gradientPrefix={gradientPrefix} />
          )}
        </div>

        {/* Floating Corner Badges */}
        <span
          data-testid="wipe-before-badge"
          className="prism-crystal pointer-events-none select-none absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-xs font-semibold tracking-tight max-w-[45%] truncate"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {beforeLabel}
        </span>

        <span
          data-testid="wipe-after-badge"
          className={cx(
            'prism-crystal pointer-events-none select-none absolute right-3 z-10 px-2.5 py-1 rounded-full text-xs font-semibold tracking-tight max-w-[45%] truncate transition-opacity',
            safeOrientation === 'vertical' ? 'top-3' : 'bottom-3',
            holdingOriginal ? 'opacity-35' : 'opacity-100'
          )}
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {afterLabel}
        </span>

        {/* Wipe Hairline Divider & Draggable/Keyboard Crystal Grip Puck */}
        <div
          data-testid="wipe-divider"
          style={safeOrientation === 'vertical' ? { left: `${safePos}%` } : { top: `${safePos}%` }}
          className={cx(
            dividerClass,
            'absolute z-20 flex items-center justify-center transition-opacity',
            safeOrientation === 'vertical'
              ? 'top-0 bottom-0 -translate-x-1/2'
              : 'left-0 right-0 -translate-y-1/2',
            holdingOriginal ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        >
          <span
            aria-hidden="true"
            className={cx(
              'pointer-events-none shadow-sm',
              safeOrientation === 'vertical' ? 'w-0.5 h-full' : 'h-0.5 w-full'
            )}
            style={{ backgroundColor: 'var(--prism-primary-main)' }}
          />
          <div
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label="Compare split wipe position"
            aria-orientation={safeOrientation === 'vertical' ? 'horizontal' : 'vertical'}
            aria-valuemin={MIN_POSITION}
            aria-valuemax={MAX_POSITION}
            aria-valuenow={roundedPos}
            aria-valuetext={
              holdingOriginal ? 'Holding Original Bypass' : `${roundedPos}% ${beforeLabel}`
            }
            aria-disabled={disabled ? 'true' : undefined}
            data-testid="wipe-handle"
            onKeyDown={handleSliderKeyDown}
            className={cx(
              handleClass,
              'prism-crystal prism-focus-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 inline-flex items-center justify-center shadow-lg transition-transform',
              disabled
                ? 'cursor-not-allowed'
                : isDragging
                  ? 'scale-105 cursor-grabbing'
                  : safeOrientation === 'vertical'
                    ? 'cursor-ew-resize'
                    : 'cursor-ns-resize'
            )}
            style={{
              borderColor: 'var(--prism-primary-main)',
              color: 'var(--prism-text-primary)',
            }}
          >
            {safeOrientation === 'vertical' ? (
              <ChevronsLeftRight className="w-4 h-4 pointer-events-none" aria-hidden="true" />
            ) : (
              <ChevronsUpDown className="w-4 h-4 pointer-events-none" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>

      {/* Recessed Live Telemetry Status Bar */}
      <div
        className={cx(
          statusClass,
          'prism-well rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
        )}
      >
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="wipe-status-bar"
          className="font-mono text-xs font-semibold tabular-nums"
          style={{
            color: holdingOriginal ? 'var(--prism-primary-main)' : 'var(--prism-text-primary)',
          }}
        >
          {statusText}
        </span>

        <span
          className="font-mono text-[11px] tabular-nums truncate max-w-full"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          {safeOrientation === 'vertical'
            ? 'ArrowLeft / ArrowRight ±2% · Shift ±10%'
            : 'ArrowUp / ArrowDown ±2% · Shift ±10%'}
        </span>
      </div>
    </div>
  );
}

WipeCompareOverlay.displayName = 'WipeCompareOverlay';
