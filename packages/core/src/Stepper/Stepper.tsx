'use client';

import { memo } from 'react';

import { Check } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface StepDefinition {
  id: string;
  title: string;
  subtitle?: string;
}

export interface StepperProps extends BaseProps<HTMLOListElement> {
  /** Ordered sequence of workflow steps. */
  steps: StepDefinition[];
  /** Zero-based index of the current active step (clamped to 0..steps.length). */
  activeStepIndex: number;
  /** Optional callback triggered when a step indicator is clicked. */
  onStepClick?: (index: number) => void;
}

function StepperInner({
  steps,
  activeStepIndex,
  onStepClick,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: StepperProps) {
  const override = useComponentOverride('Stepper');
  const normalizedActive = Number.isFinite(activeStepIndex)
    ? Math.min(steps.length, Math.max(0, Math.floor(activeStepIndex)))
    : 0;

  const merged = mergeProps({
    themeTarget: themeProps('stepper', {
      activeStep: normalizedActive,
      totalSteps: steps.length,
    }),
    baseClassName: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <ol ref={ref} aria-label="Progress steps" {...rest} {...merged}>
      {steps.map((step, index) => {
        const completed = index < normalizedActive;
        const current = index === normalizedActive;
        const status = completed ? 'completed' : current ? 'current' : 'upcoming';

        return (
          <li
            key={step.id}
            data-status={status}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <button
              type="button"
              aria-current={current ? 'step' : undefined}
              aria-label={`Step ${index + 1}: ${step.title}`}
              onClick={() => onStepClick?.(index)}
              className={`prism-focus-ring w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono tabular-nums font-semibold shrink-0 cursor-pointer ${
                completed
                  ? 'prism-emerald text-white'
                  : current
                    ? 'prism-btn-primary text-white'
                    : 'prism-crystal text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="relative z-10">
                {completed ? <Check className="w-4 h-4 stroke-[2.6]" aria-hidden="true" /> : index + 1}
              </span>
            </button>
            <div className="min-w-0">
              <div
                className={`text-xs font-semibold truncate ${
                  current
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {step.title}
              </div>
              {step.subtitle ? (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {step.subtitle}
                </div>
              ) : null}
            </div>
            {index < steps.length - 1 ? (
              <div
                aria-hidden="true"
                className={`hidden sm:block flex-1 h-0.5 rounded-full mx-2 ${
                  completed ? 'bg-emerald-500/70' : 'bg-slate-300/70 dark:bg-slate-700'
                }`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export const Stepper = memo(StepperInner);
Stepper.displayName = 'Stepper';
