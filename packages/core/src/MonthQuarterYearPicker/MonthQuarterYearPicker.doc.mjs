export const docs = {
  name: 'MonthQuarterYearPicker',
  displayName: 'Month, Quarter & Year Picker',
  group: 'Date, Time & Scheduling Fields',
  category: 'date-time-scheduling',
  keywords: [
    'month',
    'quarter',
    'year',
    'period',
    'fiscal',
    'reporting',
    'date',
    'calendar',
    'picker',
    'schedule',
  ],
  usage: {
    description:
      'Optical-glass reporting period selector supporting Month (3×4 Jan–Dec grid), Quarter (2×2 Q1–Q4 grid with month ranges), and Year (12-year decade grid) granularities with a canonical readout pill, year/decade navigation clamped to minYear..maxYear, and controlled/uncontrolled state.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Restrict allowedGranularities to the reporting periods your backend supports (for example, ["quarter", "year"] for financial dashboards) — the segmented toggle automatically hides when only one granularity is permitted.',
      },
      {
        guidance: true,
        description:
          'Use formatPeriodValue(period) alongside controlled value/onChange props to keep chart headers, export filenames, and URL query summaries in sync with the picker readout.',
      },
      {
        guidance: false,
        description:
          'Allow unconstrained historical or future years in fiscal filters; pass tight minYear and maxYear bounds so out-of-range years are clearly disabled in decade navigation.',
      },
    ],
    accessibility: [
      {
        name: 'Grouped Toggle Controls & Pressed Semantics',
        criterion: '4.1.2 Name, Role, Value & 1.3.1 Info and Relationships',
        requirement: 'Named region container, granularity role="group", and explicit aria-pressed + aria-label states on every month, quarter, and year button',
        description:
          'Announces the full reporting period context (such as "Nov 2026" or "Q4 2026 (Oct–Dec)") and exposes active selection state reliably to assistive technologies.',
      },
      {
        name: 'Keyboard-Only Optical Focus & Bound Clamping',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement: 'Native button focus order with :focus-visible rings and disabled state on out-of-bounds navigation or years',
        description:
          'Enables full keyboard navigation across granularity switches, year/decade steppers, and period grids without leaking focus outlines on pointer clicks.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'PeriodValue',
      defaultValue: 'undefined',
      description: 'Controlled reporting period ({ granularity, year, month?, quarter? }).',
    },
    {
      name: 'defaultValue',
      type: 'PeriodValue',
      defaultValue: "{ granularity: 'quarter', year: 2026, quarter: 4 }",
      description: 'Initial reporting period when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(next: PeriodValue) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the selected granularity or period changes.',
    },
    {
      name: 'allowedGranularities',
      type: 'PeriodGranularity[]',
      defaultValue: "['month', 'quarter', 'year']",
      description: 'Ordered list of allowed granularities; segmented toggle hides when <= 1 item.',
    },
    {
      name: 'minYear',
      type: 'number',
      defaultValue: '2000',
      description: 'Minimum selectable calendar year inclusive.',
    },
    {
      name: 'maxYear',
      type: 'number',
      defaultValue: '2050',
      description: 'Maximum selectable calendar year inclusive.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Reporting Period'",
      description: 'Heading text displayed in the prism-slab picker header.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables granularity switching, year/decade navigation, and period selection.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<MonthQuarterYearPicker\n  label="Fiscal Reporting Period"\n  defaultValue={{ granularity: 'quarter', year: 2026, quarter: 4 }}\n  minYear={2020}\n  maxYear={2035}\n  onChange={(period) => console.warn(formatPeriodValue(period))}\n/>`,
  ],
};
