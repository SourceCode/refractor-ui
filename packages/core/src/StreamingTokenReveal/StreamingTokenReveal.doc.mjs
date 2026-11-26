export const docs = {
  name: 'StreamingTokenReveal',
  displayName: 'Streaming Token Reveal',
  group: 'Loaders, Skeletons & Data Transitions',
  category: 'loaders-skeletons-transitions',
  keywords: ['streaming', 'typewriter', 'tokens', 'ai-chat', 'reveal', 'fade-in', 'progressive'],
  usage: {
    description:
      'Progressive text-rendering wrapper that fades in newly streamed tokens or markdown blocks with a soft leading prismatic caret edge instead of jarring block jumps. Supports incremental stream appending, tab-visibility pause, instant `skipAnimation` / `prefers-reduced-motion`, and completion callbacks.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Append incoming SSE/WebSocket chunks directly to the `text` prop while keeping `streaming={true}` until the stream terminates.',
      },
      {
        guidance: false,
        description:
          'Never inject raw unescaped HTML into `text`; `StreamingTokenReveal` renders plain text tokens safely inside React text nodes.',
      },
    ],
    accessibility: [
      {
        name: 'Polite Live Region & Instant Reduced-Motion Reveal',
        criterion: '2.2.2 Pause, Stop, Hide & 4.1.3 Status Messages',
        requirement:
          'Wraps output in `role="region"` with `aria-live="polite"` and `aria-busy`, and reveals full text immediately without flicker when `prefers-reduced-motion: reduce` or `skipAnimation` is set.',
        description:
          'Prevents disorienting live-region churn while keeping streaming responses smooth and accessible.',
      },
    ],
  },
  props: [
    { name: 'text', type: 'string', defaultValue: 'required', description: 'Text content or incrementally growing stream buffer.' },
    { name: 'streaming', type: 'boolean', defaultValue: 'false', description: 'Keeps the soft leading edge caret visible while waiting for more tokens.' },
    { name: 'revealRateMs', type: 'number', defaultValue: '45', description: 'Milliseconds per token chunk reveal (clamped 16–300).' },
    { name: 'chunkSize', type: 'number', defaultValue: '1', description: 'Words revealed per tick (clamped 1–6).' },
    { name: 'skipAnimation', type: 'boolean', defaultValue: 'false', description: 'Reveals all text immediately.' },
    { name: 'onRevealComplete', type: '() => void', defaultValue: 'undefined', description: 'Fired once buffered tokens finish revealing.' },
  ],
};
