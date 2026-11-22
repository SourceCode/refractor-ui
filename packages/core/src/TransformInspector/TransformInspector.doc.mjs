export const docs = {
  name: 'TransformInspector',
  displayName: 'Transform Inspector',
  group: 'Design, 3D & Shader Inspector Controls',
  category: 'design-3d-shader',
  keywords: [
    'transform',
    'inspector',
    '3d',
    'position',
    'rotation',
    'scale',
    'vector3',
    'xyz',
    'aspect-ratio',
    'chain-lock',
    'translate3d',
    'rotate3d',
    'scale3d',
    'shader',
    'optical-glass',
  ],
  usage: {
    description:
      'Sculpted prism-slab 3D Transform Inspector exposing Position, Rotation (°), and Scale rows with color-coded semantic X/Y/Z axis input wells (--prism-error-main, --prism-success-main, --prism-info-main), IME-safe ArrowUp/ArrowDown stepping (Shift ×10), per-row and Reset All controls, a tactile Scale Aspect-Ratio Chain Lock toggle for proportional scaling, and a compact aria-live="polite" translate3d/rotate3d/scale3d CSS telemetry readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep scaleLocked enabled by default for spatial meshes, optical cards, and 3D primitives so scaling one axis maintains exact proportions until the author explicitly unlocks non-uniform distortion.',
      },
      {
        guidance: true,
        description:
          'Configure positionUnit (e.g. "px", "rem", "m", or "cm") to match the active canvas or 3D scene coordinate space so both the Position badge and translate3d telemetry remain self-documenting.',
      },
      {
        guidance: false,
        description:
          'Replace the semantic --prism-error-main / --prism-success-main / --prism-info-main axis tokens with hardcoded hex RGB values; token-driven color coding guarantees high contrast across all light and dark Refractor themes.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Spinbutton Semantics & IME-Safe Stepping',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each axis input exposes role="spinbutton" with htmlFor-linked accessible names ("Position X" through "Scale Z"), aria-valuenow/min/max/valuetext, keyboard-only prism-focus-ring outlines, and IME-guarded ArrowUp/ArrowDown (Shift ×10), Enter, and Escape key handling',
        description:
          'Allows full keyboard-only 3D transform editing with coarse Shift increments while preventing IME composition commits from being hijacked.',
      },
      {
        name: 'Toggle State & Polite Live Telemetry Readout',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Exposes aria-pressed and aria-label="Lock uniform scale aspect ratio" on the chain-lock toggle and publishes live translate3d/rotate3d/scale3d updates inside an aria-live="polite" status bar',
        description:
          'Screen reader users receive immediate confirmation of scale lock state and composed 3D transform coordinates without interrupting input focus.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'Transform3DState',
      defaultValue: 'undefined',
      description:
        'Controlled 3D transform state containing position, rotation, scale Vector3D coordinates and scaleLocked boolean.',
    },
    {
      name: 'defaultValue',
      type: 'Partial<Transform3DState>',
      defaultValue: '{ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, scaleLocked: true }',
      description:
        'Initial partial or complete 3D transform state in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(state: Transform3DState) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the sanitized Transform3DState whenever any axis value, scale lock toggle, or reset control changes state.',
    },
    {
      name: 'positionUnit',
      type: 'string',
      defaultValue: "'px'",
      description:
        'Unit suffix shown beside Position and formatted into translate3d(...) telemetry.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'3D Transform Inspector'",
      description:
        'Inspector header title and accessible region label.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all nine axis spinbutton inputs, the aspect-ratio chain lock button, and reset controls.',
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
    `<TransformInspector\n  title="Hero Prism Mesh"\n  positionUnit="px"\n  onChange={(state) => console.warn(state)}\n/>`,
    `<TransformInspector\n  defaultValue={{\n    position: { x: 24, y: -12, z: 8 },\n    rotation: { x: 15, y: 30, z: 0 },\n    scale: { x: 1.25, y: 1.25, z: 1.25 },\n    scaleLocked: true,\n  }}\n  positionUnit="rem"\n/>`,
  ],
};

export default docs;
