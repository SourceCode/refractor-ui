export const docs = {
  name: 'RolePermissionsMatrix',
  displayName: 'Role & Permissions Matrix',
  group: 'Security, Auth & Account Management',
  category: 'security-auth',
  keywords: [
    'rbac',
    'roles',
    'permissions',
    'matrix',
    'access-control',
    'acl',
    'security',
    'auth',
    'governance',
    'admin',
  ],
  usage: {
    description:
      'Optical-glass role-based access control (RBAC) matrix table displaying role columns, locked-role badges, tabular grant counters, column-wide toggle controls, permission category badges, prototype-safe Map/Set grant lookups, and accessible checkbox buttons with polite live-region announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Mark built-in super-admin or system roles with locked: true so administrators can audit their grants without risking accidental lockout.',
      },
      {
        guidance: true,
        description:
          'Group related capabilities with concise category labels and descriptions so reviewers can scan high-impact permissions before granting column-wide access.',
      },
      {
        guidance: false,
        description:
          'Rely solely on client-side disabled controls for authorization enforcement; always validate RBAC grant mutations on the server alongside onChange.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Table Structure & Row/Column Headers',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'Semantic <table> with <thead>, <tbody>, scope="col" role headers, and scope="row" permission headers',
        description:
          'Associates every permission checkbox cell with both its role column header and permission row header and labels the table via aria-labelledby.',
      },
      {
        name: 'Accessible Checkbox Controls & Live Announcements',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement: 'role="checkbox" buttons with aria-checked, descriptive aria-label, keyboard-only focus rings, and aria-live="polite" status announcements',
        description:
          'Each matrix cell exposes role="checkbox", aria-checked, and "${role.name}: ${perm.label}" while announcing single and column-wide permission changes through a polite live region.',
      },
    ],
  },
  props: [
    {
      name: 'roles',
      type: 'ReadonlyArray<RoleColumn>',
      defaultValue: 'required',
      description: 'Role columns rendered across the matrix header with optional description and locked protection.',
    },
    {
      name: 'permissions',
      type: 'ReadonlyArray<PermissionRow>',
      defaultValue: 'required',
      description: 'Permission rows rendered inside tbody with optional category pills and descriptions.',
    },
    {
      name: 'grants',
      type: 'RoleGrantsRecord',
      defaultValue: 'undefined',
      description: 'Controlled map of role IDs to arrays of granted permission IDs.',
    },
    {
      name: 'defaultGrants',
      type: 'RoleGrantsRecord',
      defaultValue: 'undefined',
      description: 'Initial map of role IDs to granted permission IDs when used in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(next: Record<string, string[]>) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the updated prototype-safe grants record whenever a permission or role column changes.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Role & Permissions Matrix'",
      description: 'Heading displayed in the optical prism-slab header bar.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and optical style overrides.',
    },
  ],
  examples: [
    `<RolePermissionsMatrix\n  title="Workspace RBAC Policy"\n  roles={[\n    { id: 'owner', name: 'Owner', description: 'Full workspace control', locked: true },\n    { id: 'editor', name: 'Editor', description: 'Manage project assets' },\n    { id: 'viewer', name: 'Viewer', description: 'Read-only audit access' },\n  ]}\n  permissions={[\n    { id: 'billing.manage', label: 'Manage billing', category: 'Billing', description: 'Update payment methods and plans.' },\n    { id: 'members.invite', label: 'Invite members', category: 'Security', description: 'Send workspace invitations.' },\n    { id: 'audit.read', label: 'Read audit logs', category: 'Security', description: 'Export compliance event trails.' },\n  ]}\n  defaultGrants={{\n    owner: ['billing.manage', 'members.invite', 'audit.read'],\n    editor: ['members.invite', 'audit.read'],\n    viewer: ['audit.read'],\n  }}\n/>`,
  ],
};
