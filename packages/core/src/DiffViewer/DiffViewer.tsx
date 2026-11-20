'use client';

import { useMemo, type KeyboardEvent } from 'react';
import { CheckCircle2, FileDiff } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { computeLineDiff, type DiffLine } from '../utils/diffAlgorithm';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type DiffViewMode = 'split' | 'unified';

type DiffViewerBaseProps = Omit<BaseProps<HTMLDivElement>, 'children'>;

export interface DiffViewerProps extends DiffViewerBaseProps {
  /** Original (baseline) text or source code to compare. */
  original: string;
  /** Modified (target) text or source code to compare against original. */
  modified: string;
  /** Header label for the original pane/column. */
  originalLabel?: string;
  /** Header label for the modified pane/column. */
  modifiedLabel?: string;
  /** Controlled diff presentation mode ('split' | 'unified'). */
  viewMode?: DiffViewMode;
  /** Initial presentation mode when uncontrolled. */
  defaultViewMode?: DiffViewMode;
  /** Callback fired when the user switches between split and unified view modes. */
  onViewModeChange?: (mode: DiffViewMode) => void;
  /** Controlled toggle that normalizes leading/trailing and repeated inline whitespace. */
  ignoreWhitespace?: boolean;
  /** Initial ignore-whitespace setting when uncontrolled. */
  defaultIgnoreWhitespace?: boolean;
  /** Callback fired when the ignore-whitespace toggle changes. */
  onIgnoreWhitespaceChange?: (ignore: boolean) => void;
  /** Optional heading rendered inside the optical crystal header bar. */
  title?: string;
}

interface SplitDiffRow {
  id: string;
  left: DiffLine | null;
  right: DiffLine | null;
}

const VIEW_MODES: ReadonlyArray<{ mode: DiffViewMode; label: string }> = [
  { mode: 'split', label: 'Split' },
  { mode: 'unified', label: 'Unified' },
];

function buildSplitRows(lines: ReadonlyArray<DiffLine>): SplitDiffRow[] {
  const rows: SplitDiffRow[] = [];
  let removedBatch: DiffLine[] = [];
  let addedBatch: DiffLine[] = [];

  const flushBatch = () => {
    const pairCount = Math.max(removedBatch.length, addedBatch.length);
    for (let k = 0; k < pairCount; k += 1) {
      const left = removedBatch[k] ?? null;
      const right = addedBatch[k] ?? null;
      rows.push({
        id: `c-${left ? String(left.oldLineNumber) : 'x'}-${right ? String(right.newLineNumber) : 'x'}`,
        left,
        right,
      });
    }
    removedBatch = [];
    addedBatch = [];
  };

  for (const line of lines) {
    if (line.kind === 'unchanged') {
      flushBatch();
      rows.push({
        id: `u-${String(line.oldLineNumber)}-${String(line.newLineNumber)}`,
        left: line,
        right: line,
      });
    } else if (line.kind === 'removed') {
      removedBatch.push(line);
    } else {
      addedBatch.push(line);
    }
  }

  flushBatch();
  return rows;
}

function getSplitCellClasses(line: DiffLine | null): string {
  if (!line) {
    return 'bg-slate-400/10 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600';
  }
  if (line.kind === 'added') {
    return 'bg-emerald-500/12 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-100';
  }
  if (line.kind === 'removed') {
    return 'bg-rose-500/12 dark:bg-rose-500/15 text-rose-950 dark:text-rose-100';
  }
  return 'text-slate-800 dark:text-slate-200';
}

function getUnifiedRowClasses(kind: DiffLine['kind']): string {
  if (kind === 'added') {
    return 'bg-emerald-500/12 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-100';
  }
  if (kind === 'removed') {
    return 'bg-rose-500/12 dark:bg-rose-500/15 text-rose-950 dark:text-rose-100';
  }
  return 'text-slate-800 dark:text-slate-200';
}

function getMarkerClasses(kind: DiffLine['kind'] | null): string {
  if (kind === 'added') {
    return 'text-emerald-700 dark:text-emerald-300 font-semibold';
  }
  if (kind === 'removed') {
    return 'text-rose-700 dark:text-rose-300 font-semibold';
  }
  return 'text-slate-400 dark:text-slate-500';
}

function getMarkerGlyph(kind: DiffLine['kind'] | null): string {
  if (kind === 'added') return '+';
  if (kind === 'removed') return '-';
  return ' ';
}

export function DiffViewer({
  original,
  modified,
  originalLabel = 'Original',
  modifiedLabel = 'Modified',
  viewMode,
  defaultViewMode = 'split',
  onViewModeChange,
  ignoreWhitespace,
  defaultIgnoreWhitespace = false,
  onIgnoreWhitespaceChange,
  title = 'Diff Viewer',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DiffViewerProps) {
  const override = useComponentOverride('DiffViewer');

  const [activeViewMode, setActiveViewMode] = useControllableState<DiffViewMode>({
    value: viewMode,
    defaultValue: defaultViewMode,
    onChange: onViewModeChange,
  });

  const [whitespaceIgnored, setWhitespaceIgnored] = useControllableState<boolean>({
    value: ignoreWhitespace,
    defaultValue: defaultIgnoreWhitespace,
    onChange: onIgnoreWhitespaceChange,
  });

  const diff = useMemo(
    () => computeLineDiff(original, modified, whitespaceIgnored),
    [original, modified, whitespaceIgnored]
  );

  const splitRows = useMemo(
    () => (activeViewMode === 'split' ? buildSplitRows(diff.lines) : []),
    [activeViewMode, diff.lines]
  );

  const isIdentical = diff.additions === 0 && diff.deletions === 0;

  const handleModeKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentMode: DiffViewMode
  ) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      setActiveViewMode(currentMode === 'split' ? 'unified' : 'split');
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('diff-viewer', {
      viewMode: activeViewMode,
      ignoreWhitespace: whitespaceIgnored,
      identical: isIdentical,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-3.5 overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="prism-crystal rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="inline-flex items-center gap-2 min-w-0">
            <FileDiff
              aria-hidden="true"
              className="w-4 h-4 shrink-0 text-slate-600 dark:text-slate-300"
            />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight truncate">
              {title}
            </h3>
          </div>

          <div
            aria-label="Diff summary"
            className="flex flex-wrap items-center gap-1.5 text-xs font-mono tabular-nums"
          >
            <span
              data-diff-stat="additions"
              className="rounded-full px-2.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold tabular-nums"
            >
              +{diff.additions} additions
            </span>
            <span
              data-diff-stat="deletions"
              className="rounded-full px-2.5 py-0.5 bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-semibold tabular-nums"
            >
              -{diff.deletions} deletions
            </span>
            <span
              data-diff-stat="unchanged"
              className="prism-well rounded-full px-2.5 py-0.5 text-slate-600 dark:text-slate-300 font-medium tabular-nums"
            >
              {diff.unchanged} unchanged
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={whitespaceIgnored}
            onClick={() => setWhitespaceIgnored((prev) => !prev)}
            className={`prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
              whitespaceIgnored
                ? 'prism-emerald font-semibold'
                : 'prism-well text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Ignore whitespace
          </button>

          <div
            role="group"
            aria-label="Diff view mode"
            className="prism-crystal p-1 rounded-full inline-flex items-center gap-1"
          >
            {VIEW_MODES.map(({ mode, label }) => {
              const selected = activeViewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveViewMode(mode)}
                  onKeyDown={(e) => handleModeKeyDown(e, mode)}
                  className={`prism-focus-ring px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
                    selected
                      ? 'prism-well text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isIdentical ? (
        <div
          role="status"
          data-diff-status="identical"
          className="prism-crystal rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"
        >
          <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />
          <span>No differences detected</span>
        </div>
      ) : null}

      <div className="prism-well rounded-2xl overflow-hidden font-mono tabular-nums text-xs leading-6">
        {diff.lines.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No content to compare.
          </div>
        ) : activeViewMode === 'split' ? (
          <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
            <table
              aria-label={`${title} side-by-side diff`}
              className="w-full min-w-full border-collapse table-auto"
            >
              <thead>
                <tr className="border-b border-slate-300/40 dark:border-slate-700/50 bg-slate-200/40 dark:bg-slate-900/40 text-left text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <th colSpan={3} scope="colgroup" className="w-1/2 px-3 py-2 truncate">
                    {originalLabel}
                  </th>
                  <th
                    colSpan={3}
                    scope="colgroup"
                    className="w-1/2 px-3 py-2 border-l border-slate-300/40 dark:border-slate-700/50 truncate"
                  >
                    {modifiedLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {splitRows.map((row) => {
                  const leftTone = getSplitCellClasses(row.left);
                  const rightTone = getSplitCellClasses(row.right);
                  const leftKind = row.left ? row.left.kind : null;
                  const rightKind = row.right ? row.right.kind : null;

                  return (
                    <tr
                      key={row.id}
                      data-diff-row="split"
                      className="border-b border-slate-300/20 dark:border-slate-800/60 last:border-b-0 align-top"
                    >
                      <td
                        className={`w-11 select-none text-right pr-2 pl-2 text-[11px] text-slate-400 dark:text-slate-500 border-r border-slate-300/25 dark:border-slate-700/40 ${leftTone}`}
                      >
                        {row.left ? row.left.oldLineNumber : ''}
                      </td>
                      <td
                        aria-hidden="true"
                        className={`w-5 select-none text-center ${leftTone} ${getMarkerClasses(leftKind)}`}
                      >
                        {getMarkerGlyph(leftKind)}
                      </td>
                      <td
                        data-diff-pane="original"
                        data-diff-kind={leftKind ?? 'empty'}
                        className={`pr-3 pl-1 whitespace-pre ${leftTone}`}
                      >
                        {row.left ? row.left.content : ''}
                      </td>

                      <td
                        className={`w-11 select-none text-right pr-2 pl-2 text-[11px] text-slate-400 dark:text-slate-500 border-l border-r border-slate-300/40 dark:border-slate-700/50 ${rightTone}`}
                      >
                        {row.right ? row.right.newLineNumber : ''}
                      </td>
                      <td
                        aria-hidden="true"
                        className={`w-5 select-none text-center ${rightTone} ${getMarkerClasses(rightKind)}`}
                      >
                        {getMarkerGlyph(rightKind)}
                      </td>
                      <td
                        data-diff-pane="modified"
                        data-diff-kind={rightKind ?? 'empty'}
                        className={`pr-3 pl-1 whitespace-pre ${rightTone}`}
                      >
                        {row.right ? row.right.content : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
            <table
              aria-label={`${title} unified diff`}
              className="w-full border-collapse"
            >
              <thead>
                <tr className="border-b border-slate-300/40 dark:border-slate-700/50 bg-slate-200/40 dark:bg-slate-900/40 text-left text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <th scope="col" className="w-12 px-2 py-2 text-right">
                    Old
                  </th>
                  <th scope="col" className="w-12 px-2 py-2 text-right">
                    New
                  </th>
                  <th scope="col" aria-label="Change marker" className="w-6 px-1 py-2 text-center" />
                  <th scope="col" className="px-2 py-2">
                    {originalLabel} → {modifiedLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {diff.lines.map((line) => {
                  const rowKey = `${line.kind}-${String(line.oldLineNumber)}-${String(line.newLineNumber)}`;
                  const rowTone = getUnifiedRowClasses(line.kind);
                  return (
                    <tr
                      key={rowKey}
                      data-diff-row="unified"
                      data-diff-kind={line.kind}
                      className={`border-b border-slate-300/20 dark:border-slate-800/60 last:border-b-0 align-top ${rowTone}`}
                    >
                      <td className="w-12 select-none text-right px-2 text-[11px] text-slate-400 dark:text-slate-500 border-r border-slate-300/25 dark:border-slate-700/40">
                        {line.oldLineNumber ?? ''}
                      </td>
                      <td className="w-12 select-none text-right px-2 text-[11px] text-slate-400 dark:text-slate-500 border-r border-slate-300/25 dark:border-slate-700/40">
                        {line.newLineNumber ?? ''}
                      </td>
                      <td
                        aria-hidden="true"
                        className={`w-6 select-none text-center ${getMarkerClasses(line.kind)}`}
                      >
                        {getMarkerGlyph(line.kind)}
                      </td>
                      <td className="px-2 whitespace-pre-wrap break-all">{line.content}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

DiffViewer.displayName = 'DiffViewer';
