export const docs = {
  name: 'HardwareOsdHud',
  displayName: 'Hardware OSD HUD',
  group: 'Hardware HUDs & System Overlays',
  category: 'hardware-huds-overlays',
  keywords: [
    'hardware-osd',
    'osd',
    'hud',
    'overlay',
    'volume',
    'brightness',
    'media-playback',
    'caps-lock',
    'system-overlay',
    'auto-hide',
    'segmented-bar',
    'status',
  ],
  usage: {
    description:
      'Centered, non-interactive translucent optical Hardware HUD (OSD) housed inside a `prism-slab` stage that appears briefly and fades out when adjusting system volume, screen brightness, media playback, or Caps Lock. The floating `prism-crystal` OSD capsule uses `pointer-events-none`, `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, and `data-visible` transitions to present a 16-segment optical level bar and clamped `0..100%` tabular readout for Volume (`--prism-primary-main` or muted dimmed) and Brightness (`--prism-warning-main`), or semantic optical state pills for Media Playback (`Playing` `--prism-success-main` / `Paused` `--prism-info-main`) and Caps Lock (`ON` `--prism-primary-main` / `OFF` `--prism-text-secondary`). Supports optional `autoHideMs` timed fadeout with automatic timer reset on re-trigger and strict cleanup on hide/unmount, plus an optional interactive Hardware Key Simulator strip (`showDemoTriggers`) for immediately testing all 4 HUD kinds.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep the centered OSD capsule strictly non-interactive (`pointer-events-none`) so transient volume, brightness, media, or Caps Lock overlays never intercept clicks or drag gestures on underlying windows.',
      },
      {
        guidance: true,
        description:
          'Use `autoHideMs` (for example `1500` to `2500` ms) with controlled `payload` and `visible` / `onVisibleChange` when binding `HardwareOsdHud` to real OS media keys or hardware shortcut listeners, and pass `showDemoTriggers={false}` in production overlays.',
      },
      {
        guidance: false,
        description:
          'Do not pass unvalidated `NaN`, `Infinity`, or out-of-bounds percentages expecting bar overflow; `HardwareOsdHud` strictly clamps level values to `[0..100]` and sanitizes invalid `autoHideMs` durations safely.',
      },
    ],
    accessibility: [
      {
        name: 'Non-Intrusive Polite Live Status Region',
        criterion: '4.1.3 Status Messages & 1.3.1 Info and Relationships',
        requirement:
          'Renders the centered HUD capsule with `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, `pointer-events-none`, and reflected `data-visible="true" | "false"` state',
        description:
          'Announces hardware volume, mute, brightness, playback, and Caps Lock updates politely to assistive technologies without stealing keyboard focus from active user workflows.',
      },
      {
        name: 'IME-Safe Simulator Controls & Keyboard-Only Focus Rings',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Guards simulator keydown events against active IME composition (`event.nativeEvent.isComposing`), applies keyboard-only `.prism-focus-ring`, and reflects pressed state via `aria-pressed` on toggle keys (`Mute`, `Media Play/Pause`, `Caps Lock`)',
        description:
          'Ensures interactive hardware key simulator buttons are fully keyboard operable without showing focus outlines on mouse click or interfering with CJK/IME input.',
      },
    ],
  },
  props: [
    {
      name: 'payload',
      type: 'HardwareOsdPayload',
      defaultValue: 'undefined',
      description:
        'Controlled OSD payload (`{ kind, levelPct?, muted?, playing?, capsLockOn?, label? }`) selecting the active hardware kind and visual readout.',
    },
    {
      name: 'defaultPayload',
      type: 'HardwareOsdPayload',
      defaultValue: "{ kind: 'volume', levelPct: 68, muted: false }",
      description:
        'Initial uncontrolled OSD payload used when `payload` is omitted.',
    },
    {
      name: 'visible',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled visibility state reflected on the OSD capsule (`data-visible="true" | "false"`).',
    },
    {
      name: 'defaultVisible',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Initial uncontrolled visibility state for the centered OSD capsule.',
    },
    {
      name: 'autoHideMs',
      type: 'number',
      defaultValue: '0',
      description:
        'Auto-hide timeout in milliseconds. When `> 0`, schedules a fadeout via `window.setTimeout`, resets the countdown on every new trigger or payload update, and clears strictly on hide or unmount.',
    },
    {
      name: 'showDemoTriggers',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Displays the interactive Hardware Key Simulator strip (`Vol -`, `Vol +`, `Mute`, `Bright +`, `Media Play/Pause`, `Caps Lock`) beneath the optical stage.',
    },
    {
      name: 'onVisibleChange',
      type: '(visible: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when HUD visibility transitions (e.g., auto-hide fadeout or demo trigger activation).',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all interactive Hardware Key Simulator controls and marks the root region `aria-disabled="true"`.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom properties and inline optical style overrides merged cleanly onto the root `prism-slab`.',
    },
  ],
  examples: [
    `<HardwareOsdHud\n  autoHideMs={2000}\n  onVisibleChange={(visible) => console.warn('OSD visible:', visible)}\n/>`,
    `<HardwareOsdHud\n  payload={{ kind: 'brightness', levelPct: 84 }}\n  visible={true}\n  showDemoTriggers={false}\n/>`,
  ],
};

export default docs;
