export const docs = {
  name: 'ThinkingAccordion',
  displayName: 'Thinking Accordion (Reasoning Trace)',
  group: 'AI & Conversational Interfaces',
  category: 'ai-conversational',
  keywords: [
    'thinking',
    'reasoning',
    'chain-of-thought',
    'trace',
    'ai',
    'assistant',
    'accordion',
    'streaming',
    'steps',
  ],
  usage: {
    description:
      'Collapsible optical-glass reasoning trace panel for AI assistants that displays live streaming status, tabular step completion progress, optional elapsed duration, and an ordered recessed well of reasoning steps with status icons, monospace tool badges, per-step millisecond timings, and literal trace details.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep defaultOpen={false} for completed assistant replies so users can scan the final answer first and expand the reasoning trace on demand.',
      },
      {
        guidance: true,
        description:
          'Provide concise step titles paired with monospace toolName identifiers and durationMs timings so engineers can audit multi-tool latency at a glance.',
      },
      {
        guidance: false,
        description:
          'Place raw unsanitized HTML inside step details; ThinkingAccordion renders all step text strictly as literal copy.',
      },
    ],
    accessibility: [
      {
        name: 'Disclosure Trigger & Region Linkage',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Native button trigger with aria-expanded, aria-controls, and labelled region panel',
        description:
          'The collapsible slab header is a native button exposing aria-expanded and aria-controls pointing to the expanded role="region" trace container.',
      },
      {
        name: 'Live Streaming Status & Step Semantics',
        criterion: '4.1.3 Status Messages & 1.3.1 Info and Relationships',
        requirement: 'role="status" aria-live="polite" pill and screen-reader status labels per ordered step',
        description:
          'Announces active reasoning via a polite live pill when isStreaming is true and pairs every visual status icon with screen-reader text inside an ordered list.',
      },
    ],
  },
  props: [
    {
      name: 'steps',
      type: 'ReadonlyArray<ThinkingStep>',
      defaultValue: 'required',
      description: 'Ordered reasoning steps displayed inside the recessed optical well when expanded.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Reasoning trace'",
      description: 'Label displayed in the collapsible optical slab header trigger.',
    },
    {
      name: 'isStreaming',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Displays a live "Thinking..." emerald pill and pulses the header sparkles icon.',
    },
    {
      name: 'durationLabel',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional pre-formatted total duration readout rendered next to the step counter.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled expansion state of the reasoning trace body.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial expansion state when used in uncontrolled mode.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the reasoning trace opens or collapses.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ThinkingAccordion\n  title="Reasoning trace"\n  durationLabel="1.4s"\n  steps={[\n    {\n      id: 's1',\n      title: 'Retrieve optical token contract',\n      toolName: 'search_docs',\n      durationMs: 180,\n      status: 'done',\n      detail: 'Matched ADR-0003 semantic --prism-* token definitions.',\n    },\n    {\n      id: 's2',\n      title: 'Synthesize response with citations',\n      status: 'active',\n    },\n  ]}\n  isStreaming\n/>`,
  ],
};
