export const docs = {
  name: 'PivotTable',
  displayName: 'Pivot Table',
  group: 'Advanced Data & Visualization',
  category: 'advanced-data',
  keywords: [
    'pivot',
    'crosstab',
    'aggregation',
    'analytics',
    'matrix',
    'sum',
    'avg',
    'count',
    'min',
    'max',
    'bi',
  ],
  usage: {
    description:
      'Interactive optical glass cross-tabulation pivot table with draggable prism-crystal field pills, prism-well Rows/Columns/Values drop zones, keyboard-accessible select and aggregation controls, prototype-safe ES Map aggregation engine, row/column totals, and grand total footer.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Mark quantitative measure fields with numeric: true so PivotTable defaults them into the Values zone automatically.',
      },
      {
        guidance: true,
        description:
          'Use onConfigChange to persist user pivot layouts or synchronize companion optical charts.',
      },
      {
        guidance: false,
        description:
          'Index cross-tabulation buckets using plain objects keyed by untrusted dataset values.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard drag-and-drop parity & table totals structure',
        criterion: '2.1.1 Keyboard & 1.3.1 Info and Relationships',
        requirement: 'thead/tbody/tfoot sections, labeled select controls, aria-pressed aggregation group',
        description:
          'Provides accessible <select> controls mirroring every drag-and-drop field zone, exposes aria-pressed on aggregation mode toggles, and structures totals in a semantic <tfoot> with tabular numerals.',
      },
    ],
  },
  props: [
    {
      name: 'data',
      type: 'ReadonlyArray<PivotRecord>',
      defaultValue: 'required',
      description: 'Typed array of flat scalar records aggregated into the cross-tabulation matrix.',
    },
    {
      name: 'fields',
      type: 'ReadonlyArray<PivotField>',
      defaultValue: 'required',
      description: 'Field descriptors ({ key, label, numeric? }) selectable across Rows, Columns, and Values.',
    },
    {
      name: 'defaultRowField',
      type: 'string',
      defaultValue: 'first non-numeric field',
      description: 'Initial field key assigned to the Rows zone.',
    },
    {
      name: 'defaultColumnField',
      type: 'string',
      defaultValue: 'second non-numeric field',
      description: 'Initial field key assigned to the Columns zone.',
    },
    {
      name: 'defaultValueField',
      type: 'string',
      defaultValue: 'first numeric field',
      description: 'Initial field key assigned to the Values zone.',
    },
    {
      name: 'defaultAggregation',
      type: "'sum' | 'avg' | 'count' | 'min' | 'max'",
      defaultValue: "'sum'",
      description: 'Initial aggregation mode applied across cells and totals.',
    },
    {
      name: 'onConfigChange',
      type: '(config: PivotConfig) => void',
      defaultValue: 'undefined',
      description: 'Invoked whenever Rows, Columns, Values, or Aggregation configuration changes.',
    },
    {
      name: 'emptyMessage',
      type: 'string',
      defaultValue: "'No data available for pivot analysis.'",
      description: 'Message shown inside tbody when data or fields are empty.',
    },
  ],
  examples: [
    `<PivotTable\n  fields={[\n    { key: 'region', label: 'Region' },\n    { key: 'quarter', label: 'Quarter' },\n    { key: 'revenue', label: 'Revenue', numeric: true },\n  ]}\n  data={records}\n  defaultAggregation="sum"\n  onConfigChange={handlePivotChange}\n/>`,
  ],
};
