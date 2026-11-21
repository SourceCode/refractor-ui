export const docs = {
  name: 'ActiveSessionsList',
  displayName: 'Active Sessions List',
  group: 'Security, Auth & Account Management',
  category: 'security-auth',
  keywords: [
    'sessions',
    'devices',
    'security',
    'auth',
    'account',
    'sign-out',
    'revoke',
    'ip',
    'audit',
    'cli',
  ],
  usage: {
    description:
      'Optical-glass account security panel listing signed-in desktop, mobile, tablet, and CLI sessions with tabular active count badge, prototype-safe ID deduplication, emerald current-session indicator, optional monospace IP readouts, individual session revocation, bulk "Sign out all others" action, and polite live status announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Mark the active browser session with current: true so users can audit their device clearly without accidentally revoking the session they are currently using.',
      },
      {
        guidance: true,
        description:
          'Use controlled sessions + onSessionsChange alongside onSignOutSession and onSignOutAllOthers when synchronizing session revocation with backend auth APIs.',
      },
      {
        guidance: false,
        description:
          'Expose raw session tokens or cookies inside browserOrClient or ipAddress fields; keep session metadata limited to safe audit attributes.',
      },
    ],
    accessibility: [
      {
        name: 'Named Region Landmark & Unique Per-Row Action Labels',
        criterion: '1.3.1 Info and Relationships & 2.4.4 Link Purpose',
        requirement: 'role="region" linked to heading, list semantics, and device-specific aria-label on each Sign out button',
        description:
          'Associates the session list with its visible heading and labels every row-level Sign out button with its target deviceName so assistive technology users can distinguish revocation controls unambiguously.',
      },
      {
        name: 'Live Revocation Feedback & Disabled Bulk Guard',
        criterion: '4.1.3 Status Messages & 2.1.1 Keyboard',
        requirement: 'role="status" aria-live="polite" announcements, prism-focus-ring, and disabled:cursor-not-allowed',
        description:
          'Announces single and bulk session sign-out actions politely without moving focus and disables "Sign out all others" whenever zero non-current sessions exist.',
      },
    ],
  },
  props: [
    {
      name: 'sessions',
      type: 'ReadonlyArray<ActiveSessionItem>',
      defaultValue: 'undefined',
      description: 'Controlled array of active session items (deduplicated safely by id).',
    },
    {
      name: 'defaultSessions',
      type: 'ReadonlyArray<ActiveSessionItem>',
      defaultValue: 'undefined',
      description: 'Initial array of active sessions for uncontrolled mode.',
    },
    {
      name: 'onSessionsChange',
      type: '(next: ActiveSessionItem[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated session list after individual or bulk sign-out.',
    },
    {
      name: 'onSignOutSession',
      type: '(sessionId: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the revoked session ID when a row Sign out button is clicked.',
    },
    {
      name: 'onSignOutAllOthers',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when "Sign out all others" is activated.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Active Sessions'",
      description: 'Heading rendered in the optical slab header alongside the tabular session count.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ActiveSessionsList\n  title="Active Sessions"\n  defaultSessions={[\n    {\n      id: 'sess-current',\n      deviceName: 'MacBook Pro 16"',\n      deviceType: 'desktop',\n      browserOrClient: 'Chrome 134 · macOS 15',\n      location: 'San Francisco, US',\n      ipAddress: '198.51.100.42',\n      lastActive: 'Active now',\n      current: true,\n    },\n    {\n      id: 'sess-cli',\n      deviceName: 'Build Runner CLI',\n      deviceType: 'cli',\n      browserOrClient: 'refractor-cli 1.3.0',\n      location: 'Frankfurt, DE',\n      ipAddress: '203.0.113.19',\n      lastActive: '14 minutes ago',\n    },\n  ]}\n  onSignOutSession={(id) => revokeSession(id)}\n  onSignOutAllOthers={() => revokeOtherSessions()}\n/>`,
  ],
};
