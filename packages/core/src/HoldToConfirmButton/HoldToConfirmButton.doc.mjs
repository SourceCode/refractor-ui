export const docs = {
  name: 'HoldToConfirmButton',
  displayName: 'Hold-to-Confirm Button',
  group: 'Complex Button & Action Variations',
  category: 'complex-buttons',
  keywords: [
    'hold',
    'confirm',
    'press',
    'long-press',
    'destructive',
    'safety',
    'button',
    'progress',
    'timer',
    'guard',
  ],
  usage: {
    description:
      'A high-consequence optical-glass confirmation button requiring a sustained pointer press or Space/Enter key hold until an internal refractive fill bar scales smoothly from 0% to 100%, transitioning into an emerald confirmed state with a Check icon and automatically resetting after a configurable cooldown.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use HoldToConfirmButton for irreversible actions like purging datasets, revoking API keys, or terminating production clusters where a single accidental click must never commit.',
      },
      {
        guidance: true,
        description:
          'Keep holdDurationMs between 1000ms and 2000ms for critical destructive operations so users can deliberately abort before completion without feeling sluggish.',
      },
      {
        guidance: false,
        description:
          'Use hold-to-confirm for routine, easily reversible actions like toggling filters or saving drafts; reserve it for guarded commitments.',
      },
    ],
    accessibility: [
      {
        name: 'Pointer & Keyboard Hold Parity',
        criterion: '2.1.1 Keyboard & 2.5.1 Pointer Gestures',
        requirement:
          'Supports sustained pointer press and Space/Enter hold (IME-safe, ignoring key repeat), cancelling cleanly on release, leave, cancel, keyUp, or blur',
        description:
          'Allows both pointer and keyboard operators to initiate and abort confirmation identically while guarding Enter handling against active IME composition.',
      },
      {
        name: 'Polite Live Status Announcements & Focus Visibility',
        criterion: '4.1.3 Status Messages & 2.4.7 Focus Visible',
        requirement: 'Companion sr-only role="status" aria-live="polite" region and prism-focus-ring',
        description:
          'Announces hold initiation, early cancellation, and confirmation transitions politely to assistive technology without mutating focus or polluting the button name.',
      },
    ],
  },
  props: [
    {
      name: 'label',
      type: 'string',
      defaultValue: 'required',
      description: 'Idle button label shown prior to pressing and holding.',
    },
    {
      name: 'holdingLabel',
      type: 'string',
      defaultValue: "'Hold to confirm...'",
      description: 'Label displayed while hold progress advances from 0% to 100%.',
    },
    {
      name: 'confirmedLabel',
      type: 'string',
      defaultValue: "'Confirmed'",
      description: 'Label shown alongside the emerald Check icon after hold completes.',
    },
    {
      name: 'holdDurationMs',
      type: 'number',
      defaultValue: '1200',
      description: 'Required hold duration in milliseconds, clamped cleanly to 200..5000.',
    },
    {
      name: 'onConfirm',
      type: '() => void',
      defaultValue: 'required',
      description: 'Callback invoked once when hold progress reaches 100%.',
    },
    {
      name: 'tone',
      type: "'destructive' | 'primary' | 'amber'",
      defaultValue: "'destructive'",
      description: 'Semantic optical glass token palette for border, text, and fill sweep.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all pointer and keyboard hold interactions.',
    },
    {
      name: 'resetAfterMs',
      type: 'number',
      defaultValue: '1800',
      description: 'Cooldown duration in milliseconds before the confirmed state resets to idle.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<HoldToConfirmButton\n  label="Hold to Purge Cluster"\n  holdingLabel="Keep holding to purge..."\n  confirmedLabel="Cluster Purged"\n  holdDurationMs={1200}\n  tone="destructive"\n  onConfirm={() => purgeCluster('prod-eu-west')}\n/>`,
  ],
};
