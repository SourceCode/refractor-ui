export const docs = {
  name: 'DonutPieChart',
  displayName: 'Donut & Pie Chart',
  group: 'Part-to-Whole & Hierarchical Visuals',
  category: 'part-to-whole-charts',
  keywords: [
    'donut',
    'pie',
    'ring',
    'share',
    'composition',
    'proportion',
    'part-to-whole',
    'chart',
    'svg',
    'analytics',
  ],
  usage: {
    description:
      'Optical-glass part-to-whole donut and pie chart with live Donut/Pie variant toggling, degenerate-arc-safe 100% single-slice rendering, dynamic center cutout headline, interactive aria-pressed legend rows, and recessed prism-well selection readouts driven solely by semantic --prism-* CSS custom properties.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Limit slices to 3–7 distinct categories and supply concise labels plus semantic DonutSliceTone tokens so proportional wedges stay scannable.',
      },
      {
        guidance: true,
        description:
          'Use donut mode (default) when highlighting an aggregate KPI in the center cutout via centerLabel/centerValue, and switch to pie mode when raw radial area comparison is primary.',
      },
      {
        guidance: false,
        description:
          'Pass zero, negative, or NaN values expecting empty placeholder wedges; only finite positive slice values are plotted, and empty datasets automatically render a status fallback.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Slices, Legend Rows & Variant Controls',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Donut/Pie toggle buttons, legend rows, and SVG slice paths expose aria-pressed with IME-safe Enter/Space activation and keyboard-only prism-focus-ring outlines',
        description:
          'Every SVG wedge declares role="button", tabIndex={0}, and descriptive aria-label containing label, formatted value, and share percentage, synchronized with polite live readout announcements.',
      },
      {
        name: 'Accessible SVG Labeling & Empty States',
        criterion: '1.1.1 Non-text Content & 1.4.1 Use of Color',
        requirement:
          'SVG declares role="img" with variant context while legend rows pair semantic --prism-* swatches with exact numeric values and percentages',
        description:
          'Ensures proportional insights remain readable across light, dark, and custom Refractor themes without relying on color alone.',
      },
    ],
  },
  props: [
    {
      name: 'slices',
      type: 'DonutSlice[]',
      defaultValue: 'required',
      description: 'Array of { id, label, value, tone? } slice definitions; only finite values > 0 are plotted.',
    },
    {
      name: 'variant',
      type: "'donut' | 'pie'",
      defaultValue: "'donut'",
      description: 'Initial or synced geometry mode; users can also switch interactively via header pills.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Composition Share'",
      description: 'Heading displayed in the optical card header and linked to the SVG graphic.',
    },
    {
      name: 'centerLabel',
      type: 'string',
      defaultValue: "'Total'",
      description: 'Subtitle displayed inside the donut center cutout when no slice is selected.',
    },
    {
      name: 'centerValue',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional formatted headline override shown in the donut center cutout before a slice is selected.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix appended to slice values in the center total, legend, and readout.',
    },
    {
      name: 'size',
      type: 'number',
      defaultValue: '220',
      description: 'Square SVG diameter in pixels, safely clamped between 140 and 360.',
    },
    {
      name: 'onSelectSlice',
      type: '(slice: DonutSlice, sharePct: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the selected slice and its percentage share on click or IME-safe Enter/Space.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<DonutPieChart\n  title="Cloud Spend Allocation"\n  centerLabel="Monthly"\n  valueUnit="k"\n  slices={[\n    { id: 'compute', label: 'Compute', value: 48, tone: 'primary' },\n    { id: 'storage', label: 'Storage', value: 26, tone: 'secondary' },\n    { id: 'network', label: 'Network', value: 16, tone: 'emerald' },\n    { id: 'observability', label: 'Observability', value: 10, tone: 'amber' },\n  ]}\n/>`,
    `<DonutPieChart\n  title="Traffic Split"\n  variant="pie"\n  size={200}\n  valueUnit="%"\n  slices={[\n    { id: 'organic', label: 'Organic', value: 62, tone: 'emerald' },\n    { id: 'direct', label: 'Direct', value: 24, tone: 'primary' },\n    { id: 'referral', label: 'Referral', value: 14, tone: 'rose' },\n  ]}\n/>`,
  ],
};
