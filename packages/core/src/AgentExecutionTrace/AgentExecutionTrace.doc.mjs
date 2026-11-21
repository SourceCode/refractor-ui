export const docs = {
  name: 'AgentExecutionTrace',
  displayName: 'Agent Execution Trace',
  group: 'Multi-Agent & Orchestration',
  category: 'multi-agent',
  keywords: [
    'agent',
    'trace',
    'waterfall',
    'spans',
    'telemetry',
    'observability',
    'multi-agent',
    'orchestration',
    'tokens',
    'latency',
  ],
  usage: {
    description:
      'Optical-glass execution waterfall inspector for multi-agent runs featuring sanitized timeline horizon math, tabular total duration and token readouts, kind filter pills (All, LLM, Tool, Handoff, Retrieval), proportional offset/width optical bars inside recessed prism-well tracks, semantic status badges (ok, running, error), and a controllable recessed detail drawer.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Record span startMs relative to the root orchestration timestamp (0ms) so concurrent LLM, tool, retrieval, and handoff bars align proportionally on the shared horizon.',
      },
      {
        guidance: true,
        description:
          'Pair AgentExecutionTrace with AgentRosterRail to let operators filter and inspect spans emitted by each participating agent.',
      },
      {
        guidance: false,
        description:
          'Pass raw unredacted secrets or unsanitized HTML inside span detail strings; AgentExecutionTrace renders all span fields strictly as literal text.',
      },
    ],
    accessibility: [
      {
        name: 'Filter Toggle Group & Span Selection Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'role="group" with aria-pressed filter buttons and aria-pressed span rows linked to a named detail region',
        description:
          'Communicates active filter and selected span states to assistive technologies while keeping keyboard-only focus rings visible across every interactive row.',
      },
      {
        name: 'Numeric Stability & High-Contrast Semantic Indicators',
        criterion: '1.4.1 Use of Color & 1.3.1 Info and Relationships',
        requirement: 'Textual kind/status pills paired with iconography and tabular numeric readouts',
        description:
          'Pairs color-coded waterfall bars with explicit kind labels, status text pills, and monospace tabular durations so timing and error states never rely on color alone.',
      },
    ],
  },
  props: [
    {
      name: 'spans',
      type: 'TraceSpan[]',
      defaultValue: 'required',
      description: 'Array of execution trace spans rendered along the proportional waterfall timeline.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Execution Waterfall Trace'",
      description: 'Heading displayed in the optical slab header.',
    },
    {
      name: 'onSelectSpan',
      type: '(span: TraceSpan) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever a waterfall span row is selected.',
    },
    {
      name: 'selectedSpanId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled span ID highlighted and displayed in the recessed detail drawer.',
    },
    {
      name: 'defaultSelectedSpanId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Initial selected span ID when operating in uncontrolled mode.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<AgentExecutionTrace\n  title="Release Run #42"\n  defaultSelectedSpanId="s2"\n  spans={[\n    { id: 's1', agentName: 'Planner', label: 'Decompose tasks', kind: 'llm', status: 'ok', startMs: 0, durationMs: 420, tokens: 680 },\n    { id: 's2', agentName: 'Builder', label: 'Run unit tests', kind: 'tool', status: 'running', startMs: 420, durationMs: 850, detail: 'Executing Vitest coverage suite.' },\n    { id: 's3', agentName: 'Planner', label: 'Delegate audit', kind: 'handoff', status: 'ok', startMs: 380, durationMs: 60 },\n    { id: 's4', agentName: 'Retriever', label: 'Fetch ADR tokens', kind: 'retrieval', status: 'error', startMs: 120, durationMs: 240, detail: 'Timeout after 240ms.' },\n  ]}\n/>`,
  ],
};
