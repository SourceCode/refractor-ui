export const docs = {
  name: 'ShoppingCartDrawer',
  displayName: 'Shopping Cart Drawer & Inline Order Summary',
  group: 'Commerce, Billing & Conversion',
  category: 'commerce-billing',
  keywords: [
    'cart',
    'shopping-cart',
    'drawer',
    'checkout',
    'commerce',
    'billing',
    'order-summary',
    'quantity',
    'ecommerce',
  ],
  usage: {
    description:
      'Optical-glass shopping cart supporting both right-anchored slide-over drawer and embedded inline card layouts, with controlled or uncontrolled line items, sanitized thumbnails, accessible quantity steppers, tabular subtotal/discount/tax/total breakdowns, and a primary Checkout CTA.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use mode="drawer" for persistent storefront cart overlays and mode="inline" inside dedicated checkout review steps.',
      },
      {
        guidance: true,
        description:
          'Specify maxQuantity on inventory-constrained items so the quantity stepper prevents over-ordering.',
      },
      {
        guidance: false,
        description:
          'Pass unvalidated HTML or javascript: thumbnail URIs; ShoppingCartDrawer renders copy literally and strips unsafe URLs via sanitizeUrl.',
      },
    ],
    accessibility: [
      {
        name: 'Dialog & Region Semantics with Escape Dismissal',
        criterion: '2.1.2 No Keyboard Trap & 4.1.2 Name, Role, Value',
        requirement: 'role="dialog" aria-modal="true" in drawer mode; role="region" in inline mode',
        description:
          'Links the cart heading via aria-labelledby, closes cleanly on Escape or backdrop click in drawer mode, and provides descriptive aria-labels on every stepper and remove button.',
      },
      {
        name: 'Live Quantity Feedback & Disabled Checkout Guard',
        criterion: '4.1.3 Status Messages',
        requirement: 'aria-live="polite" quantity readouts and disabled checkout button when empty',
        description:
          'Announces line-item quantity adjustments politely and disables the primary Checkout action when the cart contains no items.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<CartLineItem>',
      defaultValue: 'undefined',
      description: 'Controlled line items displayed in the cart.',
    },
    {
      name: 'defaultItems',
      type: 'ReadonlyArray<CartLineItem>',
      defaultValue: '[]',
      description: 'Initial line items when operating in uncontrolled mode.',
    },
    {
      name: 'onItemsChange',
      type: '(next: CartLineItem[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated item list after stepper or remove actions.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled visibility state in drawer mode.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Initial visibility state in uncontrolled drawer mode.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the drawer opens or closes.',
    },
    {
      name: 'mode',
      type: "'drawer' | 'inline'",
      defaultValue: "'drawer'",
      description: 'Renders either an edge-anchored overlay drawer or an inline optical slab card.',
    },
    {
      name: 'discountAmount',
      type: 'number',
      defaultValue: '0',
      description: 'Fixed monetary discount subtracted from subtotal before tax (clamped to subtotal).',
    },
    {
      name: 'taxRate',
      type: 'number',
      defaultValue: '0',
      description: 'Estimated tax rate as a decimal fraction clamped to 0..0.5.',
    },
    {
      name: 'currencySymbol',
      type: 'string',
      defaultValue: "'$'",
      description: 'Currency prefix displayed before formatted monetary amounts.',
    },
    {
      name: 'onCheckout',
      type: '(summary: CartCheckoutSummary) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with subtotal, discount, tax, total, and items when Checkout is clicked.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Shopping Cart'",
      description: 'Heading text shown in the cart header.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ShoppingCartDrawer\n  mode="inline"\n  title="Your Order"\n  defaultItems={[\n    {\n      id: 'kit-pro',\n      name: 'Refractor UI Pro License',\n      variant: 'Team (5 seats)',\n      unitPrice: 149,\n      quantity: 1,\n      maxQuantity: 10,\n    },\n  ]}\n  discountAmount={20}\n  taxRate={0.08}\n  onCheckout={(summary) => console.warn(summary.total)}\n/>`,
  ],
};
