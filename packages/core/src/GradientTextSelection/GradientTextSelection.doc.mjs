export const docs = {
  name: 'GradientTextSelection',
  displayName: 'Gradient Text Selection & Caret',
  group: 'Dynamic Gradient & AI-Glow FX',
  category: 'gradient-ai-glow-fx',
  keywords: ['caret', 'cursor', 'selection', 'gradient-text', 'highlight', 'prompt', 'input'],
  usage: {
    description:
      'Custom-styled spectrum blinking caret and gradient text-selection highlight supporting both interactive editable inputs (`mode="editable"`) and selectable prose surfaces (`mode="prose"`). Features IME-safe Enter submission and zero raw color literals.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use in AI prompt inputs or editorial callouts where tactile spectrum selection reinforces active focus while preserving native clipboard copy/paste and screen-reader semantics.',
      },
      {
        guidance: false,
        description:
          'Do not override the underlying native `<input>` semantics; the visual gradient caret layer stays strictly `aria-hidden="true"` and synchronized to `selectionStart`/`selectionEnd`.',
      },
    ],
    accessibility: [
      {
        name: 'Native Input & IME-Safe Keyboard Semantics',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Uses a real labelled `<input type="text">` with keyboard-only `.prism-focus-ring` and guards Enter submission with `!e.nativeEvent.isComposing`.',
        description:
          'Guarantees full screen-reader, clipboard, mobile touch-selection, and CJK IME compatibility.',
      },
    ],
  },
  props: [
    { name: 'mode', type: "'editable' | 'prose'", defaultValue: "'editable'", description: 'Switches between interactive gradient-caret input and selectable prose highlight.' },
    { name: 'value', type: 'string', defaultValue: 'undefined', description: 'Controlled input text value.' },
    { name: 'defaultValue', type: 'string', defaultValue: "'Synthesize optical shaders...'", description: 'Initial uncontrolled text value.' },
    { name: 'palette', type: "'spectrum' | 'aurora' | 'solar'", defaultValue: "'spectrum'", description: 'Spectrum gradient palette for caret and selection fill.' },
    { name: 'onSubmit', type: '(value: string) => void', defaultValue: 'undefined', description: 'Called on IME-safe Enter submission.' },
  ],
};
