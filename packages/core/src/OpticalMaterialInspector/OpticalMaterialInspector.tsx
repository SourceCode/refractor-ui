'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type OpticalMaterialPreset =
  | 'frosted-quartz'
  | 'diamond-prism'
  | 'smoked-obsidian'
  | 'amber-lens';

export type OpticalMaterialTint = 'crystal' | 'primary' | 'secondary' | 'emerald' | 'amber';

export interface OpticalMaterialState {
  /** Backdrop blur radius in pixels (0..48). */
  blurPx: number;
  /** Optical index of refraction (1.0..2.5). */
  ior: number;
  /** Chromatic dispersion intensity percentage (0..100). */
  dispersion: number;
  /** Top-edge specular sheen intensity percentage (0..100). */
  specularPct: number;
  /** Optical surface tint token selection. */
  tint: OpticalMaterialTint;
}

type OpticalMaterialInspectorBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface OpticalMaterialInspectorProps extends OpticalMaterialInspectorBaseProps {
  /** Controlled optical material shader parameters. */
  value?: OpticalMaterialState;
  /** Initial optical material parameters in uncontrolled mode. */
  defaultValue?: OpticalMaterialState;
  /** Callback fired whenever blur, IOR, dispersion, specular intensity, tint, preset, or reset updates state. */
  onChange?: (state: OpticalMaterialState) => void;
  /** Header title and accessible region label (defaults to 'Optical Material & Shader Inspector'). */
  title?: string;
  /** Disables all presets, sliders, surface tint pills, reset button, and keyboard shortcuts. */
  disabled?: boolean;
}

interface OpticalPresetDefinition {
  id: OpticalMaterialPreset;
  label: string;
  shortcut: string;
  state: OpticalMaterialState;
}

interface OpticalTintDefinition {
  id: OpticalMaterialTint;
  label: string;
  coreToken: string;
  edgeToken: string;
  swatchToken: string;
}

const DEFAULT_TITLE = 'Optical Material & Shader Inspector';

const MIN_BLUR_PX = 0;
const MAX_BLUR_PX = 48;
const MIN_IOR = 1.0;
const MAX_IOR = 2.5;
const IOR_STEP = 0.01;
const MIN_PCT = 0;
const MAX_PCT = 100;

const INCIDENT_ANGLE_DEG = 42;
const INCIDENT_ANGLE_RAD = (INCIDENT_ANGLE_DEG * Math.PI) / 180;
const ENTRY_X = 120;
const ENTRY_Y = 52;
const INCIDENT_RAY_LEN = 54;
const REFRACTED_RAY_LEN = 126;

const DEFAULT_MATERIAL_STATE: OpticalMaterialState = {
  blurPx: 18,
  ior: 1.52,
  dispersion: 42,
  specularPct: 78,
  tint: 'crystal',
};

const OPTICAL_PRESETS: readonly [
  OpticalPresetDefinition,
  OpticalPresetDefinition,
  OpticalPresetDefinition,
  OpticalPresetDefinition,
] = [
  {
    id: 'frosted-quartz',
    label: 'Frosted Quartz',
    shortcut: '1',
    state: {
      blurPx: 28,
      ior: 1.54,
      dispersion: 22,
      specularPct: 62,
      tint: 'crystal',
    },
  },
  {
    id: 'diamond-prism',
    label: 'Diamond Prism',
    shortcut: '2',
    state: {
      blurPx: 4,
      ior: 2.42,
      dispersion: 94,
      specularPct: 96,
      tint: 'secondary',
    },
  },
  {
    id: 'smoked-obsidian',
    label: 'Smoked Obsidian',
    shortcut: '3',
    state: {
      blurPx: 34,
      ior: 1.49,
      dispersion: 16,
      specularPct: 84,
      tint: 'emerald',
    },
  },
  {
    id: 'amber-lens',
    label: 'Amber Lens',
    shortcut: '4',
    state: {
      blurPx: 12,
      ior: 1.66,
      dispersion: 64,
      specularPct: 88,
      tint: 'amber',
    },
  },
];

const CRYSTAL_TINT_META: OpticalTintDefinition = {
  id: 'crystal',
  label: 'Crystal',
  coreToken: 'var(--prism-crystal-mid)',
  edgeToken: 'var(--prism-secondary-light)',
  swatchToken: 'var(--prism-crystal-mid)',
};

const PRIMARY_TINT_META: OpticalTintDefinition = {
  id: 'primary',
  label: 'Tangerine',
  coreToken: 'var(--prism-primary-main)',
  edgeToken: 'var(--prism-primary-light)',
  swatchToken: 'var(--prism-primary-main)',
};

const SECONDARY_TINT_META: OpticalTintDefinition = {
  id: 'secondary',
  label: 'Sky',
  coreToken: 'var(--prism-secondary-main)',
  edgeToken: 'var(--prism-secondary-light)',
  swatchToken: 'var(--prism-secondary-main)',
};

const EMERALD_TINT_META: OpticalTintDefinition = {
  id: 'emerald',
  label: 'Emerald',
  coreToken: 'var(--prism-success-main)',
  edgeToken: 'var(--prism-success-light)',
  swatchToken: 'var(--prism-success-main)',
};

const AMBER_TINT_META: OpticalTintDefinition = {
  id: 'amber',
  label: 'Amber',
  coreToken: 'var(--prism-warning-main)',
  edgeToken: 'var(--prism-primary-light)',
  swatchToken: 'var(--prism-warning-main)',
};

const OPTICAL_TINTS: ReadonlyArray<OpticalTintDefinition> = [
  CRYSTAL_TINT_META,
  PRIMARY_TINT_META,
  SECONDARY_TINT_META,
  EMERALD_TINT_META,
  AMBER_TINT_META,
];

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100 + 0;
}

function normalizeTint(
  tint: OpticalMaterialTint,
  fallback: OpticalMaterialTint
): OpticalMaterialTint {
  switch (tint) {
    case 'crystal':
    case 'primary':
    case 'secondary':
    case 'emerald':
    case 'amber':
      return tint;
    default:
      return fallback;
  }
}

function getTintMeta(tint: OpticalMaterialTint): OpticalTintDefinition {
  switch (tint) {
    case 'crystal':
      return CRYSTAL_TINT_META;
    case 'primary':
      return PRIMARY_TINT_META;
    case 'secondary':
      return SECONDARY_TINT_META;
    case 'emerald':
      return EMERALD_TINT_META;
    case 'amber':
      return AMBER_TINT_META;
  }
}

function sanitizeMaterialState(
  raw: OpticalMaterialState,
  fallback: OpticalMaterialState
): OpticalMaterialState {
  return {
    blurPx: Math.round(clampNumber(raw.blurPx, MIN_BLUR_PX, MAX_BLUR_PX, fallback.blurPx)) + 0,
    ior: roundTwo(clampNumber(raw.ior, MIN_IOR, MAX_IOR, fallback.ior)),
    dispersion:
      Math.round(clampNumber(raw.dispersion, MIN_PCT, MAX_PCT, fallback.dispersion)) + 0,
    specularPct:
      Math.round(clampNumber(raw.specularPct, MIN_PCT, MAX_PCT, fallback.specularPct)) + 0,
    tint: normalizeTint(raw.tint, fallback.tint),
  };
}

function statesEqual(a: OpticalMaterialState, b: OpticalMaterialState): boolean {
  return (
    a.blurPx === b.blurPx &&
    a.ior === b.ior &&
    a.dispersion === b.dispersion &&
    a.specularPct === b.specularPct &&
    a.tint === b.tint
  );
}

function toPercent(value: number, min: number, max: number): number {
  return roundTwo(clampNumber(((value - min) / (max - min)) * 100, 0, 100, 0));
}

const headerClass = /*#__PURE__*/ stableClassName('optical-material-inspector', 'header');
const presetsClass = /*#__PURE__*/ stableClassName('optical-material-inspector', 'presets');
const workbenchClass = /*#__PURE__*/ stableClassName('optical-material-inspector', 'workbench');
const specimenClass = /*#__PURE__*/ stableClassName('optical-material-inspector', 'specimen');
const controlsClass = /*#__PURE__*/ stableClassName('optical-material-inspector', 'controls');
const tintsClass = /*#__PURE__*/ stableClassName('optical-material-inspector', 'tints');
const summaryClass = /*#__PURE__*/ stableClassName('optical-material-inspector', 'summary');

function OpticalMaterialInspectorInner({
  value,
  defaultValue = DEFAULT_MATERIAL_STATE,
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
}: OpticalMaterialInspectorProps) {
  const uid = useId();
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const blurFilterId = `optical-blur-${safeUid}`;
  const sphereGradId = `optical-sphere-${safeUid}`;
  const slabGradId = `optical-slab-${safeUid}`;
  const blurInputId = `optical-blur-input-${safeUid}`;
  const iorInputId = `optical-ior-input-${safeUid}`;
  const dispersionInputId = `optical-dispersion-input-${safeUid}`;
  const specularInputId = `optical-specular-input-${safeUid}`;

  const override = useComponentOverride('OpticalMaterialInspector');

  const safeDefaultValue = useMemo<OpticalMaterialState>(
    () => sanitizeMaterialState(defaultValue, DEFAULT_MATERIAL_STATE),
    [defaultValue]
  );

  const isControlled = value !== undefined;
  const [uncontrolledState, setUncontrolledState] =
    useState<OpticalMaterialState>(safeDefaultValue);

  const currentState = sanitizeMaterialState(
    isControlled ? value : uncontrolledState,
    safeDefaultValue
  );

  const activePreset = OPTICAL_PRESETS.find((preset) => statesEqual(preset.state, currentState));
  const isAtDefault = statesEqual(currentState, safeDefaultValue);
  const tintMeta = getTintMeta(currentState.tint);

  const commitState = useCallback(
    (nextRaw: OpticalMaterialState) => {
      if (disabled) return;
      const next = sanitizeMaterialState(nextRaw, currentState);
      if (statesEqual(next, currentState)) {
        return;
      }
      if (!isControlled) {
        setUncontrolledState(next);
      }
      onChange?.(next);
    },
    [currentState, disabled, isControlled, onChange]
  );

  const handleBlurChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      commitState({ ...currentState, blurPx: Number(event.target.value) });
    },
    [commitState, currentState]
  );

  const handleIorChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      commitState({ ...currentState, ior: Number(event.target.value) });
    },
    [commitState, currentState]
  );

  const handleDispersionChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      commitState({ ...currentState, dispersion: Number(event.target.value) });
    },
    [commitState, currentState]
  );

  const handleSpecularChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      commitState({ ...currentState, specularPct: Number(event.target.value) });
    },
    [commitState, currentState]
  );

  const handleReset = useCallback(() => {
    commitState(safeDefaultValue);
  }, [commitState, safeDefaultValue]);

  const handleInspectorKeyDown = useCallback(
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

      if (event.key === '1') {
        event.preventDefault();
        commitState(OPTICAL_PRESETS[0].state);
      } else if (event.key === '2') {
        event.preventDefault();
        commitState(OPTICAL_PRESETS[1].state);
      } else if (event.key === '3') {
        event.preventDefault();
        commitState(OPTICAL_PRESETS[2].state);
      } else if (event.key === '4') {
        event.preventDefault();
        commitState(OPTICAL_PRESETS[3].state);
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        commitState(safeDefaultValue);
      }
    },
    [commitState, disabled, safeDefaultValue]
  );

  const composedKeyDown = useMemo(
    () => composeEventHandlers(onKeyDown, handleInspectorKeyDown),
    [handleInspectorKeyDown, onKeyDown]
  );

  // Snell's Law Refraction Physics: n1 * sin(theta1) = n2 * sin(theta2), n1 = 1.0 (air)
  const sinRefracted = clampNumber(Math.sin(INCIDENT_ANGLE_RAD) / currentState.ior, 0, 1, 0);
  const refractedRad = Math.asin(sinRefracted);
  const refractedAngleDeg = roundTwo((refractedRad * 180) / Math.PI);

  const incidentStartX = roundTwo(ENTRY_X - INCIDENT_RAY_LEN * Math.sin(INCIDENT_ANGLE_RAD));
  const incidentStartY = roundTwo(ENTRY_Y - INCIDENT_RAY_LEN * Math.cos(INCIDENT_ANGLE_RAD));
  const refractedEndX = roundTwo(ENTRY_X + REFRACTED_RAY_LEN * Math.sin(refractedRad));
  const refractedEndY = roundTwo(ENTRY_Y + REFRACTED_RAY_LEN * Math.cos(refractedRad));

  // Chromatic dispersion split geometry (warm primary, mid emerald, cool secondary)
  const dispersionFactor = roundTwo(currentState.dispersion / 100);
  const dispersionSpreadRad = dispersionFactor * 0.16;
  const dispersionOpacity = roundTwo(dispersionFactor * 0.92);
  const warmAngleRad = refractedRad + dispersionSpreadRad;
  const coolAngleRad = Math.max(0.03, refractedRad - dispersionSpreadRad);
  const warmEndX = roundTwo(ENTRY_X + REFRACTED_RAY_LEN * Math.sin(warmAngleRad));
  const warmEndY = roundTwo(ENTRY_Y + REFRACTED_RAY_LEN * Math.cos(warmAngleRad));
  const coolEndX = roundTwo(ENTRY_X + REFRACTED_RAY_LEN * Math.sin(coolAngleRad));
  const coolEndY = roundTwo(ENTRY_Y + REFRACTED_RAY_LEN * Math.cos(coolAngleRad));

  // Blur & Specular optical parameters
  const svgBlurStdDev = roundTwo(currentState.blurPx * 0.25);
  const blurFactor = roundTwo(currentState.blurPx / MAX_BLUR_PX);
  const specularFactor = roundTwo(currentState.specularPct / 100);
  const slabMeniscusOpacity = roundTwo(specularFactor * 0.82);
  const sphereMeniscusOpacity = roundTwo(specularFactor * 0.92);
  const sphereCoreOpacity = roundTwo(0.42 + (1 - blurFactor) * 0.24);
  const sphereHighlightOpacity = roundTwo(0.2 + specularFactor * 0.56);

  // Normalized slider progress percentages
  const blurPct = toPercent(currentState.blurPx, MIN_BLUR_PX, MAX_BLUR_PX);
  const iorPct = toPercent(currentState.ior, MIN_IOR, MAX_IOR);
  const dispersionPct = toPercent(currentState.dispersion, MIN_PCT, MAX_PCT);
  const specularNormPct = toPercent(currentState.specularPct, MIN_PCT, MAX_PCT);

  const uniformSummary = `blur: ${currentState.blurPx}px · IOR: ${currentState.ior.toFixed(2)} · disp: ${currentState.dispersion}% · spec: ${currentState.specularPct}% · tint: ${currentState.tint}`;

  const merged = mergeProps({
    themeTarget: themeProps('optical-material-inspector', {
      disabled,
      preset: activePreset ? activePreset.id : 'custom',
      tint: currentState.tint,
    }),
    baseClassName:
      'prism-slab prism-focus-ring w-full max-w-full p-4 sm:p-5 space-y-4 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


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
      {/* Sculpted Prism Slab Header */}
      <div className={cx(headerClass, 'space-y-3 min-w-0 max-w-full')}>
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles
              aria-hidden="true"
              className="w-4 h-4 shrink-0"
              style={{
                color: disabled ? 'var(--prism-text-disabled)' : 'var(--prism-primary-main)',
              }}
            />
            <span
              data-testid="optical-inspector-title"
              className="text-sm font-semibold tracking-tight truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </span>
          </div>

          <button
            type="button"
            disabled={disabled || isAtDefault}
            aria-label="Reset optical material to defaults"
            data-testid="optical-reset-button"
            onClick={handleReset}
            className={cx(
              'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 cursor-pointer disabled:cursor-not-allowed',
              disabled || isAtDefault ? 'opacity-45' : ''
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Reset</span>
          </button>
        </div>

        {/* 4 Optical Material Preset Pills */}
        <div
          role="group"
          aria-label="Optical material presets"
          className={cx(presetsClass, 'flex flex-wrap items-center gap-1.5 max-w-full')}
        >
          {OPTICAL_PRESETS.map((preset) => {
            const isActive = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                aria-pressed={isActive}
                data-testid={`optical-preset-${preset.id}`}
                data-active={isActive ? 'true' : undefined}
                onClick={() => commitState(preset.state)}
                className={cx(
                  isActive ? 'prism-btn-primary' : 'prism-crystal',
                  'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed',
                  disabled ? 'opacity-50' : ''
                )}
                style={isActive ? undefined : STYLE_TEXT_PRIMARY}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive 2-Column Shader Workbench */}
      <div
        data-testid="optical-workbench"
        className={cx(
          workbenchClass,
          'grid grid-cols-1 md:grid-cols-[0.95fr_1.05fr] gap-4 items-center max-w-full min-w-0'
        )}
      >
        {/* Left: Live Optical Glass Shader Specimen */}
        <div
          data-testid="optical-specimen-well"
          data-tint={currentState.tint}
          data-ior={currentState.ior.toFixed(2)}
          data-blur={String(currentState.blurPx)}
          data-dispersion={String(currentState.dispersion)}
          data-specular={String(currentState.specularPct)}
          className={cx(
            specimenClass,
            'prism-well rounded-2xl p-4 relative overflow-hidden min-w-0 max-w-full space-y-3',
            disabled ? 'opacity-50' : ''
          )}
        >
          {/* Top-Edge Meniscus Sheen Hairline */}
          <div
            aria-hidden="true"
            data-testid="optical-specimen-sheen"
            className="pointer-events-none absolute inset-x-4 top-0 h-1 rounded-full"
            style={{
              opacity: specularFactor,
              backgroundImage:
                'linear-gradient(90deg, transparent 0%, var(--prism-primary-contrast) 50%, transparent 100%)',
            }}
          />

          {/* Interactive SVG Refractive Sphere & Slab Preview */}
          <svg
            viewBox="0 0 240 200"
            className="w-full h-auto max-w-[260px] mx-auto block prism-contain-box"
            aria-hidden="true"
            data-testid="optical-specimen-svg"
          >
            <defs>
              <filter id={blurFilterId} x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur
                  data-testid="optical-specimen-blur"
                  stdDeviation={svgBlurStdDev}
                />
              </filter>

              <linearGradient id={slabGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--prism-slab-top)" stopOpacity={0.82} />
                <stop offset="52%" stopColor={tintMeta.edgeToken} stopOpacity={0.28} />
                <stop offset="100%" stopColor={tintMeta.coreToken} stopOpacity={0.38} />
              </linearGradient>

              <radialGradient id={sphereGradId} cx="36%" cy="28%" r="72%">
                <stop
                  data-testid="optical-sphere-stop-highlight"
                  offset="0%"
                  stopColor="var(--prism-primary-contrast)"
                  stopOpacity={sphereHighlightOpacity}
                />
                <stop
                  data-testid="optical-sphere-stop-edge"
                  offset="44%"
                  stopColor={tintMeta.edgeToken}
                  stopOpacity={0.34}
                />
                <stop
                  data-testid="optical-sphere-stop-core"
                  offset="100%"
                  stopColor={tintMeta.coreToken}
                  stopOpacity={sphereCoreOpacity}
                />
              </radialGradient>
            </defs>

            {/* Calibrated Optical Backdrop Subject (Blurs Dynamically via blurPx) */}
            <g data-testid="optical-specimen-backdrop" filter={`url(#${blurFilterId})`}>
              <rect
                x={46}
                y={64}
                width={148}
                height={18}
                rx={9}
                fill={tintMeta.coreToken}
                fillOpacity={0.32}
              />
              <rect
                x={62}
                y={104}
                width={116}
                height={18}
                rx={9}
                fill="var(--prism-secondary-main)"
                fillOpacity={0.28}
              />
              <circle
                cx={86}
                cy={92}
                r={18}
                fill="var(--prism-primary-main)"
                fillOpacity={0.34}
              />
              <circle
                cx={154}
                cy={118}
                r={20}
                fill="var(--prism-success-main)"
                fillOpacity={0.3}
              />
            </g>

            {/* Refractive Optical Glass Slab */}
            <rect
              data-testid="optical-specimen-slab"
              x={28}
              y={32}
              width={184}
              height={136}
              rx={22}
              fill={`url(#${slabGradId})`}
              stroke="var(--prism-well-border)"
              strokeWidth={1.5}
            />

            {/* Slab Top-Edge Meniscus Specular Sheen */}
            <rect
              data-testid="optical-slab-meniscus"
              x={44}
              y={35}
              width={152}
              height={6}
              rx={3}
              fill="var(--prism-primary-contrast)"
              fillOpacity={slabMeniscusOpacity}
            />

            {/* Surface Normal Reference Axis */}
            <line
              data-testid="optical-snell-normal"
              x1={ENTRY_X}
              y1={14}
              x2={ENTRY_X}
              y2={186}
              stroke="var(--prism-text-disabled)"
              strokeWidth={1}
              strokeOpacity={0.55}
              strokeDasharray="3 3"
            />

            {/* Chromatic Dispersion Split Bands (--prism-primary-main, --prism-success-main, --prism-secondary-main) */}
            <line
              data-testid="optical-dispersion-warm"
              x1={ENTRY_X}
              y1={ENTRY_Y}
              x2={warmEndX}
              y2={warmEndY}
              stroke="var(--prism-primary-main)"
              strokeWidth={3.25}
              strokeOpacity={dispersionOpacity}
              strokeLinecap="round"
            />
            <line
              data-testid="optical-dispersion-mid"
              x1={ENTRY_X}
              y1={ENTRY_Y}
              x2={refractedEndX}
              y2={refractedEndY}
              stroke="var(--prism-success-main)"
              strokeWidth={2.5}
              strokeOpacity={dispersionOpacity}
              strokeLinecap="round"
            />
            <line
              data-testid="optical-dispersion-cool"
              x1={ENTRY_X}
              y1={ENTRY_Y}
              x2={coolEndX}
              y2={coolEndY}
              stroke="var(--prism-secondary-main)"
              strokeWidth={3.25}
              strokeOpacity={dispersionOpacity}
              strokeLinecap="round"
            />

            {/* Refractive Glass Sphere */}
            <circle
              data-testid="optical-specimen-sphere"
              cx={120}
              cy={102}
              r={48}
              fill={`url(#${sphereGradId})`}
              stroke={tintMeta.coreToken}
              strokeWidth={1.5}
              strokeOpacity={0.55}
            />

            {/* Prismatic Caustic Rim Arcs on Sphere */}
            <path
              data-testid="optical-caustic-warm"
              d="M 156 124 A 44 44 0 0 1 124 146"
              fill="none"
              stroke="var(--prism-primary-main)"
              strokeWidth={2.5}
              strokeOpacity={dispersionOpacity}
              strokeLinecap="round"
            />
            <path
              data-testid="optical-caustic-mid"
              d="M 150 132 A 44 44 0 0 1 116 146"
              fill="none"
              stroke="var(--prism-success-main)"
              strokeWidth={2}
              strokeOpacity={dispersionOpacity}
              strokeLinecap="round"
            />
            <path
              data-testid="optical-caustic-cool"
              d="M 142 138 A 44 44 0 0 1 106 144"
              fill="none"
              stroke="var(--prism-secondary-main)"
              strokeWidth={2.5}
              strokeOpacity={dispersionOpacity}
              strokeLinecap="round"
            />

            {/* Sphere Top-Edge Meniscus Highlight */}
            <path
              data-testid="optical-sphere-meniscus"
              d="M 88 78 A 38 38 0 0 1 144 70"
              fill="none"
              stroke="var(--prism-primary-contrast)"
              strokeWidth={4.5}
              strokeOpacity={sphereMeniscusOpacity}
              strokeLinecap="round"
            />

            {/* Snell's Law Incident & Refracted Core Ray Indicator */}
            <line
              data-testid="optical-snell-incident"
              x1={incidentStartX}
              y1={incidentStartY}
              x2={ENTRY_X}
              y2={ENTRY_Y}
              stroke="var(--prism-text-primary)"
              strokeWidth={1.75}
              strokeLinecap="round"
            />
            <line
              data-testid="optical-snell-refracted"
              x1={ENTRY_X}
              y1={ENTRY_Y}
              x2={refractedEndX}
              y2={refractedEndY}
              stroke="var(--prism-text-primary)"
              strokeWidth={1.5}
              strokeOpacity={0.75}
              strokeLinecap="round"
            />
            <circle
              cx={ENTRY_X}
              cy={ENTRY_Y}
              r={3.5}
              fill="var(--prism-primary-main)"
              stroke="var(--prism-primary-contrast)"
              strokeWidth={1.25}
            />
          </svg>

          {/* Live Frosted Snell Telemetry Pill Bar */}
          <div
            data-testid="optical-specimen-lens-bar"
            className="prism-crystal rounded-xl px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tabular-nums"
            style={{
              backdropFilter: `blur(${currentState.blurPx}px)`,
              color: 'var(--prism-text-primary)',
            }}
          >
            <span data-testid="optical-snell-readout">
              Snell {INCIDENT_ANGLE_DEG}° → {refractedAngleDeg.toFixed(1)}°
            </span>
            <span
              data-testid="optical-tint-badge"
              style={STYLE_TEXT_SECONDARY}
            >
              {tintMeta.label} · n={currentState.ior.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right: Precision Optical Sliders & Surface Tint Pills */}
        <div className={cx(controlsClass, 'min-w-0 max-w-full space-y-3')}>
          {/* Blur Radius (px) */}
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={blurInputId}
                className="text-xs font-semibold tracking-tight"
                style={STYLE_TEXT_SECONDARY}
              >
                Blur Radius (px)
              </label>
              <span
                data-testid="optical-blur-pill"
                className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums min-w-[3.25rem] text-center"
                style={STYLE_TEXT_PRIMARY}
              >
                {currentState.blurPx}px
              </span>
            </div>

            <div className={cx('relative h-7 flex items-center', disabled ? 'opacity-50' : '')}>
              <div className="prism-well w-full h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  data-testid="optical-blur-fill"
                  className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                  style={{
                    width: `${blurPct}%`,
                    backgroundColor: 'var(--prism-secondary-main)',
                  }}
                />
              </div>
              <input
                id={blurInputId}
                type="range"
                min={MIN_BLUR_PX}
                max={MAX_BLUR_PX}
                step={1}
                value={currentState.blurPx}
                disabled={disabled}
                aria-label="Blur Radius (px)"
                aria-valuetext={`${currentState.blurPx} pixels`}
                onChange={handleBlurChange}
                className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div
                aria-hidden="true"
                className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                style={{ left: `${blurPct}%` }}
              />
            </div>
          </div>

          {/* Index of Refraction (IOR 1.00–2.50) */}
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={iorInputId}
                className="text-xs font-semibold tracking-tight"
                style={STYLE_TEXT_SECONDARY}
              >
                Index of Refraction (IOR 1.00–2.50)
              </label>
              <span
                data-testid="optical-ior-pill"
                className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums min-w-[3.25rem] text-center"
                style={STYLE_TEXT_PRIMARY}
              >
                {currentState.ior.toFixed(2)}
              </span>
            </div>

            <div className={cx('relative h-7 flex items-center', disabled ? 'opacity-50' : '')}>
              <div className="prism-well w-full h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  data-testid="optical-ior-fill"
                  className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                  style={{
                    width: `${iorPct}%`,
                    backgroundColor: 'var(--prism-primary-main)',
                  }}
                />
              </div>
              <input
                id={iorInputId}
                type="range"
                min={MIN_IOR}
                max={MAX_IOR}
                step={IOR_STEP}
                value={currentState.ior}
                disabled={disabled}
                aria-label="Index of Refraction (IOR 1.00–2.50)"
                aria-valuetext={`IOR ${currentState.ior.toFixed(2)}`}
                onChange={handleIorChange}
                className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div
                aria-hidden="true"
                className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                style={{ left: `${iorPct}%` }}
              />
            </div>
          </div>

          {/* Chromatic Dispersion (%) */}
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={dispersionInputId}
                className="text-xs font-semibold tracking-tight"
                style={STYLE_TEXT_SECONDARY}
              >
                Chromatic Dispersion (%)
              </label>
              <span
                data-testid="optical-dispersion-pill"
                className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums min-w-[3.25rem] text-center"
                style={STYLE_TEXT_PRIMARY}
              >
                {currentState.dispersion}%
              </span>
            </div>

            <div className={cx('relative h-7 flex items-center', disabled ? 'opacity-50' : '')}>
              <div className="prism-well w-full h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  data-testid="optical-dispersion-fill"
                  className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                  style={{
                    width: `${dispersionPct}%`,
                    backgroundColor: 'var(--prism-success-main)',
                  }}
                />
              </div>
              <input
                id={dispersionInputId}
                type="range"
                min={MIN_PCT}
                max={MAX_PCT}
                step={1}
                value={currentState.dispersion}
                disabled={disabled}
                aria-label="Chromatic Dispersion (%)"
                aria-valuetext={`${currentState.dispersion} percent`}
                onChange={handleDispersionChange}
                className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div
                aria-hidden="true"
                className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                style={{ left: `${dispersionPct}%` }}
              />
            </div>
          </div>

          {/* Specular Intensity (%) */}
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={specularInputId}
                className="text-xs font-semibold tracking-tight"
                style={STYLE_TEXT_SECONDARY}
              >
                Specular Intensity (%)
              </label>
              <span
                data-testid="optical-specular-pill"
                className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums min-w-[3.25rem] text-center"
                style={STYLE_TEXT_PRIMARY}
              >
                {currentState.specularPct}%
              </span>
            </div>

            <div className={cx('relative h-7 flex items-center', disabled ? 'opacity-50' : '')}>
              <div className="prism-well w-full h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  data-testid="optical-specular-fill"
                  className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                  style={{
                    width: `${specularNormPct}%`,
                    backgroundColor: 'var(--prism-warning-main)',
                  }}
                />
              </div>
              <input
                id={specularInputId}
                type="range"
                min={MIN_PCT}
                max={MAX_PCT}
                step={1}
                value={currentState.specularPct}
                disabled={disabled}
                aria-label="Specular Intensity (%)"
                aria-valuetext={`${currentState.specularPct} percent`}
                onChange={handleSpecularChange}
                className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div
                aria-hidden="true"
                className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                style={{ left: `${specularNormPct}%` }}
              />
            </div>
          </div>

          {/* Surface Tint Selector Pills */}
          <div className="space-y-1.5 pt-1 min-w-0">
            <span
              className="block text-xs font-semibold tracking-tight"
              style={STYLE_TEXT_SECONDARY}
            >
              Surface Tint
            </span>

            <div
              role="group"
              aria-label="Surface tint"
              className={cx(tintsClass, 'flex flex-wrap items-center gap-1.5 max-w-full')}
            >
              {OPTICAL_TINTS.map((tintOption) => {
                const isSelected = currentState.tint === tintOption.id;
                return (
                  <button
                    key={tintOption.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={isSelected}
                    data-testid={`optical-tint-${tintOption.id}`}
                    data-active={isSelected ? 'true' : undefined}
                    onClick={() => commitState({ ...currentState, tint: tintOption.id })}
                    className={cx(
                      isSelected ? 'prism-btn-primary' : 'prism-crystal',
                      'prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed',
                      disabled ? 'opacity-50' : ''
                    )}
                    style={isSelected ? undefined : STYLE_TEXT_PRIMARY}
                  >
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full shrink-0 border"
                      style={{
                        backgroundColor: tintOption.swatchToken,
                        borderColor: 'var(--prism-well-border)',
                      }}
                    />
                    <span>{tintOption.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recessed Live Shader Uniform Summary */}
      <div
        className={cx(
          summaryClass,
          'prism-well rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 max-w-full'
        )}
      >
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="optical-material-readout"
          className="font-mono text-xs font-medium tabular-nums min-w-0 break-words"
          style={STYLE_TEXT_PRIMARY}
        >
          {uniformSummary}
        </div>

        <span
          data-testid="optical-preset-status"
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

export const OpticalMaterialInspector = /*#__PURE__*/ memoWithDisplayName(OpticalMaterialInspectorInner, 'OpticalMaterialInspector');
