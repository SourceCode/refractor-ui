export const docs = {
  name: 'MorphingMediaGallery',
  displayName: 'Morphing Media Gallery',
  group: 'Animated Media & Motion Tooling',
  category: 'animated-media-tooling',
  keywords: ['gallery', 'carousel', '3d', 'coverflow', '2d', 'detail', 'media', 'morph'],
  usage: {
    description:
      'Gesture- and keyboard-driven optical media container that smoothly morphs between `grid-2d`, `carousel-3d`, `coverflow-3d`, and `detail` arrangements.',
    bestPractices: [
      {
        guidance: true,
        description: 'Pair with `SharedLayoutProvider` or `AnimatePresence` when expanding gallery items into full-screen detail viewers.',
      },
      {
        guidance: false,
        description: 'Keep `grid-2d` accessible via the view switcher so users who prefer flat scanning can browse all items simultaneously.',
      },
    ],
    accessibility: [
      {
        name: 'Arrow Navigation, Escape Exit & Calm Flat Mode',
        criterion: '2.1.1 Keyboard & 2.3.3 Animation from Interactions',
        requirement:
          'Supports Left/Right arrows, Escape to exit detail view, `role="tablist"` mode switcher, and removes 3D perspective transforms under `reducedMotion="calm"`.',
        description: 'Ensures smooth navigation for keyboard and motion-sensitive users.',
      },
    ],
  },
  props: [
    { name: 'items', type: 'ReadonlyArray<GalleryMediaItem>', defaultValue: 'required', description: 'Media items displayed in the gallery.' },
    { name: 'viewMode', type: "'grid-2d' | 'carousel-3d' | 'coverflow-3d' | 'detail'", defaultValue: "'carousel-3d'", description: 'Active 2D/3D arrangement.' },
    { name: 'activeIndex', type: 'number', defaultValue: '0', description: 'Controlled focused item index.' },
    { name: 'onViewModeChange', type: '(mode: GalleryViewMode) => void', defaultValue: 'undefined', description: 'Fired when arrangement mode switches.' },
    { name: 'onActiveIndexChange', type: '(index: number) => void', defaultValue: 'undefined', description: 'Fired when active item changes.' },
  ],
};
