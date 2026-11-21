export const docs = {
  name: 'LiveColorScopes',
  displayName: 'Live Color Scopes',
  group: 'Photo & Color Grading Controls',
  category: 'photo-color-grading',
  keywords: [
    'color-scopes',
    'histogram',
    'waveform',
    'vectorscope',
    'luma',
    'ire',
    'rgb',
    'grading',
    'colorimetry',
    'clipping',
    'skin-tone',
    'broadcast',
  ],
  usage: {
    description:
      'Broadcast-grade optical-glass color grading monitor inside a sculpted prism-slab card featuring an RGB + Luma overlapping polygon histogram with toggleable channel pills (Luma, R, G, B), a 0–100 IRE luma waveform monitor with >90 IRE highlight warnings, a Rec.709 chromaticity vectorscope with 75% safe ring, skin-tone I-line, and 6 color target boxes (R, Mg, B, Cy, G, Yl), live Shadow/Highlight Clip pills, and an aria-live="polite" telemetry footer driven strictly by --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use mode="all" in dedicated grading panels and switch to single-scope views ("histogram", "waveform", or "vectorscope") inside compact inspector rails.',
      },
      {
        guidance: true,
        description:
          'Bind mode and onModeChange in controlled mode when synchronizing scope tabs with keyboard shortcuts or workspace layouts.',
      },
      {
        guidance: false,
        description:
          'Pass unclamped or non-finite values without fallback expectations — LiveColorScopes sanitizes non-finite inputs, clamps IRE and saturation into [0..100], and renders graceful empty-signal states.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Roving Tablist Scope Switcher & Channel Toggles',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Scope view buttons expose role="tab" with aria-selected and ArrowLeft/ArrowRight/Home/End navigation; histogram channel buttons expose aria-pressed and IME-safe keyboard handlers',
        description:
          'Allows full keyboard operation of scope view switching and RGB+Luma channel filtering with keyboard-only .prism-focus-ring outlines.',
      },
      {
        name: 'Accessible SVG Telemetry & Polite Live Region',
        criterion: '1.1.1 Non-text Content & 4.1.3 Status Messages',
        requirement:
          'Every scope SVG exposes role="img" with descriptive aria-label metrics, paired with a recessed prism-well role="status" aria-live="polite" footer',
        description:
          'Announces active scope mode, peak IRE, shadow/highlight clipping percentages, and sample count without stealing focus.',
      },
    ],
  },
  props: [
    {
      name: 'mode',
      type: 'ColorScopeMode',
      defaultValue: 'undefined',
      description: "Controlled active scope view mode ('histogram' | 'waveform' | 'vectorscope' | 'all').",
    },
    {
      name: 'defaultMode',
      type: 'ColorScopeMode',
      defaultValue: "'all'",
      description: 'Initial active scope view mode for uncontrolled usage.',
    },
    {
      name: 'onModeChange',
      type: '(mode: ColorScopeMode) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the active scope mode changes via click or keyboard.',
    },
    {
      name: 'histogram',
      type: 'ScopeHistogramBins',
      defaultValue: 'DEFAULT_HISTOGRAM (32 bins)',
      description: 'RGB and Luma bin arrays ({ luma, red, green, blue }) rendered as overlapping translucent polygons.',
    },
    {
      name: 'waveformColumns',
      type: 'ReadonlyArray<ReadonlyArray<number>>',
      defaultValue: 'DEFAULT_WAVEFORM_COLUMNS (24 columns)',
      description: 'Horizontal frame columns of 0–100 IRE luminance readings plotted with >90 IRE amber warnings.',
    },
    {
      name: 'vectorSamples',
      type: 'ReadonlyArray<VectorscopeSample>',
      defaultValue: 'DEFAULT_VECTOR_SAMPLES (36 samples)',
      description: 'Chromaticity scatter samples ({ angleDeg, saturation }) plotted against the 75% safe ring and skin-tone I-line.',
    },
    {
      name: 'highlightClipPct',
      type: 'number',
      defaultValue: 'computed from top histogram bin',
      description: 'Optional 0–100 highlight clipping percentage override driving the --prism-error-main warning pill.',
    },
    {
      name: 'shadowClipPct',
      type: 'number',
      defaultValue: 'computed from bottom histogram bin',
      description: 'Optional 0–100 shadow clipping percentage override driving the --prism-info-main warning pill.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Live Color Scopes'",
      description: 'Visible card heading linked to the root region via aria-labelledby.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<LiveColorScopes\n  title="Rec.709 Master Scopes"\n  defaultMode="all"\n  onModeChange={(nextMode) => console.warn(nextMode)}\n/>`,
    `<LiveColorScopes\n  mode="vectorscope"\n  shadowClipPct={3.4}\n  highlightClipPct={0.2}\n  vectorSamples={[\n    { angleDeg: 123, saturation: 42 },\n    { angleDeg: 103.5, saturation: 70 },\n  ]}\n/>`,
  ],
};

export default docs;
