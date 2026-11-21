export const docs = {
  name: 'AgentRosterRail',
  displayName: 'Agent Roster Rail',
  group: 'Multi-Agent & Orchestration',
  category: 'multi-agent',
  keywords: [
    'agent',
    'roster',
    'rail',
    'multi-agent',
    'orchestration',
    'swarm',
    'team',
    'status',
    'selector',
    'delegation',
  ],
  usage: {
    description:
      'Optical-glass multi-agent roster strip displaying participating agents in a horizontal scrollable rail or vertical stack, with live active/total telemetry counts, initials orbs, semantic five-state status pills (idle, thinking, tool, waiting, done), optional current task summaries, controllable selection, and IME-safe roving keyboard navigation.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use orientation="horizontal" above chat or artifact canvases and orientation="vertical" inside sidebars or multi-pane orchestration consoles.',
      },
      {
        guidance: true,
        description:
          'Bind activeAgentId and onSelectAgent to synchronize the selected agent with an AgentExecutionTrace waterfall or transcript inspector.',
      },
      {
        guidance: false,
        description:
          'Inject raw HTML strings into agent names, roles, or currentTask values; AgentRosterRail renders all member fields strictly as literal text.',
      },
    ],
    accessibility: [
      {
        name: 'Named Region & Current Selection Semantics',
        criterion: '4.1.2 Name, Role, Value & 1.3.1 Info and Relationships',
        requirement: 'role="region" linked via aria-labelledby and aria-current="true" on the active agent button',
        description:
          'Identifies the roster as a landmark region and announces the currently inspected agent via aria-current without relying solely on border highlight color.',
      },
      {
        name: 'Axis-Aware IME-Safe Keyboard Navigation',
        criterion: '2.1.1 Keyboard',
        requirement: 'ArrowRight/ArrowLeft (horizontal), ArrowDown/ArrowUp (vertical), Home/End with isComposing guard and focus-visible rings',
        description:
          'Supports roving keyboard selection along the active rail axis while ignoring IME composition keystrokes and preserving keyboard-only focus indicators.',
      },
    ],
  },
  props: [
    {
      name: 'agents',
      type: 'AgentRosterMember[]',
      defaultValue: 'required',
      description: 'Ordered array of agent members displayed in the roster rail.',
    },
    {
      name: 'activeAgentId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled active agent ID highlighted with the primary optical ring.',
    },
    {
      name: 'defaultActiveAgentId',
      type: 'string',
      defaultValue: "agents[0]?.id ?? ''",
      description: 'Initial selected agent ID when operating in uncontrolled mode.',
    },
    {
      name: 'onSelectAgent',
      type: '(agent: AgentRosterMember) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when an agent card is activated by pointer or keyboard.',
    },
    {
      name: 'orientation',
      type: "'horizontal' | 'vertical'",
      defaultValue: "'horizontal'",
      description: 'Renders either a horizontal scrollable flex strip or a vertical stack.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Agent Roster'",
      description: 'Heading rendered in the optical slab header.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<AgentRosterRail\n  title="Orchestration Swarm"\n  agents={[\n    { id: 'planner', name: 'Lead Planner', role: 'Coordinator', status: 'thinking', currentTask: 'Drafting verification graph' },\n    { id: 'coder', name: 'Core Builder', role: 'Engineer', status: 'tool', currentTask: 'Running vitest suite' },\n    { id: 'reviewer', name: 'Audit Guard', role: 'Verifier', status: 'waiting' },\n  ]}\n  onSelectAgent={(agent) => {\n    void agent;\n  }}\n/>`,
    `<AgentRosterRail\n  orientation="vertical"\n  defaultActiveAgentId="qa"\n  agents={[\n    { id: 'arch', name: 'Architect', role: 'Design', status: 'done', avatarLabel: 'AR' },\n    { id: 'qa', name: 'Quality Lead', role: 'Testing', status: 'idle' },\n  ]}\n/>`,
  ],
};
