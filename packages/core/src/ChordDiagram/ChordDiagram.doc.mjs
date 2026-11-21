export const docs = {
  name: 'ChordDiagram',
  displayName: 'Chord Diagram',
  group: 'Relational & Flow Visuals',
  category: 'relational-flow-charts',
  keywords: [
    'chord',
    'relational',
    'flow',
    'bi-directional',
    'matrix',
    'ribbon',
    'network',
    'circular',
    'diagram',
    'svg',
    'analytics',
  ],
  usage: {
    description:
      'Optical-glass bi-directional chord diagram arranging entity arc segments around a circular perimeter with subtle angular gaps and proportional curved quadratic-bezier SVG chord ribbons connecting source and target entities, with interactive focus highlighting, unrelated-chord dimming (opacity 0.14), recessed prism-well outbound/inbound telemetry, and --prism-* semantic token styling.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide 3–8 entities with concise labels and distinct ChordTone assignments so perimeter arcs and intersecting chord ribbons remain visually scannable.',
      },
      {
        guidance: true,
        description:
          'Supply a concise valueUnit (such as "req/s", "MB", or "k") so outbound, inbound, and aggregate flow telemetry readouts remain self-explanatory across themes.',
      },
      {
        guidance: false,
        description:
          'Pass non-positive, NaN, or dangling source/target flow references expecting placeholder chords; invalid records are filtered via prototype-safe Maps and datasets with fewer than two unique entities or zero positive flows automatically render a polite status fallback.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Perimeter Arcs & Legend Pills',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every entity SVG arc and synchronized legend pill exposes aria-pressed, descriptive outbound/inbound aria-label, IME-safe Enter/Space toggle activation, and keyboard-only prism-focus-ring outlines',
        description:
          'Selecting an entity highlights connected chords, dims unrelated flows to 0.14 opacity, announces exact outbound and inbound totals inside the aria-live="polite" prism-well telemetry strip, and clears focus cleanly when re-activated or dismissed via Clear Focus.',
      },
      {
        name: 'Accessible SVG Labeling & Semantic Token Contrast',
        criterion: '1.1.1 Non-text Content & 1.4.1 Use of Color',
        requirement:
          'SVG declares role="img" reflecting active focus state, chord ribbons include native <title> summaries, and entity colors resolve strictly from --prism-* CSS custom properties',
        description:
          'Guarantees relational flow insights remain readable across light, dark, and custom Refractor themes without relying on hardcoded colors or hue alone.',
      },
    ],
  },
  props: [
    {
      name: 'entities',
      type: 'ChordEntity[]',
      defaultValue: 'required',
      description:
        'Array of { id, label, tone? } entity nodes arranged around the perimeter (requires at least 2 unique entities).',
    },
    {
      name: 'flows',
      type: 'ChordFlow[]',
      defaultValue: 'required',
      description:
        'Array of { source, target, value } directed flow records; only finite values > 0 referencing valid entities are rendered.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Bi-Directional Chord Flows'",
      description: 'Heading displayed in the optical card header and linked to the diagram region.',
    },
    {
      name: 'size',
      type: 'number',
      defaultValue: '280',
      description: 'Square SVG viewport dimension in pixels, safely clamped to [180, 420].',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix appended to outbound, inbound, and aggregate flow values.',
    },
    {
      name: 'onSelectEntity',
      type: '(entity: ChordEntity, inbound: number, outbound: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the selected entity plus its computed inbound and outbound flow totals on click or IME-safe Enter/Space.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ChordDiagram\n  title="Service Mesh Traffic"\n  valueUnit="k"\n  entities={[\n    { id: 'gateway', label: 'API Gateway', tone: 'primary' },\n    { id: 'auth', label: 'Auth Service', tone: 'secondary' },\n    { id: 'billing', label: 'Billing Core', tone: 'emerald' },\n    { id: 'ledger', label: 'Ledger DB', tone: 'amber' },\n  ]}\n  flows={[\n    { source: 'gateway', target: 'auth', value: 140 },\n    { source: 'gateway', target: 'billing', value: 95 },\n    { source: 'billing', target: 'ledger', value: 80 },\n    { source: 'auth', target: 'gateway', value: 45 },\n  ]}\n/>`,
    `<ChordDiagram\n  title="Regional Liquidity Flows"\n  size={320}\n  valueUnit="M"\n  entities={[\n    { id: 'na', label: 'North America', tone: 'primary' },\n    { id: 'eu', label: 'Europe', tone: 'emerald' },\n    { id: 'apac', label: 'APAC', tone: 'rose' },\n  ]}\n  flows={[\n    { source: 'na', target: 'eu', value: 64.5 },\n    { source: 'eu', target: 'apac', value: 42 },\n    { source: 'apac', target: 'na', value: 51.25 },\n  ]}\n/>`,
  ],
};
