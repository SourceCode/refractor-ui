export const docs = {
  name: 'OrbitalRingSpinner',
  displayName: 'Orbital Ring Spinner',
  group: 'Loaders, Skeletons & Data Transitions',
  category: 'loaders-skeletons-transitions',
  keywords: ['spinner', 'loader', 'orbital', 'ring', 'indeterminate', 'svg', 'prismatic'],
  usage: {
    description:
      'Sleek variable-stroke circular SVG loader with a trailing multi-hue token gradient tail and luminous leading orbital bead for indeterminate waits. Uses compositor-only rotation and pauses under `prefers-reduced-motion: reduce` and `performanceMode="max"`.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pair with a concise `label` (and `showLabel` for section loaders) so users know what operation is in progress.',
      },
      {
        guidance: false,
        description:
          'For determinate operations with known completion percentage, prefer `SegmentedGlassProgress` instead of an indeterminate spinner.',
      },
    ],
    accessibility: [
      {
        name: 'Polite Status Region & Contained SVG',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Exposes `role="status"` and `aria-label`, marks the spinning `<svg>` `aria-hidden="true"` with `viewBox="0 0 64 64"` and `prism-contain-box`, and pauses smoothly when `paused` or reduced motion is enabled.',
        description:
          'Ensures assistive technology announces indeterminate activity reliably across devices.',
      },
    ],
  },
  props: [
    { name: 'size', type: "'sm' | 'md' | 'lg' | 'xl'", defaultValue: "'md'", description: 'Spinner diameter preset (24px–76px).' },
    { name: 'strokeWidth', type: 'number', defaultValue: '4.5', description: 'Ring stroke width in SVG units (clamped 2–8).' },
    { name: 'speedSeconds', type: 'number', defaultValue: '1.1', description: 'Rotation duration in seconds (clamped 0.5–4).' },
    { name: 'label', type: 'string', defaultValue: "'Loading…'", description: 'Accessible loading message.' },
    { name: 'showLabel', type: 'boolean', defaultValue: 'false', description: 'Renders visible label text beside the orbital ring.' },
    { name: 'paused', type: 'boolean', defaultValue: 'false', description: 'Pauses orbital spin.' },
  ],
};
