'use client';

import { memo, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

type TextInputBaseProps = Omit<BaseProps<HTMLInputElement>, 'onChange'>;

export interface TextInputProps
  extends TextInputBaseProps,
    Pick<
      InputHTMLAttributes<HTMLInputElement>,
      | 'autoComplete'
      | 'defaultValue'
      | 'disabled'
      | 'form'
      | 'list'
      | 'max'
      | 'maxLength'
      | 'min'
      | 'minLength'
      | 'multiple'
      | 'name'
      | 'onChange'
      | 'pattern'
      | 'placeholder'
      | 'readOnly'
      | 'required'
      | 'step'
      | 'type'
      | 'value'
    > {
  /** Visible field label linked via htmlFor. */
  label?: string;
  /** Supplementary helper guidance shown beneath the input well. */
  helperText?: string;
  /** Validation error text; highlights bezel and sets aria-invalid. */
  errorText?: string;
  /** Optional leading icon displayed inside the recessed optical well. */
  leadingIcon?: ReactNode;
  /** IME-safe callback triggered when Enter is pressed while not composing. */
  onEnter?: (value: string) => void;
}

function TextInputInner({
  label,
  helperText,
  errorText,
  leadingIcon,
  onEnter,
  type = 'text',
  className,
  style,
  xstyle,
  id,
  disabled = false,
  onKeyDown,
  'aria-describedby': ariaDescribedBy,
  ref,
  ...rest
}: TextInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const messageId = errorText || helperText ? `${inputId}-message` : undefined;
  const describedBy = cx(ariaDescribedBy, messageId) || undefined;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const override = useComponentOverride('TextInput');

  const merged = mergeProps({
    themeTarget: themeProps('text-input', { disabled, invalid: Boolean(errorText) }),
    baseClassName: 'w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div {...merged}>
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 ml-1"
        >
          {label}
        </label>
      ) : null}
      <div
        className={`prism-crystal rounded-full p-1 transition-[color,background-color,border-color,opacity,transform] ${
          errorText ? 'ring-2 ring-red-500/70' : 'focus-within:ring-2 focus-within:ring-sky-400/70'
        }`}
      >
        <div className="prism-well rounded-full h-11 px-4 flex items-center gap-2.5">
          {leadingIcon ? (
            <span className="text-slate-500 dark:text-slate-400 shrink-0">{leadingIcon}</span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            disabled={disabled}
            aria-invalid={Boolean(errorText)}
            aria-describedby={describedBy}
            onKeyDown={(e) => {
              onKeyDown?.(e);
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.defaultPrevented) {
                onEnter?.(e.currentTarget.value);
              }
            }}
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            {...rest}
          />
          {isPassword ? (
            <button
              type="button"
              disabled={disabled}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((s) => !s)}
              className="prism-focus-ring rounded-full text-slate-500 enabled:hover:text-slate-800 dark:enabled:hover:text-slate-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-1"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
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

export const TextInput = memo(TextInputInner);
TextInput.displayName = 'TextInput';
