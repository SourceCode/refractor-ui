'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  GitCompareArrows,
  Globe,
  Info,
  Monitor,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { isSafeObjectKey, sanitizeCsvCell } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_INFO_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type AuditTrailSeverity = 'info' | 'warning' | 'critical';

export type AuditTrailAction = 'create' | 'update' | 'delete' | 'auth' | 'export';

export type AuditPayloadValue = string | number | boolean | null;

export type AuditPayloadRecord = Readonly<Record<string, AuditPayloadValue>>;

export interface AuditTrailEvent {
  /** Unique identifier for the audit event. */
  id: string;
  /** ISO-8601 or formatted UTC timestamp displayed in tabular numerals. */
  timestamp: string;
  /** Human-readable name or service identity of the actor. */
  actor: string;
  /** Organizational role or privilege tier held by the actor. */
  actorRole: string;
  /** Verb category classifying the audited operation. */
  action: AuditTrailAction;
  /** Compliance and security risk level of the event. */
  severity: AuditTrailSeverity;
  /** Monospace target resource identifier or path. */
  resource: string;
  /** Source IP address captured by the audit gateway. */
  ipAddress: string;
  /** Client device, browser, or CLI metadata string. */
  device: string;
  /** Literal narrative summary describing what occurred. */
  summary: string;
  /** Optional payload snapshot recorded before the mutation. */
  before?: AuditPayloadRecord;
  /** Optional payload snapshot recorded after the mutation. */
  after?: AuditPayloadRecord;
}

type AuditTrailFeedBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface AuditTrailFeedProps extends AuditTrailFeedBaseProps {
  /** Heading rendered in the optical slab header (defaults to 'Audit Trail Feed'). */
  title?: string;
  /** Compliance and security events to render; defaults to a 5-event realistic feed. */
  events?: ReadonlyArray<AuditTrailEvent>;
  /** Event IDs whose Before/After Diff Inspector panels start expanded. */
  defaultExpandedIds?: ReadonlyArray<string>;
  /** Callback invoked with the RFC-4180 formula-safe CSV string and exported event count. */
  onExportCsv?: (csv: string, count: number) => void;
  /** Disables search, filter pills, diff toggles, and CSV export controls. */
  disabled?: boolean;
}

type SeverityFilter = 'all' | AuditTrailSeverity;
type ActionFilter = 'all' | AuditTrailAction;
type AuditDiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

interface AuditDiffEntry {
  key: string;
  status: AuditDiffStatus;
  beforeValue: AuditPayloadValue | undefined;
  afterValue: AuditPayloadValue | undefined;
}

interface SeverityVisualMeta {
  label: string;
  main: string;
  contrast: string;
}

interface ActionVisualMeta {
  label: string;
  color: string;
}

interface DiffStatusVisualMeta {
  label: string;
  symbol: string;
  color: string;
}

const DEFAULT_AUDIT_TRAIL_EVENTS: ReadonlyArray<AuditTrailEvent> = [
  {
    id: 'evt-token-rot-01',
    timestamp: '2026-04-18T14:22:10Z',
    actor: 'Elena Rostova',
    actorRole: 'Platform Security Lead',
    action: 'create',
    severity: 'info',
    resource: 'iam/tokens/prod-ingest-04',
    ipAddress: '198.51.100.42',
    device: 'MacBook Pro · Chrome 135',
    summary: 'Rotated production API ingestion token with 30-day TTL and read-only scope.',
    before: {
      keyVersion: 3,
      ttlDays: 90,
      scopes: 'ingest:read,ingest:write',
      active: true,
    },
    after: {
      keyVersion: 4,
      ttlDays: 30,
      scopes: 'ingest:read',
      active: true,
      rotatedByPolicy: true,
    },
  },
  {
    id: 'evt-rbac-upd-02',
    timestamp: '2026-04-18T14:15:44Z',
    actor: 'Marcus Vance',
    actorRole: 'IAM Administrator',
    action: 'update',
    severity: 'warning',
    resource: 'rbac/policies/billing-admin',
    ipAddress: '203.0.113.19',
    device: 'ThinkPad X1 · Firefox 137',
    summary: 'Updated RBAC policy for billing administrators to require hardware security keys.',
    before: {
      requireWebAuthn: false,
      maxSessionHours: 12,
      allowExport: true,
      legacyBypass: true,
    },
    after: {
      requireWebAuthn: true,
      maxSessionHours: 4,
      allowExport: true,
      auditTag: 'SOC2-CC6.1',
    },
  },
  {
    id: 'evt-bulk-exp-03',
    timestamp: '2026-04-18T13:58:02Z',
    actor: 'Priya Nair',
    actorRole: 'Compliance Analyst',
    action: 'export',
    severity: 'warning',
    resource: 'crm/customers/eu-gdpr-snapshot',
    ipAddress: '192.0.2.77',
    device: 'MacBook Air · Safari 18',
    summary: 'Exported 14,280 EU customer compliance records under GDPR Article 30 review.',
  },
  {
    id: 'evt-mfa-anom-04',
    timestamp: '2026-04-18T13:41:19Z',
    actor: 'Devon Brooks',
    actorRole: 'Staff SRE',
    action: 'auth',
    severity: 'warning',
    resource: 'auth/sso/okta-mfa-challenge',
    ipAddress: '198.51.100.190',
    device: 'Linux Workstation · CLI 2.4',
    summary: 'Detected impossible-travel MFA push challenge from unrecognized ASN; step-up verified.',
    before: {
      trustScore: 92,
      mfaVerified: false,
      blockedReason: null,
    },
    after: {
      trustScore: 68,
      mfaVerified: true,
      blockedReason: null,
    },
  },
  {
    id: 'evt-hook-del-05',
    timestamp: '2026-04-18T13:12:55Z',
    actor: 'Sora Takahashi',
    actorRole: 'Release Engineer',
    action: 'delete',
    severity: 'critical',
    resource: 'webhooks/prod/stripe-dispute-sync',
    ipAddress: '203.0.113.84',
    device: 'Mac Studio · Chrome 135',
    summary: 'Deleted production payment dispute webhook endpoint during incident mitigation.',
    before: {
      endpointUrl: 'https://hooks.internal.example/stripe',
      signingEnabled: true,
      retryLimit: 5,
    },
  },
];

const SEVERITY_OPTIONS: ReadonlyArray<{ value: SeverityFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

const ACTION_OPTIONS: ReadonlyArray<{ value: ActionFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'auth', label: 'Auth' },
  { value: 'export', label: 'Export' },
];

const SEVERITY_META: Record<AuditTrailSeverity, SeverityVisualMeta> = {
  info: {
    label: 'Info',
    main: 'var(--prism-info-main)',
    contrast: 'var(--prism-info-contrast)',
  },
  warning: {
    label: 'Warning',
    main: 'var(--prism-warning-main)',
    contrast: 'var(--prism-warning-contrast)',
  },
  critical: {
    label: 'Critical',
    main: 'var(--prism-error-main)',
    contrast: 'var(--prism-error-contrast)',
  },
};

const ACTION_META: Record<AuditTrailAction, ActionVisualMeta> = {
  create: { label: 'Create', color: 'var(--prism-success-main)' },
  update: { label: 'Update', color: 'var(--prism-warning-main)' },
  delete: { label: 'Delete', color: 'var(--prism-error-main)' },
  auth: { label: 'Auth', color: 'var(--prism-info-main)' },
  export: { label: 'Export', color: 'var(--prism-primary-main)' },
};

const DIFF_STATUS_META: Record<AuditDiffStatus, DiffStatusVisualMeta> = {
  added: { label: 'Added', symbol: '+', color: 'var(--prism-success-main)' },
  removed: { label: 'Removed', symbol: '-', color: 'var(--prism-error-main)' },
  modified: { label: 'Modified', symbol: '~', color: 'var(--prism-warning-main)' },
  unchanged: { label: 'Unchanged', symbol: '=', color: 'var(--prism-text-secondary)' },
};

const CSV_HEADERS: ReadonlyArray<string> = [
  'id',
  'timestamp',
  'severity',
  'action',
  'actor',
  'actorRole',
  'resource',
  'ipAddress',
  'device',
  'summary',
];

function deduplicateEvents(list: ReadonlyArray<AuditTrailEvent>): AuditTrailEvent[] {
  const seen = new Set<string>();
  const unique: AuditTrailEvent[] = [];
  for (const evt of list) {
    if (!seen.has(evt.id)) {
      seen.add(evt.id);
      unique.push(evt);
    }
  }
  return unique;
}

function buildSafePayloadMap(
  record: AuditPayloadRecord | undefined
): Map<string, AuditPayloadValue> {
  const map = new Map<string, AuditPayloadValue>();
  if (!record) {
    return map;
  }
  for (const [key, value] of Object.entries(record)) {
    if (!isSafeObjectKey(key)) {
      continue;
    }
    map.set(key, value);
  }
  return map;
}

function computeSafeDiff(
  before: AuditPayloadRecord | undefined,
  after: AuditPayloadRecord | undefined
): AuditDiffEntry[] {
  const beforeMap = buildSafePayloadMap(before);
  const afterMap = buildSafePayloadMap(after);

  const orderedKeys: string[] = [];
  const seenKeys = new Set<string>();

  for (const key of beforeMap.keys()) {
    seenKeys.add(key);
    orderedKeys.push(key);
  }
  for (const key of afterMap.keys()) {
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      orderedKeys.push(key);
    }
  }

  return orderedKeys.map((key) => {
    const hasBefore = beforeMap.has(key);
    const hasAfter = afterMap.has(key);
    const beforeValue = beforeMap.get(key);
    const afterValue = afterMap.get(key);

    let status: AuditDiffStatus;
    if (!hasBefore && hasAfter) {
      status = 'added';
    } else if (hasBefore && !hasAfter) {
      status = 'removed';
    } else if (!Object.is(beforeValue, afterValue)) {
      status = 'modified';
    } else {
      status = 'unchanged';
    }

    return {
      key,
      status,
      beforeValue,
      afterValue,
    };
  });
}

function formatPayloadValue(value: AuditPayloadValue | undefined): string {
  if (value === undefined) {
    return '—';
  }
  if (value === null) {
    return 'null';
  }
  return String(value);
}

function matchesSearchQuery(event: AuditTrailEvent, normalizedQuery: string): boolean {
  return (
    event.actor.toLowerCase().includes(normalizedQuery) ||
    event.actorRole.toLowerCase().includes(normalizedQuery) ||
    event.resource.toLowerCase().includes(normalizedQuery) ||
    event.summary.toLowerCase().includes(normalizedQuery) ||
    event.ipAddress.toLowerCase().includes(normalizedQuery) ||
    event.device.toLowerCase().includes(normalizedQuery) ||
    event.id.toLowerCase().includes(normalizedQuery)
  );
}

function buildAuditTrailCsv(events: ReadonlyArray<AuditTrailEvent>): string {
  const headerLine = CSV_HEADERS.map((header) => sanitizeCsvCell(header)).join(',');
  const rowLines = events.map((event) =>
    [
      event.id,
      event.timestamp,
      event.severity,
      event.action,
      event.actor,
      event.actorRole,
      event.resource,
      event.ipAddress,
      event.device,
      event.summary,
    ]
      .map((cell) => sanitizeCsvCell(cell))
      .join(',')
  );
  return [headerLine, ...rowLines].join('\r\n');
}

function renderSeverityIcon(severity: AuditTrailSeverity): ReactNode {
  switch (severity) {
    case 'info':
      return <Info aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'warning':
      return <AlertTriangle aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'critical':
      return <AlertOctagon aria-hidden="true" className="w-3 h-3 shrink-0" />;
  }
}

function AuditTrailFeedInner({
  title = 'Audit Trail Feed',
  events,
  defaultExpandedIds,
  onExportCsv,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: AuditTrailFeedProps) {
  const override = useComponentOverride('AuditTrailFeed');
  const headingId = useId();
  const baseDiffId = useId();

  const [query, setQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set<string>(defaultExpandedIds ?? [])
  );
  const [statusMessage, setStatusMessage] = useState<string>('');

  const resolvedEvents = useMemo<AuditTrailEvent[]>(
    () => deduplicateEvents(events ?? DEFAULT_AUDIT_TRAIL_EVENTS),
    [events]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const hasActiveFilters =
    query.length > 0 || severityFilter !== 'all' || actionFilter !== 'all';

  const filteredEvents = useMemo<AuditTrailEvent[]>(() => {
    return resolvedEvents.filter((event) => {
      if (severityFilter !== 'all' && event.severity !== severityFilter) {
        return false;
      }
      if (actionFilter !== 'all' && event.action !== actionFilter) {
        return false;
      }
      if (normalizedQuery.length > 0 && !matchesSearchQuery(event, normalizedQuery)) {
        return false;
      }
      return true;
    });
  }, [actionFilter, normalizedQuery, resolvedEvents, severityFilter]);

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Escape' && query.length > 0) {
        event.preventDefault();
        setQuery('');
      }
    },
    [query.length]
  );

  const handleClearFilters = useCallback(() => {
    setQuery('');
    setSeverityFilter('all');
    setActionFilter('all');
  }, []);

  const handleToggleDiff = useCallback((eventId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }, []);

  const handleExportCsv = useCallback(() => {
    const csv = buildAuditTrailCsv(filteredEvents);
    const count = filteredEvents.length;
    onExportCsv?.(csv, count);
    const noun = count === 1 ? 'event' : 'events';
    setStatusMessage(`Exported ${count} audit ${noun} to safe CSV.`);
  }, [filteredEvents, onExportCsv]);

  const isEmpty = filteredEvents.length === 0;

  const merged = mergeProps({
    themeTarget: themeProps('audit-trail-feed', {
      empty: isEmpty,
      filtered: hasActiveFilters,
      disabled,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('audit-trail-feed', 'header');
  const filtersClass = stableClassName('audit-trail-feed', 'filters');
  const listClass = stableClassName('audit-trail-feed', 'list');
  const rowClass = stableClassName('audit-trail-feed', 'row');
  const diffClass = stableClassName('audit-trail-feed', 'diff');
  const emptyClass = stableClassName('audit-trail-feed', 'empty');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-3 pb-4 border-b'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="min-w-0 flex flex-wrap items-center gap-2.5">
          <span
            className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_INFO_MAIN}
          >
            <ShieldCheck aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>

          <h2
            id={headingId}
            className="text-sm font-semibold tracking-tight break-words"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h2>

          <span
            data-testid="audit-trail-count"
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            Showing {filteredEvents.length} of {resolvedEvents.length} events
          </span>
        </div>

        <button
          type="button"
          disabled={disabled || filteredEvents.length === 0}
          onClick={handleExportCsv}
          className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
          style={STYLE_TEXT_PRIMARY}
        >
          <Download aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Export Safe CSV</span>
        </button>
      </div>

      <div className={cx(filtersClass, 'mt-4 space-y-3')}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="prism-well flex items-center gap-2 rounded-full px-3 h-9 flex-1 min-w-[200px]">
            <Search
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <input
              type="search"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleSearchKeyDown}
              disabled={disabled}
              aria-label="Filter audit trail events"
              placeholder="Filter by actor, role, resource, summary, IP, device, or ID..."
              className="prism-focus-ring bg-transparent w-full min-w-0 text-xs outline-none disabled:opacity-55 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            />
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              disabled={disabled}
              onClick={handleClearFilters}
              className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            >
              <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Clear Filters</span>
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div
            role="group"
            aria-label="Filter by severity"
            className="flex flex-wrap items-center gap-1.5 min-w-0"
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wide mr-1"
              style={STYLE_TEXT_SECONDARY}
            >
              Severity
            </span>
            {SEVERITY_OPTIONS.map((option) => {
              const isSelected = severityFilter === option.value;
              const pillStyle = isSelected
                ? option.value === 'all'
                  ? {
                      backgroundColor: 'var(--prism-info-main)',
                      color: 'var(--prism-info-contrast)',
                    }
                  : {
                      backgroundColor: SEVERITY_META[option.value].main,
                      color: SEVERITY_META[option.value].contrast,
                    }
                : { color: 'var(--prism-text-secondary)' };

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  data-testid={`audit-severity-filter-${option.value}`}
                  onClick={() => setSeverityFilter(option.value)}
                  className={cx(
                    isSelected ? 'shadow-sm' : 'prism-well',
                    'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed'
                  )}
                  style={pillStyle}
                >
                  {option.value !== 'all' && !isSelected ? (
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: SEVERITY_META[option.value].main }}
                    />
                  ) : null}
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Filter by action"
            className="flex flex-wrap items-center gap-1.5 min-w-0"
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wide mr-1"
              style={STYLE_TEXT_SECONDARY}
            >
              Action
            </span>
            {ACTION_OPTIONS.map((option) => {
              const isSelected = actionFilter === option.value;
              const pillStyle = isSelected
                ? {
                    backgroundColor: 'var(--prism-info-main)',
                    color: 'var(--prism-info-contrast)',
                  }
                : { color: 'var(--prism-text-secondary)' };

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  data-testid={`audit-action-filter-${option.value}`}
                  onClick={() => setActionFilter(option.value)}
                  className={cx(
                    isSelected ? 'shadow-sm' : 'prism-well',
                    'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed'
                  )}
                  style={pillStyle}
                >
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="audit-trail-empty"
          className={cx(emptyClass, 'prism-well rounded-2xl mt-4 px-4 py-8 text-center')}
        >
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            {resolvedEvents.length === 0
              ? 'No audit trail events recorded'
              : 'No matching audit trail events'}
          </p>
          <p className="mt-1 text-xs" style={STYLE_TEXT_SECONDARY}>
            {resolvedEvents.length === 0
              ? 'Security, identity, and compliance audit entries will appear here.'
              : 'Try adjusting your search query or severity and action filters.'}
          </p>
        </div>
      ) : (
        <ol className={cx(listClass, 'mt-4 space-y-3')} aria-label="Audit trail events">
          {filteredEvents.map((event) => {
            const severityMeta = SEVERITY_META[event.severity];
            const actionMeta = ACTION_META[event.action];
            const hasDiff = event.before !== undefined || event.after !== undefined;
            const isExpanded = hasDiff && expandedIds.has(event.id);
            const diffPanelId = `${baseDiffId}-${event.id}`;
            const diffEntries = isExpanded ? computeSafeDiff(event.before, event.after) : [];

            return (
              <li
                key={event.id}
                data-event-id={event.id}
                data-severity={event.severity}
                data-action={event.action}
                className={cx(rowClass, 'prism-crystal prism-cv-item rounded-2xl p-3.5 sm:p-4 border-l-4')}
                style={{ borderLeftColor: severityMeta.main }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div className="min-w-0 flex flex-wrap items-center gap-2">
                    <span
                      data-testid={`audit-severity-badge-${event.id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0"
                      style={{
                        backgroundColor: severityMeta.main,
                        color: severityMeta.contrast,
                      }}
                    >
                      {renderSeverityIcon(event.severity)}
                      <span>{severityMeta.label}</span>
                    </span>

                    <span
                      data-testid={`audit-action-badge-${event.id}`}
                      className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold uppercase tracking-wide shrink-0"
                      style={{ color: actionMeta.color }}
                    >
                      {actionMeta.label}
                    </span>

                    <span className="min-w-0 flex flex-wrap items-baseline gap-1.5">
                      <span
                        className="text-sm font-semibold break-words"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {event.actor}
                      </span>
                      <span
                        className="text-xs break-words"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {event.actorRole}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span
                      className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      <Clock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      <time dateTime={event.timestamp}>{event.timestamp}</time>
                    </span>

                    <span
                      className="prism-well px-2 py-0.5 rounded-md font-mono text-[10px]"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {event.id}
                    </span>
                  </div>
                </div>

                <p
                  className="mt-2 text-xs sm:text-sm leading-relaxed break-words"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {event.summary}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="min-w-0 flex flex-wrap items-center gap-2">
                    <code
                      data-testid={`audit-resource-${event.id}`}
                      className="prism-well px-2 py-0.5 rounded-md font-mono text-[11px] break-all"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {event.resource}
                    </code>

                    <span
                      data-testid={`audit-metadata-${event.id}`}
                      className="prism-well px-2.5 py-0.5 rounded-full inline-flex flex-wrap items-center gap-1.5 text-[11px] min-w-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      <Globe aria-hidden="true" className="w-3 h-3 shrink-0" />
                      <code
                        className="font-mono tabular-nums"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {event.ipAddress}
                      </code>
                      <span aria-hidden="true">·</span>
                      <Monitor aria-hidden="true" className="w-3 h-3 shrink-0" />
                      <span className="break-words">{event.device}</span>
                    </span>
                  </div>

                  {hasDiff ? (
                    <button
                      type="button"
                      disabled={disabled}
                      aria-expanded={isExpanded}
                      aria-controls={diffPanelId}
                      data-testid={`audit-diff-toggle-${event.id}`}
                      onClick={() => handleToggleDiff(event.id)}
                      className="prism-well prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {isExpanded ? (
                        <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronRight aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{isExpanded ? 'Hide Diff' : 'Inspect Diff'}</span>
                    </button>
                  ) : null}
                </div>

                {isExpanded ? (
                  <div
                    id={diffPanelId}
                    data-testid={`audit-diff-panel-${event.id}`}
                    className={cx(diffClass, 'prism-well rounded-xl mt-3 p-3 overflow-x-auto')}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        <GitCompareArrows aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        <span>Before / After Diff</span>
                      </span>
                      <span
                        className="font-mono text-[11px] tabular-nums"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {diffEntries.length} {diffEntries.length === 1 ? 'field' : 'fields'}
                      </span>
                    </div>

                    {diffEntries.length === 0 ? (
                      <p
                        data-testid={`audit-diff-empty-${event.id}`}
                        className="text-xs py-2"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        No safe inspectable payload fields.
                      </p>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr
                            className="border-b"
                            style={STYLE_BORDER_DIVIDER}
                          >
                            <th
                              scope="col"
                              className="py-1.5 pr-3 font-semibold"
                              style={STYLE_TEXT_SECONDARY}
                            >
                              Field
                            </th>
                            <th
                              scope="col"
                              className="py-1.5 px-3 font-semibold"
                              style={STYLE_TEXT_SECONDARY}
                            >
                              Change
                            </th>
                            <th
                              scope="col"
                              className="py-1.5 px-3 font-semibold"
                              style={STYLE_TEXT_SECONDARY}
                            >
                              Before
                            </th>
                            <th
                              scope="col"
                              className="py-1.5 pl-3 font-semibold"
                              style={STYLE_TEXT_SECONDARY}
                            >
                              After
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {diffEntries.map((entry) => {
                            const statusMeta = DIFF_STATUS_META[entry.status];
                            return (
                              <tr
                                key={entry.key}
                                data-diff-key={entry.key}
                                data-diff-status={entry.status}
                                className="border-b last:border-b-0"
                                style={STYLE_BORDER_DIVIDER}
                              >
                                <td
                                  className="py-1.5 pr-3 font-mono font-medium whitespace-nowrap"
                                  style={STYLE_TEXT_PRIMARY}
                                >
                                  {entry.key}
                                </td>
                                <td className="py-1.5 px-3 whitespace-nowrap">
                                  <span
                                    className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold"
                                    style={{ color: statusMeta.color }}
                                  >
                                    <span aria-hidden="true">{statusMeta.symbol}</span>
                                    <span>{statusMeta.label}</span>
                                  </span>
                                </td>
                                <td
                                  className="py-1.5 px-3 font-mono break-all"
                                  style={STYLE_TEXT_SECONDARY}
                                >
                                  {formatPayloadValue(entry.beforeValue)}
                                </td>
                                <td
                                  className="py-1.5 pl-3 font-mono break-all"
                                  style={{
                                    color:
                                      entry.status === 'unchanged'
                                        ? 'var(--prism-text-secondary)'
                                        : statusMeta.color,
                                  }}
                                >
                                  {formatPayloadValue(entry.afterValue)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <div
        role={isEmpty ? undefined : 'status'}
        aria-live="polite"
        aria-atomic="true"
        data-testid="audit-trail-live-status"
        className="sr-only"
      >
        {statusMessage}
      </div>
    </div>
  );
}

export const AuditTrailFeed = memo(AuditTrailFeedInner);
AuditTrailFeed.displayName = 'AuditTrailFeed';
