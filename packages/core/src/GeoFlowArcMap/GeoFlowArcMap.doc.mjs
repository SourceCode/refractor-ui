export const docs = {
  name: 'GeoFlowArcMap',
  displayName: 'Geo Flow Arc Map',
  group: 'Geospatial & Map Visuals',
  category: 'geospatial-charts',
  keywords: [
    'geo',
    'map',
    'flow',
    'arc',
    'bezier',
    'routes',
    'hubs',
    'equirectangular',
    'network',
    'logistics',
    'migration',
    'telemetry',
    'geospatial',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass geospatial origin-destination flow map using equirectangular projection (viewBox 0 0 640 320) over a subtle graticule grid and stylized continental landmasses. Sanitizes hub coordinates and positive finite flow volumes through prototype-safe Maps, renders curved quadratic-bezier arcs scaled proportionally to route volume with directional midpoint arrows, and supports interactive flow and hub focus isolation inside a recessed prism-well readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide distinct semantic tones (primary, secondary, emerald, amber, rose) on regional hubs or priority corridors so competing directional arcs remain distinguishable across all Refractor themes.',
      },
      {
        guidance: true,
        description:
          'Supply valueUnit (such as " Gbps", "k", or " TEU") and concise flow labels so the header summary pill, route aria-labels, and recessed prism-well inspector stay immediately scannable.',
      },
      {
        guidance: false,
        description:
          'Rely on GeoFlowArcMap to plot non-finite coordinates, zero/negative flow volumes, or self-loops; invalid hubs and flows are filtered automatically and an accessible role="status" empty notice is shown when fewer than 2 valid hubs or 1 valid route remain.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Flow Arcs, Hub Nodes & Clear Focus Control',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every SVG flow arc and hub marker exposes role="button", tabIndex={0}, aria-pressed, descriptive aria-label, IME-safe Enter/Space/Escape handling, and keyboard-only prism-focus-ring styling',
        description:
          'Activating a flow arc highlights that route (opacity 0.95 vs 0.16 dimmed siblings), fires onSelectFlow, shows the Clear Focus header action, and announces "{origin} → {destination} · {volume}{unit}" in an aria-live="polite" prism-well region; activating a hub isolates all inbound and outbound routes and reports hub throughput.',
      },
      {
        name: 'Accessible SVG Map Semantics & Non-Color Encoding',
        criterion: '1.1.1 Non-text Content & 1.4.1 Use of Color',
        requirement:
          'role="img" SVG paired with directional midpoint arrows, proportional stroke widths, visible hub labels, and clean empty status state',
        description:
          'Combines semantic --prism-* CSS custom properties with directional midpoint arrowheads, volume-scaled stroke widths (1.5..6), hub labels, and numeric throughput badges so route direction and magnitude never depend on color alone.',
      },
    ],
  },
  props: [
    {
      name: 'hubs',
      type: 'GeoHub[]',
      defaultValue: 'required',
      description:
        "Array of { id, label, lat, lng, tone? } hubs; filters finite lat/lng, clamps lat [-90, 90] and lng [-180, 180], and deduplicates by id.",
    },
    {
      name: 'flows',
      type: 'GeoFlowArc[]',
      defaultValue: 'required',
      description:
        'Array of { id, origin, destination, volume, label?, tone? } directed routes; renders only positive finite volumes between distinct valid hubs.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Global Flow Arc Map'",
      description: 'Heading rendered in the optical glass card header and bound to the region landmark.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: "''",
      description: 'Optional unit suffix appended to header totals, flow volumes, and hub throughput metrics.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '280',
      description: 'SVG viewport display height in pixels, safely clamped between 180 and 480.',
    },
    {
      name: 'onSelectFlow',
      type: '(flow: GeoFlowArc, originHub: GeoHub, destinationHub: GeoHub) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the selected GeoFlowArc and its resolved origin and destination GeoHub records when any arc is clicked or keyboard-activated.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline style overrides.',
    },
  ],
  examples: [
    `<GeoFlowArcMap\n  title="Global Backbone Traffic"\n  valueUnit=" Gbps"\n  hubs={[\n    { id: 'sfo', label: 'San Francisco', lat: 37.77, lng: -122.42, tone: 'primary' },\n    { id: 'nyc', label: 'New York', lat: 40.71, lng: -74.01, tone: 'secondary' },\n    { id: 'lon', label: 'London', lat: 51.51, lng: -0.13, tone: 'emerald' },\n    { id: 'sin', label: 'Singapore', lat: 1.35, lng: 103.82, tone: 'amber' },\n    { id: 'tyo', label: 'Tokyo', lat: 35.68, lng: 139.69, tone: 'rose' },\n  ]}\n  flows={[\n    { id: 'f1', origin: 'sfo', destination: 'nyc', volume: 420, label: 'Trans-US Optical' },\n    { id: 'f2', origin: 'nyc', destination: 'lon', volume: 680, label: 'Transatlantic Core', tone: 'emerald' },\n    { id: 'f3', origin: 'lon', destination: 'sin', volume: 310, label: 'EMEA-APAC Relay' },\n    { id: 'f4', origin: 'sin', destination: 'tyo', volume: 520, label: 'East Asia Trunk' },\n    { id: 'f5', origin: 'tyo', destination: 'sfo', volume: 390, label: 'Transpacific Ring' },\n  ]}\n/>`,
  ],
};
