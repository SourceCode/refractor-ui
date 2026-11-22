export const docs = {
  name: 'VuPeakLevelMeter',
  displayName: 'VU / Peak Level Meter',
  group: 'Audio Mixing & Signal Processing',
  category: 'audio-mixing-dsp',
  keywords: [
    'vu',
    'peak',
    'level',
    'meter',
    'dbfs',
    'rms',
    'clip',
    'audio',
    'mixer',
    'dsp',
    'led',
    'broadcast',
    'mastering',
    'stereo',
  ],
  usage: {
    description:
      'Studio-grade optical-glass VU and Peak Level Meter built on a sculpted prism-slab card with calibrated -60..+6 dBFS segmented LED strips inside recessed prism-well housings, seamless vertical and horizontal orientations, sticky per-channel peak-hold LEDs, an interactive latching CLIP alert button (--prism-error-main), Reset Peak control, and a tabular RMS / Peak dBFS telemetry readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use orientation="vertical" inside console mixer channels and mastering racks, and orientation="horizontal" inside compact transport bars or inspector strips.',
      },
      {
        guidance: true,
        description:
          'Wire onClearClip to reset upstream DSP peak detectors or acknowledge clipping alerts whenever operators click the red CLIP pill or Reset Peak button.',
      },
      {
        guidance: false,
        description:
          'Pass unclamped values without relying on finite bounds; VuPeakLevelMeter automatically clamps levels to [-60..+6] dBFS, clamps segment resolution to [10..40], and renders a clean role="status" empty state when channels is [].',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Meter Semantics Per Audio Channel',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Each channel strip exposes role="meter" with aria-valuemin={-60}, aria-valuemax={6}, aria-valuenow, descriptive aria-valuetext, and aria-label="<channel> level"',
        description:
          'Ensures assistive technologies announce calibrated live dBFS levels, sticky peak-hold readings, and clipping states for every channel independently.',
      },
      {
        name: 'Non-Color Clip Indication & IME-Safe Keyboard Reset',
        criterion: '1.4.1 Use of Color & 2.1.1 Keyboard',
        requirement:
          'Pairs --prism-error-main illumination with an AlertTriangle icon, explicit CLIP label, aria-pressed state, prism-focus-ring keyboard focus rings, and !e.nativeEvent.isComposing Escape guards',
        description:
          'Communicates overloads without relying on color alone and prevents IME composition sessions from inadvertently clearing latched clip warnings.',
      },
    ],
  },
  props: [
    {
      name: 'channels',
      type: 'ReadonlyArray<MeterChannelReading>',
      defaultValue: "[{ id: 'left', label: 'L', levelDb: -8.5 }, { id: 'right', label: 'R', levelDb: -6.2 }]",
      description: 'Per-channel audio readings ({ id, label, levelDb, peakDb? }) in dBFS (-60..+6). Renders a role="status" empty state when explicitly [].',
    },
    {
      name: 'orientation',
      type: "'vertical' | 'horizontal'",
      defaultValue: "'vertical'",
      description: 'Switches the segmented LED meter bars and calibrated dBFS scale between vertical rack columns and horizontal strips.',
    },
    {
      name: 'segments',
      type: 'number',
      defaultValue: '24',
      description: 'Number of discrete LED segments per channel, sanitized and clamped to [10..40].',
    },
    {
      name: 'warnThresholdDb',
      type: 'number',
      defaultValue: '-12',
      description: 'dBFS level at which lit LED segments transition from nominal green (--prism-success-main) to warning amber (--prism-warning-main).',
    },
    {
      name: 'clipThresholdDb',
      type: 'number',
      defaultValue: '0',
      description: 'dBFS level at which lit LED segments turn red (--prism-error-main) and latch the interactive CLIP alert.',
    },
    {
      name: 'clipped',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled clip alert override that supersedes internal auto-detected and latched clip states when provided.',
    },
    {
      name: 'onClearClip',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the operator clicks the CLIP pill, clicks Reset Peak, or presses Escape on those controls.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Master Output VU'",
      description: 'Visible studio meter heading linked to the root landmark via aria-labelledby.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<VuPeakLevelMeter\n  label="Master Bus VU"\n  channels={[\n    { id: 'l', label: 'L', levelDb: -8.5 },\n    { id: 'r', label: 'R', levelDb: -6.2 },\n  ]}\n  onClearClip={() => resetMasterClip()}\n/>`,
    `<VuPeakLevelMeter\n  orientation="horizontal"\n  segments={32}\n  warnThresholdDb={-12}\n  clipThresholdDb={0}\n  channels={[\n    { id: 'vocals', label: 'VOX', levelDb: -4.2, peakDb: 0.8 },\n    { id: 'drums', label: 'DRM', levelDb: -14.0 },\n  ]}\n/>`,
  ],
};

export default docs;
