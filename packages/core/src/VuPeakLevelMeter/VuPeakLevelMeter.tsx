'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import { Activity, AlertTriangle, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type MeterOrientation = 'vertical' | 'horizontal';

export interface MeterChannelReading {
  /** Stable unique channel identifier (e.g. 'left', 'right', 'bus-1'). */
  id: string;
  /** Visible channel label rendered beside the segmented meter strip (e.g. 'L', 'R'). */
  label: string;
  /** Live audio level in dBFS, sanitized and clamped into [-60..+6]. */
  levelDb: number;
  /** Optional external peak level in dBFS, sanitized and clamped into [levelDb..+6]. */
  peakDb?: number;
}

export interface VuPeakLevelMeterProps extends BaseProps<HTMLDivElement> {
  /** Per-channel audio level readings; defaults to stereo L (-8.5 dB) / R (-6.2 dB) when omitted. */
  channels?: ReadonlyArray<MeterChannelReading>;
  /** Meter strip orientation ('vertical' | 'horizontal'; defaults to 'vertical'). */
  orientation?: MeterOrientation;
  /** Discrete LED segments per channel, clamped to [10..40] (defaults to 24). */
  segments?: number;
  /** Warning (amber) threshold in dBFS, clamped to [-60..+6] (defaults to -12). */
  warnThresholdDb?: number;
  /** Clip (red) threshold in dBFS, clamped to [warnThresholdDb..+6] (defaults to 0). */
  clipThresholdDb?: number;
  /** Controlled clip alert override; supersedes internal auto-detected clip state when defined. */
  clipped?: boolean;
  /** Callback invoked when the user clicks the CLIP alert or Reset Peak control. */
  onClearClip?: () => void;
  /** Visible meter heading (defaults to 'Master Output VU'). */
  label?: string;
}

type MeterZone = 'nominal' | 'warn' | 'clip';

interface PeakTrackerEntry {
  heldPeakDb: number;
  clearedPropPeakDb: number | undefined;
}

interface NormalizedChannel {
  key: string;
  displayLabel: string;
  accessibleLabel: string;
  levelDb: number;
  rawPeakDb: number | undefined;
}

interface EvaluatedChannel extends NormalizedChannel {
  effectivePeakDb: number;
  nextClearedPropPeakDb: number | undefined;
  litCount: number;
  peakSegmentIndex: number;
  isLiveClipped: boolean;
  isPeakClipped: boolean;
}

interface SegmentDescriptor {
  key: string;
  index: number;
  zone: MeterZone;
  colorToken: string;
}

interface ScaleTick {
  key: string;
  db: number;
  label: string;
  offsetPct: number;
}

const MIN_DB = -60;
const MAX_DB = 6;
const DB_SPAN = MAX_DB - MIN_DB;
const DEFAULT_SEGMENTS = 24;
const MIN_SEGMENTS = 10;
const MAX_SEGMENTS = 40;
const DEFAULT_WARN_DB = -12;
const DEFAULT_CLIP_DB = 0;

const SCALE_TICKS_VERTICAL_DB: readonly number[] = [6, 0, -6, -12, -24, -48, -60];
const SCALE_TICKS_HORIZONTAL_DB: readonly number[] = [-60, -48, -24, -12, -6, 0, 6];

const DEFAULT_CHANNELS: ReadonlyArray<MeterChannelReading> = [
  { id: 'left', label: 'L', levelDb: -8.5 },
  { id: 'right', label: 'R', levelDb: -6.2 },
];

function formatDb(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) {
    return `+${rounded.toFixed(1)}`;
  }
  if (rounded === 0) {
    return '0.0';
  }
  return rounded.toFixed(1);
}

function formatScaleTick(db: number): string {
  return db > 0 ? `+${db}` : String(db);
}

function getZoneForDb(db: number, warnDb: number, clipDb: number): MeterZone {
  if (db >= clipDb) {
    return 'clip';
  }
  if (db >= warnDb) {
    return 'warn';
  }
  return 'nominal';
}

function getZoneColorToken(zone: MeterZone): string {
  switch (zone) {
    case 'clip':
      return 'var(--prism-error-main)';
    case 'warn':
      return 'var(--prism-warning-main)';
    case 'nominal':
      return 'var(--prism-success-main)';
  }
}

function getScaleTickColor(db: number, warnDb: number, clipDb: number): string {
  if (db >= clipDb) {
    return 'var(--prism-error-main)';
  }
  if (db >= warnDb) {
    return 'var(--prism-warning-main)';
  }
  return 'var(--prism-text-secondary)';
}

function dbToLitCount(db: number, segmentCount: number): number {
  if (db <= MIN_DB) {
    return 0;
  }
  const ratio = (db - MIN_DB) / DB_SPAN;
  return Math.max(1, Math.min(segmentCount, Math.ceil(ratio * segmentCount)));
}

function computeAggregateRmsDb(channels: ReadonlyArray<EvaluatedChannel>): number {
  let powerSum = 0;
  for (const channel of channels) {
    powerSum += Math.pow(10, channel.levelDb / 10);
  }
  const meanPower = powerSum / channels.length;
  return clampNumber(10 * Math.log10(meanPower), MIN_DB, MAX_DB, MIN_DB);
}

const VERTICAL_SCALE_TICKS: ReadonlyArray<ScaleTick> = SCALE_TICKS_VERTICAL_DB.map((db) => ({
  key: `vtick-${db}`,
  db,
  label: formatScaleTick(db),
  offsetPct: ((MAX_DB - db) / DB_SPAN) * 100,
}));

const HORIZONTAL_SCALE_TICKS: ReadonlyArray<ScaleTick> = SCALE_TICKS_HORIZONTAL_DB.map((db) => ({
  key: `htick-${db}`,
  db,
  label: formatScaleTick(db),
  offsetPct: ((db - MIN_DB) / DB_SPAN) * 100,
}));

function renderChannelSegments(
  channel: EvaluatedChannel,
  descriptors: ReadonlyArray<SegmentDescriptor>,
  isVertical: boolean
) {
  return descriptors.map((seg) => {
    const isLit = seg.index < channel.litCount;
    const isPeakHold = seg.index === channel.peakSegmentIndex;
    const isActive = isLit || isPeakHold;

    return (
      <span
        key={seg.key}
        aria-hidden="true"
        data-testid={`vu-segment-${channel.key}-${seg.index}`}
        data-zone={seg.zone}
        data-lit={isLit ? 'true' : 'false'}
        data-peak-hold={isPeakHold ? 'true' : undefined}
        className={cx(
          'block flex-1 rounded-[2px] transition-opacity duration-75',
          isVertical ? 'w-full' : 'h-full'
        )}
        style={{
          backgroundColor: isActive ? seg.colorToken : 'var(--prism-divider)',
          opacity: isActive ? 1 : 0.45,
          boxShadow: isPeakHold ? `0 0 6px ${seg.colorToken}` : undefined,
        }}
      />
    );
  });
}

export function VuPeakLevelMeter({
  channels,
  orientation = 'vertical',
  segments = DEFAULT_SEGMENTS,
  warnThresholdDb = DEFAULT_WARN_DB,
  clipThresholdDb = DEFAULT_CLIP_DB,
  clipped,
  onClearClip,
  label = 'Master Output VU',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: VuPeakLevelMeterProps) {
  const override = useComponentOverride('VuPeakLevelMeter');
  const headingId = useId();

  const safeSegments = Math.round(
    clampNumber(segments, MIN_SEGMENTS, MAX_SEGMENTS, DEFAULT_SEGMENTS)
  );
  const safeWarnDb = clampNumber(warnThresholdDb, MIN_DB, MAX_DB, DEFAULT_WARN_DB);
  const safeClipDb = clampNumber(
    clipThresholdDb,
    safeWarnDb,
    MAX_DB,
    Math.max(safeWarnDb, DEFAULT_CLIP_DB)
  );

  const trimmedLabel = label.trim();
  const displayLabel = trimmedLabel.length > 0 ? label : 'Master Output VU';
  const sourceChannels = channels ?? DEFAULT_CHANNELS;

  const normalizedChannels = useMemo<ReadonlyArray<NormalizedChannel>>(() => {
    const keyCounts = new Map<string, number>();
    return sourceChannels.map((ch) => {
      const trimmedId = ch.id.trim();
      const baseId = trimmedId.length > 0 ? trimmedId : 'channel';
      const seen = keyCounts.get(baseId) ?? 0;
      keyCounts.set(baseId, seen + 1);
      const key = seen === 0 ? baseId : `${baseId}#${seen + 1}`;
      const trimmedChLabel = ch.label.trim();
      const levelDb = clampNumber(ch.levelDb, MIN_DB, MAX_DB, MIN_DB);
      const rawPeakDb =
        ch.peakDb !== undefined
          ? clampNumber(ch.peakDb, levelDb, MAX_DB, levelDb)
          : undefined;

      return {
        key,
        displayLabel: trimmedChLabel.length > 0 ? ch.label : 'CH',
        accessibleLabel: trimmedChLabel.length > 0 ? trimmedChLabel : 'Channel',
        levelDb,
        rawPeakDb,
      };
    });
  }, [sourceChannels]);

  const segmentDescriptors = useMemo<ReadonlyArray<SegmentDescriptor>>(() => {
    const list: SegmentDescriptor[] = [];
    for (let i = 0; i < safeSegments; i += 1) {
      const thresholdDb = MIN_DB + ((i + 1) / safeSegments) * DB_SPAN;
      const zone = getZoneForDb(thresholdDb, safeWarnDb, safeClipDb);
      list.push({
        key: `seg-${i}`,
        index: i,
        zone,
        colorToken: getZoneColorToken(zone),
      });
    }
    return list;
  }, [safeSegments, safeWarnDb, safeClipDb]);

  const [peakMap, setPeakMap] = useState<Map<string, PeakTrackerEntry>>(
    () => new Map<string, PeakTrackerEntry>()
  );
  const [clipLatched, setClipLatched] = useState<boolean>(false);

  const evaluatedChannels = useMemo<ReadonlyArray<EvaluatedChannel>>(() => {
    return normalizedChannels.map((ch) => {
      const tracker = peakMap.get(ch.key);
      const propPeakIsCleared =
        ch.rawPeakDb !== undefined &&
        tracker !== undefined &&
        tracker.clearedPropPeakDb === ch.rawPeakDb;
      const incomingPeak =
        ch.rawPeakDb !== undefined && !propPeakIsCleared
          ? Math.max(ch.levelDb, ch.rawPeakDb)
          : ch.levelDb;
      const effectivePeakDb =
        tracker !== undefined
          ? Math.max(tracker.heldPeakDb, incomingPeak)
          : incomingPeak;
      const nextClearedPropPeakDb = propPeakIsCleared
        ? tracker.clearedPropPeakDb
        : undefined;
      const litCount = dbToLitCount(ch.levelDb, safeSegments);
      const peakSegmentIndex = dbToLitCount(effectivePeakDb, safeSegments) - 1;

      return {
        ...ch,
        effectivePeakDb,
        nextClearedPropPeakDb,
        litCount,
        peakSegmentIndex,
        isLiveClipped: ch.levelDb >= safeClipDb,
        isPeakClipped: effectivePeakDb >= safeClipDb,
      };
    });
  }, [normalizedChannels, peakMap, safeSegments, safeClipDb]);

  const isEmpty = evaluatedChannels.length === 0;
  const anyChannelClipped = evaluatedChannels.some(
    (ch) => ch.isLiveClipped || ch.isPeakClipped
  );

  useEffect(() => {
    setPeakMap((prev) => {
      let changed = prev.size !== evaluatedChannels.length;
      const next = new Map<string, PeakTrackerEntry>();
      for (const ch of evaluatedChannels) {
        const existing = prev.get(ch.key);
        if (
          !existing ||
          existing.heldPeakDb !== ch.effectivePeakDb ||
          existing.clearedPropPeakDb !== ch.nextClearedPropPeakDb
        ) {
          changed = true;
        }
        next.set(ch.key, {
          heldPeakDb: ch.effectivePeakDb,
          clearedPropPeakDb: ch.nextClearedPropPeakDb,
        });
      }
      return changed ? next : prev;
    });
  }, [evaluatedChannels]);

  useEffect(() => {
    if (anyChannelClipped && !clipLatched) {
      setClipLatched(true);
    }
  }, [anyChannelClipped, clipLatched]);

  const isClipped = clipped !== undefined ? clipped : anyChannelClipped || clipLatched;

  const aggregateRmsDb = useMemo(
    () => (isEmpty ? MIN_DB : computeAggregateRmsDb(evaluatedChannels)),
    [isEmpty, evaluatedChannels]
  );

  const aggregatePeakDb = useMemo(() => {
    if (isEmpty) {
      return MIN_DB;
    }
    let maxPeak = MIN_DB;
    for (const ch of evaluatedChannels) {
      if (ch.effectivePeakDb > maxPeak) {
        maxPeak = ch.effectivePeakDb;
      }
    }
    return maxPeak;
  }, [isEmpty, evaluatedChannels]);

  const handleClearClip = useCallback(() => {
    setClipLatched(false);
    setPeakMap(() => {
      const resetMap = new Map<string, PeakTrackerEntry>();
      for (const ch of normalizedChannels) {
        resetMap.set(ch.key, {
          heldPeakDb: ch.levelDb,
          clearedPropPeakDb: ch.rawPeakDb,
        });
      }
      return resetMap;
    });
    onClearClip?.();
  }, [normalizedChannels, onClearClip]);

  const handleControlKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClearClip();
      }
    },
    [handleClearClip]
  );

  const merged = mergeProps({
    themeTarget: themeProps('vu-peak-level-meter', {
      orientation,
      clipped: isClipped,
      empty: isEmpty,
    }),
    baseClassName:
      'prism-slab relative w-full max-w-full min-w-0 p-4 flex flex-col gap-3 transition-all',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('vu-peak-level-meter', 'header');
  const readoutClass = stableClassName('vu-peak-level-meter', 'readout');
  const clipButtonClass = stableClassName('vu-peak-level-meter', 'clip');
  const resetButtonClass = stableClassName('vu-peak-level-meter', 'reset');
  const meterWellClass = stableClassName('vu-peak-level-meter', 'meter');
  const scaleClass = stableClassName('vu-peak-level-meter', 'scale');

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={!rest['aria-label'] ? headingId : undefined}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2 min-w-0')}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={{
              color: isClipped
                ? 'var(--prism-error-main)'
                : 'var(--prism-secondary-main)',
            }}
          >
            <Activity aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          </span>
          <span
            id={headingId}
            data-testid="vu-meter-label"
            className="text-xs font-semibold tracking-tight truncate min-w-0"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {displayLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 min-w-0 shrink-0">
          <button
            type="button"
            aria-pressed={isClipped}
            aria-label={
              isClipped
                ? 'CLIP alert active, clear clip and reset peak hold'
                : 'CLIP alert standby, reset peak hold'
            }
            data-testid="vu-clip-button"
            data-clipped={isClipped ? 'true' : undefined}
            onClick={handleClearClip}
            onKeyDown={handleControlKeyDown}
            className={cx(
              clipButtonClass,
              'prism-focus-ring inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full font-mono text-[11px] font-bold tracking-wider uppercase whitespace-nowrap shrink-0 cursor-pointer transition-all hover:brightness-105',
              isClipped ? '' : 'prism-crystal'
            )}
            style={
              isClipped
                ? {
                    backgroundColor: 'var(--prism-error-main)',
                    color: 'var(--prism-error-contrast)',
                    boxShadow: '0 0 12px var(--prism-error-main)',
                  }
                : {
                    color: 'var(--prism-text-secondary)',
                  }
            }
          >
            {isClipped ? (
              <AlertTriangle aria-hidden="true" className="w-3 h-3 shrink-0" />
            ) : (
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--prism-text-disabled)' }}
              />
            )}
            <span>CLIP</span>
          </button>

          {!isEmpty ? (
            <button
              type="button"
              aria-label="Reset Peak"
              data-testid="vu-reset-peak-button"
              onClick={handleClearClip}
              onKeyDown={handleControlKeyDown}
              className={cx(
                resetButtonClass,
                'prism-crystal prism-focus-ring inline-flex items-center gap-1 h-7 px-2.5 rounded-full font-mono text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-all hover:brightness-105'
              )}
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Reset Peak</span>
            </button>
          ) : null}
        </div>
      </div>

      <div
        data-testid="vu-dbfs-readout"
        className={cx(
          readoutClass,
          'prism-well rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 min-w-0'
        )}
      >
        <span
          className="font-mono text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap shrink-0"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          RMS / Peak dBFS
        </span>
        <div
          className="font-mono text-xs font-semibold tabular-nums flex flex-wrap items-center gap-1.5 min-w-0"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {isEmpty ? (
            <>
              <span data-testid="vu-rms-value">--</span>
              <span aria-hidden="true" style={{ color: 'var(--prism-text-disabled)' }}>
                /
              </span>
              <span data-testid="vu-peak-value">--</span>
              <span style={{ color: 'var(--prism-text-secondary)' }}>dBFS</span>
            </>
          ) : (
            <>
              <span>
                RMS{' '}
                <strong data-testid="vu-rms-value">{formatDb(aggregateRmsDb)}</strong>
              </span>
              <span aria-hidden="true" style={{ color: 'var(--prism-text-disabled)' }}>
                /
              </span>
              <span
                style={{
                  color: isClipped
                    ? 'var(--prism-error-main)'
                    : 'var(--prism-text-primary)',
                }}
              >
                Peak{' '}
                <strong data-testid="vu-peak-value">{formatDb(aggregatePeakDb)}</strong>{' '}
                dBFS
              </span>
            </>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="vu-empty-state"
          className="prism-well rounded-2xl px-4 py-6 text-center text-xs font-medium min-w-0"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No audio channels connected. Provide channel readings to monitor VU and peak levels.
        </div>
      ) : orientation === 'vertical' ? (
        <div className="flex flex-wrap items-stretch justify-center gap-3 min-w-0 w-full">
          <div
            aria-hidden="true"
            data-testid="vu-scale"
            className={cx(scaleClass, 'flex flex-col items-end shrink-0 select-none')}
          >
            <span className="h-6 shrink-0" />
            <div className="relative h-52 w-9 shrink-0">
              {VERTICAL_SCALE_TICKS.map((tick) => {
                const tickStyle =
                  tick.db === MAX_DB
                    ? { top: '0%', color: getScaleTickColor(tick.db, safeWarnDb, safeClipDb) }
                    : tick.db === MIN_DB
                      ? { bottom: '0%', color: getScaleTickColor(tick.db, safeWarnDb, safeClipDb) }
                      : {
                          top: `${tick.offsetPct}%`,
                          color: getScaleTickColor(tick.db, safeWarnDb, safeClipDb),
                        };

                return (
                  <span
                    key={tick.key}
                    data-testid={`vu-scale-tick-${tick.db}`}
                    className={cx(
                      'absolute right-0 inline-flex items-center gap-1 font-mono text-[10px] font-medium tabular-nums leading-none whitespace-nowrap',
                      tick.db !== MAX_DB && tick.db !== MIN_DB ? '-translate-y-1/2' : ''
                    )}
                    style={tickStyle}
                  >
                    <span>{tick.label}</span>
                    <span
                      className="w-1.5 h-px shrink-0"
                      style={{ backgroundColor: 'var(--prism-well-border)' }}
                    />
                  </span>
                );
              })}
            </div>
            <span className="h-5 shrink-0" />
          </div>

          <div className="flex flex-wrap items-stretch justify-center gap-2.5 min-w-0">
            {evaluatedChannels.map((ch) => (
              <div
                key={ch.key}
                data-testid={`vu-channel-${ch.key}`}
                className="flex flex-col items-center gap-1.5 min-w-0"
              >
                <span
                  data-testid={`vu-channel-label-${ch.key}`}
                  className="prism-crystal h-6 min-w-7 px-2 rounded-full inline-flex items-center justify-center font-mono text-[10px] font-bold tracking-wider truncate max-w-[5rem]"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {ch.displayLabel}
                </span>

                <div
                  role="meter"
                  aria-valuemin={MIN_DB}
                  aria-valuemax={MAX_DB}
                  aria-valuenow={Number(ch.levelDb.toFixed(1))}
                  aria-valuetext={`${formatDb(ch.levelDb)} dBFS, peak ${formatDb(ch.effectivePeakDb)} dBFS${ch.isLiveClipped || ch.isPeakClipped ? ', clipping' : ''}`}
                  aria-label={`${ch.accessibleLabel} level`}
                  data-testid={`vu-meter-${ch.key}`}
                  data-orientation="vertical"
                  data-clipped={ch.isLiveClipped || ch.isPeakClipped ? 'true' : undefined}
                  className={cx(
                    meterWellClass,
                    'prism-well rounded-xl p-1.5 h-52 w-7 sm:w-8 flex flex-col-reverse gap-0.5 shrink-0'
                  )}
                >
                  {renderChannelSegments(ch, segmentDescriptors, true)}
                </div>

                <span
                  data-testid={`vu-channel-readout-${ch.key}`}
                  className="h-5 inline-flex items-center font-mono text-[10px] font-semibold tabular-nums whitespace-nowrap"
                  style={{
                    color: ch.isLiveClipped
                      ? 'var(--prism-error-main)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {formatDb(ch.levelDb)} dB
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 min-w-0 w-full">
          {evaluatedChannels.map((ch) => (
            <div
              key={ch.key}
              data-testid={`vu-channel-${ch.key}`}
              className="flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0 w-full"
            >
              <span
                data-testid={`vu-channel-label-${ch.key}`}
                className="prism-crystal h-6 min-w-8 px-2 rounded-full inline-flex items-center justify-center font-mono text-[10px] font-bold tracking-wider shrink-0 truncate max-w-[5rem]"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {ch.displayLabel}
              </span>

              <div
                role="meter"
                aria-valuemin={MIN_DB}
                aria-valuemax={MAX_DB}
                aria-valuenow={Number(ch.levelDb.toFixed(1))}
                aria-valuetext={`${formatDb(ch.levelDb)} dBFS, peak ${formatDb(ch.effectivePeakDb)} dBFS${ch.isLiveClipped || ch.isPeakClipped ? ', clipping' : ''}`}
                aria-label={`${ch.accessibleLabel} level`}
                data-testid={`vu-meter-${ch.key}`}
                data-orientation="horizontal"
                data-clipped={ch.isLiveClipped || ch.isPeakClipped ? 'true' : undefined}
                className={cx(
                  meterWellClass,
                  'prism-well rounded-xl p-1.5 h-7 flex-1 min-w-[8rem] flex flex-row items-stretch gap-0.5'
                )}
              >
                {renderChannelSegments(ch, segmentDescriptors, false)}
              </div>

              <span
                data-testid={`vu-channel-readout-${ch.key}`}
                className="font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0 min-w-[4.5rem] text-right"
                style={{
                  color: ch.isLiveClipped
                    ? 'var(--prism-error-main)'
                    : 'var(--prism-text-secondary)',
                }}
              >
                {formatDb(ch.levelDb)} dB
              </span>
            </div>
          ))}

          <div
            aria-hidden="true"
            data-testid="vu-scale"
            className={cx(
              scaleClass,
              'flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 px-1 pt-0.5 min-w-0 select-none'
            )}
          >
            {HORIZONTAL_SCALE_TICKS.map((tick) => (
              <span
                key={tick.key}
                data-testid={`vu-scale-tick-${tick.db}`}
                className="font-mono text-[10px] font-medium tabular-nums whitespace-nowrap"
                style={{ color: getScaleTickColor(tick.db, safeWarnDb, safeClipDb) }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

VuPeakLevelMeter.displayName = 'VuPeakLevelMeter';
