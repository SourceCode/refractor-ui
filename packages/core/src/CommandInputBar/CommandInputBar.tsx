'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CornerDownLeft } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

type CommandInputBarBaseProps = Omit<BaseProps<HTMLDivElement>, 'onSubmit' | 'onChange'>;

export interface CommandInputBarProps extends CommandInputBarBaseProps {
  /** Controlled command input value. */
  value?: string;
  /** Initial command input value for uncontrolled mode. */
  defaultValue?: string;
  /** Callback invoked whenever the input value changes. */
  onChange?: (val: string) => void;
  /** Callback invoked with the trimmed command string on submission. */
  onSubmit?: (command: string) => void;
  /** Monospace prompt glyph rendered before the input (default '$'). */
  prompt?: string;
  /** Candidate command suggestions used for case-insensitive inline prefix ghost autocomplete. */
  suggestions?: string[];
  /** External chronological command history combined with internally submitted commands. */
  history?: string[];
  /** Placeholder text rendered when the command bar is empty (default 'Type a command...'). */
  placeholder?: string;
  /** Disables typing, keyboard shortcuts, and submission when true. */
  disabled?: boolean;
  /** Visible label for the primary submit button (default 'Run'). */
  submitLabel?: string;
}

function CommandInputBarInner({
  value,
  defaultValue = '',
  onChange,
  onSubmit,
  prompt = '$',
  suggestions,
  history,
  placeholder = 'Type a command...',
  disabled = false,
  submitLabel = 'Run',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CommandInputBarProps) {
  const override = useComponentOverride('CommandInputBar');
  const inputId = useId();
  const savedDraftRef = useRef<string>('');

  const [currentValue, setCurrentValue] = useControllableState<string>({
    value,
    defaultValue,
    onChange,
  });

  const [internalHistory, setInternalHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const combinedHistory = useMemo<string[]>(() => {
    const external = history ?? [];
    const mergedList: string[] = [];
    for (const item of external) {
      if (item.trim().length > 0) {
        mergedList.push(item);
      }
    }
    mergedList.push(...internalHistory);
    return mergedList;
  }, [history, internalHistory]);

  const matchedSuggestion = useMemo<string | null>(() => {
    if (disabled || !currentValue || !suggestions || suggestions.length === 0) {
      return null;
    }
    const lowerInput = currentValue.toLowerCase();
    for (const candidate of suggestions) {
      if (
        candidate.length > currentValue.length &&
        candidate.toLowerCase().startsWith(lowerInput)
      ) {
        return candidate;
      }
    }
    return null;
  }, [currentValue, disabled, suggestions]);

  const ghostSuffix = matchedSuggestion ? matchedSuggestion.slice(currentValue.length) : '';
  const trimmed = currentValue.trim();
  const canSubmit = !disabled && trimmed.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setInternalHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    savedDraftRef.current = '';
    onSubmit?.(trimmed);
    if (value === undefined) {
      setCurrentValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Tab' && !e.shiftKey && matchedSuggestion) {
      e.preventDefault();
      setCurrentValue(matchedSuggestion);
      setHistoryIndex(-1);
      return;
    }

    if (e.key === 'ArrowRight' && matchedSuggestion) {
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      if (start === currentValue.length && end === currentValue.length) {
        e.preventDefault();
        setCurrentValue(matchedSuggestion);
        setHistoryIndex(-1);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      if (combinedHistory.length === 0) return;
      e.preventDefault();
      if (historyIndex === -1) {
        savedDraftRef.current = currentValue;
        const nextIdx = combinedHistory.length - 1;
        setHistoryIndex(nextIdx);
        setCurrentValue(combinedHistory[nextIdx] as string);
      } else {
        const clamped = Math.min(historyIndex, combinedHistory.length - 1);
        const nextIdx = Math.max(0, clamped - 1);
        setHistoryIndex(nextIdx);
        setCurrentValue(combinedHistory[nextIdx] as string);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      if (historyIndex === -1) return;
      e.preventDefault();
      const clamped = Math.min(historyIndex, combinedHistory.length - 1);
      if (clamped < combinedHistory.length - 1) {
        const nextIdx = clamped + 1;
        setHistoryIndex(nextIdx);
        setCurrentValue(combinedHistory[nextIdx] as string);
      } else {
        setHistoryIndex(-1);
        setCurrentValue(savedDraftRef.current);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setHistoryIndex(-1);
      savedDraftRef.current = '';
      setCurrentValue('');
      return;
    }

    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSubmit();
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('command-input-bar', {
      disabled,
      hasSuggestion: Boolean(ghostSuffix),
      hasValue: trimmed.length > 0,
    }),
    baseClassName: 'prism-slab p-2.5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex items-center gap-2">
        <div className="prism-well flex-1 min-w-0 h-9 px-3 rounded-full flex items-center gap-2">
          <label
            htmlFor={inputId}
            data-testid="command-prompt"
            className="font-mono text-xs font-bold shrink-0 select-none"
            style={STYLE_PRIMARY_MAIN}
          >
            {prompt}
          </label>

          <div className="relative flex-1 min-w-0 h-full flex items-center">
            {ghostSuffix ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre font-mono text-xs"
              >
                <span className="invisible">{currentValue}</span>
                <span
                  data-testid="command-ghost-text"
                  style={STYLE_TEXT_DISABLED}
                >
                  {ghostSuffix}
                </span>
              </div>
            ) : null}

            <input
              id={inputId}
              type="text"
              aria-label="Command input"
              value={currentValue}
              disabled={disabled}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setCurrentValue(e.target.value);
                setHistoryIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              className="relative z-10 w-full min-w-0 bg-transparent font-mono text-xs focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            />
          </div>

          {ghostSuffix ? (
            <span
              aria-hidden="true"
              className="prism-crystal rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold shrink-0 select-none"
              style={STYLE_TEXT_SECONDARY}
            >
              Tab
            </span>
          ) : null}
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="prism-btn-primary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105"
        >
          <CornerDownLeft className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
          <span className="relative z-10">{submitLabel}</span>
        </button>
      </div>
    </div>
  );
}

export const CommandInputBar = /*#__PURE__*/ memoWithDisplayName(CommandInputBarInner, 'CommandInputBar');
