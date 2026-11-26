export const docs = {
  name: 'IridescentRimSurface',
  displayName: 'Iridescent Rim-Light Surface',
  group: 'Dynamic Gradient & AI-Glow FX',
  category: 'gradient-ai-glow-fx',
  keywords: ['iridescent', 'rim-light', 'dichroic', 'border', 'specular', 'tilt', 'glass'],
  usage: {
    description:
      'Dynamic border-lighting optical surface shifting its color temperature and specular rim angle smoothly in response to cursor proximity or optional device tilt (`enableTilt`) via zero-rerender rAF-coalesced CSS variables.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use on featured tier cards, hardware modules, or focal media panels to create dichroic rim-light feedback without heavy WebGL overhead.',
      },
      {
        guidance: false,
        description:
          'Enable `enableTilt` selectively on mobile/tablet hero cards rather than dozens of simultaneous list rows.',
      },
    ],
    accessibility: [
      {
        name: 'Decorative Specular Rim & Passive Orientation Listener',
        criterion: '1.1.1 Non-text Content & 2.5.4 Motion Actuation',
        requirement:
          'Rim overlays are `aria-hidden="true"` and `pointer-events-none`; `deviceorientation` is purely visual, registered `{ passive: true }`, and cleaned up cleanly on unmount.',
        description:
          'Ensures tilt lighting never gates functionality or leaks global event listeners.',
      },
    ],
  },
  props: [
    { name: 'intensity', type: 'number', defaultValue: '0.85', description: 'Rim-light visibility intensity (0–1).' },
    { name: 'spectrum', type: "'dichroic' | 'prism' | 'arctic' | 'amber-rose'", defaultValue: "'dichroic'", description: 'Rim gradient spectrum preset.' },
    { name: 'enableTilt', type: 'boolean', defaultValue: 'false', description: 'Reacts to passive `deviceorientation` tilt events on supported devices.' },
    { name: 'elevated', type: 'boolean', defaultValue: 'true', description: 'Renders `prism-slab` optical glass elevation when true or recessed `prism-well` when false.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Freezes specular rim updates.' },
  ],
};
