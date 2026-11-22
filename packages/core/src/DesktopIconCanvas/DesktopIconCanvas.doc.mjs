export const docs = {
  name: 'DesktopIconCanvas',
  displayName: 'Desktop Icon Canvas',
  group: 'Desktop Surfaces & Native System Dialogs',
  category: 'desktop-surfaces-dialogs',
  keywords: [
    'desktop',
    'desktop-canvas',
    'icons',
    'snap-to-grid',
    'wallpaper',
    'marquee',
    'lasso',
    'drag-and-drop',
    'auto-arrange',
    'rename',
    'workspace',
    'file-icons',
  ],
  usage: {
    description:
      'Root optical desktop workspace surface housed inside a `prism-slab` container supporting token-driven optical wallpaper presets (`prism-aurora`, `alabaster-mist`, `obsidian-grid`, `solar-refraction`), draggable application and file icons snapped to a clamped invisible grid with nearest-open-cell collision resolution, auto-arrange sorting (`Name`, `Kind`, `Grid`), inline `F2` renaming with path-separator/traversal/duplicate validation, and desktop-level AABB marquee lasso selection with leak-free pointer cleanup.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `DesktopIconCanvas` as the root desktop shell surface for web OS environments, virtual workstations, and visual workspace launchers requiring spatial icon organization and multi-select marquee gestures.',
      },
      {
        guidance: true,
        description:
          'Bind controlled `items` + `onItemsChange`, `selectedIds` + `onSelectionChange`, `wallpaper` + `onWallpaperChange`, and `onOpenItem` when persisting desktop layouts or launching application windows.',
      },
      {
        guidance: false,
        description:
          'Do not pass unvalidated `NaN`, `Infinity`, or out-of-range grid dimensions expecting layout overflow, and do not bypass inline rename validation with raw path separators (`/` or `\\`) or traversal segments (`..`).',
      },
    ],
    accessibility: [
      {
        name: 'Full Keyboard Spatial Navigation, Cell Nudging & Inline Rename Parity',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Provides roving tabindex over desktop icons, Arrow/Home/End spatial focus traversal, Alt+Arrow cell nudging with snap collision resolution, Space toggle, Enter open, Ctrl/Meta+A select-all, Escape clear, and F2 inline rename guarded by `!e.nativeEvent.isComposing` with keyboard-only `.prism-focus-ring` indicators',
        description:
          'Guarantees complete keyboard operability equivalent to pointer dragging and marquee lasso selection without exposing focus outlines on mouse clicks or interrupting CJK/IME text composition.',
      },
      {
        name: 'Accessible Canvas Region, Polite Live Announcements & Leak-Free Pointer Lifecycle',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Renders the interactive stage with `role="region"` and `aria-label="Desktop icon canvas"`, exposes pressed/selected state on toolbar controls and icons, announces actions via `role="status" aria-live="polite"`, and strictly detaches global `window` pointer listeners on `pointerup`, `pointercancel`, `disabled`, and unmount',
        description:
          'Keeps screen reader users informed of icon openings, moves, renames, sort passes, and selection changes while preventing orphaned window listeners.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<DesktopIconItem>',
      defaultValue: 'undefined',
      description:
        'Controlled array of desktop icon items positioned at `(col, row)` grid coordinates.',
    },
    {
      name: 'defaultItems',
      type: 'ReadonlyArray<DesktopIconItem>',
      defaultValue: '6 realistic desktop icons (DEFAULT_DESKTOP_ICONS)',
      description:
        'Initial uncontrolled desktop icon items (`Projects`, `Refractor Studio`, `Q4 Spec.pdf`, `Release Assets.zip`, `Glass Study.png`, `Macintosh HD`).',
    },
    {
      name: 'wallpaper',
      type: 'DesktopWallpaperPreset',
      defaultValue: 'undefined',
      description:
        "Controlled optical wallpaper preset (`'prism-aurora' | 'alabaster-mist' | 'obsidian-grid' | 'solar-refraction'`).",
    },
    {
      name: 'defaultWallpaper',
      type: 'DesktopWallpaperPreset',
      defaultValue: "'prism-aurora'",
      description: 'Initial uncontrolled optical wallpaper preset.',
    },
    {
      name: 'snapToGrid',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled snap-to-grid mode controlling optical grid dot guide visibility and nearest-open-cell drop snapping.',
    },
    {
      name: 'defaultSnapToGrid',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Initial uncontrolled snap-to-grid toggle state.',
    },
    {
      name: 'gridCols',
      type: 'number',
      defaultValue: '6',
      description:
        'Number of invisible desktop grid columns, sanitized and clamped to `[3..12]`.',
    },
    {
      name: 'gridRows',
      type: 'number',
      defaultValue: '4',
      description:
        'Number of invisible desktop grid rows, sanitized and clamped to `[2..8]`.',
    },
    {
      name: 'selectedIds',
      type: 'ReadonlyArray<string>',
      defaultValue: 'undefined',
      description: 'Controlled array of currently selected desktop icon IDs.',
    },
    {
      name: 'defaultSelectedIds',
      type: 'ReadonlyArray<string>',
      defaultValue: '[]',
      description: 'Initial uncontrolled array of selected desktop icon IDs.',
    },
    {
      name: 'onItemsChange',
      type: '(items: DesktopIconItem[]) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired whenever icons are moved, snapped, auto-arranged, or renamed.',
    },
    {
      name: 'onSelectionChange',
      type: '(ids: string[]) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired whenever the normalized desktop icon selection changes.',
    },
    {
      name: 'onOpenItem',
      type: '(item: DesktopIconItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when an icon is opened via double-click, Enter key, or the Open toolbar button.',
    },
    {
      name: 'onWallpaperChange',
      type: '(preset: DesktopWallpaperPreset) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when the user selects a different optical wallpaper preset.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all pointer dragging, marquee selection, inline renaming, keyboard navigation, and toolbar buttons.',
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
    `<DesktopIconCanvas\n  onOpenItem={(item) => console.warn('Opening:', item.name)}\n/>`,
    `<DesktopIconCanvas\n  defaultWallpaper="obsidian-grid"\n  gridCols={8}\n  gridRows={4}\n  defaultSelectedIds={['projects']}\n/>`,
  ],
};

export default docs;
