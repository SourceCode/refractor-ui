export const docs = {
  name: 'MultiSelectCombobox',
  displayName: 'Multi-Select Combobox / Token Input',
  group: 'Forms & Inputs',
  category: 'forms-inputs',
  keywords: ['combobox', 'multi-select', 'token', 'tags', 'autocomplete', 'creatable', 'pills'],
  usage: {
    description:
      'An optical crystal combobox housing a recessed flex-wrap token well where selected values appear as glossy emerald removable pills alongside a live searchable input and floating slab listbox.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide clear labels and optional category metadata on ComboboxOption items to help users scan large option lists.',
      },
      {
        guidance: true,
        description:
          'Enable creatable when users should be able to introduce trimmed custom tags or tokens not present in options.',
      },
      {
        guidance: false,
        description:
          'Omit maxSelected feedback when capping selections — MultiSelectCombobox displays a tabular count automatically.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Multi-Select Combobox',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'role="combobox", aria-expanded, aria-controls, aria-activedescendant, role="listbox", aria-multiselectable="true"',
        description:
          'Associates the live input with the floating multi-select listbox, highlights active candidates with aria-activedescendant, and exposes per-pill remove buttons.',
      },
      {
        name: 'IME-Safe Keyboard Navigation',
        criterion: '2.1.1 Keyboard',
        requirement: 'ArrowDown/ArrowUp, IME-guarded Enter, Backspace token removal, Escape dismissal',
        description:
          'Guards Enter confirmation with !e.nativeEvent.isComposing, removes the trailing token on Backspace when query is empty, and dismisses the listbox on Escape or outside mousedown.',
      },
    ],
  },
  props: [
    { name: 'options', type: 'ReadonlyArray<ComboboxOption>', defaultValue: 'required', description: 'Candidate options with value, label, optional category, and optional disabled flag.' },
    { name: 'value', type: 'ReadonlyArray<string>', defaultValue: 'undefined', description: 'Controlled list of selected option values or custom tokens.' },
    { name: 'defaultValue', type: 'ReadonlyArray<string>', defaultValue: 'undefined', description: 'Initial selected values for uncontrolled usage.' },
    { name: 'onChange', type: '(values: string[]) => void', defaultValue: 'undefined', description: 'Callback fired whenever tokens are added, toggled, or removed.' },
    { name: 'label', type: 'string', defaultValue: 'undefined', description: 'Optional label rendered above the combobox.' },
    { name: 'placeholder', type: 'string', defaultValue: "'Search and select items...'", description: 'Input placeholder shown when no tokens are selected.' },
    { name: 'creatable', type: 'boolean', defaultValue: 'false', description: 'Allows creating trimmed custom tokens not present in options.' },
    { name: 'maxSelected', type: 'number', defaultValue: 'undefined', description: 'Optional upper cap on simultaneously selected tokens.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables typing, toggling, creating, and removing tokens.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<MultiSelectCombobox\n  label="Design Tokens"\n  options={[\n    { value: 'crystal', label: 'Crystal Glass', category: 'Surface' },\n    { value: 'emerald', label: 'Emerald Accent', category: 'Color' },\n  ]}\n  defaultValue={['crystal']}\n  creatable\n  maxSelected={4}\n  onChange={setTags}\n/>`,
  ],
};
