export const docs = {
  name: 'MarqueeSelectionBox',
  displayName: 'Marquee Selection Box',
  group: 'File Explorer Navigation & Views',
  category: 'file-explorer-navigation',
  keywords: [
    'marquee',
    'lasso',
    'rubberband',
    'selection',
    'multi-select',
    'file-explorer',
    'grid',
    'aabb',
    'drag-select',
    'desktop',
    'workspace',
    'files',
  ],
  usage: {
    description:
      'Interactive translucent optical lasso marquee selection surface over a responsive file grid housed inside a sculpted `prism-slab` container. Supports real-time pointer rubber-band dragging in any direction with live AABB bounding-box intersection against every tile, additive `Shift`/`Ctrl`/`Meta` marquee dragging and click toggling, `Select All` and `Clear` header actions, full IME-safe keyboard grid traversal (`Arrow` keys, `Home`/`End`, `Space`/`Enter`, `Ctrl+A`/`Meta+A`, `Escape`), leak-free window pointer cleanup, and an `aria-live="polite"` selection summary.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `MarqueeSelectionBox` for desktop-grade file explorers, asset libraries, shader banks, and media bins where users routinely batch-select items via pointer rubber-band drag or keyboard multi-select.',
      },
      {
        guidance: true,
        description:
          'Supply stable unique `id` values on every `MarqueeSelectableItem` and pair controlled `selectedIds` with `onSelectionChange` when synchronizing selection with bulk action toolbars or detail inspectors.',
      },
      {
        guidance: false,
        description:
          'Rely on raw pointer dragging alone without keyboard alternatives or pass raw HTML inside item names; `MarqueeSelectionBox` renders every `name` and `sizeLabel` safely as literal text and provides full keyboard selection parity.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Multiselectable Listbox Grid with Roving Focus & IME Guard',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="region" linked via aria-labelledby, role="listbox" with aria-multiselectable="true", role="option" tiles with aria-selected, Arrow/Home/End focus movement, Space/Enter toggle, Ctrl/Meta+A select-all, and Escape clear guarded by !e.nativeEvent.isComposing',
        description:
          'Guarantees full keyboard parity with pointer lasso selection, preserves keyboard-only .prism-focus-ring focus indicators, and removes disabled tiles from tab order.',
      },
      {
        name: 'Leak-Free Window Pointer Lifecycle & Polite Live Selection Announcements',
        criterion: '2.4.7 Focus Visible, 2.5.1 Pointer Gestures & 4.1.3 Status Messages',
        requirement:
          'Detaches window pointermove/pointerup/pointercancel listeners on pointer release, pointercancel, disable, empty items, or unmount while announcing live selection counts and names in an aria-live="polite" summary and role="status" empty state',
        description:
          'Prevents dangling global listeners during mid-drag interruptions and keeps screen reader users informed as batch selections change.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Optical Marquee Selection'",
      description: 'Visible panel title linked to the region and listbox via aria-labelledby.',
    },
    {
      name: 'items',
      type: 'ReadonlyArray<MarqueeSelectableItem>',
      defaultValue: '8 realistic workspace files & folders',
      description:
        'Selectable items rendered in the responsive 2/4-column grid. Pass `[]` to display the `role="status"` empty state.',
    },
    {
      name: 'selectedIds',
      type: 'ReadonlyArray<string>',
      defaultValue: 'undefined',
      description: 'Controlled array of currently selected item IDs.',
    },
    {
      name: 'defaultSelectedIds',
      type: 'ReadonlyArray<string>',
      defaultValue: '[]',
      description: 'Initial uncontrolled selection of item IDs.',
    },
    {
      name: 'onSelectionChange',
      type: '(selectedIds: ReadonlyArray<string>) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the normalized array of selected item IDs whenever selection changes.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables click selection, marquee lasso dragging, keyboard controls, and Select All / Clear buttons.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<MarqueeSelectionBox />`,
    `<MarqueeSelectionBox\n  title="Shader Assets"\n  defaultSelectedIds={['hero-prism', 'optical-tokens']}\n  onSelectionChange={(ids) => console.warn('Selected:', ids)}\n/>`,
  ],
};

export default docs;
