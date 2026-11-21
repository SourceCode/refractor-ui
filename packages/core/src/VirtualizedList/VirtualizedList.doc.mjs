export const docs = {
  name: 'VirtualizedList',
  displayName: 'Virtualized List / Infinite Scroller',
  group: 'Layout & Workspace Controls',
  category: 'layout-workspace',
  keywords: ['virtualized', 'list', 'windowing', 'infinite', 'scroll', 'performance', 'large-data'],
  usage: {
    description:
      'High-performance optical glass virtualized list container that windows 50,000+ rows down to a tiny visible DOM slice with a frosted telemetry pill and re-entrancy-guarded infinite scroll trigger.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Supply stable unique `id` values on every record and keep row markup uniform to match `itemHeight`.',
      },
      {
        guidance: true,
        description:
          'Set `loadingMore={true}` while fetching the next page inside `onEndReached` to surface the crystal loading pill and prevent duplicate fetches.',
      },
      {
        guidance: false,
        description:
          'Use an excessively large `overscan` (> 20) that negates DOM virtualization benefits on low-power devices.',
      },
    ],
    accessibility: [
      {
        name: 'Virtualized list position semantics',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement: 'role="list", role="listitem", aria-posinset, aria-setsize, and status live region',
        description:
          'Each mounted row declares its exact logical position via aria-posinset and aria-setsize, the scroll viewport is keyboard focusable with a keyboard-only focus ring, and infinite loading announces via role="status".',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<T>',
      defaultValue: 'required',
      description: 'Full collection of items requiring a stable string `id`.',
    },
    {
      name: 'itemHeight',
      type: 'number',
      defaultValue: '48',
      description: 'Fixed row height in pixels (clamped >= 20).',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '320',
      description: 'Viewport height in pixels (clamped >= 80).',
    },
    {
      name: 'overscan',
      type: 'number',
      defaultValue: '3',
      description: 'Extra rows rendered above and below the viewport (clamped 0..20).',
    },
    {
      name: 'renderItem',
      type: '(item: T, index: number) => ReactNode',
      defaultValue: 'required',
      description: 'Render callback invoked for each currently visible row.',
    },
    {
      name: 'onEndReached',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback triggered once per scroll into `endReachedThreshold` for the current dataset length.',
    },
    {
      name: 'endReachedThreshold',
      type: 'number',
      defaultValue: '120',
      description: 'Distance in pixels from the bottom edge to trigger `onEndReached`.',
    },
    {
      name: 'loadingMore',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Displays the optical loading indicator pill and pauses `onEndReached` firing.',
    },
    {
      name: 'emptyMessage',
      type: 'string',
      defaultValue: "'No items to display.'",
      description: 'Message rendered inside the viewport when `items` is empty.',
    },
    {
      name: 'showTelemetry',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays the crystal header telemetry pill with the visible row range.',
    },
  ],
  examples: [
    `<VirtualizedList\n  items={records}\n  itemHeight={48}\n  height={320}\n  onEndReached={loadNextPage}\n  loadingMore={isFetching}\n  renderItem={(item, index) => <div>{index + 1}. {item.label}</div>}\n/>`,
  ],
};
