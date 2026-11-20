export const docs = {
  name: 'Stepper',
  displayName: 'Stepper',
  group: 'Navigation',
  category: 'navigation',
  keywords: ['stepper', 'wizard', 'steps', 'progress', 'workflow', 'onboarding'],
  usage: {
    description:
      'Sequential multi-step indicator showing emerald completed badges, primary refractive current step highlight, and crystal upcoming steps with connecting tracks.',
    bestPractices: [
      { guidance: true, description: 'Use Stepper for linear 3-5 step workflows like onboarding, checkout, or deployment wizards.' },
      { guidance: true, description: 'Keep step titles concise (1-3 words) and put clarifying detail in subtitle.' },
      { guidance: false, description: 'Use Stepper for non-linear view switching; prefer PrismTabs instead.' },
    ],
    accessibility: [
      {
        name: 'Ordered step progression',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'Ordered list with aria-current="step"',
        description: 'Renders inside a semantic <ol> and marks the active step button with aria-current="step".',
      },
    ],
  },
  props: [
    { name: 'steps', type: 'StepDefinition[]', defaultValue: 'required', description: 'List of steps with id, title, and optional subtitle.' },
    { name: 'activeStepIndex', type: 'number', defaultValue: 'required', description: 'Zero-based active step index (clamped safely to 0..steps.length).' },
    { name: 'onStepClick', type: '(index: number) => void', defaultValue: 'undefined', description: 'Optional callback fired when a step button is clicked.' },
  ],
  examples: [
    `<Stepper\n  steps={[\n    { id: 'plan', title: 'Select Plan', subtitle: 'Pro tier' },\n    { id: 'keys', title: 'API Keys' },\n    { id: 'launch', title: 'Launch' },\n  ]}\n  activeStepIndex={1}\n  onStepClick={setStep}\n/>`,
  ],
};
