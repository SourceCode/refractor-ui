'use client';

import { useCallback, useId, useMemo, useState, type KeyboardEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  GitBranch,
  RotateCcw,
  Tag,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type DistributedTraceSpanStatus = 'ok' | 'slow' | 'error';

export type TraceServiceTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'info';

export interface TraceSpanItem {
  /** Unique identifier for this distributed trace span. */
  id: string;
  /** Optional parent span identifier (`null` or omitted denotes a root span). */
  parentId?: string | null;
  /** Originating microservice or runtime name (e.g. `api-gateway`, `postgres-primary`). */
  service: string;
  /** Operation, RPC method, route, or query executed within the span. */
  operation: string;
  /** Offset in milliseconds from trace start (sanitized to >= 0). */
  startMs: number;
  /** Execution duration in milliseconds (sanitized to >= 0). */
  durationMs: number;
  /** Semantic span health status (`'ok' | 'slow' | 'error'`, defaults to `'ok'`). */
  status?: DistributedTraceSpanStatus;
  /** Marks whether this span lies on the trace's latency-determining critical path. */
  criticalPath?: boolean;
  /** Structured OpenTelemetry key-value attributes displayed as chips in the span inspector. */
  tags?: ReadonlyArray<{ key: string; value: string }>;
}

export interface DistributedTraceWaterfallProps extends BaseProps<HTMLDivElement> {
  /** Distributed trace spans to display (defaults to an 8-span 420.0 ms OpenTelemetry checkout trace when omitted; pass `[]` for empty state). */
  spans?: ReadonlyArray<TraceSpanItem>;
  /** Trace correlation identifier rendered as a monospace pill (defaults to `'tr-9f4a-8c21'`). */
  traceId?: string;
  /** Visible slab heading linked via `aria-labelledby` (defaults to `'Distributed Trace Waterfall'`). */
  title?: string;
  /** Callback fired whenever a span row is selected via click or keyboard Enter/Space. */
  onSelectSpan?: (span: TraceSpanItem) => void;
}

interface NormalizedSpanTag {
  key: string;
  value: string;
  renderKey: string;
}

interface NormalizedSpan {
  raw: TraceSpanItem;
  id: string;
  parentId: string | null;
  service: string;
  operation: string;
  startMs: number;
  durationMs: number;
  status: DistributedTraceSpanStatus;
  criticalPath: boolean;
  tags: ReadonlyArray<NormalizedSpanTag>;
  tone: TraceServiceTone;
}

interface TraceTreeRow {
  span: NormalizedSpan;
  depth: number;
  ancestorIds: ReadonlyArray<string>;
}

interface ServiceToneVisual {
  pillColor: string;
  barColor: string;
}

interface StatusVisual {
  label: string;
  color: string;
}

interface RulerTick {
  id: string;
  pctLabel: string;
  ratio: number;
}

const DEFAULT_TITLE = 'Distributed Trace Waterfall';
const DEFAULT_TRACE_ID = 'tr-9f4a-8c21';
const MAX_NESTING_DEPTH = 8;
const MIN_BAR_WIDTH_PCT = 1.5;

const RULER_TICKS: ReadonlyArray<RulerTick> = [
  { id: 'tick-0', pctLabel: '0ms', ratio: 0 },
  { id: 'tick-25', pctLabel: '25%', ratio: 0.25 },
  { id: 'tick-50', pctLabel: '50%', ratio: 0.5 },
  { id: 'tick-75', pctLabel: '75%', ratio: 0.75 },
  { id: 'tick-100', pctLabel: '100%', ratio: 1 },
];

const GUIDE_LINE_PERCENTAGES: ReadonlyArray<{ id: string; pct: string }> = [
  { id: 'guide-25', pct: '25%' },
  { id: 'guide-50', pct: '50%' },
  { id: 'guide-75', pct: '75%' },
];

const KNOWN_SERVICE_TONES = new Map<string, TraceServiceTone>([
  ['api-gateway', 'primary'],
  ['auth-svc', 'info'],
  ['postgres-primary', 'secondary'],
  ['redis-cache', 'emerald'],
  ['billing-worker', 'amber'],
]);

const DEFAULT_TRACE_SPANS: ReadonlyArray<TraceSpanItem> = [
  {
    id: 'span-root',
    parentId: null,
    service: 'api-gateway',
    operation: 'POST /v1/checkout',
    startMs: 0,
    durationMs: 420,
    status: 'error',
    criticalPath: true,
    tags: [
      { key: 'http.method', value: 'POST' },
      { key: 'http.route', value: '/v1/checkout' },
      { key: 'http.status_code', value: '502' },
      { key: 'net.peer.ip', value: '10.42.8.19' },
    ],
  },
  {
    id: 'span-auth',
    parentId: 'span-root',
    service: 'auth-svc',
    operation: 'grpc.VerifySessionToken',
    startMs: 8,
    durationMs: 36,
    status: 'ok',
    criticalPath: true,
    tags: [
      { key: 'rpc.system', value: 'grpc' },
      { key: 'auth.strategy', value: 'jwt-ed25519' },
      { key: 'tenant.tier', value: 'enterprise' },
    ],
  },
  {
    id: 'span-redis-session',
    parentId: 'span-auth',
    service: 'redis-cache',
    operation: 'GET session:usr_88412',
    startMs: 14,
    durationMs: 11,
    status: 'ok',
    criticalPath: false,
    tags: [
      { key: 'db.system', value: 'redis' },
      { key: 'cache.hit', value: 'true' },
      { key: 'db.redis.database_index', value: '0' },
    ],
  },
  {
    id: 'span-pg-cart',
    parentId: 'span-root',
    service: 'postgres-primary',
    operation: 'SELECT cart_items FOR UPDATE',
    startMs: 48,
    durationMs: 86,
    status: 'ok',
    criticalPath: true,
    tags: [
      { key: 'db.system', value: 'postgresql' },
      { key: 'db.name', value: 'commerce_prod' },
      { key: 'db.operation', value: 'SELECT' },
    ],
  },
  {
    id: 'span-redis-promo',
    parentId: 'span-root',
    service: 'redis-cache',
    operation: 'HGETALL promo:spring26',
    startMs: 56,
    durationMs: 18,
    status: 'ok',
    criticalPath: false,
    tags: [
      { key: 'db.system', value: 'redis' },
      { key: 'cache.hit', value: 'true' },
    ],
  },
  {
    id: 'span-billing-charge',
    parentId: 'span-root',
    service: 'billing-worker',
    operation: 'AuthorizePaymentIntent',
    startMs: 138,
    durationMs: 254,
    status: 'slow',
    criticalPath: true,
    tags: [
      { key: 'messaging.system', value: 'kafka' },
      { key: 'payment.provider', value: 'stripe-v2' },
      { key: 'retry.attempt', value: '2' },
    ],
  },
  {
    id: 'span-pg-ledger',
    parentId: 'span-billing-charge',
    service: 'postgres-primary',
    operation: 'INSERT ledger_entries',
    startMs: 162,
    durationMs: 148,
    status: 'slow',
    criticalPath: true,
    tags: [
      { key: 'db.system', value: 'postgresql' },
      { key: 'db.table', value: 'ledger_entries' },
      { key: 'db.lock_wait_ms', value: '94' },
    ],
  },
  {
    id: 'span-billing-webhook',
    parentId: 'span-billing-charge',
    service: 'billing-worker',
    operation: 'POST /webhooks/settlement',
    startMs: 314,
    durationMs: 78,
    status: 'error',
    criticalPath: true,
    tags: [
      { key: 'http.status_code', value: '504' },
      { key: 'error.type', value: 'UpstreamTimeoutError' },
      { key: 'otel.status_code', value: 'ERROR' },
    ],
  },
];

function sanitizeNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function normalizeStatus(status: DistributedTraceSpanStatus | undefined): DistributedTraceSpanStatus {
  if (status === 'error' || status === 'slow' || status === 'ok') {
    return status;
  }
  return 'ok';
}

function resolveServiceTone(service: string): TraceServiceTone {
  const known = KNOWN_SERVICE_TONES.get(service.toLowerCase());
  if (known) {
    return known;
  }
  let hash = 0;
  for (let i = 0; i < service.length; i += 1) {
    hash = (hash * 31 + service.charCodeAt(i)) >>> 0;
  }
  switch (hash % 5) {
    case 0:
      return 'primary';
    case 1:
      return 'secondary';
    case 2:
      return 'emerald';
    case 3:
      return 'amber';
    default:
      return 'info';
  }
}

function getServiceToneVisual(tone: TraceServiceTone): ServiceToneVisual {
  switch (tone) {
    case 'primary':
      return {
        pillColor: 'var(--prism-primary-main)',
        barColor: 'var(--prism-primary-main)',
      };
    case 'secondary':
      return {
        pillColor: 'var(--prism-secondary-dark)',
        barColor: 'var(--prism-secondary-main)',
      };
    case 'emerald':
      return {
        pillColor: 'var(--prism-success-main)',
        barColor: 'var(--prism-success-main)',
      };
    case 'amber':
      return {
        pillColor: 'var(--prism-warning-main)',
        barColor: 'var(--prism-warning-main)',
      };
    case 'info':
      return {
        pillColor: 'var(--prism-info-main)',
        barColor: 'var(--prism-info-main)',
      };
  }
}

function getStatusVisual(status: DistributedTraceSpanStatus): StatusVisual {
  switch (status) {
    case 'error':
      return {
        label: 'Error',
        color: 'var(--prism-error-main)',
      };
    case 'slow':
      return {
        label: 'Slow',
        color: 'var(--prism-warning-main)',
      };
    case 'ok':
      return {
        label: 'OK',
        color: 'var(--prism-success-main)',
      };
  }
}

function getBarColor(status: DistributedTraceSpanStatus, toneVisual: ServiceToneVisual): string {
  if (status === 'error') {
    return 'var(--prism-error-main)';
  }
  if (status === 'slow') {
    return 'var(--prism-warning-main)';
  }
  return toneVisual.barColor;
}

function formatDurationMs(ms: number): string {
  return `${ms.toFixed(1)} ms`;
}

function formatTickMs(ms: number): string {
  return `${Math.round(ms)}ms`;
}

function formatPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

function normalizeSpans(rawSpans: ReadonlyArray<TraceSpanItem>): NormalizedSpan[] {
  const seenIds = new Set<string>();
  const normalized: NormalizedSpan[] = [];

  for (const item of rawSpans) {
    const id = item.id.trim();
    if (!id || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);

    const rawParent = typeof item.parentId === 'string' ? item.parentId.trim() : '';
    const parentId = rawParent.length > 0 ? rawParent : null;
    const service = item.service.trim() || 'unknown-service';
    const operation = item.operation.trim() || 'unnamed-operation';

    const tagOccurrences = new Map<string, number>();
    const tags: NormalizedSpanTag[] = [];
    if (item.tags) {
      for (const tag of item.tags) {
        const key = tag.key.trim();
        if (!key) {
          continue;
        }
        const value = tag.value.trim();
        const baseKey = `${key}=${value}`;
        const count = (tagOccurrences.get(baseKey) ?? 0) + 1;
        tagOccurrences.set(baseKey, count);
        tags.push({
          key,
          value,
          renderKey: `${id}::${baseKey}::${count}`,
        });
      }
    }

    normalized.push({
      raw: item,
      id,
      parentId,
      service,
      operation,
      startMs: sanitizeNonNegative(item.startMs),
      durationMs: sanitizeNonNegative(item.durationMs),
      status: normalizeStatus(item.status),
      criticalPath: Boolean(item.criticalPath),
      tags,
      tone: resolveServiceTone(service),
    });
  }

  return normalized;
}

function buildTraceTree(normalizedSpans: ReadonlyArray<NormalizedSpan>): TraceTreeRow[] {
  const byId = new Map<string, NormalizedSpan>();
  for (const span of normalizedSpans) {
    byId.set(span.id, span);
  }

  const childrenByParent = new Map<string, NormalizedSpan[]>();
  const roots: NormalizedSpan[] = [];

  for (const span of normalizedSpans) {
    if (span.parentId !== null && span.parentId !== span.id && byId.has(span.parentId)) {
      const siblings = childrenByParent.get(span.parentId);
      if (siblings) {
        siblings.push(span);
      } else {
        childrenByParent.set(span.parentId, [span]);
      }
    } else {
      roots.push(span);
    }
  }

  const visited = new Set<string>();
  const rows: TraceTreeRow[] = [];

  const visit = (
    span: NormalizedSpan,
    rawDepth: number,
    ancestors: ReadonlyArray<string>
  ): void => {
    visited.add(span.id);
    const depth = Math.min(rawDepth, MAX_NESTING_DEPTH);
    rows.push({
      span,
      depth,
      ancestorIds: ancestors,
    });

    const children = childrenByParent.get(span.id);
    if (!children) {
      return;
    }

    const nextAncestors = [...ancestors, span.id];
    for (const child of children) {
      if (!visited.has(child.id)) {
        visit(child, rawDepth + 1, nextAncestors);
      }
    }
  };

  for (const root of roots) {
    visit(root, 0, []);
  }

  // Recover any disconnected cyclic component cleanly without infinite recursion.
  for (const span of normalizedSpans) {
    if (!visited.has(span.id)) {
      visit(span, 0, []);
    }
  }

  return rows;
}

export function DistributedTraceWaterfall({
  spans,
  traceId = DEFAULT_TRACE_ID,
  title = DEFAULT_TITLE,
  onSelectSpan,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: DistributedTraceWaterfallProps) {
  const override = useComponentOverride('DistributedTraceWaterfall');
  const headingId = useId();

  const [errorsOnly, setErrorsOnly] = useState<boolean>(false);
  const [criticalPathOnly, setCriticalPathOnly] = useState<boolean>(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set<string>());
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  const safeTitle = title.trim() || DEFAULT_TITLE;
  const safeTraceId = traceId.trim() || DEFAULT_TRACE_ID;

  const sourceSpans = spans === undefined ? DEFAULT_TRACE_SPANS : spans;

  const normalizedSpans = useMemo<ReadonlyArray<NormalizedSpan>>(
    () => normalizeSpans(sourceSpans),
    [sourceSpans]
  );

  const treeRows = useMemo<ReadonlyArray<TraceTreeRow>>(
    () => buildTraceTree(normalizedSpans),
    [normalizedSpans]
  );

  const totalDurationMs = useMemo<number>(() => {
    let maxEnd = 0;
    for (const span of normalizedSpans) {
      const end = span.startMs + span.durationMs;
      if (end > maxEnd) {
        maxEnd = end;
      }
    }
    return maxEnd;
  }, [normalizedSpans]);

  const errorSpanCount = useMemo<number>(
    () => normalizedSpans.filter((span) => span.status === 'error').length,
    [normalizedSpans]
  );

  const filteredRows = useMemo<ReadonlyArray<TraceTreeRow>>(() => {
    if (!errorsOnly && !criticalPathOnly) {
      return treeRows;
    }
    return treeRows.filter((row) => {
      if (errorsOnly && row.span.status !== 'error') {
        return false;
      }
      if (criticalPathOnly && !row.span.criticalPath) {
        return false;
      }
      return true;
    });
  }, [criticalPathOnly, errorsOnly, treeRows]);

  const filteredIdSet = useMemo<ReadonlySet<string>>(
    () => new Set(filteredRows.map((row) => row.span.id)),
    [filteredRows]
  );

  const parentIdsWithVisibleChildren = useMemo<ReadonlySet<string>>(() => {
    const parents = new Set<string>();
    for (const row of filteredRows) {
      for (const ancestorId of row.ancestorIds) {
        if (filteredIdSet.has(ancestorId)) {
          parents.add(ancestorId);
        }
      }
    }
    return parents;
  }, [filteredIdSet, filteredRows]);

  const visibleRows = useMemo<ReadonlyArray<TraceTreeRow>>(
    () =>
      filteredRows.filter(
        (row) =>
          !row.ancestorIds.some(
            (ancestorId) => filteredIdSet.has(ancestorId) && collapsedIds.has(ancestorId)
          )
      ),
    [collapsedIds, filteredIdSet, filteredRows]
  );

  const activeSpan = useMemo<NormalizedSpan | null>(() => {
    const firstRow = visibleRows[0];
    if (!firstRow) {
      return null;
    }
    if (selectedSpanId !== null) {
      const matched = visibleRows.find((row) => row.span.id === selectedSpanId);
      if (matched) {
        return matched.span;
      }
    }
    return firstRow.span;
  }, [selectedSpanId, visibleRows]);

  const handleToggleErrorsOnly = useCallback(() => {
    setErrorsOnly((prev) => !prev);
  }, []);

  const handleToggleCriticalPathOnly = useCallback(() => {
    setCriticalPathOnly((prev) => !prev);
  }, []);

  const handleResetFilters = useCallback(() => {
    setErrorsOnly(false);
    setCriticalPathOnly(false);
  }, []);

  const handleToggleCollapse = useCallback((spanId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(spanId)) {
        next.delete(spanId);
      } else {
        next.add(spanId);
      }
      return next;
    });
  }, []);

  const handleSelectSpan = useCallback(
    (span: NormalizedSpan) => {
      setSelectedSpanId(span.id);
      onSelectSpan?.(span.raw);
    },
    [onSelectSpan]
  );

  const handleSpanKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, span: NormalizedSpan) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectSpan(span);
      }
    },
    [handleSelectSpan]
  );

  const isFiltered = errorsOnly || criticalPathOnly;
  const isEmpty = normalizedSpans.length === 0;
  const safeHorizonMs = totalDurationMs > 0 ? totalDurationMs : 1;

  const merged = mergeProps({
    themeTarget: themeProps('distributed-trace-waterfall', {
      empty: isEmpty,
      filtered: isFiltered,
      errorsOnly,
      criticalPathOnly,
      hasErrors: errorSpanCount > 0,
      hasSelection: activeSpan !== null,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 flex flex-col gap-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('distributed-trace-waterfall', 'header');
  const viewportClass = stableClassName('distributed-trace-waterfall', 'viewport');
  const rulerClass = stableClassName('distributed-trace-waterfall', 'ruler');
  const rowClass = stableClassName('distributed-trace-waterfall', 'row');
  const inspectorClass = stableClassName('distributed-trace-waterfall', 'inspector');

  const spanCountLabel =
    isFiltered && !isEmpty
      ? `${filteredRows.length} / ${normalizedSpans.length} spans`
      : `${normalizedSpans.length} ${normalizedSpans.length === 1 ? 'span' : 'spans'}`;

  const errorBadgeLabel = `${errorSpanCount} ${errorSpanCount === 1 ? 'error' : 'errors'}`;

  const activeStatusVisual = activeSpan ? getStatusVisual(activeSpan.status) : null;
  const activeToneVisual = activeSpan ? getServiceToneVisual(activeSpan.tone) : null;
  const activeSharePct =
    activeSpan && totalDurationMs > 0
      ? Number(((activeSpan.durationMs / totalDurationMs) * 100).toFixed(1))
      : 0;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-col gap-3 min-w-0')}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="min-w-0 flex flex-wrap items-center gap-2.5">
            <span
              className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
              style={{
                color:
                  errorSpanCount > 0 ? 'var(--prism-error-main)' : 'var(--prism-primary-main)',
              }}
            >
              <GitBranch aria-hidden="true" className="w-4 h-4 shrink-0" />
            </span>
            <h3
              id={headingId}
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {safeTitle}
            </h3>
            <span
              data-testid="trace-waterfall-trace-id"
              className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium tabular-nums shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {safeTraceId}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span
              data-testid="trace-waterfall-duration"
              className="prism-well rounded-full px-2.5 py-0.5 inline-flex items-center gap-1 font-mono text-[11px] font-semibold tabular-nums shrink-0"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <Clock
                aria-hidden="true"
                className="w-3 h-3 shrink-0"
                style={{ color: 'var(--prism-primary-main)' }}
              />
              <span>{formatDurationMs(totalDurationMs)}</span>
            </span>

            <span
              data-testid="trace-waterfall-span-count"
              className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium tabular-nums shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {spanCountLabel}
            </span>

            <span
              data-testid="trace-waterfall-error-badge"
              data-has-errors={errorSpanCount > 0 ? 'true' : 'false'}
              className="prism-crystal rounded-full px-2.5 py-0.5 inline-flex items-center gap-1 font-mono text-[11px] font-semibold tabular-nums border shrink-0"
              style={{
                color:
                  errorSpanCount > 0 ? 'var(--prism-error-main)' : 'var(--prism-success-main)',
                borderColor:
                  errorSpanCount > 0 ? 'var(--prism-error-main)' : 'var(--prism-success-main)',
              }}
            >
              {errorSpanCount > 0 ? (
                <AlertCircle aria-hidden="true" className="w-3 h-3 shrink-0" />
              ) : (
                <CheckCircle2 aria-hidden="true" className="w-3 h-3 shrink-0" />
              )}
              <span>{errorBadgeLabel}</span>
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Trace waterfall filters"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            aria-pressed={errorsOnly}
            data-testid="trace-filter-errors"
            onClick={handleToggleErrorsOnly}
            className={cx(
              'prism-focus-ring h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 border transition-all cursor-pointer enabled:hover:brightness-105',
              errorsOnly ? 'prism-crystal' : 'prism-well border-transparent'
            )}
            style={
              errorsOnly
                ? {
                    color: 'var(--prism-error-main)',
                    borderColor: 'var(--prism-error-main)',
                  }
                : { color: 'var(--prism-text-secondary)' }
            }
          >
            <AlertCircle aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span>Errors Only</span>
          </button>

          <button
            type="button"
            aria-pressed={criticalPathOnly}
            data-testid="trace-filter-critical"
            onClick={handleToggleCriticalPathOnly}
            className={cx(
              'prism-focus-ring h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer enabled:hover:brightness-105',
              criticalPathOnly ? 'prism-btn-primary' : 'prism-well'
            )}
            style={criticalPathOnly ? undefined : { color: 'var(--prism-text-secondary)' }}
          >
            <Flame aria-hidden="true" className="w-3 h-3 shrink-0 relative z-10" />
            <span className="relative z-10">Critical Path</span>
          </button>

          {isFiltered ? (
            <button
              type="button"
              data-testid="trace-filter-reset"
              onClick={handleResetFilters}
              className="prism-crystal prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer enabled:hover:brightness-105"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Reset</span>
            </button>
          ) : null}
        </div>
      </div>

      <div
        data-testid="trace-waterfall-viewport"
        className={cx(viewportClass, 'prism-well rounded-2xl p-3 overflow-x-auto max-w-full min-w-0')}
      >
        {isEmpty ? (
          <div
            role="status"
            data-testid="trace-waterfall-empty"
            className="py-8 px-4 text-center space-y-1.5"
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--prism-text-primary)' }}>
              No trace spans recorded
            </p>
            <p className="text-xs" style={{ color: 'var(--prism-text-secondary)' }}>
              Waiting for distributed OpenTelemetry spans on trace {safeTraceId}.
            </p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div
            role="status"
            data-testid="trace-waterfall-filtered-empty"
            className="py-8 px-4 text-center space-y-2.5"
          >
            <p className="text-xs font-medium" style={{ color: 'var(--prism-text-secondary)' }}>
              No trace spans match the active filters.
            </p>
            <button
              type="button"
              data-testid="trace-waterfall-empty-reset"
              onClick={handleResetFilters}
              className="prism-btn-secondary prism-focus-ring h-7 px-3 rounded-full text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer enabled:hover:brightness-105 transition-all"
            >
              <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          <div className="min-w-[620px] flex flex-col gap-1.5">
            <div
              data-testid="trace-waterfall-ruler"
              className={cx(
                rulerClass,
                'grid grid-cols-[260px_minmax(220px,1fr)_78px] sm:grid-cols-[300px_minmax(220px,1fr)_78px] items-center gap-2 px-2 pb-2 border-b font-mono text-[10px] uppercase tracking-wider tabular-nums'
              )}
              style={{
                borderColor: 'var(--prism-divider)',
                color: 'var(--prism-text-secondary)',
              }}
            >
              <span className="truncate">Service / Operation</span>
              <div className="grid grid-cols-5 items-center">
                {RULER_TICKS.map((tick) => {
                  const tickMs = totalDurationMs * tick.ratio;
                  const alignClass =
                    tick.ratio === 0
                      ? 'text-left'
                      : tick.ratio === 1
                        ? 'text-right'
                        : 'text-center';
                  return (
                    <span
                      key={tick.id}
                      data-testid={`trace-ruler-${tick.id}`}
                      className={cx(alignClass, 'truncate')}
                    >
                      {tick.ratio === 0
                        ? tick.pctLabel
                        : `${tick.pctLabel} (${formatTickMs(tickMs)})`}
                    </span>
                  );
                })}
              </div>
              <span className="text-right">Duration</span>
            </div>

            <ul
              role="list"
              aria-label={`${safeTitle} spans`}
              className="m-0 p-0 list-none flex flex-col gap-1"
            >
              {visibleRows.map((row) => {
                const { span, depth } = row;
                const isSelected = activeSpan?.id === span.id;
                const hasVisibleChildren = parentIdsWithVisibleChildren.has(span.id);
                const isCollapsed = collapsedIds.has(span.id);
                const toneVisual = getServiceToneVisual(span.tone);
                const barColor = getBarColor(span.status, toneVisual);

                const rawOffsetPct = (span.startMs / safeHorizonMs) * 100;
                const offsetPct = Math.min(98, Math.max(0, rawOffsetPct));
                const rawWidthPct = (span.durationMs / safeHorizonMs) * 100;
                const widthPct = Math.min(100 - offsetPct, Math.max(MIN_BAR_WIDTH_PCT, rawWidthPct));

                const chevronOffsetPx = depth * 12 + 8;
                const labelIndentPx = depth * 12 + 26;

                return (
                  <li key={span.id} className="relative min-w-0">
                    {hasVisibleChildren ? (
                      <button
                        type="button"
                        aria-expanded={!isCollapsed}
                        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${span.service} ${span.operation}`}
                        data-testid={`trace-span-toggle-${span.id}`}
                        onClick={() => handleToggleCollapse(span.id)}
                        className="prism-focus-ring absolute top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-md inline-flex items-center justify-center cursor-pointer enabled:hover:brightness-110 transition-colors"
                        style={{
                          left: `${chevronOffsetPx}px`,
                          color: 'var(--prism-text-secondary)',
                        }}
                      >
                        {isCollapsed ? (
                          <ChevronRight aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        )}
                      </button>
                    ) : null}

                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      data-testid={`trace-span-row-${span.id}`}
                      data-span-id={span.id}
                      data-span-status={span.status}
                      data-span-depth={String(depth)}
                      data-critical-path={span.criticalPath ? 'true' : undefined}
                      data-selected={isSelected ? 'true' : undefined}
                      onClick={() => handleSelectSpan(span)}
                      onKeyDown={(event) => handleSpanKeyDown(event, span)}
                      className={cx(
                        rowClass,
                        'prism-focus-ring w-full grid grid-cols-[260px_minmax(220px,1fr)_78px] sm:grid-cols-[300px_minmax(220px,1fr)_78px] items-center gap-2 px-2 py-1.5 rounded-xl border text-left transition-all cursor-pointer',
                        isSelected ? 'prism-crystal' : 'border-transparent hover:brightness-105'
                      )}
                      style={
                        isSelected
                          ? {
                              borderColor: 'var(--prism-primary-main)',
                              boxShadow: '0 0 0 1px var(--prism-primary-main)',
                            }
                          : undefined
                      }
                    >
                      <div
                        className="min-w-0 flex items-center gap-1.5"
                        style={{ paddingLeft: `${labelIndentPx}px` }}
                      >
                        <span
                          data-testid={`trace-span-service-${span.id}`}
                          data-service-tone={span.tone}
                          className="prism-crystal rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold border shrink-0 max-w-[116px] truncate"
                          style={{
                            color: toneVisual.pillColor,
                            borderColor: toneVisual.pillColor,
                          }}
                        >
                          {span.service}
                        </span>
                        <span
                          data-testid={`trace-span-operation-${span.id}`}
                          className="text-xs font-medium truncate min-w-0 flex-1"
                          style={{ color: 'var(--prism-text-primary)' }}
                        >
                          {span.operation}
                        </span>
                        {span.criticalPath ? (
                          <span
                            data-testid={`trace-span-critical-${span.id}`}
                            className="prism-well rounded-full px-1.5 py-0.5 inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide border shrink-0"
                            style={{
                              color: 'var(--prism-primary-main)',
                              borderColor: 'var(--prism-primary-main)',
                            }}
                          >
                            <Flame aria-hidden="true" className="w-2.5 h-2.5 shrink-0" />
                            <span>Crit</span>
                          </span>
                        ) : null}
                      </div>

                      <div
                        data-testid={`trace-span-track-${span.id}`}
                        className="prism-well relative h-4 rounded-full overflow-hidden"
                      >
                        {GUIDE_LINE_PERCENTAGES.map((guide) => (
                          <span
                            key={guide.id}
                            aria-hidden="true"
                            className="absolute top-0 bottom-0 w-px pointer-events-none"
                            style={{
                              left: guide.pct,
                              backgroundColor: 'var(--prism-divider)',
                            }}
                          />
                        ))}
                        <div
                          data-testid={`trace-span-bar-${span.id}`}
                          data-status={span.status}
                          className="absolute top-1 bottom-1 rounded-full transition-all duration-200"
                          style={{
                            left: formatPercent(offsetPct),
                            width: formatPercent(widthPct),
                            backgroundColor: barColor,
                            boxShadow: span.criticalPath
                              ? '0 0 0 1.5px var(--prism-primary-main)'
                              : undefined,
                          }}
                        />
                      </div>

                      <span
                        data-testid={`trace-span-duration-${span.id}`}
                        className="font-mono text-[11px] font-medium tabular-nums text-right shrink-0"
                        style={{
                          color:
                            span.status === 'error'
                              ? 'var(--prism-error-main)'
                              : span.status === 'slow'
                                ? 'var(--prism-warning-main)'
                                : 'var(--prism-text-secondary)',
                        }}
                      >
                        {formatDurationMs(span.durationMs)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {activeSpan && activeStatusVisual && activeToneVisual ? (
        <section
          aria-live="polite"
          aria-label="Selected trace span inspector"
          data-testid="trace-span-inspector"
          className={cx(
            inspectorClass,
            'prism-well rounded-2xl p-3.5 space-y-3 border max-w-full min-w-0'
          )}
          style={{ borderColor: 'var(--prism-divider)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex flex-wrap items-center gap-2">
              <span
                data-testid="trace-inspector-service"
                className="prism-crystal rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold border shrink-0"
                style={{
                  color: activeToneVisual.pillColor,
                  borderColor: activeToneVisual.pillColor,
                }}
              >
                {activeSpan.service}
              </span>
              <span
                data-testid="trace-inspector-operation"
                className="text-xs font-semibold break-words min-w-0"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {activeSpan.operation}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <span
                data-testid="trace-inspector-status"
                data-status={activeSpan.status}
                className="prism-crystal rounded-full px-2 py-0.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide border"
                style={{
                  color: activeStatusVisual.color,
                  borderColor: activeStatusVisual.color,
                }}
              >
                {activeSpan.status === 'error' ? (
                  <AlertCircle aria-hidden="true" className="w-3 h-3 shrink-0" />
                ) : activeSpan.status === 'slow' ? (
                  <AlertTriangle aria-hidden="true" className="w-3 h-3 shrink-0" />
                ) : (
                  <CheckCircle2 aria-hidden="true" className="w-3 h-3 shrink-0" />
                )}
                <span>{activeStatusVisual.label}</span>
              </span>

              {activeSpan.criticalPath ? (
                <span
                  data-testid="trace-inspector-critical"
                  className="prism-crystal rounded-full px-2 py-0.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide border"
                  style={{
                    color: 'var(--prism-primary-main)',
                    borderColor: 'var(--prism-primary-main)',
                  }}
                >
                  <Flame aria-hidden="true" className="w-3 h-3 shrink-0" />
                  <span>Critical Path</span>
                </span>
              ) : null}
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs tabular-nums">
            <div
              className="prism-crystal rounded-xl px-2.5 py-1.5 border min-w-0"
              style={{ borderColor: 'var(--prism-divider)' }}
            >
              <dt
                className="text-[10px] uppercase tracking-wide"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Span ID
              </dt>
              <dd
                data-testid="trace-inspector-id"
                className="font-semibold truncate"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {activeSpan.id}
              </dd>
            </div>

            <div
              className="prism-crystal rounded-xl px-2.5 py-1.5 border min-w-0"
              style={{ borderColor: 'var(--prism-divider)' }}
            >
              <dt
                className="text-[10px] uppercase tracking-wide"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Parent Span
              </dt>
              <dd
                data-testid="trace-inspector-parent"
                className="font-semibold truncate"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {activeSpan.parentId ?? 'root'}
              </dd>
            </div>

            <div
              className="prism-crystal rounded-xl px-2.5 py-1.5 border min-w-0"
              style={{ borderColor: 'var(--prism-divider)' }}
            >
              <dt
                className="text-[10px] uppercase tracking-wide"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Start Offset
              </dt>
              <dd
                data-testid="trace-inspector-start"
                className="font-semibold"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {formatDurationMs(activeSpan.startMs)}
              </dd>
            </div>

            <div
              className="prism-crystal rounded-xl px-2.5 py-1.5 border min-w-0"
              style={{ borderColor: 'var(--prism-divider)' }}
            >
              <dt
                className="text-[10px] uppercase tracking-wide"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Duration
              </dt>
              <dd
                data-testid="trace-inspector-duration"
                className="font-semibold"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {formatDurationMs(activeSpan.durationMs)} ({activeSharePct}%)
              </dd>
            </div>
          </dl>

          <div
            className="pt-2 border-t space-y-1.5 min-w-0"
            style={{ borderColor: 'var(--prism-divider)' }}
          >
            <div
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <Tag aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Span Tags</span>
            </div>

            {activeSpan.tags.length > 0 ? (
              <div
                data-testid="trace-inspector-tags"
                className="flex flex-wrap items-center gap-1.5"
              >
                {activeSpan.tags.map((tag) => (
                  <span
                    key={tag.renderKey}
                    data-testid="trace-inspector-tag-chip"
                    className="prism-crystal rounded-full px-2.5 py-0.5 font-mono text-[11px] border break-all"
                    style={{
                      color: 'var(--prism-text-primary)',
                      borderColor: 'var(--prism-divider)',
                    }}
                  >
                    {tag.key}={tag.value}
                  </span>
                ))}
              </div>
            ) : (
              <p
                data-testid="trace-inspector-no-tags"
                className="text-xs"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                No tags attached to this span.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

DistributedTraceWaterfall.displayName = 'DistributedTraceWaterfall';
