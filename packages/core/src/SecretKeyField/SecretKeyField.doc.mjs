export const docs = {
  name: 'SecretKeyField',
  displayName: 'Secret Key Field',
  group: 'Security, Auth & Account Management',
  category: 'security-auth',
  keywords: [
    'secret',
    'api',
    'key',
    'token',
    'credential',
    'mask',
    'reveal',
    'copy',
    'rotate',
    'security',
    'auth',
  ],
  usage: {
    description:
      'Optical-glass credential card for displaying API keys and bearer tokens inside a recessed monospace well with configurable prefix/suffix masking, reveal/hide visibility toggle, one-click clipboard copy with transient emerald confirmation, optional key rotation action, and polite screen-reader status announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep defaultRevealed={false} so API secrets stay masked against shoulder-surfing until an operator explicitly reveals them.',
      },
      {
        guidance: true,
        description:
          'Pair onRotate with a confirmation flow or grace-period notice in helperText so teams know when previously issued credentials expire.',
      },
      {
        guidance: false,
        description:
          'Render raw HTML or inject secret values via innerHTML; SecretKeyField always renders literal monospace text and masks short values with bullets.',
      },
    ],
    accessibility: [
      {
        name: 'Toggle Press State & Keyboard Focus Parity',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'Native buttons with aria-pressed on Reveal/Hide, prism-focus-ring, disabled:cursor-not-allowed',
        description:
          'Exposes live reveal state via aria-pressed on the Reveal/Hide toggle button, applies keyboard-only prism-focus-ring styling, and disables reveal and copy cleanly when unconfigured or disabled.',
      },
      {
        name: 'Polite Credential Action Announcements',
        criterion: '4.1.3 Status Messages',
        requirement: 'role="status" aria-live="polite" aria-atomic="true" live region',
        description:
          'Announces reveal, hide, clipboard copy confirmation, and key rotation requests politely without moving keyboard focus away from the active control.',
      },
    ],
  },
  props: [
    {
      name: 'label',
      type: 'string',
      defaultValue: "'API Secret Key'",
      description: 'Visible heading label displayed above the recessed monospace credential well.',
    },
    {
      name: 'value',
      type: 'string',
      defaultValue: 'required',
      description: 'Full secret credential string to mask, reveal, and copy to clipboard.',
    },
    {
      name: 'visiblePrefixChars',
      type: 'number',
      defaultValue: '6',
      description: 'Number of leading characters shown while masked (clamped between 0 and 16).',
    },
    {
      name: 'visibleSuffixChars',
      type: 'number',
      defaultValue: '4',
      description: 'Number of trailing characters shown while masked (clamped between 0 and 16).',
    },
    {
      name: 'defaultRevealed',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Controls whether the secret starts visible in uncontrolled mode.',
    },
    {
      name: 'onCopy',
      type: '(value: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the full secret value whenever Copy is clicked.',
    },
    {
      name: 'onRotate',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional callback that renders and handles the Rotate key action button.',
    },
    {
      name: 'helperText',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional security guidance or rotation schedule text rendered beneath the well.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables reveal, copy, and rotate action buttons.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<SecretKeyField\n  label="Production API Secret Key"\n  value="rf_demo_9f8e7d6c5b4a3210fedcba9876"\n  visiblePrefixChars={8}\n  visibleSuffixChars={4}\n  helperText="Rotate every 90 days. Previous keys remain valid for 15 minutes."\n  onCopy={(secret) => auditLogCopy(secret.length)}\n  onRotate={() => openRotateDialog()}\n/>`,
  ],
};
