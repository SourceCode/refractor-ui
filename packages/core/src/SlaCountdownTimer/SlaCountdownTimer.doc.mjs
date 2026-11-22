export const docs = {
  name: 'SlaCountdownTimer',
  displayName: 'SLA Countdown Timer',
  group: 'Enterprise Workflows, Data Ops & API Tooling',
  category: 'enterprise-ops-api',
  keywords: [
    'sla',
    'countdown',
    'timer',
    'urgency',
    'breach',
    'escalate',
    'incident',
    'support',
    'ops',
    'enterprise',
    'enterprise-ops-api',
    'telemetry',
    'deadline',
  ],
  usage: {
    description:
      'Live ticking urgency SLA countdown card and compact badge rendered inside a sculpted prism-slab optical-glass container. Automatically transitions semantic --prism-* optical telemetry across nominal (--prism-success-main), approaching (--prism-warning-main), critical (--prism-primary-main), and breached (--prism-error-main) tiers with HH:MM:SS and multi-day DDd HH:MM:SS tabular-nums readouts, single-fire breach notifications, Pause/Resume/Reset/Escalate controls, clean interval teardown, and polite aria-live status announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide a server-synchronized deadlineIso or finite remainingSeconds alongside explicit totalWindowSeconds so the remaining progress bar accurately reflects the active SLA policy window.',
      },
      {
        guidance: true,
        description:
          'Use the compact variant inside incident queues, triage tables, and dense API ops headers while reserving the full card variant for incident command panels.',
      },
      {
        guidance: false,
        description:
          'Rely on raw hardcoded hex colors or uncleaned timers for breach indicators; SlaCountdownTimer binds every urgency state to --prism-* tokens and tears down window.setInterval on pause, disable, and unmount.',
      },
    ],
    accessibility: [
      {
        name: 'Named Region, Progressbar Telemetry & Non-Spammy Polite Live Status',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement:
          'Exposes role="region" with aria-labelledby (card) or aria-label (compact), a role="progressbar" with aria-valuenow and aria-valuetext, and an aria-live="polite" status region that announces urgency, lifecycle, and escalation confirmations without announcing every second tick',
        description:
          'Keeps screen reader users informed of urgency changes and escalation confirmations without overwhelming speech output on every 1-second tick.',
      },
      {
        name: 'IME-Safe Controls & Keyboard-Only Optical Focus Rings',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Uses native button controls with prism-focus-ring (:focus-visible), aria-pressed state reflection, disabled:cursor-not-allowed guards, and !event.nativeEvent.isComposing keyboard handling',
        description:
          'Ensures full keyboard control over Pause/Resume, Reset, and Escalate actions without triggering accidental activations during IME composition or displaying focus rings on pointer click.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'SLA Response Countdown'",
      description: 'Visible heading label rendered in the card header and accessible region name.',
    },
    {
      name: 'ticketId',
      type: 'string',
      defaultValue: "'INC-4821'",
      description: 'Monospace ticket or incident identifier surfaced in the readout and escalation/breach payloads.',
    },
    {
      name: 'policyLabel',
      type: 'string',
      defaultValue: "'P1 · First Response'",
      description: 'Policy tier badge displayed in the sculpted card header.',
    },
    {
      name: 'remainingSeconds',
      type: 'number',
      defaultValue: '1420',
      description: 'Initial remaining seconds (takes precedence over deadlineIso when finite; non-finite inputs fall back safely).',
    },
    {
      name: 'deadlineIso',
      type: 'string',
      defaultValue: 'undefined',
      description: 'ISO-8601 deadline timestamp used to compute initial remaining seconds when remainingSeconds is omitted or non-finite.',
    },
    {
      name: 'totalWindowSeconds',
      type: 'number',
      defaultValue: '3600',
      description: 'Total SLA window duration in seconds used to compute remaining progress bar percentage.',
    },
    {
      name: 'warningThresholdSeconds',
      type: 'number',
      defaultValue: '1800',
      description: 'Threshold in seconds at or below which urgency shifts from nominal to approaching.',
    },
    {
      name: 'criticalThresholdSeconds',
      type: 'number',
      defaultValue: '300',
      description: 'Threshold in seconds at or below which urgency shifts from approaching to critical (clamped <= warningThresholdSeconds).',
    },
    {
      name: 'autoStart',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Whether the live 1-second countdown interval starts automatically on mount.',
    },
    {
      name: 'variant',
      type: "'card' | 'compact'",
      defaultValue: "'card'",
      description: 'Visual layout variant: full sculpted slab card or inline compact badge pill.',
    },
    {
      name: 'showControls',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Shows Pause/Resume, Reset, and Escalate controls (or the inline Escalate pill in compact variant).',
    },
    {
      name: 'onEscalate',
      type: '(event: SlaEscalationEvent) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with { urgency, remainingSeconds, ticketId } when Escalate is triggered.',
    },
    {
      name: 'onBreach',
      type: '(event: SlaEscalationEvent) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked at most once when remaining time transitions from > 0 to <= 0.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Stops live countdown ticking and disables all interactive controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<SlaCountdownTimer\n  title="P1 Incident Response SLA"\n  ticketId="INC-4821"\n  policyLabel="Enterprise · 1h SLA"\n  remainingSeconds={1420}\n  totalWindowSeconds={3600}\n  onEscalate={(event) => console.warn('Escalated:', event)}\n  onBreach={(event) => console.warn('Breached:', event)}\n/>`,
    `<SlaCountdownTimer\n  variant="compact"\n  ticketId="API-9012"\n  remainingSeconds={240}\n  onEscalate={(event) => console.warn('Compact escalation:', event)}\n/>`,
  ],
};

export default docs;
