'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ChevronDown,
  Frame,
  Grid3x3,
  Monitor,
  Ratio,
  Scan,
  SquareDashed,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type CanvasZoomPreset = 'fit' | 50 | 100 | 200;

export type AspectMaskPreset = 'none' | '16:9' | '2.39:1' | '9:16' | '1:1';

export interface SafeAreaGuidesState {
  zoom: CanvasZoomPreset;
  ruleOfThirds: boolean;
  titleSafe: boolean;
  actionSafe: boolean;
  aspectMask: AspectMaskPreset;
}

type CanvasZoomSafeAreaBarBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface CanvasZoomSafeAreaBarProps extends CanvasZoomSafeAreaBarBaseProps {
  /** Controlled zoom level, guide visibility flags, and aspect mask state. */
  value?: SafeAreaGuidesState;
  /** Initial zoom, guide toggles, and aspect mask preset in uncontrolled mode. */
  defaultValue?: Partial<SafeAreaGuidesState>;
  /** Callback fired whenever zoom preset, guide overlay visibility, or aspect mask changes. */
  onChange?: (state: SafeAreaGuidesState) => void;
  /** Technical canvas telemetry label displayed in the header and live status bar. */
  canvasLabel?: string;
  /** Optional preview media rendered inside the scaled viewport stage; renders a rich optical frame if omitted. */
  children?: ReactNode;
  /** Disables zoom controls, keyboard shortcuts, guide toggles, and aspect ratio mask selection. */
  disabled?: boolean;
}

interface ZoomPresetSpec {
  id: CanvasZoomPreset;
  label: string;
}

interface AspectMaskSpec {
  id: AspectMaskPreset;
  label: string;
  letterboxPct: number;
  pillarboxPct: number;
}

interface ColorCalibrationSwatch {
  id: string;
  x: number;
  colorVar: string;
}

const DEFAULT_SAFE_AREA_STATE: SafeAreaGuidesState = {
  zoom: 'fit',
  ruleOfThirds: true,
  titleSafe: true,
  actionSafe: true,
  aspectMask: '2.39:1',
};

const ZOOM_PRESETS: ReadonlyArray<ZoomPresetSpec> = [
  { id: 'fit', label: 'Fit' },
  { id: 50, label: '50%' },
  { id: 100, label: '100%' },
  { id: 200, label: '200%' },
];

const MASK_NONE: AspectMaskSpec = {
  id: 'none',
  label: 'Off',
  letterboxPct: 0,
  pillarboxPct: 0,
};
const MASK_16_9: AspectMaskSpec = {
  id: '16:9',
  label: '16:9 HD',
  letterboxPct: 0,
  pillarboxPct: 0,
};
const MASK_2_39: AspectMaskSpec = {
  id: '2.39:1',
  label: '2.39:1 Scope',
  letterboxPct: 12.81,
  pillarboxPct: 0,
};
const MASK_9_16: AspectMaskSpec = {
  id: '9:16',
  label: '9:16 Vertical',
  letterboxPct: 0,
  pillarboxPct: 34.18,
};
const MASK_1_1: AspectMaskSpec = {
  id: '1:1',
  label: '1:1 Square',
  letterboxPct: 0,
  pillarboxPct: 21.88,
};

const ASPECT_MASK_SPECS: ReadonlyArray<AspectMaskSpec> = [
  MASK_NONE,
  MASK_16_9,
  MASK_2_39,
  MASK_9_16,
  MASK_1_1,
];

const CALIBRATION_SWATCHES: ReadonlyArray<ColorCalibrationSwatch> = [
  { id: 'cal-info', x: 0, colorVar: 'var(--prism-info-main)' },
  { id: 'cal-secondary', x: 20, colorVar: 'var(--prism-secondary-main)' },
  { id: 'cal-success', x: 40, colorVar: 'var(--prism-success-main)' },
  { id: 'cal-warning', x: 60, colorVar: 'var(--prism-warning-main)' },
  { id: 'cal-primary', x: 80, colorVar: 'var(--prism-primary-main)' },
];

function normalizeZoomPreset(zoom: CanvasZoomPreset | undefined): CanvasZoomPreset {
  if (zoom === 'fit' || zoom === 50 || zoom === 100 || zoom === 200) {
    return zoom;
  }
  return DEFAULT_SAFE_AREA_STATE.zoom;
}

function normalizeAspectMask(mask: AspectMaskPreset | undefined): AspectMaskPreset {
  if (
    mask === 'none' ||
    mask === '16:9' ||
    mask === '2.39:1' ||
    mask === '9:16' ||
    mask === '1:1'
  ) {
    return mask;
  }
  return DEFAULT_SAFE_AREA_STATE.aspectMask;
}

function parseAspectMaskOption(raw: string): AspectMaskPreset | null {
  if (
    raw === 'none' ||
    raw === '16:9' ||
    raw === '2.39:1' ||
    raw === '9:16' ||
    raw === '1:1'
  ) {
    return raw;
  }
  return null;
}

function resolveState(partial?: Partial<SafeAreaGuidesState>): SafeAreaGuidesState {
  return {
    zoom: normalizeZoomPreset(partial?.zoom),
    ruleOfThirds:
      typeof partial?.ruleOfThirds === 'boolean'
        ? partial.ruleOfThirds
        : DEFAULT_SAFE_AREA_STATE.ruleOfThirds,
    titleSafe:
      typeof partial?.titleSafe === 'boolean'
        ? partial.titleSafe
        : DEFAULT_SAFE_AREA_STATE.titleSafe,
    actionSafe:
      typeof partial?.actionSafe === 'boolean'
        ? partial.actionSafe
        : DEFAULT_SAFE_AREA_STATE.actionSafe,
    aspectMask: normalizeAspectMask(partial?.aspectMask),
  };
}

function getZoomScale(zoom: CanvasZoomPreset): number {
  switch (zoom) {
    case 50:
      return 0.5;
    case 200:
      return 2;
    case 'fit':
    case 100:
      return 1;
  }
}

function formatZoomLabel(zoom: CanvasZoomPreset): string {
  return zoom === 'fit' ? 'Fit' : `${zoom}%`;
}

function getAspectMaskSpec(mask: AspectMaskPreset): AspectMaskSpec {
  switch (mask) {
    case '16:9':
      return MASK_16_9;
    case '2.39:1':
      return MASK_2_39;
    case '9:16':
      return MASK_9_16;
    case '1:1':
      return MASK_1_1;
    case 'none':
      return MASK_NONE;
  }
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA';
}

interface DefaultOpticalCanvasFrameProps {
  gradientPrefix: string;
}

function DefaultOpticalCanvasFrame({ gradientPrefix }: DefaultOpticalCanvasFrameProps) {
  const skyGradId = `${gradientPrefix}-sky`;
  const warmGlowId = `${gradientPrefix}-warm`;
  const coolGlowId = `${gradientPrefix}-cool`;
  const ridgeGradId = `${gradientPrefix}-ridge`;

  return (
    <div
      data-testid="canvas-default-frame"
      className="prism-studio-surface relative w-full h-full overflow-hidden border"
      style={{ borderColor: 'var(--prism-divider)' }}
    >
      <svg
        viewBox="0 0 640 360"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="w-full h-full block pointer-events-none"
      >
        <defs>
          <linearGradient id={skyGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--prism-bg-start)" stopOpacity="0.92" />
            <stop offset="50%" stopColor="var(--prism-bg-mid)" stopOpacity="0.96" />
            <stop offset="100%" stopColor="var(--prism-bg-end)" stopOpacity="0.98" />
          </linearGradient>

          <radialGradient id={warmGlowId} cx="70%" cy="32%" r="44%">
            <stop offset="0%" stopColor="var(--prism-primary-light)" stopOpacity="0.62" />
            <stop offset="52%" stopColor="var(--prism-primary-main)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--prism-primary-main)" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={coolGlowId} cx="28%" cy="68%" r="48%">
            <stop offset="0%" stopColor="var(--prism-secondary-main)" stopOpacity="0.48" />
            <stop offset="55%" stopColor="var(--prism-info-main)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--prism-info-dark)" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={ridgeGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--prism-info-main)" stopOpacity="0.42" />
            <stop offset="100%" stopColor="var(--prism-info-dark)" stopOpacity="0.72" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="640" height="360" fill={`url(#${skyGradId})`} />
        <rect x="0" y="0" width="640" height="360" fill={`url(#${warmGlowId})`} />
        <rect x="0" y="0" width="640" height="360" fill={`url(#${coolGlowId})`} />

        {/* Luminous cinema horizon & silhouette ridges */}
        <circle
          cx="448"
          cy="118"
          r="46"
          fill="var(--prism-primary-light)"
          fillOpacity="0.74"
        />
        <circle
          cx="448"
          cy="118"
          r="72"
          fill="none"
          stroke="var(--prism-secondary-light)"
          strokeOpacity="0.52"
          strokeWidth="1.5"
        />

        <path
          d="M0 246 L116 168 L224 218 L346 138 L468 214 L562 172 L640 216 L640 360 L0 360 Z"
          fill={`url(#${ridgeGradId})`}
        />
        <path
          d="M0 286 L154 224 L292 272 L428 206 L552 254 L640 230 L640 360 L0 360 Z"
          fill="var(--prism-primary-dark)"
          fillOpacity="0.34"
        />

        {/* Central optical prism crystal subject */}
        <polygon
          points="320,96 378,180 320,264 262,180"
          fill="var(--prism-secondary-main)"
          fillOpacity="0.22"
          stroke="var(--prism-text-primary)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />

        {/* Optical center crosshair mark */}
        <g stroke="var(--prism-text-secondary)" strokeOpacity="0.45" strokeWidth="1">
          <line x1="306" y1="180" x2="334" y2="180" />
          <line x1="320" y1="166" x2="320" y2="194" />
        </g>

        {/* Reference calibration swatch strip */}
        <g transform="translate(20, 326)">
          {CALIBRATION_SWATCHES.map((swatch) => (
            <rect
              key={swatch.id}
              x={swatch.x}
              y="0"
              width="16"
              height="9"
              rx="3"
              fill={swatch.colorVar}
              fillOpacity="0.88"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

export function CanvasZoomSafeAreaBar({
  value,
  defaultValue,
  onChange,
  canvasLabel = '3840 × 2160 · Rec.709',
  children,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CanvasZoomSafeAreaBarProps) {
  const headingId = useId();
  const gradientPrefix = useId();
  const override = useComponentOverride('CanvasZoomSafeAreaBar');

  const initialState = useMemo<SafeAreaGuidesState>(
    () => resolveState(defaultValue),
    [defaultValue]
  );

  const [uncontrolledState, setUncontrolledState] = useState<SafeAreaGuidesState>(initialState);
  const isControlled = value !== undefined;

  const activeState = useMemo<SafeAreaGuidesState>(
    () => (isControlled ? resolveState(value) : uncontrolledState),
    [isControlled, uncontrolledState, value]
  );

  const commitState = useCallback(
    (next: SafeAreaGuidesState) => {
      const sanitized = resolveState(next);
      if (!isControlled) {
        setUncontrolledState(sanitized);
      }
      onChange?.(sanitized);
    },
    [isControlled, onChange]
  );

  const handleSelectZoom = useCallback(
    (nextZoom: CanvasZoomPreset) => {
      if (nextZoom === activeState.zoom) return;
      commitState({ ...activeState, zoom: nextZoom });
    },
    [activeState, commitState]
  );

  const handleToggleGuide = useCallback(
    (guide: 'ruleOfThirds' | 'titleSafe' | 'actionSafe') => {
      if (guide === 'ruleOfThirds') {
        commitState({ ...activeState, ruleOfThirds: !activeState.ruleOfThirds });
        return;
      }
      if (guide === 'titleSafe') {
        commitState({ ...activeState, titleSafe: !activeState.titleSafe });
        return;
      }
      commitState({ ...activeState, actionSafe: !activeState.actionSafe });
    },
    [activeState, commitState]
  );

  const handleAspectMaskChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (disabled) return;
      const parsed = parseAspectMaskOption(event.target.value);
      if (parsed === null || parsed === activeState.aspectMask) return;
      commitState({ ...activeState, aspectMask: parsed });
    },
    [activeState, commitState, disabled]
  );

  const handleBarKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (
        disabled ||
        event.nativeEvent.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableKeyboardTarget(event.target)
      ) {
        return;
      }

      if (event.key === '0') {
        event.preventDefault();
        handleSelectZoom('fit');
      } else if (event.key === '1') {
        event.preventDefault();
        handleSelectZoom(100);
      } else if (event.key === '2') {
        event.preventDefault();
        handleSelectZoom(200);
      }
    },
    [disabled, handleSelectZoom]
  );

  const zoomScale = getZoomScale(activeState.zoom);
  const zoomLabel = formatZoomLabel(activeState.zoom);
  const maskSpec = getAspectMaskSpec(activeState.aspectMask);
  const enabledGuideCount =
    (activeState.ruleOfThirds ? 1 : 0) +
    (activeState.titleSafe ? 1 : 0) +
    (activeState.actionSafe ? 1 : 0);

  const merged = mergeProps({
    themeTarget: themeProps('canvas-zoom-safe-area-bar', {
      zoom: String(activeState.zoom),
      aspectMask: activeState.aspectMask,
      ruleOfThirds: activeState.ruleOfThirds,
      titleSafe: activeState.titleSafe,
      actionSafe: activeState.actionSafe,
      disabled,
    }),
    baseClassName:
      'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 flex flex-col gap-3.5 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('canvas-zoom-safe-area-bar', 'header');
  const viewportClass = stableClassName('canvas-zoom-safe-area-bar', 'viewport');
  const stageClass = stableClassName('canvas-zoom-safe-area-bar', 'stage');
  const toolbarClass = stableClassName('canvas-zoom-safe-area-bar', 'toolbar');
  const statusClass = stableClassName('canvas-zoom-safe-area-bar', 'status');

  const hasCustomChildren = children !== undefined && children !== null;

  const matteStyle = {
    backgroundColor: 'color-mix(in srgb, var(--prism-bg-end) 82%, transparent)',
    backdropFilter: 'blur(3px)',
  };

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      {/* Sculpted Optical Header */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <Monitor className="w-3.5 h-3.5 shrink-0" />
          </span>
          <span
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate max-w-full"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            Canvas Zoom &amp; Safe Area
          </span>
        </div>

        <span
          data-testid="canvas-header-label"
          className="prism-well px-2.5 py-1 rounded-full font-mono text-[11px] font-medium tracking-tight truncate max-w-full"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          {canvasLabel}
        </span>
      </div>

      {/* Live Preview Viewport + Broadcast Guides */}
      <div
        data-testid="canvas-viewport"
        className={cx(
          viewportClass,
          'prism-well rounded-2xl relative overflow-hidden aspect-video w-full max-w-full',
          disabled ? 'opacity-75' : ''
        )}
      >
        {/* Scaled Inner Media Stage */}
        <div
          data-testid="canvas-media-stage"
          data-zoom={String(activeState.zoom)}
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'center center',
          }}
          className={cx(
            stageClass,
            'absolute inset-0 w-full h-full transition-transform duration-200 ease-out will-change-transform'
          )}
        >
          {hasCustomChildren ? (
            <div data-testid="canvas-custom-media" className="w-full h-full">
              {children}
            </div>
          ) : (
            <DefaultOpticalCanvasFrame gradientPrefix={gradientPrefix} />
          )}
        </div>

        {/* Aspect Mask Letterbox / Pillarbox Matte Overlay */}
        {activeState.aspectMask !== 'none' ? (
          <div
            aria-hidden="true"
            data-testid="guide-aspect-mask"
            data-mask-preset={activeState.aspectMask}
            className="absolute inset-0 pointer-events-none z-10"
          >
            {maskSpec.letterboxPct > 0 ? (
              <>
                <div
                  data-testid="aspect-mask-top"
                  className="absolute left-0 right-0 top-0 border-b"
                  style={{
                    ...matteStyle,
                    height: `${maskSpec.letterboxPct}%`,
                    borderColor: 'var(--prism-divider)',
                  }}
                />
                <div
                  data-testid="aspect-mask-bottom"
                  className="absolute left-0 right-0 bottom-0 border-t"
                  style={{
                    ...matteStyle,
                    height: `${maskSpec.letterboxPct}%`,
                    borderColor: 'var(--prism-divider)',
                  }}
                />
              </>
            ) : null}

            {maskSpec.pillarboxPct > 0 ? (
              <>
                <div
                  data-testid="aspect-mask-left"
                  className="absolute top-0 bottom-0 left-0 border-r"
                  style={{
                    ...matteStyle,
                    width: `${maskSpec.pillarboxPct}%`,
                    borderColor: 'var(--prism-divider)',
                  }}
                />
                <div
                  data-testid="aspect-mask-right"
                  className="absolute top-0 bottom-0 right-0 border-l"
                  style={{
                    ...matteStyle,
                    width: `${maskSpec.pillarboxPct}%`,
                    borderColor: 'var(--prism-divider)',
                  }}
                />
              </>
            ) : null}

            {maskSpec.letterboxPct === 0 && maskSpec.pillarboxPct === 0 ? (
              <div
                data-testid="aspect-mask-frame"
                className="absolute inset-0 border-2 border-dashed"
                style={{
                  borderColor: 'color-mix(in srgb, var(--prism-text-secondary) 55%, transparent)',
                }}
              />
            ) : null}

            <span
              data-testid="aspect-mask-badge"
              className="prism-crystal absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold tracking-tight"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {maskSpec.label}
            </span>
          </div>
        ) : null}

        {/* Rule-of-Thirds 3×3 Dashed SVG Guide Lines */}
        {activeState.ruleOfThirds ? (
          <svg
            data-testid="guide-rule-of-thirds"
            viewBox="0 0 640 360"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          >
            <g
              stroke="var(--prism-text-secondary)"
              strokeWidth="1.25"
              strokeDasharray="6 4"
              strokeOpacity="0.7"
            >
              <line x1="213.33" y1="0" x2="213.33" y2="360" />
              <line x1="426.67" y1="0" x2="426.67" y2="360" />
              <line x1="0" y1="120" x2="640" y2="120" />
              <line x1="0" y1="240" x2="640" y2="240" />
            </g>
            <g
              fill="none"
              stroke="var(--prism-text-secondary)"
              strokeWidth="1.25"
              strokeOpacity="0.8"
            >
              <circle cx="213.33" cy="120" r="4" />
              <circle cx="426.67" cy="120" r="4" />
              <circle cx="213.33" cy="240" r="4" />
              <circle cx="426.67" cy="240" r="4" />
            </g>
          </svg>
        ) : null}

        {/* Action-Safe (90%) Outer Dashed Broadcast Guide */}
        {activeState.actionSafe ? (
          <div
            aria-hidden="true"
            data-testid="guide-action-safe"
            className="absolute pointer-events-none z-20 rounded-sm"
            style={{
              inset: '5%',
              border: '1.5px dashed var(--prism-info-main)',
            }}
          >
            <span
              className="absolute top-1 left-1.5 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold tracking-wider uppercase border"
              style={{
                color: 'var(--prism-info-main)',
                borderColor: 'var(--prism-info-main)',
                backgroundColor: 'color-mix(in srgb, var(--prism-bg-start) 86%, transparent)',
              }}
            >
              Action Safe 90%
            </span>
          </div>
        ) : null}

        {/* Title-Safe (80%) Inner Dashed Broadcast Guide */}
        {activeState.titleSafe ? (
          <div
            aria-hidden="true"
            data-testid="guide-title-safe"
            className="absolute pointer-events-none z-20 rounded-sm"
            style={{
              inset: '10%',
              border: '1.5px dashed var(--prism-warning-main)',
            }}
          >
            <span
              className="absolute top-1 right-1.5 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold tracking-wider uppercase border"
              style={{
                color: 'var(--prism-warning-main)',
                borderColor: 'var(--prism-warning-main)',
                backgroundColor: 'color-mix(in srgb, var(--prism-bg-start) 86%, transparent)',
              }}
            >
              Title Safe 80%
            </span>
          </div>
        ) : null}
      </div>

      {/* Responsive Floating Optical Zoom & Safe-Area Toolbar */}
      <div
        role="toolbar"
        aria-label="Canvas zoom and safe-area controls"
        aria-disabled={disabled ? 'true' : undefined}
        tabIndex={disabled ? -1 : 0}
        data-testid="canvas-zoom-bar"
        onKeyDown={handleBarKeyDown}
        className={cx(
          toolbarClass,
          'prism-crystal prism-focus-ring rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
        )}
      >
        {/* Zoom Quick-Snap Segmented Controls */}
        <div
          role="group"
          aria-label="Canvas zoom presets"
          className="prism-well p-1 rounded-full inline-flex flex-wrap items-center gap-1 min-w-0 max-w-full"
        >
          {ZOOM_PRESETS.map((preset) => {
            const isSelected = activeState.zoom === preset.id;
            return (
              <button
                key={String(preset.id)}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                data-testid={`zoom-preset-${String(preset.id)}`}
                onClick={() => handleSelectZoom(preset.id)}
                className={cx(
                  'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all',
                  isSelected ? 'prism-btn-primary' : 'prism-btn-secondary'
                )}
              >
                <span className="relative z-10">{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Broadcast Safe-Area Overlay Toggle Controls */}
        <div
          role="group"
          aria-label="Broadcast guide overlays"
          className="inline-flex flex-wrap items-center gap-1.5 min-w-0 max-w-full"
        >
          <button
            type="button"
            disabled={disabled}
            aria-pressed={activeState.ruleOfThirds}
            data-testid="toggle-rule-of-thirds"
            onClick={() => handleToggleGuide('ruleOfThirds')}
            style={
              activeState.ruleOfThirds
                ? {
                    borderColor: 'var(--prism-text-secondary)',
                    backgroundColor:
                      'color-mix(in srgb, var(--prism-text-secondary) 16%, transparent)',
                    color: 'var(--prism-text-primary)',
                  }
                : {
                    borderColor: 'var(--prism-divider)',
                    color: 'var(--prism-text-secondary)',
                  }
            }
            className={cx(
              'prism-focus-ring h-8 px-2.5 rounded-full border inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
              activeState.ruleOfThirds ? 'shadow-sm' : 'prism-well'
            )}
          >
            <Grid3x3 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Thirds</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            aria-pressed={activeState.titleSafe}
            data-testid="toggle-title-safe"
            onClick={() => handleToggleGuide('titleSafe')}
            style={
              activeState.titleSafe
                ? {
                    borderColor: 'var(--prism-warning-main)',
                    backgroundColor:
                      'color-mix(in srgb, var(--prism-warning-main) 18%, transparent)',
                    color: 'var(--prism-text-primary)',
                  }
                : {
                    borderColor: 'var(--prism-divider)',
                    color: 'var(--prism-text-secondary)',
                  }
            }
            className={cx(
              'prism-focus-ring h-8 px-2.5 rounded-full border inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
              activeState.titleSafe ? 'shadow-sm' : 'prism-well'
            )}
          >
            <SquareDashed
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--prism-warning-main)' }}
            />
            <span>Title Safe</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            aria-pressed={activeState.actionSafe}
            data-testid="toggle-action-safe"
            onClick={() => handleToggleGuide('actionSafe')}
            style={
              activeState.actionSafe
                ? {
                    borderColor: 'var(--prism-info-main)',
                    backgroundColor:
                      'color-mix(in srgb, var(--prism-info-main) 18%, transparent)',
                    color: 'var(--prism-text-primary)',
                  }
                : {
                    borderColor: 'var(--prism-divider)',
                    color: 'var(--prism-text-secondary)',
                  }
            }
            className={cx(
              'prism-focus-ring h-8 px-2.5 rounded-full border inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
              activeState.actionSafe ? 'shadow-sm' : 'prism-well'
            )}
          >
            <Scan
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--prism-info-main)' }}
            />
            <span>Action Safe</span>
          </button>
        </div>

        {/* Aspect Ratio Matte Mask Selector */}
        <div className="relative inline-flex items-center min-w-0 max-w-full">
          <Ratio
            aria-hidden="true"
            className="w-3.5 h-3.5 pointer-events-none absolute left-2.5 shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          />
          <select
            aria-label="Aspect ratio mask"
            data-testid="aspect-mask-select"
            value={activeState.aspectMask}
            disabled={disabled}
            onChange={handleAspectMaskChange}
            style={{
              color: 'var(--prism-text-primary)',
              backgroundColor: 'var(--prism-bg-start)',
              borderColor: 'var(--prism-divider)',
            }}
            className="prism-well prism-focus-ring h-8 rounded-full border pl-7 pr-7 text-xs font-semibold appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors max-w-full"
          >
            {ASPECT_MASK_SPECS.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          />
        </div>
      </div>

      {/* Recessed Polite Live Telemetry Status Bar */}
      <div
        className={cx(
          statusClass,
          'prism-well rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
        )}
      >
        <span
          role="status"
          aria-live="polite"
          data-testid="canvas-status-bar"
          className="inline-flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-medium tabular-nums min-w-0 max-w-full"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          <Frame
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          />
          <span className="truncate">{canvasLabel}</span>
          <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
            ·
          </span>
          <span>Zoom: {zoomLabel}</span>
          <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
            ·
          </span>
          <span>Mask: {maskSpec.label}</span>
          <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
            ·
          </span>
          <span>Guides: {enabledGuideCount}/3 active</span>
        </span>

        <span
          aria-hidden="true"
          className="font-mono text-[10px] tracking-tight whitespace-nowrap shrink-0"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          0 Fit · 1 100% · 2 200%
        </span>
      </div>
    </div>
  );
}

CanvasZoomSafeAreaBar.displayName = 'CanvasZoomSafeAreaBar';
