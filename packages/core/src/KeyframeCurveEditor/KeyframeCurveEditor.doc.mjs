export const docs = {
  name: 'KeyframeCurveEditor',
  displayName: 'Keyframe Curve Editor',
  group: 'Timeline & Sequencing',
  category: 'timeline-sequencing',
  keywords: [
    'keyframe',
    'curve',
    'bezier',
    'cubic-bezier',
    'easing',
    'animation',
    'timeline',
    'motion',
    'sequencing',
    'overshoot',
    'spline',
    'interpolation',
  ],
  usage: {
    description:
      'Optical-glass motion-curve and keyframe editor inside a prism-slab card featuring a horizontal diamond keyframe lane with keyboard time nudging, a 260x220 cubic-bezier SVG graph with draggable and keyboard-nudgeable P1/P2 tangent handles, canonical easing preset pills, Add/Delete keyframe controls, and live CSS cubic-bezier(x1, y1, x2, y2) telemetry powered exclusively by --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Bind keyframes and onKeyframesChange in controlled mode to synchronize animation tracks, preview playheads, and CSS transition exporters in real time.',
      },
      {
        guidance: true,
        description:
          'Use the built-in easing presets (Linear, Ease In, Ease Out, Ease In-Out, Overshoot) as starting curves before fine-tuning P1 and P2 handles via pointer drag or arrow keys.',
      },
      {
        guidance: false,
        description:
          'Pass unclamped or non-finite Bezier coordinates directly into CSS output; KeyframeCurveEditor sanitizes x1/x2 into [0..1] and y1/y2 into [-0.5..1.5] automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Keyframe Lane & Two-Axis Bezier Handle Sliders',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Diamond keyframe markers expose role="button" and aria-pressed with ArrowLeft/ArrowRight 5% time nudging; P1 and P2 SVG handles expose role="slider" with aria-valuetext and ArrowLeft/Right/Up/Down 0.05 coordinate stepping',
        description:
          'Enables full keyboard authoring of animation timings and cubic-bezier easing curves without requiring pointer dragging.',
      },
      {
        name: 'IME-Safe Input Guards & Window Pointer Cleanup',
        criterion: '2.4.7 Focus Visible & 2.5.1 Pointer Gestures',
        requirement:
          'Guards keyboard handlers with !e.nativeEvent.isComposing, renders keyboard-only focus rings via .prism-focus-ring, and removes window pointer listeners cleanly on pointerup, pointercancel, disable, and unmount',
        description:
          'Prevents IME interference during keyboard control and ensures pointer drag sessions never leak global window listeners.',
      },
    ],
  },
  props: [
    {
      name: 'propertyName',
      type: 'string',
      defaultValue: "'Opacity'",
      description: 'Animated property heading displayed in the optical card header and SVG label.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'%'",
      description: 'Unit suffix displayed alongside each keyframe value (e.g. "%", "px", "deg").',
    },
    {
      name: 'keyframes',
      type: 'ReadonlyArray<AnimationKeyframe>',
      defaultValue: 'undefined',
      description: 'Controlled collection of keyframes ({ id, timePct, value, easing }).',
    },
    {
      name: 'defaultKeyframes',
      type: 'ReadonlyArray<AnimationKeyframe>',
      defaultValue: '3 keyframes at 0%, 50%, 100%',
      description: 'Initial keyframes collection in uncontrolled mode.',
    },
    {
      name: 'onKeyframesChange',
      type: '(keyframes: AnimationKeyframe[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated sorted keyframes array whenever a keyframe is added, deleted, moved, or re-eased.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables adding, deleting, nudging, preset selection, and handle dragging.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<KeyframeCurveEditor\n  propertyName="Opacity"\n  unit="%"\n  onKeyframesChange={(next) => console.warn(next)}\n/>`,
    `<KeyframeCurveEditor\n  propertyName="Translate Y"\n  unit="px"\n  defaultKeyframes={[\n    { id: 'enter', timePct: 0, value: 24, easing: [0.34, 1.5, 0.64, 1] },\n    { id: 'settle', timePct: 100, value: 0, easing: [0, 0, 1, 1] },\n  ]}\n/>`,
  ],
};
