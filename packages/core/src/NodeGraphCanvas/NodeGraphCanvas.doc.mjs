export const docs = {
  name: 'NodeGraphCanvas',
  displayName: 'Node Graph / Flow Canvas',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: [
    'node',
    'graph',
    'flow',
    'canvas',
    'workflow',
    'dag',
    'bezier',
    'edges',
    'ports',
    'pan',
    'zoom',
  ],
  usage: {
    description:
      'Interactive 2D optical glass node-graph and workflow canvas with pan/zoom studio grid, floating prism-crystal HUD toolbar, smooth token-driven cubic bezier SVG edges, pointer-draggable and keyboard-nudgeable refractive nodes, and interactive output-to-input port wiring.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use distinct FlowNodeTone values ("primary" | "emerald" | "cobalt" | "crystal") and categories to differentiate triggers, transforms, models, and sinks.',
      },
      {
        guidance: true,
        description:
          'Provide controlled nodes/edges with onNodesChange/onEdgesChange when synchronizing graphs with backend workflows or undo/redo stacks.',
      },
      {
        guidance: false,
        description:
          'Attach passive wheel preventDefault handlers; rely on the floating HUD zoom controls and +/- keyboard shortcuts for accessible zoom.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard node manipulation & port wiring',
        criterion: '2.1.1 Keyboard',
        requirement: 'Arrow keys nudge focused nodes by 16px; Delete/Backspace removes; Escape cancels active connections; +/-/0 control zoom and reset',
        description:
          'Every node card, input port, output port, edge remove button, and HUD control is keyboard-focusable with keyboard-only prism-focus-ring outlines and IME-guarded keydown handling.',
      },
      {
        name: 'Semantic token contrast & read-only reflection',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Disabled states on ports and toolbar actions expose disabled attributes without unguarded hover lift',
        description:
          'All SVG edge strokes and node accents read from --prism-* CSS custom properties so themes cascade automatically while maintaining contrast.',
      },
    ],
  },
  props: [
    {
      name: 'nodes',
      type: 'ReadonlyArray<FlowNode>',
      defaultValue: 'undefined',
      description: 'Controlled list of graph nodes rendered on the 2D canvas.',
    },
    {
      name: 'defaultNodes',
      type: 'ReadonlyArray<FlowNode>',
      defaultValue: 'undefined',
      description: 'Initial uncontrolled list of graph nodes.',
    },
    {
      name: 'edges',
      type: 'ReadonlyArray<FlowEdge>',
      defaultValue: 'undefined',
      description: 'Controlled list of directed edges between node ports.',
    },
    {
      name: 'defaultEdges',
      type: 'ReadonlyArray<FlowEdge>',
      defaultValue: 'undefined',
      description: 'Initial uncontrolled list of directed edges.',
    },
    {
      name: 'onNodesChange',
      type: '(nodes: FlowNode[]) => void',
      defaultValue: 'undefined',
      description: 'Invoked with the updated sanitized FlowNode[] whenever nodes change.',
    },
    {
      name: 'onEdgesChange',
      type: '(edges: FlowEdge[]) => void',
      defaultValue: 'undefined',
      description: 'Invoked with the updated sanitized FlowEdge[] whenever edges change.',
    },
    {
      name: 'onSelectNode',
      type: '(node: FlowNode | null) => void',
      defaultValue: 'undefined',
      description: 'Invoked whenever the active node selection changes or clears.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '380',
      description: 'Canvas height in pixels, clamped safely between 220 and 900.',
    },
    {
      name: 'readOnly',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Prevents adding, dragging, nudging, connecting, or deleting nodes and edges.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<NodeGraphCanvas\n  height={420}\n  defaultNodes={[\n    { id: 'n1', label: 'Webhook Trigger', category: 'Input', x: 60, y: 120, tone: 'primary' },\n    { id: 'n2', label: 'Optical Classifier', category: 'Model', x: 340, y: 120, tone: 'cobalt' },\n  ]}\n  defaultEdges={[{ id: 'e1', sourceId: 'n1', targetId: 'n2', label: 'JSON' }]}\n/>`,
  ],
};
