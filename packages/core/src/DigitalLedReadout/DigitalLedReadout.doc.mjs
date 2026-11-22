export const docs = {
  name: 'DigitalLedReadout',
  displayName: 'Digital LED Readout',
  group: 'Hardware, IoT & Tactile Surfaces',
  category: 'hardware-iot-tactile',
  keywords: [
    'led',
    'digital',
    'readout',
    '7-segment',
    'seven-segment',
    'nixie',
    'tube',
    'hardware',
    'iot',
    'telemetry',
    'counter',
    'clock',
    'timecode',
    'meter',
    'instrument',
    'phosphor',
  ],
  usage: {
    description:
      'Pure-SVG optical 7-segment LED and Nixie-tube hardware digital readout housed inside a sculpted prism-slab bezel with a recessed prism-well display window. Supports numeric, timecode, negative, decimal, and uppercase alpha indicator glyphs (0–9, -, :, ., space, A, C, E, F, H, L, P, R, U), safe non-finite fallback (----), clamped minDigits padding, five semantic --prism-* phosphor tones, three responsive sizes, and an optional interactive 7-Segment / Nixie style toggle.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide a concise label and engineering unit (such as "MHz", "V", "dB", or "°C") so screen readers announce complete hardware telemetry via the polite status live region.',
      },
      {
        guidance: true,
        description:
          'Enable showStyleToggle in hardware specimen benches or operator dashboards when users benefit from switching live between crisp 7-segment LED arrays and warm glass Nixie vacuum tubes.',
      },
      {
        guidance: false,
        description:
          'Pass long prose sentences into DigitalLedReadout; it is purpose-built for compact numeric readouts, timecodes, and short hardware status codes like ERR or HELP.',
      },
    ],
    accessibility: [
      {
        name: 'Accessible Live Telemetry Status & Decorative SVG Hiding',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Exposes role="status" with aria-live="polite", aria-atomic="true", and a combined aria-label containing label, formatted value, and unit while marking the SVG readout aria-hidden="true"',
        description:
          'Prevents assistive technology from traversing dozens of geometric polygon or tube sub-elements while ensuring value updates are announced cleanly.',
      },
      {
        name: 'Keyboard-Only Focus Rings & IME-Safe Style Toggle',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Optional 7-Segment and Nixie buttons expose aria-pressed, prism-focus-ring (:focus-visible), Arrow/Home/End/Enter/Space keyboard switching, and !e.nativeEvent.isComposing guards',
        description:
          'Ensures full keyboard operability for switching hardware display modes without showing focus outlines on mouse click or interrupting IME composition.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'string | number',
      defaultValue: "'128.4'",
      description:
        'Numeric or string reading rendered across the hardware display cells. Non-finite numbers (NaN, Infinity) safely display "----".',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Optional nameplate heading displayed above the display well and combined into the status aria-label.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Optional unit suffix rendered beside the SVG display window and included in the status aria-label.',
    },
    {
      name: 'displayStyle',
      type: "'7-segment' | 'nixie'",
      defaultValue: 'undefined',
      description: 'Controlled hardware display mode overriding internal toggle state.',
    },
    {
      name: 'defaultDisplayStyle',
      type: "'7-segment' | 'nixie'",
      defaultValue: "'7-segment'",
      description: 'Initial hardware display mode in uncontrolled usage.',
    },
    {
      name: 'onDisplayStyleChange',
      type: '(style: LedDisplayStyle) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when the operator switches between 7-segment and nixie modes via the style toggle.',
    },
    {
      name: 'showStyleToggle',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Renders interactive 7-Segment and Nixie mode toggle pills inside the hardware header bar.',
    },
    {
      name: 'tone',
      type: "'primary' | 'emerald' | 'amber' | 'info' | 'rose'",
      defaultValue: "'primary'",
      description:
        'Semantic phosphor tint mapped exclusively to --prism-* palette tokens.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      defaultValue: "'md'",
      description: 'Controls housing spacing, typography scale, and responsive SVG readout height.',
    },
    {
      name: 'minDigits',
      type: 'number',
      defaultValue: 'undefined',
      description:
        'Minimum number of digit cells rendered, clamped to [1..12] and padded with leading unlit ghost slots.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<DigitalLedReadout\n  label="Oscillator Freq"\n  value={128.4}\n  unit="MHz"\n  tone="emerald"\n  showStyleToggle\n/>`,
    `<DigitalLedReadout\n  label="Master Timecode"\n  value="12:45:09"\n  defaultDisplayStyle="nixie"\n  tone="amber"\n  size="lg"\n/>`,
  ],
};

export default docs;
