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
import { Power, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type EqBandFilterType = 'low-shelf' | 'bell' | 'high-shelf';

export interface EqBand {
  /** Stable identifier for the EQ band. */
  id: string;
  /** Human-readable band label (e.g. 'Low Shelf', 'Presence'). */
  label: string;
  /** Center or corner frequency in Hz, clamped to [20..20000]. */
  frequencyHz: number;
  /** Boost/cut gain in dB, clamped to [-18..18]. */
  gainDb: number;
  /** Filter bandwidth / resonance Q factor, clamped to [0.3..10]. */
  q: number;
  /** Filter topology ('low-shelf' | 'bell' | 'high-shelf'). */
  type: EqBandFilterType;
  /** Whether the band actively contributes to the summed response curve. */
  enabled: boolean;
}

type ParametricEqGraphBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ParametricEqGraphProps extends ParametricEqGraphBaseProps {
  /** Controlled array of parametric EQ bands. Pass `[]` to display the empty state. */
  bands?: ReadonlyArray<EqBand>;
  /** Initial uncontrolled EQ bands (defaults to 4-band mastering EQ). */
  defaultBands?: ReadonlyArray<EqBand>;
  /** Callback fired whenever any EQ band changes, receiving the updated bands array and active band. */
  onChange?: (bands: EqBand[], activeBand: EqBand) => void;
  /** Visible heading displayed in the optical card header (defaults to 'Parametric 4-Band EQ'). */
  title?: string;
  /** Disables band selection, dragging, keyboard nudging, flattening, and inspector controls. */
  disabled?: boolean;
}

export interface EqFilterTypeMeta {
  id: EqBandFilterType;
  label: string;
}

interface BandPatch {
  frequencyHz?: number;
  gainDb?: number;
  q?: number;
  type?: EqBandFilterType;
  enabled?: boolean;
}

const SVG_WIDTH = 420;
const SVG_HEIGHT = 190;
const PLOT_X0 = 38;
const PLOT_X1 = 406;
const PLOT_WIDTH = PLOT_X1 - PLOT_X0;
const PLOT_Y0 = 14;
const PLOT_Y1 = 166;
const PLOT_HEIGHT = PLOT_Y1 - PLOT_Y0;
const ZERO_DB_Y = PLOT_Y0 + PLOT_HEIGHT / 2;

const MIN_FREQ_HZ = 20;
const MAX_FREQ_HZ = 20000;
const LOG_MIN_FREQ = Math.log10(MIN_FREQ_HZ);
const LOG_MAX_FREQ = Math.log10(MAX_FREQ_HZ);
const LOG_FREQ_SPAN = LOG_MAX_FREQ - LOG_MIN_FREQ;

const MIN_GAIN_DB = -18;
const MAX_GAIN_DB = 18;
const MIN_Q = 0.3;
const MAX_Q = 10;

const GAIN_STEP_NORMAL = 1;
const GAIN_STEP_FINE = 0.5;
const FREQ_LOG_STEP_NORMAL = 0.025;
const FREQ_LOG_STEP_FINE = 0.008;
const FREQ_SLIDER_MAX = 1000;
const CURVE_SAMPLES = 96;

const FREQ_GRID_LINES: ReadonlyArray<{ hz: number; label: string }> = [
  { hz: 50, label: '50Hz' },
  { hz: 100, label: '100Hz' },
  { hz: 250, label: '250Hz' },
  { hz: 1000, label: '1kHz' },
  { hz: 4000, label: '4kHz' },
  { hz: 10000, label: '10kHz' },
];

const GAIN_GRID_LINES: ReadonlyArray<{ db: number; label: string; isZero?: boolean }> = [
  { db: 12, label: '+12' },
  { db: 6, label: '+6' },
  { db: 0, label: '0 dB', isZero: true },
  { db: -6, label: '-6' },
  { db: -12, label: '-12' },
];

export const EQ_FILTER_TYPES: ReadonlyArray<EqFilterTypeMeta> = [
  { id: 'low-shelf', label: 'Low Shelf' },
  { id: 'bell', label: 'Bell' },
  { id: 'high-shelf', label: 'High Shelf' },
];

export const DEFAULT_EQ_BANDS: ReadonlyArray<EqBand> = [
  {
    id: 'eq-band-1',
    label: 'Low Shelf',
    frequencyHz: 80,
    gainDb: 2,
    q: 0.7,
    type: 'low-shelf',
    enabled: true,
  },
  {
    id: 'eq-band-2',
    label: 'Low Mid',
    frequencyHz: 420,
    gainDb: -1.5,
    q: 1.4,
    type: 'bell',
    enabled: true,
  },
  {
    id: 'eq-band-3',
    label: 'Presence',
    frequencyHz: 2800,
    gainDb: 2.5,
    q: 1.6,
    type: 'bell',
    enabled: true,
  },
  {
    id: 'eq-band-4',
    label: 'High Shelf',
    frequencyHz: 10000,
    gainDb: 1.5,
    q: 0.8,
    type: 'high-shelf',
    enabled: true,
  },
];

function roundOne(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeFilterType(raw: EqBandFilterType): EqBandFilterType {
  return raw === 'low-shelf' || raw === 'high-shelf' ? raw : 'bell';
}

function getFilterTypeLabel(type: EqBandFilterType): string {
  switch (type) {
    case 'low-shelf':
      return 'Low Shelf';
    case 'high-shelf':
      return 'High Shelf';
    default:
      return 'Bell';
  }
}

function makeUniqueId(base: string, seen: Map<string, number>): string {
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function sanitizeBands(rawBands: ReadonlyArray<EqBand>): EqBand[] {
  const seen = new Map<string, number>();
  return rawBands.map((band, index) => {
    const trimmedId = band.id.trim();
    const baseId = trimmedId.length > 0 ? trimmedId : `eq-band-${index + 1}`;
    const trimmedLabel = band.label.trim();
    return {
      id: makeUniqueId(baseId, seen),
      label: trimmedLabel.length > 0 ? trimmedLabel : `Band ${index + 1}`,
      frequencyHz: Math.round(clampNumber(band.frequencyHz, MIN_FREQ_HZ, MAX_FREQ_HZ, 1000)),
      gainDb: roundOne(clampNumber(band.gainDb, MIN_GAIN_DB, MAX_GAIN_DB, 0)),
      q: roundOne(clampNumber(band.q, MIN_Q, MAX_Q, 1)),
      type: normalizeFilterType(band.type),
      enabled: Boolean(band.enabled),
    };
  });
}

function formatFrequency(hz: number): string {
  const clamped = Math.round(clampNumber(hz, MIN_FREQ_HZ, MAX_FREQ_HZ, 1000));
  if (clamped >= 1000) {
    return `${Number((clamped / 1000).toFixed(2))} kHz`;
  }
  return `${clamped} Hz`;
}

function formatGainDb(gainDb: number): string {
  const rounded = roundOne(clampNumber(gainDb, MIN_GAIN_DB, MAX_GAIN_DB, 0));
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)} dB`;
}

function formatQ(q: number): string {
  return roundOne(clampNumber(q, MIN_Q, MAX_Q, 1)).toFixed(1);
}

function freqToNorm(freqHz: number): number {
  const safe = clampNumber(freqHz, MIN_FREQ_HZ, MAX_FREQ_HZ, 1000);
  return clampNumber((Math.log10(safe) - LOG_MIN_FREQ) / LOG_FREQ_SPAN, 0, 1, 0.5);
}

function normToFreq(norm: number): number {
  const clampedNorm = clampNumber(norm, 0, 1, 0.5);
  const hz = 10 ** (LOG_MIN_FREQ + clampedNorm * LOG_FREQ_SPAN);
  return Math.round(clampNumber(hz, MIN_FREQ_HZ, MAX_FREQ_HZ, 1000));
}

function freqToSvgX(freqHz: number): number {
  return roundTwo(PLOT_X0 + freqToNorm(freqHz) * PLOT_WIDTH);
}

function gainToSvgY(gainDb: number): number {
  const clamped = clampNumber(gainDb, MIN_GAIN_DB, MAX_GAIN_DB, 0);
  return roundTwo(ZERO_DB_Y - (clamped / MAX_GAIN_DB) * (PLOT_HEIGHT / 2));
}

function svgToBandCoords(svgX: number, svgY: number): { frequencyHz: number; gainDb: number } {
  const frequencyHz = normToFreq((svgX - PLOT_X0) / PLOT_WIDTH);
  const rawGain = ((ZERO_DB_Y - svgY) / (PLOT_HEIGHT / 2)) * MAX_GAIN_DB;
  const gainDb = roundOne(clampNumber(rawGain, MIN_GAIN_DB, MAX_GAIN_DB, 0));
  return { frequencyHz, gainDb };
}

function evaluateBandDb(band: EqBand, freqHz: number): number {
  if (!band.enabled || band.gainDb === 0) {
    return 0;
  }
  const octaves = Math.log2(freqHz / band.frequencyHz);
  if (band.type === 'low-shelf') {
    const slope = 2.2 * Math.sqrt(band.q);
    return band.gainDb / (1 + Math.exp(slope * octaves));
  }
  if (band.type === 'high-shelf') {
    const slope = 2.2 * Math.sqrt(band.q);
    return band.gainDb / (1 + Math.exp(-slope * octaves));
  }
  const sigma = Math.max(0.05, 0.65 / band.q);
  return band.gainDb * Math.exp(-0.5 * (octaves / sigma) ** 2);
}

function buildResponsePaths(bands: ReadonlyArray<EqBand>): { strokePath: string; fillPath: string } {
  const strokeParts: string[] = [];
  let firstX = PLOT_X0;
  let lastX = PLOT_X1;

  for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
    const t = i / CURVE_SAMPLES;
    const freqHz = 10 ** (LOG_MIN_FREQ + t * LOG_FREQ_SPAN);
    let totalDb = 0;
    for (const band of bands) {
      totalDb += evaluateBandDb(band, freqHz);
    }
    const clampedDb = clampNumber(totalDb, MIN_GAIN_DB, MAX_GAIN_DB, 0);
    const x = roundTwo(PLOT_X0 + t * PLOT_WIDTH);
    const y = gainToSvgY(clampedDb);
    if (i === 0) {
      firstX = x;
      strokeParts.push(`M ${x},${y}`);
    } else {
      strokeParts.push(`L ${x},${y}`);
    }
    if (i === CURVE_SAMPLES) {
      lastX = x;
    }
  }

  const strokePath = strokeParts.join(' ');
  const fillPath = `M ${firstX},${ZERO_DB_Y} ${strokeParts
    .map((segment, index) => (index === 0 ? segment.replace(/^M /, 'L ') : segment))
    .join(' ')} L ${lastX},${ZERO_DB_Y} Z`;

  return { strokePath, fillPath };
}

function buildBandPreviewPath(band: EqBand): string {
  const parts: string[] = [];
  for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
    const t = i / CURVE_SAMPLES;
    const freqHz = 10 ** (LOG_MIN_FREQ + t * LOG_FREQ_SPAN);
    const db = clampNumber(evaluateBandDb(band, freqHz), MIN_GAIN_DB, MAX_GAIN_DB, 0);
    const x = roundTwo(PLOT_X0 + t * PLOT_WIDTH);
    const y = gainToSvgY(db);
    parts.push(i === 0 ? `M ${x},${y}` : `L ${x},${y}`);
  }
  return parts.join(' ');
}

export function ParametricEqGraph({
  bands,
  defaultBands,
  onChange,
  title = 'Parametric 4-Band EQ',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ParametricEqGraphProps) {
  const override = useComponentOverride('ParametricEqGraph');
  const headingId = useId();
  const fillGradientId = useId();
  const freqSliderId = useId();
  const gainSliderId = useId();
  const qSliderId = useId();

  const svgRef = useRef<SVGSVGElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const [internalBands, setInternalBands] = useState<EqBand[]>(() =>
    sanitizeBands(defaultBands ?? DEFAULT_EQ_BANDS)
  );

  const resolvedBands = useMemo<EqBand[]>(
    () => (bands !== undefined ? sanitizeBands(bands) : internalBands),
    [bands, internalBands]
  );

  const [selectedBandId, setSelectedBandId] = useState<string>(() => resolvedBands[0]?.id ?? '');
  const [draggingBandId, setDraggingBandId] = useState<string | null>(null);

  const activeBandIndex = resolvedBands.findIndex((band) => band.id === selectedBandId);
  const safeActiveIndex = resolvedBands.length === 0 ? -1 : activeBandIndex >= 0 ? activeBandIndex : 0;
  const activeBand = safeActiveIndex >= 0 ? resolvedBands[safeActiveIndex] : undefined;

  const responsePaths = useMemo(
    () => (resolvedBands.length > 0 ? buildResponsePaths(resolvedBands) : null),
    [resolvedBands]
  );

  const activeBandPath = useMemo(
    () => (activeBand && activeBand.enabled ? buildBandPreviewPath(activeBand) : null),
    [activeBand]
  );

  const commitBands = useCallback(
    (nextBands: EqBand[], nextActive: EqBand) => {
      if (bands === undefined) {
        setInternalBands(nextBands);
      }
      onChange?.(nextBands, nextActive);
    },
    [bands, onChange]
  );

  const updateBand = useCallback(
    (bandId: string, patch: BandPatch) => {
      const target = resolvedBands.find((band) => band.id === bandId);
      if (!target) return;

      const nextFrequencyHz =
        patch.frequencyHz !== undefined
          ? Math.round(clampNumber(patch.frequencyHz, MIN_FREQ_HZ, MAX_FREQ_HZ, target.frequencyHz))
          : target.frequencyHz;
      const nextGainDb =
        patch.gainDb !== undefined
          ? roundOne(clampNumber(patch.gainDb, MIN_GAIN_DB, MAX_GAIN_DB, target.gainDb))
          : target.gainDb;
      const nextQ =
        patch.q !== undefined
          ? roundOne(clampNumber(patch.q, MIN_Q, MAX_Q, target.q))
          : target.q;
      const nextType = patch.type !== undefined ? normalizeFilterType(patch.type) : target.type;
      const nextEnabled = patch.enabled !== undefined ? patch.enabled : target.enabled;

      if (
        nextFrequencyHz === target.frequencyHz &&
        nextGainDb === target.gainDb &&
        nextQ === target.q &&
        nextType === target.type &&
        nextEnabled === target.enabled
      ) {
        return;
      }

      const nextActiveBand: EqBand = {
        ...target,
        frequencyHz: nextFrequencyHz,
        gainDb: nextGainDb,
        q: nextQ,
        type: nextType,
        enabled: nextEnabled,
      };
      const updated = resolvedBands.map((band) => (band.id === bandId ? nextActiveBand : band));
      commitBands(updated, nextActiveBand);
    },
    [commitBands, resolvedBands]
  );

  const latestRef = useRef({ updateBand });
  latestRef.current = { updateBand };

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (disabled || resolvedBands.length === 0) {
      cleanupDragRef.current?.();
      setDraggingBandId(null);
    }
  }, [disabled, resolvedBands.length]);

  const getSvgRect = useCallback((): DOMRect | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (
      !rect ||
      !Number.isFinite(rect.width) ||
      !Number.isFinite(rect.height) ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return null;
    }
    return rect;
  }, []);

  const handleFlattenEq = () => {
    const flattened = resolvedBands.map((band) => ({ ...band, gainDb: 0 }));
    const nextActive = flattened[safeActiveIndex]!;
    commitBands(flattened, nextActive);
  };

  const handleBandPointerDown =
    (bandId: string) => (event: ReactPointerEvent<SVGGElement>) => {
      event.stopPropagation();
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      setSelectedBandId(bandId);

      if (!getSvgRect()) return;

      cleanupDragRef.current?.();
      const pointerId = event.pointerId;
      setDraggingBandId(bandId);

      const handleWindowPointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const rect = getSvgRect();
        if (!rect) return;
        const svgX = ((moveEvent.clientX - rect.left) / rect.width) * SVG_WIDTH;
        const svgY = ((moveEvent.clientY - rect.top) / rect.height) * SVG_HEIGHT;
        const { frequencyHz, gainDb } = svgToBandCoords(svgX, svgY);
        latestRef.current.updateBand(bandId, { frequencyHz, gainDb });
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handleWindowPointerMove);
        window.removeEventListener('pointerup', handleWindowPointerEnd);
        window.removeEventListener('pointercancel', handleWindowPointerEnd);
        cleanupDragRef.current = null;
      };

      const handleWindowPointerEnd = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== pointerId) return;
        cleanup();
        setDraggingBandId(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handleWindowPointerMove);
      window.addEventListener('pointerup', handleWindowPointerEnd);
      window.addEventListener('pointercancel', handleWindowPointerEnd);
    };

  const handleBandKeyDown =
    (band: EqBand) => (event: ReactKeyboardEvent<SVGGElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      const gainStep = event.shiftKey ? GAIN_STEP_FINE : GAIN_STEP_NORMAL;
      const freqStep = event.shiftKey ? FREQ_LOG_STEP_FINE : FREQ_LOG_STEP_NORMAL;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedBandId(band.id);
        updateBand(band.id, { frequencyHz: normToFreq(freqToNorm(band.frequencyHz) - freqStep) });
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedBandId(band.id);
        updateBand(band.id, { frequencyHz: normToFreq(freqToNorm(band.frequencyHz) + freqStep) });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedBandId(band.id);
        updateBand(band.id, { gainDb: band.gainDb + gainStep });
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedBandId(band.id);
        updateBand(band.id, { gainDb: band.gainDb - gainStep });
      } else if (event.key === 'Home') {
        event.preventDefault();
        setSelectedBandId(band.id);
        updateBand(band.id, { gainDb: 0 });
      }
    };

  const isDragging = draggingBandId !== null && !disabled;
  const isEmpty = resolvedBands.length === 0;
  const isFlat = !isEmpty && resolvedBands.every((band) => !band.enabled || band.gainDb === 0);

  const merged = mergeProps({
    themeTarget: themeProps('parametric-eq-graph', {
      disabled,
      dragging: isDragging,
      empty: isEmpty,
      flat: isFlat,
      bandCount: resolvedBands.length,
      activeFilter: activeBand?.type,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full space-y-3.5 min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('parametric-eq-graph', 'header');
  const pillsClass = stableClassName('parametric-eq-graph', 'pills');
  const graphClass = stableClassName('parametric-eq-graph', 'graph');
  const nodeClass = stableClassName('parametric-eq-graph', 'node');
  const inspectorClass = stableClassName('parametric-eq-graph', 'inspector');
  const emptyClass = stableClassName('parametric-eq-graph', 'empty');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            data-testid="eq-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {!isEmpty ? (
            <div
              role="group"
              aria-label="EQ bands"
              data-testid="eq-band-pills"
              className={cx(pillsClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
            >
              {resolvedBands.map((band, index) => {
                const isSelected = activeBand?.id === band.id;
                return (
                  <button
                    key={band.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={isSelected}
                    aria-label={`Select EQ Band ${index + 1}: ${band.label}`}
                    data-testid={`eq-band-pill-${band.id}`}
                    data-band-enabled={band.enabled ? 'true' : 'false'}
                    onClick={() => setSelectedBandId(band.id)}
                    className={cx(
                      'prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-semibold tabular-nums cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all',
                      isSelected
                        ? 'prism-btn-primary'
                        : 'prism-crystal opacity-85 enabled:hover:opacity-100',
                      !band.enabled ? 'line-through opacity-55' : undefined
                    )}
                    style={
                      isSelected
                        ? undefined
                        : {
                            color: band.enabled
                              ? 'var(--prism-text-primary)'
                              : 'var(--prism-text-disabled)',
                          }
                    }
                  >
                    <span className="relative z-10">{index + 1}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            disabled={disabled || isEmpty}
            data-testid="eq-flatten-button"
            onClick={handleFlattenEq}
            className="prism-btn-secondary prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span>Flatten EQ</span>
          </button>
        </div>
      </div>

      {!activeBand || !responsePaths ? (
        <div
          role="status"
          data-testid="eq-empty-state"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl px-4 py-8 text-center space-y-1 min-w-0'
          )}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--prism-text-primary)' }}>
            No EQ bands configured
          </p>
          <p className="text-xs" style={{ color: 'var(--prism-text-secondary)' }}>
            Provide one or more parametric bands to sculpt the logarithmic frequency response.
          </p>
        </div>
      ) : (
        <>
          <div
            className={cx(
              graphClass,
              'prism-well rounded-2xl p-3 min-w-0',
              disabled ? 'opacity-60' : undefined
            )}
          >
            <svg
              ref={svgRef}
              role="img"
              aria-label={`${title} logarithmic frequency response graph with ${resolvedBands.length} bands`}
              data-testid="eq-graph-svg"
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-auto select-none block overflow-visible touch-none"
              style={{ touchAction: 'none' }}
            >
              <defs>
                <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--prism-primary-main)" stopOpacity={0.34} />
                  <stop offset="50%" stopColor="var(--prism-primary-main)" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="var(--prism-primary-main)" stopOpacity={0.28} />
                </linearGradient>
              </defs>

              <rect
                data-testid="eq-plot-bg"
                x={PLOT_X0}
                y={PLOT_Y0}
                width={PLOT_WIDTH}
                height={PLOT_HEIGHT}
                rx={6}
                fill="var(--prism-bg-start)"
                fillOpacity={0.24}
                stroke="var(--prism-divider)"
                strokeWidth={1}
              />

              {FREQ_GRID_LINES.map((grid) => {
                const gx = freqToSvgX(grid.hz);
                return (
                  <g key={grid.label} data-testid="eq-freq-gridline" aria-hidden="true">
                    <line
                      x1={gx}
                      y1={PLOT_Y0}
                      x2={gx}
                      y2={PLOT_Y1}
                      stroke="var(--prism-divider)"
                      strokeWidth={1}
                    />
                    <text
                      x={gx}
                      y={PLOT_Y1 + 14}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--prism-text-secondary)"
                      className="font-mono tabular-nums"
                    >
                      {grid.label}
                    </text>
                  </g>
                );
              })}

              {GAIN_GRID_LINES.map((grid) => {
                const gy = gainToSvgY(grid.db);
                return (
                  <g key={grid.label} data-testid="eq-gain-gridline" aria-hidden="true">
                    <line
                      x1={PLOT_X0}
                      y1={gy}
                      x2={PLOT_X1}
                      y2={gy}
                      stroke={grid.isZero ? 'var(--prism-text-disabled)' : 'var(--prism-divider)'}
                      strokeWidth={grid.isZero ? 1.25 : 1}
                      strokeDasharray={grid.isZero ? '4 4' : undefined}
                      strokeOpacity={grid.isZero ? 0.65 : 1}
                    />
                    <text
                      x={PLOT_X0 - 6}
                      y={gy + 3}
                      textAnchor="end"
                      fontSize={9}
                      fill="var(--prism-text-secondary)"
                      className="font-mono tabular-nums"
                    >
                      {grid.label}
                    </text>
                  </g>
                );
              })}

              <path
                data-testid="eq-response-fill"
                d={responsePaths.fillPath}
                fill={`url(#${fillGradientId})`}
              />
              {activeBandPath ? (
                <path
                  data-testid="eq-active-band-curve"
                  d={activeBandPath}
                  fill="none"
                  stroke="var(--prism-secondary-main)"
                  strokeWidth={1.35}
                  strokeDasharray="3 3"
                  strokeOpacity={0.75}
                />
              ) : null}
              <path
                data-testid="eq-response-curve"
                d={responsePaths.strokePath}
                fill="none"
                stroke="var(--prism-primary-main)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {resolvedBands.map((band, index) => {
                const cxPos = freqToSvgX(band.frequencyHz);
                const cyPos = gainToSvgY(band.gainDb);
                const isSelected = activeBand.id === band.id;
                const isDraggingThis = draggingBandId === band.id && !disabled;

                return (
                  <g
                    key={band.id}
                    role="slider"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={`EQ Band ${index + 1} frequency and gain`}
                    aria-valuemin={MIN_GAIN_DB}
                    aria-valuemax={MAX_GAIN_DB}
                    aria-valuenow={band.gainDb}
                    aria-valuetext={`${formatFrequency(band.frequencyHz)}, ${formatGainDb(band.gainDb)}, Q ${formatQ(band.q)}, ${getFilterTypeLabel(band.type)}${band.enabled ? '' : ', bypassed'}`}
                    aria-disabled={disabled || undefined}
                    data-testid={`eq-band-node-${band.id}`}
                    data-band-id={band.id}
                    data-frequency-hz={String(band.frequencyHz)}
                    data-gain-db={String(band.gainDb)}
                    data-q={String(band.q)}
                    data-filter-type={band.type}
                    data-enabled={band.enabled ? 'true' : 'false'}
                    data-selected={isSelected ? 'true' : undefined}
                    data-dragging={isDraggingThis ? 'true' : undefined}
                    onPointerDown={handleBandPointerDown(band.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!disabled) {
                        setSelectedBandId(band.id);
                      }
                    }}
                    onKeyDown={handleBandKeyDown(band)}
                    className={cx(
                      nodeClass,
                      'prism-focus-ring',
                      disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : isDraggingThis
                          ? 'cursor-grabbing'
                          : 'cursor-grab'
                    )}
                  >
                    <circle
                      cx={cxPos}
                      cy={cyPos}
                      r={16}
                      fill="var(--prism-bg-start)"
                      fillOpacity={0}
                    />
                    {isSelected ? (
                      <circle
                        cx={cxPos}
                        cy={cyPos}
                        r={13}
                        fill={band.enabled ? 'var(--prism-primary-main)' : 'var(--prism-text-disabled)'}
                        fillOpacity={0.22}
                      />
                    ) : null}
                    <circle
                      cx={cxPos}
                      cy={cyPos}
                      r={isDraggingThis ? 10 : isSelected ? 9.5 : 8.5}
                      fill={
                        !band.enabled
                          ? 'var(--prism-bg-start)'
                          : isSelected
                            ? 'var(--prism-primary-main)'
                            : 'var(--prism-bg-start)'
                      }
                      stroke={
                        !band.enabled
                          ? 'var(--prism-text-disabled)'
                          : isSelected
                            ? 'var(--prism-primary-contrast)'
                            : 'var(--prism-primary-main)'
                      }
                      strokeWidth={2}
                      strokeDasharray={band.enabled ? undefined : '2 2'}
                    />
                    <text
                      x={cxPos}
                      y={cyPos}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={9}
                      fontWeight={700}
                      pointerEvents="none"
                      fill={
                        !band.enabled
                          ? 'var(--prism-text-disabled)'
                          : isSelected
                            ? 'var(--prism-primary-contrast)'
                            : 'var(--prism-text-primary)'
                      }
                    >
                      {index + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            data-testid="eq-band-inspector"
            className={cx(
              inspectorClass,
              'prism-well rounded-2xl p-3 flex flex-wrap items-center gap-3 min-w-0'
            )}
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <button
                type="button"
                disabled={disabled}
                aria-pressed={activeBand.enabled}
                aria-label={`${activeBand.enabled ? 'Bypass' : 'Enable'} EQ Band ${safeActiveIndex + 1}`}
                data-testid="eq-band-bypass-toggle"
                onClick={() => updateBand(activeBand.id, { enabled: !activeBand.enabled })}
                className={cx(
                  'prism-focus-ring rounded-full h-7 px-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all',
                  activeBand.enabled ? 'prism-emerald' : 'prism-crystal opacity-75'
                )}
                style={activeBand.enabled ? undefined : { color: 'var(--prism-text-secondary)' }}
              >
                <Power aria-hidden="true" className="w-3 h-3 shrink-0" />
                <span>
                  Band {safeActiveIndex + 1} · {activeBand.enabled ? 'Active' : 'Bypassed'}
                </span>
              </button>

              <div
                role="group"
                aria-label="Filter type"
                data-testid="eq-filter-type-group"
                className="flex flex-wrap items-center gap-1 min-w-0"
              >
                {EQ_FILTER_TYPES.map((filterType) => {
                  const isTypeActive = activeBand.type === filterType.id;
                  return (
                    <button
                      key={filterType.id}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isTypeActive}
                      data-testid={`eq-filter-type-${filterType.id}`}
                      onClick={() => updateBand(activeBand.id, { type: filterType.id })}
                      className={cx(
                        'prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all',
                        isTypeActive
                          ? 'prism-btn-primary'
                          : 'prism-crystal opacity-85 enabled:hover:opacity-100'
                      )}
                      style={isTypeActive ? undefined : { color: 'var(--prism-text-primary)' }}
                    >
                      <span className="relative z-10">{filterType.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
              <div className="flex flex-col gap-1 flex-1 min-w-[104px]">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <label
                    htmlFor={freqSliderId}
                    className="font-semibold"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    Freq
                  </label>
                  <span
                    data-testid="eq-inspector-freq-readout"
                    className="font-mono tabular-nums font-semibold"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    {formatFrequency(activeBand.frequencyHz)}
                  </span>
                </div>
                <input
                  id={freqSliderId}
                  type="range"
                  min={0}
                  max={FREQ_SLIDER_MAX}
                  step={1}
                  value={Math.round(freqToNorm(activeBand.frequencyHz) * FREQ_SLIDER_MAX)}
                  disabled={disabled}
                  aria-label="Band frequency"
                  aria-valuetext={formatFrequency(activeBand.frequencyHz)}
                  data-testid="eq-inspector-freq-slider"
                  onChange={(event) => {
                    if (disabled) return;
                    const currentSlider = Math.round(
                      freqToNorm(activeBand.frequencyHz) * FREQ_SLIDER_MAX
                    );
                    const sliderVal = clampNumber(
                      Number(event.target.value),
                      0,
                      FREQ_SLIDER_MAX,
                      currentSlider
                    );
                    updateBand(activeBand.id, {
                      frequencyHz: normToFreq(sliderVal / FREQ_SLIDER_MAX),
                    });
                  }}
                  className="prism-focus-ring w-full h-1.5 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ accentColor: 'var(--prism-primary-main)' }}
                />
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[104px]">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <label
                    htmlFor={gainSliderId}
                    className="font-semibold"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    Gain
                  </label>
                  <span
                    data-testid="eq-inspector-gain-readout"
                    className="font-mono tabular-nums font-semibold"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    {formatGainDb(activeBand.gainDb)}
                  </span>
                </div>
                <input
                  id={gainSliderId}
                  type="range"
                  min={MIN_GAIN_DB}
                  max={MAX_GAIN_DB}
                  step={0.5}
                  value={activeBand.gainDb}
                  disabled={disabled}
                  aria-label="Band gain"
                  aria-valuetext={formatGainDb(activeBand.gainDb)}
                  data-testid="eq-inspector-gain-slider"
                  onChange={(event) => {
                    if (disabled) return;
                    updateBand(activeBand.id, {
                      gainDb: clampNumber(
                        Number(event.target.value),
                        MIN_GAIN_DB,
                        MAX_GAIN_DB,
                        activeBand.gainDb
                      ),
                    });
                  }}
                  className="prism-focus-ring w-full h-1.5 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ accentColor: 'var(--prism-primary-main)' }}
                />
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[96px]">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <label
                    htmlFor={qSliderId}
                    className="font-semibold"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    Q
                  </label>
                  <span
                    data-testid="eq-inspector-q-readout"
                    className="font-mono tabular-nums font-semibold"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    {formatQ(activeBand.q)}
                  </span>
                </div>
                <input
                  id={qSliderId}
                  type="range"
                  min={MIN_Q}
                  max={MAX_Q}
                  step={0.1}
                  value={activeBand.q}
                  disabled={disabled}
                  aria-label="Band Q bandwidth"
                  aria-valuetext={`Q ${formatQ(activeBand.q)}`}
                  data-testid="eq-inspector-q-slider"
                  onChange={(event) => {
                    if (disabled) return;
                    updateBand(activeBand.id, {
                      q: clampNumber(Number(event.target.value), MIN_Q, MAX_Q, activeBand.q),
                    });
                  }}
                  className="prism-focus-ring w-full h-1.5 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ accentColor: 'var(--prism-primary-main)' }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

ParametricEqGraph.displayName = 'ParametricEqGraph';
