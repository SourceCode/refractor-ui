'use client';

import { memo, useId, useState } from 'react';
import { CornerDownRight, Pause, Play, Square } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_ERROR_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type AgentRunState = 'idle' | 'running' | 'paused' | 'stopped';

export interface AgentControlBarProps extends BaseProps<HTMLDivElement> {
  /** Controlled agent execution state ('idle' | 'running' | 'paused' | 'stopped'). */
  status?: AgentRunState;
  /** Initial execution state in uncontrolled mode (defaults to 'running'). */
  defaultStatus?: AgentRunState;
  /** Callback fired whenever the agent execution state changes. */
  onStatusChange?: (status: AgentRunState) => void;
  /** Optional concise description of the active execution step or tool call. */
  currentStepLabel?: string;
  /** Callback fired when Pause is clicked while running. */
  onPause?: () => void;
  /** Callback fired when Resume is clicked while paused. */
  onResume?: () => void;
  /** Callback fired when Stop is clicked while running or paused. */
  onStop?: () => void;
  /** Callback fired with the trimmed steering instruction on mid-flight redirect submission. */
  onRedirect?: (instruction: string) => void;
  /** Placeholder text inside the mid-flight redirect input (defaults to 'Steer agent mid-flight...'). */
  redirectPlaceholder?: string;
  /** Disables lifecycle action buttons and mid-flight redirect input/button. */
  disabled?: boolean;
}

interface RunStateVisualMeta {
  label: string;
  pillClass: string;
  dotClass: string;
  dotColorVar: string;
  textColorVar?: string;
  ringShadow?: string;
}

function getRunStateVisualMeta(state: AgentRunState): RunStateVisualMeta {
  switch (state) {
    case 'running':
      return {
        label: 'Running',
        pillClass: 'prism-emerald',
        dotClass: 'animate-pulse motion-reduce:animate-none',
        dotColorVar: 'var(--prism-success-contrast)',
      };
    case 'paused':
      return {
        label: 'Paused',
        pillClass: 'prism-well',
        dotClass: '',
        dotColorVar: 'var(--prism-warning-main)',
        textColorVar: 'var(--prism-warning-main)',
        ringShadow: 'inset 0 0 0 1px var(--prism-warning-main)',
      };
    case 'stopped':
      return {
        label: 'Stopped',
        pillClass: 'prism-well',
        dotClass: '',
        dotColorVar: 'var(--prism-error-main)',
        textColorVar: 'var(--prism-error-main)',
        ringShadow: 'inset 0 0 0 1px var(--prism-error-main)',
      };
    case 'idle':
      return {
        label: 'Idle',
        pillClass: 'prism-well',
        dotClass: '',
        dotColorVar: 'var(--prism-text-disabled)',
        textColorVar: 'var(--prism-text-secondary)',
        ringShadow: 'inset 0 0 0 1px var(--prism-divider)',
      };
  }
}

function AgentControlBarInner({
  status,
  defaultStatus = 'running',
  onStatusChange,
  currentStepLabel,
  onPause,
  onResume,
  onStop,
  onRedirect,
  redirectPlaceholder = 'Steer agent mid-flight...',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AgentControlBarProps) {
  const redirectInputId = useId();
  const override = useComponentOverride('AgentControlBar');

  const [currentStatus, setCurrentStatus] = useControllableState<AgentRunState>({
    value: status,
    defaultValue: defaultStatus,
    onChange: onStatusChange,
  });

  const [redirectDraft, setRedirectDraft] = useState<string>('');

  const isRedirectDisabled = disabled || currentStatus === 'stopped';
  const showPause = currentStatus === 'running';
  const showResume = currentStatus === 'paused';
  const showStop = currentStatus === 'running' || currentStatus === 'paused';
  const stateVisual = getRunStateVisualMeta(currentStatus);

  const handlePause = () => {
    setCurrentStatus('paused');
    onPause?.();
  };

  const handleResume = () => {
    setCurrentStatus('running');
    onResume?.();
  };

  const handleStop = () => {
    setCurrentStatus('stopped');
    onStop?.();
  };

  const handleRedirectSubmit = () => {
    const trimmed = redirectDraft.trim();
    if (!trimmed) return;
    onRedirect?.(trimmed);
    setRedirectDraft('');
  };

  const merged = mergeProps({
    themeTarget: themeProps('agent-control-bar', {
      status: currentStatus,
      disabled,
    }),
    baseClassName:
      'prism-slab p-3 w-full flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const statusGroupClass = stableClassName('agent-control-bar', 'status');
  const controlsGroupClass = stableClassName('agent-control-bar', 'controls');
  const redirectGroupClass = stableClassName('agent-control-bar', 'redirect');

  return (
    <div ref={ref} role="toolbar" aria-label="Agent control bar" {...rest} {...merged}>
      <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
        <div className={cx(statusGroupClass, 'flex items-center gap-2.5 min-w-0')}>
          <span
            role="status"
            aria-live="polite"
            data-testid="agent-status-badge"
            data-status={currentStatus}
            className={cx(
              stateVisual.pillClass,
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0'
            )}
            style={
              stateVisual.textColorVar
                ? {
                    color: stateVisual.textColorVar,
                    boxShadow: stateVisual.ringShadow,
                  }
                : undefined
            }
          >
            <span
              aria-hidden="true"
              data-testid="agent-status-dot"
              className={cx('w-2 h-2 rounded-full shrink-0', stateVisual.dotClass)}
              style={{ backgroundColor: stateVisual.dotColorVar }}
            />
            <span>{stateVisual.label}</span>
          </span>

          {currentStepLabel ? (
            <span
              data-testid="agent-current-step"
              className="text-xs font-medium truncate"
              style={STYLE_TEXT_SECONDARY}
            >
              {currentStepLabel}
            </span>
          ) : null}
        </div>

        {showStop ? (
          <div className={cx(controlsGroupClass, 'flex items-center gap-1.5 shrink-0')}>
            {showPause ? (
              <button
                type="button"
                disabled={disabled}
                onClick={handlePause}
                className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pause aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Pause</span>
              </button>
            ) : null}

            {showResume ? (
              <button
                type="button"
                disabled={disabled}
                onClick={handleResume}
                className="prism-btn-primary prism-focus-ring h-8 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
                <span className="relative z-10">Resume</span>
              </button>
            ) : null}

            <button
              type="button"
              disabled={disabled}
              onClick={handleStop}
              className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={STYLE_ERROR_MAIN}
            >
              <Square aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Stop</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className={cx(redirectGroupClass, 'flex items-center gap-2 flex-1 min-w-0 lg:max-w-md')}>
        <div className="prism-well flex-1 min-w-0 h-9 px-3 rounded-full flex items-center gap-2">
          <CornerDownRight
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0"
            style={STYLE_TEXT_SECONDARY}
          />
          <input
            id={redirectInputId}
            type="text"
            aria-label="Redirect agent instruction"
            value={redirectDraft}
            disabled={isRedirectDisabled}
            placeholder={redirectPlaceholder}
            onChange={(e) => setRedirectDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && !isRedirectDisabled) {
                e.preventDefault();
                handleRedirectSubmit();
              }
            }}
            className="w-full min-w-0 bg-transparent text-xs focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
            style={STYLE_TEXT_PRIMARY}
          />
        </div>

        <button
          type="button"
          disabled={isRedirectDisabled}
          onClick={handleRedirectSubmit}
          className="prism-btn-primary prism-focus-ring h-9 px-3.5 inline-flex items-center justify-center text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="relative z-10">Redirect</span>
        </button>
      </div>
    </div>
  );
}

export const AgentControlBar = memo(AgentControlBarInner);
AgentControlBar.displayName = 'AgentControlBar';
