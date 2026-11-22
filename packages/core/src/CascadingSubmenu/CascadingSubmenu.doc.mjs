export const docs = {
  name: 'CascadingSubmenu',
  displayName: 'Cascading Submenu',
  group: 'Menus & Launchers',
  category: 'menus-launchers',
  keywords: [
    'cascading-submenu',
    'cascading',
    'submenu',
    'nested-menu',
    'safe-triangle',
    'hover-intent',
    'hover-delay',
    'multi-level',
    'menus-launchers',
    'shortcuts',
    'optical-glass',
  ],
  usage: {
    description:
      'Multi-level cascading nested optical submenu inside a refractive prism-slab shell featuring directional safe-triangle hover deferral (pure 2D cross-product point-in-triangle geometry via isPointInSafeTriangle), responsive horizontally scrollable side-by-side role="menu" panes so deep 3-level hierarchies never overflow narrow mobile viewports, checkmark and shortcut indicators, full IME-safe WAI-ARIA keyboard traversal (ArrowDown/ArrowUp skipping disabled entries, ArrowRight to open and focus child panes, ArrowLeft/Escape to close and restore parent focus, Enter/Space to activate), and a polite aria-live="polite" status strip announcing opened levels and selected commands.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep nested command hierarchies to 2 or 3 focused levels with concise labels and optional monospace shortcut badges so diagonal safe-triangle hover traversal stays effortless.',
      },
      {
        guidance: true,
        description:
          'Tune hoverDelayMs (default 160ms, clamped 0..1000ms) to balance forgiving diagonal pointer travel toward open child panes against snappy sibling switching.',
      },
      {
        guidance: false,
        description:
          'Hide essential top-level actions four or more levels deep or rely exclusively on hover without keyboard support; CascadingSubmenu exposes full Arrow/Enter/Space/Escape parity out of the box.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Multi-Level Menu & Submenu Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Adjacent role="menu" panes with role="menuitem" triggers carrying aria-haspopup="menu", aria-expanded, aria-controls, and aria-disabled="true" for disabled items',
        description:
          'Links each expanded parent trigger cleanly to its adjacent child submenu column via aria-controls and exposes disabled states without blocking traversal of enabled siblings.',
      },
      {
        name: 'IME-Safe Cascading Keyboard Navigation & Polite Announcements',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'ArrowDown/ArrowUp/Home/End skip disabled items, ArrowRight opens and focuses the first enabled child, ArrowLeft/Escape close the active level and restore parent focus, Enter/Space select or expand, guarded by !e.nativeEvent.isComposing, with .prism-focus-ring and role="status" aria-live="polite"',
        description:
          'Ensures complete keyboard operability across all nesting depths while announcing opened levels and selected command paths inside a non-intrusive polite live region.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Command Menu'",
      description:
        'Accessible heading displayed in the prism-slab header and applied as the root region and root menu aria-label.',
    },
    {
      name: 'items',
      type: 'ReadonlyArray<CascadingMenuItem>',
      defaultValue: 'DEFAULT_CASCADING_MENU_ITEMS (3-level studio command hierarchy)',
      description:
        'Hierarchical array of menu items supporting id, label, shortcut, disabled, checked, and recursive children. Passing an empty array ([]) renders a clean role="status" empty state.',
    },
    {
      name: 'hoverDelayMs',
      type: 'number',
      defaultValue: '160',
      description:
        'Safe-triangle hover deferral delay in milliseconds (clamped 0..1000). Defers closing or switching an open child submenu while the pointer travels diagonally inside the safe triangle toward that child pane.',
    },
    {
      name: 'onSelectItem',
      type: '(item: CascadingMenuItem, pathIds: ReadonlyArray<string>) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when an enabled leaf item is selected via click, Enter, or Space, receiving the selected item and the full ancestor-to-leaf pathIds array.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all pointer and keyboard menu interactions, clears pending hover timers, and collapses open child panes.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom properties and inline optical style overrides merged cleanly onto the root prism-slab.',
    },
  ],
  examples: [
    `<CascadingSubmenu\n  title="Studio Commands"\n  hoverDelayMs={160}\n  onSelectItem={(item, pathIds) => console.warn(item.label, pathIds)}\n/>`,
    `<CascadingSubmenu\n  title="Export Pipeline"\n  items={[\n    { id: 'save', label: 'Save Snapshot', shortcut: '⌘S' },\n    {\n      id: 'export',\n      label: 'Export As',\n      children: [\n        {\n          id: 'raster',\n          label: 'Raster Image',\n          children: [\n            { id: 'png', label: 'PNG (2x Retina)', shortcut: '⇧⌘P', checked: true },\n            { id: 'webp', label: 'WebP Lossless', shortcut: '⇧⌘W' },\n          ],\n        },\n      ],\n    },\n  ]}\n  onSelectItem={(item, pathIds) => console.warn(pathIds.join(' / '), item.id)}\n/>`,
  ],
};

export default docs;
