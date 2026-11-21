export const docs = {
  name: 'AlertBanner',
  displayName: 'Alert Banner',
  group: 'Feedback & System Status',
  category: 'feedback-status',
  keywords: ['alert', 'banner', 'warning', 'error', 'success', 'info', 'notice'],
  usage: {
    description:
      'Prominent persistent optical slab communicating system updates, warnings, successes, or errors with explicit icon and text semantics.',
    bestPractices: [
      { guidance: true, description: 'Pair semantic icons with explicit titles and actionable remediation copy.' },
      { guidance: true, description: 'Provide an action button when users can resolve the banner condition in one click.' },
      { guidance: false, description: 'Rely on color alone to convey severity; always describe the state clearly in copy.' },
    ],
    accessibility: [
      {
        name: 'Immediate alert landmark',
        criterion: '4.1.3 Status Messages',
        requirement: 'role="alert" with descriptive icon + text pairing',
        description: 'Icons are marked aria-hidden="true" so screen readers announce the title, message, and optional actions cleanly.',
      },
    ],
  },
  props: [
    { name: 'severity', type: "'info' | 'success' | 'warning' | 'error'", defaultValue: "'info'", description: 'Semantic severity controlling ring tint and icon.' },
    { name: 'title', type: 'string', defaultValue: 'required', description: 'Bold banner headline.' },
    { name: 'message', type: 'string', defaultValue: 'required', description: 'Supporting explanation text.' },
    { name: 'actionLabel', type: 'string', defaultValue: 'undefined', description: 'Label for the optional action button (requires onAction).' },
    { name: 'onAction', type: '() => void', defaultValue: 'undefined', description: 'Callback invoked when the action button is clicked.' },
    { name: 'onDismiss', type: '() => void', defaultValue: 'undefined', description: 'Callback invoked when the dismiss icon button is clicked.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<AlertBanner\n  severity="warning"\n  title="Token schema migration"\n  message="Legacy shadow tokens map automatically to optics.refraction."\n  actionLabel="Review guide"\n  onAction={openGuide}\n  onDismiss={dismiss}\n/>`,
  ],
};
