export const docs = {
  name: 'SpringEasingPicker',
  displayName: 'Spring & Easing Curve Picker',
  group: 'Design, 3D & Shader Inspector Controls',
  category: 'design-3d-shader',
  keywords: [
    'spring',
    'easing',
    'bezier',
    'cubic-bezier',
    'motion',
    'physics',
    'harmonic-oscillator',
    'damping',
    'stiffness',
    'mass',
    'animation',
    'curve',
    'inspector',
    'design-3d-shader',
  ],
  usage: {
    description:
      'Optical-glass motion physics and easing inspector inside a sculpted prism-slab card featuring a Spring Physics / Cubic Bezier mode switcher, 4 one-click presets (Snappy, Gentle, Bouncy, Stiff), a responsive 280x180 SVG curve plot sampling exact closed-form damped harmonic oscillator x(t) or exact cubic-Bezier (x(t), y(t)), an interactive Live Motion Track with Play/Pause animation and scrubbable progress slider, mode-adaptive parameter sliders with computed settling time and damping-ratio regime telemetry, and a recessed aria-live="polite" copy-ready CSS/physics code summary styled exclusively with --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use controlled value and onChange props to synchronize spring physics or cubic-bezier curves directly with motion engines, shader uniforms, and timeline previews.',
      },
      {
        guidance: true,
        description:
          'Start from one of the four presets (Snappy, Gentle, Bouncy, Stiff) to reach underdamped, critically damped, or overdamped regimes quickly before fine-tuning stiffness, damping, and mass.',
      },
      {
        guidance: false,
        description:
          'Pass unclamped or non-finite physics or bezier numbers directly to downstream animation runners; SpringEasingPicker automatically clamps stiffness (40..600), damping (4..60), mass (0.5..5), bezier coordinates, and durationMs (150..2000).',
      },
    ],
    accessibility: [
      {
        name: 'Pressed State Toggles, Accessible Sliders & Keyboard Playback',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes aria-pressed on mode switcher, preset pills, and Play Preview / Pause toggle; provides labeled range sliders with aria-valuetext, Home/End jumping, and IME-safe Enter/Space playback toggling on the preview scrubber',
        description:
          'Allows full keyboard inspection, parameter tuning, and motion preview playback without requiring pointer input.',
      },
      {
        name: 'Polite Live Code Summary & Clean Animation Teardown',
        criterion: '4.1.3 Status Messages & 2.2.2 Pause, Stop, Hide',
        requirement:
          'Publishes live spring(...) and cubic-bezier(...) definitions inside an aria-live="polite" code summary, exposes explicit Play/Pause and Reset controls, and cancels requestAnimationFrame handles cleanly on pause, disable, scrub, and unmount',
        description:
          'Keeps screen readers updated as motion definitions change while giving users direct control over preview motion and guaranteeing zero leaked animation loops.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'MotionCurveConfig',
      defaultValue: 'undefined',
      description:
        'Controlled motion curve configuration ({ mode, spring: { stiffness, damping, mass }, bezier, durationMs }).',
    },
    {
      name: 'defaultValue',
      type: 'MotionCurveConfig',
      defaultValue:
        "{ mode: 'spring', spring: { stiffness: 240, damping: 18, mass: 1 }, bezier: [0.22, 1, 0.36, 1], durationMs: 650 }",
      description: 'Initial motion curve configuration when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(config: MotionCurveConfig) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the sanitized MotionCurveConfig whenever mode, preset, spring physics, bezier control points, or duration change.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Spring & Easing Curve Picker'",
      description: 'Heading label rendered inside the sculpted prism-slab header and SVG accessible label.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables mode switching, preset selection, parameter sliders, scrubbing, playback, and code copy.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<SpringEasingPicker\n  title="Panel Entrance Spring"\n  onChange={(next) => console.warn(next)}\n/>`,
    `<SpringEasingPicker\n  defaultValue={{\n    mode: 'bezier',\n    spring: { stiffness: 300, damping: 10, mass: 1 },\n    bezier: [0.34, 1.45, 0.64, 1],\n    durationMs: 750,\n  }}\n/>`,
  ],
};

export default docs;
