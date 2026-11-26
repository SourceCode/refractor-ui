'use client';

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type GradientSelectionMode = 'editable' | 'prose';
export type GradientSelectionPalette = 'spectrum' | 'aurora' | 'solar';

type GradientTextSelectionBaseProps = Omit<BaseProps<HTMLDivElement>, 'onSubmit'>;

export interface GradientTextSelectionProps extends GradientTextSelectionBaseProps {
  /** Renders either an interactive gradient-caret input or selectable optical prose. */
  mode?: GradientSelectionMode;
  /** Controlled text value in editable mode. */
  value?: string;
  /** Initial uncontrolled text value in editable mode. */
  defaultValue?: string;
  /** Fires whenever editable text changes. */
  onValueChange?: (value: string) => void;
  /** Fires on IME-safe Enter press in editable mode. */
  onSubmit?: (value: string) => void;
  /** Fires with the active selection `[start, end]` indices when selection updates. */
  onSelectionRangeChange?: (start: number, end: number) => void;
  /** Visual spectrum palette for the blinking caret and selection fill. */
  palette?: GradientSelectionPalette;
  /** Accessible label for the editable input or prose region. */
  label?: string;
  /** Input placeholder text in editable mode. */
  placeholder?: string;
  /** Disables interaction in editable mode. */
  disabled?: boolean;
  /** Prose content rendered in `mode="prose"`. */
  children?: ReactNode;
}

const SELECTION_INPUT_CLASS = /*#__PURE__*/ stableClassName('gradient-text-selection', 'input');
const SELECTION_OVERLAY_CLASS = /*#__PURE__*/ stableClassName('gradient-text-selection', 'overlay');
const SELECTION_CARET_CLASS = /*#__PURE__*/ stableClassName('gradient-text-selection', 'caret');
const SELECTION_BAND_CLASS = /*#__PURE__*/ stableClassName('gradient-text-selection', 'band');

const PALETTE_HIGHLIGHT_BG: Readonly<Record<GradientSelectionPalette, string>> =
  /*#__PURE__*/ Object.freeze({
    spectrum:
      'linear-gradient(90deg, rgba(var(--prism-secondary-rgb), 0.34), rgba(var(--prism-info-rgb), 0.32), rgba(var(--prism-primary-rgb), 0.34))',
    aurora:
      'linear-gradient(90deg, rgba(var(--prism-success-rgb), 0.34), rgba(var(--prism-secondary-rgb), 0.34), rgba(var(--prism-info-rgb), 0.32))',
    solar:
      'linear-gradient(90deg, rgba(var(--prism-primary-rgb), 0.36), rgba(var(--prism-warning-rgb), 0.34), rgba(var(--prism-error-rgb), 0.28))',
  });

const PALETTE_CARET_BG: Readonly<Record<GradientSelectionPalette, string>> =
  /*#__PURE__*/ Object.freeze({
    spectrum:
      'linear-gradient(180deg, var(--prism-secondary-main), var(--prism-info-main), var(--prism-primary-main))',
    aurora:
      'linear-gradient(180deg, var(--prism-success-main), var(--prism-secondary-main), var(--prism-info-main))',
    solar:
      'linear-gradient(180deg, var(--prism-primary-main), var(--prism-warning-main), var(--prism-error-main))',
  });

function GradientTextSelectionInner({
  mode = 'editable',
  value,
  defaultValue = 'Synthesize optical shaders with prismatic focus',
  onValueChange,
  onSubmit,
  onSelectionRangeChange,
  palette = 'spectrum',
  label = 'Gradient caret prompt input',
  placeholder = 'Type or highlight text...',
  disabled = false,
  children,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: GradientTextSelectionProps) {
  const override = useComponentOverride('GradientTextSelection');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useControllableState<string>({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [focused, setFocused] = useState(false);
  const [selStart, setSelStart] = useState(text.length);
  const [selEnd, setSelEnd] = useState(text.length);

  const syncSelection = useCallback(
    (target: HTMLInputElement) => {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? start;
      setSelStart(start);
      setSelEnd(end);
      onSelectionRangeChange?.(start, end);
    },
    [onSelectionRangeChange]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setText(event.target.value);
      syncSelection(event.target);
    },
    [setText, syncSelection]
  );

  const handleSelect = useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      syncSelection(event.currentTarget);
    },
    [syncSelection]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' && !disabled) {
        onSubmit?.(text);
      }
    },
    [disabled, onSubmit, text]
  );

  const clampedStart = Math.max(0, Math.min(selStart, text.length));
  const clampedEnd = Math.max(clampedStart, Math.min(selEnd, text.length));
  const prefix = text.slice(0, clampedStart);
  const selectedText = text.slice(clampedStart, clampedEnd);
  const suffix = text.slice(clampedEnd);

  const bandStyle: CSSProperties = {
    background: PALETTE_HIGHLIGHT_BG[palette],
  };

  const caretStyle: CSSProperties = {
    background: PALETTE_CARET_BG[palette],
  };

  const merged = mergeProps({
    themeTarget: themeProps('gradient-text-selection', { mode, palette, focused, disabled }),
    baseClassName:
      'prism-well prism-fx-gradient-selection prism-contain-leaf relative rounded-2xl p-3 min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  if (mode === 'prose') {
    return (
      <div ref={ref} role="region" aria-label={label} {...rest} {...merged}>
        <div className="text-sm leading-relaxed select-text" style={STYLE_TEXT_PRIMARY}>
          {children ?? (
            <p>
              Highlight any phrase to preview the{' '}
              <mark
                className={`${SELECTION_BAND_CLASS} rounded px-1 py-0.5 font-medium`}
                style={{ ...bandStyle, color: 'var(--prism-text-primary)' }}
              >
                prismatic spectrum selection
              </mark>{' '}
              with balanced optical contrast.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label htmlFor={inputId} className="text-[11px] font-semibold" style={STYLE_TEXT_SECONDARY}>
          {label}
        </label>
        <span className="text-[10px] font-mono tabular-nums" style={STYLE_TEXT_SECONDARY}>
          {selectedText.length > 0
            ? `Selected ${selectedText.length} chars`
            : `Pos ${clampedStart}/${text.length}`}
        </span>
      </div>

      <div className="relative min-w-0 overflow-hidden rounded-xl px-3 py-2 bg-white/70 dark:bg-slate-950/65">
        {/* Visual mirrored gradient caret & selection band layer */}
        <div
          aria-hidden="true"
          data-testid="gradient-text-selection-mirror"
          className={`${SELECTION_OVERLAY_CLASS} pointer-events-none whitespace-pre overflow-hidden text-sm font-mono leading-6 select-none`}
          style={STYLE_TEXT_PRIMARY}
        >
          <span>{prefix}</span>
          {selectedText.length > 0 ? (
            <span
              data-testid="gradient-text-selection-band"
              className={`${SELECTION_BAND_CLASS} rounded-sm`}
              style={bandStyle}
            >
              {selectedText}
            </span>
          ) : focused && !disabled ? (
            <span
              data-testid="gradient-text-selection-caret"
              className={`${SELECTION_CARET_CLASS} prism-fx-gradient-caret inline-block w-[2.5px] h-[1.15em] align-middle rounded-full -mx-[1px]`}
              style={caretStyle}
            />
          ) : null}
          <span>{suffix}</span>
          {text.length === 0 ? (
            <span className="opacity-50" style={STYLE_TEXT_SECONDARY}>
              {placeholder}
            </span>
          ) : null}
        </div>

        {/* Accessible native input overlay keeping caret-transparent so custom gradient caret shines cleanly */}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyUp={handleSelect}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            setFocused(true);
            syncSelection(e.currentTarget);
          }}
          onBlur={() => setFocused(false)}
          className={`${SELECTION_INPUT_CLASS} prism-focus-ring absolute inset-0 w-full h-full px-3 py-2 bg-transparent text-sm font-mono leading-6 text-transparent caret-transparent selection:bg-transparent selection:text-transparent rounded-xl disabled:cursor-not-allowed`}
        />
      </div>
    </div>
  );
}

export const GradientTextSelection = /*#__PURE__*/ memoWithDisplayName(
  GradientTextSelectionInner,
  'GradientTextSelection'
);
