export const docs = {
  name: 'GradientStopEditor',
  displayName: 'Gradient Stop Editor',
  group: 'Design, 3D & Shader Inspector Controls',
  category: 'design-3d-shader',
  keywords: [
    'gradient',
    'gradient stop',
    'color ramp',
    'shader',
    'linear-gradient',
    'radial-gradient',
    'conic-gradient',
    'midpoint',
    'color-mix',
    'optical',
    'design inspector',
    '3d',
  ],
  usage: {
    description:
      'Optical-glass multi-stop CSS & shader gradient ramp editor inside a sculpted prism-slab card featuring Linear/Radial/Conic geometry switching, 0-360deg angle control (automatically disabled in radial mode), Add Stop and Reverse actions, a live CSS color-mix preview bar driven strictly by --prism-* semantic palette tokens, an interactive stop track with draggable and keyboard-nudgeable stop thumbs plus midpoint diamonds between adjacent stops, and a bottom selected-stop inspector with token swatch picker, Position/Opacity sliders, Delete Stop action, and aria-live CSS gradient telemetry.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use the second parameter of onChange(state, cssValue) to apply the generated theme-aware CSS gradient string directly to live shader previews, glass backdrops, or token cards.',
      },
      {
        guidance: true,
        description:
          'Adjust midpoint diamonds between adjacent stops to bias chromatic falloff without adding redundant color stops.',
      },
      {
        guidance: false,
        description:
          'Hardcode raw hex or rgb colors into stop definitions; GradientStopEditor binds every stop to semantic optical palette tokens (primary, secondary, emerald, amber, rose, info) via color-mix(in srgb, var(--prism-...) <opacity>%, transparent) so gradients adapt live across Refractor themes.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Stop Thumbs & Midpoint Diamond Sliders',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every stop thumb exposes role="slider" with aria-label="Gradient stop N position" (ArrowLeft/ArrowRight +/-2%, Shift +/-10%, Home/End, Delete/Backspace to remove when more than 2 stops remain), and every midpoint diamond exposes role="slider" with aria-label="Midpoint between stops N and M" bounded to [15..85]%.',
        description:
          'Enables full keyboard-only gradient authoring and midpoint fine-tuning without requiring pointer dragging.',
      },
      {
        name: 'IME-Safe Keydown, Live Telemetry & Pointer Cleanup',
        criterion: '2.4.7 Focus Visible, 2.5.1 Pointer Gestures & 4.1.3 Status Messages',
        requirement:
          'Guards keyboard handlers with !e.nativeEvent.isComposing, applies keyboard-only .prism-focus-ring outlines, streams the live CSS gradient string in an aria-live="polite" telemetry readout, and cleans up window pointer listeners on pointerup, pointercancel, disabled transitions, and unmount.',
        description:
          'Prevents IME composition conflicts, keeps assistive technologies informed of gradient CSS updates, and avoids leaked global window event listeners.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'GradientEditorState',
      defaultValue: 'undefined',
      description:
        'Controlled gradient editor state containing kind (linear | radial | conic), angleDeg (0..360), and ordered color stops.',
    },
    {
      name: 'defaultValue',
      type: 'GradientEditorState',
      defaultValue: 'Linear 135deg with 0% primary, 52% secondary, 100% emerald',
      description: 'Initial gradient state when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(state: GradientEditorState, cssValue: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked on every edit with the normalized GradientEditorState and its computed CSS gradient string.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Multi-Stop Gradient Editor'",
      description: 'Visible card header title and accessible preview label prefix.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables kind switching, angle adjustment, stop/midpoint dragging, keyboard nudging, adding, reversing, deleting, and token/opacity editing.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<GradientStopEditor\n  title="Optical Caustic Ramp"\n  onChange={(state, cssValue) => {\n    void state;\n    void cssValue;\n  }}\n/>`,
    `<GradientStopEditor\n  defaultValue={{\n    kind: 'conic',\n    angleDeg: 45,\n    stops: [\n      { id: 's1', positionPct: 0, token: 'primary', opacityPct: 100, midpointPct: 35 },\n      { id: 's2', positionPct: 50, token: 'info', opacityPct: 80, midpointPct: 65 },\n      { id: 's3', positionPct: 100, token: 'rose', opacityPct: 100 },\n    ],\n  }}\n/>`,
  ],
};

export default docs;
