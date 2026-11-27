export const docs = {
  name: 'SplitTextReveal',
  displayName: 'Split Text Reveal',
  group: 'Animated Media & Motion Tooling',
  category: 'animated-media-tooling',
  keywords: ['split-text', 'typography', 'reveal', 'mask', 'headline', 'resize-observer'],
  usage: {
    description:
      'Breaks headlines or labels into `words`, `chars`, or `lines` segments with masked reveal sweeps that automatically adapt via `ResizeObserver` when containers resize.',
    bestPractices: [
      {
        guidance: true,
        description: 'Use `splitBy="words"` for multi-line headlines and `splitBy="chars"` for short hero badges or KPI labels.',
      },
      {
        guidance: false,
        description: 'Do not split long paragraphs by character; keep segmented text concise for smooth compositor performance.',
      },
    ],
    accessibility: [
      {
        name: 'Single-Read ARIA Label & Calm Fade',
        criterion: '1.3.1 Info and Relationships & 2.3.3 Animation from Interactions',
        requirement:
          'Exposes the intact string via `aria-label` while marking decorative segments `aria-hidden="true"`, and disables vertical sweep under `reducedMotion="calm"`.',
        description: 'Prevents screen readers from spelling out individual word/character spans.',
      },
    ],
  },
  props: [
    { name: 'text', type: 'string', defaultValue: 'required', description: 'Text content to segment and reveal.' },
    { name: 'splitBy', type: "'words' | 'chars' | 'lines'", defaultValue: "'words'", description: 'Segmentation mode.' },
    { name: 'revealed', type: 'boolean', defaultValue: 'true', description: 'Controls revealed vs masked state.' },
    { name: 'staggerMs', type: 'number', defaultValue: '28', description: 'Stagger delay per segment in milliseconds.' },
    { name: 'transitionToken', type: "'snap' | 'ui' | 'gentle' | 'lively' | 'ambient'", defaultValue: "'ui'", description: 'Semantic motion token.' },
  ],
};
