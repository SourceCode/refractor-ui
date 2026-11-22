export const docs = {
  name: 'MinimizedWindowTray',
  displayName: 'Minimized Window Tray',
  group: 'Window Management & Desktop Tiling',
  category: 'window-management-tiling',
  keywords: [
    'minimized',
    'window-tray',
    'taskbar',
    'dock',
    'shelf',
    'thumbnails',
    'glass-pills',
    'restore',
    'window-management',
    'tiling',
    'desktop-os',
    'workspace',
  ],
  usage: {
    description:
      'Dedicated optical-glass dock/taskbar shelf housed inside a sculpted `prism-slab` container that holds minimized workspace windows either as live miniature optical window preview thumbnails (with miniature titlebar chrome, semantic `--prism-*` skeleton viewport, app label, title, timestamp, and close trigger) or as sleek refractive glass capsule pills (`prism-crystal rounded-full`) until restored. Includes a live minimized count badge, `Thumbnails` / `Glass Pills` display switcher (`aria-pressed`), `Restore All` action, IME-safe roving `ArrowLeft`/`ArrowRight`/`Home`/`End` + `Enter`/`Space` keyboard navigation, a `role="status"` empty state, and polite `aria-live="polite"` announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `thumbnails` mode when users minimize visually distinct canvases, documents, or terminals and benefit from miniature optical window previews with timestamps; switch to `pills` mode for high-density taskbars and compact horizontal docks.',
      },
      {
        guidance: true,
        description:
          'Pass controlled `items` together with `onRestoreWindow`, `onRestoreAll`, and `onCloseWindow` when synchronizing minimized state with a desktop tiling window manager or multi-pane studio shell.',
      },
      {
        guidance: false,
        description:
          'Do not nest the per-window close button inside the restore trigger button; `MinimizedWindowTray` keeps each restore trigger and `Close <title>` button as clean sibling controls to preserve valid interactive semantics.',
      },
    ],
    accessibility: [
      {
        name: 'Roving Keyboard Navigation & IME-Safe Restoration',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Horizontally scrollable `role="list"` shelf with roving `tabIndex`, wrapping `ArrowLeft`/`ArrowRight`, `Home`/`End` navigation, `Enter`/`Space` restoration guarded against `isComposing`, and `aria-pressed` display mode toggles',
        description:
          'Allows keyboard users to traverse minimized windows in both Thumbnails and Glass Pills modes with a single tab stop, restore any window with Enter or Space without hijacking IME composition commits, and dismiss individual windows via explicit `Close <title>` buttons.',
      },
      {
        name: 'Polite Live Announcements & Empty Tray Status',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Keyboard-only `:focus-visible` (`prism-focus-ring`) outlines, semantic `--prism-*` color tokens, a `role="status"` empty tray placeholder when no windows remain, and an `aria-live="polite"` status bar announcing restore, close, and view switches',
        description:
          'Ensures screen-reader users receive immediate polite confirmation whenever windows are restored individually, restored all at once, closed, or toggled between Thumbnails and Glass Pills.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Minimized Windows'",
      description:
        'Tray heading displayed inside the header and linked to the root region landmark via `aria-labelledby`.',
    },
    {
      name: 'items',
      type: 'ReadonlyArray<MinimizedWindowItem>',
      defaultValue: 'undefined',
      description:
        'Controlled list of minimized windows (`{ id, appName, title, minimizedAt, tone? }`). Pass `[]` to display the `role="status"` empty tray state.',
    },
    {
      name: 'defaultItems',
      type: 'ReadonlyArray<MinimizedWindowItem>',
      defaultValue:
        '4 default studio windows (ShaderGraph_v3.prism, ReleaseLogs — zsh, Q4_Budget.xlsx, BrandSpec.pdf)',
      description:
        'Initial minimized window entries when operating in uncontrolled mode.',
    },
    {
      name: 'displayMode',
      type: "'thumbnails' | 'pills'",
      defaultValue: 'undefined',
      description:
        'Controlled presentation mode selecting miniature optical window preview cards or refractive glass capsule pills.',
    },
    {
      name: 'defaultDisplayMode',
      type: "'thumbnails' | 'pills'",
      defaultValue: "'thumbnails'",
      description:
        'Initial presentation mode when operating in uncontrolled mode.',
    },
    {
      name: 'onDisplayModeChange',
      type: "(mode: 'thumbnails' | 'pills') => void",
      defaultValue: 'undefined',
      description:
        'Callback fired when switching between `thumbnails` and `pills` presentation modes.',
    },
    {
      name: 'onRestoreWindow',
      type: '(item: MinimizedWindowItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the restored `MinimizedWindowItem` when clicked or activated via `Enter`/`Space`.',
    },
    {
      name: 'onRestoreAll',
      type: '(items: ReadonlyArray<MinimizedWindowItem>) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the snapshot of all minimized windows when the `Restore All` button is clicked.',
    },
    {
      name: 'onCloseWindow',
      type: '(windowId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the window identifier when a per-window `Close <title>` button is clicked.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables display mode switching, `Restore All`, window restoration, and per-window close controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<MinimizedWindowTray\n  onRestoreWindow={(win) => console.warn('Restored:', win.title)}\n  onRestoreAll={(list) => console.warn('Restored all:', list.length)}\n/>`,
    `<MinimizedWindowTray\n  title="Workspace Dock Shelf"\n  displayMode="pills"\n  items={[\n    { id: 'shader', appName: 'Prism Studio', title: 'ShaderGraph_v3.prism', minimizedAt: '2m ago', tone: 'primary' },\n    { id: 'logs', appName: 'Terminal', title: 'ReleaseLogs — zsh', minimizedAt: '6m ago', tone: 'info' },\n    { id: 'budget', appName: 'Sheets', title: 'Q4_Budget.xlsx', minimizedAt: '14m ago', tone: 'emerald' },\n  ]}\n  onDisplayModeChange={(mode) => { void mode; }}\n  onRestoreWindow={(win) => { void win; }}\n  onCloseWindow={(id) => { void id; }}\n/>`,
  ],
};

export default docs;
