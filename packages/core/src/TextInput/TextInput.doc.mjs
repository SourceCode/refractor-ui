export const docs = {
  name: 'TextInput',
  displayName: 'Text Input Field',
  group: 'Form Inputs & Selection Controls',
  category: 'form-inputs',
  keywords: ['input', 'text', 'password', 'field', 'form', 'well', 'validation'],
  usage: {
    description:
      'A single-line optical glass text input recessed inside a crystal bezel with built-in label linkage, password visibility toggle, validation messaging, and IME-safe Enter handling.',
    bestPractices: [
      { guidance: true, description: 'Always pair TextInput with a visible label or explicit aria-label for screen-reader clarity.' },
      { guidance: true, description: 'Use errorText for actionable validation feedback; it automatically links via aria-describedby and sets aria-invalid="true".' },
      { guidance: false, description: 'Rely solely on placeholder text as a field label since placeholders disappear on input.' },
    ],
    accessibility: [
      {
        name: 'Programmatic label and error association',
        criterion: '3.3.1 Error Identification',
        requirement: 'htmlFor/id linkage, aria-invalid, and aria-describedby',
        description: 'Generates stable IDs with useId() so labels, helper text, and role="alert" error messages are programmatically bound.',
      },
      {
        name: 'IME composition safety',
        criterion: '2.1.1 Keyboard',
        requirement: 'Guard Enter submission with !e.nativeEvent.isComposing',
        description: 'Prevents premature form submission when CJK or accented IME candidates are confirmed with Enter.',
      },
    ],
  },
  props: [
    { name: 'label', type: 'string', defaultValue: 'undefined', description: 'Visible field label rendered above the crystal bezel.' },
    { name: 'helperText', type: 'string', defaultValue: 'undefined', description: 'Supporting guidance rendered below the input.' },
    { name: 'errorText', type: 'string', defaultValue: 'undefined', description: 'Error text that overrides helperText and applies error styling.' },
    { name: 'leadingIcon', type: 'ReactNode', defaultValue: 'undefined', description: 'Optional icon displayed before the text field.' },
    { name: 'type', type: 'HTMLInputTypeAttribute', defaultValue: "'text'", description: 'Input type; "password" renders an accessible visibility toggle.' },
    { name: 'onEnter', type: '(value: string) => void', defaultValue: 'undefined', description: 'IME-safe callback invoked when pressing Enter outside composition.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables editing and password reveal controls.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<TextInput label="Workspace name" placeholder="Refractor Studio" helperText="Visible to collaborators" />`,
    `<TextInput label="API token" type="password" errorText="Token must be at least 16 characters" />`,
  ],
};
