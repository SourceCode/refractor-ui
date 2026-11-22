export const docs = {
  name: 'StereoPanKnob',
  displayName: 'Stereo Pan Knob',
  group: 'Audio Mixing & Signal Processing',
  category: 'audio-mixing-dsp',
  keywords: [
    'stereo',
    'pan',
    'knob',
    'balance',
    'rotary',
    'dial',
    'detent',
    'audio',
    'mixer',
    'channel-strip',
    'daw',
    'dsp',
    'left',
    'right',
    'center',
  ],
  usage: {
    description:
      'Center-detented optical-glass stereo pan rotary knob built on a sculpted prism-slab card with a live center-aware tabular readout pill (C in --prism-success-main, L45 in --prism-info-main, R62 in --prism-primary-main), a 120x120 SVG rotary dial with an outer 270-degree track arc (-135deg to +135deg), 12-o-clock center detent notch, bi-directional illuminated arc sweeping outward from center, tactile prism-crystal dial face with rotating radial pointer needle, smooth window-tracked vertical/horizontal pointer dragging with configurable magnetic center detent snapping, double-click center reset, quick L/C/R detent buttons, and full IME-safe WAI-ARIA slider keyboard parity.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use StereoPanKnob inside audio channel strips, stem buses, or spatial mixing decks where engineers need rapid L/C/R stereo imaging feedback and magnetic center-detent precision.',
      },
      {
        guidance: true,
        description:
          'Keep centerDetentWidth around 3-6 during live mixing drags so returning a panned channel to dead center (C) locks cleanly without overshooting, while Shift+Arrow keyboard stepping preserves +/-1 fine-grain access near center.',
      },
      {
        guidance: false,
        description:
          'Use StereoPanKnob for unipolar 0..100 parameters like volume gain or dry/wet mix; prefer RotaryDial for unipolar sweeps and reserve StereoPanKnob for bipolar Left/Center/Right (-100..100) positioning.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Bipolar Slider Semantics & Full Keyboard Stepping',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="slider" with aria-label, aria-valuemin=-100, aria-valuemax=100, aria-valuenow, human-readable aria-valuetext ("Center", "45% Left", "60% Right"), Arrow (+/-5), Shift+Arrow (+/-1), PageUp/PageDown (+/-25), Home (-100), End (+100), and 0/c/C center snap',
        description:
          'Guards all keyboard shortcuts against IME composition (!e.nativeEvent.isComposing) and modifier chords (Ctrl/Meta/Alt), excludes disabled dials from tab order, and pairs the dial with labeled L/C/R toggle buttons.',
      },
      {
        name: 'Window Pointer Lifecycle, Live Readout & Keyboard-Only Focus Ring',
        criterion: '2.4.7 Focus Visible, 2.5.1 Pointer Gestures & 4.1.3 Status Messages',
        requirement:
          'Detaches window pointermove/pointerup/pointercancel listeners on release, cancel, disable, or unmount, restricts visible focus rings to prism-focus-ring (:focus-visible), and announces pan updates via an aria-live="polite" readout pill',
        description:
          'Prevents leaked global pointer listeners during rapid drags or mid-drag unmounts while keeping pointer interactions clean and screen-reader feedback synchronized.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled stereo pan value clamped to [-100..100] (-100 = L100, 0 = C, +100 = R100).',
    },
    {
      name: 'defaultValue',
      type: 'number',
      defaultValue: '0',
      description: 'Initial uncontrolled stereo pan value in [-100..100].',
    },
    {
      name: 'onChange',
      type: '(pan: number, formatted: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when the stereo pan changes, passing both numeric pan and formatted string ("L45", "C", "R62").',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Stereo Pan'",
      description: 'Visible header label and accessible slider aria-label.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      defaultValue: "'md'",
      description: 'Responsive dial size preset scaling the optical SVG dial, crystal face, and detent controls.',
    },
    {
      name: 'centerDetentWidth',
      type: 'number',
      defaultValue: '4',
      description: 'Magnetic snap-to-center deadzone width around 0 during pointer drag, safely clamped to [0..15].',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables pointer dragging, double-click center snap, keyboard stepping, and quick L/C/R detent buttons.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<StereoPanKnob\n  label="Lead Vocal Pan"\n  defaultValue={0}\n  onChange={(pan, formatted) => console.warn(pan, formatted)}\n/>`,
    `<StereoPanKnob\n  label="Overhead L/R"\n  value={pan}\n  size="lg"\n  centerDetentWidth={6}\n  onChange={(nextPan) => setPan(nextPan)}\n/>`,
  ],
};

export default docs;
