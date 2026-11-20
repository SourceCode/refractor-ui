export const docs = {
  name: 'GanttChart',
  displayName: 'Gantt Chart',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['gantt', 'timeline', 'schedule', 'dependencies', 'milestones', 'resource', 'roadmap', 'svg'],
  usage: {
    description:
      'Optical glass project schedule timeline pairing a synchronized task/assignee pane with refractive progress bars, Days/Weeks/Months scale switching, toggleable resource lanes, today hairline marker, and token-driven SVG dependency connectors.',
    bestPractices: [
      { guidance: true, description: 'Supply ISO 8601 YYYY-MM-DD dates for startDate, endDate, and todayIso for deterministic UTC alignment.' },
      { guidance: true, description: 'Use tone ("primary" | "emerald" | "cobalt") to distinguish engineering streams or critical path tracks.' },
      { guidance: false, description: 'Hardcode SVG connector stroke colors; connectors read var(--prism-secondary-main) so themes cascade automatically.' },
    ],
    accessibility: [
      {
        name: 'Interactive task selection & scale controls',
        criterion: '2.1.1 Keyboard',
        requirement: 'Keyboard-focusable scale switchers, resource lane toggle, task rows, and refractive bars with aria-pressed states',
        description: 'All timeline controls and task bars render as native buttons with prism-focus-ring keyboard focus indicators and descriptive aria-label / aria-pressed attributes, while decorative SVG paths and hairlines are marked aria-hidden="true".',
      },
    ],
  },
  props: [
    { name: 'tasks', type: 'ReadonlyArray<GanttTaskItem>', defaultValue: 'required', description: 'Scheduled tasks rendered across the synchronized left list and horizontal timeline grid.' },
    { name: 'scale', type: "'days' | 'weeks' | 'months'", defaultValue: 'undefined', description: 'Controlled timeline zoom scale.' },
    { name: 'defaultScale', type: "'days' | 'weeks' | 'months'", defaultValue: "'days'", description: 'Initial timeline zoom scale in uncontrolled mode.' },
    { name: 'onScaleChange', type: '(scale: GanttScale) => void', defaultValue: 'undefined', description: 'Invoked whenever the timeline scale switcher changes.' },
    { name: 'groupByResource', type: 'boolean', defaultValue: 'false', description: 'Initial resource-lane grouping state by assignee; toggleable from the toolbar.' },
    { name: 'selectedTaskId', type: 'string | null', defaultValue: 'undefined', description: 'Controlled selected task ID highlighted in both panes.' },
    { name: 'onSelectTask', type: '(task: GanttTaskItem) => void', defaultValue: 'undefined', description: 'Invoked when a task row or refractive bar is activated.' },
    { name: 'todayIso', type: 'string', defaultValue: 'undefined', description: 'Optional YYYY-MM-DD date rendered as a vertical today hairline marker.' },
    { name: 'emptyMessage', type: 'string', defaultValue: "'No scheduled tasks to display.'", description: 'Fallback message rendered when tasks is empty.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<GanttChart\n  todayIso="2026-11-05"\n  tasks={[\n    { id: 't1', title: 'Optical Token Spec', assignee: 'Ava', startDate: '2026-11-01', endDate: '2026-11-04', progress: 100, tone: 'emerald' },\n    { id: 't2', title: 'Refractor Core Build', assignee: 'Marcus', startDate: '2026-11-05', endDate: '2026-11-10', progress: 65, dependencies: ['t1'], tone: 'primary' },\n  ]}\n/>`,
  ],
};
