export const docs = {
  name: 'TriStateCheckbox',
  displayName: 'Tri-State Checkbox',
  group: 'Complex Variations of Common Controls',
  category: 'complex-controls',
  keywords: [
    'checkbox',
    'tri-state',
    'indeterminate',
    'mixed',
    'select-all',
    'partial',
    'count',
    'selection',
    'tree',
    'bulk',
  ],
  usage: {
    description:
      'An optical-glass tri-state selection checkbox backed by a synchronized native <input type="checkbox"> with indeterminate DOM reflection, transitioning cleanly across unchecked (recessed prism-well), indeterminate (prism-crystal with primary Minus glyph), and checked (liquid prism-emerald Check tile) states with an optional tabular selected/total count pill.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use TriStateCheckbox as a parent "Select all" or group-header control when child rows or permissions can be partially selected.',
      },
      {
        guidance: true,
        description:
          'Pair selectedCount and totalCount with controlled state so users immediately see exact partial selection progress in tabular monospace figures.',
      },
      {
        guidance: false,
        description:
          'Use TriStateCheckbox for simple standalone boolean preferences with no child hierarchy; use Checkbox or ToggleSwitch instead.',
      },
    ],
    accessibility: [
      {
        name: 'Native Indeterminate & ARIA Mixed Parity',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Synchronizes HTMLInputElement.indeterminate via useEffect alongside aria-checked="mixed" | true | false, aria-labelledby, and aria-describedby',
        description:
          'Exposes accurate native checkbox state and mixed ARIA semantics to screen readers while preserving exact label naming even when a description or count pill is present.',
      },
      {
        name: 'Keyboard-Only Focus Ring & Disabled Interaction Guard',
        criterion: '2.4.7 Focus Visible & 2.1.1 Keyboard',
        requirement:
          'Focus-visible optical outline on the visual checkbox tile, native Space toggling, and disabled:cursor-not-allowed without hover promises',
        description:
          'Ensures keyboard users can focus and toggle the control cleanly while disabled states prevent pointer and keyboard activation.',
      },
    ],
  },
  props: [
    {
      name: 'state',
      type: "'unchecked' | 'checked' | 'indeterminate'",
      defaultValue: 'undefined',
      description: 'Controlled tri-state value.',
    },
    {
      name: 'defaultState',
      type: "'unchecked' | 'checked' | 'indeterminate'",
      defaultValue: "'unchecked'",
      description: 'Initial tri-state value for uncontrolled usage.',
    },
    {
      name: 'onChange',
      type: '(next: TriCheckboxState) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked on toggle: unchecked -> checked, indeterminate -> checked, checked -> unchecked.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: 'required',
      description: 'Primary visible label and accessible name for the checkbox.',
    },
    {
      name: 'description',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional secondary helper text linked via aria-describedby.',
    },
    {
      name: 'selectedCount',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Optional finite count of selected items rendered in the tabular count pill.',
    },
    {
      name: 'totalCount',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Optional finite positive total count required to display the selectedCount/totalCount pill.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables pointer and keyboard toggling.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<TriStateCheckbox\n  state="indeterminate"\n  onChange={handleSelectAll}\n  label="Select all optical tokens"\n  description="Toggle all child layers in the current theme workspace."\n  selectedCount={3}\n  totalCount={8}\n/>`,
    `<TriStateCheckbox\n  defaultState="unchecked"\n  label="Include archived snapshots"\n/>`,
  ],
};
