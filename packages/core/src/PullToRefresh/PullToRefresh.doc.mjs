export const docs = {
  name: 'PullToRefresh',
  displayName: 'Pull-to-Refresh Optical Container',
  group: 'Mobile, Touch & System Utilities',
  category: 'mobile-utilities',
  keywords: [
    'pull',
    'refresh',
    'reload',
    'sync',
    'mobile',
    'touch',
    'gesture',
    'rubber-band',
    'scroll',
    'feed',
  ],
  usage: {
    description:
      'Scrollable optical-glass container with a top rubber-band refresh indicator drawer, dampened downward pointer gesture tracking, sync and async Promise refresh lifecycle management, animated RefreshCw progress feedback, controlled refreshing override, and an optional accessible manual Refresh crystal button.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep showManualButton enabled (default true) so desktop mouse, switch, and keyboard users can trigger a refresh without performing a downward touch drag.',
      },
      {
        guidance: true,
        description:
          'Return a Promise from onRefresh for asynchronous data fetches so the spinning optical indicator automatically remains active until the request settles.',
      },
      {
        guidance: false,
        description:
          'Nest multiple PullToRefresh containers inside the same vertical scroll axis; attach a single PullToRefresh wrapper around the primary feed viewport.',
      },
    ],
    accessibility: [
      {
        name: 'Single-Pointer & Keyboard Refresh Parity',
        criterion: '2.5.1 Pointer Gestures & 2.1.1 Keyboard',
        requirement:
          'Accessible crystal Refresh button with prism-focus-ring and disabled:cursor-not-allowed when refreshing or disabled',
        description:
          'Provides a deterministic one-click and keyboard-activatable alternative to downward pull gestures at all times.',
      },
      {
        name: 'Live Status Announcements & Progress Semantics',
        criterion: '4.1.3 Status Messages & 4.1.2 Name, Role, Value',
        requirement:
          'role="status" with aria-live="polite" for pull/release/refreshing state transitions plus role="progressbar" tracking pull percentage',
        description:
          'Announces state transitions cleanly to assistive technologies without stealing focus from feed items.',
      },
    ],
  },
  props: [
    {
      name: 'children',
      type: 'ReactNode',
      defaultValue: 'required',
      description: 'Scrollable content rendered inside the PullToRefresh container.',
    },
    {
      name: 'onRefresh',
      type: '() => void | Promise<void>',
      defaultValue: 'required',
      description: 'Synchronous or asynchronous callback triggered when pull exceeds threshold or Refresh is clicked.',
    },
    {
      name: 'refreshing',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Optional controlled refreshing state override that locks the indicator in the refreshing state.',
    },
    {
      name: 'threshold',
      type: 'number',
      defaultValue: '64',
      description: 'Dampened pull distance in pixels required to enter ready state, clamped between 32 and 160.',
    },
    {
      name: 'pullLabel',
      type: 'string',
      defaultValue: "'Pull to refresh'",
      description: 'Status text shown while idle or pulling below threshold.',
    },
    {
      name: 'releaseLabel',
      type: 'string',
      defaultValue: "'Release to refresh'",
      description: 'Status text shown once pull distance meets or exceeds threshold.',
    },
    {
      name: 'refreshingLabel',
      type: 'string',
      defaultValue: "'Refreshing...'",
      description: 'Status text shown while a refresh is actively running.',
    },
    {
      name: 'showManualButton',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Shows the accessible crystal manual Refresh button toolbar at the top of the container.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables pointer pull gestures and manual refresh triggers.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<PullToRefresh\n  onRefresh={async () => {\n    await syncFeed();\n  }}\n  threshold={72}\n  pullLabel="Pull down to sync"\n  releaseLabel="Release to sync"\n  refreshingLabel="Syncing feed..."\n>\n  <div className="p-4 space-y-2">\n    <p className="text-sm font-semibold">Latest Telemetry</p>\n  </div>\n</PullToRefresh>`,
  ],
};
