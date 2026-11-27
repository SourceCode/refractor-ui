export const docs = {
  name: 'SvgPathAnimator',
  displayName: 'SVG Path Animator',
  group: 'Animated Media & Motion Tooling',
  category: 'animated-media-tooling',
  keywords: ['svg', 'path', 'stroke', 'viewbox', 'checkmark', 'sparkline', 'ring', 'loader'],
  usage: {
    description:
      'Animates SVG stroke paths (`pathLength` / `stroke-dashoffset`) and `viewBox` coordinates for live checkmarks, circular progress rings, sparklines, and geometric optical loaders.',
    bestPractices: [
      {
        guidance: true,
        description: 'Drive `progress` from `0` to `1` for draw-in confirmations or bind it to live completion telemetry.',
      },
      {
        guidance: false,
        description: 'Provide a descriptive `label` whenever the animated vector communicates state such as upload success or loading progress.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Image Role & Contained SVG',
        criterion: '1.1.1 Non-text Content',
        requirement:
          'Exposes `role="img"` + `aria-label` on the wrapper, marks the inner `<svg>` decorative, and uses `prism-contain-box`.',
        description: 'Keeps vector animations accessible and paint-isolated.',
      },
    ],
  },
  props: [
    { name: 'preset', type: "'checkmark' | 'ring' | 'sparkline' | 'prism-loader'", defaultValue: "'checkmark'", description: 'Built-in vector path preset.' },
    { name: 'pathData', type: 'string', defaultValue: 'undefined', description: 'Optional custom SVG path d string.' },
    { name: 'progress', type: 'number', defaultValue: '1', description: 'Normalized draw progress [0..1].' },
    { name: 'viewBox', type: '[number, number, number, number]', defaultValue: '[0, 0, 100, 100]', description: 'SVG viewBox tuple.' },
    { name: 'strokeWidth', type: 'number', defaultValue: '4', description: 'Stroke thickness in SVG units.' },
    { name: 'sizePx', type: 'number', defaultValue: '84', description: 'Rendered square size in pixels.' },
  ],
};
