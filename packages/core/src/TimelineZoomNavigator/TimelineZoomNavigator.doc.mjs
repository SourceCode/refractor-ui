export const docs = {
  name: 'TimelineZoomNavigator',
  displayName: 'Timeline Zoom Navigator',
  group: 'Timeline & Sequencing',
  category: 'timeline-sequencing',
  keywords: [
    'timeline',
    'zoom',
    'navigator',
    'viewport',
    'pan',
    'overview',
    'minimap',
    'waveform',
    'playhead',
    'sequencing',
    'nle',
    'daw',
  ],
  usage: {
    description:
      'Optical-glass timeline overview and zoom navigator bar inside a prism-slab card featuring a live zoom factor pill, Zoom Out (-), Fit All (1.0×), and Zoom In (+) header controls, a recessed prism-well overview track with miniature activity/waveform peaks, an optional tangerine playhead hairline, a draggable/keyboard-pannable viewport window thumb, dual start/end zoom end-cap sliders, and a tabular visible-span time footer.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Bind windowRange and onWindowChange in controlled mode to synchronize horizontal zoom and pan position across sibling multi-track timelines, waveform lanes, and keyframe editors.',
      },
      {
        guidance: true,
        description:
          'Pass miniature normalized activity peaks (0..1) and playheadPct so editors retain spatial orientation across long timelines even when zoomed in up to 50×.',
      },
      {
        guidance: false,
        description:
          'Hardcode hex or rgb accent colors for playheads or handles; TimelineZoomNavigator inherits exclusively from --prism-* optical glass tokens so light, dark, and custom prism themes stay coherent.',
      },
    ],
    accessibility: [
      {
        name: 'Dual WAI-ARIA Zoom End-Cap Sliders',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement:
          'Left and right end-cap handles expose role="slider" with aria-label="Zoom timeline start" / "Zoom timeline end" and live aria-valuemin, aria-valuemax, aria-valuenow, and aria-valuetext',
        description:
          'Supports ArrowLeft/ArrowRight/ArrowUp/ArrowDown (1%, Shift 5%), PageUp/PageDown (10%), and Home/End stepping while strictly enforcing minWindowPct bounds and guarding IME composition.',
      },
      {
        name: 'Keyboard-Pannable Viewport Window',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Middle viewport pill exposes role="group" with aria-label="Pan timeline window" and ArrowLeft/ArrowRight/PageUp/PageDown/Home/End keyboard panning',
        description:
          'Shifts the active viewport cleanly within 0..100% while preserving the exact zoom span, displaying keyboard-only prism-focus-ring outlines.',
      },
      {
        name: 'Live Visible Span Readout & Window Listener Hygiene',
        criterion: '4.1.3 Status Messages & 2.5.1 Pointer Gestures',
        requirement:
          'Compact tabular footer announces visible start, end, and duration via aria-live="polite", and pointer drags cleanly detach window listeners on pointerup, pointercancel, disable, and unmount',
        description:
          'Ensures screen-reader parity for zoom and pan updates while preventing leaked global listeners during dynamic editor layout changes.',
      },
    ],
  },
  props: [
    {
      name: 'totalDurationSec',
      type: 'number',
      defaultValue: '120',
      description:
        'Total timeline duration in seconds used to compute visible start, end, and span timestamps (clamped >= 1).',
    },
    {
      name: 'windowRange',
      type: 'TimelineViewportWindow',
      defaultValue: 'undefined',
      description:
        'Controlled viewport window { startPct, endPct } in 0..100 percentage coordinates.',
    },
    {
      name: 'defaultWindowRange',
      type: 'TimelineViewportWindow',
      defaultValue: '{ startPct: 10, endPct: 60 }',
      description:
        'Initial uncontrolled viewport window { startPct, endPct } in 0..100 percentage coordinates.',
    },
    {
      name: 'minWindowPct',
      type: 'number',
      defaultValue: '5',
      description:
        'Minimum viewport span percentage clamped to 2..50 (2% corresponds to 50× maximum zoom).',
    },
    {
      name: 'playheadPct',
      type: 'number',
      defaultValue: 'undefined',
      description:
        'Optional playhead indicator offset (0..100) rendered as a tangerine vertical hairline across the overview track.',
    },
    {
      name: 'peaks',
      type: 'ReadonlyArray<number>',
      defaultValue: 'undefined',
      description:
        'Optional normalized miniature timeline activity or waveform amplitudes (0..1) rendered behind the viewport thumb; falls back to a deterministic envelope when omitted or empty.',
    },
    {
      name: 'onWindowChange',
      type: '(windowRange: TimelineViewportWindow, zoomFactor: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever the viewport window changes via header zoom buttons, handle dragging, viewport panning, track click, or keyboard navigation.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Timeline Navigator'",
      description: 'Visible header heading and accessible region label.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all zoom buttons, pointer dragging, and keyboard interactions.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<TimelineZoomNavigator\n  label="Sequence Navigator"\n  totalDurationSec={120}\n  defaultWindowRange={{ startPct: 10, endPct: 60 }}\n  playheadPct={32}\n  onWindowChange={(win, zoom) => console.warn(win, zoom)}\n/>`,
    `<TimelineZoomNavigator\n  label="Master Timeline"\n  totalDurationSec={300}\n  windowRange={viewport}\n  minWindowPct={2}\n  playheadPct={48.5}\n  peaks={[0.25, 0.62, 0.9, 0.44, 0.78, 0.51, 0.84, 0.36]}\n  onWindowChange={(nextWindow) => setViewport(nextWindow)}\n/>`,
  ],
};
