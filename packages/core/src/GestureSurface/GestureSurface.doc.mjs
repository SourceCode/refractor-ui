export const docs = {
  name: 'GestureSurface',
  displayName: 'Gesture Surface',
  group: 'Motion, Gestures & Scroll',
  category: 'motion-gestures-scroll',
  keywords: ['gesture', 'hover', 'tap', 'drag', 'momentum', 'touch', 'keyboard'],
  usage: {
    description:
      'Cross-device interactive optical surface unifying touch-safe hover, pointer + keyboard tap, focus, and momentum-throwing drag without sticky mobile hover states.',
    bestPractices: [
      {
        guidance: true,
        description: 'Provide `dragBounds` when enabling `draggable` so thrown glass tiles settle cleanly inside their workspace.',
      },
      {
        guidance: false,
        description: 'Do not nest native `<button>` controls directly inside a clickable `GestureSurface` without stopping event propagation.',
      },
    ],
    accessibility: [
      {
        name: 'Full Keyboard Press & Prismatic Focus',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Supports IME-safe Enter/Space activation, `aria-disabled`, and high-contrast `.prism-focus-prismatic` keyboard focus rings.',
        description: 'Delivers identical tactile response for keyboard, mouse, and touch users.',
      },
    ],
  },
  props: [
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables all gesture recognizers.' },
    { name: 'draggable', type: 'boolean', defaultValue: 'false', description: 'Enables drag with velocity-based momentum throwing.' },
    { name: 'dragBounds', type: 'DragBounds', defaultValue: 'undefined', description: 'Optional minX/maxX/minY/maxY bounds in pixels.' },
    { name: 'momentumFactor', type: 'number', defaultValue: '0.22', description: 'Momentum throw decay factor [0..1].' },
    { name: 'onTap', type: '() => void', defaultValue: 'undefined', description: 'Fired on tap or Enter/Space press.' },
  ],
};
