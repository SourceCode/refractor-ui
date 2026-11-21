export const docs = {
  name: 'BoxWhiskerPlot',
  displayName: 'Box & Whisker Plot',
  group: 'Statistical & Distribution Visuals',
  category: 'statistical-charts',
  keywords: [
    'boxplot',
    'box-and-whisker',
    'quartiles',
    'iqr',
    'median',
    'outliers',
    'tukey',
    'distribution',
    'statistics',
    'spread',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass vertical box-and-whisker distribution chart computing Tukey quartiles (Q1, median, Q3), 1.5*IQR whisker bounds, and outlier markers via computeBoxStats(), paired with interactive series highlighting and a recessed prism-well five-number summary strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide at least five finite observations per series so Q1, median, Q3, and 1.5*IQR outlier fences reveal meaningful distribution skew and spread.',
      },
      {
        guidance: true,
        description:
          'Use semantic BoxWhiskerTone tokens (primary, secondary, emerald, amber, rose) and supply valueUnit (such as "ms" or "%") so axis ticks and five-number readouts stay aligned with your active theme.',
      },
      {
        guidance: false,
        description:
          'Pre-strip NaN or Infinity values manually when uncertain; computeBoxStats() filters non-finite entries automatically and skips empty series cleanly.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Series Glyphs & Keyboard Support',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Focusable SVG series buttons with IME-safe Enter/Space activation, aria-pressed state, descriptive statistical aria-label, and keyboard-only prism-focus-ring outlines',
        description:
          'Every box-and-whisker glyph exposes role="button", tabIndex={0}, aria-pressed, and a complete five-number plus outlier summary in aria-label.',
      },
      {
        name: 'Accessible SVG Graphics & Live Summary',
        criterion: '1.1.1 Non-text Content & 4.1.3 Status Messages',
        requirement:
          'SVG declares role="img" alongside an aria-live="polite" recessed prism-well five-number readout and graceful empty status notice',
        description:
          'Selecting or activating any series updates the live five-number summary (Min, Q1, Median, Q3, Max, Outliers) for assistive technology users.',
      },
    ],
  },
  props: [
    {
      name: 'series',
      type: 'BoxWhiskerSeries[]',
      defaultValue: 'required',
      description:
        'Array of { id, label, values, tone? } distribution series rendered as vertical optical box-and-whisker glyphs.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Distribution Spread'",
      description: 'Heading displayed in the optical prism-slab chart header.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix appended to Y-axis ticks and five-number summary values.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '240',
      description: 'SVG viewport height in pixels, safely clamped between 160 and 480.',
    },
    {
      name: 'onSelectSeries',
      type: '(series: BoxWhiskerSeries, stats: BoxWhiskerStats) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the selected series and computed BoxWhiskerStats when a glyph is clicked or keyboard-activated.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and optical style overrides.',
    },
  ],
  examples: [
    `<BoxWhiskerPlot\n  title="API Latency Distribution"\n  valueUnit="ms"\n  series={[\n    { id: 'us-east', label: 'US-East', tone: 'primary', values: [42, 48, 51, 55, 58, 63, 67, 128] },\n    { id: 'eu-west', label: 'EU-West', tone: 'secondary', values: [50, 56, 61, 64, 68, 74, 79] },\n    { id: 'ap-south', label: 'AP-South', tone: 'emerald', values: [62, 68, 72, 76, 81, 86, 91, 145] },\n  ]}\n/>`,
  ],
};
