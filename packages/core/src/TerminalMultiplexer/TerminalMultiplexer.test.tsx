import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  TerminalMultiplexer,
  type MultiplexerLayout,
  type TerminalSessionPane,
} from './index';

const INITIAL_PANES: TerminalSessionPane[] = [
  {
    id: 'dev',
    title: 'Dev Server',
    cwd: '~/workspace/app',
    status: 'running',
    lines: ['$ pnpm dev', 'Vite ready in 180ms'],
  },
  {
    id: 'tests',
    title: 'Test Runner',
    cwd: '~/workspace/core',
    status: 'idle',
    lines: ['Watching test files...'],
  },
  {
    id: 'build',
    title: 'Build Watch',
    status: 'error',
    lines: ['Build failed with exit code 1'],
  },
];

describe('TerminalMultiplexer', () => {
  it('renders tabs layout by default with status dots, ref, theme overrides, cwd, and tab switching', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            TerminalMultiplexer: {
              className: 'theme-mux',
              style: { minHeight: 320 },
            },
          },
        }}
      >
        <TerminalMultiplexer
          ref={ref}
          defaultPanes={INITIAL_PANES}
          className="local-mux"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="terminal-mux"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('terminal-mux');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-terminal-multiplexer', 'prism-slab', 'theme-mux', 'local-mux');
    expect(root).toHaveAttribute('data-layout', 'tabs');
    expect(root).toHaveAttribute('data-pane-count', '3');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).toHaveStyle({ minHeight: '320px' });

    // Tablist renders all 3 session tabs with semantic status dots
    const tablist = screen.getByRole('tablist', { name: 'Terminal sessions' });
    const devTab = within(tablist).getByRole('tab', { name: 'Dev Server' });
    const testTab = within(tablist).getByRole('tab', { name: 'Test Runner' });
    const buildTab = within(tablist).getByRole('tab', { name: 'Build Watch' });

    expect(devTab).toHaveAttribute('aria-selected', 'true');
    expect(testTab).toHaveAttribute('aria-selected', 'false');
    expect(devTab.querySelector('[data-tab-status="running"]')).not.toBeNull();
    expect(testTab.querySelector('[data-tab-status="idle"]')).not.toBeNull();
    expect(buildTab.querySelector('[data-tab-status="error"]')).not.toBeNull();

    // Only active pane is visible in tabs layout
    expect(screen.getByText('Vite ready in 180ms')).toBeInTheDocument();
    expect(screen.getByText('~/workspace/app')).toBeInTheDocument();
    expect(screen.queryByText('Watching test files...')).not.toBeInTheDocument();

    // Switch tab by click
    fireEvent.click(testTab);
    expect(testTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Watching test files...')).toBeInTheDocument();
    expect(screen.queryByText('Vite ready in 180ms')).not.toBeInTheDocument();

    // Switch tabs with keyboard ArrowRight / ArrowLeft (ignoring composing and non-arrow keys)
    fireEvent.keyDown(testTab, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(testTab, { key: 'Home' });
    expect(testTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(testTab, { key: 'ArrowRight' });
    expect(buildTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Build failed with exit code 1')).toBeInTheDocument();

    fireEvent.keyDown(buildTab, { key: 'ArrowLeft' });
    expect(testTab).toHaveAttribute('aria-selected', 'true');
  });

  it('toggles between Tabs and Split layouts and focuses panes on click with data-active="true"', () => {
    const onLayoutChange = vi.fn<(layout: MultiplexerLayout) => void>();
    const onActivePaneChange = vi.fn<(id: string) => void>();

    render(
      <TerminalMultiplexer
        defaultPanes={INITIAL_PANES}
        onLayoutChange={onLayoutChange}
        onActivePaneChange={onActivePaneChange}
        data-testid="split-mux"
      />
    );

    const tabsBtn = screen.getByRole('button', { name: 'Tabs' });
    const splitBtn = screen.getByRole('button', { name: 'Split' });
    expect(tabsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(splitBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(splitBtn);
    expect(onLayoutChange).toHaveBeenCalledWith('split');
    expect(splitBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('split-mux')).toHaveAttribute('data-layout', 'split');

    const splitGrid = screen.getByTestId('multiplexer-split-grid');
    expect(splitGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2');

    // All 3 panes are visible simultaneously
    const devPane = splitGrid.querySelector('[data-pane-id="dev"]') as HTMLElement;
    const testsPane = splitGrid.querySelector('[data-pane-id="tests"]') as HTMLElement;
    const buildPane = splitGrid.querySelector('[data-pane-id="build"]') as HTMLElement;
    expect(devPane).toHaveAttribute('data-active', 'true');
    expect(testsPane).toHaveAttribute('data-active', 'false');
    expect(buildPane).toHaveAttribute('data-active', 'false');

    // Clicking another pane focuses it
    fireEvent.click(buildPane);
    expect(onActivePaneChange).toHaveBeenCalledWith('build');
    expect(buildPane).toHaveAttribute('data-active', 'true');
    expect(devPane).toHaveAttribute('data-active', 'false');

    // Focusing an input inside a pane also activates that pane
    const testInput = screen.getByLabelText('Command input for Test Runner');
    fireEvent.focus(testInput);
    expect(testsPane).toHaveAttribute('data-active', 'true');

    // Toggle back to Tabs layout
    fireEvent.click(tabsBtn);
    expect(onLayoutChange).toHaveBeenLastCalledWith('tabs');
    expect(screen.queryByTestId('multiplexer-split-grid')).not.toBeInTheDocument();
  });

  it('submits non-blank commands on Enter and Run button, appends $ cmd and onCommand output, and ignores blank or IME-composing Enter', () => {
    const onCommand = vi.fn<(paneId: string, cmd: string) => string | void>((_paneId, cmd) => {
      if (cmd === 'pwd') return '/home/refractor';
      return undefined;
    });

    render(
      <TerminalMultiplexer
        defaultPanes={[
          { id: 'sh-1', title: 'Main Shell', cwd: '~', lines: [] },
        ]}
        onCommand={onCommand}
      />
    );

    expect(screen.getByText('No output yet.')).toBeInTheDocument();

    const input = screen.getByLabelText('Command input for Main Shell');
    const runBtn = screen.getByRole('button', { name: 'Run command in Main Shell' });
    expect(runBtn).toBeDisabled();

    // Blank / whitespace Enter does nothing
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommand).not.toHaveBeenCalled();

    // Non-Enter key does nothing
    fireEvent.change(input, { target: { value: 'pwd' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCommand).not.toHaveBeenCalled();

    // IME composing Enter does nothing
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onCommand).not.toHaveBeenCalled();

    // Normal Enter submits command and appends response string
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommand).toHaveBeenCalledWith('sh-1', 'pwd');
    expect(input).toHaveValue('');
    expect(screen.getByText('$ pwd')).toBeInTheDocument();
    expect(screen.getByText('/home/refractor')).toBeInTheDocument();

    // Run button submits command when onCommand returns void
    fireEvent.change(input, { target: { value: 'clear-cache' } });
    expect(runBtn).not.toBeDisabled();
    fireEvent.click(runBtn);
    expect(onCommand).toHaveBeenCalledWith('sh-1', 'clear-cache');
    expect(screen.getByText('$ clear-cache')).toBeInTheDocument();
  });

  it('adds sessions up to clamped maxPanes, avoids ID collisions, closes tabs cleanly, and shows empty state with New Session CTA', () => {
    const onPanesChange = vi.fn<(panes: TerminalSessionPane[]) => void>();

    render(
      <TerminalMultiplexer
        defaultPanes={[
          { id: 'session-1', title: 'Session 1', lines: ['first'] },
          { id: 'session-2', title: 'Session 2', lines: ['second'] },
        ]}
        maxPanes={3}
        onPanesChange={onPanesChange}
        data-testid="cap-mux"
      />
    );

    const addBtn = screen.getByRole('button', { name: 'New session' });
    expect(addBtn).not.toBeDisabled();

    // Adding a 3rd session hits maxPanes=3 and disables the button
    fireEvent.click(addBtn);
    expect(addBtn).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Session 3' })).toHaveAttribute('aria-selected', 'true');

    // Type a draft into Session 3 so closing it exercises draft cleanup
    const s3Input = screen.getByLabelText('Command input for Session 3');
    fireEvent.change(s3Input, { target: { value: 'draft-cmd' } });

    // Close active Session 3 -> falls back to Session 2 and re-enables + button
    fireEvent.click(screen.getByRole('button', { name: 'Close Session 3' }));
    expect(addBtn).not.toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Session 2' })).toHaveAttribute('aria-selected', 'true');

    // Close inactive Session 1 -> keeps Session 2 active
    fireEvent.click(screen.getByRole('button', { name: 'Close Session 1' }));
    expect(screen.getByRole('tab', { name: 'Session 2' })).toHaveAttribute('aria-selected', 'true');

    // Close final Session 2 -> renders empty state with New Session CTA
    fireEvent.click(screen.getByRole('button', { name: 'Close Session 2' }));
    expect(screen.getByTestId('multiplexer-empty-state')).toHaveTextContent(
      'No active terminal sessions'
    );
    expect(screen.getByTestId('cap-mux')).toHaveAttribute('data-empty', 'true');

    // Clicking empty-state New Session CTA creates a fresh session
    fireEvent.click(screen.getByRole('button', { name: 'New Session' }));
    expect(screen.queryByTestId('multiplexer-empty-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('cap-mux')).toHaveAttribute('data-pane-count', '1');
  });

  it('supports controlled panes, activePaneId, layout, default props, and clamps invalid maxPanes (negative test)', () => {
    function ControlledMux() {
      const [panes, setPanes] = useState<TerminalSessionPane[]>([
        { id: 'c1', title: 'Controlled 1', lines: ['ready'] },
      ]);
      const [activeId, setActiveId] = useState<string>('stale-missing-id');
      const [layout, setLayout] = useState<MultiplexerLayout>('tabs');

      return (
        <TerminalMultiplexer
          panes={panes}
          onPanesChange={setPanes}
          activePaneId={activeId}
          onActivePaneChange={setActiveId}
          layout={layout}
          onLayoutChange={setLayout}
          maxPanes={0}
        />
      );
    }

    const { unmount } = render(<ControlledMux />);
    // Stale activePaneId gracefully falls back to first pane
    expect(screen.getByRole('tab', { name: 'Controlled 1' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    // maxPanes=0 clamps to 1, so New session button is disabled when 1 pane is open
    expect(screen.getByRole('button', { name: 'New session' })).toBeDisabled();
    unmount();

    // Default uncontrolled render with no props renders default Session 1
    const { unmount: unmountDefault } = render(<TerminalMultiplexer maxPanes={Number.NaN} />);
    const defaultTab = screen.getByRole('tab', { name: 'Session 1' });
    expect(defaultTab).toBeInTheDocument();
    // Single-pane ArrowRight does not crash or switch
    fireEvent.keyDown(defaultTab, { key: 'ArrowRight' });
    expect(defaultTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'New session' })).not.toBeDisabled();
    unmountDefault();

    // Empty initial defaultPanes renders empty state immediately
    const { unmount: unmountEmpty } = render(<TerminalMultiplexer defaultPanes={[]} />);
    expect(screen.getByTestId('multiplexer-empty-state')).toBeInTheDocument();
    unmountEmpty();

    // Collision-avoiding session IDs when defaultPanes already occupies session-2
    render(
      <TerminalMultiplexer
        defaultPanes={[{ id: 'session-2', title: 'Custom 2', lines: [] }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'New session' }));
    expect(screen.getByRole('tab', { name: 'Session 3' })).toBeInTheDocument();

    // Clicking inside the command input container in split mode stops click propagation
    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    const s3Input = screen.getByLabelText('Command input for Session 3');
    fireEvent.click(s3Input);
    fireEvent.change(s3Input, { target: { value: 'whoami' } });
    fireEvent.keyDown(s3Input, { key: 'Enter' });
    expect(screen.getByText('$ whoami')).toBeInTheDocument();
  });

  it('renders XSS payloads literally and resists prototype-polluting pane IDs (adversarial)', () => {
    const xss = '<script>window.__muxXss=1</script><img src=x onerror=alert(1)>';
    const adversarialPanes: TerminalSessionPane[] = [
      {
        id: '__proto__',
        title: xss,
        cwd: xss,
        status: 'running',
        lines: [xss],
      },
      {
        id: 'constructor',
        title: 'Safe Pane',
        lines: ['ok'],
      },
    ];

    render(
      <TerminalMultiplexer
        defaultPanes={adversarialPanes}
        onCommand={(_id, cmd) => `echo:${cmd}`}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('tab', { name: xss })).toHaveTextContent(xss);
    expect(screen.getByLabelText(`Command input for ${xss}`)).toBeInTheDocument();

    const input = screen.getByLabelText(`Command input for ${xss}`);
    fireEvent.change(input, { target: { value: xss } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText(`$ ${xss}`)).toBeInTheDocument();
    expect(screen.getByText(`echo:${xss}`)).toBeInTheDocument();
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xss);
  });
});
