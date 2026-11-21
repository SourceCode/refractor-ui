export const docs = {
  name: 'EmptyState',
  displayName: 'Empty State',
  group: 'Feedback & System Status',
  category: 'feedback-status',
  keywords: ['empty', 'zero-state', 'placeholder', 'cta', 'inbox', 'onboarding'],
  usage: {
    description:
      'Optical crystal emblem, clear guidance copy, and primary call-to-action displayed when a collection or workspace has zero records.',
    bestPractices: [
      { guidance: true, description: 'Explain why the view is empty and provide a single clear next action.' },
      { guidance: true, description: 'Use action verbs for actionLabel such as "Restore sample dataset" or "Create snapshot".' },
      { guidance: false, description: 'Leave an empty table or list blank without context or recovery guidance.' },
    ],
    accessibility: [
      {
        name: 'Clear heading and primary action semantics',
        criterion: '2.4.6 Headings and Labels',
        requirement: 'Descriptive heading paired with an accessible PrimaryButton CTA',
        description: 'Decorative emblem icon is hidden from assistive technology while heading, body, and button remain clear.',
      },
    ],
  },
  props: [
    { name: 'title', type: 'string', defaultValue: 'required', description: 'Heading explaining the empty state.' },
    { name: 'description', type: 'string', defaultValue: 'required', description: 'Supporting explanation guiding the next step.' },
    { name: 'actionLabel', type: 'string', defaultValue: 'required', description: 'Primary call-to-action button label.' },
    { name: 'onAction', type: '() => void', defaultValue: 'required', description: 'Callback invoked when the CTA button is pressed.' },
    { name: 'icon', type: 'ReactNode', defaultValue: '<Inbox />', description: 'Optional custom icon inside the crystal emblem.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<EmptyState\n  title="No active snapshots"\n  description="Create a baseline snapshot or restore default records."\n  actionLabel="Restore sample dataset"\n  onAction={restore}\n/>`,
  ],
};
