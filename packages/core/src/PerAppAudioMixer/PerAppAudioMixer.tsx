'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import {
  ChevronDown,
  Mic,
  RotateCcw,
  SlidersHorizontal,
  Speaker,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type AudioMixerChannelTone = 'primary' | 'info' | 'emerald' | 'amber';

export interface AudioMixerDeviceOption {
  /** Stable unique audio endpoint identifier. */
  id: string;
  /** Visible audio device display label. */
  label: string;
}

export interface AudioMixerAppChannel {
  /** Stable unique application stream identifier. */
  id: string;
  /** Application display name rendered beside the channel fader. */
  appName: string;
  /** Independent application channel gain percentage in [0..100]. */
  volumePct: number;
  /** Whether this application channel is individually muted. */
  muted: boolean;
  /** Optional semantic optical tone dot mapped strictly to --prism-* tokens. */
  tone?: AudioMixerChannelTone;
}

export interface PerAppAudioMixerState {
  /** Active audio output device identifier. */
  outputDeviceId: string;
  /** Active audio input device identifier. */
  inputDeviceId: string;
  /** Master output bus gain percentage in [0..100]. */
  masterVolumePct: number;
  /** Whether the master output bus is muted (propagates to all app readouts). */
  masterMuted: boolean;
  /** Running per-application audio channel strips. */
  channels: ReadonlyArray<AudioMixerAppChannel>;
}

type PerAppAudioMixerBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface PerAppAudioMixerProps extends PerAppAudioMixerBaseProps {
  /** Popover heading displayed in the mixer header (defaults to 'Audio Mixer'). */
  title?: string;
  /** Selectable audio output devices; defaults to 3 studio/desktop output devices. */
  outputDevices?: ReadonlyArray<AudioMixerDeviceOption>;
  /** Selectable audio input devices; defaults to 2 microphone input devices. */
  inputDevices?: ReadonlyArray<AudioMixerDeviceOption>;
  /** Controlled full mixer state. */
  value?: PerAppAudioMixerState;
  /** Initial partial mixer state in uncontrolled mode and baseline for Reset Mix. */
  defaultValue?: Partial<PerAppAudioMixerState>;
  /** Callback invoked with the complete sanitized mixer state after any change. */
  onChange?: (state: PerAppAudioMixerState) => void;
  /** Disables device selectors, master controls, per-app sliders, and Reset Mix. */
  disabled?: boolean;
}

type MasterLevelBand = 'muted' | 'nominal' | 'warning' | 'high';

const DEFAULT_TITLE = 'Audio Mixer';
const DEFAULT_MASTER_VOLUME_PCT = 80;
const MIN_VOLUME_PCT = 0;
const MAX_VOLUME_PCT = 100;
const MASTER_METER_SEGMENTS = 20;

const MASTER_SEGMENT_INDICES: ReadonlyArray<number> = Array.from(
  { length: MASTER_METER_SEGMENTS },
  (_, index) => index
);

const DEFAULT_OUTPUT_DEVICES: ReadonlyArray<AudioMixerDeviceOption> = [
  { id: 'studio-monitors', label: 'Studio Monitors (USB-C)' },
  { id: 'prism-headphones', label: 'Prism Headphones' },
  { id: 'built-in-speakers', label: 'Built-in Speakers' },
];

const DEFAULT_INPUT_DEVICES: ReadonlyArray<AudioMixerDeviceOption> = [
  { id: 'broadcast-mic', label: 'Broadcast Mic' },
  { id: 'built-in-array', label: 'Built-in Array' },
];

const DEFAULT_APP_CHANNELS: ReadonlyArray<AudioMixerAppChannel> = [
  {
    id: 'refractor-studio',
    appName: 'Refractor Studio',
    volumePct: 90,
    muted: false,
    tone: 'primary',
  },
  {
    id: 'optical-browser',
    appName: 'Optical Browser',
    volumePct: 72,
    muted: false,
    tone: 'info',
  },
  {
    id: 'voice-comms',
    appName: 'Voice Comms',
    volumePct: 85,
    muted: false,
    tone: 'emerald',
  },
  {
    id: 'system-sounds',
    appName: 'System Sounds',
    volumePct: 45,
    muted: false,
    tone: 'amber',
  },
];

function sanitizeVolumePct(value: number): number {
  return Math.round(
    clampNumber(value, MIN_VOLUME_PCT, MAX_VOLUME_PCT, MIN_VOLUME_PCT)
  );
}

function resolveChannelTone(
  tone?: AudioMixerChannelTone
): AudioMixerChannelTone {
  switch (tone) {
    case 'primary':
    case 'info':
    case 'emerald':
    case 'amber':
      return tone;
    default:
      return 'primary';
  }
}

function getToneColorVar(tone: AudioMixerChannelTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'info':
      return 'var(--prism-info-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
  }
}

function getMasterLevelBand(
  masterVolumePct: number,
  masterMuted: boolean
): MasterLevelBand {
  if (masterMuted) {
    return 'muted';
  }
  if (masterVolumePct <= 70) {
    return 'nominal';
  }
  if (masterVolumePct <= 88) {
    return 'warning';
  }
  return 'high';
}

function getMasterBandColorVar(band: MasterLevelBand): string {
  switch (band) {
    case 'muted':
      return 'var(--prism-text-disabled)';
    case 'nominal':
      return 'var(--prism-success-main)';
    case 'warning':
      return 'var(--prism-warning-main)';
    case 'high':
      return 'var(--prism-error-main)';
  }
}

function normalizeDevices(
  devices: ReadonlyArray<AudioMixerDeviceOption>,
  fallbackPrefix: string
): ReadonlyArray<AudioMixerDeviceOption> {
  const seen = new Map<string, number>();
  return devices.map((device) => {
    const trimmedId = device.id.trim();
    const trimmedLabel = device.label.trim();
    const baseId = trimmedId || trimmedLabel || fallbackPrefix;
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}#${count + 1}`;
    const label = trimmedLabel || baseId;
    return { id, label };
  });
}

function normalizeChannels(
  channels: ReadonlyArray<AudioMixerAppChannel>
): ReadonlyArray<AudioMixerAppChannel> {
  const seen = new Map<string, number>();
  return channels.map((channel) => {
    const trimmedId = channel.id.trim();
    const trimmedName = channel.appName.trim();
    const baseId = trimmedId || trimmedName || 'app';
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}#${count + 1}`;
    return {
      id,
      appName: trimmedName || 'Application',
      volumePct: sanitizeVolumePct(channel.volumePct),
      muted: Boolean(channel.muted),
      tone: resolveChannelTone(channel.tone),
    };
  });
}

function resolveDeviceId(
  candidateId: string | undefined,
  devices: ReadonlyArray<AudioMixerDeviceOption>
): string {
  const first = devices[0];
  if (!first) {
    return '';
  }
  if (candidateId) {
    const match = devices.find((device) => device.id === candidateId);
    if (match) {
      return match.id;
    }
  }
  return first.id;
}

function sanitizeMixerState(
  raw: Partial<PerAppAudioMixerState> | undefined,
  outputDevices: ReadonlyArray<AudioMixerDeviceOption>,
  inputDevices: ReadonlyArray<AudioMixerDeviceOption>
): PerAppAudioMixerState {
  return {
    outputDeviceId: resolveDeviceId(raw?.outputDeviceId, outputDevices),
    inputDeviceId: resolveDeviceId(raw?.inputDeviceId, inputDevices),
    masterVolumePct:
      raw?.masterVolumePct !== undefined
        ? sanitizeVolumePct(raw.masterVolumePct)
        : DEFAULT_MASTER_VOLUME_PCT,
    masterMuted: raw?.masterMuted !== undefined ? Boolean(raw.masterMuted) : false,
    channels:
      raw?.channels !== undefined
        ? normalizeChannels(raw.channels)
        : DEFAULT_APP_CHANNELS.map((channel) => ({ ...channel })),
  };
}

function computeEffectivePct(
  channelVolumePct: number,
  masterVolumePct: number,
  channelMuted: boolean,
  masterMuted: boolean
): number | null {
  if (channelMuted || masterMuted) {
    return null;
  }
  return Math.round((channelVolumePct * masterVolumePct) / 100);
}

function findDeviceLabel(
  deviceId: string,
  devices: ReadonlyArray<AudioMixerDeviceOption>,
  emptyLabel: string
): string {
  const matched = devices.find((device) => device.id === deviceId);
  return matched ? matched.label : emptyLabel;
}

export function PerAppAudioMixer({
  title = DEFAULT_TITLE,
  outputDevices,
  inputDevices,
  value,
  defaultValue,
  onChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PerAppAudioMixerProps) {
  const override = useComponentOverride('PerAppAudioMixer');
  const titleId = useId();
  const outputSelectId = useId();
  const inputSelectId = useId();

  const resolvedTitle = title.trim() || DEFAULT_TITLE;

  const safeOutputDevices = useMemo<ReadonlyArray<AudioMixerDeviceOption>>(
    () =>
      outputDevices !== undefined
        ? normalizeDevices(outputDevices, 'output-device')
        : DEFAULT_OUTPUT_DEVICES,
    [outputDevices]
  );

  const safeInputDevices = useMemo<ReadonlyArray<AudioMixerDeviceOption>>(
    () =>
      inputDevices !== undefined
        ? normalizeDevices(inputDevices, 'input-device')
        : DEFAULT_INPUT_DEVICES,
    [inputDevices]
  );

  const resetBaseline = useMemo<PerAppAudioMixerState>(
    () => sanitizeMixerState(defaultValue, safeOutputDevices, safeInputDevices),
    [defaultValue, safeOutputDevices, safeInputDevices]
  );

  const isControlled = value !== undefined;
  const [uncontrolledState, setUncontrolledState] =
    useState<PerAppAudioMixerState>(() =>
      sanitizeMixerState(defaultValue, safeOutputDevices, safeInputDevices)
    );

  const currentState = useMemo<PerAppAudioMixerState>(
    () =>
      sanitizeMixerState(
        isControlled ? value : uncontrolledState,
        safeOutputDevices,
        safeInputDevices
      ),
    [isControlled, value, uncontrolledState, safeOutputDevices, safeInputDevices]
  );

  const activeOutputLabel = findDeviceLabel(
    currentState.outputDeviceId,
    safeOutputDevices,
    'No output device'
  );

  const [liveStatus, setLiveStatus] = useState<string>('');

  const defaultLiveSummary = useMemo(() => {
    const masterSummary = currentState.masterMuted
      ? 'Master muted'
      : `Master volume ${currentState.masterVolumePct}%`;
    const channelCount = currentState.channels.length;
    const channelSummary =
      channelCount === 0
        ? 'no active applications'
        : `${channelCount} ${channelCount === 1 ? 'application' : 'applications'}`;
    return `Output ${activeOutputLabel}, ${masterSummary}, ${channelSummary}`;
  }, [
    activeOutputLabel,
    currentState.masterMuted,
    currentState.masterVolumePct,
    currentState.channels.length,
  ]);

  const commitState = useCallback(
    (nextState: PerAppAudioMixerState, announcement: string) => {
      if (disabled) {
        return;
      }
      const sanitizedNext = sanitizeMixerState(
        nextState,
        safeOutputDevices,
        safeInputDevices
      );
      if (!isControlled) {
        setUncontrolledState(sanitizedNext);
      }
      setLiveStatus(announcement);
      onChange?.(sanitizedNext);
    },
    [disabled, isControlled, onChange, safeInputDevices, safeOutputDevices]
  );

  const handleOutputDeviceChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextId = event.target.value;
      const nextLabel = findDeviceLabel(
        nextId,
        safeOutputDevices,
        'No output device'
      );
      commitState(
        {
          ...currentState,
          outputDeviceId: nextId,
        },
        `Audio output switched to ${nextLabel}`
      );
    },
    [commitState, currentState, safeOutputDevices]
  );

  const handleInputDeviceChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextId = event.target.value;
      const nextLabel = findDeviceLabel(
        nextId,
        safeInputDevices,
        'No input device'
      );
      commitState(
        {
          ...currentState,
          inputDeviceId: nextId,
        },
        `Audio input switched to ${nextLabel}`
      );
    },
    [commitState, currentState, safeInputDevices]
  );

  const handleMasterVolumeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextVolume = sanitizeVolumePct(Number(event.target.value));
      commitState(
        {
          ...currentState,
          masterVolumePct: nextVolume,
        },
        currentState.masterMuted
          ? `Master volume set to ${nextVolume}% while muted`
          : `Master volume set to ${nextVolume}%`
      );
    },
    [commitState, currentState]
  );

  const handleToggleMasterMute = useCallback(() => {
    const nextMuted = !currentState.masterMuted;
    commitState(
      {
        ...currentState,
        masterMuted: nextMuted,
      },
      nextMuted
        ? 'Master audio muted'
        : `Master audio unmuted at ${currentState.masterVolumePct}%`
    );
  }, [commitState, currentState]);

  const handleMasterSliderKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        handleToggleMasterMute();
      }
    },
    [disabled, handleToggleMasterMute]
  );

  const handleChannelVolumeChange = useCallback(
    (channelId: string, event: ChangeEvent<HTMLInputElement>) => {
      const nextVolume = sanitizeVolumePct(Number(event.target.value));
      let targetChannelName = 'Application';
      let targetMuted = false;

      const nextChannels = currentState.channels.map((channel) => {
        if (channel.id !== channelId) {
          return channel;
        }
        targetChannelName = channel.appName;
        targetMuted = channel.muted;
        return {
          ...channel,
          volumePct: nextVolume,
        };
      });

      const effective = computeEffectivePct(
        nextVolume,
        currentState.masterVolumePct,
        targetMuted,
        currentState.masterMuted
      );

      commitState(
        {
          ...currentState,
          channels: nextChannels,
        },
        effective === null
          ? `${targetChannelName} volume set to ${nextVolume}%, effective output muted`
          : `${targetChannelName} volume set to ${nextVolume}%, effective output ${effective}%`
      );
    },
    [commitState, currentState]
  );

  const handleToggleChannelMute = useCallback(
    (channelId: string) => {
      let targetChannelName = 'Application';
      let nextChannelMuted = false;
      let targetVolume = 0;

      const nextChannels = currentState.channels.map((channel) => {
        if (channel.id !== channelId) {
          return channel;
        }
        targetChannelName = channel.appName;
        nextChannelMuted = !channel.muted;
        targetVolume = channel.volumePct;
        return {
          ...channel,
          muted: nextChannelMuted,
        };
      });

      const effective = computeEffectivePct(
        targetVolume,
        currentState.masterVolumePct,
        nextChannelMuted,
        currentState.masterMuted
      );

      commitState(
        {
          ...currentState,
          channels: nextChannels,
        },
        nextChannelMuted
          ? `${targetChannelName} muted`
          : effective === null
            ? `${targetChannelName} unmuted, master output muted`
            : `${targetChannelName} unmuted, effective output ${effective}%`
      );
    },
    [commitState, currentState]
  );

  const handleChannelSliderKeyDown = useCallback(
    (channelId: string, event: KeyboardEvent<HTMLInputElement>) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        handleToggleChannelMute(channelId);
      }
    },
    [disabled, handleToggleChannelMute]
  );

  const handleResetMix = useCallback(() => {
    commitState(resetBaseline, 'Audio mix reset to defaults');
  }, [commitState, resetBaseline]);

  const effectiveMasterPct = currentState.masterMuted
    ? 0
    : currentState.masterVolumePct;
  const masterLevelBand = getMasterLevelBand(
    currentState.masterVolumePct,
    currentState.masterMuted
  );
  const masterBandColor = getMasterBandColorVar(masterLevelBand);
  const litMasterSegments =
    effectiveMasterPct === 0
      ? 0
      : Math.max(
          1,
          Math.round((effectiveMasterPct / MAX_VOLUME_PCT) * MASTER_METER_SEGMENTS)
        );
  const masterReadout = currentState.masterMuted
    ? 'Muted'
    : `${currentState.masterVolumePct}%`;

  const activeChannelCount = currentState.masterMuted
    ? 0
    : currentState.channels.filter((channel) => !channel.muted).length;

  const isEmpty = currentState.channels.length === 0;

  const merged = mergeProps({
    themeTarget: themeProps('per-app-audio-mixer', {
      masterMuted: currentState.masterMuted,
      masterBand: masterLevelBand,
      empty: isEmpty,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 p-4 flex flex-col gap-3.5 transition-all',
      disabled ? 'opacity-60' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('per-app-audio-mixer', 'header');
  const routingClass = stableClassName('per-app-audio-mixer', 'routing');
  const masterClass = stableClassName('per-app-audio-mixer', 'master');
  const meterClass = stableClassName('per-app-audio-mixer', 'meter');
  const channelsClass = stableClassName('per-app-audio-mixer', 'channels');
  const channelRowClass = stableClassName('per-app-audio-mixer', 'channel');
  const emptyClass = stableClassName('per-app-audio-mixer', 'empty');

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={!rest['aria-label'] ? titleId : undefined}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Header: Title, Active Output Pill, Reset Mix */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2 min-w-0'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <SlidersHorizontal
              aria-hidden="true"
              className="w-4 h-4 shrink-0"
            />
          </span>
          <h2
            id={titleId}
            data-testid="per-app-audio-mixer-title"
            className="text-sm font-semibold tracking-tight truncate min-w-0"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {resolvedTitle}
          </h2>
          <span
            data-testid="per-app-audio-mixer-active-output"
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium max-w-full min-w-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <Speaker
              aria-hidden="true"
              className="w-3 h-3 shrink-0"
              style={{ color: 'var(--prism-info-main)' }}
            />
            <span className="truncate min-w-0">{activeOutputLabel}</span>
          </span>
        </div>

        <button
          type="button"
          disabled={disabled}
          data-testid="per-app-audio-mixer-reset"
          onClick={handleResetMix}
          className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Reset Mix</span>
        </button>
      </div>

      {/* Device Routing Selectors */}
      <div
        className={cx(
          routingClass,
          'grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-0'
        )}
      >
        <div className="flex flex-col gap-1 min-w-0">
          <label
            htmlFor={outputSelectId}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide min-w-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <Speaker aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Output</span>
          </label>
          <div className="prism-well relative rounded-xl flex items-center min-w-0">
            <select
              id={outputSelectId}
              aria-label="Audio output device"
              data-testid="per-app-audio-mixer-output-select"
              value={currentState.outputDeviceId}
              disabled={disabled || safeOutputDevices.length === 0}
              onChange={handleOutputDeviceChange}
              className="prism-focus-ring w-full min-w-0 appearance-none bg-transparent rounded-xl pl-3 pr-8 py-2 text-xs font-medium truncate cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {safeOutputDevices.length === 0 ? (
                <option value="">No output devices</option>
              ) : (
                safeOutputDevices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.label}
                  </option>
                ))
              )}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <label
            htmlFor={inputSelectId}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide min-w-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <Mic aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Input</span>
          </label>
          <div className="prism-well relative rounded-xl flex items-center min-w-0">
            <select
              id={inputSelectId}
              aria-label="Audio input device"
              data-testid="per-app-audio-mixer-input-select"
              value={currentState.inputDeviceId}
              disabled={disabled || safeInputDevices.length === 0}
              onChange={handleInputDeviceChange}
              className="prism-focus-ring w-full min-w-0 appearance-none bg-transparent rounded-xl pl-3 pr-8 py-2 text-xs font-medium truncate cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {safeInputDevices.length === 0 ? (
                <option value="">No input devices</option>
              ) : (
                safeInputDevices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.label}
                  </option>
                ))
              )}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            />
          </div>
        </div>
      </div>

      {/* Master Volume Bus */}
      <div
        className={cx(
          masterClass,
          'prism-crystal rounded-2xl p-3 flex flex-col gap-2.5 min-w-0'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              disabled={disabled}
              aria-pressed={currentState.masterMuted}
              aria-label="Mute master"
              data-testid="per-app-audio-mixer-master-mute"
              data-muted={currentState.masterMuted ? 'true' : undefined}
              onClick={handleToggleMasterMute}
              className={cx(
                'prism-focus-ring inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all',
                currentState.masterMuted ? '' : 'prism-well'
              )}
              style={
                currentState.masterMuted
                  ? {
                      backgroundColor: 'var(--prism-error-main)',
                      color: 'var(--prism-error-contrast)',
                    }
                  : { color: 'var(--prism-text-primary)' }
              }
            >
              {currentState.masterMuted ? (
                <VolumeX aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Volume2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Master</span>
            </button>
          </div>

          <span
            data-testid="per-app-audio-mixer-master-readout"
            className="prism-well rounded-full px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums whitespace-nowrap shrink-0"
            style={{
              color: currentState.masterMuted
                ? 'var(--prism-error-main)'
                : masterBandColor,
            }}
          >
            {masterReadout}
          </span>
        </div>

        <input
          type="range"
          min={MIN_VOLUME_PCT}
          max={MAX_VOLUME_PCT}
          step={1}
          value={currentState.masterVolumePct}
          disabled={disabled}
          aria-label="Master volume"
          aria-valuetext={masterReadout}
          data-testid="per-app-audio-mixer-master-slider"
          onChange={handleMasterVolumeChange}
          onKeyDown={handleMasterSliderKeyDown}
          className="prism-focus-ring w-full min-w-0 h-2 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ accentColor: masterBandColor }}
        />

        <div
          role="meter"
          aria-label="Master output level"
          aria-valuemin={MIN_VOLUME_PCT}
          aria-valuemax={MAX_VOLUME_PCT}
          aria-valuenow={effectiveMasterPct}
          aria-valuetext={masterReadout}
          data-testid="per-app-audio-mixer-master-level"
          data-band={masterLevelBand}
          data-lit-segments={String(litMasterSegments)}
          className={cx(
            meterClass,
            'prism-well rounded-full p-1 h-3 w-full min-w-0 flex items-stretch gap-0.5'
          )}
        >
          {MASTER_SEGMENT_INDICES.map((segmentIdx) => {
            const isLit = segmentIdx < litMasterSegments;
            return (
              <span
                key={`master-seg-${segmentIdx}`}
                aria-hidden="true"
                data-testid={`per-app-audio-mixer-master-segment-${segmentIdx}`}
                data-lit={isLit ? 'true' : 'false'}
                className="block flex-1 rounded-full transition-colors duration-100"
                style={{
                  backgroundColor: isLit
                    ? masterBandColor
                    : 'var(--prism-divider)',
                  opacity: isLit ? 1 : 0.45,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Per-App Channel Strips */}
      <div className={cx(channelsClass, 'flex flex-col gap-2 min-w-0')}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 min-w-0">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            Application Channels
          </span>
          <span
            data-testid="per-app-audio-mixer-active-count"
            className="font-mono text-[11px] font-medium tabular-nums whitespace-nowrap"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {activeChannelCount} / {currentState.channels.length} active
          </span>
        </div>

        {isEmpty ? (
          <div
            role="status"
            data-testid="per-app-audio-mixer-empty"
            className={cx(
              emptyClass,
              'prism-well rounded-2xl px-4 py-5 text-center text-xs font-medium min-w-0'
            )}
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            No active application audio channels. Start playback in an app to
            control its volume independently.
          </div>
        ) : (
          <div className="flex flex-col gap-2 min-w-0">
            {currentState.channels.map((channel) => {
              const tone = resolveChannelTone(channel.tone);
              const toneColorVar = getToneColorVar(tone);
              const effectivePct = computeEffectivePct(
                channel.volumePct,
                currentState.masterVolumePct,
                channel.muted,
                currentState.masterMuted
              );
              const isEffectivelyMuted = effectivePct === null;
              const effectiveReadout = isEffectivelyMuted
                ? 'Muted'
                : `${effectivePct}%`;

              return (
                <div
                  key={channel.id}
                  data-testid={`per-app-audio-mixer-channel-${channel.id}`}
                  data-muted={isEffectivelyMuted ? 'true' : undefined}
                  className={cx(
                    channelRowClass,
                    'prism-well rounded-2xl p-2.5 flex flex-col gap-2 min-w-0'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        aria-hidden="true"
                        data-testid={`per-app-audio-mixer-channel-dot-${channel.id}`}
                        data-tone={tone}
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: toneColorVar,
                          opacity: isEffectivelyMuted ? 0.45 : 1,
                        }}
                      />
                      <span
                        data-testid={`per-app-audio-mixer-channel-name-${channel.id}`}
                        className="text-xs font-semibold truncate min-w-0"
                        style={{
                          color: isEffectivelyMuted
                            ? 'var(--prism-text-secondary)'
                            : 'var(--prism-text-primary)',
                        }}
                      >
                        {channel.appName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={channel.muted}
                        aria-label={`Mute ${channel.appName}`}
                        data-testid={`per-app-audio-mixer-channel-mute-${channel.id}`}
                        data-muted={channel.muted ? 'true' : undefined}
                        onClick={() => handleToggleChannelMute(channel.id)}
                        className={cx(
                          'prism-focus-ring inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all',
                          channel.muted ? '' : 'prism-crystal'
                        )}
                        style={
                          channel.muted
                            ? {
                                backgroundColor: 'var(--prism-error-main)',
                                color: 'var(--prism-error-contrast)',
                              }
                            : { color: 'var(--prism-text-secondary)' }
                        }
                      >
                        {channel.muted ? (
                          <VolumeX
                            aria-hidden="true"
                            className="w-3.5 h-3.5 shrink-0"
                          />
                        ) : (
                          <Volume2
                            aria-hidden="true"
                            className="w-3.5 h-3.5 shrink-0"
                          />
                        )}
                      </button>

                      <span
                        data-testid={`per-app-audio-mixer-channel-readout-${channel.id}`}
                        className="font-mono text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 min-w-[3.25rem] text-right"
                        style={{
                          color: isEffectivelyMuted
                            ? 'var(--prism-text-disabled)'
                            : 'var(--prism-text-primary)',
                        }}
                      >
                        {effectiveReadout}
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={MIN_VOLUME_PCT}
                    max={MAX_VOLUME_PCT}
                    step={1}
                    value={channel.volumePct}
                    disabled={disabled}
                    aria-label={`${channel.appName} volume`}
                    aria-valuetext={effectiveReadout}
                    data-testid={`per-app-audio-mixer-channel-slider-${channel.id}`}
                    onChange={(event) =>
                      handleChannelVolumeChange(channel.id, event)
                    }
                    onKeyDown={(event) =>
                      handleChannelSliderKeyDown(channel.id, event)
                    }
                    className="prism-focus-ring w-full min-w-0 h-1.5 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      accentColor: isEffectivelyMuted
                        ? 'var(--prism-text-disabled)'
                        : toneColorVar,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Polite live status announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        data-testid="per-app-audio-mixer-live-status"
        className="sr-only"
      >
        {liveStatus || defaultLiveSummary}
      </div>
    </div>
  );
}

PerAppAudioMixer.displayName = 'PerAppAudioMixer';
