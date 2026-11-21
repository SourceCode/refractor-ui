export const docs = {
  name: 'IconButton',
  displayName: 'Icon Button',
  group: 'Buttons & Actions',
  category: 'buttons-actions',
  keywords: ['icon', 'button', 'toolbar', 'toggle', 'crystal', 'action'],
  usage: {
    description:
      'A square optical crystal glass tile button for compact toolbar controls and toggleable icon actions with mandatory accessible labeling.',
    bestPractices: [
      { guidance: true, description: 'Always provide a descriptive verb phrase in aria-label (e.g., "Toggle dark mode", "Pin window").' },
      { guidance: true, description: 'Use the active prop for stateful toggles so screen readers announce aria-pressed="true".' },
      { guidance: false, description: 'Render multi-word text strings inside IconButton; use SecondaryButton or PrimaryButton instead.' },
    ],
    accessibility: [
      {
        name: 'Accessible name',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Non-empty aria-label required at compile time',
        description: 'TypeScript enforces aria-label on IconButtonProps and exposes active state via aria-pressed.',
      },
      {
        name: 'Disabled hover restraint',
        criterion: '1.4.11 Non-text Contrast',
        requirement: 'No false affordances when disabled',
        description: 'Hover lift transforms are guarded with enabled:hover: and paired with disabled:cursor-not-allowed.',
      },
    ],
  },
  props: [
    { name: 'aria-label', type: 'string', defaultValue: 'required', description: 'Accessible name announced by screen readers.' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", defaultValue: "'md'", description: 'Controls square dimension and optical bevel radius.' },
    { name: 'active', type: 'boolean', defaultValue: 'false', description: 'Applies active ring highlight and aria-pressed state.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables interaction and suppresses hover lift.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<IconButton aria-label="Toggle bookmark" active={bookmarked} onClick={toggleBookmark}>\n  <Bookmark className="w-5 h-5" />\n</IconButton>`,
  ],
};
