export const docs = {
  name: 'BeforeAfterSlider',
  displayName: 'Before / After Optical Comparison Slider',
  group: 'Media, Audio & Spatial Controls',
  category: 'media-spatial',
  keywords: [
    'before',
    'after',
    'comparison',
    'slider',
    'split',
    'diff',
    'image',
    'reveal',
    'media',
  ],
  usage: {
    description:
      'Interactive optical-glass comparison viewport that reveals a clipped Before layer over a full-bleed After layer via a draggable vertical refractive divider and centered crystal slider handle, supporting sanitized images, custom React nodes, floating corner badges, tabular percentage readout, and full keyboard accessibility.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Match the aspect ratio and framing of beforeSrc and afterSrc images so visual transitions align cleanly across the refractive split line.',
      },
      {
        guidance: true,
        description:
          'Use beforeContent and afterContent when comparing live UI themes, optical dispersion levels, or rendered DOM states instead of static photographs.',
      },
      {
        guidance: false,
        description:
          'Pass untrusted user URLs without validation; BeforeAfterSlider sanitizes both image URLs automatically and blocks unsafe protocols.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Slider Semantics & Stepped Keyboard Control',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'role="slider" with aria-valuemin/max/now; ArrowLeft/ArrowRight move 5% (1% with Shift), Home=0%, End=100%',
        description:
          'The centered crystal handle exposes complete ARIA slider attributes, keyboard-only focus rings, and IME-safe keydown handling.',
      },
      {
        name: 'Safe Image Alt Text & Protocol Blocking',
        criterion: '1.1.1 Non-text Content & 4.1.3 Status Messages',
        requirement: 'Sanitized images inherit descriptive labels and blocked URLs announce via role="status"',
        description:
          'Ensures both layers remain understandable to assistive technology and never render images from unsafe protocols.',
      },
    ],
  },
  props: [
    {
      name: 'beforeLabel',
      type: 'string',
      defaultValue: "'Before'",
      description: 'Text displayed in the top-left crystal badge and used as the before image alt text.',
    },
    {
      name: 'afterLabel',
      type: 'string',
      defaultValue: "'After'",
      description: 'Text displayed in the top-right crystal badge and used as the after image alt text.',
    },
    {
      name: 'beforeSrc',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Image URL for the clipped before layer, validated with sanitizeUrl(beforeSrc, true).',
    },
    {
      name: 'afterSrc',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Image URL for the full-bleed after layer, validated with sanitizeUrl(afterSrc, true).',
    },
    {
      name: 'beforeContent',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Custom React node rendered in the before layer (takes precedence over beforeSrc).',
    },
    {
      name: 'afterContent',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Custom React node rendered in the after layer (takes precedence over afterSrc).',
    },
    {
      name: 'position',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled horizontal split percentage in [0..100].',
    },
    {
      name: 'defaultPosition',
      type: 'number',
      defaultValue: '50',
      description: 'Initial horizontal split percentage in [0..100] for uncontrolled usage.',
    },
    {
      name: 'onPositionChange',
      type: '(pct: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated split percentage when dragged or adjusted via keyboard.',
    },
    {
      name: 'heightPx',
      type: 'number',
      defaultValue: '280',
      description: 'Viewport height in pixels, clamped between 160 and 700.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<BeforeAfterSlider\n  beforeLabel="Subtle Optics"\n  afterLabel="Vivid Dispersion"\n  beforeSrc="/assets/optics-before.jpg"\n  afterSrc="/assets/optics-after.jpg"\n  defaultPosition={55}\n  heightPx={320}\n/>`,
  ],
};
