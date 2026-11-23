'use client';

import { useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  CloudOff,
  Code2,
  GitBranch,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_SECONDARY_MAIN, STYLE_SUCCESS_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type StatusSyncState = 'synced' | 'syncing' | 'dirty' | 'offline';

export type StatusBarTone =
  | 'neutral'
  | 'primary'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'info';

export interface WorkspaceStatusItem {
  /** Stable segment identifier emitted to onSelectSegment when clicked. */
  id: string;
  /** Primary display label for the status segment. */
  label: string;
  /** Optional secondary value readout displayed next to the label. */
  value?: string;
  /** Horizontal alignment zone inside the status bar ('left' | 'right', defaults to 'right'). */
  align?: 'left' | 'right';
  /** Semantic optical tone mapped strictly to --prism-* tokens (defaults to 'neutral'). */
  tone?: StatusBarTone;
  /** Optional tooltip text surfaced on pointer hover and assistive title inspection. */
  tooltip?: string;
  /** Whether the item renders as an interactive button invoking onSelectSegment (defaults to true). */
  interactive?: boolean;
}

export interface WorkspaceStatusBarProps extends BaseProps<HTMLDivElement> {
  /** Active Git branch name displayed in the left optical crystal pill (defaults to 'main'). */
  branch?: string;
  /** Repository synchronization status reflected by icon, label, and --prism-* color token (defaults to 'synced'). */
  syncState?: StatusSyncState;
  /** Count of active workspace errors clamped to non-negative integers (defaults to 0). */
  errorsCount?: number;
  /** Count of active workspace warnings clamped to non-negative integers (defaults to 2). */
  warningsCount?: number;
  /** Active editor cursor line number clamped to >= 1 (defaults to 142). */
  cursorLine?: number;
  /** Active editor cursor column number clamped to >= 1 (defaults to 28). */
  cursorColumn?: number;
  /** Active document character encoding label (defaults to 'UTF-8'). */
  encoding?: string;
  /** Active editor language mode label (defaults to 'TypeScript React'). */
  language?: string;
  /** Optional background job status label (for example 'Indexing 238 symbols'). */
  backgroundTaskLabel?: string;
  /** Optional background job completion percentage in 0..100 rendered as a compact inline progressbar. */
  backgroundTaskProgressPct?: number;
  /** Extensible custom left- or right-aligned telemetry segments. */
  extraItems?: ReadonlyArray<WorkspaceStatusItem>;
  /** Callback invoked with the clicked segment identifier whenever any interactive segment is activated. */
  onSelectSegment?: (segmentId: string) => void;
}

interface SyncVisualMeta {
  label: string;
  ariaLabel: string;
  colorVar: string;
}

interface ToneVisualMeta {
  indicatorColorVar: string;
  textColorVar: string;
  showIndicator: boolean;
}

interface NormalizedExtraItem {
  reactKey: string;
  segmentId: string;
  label: string;
  value: string | null;
  align: 'left' | 'right';
  tone: StatusBarTone;
  tooltip: string | undefined;
  interactive: boolean;
}

const DEFAULT_BRANCH = 'main';
const DEFAULT_ENCODING = 'UTF-8';
const DEFAULT_LANGUAGE = 'TypeScript React';

function normalizeCount(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(value));
}

function normalizeCoordinate(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.trunc(value));
}

function getSyncVisualMeta(state: StatusSyncState): SyncVisualMeta {
  switch (state) {
    case 'synced':
      return {
        label: 'Synced',
        ariaLabel: 'Sync state: Synced',
        colorVar: 'var(--prism-success-main)',
      };
    case 'syncing':
      return {
        label: 'Syncing',
        ariaLabel: 'Sync state: Syncing',
        colorVar: 'var(--prism-info-main)',
      };
    case 'dirty':
      return {
        label: 'Dirty',
        ariaLabel: 'Sync state: Uncommitted changes',
        colorVar: 'var(--prism-warning-main)',
      };
    case 'offline':
      return {
        label: 'Offline',
        ariaLabel: 'Sync state: Offline',
        colorVar: 'var(--prism-error-main)',
      };
  }
}

function getToneVisualMeta(tone: StatusBarTone): ToneVisualMeta {
  switch (tone) {
    case 'neutral':
      return {
        indicatorColorVar: 'var(--prism-text-secondary)',
        textColorVar: 'var(--prism-text-primary)',
        showIndicator: false,
      };
    case 'primary':
      return {
        indicatorColorVar: 'var(--prism-primary-main)',
        textColorVar: 'var(--prism-primary-main)',
        showIndicator: true,
      };
    case 'emerald':
      return {
        indicatorColorVar: 'var(--prism-success-main)',
        textColorVar: 'var(--prism-success-main)',
        showIndicator: true,
      };
    case 'amber':
      return {
        indicatorColorVar: 'var(--prism-warning-main)',
        textColorVar: 'var(--prism-warning-main)',
        showIndicator: true,
      };
    case 'rose':
      return {
        indicatorColorVar: 'var(--prism-error-main)',
        textColorVar: 'var(--prism-error-main)',
        showIndicator: true,
      };
    case 'info':
      return {
        indicatorColorVar: 'var(--prism-info-main)',
        textColorVar: 'var(--prism-info-main)',
        showIndicator: true,
      };
  }
}

function renderSyncIcon(state: StatusSyncState, colorVar: string) {
  const style = { color: colorVar };
  switch (state) {
    case 'synced':
      return (
        <CheckCircle2
          aria-hidden="true"
          data-testid="workspace-status-sync-icon"
          className="w-3.5 h-3.5 shrink-0"
          style={style}
        />
      );
    case 'syncing':
      return (
        <RefreshCw
          aria-hidden="true"
          data-testid="workspace-status-sync-icon"
          className="w-3.5 h-3.5 shrink-0 animate-spin motion-reduce:animate-none"
          style={style}
        />
      );
    case 'dirty':
      return (
        <CircleDot
          aria-hidden="true"
          data-testid="workspace-status-sync-icon"
          className="w-3.5 h-3.5 shrink-0"
          style={style}
        />
      );
    case 'offline':
      return (
        <CloudOff
          aria-hidden="true"
          data-testid="workspace-status-sync-icon"
          className="w-3.5 h-3.5 shrink-0"
          style={style}
        />
      );
  }
}

const leftZoneClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'left');
const rightZoneClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'right');
const segmentBaseClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'segment');
const branchClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'branch');
const syncClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'sync');
const diagnosticsClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'diagnostics');
const taskClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'task');
const progressClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'progress');
const cursorClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'cursor');
const encodingClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'encoding');
const languageClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'language');
const extraItemClass = /*#__PURE__*/ stableClassName('workspace-status-bar', 'item');

function WorkspaceStatusBarInner({
  branch = DEFAULT_BRANCH,
  syncState = 'synced',
  errorsCount = 0,
  warningsCount = 2,
  cursorLine = 142,
  cursorColumn = 28,
  encoding = DEFAULT_ENCODING,
  language = DEFAULT_LANGUAGE,
  backgroundTaskLabel,
  backgroundTaskProgressPct,
  extraItems,
  onSelectSegment,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: WorkspaceStatusBarProps) {
  const override = useComponentOverride('WorkspaceStatusBar');

  const resolvedBranch = branch.trim() || DEFAULT_BRANCH;
  const resolvedEncoding = encoding.trim() || DEFAULT_ENCODING;
  const resolvedLanguage = language.trim() || DEFAULT_LANGUAGE;
  const resolvedTaskLabel = backgroundTaskLabel?.trim() || null;

  const safeErrors = normalizeCount(errorsCount, 0);
  const safeWarnings = normalizeCount(warningsCount, 0);
  const safeLine = normalizeCoordinate(cursorLine, 1);
  const safeColumn = normalizeCoordinate(cursorColumn, 1);

  const safeTaskProgressPct =
    backgroundTaskProgressPct !== undefined &&
    Number.isFinite(backgroundTaskProgressPct)
      ? Math.round(clampNumber(backgroundTaskProgressPct, 0, 100, 0))
      : null;

  const showBackgroundTask =
    resolvedTaskLabel !== null || safeTaskProgressPct !== null;

  const syncMeta = getSyncVisualMeta(syncState);

  const { leftExtraItems, rightExtraItems } = useMemo<{
    leftExtraItems: ReadonlyArray<NormalizedExtraItem>;
    rightExtraItems: ReadonlyArray<NormalizedExtraItem>;
  }>(() => {
    if (!extraItems || extraItems.length === 0) {
      return { leftExtraItems: [], rightExtraItems: [] };
    }

    const left: NormalizedExtraItem[] = [];
    const right: NormalizedExtraItem[] = [];
    const seenKeys = new Map<string, number>();

    for (const item of extraItems) {
      const trimmedId = item.id.trim();
      const trimmedLabel = item.label.trim();
      const rawId = trimmedId || trimmedLabel || 'item';
      const baseKey = `extra:${rawId}`;
      const seen = seenKeys.get(baseKey) ?? 0;
      seenKeys.set(baseKey, seen + 1);
      const reactKey = seen === 0 ? baseKey : `${baseKey}#${seen + 1}`;

      const normalized: NormalizedExtraItem = {
        reactKey,
        segmentId: rawId,
        label: trimmedLabel || rawId,
        value: item.value?.trim() || null,
        align: item.align === 'left' ? 'left' : 'right',
        tone: item.tone ?? 'neutral',
        tooltip: item.tooltip?.trim() || undefined,
        interactive: item.interactive !== false,
      };

      if (normalized.align === 'left') {
        left.push(normalized);
      } else {
        right.push(normalized);
      }
    }

    return { leftExtraItems: left, rightExtraItems: right };
  }, [extraItems]);

  const handleSelectSegment = useCallback(
    (segmentId: string) => {
      onSelectSegment?.(segmentId);
    },
    [onSelectSegment]
  );

  const merged = mergeProps({
    themeTarget: themeProps('workspace-status-bar', {
      syncState,
      hasErrors: safeErrors > 0,
      hasWarnings: safeWarnings > 0,
      hasTask: showBackgroundTask,
    }),
    baseClassName:
      'prism-slab w-full max-w-full min-w-0 rounded-xl flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const interactivePillClass = cx(
    segmentBaseClass,
    'prism-well prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium min-w-0 max-w-full cursor-pointer transition-[color,background-color,border-color,opacity,transform] hover:brightness-105 active:scale-[0.98]'
  );

  const staticPillClass = cx(
    segmentBaseClass,
    'prism-well inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium min-w-0 max-w-full'
  );

  const renderExtraItem = (item: NormalizedExtraItem) => {
    const toneMeta = getToneVisualMeta(item.tone);
    const content = (
      <>
        {toneMeta.showIndicator ? (
          <span
            aria-hidden="true"
            data-testid={`workspace-status-item-dot-${item.segmentId}`}
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: toneMeta.indicatorColorVar }}
          />
        ) : null}
        <span
          className="truncate min-w-0"
          style={{ color: toneMeta.textColorVar }}
        >
          {item.label}
        </span>
        {item.value !== null ? (
          <span
            className="font-mono tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {item.value}
          </span>
        ) : null}
      </>
    );

    if (item.interactive) {
      return (
        <button
          key={item.reactKey}
          type="button"
          title={item.tooltip}
          aria-label={
            item.value !== null ? `${item.label}: ${item.value}` : item.label
          }
          data-testid={`workspace-status-item-${item.segmentId}`}
          data-segment-id={item.segmentId}
          data-tone={item.tone}
          data-interactive="true"
          onClick={() => handleSelectSegment(item.segmentId)}
          className={cx(extraItemClass, interactivePillClass)}
        >
          {content}
        </button>
      );
    }

    return (
      <span
        key={item.reactKey}
        title={item.tooltip}
        data-testid={`workspace-status-item-${item.segmentId}`}
        data-segment-id={item.segmentId}
        data-tone={item.tone}
        data-interactive="false"
        className={cx(extraItemClass, staticPillClass)}
      >
        {content}
      </span>
    );
  };

  const diagnosticsAriaLabel = `${safeErrors} ${safeErrors === 1 ? 'error' : 'errors'}, ${safeWarnings} ${safeWarnings === 1 ? 'warning' : 'warnings'}`;
  const isTaskComplete =
    safeTaskProgressPct !== null && safeTaskProgressPct >= 100;

  return (
    <div
      ref={ref}
      role="status"
      aria-label="Workspace status bar"
      {...rest}
      {...merged}
    >
      <div
        data-testid="workspace-status-left"
        className={cx(
          leftZoneClass,
          'flex flex-wrap items-center gap-1.5 min-w-0 max-w-full'
        )}
      >
        <button
          type="button"
          aria-label={`Git branch: ${resolvedBranch}`}
          data-testid="workspace-status-branch"
          data-segment-id="branch"
          onClick={() => handleSelectSegment('branch')}
          className={cx(
            segmentBaseClass,
            branchClass,
            'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium min-w-0 max-w-full cursor-pointer transition-[color,background-color,border-color,opacity,transform] hover:brightness-105 active:scale-[0.98]'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          <GitBranch
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0"
            style={STYLE_PRIMARY_MAIN}
          />
          <span className="font-mono truncate max-w-[180px] min-w-0">
            {resolvedBranch}
          </span>
        </button>

        <button
          type="button"
          aria-label={syncMeta.ariaLabel}
          data-testid="workspace-status-sync"
          data-segment-id="sync"
          data-sync-state={syncState}
          onClick={() => handleSelectSegment('sync')}
          className={cx(syncClass, interactivePillClass)}
          style={{ color: syncMeta.colorVar }}
        >
          {renderSyncIcon(syncState, syncMeta.colorVar)}
          <span className="shrink-0">{syncMeta.label}</span>
        </button>

        <button
          type="button"
          aria-label={diagnosticsAriaLabel}
          data-testid="workspace-status-diagnostics"
          data-segment-id="diagnostics"
          onClick={() => handleSelectSegment('diagnostics')}
          className={cx(diagnosticsClass, interactivePillClass)}
        >
          <span
            data-testid="workspace-status-errors"
            className="inline-flex items-center gap-1 font-mono tabular-nums shrink-0"
            style={{
              color:
                safeErrors > 0
                  ? 'var(--prism-error-main)'
                  : 'var(--prism-text-secondary)',
            }}
          >
            <XCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>{safeErrors}</span>
          </span>
          <span
            data-testid="workspace-status-warnings"
            className="inline-flex items-center gap-1 font-mono tabular-nums shrink-0"
            style={{
              color:
                safeWarnings > 0
                  ? 'var(--prism-warning-main)'
                  : 'var(--prism-text-secondary)',
            }}
          >
            <AlertTriangle
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
            />
            <span>{safeWarnings}</span>
          </span>
        </button>

        {showBackgroundTask ? (
          <button
            type="button"
            aria-label={
              resolvedTaskLabel !== null && safeTaskProgressPct !== null
                ? `${resolvedTaskLabel} (${safeTaskProgressPct}%)`
                : (resolvedTaskLabel ??
                  `Background task progress (${safeTaskProgressPct}%)`)
            }
            data-testid="workspace-status-task"
            data-segment-id="background-task"
            onClick={() => handleSelectSegment('background-task')}
            className={cx(taskClass, interactivePillClass)}
          >
            {isTaskComplete ? (
              <CheckCircle2
                aria-hidden="true"
                data-testid="workspace-status-task-icon"
                className="w-3.5 h-3.5 shrink-0"
                style={STYLE_SUCCESS_MAIN}
              />
            ) : (
              <Loader2
                aria-hidden="true"
                data-testid="workspace-status-task-icon"
                className="w-3.5 h-3.5 shrink-0 animate-spin motion-reduce:animate-none"
                style={STYLE_INFO_MAIN}
              />
            )}

            {resolvedTaskLabel !== null ? (
              <span
                data-testid="workspace-status-task-label"
                className="truncate max-w-[200px] min-w-0"
                style={STYLE_TEXT_PRIMARY}
              >
                {resolvedTaskLabel}
              </span>
            ) : null}

            {safeTaskProgressPct !== null ? (
              <>
                <span
                  role="progressbar"
                  aria-label={resolvedTaskLabel ?? 'Background task progress'}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={safeTaskProgressPct}
                  aria-valuetext={`${safeTaskProgressPct}%`}
                  data-testid="workspace-status-task-progress"
                  className={cx(
                    progressClass,
                    'prism-well relative inline-flex h-1.5 w-14 shrink-0 overflow-hidden rounded-full'
                  )}
                >
                  <span
                    data-testid="workspace-status-task-progress-fill"
                    className="block h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-200"
                    style={{
                      width: `${safeTaskProgressPct}%`,
                      backgroundColor: isTaskComplete
                        ? 'var(--prism-success-main)'
                        : 'var(--prism-info-main)',
                    }}
                  />
                </span>
                <span
                  data-testid="workspace-status-task-pct"
                  className="font-mono tabular-nums shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {safeTaskProgressPct}%
                </span>
              </>
            ) : null}
          </button>
        ) : null}

        {leftExtraItems.map(renderExtraItem)}
      </div>

      <div
        data-testid="workspace-status-right"
        className={cx(
          rightZoneClass,
          'flex flex-wrap items-center gap-1.5 min-w-0 max-w-full sm:justify-end'
        )}
      >
        <button
          type="button"
          aria-label={`Cursor position: Line ${safeLine}, Column ${safeColumn}`}
          data-testid="workspace-status-cursor"
          data-segment-id="cursor"
          onClick={() => handleSelectSegment('cursor')}
          className={cx(cursorClass, interactivePillClass)}
          style={STYLE_TEXT_PRIMARY}
        >
          <span className="font-mono tabular-nums shrink-0">
            Ln {safeLine}, Col {safeColumn}
          </span>
        </button>

        <button
          type="button"
          aria-label={`File encoding: ${resolvedEncoding}`}
          data-testid="workspace-status-encoding"
          data-segment-id="encoding"
          onClick={() => handleSelectSegment('encoding')}
          className={cx(encodingClass, interactivePillClass)}
          style={STYLE_TEXT_SECONDARY}
        >
          <span className="font-mono shrink-0">{resolvedEncoding}</span>
        </button>

        <button
          type="button"
          aria-label={`Language mode: ${resolvedLanguage}`}
          data-testid="workspace-status-language"
          data-segment-id="language"
          onClick={() => handleSelectSegment('language')}
          className={cx(languageClass, interactivePillClass)}
          style={STYLE_TEXT_PRIMARY}
        >
          <Code2
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0"
            style={STYLE_SECONDARY_MAIN}
          />
          <span className="truncate max-w-[160px] min-w-0">
            {resolvedLanguage}
          </span>
        </button>

        {rightExtraItems.map(renderExtraItem)}
      </div>
    </div>
  );
}

export const WorkspaceStatusBar = /*#__PURE__*/ memoWithDisplayName(WorkspaceStatusBarInner, 'WorkspaceStatusBar');
