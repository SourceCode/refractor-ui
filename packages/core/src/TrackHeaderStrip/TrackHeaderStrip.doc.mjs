export const docs = {
  name: 'TrackHeaderStrip',
  displayName: 'Track Header Strip',
  group: 'Timeline & Sequencing',
  category: 'timeline-sequencing',
  keywords: [
    'track',
    'header',
    'strip',
    'lane',
    'timeline',
    'sequencing',
    'daw',
    'nle',
    'mute',
    'solo',
    'record',
    'arm',
    'lock',
    'rename',
    'video',
    'audio',
  ],
  usage: {
    description:
      'Sculpted optical-glass prism-slab left-hand timeline lane header featuring a semantic track-type accent stripe (video, audio, effect, subtitle), inline IME-safe track renaming, compact/expanded height toggling, tactile DAW Mute/Solo/Record-Arm/Lock pill controls (blocking record arm while locked), and an expanded recessed prism-well lane status badge line.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Match trackType to the underlying media lane (video, audio, effect, or subtitle) so editors can scan stacked timeline headers immediately via the semantic left accent stripe and icon.',
      },
      {
        guidance: true,
        description:
          'Provide onRename alongside controlled name state when users should be able to relabel tracks via double-click or the inline edit button with IME-safe Enter commit and Escape cancel.',
      },
      {
        guidance: false,
        description:
          'Allow record arming on locked lanes; TrackHeaderStrip intentionally disables the R (Record Arm) control whenever locked is true while keeping Mute, Solo, and height expansion accessible.',
      },
    ],
    accessibility: [
      {
        name: 'Descriptive Per-Track DAW Controls & Toggle State',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Exposes per-track aria-label values (Mute <name>, Solo <name>, Record arm <name>, Lock <name>) paired with aria-pressed, plus aria-expanded and aria-controls on the lane height toggle',
        description:
          'Allows screen-reader users navigating multi-track timelines to distinguish identical M/S/R/Lock buttons across stacked lanes and hear live status updates inside the expanded status well.',
      },
      {
        name: 'IME-Safe Inline Rename & Keyboard-Only Focus Rings',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Provides both double-click and a keyboard-focusable rename button, guards Enter and Escape with !e.nativeEvent.isComposing, restores focus on exit, and applies prism-focus-ring outlines',
        description:
          'Prevents CJK/IME composition commits from prematurely saving or dismissing track renames and keeps focus predictable when exiting edit mode.',
      },
    ],
  },
  props: [
    {
      name: 'name',
      type: 'string',
      defaultValue: 'required',
      description: 'Track display name rendered in the header and referenced in control aria-labels (e.g. "V1 · Main Camera").',
    },
    {
      name: 'trackType',
      type: "'video' | 'audio' | 'effect' | 'subtitle'",
      defaultValue: "'video'",
      description: 'Semantic lane type controlling the left accent stripe (--prism-primary/secondary/success/warning-main) and track icon.',
    },
    {
      name: 'muted',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled muted state.',
    },
    {
      name: 'defaultMuted',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial muted state in uncontrolled mode.',
    },
    {
      name: 'onMutedChange',
      type: '(muted: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when Mute (M) is toggled.',
    },
    {
      name: 'solo',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled solo state.',
    },
    {
      name: 'defaultSolo',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial solo state in uncontrolled mode.',
    },
    {
      name: 'onSoloChange',
      type: '(solo: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when Solo (S) is toggled.',
    },
    {
      name: 'armed',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled record-arm state.',
    },
    {
      name: 'defaultArmed',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial record-arm state in uncontrolled mode.',
    },
    {
      name: 'onArmedChange',
      type: '(armed: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when Record Arm (R) is toggled (blocked while locked).',
    },
    {
      name: 'locked',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled locked state; disables Record Arm while true.',
    },
    {
      name: 'defaultLocked',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial locked state in uncontrolled mode.',
    },
    {
      name: 'onLockedChange',
      type: '(locked: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when Lock is toggled.',
    },
    {
      name: 'heightMode',
      type: "'compact' | 'expanded'",
      defaultValue: 'undefined',
      description: 'Controlled lane height mode; expanded reveals the recessed prism-well status badge line.',
    },
    {
      name: 'defaultHeightMode',
      type: "'compact' | 'expanded'",
      defaultValue: "'compact'",
      description: 'Initial lane height mode in uncontrolled mode.',
    },
    {
      name: 'onHeightModeChange',
      type: "(height: 'compact' | 'expanded') => void",
      defaultValue: 'undefined',
      description: 'Callback fired when the expand/collapse height toggle is activated.',
    },
    {
      name: 'onRename',
      type: '(nextName: string) => void',
      defaultValue: 'undefined',
      description: 'Enables inline double-click and pencil-button track renaming with IME-safe Enter commit and Escape cancel.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all track controls, height expansion, and inline renaming.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<TrackHeaderStrip\n  name="V1 · Main Camera"\n  trackType="video"\n  defaultHeightMode="expanded"\n  onRename={(nextName) => setTrackName(nextName)}\n/>`,
    `<TrackHeaderStrip\n  name="A1 · Dialogue Stem"\n  trackType="audio"\n  solo={isSolo}\n  onSoloChange={setIsSolo}\n  armed={isArmed}\n  onArmedChange={setIsArmed}\n  locked={isLocked}\n  onLockedChange={setIsLocked}\n  heightMode="expanded"\n/>`,
  ],
};
