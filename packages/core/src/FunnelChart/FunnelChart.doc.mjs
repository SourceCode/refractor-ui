export const docs = {
  name: 'FunnelChart',
  displayName: 'Funnel Chart',
  group: 'Part-to-Whole & Hierarchical Visuals',
  category: 'part-to-whole-charts',
  keywords: [
    'funnel',
    'conversion',
    'dropoff',
    'retention',
    'pipeline',
    'part-to-whole',
    'stages',
    'chart',
    'analytics',
  ],
  usage: {
    description:
      'Optical-glass conversion funnel chart rendering centered, progressively narrowing stage tiers powered exclusively by --prism-* CSS custom properties and prism-well / prism-crystal glass geometry, complete with tabular counts, overall conversion percentages, optional stage-to-stage drop-off badges, and an interactive recessed stage summary footer.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Order FunnelStage entries chronologically from initial entry volume to final conversion so step-to-step drop-off badges and end-to-end conversion percentages read naturally.',
      },
      {
        guidance: true,
        description:
          'Provide a concise valueUnit (such as "users", "k", or "leads") when counts benefit from explicit units across tier rows and the summary footer.',
      },
      {
        guidance: false,
        description:
          'Pass negative or NaN values expecting sub-zero tiers; non-finite and negative stage volumes are sanitized to 0 and bar widths clamp between 18% and 100% to preserve label legibility.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Stage Selection & Live Summary',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each funnel stage is a native button with aria-pressed, descriptive aria-label, keyboard-only prism-focus-ring, IME-safe Enter/Space activation, and an aria-live="polite" summary footer',
        description:
          'Keyboard and assistive-technology users can navigate every stage tier, activate selection, and hear exact volume, overall percentage, and step conversion updates.',
      },
      {
        name: 'Token-Driven Contrast & Clamped Geometry',
        criterion: '1.4.3 Contrast (Minimum) & 1.4.1 Use of Color',
        requirement:
          'Pairs semantic --prism-*-main fills with matching --prism-*-contrast text tokens and enforces a minimum 18% bar width so conversion labels never clip or collapse',
        description:
          'Stage labels, tabular values, overall conversion %, and drop-off badges remain legible in light, dark, and custom Refractor themes without relying solely on color.',
      },
    ],
  },
  props: [
    {
      name: 'stages',
      type: 'FunnelStage[]',
      defaultValue: 'required',
      description: 'Ordered array of { id, label, value, tone? } stages plotted from top entry to final conversion.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Conversion Funnel'",
      description: 'Heading displayed in the optical card header and linked to the chart region.',
    },
    {
      name: 'showDropoff',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Controls visibility of stage-to-stage drop-off badges between consecutive funnel stages.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix appended to stage counts and selected stage summary values.',
    },
    {
      name: 'onSelectStage',
      type: '(stage: FunnelStage, overallPct: number, stepPct: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the selected stage, overall conversion %, and step conversion %.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<FunnelChart\n  title="Checkout Conversion"\n  valueUnit="users"\n  stages={[\n    { id: 'visit', label: 'Product Visit', value: 1000, tone: 'primary' },\n    { id: 'cart', label: 'Added to Cart', value: 658, tone: 'secondary' },\n    { id: 'checkout', label: 'Checkout Started', value: 320, tone: 'amber' },\n    { id: 'purchase', label: 'Order Completed', value: 145, tone: 'emerald' },\n  ]}\n/>`,
  ],
};
