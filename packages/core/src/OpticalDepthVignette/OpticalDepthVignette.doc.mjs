export const docs = {
  name: 'OpticalDepthVignette',
  displayName: 'Optical Depth Vignette',
  group: 'Shader & Optical FX',
  category: 'shader-optical-fx',
  keywords: ['vignette', 'depth-of-field', 'dof', 'blur', 'focus-management', 'modal-backdrop', 'shader'],
  usage: {
    description:
      'Focus-management depth-of-field optical vignette shader that progressively blurs and dims background windows or inactive canvas layers around a configurable focal aperture when a modal, spotlight, or approval gate opens. Registers global Escape dismiss strictly while `active` is true.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Wrap inactive workspace views in `children` and mount the active spotlight or approval card inside `foreground` to establish crisp optical depth hierarchy.',
      },
      {
        guidance: false,
        description:
          'Avoid animating blur radius every frame; toggle `active` to leverage GPU-accelerated transition states.',
      },
    ],
    accessibility: [
      {
        name: 'Guarded Escape Dismiss & Background Invisibility',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Marks obscured background layers `aria-hidden="true"` when `active && foreground`, attaches Escape dismissal strictly when `active && onDismiss`, and ignores IME composing Escape events.',
        description:
          'Prevents screen readers from wandering into dimmed background controls and eliminates orphaned key listeners.',
      },
    ],
  },
  props: [
    { name: 'active', type: 'boolean', defaultValue: 'true', description: 'Activates background depth-of-field blur and vignette dimming.' },
    { name: 'focusX', type: 'number', defaultValue: '0.5', description: 'Normalized horizontal focal point (0–1).' },
    { name: 'focusY', type: 'number', defaultValue: '0.5', description: 'Normalized vertical focal point (0–1).' },
    { name: 'aperture', type: 'number', defaultValue: '0.36', description: 'Clear focal radius before falloff begins (0.15–0.85).' },
    { name: 'blurPx', type: 'number', defaultValue: '8', description: 'Background depth-of-field blur radius in pixels (0–20).' },
    { name: 'dimOpacity', type: 'number', defaultValue: '0.58', description: 'Outer optical dim opacity (0–0.85).' },
    { name: 'onDismiss', type: '() => void', defaultValue: 'undefined', description: 'Called on Escape press or vignette veil click while active.' },
  ],
};
