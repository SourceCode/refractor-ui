export const docs = {
  name: 'SparklineChart',
  displayName: 'Sparkline Chart',
  group: 'Core & Trend Charts',
  category: 'core-trend-charts',
  keywords: [
    'sparkline',
    'chart',
    'trend',
    'inline',
    'mini',
    'line',
    'bar',
    'delta',
    'kpi',
    'table',
    'telemetry',
  ],
  usage: {
    description:
      'Compact, axis-free optical glass inline sparkline supporting polyline with translucent under-fill and miniature vertical bar modes, optional start/peak/end markers, and a tabular percentage change pill suitable for DataTable cells and KPI cards.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide a descriptive ariaLabel summarizing the plotted metric (for example, "7-day request throughput trend") when embedding SparklineChart inside DataTable rows.',
      },
      {
        guidance: true,
        description:
          'Enable showDelta when pairing compact trend shapes with immediate period-over-period percentage comparisons.',
      },
      {
        guidance: false,
        description:
          'Hardcode hex or rgb stroke colors; select a semantic tone prop so every stroke, bar, and under-fill automatically adapts to active --prism-* themes.',
      },
    ],
    accessibility: [
      {
        name: 'Accessible inline SVG graphic',
        criterion: '1.1.1 Non-text Content',
        requirement: 'Semantic role="img" with configurable aria-label on the sparkline SVG',
        description:
          'The SVG exposes role="img" and a non-empty aria-label (defaulting to "Trend sparkline"), while optional delta readouts render as crisp tabular text with semantic contrast.',
      },
    ],
  },
  props: [
    {
      name: 'values',
      type: 'ReadonlyArray<number>',
      defaultValue: 'required',
      description:
        'Ordered numeric series plotted in the sparkline. Non-finite values (NaN, Infinity) are filtered out safely.',
    },
    {
      name: 'variant',
      type: "'line' | 'bar'",
      defaultValue: "'line'",
      description:
        'Plot geometry: axis-free polyline with translucent under-fill ("line") or compact vertical bars ("bar").',
    },
    {
      name: 'tone',
      type: "'primary' | 'secondary' | 'emerald' | 'amber' | 'rose'",
      defaultValue: "'primary'",
      description: 'Semantic --prism-* CSS token palette applied to strokes, under-fill, and bars.',
    },
    {
      name: 'width',
      type: 'number',
      defaultValue: '120',
      description: 'SVG width in pixels, clamped to the range 48..320.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '32',
      description: 'SVG height in pixels, clamped to the range 16..96.',
    },
    {
      name: 'showEndpoints',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Highlights start, peak, and end marker dots in the "line" variant.',
    },
    {
      name: 'showDelta',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Renders an inline tabular percentage change pill when at least 2 finite values are provided.',
    },
    {
      name: 'ariaLabel',
      type: 'string',
      defaultValue: "'Trend sparkline'",
      description: 'Accessible name applied to the sparkline SVG element.',
    },
  ],
  examples: [
    `<SparklineChart\n  values={[42, 48, 45, 53, 61, 58, 66]}\n  tone="emerald"\n  showDelta\n  ariaLabel="7-day API throughput trend"\n/>`,
    `<SparklineChart\n  values={[18, 22, 19, 26, 24, 31]}\n  variant="bar"\n  tone="secondary"\n  width={96}\n  height={28}\n  ariaLabel="Hourly active workers"\n/>`,
  ],
};
