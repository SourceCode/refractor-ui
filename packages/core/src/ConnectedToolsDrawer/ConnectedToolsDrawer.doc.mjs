export const docs = {
  name: 'ConnectedToolsDrawer',
  displayName: 'Connected Tools Drawer (MCP Server Directory)',
  group: 'AI Context, Memory & Configuration',
  category: 'ai-context-memory',
  keywords: [
    'mcp',
    'tools',
    'servers',
    'drawer',
    'permissions',
    'scopes',
    'health',
    'ai',
    'context',
    'integrations',
  ],
  usage: {
    description:
      'Optical-glass MCP server and external tool directory supporting embedded inline and right-anchored drawer layouts, with health status badges, tool count pills, permission scope chips, and accessible enable switches.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use mode="inline" inside settings views or agent configuration panels and mode="drawer" for slide-over inspection during active chat sessions.',
      },
      {
        guidance: true,
        description:
          'Surface explicit permission scopes (read, write, execute, network) on every server card so operators can audit tool privileges before enabling them.',
      },
      {
        guidance: false,
        description:
          'Pass unsanitized or negative tool counts assuming callers pre-validate telemetry; ConnectedToolsDrawer clamps non-finite and negative toolCount values safely to 0.',
      },
    ],
    accessibility: [
      {
        name: 'Dialog & Region Semantics with Escape Dismissal',
        criterion: '2.1.2 No Keyboard Trap & 4.1.2 Name, Role, Value',
        requirement: 'role="dialog" aria-modal="true" in drawer mode; role="region" in inline mode',
        description:
          'Associates the panel heading via aria-labelledby and dismisses cleanly on IME-safe Escape, backdrop click, or the explicit close button in drawer mode.',
      },
      {
        name: 'Accessible Server Enable Switches',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'role="switch" with aria-checked and descriptive aria-label per server',
        description:
          'Each server toggle exposes switch state via aria-checked and identifies its target server with aria-label="Toggle <name>".',
      },
    ],
  },
  props: [
    {
      name: 'servers',
      type: 'ConnectedToolServer[]',
      defaultValue: 'undefined',
      description: 'Controlled array of connected MCP servers and tool integrations.',
    },
    {
      name: 'defaultServers',
      type: 'ConnectedToolServer[]',
      defaultValue: '[]',
      description: 'Initial server list when operating in uncontrolled mode.',
    },
    {
      name: 'onToggleServer',
      type: '(serverId: string, enabled: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the toggled server ID and next enabled boolean.',
    },
    {
      name: 'onServersChange',
      type: '(servers: ConnectedToolServer[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated servers array after any switch change.',
    },
    {
      name: 'mode',
      type: "'inline' | 'drawer'",
      defaultValue: "'inline'",
      description: 'Renders either an embedded inline optical slab card or a right-anchored overlay drawer.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled visibility state in drawer mode.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Initial visibility state in uncontrolled drawer mode.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the drawer opens or closes.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Connected MCP & Tools'",
      description: 'Heading text displayed in the panel header.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ConnectedToolsDrawer\n  mode="inline"\n  defaultServers={[\n    {\n      id: 'github-mcp',\n      name: 'GitHub MCP',\n      description: 'Issues, pull requests, and repository search',\n      health: 'connected',\n      toolCount: 14,\n      scopes: ['read', 'write', 'network'],\n      enabled: true,\n    },\n  ]}\n  onToggleServer={(id, enabled) => console.warn(id, enabled)}\n/>`,
  ],
};
