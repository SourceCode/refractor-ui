export const docs = {
  name: 'ToolCallCard',
  displayName: 'Tool Call Card',
  group: 'AI Agent Execution & Control',
  category: 'ai-agent-control',
  keywords: [
    'tool',
    'call',
    'function',
    'invocation',
    'agent',
    'trace',
    'inputs',
    'outputs',
    'error',
    'collapsible',
  ],
  usage: {
    description:
      'Collapsible optical-glass card representing a single AI agent tool invocation, displaying a semantic category icon, monospace tool identifier, optional one-line summary, live status pill (running, success, error), tabular duration readout, and expandable recessed prism-well inspectors for structured inputs, outputs, and error alerts.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep defaultExpanded={false} for succeeded tool calls in long transcripts and expand error cards via defaultExpanded={status === "error"} so failures surface immediately.',
      },
      {
        guidance: true,
        description:
          'Provide a concise summary alongside toolName so users can understand what the call did without expanding every payload well.',
      },
      {
        guidance: false,
        description:
          'Include raw unredacted secrets or unsanitized HTML inside inputs or outputs; redact sensitive values before passing ToolCallField pairs.',
      },
    ],
    accessibility: [
      {
        name: 'Collapsible Disclosure Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Native button trigger with aria-expanded and aria-controls linked to role="region"',
        description:
          'Links the collapsible header button to the expanded payload region via aria-controls and aria-labelledby with keyboard-only focus rings.',
      },
      {
        name: 'Error Alert Announcement & Screen-Reader Category Labels',
        criterion: '4.1.3 Status Messages & 1.1.1 Non-text Content',
        requirement: 'role="alert" for errorMessage and sr-only labels paired with decorative category icons',
        description:
          'Announces tool failure diagnostics inside a semantic alert container while hiding decorative icons from assistive technologies.',
      },
    ],
  },
  props: [
    {
      name: 'toolName',
      type: 'string',
      defaultValue: 'required',
      description: 'Monospace name of the tool or function executed by the agent.',
    },
    {
      name: 'category',
      type: "'search' | 'terminal' | 'file' | 'database' | 'api' | 'browser'",
      defaultValue: "'api'",
      description: 'Category determining the optical header icon and token accent.',
    },
    {
      name: 'status',
      type: "'running' | 'success' | 'error'",
      defaultValue: 'required',
      description: 'Execution lifecycle state rendered in the semantic status pill.',
    },
    {
      name: 'durationMs',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Elapsed call duration in milliseconds; omitted when negative or non-finite.',
    },
    {
      name: 'summary',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional concise description displayed beneath the monospace toolName.',
    },
    {
      name: 'inputs',
      type: 'ToolCallField[]',
      defaultValue: 'undefined',
      description: 'Key/value input parameters shown inside a recessed prism-well block when expanded.',
    },
    {
      name: 'outputs',
      type: 'ToolCallField[]',
      defaultValue: 'undefined',
      description: 'Key/value output results shown inside a recessed prism-well block when expanded.',
    },
    {
      name: 'errorMessage',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Error diagnostic text rendered inside a semantic role="alert" well when expanded.',
    },
    {
      name: 'defaultExpanded',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial expansion state when used in uncontrolled mode.',
    },
    {
      name: 'expanded',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled expansion state of the payload inspector.',
    },
    {
      name: 'onExpandedChange',
      type: '(expanded: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the card expands or collapses.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ToolCallCard\n  toolName="search_codebase"\n  category="search"\n  status="success"\n  durationMs={142}\n  summary="Matched 4 optical surface tokens"\n  inputs={[{ key: 'query', value: 'prism-slab' }]}\n  outputs={[{ key: 'matches', value: '4 files' }]}\n/>`,
    `<ToolCallCard\n  toolName="run_migrations"\n  category="database"\n  status="error"\n  durationMs={1840}\n  errorMessage="Connection refused on port 5432"\n  defaultExpanded\n/>`,
  ],
};
