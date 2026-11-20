import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { RangeSlider } from './RangeSlider';

describe('RangeSlider', () => {
  it('renders label, unit readout, track fill percentage, stable class, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();

    render(
      <RangeSlider
        ref={ref}
        label="Backdrop Blur"
        min={0}
        max={40}
        step={2}
        value={20}
        unit="px"
        className="custom-slider"
        data-testid="slider-root"
        onChange={onChange}
      />
    );

    const root = screen.getByTestId('slider-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-range-slider', 'w-full', 'custom-slider');
    expect(screen.getByText('20px')).toBeInTheDocument();

    const input = screen.getByRole('slider', { name: 'Backdrop Blur' });
    expect(input).toHaveValue('20');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '40');
    expect(input).toHaveAttribute('step', '2');

    const fill = root.querySelector('.prism-emerald');
    expect(fill).toHaveStyle({ width: '50%' });

    fireEvent.change(input, { target: { value: '30' } });
    expect(onChange).toHaveBeenCalledWith(30);
  });

  it('applies theme overrides and xstyle without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { RangeSlider: { className: 'theme-slider', style: { maxWidth: '320px' } } },
        }}
      >
        <RangeSlider
          label="Dispersion"
          value={50}
          className="local-slider"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="themed-slider"
          onChange={vi.fn()}
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('themed-slider');
    expect(root).toHaveClass('refractor-range-slider', 'theme-slider', 'local-slider');
    expect(root).toHaveStyle({ maxWidth: '320px' });
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('guards against max === min, inverted bounds, NaN/Infinity inputs, and non-positive step (adversarial)', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RangeSlider
        label="Flat Bounds"
        min={50}
        max={50}
        step={0}
        value={50}
        data-testid="edge-slider"
        onChange={onChange}
      />
    );

    const root = screen.getByTestId('edge-slider');
    const fill = root.querySelector('.prism-emerald');
    expect(fill).toHaveStyle({ width: '0%' });
    expect(screen.getByRole('slider')).toHaveAttribute('step', '1');

    rerender(
      <RangeSlider
        label="NaN Guard"
        min={Number.NaN}
        max={Number.POSITIVE_INFINITY}
        step={-5}
        value={Number.NaN}
        data-testid="edge-slider"
        onChange={onChange}
      />
    );
    expect(screen.getByRole('slider')).toHaveValue('0');
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(fill).toHaveStyle({ width: '0%' });

    rerender(
      <RangeSlider
        label="Inverted Bounds"
        min={100}
        max={0}
        value={250}
        data-testid="edge-slider"
        onChange={onChange}
      />
    );
    expect(screen.getByRole('slider')).toHaveValue('100');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('blocks changes when disabled (negative test)', () => {
    const onChange = vi.fn();
    render(
      <RangeSlider
        label="Locked Slider"
        value={40}
        disabled
        data-testid="disabled-slider"
        onChange={onChange}
      />
    );

    const root = screen.getByTestId('disabled-slider');
    expect(root).toHaveAttribute('data-disabled', 'true');
    const input = screen.getByRole('slider', { name: 'Locked Slider' });
    expect(input).toBeDisabled();

    fireEvent.change(input, { target: { value: '80' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS payloads in label and unit', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<RangeSlider label={payload} unit={payload} value={10} onChange={vi.fn()} />);

    expect(screen.getByRole('slider', { name: payload })).toBeInTheDocument();
    expect(screen.getByText(`10${payload}`)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
