import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  TerminalEmulator,
  parseAnsiLine,
  type TerminalAnsiToken,
  type TerminalLine,
} from './index';

describe('parseAnsiLine', () => {
  it('returns empty array for empty input and plain token for plain text', () => {
    expect(parseAnsiLine('')).toEqual([]);
    expect(parseAnsiLine('hello optical shell')).toEqual([
      { text: 'hello optical shell', tone: 'default' },
    ]);
  });

  it('parses all supported SGR color codes, bold, unbold, default fg, and reset sequences', () => {
    const input = [
      '\u001b[1;31merr\u001b[0m ',
      '\u001b[91mrose2\u001b[32mok\u001b[92mok2',
      '\u001b[33mwarn\u001b[93mwarn2',
      '\u001b[34mb\u001b[36mc\u001b[94mbb\u001b[96mcc',
      '\u001b[35mp\u001b[95mp2',
      '\u001b[90mmuted',
      '\u001b[1;39mbold-def\u001b[22mplain\u001b[mreset',
    ].join('');

    const tokens: TerminalAnsiToken[] = parseAnsiLine(input);
    expect(tokens).toEqual([
      { text: 'err', tone: 'rose', bold: true },
      { text: ' ', tone: 'default' },
      { text: 'rose2', tone: 'rose' },
      { text: 'okok2', tone: 'emerald' },
      { text: 'warnwarn2', tone: 'amber' },
      { text: 'bcbbcc', tone: 'secondary' },
      { text: 'pp2', tone: 'primary' },
      { text: 'muted', tone: 'muted' },
      { text: 'bold-def', tone: 'default', bold: true },
      { text: 'plainreset', tone: 'default' },
    ]);
  });

  it('strips unknown CSI, OSC, extended 256/truecolor, non-numeric, empty-param, and malformed escape codes safely', () => {
    const input = [
      '\u001b[2J\u001b[?25h',
      '\u001b]0;Window Title\u0007',
      '\u001b]1;ST Title\u001b\\',
      '\u001b[38;5;196m256color',
      '\u001b[48;2;255;0;0mtruecolor',
      '\u001b[;32mgreen',
      '\u001b[?31;999mstill-green',
      '\u001b[\nnewline',
      '\u001bX',
      '\u001b[31',
    ].join('');

    const tokens = parseAnsiLine(input);
    expect(tokens).toEqual([
      { text: '256colortruecolor', tone: 'default' },
      { text: 'greenstill-green\nnewlineX', tone: 'emerald' },
    ]);

    // Unterminated OSC sequence at end of line and BEL-only OSC without ST
    expect(parseAnsiLine('prefix\u001b]0;unterminated')).toEqual([
      { text: 'prefix', tone: 'default' },
    ]);
    expect(parseAnsiLine('\u001b]0;only-bel\u0007ok\u001b[38m')).toEqual([
      { text: 'ok', tone: 'default' },
    ]);
  });

  it('handles adversarial large pathological escape inputs in linear time', () => {
    const payload = `${'\u001b[32'.repeat(5000)}\u001b[0msafe-tail`;
    const tokens = parseAnsiLine(payload);
    expect(tokens).toEqual([{ text: 'safe-tail', tone: 'default' }]);
  });
});

describe('TerminalEmulator', () => {
  it('renders prism-slab window with theme overrides, ref, ANSI spans mapped to --prism-* tokens, timestamps, and line kinds', () => {
    const ref = createRef<HTMLDivElement>();
    const initialLines: TerminalLine[] = [
      { id: 'l1', text: '\u001b[1;32mReady\u001b[0m \u001b[35mprism\u001b[0m', kind: 'stdout', timestamp: '09:41:02' },
      { id: 'l2', text: 'Fatal optical drift', kind: 'stderr' },
      { id: 'l3', text: 'System booted', kind: 'system' },
      { id: 'l4', text: '\u001b[33mwarn\u001b[36minfo\u001b[90mdim\u001b[31mfail', kind: 'stdout' },
      { id: 'l5', text: '', kind: 'stdout' },
    ];

    render(
      <PrismThemeProvider
        theme={{
          components: {
            TerminalEmulator: { className: 'theme-term', style: { maxWidth: '640px' } },
          },
        }}
      >
        <TerminalEmulator
          ref={ref}
          title="Prism Kernel Shell"
          defaultLines={initialLines}
          className="local-term"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="term-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('term-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-terminal-emulator', 'prism-slab', 'theme-term', 'local-term');
    expect(root).toHaveStyle({ maxWidth: '640px' });
    expect(screen.getByText('Prism Kernel Shell')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-line-count')).toHaveTextContent('5 lines');
    expect(screen.getByTestId('terminal-line-timestamp')).toHaveTextContent('[09:41:02]');

    const readySpan = screen.getByText('Ready');
    expect(readySpan).toHaveAttribute('data-ansi-tone', 'emerald');
    expect(readySpan).toHaveAttribute('data-ansi-bold', 'true');
    expect(readySpan.style.color).toBe('var(--prism-success-main)');

    const prismSpan = screen.getByText('prism');
    expect(prismSpan.style.color).toBe('var(--prism-primary-main)');

    const stderrSpan = screen.getByText('Fatal optical drift');
    expect(stderrSpan.style.color).toBe('var(--prism-error-main)');

    const sysSpan = screen.getByText('System booted');
    expect(sysSpan.style.color).toBe('var(--prism-text-secondary)');

    expect(screen.getByText('warn').style.color).toBe('var(--prism-warning-main)');
    expect(screen.getByText('info').style.color).toBe('var(--prism-secondary-main)');
    expect(screen.getByText('dim').style.color).toBe('var(--prism-text-secondary)');
    expect(screen.getByText('fail').style.color).toBe('var(--prism-error-main)');
  });

  it('executes built-in help, default echo, built-in clear, Clear button, and Ctrl+L shortcut', () => {
    const onLinesChange = vi.fn<(lines: TerminalLine[]) => void>();
    render(<TerminalEmulator onLinesChange={onLinesChange} />);

    expect(screen.getByTestId('terminal-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-line-count')).toHaveTextContent('0 lines');

    const input = screen.getByRole('textbox', { name: 'Terminal command input' });
    expect(input).toHaveAttribute('placeholder', 'Enter command (try help or clear)...');

    // Blank submission ignored
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onLinesChange).not.toHaveBeenCalled();

    // IME composing Enter ignored
    fireEvent.change(input, { target: { value: 'help' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onLinesChange).not.toHaveBeenCalled();

    // Built-in help
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('refractor@prism:~$ help')).toBeInTheDocument();
    expect(screen.getByText('Built-in commands:')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-line-count')).toHaveTextContent('2 lines');

    // Default echo via Run button
    fireEvent.change(input, { target: { value: 'uname -a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run command' }));
    expect(screen.getByText('Executed: uname -a')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-line-count')).toHaveTextContent('4 lines');

    // Built-in clear command clears output
    fireEvent.change(input, { target: { value: 'clear' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('terminal-line-count')).toHaveTextContent('0 lines');
    expect(screen.getByTestId('terminal-empty-state')).toBeInTheDocument();

    // Add one line then clear via Ctrl+L
    fireEvent.change(input, { target: { value: 'ping' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Executed: ping')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'l', ctrlKey: true });
    expect(screen.getByTestId('terminal-line-count')).toHaveTextContent('0 lines');

    // Add line then clear via header Clear button
    fireEvent.change(input, { target: { value: 'whoami' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Executed: whoami')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear terminal' }));
    expect(screen.getByTestId('terminal-line-count')).toHaveTextContent('0 lines');
  });

  it('cycles command history with ArrowUp and ArrowDown and restores live draft', () => {
    render(<TerminalEmulator />);
    const input = screen.getByRole('textbox', { name: 'Terminal command input' });

    // ArrowUp / ArrowDown with empty history is a no-op
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value: 'first' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'second' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Start typing a draft, then browse history
    fireEvent.change(input, { target: { value: 'draft-cmd' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveValue('second');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveValue('first');

    // Clamped at earliest entry
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveValue('first');

    // Navigate back down
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue('second');

    // Restore saved draft
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue('draft-cmd');

    // Unhandled key falls through cleanly
    fireEvent.keyDown(input, { key: 'x' });
    expect(input).toHaveValue('draft-cmd');
  });

  it('supports custom onExecute returning string (multi-line), TerminalLine[], void, and custom clear override', () => {
    const onExecute = vi.fn<(cmd: string) => string | TerminalLine[] | void>((cmd) => {
      if (cmd === 'multi') return 'alpha\nbeta';
      if (cmd === 'structured') {
        return [
          { id: 'custom-1', text: 'Structured error', kind: 'stderr' },
          { id: '', text: 'Auto-id fallback', kind: 'system' },
        ];
      }
      if (cmd === 'clear') return 'Clear intercepted';
      if (cmd === 'empty-str') return '';
      return undefined;
    });

    render(<TerminalEmulator prompt="dev>" onExecute={onExecute} />);
    const input = screen.getByRole('textbox', { name: 'Terminal command input' });

    fireEvent.change(input, { target: { value: 'multi' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('dev> multi')).toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'structured' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Structured error')).toBeInTheDocument();
    expect(screen.getByText('Auto-id fallback')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'clear' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Clear intercepted')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'empty-str' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('dev> empty-str')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'silent' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('dev> silent')).toBeInTheDocument();
    expect(onExecute).toHaveBeenCalledWith('silent');
  });

  it('bounds scrollback to clamped maxLines (min 10) and supports controlled lines mode', () => {
    function ControlledTerminalHarness() {
      const [lines, setLines] = useState<TerminalLine[]>(
        Array.from({ length: 12 }, (_, idx) => ({
          id: `seed-${idx + 1}`,
          text: `Seed line ${idx + 1}`,
        }))
      );
      return (
        <TerminalEmulator
          lines={lines}
          onLinesChange={setLines}
          maxLines={3}
          onExecute={(cmd) => `Out: ${cmd}`}
        />
      );
    }

    render(<ControlledTerminalHarness />);
    // Clamped to minimum 10 lines
    expect(screen.getByTestId('terminal-line-count')).toHaveTextContent('10 lines');
    expect(screen.queryByText('Seed line 1')).not.toBeInTheDocument();
    expect(screen.getByText('Seed line 12')).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: 'Terminal command input' });
    fireEvent.change(input, { target: { value: 'next' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('terminal-line-count')).toHaveTextContent('10 lines');
    expect(screen.getByText('Out: next')).toBeInTheDocument();
  });

  it('hides interactive prompt and Clear button in readOnly mode and displays singular line count (negative test)', () => {
    render(
      <TerminalEmulator
        readOnly
        defaultLines={[{ id: 'only', text: 'Single audit entry' }]}
        data-testid="readonly-term"
      />
    );

    expect(screen.getByTestId('readonly-term')).toHaveAttribute('data-read-only', 'true');
    expect(screen.getByTestId('terminal-line-count')).toHaveTextContent('1 line');
    expect(screen.queryByRole('button', { name: 'Clear terminal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Terminal command input' })).not.toBeInTheDocument();
  });

  it('renders readOnly empty state safely and neutralizes adversarial XSS payloads as literal text', () => {
    const xssPayload = '<script>window.__termXss=1</script><img src=x onerror=alert(1)>';
    const { unmount } = render(<TerminalEmulator readOnly />);
    expect(screen.getByTestId('terminal-empty-state')).toHaveTextContent('No output.');
    unmount();

    render(
      <TerminalEmulator
        defaultLines={[
          { id: 'xss-1', text: `\u001b[31m${xssPayload}\u001b[0m`, kind: 'stdout' },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(xssPayload)).toBeInTheDocument();
  });
});
