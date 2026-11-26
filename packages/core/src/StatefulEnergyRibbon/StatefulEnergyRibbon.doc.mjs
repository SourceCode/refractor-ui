export const docs = {
  name: 'StatefulEnergyRibbon',
  displayName: 'Stateful Energy Ribbon',
  group: 'Dynamic Gradient & AI-Glow FX',
  category: 'gradient-ai-glow-fx',
  keywords: ['ribbon', 'energy-bar', 'hairline', 'status', 'ai-state', 'listening', 'thinking', 'streaming'],
  usage: {
    description:
      'Slim animated optical gradient hairline anchored to the top or bottom edge of a window, toolbar, or prompt card that dynamically shifts speed and token hue to communicate `idle`, `listening`, `thinking`, `streaming`, `success`, or `error` states.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Anchor with `position="top"` or `position="bottom"` inside relative toolbars, window titlebars, or chat headers to communicate real-time agent status without consuming vertical height.',
      },
      {
        guidance: false,
        description:
          'Avoid relying on ribbon color alone for critical errors; enable `showLabel` or pair with accessible text status.',
      },
    ],
    accessibility: [
      {
        name: 'Polite Live Status Announcements & Motion Pause',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'Exposes `role="status"` with `aria-live="polite"` and descriptive `aria-label` (plus optional visible `showLabel`), and pauses animation cleanly under `paused`, `prefers-reduced-motion: reduce`, and `performanceMode="max"`.',
        description:
          'Guarantees assistive technologies and colorblind users perceive state transitions immediately.',
      },
    ],
  },
  props: [
    { name: 'state', type: "'idle' | 'listening' | 'thinking' | 'streaming' | 'success' | 'error'", defaultValue: "'idle'", description: 'Semantic operational state controlling flow cadence and palette.' },
    { name: 'position', type: "'top' | 'bottom' | 'inline'", defaultValue: "'inline'", description: 'Edge anchoring mode.' },
    { name: 'thicknessPx', type: 'number', defaultValue: '3', description: 'Hairline height in pixels (clamped 2–8).' },
    { name: 'showLabel', type: 'boolean', defaultValue: 'false', description: 'Renders visible status text and state badge.' },
    { name: 'paused', type: 'boolean', defaultValue: 'false', description: 'Pauses animated ribbon motion.' },
  ],
};
