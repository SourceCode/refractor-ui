export const docs = {
  name: 'CommentThread',
  displayName: 'Comment Thread (Nested Discussions & @Mentions)',
  group: 'Collaboration & Guidance',
  category: 'collaboration-guidance',
  keywords: ['comments', 'thread', 'discussion', 'replies', 'mentions', 'reactions', 'resolve'],
  usage: {
    description:
      'Optical glass nested discussion thread featuring clamped multi-level replies with hairline vertical indent rails, XSS-safe @mention token highlighting, live keyboard-accessible @mention autocomplete, sanitized author avatars with crystal initials fallback, tabular emoji reaction toggles, and root thread resolution.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep maxDepth between 2 and 4 so nested replies remain readable on narrow glass viewports without excessive horizontal indentation.',
      },
      {
        guidance: true,
        description:
          'Provide mentionUsers with stable unique IDs and concise handles so collaborators can trigger @mention suggestions via keyboard or pointer.',
      },
      {
        guidance: false,
        description:
          'Embed raw HTML inside comment bodies; CommentThread renders all body text literally and highlights @handles safely as React elements.',
      },
    ],
    accessibility: [
      {
        name: 'IME-Safe @Mention Autocomplete Listbox',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'role="listbox", role="option", aria-selected, ArrowDown/ArrowUp/Enter/Escape guarded by !isComposing',
        description:
          'Composers expose live @mention suggestions with keyboard navigation and IME-safe Enter commits while preserving screen-reader status announcements.',
      },
      {
        name: 'Sanitized Avatars & Reaction State Semantics',
        criterion: '1.1.1 Non-text Content & 4.1.2 Name, Role, Value',
        requirement: 'aria-pressed on reaction pills, sanitized avatar URLs with role="img" initials fallback',
        description:
          'Reaction buttons communicate toggle state via aria-pressed and tabular counts; author portraits validate protocols via sanitizeUrl and fall back gracefully to accessible crystal initials.',
      },
    ],
  },
  props: [
    {
      name: 'comments',
      type: 'readonly CommentItem[]',
      defaultValue: 'undefined',
      description: 'Controlled hierarchical list of comments and nested replies.',
    },
    {
      name: 'defaultComments',
      type: 'readonly CommentItem[]',
      defaultValue: 'undefined',
      description: 'Initial comments when operating in uncontrolled mode.',
    },
    {
      name: 'onCommentsChange',
      type: '(next: CommentItem[]) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever comments, replies, reactions, or resolved state mutate.',
    },
    {
      name: 'currentUser',
      type: 'CommentAuthor',
      defaultValue: "{ id: 'current-user', name: 'You' }",
      description: 'Author metadata attributed to newly posted comments and replies.',
    },
    {
      name: 'mentionUsers',
      type: 'readonly MentionUser[]',
      defaultValue: '[]',
      description: 'Teammates offered in the live @mention autocomplete dropdown.',
    },
    {
      name: 'availableReactions',
      type: 'readonly string[]',
      defaultValue: "['👍', '✨', '🚀', '👀']",
      description: 'Quick-add emoji reactions displayed on every comment.',
    },
    {
      name: 'onAddComment',
      type: '(body: string, parentId?: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when a root comment or reply is submitted.',
    },
    {
      name: 'onToggleReaction',
      type: '(commentId: string, emoji: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when a comment reaction pill or quick-add emoji is toggled.',
    },
    {
      name: 'onToggleResolve',
      type: '(commentId: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when a root comment thread is resolved or reopened.',
    },
    {
      name: 'maxDepth',
      type: 'number',
      defaultValue: '3',
      description: 'Maximum reply nesting depth (clamped to 1..6 via clampNumber).',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "'Add a comment... Use @ to mention teammates'",
      description: 'Placeholder text for the root comment composer.',
    },
    {
      name: 'readOnly',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables composers, inline replies, reactions, and thread resolution controls.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Discussion Thread'",
      description: 'Header heading rendered at the top of the discussion panel.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<CommentThread\n  title="Optical Spec Review"\n  currentUser={{ id: 'u-me', name: 'Jordan Lee', role: 'Design Lead' }}\n  mentionUsers={[\n    { id: 'u1', handle: 'alex', name: 'Alex Rivera', role: 'Staff Engineer' },\n    { id: 'u2', handle: 'maya', name: 'Maya Chen', role: 'Accessibility' },\n  ]}\n  defaultComments={[\n    {\n      id: 'c1',\n      author: { id: 'u1', name: 'Alex Rivera', role: 'Staff Engineer' },\n      body: 'Looks crisp! @maya can you confirm the focus-visible contrast on obsidian?',\n      timestamp: '5m ago',\n      reactions: [{ emoji: '✨', count: 2, reacted: true }],\n    },\n  ]}\n/>`,
  ],
};
