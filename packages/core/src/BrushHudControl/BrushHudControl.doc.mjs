export const docs = {
  name: 'BrushHudControl',
  displayName: 'Brush HUD Control',
  group: 'Photo & Color Grading Controls',
  category: 'photo-color-grading',
  keywords: [
    'brush',
    'hud',
    'feather',
    'hardness',
    'flow',
    'size',
    'airbrush',
    'retouch',
    'mask',
    'dodge',
    'photo',
    'color-grading',
  ],
  usage: {
    description:
      'Compact optical-glass brush HUD built on a prism-slab shell with a live 128×128 SVG radial feathering preview (semantic --prism-primary-main gradient stops, crosshair guides, and dashed outer boundary ring), four one-click retouching presets (Airbrush, Hard Round, Soft Dodge, Detail Pen), accessible Size/Hardness/Flow controls with fine-step ±1px buttons, IME-safe bracket shortcuts ([ / ] size ±10px, { / } hardness ±10%), and an aria-live tabular readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use controlled value and onChange when synchronizing brush diameter, hardness, and flow directly with a canvas stroke engine, mask painter, or photo-retouching overlay.',
      },
      {
        guidance: true,
        description:
          'Keep the default [ / ] and { / } keyboard shortcuts available when the HUD or its child controls have focus so retouchers can adjust brush size and edge feathering without leaving the canvas.',
      },
      {
        guidance: false,
        description:
          'Pass unchecked NaN, Infinity, or inverted minSizePx/maxSizePx bounds expecting raw propagation; BrushHudControl automatically normalizes bounds and clamps sizePx, hardnessPct (0..100), and flowPct (1..100).',
      },
    ],
    accessibility: [
      {
        name: 'Accessible Range Sliders, Fine-Step Buttons & Preset Toggle State',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Provides native range inputs labeled "Brush size in pixels", "Brush hardness percentage", and "Brush flow percentage", paired with ±1px buttons and aria-pressed preset pills',
        description:
          'Supports standard arrow/Home/End slider adjustment alongside IME-safe [ / ] (±10px size) and { / } (±10% hardness) shortcuts on the HUD container without hijacking modifier keybindings.',
      },
      {
        name: 'Polite Live Readout & Keyboard-Only Optical Focus Rings',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Announces consolidated brush telemetry ("64px · 45% hard · 80% flow") in an aria-live="polite" status region and restricts visible outlines to :focus-visible',
        description:
          'Ensures screen-reader users receive immediate quantitative feedback across presets, sliders, buttons, and bracket shortcuts while preventing pointer focus clutter.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'BrushHudValue',
      defaultValue: 'undefined',
      description: 'Controlled brush configuration ({ sizePx, hardnessPct, flowPct }).',
    },
    {
      name: 'defaultValue',
      type: 'BrushHudValue',
      defaultValue: '{ sizePx: 64, hardnessPct: 45, flowPct: 80 }',
      description: 'Initial brush configuration used in uncontrolled mode.',
    },
    {
      name: 'minSizePx',
      type: 'number',
      defaultValue: '1',
      description: 'Minimum inclusive brush diameter in pixels (clamped to >= 1).',
    },
    {
      name: 'maxSizePx',
      type: 'number',
      defaultValue: '500',
      description: 'Maximum inclusive brush diameter in pixels.',
    },
    {
      name: 'onChange',
      type: '(value: BrushHudValue) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever sizePx, hardnessPct, or flowPct changes.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Brush HUD'",
      description: 'HUD header title and accessible aria-label for the region landmark.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all presets, sliders, fine-step buttons, and keyboard shortcuts.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<BrushHudControl\n  title="Masking Brush"\n  defaultValue={{ sizePx: 64, hardnessPct: 45, flowPct: 80 }}\n  onChange={(next) => console.warn(next)}\n/>`,
    `<BrushHudControl\n  title="Dodge & Burn HUD"\n  value={brush}\n  minSizePx={4}\n  maxSizePx={300}\n  onChange={setBrush}\n/>`,
  ],
};

export default docs;
