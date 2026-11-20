export const docs = {
  name: 'SortableList',
  displayName: 'Sortable Drag-and-Drop List',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['sortable', 'drag-and-drop', 'reorder', 'priority', 'ranking', 'list', 'dnd'],
  usage: {
    description:
      'Optical prism-slab stack of draggable prism-crystal priority rows with tactile GripVertical handles, tabular rank orbs (#1, #2, ...), accessible Move Up / Move Down crystal buttons, Alt+Arrow keyboard reordering, locked-row pinning, and polite aria-live reorder announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use SortableList for ordered priority queues, build pipelines, or navigation layers where explicit rank order matters.',
      },
      {
        guidance: true,
        description:
          'Set locked: true on pinned boundary rows to guarantee they cannot be dragged, dropped onto, or displaced via keyboard reordering.',
      },
      {
        guidance: false,
        description:
          'Disable keyboard Move Up / Move Down alternatives; keep both pointer drag-and-drop and keyboard controls available for WCAG 2.1.1 compliance.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Reordering & Live Announcements',
        criterion: '2.1.1 Keyboard / 4.1.3 Status Messages',
        requirement: 'Alt+ArrowUp / Alt+ArrowDown on grab handles, Move Up / Move Down buttons, and aria-live="polite" status region',
        description:
          'Every unlocked row supports Alt+ArrowUp and Alt+ArrowDown from its focusable grab handle as well as dedicated Move Up and Move Down buttons, announcing each move (e.g. "Moved Optical Tokens to position 1 of 4") via an aria-live="polite" status region.',
      },
      {
        name: 'Locked Item Protection',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'draggable="false", disabled grab handle and directional controls, data-locked="true"',
        description:
          'Locked items expose their locked state visually and programmatically, rejecting drag starts, drops, and adjacent displacement.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<T>',
      defaultValue: 'undefined',
      description: 'Controlled ordered list of sortable items extending SortableListItem.',
    },
    {
      name: 'defaultItems',
      type: 'ReadonlyArray<T>',
      defaultValue: 'undefined',
      description: 'Initial ordered items when operating in uncontrolled mode.',
    },
    {
      name: 'onReorder',
      type: '(nextItems: T[], fromIndex: number, toIndex: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the reordered array and source/destination indices.',
    },
    {
      name: 'renderItem',
      type: '(item: T, index: number) => ReactNode',
      defaultValue: 'undefined',
      description: 'Optional custom renderer for row content beside the rank orb and controls.',
    },
    {
      name: 'ariaLabel',
      type: 'string',
      defaultValue: "'Sortable priority list'",
      description: 'Accessible label for the ordered list container.',
    },
    {
      name: 'emptyMessage',
      type: 'string',
      defaultValue: "'No items to reorder.'",
      description: 'Empty-state placeholder text rendered when no items are provided.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<SortableList\n  defaultItems={[\n    { id: '1', title: 'Optical Tokens', subtitle: 'CSS refraction variables', badge: 'P0' },\n    { id: '2', title: 'Keyboard Focus Rings', subtitle: 'WCAG 2.2 focus-visible pass', badge: 'P1' },\n    { id: '3', title: 'Kernel Baseline', subtitle: 'Pinned foundation', locked: true },\n  ]}\n  onReorder={(next) => setPriorityQueue(next)}\n/>`,
  ],
};
