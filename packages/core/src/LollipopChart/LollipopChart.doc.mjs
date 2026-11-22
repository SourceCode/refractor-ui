export const docs = {
  name: 'LollipopChart',
  displayName: 'Lollipop Chart',
  group: 'Comparison, Ranking & Storytelling Visuals',
  category: 'comparison-storytelling-charts',
  keywords: [
    'lollipop',
    'lollipop-chart',
    'ranking',
    'comparison',
    'low-ink',
    'dot-stem',
    'storytelling',
    'benchmark',
    'average',
    'horizontal',
    'vertical',
    'sort',
    'svg',
    'chart',
  ],
  usage: {
    description:
      'Low-ink optical-glass Lollipop ranking chart inside a sculpted prism-slab card featuring interactive Horizontal/Vertical orientation switching, High→Low / Low→High / A→Z sort pills, a responsive 460×230 SVG inside a recessed prism-well rendering thin 2.5px stems capped with 6.5px sculpted optical terminal circles, an optional dashed reference or auto-computed average line, keyboard-navigable stems, and a recessed aria-live="polite" readout displaying Rank #N · Label · Value · Delta vs Reference/Average powered exclusively by --prism-* CSS custom properties.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use LollipopChart instead of dense bar charts when ranking 5 to 12 categories where high data-ink efficiency and clear visual separation around a mean or target reference line improve executive scanning.',
      },
      {
        guidance: true,
        description:
          'Supply explicit valuePrefix (e.g. "$") and unit (e.g. "k", "%", "ms") tokens alongside an optional referenceValue target so tabular value labels, dashed threshold annotations, and delta readouts stay consistent across orientations.',
      },
      {
        guidance: false,
        description:
          'Hardcode raw hex or rgb colors or pass unsorted duplicate keys without stable ids; LollipopChart maps every stem and optical terminal circle exclusively to semantic --prism-* CSS variables and safely deduplicates keys and non-finite inputs.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Navigable Stems & Interactive Mode Controls',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Header Horizontal/Vertical orientation and High→Low / Low→High / A→Z sort pills declare native button aria-pressed states, while every SVG stem group exposes role="button", tabIndex={0}, aria-pressed, and a descriptive aria-label with IME-safe Enter/Space activation, ArrowUp/ArrowDown/ArrowLeft/ArrowRight cyclic focus traversal, and keyboard-only prism-focus-ring outlines',
        description:
          'Allows full keyboard exploration of ranked items in both horizontal and vertical layouts while cleanly highlighting the focused stem and softening inactive stems.',
      },
      {
        name: 'Polite Live Ranking Readout & Non-Color Redundancy',
        criterion: '1.1.1 Non-text Content, 1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'SVG declares role="img" with active orientation and item count, empty datasets render a clean role="status" message, and the recessed aria-live="polite" prism-well readout announces Rank #N · Label · Value · signed Delta vs Reference/Average',
        description:
          'Ensures ranked comparisons and variance against target or average benchmarks remain legible across light, dark, and custom Refractor themes without relying solely on color.',
      },
    ],
  },
  props: [
    {
      name: 'data',
      type: 'ReadonlyArray<LollipopDatum>',
      defaultValue: 'DEFAULT_LOLLIPOP_DATA (7 ranked feature adoption items)',
      description:
        'Ranked items ({ id, label, value, tone? }) plotted as thin stems with optical terminal circles. Pass [] to render the clean role="status" empty state.',
    },
    {
      name: 'orientation',
      type: "'horizontal' | 'vertical'",
      defaultValue: 'undefined',
      description: 'Controlled layout orientation for stems and value axis.',
    },
    {
      name: 'defaultOrientation',
      type: "'horizontal' | 'vertical'",
      defaultValue: "'horizontal'",
      description: 'Initial layout orientation when uncontrolled.',
    },
    {
      name: 'onOrientationChange',
      type: '(orientation: LollipopOrientation) => void',
      defaultValue: 'undefined',
      description: 'Optional callback invoked whenever the user switches between Horizontal and Vertical layouts.',
    },
    {
      name: 'sortBy',
      type: "'value-desc' | 'value-asc' | 'label'",
      defaultValue: 'undefined',
      description: 'Controlled sort mode for ordering plotted stems.',
    },
    {
      name: 'defaultSortBy',
      type: "'value-desc' | 'value-asc' | 'label'",
      defaultValue: "'value-desc'",
      description: 'Initial sort ordering when uncontrolled ("value-desc", "value-asc", or "label").',
    },
    {
      name: 'onSortByChange',
      type: '(sortBy: LollipopSortMode) => void',
      defaultValue: 'undefined',
      description: 'Optional callback invoked whenever the user changes the sort pill selection.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'k'",
      description: 'Unit suffix appended to axis ticks, terminal value labels, reference annotations, and readout deltas.',
    },
    {
      name: 'valuePrefix',
      type: 'string',
      defaultValue: "''",
      description: 'Prefix prepended before numeric values and deltas (e.g. "$" or "€").',
    },
    {
      name: 'referenceValue',
      type: 'number',
      defaultValue: 'undefined',
      description:
        'Optional explicit target/reference threshold for the dashed reference line; auto-computes arithmetic mean if omitted while showAverageLine is true.',
    },
    {
      name: 'showAverageLine',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Controls visibility of the auto-computed mean dashed line when referenceValue is omitted.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Low-Ink Lollipop Ranking'",
      description: 'Heading displayed in the sculpted prism-slab header and linked to the chart region.',
    },
    {
      name: 'onSelectItem',
      type: '(datum: LollipopDatum, rank: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the selected LollipopDatum and its 1-based performance rank (1 = highest value) upon click, Enter/Space, or arrow-key navigation.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<LollipopChart\n  title="Feature Adoption Ranking"\n  unit="k"\n  onSelectItem={(datum, rank) => {\n    void datum;\n    void rank;\n  }}\n/>`,
    `<LollipopChart\n  title="Regional ARR vs Target"\n  defaultOrientation="vertical"\n  defaultSortBy="value-desc"\n  valuePrefix="$"\n  unit="M"\n  referenceValue={45}\n  data={[\n    { id: 'na', label: 'North America', value: 62.4, tone: 'primary' },\n    { id: 'emea', label: 'EMEA', value: 48.9, tone: 'secondary' },\n    { id: 'apac', label: 'APAC', value: 39.2, tone: 'emerald' },\n    { id: 'latam', label: 'LATAM', value: 24.5, tone: 'amber' },\n  ]}\n/>`,
  ],
};

export default docs;
