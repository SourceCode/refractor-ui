export const docs = {
  name: 'SnapZoneOverlay',
  displayName: 'Snap Zone Overlay',
  group: 'Window Management & Desktop Tiling',
  category: 'window-management-tiling',
  keywords: [
    'snap',
    'snap-zone',
    'tiling',
    'window-management',
    'desktop-tiling',
    'overlay',
    'drop-zone',
    'layout-presets',
    'halves',
    'thirds',
    'quarters',
    'priority-grid',
    'drag-and-drop',
  ],
  usage: {
    description:
      'Translucent optical-glass snap-zone and desktop tiling overlay housed inside a sculpted `prism-slab` surface. Presents a wrap-safe header displaying the dragged window title (`Dragging: Optical Studio — main.tsx`), toggleable layout preset pills (`Halves`, `Thirds`, `Quarters`, `Priority Grid` with `aria-pressed`), and a `Clear Snap` action above an interactive `role="listbox"` desktop drop-zone stage. Each zone acts as a focusable, clickable, hoverable, and HTML5 drag-over/drop target (`role="option"`) with a luminous `--prism-primary-main` border and `color-mix(in srgb, var(--prism-primary-main) 18%, transparent)` fill when highlighted or snapped, complete with IME-safe keyboard navigation (`ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`/`Home`/`End`, `Enter`/`Space`, `Escape`) and a polite `aria-live="polite"` status strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `SnapZoneOverlay` for OS-grade desktop window managers, multi-pane studio shells, and split-screen layout pickers where users drag or keyboard-select proportional screen regions (`halves`, `thirds`, `quarters`, `priority-grid`).',
      },
      {
        guidance: true,
        description:
          'Pair controlled `preset` / `onPresetChange` and `activeZoneId` / `onSnapZone` props when synchronizing snap zones with live floating window geometry or persistent workspace layouts.',
      },
      {
        guidance: false,
        description:
          'Do not use `SnapZoneOverlay` for freeform single-pixel window edge resizing; use `WindowResizeFrame` for 8-way directional resize handles or `WindowSplitter` for continuous adjacent pane dividers.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Listbox Snap-Zone Stage & IME-Safe Spatial Navigation',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Exposes the desktop tiling grid as `role="listbox" aria-label="Window snap zones"` with roving-tabindex `role="option"` targets carrying `aria-selected`, keyboard-only `.prism-focus-ring`, IME-safe `onKeyDown` (`!event.nativeEvent.isComposing`), `ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`/`Home`/`End` focus navigation, `Enter`/`Space` snapping, and `Escape` snap clearing',
        description:
          'Guarantees full parity for keyboard-only and assistive-technology users without requiring pointer drag-and-drop, while preventing IME composition commits from prematurely triggering snap actions.',
      },
      {
        name: 'Preset Toggle Press State & Polite Dimension Announcements',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Applies `aria-pressed` to all 4 preset pill buttons, disables `Clear Snap` when no zone is snapped or `disabled` is true, and emits concise preset switch, snapped zone dimension, and clear announcements through an `aria-live="polite"` status strip',
        description:
          'Keeps screen-reader users informed of active layout presets and snapped zone proportions (`50% × 100%`, `70% × 100%`, etc.) without interrupting navigation.',
      },
    ],
  },
  props: [
    {
      name: 'windowTitle',
      type: 'string',
      defaultValue: "'Optical Studio — main.tsx'",
      description:
        'Window title displayed in the draggable header label (`Dragging: <windowTitle>`) and inside the snapped tile preview.',
    },
    {
      name: 'preset',
      type: "'halves' | 'thirds' | 'quarters' | 'priority-grid'",
      defaultValue: 'undefined',
      description:
        'Controlled tiling layout preset; pair with `onPresetChange` to drive layout switching externally.',
    },
    {
      name: 'defaultPreset',
      type: "'halves' | 'thirds' | 'quarters' | 'priority-grid'",
      defaultValue: "'halves'",
      description: 'Initial uncontrolled tiling layout preset rendered on mount.',
    },
    {
      name: 'activeZoneId',
      type: 'string | null',
      defaultValue: 'undefined',
      description:
        'Controlled identifier of the currently snapped `SnapZoneSlot`, or `null` when no zone is snapped.',
    },
    {
      name: 'defaultActiveZoneId',
      type: 'string | null',
      defaultValue: 'null',
      description: 'Initial uncontrolled snapped zone identifier on mount.',
    },
    {
      name: 'onPresetChange',
      type: '(preset: SnapZonePresetKind) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the user selects a different tiling layout preset pill.',
    },
    {
      name: 'onSnapZone',
      type: '(slot: SnapZoneSlot | null) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the target `SnapZoneSlot` when snapping via click, drop, `Enter`, or `Space`, or with `null` when clearing via `Clear Snap` or `Escape`.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables preset switching, pointer hover/click/HTML5 drag-and-drop snapping, keyboard navigation, and the `Clear Snap` button.',
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
    `<SnapZoneOverlay\n  windowTitle="Optical Studio — main.tsx"\n  defaultPreset="priority-grid"\n  onSnapZone={(slot) => { void slot; }}\n/>`,
    `<SnapZoneOverlay\n  windowTitle="Shader Preview — caustic.wgsl"\n  preset="quarters"\n  activeZoneId="quarters-top-right"\n  onPresetChange={(next) => { void next; }}\n  onSnapZone={(slot) => { void slot; }}\n/>`,
  ],
};

export default docs;
