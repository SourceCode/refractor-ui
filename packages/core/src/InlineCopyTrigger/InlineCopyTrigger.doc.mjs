export const docs = {
  name: 'InlineCopyTrigger',
  displayName: 'Inline Copy Trigger',
  group: 'Foundational Primitives & Micro-Utilities',
  category: 'foundational-micro-utilities',
  keywords: [
    'copy',
    'clipboard',
    'inline',
    'trigger',
    'snippet',
    'token',
    'id',
    'hash',
    'url',
    'badge',
    'utility',
  ],
  usage: {
    description:
      'Lightweight inline optical-glass capsule button wrapping an ID, URL, commit hash, or token snippet. Clicking copies the exact payload via navigator.clipboard.writeText, morphs the trailing copy icon into a glowing emerald checkmark badge driven by --prism-success-main, announces status via an aria-live="polite" screen-reader region, resets cleanly after a clamped delay (400..10000ms), and degrades safely when clipboard access is unavailable or rejected.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide displayText alongside value when showing a shortened identifier or masked token so the visible snippet stays concise while the full exact value is written to the clipboard.',
      },
      {
        guidance: true,
        description:
          'Use the onCopy(copiedValue, succeeded) callback to trigger analytics or show a fallback manual-copy prompt if succeeded is false in restricted or insecure browser contexts.',
      },
      {
        guidance: false,
        description:
          'Wrap InlineCopyTrigger inside another interactive button or anchor; it renders a native <button type="button"> element with built-in keyboard activation and :focus-visible rings.',
      },
    ],
    accessibility: [
      {
        name: 'Native Button Semantics & Dynamic Copy Label',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Renders a native <button type="button"> with descriptive default aria-label ("Copy <label>" / "Copied: <label>"), IME-safe keydown guarding, and :focus-visible optical focus ring',
        description:
          'Supports native Enter and Space activation, guards active IME compositions via isComposing, respects consumer aria-label overrides, and avoids pointer-triggered focus rings.',
      },
      {
        name: 'Polite Clipboard Status Announcements',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Maintains a dedicated sr-only role="status" aria-live="polite" aria-atomic="true" live region announcing copy confirmation or failure',
        description:
          'Notifies assistive technology users immediately when text is copied or when clipboard access is blocked without shifting keyboard focus.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'string',
      defaultValue: 'required',
      description: 'Exact payload string copied to the clipboard on click.',
    },
    {
      name: 'displayText',
      type: 'string',
      defaultValue: 'value',
      description: 'Optional truncated or pretty display label rendered inside the capsule.',
    },
    {
      name: 'copiedLabel',
      type: 'string',
      defaultValue: "'Copied'",
      description: 'Confirmation label shown inside the glowing emerald checkmark badge.',
    },
    {
      name: 'resetDelayMs',
      type: 'number',
      defaultValue: '1800',
      description: 'Milliseconds before resetting the copied badge back to the copy icon (clamped 400..10000).',
    },
    {
      name: 'size',
      type: "'sm' | 'md'",
      defaultValue: "'md'",
      description: 'Capsule height, padding, and icon scale.',
    },
    {
      name: 'variant',
      type: "'crystal' | 'well' | 'ghost'",
      defaultValue: "'well'",
      description: 'Optical glass surface style for the inline capsule.',
    },
    {
      name: 'monospace',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Applies tabular monospace typography to the snippet text.',
    },
    {
      name: 'onCopy',
      type: '(copiedValue: string, succeeded: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback fired after each copy attempt with the copied payload and boolean outcome.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables click activation and applies dimmed disabled styling.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<InlineCopyTrigger value="req_01J8Z4K9X7M2P6N3" />`,
    `<InlineCopyTrigger\n  value="https://api.refractor.dev/v1/workspaces/ws_94a8f01c"\n  displayText="api.refractor.dev/.../ws_94a8f01c"\n  variant="crystal"\n  size="sm"\n  copiedLabel="Link copied"\n/>`,
    `<InlineCopyTrigger\n  value="sha256:9f86d081884c7d659a2feaa0c55ad015"\n  variant="ghost"\n  resetDelayMs={2400}\n  onCopy={(val, ok) => console.warn(val, ok)}\n/>`,
  ],
};

export default docs;
