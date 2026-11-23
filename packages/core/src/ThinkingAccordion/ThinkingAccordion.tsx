'use client';

import { memo, useId, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ThinkingStepStatus = 'pending' | 'active' | 'done' | 'error';

export interface ThinkingStep {
  /** Unique identifier for the reasoning step. */
  id: string;
  /** Concise heading describing the reasoning step. */
  title: string;
  /** Optional detailed reasoning trace output rendered as literal text. */
  detail?: string;
  /** Optional tool or function name rendered in a monospace crystal badge. */
  toolName?: string;
  /** Optional step execution duration in milliseconds. */
  durationMs?: number;
  /** Lifecycle status of this reasoning step (defaults to 'pending'). */
  status?: ThinkingStepStatus;
}

export interface ThinkingAccordionProps extends BaseProps<HTMLDivElement> {
  /** Ordered list of reasoning steps shown when the trace is expanded. */
  steps: ReadonlyArray<ThinkingStep>;
  /** Header title rendered inside the collapsible slab trigger (defaults to 'Reasoning trace'). */
  title?: string;
  /** Indicates the assistant is actively streaming reasoning steps. */
  isStreaming?: boolean;
  /** Optional formatted total duration readout displayed alongside the step counter. */
  durationLabel?: string;
  /** Controlled expanded state for the reasoning trace panel. */
  open?: boolean;
  /** Initial expanded state for uncontrolled mode (defaults to false). */
  defaultOpen?: boolean;
  /** Callback invoked when the expanded state changes. */
  onOpenChange?: (open: boolean) => void;
}

interface StepStatusVisual {
  icon: ReactNode;
  colorToken: string;
  srLabel: string;
}

function getStepStatusVisual(status: ThinkingStepStatus): StepStatusVisual {
  switch (status) {
    case 'done':
      return {
        icon: <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-success-main)',
        srLabel: 'Completed',
      };
    case 'active':
      return {
        icon: <Loader2 aria-hidden="true" className="w-4 h-4 shrink-0 animate-spin motion-reduce:animate-none" />,
        colorToken: 'var(--prism-info-main)',
        srLabel: 'In progress',
      };
    case 'error':
      return {
        icon: <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-error-main)',
        srLabel: 'Error',
      };
    case 'pending':
      return {
        icon: <Circle aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-text-disabled)',
        srLabel: 'Pending',
      };
  }
}

function formatDurationMs(durationMs: number | undefined): string | null {
  if (durationMs === undefined || !Number.isFinite(durationMs)) {
    return null;
  }
  const safeMs = Math.max(0, Math.round(durationMs));
  return `${safeMs}ms`;
}

function ThinkingAccordionInner({
  steps,
  title = 'Reasoning trace',
  isStreaming = false,
  durationLabel,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ThinkingAccordionProps) {
  const override = useComponentOverride('ThinkingAccordion');
  const triggerId = useId();
  const panelId = useId();

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const completedCount = steps.filter((step) => step.status === 'done').length;
  const totalCount = steps.length;
  const stepUnit = totalCount === 1 ? 'step' : 'steps';

  const merged = mergeProps({
    themeTarget: themeProps('thinking-accordion', {
      open: isOpen,
      streaming: isStreaming,
      empty: totalCount === 0,
    }),
    baseClassName: 'prism-slab overflow-hidden w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <button
        id={triggerId}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((prev) => !prev)}
        className="prism-focus-ring w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
      >
        <span className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={{
              color: isStreaming ? 'var(--prism-primary-main)' : 'var(--prism-info-main)',
            }}
          >
            <Sparkles
              aria-hidden="true"
              className={`w-4 h-4 shrink-0 ${isStreaming ? 'animate-pulse motion-reduce:animate-none' : ''}`}
            />
          </span>

          <span
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </span>

          {isStreaming ? (
            <span
              role="status"
              aria-live="polite"
              data-testid="thinking-streaming-pill"
              className="prism-emerald inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0"
            >
              <Loader2 aria-hidden="true" className="w-3 h-3 animate-spin motion-reduce:animate-none shrink-0" />
              <span>Thinking...</span>
            </span>
          ) : null}
        </span>

        <span className="flex items-center gap-2 shrink-0">
          <span
            data-testid="thinking-step-count"
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums"
            style={STYLE_TEXT_SECONDARY}
          >
            {completedCount}/{totalCount} {stepUnit}
          </span>

          {durationLabel ? (
            <span
              data-testid="thinking-duration-label"
              className="font-mono text-[11px] tabular-nums"
              style={STYLE_TEXT_SECONDARY}
            >
              {durationLabel}
            </span>
          ) : null}

          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
            style={STYLE_TEXT_SECONDARY}
          />
        </span>
      </button>

      {isOpen ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="px-4 pb-4 pt-3 border-t"
          style={STYLE_BORDER_DIVIDER}
        >
          <div className="prism-well rounded-2xl p-3">
            {totalCount === 0 ? (
              <p
                data-testid="thinking-empty-state"
                className="py-4 px-2 text-center text-xs"
                style={STYLE_TEXT_SECONDARY}
              >
                {isStreaming
                  ? 'Initializing reasoning trace...'
                  : 'No reasoning steps recorded yet.'}
              </p>
            ) : (
              <ol className="space-y-2.5">
                {steps.map((step) => {
                  const status: ThinkingStepStatus = step.status ?? 'pending';
                  const visual = getStepStatusVisual(status);
                  const formattedDuration = formatDurationMs(step.durationMs);

                  return (
                    <li
                      key={step.id}
                      data-step-id={step.id}
                      data-step-status={status}
                      className="flex items-start gap-2.5"
                    >
                      <span
                        className="mt-0.5 inline-flex items-center justify-center shrink-0"
                        style={{ color: visual.colorToken }}
                      >
                        {visual.icon}
                        <span className="sr-only">{visual.srLabel}</span>
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0 flex flex-wrap items-center gap-2">
                            <span
                              className="text-xs font-semibold leading-snug break-words"
                              style={STYLE_TEXT_PRIMARY}
                            >
                              {step.title}
                            </span>

                            {step.toolName ? (
                              <span
                                data-testid={`thinking-step-tool-${step.id}`}
                                className="prism-crystal inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-medium shrink-0"
                                style={STYLE_TEXT_PRIMARY}
                              >
                                <Terminal aria-hidden="true" className="w-3 h-3 shrink-0" />
                                <span>{step.toolName}</span>
                              </span>
                            ) : null}
                          </div>

                          {formattedDuration ? (
                            <span
                              data-testid={`thinking-step-duration-${step.id}`}
                              className="font-mono text-[11px] tabular-nums shrink-0"
                              style={STYLE_TEXT_SECONDARY}
                            >
                              {formattedDuration}
                            </span>
                          ) : null}
                        </div>

                        {step.detail ? (
                          <p
                            className="mt-1 text-xs leading-relaxed break-words whitespace-pre-wrap"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            {step.detail}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const ThinkingAccordion = memo(ThinkingAccordionInner);
ThinkingAccordion.displayName = 'ThinkingAccordion';
