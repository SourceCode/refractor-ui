'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Check, ChevronDown, ChevronUp, Globe, Phone, Search, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface PhoneCountrySpec {
  /** ISO 3166-1 alpha-2 country code (e.g. 'US', 'GB', 'JP'). */
  iso: string;
  /** Human-readable country or region name. */
  name: string;
  /** International dialing prefix including leading '+' (e.g. '+1', '+44'). */
  dialCode: string;
  /** National formatting mask using '#' placeholders for digits (e.g. '(###) ###-####'). */
  mask: string;
  /** Maximum number of national digits allowed for this country. */
  maxDigits: number;
}

export interface PhoneInputValue {
  /** Selected ISO country code (e.g. 'US'). */
  countryIso: string;
  /** Selected international dialing code (e.g. '+1'). */
  dialCode: string;
  /** Digit-only national phone number capped to the active country's maxDigits. */
  nationalDigits: string;
  /** National phone number formatted according to the active country's mask. */
  formatted: string;
  /** Canonical E.164 phone number string (e.g. '+14155550199') or '' when empty. */
  e164: string;
}

export const DEFAULT_PHONE_COUNTRIES: PhoneCountrySpec[] = [
  { iso: 'US', name: 'United States', dialCode: '+1', mask: '(###) ###-####', maxDigits: 10 },
  { iso: 'CA', name: 'Canada', dialCode: '+1', mask: '(###) ###-####', maxDigits: 10 },
  { iso: 'GB', name: 'United Kingdom', dialCode: '+44', mask: '#### ######', maxDigits: 10 },
  { iso: 'DE', name: 'Germany', dialCode: '+49', mask: '### ########', maxDigits: 11 },
  { iso: 'FR', name: 'France', dialCode: '+33', mask: '# ## ## ## ##', maxDigits: 9 },
  { iso: 'JP', name: 'Japan', dialCode: '+81', mask: '##-####-####', maxDigits: 10 },
  { iso: 'AU', name: 'Australia', dialCode: '+61', mask: '### ### ###', maxDigits: 9 },
  { iso: 'IN', name: 'India', dialCode: '+91', mask: '##### #####', maxDigits: 10 },
  { iso: 'BR', name: 'Brazil', dialCode: '+55', mask: '(##) #####-####', maxDigits: 11 },
];

function stripDigits(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code >= 48 && code <= 57) {
      out += input.charAt(i);
    }
  }
  return out;
}

/**
 * Pure linear-time national phone formatter placing digits into `#` mask slots.
 * Never appends trailing dangling delimiters after the last entered digit.
 */
export function formatNationalPhone(digits: string, mask: string, maxDigits: number): string {
  const safeMax = Number.isFinite(maxDigits) && maxDigits > 0 ? Math.floor(maxDigits) : 0;
  if (safeMax === 0) {
    return '';
  }

  const clean = stripDigits(digits).slice(0, safeMax);
  if (clean.length === 0) {
    return '';
  }

  let out = '';
  let pendingLiterals = '';
  let digitIndex = 0;

  for (let i = 0; i < mask.length && digitIndex < clean.length; i += 1) {
    const ch = mask.charAt(i);
    if (ch === '#') {
      out += pendingLiterals + clean.charAt(digitIndex);
      pendingLiterals = '';
      digitIndex += 1;
    } else {
      pendingLiterals += ch;
    }
  }

  if (digitIndex < clean.length) {
    out += clean.slice(digitIndex);
  }

  return out;
}

function buildPhoneValue(country: PhoneCountrySpec, rawDigits: string): PhoneInputValue {
  const safeMax = Number.isFinite(country.maxDigits) && country.maxDigits > 0
    ? Math.floor(country.maxDigits)
    : 0;
  const nationalDigits = safeMax > 0 ? stripDigits(rawDigits).slice(0, safeMax) : '';
  const formatted = formatNationalPhone(nationalDigits, country.mask, safeMax);
  const dialDigits = stripDigits(country.dialCode);
  const e164 = nationalDigits.length > 0 && dialDigits.length > 0
    ? `+${dialDigits}${nationalDigits}`
    : '';

  return {
    countryIso: country.iso,
    dialCode: country.dialCode,
    nationalDigits,
    formatted,
    e164,
  };
}

function resolveCountry(
  countries: PhoneCountrySpec[],
  iso: string,
  fallbackDialCode?: string
): PhoneCountrySpec {
  const target = iso.trim().toUpperCase();
  const matched = countries.find((c) => c.iso.toUpperCase() === target);
  if (matched) {
    return matched;
  }
  const first = countries[0];
  if (first) {
    return first;
  }
  return {
    iso: target || 'US',
    name: 'International',
    dialCode: fallbackDialCode || '+1',
    mask: '###############',
    maxDigits: 15,
  };
}

function toSafeOptionId(listboxId: string, iso: string): string {
  return `${listboxId}-opt-${iso.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

type InternationalPhoneInputBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface InternationalPhoneInputProps extends InternationalPhoneInputBaseProps {
  /** Controlled structured phone input value. */
  value?: PhoneInputValue;
  /** Initial ISO country code in uncontrolled mode (defaults to 'US'). */
  defaultCountryIso?: string;
  /** Initial national phone digits in uncontrolled mode (defaults to ''). */
  defaultNationalDigits?: string;
  /** Callback fired whenever the selected country or national phone digits change. */
  onChange?: (next: PhoneInputValue) => void;
  /** Selectable regional country specifications (defaults to DEFAULT_PHONE_COUNTRIES). */
  countries?: PhoneCountrySpec[];
  /** Visible field label rendered above the split optical control (defaults to 'Phone Number'). */
  label?: string;
  /** Disables country switching and phone number input editing. */
  disabled?: boolean;
}

export function InternationalPhoneInput({
  value,
  defaultCountryIso = 'US',
  defaultNationalDigits = '',
  onChange,
  countries = DEFAULT_PHONE_COUNTRIES,
  label = 'Phone Number',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: InternationalPhoneInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const inputId = useId();
  const listboxId = useId();
  const override = useComponentOverride('InternationalPhoneInput');

  const isControlled = value !== undefined;
  const initialCountry = resolveCountry(countries, defaultCountryIso);

  const [internalCountryIso, setInternalCountryIso] = useState<string>(initialCountry.iso);
  const [internalDigits, setInternalDigits] = useState<string>(() =>
    stripDigits(defaultNationalDigits).slice(0, initialCountry.maxDigits)
  );
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const isOpen = open && !disabled;

  const activeCountry = useMemo<PhoneCountrySpec>(() => {
    const requestedIso = isControlled ? value.countryIso : internalCountryIso;
    return resolveCountry(countries, requestedIso, isControlled ? value.dialCode : undefined);
  }, [countries, internalCountryIso, isControlled, value]);

  const activeDigits = isControlled ? value.nationalDigits : internalDigits;

  const currentValue = useMemo<PhoneInputValue>(
    () => buildPhoneValue(activeCountry, activeDigits),
    [activeCountry, activeDigits]
  );

  const isComplete =
    activeCountry.maxDigits > 0 && currentValue.nationalDigits.length === activeCountry.maxDigits;

  const trimmedQuery = query.trim().toLowerCase();

  const filteredCountries = useMemo<PhoneCountrySpec[]>(() => {
    if (!trimmedQuery) {
      return countries;
    }
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(trimmedQuery) ||
        country.iso.toLowerCase().includes(trimmedQuery) ||
        country.dialCode.toLowerCase().includes(trimmedQuery)
    );
  }, [countries, trimmedQuery]);

  const safeActiveIndex =
    filteredCountries.length > 0
      ? Math.min(Math.max(activeIndex, 0), filteredCountries.length - 1)
      : -1;
  const activeOption = safeActiveIndex >= 0 ? filteredCountries[safeActiveIndex] : undefined;
  const activeOptionId = activeOption ? toSafeOptionId(listboxId, activeOption.iso) : undefined;

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      const root = containerRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [isOpen]);

  const handleToggleOpen = useCallback(() => {
    if (disabled) return;
    setOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        setQuery('');
        const matchedIndex = countries.findIndex((c) => c.iso === activeCountry.iso);
        setActiveIndex(matchedIndex >= 0 ? matchedIndex : 0);
      }
      return nextOpen;
    });
  }, [activeCountry.iso, countries, disabled]);

  const handleSelectCountry = useCallback(
    (country: PhoneCountrySpec) => {
      const nextValue = buildPhoneValue(country, currentValue.nationalDigits);
      if (!isControlled) {
        setInternalCountryIso(country.iso);
        setInternalDigits(nextValue.nationalDigits);
      }
      onChange?.(nextValue);
      setOpen(false);
      setQuery('');
      setActiveIndex(0);
      inputRef.current?.focus();
    },
    [currentValue.nationalDigits, isControlled, onChange]
  );

  const handleNationalChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const nextValue = buildPhoneValue(activeCountry, event.target.value);
    if (!isControlled) {
      setInternalDigits(nextValue.nationalDigits);
    }
    onChange?.(nextValue);
  };

  const handleClearDigits = () => {
    if (disabled) return;
    const nextValue = buildPhoneValue(activeCountry, '');
    if (!isControlled) {
      setInternalDigits('');
    }
    onChange?.(nextValue);
    inputRef.current?.focus();
  };

  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (filteredCountries.length > 0) {
          setActiveIndex((safeActiveIndex + 1) % filteredCountries.length);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (filteredCountries.length > 0) {
          setActiveIndex(
            (safeActiveIndex - 1 + filteredCountries.length) % filteredCountries.length
          );
        }
        return;
      }

      if (event.key === 'Enter' && activeOption) {
        event.preventDefault();
        handleSelectCountry(activeOption);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    },
    [activeOption, filteredCountries.length, handleSelectCountry, safeActiveIndex]
  );

  const placeholderText = activeCountry.mask.replace(/#/g, '0');

  const merged = mergeProps({
    themeTarget: themeProps('international-phone-input', {
      open: isOpen,
      disabled,
      country: currentValue.countryIso,
      filled: currentValue.nationalDigits.length > 0,
      complete: isComplete,
    }),
    baseClassName: 'prism-slab relative p-4 w-full max-w-md',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="inline-flex items-center gap-1.5 text-xs font-semibold min-w-0"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            <Phone
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--prism-primary-main)' }}
            />
            <span className="truncate">{label}</span>
          </label>
        ) : (
          <span className="sr-only">Phone Number</span>
        )}

        {currentValue.e164 ? (
          <span
            role="status"
            aria-live="polite"
            data-testid="phone-e164-pill"
            className={cx(
              isComplete ? 'prism-emerald' : 'prism-crystal',
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-semibold tracking-tight shrink-0'
            )}
            style={isComplete ? undefined : { color: 'var(--prism-text-primary)' }}
          >
            <Globe aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span>{currentValue.e164}</span>
          </span>
        ) : null}
      </div>

      <div className="flex items-stretch gap-2">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-label={`Select country, current ${activeCountry.name} (${activeCountry.iso}) ${activeCountry.dialCode}`}
          data-testid="phone-country-trigger"
          onClick={handleToggleOpen}
          className="prism-crystal prism-focus-ring h-11 px-3 rounded-xl inline-flex items-center gap-2 shrink-0 cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          <span
            data-testid="phone-country-iso"
            className="prism-well px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wider"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            {activeCountry.iso}
          </span>
          <span
            data-testid="phone-country-dial"
            className="text-xs font-mono tabular-nums font-semibold"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {activeCountry.dialCode}
          </span>
          <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
          </span>
        </button>

        <div className="prism-well rounded-xl h-11 px-3 flex items-center gap-2 flex-1 min-w-0">
          <input
            ref={inputRef}
            id={inputId}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            disabled={disabled}
            value={currentValue.formatted}
            placeholder={placeholderText}
            aria-label={!label ? 'Phone Number' : undefined}
            data-testid="phone-national-input"
            onChange={handleNationalChange}
            className="prism-focus-ring w-full bg-transparent font-mono text-sm tabular-nums rounded-lg px-1 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: 'var(--prism-text-primary)' }}
          />

          {currentValue.nationalDigits.length > 0 ? (
            <button
              type="button"
              disabled={disabled}
              aria-label="Clear phone number"
              data-testid="phone-clear-button"
              onClick={handleClearDigits}
              className="prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer enabled:hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            </button>
          ) : null}
        </div>
      </div>

      {isOpen ? (
        <div
          data-testid="phone-country-popover"
          className="prism-slab absolute left-0 right-0 mt-2 p-3 z-40 space-y-2.5"
        >
          <div className="prism-well rounded-xl px-3 py-2 flex items-center gap-2">
            <Search
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            />
            <input
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-activedescendant={activeOptionId}
              aria-autocomplete="list"
              aria-label="Search countries"
              data-testid="phone-country-search"
              value={query}
              placeholder="Search country, ISO, or dial code..."
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-transparent text-xs focus:outline-none"
              style={{ color: 'var(--prism-text-primary)' }}
            />
            {query.length > 0 ? (
              <button
                type="button"
                aria-label="Clear country search"
                data-testid="phone-country-search-clear"
                onClick={() => {
                  setQuery('');
                  setActiveIndex(0);
                }}
                className="prism-focus-ring w-5 h-5 rounded-full inline-flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              </button>
            ) : null}
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-label="Country dialing codes"
            className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5"
          >
            {filteredCountries.length === 0 ? (
              <div
                data-testid="phone-country-empty"
                className="prism-well rounded-xl px-3.5 py-5 text-center space-y-1"
              >
                <p
                  className="text-xs font-semibold"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  No matching countries
                </p>
                <p className="text-[11px]" style={{ color: 'var(--prism-text-secondary)' }}>
                  {query.trim()
                    ? `No regions matched "${query.trim()}".`
                    : 'No countries configured.'}
                </p>
              </div>
            ) : (
              filteredCountries.map((country, index) => {
                const isSelected = country.iso === activeCountry.iso;
                const isActive = index === safeActiveIndex;

                return (
                  <button
                    key={country.iso}
                    id={toSafeOptionId(listboxId, country.iso)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-active={isActive ? 'true' : undefined}
                    data-testid={`phone-country-option-${country.iso}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelectCountry(country)}
                    className={cx(
                      isSelected || isActive ? 'prism-crystal' : 'prism-well',
                      'prism-focus-ring w-full rounded-xl px-3 py-2 flex items-center justify-between gap-2.5 text-left cursor-pointer enabled:hover:brightness-105 transition-all'
                    )}
                    style={
                      isSelected
                        ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)' }
                        : isActive
                          ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-secondary-main)' }
                          : undefined
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className="prism-well px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider shrink-0"
                        style={{ color: 'var(--prism-primary-main)' }}
                      >
                        {country.iso}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs font-semibold truncate"
                          style={{ color: 'var(--prism-text-primary)' }}
                        >
                          {country.name}
                        </div>
                        <div
                          className="text-[10px] font-mono tabular-nums truncate"
                          style={{ color: 'var(--prism-text-secondary)' }}
                        >
                          {country.mask}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="prism-btn-secondary px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-semibold"
                      >
                        {country.dialCode}
                      </span>

                      {isSelected ? (
                        <span
                          aria-hidden="true"
                          className="prism-emerald w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0"
                        >
                          <Check className="w-3 h-3 stroke-[2.6]" aria-hidden="true" />
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

InternationalPhoneInput.displayName = 'InternationalPhoneInput';
