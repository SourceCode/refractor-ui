export const docs = {
  name: 'RichSelectionCards',
  displayName: 'Rich Selection Cards',
  group: 'Complex Variations of Common Controls',
  category: 'complex-controls',
  keywords: [
    'selection',
    'cards',
    'radio',
    'checkbox',
    'plan',
    'choice',
    'option',
    'grid',
    'multi-select',
    'rich',
  ],
  usage: {
    description:
      'Optical-glass selectable card grid supporting both single-choice WAI-ARIA radiogroup roving focus and multi-select checkbox toggling, with icon medallions, optional badge pills, supporting descriptions, active prism-crystal selection rings, and prism-emerald check indicators.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use RichSelectionCards when each choice benefits from visual hierarchy such as an icon medallion, short description, or recommendation badge.',
      },
      {
        guidance: true,
        description:
          'Keep card titles concise and choose columns={1 | 2 | 3} to match the card density and viewport width.',
      },
      {
        guidance: false,
        description:
          'Use RichSelectionCards for long lists of 10+ simple text choices; prefer DropdownSelect or RadioGroup instead.',
      },
    ],
    accessibility: [
      {
        name: 'Adaptive WAI-ARIA Single & Multi-Select Semantics',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Uses role="radiogroup" + role="radio" with Arrow key roving focus in single mode, and role="group" + role="checkbox" in multiple mode',
        description:
          'Exposes aria-checked on every card, skips disabled options during ArrowRight/ArrowDown/ArrowLeft/ArrowUp navigation in single mode, and keeps IME composition safe.',
      },
      {
        name: 'Keyboard-Only Focus Outlines & Disabled Parity',
        criterion: '2.4.7 Focus Visible',
        requirement: 'prism-focus-ring (:focus-visible), disabled:cursor-not-allowed, enabled:hover: elevation',
        description:
          'Suppresses hover lift on disabled cards and renders crisp keyboard-only focus rings around focused selection cards.',
      },
    ],
  },
  props: [
    {
      name: 'options',
      type: 'RichSelectionCardOption[]',
      defaultValue: 'required',
      description: 'Array of card options ({ id, title, description?, badge?, icon?, disabled? }).',
    },
    {
      name: 'mode',
      type: "'single' | 'multiple'",
      defaultValue: "'single'",
      description: 'Switches between mutually exclusive radio cards and multi-select checkbox cards.',
    },
    {
      name: 'value',
      type: 'string[]',
      defaultValue: 'undefined',
      description: 'Controlled array of selected option IDs.',
    },
    {
      name: 'defaultValue',
      type: 'string[]',
      defaultValue: '[]',
      description: 'Initial array of selected option IDs in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(selectedIds: string[]) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the updated array of selected option IDs.',
    },
    {
      name: 'columns',
      type: '1 | 2 | 3',
      defaultValue: '2',
      description: 'Responsive grid column count on wider viewports.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Choose an option'",
      description: 'Accessible group name exposed via aria-label.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables interaction across every card in the group.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<RichSelectionCards\n  label="Deployment tier"\n  mode="single"\n  defaultValue={['pro']}\n  options={[\n    { id: 'starter', title: 'Starter', description: 'Single region optical edge' },\n    { id: 'pro', title: 'Pro', badge: 'Recommended', description: 'Global prism CDN with priority routing' },\n  ]}\n/>`,
    `<RichSelectionCards\n  label="Enabled capabilities"\n  mode="multiple"\n  columns={3}\n  defaultValue={['optics', 'telemetry']}\n  options={[\n    { id: 'optics', title: 'Caustic Optics', description: 'Dynamic refraction physics' },\n    { id: 'telemetry', title: 'Live Telemetry', badge: 'New' },\n    { id: 'audit', title: 'Audit Vault', disabled: true },\n  ]}\n/>`,
  ],
};
