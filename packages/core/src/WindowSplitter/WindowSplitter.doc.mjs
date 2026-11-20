export const docs = {
  name: 'WindowSplitter',
  displayName: 'Window Splitter / Resizable Panes',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['splitter', 'resizable', 'panes', 'layout', 'divider', 'workspace', 'panel'],
  usage: {
    description:
      'Optical glass multi-pane split layout framed in a thick prism-slab container with recessed frosted pane wells and tactile refractive crystal divider bars supporting pointer dragging, double-click reset, and WAI-ARIA keyboard resizing.',
    bestPractices: [
      { guidance: true, description: 'Supply concise pane labels and sensible minSize/maxSize constraints so controls inside each pane never collapse past legibility.' },
      { guidance: true, description: 'Use orientation="horizontal" for side-by-side workspace panes and orientation="vertical" for stacked editor/console layouts.' },
      { guidance: false, description: 'Pass negative or NaN percentage bounds without expecting automatic clamping to safe 0-100 proportions.' },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Window Splitter pattern',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'role="separator", aria-orientation, aria-valuenow/min/max, Arrow/Home/End/Enter keys',
        description: 'Each crystal divider exposes role="separator" with live percentage bounds, keyboard arrow resizing, Home/End min/max jumps, and Enter reset.',
      },
    ],
  },
  props: [
    { name: 'panes', type: 'ReadonlyArray<WindowSplitterPane>', defaultValue: 'required', description: 'Ordered pane definitions with id, optional label, content, and optional minSize/maxSize percentages.' },
    { name: 'orientation', type: "'horizontal' | 'vertical'", defaultValue: "'horizontal'", description: 'Layout axis of the split panes.' },
    { name: 'sizes', type: 'ReadonlyArray<number>', defaultValue: 'undefined', description: 'Controlled percentage array summing to 100.' },
    { name: 'defaultSizes', type: 'ReadonlyArray<number>', defaultValue: 'equal split', description: 'Initial uncontrolled percentages and reset target.' },
    { name: 'onSizesChange', type: '(sizes: number[]) => void', defaultValue: 'undefined', description: 'Called with updated pane percentages during drag, keyboard resize, or reset.' },
    { name: 'step', type: 'number', defaultValue: '5', description: 'Percentage step applied per keyboard arrow key press.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<WindowSplitter\n  orientation="horizontal"\n  defaultSizes={[35, 65]}\n  panes={[\n    { id: 'explorer', label: 'Explorer', minSize: 20, maxSize: 50, content: <p>Files</p> },\n    { id: 'editor', label: 'Editor', minSize: 30, maxSize: 80, content: <p>Code</p> },\n  ]}\n/>`,
  ],
};
