export const docs = {
  name: 'CustomVideoPlayer',
  displayName: 'Custom Video Player',
  group: 'Media, Audio & Spatial Controls',
  category: 'media-spatial',
  keywords: [
    'video',
    'player',
    'media',
    'chapters',
    'captions',
    'subtitles',
    'fullscreen',
    'scrubber',
    'playback',
    'speed',
  ],
  usage: {
    description:
      'Optical-glass video player built on a prism-slab shell with sanitized media and poster URLs, native video or crisp optical preview stage fallback, timeline range scrubber with clickable chapter markers and chapter pill strip, tabular MM:SS timing, playback speed cycling, volume and mute controls, frosted subtitle captions pill, and resilient fullscreen toggling.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Supply chapters with monotonically increasing timeSeconds so viewers can scan topics via both timeline markers and the chapter pill strip.',
      },
      {
        guidance: true,
        description:
          'Provide a descriptive title and optional captionsText so both the optical preview stage and frosted subtitle overlay communicate live media context clearly.',
      },
      {
        guidance: false,
        description:
          'Pass unsanitized javascript: or unvalidated URLs to raw media tags; CustomVideoPlayer strips unsafe protocols automatically via sanitizeUrl.',
      },
    ],
    accessibility: [
      {
        name: 'Timeline & Volume Sliders',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Native range inputs with accessible labels, bounded min/max, and aria-valuetext',
        description:
          'Both the timeline scrubber and volume control use native range inputs with keyboard focus-visible indicators and tabular MM:SS value announcements.',
      },
      {
        name: 'Toggle & Live Caption Semantics',
        criterion: '4.1.3 Status Messages & 2.1.1 Keyboard',
        requirement: 'aria-pressed toggles for play, mute, captions, fullscreen, and active chapters',
        description:
          'Every transport control exposes an accessible name and aria-pressed state, while captions and playback status announce politely via role="status".',
      },
    ],
  },
  props: [
    {
      name: 'src',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Video stream URL sanitized strictly via sanitizeUrl(src, false). Renders optical preview stage when omitted or unsafe.',
    },
    {
      name: 'poster',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Poster preview image URL sanitized via sanitizeUrl(poster, true).',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Optical Media Stream'",
      description: 'Media title displayed on the stage and bound as the region accessible name.',
    },
    {
      name: 'durationSeconds',
      type: 'number',
      defaultValue: '180',
      description: 'Total media duration in seconds clamped safely to [1..86400].',
    },
    {
      name: 'chapters',
      type: 'ReadonlyArray<VideoChapter>',
      defaultValue: 'undefined',
      description: 'Chapter markers rendered as track pins and an interactive quick-jump pill strip.',
    },
    {
      name: 'captionsText',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Subtitle copy rendered inside the frosted optical captions pill when captions are active.',
    },
    {
      name: 'defaultCaptionsEnabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial captions visibility state.',
    },
    {
      name: 'defaultSpeed',
      type: 'number',
      defaultValue: '1',
      description: 'Initial playback rate chosen from [0.5, 1, 1.25, 1.5, 2].',
    },
    {
      name: 'onTimeChange',
      type: '(seconds: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the playback position changes.',
    },
    {
      name: 'onPlayStateChange',
      type: '(playing: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever playback toggles between playing and paused.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<CustomVideoPlayer\n  title="Refractor Optical Keynote"\n  durationSeconds={240}\n  captionsText="Introducing dual MUI and Open-Internals optical cascades."\n  defaultCaptionsEnabled\n  chapters={[\n    { id: 'intro', title: 'Opening', timeSeconds: 0 },\n    { id: 'optics', title: 'Caustic Physics', timeSeconds: 75 },\n    { id: 'demo', title: 'Live Studio', timeSeconds: 165 },\n  ]}\n/>`,
  ],
};
