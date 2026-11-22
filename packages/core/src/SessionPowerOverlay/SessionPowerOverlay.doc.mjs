export const docs = {
  name: 'SessionPowerOverlay',
  displayName: 'Session Power Overlay',
  group: 'Hardware HUDs & System Overlays',
  category: 'hardware-huds-overlays',
  keywords: [
    'power',
    'session',
    'shutdown',
    'restart',
    'sleep',
    'logout',
    'countdown',
    'overlay',
    'modal',
    'system',
    'hud',
    'hardware',
  ],
  usage: {
    description:
      'Dimmed optical system power overlay housed inside a sculpted `prism-slab` surface, presenting four large tactile power action cards—Sleep (`--prism-info-main`), Restart (`--prism-warning-main`), Shut Down (`--prism-error-main`), and Log Out (`--prism-secondary-main`)—inside a WAI-ARIA `role="radiogroup"` with IME-safe arrow-key navigation. Pairs action selection with a contextual "Reopen windows when logging back in" checkbox (gracefully marked not applicable when Sleep is selected), an optional live 1-second `window.setInterval` auto-action countdown with `Start Timer`/`Stop Timer` controls and strict unmount/cancel/disable cleanup, `Confirm <Action>` and `Cancel` buttons, an `aria-live="polite"` status banner, and dual `inline` / `modal` (`role="dialog" aria-modal="true"` with backdrop & `Escape` dismissal) presentation modes.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `mode="modal"` paired with controlled `open`, `onConfirmAction`, and `onCancel` for full-viewport OS shutdown, restart, and log-out confirmation dialogs, and `mode="inline"` for embedded system settings or interactive previews.',
      },
      {
        guidance: true,
        description:
          'Set `countdownSeconds={0}` when an immediate manual confirmation flow is desired without an auto-execution countdown timer, or configure a positive duration (e.g., `60`) with `autoStartCountdown` for unattended workstation shutdowns.',
      },
      {
        guidance: false,
        description:
          'Use `SessionPowerOverlay` for generic confirmation prompts unrelated to workstation session or power transitions; use `ModalDialog` or `HoldToConfirmButton` for general destructive confirmations.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Radiogroup & Modal Dialog Semantics',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes the four power cards inside `role="radiogroup"` (`aria-label="Power and session actions"`) with `role="radio"` and `aria-checked`, provides an explicitly labeled checkbox (`aria-label="Reopen windows when logging back in"`), and wraps `mode="modal"` inside `role="dialog" aria-modal="true"`',
        description:
          'Ensures assistive technologies accurately convey the active power transition, window-reopen preference, and modal scope across both inline and overlay modes.',
      },
      {
        name: 'IME-Safe Keyboard Navigation, Focus Visibility & Polite Announcements',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Supports IME-guarded `ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`/`Home`/`End` radio switching with roving `tabIndex`, IME-guarded `Escape` dismissal in modal mode, keyboard-only `.prism-focus-ring` (`:focus-visible`), and an `aria-live="polite"` status banner',
        description:
          'Prevents accidental dismissal or power switching during IME composition while keeping keyboard and screen-reader users informed of selection, timer, and confirmation changes.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Power & Session'",
      description:
        'Heading displayed at the top of the optical power slab and used as the default accessible landmark/dialog label.',
    },
    {
      name: 'mode',
      type: "'inline' | 'modal'",
      defaultValue: "'inline'",
      description:
        'Presentation mode: embeds directly as a `prism-slab` region (`inline`) or mounts over a dimmed frosted viewport backdrop (`modal`).',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Controls visibility in `mode="modal"`; returns `null` and cleans up listeners/timers when `false`.',
    },
    {
      name: 'defaultSelectedAction',
      type: "'sleep' | 'restart' | 'shutdown' | 'logout'",
      defaultValue: "'shutdown'",
      description:
        'Initially selected power action card in the radio group.',
    },
    {
      name: 'defaultReopenWindows',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Initial checked state of the "Reopen windows when logging back in" checkbox for Restart, Shut Down, and Log Out.',
    },
    {
      name: 'countdownSeconds',
      type: 'number',
      defaultValue: '60',
      description:
        'Optional auto-action countdown duration in seconds; `0`, negative, `NaN`, or `Infinity` sanitizes to `0` and disables countdown controls.',
    },
    {
      name: 'autoStartCountdown',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Starts the 1-second live countdown immediately on mount/open when `countdownSeconds > 0` and not `disabled`.',
    },
    {
      name: 'onConfirmAction',
      type: '(action: SessionPowerActionId, reopenWindows: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the user confirms the active action or when an active countdown reaches `0`.',
    },
    {
      name: 'onCancel',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when canceled via the Cancel button, modal close button, dimmed backdrop click, or `Escape` key.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all action cards, checkbox, countdown timer controls, confirmation, and modal dismissal interactions.',
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
    `<SessionPowerOverlay\n  onConfirmAction={(action, reopen) => console.warn('Power action:', action, reopen)}\n  onCancel={() => console.warn('Canceled')}\n/>`,
    `<SessionPowerOverlay\n  mode="modal"\n  open={isOpen}\n  countdownSeconds={30}\n  autoStartCountdown\n  onConfirmAction={(action, reopen) => {\n    executeSystemPower(action, reopen);\n    setIsOpen(false);\n  }}\n  onCancel={() => setIsOpen(false)}\n/>`,
  ],
};

export default docs;
