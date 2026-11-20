export const docs = {
  name: 'SearchWithSuggestions',
  displayName: 'Search Bar with Suggestions',
  group: 'Forms & Inputs',
  category: 'forms-inputs',
  keywords: ['search', 'autocomplete', 'combobox', 'suggestions', 'quick-add', 'filter'],
  usage: {
    description:
      'An optical crystal pill search combobox pairing a recessed input well, clear button, live filtered slab suggestion list, and a trailing "+" quick-add action.',
    bestPractices: [
      { guidance: true, description: 'Provide concise category metadata on SearchSuggestion items to disambiguate matching results.' },
      { guidance: true, description: 'Wire onQuickAdd to create a new tag, filter, or entry directly from the current search query.' },
      { guidance: false, description: 'Pass thousands of unfiltered suggestions without debouncing or upstream indexing.' },
    ],
    accessibility: [
      {
        name: 'Combobox & Listbox semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'role="combobox", aria-expanded, aria-controls, role="listbox"',
        description: 'Connects the search input to the suggestion popover via aria-controls and closes on Escape or outside mousedown.',
      },
      {
        name: 'IME composition safety',
        criterion: '2.1.1 Keyboard',
        requirement: 'Guard Enter selection with !e.nativeEvent.isComposing',
        description: 'Prevents premature selection or quick-add while users compose IME input.',
      },
    ],
  },
  props: [
    { name: 'value', type: 'string', defaultValue: 'required', description: 'Controlled search query string.' },
    { name: 'onChange', type: '(value: string) => void', defaultValue: 'required', description: 'Callback fired as the query text changes or is cleared.' },
    { name: 'suggestions', type: 'SearchSuggestion[]', defaultValue: 'required', description: 'Candidate suggestions filtered case-insensitively by label.' },
    { name: 'onSelectSuggestion', type: '(item: SearchSuggestion) => void', defaultValue: 'required', description: 'Callback fired when a suggestion is selected.' },
    { name: 'onQuickAdd', type: '(currentQuery: string) => void', defaultValue: 'undefined', description: 'Optional callback fired by the "+" button or Enter with no visible suggestions.' },
    { name: 'placeholder', type: 'string', defaultValue: "'With suggestions'", description: 'Placeholder displayed in the empty input well.' },
    { name: 'ariaLabel', type: 'string', defaultValue: "'Search with suggestions'", description: 'Accessible name for the combobox input.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables search input, clear button, and quick-add action.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<SearchWithSuggestions\n  value={query}\n  onChange={setQuery}\n  suggestions={items}\n  onSelectSuggestion={handleSelect}\n  onQuickAdd={handleAdd}\n/>`,
  ],
};
