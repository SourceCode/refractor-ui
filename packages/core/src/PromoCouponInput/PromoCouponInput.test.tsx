import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { PromoCouponInput, type AppliedCoupon } from './index';

describe('PromoCouponInput', () => {
  it('renders recessed input bar, applies trimmed uppercase coupon via button click, and removes emerald pill', () => {
    const ref = createRef<HTMLDivElement>();
    const onApply = vi.fn<(code: string) => AppliedCoupon | string | null>((code) =>
      code === 'PRISM20'
        ? { code: 'PRISM20', label: '20% off license', discountText: '-$24.00' }
        : null
    );
    const onRemove = vi.fn<(code: string) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            PromoCouponInput: { className: 'theme-promo', style: { maxWidth: '420px' } },
          },
        }}
      >
        <PromoCouponInput
          ref={ref}
          onApply={onApply}
          onRemove={onRemove}
          className="local-promo"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="promo-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('promo-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-promo-coupon-input', 'prism-slab', 'theme-promo', 'local-promo');
    expect(root).toHaveStyle({ maxWidth: '420px' });
    expect(root).not.toHaveAttribute('data-applied');
    expect(root).not.toHaveAttribute('data-invalid');

    const input = screen.getByRole('textbox', { name: 'Promo code' });
    expect(input).toHaveAttribute('placeholder', 'Enter promo code (e.g. PRISM20)');

    fireEvent.change(input, { target: { value: '  prism20  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith('PRISM20');
    expect(input).toHaveValue('');
    expect(root).toHaveAttribute('data-applied', 'true');

    const pill = screen.getByTestId('promo-applied-coupon');
    expect(pill).toHaveClass('prism-emerald');
    expect(pill).toHaveTextContent('PRISM20');
    expect(pill).toHaveTextContent('20% off license');
    expect(screen.getByTestId('promo-discount-text')).toHaveTextContent('-$24.00');

    fireEvent.click(screen.getByRole('button', { name: 'Remove promo code PRISM20' }));
    expect(onRemove).toHaveBeenCalledWith('PRISM20');
    expect(screen.queryByTestId('promo-applied-coupon')).not.toBeInTheDocument();
    expect(root).not.toHaveAttribute('data-applied');
  });

  it('submits on Enter when not composing, ignores IME composition Enter, and ignores whitespace-only input', () => {
    const onApply = vi.fn<(code: string) => AppliedCoupon | string | null>((code) => ({
      code,
      label: 'Welcome savings',
    }));

    render(<PromoCouponInput onApply={onApply} placeholder="Voucher code" />);

    const input = screen.getByRole('textbox', { name: 'Promo code' });
    expect(input).toHaveAttribute('placeholder', 'Voucher code');

    // Whitespace-only submit via click and Enter is ignored
    fireEvent.change(input, { target: { value: '    ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onApply).not.toHaveBeenCalled();

    // IME composing Enter must be ignored
    fireEvent.change(input, { target: { value: 'save10' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onApply).not.toHaveBeenCalled();

    // Normal Enter submits trimmed uppercase code
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onApply).toHaveBeenCalledWith('SAVE10');
    expect(screen.getByTestId('promo-applied-coupon')).toHaveTextContent('SAVE10');
    expect(screen.queryByTestId('promo-discount-text')).not.toBeInTheDocument();
  });

  it('displays custom string errors, blank-string fallback, and null fallback as role="alert", clearing on edit (negative test)', () => {
    const onApply = vi.fn<(code: string) => AppliedCoupon | string | null>((code) => {
      if (code === 'EXPIRED') return 'Promo code expired on Jan 1.';
      if (code === 'BLANK') return '   ';
      return null;
    });

    render(<PromoCouponInput onApply={onApply} data-testid="promo-errors" />);
    const input = screen.getByRole('textbox', { name: 'Promo code' });
    const applyBtn = screen.getByRole('button', { name: 'Apply' });

    fireEvent.change(input, { target: { value: 'expired' } });
    fireEvent.click(applyBtn);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Promo code expired on Jan 1.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', alert.id);
    expect(screen.getByTestId('promo-errors')).toHaveAttribute('data-invalid', 'true');

    // Editing clears error state
    fireEvent.change(input, { target: { value: 'badcode' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Null return shows default invalid message
    fireEvent.click(applyBtn);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid promo code.');

    // Blank string return also falls back cleanly
    fireEvent.change(input, { target: { value: 'blank' } });
    fireEvent.click(applyBtn);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid promo code.');
  });

  it('supports controlled appliedCoupon state and defaultAppliedCoupon', () => {
    function ControlledPromoHarness() {
      const [coupon, setCoupon] = useState<AppliedCoupon | null>({
        code: 'EARLYBIRD',
        label: 'Launch discount',
        discountText: '-$15.00',
      });

      return (
        <PromoCouponInput
          appliedCoupon={coupon}
          onApply={(code) => {
            const next: AppliedCoupon = { code, label: 'Replaced code', discountText: '-$30.00' };
            setCoupon(next);
            return next;
          }}
          onRemove={() => setCoupon(null)}
        />
      );
    }

    render(<ControlledPromoHarness />);
    expect(screen.getByTestId('promo-applied-coupon')).toHaveTextContent('EARLYBIRD');

    fireEvent.click(screen.getByRole('button', { name: 'Remove promo code EARLYBIRD' }));
    expect(screen.queryByTestId('promo-applied-coupon')).not.toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: 'Promo code' });
    fireEvent.change(input, { target: { value: 'vip30' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('promo-applied-coupon')).toHaveTextContent('VIP30');
    expect(screen.getByTestId('promo-discount-text')).toHaveTextContent('-$30.00');
  });

  it('disables input, Apply button, and Remove button when disabled is true (negative test)', () => {
    const onApply = vi.fn<(code: string) => AppliedCoupon | string | null>(() => null);
    const onRemove = vi.fn();

    render(
      <PromoCouponInput
        disabled
        defaultAppliedCoupon={{ code: 'LOCKED', label: 'Locked savings' }}
        onApply={onApply}
        onRemove={onRemove}
        data-testid="disabled-promo"
      />
    );

    const root = screen.getByTestId('disabled-promo');
    expect(root).toHaveAttribute('data-disabled', 'true');
    const input = screen.getByRole('textbox', { name: 'Promo code' });
    const applyBtn = screen.getByRole('button', { name: 'Apply' });
    const removeBtn = screen.getByRole('button', { name: 'Remove promo code LOCKED' });

    expect(input).toBeDisabled();
    expect(applyBtn).toBeDisabled();
    expect(removeBtn).toBeDisabled();

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(applyBtn);
    fireEvent.click(removeBtn);

    expect(onApply).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS payloads in applied coupon metadata and error alerts as literal text', () => {
    const payload = '<script>window.__promoXss=1</script><img src=x onerror=alert(1)>';
    const onApply = vi.fn<(code: string) => AppliedCoupon | string | null>(() => payload);

    render(
      <PromoCouponInput
        defaultAppliedCoupon={{
          code: 'SAFE',
          label: payload,
          discountText: payload,
        }}
        onApply={onApply}
      />
    );

    const input = screen.getByRole('textbox', { name: 'Promo code' });
    fireEvent.change(input, { target: { value: 'trigger' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(payload);
    expect(screen.getAllByText(payload)).toHaveLength(3);
  });
});
