'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Pin,
  PinOff,
  RotateCcw,
} from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export interface WindowUtilityState {
  pinned: boolean;
  shaded: boolean;
  opacityPct: number;
}

type WindowUtilityControlsBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface WindowUtilityControlsProps extends WindowUtilityControlsBaseProps {
  /** Window heading displayed inside the optical titlebar (defaults to `'Optical Shader Monitor'`). */
  title?: string;
  /** Controlled window utility state (`pinned`, `shaded`, `opacityPct`). */
  value?: WindowUtilityState;
  /** Initial uncontrolled window utility state overrides. */
  defaultValue?: Partial<WindowUtilityState>;
  /** Renders the translucent sample window body when true and not shaded (defaults to `true`). */
  showSampleBody?: boolean;
  /** Callback fired whenever pin, shade, or background opacity state changes. */
  onChange?: (state: WindowUtilityState) => void;
  /** Disables pin, shade, opacity range, preset pills, and reset controls. */
  disabled?: boolean;
}

const DEFAULT_TITLE = 'Optical Shader Monitor';
const MIN_OPACITY_PCT = 30;
const MAX_OPACITY_PCT = 100;
const OPACITY_STEP = 2;
const DEFAULT_OPACITY_PCT = 92;
const OPACITY_PRESETS: ReadonlyArray<number> = [50, 75, 100];

const DEFAULT_UTILITY_STATE: WindowUtilityState = {
  pinned: false,
  shaded: false,
  opacityPct: DEFAULT_OPACITY_PCT,
};

function sanitizeOpacityPct(
  raw: number | undefined,
  fallback = DEFAULT_OPACITY_PCT
): number {
  const numeric = typeof raw === 'number' ? raw : fallback;
  return Math.round(
    clampNumber(numeric, MIN_OPACITY_PCT, MAX_OPACITY_PCT, fallback)
  );
}

function resolveUtilityState(
  raw?: Partial<WindowUtilityState>,
  fallback: WindowUtilityState = DEFAULT_UTILITY_STATE
): WindowUtilityState {
  return {
    pinned: typeof raw?.pinned === 'boolean' ? raw.pinned : fallback.pinned,
    shaded: typeof raw?.shaded === 'boolean' ? raw.shaded : fallback.shaded,
    opacityPct: sanitizeOpacityPct(raw?.opacityPct, fallback.opacityPct),
  };
}

export function WindowUtilityControls({
  title = DEFAULT_TITLE,
  value,
  defaultValue,
  showSampleBody = true,
  onChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: WindowUtilityControlsProps) {
  const titleId = useId();
  const bodyId = useId();
  const opacityInputId = useId();
  const override = useComponentOverride('WindowUtilityControls');

  const initialUncontrolledState = useMemo<WindowUtilityState>(
    () => resolveUtilityState(defaultValue),
    [defaultValue]
  );

  const isControlled = value !== undefined;
  const [uncontrolledState, setUncontrolledState] = useState<WindowUtilityState>(
    initialUncontrolledState
  );

  const state = useMemo<WindowUtilityState>(
    () => (isControlled ? resolveUtilityState(value) : uncontrolledState),
    [isControlled, uncontrolledState, value]
  );

  const [announcement, setAnnouncement] = useState('');

  const resolvedTitle = title.trim() || DEFAULT_TITLE;
  const isBodyVisible = showSampleBody && !state.shaded;
  const opacityTrackPct = Math.round(
    ((state.opacityPct - MIN_OPACITY_PCT) /
      (MAX_OPACITY_PCT - MIN_OPACITY_PCT)) *
      100
  );

  const commitState = useCallback(
    (nextRaw: WindowUtilityState, announcementText: string) => {
      if (disabled) {
        return;
      }
      const next = resolveUtilityState(nextRaw, state);
      if (!isControlled) {
        setUncontrolledState(next);
      }
      setAnnouncement(announcementText);
      onChange?.(next);
    },
    [disabled, isControlled, onChange, state]
  );

  const handleTogglePin = useCallback(() => {
    const nextPinned = !state.pinned;
    commitState(
      { ...state, pinned: nextPinned },
      nextPinned
        ? `${resolvedTitle} pinned always on top`
        : `${resolvedTitle} unpinned from always on top`
    );
  }, [commitState, resolvedTitle, state]);

  const handleToggleShade = useCallback(() => {
    const nextShaded = !state.shaded;
    commitState(
      { ...state, shaded: nextShaded },
      nextShaded
        ? `${resolvedTitle} shaded and rolled up`
        : `${resolvedTitle} expanded from window shade`
    );
  }, [commitState, resolvedTitle, state]);

  const handleOpacitySliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextOpacity = sanitizeOpacityPct(
        Number(event.target.value),
        state.opacityPct
      );
      commitState(
        { ...state, opacityPct: nextOpacity },
        `${resolvedTitle} background opacity set to ${nextOpacity}%`
      );
    },
    [commitState, resolvedTitle, state]
  );

  const handleSelectPreset = useCallback(
    (presetPct: number) => {
      const nextOpacity = sanitizeOpacityPct(presetPct, state.opacityPct);
      commitState(
        { ...state, opacityPct: nextOpacity },
        `${resolvedTitle} background opacity set to ${nextOpacity}%`
      );
    },
    [commitState, resolvedTitle, state]
  );

  const handleReset = useCallback(() => {
    commitState(
      DEFAULT_UTILITY_STATE,
      `${resolvedTitle} utilities reset to defaults: unpinned, expanded, ${DEFAULT_OPACITY_PCT}% opacity`
    );
  }, [commitState, resolvedTitle]);

  const handleControlKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, action: () => void) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action();
      }
    },
    [disabled]
  );

  const baseStyle: OpticalStyleTokens | undefined = state.pinned
    ? {
        boxShadow:
          '0 0 0 2px color-mix(in srgb, var(--prism-primary-main) 58%, transparent), 0 18px 40px -10px color-mix(in srgb, var(--prism-primary-main) 26%, transparent)',
      }
    : undefined;

  const merged = mergeProps({
    themeTarget: themeProps('window-utility-controls', {
      pinned: state.pinned,
      shaded: state.shaded,
      opacityPct: state.opacityPct,
      showSampleBody,
      disabled,
    }),
    baseClassName:
      'prism-slab relative flex flex-col overflow-hidden w-full max-w-full min-w-0 transition-all duration-200 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('window-utility-controls', 'header');
  const titleGroupClass = stableClassName(
    'window-utility-controls',
    'title-group'
  );
  const pillsClass = stableClassName('window-utility-controls', 'pills');
  const controlsClass = stableClassName('window-utility-controls', 'controls');
  const opacityClass = stableClassName('window-utility-controls', 'opacity');
  const presetsClass = stableClassName('window-utility-controls', 'presets');
  const bodyClass = stableClassName('window-utility-controls', 'body');

  const leadingIconColor = disabled
    ? 'var(--prism-text-disabled)'
    : state.pinned
      ? 'var(--prism-primary-main)'
      : state.shaded
        ? 'var(--prism-info-main)'
        : 'var(--prism-text-secondary)';

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={titleId}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Optical Glass Titlebar Utility Cluster */}
      <header
        data-part="header"
        className={cx(
          headerClass,
          'prism-crystal relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 px-3.5 py-2.5 min-w-0 max-w-full',
          isBodyVisible ? 'border-b' : ''
        )}
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        {/* Top Optical Specular Edge Highlight */}
        <span
          aria-hidden="true"
          data-part="sheen"
          className="pointer-events-none absolute inset-x-4 top-0 h-px transition-opacity duration-200"
          style={{
            opacity: state.pinned ? 1 : 0.72,
            background: state.pinned
              ? 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--prism-primary-light) 80%, transparent) 30%, color-mix(in srgb, var(--prism-primary-main) 65%, transparent) 70%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--prism-primary-contrast) 70%, transparent) 30%, color-mix(in srgb, var(--prism-secondary-light) 55%, transparent) 70%, transparent 100%)',
          }}
        />

        {/* Window Title + Live Status Pills */}
        <div
          className={cx(
            titleGroupClass,
            'flex flex-wrap items-center gap-2 min-w-0 max-w-full flex-1'
          )}
        >
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: leadingIconColor }}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
          </span>

          <h2
            id={titleId}
            className="text-xs sm:text-sm font-semibold tracking-[-0.01em] truncate min-w-0 max-w-full"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {resolvedTitle}
          </h2>

          <div
            data-part="pills"
            className={cx(
              pillsClass,
              'flex flex-wrap items-center gap-1.5 min-w-0 max-w-full'
            )}
          >
            {state.pinned ? (
              <span
                data-testid="window-utility-pill-pinned"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0"
                style={{
                  color: 'var(--prism-primary-main)',
                  borderColor:
                    'color-mix(in srgb, var(--prism-primary-main) 44%, var(--prism-divider))',
                  backgroundColor:
                    'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
                }}
              >
                <Pin aria-hidden="true" className="w-2.5 h-2.5 shrink-0" />
                <span>Pinned</span>
              </span>
            ) : null}

            {state.shaded ? (
              <span
                data-testid="window-utility-pill-shaded"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0"
                style={{
                  color: 'var(--prism-info-main)',
                  borderColor:
                    'color-mix(in srgb, var(--prism-info-main) 44%, var(--prism-divider))',
                  backgroundColor:
                    'color-mix(in srgb, var(--prism-info-main) 14%, transparent)',
                }}
              >
                <ChevronUp
                  aria-hidden="true"
                  className="w-2.5 h-2.5 shrink-0"
                />
                <span>Shaded</span>
              </span>
            ) : null}

            <span
              data-testid="window-utility-pill-opacity"
              className="prism-well inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {state.opacityPct}%
            </span>
          </div>
        </div>

        {/* Titlebar Utility Toggles & Opacity Translucency Controls */}
        <div
          role="toolbar"
          aria-label="Window utility controls"
          className={cx(
            controlsClass,
            'flex flex-wrap items-center gap-2 min-w-0 max-w-full'
          )}
        >
          {/* Pin & Shade Toggle Buttons */}
          <div className="inline-flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
            <button
              type="button"
              disabled={disabled}
              aria-pressed={state.pinned}
              aria-label="Pin window always on top"
              data-control="pin"
              data-testid="window-utility-pin-btn"
              onClick={handleTogglePin}
              onKeyDown={(event) => handleControlKeyDown(event, handleTogglePin)}
              className={cx(
                'prism-focus-ring h-7 px-2.5 rounded-full border inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed transition-colors',
                state.pinned ? 'shadow-sm' : 'prism-well',
                disabled ? 'opacity-50' : ''
              )}
              style={
                state.pinned
                  ? {
                      borderColor: 'var(--prism-primary-main)',
                      backgroundColor:
                        'color-mix(in srgb, var(--prism-primary-main) 16%, transparent)',
                      color: 'var(--prism-primary-main)',
                    }
                  : {
                      borderColor: 'var(--prism-divider)',
                      color: 'var(--prism-text-secondary)',
                    }
              }
            >
              {state.pinned ? (
                <Pin aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <PinOff aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Pin</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              aria-pressed={state.shaded}
              aria-label="Roll up window shade"
              aria-expanded={!state.shaded}
              aria-controls={isBodyVisible ? bodyId : undefined}
              data-control="shade"
              data-testid="window-utility-shade-btn"
              onClick={handleToggleShade}
              onKeyDown={(event) =>
                handleControlKeyDown(event, handleToggleShade)
              }
              className={cx(
                'prism-focus-ring h-7 px-2.5 rounded-full border inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed transition-colors',
                state.shaded ? 'shadow-sm' : 'prism-well',
                disabled ? 'opacity-50' : ''
              )}
              style={
                state.shaded
                  ? {
                      borderColor: 'var(--prism-info-main)',
                      backgroundColor:
                        'color-mix(in srgb, var(--prism-info-main) 16%, transparent)',
                      color: 'var(--prism-info-main)',
                    }
                  : {
                      borderColor: 'var(--prism-divider)',
                      color: 'var(--prism-text-secondary)',
                    }
              }
            >
              {state.shaded ? (
                <ChevronDown
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0"
                />
              ) : (
                <ChevronUp
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0"
                />
              )}
              <span>Shade</span>
            </button>
          </div>

          {/* Inline Opacity Translucency Slider + Quick Presets + Reset */}
          <div
            data-part="opacity-cluster"
            className={cx(
              opacityClass,
              'prism-well rounded-full px-2.5 py-1 flex flex-wrap items-center gap-2 min-w-0 max-w-full'
            )}
          >
            <label
              htmlFor={opacityInputId}
              className="text-[11px] font-semibold tracking-tight whitespace-nowrap shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Opacity
            </label>

            <div
              className={cx(
                'relative w-24 sm:w-28 h-6 flex items-center shrink-0',
                disabled ? 'opacity-50' : ''
              )}
            >
              <div className="prism-crystal w-full h-2 rounded-full overflow-hidden p-[1px]">
                <div
                  data-testid="window-utility-opacity-fill"
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${opacityTrackPct}%`,
                    backgroundColor: 'var(--prism-primary-main)',
                  }}
                />
              </div>
              <input
                id={opacityInputId}
                type="range"
                min={MIN_OPACITY_PCT}
                max={MAX_OPACITY_PCT}
                step={OPACITY_STEP}
                value={state.opacityPct}
                disabled={disabled}
                aria-label="Window background opacity"
                aria-valuetext={`${state.opacityPct}% opacity`}
                onChange={handleOpacitySliderChange}
                className="peer prism-focus-ring absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div
                aria-hidden="true"
                className="prism-thumb w-3.5 h-3.5 rounded-full pointer-events-none absolute -ml-[7px] transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                style={{ left: `${opacityTrackPct}%` }}
              />
            </div>

            <div
              role="group"
              aria-label="Opacity presets"
              className={cx(
                presetsClass,
                'inline-flex flex-wrap items-center gap-1 min-w-0 max-w-full'
              )}
            >
              {OPACITY_PRESETS.map((preset) => {
                const isActive = state.opacityPct === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={disabled}
                    aria-pressed={isActive}
                    data-preset={String(preset)}
                    data-testid={`window-utility-preset-${preset}`}
                    onClick={() => handleSelectPreset(preset)}
                    onKeyDown={(event) =>
                      handleControlKeyDown(event, () =>
                        handleSelectPreset(preset)
                      )
                    }
                    className={cx(
                      isActive ? 'prism-btn-primary' : 'prism-crystal',
                      'prism-focus-ring h-6 px-2 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed transition-opacity',
                      disabled ? 'opacity-50' : ''
                    )}
                    style={
                      isActive
                        ? undefined
                        : { color: 'var(--prism-text-primary)' }
                    }
                  >
                    {preset}%
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={disabled}
              data-control="reset"
              data-testid="window-utility-reset-btn"
              onClick={handleReset}
              onKeyDown={(event) => handleControlKeyDown(event, handleReset)}
              className={cx(
                'prism-crystal prism-focus-ring h-6 px-2 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed transition-opacity',
                disabled ? 'opacity-50' : ''
              )}
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Live Translucent Sample Window Body (collapses cleanly when shaded) */}
      {isBodyVisible ? (
        <div
          id={bodyId}
          data-part="body"
          data-testid="window-utility-body"
          data-pinned-ring={state.pinned ? 'true' : 'false'}
          className={cx(
            bodyClass,
            'p-4 flex flex-col gap-3 min-w-0 max-w-full transition-opacity duration-150'
          )}
          style={{
            opacity: state.opacityPct / 100,
            color: 'var(--prism-text-primary)',
            ...(state.pinned
              ? {
                  boxShadow:
                    'inset 0 0 0 1.5px color-mix(in srgb, var(--prism-primary-main) 46%, transparent)',
                }
              : {}),
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0 max-w-full">
            <div
              className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0 border"
              style={{
                borderColor: state.pinned
                  ? 'color-mix(in srgb, var(--prism-primary-main) 45%, var(--prism-divider))'
                  : 'var(--prism-divider)',
              }}
            >
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Window Layer
              </span>
              <span
                data-testid="window-utility-layer-value"
                className="text-xs font-semibold truncate"
                style={{
                  color: state.pinned
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-text-primary)',
                }}
              >
                {state.pinned ? 'Always-on-Top' : 'Standard Stack'}
              </span>
            </div>

            <div
              className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0 border"
              style={{ borderColor: 'var(--prism-divider)' }}
            >
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Surface Opacity
              </span>
              <span
                data-testid="window-utility-opacity-readout"
                className="font-mono text-xs font-semibold tabular-nums truncate"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {state.opacityPct}% · α {(state.opacityPct / 100).toFixed(2)}
              </span>
            </div>

            <div
              className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0 border"
              style={{ borderColor: 'var(--prism-divider)' }}
            >
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Shade State
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold truncate"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--prism-success-main)' }}
                />
                <span>Expanded Viewport</span>
              </span>
            </div>
          </div>

          <div
            className="prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0 border"
            style={{ borderColor: 'var(--prism-divider)' }}
          >
            <p
              className="text-xs leading-relaxed min-w-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Adjust translucency to inspect underlying workspace layers or roll
              up the window shade into a compact floating glass bar.
            </p>
            <span
              className="font-mono text-[11px] font-semibold tabular-nums shrink-0"
              style={{ color: 'var(--prism-secondary-dark)' }}
            >
              {state.pinned ? 'z-index: top' : 'z-index: auto'}
            </span>
          </div>
        </div>
      ) : null}

      {/* Polite Screen-Reader Status Announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="window-utility-status"
        className="sr-only"
      >
        {announcement}
      </div>
    </div>
  );
}

WindowUtilityControls.displayName = 'WindowUtilityControls';
