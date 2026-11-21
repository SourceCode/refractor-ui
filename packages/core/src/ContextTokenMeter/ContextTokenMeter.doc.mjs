export const docs = {
  name: 'ContextTokenMeter',
  displayName: 'Context Token Meter',
  group: 'AI Context, Memory & Configuration',
  category: 'ai-context-memory',
  keywords: [
    'context',
    'token',
    'meter',
    'window',
    'usage',
    'budget',
    'telemetry',
    'radial',
    'bar',
    'ai',
    'llm',
    'prompt',
  ],
  usage: {
    description:
      'Optical-glass context window utilization meter that renders contiguous --prism-* semantic token segments (system, files, tools, history) as either a recessed segmented progress bar or a token-styled optical SVG radial ring, complete with warning/critical health pills, sanitized finite math, and segment legend pills.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide accurate per-category segments (system, files, tools, history) alongside the model context limit so users can see which category is dominating the budget.',
      },
      {
        guidance: true,
        description:
          'Use variant="bar" above prompt composers and chat headers, and variant="radial" inside compact sidebars or telemetry dashboards.',
      },
      {
        guidance: false,
        description:
          'Hardcode warning or critical thresholds above 100% or pass unvalidated division denominators; ContextTokenMeter automatically clamps thresholds and sanitizes non-finite counts.',
      },
    ],
    accessibility: [
      {
        name: 'Progressbar Semantics Across Both Variants',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'role="progressbar" with aria-labelledby, aria-valuenow (0–100), aria-valuemin, aria-valuemax, and aria-valuetext',
        description:
          'Both bar and radial variants expose the exact utilization percentage and formatted token summary to assistive technologies while hiding decorative SVG geometry via aria-hidden="true".',
      },
      {
        name: 'Live Health Threshold Announcements',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement: 'role="status" aria-live="polite" pill with AlertTriangle icon and Warning/Critical text label',
        description:
          'Surfaces threshold breaches using icon + text badges rather than color alone and announces status transitions politely.',
      },
    ],
  },
  props: [
    {
      name: 'segments',
      type: 'ContextTokenSegment[]',
      defaultValue: 'required',
      description: 'Array of categorized token segments ({ kind, label, tokens }) across system, files, tools, and history.',
    },
    {
      name: 'maxTokens',
      type: 'number',
      defaultValue: 'required',
      description: 'Maximum model context window capacity in tokens (sanitized to finite integer >= 1).',
    },
    {
      name: 'variant',
      type: "'bar' | 'radial'",
      defaultValue: "'bar'",
      description: 'Switches between the contiguous recessed progress bar and the 80x80 optical SVG radial gauge.',
    },
    {
      name: 'warningThreshold',
      type: 'number',
      defaultValue: '0.75',
      description: 'Utilization ratio clamped to [0.1, 0.95] at which the Warning health pill appears.',
    },
    {
      name: 'criticalThreshold',
      type: 'number',
      defaultValue: '0.9',
      description: 'Utilization ratio clamped to [warningThreshold, 1] at which the Critical health pill appears.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Context Window'",
      description: 'Visible heading label linked to the progressbar via aria-labelledby.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<ContextTokenMeter\n  maxTokens={128000}\n  segments={[\n    { kind: 'system', label: 'System Prompt', tokens: 6400 },\n    { kind: 'files', label: 'Workspace Files', tokens: 42800 },\n    { kind: 'tools', label: 'Tool Schemas', tokens: 12000 },\n    { kind: 'history', label: 'Chat History', tokens: 24500 },\n  ]}\n/>`,
    `<ContextTokenMeter\n  variant="radial"\n  title="Session Token Budget"\n  maxTokens={100000}\n  warningThreshold={0.75}\n  criticalThreshold={0.9}\n  segments={[\n    { kind: 'system', label: 'System', tokens: 12000 },\n    { kind: 'files', label: 'Files', tokens: 68000 },\n    { kind: 'history', label: 'History', tokens: 14000 },\n  ]}\n/>`,
  ],
};
