export const docs = {
  name: 'BumpChart',
  displayName: 'Bump Chart',
  group: 'Comparison, Ranking & Storytelling Visuals',
  category: 'comparison-storytelling-charts',
  keywords: [
    'bump',
    'bump-chart',
    'ranking',
    'rank-trajectory',
    'leaderboard',
    'crossover',
    'comparison',
    'storytelling',
    'bezier',
    'ordinal',
    'trends',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass rank trajectory Bump Chart inside a sculpted prism-slab card with a period count telemetry pill, interactive clickable series legend chips cycling semantic --prism-* tones (--prism-primary-main, --prism-secondary-main, --prism-success-main, --prism-warning-main, --prism-error-main, --prism-info-main), a responsive 480×240 SVG inside a recessed prism-well plotting vertical dashed period columns, horizontal #1..#N rank rails (#1 at top), smooth cubic-Bezier S-curve paths with numbered circular rank nodes, full 2D IME-safe keyboard navigation, and an aria-live="polite" inspector announcing Series · Period · Rank #N · Net Movement.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide 1-based rank values aligned by index to periods (1 at the top rail) so crossovers, surges, and steady rankings remain immediately legible across all periods.',
      },
      {
        guidance: true,
        description:
          'Use interactive series legend chips or keyboard arrow navigation (ArrowLeft/ArrowRight along a series curve, ArrowUp/ArrowDown across ranks in the same period) to isolate individual trajectories while softly dimming sibling curves.',
      },
      {
        guidance: false,
        description:
          'Supply fewer than 2 periods or an empty series list expecting a plotted curve; BumpChart renders a clean accessible role="status" empty state whenever fewer than 2 periods or no valid positive ranks are provided.',
      },
    ],
    accessibility: [
      {
        name: '2D Keyboard-Focusable SVG Rank Nodes & IME Safety',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every rank node exposes role="button", tabIndex={0}, aria-pressed, and a descriptive aria-label with IME-safe Enter/Space activation, ArrowLeft/ArrowRight trajectory traversal, ArrowUp/ArrowDown vertical rank-rail traversal, and keyboard-only prism-focus-ring focus indicators',
        description:
          'Allows keyboard and assistive-technology users to trace a single entity across periods or compare competing ranks within any period column without losing focus.',
      },
      {
        name: 'Interactive Series Legend & Polite Live Telemetry Inspector',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'Legend chips expose native <button> controls with aria-pressed and final rank badges, paired with an aria-live="polite" prism-well inspector reporting Series · Period · Rank #N · Net Movement (+2 spots / -1 spot / Steady)',
        description:
          'Communicates ordinal ranking positions and net movement textually and numerically alongside color-coded trajectories.',
      },
    ],
  },
  props: [
    {
      name: 'periods',
      type: 'ReadonlyArray<string>',
      defaultValue: "['Q1', 'Q2', 'Q3', 'Q4', 'Q1+']",
      description:
        'Ordered time periods rendered along the horizontal axis. Pass fewer than 2 periods to render the clean role="status" empty state.',
    },
    {
      name: 'series',
      type: 'ReadonlyArray<BumpSeriesItem>',
      defaultValue: '5 default channel ranking trajectories with crisp crossovers',
      description:
        'Ranked series items ({ id, label, ranks, tone? }) using 1-based ranks aligned to periods (1 at top). Pass [] to render the empty state.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Rank Trajectory Bump Chart'",
      description:
        'Card heading displayed inside the sculpted prism-slab header and linked to the chart region and SVG.',
    },
    {
      name: 'onSelectSeries',
      type: '(selection: BumpSelection) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with { seriesId, label, periodIndex, periodLabel, rank, netChange } when a rank node or legend chip is activated or navigated to.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<BumpChart\n  title="Acquisition Channel Rank Trajectories"\n  onSelectSeries={(selection) => {\n    void selection;\n  }}\n/>`,
    `<BumpChart\n  title="Framework Adoption Leaderboard"\n  periods={['2022', '2023', '2024', '2025']}\n  series={[\n    { id: 'react', label: 'React', ranks: [1, 1, 1, 1], tone: 'primary' },\n    { id: 'svelte', label: 'Svelte', ranks: [4, 3, 2, 2], tone: 'emerald' },\n    { id: 'vue', label: 'Vue', ranks: [2, 2, 3, 3], tone: 'secondary' },\n    { id: 'angular', label: 'Angular', ranks: [3, 4, 4, 4], tone: 'rose' },\n  ]}\n/>`,
  ],
};

export default docs;
