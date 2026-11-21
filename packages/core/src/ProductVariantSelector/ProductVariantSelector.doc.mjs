export const docs = {
  name: 'ProductVariantSelector',
  displayName: 'Product Variant Selector',
  group: 'Commerce, Billing & Conversion',
  category: 'commerce-billing',
  keywords: [
    'product',
    'variant',
    'swatch',
    'color',
    'size',
    'material',
    'sku',
    'selector',
    'ecommerce',
    'commerce',
  ],
  usage: {
    description:
      'Optical-glass product configuration selector combining token-driven circular color swatch orbs, crystal/primary size and material pills, unavailable strikethrough disabled states, prototype-safe Map selection state, live computed tabular pricing (basePrice + priceDelta), availability status badge, and URL-sanitized thumbnail previews.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Map color swatches to semantic VariantSwatchTone tokens (primary, secondary, emerald, cobalt, obsidian, alabaster) so finishes automatically adapt to active optical themes without hardcoded hex colors.',
      },
      {
        guidance: true,
        description:
          'Surface out-of-stock options with available: false rather than hiding them so shoppers can see the full catalog range while preventing invalid selections.',
      },
      {
        guidance: false,
        description:
          'Pass untrusted javascript: or SVG data URIs to previewImageSrc; ProductVariantSelector filters every preview URL through sanitizeUrl(src, true) and omits unsafe sources.',
      },
    ],
    accessibility: [
      {
        name: 'Grouped Radiogroup Semantics',
        criterion: '4.1.2 Name, Role, Value & 1.3.1 Info and Relationships',
        requirement: 'role="radiogroup" linked to each group label with role="radio" and aria-checked options',
        description:
          'Each attribute group uses role="radiogroup" with aria-labelledby and renders native buttons with role="radio", aria-checked, descriptive aria-label on color orbs, and keyboard-only prism-focus-ring outlines.',
      },
      {
        name: 'Disabled Guard & Live Availability Announcements',
        criterion: '4.1.3 Status Messages & 2.1.1 Keyboard',
        requirement: 'disabled:cursor-not-allowed on unavailable options and polite role="status" availability badge',
        description:
          'Unavailable variants are natively disabled with strikethrough visual cues and announce live configuration stock status via role="status" aria-live="polite".',
      },
    ],
  },
  props: [
    {
      name: 'groups',
      type: 'ReadonlyArray<VariantGroup>',
      defaultValue: 'required',
      description: 'Ordered variant groups containing color, size, or material options.',
    },
    {
      name: 'selected',
      type: 'Readonly<Record<string, string>>',
      defaultValue: 'undefined',
      description: 'Controlled map of group IDs to selected option IDs.',
    },
    {
      name: 'defaultSelected',
      type: 'Readonly<Record<string, string>>',
      defaultValue: 'undefined',
      description: 'Initial selection record for uncontrolled mode; omitted groups default to their first available option.',
    },
    {
      name: 'onChange',
      type: '(next: Record<string, string>) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with a clean prototype-safe selection map whenever a variant option is chosen.',
    },
    {
      name: 'basePrice',
      type: 'number',
      defaultValue: '129',
      description: 'Base unit price before summing selected option priceDelta values.',
    },
    {
      name: 'currencySymbol',
      type: 'string',
      defaultValue: "'$'",
      description: 'Currency symbol prefix applied to the live total and option price deltas.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and optical style overrides.',
    },
  ],
  examples: [
    `<ProductVariantSelector\n  basePrice={129}\n  groups={[\n    {\n      id: 'finish',\n      label: 'Finish',\n      options: [\n        { id: 'solar', label: 'Solar Amber', kind: 'color', swatchTone: 'primary' },\n        { id: 'emerald', label: 'Emerald Tide', kind: 'color', swatchTone: 'emerald', priceDelta: 15 },\n        { id: 'obsidian', label: 'Obsidian Matte', kind: 'color', swatchTone: 'obsidian', available: false },\n      ],\n    },\n    {\n      id: 'size',\n      label: 'Size',\n      options: [\n        { id: 'sm', label: 'Small', kind: 'size' },\n        { id: 'md', label: 'Medium', kind: 'size', priceDelta: 10 },\n        { id: 'lg', label: 'Large', kind: 'size', priceDelta: 25 },\n      ],\n    },\n  ]}\n  onChange={(next) => console.warn(next)}\n/>`,
  ],
};
