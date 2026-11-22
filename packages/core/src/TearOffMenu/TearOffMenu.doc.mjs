export const docs = {
  name: 'TearOffMenu',
  displayName: 'Tear-Off Menu',
  group: 'Menus & Launchers',
  category: 'menus-launchers',
  keywords: [
    'tear-off-menu',
    'tear-off',
    'dropdown',
    'menu',
    'floating-palette',
    'tool-palette',
    'perforated-grip',
    'dock',
    'detachable',
    'menus-launchers',
    'optical-glass',
  ],
  usage: {
    description:
      'Optical-glass dropdown menu featuring a perforated dashed --prism-border top grip that lets power users click, press Enter/Space, or drag by at least 24px to tear the menu away from its parent menu bar and pin it as a persistent elevated prism-slab floating tool palette. Supports shared toggleable checkable state across docked and detached states, Dock Back and Close palette titlebar controls, IME-safe ArrowDown/ArrowUp/Home/End/Escape keyboard traversal skipping disabled items, strict window pointer listener cleanup, and polite aria-live status announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use TearOffMenu for frequently repeated creative or inspection actions (such as grid snapping, specular guides, alignment, and viewport reset) where power users benefit from pinning a dropdown into a persistent floating palette.',
      },
      {
        guidance: true,
        description:
          'Provide a boolean checked property on toggleable tool items so users can see and preserve active guide/snap states seamlessly when tearing off or docking back.',
      },
      {
        guidance: false,
        description:
          'Use TearOffMenu for single-shot navigational links or destructive confirmations; use AppMenuBar, ContextMenuDropdown, or ModalDialog instead.',
      },
    ],
    accessibility: [
      {
        name: 'Dual Docked Menu & Floating Palette ARIA Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Trigger exposes aria-haspopup="menu" and aria-expanded={isOpen && !isDetached}; docked panel exposes role="menu" with role="menuitem" / role="menuitemcheckbox" and aria-checked; torn-off palette exposes role="region" with aria-label="<menuLabel> floating palette", Dock Back / Close buttons, and aria-pressed toggle controls',
        description:
          'Transitions cleanly between transient WAI-ARIA menu semantics while docked and persistent landmark region semantics while detached as a floating tool palette.',
      },
      {
        name: 'IME-Safe Keyboard Navigation, Perforated Grip Parity & Polite Announcements',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Perforated Tear-Off Grip detaches on click, IME-safe Enter/Space, or >=24px drag; ArrowDown/ArrowUp/Home/End skip disabled items; Escape closes the docked dropdown and restores focus; keyboard-only .prism-focus-ring outlines; polite aria-live="polite" status updates',
        description:
          'Ensures full keyboard parity for tearing off without requiring pointer dragging, guards all keydown handlers against IME composition, and announces state transitions politely.',
      },
    ],
  },
  props: [
    {
      name: 'menuLabel',
      type: 'string',
      defaultValue: "'View & Guides'",
      description:
        'Label displayed on the parent menu bar trigger button and the floating tool palette titlebar.',
    },
    {
      name: 'items',
      type: 'ReadonlyArray<TearOffMenuItem>',
      defaultValue:
        'DEFAULT_TEAR_OFF_MENU_ITEMS (5 view & optical guide actions)',
      description:
        'Ordered array of actions rendered inside both the docked dropdown and torn-off floating palette.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled open visibility of the docked dropdown menu.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Initial open state of the docked dropdown menu when operating uncontrolled.',
    },
    {
      name: 'detached',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled detached state indicating whether the menu is torn off as a persistent floating palette.',
    },
    {
      name: 'defaultDetached',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Initial detached state when operating uncontrolled.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the docked dropdown opens or closes.',
    },
    {
      name: 'onDetachedChange',
      type: '(detached: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the menu is torn off into a floating palette or docked/closed back to the menu bar.',
    },
    {
      name: 'onSelectItem',
      type: '(item: TearOffMenuItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when an enabled item is activated; receives the updated checked state for checkable items.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables the trigger, perforated tear-off grip, floating palette titlebar buttons, and all menu items.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom properties and inline optical style overrides merged onto the root container.',
    },
  ],
  examples: [
    `<TearOffMenu\n  menuLabel="View & Guides"\n  onSelectItem={(item) => console.warn(item.id, item.checked)}\n  onDetachedChange={(detached) => console.warn('detached:', detached)}\n/>`,
    `<TearOffMenu\n  menuLabel="Optical Guides"\n  defaultDetached\n  items={[\n    { id: 'grid', label: 'Snap to Optical Grid', checked: true },\n    { id: 'guides', label: 'Show Specular Guides', checked: false },\n    { id: 'reset', label: 'Reset Viewport', shortcut: '⌘0' },\n  ]}\n  onSelectItem={(item) => console.warn(item.label)}\n/>`,
  ],
};

export default docs;
