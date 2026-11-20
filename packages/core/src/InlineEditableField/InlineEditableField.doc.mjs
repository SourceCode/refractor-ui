export const docs = {
  name: 'InlineEditableField',
  displayName: 'Inline Editable Field',
  group: 'Forms & Inputs',
  category: 'forms-inputs',
  keywords: [
    'inline',
    'editable',
    'edit',
    'in-place',
    'input',
    'textarea',
    'field',
    'validation',
    'click-to-edit',
  ],
  usage: {
    description:
      'Click-to-edit optical glass capsule that renders crisp read-only typography with a subtle pencil affordance and transforms in-place into a recessed prism-well input or multiline textarea flanked by emerald Save and crystal Cancel micro-buttons.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide an explicit ariaLabel when using InlineEditableField for document titles, table cells, or settings rows so assistive technologies announce the field purpose in both view and edit modes.',
      },
      {
        guidance: true,
        description:
          'Combine required or validate with descriptive error messages; invalid drafts keep edit mode open and preserve the last committed value.',
      },
      {
        guidance: false,
        description:
          'Enable saveOnBlur for high-risk destructive identifiers without clear validation feedback.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard activation, IME safety & live error alerts',
        criterion: '2.1.1 Keyboard & 3.3.1 Error Identification',
        requirement: 'Enter/Space to edit, IME-safe Enter (or Ctrl/Cmd+Enter in multiline) to save, Escape to cancel, role="alert" validation',
        description:
          'View mode exposes a native button with keyboard-only prism-focus-ring. Edit mode guards Enter commits with !e.nativeEvent.isComposing, reverts draft cleanly on Escape, restores focus on explicit commit/cancel, and announces validation errors via role="alert" linked with aria-describedby.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled field value.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "''",
      description: 'Initial uncontrolled field value.',
    },
    {
      name: 'onSave',
      type: '(nextValue: string) => void',
      defaultValue: 'undefined',
      description: 'Invoked with the validated draft text when committed.',
    },
    {
      name: 'onCancel',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Invoked when editing is canceled via Escape or the Cancel button.',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "'Click to edit...'",
      description: 'Placeholder text rendered when the field value is empty.',
    },
    {
      name: 'ariaLabel',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Accessible label for the view trigger and active text editor.',
    },
    {
      name: 'required',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Rejects empty or whitespace-only commits with a validation alert.',
    },
    {
      name: 'validate',
      type: '(draft: string) => string | null',
      defaultValue: 'undefined',
      description: 'Custom validator returning an error message string or null if valid.',
    },
    {
      name: 'saveOnBlur',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Automatically validates and saves when focus leaves the edit container.',
    },
    {
      name: 'multiline',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Renders a multiline textarea saved via Ctrl/Cmd+Enter instead of a single-line input.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables entering edit mode and dims the trigger capsule.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<InlineEditableField\n  ariaLabel="Project title"\n  defaultValue="Refractor Optical Studio"\n  required\n  onSave={(next) => saveTitle(next)}\n/>`,
  ],
};
