export const docs = {
  name: 'ResponseActionBar',
  displayName: 'Response Action Bar',
  group: 'AI & Conversational Interfaces',
  category: 'ai-conversational',
  keywords: [
    'ai',
    'response',
    'action',
    'bar',
    'toolbar',
    'copy',
    'regenerate',
    'share',
    'feedback',
    'thumbs',
  ],
  usage: {
    description:
      'Compact optical crystal pill toolbar attached beneath AI assistant messages providing clipboard copy with transient emerald confirmation, optional Regenerate and Share actions, mutually exclusive controlled or uncontrolled Thumbs Up / Thumbs Down feedback toggles, trailing custom actions, and polite live status announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Place ResponseActionBar directly below finalized assistant responses and pass disabled while a message is still streaming.',
      },
      {
        guidance: true,
        description:
          'Use controlled feedback and onFeedbackChange when persisting quality ratings to telemetry or backend evaluation pipelines.',
      },
      {
        guidance: false,
        description:
          'Overload extraActions with verbose multi-line controls; keep supplementary actions compact to preserve the single-row optical pill.',
      },
    ],
    accessibility: [
      {
        name: 'Toolbar Landmark & Polite Status Region',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement: 'role="toolbar", aria-label="Response actions", and aria-live="polite" status',
        description:
          'Announces clipboard copy confirmations and feedback state transitions politely via a visually hidden live status region without shifting keyboard focus.',
      },
      {
        name: 'Mutually Exclusive Toggle Buttons & Disabled Parity',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'aria-pressed on thumbs toggles, prism-focus-ring, disabled:cursor-not-allowed',
        description:
          'Exposes active feedback via aria-pressed on native <button type="button"> controls, resets to null when the active toggle is pressed again, and suppresses hover elevation when disabled.',
      },
    ],
  },
  props: [
    {
      name: 'contentToCopy',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Response text written to the clipboard when Copy is clicked (defaults to empty string).',
    },
    {
      name: 'onCopy',
      type: '(content: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the copied text whenever Copy is activated.',
    },
    {
      name: 'onRegenerate',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional callback that renders and handles the Regenerate button.',
    },
    {
      name: 'onShare',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional callback that renders and handles the Share button.',
    },
    {
      name: 'feedback',
      type: "'up' | 'down' | null",
      defaultValue: 'undefined',
      description: 'Controlled feedback state.',
    },
    {
      name: 'defaultFeedback',
      type: "'up' | 'down' | null",
      defaultValue: 'null',
      description: 'Initial feedback state in uncontrolled mode.',
    },
    {
      name: 'onFeedbackChange',
      type: "(next: 'up' | 'down' | null) => void",
      defaultValue: 'undefined',
      description: 'Callback invoked whenever thumbs up or thumbs down selection changes.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all built-in toolbar action buttons.',
    },
    {
      name: 'extraActions',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Optional custom trailing controls rendered after a subtle optical divider.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ResponseActionBar\n  contentToCopy="Refractor v1.1.0 introduces optical AI primitives."\n  onCopy={(text) => console.warn('Copied length:', text.length)}\n  onRegenerate={() => regenerateResponse()}\n  onShare={() => openShareSheet()}\n  defaultFeedback={null}\n  onFeedbackChange={(rating) => logFeedback(rating)}\n/>`,
  ],
};
