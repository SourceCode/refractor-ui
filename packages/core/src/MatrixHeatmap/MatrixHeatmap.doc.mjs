export const docs = {
  name: 'MatrixHeatmap',
  displayName: 'Matrix Heatmap',
  group: 'Statistical & Distribution Visuals',
  category: 'statistical-charts',
  keywords: [
    'heatmap',
    'matrix',
    'correlation',
    'intensity',
    'grid',
    'table',
    'density',
    'statistics',
    'analytics',
  ],
  usage: {
    description:
      'Accessible optical-glass intensity heatmap table backed by a prototype-safe Map<string, number> coordinate store, normalized --prism-* tone opacity ramp (0.10..0.90), 5-step Low-to-High header legend, and a recessed prism-well selection readout strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Supply concise rowLabels and colLabels alongside finite HeatmapCell coordinates so every matrix cell fits comfortably without cramped wrapping.',
      },
      {
        guidance: true,
        description:
          'Choose a semantic MatrixHeatmapTone (primary, secondary, emerald, rose) and toggle showValues={false} on dense matrices where the recessed readout strip provides exact inspection.',
      },
      {
        guidance: false,
        description:
          'Rely on unvalidated out-of-bounds indices or NaN/Infinity values; out-of-bounds and non-finite cells are safely filtered before computing the intensity ramp.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Table Sections & Axis Headers',
        criterion: '1.3.1 Info and Relationships',
        requirement:
          'Semantic <table> with <thead> column headers (scope="col"), <tbody> row headers (scope="row"), and aria-labelledby heading binding',
        description:
          'Hydration-safe table markup associates every matrix cell button with both its row and column labels.',
      },
      {
        name: 'Interactive Matrix Cells & Live Readout',
        criterion: '2.1.1 Keyboard, 4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Native cell buttons with aria-pressed, descriptive "${rowLabel} × ${colLabel}: ${value}" aria-label, IME-safe Enter/Space activation, keyboard-only prism-focus-ring, and polite aria-live readout',
        description:
          'Clicking, focusing, or activating any populated cell highlights it and announces the exact coordinate value in the recessed prism-well readout.',
      },
    ],
  },
  props: [
    {
      name: 'rowLabels',
      type: 'string[]',
      defaultValue: 'required',
      description: 'Ordered labels for each matrix row rendered as scope="row" headers.',
    },
    {
      name: 'colLabels',
      type: 'string[]',
      defaultValue: 'required',
      description: 'Ordered labels for each matrix column rendered inside <thead>.',
    },
    {
      name: 'cells',
      type: 'HeatmapCell[]',
      defaultValue: 'required',
      description:
        'Array of { row, col, value } coordinates stored in a prototype-safe Map<string, number>.',
    },
    {
      name: 'tone',
      type: "'primary' | 'secondary' | 'emerald' | 'rose'",
      defaultValue: "'primary'",
      description: 'Semantic --prism-* optical tone used for the 0.10..0.90 opacity intensity ramp.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Matrix Heatmap'",
      description: 'Heading displayed alongside the 5-step Low-to-High legend in the slab header.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix appended to cell labels, legend range, and active readout.',
    },
    {
      name: 'showValues',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Controls whether formatted numeric values render directly inside each matrix cell.',
    },
    {
      name: 'onSelectCell',
      type: '(cell: HeatmapCell, rowLabel: string, colLabel: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired whenever a populated cell is clicked, focused, or activated via keyboard.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and optical style overrides.',
    },
  ],
  examples: [
    `<MatrixHeatmap\n  title="Service Error Rate by Day & Hour"\n  tone="rose"\n  valueUnit="%"\n  rowLabels={['Mon', 'Tue', 'Wed']}\n  colLabels={['00:00', '06:00', '12:00', '18:00']}\n  cells={[\n    { row: 0, col: 0, value: 0.4 }, { row: 0, col: 1, value: 0.8 }, { row: 0, col: 2, value: 2.1 }, { row: 0, col: 3, value: 1.5 },\n    { row: 1, col: 0, value: 0.2 }, { row: 1, col: 1, value: 1.2 }, { row: 1, col: 2, value: 3.4 }, { row: 1, col: 3, value: 2.8 },\n    { row: 2, col: 0, value: 0.5 }, { row: 2, col: 1, value: 0.9 }, { row: 2, col: 2, value: 1.9 }, { row: 2, col: 3, value: 4.2 },\n  ]}\n/>`,
  ],
};
