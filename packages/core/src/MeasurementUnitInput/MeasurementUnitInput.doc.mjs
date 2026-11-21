export const docs = {
  name: 'MeasurementUnitInput',
  displayName: 'Measurement & Unit Input',
  group: 'Number, Currency & Formatted Type Fields',
  category: 'number-currency-fields',
  keywords: [
    'measurement',
    'unit',
    'dimension',
    'number',
    'numeric',
    'px',
    'rem',
    'percent',
    'ms',
    'gb',
    'conversion',
    'stepper',
    'formatted',
  ],
  usage: {
    description:
      'Unified optical-glass compound input joining a recessed numeric prism-well spinbutton (with ArrowUp/ArrowDown stepping and blur/Enter clamping) seamlessly with an attached prism-crystal unit switcher, optional proportional unit conversion via factorToBase, and a live tabular summary badge.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Supply finite positive factorToBase multipliers on comparable units (such as px = 1 and rem = 16, or ms = 1 and s = 1000) and enable convertOnUnitChange when users expect values to rescale automatically.',
      },
      {
        guidance: true,
        description:
          'Keep convertOnUnitChange={false} when mixing incomparable units like px, %, and ms so switching units preserves the entered numeric scalar.',
      },
      {
        guidance: false,
        description:
          'Provide zero or negative factorToBase values; MeasurementUnitInput safely ignores non-positive or non-finite conversion factors instead of dividing by zero.',
      },
    ],
    accessibility: [
      {
        name: 'Spinbutton Semantics & Attached Unit Switcher',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement: 'role="spinbutton" with aria-valuemin, aria-valuemax, aria-valuenow, aria-valuetext, explicit label linkage, and aria-label="Unit"',
        description:
          'Exposes numeric range metadata and unit-qualified valuetext to assistive technology while pairing an accessible native unit selector and polite role="status" summary badge.',
      },
      {
        name: 'Keyboard Stepping, IME Safety & Focus Visibility',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement: 'ArrowUp/ArrowDown stepping by step, IME-guarded Enter commits, and keyboard-only prism-focus-ring outlines',
        description:
          'Supports incremental keyboard adjustments clamped to min..max while ignoring keys during IME composition.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'MeasurementValue',
      defaultValue: 'undefined',
      description: 'Controlled measurement object ({ amount, unit }).',
    },
    {
      name: 'defaultValue',
      type: 'MeasurementValue',
      defaultValue: "{ amount: 16, unit: 'px' }",
      description: 'Initial measurement object when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(next: MeasurementValue) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever the amount commits/steps or the selected unit changes.',
    },
    {
      name: 'units',
      type: 'MeasurementUnitOption[]',
      defaultValue: 'DEFAULT_MEASUREMENT_UNITS',
      description: 'Unit definitions ({ id, label, factorToBase? }) selectable in the attached prism-crystal switcher.',
    },
    {
      name: 'convertOnUnitChange',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'When true and both old and new units specify finite factorToBase > 0, converts amount * oldFactor / newFactor rounded to 3 decimals and clamped to min..max.',
    },
    {
      name: 'min',
      type: 'number',
      defaultValue: '0',
      description: 'Minimum permitted numeric amount.',
    },
    {
      name: 'max',
      type: 'number',
      defaultValue: '100000',
      description: 'Maximum permitted numeric amount.',
    },
    {
      name: 'step',
      type: 'number',
      defaultValue: '1',
      description: 'Increment/decrement step applied when pressing ArrowUp or ArrowDown.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Measurement'",
      description: 'Visible title rendered in the slab header and associated with the numeric input.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables both the numeric input and attached unit selector.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<MeasurementUnitInput\n  defaultValue={{ amount: 16, unit: 'px' }}\n  onChange={(next) => console.warn(next.amount, next.unit)}\n/>`,
    `<MeasurementUnitInput\n  label="Border Radius"\n  convertOnUnitChange\n  step={0.5}\n  units={[\n    { id: 'px', label: 'px', factorToBase: 1 },\n    { id: 'rem', label: 'rem', factorToBase: 16 },\n  ]}\n  defaultValue={{ amount: 16, unit: 'px' }}\n/>`,
  ],
};
