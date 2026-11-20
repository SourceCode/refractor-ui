export const docs = {
  name: 'StickyActionBar',
  displayName: 'Sticky Action Bar',
  group: 'Buttons & Actions',
  category: 'buttons-actions',
  keywords: ['sticky', 'action', 'bar', 'toolbar', 'bulk', 'selection', 'floating', 'batch'],
  usage: {
    description:
      'Elevated optical crystal pill toolbar anchored to the bottom, top, or inline flow for bulk multi-select operations with a warm refractive counter orb, Select all / Clear micro-controls, and tonal action capsules.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Limit bulk toolbar actions to 2-4 high-frequency batch operations (e.g., Export, Archive, Delete) so the floating pill remains scannable.',
      },
      {
        guidance: true,
        description:
          'Always wire onClearSelection so users can dismiss the selection via either the Clear button or the Escape key.',
      },
      {
        guidance: false,
        description:
          'Use the destructive crimson tone for non-destructive actions; reserve it exclusively for irreversible bulk deletions.',
      },
    ],
    accessibility: [
      {
        name: 'Toolbar landmark & live selection readout',
        criterion: '4.1.3 Status Messages',
        requirement:
          'role="toolbar", aria-label="Bulk selection actions", and aria-live="polite" selection readout',
        description:
          'Selection count updates announce politely to screen readers without stealing focus, while the decorative numeric orb is hidden from assistive trees.',
      },
      {
        name: 'Keyboard dismissal & disabled parity',
        criterion: '2.1.1 Keyboard',
        requirement:
          'Escape invokes onClearSelection; disabled capsules block activation with disabled:cursor-not-allowed',
        description:
          'All micro-controls and action capsules use native <button type="button"> elements with keyboard-only prism-focus-ring indicators.',
      },
    ],
  },
  props: [
    {
      name: 'selectedCount',
      type: 'number',
      defaultValue: 'required',
      description:
        'Active selection count; hides the toolbar when <= 0 or NaN unless alwaysVisible is true.',
    },
    {
      name: 'totalCount',
      type: 'number',
      defaultValue: 'undefined',
      description:
        'Optional total item count displayed beside the readout and used to disable Select all when fully selected.',
    },
    {
      name: 'alwaysVisible',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Forces the toolbar to remain visible even when selectedCount is 0.',
    },
    {
      name: 'position',
      type: "'bottom' | 'top' | 'inline'",
      defaultValue: "'bottom'",
      description: 'Controls sticky bottom/top viewport anchoring or inline layout placement.',
    },
    {
      name: 'actions',
      type: 'ReadonlyArray<StickyActionItem>',
      defaultValue: 'required',
      description:
        'Action buttons rendered as optical capsules with primary, secondary, cobalt, or destructive tones.',
    },
    {
      name: 'onSelectAll',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional callback that renders the Select all micro-control.',
    },
    {
      name: 'onClearSelection',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Optional callback that renders the Clear micro-control and handles Escape key dismissal.',
    },
    {
      name: 'selectionLabel',
      type: '(count: number) => string',
      defaultValue: '(count) => `${count} selected`',
      description: 'Formatter for the live selection count readout.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<StickyActionBar\n  selectedCount={4}\n  totalCount={24}\n  position="bottom"\n  onSelectAll={selectAll}\n  onClearSelection={clearSelection}\n  actions={[\n    { id: 'export', label: 'Export', tone: 'secondary', onClick: handleExport },\n    { id: 'publish', label: 'Publish', tone: 'primary', onClick: handlePublish },\n    { id: 'delete', label: 'Delete', tone: 'destructive', onClick: handleDelete },\n  ]}\n/>`,
  ],
};
