export const docs = {
  name: 'DropdownSelect',
  displayName: 'Dropdown Select Menu',
  group: 'Form Inputs & Selection Controls',
  category: 'form-inputs',
  keywords: ['select', 'dropdown', 'listbox', 'menu', 'picker', 'options'],
  usage: {
    description:
      'A signature optical crystal pill select control featuring the 3/4 C-ring emblem, recessed emerald glass confirmation tray, and a floating prism slab listbox.',
    bestPractices: [
      { guidance: true, description: 'Supply a clear label prop so screen readers announce what setting the dropdown controls.' },
      { guidance: true, description: 'Use DropdownSelect when choosing one value from 4 to 15 options; use SegmentedControl for 2–4 compact choices.' },
      { guidance: false, description: 'Use DropdownSelect for large searchable datasets; use SearchWithSuggestions instead.' },
    ],
    accessibility: [
      {
        name: 'Listbox popup association & Escape close',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'aria-haspopup="listbox", aria-expanded, aria-controls, aria-selected',
        description: 'Connects the trigger button and slab listbox via aria-controls/aria-labelledby and dismisses cleanly on Escape or outside mousedown.',
      },
      {
        name: 'Keyboard-only focus rings',
        criterion: '2.4.7 Focus Visible',
        requirement: 'Visible focus ring on trigger and every option',
        description: 'Uses prism-focus-ring (:focus-visible) and disables the trigger when disabled or when options is empty.',
      },
    ],
  },
  props: [
    { name: 'options', type: 'SelectOption[]', defaultValue: 'required', description: 'Array of { value, label, disabled? } items displayed in the listbox.' },
    { name: 'value', type: 'string', defaultValue: 'required', description: 'Currently selected option value.' },
    { name: 'onChange', type: '(value: string) => void', defaultValue: 'required', description: 'Callback invoked with the chosen option value.' },
    { name: 'label', type: 'string', defaultValue: 'undefined', description: 'Optional visible label rendered above the control.' },
    { name: 'placeholder', type: 'string', defaultValue: "'Select'", description: 'Fallback text when value does not match any option.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables opening the dropdown menu.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<DropdownSelect\n  label="Dispersion preset"\n  value={preset}\n  onChange={setPreset}\n  options={[{ value: 'subtle', label: 'Subtle' }, { value: 'vivid', label: 'Vivid' }]}\n/>`,
  ],
};
