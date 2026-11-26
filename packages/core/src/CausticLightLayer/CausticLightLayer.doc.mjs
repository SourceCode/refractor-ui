export const docs = {
  name: 'CausticLightLayer',
  displayName: 'Caustic Light Projection Layer',
  group: 'Shader & Optical FX',
  category: 'shader-optical-fx',
  keywords: ['caustics', 'light-refraction', 'filaments', 'underwater', 'shader', 'hero', 'overlay'],
  usage: {
    description:
      'Animated underwater-style light-refraction projection layer powered by a WebGL caustic filament shader with smooth CSS fallback, casting delicate shifting bright filaments across cards, headers, or hero surfaces.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Layer subtly (`intensity={0.55–0.75}`) behind hero banners, splash cards, or audio/video workspace headers.',
      },
      {
        guidance: false,
        description:
          'Avoid pairing high `speed` values with dense data entry forms to maintain calm readability.',
      },
    ],
    accessibility: [
      {
        name: 'Reduced-Motion & Offscreen GPU Pause',
        criterion: '2.2.2 Pause, Stop, Hide & 2.3.3 Animation from Interactions',
        requirement:
          'All projection layers are `aria-hidden="true"`, pause automatically offscreen and in hidden tabs, and honor `prefers-reduced-motion: reduce` and `performanceMode="max"`.',
        description:
          'Delivers optical beauty with zero motion hazard or background GPU drain.',
      },
    ],
  },
  props: [
    { name: 'intensity', type: 'number', defaultValue: '0.72', description: 'Caustic filament brightness (0–1.5).' },
    { name: 'scale', type: 'number', defaultValue: '1.2', description: 'Filament spatial density (0.5–3.0).' },
    { name: 'speed', type: 'number', defaultValue: '1.0', description: 'Refraction drift speed multiplier (0.1–3.0).' },
    { name: 'animated', type: 'boolean', defaultValue: 'true', description: 'Toggles continuous filament drift.' },
    { name: 'disableWebGL', type: 'boolean', defaultValue: 'false', description: 'Forces lightweight CSS caustic filament mode.' },
  ],
};
