export const docs = {
  name: 'ToastSnackbar',
  displayName: 'Toast / Snackbar',
  group: 'Feedback & System Status',
  category: 'feedback-status',
  keywords: ['toast', 'snackbar', 'notification', 'status', 'feedback', 'alert'],
  usage: {
    description:
      'Crystal notification capsule with an inner warm-amber hairline ring and faceted prism emblem that confirms transient actions.',
    bestPractices: [
      { guidance: true, description: 'Keep toast titles concise (2 to 4 words) with optional single-line descriptions.' },
      { guidance: true, description: 'Supply onDismiss when a toast remains visible long enough for manual dismissal.' },
      { guidance: false, description: 'Use ToastSnackbar for critical blocking errors; use AlertBanner or ModalDialog instead.' },
    ],
    accessibility: [
      {
        name: 'Polite live region announcement',
        criterion: '4.1.3 Status Messages',
        requirement: 'role="status" with aria-live="polite" without stealing focus',
        description: 'Screen readers announce transient notifications without interrupting active keyboard interaction.',
      },
    ],
  },
  props: [
    { name: 'title', type: 'string', defaultValue: 'required', description: 'Primary notification message title.' },
    { name: 'description', type: 'string', defaultValue: 'undefined', description: 'Optional secondary detail line.' },
    { name: 'tone', type: "'amber' | 'emerald' | 'info' | 'critical'", defaultValue: "'amber'", description: 'Accent tone reflected via data-tone and prism core styling.' },
    { name: 'onDismiss', type: '() => void', defaultValue: 'undefined', description: 'Optional callback enabling the dismiss button.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<ToastSnackbar\n  title="Toast"\n  description="Project configuration saved"\n  tone="emerald"\n  onDismiss={dismiss}\n/>`,
  ],
};
