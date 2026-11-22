'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Gauge, Play, Sliders, Square } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type SequencerTrackTone = 'primary' | 'amber' | 'info' | 'emerald';

export type SequencerPresetId = 'house' | 'breakbeat' | 'clear';

export interface SequencerTrackSpec {
  /** Stable unique identifier for the track row and onStepTick active track ID reporting. */
  id: string;
  /** Visible track name rendered on the row header and used in accessible control labels. */
  name: string;
  /** Semantic --prism-* optical accent tone for active step pads and track indicator LED. */
  tone: SequencerTrackTone;
  /** When true, the track is excluded from onStepTick activeTrackIds and visually dimmed. */
  muted: boolean;
  /** Boolean step activations normalized to 16 steps (indices 0..15). */
  steps: ReadonlyArray<boolean>;
}

type StepSequencerMatrixBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface StepSequencerMatrixProps extends StepSequencerMatrixBaseProps {
  /** Visible heading rendered in the transport bar and accessible region label (defaults to 'Step Sequencer Matrix'). */
  title?: string;
  /** Controlled track specifications (each normalized to 16 steps). */
  tracks?: ReadonlyArray<SequencerTrackSpec>;
  /** Initial track specifications in uncontrolled mode (defaults to classic 4-track House groove). */
  defaultTracks?: ReadonlyArray<SequencerTrackSpec>;
  /** Initial tempo in BPM in uncontrolled mode, clamped to [60..200] (defaults to 120). */
  defaultBpm?: number;
  /** Controlled tempo in BPM, clamped to [60..200]. */
  bpm?: number;
  /** Callback fired when the BPM tempo slider changes. */
  onBpmChange?: (bpm: number) => void;
  /** Callback fired whenever any pad toggle, mute toggle, track clear, or preset mutates the pattern. */
  onPatternChange?: (tracks: ReadonlyArray<SequencerTrackSpec>) => void;
  /** Callback fired on every clock step tick with the active step index (0..15) and unmuted active track IDs. */
  onStepTick?: (stepIndex: number, activeTrackIds: ReadonlyArray<string>) => void;
  /** Disables transport, tempo slider, presets, track controls, and step pads; halts active clock. */
  disabled?: boolean;
}

interface StepColumnMeta {
  id: string;
  index: number;
  label: string;
  number: number;
  isDownbeat: boolean;
}

interface NormalizedSequencerTrack extends SequencerTrackSpec {
  rowIndex: number;
  renderKey: string;
  displayName: string;
}

interface ToneTokenSet {
  main: string;
  light: string;
  contrast: string;
}

interface DefaultTrackDef {
  id: string;
  name: string;
  tone: SequencerTrackTone;
}

interface PresetButtonDef {
  id: SequencerPresetId;
  label: string;
}

const STEP_COUNT = 16;
const MIN_BPM = 60;
const MAX_BPM = 200;
const DEFAULT_BPM = 120;
const DEFAULT_TITLE = 'Step Sequencer Matrix';

const STEP_COLUMNS: ReadonlyArray<StepColumnMeta> = Array.from({ length: STEP_COUNT }, (_, idx) => ({
  id: `step-${String(idx + 1).padStart(2, '0')}`,
  index: idx,
  label: String(idx + 1).padStart(2, '0'),
  number: idx + 1,
  isDownbeat: idx % 4 === 0,
}));

const DEFAULT_TRACK_DEFS: ReadonlyArray<DefaultTrackDef> = [
  { id: 'kick', name: 'Kick', tone: 'primary' },
  { id: 'snare', name: 'Snare', tone: 'amber' },
  { id: 'hi-hat', name: 'Hi-Hat', tone: 'info' },
  { id: 'synth', name: 'Synth', tone: 'emerald' },
];

const PRESET_BUTTONS: ReadonlyArray<PresetButtonDef> = [
  { id: 'house', label: 'House' },
  { id: 'breakbeat', label: 'Breakbeat' },
  { id: 'clear', label: 'Clear' },
];

function createEmptySteps(): boolean[] {
  return Array.from({ length: STEP_COUNT }, () => false);
}

function createStepsFromIndices(activeIndices: ReadonlyArray<number>): boolean[] {
  const activeSet = new Set<number>(activeIndices);
  return Array.from({ length: STEP_COUNT }, (_, idx) => activeSet.has(idx));
}

const HOUSE_ROWS: readonly [
  ReadonlyArray<boolean>,
  ReadonlyArray<boolean>,
  ReadonlyArray<boolean>,
  ReadonlyArray<boolean>,
] = [
  createStepsFromIndices([0, 4, 8, 12]),
  createStepsFromIndices([4, 12]),
  createStepsFromIndices([2, 6, 10, 14, 15]),
  createStepsFromIndices([0, 3, 6, 10, 13]),
];

const BREAKBEAT_ROWS: readonly [
  ReadonlyArray<boolean>,
  ReadonlyArray<boolean>,
  ReadonlyArray<boolean>,
  ReadonlyArray<boolean>,
] = [
  createStepsFromIndices([0, 6, 10]),
  createStepsFromIndices([4, 7, 12, 15]),
  createStepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
  createStepsFromIndices([0, 3, 8, 11, 14]),
];

function getPresetRowSteps(
  preset: 'house' | 'breakbeat',
  trackIndex: number
): ReadonlyArray<boolean> {
  const rows = preset === 'house' ? HOUSE_ROWS : BREAKBEAT_ROWS;
  const slot = ((trackIndex % 4) + 4) % 4;
  switch (slot) {
    case 0:
      return rows[0];
    case 1:
      return rows[1];
    case 2:
      return rows[2];
    default:
      return rows[3];
  }
}

function buildDefaultPresetTracks(preset: SequencerPresetId): SequencerTrackSpec[] {
  return DEFAULT_TRACK_DEFS.map((def, idx) => ({
    id: def.id,
    name: def.name,
    tone: def.tone,
    muted: false,
    steps: preset === 'clear' ? createEmptySteps() : [...getPresetRowSteps(preset, idx)],
  }));
}

function applyPresetToTracks(
  currentTracks: ReadonlyArray<SequencerTrackSpec>,
  preset: SequencerPresetId
): SequencerTrackSpec[] {
  if (currentTracks.length === 0) {
    return buildDefaultPresetTracks(preset);
  }
  if (preset === 'clear') {
    return currentTracks.map((track) => ({
      ...track,
      steps: createEmptySteps(),
    }));
  }
  return currentTracks.map((track, idx) => ({
    ...track,
    muted: false,
    steps: [...getPresetRowSteps(preset, idx)],
  }));
}

function sanitizeBpm(raw: number | undefined, fallback: number): number {
  if (raw === undefined || !Number.isFinite(raw)) {
    return fallback;
  }
  return Math.round(clampNumber(raw, MIN_BPM, MAX_BPM, fallback));
}

function formatStepReadout(stepIndex: number): string {
  return `Step ${String(stepIndex + 1).padStart(2, '0')}/${STEP_COUNT}`;
}

function getToneTokens(tone: SequencerTrackTone): ToneTokenSet {
  switch (tone) {
    case 'amber':
      return {
        main: 'var(--prism-warning-main)',
        light: 'var(--prism-primary-light)',
        contrast: 'var(--prism-warning-contrast)',
      };
    case 'info':
      return {
        main: 'var(--prism-info-main)',
        light: 'var(--prism-info-light)',
        contrast: 'var(--prism-info-contrast)',
      };
    case 'emerald':
      return {
        main: 'var(--prism-success-main)',
        light: 'var(--prism-success-light)',
        contrast: 'var(--prism-success-contrast)',
      };
    case 'primary':
      return {
        main: 'var(--prism-primary-main)',
        light: 'var(--prism-primary-light)',
        contrast: 'var(--prism-primary-contrast)',
      };
  }
}

function normalizeTrackList(
  rawTracks: ReadonlyArray<SequencerTrackSpec>
): ReadonlyArray<NormalizedSequencerTrack> {
  const seenIds = new Map<string, number>();

  return rawTracks.map((track, idx) => {
    const trimmedId = track.id.trim();
    const safeId = trimmedId.length > 0 ? trimmedId : `track-${idx + 1}`;
    const count = (seenIds.get(safeId) ?? 0) + 1;
    seenIds.set(safeId, count);

    const trimmedName = track.name.trim();
    const displayName = trimmedName.length > 0 ? trimmedName : `Track ${idx + 1}`;

    return {
      id: safeId,
      name: displayName,
      tone: track.tone,
      muted: Boolean(track.muted),
      steps: Array.from({ length: STEP_COUNT }, (_, stepIdx) => Boolean(track.steps[stepIdx])),
      rowIndex: idx,
      renderKey: count === 1 ? safeId : `${safeId}-${count}`,
      displayName,
    };
  });
}

function toPublicTrackSpec(track: NormalizedSequencerTrack): SequencerTrackSpec {
  return {
    id: track.id,
    name: track.name,
    tone: track.tone,
    muted: track.muted,
    steps: [...track.steps],
  };
}

function stepsEqual(a: ReadonlyArray<boolean>, b: ReadonlyArray<boolean>): boolean {
  for (let i = 0; i < STEP_COUNT; i += 1) {
    if (Boolean(a[i]) !== Boolean(b[i])) {
      return false;
    }
  }
  return true;
}

function detectMatchingPreset(
  tracks: ReadonlyArray<NormalizedSequencerTrack>
): SequencerPresetId | null {
  if (tracks.length === 0) return null;
  if (tracks.every((track) => track.steps.every((active) => !active))) {
    return 'clear';
  }
  if (tracks.every((track, idx) => stepsEqual(track.steps, getPresetRowSteps('house', idx)))) {
    return 'house';
  }
  if (tracks.every((track, idx) => stepsEqual(track.steps, getPresetRowSteps('breakbeat', idx)))) {
    return 'breakbeat';
  }
  return null;
}

function getPresetAnnouncement(preset: SequencerPresetId): string {
  switch (preset) {
    case 'house':
      return 'Loaded House preset';
    case 'breakbeat':
      return 'Loaded Breakbeat preset';
    case 'clear':
      return 'Cleared all sequencer tracks';
  }
}

export function StepSequencerMatrix({
  title = DEFAULT_TITLE,
  tracks,
  defaultTracks,
  defaultBpm = DEFAULT_BPM,
  bpm,
  onBpmChange,
  onPatternChange,
  onStepTick,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: StepSequencerMatrixProps) {
  const override = useComponentOverride('StepSequencerMatrix');

  const trimmedTitle = title.trim();
  const accessibleTitle = trimmedTitle.length > 0 ? trimmedTitle : DEFAULT_TITLE;

  const safeDefaultBpm = sanitizeBpm(defaultBpm, DEFAULT_BPM);
  const isBpmControlled = bpm !== undefined;
  const [uncontrolledBpm, setUncontrolledBpm] = useState<number>(safeDefaultBpm);
  const safeBpm = isBpmControlled
    ? sanitizeBpm(bpm, safeDefaultBpm)
    : sanitizeBpm(uncontrolledBpm, safeDefaultBpm);

  const isTracksControlled = tracks !== undefined;
  const [uncontrolledTracks, setUncontrolledTracks] = useState<ReadonlyArray<SequencerTrackSpec>>(
    () =>
      defaultTracks !== undefined
        ? defaultTracks.map((track) => ({ ...track, steps: [...track.steps] }))
        : buildDefaultPresetTracks('house')
  );

  const normalizedTracks = useMemo(
    () => normalizeTrackList(isTracksControlled ? tracks : uncontrolledTracks),
    [isTracksControlled, tracks, uncontrolledTracks]
  );

  const [playing, setPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>(
    `Stopped · ${safeBpm} BPM · ${formatStepReadout(0)}`
  );

  const isPlaying = playing && !disabled;

  const stepRef = useRef<number>(currentStep);
  stepRef.current = currentStep;

  const tracksRef = useRef<ReadonlyArray<NormalizedSequencerTrack>>(normalizedTracks);
  tracksRef.current = normalizedTracks;

  const onStepTickRef = useRef<StepSequencerMatrixProps['onStepTick']>(onStepTick);
  onStepTickRef.current = onStepTick;

  const padRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (disabled && playing) {
      setPlaying(false);
      stepRef.current = 0;
      setCurrentStep(0);
      setStatusMessage('Transport halted · Sequencer disabled');
    }
  }, [disabled, playing]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const intervalMs = Math.round(60000 / safeBpm / 4);
    const timerId = window.setInterval(() => {
      const nextStep = (stepRef.current + 1) % STEP_COUNT;
      stepRef.current = nextStep;
      setCurrentStep(nextStep);

      const activeTrackIds = tracksRef.current
        .filter((track) => !track.muted && Boolean(track.steps[nextStep]))
        .map((track) => track.id);

      onStepTickRef.current?.(nextStep, activeTrackIds);
    }, intervalMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isPlaying, safeBpm]);

  const commitTracks = useCallback(
    (nextTracks: ReadonlyArray<SequencerTrackSpec>) => {
      if (!isTracksControlled) {
        setUncontrolledTracks(nextTracks);
      }
      onPatternChange?.(nextTracks);
    },
    [isTracksControlled, onPatternChange]
  );

  const togglePad = useCallback(
    (targetRowIndex: number, stepIndex: number) => {
      let toggledTrackName = '';
      let nextStepActive = false;

      const nextTracks: SequencerTrackSpec[] = normalizedTracks.map((track) => {
        if (track.rowIndex !== targetRowIndex) {
          return toPublicTrackSpec(track);
        }
        toggledTrackName = track.displayName;
        nextStepActive = !track.steps[stepIndex];
        return {
          id: track.id,
          name: track.name,
          tone: track.tone,
          muted: track.muted,
          steps: track.steps.map((active, idx) => (idx === stepIndex ? nextStepActive : active)),
        };
      });

      commitTracks(nextTracks);
      setStatusMessage(
        `${toggledTrackName} step ${stepIndex + 1} ${nextStepActive ? 'active' : 'cleared'}`
      );
    },
    [commitTracks, normalizedTracks]
  );

  const handleToggleMute = useCallback(
    (targetRowIndex: number) => {
      let targetName = '';
      let nextMuted = false;

      const nextTracks: SequencerTrackSpec[] = normalizedTracks.map((track) => {
        if (track.rowIndex !== targetRowIndex) {
          return toPublicTrackSpec(track);
        }
        targetName = track.displayName;
        nextMuted = !track.muted;
        return {
          id: track.id,
          name: track.name,
          tone: track.tone,
          muted: nextMuted,
          steps: [...track.steps],
        };
      });

      commitTracks(nextTracks);
      setStatusMessage(`${nextMuted ? 'Muted' : 'Unmuted'} ${targetName}`);
    },
    [commitTracks, normalizedTracks]
  );

  const handleClearTrack = useCallback(
    (targetRowIndex: number) => {
      let targetName = '';

      const nextTracks: SequencerTrackSpec[] = normalizedTracks.map((track) => {
        if (track.rowIndex !== targetRowIndex) {
          return toPublicTrackSpec(track);
        }
        targetName = track.displayName;
        return {
          id: track.id,
          name: track.name,
          tone: track.tone,
          muted: track.muted,
          steps: createEmptySteps(),
        };
      });

      commitTracks(nextTracks);
      setStatusMessage(`Cleared ${targetName} track`);
    },
    [commitTracks, normalizedTracks]
  );

  const handleLoadPreset = useCallback(
    (preset: SequencerPresetId) => {
      const publicCurrent = normalizedTracks.map(toPublicTrackSpec);
      const nextTracks = applyPresetToTracks(publicCurrent, preset);
      commitTracks(nextTracks);
      setStatusMessage(getPresetAnnouncement(preset));
    },
    [commitTracks, normalizedTracks]
  );

  const handleTransportToggle = useCallback(() => {
    if (isPlaying) {
      setPlaying(false);
      stepRef.current = 0;
      setCurrentStep(0);
      setStatusMessage(`Stopped · Playhead reset to ${formatStepReadout(0)}`);
      return;
    }

    setPlaying(true);
    setStatusMessage(`Playing at ${safeBpm} BPM · ${formatStepReadout(stepRef.current)}`);
  }, [isPlaying, safeBpm]);

  const handleBpmInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const parsed = Number(event.target.value);
      const nextBpm = sanitizeBpm(parsed, safeBpm);
      if (!isBpmControlled) {
        setUncontrolledBpm(nextBpm);
      }
      onBpmChange?.(nextBpm);
      setStatusMessage(`Tempo set to ${nextBpm} BPM`);
    },
    [disabled, isBpmControlled, onBpmChange, safeBpm]
  );

  const handlePadKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, rowIndex: number, colIndex: number) => {
      if (disabled || event.nativeEvent.isComposing) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const nextCol = Math.max(0, colIndex - 1);
        padRefs.current.get(`${rowIndex}:${nextCol}`)?.focus();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextCol = Math.min(STEP_COUNT - 1, colIndex + 1);
        padRefs.current.get(`${rowIndex}:${nextCol}`)?.focus();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextRow = Math.max(0, rowIndex - 1);
        padRefs.current.get(`${nextRow}:${colIndex}`)?.focus();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextRow = Math.min(normalizedTracks.length - 1, rowIndex + 1);
        padRefs.current.get(`${nextRow}:${colIndex}`)?.focus();
        return;
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        togglePad(rowIndex, colIndex);
      }
    },
    [disabled, normalizedTracks.length, togglePad]
  );

  const matchedPreset = useMemo(
    () => detectMatchingPreset(normalizedTracks),
    [normalizedTracks]
  );

  const activePadCount = useMemo(
    () =>
      normalizedTracks.reduce(
        (sum, track) => sum + track.steps.filter(Boolean).length,
        0
      ),
    [normalizedTracks]
  );

  const unmutedTrackCount = useMemo(
    () => normalizedTracks.filter((track) => !track.muted).length,
    [normalizedTracks]
  );

  const stepReadout = formatStepReadout(currentStep);

  const merged = mergeProps({
    themeTarget: themeProps('step-sequencer-matrix', {
      playing: isPlaying,
      disabled,
      bpm: safeBpm,
      preset: matchedPreset ?? undefined,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-4 select-none',
      disabled ? 'opacity-60' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('step-sequencer-matrix', 'header');
  const transportClass = stableClassName('step-sequencer-matrix', 'transport');
  const tempoClass = stableClassName('step-sequencer-matrix', 'tempo');
  const presetsClass = stableClassName('step-sequencer-matrix', 'presets');
  const matrixClass = stableClassName('step-sequencer-matrix', 'matrix');
  const rowClass = stableClassName('step-sequencer-matrix', 'row');
  const padClass = stableClassName('step-sequencer-matrix', 'pad');
  const statusClass = stableClassName('step-sequencer-matrix', 'status');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={accessibleTitle}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Top Transport & Preset Bar */}
      <div
        className={cx(
          headerClass,
          'w-full max-w-full min-w-0 flex flex-wrap items-center justify-between gap-3'
        )}
      >
        <div className={cx(transportClass, 'flex flex-wrap items-center gap-2.5 min-w-0')}>
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="prism-crystal w-7 h-7 rounded-xl inline-flex items-center justify-center shrink-0"
              style={{ color: 'var(--prism-primary-main)' }}
            >
              <Sliders className="w-3.5 h-3.5" />
            </span>
            <h3
              data-testid="step-sequencer-title"
              className="text-sm font-semibold tracking-tight truncate"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {accessibleTitle}
            </h3>
          </div>

          <button
            type="button"
            disabled={disabled}
            aria-pressed={isPlaying}
            data-testid="step-sequencer-transport"
            onClick={handleTransportToggle}
            className={cx(
              'prism-focus-ring h-8 px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all',
              isPlaying ? 'prism-btn-primary' : 'prism-crystal'
            )}
            style={isPlaying ? undefined : { color: 'var(--prism-text-primary)' }}
          >
            {isPlaying ? (
              <Square aria-hidden="true" className="w-3 h-3 shrink-0" />
            ) : (
              <Play aria-hidden="true" className="w-3 h-3 shrink-0" />
            )}
            {isPlaying ? 'Stop' : 'Play'}
          </button>

          <span
            data-testid="step-sequencer-step-readout"
            data-playing={isPlaying ? 'true' : undefined}
            className="prism-well rounded-full px-3 py-1 font-mono text-xs font-bold tabular-nums whitespace-nowrap"
            style={{
              color: isPlaying ? 'var(--prism-primary-main)' : 'var(--prism-text-primary)',
              boxShadow: isPlaying
                ? 'inset 0 0 0 1px color-mix(in srgb, var(--prism-primary-main) 50%, transparent)'
                : undefined,
            }}
          >
            {stepReadout}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          {/* BPM Tempo Slider + Tabular Readout */}
          <div
            className={cx(
              tempoClass,
              'prism-well rounded-full px-3 py-1 flex items-center gap-2 min-w-0'
            )}
          >
            <Gauge
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            />
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              step={1}
              value={safeBpm}
              disabled={disabled}
              aria-label="Tempo BPM"
              data-testid="step-sequencer-bpm-slider"
              onChange={handleBpmInputChange}
              className="prism-focus-ring w-24 sm:w-28 h-1.5 rounded-full cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed accent-[var(--prism-primary-main)]"
            />
            <span
              data-testid="step-sequencer-bpm-readout"
              className="font-mono text-xs font-bold tabular-nums whitespace-nowrap min-w-[58px] text-right"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {safeBpm} BPM
            </span>
          </div>

          {/* Pattern Preset Controls */}
          <div
            role="group"
            aria-label="Pattern presets"
            className={cx(presetsClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
          >
            {PRESET_BUTTONS.map((preset) => {
              const isSelected = matchedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={disabled}
                  data-testid={`step-sequencer-preset-${preset.id}`}
                  data-active={isSelected ? 'true' : undefined}
                  onClick={() => handleLoadPreset(preset.id)}
                  className="prism-crystal prism-focus-ring h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
                  style={
                    isSelected
                      ? {
                          color: 'var(--prism-primary-main)',
                          backgroundColor:
                            'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
                          boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)',
                        }
                      : { color: 'var(--prism-text-primary)' }
                  }
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Pad Matrix inside Horizontal Scroll Wrapper */}
      <div className="overflow-x-auto">
        <div
          role="grid"
          aria-label={`${accessibleTitle} pattern grid`}
          className={cx(matrixClass, 'min-w-[680px] flex flex-col gap-2 py-0.5')}
        >
          {/* Step Header Row (01..16) */}
          <div role="row" className="flex items-center gap-2">
            <div
              role="columnheader"
              className="w-44 shrink-0 px-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Track · Mix
            </div>
            <div className="flex-1 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5">
              {STEP_COLUMNS.map((col) => {
                const isColPlayhead = isPlaying && currentStep === col.index;
                const headerStyle: CSSProperties = isColPlayhead
                  ? {
                      backgroundColor:
                        'color-mix(in srgb, var(--prism-primary-main) 22%, transparent)',
                      color: 'var(--prism-primary-main)',
                      boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)',
                    }
                  : col.isDownbeat
                    ? {
                        backgroundColor:
                          'color-mix(in srgb, var(--prism-text-secondary) 12%, transparent)',
                        color: 'var(--prism-text-primary)',
                      }
                    : {
                        color: 'var(--prism-text-secondary)',
                      };

                return (
                  <div
                    key={col.id}
                    role="columnheader"
                    data-testid={`step-header-${col.index}`}
                    data-downbeat={col.isDownbeat ? 'true' : undefined}
                    data-playhead={isColPlayhead ? 'true' : undefined}
                    className={cx(
                      'h-7 rounded-lg flex flex-col items-center justify-center font-mono text-[11px] tabular-nums transition-all',
                      col.isDownbeat || isColPlayhead ? 'font-bold' : 'font-medium'
                    )}
                    style={headerStyle}
                  >
                    <span>{col.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track Rows */}
          {normalizedTracks.length === 0 ? (
            <div
              role="row"
              data-testid="step-sequencer-empty"
              className="prism-well rounded-xl px-4 py-6 text-center text-xs font-medium"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <div role="gridcell">
                No sequencer tracks configured. Select House or Breakbeat to load a 4-track groove.
              </div>
            </div>
          ) : (
            normalizedTracks.map((track) => {
              const toneTokens = getToneTokens(track.tone);

              return (
                <div
                  key={track.renderKey}
                  role="row"
                  data-testid={`step-track-${track.rowIndex}`}
                  data-muted={track.muted ? 'true' : undefined}
                  className={cx(rowClass, 'flex items-center gap-2')}
                >
                  {/* Track Header & Controls */}
                  <div
                    role="rowheader"
                    className="prism-well w-44 shrink-0 h-11 px-2.5 rounded-xl flex items-center gap-1.5 min-w-0"
                    style={{
                      opacity: track.muted ? 0.72 : 1,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      data-testid={`track-tone-dot-${track.rowIndex}`}
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: track.muted
                          ? 'var(--prism-text-disabled)'
                          : toneTokens.main,
                        boxShadow: track.muted
                          ? undefined
                          : `0 0 8px color-mix(in srgb, ${toneTokens.main} 60%, transparent)`,
                      }}
                    />
                    <span
                      className="flex-1 min-w-0 truncate text-xs font-semibold"
                      style={{
                        color: track.muted
                          ? 'var(--prism-text-disabled)'
                          : 'var(--prism-text-primary)',
                      }}
                    >
                      {track.displayName}
                    </span>

                    <button
                      type="button"
                      disabled={disabled}
                      aria-pressed={track.muted}
                      aria-label={`Mute ${track.displayName}`}
                      data-testid={`track-mute-${track.rowIndex}`}
                      onClick={() => handleToggleMute(track.rowIndex)}
                      className={cx(
                        'prism-focus-ring h-6 min-w-[26px] px-1.5 rounded-md font-mono text-[11px] font-bold inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all',
                        track.muted ? '' : 'prism-crystal'
                      )}
                      style={
                        track.muted
                          ? {
                              backgroundColor: 'var(--prism-error-main)',
                              color: 'var(--prism-error-contrast)',
                              boxShadow: '0 0 0 1px var(--prism-error-main)',
                            }
                          : { color: 'var(--prism-text-secondary)' }
                      }
                    >
                      M
                    </button>

                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={`Clear ${track.displayName}`}
                      data-testid={`track-clear-${track.rowIndex}`}
                      onClick={() => handleClearTrack(track.rowIndex)}
                      className="prism-crystal prism-focus-ring h-6 px-1.5 rounded-md font-mono text-[10px] font-semibold inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      Clr
                    </button>
                  </div>

                  {/* 16 Tactile Step Pads */}
                  <div className="flex-1 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5">
                    {STEP_COLUMNS.map((col) => {
                      const active = Boolean(track.steps[col.index]);
                      const isColPlayhead = isPlaying && currentStep === col.index;

                      let padStyle: CSSProperties;
                      if (active && !track.muted) {
                        padStyle = {
                          backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${toneTokens.light} 48%, transparent) 0%, color-mix(in srgb, ${toneTokens.main} 78%, transparent) 100%)`,
                          borderColor: toneTokens.main,
                          boxShadow: isColPlayhead
                            ? `0 0 0 2px var(--prism-primary-main), 0 0 14px color-mix(in srgb, ${toneTokens.main} 65%, transparent)`
                            : `inset 0 1px 0 color-mix(in srgb, ${toneTokens.contrast} 45%, transparent), 0 4px 10px -4px color-mix(in srgb, ${toneTokens.main} 55%, transparent)`,
                        };
                      } else if (active && track.muted) {
                        padStyle = {
                          backgroundColor:
                            'color-mix(in srgb, var(--prism-text-disabled) 26%, transparent)',
                          borderColor:
                            'color-mix(in srgb, var(--prism-text-disabled) 48%, transparent)',
                          boxShadow: isColPlayhead
                            ? '0 0 0 2px var(--prism-primary-main)'
                            : undefined,
                        };
                      } else {
                        padStyle = {
                          backgroundColor: col.isDownbeat
                            ? 'color-mix(in srgb, var(--prism-text-secondary) 8%, transparent)'
                            : undefined,
                          borderColor: col.isDownbeat
                            ? 'color-mix(in srgb, var(--prism-text-secondary) 28%, transparent)'
                            : 'var(--prism-well-border)',
                          boxShadow: isColPlayhead
                            ? '0 0 0 2px var(--prism-primary-main)'
                            : undefined,
                        };
                      }

                      const ledColor = active
                        ? track.muted
                          ? 'var(--prism-text-disabled)'
                          : toneTokens.contrast
                        : isColPlayhead
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-divider)';

                      return (
                        <div key={`${track.renderKey}-${col.id}`} role="gridcell" className="min-w-0">
                          <button
                            type="button"
                            ref={(node) => {
                              const key = `${track.rowIndex}:${col.index}`;
                              if (node) {
                                padRefs.current.set(key, node);
                              } else {
                                padRefs.current.delete(key);
                              }
                            }}
                            disabled={disabled}
                            aria-pressed={active}
                            aria-label={`${track.displayName} step ${col.number}`}
                            data-testid={`step-pad-${track.rowIndex}-${col.index}`}
                            data-active={active ? 'true' : undefined}
                            data-downbeat={col.isDownbeat ? 'true' : undefined}
                            data-playhead={isColPlayhead ? 'true' : undefined}
                            data-muted={track.muted ? 'true' : undefined}
                            onClick={() => togglePad(track.rowIndex, col.index)}
                            onKeyDown={(e) => handlePadKeyDown(e, track.rowIndex, col.index)}
                            className={cx(
                              padClass,
                              'prism-focus-ring w-full h-11 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all',
                              active ? '' : 'prism-well'
                            )}
                            style={padStyle}
                          >
                            <span
                              aria-hidden="true"
                              className="w-4 h-1 rounded-full transition-all"
                              style={{ backgroundColor: ledColor }}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Polite Status Strip */}
      <div
        className={cx(
          statusClass,
          'prism-well w-full max-w-full min-w-0 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs'
        )}
      >
        <span
          role="status"
          aria-live="polite"
          data-testid="step-sequencer-status"
          className="font-medium min-w-0 truncate"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {statusMessage}
        </span>
        <span
          data-testid="step-sequencer-summary"
          className="font-mono text-[11px] tabular-nums whitespace-nowrap"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          {unmutedTrackCount}/{normalizedTracks.length} tracks · {activePadCount} steps lit
        </span>
      </div>
    </div>
  );
}

StepSequencerMatrix.displayName = 'StepSequencerMatrix';
