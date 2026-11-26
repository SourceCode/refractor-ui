export const docs = {
  name: 'PipelinePulseLoader',
  displayName: 'Step-by-Step Pipeline Pulse',
  group: 'Loaders, Skeletons & Data Transitions',
  category: 'loaders-skeletons-transitions',
  keywords: ['pipeline', 'stepper', 'pulse', 'light-packet', 'workflow', 'stages', 'loader'],
  usage: {
    description:
      'Connected node-and-track multi-stage loader where a glowing optical light packet travels smoothly from stage to stage, visually tracking multi-step API calls, shader builds, deployments, or background jobs.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide concise `label` and `detail` timing/status strings on each stage and optionally bind `onStageSelect` to inspect step logs.',
      },
      {
        guidance: false,
        description:
          'Avoid crowding more than 6–7 horizontal stages inside narrow mobile cards; keep stage labels concise for clean horizontal scrolling.',
      },
    ],
    accessibility: [
      {
        name: 'Ordered Step Semantics & Polite Status Updates',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement:
          'Renders stages inside a semantic `<ol>` with `aria-current="step"` on the active node, `role="status"` + `aria-live="polite"`, and automatic light-packet pause under `prefers-reduced-motion: reduce`.',
        description:
          'Communicates multi-stage job progress reliably to assistive technologies.',
      },
    ],
  },
  props: [
    { name: 'stages', type: 'ReadonlyArray<PipelineStageItem>', defaultValue: '4 default stages (DEFAULT_PIPELINE_STAGES)', description: 'Ordered pipeline stages with `pending | active | completed | error` status.' },
    { name: 'pulseSpeedSeconds', type: 'number', defaultValue: '1.5', description: 'Packet travel duration in seconds (clamped 0.6–4).' },
    { name: 'label', type: 'string', defaultValue: "'Pipeline execution status'", description: 'Accessible region description.' },
    { name: 'onStageSelect', type: '(stage: PipelineStageItem) => void', defaultValue: 'undefined', description: 'Optional handler invoked when clicking a stage node.' },
  ],
};
