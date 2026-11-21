import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SegmentedControl, type SegmentOption } from './SegmentedControl';

const OPTIONS: SegmentOption[] = [
  { value: 'day', label: 'Day', icon: <span data-testid="day-icon">D</span> },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month', disabled: true },
];

describe('SegmentedControl', () => {
  it('renders options, icons, pressed state, stable classes, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();

    render(
      <SegmentedControl
        ref={ref}
        options={OPTIONS}
        value="day"
        onChange={onChange}
        ariaLabel="Time range"
        className="custom-seg"
        style={{ gap: '6px' }}
        xstyle={{ '--prism-blur-px': '14px' }}
        data-testid="seg"
      />
    );

    const group = screen.getByTestId('seg');
    expect(ref.current).toBe(group);
    expect(group).toHaveAttribute('role', 'group');
    expect(group).toHaveAttribute('aria-label', 'Time range');
    expect(group).toHaveClass('refractor-segmented-control', 'prism-crystal', 'custom-seg');
    expect(group).toHaveStyle({ gap: '6px' });

    const dayBtn = screen.getByRole('button', { name: /Day/ });
    const weekBtn = screen.getByRole('button', { name: 'Week' });
    const monthBtn = screen.getByRole('button', { name: 'Month' });

    expect(dayBtn).toHaveAttribute('aria-pressed', 'true');
    expect(dayBtn).toHaveAttribute('data-selected', 'true');
    expect(dayBtn).toHaveClass('refractor-segmented-control__option', 'prism-well');
    expect(screen.getByTestId('day-icon')).toBeInTheDocument();

    expect(weekBtn).toHaveAttribute('aria-pressed', 'false');
    expect(weekBtn).not.toHaveAttribute('data-selected');

    fireEvent.click(weekBtn);
    expect(onChange).toHaveBeenCalledWith('week');

    // Individual disabled option blocks clicks
    expect(monthBtn).toBeDisabled();
    expect(monthBtn).toHaveAttribute('data-disabled', 'true');
    fireEvent.click(monthBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('supports default ariaLabel, aria-label override, and theme component overrides without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: {
            SegmentedControl: { className: 'theme-seg', style: { padding: '6px' } },
          },
        }}
      >
        <SegmentedControl
          options={[{ value: 'a', label: 'Alpha' }]}
          value="a"
          onChange={vi.fn()}
          className="local-seg"
        />
        <SegmentedControl
          options={[{ value: 'b', label: 'Beta' }]}
          value="b"
          onChange={vi.fn()}
          aria-label="Custom group label"
        />
      </PrismThemeProvider>
    );

    const defaultGroup = screen.getByRole('group', { name: 'View selector' });
    expect(defaultGroup).toHaveClass('refractor-segmented-control', 'theme-seg', 'local-seg');
    expect(defaultGroup).toHaveStyle({ padding: '6px' });
    expect(screen.getByRole('group', { name: 'Custom group label' })).toBeInTheDocument();
  });

  it('disables all buttons when disabled prop is true and handles empty options safely (negative/adversarial)', () => {
    const onChange = vi.fn();
    render(
      <>
        <SegmentedControl
          options={OPTIONS}
          value="day"
          onChange={onChange}
          disabled
          data-testid="disabled-seg"
        />
        <SegmentedControl
          options={[]}
          value=""
          onChange={onChange}
          ariaLabel="Empty selector"
        />
      </>
    );

    const disabledGroup = screen.getByTestId('disabled-seg');
    expect(disabledGroup).toHaveAttribute('data-disabled', 'true');
    for (const btn of screen.getAllByRole('button')) {
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
    }
    expect(onChange).not.toHaveBeenCalled();

    const emptyGroup = screen.getByRole('group', { name: 'Empty selector' });
    expect(emptyGroup.children).toHaveLength(0);
  });

  it('safely renders adversarial XSS option labels as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <SegmentedControl
        options={[{ value: 'xss', label: payload }]}
        value="xss"
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('button')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
