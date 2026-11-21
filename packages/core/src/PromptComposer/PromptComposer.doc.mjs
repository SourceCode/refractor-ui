export const docs = {
  name: 'PromptComposer',
  displayName: 'Prompt Composer',
  group: 'AI & Conversational Interfaces',
  category: 'ai-conversational',
  keywords: [
    'prompt',
    'composer',
    'chat',
    'ai',
    'input',
    'model',
    'voice',
    'attachments',
    'streaming',
    'stop',
  ],
  usage: {
    description:
      'Optical glass conversational prompt composer featuring a recessed frosted multi-line auto-expanding textarea, IME-safe Enter submission (Shift+Enter for newline), attachment trigger with tabular badge, voice recording toggle with aria-pressed state, crystal model selector pill, live character counter, and a refractive Send capsule that morphs into a Stop button during generation.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pair PromptComposer directly below ChatMessageStream and toggle isGenerating={true} while streaming responses so users can halt generation via onStop.',
      },
      {
        guidance: true,
        description:
          'Provide concise model badges (such as Fast, Pro, or Reasoning) inside models so users can evaluate latency versus depth before submitting.',
      },
      {
        guidance: false,
        description:
          'Bypass IME composition guards when binding Enter key submission; PromptComposer ignores Enter while e.nativeEvent.isComposing is active.',
      },
    ],
    accessibility: [
      {
        name: 'IME-Safe Keyboard Submission & Toggle Semantics',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'IME-safe Enter/Shift+Enter handling, aria-pressed on Voice toggle, labeled select and textarea',
        description:
          'Preserves CJK/IME composition commits, inserts newlines on Shift+Enter, announces voice capture state via aria-pressed, and applies keyboard-only prism-focus-ring outlines.',
      },
      {
        name: 'Disabled State Fidelity',
        criterion: '1.4.11 Non-text Contrast & 4.1.2 Name, Role, Value',
        requirement: 'disabled:cursor-not-allowed and enabled:hover: guards on interactive controls',
        description:
          'Prevents hover elevation promises and blocks submissions while disabled or when the prompt contains only whitespace.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled prompt text value.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "''",
      description: 'Initial prompt text in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(val: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the textarea value changes.',
    },
    {
      name: 'onSubmit',
      type: '(prompt: string, modelId?: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the trimmed prompt and active model ID when submitted.',
    },
    {
      name: 'onStop',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the Stop button is clicked while isGenerating is true.',
    },
    {
      name: 'onAttachClick',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the paperclip Attachment button is pressed.',
    },
    {
      name: 'onVoiceToggle',
      type: '(recording: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the next boolean recording state when Voice is toggled.',
    },
    {
      name: 'models',
      type: 'ReadonlyArray<PromptModelOption>',
      defaultValue: 'undefined',
      description: 'Selectable AI models displayed in a crystal selector pill.',
    },
    {
      name: 'selectedModelId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled active model identifier.',
    },
    {
      name: 'defaultModelId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Initial model identifier in uncontrolled mode (falls back to first model).',
    },
    {
      name: 'onModelChange',
      type: '(id: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the active model changes.',
    },
    {
      name: 'isGenerating',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Switches the Send button into a Stop button invoking onStop when true.',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "'Ask anything or describe what to build...'",
      description: 'Placeholder copy shown when the prompt textarea is empty.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables the textarea and all composer action bar controls.',
    },
    {
      name: 'maxLength',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Optional positive finite character limit with live tabular counter.',
    },
    {
      name: 'attachmentsCount',
      type: 'number',
      defaultValue: '0',
      description: 'Displays a tabular count badge on the attachment trigger when greater than zero.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<PromptComposer\n  models={[\n    { id: 'prism-pro', label: 'Prism Pro', badge: 'Reasoning' },\n    { id: 'prism-flash', label: 'Prism Flash', badge: 'Fast' },\n  ]}\n  defaultModelId="prism-pro"\n  maxLength={2000}\n  attachmentsCount={2}\n  onSubmit={(prompt, modelId) => {\n    void prompt;\n    void modelId;\n  }}\n/>`,
  ],
};
