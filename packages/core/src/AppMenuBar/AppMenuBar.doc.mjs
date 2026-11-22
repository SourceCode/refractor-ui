export const docs = {
  name: 'AppMenuBar',
  displayName: 'Application Menu Bar',
  group: 'Desktop OS & Windowing Metaphors',
  category: 'desktop-os-windowing',
  keywords: [
    'app-menu-bar',
    'menubar',
    'menu bar',
    'desktop',
    'os',
    'file menu',
    'cascading submenu',
    'shortcuts',
    'checkbox menu',
    'windowing',
  ],
  usage: {
    description:
      'Persistent top-edge optical-glass desktop application menu bar built on a refractive prism-slab strip featuring an optional brand identity badge, canonical File/Edit/View/Window/Help menus, hover-to-switch active menu transitions, viewport-clamped dropdowns and cascading nested submenus, toggleable checkbox items, separators, right-aligned monospace shortcut hints, full IME-safe WAI-ARIA menubar keyboard navigation, outside-click dismissal, and a compact polite live status pill.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use AppMenuBar at the top edge of desktop-class creative tools, IDEs, and studio workspaces to expose organized command hierarchies with discoverable keyboard shortcuts.',
      },
      {
        guidance: true,
        description:
          'Group related commands with separator entries and surface view/preference flags using kind: "checkbox" items so users can inspect and toggle state directly inside menus.',
      },
      {
        guidance: false,
        description:
          'Use AppMenuBar for marketing site navigation or deeply nested multi-page links; prefer TopNavBar or SidebarDrawer instead.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Menubar, Menu & Checkbox Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'role="menubar", role="menuitem", role="menu", role="menuitemcheckbox" with aria-checked, role="separator", aria-haspopup="menu", and aria-expanded',
        description:
          'Exposes complete desktop menu hierarchy roles and dynamic state attributes across top-level triggers, dropdown menus, toggleable checkbox entries, and cascading nested submenus.',
      },
      {
        name: 'Full IME-Safe Menubar Keyboard Navigation & Live Status Announcement',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Roving tabIndex with ArrowLeft/ArrowRight menu switching, ArrowUp/ArrowDown/Home/End item traversal, IME-safe Enter/Space activation, Escape dismissal with focus restoration, and role="status" aria-live="polite" pill',
        description:
          'Guards every keyboard handler against active IME composition, applies keyboard-only .prism-focus-ring outlines, and announces the latest invoked action or checkbox state inside a compact polite live region.',
      },
    ],
  },
  props: [
    {
      name: 'menus',
      type: 'ReadonlyArray<AppMenuGroup>',
      defaultValue: 'DEFAULT_APP_MENUS (File, Edit, View, Window, Help)',
      description:
        'Ordered array of top-level menu groups containing action, checkbox, cascading submenu, and separator entries.',
    },
    {
      name: 'brandLabel',
      type: 'string',
      defaultValue: "'Refractor'",
      description:
        'Optional leading application identity badge label displayed before the menubar; pass an empty string to omit the badge.',
    },
    {
      name: 'onSelectAction',
      type: '(item: AppMenuActionItem, menuId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when a non-disabled action item in a dropdown or nested submenu is selected.',
    },
    {
      name: 'onToggleCheck',
      type: '(itemId: string, nextChecked: boolean, menuId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when a checkbox menu item toggles, receiving the item id, next checked boolean, and owning top-level menu id.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom property and inline optical style overrides merged cleanly onto the root container.',
    },
  ],
  examples: [
    `<AppMenuBar\n  brandLabel="Refractor Studio"\n  onSelectAction={(item, menuId) => console.warn(menuId, item.id)}\n  onToggleCheck={(itemId, checked, menuId) => console.warn(menuId, itemId, checked)}\n/>`,
    `<AppMenuBar\n  brandLabel=""\n  menus={[\n    {\n      id: 'file',\n      label: 'File',\n      items: [\n        { id: 'save', label: 'Save', shortcut: '⌘S' },\n        { id: 'sep-1', kind: 'separator' },\n        {\n          id: 'export',\n          kind: 'submenu',\n          label: 'Export As',\n          children: [\n            { id: 'png', label: 'PNG (2×)', shortcut: '⇧⌘E' },\n            { id: 'svg', label: 'SVG Tokens' },\n          ],\n        },\n      ],\n    },\n  ]}\n/>`,
  ],
};

export default docs;
