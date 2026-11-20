export const docs = {
  name: 'OpticalCharts',
  displayName: 'Charts & Graphs',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['charts', 'graphs', 'bar', 'line', 'donut', 'telemetry', 'svg', 'analytics'],
  usage: {
    description:
      'Interactive optical telemetry visualizations supporting Bar Chart, Area/Line Graph, and Donut breakdown powered exclusively by semantic --prism-* CSS custom properties.',
    bestPractices: [
      { guidance: true, description: 'Provide unique concise labels for each ChartPoint so bars, axes, and legend items stay legible.' },
      { guidance: true, description: 'Use createPrismTheme() or theme CSS packages to re-skin SVG chart palettes automatically.' },
      { guidance: false, description: 'Pass negative or NaN values expecting negative axes; non-positive values are safely clamped to 0.' },
    ],
    accessibility: [
      {
        name: 'Interactive metric readouts & SVG labeling',
        criterion: '1.1.1 Non-text Content',
        requirement: 'Live focused metric readout, accessible mode buttons, and labelled SVG graphics',
        description: 'Mode switchers expose aria-pressed, bars and donut legend rows are keyboard-focusable buttons, and SVG charts declare role="img" with descriptive labels.',
      },
    ],
  },
  props: [
    { name: 'data', type: 'ReadonlyArray<ChartPoint>', defaultValue: 'required', description: 'Numeric series rendered across Bar, Line, and Donut modes.' },
    { name: 'defaultMode', type: "'bar' | 'line' | 'donut'", defaultValue: "'bar'", description: 'Initial chart visualization mode.' },
    { name: 'title', type: 'string', defaultValue: "'Component Adoption Telemetry'", description: 'Heading displayed above the telemetry readout.' },
  ],
  examples: [
    `<OpticalCharts\n  data={[\n    { label: 'Buttons', value: 420 },\n    { label: 'Inputs', value: 385 },\n    { label: 'Data Grid', value: 310 },\n  ]}\n/>`,
  ],
};
