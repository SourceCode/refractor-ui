'use client';

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export type ProductTourMode = 'overlay' | 'inline';

export interface TourStep {
  /** Unique identifier for the onboarding step. */
  id: string;
  /** Primary heading displayed at the top of the optical coachmark card. */
  title: string;
  /** Supporting instructional copy rendered inside the coachmark body. */
  description: string;
  /** Optional CSS selector targeting an element to spotlight in overlay mode. */
  targetSelector?: string;
  /** Preferred coachmark anchor placement relative to the spotlighted target. */
  placement?: TourPlacement;
  /** Optional custom header badge (defaults to 'Step X of Y'). */
  badge?: string;
  /** Optional step-specific CTA label overriding nextLabel / finishLabel. */
  actionLabel?: string;
}

export interface ProductTourProps extends BaseProps<HTMLDivElement> {
  /** Ordered sequence of guided tour steps. Returns null when empty. */
  steps: readonly TourStep[];
  /** Controlled visibility state of the tour. */
  open?: boolean;
  /** Initial visibility state in uncontrolled mode (defaults to false). */
  defaultOpen?: boolean;
  /** Callback invoked whenever open visibility changes. */
  onOpenChange?: (open: boolean) => void;
  /** Controlled zero-based active step index (clamped safely to 0..steps.length-1). */
  stepIndex?: number;
  /** Initial zero-based step index in uncontrolled mode (defaults to 0). */
  defaultStepIndex?: number;
  /** Callback invoked when the user navigates to another step. */
  onStepChange?: (index: number, step: TourStep) => void;
  /** Callback invoked when the user finishes the final step. */
  onComplete?: () => void;
  /** Callback invoked when the tour is skipped or dismissed via Escape/Close. */
  onSkip?: (atIndex: number) => void;
  /** Presentation mode ('overlay' with spotlight backdrop or 'inline' card, defaults to 'overlay'). */
  mode?: ProductTourMode;
  /** Shows interactive progress dots allowing direct navigation between steps (defaults to true). */
  showProgressDots?: boolean;
  /** Closes and skips the tour when Escape is pressed (defaults to true). */
  closeOnEscape?: boolean;
  /** Label for the forward button on intermediate steps (defaults to 'Next'). */
  nextLabel?: string;
  /** Label for the previous step button (defaults to 'Back'). */
  backLabel?: string;
  /** Label for the primary CTA on the final step (defaults to 'Finish'). */
  finishLabel?: string;
  /** Label for the skip action button (defaults to 'Skip tour'). */
  skipLabel?: string;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CARD_EST_WIDTH = 368;
const CARD_EST_HEIGHT = 240;
const CARD_GAP = 16;
const VIEWPORT_MARGIN = 16;
const SPOTLIGHT_PAD = 6;

function resolveTargetRect(selector: string): SpotlightRect | null {
  const trimmed = selector.trim();
  if (!trimmed) return null;

  let target: Element | null;
  try {
    target = document.querySelector(trimmed);
  } catch {
    return null;
  }

  if (!target) return null;
  const rect = target.getBoundingClientRect();
  return {
    top: clampNumber(rect.top, -100000, 100000, 0),
    left: clampNumber(rect.left, -100000, 100000, 0),
    width: clampNumber(rect.width, 0, 100000, 0),
    height: clampNumber(rect.height, 0, 100000, 0),
  };
}

function computeAnchoredCardStyle(
  rect: SpotlightRect,
  placement: Exclude<TourPlacement, 'center'>
): CSSProperties {
  const vw = clampNumber(window.innerWidth, 320, 10000, 1024);
  const vh = clampNumber(window.innerHeight, 240, 10000, 768);
  const maxLeft = Math.max(VIEWPORT_MARGIN, vw - CARD_EST_WIDTH - VIEWPORT_MARGIN);
  const maxTop = Math.max(VIEWPORT_MARGIN, vh - CARD_EST_HEIGHT - VIEWPORT_MARGIN);

  let top: number;
  let left: number;

  if (placement === 'top') {
    top = clampNumber(rect.top - CARD_EST_HEIGHT - CARD_GAP, VIEWPORT_MARGIN, maxTop);
    left = clampNumber(rect.left + rect.width / 2 - CARD_EST_WIDTH / 2, VIEWPORT_MARGIN, maxLeft);
  } else if (placement === 'left') {
    top = clampNumber(rect.top + rect.height / 2 - CARD_EST_HEIGHT / 2, VIEWPORT_MARGIN, maxTop);
    left = clampNumber(rect.left - CARD_EST_WIDTH - CARD_GAP, VIEWPORT_MARGIN, maxLeft);
  } else if (placement === 'right') {
    top = clampNumber(rect.top + rect.height / 2 - CARD_EST_HEIGHT / 2, VIEWPORT_MARGIN, maxTop);
    left = clampNumber(rect.left + rect.width + CARD_GAP, VIEWPORT_MARGIN, maxLeft);
  } else {
    top = clampNumber(rect.top + rect.height + CARD_GAP, VIEWPORT_MARGIN, maxTop);
    left = clampNumber(rect.left + rect.width / 2 - CARD_EST_WIDTH / 2, VIEWPORT_MARGIN, maxLeft);
  }

  return {
    position: 'fixed',
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
  };
}

export function ProductTour({
  steps,
  open,
  defaultOpen = false,
  onOpenChange,
  stepIndex,
  defaultStepIndex = 0,
  onStepChange,
  onComplete,
  onSkip,
  mode = 'overlay',
  showProgressDots = true,
  closeOnEscape = true,
  nextLabel = 'Next',
  backLabel = 'Back',
  finishLabel = 'Finish',
  skipLabel = 'Skip tour',
  onKeyDown,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ProductTourProps) {
  const override = useComponentOverride('ProductTour');
  const titleId = useId();
  const descriptionId = useId();

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const maxIndex = Math.max(0, steps.length - 1);
  const safeDefaultStepIndex = Math.round(clampNumber(defaultStepIndex, 0, maxIndex, 0));

  const [rawStepIndex, setRawStepIndex] = useControllableState<number>({
    value: stepIndex,
    defaultValue: safeDefaultStepIndex,
  });

  const activeIndex =
    steps.length > 0 ? Math.round(clampNumber(rawStepIndex, 0, maxIndex, 0)) : 0;
  const activeStep = steps[activeIndex];

  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);

  const activeTargetSelector = activeStep?.targetSelector;

  useEffect(() => {
    if (!isOpen || mode !== 'overlay' || !activeTargetSelector) {
      return undefined;
    }

    const measure = () => {
      setTargetRect(resolveTargetRect(activeTargetSelector));
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [isOpen, mode, activeTargetSelector]);

  const goToStep = useCallback(
    (nextIndex: number) => {
      const clamped = Math.round(clampNumber(nextIndex, 0, Math.max(0, steps.length - 1), 0));
      const nextStep = steps[clamped];
      if (!nextStep) return;
      setRawStepIndex(clamped);
      onStepChange?.(clamped, nextStep);
    },
    [steps, setRawStepIndex, onStepChange]
  );

  const handleSkip = useCallback(() => {
    setIsOpen(false);
    onSkip?.(activeIndex);
  }, [activeIndex, onSkip, setIsOpen]);

  const handleComplete = useCallback(() => {
    setIsOpen(false);
    onComplete?.();
  }, [onComplete, setIsOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape || steps.length === 0) return undefined;

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isOpen, closeOnEscape, steps.length, handleSkip]);

  if (!isOpen || !activeStep) {
    return null;
  }

  const isFirstStep = activeIndex === 0;
  const isLastStep = activeIndex === steps.length - 1;
  const effectiveRect = mode === 'overlay' && activeTargetSelector ? targetRect : null;
  const requestedPlacement: TourPlacement = activeStep.placement ?? 'bottom';
  const effectivePlacement: TourPlacement =
    mode === 'inline' || !effectiveRect || requestedPlacement === 'center'
      ? 'center'
      : requestedPlacement;

  const anchoredCardStyle =
    effectiveRect && effectivePlacement !== 'center'
      ? computeAnchoredCardStyle(effectiveRect, effectivePlacement)
      : undefined;

  const badgeText = activeStep.badge ?? `Step ${activeIndex + 1} of ${steps.length}`;
  const primaryCtaLabel = activeStep.actionLabel ?? (isLastStep ? finishLabel : nextLabel);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowRight' && !isLastStep) {
      event.preventDefault();
      goToStep(activeIndex + 1);
    } else if (event.key === 'ArrowLeft' && !isFirstStep) {
      event.preventDefault();
      goToStep(activeIndex - 1);
    }
  };

  const handlePrimaryAction = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      goToStep(activeIndex + 1);
    }
  };

  const coachmarkBody = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 min-w-0">
          <span
            data-tour-badge="true"
            className="prism-crystal rounded-full px-3 py-1 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight truncate"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <Sparkles aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span className="truncate">{badgeText}</span>
          </span>
          {activeStep.badge ? (
            <span
              className="font-mono text-[11px] tabular-nums shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {activeIndex + 1} / {steps.length}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="Close tour"
          onClick={handleSkip}
          className="prism-focus-ring rounded-lg p-1 cursor-pointer shrink-0 transition-colors"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <h3
          id={titleId}
          className="text-base font-semibold tracking-tight"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {activeStep.title}
        </h3>
        <p
          id={descriptionId}
          className="text-sm leading-relaxed"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          {activeStep.description}
        </p>
      </div>

      {showProgressDots ? (
        <div
          role="group"
          aria-label="Tour progress"
          data-tour-dots="true"
          className="flex items-center gap-1.5 pt-0.5"
        >
          {steps.map((step, idx) => {
            const isCurrent = idx === activeIndex;
            const isCompleted = idx < activeIndex;
            return (
              <button
                key={step.id}
                type="button"
                aria-label={`Go to step ${idx + 1}: ${step.title}`}
                aria-current={isCurrent ? 'step' : undefined}
                data-step-dot={String(idx)}
                data-active={isCurrent ? 'true' : undefined}
                onClick={() => goToStep(idx)}
                className={cx(
                  'prism-focus-ring h-2 rounded-full transition-all cursor-pointer',
                  isCurrent ? 'w-6' : 'w-2'
                )}
                style={{
                  backgroundColor: isCurrent
                    ? 'var(--prism-primary-main)'
                    : isCompleted
                      ? 'var(--prism-success-main)'
                      : 'var(--prism-text-disabled)',
                }}
              />
            );
          })}
        </div>
      ) : null}

      <div
        className="pt-2 border-t flex items-center justify-between gap-3"
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        <button
          type="button"
          onClick={handleSkip}
          className="prism-focus-ring rounded-lg px-2 py-1 text-xs font-medium cursor-pointer transition-colors"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          {skipLabel}
        </button>

        <div className="inline-flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isFirstStep}
            onClick={isFirstStep ? undefined : () => goToStep(activeIndex - 1)}
            className="prism-btn-secondary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1 text-xs font-medium whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <ChevronLeft aria-hidden="true" className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">{backLabel}</span>
          </button>

          <button
            type="button"
            onClick={handlePrimaryAction}
            className="prism-btn-primary prism-focus-ring h-9 px-5 inline-flex items-center justify-center gap-1 text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            <span className="relative z-10">{primaryCtaLabel}</span>
            {!isLastStep ? (
              <ChevronRight aria-hidden="true" className="w-3.5 h-3.5 relative z-10" />
            ) : null}
          </button>
        </div>
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {`Step ${activeIndex + 1} of ${steps.length}: ${activeStep.title}`}
      </div>
    </>
  );

  const themeTarget = themeProps('product-tour', {
    open: true,
    mode,
    placement: effectivePlacement,
    step: activeIndex + 1,
    totalSteps: steps.length,
  });

  if (mode === 'inline') {
    const mergedInline = mergeProps({
      themeTarget,
      baseClassName: 'prism-slab w-full max-w-md p-5 space-y-4',
      overrideClassName: override?.className,
      userClassName: className,
      overrideStyle: override?.style,
      xstyle,
      userStyle: style,
    });

    return (
      <div
        ref={ref}
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={composeEventHandlers(onKeyDown, handleDialogKeyDown)}
        {...rest}
        {...mergedInline}
      >
        {coachmarkBody}
      </div>
    );
  }

  const mergedOverlay = mergeProps({
    themeTarget,
    baseClassName: cx(
      'fixed inset-0 z-50 p-4 bg-slate-900/35 backdrop-blur-xs',
      !anchoredCardStyle && 'flex items-center justify-center'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={-1}
      onKeyDown={composeEventHandlers(onKeyDown, handleDialogKeyDown)}
      {...rest}
      {...mergedOverlay}
    >
      {effectiveRect ? (
        <div
          aria-hidden="true"
          data-tour-spotlight="true"
          className="fixed pointer-events-none rounded-2xl border-2 transition-all duration-200"
          style={{
            top: `${Math.max(0, effectiveRect.top - SPOTLIGHT_PAD)}px`,
            left: `${Math.max(0, effectiveRect.left - SPOTLIGHT_PAD)}px`,
            width: `${Math.max(0, effectiveRect.width + SPOTLIGHT_PAD * 2)}px`,
            height: `${Math.max(0, effectiveRect.height + SPOTLIGHT_PAD * 2)}px`,
            borderColor: 'var(--prism-secondary-main)',
            outline: '3px solid var(--prism-focus-ring)',
            outlineOffset: '2px',
          }}
        />
      ) : null}

      <div
        data-tour-card="true"
        data-placement={effectivePlacement}
        className="prism-slab w-full max-w-sm p-5 space-y-4 z-10"
        style={anchoredCardStyle}
      >
        {coachmarkBody}
      </div>
    </div>
  );
}

ProductTour.displayName = 'ProductTour';
