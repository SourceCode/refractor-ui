import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CommandInputBar } from './index';

describe('CommandInputBar', () => {
  it('renders compact prism-slab bar with theme overrides, ref, prompt glyph, and submits via Run button', () => {
    const ref = createRef<HTMLDivElement>();
    const onSubmit = vi.fn<(command: string) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CommandInputBar: { className: 'theme-cmd', style: { maxWidth: '520px' } },
          },
        }}
      >
        <CommandInputBar
          ref={ref}
          prompt="prism>"
          submitLabel="Execute"
          placeholder="Enter CLI verb..."
          onSubmit={onSubmit}
          className="local-cmd"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="cmd-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('cmd-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-command-input-bar', 'prism-slab', 'theme-cmd', 'local-cmd');
    expect(root).toHaveStyle({ maxWidth: '520px' });
    expect(screen.getByTestId('command-prompt')).toHaveTextContent('prism>');

    const input = screen.getByRole('textbox', { name: 'Command input' });
    const runBtn = screen.getByRole('button', { name: 'Execute' });
    expect(input).toHaveAttribute('placeholder', 'Enter CLI verb...');
    expect(runBtn).toBeDisabled();

    // Whitespace-only keeps Run disabled
    fireEvent.change(input, { target: { value: '    ' } });
    expect(runBtn).toBeDisabled();

    // Non-blank enables Run and submits trimmed value, clearing uncontrolled input
    fireEvent.change(input, { target: { value: '  deploy --prod  ' } });
    expect(runBtn).toBeEnabled();
    expect(root).toHaveAttribute('data-has-value', 'true');

    fireEvent.click(runBtn);
    expect(onSubmit).toHaveBeenCalledWith('deploy --prod');
    expect(input).toHaveValue('');
    expect(runBtn).toBeDisabled();
  });

  it('shows case-insensitive prefix ghost autocomplete and accepts via Tab or end-of-line ArrowRight only', () => {
    render(
      <CommandInputBar
        suggestions={['deploy', 'deploy --prod', 'dev --watch']}
        data-testid="cmd-ghost"
      />
    );

    const input = screen.getByRole('textbox', { name: 'Command input' }) as HTMLInputElement;
    const root = screen.getByTestId('cmd-ghost');

    // Empty input has no ghost suggestion
    expect(screen.queryByTestId('command-ghost-text')).not.toBeInTheDocument();

    // Exact-length match ('deploy') is skipped because suggestion length must be > current input
    fireEvent.change(input, { target: { value: 'DEPLOY' } });
    expect(screen.getByTestId('command-ghost-text')).toHaveTextContent(' --prod', {
      normalizeWhitespace: false,
    });
    expect(root).toHaveAttribute('data-has-suggestion', 'true');

    // Shift+Tab must NOT accept suggestion
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    expect(input).toHaveValue('DEPLOY');

    // ArrowRight when caret is NOT at end must NOT accept suggestion
    input.setSelectionRange(2, 2);
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    expect(input).toHaveValue('DEPLOY');

    // ArrowRight when caret IS at end accepts suggestion
    input.setSelectionRange(6, 6);
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    expect(input).toHaveValue('deploy --prod');
    expect(screen.queryByTestId('command-ghost-text')).not.toBeInTheDocument();

    // Tab accepts suggestion
    fireEvent.change(input, { target: { value: 'deV' } });
    expect(screen.getByTestId('command-ghost-text')).toHaveTextContent(' --watch', {
      normalizeWhitespace: false,
    });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input).toHaveValue('dev --watch');

    // Non-matching prefix yields no ghost suggestion and Tab is untouched
    fireEvent.change(input, { target: { value: 'unknown-cmd' } });
    expect(screen.queryByTestId('command-ghost-text')).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input).toHaveValue('unknown-cmd');
  });

  it('cycles combined external and internal history via ArrowUp/ArrowDown and clears on Escape', () => {
    const onSubmit = vi.fn<(command: string) => void>();

    render(
      <CommandInputBar
        history={['git status', '   ', 'pnpm lint:strict']}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByRole('textbox', { name: 'Command input' });

    // Submit a new command to add to internal history
    fireEvent.change(input, { target: { value: 'pnpm test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('pnpm test');
    expect(input).toHaveValue('');

    // Type draft then cycle upward through combined history
    fireEvent.change(input, { target: { value: 'partial' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveValue('pnpm test');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveValue('pnpm lint:strict');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveValue('git status');

    // Clamped at earliest entry
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveValue('git status');

    // Cycle back downward and restore draft
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue('pnpm lint:strict');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue('pnpm test');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue('partial');

    // ArrowDown when not browsing history is a no-op
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue('partial');

    // Escape clears input
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');
  });

  it('handles IME composition guard, blank Enter, empty history arrows, and controlled value mode', () => {
    const onSubmit = vi.fn<(command: string) => void>();

    function ControlledCommandHarness() {
      const [val, setVal] = useState('initial');
      return (
        <CommandInputBar
          value={val}
          onChange={setVal}
          onSubmit={onSubmit}
        />
      );
    }

    render(<ControlledCommandHarness />);
    const input = screen.getByRole('textbox', { name: 'Command input' });

    // ArrowUp with empty history does nothing
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveValue('initial');

    // IME composing Enter is ignored
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();

    // Normal Enter submits but does NOT auto-clear controlled value
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('initial');
    expect(input).toHaveValue('initial');

    // Escape clears via onChange in controlled mode
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');

    // Blank Enter does not submit; non-special keys fall through cleanly
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'x' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('blocks all interactions and hides ghost suggestions when disabled (negative test)', () => {
    const onSubmit = vi.fn<(command: string) => void>();
    const onChange = vi.fn<(val: string) => void>();

    render(
      <CommandInputBar
        disabled
        defaultValue="dep"
        suggestions={['deploy --prod']}
        history={['git status']}
        onChange={onChange}
        onSubmit={onSubmit}
        data-testid="cmd-disabled"
      />
    );

    const root = screen.getByTestId('cmd-disabled');
    expect(root).toHaveAttribute('data-disabled', 'true');
    const input = screen.getByRole('textbox', { name: 'Command input' });
    const runBtn = screen.getByRole('button', { name: 'Run' });

    expect(input).toBeDisabled();
    expect(runBtn).toBeDisabled();
    expect(screen.queryByTestId('command-ghost-text')).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Tab' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(runBtn);

    expect(onChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS strings in prompt and ghost suggestions safely as literal text', () => {
    const payload = '<script>window.__cmdXss=1</script><img src=x onerror=alert(1)>';
    render(
      <CommandInputBar
        prompt={payload}
        defaultValue="<script>"
        suggestions={[payload]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('command-prompt')).toHaveTextContent(payload);
    expect(screen.getByTestId('command-ghost-text')).toHaveTextContent(
      payload.slice('<script>'.length)
    );
  });
});
