export const docs = {
  name: 'AcousticActivityBar',
  displayName: 'Acoustic Activity Bar',
  group: 'Loaders, Skeletons & Data Transitions',
  category: 'loaders-skeletons-transitions',
  keywords: ['acoustic', 'waveform', 'equalizer', 'voice', 'audio', 'streaming', 'telemetry'],
  usage: {
    description:
      'Compact row of animated vertical optical glass bars bouncing smoothly to indicate voice input, audio DSP processing, or live streaming telemetry. Supports autonomous animation or real-time normalized `levels` array binding.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass live Web Audio FFT buckets (`0..1`) via `levels` for real voice metering, or omit `levels` for zero-JS compositor-animated voice activity.',
      },
      {
        guidance: false,
        description:
          'Set `active={false}` when microphone capture or audio streaming stops so bars rest cleanly with zero animation overhead.',
      },
    ],
    accessibility: [
      {
        name: 'Polite Activity Status & Reduced-Motion Safety',
        criterion: '2.3.3 Animation from Interactions & 4.1.3 Status Messages',
        requirement:
          'Exposes `role="status"` and descriptive `aria-label`, hides decorative bars with `aria-hidden="true"`, and halts animations cleanly when `active={false}`, `prefers-reduced-motion: reduce`, or `performanceMode="max"`.',
        description:
          'Provides non-intrusive audio activity state for all users.',
      },
    ],
  },
  props: [
    { name: 'active', type: 'boolean', defaultValue: 'true', description: 'Enables bouncing bar motion.' },
    { name: 'barCount', type: 'number', defaultValue: '9', description: 'Number of glass bars (clamped 3–24).' },
    { name: 'levels', type: 'ReadonlyArray<number>', defaultValue: 'undefined', description: 'Optional live normalized bar amplitudes [0..1].' },
    { name: 'heightPx', type: 'number', defaultValue: '32', description: 'Maximum bar height in pixels (clamped 16–84).' },
    { name: 'tone', type: "'prism' | 'emerald' | 'cobalt' | 'amber'", defaultValue: "'prism'", description: 'Bar gradient palette.' },
    { name: 'showLabel', type: 'boolean', defaultValue: 'false', description: 'Displays status label alongside the bars.' },
  ],
};
