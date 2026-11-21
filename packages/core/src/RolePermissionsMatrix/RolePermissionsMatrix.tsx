'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { Check, Lock, ShieldCheck } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface RoleColumn {
  /** Unique identifier for the role column. */
  id: string;
  /** Display name for the role column header. */
  name: string;
  /** Optional role summary displayed beneath the role name. */
  description?: string;
  /** Locks the role column against mutation and renders a Locked pill. */
  locked?: boolean;
}

export interface PermissionRow {
  /** Unique identifier for the permission row. */
  id: string;
  /** Human-readable permission name. */
  label: string;
  /** Optional category name used for grouping badges and row pills. */
  category?: string;
  /** Optional description explaining what the permission authorizes. */
  description?: string;
}

export type RoleGrantsRecord = Readonly<Record<string, ReadonlyArray<string>>>;

type RolePermissionsMatrixBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface RolePermissionsMatrixProps extends RolePermissionsMatrixBaseProps {
  /** Role columns rendered across the matrix header. */
  roles: ReadonlyArray<RoleColumn>;
  /** Permission rows rendered down the matrix body. */
  permissions: ReadonlyArray<PermissionRow>;
  /** Controlled mapping of role IDs to granted permission IDs. */
  grants?: RoleGrantsRecord;
  /** Initial mapping of role IDs to granted permission IDs in uncontrolled mode. */
  defaultGrants?: RoleGrantsRecord;
  /** Callback invoked with the next grant mapping after toggling a permission or role column. */
  onChange?: (next: Record<string, string[]>) => void;
  /** Header title rendered in the optical slab banner (defaults to 'Role & Permissions Matrix'). */
  title?: string;
}

function grantsRecordToMap(record: RoleGrantsRecord | undefined): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  if (!record) return map;
  for (const [roleId, permIds] of Object.entries(record)) {
    map.set(roleId, new Set<string>(permIds));
  }
  return map;
}

function cloneGrantsMap(source: Map<string, Set<string>>): Map<string, Set<string>> {
  const next = new Map<string, Set<string>>();
  for (const [roleId, permSet] of source.entries()) {
    next.set(roleId, new Set<string>(permSet));
  }
  return next;
}

function grantsMapToRecord(map: Map<string, Set<string>>): Record<string, string[]> {
  return Object.fromEntries(
    Array.from(map.entries(), ([roleId, permSet]) => [roleId, Array.from(permSet)])
  );
}

export function RolePermissionsMatrix({
  roles,
  permissions,
  grants,
  defaultGrants,
  onChange,
  title = 'Role & Permissions Matrix',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RolePermissionsMatrixProps) {
  const override = useComponentOverride('RolePermissionsMatrix');
  const headingId = useId();
  const isControlled = grants !== undefined;

  const [uncontrolledMap, setUncontrolledMap] = useState<Map<string, Set<string>>>(() =>
    grantsRecordToMap(defaultGrants)
  );
  const [announcement, setAnnouncement] = useState<string>('');

  const controlledMap = useMemo<Map<string, Set<string>> | null>(
    () => (grants !== undefined ? grantsRecordToMap(grants) : null),
    [grants]
  );

  const activeGrantsMap = controlledMap ?? uncontrolledMap;
  const isEmpty = roles.length === 0 || permissions.length === 0;
  const permUnit = permissions.length === 1 ? 'permission' : 'permissions';

  const categorySummary = useMemo<Array<{ category: string; count: number }>>(() => {
    const counts = new Map<string, number>();
    for (const perm of permissions) {
      const category = perm.category?.trim();
      if (!category) continue;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return Array.from(counts.entries(), ([category, count]) => ({ category, count }));
  }, [permissions]);

  const handleTogglePermission = useCallback(
    (role: RoleColumn, perm: PermissionRow) => {
      if (role.locked) return;
      const nextMap = cloneGrantsMap(activeGrantsMap);
      const currentSet = nextMap.get(role.id) ?? new Set<string>();
      const wasChecked = currentSet.has(perm.id);

      if (wasChecked) {
        currentSet.delete(perm.id);
      } else {
        currentSet.add(perm.id);
      }
      nextMap.set(role.id, currentSet);

      if (!isControlled) {
        setUncontrolledMap(nextMap);
      }

      setAnnouncement(
        wasChecked
          ? `Revoked ${perm.label} from ${role.name}.`
          : `Granted ${perm.label} to ${role.name}.`
      );
      onChange?.(grantsMapToRecord(nextMap));
    },
    [activeGrantsMap, isControlled, onChange]
  );

  const handleToggleAllForRole = useCallback(
    (role: RoleColumn) => {
      if (role.locked || permissions.length === 0) return;
      const nextMap = cloneGrantsMap(activeGrantsMap);
      const currentSet = nextMap.get(role.id) ?? new Set<string>();
      const allGranted = permissions.every((perm) => currentSet.has(perm.id));

      if (allGranted) {
        for (const perm of permissions) {
          currentSet.delete(perm.id);
        }
      } else {
        for (const perm of permissions) {
          currentSet.add(perm.id);
        }
      }
      nextMap.set(role.id, currentSet);

      if (!isControlled) {
        setUncontrolledMap(nextMap);
      }

      setAnnouncement(
        allGranted
          ? `Revoked all ${permissions.length} ${permUnit} from ${role.name}.`
          : `Granted all ${permissions.length} ${permUnit} to ${role.name}.`
      );
      onChange?.(grantsMapToRecord(nextMap));
    },
    [activeGrantsMap, isControlled, onChange, permUnit, permissions]
  );

  const merged = mergeProps({
    themeTarget: themeProps('role-permissions-matrix', {
      empty: isEmpty,
      roleCount: roles.length,
      permissionCount: permissions.length,
    }),
    baseClassName: 'prism-slab overflow-hidden w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const emptyMessage =
    roles.length === 0 && permissions.length === 0
      ? 'No roles or permissions configured for this matrix.'
      : roles.length === 0
        ? 'No roles configured for this matrix.'
        : 'No permissions configured for this matrix.';

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3"
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        <div className="min-w-0 flex flex-wrap items-center gap-2.5">
          <span
            className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-info-main)' }}
          >
            <ShieldCheck aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>

          <h2
            id={headingId}
            className="text-sm font-semibold tracking-tight break-words"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </h2>

          <span
            data-testid="rpm-permission-count"
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {permissions.length} {permUnit}
          </span>
        </div>

        {categorySummary.length > 0 ? (
          <div
            data-testid="rpm-category-badges"
            className="flex flex-wrap items-center gap-1.5"
          >
            {categorySummary.map((item) => (
              <span
                key={item.category}
                className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                <span>{item.category}</span>
                <span
                  className="font-mono text-[10px] tabular-nums"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  {item.count}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table aria-labelledby={headingId} className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--prism-divider)' }}>
              <th
                scope="col"
                className="px-5 py-3.5 text-left align-bottom min-w-[220px]"
              >
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  Permission
                </span>
              </th>

              {roles.map((role) => {
                const roleSet = activeGrantsMap.get(role.id);
                const grantedCount = permissions.reduce(
                  (sum, perm) => sum + (roleSet?.has(perm.id) ? 1 : 0),
                  0
                );
                const allGranted = permissions.length > 0 && grantedCount === permissions.length;
                const isLocked = Boolean(role.locked);
                const toggleAllDisabled = isLocked || permissions.length === 0;

                return (
                  <th
                    key={role.id}
                    scope="col"
                    data-role-id={role.id}
                    data-role-locked={isLocked ? 'true' : undefined}
                    className="px-4 py-3.5 text-center align-top min-w-[144px]"
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <span
                          className="text-xs font-semibold break-words"
                          style={{ color: 'var(--prism-text-primary)' }}
                        >
                          {role.name}
                        </span>

                        {isLocked ? (
                          <span
                            data-testid={`rpm-locked-pill-${role.id}`}
                            className="prism-well inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                            style={{ color: 'var(--prism-warning-main)' }}
                          >
                            <Lock aria-hidden="true" className="w-2.5 h-2.5 shrink-0" />
                            <span>Locked</span>
                          </span>
                        ) : null}
                      </div>

                      {role.description ? (
                        <span
                          className="text-[11px] font-normal leading-snug max-w-[180px] break-words"
                          style={{ color: 'var(--prism-text-secondary)' }}
                        >
                          {role.description}
                        </span>
                      ) : null}

                      <span
                        data-testid={`rpm-role-count-${role.id}`}
                        className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {grantedCount}/{permissions.length}
                      </span>

                      <button
                        type="button"
                        disabled={toggleAllDisabled}
                        aria-label={`Toggle all permissions for ${role.name}`}
                        data-all-granted={allGranted ? 'true' : 'false'}
                        onClick={() => handleToggleAllForRole(role)}
                        className="prism-focus-ring prism-crystal mt-0.5 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:brightness-105 transition-all"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        Toggle all
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={roles.length + 1} className="px-5 py-8">
                  <div
                    data-testid="rpm-empty-state"
                    className="prism-well rounded-2xl px-4 py-6 text-center text-xs"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    {emptyMessage}
                  </div>
                </td>
              </tr>
            ) : (
              permissions.map((perm) => {
                const permCategory = perm.category?.trim();

                return (
                  <tr
                    key={perm.id}
                    data-permission-id={perm.id}
                    className="border-t transition-colors"
                    style={{ borderColor: 'var(--prism-divider)' }}
                  >
                    <th scope="row" className="px-5 py-3 text-left align-middle font-normal">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="text-sm font-medium break-words"
                            style={{ color: 'var(--prism-text-primary)' }}
                          >
                            {perm.label}
                          </span>

                          {permCategory ? (
                            <span
                              data-testid={`rpm-perm-category-${perm.id}`}
                              className="prism-crystal px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                              style={{ color: 'var(--prism-text-secondary)' }}
                            >
                              {permCategory}
                            </span>
                          ) : null}
                        </div>

                        {perm.description ? (
                          <span
                            className="text-xs leading-snug break-words"
                            style={{ color: 'var(--prism-text-secondary)' }}
                          >
                            {perm.description}
                          </span>
                        ) : null}
                      </div>
                    </th>

                    {roles.map((role) => {
                      const checked = activeGrantsMap.get(role.id)?.has(perm.id) ?? false;
                      const isLocked = Boolean(role.locked);

                      return (
                        <td key={role.id} className="px-4 py-3 text-center align-middle">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`${role.name}: ${perm.label}`}
                            disabled={isLocked}
                            onClick={() => handleTogglePermission(role, perm)}
                            className={`prism-focus-ring w-7 h-7 rounded-[9px] inline-flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:scale-105 ${
                              checked ? 'prism-emerald' : 'prism-well'
                            }`}
                          >
                            {checked ? (
                              <Check aria-hidden="true" className="w-4 h-4 stroke-[2.8]" />
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="rpm-live-region"
        className="sr-only"
      >
        {announcement}
      </div>
    </div>
  );
}

RolePermissionsMatrix.displayName = 'RolePermissionsMatrix';
