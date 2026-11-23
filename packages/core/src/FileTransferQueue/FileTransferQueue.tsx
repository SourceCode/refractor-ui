'use client';

import {
  memo,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Activity,
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileArchive,
  FolderInput,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_ERROR_MAIN, STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type FileTransferOpKind = 'copy' | 'move' | 'upload' | 'extract';
export type FileTransferStatus = 'running' | 'paused' | 'queued' | 'completed' | 'canceled';

export interface FileTransferJob {
  /** Unique transfer job identifier. */
  id: string;
  /** Filename or archive bundle name being transferred. */
  name: string;
  /** File transfer operation kind ('copy' | 'move' | 'upload' | 'extract'). */
  operation: FileTransferOpKind;
  /** Source path or origin URI rendered as literal truncation-safe text. */
  sourcePath: string;
  /** Target path or destination URI rendered as literal truncation-safe text. */
  targetPath: string;
  /** Transfer completion percentage clamped safely to [0..100]. */
  progressPct: number;
  /** Instantaneous transfer speed in MB/s (sanitized for NaN, Infinity, and negatives). */
  speedMbps: number;
  /** Human-readable estimated time remaining or lifecycle status note. */
  etaLabel: string;
  /** Human-readable payload size label (e.g. '18.4 GB'). */
  sizeLabel: string;
  /** Current transfer lifecycle status. */
  status: FileTransferStatus;
}

type FileTransferQueueBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface FileTransferQueueProps extends FileTransferQueueBaseProps {
  /** Visible heading rendered in the prism-slab header (defaults to 'File Transfer Queue'). */
  title?: string;
  /** Controlled array of transfer jobs. */
  jobs?: ReadonlyArray<FileTransferJob>;
  /** Initial transfer jobs in uncontrolled mode (defaults to 4 realistic concurrent jobs). */
  defaultJobs?: ReadonlyArray<FileTransferJob>;
  /** Initial collapsed state of the job list panel (defaults to false). */
  defaultCollapsed?: boolean;
  /** Callback fired whenever jobs are paused, resumed, canceled, retried, dismissed, or cleared. */
  onJobsChange?: (jobs: ReadonlyArray<FileTransferJob>) => void;
  /** Callback fired when a running job is paused. */
  onPauseJob?: (jobId: string) => void;
  /** Callback fired when a paused or queued job is resumed. */
  onResumeJob?: (jobId: string) => void;
  /** Callback fired when a running, paused, or queued job is canceled. */
  onCancelJob?: (jobId: string) => void;
  /** Callback fired when a canceled job is retried (resetting to running). */
  onRetryJob?: (jobId: string) => void;
  /** Disables Clear Completed, Collapse/Expand, and all per-job transfer controls (defaults to false). */
  disabled?: boolean;
}

interface OperationVisualMeta {
  label: string;
  accentToken: string;
}

interface StatusVisualMeta {
  label: string;
  accentToken: string;
}

const DEFAULT_TITLE = 'File Transfer Queue';
const MAX_SPEED_MBPS = 1_000_000;

const DEFAULT_JOBS: ReadonlyArray<FileTransferJob> = [
  {
    id: 'transfer-job-1',
    name: 'Studio_RAW_Plates_4K.tar',
    operation: 'copy',
    sourcePath: '/Volumes/CFexpress_A/Dailies',
    targetPath: '/Volumes/Studio_NAS/Projects/Prism',
    progressPct: 68,
    speedMbps: 412.5,
    etaLabel: '00:42 remaining',
    sizeLabel: '18.4 GB',
    status: 'running',
  },
  {
    id: 'transfer-job-2',
    name: 'Refractor_Release_Assets.zip',
    operation: 'upload',
    sourcePath: '/workspace/releases/v1.39',
    targetPath: 's3://prism-artifacts/cdn/v1.39',
    progressPct: 44,
    speedMbps: 64.2,
    etaLabel: 'Paused',
    sizeLabel: '1.24 GB',
    status: 'paused',
  },
  {
    id: 'transfer-job-3',
    name: 'Optical_LUT_Archive.tar.gz',
    operation: 'extract',
    sourcePath: '/workspace/downloads/archives',
    targetPath: '/workspace/assets/color-luts',
    progressPct: 0,
    speedMbps: 0,
    etaLabel: 'Waiting in queue',
    sizeLabel: '4.80 GB',
    status: 'queued',
  },
  {
    id: 'transfer-job-4',
    name: 'Hero_Composites_Final',
    operation: 'move',
    sourcePath: '/workspace/staging/composites',
    targetPath: '/Volumes/Studio_NAS/Delivery',
    progressPct: 100,
    speedMbps: 0,
    etaLabel: 'Transfer complete',
    sizeLabel: '860 MB',
    status: 'completed',
  },
];

function getOperationMeta(operation: FileTransferOpKind): OperationVisualMeta {
  switch (operation) {
    case 'copy':
      return { label: 'Copy', accentToken: 'var(--prism-info-main)' };
    case 'move':
      return { label: 'Move', accentToken: 'var(--prism-primary-main)' };
    case 'upload':
      return { label: 'Upload', accentToken: 'var(--prism-secondary-main)' };
    case 'extract':
      return { label: 'Extract', accentToken: 'var(--prism-warning-main)' };
  }
}

function renderOperationIcon(operation: FileTransferOpKind): ReactNode {
  switch (operation) {
    case 'copy':
      return <Copy aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'move':
      return <FolderInput aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'upload':
      return <Upload aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'extract':
      return <FileArchive aria-hidden="true" className="w-3 h-3 shrink-0" />;
  }
}

function getStatusMeta(status: FileTransferStatus): StatusVisualMeta {
  switch (status) {
    case 'running':
      return { label: 'Running', accentToken: 'var(--prism-info-main)' };
    case 'paused':
      return { label: 'Paused', accentToken: 'var(--prism-warning-main)' };
    case 'queued':
      return { label: 'Queued', accentToken: 'var(--prism-secondary-main)' };
    case 'completed':
      return { label: 'Completed', accentToken: 'var(--prism-success-main)' };
    case 'canceled':
      return { label: 'Canceled', accentToken: 'var(--prism-error-main)' };
  }
}

function renderStatusIcon(status: FileTransferStatus): ReactNode {
  switch (status) {
    case 'running':
      return <Activity aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'paused':
      return <Pause aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'queued':
      return <Clock aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'completed':
      return <CheckCircle2 aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'canceled':
      return <Ban aria-hidden="true" className="w-3 h-3 shrink-0" />;
  }
}

function sanitizeProgressPct(value: number): number {
  return Math.round(clampNumber(value, 0, 100, 0));
}

function sanitizeSpeedMbps(value: number): number {
  return clampNumber(value, 0, MAX_SPEED_MBPS, 0);
}

function formatSpeedMbps(speedMbps: number): string {
  return `${sanitizeSpeedMbps(speedMbps).toFixed(1)} MB/s`;
}

function normalizeJobs(list: ReadonlyArray<FileTransferJob>): FileTransferJob[] {
  const seen = new Set<string>();
  const normalized: FileTransferJob[] = [];
  for (const job of list) {
    const trimmedId = job.id.trim();
    if (!trimmedId || seen.has(trimmedId)) {
      continue;
    }
    seen.add(trimmedId);
    normalized.push({
      ...job,
      id: trimmedId,
      progressPct: sanitizeProgressPct(job.progressPct),
      speedMbps: sanitizeSpeedMbps(job.speedMbps),
    });
  }
  return normalized;
}

function FileTransferQueueInner({
  title = DEFAULT_TITLE,
  jobs,
  defaultJobs,
  defaultCollapsed = false,
  onJobsChange,
  onPauseJob,
  onResumeJob,
  onCancelJob,
  onRetryJob,
  disabled = false,
  'aria-label': ariaLabel,
  onKeyDown,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FileTransferQueueProps) {
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const panelId = `${baseId}-panel`;

  const override = useComponentOverride('FileTransferQueue');
  const isControlled = jobs !== undefined;

  const [internalJobs, setInternalJobs] = useState<FileTransferJob[]>(() =>
    normalizeJobs(defaultJobs ?? DEFAULT_JOBS)
  );
  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const currentJobs = useMemo(
    () => (isControlled ? normalizeJobs(jobs) : internalJobs),
    [isControlled, jobs, internalJobs]
  );

  const safeTitle = title.trim().length > 0 ? title.trim() : DEFAULT_TITLE;

  const runningCount = currentJobs.filter((job) => job.status === 'running').length;
  const pausedCount = currentJobs.filter((job) => job.status === 'paused').length;
  const queuedCount = currentJobs.filter((job) => job.status === 'queued').length;
  const completedCount = currentJobs.filter((job) => job.status === 'completed').length;
  const canceledCount = currentJobs.filter((job) => job.status === 'canceled').length;

  const activeCount = runningCount + pausedCount + queuedCount;
  const clearableCount = completedCount + canceledCount;
  const totalCount = currentJobs.length;
  const clearCompletedDisabled = disabled || clearableCount === 0;

  const aggregateSpeedMbps = currentJobs.reduce((total, job) => {
    if (job.status !== 'running') return total;
    return total + job.speedMbps;
  }, 0);

  const formattedAggregateSpeed = formatSpeedMbps(aggregateSpeedMbps);

  const commitJobs = (nextJobs: FileTransferJob[], announcement: string) => {
    setLiveAnnouncement(announcement);
    if (!isControlled) {
      setInternalJobs(nextJobs);
    }
    onJobsChange?.(nextJobs);
  };

  const handleToggleCollapsed = () => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    setLiveAnnouncement(nextCollapsed ? `${safeTitle} collapsed.` : `${safeTitle} expanded.`);
  };

  const handleClearCompleted = () => {
    const remaining = currentJobs.filter(
      (job) => job.status !== 'completed' && job.status !== 'canceled'
    );
    const unit = clearableCount === 1 ? 'job' : 'jobs';
    commitJobs(remaining, `Cleared ${clearableCount} finished transfer ${unit}.`);
  };

  const handlePauseJob = (job: FileTransferJob) => {
    const nextJobs = currentJobs.map((item) =>
      item.id === job.id ? { ...item, status: 'paused' as const, etaLabel: 'Paused' } : item
    );
    onPauseJob?.(job.id);
    commitJobs(nextJobs, `Paused "${job.name}".`);
  };

  const handleResumeJob = (job: FileTransferJob) => {
    const nextJobs = currentJobs.map((item) =>
      item.id === job.id
        ? { ...item, status: 'running' as const, etaLabel: 'Transferring...' }
        : item
    );
    onResumeJob?.(job.id);
    commitJobs(nextJobs, `Resumed "${job.name}".`);
  };

  const handleCancelJob = (job: FileTransferJob) => {
    const nextJobs = currentJobs.map((item) =>
      item.id === job.id ? { ...item, status: 'canceled' as const, etaLabel: 'Canceled' } : item
    );
    onCancelJob?.(job.id);
    commitJobs(nextJobs, `Canceled "${job.name}".`);
  };

  const handleRetryJob = (job: FileTransferJob) => {
    const nextJobs = currentJobs.map((item) =>
      item.id === job.id
        ? { ...item, status: 'running' as const, progressPct: 0, etaLabel: 'Retrying...' }
        : item
    );
    onRetryJob?.(job.id);
    commitJobs(nextJobs, `Retrying "${job.name}".`);
  };

  const handleDismissJob = (job: FileTransferJob) => {
    const nextJobs = currentJobs.filter((item) => item.id !== job.id);
    commitJobs(nextJobs, `Dismissed "${job.name}".`);
  };

  const handleRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'Escape' && !isCollapsed) {
      setIsCollapsed(true);
      setLiveAnnouncement(`${safeTitle} collapsed.`);
    }
  };

  const idleStatusSummary =
    totalCount === 0
      ? 'Queue empty \u00B7 No file transfers in progress.'
      : `${totalCount} ${totalCount === 1 ? 'transfer' : 'transfers'} tracked \u00B7 ${formattedAggregateSpeed} aggregate.`;

  const footerBreakdown = `${runningCount} running \u00B7 ${pausedCount} paused \u00B7 ${queuedCount} queued \u00B7 ${clearableCount} finished`;

  const merged = mergeProps({
    themeTarget: themeProps('file-transfer-queue', {
      collapsed: isCollapsed,
      empty: totalCount === 0,
      activeCount,
      runningCount,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-3.5',
      disabled ? 'opacity-65' : undefined
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('file-transfer-queue', 'header');
  const listClass = stableClassName('file-transfer-queue', 'list');
  const emptyClass = stableClassName('file-transfer-queue', 'empty');
  const statusBarClass = stableClassName('file-transfer-queue', 'status-bar');

  const actionBtnClass =
    'prism-crystal prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]';

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      aria-disabled={disabled || undefined}
      onKeyDown={handleRootKeyDown}
      {...rest}
      {...merged}
    >
      {/* Header: Title, Active Count Pill, Live Throughput, Clear Completed & Collapse Toggle */}
      <div
        data-testid="transfer-queue-header"
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full pb-3 border-b'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <ArrowLeftRight className="w-4 h-4 shrink-0" />
          </span>
          <h3
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {safeTitle}
          </h3>
          <span
            data-testid="transfer-queue-active-count"
            data-active-count={String(activeCount)}
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {`${activeCount} active`}
          </span>
          <span
            data-testid="transfer-queue-throughput"
            className="prism-crystal px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={{
              color:
                aggregateSpeedMbps > 0 ? 'var(--prism-info-main)' : 'var(--prism-text-secondary)',
            }}
          >
            <Activity aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span>{formattedAggregateSpeed}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <button
            type="button"
            disabled={clearCompletedDisabled}
            data-testid="transfer-clear-completed"
            onClick={handleClearCompleted}
            className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          >
            <Trash2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Clear Completed</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            aria-expanded={!isCollapsed}
            aria-controls={panelId}
            aria-label={isCollapsed ? `Expand ${safeTitle}` : `Collapse ${safeTitle}`}
            data-testid="transfer-toggle-collapse"
            onClick={handleToggleCollapsed}
            className="prism-crystal prism-focus-ring h-8 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_PRIMARY}
          >
            {isCollapsed ? (
              <>
                <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Expand</span>
              </>
            ) : (
              <>
                <ChevronUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Transfer Queue Body */}
      {!isCollapsed ? (
        <div id={panelId} data-testid="transfer-queue-panel" className="min-w-0 max-w-full">
          {totalCount === 0 ? (
            <div
              role="status"
              data-testid="transfer-queue-empty"
              className={cx(
                emptyClass,
                'prism-well rounded-2xl px-4 py-7 text-center flex flex-col items-center gap-2 min-w-0 max-w-full'
              )}
            >
              <Layers
                aria-hidden="true"
                className="w-5 h-5 shrink-0"
                style={STYLE_TEXT_SECONDARY}
              />
              <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
                No active file transfers
              </p>
              <p className="text-xs max-w-md" style={STYLE_TEXT_SECONDARY}>
                Copy, move, upload, or archive extraction jobs will appear here with live
                throughput and per-job controls.
              </p>
            </div>
          ) : (
            <div
              role="list"
              aria-label={`${safeTitle} jobs`}
              data-testid="transfer-queue-list"
              className={cx(listClass, 'flex flex-col gap-2.5 min-w-0 max-w-full')}
            >
              {currentJobs.map((job) => {
                const opMeta = getOperationMeta(job.operation);
                const statusMeta = getStatusMeta(job.status);
                const liveJobSpeed = job.status === 'running' ? job.speedMbps : 0;

                const jobMerged = mergeProps({
                  themeTarget: themeProps(
                    'file-transfer-queue',
                    {
                      status: job.status,
                      operation: job.operation,
                    },
                    'job'
                  ),
                  baseClassName:
                    'prism-well rounded-2xl p-3.5 flex flex-col gap-2.5 min-w-0 max-w-full transition-[color,background-color,border-color,opacity,transform]',
                });

                return (
                  <div
                    key={job.id}
                    role="listitem"
                    data-testid={`transfer-job-card-${job.id}`}
                    {...jobMerged}
                  >
                    {/* Top Row: Operation Badge, Filename, Size, Route & Semantic Status Pill */}
                    <div className="flex flex-wrap items-start justify-between gap-2 min-w-0 max-w-full">
                      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
                          <span
                            data-testid={`transfer-job-op-${job.id}`}
                            data-operation={job.operation}
                            className="prism-crystal inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold whitespace-nowrap shrink-0"
                            style={{ color: opMeta.accentToken }}
                          >
                            {renderOperationIcon(job.operation)}
                            <span>{opMeta.label}</span>
                          </span>
                          <span
                            data-testid={`transfer-job-name-${job.id}`}
                            className="text-sm font-semibold tracking-tight truncate min-w-0"
                            style={STYLE_TEXT_PRIMARY}
                          >
                            {job.name}
                          </span>
                          <span
                            data-testid={`transfer-job-size-${job.id}`}
                            className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[10px] font-medium tabular-nums whitespace-nowrap shrink-0"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            {job.sizeLabel}
                          </span>
                        </div>

                        <div
                          data-testid={`transfer-job-route-${job.id}`}
                          className="flex flex-wrap items-center gap-1 font-mono text-[11px] min-w-0 max-w-full"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          <span
                            data-testid={`transfer-job-source-${job.id}`}
                            className="truncate min-w-0 max-w-full"
                          >
                            {job.sourcePath}
                          </span>
                          <span
                            aria-hidden="true"
                            className="shrink-0 font-semibold"
                            style={STYLE_TEXT_DISABLED}
                          >
                            {' -> '}
                          </span>
                          <span
                            data-testid={`transfer-job-target-${job.id}`}
                            className="truncate min-w-0 max-w-full"
                          >
                            {job.targetPath}
                          </span>
                        </div>
                      </div>

                      <span
                        data-testid={`transfer-job-status-${job.id}`}
                        data-status={job.status}
                        className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap shrink-0"
                        style={{
                          color: statusMeta.accentToken,
                          boxShadow: `inset 0 0 0 1px ${statusMeta.accentToken}`,
                        }}
                      >
                        {renderStatusIcon(job.status)}
                        <span>{statusMeta.label}</span>
                      </span>
                    </div>

                    {/* Progress & Telemetry Row */}
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span
                            data-testid={`transfer-job-speed-${job.id}`}
                            className="font-mono font-semibold tabular-nums whitespace-nowrap shrink-0"
                            style={{
                              color:
                                liveJobSpeed > 0
                                  ? 'var(--prism-info-main)'
                                  : 'var(--prism-text-secondary)',
                            }}
                          >
                            {formatSpeedMbps(liveJobSpeed)}
                          </span>
                          <span
                            aria-hidden="true"
                            style={STYLE_TEXT_DISABLED}
                          >
                            {'\u00B7'}
                          </span>
                          <span
                            data-testid={`transfer-job-eta-${job.id}`}
                            className="font-mono truncate min-w-0"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            {job.etaLabel.trim().length > 0 ? job.etaLabel : statusMeta.label}
                          </span>
                        </div>
                        <span
                          data-testid={`transfer-job-pct-${job.id}`}
                          className="font-mono font-semibold tabular-nums whitespace-nowrap shrink-0"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          {`${job.progressPct}%`}
                        </span>
                      </div>

                      <div
                        role="progressbar"
                        aria-label={`${job.name} transfer progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={job.progressPct}
                        aria-valuetext={`${job.progressPct}% \u00B7 ${statusMeta.label}`}
                        data-testid={`transfer-job-progress-${job.id}`}
                        className="prism-crystal w-full h-2 rounded-full overflow-hidden p-0.5"
                      >
                        <div
                          data-testid={`transfer-job-progress-fill-${job.id}`}
                          className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-200"
                          style={{
                            width: `${job.progressPct}%`,
                            backgroundColor: statusMeta.accentToken,
                          }}
                        />
                      </div>
                    </div>

                    {/* Contextual Per-Job Actions */}
                    <div
                      className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t min-w-0"
                      style={STYLE_BORDER_DIVIDER}
                    >
                      {job.status === 'running' ? (
                        <>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-label={`Pause ${job.name}`}
                            data-testid={`transfer-job-pause-${job.id}`}
                            onClick={() => handlePauseJob(job)}
                            className={actionBtnClass}
                            style={STYLE_WARNING_MAIN}
                          >
                            <Pause aria-hidden="true" className="w-3 h-3 shrink-0" />
                            <span>Pause</span>
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-label={`Cancel ${job.name}`}
                            data-testid={`transfer-job-cancel-${job.id}`}
                            onClick={() => handleCancelJob(job)}
                            className={actionBtnClass}
                            style={STYLE_ERROR_MAIN}
                          >
                            <X aria-hidden="true" className="w-3 h-3 shrink-0" />
                            <span>Cancel</span>
                          </button>
                        </>
                      ) : null}

                      {job.status === 'paused' || job.status === 'queued' ? (
                        <>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-label={`Resume ${job.name}`}
                            data-testid={`transfer-job-resume-${job.id}`}
                            onClick={() => handleResumeJob(job)}
                            className={actionBtnClass}
                            style={STYLE_INFO_MAIN}
                          >
                            <Play aria-hidden="true" className="w-3 h-3 shrink-0" />
                            <span>Resume</span>
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-label={`Cancel ${job.name}`}
                            data-testid={`transfer-job-cancel-${job.id}`}
                            onClick={() => handleCancelJob(job)}
                            className={actionBtnClass}
                            style={STYLE_ERROR_MAIN}
                          >
                            <X aria-hidden="true" className="w-3 h-3 shrink-0" />
                            <span>Cancel</span>
                          </button>
                        </>
                      ) : null}

                      {job.status === 'canceled' ? (
                        <>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-label={`Retry ${job.name}`}
                            data-testid={`transfer-job-retry-${job.id}`}
                            onClick={() => handleRetryJob(job)}
                            className={actionBtnClass}
                            style={STYLE_INFO_MAIN}
                          >
                            <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
                            <span>Retry</span>
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-label={`Dismiss ${job.name}`}
                            data-testid={`transfer-job-dismiss-${job.id}`}
                            onClick={() => handleDismissJob(job)}
                            className={actionBtnClass}
                            style={STYLE_TEXT_SECONDARY}
                          >
                            <Trash2 aria-hidden="true" className="w-3 h-3 shrink-0" />
                            <span>Dismiss</span>
                          </button>
                        </>
                      ) : null}

                      {job.status === 'completed' ? (
                        <button
                          type="button"
                          disabled={disabled}
                          aria-label={`Dismiss ${job.name}`}
                          data-testid={`transfer-job-dismiss-${job.id}`}
                          onClick={() => handleDismissJob(job)}
                          className={actionBtnClass}
                          style={STYLE_TEXT_SECONDARY}
                        >
                          <Trash2 aria-hidden="true" className="w-3 h-3 shrink-0" />
                          <span>Dismiss</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Polite Live Queue Status Footer */}
      <div
        aria-live="polite"
        aria-atomic="true"
        data-testid="transfer-queue-live-status"
        className={cx(
          statusBarClass,
          'prism-well rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0 max-w-full'
        )}
        style={STYLE_TEXT_SECONDARY}
      >
        <span
          className="font-mono text-[11px] truncate min-w-0"
          style={STYLE_TEXT_PRIMARY}
        >
          {liveAnnouncement || idleStatusSummary}
        </span>
        <span
          data-testid="transfer-queue-summary"
          className="font-mono text-[11px] tabular-nums whitespace-nowrap shrink-0"
        >
          {footerBreakdown}
        </span>
      </div>
    </div>
  );
}

export const FileTransferQueue = memo(FileTransferQueueInner);
FileTransferQueue.displayName = 'FileTransferQueue';
