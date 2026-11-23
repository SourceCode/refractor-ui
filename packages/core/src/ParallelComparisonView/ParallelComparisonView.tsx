'use client';

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Clock, Columns2, Copy, Cpu, Gauge, Hash, Trophy } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, formatUsNumber } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface ComparisonCandidate {
  /** Stable unique identifier for this parallel candidate response. */
  id: string;
  /** Visible heading identifying the candidate branch or agent run. */
  label: string;
  /** Optional model identifier badge (e.g. `'claude-3.7-sonnet'`, `'gemini-2.5-pro'`). */
  model?: string;
  /** Literal candidate output rendered inside the recessed prism-well panel. */
  output: string;
  /** Optional response latency in milliseconds (rendered when finite and >= 0). */
  latencyMs?: number;
  /** Optional token usage count (rendered when finite and >= 0). */
  tokens?: number;
  /** Optional evaluation score clamped to `0..100` when finite. */
  score?: number;
}

export interface ParallelComparisonViewProps extends BaseProps<HTMLDivElement> {
  /** Parallel candidate responses to compare side-by-side. */
  candidates: ComparisonCandidate[];
  /** Controlled selected winner candidate id. */
  winnerId?: string;
  /** Initial selected winner candidate id in uncontrolled mode (defaults to `''`). */
  defaultWinnerId?: string;
  /** Callback invoked when a candidate is selected as winner. */
  onSelectWinner?: (candidate: ComparisonCandidate) => void;
  /** Callback invoked when the active winner output is copied. */
  onCopyWinner?: (candidate: ComparisonCandidate) => void;
  /** Heading label rendered in the comparison slab header (defaults to `'Parallel Candidate Comparison'`). */
  title?: string;
}

const COPY_FEEDBACK_DURATION_MS = 1600;

function formatLatencyMs(latencyMs: number | undefined): string | null {
  if (latencyMs === undefined || !Number.isFinite(latencyMs) || latencyMs < 0) {
    return null;
  }
  const roundedMs = Math.round(latencyMs);
  if (roundedMs < 1000) {
    return `${roundedMs}ms`;
  }
  return `${(Math.round(roundedMs / 100) / 10).toFixed(1)}s`;
}

function formatTokens(tokens: number | undefined): string | null {
  if (tokens === undefined || !Number.isFinite(tokens) || tokens < 0) {
    return null;
  }
  return `${formatUsNumber(Math.round(tokens))} tok`;
}

function normalizeScore(score: number | undefined): number | null {
  if (score === undefined || !Number.isFinite(score)) {
    return null;
  }
  return Math.round(clampNumber(score, 0, 100, 0));
}

function ParallelComparisonViewInner({
  candidates,
  winnerId,
  defaultWinnerId,
  onSelectWinner,
  onCopyWinner,
  title = 'Parallel Candidate Comparison',
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: ParallelComparisonViewProps) {
  const override = useComponentOverride('ParallelComparisonView');
  const titleId = useId();

  const [selectedWinnerId, setSelectedWinnerId] = useControllableState<string>({
    value: winnerId,
    defaultValue: defaultWinnerId ?? '',
  });

  const activeWinner = useMemo<ComparisonCandidate | undefined>(() => {
    if (!selectedWinnerId) {
      return undefined;
    }
    return candidates.find((candidate) => candidate.id === selectedWinnerId);
  }, [candidates, selectedWinnerId]);

  const isEmpty = candidates.length === 0;
  const hasWinner = Boolean(activeWinner);

  const [copied, setCopied] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCopyTimer = useCallback(() => {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCopyTimer();
    };
  }, [clearCopyTimer]);

  const handleSelectWinner = useCallback(
    (candidate: ComparisonCandidate) => {
      if (candidate.id !== selectedWinnerId) {
        clearCopyTimer();
        setCopied(false);
      }
      setSelectedWinnerId(candidate.id);
      setStatusMessage(`Selected "${candidate.label}" as comparison winner.`);
      onSelectWinner?.(candidate);
    },
    [clearCopyTimer, onSelectWinner, selectedWinnerId, setSelectedWinnerId]
  );

  const handleCopyWinner = useCallback(
    (winner: ComparisonCandidate) => {
      try {
        const clipboard = navigator.clipboard;
        if (clipboard && typeof clipboard.writeText === 'function') {
          void Promise.resolve(clipboard.writeText(winner.output)).catch(() => undefined);
        }
      } catch {
        // Clipboard API unavailable or restricted; continue with callback and confirmation state.
      }

      onCopyWinner?.(winner);
      setCopied(true);
      setStatusMessage(`Copied winner "${winner.label}" output to clipboard.`);

      clearCopyTimer();
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, COPY_FEEDBACK_DURATION_MS);
    },
    [clearCopyTimer, onCopyWinner]
  );

  const merged = mergeProps({
    themeTarget: themeProps('parallel-comparison-view', {
      candidateCount: candidates.length,
      hasWinner,
      winnerId: activeWinner?.id,
      copied,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full flex flex-col gap-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('parallel-comparison-view', 'header');
  const gridClass = stableClassName('parallel-comparison-view', 'grid');
  const cardClass = stableClassName('parallel-comparison-view', 'card');
  const outputClass = stableClassName('parallel-comparison-view', 'output');
  const selectBtnClass = stableClassName('parallel-comparison-view', 'select-button');
  const copyBtnClass = stableClassName('parallel-comparison-view', 'copy-button');
  const emptyClass = stableClassName('parallel-comparison-view', 'empty');

  const countLabel = `${candidates.length} ${candidates.length === 1 ? 'candidate' : 'candidates'}`;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={!ariaLabel && title ? titleId : undefined}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <div className="min-w-0 flex flex-wrap items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Columns2 aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>

          {title ? (
            <h3
              id={titleId}
              className="m-0 text-sm sm:text-base font-semibold leading-snug break-words"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </h3>
          ) : null}

          <span
            data-testid="comparison-candidate-count"
            className="prism-well rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {countLabel}
          </span>

          {activeWinner ? (
            <span
              data-testid="comparison-active-winner"
              className="prism-emerald rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5 text-xs font-semibold shrink-0"
            >
              <Trophy aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[14rem]">Winner: {activeWinner.label}</span>
            </span>
          ) : null}
        </div>

        <button
          type="button"
          disabled={!activeWinner}
          data-copied={copied ? 'true' : undefined}
          onClick={activeWinner ? () => handleCopyWinner(activeWinner) : undefined}
          className={cx(
            copyBtnClass,
            'prism-focus-ring h-8 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed',
            copied ? 'prism-emerald font-semibold' : 'prism-crystal'
          )}
          style={copied ? undefined : { color: 'var(--prism-text-primary)' }}
        >
          {copied ? (
            <>
              <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Copy Winner</span>
            </>
          )}
        </button>
      </div>

      {isEmpty ? (
        <div
          data-testid="comparison-empty-state"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-center'
          )}
        >
          <Columns2
            aria-hidden="true"
            className="w-6 h-6 shrink-0"
            style={STYLE_TEXT_DISABLED}
          />
          <p
            className="m-0 text-sm font-semibold"
            style={STYLE_TEXT_PRIMARY}
          >
            No candidates to compare
          </p>
          <p
            className="m-0 text-xs max-w-md leading-relaxed"
            style={STYLE_TEXT_SECONDARY}
          >
            Provide two or more parallel candidate outputs to inspect metrics and select a winner.
          </p>
        </div>
      ) : (
        <div className={cx(gridClass, 'grid grid-cols-1 md:grid-cols-2 gap-4')}>
          {candidates.map((candidate) => {
            const isWinner = activeWinner?.id === candidate.id;
            const latencyLabel = formatLatencyMs(candidate.latencyMs);
            const tokensLabel = formatTokens(candidate.tokens);
            const scoreValue = normalizeScore(candidate.score);
            const hasTelemetry = Boolean(latencyLabel || tokensLabel || scoreValue !== null);

            return (
              <article
                key={candidate.id}
                data-candidate-id={candidate.id}
                data-winner={isWinner ? 'true' : undefined}
                className={cx(
                  cardClass,
                  'prism-crystal rounded-2xl p-4 flex flex-col gap-3 transition-[color,background-color,border-color,opacity,transform]',
                  isWinner ? 'ring-2 ring-[var(--prism-primary-main)]' : ''
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex flex-wrap items-center gap-2">
                      <h4
                        className="m-0 text-sm font-semibold leading-snug break-words"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {candidate.label}
                      </h4>

                      {candidate.model ? (
                        <span
                          data-candidate-model={candidate.model}
                          className="prism-well rounded-full px-2 py-0.5 inline-flex items-center gap-1 font-mono text-[11px] font-medium shrink-0"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          <Cpu aria-hidden="true" className="w-3 h-3 shrink-0" />
                          <span>{candidate.model}</span>
                        </span>
                      ) : null}
                    </div>

                    {isWinner ? (
                      <span
                        data-testid={`candidate-winner-badge-${candidate.id}`}
                        className="prism-emerald rounded-full px-2.5 py-0.5 inline-flex items-center gap-1 text-[11px] font-semibold shrink-0"
                      >
                        <Trophy aria-hidden="true" className="w-3 h-3 shrink-0" />
                        <span>Winner</span>
                      </span>
                    ) : null}
                  </div>

                  {hasTelemetry ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {latencyLabel ? (
                        <span
                          data-metric="latency"
                          className="prism-well rounded-full px-2 py-0.5 inline-flex items-center gap-1 font-mono text-[11px] tabular-nums"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          <Clock aria-hidden="true" className="w-3 h-3 shrink-0" />
                          <span>{latencyLabel}</span>
                        </span>
                      ) : null}

                      {tokensLabel ? (
                        <span
                          data-metric="tokens"
                          className="prism-well rounded-full px-2 py-0.5 inline-flex items-center gap-1 font-mono text-[11px] tabular-nums"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          <Hash aria-hidden="true" className="w-3 h-3 shrink-0" />
                          <span>{tokensLabel}</span>
                        </span>
                      ) : null}

                      {scoreValue !== null ? (
                        <span
                          data-metric="score"
                          className="prism-well rounded-full px-2 py-0.5 inline-flex items-center gap-1 font-mono text-[11px] font-semibold tabular-nums"
                          style={STYLE_PRIMARY_MAIN}
                        >
                          <Gauge aria-hidden="true" className="w-3 h-3 shrink-0" />
                          <span>Score {scoreValue}/100</span>
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div
                  className={cx(
                    outputClass,
                    'prism-well rounded-xl p-3.5 flex-1 overflow-x-auto max-h-80 overflow-y-auto'
                  )}
                >
                  <div
                    data-testid={`candidate-output-${candidate.id}`}
                    className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {candidate.output}
                  </div>
                </div>

                <div className="pt-0.5">
                  <button
                    type="button"
                    aria-pressed={isWinner}
                    data-candidate-action={candidate.id}
                    onClick={() => handleSelectWinner(candidate)}
                    className={cx(
                      selectBtnClass,
                      isWinner ? 'prism-btn-primary font-semibold' : 'prism-btn-secondary font-medium',
                      'prism-focus-ring w-full h-9 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105'
                    )}
                  >
                    {isWinner ? (
                      <>
                        <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
                        <span className="relative z-10">Selected Winner</span>
                      </>
                    ) : (
                      <>
                        <Trophy aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
                        <span className="relative z-10">Select Winner</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}

export const ParallelComparisonView = memo(ParallelComparisonViewInner);
ParallelComparisonView.displayName = 'ParallelComparisonView';
