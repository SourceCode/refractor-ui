export const docs = {
  name: 'ChoroplethMap',
  displayName: 'Choropleth Map',
  group: 'Geospatial & Map Visuals',
  category: 'geospatial-charts',
  keywords: [
    'choropleth',
    'map',
    'geospatial',
    'world',
    'regions',
    'intensity',
    'density',
    'heatmap',
    'svg',
    'analytics',
  ],
  usage: {
    description:
      'Accessible optical-glass regional choropleth map featuring built-in stylized vector macro-region world geometry (na, sa, eu, af, me, as, oc) inside a 640×320 SVG viewBox, sanitized custom pathD support with crisp hexagon badge fallbacks, linear --prism-* fillOpacity shading (0.16..0.90), 5-step Low-to-High ramp legend, synchronized regional pills, and a recessed prism-well aria-live readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use built-in macro-region IDs (na, sa, eu, af, me, as, oc) for instant world-scale shading, or supply sanitized SVG pathD geometry with optional labelX and labelY anchors for custom territories.',
      },
      {
        guidance: true,
        description:
          'Provide a concise valueUnit (such as "%", "k", or "ms") and short regional detail notes so the header range ramp and recessed selection readout communicate complete context without cluttering the map canvas.',
      },
      {
        guidance: false,
        description:
          'Pass negative, NaN, Infinity, or unsanitized path strings expecting raw passthrough; non-finite and negative regions are filtered automatically, and unsafe pathD strings fall back safely to built-in or hexagonal badge geometry.',
      },
    ],
    accessibility: [
      {
        name: 'Synchronized Map Polygons & Regional Pill Controls',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every SVG region polygon and regional pill exposes tabIndex={0}, aria-pressed, descriptive metric/share aria-label, IME-safe Enter/Space selection, Escape focus clearing, and keyboard-only prism-focus-ring outlines',
        description:
          'Users can inspect any region via pointer or keyboard from either the vector canvas or the regional pill strip, with non-selected regions subtly dimmed while focus is active.',
      },
      {
        name: 'Polite Live Readout & Semantic Optical Tokens',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'Recessed prism-well readout uses aria-live="polite" to announce "{name} · {value}{unit} · {sharePct}% of total" plus optional detail, while all fills and strokes derive strictly from --prism-* CSS custom properties',
        description:
          'Ensures regional values, percentage shares, and intensity ranges remain legible across light, dark, and custom Refractor themes without relying on color alone.',
      },
    ],
  },
  props: [
    {
      name: 'regions',
      type: 'ChoroplethRegion[]',
      defaultValue: 'required',
      description:
        'Array of { id, name, value, pathD?, labelX?, labelY?, detail? } records shaded proportionally across the intensity ramp.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Regional Choropleth Map'",
      description: 'Heading displayed in the optical slab header and linked via aria-labelledby.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: "''",
      description: 'Optional unit suffix appended to the legend range, pill values, and active readout.',
    },
    {
      name: 'tone',
      type: "'primary' | 'secondary' | 'emerald' | 'amber' | 'rose'",
      defaultValue: "'primary'",
      description: 'Semantic --prism-* optical tone used for polygon fills, legend swatches, and focus states.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '260',
      description: 'SVG canvas height in pixels, safely clamped to the 180..480 range.',
    },
    {
      name: 'onSelectRegion',
      type: '(region: ChoroplethRegion, sharePct: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever a region polygon or regional pill is selected via click or keyboard.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<ChoroplethMap\n  title="Global Edge Traffic Share"\n  tone="secondary"\n  valueUnit="k"\n  regions={[\n    { id: 'na', name: 'North America', value: 420, detail: 'US-East & US-West clusters' },\n    { id: 'eu', name: 'Europe', value: 310, detail: 'Frankfurt & Dublin PoPs' },\n    { id: 'as', name: 'Asia', value: 285, detail: 'Tokyo & Singapore hubs' },\n    { id: 'sa', name: 'South America', value: 95 },\n    { id: 'me', name: 'Middle East', value: 70 },\n    { id: 'af', name: 'Africa', value: 55 },\n    { id: 'oc', name: 'Oceania', value: 85 },\n  ]}\n/>`,
    `<ChoroplethMap\n  title="Emerald Renewable Grid Adoption"\n  tone="emerald"\n  valueUnit="%"\n  height={300}\n  regions={[\n    { id: 'eu', name: 'Europe', value: 78 },\n    { id: 'na', name: 'North America', value: 54 },\n    { id: 'oc', name: 'Oceania', value: 62 },\n    { id: 'nordic-custom', name: 'Nordic Grid', value: 92, pathD: 'M 300 26 L 346 26 L 352 54 L 296 54 Z' },\n  ]}\n/>`,
  ],
};
