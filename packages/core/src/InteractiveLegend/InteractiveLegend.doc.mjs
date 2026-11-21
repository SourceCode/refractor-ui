export const docs = {
  name: 'InteractiveLegend',
  displayName: 'Interactive Legend',
  group: 'Chart Chrome & Interactive Controls',
  category: 'chart-chrome-controls',
  keywords: [
    'legend',
    'series',
    'toggle',
    'solo',
    'isolate',
    'chart',
    'chrome',
    'controls',
    'highlight',
    'visibility',
    'analytics',
  ],
  usage: {
    description:
      'Optical-glass interactive chart legend panel featuring deduplicated series pills or vertical rows, solid dot and dashed line swatches powered exclusively by --prism-* tokens, controlled or uncontrolled series visibility toggling, one-click or double-click Solo isolation with automatic restore-all, hover and focus series highlight callbacks, tabular metric readouts, and an active counter header with Show All reset.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Assign stable unique series IDs and semantic tones (primary, secondary, emerald, amber, rose) so controlled hiddenIds and onHighlightSeries callbacks stay synchronized with paired charts.',
      },
      {
        guidance: true,
        description:
          'Use orientation="vertical" inside sidebars or split inspector panels when displaying live tabular value/unit readouts alongside long series names.',
      },
      {
        guidance: false,
        description:
          'Nest custom interactive elements inside legend labels or rely solely on swatch color to indicate hidden state; InteractiveLegend pairs strikethrough typography, recessed prism-well surfaces, dashed SVG line swatches, and aria-pressed semantics automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Toggle, Solo & Reset Keyboard Controls',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Series toggles and Solo buttons are sibling native buttons exposing aria-pressed, keyboard-only prism-focus-ring outlines, descriptive aria-labels, and IME-safe Enter/Space handlers',
        description:
          'Keyboard and assistive-technology users can toggle visibility, isolate or restore all series via Solo, reset with Show All, and trigger chart focus highlights via keyboard focus and blur.',
      },
      {
        name: 'Non-Color State & Empty Feedback',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'Combines solid/dashed swatches, strikethrough hidden labels, active-count text pills, and a role="status" empty state',
        description:
          'Ensures hidden, soloed, dashed benchmark, and empty legend states remain unmistakable across color-vision profiles and light/dark optical themes.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'LegendSeriesItem[]',
      defaultValue: 'required',
      description:
        'Ordered series entries ({ id, label, value?, unit?, tone?, dashed? }); duplicate IDs are deduplicated by first occurrence.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Series Legend'",
      description: 'Heading rendered in the optical slab header and linked to the legend group.',
    },
    {
      name: 'orientation',
      type: "'horizontal' | 'vertical'",
      defaultValue: "'horizontal'",
      description: 'Arranges series pills in a wrapping horizontal row or full-width vertical stack.',
    },
    {
      name: 'hiddenIds',
      type: 'string[]',
      defaultValue: 'undefined',
      description: 'Controlled list of hidden series IDs.',
    },
    {
      name: 'defaultHiddenIds',
      type: 'string[]',
      defaultValue: '[]',
      description: 'Initial list of hidden series IDs when operating in uncontrolled mode.',
    },
    {
      name: 'onHiddenIdsChange',
      type: '(hiddenIds: string[]) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever series visibility changes via toggle, Solo, double-click, or Show All.',
    },
    {
      name: 'onHighlightSeries',
      type: '(seriesId: string | null) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired on pointer hover or keyboard focus with the active series ID, and with null on pointer leave or blur.',
    },
    {
      name: 'allowSolo',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Enables compact Solo buttons and double-click isolation when 2 or more series exist; invoking solo on an already-soloed series restores all series.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<InteractiveLegend\n  title="API Latency Percentiles"\n  items={[\n    { id: 'p50', label: 'P50 Median', value: 42, unit: 'ms', tone: 'emerald' },\n    { id: 'p95', label: 'P95 Tail', value: 118, unit: 'ms', tone: 'primary' },\n    { id: 'sla', label: 'SLA Target', value: 120, unit: 'ms', tone: 'amber', dashed: true },\n  ]}\n/>`,
    `<InteractiveLegend\n  title="Cluster Traffic"\n  orientation="vertical"\n  defaultHiddenIds={['eu']}\n  items={[\n    { id: 'us', label: 'US-East', value: '14.2', unit: 'k/s', tone: 'secondary' },\n    { id: 'eu', label: 'EU-West', value: '9.8', unit: 'k/s', tone: 'rose' },\n  ]}\n/>`,
  ],
};
