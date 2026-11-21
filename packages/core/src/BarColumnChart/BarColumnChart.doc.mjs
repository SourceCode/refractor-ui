export const docs = {
  name: 'BarColumnChart',
  displayName: 'Bar & Column Chart',
  group: 'Core & Trend Charts',
  category: 'core-trend-charts',
  keywords: [
    'bar',
    'column',
    'chart',
    'grouped',
    'stacked',
    'vertical',
    'horizontal',
    'comparison',
    'svg',
    'analytics',
  ],
  usage: {
    description:
      'Multi-series optical-glass bar and column chart supporting vertical/horizontal orientations, grouped/stacked layouts, interactive series visibility legend pills, and recessed prism-well selection readouts powered exclusively by semantic --prism-* CSS custom properties.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide distinct BarSeries ids and concise category labels so grouped and stacked bars remain scannable across orientations.',
      },
      {
        guidance: true,
        description:
          'Use semantic BarSeriesTone tokens (primary, secondary, emerald, amber, rose) so charts automatically re-skin under createPrismTheme() and CSS theme packages.',
      },
      {
        guidance: false,
        description:
          'Pass negative or NaN values expecting sub-zero axes; non-finite and negative bar values are safely clamped to 0.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Bars & Mode Controls',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Keyboard-focusable SVG bar buttons with IME-safe Enter/Space activation, aria-pressed legend/mode pills, and polite live readout',
        description:
          'Orientation, layout, and series legend controls declare aria-pressed; every bar exposes role="button", tabIndex={0}, and descriptive aria-label with keyboard-only prism-focus-ring outlines.',
      },
      {
        name: 'Accessible SVG Labeling',
        criterion: '1.1.1 Non-text Content',
        requirement: 'SVG chart declares role="img" with orientation and layout context',
        description:
          'Pairs the SVG graphic with a live recessed prism-well readout and graceful empty/all-hidden status notices.',
      },
    ],
  },
  props: [
    {
      name: 'categories',
      type: 'string[]',
      defaultValue: 'required',
      description: 'Ordered category labels plotted along the category axis.',
    },
    {
      name: 'series',
      type: 'BarSeries[]',
      defaultValue: 'required',
      description: 'Array of { id, label, tone?, values } data series rendered as grouped or stacked bars.',
    },
    {
      name: 'orientation',
      type: "'vertical' | 'horizontal'",
      defaultValue: "'vertical'",
      description: 'Initial or synced bar orientation; users can also flip interactively via header pills.',
    },
    {
      name: 'layout',
      type: "'grouped' | 'stacked'",
      defaultValue: "'grouped'",
      description: 'Initial or synced multi-series bar arrangement; users can also toggle interactively.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Category Comparison'",
      description: 'Heading displayed in the chart card header.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '240',
      description: 'SVG chart height in pixels, safely clamped between 140 and 520.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix appended to axis ticks and active selection readouts.',
    },
    {
      name: 'onSelectBar',
      type: '(seriesId: string, categoryIndex: number, value: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when a user clicks or activates any bar via keyboard.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<BarColumnChart\n  title="Quarterly Revenue by Region"\n  categories={['Q1', 'Q2', 'Q3', 'Q4']}\n  valueUnit="k"\n  series={[\n    { id: 'na', label: 'North America', tone: 'primary', values: [120, 145, 160, 190] },\n    { id: 'eu', label: 'Europe', tone: 'secondary', values: [95, 110, 128, 142] },\n    { id: 'apac', label: 'APAC', tone: 'emerald', values: [64, 82, 96, 118] },\n  ]}\n/>`,
  ],
};
