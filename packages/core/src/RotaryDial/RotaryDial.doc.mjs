export const docs = {
  name: 'RotaryDial',
  displayName: 'Rotary Dial',
  group: 'Complex Variations of Common Controls',
  category: 'complex-controls',
  keywords: [
    'rotary',
    'dial',
    'knob',
    'potentiometer',
    'audio',
    'gain',
    'angle',
    'slider',
    'radial',
    'circular',
  ],
  usage: {
    description:
      'Circular 270-degree optical-glass rotary knob with a recessed divider track arc, primary progress arc, central prism-crystal face with rotating indicator notch, smooth diagonal/vertical/horizontal pointer dragging, double-click reset to defaultValue, and full WAI-ARIA slider keyboard parity.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use RotaryDial for compact parameter clusters such as audio gain, filter cutoff, optical angle, or dispersion controls where radial visual feedback saves horizontal space.',
      },
      {
        guidance: true,
        description:
          'Pair a concise label and clear unit suffix (such as "°", "dB", or "%") so tabular readouts remain immediately legible alongside the 270-degree sweep.',
      },
      {
        guidance: false,
        description:
          'Use RotaryDial for wide numeric ranges that require typing arbitrary multi-digit numbers; prefer ScrubbableNumberField or NumericStepper instead.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Slider Semantics & Full Keyboard Parity',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="slider" with aria-label, aria-valuenow/min/max/valuetext, ArrowUp/Right (+step), ArrowDown/Left (-step), PageUp/PageDown (±10x step), Home (min), and End (max)',
        description:
          'Provides complete non-pointer precision control via standard slider key bindings, guards IME composition, and excludes disabled knobs from tab order.',
      },
      {
        name: 'Pointer Capture & Keyboard-Only Focus Ring',
        criterion: '2.4.7 Focus Visible & 2.5.1 Pointer Gestures',
        requirement:
          'Uses prism-focus-ring (:focus-visible), pointer capture with pointerup/pointercancel cleanup, and double-click reset to defaultValue',
        description:
          'Supports smooth drag adjustments along horizontal and vertical axes without hijacking page scroll and cleanly resets pointer capture on release or cancel.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled numeric dial value.',
    },
    {
      name: 'defaultValue',
      type: 'number',
      defaultValue: '50',
      description: 'Initial value in uncontrolled mode and target value for double-click reset.',
    },
    {
      name: 'onChange',
      type: '(next: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the clamped and step-snapped value changes.',
    },
    {
      name: 'min',
      type: 'number',
      defaultValue: '0',
      description: 'Minimum inclusive numeric bound.',
    },
    {
      name: 'max',
      type: 'number',
      defaultValue: '100',
      description: 'Maximum inclusive numeric bound.',
    },
    {
      name: 'step',
      type: 'number',
      defaultValue: '1',
      description: 'Increment step size for keyboard arrows and drag snapping.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'°'",
      description: 'Unit suffix displayed alongside the tabular numeric readout.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Dial'",
      description: 'Visible label below the knob and accessible aria-label for the slider.',
    },
    {
      name: 'size',
      type: 'number',
      defaultValue: '96',
      description: 'Outer SVG dial diameter in pixels, safely clamped to [64..160].',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables pointer drag, double-click reset, and keyboard adjustments.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<RotaryDial\n  label="Phase"\n  defaultValue={45}\n  min={-180}\n  max={180}\n  step={5}\n  unit="°"\n/>`,
    `<RotaryDial\n  label="Gain"\n  value={gain}\n  onChange={setGain}\n  min={0}\n  max={100}\n  unit="%"\n  size={112}\n/>`,
  ],
};
