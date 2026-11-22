export const docs = {
  name: 'FileTransferQueue',
  displayName: 'File Transfer Queue',
  group: 'File Management & Operations',
  category: 'file-management-operations',
  keywords: [
    'file',
    'transfer',
    'queue',
    'copy',
    'move',
    'upload',
    'extract',
    'progress',
    'throughput',
    'mbps',
    'eta',
    'pause',
    'resume',
    'retry',
    'cancel',
    'file-management',
    'operations',
    'floating-panel',
  ],
  usage: {
    description:
      'Floating optical-glass file transfer queue and progress utility panel inside a sculpted `prism-slab` surface. Renders a responsive `flex-wrap` header with title, active job count pill, aggregate live throughput readout (`MB/s`, summing running finite speeds safely), `Clear Completed` action (disabled when 0 completed/canceled jobs remain), and collapsible panel toggle (`aria-expanded`). Each job card displays an operation badge (`Copy`, `Move`, `Upload`, `Extract`), semantic `--prism-*` status pill (`Running`, `Paused`, `Queued`, `Completed`, `Canceled`), truncation-safe `sourcePath -> targetPath` route, clamped `0..100` `role="progressbar"` meter, tabular throughput & ETA telemetry, and lifecycle-aware contextual actions (`Pause`, `Resume`, `Retry`, `Cancel`, `Dismiss`), alongside a `role="status"` empty state and polite `aria-live="polite"` status footer.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass controlled `jobs` together with `onJobsChange`, `onPauseJob`, `onResumeJob`, `onCancelJob`, and `onRetryJob` when streaming real filesystem copy/move, cloud upload, or archive extraction telemetry from background workers.',
      },
      {
        guidance: true,
        description:
          'Use `defaultCollapsed` when docking `FileTransferQueue` as a compact floating utility tray; header telemetry continues showing active job count and live aggregate `MB/s` throughput even while collapsed.',
      },
      {
        guidance: false,
        description:
          'Trust unvalidated progress percentages, negative/non-finite throughput readings, or raw HTML strings in filesystem paths; `FileTransferQueue` clamps progress to `[0..100]`, guards `NaN`/`Infinity` speeds to `0.0 MB/s`, and renders every path strictly as literal text.',
      },
    ],
    accessibility: [
      {
        name: 'Collapsible Transfer Region, List Semantics & Progress Meters',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Root `role="region"` linked via `aria-labelledby`, collapse toggle exposing `aria-expanded` and `aria-controls`, `role="list"`/`role="listitem"` transfer cards, `role="progressbar"` meters with `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow`, and `aria-valuetext`, and descriptive per-job button labels (`Pause`/`Resume`/`Cancel`/`Retry`/`Dismiss <name>`)',
        description:
          'Enables assistive technology users to monitor concurrent file transfer progress, inspect source-to-target routes, and trigger job controls unambiguously.',
      },
      {
        name: 'IME-Safe Escape Collapse, Keyboard Focus Rings & Polite Announcements',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards `Escape`-to-collapse keyboard handling with `!event.nativeEvent.isComposing`, applies keyboard-only `.prism-focus-ring` focus indicators, renders a `role="status"` empty queue view, and announces pause, resume, cancel, retry, dismiss, clear, and collapse transitions in an `aria-live="polite"` footer',
        description:
          'Provides clear non-intrusive feedback for transfer lifecycle transitions without hijacking IME composition or cluttering pointer focus.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'File Transfer Queue'",
      description: 'Visible heading rendered in the prism-slab header and linked via `aria-labelledby`.',
    },
    {
      name: 'jobs',
      type: 'ReadonlyArray<FileTransferJob>',
      defaultValue: 'undefined',
      description: 'Controlled list of concurrent file transfer jobs displayed in the queue.',
    },
    {
      name: 'defaultJobs',
      type: 'ReadonlyArray<FileTransferJob>',
      defaultValue: '4 realistic concurrent jobs spanning copy, upload, extract, and move across running, paused, queued, and completed statuses',
      description: 'Initial transfer jobs when operating in uncontrolled mode.',
    },
    {
      name: 'defaultCollapsed',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial collapsed state of the job list panel.',
    },
    {
      name: 'onJobsChange',
      type: '(jobs: ReadonlyArray<FileTransferJob>) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the updated transfer list whenever jobs are paused, resumed, canceled, retried, dismissed, or cleared.',
    },
    {
      name: 'onPauseJob',
      type: '(jobId: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the target job ID when Pause is activated on a running job.',
    },
    {
      name: 'onResumeJob',
      type: '(jobId: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the target job ID when Resume is activated on a paused or queued job.',
    },
    {
      name: 'onCancelJob',
      type: '(jobId: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the target job ID when Cancel is activated on a running, paused, or queued job.',
    },
    {
      name: 'onRetryJob',
      type: '(jobId: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the target job ID when Retry is activated on a canceled job.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables Clear Completed, Collapse/Expand, Escape collapse, and all per-job transfer controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<FileTransferQueue\n  onPauseJob={(id) => console.warn('Paused transfer', id)}\n  onResumeJob={(id) => console.warn('Resumed transfer', id)}\n/>`,
    `<FileTransferQueue\n  title="Workspace Transfers"\n  jobs={transferJobs}\n  onJobsChange={setTransferJobs}\n  onCancelJob={(id) => abortTransferWorker(id)}\n  onRetryJob={(id) => restartTransferWorker(id)}\n/>`,
  ],
};

export default docs;
