export const docs = {
  name: 'CascadingSelect',
  displayName: 'Cascading Multi-Level Select',
  group: 'Complex Variations of Common Controls',
  category: 'complex-controls',
  keywords: [
    'cascading',
    'select',
    'hierarchy',
    'tree',
    'columns',
    'breadcrumb',
    'multi-level',
    'taxonomy',
  ],
  usage: {
    description:
      'A multi-level hierarchical selector featuring an optical prism-crystal breadcrumb trigger with inline clear action and a floating prism-slab popover rendering side-by-side level columns (Level 1, Level 2, ...) for drilling down to leaf nodes.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use CascadingSelect for structured 2-to-4 level taxonomies such as Region / Country / City or Product Category / Subcategory / SKU.',
      },
      {
        guidance: true,
        description:
          'Customize the separator prop (e.g. " › " or " / ") to match your application breadcrumb convention.',
      },
      {
        guidance: false,
        description:
          'Nest more than 4–5 deep columns inside a narrow layout without horizontal scrolling consideration; keep branch labels concise.',
      },
    ],
    accessibility: [
      {
        name: 'Menu Trigger & Popover Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'aria-expanded, aria-haspopup="menu", aria-controls, role="menu", role="menuitem"',
        description:
          'Exposes trigger expansion state and links the floating column menu via aria-controls, while rendering the inline Clear (×) action as a distinct sibling button rather than a nested interactive element.',
      },
      {
        name: 'Keyboard Dismissal & Disabled Node Enforcement',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'IME-safe Escape closes and returns focus to trigger; ArrowDown opens; disabled trigger and nodes expose aria-disabled',
        description:
          'Closes cleanly on Escape or outside pointer click, returns focus to the trigger button on selection or Escape, and guards disabled nodes from expanding or committing.',
      },
    ],
  },
  props: [
    {
      name: 'options',
      type: 'CascadeOptionNode[]',
      defaultValue: 'required',
      description: 'Tree of { id, label, children?, disabled? } nodes rendered into side-by-side level columns.',
    },
    {
      name: 'value',
      type: 'string[]',
      defaultValue: 'undefined',
      description: 'Controlled array of selected node IDs from root to leaf.',
    },
    {
      name: 'defaultValue',
      type: 'string[]',
      defaultValue: 'undefined',
      description: 'Initial selected node ID path for uncontrolled usage.',
    },
    {
      name: 'onChange',
      type: '(pathIds: string[], nodes: CascadeOptionNode[]) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with committed path IDs and full resolved CascadeOptionNode array.',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "'Select hierarchy...'",
      description: 'Placeholder text rendered in the trigger when no valid path is selected.',
    },
    {
      name: 'separator',
      type: 'string',
      defaultValue: "' / '",
      description: 'String separating selected breadcrumb segment labels in the trigger.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Starts the cascading level popover open when true.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Hierarchy'",
      description: 'Visible accessible field label rendered above the trigger.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables opening the popover, selecting nodes, and clearing the current value.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<CascadingSelect\n  label="Deployment Region"\n  options={[\n    {\n      id: 'us',\n      label: 'United States',\n      children: [\n        { id: 'us-west', label: 'US West', children: [{ id: 'sfo', label: 'San Francisco' }] },\n        { id: 'us-east', label: 'US East', children: [{ id: 'iad', label: 'Virginia' }] },\n      ],\n    },\n  ]}\n  defaultValue={['us', 'us-west', 'sfo']}\n  onChange={(ids, nodes) => console.warn(ids, nodes)}\n/>`,
  ],
};
