import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AuditTrailFeed,
  type AuditPayloadRecord,
  type AuditTrailEvent,
} from './AuditTrailFeed';

const CUSTOM_EVENTS: ReadonlyArray<AuditTrailEvent> = [
  {
    id: 'evt-custom-1',
    timestamp: '2026-04-18T10:00:00Z',
    actor: 'Alice Chen',
    actorRole: 'Security Architect',
    action: 'update',
    severity: 'warning',
    resource: 'policy/kms/rotation',
    ipAddress: '198.51.100.10',
    device: 'MacBook Pro · Chrome',
    summary: 'Updated KMS automatic key rotation window.',
    before: {
      rotationDays: 90,
      enforceHsm: true,
      legacyKey: 'v1',
      nullableNote: null,
    },
    after: {
      rotationDays: 30,
      enforceHsm: true,
      auditCode: 'ISO-27001',
      nullableNote: null,
    },
  },
  {
    id: 'evt-custom-2',
    timestamp: '2026-04-18T11:00:00Z',
    actor: 'Bob Patel',
    actorRole: 'DevOps Engineer',
    action: 'create',
    severity: 'info',
    resource: 'cluster/prod/autoscaler',
    ipAddress: '203.0.113.55',
    device: 'Ubuntu · CLI',
    summary: 'Provisioned autoscaler policy.',
    after: {
      minNodes: 4,
    },
  },
];

describe('AuditTrailFeed', () => {
  it('renders default 5-event compliance feed, prism-slab surface, React 19 ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AuditTrailFeed: {
              className: 'theme-audit-slab',
              style: { letterSpacing: '0.15px' },
            },
          },
        }}
      >
        <AuditTrailFeed
          ref={ref}
          className="local-audit-feed"
          xstyle={{ '--prism-slab-blur-px': '26px' }}
          style={{ marginTop: '12px' }}
          data-testid="audit-feed"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('audit-feed');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-audit-trail-feed',
      'prism-slab',
      'theme-audit-slab',
      'local-audit-feed'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.15px', marginTop: '12px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('26px');

    expect(screen.getByRole('heading', { name: 'Audit Trail Feed' })).toBeInTheDocument();
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 5 of 5 events');

    // All 5 realistic compliance scenarios render
    expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    expect(screen.getByText('Marcus Vance')).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    expect(screen.getByText('Devon Brooks')).toBeInTheDocument();
    expect(screen.getByText('Sora Takahashi')).toBeInTheDocument();

    // Semantic severity badges use --prism-* tokens
    const infoBadge = screen.getByTestId('audit-severity-badge-evt-token-rot-01');
    expect(infoBadge).toHaveTextContent('Info');
    expect(infoBadge.style.backgroundColor).toBe('var(--prism-info-main)');

    const warnBadge = screen.getByTestId('audit-severity-badge-evt-rbac-upd-02');
    expect(warnBadge).toHaveTextContent('Warning');
    expect(warnBadge.style.backgroundColor).toBe('var(--prism-warning-main)');

    const criticalBadge = screen.getByTestId('audit-severity-badge-evt-hook-del-05');
    expect(criticalBadge).toHaveTextContent('Critical');
    expect(criticalBadge.style.backgroundColor).toBe('var(--prism-error-main)');

    // Monospace resource & IP/device metadata
    expect(screen.getByTestId('audit-resource-evt-hook-del-05')).toHaveTextContent(
      'webhooks/prod/stripe-dispute-sync'
    );
    expect(screen.getByTestId('audit-metadata-evt-token-rot-01')).toHaveTextContent(
      '198.51.100.42'
    );
    expect(screen.getByTestId('audit-metadata-evt-token-rot-01')).toHaveTextContent(
      'MacBook Pro · Chrome 135'
    );

    // Events with before/after show Inspect Diff; event without before/after omits it
    expect(screen.getByTestId('audit-diff-toggle-evt-rbac-upd-02')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByTestId('audit-diff-toggle-evt-bulk-exp-03')).toBeNull();
  });

  it('supports custom title and explicit aria-label without aria-labelledby conflict', () => {
    render(
      <AuditTrailFeed
        title="SOC2 Audit Ledger"
        aria-label="Production compliance audit ledger"
        data-testid="custom-audit-feed"
      />
    );

    const root = screen.getByTestId('custom-audit-feed');
    expect(root).toHaveAttribute('aria-label', 'Production compliance audit ledger');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByRole('heading', { name: 'SOC2 Audit Ledger' })).toBeInTheDocument();
  });

  it('filters linearly across actor, role, resource, summary, IP, device, and ID with IME-safe Escape clear', () => {
    render(<AuditTrailFeed />);

    const searchInput = screen.getByRole('searchbox', { name: 'Filter audit trail events' });

    // Match by actor (case-insensitive)
    fireEvent.change(searchInput, { target: { value: 'ELENA ROSTOVA' } });
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 1 of 5 events');
    expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
    expect(screen.queryByText('Marcus Vance')).toBeNull();

    // IME composing Escape must NOT clear search query
    fireEvent.keyDown(searchInput, { key: 'Escape', isComposing: true });
    expect(searchInput).toHaveValue('ELENA ROSTOVA');

    // Non-composing Escape clears search query
    fireEvent.keyDown(searchInput, { key: 'Escape', isComposing: false });
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 5 of 5 events');

    // Escape when already empty is a harmless no-op
    fireEvent.keyDown(searchInput, { key: 'Escape', isComposing: false });
    expect(searchInput).toHaveValue('');

    // Match by actorRole
    fireEvent.change(searchInput, { target: { value: 'Compliance Analyst' } });
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 1 of 5 events');
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();

    // Match by resource
    fireEvent.change(searchInput, { target: { value: 'stripe-dispute-sync' } });
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 1 of 5 events');
    expect(screen.getByText('Sora Takahashi')).toBeInTheDocument();

    // Match by summary
    fireEvent.change(searchInput, { target: { value: 'impossible-travel' } });
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 1 of 5 events');
    expect(screen.getByText('Devon Brooks')).toBeInTheDocument();

    // Match by IP address
    fireEvent.change(searchInput, { target: { value: '192.0.2.77' } });
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 1 of 5 events');
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();

    // Match by device
    fireEvent.change(searchInput, { target: { value: 'ThinkPad X1' } });
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 1 of 5 events');
    expect(screen.getByText('Marcus Vance')).toBeInTheDocument();

    // Match by event ID
    fireEvent.change(searchInput, { target: { value: 'evt-hook-del-05' } });
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 1 of 5 events');
    expect(screen.getByText('Sora Takahashi')).toBeInTheDocument();

    // Regex metacharacters do not throw or act as regexes (ReDoS-safe literal matching)
    fireEvent.change(searchInput, { target: { value: '([a-z]+)+$' } });
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 0 of 5 events');
    expect(screen.getByRole('status')).toHaveTextContent('No matching audit trail events');
  });

  it('filters by severity and action pills with aria-pressed states and resets with Clear Filters', () => {
    render(<AuditTrailFeed data-testid="filter-feed" />);

    const severityGroup = screen.getByRole('group', { name: 'Filter by severity' });
    const actionGroup = screen.getByRole('group', { name: 'Filter by action' });

    const severityAll = within(severityGroup).getByRole('button', { name: 'All' });
    const severityWarning = within(severityGroup).getByRole('button', { name: 'Warning' });
    const severityCritical = within(severityGroup).getByRole('button', { name: 'Critical' });
    const actionAll = within(actionGroup).getByRole('button', { name: 'All' });
    const actionUpdate = within(actionGroup).getByRole('button', { name: 'Update' });
    const actionExport = within(actionGroup).getByRole('button', { name: 'Export' });

    expect(severityAll).toHaveAttribute('aria-pressed', 'true');
    expect(actionAll).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Clear Filters' })).toBeNull();

    // Filter by Warning severity -> 3 warning events
    fireEvent.click(severityWarning);
    expect(severityWarning).toHaveAttribute('aria-pressed', 'true');
    expect(severityAll).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 3 of 5 events');
    expect(screen.getByTestId('filter-feed')).toHaveAttribute('data-filtered', 'true');

    // Combine with Update action -> 1 event (Marcus Vance)
    fireEvent.click(actionUpdate);
    expect(actionUpdate).toHaveAttribute('aria-pressed', 'true');
    expect(actionAll).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 1 of 5 events');
    expect(screen.getByText('Marcus Vance')).toBeInTheDocument();

    // Combine Critical + Export -> 0 matching events
    fireEvent.click(severityCritical);
    fireEvent.click(actionExport);
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 0 of 5 events');
    expect(screen.getByRole('status')).toHaveTextContent('No matching audit trail events');
    expect(screen.getByRole('button', { name: 'Export Safe CSV' })).toBeDisabled();

    // Click Clear Filters -> restores all 5 events and hides Clear Filters
    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 5 of 5 events');
    expect(severityAll).toHaveAttribute('aria-pressed', 'true');
    expect(actionAll).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Clear Filters' })).toBeNull();
  });

  it('expands and collapses Before/After Diff Inspector with added, removed, modified, and unchanged classifications', () => {
    render(
      <AuditTrailFeed
        events={CUSTOM_EVENTS}
        defaultExpandedIds={['evt-custom-2']}
      />
    );

    // evt-custom-2 starts expanded via defaultExpandedIds (after-only, singular "1 field")
    const secondToggle = screen.getByTestId('audit-diff-toggle-evt-custom-2');
    expect(secondToggle).toHaveAttribute('aria-expanded', 'true');
    expect(secondToggle).toHaveTextContent('Hide Diff');
    const secondPanel = screen.getByTestId('audit-diff-panel-evt-custom-2');
    expect(secondPanel).toHaveTextContent('1 field');
    const addedOnlyRow = secondPanel.querySelector('[data-diff-key="minNodes"]');
    expect(addedOnlyRow).toHaveAttribute('data-diff-status', 'added');
    expect(addedOnlyRow).toHaveTextContent('—');
    expect(addedOnlyRow).toHaveTextContent('4');

    // Collapse evt-custom-2
    fireEvent.click(secondToggle);
    expect(secondToggle).toHaveAttribute('aria-expanded', 'false');
    expect(secondToggle).toHaveTextContent('Inspect Diff');
    expect(screen.queryByTestId('audit-diff-panel-evt-custom-2')).toBeNull();

    // Expand evt-custom-1 (contains modified, unchanged, removed, added, and null values)
    const firstToggle = screen.getByTestId('audit-diff-toggle-evt-custom-1');
    fireEvent.click(firstToggle);
    expect(firstToggle).toHaveAttribute('aria-expanded', 'true');

    const firstPanel = screen.getByTestId('audit-diff-panel-evt-custom-1');
    expect(firstPanel).toHaveTextContent('5 fields');

    const modifiedRow = firstPanel.querySelector('[data-diff-key="rotationDays"]');
    expect(modifiedRow).toHaveAttribute('data-diff-status', 'modified');
    expect(modifiedRow).toHaveTextContent('Modified');
    expect(modifiedRow).toHaveTextContent('90');
    expect(modifiedRow).toHaveTextContent('30');

    const unchangedRow = firstPanel.querySelector('[data-diff-key="enforceHsm"]');
    expect(unchangedRow).toHaveAttribute('data-diff-status', 'unchanged');
    expect(unchangedRow).toHaveTextContent('Unchanged');
    expect(unchangedRow).toHaveTextContent('true');

    const removedRow = firstPanel.querySelector('[data-diff-key="legacyKey"]');
    expect(removedRow).toHaveAttribute('data-diff-status', 'removed');
    expect(removedRow).toHaveTextContent('Removed');
    expect(removedRow).toHaveTextContent('v1');
    expect(removedRow).toHaveTextContent('—');

    const addedRow = firstPanel.querySelector('[data-diff-key="auditCode"]');
    expect(addedRow).toHaveAttribute('data-diff-status', 'added');
    expect(addedRow).toHaveTextContent('Added');
    expect(addedRow).toHaveTextContent('ISO-27001');

    const nullRow = firstPanel.querySelector('[data-diff-key="nullableNote"]');
    expect(nullRow).toHaveAttribute('data-diff-status', 'unchanged');
    expect(nullRow).toHaveTextContent('null');
  });

  it('strips prototype-polluting keys (__proto__, constructor, prototype) from diff payloads and deduplicates prototype IDs', () => {
    const poisonedBefore = JSON.parse(
      '{"__proto__":"polluted","constructor":"hijack","prototype":"evil","safeKey":"beforeVal"}'
    ) as AuditPayloadRecord;
    const poisonedAfter = JSON.parse(
      '{"__proto__":"polluted2","constructor":"hijack2","prototype":"evil2","safeKey":"afterVal"}'
    ) as AuditPayloadRecord;
    const onlyPoisoned = JSON.parse(
      '{"__proto__":"bad","constructor":"bad","prototype":"bad"}'
    ) as AuditPayloadRecord;

    const adversarialEvents: ReadonlyArray<AuditTrailEvent> = [
      {
        id: '__proto__',
        timestamp: '2026-04-18T12:00:00Z',
        actor: 'Security Scanner',
        actorRole: 'Bot',
        action: 'update',
        severity: 'critical',
        resource: 'security/proto-check',
        ipAddress: '198.51.100.99',
        device: 'Scanner CLI',
        summary: 'Adversarial prototype key test event.',
        before: poisonedBefore,
        after: poisonedAfter,
      },
      {
        id: '__proto__',
        timestamp: '2026-04-18T12:01:00Z',
        actor: 'Duplicate Ignored Actor',
        actorRole: 'Bot',
        action: 'create',
        severity: 'info',
        resource: 'security/duplicate',
        ipAddress: '198.51.100.100',
        device: 'Scanner CLI',
        summary: 'Should be deduplicated.',
      },
      {
        id: 'constructor',
        timestamp: '2026-04-18T12:02:00Z',
        actor: 'Empty Safe Diff Actor',
        actorRole: 'Auditor',
        action: 'delete',
        severity: 'info',
        resource: 'security/only-poisoned',
        ipAddress: '198.51.100.101',
        device: 'Audit CLI',
        summary: 'Payload contains only forbidden prototype keys.',
        before: onlyPoisoned,
      },
    ];

    render(
      <AuditTrailFeed
        events={adversarialEvents}
        defaultExpandedIds={['__proto__', 'constructor']}
      />
    );

    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 2 of 2 events');
    expect(screen.queryByText('Duplicate Ignored Actor')).toBeNull();

    const panel = screen.getByTestId('audit-diff-panel-__proto__');
    expect(panel.querySelector('[data-diff-key="__proto__"]')).toBeNull();
    expect(panel.querySelector('[data-diff-key="constructor"]')).toBeNull();
    expect(panel.querySelector('[data-diff-key="prototype"]')).toBeNull();
    expect(panel.querySelector('[data-diff-key="safeKey"]')).toHaveAttribute(
      'data-diff-status',
      'modified'
    );
    expect(panel).not.toHaveTextContent('polluted');
    expect(panel).not.toHaveTextContent('hijack');

    // Event whose payload only had forbidden keys renders empty safe diff message
    expect(screen.getByTestId('audit-diff-empty-constructor')).toHaveTextContent(
      'No safe inspectable payload fields.'
    );
  });

  it('neutralizes CSV spreadsheet formula injection via sanitizeCsvCell and announces export politely', () => {
    const onExportCsv = vi.fn();
    const formulaEvents: ReadonlyArray<AuditTrailEvent> = [
      {
        id: 'evt-formula-1',
        timestamp: '2026-04-18T15:00:00Z',
        actor: "=CMD|' /C calc'!A0",
        actorRole: '+Admin, "Quoted"',
        action: 'export',
        severity: 'critical',
        resource: '-2+3|cmd',
        ipAddress: '198.51.100.200',
        device: '@SUM(A1:A9)',
        summary: '=HYPERLINK("https://evil.example","Click")',
      },
    ];

    render(<AuditTrailFeed events={formulaEvents} onExportCsv={onExportCsv} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export Safe CSV' }));

    expect(onExportCsv).toHaveBeenCalledTimes(1);
    const [csv, count] = onExportCsv.mock.calls[0] as [string, number];
    expect(count).toBe(1);

    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      'id,timestamp,severity,action,actor,actorRole,resource,ipAddress,device,summary'
    );
    // Every dangerous formula prefix (=, +, -, @) is neutralized with leading apostrophe
    expect(lines[1]).toContain("'=CMD|' /C calc'!A0");
    expect(lines[1]).toContain(`"'+Admin, ""Quoted"""`);
    expect(lines[1]).toContain("'-2+3|cmd");
    expect(lines[1]).toContain("'@SUM(A1:A9)");
    expect(lines[1]).toContain(`"'=HYPERLINK(""https://evil.example"",""Click"")"`);

    const liveStatus = screen.getByTestId('audit-trail-live-status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(liveStatus).toHaveTextContent('Exported 1 audit event to safe CSV.');
  });

  it('announces plural event count on multi-event CSV export', () => {
    const onExportCsv = vi.fn();
    render(<AuditTrailFeed onExportCsv={onExportCsv} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export Safe CSV' }));
    expect(onExportCsv).toHaveBeenCalledWith(expect.any(String), 5);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Exported 5 audit events to safe CSV.'
    );
  });

  it('renders XSS payloads strictly as literal text without injecting executable DOM nodes', () => {
    const payload = '<script>window.__auditXss=1</script><img src=x onerror=alert(1)>';
    const xssEvents: ReadonlyArray<AuditTrailEvent> = [
      {
        id: 'evt-xss-1',
        timestamp: '2026-04-18T16:00:00Z',
        actor: payload,
        actorRole: payload,
        action: 'update',
        severity: 'warning',
        resource: payload,
        ipAddress: payload,
        device: payload,
        summary: payload,
        before: { field: payload },
        after: { field: `${payload}-after` },
      },
    ];

    render(
      <AuditTrailFeed
        title={payload}
        events={xssEvents}
        defaultExpandedIds={['evt-xss-1']}
      />
    );

    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(screen.getByTestId('audit-resource-evt-xss-1')).toHaveTextContent(payload);
    expect(screen.getByTestId('audit-diff-panel-evt-xss-1')).toHaveTextContent(
      `${payload}-after`
    );
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('renders clean role="status" empty state and disables Export Safe CSV when events=[] (negative test)', () => {
    const onExportCsv = vi.fn();
    render(
      <AuditTrailFeed
        events={[]}
        onExportCsv={onExportCsv}
        data-testid="empty-audit-feed"
      />
    );

    const root = screen.getByTestId('empty-audit-feed');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('audit-trail-count')).toHaveTextContent('Showing 0 of 0 events');

    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No audit trail events recorded');

    const exportBtn = screen.getByRole('button', { name: 'Export Safe CSV' });
    expect(exportBtn).toBeDisabled();
    expect(exportBtn).toHaveClass('disabled:cursor-not-allowed');
    fireEvent.click(exportBtn);
    expect(onExportCsv).not.toHaveBeenCalled();
  });

  it('respects disabled state across search, filter pills, diff toggles, and CSV export', () => {
    const onExportCsv = vi.fn();
    render(
      <AuditTrailFeed
        disabled
        onExportCsv={onExportCsv}
        data-testid="disabled-audit-feed"
      />
    );

    const root = screen.getByTestId('disabled-audit-feed');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const searchInput = screen.getByRole('searchbox', { name: 'Filter audit trail events' });
    expect(searchInput).toBeDisabled();

    const exportBtn = screen.getByRole('button', { name: 'Export Safe CSV' });
    expect(exportBtn).toBeDisabled();
    expect(exportBtn).toHaveClass('disabled:cursor-not-allowed');
    fireEvent.click(exportBtn);
    expect(onExportCsv).not.toHaveBeenCalled();

    const criticalBtn = screen.getByTestId('audit-severity-filter-critical');
    expect(criticalBtn).toBeDisabled();
    expect(criticalBtn).toHaveClass('disabled:cursor-not-allowed');

    const deleteActionBtn = screen.getByTestId('audit-action-filter-delete');
    expect(deleteActionBtn).toBeDisabled();

    const diffToggle = screen.getByTestId('audit-diff-toggle-evt-rbac-upd-02');
    expect(diffToggle).toBeDisabled();
    expect(diffToggle).toHaveClass('disabled:cursor-not-allowed');
    fireEvent.click(diffToggle);
    expect(screen.queryByTestId('audit-diff-panel-evt-rbac-upd-02')).toBeNull();
  });
});
