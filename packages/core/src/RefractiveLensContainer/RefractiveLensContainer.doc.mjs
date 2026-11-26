export const docs = {
  name: 'RefractiveLensContainer',
  displayName: 'Refractive Lens Container',
  group: 'Shader & Optical FX',
  category: 'shader-optical-fx',
  keywords: ['lens', 'refraction', 'glass', 'distortion', 'webgl', 'glsl', 'ior', 'acrylic'],
  usage: {
    description:
      'WebGL/GLSL-backed optical lens container simulating thick polished acrylic or liquid glass refraction with configurable index of refraction (`ior`), focal radius, subtle optical magnification, Fresnel specular rim, and zero-stall CSS fallback.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use around focal media cards, hero instrumentation tiles, or floating dock surfaces with realistic `ior` values (`1.33` liquid, `1.49` acrylic, `1.65` crystal).',
      },
      {
        guidance: false,
        description:
          'Avoid excessive `magnification` above `1.08` on text-heavy panels so glyphs remain sharp and never clip horizontally.',
      },
    ],
    accessibility: [
      {
        name: 'Non-Destructive Optical Layer & Context-Loss Cleanup',
        criterion: '1.4.4 Resize Text & 2.3.3 Animation from Interactions',
        requirement:
          'Shader canvas and Fresnel rim carry `aria-hidden="true"` and `pointer-events-none`, automatically pause offscreen or in `performanceMode="max"`, and dispose GPU buffers cleanly on unmount.',
        description:
          'Preserves sharp DOM text accessibility and prevents WebGL memory leaks.',
      },
    ],
  },
  props: [
    { name: 'ior', type: 'number', defaultValue: '1.49', description: 'Index of refraction (clamped 1.0–2.4).' },
    { name: 'lensRadius', type: 'number', defaultValue: '0.52', description: 'Normalized focal lens curvature radius (0.15–0.85).' },
    { name: 'magnification', type: 'number', defaultValue: '1.04', description: 'Optical content magnification scale (1.0–1.25).' },
    { name: 'intensity', type: 'number', defaultValue: '0.9', description: 'Refractive specular highlight intensity (0–1.5).' },
    { name: 'interactive', type: 'boolean', defaultValue: 'true', description: 'Shifts optical lens center toward the pointer.' },
    { name: 'disableWebGL', type: 'boolean', defaultValue: 'false', description: 'Forces lightweight CSS optical lens fallback.' },
  ],
};
