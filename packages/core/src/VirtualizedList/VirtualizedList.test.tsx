import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { VirtualizedList, type VirtualizedListItem } from './VirtualizedList';

interface LogEntry extends VirtualizedListItem {
  label: string;
}

function createEntries(count: number): LogEntry[] {
  const entries: LogEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    entries.push({ id: `row-${i}`, label: `Telemetry Row #${i + 1}` });
  }
  return entries;
}

describe('VirtualizedList', () => {
  it('virtualizes 50,000 items into ~10-13 mounted DOM nodes, updates window on scroll, and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    const items = createEntries(50_000);

    render(
      <VirtualizedList
        ref={ref}
        items={items}
        itemHeight={48}
        height={320}
        overscan={3}
        renderItem={(item, index) => (
          <div data-testid={`item-${index}`}>{item.label}</div>
        )}
        className="custom-vlist"
        xstyle={{ '--prism-blur-px': '16px' }}
        data-testid="vlist-root"
      />
    );

    const root = screen.getByTestId('vlist-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-virtualized-list', 'prism-slab', 'custom-vlist');
    expect(root).toHaveAttribute('data-show-telemetry', 'true');

    // Spacer holds full virtual height: 50,000 * 48 = 2,400,000px
    const spacer = root.querySelector('[data-part="spacer"]') as HTMLElement;
    expect(spacer).toHaveStyle({ height: '2400000px' });

    // Only visible slice + overscan mounted (~10 nodes, nowhere near 50,000)
    const initialRows = screen.getAllByRole('listitem');
    expect(initialRows.length).toBe(10);
    expect(initialRows[0]).toHaveAttribute('aria-posinset', '1');
    expect(initialRows[0]).toHaveAttribute('aria-setsize', '50000');
    expect(screen.getByText('Rows 1–10 of 50,000')).toBeInTheDocument();
    expect(screen.getByText('10 mounted')).toBeInTheDocument();
    expect(screen.getByTestId('item-0')).toHaveTextContent('Telemetry Row #1');
    expect(screen.queryByTestId('item-5000')).toBeNull();

    // Scroll to row 5,000 (5000 * 48 = 240,000px)
    const viewport = root.querySelector('[data-part="viewport"]') as HTMLElement;
    viewport.scrollTop = 240_000;
    fireEvent.scroll(viewport);

    const scrolledRows = screen.getAllByRole('listitem');
    expect(scrolledRows.length).toBe(13);
    expect(screen.getByTestId('item-5000')).toHaveTextContent('Telemetry Row #5001');
    expect(screen.queryByTestId('item-0')).toBeNull();

    const windowLayer = root.querySelector('[data-part="window"]') as HTMLElement;
    expect(windowLayer).toHaveStyle({ transform: 'translateY(239856px)' });
    expect(screen.getByText('Rows 4,998–5,010 of 50,000')).toBeInTheDocument();
  });

  it('fires onEndReached once per threshold entry per dataset length and shows loadingMore crystal pill', () => {
    const onEndReached = vi.fn();
    const initialItems = createEntries(50);

    const { rerender } = render(
      <VirtualizedList
        items={initialItems}
        itemHeight={48}
        height={240}
        endReachedThreshold={120}
        onEndReached={onEndReached}
        renderItem={(item) => <span>{item.label}</span>}
        data-testid="infinite-vlist"
      />
    );

    const root = screen.getByTestId('infinite-vlist');
    const viewport = root.querySelector('[data-part="viewport"]') as HTMLElement;

    // Mid-list scroll does not trigger onEndReached (totalHeight=2400, distance=2400-(500+240)=1660 > 120)
    viewport.scrollTop = 500;
    fireEvent.scroll(viewport);
    expect(onEndReached).not.toHaveBeenCalled();

    // Scroll into threshold (distance = 2400 - (2100 + 240) = 60 <= 120) -> fires once
    viewport.scrollTop = 2100;
    fireEvent.scroll(viewport);
    expect(onEndReached).toHaveBeenCalledTimes(1);

    // Continued scroll events at same items.length MUST NOT re-fire onEndReached
    viewport.scrollTop = 2140;
    fireEvent.scroll(viewport);
    viewport.scrollTop = 2160;
    fireEvent.scroll(viewport);
    expect(onEndReached).toHaveBeenCalledTimes(1);

    // Loading state renders crystal status pill and suppresses triggers even if items grow
    const expandedItems = createEntries(100);
    rerender(
      <VirtualizedList
        items={expandedItems}
        itemHeight={48}
        height={240}
        endReachedThreshold={120}
        loadingMore
        onEndReached={onEndReached}
        renderItem={(item) => <span>{item.label}</span>}
        data-testid="infinite-vlist"
      />
    );
    expect(root).toHaveAttribute('data-loading-more', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading more items…');

    viewport.scrollTop = 4500;
    fireEvent.scroll(viewport);
    expect(onEndReached).toHaveBeenCalledTimes(1);

    // Once loadingMore completes, scrolling into threshold at new length triggers onEndReached again
    rerender(
      <VirtualizedList
        items={expandedItems}
        itemHeight={48}
        height={240}
        endReachedThreshold={120}
        loadingMore={false}
        onEndReached={onEndReached}
        renderItem={(item) => <span>{item.label}</span>}
        data-testid="infinite-vlist"
      />
    );
    expect(screen.queryByRole('status')).toBeNull();
    viewport.scrollTop = 4520;
    fireEvent.scroll(viewport);
    expect(onEndReached).toHaveBeenCalledTimes(2);
  });

  it('supports default props, showTelemetry=false, and PrismThemeProvider overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: {
            VirtualizedList: { className: 'theme-vlist', style: { maxWidth: '520px' } },
          },
        }}
      >
        <VirtualizedList
          items={createEntries(5)}
          showTelemetry={false}
          renderItem={(item) => <span>{item.label}</span>}
          className="local-vlist"
          data-testid="themed-vlist"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('themed-vlist');
    expect(root).toHaveClass('refractor-virtualized-list', 'theme-vlist', 'local-vlist');
    expect(root).toHaveStyle({ maxWidth: '520px' });
    expect(root.querySelector('[data-part="telemetry-bar"]')).toBeNull();

    const viewport = root.querySelector('[data-part="viewport"]') as HTMLElement;
    expect(viewport).toHaveAttribute('data-item-height', '48');
    expect(viewport).toHaveAttribute('data-viewport-height', '320');
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('handles empty list, invalid/NaN/negative dimensions, adversarial scrollTop, and XSS payloads safely', () => {
    const onEndReached = vi.fn();
    const xssPayload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <VirtualizedList<LogEntry>
        items={[]}
        itemHeight={0}
        height={-40}
        overscan={-5}
        emptyMessage="No telemetry events recorded."
        onEndReached={onEndReached}
        renderItem={(item) => <span>{item.label}</span>}
        data-testid="edge-vlist"
      />
    );

    const root = screen.getByTestId('edge-vlist');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByText('No telemetry events recorded.')).toBeInTheDocument();
    expect(screen.getByText('Rows 0 of 0')).toBeInTheDocument();

    const viewport = root.querySelector('[data-part="viewport"]') as HTMLElement;
    expect(viewport).toHaveAttribute('data-item-height', '20');
    expect(viewport).toHaveAttribute('data-viewport-height', '80');

    // Scroll on empty list never invokes onEndReached
    fireEvent.scroll(viewport);
    expect(onEndReached).not.toHaveBeenCalled();

    // NaN dimensions safely fall back to defaults (48 / 320 / overscan 3)
    rerender(
      <VirtualizedList
        items={[{ id: 'xss-row', label: xssPayload }]}
        itemHeight={Number.NaN}
        height={Number.NaN}
        overscan={Number.NaN}
        endReachedThreshold={Number.NaN}
        renderItem={(item) => <span>{item.label}</span>}
        data-testid="edge-vlist"
      />
    );

    expect(viewport).toHaveAttribute('data-item-height', '48');
    expect(viewport).toHaveAttribute('data-viewport-height', '320');
    expect(screen.getByRole('listitem')).toHaveTextContent(xssPayload);
    expect(document.querySelector('script')).toBeNull();

    // Negative and NaN scrollTop values are clamped deterministically to 0
    Object.defineProperty(viewport, 'scrollTop', { value: -250, configurable: true });
    fireEvent.scroll(viewport);
    const windowLayer = root.querySelector('[data-part="window"]') as HTMLElement;
    expect(windowLayer).toHaveStyle({ transform: 'translateY(0px)' });

    Object.defineProperty(viewport, 'scrollTop', { value: Number.NaN, configurable: true });
    fireEvent.scroll(viewport);
    expect(windowLayer).toHaveStyle({ transform: 'translateY(0px)' });
  });
});
