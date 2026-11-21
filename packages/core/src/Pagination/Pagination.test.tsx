import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders page controls, active page, prev/next actions, and forwards ref/className', () => {
    const ref = createRef<HTMLElement>();
    const onPageChange = vi.fn();

    render(
      <Pagination
        ref={ref}
        currentPage={2}
        totalPages={4}
        onPageChange={onPageChange}
        className="custom-pager"
        data-testid="pager"
      />
    );

    const nav = screen.getByTestId('pager');
    expect(ref.current).toBe(nav);
    expect(nav).toHaveClass('refractor-pagination', 'custom-pager');
    expect(nav).toHaveAttribute('data-page', '2');
    expect(nav).toHaveAttribute('data-total', '4');

    const page2 = screen.getByRole('button', { name: 'Page 2' });
    expect(page2).toHaveAttribute('aria-current', 'page');
    expect(page2).toHaveClass('prism-btn-primary');

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole('button', { name: 'Page 4' }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('disables Previous on page 1 and Next on final page, and applies theme overrides', () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: { Pagination: { className: 'theme-pager', style: { padding: '2px' } } },
        }}
      >
        <Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} className="local-pager" />
      </PrismThemeProvider>
    );

    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav).toHaveClass('refractor-pagination', 'theme-pager', 'local-pager');
    expect(nav).toHaveStyle({ padding: '2px' });

    const prev = screen.getByRole('button', { name: 'Previous page' });
    expect(prev).toBeDisabled();
    fireEvent.click(prev);
    expect(onPageChange).not.toHaveBeenCalled();

    rerender(
      <PrismThemeProvider>
        <Pagination currentPage={3} totalPages={3} onPageChange={onPageChange} />
      </PrismThemeProvider>
    );

    const next = screen.getByRole('button', { name: 'Next page' });
    expect(next).toBeDisabled();
    fireEvent.click(next);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('clamps out-of-range and non-finite currentPage/totalPages safely (adversarial)', () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination currentPage={-10} totalPages={3} onPageChange={onPageChange} data-testid="adv" />
    );

    expect(screen.getByTestId('adv')).toHaveAttribute('data-page', '1');
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();

    rerender(
      <Pagination currentPage={999} totalPages={3} onPageChange={onPageChange} data-testid="adv" />
    );
    expect(screen.getByTestId('adv')).toHaveAttribute('data-page', '3');
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();

    rerender(
      <Pagination currentPage={Number.NaN} totalPages={3} onPageChange={onPageChange} data-testid="adv" />
    );
    expect(screen.getByTestId('adv')).toHaveAttribute('data-page', '1');

    rerender(
      <Pagination currentPage={1} totalPages={0} onPageChange={onPageChange} data-testid="adv" />
    );
    expect(screen.getByTestId('adv')).toHaveAttribute('data-total', '0');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Page 1' })).toBeNull();

    rerender(
      <Pagination currentPage={1} totalPages={-5} onPageChange={onPageChange} data-testid="adv" />
    );
    expect(screen.getByTestId('adv')).toHaveAttribute('data-total', '0');
  });
});
