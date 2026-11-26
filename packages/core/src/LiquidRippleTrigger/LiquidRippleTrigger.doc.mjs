export const docs = {
  name: 'LiquidRippleTrigger',
  displayName: 'Liquid Ripple Trigger',
  group: 'Shader & Optical FX',
  category: 'shader-optical-fx',
  keywords: ['ripple', 'shockwave', 'displacement', 'liquid', 'click-fx', 'shader', 'interactive'],
  usage: {
    description:
      'Interactive click- and keyboard-originated displacement shader wrapper sending a brief refractive shockwave ripple outward across buttons, cards, or optical workspace surfaces. Caps concurrent DOM rings (`maxRipples`) and cleans all timers and WebGL resources on unmount.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Wrap interactive tiles, primary CTA cards, or wallpaper triggers to provide tactile physical wave feedback on pointer press or keyboard activation.',
      },
      {
        guidance: false,
        description:
          'Do not rely solely on visual ripples to confirm state changes; pair with accessible ARIA state or polite live feedback.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Activation, IME Safety & Reduced-Motion Support',
        criterion: '2.1.1 Keyboard & 2.3.3 Animation from Interactions',
        requirement:
          'Responds to both pointer clicks and IME-safe Enter/Space keyboard events (`!e.nativeEvent.isComposing`), marks ripple rings `aria-hidden="true"`, and disables wave animation under `prefers-reduced-motion: reduce`.',
        description:
          'Delivers consistent tactile feedback for pointer and keyboard users without leaking timers.',
      },
    ],
  },
  props: [
    { name: 'intensity', type: 'number', defaultValue: '0.9', description: 'Shockwave displacement luminosity (0–1.5).' },
    { name: 'durationMs', type: 'number', defaultValue: '750', description: 'Wave duration in milliseconds (clamped 250–1800).' },
    { name: 'maxRipples', type: 'number', defaultValue: '3', description: 'Maximum concurrent wave rings (clamped 1–4).' },
    { name: 'onRipple', type: '(origin: RippleOriginEvent) => void', defaultValue: 'undefined', description: 'Fires with click/keyboard normalized coordinates on wave launch.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables wave launches.' },
  ],
};
