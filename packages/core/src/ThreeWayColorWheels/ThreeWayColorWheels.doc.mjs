export const docs = {
  name: 'ThreeWayColorWheels',
  displayName: 'Three-Way Color Wheels',
  group: 'Photo & Color Grading Controls',
  category: 'photo-color-grading',
  keywords: [
    'color',
    'grading',
    'wheels',
    'lift',
    'gamma',
    'gain',
    'shadows',
    'midtones',
    'highlights',
    'balance',
    'luminance',
    'vectorscope',
    'chromaticity',
    'photo',
    'video',
  ],
  usage: {
    description:
      'Optical-glass 3-way color grading panel built on a sculpted prism-slab shell with Lift (Shadows), Gamma (Midtones), and Gain (Highlights) circular chromaticity wheels (140x140 SVG with concentric reference rings, crosshair axes, semantic --prism-* cardinal chroma markers, active vector line, and unit-circle-clamped puck), paired -100..100 master luminance sliders, tabular X/Y/Lum readouts, live active zone summary, double-click chroma reset, and individual/global reset actions.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use Lift (Shadows), Gamma (Midtones), and Gain (Highlights) together with onChange(grade, changedZone) to drive WebGL/LUT color pipelines or real-time preview shaders without recomputing untouched tonal ranges.',
      },
      {
        guidance: true,
        description:
          'Double-click any color wheel or press Home while focused to snap chromaticity back to (0, 0) while preserving that zone master luminance, or click the card Reset button to zero both chroma and luminance.',
      },
      {
        guidance: false,
        description:
          'Rely on unvalidated external vectors outside the unit circle; ThreeWayColorWheels automatically projects (x, y) onto x^2 + y^2 <= 1 and clamps luminance strictly inside [-100..100].',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Color Wheel & Luminance Slider Parity',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each chromaticity wheel exposes role="slider" ("Lift color balance", "Gamma color balance", "Gain color balance") supporting Arrow keys (±0.05), Shift+Arrow (±0.2), and Home center reset, paired with labeled range sliders ("Lift luminance", etc.)',
        description:
          'All keydown handlers guard against IME composition (!e.nativeEvent.isComposing), emit human-readable aria-valuetext coordinates, and disable focusability when disabled.',
      },
      {
        name: 'Clean Window Pointer Lifecycle & Keyboard-Only Focus Ring',
        criterion: '2.4.7 Focus Visible & 2.5.1 Pointer Gestures',
        requirement:
          'Uses prism-focus-ring (:focus-visible) across all interactive controls and detaches window pointermove/pointerup/pointercancel listeners on release, cancel, disable, or unmount',
        description:
          'Guarantees zero leaked global pointer listeners during rapid drags or mid-drag unmounts while keeping pointer clicks free of focus rings.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'Partial<ThreeWayColorGrade>',
      defaultValue: 'undefined',
      description:
        'Controlled 3-way color grade mapping lift, gamma, and gain zones to { x, y, luminance }. Omitted zones default to neutral.',
    },
    {
      name: 'defaultValue',
      type: 'Partial<ThreeWayColorGrade>',
      defaultValue: '{ lift: { x: 0, y: 0, luminance: 0 }, gamma: { x: 0, y: 0, luminance: 0 }, gain: { x: 0, y: 0, luminance: 0 } }',
      description: 'Initial uncontrolled color grade for lift, gamma, and gain zones.',
    },
    {
      name: 'onChange',
      type: '(grade: ThreeWayColorGrade, changedZone: ColorWheelZone) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the full normalized ThreeWayColorGrade and the specific ColorWheelZone that changed.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'3-Way Color Balance'",
      description: 'Visible panel header title and accessible aria-label for the outer region.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all three color wheels, master luminance sliders, double-click resets, and reset buttons.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<ThreeWayColorWheels\n  title="Primary Grade — Scene 04"\n  defaultValue={{\n    lift: { x: -0.15, y: 0.1, luminance: -6 },\n    gamma: { x: 0.05, y: 0.05, luminance: 4 },\n    gain: { x: 0.2, y: -0.05, luminance: 10 },\n  }}\n  onChange={(grade, zone) => console.warn(zone, grade)}\n/>`,
    `<ThreeWayColorWheels\n  title="Controlled LUT Grade"\n  value={grade}\n  onChange={(nextGrade) => setGrade(nextGrade)}\n/>`,
  ],
};

export default docs;
