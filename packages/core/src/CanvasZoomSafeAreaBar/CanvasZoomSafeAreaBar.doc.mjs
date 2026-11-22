export const docs = {
  name: 'CanvasZoomSafeAreaBar',
  displayName: 'Canvas Zoom & Safe-Area Bar',
  group: 'Viewport & Export Utilities',
  category: 'viewport-export',
  keywords: [
    'canvas',
    'zoom',
    'safe-area',
    'title-safe',
    'action-safe',
    'rule-of-thirds',
    'aspect-mask',
    'letterbox',
    'pillarbox',
    'cinemascope',
    'viewport',
    'broadcast',
    'guides',
    'export',
    'video',
  ],
  usage: {
    description:
      'Optical-glass broadcast canvas viewport and zoom/safe-area bar inside a prism-slab shell featuring a live 16:9 preview viewport with scaled media stage (Fit, 50%, 100%, 200%), token-driven Rule-of-Thirds SVG guides (--prism-text-secondary), Action-Safe 90% (--prism-info-main) and Title-Safe 80% (--prism-warning-main) dashed boxes with corner labels, translucent aspect-ratio letterbox/pillarbox matte overlays (Off, 16:9 HD, 2.39:1 Scope, 9:16 Vertical, 1:1 Square), a floating prism-crystal control bar with IME-safe 0/1/2 zoom shortcuts, and a recessed aria-live="polite" telemetry status bar.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use CanvasZoomSafeAreaBar in video editors, motion graphics canvases, and broadcast review tools where creators verify framing across cinema, HD, square, and vertical social delivery specs.',
      },
      {
        guidance: true,
        description:
          'Bind controlled value and onChange when synchronizing canvas magnification, aspect ratio crop mattes, or safe-area guide overlays with external WebGL/Canvas preview engines.',
      },
      {
        guidance: false,
        description:
          'Hardcode raw hex or rgba colors inside custom children overlays; compose with --prism-* semantic tokens so guides remain legible across Alabaster, Obsidian, Amethyst, Emerald Tide, and Solar Prism themes.',
      },
    ],
    accessibility: [
      {
        name: 'Segmented Zoom & Safe-Area Toggle Controls with IME-Safe Shortcuts',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="toolbar" with grouped aria-pressed zoom presets (Fit, 50%, 100%, 200%), aria-pressed guide toggles (Thirds, Title Safe, Action Safe), an aria-label="Aspect ratio mask" select control, and IME-safe 0/1/2 keyboard shortcuts',
        description:
          'Ignores shortcut keys while IME composition is active, when modifier keys are held, or when focus is inside the native select control, while keeping keyboard-only focus outlines via .prism-focus-ring.',
      },
      {
        name: 'Polite Live Viewport Telemetry & Decorative Broadcast Overlays',
        criterion: '1.1.1 Non-text Content, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Marks all SVG/CSS guide lines and aspect matte bars aria-hidden="true" while announcing canvasLabel, active zoom, active aspect mask, and enabled guide count in a role="status" aria-live="polite" bar',
        description:
          'Prevents visual framing guides from cluttering screen reader trees while guaranteeing real-time spoken confirmation on every magnification, guide, or matte update.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'SafeAreaGuidesState',
      defaultValue: 'undefined',
      description:
        'Controlled state object containing { zoom, ruleOfThirds, titleSafe, actionSafe, aspectMask }.',
    },
    {
      name: 'defaultValue',
      type: 'Partial<SafeAreaGuidesState>',
      defaultValue:
        "{ zoom: 'fit', ruleOfThirds: true, titleSafe: true, actionSafe: true, aspectMask: '2.39:1' }",
      description:
        'Initial zoom preset, broadcast guide visibility toggles, and aspect mask for uncontrolled usage.',
    },
    {
      name: 'onChange',
      type: '(state: SafeAreaGuidesState) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the normalized SafeAreaGuidesState whenever zoom, guide overlays, or aspect mask changes.',
    },
    {
      name: 'canvasLabel',
      type: 'string',
      defaultValue: "'3840 × 2160 · Rec.709'",
      description:
        'Technical canvas resolution and color space label shown in the optical header and polite live status bar.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description:
        'Optional preview media rendered inside the scaled viewport stage; renders a rich optical cinema frame when omitted.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables zoom preset buttons, keyboard shortcuts, broadcast guide toggles, and aspect ratio mask selection.',
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
    `<CanvasZoomSafeAreaBar\n  canvasLabel="3840 × 2160 · Rec.709"\n  defaultValue={{ zoom: 'fit', ruleOfThirds: true, titleSafe: true, actionSafe: true, aspectMask: '2.39:1' }}\n  onChange={(state) => console.warn(state)}\n/>`,
    `<CanvasZoomSafeAreaBar\n  value={viewportState}\n  onChange={setViewportState}\n  canvasLabel="4096 × 2160 · DCI-P3"\n>\n  <video src="/renders/master.mp4" className="w-full h-full object-cover" />\n</CanvasZoomSafeAreaBar>`,
  ],
};

export default docs;
