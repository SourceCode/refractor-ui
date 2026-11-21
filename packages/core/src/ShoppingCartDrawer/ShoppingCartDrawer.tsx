'use client';

import { useCallback, useEffect, useId, useMemo } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type ShoppingCartMode = 'drawer' | 'inline';

export interface CartLineItem {
  /** Unique line item identifier. */
  id: string;
  /** Product display title rendered as literal text. */
  name: string;
  /** Optional product variant label (e.g. size, finish, plan tier). */
  variant?: string;
  /** Unit price per item (sanitized to >= 0). */
  unitPrice: number;
  /** Quantity currently in cart (sanitized to non-negative integer). */
  quantity: number;
  /** Optional maximum purchasable quantity for this line item. */
  maxQuantity?: number;
  /** Optional product thumbnail URL (validated via sanitizeUrl allowing safe raster data URIs). */
  thumbnailSrc?: string;
}

export interface CartCheckoutSummary {
  /** Sum of sanitized line totals before discount and tax. */
  subtotal: number;
  /** Applied non-negative discount clamped to subtotal. */
  discount: number;
  /** Estimated tax calculated on post-discount subtotal using clamped taxRate (0..0.5). */
  tax: number;
  /** Final non-negative order total (subtotal - discount + tax). */
  total: number;
  /** Snapshot of sanitized line items included in checkout. */
  items: CartLineItem[];
}

export interface ShoppingCartDrawerProps extends BaseProps<HTMLDivElement> {
  /** Controlled list of line items in the cart. */
  items?: ReadonlyArray<CartLineItem>;
  /** Initial line items when used in uncontrolled mode. */
  defaultItems?: ReadonlyArray<CartLineItem>;
  /** Callback fired whenever line item quantities change or an item is removed. */
  onItemsChange?: (next: CartLineItem[]) => void;
  /** Controlled open visibility when mode is 'drawer'. */
  open?: boolean;
  /** Initial open visibility for uncontrolled drawer mode (defaults to true). */
  defaultOpen?: boolean;
  /** Callback invoked when drawer visibility changes (Escape, backdrop click, or close button). */
  onOpenChange?: (open: boolean) => void;
  /** Presentation mode: right-anchored overlay 'drawer' or embedded 'inline' card (defaults to 'drawer'). */
  mode?: ShoppingCartMode;
  /** Fixed monetary discount deducted from subtotal before tax (defaults to 0). */
  discountAmount?: number;
  /** Estimated tax rate as a decimal fraction, clamped safely to 0..0.5 (defaults to 0). */
  taxRate?: number;
  /** Currency prefix rendered before formatted amounts (defaults to '$'). */
  currencySymbol?: string;
  /** Callback fired when the Checkout CTA is clicked with the computed summary. */
  onCheckout?: (summary: CartCheckoutSummary) => void;
  /** Heading rendered at the top of the cart panel (defaults to 'Shopping Cart'). */
  title?: string;
}

const EMPTY_ITEMS: ReadonlyArray<CartLineItem> = [];

function sanitizeNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function getSafeMaxQuantity(maxQuantity: number | undefined): number | undefined {
  if (maxQuantity === undefined || !Number.isFinite(maxQuantity)) {
    return undefined;
  }
  return Math.max(0, Math.floor(maxQuantity));
}

function sanitizeQuantity(quantity: number, safeMax: number | undefined): number {
  const base = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
  if (safeMax !== undefined) {
    return Math.min(base, safeMax);
  }
  return base;
}

function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function formatMoney(amount: number, currencySymbol: string): string {
  return `${currencySymbol}${amount.toFixed(2)}`;
}

export function ShoppingCartDrawer({
  items,
  defaultItems = EMPTY_ITEMS,
  onItemsChange,
  open,
  defaultOpen = true,
  onOpenChange,
  mode = 'drawer',
  discountAmount = 0,
  taxRate = 0,
  currencySymbol = '$',
  onCheckout,
  title = 'Shopping Cart',
  onClick,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ShoppingCartDrawerProps) {
  const titleId = useId();
  const override = useComponentOverride('ShoppingCartDrawer');

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const handleItemsChange = useCallback(
    (next: ReadonlyArray<CartLineItem>) => {
      onItemsChange?.(next.map((item) => ({ ...item })));
    },
    [onItemsChange]
  );

  const [rawItems, setCartItems] = useControllableState<ReadonlyArray<CartLineItem>>({
    value: items,
    defaultValue: defaultItems,
    onChange: handleItemsChange,
  });

  useEffect(() => {
    if (mode !== 'drawer' || !isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isOpen, setIsOpen]);

  const sanitizedItems = useMemo<CartLineItem[]>(
    () =>
      rawItems.map((item) => {
        const safeMax = getSafeMaxQuantity(item.maxQuantity);
        return {
          id: item.id,
          name: item.name,
          unitPrice: sanitizeNonNegative(item.unitPrice),
          quantity: sanitizeQuantity(item.quantity, safeMax),
          ...(item.variant !== undefined ? { variant: item.variant } : {}),
          ...(safeMax !== undefined ? { maxQuantity: safeMax } : {}),
          ...(item.thumbnailSrc !== undefined ? { thumbnailSrc: item.thumbnailSrc } : {}),
        };
      }),
    [rawItems]
  );

  const safeTaxRate = clampNumber(taxRate, 0, 0.5, 0);

  const summary = useMemo<CartCheckoutSummary>(() => {
    const subtotal = roundCurrency(
      sanitizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    );
    const discount = roundCurrency(Math.min(subtotal, sanitizeNonNegative(discountAmount)));
    const taxableBase = Math.max(0, subtotal - discount);
    const tax = roundCurrency(taxableBase * safeTaxRate);
    const total = roundCurrency(Math.max(0, taxableBase + tax));
    return {
      subtotal,
      discount,
      tax,
      total,
      items: sanitizedItems,
    };
  }, [sanitizedItems, discountAmount, safeTaxRate]);

  if (mode === 'drawer' && !isOpen) {
    return null;
  }

  const isEmpty = sanitizedItems.length === 0;
  const totalItemCount = sanitizedItems.reduce((sum, item) => sum + item.quantity, 0);
  const itemUnit = totalItemCount === 1 ? 'item' : 'items';
  const taxPercentLabel = Math.round(safeTaxRate * 10000) / 100;

  const handleDecrement = (targetId: string) => {
    const next: CartLineItem[] = [];
    for (const item of sanitizedItems) {
      if (item.id !== targetId) {
        next.push(item);
        continue;
      }
      if (item.quantity > 1) {
        next.push({ ...item, quantity: item.quantity - 1 });
      }
    }
    setCartItems(next);
  };

  const handleIncrement = (targetId: string) => {
    const next = sanitizedItems.map((item) => {
      if (item.id !== targetId) return item;
      const nextQty =
        item.maxQuantity !== undefined
          ? Math.min(item.maxQuantity, item.quantity + 1)
          : item.quantity + 1;
      return { ...item, quantity: nextQty };
    });
    setCartItems(next);
  };

  const handleRemove = (targetId: string) => {
    setCartItems(sanitizedItems.filter((item) => item.id !== targetId));
  };

  const merged = mergeProps({
    themeTarget: themeProps('shopping-cart-drawer', {
      open: mode === 'drawer' ? isOpen : true,
      mode,
      empty: isEmpty,
    }),
    baseClassName:
      mode === 'drawer'
        ? 'fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-xs flex justify-end'
        : 'prism-slab w-full flex flex-col overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const panelContent = (
    <>
      <div
        className="px-5 py-4 flex items-center justify-between gap-3 border-b"
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex items-center gap-2">
            <h2
              id={titleId}
              className="text-base font-semibold truncate"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {title}
            </h2>
            <span
              data-testid="cart-item-count"
              className="prism-well px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {totalItemCount} {itemUnit}
            </span>
          </div>
        </div>

        {mode === 'drawer' ? (
          <button
            type="button"
            aria-label="Close shopping cart"
            onClick={() => setIsOpen(false)}
            className="prism-focus-ring rounded-lg p-1.5 cursor-pointer enabled:hover:opacity-100 opacity-75 transition-opacity"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        {isEmpty ? (
          <div
            data-testid="cart-empty-state"
            className="prism-well rounded-2xl px-5 py-10 text-center flex flex-col items-center gap-2"
          >
            <ShoppingBag
              className="w-7 h-7 opacity-60"
              aria-hidden="true"
              style={{ color: 'var(--prism-text-secondary)' }}
            />
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              Your cart is empty
            </p>
            <p className="text-xs" style={{ color: 'var(--prism-text-secondary)' }}>
              Add items to review totals and proceed to checkout.
            </p>
          </div>
        ) : (
          <ul aria-label="Cart items" className="space-y-3">
            {sanitizedItems.map((item) => {
              const safeThumbnail = item.thumbnailSrc ? sanitizeUrl(item.thumbnailSrc, true) : '';
              const lineTotal = roundCurrency(item.unitPrice * item.quantity);
              const isAtMax =
                item.maxQuantity !== undefined && item.quantity >= item.maxQuantity;

              return (
                <li
                  key={item.id}
                  data-item-id={item.id}
                  className="prism-crystal rounded-2xl p-3 flex items-start gap-3"
                >
                  <div className="prism-well w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                    {safeThumbnail ? (
                      <img
                        src={safeThumbnail}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag
                        className="w-5 h-5 opacity-60"
                        aria-hidden="true"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold leading-snug break-words"
                          style={{ color: 'var(--prism-text-primary)' }}
                        >
                          {item.name}
                        </p>
                        {item.variant ? (
                          <p
                            className="text-xs break-words"
                            style={{ color: 'var(--prism-text-secondary)' }}
                          >
                            {item.variant}
                          </p>
                        ) : null}
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          data-testid={`cart-line-total-${item.id}`}
                          className="text-sm font-semibold tabular-nums"
                          style={{ color: 'var(--prism-text-primary)' }}
                        >
                          {formatMoney(lineTotal, currencySymbol)}
                        </p>
                        <p
                          data-testid={`cart-unit-price-${item.id}`}
                          className="text-[11px] tabular-nums"
                          style={{ color: 'var(--prism-text-secondary)' }}
                        >
                          {formatMoney(item.unitPrice, currencySymbol)} each
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="prism-well rounded-full inline-flex items-center p-0.5 gap-1">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${item.name}`}
                          onClick={() => handleDecrement(item.id)}
                          className="prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer enabled:hover:brightness-105 transition-all"
                          style={{ color: 'var(--prism-text-primary)' }}
                        >
                          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <span
                          data-testid={`cart-qty-${item.id}`}
                          aria-live="polite"
                          className="min-w-6 text-center text-xs font-semibold tabular-nums"
                          style={{ color: 'var(--prism-text-primary)' }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isAtMax}
                          aria-label={`Increase quantity of ${item.name}`}
                          onClick={() => handleIncrement(item.id)}
                          className="prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
                          style={{ color: 'var(--prism-text-primary)' }}
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => handleRemove(item.id)}
                        className="prism-focus-ring rounded-lg p-1.5 inline-flex items-center justify-center cursor-pointer opacity-75 enabled:hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--prism-error-main)' }}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div
        className="p-5 space-y-4 border-t"
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        <dl className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt style={{ color: 'var(--prism-text-secondary)' }}>Subtotal</dt>
            <dd
              data-testid="cart-subtotal"
              className="font-medium tabular-nums"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {formatMoney(summary.subtotal, currencySymbol)}
            </dd>
          </div>

          {summary.discount > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <dt style={{ color: 'var(--prism-text-secondary)' }}>Discount</dt>
              <dd
                data-testid="cart-discount"
                className="font-semibold tabular-nums"
                style={{ color: 'var(--prism-success-dark)' }}
              >
                -{formatMoney(summary.discount, currencySymbol)}
              </dd>
            </div>
          ) : null}

          {safeTaxRate > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <dt style={{ color: 'var(--prism-text-secondary)' }}>
                Estimated Tax ({taxPercentLabel}%)
              </dt>
              <dd
                data-testid="cart-tax"
                className="font-medium tabular-nums"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {formatMoney(summary.tax, currencySymbol)}
              </dd>
            </div>
          ) : null}

          <div
            className="pt-2 mt-2 border-t flex items-center justify-between gap-2"
            style={{ borderColor: 'var(--prism-divider)' }}
          >
            <dt className="font-semibold" style={{ color: 'var(--prism-text-primary)' }}>
              Total
            </dt>
            <dd
              data-testid="cart-total"
              className="text-base font-bold tabular-nums"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {formatMoney(summary.total, currencySymbol)}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          disabled={isEmpty}
          onClick={() => onCheckout?.(summary)}
          className="prism-btn-primary prism-focus-ring w-full h-11 px-5 inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-[-0.01em] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            <span>Checkout</span>
            {!isEmpty ? (
              <span className="tabular-nums">
                ({formatMoney(summary.total, currencySymbol)})
              </span>
            ) : null}
          </span>
        </button>
      </div>
    </>
  );

  if (mode === 'inline') {
    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        onClick={onClick}
        {...rest}
        {...merged}
      >
        {panelContent}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={composeEventHandlers(onClick, () => setIsOpen(false))}
      {...rest}
      {...merged}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="prism-slab ml-auto h-full w-full max-w-md rounded-l-[28px] rounded-r-none flex flex-col overflow-hidden"
      >
        {panelContent}
      </div>
    </div>
  );
}

ShoppingCartDrawer.displayName = 'ShoppingCartDrawer';
