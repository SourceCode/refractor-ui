export const docs = {
  name: 'TagChip',
  displayName: 'Tag / Chip',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['tag', 'chip', 'filter', 'pill', 'dismissible', 'token'],
  usage: {
    description:
      'Compact interactive filter capsule used to toggle category selections or dismiss active filters, transitioning smoothly between clear crystal and emerald active glass.',
    bestPractices: [
      { guidance: true, description: 'Provide onSelect for toggleable filter chips so assistive technology receives aria-pressed state.' },
      { guidance: true, description: 'Supply onDismiss only when the user can meaningfully remove the tag from the current view.' },
      { guidance: false, description: 'Use TagChip for primary page actions; use PrimaryButton or SecondaryButton instead.' },
    ],
    accessibility: [
      {
        name: 'Toggle & dismiss semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'aria-pressed on selection button and explicit aria-label on dismiss button',
        description: 'Selectable chips render native toggle buttons with aria-pressed and keyboard-only focus rings; dismiss controls announce "Remove <label> filter".',
      },
    ],
  },
  props: [
    { name: 'label', type: 'string', defaultValue: 'required', description: 'Concise tag or filter label.' },
    { name: 'selected', type: 'boolean', defaultValue: 'false', description: 'Switches chip to emerald active glass.' },
    { name: 'onSelect', type: '() => void', defaultValue: 'undefined', description: 'Enables interactive selection toggle.' },
    { name: 'onDismiss', type: '() => void', defaultValue: 'undefined', description: 'Renders trailing dismiss button.' },
  ],
  examples: [
    `<TagChip label="Refractive CSS" selected={active} onSelect={toggle} onDismiss={remove} />`,
  ],
};
