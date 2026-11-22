export const docs = {
  name: 'AvatarStack',
  displayName: 'Avatar Stack',
  group: 'Foundational Primitives & Micro-Utilities',
  category: 'foundational-micro-utilities',
  keywords: [
    'avatar',
    'avatar-stack',
    'facepile',
    'collaborators',
    'team',
    'presence',
    'overflow',
    'popover',
    'users',
    'micro-utility',
  ],
  usage: {
    description:
      'Compact horizontal overlapping optical-glass avatar cluster with sanitized portrait rendering, semantic --prism-* tinted uppercase initials fallback, optional live presence dots, hover/focus z-index elevation, and an interactive +N optical counter pill that opens a viewport-clamped prism-slab directory listing all collaborators with overflow members highlighted.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide a descriptive label prop (such as "Reviewers" or "Active editors") so both the avatar group landmark and the full-directory popover announce meaningful workspace context.',
      },
      {
        guidance: true,
        description:
          'Keep maxVisible between 3 and 6 in dense headers and toolbars so the +N counter pill stays compact while the prism-slab directory remains one click or keypress away.',
      },
      {
        guidance: false,
        description:
          'Pass unsanitized javascript:, vbscript:, or SVG data URIs to user.src expecting execution; AvatarStack sanitizes every portrait URL via sanitizeUrl and automatically falls back to semantic tinted initials.',
      },
    ],
    accessibility: [
      {
        name: 'Accessible Group, Dialog Disclosure & Focus Restoration',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="group" with aria-label on the stack and aria-expanded, aria-haspopup="dialog", aria-controls, and aria-label="Show N more users" on the +N trigger',
        description:
          'Supports IME-safe Enter and Space activation on avatars and the +N trigger, keyboard-only :focus-visible outlines with z-index elevation, and clean Escape, outside-click, or Close button dismissal with focus return.',
      },
      {
        name: 'Semantic Status Empty State & Safe Image Alternatives',
        criterion: '1.1.1 Non-text Content & 4.1.3 Status Messages',
        requirement:
          'Renders a role="status" empty pill when users=[] and pairs every avatar button with name + presence status labels',
        description:
          'Ensures screen readers announce collaborator presence states clearly and fall back gracefully to uppercase initials when portraits omit src or fail to load.',
      },
    ],
  },
  props: [
    {
      name: 'users',
      type: 'ReadonlyArray<AvatarStackUser>',
      defaultValue: '7 default product team members',
      description:
        'List of collaborators to display. Defaults to 7 product team members when omitted; renders a role="status" empty state when passed [].',
    },
    {
      name: 'maxVisible',
      type: 'number',
      defaultValue: '4',
      description:
        'Maximum avatars shown directly in the cluster before collapsing into the +N pill (clamped 1..12).',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      defaultValue: "'md'",
      description: 'Sizing scale for cluster avatars, presence indicators, and the +N counter pill.',
    },
    {
      name: 'onSelectUser',
      type: '(user: AvatarStackUser) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when a visible avatar or directory popover member is selected.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Active collaborators'",
      description: 'Accessible group label and directory popover heading.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<AvatarStack />`,
    `<AvatarStack\n  label="PR Reviewers"\n  maxVisible={3}\n  size="lg"\n  onSelectUser={(user) => console.warn(user.name)}\n/>`,
    `<AvatarStack users={[]} label="Online editors" />`,
  ],
};

export default docs;
