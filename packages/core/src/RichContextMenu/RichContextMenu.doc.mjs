export const docs = {
  name: 'RichContextMenu',
  displayName: 'Rich Context Menu',
  group: 'Menus & Launchers',
  category: 'menus-launchers',
  keywords: [
    'rich-context-menu',
    'context-menu',
    'right-click',
    'quick-actions',
    'icon-strip',
    'color-tags',
    'tags',
    'menu',
    'finder',
    'shortcuts',
    'optical-glass',
    'launcher',
  ],
  usage: {
    description:
      'Optical-glass rich context menu housed inside a refractive `prism-slab` container that pairs a target context header and interactive right-click preview surface with a top 5-button quick-action squircle toolbar (**Cut**, **Copy**, **Paste**, **Rename**, and error-tinted **Delete**), a 6-tone semantic color-tag dot selector (**Amber**, **Crimson**, **Emerald**, **Cobalt**, **Gold**, **Violet** strictly driven by `--prism-*` tokens), and a standard vertical `role="menu"` command list below. Defaults to an immediately visible inline panel (`defaultOpen = true`) with an `Open Menu` / `Hide Menu` toggle, IME-safe roving `ArrowDown`/`ArrowUp`/`Home`/`End` menu navigation skipping disabled rows, `Enter`/`Space` execution, `Escape` dismissal with focus restoration, and a polite `aria-live="polite"` status strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep the top quick-action icon strip focused on high-frequency spatial commands (Cut, Copy, Paste, Rename, Delete) while reserving the vertical menu list for secondary inspection, sharing, archiving, and destructive actions.',
      },
      {
        guidance: true,
        description:
          'Pass `disablePaste` when the user clipboard is empty so the Paste squircle button communicates unavailability clearly and is skipped during toolbar arrow navigation.',
      },
      {
        guidance: true,
        description:
          'Pair `selectedTags` and `onTagsChange` when persisting Finder-style file or asset color tags to application state, or supply `defaultSelectedTags` for self-managed interactive specimens.',
      },
      {
        guidance: false,
        description:
          'Hardcode raw hex or RGB values for color tag dots; `RichContextMenu` binds every tag dot exclusively to `--prism-*` palette tokens so all optical themes and dark mode stay harmonious.',
      },
    ],
    accessibility: [
      {
        name: 'Composite Toolbar, Color-Tag Toggle Group & Vertical Menu Semantics',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes `role="toolbar" aria-label="Quick actions"`, `role="group" aria-label="Color tags"` with `aria-pressed` toggle buttons and checkmarks, and `role="menu"` with roving `tabIndex` `role="menuitem"` rows and `role="separator"` dividers',
        description:
          'Enables screen-reader and keyboard users to navigate quick actions with ArrowLeft/ArrowRight/Home/End, toggle semantic color tags with Enter/Space without relying solely on color, and traverse vertical commands with ArrowDown/ArrowUp/Home/End skipping disabled items.',
      },
      {
        name: 'IME-Safe Keyboard Handling, Keyboard-Only Focus Rings & Live Status Feedback',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards all `onKeyDown` handlers with `!e.nativeEvent.isComposing`, restores focus to the menu toggle button on `Escape`, applies `.prism-focus-ring` (`:focus-visible`), and announces actions and tag updates in an `aria-live="polite"` status strip',
        description:
          'Prevents accidental command execution or dismissal during IME composition and confirms quick actions, color-tag toggles, and vertical menu executions cleanly to assistive technologies.',
      },
    ],
  },
  props: [
    {
      name: 'targetLabel',
      type: 'string',
      defaultValue: "'HeroPrism_v4.png'",
      description:
        'Active target item label shown in the context header, right-click preview area, and live status announcements.',
    },
    {
      name: 'actions',
      type: 'ReadonlyArray<RichContextMenuAction>',
      defaultValue:
        '5 default commands (Get Info, Duplicate, Compress to Archive, Share Link…, divider, Move to Trash)',
      description:
        'Vertical menu actions displayed below the quick-action toolbar and color-tag dots. Supports `shortcut`, `destructive`, `disabled`, and `dividerBefore`.',
    },
    {
      name: 'selectedTags',
      type: 'ReadonlyArray<RichContextTagTone>',
      defaultValue: 'undefined',
      description:
        'Controlled array of active semantic color tag tones (`primary` | `rose` | `emerald` | `info` | `amber` | `secondary`).',
    },
    {
      name: 'defaultSelectedTags',
      type: 'ReadonlyArray<RichContextTagTone>',
      defaultValue: '[]',
      description: 'Initial active color tag tones when operating in uncontrolled mode.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Initial visibility of the inline rich context menu panel.',
    },
    {
      name: 'disablePaste',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables the Paste quick-action squircle button when clipboard content is empty.',
    },
    {
      name: 'onQuickAction',
      type: '(actionId: RichContextQuickActionId) => void',
      defaultValue: 'undefined',
      description:
        "Callback invoked with `'cut' | 'copy' | 'paste' | 'rename' | 'delete'` when an enabled quick-action icon button is triggered.",
    },
    {
      name: 'onSelectAction',
      type: '(actionId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the command `id` when an enabled vertical menu row is activated via click, Enter, or Space.',
    },
    {
      name: 'onTagsChange',
      type: '(tags: ReadonlyArray<RichContextTagTone>) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the updated array of active color tag tones whenever a color-tag dot is toggled.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables the toggle button, right-click surface, quick-action buttons, color-tag dots, and vertical menu items.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and inline optical style overrides merged cleanly onto the root `prism-slab`.',
    },
  ],
  examples: [
    `<RichContextMenu\n  targetLabel="HeroPrism_v4.png"\n  defaultSelectedTags={['primary', 'info']}\n  onQuickAction={(actionId) => console.warn('quick:', actionId)}\n  onSelectAction={(actionId) => console.warn('action:', actionId)}\n  onTagsChange={(tags) => console.warn('tags:', tags)}\n/>`,
    `<RichContextMenu\n  targetLabel="CausticShader_Final.exr"\n  disablePaste\n  actions={[\n    { id: 'inspect', label: 'Inspect Optical Channels', shortcut: '⌘I' },\n    { id: 'export', label: 'Export Render Pass…', shortcut: '⇧⌘E' },\n    { id: 'lock', label: 'Lock Asset (Read-Only)', disabled: true },\n    { id: 'trash', label: 'Move to Trash', shortcut: '⌘⌫', destructive: true, dividerBefore: true },\n  ]}\n/>`,
  ],
};

export default docs;
