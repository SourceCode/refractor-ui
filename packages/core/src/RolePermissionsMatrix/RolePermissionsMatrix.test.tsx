import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  RolePermissionsMatrix,
  type PermissionRow,
  type RoleColumn,
  type RoleGrantsRecord,
} from './index';

const SAMPLE_ROLES: readonly RoleColumn[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'System administrator',
    locked: true,
  },
  {
    id: 'editor',
    name: 'Editor',
    description: 'Workspace contributor',
  },
  {
    id: 'viewer',
    name: 'Viewer',
  },
];

const SAMPLE_PERMISSIONS: readonly PermissionRow[] = [
  {
    id: 'billing.manage',
    label: 'Manage billing',
    category: 'Billing',
    description: 'Update subscription plans and invoices.',
  },
  {
    id: 'members.invite',
    label: 'Invite members',
    category: 'Security',
    description: 'Send organization invitations.',
  },
  {
    id: 'audit.read',
    label: 'Read audit logs',
    category: 'Security',
  },
];

const INITIAL_GRANTS: RoleGrantsRecord = {
  owner: ['billing.manage', 'members.invite', 'audit.read'],
  editor: ['members.invite'],
  viewer: ['audit.read'],
};

describe('RolePermissionsMatrix', () => {
  it('renders header, category badges, semantic table sections, locked pill, counts, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            RolePermissionsMatrix: {
              className: 'theme-rpm',
              style: { maxWidth: '960px' },
            },
          },
        }}
      >
        <RolePermissionsMatrix
          ref={ref}
          roles={SAMPLE_ROLES}
          permissions={SAMPLE_PERMISSIONS}
          defaultGrants={INITIAL_GRANTS}
          className="custom-rpm"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="rpm-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('rpm-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-role-permissions-matrix',
      'prism-slab',
      'theme-rpm',
      'custom-rpm'
    );
    expect(root).toHaveStyle({ maxWidth: '960px' });
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).toHaveAttribute('data-role-count', '3');
    expect(root).toHaveAttribute('data-permission-count', '3');

    expect(
      screen.getByRole('heading', { name: 'Role & Permissions Matrix' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('rpm-permission-count')).toHaveTextContent('3 permissions');

    const categoryBadges = screen.getByTestId('rpm-category-badges');
    expect(within(categoryBadges).getByText('Billing')).toBeInTheDocument();
    expect(within(categoryBadges).getByText('1')).toBeInTheDocument();
    expect(within(categoryBadges).getByText('Security')).toBeInTheDocument();
    expect(within(categoryBadges).getByText('2')).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Role & Permissions Matrix' });
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();

    expect(screen.getByTestId('rpm-locked-pill-owner')).toHaveTextContent('Locked');
    expect(screen.queryByTestId('rpm-locked-pill-editor')).not.toBeInTheDocument();

    expect(screen.getByTestId('rpm-role-count-owner')).toHaveTextContent('3/3');
    expect(screen.getByTestId('rpm-role-count-editor')).toHaveTextContent('1/3');
    expect(screen.getByTestId('rpm-role-count-viewer')).toHaveTextContent('1/3');

    expect(screen.getByText('System administrator')).toBeInTheDocument();
    expect(screen.getByText('Update subscription plans and invoices.')).toBeInTheDocument();
    expect(screen.getByTestId('rpm-perm-category-billing.manage')).toHaveTextContent('Billing');

    const grantedCheckbox = screen.getByRole('checkbox', {
      name: 'Editor: Invite members',
    });
    expect(grantedCheckbox).toHaveAttribute('aria-checked', 'true');
    expect(grantedCheckbox).toHaveClass('prism-emerald', 'prism-focus-ring');
    expect(grantedCheckbox.querySelector('svg')).not.toBeNull();

    const uncheckedCheckbox = screen.getByRole('checkbox', {
      name: 'Editor: Manage billing',
    });
    expect(uncheckedCheckbox).toHaveAttribute('aria-checked', 'false');
    expect(uncheckedCheckbox).toHaveClass('prism-well', 'prism-focus-ring');
    expect(uncheckedCheckbox.querySelector('svg')).toBeNull();
  });

  it('toggles individual permissions and column Toggle all in uncontrolled mode with live announcements', () => {
    const onChange = vi.fn();

    render(
      <RolePermissionsMatrix
        title="Access Policy"
        roles={SAMPLE_ROLES}
        permissions={SAMPLE_PERMISSIONS}
        defaultGrants={{ editor: ['members.invite'] }}
        onChange={onChange}
      />
    );

    const liveRegion = screen.getByTestId('rpm-live-region');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveTextContent('');

    // Grant a permission on viewer (which had no prior entry in defaultGrants)
    const viewerBilling = screen.getByRole('checkbox', { name: 'Viewer: Manage billing' });
    expect(viewerBilling).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(viewerBilling);

    expect(viewerBilling).toHaveAttribute('aria-checked', 'true');
    expect(viewerBilling).toHaveClass('prism-emerald');
    expect(screen.getByTestId('rpm-role-count-viewer')).toHaveTextContent('1/3');
    expect(liveRegion).toHaveTextContent('Granted Manage billing to Viewer.');
    expect(onChange).toHaveBeenLastCalledWith({
      editor: ['members.invite'],
      viewer: ['billing.manage'],
    });

    // Revoke that permission
    fireEvent.click(viewerBilling);
    expect(viewerBilling).toHaveAttribute('aria-checked', 'false');
    expect(viewerBilling).toHaveClass('prism-well');
    expect(screen.getByTestId('rpm-role-count-viewer')).toHaveTextContent('0/3');
    expect(liveRegion).toHaveTextContent('Revoked Manage billing from Viewer.');
    expect(onChange).toHaveBeenLastCalledWith({
      editor: ['members.invite'],
      viewer: [],
    });

    // Toggle all on Editor (currently 1/3 -> should grant all 3)
    const editorToggleAll = screen.getByRole('button', {
      name: 'Toggle all permissions for Editor',
    });
    expect(editorToggleAll).toHaveAttribute('data-all-granted', 'false');
    fireEvent.click(editorToggleAll);

    expect(screen.getByTestId('rpm-role-count-editor')).toHaveTextContent('3/3');
    expect(editorToggleAll).toHaveAttribute('data-all-granted', 'true');
    expect(liveRegion).toHaveTextContent('Granted all 3 permissions to Editor.');
    expect(onChange).toHaveBeenLastCalledWith({
      editor: ['members.invite', 'billing.manage', 'audit.read'],
      viewer: [],
    });

    // Toggle all again on Editor (currently 3/3 -> should revoke all 3)
    fireEvent.click(editorToggleAll);
    expect(screen.getByTestId('rpm-role-count-editor')).toHaveTextContent('0/3');
    expect(editorToggleAll).toHaveAttribute('data-all-granted', 'false');
    expect(liveRegion).toHaveTextContent('Revoked all 3 permissions from Editor.');
    expect(onChange).toHaveBeenLastCalledWith({
      editor: [],
      viewer: [],
    });

    // Toggle all on Viewer when it has empty entry (grants all 3)
    const viewerToggleAll = screen.getByRole('button', {
      name: 'Toggle all permissions for Viewer',
    });
    fireEvent.click(viewerToggleAll);
    expect(screen.getByTestId('rpm-role-count-viewer')).toHaveTextContent('3/3');
    expect(liveRegion).toHaveTextContent('Granted all 3 permissions to Viewer.');
  });

  it('supports controlled grants mode and singular permission labels without category badges', () => {
    const singlePerm: readonly PermissionRow[] = [
      { id: 'deploy', label: 'Deploy release', category: '   ' },
    ];
    const singleRole: readonly RoleColumn[] = [{ id: 'ops', name: 'Ops' }];

    function ControlledHarness() {
      const [grants, setGrants] = useState<RoleGrantsRecord>({
        ops: ['legacy.hidden'],
      });
      return (
        <RolePermissionsMatrix
          roles={singleRole}
          permissions={singlePerm}
          grants={grants}
          onChange={(next) => setGrants(next)}
        />
      );
    }

    render(<ControlledHarness />);

    expect(screen.getByTestId('rpm-permission-count')).toHaveTextContent('1 permission');
    expect(screen.queryByTestId('rpm-category-badges')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rpm-perm-category-deploy')).not.toBeInTheDocument();
    // Stale permission outside matrix rows must not inflate the tabular count
    expect(screen.getByTestId('rpm-role-count-ops')).toHaveTextContent('0/1');

    const toggleAll = screen.getByRole('button', { name: 'Toggle all permissions for Ops' });
    fireEvent.click(toggleAll);
    expect(screen.getByTestId('rpm-role-count-ops')).toHaveTextContent('1/1');
    expect(screen.getByTestId('rpm-live-region')).toHaveTextContent(
      'Granted all 1 permission to Ops.'
    );

    fireEvent.click(toggleAll);
    expect(screen.getByTestId('rpm-role-count-ops')).toHaveTextContent('0/1');
    expect(screen.getByTestId('rpm-live-region')).toHaveTextContent(
      'Revoked all 1 permission from Ops.'
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Ops: Deploy release' });
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('does not mutate UI in controlled mode if parent ignores onChange (negative test)', () => {
    const onChange = vi.fn();

    render(
      <RolePermissionsMatrix
        roles={[{ id: 'editor', name: 'Editor' }]}
        permissions={[{ id: 'read', label: 'Read docs' }]}
        grants={{ editor: [] }}
        onChange={onChange}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Editor: Read docs' });
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith({ editor: ['read'] });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('rpm-role-count-editor')).toHaveTextContent('0/1');
  });

  it('renders graceful empty states for empty roles, empty permissions, and both empty (negative tests)', () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <RolePermissionsMatrix
        roles={[]}
        permissions={SAMPLE_PERMISSIONS}
        onChange={onChange}
        data-testid="rpm-empty"
      />
    );

    expect(screen.getByTestId('rpm-empty')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('rpm-empty-state')).toHaveTextContent(
      'No roles configured for this matrix.'
    );

    rerender(
      <RolePermissionsMatrix
        roles={SAMPLE_ROLES}
        permissions={[]}
        onChange={onChange}
        data-testid="rpm-empty"
      />
    );

    expect(screen.getByTestId('rpm-empty')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('rpm-empty-state')).toHaveTextContent(
      'No permissions configured for this matrix.'
    );
    expect(screen.getByTestId('rpm-role-count-editor')).toHaveTextContent('0/0');

    const emptyToggleAll = screen.getByRole('button', {
      name: 'Toggle all permissions for Editor',
    });
    expect(emptyToggleAll).toBeDisabled();

    // Adversarial DOM tamper: removing disabled when permissions is empty must still no-op
    emptyToggleAll.removeAttribute('disabled');
    fireEvent.click(emptyToggleAll);
    expect(onChange).not.toHaveBeenCalled();

    rerender(
      <RolePermissionsMatrix
        roles={[]}
        permissions={[]}
        onChange={onChange}
        data-testid="rpm-empty"
      />
    );

    expect(screen.getByTestId('rpm-empty-state')).toHaveTextContent(
      'No roles or permissions configured for this matrix.'
    );
  });

  it('blocks all mutations on locked roles even under adversarial DOM tampering', () => {
    const onChange = vi.fn();

    render(
      <RolePermissionsMatrix
        roles={SAMPLE_ROLES}
        permissions={SAMPLE_PERMISSIONS}
        defaultGrants={INITIAL_GRANTS}
        onChange={onChange}
      />
    );

    const ownerCheckbox = screen.getByRole('checkbox', { name: 'Owner: Manage billing' });
    const ownerToggleAll = screen.getByRole('button', {
      name: 'Toggle all permissions for Owner',
    });

    expect(ownerCheckbox).toBeDisabled();
    expect(ownerToggleAll).toBeDisabled();

    fireEvent.click(ownerCheckbox);
    fireEvent.click(ownerToggleAll);
    expect(onChange).not.toHaveBeenCalled();

    // Adversarial DOM tampering: strip disabled attribute and dispatch click
    ownerCheckbox.removeAttribute('disabled');
    ownerToggleAll.removeAttribute('disabled');
    fireEvent.click(ownerCheckbox);
    fireEvent.click(ownerToggleAll);

    expect(onChange).not.toHaveBeenCalled();
    expect(ownerCheckbox).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('rpm-role-count-owner')).toHaveTextContent('3/3');
  });

  it('stays 100% immune to __proto__, constructor, prototype IDs and XSS payloads (adversarial test)', () => {
    const xssPayload = '<script>window.__rpmXss=1</script><img src=x onerror=alert(1)>';
    const emittedRecords: Array<Record<string, string[]>> = [];

    const adversarialRoles: readonly RoleColumn[] = [
      { id: '__proto__', name: '__proto__', description: xssPayload },
      { id: 'constructor', name: 'constructor' },
      { id: 'prototype', name: 'prototype' },
    ];

    const adversarialPermissions: readonly PermissionRow[] = [
      {
        id: '__proto__',
        label: 'Proto access',
        category: '__proto__',
        description: xssPayload,
      },
      {
        id: 'constructor',
        label: 'Constructor access',
        category: 'constructor',
      },
      {
        id: 'prototype',
        label: xssPayload,
        category: 'prototype',
      },
    ];

    const initialAdversarialGrants: RoleGrantsRecord = Object.fromEntries([
      ['__proto__', ['__proto__']],
      ['constructor', ['constructor']],
    ]);

    render(
      <RolePermissionsMatrix
        title={xssPayload}
        roles={adversarialRoles}
        permissions={adversarialPermissions}
        defaultGrants={initialAdversarialGrants}
        onChange={(next) => emittedRecords.push(next)}
      />
    );

    // XSS payload must be rendered strictly as literal text
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(xssPayload)).toHaveLength(4);

    // Verify initial prototype-safe Map/Set lookups
    expect(screen.getByTestId('rpm-role-count-__proto__')).toHaveTextContent('1/3');
    expect(screen.getByTestId('rpm-role-count-constructor')).toHaveTextContent('1/3');
    expect(screen.getByTestId('rpm-role-count-prototype')).toHaveTextContent('0/3');

    const protoCheckbox = screen.getByRole('checkbox', {
      name: '__proto__: Constructor access',
    });
    expect(protoCheckbox).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(protoCheckbox);
    expect(protoCheckbox).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('rpm-role-count-__proto__')).toHaveTextContent('2/3');

    // Toggle all on prototype role
    const prototypeToggleAll = screen.getByRole('button', {
      name: 'Toggle all permissions for prototype',
    });
    fireEvent.click(prototypeToggleAll);
    expect(screen.getByTestId('rpm-role-count-prototype')).toHaveTextContent('3/3');

    const latest = emittedRecords[emittedRecords.length - 1];
    expect(latest).toBeDefined();
    expect(Object.getPrototypeOf(latest)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(latest, '__proto__')?.value).toEqual([
      '__proto__',
      'constructor',
    ]);
    expect(Object.getOwnPropertyDescriptor(latest, 'constructor')?.value).toEqual([
      'constructor',
    ]);
    expect(Object.getOwnPropertyDescriptor(latest, 'prototype')?.value).toEqual([
      '__proto__',
      'constructor',
      'prototype',
    ]);

    // Ensure Object.prototype was never polluted
    const probe: Record<string, string> = {};
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, '__proto__')).toBe(true);
    expect(Array.isArray(Object.getPrototypeOf(probe))).toBe(false);
    expect(probe['__proto__']).not.toEqual(['__proto__', 'constructor']);
    expect(probe['prototype']).toBeUndefined();
  });

  it('works cleanly without defaultGrants/onChange and round-trips __proto__/constructor in controlled mode', () => {
    const { unmount } = render(
      <RolePermissionsMatrix
        roles={[{ id: 'member', name: 'Member' }]}
        permissions={[{ id: 'docs.read', label: 'Read docs' }]}
      />
    );

    const standaloneCheckbox = screen.getByRole('checkbox', { name: 'Member: Read docs' });
    expect(standaloneCheckbox).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(standaloneCheckbox);
    expect(standaloneCheckbox).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle all permissions for Member' }));
    expect(standaloneCheckbox).toHaveAttribute('aria-checked', 'false');
    unmount();

    function ControlledProtoHarness() {
      const [grants, setGrants] = useState<RoleGrantsRecord>(() =>
        Object.fromEntries([['__proto__', ['constructor']]])
      );
      return (
        <RolePermissionsMatrix
          roles={[
            { id: '__proto__', name: '__proto__' },
            { id: 'constructor', name: 'constructor' },
          ]}
          permissions={[
            { id: '__proto__', label: 'Proto perm' },
            { id: 'constructor', label: 'Constructor perm' },
          ]}
          grants={grants}
          onChange={setGrants}
        />
      );
    }

    render(<ControlledProtoHarness />);
    expect(screen.getByTestId('rpm-role-count-__proto__')).toHaveTextContent('1/2');
    expect(screen.getByTestId('rpm-role-count-constructor')).toHaveTextContent('0/2');

    fireEvent.click(screen.getByRole('checkbox', { name: '__proto__: Proto perm' }));
    expect(screen.getByTestId('rpm-role-count-__proto__')).toHaveTextContent('2/2');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle all permissions for constructor' }));
    expect(screen.getByTestId('rpm-role-count-constructor')).toHaveTextContent('2/2');
  });
});
