'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_DIVIDER } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type FaderScaleMode = 'studio-db' | 'linear-pct';

type ChannelStripFaderBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ChannelStripFaderProps extends ChannelStripFaderBaseProps {
  /** Visible channel strip label and slider aria-label prefix (defaults to 'CH 1 · Vocals'). */
  label?: string;
  /** Controlled dB level in [minDb, maxDb]; minDb renders as -∞. */
  valueDb?: number;
  /** Initial dB level in uncontrolled mode (defaults to 0). */
  defaultValueDb?: number;
  /** Minimum inclusive dB floor representing -∞ silence (defaults to -60). */
  minDb?: number;
  /** Maximum inclusive dB headroom ceiling (defaults to 12). */
  maxDb?: number;
  /** Unity gain detent target in dB for double-click, Unity button, and '0' key snap (defaults to 0). */
  unityDb?: number;
  /** Readout scale presentation: 'studio-db' or 'linear-pct' (defaults to 'studio-db'). */
  scaleMode?: FaderScaleMode;
  /** Controlled channel mute state. */
  muted?: boolean;
  /** Initial mute state in uncontrolled mode (defaults to false). */
  defaultMuted?: boolean;
  /** Callback fired whenever mute state toggles. */
  onMutedChange?: (muted: boolean) => void;
  /** Callback fired with the next rounded and clamped dB level. */
  onChange?: (db: number) => void;
  /** Vertical recessed fader slot height in pixels, clamped to [140..340] (defaults to 220). */
  trackHeight?: number;
  /** Disables vertical drag, keyboard stepping, double-click unity snap, and strip buttons. */
  disabled?: boolean;
}

interface CalibrationTick {
  id: string;
  db: number;
  label: string;
  percent: number;
  isUnity: boolean;
}

const DEFAULT_LABEL = 'CH 1 · Vocals';
const FALLBACK_ACCESSIBLE_LABEL = 'Channel Strip';
const DEFAULT_VALUE_DB = 0;
const DEFAULT_MIN_DB = -60;
const DEFAULT_MAX_DB = 12;
const DEFAULT_UNITY_DB = 0;
const DEFAULT_TRACK_HEIGHT = 220;
const MIN_TRACK_HEIGHT = 140;
const MAX_TRACK_HEIGHT = 340;
const CAP_HEIGHT_PX = 36;
const CAP_HALF_PX = CAP_HEIGHT_PX / 2;
const ARROW_STEP_DB = 1;
const FINE_ARROW_STEP_DB = 0.5;
const PAGE_STEP_DB = 6;
const STANDARD_DB_MARKS: readonly number[] = [12, 6, 0, -6, -12, -24, -48];

function roundTenths(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function clampDb(raw: number, minDb: number, maxDb: number, fallback: number): number {
  return roundTenths(clampNumber(raw, minDb, maxDb, fallback));
}

function dbToRatio(db: number, minDb: number, maxDb: number): number {
  const span = maxDb - minDb;
  if (span === 0) return 0;
  return clampNumber((db - minDb) / span, 0, 1, 0);
}

function formatReadout(
  db: number,
  minDb: number,
  maxDb: number,
  scaleMode: FaderScaleMode
): string {
  if (scaleMode === 'linear-pct') {
    const pct = Math.round(dbToRatio(db, minDb, maxDb) * 100);
    return `${pct}%`;
  }
  if (db <= minDb) {
    return '-∞ dB';
  }
  if (db > 0) {
    return `+${db.toFixed(1)} dB`;
  }
  return `${db.toFixed(1)} dB`;
}

function formatTickLabel(db: number, minDb: number): string {
  if (db <= minDb) return '-∞';
  if (db > 0) return `+${db}`;
  return String(db);
}

function formatUnityShort(unityDb: number): string {
  if (unityDb > 0) return `+${unityDb} dB`;
  return `${unityDb} dB`;
}

function buildCalibrationTicks(
  minDb: number,
  maxDb: number,
  unityDb: number
): ReadonlyArray<CalibrationTick> {
  const span = maxDb - minDb;
  if (span === 0) {
    return [
      {
        id: `tick-${minDb}`,
        db: minDb,
        label: '-∞',
        percent: 50,
        isUnity: minDb === unityDb,
      },
    ];
  }

  const values = new Set<number>([maxDb, unityDb, minDb]);
  for (const mark of STANDARD_DB_MARKS) {
    if (mark > minDb && mark < maxDb) {
      values.add(mark);
    }
  }

  const sorted = Array.from(values).sort((a, b) => b - a);
  return sorted.map((db) => ({
    id: `tick-${db}`,
    db,
    label: formatTickLabel(db, minDb),
    percent: roundTwo(((db - minDb) / span) * 100),
    isUnity: db === unityDb,
  }));
}

function ChannelStripFaderInner({
  label = DEFAULT_LABEL,
  valueDb,
  defaultValueDb = DEFAULT_VALUE_DB,
  minDb = DEFAULT_MIN_DB,
  maxDb = DEFAULT_MAX_DB,
  unityDb = DEFAULT_UNITY_DB,
  scaleMode = 'studio-db',
  muted,
  defaultMuted = false,
  onMutedChange,
  onChange,
  trackHeight = DEFAULT_TRACK_HEIGHT,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ChannelStripFaderProps) {
  const override = useComponentOverride('ChannelStripFader');

  const rawMinDb = Number.isFinite(minDb) ? minDb : DEFAULT_MIN_DB;
  const rawMaxDb = Number.isFinite(maxDb) ? maxDb : DEFAULT_MAX_DB;
  const safeMinDb = roundTenths(Math.min(rawMinDb, rawMaxDb));
  const safeMaxDb = roundTenths(Math.max(rawMinDb, rawMaxDb));
  const fallbackUnity = clampDb(DEFAULT_UNITY_DB, safeMinDb, safeMaxDb, safeMinDb);
  const safeUnityDb = clampDb(unityDb, safeMinDb, safeMaxDb, fallbackUnity);
  const safeDefaultDb = clampDb(defaultValueDb, safeMinDb, safeMaxDb, safeUnityDb);
  const safeTrackHeight = Math.round(
    clampNumber(trackHeight, MIN_TRACK_HEIGHT, MAX_TRACK_HEIGHT, DEFAULT_TRACK_HEIGHT)
  );

  const trimmedLabel = label.trim();
  const displayLabel = trimmedLabel.length > 0 ? label : DEFAULT_LABEL;
  const accessibleLabel = trimmedLabel.length > 0 ? trimmedLabel : FALLBACK_ACCESSIBLE_LABEL;

  const isValueControlled = valueDb !== undefined;
  const [uncontrolledDb, setUncontrolledDb] = useState<number>(safeDefaultDb);
  const rawDb = isValueControlled ? valueDb : uncontrolledDb;
  const currentDb = clampDb(rawDb, safeMinDb, safeMaxDb, safeDefaultDb);

  const [isMuted, setIsMuted] = useControllableState<boolean>({
    value: muted,
    defaultValue: defaultMuted,
    onChange: onMutedChange,
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const latestRef = useRef({
    safeMinDb,
    safeMaxDb,
    isValueControlled,
    onChange,
  });
  latestRef.current = {
    safeMinDb,
    safeMaxDb,
    isValueControlled,
    onChange,
  };

  useEffect(() => {
    if (disabled) {
      cleanupDragRef.current?.();
      setIsDragging(false);
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const commitDb = useCallback(
    (targetRaw: number) => {
      const nextDb = clampDb(targetRaw, safeMinDb, safeMaxDb, currentDb);
      if (nextDb === currentDb) return;
      if (!isValueControlled) {
        setUncontrolledDb(nextDb);
      }
      onChange?.(nextDb);
    },
    [currentDb, isValueControlled, onChange, safeMaxDb, safeMinDb]
  );

  const handleTrackPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      cleanupDragRef.current?.();

      const trackEl = event.currentTarget;
      let workingDb = currentDb;

      const applyFromClientY = (clientY: number) => {
        const rect = trackEl.getBoundingClientRect();
        if (!Number.isFinite(rect.height) || rect.height <= 0) return;

        const inset = rect.height > CAP_HEIGHT_PX ? CAP_HALF_PX : 0;
        const usableHeight = rect.height - inset * 2;
        const ratio = clampNumber((rect.bottom - inset - clientY) / usableHeight, 0, 1, 0);

        const {
          safeMinDb: minBound,
          safeMaxDb: maxBound,
          isValueControlled: controlled,
          onChange: notifyChange,
        } = latestRef.current;

        const rawTarget = minBound + ratio * (maxBound - minBound);
        const snapped =
          ratio <= 0 ? minBound : ratio >= 1 ? maxBound : Math.round(rawTarget * 2) / 2;
        const nextDb = clampDb(snapped, minBound, maxBound, workingDb);

        if (nextDb !== workingDb) {
          workingDb = nextDb;
          if (!controlled) {
            setUncontrolledDb(nextDb);
          }
          notifyChange?.(nextDb);
        }
      };

      setIsDragging(true);
      applyFromClientY(event.clientY);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        applyFromClientY(moveEvent.clientY);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsDragging(false);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [currentDb, disabled]
  );

  const handleTrackDoubleClick = useCallback(() => {
    if (disabled) return;
    commitDb(safeUnityDb);
  }, [commitDb, disabled, safeUnityDb]);

  const handleTrackKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      const arrowDelta = event.shiftKey ? FINE_ARROW_STEP_DB : ARROW_STEP_DB;
      let targetDb: number | null = null;

      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
        targetDb = currentDb + arrowDelta;
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
        targetDb = currentDb - arrowDelta;
      } else if (event.key === 'PageUp') {
        targetDb = currentDb + PAGE_STEP_DB;
      } else if (event.key === 'PageDown') {
        targetDb = currentDb - PAGE_STEP_DB;
      } else if (event.key === 'Home') {
        targetDb = safeMinDb;
      } else if (event.key === 'End') {
        targetDb = safeMaxDb;
      } else if (event.key === '0') {
        targetDb = safeUnityDb;
      }

      if (targetDb === null) return;
      event.preventDefault();
      commitDb(targetDb);
    },
    [commitDb, currentDb, disabled, safeMaxDb, safeMinDb, safeUnityDb]
  );

  const handleUnityClick = useCallback(() => {
    commitDb(safeUnityDb);
  }, [commitDb, safeUnityDb]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted, setIsMuted]);

  const ratio = dbToRatio(currentDb, safeMinDb, safeMaxDb);
  const fillPercent = roundTwo(ratio * 100);
  const unityPercent = roundTwo(dbToRatio(safeUnityDb, safeMinDb, safeMaxDb) * 100);
  const isAtUnity = currentDb === safeUnityDb;
  const isAtFloor = currentDb <= safeMinDb;
  const readoutText = formatReadout(currentDb, safeMinDb, safeMaxDb, scaleMode);
  const unityShortLabel = formatUnityShort(safeUnityDb);
  const ariaValueText = isMuted ? `${readoutText} (muted)` : readoutText;

  const ticks = useMemo(
    () => buildCalibrationTicks(safeMinDb, safeMaxDb, safeUnityDb),
    [safeMaxDb, safeMinDb, safeUnityDb]
  );

  const merged = mergeProps({
    themeTarget: themeProps('channel-strip-fader', {
      scaleMode,
      muted: isMuted,
      dragging: isDragging && !disabled,
      unity: isAtUnity,
      atFloor: isAtFloor,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-[160px] min-w-0 p-3 flex flex-col items-center gap-2.5 select-none',
      disabled ? 'opacity-60' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const labelClass = stableClassName('channel-strip-fader', 'label');
  const readoutClass = stableClassName('channel-strip-fader', 'readout');
  const slotClass = stableClassName('channel-strip-fader', 'slot');
  const ticksClass = stableClassName('channel-strip-fader', 'ticks');
  const fillClass = stableClassName('channel-strip-fader', 'fill');
  const capClass = stableClassName('channel-strip-fader', 'cap');
  const grooveClass = stableClassName('channel-strip-fader', 'groove');
  const controlsClass = stableClassName('channel-strip-fader', 'controls');

  const readoutColor = isMuted
    ? 'var(--prism-text-disabled)'
    : isAtFloor
      ? 'var(--prism-text-secondary)'
      : currentDb >= safeUnityDb
        ? 'var(--prism-primary-main)'
        : 'var(--prism-text-primary)';

  const activeFillBackground = isMuted
    ? 'var(--prism-text-disabled)'
    : 'linear-gradient(180deg, var(--prism-primary-light) 0%, var(--prism-primary-main) 100%)';

  const grooveColor =
    isMuted || disabled ? 'var(--prism-text-disabled)' : 'var(--prism-primary-main)';

  return (
    <div
      ref={ref}
      role="group"
      aria-label={accessibleLabel}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Top Channel Label */}
      <span
        data-testid="channel-strip-fader-label"
        className={cx(
          labelClass,
          'w-full max-w-full min-w-0 text-center text-xs font-semibold tracking-tight truncate'
        )}
        style={{
          color: isMuted ? 'var(--prism-text-secondary)' : 'var(--prism-text-primary)',
        }}
      >
        {displayLabel}
      </span>

      {/* Live Tabular dB / % Readout Pill */}
      <span
        data-testid="channel-strip-fader-readout"
        data-scale-mode={scaleMode}
        className={cx(
          readoutClass,
          'prism-well w-full max-w-full min-w-0 rounded-full px-2.5 py-1 text-center font-mono text-xs font-bold tabular-nums whitespace-nowrap'
        )}
        style={{
          color: readoutColor,
          boxShadow: isMuted ? 'inset 0 0 0 1px var(--prism-error-main)' : undefined,
        }}
      >
        {readoutText}
      </span>

      {/* Calibrated Scale + Vertical Recessed Fader Slot */}
      <div className="w-full max-w-full min-w-0 flex items-center justify-center gap-1.5">
        {/* Left Calibrated dB Markings */}
        <div
          aria-hidden="true"
          data-testid="channel-strip-fader-ticks"
          className={cx(ticksClass, 'relative w-9 shrink-0 pointer-events-none')}
          style={{ height: `${safeTrackHeight}px` }}
        >
          <div
            className="absolute inset-x-0"
            style={{ top: `${CAP_HALF_PX}px`, bottom: `${CAP_HALF_PX}px` }}
          >
            {ticks.map((tick) => (
              <div
                key={tick.id}
                data-testid={`channel-strip-fader-tick-${tick.db}`}
                data-unity={tick.isUnity ? 'true' : undefined}
                className="absolute right-0 flex items-center gap-1"
                style={{
                  bottom: `${tick.percent}%`,
                  transform: 'translateY(50%)',
                }}
              >
                <span
                  className={cx(
                    'font-mono text-[10px] leading-none tabular-nums whitespace-nowrap',
                    tick.isUnity ? 'font-bold' : 'font-medium'
                  )}
                  style={{
                    color: tick.isUnity
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {tick.label}
                </span>
                <span
                  className={cx('rounded-full shrink-0', tick.isUnity ? 'w-2 h-[1.5px]' : 'w-1.5 h-[1px]')}
                  style={{
                    backgroundColor: tick.isUnity
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-divider)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Long-Throw Recessed Vertical Fader Slot */}
        <div
          role="slider"
          aria-orientation="vertical"
          aria-label={`${accessibleLabel} fader level`}
          aria-valuemin={safeMinDb}
          aria-valuemax={safeMaxDb}
          aria-valuenow={currentDb}
          aria-valuetext={ariaValueText}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          data-testid="channel-strip-fader-track"
          data-dragging={isDragging && !disabled ? 'true' : undefined}
          onPointerDown={handleTrackPointerDown}
          onDoubleClick={handleTrackDoubleClick}
          onKeyDown={handleTrackKeyDown}
          style={{
            height: `${safeTrackHeight}px`,
            touchAction: 'none',
          }}
          className={cx(
            slotClass,
            'prism-well prism-focus-ring relative w-12 shrink-0 rounded-xl touch-none',
            disabled
              ? 'cursor-not-allowed'
              : isDragging
                ? 'cursor-grabbing'
                : 'cursor-ns-resize'
          )}
        >
          {/* Inner Travel Rail Aligned Pixel-for-Pixel with Calibration Ticks */}
          <div
            className="absolute inset-x-0"
            style={{ top: `${CAP_HALF_PX}px`, bottom: `${CAP_HALF_PX}px` }}
          >
            {/* Machined Center Channel Groove */}
            <div
              aria-hidden="true"
              className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-1.5 rounded-full pointer-events-none"
              style={STYLE_BG_DIVIDER}
            />

            {/* Unity Detent Crosshair on Rail */}
            <div
              aria-hidden="true"
              data-testid="channel-strip-fader-unity-notch"
              className="absolute left-1/2 -translate-x-1/2 w-5 h-[1.5px] rounded-full pointer-events-none"
              style={{
                bottom: `${unityPercent}%`,
                transform: 'translate(-50%, 50%)',
                backgroundColor: 'var(--prism-primary-main)',
                opacity: 0.75,
              }}
            />

            {/* Illuminated Optical Fill Track Below Cap */}
            <div
              aria-hidden="true"
              data-testid="channel-strip-fader-fill"
              data-muted={isMuted ? 'true' : undefined}
              className={cx(
                fillClass,
                'absolute left-1/2 -translate-x-1/2 bottom-0 w-1.5 rounded-full pointer-events-none'
              )}
              style={{
                height: `${fillPercent}%`,
                background: activeFillBackground,
                opacity: isAtFloor ? 0 : isMuted ? 0.45 : 1,
              }}
            />

            {/* Sculpted Tactile Prism-Crystal Fader Cap with Center Tangent Groove */}
            <div
              aria-hidden="true"
              data-testid="channel-strip-fader-cap"
              className={cx(
                capClass,
                'prism-crystal absolute left-1/2 w-10 h-9 rounded-lg border border-[var(--prism-divider)] flex flex-col items-center justify-center gap-1'
              )}
              style={{
                bottom: `${fillPercent}%`,
                transform: 'translate(-50%, 50%)',
              }}
            >
              <span
                className="w-5 h-[1px] rounded-full"
                style={STYLE_BG_DIVIDER}
              />
              <span
                data-testid="channel-strip-fader-groove"
                className={cx(grooveClass, 'w-7 h-[2.5px] rounded-full')}
                style={{ backgroundColor: grooveColor }}
              />
              <span
                className="w-5 h-[1px] rounded-full"
                style={STYLE_BG_DIVIDER}
              />
            </div>
          </div>
        </div>

        {/* Right Mirror Calibration Hairlines */}
        <div
          aria-hidden="true"
          className="relative w-4 shrink-0 pointer-events-none"
          style={{ height: `${safeTrackHeight}px` }}
        >
          <div
            className="absolute inset-x-0"
            style={{ top: `${CAP_HALF_PX}px`, bottom: `${CAP_HALF_PX}px` }}
          >
            {ticks.map((tick) => (
              <span
                key={`mirror-${tick.id}`}
                className={cx(
                  'absolute left-0 rounded-full',
                  tick.isUnity ? 'w-3 h-[1.5px]' : 'w-2 h-[1px]'
                )}
                style={{
                  bottom: `${tick.percent}%`,
                  transform: 'translateY(50%)',
                  backgroundColor: tick.isUnity
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-divider)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Channel Strip Action Controls: Unity 0 dB & Mute */}
      <div className={cx(controlsClass, 'w-full max-w-full min-w-0 flex flex-col gap-1.5')}>
        <button
          type="button"
          disabled={disabled}
          data-testid="channel-strip-fader-unity"
          data-active={isAtUnity ? 'true' : undefined}
          aria-label={`Set ${accessibleLabel} to unity ${unityShortLabel}`}
          onClick={handleUnityClick}
          className="prism-crystal prism-focus-ring w-full max-w-full min-w-0 h-7 px-2 rounded-full font-mono text-[11px] font-semibold inline-flex items-center justify-center whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          style={
            isAtUnity
              ? {
                  color: 'var(--prism-primary-main)',
                  boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)',
                }
              : { color: 'var(--prism-text-primary)' }
          }
        >
          Unity {unityShortLabel}
        </button>

        <button
          type="button"
          disabled={disabled}
          aria-pressed={isMuted}
          aria-label={`Mute ${accessibleLabel}`}
          data-testid="channel-strip-fader-mute"
          data-active={isMuted ? 'true' : undefined}
          onClick={handleMuteToggle}
          className={cx(
            'prism-focus-ring w-full max-w-full min-w-0 h-7 px-2 rounded-full font-mono text-[11px] font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]',
            isMuted ? '' : 'prism-crystal'
          )}
          style={
            isMuted
              ? {
                  backgroundColor: 'var(--prism-error-main)',
                  color: 'var(--prism-error-contrast)',
                  boxShadow: '0 0 0 1px var(--prism-error-main)',
                }
              : { color: 'var(--prism-text-secondary)' }
          }
        >
          {isMuted ? (
            <VolumeX aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Volume2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          )}
          Mute
        </button>
      </div>
    </div>
  );
}

export const ChannelStripFader = memo(ChannelStripFaderInner);
ChannelStripFader.displayName = 'ChannelStripFader';
