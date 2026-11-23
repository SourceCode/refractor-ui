'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Bell,
  BellOff,
  Bluetooth,
  BluetoothOff,
  Moon,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sun,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ControlCenterThemeChoice = 'light' | 'dark';

export interface ControlCenterTrack {
  /** Stable unique identifier for the track. */
  id: string;
  /** Visible title rendered in the Now Playing media card. */
  title: string;
  /** Performing artist or studio ensemble name. */
  artist: string;
  /** Formatted duration label (e.g. '3:42'). */
  durationLabel: string;
}

export interface ControlCenterState {
  /** Whether the Wi-Fi radio is enabled. */
  wifi: boolean;
  /** Whether the Bluetooth radio is enabled. */
  bluetooth: boolean;
  /** Whether Do Not Disturb focus mode is active. */
  doNotDisturb: boolean;
  /** Active optical appearance mode ('light' | 'dark'). */
  theme: ControlCenterThemeChoice;
  /** Display brightness percentage clamped to [0..100]. */
  brightnessPct: number;
  /** Output audio volume percentage clamped to [0..100]. */
  volumePct: number;
  /** Whether the mini Now Playing card is currently playing audio. */
  playing: boolean;
  /** Active index into the tracks list (safely wrapped to valid bounds). */
  trackIndex: number;
}

type ControlCenterGridBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ControlCenterGridProps extends ControlCenterGridBaseProps {
  /** Header title and accessible region landmark label (defaults to 'Control Center'). */
  title?: string;
  /** Controlled state snapshot for toggles, sliders, and media transport. */
  value?: ControlCenterState;
  /** Optional partial initial state used in uncontrolled mode. */
  defaultValue?: Partial<ControlCenterState>;
  /** Track queue for the Now Playing card (defaults to 3 built-in studio tracks). */
  tracks?: ReadonlyArray<ControlCenterTrack>;
  /** Callback fired with the complete sanitized state whenever any control updates. */
  onChange?: (state: ControlCenterState) => void;
  /** Disables all toggle tiles, sliders, and media transport controls. */
  disabled?: boolean;
}

interface ControlTileDescriptor {
  id: 'wifi' | 'bluetooth' | 'dnd' | 'theme';
  label: string;
  subtitle: string;
  pressed: boolean;
  highlighted: boolean;
  accentVar: string;
  contrastVar: string;
  icon: ReactNode;
  onToggle: () => void;
}

const DEFAULT_TITLE = 'Control Center';

export const DEFAULT_CONTROL_CENTER_TRACKS: ReadonlyArray<ControlCenterTrack> = [
  {
    id: 'track-refractive-resonance',
    title: 'Refractive Resonance',
    artist: 'Prism Acoustics',
    durationLabel: '3:42',
  },
  {
    id: 'track-caustic-horizon',
    title: 'Caustic Horizon',
    artist: 'Alabaster Ensemble',
    durationLabel: '4:18',
  },
  {
    id: 'track-alabaster-pulse',
    title: 'Alabaster Pulse',
    artist: 'Optic Synth Lab',
    durationLabel: '2:56',
  },
];

const EMPTY_TRACK_FALLBACK: ControlCenterTrack = {
  id: 'track-empty',
  title: 'No Track Queued',
  artist: 'System Audio Idle',
  durationLabel: '0:00',
};

export const DEFAULT_CONTROL_CENTER_STATE: ControlCenterState = {
  wifi: true,
  bluetooth: true,
  doNotDisturb: false,
  theme: 'light',
  brightnessPct: 80,
  volumePct: 65,
  playing: false,
  trackIndex: 0,
};

function sanitizePct(value: number | undefined, fallback: number): number {
  const safeFallback = Math.round(clampNumber(fallback, 0, 100, 0));
  if (value === undefined) return safeFallback;
  return Math.round(clampNumber(value, 0, 100, safeFallback));
}

function wrapTrackIndex(index: number | undefined, trackCount: number): number {
  if (trackCount <= 0 || index === undefined || !Number.isFinite(index)) {
    return 0;
  }
  const whole = Math.trunc(index);
  return ((whole % trackCount) + trackCount) % trackCount;
}

function sanitizeThemeChoice(
  choice: ControlCenterThemeChoice | undefined,
  fallback: ControlCenterThemeChoice
): ControlCenterThemeChoice {
  return choice === 'dark' || choice === 'light' ? choice : fallback;
}

function sanitizeControlCenterState(
  raw: Partial<ControlCenterState> | undefined,
  fallback: ControlCenterState,
  trackCount: number
): ControlCenterState {
  return {
    wifi: raw?.wifi ?? fallback.wifi,
    bluetooth: raw?.bluetooth ?? fallback.bluetooth,
    doNotDisturb: raw?.doNotDisturb ?? fallback.doNotDisturb,
    theme: sanitizeThemeChoice(raw?.theme, fallback.theme),
    brightnessPct: sanitizePct(raw?.brightnessPct, fallback.brightnessPct),
    volumePct: sanitizePct(raw?.volumePct, fallback.volumePct),
    playing: raw?.playing ?? fallback.playing,
    trackIndex: wrapTrackIndex(raw?.trackIndex ?? fallback.trackIndex, trackCount),
  };
}

function normalizeDisplayTrack(track: ControlCenterTrack | undefined): ControlCenterTrack {
  if (!track) return EMPTY_TRACK_FALLBACK;
  return {
    id: track.id.trim() || 'track',
    title: track.title.trim() || 'Untitled Track',
    artist: track.artist.trim() || 'Unknown Artist',
    durationLabel: track.durationLabel.trim() || '--:--',
  };
}

function ControlCenterGridInner({
  title = DEFAULT_TITLE,
  value,
  defaultValue,
  tracks,
  onChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ControlCenterGridProps) {
  const uid = useId();
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const brightnessInputId = `cc-brightness-${safeUid}`;
  const volumeInputId = `cc-volume-${safeUid}`;

  const override = useComponentOverride('ControlCenterGrid');

  const resolvedTitle = title.trim() || DEFAULT_TITLE;
  const resolvedTracks = tracks ?? DEFAULT_CONTROL_CENTER_TRACKS;
  const trackCount = resolvedTracks.length;

  const initialState = useMemo<ControlCenterState>(
    () =>
      sanitizeControlCenterState(
        defaultValue,
        DEFAULT_CONTROL_CENTER_STATE,
        trackCount
      ),
    [defaultValue, trackCount]
  );

  const isControlled = value !== undefined;
  const [uncontrolledState, setUncontrolledState] =
    useState<ControlCenterState>(initialState);
  const [announcement, setAnnouncement] = useState<string>('');

  const currentState = sanitizeControlCenterState(
    isControlled ? value : uncontrolledState,
    DEFAULT_CONTROL_CENTER_STATE,
    trackCount
  );

  const activeTrack = normalizeDisplayTrack(resolvedTracks[currentState.trackIndex]);

  const commitState = useCallback(
    (nextRaw: ControlCenterState, statusMessage: string) => {
      if (disabled) return;
      const next = sanitizeControlCenterState(nextRaw, currentState, trackCount);
      if (!isControlled) {
        setUncontrolledState(next);
      }
      setAnnouncement(statusMessage);
      onChange?.(next);
    },
    [currentState, disabled, isControlled, onChange, trackCount]
  );

  const handleToggleWifi = useCallback(() => {
    const nextWifi = !currentState.wifi;
    commitState(
      { ...currentState, wifi: nextWifi },
      nextWifi ? 'Wi-Fi enabled (Studio-5G)' : 'Wi-Fi turned off'
    );
  }, [commitState, currentState]);

  const handleToggleBluetooth = useCallback(() => {
    const nextBluetooth = !currentState.bluetooth;
    commitState(
      { ...currentState, bluetooth: nextBluetooth },
      nextBluetooth ? 'Bluetooth enabled (2 Devices)' : 'Bluetooth turned off'
    );
  }, [commitState, currentState]);

  const handleToggleDnd = useCallback(() => {
    const nextDnd = !currentState.doNotDisturb;
    commitState(
      { ...currentState, doNotDisturb: nextDnd },
      nextDnd ? 'Do Not Disturb active' : 'Do Not Disturb turned off'
    );
  }, [commitState, currentState]);

  const handleToggleTheme = useCallback(() => {
    const nextTheme: ControlCenterThemeChoice =
      currentState.theme === 'dark' ? 'light' : 'dark';
    commitState(
      { ...currentState, theme: nextTheme },
      nextTheme === 'dark'
        ? 'Theme switched to Obsidian Dark'
        : 'Theme switched to Alabaster Light'
    );
  }, [commitState, currentState]);

  const handleBrightnessChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextPct = sanitizePct(
        Number(event.target.value),
        currentState.brightnessPct
      );
      commitState(
        { ...currentState, brightnessPct: nextPct },
        `Display brightness set to ${nextPct}%`
      );
    },
    [commitState, currentState]
  );

  const handleVolumeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextPct = sanitizePct(
        Number(event.target.value),
        currentState.volumePct
      );
      commitState(
        { ...currentState, volumePct: nextPct },
        `Output volume set to ${nextPct}%`
      );
    },
    [commitState, currentState]
  );

  const handleTogglePlaying = useCallback(() => {
    const nextPlaying = !currentState.playing;
    commitState(
      { ...currentState, playing: nextPlaying },
      nextPlaying
        ? `Playing ${activeTrack.title}`
        : `Paused ${activeTrack.title}`
    );
  }, [activeTrack.title, commitState, currentState]);

  const handleStepTrack = useCallback(
    (delta: -1 | 1) => {
      const nextIndex = wrapTrackIndex(currentState.trackIndex + delta, trackCount);
      const nextTrack = normalizeDisplayTrack(resolvedTracks[nextIndex]);
      const statusMessage =
        trackCount === 0
          ? 'No tracks available in queue'
          : `${delta > 0 ? 'Next track' : 'Previous track'}: ${nextTrack.title}`;
      commitState({ ...currentState, trackIndex: nextIndex }, statusMessage);
    },
    [commitState, currentState, resolvedTracks, trackCount]
  );

  const handleImeSafeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement | HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) {
        event.preventDefault();
      }
    },
    []
  );

  const tiles: ReadonlyArray<ControlTileDescriptor> = [
    {
      id: 'wifi',
      label: 'Wi-Fi',
      subtitle: currentState.wifi ? 'Studio-5G' : 'Off',
      pressed: currentState.wifi,
      highlighted: currentState.wifi,
      accentVar: 'var(--prism-info-main)',
      contrastVar: 'var(--prism-info-contrast)',
      icon: currentState.wifi ? (
        <Wifi aria-hidden="true" className="w-4 h-4" />
      ) : (
        <WifiOff aria-hidden="true" className="w-4 h-4" />
      ),
      onToggle: handleToggleWifi,
    },
    {
      id: 'bluetooth',
      label: 'Bluetooth',
      subtitle: currentState.bluetooth ? '2 Devices' : 'Off',
      pressed: currentState.bluetooth,
      highlighted: currentState.bluetooth,
      accentVar: 'var(--prism-primary-main)',
      contrastVar: 'var(--prism-primary-contrast)',
      icon: currentState.bluetooth ? (
        <Bluetooth aria-hidden="true" className="w-4 h-4" />
      ) : (
        <BluetoothOff aria-hidden="true" className="w-4 h-4" />
      ),
      onToggle: handleToggleBluetooth,
    },
    {
      id: 'dnd',
      label: 'Do Not Disturb',
      subtitle: currentState.doNotDisturb ? 'Active' : 'Off',
      pressed: currentState.doNotDisturb,
      highlighted: currentState.doNotDisturb,
      accentVar: 'var(--prism-secondary-main)',
      contrastVar: 'var(--prism-secondary-contrast)',
      icon: currentState.doNotDisturb ? (
        <BellOff aria-hidden="true" className="w-4 h-4" />
      ) : (
        <Bell aria-hidden="true" className="w-4 h-4" />
      ),
      onToggle: handleToggleDnd,
    },
    {
      id: 'theme',
      label: 'Theme',
      subtitle:
        currentState.theme === 'dark' ? 'Obsidian Dark' : 'Alabaster Light',
      pressed: currentState.theme === 'dark',
      highlighted: true,
      accentVar:
        currentState.theme === 'dark'
          ? 'var(--prism-info-main)'
          : 'var(--prism-warning-main)',
      contrastVar:
        currentState.theme === 'dark'
          ? 'var(--prism-info-contrast)'
          : 'var(--prism-warning-contrast)',
      icon:
        currentState.theme === 'dark' ? (
          <Moon aria-hidden="true" className="w-4 h-4" />
        ) : (
          <Sun aria-hidden="true" className="w-4 h-4" />
        ),
      onToggle: handleToggleTheme,
    },
  ];

  const activeRadioCount =
    Number(currentState.wifi) +
    Number(currentState.bluetooth) +
    Number(currentState.doNotDisturb);

  const defaultStatusText = `Display ${currentState.brightnessPct}% · Volume ${currentState.volumePct}% · ${
    currentState.playing ? `Playing ${activeTrack.title}` : 'Paused'
  }`;

  const merged = mergeProps({
    themeTarget: themeProps('control-center-grid', {
      theme: currentState.theme,
      wifi: currentState.wifi,
      bluetooth: currentState.bluetooth,
      doNotDisturb: currentState.doNotDisturb,
      playing: currentState.playing,
      disabled,
    }),
    baseClassName:
      'prism-slab w-full min-w-0 max-w-full p-4 sm:p-5 space-y-3 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('control-center-grid', 'header');
  const tilesClass = stableClassName('control-center-grid', 'tiles');
  const tileClass = stableClassName('control-center-grid', 'tile');
  const slidersClass = stableClassName('control-center-grid', 'sliders');
  const mediaClass = stableClassName('control-center-grid', 'media');
  const statusClass = stableClassName('control-center-grid', 'status');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={resolvedTitle}
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
          <SlidersHorizontal
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color: disabled
                ? 'var(--prism-text-disabled)'
                : 'var(--prism-primary-main)',
            }}
          />
          <span
            data-testid="control-center-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {resolvedTitle}
          </span>
        </div>

        <span
          data-testid="control-center-active-badge"
          className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums shrink-0"
          style={STYLE_TEXT_SECONDARY}
        >
          {activeRadioCount} Active
        </span>
      </div>

      {/* 2x2 Large Pill Toggle Tiles */}
      <div
        role="group"
        aria-label="Quick settings toggles"
        className={cx(tilesClass, 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-0')}
      >
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            disabled={disabled}
            aria-pressed={tile.pressed}
            data-testid={`control-center-tile-${tile.id}`}
            data-active={tile.pressed ? 'true' : undefined}
            onClick={tile.onToggle}
            onKeyDown={handleImeSafeKeyDown}
            className={cx(
              tileClass,
              'prism-crystal prism-focus-ring w-full min-w-0 rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left transition-[color,background-color,border-color,opacity,transform] duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:brightness-105'
            )}
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: tile.highlighted
                ? `color-mix(in srgb, ${tile.accentVar} 52%, transparent)`
                : 'var(--prism-divider)',
              boxShadow: tile.highlighted
                ? `0 0 18px -5px color-mix(in srgb, ${tile.accentVar} 45%, transparent)`
                : undefined,
            }}
          >
            <span
              aria-hidden="true"
              data-testid={`control-center-tile-icon-${tile.id}`}
              className="w-9 h-9 rounded-full shrink-0 inline-flex items-center justify-center transition-colors duration-150"
              style={{
                backgroundColor: tile.highlighted
                  ? tile.accentVar
                  : 'color-mix(in srgb, var(--prism-text-secondary) 16%, transparent)',
                color: tile.highlighted
                  ? tile.contrastVar
                  : 'var(--prism-text-secondary)',
                boxShadow: tile.highlighted
                  ? `0 0 12px color-mix(in srgb, ${tile.accentVar} 50%, transparent)`
                  : undefined,
              }}
            >
              {tile.icon}
            </span>

            <span className="min-w-0 flex-1 flex flex-col">
              <span
                className="text-xs font-semibold tracking-tight truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                {tile.label}
              </span>
              <span
                data-testid={`control-center-tile-subtitle-${tile.id}`}
                className="text-[11px] font-medium truncate"
                style={{
                  color: tile.highlighted
                    ? tile.accentVar
                    : 'var(--prism-text-secondary)',
                }}
              >
                {tile.subtitle}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Display Brightness & Sound Volume Sliders */}
      <div
        className={cx(
          slidersClass,
          'prism-crystal rounded-2xl p-3.5 space-y-3 min-w-0'
        )}
      >
        {/* Display Brightness */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <label
              htmlFor={brightnessInputId}
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight min-w-0"
              style={STYLE_TEXT_PRIMARY}
            >
              <Sun
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0"
                style={STYLE_WARNING_MAIN}
              />
              <span className="truncate">Display</span>
            </label>

            <span
              data-testid="control-center-brightness-pill"
              className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums min-w-[3rem] text-center shrink-0"
              style={STYLE_TEXT_PRIMARY}
            >
              {currentState.brightnessPct}%
            </span>
          </div>

          <div
            className={cx(
              'relative h-7 flex items-center',
              disabled ? 'opacity-50' : ''
            )}
          >
            <div className="prism-well w-full h-3 rounded-full overflow-hidden p-0.5">
              <div
                data-testid="control-center-brightness-fill"
                className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                style={{
                  width: `${currentState.brightnessPct}%`,
                  backgroundColor: 'var(--prism-warning-main)',
                }}
              />
            </div>
            <input
              id={brightnessInputId}
              type="range"
              min={0}
              max={100}
              step={1}
              value={currentState.brightnessPct}
              disabled={disabled}
              aria-label="Display brightness"
              aria-valuetext={`${currentState.brightnessPct}%`}
              onChange={handleBrightnessChange}
              onKeyDown={handleImeSafeKeyDown}
              className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div
              aria-hidden="true"
              className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 transition-[color,background-color,border-color,opacity,transform] duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
              style={{ left: `${currentState.brightnessPct}%` }}
            />
          </div>
        </div>

        {/* Output Volume */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <label
              htmlFor={volumeInputId}
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight min-w-0"
              style={STYLE_TEXT_PRIMARY}
            >
              {currentState.volumePct === 0 ? (
                <VolumeX
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                />
              ) : (
                <Volume2
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0"
                  style={STYLE_PRIMARY_MAIN}
                />
              )}
              <span className="truncate">Sound</span>
            </label>

            <span
              data-testid="control-center-volume-pill"
              className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums min-w-[3rem] text-center shrink-0"
              style={STYLE_TEXT_PRIMARY}
            >
              {currentState.volumePct}%
            </span>
          </div>

          <div
            className={cx(
              'relative h-7 flex items-center',
              disabled ? 'opacity-50' : ''
            )}
          >
            <div className="prism-well w-full h-3 rounded-full overflow-hidden p-0.5">
              <div
                data-testid="control-center-volume-fill"
                className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                style={{
                  width: `${currentState.volumePct}%`,
                  backgroundColor: 'var(--prism-primary-main)',
                }}
              />
            </div>
            <input
              id={volumeInputId}
              type="range"
              min={0}
              max={100}
              step={1}
              value={currentState.volumePct}
              disabled={disabled}
              aria-label="Output volume"
              aria-valuetext={`${currentState.volumePct}%`}
              onChange={handleVolumeChange}
              onKeyDown={handleImeSafeKeyDown}
              className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div
              aria-hidden="true"
              className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 transition-[color,background-color,border-color,opacity,transform] duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
              style={{ left: `${currentState.volumePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mini Now Playing Media Card */}
      <div
        role="group"
        aria-label="Now Playing"
        data-testid="control-center-media-card"
        className={cx(
          mediaClass,
          'prism-crystal rounded-2xl p-3.5 space-y-3 min-w-0'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span
              aria-hidden="true"
              className="prism-well w-10 h-10 rounded-xl shrink-0 inline-flex items-center justify-center transition-colors duration-150"
              style={{
                color: currentState.playing
                  ? 'var(--prism-secondary-main)'
                  : 'var(--prism-text-secondary)',
                boxShadow: currentState.playing
                  ? '0 0 14px -3px color-mix(in srgb, var(--prism-secondary-main) 50%, transparent)'
                  : undefined,
              }}
            >
              <Music aria-hidden="true" className="w-4 h-4" />
            </span>

            <div className="min-w-0 flex-1">
              <div
                className="text-[10px] font-semibold uppercase tracking-wider truncate"
                style={{
                  color: currentState.playing
                    ? 'var(--prism-secondary-main)'
                    : 'var(--prism-text-secondary)',
                }}
              >
                {currentState.playing ? 'Now Playing' : 'Media Ready'}
              </div>
              <div
                data-testid="control-center-track-title"
                className="text-xs font-semibold tracking-tight truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                {activeTrack.title}
              </div>
              <div
                data-testid="control-center-track-artist"
                className="text-[11px] truncate"
                style={STYLE_TEXT_SECONDARY}
              >
                {activeTrack.artist}
              </div>
            </div>
          </div>

          <span
            data-testid="control-center-track-duration"
            className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {activeTrack.durationLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span
            data-testid="control-center-track-position"
            className="font-mono text-[11px] tabular-nums"
            style={STYLE_TEXT_SECONDARY}
          >
            {trackCount === 0
              ? '0 / 0'
              : `${currentState.trackIndex + 1} / ${trackCount}`}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={disabled}
              aria-label="Previous Track"
              data-testid="control-center-prev-track"
              onClick={() => handleStepTrack(-1)}
              onKeyDown={handleImeSafeKeyDown}
              className="prism-crystal prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center transition-opacity cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:brightness-105"
              style={STYLE_TEXT_PRIMARY}
            >
              <SkipBack aria-hidden="true" className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={disabled}
              aria-label={currentState.playing ? 'Pause' : 'Play'}
              aria-pressed={currentState.playing}
              data-testid="control-center-play-toggle"
              onClick={handleTogglePlaying}
              onKeyDown={handleImeSafeKeyDown}
              className={cx(
                currentState.playing ? 'prism-btn-primary' : 'prism-crystal',
                'prism-focus-ring w-9 h-9 rounded-full inline-flex items-center justify-center transition-opacity cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:brightness-105'
              )}
              style={
                currentState.playing
                  ? undefined
                  : { color: 'var(--prism-text-primary)' }
              }
            >
              {currentState.playing ? (
                <Pause aria-hidden="true" className="w-4 h-4" />
              ) : (
                <Play aria-hidden="true" className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              disabled={disabled}
              aria-label="Next Track"
              data-testid="control-center-next-track"
              onClick={() => handleStepTrack(1)}
              onKeyDown={handleImeSafeKeyDown}
              className="prism-crystal prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center transition-opacity cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:brightness-105"
              style={STYLE_TEXT_PRIMARY}
            >
              <SkipForward aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Polite Status Strip */}
      <div
        className={cx(
          statusClass,
          'prism-well rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 max-w-full'
        )}
      >
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="control-center-status"
          className="font-mono text-[11px] font-medium tabular-nums truncate min-w-0"
          style={STYLE_TEXT_PRIMARY}
        >
          {announcement || defaultStatusText}
        </div>

        <span
          data-testid="control-center-theme-badge"
          className="font-mono text-[10px] font-semibold uppercase tracking-wider shrink-0"
          style={{
            color:
              currentState.theme === 'dark'
                ? 'var(--prism-info-main)'
                : 'var(--prism-warning-main)',
          }}
        >
          {currentState.theme === 'dark' ? 'Obsidian' : 'Alabaster'}
        </span>
      </div>
    </div>
  );
}

export const ControlCenterGrid = memo(ControlCenterGridInner);
ControlCenterGrid.displayName = 'ControlCenterGrid';
