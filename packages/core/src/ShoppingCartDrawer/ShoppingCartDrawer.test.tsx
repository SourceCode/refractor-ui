import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ShoppingCartDrawer,
  type CartCheckoutSummary,
  type CartLineItem,
} from './index';

const SAMPLE_ITEMS: readonly CartLineItem[] = [
  {
    id: 'prism-kit',
    name: 'Refractor Glass Kit',
    variant: 'Pro License',
    unitPrice: 49.5,
    quantity: 2,
    maxQuantity: 3,
    thumbnailSrc: 'https://cdn.example.com/kit.png',
  },
  {
    id: 'optics-pack',
    name: 'Caustic Icon Pack',
    unitPrice: 19,
    quantity: 1,
    thumbnailSrc: 'data:image/png;base64,iVBORw0KGgo=',
  },
];

describe('ShoppingCartDrawer', () => {
  it('renders open drawer by default with items, thumbnails, totals, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const onCheckout = vi.fn<(summary: CartCheckoutSummary) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ShoppingCartDrawer: { className: 'theme-cart', style: { zIndex: 70 } },
          },
        }}
      >
        <ShoppingCartDrawer
          ref={ref}
          defaultItems={SAMPLE_ITEMS}
          discountAmount={18}
          taxRate={0.1}
          currencySymbol="€"
          title="Order Bag"
          onCheckout={onCheckout}
          className="local-cart"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="cart-drawer"
        />
      </PrismThemeProvider>
    );

    const dialog = screen.getByTestId('cart-drawer');
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveClass('refractor-shopping-cart-drawer', 'theme-cart', 'local-cart');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(dialog).toHaveAttribute('data-mode', 'drawer');
    expect(dialog).not.toHaveAttribute('data-empty');
    expect(dialog).toHaveStyle({ zIndex: 70 });
    expect(screen.getByRole('dialog', { name: 'Order Bag' })).toBe(dialog);
    expect(screen.getByTestId('cart-item-count')).toHaveTextContent('3 items');

    const kitImg = screen.getByRole('img', { name: 'Refractor Glass Kit' });
    expect(kitImg).toHaveAttribute('src', 'https://cdn.example.com/kit.png');
    const packImg = screen.getByRole('img', { name: 'Caustic Icon Pack' });
    expect(packImg).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgo=');
    expect(screen.getByText('Pro License')).toBeInTheDocument();

    expect(screen.getByTestId('cart-line-total-prism-kit')).toHaveTextContent('€99.00');
    expect(screen.getByTestId('cart-unit-price-prism-kit')).toHaveTextContent('€49.50 each');
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('€118.00');
    expect(screen.getByTestId('cart-discount')).toHaveTextContent('-€18.00');
    expect(screen.getByText('Estimated Tax (10%)')).toBeInTheDocument();
    expect(screen.getByTestId('cart-tax')).toHaveTextContent('€10.00');
    expect(screen.getByTestId('cart-total')).toHaveTextContent('€110.00');

    fireEvent.click(screen.getByRole('button', { name: /Checkout/ }));
    expect(onCheckout).toHaveBeenCalledTimes(1);
    const checkoutSummary = onCheckout.mock.calls[0]?.[0];
    expect(checkoutSummary).toEqual({
      subtotal: 118,
      discount: 18,
      tax: 10,
      total: 110,
      items: [
        {
          id: 'prism-kit',
          name: 'Refractor Glass Kit',
          variant: 'Pro License',
          unitPrice: 49.5,
          quantity: 2,
          maxQuantity: 3,
          thumbnailSrc: 'https://cdn.example.com/kit.png',
        },
        {
          id: 'optics-pack',
          name: 'Caustic Icon Pack',
          unitPrice: 19,
          quantity: 1,
          thumbnailSrc: 'data:image/png;base64,iVBORw0KGgo=',
        },
      ],
    });
  });

  it('returns null when closed in drawer mode and ignores Escape key (negative test)', () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <ShoppingCartDrawer open={false} onOpenChange={onOpenChange} defaultItems={SAMPLE_ITEMS} />
    );

    expect(container.firstChild).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('closes drawer via close button, Escape key, and backdrop click without closing on inner clicks', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ShoppingCartDrawer
        open
        onOpenChange={onOpenChange}
        defaultItems={SAMPLE_ITEMS}
        data-testid="dismiss-drawer"
      />
    );

    // Inner panel click does not close
    fireEvent.click(screen.getByText('Refractor Glass Kit'));
    expect(onOpenChange).not.toHaveBeenCalled();

    // Non-Escape key and composing Escape do not close
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(onOpenChange).not.toHaveBeenCalled();

    // Close icon button
    fireEvent.click(screen.getByRole('button', { name: 'Close shopping cart' }));
    expect(onOpenChange).toHaveBeenNthCalledWith(1, false);

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false);

    // Backdrop click
    fireEvent.click(screen.getByTestId('dismiss-drawer'));
    expect(onOpenChange).toHaveBeenNthCalledWith(3, false);

    // Uncontrolled close hides drawer
    rerender(<ShoppingCartDrawer defaultOpen defaultItems={SAMPLE_ITEMS} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports uncontrolled increment (respecting maxQuantity), decrement (removing at 1), and Trash2 remove', () => {
    const onItemsChange = vi.fn<(next: CartLineItem[]) => void>();

    render(
      <ShoppingCartDrawer
        mode="inline"
        defaultItems={SAMPLE_ITEMS}
        onItemsChange={onItemsChange}
        data-testid="inline-cart"
      />
    );

    const region = screen.getByRole('region', { name: 'Shopping Cart' });
    expect(region).toBe(screen.getByTestId('inline-cart'));
    expect(region).toHaveClass('prism-slab', 'refractor-shopping-cart-drawer');
    expect(region).toHaveAttribute('data-mode', 'inline');
    expect(screen.queryByRole('button', { name: 'Close shopping cart' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('cart-discount')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cart-tax')).not.toBeInTheDocument();

    // Increment prism-kit from 2 -> 3 (hits maxQuantity=3)
    const incKit = screen.getByRole('button', { name: 'Increase quantity of Refractor Glass Kit' });
    expect(incKit).not.toBeDisabled();
    fireEvent.click(incKit);
    expect(screen.getByTestId('cart-qty-prism-kit')).toHaveTextContent('3');
    expect(incKit).toBeDisabled();

    // Increment optics-pack (no maxQuantity) from 1 -> 2
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity of Caustic Icon Pack' }));
    expect(screen.getByTestId('cart-qty-optics-pack')).toHaveTextContent('2');

    // Decrement prism-kit from 3 -> 2
    fireEvent.click(screen.getByRole('button', { name: 'Decrease quantity of Refractor Glass Kit' }));
    expect(screen.getByTestId('cart-qty-prism-kit')).toHaveTextContent('2');

    // Remove prism-kit via Trash2 button
    fireEvent.click(screen.getByRole('button', { name: 'Remove Refractor Glass Kit' }));
    expect(screen.queryByText('Refractor Glass Kit')).not.toBeInTheDocument();

    // Decrement optics-pack from 2 -> 1 -> removed
    fireEvent.click(screen.getByRole('button', { name: 'Decrease quantity of Caustic Icon Pack' }));
    expect(screen.getByTestId('cart-item-count')).toHaveTextContent('1 item');
    fireEvent.click(screen.getByRole('button', { name: 'Decrease quantity of Caustic Icon Pack' }));

    expect(screen.getByTestId('cart-empty-state')).toHaveTextContent('Your cart is empty');
    expect(screen.getByTestId('inline-cart')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();
    expect(onItemsChange).toHaveBeenLastCalledWith([]);
  });

  it('supports controlled items and controlled open state and renders inline even when open is false', () => {
    function ControlledCartHarness() {
      const [cartItems, setCartItems] = useState<CartLineItem[]>([
        { id: 'c1', name: 'Prism Theme Bundle', unitPrice: 25, quantity: 1 },
      ]);
      return (
        <ShoppingCartDrawer
          mode="inline"
          open={false}
          items={cartItems}
          onItemsChange={setCartItems}
        />
      );
    }

    render(<ControlledCartHarness />);
    expect(screen.getByRole('region', { name: 'Shopping Cart' })).toBeInTheDocument();
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('$25.00');

    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity of Prism Theme Bundle' }));
    expect(screen.getByTestId('cart-qty-c1')).toHaveTextContent('2');
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('$50.00');
  });

  it('sanitizes NaN, Infinity, negative prices/quantities/discounts and clamps taxRate to 0..0.5 (negative test)', () => {
    const brokenItems: readonly CartLineItem[] = [
      {
        id: 'neg',
        name: 'Negative Price Item',
        unitPrice: -50,
        quantity: -3,
      },
      {
        id: 'nan',
        name: 'NaN Values Item',
        unitPrice: Number.NaN,
        quantity: Number.NaN,
        maxQuantity: Number.NaN,
      },
      {
        id: 'capped',
        name: 'Over Max Item',
        unitPrice: 20,
        quantity: 9,
        maxQuantity: 2,
      },
    ];

    render(
      <ShoppingCartDrawer
        mode="inline"
        defaultItems={brokenItems}
        discountAmount={999}
        taxRate={0.95}
      />
    );

    expect(screen.getByTestId('cart-unit-price-neg')).toHaveTextContent('$0.00 each');
    expect(screen.getByTestId('cart-qty-neg')).toHaveTextContent('0');
    expect(screen.getByTestId('cart-unit-price-nan')).toHaveTextContent('$0.00 each');
    expect(screen.getByTestId('cart-qty-nan')).toHaveTextContent('0');
    expect(screen.getByTestId('cart-qty-capped')).toHaveTextContent('2');
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('$40.00');
    // Discount capped to subtotal so total cannot go negative
    expect(screen.getByTestId('cart-discount')).toHaveTextContent('-$40.00');
    // Tax rate 0.95 clamped to 50% (0.5)
    expect(screen.getByText('Estimated Tax (50%)')).toBeInTheDocument();
    expect(screen.getByTestId('cart-tax')).toHaveTextContent('$0.00');
    expect(screen.getByTestId('cart-total')).toHaveTextContent('$0.00');
  });

  it('strips unsafe thumbnail URLs, renders XSS strings literally, and resists prototype-polluting IDs', () => {
    const payload = '<script>window.__cartXss=1</script><img src=x onerror=alert(1)>';
    const adversarialItems: readonly CartLineItem[] = [
      {
        id: '__proto__',
        name: payload,
        variant: payload,
        unitPrice: 10,
        quantity: 1,
        thumbnailSrc: 'javascript:alert(1)',
      },
      {
        id: 'constructor',
        name: 'SVG Blocked Item',
        unitPrice: 15,
        quantity: 1,
        thumbnailSrc: 'data:image/svg+xml;base64,PHN2Zy8+',
      },
    ];

    render(
      <ShoppingCartDrawer
        mode="inline"
        title={payload}
        defaultItems={adversarialItems}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: payload })).toHaveTextContent(payload);
    expect(screen.getAllByText(payload)).toHaveLength(3);
    expect(({} as Record<string, string>)['__proto__']).not.toBe(payload);
  });
});
