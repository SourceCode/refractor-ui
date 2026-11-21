export const docs = {
  name: 'MultiTrackTimeline',
  displayName: 'Multi-Track Timeline',
  group: 'Timeline & Sequencing',
  category: 'timeline-sequencing',
  keywords: [
    'timeline',
    'multi-track',
    'tracks',
    'sequencing',
    'clips',
    'playhead',
    'ruler',
    'video',
    'audio',
    'effect',
    'subtitle',
    'nle',
    'daw',
    'mute',
    'lock',
  ],
  usage: {
    description:
      'Optical-glass prism-slab multi-track timeline workspace featuring a synchronized header timecode readout, track and clip counter, 1×/2×/4× zoom controls, responsive track label rail with kind indicator dots and Mute (M)/Lock (L) toggles, scrollable clickable and keyboard-scrubbable time ruler with a full-height tangerine playhead indicator, positioned interactive optical clip pills, and a recessed aria-live="polite" inspector.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Bind currentTimeSec and onTimeChange in controlled mode when synchronizing the timeline playhead with sibling TransportControlBar, TimecodeScrubber, or media playback engines.',
      },
      {
        guidance: true,
        description:
          'Categorize lanes with kind ("video" | "audio" | "effect" | "subtitle") so indicator dots and optical clip pills automatically cascade through semantic --prism-* theme tokens.',
      },
      {
        guidance: false,
        description:
          'Allow edits or selection callbacks on locked tracks; set locked: true on protected lanes so clips render disabled styling and ignore selection activation.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Scrubbable Time Ruler & IME-Safe Clip Activation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Ruler exposes role="slider" with ArrowLeft/ArrowRight (±1s, Shift ±5s), Home/End jumps; clips render as native buttons with aria-pressed, disabled state on locked tracks, and IME-guarded Enter/Space activation',
        description:
          'Enables full non-pointer timeline scrubbing and clip inspection while protecting CJK/IME composition sessions and surfacing keyboard-only prism-focus-ring outlines.',
      },
      {
        name: 'Polite Live Inspector & Empty State Status',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Recessed inspector exposes aria-live="polite" for active clip details or playhead summaries; empty tracks render a role="status" message',
        description:
          'Keeps assistive technologies informed as users select clips or scrub across sequence boundaries without interrupting ongoing narration.',
      },
    ],
  },
  props: [
    {
      name: 'tracks',
      type: 'ReadonlyArray<TimelineTrack>',
      defaultValue: 'required',
      description:
        'Ordered sequence tracks (video, audio, effect, subtitle) with optional muted/locked flags and positioned clips.',
    },
    {
      name: 'durationSec',
      type: 'number',
      defaultValue: 'derived (max clip end or 60)',
      description:
        'Total timeline duration in seconds; derived from the latest clip end or 60 when omitted, clamped >= 1.',
    },
    {
      name: 'currentTimeSec',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled playhead position in seconds.',
    },
    {
      name: 'defaultCurrentTimeSec',
      type: 'number',
      defaultValue: '0',
      description: 'Initial playhead position in seconds in uncontrolled mode.',
    },
    {
      name: 'onTimeChange',
      type: '(timeSec: number) => void',
      defaultValue: 'undefined',
      description: 'Invoked when the playhead moves via ruler click or keyboard scrubbing.',
    },
    {
      name: 'selectedClipId',
      type: 'string | null',
      defaultValue: 'undefined',
      description: 'Controlled selected clip ID highlighted across lanes and reflected in the inspector.',
    },
    {
      name: 'onSelectClip',
      type: '(clip: TimelineClip, track: TimelineTrack) => void',
      defaultValue: 'undefined',
      description: 'Invoked when an unlocked clip pill is clicked or activated via Enter/Space.',
    },
    {
      name: 'onToggleTrackMute',
      type: '(trackId: string, muted: boolean) => void',
      defaultValue: 'undefined',
      description: 'Invoked when a track Mute (M) toggle button is clicked.',
    },
    {
      name: 'onToggleTrackLock',
      type: '(trackId: string, locked: boolean) => void',
      defaultValue: 'undefined',
      description: 'Invoked when a track Lock (L) toggle button is clicked.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Sequence Multi-Track Timeline'",
      description: 'Visible workspace header title and default region aria-label.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<MultiTrackTimeline\n  title="Launch Film Sequence"\n  durationSec={60}\n  defaultCurrentTimeSec={12.5}\n  tracks={[\n    { id: 'v1', name: 'Camera A', kind: 'video', clips: [{ id: 'c1', label: 'Opening Shot', startSec: 0, durationSec: 18 }, { id: 'c2', label: 'Product Reveal', startSec: 20, durationSec: 24 }] },\n    { id: 'a1', name: 'Master Audio', kind: 'audio', clips: [{ id: 'c3', label: 'Ambient Score', startSec: 0, durationSec: 54 }] },\n    { id: 'fx1', name: 'Optical Grade', kind: 'effect', clips: [{ id: 'c4', label: 'Caustic Bloom', startSec: 16, durationSec: 12 }] },\n    { id: 'sub1', name: 'Captions EN', kind: 'subtitle', clips: [{ id: 'c5', label: 'Intro VO', startSec: 2, durationSec: 9 }] },\n  ]}\n/>`,
  ],
};
