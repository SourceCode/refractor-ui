'use client';

import { memo, useEffect, useId, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CopyPlus,
  FileCheck2,
  FileUp,
  HardDrive,
  Hash,
  RefreshCw,
  SkipForward,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type FileConflictResolution = 'replace' | 'skip' | 'keep-both';

export type FileConflictDialogMode = 'inline' | 'modal';

export interface FileConflictVersion {
  /** Human-readable card heading (e.g. 'Incoming File' or 'Existing File'). */
  label: string;
  /** Storage or filesystem path for this file revision. */
  path: string;
  /** File size in bytes (sanitized against NaN, Infinity, and negative values). */
  sizeBytes: number;
  /** Human-readable modified date/time string (e.g. '2026-11-22 14:18 UTC'). */
  modifiedAt: string;
  /** Epoch timestamp in milliseconds used for newer/older recency badges. */
  modifiedTimestamp: number;
  /** Optional short SHA-256 digest preview (e.g. 'a4f9c21d…7e3b'). */
  checksumShort?: string;
}

type FileConflictDialogBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface FileConflictDialogProps extends FileConflictDialogBaseProps {
  /** Conflicting filename displayed in the header and live status announcements. */
  fileName?: string;
  /** Incoming source file metadata shown on the left comparison card. */
  incoming?: FileConflictVersion;
  /** Existing destination file metadata shown on the right comparison card. */
  existing?: FileConflictVersion;
  /** Number of remaining conflicts in the batch (defaults to 3). Displays the Apply-to-All checkbox when > 1. */
  remainingConflicts?: number;
  /** Presentation mode: 'inline' renders the comparison slab directly; 'modal' renders inside a frosted backdrop dialog. */
  mode?: FileConflictDialogMode;
  /** Controls visibility in 'modal' mode (defaults to true). Returns null when false in modal mode. */
  open?: boolean;
  /** Callback invoked when Replace, Keep Both, or Skip is selected, along with the current applyToAll flag. */
  onResolve?: (resolution: FileConflictResolution, applyToAll: boolean) => void;
  /** Optional callback invoked when the dialog is cancelled via Cancel button, modal Close button, Escape key, or backdrop click. */
  onCancel?: () => void;
  /** Disables conflict resolution actions, the apply-to-all toggle, and modal dismissal controls (defaults to false). */
  disabled?: boolean;
}

type SizeComparisonKind = 'larger' | 'smaller' | 'equal';
type RecencyComparisonKind = 'newer' | 'older' | 'equal';

interface BadgeTone {
  kind: SizeComparisonKind | RecencyComparisonKind;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
}

interface ResolutionRecord {
  resolution: FileConflictResolution;
  applyToAll: boolean;
  conflictCount: number;
  fileName: string;
}

const DEFAULT_FILE_NAME = 'OpticalGlass_Master_v4.exr';

const DEFAULT_INCOMING_VERSION: FileConflictVersion = {
  label: 'Incoming File',
  path: '/Volumes/StudioNVMe/Renders/OpticalGlass_Master_v4.exr',
  sizeBytes: 155_608_678,
  modifiedAt: '2026-11-22 14:18 UTC',
  modifiedTimestamp: 1_795_357_080_000,
  checksumShort: 'a4f9c21d…7e3b',
};

const DEFAULT_EXISTING_VERSION: FileConflictVersion = {
  label: 'Existing File',
  path: '/Volumes/NAS-Archive/Masters/OpticalGlass_Master_v4.exr',
  sizeBytes: 124_151_398,
  modifiedAt: '2026-11-19 09:05 UTC',
  modifiedTimestamp: 1_795_079_100_000,
  checksumShort: '6b12e80a…4c91',
};

function sanitizeByteSize(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes < 0) return 0;
  return bytes;
}

function formatByteSize(bytes: number): string {
  const safe = sanitizeByteSize(bytes);
  if (safe < 1024) {
    return `${Math.round(safe)} B`;
  }
  if (safe < 1024 * 1024) {
    return `${(safe / 1024).toFixed(1)} KB`;
  }
  if (safe < 1024 * 1024 * 1024) {
    return `${(safe / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(safe / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function sanitizeTimestamp(timestamp: number): number {
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sanitizeConflictCount(count: number): number {
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.floor(count);
}

function compareSizes(selfBytes: number, otherBytes: number): BadgeTone {
  if (selfBytes > otherBytes) {
    return {
      kind: 'larger',
      label: 'Larger',
      color: 'var(--prism-primary-main)',
      backgroundColor: 'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
      borderColor: 'color-mix(in srgb, var(--prism-primary-main) 38%, transparent)',
    };
  }
  if (selfBytes < otherBytes) {
    return {
      kind: 'smaller',
      label: 'Smaller',
      color: 'var(--prism-text-secondary)',
      backgroundColor: 'var(--prism-well-start)',
      borderColor: 'var(--prism-well-border)',
    };
  }
  return {
    kind: 'equal',
    label: 'Same size',
    color: 'var(--prism-info-main)',
    backgroundColor: 'color-mix(in srgb, var(--prism-info-main) 12%, transparent)',
    borderColor: 'color-mix(in srgb, var(--prism-info-main) 34%, transparent)',
  };
}

function compareRecency(selfTs: number, otherTs: number): BadgeTone {
  if (selfTs > otherTs) {
    return {
      kind: 'newer',
      label: 'Newer',
      color: 'var(--prism-success-main)',
      backgroundColor: 'color-mix(in srgb, var(--prism-success-main) 14%, transparent)',
      borderColor: 'color-mix(in srgb, var(--prism-success-main) 40%, transparent)',
    };
  }
  if (selfTs < otherTs) {
    return {
      kind: 'older',
      label: 'Older',
      color: 'var(--prism-warning-main)',
      backgroundColor: 'color-mix(in srgb, var(--prism-warning-main) 15%, transparent)',
      borderColor: 'color-mix(in srgb, var(--prism-warning-main) 42%, transparent)',
    };
  }
  return {
    kind: 'equal',
    label: 'Same time',
    color: 'var(--prism-info-main)',
    backgroundColor: 'color-mix(in srgb, var(--prism-info-main) 12%, transparent)',
    borderColor: 'color-mix(in srgb, var(--prism-info-main) 34%, transparent)',
  };
}

function getResolutionLabel(resolution: FileConflictResolution): string {
  switch (resolution) {
    case 'replace':
      return 'Replace';
    case 'keep-both':
      return 'Keep Both';
    case 'skip':
      return 'Skip';
  }
}

function formatResolutionStatus(record: ResolutionRecord): string {
  const actionLabel = getResolutionLabel(record.resolution);
  if (record.applyToAll) {
    return `Resolved: ${actionLabel} (applied to all ${record.conflictCount} conflicts)`;
  }
  return `Resolved: ${actionLabel} (${record.fileName})`;
}

interface VersionCardProps {
  side: 'incoming' | 'existing';
  version: FileConflictVersion;
  sizeBytes: number;
  sizeBadge: BadgeTone;
  recencyBadge: BadgeTone;
  cardClass: string;
}

function ConflictVersionCard({
  side,
  version,
  sizeBytes,
  sizeBadge,
  recencyBadge,
  cardClass,
}: VersionCardProps) {
  const isIncoming = side === 'incoming';
  const trimmedChecksum = version.checksumShort?.trim() ?? '';

  return (
    <section
      aria-label={version.label}
      data-testid={`file-conflict-${side}-card`}
      data-side={side}
      className={cx(
        cardClass,
        isIncoming ? 'prism-crystal' : 'prism-well',
        'rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 min-w-0 max-w-full'
      )}
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: isIncoming
          ? 'color-mix(in srgb, var(--prism-primary-main) 36%, var(--prism-well-border))'
          : 'var(--prism-well-border)',
      }}
    >
      <div
        className="flex items-center justify-between gap-2 pb-2.5 min-w-0"
        style={{ borderBottom: '1px solid var(--prism-divider)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={{
              color: isIncoming ? 'var(--prism-primary-main)' : 'var(--prism-info-main)',
            }}
          >
            {isIncoming ? (
              <FileUp className="w-3.5 h-3.5" />
            ) : (
              <FileCheck2 className="w-3.5 h-3.5" />
            )}
          </span>
          <h3
            data-testid={`file-conflict-${side}-label`}
            className="text-xs font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {version.label}
          </h3>
        </div>

        <span
          className="prism-well px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap shrink-0"
          style={{
            color: isIncoming ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)',
          }}
        >
          {isIncoming ? 'Source' : 'Destination'}
        </span>
      </div>

      <dl className="flex flex-col gap-2.5 min-w-0">
        <div className="flex flex-col gap-0.5 min-w-0">
          <dt
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            Path
          </dt>
          <dd className="min-w-0">
            <code
              data-testid={`file-conflict-${side}-path`}
              className="font-mono text-xs break-all leading-snug block"
              style={STYLE_TEXT_PRIMARY}
            >
              {version.path}
            </code>
          </dd>
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <dt
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            <HardDrive className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Size</span>
          </dt>
          <dd className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              data-testid={`file-conflict-${side}-size`}
              className="font-mono text-xs font-semibold tabular-nums"
              style={STYLE_TEXT_PRIMARY}
            >
              {formatByteSize(sizeBytes)}
            </span>
            <span
              data-testid={`file-conflict-${side}-size-badge`}
              data-comparison={sizeBadge.kind}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
              style={{
                color: sizeBadge.color,
                backgroundColor: sizeBadge.backgroundColor,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: sizeBadge.borderColor,
              }}
            >
              {sizeBadge.label}
            </span>
          </dd>
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <dt
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Modified</span>
          </dt>
          <dd className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              data-testid={`file-conflict-${side}-modified`}
              className="font-mono text-xs tabular-nums break-words"
              style={STYLE_TEXT_PRIMARY}
            >
              {version.modifiedAt}
            </span>
            <span
              data-testid={`file-conflict-${side}-recency-badge`}
              data-comparison={recencyBadge.kind}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
              style={{
                color: recencyBadge.color,
                backgroundColor: recencyBadge.backgroundColor,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: recencyBadge.borderColor,
              }}
            >
              {recencyBadge.label}
            </span>
          </dd>
        </div>

        {trimmedChecksum.length > 0 ? (
          <div className="flex flex-col gap-1 min-w-0">
            <dt
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
              style={STYLE_TEXT_SECONDARY}
            >
              <Hash className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>SHA-256</span>
            </dt>
            <dd className="min-w-0">
              <code
                data-testid={`file-conflict-${side}-checksum`}
                className="prism-well inline-block max-w-full px-2 py-0.5 rounded-md font-mono text-[11px] tabular-nums break-all"
                style={STYLE_TEXT_PRIMARY}
              >
                {trimmedChecksum}
              </code>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function FileConflictDialogInner({
  fileName = DEFAULT_FILE_NAME,
  incoming = DEFAULT_INCOMING_VERSION,
  existing = DEFAULT_EXISTING_VERSION,
  remainingConflicts = 3,
  mode = 'inline',
  open = true,
  onResolve,
  onCancel,
  disabled = false,
  'aria-label': ariaLabel,
  onClick,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FileConflictDialogProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;
  const applyAllId = `${baseId}-apply-all`;
  const override = useComponentOverride('FileConflictDialog');

  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  const [lastResolution, setLastResolution] = useState<ResolutionRecord | null>(null);

  const isModal = mode === 'modal';
  const safeRemainingConflicts = sanitizeConflictCount(remainingConflicts);
  const canApplyToAll = safeRemainingConflicts > 1;
  const effectiveApplyToAll = canApplyToAll && applyToAll;

  useEffect(() => {
    if (!isModal || !open) return;

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || disabled) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [disabled, isModal, onCancel, open]);

  if (isModal && !open) {
    return null;
  }

  const incomingBytes = sanitizeByteSize(incoming.sizeBytes);
  const existingBytes = sanitizeByteSize(existing.sizeBytes);
  const incomingTs = sanitizeTimestamp(incoming.modifiedTimestamp);
  const existingTs = sanitizeTimestamp(existing.modifiedTimestamp);

  const incomingSizeBadge = compareSizes(incomingBytes, existingBytes);
  const existingSizeBadge = compareSizes(existingBytes, incomingBytes);
  const incomingRecencyBadge = compareRecency(incomingTs, existingTs);
  const existingRecencyBadge = compareRecency(existingTs, incomingTs);

  const handleApplyAllChange = (event: ChangeEvent<HTMLInputElement>) => {
    setApplyToAll(event.target.checked);
  };

  const handleResolve = (resolution: FileConflictResolution) => {
    const nextRecord: ResolutionRecord = {
      resolution,
      applyToAll: effectiveApplyToAll,
      conflictCount: safeRemainingConflicts,
      fileName,
    };
    setLastResolution(nextRecord);
    onResolve?.(resolution, effectiveApplyToAll);
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const handleBackdropClick = () => {
    if (disabled) return;
    onCancel?.();
  };

  const showCancelButton = Boolean(onCancel) || isModal;

  const headerClass = stableClassName('file-conflict-dialog', 'header');
  const bodyClass = stableClassName('file-conflict-dialog', 'body');
  const cardClass = stableClassName('file-conflict-dialog', 'card');
  const footerClass = stableClassName('file-conflict-dialog', 'footer');
  const statusClass = stableClassName('file-conflict-dialog', 'status');
  const panelClass = stableClassName('file-conflict-dialog', 'panel');

  const merged = mergeProps({
    themeTarget: themeProps('file-conflict-dialog', {
      mode,
      open: isModal ? open : true,
      resolution: lastResolution?.resolution,
      applyToAll: effectiveApplyToAll,
      disabled,
    }),
    baseClassName: isModal
      ? 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6'
      : 'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-4',
    baseStyle: isModal
      ? {
          backgroundColor: 'color-mix(in srgb, var(--prism-bg-end) 76%, transparent)',
          backdropFilter: 'blur(var(--prism-blur-px))',
        }
      : undefined,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const statusText = lastResolution
    ? formatResolutionStatus(lastResolution)
    : `Choose how to resolve the conflict for ${fileName}.`;

  const dialogInnerContent = (
    <>
      {/* Header */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-start justify-between gap-3 pb-3 min-w-0'
        )}
        style={{ borderBottom: '1px solid var(--prism-divider)' }}
      >
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 mt-0.5"
            style={STYLE_WARNING_MAIN}
          >
            <AlertTriangle className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              data-testid="file-conflict-title"
              className="text-sm font-semibold tracking-[-0.01em]"
              style={STYLE_TEXT_PRIMARY}
            >
              File Conflict Detected
            </h2>
            <p
              id={descriptionId}
              className="text-xs leading-relaxed mt-0.5 break-words"
              style={STYLE_TEXT_SECONDARY}
            >
              A file named{' '}
              <code
                data-testid="file-conflict-filename"
                className="font-mono font-semibold break-all"
                style={STYLE_TEXT_PRIMARY}
              >
                {fileName}
              </code>{' '}
              already exists in the destination folder.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canApplyToAll ? (
            <span
              data-testid="file-conflict-remaining-badge"
              className="prism-well px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap"
              style={STYLE_WARNING_MAIN}
            >
              {safeRemainingConflicts} remaining conflicts
            </span>
          ) : null}

          {isModal ? (
            <button
              type="button"
              disabled={disabled}
              aria-label="Close conflict dialog"
              data-testid="file-conflict-close"
              onClick={handleCancel}
              className="prism-btn-secondary prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Side-by-Side Comparison Body */}
      <div
        data-testid="file-conflict-comparison"
        className={cx(bodyClass, 'grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 max-w-full')}
      >
        <ConflictVersionCard
          side="incoming"
          version={incoming}
          sizeBytes={incomingBytes}
          sizeBadge={incomingSizeBadge}
          recencyBadge={incomingRecencyBadge}
          cardClass={cardClass}
        />
        <ConflictVersionCard
          side="existing"
          version={existing}
          sizeBytes={existingBytes}
          sizeBadge={existingSizeBadge}
          recencyBadge={existingRecencyBadge}
          cardClass={cardClass}
        />
      </div>

      {/* Controls Footer */}
      <div
        className={cx(
          footerClass,
          'flex flex-wrap items-center justify-between gap-3 pt-3 min-w-0'
        )}
        style={{ borderTop: '1px solid var(--prism-divider)' }}
      >
        <div className="min-w-0">
          {canApplyToAll ? (
            <label
              htmlFor={applyAllId}
              data-testid="file-conflict-apply-all-label"
              className={cx(
                'inline-flex items-center gap-2 select-none text-xs font-medium',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              <input
                id={applyAllId}
                type="checkbox"
                checked={applyToAll}
                disabled={disabled}
                onChange={handleApplyAllChange}
                data-testid="file-conflict-apply-all"
                className="prism-focus-ring w-4 h-4 rounded shrink-0 cursor-pointer disabled:cursor-not-allowed"
                style={{ accentColor: 'var(--prism-primary-main)' }}
              />
              <span>Apply to all {safeRemainingConflicts} remaining conflicts</span>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
          {showCancelButton ? (
            <button
              type="button"
              disabled={disabled}
              data-testid="file-conflict-cancel"
              onClick={handleCancel}
              className="prism-well prism-focus-ring h-9 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
              style={STYLE_TEXT_SECONDARY}
            >
              <span>Cancel</span>
            </button>
          ) : null}

          <button
            type="button"
            disabled={disabled}
            data-testid="file-conflict-skip"
            data-active={lastResolution?.resolution === 'skip' ? 'true' : undefined}
            onClick={() => handleResolve('skip')}
            className="prism-btn-secondary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SkipForward className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
            <span className="relative z-10">Skip</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            data-testid="file-conflict-keep-both"
            data-active={lastResolution?.resolution === 'keep-both' ? 'true' : undefined}
            onClick={() => handleResolve('keep-both')}
            className="prism-btn-cobalt prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CopyPlus className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
            <span className="relative z-10">Keep Both</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            data-testid="file-conflict-replace"
            data-active={lastResolution?.resolution === 'replace' ? 'true' : undefined}
            onClick={() => handleResolve('replace')}
            className="prism-btn-primary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
            <span className="relative z-10">Replace</span>
          </button>
        </div>
      </div>

      {/* Polite Status Banner */}
      <div
        role="status"
        aria-live="polite"
        data-testid="file-conflict-status"
        data-resolved={lastResolution ? 'true' : 'false'}
        className={cx(
          statusClass,
          'prism-well rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs min-w-0 max-w-full'
        )}
        style={{
          color: lastResolution ? 'var(--prism-success-main)' : 'var(--prism-text-secondary)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: lastResolution
            ? 'color-mix(in srgb, var(--prism-success-main) 38%, transparent)'
            : 'var(--prism-well-border)',
        }}
      >
        <CheckCircle2
          aria-hidden="true"
          className="w-3.5 h-3.5 shrink-0"
          style={{
            color: lastResolution ? 'var(--prism-success-main)' : 'var(--prism-text-disabled)',
          }}
        />
        <span className="font-medium break-words min-w-0">{statusText}</span>
      </div>
    </>
  );

  if (isModal) {
    return (
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-describedby={descriptionId}
        data-testid="file-conflict-backdrop"
        onClick={composeEventHandlers(onClick, handleBackdropClick)}
        {...rest}
        {...merged}
      >
        <div
          data-testid="file-conflict-panel"
          onClick={(event) => event.stopPropagation()}
          className={cx(
            panelClass,
            'prism-slab w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 min-w-0'
          )}
        >
          {dialogInnerContent}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : titleId}
      aria-describedby={descriptionId}
      onClick={onClick}
      {...rest}
      {...merged}
    >
      {dialogInnerContent}
    </div>
  );
}

export const FileConflictDialog = memo(FileConflictDialogInner);
FileConflictDialog.displayName = 'FileConflictDialog';
