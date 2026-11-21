export const docs = {
  name: 'PointClusterMap',
  displayName: 'Point Cluster Map',
  group: 'Geospatial & Map Visuals',
  category: 'geospatial-charts',
  keywords: [
    'geospatial',
    'map',
    'cluster',
    'points',
    'markers',
    'pins',
    'coordinates',
    'latitude',
    'longitude',
    'equirectangular',
    'zoom',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass equirectangular geospatial point cluster map (640×320 SVG projection) featuring prototype-safe spatial grid clustering that dynamically splits dense clusters into individual tone-tinted pins as you zoom (1×..4×), stylized continental landmasses and graticule grid rendered exclusively via --prism-* tokens, optional category filter pills, and a recessed prism-well aria-live inspector.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide meaningful category strings and semantic ClusterMapTone values so users can filter geographic layers via header pills and distinguish regional markers at a glance.',
      },
      {
        guidance: true,
        description:
          'Tune clusterRadius (16..120px) to balance regional density at 1× zoom; clicking any cluster bubble automatically zooms in (+1× up to 4×), focuses on its centroid, and lists all member markers in the recessed inspector.',
      },
      {
        guidance: false,
        description:
          'Pass raw HTML markup in labels or categories or rely on hardcoded hex colors; PointClusterMap renders all metadata strictly as literal text and derives every landmass, graticule, pin, and cluster color from --prism-* CSS custom properties.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Pin & Cluster Exploration with Live Inspector',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Category filter pills expose aria-pressed, zoom buttons enforce disabled bounds, every pin and cluster bubble provides role="button", tabIndex={0}, IME-safe Enter/Space activation, Escape clearing, and descriptive coordinate aria-labels',
        description:
          'Keyboard and screen-reader users can filter categories, adjust map zoom, expand clusters into clickable member pills, inspect coordinates, and receive polite live-region announcements.',
      },
      {
        name: 'Non-Color Cluster & Pin Differentiation',
        criterion: '1.4.1 Use of Color',
        requirement:
          'Combines --prism-* semantic tones with distinct optical cluster halo + bold count badges, active selection rings, category labels, and explicit latitude/longitude readouts',
        description:
          'Ensures clusters, individual pins, and active selections remain legible across color-vision profiles and all Refractor light and dark optical themes.',
      },
    ],
  },
  props: [
    {
      name: 'points',
      type: 'GeoPoint[]',
      defaultValue: 'required',
      description:
        'Geographic points ({ id, label, lat, lng, category?, value?, tone? }) projected onto the 640×320 equirectangular map; non-finite coordinates and blank/duplicate IDs are safely filtered, and lat/lng are clamped to [-90, 90] and [-180, 180].',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Geospatial Point Cluster Map'",
      description: 'Card heading rendered in the header and linked to the SVG graphic.',
    },
    {
      name: 'defaultZoom',
      type: 'number',
      defaultValue: '1',
      description: 'Initial map zoom factor, safely clamped to [1, 4].',
    },
    {
      name: 'clusterRadius',
      type: 'number',
      defaultValue: '48',
      description:
        'Base SVG spatial clustering cell size in pixels at 1× zoom, clamped to [16, 120]; effective radius scales as clusterRadius / zoom.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '280',
      description: 'Rendered SVG viewport height in pixels, safely clamped to [180, 480].',
    },
    {
      name: 'onSelectPoint',
      type: '(point: GeoPoint) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when a singleton pin is activated or a cluster member pill is clicked in the inspector.',
    },
    {
      name: 'onSelectCluster',
      type: '(points: GeoPoint[]) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with all member GeoPoints when a numbered cluster bubble is clicked or activated via Enter/Space.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<PointClusterMap\n  title="Global Edge Telemetry"\n  height={300}\n  points={[\n    { id: 'nyc', label: 'New York PoP', lat: 40.71, lng: -74.01, category: 'Americas', value: 142, tone: 'primary' },\n    { id: 'chi', label: 'Chicago Relay', lat: 41.88, lng: -87.63, category: 'Americas', value: 98, tone: 'primary' },\n    { id: 'lon', label: 'London Core', lat: 51.51, lng: -0.13, category: 'EMEA', value: 164, tone: 'secondary' },\n    { id: 'tok', label: 'Tokyo Edge', lat: 35.68, lng: 139.69, category: 'APAC', value: 121, tone: 'emerald' },\n  ]}\n/>`,
  ],
};
