export const docs = {
  name: 'AgentPlanList',
  displayName: 'Agent Plan List',
  group: 'AI Agent Execution & Control',
  category: 'ai-agent-control',
  keywords: [
    'agent',
    'plan',
    'steps',
    'checklist',
    'execution',
    'workflow',
    'progress',
    'control',
    'ai',
    'tasks',
  ],
  usage: {
    description:
      'Interactive optical-glass execution plan card for AI agents displaying a tabular completion counter, optical progress bar, semantic status iconography across five execution states (pending, active, done, skipped, failed), step selection callbacks, and optional editable controls for toggling, removing, and adding steps with IME-safe keyboard entry.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide onSelectStep so users can inspect tool traces, diffs, or reasoning details associated with any individual plan step.',
      },
      {
        guidance: true,
        description:
          'Set editable={false} when presenting finalized audit trails or read-only historical agent runs.',
      },
      {
        guidance: false,
        description:
          'Inject raw HTML strings inside step titles or details; AgentPlanList renders all step copy strictly as literal text.',
      },
    ],
    accessibility: [
      {
        name: 'Progress Semantics & Region Landmark',
        criterion: '4.1.2 Name, Role, Value & 1.3.1 Info and Relationships',
        requirement: 'role="region" linked to heading and role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax, and aria-valuetext',
        description:
          'Exposes the plan as a named region landmark and communicates exact completion progress numerically and semantically through the optical progress bar.',
      },
      {
        name: 'IME-Safe Inline Step Entry & Keyboard Controls',
        criterion: '2.1.1 Keyboard',
        requirement: 'IME-guarded Enter key submission, aria-pressed status toggles, explicit remove labels, and keyboard-only focus rings',
        description:
          'Prevents premature step creation during CJK/IME composition, announces toggle states via aria-pressed, and provides descriptive aria-label text on remove controls.',
      },
    ],
  },
  props: [
    {
      name: 'steps',
      type: 'AgentPlanStep[]',
      defaultValue: 'undefined',
      description: 'Controlled array of execution plan steps.',
    },
    {
      name: 'defaultSteps',
      type: 'AgentPlanStep[]',
      defaultValue: '[]',
      description: 'Initial execution plan steps when used in uncontrolled mode.',
    },
    {
      name: 'onStepsChange',
      type: '(steps: AgentPlanStep[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever a step is toggled, removed, or added.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Execution Plan'",
      description: 'Heading displayed in the optical slab header.',
    },
    {
      name: 'editable',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Enables status toggling, step removal, and the inline Add step input.',
    },
    {
      name: 'onSelectStep',
      type: '(step: AgentPlanStep) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when a step title or detail area is activated.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<AgentPlanList\n  title="Release Verification Plan"\n  defaultSteps={[\n    { id: '1', title: 'Audit token contract', status: 'done', detail: 'Verified zero raw color literals.' },\n    { id: '2', title: 'Run Vitest coverage gate', status: 'active' },\n    { id: '3', title: 'Publish package artifacts', status: 'pending' },\n  ]}\n  onSelectStep={(step) => {\n    void step;\n  }}\n/>`,
  ],
};
