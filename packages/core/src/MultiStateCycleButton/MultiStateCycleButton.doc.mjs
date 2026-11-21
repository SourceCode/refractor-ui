export const docs = {
  name: 'MultiStateCycleButton',
  displayName: 'Multi-State Cycle Button',
  group: 'Complex Button & Action Variations',
  category: 'complex-buttons',
  keywords: [
    'button',
    'cycle',
    'multi-state',
    'toggle',
    'stepper',
    'mode',
    'repeat',
    'sort',
    'dots',
    'crystal',
  ],
  usage: {
    description:
      'Optical crystal pill button that cycles sequentially through an ordered array of discrete states (such as sort orders, playback repeat modes, or density presets), reflecting each state with semantic --prism-* tone accents, optional icons, step-indicator dots, and polite screen-reader announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Limit cycle lists to 2–5 closely related states so users can reach any target mode in a few clicks.',
      },
      {
        guidance: true,
        description:
          'Keep showStepDots enabled when cycling through 3 or more modes so users can immediately see their position in the sequence.',
      },
      {
        guidance: false,
        description:
          'Use MultiStateCycleButton for long lists of 6+ options; choose DropdownSelect or SegmentedControl instead.',
      },
    ],
    accessibility: [
      {
        name: 'Polite state announcements',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement: 'sr-only aria-live="polite" announcement reflecting active label and step position',
        description:
          'Announces each cycled state and its 1-based position in the sequence via a visually hidden polite status region without polluting the button accessible name.',
      },
      {
        name: 'Keyboard-only focus rings & disabled parity',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement: 'prism-focus-ring (:focus-visible), IME composition guard, disabled:cursor-not-allowed',
        description:
          'Supports native button keyboard activation with IME composition safety, clear keyboard-only focus outlines, and disabled hover/cursor suppression.',
      },
    ],
  },
  props: [
    {
      name: 'states',
      type: 'CycleButtonStateOption[]',
      defaultValue: 'required',
      description: 'Ordered array of cycle options ({ id, label, icon?, tone? }).',
    },
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled active state id; when omitted, state is managed via useControllableState.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "states[0]?.id ?? ''",
      description: 'Initial active state id in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(nextId: string, option: CycleButtonStateOption, nextIndex: number) => void',
      defaultValue: 'undefined',
      description: 'Fired on click with the next state id, full option object, and wrapped index.',
    },
    {
      name: 'showStepDots',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays optical step-indicator dots reflecting the active index.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables cycling interaction and dims the optical surface.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<MultiStateCycleButton\n  states={[\n    { id: 'off', label: 'Repeat Off', tone: 'neutral' },\n    { id: 'all', label: 'Repeat All', tone: 'secondary' },\n    { id: 'one', label: 'Repeat One', tone: 'emerald' },\n  ]}\n  defaultValue="off"\n  onChange={(nextId) => setRepeatMode(nextId)}\n/>`,
  ],
};
