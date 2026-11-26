'use client';

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { Sparkles, SendHorizontal } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ShimmerEventKind = 'idle' | 'focus' | 'submit' | 'autocomplete' | 'manual';

type ReactiveInputShimmerBaseProps = Omit<BaseProps<HTMLDivElement>, 'onSubmit'>;

export interface ReactiveInputShimmerProps extends ReactiveInputShimmerBaseProps {
  /** Controlled input value. */
  value?: string;
  /** Initial uncontrolled input value. */
  defaultValue?: string;
  /** Called when the text input value changes. */
  onValueChange?: (value: string) => void;
  /** Called on IME-safe Enter or submit trigger. */
  onSubmit?: (value: string) => void;
  /** Optional quick autocomplete suggestions that fire a sweep on acceptance. */
  suggestions?: ReadonlyArray<string>;
  /** Called when a user accepts a suggestion chip or Tab-completes. */
  onAcceptSuggestion?: (suggestion: string) => void;
  /** Increment to imperatively trigger a directional shimmer sweep. */
  shimmerTrigger?: number;
  /** Accessible label for the prompt input. */
  label?: string;
  /** Placeholder text inside the input. */
  placeholder?: string;
  /** Disables the field and shimmer sweeps. */
  disabled?: boolean;
}

const SHIMMER_FIELD_CLASS = /*#__PURE__*/ stableClassName('reactive-input-shimmer', 'field');
const SHIMMER_SWEEP_CLASS = /*#__PURE__*/ stableClassName('reactive-input-shimmer', 'sweep');
const SHIMMER_SUGGESTIONS_CLASS = /*#__PURE__*/ stableClassName(
  'reactive-input-shimmer',
  'suggestions'
);

const DEFAULT_SUGGESTIONS: ReadonlyArray<string> = /*#__PURE__*/ Object.freeze([
  'Analyze WebGL frame pacing',
  'Generate optical token diff',
  'Audit WCAG contrast',
]);

const SWEEP_DURATION_STYLE: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  '--prism-fx-duration': '0.85s',
} as CSSProperties);

function ReactiveInputShimmerInner({
  value,
  defaultValue = '',
  onValueChange,
  onSubmit,
  suggestions = DEFAULT_SUGGESTIONS,
  onAcceptSuggestion,
  shimmerTrigger = 0,
  label = 'Reactive shimmer prompt',
  placeholder = 'Ask Refractor AI or press Enter...',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ReactiveInputShimmerProps) {
  const override = useComponentOverride('ReactiveInputShimmer');
  const inputId = useId();
  const [text, setText] = useControllableState<string>({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [sweepKey, setSweepKey] = useState(0);
  const [lastTrigger, setLastTrigger] = useState<ShimmerEventKind>('idle');

  const triggerSweep = useCallback(
    (kind: ShimmerEventKind) => {
      if (disabled) return;
      setLastTrigger(kind);
      setSweepKey((k) => k + 1);
    },
    [disabled]
  );

  useEffect(() => {
    if (shimmerTrigger > 0 && !disabled) {
      setLastTrigger('manual');
      setSweepKey((k) => k + 1);
    }
  }, [disabled, shimmerTrigger]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setText(event.target.value);
    },
    [setText]
  );

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    triggerSweep('submit');
    onSubmit?.(text);
  }, [disabled, onSubmit, text, triggerSweep]);

  const handleAccept = useCallback(
    (suggestion: string) => {
      if (disabled) return;
      setText(suggestion);
      triggerSweep('autocomplete');
      onAcceptSuggestion?.(suggestion);
    },
    [disabled, onAcceptSuggestion, setText, triggerSweep]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const merged = mergeProps({
    themeTarget: themeProps('reactive-input-shimmer', {
      trigger: lastTrigger,
      disabled,
    }),
    baseClassName: 'prism-contain-leaf space-y-2 min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        className={`${SHIMMER_FIELD_CLASS} prism-well relative overflow-hidden rounded-2xl flex items-center gap-2 px-3.5 py-2.5 min-w-0`}
      >
        {sweepKey > 0 ? (
          <div
            key={sweepKey}
            aria-hidden="true"
            data-testid="reactive-input-shimmer-sweep"
            data-trigger={lastTrigger}
            className={`${SHIMMER_SWEEP_CLASS} prism-fx-shimmer-wave prism-fx-shimmer-once pointer-events-none absolute inset-y-0 left-0 w-1/2 z-0`}
            style={SWEEP_DURATION_STYLE}
          />
        ) : null}

        <Sparkles
          className="w-4 h-4 shrink-0 relative z-10"
          style={STYLE_TEXT_SECONDARY}
          aria-hidden="true"
        />

        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <input
          id={inputId}
          type="text"
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => triggerSweep('focus')}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="prism-focus-ring relative z-10 flex-1 min-w-0 bg-transparent text-sm rounded-lg px-1 py-0.5 disabled:cursor-not-allowed"
          style={STYLE_TEXT_PRIMARY}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={handleSubmit}
          aria-label="Submit prompt"
          className="prism-btn-primary prism-focus-ring relative z-10 inline-flex items-center justify-center h-8 px-3 rounded-xl text-xs font-semibold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <SendHorizontal className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
        </button>
      </div>

      {suggestions.length > 0 ? (
        <div
          className={`${SHIMMER_SUGGESTIONS_CLASS} flex flex-wrap items-center gap-1.5`}
          role="group"
          aria-label="Autocomplete suggestions"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => handleAccept(suggestion)}
              className="prism-crystal prism-focus-ring px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            >
              <span className="relative z-10">{suggestion}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const ReactiveInputShimmer = /*#__PURE__*/ memoWithDisplayName(
  ReactiveInputShimmerInner,
  'ReactiveInputShimmer'
);
