export const docs = {
  name: 'WindowSwitcherOverlay',
  displayName: 'Window Switcher Overlay',
  group: 'Window Management & Desktop Tiling',
  category: 'window-management-tiling',
  keywords: [
    'window',
    'switcher',
    'alt-tab',
    'cmd-tab',
    'overlay',
    'tiling',
    'desktop',
    'workspace',
    'thumbnail',
    'listbox',
    'window-management',
  ],
  usage: {
    description:
      'Centered Alt+Tab / Cmd+Tab floating optical window switcher strip housed inside a sculpted `prism-slab` surface. Renders a horizontally scrollable `role="listbox"` (`aria-label="Active windows"`) of miniature optical window preview thumbnails—complete with miniature traffic-light dots, tone-tinted `--prism-*` headers, skeleton viewport lines, app name, window title, workspace pill, and quick `Close <title>` button. Supports both `inline` and modal `overlay` presentation (`role="dialog" aria-modal="true"` with frosted backdrop click and `Escape` dismissal), full IME-safe keyboard cycling (`ArrowRight`/`Tab`, `ArrowLeft`/`Shift+Tab`, `Home`/`End`, `Enter`/`Space`, `Delete`/`Backspace`, `Escape`), a responsive `flex-wrap` footer telemetry bar with `Previous`/`Next`/`Focus Window` tactile controls and `aria-live="polite"` status text, plus a clean `role="status"` empty state.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `mode="overlay"` paired with controlled `open` and `onDismiss` for full-viewport desktop Alt+Tab / Cmd+Tab task switching, and `mode="inline"` for embedded workspace strips, interactive docs demos, or split-screen control centers.',
      },
      {
        guidance: true,
        description:
          'Provide distinct `tone` values (`primary`, `info`, `emerald`, `amber`, `rose`) and `workspaceLabel` metadata per window item so users can recognize virtual desktops and app categories at a glance.',
      },
      {
        guidance: false,
        description:
          'Use `WindowSwitcherOverlay` for static document navigation tabs inside a single window titlebar; use `MergedWindowTabBar` or `PrismTabs` for persistent in-window tabs.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Horizontal Listbox & Modal Dialog Semantics',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes `role="listbox"` (`aria-label="Active windows"`, `aria-orientation="horizontal"`, `aria-activedescendant`) with `role="option"` cards reflecting `aria-selected`, wraps `mode="overlay"` inside `role="dialog" aria-modal="true"`, and renders a `role="status"` empty state when no windows remain',
        description:
          'Ensures screen readers announce the active window preview, total window count, and modal overlay scope accurately across both inline and floating overlay modes.',
      },
      {
        name: 'IME-Safe Alt+Tab Keyboard Cycling & Polite Telemetry',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards all keyboard shortcuts (`ArrowRight`/`Tab`, `ArrowLeft`/`Shift+Tab`, `Home`/`End`, `Enter`/`Space`, `Delete`/`Backspace`, `Escape`) with `!event.nativeEvent.isComposing` and `!disabled`, applies keyboard-only `.prism-focus-ring` (`:focus-visible`), and broadcasts highlight, focus, close, and dismiss updates through an `aria-live="polite"` status readout',
        description:
          'Prevents active IME compositions from triggering window switches or closures while keeping pointer and keyboard users synchronized with polite status feedback.',
      },
    ],
  },
  props: [
    {
      name: 'windows',
      type: 'ReadonlyArray<SwitcherWindowItem>',
      defaultValue: 'undefined',
      description:
        'Controlled list of active windows rendered in the preview strip; duplicate IDs are safely deduplicated.',
    },
    {
      name: 'defaultWindows',
      type: 'ReadonlyArray<SwitcherWindowItem>',
      defaultValue: '5 sample studio windows',
      description:
        'Initial uncontrolled window list (defaults to Refractor IDE, Optical Shader Preview, Terminal Multiplexer, Design Specs, and Audio DSP Mixer).',
    },
    {
      name: 'mode',
      type: "'inline' | 'overlay'",
      defaultValue: "'inline'",
      description:
        'Controls whether the switcher renders inline inside a `prism-slab` region or centered over a frosted viewport backdrop as a `role="dialog" aria-modal="true"` overlay.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Visibility flag for `mode="overlay"`; returns `null` when `false` in overlay mode.',
    },
    {
      name: 'onFocusWindow',
      type: '(windowItem: SwitcherWindowItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the user commits focus to a window via `Enter`, `Space`, card click, or the `Focus Window` button.',
    },
    {
      name: 'onCloseWindow',
      type: '(windowId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when a window is closed via its quick `Close <title>` button or `Delete`/`Backspace` shortcut.',
    },
    {
      name: 'onDismiss',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when dismissed via `Escape`, frosted backdrop click in overlay mode, or the overlay dismiss button.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables keyboard cycling, window focusing, closing, backdrop dismissal, and footer telemetry actions.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and optical inline style overrides.',
    },
  ],
  examples: [
    `<WindowSwitcherOverlay\n  onFocusWindow={(win) => console.warn('Focused', win.id)}\n  onCloseWindow={(id) => console.warn('Closed', id)}\n/>`,
    `<WindowSwitcherOverlay\n  mode="overlay"\n  open={isOpen}\n  windows={openWindows}\n  onFocusWindow={(win) => {\n    activateWindow(win.id);\n    setIsOpen(false);\n  }}\n  onCloseWindow={(id) => removeWindow(id)}\n  onDismiss={() => setIsOpen(false)}\n/>`,
  ],
};

export default docs;
