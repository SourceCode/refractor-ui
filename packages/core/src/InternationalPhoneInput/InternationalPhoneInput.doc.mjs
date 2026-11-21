export const docs = {
  name: 'InternationalPhoneInput',
  displayName: 'International Phone Input',
  group: 'Number, Currency & Formatted Type Fields',
  category: 'number-currency-fields',
  keywords: [
    'phone',
    'telephone',
    'international',
    'e164',
    'dial-code',
    'country-code',
    'mask',
    'contact',
    'tel',
    'number',
  ],
  usage: {
    description:
      'Split optical-glass international telephone input pairing a searchable country dialing code dropdown (filtering by country name, ISO code, and dial code) with a recessed monospace national phone input that auto-formats digits via regional masks, emits canonical E.164 previews, and re-formats cleanly when switching countries.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Persist the canonical E.164 value (next.e164) in backend databases and SMS/verification APIs while retaining countryIso for localized UI re-hydration.',
      },
      {
        guidance: true,
        description:
          'Supply a tailored countries list when operating in specific regional markets while keeping national masks expressed with "#" digit placeholders.',
      },
      {
        guidance: false,
        description:
          'Append trailing separator characters manually during user input; rely on formatNationalPhone() so backspace and partial edits remain free of cursor traps.',
      },
    ],
    accessibility: [
      {
        name: 'Expandable Country Listbox & Telephone Semantics',
        criterion: '4.1.2 Name, Role, Value & 1.3.1 Info and Relationships',
        requirement:
          'Country trigger sets aria-expanded, aria-haspopup="listbox", and aria-controls; search combobox links aria-activedescendant to listbox options while the national input uses type="tel" and autoComplete="tel-national"',
        description:
          'Provides complete programmatic naming, state announcements, and native mobile keypad hints across assistive technologies.',
      },
      {
        name: 'IME-Safe Keyboard Navigation & Live E.164 Status',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'ArrowDown/ArrowUp cycling, !e.nativeEvent.isComposing Enter confirmation, Escape and outside-click dismissal, keyboard-only prism-focus-ring outlines, and a polite E.164 status pill',
        description:
          'Ensures full keyboard control over country selection without interrupting IME composition while politely surfacing the normalized E.164 output.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'PhoneInputValue',
      defaultValue: 'undefined',
      description: 'Controlled structured phone value containing countryIso, dialCode, nationalDigits, formatted, and e164.',
    },
    {
      name: 'defaultCountryIso',
      type: 'string',
      defaultValue: "'US'",
      description: 'Initial ISO 3166-1 alpha-2 country code in uncontrolled mode.',
    },
    {
      name: 'defaultNationalDigits',
      type: 'string',
      defaultValue: "''",
      description: 'Initial national phone digits in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(next: PhoneInputValue) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the country selection or national phone digits change.',
    },
    {
      name: 'countries',
      type: 'PhoneCountrySpec[]',
      defaultValue: 'DEFAULT_PHONE_COUNTRIES (9 regions)',
      description: 'Selectable regional phone specifications defining iso, name, dialCode, mask, and maxDigits.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Phone Number'",
      description: 'Visible label rendered above the split optical phone control.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables country selection, phone editing, and clearing.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<InternationalPhoneInput\n  label="Work Phone"\n  defaultCountryIso="US"\n  defaultNationalDigits="4155550199"\n  onChange={(next) => console.warn(next.e164)}\n/>`,
    `<InternationalPhoneInput\n  defaultCountryIso="GB"\n  onChange={(next) => saveContactPhone(next.e164)}\n/>`,
  ],
};
