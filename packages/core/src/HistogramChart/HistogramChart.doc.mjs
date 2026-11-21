export const docs = {
  name: 'HistogramChart',
  displayName: 'Histogram Chart',
  group: 'Statistical & Distribution Visuals',
  category: 'statistical-charts',
  keywords: [
    'histogram',
    'frequency',
    'distribution',
    'bins',
    'mean',
    'median',
    'statistical',
    'telemetry',
    'density',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass frequency distribution histogram with a pure equal-width binning engine (computeHistogramBins), live n/Mean/Median summary pills, vertical dashed Mean (--prism-secondary-main) and Median (--prism-success-main) guide lines, keyboard-focusable adjacent frequency bars, and a recessed live bin readout powered exclusively by --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Choose binCount between 6 and 16 for typical operational telemetry so multimodal peaks and tail skew stand out clearly without over-fragmenting sparse samples.',
      },
      {
        guidance: true,
        description:
          'Keep both showMean and showMedian enabled for latency and response-time distributions to expose skew immediately when the mean diverges from the median.',
      },
      {
        guidance: false,
        description:
          'Pre-filter NaN/Infinity values or guard identical arrays manually; computeHistogramBins sanitizes non-finite observations and handles flat distributions safely without division by zero.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Bin Inspection & Live Range Readouts',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every SVG frequency bar exposes role="button", tabIndex={0}, aria-pressed, IME-safe Enter/Space activation, and descriptive Range [min – max]: count samples aria-labels',
        description:
          'Keyboard and assistive-technology users can traverse every frequency bucket and hear live range and sample-count updates via aria-live="polite".',
      },
      {
        name: 'Non-Color Statistical Reference Indicators',
        criterion: '1.4.1 Use of Color',
        requirement:
          'Pairs distinct dash patterns and explicit text labels ("Mean", "Median") on reference lines with header summary pills and recessed bin readouts',
        description:
          'Ensures central-tendency markers and active bin highlights remain distinguishable across color-vision profiles and light/dark Refractor themes.',
      },
    ],
  },
  props: [
    {
      name: 'values',
      type: 'number[]',
      defaultValue: 'required',
      description:
        'Numeric sample observations; non-finite entries (NaN, Infinity) are filtered out safely.',
    },
    {
      name: 'binCount',
      type: 'number',
      defaultValue: '8',
      description: 'Number of equal-width frequency buckets, safely clamped to [2, 24].',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Frequency Histogram'",
      description: 'Card heading rendered in the header and linked to the SVG graphic.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Optional unit suffix appended to summary stats, accessible bar labels, and bin readouts (e.g. "ms", "%").',
    },
    {
      name: 'showMean',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Renders a vertical dashed Mean reference line (--prism-secondary-main) when true.',
    },
    {
      name: 'showMedian',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Renders a vertical dashed Median reference line (--prism-success-main) when true.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '240',
      description: 'SVG height in pixels, safely clamped to [140, 480].',
    },
    {
      name: 'onSelectBin',
      type: '(bin: ComputedHistogramBin) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when a frequency bin bar is clicked or activated via Enter/Space.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<HistogramChart\n  title="API Latency Distribution"\n  valueUnit="ms"\n  binCount={8}\n  values={[18, 22, 24, 25, 29, 31, 33, 35, 38, 42, 48, 65, 92, 118]}\n/>`,
    `<HistogramChart\n  title="Token Length Spread"\n  binCount={12}\n  showMean={true}\n  showMedian={false}\n  height={200}\n  values={[120, 140, 155, 160, 185, 210, 230, 245, 260, 310, 390]}\n/>`,
  ],
};
