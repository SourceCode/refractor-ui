export const docs = {
  name: 'ColorPicker',
  displayName: 'Color Picker',
  group: 'Forms & Inputs',
  category: 'forms-inputs',
  keywords: [
    'color',
    'picker',
    'hsv',
    'rgb',
    'hex',
    'alpha',
    'opacity',
    'swatch',
    'wcag',
    'contrast',
    'palette',
  ],
  usage: {
    description:
      'Optical glass studio color picker featuring a 2D interactive HSV saturation/brightness spectrum, full-spectrum hue slider, checkered opacity slider, synchronized IME-safe Hex and R/G/B/A channel wells, live swatch with WCAG 2.2 contrast ratios against #FFFFFF and #151E2C, and quick preset swatch pills.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Monitor the built-in WCAG contrast readout against #FFFFFF and #151E2C when selecting primary or accent theme colors.',
      },
      {
        guidance: true,
        description:
          'Provide domain-specific presets via the presets prop to keep brand palettes consistent across studio workflows.',
      },
      {
        guidance: false,
        description:
          'Hide the alpha controls (showAlpha={false}) only when downstream tokens require opaque #RRGGBB values.',
      },
    ],
    accessibility: [
      {
        name: '2D spectrum keyboard navigation & live contrast transparency',
        criterion: '2.1.1 Keyboard & 1.4.3 Contrast (Minimum)',
        requirement: 'role="slider" with Arrow keys (Shift for 10% step), labeled range/number inputs, IME-safe Hex commit',
        description:
          'The 2D saturation/brightness plane exposes role="slider" with ArrowLeft/Right for saturation, ArrowUp/Down for brightness, Home/End extremes, and Shift acceleration. Every slider, numeric channel, and preset swatch carries explicit accessible labels and keyboard-only focus rings.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled #RRGGBB hex color value.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "'#E75C24'",
      description: 'Initial uncontrolled #RRGGBB hex color value.',
    },
    {
      name: 'alpha',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled opacity alpha value between 0 and 1.',
    },
    {
      name: 'defaultAlpha',
      type: 'number',
      defaultValue: '1',
      description: 'Initial uncontrolled opacity alpha value between 0 and 1.',
    },
    {
      name: 'onChange',
      type: '(hex: string, alpha: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the active hex color or opacity changes.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional visible header label displayed above the 2D HSV spectrum.',
    },
    {
      name: 'presets',
      type: 'ReadonlyArray<string>',
      defaultValue: "['#E75C24', '#38BDF8', '#26BC92', '#1D4ED8', '#7C3AED', '#D97706', '#EC4899', '#18202C']",
      description: 'Quick preset swatch hex colors rendered as optical swatch pills.',
    },
    {
      name: 'showAlpha',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays or hides the opacity slider and alpha percentage input.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all interactive color picker controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ColorPicker\n  label="Primary Refraction"\n  defaultValue="#E75C24"\n  defaultAlpha={1}\n  onChange={(hex, alpha) => console.log(hex, alpha)}\n/>`,
  ],
};
