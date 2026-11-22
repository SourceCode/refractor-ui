'use client';

import {
  Fragment,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  GitCommitHorizontal,
  GitFork,
  Lock,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type ApprovalChainStatus = 'pending' | 'approved' | 'changes-requested' | 'rejected';

export type ApprovalChainMode = 'sequential' | 'parallel';

export interface ApprovalReviewerNode {
  /** Stable unique identifier for the reviewer stage. */
  id: string;
  /** Reviewer display name shown on the node card and action bar. */
  name: string;
  /** Stage or team role (e.g. 'Security Review', 'Staff Engineering'). */
  role: string;
  /** Short initials rendered inside the status-tinted optical avatar ring. */
  initials: string;
  /** Current sign-off status for this reviewer node. */
  status: ApprovalChainStatus;
  /** Optional timestamp string of the latest sign-off action. */
  updatedAt?: string;
  /** Optional audit comment or review note attached to this stage. */
  comment?: string;
}

type ApprovalChainStripBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ApprovalChainStripProps extends ApprovalChainStripBaseProps {
  /** Visible heading linked to the region via aria-labelledby. */
  title?: string;
  /** Workflow progression mode: sequential enforces prior-stage approval gating; parallel allows independent sign-off. */
  mode?: ApprovalChainMode;
  /** Controlled list of reviewer stage nodes. */
  reviewers?: ReadonlyArray<ApprovalReviewerNode>;
  /** Initial reviewer stage nodes for uncontrolled usage (defaults to a 4-stage enterprise release chain). */
  defaultReviewers?: ReadonlyArray<ApprovalReviewerNode>;
  /** Callback fired whenever a reviewer decision is recorded or reset. */
  onDecision?: (
    reviewerId: string,
    status: ApprovalChainStatus,
    comment: string,
    nextReviewers: ReadonlyArray<ApprovalReviewerNode>
  ) => void;
  /** Hides the interactive reviewer action bar while keeping stage cards inspectable. */
  readOnly?: boolean;
  /** Disables all reviewer cards, comment input, and decision controls. */
  disabled?: boolean;
}

type ChainVerdictKey = ApprovalChainStatus | 'empty';

interface StatusVisualMeta {
  label: string;
  colorToken: string;
}

interface ChainVerdictMeta {
  key: ChainVerdictKey;
  label: string;
  colorToken: string;
  approvedCount: number;
  totalCount: number;
  progressPct: number;
}

const DEFAULT_TITLE = 'Production Release Approval Chain';

const DEFAULT_REVIEWERS: ReadonlyArray<ApprovalReviewerNode> = [
  {
    id: 'security-review',
    name: 'Elena Rostova',
    role: 'Security Review',
    initials: 'ER',
    status: 'approved',
    updatedAt: '09:14 UTC',
    comment: 'SBOM & SAST checks passed with zero high-severity findings.',
  },
  {
    id: 'design-systems',
    name: 'Marcus Chen',
    role: 'Design Systems',
    initials: 'MC',
    status: 'approved',
    updatedAt: '09:42 UTC',
    comment: 'Optical contrast tokens verified across light and dark themes.',
  },
  {
    id: 'staff-engineering',
    name: 'Priya Nair',
    role: 'Staff Engineering',
    initials: 'PN',
    status: 'pending',
  },
  {
    id: 'release-manager',
    name: 'David Okafor',
    role: 'Release Manager',
    initials: 'DO',
    status: 'pending',
  },
];

function getStatusMeta(status: ApprovalChainStatus): StatusVisualMeta {
  switch (status) {
    case 'approved':
      return {
        label: 'Approved',
        colorToken: 'var(--prism-success-main)',
      };
    case 'changes-requested':
      return {
        label: 'Changes Requested',
        colorToken: 'var(--prism-warning-main)',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        colorToken: 'var(--prism-error-main)',
      };
    case 'pending':
      return {
        label: 'Pending',
        colorToken: 'var(--prism-info-main)',
      };
  }
}

function renderStatusIcon(status: ApprovalChainStatus, className: string) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 aria-hidden="true" className={className} />;
    case 'changes-requested':
      return <AlertTriangle aria-hidden="true" className={className} />;
    case 'rejected':
      return <XCircle aria-hidden="true" className={className} />;
    case 'pending':
      return <Clock aria-hidden="true" className={className} />;
  }
}

function getVerdictMeta(reviewers: ReadonlyArray<ApprovalReviewerNode>): ChainVerdictMeta {
  const totalCount = reviewers.length;
  if (totalCount === 0) {
    return {
      key: 'empty',
      label: 'No Reviewers',
      colorToken: 'var(--prism-text-secondary)',
      approvedCount: 0,
      totalCount: 0,
      progressPct: 0,
    };
  }

  let approvedCount = 0;
  let hasRejected = false;
  let hasChangesRequested = false;

  for (const reviewer of reviewers) {
    if (reviewer.status === 'approved') {
      approvedCount += 1;
    } else if (reviewer.status === 'rejected') {
      hasRejected = true;
    } else if (reviewer.status === 'changes-requested') {
      hasChangesRequested = true;
    }
  }

  const progressPct = Math.round((approvedCount / totalCount) * 100);

  if (approvedCount === totalCount) {
    return {
      key: 'approved',
      label: 'Chain Approved',
      colorToken: 'var(--prism-success-main)',
      approvedCount,
      totalCount,
      progressPct,
    };
  }

  if (hasRejected) {
    return {
      key: 'rejected',
      label: 'Rejected',
      colorToken: 'var(--prism-error-main)',
      approvedCount,
      totalCount,
      progressPct,
    };
  }

  if (hasChangesRequested) {
    return {
      key: 'changes-requested',
      label: 'Changes Requested',
      colorToken: 'var(--prism-warning-main)',
      approvedCount,
      totalCount,
      progressPct,
    };
  }

  return {
    key: 'pending',
    label: `Pending (${approvedCount}/${totalCount} Approved)`,
    colorToken: 'var(--prism-info-main)',
    approvedCount,
    totalCount,
    progressPct,
  };
}

function getBlockingPredecessor(
  reviewers: ReadonlyArray<ApprovalReviewerNode>,
  index: number,
  mode: ApprovalChainMode
): ApprovalReviewerNode | undefined {
  if (mode !== 'sequential' || index <= 0) {
    return undefined;
  }
  for (let i = 0; i < index; i += 1) {
    const candidate = reviewers[i]!;
    if (candidate.status !== 'approved') {
      return candidate;
    }
  }
  return undefined;
}

function resolveDefaultSelectedId(reviewers: ReadonlyArray<ApprovalReviewerNode>): string {
  const firstActionable = reviewers.find((reviewer) => reviewer.status !== 'approved');
  return firstActionable?.id ?? reviewers[0]?.id ?? '';
}

function formatInitials(initials: string, name: string): string {
  const cleanInitials = initials.trim();
  if (cleanInitials) return cleanInitials;
  const cleanName = name.trim();
  return cleanName ? cleanName.slice(0, 2).toUpperCase() : '?';
}

export function ApprovalChainStrip({
  title = DEFAULT_TITLE,
  mode = 'sequential',
  reviewers,
  defaultReviewers,
  onDecision,
  readOnly = false,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ApprovalChainStripProps) {
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const noteInputId = `${baseId}-decision-note`;
  const override = useComponentOverride('ApprovalChainStrip');
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const [currentReviewers, setCurrentReviewers] = useControllableState<
    ReadonlyArray<ApprovalReviewerNode>
  >({
    value: reviewers,
    defaultValue: defaultReviewers ?? DEFAULT_REVIEWERS,
  });

  const [selectedId, setSelectedId] = useState<string>(() =>
    resolveDefaultSelectedId(reviewers ?? defaultReviewers ?? DEFAULT_REVIEWERS)
  );
  const [noteInput, setNoteInput] = useState<string>('');
  const [announcement, setAnnouncement] = useState<string>('');

  const safeTitle = title.trim() || DEFAULT_TITLE;
  const isEmpty = currentReviewers.length === 0;
  const verdictMeta = useMemo(() => getVerdictMeta(currentReviewers), [currentReviewers]);

  const activeReviewerIndex = useMemo(() => {
    if (isEmpty) return -1;
    const matchedIdx = currentReviewers.findIndex((node) => node.id === selectedId);
    if (matchedIdx !== -1) return matchedIdx;
    const fallbackId = resolveDefaultSelectedId(currentReviewers);
    return currentReviewers.findIndex((node) => node.id === fallbackId);
  }, [currentReviewers, isEmpty, selectedId]);

  const activeReviewer =
    activeReviewerIndex >= 0 ? currentReviewers[activeReviewerIndex]! : null;

  const selectedBlockingReviewer = useMemo(
    () => getBlockingPredecessor(currentReviewers, activeReviewerIndex, mode),
    [activeReviewerIndex, currentReviewers, mode]
  );

  const isSelectedBlocked = selectedBlockingReviewer !== undefined;

  const handleSelectReviewer = (reviewerId: string) => {
    setSelectedId(reviewerId);
    setNoteInput('');
  };

  const handleCardKeyDown =
    (index: number) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing || disabled) return;

      let targetIndex: number | null = null;
      if (event.key === 'ArrowRight') {
        targetIndex = (index + 1) % currentReviewers.length;
      } else if (event.key === 'ArrowLeft') {
        targetIndex = (index - 1 + currentReviewers.length) % currentReviewers.length;
      } else if (event.key === 'Home') {
        targetIndex = 0;
      } else if (event.key === 'End') {
        targetIndex = currentReviewers.length - 1;
      }

      if (targetIndex === null) return;
      event.preventDefault();
      const targetNode = currentReviewers[targetIndex]!;
      setSelectedId(targetNode.id);
      setNoteInput('');
      cardRefs.current.get(targetNode.id)?.focus();
    };

  const applyDecision = (reviewer: ApprovalReviewerNode, nextStatus: ApprovalChainStatus) => {
    const trimmedComment = noteInput.trim();
    const nextReviewers = currentReviewers.map((node) => {
      if (node.id !== reviewer.id) return node;
      return {
        ...node,
        status: nextStatus,
        updatedAt: nextStatus === 'pending' ? undefined : 'Just now',
        comment:
          trimmedComment.length > 0
            ? trimmedComment
            : nextStatus === 'pending'
              ? undefined
              : node.comment,
      };
    });

    setCurrentReviewers(nextReviewers);
    onDecision?.(reviewer.id, nextStatus, trimmedComment, nextReviewers);

    const statusLabel = getStatusMeta(nextStatus).label;
    const message =
      trimmedComment.length > 0
        ? `${reviewer.name} (${reviewer.role}) marked ${statusLabel}: ${trimmedComment}`
        : `${reviewer.name} (${reviewer.role}) marked ${statusLabel}.`;
    setAnnouncement(message);
    setNoteInput('');
  };

  const merged = mergeProps({
    themeTarget: themeProps('approval-chain-strip', {
      mode,
      verdict: verdictMeta.key,
      disabled,
      readOnly,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 flex flex-col gap-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('approval-chain-strip', 'header');
  const stripClass = stableClassName('approval-chain-strip', 'strip');
  const actionBarClass = stableClassName('approval-chain-strip', 'action-bar');

  const modeLabel = mode === 'sequential' ? 'Sequential Chain' : 'Parallel Sign-Off';

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      {/* Sculpted Optical Header */}
      <div className={cx(headerClass, 'flex flex-col gap-2.5 min-w-0 max-w-full')}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full">
          <div className="flex items-center gap-2 min-w-0 max-w-full">
            <span
              aria-hidden="true"
              className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
              style={{ color: verdictMeta.colorToken }}
            >
              <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            </span>
            <h3
              id={headingId}
              className="text-sm font-semibold tracking-tight truncate min-w-0"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {safeTitle}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            <span
              data-testid="approval-mode-badge"
              data-mode={mode}
              className="prism-well inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {mode === 'sequential' ? (
                <GitCommitHorizontal aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <GitFork aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{modeLabel}</span>
            </span>

            {verdictMeta.key !== 'empty' ? (
              <span
                data-testid="approval-verdict-badge"
                data-verdict={verdictMeta.key}
                className={cx(
                  verdictMeta.key === 'approved' ? 'prism-emerald' : 'prism-crystal',
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-tight whitespace-nowrap shrink-0'
                )}
                style={
                  verdictMeta.key === 'approved'
                    ? undefined
                    : {
                        color: verdictMeta.colorToken,
                        borderColor: verdictMeta.colorToken,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }
                }
              >
                {renderStatusIcon(verdictMeta.key, 'w-3.5 h-3.5 shrink-0')}
                <span>{verdictMeta.label}</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Compact Optical Progress Bar */}
        {!isEmpty ? (
          <div className="flex flex-col gap-1 min-w-0 max-w-full">
            <div
              className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums min-w-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <span>
                {verdictMeta.approvedCount} / {verdictMeta.totalCount} stages approved
              </span>
              <span>{verdictMeta.progressPct}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${safeTitle} approval progress`}
              aria-valuemin={0}
              aria-valuemax={verdictMeta.totalCount}
              aria-valuenow={verdictMeta.approvedCount}
              aria-valuetext={`${verdictMeta.approvedCount} of ${verdictMeta.totalCount} stages approved (${verdictMeta.progressPct}%)`}
              data-testid="approval-progress-bar"
              className="prism-well rounded-full h-2 w-full overflow-hidden"
            >
              <div
                data-testid="approval-progress-fill"
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${verdictMeta.progressPct}%`,
                  backgroundColor: verdictMeta.colorToken,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {!activeReviewer ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="approval-chain-empty"
          className="prism-well rounded-2xl px-4 py-6 flex flex-col items-center justify-center text-center gap-1.5 min-w-0 max-w-full"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          <Users aria-hidden="true" className="w-5 h-5 shrink-0 opacity-75" />
          <p className="text-xs font-semibold" style={{ color: 'var(--prism-text-primary)' }}>
            No approval stages configured
          </p>
          <p className="text-xs">
            Add one or more reviewers to track sequential or parallel sign-off decisions.
          </p>
        </div>
      ) : (
        <>
          {/* Responsive Reviewer Node Strip with Optical Directional Connectors */}
          <div
            role="group"
            aria-label={`${safeTitle} reviewer stages`}
            data-testid="approval-reviewer-strip"
            className={cx(stripClass, 'flex flex-wrap items-stretch gap-2 min-w-0 max-w-full')}
          >
            {currentReviewers.map((node, index) => {
              const statusMeta = getStatusMeta(node.status);
              const blockingPredecessor = getBlockingPredecessor(currentReviewers, index, mode);
              const isBlocked = blockingPredecessor !== undefined;
              const isSelected = activeReviewer?.id === node.id;
              const displayInitials = formatInitials(node.initials, node.name);

              return (
                <Fragment key={node.id}>
                  <button
                    ref={(el) => {
                      if (el) {
                        cardRefs.current.set(node.id, el);
                      } else {
                        cardRefs.current.delete(node.id);
                      }
                    }}
                    type="button"
                    disabled={disabled}
                    tabIndex={disabled ? undefined : isSelected ? 0 : -1}
                    aria-pressed={isSelected}
                    data-testid={`approval-node-${node.id}`}
                    data-status={node.status}
                    data-selected={isSelected ? 'true' : undefined}
                    data-gated={isBlocked ? 'true' : undefined}
                    onClick={() => handleSelectReviewer(node.id)}
                    onKeyDown={handleCardKeyDown(index)}
                    className={cx(
                      'prism-crystal prism-focus-ring rounded-2xl p-3 text-left flex-1 basis-[13rem] min-w-0 max-w-full flex flex-col gap-2 transition-all duration-150 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed',
                      isSelected ? 'opacity-100' : 'opacity-90 enabled:hover:opacity-100'
                    )}
                    style={{
                      borderColor: isSelected ? statusMeta.colorToken : 'var(--prism-divider)',
                      borderWidth: isSelected ? '1.5px' : '1px',
                      borderStyle: 'solid',
                      boxShadow: isSelected ? `0 0 0 1px ${statusMeta.colorToken}` : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span
                        data-testid={`approval-avatar-${node.id}`}
                        className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center text-xs font-bold tracking-tight shrink-0"
                        style={{
                          color: statusMeta.colorToken,
                          borderColor: statusMeta.colorToken,
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          boxShadow: `0 0 0 2px color-mix(in srgb, ${statusMeta.colorToken} 18%, transparent)`,
                        }}
                      >
                        {displayInitials}
                      </span>

                      <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-0">
                        {mode === 'sequential' ? (
                          <span
                            data-testid={`approval-stage-index-${node.id}`}
                            className="prism-well rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold tabular-nums shrink-0"
                            style={{ color: 'var(--prism-text-secondary)' }}
                          >
                            Stage {index + 1}
                          </span>
                        ) : null}

                        <span
                          data-testid={`approval-node-status-${node.id}`}
                          className="prism-well inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0"
                          style={{
                            color: statusMeta.colorToken,
                            borderColor: statusMeta.colorToken,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                          }}
                        >
                          {renderStatusIcon(node.status, 'w-3 h-3 shrink-0')}
                          <span>{statusMeta.label}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {node.name}
                      </span>
                      <span
                        className="text-[11px] truncate"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {node.role}
                      </span>
                    </div>

                    {isBlocked ? (
                      <span
                        data-testid={`approval-node-gated-${node.id}`}
                        className="prism-well rounded-full px-2 py-0.5 inline-flex items-center gap-1 text-[10px] font-medium self-start max-w-full"
                        style={{ color: 'var(--prism-warning-main)' }}
                      >
                        <Lock aria-hidden="true" className="w-3 h-3 shrink-0" />
                        <span className="truncate">Waiting on prior stage</span>
                      </span>
                    ) : null}

                    {node.updatedAt || node.comment ? (
                      <div
                        className="flex flex-col gap-1 pt-1.5 mt-auto min-w-0"
                        style={{ borderTop: '1px solid var(--prism-divider)' }}
                      >
                        {node.updatedAt ? (
                          <span
                            data-testid={`approval-node-updated-${node.id}`}
                            className="text-[10px] font-mono tabular-nums truncate"
                            style={{ color: 'var(--prism-text-secondary)' }}
                          >
                            {node.updatedAt}
                          </span>
                        ) : null}
                        {node.comment ? (
                          <p
                            data-testid={`approval-node-comment-${node.id}`}
                            className="text-[11px] leading-snug line-clamp-2 break-words inline-flex items-start gap-1 min-w-0"
                            style={{ color: 'var(--prism-text-secondary)' }}
                          >
                            <MessageSquare
                              aria-hidden="true"
                              className="w-3 h-3 shrink-0 mt-0.5"
                            />
                            <span className="min-w-0 break-words">{node.comment}</span>
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </button>

                  {index < currentReviewers.length - 1 ? (
                    <span
                      aria-hidden="true"
                      data-testid={`approval-connector-${index}`}
                      data-connector-mode={mode}
                      className="inline-flex items-center justify-center self-center shrink-0 px-0.5"
                      style={{
                        color:
                          mode === 'sequential' && node.status === 'approved'
                            ? 'var(--prism-success-main)'
                            : 'var(--prism-text-disabled)',
                      }}
                    >
                      {mode === 'sequential' ? (
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      ) : (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: 'var(--prism-text-disabled)' }}
                        />
                      )}
                    </span>
                  ) : null}
                </Fragment>
              );
            })}
          </div>

          {/* Interactive Reviewer Action Bar */}
          {!readOnly ? (
            <div
              data-testid="approval-action-bar"
              className={cx(
                actionBarClass,
                'prism-well rounded-2xl p-3.5 flex flex-col gap-3 min-w-0 max-w-full'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                <div
                  data-testid="approval-selected-summary"
                  className="flex flex-wrap items-center gap-1.5 text-xs min-w-0"
                >
                  <span
                    className="font-semibold truncate"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    {activeReviewer.name}
                  </span>
                  <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
                    ·
                  </span>
                  <span className="truncate" style={{ color: 'var(--prism-text-secondary)' }}>
                    {activeReviewer.role}
                  </span>
                </div>

                <span
                  data-testid="approval-selected-status"
                  className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0"
                  style={{
                    color: getStatusMeta(activeReviewer.status).colorToken,
                    borderColor: getStatusMeta(activeReviewer.status).colorToken,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                  }}
                >
                  {renderStatusIcon(activeReviewer.status, 'w-3 h-3 shrink-0')}
                  <span>{getStatusMeta(activeReviewer.status).label}</span>
                </span>
              </div>

              {selectedBlockingReviewer ? (
                <div
                  data-testid="approval-gating-notice"
                  className="prism-crystal rounded-xl px-3 py-2 flex items-center gap-2 text-xs min-w-0"
                  style={{
                    color: 'var(--prism-warning-main)',
                    borderColor: 'var(--prism-warning-main)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                  }}
                >
                  <Lock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  <span className="min-w-0 break-words">
                    Waiting on prior stage: {selectedBlockingReviewer.role} (
                    {selectedBlockingReviewer.name}) must approve before this stage can be approved.
                  </span>
                </div>
              ) : null}

              <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 min-w-0 max-w-full">
                <div className="prism-crystal flex-1 min-w-0 h-9 px-3 rounded-full flex items-center">
                  <input
                    id={noteInputId}
                    type="text"
                    aria-label="Reviewer decision note"
                    value={noteInput}
                    disabled={disabled}
                    placeholder="Optional decision note..."
                    onChange={(event) => setNoteInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        !event.nativeEvent.isComposing &&
                        !disabled &&
                        !isSelectedBlocked
                      ) {
                        event.preventDefault();
                        applyDecision(activeReviewer, 'approved');
                      }
                    }}
                    className="w-full min-w-0 bg-transparent text-xs focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
                    style={{ color: 'var(--prism-text-primary)' }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={disabled || isSelectedBlocked}
                    data-testid="approval-action-approve"
                    onClick={() => applyDecision(activeReviewer, 'approved')}
                    className="prism-btn-primary prism-focus-ring h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="w-3.5 h-3.5 shrink-0 relative z-10"
                    />
                    <span className="relative z-10">Approve</span>
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    data-testid="approval-action-changes"
                    onClick={() => applyDecision(activeReviewer, 'changes-requested')}
                    className="prism-btn-secondary prism-focus-ring h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: 'var(--prism-warning-main)' }}
                  >
                    <AlertTriangle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    <span>Request Changes</span>
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    data-testid="approval-action-reject"
                    onClick={() => applyDecision(activeReviewer, 'rejected')}
                    className="prism-btn-secondary prism-focus-ring h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: 'var(--prism-error-main)' }}
                  >
                    <XCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    data-testid="approval-action-reset"
                    onClick={() => applyDecision(activeReviewer, 'pending')}
                    className="prism-crystal prism-focus-ring rounded-full h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    <span>Reset Pending</span>
                  </button>
                </div>
              </div>

              <div
                aria-live="polite"
                aria-atomic="true"
                data-testid="approval-live-announcement"
                className="text-[11px] leading-snug min-w-0 break-words"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {announcement ||
                  'Select a reviewer stage and choose an action to update this approval chain.'}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

ApprovalChainStrip.displayName = 'ApprovalChainStrip';
