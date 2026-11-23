'use client';

import { memo, useEffect, useId, useRef } from 'react';
import { Check, Minus } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type TriCheckboxState = 'unchecked' | 'checked' | 'indeterminate';

type TriStateCheckboxBaseProps = Omit<BaseProps<HTMLLabelElement>, 'onChange'>;

export interface TriStateCheckboxProps extends TriStateCheckboxBaseProps {
  /** Controlled tri-state value ('unchecked' | 'checked' | 'indeterminate'). */
  state?: TriCheckboxState;
  /** Initial tri-state value for uncontrolled usage (defaults to 'unchecked'). */
  defaultState?: TriCheckboxState;
  /** Callback invoked with the next tri-state value when toggled. */
  onChange?: (next: TriCheckboxState) => void;
  /** Visible and accessible label text. */
  label: string;
  /** Optional secondary description rendered beneath the label. */
  description?: string;
  /** Optional count of selected child items shown in a tabular pill alongside totalCount. */
  selectedCount?: number;
  /** Optional total count of child items (must be finite and > 0 to show the count pill). */
  totalCount?: number;
  /** Disables pointer and keyboard toggling. */
  disabled?: boolean;
}

function TriStateCheckboxInner({
  state,
  defaultState = 'unchecked',
  onChange,
  label,
  description,
  selectedCount,
  totalCount,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TriStateCheckboxProps) {
  const inputId = useId();
  const labelId = useId();
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const override = useComponentOverride('TriStateCheckbox');

  const [currentState, setCurrentState] = useControllableState<TriCheckboxState>({
    value: state,
    defaultValue: defaultState,
    onChange,
  });

  const isChecked = currentState === 'checked';
  const isIndeterminate = currentState === 'indeterminate';

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggle = () => {
    if (disabled) return;
    const nextState: TriCheckboxState = isChecked ? 'unchecked' : 'checked';
    setCurrentState(nextState);
    if (state !== undefined && inputRef.current) {
      inputRef.current.indeterminate = isIndeterminate;
    }
  };

  const showCountPill =
    typeof selectedCount === 'number' &&
    Number.isFinite(selectedCount) &&
    typeof totalCount === 'number' &&
    Number.isFinite(totalCount) &&
    totalCount > 0;

  const safeSelectedCount = showCountPill
    ? clampNumber(selectedCount, 0, totalCount, 0)
    : 0;

  const merged = mergeProps({
    themeTarget: themeProps('tri-state-checkbox', {
      state: currentState,
      disabled,
    }),
    baseClassName: cx(
      'inline-flex items-start gap-3 select-none group',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const boxClass = stableClassName('tri-state-checkbox', 'box');
  const labelClass = stableClassName('tri-state-checkbox', 'label');
  const descriptionClass = stableClassName('tri-state-checkbox', 'description');
  const countClass = stableClassName('tri-state-checkbox', 'count');

  const boxVisualClass = isChecked
    ? 'prism-emerald'
    : isIndeterminate
      ? 'prism-crystal border'
      : 'prism-well';

  const boxStyle = isChecked
    ? { color: 'var(--prism-success-contrast)' }
    : isIndeterminate
      ? {
          borderColor: 'var(--prism-primary-main)',
          color: 'var(--prism-primary-main)',
        }
      : undefined;

  const countColor = isIndeterminate
    ? 'var(--prism-primary-main)'
    : isChecked
      ? 'var(--prism-success-main)'
      : 'var(--prism-text-secondary)';

  return (
    <label ref={ref} htmlFor={inputId} {...rest} {...merged}>
      <input
        ref={inputRef}
        id={inputId}
        type="checkbox"
        checked={isChecked}
        disabled={disabled}
        aria-checked={isIndeterminate ? 'mixed' : isChecked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        onChange={handleToggle}
        className="peer sr-only prism-focus-ring cursor-pointer disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        data-testid="tri-state-box"
        data-state={currentState}
        className={cx(
          boxClass,
          'w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 transition-transform duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]',
          disabled ? 'cursor-not-allowed' : 'group-hover:scale-105',
          boxVisualClass
        )}
        style={boxStyle}
      >
        {isChecked ? (
          <Check className="w-4 h-4 stroke-[2.8]" aria-hidden="true" />
        ) : isIndeterminate ? (
          <Minus className="w-4 h-4 stroke-[2.8]" aria-hidden="true" />
        ) : null}
      </span>
      <span className="pt-0.5 min-w-0">
        <span className="inline-flex items-center gap-2 flex-wrap">
          <span
            id={labelId}
            className={cx(labelClass, 'text-sm font-medium tracking-tight')}
            style={STYLE_TEXT_PRIMARY}
          >
            {label}
          </span>
          {showCountPill ? (
            <span
              data-testid="tri-state-count-pill"
              className={cx(
                countClass,
                'prism-crystal px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums shrink-0'
              )}
              style={{ color: countColor }}
            >
              {safeSelectedCount}/{totalCount}
            </span>
          ) : null}
        </span>
        {description ? (
          <span
            id={descriptionId}
            className={cx(descriptionClass, 'block text-xs mt-0.5')}
            style={STYLE_TEXT_SECONDARY}
          >
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export const TriStateCheckbox = memo(TriStateCheckboxInner);
TriStateCheckbox.displayName = 'TriStateCheckbox';
