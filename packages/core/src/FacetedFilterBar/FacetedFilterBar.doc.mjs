export const docs = {
  name: 'FacetedFilterBar',
  displayName: 'Faceted Search & Filter Bar',
  group: 'Advanced Search & Filtering',
  category: 'search-filtering',
  keywords: [
    'filter',
    'faceted',
    'search',
    'categories',
    'price',
    'date-range',
    'chips',
    'toolbar',
    'reset',
  ],
  usage: {
    description:
      'Unified optical glass faceted search and multi-dimensional filter bar combining an IME-safe search well, category toggle pills with optional match counts, auto-normalizing numeric price range wells, ISO date range inputs, live removable active-filter crystal chips, tabular result counters, and one-click reset.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide explicit priceBounds matching your domain catalog so out-of-range or inverted numeric inputs clamp and normalize deterministically.',
      },
      {
        guidance: true,
        description:
          'Pair FacetedFilterBar with tabular resultCount feedback so users immediately see how each facet narrows their result set.',
      },
      {
        guidance: false,
        description:
          'Compile the user search query directly into a RegExp without escaping; treat query values as literal substrings.',
      },
    ],
    accessibility: [
      {
        name: 'Search landmark, pressed pill states & live result status',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement: 'role="search", aria-pressed on category pills, role="status" on resultCount, keyboard-only prism-focus-ring',
        description:
          'All filter controls carry explicit accessible names, category toggle pills expose aria-pressed, resultCount announces updates politely via role="status", and text input Enter handling guards IME composition.',
      },
    ],
  },
  props: [
    {
      name: 'categories',
      type: 'ReadonlyArray<FacetCategoryOption>',
      defaultValue: 'required',
      description: 'Selectable category options with value, label, and optional count badge.',
    },
    {
      name: 'value',
      type: 'FacetedFilterState',
      defaultValue: 'undefined',
      description: 'Controlled faceted filter state.',
    },
    {
      name: 'defaultValue',
      type: 'Partial<FacetedFilterState>',
      defaultValue: 'undefined',
      description: 'Initial uncontrolled faceted filter state.',
    },
    {
      name: 'onChange',
      type: '(state: FacetedFilterState) => void',
      defaultValue: 'undefined',
      description: 'Called with the normalized FacetedFilterState whenever any filter changes.',
    },
    {
      name: 'priceLabel',
      type: 'string',
      defaultValue: "'Price Range'",
      description: 'Label displayed for the min/max numeric range inputs and active price chip.',
    },
    {
      name: 'priceBounds',
      type: '{ min: number; max: number }',
      defaultValue: '{ min: 0, max: 10000 }',
      description: 'Inclusive lower and upper numeric limits applied to price inputs.',
    },
    {
      name: 'showDateRange',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Shows or hides the start/end ISO date range filter inputs.',
    },
    {
      name: 'resultCount',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Optional matching result count displayed in a tabular status badge.',
    },
    {
      name: 'searchPlaceholder',
      type: 'string',
      defaultValue: "'Search filters, titles, or tags...'",
      description: 'Placeholder text rendered inside the recessed search input well.',
    },
  ],
  examples: [
    `<FacetedFilterBar\n  categories={[\n    { value: 'optics', label: 'Optics', count: 24 },\n    { value: 'sensors', label: 'Sensors', count: 12 },\n  ]}\n  priceBounds={{ min: 0, max: 5000 }}\n  resultCount={36}\n  onChange={(nextState) => applyFilters(nextState)}\n/>`,
  ],
};
