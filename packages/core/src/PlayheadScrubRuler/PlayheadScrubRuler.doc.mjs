export const docs = {
  name: 'PlayheadScrubRuler',
  displayName: 'Playhead Scrub Ruler',
  group: 'Timeline & Sequencing',
  category: 'timeline-sequencing',
  keywords: [
    'playhead',
    'scrub',
    'scrubber',
    'ruler',
    'timeline',
    'sequencing',
    'timecode',
    'fps',
    'frame',
    'snap',
    'cue',
    'marker',
    'needle',
    'daw',
    'nle',
    'slider',
  ],
  usage: {
    description:
      'Optical-glass prism-slab timeline scrub ruler with a live MM:SS:FF timecode readout pill, frame-snap badge, total duration display, evenly calibrated major/minor SVG graduation ticks with monospace timestamps, a sculpted --prism-primary-main playhead cap and full-height vertical hairline extending across the track lane stage, clickable semantic cue marker flags, and full pointer + IME-safe keyboard scrubbing.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass controlled timeSec and onTimeChange when synchronizing the playhead with TransportControlBar, audio/video playback engines, or keyframe lanes rendered inside children.',
      },
      {
        guidance: true,
        description:
          'Keep snapToFrame enabled with the project fps (such as 24, 30, or 60) for frame-accurate NLE/motion-design editing, or set snapToFrame={false} for continuous sub-frame audio scrubbing.',
      },
      {
        guidance: false,
        description:
          'Hardcode hex or rgb accent colors on markers or custom needles; assign semantic RulerMarker tones (primary, secondary, emerald, amber, rose) so flags inherit active --prism-* theme tokens.',
      },
    ],
    accessibility: [
      {
        name: 'Calibrated WAI-ARIA Playhead Slider',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement:
          'Ruler track exposes role="slider" with aria-label="Timeline playhead", aria-valuemin, aria-valuemax, aria-valuenow, and formatted MM:SS:FF aria-valuetext',
        description:
          'Supports ArrowLeft/ArrowRight/ArrowDown/ArrowUp (±1 frame when snapToFrame or ±0.1s when free), Shift+Arrow (±1s), PageUp/PageDown (±5s), and Home/End bounds while guarding IME composition, modifier chords, and disabled state.',
      },
      {
        name: 'Non-Nested Clickable Cue Marker Rail',
        criterion: '1.3.1 Info and Relationships & 2.4.7 Focus Visible',
        requirement:
          'Cue marker flags render inside a sibling role="group" with descriptive aria-label timestamps and keyboard-only prism-focus-ring outlines',
        description:
          'Keeps interactive marker buttons outside the role="slider" element to satisfy WAI-ARIA nested-interactive constraints while visually pinning flags directly to their timeline coordinates.',
      },
      {
        name: 'Live Timecode Status Pill',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Header timecode pill uses role="status" with aria-live="polite" and tabular-nums formatting',
        description:
          'Announces updated MM:SS:FF positions politely to assistive technologies during keyboard stepping and cue marker jumps.',
      },
    ],
  },
  props: [
    {
      name: 'durationSec',
      type: 'number',
      defaultValue: '60',
      description:
        'Total timeline duration in seconds, clamped to >= 1. Determines major/minor graduation intervals and slider upper bound.',
    },
    {
      name: 'timeSec',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled playhead position in seconds.',
    },
    {
      name: 'defaultTimeSec',
      type: 'number',
      defaultValue: '0',
      description: 'Initial playhead position in seconds for uncontrolled usage.',
    },
    {
      name: 'fps',
      type: 'number',
      defaultValue: '30',
      description:
        'Frame rate clamped to 1..120, used for 1/fps frame snapping and MM:SS:FF timecode formatting.',
    },
    {
      name: 'snapToFrame',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Snaps pointer scrubbing and ArrowLeft/ArrowRight stepping to exact 1/fps frames when true, or allows continuous 0.1s arrow stepping when false.',
    },
    {
      name: 'markers',
      type: 'ReadonlyArray<RulerMarker>',
      defaultValue: 'undefined',
      description:
        'Optional clickable cue marker flags ({ id, timeSec, label, tone? }) pinned on the ruler that jump the playhead directly to marker.timeSec.',
    },
    {
      name: 'trackStageHeight',
      type: 'number',
      defaultValue: '96',
      description:
        'Minimum height in pixels of the lane drop-line region underneath the ruler, clamped to 48..280.',
    },
    {
      name: 'onTimeChange',
      type: '(timeSec: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired whenever pointer clicks, drags, keyboard navigation, or cue marker jumps move the playhead.',
    },
    {
      name: 'onSelectMarker',
      type: '(marker: RulerMarker) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when a pinned cue marker flag is activated.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description:
        'Optional track lanes or clip strips rendered beneath the continuous full-height vertical playhead needle.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables pointer scrubbing, keyboard stepping, and cue marker buttons.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline style overrides.',
    },
  ],
  examples: [
    `<PlayheadScrubRuler\n  durationSec={60}\n  defaultTimeSec={12}\n  fps={30}\n  snapToFrame\n  markers={[\n    { id: 'intro', timeSec: 4, label: 'Intro Beat', tone: 'secondary' },\n    { id: 'drop', timeSec: 24, label: 'Chorus Drop', tone: 'emerald' },\n    { id: 'outro', timeSec: 52, label: 'Fade Cue', tone: 'amber' },\n  ]}\n  onTimeChange={(nextSec) => console.warn('Time:', nextSec)}\n  onSelectMarker={(marker) => console.warn('Marker:', marker.id)}\n>\n  <div className="space-y-2">\n    <div className="prism-crystal rounded-lg px-3 py-2 text-xs">Video Track A</div>\n    <div className="prism-crystal rounded-lg px-3 py-2 text-xs">Dialogue Mix</div>\n  </div>\n</PlayheadScrubRuler>`,
    `<PlayheadScrubRuler\n  durationSec={120}\n  timeSec={playheadSec}\n  fps={24}\n  snapToFrame={false}\n  trackStageHeight={140}\n  onTimeChange={setPlayheadSec}\n/>`,
  ],
};
