'use client';


import { Clock, FileCode2, GitFork, History, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface AgentCheckpoint {
  /** Stable unique identifier for the checkpoint. */
  id: string;
  /** Concise label summarizing the milestone captured at this checkpoint. */
  label: string;
  /** Conversation or execution turn number associated with this checkpoint. */
  turn: number;
  /** Human-readable timestamp (e.g. '14:22:08' or '3m ago'). */
  timestamp: string;
  /** Count of files modified at this checkpoint (clamped >= 0). */
  filesChanged: number;
  /** Optional summary explaining changes captured in this snapshot. */
  summary?: string;
}

export interface CheckpointRollbackStripProps extends BaseProps<HTMLDivElement> {
  /** Chronological array of agent execution checkpoints. */
  checkpoints: AgentCheckpoint[];
  /** Controlled active checkpoint identifier. */
  activeCheckpointId?: string;
  /** Initial active checkpoint identifier in uncontrolled mode (defaults to last checkpoint id or ''). */
  defaultActiveCheckpointId?: string;
  /** Callback fired when a checkpoint pill is selected. */
  onSelectCheckpoint?: (cp: AgentCheckpoint) => void;
  /** Callback fired when the Rollback button is activated for the active checkpoint. */
  onRollback?: (cp: AgentCheckpoint) => void;
  /** Callback fired when the Fork Conversation button is activated for the active checkpoint. */
  onFork?: (cp: AgentCheckpoint) => void;
  /** Disables checkpoint pill selection, Rollback, and Fork Conversation buttons. */
  disabled?: boolean;
}

function clampNonNegativeInt(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function formatFilesChanged(filesChanged: number): string {
  const safeCount = clampNonNegativeInt(filesChanged);
  return safeCount === 1 ? '1 file' : `${safeCount} files`;
}

const trackClass = /*#__PURE__*/ stableClassName('checkpoint-rollback-strip', 'track');
const footerClass = /*#__PURE__*/ stableClassName('checkpoint-rollback-strip', 'footer');

function CheckpointRollbackStripInner({
  checkpoints,
  activeCheckpointId,
  defaultActiveCheckpointId,
  onSelectCheckpoint,
  onRollback,
  onFork,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CheckpointRollbackStripProps) {
  const override = useComponentOverride('CheckpointRollbackStrip');

  const lastCheckpoint = checkpoints[checkpoints.length - 1];
  const fallbackId = lastCheckpoint ? lastCheckpoint.id : '';

  const [selectedId, setSelectedId] = useControllableState<string>({
    value: activeCheckpointId,
    defaultValue: defaultActiveCheckpointId ?? fallbackId,
  });

  const activeCheckpoint = checkpoints.find((cp) => cp.id === selectedId) ?? lastCheckpoint;

  const handleSelect = (cp: AgentCheckpoint) => {
    setSelectedId(cp.id);
    onSelectCheckpoint?.(cp);
  };

  const merged = mergeProps({
    themeTarget: themeProps('checkpoint-rollback-strip', {
      disabled,
      empty: checkpoints.length === 0,
      activeCheckpointId: activeCheckpoint?.id,
    }),
    baseClassName: 'prism-slab p-3.5 sm:p-4 w-full flex flex-col gap-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="region" aria-label="Agent checkpoints" {...rest} {...merged}>
      {!activeCheckpoint ? (
        <div
          role="status"
          data-testid="checkpoint-empty-state"
          className="prism-well rounded-2xl px-4 py-3 flex items-center gap-2.5 text-xs"
          style={STYLE_TEXT_SECONDARY}
        >
          <History aria-hidden="true" className="w-4 h-4 shrink-0" />
          <span>No checkpoints recorded yet.</span>
        </div>
      ) : (
        <>
          <div
            role="group"
            aria-label="Checkpoint turns"
            data-testid="checkpoint-strip-track"
            className={cx(trackClass, 'flex items-center gap-2 overflow-x-auto pb-1')}
          >
            {checkpoints.map((cp) => {
              const isActive = cp.id === activeCheckpoint.id;
              const safeTurn = clampNonNegativeInt(cp.turn);
              const filesLabel = formatFilesChanged(cp.filesChanged);

              return (
                <button
                  key={cp.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isActive}
                  data-active={isActive ? 'true' : undefined}
                  data-testid={`checkpoint-pill-${cp.id}`}
                  onClick={() => handleSelect(cp)}
                  className="prism-crystal prism-focus-ring rounded-2xl px-3 py-2 text-left inline-flex flex-col gap-1 shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 border-[1.5px] border-solid"
                  style={{
                    borderColor: isActive ? 'var(--prism-primary-main)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold tabular-nums whitespace-nowrap"
                      style={{
                        color: isActive
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-text-secondary)',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: isActive
                            ? 'var(--prism-primary-main)'
                            : 'var(--prism-text-disabled)',
                        }}
                      />
                      <span>Turn {safeTurn}</span>
                    </span>

                    <span
                      data-testid={`checkpoint-files-${cp.id}`}
                      className="prism-well rounded-full px-2 py-0.5 inline-flex items-center gap-1 text-[10px] font-mono tabular-nums whitespace-nowrap"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      <FileCode2 aria-hidden="true" className="w-3 h-3 shrink-0" />
                      <span>{filesLabel}</span>
                    </span>
                  </div>

                  <span
                    className="text-xs font-semibold truncate max-w-[190px]"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {cp.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            data-testid="checkpoint-detail-footer"
            className={cx(
              footerClass,
              'flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3'
            )}
            style={{ borderTop: '1px solid var(--prism-divider)' }}
          >
            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <div
                data-testid="checkpoint-timestamp"
                className="inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums"
                style={STYLE_TEXT_SECONDARY}
              >
                <Clock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>{activeCheckpoint.timestamp}</span>
              </div>

              {activeCheckpoint.summary ? (
                <p
                  data-testid="checkpoint-summary"
                  className="text-xs leading-relaxed"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {activeCheckpoint.summary}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRollback?.(activeCheckpoint)}
                className="prism-btn-primary prism-focus-ring h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
                <span className="relative z-10">Rollback</span>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onFork?.(activeCheckpoint)}
                className="prism-btn-secondary prism-focus-ring h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GitFork aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Fork Conversation</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const CheckpointRollbackStrip = /*#__PURE__*/ memoWithDisplayName(CheckpointRollbackStripInner, 'CheckpointRollbackStrip');
