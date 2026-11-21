export const docs = {
  name: 'WaterfallChart',
  displayName: 'Waterfall Chart',
  group: 'Part-to-Whole & Hierarchical Visuals',
  category: 'part-to-whole-charts',
  keywords: [
    'waterfall',
    'bridge',
    'pnl',
    'financial',
    'cumulative',
    'delta',
    'variance',
    'running-total',
    'part-to-whole',
    'svg',
    'chart',
  ],
  usage: {
    description:
      'Financial and variance bridge optical-glass waterfall chart plotting start anchors, floating positive/negative deltas, and cumulative total columns linked by dashed horizontal connectors across positive and negative trajectories using semantic --prism-* CSS custom properties.',
    bestPractices: [
      {
        guidance: true,
        description:
          "Anchor your bridge with kind: 'start' and conclude subtotals or final outcomes with kind: 'total' so WaterfallChart computes cumulative totals automatically without manual arithmetic drift.",
      },
      {
        guidance: true,
        description:
          "Pair valuePrefix (e.g. '$') and valueSuffix (e.g. 'k' or 'M') so signed deltas (+$45k / -$18k) and running totals stay compact across axis ticks, bar annotations, and the recessed prism-well readout.",
      },
      {
        guidance: false,
        description:
          'Rely on manual total overrides after prior cumulative steps; once prior steps establish a running trajectory, total bars intentionally reflect the true cumulative running total.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Waterfall Bars & Live Trajectory Readout',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Keyboard-focusable SVG step bars with IME-safe Enter/Space activation and polite live readout announcing step label, signed delta, and running total',
        description:
          'Every waterfall bar declares role="button", tabIndex={0}, a full descriptive aria-label including step kind, signed delta, and running total, and keyboard-only prism-focus-ring outlines.',
      },
      {
        name: 'Accessible SVG Labeling & Zero Baseline Clarity',
        criterion: '1.1.1 Non-text Content',
        requirement: 'role="img" SVG paired with semantic legend pills, zero baseline rule, and empty status region',
        description:
          'Combines explicit color-coded legend pills, a high-contrast zero baseline rule for negative crossings, and a clean role="status" empty notice when steps is empty.',
      },
    ],
  },
  props: [
    {
      name: 'steps',
      type: 'WaterfallStep[]',
      defaultValue: 'required',
      description:
        "Ordered array of { id, label, value, kind? } steps where kind is 'start' | 'increase' | 'decrease' | 'total' (inferred from value sign when omitted).",
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'P&L Waterfall'",
      description: 'Heading displayed in the chart card header.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '240',
      description: 'SVG chart height in pixels, safely clamped between 160 and 480.',
    },
    {
      name: 'valuePrefix',
      type: 'string',
      defaultValue: "'$'",
      description: 'Prefix prepended to formatted values and signed deltas (sign appears before prefix, e.g. +$45k / -$18k).',
    },
    {
      name: 'valueSuffix',
      type: 'string',
      defaultValue: "''",
      description: 'Optional unit suffix appended to formatted axis ticks, bar annotations, and selection readouts.',
    },
    {
      name: 'onSelectStep',
      type: '(step: WaterfallStep, runningTotal: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the selected WaterfallStep and its computed running total when any bar is clicked or activated via keyboard.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<WaterfallChart\n  title="Q4 Operating P&L Bridge"\n  valuePrefix="$"\n  valueSuffix="k"\n  steps={[\n    { id: 'rev', label: 'Opening', value: 120, kind: 'start' },\n    { id: 'new', label: 'New Sales', value: 45, kind: 'increase' },\n    { id: 'cogs', label: 'COGS', value: 18, kind: 'decrease' },\n    { id: 'opex', label: 'OpEx', value: -32 },\n    { id: 'ebitda', label: 'EBITDA', value: 0, kind: 'total' },\n  ]}\n/>`,
  ],
};
