export const docs = {
  name: 'InteractiveMapViewer',
  displayName: 'Interactive Map Viewer',
  group: 'Media, Audio & Spatial Controls',
  category: 'media-spatial',
  keywords: [
    'map',
    'geo',
    'spatial',
    'pins',
    'clusters',
    'routes',
    'pan',
    'zoom',
    'topographic',
    'location',
  ],
  usage: {
    description:
      'Zoomable (0.75x-2.5x) and pointer-pannable optical-glass geographic canvas rendered over a studio grid and subtle topographic latitude/longitude contours. Supports single location pins, numbered cluster orbs, dashed optical route paths, floating crystal zoom/reset/telemetry HUD controls, and a dismissible optical slab pin details popup card.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Express pin coordinates in normalized 0..100 percentages so routes, topographic contours, and markers scale proportionally across responsive container widths.',
      },
      {
        guidance: true,
        description:
          'Use clusterCount (> 1) for dense geographic hubs so nearby markers collapse into high-contrast numbered cluster orbs.',
      },
      {
        guidance: false,
        description:
          'Pass raw HTML markup inside pin labels or descriptions; InteractiveMapViewer renders all strings strictly as literal text.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Viewport Zoom, Reset & Escape Dismissal',
        criterion: '2.1.1 Keyboard',
        requirement: 'Keyboard zoom (+/-/0), focusable pin buttons, and Escape popup dismissal',
        description:
          'The geographic canvas supports +/= to zoom in, -/_ to zoom out, 0 to reset view, native button activation on every pin and cluster orb, and Escape (guarded against IME composition) to dismiss the active pin popup card.',
      },
      {
        name: 'Pin Selection & Dialog Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'aria-pressed on pins, role="toolbar" HUD, and labelled role="dialog" popup',
        description:
          'Each interactive pin exposes its label, cluster count when applicable, and aria-pressed state, while selecting a pin opens a labelled dialog card with a dedicated Close button.',
      },
    ],
  },
  props: [
    {
      name: 'pins',
      type: 'ReadonlyArray<MapPin>',
      defaultValue: 'required',
      description: 'Geographic markers positioned in normalized 0..100 percentage coordinates.',
    },
    {
      name: 'routes',
      type: 'ReadonlyArray<MapRoute>',
      defaultValue: 'undefined',
      description: 'Optional dashed optical route paths linking valid pin IDs.',
    },
    {
      name: 'selectedPinId',
      type: 'string | null',
      defaultValue: 'undefined',
      description: 'Controlled identifier of the currently selected pin.',
    },
    {
      name: 'defaultSelectedPinId',
      type: 'string | null',
      defaultValue: 'null',
      description: 'Initial selected pin identifier in uncontrolled mode.',
    },
    {
      name: 'onSelectPin',
      type: '(pin: MapPin | null) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the selected pin or null when dismissed.',
    },
    {
      name: 'heightPx',
      type: 'number',
      defaultValue: '340',
      description: 'Canvas height in pixels, clamped safely to the 200..700px range.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<InteractiveMapViewer\n  pins={[\n    { id: 'sf', label: 'San Francisco Hub', category: 'Edge PoP', description: 'Primary Pacific optical relay.', x: 22, y: 44 },\n    { id: 'ny', label: 'New York Cluster', category: 'Region', x: 76, y: 38, clusterCount: 12 },\n  ]}\n  routes={[{ id: 'r1', fromPinId: 'sf', toPinId: 'ny', label: '64ms' }]}\n  defaultSelectedPinId="sf"\n/>`,
  ],
};
