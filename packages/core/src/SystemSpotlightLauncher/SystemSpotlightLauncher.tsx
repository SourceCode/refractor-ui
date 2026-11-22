'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  AppWindow,
  Calculator,
  Check,
  Copy,
  CornerDownLeft,
  FileText,
  Search,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type SpotlightResultKind = 'app' | 'file' | 'command' | 'calculation';

export interface SpotlightResultItem {
  /** Stable unique identifier for the launcher result item. */
  id: string;
  /** Primary display title (or formatted result value for calculations). */
  title: string;
  /** Secondary subtitle, path summary, or expression detail. */
  subtitle: string;
  /** Semantic result classification driving iconography, accent token, and action CTA. */
  kind: SpotlightResultKind;
  /** Optional trailing path snippet, file size, or keyboard shortcut badge. */
  pathOrShortcut?: string;
  /** Literal preview text rendered safely inside the right-hand preview pane. */
  previewBody: string;
  /** Optional structured key/value metadata pills displayed in the preview pane. */
  meta?: ReadonlyArray<{ label: string; value: string }>;
}

export interface SpotlightEvalResult {
  /** Trimmed input expression that produced this evaluation hit. */
  expression: string;
  /** Deterministically formatted numeric or unit-converted value. */
  formattedValue: string;
  /** Human-readable explanation of the evaluation or unit conversion. */
  detail: string;
}

type SystemSpotlightLauncherBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface SystemSpotlightLauncherProps extends SystemSpotlightLauncherBaseProps {
  /** Searchable catalog of applications, files, and system commands (defaults to curated studio catalog). */
  items?: ReadonlyArray<SpotlightResultItem>;
  /** Initial search query string (defaults to `''`). */
  defaultQuery?: string;
  /** Input placeholder copy displayed in the Spotlight search well. */
  placeholder?: string;
  /** Callback invoked when the active result is launched via Enter, action button, or double-click. */
  onLaunchResult?: (item: SpotlightResultItem) => void;
  /** Disables search input, quick query chips, keyboard navigation, and launch/copy actions. */
  disabled?: boolean;
}

interface UnitConversionSpec {
  targetUnit: string;
  detail: string;
  convert: (value: number) => number;
}

type MathToken =
  | { kind: 'number'; value: number }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'lparen' }
  | { kind: 'rparen' };

interface IndexedSpotlightRow {
  rowKey: string;
  item: SpotlightResultItem;
  isCalculation: boolean;
}

const MAX_EXPRESSION_LENGTH = 120;
const MAX_RECURSION_DEPTH = 32;
const COPY_FEEDBACK_DURATION_MS = 1800;
const CALCULATION_RESULT_ID = '__spotlight-calculation__';

const QUICK_EXAMPLE_QUERIES: ReadonlyArray<string> = [
  '(24 + 16) * 3',
  '100 km to mi',
  'Optical',
];

const UNIT_CONVERSION_RE =
  /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-zA-Z]+)\s+(?:to|in)\s+([a-zA-Z]+)$/i;

const UNIT_CONVERSION_MAP: ReadonlyMap<string, UnitConversionSpec> = new Map<
  string,
  UnitConversionSpec
>([
  [
    'px->rem',
    {
      targetUnit: 'rem',
      detail: 'Unit conversion · px to rem (16px root)',
      convert: (v) => v / 16,
    },
  ],
  [
    'rem->px',
    {
      targetUnit: 'px',
      detail: 'Unit conversion · rem to px (16px root)',
      convert: (v) => v * 16,
    },
  ],
  [
    'km->mi',
    {
      targetUnit: 'mi',
      detail: 'Unit conversion · kilometers to miles',
      convert: (v) => v * 0.621371,
    },
  ],
  [
    'mi->km',
    {
      targetUnit: 'km',
      detail: 'Unit conversion · miles to kilometers',
      convert: (v) => v * 1.609344,
    },
  ],
  [
    'kg->lb',
    {
      targetUnit: 'lb',
      detail: 'Unit conversion · kilograms to pounds',
      convert: (v) => v * 2.20462262185,
    },
  ],
  [
    'lb->kg',
    {
      targetUnit: 'kg',
      detail: 'Unit conversion · pounds to kilograms',
      convert: (v) => v * 0.45359237,
    },
  ],
  [
    'c->f',
    {
      targetUnit: '°F',
      detail: 'Temperature conversion · Celsius to Fahrenheit',
      convert: (v) => (v * 9) / 5 + 32,
    },
  ],
  [
    'f->c',
    {
      targetUnit: '°C',
      detail: 'Temperature conversion · Fahrenheit to Celsius',
      convert: (v) => ((v - 32) * 5) / 9,
    },
  ],
  [
    'gb->mb',
    {
      targetUnit: 'MB',
      detail: 'Data conversion · gigabytes to megabytes',
      convert: (v) => v * 1024,
    },
  ],
  [
    'mb->gb',
    {
      targetUnit: 'GB',
      detail: 'Data conversion · megabytes to gigabytes',
      convert: (v) => v / 1024,
    },
  ],
]);

const DEFAULT_SPOTLIGHT_ITEMS: ReadonlyArray<SpotlightResultItem> = [
  {
    id: 'app-optical-studio',
    title: 'Optical Studio',
    subtitle: 'Refractive glass shader & token workbench',
    kind: 'app',
    pathOrShortcut: '⌘1',
    previewBody:
      'Launch Optical Studio to calibrate caustic dispersion, specular blur depth, and live dual-mode theme cascades across Refractor surfaces.',
    meta: [
      { label: 'Category', value: 'Design Tool' },
      { label: 'Version', value: '2.4.0' },
      { label: 'Memory', value: '184 MB' },
    ],
  },
  {
    id: 'app-prism-terminal',
    title: 'Prism Terminal',
    subtitle: 'GPU-accelerated workspace shell multiplexer',
    kind: 'app',
    pathOrShortcut: '⌘T',
    previewBody:
      'Open an interactive workspace terminal with split optical panes, ANSI token palettes, and instant Vitest build runners.',
    meta: [
      { label: 'Shell', value: 'zsh 5.9' },
      { label: 'Status', value: 'Running' },
    ],
  },
  {
    id: 'file-optical-tokens',
    title: 'optical-tokens.css',
    subtitle: '~/refractor/packages/core/src/refractor.css',
    kind: 'file',
    pathOrShortcut: '18.4 KB',
    previewBody:
      ':root { --prism-blur-px: 18px; --prism-slab-blur-px: 22px; --prism-caustic-opacity: 1; --prism-radius-slab: 24px; }',
    meta: [
      { label: 'Format', value: 'CSS Cascade' },
      { label: 'Modified', value: 'Today, 14:22' },
    ],
  },
  {
    id: 'file-optical-adr',
    title: 'Optical Surface Architecture.md',
    subtitle: '~/refractor/docs/adr/ADR-0003.md',
    kind: 'file',
    pathOrShortcut: '6.2 KB',
    previewBody:
      'All Refractor UI surfaces derive light, dark, and caustic dispersion geometry exclusively from semantic --prism-* CSS custom properties.',
    meta: [
      { label: 'Document', value: 'ADR-0003' },
      { label: 'Status', value: 'Accepted' },
    ],
  },
  {
    id: 'cmd-toggle-color-mode',
    title: 'Toggle Optical Color Mode',
    subtitle: 'Switch between Alabaster Light and Obsidian Dark themes',
    kind: 'command',
    pathOrShortcut: '⇧⌘L',
    previewBody:
      'Flips document data-color-mode between light and dark without reloading the active workspace or losing transient focus state.',
    meta: [
      { label: 'Scope', value: 'Theme Engine' },
      { label: 'Latency', value: '< 4 ms' },
    ],
  },
  {
    id: 'cmd-rebuild-dispersion',
    title: 'Rebuild Optical Dispersion Cache',
    subtitle: 'Recompute backdrop blur and specular highlight layers',
    kind: 'command',
    pathOrShortcut: '⇧⌘R',
    previewBody:
      'Purges cached GPU backdrop-filter surfaces and regenerates crisp specular highlights across all mounted prism-slab containers.',
    meta: [
      { label: 'Scope', value: 'Renderer' },
      { label: 'Safety', value: 'Non-destructive' },
    ],
  },
];

function isDigitChar(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function formatSpotlightNumber(value: number, maxDecimals: number): string {
  if (value === 0) {
    return '0';
  }
  const abs = Math.abs(value);
  if (abs >= 1e15 || abs < 1e-6) {
    return String(value);
  }
  const rounded = Number(value.toFixed(maxDecimals));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function tryEvaluateUnitConversion(trimmed: string): SpotlightEvalResult | null {
  const match = UNIT_CONVERSION_RE.exec(trimmed);
  if (!match) {
    return null;
  }

  const rawNum = match[1] as string;
  const rawFrom = match[2] as string;
  const rawTo = match[3] as string;

  const key = `${rawFrom.toLowerCase()}->${rawTo.toLowerCase()}`;
  const spec = UNIT_CONVERSION_MAP.get(key);
  if (!spec) {
    return null;
  }

  const inputValue = Number(rawNum);
  if (!Number.isFinite(inputValue)) {
    return null;
  }

  const converted = spec.convert(inputValue);
  if (!Number.isFinite(converted)) {
    return null;
  }

  return {
    expression: trimmed,
    formattedValue: `${formatSpotlightNumber(converted, 2)} ${spec.targetUnit}`,
    detail: spec.detail,
  };
}

function tokenizeMathExpression(input: string): MathToken[] | null {
  const tokens: MathToken[] = [];
  let cursor = 0;
  let hasOperatorOrParen = false;

  while (cursor < input.length) {
    const ch = input.charAt(cursor);

    if (ch === ' ' || ch === '\t') {
      cursor += 1;
      continue;
    }

    if (isDigitChar(ch) || ch === '.') {
      const start = cursor;
      let seenDot = false;
      let digitCount = 0;

      while (cursor < input.length) {
        const cur = input.charAt(cursor);
        if (isDigitChar(cur)) {
          digitCount += 1;
          cursor += 1;
        } else if (cur === '.') {
          if (seenDot) {
            return null;
          }
          seenDot = true;
          cursor += 1;
        } else {
          break;
        }
      }

      if (digitCount === 0) {
        return null;
      }

      const expChar = input.charAt(cursor);
      if (expChar === 'e' || expChar === 'E') {
        cursor += 1;
        const signChar = input.charAt(cursor);
        if (signChar === '+' || signChar === '-') {
          cursor += 1;
        }
        let expDigits = 0;
        while (cursor < input.length && isDigitChar(input.charAt(cursor))) {
          expDigits += 1;
          cursor += 1;
        }
        if (expDigits === 0) {
          return null;
        }
      }

      const numericValue = Number(input.slice(start, cursor));
      if (!Number.isFinite(numericValue)) {
        return null;
      }
      tokens.push({ kind: 'number', value: numericValue });
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      hasOperatorOrParen = true;
      tokens.push({ kind: 'op', value: ch });
      cursor += 1;
      continue;
    }

    if (ch === '(') {
      hasOperatorOrParen = true;
      tokens.push({ kind: 'lparen' });
      cursor += 1;
      continue;
    }

    if (ch === ')') {
      hasOperatorOrParen = true;
      tokens.push({ kind: 'rparen' });
      cursor += 1;
      continue;
    }

    return null;
  }

  if (tokens.length === 0 || !hasOperatorOrParen) {
    return null;
  }

  return tokens;
}

function parseMathTokens(tokens: ReadonlyArray<MathToken>): number | null {
  let pos = 0;

  function parsePrimary(depth: number): number | null {
    const token = tokens[pos];
    if (!token) {
      return null;
    }

    if (token.kind === 'number') {
      pos += 1;
      return token.value;
    }

    if (token.kind === 'lparen') {
      pos += 1;
      const inner = parseExpr(depth + 1);
      if (inner === null) {
        return null;
      }
      const closing = tokens[pos];
      if (!closing || closing.kind !== 'rparen') {
        return null;
      }
      pos += 1;
      return inner;
    }

    return null;
  }

  function parseUnary(depth: number): number | null {
    if (depth > MAX_RECURSION_DEPTH) {
      return null;
    }

    const token = tokens[pos];
    if (token && token.kind === 'op' && (token.value === '+' || token.value === '-')) {
      pos += 1;
      const operand = parseUnary(depth + 1);
      if (operand === null) {
        return null;
      }
      return token.value === '-' ? -operand : operand;
    }

    return parsePrimary(depth);
  }

  function parseTerm(depth: number): number | null {
    let left = parseUnary(depth);
    if (left === null) {
      return null;
    }

    while (pos < tokens.length) {
      const token = tokens[pos];
      if (!token || token.kind !== 'op' || (token.value !== '*' && token.value !== '/')) {
        break;
      }
      pos += 1;
      const right = parseUnary(depth);
      if (right === null) {
        return null;
      }
      if (token.value === '/') {
        if (right === 0) {
          return null;
        }
        left /= right;
      } else {
        left *= right;
      }
      if (!Number.isFinite(left)) {
        return null;
      }
    }

    return left;
  }

  function parseExpr(depth: number): number | null {
    let left = parseTerm(depth);
    if (left === null) {
      return null;
    }

    while (pos < tokens.length) {
      const token = tokens[pos];
      if (!token || token.kind !== 'op' || (token.value !== '+' && token.value !== '-')) {
        break;
      }
      pos += 1;
      const right = parseTerm(depth);
      if (right === null) {
        return null;
      }
      left = token.value === '+' ? left + right : left - right;
      if (!Number.isFinite(left)) {
        return null;
      }
    }

    return left;
  }

  const value = parseExpr(0);
  if (value === null || pos !== tokens.length || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

/**
 * Pure, ZERO-`eval` inline arithmetic & deterministic unit conversion engine.
 * Bounds expression length (<= 120 chars) and recursive-descent depth (<= 32).
 */
export function evaluateSpotlightExpression(rawQuery: string): SpotlightEvalResult | null {
  const trimmed = rawQuery.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_EXPRESSION_LENGTH) {
    return null;
  }

  const unitResult = tryEvaluateUnitConversion(trimmed);
  if (unitResult !== null) {
    return unitResult;
  }

  const tokens = tokenizeMathExpression(trimmed);
  if (tokens === null) {
    return null;
  }

  const numericResult = parseMathTokens(tokens);
  if (numericResult === null) {
    return null;
  }

  return {
    expression: trimmed,
    formattedValue: formatSpotlightNumber(numericResult, 6),
    detail: 'Inline arithmetic expression',
  };
}

function getKindAccentVar(kind: SpotlightResultKind): string {
  switch (kind) {
    case 'calculation':
      return 'var(--prism-success-main)';
    case 'app':
      return 'var(--prism-primary-main)';
    case 'file':
      return 'var(--prism-info-main)';
    case 'command':
      return 'var(--prism-secondary-main)';
  }
}

function getKindLabel(kind: SpotlightResultKind): string {
  switch (kind) {
    case 'calculation':
      return 'Calculation';
    case 'app':
      return 'Application';
    case 'file':
      return 'File';
    case 'command':
      return 'Command';
  }
}

function renderKindIcon(kind: SpotlightResultKind, className: string) {
  switch (kind) {
    case 'calculation':
      return <Calculator aria-hidden="true" className={className} />;
    case 'app':
      return <AppWindow aria-hidden="true" className={className} />;
    case 'file':
      return <FileText aria-hidden="true" className={className} />;
    case 'command':
      return <Terminal aria-hidden="true" className={className} />;
  }
}

function itemMatchesQuery(item: SpotlightResultItem, lowerQuery: string): boolean {
  if (!lowerQuery) {
    return true;
  }
  if (
    item.title.toLowerCase().includes(lowerQuery) ||
    item.subtitle.toLowerCase().includes(lowerQuery) ||
    item.kind.toLowerCase().includes(lowerQuery) ||
    item.previewBody.toLowerCase().includes(lowerQuery) ||
    (item.pathOrShortcut ? item.pathOrShortcut.toLowerCase().includes(lowerQuery) : false)
  ) {
    return true;
  }
  if (item.meta) {
    for (const entry of item.meta) {
      if (
        entry.label.toLowerCase().includes(lowerQuery) ||
        entry.value.toLowerCase().includes(lowerQuery)
      ) {
        return true;
      }
    }
  }
  return false;
}

function fallbackExecCommandCopy(text: string): boolean {
  try {
    if (typeof document.execCommand !== 'function') {
      return false;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    try {
      textarea.select();
      return document.execCommand('copy');
    } finally {
      textarea.remove();
    }
  } catch {
    return false;
  }
}

function copyTextResiliently(text: string): void {
  try {
    const clipboard = navigator.clipboard;
    if (clipboard && typeof clipboard.writeText === 'function') {
      void Promise.resolve(clipboard.writeText(text)).catch(() => {
        fallbackExecCommandCopy(text);
      });
      return;
    }
  } catch {
    // Fall through to execCommand fallback when clipboard getter is restricted.
  }
  fallbackExecCommandCopy(text);
}

export function SystemSpotlightLauncher({
  items,
  defaultQuery = '',
  placeholder = 'Search apps, files, commands, or enter math (e.g. 100 km to mi)...',
  onLaunchResult,
  disabled = false,
  'aria-label': ariaLabelProp,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SystemSpotlightLauncherProps) {
  const instanceId = useId();
  const listboxId = `${instanceId}-listbox`;
  const override = useComponentOverride('SystemSpotlightLauncher');

  const inputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState<string>(defaultQuery);
  const [rawActiveIndex, setRawActiveIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [actionAnnouncement, setActionAnnouncement] = useState<string | null>(null);

  const clearCopyTimer = useCallback(() => {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCopyTimer();
    };
  }, [clearCopyTimer]);

  const sourceItems = items ?? DEFAULT_SPOTLIGHT_ITEMS;
  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();

  const evalResult = useMemo<SpotlightEvalResult | null>(
    () => evaluateSpotlightExpression(query),
    [query]
  );

  const indexedResults = useMemo<ReadonlyArray<IndexedSpotlightRow>>(() => {
    const out: IndexedSpotlightRow[] = [];
    const seenKeys = new Map<string, number>();

    if (evalResult !== null) {
      const calcItem: SpotlightResultItem = {
        id: CALCULATION_RESULT_ID,
        title: evalResult.formattedValue,
        subtitle: `${evalResult.expression} · ${evalResult.detail}`,
        kind: 'calculation',
        pathOrShortcut: 'Copy',
        previewBody: `${evalResult.expression} = ${evalResult.formattedValue}`,
        meta: [
          { label: 'Engine', value: 'Safe Math & Units' },
          { label: 'Expression', value: evalResult.expression },
          { label: 'Output', value: evalResult.formattedValue },
        ],
      };
      out.push({
        rowKey: `calc:${evalResult.expression}`,
        item: calcItem,
        isCalculation: true,
      });
    }

    for (const item of sourceItems) {
      if (!itemMatchesQuery(item, lowerQuery)) {
        continue;
      }
      const baseKey = `item:${item.id}`;
      const seen = seenKeys.get(baseKey) ?? 0;
      seenKeys.set(baseKey, seen + 1);
      const rowKey = seen === 0 ? baseKey : `${baseKey}#${seen + 1}`;
      out.push({
        rowKey,
        item,
        isCalculation: item.kind === 'calculation',
      });
    }

    return out;
  }, [evalResult, lowerQuery, sourceItems]);

  const isEmpty = indexedResults.length === 0;
  const activeIndex = isEmpty
    ? -1
    : Math.min(Math.max(rawActiveIndex, 0), indexedResults.length - 1);
  const activeEntry = activeIndex >= 0 ? indexedResults[activeIndex] : undefined;
  const activeOptionId =
    activeIndex >= 0 ? `${instanceId}-option-${activeIndex}` : undefined;

  const updateQuery = useCallback(
    (nextQuery: string, announcement: string | null = null) => {
      clearCopyTimer();
      setCopied(false);
      setQuery(nextQuery);
      setRawActiveIndex(0);
      setActionAnnouncement(announcement);
    },
    [clearCopyTimer]
  );

  const triggerLaunch = useCallback(
    (item: SpotlightResultItem) => {
      if (item.kind === 'calculation') {
        copyTextResiliently(item.title);
        setCopied(true);
        setActionAnnouncement(`Copied result ${item.title} to clipboard.`);
        clearCopyTimer();
        copyTimerRef.current = setTimeout(() => {
          setCopied(false);
          copyTimerRef.current = null;
        }, COPY_FEEDBACK_DURATION_MS);
      } else {
        const label = item.title.trim() || 'Untitled item';
        setActionAnnouncement(`Launched ${label}.`);
      }

      onLaunchResult?.(item);
    },
    [clearCopyTimer, onLaunchResult]
  );

  const handleSelectRow = useCallback(
    (index: number, item: SpotlightResultItem) => {
      clearCopyTimer();
      setCopied(false);
      setRawActiveIndex(index);
      const label = item.title.trim() || 'Untitled item';
      setActionAnnouncement(
        `Selected ${label} (${index + 1} of ${indexedResults.length}).`
      );
    },
    [clearCopyTimer, indexedResults.length]
  );

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }

      if (event.key === 'Escape') {
        if (query.length > 0) {
          event.preventDefault();
          updateQuery('', 'Cleared Spotlight search query.');
        }
        return;
      }

      if (indexedResults.length === 0) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = (activeIndex + 1) % indexedResults.length;
        handleSelectRow(nextIndex, (indexedResults[nextIndex] as IndexedSpotlightRow).item);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex = (activeIndex - 1 + indexedResults.length) % indexedResults.length;
        handleSelectRow(nextIndex, (indexedResults[nextIndex] as IndexedSpotlightRow).item);
      } else if (event.key === 'Home') {
        event.preventDefault();
        handleSelectRow(0, (indexedResults[0] as IndexedSpotlightRow).item);
      } else if (event.key === 'End') {
        event.preventDefault();
        const lastIndex = indexedResults.length - 1;
        handleSelectRow(lastIndex, (indexedResults[lastIndex] as IndexedSpotlightRow).item);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        triggerLaunch((activeEntry as IndexedSpotlightRow).item);
      }
    },
    [
      activeEntry,
      activeIndex,
      disabled,
      handleSelectRow,
      indexedResults,
      query.length,
      triggerLaunch,
      updateQuery,
    ]
  );

  const resolvedAriaLabel = ariaLabelProp?.trim() || 'System Spotlight Launcher';

  const merged = mergeProps({
    themeTarget: themeProps('system-spotlight-launcher', {
      disabled,
      empty: isEmpty,
      hasCalculation: evalResult !== null,
      count: indexedResults.length,
    }),
    baseClassName: cx(
      'prism-slab relative w-full max-w-3xl mx-auto min-w-0 p-3.5 sm:p-4 flex flex-col gap-3 overflow-hidden',
      disabled && 'opacity-65'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: { color: 'var(--prism-text-primary)' },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('system-spotlight-launcher', 'header');
  const searchWellClass = stableClassName('system-spotlight-launcher', 'search-well');
  const chipsClass = stableClassName('system-spotlight-launcher', 'chips');
  const bodyClass = stableClassName('system-spotlight-launcher', 'body');
  const listClass = stableClassName('system-spotlight-launcher', 'list');
  const optionClass = stableClassName('system-spotlight-launcher', 'option');
  const previewClass = stableClassName('system-spotlight-launcher', 'preview');
  const emptyClass = stableClassName('system-spotlight-launcher', 'empty');

  const derivedLiveText = useMemo<string>(() => {
    if (isEmpty) {
      return trimmedQuery
        ? `No matches for "${trimmedQuery}".`
        : 'No Spotlight items available.';
    }
    if (evalResult !== null) {
      return `Calculation result ${evalResult.formattedValue}. ${indexedResults.length} ${indexedResults.length === 1 ? 'result' : 'results'} available.`;
    }
    const activeTitle = activeEntry?.item.title.trim() || 'Untitled item';
    return `${indexedResults.length} ${indexedResults.length === 1 ? 'result' : 'results'} available. Selected ${activeTitle}.`;
  }, [activeEntry, evalResult, indexedResults.length, isEmpty, trimmedQuery]);

  const liveAnnouncement = actionAnnouncement ?? derivedLiveText;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={resolvedAriaLabel}
      aria-disabled={disabled ? 'true' : undefined}
      {...rest}
      {...merged}
    >
      {/* Search Bar Header */}
      <div className={cx(headerClass, 'flex flex-col gap-2.5 min-w-0')}>
        <div
          className={cx(
            searchWellClass,
            'prism-well rounded-2xl min-h-12 px-3.5 py-2 flex items-center gap-2.5 min-w-0'
          )}
        >
          <Search
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label="Spotlight search"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            value={query}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(event) => updateQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            className="w-full min-w-0 bg-transparent text-sm sm:text-base font-medium focus:outline-none disabled:cursor-not-allowed"
            style={{ color: 'var(--prism-text-primary)' }}
          />

          {query.length > 0 ? (
            <button
              type="button"
              disabled={disabled}
              aria-label="Clear search query"
              data-testid="spotlight-clear-btn"
              onClick={() => {
                updateQuery('', 'Cleared Spotlight search query.');
                inputRef.current?.focus();
              }}
              className="prism-crystal prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-opacity"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          ) : null}

          <kbd
            aria-hidden="true"
            className="prism-crystal hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-lg font-mono text-[10px] font-semibold shrink-0 select-none"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Quick Example Query Chips */}
        <div
          className={cx(
            chipsClass,
            'flex flex-wrap items-center justify-between gap-2 min-w-0'
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <Sparkles
                aria-hidden="true"
                className="w-3 h-3 shrink-0"
                style={{ color: 'var(--prism-primary-main)' }}
              />
              <span>Try</span>
            </span>
            {QUICK_EXAMPLE_QUERIES.map((example) => {
              const isSelectedChip = trimmedQuery === example;
              return (
                <button
                  key={example}
                  type="button"
                  disabled={disabled}
                  data-testid={`spotlight-chip-${example}`}
                  data-active={isSelectedChip ? 'true' : undefined}
                  onClick={() => {
                    updateQuery(example);
                    inputRef.current?.focus();
                  }}
                  className={cx(
                    'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center text-xs font-mono font-medium whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors',
                    isSelectedChip ? 'prism-btn-primary' : 'prism-crystal'
                  )}
                  style={
                    isSelectedChip
                      ? undefined
                      : { color: 'var(--prism-text-primary)' }
                  }
                >
                  {example}
                </button>
              );
            })}
          </div>

          <span
            data-testid="spotlight-result-count"
            className="text-[11px] font-mono tabular-nums shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {indexedResults.length}{' '}
            {indexedResults.length === 1 ? 'result' : 'results'}
          </span>
        </div>
      </div>

      {/* Split Two-Column Results & Preview Body */}
      <div
        className={cx(
          bodyClass,
          'grid grid-cols-1 md:grid-cols-[1.05fr_1fr] gap-3 min-w-0'
        )}
      >
        {/* Left Results Listbox Column */}
        <div
          className={cx(
            'flex flex-col gap-1.5 min-w-0',
            isEmpty && 'md:col-span-2'
          )}
        >
          <div
            id={listboxId}
            role="listbox"
            aria-label="Spotlight search results"
            aria-disabled={disabled ? 'true' : undefined}
            className={cx(
              listClass,
              'flex flex-col gap-1 min-w-0',
              isEmpty ? 'hidden' : 'max-h-80 overflow-y-auto pr-0.5'
            )}
          >
            {indexedResults.map((entry, idx) => {
              const { item, rowKey, isCalculation } = entry;
              const isActive = idx === activeIndex;
              const accentVar = getKindAccentVar(item.kind);
              const optionId = `${instanceId}-option-${idx}`;
              const displayTitle = item.title.trim() || 'Untitled item';
              const displaySubtitle = item.subtitle.trim();

              return (
                <button
                  key={rowKey}
                  id={optionId}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  aria-disabled={disabled ? 'true' : undefined}
                  disabled={disabled}
                  tabIndex={-1}
                  data-testid={`spotlight-option-${idx}`}
                  data-kind={item.kind}
                  data-active={isActive ? 'true' : undefined}
                  onClick={disabled ? undefined : () => handleSelectRow(idx, item)}
                  onDoubleClick={disabled ? undefined : () => triggerLaunch(item)}
                  className={cx(
                    optionClass,
                    'prism-focus-ring w-full min-w-0 rounded-2xl px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                    isActive ? 'prism-crystal' : 'prism-well'
                  )}
                  style={{
                    borderWidth: isActive ? '1.5px' : '1px',
                    borderStyle: 'solid',
                    borderColor: isActive ? accentVar : 'var(--prism-divider)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="prism-crystal w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
                    style={{
                      color: accentVar,
                      backgroundColor: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
                    }}
                  >
                    {renderKindIcon(item.kind, 'w-4 h-4')}
                  </span>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={cx(
                          'text-sm font-semibold truncate',
                          isCalculation && 'font-mono tabular-nums'
                        )}
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {displayTitle}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                        style={{
                          color: accentVar,
                          backgroundColor: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
                        }}
                      >
                        {getKindLabel(item.kind)}
                      </span>
                    </div>
                    {displaySubtitle ? (
                      <span
                        className="text-xs truncate mt-0.5"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {displaySubtitle}
                      </span>
                    ) : null}
                  </div>

                  {item.pathOrShortcut ? (
                    <kbd
                      className="prism-well px-2 py-0.5 rounded-lg font-mono text-[10px] font-semibold shrink-0 max-w-24 truncate"
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      {item.pathOrShortcut}
                    </kbd>
                  ) : null}
                </button>
              );
            })}
          </div>

          {isEmpty ? (
            <div
              role="status"
              data-testid="spotlight-empty-state"
              className={cx(
                emptyClass,
                'prism-well rounded-2xl px-4 py-8 text-center flex flex-col items-center justify-center gap-2 min-w-0'
              )}
            >
              <span
                aria-hidden="true"
                className="prism-crystal w-10 h-10 rounded-2xl inline-flex items-center justify-center"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                <Search className="w-5 h-5" />
              </span>
              <p
                className="text-sm font-semibold break-words max-w-full"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {trimmedQuery
                  ? `No matches for "${trimmedQuery}"`
                  : 'No Spotlight items available'}
              </p>
              <p
                className="text-xs max-w-md break-words"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Try searching for an app, file, or command, or enter an arithmetic
                expression or unit conversion such as &quot;24 px to rem&quot;.
              </p>
              {query.length > 0 ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    updateQuery('', 'Cleared Spotlight search query.');
                    inputRef.current?.focus();
                  }}
                  className="prism-crystal prism-focus-ring mt-1 h-8 px-3.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  Clear Search
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Right Preview Pane */}
        {activeEntry ? (
          <section
            aria-label="Result preview"
            data-testid="spotlight-preview-pane"
            data-preview-kind={activeEntry.item.kind}
            className={cx(
              previewClass,
              'prism-well rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-3.5 min-w-0'
            )}
          >
            <div className="flex flex-col gap-3 min-w-0">
              {/* Preview Header */}
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="prism-crystal w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0"
                    style={{
                      color: getKindAccentVar(activeEntry.item.kind),
                      backgroundColor: `color-mix(in srgb, ${getKindAccentVar(activeEntry.item.kind)} 14%, transparent)`,
                    }}
                  >
                    {renderKindIcon(activeEntry.item.kind, 'w-4 h-4')}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span
                      data-testid="spotlight-preview-kind"
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: getKindAccentVar(activeEntry.item.kind) }}
                    >
                      {getKindLabel(activeEntry.item.kind)}
                    </span>
                    <h3
                      data-testid="spotlight-preview-title"
                      className="text-sm sm:text-base font-bold leading-snug break-words"
                      style={{ color: 'var(--prism-text-primary)' }}
                    >
                      {activeEntry.item.title.trim() || 'Untitled item'}
                    </h3>
                  </div>
                </div>

                {activeEntry.item.pathOrShortcut ? (
                  <kbd
                    className="prism-crystal px-2 py-0.5 rounded-lg font-mono text-[10px] font-semibold shrink-0 max-w-28 truncate"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    {activeEntry.item.pathOrShortcut}
                  </kbd>
                ) : null}
              </div>

              {activeEntry.item.subtitle.trim() ? (
                <p
                  data-testid="spotlight-preview-subtitle"
                  className="text-xs break-words"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  {activeEntry.item.subtitle}
                </p>
              ) : null}

              {/* Calculation Large Tabular Readout OR Literal Preview Body */}
              {activeEntry.isCalculation ? (
                <div
                  className="prism-crystal rounded-2xl p-3.5 sm:p-4 flex flex-col gap-1.5 min-w-0"
                  style={{
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor:
                      'color-mix(in srgb, var(--prism-success-main) 38%, var(--prism-divider))',
                  }}
                >
                  <span
                    className="font-mono text-xs break-all"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    {evalResult?.expression ?? activeEntry.item.previewBody}
                  </span>
                  <div
                    data-testid="spotlight-calc-output"
                    className="font-mono text-2xl sm:text-3xl font-bold tabular-nums tracking-tight break-all"
                    style={{ color: 'var(--prism-success-main)' }}
                  >
                    {activeEntry.item.title}
                  </div>
                  <span
                    className="text-[11px] break-words"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    {evalResult?.detail ?? activeEntry.item.subtitle}
                  </span>
                </div>
              ) : (
                <div
                  data-testid="spotlight-preview-body"
                  className="prism-crystal rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap min-w-0"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {activeEntry.item.previewBody}
                </div>
              )}

              {/* Metadata Pills */}
              {activeEntry.item.meta && activeEntry.item.meta.length > 0 ? (
                <div
                  data-testid="spotlight-preview-meta"
                  className="flex flex-wrap gap-1.5 min-w-0"
                >
                  {activeEntry.item.meta.map((entry) => (
                    <span
                      key={`${entry.label}:${entry.value}`}
                      className="prism-crystal rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 text-[11px] min-w-0 max-w-full"
                    >
                      <span
                        className="font-medium shrink-0"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {entry.label}
                      </span>
                      <span
                        className="font-mono font-semibold truncate"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {entry.value}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Preview Action Footer */}
            <div
              className="pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 min-w-0"
              style={{ borderColor: 'var(--prism-divider)' }}
            >
              <span
                className="text-[11px] font-mono"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                ↑↓ Select · ↵ Run · Esc Clear
              </span>

              <button
                type="button"
                disabled={disabled}
                data-testid="spotlight-preview-action"
                data-copied={activeEntry.isCalculation && copied ? 'true' : undefined}
                onClick={disabled ? undefined : () => triggerLaunch(activeEntry.item)}
                className={cx(
                  'prism-focus-ring h-9 px-4 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-all',
                  activeEntry.isCalculation && copied
                    ? 'prism-emerald'
                    : 'prism-btn-primary'
                )}
              >
                {activeEntry.isCalculation ? (
                  copied ? (
                    <>
                      <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      <span>Copy Result</span>
                    </>
                  )
                ) : (
                  <>
                    <CornerDownLeft aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    <span>Open / Run</span>
                  </>
                )}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {/* Polite Screen-Reader Announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        data-testid="spotlight-live-region"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>
    </div>
  );
}

SystemSpotlightLauncher.displayName = 'SystemSpotlightLauncher';
