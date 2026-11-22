export const docs = {
  name: 'PolarAreaRoseChart',
  displayName: 'Polar Area (Nightingale Rose) Chart',
  group: 'Scientific, Statistical & High-Dimensional Visuals',
  category: 'scientific-charts',
  keywords: [
    'polar',
    'nightingale',
    'rose',
    'coxcomb',
    'wind-rose',
    'radial',
    'cyclic',
    'seasonal',
    'area-proportional',
    'scientific',
    'statistical',
    'chart',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass Polar Area (Nightingale Rose / Coxcomb) chart inside a sculpted prism-slab card with a live Area-Proportional (sqrt-radius) vs Linear Radius toggle, peak sector telemetry badge, responsive 320×320 circular SVG inside a recessed prism-well with concentric 25%/50%/75%/100% rings, radial spoke guides, equal-angle semantic --prism-* wedges that expand on focus/selection, responsive interactive legend chips, and an aria-live="polite" recessed inspector strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep the default Area-Proportional scaleMode ("area") for honest statistical comparisons so sector visual area scales linearly with magnitude (r ∝ √value), or switch to Linear Radius ("radius") when comparing raw radial distances against concentric reference rings.',
      },
      {
        guidance: true,
        description:
          'Plot 4 to 12 cyclic or directional categories (such as compass wind bearings, months, or clock hours) with concise labels and a clear unit (e.g. "kt", "mm", "kWh") so perimeter labels and telemetry chips remain legible across mobile and desktop viewports.',
      },
      {
        guidance: false,
        description:
          'Use a polar rose chart for non-cyclic high-cardinality lists or datasets containing only zero/negative values; non-finite and negative slice values clamp to 0 automatically, and empty or non-positive datasets display a clean role="status" empty state.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Focusable Sector Wedges & Scale Mode Toggle',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Header scale-mode pills and legend chips expose native button aria-pressed states, while every SVG sector wedge exposes role="button", tabIndex={0}, aria-pressed, and descriptive aria-label with IME-safe Enter/Space toggle and ArrowLeft/ArrowRight cyclic traversal plus keyboard-only prism-focus-ring outlines',
        description:
          'Enables complete keyboard inspection around the polar perimeter while expanding and highlighting the active sector and softly dimming inactive sectors.',
      },
      {
        name: 'Accessible SVG Labeling & Polite Live Inspector',
        criterion: '1.1.1 Non-text Content, 1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'SVG declares role="img" summarizing active scale mode and sector count, wedges derive fills exclusively from --prism-* semantic tokens, and the recessed aria-live="polite" prism-well inspector announces Sector · Value · Share % · Scale Mode',
        description:
          'Guarantees cyclic magnitude comparisons remain accessible across light, dark, and custom Refractor optical themes without relying on raw colors or visual area estimation alone.',
      },
    ],
  },
  props: [
    {
      name: 'slices',
      type: 'ReadonlyArray<PolarRoseSlice>',
      defaultValue: '8 default cyclic compass wind-rose sectors (N, NE, E, SE, S, SW, W, NW)',
      description:
        'Ordered array of { id, label, value, tone? } cyclic sectors. Pass [] or all non-positive values to render the clean role="status" empty state.',
    },
    {
      name: 'scaleMode',
      type: "'area' | 'radius'",
      defaultValue: 'undefined',
      description:
        'Controlled radial scale mode: "area" scales radius by √(value/max) for area-honest wedges; "radius" scales radius linearly.',
    },
    {
      name: 'defaultScaleMode',
      type: "'area' | 'radius'",
      defaultValue: "'area'",
      description: 'Initial scale mode when uncontrolled ("area" for Nightingale sqrt-proportional area scaling).',
    },
    {
      name: 'onScaleModeChange',
      type: '(mode: RoseScaleMode) => void',
      defaultValue: 'undefined',
      description: 'Optional callback invoked whenever the user toggles between "area" and "radius" scale modes.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'kt'",
      description: 'Measurement unit appended to sector magnitudes, peak badge, and totals (e.g. "kt", "mm", "%").',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Polar Area (Nightingale Rose)'",
      description: 'Heading displayed in the sculpted prism-slab header and linked to the chart region and SVG.',
    },
    {
      name: 'onSelectSlice',
      type: '(slice: PolarRoseSlice, sharePct: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the selected PolarRoseSlice and its rounded percentage share when a wedge or legend chip is activated or navigated via ArrowLeft/ArrowRight.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<PolarAreaRoseChart\n  title="Coastal Wind Rose"\n  unit="kt"\n  onSelectSlice={(slice, sharePct) => {\n    void slice;\n    void sharePct;\n  }}\n/>`,
    `<PolarAreaRoseChart\n  title="Seasonal Precipitation"\n  unit="mm"\n  defaultScaleMode="radius"\n  slices={[\n    { id: 'winter', label: 'Winter', value: 140, tone: 'info' },\n    { id: 'spring', label: 'Spring', value: 96, tone: 'emerald' },\n    { id: 'summer', label: 'Summer', value: 42, tone: 'amber' },\n    { id: 'autumn', label: 'Autumn', value: 112, tone: 'primary' },\n  ]}\n/>`,
  ],
};

export default docs;
