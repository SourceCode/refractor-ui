export const docs = {
  name: 'TransferList',
  displayName: 'Transfer List (Dual Listbox)',
  group: 'Interactive & Drag-and-Drop',
  category: 'drag-and-drop',
  keywords: ['transfer', 'dual-listbox', 'listbox', 'shuttle', 'picklist', 'multi-select', 'assign'],
  usage: {
    description:
      'Dual optical glass listbox pairing two side-by-side prism-slab pools with tabular count pills, independent IME-safe prism-well search filters, emerald checkbox rows, and sculpted prism-crystal directional transfer buttons.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use TransferList when users need to compare both unassigned and assigned sets simultaneously, such as role permissions or feature flags.',
      },
      {
        guidance: true,
        description:
          'Mark immutable or system-managed items with disabled: true so they remain visibly accounted for while being skipped during individual and Move All transfers.',
      },
      {
        guidance: false,
        description:
          'Use TransferList for fewer than 4 simple boolean flags where a compact Checkbox group or MultiSelectCombobox is clearer.',
      },
    ],
    accessibility: [
      {
        name: 'Dual Multi-Select Listbox Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'role="listbox", aria-multiselectable="true", role="option", aria-selected, aria-disabled',
        description:
          'Exposes both Available and Selected pools as labelled multi-select listboxes with native button options, keyboard-only prism-focus-ring styling, and polite status announcements.',
      },
      {
        name: 'IME-Safe Independent Search Filters',
        criterion: '2.1.1 Keyboard',
        requirement: 'Independent pool search inputs guarding Enter/Escape with !e.nativeEvent.isComposing',
        description:
          'Search inputs filter each pool without regex construction, clear cleanly with Escape, and respect active IME compositions.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<TransferListItem>',
      defaultValue: 'required',
      description: 'Complete item catalog distributed between the Available and Selected pools.',
    },
    {
      name: 'selectedIds',
      type: 'ReadonlyArray<string>',
      defaultValue: 'undefined',
      description: 'Controlled IDs currently placed in the Selected pool.',
    },
    {
      name: 'defaultSelectedIds',
      type: 'ReadonlyArray<string>',
      defaultValue: 'undefined',
      description: 'Initial Selected pool IDs when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(selectedIds: string[]) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with deduplicated Selected IDs whenever items transfer.',
    },
    {
      name: 'availableTitle',
      type: 'string',
      defaultValue: "'Available'",
      description: 'Heading label for the left Available pool.',
    },
    {
      name: 'selectedTitle',
      type: 'string',
      defaultValue: "'Selected'",
      description: 'Heading label for the right Selected pool.',
    },
    {
      name: 'searchable',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays independent recessed search inputs above each listbox.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<TransferList\n  items={[\n    { id: 'tokens', label: 'Optical Tokens', description: 'Refractive CSS custom properties' },\n    { id: 'audit', label: 'WCAG Contrast Gate', description: 'Automated AA/AAA checks' },\n    { id: 'core', label: 'System Kernel', description: 'Required baseline', disabled: true },\n  ]}\n  defaultSelectedIds={['tokens']}\n  availableTitle="Available Scopes"\n  selectedTitle="Assigned Scopes"\n  onChange={setSelected}\n/>`,
  ],
};
