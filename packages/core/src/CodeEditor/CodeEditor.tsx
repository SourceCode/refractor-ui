'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type UIEvent,
} from 'react';
import { AlertCircle, AlertTriangle, Check, Code2, Copy } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export interface CodeLanguageMap {
  typescript: true;
  json: true;
  css: true;
}

export type CodeLanguage = keyof CodeLanguageMap;

export interface CodeDiagnostic {
  /** 1-based line number where the diagnostic applies. */
  line: number;
  /** Diagnostic severity level. */
  severity: 'error' | 'warning';
  /** Human-readable diagnostic message. */
  message: string;
}

type CodeEditorBaseProps = Omit<BaseProps<HTMLDivElement>, 'children' | 'onChange'>;

export interface CodeEditorProps extends CodeEditorBaseProps {
  /** Controlled source code string. */
  value?: string;
  /** Initial uncontrolled source code string. */
  defaultValue?: string;
  /** Callback fired whenever source code changes. */
  onChange?: (code: string) => void;
  /** Syntax highlighting language mode (default 'typescript'). */
  language?: CodeLanguage;
  /** Optional inline line diagnostics rendered in the gutter and live diagnostic panel. */
  diagnostics?: ReadonlyArray<CodeDiagnostic>;
  /** Locks code editing while keeping code copy and diagnostic navigation active. */
  readOnly?: boolean;
  /** Optional label rendered in the crystal IDE header and bound to the editor textarea. */
  label?: string;
  /** Spaces inserted for Tab and block auto-indentation (clamped 2..8, default 2). */
  tabSize?: number;
  /** Displays synchronized 1-based line numbers and diagnostic markers in the gutter (default true). */
  showLineNumbers?: boolean;
}

type CodeTokenType =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'property'
  | 'punctuation'
  | 'plain';

interface CodeToken {
  type: CodeTokenType;
  value: string;
  start: number;
}

interface LineDiagnosticSummary {
  severity: 'error' | 'warning';
  messages: string[];
}

interface ValidatedDiagnostic extends CodeDiagnostic {
  id: string;
}

const TS_KEYWORDS = new Set([
  'as',
  'async',
  'await',
  'boolean',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'interface',
  'keyof',
  'let',
  'new',
  'null',
  'number',
  'of',
  'readonly',
  'return',
  'string',
  'switch',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
]);

const JSON_KEYWORDS = new Set(['true', 'false', 'null']);

const CSS_KEYWORDS = new Set([
  'auto',
  'block',
  'blur',
  'calc',
  'fixed',
  'flex',
  'grid',
  'important',
  'inherit',
  'inline-flex',
  'linear-gradient',
  'none',
  'radial-gradient',
  'relative',
  'saturate',
  'solid',
  'transparent',
  'var',
]);

const PUNCTUATION_CHARS = new Set([
  '{',
  '}',
  '[',
  ']',
  '(',
  ')',
  '.',
  ',',
  ';',
  ':',
  '+',
  '-',
  '*',
  '/',
  '=',
  '<',
  '>',
  '!',
  '&',
  '|',
  '?',
  '~',
  '^',
]);

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function isHexDigit(code: number): boolean {
  return (
    isDigit(code) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)
  );
}

function isIdentStart(code: number): boolean {
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95 ||
    code === 36
  );
}

function isIdentPart(code: number): boolean {
  return isIdentStart(code) || isDigit(code);
}

function isCssIdentPart(code: number): boolean {
  return isIdentPart(code) || code === 45;
}

function peekNextNonSpaceChar(source: string, fromIndex: number): string {
  let pos = fromIndex;
  while (pos < source.length && (source[pos] === ' ' || source[pos] === '\t')) {
    pos += 1;
  }
  return source.charAt(pos);
}

function getTokenClassName(type: CodeTokenType): string {
  switch (type) {
    case 'keyword':
      return 'text-[var(--prism-primary-dark)] dark:text-[var(--prism-primary-light)] font-semibold';
    case 'string':
      return 'text-emerald-700 dark:text-emerald-300';
    case 'number':
      return 'text-amber-700 dark:text-amber-300';
    case 'comment':
      return 'text-slate-500 dark:text-slate-400 italic';
    case 'property':
      return 'text-sky-700 dark:text-sky-300';
    case 'punctuation':
      return 'text-slate-500 dark:text-slate-400';
    case 'plain':
      return 'text-slate-900 dark:text-slate-100';
  }
}

function getLanguageLabel(language: CodeLanguage): string {
  switch (language) {
    case 'json':
      return 'JSON';
    case 'css':
      return 'CSS';
    case 'typescript':
      return 'TypeScript';
  }
}

/**
 * Linear O(n) single-pass tokenizer producing per-line token arrays with zero regex backtracking.
 */
function tokenizeCode(source: string, language: CodeLanguage): CodeToken[][] {
  const normalized = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines: CodeToken[][] = [[]];
  let currentLine = lines[0] as CodeToken[];
  let lineCol = 0;
  let lastSignificantChar = '';

  const pushToken = (type: CodeTokenType, value: string) => {
    if (value.length === 0) return;
    currentLine.push({ type, value, start: lineCol });
    lineCol += value.length;
  };

  const nextLine = () => {
    const fresh: CodeToken[] = [];
    lines.push(fresh);
    currentLine = fresh;
    lineCol = 0;
  };

  let i = 0;
  const len = normalized.length;

  while (i < len) {
    const ch = normalized.charAt(i);
    const code = normalized.charCodeAt(i);

    if (ch === '\n') {
      nextLine();
      i += 1;
      continue;
    }

    if (ch === ' ' || ch === '\t') {
      const start = i;
      while (i < len && (normalized[i] === ' ' || normalized[i] === '\t')) {
        i += 1;
      }
      pushToken('plain', normalized.slice(start, i));
      continue;
    }

    // TypeScript single-line comment //
    if (language === 'typescript' && ch === '/' && normalized[i + 1] === '/') {
      const start = i;
      while (i < len && normalized[i] !== '\n') {
        i += 1;
      }
      pushToken('comment', normalized.slice(start, i));
      continue;
    }

    // Block comment /* ... */ (TypeScript & CSS)
    if (language !== 'json' && ch === '/' && normalized[i + 1] === '*') {
      let segStart = i;
      i += 2;
      while (i < len) {
        if (normalized[i] === '*' && normalized[i + 1] === '/') {
          i += 2;
          break;
        }
        if (normalized[i] === '\n') {
          pushToken('comment', normalized.slice(segStart, i));
          nextLine();
          i += 1;
          segStart = i;
          continue;
        }
        i += 1;
      }
      pushToken('comment', normalized.slice(segStart, i));
      continue;
    }

    // Strings: JSON uses ", CSS uses " or ', TypeScript uses ", ', or `
    const isStringStart =
      ch === '"' ||
      (language !== 'json' && ch === "'") ||
      (language === 'typescript' && ch === '`');
    if (isStringStart) {
      const quote = ch;
      let segStart = i;
      i += 1;
      while (i < len) {
        const cur = normalized[i];
        if (cur === '\\' && i + 1 < len && normalized[i + 1] !== '\n') {
          i += 2;
          continue;
        }
        if (cur === '\n') {
          pushToken('string', normalized.slice(segStart, i));
          nextLine();
          i += 1;
          segStart = i;
          if (quote !== '`') {
            break;
          }
          continue;
        }
        if (cur === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      const tokenText = normalized.slice(segStart, i);
      const isJsonKey =
        language === 'json' &&
        quote === '"' &&
        peekNextNonSpaceChar(normalized, i) === ':';
      pushToken(isJsonKey ? 'property' : 'string', tokenText);
      lastSignificantChar = quote;
      continue;
    }

    // CSS @at-rules
    if (language === 'css' && ch === '@') {
      const start = i;
      i += 1;
      while (i < len && isCssIdentPart(normalized.charCodeAt(i))) {
        i += 1;
      }
      pushToken('keyword', normalized.slice(start, i));
      lastSignificantChar = '@';
      continue;
    }

    // CSS hex values (#fff, #38bdf8)
    if (language === 'css' && ch === '#' && i + 1 < len && isHexDigit(normalized.charCodeAt(i + 1))) {
      const start = i;
      i += 1;
      while (i < len && isHexDigit(normalized.charCodeAt(i))) {
        i += 1;
      }
      pushToken('number', normalized.slice(start, i));
      lastSignificantChar = '#';
      continue;
    }

    // Numbers (including negative numbers in JSON and CSS units)
    const isNegativeJsonNum =
      language === 'json' && ch === '-' && i + 1 < len && isDigit(normalized.charCodeAt(i + 1));
    if (isDigit(code) || isNegativeJsonNum) {
      const start = i;
      if (isNegativeJsonNum) i += 1;
      if (
        language === 'typescript' &&
        normalized[i] === '0' &&
        (normalized[i + 1] === 'x' || normalized[i + 1] === 'X')
      ) {
        i += 2;
        while (i < len && isHexDigit(normalized.charCodeAt(i))) {
          i += 1;
        }
      } else {
        while (i < len && isDigit(normalized.charCodeAt(i))) {
          i += 1;
        }
        if (normalized[i] === '.' && i + 1 < len && isDigit(normalized.charCodeAt(i + 1))) {
          i += 1;
          while (i < len && isDigit(normalized.charCodeAt(i))) {
            i += 1;
          }
        }
        if (language === 'css') {
          if (normalized[i] === '%') {
            i += 1;
          } else {
            while (i < len && isIdentStart(normalized.charCodeAt(i))) {
              i += 1;
            }
          }
        }
      }
      pushToken('number', normalized.slice(start, i));
      lastSignificantChar = '0';
      continue;
    }

    // CSS custom properties (--prism-*) or identifiers
    if (
      language === 'css' &&
      (isIdentStart(code) || (ch === '-' && normalized[i + 1] === '-'))
    ) {
      const start = i;
      i += 1;
      while (i < len && isCssIdentPart(normalized.charCodeAt(i))) {
        i += 1;
      }
      const word = normalized.slice(start, i);
      const nextChar = peekNextNonSpaceChar(normalized, i);
      if (nextChar === ':') {
        pushToken('property', word);
      } else if (CSS_KEYWORDS.has(word.toLowerCase())) {
        pushToken('keyword', word);
      } else {
        pushToken('plain', word);
      }
      lastSignificantChar = word.charAt(word.length - 1);
      continue;
    }

    // TypeScript & JSON identifiers / keywords / properties
    if (isIdentStart(code)) {
      const start = i;
      i += 1;
      while (i < len && isIdentPart(normalized.charCodeAt(i))) {
        i += 1;
      }
      const word = normalized.slice(start, i);
      if (language === 'json') {
        pushToken(JSON_KEYWORDS.has(word) ? 'keyword' : 'plain', word);
      } else if (TS_KEYWORDS.has(word)) {
        pushToken('keyword', word);
      } else if (lastSignificantChar === '.' || peekNextNonSpaceChar(normalized, i) === ':') {
        pushToken('property', word);
      } else {
        pushToken('plain', word);
      }
      lastSignificantChar = word.charAt(word.length - 1);
      continue;
    }

    if (PUNCTUATION_CHARS.has(ch)) {
      pushToken('punctuation', ch);
      lastSignificantChar = ch;
      i += 1;
      continue;
    }

    pushToken('plain', ch);
    lastSignificantChar = ch;
    i += 1;
  }

  return lines;
}

function getLineAndColumn(code: string, offset: number): { line: number; column: number } {
  const safeOffset = Math.max(0, Math.min(code.length, offset));
  let line = 1;
  let column = 1;
  for (let i = 0; i < safeOffset; i += 1) {
    if (code[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function getLineStartOffset(code: string, targetLine: number): number {
  let offset = 0;
  let currentLine = 1;
  while (currentLine < targetLine && offset < code.length) {
    if (code.charAt(offset) === '\n') {
      currentLine += 1;
    }
    offset += 1;
  }
  return offset;
}

function CodeEditorInner({
  value,
  defaultValue = '',
  onChange,
  language = 'typescript',
  diagnostics,
  readOnly = false,
  label,
  tabSize = 2,
  showLineNumbers = true,
  className,
  style,
  xstyle,
  id,
  ref,
  ...rest
}: CodeEditorProps) {
  const generatedId = useId();
  const editorId = id ?? generatedId;
  const override = useComponentOverride('CodeEditor');

  const safeLanguage: CodeLanguage =
    language === 'json' || language === 'css' ? language : 'typescript';
  const safeTabSize = Math.round(clampNumber(tabSize, 2, 8, 2));

  const [code, setCode] = useControllableState<string>({
    value,
    defaultValue,
    onChange,
  });

  const [cursorPos, setCursorPos] = useState<{ line: number; column: number }>({
    line: 1,
    column: 1,
  });
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const nextPos = pendingCursorRef.current;
    const el = textareaRef.current;
    if (nextPos !== null && el) {
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
      pendingCursorRef.current = null;
    }
  }, [code]);

  const tokenizedLines = useMemo(() => tokenizeCode(code, safeLanguage), [code, safeLanguage]);
  const lineCount = tokenizedLines.length;

  const validDiagnostics = useMemo<ValidatedDiagnostic[]>(() => {
    if (!diagnostics || diagnostics.length === 0) return [];
    const list: ValidatedDiagnostic[] = [];
    let seq = 0;
    for (const item of diagnostics) {
      if (
        Number.isInteger(item.line) &&
        item.line >= 1 &&
        item.line <= lineCount &&
        (item.severity === 'error' || item.severity === 'warning')
      ) {
        seq += 1;
        list.push({
          ...item,
          id: `diag-${item.line}-${item.severity}-${seq}`,
        });
      }
    }
    return list;
  }, [diagnostics, lineCount]);

  const lineDiagnosticMap = useMemo(() => {
    const map = new Map<number, LineDiagnosticSummary>();
    for (const diag of validDiagnostics) {
      const existing = map.get(diag.line);
      if (existing) {
        existing.messages.push(diag.message);
        if (diag.severity === 'error') {
          existing.severity = 'error';
        }
      } else {
        map.set(diag.line, {
          severity: diag.severity,
          messages: [diag.message],
        });
      }
    }
    return map;
  }, [validDiagnostics]);

  const { errorCount, warningCount } = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    for (const diag of validDiagnostics) {
      if (diag.severity === 'error') {
        errors += 1;
      } else {
        warnings += 1;
      }
    }
    return { errorCount: errors, warningCount: warnings };
  }, [validDiagnostics]);

  const syncCursorFromTextarea = useCallback((el: HTMLTextAreaElement) => {
    if (pendingCursorRef.current !== null) return;
    const pos = getLineAndColumn(el.value, el.selectionStart);
    setCursorPos(pos);
  }, []);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      if (readOnly) return;
      const nextValue = event.target.value;
      setCode(nextValue);
      setCursorPos(getLineAndColumn(nextValue, event.target.selectionStart));
    },
    [readOnly, setCode]
  );

  const handleScroll = useCallback((event: UIEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = target.scrollTop;
      highlightRef.current.scrollLeft = target.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = target.scrollTop;
    }
  }, []);

  const jumpToLine = useCallback(
    (targetLine: number) => {
      const clampedLine = Math.round(clampNumber(targetLine, 1, lineCount, 1));
      const offset = getLineStartOffset(code, clampedLine);
      setCursorPos({ line: clampedLine, column: 1 });
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(offset, offset);
      }
    },
    [code, lineCount]
  );

  const handleCopyCode = useCallback(() => {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      return;
    }
    void clipboard.writeText(code).then(
      () => {
        setCopied(true);
        if (copyTimerRef.current !== null) {
          clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = setTimeout(() => {
          setCopied(false);
          copyTimerRef.current = null;
        }, 1800);
      },
      () => {
        setCopied(false);
      }
    );
  }, [code]);

  const merged = mergeProps({
    themeTarget: themeProps('code-editor', {
      language: safeLanguage,
      readOnly,
      tabSize: safeTabSize,
      lineNumbers: showLineNumbers,
      errors: errorCount > 0,
      warnings: warningCount > 0,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 flex flex-col gap-3 w-full overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('code-editor', 'header');
  const gutterClass = stableClassName('code-editor', 'gutter');
  const canvasClass = stableClassName('code-editor', 'canvas');

  const numberedLines = useMemo(
    () => tokenizedLines.map((tokens, idx) => ({ lineNumber: idx + 1, tokens })),
    [tokenizedLines]
  );

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        className={cx(
          headerClass,
          'prism-crystal rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5'
        )}
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <Code2
            aria-hidden="true"
            className="w-4 h-4 shrink-0 text-[var(--prism-secondary-dark)] dark:text-[var(--prism-secondary-main)]"
          />
          {label ? (
            <label
              htmlFor={editorId}
              className="text-xs font-semibold text-slate-900 dark:text-white tracking-tight truncate"
            >
              {label}
            </label>
          ) : (
            <span className="text-xs font-semibold text-slate-900 dark:text-white tracking-tight">
              Code Editor
            </span>
          )}

          <span
            data-code-language={safeLanguage}
            className="prism-well rounded-full px-2.5 py-0.5 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200"
          >
            {getLanguageLabel(safeLanguage)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            aria-label="Diagnostic summary"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums"
          >
            <span
              data-diagnostic-count="error"
              className={cx(
                'rounded-full px-2 py-0.5 font-semibold inline-flex items-center gap-1',
                errorCount > 0
                  ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30'
                  : 'prism-well text-slate-500 dark:text-slate-400'
              )}
            >
              <AlertCircle aria-hidden="true" className="w-3 h-3" />
              <span>{errorCount}</span>
            </span>
            <span
              data-diagnostic-count="warning"
              className={cx(
                'rounded-full px-2 py-0.5 font-semibold inline-flex items-center gap-1',
                warningCount > 0
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'prism-well text-slate-500 dark:text-slate-400'
              )}
            >
              <AlertTriangle aria-hidden="true" className="w-3 h-3" />
              <span>{warningCount}</span>
            </span>
          </div>

          <span
            data-cursor-position="true"
            className="prism-well rounded-full px-2.5 py-0.5 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300"
          >
            Ln {cursorPos.line}, Col {cursorPos.column}
          </span>

          <button
            type="button"
            aria-label="Copy code"
            onClick={handleCopyCode}
            className="prism-well prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors"
          >
            {copied ? (
              <>
                <Check aria-hidden="true" className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy aria-hidden="true" className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="prism-well rounded-2xl overflow-hidden flex min-h-[220px] max-h-[480px] font-mono text-xs leading-6">
        {showLineNumbers ? (
          <div
            ref={gutterRef}
            aria-label="Line numbers"
            className={cx(
              gutterClass,
              'select-none shrink-0 py-3 px-2 border-r border-[var(--prism-divider)] bg-slate-200/35 dark:bg-slate-900/45 overflow-hidden flex flex-col'
            )}
          >
            {numberedLines.map(({ lineNumber }) => {
              const diagInfo = lineDiagnosticMap.get(lineNumber);
              const isActive = cursorPos.line === lineNumber;

              return (
                <button
                  key={`gutter-${lineNumber}`}
                  type="button"
                  data-line={String(lineNumber)}
                  data-active-line={isActive ? 'true' : undefined}
                  aria-label={
                    diagInfo
                      ? `Line ${lineNumber} (${diagInfo.severity}): ${diagInfo.messages.join('; ')}`
                      : `Jump to line ${lineNumber}`
                  }
                  title={diagInfo ? diagInfo.messages.join(' • ') : `Line ${lineNumber}`}
                  onClick={() => jumpToLine(lineNumber)}
                  className={cx(
                    'prism-focus-ring h-6 px-1.5 rounded inline-flex items-center justify-end gap-1.5 text-[11px] tabular-nums cursor-pointer transition-colors',
                    isActive
                      ? 'text-slate-950 dark:text-white font-semibold bg-sky-500/15'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  {diagInfo ? (
                    <span
                      data-severity={diagInfo.severity}
                      className={cx(
                        'w-2 h-2 rounded-full shrink-0',
                        diagInfo.severity === 'error'
                          ? 'bg-red-600 dark:bg-red-400'
                          : 'bg-amber-500 dark:bg-amber-400'
                      )}
                    />
                  ) : (
                    <span aria-hidden="true" className="w-2 h-2 shrink-0" />
                  )}
                  <span>{lineNumber}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className={cx(canvasClass, 'relative flex-1 min-w-0 overflow-hidden')}>
          <pre
            ref={highlightRef}
            aria-hidden="true"
            data-code-canvas="true"
            className="m-0 py-3 px-3.5 h-full w-full overflow-hidden whitespace-pre pointer-events-none select-none font-mono text-xs leading-6"
          >
            {numberedLines.map(({ lineNumber, tokens }) => {
              const diagInfo = lineDiagnosticMap.get(lineNumber);
              const isActive = cursorPos.line === lineNumber;

              return (
                <div
                  key={`line-${lineNumber}`}
                  data-code-line={String(lineNumber)}
                  data-active-line={isActive ? 'true' : undefined}
                  data-line-severity={diagInfo?.severity}
                  className={cx(
                    'min-h-6 -mx-3.5 px-3.5',
                    diagInfo?.severity === 'error'
                      ? 'bg-red-500/12 dark:bg-red-500/18'
                      : diagInfo?.severity === 'warning'
                        ? 'bg-amber-500/12 dark:bg-amber-500/18'
                        : isActive
                          ? 'bg-sky-500/8 dark:bg-sky-400/10'
                          : undefined
                  )}
                >
                  {tokens.length === 0 ? (
                    <span data-token-type="plain"> </span>
                  ) : (
                    tokens.map((token) => (
                      <span
                        key={`tok-${lineNumber}-${token.start}`}
                        data-token-type={token.type}
                        className={getTokenClassName(token.type)}
                      >
                        {token.value}
                      </span>
                    ))
                  )}
                </div>
              );
            })}
          </pre>

          <textarea
            ref={textareaRef}
            id={editorId}
            aria-label={label ?? 'Code editor'}
            value={code}
            readOnly={readOnly}
            aria-readonly={readOnly || undefined}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            onChange={handleChange}
            onScroll={handleScroll}
            onClick={(e) => syncCursorFromTextarea(e.currentTarget)}
            onKeyUp={(e) => syncCursorFromTextarea(e.currentTarget)}
            onSelect={(e) => syncCursorFromTextarea(e.currentTarget)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || readOnly) return;

              const el = e.currentTarget;
              const start = el.selectionStart;
              const end = el.selectionEnd;

              if (e.key === 'Tab') {
                e.preventDefault();
                const indent = ' '.repeat(safeTabSize);
                const nextCode = `${code.slice(0, start)}${indent}${code.slice(end)}`;
                const nextOffset = start + indent.length;
                pendingCursorRef.current = nextOffset;
                setCode(nextCode);
                setCursorPos(getLineAndColumn(nextCode, nextOffset));
                return;
              }

              if (e.key === 'Enter') {
                e.preventDefault();
                const lineStart = start === 0 ? 0 : code.lastIndexOf('\n', start - 1) + 1;
                const lineBeforeCursor = code.slice(lineStart, start);
                let leadingIndent = '';
                for (let idx = 0; idx < lineBeforeCursor.length; idx += 1) {
                  const char = lineBeforeCursor[idx];
                  if (char === ' ' || char === '\t') {
                    leadingIndent += char;
                  } else {
                    break;
                  }
                }
                const extraIndent = lineBeforeCursor.trimEnd().endsWith('{')
                  ? ' '.repeat(safeTabSize)
                  : '';
                const insertion = `\n${leadingIndent}${extraIndent}`;
                const nextCode = `${code.slice(0, start)}${insertion}${code.slice(end)}`;
                const nextOffset = start + insertion.length;
                pendingCursorRef.current = nextOffset;
                setCode(nextCode);
                setCursorPos(getLineAndColumn(nextCode, nextOffset));
              }
            }}
            className={cx(
              'prism-focus-ring absolute inset-0 m-0 py-3 px-3.5 w-full h-full resize-none bg-transparent text-transparent caret-slate-900 dark:caret-slate-100 font-mono text-xs leading-6 whitespace-pre overflow-auto focus:outline-none disabled:cursor-not-allowed',
              readOnly && 'cursor-not-allowed'
            )}
          />
        </div>
      </div>

      {validDiagnostics.length > 0 ? (
        <div
          role="region"
          aria-label="Code diagnostics"
          className="prism-well rounded-2xl p-2.5 flex flex-col gap-1.5"
        >
          {validDiagnostics.map((diag) => (
            <button
              key={diag.id}
              type="button"
              data-severity={diag.severity}
              onClick={() => jumpToLine(diag.line)}
              className={cx(
                'prism-focus-ring w-full text-left rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs cursor-pointer transition-colors',
                diag.severity === 'error'
                  ? 'hover:bg-red-500/12 text-red-700 dark:text-red-300'
                  : 'hover:bg-amber-500/12 text-amber-700 dark:text-amber-300'
              )}
            >
              {diag.severity === 'error' ? (
                <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="font-mono tabular-nums font-semibold shrink-0">
                Ln {diag.line}
              </span>
              <span className="text-slate-800 dark:text-slate-100 truncate">{diag.message}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const CodeEditor = memo(CodeEditorInner);
CodeEditor.displayName = 'CodeEditor';
