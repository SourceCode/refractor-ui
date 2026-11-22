export const docs = {
  name: 'FormulaSpreadsheetGrid',
  displayName: 'Formula Spreadsheet Grid',
  group: 'Document, Knowledge & Spreadsheet Tools',
  category: 'document-knowledge-spreadsheet',
  keywords: [
    'spreadsheet',
    'formula',
    'grid',
    'excel',
    'table',
    'workbook',
    'sheets',
    'sum',
    'average',
    'min',
    'max',
    'count',
    'calculator',
    'budget',
    'financial',
  ],
  usage: {
    description:
      'Optical-glass multi-sheet formula spreadsheet grid featuring a sculpted `prism-slab` header with active range badge and quick `Insert =SUM` action, a synchronized `fx` formula bar, a responsive `overflow-x-auto` semantic `<table>` with `<thead>`/`<tbody>`, click + `Shift+Click` range selection, arrow-key navigation, double-click/type-to-edit inline cells, bottom `role="tablist"` sheet tabs with `+ Add Sheet`, live `Sum / Avg / Count` range statistics, and a zero-`eval` recursive-descent formula evaluator (`evaluateSpreadsheetCell`) with cycle (`#CYCLE!`), divide-by-zero (`#DIV/0!`), and syntax (`#ERR!`) protection.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use uppercase `A1`-style cell coordinates and standard range notation (`=SUM(D2:D4)`, `=(B2-C2)/B2`) in `SpreadsheetSheetSpec.cells`; the evaluator handles case-insensitive references and prototype-safe `Map` storage automatically.',
      },
      {
        guidance: true,
        description:
          'Provide `onCellChange` to persist edits or synchronize downstream optical charts whenever a user commits a cell value or formula.',
      },
      {
        guidance: false,
        description:
          'Evaluate user-entered formulas with `eval()` or `new Function()`, or index cell stores on plain objects; `FormulaSpreadsheetGrid` executes a closed recursive-descent grammar strictly over ES `Map` storage.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Grid Table, Formula Bar & Sheet Tablist',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'role="region" linked via aria-labelledby, semantic <table> with <thead>/<tbody> and scope="col"/"row" headers inside overflow-x-auto, labeled Formula bar input, role="tablist" sheet tabs with aria-selected, and role="status" live range stats',
        description:
          'Exposes the workbook grid, formula bar, sheet selector tabs, and live range aggregate readout with semantic ARIA roles and labels.',
      },
      {
        name: 'Directional Keyboard Navigation, Roving Tabindex & IME Safety',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'ArrowUp/ArrowDown/ArrowLeft/ArrowRight cell traversal (with Shift range extension), Enter/F2/type-to-edit inline activation, IME-safe keydown (!e.nativeEvent.isComposing), and keyboard-only .prism-focus-ring outlines',
        description:
          'Allows full keyboard-only navigation and editing across cells, formula bar, and sheet tabs while respecting active IME composition.',
      },
    ],
  },
  props: [
    {
      name: 'sheets',
      type: 'ReadonlyArray<SpreadsheetSheetSpec>',
      defaultValue: '2 default live sheets (Q4 Budget & Unit Economics)',
      description:
        'Workbook sheets with `id`, `name`, `columns`, `rows`, and initial `cells` entries. Pass `[]` to display the empty workbook state.',
    },
    {
      name: 'onCellChange',
      type: '(sheetId: string, address: string, raw: string, computed: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the sheet ID, cell address, committed raw string, and computed display string whenever a cell changes.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Optical Formula Spreadsheet'",
      description: 'Visible workbook heading in the sculpted `prism-slab` header.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables formula bar editing, inline cell edits, `Insert =SUM`, and `+ Add Sheet` while keeping selection and inspection active.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<FormulaSpreadsheetGrid />`,
    `<FormulaSpreadsheetGrid\n  title="Q4 Optical Forecast"\n  sheets={[\n    {\n      id: 'forecast',\n      name: 'Forecast',\n      columns: 4,\n      rows: 4,\n      cells: [\n        { address: 'A1', raw: 'Item' },\n        { address: 'B1', raw: 'Qty' },\n        { address: 'C1', raw: 'Price' },\n        { address: 'D1', raw: 'Total' },\n        { address: 'A2', raw: 'Nodes' },\n        { address: 'B2', raw: '10' },\n        { address: 'C2', raw: '250' },\n        { address: 'D2', raw: '=B2*C2' },\n        { address: 'D3', raw: '=SUM(D2:D2)' },\n      ],\n    },\n  ]}\n  onCellChange={(sheetId, address, raw, computed) => console.warn(sheetId, address, raw, computed)}\n/>`,
  ],
};

export default docs;
