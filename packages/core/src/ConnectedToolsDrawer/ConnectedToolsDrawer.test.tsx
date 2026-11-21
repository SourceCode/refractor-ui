import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ConnectedToolsDrawer,
  type ConnectedToolServer,
} from './index';

const SAMPLE_SERVERS: ConnectedToolServer[] = [
  {
    id: 'github-mcp',
    name: 'GitHub MCP',
    description: 'Pull requests, issues, and repository code search.',
    health: 'connected',
    toolCount: 12,
    scopes: ['read', 'write', 'network'],
    enabled: true,
  },
  {
    id: 'postgres-mcp',
    name: 'Postgres Explorer',
    description: 'Read-only analytical query execution.',
    health: 'degraded',
    toolCount: 5,
    scopes: ['read', 'execute'],
    enabled: true,
  },
  {
    id: 'local-shell',
    name: 'Workspace Runner',
    health: 'disconnected',
    toolCount: 3,
    scopes: [],
    enabled: false,
  },
];

describe('ConnectedToolsDrawer', () => {
  it('renders inline by default with summary counts, health badges, scopes, switches, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const onToggleServer = vi.fn<(serverId: string, enabled: boolean) => void>();
    const onServersChange = vi.fn<(servers: ConnectedToolServer[]) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ConnectedToolsDrawer: {
              className: 'theme-tools-drawer',
              style: { maxWidth: '480px' },
            },
          },
        }}
      >
        <ConnectedToolsDrawer
          ref={ref}
          defaultServers={SAMPLE_SERVERS}
          onToggleServer={onToggleServer}
          onServersChange={onServersChange}
          title="Workspace MCP Directory"
          className="custom-tools-drawer"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="tools-inline"
        />
      </PrismThemeProvider>
    );

    const region = screen.getByTestId('tools-inline');
    expect(ref.current).toBe(region);
    expect(screen.getByRole('region', { name: 'Workspace MCP Directory' })).toBe(region);
    expect(region).toHaveClass(
      'refractor-connected-tools-drawer',
      'prism-slab',
      'theme-tools-drawer',
      'custom-tools-drawer'
    );
    expect(region).toHaveStyle({ maxWidth: '480px' });
    expect(region).toHaveAttribute('data-mode', 'inline');
    expect(region).toHaveAttribute('data-open', 'true');
    expect(region).not.toHaveAttribute('data-empty');
    expect(screen.queryByRole('button', { name: 'Close connected tools drawer' })).not.toBeInTheDocument();

    expect(screen.getByTestId('connected-tools-summary')).toHaveTextContent('2 active · 20 tools');

    // Verify semantic health badges and --prism-* token styling
    const connectedBadge = screen.getByTestId('server-health-github-mcp');
    expect(connectedBadge).toHaveTextContent('Connected');
    expect(connectedBadge).toHaveAttribute('data-health-status', 'connected');
    expect(connectedBadge.style.color).toContain('--prism-emerald-text');

    const degradedBadge = screen.getByTestId('server-health-postgres-mcp');
    expect(degradedBadge).toHaveTextContent('Degraded');
    expect(degradedBadge).toHaveAttribute('data-health-status', 'degraded');
    expect(degradedBadge.style.color).toContain('--prism-amber-text');

    const disconnectedBadge = screen.getByTestId('server-health-local-shell');
    expect(disconnectedBadge).toHaveTextContent('Disconnected');
    expect(disconnectedBadge).toHaveAttribute('data-health-status', 'disconnected');
    expect(disconnectedBadge.style.color).toContain('--prism-rose-text');

    // Verify description, tool counts, and scopes
    expect(screen.getByText('Pull requests, issues, and repository code search.')).toBeInTheDocument();
    expect(screen.getByTestId('server-tool-count-github-mcp')).toHaveTextContent('12 tools');
    expect(screen.getByTestId('server-tool-count-postgres-mcp')).toHaveTextContent('5 tools');
    expect(screen.getByTestId('server-tool-count-local-shell')).toHaveTextContent('3 tools');

    const githubScopes = screen.getByLabelText('Permission scopes for GitHub MCP');
    expect(within(githubScopes).getByText('read')).toBeInTheDocument();
    expect(within(githubScopes).getByText('write')).toBeInTheDocument();
    expect(within(githubScopes).getByText('network')).toBeInTheDocument();

    const postgresScopes = screen.getByLabelText('Permission scopes for Postgres Explorer');
    expect(within(postgresScopes).getByText('execute')).toBeInTheDocument();
    expect(screen.queryByLabelText('Permission scopes for Workspace Runner')).not.toBeInTheDocument();

    // Toggle GitHub MCP switch off (uncontrolled update)
    const githubSwitch = screen.getByRole('switch', { name: 'Toggle GitHub MCP' });
    expect(githubSwitch).toHaveAttribute('aria-checked', 'true');
    expect(githubSwitch).toHaveClass('prism-emerald');

    fireEvent.click(githubSwitch);

    expect(githubSwitch).toHaveAttribute('aria-checked', 'false');
    expect(githubSwitch).toHaveClass('prism-crystal');
    expect(screen.getByTestId('connected-tools-summary')).toHaveTextContent('1 active · 20 tools');
    expect(onToggleServer).toHaveBeenNthCalledWith(1, 'github-mcp', false);
    expect(onServersChange).toHaveBeenCalledTimes(1);
    const updatedAfterFirst = onServersChange.mock.calls[0]?.[0];
    expect(updatedAfterFirst?.[0]?.enabled).toBe(false);
    expect(updatedAfterFirst?.[1]?.enabled).toBe(true);

    // Toggle Workspace Runner switch on
    const shellSwitch = screen.getByRole('switch', { name: 'Toggle Workspace Runner' });
    expect(shellSwitch).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(shellSwitch);

    expect(shellSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('connected-tools-summary')).toHaveTextContent('2 active · 20 tools');
    expect(onToggleServer).toHaveBeenNthCalledWith(2, 'local-shell', true);
  });

  it('supports drawer mode dismissal via close button, Escape key, and backdrop click without closing on inner clicks', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onBackdropClick = vi.fn();

    const { rerender } = render(
      <ConnectedToolsDrawer
        mode="drawer"
        open
        onOpenChange={onOpenChange}
        onClick={onBackdropClick}
        defaultServers={SAMPLE_SERVERS}
        data-testid="tools-drawer"
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Connected MCP & Tools' });
    expect(dialog).toBe(screen.getByTestId('tools-drawer'));
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('data-mode', 'drawer');
    expect(dialog).toHaveAttribute('data-open', 'true');

    // Inner panel click stops propagation and does not close drawer
    fireEvent.click(screen.getByText('GitHub MCP'));
    expect(onOpenChange).not.toHaveBeenCalled();

    // Non-Escape key and IME composing Escape do not close drawer
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(onOpenChange).not.toHaveBeenCalled();

    // Explicit close button closes drawer
    fireEvent.click(screen.getByRole('button', { name: 'Close connected tools drawer' }));
    expect(onOpenChange).toHaveBeenNthCalledWith(1, false);

    // Escape key closes drawer
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false);

    // Backdrop click fires consumer onClick and closes drawer
    fireEvent.click(dialog);
    expect(onBackdropClick).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenNthCalledWith(3, false);

    // Uncontrolled drawer mode hides itself on Escape
    rerender(<ConnectedToolsDrawer mode="drawer" defaultOpen defaultServers={SAMPLE_SERVERS} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns null when closed in drawer mode and ignores Escape key (negative test)', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const { container } = render(
      <ConnectedToolsDrawer
        mode="drawer"
        open={false}
        onOpenChange={onOpenChange}
        defaultServers={SAMPLE_SERVERS}
      />
    );

    expect(container.firstChild).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('renders clean empty state when no servers are configured', () => {
    render(<ConnectedToolsDrawer data-testid="tools-empty-root" />);

    const root = screen.getByTestId('tools-empty-root');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('connected-tools-summary')).toHaveTextContent('0 active · 0 tools');
    expect(screen.getByTestId('connected-tools-empty')).toHaveTextContent(
      'No connected tool servers'
    );
  });

  it('supports controlled servers state and renders inline even when open is false', () => {
    function ControlledHarness() {
      const [servers, setServers] = useState<ConnectedToolServer[]>([
        {
          id: 'docs-mcp',
          name: 'Docs Search',
          health: 'connected',
          toolCount: 4,
          scopes: ['read'],
          enabled: false,
        },
      ]);

      return (
        <ConnectedToolsDrawer
          mode="inline"
          open={false}
          servers={servers}
          onServersChange={setServers}
        />
      );
    }

    render(<ControlledHarness />);
    expect(screen.getByRole('region', { name: 'Connected MCP & Tools' })).toBeInTheDocument();
    expect(screen.getByTestId('connected-tools-summary')).toHaveTextContent('0 active · 4 tools');

    const toggle = screen.getByRole('switch', { name: 'Toggle Docs Search' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('connected-tools-summary')).toHaveTextContent('1 active · 4 tools');
  });

  it('clamps negative, NaN, Infinity, and fractional toolCount values safely to non-negative integers (negative test)', () => {
    const brokenServers: ConnectedToolServer[] = [
      {
        id: 'neg-tools',
        name: 'Negative Server',
        health: 'degraded',
        toolCount: -15,
        scopes: ['read'],
        enabled: true,
      },
      {
        id: 'nan-tools',
        name: 'NaN Server',
        health: 'disconnected',
        toolCount: Number.NaN,
        scopes: ['write'],
        enabled: false,
      },
      {
        id: 'inf-tools',
        name: 'Infinity Server',
        health: 'connected',
        toolCount: Number.POSITIVE_INFINITY,
        scopes: ['execute'],
        enabled: true,
      },
      {
        id: 'frac-tools',
        name: 'Fractional Server',
        health: 'connected',
        toolCount: 4.9,
        scopes: ['network'],
        enabled: true,
      },
    ];

    render(<ConnectedToolsDrawer defaultServers={brokenServers} />);

    expect(screen.getByTestId('server-tool-count-neg-tools')).toHaveTextContent('0 tools');
    expect(screen.getByTestId('server-tool-count-nan-tools')).toHaveTextContent('0 tools');
    expect(screen.getByTestId('server-tool-count-inf-tools')).toHaveTextContent('0 tools');
    expect(screen.getByTestId('server-tool-count-frac-tools')).toHaveTextContent('4 tools');
    expect(screen.getByTestId('connected-tools-summary')).toHaveTextContent('3 active · 4 tools');
  });

  it('renders XSS payloads literally and safely handles prototype-polluting server IDs (adversarial)', () => {
    const payload = '<script>window.__mcpXss=1</script><img src=x onerror=alert(1)>';
    const onToggleServer = vi.fn<(serverId: string, enabled: boolean) => void>();
    const adversarialServers: ConnectedToolServer[] = [
      {
        id: '__proto__',
        name: payload,
        description: payload,
        health: 'connected',
        toolCount: 2,
        scopes: ['read'],
        enabled: true,
      },
      {
        id: 'constructor',
        name: 'Constructor Server',
        health: 'degraded',
        toolCount: 1,
        scopes: ['write'],
        enabled: false,
      },
    ];

    render(
      <ConnectedToolsDrawer
        title={payload}
        defaultServers={adversarialServers}
        onToggleServer={onToggleServer}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: payload })).toHaveTextContent(payload);
    expect(screen.getAllByText(payload)).toHaveLength(3);

    fireEvent.click(screen.getByRole('switch', { name: `Toggle ${payload}` }));
    expect(onToggleServer).toHaveBeenCalledWith('__proto__', false);
    expect(({} as Record<string, string>)['__proto__']).not.toBe(payload);
  });
});
