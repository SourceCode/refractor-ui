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
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Check, Compass, Crop, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_DIVIDER, STYLE_BORDER_PRIMARY, STYLE_PRIMARY_MAIN, STYLE_SECONDARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type CropAspectPreset = 'free' | '16:9' | '4:5' | '1:1' | '2.39:1';

export interface CropRectPct {
  /** Horizontal offset from the left edge as a percentage (0..100). */
  x: number;
  /** Vertical offset from the top edge as a percentage (0..100). */
  y: number;
  /** Width of the crop box as a percentage (15..100). */
  width: number;
  /** Height of the crop box as a percentage (15..100). */
  height: number;
}

export interface CropTransformState {
  crop: CropRectPct;
  rotationDeg: number;
  aspect: CropAspectPreset;
}

type CropStraightenOverlayBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface CropStraightenOverlayProps extends CropStraightenOverlayBaseProps {
  /** Controlled crop, rotation, and aspect ratio transform state. */
  value?: CropTransformState;
  /** Initial crop frame percentage coordinates (defaults to { x: 10, y: 10, width: 80, height: 80 }). */
  defaultCrop?: CropRectPct;
  /** Initial straighten angle in degrees clamped to [-45..45] (defaults to 0). */
  defaultRotationDeg?: number;
  /** Initial aspect ratio preset (defaults to 'free'). */
  defaultAspect?: CropAspectPreset;
  /** Callback fired whenever crop geometry, rotation angle, or aspect preset changes. */
  onChange?: (state: CropTransformState) => void;
  /** Optional callback invoked when the user confirms via the Apply Crop primary button. */
  onApply?: (state: CropTransformState) => void;
  /** Asset label shown in the optical header (defaults to 'RAW_Studio_Frame_01.dng'). */
  mediaLabel?: string;
  /** Optional underlying preview media; renders an optical gradient placeholder stage if omitted. */
  children?: ReactNode;
  /** Disables all crop dragging, corner resizing, aspect pills, straighten dial, and actions. */
  disabled?: boolean;
}

type CropCorner = 'nw' | 'ne' | 'sw' | 'se';
type InteractionMode = 'move' | CropCorner;

interface AspectPresetOption {
  id: CropAspectPreset;
  label: string;
}

interface CornerHandleSpec {
  id: CropCorner;
  label: string;
  positionClass: string;
  cursorClass: string;
}

const STAGE_ASPECT = 16 / 9;
const MIN_SIZE_PCT = 15;
const MIN_ROTATION_DEG = -45;
const MAX_ROTATION_DEG = 45;
const ROTATION_STEP_DEG = 0.5;
const QUICK_ROTATE_STEP_DEG = 5;
const KEY_STEP_PCT = 2;
const KEY_LARGE_STEP_PCT = 10;

const DEFAULT_CROP: CropRectPct = { x: 10, y: 10, width: 80, height: 80 };

const ASPECT_PRESETS: ReadonlyArray<AspectPresetOption> = [
  { id: 'free', label: 'Free' },
  { id: '16:9', label: '16:9' },
  { id: '4:5', label: '4:5' },
  { id: '1:1', label: '1:1' },
  { id: '2.39:1', label: '2.39:1' },
];

const CORNER_HANDLES: ReadonlyArray<CornerHandleSpec> = [
  {
    id: 'nw',
    label: 'Resize crop top-left',
    positionClass: '-top-2 -left-2',
    cursorClass: 'cursor-nwse-resize',
  },
  {
    id: 'ne',
    label: 'Resize crop top-right',
    positionClass: '-top-2 -right-2',
    cursorClass: 'cursor-nesw-resize',
  },
  {
    id: 'sw',
    label: 'Resize crop bottom-left',
    positionClass: '-bottom-2 -left-2',
    cursorClass: 'cursor-nesw-resize',
  },
  {
    id: 'se',
    label: 'Resize crop bottom-right',
    positionClass: '-bottom-2 -right-2',
    cursorClass: 'cursor-nwse-resize',
  },
];

const DIAL_TICKS: ReadonlyArray<number> = [
  -45, -40, -35, -30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45,
];

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function normalizeAspectPreset(preset: CropAspectPreset | undefined): CropAspectPreset {
  if (
    preset === 'free' ||
    preset === '16:9' ||
    preset === '4:5' ||
    preset === '1:1' ||
    preset === '2.39:1'
  ) {
    return preset;
  }
  return 'free';
}

function getAspectLabel(preset: CropAspectPreset): string {
  return preset === 'free' ? 'Free' : preset;
}

/**
 * Returns the target widthPct / heightPct ratio inside the 16:9 (`aspect-video`) stage
 * so that visual proportions on-screen match the selected photography/cinema aspect ratio.
 */
function getAspectPctRatio(preset: CropAspectPreset): number | null {
  switch (preset) {
    case '16:9':
      return 1;
    case '4:5':
      return 4 / 5 / STAGE_ASPECT;
    case '1:1':
      return 1 / STAGE_ASPECT;
    case '2.39:1':
      return 2.39 / STAGE_ASPECT;
    default:
      return null;
  }
}

function sanitizeRotation(raw: number, fallback = 0): number {
  const clamped = clampNumber(raw, MIN_ROTATION_DEG, MAX_ROTATION_DEG, fallback);
  const rounded = Math.round(clamped * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

function sanitizeFreeCrop(raw: CropRectPct | undefined): CropRectPct {
  const source = raw ?? DEFAULT_CROP;
  const width = roundTwo(clampNumber(source.width, MIN_SIZE_PCT, 100, DEFAULT_CROP.width));
  const height = roundTwo(clampNumber(source.height, MIN_SIZE_PCT, 100, DEFAULT_CROP.height));
  const maxX = roundTwo(100 - width);
  const maxY = roundTwo(100 - height);
  const x = roundTwo(clampNumber(source.x, 0, maxX, Math.min(DEFAULT_CROP.x, maxX)));
  const y = roundTwo(clampNumber(source.y, 0, maxY, Math.min(DEFAULT_CROP.y, maxY)));
  return { x, y, width, height };
}

function sanitizeCropRect(raw: CropRectPct | undefined, aspect: CropAspectPreset): CropRectPct {
  const freeRect = sanitizeFreeCrop(raw);
  const pctRatio = getAspectPctRatio(aspect);
  if (pctRatio === null) {
    return freeRect;
  }

  const minW = Math.ceil(Math.max(MIN_SIZE_PCT, MIN_SIZE_PCT * pctRatio) * 100) / 100;
  const maxW = Math.floor(Math.min(100, 100 * pctRatio) * 100) / 100;
  const centerX = freeRect.x + freeRect.width / 2;
  const centerY = freeRect.y + freeRect.height / 2;
  const targetW = Math.sqrt(freeRect.width * freeRect.height * pctRatio);

  const width = roundTwo(clampNumber(targetW, minW, maxW, minW));
  const height = roundTwo(clampNumber(width / pctRatio, MIN_SIZE_PCT, 100, MIN_SIZE_PCT));
  const maxX = roundTwo(100 - width);
  const maxY = roundTwo(100 - height);
  const x = roundTwo(clampNumber(centerX - width / 2, 0, maxX, 0));
  const y = roundTwo(clampNumber(centerY - height / 2, 0, maxY, 0));

  return { x, y, width, height };
}

function sanitizeTransformState(state: CropTransformState): CropTransformState {
  const aspect = normalizeAspectPreset(state.aspect);
  return {
    crop: sanitizeCropRect(state.crop, aspect),
    rotationDeg: sanitizeRotation(state.rotationDeg, 0),
    aspect,
  };
}

function moveCropRect(rect: CropRectPct, dx: number, dy: number): CropRectPct {
  const maxX = roundTwo(100 - rect.width);
  const maxY = roundTwo(100 - rect.height);
  return {
    x: roundTwo(clampNumber(rect.x + dx, 0, maxX, rect.x)),
    y: roundTwo(clampNumber(rect.y + dy, 0, maxY, rect.y)),
    width: rect.width,
    height: rect.height,
  };
}

function resizeCropCorner(
  rect: CropRectPct,
  corner: CropCorner,
  dx: number,
  dy: number,
  aspect: CropAspectPreset
): CropRectPct {
  const left = rect.x;
  const top = rect.y;
  const right = roundTwo(rect.x + rect.width);
  const bottom = roundTwo(rect.y + rect.height);

  const movesLeft = corner === 'nw' || corner === 'sw';
  const movesTop = corner === 'nw' || corner === 'ne';

  const rawW = movesLeft ? rect.width - dx : rect.width + dx;
  const rawH = movesTop ? rect.height - dy : rect.height + dy;
  const maxW = movesLeft ? right : roundTwo(100 - left);
  const maxH = movesTop ? bottom : roundTwo(100 - top);

  const pctRatio = getAspectPctRatio(aspect);
  let width: number;
  let height: number;

  if (pctRatio === null) {
    width = roundTwo(clampNumber(rawW, MIN_SIZE_PCT, maxW, rect.width));
    height = roundTwo(clampNumber(rawH, MIN_SIZE_PCT, maxH, rect.height));
  } else {
    const minW = Math.ceil(Math.max(MIN_SIZE_PCT, MIN_SIZE_PCT * pctRatio) * 100) / 100;
    const limitW = Math.floor(Math.min(maxW, maxH * pctRatio) * 100) / 100;
    const preferHeight = Math.abs(dy * pctRatio) > Math.abs(dx);
    const desiredW = preferHeight ? rawH * pctRatio : rawW;
    width = roundTwo(clampNumber(desiredW, minW, Math.max(minW, limitW), rect.width));
    height = roundTwo(clampNumber(width / pctRatio, MIN_SIZE_PCT, maxH, rect.height));
  }

  const nextX = movesLeft ? right - width : left;
  const nextY = movesTop ? bottom - height : top;

  return {
    x: roundTwo(clampNumber(nextX, 0, roundTwo(100 - width), rect.x)),
    y: roundTwo(clampNumber(nextY, 0, roundTwo(100 - height), rect.y)),
    width,
    height,
  };
}

function computeRotationScale(rotationDeg: number): number {
  if (rotationDeg === 0) return 1;
  const rad = (Math.abs(rotationDeg) * Math.PI) / 180;
  return Math.round((Math.cos(rad) + Math.sin(rad) * STAGE_ASPECT) * 1000) / 1000;
}

function formatRotation(deg: number): string {
  const fixed = Math.abs(deg).toFixed(1);
  if (deg > 0) return `+${fixed}°`;
  if (deg < 0) return `-${fixed}°`;
  return '0.0°';
}

function CropStraightenOverlayInner({
  value,
  defaultCrop,
  defaultRotationDeg = 0,
  defaultAspect = 'free',
  onChange,
  onApply,
  mediaLabel = 'RAW_Studio_Frame_01.dng',
  children,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CropStraightenOverlayProps) {
  const override = useComponentOverride('CropStraightenOverlay');
  const straightenId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const initialState = useMemo<CropTransformState>(() => {
    const aspect = normalizeAspectPreset(defaultAspect);
    return {
      crop: sanitizeCropRect(defaultCrop, aspect),
      rotationDeg: sanitizeRotation(defaultRotationDeg, 0),
      aspect,
    };
  }, [defaultAspect, defaultCrop, defaultRotationDeg]);

  const [uncontrolledState, setUncontrolledState] = useState<CropTransformState>(initialState);
  const [activeInteraction, setActiveInteraction] = useState<InteractionMode | null>(null);

  const isControlled = value !== undefined;
  const activeState = useMemo<CropTransformState>(
    () => (isControlled ? sanitizeTransformState(value) : uncontrolledState),
    [isControlled, uncontrolledState, value]
  );

  const liveRef = useRef({
    isControlled,
    activeState,
    onChange,
  });
  liveRef.current = { isControlled, activeState, onChange };

  const commitState = useCallback((next: CropTransformState) => {
    const sanitized = sanitizeTransformState(next);
    if (!liveRef.current.isControlled) {
      setUncontrolledState(sanitized);
    }
    liveRef.current.onChange?.(sanitized);
  }, []);

  useEffect(() => {
    if (disabled && cleanupDragRef.current) {
      cleanupDragRef.current();
      setActiveInteraction(null);
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const startPointerDrag = useCallback(
    (mode: InteractionMode, event: ReactPointerEvent<HTMLElement>) => {
      if (disabled || event.button > 0) return;
      event.preventDefault();
      if (mode !== 'move') {
        event.stopPropagation();
      }
      cleanupDragRef.current?.();

      const startX = event.clientX;
      const startY = event.clientY;
      const startState = liveRef.current.activeState;
      setActiveInteraction(mode);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) {
          return;
        }

        const dxPct = ((moveEvent.clientX - startX) / rect.width) * 100;
        const dyPct = ((moveEvent.clientY - startY) / rect.height) * 100;

        const nextCrop =
          mode === 'move'
            ? moveCropRect(startState.crop, dxPct, dyPct)
            : resizeCropCorner(startState.crop, mode, dxPct, dyPct, startState.aspect);

        commitState({
          crop: nextCrop,
          rotationDeg: startState.rotationDeg,
          aspect: startState.aspect,
        });
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setActiveInteraction(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [commitState, disabled]
  );

  const handleMoveKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || disabled) return;
      const step = event.shiftKey ? KEY_LARGE_STEP_PCT : KEY_STEP_PCT;
      let dx = 0;
      let dy = 0;

      if (event.key === 'ArrowLeft') dx = -step;
      else if (event.key === 'ArrowRight') dx = step;
      else if (event.key === 'ArrowUp') dy = -step;
      else if (event.key === 'ArrowDown') dy = step;
      else return;

      event.preventDefault();
      commitState({
        ...activeState,
        crop: moveCropRect(activeState.crop, dx, dy),
      });
    },
    [activeState, commitState, disabled]
  );

  const handleCornerKeyDown = useCallback(
    (corner: CropCorner, event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || disabled) return;
      const step = event.shiftKey ? KEY_LARGE_STEP_PCT : KEY_STEP_PCT;
      let dx = 0;
      let dy = 0;

      if (event.key === 'ArrowLeft') dx = -step;
      else if (event.key === 'ArrowRight') dx = step;
      else if (event.key === 'ArrowUp') dy = -step;
      else if (event.key === 'ArrowDown') dy = step;
      else return;

      event.preventDefault();
      event.stopPropagation();
      commitState({
        ...activeState,
        crop: resizeCropCorner(activeState.crop, corner, dx, dy, activeState.aspect),
      });
    },
    [activeState, commitState, disabled]
  );

  const handleAspectSelect = useCallback(
    (nextAspect: CropAspectPreset) => {
      commitState({
        crop: sanitizeCropRect(activeState.crop, nextAspect),
        rotationDeg: activeState.rotationDeg,
        aspect: nextAspect,
      });
    },
    [activeState, commitState]
  );

  const handleRotationUpdate = useCallback(
    (nextDeg: number) => {
      if (disabled) return;
      commitState({
        ...activeState,
        rotationDeg: sanitizeRotation(nextDeg, activeState.rotationDeg),
      });
    },
    [activeState, commitState, disabled]
  );

  const handleStraightenInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleRotationUpdate(Number(event.target.value));
    },
    [handleRotationUpdate]
  );

  const handleStraightenKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing || disabled) return;
      if (event.key === '0') {
        event.preventDefault();
        handleRotationUpdate(0);
      }
    },
    [disabled, handleRotationUpdate]
  );

  const handleReset = useCallback(() => {
    commitState(initialState);
  }, [commitState, initialState]);

  const { crop, rotationDeg, aspect } = activeState;
  const rotationScale = computeRotationScale(rotationDeg);
  const dialIndicatorPct = ((rotationDeg - MIN_ROTATION_DEG) / (MAX_ROTATION_DEG - MIN_ROTATION_DEG)) * 100;
  const formattedAngle = formatRotation(rotationDeg);
  const aspectLabel = getAspectLabel(aspect);

  const merged = mergeProps({
    themeTarget: themeProps('crop-straighten-overlay', {
      aspect,
      disabled,
      dragging: activeInteraction !== null,
      straightened: rotationDeg !== 0,
    }),
    baseClassName: 'prism-slab p-4 space-y-3.5 select-none max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const stageClass = stableClassName('crop-straighten-overlay', 'stage');
  const frameClass = stableClassName('crop-straighten-overlay', 'frame');
  const handleClass = stableClassName('crop-straighten-overlay', 'handle');
  const dialClass = stableClassName('crop-straighten-overlay', 'dial');
  const telemetryClass = stableClassName('crop-straighten-overlay', 'telemetry');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={`Crop and straighten overlay for ${mediaLabel}`}
      {...rest}
      {...merged}
    >
      {/* Sculpted Prism-Slab Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="prism-crystal w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Crop className="w-4 h-4" aria-hidden="true" />
          </span>
          <span
            className="text-xs font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {mediaLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div
            role="group"
            aria-label="Aspect ratio presets"
            className="inline-flex flex-wrap items-center gap-1"
          >
            {ASPECT_PRESETS.map((preset) => {
              const isSelected = aspect === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  onClick={() => handleAspectSelect(preset.id)}
                  style={
                    isSelected
                      ? {
                          backgroundColor: 'var(--prism-primary-main)',
                          color: 'var(--prism-primary-contrast)',
                        }
                      : { color: 'var(--prism-text-primary)' }
                  }
                  className={cx(
                    'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                    isSelected ? 'shadow-sm' : 'prism-well'
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="inline-flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={handleReset}
              className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>

            {onApply ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onApply(activeState)}
                className="prism-btn-primary prism-focus-ring h-8 px-3.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
                <span className="relative z-10">Apply Crop</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Interactive Optical Viewport Stage */}
      <div
        ref={stageRef}
        data-testid="crop-viewport"
        className={cx(
          stageClass,
          'prism-well rounded-2xl relative overflow-hidden aspect-video w-full max-w-full'
        )}
      >
        {/* Rotated Inner Media Backdrop */}
        <div
          data-testid="crop-media-backdrop"
          style={{
            transform: `rotate(${rotationDeg}deg) scale(${rotationScale})`,
          }}
          className="absolute inset-0 w-full h-full pointer-events-none will-change-transform"
        >
          {children !== undefined && children !== null ? (
            <div className="w-full h-full">{children}</div>
          ) : (
            <div
              data-testid="crop-placeholder-stage"
              style={{
                backgroundImage:
                  'radial-gradient(62% 58% at 24% 28%, color-mix(in srgb, var(--prism-primary-main) 28%, transparent) 0%, transparent 72%), radial-gradient(58% 60% at 78% 72%, color-mix(in srgb, var(--prism-secondary-main) 30%, transparent) 0%, transparent 74%), linear-gradient(155deg, var(--prism-bg-start) 0%, var(--prism-bg-mid) 52%, var(--prism-bg-end) 100%)',
              }}
              className="w-full h-full relative"
            >
              <svg
                viewBox="0 0 320 180"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="w-full h-full opacity-75"
              >
                <line
                  x1="0"
                  y1="108"
                  x2="320"
                  y2="108"
                  stroke="var(--prism-secondary-main)"
                  strokeWidth="0.75"
                  strokeOpacity="0.45"
                />
                <path
                  d="M0 128 L68 78 L128 112 L196 58 L262 104 L320 84 L320 180 L0 180 Z"
                  fill="var(--prism-secondary-main)"
                  fillOpacity="0.14"
                />
                <path
                  d="M0 144 L96 104 L168 130 L248 92 L320 122 L320 180 L0 180 Z"
                  fill="var(--prism-primary-main)"
                  fillOpacity="0.12"
                />
                <circle
                  cx="236"
                  cy="44"
                  r="14"
                  fill="var(--prism-primary-main)"
                  fillOpacity="0.28"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Level Horizon Grid Reference */}
        <div
          aria-hidden="true"
          data-testid="crop-horizon-grid"
          className="absolute inset-0 pointer-events-none"
        >
          <span
            className="absolute left-0 right-0 top-1/2 h-px"
            style={{
              backgroundColor: 'var(--prism-secondary-main)',
              opacity: rotationDeg !== 0 ? 0.65 : 0.25,
            }}
          />
          <span
            className="absolute top-0 bottom-0 left-1/2 w-px"
            style={{
              backgroundColor: 'var(--prism-secondary-main)',
              opacity: rotationDeg !== 0 ? 0.55 : 0.2,
            }}
          />
          <span
            className="absolute left-0 right-0 top-1/4 h-px"
            style={STYLE_BG_DIVIDER}
          />
          <span
            className="absolute left-0 right-0 top-3/4 h-px"
            style={STYLE_BG_DIVIDER}
          />
        </div>

        {/* Dimmed Outside Scrim Mask */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-0 bg-slate-950/50 pointer-events-none"
          style={{ height: `${crop.y}%` }}
        />
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-0 bg-slate-950/50 pointer-events-none"
          style={{ top: `${roundTwo(crop.y + crop.height)}%` }}
        />
        <div
          aria-hidden="true"
          className="absolute left-0 bg-slate-950/50 pointer-events-none"
          style={{
            top: `${crop.y}%`,
            height: `${crop.height}%`,
            width: `${crop.x}%`,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute right-0 bg-slate-950/50 pointer-events-none"
          style={{
            top: `${crop.y}%`,
            height: `${crop.height}%`,
            left: `${roundTwo(crop.x + crop.width)}%`,
          }}
        />

        {/* Draggable Crop Box Body */}
        <div
          role="group"
          aria-label="Move crop frame"
          aria-disabled={disabled ? 'true' : undefined}
          tabIndex={disabled ? -1 : 0}
          data-testid="crop-frame"
          data-dragging={activeInteraction ?? undefined}
          onPointerDown={(e) => startPointerDrag('move', e)}
          onKeyDown={handleMoveKeyDown}
          style={{
            left: `${crop.x}%`,
            top: `${crop.y}%`,
            width: `${crop.width}%`,
            height: `${crop.height}%`,
            borderColor: 'var(--prism-primary-main)',
            touchAction: 'none',
          }}
          className={cx(
            frameClass,
            'prism-focus-ring absolute border shadow-md touch-none',
            disabled
              ? 'cursor-not-allowed opacity-75'
              : activeInteraction === 'move'
                ? 'cursor-grabbing'
                : 'cursor-grab'
          )}
        >
          {/* Rule-of-Thirds Interior Guide Lines */}
          <span
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-1/3 w-px bg-white/55 pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-2/3 w-px bg-white/55 pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute left-0 right-0 top-1/3 h-px bg-white/55 pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute left-0 right-0 top-2/3 h-px bg-white/55 pointer-events-none"
          />

          {/* Crisp --prism-primary-main Corner Brackets */}
          <span
            aria-hidden="true"
            style={STYLE_BORDER_PRIMARY}
            className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-[3px] border-l-[3px] pointer-events-none"
          />
          <span
            aria-hidden="true"
            style={STYLE_BORDER_PRIMARY}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-[3px] border-r-[3px] pointer-events-none"
          />
          <span
            aria-hidden="true"
            style={STYLE_BORDER_PRIMARY}
            className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-[3px] border-l-[3px] pointer-events-none"
          />
          <span
            aria-hidden="true"
            style={STYLE_BORDER_PRIMARY}
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-[3px] border-r-[3px] pointer-events-none"
          />

          {/* 4 Draggable + Keyboard-Nudgeable Corner Resize Handles */}
          {CORNER_HANDLES.map((handle) => (
            <div
              key={handle.id}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={handle.label}
              aria-valuemin={MIN_SIZE_PCT}
              aria-valuemax={100}
              aria-valuenow={Math.round(crop.width)}
              aria-valuetext={`${Math.round(crop.width)}% by ${Math.round(crop.height)}% at ${Math.round(crop.x)}%, ${Math.round(crop.y)}%`}
              aria-disabled={disabled ? 'true' : undefined}
              data-testid={`crop-handle-${handle.id}`}
              onPointerDown={(e) => startPointerDrag(handle.id, e)}
              onKeyDown={(e) => handleCornerKeyDown(handle.id, e)}
              style={{
                borderColor: 'var(--prism-primary-main)',
                touchAction: 'none',
              }}
              className={cx(
                handleClass,
                'prism-thumb prism-focus-ring absolute w-4 h-4 rounded-full border-2 touch-none',
                handle.positionClass,
                disabled ? 'cursor-not-allowed opacity-60' : handle.cursorClass
              )}
            />
          ))}
        </div>
      </div>

      {/* Calibrated Straighten Dial (-45.0° to +45.0°) */}
      <div className={cx(dialClass, 'prism-crystal rounded-2xl p-3 space-y-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Compass
              className="w-4 h-4 shrink-0"
              style={STYLE_SECONDARY_MAIN}
              aria-hidden="true"
            />
            <label
              htmlFor={straightenId}
              className="text-xs font-semibold tracking-tight"
              style={STYLE_TEXT_PRIMARY}
            >
              Straighten
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div
              role="group"
              aria-label="Straighten quick adjustments"
              className="inline-flex flex-wrap items-center gap-1"
            >
              <button
                type="button"
                disabled={disabled}
                aria-label="Straighten minus 5 degrees"
                onClick={() => handleRotationUpdate(rotationDeg - QUICK_ROTATE_STEP_DEG)}
                style={STYLE_TEXT_PRIMARY}
                className="prism-well prism-focus-ring h-7 px-2.5 rounded-full text-xs font-mono tabular-nums font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -5°
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label="Level reset to 0 degrees"
                aria-pressed={rotationDeg === 0}
                onClick={() => handleRotationUpdate(0)}
                style={
                  rotationDeg === 0
                    ? {
                        backgroundColor: 'var(--prism-primary-main)',
                        color: 'var(--prism-primary-contrast)',
                      }
                    : { color: 'var(--prism-text-primary)' }
                }
                className={cx(
                  'prism-focus-ring h-7 px-2.5 rounded-full text-xs font-mono tabular-nums font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  rotationDeg === 0 ? 'shadow-sm' : 'prism-well'
                )}
              >
                0°
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label="Straighten plus 5 degrees"
                onClick={() => handleRotationUpdate(rotationDeg + QUICK_ROTATE_STEP_DEG)}
                style={STYLE_TEXT_PRIMARY}
                className="prism-well prism-focus-ring h-7 px-2.5 rounded-full text-xs font-mono tabular-nums font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +5°
              </button>
            </div>

            <span
              data-testid="straighten-readout"
              style={{
                color:
                  rotationDeg === 0 ? 'var(--prism-text-primary)' : 'var(--prism-primary-main)',
              }}
              className="prism-well px-2.5 py-1 rounded-full text-xs font-mono tabular-nums font-semibold min-w-[4.25rem] text-center"
            >
              {formattedAngle}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div
            aria-hidden="true"
            className="relative h-3 flex items-end justify-between px-1 select-none"
          >
            {DIAL_TICKS.map((tick) => {
              const isCenter = tick === 0;
              const isMajor = tick % 15 === 0;
              return (
                <span
                  key={tick}
                  style={{
                    backgroundColor: isCenter
                      ? 'var(--prism-primary-main)'
                      : isMajor
                        ? 'var(--prism-text-secondary)'
                        : 'var(--prism-divider)',
                  }}
                  className={cx(
                    'w-px rounded-full',
                    isCenter ? 'h-3 w-0.5' : isMajor ? 'h-2.5' : 'h-1.5'
                  )}
                />
              );
            })}
            <span
              style={{
                left: `${dialIndicatorPct}%`,
                backgroundColor: 'var(--prism-primary-main)',
              }}
              className="absolute bottom-0 -translate-x-1/2 w-1 h-3 rounded-full pointer-events-none"
            />
          </div>

          <input
            id={straightenId}
            type="range"
            min={MIN_ROTATION_DEG}
            max={MAX_ROTATION_DEG}
            step={ROTATION_STEP_DEG}
            value={rotationDeg}
            disabled={disabled}
            aria-label="Straighten rotation degrees"
            aria-valuemin={MIN_ROTATION_DEG}
            aria-valuemax={MAX_ROTATION_DEG}
            aria-valuenow={rotationDeg}
            aria-valuetext={formattedAngle}
            onChange={handleStraightenInputChange}
            onKeyDown={handleStraightenKeyDown}
            className="prism-focus-ring w-full accent-[var(--prism-primary-main)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <div
            aria-hidden="true"
            style={STYLE_TEXT_SECONDARY}
            className="flex items-center justify-between text-[10px] font-mono tabular-nums px-0.5"
          >
            <span>-45.0°</span>
            <span>0.0°</span>
            <span>+45.0°</span>
          </div>
        </div>
      </div>

      {/* Compact Geometry Telemetry Footer */}
      <div
        role="status"
        aria-live="polite"
        data-testid="crop-telemetry"
        style={STYLE_TEXT_SECONDARY}
        className={cx(
          telemetryClass,
          'prism-well rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums min-w-0'
        )}
      >
        <span>
          X {Math.round(crop.x)}% · Y {Math.round(crop.y)}% · {Math.round(crop.width)}%×
          {Math.round(crop.height)}% · {formattedAngle} · {aspectLabel}
        </span>
      </div>
    </div>
  );
}

export const CropStraightenOverlay = memo(CropStraightenOverlayInner);
CropStraightenOverlay.displayName = 'CropStraightenOverlay';
