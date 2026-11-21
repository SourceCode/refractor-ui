export const docs = {
  name: 'ChatMessageStream',
  displayName: 'Chat Message Stream',
  group: 'AI & Conversational Interfaces',
  category: 'ai-conversational',
  keywords: [
    'chat',
    'messages',
    'stream',
    'ai',
    'conversation',
    'assistant',
    'bubbles',
    'log',
    'streaming',
  ],
  usage: {
    description:
      'Optical glass scrollable conversation log distinguishing right-aligned warm-accent user bubbles, left-aligned crystal assistant cards with sanitized avatar/initials fallback, and centered system notice pills, complete with live streaming pulse/caret indicators, error badges, footer slots, automatic scroll-to-latest tracking, and a Jump to latest crystal capsule.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Compose ChatMessageStream with PromptComposer and pass citation or action bar elements into each assistant message footer slot.',
      },
      {
        guidance: true,
        description:
          'Set streaming={true} on the active assistant turn while tokens arrive so users see both the emerald Streaming pulse badge and live caret.',
      },
      {
        guidance: false,
        description:
          'Pass raw unsanitized HTML strings expecting markup rendering; ChatMessageStream intentionally renders message content as plain text to guarantee XSS safety.',
      },
    ],
    accessibility: [
      {
        name: 'Polite Conversation Log Region',
        criterion: '4.1.3 Status Messages & 1.3.1 Info and Relationships',
        requirement: 'role="log", aria-live="polite", aria-label on the scrollable container',
        description:
          'Exposes the scrollable optical slab as a semantic log region so screen readers announce incoming messages without interrupting active focus.',
      },
      {
        name: 'Keyboard-Only Jump Control & Safe Avatar Fallback',
        criterion: '2.4.7 Focus Visible & 1.1.1 Non-text Content',
        requirement: 'prism-focus-ring on Jump to latest and accessible initials fallback for avatars',
        description:
          'Provides keyboard-visible focus outlines on the Jump to latest button and guarantees alt text or role="img" initials whenever an avatar URL is omitted, rejected, or fails to load.',
      },
    ],
  },
  props: [
    {
      name: 'messages',
      type: 'ReadonlyArray<ChatMessage>',
      defaultValue: 'required',
      description: 'Ordered list of chat messages rendered in the stream (duplicate IDs are safely deduplicated).',
    },
    {
      name: 'emptyMessage',
      type: 'string',
      defaultValue: "'Start a conversation to see messages here.'",
      description: 'Placeholder text displayed in a recessed optical well when messages is empty.',
    },
    {
      name: 'maxHeightPx',
      type: 'number',
      defaultValue: '420',
      description: 'Maximum height of the scrollable log container in pixels, safely clamped between 180 and 900.',
    },
    {
      name: 'autoScroll',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Automatically scrolls to the newest message when the user is near the bottom of the stream.',
    },
    {
      name: 'ariaLabel',
      type: 'string',
      defaultValue: "'Conversation stream'",
      description: 'Accessible label attached to the role="log" container.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ChatMessageStream\n  maxHeightPx={420}\n  messages={[\n    {\n      id: 'sys-1',\n      role: 'system',\n      content: 'Optical Assistant connected · Context window 128k',\n      timestamp: '09:40',\n    },\n    {\n      id: 'u-1',\n      role: 'user',\n      author: 'Maya',\n      content: 'Summarize the Refractor optical blur tokens.',\n      timestamp: '09:41',\n      status: 'sent',\n    },\n    {\n      id: 'a-1',\n      role: 'assistant',\n      author: 'Prism AI',\n      content: 'Refractor uses --prism-blur-px (18px) for crystal controls and --prism-slab-blur-px (22px) for thick slabs.',\n      timestamp: '09:41',\n      streaming: true,\n    },\n  ]}\n/>`,
  ],
};
