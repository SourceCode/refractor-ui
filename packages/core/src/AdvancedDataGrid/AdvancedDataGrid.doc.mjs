export const docs = {
  name: 'AdvancedDataGrid',
  displayName: 'Advanced Data Grid',
  group: 'Advanced Data & Visualization',
  category: 'advanced-data',
  keywords: [
    'grid',
    'table',
    'datagrid',
    'edit',
    'resize',
    'reorder',
    'pin',
    'group',
    'csv',
    'export',
    'enterprise',
  ],
  usage: {
    description:
      'Enterprise optical glass data grid featuring inline IME-safe cell editing, pointer and keyboard column resizing, drag-and-drop plus button column reordering, sticky left/right pinned columns, prototype-safe ES Map row grouping, column sorting, and formula-safe RFC 4180 CSV export.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide stable row IDs and column keys so inline edits, column order, and collapsed group states persist across re-renders.',
      },
      {
        guidance: true,
        description:
          'Use onExportCsv to capture sanitized RFC 4180 CSV output or omit it to trigger a browser file download automatically.',
      },
      {
        guidance: false,
        description:
          'Use raw unescaped string concatenation for CSV export or plain objects keyed by untrusted row values.',
      },
    ],
    accessibility: [
      {
        name: 'Table semantics, keyboard resize & reorder parity',
        criterion: '2.1.1 Keyboard & 1.3.1 Info and Relationships',
        requirement: 'thead/tbody sections, aria-sort, role="separator" resize handles, button reorder controls',
        description:
          'Every column header exposes scope="col", aria-sort, keyboard-accessible Move Left/Right and Pin toggles, and a focusable separator handle supporting ArrowLeft/ArrowRight/Home/End width adjustments.',
      },
    ],
  },
  props: [
    {
      name: 'columns',
      type: 'ReadonlyArray<AdvancedGridColumn>',
      defaultValue: 'required',
      description: 'Column configurations including key, header, width, minWidth, editable, pinned, align, and sortable.',
    },
    {
      name: 'rows',
      type: 'ReadonlyArray<GridRowRecord>',
      defaultValue: 'required',
      description: 'Typed dataset rows with unique id and typed values record.',
    },
    {
      name: 'onCellEdit',
      type: '(rowId: string, columnKey: string, nextValue: GridCellValue) => void',
      defaultValue: 'undefined',
      description: 'Called when an inline edit is committed via Enter or Save.',
    },
    {
      name: 'groupBy',
      type: 'string | null',
      defaultValue: 'undefined',
      description: 'Controlled grouping column key (null for flat ungrouped rows).',
    },
    {
      name: 'defaultGroupBy',
      type: 'string | null',
      defaultValue: 'null',
      description: 'Initial uncontrolled grouping column key.',
    },
    {
      name: 'onGroupByChange',
      type: '(columnKey: string | null) => void',
      defaultValue: 'undefined',
      description: 'Called when the user selects or clears row grouping.',
    },
    {
      name: 'onExportCsv',
      type: '(csvContent: string, filename: string) => void',
      defaultValue: 'undefined',
      description: 'Receives formula-safe RFC 4180 CSV output and filename; omits auto-download when supplied.',
    },
    {
      name: 'exportFilename',
      type: 'string',
      defaultValue: "'refractor-grid.csv'",
      description: 'Filename for CSV export callback and download.',
    },
    {
      name: 'emptyMessage',
      type: 'string',
      defaultValue: "'No records to display.'",
      description: 'Message rendered when rows or columns are empty.',
    },
  ],
  examples: [
    `<AdvancedDataGrid\n  columns={[\n    { key: 'name', header: 'Project', editable: true, pinned: 'left' },\n    { key: 'region', header: 'Region' },\n    { key: 'budget', header: 'Budget', align: 'right', editable: true },\n  ]}\n  rows={rows}\n  defaultGroupBy="region"\n  onCellEdit={(rowId, colKey, val) => handleEdit(rowId, colKey, val)}\n/>`,
  ],
};
