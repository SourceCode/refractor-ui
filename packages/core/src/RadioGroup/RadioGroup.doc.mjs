export const docs = {
  name: 'RadioGroup',
  displayName: 'Radio Button Group',
  group: 'Form Inputs & Selection Controls',
  category: 'form-inputs',
  keywords: ['radio', 'radiogroup', 'choice', 'option', 'selection', 'form'],
  usage: {
    description:
      'Circular crystal wells with an emerald refractive core where selecting one option automatically deselects all others.',
    bestPractices: [
      { guidance: true, description: 'Use RadioGroup when 2 to 5 mutually exclusive options should all remain visible.' },
      { guidance: true, description: 'Provide concise descriptions beneath complex options to clarify impact.' },
      { guidance: false, description: 'Use RadioGroup for binary on/off preferences; prefer ToggleSwitch instead.' },
    ],
    accessibility: [
      {
        name: 'Keyboard roving selection',
        criterion: '2.1.1 Keyboard',
        requirement: 'Arrow keys move focus and update selection among enabled radios',
        description: 'Implements WAI-ARIA radiogroup role with ArrowUp/ArrowDown/ArrowLeft/ArrowRight navigation and focus-visible rings.',
      },
    ],
  },
  props: [
    { name: 'name', type: 'string', defaultValue: 'required', description: 'Accessible label describing the radio group.' },
    { name: 'options', type: 'ReadonlyArray<RadioOption>', defaultValue: 'required', description: 'Mutually exclusive choices with optional descriptions and disabled flags.' },
    { name: 'value', type: 'string', defaultValue: 'required', description: 'Currently selected option value.' },
    { name: 'onChange', type: '(value: string) => void', defaultValue: 'required', description: 'Callback invoked when the active option changes.' },
    { name: 'orientation', type: "'vertical' | 'horizontal'", defaultValue: "'vertical'", description: 'Layout orientation of the radio options.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables every option in the radio group.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<RadioGroup\n  name="Density"\n  value={density}\n  onChange={setDensity}\n  options={[\n    { value: 'compact', label: 'Compact', description: 'High-density optical spacing' },\n    { value: 'comfortable', label: 'Comfortable' },\n  ]}\n/>`,
  ],
};
