export const docs = {
  name: 'QuadrantMatrix',
  displayName: 'Quadrant Matrix',
  group: 'Comparison, Ranking & Storytelling Visuals',
  category: 'comparison-storytelling-charts',
  keywords: [
    'quadrant',
    'matrix',
    '2x2',
    'prioritization',
    'effort-impact',
    'roadmap',
    'strategy',
    'quick-wins',
    'major-bets',
    'comparison',
    'storytelling',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass strategic 2×2 quadrant prioritization matrix plotting initiatives across customizable horizontal and vertical split thresholds (such as Implementation Effort vs. Strategic Impact), with four token-tinted quadrant zones, live quadrant filter pills with counts, weight-scaled interactive SVG bubbles, keyboard arrow navigation, and a recessed aria-live="polite" strategic inspector.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Plot 4 to 12 distinct strategic initiatives with normalized 0..100 coordinates and concise summaries so stakeholders can compare Quick Wins, Major Bets, Fill-Ins, and Reconsider candidates without visual clutter.',
      },
      {
        guidance: true,
        description:
          'Use splitX and splitY (clamped to 10..90) to model asymmetric capacity thresholds or executive impact bars while pairing custom quadrantLabels that reflect your domain vocabulary.',
      },
      {
        guidance: false,
        description:
          'Hardcode raw hex/rgb colors or pass unguarded external scores; QuadrantMatrix renders strictly through --prism-* CSS tokens (--prism-success-main, --prism-primary-main, --prism-info-main, --prism-error-main), clamps out-of-range coordinates safely, and renders a clean role="status" empty state when items is empty.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Quadrant Filtering & Roving Bubble Keyboard Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Filter pills expose aria-pressed with live per-quadrant counts, while plotted SVG initiative bubbles expose role="button", roving tabIndex, aria-pressed, descriptive coordinate aria-labels, IME-safe Enter/Space activation, ArrowLeft/ArrowRight navigation, and keyboard-only .prism-focus-ring focus indicators',
        description:
          'Keyboard users can filter initiatives by quadrant, tab directly to the active bubble, step across visible initiatives using ArrowLeft and ArrowRight, and activate selections without interfering with IME text composition.',
      },
      {
        name: 'Token-Driven Contrast & Polite Strategic Inspector Readout',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'Combines four semantic --prism-* tinted zones with corner watermark titles, dashed split axes, inline bubble labels, and a recessed prism-well aria-live="polite" inspector announcing Item, Quadrant Badge, X/Y Coordinates, and optional Summary',
        description:
          'Ensures quadrant classification and executive rationale remain clear across light, dark, and custom optical themes without relying exclusively on color.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<QuadrantItem>',
      defaultValue: 'DEFAULT_QUADRANT_ITEMS (8 roadmap items)',
      description:
        'Strategic initiatives { id, label, x, y, weight?, summary? } with x and y in 0..100; defaults to 8 realistic roadmap items across all 4 quadrants when omitted and shows a role="status" empty state when empty.',
    },
    {
      name: 'xLabel',
      type: 'string',
      defaultValue: "'Implementation Effort'",
      description: 'Horizontal axis label rendered beneath the matrix plot and in the inspector.',
    },
    {
      name: 'yLabel',
      type: 'string',
      defaultValue: "'Strategic Impact'",
      description: 'Vertical axis label rendered rotated along the left side of the plot and in the inspector.',
    },
    {
      name: 'quadrantLabels',
      type: 'Partial<QuadrantLabels>',
      defaultValue: "{ topLeft: 'Quick Wins', topRight: 'Major Bets', bottomLeft: 'Fill-Ins', bottomRight: 'Reconsider' }",
      description: 'Optional partial overrides for any of the four quadrant zone names.',
    },
    {
      name: 'splitX',
      type: 'number',
      defaultValue: '50',
      description: 'Vertical quadrant threshold divider clamped safely to 10..90.',
    },
    {
      name: 'splitY',
      type: 'number',
      defaultValue: '50',
      description: 'Horizontal quadrant threshold divider clamped safely to 10..90.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Strategic 2×2 Quadrant Matrix'",
      description: 'Card heading rendered in the sculpted prism-slab header and linked via aria-labelledby.',
    },
    {
      name: 'onSelectItem',
      type: '(selection: QuadrantSelection) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the selected QuadrantItem enriched with resolved quadrant zone id and quadrantLabel.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<QuadrantMatrix\n  title="Q3 Product Roadmap Prioritization"\n  xLabel="Implementation Effort"\n  yLabel="Strategic Impact"\n/>`,
    `<QuadrantMatrix\n  title="Security Remediation Matrix"\n  xLabel="Remediation Complexity"\n  yLabel="Risk Reduction"\n  splitX={40}\n  splitY={60}\n  quadrantLabels={{ topLeft: 'Patch Now', topRight: 'Architecturally Plan' }}\n  items={[\n    { id: 'mfa', label: 'Enforce MFA', x: 20, y: 92, weight: 2.4, summary: 'Blocks credential stuffing immediately.' },\n    { id: 'zero-trust', label: 'Zero-Trust Mesh', x: 82, y: 88, weight: 3.0, summary: 'Full east-west mTLS isolation.' },\n    { id: 'header-lint', label: 'CSP Header Audit', x: 25, y: 35, weight: 1.0 },\n    { id: 'legacy-vpn', label: 'Legacy VPN Rewrite', x: 78, y: 24, weight: 1.5 },\n  ]}\n/>`,
  ],
};

export default docs;
