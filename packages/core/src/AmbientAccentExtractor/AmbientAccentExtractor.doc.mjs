export const docs = {
  name: 'AmbientAccentExtractor',
  displayName: 'Ambient Accent Extractor',
  group: 'Optical Material, A11y & Composition',
  category: 'optical-material-a11y-dx',
  keywords: ['wallpaper', 'accent', 'extraction', 'dynamic-theme', 'rim-light', 'tinting'],
  usage: {
    description:
      'Dynamically extracts primary and secondary saturation-ranked accent hues from desktop wallpaper swatches or brand assets to tint `--prism-primary-rgb`, `--prism-secondary-rgb`, focus rings, and rim lighting in real time.',
    bestPractices: [
      {
        guidance: true,
        description: 'Pair with `sampleRgbaPixelsToAccents()` when sampling live `<canvas>` wallpaper frames.',
      },
      {
        guidance: false,
        description: 'Always validate extracted accents against `resolveAdaptiveInkMode()` when placing text directly on tinted surfaces.',
      },
    ],
    accessibility: [
      {
        name: 'Scoped Non-Destructive Token Tinting',
        criterion: '1.4.3 Contrast (Minimum)',
        requirement:
          'Scopes extracted accent custom properties to the container subtree and exposes hex values as readable text telemetry.',
        description: 'Prevents global contrast regressions while enabling vivid ambient rim tinting.',
      },
    ],
  },
  props: [
    { name: 'wallpaperSwatches', type: 'ReadonlyArray<string>', defaultValue: 'required', description: 'Color swatches sampled from wallpaper or brand imagery.' },
    { name: 'sourceLabel', type: 'string', defaultValue: "'Ambient Wallpaper'", description: 'Label identifying the sampled source.' },
    { name: 'onAccentsExtracted', type: '(accents: ExtractedAmbientAccents) => void', defaultValue: 'undefined', description: 'Callback fired when primary/secondary accents update.' },
  ],
};
