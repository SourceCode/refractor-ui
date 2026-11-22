export const docs = {
  name: 'ChannelStripFader',
  displayName: 'Channel Strip Fader',
  group: 'Audio Mixing & Signal Processing',
  category: 'audio-mixing-dsp',
  keywords: [
    'channel',
    'strip',
    'fader',
    'mixer',
    'audio',
    'console',
    'daw',
    'dsp',
    'gain',
    'decibel',
    'db',
    'unity',
    'mute',
    'volume',
    'vertical-slider',
  ],
  usage: {
    description:
      'Vertical sculpted optical-glass prism-slab console channel strip fader featuring a top channel label, live tabular dB or linear percentage readout pill (0.0 dB, +6.0 dB, -∞ dB, or 0%–100%), long-throw recessed prism-well fader slot flanked by calibrated studio dB markings (+12, +6, 0 highlighted in --prism-primary-main, -6, -12, -24, -48, -∞), illuminated fill track beneath a prism-crystal fader cap with center tangent groove, double-click and Unity 0 dB snap, tactile Mute toggle, vertical window-level pointer dragging, and full IME-safe keyboard stepping.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use controlled valueDb/onChange and muted/onMutedChange when binding multiple ChannelStripFader instances to a Web Audio GainNode mixer rack or DAW automation lane.',
      },
      {
        guidance: true,
        description:
          'Keep the default studio-db scaleMode for mixing desks so engineers can read headroom boosts (+6.0 dB), unity gain (0.0 dB), and floor attenuation (-∞ dB) directly alongside the calibrated rail markings.',
      },
      {
        guidance: false,
        description:
          'Use ChannelStripFader for arbitrary horizontal text-entry ranges or non-audio percentages; prefer RangeSlider or ScrubbableNumberField for generic numeric inputs.',
      },
    ],
    accessibility: [
      {
        name: 'Vertical WAI-ARIA Slider Semantics & Fine Keyboard Stepping',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="slider" with aria-orientation="vertical", aria-label="${label} fader level", aria-valuemin/max/now/valuetext, Arrow (±1 dB), Shift+Arrow (±0.5 dB), PageUp/PageDown (±6 dB), Home (minDb), End (maxDb), and 0 (unityDb)',
        description:
          'Guards IME composition on every keydown event, reflects muted status in aria-valuetext, and excludes disabled faders from tab order.',
      },
      {
        name: 'Tactile Mute Toggle & Keyboard-Only Focus Rings',
        criterion: '2.4.7 Focus Visible & 2.5.1 Pointer Gestures',
        requirement:
          'Pairs prism-focus-ring (:focus-visible) outlines with aria-pressed on the Mute button, Unity snap button, double-click unity reset, and window pointermove/pointerup/pointercancel cleanup',
        description:
          'Guarantees complete single-pointer and keyboard parity without scroll hijacking or leaked window listeners on release, disable, or unmount.',
      },
    ],
  },
  props: [
    {
      name: 'label',
      type: 'string',
      defaultValue: "'CH 1 · Vocals'",
      description: 'Visible channel strip label rendered at the top and used as the accessible group/slider prefix.',
    },
    {
      name: 'valueDb',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled fader gain in decibels within [minDb, maxDb]; values at minDb render as -∞ dB.',
    },
    {
      name: 'defaultValueDb',
      type: 'number',
      defaultValue: '0',
      description: 'Initial fader gain in decibels in uncontrolled mode.',
    },
    {
      name: 'minDb',
      type: 'number',
      defaultValue: '-60',
      description: 'Minimum inclusive dB floor representing -∞ silence.',
    },
    {
      name: 'maxDb',
      type: 'number',
      defaultValue: '12',
      description: 'Maximum inclusive dB headroom ceiling.',
    },
    {
      name: 'unityDb',
      type: 'number',
      defaultValue: '0',
      description: 'Unity gain detent target in dB for double-click reset, the Unity button, and the 0 key.',
    },
    {
      name: 'scaleMode',
      type: "'studio-db' | 'linear-pct'",
      defaultValue: "'studio-db'",
      description: 'Switches the live tabular readout pill and aria-valuetext between calibrated decibels and linear 0%–100% travel.',
    },
    {
      name: 'muted',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled channel mute state.',
    },
    {
      name: 'defaultMuted',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial channel mute state in uncontrolled mode.',
    },
    {
      name: 'onMutedChange',
      type: '(muted: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the Mute toggle button is activated.',
    },
    {
      name: 'onChange',
      type: '(db: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the next rounded and clamped dB value.',
    },
    {
      name: 'trackHeight',
      type: 'number',
      defaultValue: '220',
      description: 'Vertical recessed fader slot height in pixels, safely clamped to [140..340].',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables pointer dragging, double-click unity snap, keyboard stepping, and Unity/Mute controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<ChannelStripFader\n  label="CH 1 · Vocals"\n  defaultValueDb={0}\n  onChange={(db) => setVocalGain(db)}\n  onMutedChange={(muted) => setVocalMuted(muted)}\n/>`,
    `<ChannelStripFader\n  label="BUS A · Drums"\n  valueDb={drumBusDb}\n  onChange={setDrumBusDb}\n  scaleMode="linear-pct"\n  trackHeight={260}\n  muted={drumMuted}\n  onMutedChange={setDrumMuted}\n/>`,
  ],
};

export default docs;
