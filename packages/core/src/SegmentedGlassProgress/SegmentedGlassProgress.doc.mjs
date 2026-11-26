export const docs = {
  name: 'SegmentedGlassProgress',
  displayName: 'Segmented Glass Progress Bar',
  group: 'Loaders, Skeletons & Data Transitions',
  category: 'loaders-skeletons-transitions',
  keywords: ['progress', 'segmented', 'liquid', 'glass', 'bar', 'percentage', 'determinate'],
  usage: {
    description:
      'Recessed frosted glass pill track filling with a glowing internal liquid gradient across discrete or continuous (`segments={1}`) glass capsules, complete with specular top highlights, optional percentage readouts, and an indeterminate prismatic sweep mode.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `segments={8–12}` for multi-phase uploads, shader builds, or quota gauges, or `segments={1}` for a sleek continuous liquid bar.',
      },
      {
        guidance: false,
        description:
          'Avoid passing unclamped values outside `0..max`; values are automatically normalized for ARIA accuracy.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Progressbar Contract',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Emits `role="progressbar"` with `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (omitted in `indeterminate` mode), and human-readable `aria-valuetext`.',
        description:
          'Gives screen readers exact determinate progress or indeterminate status semantics.',
      },
    ],
  },
  props: [
    { name: 'value', type: 'number', defaultValue: '64', description: 'Current completion value (0..max).' },
    { name: 'max', type: 'number', defaultValue: '100', description: 'Maximum value representing 100%.' },
    { name: 'segments', type: 'number', defaultValue: '10', description: 'Number of pill segments (clamped 1–20).' },
    { name: 'tone', type: "'prism' | 'emerald' | 'cobalt' | 'amber' | 'critical'", defaultValue: "'prism'", description: 'Liquid fill gradient palette.' },
    { name: 'showPercentage', type: 'boolean', defaultValue: 'true', description: 'Displays tabular percentage readout.' },
    { name: 'indeterminate', type: 'boolean', defaultValue: 'false', description: 'Switches to indeterminate sweeping liquid mode.' },
  ],
};
