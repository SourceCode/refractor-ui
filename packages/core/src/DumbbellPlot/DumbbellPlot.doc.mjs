export const docs = {
  name: 'DumbbellPlot',
  displayName: 'Dumbbell Plot',
  group: 'Comparison, Ranking & Storytelling Visuals',
  category: 'comparison-storytelling-charts',
  keywords: [
    'dumbbell',
    'dumbbell-plot',
    'connected-dot',
    'cleveland-dot',
    'variance',
    'gap',
    'before-after',
    'comparison',
    'ranking',
    'storytelling',
    'nps',
    'conversion',
    'delta',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass horizontal connected-dot dumbbell plot inside a sculpted prism-slab card comparing baseline and current metrics across categories. Features semantic legend swatches (--prism-info-main for baseline, --prism-primary-main for current), an interactive sort pill switcher (Default, Largest Gap, Highest Current), a responsive 460×230 SVG inside a recessed prism-well with semantically shaded variance connectors (--prism-success-main for gains, --prism-error-main for regressions) and right-aligned signed delta pills, keyboard-focusable rows with ArrowUp/ArrowDown navigation, and an aria-live="polite" telemetry readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use DumbbellPlot when telling a clear before-vs-after or target-vs-actual story across 3 to 10 categories where both the direction (gain vs. regression) and magnitude of each gap matter.',
      },
      {
        guidance: true,
        description:
          'Customize baselineLabel, currentLabel, and unit (such as "Q1" / "Q4" and "%" or " pts") and enable sorting by Largest Gap or Highest Current so executives can immediately isolate outlier shifts.',
      },
      {
        guidance: false,
        description:
          'Hardcode hex or rgb colors or omit zero-baseline safeguards; DumbbellPlot shades all connectors, dots, and delta pills exclusively through --prism-* CSS custom properties and safely reports gapPct as null ("N/A") when baseline is 0.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive SVG Rows & Keyboard Traversal',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each category row exposes role="button", tabIndex={0}, aria-pressed, and a full descriptive aria-label with IME-safe Enter/Space selection plus ArrowUp/ArrowDown/Home/End navigation and keyboard-only prism-focus-ring outlines',
        description:
          'Keyboard and assistive-technology users can step cleanly through every category row, highlight the focused variance gap, and trigger onSelectItem without pointer input.',
      },
      {
        name: 'Polite Live Variance Readout & Non-Color Redundancy',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'Pairs semantic gain/regression tokens (--prism-success-main / --prism-error-main) with signed numeric delta pills (+14.2% / -3.5%), explicit legend pills, and a recessed aria-live="polite" readout displaying Category · Baseline → Current · Signed Gap · % Change',
        description:
          'Ensures comparison direction, absolute variance, and relative percentage change remain completely legible across light, dark, custom themes, and color-vision deficiencies.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<DumbbellItem>',
      defaultValue: '6 default regional conversion / NPS before-vs-after items',
      description:
        'Ordered array of { id, label, baseline, current } comparison rows. Pass [] to display the clean role="status" empty state.',
    },
    {
      name: 'baselineLabel',
      type: 'string',
      defaultValue: "'Baseline'",
      description: 'Legend swatch and live readout label for the baseline series (--prism-info-main).',
    },
    {
      name: 'currentLabel',
      type: 'string',
      defaultValue: "'Current'",
      description: 'Legend swatch and live readout label for the current series (--prism-primary-main).',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'%'",
      description: 'Unit suffix appended to scale ticks, signed delta pills, and live readout values.',
    },
    {
      name: 'sortBy',
      type: "DumbbellSortMode ('original' | 'gap-desc' | 'target-desc')",
      defaultValue: 'undefined',
      description: 'Controlled sort mode for ordering rows by original order, largest absolute variance gap, or highest current value.',
    },
    {
      name: 'defaultSortBy',
      type: "DumbbellSortMode ('original' | 'gap-desc' | 'target-desc')",
      defaultValue: "'original'",
      description: 'Initial sort mode when uncontrolled (sortBy is omitted).',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Variance Gap Dumbbell Plot'",
      description: 'Heading displayed in the sculpted prism-slab header and linked to the chart region.',
    },
    {
      name: 'onSelectItem',
      type: '(selection: DumbbellSelection) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with { id, label, baseline, current, gap, gapPct } when any category row is clicked or activated/navigated via keyboard.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<DumbbellPlot\n  title="Regional Conversion Lift (Q1 vs Q4)"\n  baselineLabel="Q1 Baseline"\n  currentLabel="Q4 Current"\n  onSelectItem={(selection) => {\n    void selection;\n  }}\n/>`,
    `<DumbbellPlot\n  title="NPS Before vs After Onboarding Redesign"\n  baselineLabel="Before"\n  currentLabel="After"\n  unit=" pts"\n  defaultSortBy="gap-desc"\n  items={[\n    { id: 'ent', label: 'Enterprise', baseline: 28, current: 54 },\n    { id: 'mid', label: 'Mid-Market', baseline: 36, current: 31 },\n    { id: 'smb', label: 'SMB Self-Serve', baseline: 19, current: 42 },\n  ]}\n/>`,
  ],
};

export default docs;
