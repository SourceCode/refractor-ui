export const docs = {
  name: 'HistogramRangeSlider',
  displayName: 'Histogram Range Slider',
  group: 'Complex Variations of Common Controls',
  category: 'complex-controls',
  keywords: [
    'histogram',
    'range',
    'slider',
    'distribution',
    'dual-thumb',
    'filter',
    'analytics',
    'frequency',
  ],
  usage: {
    description:
      'A dual-thumb optical-glass range slider coupled directly beneath an aligned SVG frequency distribution histogram. Bars overlapping the active selection illuminate in --prism-primary-main while out-of-range bars recede into --prism-divider, with live formatted range and matched-item count pills.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Supply contiguous HistogramBin intervals sorted by min/max and pass a concise formatValue callback (e.g. currency or latency units) for readable pills and aria-valuetext.',
      },
      {
        guidance: true,
        description:
          'Choose a step value aligned with bin boundaries so keyboard Arrow stepping snaps cleanly across meaningful intervals.',
      },
      {
        guidance: false,
        description:
          'Pass negative or NaN counts without sanitization — HistogramRangeSlider clamps counts >= 0 and renders an empty fallback notice if no valid bins exist.',
      },
    ],
    accessibility: [
      {
        name: 'Dual WAI-ARIA Sliders',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement:
          'Two role="slider" thumbs with dynamic aria-valuemin, aria-valuemax, aria-valuenow, and aria-valuetext bounds',
        description:
          'Each thumb prevents crossing its sibling bound, supports ArrowLeft/ArrowDown/ArrowRight/ArrowUp/Home/End stepping, guards against IME composition, and displays keyboard-only prism-focus-ring outlines.',
      },
      {
        name: 'Accessible Distribution Summary',
        criterion: '1.1.1 Non-text Content',
        requirement: 'role="img" with live matched/total item summary on the SVG histogram',
        description:
          'Pairs the visual bar distribution with textual range and matched-item count pills so screen-reader and keyboard users receive complete quantitative feedback.',
      },
    ],
  },
  props: [
    {
      name: 'bins',
      type: 'HistogramBin[]',
      defaultValue: 'required',
      description: 'Array of { min, max, count } distribution bins defining the slider domain and histogram bars.',
    },
    {
      name: 'value',
      type: 'HistogramRangeValue',
      defaultValue: 'undefined',
      description: 'Controlled { min, max } selection range.',
    },
    {
      name: 'defaultValue',
      type: 'HistogramRangeValue',
      defaultValue: 'undefined',
      description: 'Initial { min, max } selection range for uncontrolled usage.',
    },
    {
      name: 'onChange',
      type: '(next: HistogramRangeValue) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the clamped { min, max } range on pointer drag or keyboard stepping.',
    },
    {
      name: 'step',
      type: 'number',
      defaultValue: '1',
      description: 'Numeric increment used for pointer snapping and keyboard Arrow stepping.',
    },
    {
      name: 'formatValue',
      type: '(val: number) => string',
      defaultValue: 'String',
      description: 'Formatter applied to the header range pill, domain ticks, and slider aria-valuetext.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Distribution Range'",
      description: 'Visible heading label and accessible group name.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables pointer dragging and keyboard interaction on both thumbs.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<HistogramRangeSlider\n  label="Price Distribution"\n  bins={[\n    { min: 0, max: 50, count: 12 },\n    { min: 50, max: 100, count: 34 },\n    { min: 100, max: 150, count: 28 },\n    { min: 150, max: 200, count: 9 },\n  ]}\n  defaultValue={{ min: 50, max: 150 }}\n  step={10}\n  formatValue={(v) => \`$\${v}\`}\n  onChange={setPriceRange}\n/>`,
  ],
};
