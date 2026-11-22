export const docs = {
  name: 'PermissionsSharingMatrix',
  displayName: 'Permissions & Sharing Matrix',
  group: 'File Management & Operations',
  category: 'file-management-operations',
  keywords: [
    'permissions',
    'posix',
    'chmod',
    'octal',
    'symbolic',
    'sharing',
    'cloud-link',
    'access-control',
    'owner',
    'group',
    'file-management',
    'security',
  ],
  usage: {
    description:
      'Optical-glass POSIX permissions and cloud link-sharing control panel rendered inside a `prism-slab` surface. Features a live monospace octal and symbolic readout (`0754 · rwxr-xr--`), quick POSIX presets (`0644 Standard`, `0755 Executable`, `0600 Private`), editable `Owner` and `Group` inputs inside recessed `prism-well` bezels, a responsive 3×3 POSIX bit matrix (`Owner`, `Group`, `Public` × `Read (4)`, `Write (2)`, `Execute (1)`) with per-row octal digits inside `<div className="overflow-x-auto"><table>`, and a Cloud Link Sharing bar with semantic `--prism-*` access badges, conditional expiration controls, `sanitizeUrl`-guarded share URLs, and resilient clipboard copying with polite live announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `onChange={(state, octal, symbolic) => ...}` to persist both POSIX mode changes (`0754`, `rwxr-xr--`) and cloud link sharing policies atomically.',
      },
      {
        guidance: true,
        description:
          'Use the built-in quick presets (`0644 Standard`, `0755 Executable`, `0600 Private`) for common filesystem baselines before fine-tuning individual scope bits.',
      },
      {
        guidance: false,
        description:
          'Pass unvalidated protocol URLs (`javascript:`, `vbscript:`, `data:`) expecting them to become copyable; `sanitizeUrl` blocks unsafe protocols and disables link copying automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Matrix Table & Accessible Checkbox Controls',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Matrix uses `<table>` with `<thead>` and `<tbody>` wrapped directly in `<div className="overflow-x-auto">`, scope headers (`scope="col"` / `scope="row"`), 9 `role="checkbox"` controls with explicit `aria-checked` and `<Scope> <Bit>` names, and keyboard-only `.prism-focus-ring` focus rings',
        description:
          'Allows screen reader and keyboard users to inspect and toggle every POSIX scope and bit reliably across desktop and mobile viewports.',
      },
      {
        name: 'IME-Safe Ownership Inputs & Polite Status Announcements',
        criterion: '2.1.1 Keyboard & 4.1.3 Status Messages',
        requirement:
          'Owner (`aria-label="Resource owner"`) and Group (`aria-label="Resource group"`) inputs guard Enter keydowns with `!event.nativeEvent.isComposing`, while an `aria-live="polite"` region announces preset applications, bit toggles, sharing changes, and clipboard copy results',
        description:
          'Prevents CJK IME composition interruptions and delivers non-intrusive feedback for permission mutations and clipboard fallbacks.',
      },
    ],
  },
  props: [
    {
      name: 'resourceName',
      type: 'string',
      defaultValue: "'prism-shader-kernel.sh'",
      description: 'Target filename or resource label rendered in the optical header.',
    },
    {
      name: 'shareUrl',
      type: 'string',
      defaultValue: "'https://prism.refractor.dev/share/prism-shader-kernel'",
      description:
        'Cloud sharing URL sanitized through `sanitizeUrl`; unsafe protocols (`javascript:`, `vbscript:`, `data:`) are blocked and disable the copy button.',
    },
    {
      name: 'value',
      type: 'PermissionsSharingState',
      defaultValue: 'undefined',
      description: 'Controlled full permissions and cloud link sharing state.',
    },
    {
      name: 'defaultValue',
      type: 'Partial<PermissionsSharingState>',
      defaultValue:
        "{ ownerName: 'prism-admin', groupName: 'optical-eng', posix: 0754 (rwxr-xr--), shareAccess: 'viewer', shareExpiry: '30d' }",
      description: 'Initial partial or complete state when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(state: PermissionsSharingState, octal: string, symbolic: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever ownership, POSIX bits, presets, share access level, or link expiration changes.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all presets, ownership inputs, POSIX checkboxes, share selectors, and the Copy Share Link button.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<PermissionsSharingMatrix />`,
    `<PermissionsSharingMatrix\n  resourceName="deploy-release.sh"\n  shareUrl="https://prism.refractor.dev/share/deploy-release"\n  defaultValue={{\n    ownerName: 'release-bot',\n    groupName: 'platform-ops',\n    shareAccess: 'restricted',\n    shareExpiry: '7d',\n  }}\n  onChange={(state, octal, symbolic) => console.warn(octal, symbolic, state.shareAccess)}\n/>`,
  ],
};

export default docs;
