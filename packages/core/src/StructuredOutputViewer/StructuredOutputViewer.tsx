'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  ListTree,
  Table2,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, isSafeObjectKey } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_SUCCESS_DARK, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type JsonPrimitive = string | number | boolean | null;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export type StructuredOutputMode = 'tree' | 'table' | 'raw';

type StructuredOutputViewerBaseProps = Omit<BaseProps<HTMLDivElement>, 'onCopy'>;

export interface StructuredOutputViewerProps extends StructuredOutputViewerBaseProps {
  /** Structured JSON payload displayed across Tree, Table, and Raw modes. */
  data: JsonValue;
  /** Controlled active view mode ('tree' | 'table' | 'raw'). */
  mode?: StructuredOutputMode;
  /** Initial view mode when operating uncontrolled (defaults to 'tree'). */
  defaultMode?: StructuredOutputMode;
  /** Callback fired whenever the active view mode changes. */
  onModeChange?: (mode: StructuredOutputMode) => void;
  /** Heading rendered in the viewer slab header (defaults to 'Structured Output'). */
  title?: string;
  /** Initial expansion depth for Tree mode, clamped to 0..8 (defaults to 2). */
  defaultExpandedDepth?: number;
  /** Callback invoked with the formatted JSON string when Copy JSON is clicked. */
  onCopy?: (rawJson: string) => void;
}

const MAX_TREE_DEPTH = 12;
const COPY_FEEDBACK_DURATION_MS = 1800;

const MODE_OPTIONS: ReadonlyArray<{ mode: StructuredOutputMode; label: string }> = [
  { mode: 'tree', label: 'Tree' },
  { mode: 'table', label: 'Table' },
  { mode: 'raw', label: 'Raw' },
];

function isJsonArray(value: JsonValue): value is JsonArray {
  return Array.isArray(value);
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeJsonStringify(data: JsonValue, indent?: number): string {
  try {
    return JSON.stringify(data, null, indent);
  } catch {
    return '[Circular or unserializable JSON value]';
  }
}

function getSafeObjectEntries(obj: JsonObject): Array<{ key: string; value: JsonValue }> {
  const safeKeySet = new Set(Object.keys(obj).filter((k) => isSafeObjectKey(k)));
  const entries: Array<{ key: string; value: JsonValue }> = [];
  for (const [key, value] of Object.entries(obj)) {
    if (safeKeySet.has(key)) {
      entries.push({ key, value });
    }
  }
  return entries;
}

function describePrimitiveType(value: JsonPrimitive): string {
  return value === null ? 'null' : typeof value;
}

function renderModeIcon(mode: StructuredOutputMode): ReactNode {
  switch (mode) {
    case 'tree':
      return <ListTree className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />;
    case 'table':
      return <Table2 className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />;
    case 'raw':
      return <Code2 className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />;
  }
}

function renderPrimitiveValue(value: JsonPrimitive): ReactNode {
  if (value === null) {
    return (
      <span
        data-json-type="null"
        className="font-mono italic"
        style={STYLE_TEXT_SECONDARY}
      >
        null
      </span>
    );
  }
  if (typeof value === 'string') {
    return (
      <span
        data-json-type="string"
        className="font-mono break-all"
        style={STYLE_SUCCESS_DARK}
      >
        {`"${value}"`}
      </span>
    );
  }
  if (typeof value === 'number') {
    return (
      <span
        data-json-type="number"
        className="font-mono tabular-nums font-medium"
        style={STYLE_PRIMARY_MAIN}
      >
        {String(value)}
      </span>
    );
  }
  return (
    <span
      data-json-type="boolean"
      className="font-mono font-semibold"
      style={STYLE_INFO_MAIN}
    >
      {value ? 'true' : 'false'}
    </span>
  );
}

function renderTableCellValue(value: JsonValue): ReactNode {
  if (isJsonArray(value) || isJsonObject(value)) {
    return (
      <span
        data-json-type={isJsonArray(value) ? 'array' : 'object'}
        className="font-mono break-all"
        style={STYLE_TEXT_SECONDARY}
      >
        {safeJsonStringify(value)}
      </span>
    );
  }
  return renderPrimitiveValue(value);
}

interface JsonTreeNodeProps {
  value: JsonValue;
  label?: string;
  nodePath: string;
  depth: number;
  defaultExpandedDepth: number;
  expandedOverrides: ReadonlyMap<string, boolean>;
  onToggle: (nodePath: string, currentlyExpanded: boolean) => void;
}

function JsonTreeNode({
  value,
  label,
  nodePath,
  depth,
  defaultExpandedDepth,
  expandedOverrides,
  onToggle,
}: JsonTreeNodeProps) {
  if (!isJsonArray(value) && !isJsonObject(value)) {
    return (
      <div
        data-tree-node={nodePath}
        className="flex items-baseline gap-1.5 py-0.5 text-xs font-mono leading-relaxed"
      >
        {label !== undefined ? (
          <span className="font-semibold shrink-0" style={STYLE_TEXT_PRIMARY}>
            {label}:
          </span>
        ) : null}
        {renderPrimitiveValue(value)}
      </div>
    );
  }

  const isArr = isJsonArray(value);

  if (depth >= MAX_TREE_DEPTH) {
    return (
      <div
        data-tree-node={nodePath}
        data-max-depth-reached="true"
        className="flex items-baseline gap-1.5 py-0.5 text-xs font-mono leading-relaxed"
      >
        <span className="font-semibold shrink-0" style={STYLE_TEXT_PRIMARY}>
          {label}:
        </span>
        <span className="italic" style={STYLE_TEXT_SECONDARY}>
          {isArr
            ? `[Max depth ${MAX_TREE_DEPTH} reached]`
            : `{Max depth ${MAX_TREE_DEPTH} reached}`}
        </span>
      </div>
    );
  }

  const override = expandedOverrides.get(nodePath);
  const isExpanded = override !== undefined ? override : depth < defaultExpandedDepth;

  const childNodes: Array<{ childPath: string; childLabel: string; childValue: JsonValue }> = [];
  if (isArr) {
    value.forEach((item, idx) => {
      childNodes.push({
        childPath: `${nodePath}[${idx}]`,
        childLabel: `[${idx}]`,
        childValue: item,
      });
    });
  } else {
    const safeEntries = getSafeObjectEntries(value);
    for (const entry of safeEntries) {
      childNodes.push({
        childPath: `${nodePath}[${JSON.stringify(entry.key)}]`,
        childLabel: entry.key,
        childValue: entry.value,
      });
    }
  }

  const count = childNodes.length;
  const summaryText = isArr
    ? count === 1
      ? '[1 item]'
      : `[${count} items]`
    : count === 1
      ? '{1 key}'
      : `{${count} keys}`;

  return (
    <div data-tree-node={nodePath} className="text-xs font-mono leading-relaxed">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => onToggle(nodePath, isExpanded)}
        className="prism-focus-ring inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left cursor-pointer opacity-90 enabled:hover:opacity-100 transition-opacity"
        style={STYLE_TEXT_PRIMARY}
      >
        {isExpanded ? (
          <ChevronDown
            className="w-3.5 h-3.5 shrink-0"
            aria-hidden="true"
            style={STYLE_TEXT_SECONDARY}
          />
        ) : (
          <ChevronRight
            className="w-3.5 h-3.5 shrink-0"
            aria-hidden="true"
            style={STYLE_TEXT_SECONDARY}
          />
        )}
        <span className="font-semibold">
          {label !== undefined ? `${label}:` : isArr ? 'Array' : 'Object'}
        </span>
        <span className="text-[11px]" style={STYLE_TEXT_SECONDARY}>
          {summaryText}
        </span>
      </button>

      {isExpanded ? (
        <div
          className="pl-4 ml-2 border-l space-y-0.5"
          style={STYLE_BORDER_DIVIDER}
        >
          {childNodes.length === 0 ? (
            <div className="py-0.5 italic" style={STYLE_TEXT_DISABLED}>
              {isArr ? 'Empty array' : 'Empty object'}
            </div>
          ) : (
            childNodes.map((child) => (
              <JsonTreeNode
                key={child.childPath}
                value={child.childValue}
                label={child.childLabel}
                nodePath={child.childPath}
                depth={depth + 1}
                defaultExpandedDepth={defaultExpandedDepth}
                expandedOverrides={expandedOverrides}
                onToggle={onToggle}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

const headerClass = /*#__PURE__*/ stableClassName('structured-output-viewer', 'header');
const bodyClass = /*#__PURE__*/ stableClassName('structured-output-viewer', 'body');

function StructuredOutputViewerInner({
  data,
  mode,
  defaultMode = 'tree',
  onModeChange,
  title = 'Structured Output',
  defaultExpandedDepth = 2,
  onCopy,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: StructuredOutputViewerProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const panelId = `${baseId}-panel`;
  const override = useComponentOverride('StructuredOutputViewer');

  const safeExpandedDepth = Math.round(clampNumber(defaultExpandedDepth, 0, 8, 2));

  const [currentMode, setCurrentMode] = useControllableState<StructuredOutputMode>({
    value: mode,
    defaultValue: defaultMode,
    onChange: onModeChange,
  });

  const [expandedOverrides, setExpandedOverrides] = useState<ReadonlyMap<string, boolean>>(
    () => new Map()
  );
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const rawJson = useMemo(() => safeJsonStringify(data, 2), [data]);

  const handleToggleNode = useCallback((nodePath: string, currentlyExpanded: boolean) => {
    setExpandedOverrides((prev) => {
      const next = new Map(prev);
      next.set(nodePath, !currentlyExpanded);
      return next;
    });
  }, []);

  const handleCopyJson = useCallback(() => {
    try {
      const clipboard = navigator.clipboard;
      if (clipboard && typeof clipboard.writeText === 'function') {
        void Promise.resolve(clipboard.writeText(rawJson)).catch(() => undefined);
      }
    } catch {
      // Clipboard API unavailable or restricted; continue with callback and visual confirmation.
    }

    onCopy?.(rawJson);
    setCopied(true);
    setStatusMessage('JSON copied to clipboard.');

    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, COPY_FEEDBACK_DURATION_MS);
  }, [rawJson, onCopy]);

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const targetIndex = (currentIndex + delta + MODE_OPTIONS.length) % MODE_OPTIONS.length;
      const targetOption = MODE_OPTIONS[targetIndex] as {
        mode: StructuredOutputMode;
        label: string;
      };
      setCurrentMode(targetOption.mode);
    },
    [setCurrentMode]
  );

  const tableContent = useMemo<ReactNode>(() => {
    if (isJsonArray(data) && data.length > 0 && data.every((item) => isJsonObject(item))) {
      const columnSet = new Set<string>();
      const rows: Array<{ rowId: string; cells: Map<string, JsonValue> }> = [];

      data.forEach((rowObj, idx) => {
        const safeEntries = getSafeObjectEntries(rowObj);
        const cellMap = new Map<string, JsonValue>();
        for (const entry of safeEntries) {
          columnSet.add(entry.key);
          cellMap.set(entry.key, entry.value);
        }
        rows.push({ rowId: `row-${idx + 1}`, cells: cellMap });
      });

      const columns = Array.from(columnSet);
      if (columns.length === 0) {
        return (
          <div
            data-testid="structured-table-summary"
            className="prism-well rounded-2xl p-5 text-center space-y-1.5"
          >
            <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
              No Displayable Columns
            </p>
            <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
              Array objects contain no safe properties to display in table view.
            </p>
          </div>
        );
      }

      return (
        <div className="prism-well rounded-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b" style={STYLE_BORDER_DIVIDER}>
                {columns.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className="px-3.5 py-2.5 font-semibold whitespace-nowrap"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.rowId}
                  className="border-b last:border-b-0"
                  style={STYLE_BORDER_DIVIDER}
                >
                  {columns.map((col) => {
                    const cellVal = row.cells.get(col);
                    return (
                      <td
                        key={`${row.rowId}-${col}`}
                        className="px-3.5 py-2 align-top"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {cellVal === undefined ? (
                          <span style={STYLE_TEXT_DISABLED}>—</span>
                        ) : (
                          renderTableCellValue(cellVal)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (isJsonObject(data)) {
      const pairs = getSafeObjectEntries(data);
      return (
        <div className="prism-well rounded-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b" style={STYLE_BORDER_DIVIDER}>
                <th
                  scope="col"
                  className="px-3.5 py-2.5 font-semibold w-1/3"
                  style={STYLE_TEXT_PRIMARY}
                >
                  Key
                </th>
                <th
                  scope="col"
                  className="px-3.5 py-2.5 font-semibold"
                  style={STYLE_TEXT_PRIMARY}
                >
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {pairs.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-3.5 py-4 text-center italic"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Empty object — no properties to display.
                  </td>
                </tr>
              ) : (
                pairs.map((entry) => (
                  <tr
                    key={entry.key}
                    className="border-b last:border-b-0"
                    style={STYLE_BORDER_DIVIDER}
                  >
                    <th
                      scope="row"
                      className="px-3.5 py-2 font-semibold align-top whitespace-nowrap"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {entry.key}
                    </th>
                    <td className="px-3.5 py-2 align-top">
                      {renderTableCellValue(entry.value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (isJsonArray(data)) {
      const isEmpty = data.length === 0;
      return (
        <div
          data-testid="structured-table-summary"
          className="prism-well rounded-2xl p-5 text-center space-y-1.5"
        >
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            {isEmpty ? 'Empty Array' : 'Non-Object Array'}
          </p>
          <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
            {isEmpty
              ? 'No items are available to display in table view.'
              : `Table view requires an object or array of objects (${data.length} non-object items present).`}
          </p>
        </div>
      );
    }

    return (
      <div
        data-testid="structured-table-summary"
        className="prism-well rounded-2xl p-5 flex flex-col items-center text-center gap-2"
      >
        <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
          Scalar Value ({describePrimitiveType(data)})
        </p>
        <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
          Tabular view requires an object or array of objects.
        </p>
        <div className="prism-crystal rounded-xl px-3 py-1.5 text-xs">
          {renderPrimitiveValue(data)}
        </div>
      </div>
    );
  }, [data]);

  const merged = mergeProps({
    themeTarget: themeProps('structured-output-viewer', {
      mode: currentMode,
      copied,
    }),
    baseClassName: 'prism-slab w-full overflow-hidden flex flex-col',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const activeTabId = `${baseId}-tab-${currentMode}`;

  return (
    <div ref={ref} role="region" aria-labelledby={titleId} {...rest} {...merged}>
      <div
        className={cx(
          headerClass,
          'px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Braces className="w-4 h-4 shrink-0" aria-hidden="true" />
          </span>
          <h2
            id={titleId}
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Output view mode"
            className="prism-well rounded-full p-1 inline-flex items-center gap-1"
          >
            {MODE_OPTIONS.map((option, idx) => {
              const isSelected = currentMode === option.mode;
              return (
                <button
                  key={option.mode}
                  id={`${baseId}-tab-${option.mode}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={panelId}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setCurrentMode(option.mode)}
                  onKeyDown={(event) => handleTabKeyDown(event, idx)}
                  className={cx(
                    'prism-focus-ring h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                    isSelected ? 'prism-btn-primary' : 'opacity-75 enabled:hover:opacity-100'
                  )}
                  style={isSelected ? undefined : STYLE_TEXT_PRIMARY}
                >
                  {renderModeIcon(option.mode)}
                  <span className="relative z-10">{option.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-label={copied ? 'Copied JSON' : 'Copy JSON'}
            data-copied={copied ? 'true' : undefined}
            onClick={handleCopyJson}
            className={cx(
              'prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
              copied ? 'prism-emerald' : 'prism-btn-secondary'
            )}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={activeTabId}
        className={cx(bodyClass, 'p-4')}
      >
        {currentMode === 'tree' ? (
          <div className="prism-well rounded-2xl p-3.5 overflow-x-auto">
            <JsonTreeNode
              value={data}
              nodePath="$"
              depth={0}
              defaultExpandedDepth={safeExpandedDepth}
              expandedOverrides={expandedOverrides}
              onToggle={handleToggleNode}
            />
          </div>
        ) : currentMode === 'table' ? (
          tableContent
        ) : (
          <pre
            className="prism-well rounded-2xl p-4 overflow-x-auto text-xs font-mono leading-relaxed"
            style={STYLE_TEXT_PRIMARY}
          >
            <code>{rawJson}</code>
          </pre>
        )}
      </div>

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}

export const StructuredOutputViewer = /*#__PURE__*/ memoWithDisplayName(StructuredOutputViewerInner, 'StructuredOutputViewer');
