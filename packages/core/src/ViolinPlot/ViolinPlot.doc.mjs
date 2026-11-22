export const docs = {
  name: 'ViolinPlot',
  displayName: 'Violin Distribution Plot',
  group: 'Scientific, Statistical & High-Dimensional Visuals',
  category: 'scientific-charts',
  keywords: [
    'violin',
    'violin plot',
    'kde',
    'kernel density estimation',
    'gaussian kde',
    'silverman bandwidth',
    'bimodal',
    'distribution',
    'quartiles',
    'iqr',
    'tukey',
    'statistics',
    'scientific',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass scientific violin distribution plot inside a sculpted prism-slab container that computes exact Gaussian Kernel Density Estimation (with Silverman rule-of-thumb bandwidth and zero-variance fallback) across 24 vertical bins per series, mirrors density symmetrically around each series axis inside a recessed prism-well SVG, optionally overlays Tukey IQR boxes, min-max whisker hairlines, and crystal median dots, and exposes an interactive aria-live="polite" statistical inspector strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use ViolinPlot over plain box plots whenever experimental distributions may be multimodal (such as cache-hit vs. cache-miss latency splits) so density peaks and pinched valleys remain immediately visible.',
      },
      {
        guidance: true,
        description:
          'Keep the Box Overlay toggle enabled when comparing medians and interquartile ranges across groups, or toggle it off to inspect subtle density tails without interior visual clutter.',
      },
      {
        guidance: false,
        description:
          'Manually pre-filter NaN or Infinity telemetry values before passing series; computeViolinStats() and computeGaussianKde() strip non-finite entries safely and render a polite role="status" empty notice when no valid samples remain.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Series Groups & Arrow-Key Roving Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each violin series group exposes role="button", tabIndex={0}, aria-pressed, a complete statistical aria-label, IME-safe Enter/Space activation, ArrowLeft/ArrowRight focus navigation with wrap-around, and keyboard-only .prism-focus-ring outlines.',
        description:
          'Users can inspect and compare every distribution group entirely via keyboard without triggering pointer focus rings or hijacking IME composition.',
      },
      {
        name: 'Accessible SVG Graphics, Box Overlay Toggle & Live Inspector',
        criterion: '1.1.1 Non-text Content & 4.1.3 Status Messages',
        requirement:
          'Responsive SVG declares role="img", the Box Overlay header button reflects aria-pressed, the recessed prism-well statistical inspector announces Group · N · Min · Q1 · Median · Q3 · Max · Mean via aria-live="polite", and empty datasets announce status via role="status".',
        description:
          'Ensures full statistical parity for screen reader users across light, dark, and custom Refractor optical themes using strictly --prism-* CSS custom properties.',
      },
    ],
  },
  props: [
    {
      name: 'series',
      type: 'ReadonlyArray<ViolinSeries>',
      defaultValue: '4 realistic experimental groups (Baseline, Cache Split bimodal, Optimized, Heavy Load)',
      description:
        'Array of { id, label, values, tone? } distribution groups rendered as mirrored 24-bin Gaussian KDE violins. Pass [] to display the empty status state.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'ms'",
      description: 'Unit suffix appended to Y-axis tick labels and statistical inspector values.',
    },
    {
      name: 'showBoxOverlay',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Controls visibility of the embedded Tukey IQR box (Q1..Q3), min-max whisker hairline, and crystal median dot overlay.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Violin Distribution Plot'",
      description: 'Heading displayed in the sculpted prism-slab header and linked to the region.',
    },
    {
      name: 'onSelectSeries',
      type: '(summary: ViolinStatsSummary) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the focused series ViolinStatsSummary whenever a violin group is clicked or activated/navigated via keyboard.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ViolinPlot\n  title="Inference Latency Distributions"\n  unit="ms"\n  onSelectSeries={(summary) => {\n    void summary;\n  }}\n/>`,
    `<ViolinPlot\n  title="Cohort Score Density"\n  unit="pts"\n  showBoxOverlay\n  series={[\n    { id: 'control', label: 'Control', tone: 'primary', values: [48, 52, 55, 57, 59, 61, 63, 66] },\n    { id: 'bimodal', label: 'Bimodal', tone: 'secondary', values: [22, 24, 26, 28, 72, 74, 76, 78] },\n    { id: 'variant', label: 'Variant B', tone: 'info', values: [60, 64, 68, 70, 72, 75, 79, 84] },\n  ]}\n/>`,
  ],
};

export default docs;
