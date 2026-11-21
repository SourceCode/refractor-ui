import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CopyableCommandBlock, type CommandVariant } from './CopyableCommandBlock';

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function restoreClipboard() {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  }
}

const PACKAGE_VARIANTS: CommandVariant[] = [
  { id: 'pnpm', label: 'pnpm', command: 'pnpm add @refractor-ui/core --save-exact' },
  { id: 'npm', label: 'npm', command: 'npm install @refractor-ui/core --save-exact' },
  { id: 'yarn', label: 'yarn', command: 'yarn add @refractor-ui/core --exact' },
  { id: 'bun', label: 'bun', command: 'bun add @refractor-ui/core --exact' },
];

describe('CopyableCommandBlock', () => {
  afterEach(() => {
    vi.useRealTimers();
    restoreClipboard();
  });

  it('renders single command with prefix, forwards React 19 ref, composes theme overrides, and tokenizes shell syntax', () => {
    const ref = createRef<HTMLDivElement>();
    const cmd = 'git commit -m "feat: add \\"cli\\" suite" --no-verify && echo \'done\'';

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CopyableCommandBlock: {
              className: 'theme-cmd-slab',
              style: { letterSpacing: '0.15px' },
            },
          },
        }}
      >
        <CopyableCommandBlock
          ref={ref}
          title="Commit Changes"
          command={cmd}
          className="local-cmd-slab"
          xstyle={{ '--prism-slab-blur-px': '24px' }}
          style={{ marginTop: '6px' }}
          data-testid="cmd-block"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('cmd-block');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-copyable-command-block',
      'prism-slab',
      'theme-cmd-slab',
      'local-cmd-slab'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.15px', marginTop: '6px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('24px');
    expect(root).toHaveAttribute('aria-labelledby');

    expect(screen.getByText('Commit Changes')).toBeInTheDocument();
    expect(screen.getByTestId('copyable-command-prefix')).toHaveTextContent('$');

    const code = screen.getByTestId('copyable-command-code');
    expect(code.textContent).toBe(cmd);

    const executables = code.querySelectorAll('[data-token-kind="executable"]');
    expect(Array.from(executables).map((el) => el.textContent)).toEqual(['git', 'echo']);
    expect((executables[0] as HTMLElement).style.color).toBe('var(--prism-primary-main)');

    const flags = code.querySelectorAll('[data-token-kind="flag"]');
    expect(Array.from(flags).map((el) => el.textContent)).toEqual(['-m', '--no-verify']);
    expect((flags[0] as HTMLElement).style.color).toBe('var(--prism-secondary-main)');

    const strings = code.querySelectorAll('[data-token-kind="string"]');
    expect(Array.from(strings).map((el) => el.textContent)).toEqual([
      '"feat: add \\"cli\\" suite"',
      "'done'",
    ]);
    expect((strings[0] as HTMLElement).style.color).toContain('--prism-emerald-text');

    const args = code.querySelectorAll('[data-token-kind="arg"]');
    expect(Array.from(args).map((el) => el.textContent)).toEqual(['commit', '&&']);
    expect((args[0] as HTMLElement).style.color).toBe('var(--prism-text-primary)');
  });

  it('supports multiline commands, unclosed quotes, custom/omitted prefix, and empty fallback state', () => {
    const { rerender } = render(
      <CopyableCommandBlock
        command={'pnpm build\nnode dist/cli.js "unclosed'}
        prefix=">"
        aria-label="Multiline snippet"
      />
    );

    expect(screen.getByTestId('copyable-command-prefix')).toHaveTextContent('>');
    const code = screen.getByTestId('copyable-command-code');
    const executables = code.querySelectorAll('[data-token-kind="executable"]');
    expect(Array.from(executables).map((el) => el.textContent)).toEqual(['pnpm', 'node']);
    const strings = code.querySelectorAll('[data-token-kind="string"]');
    expect(strings[0]?.textContent).toBe('"unclosed');

    // Empty prefix omits prompt marker; empty command disables Copy button
    rerender(<CopyableCommandBlock variants={[]} prefix="" data-testid="empty-cmd" />);
    expect(screen.queryByTestId('copyable-command-prefix')).toBeNull();
    expect(screen.getByTestId('copyable-command-code')).toHaveTextContent('No command configured');
    expect(screen.getByTestId('empty-cmd')).toHaveAttribute('data-empty', 'true');
    const copyBtn = screen.getByRole('button', { name: 'Copy' });
    expect(copyBtn).toBeDisabled();
    expect(copyBtn).toHaveClass('disabled:cursor-not-allowed');
  });

  it('renders crystal tabs for variants, honors defaultVariantId, switches via click and keyboard, and fires onVariantChange', () => {
    const onVariantChange = vi.fn();
    render(
      <CopyableCommandBlock
        variants={PACKAGE_VARIANTS}
        defaultVariantId="npm"
        onVariantChange={onVariantChange}
      />
    );

    const tablist = screen.getByRole('tablist', { name: 'Command variants' });
    expect(tablist).toBeInTheDocument();

    const pnpmTab = screen.getByRole('tab', { name: 'pnpm' });
    const npmTab = screen.getByRole('tab', { name: 'npm' });
    const yarnTab = screen.getByRole('tab', { name: 'yarn' });
    const bunTab = screen.getByRole('tab', { name: 'bun' });

    expect(npmTab).toHaveAttribute('aria-selected', 'true');
    expect(pnpmTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('copyable-command-code').textContent).toBe(
      'npm install @refractor-ui/core --save-exact'
    );

    // Clicking already-active tab does not emit duplicate onVariantChange
    fireEvent.click(npmTab);
    expect(onVariantChange).not.toHaveBeenCalled();

    // Clicking another tab switches active command
    fireEvent.click(yarnTab);
    expect(onVariantChange).toHaveBeenCalledWith('yarn');
    expect(yarnTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('copyable-command-code').textContent).toBe(
      'yarn add @refractor-ui/core --exact'
    );

    // IME composing keydown is ignored
    fireEvent.keyDown(yarnTab, { key: 'ArrowRight', isComposing: true });
    expect(yarnTab).toHaveAttribute('aria-selected', 'true');

    // ArrowRight moves to bun, then wraps to pnpm
    fireEvent.keyDown(yarnTab, { key: 'ArrowRight' });
    expect(bunTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(bunTab);

    fireEvent.keyDown(bunTab, { key: 'ArrowRight' });
    expect(pnpmTab).toHaveAttribute('aria-selected', 'true');

    // ArrowLeft wraps back to bun
    fireEvent.keyDown(pnpmTab, { key: 'ArrowLeft' });
    expect(bunTab).toHaveAttribute('aria-selected', 'true');

    // Home jumps to first tab, End jumps to last tab
    fireEvent.keyDown(bunTab, { key: 'Home' });
    expect(pnpmTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(pnpmTab, { key: 'End' });
    expect(bunTab).toHaveAttribute('aria-selected', 'true');

    // Unrelated key does nothing
    fireEvent.keyDown(bunTab, { key: 'Tab' });
    expect(bunTab).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to first variant when defaultVariantId does not match or variants list changes, and handles single-variant keyboard no-op', () => {
    const { rerender } = render(
      <CopyableCommandBlock
        title="Install CLI"
        variants={[{ id: 'only', label: 'npx', command: 'npx @refractor-ui/cli help' }]}
        defaultVariantId="missing-id"
      />
    );

    const onlyTab = screen.getByRole('tab', { name: 'npx' });
    expect(onlyTab).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(onlyTab, { key: 'ArrowRight' });
    expect(onlyTab).toHaveAttribute('aria-selected', 'true');

    // Replace variants so previously selected id is no longer present -> falls back to new first variant
    rerender(
      <CopyableCommandBlock
        title="Install CLI"
        variants={[{ id: 'deno', label: 'deno', command: 'deno run npm:@refractor-ui/cli help' }]}
      />
    );
    expect(screen.getByRole('tab', { name: 'deno' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('copyable-command-code').textContent).toBe(
      'deno run npm:@refractor-ui/cli help'
    );
  });

  it('copies active command to clipboard, displays emerald Copied confirmation for 1600ms, resets on tab switch, and cleans up on unmount', () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const onCopy = vi.fn();
    const { unmount } = render(
      <CopyableCommandBlock variants={PACKAGE_VARIANTS} onCopy={onCopy} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalledWith('pnpm add @refractor-ui/core --save-exact');
    expect(onCopy).toHaveBeenCalledWith('pnpm add @refractor-ui/core --save-exact');
    const copiedBtn = screen.getByRole('button', { name: 'Copied' });
    expect(copiedBtn).toHaveClass('prism-emerald');
    expect(copiedBtn).toHaveAttribute('data-copied', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Command copied to clipboard.');

    // Still showing Copied after 1000ms
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    // Resets to Copy after full 1600ms
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();

    // Switching variant while Copied resets confirmation immediately
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'bun' }));
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();

    // Copy new variant and unmount before timeout elapses
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(onCopy).toHaveBeenLastCalledWith('bun add @refractor-ui/core --exact');
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it('gracefully handles missing, rejecting, and throwing clipboard APIs', async () => {
    const onCopy = vi.fn();
    const cmd = 'pnpm test:coverage';

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    render(<CopyableCommandBlock command={cmd} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(onCopy).toHaveBeenCalledWith(cmd);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    const rejectingWrite = vi.fn(() => Promise.reject(new Error('Permission denied')));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: rejectingWrite },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    expect(rejectingWrite).toHaveBeenCalledWith(cmd);
    await Promise.resolve();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get() {
        throw new Error('Insecure context');
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    expect(onCopy).toHaveBeenCalledTimes(3);
  });

  it('renders adversarial XSS payloads as literal text without injecting DOM nodes', () => {
    const payload = '<script>window.__cmdXss=1</script><img src=x onerror=alert(1)>';
    const onCopy = vi.fn();

    render(
      <CopyableCommandBlock
        title={payload}
        prefix={payload}
        command={`echo "${payload}"`}
        onCopy={onCopy}
      />
    );

    expect(screen.getByTestId('copyable-command-code')).toHaveTextContent(`echo "${payload}"`);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(onCopy).toHaveBeenCalledWith(`echo "${payload}"`);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
