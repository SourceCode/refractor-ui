export const docs = {
  name: 'CohortRetentionGrid',
  displayName: 'Cohort Retention Grid',
  group: 'Financial & Market Visualizations',
  category: 'financial-market-charts',
  keywords: [
    'cohort',
    'retention',
    'saas',
    'churn',
    'lifecycle',
    'triangular',
    'matrix',
    'heatmap',
    'analytics',
    'financial',
    'growth',
    'table',
  ],
  usage: {
    description:
      'Accessible optical-glass triangular SaaS cohort retention matrix wrapped in an overflow-x-auto prism-well scroll container. Features a sculpted prism-slab header with total cohort users badge, M1/M3 weighted average retention pills, a 5-step 0%..100% --prism-* intensity scale legend, interactive proportionally shaded period cells with muted unelapsed future period dashes, an optional <tfoot> Weighted Avg footer row, and a recessed aria-live="polite" cell inspector.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass null for future unelapsed retention periods to form a crisp triangular retention staircase while automatically excluding unelapsed cohorts from period weighted averages.',
      },
      {
        guidance: true,
        description:
          'Match periodPrefix ("M" for months, "W" for weeks, "Q" for quarters) to your reporting cadence and pair onSelectCell with downstream drill-down charts or user segment lists.',
      },
      {
        guidance: false,
        description:
          'Rely on unvalidated retention percentages outside 0..100 or non-finite user counts; CohortRetentionGrid sanitizes sizes, clamps retention percentages, and treats non-finite periods as unelapsed.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Cohort Table & Responsive Horizontal Scroll Container',
        criterion: '1.3.1 Info and Relationships & 1.4.10 Reflow',
        requirement:
          'Semantic <table> with <thead> column headers (scope="col"), <tbody> cohort row headers (scope="row"), optional <tfoot> Weighted Avg summary row, and direct overflow-x-auto prism-well scroll container',
        description:
          'Preserves screen-reader row/column header associations while allowing dense multi-period retention matrices to scroll horizontally on mobile and tablet viewports without page overflow.',
      },
      {
        name: 'Interactive Cohort Cells & Polite Live Inspector',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible, 4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Native cell buttons with aria-pressed, full retention & user-count aria-labels, IME-safe Enter/Space activation (!e.nativeEvent.isComposing), keyboard-only prism-focus-ring outlines, and an aria-live="polite" inspector strip',
        description:
          'Clicking or keyboard-activating any elapsed period cell highlights it and announces the exact cohort, period, retention percentage, and retained user count.',
      },
    ],
  },
  props: [
    {
      name: 'cohorts',
      type: 'ReadonlyArray<CohortRetentionRow>',
      defaultValue: '6 default monthly SaaS cohorts (Jan 2026–Jun 2026 across M0..M5)',
      description:
        'Ordered signup cohort rows with id, label, initial user size, and retentionPct array (null denotes unelapsed future periods). Pass [] to display the role="status" empty state.',
    },
    {
      name: 'periodPrefix',
      type: 'string',
      defaultValue: "'M'",
      description:
        'Prefix prepended to zero-based period indices in column headers, M1/M3 summary pills, and inspector readouts (e.g. "M", "W", "D").',
    },
    {
      name: 'tone',
      type: "'primary' | 'emerald' | 'info'",
      defaultValue: "'emerald'",
      description:
        'Semantic --prism-* optical tone ramp applied to proportional cell shading, summary accents, and the 5-step intensity scale legend.',
    },
    {
      name: 'showAverageRow',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Controls whether the Weighted Avg summary row renders inside <tfoot> across elapsed cohorts for each period.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Cohort Retention Matrix'",
      description:
        'Visible heading rendered in the prism-slab header and associated with the region and table via aria-labelledby.',
    },
    {
      name: 'onSelectCell',
      type: '(cell: CohortCellSelection) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with cohort metadata, period details, retention percentage, and computed retained user count when an elapsed cell is clicked or keyboard-activated.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<CohortRetentionGrid\n  title="Monthly SaaS Signup Retention"\n  tone="emerald"\n  onSelectCell={(cell) => console.warn(cell.cohortLabel, cell.periodLabel, cell.retainedUsers)}\n/>`,
    `<CohortRetentionGrid\n  title="Weekly Activation Cohorts"\n  periodPrefix="W"\n  tone="info"\n  showAverageRow\n  cohorts={[\n    { id: 'w1', label: 'Week 1', size: 820, retentionPct: [100, 74.5, 62.0, 55.4] },\n    { id: 'w2', label: 'Week 2', size: 940, retentionPct: [100, 78.2, 66.1, null] },\n    { id: 'w3', label: 'Week 3', size: 1050, retentionPct: [100, 80.4, null, null] },\n  ]}\n/>`,
  ],
};

export default docs;
