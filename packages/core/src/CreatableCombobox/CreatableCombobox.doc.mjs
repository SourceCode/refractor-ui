export const docs = {
  name: 'CreatableCombobox',
  displayName: 'Creatable Single-Select Combobox',
  group: 'Complex Variations of Common Controls',
  category: 'complex-controls',
  keywords: [
    'combobox',
    'creatable',
    'autocomplete',
    'select',
    'search',
    'create-option',
    'listbox',
    'input',
  ],
  usage: {
    description:
      'An optical-glass single-select combobox pairing a recessed prism-well searchable input inside a prism-crystal bezel with a floating prism-slab listbox. Filters existing options case-insensitively by label, value, or group and offers an inline "+ Create" option whenever a novel query is typed.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide optional group metadata on CreatableOption entries to help users filter and disambiguate similarly named options.',
      },
      {
        guidance: true,
        description:
          'Supply onCreateOption when newly created options require custom IDs, persistence hooks, or default group assignments.',
      },
      {
        guidance: false,
        description:
          'Allow unguarded Enter commits during IME composition — CreatableCombobox checks !event.nativeEvent.isComposing automatically.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Editable Combobox Pattern',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'role="combobox", aria-expanded, aria-autocomplete="list", aria-controls, aria-activedescendant, role="listbox", role="option"',
        description:
          'Synchronizes active keyboard highlight via aria-activedescendant across both existing options and the inline create option.',
      },
      {
        name: 'IME-Safe Keyboard Navigation & Dismissal',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'ArrowDown/ArrowUp cycling, IME-safe Enter confirmation, Escape and outside-mousedown dismissal, prism-focus-ring',
        description:
          'Supports full keyboard selection and creation without losing focus or interrupting East Asian IME composition sessions.',
      },
    ],
  },
  props: [
    {
      name: 'options',
      type: 'CreatableOption[]',
      defaultValue: 'undefined',
      description: 'Controlled list of selectable options combined with any newly created options.',
    },
    {
      name: 'defaultOptions',
      type: 'CreatableOption[]',
      defaultValue: 'undefined',
      description: 'Initial option list when operating with internal option state.',
    },
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled selected option value.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Initial selected option value for uncontrolled usage.',
    },
    {
      name: 'onChange',
      type: '(value: string, option: CreatableOption) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when an existing or newly created option is selected.',
    },
    {
      name: 'onCreateOption',
      type: '(label: string) => CreatableOption | void',
      defaultValue: 'undefined',
      description: 'Optional hook returning a custom CreatableOption when the user creates a new entry.',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "'Search or create...'",
      description: 'Placeholder text displayed in the combobox input.',
    },
    {
      name: 'createPromptPrefix',
      type: 'string',
      defaultValue: "'Create'",
      description: 'Action verb prefix shown in the inline "+ {prefix} \"{query}\"" option.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Combobox'",
      description: 'Visible accessible field label rendered above the combobox.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables typing, opening the listbox, selecting, and creating options.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<CreatableCombobox\n  label="Release Channel"\n  defaultOptions={[\n    { value: 'stable', label: 'Stable', group: 'Core' },\n    { value: 'canary', label: 'Canary', group: 'Preview' },\n  ]}\n  defaultValue="stable"\n  createPromptPrefix="Add"\n  onChange={(val, opt) => console.warn(val, opt)}\n/>`,
  ],
};
