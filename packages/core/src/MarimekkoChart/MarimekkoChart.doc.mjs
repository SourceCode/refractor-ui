export const docs = {
  name: 'MarimekkoChart',
  displayName: 'Marimekko Chart',
  group: 'Financial & Market Visualizations',
  category: 'financial-market-charts',
  keywords: [
    'marimekko',
    'mekko',
    'mosaic',
    'market-share',
    'proportional',
    'stacked',
    'financial',
    'revenue',
    'regional',
    'product-mix',
    'part-to-whole',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass 2D proportional Marimekko (mosaic) chart inside a sculpted prism-slab card with a grand total telemetry pill, interactive legend pills cycling semantic --prism-* tones (--prism-primary-main, --prism-secondary-main, --prism-success-main, --prism-warning-main, --prism-info-main), a responsive 460×220 SVG inside a recessed prism-well where column widths scale proportionally to column totals and vertical stacked segments sum to 100% column height, 2D keyboard navigation across focusable SVG rects, and an aria-live="polite" recessed inspector strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use consistent segment labels across columns (such as product lines across regions) so interactive legend pills automatically group series and cross-highlight matching segments across every column.',
      },
      {
        guidance: true,
        description:
          'Pair valuePrefix (e.g. "$", "€") and valueUnit (e.g. "M", "B", "k") so grand total badges, column footers, and the live inspector strip stay compact across mobile and desktop viewports.',
      },
      {
        guidance: false,
        description:
          'Pass zero, negative, or non-finite segment values expecting empty bars; non-positive and non-finite segments are sanitized out automatically, and datasets with total value <= 0 display a clean role="status" empty state.',
      },
    ],
    accessibility: [
      {
        name: '2D Keyboard-Focusable SVG Mosaic Segments & IME Safety',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every segment <rect> exposes role="button", tabIndex={0}, aria-pressed, and a complete aria-label with IME-safe Enter/Space selection plus ArrowLeft/ArrowRight/ArrowUp/ArrowDown 2D traversal and keyboard-only prism-focus-ring outlines',
        description:
          'Enables full keyboard navigation between stacked segments and neighboring columns while visually highlighting the active segment and softly dimming unrelated segments.',
      },
      {
        name: 'Interactive Series Legend & Live Telemetry Inspector',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'Legend pills expose native <button> semantics with aria-pressed and numeric global share percentages, paired with an aria-live="polite" prism-well inspector announcing Column · Segment · Value · Column Share % · Global Share %',
        description:
          'Ensures screen-reader and keyboard users receive complete quantitative market-share context without relying solely on color or visual area estimation.',
      },
    ],
  },
  props: [
    {
      name: 'columns',
      type: 'ReadonlyArray<MarimekkoColumn>',
      defaultValue: '4 default regional/product revenue columns (North America, EMEA, APAC, LATAM)',
      description:
        'Ordered array of { id, label, segments: ReadonlyArray<{ id, label, value, tone? }> } columns. Pass [] or non-positive values to render the clean role="status" empty state.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: "'M'",
      description: 'Unit suffix appended to formatted revenue/metric values (e.g. "M", "B", "k").',
    },
    {
      name: 'valuePrefix',
      type: 'string',
      defaultValue: "'$'",
      description: 'Currency or unit prefix prepended to formatted values.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Market Share Marimekko'",
      description: 'Heading displayed in the sculpted prism-slab header and linked to the region and SVG.',
    },
    {
      name: 'onSelectSegment',
      type: '(selection: MarimekkoSelection) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with { columnId, columnLabel, segmentId, segmentLabel, value, columnSharePct, totalSharePct } on segment click, Enter/Space activation, or arrow-key navigation.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<MarimekkoChart\n  title="Global SaaS Revenue Mix"\n  onSelectSegment={(selection) => {\n    void selection;\n  }}\n/>`,
    `<MarimekkoChart\n  title="Q4 Regional Product Share"\n  valuePrefix="€"\n  valueUnit="B"\n  columns={[\n    {\n      id: 'eu',\n      label: 'Europe',\n      segments: [\n        { id: 'core', label: 'Core', value: 42, tone: 'primary' },\n        { id: 'ai', label: 'AI', value: 28, tone: 'secondary' },\n      ],\n    },\n    {\n      id: 'us',\n      label: 'Americas',\n      segments: [\n        { id: 'core', label: 'Core', value: 30, tone: 'primary' },\n        { id: 'ai', label: 'AI', value: 20, tone: 'secondary' },\n      ],\n    },\n  ]}\n/>`,
  ],
};

export default docs;
