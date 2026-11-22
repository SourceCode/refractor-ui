export const docs = {
  name: 'ContourDensityPlot',
  displayName: 'Contour Density Plot',
  group: 'Scientific, Statistical & High-Dimensional Visuals',
  category: 'scientific-charts',
  keywords: [
    'contour',
    'density',
    'kde',
    'kernel-density',
    'isoline',
    'marching-squares',
    'bimodal',
    'bivariate',
    'scientific',
    'distribution',
    'heatmap',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass 2D Gaussian kernel density contour plot evaluating bivariate sample observations across a deterministic 16×12 grid, quantizing density into 3–8 isoline bands with smooth Marching-Squares contour edges, optional overlaid scatter sample markers, keyboard-navigable probe cells, and a recessed prism-well aria-live="polite" density probe readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide 12 or more finite 2D sample points (optionally weighted) so the Gaussian kernel density estimator and Marching-Squares isolines reveal clear modal peaks, saddles, and tail falloff.',
      },
      {
        guidance: true,
        description:
          'Choose levels between 4 and 6 for balanced visual separation across light and dark optical glass themes, and pair descriptive xLabel and yLabel strings with domain units.',
      },
      {
        guidance: false,
        description:
          'Supply hardcoded hex/rgb colors or pre-strip non-finite coordinates manually; ContourDensityPlot renders strictly through --prism-* opacity ramps, filters NaN/Infinity observations automatically, and displays a clean role="status" empty state when no valid samples exist.',
      },
    ],
    accessibility: [
      {
        name: '2D Keyboard Grid Probing & IME Safety',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Roving tabIndex contour probe cells expose role="button", aria-pressed, descriptive coordinate/density aria-labels, IME-safe Enter/Space activation, ArrowLeft/ArrowRight/ArrowUp/ArrowDown navigation, and keyboard-only .prism-focus-ring outlines',
        description:
          'Keyboard users can tab directly into the active contour probe cell, step across all 16×12 density cells with arrow keys, toggle scatter points via aria-pressed, and activate cells with Enter or Space without IME conflicts.',
      },
      {
        name: 'Accessible SVG Plot & Polite Density Readout',
        criterion: '1.1.1 Non-text Content & 4.1.3 Status Messages',
        requirement:
          'SVG exposes role="img" with sample and band counts alongside a recessed prism-well aria-live="polite" readout displaying Coord (X, Y), Normalized Density, Contour Band L#, and Peak Density',
        description:
          'Updates assistive technologies whenever a user probes a new density cell, while keeping color-independent contour isolines, legend band labels (L1..L#), and numeric readouts legible across all themes.',
      },
    ],
  },
  props: [
    {
      name: 'points',
      type: 'ReadonlyArray<ContourSamplePoint>',
      defaultValue: 'DEFAULT_CONTOUR_POINTS (32 bimodal points)',
      description:
        'Array of { id?, x, y, weight? } 2D observations; defaults to a 32-point bimodal optical sensor cluster when omitted and renders a clean role="status" empty state when empty or containing no finite coordinates.',
    },
    {
      name: 'levels',
      type: 'number',
      defaultValue: '5',
      description: 'Number of quantized contour isoline density bands, clamped to 3..8.',
    },
    {
      name: 'showPoints',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Controls visibility of overlaid scatter sample markers (also interactively toggleable via the header Show Points button).',
    },
    {
      name: 'tone',
      type: "ContourTone ('primary' | 'secondary' | 'emerald' | 'info')",
      defaultValue: "'primary'",
      description:
        'Semantic optical tone mapped exclusively to --prism-* CSS custom properties for density fills, isoline strokes, and legend bands.',
    },
    {
      name: 'xLabel',
      type: 'string',
      defaultValue: "'X Axis'",
      description: 'Horizontal axis label rendered beneath the X-axis tick marks.',
    },
    {
      name: 'yLabel',
      type: 'string',
      defaultValue: "'Y Axis'",
      description: 'Vertical axis label rendered rotated alongside the Y-axis tick marks.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'2D Contour Density Plot'",
      description: 'Heading rendered in the sculpted prism-slab header and linked via aria-labelledby.',
    },
    {
      name: 'onSelectCell',
      type: '(cell: ContourCellReading) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with { row, col, x, y, density, level } when a user clicks or keyboard-navigates to a contour density cell.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ContourDensityPlot\n  title="Optical Sensor Bimodal Beam Density"\n  xLabel="Azimuth (mrad)"\n  yLabel="Elevation (mrad)"\n  levels={5}\n  tone="primary"\n/>`,
    `<ContourDensityPlot\n  title="Photon Flux Iso-Density"\n  tone="emerald"\n  levels={6}\n  showPoints={false}\n  points={[\n    { id: 'a', x: 10, y: 14, weight: 1.2 },\n    { id: 'b', x: 12, y: 16, weight: 1.4 },\n    { id: 'c', x: 24, y: 28, weight: 1.1 },\n    { id: 'd', x: 26, y: 30, weight: 1.3 },\n  ]}\n/>`,
  ],
};

export default docs;
