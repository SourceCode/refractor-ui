export const docs = {
  name: 'ChromaticDispersionEdge',
  displayName: 'Chromatic Dispersion Edge',
  group: 'Shader & Optical FX',
  category: 'shader-optical-fx',
  keywords: ['chromatic', 'dispersion', 'prism', 'caustics', 'rainbow-edge', 'shader', 'border'],
  usage: {
    description:
      'Fragment-shader-backed perimeter edge layer that splits light along curved component borders into delicate RGB rainbow caustics matching Refractor optical glass physics, with automatic CSS chromatic ring fallback.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Wrap signature cards, showcase widgets, or tactile controls with subtle `dispersion={1.2–1.6}` for crisp optical bevel caustics.',
      },
      {
        guidance: false,
        description:
          'Avoid high dispersion values over dense small controls where prismatic edge bleed could distract from labels.',
      },
    ],
    accessibility: [
      {
        name: 'Decorative Spectral Border',
        criterion: '1.4.11 Non-text Contrast',
        requirement:
          'Dispersion canvas and ring carry `aria-hidden="true"` and `pointer-events-none` without reducing foreground text contrast.',
        description:
          'Preserves clean keyboard focus outlines and crisp border boundaries across Light and Dark modes.',
      },
    ],
  },
  props: [
    { name: 'dispersion', type: 'number', defaultValue: '1.35', description: 'RGB channel separation spread factor (clamped 0.5–3.0).' },
    { name: 'intensity', type: 'number', defaultValue: '0.88', description: 'Edge dispersion opacity intensity (0–1.5).' },
    { name: 'animated', type: 'boolean', defaultValue: 'true', description: 'Animates subtle prism wave phase along the perimeter.' },
    { name: 'disableWebGL', type: 'boolean', defaultValue: 'false', description: 'Forces lightweight CSS caustic edge mode.' },
  ],
};
