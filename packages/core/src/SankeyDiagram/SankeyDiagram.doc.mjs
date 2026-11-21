export const docs = {
  name: 'SankeyDiagram',
  displayName: 'Sankey Diagram',
  group: 'Relational & Flow Visuals',
  category: 'relational-flow-charts',
  keywords: [
    'sankey',
    'flow',
    'ribbon',
    'alluvial',
    'funnel',
    'relational',
    'budget',
    'traffic',
    'energy',
    'stage',
    'svg',
    'chart',
  ],
  usage: {
    description:
      'Optical-glass multi-stage Sankey flow diagram that filters positive finite directed links via prototype-safe Maps, arranges nodes into sorted stage columns scaled proportionally to max(inflow, outflow), renders translucent cubic-bezier flow ribbons and rounded node bars using semantic --prism-* CSS tokens, and provides interactive link and node inspection inside a recessed prism-well strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Assign sequential integer stage numbers (0, 1, 2, ...) and semantic node tones (primary, secondary, emerald, amber, rose) so multi-hop flows trace cleanly from left to right across all Refractor themes.',
      },
      {
        guidance: true,
        description:
          'Supply valueUnit (such as "k", "MW", or " users") so header throughput badges, flow ribbon aria-labels, and recessed prism-well inspector readouts stay compact and immediately scannable.',
      },
      {
        guidance: false,
        description:
          'Expect zero, negative, non-finite, or self-referencing links to render; SankeyDiagram sanitizes invalid edges automatically and renders an accessible role="status" empty notice when no valid positive flow remains.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Flow Ribbons, Nodes & Live Inspector Readout',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every SVG flow ribbon and node bar exposes role="button", tabIndex={0}, aria-pressed, descriptive aria-label, IME-safe Enter/Space/Escape handling, and keyboard-only prism-focus-ring styling',
        description:
          'Activating a ribbon highlights that path (0.85 opacity vs 0.25 dimmed siblings), fires onSelectLink, and announces "{source} → {target}: {value}{unit}" in an aria-live="polite" prism-well region; activating a node highlights all incident links and announces its inflow/outflow summary.',
      },
      {
        name: 'Accessible SVG Container & Semantic Contrast',
        criterion: '1.1.1 Non-text Content & 1.4.1 Use of Color',
        requirement: 'role="img" SVG paired with textual node labels, stage headings, and clean empty status state',
        description:
          'Pairs semantic --prism-* stroke/fill tokens with legible adjacent node labels, stage guides, and exact numeric summaries in the inspector strip so flow volumes remain clear without relying on hue alone.',
      },
    ],
  },
  props: [
    {
      name: 'nodes',
      type: 'SankeyNode[]',
      defaultValue: 'required',
      description:
        "Array of { id, label, stage, tone? } nodes where tone is 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose'.",
    },
    {
      name: 'links',
      type: 'SankeyLink[]',
      defaultValue: 'required',
      description:
        'Array of { source, target, value } directed flow links; only finite values > 0 between distinct existing nodes are rendered.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Flow Sankey Diagram'",
      description: 'Heading displayed in the optical glass card header and bound to the diagram region.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '260',
      description: 'SVG viewport height in pixels, safely clamped between 160 and 520.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix appended to formatted flow values and inflow/outflow totals.',
    },
    {
      name: 'onSelectLink',
      type: '(link: SankeyLink, sourceNode: SankeyNode, targetNode: SankeyNode) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the selected SankeyLink and its resolved source and target SankeyNode records when any ribbon is clicked or activated via keyboard.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline style overrides.',
    },
  ],
  examples: [
    `<SankeyDiagram\n  title="Acquisition to Revenue Flow"\n  valueUnit="k"\n  nodes={[\n    { id: 'organic', label: 'Organic Search', stage: 0, tone: 'emerald' },\n    { id: 'paid', label: 'Paid Social', stage: 0, tone: 'primary' },\n    { id: 'trial', label: 'Free Trial', stage: 1, tone: 'secondary' },\n    { id: 'demo', label: 'Sales Demo', stage: 1, tone: 'amber' },\n    { id: 'paid-plan', label: 'Paid Plan', stage: 2, tone: 'emerald' },\n    { id: 'churn', label: 'Drop-off', stage: 2, tone: 'rose' },\n  ]}\n  links={[\n    { source: 'organic', target: 'trial', value: 120 },\n    { source: 'organic', target: 'demo', value: 30 },\n    { source: 'paid', target: 'trial', value: 60 },\n    { source: 'paid', target: 'demo', value: 40 },\n    { source: 'trial', target: 'paid-plan', value: 110 },\n    { source: 'trial', target: 'churn', value: 70 },\n    { source: 'demo', target: 'paid-plan', value: 55 },\n    { source: 'demo', target: 'churn', value: 15 },\n  ]}\n/>`,
  ],
};
