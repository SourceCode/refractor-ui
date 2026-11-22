export const docs = {
  name: 'VectorXyPad',
  displayName: 'Vector XY Pad',
  group: 'Design, 3D & Shader Inspector Controls',
  category: 'design-3d-shader',
  keywords: [
    'vector',
    'xy',
    'pad',
    '2d',
    'shader',
    '3d',
    'inspector',
    'light',
    'azimuth',
    'elevation',
    'resonance',
    'cartesian',
    'polar',
    'crosshair',
    'puck',
    'coordinates',
    'snap',
  ],
  usage: {
    description:
      'Optical-glass 2D XY vector coordinate pad built on a sculpted prism-slab shell with a Cartesian/Polar grid overlay toggle, Center (0, 0) reset control, recessed prism-well stage hosting a responsive 220x220 interactive SVG pad (4x4 Cartesian gridlines or concentric polar angle rings, active crosshair tracking lines, glowing token-driven origin-to-puck vector, and draggable/double-click-to-center puck), optional grid snapping, full IME-safe WAI-ARIA slider keyboard nudging, and an aria-live="polite" telemetry footer showing paired X, Y, and polar magnitude/angle (r · θ°) readouts.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use VectorXyPad for coupled 2D shader uniforms, directional light azimuth/elevation vectors, camera pan/tilt offsets, or synth filter cutoff/resonance modulation where simultaneous X/Y gesture control outperforms two separate sliders.',
      },
      {
        guidance: true,
        description:
          'Enable Polar mode for radial light angles or directional wind/force vectors, and set snapStep when aligning vectors to discrete grid increments while preserving Shift+Arrow fine nudging.',
      },
      {
        guidance: false,
        description:
          'Pass raw unvalidated coordinates expecting silent overflow; VectorXyPad automatically clamps values inside [minX..maxX] and [minY..maxY], sanitizes non-finite inputs, and projects updates onto snapStep when configured.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA 2D Slider Semantics & IME-Safe Keyboard Nudging',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Interactive pad exposes role="slider" with aria-label="${title} vector coordinates", aria-valuemin=0, aria-valuemax=100, aria-valuenow (radial magnitude %), descriptive aria-valuetext, Arrow keys (±5%), Shift+Arrow (±1%), and Home midpoint reset',
        description:
          'Guards keyboard handlers against IME composition (!e.nativeEvent.isComposing), excludes disabled pads from focus order, and keeps Cartesian/Polar toggle and Center reset buttons keyboard-operable.',
      },
      {
        name: 'Clean Window Pointer Lifecycle, Live Telemetry & Keyboard-Only Focus Ring',
        criterion: '2.4.7 Focus Visible, 2.5.1 Pointer Gestures & 4.1.3 Status Messages',
        requirement:
          'Attaches prism-focus-ring (:focus-visible) to all interactive controls, detaches window pointermove/pointerup/pointercancel listeners on release/cancel/disable/unmount, and streams X/Y/polar updates in an aria-live="polite" footer',
        description:
          'Prevents global listener leaks during rapid drags or mid-drag unmounts while keeping pointer clicks free of focus rings and telemetry synchronized for assistive technologies.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'XyVectorValue',
      defaultValue: 'undefined',
      description: 'Controlled 2D vector coordinate pair { x, y } clamped inside [minX..maxX] and [minY..maxY].',
    },
    {
      name: 'defaultValue',
      type: 'XyVectorValue',
      defaultValue: '{ x: 0, y: 0 }',
      description: 'Initial uncontrolled 2D vector coordinate pair.',
    },
    {
      name: 'minX',
      type: 'number',
      defaultValue: '-100',
      description: 'Minimum horizontal coordinate bound.',
    },
    {
      name: 'maxX',
      type: 'number',
      defaultValue: '100',
      description: 'Maximum horizontal coordinate bound.',
    },
    {
      name: 'minY',
      type: 'number',
      defaultValue: '-100',
      description: 'Minimum vertical coordinate bound.',
    },
    {
      name: 'maxY',
      type: 'number',
      defaultValue: '100',
      description: 'Maximum vertical coordinate bound.',
    },
    {
      name: 'xLabel',
      type: 'string',
      defaultValue: "'Light Azimuth (X)'",
      description: 'Label shown above the X-axis tabular readout pill.',
    },
    {
      name: 'yLabel',
      type: 'string',
      defaultValue: "'Elevation / Resonance (Y)'",
      description: 'Label shown above the Y-axis tabular readout pill.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'%'",
      description: 'Unit suffix appended to X, Y, and polar magnitude telemetry values.',
    },
    {
      name: 'gridMode',
      type: "'cartesian' | 'polar'",
      defaultValue: "'cartesian'",
      description: 'Coordinate grid overlay rendered inside the SVG pad (4x4 Cartesian grid or concentric polar angle rings).',
    },
    {
      name: 'snapStep',
      type: 'number',
      defaultValue: '0',
      description: 'Optional numeric grid snap increment (0 disables snapping for continuous control).',
    },
    {
      name: 'onChange',
      type: '(next: XyVectorValue) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the normalized 2D vector coordinate changes.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'2D XY Vector Pad'",
      description: 'Panel header title and accessible region/slider name prefix.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables dragging, double-click centering, keyboard nudging, grid mode switching, and reset.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<VectorXyPad\n  title="Key Light Direction"\n  defaultValue={{ x: 35, y: 45 }}\n  onChange={(next) => console.warn(next)}\n/>`,
    `<VectorXyPad\n  title="Shader Displacement"\n  value={vec}\n  minX={-1}\n  maxX={1}\n  minY={-1}\n  maxY={1}\n  unit=""\n  gridMode="polar"\n  snapStep={0.25}\n  onChange={(next) => setVec(next)}\n/>`,
  ],
};

export default docs;
