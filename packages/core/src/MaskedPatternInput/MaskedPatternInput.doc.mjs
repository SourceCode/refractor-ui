export const docs = {
  name: 'MaskedPatternInput',
  displayName: 'Masked Pattern Input',
  group: 'Number, Currency & Formatted Type Fields',
  category: 'number-currency-fields',
  keywords: [
    'mask',
    'pattern',
    'formatted',
    'license',
    'ipv4',
    'cidr',
    'mac',
    'tax-id',
    'ein',
    'alphanumeric',
    'hex',
    'input',
  ],
  usage: {
    description:
      'Optical-glass pattern-masked input slab supporting built-in presets (IPv4, CIDR, MAC address, license key, and tax ID) as well as arbitrary custom masks using "#" (digit), "A" (letter), "H" (hex), and "*" (alphanumeric) tokens, paired with a monospace pattern hint pill, live emerald Complete/Incomplete status pill, and one-click clear button.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use the built-in preset prop ("ipv4", "cidr", "mac", "license", "tax-id") for common structured identifiers, or supply a custom pattern prop to override the preset cleanly.',
      },
      {
        guidance: true,
        description:
          'Inspect meta.complete and meta.unmasked from onChange before enabling form submission so partial codes are never dispatched as valid identifiers.',
      },
      {
        guidance: false,
        description:
          'Strip separators with ad-hoc regular expressions after receiving input; consume meta.unmasked directly from applyPatternMask() or the onChange callback.',
      },
    ],
    accessibility: [
      {
        name: 'Programmatic Input Labeling & Live Completion Status',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement:
          'Explicit htmlFor label binding via useId() (with aria-label fallback when label is empty) and a polite role="status" Complete/Incomplete pill',
        description:
          'Keeps the masked monospace input clearly identified and notifies assistive technologies as the user transitions between Incomplete and Complete states.',
      },
      {
        name: 'Keyboard-Only Focus Rings & Disabled Affordances',
        criterion: '2.4.7 Focus Visible & 4.1.2 Name, Role, Value',
        requirement:
          'Uses prism-focus-ring keyboard focus indicators and pairs disabled with disabled:cursor-not-allowed across both the input and Clear button',
        description:
          'Preserves crisp keyboard navigation while preventing pointer hover promises or mutations when disabled.',
      },
    ],
  },
  props: [
    {
      name: 'pattern',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Custom mask pattern using "#" (digit), "A" (letter), "H" (hex), and "*" (alphanumeric). Overrides preset when non-empty.',
    },
    {
      name: 'preset',
      type: "'ipv4' | 'cidr' | 'mac' | 'license' | 'tax-id'",
      defaultValue: "'license'",
      description: 'Built-in mask preset identifier resolved via MASK_PRESETS when pattern is omitted or empty.',
    },
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled input value formatted through the active mask pattern.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "''",
      description: 'Initial value in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(masked: string, meta: MaskedPatternMeta) => void',
      defaultValue: 'undefined',
      description: 'Callback fired on every edit or clear with the formatted masked string and { unmasked, complete } metadata.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Formatted Code'",
      description: 'Visible label rendered in the optical slab header.',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: 'activePattern',
      description: 'Optional placeholder override; defaults to the active mask pattern.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables editing and clearing the masked input.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<MaskedPatternInput\n  preset="license"\n  label="Activation Key"\n  onChange={(masked, meta) => console.warn(masked, meta.complete)}\n/>`,
    `<MaskedPatternInput\n  preset="mac"\n  label="Hardware MAC Address"\n  defaultValue="aa:bb:cc:dd:ee:ff"\n/>`,
    `<MaskedPatternInput\n  pattern="AA-####"\n  label="Asset Tag"\n  placeholder="US-0042"\n/>`,
  ],
};
