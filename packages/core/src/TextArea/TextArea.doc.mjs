export const docs = {
  name: 'TextArea',
  displayName: 'Multi-Line Text Area',
  group: 'Forms & Inputs',
  category: 'forms-inputs',
  keywords: ['textarea', 'multiline', 'notes', 'description', 'input', 'counter'],
  usage: {
    description:
      'A multi-line optical glass text area recessed inside a rounded crystal frame with optional tabular character counter, validation messaging, and IME-safe Ctrl/Cmd+Enter submission.',
    bestPractices: [
      { guidance: true, description: 'Provide maxCharacters when input length is bounded so users get immediate tabular feedback.' },
      { guidance: true, description: 'Use onEnter for Ctrl/Cmd+Enter quick submit while keeping plain Enter for natural paragraph breaks.' },
      { guidance: false, description: 'Use TextArea for single-line values like email addresses or search queries; use TextInput instead.' },
    ],
    accessibility: [
      {
        name: 'Programmatic label and error linkage',
        criterion: '3.3.1 Error Identification',
        requirement: 'htmlFor/id linkage, aria-invalid, and aria-describedby',
        description: 'Binds label, helperText, and errorText (role="alert") programmatically to the textarea element.',
      },
      {
        name: 'IME composition safety',
        criterion: '2.1.1 Keyboard',
        requirement: 'Guard Enter shortcut with !e.nativeEvent.isComposing',
        description: 'Ensures CJK composition commits never accidentally trigger onEnter.',
      },
    ],
  },
  props: [
    { name: 'label', type: 'string', defaultValue: 'undefined', description: 'Visible field label rendered above the text area.' },
    { name: 'helperText', type: 'string', defaultValue: 'undefined', description: 'Supplementary guidance rendered below the text area.' },
    { name: 'errorText', type: 'string', defaultValue: 'undefined', description: 'Error text overriding helperText and applying invalid ring styling.' },
    { name: 'maxCharacters', type: 'number', defaultValue: 'undefined', description: 'Displays live character count and sets maxLength if not overridden.' },
    { name: 'onEnter', type: '(value: string) => void', defaultValue: 'undefined', description: 'IME-safe callback invoked on Ctrl+Enter or Cmd+Enter.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables editing and dims the recessed well.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<TextArea label="Release notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxCharacters={280} helperText="Markdown supported" />`,
  ],
};
