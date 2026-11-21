export const docs = {
  name: 'InlineDiffReviewer',
  displayName: 'Inline Diff Reviewer',
  group: 'AI Agent Execution & Control',
  category: 'ai-agent-control',
  keywords: [
    'diff',
    'hunk',
    'review',
    'patch',
    'agent',
    'approve',
    'accept',
    'reject',
    'code',
    'inline',
  ],
  usage: {
    description:
      'Optical-glass inline hunk reviewer for AI agent code edits featuring a prism-slab file header with monospace path, live reviewed counter pill, bulk Accept All / Reject All controls, per-hunk recessed prism-well diff tables with tabular old/new line numbers and semantic +/- gutters, and prototype-safe Map decision tracking.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide stable, unique hunk IDs and unified diff headers (e.g., "@@ -10,4 +10,6 @@") so human reviewers can audit and approve proposed edits hunk-by-hunk.',
      },
      {
        guidance: true,
        description:
          'Enable readOnly mode when displaying committed or historical agent patch audits where decisions can no longer be changed.',
      },
      {
        guidance: false,
        description:
          'Pre-escape HTML entities inside diff line content; InlineDiffReviewer renders every source line strictly as literal React text.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Hunk Regions & Diff Tables',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'Labelled hunk sections with structured thead/tbody diff tables and live progress status',
        description:
          'Each hunk is exposed as a labelled section with semantic table headers for old line, new line, change marker, and code content, while the header reviewed counter announces updates via role="status".',
      },
      {
        name: 'Keyboard-Only Focus & Pressed Decision State',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'Native buttons with prism-focus-ring and aria-pressed state reflection',
        description:
          'All bulk and per-hunk Accept/Reject actions are native buttons supporting keyboard navigation with visible :focus-visible outlines and aria-pressed decision state.',
      },
    ],
  },
  props: [
    {
      name: 'filePath',
      type: 'string',
      defaultValue: 'required',
      description: 'Monospace repository file path rendered in the card header.',
    },
    {
      name: 'hunks',
      type: 'DiffHunk[]',
      defaultValue: 'required',
      description: 'Ordered array of diff hunks containing headers, lines, and optional initial statuses.',
    },
    {
      name: 'onHunkDecision',
      type: "(hunkId: string, decision: 'accepted' | 'rejected') => void",
      defaultValue: 'undefined',
      description: 'Callback invoked whenever a reviewer accepts or rejects an individual hunk.',
    },
    {
      name: 'onAcceptAll',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the bulk Accept All action is pressed.',
    },
    {
      name: 'onRejectAll',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the bulk Reject All action is pressed.',
    },
    {
      name: 'readOnly',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Hides bulk and per-hunk Accept/Reject buttons for read-only diff inspection.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<InlineDiffReviewer\n  filePath="packages/core/src/theme/createPrismTheme.ts"\n  hunks={[\n    {\n      id: 'hunk-1',\n      header: '@@ -107,3 +107,4 @@',\n      lines: [\n        { kind: 'context', oldLine: 107, newLine: 107, content: 'const blurPx = clampNumber(options.optics?.blurPx ?? 18, 0, 48, 18);' },\n        { kind: 'remove', oldLine: 108, content: 'const causticOpacity = 1;' },\n        { kind: 'add', newLine: 108, content: 'const causticOpacity = clampNumber(options.optics?.causticOpacity ?? 1, 0, 2, 1);' },\n      ],\n    },\n  ]}\n  onHunkDecision={(id, decision) => console.warn(id, decision)}\n/>`,
  ],
};
