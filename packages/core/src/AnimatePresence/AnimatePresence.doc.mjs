export const docs = {
  name: 'AnimatePresence',
  displayName: 'Animate Presence',
  group: 'Motion, Gestures & Scroll',
  category: 'motion-gestures-scroll',
  keywords: ['presence', 'exit', 'unmount', 'toast', 'popover', 'sheet', 'motion'],
  usage: {
    description:
      'Retains unmounting keyed children in the DOM until their optical exit animation finishes, allowing toasts, popovers, context menus, and window sheets to smoothly dissolve or retract instead of snapping out.',
    bestPractices: [
      {
        guidance: true,
        description: 'Always assign stable `key` props to conditional children inside `<AnimatePresence>`.',
      },
      {
        guidance: false,
        description: 'Use `mode="wait"` when swapping two views sequentially so the exiting view clears before the entering view mounts.',
      },
    ],
    accessibility: [
      {
        name: 'Non-Interactive Exiting Elements',
        criterion: '2.3.3 Animation from Interactions',
        requirement:
          'Applies `pointer-events: none` to exiting wrappers and strips spatial scale/translate transforms under `reducedMotion="calm"`.',
        description: 'Prevents accidental clicks on dismissing overlays and respects motion sensitivity.',
      },
    ],
  },
  props: [
    { name: 'mode', type: "'sync' | 'wait' | 'popLayout'", defaultValue: "'sync'", description: 'Exit/enter sequencing strategy.' },
    { name: 'transitionToken', type: "'snap' | 'ui' | 'gentle' | 'lively' | 'ambient'", defaultValue: "'ui'", description: 'Semantic motion token governing exit timing.' },
    { name: 'exitDurationMs', type: 'number', defaultValue: 'Token duration', description: 'Explicit exit duration override in milliseconds.' },
    { name: 'onExitComplete', type: '() => void', defaultValue: 'undefined', description: 'Invoked once all exiting children finish unmounting.' },
  ],
};
