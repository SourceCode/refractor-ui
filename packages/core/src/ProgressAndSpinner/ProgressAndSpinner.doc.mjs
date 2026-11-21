export const docs = {
  name: 'ProgressAndSpinner',
  displayName: 'Progress Bar & Loading Spinner',
  group: 'Feedback & System Status',
  category: 'feedback-status',
  keywords: ['progress', 'progressbar', 'spinner', 'loading', 'status', 'determinate'],
  usage: {
    description:
      'Determinate warm-amber liquid progress bar paired with an optional indeterminate emerald optical C-ring spinner.',
    bestPractices: [
      { guidance: true, description: 'Use a determinate progress bar whenever total completion percentage can be measured.' },
      { guidance: true, description: 'Pair the bar with a descriptive label and tabular numeric percentage readout.' },
      { guidance: false, description: 'Pass unclamped or non-finite values expecting raw display; progress is clamped strictly to 0–100.' },
    ],
    accessibility: [
      {
        name: 'ARIA progressbar and loading status',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'role="progressbar" with aria-valuenow/min/max and spinner role="status"',
        description: 'Communicates exact clamped percentage and live synchronization status to assistive technologies.',
      },
    ],
  },
  props: [
    { name: 'progress', type: 'number', defaultValue: 'required', description: 'Percentage completion clamped between 0 and 100 (NaN falls back to 0).' },
    { name: 'label', type: 'string', defaultValue: "'Compiling refractive shader cache'", description: 'Accessible label displayed above the progress track.' },
    { name: 'indeterminateSpinner', type: 'boolean', defaultValue: 'true', description: 'Shows or hides the companion emerald optical spinner pill.' },
    { name: 'spinnerLabel', type: 'string', defaultValue: "'Synchronizing virtual storage...'", description: 'Caption rendered inside the indeterminate spinner pill.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<ProgressAndSpinner progress={72} label="Compiling optical tokens" indeterminateSpinner />`,
  ],
};
