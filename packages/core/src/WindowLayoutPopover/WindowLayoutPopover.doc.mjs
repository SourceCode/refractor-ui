export const docs = {
  name: 'WindowLayoutPopover',
  displayName: 'Window Layout Popover',
  group: 'Window Management & Desktop Tiling',
  category: 'window-management-tiling',
  keywords: [
    'window',
    'layout',
    'popover',
    'tiling',
    'snap',
    'snap-layouts',
    'maximize',
    'split',
    'quad-grid',
    'desktop',
    'window-manager',
    'presets',
  ],
  usage: {
    description:
      'Hover/click tiling template popover anchored to a window maximize control inside a `prism-slab` optical shell. Features a responsive `flex-wrap` window header bar showing the window title, an active layout badge when snapped, and a Maximize / Layout Presets trigger opening a viewport-clamped (`w-[min(21rem,calc(100vw-2rem))]`) `role="menu"` popover with 4 miniature interactive tiling schematics (**50 / 50 Split**, **70 / 30 Main & Stack**, **3-Column Studio**, and **2×2 Quad Grid**). Every individual pane is an accessible `role="menuitem"` button tinted with `--prism-primary-main` on hover, keyboard focus, and active selection, with polite `aria-live` status feedback, outside `pointerdown` dismissal, clean hover-leave timer teardown, and IME-safe `Escape` dismissal restoring focus to the trigger.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `WindowLayoutPopover` on desktop-class web application windows, floating tool panels, and multi-pane studio frames so users can snap windows into split, main-stack, 3-column, or quad zones without manual drag resizing.',
      },
      {
        guidance: true,
        description:
          'Pair `selectedSelection` with `onSelectLayout` and optional controlled `open` / `onOpenChange` when coordinating window tile geometry across a workspace window manager.',
      },
      {
        guidance: false,
        description:
          'Do not wrap the root `prism-slab` inside an ancestor with `overflow: hidden` that clips the anchored `role="menu"` popover below the window header.',
      },
    ],
    accessibility: [
      {
        name: 'Menu Trigger & Interactive Schematic Pane Semantics',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, and `aria-label="Window layout presets"` on the Maximize trigger button, groups each schematic with `role="group"` inside `role="menu"`, and renders every pane as a `role="menuitem"` button labeled `"<templateLabel>: <slotLabel>"`',
        description:
          'Allows keyboard and screen-reader users to open the tiling presets menu, identify the exact template and pane slot for every miniature schematic region, and activate any zone with Enter or Space.',
      },
      {
        name: 'IME-Safe Escape Focus Restoration, Keyboard-Only Focus Rings & Live Status',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards keyboard activation and `Escape` dismissal against IME composition (`isComposing`), restores focus to the Maximize trigger on `Escape`, applies `.prism-focus-ring` (`:focus-visible`) to all controls, and announces slot selection in an `aria-live="polite"` status region',
        description:
          'Prevents accidental dismissal during IME text entry, keeps keyboard focus predictable, and provides concise screen-reader confirmation when a tiling slot is applied.',
      },
    ],
  },
  props: [
    {
      name: 'windowTitle',
      type: 'string',
      defaultValue: "'Refractor Studio — Main Canvas'",
      description:
        'Window title displayed inside the optical header bar and linked to the region landmark via `aria-labelledby`.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled visibility state of the layout presets popover; pair with `onOpenChange`.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Initial uncontrolled open state of the layout presets popover when `open` is omitted.',
    },
    {
      name: 'selectedSelection',
      type: 'WindowLayoutSlotSelection | null',
      defaultValue: 'undefined',
      description:
        'Controlled active tiling slot selection rendered in the header badge and highlighted in the schematic grid. Pass `null` for no active selection.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever the layout popover opens or dismisses.',
    },
    {
      name: 'onSelectLayout',
      type: '(selection: WindowLayoutSlotSelection) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with `{ templateId, templateLabel, slotId, slotLabel }` whenever a tiling pane is selected.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables the Maximize / Layout Presets trigger and suppresses hover/click popover opening.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and optical style overrides.',
    },
  ],
  examples: [
    `<WindowLayoutPopover\n  windowTitle="Shader Viewport — Scene.glsl"\n  onSelectLayout={(selection) => console.warn(selection)}\n/>`,
    `<WindowLayoutPopover\n  windowTitle="Inspector Canvas"\n  defaultOpen\n  selectedSelection={{\n    templateId: 'main-stack-70-30',\n    templateLabel: '70 / 30 Main & Stack',\n    slotId: 'main-70',\n    slotLabel: 'Main (70%)',\n  }}\n/>`,
  ],
};

export default docs;
