export const docs = {
  name: 'CsvColumnMapper',
  displayName: 'CSV Column Mapper',
  group: 'Enterprise Workflows, Data Ops & API Tooling',
  category: 'enterprise-ops-api',
  keywords: [
    'csv',
    'column-mapper',
    'import',
    'etl',
    'data-ops',
    'schema',
    'mapping',
    'validation',
    'rfc-4180',
    'upload',
    'onboarding',
    'bulk-import',
    'sanitize',
    'enterprise',
    'optical-glass',
  ],
  usage: {
    description:
      'Guided CSV upload and paste parser with interactive schema column mapping inside a sculpted `prism-slab` optical-glass card. Features a deterministic zero-regex-backtracking RFC-4180 character-by-character parser (supporting quoted fields, escaped quotes, embedded commas/newlines, and CRLF/LF), prototype-safe `Map` header lookups that cleanly reject `__proto__`/`constructor`/`prototype`, OWASP CSV formula neutralization via `sanitizeCsvCell`, normalized `Auto-Map Headers`, duplicate and missing-required-field validation banners, a responsive `overflow-x-auto` preview table with row-level `Valid`/`Error` pills, and an `aria-live="polite"` import summary footer.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Define explicit `targetFields` with `required` flags and semantic `type` (`string`, `email`, `number`) so missing mappings and row-level format errors are caught before `onImport` executes.',
      },
      {
        guidance: true,
        description:
          'Use `csvText` and `onCsvTextChange` for controlled multi-step import wizards, or omit `csvText` to let `CsvColumnMapper` manage upload, paste, `Load Sample`, and `Clear` states internally.',
      },
      {
        guidance: false,
        description:
          'Parse user-supplied CSV strings with `eval()`, brittle `.split(",")` calls, or plain-object dynamic indexing; `CsvColumnMapper` runs an RFC-4180 character state machine over ES `Map` storage and applies `sanitizeCsvCell` to imported values.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Region, Labeled Mapping Selectors & Accessible Preview Table',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'role="region" linked via aria-labelledby, labeled CSV source textarea ("CSV source data"), per-column <select aria-label="Map column <header>"> controls, semantic <table> with <thead>/<tbody> and scope="col"/"row" headers inside overflow-x-auto, and role="alert" schema validation banners',
        description:
          'Exposes source editing, schema column assignments, validation alerts, and row-level diagnostics cleanly to assistive technologies.',
      },
      {
        name: 'Polite Import Announcements, IME Safety & Keyboard-Only Focus Rings',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'aria-live="polite" status region announcing upload, auto-map, and import outcomes; IME-guarded Ctrl/Cmd+Enter shortcut (!e.nativeEvent.isComposing); and keyboard-only .prism-focus-ring outlines',
        description:
          'Keeps screen reader users informed of import results and schema updates without stealing focus or hijacking IME composition commits.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'CSV Column Mapper'",
      description: 'Visible card heading in the sculpted `prism-slab` header.',
    },
    {
      name: 'targetFields',
      type: 'ReadonlyArray<CsvTargetField>',
      defaultValue: 'email (required/email), fullName (required/string), planTier (string), monthlyMrr (number)',
      description:
        'Target schema definitions users map parsed CSV source headers into. Unsafe prototype keys are automatically rejected.',
    },
    {
      name: 'defaultCsvText',
      type: 'string',
      defaultValue: '4-row sample CSV (3 valid rows, 1 row with invalid email & non-numeric MRR)',
      description: 'Initial CSV text used in uncontrolled mode.',
    },
    {
      name: 'csvText',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled CSV source text; pair with `onCsvTextChange` to manage external state.',
    },
    {
      name: 'onCsvTextChange',
      type: '(csv: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired whenever CSV text updates via textarea edits, file upload, `Load Sample`, or `Clear`.',
    },
    {
      name: 'onImport',
      type: '(payload: CsvImportPayload) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when clicking `Import Valid Rows` with formula-sanitized `validRows`, row `errors`, and active `mappings`.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables CSV editing, file uploads, `Load Sample`, `Clear`, column `<select>` controls, `Auto-Map Headers`, and `Import Valid Rows`.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<CsvColumnMapper\n  title="Customer Account Import"\n  onImport={(payload) => console.warn(payload.validRows.length, payload.errors.length)}\n/>`,
    `<CsvColumnMapper\n  title="Invoice Ledger Mapping"\n  targetFields={[\n    { key: 'invoiceId', label: 'Invoice ID', required: true, type: 'string' },\n    { key: 'billingEmail', label: 'Billing Email', required: true, type: 'email' },\n    { key: 'amountUsd', label: 'Amount (USD)', required: true, type: 'number' },\n  ]}\n  defaultCsvText={"invoice_id,billing_email,amount_usd\\nINV-101,billing@acme.io,2450.50\\nINV-102,bad-email,abc"}\n/>`,
  ],
};

export default docs;
