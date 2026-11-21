'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Database,
  Loader2,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type TraceSpanKind = 'llm' | 'tool' | 'handoff' | 'retrieval';

export type TraceSpanStatus = 'ok' | 'running' | 'error';

export interface TraceSpan {
  /** Unique identifier for the trace span. */
  id: string;
  /** Name of the agent that executed this span. */
  agentName: string;
  /** Concise operation label rendered on the waterfall row and detail drawer. */
  label: string;
  /** Semantic category of the operation ('llm' | 'tool' | 'handoff' | 'retrieval'). */
  kind: TraceSpanKind;
  /** Execution lifecycle status of the span ('ok' | 'running' | 'error'). */
  status: TraceSpanStatus;
  /** Start offset in milliseconds relative to trace start (sanitized to >= 0). */
  startMs: number;
  /** Duration in milliseconds (sanitized to >= 0). */
  durationMs: number;
  /** Optional token count consumed by this span (sanitized to >= 0 when finite). */
  tokens?: number;
  /** Optional diagnostic or payload detail rendered strictly as literal text in the detail drawer. */
  detail?: string;
}

export interface AgentExecutionTraceProps extends BaseProps<HTMLDivElement> {
  /** Ordered list of execution trace spans rendered on the waterfall timeline. */
  spans: TraceSpan[];
  /** Header title for the trace slab (defaults to 'Execution Waterfall Trace'). */
  title?: string;
  /** Callback invoked whenever a span row is clicked. */
  onSelectSpan?: (span: TraceSpan) => void;
  /** Controlled identifier of the currently selected span. */
  selectedSpanId?: string;
  /** Initial selected span identifier in uncontrolled mode. */
  defaultSelectedSpanId?: string;
}

type TraceFilterKind = 'all' | TraceSpanKind;

interface NormalizedTraceSpan {
  span: TraceSpan;
  safeStartMs: number;
  safeDurationMs: number;
  safeTokens: number;
}

interface KindVisual {
  label: string;
  colorToken: string;
  icon: ReactNode;
}

interface StatusVisual {
  label: string;
  pillClass: string;
  colorToken: string;
  borderToken?: string;
  icon: ReactNode;
}

const FILTER_OPTIONS: ReadonlyArray<{ value: TraceFilterKind; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'llm', label: 'LLM' },
  { value: 'tool', label: 'Tool' },
  { value: 'handoff', label: 'Handoff' },
  { value: 'retrieval', label: 'Retrieval' },
];

function sanitizeNonNegative(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function formatDuration(ms: number): string {
  const rounded = Math.round(ms);
  if (rounded < 1000) {
    return `${rounded}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTokenCount(tokens: number): string {
  return Math.round(tokens).toLocaleString('en-US');
}

function formatPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

function getKindVisual(kind: TraceSpanKind): KindVisual {
  switch (kind) {
    case 'llm':
      return {
        label: 'LLM',
        colorToken: 'var(--prism-primary-main)',
        icon: <Sparkles aria-hidden="true" className="w-3 h-3 shrink-0" />,
      };
    case 'tool':
      return {
        label: 'Tool',
        colorToken: 'var(--prism-info-main)',
        icon: <Wrench aria-hidden="true" className="w-3 h-3 shrink-0" />,
      };
    case 'handoff':
      return {
        label: 'Handoff',
        colorToken: 'var(--prism-warning-main)',
        icon: <ArrowRightLeft aria-hidden="true" className="w-3 h-3 shrink-0" />,
      };
    case 'retrieval':
      return {
        label: 'Retrieval',
        colorToken: 'var(--prism-secondary-dark)',
        icon: <Database aria-hidden="true" className="w-3 h-3 shrink-0" />,
      };
  }
}

function getStatusVisual(status: TraceSpanStatus): StatusVisual {
  switch (status) {
    case 'ok':
      return {
        label: 'OK',
        pillClass: 'prism-emerald',
        colorToken: 'var(--prism-success-contrast)',
        icon: <CheckCircle2 aria-hidden="true" className="w-3 h-3 shrink-0" />,
      };
    case 'running':
      return {
        label: 'Running',
        pillClass: 'prism-crystal',
        colorToken: 'var(--prism-primary-main)',
        borderToken: 'var(--prism-primary-main)',
        icon: <Loader2 aria-hidden="true" className="w-3 h-3 shrink-0 animate-spin" />,
      };
    case 'error':
      return {
        label: 'Error',
        pillClass: 'prism-crystal',
        colorToken: 'var(--prism-error-main)',
        borderToken: 'var(--prism-error-main)',
        icon: <AlertCircle aria-hidden="true" className="w-3 h-3 shrink-0" />,
      };
  }
}

export function AgentExecutionTrace({
  spans,
  title = 'Execution Waterfall Trace',
  onSelectSpan,
  selectedSpanId,
  defaultSelectedSpanId,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AgentExecutionTraceProps) {
  const override = useComponentOverride('AgentExecutionTrace');
  const headingId = useId();
  const [activeFilter, setActiveFilter] = useState<TraceFilterKind>('all');

  const [currentSelectedId, setCurrentSelectedId] = useControllableState<string>({
    value: selectedSpanId,
    defaultValue: defaultSelectedSpanId ?? '',
  });

  const normalizedSpans = useMemo<NormalizedTraceSpan[]>(
    () =>
      spans.map((span) => ({
        span,
        safeStartMs: sanitizeNonNegative(span.startMs),
        safeDurationMs: sanitizeNonNegative(span.durationMs),
        safeTokens: sanitizeNonNegative(span.tokens),
      })),
    [spans]
  );

  const rawEndMs = normalizedSpans.reduce(
    (maxEnd, item) => Math.max(maxEnd, item.safeStartMs + item.safeDurationMs),
    0
  );
  const totalHorizonMs = Math.max(1, rawEndMs);
  const totalTokens = normalizedSpans.reduce((sum, item) => sum + item.safeTokens, 0);

  const visibleSpans = useMemo(
    () =>
      activeFilter === 'all'
        ? normalizedSpans
        : normalizedSpans.filter((item) => item.span.kind === activeFilter),
    [activeFilter, normalizedSpans]
  );

  const selectedItem =
    visibleSpans.find((item) => item.span.id === currentSelectedId) ?? null;

  const isEmpty = visibleSpans.length === 0;
  const hasErrorSpan = normalizedSpans.some((item) => item.span.status === 'error');

  const handleSelectSpan = (span: TraceSpan) => {
    setCurrentSelectedId(span.id);
    onSelectSpan?.(span);
  };

  const merged = mergeProps({
    themeTarget: themeProps('agent-execution-trace', {
      filter: activeFilter,
      empty: isEmpty,
      hasSelection: selectedItem !== null,
      hasError: hasErrorSpan,
    }),
    baseClassName: 'prism-slab overflow-hidden w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('agent-execution-trace', 'header');
  const filtersClass = stableClassName('agent-execution-trace', 'filters');
  const timelineClass = stableClassName('agent-execution-trace', 'timeline');
  const drawerClass = stableClassName('agent-execution-trace', 'drawer');

  const spanCountLabel =
    activeFilter === 'all'
      ? `${normalizedSpans.length} ${normalizedSpans.length === 1 ? 'span' : 'spans'}`
      : `${visibleSpans.length} / ${normalizedSpans.length} spans`;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div
        className={cx(headerClass, 'px-4 pt-4 pb-3 space-y-3 border-b')}
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0 flex items-center gap-2.5">
            <span
              className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
              style={{
                color: hasErrorSpan ? 'var(--prism-error-main)' : 'var(--prism-primary-main)',
              }}
            >
              <Activity aria-hidden="true" className="w-4 h-4 shrink-0" />
            </span>
            <h3
              id={headingId}
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span
              data-testid="agent-trace-total-duration"
              className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums shrink-0"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {formatDuration(rawEndMs)}
            </span>
            <span
              data-testid="agent-trace-total-tokens"
              className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {formatTokenCount(totalTokens)} tokens
            </span>
            <span
              data-testid="agent-trace-span-count"
              className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {spanCountLabel}
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Filter trace spans by kind"
          className={cx(filtersClass, 'flex flex-wrap items-center gap-1.5')}
        >
          {FILTER_OPTIONS.map((option) => {
            const isPressed = activeFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isPressed}
                data-testid={`agent-trace-filter-${option.value}`}
                data-filter-kind={option.value}
                onClick={() => setActiveFilter(option.value)}
                className={cx(
                  'prism-focus-ring h-7 px-3 rounded-full text-[11px] font-semibold inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all',
                  isPressed ? 'prism-btn-primary' : 'prism-well'
                )}
                style={isPressed ? undefined : { color: 'var(--prism-text-secondary)' }}
              >
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isEmpty ? (
          <div
            data-testid="agent-trace-empty"
            className="prism-well rounded-2xl py-6 px-4 text-center space-y-2.5"
          >
            <p className="text-xs font-medium" style={{ color: 'var(--prism-text-secondary)' }}>
              {normalizedSpans.length === 0
                ? 'No execution spans recorded yet.'
                : 'No trace spans match the active kind filter.'}
            </p>
            {normalizedSpans.length > 0 ? (
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="prism-btn-secondary prism-focus-ring h-7 px-3 rounded-full text-[11px] font-semibold inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
              >
                Show all spans
              </button>
            ) : null}
          </div>
        ) : (
          <ul className={cx(timelineClass, 'space-y-2')}>
            {visibleSpans.map((item) => {
              const { span, safeStartMs, safeDurationMs } = item;
              const isSelected = span.id === currentSelectedId;
              const kindVisual = getKindVisual(span.kind);
              const statusVisual = getStatusVisual(span.status);
              const offsetPct = Math.min(96, (safeStartMs / totalHorizonMs) * 100);
              const rawWidthPct = (safeDurationMs / totalHorizonMs) * 100;
              const widthPct = Math.min(100 - offsetPct, Math.max(0, rawWidthPct));
              const barColorToken =
                span.status === 'error' ? 'var(--prism-error-main)' : kindVisual.colorToken;

              return (
                <li key={span.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    data-testid={`agent-trace-row-${span.id}`}
                    data-span-id={span.id}
                    data-span-kind={span.kind}
                    data-span-status={span.status}
                    data-selected={isSelected ? 'true' : undefined}
                    onClick={() => handleSelectSpan(span)}
                    className="prism-crystal prism-focus-ring w-full rounded-2xl px-3 py-2.5 text-left space-y-2 border cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
                    style={
                      isSelected
                        ? {
                            borderColor: 'var(--prism-primary-main)',
                            boxShadow: '0 0 0 2px var(--prism-primary-main)',
                          }
                        : {
                            borderColor: 'var(--prism-divider)',
                          }
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex flex-wrap items-center gap-2">
                        <span
                          className="text-xs font-semibold truncate"
                          style={{ color: 'var(--prism-text-primary)' }}
                        >
                          {span.agentName}
                        </span>
                        <span
                          className="text-xs truncate"
                          style={{ color: 'var(--prism-text-secondary)' }}
                        >
                          {span.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          data-testid={`agent-trace-kind-${span.id}`}
                          className="prism-well inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border"
                          style={{
                            color: kindVisual.colorToken,
                            borderColor: kindVisual.colorToken,
                          }}
                        >
                          {kindVisual.icon}
                          <span>{kindVisual.label}</span>
                        </span>

                        <span
                          data-testid={`agent-trace-status-${span.id}`}
                          data-status={span.status}
                          className={cx(
                            statusVisual.pillClass,
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight',
                            statusVisual.borderToken && 'border'
                          )}
                          style={
                            statusVisual.borderToken
                              ? {
                                  color: statusVisual.colorToken,
                                  borderColor: statusVisual.borderToken,
                                }
                              : { color: statusVisual.colorToken }
                          }
                        >
                          {statusVisual.icon}
                          <span>{statusVisual.label}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div
                        data-testid={`agent-trace-track-${span.id}`}
                        className="prism-well relative flex-1 h-3 rounded-full overflow-hidden"
                      >
                        <div
                          data-testid={`agent-trace-bar-${span.id}`}
                          className={cx(
                            'absolute top-0.5 bottom-0.5 rounded-full transition-all duration-200',
                            span.status === 'running' && 'animate-pulse'
                          )}
                          style={{
                            left: formatPercent(offsetPct),
                            width: formatPercent(widthPct),
                            minWidth: '4%',
                            backgroundColor: barColorToken,
                          }}
                        />
                      </div>

                      <span
                        data-testid={`agent-trace-duration-${span.id}`}
                        className="font-mono text-[11px] font-medium tabular-nums w-14 text-right shrink-0"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {formatDuration(safeDurationMs)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {selectedItem ? (
          <div
            role="region"
            aria-label="Selected trace span details"
            data-testid="agent-trace-detail"
            className={cx(drawerClass, 'prism-well rounded-2xl p-3.5 space-y-2.5 border')}
            style={{ borderColor: 'var(--prism-divider)' }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0 flex flex-wrap items-baseline gap-2">
                <span
                  data-testid="agent-trace-detail-agent"
                  className="text-xs font-semibold"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {selectedItem.span.agentName}
                </span>
                <span
                  data-testid="agent-trace-detail-label"
                  className="text-xs"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  {selectedItem.span.label}
                </span>
              </div>
              <span
                className="font-mono text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Span ID: {selectedItem.span.id}
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs tabular-nums">
              <div
                className="prism-crystal rounded-xl px-2.5 py-1.5 border"
                style={{ borderColor: 'var(--prism-divider)' }}
              >
                <dt
                  className="text-[10px] uppercase tracking-wide"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  Start Offset
                </dt>
                <dd
                  data-testid="agent-trace-detail-start"
                  className="font-semibold"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {formatDuration(selectedItem.safeStartMs)}
                </dd>
              </div>

              <div
                className="prism-crystal rounded-xl px-2.5 py-1.5 border"
                style={{ borderColor: 'var(--prism-divider)' }}
              >
                <dt
                  className="text-[10px] uppercase tracking-wide"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  Duration
                </dt>
                <dd
                  data-testid="agent-trace-detail-duration"
                  className="font-semibold"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {formatDuration(selectedItem.safeDurationMs)}
                </dd>
              </div>

              <div
                className="prism-crystal rounded-xl px-2.5 py-1.5 border"
                style={{ borderColor: 'var(--prism-divider)' }}
              >
                <dt
                  className="text-[10px] uppercase tracking-wide"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  Tokens
                </dt>
                <dd
                  data-testid="agent-trace-detail-tokens"
                  className="font-semibold"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {selectedItem.span.tokens !== undefined
                    ? formatTokenCount(selectedItem.safeTokens)
                    : '—'}
                </dd>
              </div>
            </dl>

            {selectedItem.span.detail ? (
              <p
                data-testid="agent-trace-detail-text"
                className="text-xs leading-relaxed whitespace-pre-wrap break-words pt-1 border-t"
                style={{
                  color: 'var(--prism-text-primary)',
                  borderColor: 'var(--prism-divider)',
                }}
              >
                {selectedItem.span.detail}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

AgentExecutionTrace.displayName = 'AgentExecutionTrace';
