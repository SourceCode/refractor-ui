export const docs = {
  name: 'FluidMeshCanvas',
  displayName: 'Fluid Mesh Canvas',
  group: 'Dynamic Gradient & AI-Glow FX',
  category: 'gradient-ai-glow-fx',
  keywords: ['mesh', 'fluid', 'gradient', 'ambient', 'backdrop', 'webgl', 'canvas', 'cadence'],
  usage: {
    description:
      'Live, slowly morphing multi-point color mesh ambient backdrop positioned behind translucent glass panels. Powered by a DPR-capped, visibility-aware WebGL fragment shader with seamless token-driven CSS fallback, reacting to pointer hover, typing cadence, and semantic system moods (`calm`, `creative`, `thinking`, `alert`).',
    bestPractices: [
      {
        guidance: true,
        description:
          'Feed live prompt typing cadence (`0..1`) or agent state mood into `FluidMeshCanvas` to provide ambient visual feedback without triggering expensive DOM layout passes.',
      },
      {
        guidance: false,
        description:
          'Keep `intensity` subtle (`0.6–0.9`) behind text surfaces to guarantee strict WCAG 2.2 AA foreground legibility.',
      },
    ],
    accessibility: [
      {
        name: 'Reduced-Motion, Visibility Pause & Non-Interactive Backdrop',
        criterion: '2.2.2 Pause, Stop, Hide & 2.3.3 Animation from Interactions',
        requirement:
          'Canvas and CSS mesh layers are marked `aria-hidden="true"` and automatically pause offscreen, in hidden tabs, under `prefers-reduced-motion: reduce`, and in `performanceMode="max"`.',
        description:
          'Prevents distraction and unnecessary GPU utilization while preserving foreground contrast.',
      },
    ],
  },
  props: [
    { name: 'mood', type: "'calm' | 'creative' | 'thinking' | 'alert'", defaultValue: "'creative'", description: 'Ambient palette & motion energy preset.' },
    { name: 'cadence', type: 'number', defaultValue: '0.35', description: 'Live interaction/typing cadence multiplier (0–1).' },
    { name: 'intensity', type: 'number', defaultValue: '0.85', description: 'Backdrop intensity (0–1.5).' },
    { name: 'animated', type: 'boolean', defaultValue: 'true', description: 'Toggles continuous mesh morphing.' },
    { name: 'disableWebGL', type: 'boolean', defaultValue: 'false', description: 'Forces lightweight CSS gradient backdrop mode.' },
  ],
};
