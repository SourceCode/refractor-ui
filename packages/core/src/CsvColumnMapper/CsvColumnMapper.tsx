'use client';

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { isSafeObjectKey, sanitizeCsvCell } from '../utils/sanitize';
import { STYLE_ERROR_MAIN, STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type CsvTargetFieldType = 'string' | 'email' | 'number';

export interface CsvTargetField {
  /** Stable target schema property key (prototype-polluting keys are rejected). */
  key: string;
  /** Human-readable column label shown in mapping selectors and preview table headers. */
  label: string;
  /** Whether a CSV source column must be mapped to this field and non-empty on each row. */
  required?: boolean;
  /** Expected value validation type (`'string' | 'email' | 'number'`). Defaults to `'string'`. */
  type?: CsvTargetFieldType;
}

export interface CsvColumnMapping {
  /** Parsed CSV source column header label. */
  sourceColumn: string;
  /** Assigned target schema field key, or `null` when ignored. */
  targetKey: string | null;
}

export interface CsvRowValidationError {
  /** Zero-based index of the parsed CSV data row (excluding header row). */
  rowIndex: number;
  /** Target schema field key that failed validation. */
  fieldKey: string;
  /** Human-readable inline validation error message. */
  message: string;
}

export interface CsvImportPayload {
  /** Validated, formula-sanitized row objects ready for downstream ingestion. */
  validRows: ReadonlyArray<Readonly<Record<string, string>>>;
  /** All row-level validation errors detected across the CSV dataset. */
  errors: ReadonlyArray<CsvRowValidationError>;
  /** Final source-column to target-field mappings applied at import time. */
  mappings: ReadonlyArray<CsvColumnMapping>;
}

type CsvColumnMapperBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface CsvColumnMapperProps extends CsvColumnMapperBaseProps {
  /** Visible heading in the optical slab header. Defaults to `'CSV Column Mapper'`. */
  title?: string;
  /** Target schema fields users map CSV headers into. */
  targetFields?: ReadonlyArray<CsvTargetField>;
  /** Initial CSV text in uncontrolled mode. Defaults to a realistic 4-row sample with 1 invalid row. */
  defaultCsvText?: string;
  /** Controlled CSV source text. */
  csvText?: string;
  /** Invoked whenever the CSV source text changes via paste, edit, upload, sample, or clear. */
  onCsvTextChange?: (csv: string) => void;
  /** Invoked when the user triggers `Import Valid Rows` with valid rows, errors, and active mappings. */
  onImport?: (payload: CsvImportPayload) => void;
  /** Disables file upload, editing, mapping selectors, auto-mapping, and import actions. Defaults to `false`. */
  disabled?: boolean;
}

interface ParsedCsvColumn {
  id: string;
  header: string;
  columnIndex: number;
}

interface ParsedCsvRow {
  rowKey: string;
  rowIndex: number;
  cells: ReadonlyArray<string>;
}

interface ParsedCsvDocument {
  columns: ReadonlyArray<ParsedCsvColumn>;
  rows: ReadonlyArray<ParsedCsvRow>;
  rejectedHeaders: ReadonlyArray<string>;
}

interface MappingOverrideState {
  signature: string;
  map: Map<string, string | null>;
}

interface DuplicateAssignment {
  field: CsvTargetField;
  sourceColumns: ReadonlyArray<string>;
}

interface EvaluatedCsvRow {
  rowKey: string;
  rowIndex: number;
  displayValues: Map<string, string>;
  sanitizedValues: Map<string, string>;
  errors: ReadonlyArray<CsvRowValidationError>;
  errorFieldKeys: Set<string>;
}

const DEFAULT_TITLE = 'CSV Column Mapper';

const DEFAULT_TARGET_FIELDS: ReadonlyArray<CsvTargetField> = [
  { key: 'email', label: 'Work Email', required: true, type: 'email' },
  { key: 'fullName', label: 'Full Name', required: true, type: 'string' },
  { key: 'planTier', label: 'Plan Tier', required: false, type: 'string' },
  { key: 'monthlyMrr', label: 'Monthly MRR', required: false, type: 'number' },
];

const DEFAULT_SAMPLE_CSV = [
  'email,full_name,plan_tier,monthly_mrr',
  'elena.vance@lumencloud.io,"Vance, Elena",Enterprise,4800',
  'marcus.chen@prismops.dev,Marcus Chen,Scale,1650',
  'invalid-email-address,Priya Nair,Growth,not-a-number',
  'soren.lindqvist@nordicgrid.se,Soren Lindqvist,Enterprise,6200',
].join('\n');

const DECIMAL_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

function normalizeIdentifier(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isValidEmailAddress(value: string): boolean {
  if (/\s/.test(value)) return false;
  const atIndex = value.indexOf('@');
  if (atIndex <= 0 || atIndex !== value.lastIndexOf('@')) return false;
  const domain = value.slice(atIndex + 1);
  if (
    domain.length < 3 ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.includes('..')
  ) {
    return false;
  }
  const lastDot = domain.lastIndexOf('.');
  return lastDot > 0 && domain.length - lastDot - 1 >= 2;
}

function isValidNumericValue(value: string): boolean {
  return DECIMAL_NUMBER_RE.test(value) && Number.isFinite(Number(value));
}

/**
 * Deterministic RFC-4180 character-by-character CSV parser supporting quoted fields,
 * escaped `""`, commas/newlines inside quotes, CRLF & LF, and blank line omission.
 */
function parseCsvRecords(rawText: string): string[][] {
  const input = rawText.startsWith('\uFEFF') ? rawText.slice(1) : rawText;
  if (input.trim().length === 0) {
    return [];
  }

  const records: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charAt(i);

    if (inQuotes) {
      if (ch === '"') {
        if (input.charAt(i + 1) === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"' && currentField.length === 0) {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && input.charAt(i + 1) === '\n') {
        i += 1;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some((cell) => cell.trim().length > 0)) {
        records.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += ch;
    }
  }

  currentRow.push(currentField);
  if (currentRow.some((cell) => cell.trim().length > 0)) {
    records.push(currentRow);
  }

  return records;
}

function parseCsvDocument(rawText: string): ParsedCsvDocument {
  const records = parseCsvRecords(rawText);
  if (records.length === 0) {
    return { columns: [], rows: [], rejectedHeaders: [] };
  }

  const headerRow = records[0]!;
  const columns: ParsedCsvColumn[] = [];
  const rejectedHeaders: string[] = [];
  const seenHeaderCounts = new Map<string, number>();

  for (let colIdx = 0; colIdx < headerRow.length; colIdx += 1) {
    const rawHeader = headerRow[colIdx]!.trim();
    const baseHeader = rawHeader.length > 0 ? rawHeader : `Column ${colIdx + 1}`;
    if (!isSafeObjectKey(baseHeader) || !isSafeObjectKey(baseHeader.toLowerCase())) {
      rejectedHeaders.push(baseHeader);
      continue;
    }

    const normalizedKey = baseHeader.toLowerCase();
    const prevCount = seenHeaderCounts.get(normalizedKey) ?? 0;
    seenHeaderCounts.set(normalizedKey, prevCount + 1);
    const displayHeader = prevCount > 0 ? `${baseHeader} (${prevCount + 1})` : baseHeader;

    columns.push({
      id: `col-${colIdx}-${displayHeader}`,
      header: displayHeader,
      columnIndex: colIdx,
    });
  }

  const rows: ParsedCsvRow[] = [];
  for (let i = 1; i < records.length; i += 1) {
    rows.push({
      rowKey: `csv-row-${i}`,
      rowIndex: i - 1,
      cells: records[i]!,
    });
  }

  return { columns, rows, rejectedHeaders };
}

function computeAutoMappings(
  columns: ReadonlyArray<ParsedCsvColumn>,
  fields: ReadonlyArray<CsvTargetField>
): Map<string, string | null> {
  const result = new Map<string, string | null>();
  const usedTargets = new Set<string>();

  const normalizedFields = fields.map((field) => ({
    key: field.key,
    normKey: normalizeIdentifier(field.key),
    normLabel: normalizeIdentifier(field.label),
  }));

  for (const col of columns) {
    const normCol = normalizeIdentifier(col.header);
    const exactMatch = normalizedFields.find(
      (field) =>
        !usedTargets.has(field.key) &&
        normCol.length > 0 &&
        (field.normKey === normCol || field.normLabel === normCol)
    );
    if (exactMatch) {
      result.set(col.id, exactMatch.key);
      usedTargets.add(exactMatch.key);
    } else {
      result.set(col.id, null);
    }
  }

  for (const col of columns) {
    if (result.get(col.id) !== null) continue;
    const normCol = normalizeIdentifier(col.header);
    if (normCol.length < 3) continue;
    const partialMatch = normalizedFields.find(
      (field) =>
        !usedTargets.has(field.key) &&
        ((field.normKey.length >= 3 && normCol.includes(field.normKey)) ||
          field.normKey.includes(normCol) ||
          field.normLabel.includes(normCol))
    );
    if (partialMatch) {
      result.set(col.id, partialMatch.key);
      usedTargets.add(partialMatch.key);
    }
  }

  return result;
}

const headerClass = /*#__PURE__*/ stableClassName('csv-column-mapper', 'header');
const sourceClass = /*#__PURE__*/ stableClassName('csv-column-mapper', 'source');
const mappingClass = /*#__PURE__*/ stableClassName('csv-column-mapper', 'mapping');
const previewClass = /*#__PURE__*/ stableClassName('csv-column-mapper', 'preview');
const footerClass = /*#__PURE__*/ stableClassName('csv-column-mapper', 'footer');

function CsvColumnMapperInner({
  title = DEFAULT_TITLE,
  targetFields,
  defaultCsvText,
  csvText,
  onCsvTextChange,
  onImport,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  'aria-label': ariaLabel,
  ...rest
}: CsvColumnMapperProps) {
  const headingId = useId();
  const sourcePanelId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const override = useComponentOverride('CsvColumnMapper');

  const isControlled = csvText !== undefined;
  const [uncontrolledCsv, setUncontrolledCsv] = useState<string>(
    () => defaultCsvText ?? DEFAULT_SAMPLE_CSV
  );
  const [isSourceOpen, setIsSourceOpen] = useState<boolean>(true);
  const [mappingOverride, setMappingOverride] = useState<MappingOverrideState | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeCsvText = isControlled ? csvText : uncontrolledCsv;
  const safeTitle = title.trim().length > 0 ? title : DEFAULT_TITLE;

  const safeTargetFields = useMemo<ReadonlyArray<CsvTargetField>>(() => {
    const source = targetFields ?? DEFAULT_TARGET_FIELDS;
    const seenKeys = new Set<string>();
    const filtered: CsvTargetField[] = [];
    for (const field of source) {
      const trimmedKey = field.key.trim();
      if (
        trimmedKey.length === 0 ||
        !isSafeObjectKey(trimmedKey) ||
        !isSafeObjectKey(trimmedKey.toLowerCase()) ||
        seenKeys.has(trimmedKey)
      ) {
        continue;
      }
      seenKeys.add(trimmedKey);
      filtered.push({
        key: trimmedKey,
        label: field.label.trim().length > 0 ? field.label : trimmedKey,
        required: field.required,
        type: field.type ?? 'string',
      });
    }
    return filtered;
  }, [targetFields]);

  const fieldByKey = useMemo(() => {
    const map = new Map<string, CsvTargetField>();
    for (const field of safeTargetFields) {
      map.set(field.key, field);
    }
    return map;
  }, [safeTargetFields]);

  const parsed = useMemo(() => parseCsvDocument(activeCsvText), [activeCsvText]);

  const headerSignature = useMemo(() => {
    const colPart = parsed.columns.map((col) => `${col.id}:${col.header}`).join('|');
    const fieldPart = safeTargetFields.map((field) => field.key).join('|');
    return `${colPart}||${fieldPart}`;
  }, [parsed.columns, safeTargetFields]);

  const autoMappingMap = useMemo(
    () => computeAutoMappings(parsed.columns, safeTargetFields),
    [parsed.columns, safeTargetFields]
  );

  const activeMappingMap = useMemo(() => {
    if (mappingOverride && mappingOverride.signature === headerSignature) {
      return mappingOverride.map;
    }
    return autoMappingMap;
  }, [autoMappingMap, headerSignature, mappingOverride]);

  const {
    targetToColumns,
    duplicateAssignments,
    duplicateTargetKeys,
    missingRequiredFields,
    activePreviewFields,
    currentMappings,
  } = useMemo(() => {
    const byTarget = new Map<string, ParsedCsvColumn[]>();
    const mappings: CsvColumnMapping[] = [];

    for (const col of parsed.columns) {
      const rawTarget = activeMappingMap.get(col.id) ?? null;
      const targetKey = rawTarget !== null && fieldByKey.has(rawTarget) ? rawTarget : null;
      mappings.push({ sourceColumn: col.header, targetKey });
      if (targetKey !== null) {
        const list = byTarget.get(targetKey);
        if (list) {
          list.push(col);
        } else {
          byTarget.set(targetKey, [col]);
        }
      }
    }

    const duplicates: DuplicateAssignment[] = [];
    const dupKeys = new Set<string>();
    for (const [targetKey, cols] of byTarget.entries()) {
      if (cols.length > 1) {
        const field = fieldByKey.get(targetKey)!;
        duplicates.push({
          field,
          sourceColumns: cols.map((col) => col.header),
        });
        dupKeys.add(targetKey);
      }
    }

    const missingRequired = safeTargetFields.filter(
      (field) => field.required === true && !byTarget.has(field.key)
    );
    const previewFields = safeTargetFields.filter((field) => byTarget.has(field.key));

    return {
      targetToColumns: byTarget,
      duplicateAssignments: duplicates,
      duplicateTargetKeys: dupKeys,
      missingRequiredFields: missingRequired,
      activePreviewFields: previewFields,
      currentMappings: mappings,
    };
  }, [activeMappingMap, fieldByKey, parsed.columns, safeTargetFields]);

  const { evaluatedRows, validRows, allErrors } = useMemo(() => {
    const evaluated: EvaluatedCsvRow[] = [];
    const valid: Array<Readonly<Record<string, string>>> = [];
    const errors: CsvRowValidationError[] = [];

    for (const row of parsed.rows) {
      const displayValues = new Map<string, string>();
      const sanitizedValues = new Map<string, string>();
      const rowErrors: CsvRowValidationError[] = [];
      const errorFieldKeys = new Set<string>();

      for (const field of activePreviewFields) {
        const mappedCols = targetToColumns.get(field.key)!;
        const primaryCol = mappedCols[0]!;
        const rawCell = (row.cells[primaryCol.columnIndex] ?? '').trim();

        displayValues.set(field.key, rawCell);
        sanitizedValues.set(field.key, sanitizeCsvCell(rawCell));

        if (field.required && rawCell.length === 0) {
          rowErrors.push({
            rowIndex: row.rowIndex,
            fieldKey: field.key,
            message: `${field.label} is required.`,
          });
          errorFieldKeys.add(field.key);
        } else if (rawCell.length > 0 && field.type === 'email' && !isValidEmailAddress(rawCell)) {
          rowErrors.push({
            rowIndex: row.rowIndex,
            fieldKey: field.key,
            message: `${field.label} "${rawCell}" is not a valid email address.`,
          });
          errorFieldKeys.add(field.key);
        } else if (rawCell.length > 0 && field.type === 'number' && !isValidNumericValue(rawCell)) {
          rowErrors.push({
            rowIndex: row.rowIndex,
            fieldKey: field.key,
            message: `${field.label} "${rawCell}" must be a valid number.`,
          });
          errorFieldKeys.add(field.key);
        }
      }

      evaluated.push({
        rowKey: row.rowKey,
        rowIndex: row.rowIndex,
        displayValues,
        sanitizedValues,
        errors: rowErrors,
        errorFieldKeys,
      });

      if (rowErrors.length === 0) {
        valid.push(Object.freeze(Object.fromEntries(sanitizedValues.entries())));
      } else {
        errors.push(...rowErrors);
      }
    }

    return {
      evaluatedRows: evaluated,
      validRows: valid,
      allErrors: errors,
    };
  }, [activePreviewFields, parsed.rows, targetToColumns]);

  const errorRowCount = evaluatedRows.length - validRows.length;
  const hasSchemaIssues = missingRequiredFields.length > 0 || duplicateAssignments.length > 0;
  const canImport = !disabled && !hasSchemaIssues && validRows.length > 0;

  const updateCsvText = useCallback(
    (nextText: string) => {
      if (!isControlled) {
        setUncontrolledCsv(nextText);
      }
      onCsvTextChange?.(nextText);
    },
    [isControlled, onCsvTextChange]
  );

  const handleLoadSample = useCallback(() => {
    setMappingOverride(null);
    updateCsvText(DEFAULT_SAMPLE_CSV);
    setStatusMessage('Loaded 4-row sample CSV dataset.');
  }, [updateCsvText]);

  const handleClear = useCallback(() => {
    setMappingOverride(null);
    updateCsvText('');
    setStatusMessage('Cleared CSV source data.');
  }, [updateCsvText]);

  const handleFileChange = useCallback(
    async (event: ReactChangeEvent<HTMLInputElement>) => {
      const inputEl = event.currentTarget;
      const file = inputEl.files?.[0];
      inputEl.value = '';
      if (!file || disabled) return;
      try {
        const text = await file.text();
        setMappingOverride(null);
        updateCsvText(text);
        setStatusMessage(`Loaded file "${file.name}".`);
      } catch {
        setStatusMessage(`Unable to read CSV file "${file.name}".`);
      }
    },
    [disabled, updateCsvText]
  );

  const handleColumnMappingChange = useCallback(
    (columnId: string, nextValue: string) => {
      if (disabled) return;
      const nextMap = new Map(activeMappingMap);
      nextMap.set(columnId, nextValue.length > 0 ? nextValue : null);
      setMappingOverride({
        signature: headerSignature,
        map: nextMap,
      });
      setStatusMessage(null);
    },
    [activeMappingMap, disabled, headerSignature]
  );

  const handleAutoMap = useCallback(() => {
    setMappingOverride({
      signature: headerSignature,
      map: new Map(autoMappingMap),
    });
    let matchedCount = 0;
    for (const mappedKey of autoMappingMap.values()) {
      if (mappedKey !== null) matchedCount += 1;
    }
    setStatusMessage(`Auto-mapped ${matchedCount} of ${parsed.columns.length} columns.`);
  }, [autoMappingMap, headerSignature, parsed.columns.length]);

  const handleImport = useCallback(() => {
    onImport?.({
      validRows,
      errors: allErrors,
      mappings: currentMappings,
    });
    const skippedNote =
      errorRowCount > 0 ? ` (${errorRowCount} invalid row${errorRowCount === 1 ? '' : 's'} skipped)` : '';
    setStatusMessage(
      `Imported ${validRows.length} valid row${validRows.length === 1 ? '' : 's'}${skippedNote}.`
    );
  }, [allErrors, currentMappings, errorRowCount, onImport, validRows]);

  const handleTextareaKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) return;
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && canImport) {
        event.preventDefault();
        handleImport();
      }
    },
    [canImport, handleImport]
  );

  const defaultAnnouncement = useMemo(() => {
    if (parsed.columns.length === 0) {
      return 'Upload or paste CSV data to begin schema column mapping.';
    }
    if (hasSchemaIssues) {
      return 'Resolve schema mapping alerts before importing valid rows.';
    }
    return `${validRows.length} valid row${validRows.length === 1 ? '' : 's'} ready to import.`;
  }, [hasSchemaIssues, parsed.columns.length, validRows.length]);

  const merged = mergeProps({
    themeTarget: themeProps('csv-column-mapper', {
      disabled: disabled || undefined,
      empty: parsed.columns.length === 0 || undefined,
      hasErrors: hasSchemaIssues || errorRowCount > 0 || undefined,
      ready: canImport || undefined,
    }),
    baseClassName: 'prism-slab w-full max-w-full min-w-0 flex flex-col p-4 sm:p-5 gap-3.5',
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
      {/* Header Bar */}
      <div
        className={cx(
          headerClass,
          'prism-slab rounded-2xl px-3.5 py-3 flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <FileSpreadsheet aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h3
              id={headingId}
              className="m-0 text-sm font-semibold tracking-tight truncate min-w-0"
              style={STYLE_TEXT_PRIMARY}
            >
              {safeTitle}
            </h3>

            <span
              data-testid="csv-column-count"
              className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {parsed.columns.length} {parsed.columns.length === 1 ? 'column' : 'columns'}
            </span>

            <span
              data-testid="csv-row-count"
              className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {parsed.rows.length} {parsed.rows.length === 1 ? 'row' : 'rows'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Upload CSV file"
            data-testid="csv-file-input"
            disabled={disabled}
            onChange={handleFileChange}
            className="sr-only"
          />

          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="prism-crystal prism-focus-ring rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={STYLE_TEXT_PRIMARY}
          >
            <Upload aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Upload CSV</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={handleLoadSample}
            className="prism-crystal prism-focus-ring rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={STYLE_PRIMARY_MAIN}
          >
            <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Load Sample</span>
          </button>

          <button
            type="button"
            disabled={disabled || activeCsvText.length === 0}
            onClick={handleClear}
            className="prism-crystal prism-focus-ring rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={STYLE_TEXT_SECONDARY}
          >
            <Trash2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Collapsible CSV Source Editor */}
      <div
        className={cx(
          sourceClass,
          'prism-crystal rounded-2xl p-3 flex flex-col gap-2 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span
            className="text-xs font-semibold tracking-tight"
            style={STYLE_TEXT_PRIMARY}
          >
            CSV Source Data
          </span>

          <button
            type="button"
            aria-expanded={isSourceOpen}
            aria-controls={sourcePanelId}
            onClick={() => setIsSourceOpen((prev) => !prev)}
            className="prism-well prism-focus-ring rounded-full px-2.5 py-1 inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
            style={STYLE_TEXT_SECONDARY}
          >
            {isSourceOpen ? (
              <>
                <ChevronUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Hide Source</span>
              </>
            ) : (
              <>
                <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Show Source</span>
              </>
            )}
          </button>
        </div>

        {isSourceOpen && (
          <div id={sourcePanelId} className="min-w-0 max-w-full">
            <textarea
              aria-label="CSV source data"
              rows={5}
              disabled={disabled}
              value={activeCsvText}
              placeholder="Paste RFC-4180 CSV headers and rows here..."
              onChange={(event) => {
                setStatusMessage(null);
                updateCsvText(event.target.value);
              }}
              onKeyDown={handleTextareaKeyDown}
              className="prism-well prism-focus-ring w-full min-w-0 rounded-xl p-3 font-mono text-xs leading-relaxed resize-y border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            />
          </div>
        )}
      </div>

      {/* Security & Schema Validation Banners */}
      {parsed.rejectedHeaders.length > 0 && (
        <div
          role="alert"
          data-testid="csv-rejected-headers-banner"
          className="rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs min-w-0 max-w-full"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--prism-warning-main) 14%, transparent)',
            border: '1px solid color-mix(in srgb, var(--prism-warning-main) 45%, transparent)',
            color: 'var(--prism-text-primary)',
          }}
        >
          <AlertTriangle
            aria-hidden="true"
            className="w-4 h-4 shrink-0 mt-0.5"
            style={STYLE_WARNING_MAIN}
          />
          <span className="min-w-0 break-words">
            Ignored unsafe header key{parsed.rejectedHeaders.length === 1 ? '' : 's'}:{' '}
            <strong className="font-mono">{parsed.rejectedHeaders.join(', ')}</strong>.
          </span>
        </div>
      )}

      {parsed.columns.length > 0 && missingRequiredFields.length > 0 && (
        <div
          role="alert"
          data-testid="csv-missing-required-banner"
          className="rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs min-w-0 max-w-full"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--prism-warning-main) 14%, transparent)',
            border: '1px solid color-mix(in srgb, var(--prism-warning-main) 45%, transparent)',
            color: 'var(--prism-text-primary)',
          }}
        >
          <AlertTriangle
            aria-hidden="true"
            className="w-4 h-4 shrink-0 mt-0.5"
            style={STYLE_WARNING_MAIN}
          />
          <span className="min-w-0 break-words">
            Missing required target field{missingRequiredFields.length === 1 ? '' : 's'}:{' '}
            <strong className="font-semibold">
              {missingRequiredFields.map((field) => field.label).join(', ')}
            </strong>
            .
          </span>
        </div>
      )}

      {duplicateAssignments.length > 0 && (
        <div
          role="alert"
          data-testid="csv-duplicate-mapping-banner"
          className="rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs min-w-0 max-w-full"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--prism-error-main) 14%, transparent)',
            border: '1px solid color-mix(in srgb, var(--prism-error-main) 45%, transparent)',
            color: 'var(--prism-text-primary)',
          }}
        >
          <XCircle
            aria-hidden="true"
            className="w-4 h-4 shrink-0 mt-0.5"
            style={STYLE_ERROR_MAIN}
          />
          <span className="min-w-0 break-words">
            Duplicate target assignment:{' '}
            <strong className="font-semibold">
              {duplicateAssignments
                .map((dup) => `${dup.field.label} (${dup.sourceColumns.join(' & ')})`)
                .join('; ')}
            </strong>
            . Map each target field at most once.
          </span>
        </div>
      )}

      {/* Column Mapping Grid */}
      <div className={cx(mappingClass, 'flex flex-col gap-2.5 min-w-0 max-w-full')}>
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span
            className="text-xs font-semibold tracking-tight"
            style={STYLE_TEXT_PRIMARY}
          >
            Column Mapping
          </span>

          <button
            type="button"
            disabled={disabled || parsed.columns.length === 0}
            onClick={handleAutoMap}
            className="prism-crystal prism-focus-ring rounded-full px-3 py-1 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={STYLE_INFO_MAIN}
          >
            <Sparkles aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Auto-Map Headers</span>
          </button>
        </div>

        {parsed.columns.length === 0 ? (
          <div
            data-testid="csv-empty-state"
            className="prism-well rounded-2xl px-4 py-6 text-center text-xs min-w-0 max-w-full"
            style={STYLE_TEXT_SECONDARY}
          >
            No CSV headers detected. Paste CSV rows above, upload a `.csv` file, or click Load
            Sample.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 min-w-0 max-w-full">
            {parsed.columns.map((col) => {
              const mappedKey = activeMappingMap.get(col.id) ?? null;
              const mappedField = mappedKey !== null ? fieldByKey.get(mappedKey) : undefined;
              const isDuplicate = mappedKey !== null && duplicateTargetKeys.has(mappedKey);
              const firstSample = (parsed.rows[0]?.cells[col.columnIndex] ?? '').trim();

              return (
                <div
                  key={col.id}
                  data-testid={`csv-mapping-card-${col.columnIndex}`}
                  className="prism-crystal rounded-2xl p-3 flex flex-col gap-2 min-w-0"
                  style={
                    isDuplicate
                      ? {
                          boxShadow:
                            'inset 0 0 0 1.5px color-mix(in srgb, var(--prism-error-main) 65%, transparent)',
                        }
                      : undefined
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
                    <span
                      className="font-mono text-xs font-semibold truncate min-w-0"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {col.header}
                    </span>

                    {isDuplicate ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--prism-error-main) 16%, transparent)',
                          color: 'var(--prism-error-main)',
                        }}
                      >
                        Duplicate
                      </span>
                    ) : mappedField?.required ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--prism-info-main) 15%, transparent)',
                          color: 'var(--prism-info-main)',
                        }}
                      >
                        Required
                      </span>
                    ) : mappedField ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--prism-success-main) 16%, transparent)',
                          color: 'var(--prism-success-dark)',
                        }}
                      >
                        Mapped
                      </span>
                    ) : (
                      <span
                        className="prism-well rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        Ignored
                      </span>
                    )}
                  </div>

                  <span
                    className="text-[11px] font-mono truncate min-w-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {firstSample.length > 0 ? `Sample: ${firstSample}` : 'Sample: (empty)'}
                  </span>

                  <select
                    aria-label={`Map column ${col.header}`}
                    disabled={disabled}
                    value={mappedKey ?? ''}
                    onChange={(event) => handleColumnMappingChange(col.id, event.target.value)}
                    className="prism-well prism-focus-ring w-full min-w-0 rounded-xl px-2.5 py-1.5 text-xs font-medium border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    <option value="">Ignore Column</option>
                    {safeTargetFields.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                        {field.required ? ' (Required)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row-Level Preview & Validation Table */}
      {parsed.columns.length > 0 && (
        <div className={cx(previewClass, 'flex flex-col gap-2 min-w-0 max-w-full')}>
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <span
              className="text-xs font-semibold tracking-tight"
              style={STYLE_TEXT_PRIMARY}
            >
              Row Preview &amp; Validation
            </span>

            <span
              className="text-[11px] font-mono tabular-nums"
              style={STYLE_TEXT_SECONDARY}
            >
              {activePreviewFields.length} mapped{' '}
              {activePreviewFields.length === 1 ? 'field' : 'fields'}
            </span>
          </div>

          <div className="prism-well rounded-2xl p-2 min-w-0 max-w-full">
            <div className="overflow-x-auto">
              <table
                aria-label="CSV validation preview"
                className="w-full border-collapse text-xs"
              >
                <thead>
                  <tr className="border-b border-[var(--prism-divider)]">
                    <th
                      scope="col"
                      className="px-3 py-2 text-left font-mono text-[11px] font-semibold whitespace-nowrap"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      Row #
                    </th>
                    {activePreviewFields.map((field) => (
                      <th
                        key={field.key}
                        scope="col"
                        className="px-3 py-2 text-left text-[11px] font-semibold whitespace-nowrap"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span>{field.label}</span>
                          {field.required && (
                            <span
                              aria-label="Required"
                              style={STYLE_ERROR_MAIN}
                            >
                              *
                            </span>
                          )}
                        </span>
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-[11px] font-semibold whitespace-nowrap"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-[11px] font-semibold whitespace-nowrap"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      Validation Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--prism-divider)]">
                  {evaluatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activePreviewFields.length + 3}
                        className="px-3 py-5 text-center text-xs"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        Header row parsed. Add data rows to preview validation results.
                      </td>
                    </tr>
                  ) : (
                    evaluatedRows.map((evRow) => {
                      const hasRowError = evRow.errors.length > 0;
                      return (
                        <tr
                          key={evRow.rowKey}
                          data-testid={`csv-preview-row-${evRow.rowIndex}`}
                          data-row-status={hasRowError ? 'error' : 'valid'}
                        >
                          <th
                            scope="row"
                            className="px-3 py-2 text-left font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            {evRow.rowIndex + 1}
                          </th>

                          {activePreviewFields.map((field) => {
                            const displayValue = evRow.displayValues.get(field.key)!;
                            const cellHasError = evRow.errorFieldKeys.has(field.key);
                            return (
                              <td
                                key={field.key}
                                className="px-3 py-2 text-xs font-mono whitespace-nowrap"
                                style={{
                                  color: cellHasError
                                    ? 'var(--prism-error-main)'
                                    : 'var(--prism-text-primary)',
                                  backgroundColor: cellHasError
                                    ? 'color-mix(in srgb, var(--prism-error-main) 10%, transparent)'
                                    : undefined,
                                }}
                              >
                                {displayValue.length > 0 ? displayValue : '—'}
                              </td>
                            );
                          })}

                          <td className="px-3 py-2 whitespace-nowrap">
                            {hasRowError ? (
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
                                <span>Error</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                                style={{
                                  backgroundColor:
                                    'color-mix(in srgb, var(--prism-success-main) 16%, transparent)',
                                  border:
                                    '1px solid color-mix(in srgb, var(--prism-success-main) 45%, transparent)',
                                  color: 'var(--prism-success-dark)',
                                }}
                              >
                                <CheckCircle2 aria-hidden="true" className="w-3 h-3 shrink-0" />
                                <span>Valid</span>
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-2 text-xs min-w-[200px]">
                            {hasRowError ? (
                              <span style={STYLE_ERROR_MAIN}>
                                {evRow.errors.map((err) => err.message).join(' ')}
                              </span>
                            ) : (
                              <span style={STYLE_TEXT_SECONDARY}>
                                Ready to import
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
      )}

      {/* Footer Status & Import Trigger */}
      <div
        className={cx(
          footerClass,
          'flex flex-wrap items-center justify-between gap-3 pt-1 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <span
            data-testid="csv-valid-count"
            className="rounded-full px-2.5 py-1 text-xs font-mono font-semibold tabular-nums shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--prism-success-main) 16%, transparent)',
              color: 'var(--prism-success-dark)',
            }}
          >
            {validRows.length} valid
          </span>

          <span
            data-testid="csv-error-count"
            className="rounded-full px-2.5 py-1 text-xs font-mono font-semibold tabular-nums shrink-0"
            style={
              errorRowCount > 0
                ? {
                    backgroundColor:
                      'color-mix(in srgb, var(--prism-error-main) 16%, transparent)',
                    color: 'var(--prism-error-main)',
                  }
                : {
                    backgroundColor: 'var(--prism-well-start)',
                    color: 'var(--prism-text-secondary)',
                  }
            }
          >
            {errorRowCount} {errorRowCount === 1 ? 'error' : 'errors'}
          </span>

          <p
            role="status"
            aria-live="polite"
            data-testid="csv-import-status"
            className="m-0 text-xs min-w-0 break-words"
            style={STYLE_TEXT_SECONDARY}
          >
            {statusMessage ?? defaultAnnouncement}
          </p>
        </div>

        <button
          type="button"
          disabled={!canImport}
          onClick={handleImport}
          className="prism-btn-primary prism-focus-ring rounded-full px-4 py-2 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Import Valid Rows</span>
        </button>
      </div>
    </div>
  );
}

export const CsvColumnMapper = /*#__PURE__*/ memoWithDisplayName(CsvColumnMapperInner, 'CsvColumnMapper');
