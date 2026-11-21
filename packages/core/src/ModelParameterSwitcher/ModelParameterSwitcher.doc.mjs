export const docs = {
  name: 'ModelParameterSwitcher',
  displayName: 'Model & Parameter Switcher',
  group: 'AI Context, Memory & Configuration',
  category: 'ai-context-memory',
  keywords: [
    'model',
    'switcher',
    'llm',
    'parameters',
    'temperature',
    'capabilities',
    'web-search',
    'code-execution',
    'extended-thinking',
    'context-window',
    'ai',
    'popover',
  ],
  usage: {
    description:
      'Optical-glass trigger button and slab popover for switching AI models (displaying provider, context window, speed tier pill, and optional badge), toggling Web Search, Code Execution, and Extended Thinking capabilities, and tuning sampling temperature across 0.0–2.0 with live tabular feedback.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Expose concise contextWindow labels (such as "200K" or "1M") and accurate speedTier values so operators can weigh latency against reasoning depth at a glance.',
      },
      {
        guidance: true,
        description:
          'Use controlled selectedModelId/onModelChange and capabilities/onCapabilitiesChange when persisting workspace model defaults across sessions.',
      },
      {
        guidance: false,
        description:
          'Allow unbounded sampling temperature values outside 0..2; ModelParameterSwitcher automatically clamps temperature and normalizes non-finite inputs.',
      },
    ],
    accessibility: [
      {
        name: 'Popover Trigger & Dialog Semantics',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement: 'Trigger declares aria-expanded, aria-haspopup="dialog", and aria-controls; panel closes on non-composing Escape or outside click',
        description:
          'Communicates popover expansion state clearly and lets keyboard and pointer users dismiss parameter settings reliably.',
      },
      {
        name: 'Listbox, Switch, and Range Slider Controls',
        criterion: '1.3.1 Info and Relationships & 2.4.7 Focus Visible',
        requirement: 'role="listbox"/role="option" with aria-selected, native role="switch" with aria-checked, labeled range slider, and keyboard-only focus rings',
        description:
          'Uses native semantic controls for model selection, capability toggles, and temperature tuning with visible focus outlines exclusively on keyboard focus.',
      },
    ],
  },
  props: [
    {
      name: 'models',
      type: 'AiModelOption[]',
      defaultValue: 'required',
      description: 'Ordered list of selectable AI model options with contextWindow and speedTier metadata.',
    },
    {
      name: 'selectedModelId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled identifier of the currently active model.',
    },
    {
      name: 'defaultModelId',
      type: 'string',
      defaultValue: "models[0]?.id ?? ''",
      description: 'Initial selected model identifier in uncontrolled mode.',
    },
    {
      name: 'onModelChange',
      type: '(modelId: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when a model option is selected.',
    },
    {
      name: 'capabilities',
      type: 'ModelCapabilities',
      defaultValue: 'undefined',
      description: 'Controlled capability switches (webSearch, codeExecution, extendedThinking) and temperature (0..2).',
    },
    {
      name: 'defaultCapabilities',
      type: 'Partial<ModelCapabilities>',
      defaultValue: '{ webSearch: true, codeExecution: true, extendedThinking: false, temperature: 0.4 }',
      description: 'Partial capability defaults applied in uncontrolled mode.',
    },
    {
      name: 'onCapabilitiesChange',
      type: '(caps: ModelCapabilities) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever a capability toggle or temperature value changes.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Controls whether the configuration popover starts expanded.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables opening the popover and modifying model or capability controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ModelParameterSwitcher\n  models={[\n    { id: 'gemini-flash', name: 'Gemini 2.5 Flash', provider: 'Google', contextWindow: '1M', speedTier: 'fast', badge: 'Default' },\n    { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'Anthropic', contextWindow: '200K', speedTier: 'balanced' },\n    { id: 'o3-pro', name: 'o3 Pro', provider: 'OpenAI', contextWindow: '200K', speedTier: 'reasoning', badge: 'Deep' },\n  ]}\n  defaultCapabilities={{ extendedThinking: true, temperature: 0.6 }}\n  onModelChange={(id) => console.warn('Model:', id)}\n  onCapabilitiesChange={(caps) => console.warn('Caps:', caps)}\n/>`,
  ],
};
