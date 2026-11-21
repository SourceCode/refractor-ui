export const docs = {
  name: 'NumericStepper',
  displayName: 'Numeric Stepper',
  group: 'Number, Currency & Formatted Type Fields',
  category: 'number-currency-fields',
  keywords: [
    'numeric',
    'stepper',
    'number',
    'spinbutton',
    'counter',
    'quantity',
    'increment',
    'decrement',
    'precision',
    'unit',
  ],
  usage: {
    description:
      'Optical-glass numeric spinbutton pairing a recessed prism-well decimal input and optional unit badge with flanking Decrement and Increment prism-crystal buttons, deterministic min/max/step sanitization, automatic or explicit decimal rounding, and full WAI-ARIA spinbutton keyboard shortcuts.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide a concise visible label and unit badge (such as "px", "%", or "ms") so users immediately understand the numeric scale and domain.',
      },
      {
        guidance: true,
        description:
          'Set an explicit precision when formatting fixed-decimal quantities (such as currency ratios or temperatures) or omit precision to infer decimal places automatically from step.',
      },
      {
        guidance: false,
        description:
          'Use NumericStepper for unbounded free-form text or long multi-segment identifiers; pair it with bounded numeric values where stepping is meaningful.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Spinbutton Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="spinbutton" with aria-valuenow, aria-valuemin, aria-valuemax, optional aria-valuetext, and explicit Decrement/Increment button labels',
        description:
          'Associates the visible label via useId(), reflects sanitized numeric bounds and current value through ARIA spinbutton attributes, and disables boundary stepper buttons at min and max.',
      },
      {
        name: 'Full Spinbutton Keyboard Control & IME Safety',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Supports ArrowUp/ArrowDown, PageUp/PageDown (10x step), Home/End bounds, IME-safe Enter commit, blur revert on invalid input, and keyboard-only prism-focus-ring',
        description:
          'Guards keyboard handlers with !e.nativeEvent.isComposing so IME composition commits are never hijacked, reverts invalid or NaN drafts cleanly on blur, and restricts focus outlines to keyboard navigation.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled numeric value.',
    },
    {
      name: 'defaultValue',
      type: 'number',
      defaultValue: '1',
      description: 'Initial numeric value in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(next: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the clamped and rounded numeric value changes.',
    },
    {
      name: 'min',
      type: 'number',
      defaultValue: '0',
      description: 'Lower inclusive numeric bound (swaps cleanly with max when min > max).',
    },
    {
      name: 'max',
      type: 'number',
      defaultValue: '100',
      description: 'Upper inclusive numeric bound.',
    },
    {
      name: 'step',
      type: 'number',
      defaultValue: '1',
      description: 'Positive increment/decrement delta per step (falls back to 1 when <= 0 or non-finite).',
    },
    {
      name: 'precision',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Optional decimal rounding precision (0..10); inferred from step when omitted.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional visible field label programmatically linked to the spinbutton.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix rendered inside the recessed prism-well beside the input.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      defaultValue: "'md'",
      description: 'Visual density scale for the crystal buttons and recessed numeric well.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables Decrement/Increment buttons, keyboard stepping, and direct input editing.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<NumericStepper\n  label="Replicas"\n  defaultValue={3}\n  min={1}\n  max={32}\n  onChange={(next) => console.warn(next)}\n/>`,
    `<NumericStepper\n  label="Optical Blur"\n  defaultValue={12.5}\n  min={0}\n  max={48}\n  step={0.5}\n  precision={1}\n  unit="px"\n  size="lg"\n/>`,
  ],
};
