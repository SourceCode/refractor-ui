'use client';

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Activity } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type ColorScopeMode = 'histogram' | 'waveform' | 'vectorscope' | 'all';

export type HistogramChannel = 'luma' | 'red' | 'green' | 'blue';

export interface ScopeHistogramBins {
  /** Luminance distribution bins from deep shadows (left) to peak highlights (right). */
  luma: ReadonlyArray<number>;
  /** Red channel distribution bins. */
  red: ReadonlyArray<number>;
  /** Green channel distribution bins. */
  green: ReadonlyArray<number>;
  /** Blue channel distribution bins. */
  blue: ReadonlyArray<number>;
}

export interface VectorscopeSample {
  /** Broadcast hue angle in degrees (counter-clockwise from +U axis; Rec.709 skin-tone I-line = 123°). */
  angleDeg: number;
  /** Chroma saturation magnitude clamped to [0..100]. */
  saturation: number;
}

export interface LiveColorScopesProps extends BaseProps<HTMLDivElement> {
  /** Controlled active color scope view mode. */
  mode?: ColorScopeMode;
  /** Initial uncontrolled color scope view mode (defaults to 'all'). */
  defaultMode?: ColorScopeMode;
  /** Callback invoked whenever the active scope mode changes. */
  onModeChange?: (mode: ColorScopeMode) => void;
  /** RGB + Luma histogram bin intensities (deterministic 32-bin dataset used when omitted). */
  histogram?: ScopeHistogramBins;
  /** IRE values (0..100) sampled across horizontal frame columns (deterministic default when omitted). */
  waveformColumns?: ReadonlyArray<ReadonlyArray<number>>;
  /** Chromaticity scatter samples plotted on the circular vectorscope (deterministic default when omitted). */
  vectorSamples?: ReadonlyArray<VectorscopeSample>;
  /** Optional highlight clipping percentage override (0..100); computed from top histogram bin when omitted. */
  highlightClipPct?: number;
  /** Optional shadow clipping percentage override (0..100); computed from bottom histogram bin when omitted. */
  shadowClipPct?: number;
  /** Card heading title (defaults to 'Live Color Scopes'). */
  title?: string;
}

interface ScopeModeOption {
  id: ColorScopeMode;
  label: string;
}

interface HistogramChannelMeta {
  id: HistogramChannel;
  label: string;
  name: string;
  token: string;
  fillOpacity: number;
}

interface HistogramZoneStop {
  key: string;
  pct: number;
  label: string;
}

interface VectorTargetMeta {
  id: string;
  label: string;
  angleDeg: number;
  token: string;
}

interface WaveformEnvelope {
  key: string;
  x: number;
  yMin: number;
  yMax: number;
  isOverWarning: boolean;
}

interface WaveformPoint {
  key: string;
  x: number;
  y: number;
  ire: number;
  isOverWarning: boolean;
}

interface PlottedVectorSample {
  key: string;
  x: number;
  y: number;
  saturation: number;
  token: string;
}

export const CLIP_WARNING_THRESHOLD_PCT = 1;
export const WAVEFORM_WARNING_IRE = 90;

const HISTOGRAM_WIDTH = 280;
const HISTOGRAM_HEIGHT = 120;
const HISTOGRAM_PAD_X = 10;
const HISTOGRAM_PAD_TOP = 12;
const HISTOGRAM_BASELINE_Y = 100;
const HISTOGRAM_PLOT_W = HISTOGRAM_WIDTH - HISTOGRAM_PAD_X * 2;
const HISTOGRAM_PLOT_H = HISTOGRAM_BASELINE_Y - HISTOGRAM_PAD_TOP;

const WAVEFORM_WIDTH = 280;
const WAVEFORM_HEIGHT = 120;
const WAVEFORM_PAD_LEFT = 34;
const WAVEFORM_PAD_RIGHT = 10;
const WAVEFORM_PAD_TOP = 12;
const WAVEFORM_PAD_BOTTOM = 14;
const WAVEFORM_PLOT_W = WAVEFORM_WIDTH - WAVEFORM_PAD_LEFT - WAVEFORM_PAD_RIGHT;
const WAVEFORM_PLOT_H = WAVEFORM_HEIGHT - WAVEFORM_PAD_TOP - WAVEFORM_PAD_BOTTOM;

const VECTORSCOPE_SIZE = 180;
const VECTORSCOPE_CENTER = VECTORSCOPE_SIZE / 2;
const VECTORSCOPE_OUTER_R = 72;
const VECTORSCOPE_SAFE_R = VECTORSCOPE_OUTER_R * 0.75;
const VECTORSCOPE_INNER_R = VECTORSCOPE_OUTER_R * 0.25;
const VECTORSCOPE_SKIN_ANGLE_DEG = 123;
const VECTORSCOPE_HIGH_CHROMA_THRESHOLD = 55;

const SCOPE_MODE_OPTIONS: ReadonlyArray<ScopeModeOption> = [
  { id: 'all', label: 'All' },
  { id: 'histogram', label: 'Histogram' },
  { id: 'waveform', label: 'Waveform' },
  { id: 'vectorscope', label: 'Vectorscope' },
];

const HISTOGRAM_CHANNELS: ReadonlyArray<HistogramChannelMeta> = [
  {
    id: 'luma',
    label: 'Luma',
    name: 'Luminance',
    token: 'var(--prism-text-primary)',
    fillOpacity: 0.16,
  },
  {
    id: 'red',
    label: 'R',
    name: 'Red',
    token: 'var(--prism-error-main)',
    fillOpacity: 0.24,
  },
  {
    id: 'green',
    label: 'G',
    name: 'Green',
    token: 'var(--prism-success-main)',
    fillOpacity: 0.24,
  },
  {
    id: 'blue',
    label: 'B',
    name: 'Blue',
    token: 'var(--prism-info-main)',
    fillOpacity: 0.24,
  },
];

const HISTOGRAM_ZONES: ReadonlyArray<HistogramZoneStop> = [
  { key: 'zone-0', pct: 0, label: '0' },
  { key: 'zone-25', pct: 25, label: '64' },
  { key: 'zone-50', pct: 50, label: '128' },
  { key: 'zone-75', pct: 75, label: '192' },
  { key: 'zone-100', pct: 100, label: '255' },
];

const WAVEFORM_IRE_LEVELS: ReadonlyArray<number> = [100, 75, 50, 25, 0];

const VECTORSCOPE_TARGETS: ReadonlyArray<VectorTargetMeta> = [
  { id: 'R', label: 'R', angleDeg: 103.5, token: 'var(--prism-error-main)' },
  { id: 'Mg', label: 'Mg', angleDeg: 60.7, token: 'var(--prism-primary-main)' },
  { id: 'B', label: 'B', angleDeg: 347.1, token: 'var(--prism-info-main)' },
  { id: 'Cy', label: 'Cy', angleDeg: 283.5, token: 'var(--prism-secondary-main)' },
  { id: 'G', label: 'G', angleDeg: 240.7, token: 'var(--prism-success-main)' },
  { id: 'Yl', label: 'Yl', angleDeg: 167.1, token: 'var(--prism-warning-main)' },
];

/** Deterministic 32-bin RGB + Luma dataset (luma sums to 1000: 0.8% shadow clip, 2.2% highlight clip). */
export const DEFAULT_HISTOGRAM: ScopeHistogramBins = {
  luma: [
    8, 12, 16, 22, 28, 34, 40, 44, 46, 48, 47, 51, 53, 51, 52, 48, 44, 42, 40, 38, 36, 32, 28, 24,
    20, 16, 14, 12, 10, 10, 12, 22,
  ],
  red: [
    6, 9, 13, 18, 24, 30, 35, 39, 43, 47, 50, 54, 57, 58, 56, 52, 49, 46, 44, 41, 39, 36, 32, 29,
    25, 22, 18, 16, 15, 16, 20, 27,
  ],
  green: [
    8, 11, 15, 21, 27, 33, 39, 43, 46, 49, 51, 53, 55, 53, 50, 47, 44, 41, 39, 36, 33, 29, 26, 22,
    18, 15, 13, 11, 10, 9, 11, 18,
  ],
  blue: [
    12, 18, 24, 31, 38, 44, 49, 52, 51, 48, 45, 42, 40, 38, 36, 34, 31, 29, 27, 25, 22, 20, 18, 16,
    14, 12, 10, 9, 8, 8, 9, 12,
  ],
};

/** Deterministic 24-column IRE waveform trace (peak 96 IRE with highlights above 90 IRE). */
export const DEFAULT_WAVEFORM_COLUMNS: ReadonlyArray<ReadonlyArray<number>> = [
  [12, 24, 36, 48, 60],
  [10, 22, 38, 52, 64],
  [14, 28, 42, 56, 68],
  [16, 30, 45, 58, 70],
  [18, 32, 48, 62, 74],
  [20, 34, 50, 65, 78],
  [18, 36, 52, 68, 80],
  [15, 34, 54, 70, 82],
  [14, 30, 52, 68, 84],
  [12, 28, 48, 66, 86],
  [16, 32, 50, 72, 88],
  [18, 36, 54, 74, 90],
  [20, 38, 56, 76, 92],
  [22, 40, 58, 78, 94],
  [24, 42, 60, 80, 96],
  [22, 40, 58, 78, 94],
  [18, 36, 54, 74, 91],
  [16, 32, 50, 70, 86],
  [14, 28, 46, 64, 80],
  [12, 26, 44, 60, 74],
  [10, 24, 40, 54, 68],
  [12, 22, 36, 50, 62],
  [10, 20, 32, 46, 56],
  [8, 18, 28, 42, 52],
];

/** Deterministic chromaticity scatter samples centered along the Rec.709 skin-tone I-line (123°). */
export const DEFAULT_VECTOR_SAMPLES: ReadonlyArray<VectorscopeSample> = [
  { angleDeg: 118, saturation: 24 },
  { angleDeg: 121, saturation: 32 },
  { angleDeg: 123, saturation: 38 },
  { angleDeg: 125, saturation: 44 },
  { angleDeg: 122, saturation: 50 },
  { angleDeg: 124, saturation: 58 },
  { angleDeg: 120, saturation: 64 },
  { angleDeg: 127, saturation: 46 },
  { angleDeg: 116, saturation: 40 },
  { angleDeg: 130, saturation: 34 },
  { angleDeg: 134, saturation: 28 },
  { angleDeg: 112, saturation: 52 },
  { angleDeg: 108, saturation: 62 },
  { angleDeg: 104, saturation: 72 },
  { angleDeg: 142, saturation: 48 },
  { angleDeg: 150, saturation: 58 },
  { angleDeg: 162, saturation: 66 },
  { angleDeg: 96, saturation: 60 },
  { angleDeg: 84, saturation: 42 },
  { angleDeg: 70, saturation: 36 },
  { angleDeg: 58, saturation: 48 },
  { angleDeg: 274, saturation: 22 },
  { angleDeg: 282, saturation: 30 },
  { angleDeg: 288, saturation: 38 },
  { angleDeg: 296, saturation: 44 },
  { angleDeg: 302, saturation: 50 },
  { angleDeg: 308, saturation: 42 },
  { angleDeg: 316, saturation: 34 },
  { angleDeg: 328, saturation: 28 },
  { angleDeg: 340, saturation: 36 },
  { angleDeg: 258, saturation: 26 },
  { angleDeg: 246, saturation: 32 },
  { angleDeg: 210, saturation: 18 },
  { angleDeg: 186, saturation: 24 },
  { angleDeg: 126, saturation: 76 },
  { angleDeg: 119, saturation: 80 },
];

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function roundOne(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

function formatPercent(value: number): string {
  return `${roundOne(value).toFixed(1)}%`;
}

function formatIre(value: number): string {
  return `${roundOne(value).toFixed(1)} IRE`;
}

function sanitizeBinSeries(bins: ReadonlyArray<number>): number[] {
  const sanitized: number[] = [];
  for (const val of bins) {
    sanitized.push(Number.isFinite(val) && val > 0 ? val : 0);
  }
  return sanitized;
}

function computeClipFromLuma(lumaBins: ReadonlyArray<number>): {
  shadowPct: number;
  highlightPct: number;
} {
  if (lumaBins.length === 0) {
    return { shadowPct: 0, highlightPct: 0 };
  }
  let total = 0;
  for (const val of lumaBins) {
    total += val;
  }
  if (total <= 0) {
    return { shadowPct: 0, highlightPct: 0 };
  }
  const first = lumaBins[0]!;
  const last = lumaBins[lumaBins.length - 1]!;
  return {
    shadowPct: roundOne((first / total) * 100),
    highlightPct: roundOne((last / total) * 100),
  };
}

function resolveClipPct(overrideValue: number | undefined, computedValue: number): number {
  if (overrideValue !== undefined && Number.isFinite(overrideValue)) {
    return roundOne(clampNumber(overrideValue, 0, 100, computedValue));
  }
  return roundOne(clampNumber(computedValue, 0, 100, 0));
}

function buildHistogramPolygon(bins: ReadonlyArray<number>, maxVal: number): string {
  const count = bins.length;
  if (count === 0) {
    return '';
  }

  const coords: string[] = [`${HISTOGRAM_PAD_X},${HISTOGRAM_BASELINE_Y}`];
  if (count === 1) {
    const val = bins[0]!;
    const y = roundTwo(HISTOGRAM_BASELINE_Y - (val / maxVal) * HISTOGRAM_PLOT_H);
    coords.push(`${HISTOGRAM_PAD_X},${y}`);
    coords.push(`${HISTOGRAM_PAD_X + HISTOGRAM_PLOT_W},${y}`);
  } else {
    for (let i = 0; i < count; i += 1) {
      const val = bins[i]!;
      const x = roundTwo(HISTOGRAM_PAD_X + (i / (count - 1)) * HISTOGRAM_PLOT_W);
      const y = roundTwo(HISTOGRAM_BASELINE_Y - (val / maxVal) * HISTOGRAM_PLOT_H);
      coords.push(`${x},${y}`);
    }
  }
  coords.push(`${HISTOGRAM_PAD_X + HISTOGRAM_PLOT_W},${HISTOGRAM_BASELINE_Y}`);
  return coords.join(' ');
}

function polarToVectorPoint(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: roundTwo(VECTORSCOPE_CENTER + radius * Math.cos(rad)),
    y: roundTwo(VECTORSCOPE_CENTER - radius * Math.sin(rad)),
  };
}

function ireToWaveformY(ire: number): number {
  const clamped = clampNumber(ire, 0, 100, 0);
  return roundTwo(WAVEFORM_PAD_TOP + ((100 - clamped) / 100) * WAVEFORM_PLOT_H);
}

function getChannelSeries(
  channel: HistogramChannel,
  series: { luma: number[]; red: number[]; green: number[]; blue: number[] }
): number[] {
  switch (channel) {
    case 'luma':
      return series.luma;
    case 'red':
      return series.red;
    case 'green':
      return series.green;
    case 'blue':
      return series.blue;
  }
}

function getModeLabel(mode: ColorScopeMode): string {
  switch (mode) {
    case 'all':
      return 'All Scopes';
    case 'histogram':
      return 'Histogram';
    case 'waveform':
      return 'Waveform';
    case 'vectorscope':
      return 'Vectorscope';
  }
}

export function LiveColorScopes({
  mode,
  defaultMode = 'all',
  onModeChange,
  histogram = DEFAULT_HISTOGRAM,
  waveformColumns = DEFAULT_WAVEFORM_COLUMNS,
  vectorSamples = DEFAULT_VECTOR_SAMPLES,
  highlightClipPct,
  shadowClipPct,
  title = 'Live Color Scopes',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: LiveColorScopesProps) {
  const override = useComponentOverride('LiveColorScopes');
  const headingId = useId();
  const tabButtonRefs = useRef<Map<ColorScopeMode, HTMLButtonElement | null>>(new Map());

  const [activeMode, setActiveMode] = useControllableState<ColorScopeMode>({
    value: mode,
    defaultValue: defaultMode,
    onChange: onModeChange,
  });

  const [visibleChannels, setVisibleChannels] = useState<ReadonlySet<HistogramChannel>>(
    () => new Set<HistogramChannel>(['luma', 'red', 'green', 'blue'])
  );

  const histogramData = useMemo(() => {
    const luma = sanitizeBinSeries(histogram.luma);
    const red = sanitizeBinSeries(histogram.red);
    const green = sanitizeBinSeries(histogram.green);
    const blue = sanitizeBinSeries(histogram.blue);

    let maxBin = 0;
    for (const arr of [luma, red, green, blue]) {
      for (const v of arr) {
        if (v > maxBin) maxBin = v;
      }
    }

    const binCount = Math.max(luma.length, red.length, green.length, blue.length);
    const computedClip = computeClipFromLuma(luma);

    return {
      series: { luma, red, green, blue },
      maxBin,
      binCount,
      computedShadowClip: computedClip.shadowPct,
      computedHighlightClip: computedClip.highlightPct,
    };
  }, [histogram]);

  const effectiveShadowClip = resolveClipPct(shadowClipPct, histogramData.computedShadowClip);
  const effectiveHighlightClip = resolveClipPct(
    highlightClipPct,
    histogramData.computedHighlightClip
  );
  const isShadowClipping = effectiveShadowClip > CLIP_WARNING_THRESHOLD_PCT;
  const isHighlightClipping = effectiveHighlightClip > CLIP_WARNING_THRESHOLD_PCT;

  const waveformData = useMemo(() => {
    const colCount = waveformColumns.length;
    const envelopes: WaveformEnvelope[] = [];
    const points: WaveformPoint[] = [];
    let peakIre = 0;
    let colIdx = 0;

    for (const column of waveformColumns) {
      if (column.length === 0) {
        colIdx += 1;
        continue;
      }

      const x =
        colCount === 1
          ? roundTwo(WAVEFORM_PAD_LEFT + WAVEFORM_PLOT_W / 2)
          : roundTwo(WAVEFORM_PAD_LEFT + (colIdx / (colCount - 1)) * WAVEFORM_PLOT_W);

      let colMin = Infinity;
      let colMax = -Infinity;
      let validInCol = 0;
      let sampleIdx = 0;

      for (const raw of column) {
        if (!Number.isFinite(raw)) {
          sampleIdx += 1;
          continue;
        }
        const ire = clampNumber(raw, 0, 100, 0);
        if (ire > peakIre) peakIre = ire;
        if (ire < colMin) colMin = ire;
        if (ire > colMax) colMax = ire;
        validInCol += 1;

        points.push({
          key: `wf-pt-${colIdx}-${sampleIdx}`,
          x,
          y: ireToWaveformY(ire),
          ire,
          isOverWarning: ire > WAVEFORM_WARNING_IRE,
        });
        sampleIdx += 1;
      }

      if (validInCol > 0) {
        envelopes.push({
          key: `wf-env-${colIdx}`,
          x,
          yMin: ireToWaveformY(colMin),
          yMax: ireToWaveformY(colMax),
          isOverWarning: colMax > WAVEFORM_WARNING_IRE,
        });
      }
      colIdx += 1;
    }

    return {
      envelopes,
      points,
      peakIre: roundOne(peakIre),
      sampleCount: points.length,
    };
  }, [waveformColumns]);

  const vectorData = useMemo(() => {
    const plotted: PlottedVectorSample[] = [];
    let idx = 0;
    for (const sample of vectorSamples) {
      if (!Number.isFinite(sample.angleDeg) || !Number.isFinite(sample.saturation)) {
        idx += 1;
        continue;
      }
      const sat = clampNumber(sample.saturation, 0, 100, 0);
      const radius = (sat / 100) * VECTORSCOPE_OUTER_R;
      const pos = polarToVectorPoint(sample.angleDeg, radius);
      plotted.push({
        key: `vec-pt-${idx}`,
        x: pos.x,
        y: pos.y,
        saturation: sat,
        token:
          sat >= VECTORSCOPE_HIGH_CHROMA_THRESHOLD
            ? 'var(--prism-primary-main)'
            : 'var(--prism-secondary-main)',
      });
      idx += 1;
    }
    return {
      plotted,
      sampleCount: plotted.length,
    };
  }, [vectorSamples]);

  const activeSampleCount = useMemo(() => {
    switch (activeMode) {
      case 'histogram':
        return histogramData.binCount;
      case 'waveform':
        return waveformData.sampleCount;
      case 'vectorscope':
        return vectorData.sampleCount;
      case 'all':
        return histogramData.binCount + waveformData.sampleCount + vectorData.sampleCount;
    }
  }, [activeMode, histogramData.binCount, waveformData.sampleCount, vectorData.sampleCount]);

  const selectMode = useCallback(
    (nextMode: ColorScopeMode) => {
      if (nextMode === activeMode) return;
      setActiveMode(nextMode);
    },
    [activeMode, setActiveMode]
  );

  const handleModeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, currentMode: ColorScopeMode) => {
      if (event.nativeEvent.isComposing) return;
      const currentIndex = SCOPE_MODE_OPTIONS.findIndex((opt) => opt.id === currentMode);
      let nextIndex: number;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % SCOPE_MODE_OPTIONS.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + SCOPE_MODE_OPTIONS.length) % SCOPE_MODE_OPTIONS.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = SCOPE_MODE_OPTIONS.length - 1;
      } else {
        return;
      }

      const target = SCOPE_MODE_OPTIONS[nextIndex]!;
      event.preventDefault();
      selectMode(target.id);
      tabButtonRefs.current.get(target.id)?.focus();
    },
    [selectMode]
  );

  const toggleChannel = useCallback((channel: HistogramChannel) => {
    setVisibleChannels((prev) => {
      const next = new Set<HistogramChannel>(prev);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
      }
      return next;
    });
  }, []);

  const handleChannelKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, channel: HistogramChannel) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleChannel(channel);
      }
    },
    [toggleChannel]
  );

  const merged = mergeProps({
    themeTarget: themeProps('live-color-scopes', {
      mode: activeMode,
      shadowClipping: isShadowClipping,
      highlightClipping: isHighlightClipping,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('live-color-scopes', 'header');
  const switcherClass = stableClassName('live-color-scopes', 'switcher');
  const monitorsClass = stableClassName('live-color-scopes', 'monitors');
  const telemetryClass = stableClassName('live-color-scopes', 'telemetry');

  const showHistogram = activeMode === 'all' || activeMode === 'histogram';
  const showWaveform = activeMode === 'all' || activeMode === 'waveform';
  const showVectorscope = activeMode === 'all' || activeMode === 'vectorscope';

  const skinLineEnd = polarToVectorPoint(VECTORSCOPE_SKIN_ANGLE_DEG, VECTORSCOPE_OUTER_R);
  const skinLineOpposite = polarToVectorPoint(
    VECTORSCOPE_SKIN_ANGLE_DEG + 180,
    VECTORSCOPE_OUTER_R
  );
  const skinLabelPos = polarToVectorPoint(VECTORSCOPE_SKIN_ANGLE_DEG, VECTORSCOPE_OUTER_R + 9);
  const warningLineY = ireToWaveformY(WAVEFORM_WARNING_IRE);

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <Activity className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            data-testid="scope-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </h4>

          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span
              data-testid="scope-shadow-clip-pill"
              data-clipping={isShadowClipping ? 'true' : undefined}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-semibold tabular-nums whitespace-nowrap transition-colors',
                isShadowClipping ? 'shadow-sm' : 'prism-well'
              )}
              style={
                isShadowClipping
                  ? {
                      backgroundColor: 'var(--prism-info-main)',
                      borderColor: 'var(--prism-info-main)',
                      color: 'var(--prism-info-contrast)',
                    }
                  : {
                      borderColor: 'var(--prism-well-border)',
                      color: 'var(--prism-text-secondary)',
                    }
              }
            >
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: isShadowClipping
                    ? 'var(--prism-info-contrast)'
                    : 'var(--prism-info-main)',
                }}
              />
              <span>Shadow Clip {formatPercent(effectiveShadowClip)}</span>
            </span>

            <span
              data-testid="scope-highlight-clip-pill"
              data-clipping={isHighlightClipping ? 'true' : undefined}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-semibold tabular-nums whitespace-nowrap transition-colors',
                isHighlightClipping ? 'shadow-sm' : 'prism-well'
              )}
              style={
                isHighlightClipping
                  ? {
                      backgroundColor: 'var(--prism-error-main)',
                      borderColor: 'var(--prism-error-main)',
                      color: 'var(--prism-error-contrast)',
                    }
                  : {
                      borderColor: 'var(--prism-well-border)',
                      color: 'var(--prism-text-secondary)',
                    }
              }
            >
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: isHighlightClipping
                    ? 'var(--prism-error-contrast)'
                    : 'var(--prism-error-main)',
                }}
              />
              <span>Highlight Clip {formatPercent(effectiveHighlightClip)}</span>
            </span>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Color scope view mode"
          data-testid="scope-mode-switcher"
          className={cx(
            switcherClass,
            'prism-well inline-flex flex-wrap items-center gap-1 rounded-full p-1 max-w-full min-w-0'
          )}
        >
          {SCOPE_MODE_OPTIONS.map((option) => {
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
                tabIndex={selected ? 0 : -1}
                data-testid={`scope-mode-${option.id}`}
                onClick={() => selectMode(option.id)}
                onKeyDown={(event) => handleModeKeyDown(event, option.id)}
                className={cx(
                  'prism-focus-ring rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap cursor-pointer transition-all',
                  selected ? 'prism-crystal font-semibold shadow-sm' : 'opacity-75 hover:opacity-100'
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
      </div>

      <div
        data-testid="scope-monitors-grid"
        className={cx(
          monitorsClass,
          'grid gap-3.5 min-w-0 max-w-full',
          activeMode === 'all' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'
        )}
      >
        {showHistogram ? (
          <section
            aria-label="RGB and Luma Histogram"
            data-testid="scope-panel-histogram"
            className="prism-well rounded-2xl p-3 flex flex-col gap-2.5 min-w-0 max-w-full"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              <span
                className="text-xs font-semibold tracking-tight"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                RGB + Luma Histogram
              </span>

              <div
                role="group"
                aria-label="Histogram channel visibility"
                data-testid="scope-histogram-channels"
                className="flex flex-wrap items-center gap-1 min-w-0"
              >
                {HISTOGRAM_CHANNELS.map((ch) => {
                  const isVisible = visibleChannels.has(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      aria-pressed={isVisible}
                      aria-label={`Toggle ${ch.name} channel`}
                      data-testid={`scope-channel-${ch.id}`}
                      onClick={() => toggleChannel(ch.id)}
                      onKeyDown={(event) => handleChannelKeyDown(event, ch.id)}
                      className={cx(
                        'prism-focus-ring inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono font-semibold cursor-pointer transition-all',
                        isVisible ? 'prism-crystal' : 'opacity-50'
                      )}
                      style={{
                        borderColor: isVisible ? ch.token : 'var(--prism-divider)',
                        color: isVisible
                          ? 'var(--prism-text-primary)'
                          : 'var(--prism-text-secondary)',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: ch.token }}
                      />
                      <span>{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <svg
              role="img"
              aria-label={`RGB and Luma histogram across ${histogramData.binCount} tonal bins`}
              data-testid="scope-histogram-svg"
              viewBox={`0 0 ${HISTOGRAM_WIDTH} ${HISTOGRAM_HEIGHT}`}
              className="w-full h-auto block"
            >
              {HISTOGRAM_ZONES.map((zone) => {
                const x = roundTwo(HISTOGRAM_PAD_X + (zone.pct / 100) * HISTOGRAM_PLOT_W);
                return (
                  <g key={zone.key}>
                    <line
                      x1={x}
                      y1={HISTOGRAM_PAD_TOP}
                      x2={x}
                      y2={HISTOGRAM_BASELINE_Y}
                      stroke="var(--prism-divider)"
                      strokeWidth={1}
                      strokeDasharray={zone.pct === 0 || zone.pct === 100 ? undefined : '2 3'}
                    />
                    <text
                      x={x}
                      y={HISTOGRAM_HEIGHT - 5}
                      textAnchor={zone.pct === 0 ? 'start' : zone.pct === 100 ? 'end' : 'middle'}
                      className="text-[8px] font-mono tabular-nums"
                      style={{ fill: 'var(--prism-text-secondary)' }}
                    >
                      {zone.label}
                    </text>
                  </g>
                );
              })}

              <line
                x1={HISTOGRAM_PAD_X}
                y1={HISTOGRAM_BASELINE_Y}
                x2={HISTOGRAM_PAD_X + HISTOGRAM_PLOT_W}
                y2={HISTOGRAM_BASELINE_Y}
                stroke="var(--prism-divider)"
                strokeWidth={1}
              />

              {histogramData.maxBin > 0 && visibleChannels.size > 0 ? (
                HISTOGRAM_CHANNELS.map((ch) => {
                  if (!visibleChannels.has(ch.id)) return null;
                  const polyPoints = buildHistogramPolygon(
                    getChannelSeries(ch.id, histogramData.series),
                    histogramData.maxBin
                  );
                  if (!polyPoints) return null;
                  return (
                    <polygon
                      key={ch.id}
                      data-testid={`scope-histogram-poly-${ch.id}`}
                      points={polyPoints}
                      fill={ch.token}
                      fillOpacity={ch.fillOpacity}
                      stroke={ch.token}
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                    />
                  );
                })
              ) : (
                <text
                  data-testid="scope-histogram-empty"
                  x={HISTOGRAM_WIDTH / 2}
                  y={HISTOGRAM_BASELINE_Y / 2 + 6}
                  textAnchor="middle"
                  className="text-[10px] font-mono"
                  style={{ fill: 'var(--prism-text-secondary)' }}
                >
                  {visibleChannels.size === 0 ? 'All channels hidden' : 'No histogram signal'}
                </text>
              )}
            </svg>
          </section>
        ) : null}

        {showWaveform ? (
          <section
            aria-label="Luma Waveform Monitor"
            data-testid="scope-panel-waveform"
            className="prism-well rounded-2xl p-3 flex flex-col gap-2.5 min-w-0 max-w-full"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              <span
                className="text-xs font-semibold tracking-tight"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                Luma Waveform
              </span>
              <span
                data-testid="scope-waveform-peak-badge"
                className="font-mono text-[10px] font-semibold tabular-nums"
                style={{
                  color:
                    waveformData.peakIre > WAVEFORM_WARNING_IRE
                      ? 'var(--prism-warning-main)'
                      : 'var(--prism-success-main)',
                }}
              >
                Peak {formatIre(waveformData.peakIre)}
              </span>
            </div>

            <svg
              role="img"
              aria-label={`Luma waveform monitor with peak ${formatIre(waveformData.peakIre)} across ${waveformData.sampleCount} samples`}
              data-testid="scope-waveform-svg"
              viewBox={`0 0 ${WAVEFORM_WIDTH} ${WAVEFORM_HEIGHT}`}
              className="w-full h-auto block"
            >
              {WAVEFORM_IRE_LEVELS.map((ire) => {
                const y = ireToWaveformY(ire);
                return (
                  <g key={`ire-${ire}`} data-testid={`scope-waveform-graticule-${ire}`}>
                    <line
                      x1={WAVEFORM_PAD_LEFT}
                      y1={y}
                      x2={WAVEFORM_WIDTH - WAVEFORM_PAD_RIGHT}
                      y2={y}
                      stroke="var(--prism-divider)"
                      strokeWidth={1}
                      strokeDasharray={ire === 0 || ire === 100 ? undefined : '2 3'}
                    />
                    <text
                      x={WAVEFORM_PAD_LEFT - 5}
                      y={roundTwo(y + 3)}
                      textAnchor="end"
                      className="text-[8px] font-mono tabular-nums"
                      style={{ fill: 'var(--prism-text-secondary)' }}
                    >
                      {ire === 100 ? '100' : String(ire)}
                    </text>
                  </g>
                );
              })}

              <text
                x={WAVEFORM_PAD_LEFT - 5}
                y={WAVEFORM_HEIGHT - 2}
                textAnchor="end"
                className="text-[7px] font-mono uppercase"
                style={{ fill: 'var(--prism-text-disabled)' }}
              >
                IRE
              </text>

              <line
                data-testid="scope-waveform-warning-line"
                x1={WAVEFORM_PAD_LEFT}
                y1={warningLineY}
                x2={WAVEFORM_WIDTH - WAVEFORM_PAD_RIGHT}
                y2={warningLineY}
                stroke="var(--prism-warning-main)"
                strokeWidth={0.75}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />

              {waveformData.sampleCount > 0 ? (
                <>
                  {waveformData.envelopes.map((env) => (
                    <line
                      key={env.key}
                      data-testid="scope-waveform-bar"
                      x1={env.x}
                      y1={env.yMin}
                      x2={env.x}
                      y2={env.yMax}
                      stroke={
                        env.isOverWarning
                          ? 'var(--prism-warning-main)'
                          : 'var(--prism-success-main)'
                      }
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeOpacity={0.28}
                    />
                  ))}
                  {waveformData.points.map((pt) => (
                    <circle
                      key={pt.key}
                      data-testid="scope-waveform-dot"
                      data-over-ire={pt.isOverWarning ? 'true' : undefined}
                      cx={pt.x}
                      cy={pt.y}
                      r={1.7}
                      fill={
                        pt.isOverWarning
                          ? 'var(--prism-warning-main)'
                          : 'var(--prism-success-main)'
                      }
                      fillOpacity={0.92}
                    />
                  ))}
                </>
              ) : (
                <text
                  data-testid="scope-waveform-empty"
                  x={WAVEFORM_PAD_LEFT + WAVEFORM_PLOT_W / 2}
                  y={WAVEFORM_PAD_TOP + WAVEFORM_PLOT_H / 2 + 4}
                  textAnchor="middle"
                  className="text-[10px] font-mono"
                  style={{ fill: 'var(--prism-text-secondary)' }}
                >
                  No waveform signal
                </text>
              )}
            </svg>
          </section>
        ) : null}

        {showVectorscope ? (
          <section
            aria-label="Chromaticity Vectorscope"
            data-testid="scope-panel-vectorscope"
            className="prism-well rounded-2xl p-3 flex flex-col gap-2.5 min-w-0 max-w-full"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              <span
                className="text-xs font-semibold tracking-tight"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                Vectorscope
              </span>
              <span
                className="font-mono text-[10px] font-semibold tabular-nums"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                75% Rec.709
              </span>
            </div>

            <div className="w-full max-w-[220px] mx-auto">
              <svg
                role="img"
                aria-label={`Chromaticity vectorscope with ${vectorData.sampleCount} chroma samples and 75 percent broadcast safe ring`}
                data-testid="scope-vectorscope-svg"
                viewBox={`0 0 ${VECTORSCOPE_SIZE} ${VECTORSCOPE_SIZE}`}
                className="w-full h-auto block"
              >
                <circle
                  cx={VECTORSCOPE_CENTER}
                  cy={VECTORSCOPE_CENTER}
                  r={VECTORSCOPE_OUTER_R}
                  fill="none"
                  stroke="var(--prism-divider)"
                  strokeWidth={1.25}
                />
                <circle
                  data-testid="scope-vectorscope-safe-ring"
                  cx={VECTORSCOPE_CENTER}
                  cy={VECTORSCOPE_CENTER}
                  r={VECTORSCOPE_SAFE_R}
                  fill="none"
                  stroke="var(--prism-text-disabled)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  strokeOpacity={0.75}
                />
                <circle
                  cx={VECTORSCOPE_CENTER}
                  cy={VECTORSCOPE_CENTER}
                  r={VECTORSCOPE_INNER_R}
                  fill="none"
                  stroke="var(--prism-divider)"
                  strokeWidth={0.75}
                />

                <line
                  x1={VECTORSCOPE_CENTER - VECTORSCOPE_OUTER_R}
                  y1={VECTORSCOPE_CENTER}
                  x2={VECTORSCOPE_CENTER + VECTORSCOPE_OUTER_R}
                  y2={VECTORSCOPE_CENTER}
                  stroke="var(--prism-divider)"
                  strokeWidth={0.75}
                />
                <line
                  x1={VECTORSCOPE_CENTER}
                  y1={VECTORSCOPE_CENTER - VECTORSCOPE_OUTER_R}
                  x2={VECTORSCOPE_CENTER}
                  y2={VECTORSCOPE_CENTER + VECTORSCOPE_OUTER_R}
                  stroke="var(--prism-divider)"
                  strokeWidth={0.75}
                />

                <line
                  data-testid="scope-vectorscope-skin-line"
                  x1={skinLineOpposite.x}
                  y1={skinLineOpposite.y}
                  x2={skinLineEnd.x}
                  y2={skinLineEnd.y}
                  stroke="var(--prism-warning-main)"
                  strokeWidth={1.1}
                  strokeDasharray="3 2"
                  strokeOpacity={0.85}
                />
                <text
                  x={skinLabelPos.x}
                  y={roundTwo(skinLabelPos.y + 3)}
                  textAnchor="middle"
                  className="text-[7px] font-mono font-semibold"
                  style={{ fill: 'var(--prism-warning-main)' }}
                >
                  I
                </text>

                {VECTORSCOPE_TARGETS.map((target) => {
                  const boxPos = polarToVectorPoint(target.angleDeg, VECTORSCOPE_SAFE_R);
                  const labelPos = polarToVectorPoint(target.angleDeg, VECTORSCOPE_OUTER_R - 4);
                  return (
                    <g key={target.id} data-testid={`scope-vectorscope-target-${target.id}`}>
                      <rect
                        x={roundTwo(boxPos.x - 4)}
                        y={roundTwo(boxPos.y - 4)}
                        width={8}
                        height={8}
                        rx={1.5}
                        fill="none"
                        stroke={target.token}
                        strokeWidth={1.25}
                      />
                      <text
                        x={labelPos.x}
                        y={roundTwo(labelPos.y + 3)}
                        textAnchor="middle"
                        className="text-[8px] font-mono font-semibold"
                        style={{ fill: target.token }}
                      >
                        {target.label}
                      </text>
                    </g>
                  );
                })}

                {vectorData.sampleCount > 0 ? (
                  vectorData.plotted.map((pt) => (
                    <circle
                      key={pt.key}
                      data-testid="scope-vectorscope-sample"
                      cx={pt.x}
                      cy={pt.y}
                      r={2.2}
                      fill={pt.token}
                      fillOpacity={0.82}
                    />
                  ))
                ) : (
                  <text
                    data-testid="scope-vectorscope-empty"
                    x={VECTORSCOPE_CENTER}
                    y={VECTORSCOPE_CENTER + 3}
                    textAnchor="middle"
                    className="text-[9px] font-mono"
                    style={{ fill: 'var(--prism-text-secondary)' }}
                  >
                    No chroma signal
                  </text>
                )}
              </svg>
            </div>
          </section>
        ) : null}
      </div>

      <div
        role="status"
        aria-live="polite"
        data-testid="scope-telemetry-footer"
        className={cx(
          telemetryClass,
          'prism-well rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs min-w-0 max-w-full'
        )}
      >
        <span
          data-testid="scope-telemetry-mode"
          className="font-semibold tracking-tight whitespace-nowrap"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          Mode: {getModeLabel(activeMode)}
        </span>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums min-w-0">
          <span
            data-testid="scope-telemetry-peak-ire"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            Peak {formatIre(waveformData.peakIre)}
          </span>
          <span
            data-testid="scope-telemetry-clip"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            Shadow {formatPercent(effectiveShadowClip)} · Highlight{' '}
            {formatPercent(effectiveHighlightClip)}
          </span>
          <span
            data-testid="scope-telemetry-samples"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {activeSampleCount} {activeSampleCount === 1 ? 'sample' : 'samples'}
          </span>
        </div>
      </div>
    </div>
  );
}

LiveColorScopes.displayName = 'LiveColorScopes';
