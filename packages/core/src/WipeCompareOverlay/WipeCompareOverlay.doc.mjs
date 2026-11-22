export const docs = {
  name: 'WipeCompareOverlay',
  displayName: 'Wipe Compare Overlay',
  group: 'Photo & Color Grading Controls',
  category: 'photo-color-grading',
  keywords: [
    'wipe',
    'compare',
    'overlay',
    'split',
    'before-after',
    'color-grading',
    'lut',
    'log-c',
    'bypass',
    'original',
    'photo',
    'video',
    'vertical',
    'horizontal',
    'inspection',
  ],
  usage: {
    description:
      'Optical-glass color grading wipe comparison surface inside a prism-slab card with Vertical and Horizontal split-wipe orientations, a 50 / 50 quick center action, a signature press-and-hold "Hold to Compare Original" bypass button with a live BYPASSED · ORIGINAL indicator, a draggable and keyboard-accessible crystal wipe puck, rich token-driven Log-C vs. Prism LUT default frames, and a recessed aria-live="polite" telemetry status bar.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use WipeCompareOverlay in photo editors, color grading suites, and LUT preview studios where colorists need both split-screen wipe inspection and momentary full-frame original bypass.',
      },
      {
        guidance: true,
        description:
          'Bind positionPct, orientation, and onHoldCompareChange when coordinating external scopes (waveform, vectorscope, histogram) with live wipe or bypass states.',
      },
      {
        guidance: false,
        description:
          'Mutate the saved wipe split position when Hold to Compare Original is active; WipeCompareOverlay preserves the split percentage and snaps back automatically upon release.',
      },
    ],
    accessibility: [
      {
        name: 'Dual-Axis WAI-ARIA Wipe Slider & Stepped Keyboard Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="slider" ("Compare split wipe position") with aria-orientation, aria-valuemin=0, aria-valuemax=100, aria-valuenow, ArrowLeft/ArrowRight (vertical mode) or ArrowUp/ArrowDown (horizontal mode) at ±2% (Shift ±10%), and Home/End shortcuts',
        description:
          'Provides full keyboard precision across both wipe orientations while guarding against active IME composition and disabling tab focus when disabled.',
      },
      {
        name: 'Press-and-Hold Safety Bypass & Polite Live Telemetry',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Hold to Compare Original supports pointer down plus Space/Enter hold with cleanup on pointerup, pointercancel, blur, disable, and unmount; status bar announces live split percentage or "Holding Original Bypass" via aria-live="polite"',
        description:
          'Ensures assistive technologies receive real-time feedback during wipe adjustments and bypass comparisons without leaked window listeners or sticky bypass states.',
      },
    ],
  },
  props: [
    {
      name: 'positionPct',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled wipe split percentage clamped to [0..100].',
    },
    {
      name: 'defaultPositionPct',
      type: 'number',
      defaultValue: '50',
      description: 'Initial wipe split percentage in [0..100] for uncontrolled usage.',
    },
    {
      name: 'onPositionChange',
      type: '(positionPct: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the normalized split percentage whenever dragged, stepped via keyboard, or centered.',
    },
    {
      name: 'orientation',
      type: "'vertical' | 'horizontal'",
      defaultValue: 'undefined',
      description: 'Controlled wipe axis orientation.',
    },
    {
      name: 'defaultOrientation',
      type: "'vertical' | 'horizontal'",
      defaultValue: "'vertical'",
      description: 'Initial wipe axis orientation for uncontrolled usage.',
    },
    {
      name: 'onOrientationChange',
      type: '(orientation: WipeOrientation) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when toggling between vertical and horizontal wipe orientations.',
    },
    {
      name: 'beforeLabel',
      type: 'string',
      defaultValue: "'Original (Log-C)'",
      description: 'Floating corner badge text for the ungraded/original layer.',
    },
    {
      name: 'afterLabel',
      type: 'string',
      defaultValue: "'Graded (Prism LUT)'",
      description: 'Floating corner badge text for the color-graded layer.',
    },
    {
      name: 'beforeContent',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Custom React node rendered in the clipped original layer (renders a rich Log-C optical frame if omitted).',
    },
    {
      name: 'afterContent',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Custom React node rendered in the full-bleed graded layer (renders a rich Prism LUT optical frame if omitted).',
    },
    {
      name: 'onHoldCompareChange',
      type: '(holdingOriginal: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with true when Hold to Compare Original engages and false upon release or cleanup.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables wipe dragging, keyboard adjustments, orientation toggle, 50 / 50 reset, and hold-to-compare bypass.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<WipeCompareOverlay\n  defaultPositionPct={50}\n  defaultOrientation="vertical"\n  beforeLabel="Original (Log-C)"\n  afterLabel="Graded (Prism LUT)"\n  onPositionChange={(pct) => console.warn(pct)}\n  onHoldCompareChange={(holding) => console.warn(holding)}\n/>`,
    `<WipeCompareOverlay\n  positionPct={split}\n  orientation={axis}\n  onPositionChange={setSplit}\n  onOrientationChange={setAxis}\n  beforeContent={<img src="/frames/logc.jpg" alt="Log-C source frame" className="w-full h-full object-cover" />}\n  afterContent={<img src="/frames/graded.jpg" alt="Graded output frame" className="w-full h-full object-cover" />}\n/>`,
  ],
};

export default docs;
