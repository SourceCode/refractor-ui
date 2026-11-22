export const docs = {
  name: 'OpticalMaterialInspector',
  displayName: 'Optical Material Inspector',
  group: 'Design, 3D & Shader Inspector Controls',
  category: 'design-3d-shader',
  keywords: [
    'optical',
    'material',
    'shader',
    'inspector',
    'ior',
    'snell',
    'refraction',
    'dispersion',
    'specular',
    'meniscus',
    'blur',
    'glass',
    'prism',
    '3d',
  ],
  usage: {
    description:
      'Interactive optical-glass material & shader inspector built on a sculpted prism-slab container featuring four one-click optical presets (Frosted Quartz, Diamond Prism, Smoked Obsidian, Amber Lens), a Reset control, a live two-column shader workbench with a real-time SVG refractive sphere & glass slab specimen (Gaussian blur filter, Snell law refraction ray diagram, prismatic chromatic dispersion split bands using semantic --prism-primary-main, --prism-success-main, and --prism-secondary-main tokens, and top-edge meniscus specular sheen), precision sliders for Blur Radius, IOR (1.00–2.50), Chromatic Dispersion, and Specular Intensity, five semantic Surface Tint pills, IME-safe preset/reset keyboard shortcuts, and an aria-live shader uniform summary.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use controlled value and onChange props when binding shader uniforms directly to a WebGL/WebGPU material, Three.js MeshPhysicalMaterial, or live CSS optical theme studio.',
      },
      {
        guidance: true,
        description:
          'Leverage the built-in optical presets (Frosted Quartz, Diamond Prism, Smoked Obsidian, Amber Lens) or keyboard shortcuts (1–4, R) to give designers rapid starting points before fine-tuning IOR and dispersion.',
      },
      {
        guidance: false,
        description:
          'Expect raw out-of-range or non-finite uniform values (NaN, Infinity, IOR < 1.0 or > 2.5) to propagate directly to downstream shaders; OpticalMaterialInspector sanitizes and clamps every parameter automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Accessible Precision Range Sliders, Preset Toggles & Surface Tint Controls',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes native range sliders for Blur Radius (px), Index of Refraction (IOR 1.00–2.50), Chromatic Dispersion (%), and Specular Intensity (%) with descriptive aria-valuetext alongside aria-pressed preset and surface tint toggle pills',
        description:
          'Supports full keyboard navigation across sliders, presets, surface tints, and Reset, plus IME-safe numeric preset (1–4) and reset (R) shortcuts that never hijack modifier combinations.',
      },
      {
        name: 'Polite Shader Uniform Readout & Keyboard-Only Focus Outlines',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Announces consolidated shader uniforms ("blur: 18px · IOR: 1.52 · disp: 42% · spec: 78% · tint: crystal") inside an aria-live="polite" status well and scopes visible focus outlines exclusively to :focus-visible',
        description:
          'Keeps assistive technologies informed of live parameter changes without visual pointer-focus clutter on optical-glass pills and slider thumbs.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'OpticalMaterialState',
      defaultValue: 'undefined',
      description:
        'Controlled shader material state ({ blurPx, ior, dispersion, specularPct, tint }).',
    },
    {
      name: 'defaultValue',
      type: 'OpticalMaterialState',
      defaultValue:
        "{ blurPx: 18, ior: 1.52, dispersion: 42, specularPct: 78, tint: 'crystal' }",
      description: 'Initial optical material state used in uncontrolled mode and as the Reset target.',
    },
    {
      name: 'onChange',
      type: '(state: OpticalMaterialState) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever any material parameter, preset, tint, or reset updates state.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Optical Material & Shader Inspector'",
      description: 'Header heading text and accessible aria-label for the inspector region landmark.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all presets, sliders, surface tint pills, reset action, and keyboard shortcuts.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<OpticalMaterialInspector\n  title="Optical Material & Shader Inspector"\n  defaultValue={{ blurPx: 18, ior: 1.52, dispersion: 42, specularPct: 78, tint: 'crystal' }}\n  onChange={(next) => console.warn(next)}\n/>`,
    `<OpticalMaterialInspector\n  title="Lens Coating Shader"\n  value={material}\n  onChange={setMaterial}\n/>`,
  ],
};

export default docs;
