export const docs = {
  name: 'CheckpointRollbackStrip',
  displayName: 'Checkpoint & Rollback Strip',
  group: 'AI Agent Execution & Control',
  category: 'ai-agent-control',
  keywords: [
    'checkpoint',
    'rollback',
    'fork',
    'rewind',
    'snapshot',
    'turn',
    'agent',
    'history',
    'versioning',
    'timeline',
  ],
  usage: {
    description:
      'Horizontal scrollable optical-glass slab strip for inspecting AI agent turn checkpoints, displaying clamped file-change badges, --prism-primary-main active turn highlighting, timestamped snapshot summaries, and one-click Rollback and Fork Conversation recovery actions.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Record a concise label and summary for each milestone turn so operators can immediately compare candidate rollback points before restoring workspace state.',
      },
      {
        guidance: true,
        description:
          'Offer Fork Conversation alongside Rollback so developers can explore an alternate prompt trajectory without discarding the current branch.',
      },
      {
        guidance: false,
        description:
          'Pass negative or non-finite file counts without sanitization; CheckpointRollbackStrip clamps turn and filesChanged counts to non-negative integers.',
      },
    ],
    accessibility: [
      {
        name: 'Grouped Toggle Pills & Landmark Region',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement: 'role="region" container, role="group" pill track, and aria-pressed active state',
        description:
          'Exposes the checkpoint timeline as a named region with native toggle buttons reporting active selection via aria-pressed.',
      },
      {
        name: 'Keyboard Focus & Empty State Announcement',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement: 'prism-focus-ring on all pills and footer buttons plus role="status" empty fallback',
        description:
          'Provides keyboard-only focus rings across scrollable checkpoint pills and recovery actions, and announces empty checkpoint lists cleanly via role="status".',
      },
    ],
  },
  props: [
    {
      name: 'checkpoints',
      type: 'AgentCheckpoint[]',
      defaultValue: 'required',
      description: 'Ordered array of agent checkpoints displayed in the horizontal scrollable strip.',
    },
    {
      name: 'activeCheckpointId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled active checkpoint identifier.',
    },
    {
      name: 'defaultActiveCheckpointId',
      type: 'string',
      defaultValue: 'last checkpoint id or ""',
      description: 'Initial active checkpoint identifier in uncontrolled mode (defaults to the latest checkpoint).',
    },
    {
      name: 'onSelectCheckpoint',
      type: '(cp: AgentCheckpoint) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the selected AgentCheckpoint when a pill is clicked.',
    },
    {
      name: 'onRollback',
      type: '(cp: AgentCheckpoint) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the active AgentCheckpoint when Rollback is clicked.',
    },
    {
      name: 'onFork',
      type: '(cp: AgentCheckpoint) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the active AgentCheckpoint when Fork Conversation is clicked.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables checkpoint pill selection, Rollback, and Fork Conversation buttons.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<CheckpointRollbackStrip\n  checkpoints={[\n    { id: 'cp-1', label: 'Scaffold schema', turn: 1, timestamp: '14:18:04', filesChanged: 2, summary: 'Created initial Prisma schema and seed data.' },\n    { id: 'cp-2', label: 'Add API routes', turn: 2, timestamp: '14:21:19', filesChanged: 5, summary: 'Wired REST endpoints and validation tests.' },\n  ]}\n  onRollback={(cp) => console.warn('Rollback to', cp.id)}\n  onFork={(cp) => console.warn('Fork from', cp.id)}\n/>`,
  ],
};
