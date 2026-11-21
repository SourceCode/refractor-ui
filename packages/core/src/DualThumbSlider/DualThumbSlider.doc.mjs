export const docs = {
  name: 'DualThumbSlider',
  displayName: 'Dual-Thumb Range Slider',
  group: 'Complex Variations of Common Controls',
  category: 'complex-controls',
  keywords: [
    'slider',
    'range',
    'dual-thumb',
    'multi-thumb',
    'interval',
    'bounds',
    'min-max',
    'price',
    'filter',
    'distance',
  ],
  usage: {
    description:
      'An optical-glass dual-thumb interval slider featuring a recessed prism-well track, glowing --prism-primary-main active range fill bar, two independent WAI-ARIA slider thumbs with pointer drag and full keyboard stepping, configurable minimum separation distance, and a live formatted tabular range readout pill.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use DualThumbSlider for selecting continuous lower and upper intervals such as price filters, latency thresholds, or frequency bands.',
      },
      {
        guidance: true,
        description:
          'Provide formatValue (such as currency, percentages, or units) and set minDistance when zero-width intervals are invalid for the domain.',
      },
      {
        guidance: false,
        description:
          'Use DualThumbSlider for selecting a single scalar value; use RangeSlider instead.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Multi-Thumb Slider Semantics',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement:
          'Two independent role="slider" thumbs ("Minimum value" and "Maximum value") exposing live aria-valuenow, dynamic aria-valuemin/max respecting minDistance, aria-valuetext, and full Arrow/PageUp/PageDown/Home/End stepping',
        description:
          'Provides full keyboard parity with pointer dragging while guarding against active IME composition and removing thumbs from tab order (tabIndex=-1) when disabled.',
      },
      {
        name: 'Keyboard-Only Focus Rings & Pointer Capture Discipline',
        criterion: '2.4.7 Focus Visible & 2.5.1 Pointer Gestures',
        requirement:
          'prism-focus-ring keyboard-only outlines, pointer capture with pointercancel cleanup, and zero-width track layout fallback',
        description:
          'Keeps focus outlines invisible during pointer clicks, terminates drags cleanly on pointerup/pointercancel, and never emits NaN when track width is 0.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'DualThumbRange',
      defaultValue: 'undefined',
      description: 'Controlled range object `{ min, max }`.',
    },
    {
      name: 'defaultValue',
      type: 'DualThumbRange',
      defaultValue: '{ min: 20, max: 80 }',
      description: 'Initial range `{ min, max }` for uncontrolled usage.',
    },
    {
      name: 'onChange',
      type: '(next: DualThumbRange) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated `{ min, max }` range.',
    },
    {
      name: 'min',
      type: 'number',
      defaultValue: '0',
      description: 'Lower track bound (sanitized so safeMin < safeMax).',
    },
    {
      name: 'max',
      type: 'number',
      defaultValue: '100',
      description: 'Upper track bound (sanitized so safeMin < safeMax).',
    },
    {
      name: 'step',
      type: 'number',
      defaultValue: '1',
      description: 'Positive increment step size for pointer snapping and keyboard arrows.',
    },
    {
      name: 'minDistance',
      type: 'number',
      defaultValue: '0',
      description: 'Minimum enforced gap between min and max thumbs, clamped to [0..max-min].',
    },
    {
      name: 'formatValue',
      type: '(val: number) => string',
      defaultValue: 'String',
      description: 'Optional formatter used in the readout pill (`low – high`) and aria-valuetext.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Range'",
      description: 'Visible group label associated via aria-labelledby.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables pointer drag, track clicks, and keyboard stepping.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<DualThumbSlider\n  label="Price Band"\n  min={0}\n  max={500}\n  step={10}\n  minDistance={20}\n  defaultValue={{ min: 80, max: 320 }}\n  formatValue={(v) => \`$\${v}\`}\n/>`,
    `<DualThumbSlider\n  label="Confidence Interval"\n  min={0}\n  max={1}\n  step={0.05}\n  value={range}\n  onChange={setRange}\n  formatValue={(v) => \`\${Math.round(v * 100)}%\`}\n/>`,
  ],
};
