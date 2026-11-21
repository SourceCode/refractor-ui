import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { InlineDiffReviewer, type DiffHunk } from './index';

describe('InlineDiffReviewer', () => {
  const SAMPLE_HUNKS: DiffHunk[] = [
    {
      id: 'hunk-1',
      header: '@@ -10,3 +10,3 @@ export function resolveTokens()',
      lines: [
        { kind: 'context', oldLine: 10, newLine: 10, content: 'const baseBlur = 18;' },
        { kind: 'remove', oldLine: 11, content: 'const opacity = 0.7;' },
        { kind: 'add', newLine: 11, content: 'const opacity = 0.85;' },
      ],
    },
    {
      id: 'hunk-2',
      header: '@@ -42,2 +42,3 @@ export function applyRefraction()',
      status: 'accepted',
      lines: [
        { kind: 'context', oldLine: 42, newLine: 42, content: 'return {' },
        { kind: 'add', newLine: 43, content: '  refraction: "vivid",' },
        { kind: 'add', content: '  // duplicate signature check' },
        { kind: 'add', content: '  // duplicate signature check' },
      ],
    },
  ];

  it('renders prism-slab header, monospace filePath, reviewed counter, hunks, lines, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            InlineDiffReviewer: {
              className: 'theme-diff-reviewer',
              style: { maxWidth: '900px' },
            },
          },
        }}
      >
        <InlineDiffReviewer
          ref={ref}
          filePath="packages/core/src/theme/createPrismTheme.ts"
          hunks={SAMPLE_HUNKS}
          className="custom-diff-reviewer"
          style={{ borderRadius: '20px' }}
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="inline-diff-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('inline-diff-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-inline-diff-reviewer',
      'prism-slab',
      'theme-diff-reviewer',
      'custom-diff-reviewer'
    );
    expect(root).toHaveStyle({ maxWidth: '900px', borderRadius: '20px' });
    expect(root).not.toHaveAttribute('data-read-only');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-all-reviewed');

    expect(screen.getByTestId('inline-diff-filepath')).toHaveTextContent(
      'packages/core/src/theme/createPrismTheme.ts'
    );
    expect(screen.getByTestId('inline-diff-counter')).toHaveTextContent('1 / 2 reviewed');

    const acceptAllBtn = screen.getByRole('button', { name: 'Accept All' });
    const rejectAllBtn = screen.getByRole('button', { name: 'Reject All' });
    expect(acceptAllBtn).toHaveClass('prism-btn-primary');
    expect(rejectAllBtn).toHaveClass('prism-btn-secondary');

    const hunk1 = root.querySelector('[data-hunk-id="hunk-1"]') as HTMLElement;
    const hunk2 = root.querySelector('[data-hunk-id="hunk-2"]') as HTMLElement;
    expect(hunk1).toHaveClass('prism-well');
    expect(hunk1).toHaveAttribute('data-hunk-status', 'pending');
    expect(within(hunk1).getByText('Pending')).toBeInTheDocument();

    expect(hunk2).toHaveAttribute('data-hunk-status', 'accepted');
    const acceptedBadge = hunk2.querySelector('[data-hunk-badge="accepted"]');
    expect(acceptedBadge).toHaveClass('prism-emerald');
    expect(acceptedBadge).toHaveTextContent('Accepted');

    // Verify tabular line numbers, markers, and literal line contents
    const rows = hunk1.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    const contextRow = rows.item(0);
    const removeRow = rows.item(1);
    const addRow = rows.item(2);

    expect(contextRow).toHaveAttribute('data-line-kind', 'context');
    expect(contextRow.querySelector('[data-col="old-line"]')).toHaveTextContent('10');
    expect(contextRow.querySelector('[data-col="new-line"]')).toHaveTextContent('10');
    expect(contextRow.querySelector('[data-col="marker"]')).toHaveTextContent('');
    expect(contextRow.querySelector('[data-col="content"]')).toHaveTextContent(
      'const baseBlur = 18;'
    );

    expect(removeRow).toHaveAttribute('data-line-kind', 'remove');
    expect(removeRow.querySelector('[data-col="old-line"]')).toHaveTextContent('11');
    expect(removeRow.querySelector('[data-col="new-line"]')).toHaveTextContent('');
    expect(removeRow.querySelector('[data-col="marker"]')).toHaveTextContent('-');

    expect(addRow).toHaveAttribute('data-line-kind', 'add');
    expect(addRow.querySelector('[data-col="old-line"]')).toHaveTextContent('');
    expect(addRow.querySelector('[data-col="new-line"]')).toHaveTextContent('11');
    expect(addRow.querySelector('[data-col="marker"]')).toHaveTextContent('+');
  });

  it('tracks individual hunk accept/reject decisions, updates counter, and fires callbacks', () => {
    const onHunkDecision = vi.fn();

    render(
      <InlineDiffReviewer
        filePath="src/agent.ts"
        hunks={SAMPLE_HUNKS}
        onHunkDecision={onHunkDecision}
        data-testid="decisions-root"
      />
    );

    const root = screen.getByTestId('decisions-root');
    const hunk1 = root.querySelector('[data-hunk-id="hunk-1"]') as HTMLElement;
    const hunk2 = root.querySelector('[data-hunk-id="hunk-2"]') as HTMLElement;

    // Accept hunk-1 -> 2 / 2 reviewed
    const acceptHunk1 = within(hunk1).getByRole('button', { name: 'Accept' });
    fireEvent.click(acceptHunk1);
    expect(onHunkDecision).toHaveBeenCalledWith('hunk-1', 'accepted');
    expect(hunk1).toHaveAttribute('data-hunk-status', 'accepted');
    expect(acceptHunk1).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('inline-diff-counter')).toHaveTextContent('2 / 2 reviewed');
    expect(root).toHaveAttribute('data-all-reviewed', 'true');

    // Override initially-accepted hunk-2 to rejected
    const rejectHunk2 = within(hunk2).getByRole('button', { name: 'Reject' });
    fireEvent.click(rejectHunk2);
    expect(onHunkDecision).toHaveBeenCalledWith('hunk-2', 'rejected');
    expect(hunk2).toHaveAttribute('data-hunk-status', 'rejected');
    expect(rejectHunk2).toHaveAttribute('aria-pressed', 'true');
    expect(within(hunk2).getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByTestId('inline-diff-counter')).toHaveTextContent('2 / 2 reviewed');
  });

  it('supports bulk Accept All and Reject All with and without external callbacks', () => {
    const onAcceptAll = vi.fn();
    const onRejectAll = vi.fn();

    const pendingHunks: DiffHunk[] = [
      {
        id: 'a',
        header: '@@ -1,1 +1,1 @@',
        lines: [{ kind: 'add', newLine: 1, content: 'export const a = 1;' }],
      },
      {
        id: 'b',
        header: '@@ -5,1 +5,1 @@',
        lines: [{ kind: 'remove', oldLine: 5, content: 'export const b = 2;' }],
      },
    ];

    const { rerender } = render(
      <InlineDiffReviewer
        filePath="src/bulk.ts"
        hunks={pendingHunks}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
        data-testid="bulk-root"
      />
    );

    const root = screen.getByTestId('bulk-root');
    expect(screen.getByTestId('inline-diff-counter')).toHaveTextContent('0 / 2 reviewed');

    fireEvent.click(screen.getByRole('button', { name: 'Accept All' }));
    expect(onAcceptAll).toHaveBeenCalledTimes(1);
    expect(root.querySelector('[data-hunk-id="a"]')).toHaveAttribute('data-hunk-status', 'accepted');
    expect(root.querySelector('[data-hunk-id="b"]')).toHaveAttribute('data-hunk-status', 'accepted');
    expect(screen.getByTestId('inline-diff-counter')).toHaveTextContent('2 / 2 reviewed');

    fireEvent.click(screen.getByRole('button', { name: 'Reject All' }));
    expect(onRejectAll).toHaveBeenCalledTimes(1);
    expect(root.querySelector('[data-hunk-id="a"]')).toHaveAttribute('data-hunk-status', 'rejected');
    expect(root.querySelector('[data-hunk-id="b"]')).toHaveAttribute('data-hunk-status', 'rejected');

    // Without callbacks provided, bulk and single actions still update internal Map safely
    rerender(<InlineDiffReviewer filePath="src/bulk.ts" hunks={pendingHunks} data-testid="bulk-root" />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject All' }));
    const hunkA = root.querySelector('[data-hunk-id="a"]') as HTMLElement;
    fireEvent.click(within(hunkA).getByRole('button', { name: 'Accept' }));
    expect(hunkA).toHaveAttribute('data-hunk-status', 'accepted');
  });

  it('hides bulk and per-hunk controls in readOnly mode and displays clean empty states', () => {
    const { rerender } = render(
      <InlineDiffReviewer
        filePath="src/readonly.ts"
        hunks={[
          {
            id: 'empty-lines-hunk',
            header: '@@ -0,0 +0,0 @@',
            status: 'rejected',
            lines: [],
          },
        ]}
        readOnly
        data-testid="ro-root"
      />
    );

    const root = screen.getByTestId('ro-root');
    expect(root).toHaveAttribute('data-read-only', 'true');
    expect(screen.queryByRole('button', { name: 'Accept All' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject All' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.getByText('No lines in this hunk.')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();

    // Empty hunks array renders dedicated empty state without bulk action buttons
    rerender(
      <InlineDiffReviewer filePath="src/empty.ts" hunks={[]} data-testid="ro-root" />
    );

    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('inline-diff-counter')).toHaveTextContent('0 / 0 reviewed');
    expect(screen.getByTestId('inline-diff-empty')).toHaveTextContent('No diff hunks to review');
    expect(screen.queryByRole('button', { name: 'Accept All' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject All' })).not.toBeInTheDocument();
  });

  it('handles prototype-pollution hunk IDs safely via Map and ignores non-finite line numbers (adversarial)', () => {
    const onHunkDecision = vi.fn();
    const adversarialHunks: DiffHunk[] = [
      {
        id: '__proto__',
        header: '@@ -1,1 +1,1 @@ proto',
        lines: [{ kind: 'add', oldLine: Number.NaN, newLine: 1, content: 'safe proto hunk' }],
      },
      {
        id: 'constructor',
        header: '@@ -2,1 +2,1 @@ ctor',
        lines: [{ kind: 'remove', oldLine: 2, newLine: Number.POSITIVE_INFINITY, content: 'safe ctor hunk' }],
      },
    ];

    render(
      <InlineDiffReviewer
        filePath="src/proto.ts"
        hunks={adversarialHunks}
        onHunkDecision={onHunkDecision}
        data-testid="proto-root"
      />
    );

    const root = screen.getByTestId('proto-root');
    const protoHunk = root.querySelector('[data-hunk-id="__proto__"]') as HTMLElement;
    const ctorHunk = root.querySelector('[data-hunk-id="constructor"]') as HTMLElement;

    expect(protoHunk).toHaveAttribute('data-hunk-status', 'pending');
    expect(ctorHunk).toHaveAttribute('data-hunk-status', 'pending');
    expect(protoHunk.querySelector('[data-col="old-line"]')).toHaveTextContent('');
    expect(ctorHunk.querySelector('[data-col="new-line"]')).toHaveTextContent('');

    fireEvent.click(within(protoHunk).getByRole('button', { name: 'Accept' }));
    expect(onHunkDecision).toHaveBeenCalledWith('__proto__', 'accepted');
    expect(protoHunk).toHaveAttribute('data-hunk-status', 'accepted');
    expect(ctorHunk).toHaveAttribute('data-hunk-status', 'pending');
  });

  it('renders XSS payloads in filePath, hunk header, and line content strictly as literal text (adversarial)', () => {
    const xssPayload = '<script>window.__diffXss=1</script><img src=x onerror=alert(1)>';
    const hunks: DiffHunk[] = [
      {
        id: 'xss-1',
        header: xssPayload,
        lines: [{ kind: 'add', newLine: 1, content: xssPayload }],
      },
    ];

    render(<InlineDiffReviewer filePath={xssPayload} hunks={hunks} />);

    expect(screen.getAllByText(xssPayload)).toHaveLength(3);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
