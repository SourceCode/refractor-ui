export const docs = {
  name: 'ApiRequestBuilder',
  displayName: 'API Request Builder',
  group: 'Enterprise Workflows, Data Ops & API Tooling',
  category: 'enterprise-ops-api',
  keywords: [
    'api',
    'http',
    'rest',
    'request',
    'builder',
    'console',
    'postman',
    'headers',
    'query-params',
    'json',
    'response',
    'developer-tools',
  ],
  usage: {
    description:
      'Embedded HTTP API request console inside a sculpted prism-slab optical-glass card with semantic method styling, sanitizeUrl protocol validation, IME-safe Ctrl/Cmd+Enter execution, roving-tabindex Params/Headers/Body inspector, safe JSON.parse formatting, deterministic optical mock responder, and a literal-text live response viewer with header inspection and clipboard copy.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide a typed async onSend handler to proxy requests through your authenticated backend or API gateway while preserving automatic loading states and 500 error snapshot recovery.',
      },
      {
        guidance: true,
        description:
          'Use defaultParams and defaultHeaders to pre-seed common query filters and content-type headers without mutating consumer arrays.',
      },
      {
        guidance: false,
        description:
          'Render unescaped HTML from API responses or bypass sanitizeUrl validation; ApiRequestBuilder blocks javascript:, data:, and vbscript: URLs and always renders response bodies as literal text.',
      },
    ],
    accessibility: [
      {
        name: 'Roving tablist, polite status announcements, and IME-safe keyboard shortcuts',
        criterion: '2.1.1 Keyboard & 4.1.3 Status Messages',
        requirement:
          'role="tablist", role="tab", aria-selected, ArrowLeft/ArrowRight/Home/End roving navigation, role="alert" URL validation banner, role="status" aria-live="polite" copy & response announcements, and keyboard-only prism-focus-ring',
        description:
          'Every form input, select, checkbox, and action button exposes explicit aria-label text; keyboard shortcuts guard against IME composition via isComposing; and copy/response events announce state transitions to screen readers.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'API Request Builder'",
      description: 'Heading rendered in the top optical glass console header.',
    },
    {
      name: 'defaultMethod',
      type: 'ApiHttpMethod',
      defaultValue: "'GET'",
      description: "Initial HTTP verb ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE').",
    },
    {
      name: 'defaultUrl',
      type: 'string',
      defaultValue: "'https://api.refractor.dev/v1/deployments'",
      description: 'Initial endpoint URL validated through sanitizeUrl before sending.',
    },
    {
      name: 'defaultParams',
      type: 'ReadonlyArray<ApiKeyValueRow>',
      defaultValue: '[]',
      description: 'Initial query parameter rows displayed in the Params tab.',
    },
    {
      name: 'defaultHeaders',
      type: 'ReadonlyArray<ApiKeyValueRow>',
      defaultValue: '[]',
      description: 'Initial HTTP header rows displayed in the Headers tab.',
    },
    {
      name: 'defaultBody',
      type: 'string',
      defaultValue: "''",
      description: 'Initial request JSON body text displayed in the Body tab.',
    },
    {
      name: 'onSend',
      type: '(payload: ApiRequestPayload) => ApiResponseSnapshot | Promise<ApiResponseSnapshot>',
      defaultValue: 'undefined',
      description:
        'Custom sync or async request handler. When omitted, a deterministic built-in optical mock responder fulfills requests immediately.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables editing and request submission across all controls.',
    },
  ],
  examples: [
    `<ApiRequestBuilder
  title="Deployments API Console"
  defaultMethod="POST"
  defaultUrl="https://api.refractor.dev/v1/deployments"
  defaultParams={[{ id: 'p-1', key: 'env', value: 'production', enabled: true }]}
  defaultHeaders={[{ id: 'h-1', key: 'Content-Type', value: 'application/json', enabled: true }]}
  defaultBody={'{"service":"refractor-edge","replicas":3}'}
  onSend={async (payload) => executeApiRequest(payload)}
/>`,
  ],
};
