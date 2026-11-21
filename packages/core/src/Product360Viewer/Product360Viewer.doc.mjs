export const docs = {
  name: 'Product360Viewer',
  displayName: 'Product 360° Orbital Viewer',
  group: 'Media, Audio & Spatial Controls',
  category: 'media-spatial',
  keywords: [
    '360',
    'turntable',
    'product',
    'orbit',
    '3d',
    'viewer',
    'prism',
    'spin',
    'media',
    'spatial',
  ],
  usage: {
    description:
      'Interactive 360-degree optical turntable viewer supporting pointer drag-to-orbit, keyboard degree stepping, an accessible 0-355 degree range scrubber, optional auto-spin with clean unmount lifecycle, sanitized multi-angle frame photography, and a fallback token-driven 3D isometric refractive glass prism SVG that rotates smoothly with live specular shading.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Supply evenly spaced frames (for example every 15 or 30 degrees) with descriptive viewpoint labels so nearest-frame matching feels seamless while scrubbing or dragging.',
      },
      {
        guidance: true,
        description:
          'Leave autoRotate={false} by default to respect user motion preferences and allow explicit opt-in via the Auto-Spin toggle button.',
      },
      {
        guidance: false,
        description:
          'Pass untrusted javascript: or SVG data URIs in frame src fields; Product360Viewer strictly validates all image URLs via sanitizeUrl(src, true) and falls back to the 3D optical prism when unsafe.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Orbiting & Range Scrubber Parity',
        criterion: '2.1.1 Keyboard & 2.5.1 Pointer Gestures',
        requirement: 'ArrowLeft/ArrowRight (-15/+15 deg), Home (0 deg), and native range slider',
        description:
          'Provides full non-pointer parity for horizontal drag orbiting through keyboard shortcuts on the focusable stage plus a labeled 0-355 degree range input with spoken aria-valuetext.',
      },
      {
        name: 'Toggle State & Motion Control',
        criterion: '4.1.2 Name, Role, Value & 2.2.2 Pause, Stop, Hide',
        requirement: 'Auto-Spin toggle exposes aria-pressed and cleanly stops timer on toggle or unmount',
        description:
          'The Auto-Spin button reflects active rotation state via aria-pressed and clears its interval immediately when paused or unmounted.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Optical Glass Specimen'",
      description: 'Specimen title rendered in the viewer header and accessible stage label.',
    },
    {
      name: 'frames',
      type: 'ReadonlyArray<Product360Frame>',
      defaultValue: 'undefined',
      description: 'Optional angle-indexed frames with sanitized image URLs and viewpoint labels.',
    },
    {
      name: 'angle',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled orbit angle in degrees (normalized safely into 0..359).',
    },
    {
      name: 'defaultAngle',
      type: 'number',
      defaultValue: '0',
      description: 'Initial orbit angle in uncontrolled mode (normalized safely into 0..359).',
    },
    {
      name: 'onAngleChange',
      type: '(deg: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the next normalized 0..359 degree angle.',
    },
    {
      name: 'autoRotate',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Starts continuous 360-degree turntable spin when true.',
    },
    {
      name: 'heightPx',
      type: 'number',
      defaultValue: '300',
      description: 'Stage height in pixels, clamped safely to the 180..600px range.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<Product360Viewer\n  title="Refractor Optical Lens"\n  defaultAngle={30}\n  heightPx={320}\n/>`,
    `<Product360Viewer\n  title="Crystal Audio Speaker"\n  frames={[\n    { angle: 0, label: 'Front Face', src: 'https://example.com/speaker-0.webp' },\n    { angle: 90, label: 'Right Profile', src: 'https://example.com/speaker-90.webp' },\n    { angle: 180, label: 'Rear Ports', src: 'https://example.com/speaker-180.webp' },\n  ]}\n/>`,
  ],
};
