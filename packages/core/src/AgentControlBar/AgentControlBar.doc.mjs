export const docs = {
  name: 'AgentControlBar',
  displayName: 'Agent Control Bar (Live Steering)',
  group: 'AI Agent Execution & Control',
  category: 'ai-agent-control',
  keywords: [
    'agent',
    'control',
    'bar',
    'steering',
    'pause',
    'resume',
    'stop',
    'redirect',
    'mid-flight',
    'orchestration',
    'toolbar',
  ],
  usage: {
    description:
      'Compact optical-glass slab steering toolbar for autonomous AI agent execution featuring a controllable lifecycle status badge (idle, running pulse, paused, stopped), optional active step readout, contextual Pause/Resume/Stop controls, and an inline IME-safe mid-flight Redirect input and submission button.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass a concise currentStepLabel (such as "Running unit tests (3/5)") so operators know what the agent is doing before pausing or redirecting.',
      },
      {
        guidance: true,
        description:
          'Use controlled status and onStatusChange when synchronizing agent lifecycle state with a streaming backend or worker queue.',
      },
      {
        guidance: false,
        description:
          'Allow steering submissions after an execution has already terminated; AgentControlBar disables mid-flight redirects automatically when status is "stopped".',
      },
    ],
    accessibility: [
      {
        name: 'Toolbar Landmark & Live Status Announcements',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement: 'role="toolbar" with accessible label and role="status" aria-live="polite" state badge',
        description:
          'Groups steering controls inside a semantic toolbar and announces lifecycle transitions politely via the status indicator badge.',
      },
      {
        name: 'IME-Safe Steering Input & Disabled Guards',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement: 'Guards Enter with !e.nativeEvent.isComposing, disabled:cursor-not-allowed, and prism-focus-ring',
        description:
          'Preserves CJK/IME composition commits in the mid-flight redirect input while disabling submission cleanly when stopped or disabled.',
      },
    ],
  },
  props: [
    {
      name: 'status',
      type: "'idle' | 'running' | 'paused' | 'stopped'",
      defaultValue: 'undefined',
      description: 'Controlled agent execution state.',
    },
    {
      name: 'defaultStatus',
      type: "'idle' | 'running' | 'paused' | 'stopped'",
      defaultValue: "'running'",
      description: 'Initial execution state when operating in uncontrolled mode.',
    },
    {
      name: 'onStatusChange',
      type: '(status: AgentRunState) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever execution status transitions via Pause, Resume, or Stop.',
    },
    {
      name: 'currentStepLabel',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional readout describing the active step or tool call.',
    },
    {
      name: 'onPause',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when Pause is clicked while running.',
    },
    {
      name: 'onResume',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when Resume is clicked while paused.',
    },
    {
      name: 'onStop',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when Stop is clicked while running or paused.',
    },
    {
      name: 'onRedirect',
      type: '(instruction: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the trimmed steering instruction when Redirect is submitted.',
    },
    {
      name: 'redirectPlaceholder',
      type: 'string',
      defaultValue: "'Steer agent mid-flight...'",
      description: 'Placeholder text rendered inside the inline redirect input well.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all lifecycle buttons and mid-flight redirect controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<AgentControlBar\n  defaultStatus="running"\n  currentStepLabel="Step 3/5: Refactoring token parser"\n  onPause={() => console.warn('Paused')}\n  onResume={() => console.warn('Resumed')}\n  onStop={() => console.warn('Stopped')}\n  onRedirect={(instruction) => console.warn('Steer:', instruction)}\n/>`,
  ],
};
