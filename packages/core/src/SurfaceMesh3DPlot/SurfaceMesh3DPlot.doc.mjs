export const docs = {
  name: 'SurfaceMesh3DPlot',
  displayName: '3D Surface & Mesh Plot',
  group: 'Scientific, Statistical & High-Dimensional Visuals',
  category: 'scientific-charts',
  keywords: [
    '3d',
    'surface',
    'mesh',
    'plot',
    'scientific',
    'topography',
    'elevation',
    'isometric',
    'orthographic',
    'wireframe',
    'shaded',
    'sinc',
    'orbit',
    'painters-algorithm',
  ],
  usage: {
    description:
      'Interactive optical-glass 3D surface and wireframe mesh visualizer inside a sculpted prism-slab card. Projects any 2D elevation grid (defaulting to a smooth 9×9 damped-sinc optical ripple) through exact 3D yaw and pitch rotation matrices with painter-algorithm back-to-front depth sorting, --prism-* semantic elevation shading (--prism-info-main valleys -> --prism-secondary-main mid -> --prism-primary-main peaks), Shaded/Wireframe switching, 0.7×..1.6× zoom controls, pointer-drag and IME-safe keyboard orbit, clickable facet inspection, and a recessed aria-live="polite" telemetry footer.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide rectangular 2D numeric grids of at least 2×2 samples so each quad facet projects smoothly with deterministic elevation ranges and accurate cell telemetry.',
      },
      {
        guidance: true,
        description:
          'Use Shaded mode to reveal macro peak/valley topography via semantic --prism-* optical depth tokens, and switch to Wireframe mode when inspecting steep occluding ridges or subtle saddle points.',
      },
      {
        guidance: false,
        description:
          'Pass grids smaller than 2×2 expecting empty SVG frames — SurfaceMesh3DPlot renders a clear role="status" empty state whenever fewer than 2 rows or 2 columns are supplied.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard 3D Camera Orbit & Facet Selection',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Focusable role="application" stage supports IME-safe ArrowLeft/ArrowRight (±10° yaw), ArrowUp/ArrowDown (±5° pitch), and 0 (reset view); each quad facet exposes role="button", aria-pressed, descriptive row/col/elevation aria-label, IME-safe Enter/Space selection, and keyboard-only .prism-focus-ring outlines.',
        description:
          'Ensures full 3D camera orbiting, zoom control, render-style toggling, and individual quad inspection without requiring pointer gestures.',
      },
      {
        name: 'Polite 3D Camera & Elevation Telemetry',
        criterion: '4.1.3 Status Messages',
        requirement:
          'A recessed prism-well footer with role="status" and aria-live="polite" announces Yaw, Pitch, Zoom, Z Range (min..max), and Active Cell (r, c, z).',
        description:
          'Communicates orbit angle adjustments, zoom magnification, and selected cell elevations to assistive technologies without stealing focus.',
      },
    ],
  },
  props: [
    {
      name: 'grid',
      type: 'ReadonlyArray<ReadonlyArray<number>>',
      defaultValue: 'DEFAULT_SURFACE_GRID (9×9 damped-sinc ripple)',
      description:
        '2D z[row][col] elevation matrix projected into 3D quad facets. Displays a clean role="status" empty state when smaller than 2×2.',
    },
    {
      name: 'defaultYawDeg',
      type: 'number',
      defaultValue: '38',
      description: 'Initial camera yaw orbit angle in degrees, clamped safely to -180..180.',
    },
    {
      name: 'defaultPitchDeg',
      type: 'number',
      defaultValue: '30',
      description: 'Initial camera pitch tilt angle in degrees, clamped safely to 10..80.',
    },
    {
      name: 'renderStyle',
      type: "'shaded' | 'wireframe'",
      defaultValue: 'undefined',
      description: 'Controlled surface mesh rendering style.',
    },
    {
      name: 'defaultRenderStyle',
      type: "'shaded' | 'wireframe'",
      defaultValue: "'shaded'",
      description: 'Initial uncontrolled surface mesh rendering style.',
    },
    {
      name: 'onRenderStyleChange',
      type: "(style: 'shaded' | 'wireframe') => void",
      defaultValue: 'undefined',
      description: 'Optional callback fired when the user switches between Shaded and Wireframe.',
    },
    {
      name: 'zUnit',
      type: 'string',
      defaultValue: "'dB'",
      description: 'Unit suffix displayed alongside Z Range and Active Cell elevation values.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'3D Surface & Mesh Plot'",
      description: 'Visible card heading linked to the root region via aria-labelledby.',
    },
    {
      name: 'onSelectCell',
      type: '(cell: SurfaceMeshCell) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with { row, col, z, normalizedZ } when a quad facet is clicked or keyboard-activated.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<SurfaceMesh3DPlot\n  title="Optical Resonator Gain Field"\n  zUnit="dB"\n  defaultYawDeg={42}\n  defaultPitchDeg={32}\n  onSelectCell={(cell) => console.warn(cell.row, cell.col, cell.z)}\n/>`,
    `<SurfaceMesh3DPlot\n  title="Thermal Dissipation Mesh"\n  defaultRenderStyle="wireframe"\n  zUnit="°C"\n  grid={[\n    [18, 22, 24, 19],\n    [21, 34, 38, 25],\n    [20, 32, 36, 23],\n    [17, 20, 22, 18],\n  ]}\n/>`,
  ],
};

export default docs;
