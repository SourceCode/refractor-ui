export const docs = {
  name: 'WorkspaceStatusBar',
  displayName: 'Workspace Status Bar',
  group: 'Desktop OS & Windowing Metaphors',
  category: 'desktop-os-windowing',
  keywords: [
    'workspace',
    'status-bar',
    'ide',
    'telemetry',
    'git',
    'branch',
    'diagnostics',
    'cursor',
    'encoding',
    'language',
    'progressbar',
    'desktop-os',
  ],
  usage: {
    description:
      'Slim bottom-edge optical-glass IDE telemetry strip built on a prism-slab shell with tactile clickable segments for Git branch, --prism-* token-colored sync state, error/warning diagnostics, optional background task progressbar, cursor line/column coordinates, file encoding, language mode, and extensible left/right custom segments.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Wire onSelectSegment to open contextual pickers or panels (for example branch switcher for "branch", Problems drawer for "diagnostics", Go to Line for "cursor", or encoding/language selectors).',
      },
      {
        guidance: true,
        description:
          'Use backgroundTaskLabel together with backgroundTaskProgressPct (0..100) for long-running indexers, typecheckers, or builds so users see live inline progress without modal interruption.',
      },
      {
        guidance: false,
        description:
          'Overload extraItems with verbose prose or raw color strings; keep custom telemetry segments concise and select semantic StatusBarTone values so every theme cascades cleanly.',
      },
    ],
    accessibility: [
      {
        name: 'Status Landmark & Keyboard-Accessible Segments',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Root role="status" with aria-label; interactive segments rendered as native <button type="button"> elements with keyboard-only prism-focus-ring and descriptive aria-labels',
        description:
          'Screen readers announce workspace telemetry updates politely while keyboard users can tab across and activate branch, sync, diagnostics, task, cursor, encoding, language, and custom interactive controls.',
      },
      {
        name: 'Inline Background Progressbar Semantics',
        criterion: '4.1.2 Name, Role, Value & 1.4.1 Use of Color',
        requirement:
          'Compact progressbar exposes role="progressbar", aria-valuemin={0}, aria-valuemax={100}, aria-valuenow, aria-valuetext, and visible percentage text alongside semantic --prism-* shading',
        description:
          'Ensures background indexing or compilation progress is conveyed numerically and programmatically rather than solely via visual bar width or color.',
      },
    ],
  },
  props: [
    {
      name: 'branch',
      type: 'string',
      defaultValue: "'main'",
      description:
        'Active Git branch label displayed in the left prism-crystal branch pill.',
    },
    {
      name: 'syncState',
      type: "'synced' | 'syncing' | 'dirty' | 'offline'",
      defaultValue: "'synced'",
      description:
        'Repository sync state controlling the sync icon, label, and semantic --prism-* token color.',
    },
    {
      name: 'errorsCount',
      type: 'number',
      defaultValue: '0',
      description:
        'Number of active diagnostic errors clamped to non-negative integers.',
    },
    {
      name: 'warningsCount',
      type: 'number',
      defaultValue: '2',
      description:
        'Number of active diagnostic warnings clamped to non-negative integers.',
    },
    {
      name: 'cursorLine',
      type: 'number',
      defaultValue: '142',
      description:
        'Current editor line coordinate clamped to integers >= 1.',
    },
    {
      name: 'cursorColumn',
      type: 'number',
      defaultValue: '28',
      description:
        'Current editor column coordinate clamped to integers >= 1.',
    },
    {
      name: 'encoding',
      type: 'string',
      defaultValue: "'UTF-8'",
      description: 'Active file character encoding label.',
    },
    {
      name: 'language',
      type: 'string',
      defaultValue: "'TypeScript React'",
      description: 'Active editor language mode label.',
    },
    {
      name: 'backgroundTaskLabel',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Optional label for a running background job (for example "Indexing 238 symbols").',
    },
    {
      name: 'backgroundTaskProgressPct',
      type: 'number',
      defaultValue: 'undefined',
      description:
        'Optional completion percentage (0..100) rendered as a compact inline role="progressbar" with numeric readout.',
    },
    {
      name: 'extraItems',
      type: 'ReadonlyArray<WorkspaceStatusItem>',
      defaultValue: 'undefined',
      description:
        'Custom extensible segments ({ id, label, value?, align?, tone?, tooltip?, interactive? }) placed in the left or right zone.',
    },
    {
      name: 'onSelectSegment',
      type: '(segmentId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the segment identifier ("branch", "sync", "diagnostics", "background-task", "cursor", "encoding", "language", or custom item id) when an interactive segment is clicked.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<WorkspaceStatusBar\n  branch="feat/optical-prism"\n  syncState="syncing"\n  errorsCount={0}\n  warningsCount={2}\n  backgroundTaskLabel="Indexing 238 symbols"\n  backgroundTaskProgressPct={68}\n  onSelectSegment={(segmentId) => console.warn('Selected segment:', segmentId)}\n/>`,
    `<WorkspaceStatusBar\n  branch="main"\n  syncState="synced"\n  cursorLine={84}\n  cursorColumn={12}\n  encoding="UTF-8"\n  language="TypeScript React"\n  extraItems={[\n    { id: 'env', label: 'Node', value: 'v22.11', align: 'left', tone: 'emerald', tooltip: 'Active runtime' },\n    { id: 'formatter', label: 'Prettier', tone: 'info', tooltip: 'Formatter ready' },\n    { id: 'eol', label: 'LF', tone: 'neutral', interactive: false },\n  ]}\n/>`,
  ],
};

export default docs;
