export const docs = {
  name: 'LivePresenceIndicator',
  displayName: 'Live Presence Indicator',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: [
    'presence',
    'collaborators',
    'avatar-stack',
    'multiplayer',
    'cursors',
    'live',
    'online',
    'editing',
  ],
  usage: {
    description:
      'Optical glass multiplayer presence bar featuring an overlapping prism-crystal avatar stack with live status indicators, sanitized portrait fallback initials, an interactive collaborator detail pill, a +N prism-slab overflow popover, live active/editing counters, and an optional studio-grid live cursor stage.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use LivePresenceIndicator in collaborative editors, canvases, and dashboards to communicate active participants without obstructing content.',
      },
      {
        guidance: true,
        description:
          'Set maxVisible between 3 and 5 in compact toolbars so remaining collaborators collapse cleanly into the keyboard-accessible +N overflow popover.',
      },
      {
        guidance: false,
        description:
          'Pass unsanitized javascript: avatar URLs or unvalidated CSS strings into user.color; both are sanitized automatically with safe fallbacks.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Collaborator Controls & Disclosure',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement: 'aria-pressed avatar buttons, aria-expanded +N overflow trigger, Escape dismissal',
        description:
          'Each collaborator avatar exposes name and status via aria-label with keyboard-only prism-focus-ring styling, while the overflow popover closes on Escape, outside click, or trigger re-click.',
      },
      {
        name: 'Live Status Announcements & Contrast Safety',
        criterion: '1.4.3 Contrast (Minimum) & 4.1.3 Status Messages',
        requirement: 'aria-live="polite" collaborator detail pill and WCAG contrast text selection on cursor labels',
        description:
          'Selecting a collaborator announces their role, status, and live activity in a polite status region, and live cursor label pills automatically choose high-contrast foreground ink.',
      },
    ],
  },
  props: [
    {
      name: 'users',
      type: 'readonly PresenceUser[]',
      defaultValue: 'required',
      description: 'Collaborators currently connected to the shared workspace (deduplicated by id).',
    },
    {
      name: 'maxVisible',
      type: 'number',
      defaultValue: '4',
      description: 'Maximum overlapping avatars shown before collapsing into a +N overflow trigger (clamped 1..12).',
    },
    {
      name: 'showCursors',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Displays a recessed prism-studio-grid stage plotting live collaborator SVG cursors.',
    },
    {
      name: 'showCountLabel',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Shows the live summary pill (active/idle count and editing badge).',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      defaultValue: "'md'",
      description: 'Scale of the crystal avatar rings, status dots, and overflow trigger.',
    },
    {
      name: 'onUserSelect',
      type: '(user: PresenceUser) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when a collaborator avatar or overflow list row is clicked.',
    },
    {
      name: 'cursorStageLabel',
      type: 'string',
      defaultValue: "'Live collaboration canvas'",
      description: 'Accessible region name and header label for the live cursor stage.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<LivePresenceIndicator\n  users={[\n    { id: '1', name: 'Clara Vance', role: 'Design Lead', status: 'editing', color: '#E75C24', activity: 'Tuning caustic shadows', cursor: { x: 28, y: 42 } },\n    { id: '2', name: 'Marcus Chen', role: 'Staff Engineer', status: 'online', color: '#0284C7', activity: 'Reviewing tokens', cursor: { x: 64, y: 58, label: 'Marcus · Tokens' } },\n    { id: '3', name: 'Elena Rostova', status: 'viewing' },\n  ]}\n  maxVisible={4}\n  showCursors\n  onUserSelect={handleSelectCollaborator}\n/>`,
  ],
};
