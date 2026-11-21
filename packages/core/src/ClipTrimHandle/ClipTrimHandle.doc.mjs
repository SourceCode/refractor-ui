export const docs = {
  name: 'ClipTrimHandle',
  displayName: 'Clip Trim & Fade Handle',
  group: 'Timeline & Sequencing',
  category: 'timeline-sequencing',
  keywords: [
    'clip',
    'trim',
    'handle',
    'fade',
    'fade-in',
    'fade-out',
    'razor',
    'split',
    'cut',
    'timeline',
    'sequencer',
    'nle',
    'video',
    'audio',
    'in-out',
  ],
  usage: {
    description:
      'Optical-glass timeline clip trim, fade-ramp, and razor-split inspector inside a prism-slab card. Features dimmed source head/tail handles, an active prism-crystal clip body with live SVG quadratic fade-in/fade-out overlay curves, four independent WAI-ARIA slider handles (In-Point, Out-Point, Fade-In, Fade-Out) with window pointer dragging and keyboard stepping, Select/Razor Split mode toggling with midpoint slicing, and a recessed prism-well telemetry bar.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use ClipTrimHandle in NLE video editors, DAW clip inspectors, and timeline sequencers where users trim media in/out boundaries, sculpt fade-in/fade-out envelopes, and slice clips into segments.',
      },
      {
        guidance: true,
        description:
          'Set minClipSec to protect minimum playable frame durations and subscribe to both onChange and onSplit to persist non-destructive edit decision lists (EDLs).',
      },
      {
        guidance: false,
        description:
          'Use ClipTrimHandle for generic numeric range filtering without fade ramps or razor splits; use DualThumbSlider or BrushRangeScrubber instead.',
      },
    ],
    accessibility: [
      {
        name: 'Quad WAI-ARIA Slider Handles & Keyboard Parity',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes four independent role="slider" controls ("Trim clip start", "Trim clip end", "Adjust fade in", "Adjust fade out") with live aria-valuemin, aria-valuemax, aria-valuenow, aria-valuetext, and Arrow (0.5s), Shift+Arrow (0.1s), PageUp/PageDown (2s), and Home/End stepping',
        description:
          'Gives keyboard-only editors full precision over trim boundaries and fade curves while keeping fadeIn + fadeOut <= outSec - inSec and guarding against active IME composition.',
      },
      {
        name: 'Toggle Tool Semantics, Keyboard Focus Rings & Window Listener Hygiene',
        criterion: '2.4.7 Focus Visible, 2.5.1 Pointer Gestures & 4.1.2 Name, Role, Value',
        requirement:
          'Uses aria-pressed on the Select/Razor Split tool toggle, prism-focus-ring keyboard-only outlines, tabIndex=-1 when disabled, and guaranteed window pointer listener cleanup on pointerup, pointercancel, disable, and unmount',
        description:
          'Prevents leaked window drag listeners across unmounts, suppresses focus rings during pointer interaction, and exposes Split at Midpoint as a keyboard-accessible alternative to canvas clicking.',
      },
    ],
  },
  props: [
    {
      name: 'label',
      type: 'string',
      defaultValue: 'required',
      description: 'Clip title shown in the optical inspector header and linked via aria-labelledby.',
    },
    {
      name: 'totalDurationSec',
      type: 'number',
      defaultValue: '30',
      description: 'Source media duration in seconds, clamped to >= 1.',
    },
    {
      name: 'inSec',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled trim start (in-point) in seconds.',
    },
    {
      name: 'defaultInSec',
      type: 'number',
      defaultValue: '3',
      description: 'Initial trim start (in-point) in seconds for uncontrolled usage.',
    },
    {
      name: 'outSec',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled trim end (out-point) in seconds.',
    },
    {
      name: 'defaultOutSec',
      type: 'number',
      defaultValue: '25',
      description: 'Initial trim end (out-point) in seconds for uncontrolled usage.',
    },
    {
      name: 'fadeInSec',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled fade-in ramp duration in seconds.',
    },
    {
      name: 'defaultFadeInSec',
      type: 'number',
      defaultValue: '2',
      description: 'Initial fade-in ramp duration in seconds for uncontrolled usage.',
    },
    {
      name: 'fadeOutSec',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled fade-out ramp duration in seconds.',
    },
    {
      name: 'defaultFadeOutSec',
      type: 'number',
      defaultValue: '2.5',
      description: 'Initial fade-out ramp duration in seconds for uncontrolled usage.',
    },
    {
      name: 'minClipSec',
      type: 'number',
      defaultValue: '1',
      description: 'Minimum enforced active clip duration in seconds, clamped to [0.1..totalDurationSec].',
    },
    {
      name: 'tone',
      type: "'primary' | 'secondary' | 'emerald' | 'amber' | 'rose'",
      defaultValue: "'primary'",
      description: 'Semantic --prism-* optical color tone applied to trim borders, fade strokes, and badges.',
    },
    {
      name: 'onChange',
      type: '(state: ClipTrimState) => void',
      defaultValue: 'undefined',
      description: 'Callback emitted with the full normalized `{ inSec, outSec, fadeInSec, fadeOutSec, splits }` state.',
    },
    {
      name: 'onSplit',
      type: '(splitAtSec: number, leftDurationSec: number, rightDurationSec: number) => void',
      defaultValue: 'undefined',
      description: 'Callback emitted whenever a razor split inserts a cut line inside the active clip.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all trim handles, fade handles, razor slicing, tool toggling, and reset actions.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<ClipTrimHandle\n  label="A004_OpticalIntro_4K.mov"\n  totalDurationSec={30}\n  defaultInSec={3}\n  defaultOutSec={25}\n  defaultFadeInSec={2}\n  defaultFadeOutSec={2.5}\n  tone="primary"\n  onChange={(state) => console.warn(state)}\n  onSplit={(at, left, right) => console.warn(at, left, right)}\n/>`,
    `<ClipTrimHandle\n  label="VO_Narration_Master.wav"\n  totalDurationSec={45}\n  inSec={state.inSec}\n  outSec={state.outSec}\n  fadeInSec={state.fadeInSec}\n  fadeOutSec={state.fadeOutSec}\n  tone="emerald"\n  onChange={setState}\n/>`,
  ],
};
