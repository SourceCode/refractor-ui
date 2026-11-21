export const docs = {
  name: 'JogShuttleWheel',
  displayName: 'Jog Shuttle Wheel',
  group: 'Transport & Playback Controls',
  category: 'transport-playback',
  keywords: [
    'jog',
    'shuttle',
    'wheel',
    'transport',
    'playback',
    'frame',
    'scrub',
    'video',
    'timeline',
    'deck',
    'speed',
    'spring',
  ],
  usage: {
    description:
      'Optical-glass broadcast jog/shuttle deck built on a prism-slab shell combining a 140x140 concentric SVG jog wheel (knurled rim ticks, rotating inner rotor with finger dimple and tangerine index notch, horizontal pointer stepping at ±1 frame per 12px) with a spring-loaded bidirectional shuttle strip, center 0× detent marker, Spring/Hold return mode toggle, and direct discrete speed detent buttons.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Bind frame and onJogStep together when synchronizing frame-accurate stepping with an external video element, NLE timeline, or frame buffer.',
      },
      {
        guidance: true,
        description:
          'Keep springReturn enabled (default) for tactile fast-forward/rewind scrubbing that safely returns to IDLE (0×) on pointer release, or let operators toggle Hold mode for sustained multi-speed playback.',
      },
      {
        guidance: false,
        description:
          'Pass unsorted or non-finite shuttle speed values expecting raw pass-through; JogShuttleWheel automatically deduplicates, sorts ascending, guarantees a 0× center detent, and clamps frame bounds safely.',
      },
    ],
    accessibility: [
      {
        name: 'Dual WAI-ARIA Slider Semantics & Keyboard Parity',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes separate role="slider" controls for "Jog wheel" (ArrowLeft/Right ±1F, PageUp/PageDown ±10F, Home/End bounds) and "Shuttle speed" (ArrowLeft/Right across shuttleSpeeds, 0/Home resets to 0×)',
        description:
          'Guards all keydown handlers against IME composition, disables focusability when disabled, and pairs slider dragging with direct aria-pressed detent buttons for touch and keyboard users.',
      },
      {
        name: 'Clean Window Pointer Lifecycle & Keyboard-Only Focus Ring',
        criterion: '2.4.7 Focus Visible & 2.5.1 Pointer Gestures',
        requirement:
          'Uses prism-focus-ring (:focus-visible) and registers window pointermove/pointerup/pointercancel listeners that cleanly detach on release, disable, or unmount',
        description:
          'Prevents leaked global listeners during rapid drags or mid-drag unmounts and avoids showing focus outlines during pointer interactions.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Jog / Shuttle Deck'",
      description: 'Header deck title and accessible aria-label for the outer region.',
    },
    {
      name: 'frame',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled current frame counter, clamped safely within [minFrame..maxFrame].',
    },
    {
      name: 'defaultFrame',
      type: 'number',
      defaultValue: '0',
      description: 'Initial frame counter in uncontrolled mode.',
    },
    {
      name: 'minFrame',
      type: 'number',
      defaultValue: '0',
      description: 'Minimum inclusive frame bound.',
    },
    {
      name: 'maxFrame',
      type: 'number',
      defaultValue: '1800',
      description: 'Maximum inclusive frame bound.',
    },
    {
      name: 'shuttleSpeeds',
      type: 'ReadonlyArray<number>',
      defaultValue: '[-8, -4, -2, -1, 0, 1, 2, 4, 8]',
      description: 'Ordered discrete shuttle speed multipliers; normalized, sorted, and guaranteed to include 0.',
    },
    {
      name: 'springReturn',
      type: 'boolean',
      defaultValue: 'true',
      description: 'When true, releasing the shuttle slider automatically springs the shuttle rate back to 0 and emits onShuttleChange(0).',
    },
    {
      name: 'onJogStep',
      type: '(deltaFrames: number, nextFrame: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked on discrete frame changes with the signed delta and resulting clamped frame.',
    },
    {
      name: 'onShuttleChange',
      type: '(speed: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the active shuttle rate changes, including spring-return resets to 0.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables jog wheel drag/keyboard, shuttle slider drag/keyboard, Spring/Hold toggle, and speed detent buttons.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<JogShuttleWheel\n  title="Deck A — Master Edit"\n  defaultFrame={42}\n  minFrame={0}\n  maxFrame={1800}\n  onJogStep={(delta, next) => console.warn(delta, next)}\n  onShuttleChange={(speed) => console.warn(speed)}\n/>`,
    `<JogShuttleWheel\n  title="Frame-Accurate Review"\n  frame={currentFrame}\n  minFrame={0}\n  maxFrame={3600}\n  shuttleSpeeds={[-4, -2, -1, 0, 1, 2, 4]}\n  springReturn={false}\n  onJogStep={(_delta, next) => setCurrentFrame(next)}\n  onShuttleChange={setPlaybackRate}\n/>`,
  ],
};
