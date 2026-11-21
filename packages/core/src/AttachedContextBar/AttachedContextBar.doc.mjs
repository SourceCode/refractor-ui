export const docs = {
  name: 'AttachedContextBar',
  displayName: 'Attached Context Bar',
  group: 'AI Context, Memory & Configuration',
  category: 'ai-context-memory',
  keywords: [
    'attached',
    'context',
    'bar',
    'chips',
    'files',
    'folder',
    'url',
    'snippet',
    'pin',
    'tokens',
    'prompt',
    'ai',
    'rag',
  ],
  usage: {
    description:
      'Horizontal optical-glass prism-slab bar for managing prompt-attached files, folders, URLs, and code snippets as interactive prism-crystal chips with semantic icons, formatted token estimates, pin/unpin persistence toggles, dismissal controls, and an optional Attach Context trigger.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Place AttachedContextBar directly above a PromptComposer or alongside a ContextTokenMeter so operators can inspect and prune context before sending a prompt.',
      },
      {
        guidance: true,
        description:
          'Use controlled items and onItemsChange when synchronizing pinned context across tabs or persisting pinned files into workspace settings.',
      },
      {
        guidance: false,
        description:
          'Pass unvalidated NaN or negative token counts into summaries; AttachedContextBar automatically ignores non-finite or negative estimates when computing the header token total.',
      },
    ],
    accessibility: [
      {
        name: 'Explicit Per-Item Action Labels',
        criterion: '2.4.4 Link Purpose & 4.1.2 Name, Role, Value',
        requirement: 'aria-pressed on Pin toggle with dynamic "Pin {label}" / "Unpin {label}" and "Remove {label}" aria-labels',
        description:
          'Every chip action button names its target item explicitly and reflects pinned toggle state programmatically via aria-pressed and data-pinned.',
      },
      {
        name: 'Keyboard-Only Optical Focus Rings',
        criterion: '2.4.7 Focus Visible',
        requirement: 'prism-focus-ring (:focus-visible) across Add, Pin, and Remove controls',
        description:
          'Preserves clean pointer interactions while displaying high-contrast optical focus rings during keyboard navigation.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'AttachedContextItem[]',
      defaultValue: 'undefined',
      description: 'Controlled array of attached context items ({ id, label, kind, tokens?, pinned? }).',
    },
    {
      name: 'defaultItems',
      type: 'AttachedContextItem[]',
      defaultValue: '[]',
      description: 'Initial attached items when operating in uncontrolled mode.',
    },
    {
      name: 'onItemsChange',
      type: '(items: AttachedContextItem[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the next items array whenever an item is pinned, unpinned, or removed.',
    },
    {
      name: 'onRemove',
      type: '(id: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the removed item id when Remove is clicked.',
    },
    {
      name: 'onTogglePin',
      type: '(id: string, pinned: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the item id and updated pinned state when Pin/Unpin is clicked.',
    },
    {
      name: 'onAddClick',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional click handler that renders the "+ Attach Context" crystal trigger button in the header.',
    },
    {
      name: 'addLabel',
      type: 'string',
      defaultValue: "'Attach Context'",
      description: 'Text label rendered inside the optional add context trigger button.',
    },
    {
      name: 'emptyMessage',
      type: 'string',
      defaultValue: "'No context items attached.'",
      description: 'Message rendered inside a recessed prism-well when no context items are attached.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<AttachedContextBar\n  defaultItems={[\n    { id: 'f1', label: 'packages/core/src/BaseProps.ts', kind: 'file', tokens: 640, pinned: true },\n    { id: 'd1', label: 'packages/core/src/theme', kind: 'folder', tokens: 3200 },\n    { id: 'u1', label: 'docs.refractor.dev/adr/0003', kind: 'url', tokens: 1150 },\n    { id: 's1', label: 'mergeProps snippet', kind: 'snippet', tokens: 420 },\n  ]}\n  onAddClick={() => openFilePicker()}\n/>`,
  ],
};
