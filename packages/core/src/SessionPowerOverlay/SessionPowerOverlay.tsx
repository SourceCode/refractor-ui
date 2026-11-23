'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  Check,
  LogOut,
  Moon,
  Play,
  Power,
  RotateCw,
  Square,
  Timer,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type SessionPowerActionId = 'sleep' | 'restart' | 'shutdown' | 'logout';

export type SessionPowerDisplayMode = 'inline' | 'modal';

type SessionPowerOverlayBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface SessionPowerOverlayProps extends SessionPowerOverlayBaseProps {
  /** Primary heading displayed at the top of the power overlay (defaults to `'Power & Session'`). */
  title?: string;
  /** Presentation mode: `'inline'` renders an embedded `prism-slab`; `'modal'` renders a dimmed full-viewport dialog. */
  mode?: SessionPowerDisplayMode;
  /** Controls visibility when `mode="modal"`; returns `null` when `false` (defaults to `true`). */
  open?: boolean;
  /** Initially selected power action card (defaults to `'shutdown'`). */
  defaultSelectedAction?: SessionPowerActionId;
  /** Initial state of the "Reopen windows when logging back in" checkbox (defaults to `true`). */
  defaultReopenWindows?: boolean;
  /** Optional countdown duration in seconds; `0`, negative, or non-finite values disable countdown controls (defaults to `60`). */
  countdownSeconds?: number;
  /** Automatically starts the 1-second countdown timer on mount/open when `countdownSeconds > 0` (defaults to `false`). */
  autoStartCountdown?: boolean;
  /** Callback fired when the user confirms the selected action or when an active countdown reaches `0`. */
  onConfirmAction?: (action: SessionPowerActionId, reopenWindows: boolean) => void;
  /** Callback fired when the overlay is canceled via Cancel button, modal close button, dimmed backdrop click, or Escape. */
  onCancel?: () => void;
  /** Disables all power action cards, checkbox, countdown timer controls, confirmation, and dismissal actions (defaults to `false`). */
  disabled?: boolean;
}

interface PowerActionSpec {
  id: SessionPowerActionId;
  label: string;
  shortHint: string;
  summary: string;
  accentVar: string;
  contrastVar: string;
  supportsReopenWindows: boolean;
}

const DEFAULT_TITLE = 'Power & Session';
const DEFAULT_COUNTDOWN_SECONDS = 60;
const MAX_COUNTDOWN_SECONDS = 3600;

const POWER_ACTION_ORDER: ReadonlyArray<SessionPowerActionId> = [
  'sleep',
  'restart',
  'shutdown',
  'logout',
];

function getPowerActionSpec(action: SessionPowerActionId): PowerActionSpec {
  switch (action) {
    case 'sleep':
      return {
        id: 'sleep',
        label: 'Sleep',
        shortHint: 'Standby',
        summary: 'Suspend the workstation to low-power memory while keeping open windows intact.',
        accentVar: 'var(--prism-info-main)',
        contrastVar: 'var(--prism-info-contrast)',
        supportsReopenWindows: false,
      };
    case 'restart':
      return {
        id: 'restart',
        label: 'Restart',
        shortHint: 'Reboot',
        summary: 'Close running apps cleanly and reboot the operating system.',
        accentVar: 'var(--prism-warning-main)',
        contrastVar: 'var(--prism-warning-contrast)',
        supportsReopenWindows: true,
      };
    case 'shutdown':
      return {
        id: 'shutdown',
        label: 'Shut Down',
        shortHint: 'Power Off',
        summary: 'Save active session state and power off the workstation safely.',
        accentVar: 'var(--prism-error-main)',
        contrastVar: 'var(--prism-error-contrast)',
        supportsReopenWindows: true,
      };
    case 'logout':
      return {
        id: 'logout',
        label: 'Log Out',
        shortHint: 'End Session',
        summary: 'End the current desktop user session and return to the sign-in screen.',
        accentVar: 'var(--prism-secondary-main)',
        contrastVar: 'var(--prism-secondary-contrast)',
        supportsReopenWindows: true,
      };
  }
}

function renderPowerActionIcon(
  action: SessionPowerActionId,
  className: string
): ReactNode {
  switch (action) {
    case 'sleep':
      return <Moon aria-hidden="true" className={className} />;
    case 'restart':
      return <RotateCw aria-hidden="true" className={className} />;
    case 'shutdown':
      return <Power aria-hidden="true" className={className} />;
    case 'logout':
      return <LogOut aria-hidden="true" className={className} />;
  }
}

function sanitizeCountdownSeconds(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(Math.floor(value), MAX_COUNTDOWN_SECONDS);
}

function formatActionReopenSuffix(
  spec: PowerActionSpec,
  reopenWindows: boolean
): string {
  if (!spec.supportsReopenWindows) {
    return '.';
  }
  return reopenWindows
    ? ' (reopen windows enabled).'
    : ' (reopen windows disabled).';
}

const panelClass = /*#__PURE__*/ stableClassName('session-power-overlay', 'panel');
const headerClass = /*#__PURE__*/ stableClassName('session-power-overlay', 'header');
const actionsClass = /*#__PURE__*/ stableClassName('session-power-overlay', 'actions');
const actionCardClass = /*#__PURE__*/ stableClassName('session-power-overlay', 'action-card');
const reopenClass = /*#__PURE__*/ stableClassName('session-power-overlay', 'reopen');
const countdownClass = /*#__PURE__*/ stableClassName('session-power-overlay', 'countdown');
const footerClass = /*#__PURE__*/ stableClassName('session-power-overlay', 'footer');
const statusClass = /*#__PURE__*/ stableClassName('session-power-overlay', 'status');

function SessionPowerOverlayInner({
  title = DEFAULT_TITLE,
  mode = 'inline',
  open = true,
  defaultSelectedAction = 'shutdown',
  defaultReopenWindows = true,
  countdownSeconds = DEFAULT_COUNTDOWN_SECONDS,
  autoStartCountdown = false,
  onConfirmAction,
  onCancel,
  disabled = false,
  'aria-label': ariaLabelProp,
  onClick,
  onKeyDown,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SessionPowerOverlayProps) {
  const instanceId = useId();
  const titleId = `${instanceId}-title`;
  const subtitleId = `${instanceId}-subtitle`;
  const checkboxId = `${instanceId}-reopen-windows`;
  const reopenNoteId = `${instanceId}-reopen-note`;

  const override = useComponentOverride('SessionPowerOverlay');

  const resolvedTitle = title.trim() || DEFAULT_TITLE;
  const trimmedAriaLabel = ariaLabelProp?.trim() || undefined;
  const sanitizedDuration = sanitizeCountdownSeconds(countdownSeconds);
  const countdownEnabled = sanitizedDuration > 0;
  const isVisible = mode !== 'modal' || open;

  const [selectedAction, setSelectedAction] = useState<SessionPowerActionId>(
    defaultSelectedAction
  );
  const [reopenWindows, setReopenWindows] = useState<boolean>(
    defaultReopenWindows
  );
  const [remainingSeconds, setRemainingSeconds] =
    useState<number>(sanitizedDuration);
  const [countdownActive, setCountdownActive] = useState<boolean>(() =>
    Boolean(autoStartCountdown && countdownEnabled && !disabled && isVisible)
  );
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const selectedSpec = getPowerActionSpec(selectedAction);
  const isReopenApplicable = selectedSpec.supportsReopenWindows;
  const effectiveReopenWindows = isReopenApplicable ? reopenWindows : false;
  const checkboxDisabled = disabled || !isReopenApplicable;
  const isTimerRunning =
    countdownActive && countdownEnabled && !disabled && isVisible;

  const radioRefs = useRef<Map<SessionPowerActionId, HTMLButtonElement | null>>(
    new Map()
  );
  const remainingSecondsRef = useRef<number>(remainingSeconds);
  remainingSecondsRef.current = remainingSeconds;

  const selectedActionRef = useRef<SessionPowerActionId>(selectedAction);
  selectedActionRef.current = selectedAction;

  const effectiveReopenWindowsRef = useRef<boolean>(effectiveReopenWindows);
  effectiveReopenWindowsRef.current = effectiveReopenWindows;

  const onConfirmActionRef = useRef<
    ((action: SessionPowerActionId, reopen: boolean) => void) | undefined
  >(onConfirmAction);
  onConfirmActionRef.current = onConfirmAction;

  const prevSanitizedDurationRef = useRef<number>(sanitizedDuration);
  const prevVisibleRef = useRef<boolean>(isVisible);

  // Sync timer duration when countdownSeconds prop changes
  useEffect(() => {
    if (prevSanitizedDurationRef.current !== sanitizedDuration) {
      prevSanitizedDurationRef.current = sanitizedDuration;
      remainingSecondsRef.current = sanitizedDuration;
      setRemainingSeconds(sanitizedDuration);
      setCountdownActive(
        Boolean(autoStartCountdown && sanitizedDuration > 0 && !disabled && isVisible)
      );
    }
  }, [autoStartCountdown, disabled, isVisible, sanitizedDuration]);

  // Reset / auto-start timer cleanly when modal visibility toggles
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = isVisible;

    if (!isVisible) {
      setCountdownActive(false);
      return;
    }

    if (!wasVisible) {
      remainingSecondsRef.current = sanitizedDuration;
      setRemainingSeconds(sanitizedDuration);
      if (autoStartCountdown && sanitizedDuration > 0 && !disabled) {
        setCountdownActive(true);
      }
    }
  }, [autoStartCountdown, disabled, isVisible, sanitizedDuration]);

  // Stop countdown immediately if component becomes disabled
  useEffect(() => {
    if (disabled) {
      setCountdownActive(false);
    }
  }, [disabled]);

  // Live 1-second window.setInterval countdown with strict cleanup
  useEffect(() => {
    if (!isTimerRunning) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const nextSeconds = remainingSecondsRef.current - 1;
      if (nextSeconds <= 0) {
        window.clearInterval(intervalId);
        remainingSecondsRef.current = 0;
        setRemainingSeconds(0);
        setCountdownActive(false);

        const action = selectedActionRef.current;
        const reopen = effectiveReopenWindowsRef.current;
        const spec = getPowerActionSpec(action);
        setAnnouncement(
          `Countdown complete. Executing ${spec.label}${formatActionReopenSuffix(spec, reopen)}`
        );
        onConfirmActionRef.current?.(action, reopen);
        return;
      }

      remainingSecondsRef.current = nextSeconds;
      setRemainingSeconds(nextSeconds);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isTimerRunning]);

  const handleCancel = useCallback(
    (reason: 'escape' | 'backdrop' | 'button') => {
      if (disabled) {
        return;
      }
      setCountdownActive(false);
      remainingSecondsRef.current = sanitizedDuration;
      setRemainingSeconds(sanitizedDuration);
      setAnnouncement(
        reason === 'escape'
          ? 'Canceled power overlay via Escape.'
          : reason === 'backdrop'
            ? 'Canceled power overlay via backdrop.'
            : 'Canceled power overlay.'
      );
      onCancel?.();
    },
    [disabled, onCancel, sanitizedDuration]
  );

  // Window Escape listener in modal mode with guaranteed cleanup on close/disable/unmount
  useEffect(() => {
    if (mode !== 'modal' || !open || disabled) {
      return undefined;
    }

    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel('escape');
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [disabled, handleCancel, mode, open]);

  const handleSelectAction = useCallback((action: SessionPowerActionId) => {
    const spec = getPowerActionSpec(action);
    setSelectedAction(action);
    setAnnouncement(`Selected ${spec.label}.`);
  }, []);

  const handleRadioKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }

      let nextIndex: number | null = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (index + 1) % POWER_ACTION_ORDER.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex =
          (index - 1 + POWER_ACTION_ORDER.length) % POWER_ACTION_ORDER.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = POWER_ACTION_ORDER.length - 1;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        const nextAction = POWER_ACTION_ORDER[nextIndex] as SessionPowerActionId;
        handleSelectAction(nextAction);
        radioRefs.current.get(nextAction)?.focus();
      }
    },
    [disabled, handleSelectAction]
  );

  const handleToggleReopenWindows = useCallback(() => {
    const nextChecked = !reopenWindows;
    setReopenWindows(nextChecked);
    setAnnouncement(
      nextChecked
        ? 'Reopen windows when logging back in enabled.'
        : 'Reopen windows when logging back in disabled.'
    );
  }, [reopenWindows]);

  const handleCheckboxKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) {
        event.preventDefault();
      }
    },
    []
  );

  const handleStartCountdown = useCallback(() => {
    remainingSecondsRef.current = sanitizedDuration;
    setRemainingSeconds(sanitizedDuration);
    setCountdownActive(true);
    setAnnouncement(
      `Started ${sanitizedDuration}s auto-action countdown for ${selectedSpec.label}.`
    );
  }, [sanitizedDuration, selectedSpec.label]);

  const handleStopCountdown = useCallback(() => {
    setCountdownActive(false);
    remainingSecondsRef.current = sanitizedDuration;
    setRemainingSeconds(sanitizedDuration);
    setAnnouncement('Stopped auto-action countdown.');
  }, [sanitizedDuration]);

  const handleConfirm = useCallback(() => {
    setCountdownActive(false);
    setAnnouncement(
      `Confirmed ${selectedSpec.label}${formatActionReopenSuffix(selectedSpec, effectiveReopenWindows)}`
    );
    onConfirmAction?.(selectedAction, effectiveReopenWindows);
  }, [effectiveReopenWindows, onConfirmAction, selectedAction, selectedSpec]);

  const handleModalRootKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleCancel('escape');
      }
    },
    [disabled, handleCancel]
  );

  const composedModalKeyDown = composeEventHandlers<
    ReactKeyboardEvent<HTMLDivElement>
  >(onKeyDown, handleModalRootKeyDown);

  const composedBackdropClick = composeEventHandlers<
    ReactMouseEvent<HTMLDivElement>
  >(onClick, () => {
    handleCancel('backdrop');
  });

  if (mode === 'modal' && !open) {
    return null;
  }

  const merged = mergeProps({
    themeTarget: themeProps('session-power-overlay', {
      mode,
      open,
      action: selectedAction,
      reopenWindows: effectiveReopenWindows,
      countdownActive: isTimerRunning,
      disabled,
    }),
    baseClassName:
      mode === 'modal'
        ? 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 min-w-0'
        : 'prism-slab relative w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-4 overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle:
      mode === 'modal'
        ? {
            backgroundColor:
              'color-mix(in srgb, var(--prism-bg-end) 68%, transparent)',
            backdropFilter: 'blur(var(--prism-blur-px))',
          }
        : {
            color: 'var(--prism-text-primary)',
          },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const progressPct = countdownEnabled
    ? Math.max(0, Math.min(100, Math.round((remainingSeconds / sanitizedDuration) * 100)))
    : 0;

  const defaultStatusText = isTimerRunning
    ? `${selectedSpec.label} scheduled in ${remainingSeconds}s.`
    : `Ready to ${selectedSpec.label.toLowerCase()}${
        isReopenApplicable
          ? effectiveReopenWindows
            ? ' · reopen windows on.'
            : ' · reopen windows off.'
          : ' · preserves open windows in memory.'
      }`;
  const liveStatusText = announcement ?? defaultStatusText;

  const overlayContent = (
    <>
      {/* Optical Header */}
      <header
        data-part="header"
        className={cx(
          headerClass,
          'flex flex-wrap items-start justify-between gap-3 min-w-0 max-w-full'
        )}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-crystal w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{
              color: selectedSpec.accentVar,
              boxShadow: `0 0 16px -4px color-mix(in srgb, ${selectedSpec.accentVar} 45%, transparent)`,
            }}
          >
            {renderPowerActionIcon(selectedAction, 'w-4 h-4')}
          </span>

          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-sm sm:text-base font-semibold tracking-[-0.01em] truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {resolvedTitle}
            </h2>
            <p
              id={subtitleId}
              className="text-xs mt-0.5 break-words"
              style={STYLE_TEXT_SECONDARY}
            >
              {selectedSpec.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            data-testid="session-power-active-pill"
            className="prism-well inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={{ color: selectedSpec.accentVar }}
          >
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: selectedSpec.accentVar }}
            />
            {isTimerRunning
              ? `${selectedSpec.label} · ${remainingSeconds}s`
              : selectedSpec.label}
          </span>

          {mode === 'modal' ? (
            <button
              type="button"
              disabled={disabled}
              aria-label="Close power overlay"
              data-testid="session-power-close"
              onClick={() => handleCancel('button')}
              className="prism-crystal prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-opacity"
              style={STYLE_TEXT_SECONDARY}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </header>

      {/* 4 Tactile Power Action Radio Cards */}
      <div
        role="radiogroup"
        aria-label="Power and session actions"
        aria-disabled={disabled ? 'true' : undefined}
        data-part="actions"
        className={cx(
          actionsClass,
          'grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-w-0 max-w-full'
        )}
      >
        {POWER_ACTION_ORDER.map((actionId, index) => {
          const spec = getPowerActionSpec(actionId);
          const isSelected = selectedAction === actionId;

          return (
            <button
              key={actionId}
              ref={(node) => {
                radioRefs.current.set(actionId, node);
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              tabIndex={disabled ? -1 : isSelected ? 0 : -1}
              data-part="action-card"
              data-action={actionId}
              data-selected={isSelected ? 'true' : undefined}
              data-testid={`session-power-action-${actionId}`}
              onClick={() => handleSelectAction(actionId)}
              onKeyDown={(event) => handleRadioKeyDown(event, index)}
              className={cx(
                actionCardClass,
                'prism-focus-ring rounded-2xl p-3 flex flex-col items-center justify-center gap-2 text-center min-w-0 transition-[color,background-color,border-color,opacity,transform] duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105',
                isSelected ? 'prism-crystal' : 'prism-well'
              )}
              style={{
                borderWidth: isSelected ? '1.5px' : '1px',
                borderStyle: 'solid',
                borderColor: isSelected
                  ? spec.accentVar
                  : 'var(--prism-divider)',
                boxShadow: isSelected
                  ? `0 0 0 2px color-mix(in srgb, ${spec.accentVar} 26%, transparent), 0 12px 24px -12px color-mix(in srgb, ${spec.accentVar} 48%, transparent)`
                  : undefined,
              }}
            >
              <span
                aria-hidden="true"
                className="w-10 h-10 rounded-full inline-flex items-center justify-center shrink-0 transition-colors duration-150"
                style={{
                  backgroundColor: isSelected
                    ? spec.accentVar
                    : `color-mix(in srgb, ${spec.accentVar} 14%, transparent)`,
                  color: isSelected ? spec.contrastVar : spec.accentVar,
                  boxShadow: isSelected
                    ? `0 0 14px -2px color-mix(in srgb, ${spec.accentVar} 55%, transparent)`
                    : undefined,
                }}
              >
                {renderPowerActionIcon(actionId, 'w-5 h-5')}
              </span>

              <span className="flex flex-col items-center gap-0.5 min-w-0 max-w-full">
                <span
                  className="text-xs sm:text-sm font-semibold tracking-[-0.01em] truncate max-w-full"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {spec.label}
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-wider truncate max-w-full"
                  style={{
                    color: isSelected
                      ? spec.accentVar
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {spec.shortHint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Reopen Windows Preference */}
      <div
        data-part="reopen"
        data-applicable={isReopenApplicable ? 'true' : 'false'}
        className={cx(
          reopenClass,
          'prism-well rounded-2xl px-3.5 py-2.5 flex items-start gap-3 min-w-0 max-w-full',
          checkboxDisabled ? 'opacity-65' : ''
        )}
        style={{
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--prism-well-border)',
        }}
      >
        <button
          id={checkboxId}
          type="button"
          role="checkbox"
          aria-checked={effectiveReopenWindows}
          disabled={checkboxDisabled}
          aria-label="Reopen windows when logging back in"
          aria-describedby={reopenNoteId}
          onClick={handleToggleReopenWindows}
          onKeyDown={handleCheckboxKeyDown}
          className={cx(
            'prism-focus-ring w-5 h-5 mt-0.5 rounded-md inline-flex items-center justify-center shrink-0 transition-[color,background-color,border-color,opacity,transform] duration-150 cursor-pointer disabled:cursor-not-allowed',
            effectiveReopenWindows ? '' : 'prism-crystal'
          )}
          style={{
            backgroundColor: effectiveReopenWindows
              ? selectedSpec.accentVar
              : undefined,
            color: effectiveReopenWindows
              ? selectedSpec.contrastVar
              : 'transparent',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: effectiveReopenWindows
              ? selectedSpec.accentVar
              : 'var(--prism-well-border)',
            boxShadow: effectiveReopenWindows
              ? `0 0 10px -2px color-mix(in srgb, ${selectedSpec.accentVar} 55%, transparent)`
              : undefined,
          }}
        >
          <Check aria-hidden="true" className="w-3.5 h-3.5 stroke-[2.75]" />
        </button>

        <div className="min-w-0 flex-1">
          <label
            htmlFor={checkboxId}
            className={cx(
              'block text-xs sm:text-sm font-medium leading-snug select-none',
              checkboxDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            Reopen windows when logging back in
          </label>
          <p
            id={reopenNoteId}
            data-testid="session-power-reopen-note"
            className="text-[11px] mt-0.5 break-words"
            style={STYLE_TEXT_SECONDARY}
          >
            {isReopenApplicable
              ? 'Restore open apps and workspace layout on your next sign-in.'
              : 'Not applicable to Sleep — open windows remain preserved in memory.'}
          </p>
        </div>
      </div>

      {/* Countdown & Confirmation Bar */}
      <footer
        data-part="footer"
        className={cx(
          footerClass,
          'pt-3 border-t flex flex-col gap-3 min-w-0 max-w-full'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        {countdownEnabled ? (
          <div
            data-part="countdown"
            data-running={isTimerRunning ? 'true' : undefined}
            data-testid="session-power-countdown"
            className={cx(
              countdownClass,
              'prism-well rounded-2xl px-3.5 py-2.5 flex flex-col gap-2 min-w-0 max-w-full'
            )}
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: isTimerRunning
                ? `color-mix(in srgb, ${selectedSpec.accentVar} 45%, var(--prism-well-border))`
                : 'var(--prism-well-border)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Timer
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0"
                  style={{
                    color: isTimerRunning
                      ? selectedSpec.accentVar
                      : 'var(--prism-text-secondary)',
                  }}
                />
                <span
                  className="text-xs font-medium truncate"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {isTimerRunning
                    ? `Auto-${selectedSpec.label} in`
                    : `Auto-action countdown (${sanitizedDuration}s)`}
                </span>
                <span
                  data-testid="session-power-countdown-value"
                  className="prism-crystal inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums shrink-0"
                  style={{
                    color: isTimerRunning
                      ? selectedSpec.accentVar
                      : 'var(--prism-text-primary)',
                  }}
                >
                  {remainingSeconds}s
                </span>
              </div>

              {isTimerRunning ? (
                <button
                  type="button"
                  disabled={disabled}
                  data-testid="session-power-timer-toggle"
                  onClick={handleStopCountdown}
                  className="prism-btn-secondary prism-focus-ring h-7 px-3 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <Square
                    aria-hidden="true"
                    className="w-3 h-3 shrink-0 relative z-10"
                  />
                  <span className="relative z-10">Stop Timer</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={disabled}
                  data-testid="session-power-timer-toggle"
                  onClick={handleStartCountdown}
                  className="prism-btn-secondary prism-focus-ring h-7 px-3 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <Play
                    aria-hidden="true"
                    className="w-3 h-3 shrink-0 relative z-10"
                  />
                  <span className="relative z-10">Start Timer</span>
                </button>
              )}
            </div>

            <div
              aria-hidden="true"
              className="h-1.5 w-full rounded-full overflow-hidden"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--prism-text-secondary) 16%, transparent)',
              }}
            >
              <div
                data-testid="session-power-countdown-bar"
                className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-300"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: selectedSpec.accentVar,
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Confirmation & Cancel Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 min-w-0">
          <button
            type="button"
            disabled={disabled}
            data-testid="session-power-cancel"
            onClick={() => handleCancel('button')}
            className="prism-btn-secondary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <span className="relative z-10">Cancel</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            data-testid="session-power-confirm"
            onClick={handleConfirm}
            className="prism-focus-ring h-9 px-4 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] duration-150"
            style={{
              color: selectedSpec.contrastVar,
              background: `linear-gradient(180deg, color-mix(in srgb, ${selectedSpec.accentVar} 84%, var(--prism-slab-top)) 0%, ${selectedSpec.accentVar} 100%)`,
              boxShadow: `0 0 0 1px color-mix(in srgb, ${selectedSpec.accentVar} 60%, transparent), 0 10px 20px -8px color-mix(in srgb, ${selectedSpec.accentVar} 60%, transparent)`,
            }}
          >
            {renderPowerActionIcon(selectedAction, 'w-3.5 h-3.5 shrink-0')}
            <span>Confirm {selectedSpec.label}</span>
          </button>
        </div>

        {/* Polite Live Status Banner */}
        <div
          className="prism-well rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] min-w-0 max-w-full"
          style={{
            color: 'var(--prism-text-secondary)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--prism-well-border)',
          }}
        >
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="session-power-status"
            className={cx(statusClass, 'truncate min-w-0 flex-1')}
          >
            {liveStatusText}
          </span>
          <span
            data-part="shortcut-hint"
            className="font-mono text-[10px] whitespace-nowrap shrink-0"
          >
            {mode === 'modal'
              ? '←/→ Switch Action · Esc Cancel'
              : '←/→ Switch Action'}
          </span>
        </div>
      </footer>
    </>
  );

  if (mode === 'modal') {
    return (
      <div
        ref={ref}
        data-part="backdrop"
        data-testid="session-power-backdrop"
        {...rest}
        {...merged}
        onClick={composedBackdropClick}
        onKeyDown={composedModalKeyDown}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={trimmedAriaLabel}
          aria-labelledby={trimmedAriaLabel ? undefined : titleId}
          aria-describedby={subtitleId}
          aria-disabled={disabled ? 'true' : undefined}
          data-part="panel"
          data-testid="session-power-panel"
          onClick={(event) => event.stopPropagation()}
          className={cx(
            panelClass,
            'prism-slab relative w-full max-w-2xl min-w-0 p-4 sm:p-5 flex flex-col gap-4 overflow-hidden'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          {overlayContent}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label={trimmedAriaLabel}
      aria-labelledby={trimmedAriaLabel ? undefined : titleId}
      aria-describedby={subtitleId}
      aria-disabled={disabled ? 'true' : undefined}
      {...rest}
      {...merged}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {overlayContent}
    </div>
  );
}

export const SessionPowerOverlay = /*#__PURE__*/ memoWithDisplayName(SessionPowerOverlayInner, 'SessionPowerOverlay');
