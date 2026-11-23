'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CaseSensitive,
  CheckCircle2,
  FileEdit,
  Hash,
  RotateCcw,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_SECONDARY_DARK, STYLE_SUCCESS_DARK, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type BatchRenameCaseMode = 'preserve' | 'lower' | 'upper' | 'title' | 'kebab' | 'snake';

export type BatchRenamePatternPreset =
  | 'none'
  | 'strip-spaces'
  | 'remove-brackets'
  | 'digits-only-prefix';

export interface BatchRenamePreviewRow {
  /** Deterministic row identifier derived from item position. */
  id: string;
  /** Original input filename. */
  before: string;
  /** Computed target filename after applying all active rename rules. */
  after: string;
  /** True when the computed target filename differs from `before`. */
  changed: boolean;
  /** True when two or more valid target rows resolve to the same filename. */
  conflict: boolean;
  /** True when the target filename is empty, wipes its base stem, or contains unsafe path/control characters. */
  invalid: boolean;
}

type BatchRenameUtilityBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface BatchRenameUtilityProps extends BatchRenameUtilityBaseProps {
  /** Optional visible heading linked via `aria-labelledby`. Defaults to `'Batch Rename Utility'`. */
  title?: string;
  /** Input filenames to transform and preview. Defaults to a realistic 5-file studio batch when omitted. */
  files?: ReadonlyArray<string>;
  /** Callback invoked with all computed preview rows when the user clicks `Apply Rename`. */
  onApplyRename?: (rows: ReadonlyArray<BatchRenamePreviewRow>) => void;
  /** Disables all rename inputs, checkboxes, selectors, and action buttons. */
  disabled?: boolean;
}

interface DraftPreviewRow {
  id: string;
  before: string;
  after: string;
  changed: boolean;
  invalid: boolean;
}

const DEFAULT_TITLE = 'Batch Rename Utility';

const DEFAULT_FILES: ReadonlyArray<string> = [
  '001 [RAW] Studio Hero Shot.png',
  '002 [FINAL] Product Launch Deck.pdf',
  '003 [DRAFT] Optical Glass Spec.md',
  '004 [RAW] Caustic Render Pass.exr',
  '005 [ARCHIVE] Release Notes v2.txt',
];

function parsePatternPreset(raw: string): BatchRenamePatternPreset {
  if (
    raw === 'strip-spaces' ||
    raw === 'remove-brackets' ||
    raw === 'digits-only-prefix'
  ) {
    return raw;
  }
  return 'none';
}

function parseCaseMode(raw: string): BatchRenameCaseMode {
  if (
    raw === 'lower' ||
    raw === 'upper' ||
    raw === 'title' ||
    raw === 'kebab' ||
    raw === 'snake'
  ) {
    return raw;
  }
  return 'preserve';
}

function sanitizeStartIndex(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  return Math.floor(clampNumber(parsed, 0, 999_999, 1));
}

function sanitizeZeroPad(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  return Math.floor(clampNumber(parsed, 1, 5, 2));
}

function splitFilename(filename: string): { stem: string; ext: string } {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return { stem: filename, ext: '' };
  }
  return {
    stem: filename.slice(0, lastDot),
    ext: filename.slice(lastDot),
  };
}

/**
 * Linear-time literal find & replace using `split`/`join` or `indexOf`.
 * Never constructs `RegExp` from user input, preventing ReDoS and metacharacter bugs.
 */
function replaceLiteral(
  source: string,
  find: string,
  replace: string,
  matchCase: boolean
): string {
  if (find.length === 0) {
    return source;
  }
  if (matchCase) {
    return source.split(find).join(replace);
  }
  const lowerSource = source.toLowerCase();
  const lowerFind = find.toLowerCase();
  const parts: string[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const idx = lowerSource.indexOf(lowerFind, cursor);
    if (idx === -1) {
      parts.push(source.slice(cursor));
      break;
    }
    parts.push(source.slice(cursor, idx), replace);
    cursor = idx + lowerFind.length;
  }

  return parts.join('');
}

function normalizeSpaces(input: string, separator: string): string {
  let result = '';
  let pendingSep = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charAt(i);
    if (ch === ' ' || ch === '\t') {
      if (result.length > 0) {
        pendingSep = true;
      }
    } else {
      if (pendingSep) {
        result += separator;
        pendingSep = false;
      }
      result += ch;
    }
  }

  return result;
}

function removeBracketTags(input: string): string {
  let stripped = '';
  let depth = 0;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charAt(i);
    if (ch === '[') {
      depth += 1;
    } else if (ch === ']' && depth > 0) {
      depth -= 1;
    } else if (depth === 0) {
      stripped += ch;
    }
  }

  return normalizeSpaces(stripped, ' ');
}

function extractLeadingDigits(input: string): string {
  const trimmed = input.trimStart();
  let end = 0;

  while (end < trimmed.length) {
    const code = trimmed.charCodeAt(end);
    if (code >= 48 && code <= 57) {
      end += 1;
    } else {
      break;
    }
  }

  return end > 0 ? trimmed.slice(0, end) : input;
}

function applyPatternPreset(input: string, preset: BatchRenamePatternPreset): string {
  if (preset === 'strip-spaces') {
    return normalizeSpaces(input, '-');
  }
  if (preset === 'remove-brackets') {
    return removeBracketTags(input);
  }
  if (preset === 'digits-only-prefix') {
    return extractLeadingDigits(input);
  }
  return input;
}

function isAsciiUpper(code: number): boolean {
  return code >= 65 && code <= 90;
}

function isAsciiLower(code: number): boolean {
  return code >= 97 && code <= 122;
}

function isAsciiDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function isAsciiAlphaNum(code: number): boolean {
  return isAsciiUpper(code) || isAsciiLower(code) || isAsciiDigit(code);
}

function toTitleCase(input: string): string {
  let result = '';
  let atWordStart = true;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charAt(i);
    const code = input.charCodeAt(i);
    if (isAsciiAlphaNum(code)) {
      result += atWordStart ? ch.toUpperCase() : ch.toLowerCase();
      atWordStart = false;
    } else {
      result += ch;
      atWordStart = true;
    }
  }

  return result;
}

function tokenizeWords(input: string): string[] {
  const words: string[] = [];
  let current = '';

  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charAt(i);
    const code = input.charCodeAt(i);
    if (!isAsciiAlphaNum(code)) {
      if (current.length > 0) {
        words.push(current.toLowerCase());
        current = '';
      }
      continue;
    }

    if (current.length > 0 && isAsciiUpper(code)) {
      const prevCode = input.charCodeAt(i - 1);
      const nextCode = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
      if (
        isAsciiLower(prevCode) ||
        isAsciiDigit(prevCode) ||
        (isAsciiUpper(prevCode) && isAsciiLower(nextCode))
      ) {
        words.push(current.toLowerCase());
        current = ch;
        continue;
      }
    }

    current += ch;
  }

  if (current.length > 0) {
    words.push(current.toLowerCase());
  }

  return words;
}

function applyCaseMode(input: string, mode: BatchRenameCaseMode): string {
  if (mode === 'lower') {
    return input.toLowerCase();
  }
  if (mode === 'upper') {
    return input.toUpperCase();
  }
  if (mode === 'title') {
    return toTitleCase(input);
  }
  if (mode === 'kebab') {
    return tokenizeWords(input).join('-');
  }
  if (mode === 'snake') {
    return tokenizeWords(input).join('_');
  }
  return input;
}

function isInvalidFilename(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed === '.' || trimmed === '..') {
    return true;
  }
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    return true;
  }
  for (let i = 0; i < name.length; i += 1) {
    const code = name.charCodeAt(i);
    if (code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

function BatchRenameUtilityInner({
  title = DEFAULT_TITLE,
  files,
  onApplyRename,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: BatchRenameUtilityProps) {
  const override = useComponentOverride('BatchRenameUtility');
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const findInputId = `${baseId}-find`;
  const replaceInputId = `${baseId}-replace`;
  const matchCaseId = `${baseId}-match-case`;
  const presetSelectId = `${baseId}-preset`;
  const caseSelectId = `${baseId}-case-mode`;
  const enableNumberingId = `${baseId}-enable-numbering`;
  const preserveExtId = `${baseId}-preserve-ext`;
  const prefixInputId = `${baseId}-prefix`;
  const suffixInputId = `${baseId}-suffix`;
  const startIndexInputId = `${baseId}-start-index`;
  const zeroPadInputId = `${baseId}-zero-pad`;

  const sourceFiles = files ?? DEFAULT_FILES;
  const safeTitle = title.trim() || DEFAULT_TITLE;

  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [patternPreset, setPatternPreset] = useState<BatchRenamePatternPreset>('none');
  const [caseMode, setCaseMode] = useState<BatchRenameCaseMode>('preserve');
  const [enableNumbering, setEnableNumbering] = useState<boolean>(false);
  const [prefix, setPrefix] = useState<string>('');
  const [suffix, setSuffix] = useState<string>('');
  const [startIndexRaw, setStartIndexRaw] = useState<string>('1');
  const [zeroPadRaw, setZeroPadRaw] = useState<string>('2');
  const [preserveExtension, setPreserveExtension] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const safeStartIndex = useMemo(() => sanitizeStartIndex(startIndexRaw), [startIndexRaw]);
  const safeZeroPad = useMemo(() => sanitizeZeroPad(zeroPadRaw), [zeroPadRaw]);

  const previewRows = useMemo<ReadonlyArray<BatchRenamePreviewRow>>(() => {
    const drafts: DraftPreviewRow[] = sourceFiles.map((before, index) => {
      const { stem, ext } = preserveExtension
        ? splitFilename(before)
        : { stem: before, ext: '' };

      const afterFindReplace = replaceLiteral(stem, findText, replaceText, matchCase);
      const afterPreset = applyPatternPreset(afterFindReplace, patternPreset);
      const afterCase = applyCaseMode(afterPreset, caseMode);

      let composedStem: string;
      if (enableNumbering) {
        const paddedIndex = String(safeStartIndex + index).padStart(safeZeroPad, '0');
        const body = afterCase.length > 0 ? `${afterCase}-${paddedIndex}` : paddedIndex;
        composedStem = `${prefix}${body}${suffix}`;
      } else {
        composedStem = `${prefix}${afterCase}${suffix}`;
      }

      const after = preserveExtension ? `${composedStem}${ext}` : composedStem;
      const stemEmptied = preserveExtension && ext.length > 0 && composedStem.trim().length === 0;
      const invalid = isInvalidFilename(after) || stemEmptied;

      return {
        id: `rename-row-${index}`,
        before,
        after,
        changed: after !== before,
        invalid,
      };
    });

    // Prototype-pollution-safe duplicate detection via ES Map
    const targetCounts = new Map<string, number>();
    for (const draft of drafts) {
      if (!draft.invalid) {
        targetCounts.set(draft.after, (targetCounts.get(draft.after) ?? 0) + 1);
      }
    }

    return drafts.map((draft) => ({
      id: draft.id,
      before: draft.before,
      after: draft.after,
      changed: draft.changed,
      conflict: !draft.invalid && targetCounts.get(draft.after)! > 1,
      invalid: draft.invalid,
    }));
  }, [
    caseMode,
    enableNumbering,
    findText,
    matchCase,
    patternPreset,
    prefix,
    preserveExtension,
    replaceText,
    safeStartIndex,
    safeZeroPad,
    sourceFiles,
    suffix,
  ]);

  const { modifiedCount, conflictCount, invalidCount } = useMemo(() => {
    let modified = 0;
    let conflicts = 0;
    let invalid = 0;
    for (const row of previewRows) {
      if (row.changed) modified += 1;
      if (row.conflict) conflicts += 1;
      if (row.invalid) invalid += 1;
    }
    return {
      modifiedCount: modified,
      conflictCount: conflicts,
      invalidCount: invalid,
    };
  }, [previewRows]);

  const canApply = !disabled && modifiedCount > 0 && conflictCount === 0 && invalidCount === 0;

  const handleInputKeyDown = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }, []);

  const handleResetRules = useCallback(() => {
    setFindText('');
    setReplaceText('');
    setMatchCase(false);
    setPatternPreset('none');
    setCaseMode('preserve');
    setEnableNumbering(false);
    setPrefix('');
    setSuffix('');
    setStartIndexRaw('1');
    setZeroPadRaw('2');
    setPreserveExtension(true);
    setStatusMessage('Rename rules reset to defaults.');
  }, []);

  const handleApplyRename = useCallback(() => {
    onApplyRename?.(previewRows);
    setStatusMessage(
      `Applied batch rename to ${modifiedCount} ${modifiedCount === 1 ? 'file' : 'files'}.`
    );
  }, [modifiedCount, onApplyRename, previewRows]);

  const merged = mergeProps({
    themeTarget: themeProps('batch-rename-utility', {
      patternPreset,
      caseMode,
      numbering: enableNumbering,
      hasConflicts: conflictCount > 0,
      hasInvalid: invalidCount > 0,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 flex flex-col p-4 sm:p-5 gap-4',
      disabled && 'opacity-75'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('batch-rename-utility', 'header');
  const rulesClass = stableClassName('batch-rename-utility', 'rules');
  const previewClass = stableClassName('batch-rename-utility', 'preview');
  const footerClass = stableClassName('batch-rename-utility', 'footer');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      {/* Header Bar */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <FileEdit aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <h3
            id={headingId}
            className="m-0 text-sm font-semibold tracking-tight truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {safeTitle}
          </h3>
        </div>

        <span
          data-testid="batch-rename-file-count"
          className="prism-well rounded-full px-3 py-1 font-mono text-[11px] font-medium tabular-nums shrink-0"
          style={STYLE_TEXT_SECONDARY}
        >
          {`${sourceFiles.length} ${sourceFiles.length === 1 ? 'file' : 'files'}`}
        </span>
      </div>

      {/* Transformation Rules Grid */}
      <div className={cx(rulesClass, 'flex flex-col gap-3 min-w-0 max-w-full')}>
        {/* Row 1: Literal Find & Replace */}
        <div className="prism-crystal rounded-2xl p-3.5 flex flex-col gap-2.5 min-w-0 max-w-full">
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight"
              style={STYLE_TEXT_PRIMARY}
            >
              <Search
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0"
                style={STYLE_PRIMARY_MAIN}
              />
              <span>Literal Find &amp; Replace</span>
            </span>

            <label
              htmlFor={matchCaseId}
              className="inline-flex items-center gap-1.5 text-xs font-medium select-none"
              style={STYLE_TEXT_SECONDARY}
            >
              <input
                id={matchCaseId}
                type="checkbox"
                checked={matchCase}
                disabled={disabled}
                onChange={(e) => {
                  if (disabled) return;
                  setMatchCase(e.target.checked);
                  setStatusMessage('');
                }}
                className="prism-focus-ring rounded cursor-pointer disabled:cursor-not-allowed"
              />
              <span>Match Case</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-0 max-w-full">
            <div className="flex flex-col gap-1 min-w-0">
              <label
                htmlFor={findInputId}
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={STYLE_TEXT_SECONDARY}
              >
                Find
              </label>
              <input
                id={findInputId}
                type="text"
                value={findText}
                placeholder="Literal text to find..."
                disabled={disabled}
                onChange={(e) => {
                  if (disabled) return;
                  setFindText(e.target.value);
                  setStatusMessage('');
                }}
                onKeyDown={handleInputKeyDown}
                className="prism-well prism-focus-ring h-9 w-full min-w-0 rounded-xl px-3 text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <label
                htmlFor={replaceInputId}
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={STYLE_TEXT_SECONDARY}
              >
                Replace
              </label>
              <input
                id={replaceInputId}
                type="text"
                value={replaceText}
                placeholder="Replacement text..."
                disabled={disabled}
                onChange={(e) => {
                  if (disabled) return;
                  setReplaceText(e.target.value);
                  setStatusMessage('');
                }}
                onKeyDown={handleInputKeyDown}
                className="prism-well prism-focus-ring h-9 w-full min-w-0 rounded-xl px-3 text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Curated Pattern Preset & Case Formatting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 max-w-full">
          <div className="prism-crystal rounded-2xl p-3.5 flex flex-col gap-2 min-w-0">
            <label
              htmlFor={presetSelectId}
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight"
              style={STYLE_TEXT_PRIMARY}
            >
              <Sparkles
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0"
                style={STYLE_INFO_MAIN}
              />
              <span>Pattern Preset</span>
            </label>
            <select
              id={presetSelectId}
              aria-label="Pattern preset"
              value={patternPreset}
              disabled={disabled}
              onChange={(e) => {
                if (disabled) return;
                setPatternPreset(parsePatternPreset(e.target.value));
                setStatusMessage('');
              }}
              className="prism-well prism-focus-ring h-9 w-full min-w-0 rounded-xl px-2.5 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            >
              <option value="none">None</option>
              <option value="strip-spaces">Replace Spaces with Hyphens</option>
              <option value="remove-brackets">Remove [Bracket] Tags</option>
              <option value="digits-only-prefix">Extract Leading Numeric Tag</option>
            </select>
          </div>

          <div className="prism-crystal rounded-2xl p-3.5 flex flex-col gap-2 min-w-0">
            <label
              htmlFor={caseSelectId}
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight"
              style={STYLE_TEXT_PRIMARY}
            >
              <CaseSensitive
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0"
                style={STYLE_SECONDARY_DARK}
              />
              <span>Case Formatting</span>
            </label>
            <select
              id={caseSelectId}
              aria-label="Case formatting"
              value={caseMode}
              disabled={disabled}
              onChange={(e) => {
                if (disabled) return;
                setCaseMode(parseCaseMode(e.target.value));
                setStatusMessage('');
              }}
              className="prism-well prism-focus-ring h-9 w-full min-w-0 rounded-xl px-2.5 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            >
              <option value="preserve">Preserve</option>
              <option value="lower">lowercase</option>
              <option value="upper">UPPERCASE</option>
              <option value="title">Title Case</option>
              <option value="kebab">kebab-case</option>
              <option value="snake">snake_case</option>
            </select>
          </div>
        </div>

        {/* Row 3: Sequential Numbering, Affixes & Extension Preservation */}
        <div className="prism-crystal rounded-2xl p-3.5 flex flex-col gap-2.5 min-w-0 max-w-full">
          <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight"
              style={STYLE_TEXT_PRIMARY}
            >
              <Hash
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0"
                style={STYLE_SUCCESS_DARK}
              />
              <span>Sequential Numbering &amp; Affixes</span>
            </span>

            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <label
                htmlFor={enableNumberingId}
                className="inline-flex items-center gap-1.5 text-xs font-medium select-none"
                style={STYLE_TEXT_SECONDARY}
              >
                <input
                  id={enableNumberingId}
                  type="checkbox"
                  checked={enableNumbering}
                  disabled={disabled}
                  onChange={(e) => {
                    if (disabled) return;
                    setEnableNumbering(e.target.checked);
                    setStatusMessage('');
                  }}
                  className="prism-focus-ring rounded cursor-pointer disabled:cursor-not-allowed"
                />
                <span>Enable Numbering</span>
              </label>

              <label
                htmlFor={preserveExtId}
                className="inline-flex items-center gap-1.5 text-xs font-medium select-none"
                style={STYLE_TEXT_SECONDARY}
              >
                <input
                  id={preserveExtId}
                  type="checkbox"
                  checked={preserveExtension}
                  disabled={disabled}
                  onChange={(e) => {
                    if (disabled) return;
                    setPreserveExtension(e.target.checked);
                    setStatusMessage('');
                  }}
                  className="prism-focus-ring rounded cursor-pointer disabled:cursor-not-allowed"
                />
                <span>Preserve Extension</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 min-w-0 max-w-full">
            <div className="flex flex-col gap-1 min-w-0">
              <label
                htmlFor={prefixInputId}
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={STYLE_TEXT_SECONDARY}
              >
                Prefix
              </label>
              <input
                id={prefixInputId}
                type="text"
                value={prefix}
                placeholder="e.g. asset_"
                disabled={disabled}
                onChange={(e) => {
                  if (disabled) return;
                  setPrefix(e.target.value);
                  setStatusMessage('');
                }}
                onKeyDown={handleInputKeyDown}
                className="prism-well prism-focus-ring h-9 w-full min-w-0 rounded-xl px-3 text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <label
                htmlFor={suffixInputId}
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={STYLE_TEXT_SECONDARY}
              >
                Suffix
              </label>
              <input
                id={suffixInputId}
                type="text"
                value={suffix}
                placeholder="e.g. _final"
                disabled={disabled}
                onChange={(e) => {
                  if (disabled) return;
                  setSuffix(e.target.value);
                  setStatusMessage('');
                }}
                onKeyDown={handleInputKeyDown}
                className="prism-well prism-focus-ring h-9 w-full min-w-0 rounded-xl px-3 text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <label
                htmlFor={startIndexInputId}
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={STYLE_TEXT_SECONDARY}
              >
                Start Index
              </label>
              <input
                id={startIndexInputId}
                type="number"
                min={0}
                max={999999}
                value={startIndexRaw}
                disabled={disabled || !enableNumbering}
                onChange={(e) => {
                  if (disabled) return;
                  setStartIndexRaw(e.target.value);
                  setStatusMessage('');
                }}
                onKeyDown={handleInputKeyDown}
                className="prism-well prism-focus-ring h-9 w-full min-w-0 rounded-xl px-3 text-xs font-mono tabular-nums disabled:opacity-50 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <label
                htmlFor={zeroPadInputId}
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={STYLE_TEXT_SECONDARY}
              >
                Zero Pad
              </label>
              <input
                id={zeroPadInputId}
                type="number"
                min={1}
                max={5}
                value={zeroPadRaw}
                disabled={disabled || !enableNumbering}
                onChange={(e) => {
                  if (disabled) return;
                  setZeroPadRaw(e.target.value);
                  setStatusMessage('');
                }}
                onKeyDown={handleInputKeyDown}
                className="prism-well prism-focus-ring h-9 w-full min-w-0 rounded-xl px-3 text-xs font-mono tabular-nums disabled:opacity-50 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Before -> After Preview Table */}
      <div className={cx(previewClass, 'flex flex-col gap-2 min-w-0 max-w-full')}>
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight"
            style={STYLE_TEXT_PRIMARY}
          >
            <span>Before</span>
            <ArrowRight
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_PRIMARY_MAIN}
            />
            <span>After Live Preview</span>
          </span>
        </div>

        <div className="prism-well rounded-2xl p-2 min-w-0 max-w-full">
          <div className="overflow-x-auto">
            <table
              aria-label="Batch rename before and after preview"
              className="w-full border-collapse text-xs"
            >
              <thead>
                <tr className="border-b border-[var(--prism-divider)]">
                  <th
                    scope="col"
                    className="px-3 py-2 text-left font-mono text-[11px] font-semibold whitespace-nowrap"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    #
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-[11px] font-semibold whitespace-nowrap"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Before
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-[11px] font-semibold whitespace-nowrap"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    After
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-[11px] font-semibold whitespace-nowrap"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--prism-divider)]">
                {previewRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      data-testid="batch-rename-empty"
                      className="px-3 py-6 text-center text-xs"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      No files queued for batch rename.
                    </td>
                  </tr>
                ) : (
                  previewRows.map((row, index) => {
                    const rowStatus = row.invalid
                      ? 'invalid'
                      : row.conflict
                        ? 'duplicate'
                        : row.changed
                          ? 'renamed'
                          : 'unchanged';

                    return (
                      <tr
                        key={row.id}
                        data-testid={`batch-rename-row-${index}`}
                        data-status={rowStatus}
                      >
                        <th
                          scope="row"
                          className="px-3 py-2 text-left font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {index + 1}
                        </th>
                        <td
                          className="px-3 py-2 font-mono text-xs whitespace-nowrap"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {row.before}
                        </td>
                        <td
                          data-testid={`batch-rename-after-${index}`}
                          className="px-3 py-2 font-mono text-xs font-medium whitespace-nowrap"
                          style={{
                            color:
                              row.invalid || row.conflict
                                ? 'var(--prism-error-main)'
                                : row.changed
                                  ? 'var(--prism-primary-main)'
                                  : 'var(--prism-text-primary)',
                          }}
                        >
                          {row.after.length > 0 ? row.after : '(empty)'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.invalid ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                              style={{
                                backgroundColor:
                                  'color-mix(in srgb, var(--prism-error-main) 16%, transparent)',
                                border:
                                  '1px solid color-mix(in srgb, var(--prism-error-main) 45%, transparent)',
                                color: 'var(--prism-error-main)',
                              }}
                            >
                              <XCircle aria-hidden="true" className="w-3 h-3 shrink-0" />
                              <span>Invalid</span>
                            </span>
                          ) : row.conflict ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                              style={{
                                backgroundColor:
                                  'color-mix(in srgb, var(--prism-error-main) 16%, transparent)',
                                border:
                                  '1px solid color-mix(in srgb, var(--prism-error-main) 45%, transparent)',
                                color: 'var(--prism-error-main)',
                              }}
                            >
                              <AlertTriangle aria-hidden="true" className="w-3 h-3 shrink-0" />
                              <span>Duplicate</span>
                            </span>
                          ) : row.changed ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                              style={{
                                backgroundColor:
                                  'color-mix(in srgb, var(--prism-primary-main) 15%, transparent)',
                                border:
                                  '1px solid color-mix(in srgb, var(--prism-primary-main) 45%, transparent)',
                                color: 'var(--prism-primary-main)',
                              }}
                            >
                              <CheckCircle2 aria-hidden="true" className="w-3 h-3 shrink-0" />
                              <span>Renamed</span>
                            </span>
                          ) : (
                            <span
                              className="prism-crystal inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                              style={STYLE_TEXT_SECONDARY}
                            >
                              Unchanged
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer: Summary Counts, Polite Status Confirmation, Reset & Apply */}
      <div
        className={cx(
          footerClass,
          'flex flex-wrap items-center justify-between gap-3 pt-1 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
          <span
            data-testid="batch-rename-summary"
            className="prism-well rounded-full px-3 py-1 font-mono text-xs font-semibold tabular-nums shrink-0"
            style={{
              color:
                conflictCount > 0 || invalidCount > 0
                  ? 'var(--prism-error-main)'
                  : 'var(--prism-text-secondary)',
            }}
          >
            {invalidCount > 0
              ? `${modifiedCount} modified · ${conflictCount} conflicts · ${invalidCount} invalid`
              : `${modifiedCount} modified · ${conflictCount} conflicts`}
          </span>

          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="batch-rename-status"
            className="m-0 text-xs min-w-0 break-words"
            style={STYLE_TEXT_SECONDARY}
          >
            {statusMessage}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={handleResetRules}
            className="prism-crystal prism-focus-ring rounded-full px-3.5 py-2 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={STYLE_TEXT_PRIMARY}
          >
            <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Reset Rules</span>
          </button>

          <button
            type="button"
            disabled={!canApply}
            onClick={handleApplyRename}
            className="prism-btn-primary prism-focus-ring rounded-full px-4 py-2 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Apply Rename</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const BatchRenameUtility = memo(BatchRenameUtilityInner);
BatchRenameUtility.displayName = 'BatchRenameUtility';
