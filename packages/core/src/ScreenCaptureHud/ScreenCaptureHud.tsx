'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  AppWindow,
  Camera,
  Crop,
  Folder,
  Mic,
  MicOff,
  Monitor,
  Square,
  Timer,
  Video,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BG_WARNING, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type CaptureTargetMode = 'fullscreen' | 'window' | 'region';

export type CaptureOutputKind = 'screenshot' | 'recording';

export type CaptureDelaySeconds = 0 | 3 | 5 | 10;

export type CaptureSaveLocation = 'desktop' | 'clipboard' | 'documents';

export interface ScreenCaptureResult {
  /** Selected screen capture geometry mode. */
  target: CaptureTargetMode;
  /** Output media kind produced by the HUD. */
  output: CaptureOutputKind;
  /** Countdown delay in seconds configured before capture or recording began. */
  delaySeconds: CaptureDelaySeconds;
  /** Destination where the capture artifact is saved. */
  saveLocation: CaptureSaveLocation;
  /** Whether microphone audio capture was enabled (always false for screenshots). */
  includeMic: boolean;
  /** Elapsed recording duration in whole seconds (0 for screenshots). */
  durationSeconds: number;
}

type ScreenCaptureHudBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ScreenCaptureHudProps extends ScreenCaptureHudBaseProps {
  /** Initial capture target geometry mode (defaults to 'fullscreen'). */
  defaultTarget?: CaptureTargetMode;
  /** Initial capture output kind (defaults to 'screenshot'). */
  defaultOutput?: CaptureOutputKind;
  /** Initial countdown timer delay in seconds (defaults to 0). */
  defaultDelaySeconds?: CaptureDelaySeconds;
  /** Initial save destination (defaults to 'desktop'). */
  defaultSaveLocation?: CaptureSaveLocation;
  /** Initial microphone toggle state for recording mode (defaults to false). */
  defaultIncludeMic?: boolean;
  /** Callback fired when a screenshot completes or an active video recording is stopped. */
  onCaptureComplete?: (result: ScreenCaptureResult) => void;
  /** Optional dismiss handler; when provided, renders the Close HUD button. */
  onDismiss?: () => void;
  /** Disables all toolbar controls and cancels any active countdown or recording timer. */
  disabled?: boolean;
}

type CaptureHudPhase = 'idle' | 'countdown' | 'recording';

interface TargetModeOption {
  mode: CaptureTargetMode;
  label: string;
  icon: ReactNode;
}

interface CaptureLatestSnapshot {
  target: CaptureTargetMode;
  output: CaptureOutputKind;
  delaySeconds: CaptureDelaySeconds;
  saveLocation: CaptureSaveLocation;
  includeMic: boolean;
  onCaptureComplete: ((result: ScreenCaptureResult) => void) | undefined;
}

const TARGET_LABELS: Record<CaptureTargetMode, string> = {
  fullscreen: 'Full Screen',
  window: 'Window',
  region: 'Region',
};

const NEXT_TARGET_MODE: Record<CaptureTargetMode, CaptureTargetMode> = {
  fullscreen: 'window',
  window: 'region',
  region: 'fullscreen',
};

const PREV_TARGET_MODE: Record<CaptureTargetMode, CaptureTargetMode> = {
  fullscreen: 'region',
  window: 'fullscreen',
  region: 'window',
};

const SAVE_LOCATION_LABELS: Record<CaptureSaveLocation, string> = {
  desktop: 'Desktop',
  clipboard: 'Clipboard',
  documents: 'Documents/Captures',
};

const DELAY_LABELS: Record<CaptureDelaySeconds, string> = {
  0: 'No Delay',
  3: '3s',
  5: '5s',
  10: '10s',
};

const TARGET_OPTIONS: ReadonlyArray<TargetModeOption> = [
  {
    mode: 'fullscreen',
    label: 'Full Screen',
    icon: <Monitor aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    mode: 'window',
    label: 'Window',
    icon: <AppWindow aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    mode: 'region',
    label: 'Region',
    icon: <Crop aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />,
  },
];

const SELECT_OPTION_STYLE: CSSProperties = {
  backgroundColor: 'var(--prism-bg-mid)',
  color: 'var(--prism-text-primary)',
};

function parseDelayOption(raw: string): CaptureDelaySeconds {
  if (raw === '3') return 3;
  if (raw === '5') return 5;
  if (raw === '10') return 10;
  return 0;
}

function parseSaveLocationOption(raw: string): CaptureSaveLocation {
  if (raw === 'clipboard') return 'clipboard';
  if (raw === 'documents') return 'documents';
  return 'desktop';
}

function formatRecordingClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const mins = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const secs = String(safeSeconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function ScreenCaptureHudInner({
  defaultTarget = 'fullscreen',
  defaultOutput = 'screenshot',
  defaultDelaySeconds = 0,
  defaultSaveLocation = 'desktop',
  defaultIncludeMic = false,
  onCaptureComplete,
  onDismiss,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ScreenCaptureHudProps) {
  const uid = useId();
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const timerSelectId = `screen-capture-timer-${safeUid}`;
  const saveSelectId = `screen-capture-save-${safeUid}`;

  const override = useComponentOverride('ScreenCaptureHud');

  const [target, setTarget] = useState<CaptureTargetMode>(defaultTarget);
  const [output, setOutput] = useState<CaptureOutputKind>(defaultOutput);
  const [delaySeconds, setDelaySeconds] = useState<CaptureDelaySeconds>(defaultDelaySeconds);
  const [saveLocation, setSaveLocation] = useState<CaptureSaveLocation>(defaultSaveLocation);
  const [includeMic, setIncludeMic] = useState<boolean>(defaultIncludeMic);
  const [phase, setPhase] = useState<CaptureHudPhase>('idle');
  const [countdownRemaining, setCountdownRemaining] = useState<number>(0);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const radioRefs = useRef<Map<CaptureTargetMode, HTMLButtonElement>>(new Map());
  const countdownRef = useRef<number>(0);
  const recordingSecondsRef = useRef<number>(0);

  const latestRef = useRef<CaptureLatestSnapshot>({
    target,
    output,
    delaySeconds,
    saveLocation,
    includeMic,
    onCaptureComplete,
  });
  latestRef.current = {
    target,
    output,
    delaySeconds,
    saveLocation,
    includeMic,
    onCaptureComplete,
  };

  // Cancel active countdown or recording cleanly if the HUD becomes disabled.
  useEffect(() => {
    if (!disabled || phase === 'idle') return;
    countdownRef.current = 0;
    recordingSecondsRef.current = 0;
    setCountdownRemaining(0);
    setRecordingSeconds(0);
    setPhase('idle');
    setStatusMessage('Capture cancelled while HUD is disabled');
  }, [disabled, phase]);

  // Countdown interval ticking once per second with strict cleanup on cancel, disable, or unmount.
  useEffect(() => {
    if (phase !== 'countdown' || disabled) return;

    const intervalId = window.setInterval(() => {
      const next = countdownRef.current - 1;
      if (next <= 0) {
        window.clearInterval(intervalId);
        countdownRef.current = 0;
        setCountdownRemaining(0);

        const snap = latestRef.current;
        if (snap.output === 'recording') {
          recordingSecondsRef.current = 0;
          setRecordingSeconds(0);
          setPhase('recording');
          setStatusMessage(
            `Recording started (${TARGET_LABELS[snap.target]} · ${SAVE_LOCATION_LABELS[snap.saveLocation]})`
          );
        } else {
          const result: ScreenCaptureResult = {
            target: snap.target,
            output: 'screenshot',
            delaySeconds: snap.delaySeconds,
            saveLocation: snap.saveLocation,
            includeMic: false,
            durationSeconds: 0,
          };
          setPhase('idle');
          setStatusMessage(
            `Screenshot captured (${TARGET_LABELS[result.target]}) and saved to ${SAVE_LOCATION_LABELS[result.saveLocation]}`
          );
          snap.onCaptureComplete?.(result);
        }
      } else {
        countdownRef.current = next;
        setCountdownRemaining(next);
        setStatusMessage(`Capturing in ${next}s…`);
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [phase, disabled]);

  // Live recording elapsed clock ticking once per second with strict cleanup on stop, disable, or unmount.
  useEffect(() => {
    if (phase !== 'recording' || disabled) return;

    const intervalId = window.setInterval(() => {
      const next = recordingSecondsRef.current + 1;
      recordingSecondsRef.current = next;
      setRecordingSeconds(next);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [phase, disabled]);

  const isBusy = phase !== 'idle';
  const controlsDisabled = disabled || isBusy;
  const micActive = output === 'recording' && includeMic;

  const handleSelectTarget = useCallback((nextTarget: CaptureTargetMode) => {
    setTarget(nextTarget);
    setStatusMessage(`Capture target set to ${TARGET_LABELS[nextTarget]}`);
  }, []);

  const handleTargetKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentMode: CaptureTargetMode) => {
      if (controlsDisabled || event.nativeEvent.isComposing) return;

      let nextMode: CaptureTargetMode | null = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextMode = NEXT_TARGET_MODE[currentMode];
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextMode = PREV_TARGET_MODE[currentMode];
      } else if (event.key === 'Home') {
        nextMode = 'fullscreen';
      } else if (event.key === 'End') {
        nextMode = 'region';
      }

      if (!nextMode) return;

      event.preventDefault();
      setTarget(nextMode);
      setStatusMessage(`Capture target set to ${TARGET_LABELS[nextMode]}`);
      const nextBtn = radioRefs.current.get(nextMode);
      if (nextBtn) {
        nextBtn.focus();
      }
    },
    [controlsDisabled]
  );

  const handleSelectOutput = useCallback((nextOutput: CaptureOutputKind) => {
    setOutput(nextOutput);
    setStatusMessage(
      nextOutput === 'recording'
        ? 'Output mode set to Record Video'
        : 'Output mode set to Screenshot'
    );
  }, []);

  const handleDelayChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (controlsDisabled) return;
      const nextDelay = parseDelayOption(event.target.value);
      setDelaySeconds(nextDelay);
      setStatusMessage(`Capture timer set to ${DELAY_LABELS[nextDelay]}`);
    },
    [controlsDisabled]
  );

  const handleSaveLocationChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (controlsDisabled) return;
      const nextLocation = parseSaveLocationOption(event.target.value);
      setSaveLocation(nextLocation);
      setStatusMessage(`Save destination set to ${SAVE_LOCATION_LABELS[nextLocation]}`);
    },
    [controlsDisabled]
  );

  const handleToggleMic = useCallback(() => {
    setIncludeMic((prev) => {
      const next = !prev;
      setStatusMessage(next ? 'Microphone audio enabled' : 'Microphone audio muted');
      return next;
    });
  }, []);

  const handlePrimaryAction = useCallback(() => {
    if (delaySeconds > 0) {
      countdownRef.current = delaySeconds;
      setCountdownRemaining(delaySeconds);
      setPhase('countdown');
      setStatusMessage(`Capturing in ${delaySeconds}s…`);
      return;
    }

    if (output === 'recording') {
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setPhase('recording');
      setStatusMessage(
        `Recording started (${TARGET_LABELS[target]} · ${SAVE_LOCATION_LABELS[saveLocation]})`
      );
      return;
    }

    const result: ScreenCaptureResult = {
      target,
      output: 'screenshot',
      delaySeconds: 0,
      saveLocation,
      includeMic: false,
      durationSeconds: 0,
    };
    setStatusMessage(
      `Screenshot captured (${TARGET_LABELS[target]}) and saved to ${SAVE_LOCATION_LABELS[saveLocation]}`
    );
    onCaptureComplete?.(result);
  }, [delaySeconds, onCaptureComplete, output, saveLocation, target]);

  const handleCancelCountdown = useCallback(() => {
    countdownRef.current = 0;
    setCountdownRemaining(0);
    setPhase('idle');
    setStatusMessage('Capture countdown cancelled');
  }, []);

  const handleStopRecording = useCallback(() => {
    const elapsed = recordingSecondsRef.current;
    recordingSecondsRef.current = 0;
    setRecordingSeconds(0);
    setPhase('idle');

    const result: ScreenCaptureResult = {
      target,
      output: 'recording',
      delaySeconds,
      saveLocation,
      includeMic,
      durationSeconds: elapsed,
    };
    setStatusMessage(
      `Recording saved (${formatRecordingClock(elapsed)} · ${TARGET_LABELS[target]} · ${SAVE_LOCATION_LABELS[saveLocation]})`
    );
    onCaptureComplete?.(result);
  }, [delaySeconds, includeMic, onCaptureComplete, saveLocation, target]);

  const handleImeSafeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement | HTMLSelectElement>) => {
      if (event.nativeEvent.isComposing) {
        event.preventDefault();
      }
    },
    []
  );

  const defaultStatusText = `Ready · ${TARGET_LABELS[target]} · ${
    output === 'recording' ? 'Record Video' : 'Screenshot'
  } · ${SAVE_LOCATION_LABELS[saveLocation]}`;

  const resolvedStatusText = statusMessage || defaultStatusText;
  const formattedClock = formatRecordingClock(recordingSeconds);

  const telemetrySummary =
    phase === 'recording'
      ? `REC ${formattedClock} · ${micActive ? 'Mic On' : 'Mic Off'}`
      : `${TARGET_LABELS[target]} · ${DELAY_LABELS[delaySeconds]} · ${SAVE_LOCATION_LABELS[saveLocation]}`;

  const merged = mergeProps({
    themeTarget: themeProps('screen-capture-hud', {
      target,
      output,
      phase,
      includeMic: micActive,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full min-w-0 max-w-full p-3 sm:p-4 space-y-2.5 select-none',
      disabled ? 'opacity-65' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const toolbarClass = stableClassName('screen-capture-hud', 'toolbar');
  const targetsClass = stableClassName('screen-capture-hud', 'targets');
  const outputsClass = stableClassName('screen-capture-hud', 'outputs');
  const optionsClass = stableClassName('screen-capture-hud', 'options');
  const actionsClass = stableClassName('screen-capture-hud', 'actions');
  const statusClass = stableClassName('screen-capture-hud', 'status');

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Screen capture HUD"
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Floating Optical HUD Toolbar */}
      <div
        role="toolbar"
        aria-label="Screen capture controls"
        className={cx(toolbarClass, 'flex flex-wrap items-center gap-2 min-w-0 max-w-full')}
      >
        {/* Target Region Mode Radio Group */}
        <div
          role="radiogroup"
          aria-label="Capture target"
          className={cx(
            targetsClass,
            'prism-well rounded-2xl p-1 inline-flex flex-wrap items-center gap-1 min-w-0 max-w-full'
          )}
        >
          {TARGET_OPTIONS.map((option) => {
            const isSelected = target === option.mode;
            return (
              <button
                key={option.mode}
                ref={(el) => {
                  if (el) {
                    radioRefs.current.set(option.mode, el);
                  } else {
                    radioRefs.current.delete(option.mode);
                  }
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={controlsDisabled}
                tabIndex={controlsDisabled ? -1 : isSelected ? 0 : -1}
                data-testid={`screen-capture-target-${option.mode}`}
                data-selected={isSelected ? 'true' : undefined}
                onClick={() => handleSelectTarget(option.mode)}
                onKeyDown={(event) => handleTargetKeyDown(event, option.mode)}
                className={cx(
                  'prism-focus-ring rounded-xl px-2.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
                  isSelected ? 'prism-crystal' : ''
                )}
                style={
                  isSelected
                    ? {
                        color: 'var(--prism-primary-main)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor:
                          'color-mix(in srgb, var(--prism-primary-main) 50%, transparent)',
                        boxShadow:
                          '0 0 12px -4px color-mix(in srgb, var(--prism-primary-main) 45%, transparent)',
                      }
                    : { color: 'var(--prism-text-secondary)' }
                }
              >
                {option.icon}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Output Mode Switcher */}
        <div
          role="group"
          aria-label="Capture output mode"
          className={cx(
            outputsClass,
            'prism-well rounded-2xl p-1 inline-flex flex-wrap items-center gap-1 min-w-0 max-w-full'
          )}
        >
          <button
            type="button"
            disabled={controlsDisabled}
            aria-pressed={output === 'screenshot'}
            data-testid="screen-capture-output-screenshot"
            data-active={output === 'screenshot' ? 'true' : undefined}
            onClick={() => handleSelectOutput('screenshot')}
            onKeyDown={handleImeSafeKeyDown}
            className={cx(
              'prism-focus-ring rounded-xl px-2.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
              output === 'screenshot' ? 'prism-crystal' : ''
            )}
            style={
              output === 'screenshot'
                ? {
                    color: 'var(--prism-info-main)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'color-mix(in srgb, var(--prism-info-main) 48%, transparent)',
                  }
                : { color: 'var(--prism-text-secondary)' }
            }
          >
            <Camera aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Screenshot</span>
          </button>

          <button
            type="button"
            disabled={controlsDisabled}
            aria-pressed={output === 'recording'}
            data-testid="screen-capture-output-recording"
            data-active={output === 'recording' ? 'true' : undefined}
            onClick={() => handleSelectOutput('recording')}
            onKeyDown={handleImeSafeKeyDown}
            className={cx(
              'prism-focus-ring rounded-xl px-2.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
              output === 'recording' ? 'prism-crystal' : ''
            )}
            style={
              output === 'recording'
                ? {
                    color: 'var(--prism-error-main)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'color-mix(in srgb, var(--prism-error-main) 48%, transparent)',
                  }
                : { color: 'var(--prism-text-secondary)' }
            }
          >
            <Video aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Record Video</span>
          </button>
        </div>

        {/* Options Cluster (Timer, Save Location, Microphone) */}
        <div
          role="group"
          aria-label="Capture options"
          className={cx(optionsClass, 'flex flex-wrap items-center gap-2 min-w-0 max-w-full')}
        >
          {/* Countdown Timer Select */}
          <div className="prism-well rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 min-w-0">
            <Timer
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <label
              htmlFor={timerSelectId}
              className="text-[11px] font-semibold whitespace-nowrap"
              style={STYLE_TEXT_SECONDARY}
            >
              Timer
            </label>
            <select
              id={timerSelectId}
              aria-label="Capture countdown timer"
              data-testid="screen-capture-timer-select"
              value={String(delaySeconds)}
              disabled={controlsDisabled}
              onChange={handleDelayChange}
              onKeyDown={handleImeSafeKeyDown}
              className="prism-focus-ring bg-transparent text-xs font-mono font-semibold tabular-nums rounded-md py-0.5 pr-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              style={STYLE_TEXT_PRIMARY}
            >
              <option value="0" style={SELECT_OPTION_STYLE}>
                No Delay
              </option>
              <option value="3" style={SELECT_OPTION_STYLE}>
                3s
              </option>
              <option value="5" style={SELECT_OPTION_STYLE}>
                5s
              </option>
              <option value="10" style={SELECT_OPTION_STYLE}>
                10s
              </option>
            </select>
          </div>

          {/* Save Destination Select */}
          <div className="prism-well rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 min-w-0">
            <Folder
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <label
              htmlFor={saveSelectId}
              className="text-[11px] font-semibold whitespace-nowrap"
              style={STYLE_TEXT_SECONDARY}
            >
              Save to
            </label>
            <select
              id={saveSelectId}
              aria-label="Capture save location"
              data-testid="screen-capture-save-select"
              value={saveLocation}
              disabled={controlsDisabled}
              onChange={handleSaveLocationChange}
              onKeyDown={handleImeSafeKeyDown}
              className="prism-focus-ring bg-transparent text-xs font-semibold rounded-md py-0.5 pr-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              style={STYLE_TEXT_PRIMARY}
            >
              <option value="desktop" style={SELECT_OPTION_STYLE}>
                Desktop
              </option>
              <option value="clipboard" style={SELECT_OPTION_STYLE}>
                Clipboard
              </option>
              <option value="documents" style={SELECT_OPTION_STYLE}>
                Documents/Captures
              </option>
            </select>
          </div>

          {/* Microphone Toggle (enabled for recording mode) */}
          <button
            type="button"
            disabled={controlsDisabled || output !== 'recording'}
            aria-pressed={micActive}
            data-testid="screen-capture-mic-toggle"
            data-active={micActive ? 'true' : undefined}
            onClick={handleToggleMic}
            onKeyDown={handleImeSafeKeyDown}
            className="prism-crystal prism-focus-ring rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-opacity cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              color: micActive ? 'var(--prism-success-main)' : 'var(--prism-text-primary)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: micActive
                ? 'color-mix(in srgb, var(--prism-success-main) 52%, transparent)'
                : 'var(--prism-divider)',
            }}
          >
            {micActive ? (
              <Mic aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <MicOff aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>Microphone</span>
          </button>
        </div>

        {/* Primary Action & Active Phase Cluster */}
        <div
          className={cx(
            actionsClass,
            'flex flex-wrap items-center gap-2 min-w-0 ml-auto max-w-full'
          )}
        >
          {phase === 'idle' && (
            <button
              type="button"
              disabled={disabled}
              data-testid="screen-capture-action"
              onClick={handlePrimaryAction}
              onKeyDown={handleImeSafeKeyDown}
              className="prism-btn-primary prism-focus-ring px-4 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="relative z-10 inline-flex items-center gap-1.5">
                {output === 'recording' ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: 'var(--prism-error-main)',
                        boxShadow: '0 0 0 1.5px var(--prism-primary-contrast)',
                      }}
                    />
                    <span>Record</span>
                  </>
                ) : (
                  <>
                    <Camera aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    <span>Capture</span>
                  </>
                )}
              </span>
            </button>
          )}

          {phase === 'countdown' && (
            <>
              <span
                data-testid="screen-capture-countdown"
                className="prism-well rounded-full px-3 py-1.5 inline-flex items-center gap-2 font-mono text-xs font-semibold tabular-nums whitespace-nowrap"
                style={STYLE_WARNING_MAIN}
              >
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full animate-pulse motion-reduce:animate-none shrink-0"
                  style={STYLE_BG_WARNING}
                />
                <span>Capturing in {countdownRemaining}s…</span>
              </span>

              <button
                type="button"
                disabled={disabled}
                data-testid="screen-capture-cancel"
                onClick={handleCancelCountdown}
                onKeyDown={handleImeSafeKeyDown}
                className="prism-crystal prism-focus-ring rounded-full px-3 py-1.5 inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={STYLE_TEXT_PRIMARY}
              >
                Cancel
              </button>
            </>
          )}

          {phase === 'recording' && (
            <>
              <span
                data-testid="screen-capture-recording-indicator"
                className="prism-well rounded-full px-3 py-1.5 inline-flex items-center gap-2 font-mono text-xs font-bold tabular-nums whitespace-nowrap"
                style={{
                  color: 'var(--prism-error-main)',
                  boxShadow:
                    'inset 0 0 0 1px color-mix(in srgb, var(--prism-error-main) 50%, transparent)',
                }}
              >
                <span
                  aria-hidden="true"
                  data-testid="screen-capture-rec-dot"
                  className="w-2.5 h-2.5 rounded-full animate-pulse motion-reduce:animate-none shrink-0"
                  style={{
                    backgroundColor: 'var(--prism-error-main)',
                    boxShadow: '0 0 8px var(--prism-error-main)',
                  }}
                />
                <span>REC {formattedClock}</span>
              </span>

              <button
                type="button"
                disabled={disabled}
                data-testid="screen-capture-stop"
                onClick={handleStopRecording}
                onKeyDown={handleImeSafeKeyDown}
                className="prism-btn-primary prism-focus-ring px-3.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <Square aria-hidden="true" className="w-3 h-3 shrink-0 fill-current" />
                  <span>Stop Recording</span>
                </span>
              </button>
            </>
          )}

          {onDismiss && (
            <button
              type="button"
              disabled={disabled}
              aria-label="Close HUD"
              data-testid="screen-capture-dismiss"
              onClick={() => {
                countdownRef.current = 0;
                recordingSecondsRef.current = 0;
                setCountdownRemaining(0);
                setRecordingSeconds(0);
                setPhase('idle');
                onDismiss();
              }}
              onKeyDown={handleImeSafeKeyDown}
              className="prism-crystal prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              style={STYLE_TEXT_SECONDARY}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Polite Live Status Strip */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="screen-capture-status-strip"
        className={cx(
          statusClass,
          'flex flex-wrap items-center justify-between gap-2 min-w-0 pt-2 text-xs'
        )}
        style={{
          borderTop: '1px solid var(--prism-divider)',
          color:
            phase === 'recording'
              ? 'var(--prism-error-main)'
              : 'var(--prism-text-secondary)',
        }}
      >
        <span data-testid="screen-capture-status" className="truncate min-w-0">
          {resolvedStatusText}
        </span>
        <span
          data-testid="screen-capture-telemetry"
          className="font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
          style={STYLE_TEXT_SECONDARY}
        >
          {telemetrySummary}
        </span>
      </div>
    </div>
  );
}

export const ScreenCaptureHud = memo(ScreenCaptureHudInner);
ScreenCaptureHud.displayName = 'ScreenCaptureHud';
