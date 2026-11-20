import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { DiffViewer, type DiffViewMode } from './index';

describe('DiffViewer', () => {
  const ORIGINAL = ['const mode = "standard";', 'const blur = 18;', 'const alpha = 0.8;'].join('\n');
  const MODIFIED = [
    'const mode = "vivid";',
    'const blur = 18;',
    'const alpha = 0.85;',
    'const dispersion = 1.35;',
  ].join('\n');

  it('renders split diff with paired rows, summary badges, labels, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            DiffViewer: { className: 'theme-diff', style: { maxWidth: '960px' } },
          },
        }}
      >
        <DiffViewer
          ref={ref}
          title="Theme Token Patch"
          original={ORIGINAL}
          modified={MODIFIED}
          originalLabel="v1.1.0"
          modifiedLabel="v1.2.0"
          className="custom-diff"
          style={{ borderRadius: '20px' }}
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="diff-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('diff-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-diff-viewer', 'prism-slab', 'theme-diff', 'custom-diff');
    expect(root).toHaveStyle({ maxWidth: '960px', borderRadius: '20px' });
    expect(root).toHaveAttribute('data-view-mode', 'split');
    expect(root).not.toHaveAttribute('data-identical');

    expect(screen.getByRole('heading', { name: 'Theme Token Patch' })).toBeInTheDocument();
    expect(screen.getByText('+3 additions')).toBeInTheDocument();
    expect(screen.getByText('-2 deletions')).toBeInTheDocument();
    expect(screen.getByText('1 unchanged')).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Theme Token Patch side-by-side diff' });
    expect(within(table).getByText('v1.1.0')).toBeInTheDocument();
    expect(within(table).getByText('v1.2.0')).toBeInTheDocument();

    // Paired split rows include unchanged, removed, added, and empty filler cells when additions > deletions
    expect(table.querySelectorAll('[data-diff-kind="removed"]').length).toBe(2);
    expect(table.querySelectorAll('[data-diff-kind="added"]').length).toBe(3);
    expect(table.querySelectorAll('[data-diff-kind="empty"]').length).toBe(1);
    expect(within(table).getByText('const mode = "standard";')).toBeInTheDocument();
    expect(within(table).getByText('const dispersion = 1.35;')).toBeInTheDocument();
  });

  it('switches between split and unified view modes via click and keyboard arrows', () => {
    const onViewModeChange = vi.fn();

    render(
      <DiffViewer
        original={'alpha\nbeta\ngamma'}
        modified={'alpha\ndelta'}
        onViewModeChange={onViewModeChange}
        data-testid="mode-diff"
      />
    );

    const root = screen.getByTestId('mode-diff');
    const splitBtn = screen.getByRole('button', { name: 'Split' });
    const unifiedBtn = screen.getByRole('button', { name: 'Unified' });

    expect(splitBtn).toHaveAttribute('aria-pressed', 'true');
    expect(unifiedBtn).toHaveAttribute('aria-pressed', 'false');

    // Deletions outnumber additions -> right side has an empty filler cell in split mode
    expect(root.querySelectorAll('[data-diff-pane="modified"][data-diff-kind="empty"]').length).toBe(
      1
    );

    // Click Unified
    fireEvent.click(unifiedBtn);
    expect(onViewModeChange).toHaveBeenCalledWith('unified');
    expect(root).toHaveAttribute('data-view-mode', 'unified');
    expect(unifiedBtn).toHaveAttribute('aria-pressed', 'true');

    const unifiedTable = screen.getByRole('table', { name: 'Diff Viewer unified diff' });
    expect(within(unifiedTable).getByText('Original → Modified')).toBeInTheDocument();
    expect(unifiedTable.querySelectorAll('tr[data-diff-kind="added"]').length).toBe(1);
    expect(unifiedTable.querySelectorAll('tr[data-diff-kind="removed"]').length).toBe(2);
    expect(unifiedTable.querySelectorAll('tr[data-diff-kind="unchanged"]').length).toBe(1);

    // Keyboard arrow switches back to split; unrelated key does nothing
    fireEvent.keyDown(unifiedBtn, { key: 'KeyX' });
    expect(root).toHaveAttribute('data-view-mode', 'unified');

    fireEvent.keyDown(unifiedBtn, { key: 'ArrowLeft' });
    expect(onViewModeChange).toHaveBeenCalledWith('split');
    expect(root).toHaveAttribute('data-view-mode', 'split');

    fireEvent.keyDown(splitBtn, { key: 'ArrowRight' });
    expect(onViewModeChange).toHaveBeenCalledWith('unified');
    expect(root).toHaveAttribute('data-view-mode', 'unified');
  });

  it('supports controlled viewMode and controlled ignoreWhitespace props', () => {
    const onViewModeChange = vi.fn();
    const onIgnoreWhitespaceChange = vi.fn();
    let mode: DiffViewMode = 'unified';

    const { rerender } = render(
      <DiffViewer
        original="  const a = 1;"
        modified="const   a = 1;  "
        viewMode={mode}
        onViewModeChange={onViewModeChange}
        ignoreWhitespace={false}
        onIgnoreWhitespaceChange={onIgnoreWhitespaceChange}
        data-testid="ctrl-diff"
      />
    );

    const root = screen.getByTestId('ctrl-diff');
    expect(root).toHaveAttribute('data-view-mode', 'unified');
    expect(screen.getByText('+1 additions')).toBeInTheDocument();
    expect(screen.getByText('-1 deletions')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    expect(onViewModeChange).toHaveBeenCalledWith('split');
    // Still controlled at 'unified' until parent re-renders
    expect(root).toHaveAttribute('data-view-mode', 'unified');

    fireEvent.click(screen.getByRole('button', { name: 'Ignore whitespace' }));
    expect(onIgnoreWhitespaceChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Ignore whitespace' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    mode = 'split';
    rerender(
      <DiffViewer
        original="  const a = 1;"
        modified="const   a = 1;  "
        viewMode={mode}
        onViewModeChange={onViewModeChange}
        ignoreWhitespace={true}
        onIgnoreWhitespaceChange={onIgnoreWhitespaceChange}
        data-testid="ctrl-diff"
      />
    );

    expect(root).toHaveAttribute('data-view-mode', 'split');
    expect(root).toHaveAttribute('data-ignore-whitespace', 'true');
    expect(root).toHaveAttribute('data-identical', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No differences detected');
  });

  it('toggles ignoreWhitespace when uncontrolled and detects whitespace-only parity', () => {
    render(
      <DiffViewer
        original={'  line   one\nline two'}
        modified={'line one  \nline two'}
        defaultIgnoreWhitespace={false}
      />
    );

    expect(screen.getByText('+1 additions')).toBeInTheDocument();
    expect(screen.getByText('-1 deletions')).toBeInTheDocument();
    expect(screen.queryByText('No differences detected')).not.toBeInTheDocument();

    const wsToggle = screen.getByRole('button', { name: 'Ignore whitespace' });
    expect(wsToggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(wsToggle);

    expect(wsToggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('+0 additions')).toBeInTheDocument();
    expect(screen.getByText('-0 deletions')).toBeInTheDocument();
    expect(screen.getByText('2 unchanged')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No differences detected');
  });

  it('handles identical strings, empty strings, pure additions, and pure deletions cleanly (negative & edge)', () => {
    const { rerender } = render(
      <DiffViewer original={'same line 1\nsame line 2'} modified={'same line 1\nsame line 2'} />
    );
    expect(screen.getByRole('status')).toHaveTextContent('No differences detected');
    expect(screen.getByText('2 unchanged')).toBeInTheDocument();
    expect(screen.getAllByText('same line 1')).toHaveLength(2);

    rerender(<DiffViewer original="" modified="" data-testid="empty-diff" />);
    expect(screen.getByTestId('empty-diff')).toHaveAttribute('data-identical', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No differences detected');
    expect(screen.getByText('No content to compare.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    rerender(<DiffViewer original="" modified={'new1\nnew2'} />);
    expect(screen.getByText('+2 additions')).toBeInTheDocument();
    expect(screen.getByText('-0 deletions')).toBeInTheDocument();

    rerender(<DiffViewer original={'old1\nold2'} modified="" defaultViewMode="unified" />);
    expect(screen.getByText('+0 additions')).toBeInTheDocument();
    expect(screen.getByText('-2 deletions')).toBeInTheDocument();
  });

  it('handles large > 600-line inputs via computeLineDiff linear fallback without freezing', () => {
    const origLines = Array.from({ length: 620 }, (_, i) => `line-${i + 1}: baseline`);
    const modLines = Array.from({ length: 625 }, (_, i) =>
      i === 300 || i >= 620 ? `line-${i + 1}: updated` : `line-${i + 1}: baseline`
    );

    const { rerender } = render(
      <DiffViewer
        original={origLines.join('\n')}
        modified={modLines.join('\n')}
        data-testid="large-diff"
      />
    );

    expect(screen.getByText('+6 additions')).toBeInTheDocument();
    expect(screen.getByText('-1 deletions')).toBeInTheDocument();
    expect(screen.getByText('619 unchanged')).toBeInTheDocument();
    expect(screen.getByText('line-625: updated')).toBeInTheDocument();

    rerender(
      <DiffViewer
        original={origLines.join('\n')}
        modified={modLines.join('\n')}
        viewMode="unified"
        data-testid="large-diff"
      />
    );
    expect(screen.getByTestId('large-diff')).toHaveAttribute('data-view-mode', 'unified');
    expect(screen.getByText('line-301: updated')).toBeInTheDocument();
  });

  it('renders adversarial XSS payloads strictly as literal text nodes with zero HTML injection', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const modPayload = '<svg onload=alert(2)>safe-text</svg>';

    render(
      <DiffViewer
        title={payload}
        originalLabel={payload}
        modifiedLabel={modPayload}
        original={payload}
        modified={modPayload}
        defaultViewMode="unified"
      />
    );

    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(screen.getByText(payload, { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText(modPayload, { selector: 'td' })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
