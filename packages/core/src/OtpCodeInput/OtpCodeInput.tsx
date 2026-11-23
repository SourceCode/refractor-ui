'use client';

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import { X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_ERROR_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

type OtpCodeInputBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface OtpCodeInputProps extends OtpCodeInputBaseProps {
  /** Number of verification code cells (clamped to 4..8, defaults to 6). */
  length?: number;
  /** Controlled verification code string. */
  value?: string;
  /** Initial code string for uncontrolled mode. */
  defaultValue?: string;
  /** Callback invoked whenever the sanitized code string changes. */
  onChange?: (code: string) => void;
  /** Callback invoked when all `length` cells are populated. */
  onComplete?: (code: string) => void;
  /** Visible and accessible group label (defaults to 'Verification code'). */
  label?: string;
  /** Permits ASCII letters (A-Z, a-z) alongside digits (defaults to false). */
  alphanumeric?: boolean;
  /** Disables all code cells and suppresses clearing actions. */
  disabled?: boolean;
  /** Validation error message announced via role="alert". */
  error?: string;
  /** Masks entered cell characters by switching cell inputs to type="password". */
  masked?: boolean;
}

type ParsedCellInput =
  | { kind: 'clear' }
  | { kind: 'ignore' }
  | { kind: 'single'; char: string }
  | { kind: 'multi'; chars: string };

interface CellSlot {
  id: string;
  position: number;
}

function isValidOtpCharCode(code: number, alphanumeric: boolean): boolean {
  if (code >= 48 && code <= 57) return true;
  if (!alphanumeric) return false;
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function sanitizeOtpString(raw: string, alphanumeric: boolean, maxLength: number): string {
  let result = '';
  for (let i = 0; i < raw.length && result.length < maxLength; i += 1) {
    if (isValidOtpCharCode(raw.charCodeAt(i), alphanumeric)) {
      result += raw.charAt(i);
    }
  }
  return result;
}

function buildCells(code: string, length: number): string[] {
  const cells: string[] = [];
  for (let i = 0; i < length; i += 1) {
    cells.push(code.charAt(i));
  }
  return cells;
}

function parseCellInput(
  rawInputValue: string,
  currentCellValue: string,
  alphanumeric: boolean,
  maxLength: number
): ParsedCellInput {
  if (rawInputValue === '') {
    return { kind: 'clear' };
  }

  if (currentCellValue.length === 1 && rawInputValue.length === 2) {
    const first = rawInputValue.charAt(0);
    const second = rawInputValue.charAt(1);
    if (first === currentCellValue || second === currentCellValue) {
      const candidate = first === currentCellValue ? second : first;
      return isValidOtpCharCode(candidate.charCodeAt(0), alphanumeric)
        ? { kind: 'single', char: candidate }
        : { kind: 'ignore' };
    }
  }

  if (rawInputValue.length === 1) {
    return isValidOtpCharCode(rawInputValue.charCodeAt(0), alphanumeric)
      ? { kind: 'single', char: rawInputValue }
      : { kind: 'ignore' };
  }

  const sanitized = sanitizeOtpString(rawInputValue, alphanumeric, maxLength);
  if (!sanitized) {
    return { kind: 'ignore' };
  }
  if (sanitized.length === 1) {
    return { kind: 'single', char: sanitized };
  }
  return { kind: 'multi', chars: sanitized };
}

function OtpCodeInputInner({
  length = 6,
  value,
  defaultValue = '',
  onChange,
  onComplete,
  label = 'Verification code',
  alphanumeric = false,
  disabled = false,
  error,
  masked = false,
  className,
  style,
  xstyle,
  'aria-describedby': ariaDescribedBy,
  ref,
  ...rest
}: OtpCodeInputProps) {
  const override = useComponentOverride('OtpCodeInput');
  const groupId = useId();
  const labelId = `${groupId}-label`;
  const errorId = error ? `${groupId}-error` : undefined;
  const describedBy = cx(ariaDescribedBy, errorId) || undefined;

  const safeLength = Math.round(clampNumber(length, 4, 8, 6));
  const safeDefaultValue = sanitizeOtpString(defaultValue, alphanumeric, safeLength);

  const [rawCode, setRawCode] = useControllableState<string>({
    value,
    defaultValue: safeDefaultValue,
    onChange,
  });

  const normalizedCode = sanitizeOtpString(rawCode, alphanumeric, safeLength);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const slots = useMemo<readonly CellSlot[]>(
    () =>
      Array.from({ length: safeLength }, (_, position) => ({
        id: `${groupId}-slot-${position + 1}`,
        position,
      })),
    [groupId, safeLength]
  );

  const focusCell = useCallback(
    (targetIndex: number) => {
      const clampedIndex = Math.round(clampNumber(targetIndex, 0, safeLength - 1, 0));
      inputRefs.current[clampedIndex]?.focus();
    },
    [safeLength]
  );

  const commitCode = useCallback(
    (nextCode: string, notifyComplete: boolean) => {
      if (nextCode !== normalizedCode) {
        setRawCode(nextCode);
      }
      if (notifyComplete && nextCode.length === safeLength) {
        onComplete?.(nextCode);
      }
    },
    [normalizedCode, onComplete, safeLength, setRawCode]
  );

  const distributeChars = useCallback(
    (startIndex: number, chars: string) => {
      const clampedStart = Math.round(clampNumber(startIndex, 0, safeLength - 1, 0));
      const effectiveStart = Math.min(clampedStart, normalizedCode.length);
      const nextCells = buildCells(normalizedCode, safeLength);
      let lastFilledIndex = effectiveStart;

      for (
        let offset = 0;
        offset < chars.length && effectiveStart + offset < safeLength;
        offset += 1
      ) {
        nextCells[effectiveStart + offset] = chars.charAt(offset);
        lastFilledIndex = effectiveStart + offset;
      }

      const nextCode = nextCells.join('');
      commitCode(nextCode, true);
      focusCell(lastFilledIndex);
    },
    [commitCode, focusCell, normalizedCode, safeLength]
  );

  const handleCellChange = useCallback(
    (index: number, rawInputValue: string) => {
      if (disabled) return;
      const currentCellValue = normalizedCode.charAt(index);
      const parsed = parseCellInput(rawInputValue, currentCellValue, alphanumeric, safeLength);

      if (parsed.kind === 'ignore') {
        return;
      }

      if (parsed.kind === 'clear') {
        const nextCells = buildCells(normalizedCode, safeLength);
        nextCells[index] = '';
        commitCode(nextCells.join(''), false);
        return;
      }

      if (parsed.kind === 'multi') {
        distributeChars(index, parsed.chars);
        return;
      }

      const effectiveIndex = Math.min(index, normalizedCode.length);
      const nextCells = buildCells(normalizedCode, safeLength);
      nextCells[effectiveIndex] = parsed.char;
      const nextCode = nextCells.join('');
      commitCode(nextCode, true);

      if (effectiveIndex + 1 < safeLength) {
        focusCell(effectiveIndex + 1);
      }
    },
    [
      alphanumeric,
      commitCode,
      disabled,
      distributeChars,
      focusCell,
      normalizedCode,
      safeLength,
    ]
  );

  const handleCellKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled || e.nativeEvent.isComposing) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        const nextCells = buildCells(normalizedCode, safeLength);
        if (nextCells[index]) {
          nextCells[index] = '';
          commitCode(nextCells.join(''), false);
        } else if (index > 0) {
          nextCells[index - 1] = '';
          commitCode(nextCells.join(''), false);
          focusCell(index - 1);
        }
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        const nextCells = buildCells(normalizedCode, safeLength);
        if (nextCells[index]) {
          nextCells[index] = '';
          commitCode(nextCells.join(''), false);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (index > 0) {
          focusCell(index - 1);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (index + 1 < safeLength) {
          focusCell(index + 1);
        }
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        focusCell(0);
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        focusCell(safeLength - 1);
      }
    },
    [commitCode, disabled, focusCell, normalizedCode, safeLength]
  );

  const handlePaste = useCallback(
    (startIndex: number, e: ClipboardEvent<HTMLElement>) => {
      e.preventDefault();
      if (disabled) return;
      const pastedText = e.clipboardData ? e.clipboardData.getData('text') : '';
      const sanitized = sanitizeOtpString(pastedText, alphanumeric, safeLength);
      if (!sanitized) return;
      distributeChars(startIndex, sanitized);
    },
    [alphanumeric, disabled, distributeChars, safeLength]
  );

  const handleClear = useCallback(() => {
    setRawCode('');
    focusCell(0);
  }, [focusCell, setRawCode]);

  const isComplete = normalizedCode.length === safeLength;

  const merged = mergeProps({
    themeTarget: themeProps('otp-code-input', {
      disabled,
      invalid: Boolean(error),
      masked,
      alphanumeric,
      complete: isComplete,
    }),
    baseClassName: 'w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          id={labelId}
          className="text-xs font-semibold ml-1"
          style={STYLE_TEXT_PRIMARY}
        >
          {label}
        </span>

        {normalizedCode.length > 0 && !disabled ? (
          <button
            type="button"
            disabled={disabled}
            aria-label="Clear verification code"
            onClick={handleClear}
            className="prism-crystal prism-focus-ring inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_SECONDARY}
          >
            <X aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span>Clear</span>
          </button>
        ) : null}
      </div>

      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        onPaste={(e) => handlePaste(focusedIndex ?? 0, e)}
        className="prism-crystal inline-flex flex-wrap items-center gap-2 rounded-2xl p-2 transition-[color,background-color,border-color,opacity,transform]"
        style={
          error
            ? { boxShadow: '0 0 0 1.5px var(--prism-error-main)' }
            : undefined
        }
      >
        {slots.map((slot) => {
          const cellValue = normalizedCode.charAt(slot.position);
          const cellLabel = alphanumeric
            ? `Character ${slot.position + 1} of ${safeLength}`
            : `Digit ${slot.position + 1} of ${safeLength}`;

          return (
            <input
              key={slot.id}
              ref={(el) => {
                inputRefs.current[slot.position] = el;
              }}
              type={masked ? 'password' : 'text'}
              inputMode={alphanumeric ? 'text' : 'numeric'}
              autoComplete="one-time-code"
              aria-label={cellLabel}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy}
              disabled={disabled}
              value={cellValue}
              onFocus={(e) => {
                setFocusedIndex(slot.position);
                e.currentTarget.select();
              }}
              onChange={(e) => handleCellChange(slot.position, e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                handleCellKeyDown(slot.position, e);
              }}
              onPaste={(e) => {
                e.stopPropagation();
                handlePaste(slot.position, e);
              }}
              className="prism-well prism-focus-ring w-11 h-12 rounded-xl text-center font-mono text-lg font-semibold tabular-nums focus:outline-none transition-[color,background-color,border-color,opacity,transform] disabled:opacity-55 disabled:cursor-not-allowed enabled:hover:brightness-105"
              style={{
                color: 'var(--prism-text-primary)',
                ...(error ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-error-main)' } : {}),
              }}
            />
          );
        })}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 ml-1 text-xs font-medium"
          style={STYLE_ERROR_MAIN}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const OtpCodeInput = /*#__PURE__*/ memoWithDisplayName(OtpCodeInputInner, 'OtpCodeInput');
