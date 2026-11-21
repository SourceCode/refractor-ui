export const docs = {
  name: 'CurrencyInput',
  displayName: 'Currency Input',
  group: 'Number, Currency & Formatted Type Fields',
  category: 'number-currency-fields',
  keywords: [
    'currency',
    'money',
    'amount',
    'price',
    'pricing',
    'finance',
    'billing',
    'decimal',
    'number',
    'usd',
    'eur',
    'jpy',
    'formatted',
  ],
  usage: {
    description:
      'Optical-glass monetary input slab pairing a recessed currency-prefixed prism-well text field (formatted with thousands commas when blurred and unformatted while editing), an inline prism-crystal currency selector that re-rounds to currency precision, and a live tabular readout pill.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide explicit min and max bounds aligned with your payment processor or accounting ledger limits so blur and Enter commits clamp deterministically.',
      },
      {
        guidance: true,
        description:
          'Configure zero-decimal currencies such as JPY with decimals: 0 so switching from USD automatically rounds fractional cents cleanly.',
      },
      {
        guidance: false,
        description:
          'Store formatted strings with commas or currency symbols in backend ledgers; persist the structured { amount, currency } CurrencyInputValue returned by onChange.',
      },
    ],
    accessibility: [
      {
        name: 'Programmatic Labels & Live Readout Status',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement: 'Explicit htmlFor input label, aria-label="Currency" on the currency selector, and polite role="status" readout pill',
        description:
          'Links the visible field label to the decimal input via useId(), labels the native currency selector with aria-label="Currency", and announces formatted monetary totals via role="status".',
      },
      {
        name: 'IME-Safe Commit & Keyboard-Only Focus Rings',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement: 'Guards Enter commit with !e.nativeEvent.isComposing and uses prism-focus-ring',
        description:
          'Prevents accidental numeric commits during IME composition while allowing keyboard users to confirm edits via Enter and switch currencies seamlessly.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'CurrencyInputValue',
      defaultValue: 'undefined',
      description: 'Controlled monetary value object ({ amount, currency }).',
    },
    {
      name: 'defaultValue',
      type: 'CurrencyInputValue',
      defaultValue: "{ amount: 1250.5, currency: 'USD' }",
      description: 'Initial monetary value when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(next: CurrencyInputValue) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the rounded, clamped { amount, currency } when the user commits an edit or switches currency.',
    },
    {
      name: 'currencies',
      type: 'CurrencyOption[]',
      defaultValue: 'DEFAULT_CURRENCIES',
      description: 'Selectable currencies defining ISO code, symbol prefix, label, and decimal precision (0..4).',
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
      defaultValue: '1000000000',
      description: 'Maximum permitted numeric amount.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Amount'",
      description: 'Visible label rendered in the optical slab header and linked to the input.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables both the monetary input and the inline currency selector.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<CurrencyInput\n  defaultValue={{ amount: 1250.5, currency: 'USD' }}\n  onChange={(next) => console.warn(next.amount, next.currency)}\n/>`,
    `<CurrencyInput\n  label="Invoice Total"\n  min={0}\n  max={500000}\n  defaultValue={{ amount: 42000, currency: 'JPY' }}\n/>`,
  ],
};
