export const docs = {
  name: 'FloatingInspectorPalette',
  displayName: 'Floating Inspector Palette',
  group: 'Window Anatomy & Controls',
  category: 'window-anatomy-controls',
  keywords: [
    'floating',
    'inspector',
    'palette',
    'utility-window',
    'slim-titlebar',
    'tether',
    'auto-hide',
    'focus-blur',
    'brush',
    'tool-panel',
    'window-anatomy',
  ],
  usage: {
    description:
      'Slim-titlebar, non-blocking floating utility and inspector palette rendered inside an optical prism-slab container and visually tethered to a parent workspace. Automatically hides into a slim translucent status pill with aria-live="polite" feedback when Auto-Hide is enabled and the parent workspace loses focus, or stays pinned persistent with a --prism-warning-main tether indicator when Auto-Hide is disabled. Includes an optional interactive Parent Focused / Parent Blurred focus simulator strip, slim header controls (Auto-Hide toggle, Collapse/Expand toggle, and Close button with local Reopen Palette chip), selectable optical tool sections, a 1..64px Brush Size range slider, and a live Opacity readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use FloatingInspectorPalette for lightweight non-blocking tool, brush, and layer inspectors that belong to a specific document or canvas window and should step out of the way automatically when the user switches to another workspace.',
      },
      {
        guidance: true,
        description:
          'Wire parentFocused and onParentFocusChange to your host application window focus manager in production, and set showParentFocusSimulator={false} once tethered to a real workspace container.',
      },
      {
        guidance: false,
        description:
          'Do not place mandatory blocking confirmations or destructive form submissions inside a floating inspector palette; use ModalDialog when an explicit user decision is required.',
      },
    ],
    accessibility: [
      {
        name: 'Complementary Landmark, Focus Tether Announcements & Toggle Semantics',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Floating palette exposes role="complementary" linked via aria-labelledby, Auto-Hide and tool section buttons expose aria-pressed, Collapse exposes aria-expanded/aria-controls, and auto-hide/restore transitions announce politely via aria-live="polite"',
        description:
          'Screen-reader and keyboard-only users receive immediate status feedback when the palette hides on parent workspace blur, pins persistent, collapses, closes, or reopens.',
      },
      {
        name: 'Keyboard-Only Focus Rings & IME-Safe Control Activation',
        criterion: '2.4.7 Focus Visible & 2.1.4 Character Key Shortcuts',
        requirement:
          'All interactive controls use :focus-visible (.prism-focus-ring) and guard keydown activation with !event.nativeEvent.isComposing plus disabled checks',
        description:
          'Prevents pointer-click focus outlines and avoids hijacking IME text composition commits while supporting full keyboard operation across titlebar controls, tool sections, and the Brush Size slider.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Tool & Brush Inspector'",
      description:
        'Compact heading rendered in the slim palette titlebar and used to label the complementary landmark.',
    },
    {
      name: 'parentWorkspaceName',
      type: 'string',
      defaultValue: "'Refractor Canvas'",
      description:
        'Name of the tethered parent workspace displayed in the focus simulator strip and auto-hidden status pill.',
    },
    {
      name: 'parentFocused',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled focus state of the tethered parent workspace.',
    },
    {
      name: 'defaultParentFocused',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Initial uncontrolled focus state of the tethered parent workspace.',
    },
    {
      name: 'autoHideOnBlur',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled toggle governing whether the palette auto-hides when the parent workspace blurs.',
    },
    {
      name: 'defaultAutoHideOnBlur',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Initial uncontrolled auto-hide-on-blur behavior (false keeps the palette pinned persistent on blur).',
    },
    {
      name: 'sections',
      type: 'ReadonlyArray<FloatingPaletteSection>',
      defaultValue: 'Default 4 tool sections (Stroke & Bevel, Specular Caustic, Pixel Grid Snap, Color Guides)',
      description:
        'Selectable tool sections ({ id, label, valueLabel, active? }) displayed in the compact palette body.',
    },
    {
      name: 'onParentFocusChange',
      type: '(focused: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever the parent workspace focus state toggles.',
    },
    {
      name: 'onToggleSection',
      type: '(sectionId: string, active: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when a tool section is toggled on or off.',
    },
    {
      name: 'onClose',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Optional external close handler; if omitted, closing hides the palette locally with a Reopen Palette chip.',
    },
    {
      name: 'showParentFocusSimulator',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Displays the compact Parent Focused / Parent Blurred toggle bar for interactive sandbox testing.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all simulator, titlebar, section, and Brush Size slider controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<FloatingInspectorPalette\n  title="Tool & Brush Inspector"\n  parentWorkspaceName="Refractor Canvas"\n  onToggleSection={(sectionId, active) => { void sectionId; void active; }}\n/>`,
    `<FloatingInspectorPalette\n  parentWorkspaceName="Lens Shader Graph"\n  parentFocused={isWorkspaceFocused}\n  autoHideOnBlur={true}\n  showParentFocusSimulator={false}\n  onClose={() => setInspectorOpen(false)}\n/>`,
  ],
};

export default docs;
