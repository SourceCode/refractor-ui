import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AttachedContextBar,
  type AttachedContextItem,
  type AttachedContextKind,
} from './index';

const SAMPLE_ITEMS: AttachedContextItem[] = [
  { id: 'file-1', label: 'src/BaseProps.ts', kind: 'file', tokens: 420, pinned: true },
  { id: 'dir-1', label: 'packages/core/src', kind: 'folder', tokens: 2400 },
  { id: 'url-1', label: 'https://docs.refractor.dev', kind: 'url', tokens: 1000 },
  { id: 'snip-1', label: 'mergeProps helper', kind: 'snippet' },
];

describe('AttachedContextBar', () => {
  it('renders all four item kinds, header summary, add button, ref forwarding, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const onAddClick = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AttachedContextBar: {
              className: 'theme-context-bar',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <AttachedContextBar
          ref={ref}
          defaultItems={SAMPLE_ITEMS}
          onAddClick={onAddClick}
          addLabel="Add Source"
          className="local-context-bar"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="bar-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('bar-root');
    expect(ref.current).toBe(root);
    expect(AttachedContextBar.displayName).toBe('AttachedContextBar');
    expect(root).toHaveClass(
      'refractor-attached-context-bar',
      'prism-slab',
      'theme-context-bar',
      'local-context-bar'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', marginTop: '6px' });
    expect(root).toHaveAttribute('data-count', '4');
    expect(root).toHaveAttribute('data-pinned-count', '1');
    expect(root).not.toHaveAttribute('data-empty');

    expect(screen.getByTestId('attached-context-count')).toHaveTextContent('4 attached');
    // 420 + 2400 + 1000 = 3820 -> 3.8k tok
    expect(screen.getByTestId('attached-context-total-tokens')).toHaveTextContent('3.8k tok');

    const addButton = screen.getByRole('button', { name: 'Add Source' });
    expect(addButton).toHaveClass('prism-crystal', 'prism-focus-ring');
    fireEvent.click(addButton);
    expect(onAddClick).toHaveBeenCalledTimes(1);

    const expectedKinds: ReadonlyArray<{ id: string; kind: AttachedContextKind; pinned: string }> = [
      { id: 'file-1', kind: 'file', pinned: 'true' },
      { id: 'dir-1', kind: 'folder', pinned: 'false' },
      { id: 'url-1', kind: 'url', pinned: 'false' },
      { id: 'snip-1', kind: 'snippet', pinned: 'false' },
    ];

    for (const entry of expectedKinds) {
      const chip = screen.getByTestId(`attached-context-item-${entry.id}`);
      expect(chip).toHaveClass('prism-crystal');
      expect(chip).toHaveAttribute('data-kind', entry.kind);
      expect(chip).toHaveAttribute('data-pinned', entry.pinned);
    }

    expect(screen.getByTestId('attached-context-tokens-file-1')).toHaveTextContent('420 tok');
    expect(screen.getByTestId('attached-context-tokens-dir-1')).toHaveTextContent('2.4k tok');
    expect(screen.getByTestId('attached-context-tokens-url-1')).toHaveTextContent('1k tok');
    expect(screen.queryByTestId('attached-context-tokens-snip-1')).not.toBeInTheDocument();
  });

  it('supports uncontrolled pin toggling and item removal with callbacks and transitions to empty state', () => {
    const onItemsChange = vi.fn();
    const onTogglePin = vi.fn();
    const onRemove = vi.fn();

    render(
      <AttachedContextBar
        defaultItems={[
          { id: 'a', label: 'README.md', kind: 'file', tokens: 300, pinned: false },
          { id: 'b', label: 'Theme Spec', kind: 'snippet', tokens: 200, pinned: true },
        ]}
        onItemsChange={onItemsChange}
        onTogglePin={onTogglePin}
        onRemove={onRemove}
        data-testid="uncontrolled-bar"
      />
    );

    expect(screen.queryByTestId('attached-context-add')).not.toBeInTheDocument();
    expect(screen.getByTestId('attached-context-total-tokens')).toHaveTextContent('500 tok');

    // Pin item 'a'
    const pinButtonA = screen.getByRole('button', { name: 'Pin README.md' });
    expect(pinButtonA).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(pinButtonA);

    expect(onTogglePin).toHaveBeenCalledWith('a', true);
    expect(onItemsChange).toHaveBeenLastCalledWith([
      { id: 'a', label: 'README.md', kind: 'file', tokens: 300, pinned: true },
      { id: 'b', label: 'Theme Spec', kind: 'snippet', tokens: 200, pinned: true },
    ]);
    expect(screen.getByTestId('attached-context-item-a')).toHaveAttribute('data-pinned', 'true');
    const unpinButtonA = screen.getByRole('button', { name: 'Unpin README.md' });
    expect(unpinButtonA).toHaveAttribute('aria-pressed', 'true');

    // Unpin item 'b'
    fireEvent.click(screen.getByRole('button', { name: 'Unpin Theme Spec' }));
    expect(onTogglePin).toHaveBeenCalledWith('b', false);
    expect(screen.getByTestId('attached-context-item-b')).toHaveAttribute('data-pinned', 'false');

    // Remove item 'a'
    fireEvent.click(screen.getByRole('button', { name: 'Remove README.md' }));
    expect(onRemove).toHaveBeenCalledWith('a');
    expect(screen.queryByTestId('attached-context-item-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('attached-context-count')).toHaveTextContent('1 attached');
    expect(screen.getByTestId('attached-context-total-tokens')).toHaveTextContent('200 tok');

    // Remove last item 'b' -> clean empty state
    fireEvent.click(screen.getByRole('button', { name: 'Remove Theme Spec' }));
    expect(onRemove).toHaveBeenCalledWith('b');
    expect(screen.getByTestId('uncontrolled-bar')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('attached-context-count')).toHaveTextContent('0 attached');
    expect(screen.getByTestId('attached-context-total-tokens')).toHaveTextContent('0 tok');
    expect(screen.getByTestId('attached-context-empty')).toHaveTextContent(
      'No context items attached.'
    );
  });

  it('operates strictly in controlled mode without mutating props internally', () => {
    const controlledItems: AttachedContextItem[] = [
      { id: 'c1', label: 'api/schema.json', kind: 'file', tokens: 1200, pinned: false },
    ];
    const onItemsChange = vi.fn();
    const onTogglePin = vi.fn();
    const onRemove = vi.fn();

    render(
      <AttachedContextBar
        items={controlledItems}
        onItemsChange={onItemsChange}
        onTogglePin={onTogglePin}
        onRemove={onRemove}
        onAddClick={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'Attach Context' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pin api/schema.json' }));
    expect(onTogglePin).toHaveBeenCalledWith('c1', true);
    expect(onItemsChange).toHaveBeenCalledWith([
      { id: 'c1', label: 'api/schema.json', kind: 'file', tokens: 1200, pinned: true },
    ]);
    // Controlled state stays unchanged until parent updates `items`
    expect(screen.getByTestId('attached-context-item-c1')).toHaveAttribute('data-pinned', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Remove api/schema.json' }));
    expect(onRemove).toHaveBeenCalledWith('c1');
    expect(onItemsChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByTestId('attached-context-item-c1')).toBeInTheDocument();
  });

  it('sanitizes non-finite/negative token values, supports custom emptyMessage, and escapes XSS labels safely', () => {
    const xssLabel = '<script>window.__ctxBarXss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <AttachedContextBar
        items={[
          { id: 'bad-1', label: xssLabel, kind: 'url', tokens: Number.NaN },
          { id: 'bad-2', label: 'Negative', kind: 'file', tokens: -50 },
          { id: 'bad-3', label: 'Infinity', kind: 'folder', tokens: Number.POSITIVE_INFINITY },
          { id: 'good-0', label: 'Zero', kind: 'snippet', tokens: 0 },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();

    const list = screen.getByTestId('attached-context-list');
    expect(within(list).getByText(xssLabel)).toBeInTheDocument();
    expect(screen.getByTestId('attached-context-total-tokens')).toHaveTextContent('0 tok');
    expect(screen.queryByTestId('attached-context-tokens-bad-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attached-context-tokens-bad-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attached-context-tokens-bad-3')).not.toBeInTheDocument();
    expect(screen.getByTestId('attached-context-tokens-good-0')).toHaveTextContent('0 tok');

    rerender(<AttachedContextBar items={[]} emptyMessage="Drop files or URLs here." />);
    expect(screen.getByTestId('attached-context-empty')).toHaveTextContent(
      'Drop files or URLs here.'
    );
  });
});
