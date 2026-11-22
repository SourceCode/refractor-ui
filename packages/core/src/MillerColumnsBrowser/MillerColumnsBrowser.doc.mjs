export const docs = {
  name: 'MillerColumnsBrowser',
  displayName: 'Miller Columns Browser',
  group: 'Desktop OS & Windowing Metaphors',
  category: 'desktop-os-windowing',
  keywords: [
    'miller',
    'columns',
    'finder',
    'browser',
    'explorer',
    'filesystem',
    'tree',
    'hierarchy',
    'breadcrumbs',
    'preview',
    'desktop',
    'windowing',
    'cascading',
  ],
  usage: {
    description:
      'Desktop-OS optical-glass cascading Miller columns explorer built on a sculpted `prism-slab` header with a clickable breadcrumb path trail (`packages / core / PrimaryButton.tsx`), live item counter pill, and a horizontally swipeable `prism-well` multi-column viewport. Selecting folders opens children in the adjacent right column (bounded at `MAX_DEPTH = 10` against adversarial cyclic trees), while selecting files opens a rich right-hand File Preview Pane with semantic kind icons, badges, metadata, and literal monospace or prose preview text.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Assign distinct node IDs within each folder level and provide concise `sizeLabel`, `modifiedAt`, and `previewText` fields so the File Preview Pane conveys immediate context on selection.',
      },
      {
        guidance: true,
        description:
          'Use `defaultSelectedPath` to deep-link users directly to a relevant source file or directory while preserving interactive breadcrumb back-navigation and full keyboard arrow traversal.',
      },
      {
        guidance: false,
        description:
          'Expect recursive column expansion past 10 levels or pass untrusted HTML expecting markup rendering; `MillerColumnsBrowser` caps column depth at `MAX_DEPTH = 10` and renders every name and `previewText` strictly as literal text.',
      },
    ],
    accessibility: [
      {
        name: 'Cascading Listbox Columns & Breadcrumb Navigation Landmark',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'role="region" linked via aria-labelledby, <nav aria-label="Breadcrumb path"> with aria-current="location", role="listbox" columns with role="option" and aria-selected, and role="status" empty states',
        description:
          'Exposes each Miller column as a labeled listbox with selectable options and provides semantic breadcrumb and preview landmarks for assistive technologies.',
      },
      {
        name: 'Full Directional Keyboard Navigation & IME Safety',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'ArrowUp/ArrowDown within column, ArrowRight into folder children, ArrowLeft back to parent column, IME-safe Enter/Space (!e.nativeEvent.isComposing), and keyboard-only .prism-focus-ring outlines',
        description:
          'Supports fluid keyboard-only directory traversal across columns with managed focus restoration while ignoring keys during active IME composition.',
      },
    ],
  },
  props: [
    {
      name: 'roots',
      type: 'ReadonlyArray<MillerFileNode>',
      defaultValue: '3-level Refractor project filesystem tree (.tsx, .css, .png, .md, .wav)',
      description:
        'Root folder and file nodes to browse. Pass `[]` to display the `role="status"` empty state.',
    },
    {
      name: 'defaultSelectedPath',
      type: 'ReadonlyArray<string>',
      defaultValue: "['packages', 'core', 'primary-button'] when roots omitted, else []",
      description:
        'Initial uncontrolled path of node IDs selected from root through nested folders or a target file.',
    },
    {
      name: 'onSelectNode',
      type: '(node: MillerFileNode, pathIds: string[]) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the selected node and resolved path of node IDs whenever selection changes via pointer, keyboard, or breadcrumb click.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Miller Columns Explorer'",
      description: 'Visible explorer heading in the sculpted `prism-slab` header.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<MillerColumnsBrowser />`,
    `<MillerColumnsBrowser\n  title="Workspace Assets"\n  defaultSelectedPath={['design', 'hero.png']}\n  roots={[\n    {\n      id: 'design',\n      name: 'design',\n      kind: 'folder',\n      children: [\n        { id: 'hero.png', name: 'hero.png', kind: 'image', sizeLabel: '412 KB', modifiedAt: 'Today', previewText: '2560 x 1440 optical glass render.' },\n      ],\n    },\n  ]}\n  onSelectNode={(node, pathIds) => console.warn(node.name, pathIds)}\n/>`,
  ],
};

export default docs;
