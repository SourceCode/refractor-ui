import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { RadioGroup, type RadioOption } from './RadioGroup';

const OPTIONS: RadioOption[] = [
  { value: 'subtle', label: 'Subtle', description: 'Minimal chromatic dispersion' },
  { value: 'standard', label: 'Standard', description: 'Balanced optical caustics' },
  { value: 'vivid', label: 'Vivid' },
];

describe('RadioGroup', () => {
  it('renders options, descriptions, stable class, data attrs, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();

    render(
      <RadioGroup
        ref={ref}
        name="Refraction Mode"
        options={OPTIONS}
        value="standard"
        onChange={onChange}
        className="custom-radio"
        data-testid="rg"
      />
    );

    const group = screen.getByTestId('rg');
    expect(ref.current).toBe(group);
    expect(group).toHaveAttribute('role', 'radiogroup');
    expect(group).toHaveAttribute('aria-label', 'Refraction Mode');
    expect(group).toHaveClass('refractor-radio-group', 'space-y-2.5', 'custom-radio');
    expect(group).toHaveAttribute('data-orientation', 'vertical');

    const subtle = screen.getByRole('radio', { name: 'Subtle' });
    const standard = screen.getByRole('radio', { name: 'Standard' });
    expect(standard).toHaveAttribute('aria-checked', 'true');
    expect(subtle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Balanced optical caustics')).toBeInTheDocument();

    fireEvent.click(subtle);
    expect(onChange).toHaveBeenCalledWith('subtle');
  });

  it('supports horizontal orientation and theme component overrides without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { RadioGroup: { className: 'theme-rg', style: { gap: '16px' } } },
        }}
      >
        <RadioGroup
          name="Axis"
          options={OPTIONS}
          value="unknown-value"
          orientation="horizontal"
          className="local-rg"
          xstyle={{ '--prism-blur-px': '12px' }}
          onChange={vi.fn()}
        />
      </PrismThemeProvider>
    );

    const group = screen.getByRole('radiogroup', { name: 'Axis' });
    expect(group).toHaveClass('refractor-radio-group', 'flex', 'theme-rg', 'local-rg');
    expect(group).toHaveAttribute('aria-orientation', 'horizontal');
    expect(group).toHaveAttribute('data-orientation', 'horizontal');
    expect(group).toHaveStyle({ gap: '16px' });
    // Falls back tabIndex=0 to first enabled option when value does not match
    expect(screen.getByRole('radio', { name: 'Subtle' })).toHaveAttribute('tabindex', '0');
  });

  it('supports arrow key navigation skipping disabled options and ignores unrelated keys', () => {
    const onChange = vi.fn();
    const opts: RadioOption[] = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta', disabled: true },
      { value: 'c', label: 'Gamma' },
    ];

    render(<RadioGroup name="Letters" options={opts} value="a" onChange={onChange} />);

    const alpha = screen.getByRole('radio', { name: 'Alpha' });
    const beta = screen.getByRole('radio', { name: 'Beta' });
    const gamma = screen.getByRole('radio', { name: 'Gamma' });

    expect(beta).toBeDisabled();
    fireEvent.click(beta);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(alpha, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(alpha, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledWith('c');
    expect(document.activeElement).toBe(gamma);

    fireEvent.keyDown(gamma, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledWith('a');
    expect(document.activeElement).toBe(alpha);

    fireEvent.keyDown(alpha, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('c');

    fireEvent.keyDown(gamma, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('blocks interactions when entire group is disabled (negative test)', () => {
    const onChange = vi.fn();
    render(
      <RadioGroup name="Locked" options={OPTIONS} value="subtle" disabled onChange={onChange} />
    );

    const group = screen.getByRole('radiogroup', { name: 'Locked' });
    expect(group).toHaveAttribute('data-disabled', 'true');
    expect(group).toHaveAttribute('aria-disabled', 'true');

    const subtle = screen.getByRole('radio', { name: 'Subtle' });
    expect(subtle).toBeDisabled();
    fireEvent.click(subtle);
    fireEvent.keyDown(subtle, { key: 'ArrowDown' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS payloads in option labels and descriptions', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <RadioGroup
        name={payload}
        options={[{ value: 'x', label: payload, description: payload }]}
        value="x"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('radiogroup', { name: payload })).toBeInTheDocument();
    expect(screen.getAllByText(payload)).toHaveLength(2);
    expect(document.querySelector('script')).toBeNull();
  });
});
