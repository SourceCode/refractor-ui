'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { CornerDownLeft, Terminal, Trash2 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type TerminalLineKind = 'stdout' | 'stderr' | 'command' | 'system';

export interface TerminalAnsiToken {
  text: string;
  tone?: 'default' | 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose' | 'muted';
  bold?: boolean;
}

export interface TerminalLine {
  id: string;
  text: string;
  kind?: TerminalLineKind;
  timestamp?: string;
}

export interface TerminalEmulatorProps extends BaseProps<HTMLDivElement> {
  /** Controlled terminal output lines. */
  lines?: TerminalLine[];
  /** Initial output lines when operating in uncontrolled mode. */
  defaultLines?: TerminalLine[];
  /** Callback fired whenever lines are appended or cleared. */
  onLinesChange?: (lines: TerminalLine[]) => void;
  /** Prompt prefix rendered before commands and inside the interactive bar (default 'refractor@prism:~$'). */
  prompt?: string;
  /** Window title rendered in the crystal terminal header (default 'Optical Shell'). */
  title?: string;
  /** Custom command executor returning a string, TerminalLine[], or void. */
  onExecute?: (command: string) => string | TerminalLine[] | void;
  /** Disables command input and hides the Clear action when true. */
  readOnly?: boolean;
  /** Maximum retained output lines, clamped between 10 and 5000 (default 500). */
  maxLines?: number;
  /** Placeholder text for the interactive command input. */
  placeholder?: string;
}

type AnsiTone = NonNullable<TerminalAnsiToken['tone']>;

const ESC_CHAR = '\u001b';
const BEL_CHAR = '\u0007';
const EMPTY_LINES: TerminalLine[] = [];

function applySgrParams(params: string, state: { tone: AnsiTone; bold: boolean }): void {
  if (params.length === 0) {
    state.tone = 'default';
    state.bold = false;
    return;
  }

  const parts = params.split(';');
  for (let i = 0; i < parts.length; i += 1) {
    const rawPart = parts[i] as string;
    const code = rawPart.length === 0 ? 0 : Number.parseInt(rawPart, 10);
    if (Number.isNaN(code)) continue;

    if (code === 0) {
      state.tone = 'default';
      state.bold = false;
    } else if (code === 1) {
      state.bold = true;
    } else if (code === 22) {
      state.bold = false;
    } else if (code === 39) {
      state.tone = 'default';
    } else if (code === 31 || code === 91) {
      state.tone = 'rose';
    } else if (code === 32 || code === 92) {
      state.tone = 'emerald';
    } else if (code === 33 || code === 93) {
      state.tone = 'amber';
    } else if (code === 34 || code === 36 || code === 94 || code === 96) {
      state.tone = 'secondary';
    } else if (code === 35 || code === 95) {
      state.tone = 'primary';
    } else if (code === 90) {
      state.tone = 'muted';
    } else if (code === 38 || code === 48) {
      const colorMode = Number.parseInt(parts[i + 1] ?? '', 10);
      if (colorMode === 5) {
        i += 2;
      } else if (colorMode === 2) {
        i += 4;
      }
    }
  }
}

/**
 * Linear-time ANSI SGR (\x1b[...m) parser using indexOf/slice scanning with zero regex backtracking.
 * Maps standard SGR codes to semantic Refractor tones and safely strips unknown CSI/OSC escape codes.
 */
export function parseAnsiLine(raw: string): TerminalAnsiToken[] {
  if (!raw) return [];

  const tokens: TerminalAnsiToken[] = [];
  const state: { tone: AnsiTone; bold: boolean } = { tone: 'default', bold: false };
  const len = raw.length;
  let cursor = 0;

  const pushText = (segment: string) => {
    const prev = tokens[tokens.length - 1];
    if (prev && prev.tone === state.tone && Boolean(prev.bold) === state.bold) {
      prev.text += segment;
      return;
    }
    tokens.push({
      text: segment,
      tone: state.tone,
      ...(state.bold ? { bold: true } : {}),
    });
  };

  while (cursor < len) {
    const escIdx = raw.indexOf(ESC_CHAR, cursor);
    if (escIdx === -1) {
      pushText(raw.slice(cursor));
      break;
    }

    if (escIdx > cursor) {
      pushText(raw.slice(cursor, escIdx));
    }

    const nextChar = raw.charAt(escIdx + 1);
    if (nextChar === '[') {
      let j = escIdx + 2;
      let handled = false;
      while (j < len) {
        const charCode = raw.charCodeAt(j);
        if (charCode >= 0x40 && charCode <= 0x7e) {
          if (raw.charAt(j) === 'm') {
            applySgrParams(raw.slice(escIdx + 2, j), state);
          }
          cursor = j + 1;
          handled = true;
          break;
        }
        if (charCode < 0x20 || charCode > 0x3f) {
          cursor = j;
          handled = true;
          break;
        }
        j += 1;
      }
      if (!handled) {
        cursor = len;
      }
    } else if (nextChar === ']') {
      const belIdx = raw.indexOf(BEL_CHAR, escIdx + 2);
      const stIdx = raw.indexOf(`${ESC_CHAR}\\`, escIdx + 2);
      if (belIdx !== -1 && (stIdx === -1 || belIdx < stIdx)) {
        cursor = belIdx + 1;
      } else if (stIdx !== -1) {
        cursor = stIdx + 2;
      } else {
        cursor = len;
      }
    } else {
      cursor = escIdx + 1;
    }
  }

  return tokens;
}

function resolveToneColor(tone: AnsiTone | undefined, kind: TerminalLineKind): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'secondary':
      return 'var(--prism-secondary-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'rose':
      return 'var(--prism-error-main)';
    case 'muted':
      return 'var(--prism-text-secondary)';
    default:
      if (kind === 'stderr') return 'var(--prism-error-main)';
      if (kind === 'command') return 'var(--prism-primary-main)';
      if (kind === 'system') return 'var(--prism-text-secondary)';
      return 'var(--prism-text-primary)';
  }
}

function renderAnsiTokens(
  lineId: string,
  tokens: ReadonlyArray<TerminalAnsiToken>,
  kind: TerminalLineKind
): ReactNode {
  if (tokens.length === 0) {
    return '\u00A0';
  }
  const elements: ReactNode[] = [];
  let offset = 0;
  for (const token of tokens) {
    const tokenKey = `${lineId}:${offset}`;
    offset += token.text.length + 1;
    elements.push(
      <span
        key={tokenKey}
        data-ansi-tone={token.tone}
        data-ansi-bold={token.bold ? 'true' : undefined}
        className={token.bold ? 'font-bold' : undefined}
        style={{ color: resolveToneColor(token.tone, kind) }}
      >
        {token.text}
      </span>
    );
  }
  return elements;
}

export function TerminalEmulator({
  lines,
  defaultLines = EMPTY_LINES,
  onLinesChange,
  prompt = 'refractor@prism:~$',
  title = 'Optical Shell',
  onExecute,
  readOnly = false,
  maxLines = 500,
  placeholder = 'Enter command (try help or clear)...',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TerminalEmulatorProps) {
  const override = useComponentOverride('TerminalEmulator');
  const idPrefix = useId();
  const inputId = useId();
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lineSeqRef = useRef<number>(0);
  const savedDraftRef = useRef<string>('');

  const safeMaxLines = Math.round(clampNumber(maxLines, 10, 5000, 500));

  const [currentLines, setCurrentLines] = useControllableState<TerminalLine[]>({
    value: lines,
    defaultValue: defaultLines,
    onChange: onLinesChange,
  });

  const [commandInput, setCommandInput] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const visibleLines =
    currentLines.length > safeMaxLines ? currentLines.slice(-safeMaxLines) : currentLines;

  useEffect(() => {
    const el = logRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [visibleLines.length]);

  const nextLineId = (prefix: string): string => {
    lineSeqRef.current += 1;
    return `${idPrefix}-${prefix}-${lineSeqRef.current}`;
  };

  const handleClear = () => {
    setCurrentLines([]);
  };

  const handleSubmit = () => {
    const cmd = commandInput.trim();
    if (!cmd) return;

    setHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    savedDraftRef.current = '';
    setCommandInput('');

    if (!onExecute && cmd === 'clear') {
      setCurrentLines([]);
      return;
    }

    const additions: TerminalLine[] = [
      {
        id: nextLineId('cmd'),
        text: `${prompt} ${cmd}`,
        kind: 'command',
      },
    ];

    if (onExecute) {
      const result = onExecute(cmd);
      if (typeof result === 'string') {
        if (result.length > 0) {
          for (const part of result.split(/\r?\n/)) {
            additions.push({
              id: nextLineId('out'),
              text: part,
              kind: 'stdout',
            });
          }
        }
      } else if (Array.isArray(result)) {
        for (const item of result) {
          additions.push(item.id ? item : { ...item, id: nextLineId('out') });
        }
      }
    } else if (cmd === 'help') {
      additions.push({
        id: nextLineId('sys'),
        text: '\u001b[1;36mBuilt-in commands:\u001b[0m \u001b[32mhelp\u001b[0m, \u001b[33mclear\u001b[0m (or Ctrl+L), ArrowUp/ArrowDown for history.',
        kind: 'system',
      });
    } else {
      additions.push({
        id: nextLineId('out'),
        text: `Executed: ${cmd}`,
        kind: 'stdout',
      });
    }

    const combined = [...currentLines, ...additions];
    const bounded = combined.length > safeMaxLines ? combined.slice(-safeMaxLines) : combined;
    setCurrentLines(bounded);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      handleClear();
      return;
    }

    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSubmit();
      return;
    }

    if (e.key === 'ArrowUp') {
      if (history.length === 0) return;
      e.preventDefault();
      if (historyIndex === -1) {
        savedDraftRef.current = commandInput;
        const nextIdx = history.length - 1;
        setHistoryIndex(nextIdx);
        setCommandInput(history[nextIdx] as string);
      } else if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCommandInput(history[nextIdx] as string);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      if (historyIndex === -1) return;
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setCommandInput(history[nextIdx] as string);
      } else {
        setHistoryIndex(-1);
        setCommandInput(savedDraftRef.current);
      }
    }
  };

  const canSubmit = !readOnly && commandInput.trim().length > 0;

  const merged = mergeProps({
    themeTarget: themeProps('terminal-emulator', {
      readOnly,
      empty: visibleLines.length === 0,
    }),
    baseClassName: 'prism-slab p-3.5 sm:p-4 flex flex-col gap-3 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="prism-crystal rounded-2xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal
            className="w-4 h-4 shrink-0"
            aria-hidden="true"
            style={{ color: 'var(--prism-secondary-main)' }}
          />
          <span
            className="text-xs font-semibold tracking-tight truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            data-testid="terminal-line-count"
            className="prism-well rounded-full px-2.5 py-0.5 text-[11px] font-mono tabular-nums"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {visibleLines.length} {visibleLines.length === 1 ? 'line' : 'lines'}
          </span>

          {!readOnly ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear terminal"
              className="prism-btn-secondary prism-focus-ring h-7 px-2.5 inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
            >
              <Trash2 className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>Clear</span>
            </button>
          ) : null}
        </div>
      </div>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label={`${title} output`}
        className="prism-well rounded-2xl p-3 font-mono text-xs leading-relaxed overflow-y-auto max-h-80 min-h-40 space-y-1"
      >
        {visibleLines.length === 0 ? (
          <p
            data-testid="terminal-empty-state"
            className="text-xs italic select-none"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {readOnly ? 'No output.' : 'No output yet. Type a command below or run help.'}
          </p>
        ) : (
          visibleLines.map((line) => {
            const lineKind: TerminalLineKind = line.kind ?? 'stdout';
            const tokens = parseAnsiLine(line.text);
            return (
              <div
                key={line.id}
                data-line-kind={lineKind}
                className="flex items-start gap-2 whitespace-pre-wrap break-words"
              >
                {line.timestamp ? (
                  <span
                    data-testid="terminal-line-timestamp"
                    className="shrink-0 tabular-nums select-none"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    [{line.timestamp}]
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">{renderAnsiTokens(line.id, tokens, lineKind)}</div>
              </div>
            );
          })
        )}
      </div>

      {!readOnly ? (
        <div className="flex items-center gap-2">
          <div className="prism-well flex-1 min-w-0 h-9 px-3 rounded-full flex items-center gap-2">
            <label
              htmlFor={inputId}
              className="font-mono text-xs font-semibold shrink-0 select-none"
              style={{ color: 'var(--prism-primary-main)' }}
            >
              {prompt}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              aria-label="Terminal command input"
              value={commandInput}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setCommandInput(e.target.value);
                setHistoryIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              className="w-full min-w-0 bg-transparent font-mono text-xs focus:outline-none"
              style={{ color: 'var(--prism-text-primary)' }}
            />
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            aria-label="Run command"
            onClick={handleSubmit}
            className="prism-btn-primary prism-focus-ring h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CornerDownLeft className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
            <span className="relative z-10">Run</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

TerminalEmulator.displayName = 'TerminalEmulator';
