export const docs = {
  name: 'AdaptiveContrastGlass',
  displayName: 'Adaptive Contrast Glass',
  group: 'Optical Material, A11y & Composition',
  category: 'optical-material-a11y-dx',
  keywords: ['adaptive-contrast', 'luminance', 'wcag', 'legibility', 'glass', 'bevel'],
  usage: {
    description:
      'Samples the relative luminance of whatever sits behind a translucent glass panel and automatically flips foreground text, icons, and inner bevels between `dark-ink` and `light-ink` modes so legibility never breaks over bright or dark wallpapers.',
    bestPractices: [
      {
        guidance: true,
        description: 'Pass the sampled wallpaper or container backdrop color via `backdropColor` so nested typography inherits `--prism-adaptive-ink`.',
      },
      {
        guidance: false,
        description: 'Keep `luminanceThreshold` near `0.42` to preserve WCAG AA >= 4.5:1 contrast across mid-tone gradients.',
      },
    ],
    accessibility: [
      {
        name: 'Automatic WCAG Luminance Polarity',
        criterion: '1.4.3 Contrast (Minimum)',
        requirement:
          'Computes WCAG 2.1 sRGB relative luminance and exposes `data-ink-mode` alongside adaptive foreground CSS variables.',
        description: 'Guarantees readable glass overlays across arbitrary dynamic backgrounds.',
      },
    ],
  },
  props: [
    { name: 'backdropColor', type: 'string', defaultValue: "'#f1f5f9'", description: 'Backdrop color sampled behind the glass panel.' },
    { name: 'luminanceThreshold', type: 'number', defaultValue: '0.42', description: 'Luminance threshold [0..1] for flipping ink polarity.' },
    { name: 'showTelemetry', type: 'boolean', defaultValue: 'false', description: 'Displays live luminance and ink mode telemetry.' },
  ],
};
