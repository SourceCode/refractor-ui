'use client';

import { memo, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ListChecks,
  Loader2,
  MinusCircle,
  Plus,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type AgentPlanStepStatus = 'pending' | 'active' | 'done' | 'skipped' | 'failed';

export interface AgentPlanStep {
  /** Unique identifier for the plan step. */
  id: string;
  /** Concise title describing the step. */
  title: string;
  /** Optional supplementary execution detail rendered as literal text. */
  detail?: string;
  /** Current execution status of the plan step. */
  status: AgentPlanStepStatus;
}

export interface AgentPlanListProps extends BaseProps<HTMLDivElement> {
  /** Controlled list of execution plan steps. */
  steps?: AgentPlanStep[];
  /** Initial list of execution plan steps for uncontrolled usage. */
  defaultSteps?: AgentPlanStep[];
  /** Callback invoked whenever steps are added, toggled, or removed. */
  onStepsChange?: (steps: AgentPlanStep[]) => void;
  /** Header title for the execution plan card (defaults to 'Execution Plan'). */
  title?: string;
  /** Enables interactive status toggling, step removal, and inline step addition (defaults to true). */
  editable?: boolean;
  /** Callback invoked when a step's title/detail text is selected. */
  onSelectStep?: (step: AgentPlanStep) => void;
}

interface PlanStatusVisual {
  icon: ReactNode;
  colorToken: string;
  label: string;
}

const DEFAULT_EMPTY_STEPS: AgentPlanStep[] = [];

function getStepStatusVisual(status: AgentPlanStepStatus): PlanStatusVisual {
  switch (status) {
    case 'done':
      return {
        icon: <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-success-main)',
        label: 'Done',
      };
    case 'active':
      return {
        icon: <Loader2 aria-hidden="true" className="w-4 h-4 shrink-0 animate-spin motion-reduce:animate-none" />,
        colorToken: 'var(--prism-primary-main)',
        label: 'Active',
      };
    case 'failed':
      return {
        icon: <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-error-main)',
        label: 'Failed',
      };
    case 'skipped':
      return {
        icon: <MinusCircle aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-text-secondary)',
        label: 'Skipped',
      };
    case 'pending':
      return {
        icon: <Circle aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-text-disabled)',
        label: 'Pending',
      };
  }
}

function getNextToggledStatus(status: AgentPlanStepStatus): AgentPlanStepStatus {
  return status === 'done' ? 'pending' : 'done';
}

function AgentPlanListInner({
  steps,
  defaultSteps = DEFAULT_EMPTY_STEPS,
  onStepsChange,
  title = 'Execution Plan',
  editable = true,
  onSelectStep,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AgentPlanListProps) {
  const override = useComponentOverride('AgentPlanList');
  const headingId = useId();
  const addInputId = useId();
  const nextStepCounterRef = useRef(1);

  const [currentSteps, setCurrentSteps] = useControllableState<AgentPlanStep[]>({
    value: steps,
    defaultValue: defaultSteps,
    onChange: onStepsChange,
  });

  const [draftTitle, setDraftTitle] = useState('');

  const totalCount = currentSteps.length;
  const doneCount = currentSteps.filter((step) => step.status === 'done').length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const isComplete = totalCount > 0 && doneCount === totalCount;

  const trimmedDraft = draftTitle.trim();
  const canAdd = trimmedDraft.length > 0;

  const handleToggleStep = (stepId: string) => {
    setCurrentSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status: getNextToggledStatus(step.status) } : step
      )
    );
  };

  const handleRemoveStep = (stepId: string) => {
    setCurrentSteps((prev) => prev.filter((step) => step.id !== stepId));
  };

  const handleAddStep = () => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) return;

    setCurrentSteps((prev) => {
      const existingIds = new Set(prev.map((step) => step.id));
      let candidate = `plan-step-${nextStepCounterRef.current}`;
      while (existingIds.has(candidate)) {
        nextStepCounterRef.current += 1;
        candidate = `plan-step-${nextStepCounterRef.current}`;
      }
      nextStepCounterRef.current += 1;

      return [
        ...prev,
        {
          id: candidate,
          title: nextTitle,
          status: 'pending',
        },
      ];
    });
    setDraftTitle('');
  };

  const handleAddKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddStep();
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('agent-plan-list', {
      editable,
      empty: totalCount === 0,
      complete: isComplete,
    }),
    baseClassName: 'prism-slab overflow-hidden w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('agent-plan-list', 'header');
  const progressClass = stableClassName('agent-plan-list', 'progress');
  const listClass = stableClassName('agent-plan-list', 'list');
  const footerClass = stableClassName('agent-plan-list', 'footer');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div
        className={cx(headerClass, 'px-4 pt-4 pb-3 space-y-3 border-b')}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            <span
              className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
              style={{
                color: isComplete ? 'var(--prism-success-main)' : 'var(--prism-primary-main)',
              }}
            >
              <ListChecks aria-hidden="true" className="w-4 h-4 shrink-0" />
            </span>
            <h3
              id={headingId}
              className="text-sm font-semibold truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </h3>
          </div>

          <span
            data-testid="agent-plan-counter"
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {doneCount} / {totalCount} complete
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${title} completion`}
          aria-valuetext={`${doneCount} / ${totalCount} complete`}
          className={cx(progressClass, 'prism-well h-2.5 rounded-full p-0.5 overflow-hidden')}
        >
          <div
            data-testid="agent-plan-progress-fill"
            className={cx(
              'h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-200',
              isComplete ? 'prism-emerald' : 'prism-btn-primary'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {totalCount === 0 ? (
          <div
            data-testid="agent-plan-empty"
            className="prism-well rounded-2xl py-6 px-4 text-center"
          >
            <p className="text-xs font-medium" style={STYLE_TEXT_SECONDARY}>
              {editable
                ? 'No execution steps yet. Add a step below to start building the plan.'
                : 'No execution steps in this plan.'}
            </p>
          </div>
        ) : (
          <ol className={cx(listClass, 'space-y-2')}>
            {currentSteps.map((step) => {
              const visual = getStepStatusVisual(step.status);
              const isDone = step.status === 'done';
              const isSkipped = step.status === 'skipped';

              const stepCopy = (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cx(
                        'text-xs font-semibold leading-snug break-words',
                        isSkipped && 'line-through opacity-75'
                      )}
                      style={{
                        color: isSkipped
                          ? 'var(--prism-text-secondary)'
                          : 'var(--prism-text-primary)',
                      }}
                    >
                      {step.title}
                    </span>
                    <span
                      className="prism-well px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0"
                      style={{ color: visual.colorToken }}
                    >
                      {visual.label}
                    </span>
                  </div>

                  {step.detail ? (
                    <p
                      className="mt-1 text-xs leading-relaxed break-words whitespace-pre-wrap"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {step.detail}
                    </p>
                  ) : null}
                </>
              );

              return (
                <li
                  key={step.id}
                  data-step-id={step.id}
                  data-step-status={step.status}
                  className="prism-crystal rounded-2xl px-3 py-2.5 flex items-start gap-2.5"
                >
                  {editable ? (
                    <button
                      type="button"
                      data-testid={`agent-plan-status-${step.id}`}
                      aria-pressed={isDone}
                      aria-label={
                        isDone
                          ? `Mark ${step.title} as pending`
                          : `Mark ${step.title} as done`
                      }
                      onClick={() => handleToggleStep(step.id)}
                      className="prism-focus-ring mt-0.5 rounded-full p-0.5 inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
                      style={{ color: visual.colorToken }}
                    >
                      {visual.icon}
                    </button>
                  ) : (
                    <span
                      data-testid={`agent-plan-status-${step.id}`}
                      className="mt-0.5 p-0.5 inline-flex items-center justify-center shrink-0"
                      style={{ color: visual.colorToken }}
                    >
                      {visual.icon}
                      <span className="sr-only">{visual.label}</span>
                    </span>
                  )}

                  {onSelectStep ? (
                    <button
                      type="button"
                      onClick={() => onSelectStep(step)}
                      className="prism-focus-ring min-w-0 flex-1 text-left rounded-lg px-1 py-0.5 cursor-pointer disabled:cursor-not-allowed enabled:hover:opacity-85 transition-opacity"
                    >
                      {stepCopy}
                    </button>
                  ) : (
                    <div className="min-w-0 flex-1 py-0.5">{stepCopy}</div>
                  )}

                  {editable ? (
                    <button
                      type="button"
                      aria-label={`Remove ${step.title}`}
                      onClick={() => handleRemoveStep(step.id)}
                      className="prism-focus-ring mt-0.5 w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 opacity-60 cursor-pointer disabled:cursor-not-allowed enabled:hover:opacity-100 transition-opacity"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        {editable ? (
          <div className={cx(footerClass, 'flex items-center gap-2 pt-1')}>
            <div className="prism-well flex-1 rounded-full px-3.5 py-1.5 flex items-center">
              <input
                id={addInputId}
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Add step..."
                aria-label="Add step"
                className="prism-focus-ring w-full bg-transparent text-xs focus:outline-none"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>

            <button
              type="button"
              disabled={!canAdd}
              onClick={handleAddStep}
              className="prism-btn-primary prism-focus-ring h-8 px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5 relative z-10 shrink-0" />
              <span className="relative z-10">Add</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const AgentPlanList = memo(AgentPlanListInner);
AgentPlanList.displayName = 'AgentPlanList';
