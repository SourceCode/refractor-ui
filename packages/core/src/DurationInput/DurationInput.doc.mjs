export const docs = {
  name: 'DurationInput',
  displayName: 'Duration Input',
  group: 'Date, Time & Scheduling Fields',
  category: 'date-time-scheduling',
  keywords: [
    'duration',
    'time',
    'interval',
    'timeout',
    'ttl',
    'sla',
    'hours',
    'minutes',
    'days',
    'seconds',
    'scheduling',
    'shorthand',
  ],
  usage: {
    description:
      'Optical-glass duration slab combining structured numeric segment wells (Days, Hours, Minutes, optional Seconds) with stepper buttons, a live canonical emerald summary pill, and a linear-time quick-shorthand parser input supporting expressions like "2h 30m" and "4d 12h".',
    bestPractices: [
      {
        guidance: true,
        description:
          'Configure showDays={false} for short-lived timeouts or meeting lengths so users edit hours and minutes directly without an unused Days segment.',
      },
      {
        guidance: true,
        description:
          'Set an explicit maxSeconds cap matching your backend SLA, cache TTL, or job retention limit so segment steppers and shorthand parsing clamp deterministically.',
      },
      {
        guidance: false,
        description:
          'Parse user duration strings with catastrophic-backtracking regular expressions; use the exported linear-time parseDurationString helper directly.',
      },
    ],
    accessibility: [
      {
        name: 'Programmatic Labels & Live Duration Status',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement: 'Explicit htmlFor label associations for each segment input and polite role="status" summary pill',
        description:
          'Associates every numeric segment input with its visible heading via useId(), provides descriptive Decrease/Increase button labels, and announces canonical duration updates politely via role="status".',
      },
      {
        name: 'IME-Safe Shorthand Submission & Validation Alerts',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 3.3.1 Error Identification',
        requirement: 'Guards Enter submission with !e.nativeEvent.isComposing, links invalid shorthand alerts via aria-describedby, and applies keyboard-only prism-focus-ring',
        description:
          'Prevents unintended shorthand submission during IME composition, announces malformed shorthand strings via role="alert" with aria-invalid="true", and keeps focus rings keyboard-only.',
      },
    ],
  },
  props: [
    {
      name: 'valueSeconds',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled duration value expressed in total seconds.',
    },
    {
      name: 'defaultValueSeconds',
      type: 'number',
      defaultValue: '9000',
      description: 'Initial duration in total seconds in uncontrolled mode (9000s = 2h 30m).',
    },
    {
      name: 'onChange',
      type: '(totalSeconds: number, parts: DurationParts) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired whenever the duration updates with clamped total seconds and decomposed { days, hours, minutes, seconds } parts.',
    },
    {
      name: 'showDays',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays the Days segment well when true; folds days into Hours when false.',
    },
    {
      name: 'showSeconds',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Displays the Seconds segment well and includes seconds in the canonical summary pill.',
    },
    {
      name: 'maxSeconds',
      type: 'number',
      defaultValue: '31536000',
      description: 'Maximum allowed duration in seconds used to clamp steppers, typed numbers, and shorthand input.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Duration'",
      description: 'Visible title rendered in the optical slab header.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all segment steppers, numeric fields, shorthand input, and Apply button.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<DurationInput\n  defaultValueSeconds={9000}\n  onChange={(totalSeconds, parts) => console.warn(totalSeconds, parts)}\n/>`,
    `<DurationInput\n  label="Cache TTL"\n  showDays={false}\n  showSeconds\n  maxSeconds={86400}\n  defaultValueSeconds={3645}\n/>`,
  ],
};
