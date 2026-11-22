export const docs = {
  name: 'UptimeStatusBar',
  displayName: 'Uptime Status Bar',
  group: 'System, DevOps & Observability Widgets',
  category: 'observability-widgets',
  keywords: [
    'uptime',
    'status',
    'sla',
    'observability',
    'devops',
    'incident',
    'outage',
    'degraded',
    'maintenance',
    'operational',
    'availability',
    'status-page',
  ],
  usage: {
    description:
      'Optical-glass service availability panel built on a prism-slab shell with a live current status badge derived from the latest day, SLA-aware overall uptime percentage pill, horizontal slim vertical tick strip inside a recessed prism-well shaded strictly via --prism-* tokens (success, warning, error, info), baseline range captions, and an aria-live="polite" recessed incident readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide explicit daily UptimeDaySlot records with concise incidentSummary and downtimeMinutes metadata so operators inspecting historical bars receive actionable root-cause context.',
      },
      {
        guidance: true,
        description:
          'Configure slaTargetPct to match the service contract (for example 99.9 or 99.95) so the overall uptime percentage pill automatically reflects compliance (--prism-success-main), warning margin (--prism-warning-main), or SLA breach (--prism-error-main).',
      },
      {
        guidance: false,
        description:
          'Rely exclusively on bar colors without readable status labels; keep the built-in status badge, aria-labels, and polite live incident readout intact for full WCAG compliance.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Navigation & IME-Safe Bar Activation',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Interactive bars expose role="button", tabIndex={0}, aria-pressed, keyboard-only prism-focus-ring, IME-safe Enter/Space activation, and ArrowLeft/ArrowRight/Home/End navigation',
        description:
          'Keyboard users can inspect every day slot across the uptime strip, jump directly to the first or latest day via Home/End, and trigger selection without pointer focus ring clutter or hijacking IME composition.',
      },
      {
        name: 'Polite Incident Readout & Empty Status Landmark',
        criterion: '4.1.3 Status Messages & 1.4.1 Use of Color',
        requirement:
          'aria-live="polite" recessed incident panel pairing date, semantic status text + icon, daily uptime %, downtime, and summary; role="status" empty state when days is []',
        description:
          'Ensures screen-reader users hear updated incident context on every bar selection and receive clear textual status feedback when no uptime history is available.',
      },
    ],
  },
  props: [
    {
      name: 'serviceName',
      type: 'string',
      defaultValue: "'Core API Edge Gateway'",
      description:
        'Monitored service name rendered in the panel heading and referenced by the region landmark.',
    },
    {
      name: 'days',
      type: 'ReadonlyArray<UptimeDaySlot>',
      defaultValue: '60-day default history (57 operational, 2 degraded, 1 outage)',
      description:
        'Ordered array of daily uptime records ({ id, dateLabel, state, uptimePct, incidentSummary?, downtimeMinutes? }). Pass [] to render the accessible empty state.',
    },
    {
      name: 'slaTargetPct',
      type: 'number',
      defaultValue: '99.9',
      description:
        'Target SLA availability percentage clamped to [50, 100]; governs overall uptime pill semantic coloring and the baseline caption.',
    },
    {
      name: 'onSelectDay',
      type: '(day: UptimeDaySlot, index: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when a user clicks or keyboard-activates/navigates to a daily uptime bar.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<UptimeStatusBar\n  serviceName="Core API Edge Gateway"\n  slaTargetPct={99.9}\n  onSelectDay={(day, index) => console.warn(day.dateLabel, index)}\n/>`,
    `<UptimeStatusBar\n  serviceName="Realtime Inference Mesh"\n  slaTargetPct={99.95}\n  days={[\n    { id: '2026-11-19', dateLabel: 'Nov 19', state: 'operational', uptimePct: 100 },\n    { id: '2026-11-20', dateLabel: 'Nov 20', state: 'maintenance', uptimePct: 99.8, downtimeMinutes: 3, incidentSummary: 'Planned TLS certificate rotation.' },\n    { id: '2026-11-21', dateLabel: 'Nov 21', state: 'operational', uptimePct: 100 },\n  ]}\n/>`,
  ],
};

export default docs;
