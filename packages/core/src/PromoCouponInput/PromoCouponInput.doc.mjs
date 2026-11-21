export const docs = {
  name: 'PromoCouponInput',
  displayName: 'Promo & Coupon Code Input',
  group: 'Commerce, Billing & Conversion',
  category: 'commerce-billing',
  keywords: [
    'promo',
    'coupon',
    'discount',
    'voucher',
    'code',
    'checkout',
    'commerce',
    'billing',
    'savings',
  ],
  usage: {
    description:
      'Compact optical-glass slab bar combining a recessed uppercase promo-code input well, an IME-safe Apply button, accessible inline validation alerts, and a removable emerald savings tag pill for applied coupons.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Return a concise AppliedCoupon object containing normalized code, label, and optional discountText so shoppers can confirm their savings at a glance.',
      },
      {
        guidance: true,
        description:
          'Return a descriptive error string from onApply when a code has expired or requires a higher minimum spend, or return null for unrecognized codes.',
      },
      {
        guidance: false,
        description:
          'Inject raw HTML into coupon labels or error messages; PromoCouponInput renders all strings strictly as literal text.',
      },
    ],
    accessibility: [
      {
        name: 'Validation Alert & Input Association',
        criterion: '3.3.1 Error Identification & 4.1.3 Status Messages',
        requirement: 'aria-invalid, aria-describedby, role="alert" for errors, role="status" for applied savings',
        description:
          'Links validation feedback to the text input via aria-describedby, announces errors via role="alert", and announces applied promo codes politely via role="status".',
      },
      {
        name: 'IME-Safe Enter Submission & Keyboard Focus',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement: 'Guards Enter with !e.nativeEvent.isComposing and uses keyboard-only prism-focus-ring',
        description:
          'Prevents accidental submission during CJK/IME composition while allowing Enter submission and keyboard removal of applied coupon pills.',
      },
    ],
  },
  props: [
    {
      name: 'appliedCoupon',
      type: 'AppliedCoupon | null',
      defaultValue: 'undefined',
      description: 'Controlled applied coupon state (pass null when no coupon is active).',
    },
    {
      name: 'defaultAppliedCoupon',
      type: 'AppliedCoupon | null',
      defaultValue: 'null',
      description: 'Initial applied coupon when used in uncontrolled mode.',
    },
    {
      name: 'onApply',
      type: '(code: string) => AppliedCoupon | string | null',
      defaultValue: 'required',
      description:
        'Invoked with trimmed uppercase promo code; returns an AppliedCoupon on success, an error message string, or null.',
    },
    {
      name: 'onRemove',
      type: '(code: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the removed promo code when the savings pill is dismissed.',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "'Enter promo code (e.g. PRISM20)'",
      description: 'Placeholder text rendered inside the recessed promo input well.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables the input, Apply button, and Remove pill button.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<PromoCouponInput\n  onApply={(code) => {\n    if (code === 'PRISM20') {\n      return { code: 'PRISM20', label: '20% off', discountText: '-$29.80' };\n    }\n    return 'Promo code expired or unrecognized.';\n  }}\n/>`,
  ],
};
