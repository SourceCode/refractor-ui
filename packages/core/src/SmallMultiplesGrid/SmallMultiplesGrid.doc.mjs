export const docs = {
  name: 'SmallMultiplesGrid',
  displayName: 'Small Multiples Grid',
  group: 'Comparison, Ranking & Storytelling Visuals',
  category: 'comparison-storytelling-charts',
  keywords: [
    'small-multiples',
    'trellis',
    'facet',
    'panel-chart',
    'synchronized',
    'crosshair',
    'comparison',
    'storytelling',
    'area',
    'bar',
    'shared-scale',
    'kpi',
  ],
  usage: {
    description:
      'Optical-glass trellis small multiples grid displaying synchronized miniature area or micro-bar KPI facet cards inside a sculpted prism-slab card with Area/Bar kind switching, Shared Scale vs Local Scale Y-axis comparison toggle, lockstep crosshair & highlight dot synchronized across every facet via hover, click, steppers, or keyboard navigation, and a recessed aria-live="polite" synchronized summary bar.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep sharedYScale enabled (default) when comparing magnitude across regions, products, or cohorts so smaller facets are never visually overstated relative to leaders.',
      },
      {
        guidance: true,
        description:
          'Use the built-in Shared Scale / Local Scale toggle when investigating subtle micro-trends within lower-volume facets, and switch between Area and Bar modes depending on continuous vs discrete period comparisons.',
      },
      {
        guidance: false,
        description:
          'Hardcode color values or manually guard empty datasets; every miniature SVG uses --prism-* semantic tokens exclusively, non-finite samples sanitize safely, and empty labels or series render a clean role="status" empty state.',
      },
    ],
    accessibility: [
      {
        name: 'Lockstep Keyboard Stepping & IME-Safe Focus Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every miniature facet card is keyboard-focusable with keyboard-only prism-focus-ring outlines, descriptive aria-label readouts, and IME-safe ArrowLeft/ArrowRight/Home/End stepping synchronized across all facets',
        description:
          'Keyboard users can focus any facet card or use the header < / > period steppers to inspect every period in lockstep across the entire trellis without losing context.',
      },
      {
        name: 'Explicit Toggle States & Live Synchronized Summary Bar',
        criterion: '1.1.1 Non-text Content & 4.1.3 Status Messages',
        requirement:
          'Area/Bar kind controls and the Shared Scale toggle use native <button> elements with aria-pressed, paired with role="img" miniature SVGs and an aria-live="polite" prism-well summary reporting Active Period, Global Y Domain, and Highest & Lowest Facets',
        description:
          'Assistive technologies receive live synchronized comparisons and full numeric deltas across every light, dark, and custom Refractor theme.',
      },
    ],
  },
  props: [
    {
      name: 'labels',
      type: 'ReadonlyArray<string>',
      defaultValue: "['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']",
      description: 'Shared X-axis period labels rendered across every miniature facet card.',
    },
    {
      name: 'series',
      type: 'ReadonlyArray<SmallMultipleSeries>',
      defaultValue: '6 default regional KPI facets (North America, EMEA, APAC, LATAM, Nordics, ANZ)',
      description:
        'Ordered array of { id, title, subtitle?, values, tone? } facet definitions sharing the same X-axis periods. Pass [] to render the accessible role="status" empty state.',
    },
    {
      name: 'chartKind',
      type: "'area' | 'bar'",
      defaultValue: 'undefined',
      description: 'Controlled miniature chart visualization kind across all facets.',
    },
    {
      name: 'defaultChartKind',
      type: "'area' | 'bar'",
      defaultValue: "'area'",
      description: 'Initial uncontrolled miniature chart visualization kind.',
    },
    {
      name: 'sharedYScale',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Locks every facet card to the identical global Y-axis min..max domain for honest magnitude comparison; can be toggled interactively between Shared Scale and Local Scale.',
    },
    {
      name: 'columns',
      type: '2 | 3 | 4',
      defaultValue: '3',
      description: 'Responsive desktop column count for the trellis facet grid.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'k'",
      description: 'Unit suffix appended to synchronized values, deltas, and Y-axis domain readouts.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Synchronized Small Multiples'",
      description: 'Heading rendered in the sculpted prism-slab header and linked to the region.',
    },
    {
      name: 'onSyncIndexChange',
      type: '(snapshot: SmallMultiplesSyncSnapshot) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with { index, periodLabel, entries } whenever the synchronized active period changes via hover, click, stepper buttons, or keyboard navigation.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<SmallMultiplesGrid\n  title="Regional ARR Velocity"\n  onSyncIndexChange={(snapshot) => {\n    void snapshot;\n  }}\n/>`,
    `<SmallMultiplesGrid\n  title="Quarterly Latency by Cluster"\n  defaultChartKind="bar"\n  columns={2}\n  unit="ms"\n  labels={['Q1', 'Q2', 'Q3', 'Q4']}\n  series={[\n    { id: 'us-east', title: 'US East', tone: 'primary', values: [42, 39, 35, 31] },\n    { id: 'eu-west', title: 'EU West', tone: 'emerald', values: [58, 52, 47, 44] },\n  ]}\n/>`,
  ],
};

export default docs;
