'use client';

import { useId, useMemo, useRef, type ChangeEvent } from 'react';
import { CheckCircle2, CircleDashed, Hash, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type MaskPresetId = 'ipv4' | 'cidr' | 'mac' | 'license' | 'tax-id';

export const MASK_PRESETS: Readonly<Record<MaskPresetId, string>> = {
  ipv4: '###.###.###.###',
  cidr: '###.###.###.###/##',
  mac: 'HH:HH:HH:HH:HH:HH',
  license: '****-****-****-****',
  'tax-id': '##-#######',
};

export interface MaskedPatternMeta {
  /** Accepted slot characters stripped of literal mask delimiters. */
  unmasked: string;
  /** Whether every token slot in the active pattern has been filled. */
  complete: boolean;
}

type MaskedPatternInputBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface MaskedPatternInputProps extends MaskedPatternInputBaseProps {
  /** Custom mask pattern (`#` digit, `A` letter, `H` hex, `*` alphanumeric). Overrides `preset` when non-empty. */
  pattern?: string;
  /** Built-in mask preset used when `pattern` is omitted or empty (defaults to 'license'). */
  preset?: MaskPresetId;
  /** Controlled input value formatted through the active pattern mask. */
  value?: string;
  /** Initial value in uncontrolled mode (defaults to ''). */
  defaultValue?: string;
  /** Callback fired on every edit or clear with the formatted string and completion metadata. */
  onChange?: (masked: string, meta: MaskedPatternMeta) => void;
  /** Visible field label rendered in the slab header (defaults to 'Formatted Code'). */
  label?: string;
  /** Optional placeholder override (defaults to the active mask pattern). */
  placeholder?: string;
  /** Disables editing and clearing the masked input. */
  disabled?: boolean;
}

function isPatternToken(ch: string): boolean {
  return ch === '#' || ch === 'A' || ch === 'H' || ch === '*';
}

function matchTokenChar(token: string, ch: string): string | null {
  const code = ch.charCodeAt(0);
  const isDigit = code >= 48 && code <= 57;
  const isUpper = code >= 65 && code <= 90;
  const isLower = code >= 97 && code <= 122;

  if (token === '#') {
    return isDigit ? ch : null;
  }
  if (token === 'A') {
    return isUpper || isLower ? ch.toUpperCase() : null;
  }
  if (token === 'H') {
    const isHexLetter = (code >= 65 && code <= 70) || (code >= 97 && code <= 102);
    return isDigit || isHexLetter ? ch.toUpperCase() : null;
  }
  return isDigit || isUpper || isLower ? ch.toUpperCase() : null;
}

/**
 * Pure single-pass pattern mask formatter enforcing `#` (digit), `A` (uppercased letter),
 * `H` (uppercased hex), and `*` (uppercased alphanumeric), inserting literal delimiters
 * cleanly without emitting trailing orphan delimiters during typing or deletion.
 */
export function applyPatternMask(
  raw: string,
  pattern: string
): { masked: string; unmasked: string; complete: boolean } {
  if (!pattern) {
    return { masked: '', unmasked: '', complete: false };
  }

  let totalSlots = 0;
  for (let i = 0; i < pattern.length; i += 1) {
    if (isPatternToken(pattern.charAt(i))) {
      totalSlots += 1;
    }
  }

  if (totalSlots === 0) {
    return { masked: '', unmasked: '', complete: false };
  }

  let masked = '';
  let unmasked = '';
  let pendingLiterals = '';
  let pIdx = 0;
  let rIdx = 0;

  while (pIdx < pattern.length && rIdx < raw.length) {
    const pChar = pattern.charAt(pIdx);

    if (!isPatternToken(pChar)) {
      let litEnd = pIdx + 1;
      while (litEnd < pattern.length && !isPatternToken(pattern.charAt(litEnd))) {
        litEnd += 1;
      }
      const literalRun = pattern.slice(pIdx, litEnd);
      if (raw.startsWith(literalRun, rIdx)) {
        rIdx += literalRun.length;
      }
      pendingLiterals += literalRun;
      pIdx = litEnd;
      continue;
    }

    let matched: string | null = null;
    while (rIdx < raw.length) {
      const candidate = matchTokenChar(pChar, raw.charAt(rIdx));
      rIdx += 1;
      if (candidate !== null) {
        matched = candidate;
        break;
      }
    }

    if (matched !== null) {
      masked += pendingLiterals + matched;
      unmasked += matched;
      pendingLiterals = '';
      pIdx += 1;
    }
  }

  return {
    masked,
    unmasked,
    complete: unmasked.length === totalSlots,
  };
}

export function MaskedPatternInput({
  pattern,
  preset = 'license',
  value,
  defaultValue = '',
  onChange,
  label = 'Formatted Code',
  placeholder,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MaskedPatternInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const override = useComponentOverride('MaskedPatternInput');

  const hasCustomPattern = Boolean(pattern && pattern.trim().length > 0);
  const activePattern = hasCustomPattern && pattern ? pattern : MASK_PRESETS[preset];

  const [currentRaw, setCurrentRaw] = useControllableState<string>({
    value,
    defaultValue,
  });

  const parsed = useMemo(
    () => applyPatternMask(currentRaw, activePattern),
    [currentRaw, activePattern]
  );

  const resolvedPlaceholder = placeholder !== undefined ? placeholder : activePattern;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const next = applyPatternMask(event.target.value, activePattern);
    setCurrentRaw(next.masked);
    onChange?.(next.masked, { unmasked: next.unmasked, complete: next.complete });
  };

  const handleClear = () => {
    if (disabled) return;
    setCurrentRaw('');
    onChange?.('', { unmasked: '', complete: false });
    inputRef.current?.focus();
  };

  const merged = mergeProps({
    themeTarget: themeProps('masked-pattern-input', {
      preset: hasCustomPattern ? 'custom' : preset,
      complete: parsed.complete,
      disabled,
      filled: parsed.masked.length > 0,
    }),
    baseClassName: 'prism-slab p-4 w-full max-w-md',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        {label ? (
          <label
            htmlFor={inputId}
            className="inline-flex items-center gap-1.5 text-xs font-semibold min-w-0"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            <Hash
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--prism-primary-main)' }}
            />
            <span className="truncate">{label}</span>
          </label>
        ) : (
          <span className="sr-only">Formatted Code</span>
        )}

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span
            data-testid="masked-pattern-hint"
            className="prism-crystal inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-medium shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {activePattern}
          </span>

          <span
            role="status"
            aria-live="polite"
            data-testid="masked-pattern-status"
            data-complete={parsed.complete ? 'true' : 'false'}
            className={cx(
              parsed.complete ? 'prism-emerald' : 'prism-well',
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0'
            )}
            style={parsed.complete ? undefined : { color: 'var(--prism-text-secondary)' }}
          >
            {parsed.complete ? (
              <CheckCircle2 aria-hidden="true" className="w-3 h-3 shrink-0" />
            ) : (
              <CircleDashed aria-hidden="true" className="w-3 h-3 shrink-0" />
            )}
            <span>{parsed.complete ? 'Complete' : 'Incomplete'}</span>
          </span>
        </div>
      </div>

      <div className="prism-crystal rounded-2xl p-1 transition-all">
        <div className="prism-well rounded-xl h-11 px-3 flex items-center gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            value={parsed.masked}
            placeholder={resolvedPlaceholder}
            aria-label={!label ? 'Formatted Code' : undefined}
            data-testid="masked-pattern-input"
            onChange={handleInputChange}
            className="prism-focus-ring w-full bg-transparent font-mono text-sm tabular-nums tracking-wider rounded-lg px-1 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: 'var(--prism-text-primary)' }}
          />

          {parsed.masked.length > 0 ? (
            <button
              type="button"
              disabled={disabled}
              aria-label="Clear"
              data-testid="masked-pattern-clear"
              onClick={handleClear}
              className="prism-btn-secondary prism-focus-ring h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <X aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Clear</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

MaskedPatternInput.displayName = 'MaskedPatternInput';
