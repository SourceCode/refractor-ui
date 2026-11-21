export const docs = {
  name: 'StatefulAsyncButton',
  displayName: 'Stateful Async Button',
  group: 'Complex Button & Action Variations',
  category: 'complex-buttons',
  keywords: [
    'button',
    'async',
    'stateful',
    'loading',
    'spinner',
    'success',
    'error',
    'retry',
    'submit',
    'morph',
  ],
  usage: {
    description:
      'Optical glass action capsule that morphs smoothly through idle (primary refractive glass), loading (frosted crystal with spinning Loader2 and duplicate-click protection), success (emerald liquid glass with Check), and error (semantic rose/error surface with AlertCircle and instant retry), automatically resetting to idle after a clamped delay.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Return a Promise from onAction so the button automatically transitions to loading, blocks duplicate submissions, and surfaces success or retryable error states.',
      },
      {
        guidance: true,
        description:
          'Use concise past-tense confirmations ("Saved", "Deployed") for successLabel and clear failure cues ("Retry deploy", "Failed") for errorLabel.',
      },
      {
        guidance: false,
        description:
          'Set excessively long resetDelayMs values for high-frequency actions; keep confirmations brief (1200ms–2500ms) or pass resetDelayMs={0} when persistence is desired.',
      },
    ],
    accessibility: [
      {
        name: 'Busy state & polite lifecycle announcements',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement: 'aria-busy="true" during loading and sr-only aria-live="polite" status updates',
        description:
          'Preserves focus on the native <button> while setting aria-busy="true" and aria-disabled="true" during async execution, and announces state transitions politely via a visually hidden status region.',
      },
      {
        name: 'Keyboard-only focus rings & IME safety',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement: 'prism-focus-ring (:focus-visible), IME composition guard, disabled:cursor-not-allowed',
        description:
          'Ignores IME-composing keystrokes, prevents Enter/Space double-triggers while busy, and enforces keyboard-only optical focus outlines.',
      },
    ],
  },
  props: [
    {
      name: 'idleLabel',
      type: 'string',
      defaultValue: 'required',
      description: 'Visible label rendered while the button is in the idle state.',
    },
    {
      name: 'idleIcon',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Optional leading icon rendered alongside idleLabel when idle.',
    },
    {
      name: 'loadingLabel',
      type: 'string',
      defaultValue: "'Working...'",
      description: 'Label displayed while an async action promise is pending.',
    },
    {
      name: 'successLabel',
      type: 'string',
      defaultValue: "'Done'",
      description: 'Label displayed after onAction completes successfully.',
    },
    {
      name: 'errorLabel',
      type: 'string',
      defaultValue: "'Failed'",
      description: 'Label displayed after onAction throws or rejects; clicking in error state retries.',
    },
    {
      name: 'onAction',
      type: '() => void | Promise<void>',
      defaultValue: 'undefined',
      description: 'Synchronous or Promise-returning action executed on click in idle or error state.',
    },
    {
      name: 'state',
      type: "'idle' | 'loading' | 'success' | 'error'",
      defaultValue: 'undefined',
      description: 'Controlled lifecycle state; when omitted, state is managed internally.',
    },
    {
      name: 'resetDelayMs',
      type: 'number',
      defaultValue: '1800',
      description: 'Delay in milliseconds (clamped 0..15000) before resetting success/error back to idle; 0 disables auto-reset.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      defaultValue: "'md'",
      description: 'Controls capsule height, horizontal padding, and icon scale.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables interaction and dims the optical glass surface.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<StatefulAsyncButton\n  idleLabel="Deploy release"\n  loadingLabel="Deploying..."\n  successLabel="Deployed"\n  errorLabel="Retry deploy"\n  onAction={async () => {\n    await deployRelease();\n  }}\n/>`,
  ],
};
