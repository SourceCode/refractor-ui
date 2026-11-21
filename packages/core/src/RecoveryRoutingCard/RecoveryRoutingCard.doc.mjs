export const docs = {
  name: 'RecoveryRoutingCard',
  displayName: 'Recovery Routing Card',
  group: 'AI Agent Execution & Control',
  category: 'ai-agent-control',
  keywords: [
    'recovery',
    'error',
    'retry',
    'fallback',
    'routing',
    'agent',
    'diagnostic',
    'stack-trace',
    'alert',
    'skip',
  ],
  usage: {
    description:
      'Optical-glass diagnostic failure alert card accented with --prism-rose-* tokens that communicates agent or tool execution errors, reveals optional literal stack traces inside a collapsible recessed prism-well, and guides operators through structured recovery routes (retry, edit parameters, switch strategy/model, or skip step).',
    bestPractices: [
      {
        guidance: true,
        description:
          'Mark the single highest-probability recovery path with primary: true so operators have one clear refractive CTA alongside secondary fallback routes.',
      },
      {
        guidance: true,
        description:
          'Include a concise machine-readable errorCode and collapsible stackTrace so engineers can inspect failure diagnostics without overwhelming non-technical users by default.',
      },
      {
        guidance: false,
        description:
          'Pre-escape HTML inside stackTrace or errorMessage; RecoveryRoutingCard renders diagnostic output strictly as literal React text inside <pre><code>.',
      },
    ],
    accessibility: [
      {
        name: 'Immediate Failure Alert Landmark',
        criterion: '4.1.3 Status Messages',
        requirement: 'role="alert" container with aria-hidden diagnostic icon and explicit text copy',
        description:
          'Exposes the failure card as an assertive alert landmark with clear heading, optional error code, and human-readable message rather than relying solely on rose color styling.',
      },
      {
        name: 'Collapsible Trace Disclosure & Actionable Route Group',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement: 'aria-expanded / aria-controls trace toggle and native buttons with disabled guards',
        description:
          'Links the Show trace / Hide trace toggle button to the trace panel via aria-controls and renders every recovery route as a keyboard-accessible button with prism-focus-ring.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: 'required',
      description: 'Headline communicating the failed operation or tool call.',
    },
    {
      name: 'errorMessage',
      type: 'string',
      defaultValue: 'required',
      description: 'Detailed human-readable explanation of the failure.',
    },
    {
      name: 'errorCode',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional monospace error identifier rendered as a rose-accented pill.',
    },
    {
      name: 'stackTrace',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional literal stack trace revealed when the operator clicks Show trace.',
    },
    {
      name: 'routes',
      type: 'RecoveryRouteAction[]',
      defaultValue: 'required',
      description: 'Ordered list of recovery route actions with optional semantic kind icons and descriptions.',
    },
    {
      name: 'onSelectRoute',
      type: '(route: RecoveryRouteAction) => void',
      defaultValue: 'undefined',
      description: 'Shared handler invoked with the chosen route whenever an enabled action is activated.',
    },
    {
      name: 'defaultShowTrace',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Whether the stack trace well starts expanded when stackTrace is provided.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<RecoveryRoutingCard\n  title="Sandbox test execution timed out"\n  errorCode="ERR_SANDBOX_TIMEOUT"\n  errorMessage="Vitest worker exceeded the 30s execution budget during coverage instrumentation."\n  stackTrace="Error: Worker timeout after 30000ms\\n    at runSuite (runner.ts:142:11)"\n  routes={[\n    { id: 'retry', label: 'Retry with 60s timeout', description: 'Re-run failed suite with extended limit', kind: 'retry', primary: true },\n    { id: 'edit', label: 'Edit test flags', description: 'Adjust worker concurrency or filters', kind: 'edit' },\n    { id: 'switch', label: 'Switch to local runner', kind: 'switch' },\n    { id: 'skip', label: 'Skip verification step', kind: 'skip' },\n  ]}\n  onSelectRoute={(route) => console.warn(route.id)}\n/>`,
  ],
};
