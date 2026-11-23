'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { Check, CheckCheck, FileDiff, X, XCircle } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type DiffHunkLineKind = 'context' | 'add' | 'remove';

export interface DiffHunkLine {
  /** Diff classification for this source line ('context' | 'add' | 'remove'). */
  kind: DiffHunkLineKind;
  /** Original 1-based line number (omitted for added lines). */
  oldLine?: number;
  /** Modified 1-based line number (omitted for removed lines). */
  newLine?: number;
  /** Literal line text rendered strictly as escaped React text. */
  content: string;
}

export type DiffHunkStatus = 'pending' | 'accepted' | 'rejected';

export interface DiffHunk {
  /** Stable unique identifier for the hunk. */
  id: string;
  /** Unified diff range header (for example `@@ -12,4 +12,6 @@`). */
  header: string;
  /** Ordered lines belonging to this hunk. */
  lines: DiffHunkLine[];
  /** Optional externally provided status (defaults to 'pending'). */
  status?: DiffHunkStatus;
}

export interface InlineDiffReviewerProps extends BaseProps<HTMLDivElement> {
  /** Repository-relative or absolute file path displayed in the monospace header. */
  filePath: string;
  /** Ordered list of proposed diff hunks for review. */
  hunks: DiffHunk[];
  /** Callback fired when an individual hunk is accepted or rejected. */
  onHunkDecision?: (hunkId: string, decision: 'accepted' | 'rejected') => void;
  /** Callback fired when the bulk Accept All button is activated. */
  onAcceptAll?: () => void;
  /** Callback fired when the bulk Reject All button is activated. */
  onRejectAll?: () => void;
  /** When true, hides bulk and per-hunk decision controls for read-only inspection. */
  readOnly?: boolean;
}

interface KeyedDiffHunkLine {
  rowKey: string;
  line: DiffHunkLine;
}

function buildKeyedHunkLines(
  hunkId: string,
  lines: ReadonlyArray<DiffHunkLine>
): KeyedDiffHunkLine[] {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const signature = `${hunkId}:${line.kind}:${line.oldLine ?? 'x'}:${line.newLine ?? 'x'}:${line.content}`;
    const count = seen.get(signature) ?? 0;
    seen.set(signature, count + 1);
    return {
      rowKey: `${signature}#${count}`,
      line,
    };
  });
}

function getLineMarker(kind: DiffHunkLineKind): string {
  switch (kind) {
    case 'add':
      return '+';
    case 'remove':
      return '-';
    case 'context':
      return ' ';
  }
}

function getLineRowClass(kind: DiffHunkLineKind): string {
  switch (kind) {
    case 'add':
      return 'bg-emerald-500/12 dark:bg-emerald-500/15';
    case 'remove':
      return 'bg-rose-500/12 dark:bg-rose-500/15';
    case 'context':
      return '';
  }
}

function getLineMarkerColor(kind: DiffHunkLineKind): string {
  switch (kind) {
    case 'add':
      return 'var(--prism-emerald-text, var(--prism-success-main))';
    case 'remove':
      return 'var(--prism-rose-text, var(--prism-error-main))';
    case 'context':
      return 'var(--prism-text-disabled)';
  }
}

function getHunkBorderToken(status: DiffHunkStatus): string {
  switch (status) {
    case 'accepted':
      return 'var(--prism-emerald-border, var(--prism-success-main))';
    case 'rejected':
      return 'var(--prism-rose-border, var(--prism-error-main))';
    case 'pending':
      return 'var(--prism-divider)';
  }
}

function formatLineNumber(lineNumber: number | undefined): string {
  if (lineNumber === undefined || !Number.isFinite(lineNumber)) {
    return '';
  }
  return String(Math.trunc(lineNumber));
}

function InlineDiffReviewerInner({
  filePath,
  hunks,
  onHunkDecision,
  onAcceptAll,
  onRejectAll,
  readOnly = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: InlineDiffReviewerProps) {
  const override = useComponentOverride('InlineDiffReviewer');

  const [localDecisions, setLocalDecisions] = useState<Map<string, DiffHunkStatus>>(
    () => new Map<string, DiffHunkStatus>()
  );

  const resolvedHunks = useMemo(
    () =>
      hunks.map((hunk) => {
        const status: DiffHunkStatus = localDecisions.get(hunk.id) ?? hunk.status ?? 'pending';
        return {
          hunk,
          status,
          keyedLines: buildKeyedHunkLines(hunk.id, hunk.lines),
        };
      }),
    [hunks, localDecisions]
  );

  const resolvedCount = useMemo(
    () => resolvedHunks.filter((entry) => entry.status !== 'pending').length,
    [resolvedHunks]
  );

  const handleHunkDecision = useCallback(
    (hunkId: string, decision: 'accepted' | 'rejected') => {
      setLocalDecisions((prev) => {
        const next = new Map<string, DiffHunkStatus>(prev);
        next.set(hunkId, decision);
        return next;
      });
      onHunkDecision?.(hunkId, decision);
    },
    [onHunkDecision]
  );

  const handleAcceptAll = useCallback(() => {
    setLocalDecisions((prev) => {
      const next = new Map<string, DiffHunkStatus>(prev);
      for (const hunk of hunks) {
        next.set(hunk.id, 'accepted');
      }
      return next;
    });
    onAcceptAll?.();
  }, [hunks, onAcceptAll]);

  const handleRejectAll = useCallback(() => {
    setLocalDecisions((prev) => {
      const next = new Map<string, DiffHunkStatus>(prev);
      for (const hunk of hunks) {
        next.set(hunk.id, 'rejected');
      }
      return next;
    });
    onRejectAll?.();
  }, [hunks, onRejectAll]);

  const isEmpty = hunks.length === 0;
  const allReviewed = !isEmpty && resolvedCount === hunks.length;

  const merged = mergeProps({
    themeTarget: themeProps('inline-diff-reviewer', {
      readOnly,
      empty: isEmpty,
      allReviewed,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-4 overflow-hidden w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('inline-diff-reviewer', 'header');
  const hunkClass = stableClassName('inline-diff-reviewer', 'hunk');
  const hunkHeaderClass = stableClassName('inline-diff-reviewer', 'hunk-header');
  const badgeClass = stableClassName('inline-diff-reviewer', 'badge');
  const emptyClass = stableClassName('inline-diff-reviewer', 'empty');

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        className={cx(
          headerClass,
          'prism-crystal rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3'
        )}
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <FileDiff
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={STYLE_TEXT_SECONDARY}
          />
          <code
            data-testid="inline-diff-filepath"
            className="font-mono text-xs sm:text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {filePath}
          </code>
          <span
            role="status"
            aria-live="polite"
            data-testid="inline-diff-counter"
            className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {resolvedCount} / {hunks.length} reviewed
          </span>
        </div>

        {!readOnly && !isEmpty ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="prism-btn-primary prism-focus-ring inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            >
              <CheckCheck aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
              <span className="relative z-10">Accept All</span>
            </button>
            <button
              type="button"
              onClick={handleRejectAll}
              className="prism-btn-secondary prism-focus-ring inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            >
              <XCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Reject All</span>
            </button>
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="inline-diff-empty"
          className={cx(emptyClass, 'prism-well rounded-2xl px-5 py-8 text-center space-y-1')}
        >
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            No diff hunks to review
          </p>
          <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
            There are no proposed changes for this file.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {resolvedHunks.map(({ hunk, status, keyedLines }) => (
            <section
              key={hunk.id}
              aria-label={`Diff hunk ${hunk.header}`}
              data-hunk-id={hunk.id}
              data-hunk-status={status}
              className={cx(hunkClass, 'prism-well rounded-2xl overflow-hidden border')}
              style={{ borderColor: getHunkBorderToken(status) }}
            >
              <div
                className={cx(
                  hunkHeaderClass,
                  'px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b'
                )}
                style={STYLE_BORDER_DIVIDER}
              >
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <code
                    className="font-mono text-xs font-medium truncate"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {hunk.header}
                  </code>

                  {status === 'accepted' ? (
                    <span
                      data-hunk-badge="accepted"
                      className={cx(
                        badgeClass,
                        'prism-emerald inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0'
                      )}
                    >
                      <Check aria-hidden="true" className="w-3 h-3 shrink-0" />
                      <span>Accepted</span>
                    </span>
                  ) : status === 'rejected' ? (
                    <span
                      data-hunk-badge="rejected"
                      className={cx(
                        badgeClass,
                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0'
                      )}
                      style={{
                        backgroundColor: 'var(--prism-rose-bg, var(--prism-error-main))',
                        color: 'var(--prism-rose-contrast, var(--prism-error-contrast))',
                        borderColor: 'var(--prism-rose-border, var(--prism-error-main))',
                      }}
                    >
                      <X aria-hidden="true" className="w-3 h-3 shrink-0" />
                      <span>Rejected</span>
                    </span>
                  ) : (
                    <span
                      data-hunk-badge="pending"
                      className={cx(
                        badgeClass,
                        'prism-crystal inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium shrink-0'
                      )}
                      style={STYLE_TEXT_SECONDARY}
                    >
                      Pending
                    </span>
                  )}
                </div>

                {!readOnly ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-pressed={status === 'accepted'}
                      onClick={() => handleHunkDecision(hunk.id, 'accepted')}
                      className={cx(
                        'prism-focus-ring inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]',
                        status === 'accepted' ? 'prism-emerald font-semibold' : 'prism-crystal'
                      )}
                      style={
                        status === 'accepted'
                          ? undefined
                          : { color: 'var(--prism-text-primary)' }
                      }
                    >
                      <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      <span>Accept</span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={status === 'rejected'}
                      onClick={() => handleHunkDecision(hunk.id, 'rejected')}
                      className={cx(
                        'prism-focus-ring inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]',
                        status === 'rejected' ? 'border font-semibold' : 'prism-crystal'
                      )}
                      style={
                        status === 'rejected'
                          ? {
                              backgroundColor: 'var(--prism-rose-bg, var(--prism-error-main))',
                              color: 'var(--prism-rose-contrast, var(--prism-error-contrast))',
                              borderColor: 'var(--prism-rose-border, var(--prism-error-main))',
                            }
                          : { color: 'var(--prism-text-primary)' }
                      }
                    >
                      <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      <span>Reject</span>
                    </button>
                  </div>
                ) : null}
              </div>

              {keyedLines.length === 0 ? (
                <div
                  className="px-4 py-3 font-mono text-xs"
                  style={STYLE_TEXT_SECONDARY}
                >
                  No lines in this hunk.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table
                    aria-label={`${filePath} ${hunk.header}`}
                    className="w-full border-collapse font-mono tabular-nums text-xs leading-6"
                  >
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Old line</th>
                        <th scope="col">New line</th>
                        <th scope="col">Change</th>
                        <th scope="col">Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keyedLines.map(({ rowKey, line }) => (
                        <tr
                          key={rowKey}
                          data-line-kind={line.kind}
                          className={cx('align-top border-b last:border-b-0', getLineRowClass(line.kind))}
                          style={STYLE_BORDER_DIVIDER}
                        >
                          <td
                            data-col="old-line"
                            className="w-12 select-none text-right px-2 text-[11px] border-r"
                            style={{
                              color: 'var(--prism-text-secondary)',
                              borderColor: 'var(--prism-divider)',
                            }}
                          >
                            {formatLineNumber(line.oldLine)}
                          </td>
                          <td
                            data-col="new-line"
                            className="w-12 select-none text-right px-2 text-[11px] border-r"
                            style={{
                              color: 'var(--prism-text-secondary)',
                              borderColor: 'var(--prism-divider)',
                            }}
                          >
                            {formatLineNumber(line.newLine)}
                          </td>
                          <td
                            aria-hidden="true"
                            data-col="marker"
                            className="w-6 select-none text-center font-semibold"
                            style={{ color: getLineMarkerColor(line.kind) }}
                          >
                            {getLineMarker(line.kind)}
                          </td>
                          <td
                            data-col="content"
                            className="px-2 whitespace-pre"
                            style={STYLE_TEXT_PRIMARY}
                          >
                            {line.content}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export const InlineDiffReviewer = memo(InlineDiffReviewerInner);
InlineDiffReviewer.displayName = 'InlineDiffReviewer';
