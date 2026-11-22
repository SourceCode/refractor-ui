export const docs = {
  name: 'ParametricEqGraph',
  displayName: 'Parametric EQ Graph',
  group: 'Audio Mixing & Signal Processing',
  category: 'audio-mixing-dsp',
  keywords: [
    'parametric eq',
    'equalizer',
    'audio',
    'dsp',
    'mixing',
    'mastering',
    'frequency response',
    'low shelf',
    'high shelf',
    'bell filter',
    'logarithmic',
    'q factor',
  ],
  usage: {
    description:
      'Optical-glass multi-band parametric equalizer inside a sculpted prism-slab card featuring quick-select numbered band pills, Flatten EQ reset, a responsive 420x190 logarithmic frequency-response SVG (20 Hz to 20 kHz, -18 dB to +18 dB) with summed multi-band Gaussian/shelf curve, translucent --prism-primary-main optical fill, numbered draggable and keyboard-nudgeable band nodes, a recessed Selected Band Inspector with Enable/Bypass, filter type selector, Frequency/Gain/Q sliders, and a clean role="status" empty state.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Bind controlled bands and onChange to Web Audio API BiquadFilterNode chains (lowshelf, peaking, highshelf) to synchronize visual frequency response sculpting with live audio processing.',
      },
      {
        guidance: true,
        description:
          'Use Shift + Arrow keys on any focused band node for fine 0.5 dB gain nudging and semitone-scale logarithmic frequency adjustments during mastering precision passes.',
      },
      {
        guidance: false,
        description:
          'Pass unclamped frequency, gain, or Q values directly to DSP nodes without validation; ParametricEqGraph safely clamps frequencyHz to [20..20000], gainDb to [-18..18], and q to [0.3..10].',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Band Node Sliders & Fine Resolution Stepping',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each EQ band node exposes role="slider" with aria-label="EQ Band N frequency and gain", aria-valuemin=-18, aria-valuemax=18, aria-valuenow, and rich aria-valuetext; ArrowLeft/ArrowRight shift logarithmic frequency, ArrowUp/ArrowDown adjust gain by +/-1 dB (+/-0.5 dB with Shift), and Home flattens the band to 0 dB.',
        description:
          'Delivers complete keyboard-only authoring of parametric EQ curves alongside pointer drag interaction.',
      },
      {
        name: 'IME-Safe Keydown, Bypass Semantics & Global Pointer Cleanup',
        criterion: '2.4.7 Focus Visible, 2.5.1 Pointer Gestures & 4.1.3 Status Messages',
        requirement:
          'Guards node keydown handlers with !e.nativeEvent.isComposing, applies keyboard-only .prism-focus-ring outlines, exposes aria-pressed on band pills, bypass toggles, and filter selectors, renders role="status" when empty, and removes window pointer listeners on pointerup, pointercancel, disable, and unmount.',
        description:
          'Prevents IME interception, maintains clear screen reader semantics, and guarantees zero leaked global event listeners.',
      },
    ],
  },
  props: [
    {
      name: 'bands',
      type: 'ReadonlyArray<EqBand>',
      defaultValue: 'undefined',
      description: 'Controlled array of parametric EQ bands. Pass [] to render the role="status" empty state.',
    },
    {
      name: 'defaultBands',
      type: 'ReadonlyArray<EqBand>',
      defaultValue: '4-band mastering EQ (80 Hz Low Shelf, 420 Hz Bell, 2.8 kHz Bell, 10 kHz High Shelf)',
      description: 'Initial EQ bands for uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(bands: EqBand[], activeBand: EqBand) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated sanitized bands array and the currently active band on every edit.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Parametric 4-Band EQ'",
      description: 'Visible card header heading and accessible SVG label prefix.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables band selection, node dragging, keyboard nudging, flattening, and all inspector controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ParametricEqGraph\n  title="Master Bus EQ"\n  onChange={(bands, activeBand) => {\n    void bands;\n    void activeBand;\n  }}\n/>`,
    `<ParametricEqGraph\n  defaultBands={[\n    { id: 'low', label: 'Sub Shelf', frequencyHz: 80, gainDb: 3, q: 0.7, type: 'low-shelf', enabled: true },\n    { id: 'mid', label: 'Vocal Cut', frequencyHz: 420, gainDb: -2, q: 1.5, type: 'bell', enabled: true },\n    { id: 'presence', label: 'Presence', frequencyHz: 2800, gainDb: 2.5, q: 1.8, type: 'bell', enabled: true },\n    { id: 'air', label: 'Air Shelf', frequencyHz: 10000, gainDb: 1.5, q: 0.8, type: 'high-shelf', enabled: true },\n  ]}\n/>`,
  ],
};

export default docs;
