export const docs = {
  name: 'ExportRenderQueue',
  displayName: 'Export Render Queue',
  group: 'Viewport & Export Utilities',
  category: 'viewport-export',
  keywords: [
    'export',
    'render',
    'queue',
    'transcode',
    'encode',
    'codec',
    'h264',
    'prores',
    'av1',
    'wav',
    'bitrate',
    'resolution',
    'sample-rate',
    'progress',
    'batch',
    'media',
    'viewport',
  ],
  usage: {
    description:
      'Sculpted optical-glass prism-slab media export preset composer and batch render queue featuring a header with live queue telemetry (rendering, queued, done) and a Clear Completed action; a compact 5-column responsive prism-well preset form (sanitized Output Filename with deterministic Sequence_Master_Export fallback, Codec, Resolution, clamped 1..500 Mbps Bitrate that auto-disables to Lossless PCM for WAV 24-bit, Sample Rate, and primary Add to Queue button); an accessible role="list" queue of job cards with codec/resolution/bitrate/sample-rate badges, semantic --prism-* status pills, role="progressbar" meters, and lifecycle-aware contextual actions (Pause, Start, Resume, Cancel, Retry, Remove); plus a role="status" empty state and an aria-live="polite" status region.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Bind jobs, onJobsChange, and onEnqueue in controlled mode when streaming live transcoding percentages and ETA updates from a WebCodecs, FFmpeg, or cloud render worker.',
      },
      {
        guidance: true,
        description:
          'Select WAV 24-bit PCM alongside 96 kHz sample rate for uncompressed mastering stems; ExportRenderQueue automatically disables target video bitrate input and surfaces Lossless PCM telemetry.',
      },
      {
        guidance: false,
        description:
          'Bypass filename sanitization when forwarding export names to native file pickers or backend render workers; ExportRenderQueue strips control characters, unsafe filesystem delimiters, and path-traversal segments before firing onEnqueue.',
      },
    ],
    accessibility: [
      {
        name: 'Labeled Export Form Controls, Progress Meters & Per-Job Actions',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes labeled preset inputs (Export output name, Export codec, Export resolution, Target bitrate Mbps, Audio sample rate), role="list"/role="listitem" job cards, role="progressbar" with aria-valuemin=0, aria-valuemax=100, aria-valuenow, and aria-valuetext, plus job-specific button labels (Pause/Start/Resume/Cancel/Retry/Remove <name>)',
        description:
          'Ensures screen reader and keyboard users can configure presets, inspect exact render progress percentages, and control individual batch jobs without ambiguity.',
      },
      {
        name: 'IME-Safe Enter Submission, Focus-Visible Rings & Polite Live Announcements',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards Enter-to-enqueue on text and bitrate inputs with !e.nativeEvent.isComposing, applies keyboard-only .prism-focus-ring outlines, renders a role="status" empty state, and announces enqueue, pause, resume, cancel, retry, remove, and clear events via aria-live="polite"',
        description:
          'Prevents accidental job submission during CJK/IME composition while keeping assistive technologies informed of every queue state transition.',
      },
    ],
  },
  props: [
    {
      name: 'jobs',
      type: 'ReadonlyArray<RenderQueueJob>',
      defaultValue: 'undefined',
      description: 'Controlled list of render queue jobs displayed and managed by the component.',
    },
    {
      name: 'defaultJobs',
      type: 'ReadonlyArray<RenderQueueJob>',
      defaultValue: '3 realistic jobs (1 rendering 64%, 1 queued 0%, 1 completed 100%)',
      description: 'Initial render queue jobs when operating in uncontrolled mode.',
    },
    {
      name: 'onJobsChange',
      type: '(jobs: RenderQueueJob[]) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the updated jobs array whenever jobs are enqueued, paused, started, resumed, cancelled, retried, removed, or cleared.',
    },
    {
      name: 'onEnqueue',
      type: '(config: ExportJobConfig, createdJob: RenderQueueJob) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when Add to Queue creates a new queued render job with its sanitized ExportJobConfig and collision-safe RenderQueueJob.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Export & Render Queue'",
      description: 'Visible heading rendered in the prism-slab header and linked via aria-labelledby.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all preset form inputs, Add to Queue, Clear Completed, and per-job lifecycle action buttons.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ExportRenderQueue\n  title="Master Delivery Queue"\n  onEnqueue={(config, job) => console.warn(config.codec, job.id)}\n  onJobsChange={(nextJobs) => console.warn(nextJobs.length)}\n/>`,
    `<ExportRenderQueue\n  jobs={renderJobs}\n  onJobsChange={setRenderJobs}\n  onEnqueue={(config, createdJob) => startRenderWorker(config, createdJob)}\n/>`,
  ],
};

export default docs;
