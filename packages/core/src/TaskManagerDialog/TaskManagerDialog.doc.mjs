export const docs = {
  name: 'TaskManagerDialog',
  displayName: 'Task Manager Dialog',
  group: 'Hardware HUDs & System Overlays',
  category: 'hardware-huds-overlays',
  keywords: [
    'task-manager',
    'force-quit',
    'processes',
    'activity-monitor',
    'cpu',
    'memory',
    'pid',
    'unresponsive',
    'system-overlay',
    'hardware-hud',
    'dialog',
    'table',
  ],
  usage: {
    description:
      'Compact optical-glass system Task Manager and Force Quit utility inside a prism-slab container. Displays aggregate CPU % and Memory GB summary pills with NaN/negative sanitization, linear-time substring search across process name and PID with IME-safe Escape clear, an Unresponsive Only toggle, CPU/Memory/Name sorting, a horizontally scrollable optical process table with semantic --prism-* status badges and progress meters, row selection, Force Quit termination, polite aria-live announcements, and a clean role="status" empty state.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Connect controlled processes and onForceQuit to your desktop shell or OS supervisor daemon so terminated PIDs and live CPU/memory telemetry stay synchronized.',
      },
      {
        guidance: true,
        description:
          'Surface unresponsive applications with status="unresponsive" so operators can immediately isolate hung tasks via Unresponsive Only and terminate them with Force Quit.',
      },
      {
        guidance: false,
        description:
          'Pass raw unsanitized NaN or negative CPU/memory metrics expecting broken layout widths or NaN% pills; TaskManagerDialog clamps CPU percentages to [0..100] and negative memory values to 0 MB automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Process Table, Meters, and Selection Controls',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Renders a hydration-safe <table> with <thead> and <tbody> wrapped directly in <div className="overflow-x-auto">, role="meter" CPU and memory bars, aria-selected rows, and aria-pressed Select and Unresponsive Only toggles',
        description:
          'Ensures full keyboard navigation with keyboard-only prism-focus-ring focus indicators, labeled search and sort controls, and IME-safe Escape clearing inside the filter input.',
      },
      {
        name: 'Empty State Status & Polite Force Quit Announcements',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Displays a role="status" empty state when all processes are terminated or zero rows match active filters, and announces selection, filter, sort, and Force Quit actions inside an aria-live="polite" region',
        description:
          'Communicates process termination and filter changes immediately to assistive technologies without stealing keyboard focus.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Task Manager'",
      description:
        'Dialog heading rendered in the optical slab header and referenced via aria-labelledby.',
    },
    {
      name: 'processes',
      type: 'ReadonlyArray<TaskProcessItem>',
      defaultValue: 'undefined',
      description:
        'Controlled list of active applications and background processes.',
    },
    {
      name: 'defaultProcesses',
      type: 'ReadonlyArray<TaskProcessItem>',
      defaultValue:
        "6 realistic default processes including 'Legacy Exporter (Not Responding)' (PID 4108)",
      description:
        'Initial list of processes used in uncontrolled mode when processes is omitted.',
    },
    {
      name: 'onForceQuit',
      type: '(process: TaskProcessItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the sanitized TaskProcessItem whenever Force Quit is activated.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables search filtering, Unresponsive Only toggle, sort selector, row selection, and Force Quit.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<TaskManagerDialog\n  title="Force Quit Applications"\n  onForceQuit={(proc) => console.warn('Force quit:', proc.name, proc.pid)}\n/>`,
    `<TaskManagerDialog\n  processes={activeProcesses}\n  onForceQuit={(proc) => terminateProcess(proc.pid)}\n/>`,
  ],
};

export default docs;
