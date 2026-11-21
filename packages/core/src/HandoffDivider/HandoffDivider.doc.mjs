export const docs = {
  name: 'HandoffDivider',
  displayName: 'Handoff Divider',
  group: 'Multi-Agent & Orchestration',
  category: 'multi-agent',
  keywords: [
    'handoff',
    'divider',
    'delegation',
    'multi-agent',
    'orchestration',
    'swarm',
    'artifacts',
    'payload',
    'transition',
    'stream',
  ],
  usage: {
    description:
      'Optical-glass stream handoff divider marking delegation boundaries between specialized agents, featuring horizontal hairline rules flanking a centered prism-crystal delegation badge, optional timestamp, summary caption, clickable semantic artifact pills, and a collapsible recessed prism-well payload inspector.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Insert HandoffDivider directly inside multi-agent message timelines whenever execution responsibility shifts from an orchestrator or planner to a specialist worker.',
      },
      {
        guidance: true,
        description:
          'Keep defaultExpanded={false} for verbose JSON or markdown handoff payloads so transcripts remain scannable while allowing operators to inspect the full literal context on demand.',
      },
      {
        guidance: false,
        description:
          'Pre-escape HTML in summary or payload strings; HandoffDivider renders all handoff metadata and payload code strictly as literal React text.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Delegation Landmark & Decorative Hairlines',
        criterion: '1.3.1 Info and Relationships & 1.1.1 Non-text Content',
        requirement: 'role="region" with descriptive aria-label and aria-hidden decorative hairline dividers and icons',
        description:
          'Announces the source-to-target delegation boundary to assistive technologies while hiding purely decorative hairline rules and directional arrows.',
      },
      {
        name: 'Collapsible Payload Disclosure & Keyboard Focus',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement: 'Native button trigger with aria-expanded and aria-controls linked to the recessed payload well',
        description:
          'Provides keyboard-accessible artifact pills and an Inspect Payload / Hide Payload disclosure control styled with keyboard-only prism-focus-ring.',
      },
    ],
  },
  props: [
    {
      name: 'fromAgent',
      type: 'string',
      defaultValue: 'required',
      description: 'Name of the originating agent delegating the task.',
    },
    {
      name: 'toAgent',
      type: 'string',
      defaultValue: 'required',
      description: 'Name of the receiving agent assuming execution ownership.',
    },
    {
      name: 'summary',
      type: 'string',
      defaultValue: 'required',
      description: 'Concise caption describing the handoff scope or delegation objective.',
    },
    {
      name: 'timestamp',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional formatted timestamp rendered beside the delegation target.',
    },
    {
      name: 'artifacts',
      type: 'HandoffArtifact[]',
      defaultValue: 'undefined',
      description: 'Optional transferred artifacts rendered as clickable prism-crystal pills with kind icons.',
    },
    {
      name: 'payload',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional literal handoff payload revealed inside a collapsible recessed prism-well.',
    },
    {
      name: 'defaultExpanded',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Whether the payload inspector well starts expanded when payload is provided.',
    },
    {
      name: 'onArtifactClick',
      type: '(artifact: HandoffArtifact) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the clicked HandoffArtifact when an artifact pill is activated.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<HandoffDivider\n  fromAgent="Planner"\n  toAgent="CodeReviewer"\n  timestamp="14:32:08 UTC"\n  summary="Transferred implementation diff and test matrix for security and coverage verification."\n  artifacts={[\n    { id: 'plan-1', label: 'release-plan.md', kind: 'plan' },\n    { id: 'diff-1', label: 'HandoffDivider.tsx', kind: 'file' },\n    { id: 'sum-1', label: 'executive-summary.txt', kind: 'summary' },\n    { id: 'data-1', label: 'coverage-metrics.json', kind: 'data' },\n  ]}\n  payload={'{\\n  "targetCoverage": 96,\\n  "strictLint": true\\n}'}\n  onArtifactClick={(artifact) => console.warn(artifact.id)}\n/>`,
  ],
};
