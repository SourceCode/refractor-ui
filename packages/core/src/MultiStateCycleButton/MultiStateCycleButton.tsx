'use client';

import type {
  ButtonHTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type CycleButtonTone = 'neutral' | 'primary' | 'secondary' | 'emerald' | 'amber';

export interface CycleButtonStateOption {
  /** Unique identifier for this cycle state option. */
  id: string;
  /** Visible text label rendered while this state is active. */
  label: string;
  /** Optional leading icon rendered while this state is active. */
  icon?: ReactNode;
  /** Optional semantic optical tone for border, icon, and active step dot. */
  tone?: CycleButtonTone;
}

type MultiStateCycleButtonBaseProps = Omit<BaseProps<HTMLButtonElement>, 'onChange'>;

export interface MultiStateCycleButtonProps
  extends MultiStateCycleButtonBaseProps,
    Pick<
      ButtonHTMLAttributes<HTMLButtonElement>,
      'form' | 'formAction' | 'name' | 'type'
    > {
  /** Ordered list of states cycled sequentially on click. */
  states: CycleButtonStateOption[];
  /** Controlled active state id. */
  value?: string;
  /** Initial active state id in uncontrolled mode (defaults to states[0]?.id ?? ''). */
  defaultValue?: string;
  /** Callback invoked with the next state id, full option object, and next index. */
  onChange?: (nextId: string, option: CycleButtonStateOption, nextIndex: number) => void;
  /** Renders step-indicator dots next to the active label (defaults to true). */
  showStepDots?: boolean;
  /** Disables cycling interaction. */
  disabled?: boolean;
}

interface ToneVisualTokens {
  accentColor: string;
  borderColor: string;
  dotActiveColor: string;
}

function getToneVisualTokens(tone: CycleButtonTone): ToneVisualTokens {
  switch (tone) {
    case 'primary':
      return {
        accentColor: 'var(--prism-primary-main)',
        borderColor: 'var(--prism-primary-main)',
        dotActiveColor: 'var(--prism-primary-main)',
      };
    case 'secondary':
      return {
        accentColor: 'var(--prism-secondary-dark)',
        borderColor: 'var(--prism-secondary-main)',
        dotActiveColor: 'var(--prism-secondary-main)',
      };
    case 'emerald':
      return {
        accentColor: 'var(--prism-success-main)',
        borderColor: 'var(--prism-success-main)',
        dotActiveColor: 'var(--prism-success-main)',
      };
    case 'amber':
      return {
        accentColor: 'var(--prism-warning-main)',
        borderColor: 'var(--prism-warning-main)',
        dotActiveColor: 'var(--prism-warning-main)',
      };
    case 'neutral':
      return {
        accentColor: 'var(--prism-text-secondary)',
        borderColor: 'var(--prism-divider)',
        dotActiveColor: 'var(--prism-text-primary)',
      };
  }
}

const iconClass = /*#__PURE__*/ stableClassName('multi-state-cycle-button', 'icon');
const labelClass = /*#__PURE__*/ stableClassName('multi-state-cycle-button', 'label');
const dotsClass = /*#__PURE__*/ stableClassName('multi-state-cycle-button', 'step-dots');
const dotClass = /*#__PURE__*/ stableClassName('multi-state-cycle-button', 'step-dot');

function MultiStateCycleButtonInner({
  states,
  value,
  defaultValue,
  onChange,
  showStepDots = true,
  disabled = false,
  type = 'button',
  className,
  style,
  xstyle,
  onClick,
  onKeyDown,
  ref,
  ...rest
}: MultiStateCycleButtonProps) {
  const override = useComponentOverride('MultiStateCycleButton');

  const fallbackId = states[0]?.id ?? '';
  const [currentId, setCurrentId] = useControllableState<string>({
    value,
    defaultValue: defaultValue ?? fallbackId,
  });

  const matchedIdx = states.findIndex((option) => option.id === currentId);
  const activeIdx = states.length === 0 ? -1 : matchedIdx >= 0 ? matchedIdx : 0;
  const activeOption: CycleButtonStateOption | undefined =
    activeIdx >= 0 ? states[activeIdx] : undefined;
  const activeTone: CycleButtonTone = activeOption?.tone ?? 'neutral';
  const toneVisual = getToneVisualTokens(activeTone);
  const canCycle = !disabled && states.length >= 2;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !canCycle) {
      return;
    }

    const nextIdx = (activeIdx + 1) % states.length;
    const nextOption = states[nextIdx];
    if (!nextOption) {
      return;
    }

    setCurrentId(nextOption.id);
    onChange?.(nextOption.id, nextOption, nextIdx);
  };

  const handleKeyDown = composeEventHandlers(
    onKeyDown,
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && disabled) {
        event.preventDefault();
      }
    }
  );

  const merged = mergeProps({
    themeTarget: themeProps('multi-state-cycle-button', {
      stateId: activeOption?.id ?? '',
      activeStep: activeIdx,
      tone: activeTone,
      disabled,
      empty: states.length === 0,
    }),
    baseClassName: cx(
      'prism-crystal prism-focus-ring rounded-full h-11 px-5 inline-flex items-center justify-center gap-2.5 text-sm font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
      canCycle
        ? 'cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:brightness-[1.03] enabled:active:scale-[0.99]'
        : 'cursor-default'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: {
      color: 'var(--prism-text-primary)',
      borderWidth: '1.5px',
      borderStyle: 'solid',
      borderColor: toneVisual.borderColor,
    },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const liveAnnouncement = activeOption
    ? `${activeOption.label} (${activeIdx + 1} of ${states.length})`
    : '';

  return (
    <>
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...rest}
        {...merged}
      >
        {activeOption?.icon ? (
          <span
            aria-hidden="true"
            className={cx(iconClass, 'relative z-10 inline-flex items-center shrink-0')}
            style={{ color: toneVisual.accentColor }}
          >
            {activeOption.icon}
          </span>
        ) : null}

        {activeOption ? (
          <span className={cx(labelClass, 'relative z-10')}>{activeOption.label}</span>
        ) : null}

        {showStepDots && states.length > 0 ? (
          <span
            aria-hidden="true"
            data-testid="multi-state-step-dots"
            data-active-step={String(activeIdx)}
            className={cx(dotsClass, 'relative z-10 inline-flex items-center gap-1 ml-1 shrink-0')}
          >
            {states.map((option, idx) => {
              const isStepActive = idx === activeIdx;
              return (
                <span
                  key={option.id}
                  data-step-index={String(idx)}
                  data-active={isStepActive ? 'true' : undefined}
                  className={cx(
                    dotClass,
                    'h-1.5 rounded-full transition-[color,background-color,border-color,opacity,transform] duration-150',
                    isStepActive ? 'w-3' : 'w-1.5 opacity-45'
                  )}
                  style={{
                    backgroundColor: isStepActive
                      ? toneVisual.dotActiveColor
                      : 'var(--prism-text-disabled)',
                  }}
                />
              );
            })}
          </span>
        ) : null}
      </button>

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </span>
    </>
  );
}

export const MultiStateCycleButton = /*#__PURE__*/ memoWithDisplayName(MultiStateCycleButtonInner, 'MultiStateCycleButton');
