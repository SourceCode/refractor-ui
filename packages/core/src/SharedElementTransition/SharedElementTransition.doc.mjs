export const docs = {
  name: 'SharedElementTransition',
  displayName: 'Shared Element Transition',
  group: 'Motion, Gestures & Scroll',
  category: 'motion-gestures-scroll',
  keywords: ['shared-element', 'layoutId', 'morph', 'tab-pill', 'modal-expand', 'motion'],
  usage: {
    description:
      'Morphs one glass component directly into another across state or view changes using a shared `layoutId` — ideal for sliding an active glass pill across tabs, expanding a card into a modal, or morphing a search bar into a command palette.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Wrap collaborating views in `<SharedLayoutProvider>` so layout snapshots remain isolated per workspace or demo.',
      },
      {
        guidance: false,
        description:
          'Ensure only one mounted element renders a given `layoutId` at a time during view transitions.',
      },
    ],
    accessibility: [
      {
        name: 'Reduced-Motion Continuity',
        criterion: '2.3.3 Animation from Interactions',
        requirement:
          'Switches to a gentle opacity cross-fade under `reducedMotion="calm"` so spatial morphing never triggers motion sensitivity.',
        description: 'Preserves state continuity without sweeping across-viewport transforms.',
      },
    ],
  },
  props: [
    { name: 'layoutId', type: 'string', defaultValue: 'required', description: 'Shared identifier linking departing and arriving elements.' },
    { name: 'borderRadiusPx', type: 'number', defaultValue: '14', description: 'Base border radius counter-scaled during the morph.' },
    { name: 'transitionToken', type: "'snap' | 'ui' | 'gentle' | 'lively' | 'ambient'", defaultValue: "'ui'", description: 'Semantic motion token governing spring physics.' },
  ],
};
