export const docs = {
  name: 'PasswordStrengthMeter',
  displayName: 'Password Strength Meter',
  group: 'Security, Auth & Account Management',
  category: 'security-auth',
  keywords: [
    'password',
    'strength',
    'meter',
    'security',
    'auth',
    'account',
    'checklist',
    'entropy',
    'validation',
    'credential',
  ],
  usage: {
    description:
      'Optical-glass password policy evaluation slab that performs a single linear O(n) character-code scan (zero regex backtracking) across five security criteria, renders a four-segment semantic progress bar with a polite live strength badge, and displays an optional recessed requirement checklist.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep minLength at 12 or higher for primary account credentials and pair PasswordStrengthMeter directly below a TextInput type="password" field.',
      },
      {
        guidance: true,
        description:
          'Keep showChecklist={true} during account signup and password rotation so users immediately see which specific criteria remain unmet.',
      },
      {
        guidance: false,
        description:
          'Block paste into password fields or impose low maximum lengths; PasswordStrengthMeter evaluates arbitrarily long passphrases in O(n) time without ReDoS risk.',
      },
    ],
    accessibility: [
      {
        name: 'Progressbar Semantics & Live Announcements',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement: 'role="progressbar" with aria-valuemin/max/now/valuetext and aria-live="polite" strength badge',
        description:
          'Exposes the numeric 0–4 score through role="progressbar" bound to the visible heading and announces strength level transitions politely via aria-live="polite".',
      },
      {
        name: 'Non-Color Requirement Indicators',
        criterion: '1.4.1 Use of Color',
        requirement: 'Distinct CheckCircle2/Circle icons paired with screen-reader Met/Unmet text',
        description:
          'Never relies on color alone; each checklist rule pairs a distinct icon with screen-reader status prefixes and data-passed attributes.',
      },
    ],
  },
  props: [
    {
      name: 'password',
      type: 'string',
      defaultValue: 'required',
      description: 'Candidate password evaluated linearly via char-code checks.',
    },
    {
      name: 'minLength',
      type: 'number',
      defaultValue: '12',
      description: 'Minimum required password length, safely clamped between 6 and 64.',
    },
    {
      name: 'showChecklist',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Toggles the recessed optical well checklist of all 5 criteria.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Password strength'",
      description: 'Visible heading label linked to the progressbar via aria-labelledby.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<PasswordStrengthMeter\n  password={password}\n  minLength={12}\n  label="Account password strength"\n/>`,
    `<PasswordStrengthMeter\n  password={password}\n  minLength={16}\n  showChecklist={false}\n/>`,
  ],
};
