export const docs = {
  name: 'StructuredOutputViewer',
  displayName: 'Structured Output Viewer',
  group: 'CLI & Terminal Surfaces',
  category: 'cli-terminal',
  keywords: [
    'json',
    'structured-output',
    'tree',
    'table',
    'raw',
    'cli',
    'terminal',
    'inspector',
    'payload',
    'api',
  ],
  usage: {
    description:
      'Optical-glass JSON and structured CLI output inspector supporting collapsible Tree, adaptive Table, and pretty-printed Raw views, controlled or uncontrolled mode switching, prototype-safe key traversal, bounded recursion depth, semantic token coloring, and clipboard copy with emerald confirmation.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use StructuredOutputViewer to inspect CLI JSON responses, tool-call payloads, or structured API outputs across Tree, Table, and Raw formats.',
      },
      {
        guidance: true,
        description:
          'Tune defaultExpandedDepth (clamped 0..8) for deeply nested payloads so top-level keys stay scannable on initial render.',
      },
      {
        guidance: false,
        description:
          'Inject raw HTML strings into JSON values expecting markup execution; all keys and primitives are rendered strictly as literal React text.',
      },
    ],
    accessibility: [
      {
        name: 'Segmented Tablist & Panel Semantics',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement: 'role="tablist", role="tab" with aria-selected, role="tabpanel", and ArrowLeft/ArrowRight navigation',
        description:
          'Exposes Tree, Table, and Raw modes as accessible tabs linked via aria-controls and aria-labelledby with IME-safe keyboard switching.',
      },
      {
        name: 'Expandable Tree Nodes & Semantic Data Tables',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement: 'aria-expanded buttons for containers, <thead>/<tbody> table sections, and aria-live="polite" copy announcements',
        description:
          'Provides explicit aria-expanded state on every object and array toggle, proper table headers with scope attributes, and polite clipboard copy confirmations.',
      },
    ],
  },
  props: [
    {
      name: 'data',
      type: 'JsonValue',
      defaultValue: 'required',
      description: 'Typed JSON primitive, object, or array payload to inspect.',
    },
    {
      name: 'mode',
      type: "'tree' | 'table' | 'raw'",
      defaultValue: 'undefined',
      description: 'Controlled active view mode.',
    },
    {
      name: 'defaultMode',
      type: "'tree' | 'table' | 'raw'",
      defaultValue: "'tree'",
      description: 'Initial active view mode when used uncontrolled.',
    },
    {
      name: 'onModeChange',
      type: "(mode: 'tree' | 'table' | 'raw') => void",
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the active view mode changes.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Structured Output'",
      description: 'Heading displayed in the optical slab header.',
    },
    {
      name: 'defaultExpandedDepth',
      type: 'number',
      defaultValue: '2',
      description: 'Initial tree expansion depth clamped safely to 0..8.',
    },
    {
      name: 'onCopy',
      type: '(rawJson: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the pretty-printed JSON string when Copy JSON is clicked.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<StructuredOutputViewer\n  title="Deploy Status"\n  defaultMode="tree"\n  defaultExpandedDepth={2}\n  data={{\n    service: 'refractor-api',\n    healthy: true,\n    replicas: 3,\n    regions: ['us-west', 'eu-central'],\n  }}\n/>`,
  ],
};
