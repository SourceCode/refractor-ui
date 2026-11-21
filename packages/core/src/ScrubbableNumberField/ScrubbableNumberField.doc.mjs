export const docs = {
  name: 'ScrubbableNumberField',
  displayName: 'Scrubbable Number Field',
  group: 'Number, Currency & Formatted Type Fields',
  category: 'number-currency-fields',
  keywords: [
    'scrubbable',
    'scrub',
    'drag',
    'number',
    'numeric',
    'inspector',
    'parameter',
    'precision',
    'spinbutton',
    'suffix',
  ],
  usage: {
    description:
      'Optical-glass inspector parameter control combining an interactive horizontal drag-to-scrub label strip (supporting Shift for 0.1x fine precision and Alt for 10x coarse jumps) inside a prism-crystal frame with a recessed prism-well direct numeric input and optional unit suffix badge.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use ScrubbableNumberField in creative, optical, or engineering inspectors (such as rotation, blur radius, opacity, or x/y coordinates) where fluid drag adjustments complement exact typed values.',
      },
      {
        guidance: true,
        description:
          'Tune sensitivity (px per step) and precision together with step so standard drags feel responsive while Shift-scrubbing yields smooth fractional increments.',
      },
      {
        guidance: false,
        description:
          'Rely exclusively on pointer scrubbing without clear keyboard support; users can always focus the recessed spinbutton input for direct typing and ArrowUp/ArrowDown stepping.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Parity & WAI-ARIA Spinbutton Semantics',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Links the scrub label via htmlFor/id, exposes role="spinbutton" with aria-valuenow/min/max, and mirrors Shift (0.1x) and Alt (10x) modifiers on ArrowUp/ArrowDown',
        description:
          'Ensures non-pointer users can adjust values with the exact same fine and coarse precision as horizontal pointer scrubbing while exposing live numeric bounds to assistive technology.',
      },
      {
        name: 'IME-Safe Direct Entry & Pointer Capture Discipline',
        criterion: '2.4.7 Focus Visible & 2.5.1 Pointer Gestures',
        requirement:
          'Guards Enter commit with !e.nativeEvent.isComposing, reverts invalid drafts on blur, supports pointer cancel cleanup, and renders keyboard-only prism-focus-ring outlines',
        description:
          'Prevents IME composition hijacking during numeric entry, cleanly ends active drag sessions on pointerup or pointercancel, and keeps focus outlines keyboard-only.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled numeric value.',
    },
    {
      name: 'defaultValue',
      type: 'number',
      defaultValue: '24',
      description: 'Initial numeric value in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(next: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the clamped and rounded value updates.',
    },
    {
      name: 'min',
      type: 'number',
      defaultValue: '-1000',
      description: 'Lower inclusive numeric bound (swaps cleanly with max when min > max).',
    },
    {
      name: 'max',
      type: 'number',
      defaultValue: '1000',
      description: 'Upper inclusive numeric bound.',
    },
    {
      name: 'step',
      type: 'number',
      defaultValue: '1',
      description: 'Base delta applied per scrub step or ArrowUp/ArrowDown key press.',
    },
    {
      name: 'sensitivity',
      type: 'number',
      defaultValue: '4',
      description: 'Horizontal pointer pixels per step, clamped to [1..40].',
    },
    {
      name: 'precision',
      type: 'number',
      defaultValue: '1',
      description: 'Decimal rounding precision, clamped to [0..10].',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Value'",
      description: 'Visible label displayed on the horizontal drag-to-scrub strip and linked to the input.',
    },
    {
      name: 'suffix',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix badge rendered inside the recessed prism-well (e.g. "px", "deg", "%").',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables horizontal pointer scrubbing and direct numeric input.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<ScrubbableNumberField\n  label="Blur"\n  defaultValue={24}\n  min={0}\n  max={64}\n  suffix="px"\n  onChange={(next) => console.warn(next)}\n/>`,
    `<ScrubbableNumberField\n  label="Angle"\n  defaultValue={45}\n  min={-360}\n  max={360}\n  step={1}\n  sensitivity={3}\n  precision={1}\n  suffix="deg"\n/>`,
  ],
};
