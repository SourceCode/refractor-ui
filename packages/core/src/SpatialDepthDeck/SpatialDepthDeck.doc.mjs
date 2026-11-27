export const docs = {
  name: 'SpatialDepthDeck',
  displayName: 'Spatial Depth Deck',
  group: 'Motion, Gestures & Scroll',
  category: 'motion-gestures-scroll',
  keywords: ['3d', 'perspective', 'depth-deck', 'spin-blur', 'deeper-elements', 'spatial'],
  usage: {
    description:
      'GPU-accelerated 3D perspective & spatial layering deck supporting `depth-deck`, `spin-blur`, and `deeper-elements` patterns with rAF-coalesced pointer tilt and keyboard cycling.',
    bestPractices: [
      {
        guidance: true,
        description: 'Use 3–5 concise layers so Z-depth stacking stays legible on mobile and desktop viewports.',
      },
      {
        guidance: false,
        description: 'Avoid placing dense scrolling forms inside tilted 3D layers; reserve for preview cards, windows, and spatial showcases.',
      },
    ],
    accessibility: [
      {
        name: 'Arrow-Key Cycling & Calm Flat Mode',
        criterion: '2.1.1 Keyboard & 2.3.3 Animation from Interactions',
        requirement:
          'Supports Left/Right/Up/Down arrow switching, `aria-pressed` state, and flattens 3D transforms under `reducedMotion="calm"`.',
        description: 'Full keyboard operability without motion discomfort.',
      },
    ],
  },
  props: [
    { name: 'layers', type: 'ReadonlyArray<SpatialDeckLayer>', defaultValue: 'required', description: 'Array of spatial glass cards to layer in 3D space.' },
    { name: 'pattern', type: "'depth-deck' | 'spin-blur' | 'deeper-elements'", defaultValue: "'depth-deck'", description: '3D spatial layering pattern.' },
    { name: 'activeIndex', type: 'number', defaultValue: '0', description: 'Controlled active front-layer index.' },
    { name: 'perspectivePx', type: 'number', defaultValue: '960', description: 'CSS perspective distance in pixels.' },
    { name: 'maxTiltDeg', type: 'number', defaultValue: '10', description: 'Maximum pointer-driven 3D tilt angle in degrees.' },
  ],
};
