export const docs = {
  name: 'ContextMenuDropdown',
  displayName: 'Context Menu & Dropdown',
  group: 'Overlays & Floating Surfaces',
  category: 'overlays',
  keywords: ['context-menu', 'dropdown', 'menu', 'actions', 'right-click', 'shortcuts'],
  usage: {
    description:
      'Dual-trigger optical slab action menu supporting both click-triggered dropdown and right-click context menu activation with keyboard shortcuts and destructive action styling.',
    bestPractices: [
      { guidance: true, description: 'Place destructive actions at the bottom of the actions list with destructive: true.' },
      { guidance: true, description: 'Provide concise shortcut hints for power-user operations.' },
      { guidance: false, description: 'Hide critical primary actions exclusively behind right-click context menus.' },
    ],
    accessibility: [
      {
        name: 'Menu semantics & dismissal',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'role="menu", role="menuitem", Escape & outside-click close',
        description: 'Sets aria-haspopup="menu" and aria-expanded on the trigger button, renders role="menuitem" items, and closes on Escape or outside click.',
      },
    ],
  },
  props: [
    { name: 'actions', type: 'ContextMenuAction[]', defaultValue: 'required', description: 'List of actions with id, label, optional shortcut, and optional destructive flag.' },
    { name: 'onSelect', type: '(action: ContextMenuAction) => void', defaultValue: 'required', description: 'Invoked with the selected action before closing the menu.' },
  ],
  examples: [
    `<ContextMenuDropdown\n  actions={[\n    { id: 'dup', label: 'Duplicate', shortcut: '⌘D' },\n    { id: 'del', label: 'Delete', shortcut: '⌫', destructive: true },\n  ]}\n  onSelect={handleAction}\n/>`,
  ],
};
