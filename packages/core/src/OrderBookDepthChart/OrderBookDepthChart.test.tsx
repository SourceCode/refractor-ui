import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_ORDER_BOOK_ASKS,
  DEFAULT_ORDER_BOOK_BIDS,
  OrderBookDepthChart,
  type OrderBookCumulativeLevel,
  type OrderBookLevel,
  type OrderBookSideMap,
} from './index';

describe('OrderBookDepthChart', () => {
  it('renders realistic default 8x8 order book depth, mid-price, spread, summary strip, inspector, forwards ref, and uses semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    const sideCheck: OrderBookSideMap = { bid: true, ask: true };
    expect(sideCheck.bid && sideCheck.ask).toBe(true);
    expect(DEFAULT_ORDER_BOOK_BIDS).toHaveLength(8);
    expect(DEFAULT_ORDER_BOOK_ASKS).toHaveLength(8);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            OrderBookDepthChart: {
              className: 'theme-order-book',
              style: { maxWidth: '680px' },
            },
          },
        }}
      >
        <OrderBookDepthChart
          ref={ref}
          className="consumer-order-book"
          xstyle={{ '--prism-blur-px': '18px' }}
          style={{ borderRadius: '20px' }}
          data-testid="ob-chart"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('ob-chart');
    expect(ref.current).toBe(root);
    expect(OrderBookDepthChart.displayName).toBe('OrderBookDepthChart');
    expect(root).toHaveClass(
      'refractor-order-book-depth-chart',
      'prism-slab',
      'theme-order-book',
      'consumer-order-book'
    );
    expect(root).toHaveStyle({ maxWidth: '680px', borderRadius: '20px' });
    expect(root).toHaveAttribute('data-has-bids', 'true');
    expect(root).toHaveAttribute('data-has-asks', 'true');
    expect(root).toHaveAttribute('data-selected-side', 'bid');
    expect(root).not.toHaveAttribute('data-empty');

    expect(
      screen.getByRole('heading', { name: 'Order Book Market Depth' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('order-book-symbol')).toHaveTextContent('RFR / USD');
    expect(screen.getByTestId('order-book-mid-price')).toHaveTextContent('Mid-Price$500.00');
    expect(screen.getByTestId('order-book-spread')).toHaveTextContent('Spread$0.40 · 0.08%');

    const svg = screen.getByTestId('order-book-depth-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 460 200');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    expect(screen.getByTestId('order-book-bid-curve')).toHaveAttribute(
      'stroke',
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('order-book-ask-curve')).toHaveAttribute(
      'stroke',
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('order-book-mid-axis')).toHaveAttribute(
      'stroke-dasharray',
      '4 3'
    );

    expect(screen.getByTestId('order-book-total-bid')).toHaveTextContent('248');
    expect(screen.getByTestId('order-book-total-ask')).toHaveTextContent('224');
    expect(screen.getByTestId('order-book-imbalance')).toHaveTextContent('+5.1% · Bid Heavy');

    const inspector = screen.getByTestId('order-book-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveClass('prism-well');
    expect(screen.getByTestId('order-book-inspector-side')).toHaveTextContent('Bid');
    expect(screen.getByTestId('order-book-inspector-price')).toHaveTextContent('Price$499.80');
    expect(screen.getByTestId('order-book-inspector-size')).toHaveTextContent('Level Size12.4');
    expect(screen.getByTestId('order-book-inspector-cumulative')).toHaveTextContent(
      'Cumulative Wall12.4'
    );
  });

  it('auto-sorts bids descending and asks ascending, aggregates duplicate prices, sanitizes invalid entries, and computes exact cumulative walls', () => {
    const onSelectLevel = vi.fn<(level: OrderBookCumulativeLevel) => void>();
    const unsortedBids: OrderBookLevel[] = [
      { price: 98, size: 20 },
      { price: 100, size: 5 },
      { price: 100, size: 7.5 },
      { price: 99, size: 10 },
      { price: Number.NaN, size: 50 },
      { price: 97, size: 0 },
      { price: -10, size: 15 },
      { price: 96, size: Number.POSITIVE_INFINITY },
    ];
    const unsortedAsks: OrderBookLevel[] = [
      { price: 103, size: 30 },
      { price: 101, size: 8 },
      { price: 102, size: 12 },
      { price: 101, size: 2 },
      { price: 105, size: -4 },
    ];

    render(
      <OrderBookDepthChart
        title="Sorted Liquidity"
        symbol="SOL / EUR"
        currencyPrefix="€"
        bids={unsortedBids}
        asks={unsortedAsks}
        onSelectLevel={onSelectLevel}
      />
    );

    // Best bid = 100 (aggregated 12.5), best ask = 101 (aggregated 10) -> mid = 100.50, spread = 1.00 (1.00%)
    expect(screen.getByTestId('order-book-mid-price')).toHaveTextContent('Mid-Price€100.50');
    expect(screen.getByTestId('order-book-spread')).toHaveTextContent('Spread€1.00 · 1.00%');
    expect(screen.getByTestId('order-book-total-bid')).toHaveTextContent('42.5');
    expect(screen.getByTestId('order-book-total-ask')).toHaveTextContent('52');
    expect(screen.getByTestId('order-book-imbalance')).toHaveTextContent('-10.1% · Ask Heavy');

    // Verify 3 bid markers (100, 99, 98) and 3 ask markers (101, 102, 103)
    const deepestBid = screen.getByTestId('order-book-marker-bid-2');
    expect(deepestBid).toHaveAttribute('data-price', '98');
    fireEvent.click(deepestBid);
    expect(onSelectLevel).toHaveBeenCalledWith({
      side: 'bid',
      price: 98,
      size: 20,
      cumulative: 42.5,
    });
    expect(screen.getByTestId('order-book-inspector-price')).toHaveTextContent('Price€98.00');
    expect(screen.getByTestId('order-book-inspector-cumulative')).toHaveTextContent(
      'Cumulative Wall42.5'
    );

    const deepestAsk = screen.getByTestId('order-book-marker-ask-2');
    expect(deepestAsk).toHaveAttribute('data-price', '103');
    fireEvent.click(deepestAsk);
    expect(onSelectLevel).toHaveBeenLastCalledWith({
      side: 'ask',
      price: 103,
      size: 30,
      cumulative: 52,
    });
    expect(screen.getByTestId('order-book-inspector-side')).toHaveTextContent('Ask');
    expect(screen.getByTestId('order-book-inspector-cumulative')).toHaveTextContent(
      'Cumulative Wall52'
    );
  });

  it('supports IME-safe keyboard navigation (Enter, Space, ArrowLeft, ArrowRight, Home, End) and clamps at boundaries', () => {
    const onSelectLevel = vi.fn<(level: OrderBookCumulativeLevel) => void>();
    render(
      <OrderBookDepthChart
        bids={[
          { price: 99, size: 10 },
          { price: 98, size: 15 },
        ]}
        asks={[
          { price: 101, size: 12 },
          { price: 102, size: 18 },
        ]}
        onSelectLevel={onSelectLevel}
      />
    );

    // Visual left-to-right marker order: bid-1 (98), bid-0 (99), ask-0 (101), ask-1 (102)
    const leftmost = screen.getByTestId('order-book-marker-bid-1');
    const bestBid = screen.getByTestId('order-book-marker-bid-0');
    const bestAsk = screen.getByTestId('order-book-marker-ask-0');
    const rightmost = screen.getByTestId('order-book-marker-ask-1');

    // IME composition must be ignored for all keys
    fireEvent.keyDown(bestBid, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(bestBid, { key: 'ArrowRight', isComposing: true });
    expect(onSelectLevel).not.toHaveBeenCalled();

    // Unrelated key ignored
    fireEvent.keyDown(bestBid, { key: 'Escape' });
    expect(onSelectLevel).not.toHaveBeenCalled();

    // Enter selects focused marker
    fireEvent.keyDown(bestBid, { key: 'Enter' });
    expect(onSelectLevel).toHaveBeenLastCalledWith({
      side: 'bid',
      price: 99,
      size: 10,
      cumulative: 10,
    });

    // Space activates bestAsk
    fireEvent.keyDown(bestAsk, { key: ' ' });
    expect(onSelectLevel).toHaveBeenLastCalledWith({
      side: 'ask',
      price: 101,
      size: 12,
      cumulative: 12,
    });

    // ArrowRight from bestAsk moves to rightmost (ask-1) and shifts focus
    fireEvent.keyDown(bestAsk, { key: 'ArrowRight' });
    expect(onSelectLevel).toHaveBeenLastCalledWith({
      side: 'ask',
      price: 102,
      size: 18,
      cumulative: 30,
    });
    expect(document.activeElement).toBe(rightmost);

    // ArrowRight at rightmost boundary is a safe no-op
    const callsBeforeRightClamp = onSelectLevel.mock.calls.length;
    fireEvent.keyDown(rightmost, { key: 'ArrowRight' });
    expect(onSelectLevel).toHaveBeenCalledTimes(callsBeforeRightClamp);

    // ArrowLeft from rightmost moves back to bestAsk
    fireEvent.keyDown(rightmost, { key: 'ArrowLeft' });
    expect(onSelectLevel).toHaveBeenLastCalledWith({
      side: 'ask',
      price: 101,
      size: 12,
      cumulative: 12,
    });
    expect(document.activeElement).toBe(bestAsk);

    // Home jumps to leftmost (bid-1)
    fireEvent.keyDown(bestAsk, { key: 'Home' });
    expect(onSelectLevel).toHaveBeenLastCalledWith({
      side: 'bid',
      price: 98,
      size: 15,
      cumulative: 25,
    });
    expect(document.activeElement).toBe(leftmost);

    // ArrowLeft at leftmost boundary is a safe no-op
    const callsBeforeLeftClamp = onSelectLevel.mock.calls.length;
    fireEvent.keyDown(leftmost, { key: 'ArrowLeft' });
    expect(onSelectLevel).toHaveBeenCalledTimes(callsBeforeLeftClamp);

    // End jumps to rightmost (ask-1)
    fireEvent.keyDown(leftmost, { key: 'End' });
    expect(onSelectLevel).toHaveBeenLastCalledWith({
      side: 'ask',
      price: 102,
      size: 18,
      cumulative: 30,
    });
    expect(document.activeElement).toBe(rightmost);
  });

  it('handles one-sided books, balanced imbalance, sub-cent precision, zero/crossed prices, and dynamic prop updates', () => {
    // 1. Single-level bids-only book (domainHalfSpan === 0)
    const { rerender } = render(
      <OrderBookDepthChart
        bids={[{ price: 0.0045, size: 0.0025 }]}
        asks={[]}
        data-testid="edge-ob"
      />
    );

    expect(screen.getByTestId('edge-ob')).toHaveAttribute('data-has-bids', 'true');
    expect(screen.getByTestId('edge-ob')).not.toHaveAttribute('data-has-asks');
    expect(screen.getByTestId('order-book-mid-price')).toHaveTextContent('Mid-Price$0.0045');
    expect(screen.getByTestId('order-book-spread')).toHaveTextContent('Spread—');
    expect(screen.getByTestId('order-book-total-bid')).toHaveTextContent('0.0025');
    expect(screen.getByTestId('order-book-total-ask')).toHaveTextContent('0');
    expect(screen.getByTestId('order-book-imbalance')).toHaveTextContent('+100.0% · Bid Heavy');
    expect(screen.getByTestId('order-book-bid-layer')).toBeInTheDocument();
    expect(screen.queryByTestId('order-book-ask-layer')).toBeNull();
    expect(screen.getByTestId('order-book-depth-svg').innerHTML).not.toContain('NaN');

    // Click without onSelectLevel handler
    fireEvent.click(screen.getByTestId('order-book-marker-bid-0'));
    expect(screen.getByTestId('order-book-inspector-price')).toHaveTextContent('Price$0.0045');

    // 2. Single-level asks-only book (selected bid key disappears -> cleanly falls back to default ask marker)
    rerender(
      <OrderBookDepthChart
        bids={[]}
        asks={[{ price: 250, size: 40 }]}
        data-testid="edge-ob"
      />
    );

    expect(screen.getByTestId('edge-ob')).not.toHaveAttribute('data-has-bids');
    expect(screen.getByTestId('edge-ob')).toHaveAttribute('data-has-asks', 'true');
    expect(screen.getByTestId('order-book-mid-price')).toHaveTextContent('Mid-Price$250.00');
    expect(screen.getByTestId('order-book-spread')).toHaveTextContent('Spread—');
    expect(screen.getByTestId('order-book-imbalance')).toHaveTextContent('-100.0% · Ask Heavy');
    expect(screen.queryByTestId('order-book-bid-layer')).toBeNull();
    expect(screen.getByTestId('order-book-ask-layer')).toBeInTheDocument();
    expect(screen.getByTestId('order-book-inspector-side')).toHaveTextContent('Ask');
    expect(screen.getByTestId('order-book-inspector-price')).toHaveTextContent('Price$250.00');

    // 3. Balanced book with zero mid-price (midPrice === 0 branch)
    rerender(
      <OrderBookDepthChart
        bids={[{ price: 0, size: 10 }]}
        asks={[{ price: 0, size: 10 }]}
        data-testid="edge-ob"
      />
    );
    expect(screen.getByTestId('order-book-mid-price')).toHaveTextContent('Mid-Price$0.00');
    expect(screen.getByTestId('order-book-spread')).toHaveTextContent('Spread$0.00 · 0.00%');
    expect(screen.getByTestId('order-book-imbalance')).toHaveTextContent('0.0% · Balanced');

    // 4. Crossed book (negative spread formatting)
    rerender(
      <OrderBookDepthChart
        bids={[{ price: 101, size: 10 }]}
        asks={[{ price: 100, size: 10 }]}
        data-testid="edge-ob"
      />
    );
    expect(screen.getByTestId('order-book-spread')).toHaveTextContent('Spread-$1.00 · -1.00%');
    expect(screen.getByTestId('order-book-depth-svg').innerHTML).not.toContain('NaN');
  });

  it('renders a clean role="status" empty state for empty or all-invalid books and safely escapes XSS strings', () => {
    const { rerender } = render(
      <OrderBookDepthChart bids={[]} asks={[]} data-testid="empty-ob" />
    );

    expect(screen.getByTestId('empty-ob')).toHaveAttribute('data-empty', 'true');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No order book depth available');
    expect(screen.queryByTestId('order-book-depth-svg')).toBeNull();
    expect(screen.queryByTestId('order-book-mid-price')).toBeNull();
    expect(screen.queryByTestId('order-book-spread')).toBeNull();
    expect(screen.queryByTestId('order-book-summary')).toBeNull();
    expect(screen.queryByTestId('order-book-inspector')).toBeNull();

    // All-invalid levels also yield clean empty state
    rerender(
      <OrderBookDepthChart
        bids={[{ price: Number.NaN, size: 5 }]}
        asks={[{ price: 100, size: 0 }]}
        data-testid="empty-ob"
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('No order book depth available');

    // XSS payload in title, symbol, and currencyPrefix renders purely as escaped text
    const payload = '<script>window.__obXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <OrderBookDepthChart
        title={payload}
        symbol={payload}
        currencyPrefix={payload}
        bids={[{ price: 50, size: 5 }]}
        asks={[{ price: 51, size: 5 }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(screen.getByTestId('order-book-symbol')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
