export const docs = {
  name: 'AiFocusRing',
  displayName: 'AI Focus Ring',
  group: 'Dynamic Gradient & AI-Glow FX',
  category: 'gradient-ai-glow-fx',
  keywords: ['ai', 'focus-ring', 'orbiting-border', 'conic-gradient', 'glow', 'prompt', 'processing'],
  usage: {
    description:
      'Rotating conic-gradient perimeter that wraps active prompt fields, agent cards, or selected panels with a fluid multi-hue glow when focused, active, or processing. Powered by compositor-only `transform: rotate()` keyframes with automatic `prefers-reduced-motion` and `performanceMode="max"` pauses.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Enable `processing` while an AI agent is reasoning or streaming to increase orbital cadence and glow intensity without shifting layout geometry.',
      },
      {
        guidance: false,
        description:
          'Do not remove native keyboard `:focus-visible` indicators on interactive children; `AiFocusRing` complements semantic focus states.',
      },
    ],
    accessibility: [
      {
        name: 'Non-Obstructive Focus Wrapper & Reduced-Motion Compliance',
        criterion: '2.3.3 Animation from Interactions & 2.4.7 Focus Visible',
        requirement:
          'Orbiting border layers carry `aria-hidden="true"` and `pointer-events-none` and automatically pause under `prefers-reduced-motion: reduce`.',
        description:
          'Protects vestibular-sensitive users while clearly indicating active AI prompt or panel focus.',
      },
    ],
  },
  props: [
    { name: 'active', type: 'boolean', defaultValue: 'false', description: 'Forces the orbiting border visible even without child focus.' },
    { name: 'processing', type: 'boolean', defaultValue: 'false', description: 'Accelerates orbital rotation and intensifies ambient outer glow.' },
    { name: 'palette', type: "'ai-spectrum' | 'cobalt-amber' | 'emerald-cyan' | 'rose-violet'", defaultValue: "'ai-spectrum'", description: 'Conic-gradient spectrum preset.' },
    { name: 'thicknessPx', type: 'number', defaultValue: '2', description: 'Border thickness in pixels (clamped 1–6).' },
    { name: 'speedSeconds', type: 'number', defaultValue: '3.2', description: 'Orbit period in seconds (clamped 0.8–12).' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables orbiting illumination.' },
  ],
};
