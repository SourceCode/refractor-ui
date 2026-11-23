'use client';

import { memo, useId, type TextareaHTMLAttributes } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

type TextAreaBaseProps = Omit<BaseProps<HTMLTextAreaElement>, 'onChange'>;

export interface TextAreaProps
  extends TextAreaBaseProps,
    Pick<
      TextareaHTMLAttributes<HTMLTextAreaElement>,
      | 'autoComplete'
      | 'cols'
      | 'defaultValue'
      | 'disabled'
      | 'form'
      | 'maxLength'
      | 'minLength'
      | 'name'
      | 'onChange'
      | 'placeholder'
      | 'readOnly'
      | 'required'
      | 'rows'
      | 'value'
      | 'wrap'
    > {
  /** Visible field label linked to the textarea via htmlFor. */
  label?: string;
  /** Supplementary helper text displayed beneath the textarea. */
  helperText?: string;
  /** Validation error text; highlights bezel and sets aria-invalid. */
  errorText?: string;
  /** Optional character limit displayed as a live tabular counter and enforced via maxLength. */
  maxCharacters?: number;
  /** IME-safe callback invoked on Ctrl+Enter or Cmd+Enter outside composition. */
  onEnter?: (value: string) => void;
}

function TextAreaInner({
  label,
  helperText,
  errorText,
  maxCharacters,
  onEnter,
  value,
  maxLength,
  className,
  style,
  xstyle,
  id,
  disabled = false,
  onKeyDown,
  'aria-describedby': ariaDescribedBy,
  ref,
  ...rest
}: TextAreaProps) {
  const generatedId = useId();
  const areaId = id || generatedId;
  const messageId = errorText || helperText ? `${areaId}-message` : undefined;
  const describedBy = cx(ariaDescribedBy, messageId) || undefined;
  const charCount = typeof value === 'string' ? value.length : 0;
  const override = useComponentOverride('TextArea');

  const merged = mergeProps({
    themeTarget: themeProps('text-area', { disabled, invalid: Boolean(errorText) }),
    baseClassName: 'w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div {...merged}>
      {label || maxCharacters !== undefined ? (
        <div className="flex items-center justify-between mb-1.5 px-1">
          {label ? (
            <label htmlFor={areaId} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {label}
            </label>
          ) : (
            <span />
          )}
          {maxCharacters !== undefined ? (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {charCount} / {maxCharacters}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={`prism-crystal rounded-[22px] p-1.5 transition-[color,background-color,border-color,opacity,transform] ${
          errorText ? 'ring-2 ring-red-500/70' : 'focus-within:ring-2 focus-within:ring-sky-400/70'
        }`}
      >
        <textarea
          ref={ref}
          id={areaId}
          value={value}
          disabled={disabled}
          maxLength={maxLength ?? maxCharacters}
          aria-invalid={Boolean(errorText)}
          aria-describedby={describedBy}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (
              e.key === 'Enter' &&
              (e.metaKey || e.ctrlKey) &&
              !e.nativeEvent.isComposing &&
              !e.defaultPrevented
            ) {
              onEnter?.(e.currentTarget.value);
            }
          }}
          className="prism-well w-full min-h-[104px] rounded-[17px] px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-y block disabled:cursor-not-allowed disabled:opacity-60"
          {...rest}
        />
      </div>
      {errorText || helperText ? (
        <p
          id={messageId}
          role={errorText ? 'alert' : undefined}
          className={`mt-1.5 ml-2 text-xs ${
            errorText ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {errorText || helperText}
        </p>
      ) : null}
    </div>
  );
}

export const TextArea = memo(TextAreaInner);
TextArea.displayName = 'TextArea';
