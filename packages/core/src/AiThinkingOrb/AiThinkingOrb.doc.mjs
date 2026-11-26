export const docs = {
  name: 'AiThinkingOrb',
  displayName: 'AI Thinking Orb',
  group: 'Loaders, Skeletons & Data Transitions',
  category: 'loaders-skeletons-transitions',
  keywords: ['ai', 'orb', 'blob', 'morphing', 'thinking', 'reasoning', 'loader', 'shader'],
  usage: {
    description:
      'Smooth organic liquid morphing sphere powered by a WebGL metaball/harmonic orb shader with optical CSS fallback that pulses, stretches, and shifts semantic hue across `idle`, `listening`, `thinking`, `generating`, and `complete` agent states.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Bind directly to live AI turn status so users can distinguish listening, reasoning, streaming generation, and completion at a glance.',
      },
      {
        guidance: false,
        description:
          'Keep `showLabel` enabled or pair with clear live status text so meaning is never conveyed by motion or hue alone.',
      },
    ],
    accessibility: [
      {
        name: 'Polite Live Agent State & Reduced-Motion Support',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'Uses `role="status"`, `aria-live="polite"`, descriptive `aria-label`, and halts organic morphing automatically on `state="complete"`, `prefers-reduced-motion: reduce`, and `performanceMode="max"`.',
        description:
          'Keeps agent presence accessible, calm, and battery-friendly across desktop and mobile.',
      },
    ],
  },
  props: [
    { name: 'state', type: "'idle' | 'listening' | 'thinking' | 'generating' | 'complete'", defaultValue: "'thinking'", description: 'Agent lifecycle state modulating orb energy and hue.' },
    { name: 'sizePx', type: 'number', defaultValue: '68', description: 'Orb diameter in pixels (clamped 36–160).' },
    { name: 'label', type: 'string', defaultValue: 'State default label', description: 'Custom accessible status message.' },
    { name: 'showLabel', type: 'boolean', defaultValue: 'true', description: 'Displays status caption and state pill beneath the orb.' },
    { name: 'disableWebGL', type: 'boolean', defaultValue: 'false', description: 'Renders using pure CSS optical sphere fallback.' },
  ],
};
