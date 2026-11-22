export const docs = {
  name: 'ScreenCaptureHud',
  displayName: 'Screen Capture HUD',
  group: 'Hardware HUDs & System Overlays',
  category: 'hardware-huds-overlays',
  keywords: [
    'screen-capture',
    'screenshot',
    'screen-recording',
    'hud',
    'toolbar',
    'overlay',
    'countdown',
    'microphone',
    'recording',
    'hardware',
    'capture-region',
    'desktop-shell',
  ],
  usage: {
    description:
      'Floating bottom optical-glass Screen Capture & Recording HUD toolbar housed inside a prism-slab shell. Pairs an IME-safe roving-tabindex Capture Target radiogroup (Full Screen, Window, Region), Screenshot / Record Video output switcher, countdown timer selector (No Delay, 3s, 5s, 10s), save destination picker (Desktop, Clipboard, Documents/Captures), recording-mode Microphone toggle, live countdown with mid-flight Cancel, pulsing --prism-error-main REC elapsed timer with Stop Recording, optional Close HUD dismiss control, and a polite aria-live status strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Wire onCaptureComplete to persist or preview captured screenshots and recorded video artifacts using the structured ScreenCaptureResult payload (target, output, delaySeconds, saveLocation, includeMic, durationSeconds).',
      },
      {
        guidance: true,
        description:
          'Provide onDismiss when rendering ScreenCaptureHud as a floating bottom OS overlay so keyboard and pointer users can cleanly exit capture mode and cancel any active countdown or recording timer.',
      },
      {
        guidance: false,
        description:
          'Expect microphone audio to be enabled during screenshot captures; ScreenCaptureHud restricts the Microphone toggle to Record Video mode and always emits includeMic: false and durationSeconds: 0 for screenshots.',
      },
    ],
    accessibility: [
      {
        name: 'Roving Radiogroup, Toggle States & Labeled Select Controls',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes Capture Target as a role="radiogroup" with role="radio", aria-checked, and IME-safe Arrow/Home/End navigation alongside aria-pressed output and microphone toggles and explicitly labeled Timer and Save to selects',
        description:
          'Allows full keyboard operation across target modes, output switching, delay/destination configuration, countdown cancellation, and recording stop without hijacking active IME composition.',
      },
      {
        name: 'Polite Live Announcements & Keyboard-Only Focus Rings',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Publishes target switches, countdown ticks, cancellation, recording start/stop summaries, and saved capture telemetry in an aria-live="polite" status strip with :focus-visible .prism-focus-ring outlines',
        description:
          'Keeps assistive technology informed throughout countdowns and recordings while preventing pointer-click focus ring noise across floating HUD buttons.',
      },
    ],
  },
  props: [
    {
      name: 'defaultTarget',
      type: 'CaptureTargetMode',
      defaultValue: "'fullscreen'",
      description:
        "Initial capture region target mode ('fullscreen' | 'window' | 'region').",
    },
    {
      name: 'defaultOutput',
      type: 'CaptureOutputKind',
      defaultValue: "'screenshot'",
      description:
        "Initial output mode ('screenshot' | 'recording').",
    },
    {
      name: 'defaultDelaySeconds',
      type: 'CaptureDelaySeconds',
      defaultValue: '0',
      description:
        'Initial countdown timer delay in seconds (0 | 3 | 5 | 10).',
    },
    {
      name: 'defaultSaveLocation',
      type: 'CaptureSaveLocation',
      defaultValue: "'desktop'",
      description:
        "Initial capture save destination ('desktop' | 'clipboard' | 'documents').",
    },
    {
      name: 'defaultIncludeMic',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Initial microphone audio recording preference when in Record Video mode.',
    },
    {
      name: 'onCaptureComplete',
      type: '(result: ScreenCaptureResult) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the complete ScreenCaptureResult when a screenshot finishes or an active video recording stops.',
    },
    {
      name: 'onDismiss',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Optional callback that renders the Close HUD button and runs when the user dismisses the floating toolbar.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all toolbar controls, selects, toggles, and actions while cleaning up any running countdown or recording interval.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<ScreenCaptureHud\n  defaultTarget="region"\n  defaultDelaySeconds={3}\n  onCaptureComplete={(result) => console.warn('Captured:', result)}\n  onDismiss={() => console.warn('HUD dismissed')}\n/>`,
    `<ScreenCaptureHud\n  defaultTarget="window"\n  defaultOutput="recording"\n  defaultSaveLocation="documents"\n  defaultIncludeMic={true}\n  onCaptureComplete={(result) => console.warn('Recorded:', result)}\n/>`,
  ],
};

export default docs;
