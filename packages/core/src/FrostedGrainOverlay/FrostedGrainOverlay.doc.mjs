export const docs = {
  name: 'FrostedGrainOverlay',
  displayName: 'Frosted Noise & Film-Grain Overlay',
  group: 'Shader & Optical FX',
  category: 'shader-optical-fx',
  keywords: ['grain', 'noise', 'frosted', 'matte', 'anti-banding', 'film-grain', 'feTurbulence', 'shader'],
  usage: {
    description:
      'Procedural micro-grain shader paired with an SVG `feTurbulence` fallback layered over translucent surfaces to eliminate 8-bit gradient color banding and give glass panels a tactile, matte-etched physical feel.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep `animated={false}` (default) for static matte-etched frosted glass with zero continuous per-frame CPU/GPU overhead.',
      },
      {
        guidance: false,
        description:
          'Avoid opacity above `0.25` over small body text so letterforms remain crisp.',
      },
    ],
    accessibility: [
      {
        name: 'Purely Decorative Matte Texture',
        criterion: '1.4.3 Contrast (Minimum)',
        requirement:
          'Noise canvas and SVG carry `aria-hidden="true"` and `pointer-events-none`, and clamp maximum opacity to `0.35` so foreground contrast remains unaffected.',
        description:
          'Maintains pointer pass-through and legibility across all optical and WebOS themes.',
      },
    ],
  },
  props: [
    { name: 'grainSize', type: "'fine' | 'medium' | 'coarse'", defaultValue: "'fine'", description: 'Procedural noise spatial frequency.' },
    { name: 'opacity', type: 'number', defaultValue: '0.14', description: 'Micro-grain visibility (clamped 0.02–0.35).' },
    { name: 'animated', type: 'boolean', defaultValue: 'false', description: 'Enables subtle cinema film-grain temporal jitter.' },
    { name: 'disableWebGL', type: 'boolean', defaultValue: 'false', description: 'Uses SVG feTurbulence micro-grain exclusively.' },
  ],
};
