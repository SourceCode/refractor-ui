export const docs = {
  name: 'ProductTour',
  displayName: 'Product Tour (Guided Coachmark)',
  group: 'Collaboration & Guidance',
  category: 'collaboration-guidance',
  keywords: [
    'tour',
    'onboarding',
    'coachmark',
    'walkthrough',
    'spotlight',
    'guide',
    'steps',
    'tooltip',
  ],
  usage: {
    description:
      'Optical glass multi-step onboarding coachmark with safe target spotlighting, controlled and uncontrolled open/step state, interactive progress dots, inline and overlay presentation modes, and full keyboard navigation.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep product tours concise (3 to 5 steps) and anchor each step to stable data-* or ID selectors so the optical spotlight frames the right control.',
      },
      {
        guidance: true,
        description:
          'Use mode="inline" inside sidebars, documentation sandboxes, or empty states when you want guided steps without a full-screen backdrop.',
      },
      {
        guidance: false,
        description:
          'Force users through unskippable tours; always preserve the Skip tour button and Escape dismissal unless an explicit blocking consent gate is required.',
      },
    ],
    accessibility: [
      {
        name: 'Accessible Coachmark Dialog & Live Step Announcements',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement: 'role="dialog", aria-labelledby, aria-describedby, aria-live="polite" step readout',
        description:
          'Links step headings and descriptions cleanly via generated IDs and announces step transitions politely to assistive technology.',
      },
      {
        name: 'Full Keyboard Walkthrough Controls',
        criterion: '2.1.1 Keyboard & 2.1.2 No Keyboard Trap',
        requirement: 'ArrowRight/ArrowLeft step navigation, Escape dismissal, interactive progress dots',
        description:
          'Supports IME-safe keyboard stepping with ArrowRight/ArrowLeft, Escape skip/dismissal when closeOnEscape is enabled, and keyboard-only prism-focus-ring outlines.',
      },
    ],
  },
  props: [
    {
      name: 'steps',
      type: 'readonly TourStep[]',
      defaultValue: 'required',
      description: 'Ordered list of onboarding steps with title, description, optional targetSelector, placement, badge, and actionLabel.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled open state for mounting or hiding the tour.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial open state when running uncontrolled.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the tour opens or closes.',
    },
    {
      name: 'stepIndex',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled zero-based step index (clamped safely to 0..steps.length-1).',
    },
    {
      name: 'defaultStepIndex',
      type: 'number',
      defaultValue: '0',
      description: 'Initial zero-based step index in uncontrolled mode.',
    },
    {
      name: 'onStepChange',
      type: '(index: number, step: TourStep) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the active step changes.',
    },
    {
      name: 'onComplete',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback fired when the user clicks Finish on the final step.',
    },
    {
      name: 'onSkip',
      type: '(atIndex: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the current step index when the tour is skipped or closed.',
    },
    {
      name: 'mode',
      type: "'overlay' | 'inline'",
      defaultValue: "'overlay'",
      description: 'Renders as a spotlighted fixed overlay or an inline optical glass slab card.',
    },
    {
      name: 'showProgressDots',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays clickable step indicator dots inside the coachmark card.',
    },
    {
      name: 'closeOnEscape',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Allows pressing Escape to skip and dismiss the tour.',
    },
    {
      name: 'nextLabel',
      type: 'string',
      defaultValue: "'Next'",
      description: 'Button label for advancing to the next step.',
    },
    {
      name: 'backLabel',
      type: 'string',
      defaultValue: "'Back'",
      description: 'Button label for returning to the previous step.',
    },
    {
      name: 'finishLabel',
      type: 'string',
      defaultValue: "'Finish'",
      description: 'Button label for completing the tour on the final step.',
    },
    {
      name: 'skipLabel',
      type: 'string',
      defaultValue: "'Skip tour'",
      description: 'Button label for skipping the walkthrough.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ProductTour\n  defaultOpen\n  steps={[\n    { id: 'theme', title: 'Tune Optical Refraction', description: 'Switch between Alabaster, Obsidian, and Amethyst presets live.', targetSelector: '#theme-switcher', placement: 'bottom', badge: 'New in v1.6' },\n    { id: 'presence', title: 'Collaborate in Real Time', description: 'Inspect active teammates and live cursors directly on the stage.', targetSelector: '#presence-bar', placement: 'left' },\n    { id: 'ship', title: 'Export Production Tokens', description: 'Copy generated CSS variables or swizzle any component cleanly.', placement: 'center', actionLabel: 'Start Building' },\n  ]}\n  onComplete={markTourComplete}\n  onSkip={trackTourSkip}\n/>`,
  ],
};
