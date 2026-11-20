import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { TagChip } from './TagChip';

describe('TagChip', () => {
  it('renders selectable and dismissible chip, toggles selected visual state, and forwards ref', () => {
    const ref = createRef<HTMLSpanElement>();
    const onSelect = vi.fn();
    const onDismiss = vi.fn();

    render(
      <TagChip
        ref={ref}
        label="Refractive CSS"
        selected
        onSelect={onSelect}
        onDismiss={onDismiss}
        className="custom-chip"
        data-testid="chip"
      />
    );

    const chip = screen.getByTestId('chip');
    expect(ref.current).toBe(chip);
    expect(chip).toHaveClass('refractor-tag-chip', 'prism-emerald', 'pr-2', 'custom-chip');
    expect(chip).toHaveAttribute('data-selected', 'true');
    expect(chip).toHaveAttribute('data-selectable', 'true');
    expect(chip).toHaveAttribute('data-dismissible', 'true');

    const selectBtn = screen.getByRole('button', { name: 'Refractive CSS' });
    expect(selectBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(selectBtn);
    expect(onSelect).toHaveBeenCalledTimes(1);

    const dismissBtn = screen.getByRole('button', { name: 'Remove Refractive CSS filter' });
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders static unselected chip without interactive buttons and applies theme overrides (negative test)', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { TagChip: { className: 'theme-chip', style: { opacity: '0.9' } } },
        }}
      >
        <TagChip label="Read Only" className="local-chip" data-testid="static-chip" />
      </PrismThemeProvider>
    );

    const chip = screen.getByTestId('static-chip');
    expect(chip).toHaveClass('refractor-tag-chip', 'prism-crystal', 'pr-3.5', 'theme-chip', 'local-chip');
    expect(chip).toHaveStyle({ opacity: '0.9' });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Read Only')).toBeInTheDocument();
  });

  it('safely renders adversarial XSS payloads in label as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<TagChip label={payload} onDismiss={vi.fn()} />);
    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Remove ${payload} filter` })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
