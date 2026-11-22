export const docs = {
  name: 'SlopegraphChart',
  displayName: 'Slopegraph Chart',
  group: 'Comparison, Ranking & Storytelling Visuals',
  category: 'comparison-storytelling-charts',
  keywords: [
    'slopegraph',
    'slope-chart',
    'before-after',
    'comparison',
    'ranking',
    'rank-shift',
    'delta',
    'storytelling',
    'adoption',
    'tufte',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass before-and-after slopegraph chart inside a sculpted prism-slab card with directional filter pills (All, Rising Only, Declining Only), a net average change badge, a responsive 460×250 dual-axis SVG inside a recessed prism-well featuring anti-overlap rail label placement, directional or explicit --prism-* semantic coloring, interactive series elevation with sibling dimming, and a recessed aria-live="polite" telemetry readout surfacing signed delta, percentage change, and competition rank shift.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use SlopegraphChart to spotlight before/after shifts across 3 to 12 comparable metrics (such as quarterly feature adoption or cohort retention) where both absolute delta and relative rank movement tell the story.',
      },
      {
        guidance: true,
        description:
          'Leave item tone unset when directional rising (--prism-success-main) vs declining (--prism-error-main) contrast is the primary message, and assign an explicit tone only to call out a flagship benchmark series.',
      },
      {
        guidance: false,
        description:
          'Pass raw hex or rgb colors or pre-compute percentage change for zero baselines; SlopegraphChart maps every hue strictly to --prism-* tokens and returns deltaPct: null with an "N/A" readout whenever startValue === 0.',
      },
    ],
    accessibility: [
      {
        name: 'Focusable Slope Lines & Keyboard Traversal',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each visible slope line exposes role="button", tabIndex={0}, aria-pressed, and a complete start-to-end aria-label with IME-safe Enter/Space selection, ArrowUp/ArrowDown wrap-around stepping, Escape clear, and keyboard-only prism-focus-ring outlines',
        description:
          'Keyboard and assistive-technology users can traverse every series line, elevate the focused or selected trajectory while softly dimming siblings, and inspect full metrics without pointer interaction.',
      },
      {
        name: 'Direction Filter Pills & Polite Live Readout',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'All / Rising Only / Declining Only pills declare aria-pressed alongside an aria-live="polite" recessed prism-well readout announcing Series, Start → End, Signed Delta, % Change, and Rank Shift (#start → #end), plus role="status" empty states',
        description:
          'Surfaces quantitative delta, percentage change, and rank movement textually across light, dark, and custom Refractor themes without relying exclusively on line color or slope angle.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<SlopeSeriesItem>',
      defaultValue: '6 default Q1 vs Q4 product adoption metrics',
      description:
        'Series records ({ id, label, startValue, endValue, tone? }) plotted between the start and end rails; passing [] or non-finite-only items renders a clean role="status" empty state.',
    },
    {
      name: 'startLabel',
      type: 'string',
      defaultValue: "'Q1 2026'",
      description: 'Column heading rendered above the left vertical reference rail.',
    },
    {
      name: 'endLabel',
      type: 'string',
      defaultValue: "'Q4 2026'",
      description: 'Column heading rendered above the right vertical reference rail.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'%'",
      description: 'Unit suffix appended to start values, end values, signed deltas, and the net average badge.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Before / After Slopegraph'",
      description: 'Heading rendered in the sculpted prism-slab header and linked via aria-labelledby.',
    },
    {
      name: 'onSelectItem',
      type: '(selection: SlopeSeriesSelection) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the selected item augmented with computed { delta, deltaPct, startRank, endRank } when a series is clicked, activated with Enter/Space, or stepped onto via ArrowUp/ArrowDown.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<SlopegraphChart\n  title="Product Feature Adoption"\n  startLabel="Q1 2026"\n  endLabel="Q4 2026"\n  unit="%"\n  onSelectItem={(selection) => {\n    void selection;\n  }}\n/>`,
    `<SlopegraphChart\n  title="Regional Latency Reduction"\n  startLabel="v1.0"\n  endLabel="v2.0"\n  unit="ms"\n  items={[\n    { id: 'us-east', label: 'US East', startValue: 142, endValue: 64, tone: 'primary' },\n    { id: 'eu-west', label: 'EU West', startValue: 168, endValue: 78, tone: 'secondary' },\n    { id: 'ap-south', label: 'AP South', startValue: 210, endValue: 224, tone: 'amber' },\n  ]}\n/>`,
  ],
};

export default docs;
