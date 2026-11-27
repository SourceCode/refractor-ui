export const docs = {
  name: 'MagneticCursor',
  displayName: 'Magnetic Cursor',
  group: 'Motion, Gestures & Scroll',
  category: 'motion-gestures-scroll',
  keywords: ['cursor', 'magnetic', 'zoning', 'morph', 'pointer', 'hover', 'glass'],
  usage: {
    description:
      'Smart cursor reticle layer that reacts to nearby `[data-magnetic-target]` buttons or glass tiles, pulls magnetically toward their center, and morphs its width, height, and border-radius to match hit-target bounds with zero React re-renders.',
    bestPractices: [
      {
        guidance: true,
        description: 'Mark interactive buttons or tiles inside the stage with `data-magnetic-target="true"` to opt them into magnetic morphing.',
      },
      {
        guidance: false,
        description: 'Do not hide the native OS cursor globally; keep the magnetic reticle as an additive optical halo.',
      },
    ],
    accessibility: [
      {
        name: 'Touch & Calm-Motion Auto-Bypass',
        criterion: '2.3.3 Animation from Interactions',
        requirement:
          'Marks the reticle `aria-hidden="true"`, ignores touch pointers, and disables reticle rendering under `reducedMotion="calm"`.',
        description: 'Zero impact on keyboard, touch, or screen-reader navigation.',
      },
    ],
  },
  props: [
    { name: 'baseSizePx', type: 'number', defaultValue: '24', description: 'Idle reticle diameter in pixels (12–64).' },
    { name: 'magneticStrength', type: 'number', defaultValue: '0.35', description: 'Pull strength [0..1] toward target center.' },
    { name: 'targetSelector', type: 'string', defaultValue: "'[data-magnetic-target]'", description: 'CSS selector matching magnetic snap targets.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables magnetic tracking and reticle.' },
  ],
};
