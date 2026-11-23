'use client';

import { useCallback, useEffect, useId, useMemo } from 'react';
import { Plug, Server, Wrench, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type ToolHealthStatus = 'connected' | 'degraded' | 'disconnected';
export type ToolPermissionScope = 'read' | 'write' | 'execute' | 'network';
export type ConnectedToolsMode = 'inline' | 'drawer';

export interface ConnectedToolServer {
  /** Unique identifier for the connected MCP server or tool integration. */
  id: string;
  /** Display name rendered for the server. */
  name: string;
  /** Optional short summary of what the server provides. */
  description?: string;
  /** Current connection health status ('connected' | 'degraded' | 'disconnected'). */
  health: ToolHealthStatus;
  /** Number of tools exposed by this server (sanitized to non-negative integer). */
  toolCount: number;
  /** Permission scopes granted to this server. */
  scopes: ToolPermissionScope[];
  /** Whether the server is currently enabled for agent invocations. */
  enabled: boolean;
}

export interface ConnectedToolsDrawerProps extends BaseProps<HTMLDivElement> {
  /** Controlled list of connected MCP servers and tool integrations. */
  servers?: ConnectedToolServer[];
  /** Initial server list when operating in uncontrolled mode. */
  defaultServers?: ConnectedToolServer[];
  /** Callback fired when an individual server enable switch is toggled. */
  onToggleServer?: (serverId: string, enabled: boolean) => void;
  /** Callback fired with the updated server array after any toggle mutation. */
  onServersChange?: (servers: ConnectedToolServer[]) => void;
  /** Presentation mode: embedded 'inline' card or right-anchored overlay 'drawer' (defaults to 'inline'). */
  mode?: ConnectedToolsMode;
  /** Controlled open visibility when mode is 'drawer'. */
  open?: boolean;
  /** Initial open visibility for uncontrolled drawer mode (defaults to true). */
  defaultOpen?: boolean;
  /** Callback invoked when drawer visibility changes (Escape, backdrop click, or close button). */
  onOpenChange?: (open: boolean) => void;
  /** Panel heading text (defaults to 'Connected MCP & Tools'). */
  title?: string;
}

interface HealthVisualMeta {
  label: string;
  textColorVar: string;
  borderColorVar: string;
  dotColorVar: string;
}

interface ScopeVisualMeta {
  textColorVar: string;
  borderColorVar: string;
}

const EMPTY_SERVERS: ConnectedToolServer[] = [];

function sanitizeToolCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function getHealthVisualMeta(health: ToolHealthStatus): HealthVisualMeta {
  switch (health) {
    case 'connected':
      return {
        label: 'Connected',
        textColorVar: 'var(--prism-emerald-text, var(--prism-success-main))',
        borderColorVar: 'var(--prism-emerald-border, var(--prism-success-main))',
        dotColorVar: 'var(--prism-emerald-text, var(--prism-success-main))',
      };
    case 'degraded':
      return {
        label: 'Degraded',
        textColorVar: 'var(--prism-amber-text, var(--prism-warning-main))',
        borderColorVar: 'var(--prism-amber-border, var(--prism-warning-main))',
        dotColorVar: 'var(--prism-amber-text, var(--prism-warning-main))',
      };
    case 'disconnected':
      return {
        label: 'Disconnected',
        textColorVar: 'var(--prism-rose-text, var(--prism-error-main))',
        borderColorVar: 'var(--prism-rose-border, var(--prism-error-main))',
        dotColorVar: 'var(--prism-rose-text, var(--prism-error-main))',
      };
  }
}

function getScopeVisualMeta(scope: ToolPermissionScope): ScopeVisualMeta {
  switch (scope) {
    case 'read':
      return {
        textColorVar: 'var(--prism-info-main)',
        borderColorVar: 'var(--prism-divider)',
      };
    case 'write':
      return {
        textColorVar: 'var(--prism-amber-text, var(--prism-warning-main))',
        borderColorVar: 'var(--prism-amber-border, var(--prism-warning-main))',
      };
    case 'execute':
      return {
        textColorVar: 'var(--prism-primary-main)',
        borderColorVar: 'var(--prism-primary-main)',
      };
    case 'network':
      return {
        textColorVar: 'var(--prism-secondary-dark)',
        borderColorVar: 'var(--prism-secondary-main)',
      };
  }
}

function ConnectedToolsDrawerInner({
  servers,
  defaultServers = EMPTY_SERVERS,
  onToggleServer,
  onServersChange,
  mode = 'inline',
  open,
  defaultOpen = true,
  onOpenChange,
  title = 'Connected MCP & Tools',
  onClick,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ConnectedToolsDrawerProps) {
  const titleId = useId();
  const override = useComponentOverride('ConnectedToolsDrawer');

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const handleServersChange = useCallback(
    (next: ConnectedToolServer[]) => {
      onServersChange?.(
        next.map((server) => ({
          ...server,
          scopes: [...server.scopes],
        }))
      );
    },
    [onServersChange]
  );

  const [rawServers, setServers] = useControllableState<ConnectedToolServer[]>({
    value: servers,
    defaultValue: defaultServers,
    onChange: handleServersChange,
  });

  useEffect(() => {
    if (mode !== 'drawer' || !isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isOpen, setIsOpen]);

  const sanitizedServers = useMemo<ConnectedToolServer[]>(
    () =>
      rawServers.map((server) => ({
        id: server.id,
        name: server.name,
        ...(server.description !== undefined ? { description: server.description } : {}),
        health: server.health,
        toolCount: sanitizeToolCount(server.toolCount),
        scopes: Array.from(new Set(server.scopes)),
        enabled: Boolean(server.enabled),
      })),
    [rawServers]
  );

  if (mode === 'drawer' && !isOpen) {
    return null;
  }

  const isEmpty = sanitizedServers.length === 0;
  const enabledCount = sanitizedServers.reduce(
    (count, server) => count + (server.enabled ? 1 : 0),
    0
  );
  const totalTools = sanitizedServers.reduce((sum, server) => sum + server.toolCount, 0);

  const handleToggleServer = (targetId: string, nextEnabled: boolean) => {
    const updated: ConnectedToolServer[] = sanitizedServers.map((server) =>
      server.id === targetId
        ? { ...server, scopes: [...server.scopes], enabled: nextEnabled }
        : { ...server, scopes: [...server.scopes] }
    );
    onToggleServer?.(targetId, nextEnabled);
    setServers(updated);
  };

  const merged = mergeProps({
    themeTarget: themeProps('connected-tools-drawer', {
      mode,
      open: mode === 'drawer' ? isOpen : true,
      empty: isEmpty,
    }),
    baseClassName:
      mode === 'drawer'
        ? 'fixed inset-0 z-50 prism-backdrop-scrim flex justify-end'
        : 'prism-slab w-full flex flex-col overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const panelContent = (
    <>
      <div
        className="px-5 py-4 flex items-center justify-between gap-3 border-b"
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Plug className="w-4 h-4 shrink-0" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base font-semibold truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </h2>
            <p
              data-testid="connected-tools-summary"
              className="text-xs font-medium tabular-nums truncate"
              style={STYLE_TEXT_SECONDARY}
            >
              {enabledCount} active · {totalTools} tools
            </p>
          </div>
        </div>

        {mode === 'drawer' ? (
          <button
            type="button"
            aria-label="Close connected tools drawer"
            onClick={() => setIsOpen(false)}
            className="prism-focus-ring rounded-lg p-1.5 cursor-pointer disabled:cursor-not-allowed enabled:hover:opacity-100 opacity-75 transition-opacity shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        {isEmpty ? (
          <div
            data-testid="connected-tools-empty"
            className="prism-well rounded-2xl px-5 py-10 text-center flex flex-col items-center gap-2"
          >
            <Server
              className="w-7 h-7 opacity-60"
              aria-hidden="true"
              style={STYLE_TEXT_SECONDARY}
            />
            <p
              className="text-sm font-semibold"
              style={STYLE_TEXT_PRIMARY}
            >
              No connected tool servers
            </p>
            <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
              Connect an MCP server or tool integration to expose capabilities here.
            </p>
          </div>
        ) : (
          <ul aria-label="Connected tool servers" className="space-y-3">
            {sanitizedServers.map((server) => {
              const healthMeta = getHealthVisualMeta(server.health);
              return (
                <li
                  key={server.id}
                  data-server-id={server.id}
                  data-health={server.health}
                  data-enabled={server.enabled ? 'true' : 'false'}
                  className="prism-crystal rounded-2xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className="text-sm font-semibold leading-snug break-words"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          {server.name}
                        </p>

                        <span
                          data-testid={`server-health-${server.id}`}
                          data-health-status={server.health}
                          className="prism-well border rounded-full px-2 py-0.5 inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap"
                          style={{
                            color: healthMeta.textColorVar,
                            borderColor: healthMeta.borderColorVar,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: healthMeta.dotColorVar }}
                          />
                          <span>{healthMeta.label}</span>
                        </span>
                      </div>

                      {server.description ? (
                        <p
                          className="text-xs leading-relaxed break-words"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {server.description}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={server.enabled}
                      aria-label={`Toggle ${server.name}`}
                      onClick={() => handleToggleServer(server.id, !server.enabled)}
                      className={`prism-focus-ring relative w-12 h-7 rounded-full p-1 inline-flex items-center transition-[color,background-color,border-color,opacity,transform] duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 shrink-0 ${
                        server.enabled ? 'prism-emerald' : 'prism-crystal'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`prism-thumb block w-5 h-5 rounded-full transition-transform duration-200 ${
                          server.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div
                    className="pt-2 border-t flex flex-wrap items-center justify-between gap-2"
                    style={STYLE_BORDER_DIVIDER}
                  >
                    <span
                      data-testid={`server-tool-count-${server.id}`}
                      className="prism-well rounded-full px-2.5 py-0.5 inline-flex items-center gap-1 text-[11px] font-medium tabular-nums"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      <Wrench className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>{server.toolCount} tools</span>
                    </span>

                    {server.scopes.length > 0 ? (
                      <div
                        aria-label={`Permission scopes for ${server.name}`}
                        className="flex flex-wrap items-center gap-1.5"
                      >
                        {server.scopes.map((scope) => {
                          const scopeMeta = getScopeVisualMeta(scope);
                          return (
                            <span
                              key={scope}
                              data-scope={scope}
                              className="prism-well border rounded-full px-2 py-0.5 font-mono text-[11px] font-medium whitespace-nowrap"
                              style={{
                                color: scopeMeta.textColorVar,
                                borderColor: scopeMeta.borderColorVar,
                              }}
                            >
                              {scope}
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  if (mode === 'inline') {
    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        onClick={onClick}
        {...rest}
        {...merged}
      >
        {panelContent}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={composeEventHandlers(onClick, () => setIsOpen(false))}
      {...rest}
      {...merged}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="prism-slab ml-auto h-full w-full max-w-md rounded-l-[28px] rounded-r-none flex flex-col overflow-hidden"
      >
        {panelContent}
      </div>
    </div>
  );
}

export const ConnectedToolsDrawer = /*#__PURE__*/ memoWithDisplayName(ConnectedToolsDrawerInner, 'ConnectedToolsDrawer');
