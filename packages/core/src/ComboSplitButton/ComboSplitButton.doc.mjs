export const docs = {
  name: 'ComboSplitButton',
  displayName: 'Combo Split Action Button',
  group: 'Complex Button & Action Variations',
  category: 'complex-buttons',
  keywords: [
    'combo',
    'split',
    'button',
    'action',
    'dropdown',
    'menu',
    'destructive',
    'keyboard',
    'primary',
    'secondary',
  ],
  usage: {
    description:
      'A joined optical-glass button group pairing a primary action capsule (with optional leading icon and sm/md/lg scale) with an attached divider and chevron trigger that opens a floating prism-slab menu supporting icons, descriptions, destructive semantic styling, disabled items, per-action callbacks, and full WAI-ARIA arrow/Home/End keyboard traversal.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use ComboSplitButton when a dominant default workflow action has closely related secondary or destructive variants such as "Merge pull request", "Squash and merge", or "Close without merging".',
      },
      {
        guidance: true,
        description:
          'Provide a descriptive menuLabel (e.g. "More merge options") when multiple ComboSplitButton controls appear in the same toolbar.',
      },
      {
        guidance: false,
        description:
          'Hide the primary destructive command as the default click target; place destructive operations inside the dropdown menu marked with destructive: true.',
      },
    ],
    accessibility: [
      {
        name: 'Joined Group & Menu Button Semantics',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement:
          'role="group", aria-haspopup="menu", aria-expanded, aria-controls, role="menu", and role="menuitem"',
        description:
          'Groups the primary button and chevron toggle under role="group" while linking the trigger to its floating prism-slab menu via aria-controls and aria-expanded.',
      },
      {
        name: 'Roving Arrow / Home / End Traversal & Escape Return',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'ArrowDown, ArrowUp, Home, End across enabled menu items; Escape restores focus to trigger; IME-safe key handling; prism-focus-ring',
        description:
          'Skips disabled items during keyboard navigation, guards keydown against IME composition, returns focus to the chevron trigger on Escape, and closes on outside pointer interaction.',
      },
    ],
  },
  props: [
    {
      name: 'label',
      type: 'string',
      defaultValue: 'required',
      description: 'Primary button label text.',
    },
    {
      name: 'icon',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Optional leading icon rendered inside the primary action button.',
    },
    {
      name: 'onPrimaryClick',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional handler invoked when clicking the primary button half.',
    },
    {
      name: 'actions',
      type: 'ComboSplitAction[]',
      defaultValue: 'required',
      description: 'Menu actions rendered inside the floating optical slab menu.',
    },
    {
      name: 'onActionSelect',
      type: '(action: ComboSplitAction) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the chosen action when an enabled menu item is selected.',
    },
    {
      name: 'tone',
      type: "'primary' | 'secondary'",
      defaultValue: "'primary'",
      description: 'Selects warm primary refractive glass or cool secondary crystal shell.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      defaultValue: "'md'",
      description: 'Height and padding scale for the joined button group.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables both the primary button and the chevron menu trigger.',
    },
    {
      name: 'menuLabel',
      type: 'string',
      defaultValue: "'More actions'",
      description: 'Accessible label applied to the chevron menu button and floating menu.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ComboSplitButton\n  label="Deploy Production"\n  tone="primary"\n  size="md"\n  onPrimaryClick={() => deploy('prod')}\n  actions={[\n    { id: 'staging', label: 'Deploy to Staging', description: 'Run canary smoke checks first' },\n    { id: 'schedule', label: 'Schedule Rollout', description: 'Queue for next maintenance window' },\n    { id: 'rollback', label: 'Force Rollback', description: 'Revert cluster immediately', destructive: true },\n  ]}\n  onActionSelect={(action) => console.warn('Selected:', action.id)}\n/>`,
  ],
};
