export const docs = {
  name: 'LiveLogStreamer',
  displayName: 'Live Log Streamer',
  group: 'CLI & Terminal Surfaces',
  category: 'cli-terminal',
  keywords: [
    'log',
    'logs',
    'streamer',
    'terminal',
    'cli',
    'tail',
    'follow',
    'severity',
    'filter',
    'stdout',
    'console',
  ],
  usage: {
    description:
      'Optical-glass real-time log tailing viewport featuring a prism-slab filter header with case-insensitive message/source/timestamp search, toggleable severity pills with live per-level counts, Follow/Paused tailing controls, Jump-to-Bottom recovery when paused, optional Clear action, and a recessed monospace log well with tabular timestamps.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Assign stable, unique id values to each LogEntry so React reconciles streaming additions without losing scroll position.',
      },
      {
        guidance: true,
        description:
          'Provide concise source tags (e.g. "api", "worker", "bundler") so operators can quickly narrow multi-service streams via search.',
      },
      {
        guidance: false,
        description:
          'Inject raw ANSI or HTML markup expecting innerHTML parsing; LiveLogStreamer renders every message strictly as literal text for XSS safety.',
      },
    ],
    accessibility: [
      {
        name: 'Adaptive Live Log Region',
        criterion: '4.1.3 Status Messages',
        requirement: 'role="log" with aria-live="polite" when following and aria-live="off" when paused',
        description:
          'Pauses assistive-technology announcements automatically when operators pause tailing to inspect historical output, preventing speech queue floods.',
      },
      {
        name: 'Toggle Press State & IME-Safe Filtering',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'aria-pressed on severity/follow toggles, prism-focus-ring, IME-guarded search key handling',
        description:
          'Exposes pressed state on severity pills and Follow/Paused controls while guarding Escape search clearing against active IME composition.',
      },
    ],
  },
  props: [
    {
      name: 'entries',
      type: 'LogEntry[]',
      defaultValue: 'required',
      description: 'Ordered array of structured log records with id, timestamp, severity, optional source, and literal message.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Live Log Stream'",
      description: 'Heading title rendered in the optical slab header.',
    },
    {
      name: 'defaultSeverities',
      type: 'LogSeverity[]',
      defaultValue: "['debug', 'info', 'warn', 'error']",
      description: 'Initial subset of severity levels enabled in the filter bar.',
    },
    {
      name: 'defaultFollowing',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Whether the viewport begins auto-scrolling to the newest entry.',
    },
    {
      name: 'onClear',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional callback that renders and handles the Clear log stream button.',
    },
    {
      name: 'emptyMessage',
      type: 'string',
      defaultValue: "'No matching log entries.'",
      description: 'Empty-state text displayed when no entries match active filters.',
    },
    {
      name: 'maxHeight',
      type: 'number',
      defaultValue: '280',
      description: 'Maximum height of the scrollable log well in pixels (clamped between 120 and 800).',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<LiveLogStreamer\n  title="Deploy Pipeline Logs"\n  entries={[\n    { id: '1', timestamp: '14:02:01.104', severity: 'info', source: 'builder', message: 'Compiling workspace packages...' },\n    { id: '2', timestamp: '14:02:03.842', severity: 'warn', source: 'cache', message: 'Remote cache miss; rebuilding core bundle.' },\n    { id: '3', timestamp: '14:02:05.019', severity: 'error', source: 'tests', message: 'Assertion failed in smoke suite.' },\n  ]}\n  onClear={() => clearLogs()}\n/>`,
  ],
};
