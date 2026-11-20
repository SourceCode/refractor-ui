export const docs = {
  name: 'MasterDetailView',
  displayName: 'Master-Detail View',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['master', 'detail', 'split', 'pane', 'inbox', 'inspector', 'listbox', 'workspace'],
  usage: {
    description:
      'Unified optical glass split workspace pairing a searchable crystal master list pane and emerald active row indicator with a responsive detail canvas and mobile back-to-list trigger.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide stable unique item IDs and concise titles/subtitles so records scan cleanly inside the master pane.',
      },
      {
        guidance: true,
        description:
          'Use controlled `selectedId` + `onSelectItem` when synchronizing selection with URL routes or external state.',
      },
      {
        guidance: false,
        description:
          'Nest heavy multi-pane layouts inside `renderDetail`; keep the detail surface focused on the active record.',
      },
    ],
    accessibility: [
      {
        name: 'Listbox selection and keyboard navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'role="listbox", role="option", aria-selected, ArrowUp/ArrowDown/Home/End',
        description:
          'Master items expose listbox/option semantics with aria-selected, full Arrow/Home/End keyboard traversal across filtered entries, keyboard-only focus rings, and IME-safe search input.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<T>',
      defaultValue: 'required',
      description: 'Master collection of items conforming to MasterDetailItem.',
    },
    {
      name: 'selectedId',
      type: 'string | null',
      defaultValue: 'undefined',
      description: 'Controlled active item ID.',
    },
    {
      name: 'defaultSelectedId',
      type: 'string | null',
      defaultValue: 'items[0]?.id ?? null',
      description: 'Initial selected item ID in uncontrolled mode.',
    },
    {
      name: 'onSelectItem',
      type: '(item: T) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when an item is selected via pointer or keyboard.',
    },
    {
      name: 'renderDetail',
      type: '(item: T) => ReactNode',
      defaultValue: 'required',
      description: 'Render callback for the active record in the detail pane.',
    },
    {
      name: 'renderItem',
      type: '(item: T, selected: boolean) => ReactNode',
      defaultValue: 'undefined',
      description: 'Optional custom renderer for rows in the master pane.',
    },
    {
      name: 'masterTitle',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional title displayed in the master pane header with live item count.',
    },
    {
      name: 'searchable',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays a recessed frosted search well filtering master items.',
    },
    {
      name: 'searchPlaceholder',
      type: 'string',
      defaultValue: "'Search items...'",
      description: 'Placeholder and accessible label for the search input.',
    },
    {
      name: 'emptyDetailMessage',
      type: 'string',
      defaultValue: "'Select an item to view details.'",
      description: 'Message rendered in the detail canvas when no valid item is selected.',
    },
    {
      name: 'emptyListMessage',
      type: 'string',
      defaultValue: "'No matching items found.'",
      description: 'Message rendered in the master pane when the list or search filter is empty.',
    },
    {
      name: 'masterWidthPx',
      type: 'number',
      defaultValue: '300',
      description: 'Desktop width of the master pane in pixels (clamped between 200 and 480).',
    },
  ],
  examples: [
    `<MasterDetailView\n  masterTitle="Telemetry Nodes"\n  items={[\n    { id: 'n1', title: 'Prism Gateway US-East', subtitle: '99.98% uptime', badge: 'Healthy', meta: '12ms' },\n    { id: 'n2', title: 'Refractor Edge EU-West', subtitle: 'Elevated latency', badge: 'Warn', meta: '64ms' },\n  ]}\n  renderDetail={(item) => <div><h3>{item.title}</h3><p>{item.subtitle}</p></div>}\n/>`,
  ],
};
