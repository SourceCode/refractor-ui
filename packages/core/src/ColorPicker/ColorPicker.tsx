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
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import {
  getAccessibleContrastText,
  getContrastRatio,
  hexToHsv,
  hsvToHex,
  parseColorToRgb,
  rgbToHex,
  type HsvColor,
} from '../utils/colorMath';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

const DEFAULT_HEX = '#E75C24';

const DEFAULT_PRESETS: ReadonlyArray<string> = [
  '#E75C24',
  '#38BDF8',
  '#26BC92',
  '#1D4ED8',
  '#7C3AED',
  '#D97706',
  '#EC4899',
  '#18202C',
];

const STRICT_HEX_RE = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const HUE_GRADIENT =
  'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';

const CHECKERBOARD_STYLE = {
  backgroundImage:
    'linear-gradient(45deg, rgba(148, 163, 184, 0.32) 25%, transparent 25%), linear-gradient(-45deg, rgba(148, 163, 184, 0.32) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148, 163, 184, 0.32) 75%), linear-gradient(-45deg, transparent 75%, rgba(148, 163, 184, 0.32) 75%)',
  backgroundSize: '10px 10px',
  backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
} as const;

type ColorPickerBaseProps = Omit<BaseProps<HTMLDivElement>, 'children' | 'onChange'>;

export interface ColorPickerProps extends ColorPickerBaseProps {
  /** Controlled #RRGGBB hex color value. */
  value?: string;
  /** Initial uncontrolled #RRGGBB hex color value (defaults to '#E75C24'). */
  defaultValue?: string;
  /** Controlled opacity alpha value in the range 0..1. */
  alpha?: number;
  /** Initial uncontrolled opacity alpha value in the range 0..1 (defaults to 1). */
  defaultAlpha?: number;
  /** Callback fired whenever the selected hex color or opacity changes. */
  onChange?: (hex: string, alpha: number) => void;
  /** Optional visible header label for the studio color picker card. */
  label?: string;
  /** Quick preset swatch hex strings rendered as clickable optical pills. */
  presets?: ReadonlyArray<string>;
  /** Shows or hides the opacity slider and alpha percentage input (defaults to true). */
  showAlpha?: boolean;
  /** Disables all spectrum, slider, channel input, and preset interactions. */
  disabled?: boolean;
}

function parseStrictHex(raw: string): string | null {
  const trimmed = raw.trim();
  if (!STRICT_HEX_RE.test(trimmed)) return null;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return rgbToHex(parseColorToRgb(withHash));
}

function normalizeHex(raw: string): string {
  return parseStrictHex(raw) ?? DEFAULT_HEX;
}

function normalizeAlpha(raw: number): number {
  if (!Number.isFinite(raw)) return 1;
  return Math.round(clampNumber(raw, 0, 1, 1) * 100) / 100;
}

function getWcagGrade(ratio: number): string {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA+';
  return 'Low';
}

export function ColorPicker({
  value,
  defaultValue = DEFAULT_HEX,
  alpha,
  defaultAlpha = 1,
  onChange,
  label,
  presets = DEFAULT_PRESETS,
  showAlpha = true,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ColorPickerProps) {
  const override = useComponentOverride('ColorPicker');
  const baseId = useId();
  const hueInputId = `${baseId}-hue`;
  const alphaInputId = `${baseId}-alpha`;
  const hexInputId = `${baseId}-hex`;
  const rInputId = `${baseId}-r`;
  const gInputId = `${baseId}-g`;
  const bInputId = `${baseId}-b`;
  const aInputId = `${baseId}-a`;

  const isHexControlled = value !== undefined;
  const isAlphaControlled = alpha !== undefined;

  const [internalHex, setInternalHex] = useState<string>(() => normalizeHex(defaultValue));
  const [internalAlpha, setInternalAlpha] = useState<number>(() => normalizeAlpha(defaultAlpha));

  const activeHex = isHexControlled ? normalizeHex(value) : internalHex;
  const activeAlpha = isAlphaControlled ? normalizeAlpha(alpha) : internalAlpha;

  const [hsvAnchor, setHsvAnchor] = useState<{ hex: string; hsv: HsvColor }>(() => ({
    hex: activeHex,
    hsv: hexToHsv(activeHex),
  }));

  const activeHsv = useMemo<HsvColor>(
    () => (hsvAnchor.hex === activeHex ? hsvAnchor.hsv : hexToHsv(activeHex)),
    [activeHex, hsvAnchor]
  );

  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [isDraggingSpectrum, setIsDraggingSpectrum] = useState(false);
  const spectrumRef = useRef<HTMLDivElement | null>(null);

  const rgb = useMemo(() => parseColorToRgb(activeHex), [activeHex]);
  const pureHueHex = useMemo(() => hsvToHex({ h: activeHsv.h, s: 100, v: 100 }), [activeHsv.h]);
  const alphaPct = Math.round(activeAlpha * 100);

  const swatchTextColor = useMemo(() => getAccessibleContrastText(activeHex), [activeHex]);
  const whiteContrast = useMemo(() => getContrastRatio(activeHex, '#FFFFFF'), [activeHex]);
  const inkContrast = useMemo(() => getContrastRatio(activeHex, '#151E2C'), [activeHex]);

  const normalizedPresets = useMemo(() => {
    const seen = new Set<string>();
    const valid: string[] = [];
    for (const preset of presets) {
      const parsed = parseStrictHex(preset);
      if (parsed && !seen.has(parsed)) {
        seen.add(parsed);
        valid.push(parsed);
      }
    }
    return valid;
  }, [presets]);

  const commitHsv = useCallback(
    (nextHsv: HsvColor) => {
      const safeHsv: HsvColor = {
        h: Math.round(clampNumber(nextHsv.h, 0, 360, activeHsv.h)),
        s: Math.round(clampNumber(nextHsv.s, 0, 100, activeHsv.s)),
        v: Math.round(clampNumber(nextHsv.v, 0, 100, activeHsv.v)),
      };
      const nextHex = hsvToHex(safeHsv);
      setHsvAnchor({ hex: nextHex, hsv: safeHsv });
      setHexDraft(null);
      if (!isHexControlled) {
        setInternalHex(nextHex);
      }
      onChange?.(nextHex, activeAlpha);
    },
    [activeAlpha, activeHsv.h, activeHsv.s, activeHsv.v, isHexControlled, onChange]
  );

  const commitHex = useCallback(
    (nextHex: string) => {
      const nextHsv = hexToHsv(nextHex);
      setHsvAnchor({ hex: nextHex, hsv: nextHsv });
      setHexDraft(null);
      if (!isHexControlled) {
        setInternalHex(nextHex);
      }
      onChange?.(nextHex, activeAlpha);
    },
    [activeAlpha, isHexControlled, onChange]
  );

  const commitAlpha = useCallback(
    (nextAlpha: number) => {
      const safeAlpha = normalizeAlpha(nextAlpha);
      if (!isAlphaControlled) {
        setInternalAlpha(safeAlpha);
      }
      onChange?.(activeHex, safeAlpha);
    },
    [activeHex, isAlphaControlled, onChange]
  );

  const updateSpectrumFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = spectrumRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      const ratioX = clampNumber((clientX - rect.left) / rect.width, 0, 1, 0);
      const ratioY = clampNumber((clientY - rect.top) / rect.height, 0, 1, 0);
      commitHsv({
        h: activeHsv.h,
        s: Math.round(ratioX * 100),
        v: Math.round((1 - ratioY) * 100),
      });
    },
    [activeHsv.h, commitHsv]
  );

  useEffect(() => {
    if (!isDraggingSpectrum || disabled) return;

    const handlePointerMove = (event: PointerEvent) => {
      updateSpectrumFromPoint(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      setIsDraggingSpectrum(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [disabled, isDraggingSpectrum, updateSpectrumFromPoint]);

  const handleSpectrumPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    spectrumRef.current?.focus();
    updateSpectrumFromPoint(e.clientX, e.clientY);
    setIsDraggingSpectrum(true);
  };

  const handleSpectrumKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step = e.shiftKey ? 10 : 1;
    let nextS = activeHsv.s;
    let nextV = activeHsv.v;

    if (e.key === 'ArrowRight') {
      nextS = clampNumber(activeHsv.s + step, 0, 100, activeHsv.s);
    } else if (e.key === 'ArrowLeft') {
      nextS = clampNumber(activeHsv.s - step, 0, 100, activeHsv.s);
    } else if (e.key === 'ArrowUp') {
      nextV = clampNumber(activeHsv.v + step, 0, 100, activeHsv.v);
    } else if (e.key === 'ArrowDown') {
      nextV = clampNumber(activeHsv.v - step, 0, 100, activeHsv.v);
    } else if (e.key === 'Home') {
      nextS = 0;
    } else if (e.key === 'End') {
      nextS = 100;
    } else {
      return;
    }

    e.preventDefault();
    commitHsv({ h: activeHsv.h, s: nextS, v: nextV });
  };

  const commitHexDraft = (raw: string) => {
    const parsed = parseStrictHex(raw);
    setHexDraft(null);
    if (parsed) {
      commitHex(parsed);
    }
  };

  const handleRgbChannelChange = (channel: 'r' | 'g' | 'b', raw: string) => {
    if (disabled) return;
    const trimmed = raw.trim();
    if (trimmed === '') return;
    const clamped = Math.round(clampNumber(Number(trimmed), 0, 255, rgb[channel]));
    const nextHex = rgbToHex({ ...rgb, [channel]: clamped });
    commitHex(nextHex);
  };

  const handleAlphaInputChange = (raw: string) => {
    if (disabled) return;
    const trimmed = raw.trim();
    if (trimmed === '') return;
    const clampedPct = Math.round(clampNumber(Number(trimmed), 0, 100, alphaPct));
    commitAlpha(clampedPct / 100);
  };

  const merged = mergeProps({
    themeTarget: themeProps('color-picker', { disabled, showAlpha }),
    baseClassName: 'prism-slab p-4 flex flex-col gap-3.5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const spectrumClass = stableClassName('color-picker', 'spectrum');
  const slidersClass = stableClassName('color-picker', 'sliders');
  const inputsClass = stableClassName('color-picker', 'inputs');
  const contrastClass = stableClassName('color-picker', 'contrast');
  const presetsClass = stableClassName('color-picker', 'presets');

  const huePct = clampNumber((activeHsv.h / 360) * 100, 0, 100, 0);

  return (
    <div ref={ref} {...rest} {...merged}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold tracking-tight text-slate-800 dark:text-slate-100">
            {label}
          </span>
          <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {showAlpha ? `${activeHex} · ${alphaPct}%` : activeHex}
          </span>
        </div>
      ) : null}

      {/* 2D Interactive HSV Saturation / Value Spectrum */}
      <div
        ref={spectrumRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label ? `${label} saturation and brightness` : 'Color saturation and brightness'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={activeHsv.s}
        aria-valuetext={`Saturation ${activeHsv.s}%, Brightness ${activeHsv.v}%, ${activeHex}`}
        aria-disabled={disabled || undefined}
        onPointerDown={handleSpectrumPointerDown}
        onKeyDown={handleSpectrumKeyDown}
        className={cx(
          spectrumClass,
          'prism-focus-ring relative w-full h-44 rounded-2xl overflow-hidden select-none touch-none',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'
        )}
        style={{
          backgroundColor: pureHueHex,
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.45)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, #000000 0%, rgba(0, 0, 0, 0) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          data-spectrum-thumb="true"
          className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{
            left: `${activeHsv.s}%`,
            top: `${100 - activeHsv.v}%`,
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: activeHex }}
          />
        </div>
      </div>

      {/* Hue & Opacity Sliders */}
      <div className={cx(slidersClass, 'flex flex-col gap-2.5')}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <label
              htmlFor={hueInputId}
              className="font-semibold text-slate-700 dark:text-slate-200"
            >
              Hue
            </label>
            <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
              {activeHsv.h}°
            </span>
          </div>
          <div className={cx('relative h-7 flex items-center', disabled && 'opacity-50')}>
            <div className="prism-crystal w-full h-3.5 rounded-full overflow-hidden p-0.5">
              <div
                className="w-full h-full rounded-full"
                style={{ background: HUE_GRADIENT }}
              />
            </div>
            <input
              id={hueInputId}
              type="range"
              min={0}
              max={360}
              step={1}
              value={activeHsv.h}
              disabled={disabled}
              aria-label="Hue"
              onChange={(e) => {
                if (disabled) return;
                const nextHue = Math.round(clampNumber(Number(e.target.value), 0, 360, activeHsv.h));
                commitHsv({ h: nextHue, s: activeHsv.s, v: activeHsv.v });
              }}
              className="peer absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div
              aria-hidden="true"
              className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 flex items-center justify-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
              style={{ left: `${huePct}%` }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: pureHueHex }}
              />
            </div>
          </div>
        </div>

        {showAlpha ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <label
                htmlFor={alphaInputId}
                className="font-semibold text-slate-700 dark:text-slate-200"
              >
                Opacity
              </label>
              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                {alphaPct}%
              </span>
            </div>
            <div className={cx('relative h-7 flex items-center', disabled && 'opacity-50')}>
              <div className="prism-crystal w-full h-3.5 rounded-full overflow-hidden p-0.5">
                <div className="relative w-full h-full rounded-full overflow-hidden" style={CHECKERBOARD_STYLE}>
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `linear-gradient(to right, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1) 100%)`,
                    }}
                  />
                </div>
              </div>
              <input
                id={alphaInputId}
                type="range"
                min={0}
                max={100}
                step={1}
                value={alphaPct}
                disabled={disabled}
                aria-label="Opacity"
                onChange={(e) => {
                  if (disabled) return;
                  const nextPct = Math.round(clampNumber(Number(e.target.value), 0, 100, alphaPct));
                  commitAlpha(nextPct / 100);
                }}
                className="peer absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div
                aria-hidden="true"
                className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                style={{ left: `${alphaPct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Synchronized Hex + R / G / B / A Inputs inside Recessed Wells */}
      <div
        className={cx(
          inputsClass,
          'grid gap-2',
          showAlpha ? 'grid-cols-[1.5fr_1fr_1fr_1fr_1fr]' : 'grid-cols-[1.6fr_1fr_1fr_1fr]'
        )}
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor={hexInputId}
            className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1"
          >
            Hex
          </label>
          <input
            id={hexInputId}
            type="text"
            value={hexDraft ?? activeHex}
            disabled={disabled}
            aria-label="Hex color"
            maxLength={7}
            onChange={(e) => {
              if (disabled) return;
              setHexDraft(e.target.value);
            }}
            onBlur={() => {
              if (hexDraft !== null) {
                commitHexDraft(hexDraft);
              }
            }}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                commitHexDraft(e.currentTarget.value);
              } else if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                setHexDraft(null);
              }
            }}
            className="prism-well prism-focus-ring h-8 w-full px-2 rounded-xl text-xs font-mono uppercase tabular-nums text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={rInputId}
            className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1"
          >
            R
          </label>
          <input
            id={rInputId}
            type="number"
            min={0}
            max={255}
            value={rgb.r}
            disabled={disabled}
            aria-label="Red channel"
            onChange={(e) => handleRgbChannelChange('r', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                handleRgbChannelChange('r', e.currentTarget.value);
              }
            }}
            className="prism-well prism-focus-ring h-8 w-full px-2 rounded-xl text-xs font-mono tabular-nums text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={gInputId}
            className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1"
          >
            G
          </label>
          <input
            id={gInputId}
            type="number"
            min={0}
            max={255}
            value={rgb.g}
            disabled={disabled}
            aria-label="Green channel"
            onChange={(e) => handleRgbChannelChange('g', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                handleRgbChannelChange('g', e.currentTarget.value);
              }
            }}
            className="prism-well prism-focus-ring h-8 w-full px-2 rounded-xl text-xs font-mono tabular-nums text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={bInputId}
            className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1"
          >
            B
          </label>
          <input
            id={bInputId}
            type="number"
            min={0}
            max={255}
            value={rgb.b}
            disabled={disabled}
            aria-label="Blue channel"
            onChange={(e) => handleRgbChannelChange('b', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                handleRgbChannelChange('b', e.currentTarget.value);
              }
            }}
            className="prism-well prism-focus-ring h-8 w-full px-2 rounded-xl text-xs font-mono tabular-nums text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {showAlpha ? (
          <div className="flex flex-col gap-1">
            <label
              htmlFor={aInputId}
              className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1"
            >
              A%
            </label>
            <input
              id={aInputId}
              type="number"
              min={0}
              max={100}
              value={alphaPct}
              disabled={disabled}
              aria-label="Alpha percentage"
              onChange={(e) => handleAlphaInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  handleAlphaInputChange(e.currentTarget.value);
                }
              }}
              className="prism-well prism-focus-ring h-8 w-full px-2 rounded-xl text-xs font-mono tabular-nums text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        ) : null}
      </div>

      {/* Live Optical Swatch + WCAG Contrast Readout */}
      <div
        className={cx(
          contrastClass,
          'prism-crystal rounded-2xl p-2.5 flex items-center gap-3'
        )}
      >
        <div
          data-color-swatch="true"
          className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-inner"
          style={CHECKERBOARD_STYLE}
        >
          <div
            className="absolute inset-0 flex items-center justify-center text-sm font-bold tracking-tight"
            style={{
              backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${activeAlpha})`,
              color: swatchTextColor,
            }}
          >
            Aa
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600 dark:text-slate-300 font-medium">vs #FFFFFF</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
              {whiteContrast.toFixed(2)}:1{' '}
              <span className="text-[10px] font-sans uppercase text-slate-500 dark:text-slate-400">
                {getWcagGrade(whiteContrast)}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600 dark:text-slate-300 font-medium">vs #151E2C</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
              {inkContrast.toFixed(2)}:1{' '}
              <span className="text-[10px] font-sans uppercase text-slate-500 dark:text-slate-400">
                {getWcagGrade(inkContrast)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Preset Swatch Pills */}
      {normalizedPresets.length > 0 ? (
        <div
          role="group"
          aria-label="Color presets"
          className={cx(presetsClass, 'flex flex-wrap items-center gap-2')}
        >
          {normalizedPresets.map((presetHex) => {
            const isSelected = presetHex === activeHex;
            return (
              <button
                key={presetHex}
                type="button"
                disabled={disabled}
                aria-label={`Select preset color ${presetHex}`}
                aria-pressed={isSelected}
                data-preset-color={presetHex}
                onClick={() => {
                  commitHex(presetHex);
                }}
                className={cx(
                  'prism-crystal prism-focus-ring w-7 h-7 rounded-full p-0.5 flex items-center justify-center transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:scale-105',
                  isSelected && 'ring-2 ring-[var(--prism-focus-ring)]'
                )}
              >
                <span
                  aria-hidden="true"
                  className="w-full h-full rounded-full block"
                  style={{ backgroundColor: presetHex }}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

ColorPicker.displayName = 'ColorPicker';
