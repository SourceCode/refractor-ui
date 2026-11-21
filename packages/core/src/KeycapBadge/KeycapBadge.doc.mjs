export const docs = {
  name: 'KeycapBadge',
  displayName: 'Keycap Badge (Keyboard Shortcut)',
  group: 'Mobile, Touch & System Utilities',
  category: 'mobile-utilities',
  keywords: [
    'kbd',
    'keycap',
    'keyboard',
    'shortcut',
    'hotkey',
    'command',
    'badge',
    'keybinding',
    'utility',
  ],
  usage: {
    description:
      'Sculpted optical-crystal keyboard shortcut badge rendering tactile <kbd> keycaps with monospace tabular typography, a raised bottom border edge, muted aria-hidden joiners, three size scales (sm, md, lg), graceful empty-key filtering, and combined screen-reader aria-label/title metadata.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide a concise description prop (such as "Open command palette") so screen readers announce both the action and key chord while desktop users get a native title tooltip.',
      },
      {
        guidance: true,
        description:
          'Use concise platform symbols or standard labels (e.g. ["⌘", "K"] or ["Ctrl", "Shift", "P"]) and pair joiner="" when rendering compact macOS-style adjacent symbol caps.',
      },
      {
        guidance: false,
        description:
          'Pass raw HTML or duplicate empty strings expecting custom markup; KeycapBadge filters blank entries automatically and escapes all key labels as literal text.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic <kbd> Elements & Combined Chord Label',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement: 'Native <kbd> elements with aria-hidden joiners and combined container aria-label',
        description:
          'Uses semantic <kbd> tags for each physical key, hides decorative joiners with aria-hidden="true", and exposes a complete readable shortcut phrase via aria-label and title.',
      },
      {
        name: 'Graceful Empty & Ref-Preserving Host Element',
        criterion: 'Robust DOM Contract',
        requirement: 'Preserves <span> host with ref, BaseProps, and data-empty="true" when no valid keys remain',
        description:
          'Filters whitespace-only entries safely without crashing and retains the outer host span with data-empty="true" so refs and testing hooks remain intact.',
      },
    ],
  },
  props: [
    {
      name: 'keys',
      type: 'string[]',
      defaultValue: 'required',
      description: 'Ordered list of key labels to display as sculpted crystal <kbd> caps.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      defaultValue: "'md'",
      description: 'Keycap and joiner size scale.',
    },
    {
      name: 'joiner',
      type: 'string',
      defaultValue: "'+'",
      description: 'Muted separator placed between adjacent keycaps; pass an empty string to omit.',
    },
    {
      name: 'description',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional human-readable shortcut description included in aria-label and title.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and optical style overrides.',
    },
  ],
  examples: [
    `<KeycapBadge keys={['⌘', 'K']} description="Open command palette" />`,
    `<KeycapBadge keys={['Ctrl', 'Shift', 'P']} size="sm" joiner="+" />`,
    `<KeycapBadge keys={['g', 'i']} size="lg" joiner="then" description="Go to inbox" />`,
  ],
};
