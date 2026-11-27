export const docs = {
  name: 'LayoutMotionBox',
  displayName: 'Layout Motion Box',
  group: 'Motion, Gestures & Scroll',
  category: 'motion-gestures-scroll',
  keywords: ['motion', 'flip', 'layout', 'scale-corrected', 'border-radius', 'spring', 'glass'],
  usage: {
    description:
      'Smoothly animates changes in size, position, flex/grid order, and alignment using compositor FLIP transforms while automatically counter-scaling border-radius and elevation box-shadow so thick glass pills and cards never distort mid-transition.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass a `layoutDependency` value (such as active alignment or expanded boolean) to trigger crisp FLIP transitions on container state changes.',
      },
      {
        guidance: false,
        description:
          'Avoid pairing with CSS `transition-all`; `LayoutMotionBox` drives compositor-only transforms via `animateHybrid`.',
      },
    ],
    accessibility: [
      {
        name: 'Calm Reduced-Motion Support',
        criterion: '2.3.3 Animation from Interactions',
        requirement:
          'Automatically disables spatial FLIP transforms under `MotionConfigProvider` `reducedMotion="calm"` or OS `prefers-reduced-motion: reduce`, falling back to subtle opacity transitions.',
        description: 'Prevents vestibular discomfort while preserving optical polish.',
      },
    ],
  },
  props: [
    { name: 'animateLayout', type: 'boolean', defaultValue: 'true', description: 'Enables scale-corrected FLIP layout animations.' },
    { name: 'layoutDependency', type: 'string | number | boolean', defaultValue: 'undefined', description: 'Value that triggers a FLIP measurement when changed.' },
    { name: 'borderRadiusPx', type: 'number', defaultValue: '16', description: 'Base border-radius in pixels counter-scaled during transitions.' },
    { name: 'shadowElevationPx', type: 'number', defaultValue: '16', description: 'Elevation shadow depth counter-scaled during transitions.' },
    { name: 'transitionToken', type: "'snap' | 'ui' | 'gentle' | 'lively' | 'ambient'", defaultValue: "'ui'", description: 'Semantic motion token from motion.theme.ts.' },
  ],
};
