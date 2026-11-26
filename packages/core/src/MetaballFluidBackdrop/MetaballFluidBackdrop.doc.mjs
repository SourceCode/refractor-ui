export const docs = {
  name: 'MetaballFluidBackdrop',
  displayName: 'Metaball Fluid Backdrop',
  group: 'Shader & Optical FX',
  category: 'shader-optical-fx',
  keywords: ['metaball', 'fluid', 'sdf', 'orbs', 'backdrop', 'webgl', 'glsl', 'ambient'],
  usage: {
    description:
      'GPU-accelerated WebGL SDF metaball fluid surface where glowing optical orbs organically merge and separate behind frosted glass controls, with DPR capping, offscreen/hidden-tab pause, and pure CSS blurred-orb fallback.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Place behind frosted login cards, AI canvas welcome stages, or media hero headers to showcase real-time optical refraction.',
      },
      {
        guidance: false,
        description:
          'Avoid placing multiple animated metaball backdrops simultaneously inside long scrollable lists.',
      },
    ],
    accessibility: [
      {
        name: 'Reduced-Motion & Visibility-Paused Fluid',
        criterion: '2.2.2 Pause, Stop, Hide & 2.3.3 Animation from Interactions',
        requirement:
          'Shader canvas and fallback orbs carry `aria-hidden="true"` and automatically halt animation offscreen, in hidden tabs, under `prefers-reduced-motion: reduce`, and in `performanceMode="max"`.',
        description:
          'Protects battery life and vestibular comfort while maintaining full visual richness.',
      },
    ],
  },
  props: [
    { name: 'orbCount', type: 'number', defaultValue: '3', description: 'Number of merging optical orbs (clamped 2–5).' },
    { name: 'intensity', type: 'number', defaultValue: '0.85', description: 'Fluid glow intensity (0–1.5).' },
    { name: 'speed', type: 'number', defaultValue: '1.0', description: 'Fluid drift speed multiplier (0.2–2.5).' },
    { name: 'interactive', type: 'boolean', defaultValue: 'true', description: 'Attracts fluid metaballs gently toward pointer movement.' },
    { name: 'animated', type: 'boolean', defaultValue: 'true', description: 'Toggles continuous organic merging.' },
  ],
};
