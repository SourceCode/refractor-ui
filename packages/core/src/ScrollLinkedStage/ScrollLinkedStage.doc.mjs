export const docs = {
  name: 'ScrollLinkedStage',
  displayName: 'Scroll Linked Stage',
  group: 'Motion, Gestures & Scroll',
  category: 'motion-gestures-scroll',
  keywords: ['scroll', 'scroll-timeline', 'parallax', 'progress', 'sticky', 'blur'],
  usage: {
    description:
      'Hardware-accelerated scroll-linked container connecting container scroll progress directly to sticky glass blur intensity, reading progress bars, parallax depth offsets, and `--prism-scroll-progress` CSS tokens.',
    bestPractices: [
      {
        guidance: true,
        description: 'Pair with `useScrollProgress()` and `mapScrollRange()` to drive synchronized scrubbers or chapter indicators.',
      },
      {
        guidance: false,
        description: 'Keep `parallaxPx` modest (<= 32px) so inner content remains comfortable to read on small viewports.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Progressbar & Calm Parallax Disable',
        criterion: '2.3.3 Animation from Interactions',
        requirement:
          'Exposes `role="progressbar"` with live `aria-valuenow` and zeroes vertical parallax under `reducedMotion="calm"`.',
        description: 'Ensures scroll progress is readable by assistive tech without parallax motion.',
      },
    ],
  },
  props: [
    { name: 'title', type: 'string', defaultValue: "'Scroll-Linked Optical Stage'", description: 'Sticky optical header title.' },
    { name: 'maxBlurPx', type: 'number', defaultValue: '16', description: 'Maximum sticky header blur radius linked to scroll progress.' },
    { name: 'parallaxPx', type: 'number', defaultValue: '24', description: 'Vertical parallax travel in pixels.' },
    { name: 'viewportHeightPx', type: 'number', defaultValue: '240', description: 'Scrollable container height in pixels.' },
    { name: 'showProgressBar', type: 'boolean', defaultValue: 'true', description: 'Displays a scaleX scroll reading progress bar.' },
  ],
};
