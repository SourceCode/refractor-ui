export const docs = {
  name: 'OtpCodeInput',
  displayName: 'OTP Code Input',
  group: 'Security, Auth & Account Management',
  category: 'security-auth',
  keywords: [
    'otp',
    'pin',
    'verification',
    'code',
    'mfa',
    '2fa',
    'totp',
    'auth',
    'security',
    'one-time-code',
  ],
  usage: {
    description:
      'Segmented optical-glass verification code input featuring recessed prism-well cells, controlled and uncontrolled state management, automatic focus progression, clipboard paste distribution with invalid-character stripping, Backspace rewind, arrow-key navigation, optional character masking, and accessible error alerts.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use the default numeric 6-cell configuration for standard TOTP authenticator apps and SMS verification codes so mobile keyboards automatically present numeric keypads and one-time-code autofill.',
      },
      {
        guidance: true,
        description:
          'Wire onComplete to validate or submit the verification code once all cells are populated, while keeping error feedback specific and actionable.',
      },
      {
        guidance: false,
        description:
          'Enable masked={true} on SMS or authenticator OTP codes unless shoulder-surfing risk explicitly requires concealed entry, as visible digits reduce entry mistakes.',
      },
    ],
    accessibility: [
      {
        name: 'Per-Cell Labels and Group Semantics',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement: 'role="group" with aria-labelledby and explicit per-cell aria-label readouts',
        description:
          'Groups all optical input wells under an accessible label and labels every cell individually as "Digit X of Y" (or "Character X of Y" when alphanumeric is enabled).',
      },
      {
        name: 'Keyboard Navigation, IME Safety & Error Alerts',
        criterion: '2.1.1 Keyboard & 3.3.1 Error Identification',
        requirement: 'ArrowLeft/ArrowRight/Backspace/Home/End navigation, isComposing guard, role="alert" errors',
        description:
          'Supports full keyboard traversal and deletion without trapping focus, guards keydown events during IME composition, and associates role="alert" validation errors via aria-describedby and aria-invalid.',
      },
    ],
  },
  props: [
    {
      name: 'length',
      type: 'number',
      defaultValue: '6',
      description: 'Number of verification code input cells, safely clamped between 4 and 8.',
    },
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled verification code string.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "''",
      description: 'Initial code value when used in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(code: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the sanitized verification code changes.',
    },
    {
      name: 'onComplete',
      type: '(code: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when all cells are filled with valid characters.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Verification code'",
      description: 'Visible group label associated with the OTP cell group.',
    },
    {
      name: 'alphanumeric',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Permits ASCII letters (A-Z, a-z) in addition to digits and sets inputMode="text".',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all cells and hides the clear button.',
    },
    {
      name: 'error',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Validation error message rendered inside a role="alert" status message.',
    },
    {
      name: 'masked',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Switches cell input elements to type="password" to conceal entered characters.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<OtpCodeInput\n  label="Authenticator code"\n  length={6}\n  onComplete={(code) => verifyTotp(code)}\n/>`,
    `<OtpCodeInput\n  label="Recovery pin"\n  length={8}\n  alphanumeric\n  masked\n  error="Code has expired. Request a new code."\n/>`,
  ],
};
