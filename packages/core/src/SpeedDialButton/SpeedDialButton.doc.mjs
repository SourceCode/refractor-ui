export const docs = {
  name: 'SpeedDialButton',
  displayName: 'Speed Dial Button',
  group: 'Complex Button & Action Variations',
  category: 'complex-buttons',
  keywords: [
    'speed-dial',
    'speed dial',
    'fab',
    'floating',
    'radial',
    'quick actions',
    'action cluster',
    'menu',
    'button',
  ],
  usage: {
    description:
      'A compact circular optical-glass floating trigger button that fans out a cluster of secondary quick actions vertically, horizontally, or along a smooth bounded radial arc with crystal floating label pills.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Limit a SpeedDialButton to 3–5 high-frequency quick actions so both linear stacks and radial arcs stay uncluttered and easy to scan.',
      },
      {
        guidance: true,
        description:
          'Use directional modes ("up", "down", "left", "right") along viewport edges and "radial" when the trigger sits with clear surrounding canvas space.',
      },
      {
        guidance: false,
        description:
          'Rely exclusively on openOnHover for touch or keyboard workflows; keep click activation enabled alongside hover for universal accessibility.',
      },
    ],
    accessibility: [
      {
        name: 'Menu semantics & trigger state announcement',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'aria-expanded, aria-haspopup="menu", aria-controls, and role="menu"/"menuitem"',
        description:
          'Links the primary trigger button to the expanded action cluster via aria-controls and announces open state and individual action labels clearly.',
      },
      {
        name: 'IME-safe Escape dismissal & focus restoration',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement: 'Escape restores focus to trigger; keyboard-only prism-focus-ring on all controls',
        description:
          'Dismisses the open cluster on Escape (ignoring active IME composition) while returning focus to the primary trigger button, and uses :focus-visible rings everywhere.',
      },
    ],
  },
  props: [
    {
      name: 'actions',
      type: 'SpeedDialAction[]',
      defaultValue: 'required',
      description: 'Array of secondary quick actions rendered when the speed dial expands.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled open state of the secondary action cluster.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial open state when operating in uncontrolled mode.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the speed dial opens or closes.',
    },
    {
      name: 'direction',
      type: "'up' | 'down' | 'left' | 'right' | 'radial'",
      defaultValue: "'up'",
      description: 'Direction or radial arc geometry used to fan out secondary action buttons.',
    },
    {
      name: 'triggerLabel',
      type: 'string',
      defaultValue: "'Quick actions'",
      description: 'Accessible label assigned to the circular primary trigger button.',
    },
    {
      name: 'openOnHover',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Opens the action cluster on mouse enter and closes it on mouse leave while enabled.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables the primary trigger button and suppresses opening or hover reveal.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<SpeedDialButton\n  direction="up"\n  triggerLabel="Create item"\n  actions={[\n    { id: 'note', label: 'New note', icon: <FileText className="w-4 h-4" />, tone: 'primary', onSelect: createNote },\n    { id: 'upload', label: 'Upload file', icon: <Upload className="w-4 h-4" />, tone: 'emerald', onSelect: openUpload },\n    { id: 'share', label: 'Share link', icon: <Share2 className="w-4 h-4" />, tone: 'secondary', onSelect: copyLink },\n  ]}\n/>`,
    `<SpeedDialButton\n  direction="radial"\n  openOnHover\n  actions={[\n    { id: 'pin', label: 'Pin', icon: <Pin className="w-4 h-4" />, tone: 'amber', onSelect: pinItem },\n    { id: 'copy', label: 'Duplicate', icon: <Copy className="w-4 h-4" />, onSelect: duplicateItem },\n    { id: 'delete', label: 'Archive', icon: <Trash2 className="w-4 h-4" />, tone: 'rose', onSelect: archiveItem },\n  ]}\n/>`,
  ],
};
