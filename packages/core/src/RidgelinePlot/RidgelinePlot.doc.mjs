export const docs = {
  name: 'RidgelinePlot',
  displayName: 'Ridgeline Plot',
  group: 'Scientific, Statistical & High-Dimensional Visuals',
  category: 'scientific-charts',
  keywords: [
    'ridgeline',
    'joyplot',
    'joy',
    'kde',
    'gaussian',
    'density',
    'distribution',
    'cohorts',
    'scientific',
    'statistics',
    'overlap',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass ridgeline (joy) distribution plot computing smooth Gaussian kernel density estimation (KDE) curves across a shared horizontal domain inside a sculpted prism-slab card with a cohort count badge, compact Tight / Balanced / Separated overlap preset toggle, stacked overlapping mountain profiles styled exclusively with --prism-* gradient tokens inside a recessed prism-well, keyboard-navigable ridge bands, and an aria-live="polite" statistical inspector.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Order cohorts chronologically or monotonically (such as months, latency buckets, or release cohorts) so horizontal distribution shifts across periods stand out immediately along the shared domain.',
      },
      {
        guidance: true,
        description:
          'Use the Balanced (0.45) default overlap for 4–8 cohorts, switch to Tight (0.75) for dense multi-period timelines, or choose Separated (0) when exact tail boundaries must remain unobstructed.',
      },
      {
        guidance: false,
        description:
          'Pre-strip NaN or Infinity values manually when uncertain; non-finite samples are filtered automatically, invalid empty cohorts are skipped cleanly, and passing rows={[]} renders an accessible role="status" empty state.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Focusable Ridge Bands & IME-Safe Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every SVG ridge cohort exposes role="button", tabIndex={0}, aria-pressed, and a complete statistical aria-label with IME-safe Enter/Space selection, ArrowUp/ArrowDown vertical traversal, and keyboard-only prism-focus-ring outlines',
        description:
          'Focusing or activating any ridge elevates its crest stroke and peak marker while gently dimming sibling cohorts and keeping every baseline legible.',
      },
      {
        name: 'Overlap Preset Toggle & Live Statistical Inspector',
        criterion: '1.1.1 Non-text Content & 4.1.3 Status Messages',
        requirement:
          'Overlap presets expose native <button> elements with aria-pressed inside a labeled group, paired with a role="img" SVG and an aria-live="polite" prism-well inspector reporting Cohort · Mode/Peak · Mean · Median · Samples',
        description:
          'Screen-reader and keyboard users receive complete density mode, mean, median, and sample count readouts across all light, dark, and custom Refractor themes.',
      },
    ],
  },
  props: [
    {
      name: 'rows',
      type: 'ReadonlyArray<RidgelineRow>',
      defaultValue: '6 default monthly temperature cohorts (Jan through Jun)',
      description:
        'Ordered array of { id, label, values, tone? } cohorts plotted top-to-bottom on a shared horizontal domain. Pass [] to render the clean role="status" empty state.',
    },
    {
      name: 'overlap',
      type: 'number',
      defaultValue: '0.45',
      description:
        'Vertical overlap ratio clamped to [0, 0.75] controlling mountain stacking density (0 = Separated, 0.45 = Balanced, 0.75 = Tight).',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'°C'",
      description: 'Unit suffix appended to horizontal domain ticks and statistical inspector metrics.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Ridgeline (Joy) Distribution'",
      description: 'Heading displayed in the sculpted prism-slab header and linked to the region and SVG.',
    },
    {
      name: 'onSelectRow',
      type: '(selection: RidgelineSelection) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with { id, label, count, peakValue, mean, median } on ridge click, IME-safe Enter/Space activation, or ArrowUp/ArrowDown navigation.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<RidgelinePlot\n  title="Seasonal Surface Temperature"\n  onSelectRow={(selection) => {\n    void selection;\n  }}\n/>`,
    `<RidgelinePlot\n  title="Inference Latency by Release"\n  unit="ms"\n  overlap={0.6}\n  rows={[\n    { id: 'v1', label: 'v1.0', tone: 'info', values: [42, 48, 52, 55, 59, 63, 68, 72] },\n    { id: 'v2', label: 'v2.0', tone: 'emerald', values: [30, 35, 39, 41, 44, 48, 52, 56] },\n    { id: 'v3', label: 'v3.0', tone: 'primary', values: [21, 24, 27, 29, 32, 35, 38, 42] },\n  ]}\n/>`,
  ],
};

export default docs;
