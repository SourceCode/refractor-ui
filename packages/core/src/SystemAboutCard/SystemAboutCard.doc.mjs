export const docs = {
  name: 'SystemAboutCard',
  displayName: 'System About Card',
  group: 'Desktop Surfaces & Native System Dialogs',
  category: 'desktop-surfaces-dialogs',
  keywords: [
    'about',
    'system-info',
    'about-this-mac',
    'os-version',
    'build-number',
    'hardware-specs',
    'serial-number',
    'uptime',
    'storage',
    'diagnostics',
    'software-update',
    'dialog',
    'modal',
    'desktop-surface',
  ],
  usage: {
    description:
      'Classic OS identity card and frosted-glass modal dialog (`prism-slab` inline or frosted backdrop modal) displaying a pure geometric refractive Prism SVG emblem, OS name, codename, monospace version/build pill (`v15.4 · Build 24E218`), tabular live uptime readout (`14d 06h 22m 08s`) with optional 1000ms interval ticking, structured `<dl>` hardware specifications with default-masked sensitive fields (`••••-••••-PRSM`) and accessible `Reveal`/`Hide` toggles, an optional semantic storage capacity progress bar (`--prism-primary-main` / `--prism-warning-main` >= 75% / `--prism-error-main` >= 90%), resilient clipboard `Copy Diagnostics` with `document.execCommand("copy")` fallback, `Software Update…` status feedback, and URL-sanitized documentation/license links.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Mark hardware serial numbers, device UUIDs, or license keys with `sensitive: true` so they stay masked by default during screen shares and remain redacted in copied diagnostics until explicitly revealed.',
      },
      {
        guidance: true,
        description:
          'Use `mode="modal"` paired with controlled `open` and `onClose` when launching from an application menu bar (`About This Workstation`), or keep `mode="inline"` inside a System Settings overview pane.',
      },
      {
        guidance: false,
        description:
          'Do not rely on raw unvalidated URLs or non-finite telemetry; `SystemAboutCard` sanitizes every link through `sanitizeUrl(href, false)` (blocking `javascript:`, `data:`, and `vbscript:` protocols) and clamps `NaN`/`Infinity`/negative uptime and storage figures safely.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Landmarks, Hardware Definition List & Storage Progressbar',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Renders `role="region"` in inline mode or a frosted `role="dialog" aria-modal="true"` overlay in modal mode linked via `aria-labelledby`, semantic `<dl>/<dt>/<dd>` hardware rows with `aria-pressed` Reveal/Hide toggles, and a `role="progressbar"` storage bar with `aria-valuemin`/`aria-valuemax`/`aria-valuenow`/`aria-valuetext`',
        description:
          'Exposes OS identity, masked/revealed serial status, and storage utilization cleanly to assistive technologies.',
      },
      {
        name: 'IME-Safe Controls, Keyboard-Only Focus Rings & Polite Status Region',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards modal `Escape` dismissal and button keydowns against active IME composition (`isComposing`), applies keyboard-only `.prism-focus-ring`, strips unsafe URLs into inert non-clickable text, and announces copy, reveal, and update-check states inside an `aria-live="polite"` status region',
        description:
          'Preserves CJK/IME input sessions, prevents protocol XSS in footer links, and communicates transient diagnostic and software update feedback without stealing focus.',
      },
    ],
  },
  props: [
    {
      name: 'mode',
      type: "'inline' | 'modal'",
      defaultValue: "'inline'",
      description:
        'Presentation mode rendering either an inline `prism-slab` region or a centered frosted-glass modal dialog.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Controls visibility when `mode="modal"`. Returns `null` when `mode === "modal"` and `open === false`.',
    },
    {
      name: 'info',
      type: 'SystemAboutInfo',
      defaultValue: 'DEFAULT_SYSTEM_ABOUT_INFO (Refractor OS 15.4 Prism Workstation)',
      description:
        'Operating system identity, build badge, uptime seconds, hardware specs, optional storage summary, links, and copyright notice.',
    },
    {
      name: 'liveUptime',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'When `true`, increments the displayed uptime duration every 1000ms and strictly clears the interval on disable or unmount.',
    },
    {
      name: 'onCopyDiagnostics',
      type: '(diagnosticsText: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the formatted plain-text system diagnostics report (masking unrevealed sensitive fields) when `Copy Diagnostics` is clicked.',
    },
    {
      name: 'onCheckUpdates',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when `Software Update…` is activated while updating the polite status region.',
    },
    {
      name: 'onClose',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when dismissing `mode="modal"` via the close button, backdrop click, or IME-safe `Escape` key.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables reveal toggles, diagnostics copy, software update check, link navigation, and modal dismissal.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom properties and inline optical style overrides merged cleanly onto the root surface.',
    },
  ],
  examples: [
    `<SystemAboutCard\n  liveUptime={true}\n  onCopyDiagnostics={(report) => console.warn(report)}\n  onCheckUpdates={() => console.warn('Checking for software updates')}\n/>`,
    `<SystemAboutCard\n  mode="modal"\n  open={true}\n  onClose={() => console.warn('Closed about dialog')}\n/>`,
  ],
};

export default docs;
