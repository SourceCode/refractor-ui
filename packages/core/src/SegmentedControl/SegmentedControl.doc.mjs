export const docs = {
  name: 'SegmentedControl',
  displayName: 'Segmented Control',
  group: 'Buttons & Actions',
  category: 'buttons-actions',
  keywords: ['segmented', 'control', 'toggle', 'view', 'selector', 'group', 'pill'],
  usage: {
    description:
      'An optical crystal pill group containing mutually exclusive toggle buttons where the active segment rests in a recessed prism well.',
    bestPractices: [
      { guidance: true, description: 'Use between 2 and 5 concise labels (e.g. "Day", "Week", "Month") so segments stay single-line.' },
      { guidance: true, description: 'Provide a descriptive ariaLabel or aria-label explaining what the segmented control switches.' },
      { guidance: false, description: 'Use SegmentedControl for navigation links that open new routes; use Tabs or NavigationBar instead.' },
    ],
    accessibility: [
      {
        name: 'Pressed state reflection',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'role="group" with aria-pressed on each segment button',
        description: 'Each segment button exposes aria-pressed and supports full keyboard Tab/Enter/Space activation.',
      },
      {
        name: 'Keyboard focus indicator',
        criterion: '2.4.7 Focus Visible',
        requirement: 'Keyboard-only focus ring per segment',
        description: 'Segments use prism-focus-ring (:focus-visible) and disabled:cursor-not-allowed when inactive.',
      },
    ],
  },
  props: [
    { name: 'options', type: 'SegmentOption[]', defaultValue: 'required', description: 'Array of { value, label, icon?, disabled? } segment definitions.' },
    { name: 'value', type: 'string', defaultValue: 'required', description: 'Value of the currently selected segment.' },
    { name: 'onChange', type: '(value: string) => void', defaultValue: 'required', description: 'Callback invoked with the clicked segment value.' },
    { name: 'ariaLabel', type: 'string', defaultValue: "'View selector'", description: 'Accessible label for the button group.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables all segments within the control.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<SegmentedControl\n  ariaLabel="View mode"\n  value={view}\n  onChange={setView}\n  options={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]}\n/>`,
  ],
};
