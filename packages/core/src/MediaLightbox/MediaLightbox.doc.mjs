export const docs = {
  name: 'MediaLightbox',
  displayName: 'Media Lightbox & Optical Gallery Viewer',
  group: 'Media, Audio & Spatial Controls',
  category: 'media-spatial',
  keywords: [
    'lightbox',
    'media',
    'gallery',
    'image',
    'video',
    'zoom',
    'pan',
    'filmstrip',
    'viewer',
    'modal',
  ],
  usage: {
    description:
      'Dark optical-glass media viewer supporting both fullscreen overlay and embedded inline slab modes, 100%–300% stepped zoom with pointer drag-to-pan, circular previous/next navigation, keyboard shortcuts, clickable thumbnail filmstrip, and strict URL protocol sanitization for images and videos.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide descriptive item titles and optional captions so screen readers and header bars clearly identify each inspected asset.',
      },
      {
        guidance: true,
        description:
          'Use mode="inline" inside documentation studios or split inspection panes, and mode="overlay" with controlled open/onOpenChange for modal gallery launches.',
      },
      {
        guidance: false,
        description:
          'Bypass URL sanitization by embedding raw data:text/html or javascript: URIs; MediaLightbox blocks untrusted protocols and displays a safe notice automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Dialog & Region Semantics with Keyboard Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'ArrowLeft/ArrowRight cycle items; Escape closes overlay mode; IME composition is ignored',
        description:
          'Exposes role="dialog" with aria-modal="true" in overlay mode and role="region" in inline mode, with labeled controls and keyboard-only focus rings.',
      },
      {
        name: 'Safe Media Fallback & Filmstrip State',
        criterion: '4.1.3 Status Messages & 1.1.1 Non-text Content',
        requirement: 'Blocked URLs announce via role="status"; active filmstrip thumbnail exposes aria-pressed and aria-current',
        description:
          'Never renders unsafe media elements and communicates the active slide index via a tabular X / Y counter and explicit filmstrip selection attributes.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<LightboxMediaItem>',
      defaultValue: 'required',
      description: 'Ordered list of image or video items displayed in the viewer and filmstrip.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled visibility state of the lightbox.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Initial visibility state when used in uncontrolled mode.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the lightbox requests to open or close.',
    },
    {
      name: 'activeIndex',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled zero-based index of the currently active media item.',
    },
    {
      name: 'defaultIndex',
      type: 'number',
      defaultValue: '0',
      description: 'Initial zero-based item index when used in uncontrolled mode.',
    },
    {
      name: 'onIndexChange',
      type: '(idx: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the active slide changes via arrows, filmstrip, or keyboard.',
    },
    {
      name: 'mode',
      type: "'overlay' | 'inline'",
      defaultValue: "'overlay'",
      description: 'Renders either a fixed fullscreen backdrop overlay or an embedded prism-slab viewer.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<MediaLightbox\n  mode="inline"\n  items={[\n    {\n      id: 'prism-1',\n      title: 'Refractive Slab Prototype',\n      caption: 'Captured under dual caustic studio lighting.',\n      src: '/assets/prism-slab.jpg',\n      kind: 'image',\n    },\n    {\n      id: 'prism-2',\n      title: 'Dispersion Motion Reel',\n      src: '/assets/dispersion-reel.mp4',\n      kind: 'video',\n      thumbnailSrc: '/assets/dispersion-thumb.jpg',\n    },\n  ]}\n/>`,
  ],
};
