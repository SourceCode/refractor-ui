export const docs = {
  name: 'PaymentCardInput',
  displayName: 'Payment Card Input',
  group: 'Commerce, Billing & Conversion',
  category: 'commerce-billing',
  keywords: [
    'payment',
    'card',
    'credit-card',
    'billing',
    'checkout',
    'luhn',
    'visa',
    'mastercard',
    'amex',
    'discover',
    'cvc',
    'expiry',
    'commerce',
  ],
  usage: {
    description:
      'Optical-glass payment card input slab with live Visa, Mastercard, Amex, and Discover brand detection, automatic 4-6-5 and 4-4-4-4 card number formatting, standard Luhn checksum validation with an emerald Valid badge and alert error hint, MM/YY expiry formatting with 01..12 month clamping, brand-aware 3/4-digit monospace CVC, optional cardholder name field, and gated submission.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass an onSubmit callback to render the gated refractive primary CTA that unlocks only once all fields are complete, the Luhn check passes, and the input is enabled.',
      },
      {
        guidance: true,
        description:
          'Pair PaymentCardInput with your PCI-compliant tokenization flow on submit and avoid persisting raw card numbers or CVC values in browser storage or application logs.',
      },
      {
        guidance: false,
        description:
          'Bypass server-side payment gateway validation solely because isValidLuhn is true; Luhn verification catches typographical errors client-side and complements processor checks.',
      },
    ],
    accessibility: [
      {
        name: 'Programmatic Labels & Autofill Semantics',
        criterion: '1.3.1 Info and Relationships & 1.3.5 Identify Input Purpose',
        requirement: 'Explicit htmlFor label linkage and standard cc-number, cc-exp, cc-csc, cc-name autocomplete attributes',
        description:
          'Every recessed prism-well input pairs a visible label via unique useId() identifiers with standard payment autocomplete tokens and numeric inputMode hints.',
      },
      {
        name: 'Live Validation Status, Error Alerts & IME Safety',
        criterion: '3.3.1 Error Identification, 4.1.3 Status Messages & 2.1.1 Keyboard',
        requirement: 'aria-invalid, aria-describedby role="alert" Luhn error, polite Valid status badge, and isComposing Enter guard',
        description:
          'Announces valid checksum completion via a polite status badge, associates failed Luhn checksum errors with role="alert" and aria-invalid, displays keyboard-only prism-focus-ring outlines, and ignores Enter while IME composition is active.',
      },
    ],
  },
  props: [
    {
      name: 'defaultCardholderName',
      type: 'string',
      defaultValue: "''",
      description: 'Initial value for the cardholder name field when shown.',
    },
    {
      name: 'onChange',
      type: '(val: PaymentCardValue) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever card number, expiry, CVC, or cardholder name changes with formatted values, detected brand, isValidLuhn, and isComplete.',
    },
    {
      name: 'onSubmit',
      type: '(val: PaymentCardValue) => void',
      defaultValue: 'undefined',
      description:
        'Optional submit callback; renders the primary submit button enabled only when isComplete && isValidLuhn && !disabled and also triggers on IME-safe Enter.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all payment card inputs and prevents submission.',
    },
    {
      name: 'showCardholderName',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Controls visibility and completion requirement of the cardholder name field.',
    },
    {
      name: 'submitLabel',
      type: 'string',
      defaultValue: "'Confirm Payment Method'",
      description: 'Label displayed on the optional optical primary submit button.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<PaymentCardInput\n  defaultCardholderName="Ada Lovelace"\n  onChange={(val) => console.warn(val.brand, val.isValidLuhn)}\n  onSubmit={(val) => tokenizeCard(val)}\n/>`,
    `<PaymentCardInput\n  showCardholderName={false}\n  submitLabel="Save Card"\n  onSubmit={(val) => saveCard(val)}\n/>`,
  ],
};
