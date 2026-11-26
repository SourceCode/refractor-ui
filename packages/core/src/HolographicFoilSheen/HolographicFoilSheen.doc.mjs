export const docs = {
  name: 'HolographicFoilSheen',
  displayName: 'Holographic Foil Sheen',
  group: 'Shader & Optical FX',
  category: 'shader-optical-fx',
  keywords: ['holographic', 'foil', 'dichroic', 'iridescent', 'sheen', 'badge', 'collectible', 'shader'],
  usage: {
    description:
      'Angle-reactive iridescent dichroic shader that sweeps pearlescent metallic highlights across badges, pro-plan tier cards, or collectible UI tiles on hover with gentle perspective tilt and zero-rerender pointer tracking.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use on Pro/Enterprise tier badges, verification cards, or collectible workspace tiles with subtle `tiltDegrees={3–6}`.',
      },
      {
        guidance: false,
        description:
          'Avoid enabling perspective tilt on containers holding inline text inputs or scrollable data grids.',
      },
    ],
    accessibility: [
      {
        name: 'Decorative Foil Layer & Transform Reset',
        criterion: '1.4.3 Contrast (Minimum) & 2.3.3 Animation from Interactions',
        requirement:
          'Dichroic canvas and sheen overlays carry `aria-hidden="true"` and `pointer-events-none`, and tilt resets cleanly on `pointerleave` and when `disabled` is true.',
        description:
          'Maintains text contrast and clean focus handling across all optical and multi-material themes.',
      },
    ],
  },
  props: [
    { name: 'preset', type: "'dichroic' | 'pearl' | 'titanium' | 'prism-gold'", defaultValue: "'dichroic'", description: 'Metallic foil optical preset.' },
    { name: 'intensity', type: 'number', defaultValue: '0.85', description: 'Sheen brightness on hover (0–1.5).' },
    { name: 'tiltDegrees', type: 'number', defaultValue: '5', description: 'Maximum 3D hover tilt angle in degrees (0–12).' },
    { name: 'disableWebGL', type: 'boolean', defaultValue: 'false', description: 'Uses CSS metallic sheen exclusively.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables hover sheen and perspective tilt.' },
  ],
};
