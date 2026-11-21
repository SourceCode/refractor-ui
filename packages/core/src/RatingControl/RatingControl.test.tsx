import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { RatingControl } from './RatingControl';

describe('RatingControl', () => {
  it('renders stars, hover preview, tabular readout, stable class, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();

    render(
      <RatingControl
        ref={ref}
        value={3}
        max={5}
        onChange={onChange}
        className="custom-rating"
        data-testid="rating-root"
      />
    );

    const root = screen.getByTestId('rating-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-rating-control', 'inline-flex', 'custom-rating');
    expect(root).toHaveAttribute('data-value', '3');
    expect(root).toHaveAttribute('data-max', '5');
    expect(screen.getByText('Optical Clarity Score')).toBeInTheDocument();
    expect(screen.getByText('3.0 / 5')).toBeInTheDocument();

    const star5 = screen.getByRole('button', { name: 'Rate 5 out of 5 stars' });
    expect(star5).toHaveAttribute('aria-pressed', 'false');

    fireEvent.mouseEnter(star5);
    expect(star5.querySelector('svg')).toHaveClass('fill-amber-400');

    fireEvent.mouseLeave(star5);
    expect(star5.querySelector('svg')).not.toHaveClass('fill-amber-400');

    const star4 = screen.getByRole('button', { name: 'Rate 4 out of 5 stars' });
    fireEvent.click(star4);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('supports fractional scores, empty label, and theme overrides without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { RatingControl: { className: 'theme-rating', style: { padding: '2px' } } },
        }}
      >
        <RatingControl
          value={3.5}
          label=""
          className="local-rating"
          data-testid="themed-rating"
          onChange={vi.fn()}
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('themed-rating');
    expect(root).toHaveClass('refractor-rating-control', 'theme-rating', 'local-rating');
    expect(root).toHaveStyle({ padding: '2px' });
    expect(screen.getByRole('group', { name: 'Rating' })).toBeInTheDocument();
    expect(screen.getByText('3.5 / 5')).toBeInTheDocument();
  });

  it('guards NaN and out-of-range value/max inputs (adversarial)', () => {
    render(
      <RatingControl
        value={Number.NaN}
        max={Number.NaN}
        data-testid="nan-rating"
        onChange={vi.fn()}
      />
    );

    const root = screen.getByTestId('nan-rating');
    expect(root).toHaveAttribute('data-value', '0');
    expect(root).toHaveAttribute('data-max', '5');
    expect(screen.getByText('0.0 / 5')).toBeInTheDocument();
  });

  it('blocks interactions and hover previews when disabled (negative test)', () => {
    const onChange = vi.fn();
    render(
      <RatingControl
        value={2}
        disabled
        data-testid="disabled-rating"
        onChange={onChange}
      />
    );

    const root = screen.getByTestId('disabled-rating');
    expect(root).toHaveAttribute('data-disabled', 'true');
    const star4 = screen.getByRole('button', { name: 'Rate 4 out of 5 stars' });
    expect(star4).toBeDisabled();

    fireEvent.mouseEnter(star4);
    expect(star4.querySelector('svg')).not.toHaveClass('fill-amber-400');

    fireEvent.click(star4);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS label strings as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<RatingControl value={4} label={payload} onChange={vi.fn()} />);

    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
