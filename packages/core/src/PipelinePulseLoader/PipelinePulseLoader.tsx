'use client';

import type { CSSProperties } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import {
  STYLE_BADGE_ERROR,
  STYLE_BADGE_PRIMARY,
  STYLE_BADGE_SUCCESS,
  STYLE_BG_DIVIDER,
  STYLE_BG_PRIMARY,
  STYLE_BG_SUCCESS,
  STYLE_TEXT_PRIMARY,
  STYLE_TEXT_SECONDARY,
} from '../utils/styles';
import { themeProps } from '../utils/themeProps';
import { clampFinite } from '../utils/webglShader';

export type PipelineStageStatus = 'pending' | 'active' | 'completed' | 'error';

export interface PipelineStageItem {
  id: string;
  label: string;
  detail?: string;
  status: PipelineStageStatus;
}

export interface PipelinePulseLoaderProps extends BaseProps<HTMLDivElement> {
  /** Ordered pipeline stages connected by animated optical light-packet tracks. */
  stages?: ReadonlyArray<PipelineStageItem>;
  /** Light packet travel speed in seconds per active track (clamped 0.6–4). */
  pulseSpeedSeconds?: number;
  /** Accessible aria-label describing the multi-step pipeline operation. */
  label?: string;
  /** Optional click callback when a stage node is selected. */
  onStageSelect?: (stage: PipelineStageItem) => void;
}

const PIPE_LIST_CLASS = /*#__PURE__*/ stableClassName('pipeline-pulse-loader', 'list');
const PIPE_TRACK_CLASS = /*#__PURE__*/ stableClassName('pipeline-pulse-loader', 'track');
const PIPE_PACKET_CLASS = /*#__PURE__*/ stableClassName('pipeline-pulse-loader', 'packet');

export const DEFAULT_PIPELINE_STAGES: ReadonlyArray<PipelineStageItem> = /*#__PURE__*/ Object.freeze([
  { id: 'auth', label: 'Authenticate', detail: '18ms', status: 'completed' },
  { id: 'compile', label: 'Compile Shaders', detail: '42ms', status: 'completed' },
  { id: 'verify', label: 'Verify Tokens', detail: 'Running…', status: 'active' },
  { id: 'deploy', label: 'Publish Edge', detail: 'Queued', status: 'pending' },
]);

function PipelinePulseLoaderInner({
  stages = DEFAULT_PIPELINE_STAGES,
  pulseSpeedSeconds = 1.5,
  label = 'Pipeline execution status',
  onStageSelect,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PipelinePulseLoaderProps) {
  const override = useComponentOverride('PipelinePulseLoader');
  const resolvedStages = stages.length > 0 ? stages : DEFAULT_PIPELINE_STAGES;
  const safeSpeed = clampFinite(pulseSpeedSeconds, 0.6, 4, 1.5);
  const activeStage = resolvedStages.find((s) => s.status === 'active');

  const packetStyle: CSSProperties = {
    background: 'linear-gradient(90deg, transparent, var(--prism-secondary-main), var(--prism-primary-main))',
    '--prism-fx-duration': `${safeSpeed}s`,
  } as CSSProperties;

  const merged = mergeProps({
    themeTarget: themeProps('pipeline-pulse-loader', {
      active: Boolean(activeStage),
    }),
    baseClassName:
      'prism-slab prism-contain-leaf rounded-2xl p-4 sm:p-5 min-w-0 max-w-full overflow-x-auto',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-label={label}
      {...rest}
      {...merged}
    >
      <ol className={`${PIPE_LIST_CLASS} flex items-start justify-between gap-2 min-w-0`}>
        {resolvedStages.map((stage, idx) => {
          const isLast = idx === resolvedStages.length - 1;
          const nextStage = resolvedStages[idx + 1];
          const trackCompleted =
            stage.status === 'completed' &&
            (nextStage?.status === 'completed' || nextStage?.status === 'active');
          const trackPulsing =
            stage.status === 'active' ||
            (stage.status === 'completed' && nextStage?.status === 'active');

          const nodeStyle: CSSProperties =
            stage.status === 'completed'
              ? STYLE_BADGE_SUCCESS
              : stage.status === 'active'
                ? STYLE_BADGE_PRIMARY
                : stage.status === 'error'
                  ? STYLE_BADGE_ERROR
                  : STYLE_TEXT_SECONDARY;

          return (
            <li
              key={stage.id}
              data-testid="pipeline-pulse-stage"
              data-status={stage.status}
              className="flex flex-1 items-start min-w-0"
            >
              <div className="flex flex-col items-center text-center gap-1.5 shrink-0 min-w-0 max-w-[120px]">
                <button
                  type="button"
                  disabled={!onStageSelect}
                  onClick={() => onStageSelect?.(stage)}
                  aria-current={stage.status === 'active' ? 'step' : undefined}
                  className={`prism-focus-ring w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    stage.status === 'pending' ? 'prism-well' : 'shadow-sm'
                  } ${onStageSelect ? 'cursor-pointer' : 'cursor-default'}`}
                  style={nodeStyle}
                >
                  {stage.status === 'completed' ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : stage.status === 'error' ? (
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </button>
                <span className="text-xs font-semibold truncate max-w-full" style={STYLE_TEXT_PRIMARY}>
                  {stage.label}
                </span>
                {stage.detail ? (
                  <span className="text-[10px] font-mono truncate max-w-full" style={STYLE_TEXT_SECONDARY}>
                    {stage.detail}
                  </span>
                ) : null}
              </div>

              {!isLast ? (
                <div
                  aria-hidden="true"
                  className={`${PIPE_TRACK_CLASS} relative flex-1 h-1 rounded-full mx-2 mt-3.5 overflow-hidden min-w-[24px]`}
                  style={
                    trackCompleted
                      ? STYLE_BG_SUCCESS
                      : stage.status === 'active'
                        ? STYLE_BG_PRIMARY
                        : STYLE_BG_DIVIDER
                  }
                >
                  {trackPulsing ? (
                    <span
                      data-testid="pipeline-pulse-packet"
                      className={`${PIPE_PACKET_CLASS} prism-fx-packet absolute top-1/2 left-0 w-1/2 h-full rounded-full`}
                      style={packetStyle}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export const PipelinePulseLoader = /*#__PURE__*/ memoWithDisplayName(
  PipelinePulseLoaderInner,
  'PipelinePulseLoader'
);
