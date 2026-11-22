export const docs = {
  name: 'LockScreenOverlay',
  displayName: 'Lock Screen Overlay',
  group: 'Hardware HUDs & System Overlays',
  category: 'hardware-huds-overlays',
  keywords: [
    'lock-screen',
    'overlay',
    'hud',
    'authentication',
    'password',
    'pin',
    'user-switcher',
    'avatar',
    'guest',
    'power',
    'sleep',
    'restart',
    'shutdown',
    'security',
  ],
  usage: {
    description:
      'Frosted-glass OS lock screen barrier rendered inside a sculpted `prism-slab` surface. Displays a large tabular clock and date header, an accessible user avatar switcher (`role="radiogroup"` with circular `--prism-primary-main` active halos), an authentication form with Show/Hide password visibility toggle, IME-safe `Enter` submission, and passwordless `Enter Guest Session` support, plus bottom quick power controls (`Sleep`, `Restart`, `Shut Down`) and polite `aria-live="polite"` status announcements. In `mode="inline"`, unlocking reveals a clean confirmation bar with a `Lock Screen` button to re-lock interactively; in `mode="fullscreen"`, unlocking returns `null` to clear the viewport barrier.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `mode="fullscreen"` paired with controlled `locked` and `onLockChange` for full-viewport OS or kiosk session barriers, and `mode="inline"` for embedded security previews, demos, or workspace lock cards.',
      },
      {
        guidance: true,
        description:
          'Validate submitted credentials inside `onUnlock(user, credential)` and return `false` to reject invalid credentials without unlocking; `LockScreenOverlay` keeps credentials strictly in ephemeral component memory and clears them immediately on account switch or successful unlock.',
      },
      {
        guidance: false,
        description:
          'Persist or log raw passwords from `onUnlock` in client-side storage or console output; hand credentials directly to your authentication transport and clear references promptly.',
      },
    ],
    accessibility: [
      {
        name: 'User Account Radiogroup, Password Input & Modal Barrier Semantics',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Uses `role="radiogroup"` (`aria-label="Select user account"`) with roving-tabindex `role="radio"` avatar buttons reflecting `aria-checked`, an explicitly labeled `<input type="password" aria-label="Password or PIN">` paired with `aria-invalid`/`aria-describedby` and a `role="alert"` error message, and wraps `mode="fullscreen"` inside `role="dialog" aria-modal="true"`',
        description:
          'Allows assistive technologies to identify active accounts, navigate user avatars via arrow keys, read inline validation errors, and understand fullscreen modal scope.',
      },
      {
        name: 'IME-Safe Submission, Keyboard-Only Focus Rings & Polite Status Updates',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards keyboard `Enter` unlock and radiogroup arrow navigation with `!event.nativeEvent.isComposing`, applies `.prism-focus-ring` (`:focus-visible`) to all interactive controls, and broadcasts account switches, failed unlock attempts, unlock/re-lock transitions, and power requests to an `aria-live="polite"` status region',
        description:
          'Prevents CJK/IME composition commits from accidentally submitting partial passwords while delivering concise screen-reader confirmation for every security and power action.',
      },
    ],
  },
  props: [
    {
      name: 'mode',
      type: "'inline' | 'fullscreen'",
      defaultValue: "'inline'",
      description:
        'Presentation mode: `inline` embeds the lock screen and unlocked confirmation bar inside a `prism-slab`; `fullscreen` mounts a fixed frosted backdrop dialog when locked and returns `null` when unlocked.',
    },
    {
      name: 'locked',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled lock state. Pair with `onLockChange` to drive session lock state externally.',
    },
    {
      name: 'defaultLocked',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Initial lock state when running in uncontrolled mode.',
    },
    {
      name: 'timeLabel',
      type: 'string',
      defaultValue: "'10:42'",
      description:
        'Large tabular clock readout rendered in the lock screen header.',
    },
    {
      name: 'dateLabel',
      type: 'string',
      defaultValue: "'Sunday, November 22'",
      description:
        'Formatted date subtitle displayed directly beneath the clock.',
    },
    {
      name: 'users',
      type: 'ReadonlyArray<LockScreenUserAccount>',
      defaultValue:
        '3 default accounts (Clara Vance, Marcus Chen, Guest Session)',
      description:
        'List of user accounts rendered in the circular optical avatar switcher; duplicate IDs are safely deduplicated.',
    },
    {
      name: 'defaultSelectedUserId',
      type: 'string',
      defaultValue: 'First available user id',
      description:
        'Initial active user account ID selected on mount; falls back to the first account if not found.',
    },
    {
      name: 'onUnlock',
      type: '(user: LockScreenUserAccount, credential: string) => boolean | void',
      defaultValue: 'undefined',
      description:
        'Invoked on unlock submission with the active user and entered credential (`""` for passwordless accounts). Return `false` to reject unlock and display an inline error.',
    },
    {
      name: 'onLockChange',
      type: '(locked: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Invoked whenever the lock screen transitions between locked (`true`) and unlocked (`false`) states.',
    },
    {
      name: 'onPowerAction',
      type: "(action: 'sleep' | 'restart' | 'shutdown') => void",
      defaultValue: 'undefined',
      description:
        'Invoked when the user triggers Sleep, Restart, or Shut Down from the quick power cluster.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables account switching, password entry, visibility toggling, unlock/re-lock buttons, and power controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and optical inline style overrides.',
    },
  ],
  examples: [
    `<LockScreenOverlay\n  timeLabel="10:42"\n  dateLabel="Sunday, November 22"\n  onUnlock={(user, credential) => {\n    if (!user.requiresPassword) return true;\n    return credential === 'prism-2026';\n  }}\n  onPowerAction={(action) => console.warn('Power action:', action)}\n/>`,
    `<LockScreenOverlay\n  mode="fullscreen"\n  locked={isLocked}\n  onUnlock={(user, credential) => verifyPin(user.id, credential)}\n  onLockChange={setIsLocked}\n  onPowerAction={handleSystemPower}\n/>`,
  ],
};

export default docs;
