export const docs = {
  name: 'AuditTrailFeed',
  displayName: 'Audit Trail Feed',
  group: 'Enterprise Workflows, Data Ops & API Tooling',
  category: 'enterprise-ops-api',
  keywords: [
    'audit',
    'trail',
    'compliance',
    'security',
    'feed',
    'diff',
    'csv',
    'export',
    'rbac',
    'soc2',
    'gdpr',
    'filter',
    'enterprise',
  ],
  usage: {
    description:
      'Filterable enterprise compliance and security audit trail feed housed in a sculpted prism-slab optical-glass surface. Includes linear-time substring search across actor, role, resource, summary, IP, device, and ID; severity and action filter pills with live event counts; a prototype-safe Before/After payload diff inspector classifying added, removed, modified, and unchanged keys; and RFC-4180 formula-safe CSV export powered by sanitizeCsvCell.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide stable, immutable UTC timestamps and unique event IDs so compliance auditors can correlate exported CSV records back to upstream log storage.',
      },
      {
        guidance: true,
        description:
          'Populate before and after payload snapshots with typed scalar values (string, number, boolean, or null) so the built-in diff inspector highlights exact policy and configuration mutations.',
      },
      {
        guidance: false,
        description:
          'Include raw secrets, bearer tokens, or private keys inside summary, before, or after fields; redact sensitive credentials before ingesting audit trail records.',
      },
    ],
    accessibility: [
      {
        name: 'Grouped Filter Toggles & IME-Safe Search',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'role="group" around severity/action pills with aria-pressed states, labeled search input with IME-guarded Escape handling, and keyboard-only prism-focus-ring',
        description:
          'Exposes pressed state on every filter pill, groups severity and action filters semantically, and avoids hijacking IME composition on keyboard input.',
      },
      {
        name: 'Disclosure Diff Inspector & Polite Live Announcements',
        criterion: '4.1.3 Status Messages & 2.1.1 Keyboard',
        requirement:
          'aria-expanded and aria-controls on Inspect Diff / Hide Diff toggles, role="status" empty state, and aria-live="polite" CSV export announcements',
        description:
          'Communicates diff panel expansion state, empty filter results, and safe CSV export completion cleanly to screen readers without shifting focus.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Audit Trail Feed'",
      description: 'Heading rendered in the optical slab header alongside the live event count pill.',
    },
    {
      name: 'events',
      type: 'ReadonlyArray<AuditTrailEvent>',
      defaultValue: '5 realistic compliance events',
      description:
        'Audit trail records to display and filter; defaults to a realistic 5-event security and compliance feed when omitted.',
    },
    {
      name: 'defaultExpandedIds',
      type: 'ReadonlyArray<string>',
      defaultValue: 'undefined',
      description: 'Optional list of event IDs whose Before/After diff inspector panels start expanded.',
    },
    {
      name: 'onExportCsv',
      type: '(csv: string, count: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when Export Safe CSV is activated, receiving the RFC-4180 formula-neutralized CSV string and filtered row count.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables search, severity/action filter pills, diff toggles, and CSV export controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<AuditTrailFeed\n  title="Production Compliance Audit Trail"\n  defaultExpandedIds={['evt-rbac-upd-02']}\n  onExportCsv={(csv, count) => downloadAuditReport(csv, count)}\n/>`,
  ],
};
