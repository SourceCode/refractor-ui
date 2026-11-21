export const docs = {
  name: 'SplitButton',
  displayName: 'Split Action Button',
  group: 'Buttons & Actions',
  category: 'buttons-actions',
  keywords: ['split', 'button', 'dropdown', 'menu', 'actions', 'primary', 'crystal'],
  usage: {
    description:
      'A dual-zone optical glass capsule pairing an immediate primary action on the left with a chevron trigger that opens a slab menu of related secondary actions.',
    bestPractices: [
      { guidance: true, description: 'Use SplitButton when one default action dominates (e.g. "Deploy") alongside closely related variants ("Deploy staging", "Schedule deploy").' },
      { guidance: true, description: 'Keep menu descriptions brief so the prism slab popover stays compact and scannable.' },
      { guidance: false, description: 'Group unrelated commands inside the dropdown menu; use a dedicated MenuButton instead.' },
    ],
    accessibility: [
      {
        name: 'Menu semantics & keyboard dismiss',
        criterion: '2.1.1 Keyboard',
        requirement: 'aria-haspopup="menu", aria-expanded, Escape dismissal',
        description: 'Chevron button announces expanded state and links via aria-controls; pressing Escape or clicking outside closes the menu.',
      },
      {
        name: 'Keyboard-only focus rings',
        criterion: '2.4.7 Focus Visible',
        requirement: 'Distinct focus ring on primary button, menu toggle, and menu items',
        description: 'Every interactive button uses prism-focus-ring (:focus-visible) and disabled:cursor-not-allowed.',
      },
    ],
  },
  props: [
    { name: 'label', type: 'string', defaultValue: 'required', description: 'Primary action button text.' },
    { name: 'onPrimaryClick', type: '() => void', defaultValue: 'required', description: 'Handler invoked when clicking the primary button half.' },
    { name: 'actions', type: 'SplitActionItem[]', defaultValue: 'required', description: 'Secondary actions displayed inside the dropdown menu.' },
    { name: 'onSelectAction', type: '(action: SplitActionItem) => void', defaultValue: 'required', description: 'Callback fired when a dropdown menuitem is clicked.' },
    { name: 'tone', type: "'primary' | 'crystal'", defaultValue: "'primary'", description: 'Selects warm primary glass or frosted crystal shell.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables both halves of the split button.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<SplitButton\n  label="Publish"\n  onPrimaryClick={publishNow}\n  actions={[{ id: 'draft', label: 'Save as draft', description: 'Keep private' }]}\n  onSelectAction={handleAction}\n/>`,
  ],
};
