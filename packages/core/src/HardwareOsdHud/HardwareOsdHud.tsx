'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ArrowBigUpDash,
  Monitor,
  Pause,
  Play,
  Sun,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type HardwareOsdKind = 'volume' | 'brightness' | 'media' | 'caps-lock';

export interface HardwareOsdPayload {
  /** Hardware OSD kind controlling icon, optical level bar or state pill, and semantic accent token. */
  kind: HardwareOsdKind;
  /** Numeric level percentage in [0..100] rendered for volume and brightness readouts. */
  levelPct?: number;
  /** Audio mute flag for `kind="volume"`. */
  muted?: boolean;
  /** Media playback state for `kind="media"`. */
  playing?: boolean;
  /** Caps Lock latch state for `kind="caps-lock"`. */
  capsLockOn?: boolean;
  /** Optional custom heading overriding the canonical kind label. */
  label?: string;
}

type HardwareOsdHudBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface HardwareOsdHudProps extends HardwareOsdHudBaseProps {
  /** Controlled hardware OSD payload snapshot. */
  payload?: HardwareOsdPayload;
  /** Initial uncontrolled OSD payload (defaults to volume 68%, unmuted). */
  defaultPayload?: HardwareOsdPayload;
  /** Controlled visibility flag for the centered translucent OSD capsule. */
  visible?: boolean;
  /** Initial uncontrolled HUD visibility flag (defaults to `true`). */
  defaultVisible?: boolean;
  /**
   * Auto-hide duration in milliseconds. When `> 0`, fades out automatically after `autoHideMs` ms,
   * resetting the timer on every new trigger or payload update and clearing strictly on hide/unmount.
   * Defaults to `0` (persistent).
   */
  autoHideMs?: number;
  /** Renders the interactive Hardware Key Simulator strip (`Vol -`, `Vol +`, `Mute`, `Bright +`, `Media Play/Pause`, `Caps Lock`). Defaults to `true`. */
  showDemoTriggers?: boolean;
  /** Callback fired whenever HUD visibility transitions between visible and hidden. */
  onVisibleChange?: (visible: boolean) => void;
  /** Disables the interactive demo triggers and suppresses simulated key interactions. */
  disabled?: boolean;
}

interface NormalizedHardwareOsdPayload {
  kind: HardwareOsdKind;
  levelPct: number;
  muted: boolean;
  playing: boolean;
  capsLockOn: boolean;
  label: string;
}

interface SegmentSpec {
  id: string;
  index: number;
}

type HardwareOsdDemoAction =
  | 'volume-down'
  | 'volume-up'
  | 'mute'
  | 'brightness-up'
  | 'media-toggle'
  | 'caps-lock-toggle';

interface DemoTriggerDescriptor {
  action: HardwareOsdDemoAction;
  label: string;
  testId: string;
  kind: HardwareOsdKind;
  pressed?: boolean;
  icon: ReactNode;
}

const DEFAULT_VOLUME_PCT = 68;
const DEFAULT_BRIGHTNESS_PCT = 70;
const VOLUME_STEP = 10;
const BRIGHTNESS_STEP = 10;
const BRIGHTNESS_WRAP_PCT = 10;
const SEGMENT_COUNT = 16;

const LEVEL_SEGMENTS: ReadonlyArray<SegmentSpec> = Array.from(
  { length: SEGMENT_COUNT },
  (_, index) => ({
    id: `osd-seg-${index + 1}`,
    index,
  })
);

export const DEFAULT_HARDWARE_OSD_PAYLOAD: HardwareOsdPayload = {
  kind: 'volume',
  levelPct: DEFAULT_VOLUME_PCT,
  muted: false,
};

function sanitizeLevelPct(
  value: number | undefined,
  fallbackPct: number
): number {
  if (value === undefined) {
    return fallbackPct;
  }
  return Math.round(clampNumber(value, 0, 100, 0));
}

function sanitizeAutoHideMs(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.round(value);
}

function resolveDefaultLabel(kind: HardwareOsdKind, muted: boolean): string {
  switch (kind) {
    case 'volume':
      return muted ? 'Muted' : 'Volume';
    case 'brightness':
      return 'Brightness';
    case 'media':
      return 'Media Playback';
    case 'caps-lock':
      return 'Caps Lock';
  }
}

function normalizePayload(raw: HardwareOsdPayload): NormalizedHardwareOsdPayload {
  const kind = raw.kind;
  const muted = Boolean(raw.muted);
  const playing = Boolean(raw.playing);
  const capsLockOn = Boolean(raw.capsLockOn);
  const defaultPct =
    kind === 'brightness' ? DEFAULT_BRIGHTNESS_PCT : DEFAULT_VOLUME_PCT;
  const levelPct = sanitizeLevelPct(raw.levelPct, defaultPct);
  const trimmedLabel = raw.label?.trim();
  const label = trimmedLabel
    ? trimmedLabel
    : resolveDefaultLabel(kind, muted);

  return {
    kind,
    levelPct,
    muted,
    playing,
    capsLockOn,
    label,
  };
}

function computeLitSegments(levelPct: number): number {
  if (levelPct <= 0) {
    return 0;
  }
  return Math.max(1, Math.round((levelPct / 100) * SEGMENT_COUNT));
}

function getKindAccentVar(payload: NormalizedHardwareOsdPayload): string {
  switch (payload.kind) {
    case 'volume':
      return payload.muted
        ? 'var(--prism-text-secondary)'
        : 'var(--prism-primary-main)';
    case 'brightness':
      return 'var(--prism-warning-main)';
    case 'media':
      return payload.playing
        ? 'var(--prism-success-main)'
        : 'var(--prism-info-main)';
    case 'caps-lock':
      return payload.capsLockOn
        ? 'var(--prism-primary-main)'
        : 'var(--prism-text-secondary)';
  }
}

function renderOsdIcon(payload: NormalizedHardwareOsdPayload): ReactNode {
  switch (payload.kind) {
    case 'volume':
      return payload.muted || payload.levelPct === 0 ? (
        <VolumeX
          aria-hidden="true"
          data-testid="hardware-osd-icon-volume-muted"
          className="w-7 h-7 shrink-0"
        />
      ) : (
        <Volume2
          aria-hidden="true"
          data-testid="hardware-osd-icon-volume"
          className="w-7 h-7 shrink-0"
        />
      );
    case 'brightness':
      return (
        <Sun
          aria-hidden="true"
          data-testid="hardware-osd-icon-brightness"
          className="w-7 h-7 shrink-0"
        />
      );
    case 'media':
      return payload.playing ? (
        <Play
          aria-hidden="true"
          data-testid="hardware-osd-icon-media-play"
          className="w-7 h-7 shrink-0"
        />
      ) : (
        <Pause
          aria-hidden="true"
          data-testid="hardware-osd-icon-media-pause"
          className="w-7 h-7 shrink-0"
        />
      );
    case 'caps-lock':
      return (
        <ArrowBigUpDash
          aria-hidden="true"
          data-testid="hardware-osd-icon-caps-lock"
          className="w-7 h-7 shrink-0"
        />
      );
  }
}

export function HardwareOsdHud({
  payload,
  defaultPayload = DEFAULT_HARDWARE_OSD_PAYLOAD,
  visible,
  defaultVisible = true,
  autoHideMs = 0,
  showDemoTriggers = true,
  onVisibleChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: HardwareOsdHudProps) {
  const override = useComponentOverride('HardwareOsdHud');

  const isPayloadControlled = payload !== undefined;
  const isVisibleControlled = visible !== undefined;

  const initialNormalized = normalizePayload(defaultPayload);

  const [internalPayload, setInternalPayload] = useState<HardwareOsdPayload>(
    () => defaultPayload
  );
  const [internalVisible, setInternalVisible] =
    useState<boolean>(defaultVisible);
  const [triggerNonce, setTriggerNonce] = useState<number>(0);

  const [simVolumePct, setSimVolumePct] = useState<number>(() =>
    initialNormalized.kind === 'volume'
      ? initialNormalized.levelPct
      : DEFAULT_VOLUME_PCT
  );
  const [simMuted, setSimMuted] = useState<boolean>(() =>
    initialNormalized.kind === 'volume' ? initialNormalized.muted : false
  );
  const [simBrightnessPct, setSimBrightnessPct] = useState<number>(() =>
    initialNormalized.kind === 'brightness'
      ? initialNormalized.levelPct
      : DEFAULT_BRIGHTNESS_PCT
  );
  const [simPlaying, setSimPlaying] = useState<boolean>(() =>
    initialNormalized.kind === 'media' ? initialNormalized.playing : false
  );
  const [simCapsLockOn, setSimCapsLockOn] = useState<boolean>(() =>
    initialNormalized.kind === 'caps-lock'
      ? initialNormalized.capsLockOn
      : false
  );

  const activeRawPayload = isPayloadControlled ? payload : internalPayload;
  const resolvedPayload = normalizePayload(activeRawPayload);
  const isVisible = isVisibleControlled ? visible : internalVisible;
  const safeAutoHideMs = sanitizeAutoHideMs(autoHideMs);

  const onVisibleChangeRef = useRef<((nextVisible: boolean) => void) | undefined>(
    onVisibleChange
  );
  useEffect(() => {
    onVisibleChangeRef.current = onVisibleChange;
  }, [onVisibleChange]);

  useEffect(() => {
    if (!isVisible || safeAutoHideMs <= 0) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      if (!isVisibleControlled) {
        setInternalVisible(false);
      }
      onVisibleChangeRef.current?.(false);
    }, safeAutoHideMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [
    activeRawPayload,
    isVisible,
    isVisibleControlled,
    safeAutoHideMs,
    triggerNonce,
  ]);

  const handleDemoTrigger = useCallback(
    (action: HardwareOsdDemoAction) => {
      if (disabled) {
        return;
      }

      let nextPayload: HardwareOsdPayload;
      switch (action) {
        case 'volume-down': {
          const nextLevel = Math.max(0, simVolumePct - VOLUME_STEP);
          setSimVolumePct(nextLevel);
          setSimMuted(false);
          nextPayload = { kind: 'volume', levelPct: nextLevel, muted: false };
          break;
        }
        case 'volume-up': {
          const nextLevel = Math.min(100, simVolumePct + VOLUME_STEP);
          setSimVolumePct(nextLevel);
          setSimMuted(false);
          nextPayload = { kind: 'volume', levelPct: nextLevel, muted: false };
          break;
        }
        case 'mute': {
          const nextMuted = !simMuted;
          setSimMuted(nextMuted);
          nextPayload = {
            kind: 'volume',
            levelPct: simVolumePct,
            muted: nextMuted,
          };
          break;
        }
        case 'brightness-up': {
          const nextLevel =
            simBrightnessPct >= 100
              ? BRIGHTNESS_WRAP_PCT
              : Math.min(100, simBrightnessPct + BRIGHTNESS_STEP);
          setSimBrightnessPct(nextLevel);
          nextPayload = { kind: 'brightness', levelPct: nextLevel };
          break;
        }
        case 'media-toggle': {
          const nextPlaying = !simPlaying;
          setSimPlaying(nextPlaying);
          nextPayload = { kind: 'media', playing: nextPlaying };
          break;
        }
        case 'caps-lock-toggle': {
          const nextCapsLock = !simCapsLockOn;
          setSimCapsLockOn(nextCapsLock);
          nextPayload = { kind: 'caps-lock', capsLockOn: nextCapsLock };
          break;
        }
      }

      if (!isPayloadControlled) {
        setInternalPayload(nextPayload);
      }
      if (!isVisible) {
        if (!isVisibleControlled) {
          setInternalVisible(true);
        }
        onVisibleChangeRef.current?.(true);
      }
      setTriggerNonce((count) => count + 1);
    },
    [
      disabled,
      isPayloadControlled,
      isVisible,
      isVisibleControlled,
      simBrightnessPct,
      simCapsLockOn,
      simMuted,
      simPlaying,
      simVolumePct,
    ]
  );

  const handleImeSafeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) {
        event.preventDefault();
      }
    },
    []
  );

  const accentVar = getKindAccentVar(resolvedPayload);
  const isLevelKind =
    resolvedPayload.kind === 'volume' || resolvedPayload.kind === 'brightness';
  const isVolumeMuted =
    resolvedPayload.kind === 'volume' && resolvedPayload.muted;
  const litSegments = isLevelKind
    ? computeLitSegments(resolvedPayload.levelPct)
    : 0;

  const statePillLabel =
    resolvedPayload.kind === 'media'
      ? resolvedPayload.playing
        ? 'Playing'
        : 'Paused'
      : resolvedPayload.capsLockOn
        ? 'ON'
        : 'OFF';

  const statePillValue =
    resolvedPayload.kind === 'media'
      ? resolvedPayload.playing
        ? 'playing'
        : 'paused'
      : resolvedPayload.capsLockOn
        ? 'on'
        : 'off';

  const demoTriggers: ReadonlyArray<DemoTriggerDescriptor> = [
    {
      action: 'volume-down',
      label: 'Vol -',
      testId: 'hardware-osd-trigger-vol-down',
      kind: 'volume',
      icon: <Volume1 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      action: 'volume-up',
      label: 'Vol +',
      testId: 'hardware-osd-trigger-vol-up',
      kind: 'volume',
      icon: <Volume2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      action: 'mute',
      label: 'Mute',
      testId: 'hardware-osd-trigger-mute',
      kind: 'volume',
      pressed: simMuted,
      icon: <VolumeX aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      action: 'brightness-up',
      label: 'Bright +',
      testId: 'hardware-osd-trigger-bright-up',
      kind: 'brightness',
      icon: <Sun aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      action: 'media-toggle',
      label: 'Media Play/Pause',
      testId: 'hardware-osd-trigger-media',
      kind: 'media',
      pressed: simPlaying,
      icon: simPlaying ? (
        <Pause aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Play aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
      ),
    },
    {
      action: 'caps-lock-toggle',
      label: 'Caps Lock',
      testId: 'hardware-osd-trigger-caps-lock',
      kind: 'caps-lock',
      pressed: simCapsLockOn,
      icon: (
        <ArrowBigUpDash aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
      ),
    },
  ];

  const merged = mergeProps({
    themeTarget: themeProps('hardware-osd-hud', {
      kind: resolvedPayload.kind,
      visible: isVisible ? 'true' : 'false',
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-3.5 select-none',
      disabled ? 'opacity-65' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('hardware-osd-hud', 'header');
  const stageClass = stableClassName('hardware-osd-hud', 'stage');
  const capsuleClass = stableClassName('hardware-osd-hud', 'capsule');
  const levelBarClass = stableClassName('hardware-osd-hud', 'level-bar');
  const statePillClass = stableClassName('hardware-osd-hud', 'state-pill');
  const triggersClass = stableClassName('hardware-osd-hud', 'triggers');

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Hardware OSD HUD"
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Header Row */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2 min-w-0'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Monitor
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color: disabled
                ? 'var(--prism-text-disabled)'
                : 'var(--prism-primary-main)',
            }}
          />
          <span
            className="text-sm font-semibold tracking-tight truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            Hardware OSD
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {safeAutoHideMs > 0 ? (
            <span
              data-testid="hardware-osd-autohide-badge"
              className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Auto-hide {safeAutoHideMs}ms
            </span>
          ) : null}
          <span
            data-testid="hardware-osd-visibility-badge"
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold whitespace-nowrap"
            style={{
              color: isVisible
                ? accentVar
                : 'var(--prism-text-secondary)',
            }}
          >
            {isVisible ? 'Active' : 'Faded'}
          </span>
        </div>
      </div>

      {/* Centered Translucent Optical Stage & Non-Interactive OSD Capsule */}
      <div
        data-testid="hardware-osd-stage"
        className={cx(
          stageClass,
          'prism-well relative w-full min-w-0 min-h-[12.5rem] rounded-2xl p-4 sm:p-6 flex items-center justify-center overflow-hidden'
        )}
      >
        {/* Subtle Decorative Ambient Optical Halo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: isVisible ? 1 : 0.25,
            background: `radial-gradient(circle at 50% 48%, color-mix(in srgb, ${accentVar} 18%, transparent) 0%, transparent 66%)`,
          }}
        />

        {/* Centered Non-Interactive Optical HUD Capsule */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="hardware-osd-capsule"
          data-kind={resolvedPayload.kind}
          data-visible={isVisible ? 'true' : 'false'}
          data-muted={isVolumeMuted ? 'true' : undefined}
          className={cx(
            capsuleClass,
            'prism-crystal pointer-events-none select-none relative z-10 w-full max-w-[17rem] min-w-0 rounded-3xl px-5 py-4 flex flex-col items-center gap-3 text-center transition-all duration-200',
            isVisible
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-1'
          )}
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: `color-mix(in srgb, ${accentVar} 38%, var(--prism-divider))`,
            boxShadow: isVisible
              ? `0 18px 36px -14px color-mix(in srgb, ${accentVar} 42%, transparent)`
              : undefined,
          }}
        >
          {/* Optical Icon Emblem */}
          <span
            aria-hidden="true"
            data-testid="hardware-osd-icon"
            className={cx(
              'prism-well w-14 h-14 rounded-2xl inline-flex items-center justify-center shrink-0 transition-colors duration-150',
              resolvedPayload.kind === 'caps-lock' ? 'border-b-2' : ''
            )}
            style={{
              color: accentVar,
              borderColor:
                resolvedPayload.kind === 'caps-lock'
                  ? `color-mix(in srgb, ${accentVar} 46%, var(--prism-well-border))`
                  : undefined,
              boxShadow: `0 0 18px -6px color-mix(in srgb, ${accentVar} 45%, transparent)`,
            }}
          >
            {renderOsdIcon(resolvedPayload)}
          </span>

          {/* Label */}
          <span
            data-testid="hardware-osd-label"
            className="text-sm font-semibold tracking-tight truncate max-w-full"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {resolvedPayload.label}
          </span>

          {/* 16-Segment Optical Level Bar or Semantic State Pill */}
          {isLevelKind ? (
            <div className="w-full min-w-0 flex flex-col items-center gap-2">
              <div
                aria-hidden="true"
                data-testid="hardware-osd-level-bar"
                data-segments={String(SEGMENT_COUNT)}
                data-lit-segments={String(litSegments)}
                data-muted={isVolumeMuted ? 'true' : 'false'}
                className={cx(
                  levelBarClass,
                  'prism-well w-full h-3.5 rounded-full p-1 flex items-center gap-0.5 min-w-0',
                  isVolumeMuted ? 'opacity-60' : ''
                )}
              >
                {LEVEL_SEGMENTS.map((segment) => {
                  const isLit = segment.index < litSegments;
                  const activeColor =
                    resolvedPayload.kind === 'brightness'
                      ? 'var(--prism-warning-main)'
                      : isVolumeMuted
                        ? 'color-mix(in srgb, var(--prism-text-secondary) 42%, transparent)'
                        : 'var(--prism-primary-main)';

                  return (
                    <span
                      key={segment.id}
                      data-testid={`hardware-osd-segment-${segment.index}`}
                      data-lit={isLit ? 'true' : 'false'}
                      className="flex-1 h-full rounded-full transition-all duration-100"
                      style={{
                        backgroundColor: isLit
                          ? activeColor
                          : 'color-mix(in srgb, var(--prism-text-secondary) 16%, transparent)',
                        boxShadow:
                          isLit && !isVolumeMuted
                            ? `0 0 6px color-mix(in srgb, ${activeColor} 48%, transparent)`
                            : undefined,
                      }}
                    />
                  );
                })}
              </div>

              <span
                data-testid="hardware-osd-readout"
                className="font-mono text-xs font-semibold tabular-nums tracking-tight"
                style={{
                  color: isVolumeMuted
                    ? 'var(--prism-text-secondary)'
                    : 'var(--prism-text-primary)',
                }}
              >
                {resolvedPayload.levelPct}%
              </span>
            </div>
          ) : (
            <span
              data-testid="hardware-osd-state-pill"
              data-state={statePillValue}
              className={cx(
                statePillClass,
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold tracking-wide'
              )}
              style={{
                color: accentVar,
                backgroundColor: `color-mix(in srgb, ${accentVar} 16%, transparent)`,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: `color-mix(in srgb, ${accentVar} 46%, transparent)`,
              }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: accentVar }}
              />
              <span>{statePillLabel}</span>
            </span>
          )}
        </div>
      </div>

      {/* Optional Interactive Hardware Key Simulator Strip */}
      {showDemoTriggers ? (
        <div
          role="group"
          aria-label="Hardware key simulator"
          data-testid="hardware-osd-triggers"
          className={cx(
            triggersClass,
            'flex flex-wrap items-center justify-center gap-2 min-w-0'
          )}
        >
          {demoTriggers.map((trigger) => {
            const isCurrentKind =
              isVisible && resolvedPayload.kind === trigger.kind;
            return (
              <button
                key={trigger.action}
                type="button"
                disabled={disabled}
                aria-pressed={trigger.pressed}
                data-testid={trigger.testId}
                onClick={() => handleDemoTrigger(trigger.action)}
                onKeyDown={handleImeSafeKeyDown}
                className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
                style={{
                  color: 'var(--prism-text-primary)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: isCurrentKind
                    ? `color-mix(in srgb, ${accentVar} 48%, transparent)`
                    : 'var(--prism-divider)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: isCurrentKind
                      ? accentVar
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {trigger.icon}
                </span>
                <span>{trigger.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

HardwareOsdHud.displayName = 'HardwareOsdHud';
