export const docs = {
  name: 'AlignmentToolbar',
  displayName: 'Alignment Toolbar',
  group: 'Design, 3D & Shader Inspector Controls',
  category: 'design-3d-shader',
  keywords: [
    'alignment',
    'align',
    'distribute',
    'toolbar',
    'inspector',
    'canvas',
    'artboard',
    'selection',
    'layout',
    'snapping',
    'spacing',
    'design',
    '3d',
    'shader',
  ],
  usage: {
    description:
      'Compact sculpted prism-slab optical-glass alignment and distribution toolbar grouping horizontal align (Left, Center H, Right), vertical align (Top, Middle V, Bottom), and distribution (Distribute H, Distribute V) controls alongside a Selection vs. Artboard anchor scope toggle, live selection counter pill, IME-safe roving keyboard navigation, polite aria-live feedback, and an optional interactive 3-object mini-stage demonstrating real geometric snapping and even spacing.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass the live canvas selection count via selectedCount so AlignmentToolbar automatically disables distribution below 3 objects and disables selection-relative alignment below 2 objects while allowing single-object alignment in Artboard mode.',
      },
      {
        guidance: true,
        description:
          'Enable showMiniStage in documentation sandboxes, onboarding tours, or inspector previews to demonstrate exact edge snapping and equal-gap distribution without requiring an external canvas engine.',
      },
      {
        guidance: false,
        description:
          'Override alignment button styles with raw hex or rgba color literals; compose with --prism-* optical tokens via xstyle or theme.components.AlignmentToolbar so surfaces adapt cleanly across all Refractor themes.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Horizontal Toolbar with IME-Safe Roving Tabindex',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Exposes role="toolbar" with aria-orientation="horizontal", grouped role="group" sections, roving ArrowLeft/ArrowRight/Home/End keyboard focus skipping disabled controls, IME composition guards, and keyboard-only .prism-focus-ring outlines',
        description:
          'Ensures a single Tab stop enters the alignment toolbar and arrow keys move smoothly across enabled alignment, distribution, anchor-scope, and stage-reset controls without hijacking IME composition or browser modifier shortcuts.',
      },
      {
        name: 'Anchor Toggle State & Polite Live Action Confirmation',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Exposes aria-pressed on Selection and Artboard scope toggles, descriptive aria-label names on every icon-only action button, and a role="status" aria-live="polite" region announcing the last applied operation',
        description:
          'Guarantees screen-reader users receive immediate confirmation of applied alignment or distribution commands and current anchor-scope constraints.',
      },
    ],
  },
  props: [
    {
      name: 'selectedCount',
      type: 'number',
      defaultValue: '3',
      description:
        'Number of currently selected objects. Automatically disables distribute actions when < 3 and disables align actions when < 1 (or < 2 when anchorMode is "selection").',
    },
    {
      name: 'anchorMode',
      type: 'AlignmentAnchorMode',
      defaultValue: 'undefined',
      description:
        'Controlled alignment anchor scope ("selection" | "artboard").',
    },
    {
      name: 'defaultAnchorMode',
      type: 'AlignmentAnchorMode',
      defaultValue: "'selection'",
      description:
        'Initial alignment anchor scope when using AlignmentToolbar in uncontrolled mode.',
    },
    {
      name: 'onAnchorModeChange',
      type: '(mode: AlignmentAnchorMode) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the user switches between Selection and Artboard anchor scope.',
    },
    {
      name: 'onAlign',
      type: '(action: AlignmentActionId, anchorMode: AlignmentAnchorMode) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the clicked alignment or distribution action ID and active anchor mode.',
    },
    {
      name: 'showMiniStage',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Renders an interactive 3-object preview stage inside the slab that visibly snaps and evenly distributes boxes when toolbar actions are clicked.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all alignment, distribution, anchor-scope, and mini-stage controls and ignores toolbar keyboard navigation.',
    },
    {
      name: 'ariaLabel',
      type: 'string',
      defaultValue: "'Alignment and distribution controls'",
      description:
        'Accessible label applied to the root role="toolbar" element.',
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
    `<AlignmentToolbar\n  selectedCount={3}\n  defaultAnchorMode="selection"\n  onAlign={(action, anchor) => console.warn(action, anchor)}\n/>`,
    `<AlignmentToolbar\n  selectedCount={3}\n  showMiniStage\n  anchorMode={anchorMode}\n  onAnchorModeChange={setAnchorMode}\n  onAlign={(action, anchor) => console.warn(action, anchor)}\n/>`,
  ],
};

export default docs;
