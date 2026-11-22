export const docs = {
  name: 'ToneCurveEditor',
  displayName: 'Tone Curve Editor',
  group: 'Photo & Color Grading Controls',
  category: 'photo-color-grading',
  keywords: [
    'tone curve',
    'color grading',
    'luma',
    'rgb',
    'histogram',
    'contrast',
    's-curve',
    'matte lift',
    'photo',
    'levels',
    'spline',
    'curves',
  ],
  usage: {
    description:
      'Optical-glass multi-channel photo & color grading tone curve editor inside a sculpted prism-slab card featuring Luma/Red/Green/Blue channel pills, Linear/S-Curve/Matte Lift presets, Reset Channel action, a responsive 260x260 monotone cubic spline SVG graph over a 4x4 quarter-tone grid and translucent luma histogram silhouette, clickable point insertion (up to 12 points), draggable and keyboard-nudgeable control points with X-pinned endpoints, and an aria-live recessed telemetry readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use controlled curves and onChange to drive real-time WebGL/Canvas LUT lookups or CSS filter previews across Luma, Red, Green, and Blue grading channels.',
      },
      {
        guidance: true,
        description:
          'Pass a live image luma histogram array via the histogram prop so colorists can align shadow, midtone, and highlight anchor points directly over tonal density.',
      },
      {
        guidance: false,
        description:
          'Pass unclamped or unsorted curve points directly to downstream LUTs; ToneCurveEditor automatically clamps levels to [0..255], preserves [0, 255] endpoints, and sorts control points ascending by input level.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Control Point Sliders & Shift Coarse Stepping',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every control point exposes role="slider" with aria-valuemin=0, aria-valuemax=255, aria-valuenow, and aria-valuetext="In: X, Out: Y"; Arrow keys nudge by +/-4 (or +/-16 with Shift) and Delete/Backspace removes interior points while keeping x=0 and x=255 endpoints pinned on X.',
        description:
          'Provides full keyboard-only authoring of photographic tone curves without requiring pointer dragging.',
      },
      {
        name: 'IME-Safe Keydown, Live Telemetry & Pointer Cleanup',
        criterion: '2.4.7 Focus Visible, 2.5.1 Pointer Gestures & 4.1.3 Status Messages',
        requirement:
          'Guards keyboard handlers with !e.nativeEvent.isComposing, applies keyboard-only .prism-focus-ring outlines, announces selected coordinates and point count in an aria-live="polite" prism-well readout, and cleans up window pointer listeners on pointerup, pointercancel, disable, channel switch, and unmount.',
        description:
          'Prevents IME interference, communicates real-time numeric level feedback to assistive technologies, and avoids leaked global window listeners.',
      },
    ],
  },
  props: [
    {
      name: 'curves',
      type: 'Partial<ToneCurveChannelMap>',
      defaultValue: 'undefined',
      description: 'Controlled per-channel point arrays (luma, red, green, blue) normalized to [0..255].',
    },
    {
      name: 'defaultCurves',
      type: 'Partial<ToneCurveChannelMap>',
      defaultValue: '[(0,0), (64,64), (192,192), (255,255)] per channel',
      description: 'Initial per-channel curve points for uncontrolled usage.',
    },
    {
      name: 'activeChannel',
      type: "'luma' | 'red' | 'green' | 'blue'",
      defaultValue: 'undefined',
      description: 'Controlled active grading channel.',
    },
    {
      name: 'defaultChannel',
      type: "'luma' | 'red' | 'green' | 'blue'",
      defaultValue: "'luma'",
      description: 'Initial active grading channel in uncontrolled mode.',
    },
    {
      name: 'onChannelChange',
      type: '(channel: ToneCurveChannel) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the active grading channel switches.',
    },
    {
      name: 'onChange',
      type: '(channel: ToneCurveChannel, points: ToneCurvePoint[], allCurves: ToneCurveChannelMap) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated channel, sorted points array, and full channel map on every edit.',
    },
    {
      name: 'histogram',
      type: 'ReadonlyArray<number>',
      defaultValue: 'Deterministic 32-bin default silhouette',
      description: 'Optional background luma histogram bin values displayed inside the curve grid.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Tone Curve'",
      description: 'Visible card header title and accessible SVG label prefix.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables channel pills, presets, resetting, point insertion, dragging, deletion, and keyboard nudging.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ToneCurveEditor\n  title="Primary Grade"\n  onChange={(channel, points, allCurves) => {\n    void channel;\n    void points;\n    void allCurves;\n  }}\n/>`,
    `<ToneCurveEditor\n  defaultChannel="red"\n  histogram={[8, 18, 42, 76, 95, 88, 60, 32, 14]}\n  defaultCurves={{\n    luma: [\n      { id: 'l-0', x: 0, y: 12 },\n      { id: 'l-1', x: 64, y: 52 },\n      { id: 'l-2', x: 192, y: 210 },\n      { id: 'l-3', x: 255, y: 248 },\n    ],\n  }}\n/>`,
  ],
};

export default docs;
