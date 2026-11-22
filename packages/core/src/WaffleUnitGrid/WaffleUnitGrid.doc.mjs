export const docs = {
  name: 'WaffleUnitGrid',
  displayName: 'Waffle Unit Grid',
  group: 'Comparison, Ranking & Storytelling Visuals',
  category: 'comparison-storytelling-charts',
  keywords: [
    'waffle',
    'unit-grid',
    'square-pie',
    'proportion',
    'part-to-whole',
    'hamilton-rounding',
    'largest-remainder',
    'percentage',
    'storytelling',
    'comparison',
    'allocation',
    'chart',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass Waffle Unit Grid proportion chart inside a sculpted prism-slab card with a grid resolution pill (e.g. "100 units · 1 sq = 1.0%"), grand total badge, responsive 2-column layout pairing an exact rows×columns rounded unit-square SVG matrix allocated with Largest-Remainder (Hamilton) rounding (guaranteeing zero off-by-one square drift across all 6 semantic --prism-* tones) with interactive keyboard-accessible category breakdown cards and an aria-live="polite" recessed storytelling callout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use the default 10×10 grid (100 units) for executive storytelling so every square represents exactly 1.0%, making fractional shares immediately countable without mental division.',
      },
      {
        guidance: true,
        description:
          'Keep datasets between 2 and 6 distinct categories and pair a concise unit (e.g. "%", "k", "seats", "GB") so the breakdown cards and live storytelling callout remain scannable on mobile and desktop viewports.',
      },
      {
        guidance: false,
        description:
          'Pass negative, zero, or non-finite values expecting blank placeholder tiles; invalid values are sanitized out automatically, and empty or non-positive datasets render a clean role="status" empty state.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Breakdown Cards with IME-Safe Keyboard Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each category breakdown card exposes role="button", tabIndex={0}, aria-pressed, and a complete quantitative aria-label with IME-safe Enter/Space selection toggle, Escape clear, ArrowUp/ArrowDown/ArrowLeft/ArrowRight navigation, and keyboard-only prism-focus-ring outlines',
        description:
          'Allows keyboard and screen-reader users to isolate any category cleanly without tabbing through 100+ individual matrix squares, while visually illuminating matching unit squares and softly dimming sibling squares.',
      },
      {
        name: 'Accessible SVG Summary & Polite Storytelling Callout',
        criterion: '1.1.1 Non-text Content, 1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'The unit matrix SVG declares role="img" summarizing grid dimensions and category count, derives all tile fills exclusively from --prism-* semantic tokens, and pairs with an aria-live="polite" prism-well callout announcing "<cellCount> of <totalCells> units (<sharePct>%) — <label>"',
        description:
          'Ensures part-to-whole proportions remain accessible across light, dark, and custom Refractor optical themes without relying on raw colors or visual square counting alone.',
      },
    ],
  },
  props: [
    {
      name: 'segments',
      type: 'ReadonlyArray<WaffleSegment>',
      defaultValue: '4 default cloud budget / user plan segments (Enterprise Plan, Pro Teams, Starter Cloud, Sandbox & Free)',
      description:
        'Ordered array of { id, label, value, tone? } proportion segments. Pass [] or non-positive values to render the clean role="status" empty state.',
    },
    {
      name: 'rows',
      type: 'number',
      defaultValue: '10',
      description: 'Number of rows in the unit-square matrix (clamped to 4..12).',
    },
    {
      name: 'columns',
      type: 'number',
      defaultValue: '10',
      description: 'Number of columns in the unit-square matrix (clamped to 5..20; default 10×10 = 100 units).',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'%'",
      description: 'Unit suffix appended to raw segment values and the grand total badge (e.g. "%", "k", "seats").',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'10×10 Waffle Unit Proportion'",
      description: 'Heading displayed in the sculpted prism-slab header and linked to the chart region and SVG.',
    },
    {
      name: 'onSelectSegment',
      type: '(segment: WaffleResolvedSegment) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with { id, label, value, tone, sharePct, cellCount } whenever a category card or unit square is selected.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<WaffleUnitGrid\n  title="Cloud Plan Mix"\n  onSelectSegment={(segment) => {\n    void segment;\n  }}\n/>`,
    `<WaffleUnitGrid\n  title="Q4 Compute Budget Allocation"\n  rows={8}\n  columns={10}\n  unit="k"\n  segments={[\n    { id: 'gpu', label: 'GPU Training', value: 340, tone: 'primary' },\n    { id: 'inference', label: 'Live Inference', value: 215, tone: 'secondary' },\n    { id: 'storage', label: 'Vector Storage', value: 120, tone: 'emerald' },\n    { id: 'egress', label: 'Global Egress', value: 75, tone: 'rose' },\n  ]}\n/>`,
  ],
};

export default docs;
