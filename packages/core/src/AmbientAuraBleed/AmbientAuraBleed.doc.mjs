export const docs = {
  name: 'AmbientAuraBleed',
  displayName: 'Ambient Aura Bleed',
  group: 'Dynamic Gradient & AI-Glow FX',
  category: 'gradient-ai-glow-fx',
  keywords: ['aura', 'ambient-bleed', 'antigravity', 'bloom', 'glow', 'elevation', 'depth'],
  usage: {
    description:
      'Soft floating light bloom anchored beneath elevated optical cards or active AI controls that gently drifts and breathes to reinforce weightlessness and physical depth.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Anchor beneath hero AI command palettes, elevated floating docks, or featured KPI cards to create tactile depth separation.',
      },
      {
        guidance: false,
        description:
          'Avoid placing `AmbientAuraBleed` on every item inside dense 100-row tables; reserve ambient floor blooms for focal elevated surfaces.',
      },
    ],
    accessibility: [
      {
        name: 'Decorative Floor Glow & Reduced-Motion Safety',
        criterion: '2.3.3 Animation from Interactions',
        requirement:
          'Bloom layers carry `aria-hidden="true"` and `pointer-events-none`, and pause breathing automatically under `prefers-reduced-motion: reduce` and `performanceMode="max"`.',
        description:
          'Keeps floating depth subtle and non-distracting for all users.',
      },
    ],
  },
  props: [
    { name: 'tone', type: "'prism' | 'ai-violet' | 'emerald' | 'amber' | 'critical'", defaultValue: "'prism'", description: 'Semantic optical bloom palette.' },
    { name: 'intensity', type: 'number', defaultValue: '0.78', description: 'Bloom peak opacity (0–1.5).' },
    { name: 'elevation', type: "'sm' | 'md' | 'lg'", defaultValue: "'md'", description: 'Offset and footprint size beneath the wrapped element.' },
    { name: 'breathing', type: 'boolean', defaultValue: 'true', description: 'Enables gentle antigravity breathing drift.' },
    { name: 'active', type: 'boolean', defaultValue: 'true', description: 'Smoothly fades the bloom in or out.' },
  ],
};
