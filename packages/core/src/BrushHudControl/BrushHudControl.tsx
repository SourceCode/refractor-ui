'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { Paintbrush } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type BrushPresetId = 'airbrush' | 'hard-round' | 'dodge-soft' | 'detail-pen';

export interface BrushHudValue {
  /** Brush diameter in pixels (default range 1..500). */
  sizePx: number;
  /** Brush edge hardness percentage (0..100). */
  hardnessPct: number;
  /** Brush pigment flow percentage (1..100). */
  flowPct: number;
}

type BrushHudControlBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface BrushHudControlProps extends BrushHudControlBaseProps {
  /** Controlled brush parameters (sizePx, hardnessPct, flowPct). */
  value?: BrushHudValue;
  /** Initial brush parameters in uncontrolled mode (defaults to { sizePx: 64, hardnessPct: 45, flowPct: 80 }). */
  defaultValue?: BrushHudValue;
  /** Minimum brush diameter in pixels (defaults to 1). */
  minSizePx?: number;
  /** Maximum brush diameter in pixels (defaults to 500). */
  maxSizePx?: number;
  /** Callback fired whenever brush size, hardness, or flow changes. */
  onChange?: (value: BrushHudValue) => void;
  /** HUD header title and accessible region label (defaults to 'Brush HUD'). */
  title?: string;
  /** Disables presets, sliders, fine-step buttons, and keyboard shortcuts. */
  disabled?: boolean;
}

interface BrushPresetDefinition {
  id: BrushPresetId;
  label: string;
  value: BrushHudValue;
}

const DEFAULT_TITLE = 'Brush HUD';
const DEFAULT_MIN_SIZE_PX = 1;
const DEFAULT_MAX_SIZE_PX = 500;
const MIN_HARDNESS_PCT = 0;
const MAX_HARDNESS_PCT = 100;
const MIN_FLOW_PCT = 1;
const MAX_FLOW_PCT = 100;
const FINE_SIZE_STEP = 1;
const KEYBOARD_SIZE_STEP = 10;
const KEYBOARD_HARDNESS_STEP = 10;

const PREVIEW_VIEWBOX = 128;
const PREVIEW_CENTER = 64;
const PREVIEW_MIN_RADIUS = 5;
const PREVIEW_MAX_RADIUS = 52;

const DEFAULT_BRUSH_VALUE: BrushHudValue = {
  sizePx: 64,
  hardnessPct: 45,
  flowPct: 80,
};

const BRUSH_PRESETS: ReadonlyArray<BrushPresetDefinition> = [
  {
    id: 'airbrush',
    label: 'Airbrush',
    value: { sizePx: 140, hardnessPct: 10, flowPct: 25 },
  },
  {
    id: 'hard-round',
    label: 'Hard Round',
    value: { sizePx: 48, hardnessPct: 95, flowPct: 100 },
  },
  {
    id: 'dodge-soft',
    label: 'Soft Dodge',
    value: { sizePx: 180, hardnessPct: 0, flowPct: 15 },
  },
  {
    id: 'detail-pen',
    label: 'Detail Pen',
    value: { sizePx: 8, hardnessPct: 100, flowPct: 90 },
  },
];

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeSizeBounds(minSizePx: number, maxSizePx: number): { min: number; max: number } {
  const rawMin = Math.round(
    clampNumber(minSizePx, 1, Number.MAX_SAFE_INTEGER, DEFAULT_MIN_SIZE_PX)
  );
  const rawMax = Math.round(
    clampNumber(maxSizePx, 1, Number.MAX_SAFE_INTEGER, DEFAULT_MAX_SIZE_PX)
  );
  return {
    min: Math.min(rawMin, rawMax),
    max: Math.max(rawMin, rawMax),
  };
}

function sanitizeBrushValue(
  raw: BrushHudValue,
  minSizePx: number,
  maxSizePx: number,
  fallback: BrushHudValue
): BrushHudValue {
  return {
    sizePx: Math.round(clampNumber(raw.sizePx, minSizePx, maxSizePx, fallback.sizePx)),
    hardnessPct: Math.round(
      clampNumber(raw.hardnessPct, MIN_HARDNESS_PCT, MAX_HARDNESS_PCT, fallback.hardnessPct)
    ),
    flowPct: Math.round(
      clampNumber(raw.flowPct, MIN_FLOW_PCT, MAX_FLOW_PCT, fallback.flowPct)
    ),
  };
}

function toPercent(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return 100;
  return roundTwo(clampNumber(((value - min) / span) * 100, 0, 100, 0));
}

function computePreviewRadius(sizePx: number, minSizePx: number, maxSizePx: number): number {
  const span = maxSizePx - minSizePx;
  const ratio = span <= 0 ? 0.5 : clampNumber((sizePx - minSizePx) / span, 0, 1, 0);
  const perceptual = Math.sqrt(ratio);
  return roundTwo(PREVIEW_MIN_RADIUS + perceptual * (PREVIEW_MAX_RADIUS - PREVIEW_MIN_RADIUS));
}

export function BrushHudControl({
  value,
  defaultValue = DEFAULT_BRUSH_VALUE,
  minSizePx = DEFAULT_MIN_SIZE_PX,
  maxSizePx = DEFAULT_MAX_SIZE_PX,
  onChange,
  title = DEFAULT_TITLE,
  disabled = false,
  className,
  style,
  xstyle,
  tabIndex,
  onKeyDown,
  ref,
  ...rest
}: BrushHudControlProps) {
  const uid = useId();
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const gradientId = `brush-feather-${safeUid}`;
  const sizeInputId = `brush-size-${safeUid}`;
  const hardnessInputId = `brush-hardness-${safeUid}`;
  const flowInputId = `brush-flow-${safeUid}`;

  const override = useComponentOverride('BrushHudControl');
  const { min: safeMinSizePx, max: safeMaxSizePx } = normalizeSizeBounds(minSizePx, maxSizePx);

  const safeFallback = useMemo<BrushHudValue>(
    () => ({
      sizePx: Math.round(
        clampNumber(DEFAULT_BRUSH_VALUE.sizePx, safeMinSizePx, safeMaxSizePx, safeMinSizePx)
      ),
      hardnessPct: DEFAULT_BRUSH_VALUE.hardnessPct,
      flowPct: DEFAULT_BRUSH_VALUE.flowPct,
    }),
    [safeMaxSizePx, safeMinSizePx]
  );

  const safeDefaultValue = useMemo<BrushHudValue>(
    () => sanitizeBrushValue(defaultValue, safeMinSizePx, safeMaxSizePx, safeFallback),
    [defaultValue, safeFallback, safeMaxSizePx, safeMinSizePx]
  );

  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<BrushHudValue>(safeDefaultValue);
  const currentValue = sanitizeBrushValue(
    isControlled ? value : uncontrolledValue,
    safeMinSizePx,
    safeMaxSizePx,
    safeDefaultValue
  );

  const clampedPresets = useMemo(
    () =>
      BRUSH_PRESETS.map((preset) => ({
        ...preset,
        clampedValue: sanitizeBrushValue(preset.value, safeMinSizePx, safeMaxSizePx, safeFallback),
      })),
    [safeFallback, safeMaxSizePx, safeMinSizePx]
  );

  const activePreset = clampedPresets.find(
    (preset) =>
      preset.clampedValue.sizePx === currentValue.sizePx &&
      preset.clampedValue.hardnessPct === currentValue.hardnessPct &&
      preset.clampedValue.flowPct === currentValue.flowPct
  );

  const commitValue = useCallback(
    (nextRaw: BrushHudValue) => {
      if (disabled) return;
      const next = sanitizeBrushValue(nextRaw, safeMinSizePx, safeMaxSizePx, currentValue);
      if (
        next.sizePx === currentValue.sizePx &&
        next.hardnessPct === currentValue.hardnessPct &&
        next.flowPct === currentValue.flowPct
      ) {
        return;
      }
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onChange?.(next);
    },
    [currentValue, disabled, isControlled, onChange, safeMaxSizePx, safeMinSizePx]
  );

  const handleSizeSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      commitValue({ ...currentValue, sizePx: Number(event.target.value) });
    },
    [commitValue, currentValue]
  );

  const handleHardnessSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      commitValue({ ...currentValue, hardnessPct: Number(event.target.value) });
    },
    [commitValue, currentValue]
  );

  const handleFlowSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      commitValue({ ...currentValue, flowPct: Number(event.target.value) });
    },
    [commitValue, currentValue]
  );

  const handleStepSize = useCallback(
    (delta: number) => {
      commitValue({ ...currentValue, sizePx: currentValue.sizePx + delta });
    },
    [commitValue, currentValue]
  );

  const handleHudKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        disabled ||
        event.nativeEvent.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      if (event.key === '[') {
        event.preventDefault();
        commitValue({ ...currentValue, sizePx: currentValue.sizePx - KEYBOARD_SIZE_STEP });
      } else if (event.key === ']') {
        event.preventDefault();
        commitValue({ ...currentValue, sizePx: currentValue.sizePx + KEYBOARD_SIZE_STEP });
      } else if (event.key === '{') {
        event.preventDefault();
        commitValue({
          ...currentValue,
          hardnessPct: currentValue.hardnessPct - KEYBOARD_HARDNESS_STEP,
        });
      } else if (event.key === '}') {
        event.preventDefault();
        commitValue({
          ...currentValue,
          hardnessPct: currentValue.hardnessPct + KEYBOARD_HARDNESS_STEP,
        });
      }
    },
    [commitValue, currentValue, disabled]
  );

  const composedKeyDown = useMemo(
    () => composeEventHandlers(onKeyDown, handleHudKeyDown),
    [handleHudKeyDown, onKeyDown]
  );

  const previewRadius = computePreviewRadius(currentValue.sizePx, safeMinSizePx, safeMaxSizePx);
  const peakOpacity = roundTwo(currentValue.flowPct / 100);
  const coreStopPct = roundTwo(currentValue.hardnessPct * 0.96);
  const midStopPct = roundTwo(coreStopPct + (100 - coreStopPct) * 0.55);
  const midOpacity = roundTwo(peakOpacity * (0.28 + (currentValue.hardnessPct / 100) * 0.35));

  const sizePct = toPercent(currentValue.sizePx, safeMinSizePx, safeMaxSizePx);
  const hardnessPctNorm = toPercent(currentValue.hardnessPct, MIN_HARDNESS_PCT, MAX_HARDNESS_PCT);
  const flowPctNorm = toPercent(currentValue.flowPct, MIN_FLOW_PCT, MAX_FLOW_PCT);

  const readoutText = `${currentValue.sizePx}px · ${currentValue.hardnessPct}% hard · ${currentValue.flowPct}% flow`;

  const merged = mergeProps({
    themeTarget: themeProps('brush-hud-control', {
      disabled,
      preset: activePreset ? activePreset.id : 'custom',
    }),
    baseClassName:
      'prism-slab prism-focus-ring w-full max-w-full p-4 sm:p-5 space-y-3.5 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('brush-hud-control', 'header');
  const presetsClass = stableClassName('brush-hud-control', 'presets');
  const previewClass = stableClassName('brush-hud-control', 'preview');
  const controlsClass = stableClassName('brush-hud-control', 'controls');
  const readoutClass = stableClassName('brush-hud-control', 'readout');

  const atMinSize = currentValue.sizePx <= safeMinSizePx;
  const atMaxSize = currentValue.sizePx >= safeMaxSizePx;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={title}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : (tabIndex ?? 0)}
      onKeyDown={composedKeyDown}
      {...rest}
      {...merged}
    >
      {/* Header Row */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2')}>
        <div className="flex items-center gap-2 min-w-0">
          <Paintbrush
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color: disabled ? 'var(--prism-text-disabled)' : 'var(--prism-primary-main)',
            }}
          />
          <span
            data-testid="brush-hud-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </span>
        </div>

        <span
          data-testid="brush-shortcut-hint"
          className="prism-well inline-flex flex-wrap items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[11px] tabular-nums shrink-0"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          <kbd className="font-semibold" style={{ color: 'var(--prism-text-primary)' }}>
            [
          </kbd>
          <span aria-hidden="true">/</span>
          <kbd className="font-semibold" style={{ color: 'var(--prism-text-primary)' }}>
            ]
          </kbd>
          <span>Size</span>
          <span aria-hidden="true">·</span>
          <kbd className="font-semibold" style={{ color: 'var(--prism-text-primary)' }}>
            {'{'}
          </kbd>
          <span aria-hidden="true">/</span>
          <kbd className="font-semibold" style={{ color: 'var(--prism-text-primary)' }}>
            {'}'}
          </kbd>
          <span>Hard</span>
        </span>
      </div>

      {/* Preset Pills */}
      <div
        role="group"
        aria-label="Brush presets"
        className={cx(presetsClass, 'flex flex-wrap items-center gap-1.5 max-w-full')}
      >
        {clampedPresets.map((preset) => {
          const isActive = activePreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              data-testid={`brush-preset-${preset.id}`}
              data-active={isActive ? 'true' : undefined}
              onClick={() => commitValue(preset.clampedValue)}
              className={cx(
                isActive ? 'prism-btn-primary' : 'prism-crystal',
                'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed',
                disabled ? 'opacity-50' : ''
              )}
              style={
                isActive
                  ? undefined
                  : { color: 'var(--prism-text-primary)' }
              }
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Main Optical Preview & Tactile Controls */}
      <div className="flex flex-wrap items-center gap-4 max-w-full">
        {/* Live Radial Feathering Brush Preview */}
        <div
          data-testid="brush-preview-well"
          className={cx(
            previewClass,
            'prism-well rounded-2xl p-2 flex items-center justify-center shrink-0 mx-auto sm:mx-0',
            disabled ? 'opacity-50' : ''
          )}
        >
          <svg
            viewBox={`0 0 ${PREVIEW_VIEWBOX} ${PREVIEW_VIEWBOX}`}
            className="w-28 h-28 shrink-0"
            aria-hidden="true"
            data-testid="brush-preview-svg"
          >
            <defs>
              <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
                <stop
                  data-testid="brush-gradient-stop-center"
                  offset="0%"
                  stopColor="var(--prism-primary-main)"
                  stopOpacity={peakOpacity}
                />
                <stop
                  data-testid="brush-gradient-stop-core"
                  offset={`${coreStopPct}%`}
                  stopColor="var(--prism-primary-main)"
                  stopOpacity={peakOpacity}
                />
                <stop
                  data-testid="brush-gradient-stop-mid"
                  offset={`${midStopPct}%`}
                  stopColor="var(--prism-primary-main)"
                  stopOpacity={midOpacity}
                />
                <stop
                  data-testid="brush-gradient-stop-edge"
                  offset="100%"
                  stopColor="var(--prism-primary-main)"
                  stopOpacity={0}
                />
              </radialGradient>
            </defs>

            {/* Outer Calibration Frame */}
            <circle
              cx={PREVIEW_CENTER}
              cy={PREVIEW_CENTER}
              r={PREVIEW_MAX_RADIUS}
              fill="none"
              stroke="var(--prism-divider)"
              strokeWidth={1}
            />

            {/* Crosshair Guides */}
            <line
              data-testid="brush-crosshair-h"
              x1={10}
              y1={PREVIEW_CENTER}
              x2={PREVIEW_VIEWBOX - 10}
              y2={PREVIEW_CENTER}
              stroke="var(--prism-text-disabled)"
              strokeOpacity={0.45}
              strokeWidth={1}
            />
            <line
              data-testid="brush-crosshair-v"
              x1={PREVIEW_CENTER}
              y1={10}
              x2={PREVIEW_CENTER}
              y2={PREVIEW_VIEWBOX - 10}
              stroke="var(--prism-text-disabled)"
              strokeOpacity={0.45}
              strokeWidth={1}
            />

            {/* Feathered Brush Tip Dab */}
            <circle
              data-testid="brush-preview-dab"
              cx={PREVIEW_CENTER}
              cy={PREVIEW_CENTER}
              r={previewRadius}
              fill={`url(#${gradientId})`}
            />

            {/* Dashed Outer Brush Ring */}
            <circle
              data-testid="brush-preview-ring"
              cx={PREVIEW_CENTER}
              cy={PREVIEW_CENTER}
              r={previewRadius}
              fill="none"
              stroke="var(--prism-text-secondary)"
              strokeOpacity={0.65}
              strokeWidth={1.25}
              strokeDasharray="3 3"
            />
          </svg>
        </div>

        {/* Sliders & Fine Controls */}
        <div className={cx(controlsClass, 'flex-1 min-w-0 basis-52 max-w-full space-y-3')}>
          {/* Size (px) */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={sizeInputId}
                className="text-xs font-semibold tracking-tight"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Size
              </label>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={disabled || atMinSize}
                  aria-label="Decrease brush size by 1 pixel"
                  data-testid="brush-size-decrease"
                  onClick={() => handleStepSize(-FINE_SIZE_STEP)}
                  className={cx(
                    'prism-crystal prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center font-mono text-xs font-bold cursor-pointer disabled:cursor-not-allowed',
                    disabled || atMinSize ? 'opacity-45' : ''
                  )}
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  -
                </button>
                <span
                  data-testid="brush-size-pill"
                  className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums min-w-[3.25rem] text-center"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {currentValue.sizePx}px
                </span>
                <button
                  type="button"
                  disabled={disabled || atMaxSize}
                  aria-label="Increase brush size by 1 pixel"
                  data-testid="brush-size-increase"
                  onClick={() => handleStepSize(FINE_SIZE_STEP)}
                  className={cx(
                    'prism-crystal prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center font-mono text-xs font-bold cursor-pointer disabled:cursor-not-allowed',
                    disabled || atMaxSize ? 'opacity-45' : ''
                  )}
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  +
                </button>
              </div>
            </div>

            <div className={cx('relative h-7 flex items-center', disabled ? 'opacity-50' : '')}>
              <div className="prism-well w-full h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  data-testid="brush-size-fill"
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${sizePct}%`,
                    backgroundColor: 'var(--prism-primary-main)',
                  }}
                />
              </div>
              <input
                id={sizeInputId}
                type="range"
                min={safeMinSizePx}
                max={safeMaxSizePx}
                step={FINE_SIZE_STEP}
                value={currentValue.sizePx}
                disabled={disabled}
                aria-label="Brush size in pixels"
                aria-valuetext={`${currentValue.sizePx} pixels`}
                onChange={handleSizeSliderChange}
                className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div
                aria-hidden="true"
                className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                style={{ left: `${sizePct}%` }}
              />
            </div>
          </div>

          {/* Hardness (%) */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={hardnessInputId}
                className="text-xs font-semibold tracking-tight"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Hardness
              </label>

              <span
                data-testid="brush-hardness-pill"
                className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums min-w-[3.25rem] text-center"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {currentValue.hardnessPct}%
              </span>
            </div>

            <div className={cx('relative h-7 flex items-center', disabled ? 'opacity-50' : '')}>
              <div className="prism-well w-full h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  data-testid="brush-hardness-fill"
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${hardnessPctNorm}%`,
                    backgroundColor: 'var(--prism-secondary-main)',
                  }}
                />
              </div>
              <input
                id={hardnessInputId}
                type="range"
                min={MIN_HARDNESS_PCT}
                max={MAX_HARDNESS_PCT}
                step={1}
                value={currentValue.hardnessPct}
                disabled={disabled}
                aria-label="Brush hardness percentage"
                aria-valuetext={`${currentValue.hardnessPct} percent`}
                onChange={handleHardnessSliderChange}
                className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div
                aria-hidden="true"
                className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                style={{ left: `${hardnessPctNorm}%` }}
              />
            </div>
          </div>

          {/* Flow (%) */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={flowInputId}
                className="text-xs font-semibold tracking-tight"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Flow
              </label>

              <span
                data-testid="brush-flow-pill"
                className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums min-w-[3.25rem] text-center"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {currentValue.flowPct}%
              </span>
            </div>

            <div className={cx('relative h-7 flex items-center', disabled ? 'opacity-50' : '')}>
              <div className="prism-well w-full h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  data-testid="brush-flow-fill"
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${flowPctNorm}%`,
                    backgroundColor: 'var(--prism-primary-light)',
                  }}
                />
              </div>
              <input
                id={flowInputId}
                type="range"
                min={MIN_FLOW_PCT}
                max={MAX_FLOW_PCT}
                step={1}
                value={currentValue.flowPct}
                disabled={disabled}
                aria-label="Brush flow percentage"
                aria-valuetext={`${currentValue.flowPct} percent`}
                onChange={handleFlowSliderChange}
                className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div
                aria-hidden="true"
                className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                style={{ left: `${flowPctNorm}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Status Readout */}
      <div
        className={cx(
          readoutClass,
          'prism-well rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 max-w-full'
        )}
      >
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="brush-hud-readout"
          className="font-mono text-xs font-medium tabular-nums truncate min-w-0"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {readoutText}
        </div>

        <span
          data-testid="brush-preset-status"
          className="font-mono text-[11px] font-semibold shrink-0"
          style={{
            color: activePreset ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)',
          }}
        >
          {activePreset ? activePreset.label : 'Custom'}
        </span>
      </div>
    </div>
  );
}

BrushHudControl.displayName = 'BrushHudControl';
