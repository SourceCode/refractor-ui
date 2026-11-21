export const docs = {
  name: 'EyedropperPixelLoupe',
  displayName: 'Eyedropper & Pixel Loupe',
  group: 'Photo & Color Grading Controls',
  category: 'photo-color-grading',
  keywords: [
    'eyedropper',
    'loupe',
    'pixel',
    'color-sampler',
    'magnifier',
    'color-grading',
    'rgb',
    'hex',
    'swatch',
    'photo',
  ],
  usage: {
    description:
      'An optical-glass pixel sampling canvas paired with a circular magnified 5×5 pixel loupe, live #RRGGBB / R-G-B / (X, Y) coordinate telemetry, selectable 1×1 / 3×3 / 5×5 averaging kernels, and a clickable 6-swatch capture history tray.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide a deterministic pixelResolver callback when sampling from a backing image buffer or LUT preview so pointer inspection and keyboard navigation remain instantaneous.',
      },
      {
        guidance: true,
        description:
          'Use 3x3 or 5x5 average sampling on noisy photographic plates to avoid sampling isolated sensor grain spikes.',
      },
      {
        guidance: false,
        description:
          'Return unbounded or NaN channel values from pixelResolver without care — EyedropperPixelLoupe clamps RGB integers to 0..255 and constrains grid dimensions to 5..24 × 5..16 automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Pixel Navigation & IME-Safe Sampling',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Focusable role="application" sampling canvas supporting ArrowLeft/ArrowRight/ArrowUp/ArrowDown/Home/End navigation and IME-guarded Enter/Space sampling',
        description:
          'Users can inspect every pixel and capture swatches strictly from the keyboard with keyboard-only prism-focus-ring indicators and live ARIA coordinate and hex announcements.',
      },
      {
        name: 'Magnified Loupe & Swatch Telemetry',
        criterion: '1.1.1 Non-text Content & 1.4.1 Use of Color',
        requirement:
          'Accessible SVG role="img" summary paired with tabular #RRGGBB, R/G/B, and (X, Y) text readouts',
        description:
          'Color information is never communicated solely through swatches; every active sample and captured history pill exposes exact numeric hex and coordinate labels.',
      },
    ],
  },
  props: [
    {
      name: 'gridWidth',
      type: 'number',
      defaultValue: '12',
      description: 'Number of pixel columns in the sampling canvas (clamped to 5..24).',
    },
    {
      name: 'gridHeight',
      type: 'number',
      defaultValue: '8',
      description: 'Number of pixel rows in the sampling canvas (clamped to 5..16).',
    },
    {
      name: 'sampleRadius',
      type: "'1x1' | '3x3' | '5x5'",
      defaultValue: 'undefined',
      description: 'Controlled sampling kernel radius for point or neighborhood RGB averaging.',
    },
    {
      name: 'defaultSampleRadius',
      type: "'1x1' | '3x3' | '5x5'",
      defaultValue: "'1x1'",
      description: 'Initial sampling kernel radius for uncontrolled usage.',
    },
    {
      name: 'onSampleRadiusChange',
      type: '(radius: SampleRadius) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when the user switches between 1×1 Pt, 3×3 Avg, and 5×5 Avg.',
    },
    {
      name: 'onSample',
      type: '(pixel: SampledRgbPixel) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with { r, g, b, hex, x, y } when sampling a pixel or re-emitting a history swatch.',
    },
    {
      name: 'pixelResolver',
      type: '(x: number, y: number, width: number, height: number) => { r: number; g: number; b: number }',
      defaultValue: 'defaultOpticalFieldResolver',
      description: 'Optional deterministic RGB sampler for each canvas coordinate; defaults to a smooth optical chromatic gradient field.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Eyedropper & Pixel Loupe'",
      description: 'Visible heading title and accessible region label.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables pointer hover, canvas clicks, keyboard navigation, radius controls, and history interactions.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides merged onto the root prism-slab.',
    },
  ],
  examples: [
    `<EyedropperPixelLoupe\n  title="Skin Tone Probe"\n  gridWidth={16}\n  gridHeight={10}\n  defaultSampleRadius="3x3"\n  onSample={(pixel) => setActiveGradeTarget(pixel)}\n/>`,
    `<EyedropperPixelLoupe\n  sampleRadius={radius}\n  onSampleRadiusChange={setRadius}\n  pixelResolver={(x, y, w, h) => sampleFrameBuffer(x, y, w, h)}\n  onSample={handleSample}\n/>`,
  ],
};

export default docs;
