export const docs = {
  name: 'FloatingActionButton',
  displayName: 'Floating Action Button (FAB)',
  group: 'Buttons & Actions',
  category: 'buttons-actions',
  keywords: ['fab', 'floating', 'action', 'button', 'create', 'quick', 'plus'],
  usage: {
    description:
      'A prominent circular or extended-pill optical glass floating action button representing the single most constructive quick-create action on a screen.',
    bestPractices: [
      { guidance: true, description: 'Use at most one FloatingActionButton per screen for the primary creation flow (e.g., "New note", "Compose").' },
      { guidance: true, description: 'Provide a concise label prop when extended pill affordance improves discoverability.' },
      { guidance: false, description: 'Use a FloatingActionButton for destructive or minor secondary actions.' },
    ],
    accessibility: [
      {
        name: 'Accessible name fallback',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Every FAB has an explicit aria-label',
        description: 'Resolves aria-label from explicit aria-label, label prop, or the "Quick create action" fallback.',
      },
      {
        name: 'Keyboard focus indicator',
        criterion: '2.4.7 Focus Visible',
        requirement: 'Keyboard-only optical focus ring',
        description: 'Uses prism-focus-ring (:focus-visible) so mouse clicks stay clean while keyboard focus is unmistakable.',
      },
    ],
  },
  props: [
    { name: 'label', type: 'string', defaultValue: 'undefined', description: 'Optional label expanding the circular FAB into an extended pill.' },
    { name: 'icon', type: 'ReactNode', defaultValue: '<Plus />', description: 'Custom icon element rendered inside the button.' },
    { name: 'tone', type: "'primary' | 'cobalt' | 'crystal'", defaultValue: "'primary'", description: 'Selects primary amber, cobalt sapphire, or clear crystal glass.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables interaction and reduces button prominence.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<FloatingActionButton label="New canvas" tone="primary" onClick={handleCreate} />`,
    `<FloatingActionButton aria-label="Add layer" tone="crystal" onClick={handleAddLayer} />`,
  ],
};
