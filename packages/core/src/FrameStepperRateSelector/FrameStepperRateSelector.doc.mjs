export const docs = {
  name: 'FrameStepperRateSelector',
  displayName: 'Frame Stepper & Rate Selector',
  group: 'Transport & Playback Controls',
  category: 'transport-playback',
  keywords: [
    'frame',
    'stepper',
    'playback',
    'rate',
    'speed',
    'timecode',
    'fps',
    'transport',
    'video',
    'timeline',
    'animation',
  ],
  usage: {
    description:
      'Compact optical-glass prism-slab transport bar combining a frame-accurate stepper cluster (-jumpStep, -1f, recessed prism-well tabular frame/timecode readout, +1f, +jumpStep) with a connected prism-crystal playback rate pill selector, deterministic numeric sanitization, and keyboard-accessible readout stepping.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Match fps and totalFrames to the underlying media stream or animation timeline so the MM:SS.cc timecode readout and upper boundary stay strictly synchronized.',
      },
      {
        guidance: true,
        description:
          'Use controlled frame/onFrameChange and rate/onRateChange props when coordinating with an external HTMLVideoElement, Canvas timeline, or Web Animations controller.',
      },
      {
        guidance: false,
        description:
          'Pass duplicate, zero, or negative entries expecting hidden rate pills; FrameStepperRateSelector deduplicates positive finite rates automatically and falls back to [0.25, 0.5, 1, 1.5, 2] if no valid rates remain.',
      },
    ],
    accessibility: [
      {
        name: 'Grouped Transport Semantics & Spinbutton Readout',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Organizes controls into labeled Frame stepper and Playback rate groups, exposes role="spinbutton" with aria-valuemin/valuemax/valuenow/valuetext on the tabular readout, and reflects rate selection via aria-pressed',
        description:
          'Disables backward steppers at frame 0 and forward steppers at totalFrames, surfaces live frame and MM:SS.cc timecode context in aria-valuetext, and marks the active playback speed with aria-pressed="true".',
      },
      {
        name: 'Keyboard Readout Stepping & IME Safety',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Supports ArrowLeft/ArrowRight (±1f), Shift+ArrowLeft/Shift+ArrowRight (±jumpStep), Home/End bounds on the focused readout with !e.nativeEvent.isComposing guards and keyboard-only prism-focus-ring outlines',
        description:
          'Removes the readout from tab order when disabled, ignores IME composition keystrokes, and prevents browser focus rings from appearing on pointer clicks.',
      },
    ],
  },
  props: [
    {
      name: 'frame',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled current frame index clamped to [0..totalFrames].',
    },
    {
      name: 'defaultFrame',
      type: 'number',
      defaultValue: '0',
      description: 'Initial frame index in uncontrolled mode.',
    },
    {
      name: 'totalFrames',
      type: 'number',
      defaultValue: '1800',
      description: 'Total frame count representing the inclusive upper frame bound (clamped >= 1).',
    },
    {
      name: 'fps',
      type: 'number',
      defaultValue: '30',
      description: 'Frames per second used to compute the tabular MM:SS.cc timecode (clamped 1..120).',
    },
    {
      name: 'jumpStep',
      type: 'number',
      defaultValue: '10',
      description: 'Large step delta for -{jumpStep}f / +{jumpStep}f buttons and Shift+Arrow shortcuts (clamped 2..120).',
    },
    {
      name: 'onFrameChange',
      type: '(frame: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the clamped frame index changes.',
    },
    {
      name: 'rate',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled playback rate multiplier.',
    },
    {
      name: 'defaultRate',
      type: 'number',
      defaultValue: '1',
      description: 'Initial playback rate multiplier in uncontrolled mode.',
    },
    {
      name: 'rates',
      type: 'ReadonlyArray<number>',
      defaultValue: '[0.25, 0.5, 1, 1.5, 2]',
      description: 'Selectable positive finite playback rates (deduplicated; falls back to default list if empty/invalid).',
    },
    {
      name: 'onRateChange',
      type: '(rate: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the selected playback rate changes.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all stepper buttons, readout keyboard navigation, and playback rate pills.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<FrameStepperRateSelector\n  defaultFrame={42}\n  totalFrames={1800}\n  fps={30}\n  onFrameChange={(nextFrame) => console.warn(nextFrame)}\n  onRateChange={(nextRate) => console.warn(nextRate)}\n/>`,
    `<FrameStepperRateSelector\n  frame={120}\n  totalFrames={720}\n  fps={24}\n  jumpStep={24}\n  rate={0.5}\n  rates={[0.25, 0.5, 1, 2, 4]}\n  onFrameChange={(nextFrame) => console.warn(nextFrame)}\n  onRateChange={(nextRate) => console.warn(nextRate)}\n/>`,
  ],
};
