export const docs = {
  name: 'ReactiveInputShimmer',
  displayName: 'Reactive Input Shimmer',
  group: 'Dynamic Gradient & AI-Glow FX',
  category: 'gradient-ai-glow-fx',
  keywords: ['shimmer', 'input', 'light-sweep', 'prompt', 'autocomplete', 'focus', 'submit'],
  usage: {
    description:
      'Directional optical light sweep traveling across a frosted input field or AI prompt bar on focus, IME-safe submission, autocomplete acceptance, or imperative `shimmerTrigger` increments.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide domain-specific `suggestions` to pair tactile autocomplete feedback with a subtle one-shot optical sweep.',
      },
      {
        guidance: false,
        description:
          'Do not trigger continuous infinite sweeps on idle inputs; one-shot event-driven sweeps preserve calm focus and zero idle GPU draw.',
      },
    ],
    accessibility: [
      {
        name: 'IME-Safe Submission & Accessible Prompt Semantics',
        criterion: '2.1.1 Keyboard & 3.3.2 Labels or Instructions',
        requirement:
          'Pairs a screen-reader `<label>`, keyboard-only `.prism-focus-ring`, `!e.nativeEvent.isComposing` Enter guard, and reduced-motion pause.',
        description:
          'Ensures seamless keyboard, screen reader, and CJK IME usability.',
      },
    ],
  },
  props: [
    { name: 'value', type: 'string', defaultValue: 'undefined', description: 'Controlled text value.' },
    { name: 'defaultValue', type: 'string', defaultValue: "''", description: 'Uncontrolled initial text value.' },
    { name: 'suggestions', type: 'ReadonlyArray<string>', defaultValue: '3 prompt presets', description: 'Quick autocomplete chips that fill input and fire a sweep.' },
    { name: 'shimmerTrigger', type: 'number', defaultValue: '0', description: 'Increment to imperatively fire a directional shimmer sweep.' },
    { name: 'onSubmit', type: '(value: string) => void', defaultValue: 'undefined', description: 'Called on IME-safe Enter or submit click.' },
  ],
};
