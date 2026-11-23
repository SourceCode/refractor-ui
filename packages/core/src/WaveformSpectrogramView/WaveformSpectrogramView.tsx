'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { AudioWaveform, RotateCcw, Scissors, VolumeX } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_PRIMARY_MAIN, STYLE_SECONDARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type AudioCanvasMode = 'waveform' | 'spectrogram' | 'split';

export type AudioZoomLevel = 1 | 2 | 4;

export type AudioEditAction = 'silence' | 'cut' | 'reset';

export interface AudioSelectionRange {
  /** Selection start position as a percentage of clip duration (0..100). */
  startPct: number;
  /** Selection end position as a percentage of clip duration (0..100). */
  endPct: number;
}

export interface WaveformSpectrogramViewProps extends BaseProps<HTMLDivElement> {
  /** Normalized sample amplitudes in [0..1] (defaults to a deterministic 48-sample transient vocal waveform). */
  samples?: ReadonlyArray<number>;
  /** Total audio duration in seconds, clamped to >= 0.5 (defaults to 12.5). */
  durationSec?: number;
  /** Controlled display mode ('waveform' | 'spectrogram' | 'split'). */
  mode?: AudioCanvasMode;
  /** Initial uncontrolled display mode (defaults to 'split'). */
  defaultMode?: AudioCanvasMode;
  /** Callback fired whenever the canvas display mode changes. */
  onModeChange?: (mode: AudioCanvasMode) => void;
  /** Controlled selection range in percentages [0..100], or null when cleared. */
  selection?: AudioSelectionRange | null;
  /** Initial uncontrolled selection range (defaults to null). */
  defaultSelection?: AudioSelectionRange | null;
  /** Callback fired whenever the active selection range changes or is cleared. */
  onSelectionChange?: (selection: AudioSelectionRange | null) => void;
  /** Callback fired after Silence Selection, Cut Selection, or Reset Audio edits the sample buffer. */
  onEditSamples?: (nextSamples: number[], action: AudioEditAction) => void;
  /** Card heading title linked to the region via aria-labelledby (defaults to 'Audio Waveform & Spectrogram'). */
  title?: string;
  /** Disables all view mode, zoom, selection, and sample-editing interactions (defaults to false). */
  disabled?: boolean;
}

type DragKind = 'select' | 'start' | 'end' | null;

interface ModeOption {
  id: AudioCanvasMode;
  label: string;
}

interface ZoomOption {
  value: AudioZoomLevel;
  label: string;
}

interface WaveformBarGeometry {
  key: string;
  sampleIndex: number;
  amplitude: number;
  x: number;
  centerX: number;
  width: number;
  posY: number;
  negY: number;
  halfHeight: number;
  isTransientPeak: boolean;
  inSelection: boolean;
}

interface SpectrogramCellGeometry {
  key: string;
  bandIndex: number;
  sampleIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  energy: number;
  fill: string;
  opacity: number;
}

export const DEFAULT_DURATION_SEC = 12.5;
export const MIN_DURATION_SEC = 0.5;
export const TRANSIENT_PEAK_THRESHOLD = 0.82;
export const SPECTROGRAM_BAND_COUNT = 6;

const SELECTION_STEP_PCT = 2;
const SELECTION_PAGE_STEP_PCT = 10;
const MIN_HANDLE_GAP_PCT = 1;

const CANVAS_WIDTH = 440;
const CANVAS_HEIGHT = 160;
const PLOT_LEFT = 12;
const PLOT_RIGHT = 428;
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
const PLOT_TOP = 10;
const PLOT_BOTTOM = 150;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;

const SPLIT_WAVEFORM_TOP = 10;
const SPLIT_WAVEFORM_HEIGHT = 66;
const SPLIT_DIVIDER_Y = 80;
const SPLIT_SPECTROGRAM_TOP = 84;
const SPLIT_SPECTROGRAM_HEIGHT = 66;

const MODE_OPTIONS: ReadonlyArray<ModeOption> = [
  { id: 'waveform', label: 'Waveform' },
  { id: 'spectrogram', label: 'Spectrogram' },
  { id: 'split', label: 'Split' },
];

const ZOOM_OPTIONS: ReadonlyArray<ZoomOption> = [
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
];

/** Deterministic 48-sample transient vocal waveform with peaks above 0.82. */
export const DEFAULT_AUDIO_SAMPLES: ReadonlyArray<number> = [
  0.08, 0.14, 0.28, 0.52, 0.78, 0.88, 0.72, 0.46,
  0.34, 0.22, 0.16, 0.12, 0.24, 0.56, 0.84, 0.94,
  0.81, 0.64, 0.49, 0.32, 0.18, 0.11, 0.09, 0.26,
  0.48, 0.74, 0.91, 0.86, 0.68, 0.51, 0.36, 0.21,
  0.14, 0.19, 0.42, 0.69, 0.85, 0.77, 0.58, 0.39,
  0.27, 0.18, 0.29, 0.61, 0.83, 0.54, 0.26, 0.11,
];

function roundOne(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function sanitizeDuration(raw: number): number {
  if (!Number.isFinite(raw)) {
    return DEFAULT_DURATION_SEC;
  }
  return Math.max(MIN_DURATION_SEC, raw);
}

function sanitizeSamples(raw: ReadonlyArray<number>): number[] {
  const result: number[] = [];
  for (const val of raw) {
    result.push(clampNumber(val, 0, 1, 0));
  }
  return result;
}

function normalizeSelection(
  range: AudioSelectionRange | null | undefined
): AudioSelectionRange | null {
  if (!range) {
    return null;
  }
  const a = roundOne(clampNumber(range.startPct, 0, 100, 0));
  const b = roundOne(clampNumber(range.endPct, 0, 100, 100));
  return {
    startPct: Math.min(a, b),
    endPct: Math.max(a, b),
  };
}

function formatSeconds(seconds: number): string {
  return `${roundTwo(Math.max(0, seconds)).toFixed(2)}s`;
}

function formatPeakDb(peakAmplitude: number): string {
  if (peakAmplitude <= 0) {
    return '-∞ dB';
  }
  const db = roundOne(20 * Math.log10(peakAmplitude));
  return `${db.toFixed(1)} dB`;
}

function pctToCanvasX(pct: number): number {
  return roundTwo(PLOT_LEFT + (clampNumber(pct, 0, 100, 0) / 100) * PLOT_WIDTH);
}

function computeSpectralEnergy(
  amplitude: number,
  prevAmplitude: number,
  sampleIndex: number,
  bandIndex: number
): number {
  if (amplitude <= 0) {
    return 0;
  }
  const transientDelta = Math.abs(amplitude - prevAmplitude);
  const harmonicWave = 0.5 + 0.5 * Math.sin((sampleIndex + 1) * (bandIndex + 1) * 0.73);
  const bandWeight =
    bandIndex >= 4
      ? 0.92 - (5 - bandIndex) * 0.08
      : bandIndex >= 2
        ? 0.76 + harmonicWave * 0.24
        : 0.44 + harmonicWave * 0.22;
  const transientBoost = bandIndex <= 1 ? transientDelta * 0.85 : transientDelta * 0.25;
  return clampNumber(amplitude * bandWeight + transientBoost, 0.05, 1, 0.05);
}

function getSpectrogramFill(energy: number): string {
  if (energy >= 0.66) {
    return 'var(--prism-primary-main)';
  }
  if (energy >= 0.33) {
    return 'var(--prism-secondary-main)';
  }
  return 'var(--prism-info-main)';
}

function resolveSelectionSampleBounds(
  sampleCount: number,
  selection: AudioSelectionRange
): { startIdx: number; endIdx: number } {
  const startIdx = Math.max(
    0,
    Math.min(sampleCount - 1, Math.floor((selection.startPct / 100) * sampleCount))
  );
  const endIdx = Math.max(
    startIdx + 1,
    Math.min(sampleCount, Math.ceil((selection.endPct / 100) * sampleCount))
  );
  return { startIdx, endIdx };
}

const headerClass = /*#__PURE__*/ stableClassName('waveform-spectrogram-view', 'header');
const toolbarClass = /*#__PURE__*/ stableClassName('waveform-spectrogram-view', 'toolbar');
const canvasWellClass = /*#__PURE__*/ stableClassName('waveform-spectrogram-view', 'canvas-well');
const telemetryClass = /*#__PURE__*/ stableClassName('waveform-spectrogram-view', 'telemetry');

function WaveformSpectrogramViewInner({
  samples,
  durationSec = DEFAULT_DURATION_SEC,
  mode,
  defaultMode = 'split',
  onModeChange,
  selection,
  defaultSelection = null,
  onSelectionChange,
  onEditSamples,
  title = 'Audio Waveform & Spectrogram',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: WaveformSpectrogramViewProps) {
  const override = useComponentOverride('WaveformSpectrogramView');
  const headingId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const tabButtonRefs = useRef<Map<AudioCanvasMode, HTMLButtonElement | null>>(new Map());
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const safeDurationSec = sanitizeDuration(durationSec);
  const sourceSamples = useMemo(
    () => sanitizeSamples(samples ?? DEFAULT_AUDIO_SAMPLES),
    [samples]
  );

  const [editedSamples, setEditedSamples] = useState<number[] | null>(null);
  const [syncedSource, setSyncedSource] = useState<ReadonlyArray<number>>(sourceSamples);
  if (syncedSource !== sourceSamples) {
    setSyncedSource(sourceSamples);
    setEditedSamples(null);
  }

  const workingSamples = editedSamples ?? sourceSamples;
  const isModified = editedSamples !== null;

  const [activeMode, setActiveMode] = useControllableState<AudioCanvasMode>({
    value: mode,
    defaultValue: defaultMode,
    onChange: onModeChange,
  });

  const controlledSelection =
    selection === undefined ? undefined : normalizeSelection(selection);

  const [rawSelection, setRawSelection] = useControllableState<AudioSelectionRange | null>({
    value: controlledSelection,
    defaultValue: normalizeSelection(defaultSelection),
    onChange: onSelectionChange,
  });

  const activeSelection = normalizeSelection(rawSelection);
  const hasActiveSelection =
    activeSelection !== null && activeSelection.endPct > activeSelection.startPct;

  const [zoom, setZoom] = useState<AudioZoomLevel>(1);
  const [activeDrag, setActiveDrag] = useState<DragKind>(null);

  const effectiveDurationSec =
    editedSamples !== null && sourceSamples.length > 0
      ? roundTwo((safeDurationSec * workingSamples.length) / sourceSamples.length)
      : safeDurationSec;

  const peakAmplitude = useMemo(() => {
    let peak = 0;
    for (const amp of workingSamples) {
      if (amp > peak) peak = amp;
    }
    return peak;
  }, [workingSamples]);

  const stopActiveDrag = useCallback(() => {
    cleanupDragRef.current?.();
    cleanupDragRef.current = null;
    setActiveDrag(null);
  }, []);

  useEffect(() => {
    if (disabled || workingSamples.length === 0) {
      stopActiveDrag();
    }
  }, [disabled, workingSamples.length, stopActiveDrag]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
      cleanupDragRef.current = null;
    };
  }, []);

  const commitSelection = useCallback(
    (next: AudioSelectionRange | null) => {
      const normalized = normalizeSelection(next);
      if (
        normalized !== null &&
        activeSelection !== null &&
        normalized.startPct === activeSelection.startPct &&
        normalized.endPct === activeSelection.endPct
      ) {
        return;
      }
      setRawSelection(normalized);
    },
    [activeSelection, setRawSelection]
  );

  const moveSelectionHandle = useCallback(
    (handle: 'start' | 'end', targetPct: number) => {
      const baseStart = activeSelection ? activeSelection.startPct : 0;
      const baseEnd = activeSelection ? activeSelection.endPct : 100;

      if (handle === 'start') {
        const clampedStart = roundOne(
          clampNumber(targetPct, 0, Math.max(0, baseEnd - MIN_HANDLE_GAP_PCT), baseStart)
        );
        commitSelection({ startPct: clampedStart, endPct: baseEnd });
      } else {
        const clampedEnd = roundOne(
          clampNumber(targetPct, Math.min(100, baseStart + MIN_HANDLE_GAP_PCT), 100, baseEnd)
        );
        commitSelection({ startPct: baseStart, endPct: clampedEnd });
      }
    },
    [activeSelection, commitSelection]
  );

  const latestDragActionsRef = useRef({ commitSelection, moveSelectionHandle });
  latestDragActionsRef.current = { commitSelection, moveSelectionHandle };

  const clientXToPct = useCallback((clientX: number): number | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !Number.isFinite(rect.width) || rect.width <= 0) {
      return null;
    }
    const svgX = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const ratio = clampNumber((svgX - PLOT_LEFT) / PLOT_WIDTH, 0, 1, 0);
    return roundOne(ratio * 100);
  }, []);

  const attachWindowDrag = useCallback(
    (kind: Exclude<DragKind, null>, onMove: (moveEvent: PointerEvent) => void) => {
      cleanupDragRef.current?.();
      setActiveDrag(kind);

      const coalescedMove = createCoalescedPointerMove(onMove);

      const handleEnd = () => {
        coalescedMove.cancel();
        window.removeEventListener('pointermove', coalescedMove);
        window.removeEventListener('pointerup', handleEnd);
        window.removeEventListener('pointercancel', handleEnd);
        cleanupDragRef.current = null;
        setActiveDrag(null);
      };

      const cleanup = () => {
        coalescedMove.cancel();
        window.removeEventListener('pointermove', coalescedMove);
        window.removeEventListener('pointerup', handleEnd);
        window.removeEventListener('pointercancel', handleEnd);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', coalescedMove, { passive: true });
      window.addEventListener('pointerup', handleEnd);
      window.addEventListener('pointercancel', handleEnd);
    },
    []
  );

  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (disabled || workingSamples.length === 0 || event.button > 0) return;
      const anchorPct = clientXToPct(event.clientX);
      if (anchorPct === null) return;

      event.preventDefault();
      attachWindowDrag('select', (moveEvent: PointerEvent) => {
        const currentPct = clientXToPct(moveEvent.clientX);
        if (currentPct === null || currentPct === anchorPct) return;
        latestDragActionsRef.current.commitSelection({
          startPct: Math.min(anchorPct, currentPct),
          endPct: Math.max(anchorPct, currentPct),
        });
      });
    },
    [disabled, workingSamples.length, clientXToPct, attachWindowDrag]
  );

  const handleEdgePointerDown = useCallback(
    (handle: 'start' | 'end') => (event: ReactPointerEvent<SVGGElement>) => {
      event.stopPropagation();
      if (disabled || workingSamples.length === 0 || event.button > 0) return;
      if (clientXToPct(event.clientX) === null) return;

      event.preventDefault();
      attachWindowDrag(handle, (moveEvent: PointerEvent) => {
        const nextPct = clientXToPct(moveEvent.clientX);
        if (nextPct === null) return;
        latestDragActionsRef.current.moveSelectionHandle(handle, nextPct);
      });
    },
    [disabled, workingSamples.length, clientXToPct, attachWindowDrag]
  );

  const handleHandleKeyDown = useCallback(
    (handle: 'start' | 'end') => (event: ReactKeyboardEvent<SVGGElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;
      const baseStart = activeSelection ? activeSelection.startPct : 0;
      const baseEnd = activeSelection ? activeSelection.endPct : 100;
      const current = handle === 'start' ? baseStart : baseEnd;

      if (event.key === 'Escape') {
        if (activeSelection !== null) {
          event.preventDefault();
          commitSelection(null);
        }
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        moveSelectionHandle(handle, current - SELECTION_STEP_PCT);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveSelectionHandle(handle, current + SELECTION_STEP_PCT);
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        moveSelectionHandle(handle, current - SELECTION_PAGE_STEP_PCT);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        moveSelectionHandle(handle, current + SELECTION_PAGE_STEP_PCT);
      } else if (event.key === 'Home') {
        event.preventDefault();
        moveSelectionHandle(handle, handle === 'start' ? 0 : baseStart + MIN_HANDLE_GAP_PCT);
      } else if (event.key === 'End') {
        event.preventDefault();
        moveSelectionHandle(handle, handle === 'start' ? baseEnd - MIN_HANDLE_GAP_PCT : 100);
      }
    },
    [disabled, activeSelection, commitSelection, moveSelectionHandle]
  );

  const selectMode = useCallback(
    (nextMode: AudioCanvasMode) => {
      if (disabled || nextMode === activeMode) return;
      setActiveMode(nextMode);
    },
    [disabled, activeMode, setActiveMode]
  );

  const handleModeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, currentMode: AudioCanvasMode) => {
      if (disabled || event.nativeEvent.isComposing) return;
      const currentIndex = MODE_OPTIONS.findIndex((opt) => opt.id === currentMode);
      let nextIndex: number;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % MODE_OPTIONS.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + MODE_OPTIONS.length) % MODE_OPTIONS.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = MODE_OPTIONS.length - 1;
      } else {
        return;
      }

      const target = MODE_OPTIONS[nextIndex]!;
      event.preventDefault();
      selectMode(target.id);
      tabButtonRefs.current.get(target.id)?.focus();
    },
    [disabled, selectMode]
  );

  const handleSilenceSelection = useCallback(() => {
    if (disabled || !activeSelection || !hasActiveSelection || workingSamples.length === 0) {
      return;
    }
    const { startIdx, endIdx } = resolveSelectionSampleBounds(
      workingSamples.length,
      activeSelection
    );
    const nextSamples = [...workingSamples];
    for (let i = startIdx; i < endIdx; i += 1) {
      nextSamples[i] = 0;
    }
    setEditedSamples(nextSamples);
    onEditSamples?.(nextSamples, 'silence');
  }, [disabled, activeSelection, hasActiveSelection, workingSamples, onEditSamples]);

  const handleCutSelection = useCallback(() => {
    if (disabled || !activeSelection || !hasActiveSelection || workingSamples.length === 0) {
      return;
    }
    const { startIdx, endIdx } = resolveSelectionSampleBounds(
      workingSamples.length,
      activeSelection
    );
    const nextSamples = [
      ...workingSamples.slice(0, startIdx),
      ...workingSamples.slice(endIdx),
    ];
    setEditedSamples(nextSamples);
    commitSelection(null);
    onEditSamples?.(nextSamples, 'cut');
  }, [disabled, activeSelection, hasActiveSelection, workingSamples, commitSelection, onEditSamples]);

  const handleResetAudio = useCallback(() => {
    if (disabled) return;
    const restored = [...sourceSamples];
    setEditedSamples(null);
    onEditSamples?.(restored, 'reset');
  }, [disabled, sourceSamples, onEditSamples]);

  const showWaveform = activeMode === 'waveform' || activeMode === 'split';
  const showSpectrogram = activeMode === 'spectrogram' || activeMode === 'split';

  const waveformTop = activeMode === 'split' ? SPLIT_WAVEFORM_TOP : PLOT_TOP;
  const waveformHeight = activeMode === 'split' ? SPLIT_WAVEFORM_HEIGHT : PLOT_HEIGHT;
  const waveformMidY = roundTwo(waveformTop + waveformHeight / 2);
  const waveformMaxHalfH = roundTwo(waveformHeight / 2 - 5);

  const spectrogramTop = activeMode === 'split' ? SPLIT_SPECTROGRAM_TOP : PLOT_TOP;
  const spectrogramHeight = activeMode === 'split' ? SPLIT_SPECTROGRAM_HEIGHT : PLOT_HEIGHT;

  const waveformBars = useMemo<ReadonlyArray<WaveformBarGeometry>>(() => {
    const count = workingSamples.length;
    if (!showWaveform || count === 0) return [];
    const colW = PLOT_WIDTH / count;
    const barW = roundTwo(Math.max(1.5, Math.min(10, colW * 0.68)));

    const bars: WaveformBarGeometry[] = [];
    for (let i = 0; i < count; i += 1) {
      const amp = workingSamples[i]!;
      const centerX = roundTwo(PLOT_LEFT + (i + 0.5) * colW);
      const x = roundTwo(centerX - barW / 2);
      const halfHeight = amp === 0 ? 1 : roundTwo(Math.max(2, amp * waveformMaxHalfH));
      const pctCenter = ((i + 0.5) / count) * 100;
      const inSelection =
        hasActiveSelection &&
        activeSelection !== null &&
        pctCenter >= activeSelection.startPct &&
        pctCenter <= activeSelection.endPct;

      bars.push({
        key: `wf-bar-${count}-${i}`,
        sampleIndex: i,
        amplitude: amp,
        x,
        centerX,
        width: barW,
        posY: roundTwo(waveformMidY - halfHeight),
        negY: waveformMidY,
        halfHeight,
        isTransientPeak: amp > TRANSIENT_PEAK_THRESHOLD,
        inSelection,
      });
    }
    return bars;
  }, [
    workingSamples,
    showWaveform,
    waveformMaxHalfH,
    waveformMidY,
    hasActiveSelection,
    activeSelection,
  ]);

  const spectrogramCells = useMemo<ReadonlyArray<SpectrogramCellGeometry>>(() => {
    const count = workingSamples.length;
    if (!showSpectrogram || count === 0) return [];
    const colW = PLOT_WIDTH / count;
    const rowH = spectrogramHeight / SPECTROGRAM_BAND_COUNT;
    const cellW = roundTwo(Math.max(1, colW - 0.8));
    const cellH = roundTwo(Math.max(1, rowH - 1));

    const cells: SpectrogramCellGeometry[] = [];
    for (let band = 0; band < SPECTROGRAM_BAND_COUNT; band += 1) {
      const y = roundTwo(spectrogramTop + band * rowH + 0.5);
      for (let i = 0; i < count; i += 1) {
        const amp = workingSamples[i]!;
        const prevAmp = i > 0 ? workingSamples[i - 1]! : amp;
        const energy = computeSpectralEnergy(amp, prevAmp, i, band);
        const x = roundTwo(PLOT_LEFT + i * colW + 0.4);
        cells.push({
          key: `spec-cell-${band}-${count}-${i}`,
          bandIndex: band,
          sampleIndex: i,
          x,
          y,
          width: cellW,
          height: cellH,
          energy,
          fill: getSpectrogramFill(energy),
          opacity: energy <= 0 ? 0.06 : roundTwo(0.14 + energy * 0.82),
        });
      }
    }
    return cells;
  }, [workingSamples, showSpectrogram, spectrogramTop, spectrogramHeight]);

  const merged = mergeProps({
    themeTarget: themeProps('waveform-spectrogram-view', {
      mode: activeMode,
      zoom,
      hasSelection: hasActiveSelection,
      modified: isModified,
      dragging: activeDrag !== null,
      disabled,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const handleStartPct = activeSelection ? activeSelection.startPct : 0;
  const handleEndPct = activeSelection ? activeSelection.endPct : 100;
  const startX = pctToCanvasX(handleStartPct);
  const endX = pctToCanvasX(handleEndPct);
  const selectionWidth = roundTwo(Math.max(0, endX - startX));
  const leftScrimWidth = roundTwo(Math.max(0, startX - PLOT_LEFT));
  const rightScrimWidth = roundTwo(Math.max(0, PLOT_RIGHT - endX));

  const selectionStartSec = (handleStartPct / 100) * effectiveDurationSec;
  const selectionEndSec = (handleEndPct / 100) * effectiveDurationSec;
  const selectionTimeSpanText = hasActiveSelection
    ? `${formatSeconds(selectionStartSec)} – ${formatSeconds(selectionEndSec)}`
    : 'None';
  const peakDbText = formatPeakDb(peakAmplitude);
  const canEditSelection = !disabled && hasActiveSelection && workingSamples.length > 0;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      {/* Header Row */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <AudioWaveform className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            data-testid="waveform-view-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          {/* View Mode Switcher */}
          <div
            role="tablist"
            aria-label="Audio canvas view mode"
            data-testid="waveform-mode-switcher"
            className="prism-well inline-flex flex-wrap items-center gap-1 rounded-full p-1 max-w-full min-w-0"
          >
            {MODE_OPTIONS.map((option) => {
              const selected = activeMode === option.id;
              return (
                <button
                  key={option.id}
                  ref={(el) => {
                    tabButtonRefs.current.set(option.id, el);
                  }}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected && !disabled ? 0 : -1}
                  disabled={disabled}
                  data-testid={`waveform-mode-${option.id}`}
                  onClick={() => selectMode(option.id)}
                  onKeyDown={(event) => handleModeKeyDown(event, option.id)}
                  className={cx(
                    'prism-focus-ring rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-[color,background-color,border-color,opacity,transform]',
                    selected ? 'prism-crystal font-semibold shadow-sm' : 'opacity-75 enabled:hover:opacity-100'
                  )}
                  style={{
                    color: selected ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Zoom Pills */}
          <div
            role="group"
            aria-label="Timeline zoom level"
            data-testid="waveform-zoom-group"
            className="prism-well inline-flex flex-wrap items-center gap-1 rounded-full p-1 max-w-full min-w-0"
          >
            {ZOOM_OPTIONS.map((option) => {
              const active = zoom === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  data-testid={`waveform-zoom-${option.value}x`}
                  onClick={() => setZoom(option.value)}
                  className={cx(
                    'prism-focus-ring rounded-full px-2.5 py-1 text-xs font-mono font-medium tabular-nums whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-[color,background-color,border-color,opacity,transform]',
                    active ? 'prism-crystal font-semibold shadow-sm' : 'opacity-75 enabled:hover:opacity-100'
                  )}
                  style={{
                    color: active ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div
        role="group"
        aria-label="Audio sample actions"
        className={cx(toolbarClass, 'flex flex-wrap items-center gap-2 min-w-0 max-w-full')}
      >
        <button
          type="button"
          disabled={!canEditSelection}
          data-testid="waveform-action-silence"
          onClick={handleSilenceSelection}
          className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          style={STYLE_TEXT_PRIMARY}
        >
          <VolumeX className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Silence Selection</span>
        </button>

        <button
          type="button"
          disabled={!canEditSelection}
          data-testid="waveform-action-cut"
          onClick={handleCutSelection}
          className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          style={STYLE_WARNING_MAIN}
        >
          <Scissors className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Cut Selection</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          data-testid="waveform-action-reset"
          onClick={handleResetAudio}
          className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          style={STYLE_SECONDARY_MAIN}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Reset Audio</span>
        </button>
      </div>

      {/* Optical SVG Canvas Well */}
      <div
        data-testid="waveform-canvas-well"
        className={cx(canvasWellClass, 'prism-well overflow-x-auto rounded-2xl p-2.5 min-w-0 max-w-full')}
      >
        {workingSamples.length === 0 ? (
          <div
            role="status"
            data-testid="waveform-empty-state"
            className="py-10 px-4 text-center text-xs font-medium"
            style={STYLE_TEXT_SECONDARY}
          >
            No audio samples available. Click Reset Audio to restore source waveform.
          </div>
        ) : (
          <div
            data-testid="waveform-zoom-track"
            style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
          >
            <svg
              ref={svgRef}
              role="img"
              aria-label={`${title}: ${workingSamples.length} samples, duration ${formatSeconds(effectiveDurationSec)}, peak ${peakDbText}`}
              data-testid="waveform-spectrogram-svg"
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
              onPointerDown={handleCanvasPointerDown}
              className={cx(
                'w-full h-auto select-none block touch-none',
                disabled ? 'cursor-not-allowed opacity-65' : 'cursor-crosshair'
              , 'prism-contain-box')}
              style={{ touchAction: 'none' }}
            >
              {/* Waveform Band */}
              {showWaveform ? (
                <g data-testid="waveform-band">
                  <line
                    data-testid="waveform-zero-line"
                    x1={PLOT_LEFT}
                    y1={waveformMidY}
                    x2={PLOT_RIGHT}
                    y2={waveformMidY}
                    stroke="var(--prism-divider)"
                    strokeWidth={1.2}
                  />
                  <line
                    x1={PLOT_LEFT}
                    y1={roundTwo(waveformMidY - waveformMaxHalfH * 0.5)}
                    x2={PLOT_RIGHT}
                    y2={roundTwo(waveformMidY - waveformMaxHalfH * 0.5)}
                    stroke="var(--prism-divider)"
                    strokeWidth={0.75}
                    strokeDasharray="2 3"
                  />
                  <line
                    x1={PLOT_LEFT}
                    y1={roundTwo(waveformMidY + waveformMaxHalfH * 0.5)}
                    x2={PLOT_RIGHT}
                    y2={roundTwo(waveformMidY + waveformMaxHalfH * 0.5)}
                    stroke="var(--prism-divider)"
                    strokeWidth={0.75}
                    strokeDasharray="2 3"
                  />

                  {waveformBars.map((bar) => (
                    <g key={bar.key} data-testid="waveform-bar-group" data-amplitude={bar.amplitude.toFixed(2)}>
                      <rect
                        data-testid="waveform-bar-positive"
                        x={bar.x}
                        y={bar.posY}
                        width={bar.width}
                        height={bar.halfHeight}
                        rx={roundTwo(bar.width / 2)}
                        fill="var(--prism-primary-main)"
                        fillOpacity={bar.amplitude === 0 ? 0.2 : bar.inSelection ? 0.96 : 0.78}
                      />
                      <rect
                        data-testid="waveform-bar-negative"
                        x={bar.x}
                        y={bar.negY}
                        width={bar.width}
                        height={bar.halfHeight}
                        rx={roundTwo(bar.width / 2)}
                        fill="var(--prism-secondary-main)"
                        fillOpacity={bar.amplitude === 0 ? 0.2 : bar.inSelection ? 0.92 : 0.72}
                      />
                      {bar.isTransientPeak ? (
                        <circle
                          data-testid="waveform-peak-dot"
                          cx={bar.centerX}
                          cy={roundTwo(Math.max(PLOT_TOP + 2, bar.posY - 3))}
                          r={2.3}
                          fill="var(--prism-warning-main)"
                        />
                      ) : null}
                    </g>
                  ))}
                </g>
              ) : null}

              {/* Split Band Separator */}
              {activeMode === 'split' ? (
                <line
                  data-testid="waveform-split-divider"
                  x1={PLOT_LEFT}
                  y1={SPLIT_DIVIDER_Y}
                  x2={PLOT_RIGHT}
                  y2={SPLIT_DIVIDER_Y}
                  stroke="var(--prism-divider)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
              ) : null}

              {/* Spectrogram Band */}
              {showSpectrogram ? (
                <g data-testid="spectrogram-band">
                  {spectrogramCells.map((cell) => (
                    <rect
                      key={cell.key}
                      data-testid="spectrogram-cell"
                      data-band={String(cell.bandIndex)}
                      data-energy={cell.energy.toFixed(2)}
                      x={cell.x}
                      y={cell.y}
                      width={cell.width}
                      height={cell.height}
                      rx={1}
                      fill={cell.fill}
                      fillOpacity={cell.opacity}
                    />
                  ))}
                </g>
              ) : null}

              {/* Interactive Range Selection Overlay */}
              {hasActiveSelection ? (
                <g data-testid="selection-overlay" pointerEvents="none">
                  <rect
                    data-testid="selection-scrim-left"
                    x={PLOT_LEFT}
                    y={PLOT_TOP}
                    width={leftScrimWidth}
                    height={PLOT_HEIGHT}
                    fill="var(--prism-bg-end)"
                    fillOpacity={0.48}
                  />
                  <rect
                    data-testid="selection-scrim-right"
                    x={endX}
                    y={PLOT_TOP}
                    width={rightScrimWidth}
                    height={PLOT_HEIGHT}
                    fill="var(--prism-bg-end)"
                    fillOpacity={0.48}
                  />
                  <rect
                    data-testid="selection-overlay-rect"
                    x={startX}
                    y={PLOT_TOP}
                    width={selectionWidth}
                    height={PLOT_HEIGHT}
                    rx={3}
                    fill="var(--prism-primary-main)"
                    fillOpacity={0.14}
                    stroke="var(--prism-primary-main)"
                    strokeWidth={1.5}
                    strokeOpacity={0.8}
                  />
                </g>
              ) : null}

              {/* Accessible Selection Start Handle */}
              <g
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label="Selection Start"
                aria-disabled={disabled || undefined}
                aria-valuemin={0}
                aria-valuemax={roundOne(Math.max(0, handleEndPct - MIN_HANDLE_GAP_PCT))}
                aria-valuenow={handleStartPct}
                aria-valuetext={`${formatSeconds(selectionStartSec)} (${handleStartPct.toFixed(1)}%)`}
                data-testid="selection-handle-start"
                data-active={hasActiveSelection ? 'true' : 'false'}
                data-dragging={activeDrag === 'start' ? 'true' : undefined}
                onPointerDown={handleEdgePointerDown('start')}
                onKeyDown={handleHandleKeyDown('start')}
                className={cx(
                  'prism-focus-ring',
                  disabled
                    ? 'cursor-not-allowed'
                    : activeDrag === 'start'
                      ? 'cursor-grabbing'
                      : 'cursor-ew-resize'
                )}
              >
                <rect
                  x={roundTwo(startX - 8)}
                  y={PLOT_TOP}
                  width={16}
                  height={PLOT_HEIGHT}
                  fill="var(--prism-bg-start)"
                  fillOpacity={0}
                />
                <line
                  x1={startX}
                  y1={PLOT_TOP}
                  x2={startX}
                  y2={PLOT_BOTTOM}
                  stroke="var(--prism-primary-main)"
                  strokeWidth={hasActiveSelection ? 2 : 1.2}
                  strokeOpacity={hasActiveSelection ? 0.95 : 0.45}
                />
                <rect
                  x={roundTwo(startX - 4.5)}
                  y={roundTwo(PLOT_TOP + PLOT_HEIGHT / 2 - 11)}
                  width={9}
                  height={22}
                  rx={4.5}
                  fill="var(--prism-bg-start)"
                  stroke="var(--prism-primary-main)"
                  strokeWidth={1.6}
                  fillOpacity={hasActiveSelection ? 0.96 : 0.7}
                  strokeOpacity={hasActiveSelection ? 1 : 0.55}
                />
              </g>

              {/* Accessible Selection End Handle */}
              <g
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label="Selection End"
                aria-disabled={disabled || undefined}
                aria-valuemin={roundOne(Math.min(100, handleStartPct + MIN_HANDLE_GAP_PCT))}
                aria-valuemax={100}
                aria-valuenow={handleEndPct}
                aria-valuetext={`${formatSeconds(selectionEndSec)} (${handleEndPct.toFixed(1)}%)`}
                data-testid="selection-handle-end"
                data-active={hasActiveSelection ? 'true' : 'false'}
                data-dragging={activeDrag === 'end' ? 'true' : undefined}
                onPointerDown={handleEdgePointerDown('end')}
                onKeyDown={handleHandleKeyDown('end')}
                className={cx(
                  'prism-focus-ring',
                  disabled
                    ? 'cursor-not-allowed'
                    : activeDrag === 'end'
                      ? 'cursor-grabbing'
                      : 'cursor-ew-resize'
                )}
              >
                <rect
                  x={roundTwo(endX - 8)}
                  y={PLOT_TOP}
                  width={16}
                  height={PLOT_HEIGHT}
                  fill="var(--prism-bg-start)"
                  fillOpacity={0}
                />
                <line
                  x1={endX}
                  y1={PLOT_TOP}
                  x2={endX}
                  y2={PLOT_BOTTOM}
                  stroke="var(--prism-primary-main)"
                  strokeWidth={hasActiveSelection ? 2 : 1.2}
                  strokeOpacity={hasActiveSelection ? 0.95 : 0.45}
                />
                <rect
                  x={roundTwo(endX - 4.5)}
                  y={roundTwo(PLOT_TOP + PLOT_HEIGHT / 2 - 11)}
                  width={9}
                  height={22}
                  rx={4.5}
                  fill="var(--prism-bg-start)"
                  stroke="var(--prism-primary-main)"
                  strokeWidth={1.6}
                  fillOpacity={hasActiveSelection ? 0.96 : 0.7}
                  strokeOpacity={hasActiveSelection ? 1 : 0.55}
                />
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* Recessed Telemetry Footer */}
      <div
        role="status"
        aria-live="polite"
        data-testid="waveform-telemetry-footer"
        className={cx(
          telemetryClass,
          'prism-well rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums min-w-0 max-w-full'
        )}
        style={STYLE_TEXT_SECONDARY}
      >
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <span data-testid="telemetry-duration" style={STYLE_TEXT_PRIMARY}>
            Duration {formatSeconds(effectiveDurationSec)}
          </span>
          <span data-testid="telemetry-selection">
            Selection {selectionTimeSpanText}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <span data-testid="telemetry-samples">
            {workingSamples.length} {workingSamples.length === 1 ? 'sample' : 'samples'}
          </span>
          <span
            data-testid="telemetry-peak-db"
            className="inline-flex items-center gap-1.5 font-semibold"
            style={{
              color:
                peakAmplitude > TRANSIENT_PEAK_THRESHOLD
                  ? 'var(--prism-warning-main)'
                  : 'var(--prism-text-primary)',
            }}
          >
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  peakAmplitude > TRANSIENT_PEAK_THRESHOLD
                    ? 'var(--prism-warning-main)'
                    : 'var(--prism-primary-main)',
              }}
            />
            <span>Peak {peakDbText}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export const WaveformSpectrogramView = /*#__PURE__*/ memoWithDisplayName(WaveformSpectrogramViewInner, 'WaveformSpectrogramView');
