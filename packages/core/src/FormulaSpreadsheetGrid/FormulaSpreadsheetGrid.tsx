'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { FileSpreadsheet, Plus, Sigma, Table2 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_SECONDARY_DARK, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, formatUsNumber } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type SpreadsheetFormulaFn = 'SUM' | 'AVERAGE' | 'MIN' | 'MAX' | 'COUNT';

export type SpreadsheetErrorCode = '#CYCLE!' | '#DIV/0!' | '#ERR!';

export interface SpreadsheetCellEntry {
  /** Cell coordinate such as `'A1'` or `'D2'` (case-insensitive). */
  address: string;
  /** Raw literal text, numeric literal, or `'='`-prefixed formula expression. */
  raw: string;
}

export interface SpreadsheetSheetSpec {
  /** Unique stable identifier for the sheet tab. */
  id: string;
  /** Visible sheet tab label rendered safely as literal text. */
  name: string;
  /** Number of grid columns (clamped to `1..26`). */
  columns: number;
  /** Number of grid rows (clamped to `1..100`). */
  rows: number;
  /** Initial cell entries populating this sheet. */
  cells: ReadonlyArray<SpreadsheetCellEntry>;
}

export interface SpreadsheetCellEvaluation {
  /** Formatted string displayed inside the grid cell. */
  display: string;
  /** Finite numeric value when resolved to a number, otherwise `null`. */
  numericValue: number | null;
  /** Formula error code when evaluation fails, otherwise `null`. */
  error: SpreadsheetErrorCode | null;
  /** Whether the cell's raw expression starts with `'='`. */
  isFormula: boolean;
}

export interface FormulaSpreadsheetGridProps extends BaseProps<HTMLDivElement> {
  /** Workbook sheets with dimensions and initial cell entries. Defaults to 2 live sheets (`Q4 Budget` and `Unit Economics`). Pass `[]` for an empty state. */
  sheets?: ReadonlyArray<SpreadsheetSheetSpec>;
  /** Invoked whenever a cell edit commits with `(sheetId, address, raw, computed)`. */
  onCellChange?: (sheetId: string, address: string, raw: string, computed: string) => void;
  /** Visible workbook title linked to the region via `aria-labelledby`. Defaults to `'Optical Formula Spreadsheet'`. */
  title?: string;
  /** Disables cell editing, formula insertion, and adding sheets while keeping inspection interactive. Defaults to `false`. */
  disabled?: boolean;
}

interface CellCoord {
  col: number;
  row: number;
}

interface ParsedCellAddress {
  col: number;
  row: number;
  normalized: string;
}

type FormulaToken =
  | { kind: 'number'; value: number }
  | { kind: 'ident'; value: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'comma' }
  | { kind: 'colon' };

type EvalOutcome =
  | { ok: true; value: number }
  | { ok: false; error: SpreadsheetErrorCode };

interface DraftState {
  key: string;
  value: string;
}

const DEFAULT_TITLE = 'Optical Formula Spreadsheet';
const MAX_COLUMNS = 26;
const MAX_ROWS = 100;
const MAX_FORMULA_LENGTH = 256;
const MAX_PARSE_DEPTH = 24;
const MAX_RANGE_CELLS = 500;
const CELL_ADDRESS_RE = /^([A-Z]{1,3})([1-9]\d{0,3})$/;

const DEFAULT_SHEETS: ReadonlyArray<SpreadsheetSheetSpec> = [
  {
    id: 'q4-budget',
    name: 'Q4 Budget',
    columns: 4,
    rows: 6,
    cells: [
      { address: 'A1', raw: 'Line Item' },
      { address: 'B1', raw: 'Units' },
      { address: 'C1', raw: 'Unit Cost' },
      { address: 'D1', raw: 'Total' },
      { address: 'A2', raw: 'GPU Compute' },
      { address: 'B2', raw: '12' },
      { address: 'C2', raw: '450' },
      { address: 'D2', raw: '=B2*C2' },
      { address: 'A3', raw: 'Optical CDN' },
      { address: 'B3', raw: '8' },
      { address: 'C3', raw: '225' },
      { address: 'D3', raw: '=B3*C3' },
      { address: 'A4', raw: 'Telemetry Ops' },
      { address: 'B4', raw: '5' },
      { address: 'C4', raw: '320' },
      { address: 'D4', raw: '=B4*C4' },
      { address: 'A5', raw: 'Q4 Total' },
      { address: 'B5', raw: '=SUM(B2:B4)' },
      { address: 'C5', raw: '=AVERAGE(C2:C4)' },
      { address: 'D5', raw: '=SUM(D2:D4)' },
      { address: 'A6', raw: 'Peak & Count' },
      { address: 'B6', raw: '=COUNT(B2:B4)' },
      { address: 'C6', raw: '=MIN(C2:C4)' },
      { address: 'D6', raw: '=MAX(D2:D4)' },
    ],
  },
  {
    id: 'unit-economics',
    name: 'Unit Economics',
    columns: 4,
    rows: 5,
    cells: [
      { address: 'A1', raw: 'Plan Tier' },
      { address: 'B1', raw: 'ARPU' },
      { address: 'C1', raw: 'COGS' },
      { address: 'D1', raw: 'Gross Margin' },
      { address: 'A2', raw: 'Starter' },
      { address: 'B2', raw: '49' },
      { address: 'C2', raw: '12' },
      { address: 'D2', raw: '=(B2-C2)/B2' },
      { address: 'A3', raw: 'Pro Prism' },
      { address: 'B3', raw: '149' },
      { address: 'C3', raw: '28' },
      { address: 'D3', raw: '=(B3-C3)/B3' },
      { address: 'A4', raw: 'Enterprise' },
      { address: 'B4', raw: '480' },
      { address: 'C4', raw: '72' },
      { address: 'D4', raw: '=(B4-C4)/B4' },
      { address: 'A5', raw: 'Blended Avg' },
      { address: 'B5', raw: '=AVERAGE(B2:B4)' },
      { address: 'C5', raw: '=AVERAGE(C2:C4)' },
      { address: 'D5', raw: '=AVERAGE(D2:D4)' },
    ],
  },
];

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function columnIndexToLetter(colIndex: number): string {
  let n = colIndex + 1;
  let label = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function toAddress(colIndex: number, rowIndex: number): string {
  return `${columnIndexToLetter(colIndex)}${rowIndex + 1}`;
}

function parseCellAddress(rawAddr: string): ParsedCellAddress | null {
  const trimmed = rawAddr.trim().toUpperCase();
  const match = CELL_ADDRESS_RE.exec(trimmed);
  if (!match) return null;
  const letters = match[1]!;
  const rowNum = Number(match[2]!);
  let col = 0;
  for (let i = 0; i < letters.length; i += 1) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return {
    col: col - 1,
    row: rowNum - 1,
    normalized: `${letters}${rowNum}`,
  };
}

function expandCellRange(start: ParsedCellAddress, end: ParsedCellAddress): string[] | null {
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const totalCells = (maxCol - minCol + 1) * (maxRow - minRow + 1);
  if (totalCells > MAX_RANGE_CELLS) {
    return null;
  }
  const addresses: string[] = [];
  for (let r = minRow; r <= maxRow; r += 1) {
    for (let c = minCol; c <= maxCol; c += 1) {
      addresses.push(toAddress(c, r));
    }
  }
  return addresses;
}

function parseFiniteLiteral(trimmed: string): number | null {
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatComputedNumber(value: number): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  const rounded = Math.round(normalized * 10000) / 10000;
  if (Number.isInteger(rounded)) {
    return formatUsNumber(rounded);
  }
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function readCellRaw(cellMap: ReadonlyMap<string, string>, normalizedUpper: string): string {
  const direct = cellMap.get(normalizedUpper);
  if (direct !== undefined) return direct;
  const lower = cellMap.get(normalizedUpper.toLowerCase());
  return lower ?? '';
}

function isFormulaFnName(name: string): name is SpreadsheetFormulaFn {
  return (
    name === 'SUM' ||
    name === 'AVERAGE' ||
    name === 'MIN' ||
    name === 'MAX' ||
    name === 'COUNT'
  );
}

function tokenizeFormula(input: string): FormulaToken[] | null {
  if (input.length === 0 || input.length > MAX_FORMULA_LENGTH) return null;
  const tokens: FormulaToken[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i]!;
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }

    if ((ch >= '0' && ch <= '9') || ch === '.') {
      const start = i;
      let dotCount = 0;
      while (i < input.length) {
        const c = input[i]!;
        if (c >= '0' && c <= '9') {
          i += 1;
        } else if (c === '.') {
          dotCount += 1;
          if (dotCount > 1) return null;
          i += 1;
        } else {
          break;
        }
      }
      const rawNum = input.slice(start, i);
      if (rawNum === '.') return null;
      tokens.push({ kind: 'number', value: Number(rawNum) });
      continue;
    }

    if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')) {
      const start = i;
      while (i < input.length) {
        const c = input[i]!;
        const isAlphaNum =
          (c >= 'A' && c <= 'Z') ||
          (c >= 'a' && c <= 'z') ||
          (c >= '0' && c <= '9');
        if (!isAlphaNum) break;
        i += 1;
      }
      tokens.push({ kind: 'ident', value: input.slice(start, i).toUpperCase() });
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ kind: 'op', value: ch });
      i += 1;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen' });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' });
      i += 1;
      continue;
    }
    if (ch === ',') {
      tokens.push({ kind: 'comma' });
      i += 1;
      continue;
    }
    if (ch === ':') {
      tokens.push({ kind: 'colon' });
      i += 1;
      continue;
    }

    return null;
  }

  return tokens.length > 0 ? tokens : null;
}

function applyFormulaFunction(fnName: SpreadsheetFormulaFn, values: ReadonlyArray<number>): EvalOutcome {
  if (fnName === 'COUNT') {
    return { ok: true, value: values.length };
  }
  if (fnName === 'SUM') {
    let total = 0;
    for (const v of values) total += v;
    return { ok: true, value: total };
  }
  if (fnName === 'AVERAGE') {
    if (values.length === 0) return { ok: false, error: '#DIV/0!' };
    let total = 0;
    for (const v of values) total += v;
    return { ok: true, value: total / values.length };
  }
  if (fnName === 'MIN') {
    if (values.length === 0) return { ok: true, value: 0 };
    return { ok: true, value: Math.min(...values) };
  }
  if (values.length === 0) return { ok: true, value: 0 };
  return { ok: true, value: Math.max(...values) };
}

function evaluateFormulaExpression(
  expr: string,
  cellMap: ReadonlyMap<string, string>,
  visited: ReadonlySet<string>
): EvalOutcome {
  const tokens = tokenizeFormula(expr);
  if (!tokens) {
    return { ok: false, error: '#ERR!' };
  }

  let pos = 0;
  let depth = 0;

  const peek = (): FormulaToken | undefined => tokens[pos];

  const parseExpression = (): EvalOutcome => {
    let left = parseTerm();
    if (!left.ok) return left;

    while (true) {
      const tok = peek();
      if (tok?.kind !== 'op' || (tok.value !== '+' && tok.value !== '-')) {
        break;
      }
      pos += 1;
      const right = parseTerm();
      if (!right.ok) return right;
      left = {
        ok: true,
        value: tok.value === '+' ? left.value + right.value : left.value - right.value,
      };
    }

    return left;
  };

  const parseTerm = (): EvalOutcome => {
    let left = parseUnary();
    if (!left.ok) return left;

    while (true) {
      const tok = peek();
      if (tok?.kind !== 'op' || (tok.value !== '*' && tok.value !== '/')) {
        break;
      }
      pos += 1;
      const right = parseUnary();
      if (!right.ok) return right;
      if (tok.value === '/') {
        if (right.value === 0) {
          return { ok: false, error: '#DIV/0!' };
        }
        left = { ok: true, value: left.value / right.value };
      } else {
        left = { ok: true, value: left.value * right.value };
      }
    }

    return left;
  };

  const parseUnary = (): EvalOutcome => {
    const tok = peek();
    if (tok?.kind === 'op' && (tok.value === '+' || tok.value === '-')) {
      pos += 1;
      const operand = parseUnary();
      if (!operand.ok) return operand;
      return tok.value === '-' ? { ok: true, value: -operand.value } : operand;
    }
    return parsePrimary();
  };

  const parseFunctionCall = (fnName: string): EvalOutcome => {
    if (!isFormulaFnName(fnName)) {
      return { ok: false, error: '#ERR!' };
    }
    pos += 1; // consume '('
    depth += 1;
    if (depth > MAX_PARSE_DEPTH) {
      return { ok: false, error: '#ERR!' };
    }

    if (peek()?.kind === 'rparen') {
      return { ok: false, error: '#ERR!' };
    }

    const collected: number[] = [];

    while (true) {
      const first = tokens[pos];
      const second = tokens[pos + 1];
      const third = tokens[pos + 2];

      if (first?.kind === 'ident' && second?.kind === 'colon' && third?.kind === 'ident') {
        const startAddr = parseCellAddress(first.value);
        const endAddr = parseCellAddress(third.value);
        if (!startAddr || !endAddr) {
          return { ok: false, error: '#ERR!' };
        }
        const rangeAddresses = expandCellRange(startAddr, endAddr);
        if (!rangeAddresses) {
          return { ok: false, error: '#ERR!' };
        }
        pos += 3;
        for (const refAddr of rangeAddresses) {
          const refEval = evaluateSpreadsheetCell(refAddr, cellMap, visited);
          if (refEval.error) {
            return { ok: false, error: refEval.error };
          }
          if (refEval.numericValue !== null) {
            collected.push(refEval.numericValue);
          }
        }
      } else if (
        first?.kind === 'ident' &&
        (second?.kind === 'comma' || second?.kind === 'rparen')
      ) {
        const parsedRef = parseCellAddress(first.value);
        if (!parsedRef) {
          return { ok: false, error: '#ERR!' };
        }
        pos += 1;
        const refEval = evaluateSpreadsheetCell(parsedRef.normalized, cellMap, visited);
        if (refEval.error) {
          return { ok: false, error: refEval.error };
        }
        if (refEval.numericValue !== null) {
          collected.push(refEval.numericValue);
        }
      } else {
        const argOutcome = parseExpression();
        if (!argOutcome.ok) return argOutcome;
        collected.push(argOutcome.value);
      }

      const sep = peek();
      if (sep?.kind === 'comma') {
        pos += 1;
        continue;
      }
      if (sep?.kind === 'rparen') {
        pos += 1;
        break;
      }
      return { ok: false, error: '#ERR!' };
    }

    depth -= 1;
    return applyFormulaFunction(fnName, collected);
  };

  const parsePrimary = (): EvalOutcome => {
    const tok = peek();
    if (!tok) {
      return { ok: false, error: '#ERR!' };
    }

    if (tok.kind === 'number') {
      pos += 1;
      return { ok: true, value: tok.value };
    }

    if (tok.kind === 'lparen') {
      depth += 1;
      if (depth > MAX_PARSE_DEPTH) {
        return { ok: false, error: '#ERR!' };
      }
      pos += 1;
      const inner = parseExpression();
      depth -= 1;
      if (!inner.ok) return inner;
      if (peek()?.kind !== 'rparen') {
        return { ok: false, error: '#ERR!' };
      }
      pos += 1;
      return inner;
    }

    if (tok.kind === 'ident') {
      pos += 1;
      if (peek()?.kind === 'lparen') {
        return parseFunctionCall(tok.value);
      }
      const parsedRef = parseCellAddress(tok.value);
      if (!parsedRef) {
        return { ok: false, error: '#ERR!' };
      }
      const refEval = evaluateSpreadsheetCell(parsedRef.normalized, cellMap, visited);
      if (refEval.error) {
        return { ok: false, error: refEval.error };
      }
      if (refEval.numericValue === null) {
        if (refEval.display === '') {
          return { ok: true, value: 0 };
        }
        return { ok: false, error: '#ERR!' };
      }
      return { ok: true, value: refEval.numericValue };
    }

    return { ok: false, error: '#ERR!' };
  };

  const result = parseExpression();
  if (!result.ok) return result;
  if (pos !== tokens.length) {
    return { ok: false, error: '#ERR!' };
  }
  if (!Number.isFinite(result.value)) {
    return { ok: false, error: '#DIV/0!' };
  }
  return result;
}

/**
 * Strictly typed, cycle-safe, prototype-safe formula evaluator with zero `eval`/`new Function`.
 * Supports cell references (`A1`, case-insensitive), ranges (`B2:B5`), `SUM`, `AVERAGE`,
 * `MIN`, `MAX`, `COUNT`, and parenthesized arithmetic (`+`, `-`, `*`, `/`).
 */
export function evaluateSpreadsheetCell(
  address: string,
  cellMap: ReadonlyMap<string, string>,
  visited?: ReadonlySet<string>
): SpreadsheetCellEvaluation {
  const parsedAddr = parseCellAddress(address);
  if (!parsedAddr) {
    return { display: '#ERR!', numericValue: null, error: '#ERR!', isFormula: false };
  }
  const normalized = parsedAddr.normalized;

  if (visited?.has(normalized)) {
    return { display: '#CYCLE!', numericValue: null, error: '#CYCLE!', isFormula: true };
  }

  const raw = readCellRaw(cellMap, normalized);
  const trimmed = raw.trim();

  if (trimmed === '') {
    return { display: '', numericValue: null, error: null, isFormula: false };
  }

  if (trimmed.startsWith('=')) {
    const nextVisited = new Set(visited);
    nextVisited.add(normalized);
    const expr = trimmed.slice(1).trim();
    const outcome = evaluateFormulaExpression(expr, cellMap, nextVisited);
    if (!outcome.ok) {
      return {
        display: outcome.error,
        numericValue: null,
        error: outcome.error,
        isFormula: true,
      };
    }
    return {
      display: formatComputedNumber(outcome.value),
      numericValue: outcome.value,
      error: null,
      isFormula: true,
    };
  }

  return {
    display: raw,
    numericValue: parseFiniteLiteral(trimmed),
    error: null,
    isFormula: false,
  };
}

const headerClass = /*#__PURE__*/ stableClassName('formula-spreadsheet-grid', 'header');
const formulaBarClass = /*#__PURE__*/ stableClassName('formula-spreadsheet-grid', 'formula-bar');
const tableWrapperClass = /*#__PURE__*/ stableClassName('formula-spreadsheet-grid', 'table-wrapper');
const tableClass = /*#__PURE__*/ stableClassName('formula-spreadsheet-grid', 'table');
const footerClass = /*#__PURE__*/ stableClassName('formula-spreadsheet-grid', 'footer');

function FormulaSpreadsheetGridInner({
  sheets,
  onCellChange,
  title = DEFAULT_TITLE,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: FormulaSpreadsheetGridProps) {
  const override = useComponentOverride('FormulaSpreadsheetGrid');
  const baseId = useId();
  const headingId = `${baseId}-heading`;

  const baseSheets = sheets ?? DEFAULT_SHEETS;
  const safeTitle = title.trim() || DEFAULT_TITLE;

  const [addedSheets, setAddedSheets] = useState<ReadonlyArray<SpreadsheetSheetSpec>>([]);
  const [cellOverrides, setCellOverrides] = useState<
    ReadonlyMap<string, ReadonlyMap<string, string>>
  >(() => new Map());
  const [activeSheetId, setActiveSheetId] = useState<string>(() => baseSheets[0]?.id ?? '');
  const [selectionAnchor, setSelectionAnchor] = useState<CellCoord>(() =>
    sheets === undefined ? { col: 3, row: 4 } : { col: 0, row: 0 }
  );
  const [selectionFocus, setSelectionFocus] = useState<CellCoord>(() =>
    sheets === undefined ? { col: 3, row: 4 } : { col: 0, row: 0 }
  );
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [focusNonce, setFocusNonce] = useState<number>(0);

  const cellButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const sheetTabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const formulaInputRef = useRef<HTMLInputElement | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const pendingCellFocusRef = useRef<string | null>(null);
  const pendingTabFocusRef = useRef<string | null>(null);
  const skipNextBlurCommitRef = useRef<boolean>(false);

  const allSheets = useMemo(
    () => [...baseSheets, ...addedSheets],
    [addedSheets, baseSheets]
  );

  const activeSheet = useMemo(
    () => allSheets.find((sheet) => sheet.id === activeSheetId) ?? allSheets[0] ?? null,
    [activeSheetId, allSheets]
  );

  const isEmpty = activeSheet === null;
  const colCount = activeSheet ? clampInt(activeSheet.columns, 1, MAX_COLUMNS) : 0;
  const rowCount = activeSheet ? clampInt(activeSheet.rows, 1, MAX_ROWS) : 0;

  const clampedAnchor: CellCoord = activeSheet
    ? {
        col: clampInt(selectionAnchor.col, 0, colCount - 1),
        row: clampInt(selectionAnchor.row, 0, rowCount - 1),
      }
    : { col: 0, row: 0 };

  const clampedFocus: CellCoord = activeSheet
    ? {
        col: clampInt(selectionFocus.col, 0, colCount - 1),
        row: clampInt(selectionFocus.row, 0, rowCount - 1),
      }
    : { col: 0, row: 0 };

  const minCol = Math.min(clampedAnchor.col, clampedFocus.col);
  const maxCol = Math.max(clampedAnchor.col, clampedFocus.col);
  const minRow = Math.min(clampedAnchor.row, clampedFocus.row);
  const maxRow = Math.max(clampedAnchor.row, clampedFocus.row);

  const activeAddress = activeSheet ? toAddress(clampedAnchor.col, clampedAnchor.row) : '—';
  const rangeStartAddress = activeSheet ? toAddress(minCol, minRow) : '—';
  const rangeEndAddress = activeSheet ? toAddress(maxCol, maxRow) : '—';
  const activeRangeBadge =
    rangeStartAddress === rangeEndAddress
      ? rangeStartAddress
      : `${rangeStartAddress}:${rangeEndAddress}`;

  const activeSelectionKey = activeSheet ? `${activeSheet.id}::${activeAddress}` : '';

  const activeCellMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!activeSheet) return map;
    for (const entry of activeSheet.cells) {
      const parsed = parseCellAddress(entry.address);
      if (parsed) {
        map.set(parsed.normalized, entry.raw);
      }
    }
    const overrides = cellOverrides.get(activeSheet.id);
    if (overrides) {
      for (const [addr, rawVal] of overrides.entries()) {
        map.set(addr, rawVal);
      }
    }
    return map;
  }, [activeSheet, cellOverrides]);

  const colLetters = useMemo(
    () => Array.from({ length: colCount }, (_, idx) => columnIndexToLetter(idx)),
    [colCount]
  );

  const rowNumbers = useMemo(
    () => Array.from({ length: rowCount }, (_, idx) => idx + 1),
    [rowCount]
  );

  const evaluatedGrid = useMemo(() => {
    const map = new Map<string, SpreadsheetCellEvaluation>();
    if (!activeSheet) return map;
    for (let r = 0; r < rowCount; r += 1) {
      for (let c = 0; c < colCount; c += 1) {
        const addr = toAddress(c, r);
        map.set(addr, evaluateSpreadsheetCell(addr, activeCellMap));
      }
    }
    return map;
  }, [activeCellMap, activeSheet, colCount, rowCount]);

  const persistedRaw = activeSheet ? (activeCellMap.get(activeAddress) ?? '') : '';
  const formulaBarValue =
    draftState !== null && draftState.key === activeSelectionKey
      ? draftState.value
      : persistedRaw;

  const rangeStats = useMemo(() => {
    if (!activeSheet) {
      return { count: 0, sumDisplay: '—', avgDisplay: '—' };
    }
    let sum = 0;
    let count = 0;
    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const evalResult = evaluatedGrid.get(toAddress(c, r));
        if (evalResult && evalResult.numericValue !== null) {
          sum += evalResult.numericValue;
          count += 1;
        }
      }
    }
    return {
      count,
      sumDisplay: count > 0 ? formatComputedNumber(sum) : '—',
      avgDisplay: count > 0 ? formatComputedNumber(sum / count) : '—',
    };
  }, [activeSheet, evaluatedGrid, maxCol, maxRow, minCol, minRow]);

  useEffect(() => {
    if (editingAddress !== null) {
      inlineInputRef.current?.focus();
    }
  }, [editingAddress]);

  useEffect(() => {
    if (pendingCellFocusRef.current !== null) {
      const addr = pendingCellFocusRef.current;
      pendingCellFocusRef.current = null;
      cellButtonRefs.current.get(addr)?.focus();
    }
    if (pendingTabFocusRef.current !== null) {
      const sheetId = pendingTabFocusRef.current;
      pendingTabFocusRef.current = null;
      sheetTabRefs.current.get(sheetId)?.focus();
    }
  }, [focusNonce, activeSheet]);

  const scheduleCellFocus = useCallback((address: string) => {
    pendingCellFocusRef.current = address;
    setFocusNonce((prev) => prev + 1);
  }, []);

  const scheduleTabFocus = useCallback((sheetId: string) => {
    pendingTabFocusRef.current = sheetId;
    setFocusNonce((prev) => prev + 1);
  }, []);

  const registerCellRef = useCallback(
    (address: string) => (element: HTMLButtonElement | null) => {
      if (element) {
        cellButtonRefs.current.set(address, element);
      } else {
        cellButtonRefs.current.delete(address);
      }
    },
    []
  );

  const registerTabRef = useCallback(
    (sheetId: string) => (element: HTMLButtonElement | null) => {
      if (element) {
        sheetTabRefs.current.set(sheetId, element);
      } else {
        sheetTabRefs.current.delete(sheetId);
      }
    },
    []
  );

  const commitCellValue = useCallback(
    (sheetId: string, address: string, rawValue: string) => {
      setCellOverrides((prev) => {
        const nextOuter = new Map(prev);
        const existingSheetMap = prev.get(sheetId);
        const nextInner = new Map(existingSheetMap);
        nextInner.set(address, rawValue);
        nextOuter.set(sheetId, nextInner);
        return nextOuter;
      });
      const previewMap = new Map(activeCellMap);
      previewMap.set(address, rawValue);
      const computedEval = evaluateSpreadsheetCell(address, previewMap);
      onCellChange?.(sheetId, address, rawValue, computedEval.display);
    },
    [activeCellMap, onCellChange]
  );

  const handleFormulaBarKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing || !activeSheet || disabled) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        commitCellValue(activeSheet.id, activeAddress, formulaBarValue);
        setDraftState(null);
        setEditingAddress(null);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setDraftState(null);
        setEditingAddress(null);
      }
    },
    [activeAddress, activeSheet, commitCellValue, disabled, formulaBarValue]
  );

  const handleInlineInputKeyDown = useCallback(
    (address: string) => (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing || !activeSheet) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        skipNextBlurCommitRef.current = true;
        commitCellValue(activeSheet.id, address, formulaBarValue);
        setDraftState(null);
        setEditingAddress(null);
        scheduleCellFocus(address);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        skipNextBlurCommitRef.current = true;
        setDraftState(null);
        setEditingAddress(null);
        scheduleCellFocus(address);
      }
    },
    [activeSheet, commitCellValue, formulaBarValue, scheduleCellFocus]
  );

  const handleInlineInputBlur = useCallback(
    (address: string) => () => {
      if (skipNextBlurCommitRef.current) {
        skipNextBlurCommitRef.current = false;
        return;
      }
      if (activeSheet) {
        commitCellValue(activeSheet.id, address, formulaBarValue);
      }
      setDraftState(null);
      setEditingAddress(null);
    },
    [activeSheet, commitCellValue, formulaBarValue]
  );

  const handleCellClick = useCallback(
    (col: number, row: number, event: ReactMouseEvent<HTMLButtonElement>) => {
      const coord: CellCoord = { col, row };
      if (event.shiftKey) {
        setSelectionFocus(coord);
      } else {
        setSelectionAnchor(coord);
        setSelectionFocus(coord);
      }
      setEditingAddress(null);
      setDraftState(null);
    },
    []
  );

  const handleCellDoubleClick = useCallback(
    (col: number, row: number) => {
      if (disabled || !activeSheet) return;
      const addr = toAddress(col, row);
      skipNextBlurCommitRef.current = false;
      setSelectionAnchor({ col, row });
      setSelectionFocus({ col, row });
      setDraftState({
        key: `${activeSheet.id}::${addr}`,
        value: activeCellMap.get(addr) ?? '',
      });
      setEditingAddress(addr);
    },
    [activeCellMap, activeSheet, disabled]
  );

  const handleCellKeyDown = useCallback(
    (col: number, row: number) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing || !activeSheet) return;

      const moveBy = (dCol: number, dRow: number) => {
        const base = event.shiftKey ? clampedFocus : { col, row };
        const nextCoord: CellCoord = {
          col: clampInt(base.col + dCol, 0, colCount - 1),
          row: clampInt(base.row + dRow, 0, rowCount - 1),
        };
        if (event.shiftKey) {
          setSelectionFocus(nextCoord);
        } else {
          setSelectionAnchor(nextCoord);
          setSelectionFocus(nextCoord);
          setDraftState(null);
        }
        scheduleCellFocus(toAddress(nextCoord.col, nextCoord.row));
      };

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveBy(0, -1);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveBy(0, 1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveBy(-1, 0);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveBy(1, 0);
        return;
      }

      if (disabled) return;

      const addr = toAddress(col, row);

      if (event.key === 'Enter' || event.key === 'F2') {
        event.preventDefault();
        skipNextBlurCommitRef.current = false;
        setSelectionAnchor({ col, row });
        setSelectionFocus({ col, row });
        setDraftState({
          key: `${activeSheet.id}::${addr}`,
          value: activeCellMap.get(addr) ?? '',
        });
        setEditingAddress(addr);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        commitCellValue(activeSheet.id, addr, '');
        setDraftState(null);
        return;
      }

      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        skipNextBlurCommitRef.current = false;
        setSelectionAnchor({ col, row });
        setSelectionFocus({ col, row });
        setDraftState({
          key: `${activeSheet.id}::${addr}`,
          value: event.key,
        });
        setEditingAddress(addr);
      }
    },
    [
      activeCellMap,
      activeSheet,
      clampedFocus,
      colCount,
      commitCellValue,
      disabled,
      rowCount,
      scheduleCellFocus,
    ]
  );

  const handleInsertSum = useCallback(() => {
    if (disabled || !activeSheet) return;
    const isMultiCell = minCol !== maxCol || minRow !== maxRow;

    if (isMultiCell) {
      const rangeExpr = `=SUM(${rangeStartAddress}:${rangeEndAddress})`;
      if (maxRow + 1 < rowCount) {
        const targetCoord: CellCoord = { col: minCol, row: maxRow + 1 };
        const targetAddr = toAddress(targetCoord.col, targetCoord.row);
        commitCellValue(activeSheet.id, targetAddr, rangeExpr);
        setSelectionAnchor(targetCoord);
        setSelectionFocus(targetCoord);
        setDraftState(null);
        setEditingAddress(null);
      } else {
        setDraftState({ key: activeSelectionKey, value: rangeExpr });
        formulaInputRef.current?.focus();
      }
      return;
    }

    if (clampedAnchor.row > 0) {
      const colLetter = columnIndexToLetter(clampedAnchor.col);
      const startRowNum = clampedAnchor.row >= 2 ? 2 : 1;
      const formula = `=SUM(${colLetter}${startRowNum}:${colLetter}${clampedAnchor.row})`;
      commitCellValue(activeSheet.id, activeAddress, formula);
      setDraftState(null);
      setEditingAddress(null);
      return;
    }

    setDraftState({ key: activeSelectionKey, value: '=SUM(' });
    formulaInputRef.current?.focus();
  }, [
    activeAddress,
    activeSelectionKey,
    activeSheet,
    clampedAnchor.col,
    clampedAnchor.row,
    commitCellValue,
    disabled,
    maxCol,
    maxRow,
    minCol,
    minRow,
    rangeEndAddress,
    rangeStartAddress,
    rowCount,
  ]);

  const handleSelectSheet = useCallback((sheetId: string) => {
    setActiveSheetId(sheetId);
    setSelectionAnchor({ col: 0, row: 0 });
    setSelectionFocus({ col: 0, row: 0 });
    setEditingAddress(null);
    setDraftState(null);
  }, []);

  const handleSheetTabKeyDown = useCallback(
    (sheetIndex: number) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing || allSheets.length === 0) return;
      let nextIndex = -1;
      if (event.key === 'ArrowRight') {
        nextIndex = (sheetIndex + 1) % allSheets.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (sheetIndex - 1 + allSheets.length) % allSheets.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = allSheets.length - 1;
      }
      if (nextIndex >= 0) {
        event.preventDefault();
        const target = allSheets[nextIndex]!;
        handleSelectSheet(target.id);
        scheduleTabFocus(target.id);
      }
    },
    [allSheets, handleSelectSheet, scheduleTabFocus]
  );

  const handleAddSheet = useCallback(() => {
    if (disabled) return;
    const existingIds = new Set(allSheets.map((s) => s.id));
    const existingNames = new Set(allSheets.map((s) => s.name));
    let num = allSheets.length + 1;
    while (existingIds.has(`sheet-${num}`) || existingNames.has(`Sheet ${num}`)) {
      num += 1;
    }
    const newSheet: SpreadsheetSheetSpec = {
      id: `sheet-${num}`,
      name: `Sheet ${num}`,
      columns: 4,
      rows: 5,
      cells: [],
    };
    setAddedSheets((prev) => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
    setSelectionAnchor({ col: 0, row: 0 });
    setSelectionFocus({ col: 0, row: 0 });
    setEditingAddress(null);
    setDraftState(null);
  }, [allSheets, disabled]);

  const merged = mergeProps({
    themeTarget: themeProps('formula-spreadsheet-grid', {
      activeSheet: activeSheet?.id,
      activeCell: activeSheet ? activeAddress : undefined,
      disabled: disabled || undefined,
      empty: isEmpty || undefined,
    }),
    baseClassName: 'prism-slab w-full max-w-full min-w-0 flex flex-col p-4 sm:p-5 gap-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      {/* Sculpted Optical Slab Header */}
      <div
        data-testid="spreadsheet-header"
        className={cx(
          headerClass,
          'prism-slab rounded-2xl px-3.5 py-3 flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <FileSpreadsheet aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          </span>
          <h3
            id={headingId}
            className="m-0 text-sm font-semibold tracking-tight truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {safeTitle}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span
            data-testid="spreadsheet-range-badge"
            className="prism-well rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {activeRangeBadge}
          </span>

          <button
            type="button"
            disabled={disabled || isEmpty}
            data-testid="spreadsheet-insert-sum"
            onClick={handleInsertSum}
            className="prism-crystal prism-focus-ring rounded-full px-3 py-1 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={STYLE_PRIMARY_MAIN}
          >
            <Sigma aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Insert =SUM</span>
          </button>
        </div>
      </div>

      {/* Dedicated fx Formula Bar */}
      <div
        data-testid="spreadsheet-formula-bar"
        className={cx(
          formulaBarClass,
          'prism-well rounded-xl px-3 py-1.5 flex items-center gap-2 min-w-0 max-w-full'
        )}
      >
        <span
          data-testid="spreadsheet-active-cell-badge"
          className="prism-crystal rounded-lg px-2 py-0.5 font-mono text-xs font-semibold tabular-nums shrink-0"
          style={STYLE_TEXT_PRIMARY}
        >
          {activeAddress}
        </span>

        <span
          aria-hidden="true"
          className="font-mono italic text-xs font-bold select-none shrink-0 px-1"
          style={STYLE_SECONDARY_DARK}
        >
          fx
        </span>

        <input
          ref={formulaInputRef}
          type="text"
          aria-label="Formula bar"
          data-testid="spreadsheet-formula-input"
          disabled={disabled || isEmpty}
          value={formulaBarValue}
          placeholder="Enter value or =SUM(D2:D4)..."
          onChange={(event) => {
            if (!activeSheet || disabled) return;
            setDraftState({ key: activeSelectionKey, value: event.target.value });
          }}
          onKeyDown={handleFormulaBarKeyDown}
          className="prism-focus-ring flex-1 min-w-0 bg-transparent border-0 text-xs font-mono py-1 px-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={STYLE_TEXT_PRIMARY}
        />
      </div>

      {/* Spreadsheet Grid Table or Empty State */}
      {isEmpty ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="spreadsheet-empty"
          className="prism-well rounded-2xl px-4 py-8 flex flex-col items-center justify-center text-center gap-1.5 min-w-0 max-w-full"
          style={STYLE_TEXT_SECONDARY}
        >
          <Table2 aria-hidden="true" className="w-5 h-5 shrink-0 opacity-75" />
          <p className="m-0 text-xs font-semibold" style={STYLE_TEXT_PRIMARY}>
            No sheets available
          </p>
          <p className="m-0 text-xs">
            Add a sheet below to start entering values and live optical formulas.
          </p>
        </div>
      ) : (
        <div
          data-testid="spreadsheet-table-wrapper"
          className={cx(
            tableWrapperClass,
            'prism-well rounded-2xl p-2 overflow-x-auto max-w-full min-w-0'
          )}
        >
          <table
            role="grid"
            aria-label={activeSheet.name}
            data-testid="spreadsheet-table"
            className={cx(tableClass, 'w-full border-collapse text-xs')}
          >
            <thead>
              <tr className="border-b border-[var(--prism-divider)]">
                <th
                  scope="col"
                  aria-label="Row number"
                  className="w-10 px-2 py-2 text-center font-mono text-[11px] font-semibold select-none border-r border-[var(--prism-divider)]"
                  style={STYLE_TEXT_SECONDARY}
                >
                  #
                </th>
                {colLetters.map((colLetter, colIdx) => {
                  const isColSelected = colIdx >= minCol && colIdx <= maxCol;
                  return (
                    <th
                      key={colLetter}
                      scope="col"
                      data-col-header={colLetter}
                      data-selected={isColSelected ? 'true' : undefined}
                      className={cx(
                        'min-w-[112px] px-3 py-2 text-center font-mono text-[11px] font-semibold select-none border-r last:border-r-0 border-[var(--prism-divider)]',
                        isColSelected && 'bg-[var(--prism-divider)]'
                      )}
                      style={{
                        color: isColSelected
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-text-secondary)',
                      }}
                    >
                      {colLetter}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--prism-divider)]">
              {rowNumbers.map((rowNum, rowIdx) => {
                const isRowSelected = rowIdx >= minRow && rowIdx <= maxRow;
                return (
                  <tr key={rowNum} data-row-index={String(rowNum)}>
                    <th
                      scope="row"
                      data-row-header={String(rowNum)}
                      data-selected={isRowSelected ? 'true' : undefined}
                      className={cx(
                        'w-10 px-2 py-1.5 text-center font-mono text-[11px] font-semibold select-none border-r border-[var(--prism-divider)]',
                        isRowSelected && 'bg-[var(--prism-divider)]'
                      )}
                      style={{
                        color: isRowSelected
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-text-secondary)',
                      }}
                    >
                      {rowNum}
                    </th>

                    {colLetters.map((colLetter, colIdx) => {
                      const address = `${colLetter}${rowNum}`;
                      const cellEval = evaluatedGrid.get(address)!;
                      const isActiveCell =
                        colIdx === clampedAnchor.col && rowIdx === clampedAnchor.row;
                      const isInRange =
                        colIdx >= minCol &&
                        colIdx <= maxCol &&
                        rowIdx >= minRow &&
                        rowIdx <= maxRow;
                      const isEditingCell = editingAddress === address && !disabled;
                      const isNumericDisplay =
                        cellEval.numericValue !== null && cellEval.error === null;

                      return (
                        <td
                          key={address}
                          data-cell-address={address}
                          data-selected={isActiveCell ? 'true' : undefined}
                          data-in-range={isInRange ? 'true' : undefined}
                          data-formula={cellEval.isFormula ? 'true' : undefined}
                          data-cell-error={cellEval.error ?? undefined}
                          className={cx(
                            'p-0.5 align-middle border-r last:border-r-0 border-[var(--prism-divider)]',
                            isInRange && !isActiveCell && 'bg-[var(--prism-divider)]'
                          )}
                        >
                          {isEditingCell ? (
                            <input
                              ref={inlineInputRef}
                              type="text"
                              aria-label={`Edit cell ${address}`}
                              data-testid={`spreadsheet-inline-input-${address}`}
                              value={formulaBarValue}
                              onChange={(event) => {
                                setDraftState({
                                  key: `${activeSheet.id}::${address}`,
                                  value: event.target.value,
                                });
                              }}
                              onKeyDown={handleInlineInputKeyDown(address)}
                              onBlur={handleInlineInputBlur(address)}
                              className="prism-crystal prism-focus-ring w-full min-w-0 h-8 px-2.5 rounded-lg font-mono text-xs border-0"
                              style={{
                                color: 'var(--prism-text-primary)',
                                boxShadow: 'inset 0 0 0 2px var(--prism-primary-main)',
                              }}
                            />
                          ) : (
                            <button
                              ref={registerCellRef(address)}
                              type="button"
                              tabIndex={isActiveCell ? 0 : -1}
                              data-testid={`spreadsheet-cell-${address}`}
                              aria-label={`Cell ${address}: ${cellEval.display || 'empty'}`}
                              aria-selected={isInRange}
                              onClick={(event) => handleCellClick(colIdx, rowIdx, event)}
                              onDoubleClick={() => handleCellDoubleClick(colIdx, rowIdx)}
                              onKeyDown={handleCellKeyDown(colIdx, rowIdx)}
                              className={cx(
                                'prism-focus-ring w-full min-w-0 h-8 px-2.5 rounded-lg flex items-center text-xs transition-colors cursor-pointer select-none',
                                isNumericDisplay
                                  ? 'justify-end font-mono tabular-nums'
                                  : 'justify-start',
                                isActiveCell
                                  ? 'prism-crystal font-semibold'
                                  : 'hover:bg-[var(--prism-divider)] font-medium'
                              )}
                              style={{
                                color: cellEval.error
                                  ? 'var(--prism-error-main)'
                                  : rowIdx === 0 && !cellEval.isFormula
                                    ? 'var(--prism-text-secondary)'
                                    : 'var(--prism-text-primary)',
                                boxShadow: isActiveCell
                                  ? 'inset 0 0 0 2px var(--prism-primary-main)'
                                  : isInRange
                                    ? 'inset 0 0 0 1px var(--prism-secondary-main)'
                                    : undefined,
                              }}
                            >
                              <span className="truncate">{cellEval.display}</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Sheet Tabs + Add Sheet + Live Range Status Readout */}
      <div
        data-testid="spreadsheet-footer"
        className={cx(
          footerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
          <div
            role="tablist"
            aria-label="Spreadsheet sheets"
            data-testid="spreadsheet-tablist"
            className="prism-well rounded-xl p-1 flex flex-wrap items-center gap-1 min-w-0 max-w-full"
          >
            {allSheets.map((sheet, sheetIdx) => {
              const isActiveTab = activeSheet?.id === sheet.id;
              return (
                <button
                  key={sheet.id}
                  ref={registerTabRef(sheet.id)}
                  type="button"
                  role="tab"
                  aria-selected={isActiveTab}
                  tabIndex={isActiveTab ? 0 : -1}
                  data-testid={`spreadsheet-sheet-tab-${sheet.id}`}
                  onClick={() => handleSelectSheet(sheet.id)}
                  onKeyDown={handleSheetTabKeyDown(sheetIdx)}
                  className={cx(
                    'prism-focus-ring rounded-lg px-2.5 py-1 text-xs cursor-pointer transition-colors truncate max-w-[180px]',
                    isActiveTab
                      ? 'prism-crystal font-semibold'
                      : 'font-medium hover:bg-[var(--prism-divider)]'
                  )}
                  style={{
                    color: isActiveTab
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {sheet.name}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={disabled}
            aria-label="Add sheet"
            data-testid="spreadsheet-add-sheet"
            onClick={handleAddSheet}
            className="prism-crystal prism-focus-ring rounded-xl px-2.5 py-1.5 inline-flex items-center gap-1 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Add Sheet</span>
          </button>
        </div>

        <div
          role="status"
          aria-live="polite"
          data-testid="spreadsheet-range-stats"
          className="prism-well rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums shrink-0"
          style={STYLE_TEXT_SECONDARY}
        >
          <span>
            Sum{' '}
            <strong
              data-testid="spreadsheet-stat-sum"
              className="font-semibold"
              style={STYLE_TEXT_PRIMARY}
            >
              {rangeStats.sumDisplay}
            </strong>
          </span>
          <span>
            Avg{' '}
            <strong
              data-testid="spreadsheet-stat-avg"
              className="font-semibold"
              style={STYLE_TEXT_PRIMARY}
            >
              {rangeStats.avgDisplay}
            </strong>
          </span>
          <span>
            Count{' '}
            <strong
              data-testid="spreadsheet-stat-count"
              className="font-semibold"
              style={STYLE_TEXT_PRIMARY}
            >
              {rangeStats.count}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}

export const FormulaSpreadsheetGrid = /*#__PURE__*/ memoWithDisplayName(FormulaSpreadsheetGridInner, 'FormulaSpreadsheetGrid');
