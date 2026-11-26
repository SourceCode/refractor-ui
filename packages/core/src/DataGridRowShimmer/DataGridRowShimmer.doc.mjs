export const docs = {
  name: 'DataGridRowShimmer',
  displayName: 'Data-Grid Row Shimmer',
  group: 'Loaders, Skeletons & Data Transitions',
  category: 'loaders-skeletons-transitions',
  keywords: ['table-skeleton', 'data-grid', 'row-shimmer', 'cascade', 'stagger', 'loading'],
  usage: {
    description:
      'Table-specific optical skeleton animating placeholder rows in a staggered top-to-bottom prismatic wave inside a mobile-safe `overflow-x-auto` container with automatic `content-visibility: auto` on `tbody > tr`, cross-fading cleanly into real table content once `loading` completes.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass the same `columns` array used by your production `DataTable` or `AdvancedDataGrid` to eliminate header shift when data resolves.',
      },
      {
        guidance: false,
        description:
          'Keep `rows` aligned with the visible viewport fold (typically `5–10`) rather than rendering hundreds of skeleton rows.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Table Sections, Scroll Wrapper & ARIA Busy',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement:
          'Wraps `<table>` with explicit `<thead>`/`<tbody>` sections inside `overflow-x-auto`, announces loading via `role="status"` and `aria-busy="true"`, and marks shimmer bars `aria-hidden="true"`.',
        description:
          'Preserves zero-overflow mobile responsiveness and clean screen-reader structure.',
      },
    ],
  },
  props: [
    { name: 'loading', type: 'boolean', defaultValue: 'true', description: 'Displays staggered skeleton rows when true, or renders children when false.' },
    { name: 'rows', type: 'number', defaultValue: '5', description: 'Number of placeholder rows (clamped 1–20).' },
    { name: 'columns', type: 'ReadonlyArray<string>', defaultValue: "['Artifact', 'Status', 'Latency', 'Updated']", description: 'Header labels matching target table columns.' },
    { name: 'staggerMs', type: 'number', defaultValue: '90', description: 'Top-to-bottom stagger cascade delay per row in ms (0–240).' },
    { name: 'animated', type: 'boolean', defaultValue: 'true', description: 'Enables angled prismatic row wave.' },
  ],
};
