import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { TriStateCheckbox, type TriCheckboxState } from './index';

describe('TriStateCheckbox', () => {
  it('renders unchecked, indeterminate, and checked states with synced native DOM indeterminate property and forwards React 19 ref', () => {
    const ref = createRef<HTMLLabelElement>();
    const onChange = vi.fn<(next: TriCheckboxState) => void>();

    const { rerender } = render(
      <TriStateCheckbox
        ref={ref}
        state="unchecked"
        onChange={onChange}
        label="Select all filters"
        description="Applies to all optical filter rules"
        className="custom-tri"
        style={{ padding: '4px' }}
        xstyle={{ '--prism-blur-px': '14px' }}
        data-testid="tri-root"
      />
    );

    const root = screen.getByTestId('tri-root');
    const input = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select all filters' });
    const box = screen.getByTestId('tri-state-box');

    expect(TriStateCheckbox.displayName).toBe('TriStateCheckbox');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-tri-state-checkbox', 'cursor-pointer', 'custom-tri');
    expect(root).toHaveAttribute('data-state', 'unchecked');
    expect(root).toHaveStyle({ padding: '4px' });
    expect(screen.getByText('Applies to all optical filter rules')).toBeInTheDocument();

    expect(input.type).toBe('checkbox');
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(false);
    expect(input).toHaveAttribute('aria-checked', 'false');
    expect(input).toHaveAttribute('aria-describedby');
    expect(box).toHaveClass('prism-well');
    expect(box.querySelector('svg')).toBeNull();

    // Clicking unchecked transitions -> checked
    fireEvent.click(input);
    expect(onChange).toHaveBeenCalledWith('checked');

    // Rerender as indeterminate (mixed)
    rerender(
      <TriStateCheckbox
        ref={ref}
        state="indeterminate"
        onChange={onChange}
        label="Select all filters"
        selectedCount={2}
        totalCount={5}
        data-testid="tri-root"
      />
    );

    expect(root).toHaveAttribute('data-state', 'indeterminate');
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(true);
    expect(input).toHaveAttribute('aria-checked', 'mixed');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(box).toHaveClass('prism-crystal');
    expect(box.style.color).toBe('var(--prism-primary-main)');
    expect(box.style.borderColor).toBe('var(--prism-primary-main)');
    expect(box.querySelector('svg')).not.toBeNull();

    const pill = screen.getByTestId('tri-state-count-pill');
    expect(pill).toHaveTextContent('2/5');
    expect(pill).toHaveClass('tabular-nums');
    expect(pill.style.color).toBe('var(--prism-primary-main)');

    // Clicking controlled indeterminate emits 'checked' and preserves DOM indeterminate when parent holds state
    fireEvent.click(input);
    expect(onChange).toHaveBeenLastCalledWith('checked');
    expect(input.indeterminate).toBe(true);

    // Rerender as checked
    rerender(
      <TriStateCheckbox
        ref={ref}
        state="checked"
        onChange={onChange}
        label="Select all filters"
        selectedCount={5}
        totalCount={5}
        data-testid="tri-root"
      />
    );

    expect(root).toHaveAttribute('data-state', 'checked');
    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(false);
    expect(input).toHaveAttribute('aria-checked', 'true');
    expect(box).toHaveClass('prism-emerald');
    expect(box.querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('tri-state-count-pill')).toHaveTextContent('5/5');
    expect(screen.getByTestId('tri-state-count-pill').style.color).toBe('var(--prism-success-main)');

    // Clicking checked transitions -> unchecked
    fireEvent.click(input);
    expect(onChange).toHaveBeenLastCalledWith('unchecked');
  });

  it('supports uncontrolled state transitions from defaultState indeterminate -> checked -> unchecked -> checked', () => {
    const onChange = vi.fn<(next: TriCheckboxState) => void>();

    render(
      <TriStateCheckbox
        defaultState="indeterminate"
        onChange={onChange}
        label="Uncontrolled bulk selector"
        data-testid="uncontrolled-tri"
      />
    );

    const root = screen.getByTestId('uncontrolled-tri');
    const input = screen.getByRole<HTMLInputElement>('checkbox', {
      name: 'Uncontrolled bulk selector',
    });

    expect(root).toHaveAttribute('data-state', 'indeterminate');
    expect(input.indeterminate).toBe(true);
    expect(input.checked).toBe(false);

    // indeterminate -> checked
    fireEvent.click(input);
    expect(onChange).toHaveBeenLastCalledWith('checked');
    expect(root).toHaveAttribute('data-state', 'checked');
    expect(input.indeterminate).toBe(false);
    expect(input.checked).toBe(true);

    // checked -> unchecked
    fireEvent.click(input);
    expect(onChange).toHaveBeenLastCalledWith('unchecked');
    expect(root).toHaveAttribute('data-state', 'unchecked');
    expect(input.indeterminate).toBe(false);
    expect(input.checked).toBe(false);

    // unchecked -> checked
    fireEvent.click(screen.getByText('Uncontrolled bulk selector'));
    expect(onChange).toHaveBeenLastCalledWith('checked');
    expect(root).toHaveAttribute('data-state', 'checked');
    expect(input.checked).toBe(true);
  });

  it('supports controlled interactive harness and theme component overrides without clobbering className', () => {
    function ControlledHarness() {
      const [triState, setTriState] = useState<TriCheckboxState>('indeterminate');
      const selected = triState === 'checked' ? 4 : triState === 'indeterminate' ? 2 : 0;

      return (
        <PrismThemeProvider
          theme={{
            components: {
              TriStateCheckbox: { className: 'theme-tri', style: { gap: '16px' } },
            },
          }}
        >
          <TriStateCheckbox
            state={triState}
            onChange={setTriState}
            label="Permissions group"
            selectedCount={selected}
            totalCount={4}
            className="local-tri"
            data-testid="harness-tri"
          />
        </PrismThemeProvider>
      );
    }

    render(<ControlledHarness />);

    const root = screen.getByTestId('harness-tri');
    const input = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Permissions group' });

    expect(root).toHaveClass('refractor-tri-state-checkbox', 'theme-tri', 'local-tri');
    expect(root).toHaveStyle({ gap: '16px' });
    expect(screen.getByTestId('tri-state-count-pill')).toHaveTextContent('2/4');

    fireEvent.click(input);
    expect(root).toHaveAttribute('data-state', 'checked');
    expect(input.indeterminate).toBe(false);
    expect(screen.getByTestId('tri-state-count-pill')).toHaveTextContent('4/4');

    fireEvent.click(input);
    expect(root).toHaveAttribute('data-state', 'unchecked');
    expect(screen.getByTestId('tri-state-count-pill')).toHaveTextContent('0/4');
    expect(screen.getByTestId('tri-state-count-pill').style.color).toBe(
      'var(--prism-text-secondary)'
    );
  });

  it('blocks toggling when disabled and reflects data-disabled (negative test)', () => {
    const onChange = vi.fn<(next: TriCheckboxState) => void>();

    render(
      <TriStateCheckbox
        defaultState="indeterminate"
        disabled
        onChange={onChange}
        label="Locked parent group"
        data-testid="disabled-tri"
      />
    );

    const root = screen.getByTestId('disabled-tri');
    const input = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Locked parent group' });
    const box = screen.getByTestId('tri-state-box');

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveClass('cursor-not-allowed', 'opacity-50');
    expect(box).toHaveClass('cursor-not-allowed');
    expect(input).toBeDisabled();
    expect(input.indeterminate).toBe(true);

    fireEvent.click(input);
    fireEvent.click(screen.getByText('Locked parent group'));
    fireEvent.change(input, { target: { checked: true } });

    expect(onChange).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-state', 'indeterminate');
  });

  it('sanitizes invalid or out-of-range counts and safely renders adversarial XSS strings', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <TriStateCheckbox
        label={payload}
        description={payload}
        selectedCount={Number.NaN}
        totalCount={5}
      />
    );

    expect(screen.getByRole('checkbox', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByTestId('tri-state-count-pill')).toBeNull();

    // totalCount <= 0 or non-finite hides count pill
    rerender(
      <TriStateCheckbox label="Zero total" selectedCount={0} totalCount={0} />
    );
    expect(screen.queryByTestId('tri-state-count-pill')).toBeNull();

    rerender(
      <TriStateCheckbox
        label="Infinite total"
        selectedCount={3}
        totalCount={Number.POSITIVE_INFINITY}
      />
    );
    expect(screen.queryByTestId('tri-state-count-pill')).toBeNull();

    // Out-of-bounds finite selectedCount is clamped to [0..totalCount]
    rerender(
      <TriStateCheckbox label="Clamped high" selectedCount={99} totalCount={10} />
    );
    expect(screen.getByTestId('tri-state-count-pill')).toHaveTextContent('10/10');

    rerender(
      <TriStateCheckbox label="Clamped low" selectedCount={-5} totalCount={10} />
    );
    expect(screen.getByTestId('tri-state-count-pill')).toHaveTextContent('0/10');
  });
});
