export const docs = {
  name: 'WindowResizeFrame',
  displayName: 'Window Resize Frame',
  group: 'Window Anatomy & Controls',
  category: 'window-anatomy-controls',
  keywords: [
    'window',
    'resize',
    'frame',
    'handles',
    'ghost-preview',
    'snap-grid',
    '8-way',
    'viewport',
    'dimensions',
    'desktop',
    'bounds',
  ],
  usage: {
    description:
      'Directional 8-way optical window resize frame (`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`) housed inside a `prism-slab` workbench with a responsive `overflow-x-auto` bounded stage, live telemetry bar (`width × height px`, toggleable `Grid Snap (16px)` alignment, and `Reset Frame`), and a luminous translucent dashed ghost preview outline (`--prism-primary-main`) that tracks snapped target dimensions before committing on `pointerup` or cancelling cleanly on `pointercancel` / `Escape`.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `WindowResizeFrame` for desktop-class floating window managers, responsive viewport simulators, and spatial layout editors where users benefit from previewing snapped bounds before committing an expensive re-layout.',
      },
      {
        guidance: true,
        description:
          'Configure `minWidth`, `minHeight`, `maxWidth`, `maxHeight`, and `snapGridPx` to match your application grid system; pass `snapGridPx={0}` when free single-pixel precision is required by default.',
      },
      {
        guidance: false,
        description:
          'Do not use `WindowResizeFrame` for splitting adjacent side-by-side panes inside a single container; use `WindowSplitter` for multi-pane proportional dividers.',
      },
    ],
    accessibility: [
      {
        name: 'IME-Safe 8-Way Keyboard Resizing & Focus Visibility',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Every edge and corner resize hitbox is a native focusable button with an explicit directional `aria-label`, keyboard-only `.prism-focus-ring`, IME-safe `onKeyDown` (`!e.nativeEvent.isComposing`), directional Arrow key stepping (default grid or 16px, `Shift` fine 4px), and `Escape` drag cancellation',
        description:
          'Ensures keyboard-only users can resize along every valid axis of an edge or corner handle without relying on pointer gestures, while preventing IME composition commits from hijacking resize keys.',
      },
      {
        name: 'Polite Dimension & Snap Alignment Telemetry',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Landmark region linked via `aria-labelledby`, `aria-pressed` state on the `Grid Snap` toggle, and a polite `aria-live="polite"` status strip announcing committed dimensions, cancellations, resets, and grid snap state',
        description:
          'Keeps screen-reader users informed of live frame dimensions, snap granularity, and cancellation events without interrupting active navigation.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Optical Viewport Window'",
      description: 'Window title displayed in the telemetry bar and inner optical window header.',
    },
    {
      name: 'rect',
      type: 'WindowFrameRect',
      defaultValue: 'undefined',
      description: 'Controlled window geometry `{ x, y, width, height }` in pixels, automatically sanitized against stage and min/max bounds.',
    },
    {
      name: 'defaultRect',
      type: 'WindowFrameRect',
      defaultValue: '{ x: 64, y: 48, width: 360, height: 220 }',
      description: 'Initial uncontrolled window geometry used on mount and when activating Reset Frame.',
    },
    {
      name: 'minWidth',
      type: 'number',
      defaultValue: '180',
      description: 'Minimum allowable frame width in pixels (sanitized against NaN, Infinity, and inverted bounds).',
    },
    {
      name: 'minHeight',
      type: 'number',
      defaultValue: '120',
      description: 'Minimum allowable frame height in pixels (sanitized against NaN, Infinity, and inverted bounds).',
    },
    {
      name: 'maxWidth',
      type: 'number',
      defaultValue: '560',
      description: 'Maximum allowable frame width in pixels (sanitized against NaN, Infinity, and inverted bounds).',
    },
    {
      name: 'maxHeight',
      type: 'number',
      defaultValue: '340',
      description: 'Maximum allowable frame height in pixels (sanitized against NaN, Infinity, and inverted bounds).',
    },
    {
      name: 'snapGridPx',
      type: 'number',
      defaultValue: '16',
      description: 'Grid snap step size in pixels; set to `0` to disable grid snapping.',
    },
    {
      name: 'onResizeCommit',
      type: '(rect: WindowFrameRect, edge: WindowResizeEdge) => void',
      defaultValue: 'undefined',
      description: 'Invoked with the finalized sanitized `WindowFrameRect` and directional `WindowResizeEdge` on pointer commit, keyboard resize, or Reset Frame.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all 8 directional handles, Grid Snap toggling, and Reset Frame while aborting any active pointer drag.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and optical style overrides.',
    },
  ],
  examples: [
    `<WindowResizeFrame\n  title="Optical Viewport Window"\n  snapGridPx={16}\n  onResizeCommit={(rect, edge) => { void rect; void edge; }}\n/>`,
    `<WindowResizeFrame\n  title="Shader Preview Pane"\n  defaultRect={{ x: 48, y: 32, width: 320, height: 200 }}\n  minWidth={200}\n  minHeight={140}\n  maxWidth={520}\n  maxHeight={320}\n  snapGridPx={8}\n/>`,
  ],
};

export default docs;
