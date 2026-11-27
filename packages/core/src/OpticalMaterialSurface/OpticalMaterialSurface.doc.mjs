export const docs = {
  name: 'OpticalMaterialSurface',
  displayName: 'Optical Material Surface',
  group: 'Optical Material, A11y & Composition',
  category: 'optical-material-a11y-dx',
  keywords: ['wafer', 'lens', 'prism', 'material', 'ior', 'dispersion', 'dpr', 'hairline'],
  usage: {
    description:
      'Standardizes optical glass surfaces into three named physical grades — `wafer` (thin frosted overlay), `lens` (medium refractive card), and `prism` (thick beveled pill with chromatic dispersion) — with automatic DPR hairline locking and tiered GPU fallback.',
    bestPractices: [
      {
        guidance: true,
        description: 'Use `wafer` for dense toolbars, `lens` for standard cards/panels, and `prism` for hero controls or floating capsules.',
      },
      {
        guidance: false,
        description: 'Avoid nesting `prism` inside `prism`; step down to `wafer` for inner containers to preserve depth hierarchy.',
      },
    ],
    accessibility: [
      {
        name: 'Automatic Reduced-Transparency & Flat Fallback',
        criterion: '1.4.3 Contrast (Minimum)',
        requirement:
          'Automatically zeroes blur when `useGpuPerformanceGuardrail` reports `flat-opaque` or when `prefers-reduced-transparency` is active.',
        description: 'Keeps glass surfaces crisp and legible on low-power or high-contrast setups.',
      },
    ],
  },
  props: [
    { name: 'tier', type: "'wafer' | 'lens' | 'prism'", defaultValue: "'lens'", description: 'Physical glass elevation and thickness grade.' },
    { name: 'ior', type: 'number', defaultValue: 'Preset IOR', description: 'Optional index-of-refraction override.' },
    { name: 'blurPx', type: 'number', defaultValue: 'Preset blur', description: 'Optional backdrop blur radius override in pixels.' },
  ],
};
