export const docs = {
  name: 'ProcessStatusPill',
  displayName: 'Process Status Pill',
  group: 'CLI & Terminal Surfaces',
  category: 'cli-terminal',
  keywords: [
    'process',
    'status',
    'pill',
    'cli',
    'terminal',
    'task',
    'build',
    'exit',
    'elapsed',
    'retry',
    'stop',
  ],
  usage: {
    description:
      'Compact inline prism-crystal process telemetry capsule displaying semantic lifecycle icons (running spinner, success, failed, cancelled), process label, tabular elapsed duration formatting (ms / s / m s), finite monospace exit code badge, and contextual Stop or Retry actions.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide onStop for long-running builds or test runners so operators can abort hung processes directly from the status bar.',
      },
      {
        guidance: true,
        description:
          'Pass exitCode alongside failed or cancelled statuses so developers immediately see non-zero termination codes such as exit 1 or exit 137.',
      },
      {
        guidance: false,
        description:
          'Rely solely on the status icon color without a clear label; always provide a concise descriptive process label.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Status Role & Decorative Icons',
        criterion: '4.1.3 Status Messages & 1.4.1 Use of Color',
        requirement: 'role="status" container, aria-hidden="true" icons, tabular numeric text',
        description:
          'Exposes the process capsule as a polite status landmark while hiding decorative icons from assistive technologies and pairing state with explicit labels and exit badges.',
      },
      {
        name: 'Contextual Keyboard Actions',
        criterion: '2.1.1 Keyboard',
        requirement: 'Native <button type="button"> Stop/Retry actions with prism-focus-ring',
        description:
          'Renders contextual Stop and Retry controls strictly in valid lifecycle states using keyboard-accessible buttons with keyboard-only focus rings.',
      },
    ],
  },
  props: [
    {
      name: 'label',
      type: 'string',
      defaultValue: 'required',
      description: 'Visible process or job label displayed inside the pill.',
    },
    {
      name: 'status',
      type: "'running' | 'success' | 'failed' | 'cancelled'",
      defaultValue: 'required',
      description: 'Lifecycle execution state governing the semantic icon and available actions.',
    },
    {
      name: 'elapsedMs',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Elapsed duration in milliseconds formatted as Nms (<1000), X.Ys (<60000), or Xm Ys (>=60000). Negative or non-finite values are ignored.',
    },
    {
      name: 'exitCode',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Finite process exit code rendered as a monospace "exit N" badge.',
    },
    {
      name: 'onStop',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional callback rendering a Stop button when status is "running".',
    },
    {
      name: 'onRetry',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional callback rendering a Retry button when status is "failed" or "cancelled".',
    },
    {
      name: 'size',
      type: "'sm' | 'md'",
      defaultValue: "'md'",
      description: 'Compact ("sm") or standard ("md") pill sizing.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ProcessStatusPill\n  label="pnpm test:coverage"\n  status="running"\n  elapsedMs={14200}\n  onStop={() => abortProcess()}\n/>`,
    `<ProcessStatusPill\n  label="vite build"\n  status="failed"\n  elapsedMs={68400}\n  exitCode={1}\n  onRetry={() => retryBuild()}\n/>`,
  ],
};
