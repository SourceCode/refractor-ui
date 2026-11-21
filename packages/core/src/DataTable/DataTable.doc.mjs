export const docs = {
  name: 'DataTable',
  displayName: 'Data Table / Grid',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['table', 'grid', 'rows', 'sort', 'selection', 'tabular', 'data'],
  usage: {
    description:
      'Structured high-density rows and columns with interactive column sorting, row selection checkboxes, semantic status accents, and tabular numerals.',
    bestPractices: [
      { guidance: true, description: 'Use tabular numerals for progress percentages and currency allocations so digits align vertically.' },
      { guidance: true, description: 'Pair DataTable with external search, status filters, or pagination controls for large datasets.' },
      { guidance: false, description: 'Render direct <tr> children without <thead>/<tbody> wrappers.' },
    ],
    accessibility: [
      {
        name: 'Table semantics and sort state',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'thead/tbody sections, scope="col", and aria-sort',
        description: 'Column headers expose scope="col" and aria-sort state while each row checkbox carries an explicit accessible name.',
      },
    ],
  },
  props: [
    { name: 'rows', type: 'ReadonlyArray<DataTableRow>', defaultValue: 'required', description: 'Dataset records rendered in compact 44px rows.' },
    { name: 'sortBy', type: 'keyof DataTableRow', defaultValue: 'required', description: 'Active column sort key.' },
    { name: 'sortDir', type: 'SortDirection', defaultValue: 'required', description: 'Active sort direction ("asc" | "desc").' },
    { name: 'onSortChange', type: '(col: keyof DataTableRow) => void', defaultValue: 'required', description: 'Callback fired when a sortable header is clicked.' },
    { name: 'selectedIds', type: 'ReadonlyArray<string>', defaultValue: 'required', description: 'List of selected row IDs.' },
    { name: 'onToggleSelect', type: '(id: string) => void', defaultValue: 'required', description: 'Callback fired when a row checkbox is toggled.' },
    { name: 'emptyMessage', type: 'string', defaultValue: "'No records to display.'", description: 'Message shown when rows is empty.' },
  ],
  examples: [
    `<DataTable\n  rows={rows}\n  sortBy="project"\n  sortDir="asc"\n  onSortChange={handleSort}\n  selectedIds={selected}\n  onToggleSelect={toggleRow}\n/>`,
  ],
};
