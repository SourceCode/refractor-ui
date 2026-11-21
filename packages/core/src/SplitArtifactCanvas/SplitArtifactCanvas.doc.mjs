export const docs = {
  name: 'SplitArtifactCanvas',
  displayName: 'Split Artifact Canvas',
  group: 'AI & Conversational Interfaces',
  category: 'ai-conversational',
  keywords: [
    'ai',
    'artifact',
    'canvas',
    'split',
    'workspace',
    'conversation',
    'preview',
    'code',
    'document',
  ],
  usage: {
    description:
      'Side-by-side optical glass slab workspace pairing a live conversational pane with a multi-artifact inspector supporting Split, Chat-only, and Artifact-only layouts, keyboard-navigable artifact tabs, kind/language/version metadata pills, Preview/Source toggling, clipboard copy with emerald confirmation, optional download hooks, and escaped literal source rendering.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide distinct stable IDs and semantic version tags (e.g. v1.0, v1.1) when streaming iterative artifact revisions from an AI assistant.',
      },
      {
        guidance: true,
        description:
          'Supply a safe React preview node alongside raw source content whenever users benefit from toggling between rendered UI and underlying code.',
      },
      {
        guidance: false,
        description:
          'Inject untrusted raw HTML strings into preview nodes; rely on SplitArtifactCanvas escaped <pre><code> source rendering for raw markup.',
      },
    ],
    accessibility: [
      {
        name: 'Named Pane Landmarks & Keyboard Tab Navigation',
        criterion: '1.3.1 Info and Relationships & 2.1.1 Keyboard',
        requirement: 'role="tablist", role="tab", role="tabpanel", Arrow/Home/End navigation',
        description:
          'Separates Conversation and Artifact workspaces into labelled <section> landmarks and supports full roving-tabindex keyboard switching across multiple artifacts.',
      },
      {
        name: 'Layout Mode State & Polite Status Announcements',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement: 'aria-pressed layout and surface mode controls plus aria-live="polite" status',
        description:
          'Exposes Split, Chat, Artifact, Preview, and Source toggles via aria-pressed with keyboard-only prism-focus-ring outlines and polite screen reader announcements.',
      },
    ],
  },
  props: [
    {
      name: 'conversationPane',
      type: 'ReactNode',
      defaultValue: 'required',
      description: 'Conversational message stream or prompt composer rendered in the left workspace pane.',
    },
    {
      name: 'artifacts',
      type: 'ReadonlyArray<ArtifactItem>',
      defaultValue: 'required',
      description: 'Ordered collection of generated artifacts (duplicate IDs are deduplicated safely).',
    },
    {
      name: 'activeArtifactId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled active artifact identifier.',
    },
    {
      name: 'defaultArtifactId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Initial active artifact identifier in uncontrolled mode (falls back to first artifact).',
    },
    {
      name: 'onActiveArtifactChange',
      type: '(id: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the active artifact tab changes.',
    },
    {
      name: 'viewMode',
      type: "'split' | 'artifact-only' | 'conversation-only'",
      defaultValue: 'undefined',
      description: 'Controlled layout presentation mode.',
    },
    {
      name: 'defaultViewMode',
      type: "'split' | 'artifact-only' | 'conversation-only'",
      defaultValue: "'split'",
      description: 'Initial layout mode in uncontrolled mode.',
    },
    {
      name: 'onViewModeChange',
      type: "(mode: 'split' | 'artifact-only' | 'conversation-only') => void",
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the workspace layout switcher changes mode.',
    },
    {
      name: 'onCopyArtifact',
      type: '(artifact: ArtifactItem) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the active artifact source is copied to clipboard.',
    },
    {
      name: 'onDownloadArtifact',
      type: '(artifact: ArtifactItem) => void',
      defaultValue: 'undefined',
      description: 'Optional callback that renders and handles the Download button for the active artifact.',
    },
    {
      name: 'conversationTitle',
      type: 'string',
      defaultValue: "'Conversation'",
      description: 'Heading title displayed in the conversation pane header.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<SplitArtifactCanvas\n  conversationTitle="Design Assistant"\n  conversationPane={<div>Prompt history and assistant turns...</div>}\n  artifacts={[\n    {\n      id: 'card-code',\n      title: 'OpticalCard.tsx',\n      kind: 'code',\n      language: 'tsx',\n      version: 'v1.2',\n      content: 'export function OpticalCard() { return <div className="prism-slab" />; }',\n      preview: <div className="prism-slab p-4">Live Optical Preview</div>,\n    },\n  ]}\n  onCopyArtifact={(artifact) => console.warn('Copied:', artifact.id)}\n  onDownloadArtifact={(artifact) => console.warn('Download:', artifact.id)}\n/>`,
  ],
};
