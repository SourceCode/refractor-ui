export const docs = {
  name: 'PricingTierMatrix',
  displayName: 'Pricing Tier Matrix',
  group: 'Commerce, Billing & Conversion',
  category: 'commerce-billing',
  keywords: [
    'pricing',
    'tiers',
    'plans',
    'billing',
    'subscription',
    'saas',
    'monthly',
    'annual',
    'conversion',
    'commerce',
  ],
  usage: {
    description:
      'Responsive optical-glass SaaS pricing matrix featuring a centered prism-crystal Monthly/Annual segmented toggle with an emerald savings pill, three-column prism-slab plan cards with popular-tier ring highlights and badges, clamped finite tabular price formatting, accessible included/excluded feature checklists, and primary/secondary tier CTAs.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Highlight exactly one recommended tier with popular: true so buyers can anchor value comparisons quickly without visual competition across cards.',
      },
      {
        guidance: true,
        description:
          'Default to annual billing (defaultBillingCycle="annual") with a clear annualSavingsLabel so visitors immediately see effective monthly savings while keeping Monthly one click away.',
      },
      {
        guidance: false,
        description:
          'Pass negative or NaN values expecting custom labels; PricingTierMatrix clamps non-finite or negative amounts to $0 and renders all copy strictly as literal text.',
      },
    ],
    accessibility: [
      {
        name: 'Segmented Billing Toggle State Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Grouped native buttons with aria-pressed state and keyboard-only focus rings',
        description:
          'Wraps Monthly and Annual buttons in a labelled role="group" container, exposing aria-pressed state and keyboard-only prism-focus-ring outlines.',
      },
      {
        name: 'Semantic Plan Landmarks & Feature Inclusion Labels',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'Named <article> cards linked via aria-labelledby and screen-reader included/excluded cues',
        description:
          'Pairs each pricing card heading with its <article> landmark and accompanies Check and Minus icons with sr-only "Included:" and "Not included:" prefixes.',
      },
    ],
  },
  props: [
    {
      name: 'tiers',
      type: 'ReadonlyArray<PricingTier>',
      defaultValue: 'required',
      description: 'Ordered pricing tiers rendered in the responsive optical slab matrix.',
    },
    {
      name: 'billingCycle',
      type: "'monthly' | 'annual'",
      defaultValue: 'undefined',
      description: 'Controlled billing cadence selection.',
    },
    {
      name: 'defaultBillingCycle',
      type: "'monthly' | 'annual'",
      defaultValue: "'annual'",
      description: 'Initial billing cadence when operating in uncontrolled mode.',
    },
    {
      name: 'onBillingCycleChange',
      type: '(cycle: BillingCycle) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the active billing cadence changes.',
    },
    {
      name: 'annualSavingsLabel',
      type: 'string',
      defaultValue: "'Save 20%'",
      description: 'Promotional emerald badge label rendered alongside the Annual toggle option.',
    },
    {
      name: 'onSelectTier',
      type: '(tier: PricingTier, cycle: BillingCycle) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when a user clicks a tier CTA button, receiving the chosen tier and active cycle.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and optical style overrides.',
    },
  ],
  examples: [
    `<PricingTierMatrix\n  defaultBillingCycle="annual"\n  annualSavingsLabel="Save 20%"\n  tiers={[\n    {\n      id: 'starter',\n      name: 'Starter',\n      description: 'Essential optical UI tooling for solo builders.',\n      monthlyPrice: 0,\n      annualPrice: 0,\n      ctaLabel: 'Start free',\n      features: [\n        { text: 'Core component library', included: true },\n        { text: 'Custom theme studio', included: false },\n      ],\n    },\n    {\n      id: 'pro',\n      name: 'Pro',\n      description: 'Full refraction system for product teams.',\n      monthlyPrice: 59,\n      annualPrice: 49,\n      popular: true,\n      badge: 'Most Popular',\n      ctaLabel: 'Upgrade to Pro',\n      features: [\n        { text: 'Core component library', included: true },\n        { text: 'Custom theme studio', included: true },\n      ],\n    },\n  ]}\n  onSelectTier={(tier, cycle) => console.warn(tier.id, cycle)}\n/>`,
  ],
};
