import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { MultiSelectCombobox, type ComboboxOption } from './MultiSelectCombobox';

const SAMPLE_OPTIONS: ComboboxOption[] = [
  { value: 'crystal', label: 'Crystal Glass', category: 'Surface' },
  { value: 'emerald', label: 'Emerald Accent', category: 'Color' },
  { value: 'slab', label: 'Optical Slab', category: 'Surface' },
  { value: 'legacy', label: 'Legacy Flat', category: 'Deprecated', disabled: true },
];

describe('MultiSelectCombobox', () => {
  it('renders label, defaultValue pills, ref/className/xstyle passthrough, and selects/removes tokens in uncontrolled mode', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();

    render(
      <MultiSelectCombobox
        ref={ref}
        label="Optical Materials"
        options={SAMPLE_OPTIONS}
        defaultValue={['crystal', 'crystal', '  ']}
        onChange={onChange}
        className="custom-combobox"
        xstyle={{ '--prism-blur-px': '14px' }}
        data-testid="combo-root"
      />
    );

    const root = screen.getByTestId('combo-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-multi-select-combobox', 'custom-combobox');
    expect(root).toHaveAttribute('data-has-selection', 'true');
    expect(screen.getByText('Optical Materials')).toBeInTheDocument();
    expect(screen.getByText('Crystal Glass')).toBeInTheDocument();

    const input = screen.getByRole('combobox', { name: 'Optical Materials' });
    expect(input).toHaveAttribute('aria-expanded', 'false');

    // Open by clicking the recessed well (focuses input and opens listbox)
    fireEvent.click(root.querySelector('.prism-well') as Element);
    expect(document.activeElement).toBe(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox', { name: 'Optical Materials' });
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);

    // Filter by category
    fireEvent.change(input, { target: { value: 'Color' } });
    expect(screen.getByRole('option', { name: /Emerald Accent/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Crystal Glass/ })).not.toBeInTheDocument();

    // Select option via mouse click (and mousedown does not blur/close)
    const emeraldOption = screen.getByRole('option', { name: /Emerald Accent/ });
    fireEvent.mouseDown(emeraldOption);
    fireEvent.click(emeraldOption);
    expect(onChange).toHaveBeenLastCalledWith(['crystal', 'emerald']);

    // Clicking already selected option toggles it off
    fireEvent.click(screen.getByRole('option', { name: /Crystal Glass/ }));
    expect(onChange).toHaveBeenLastCalledWith(['emerald']);

    // Remove token via pill × button
    fireEvent.click(screen.getByRole('button', { name: 'Remove Emerald Accent' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(root).not.toHaveAttribute('data-has-selection');
  });

  it('supports controlled mode, keyboard navigation (Arrows, IME-safe Enter, Backspace, Escape), and outside click', () => {
    const onChange = vi.fn();

    function ControlledHarness() {
      const [selected, setSelected] = useState<string[]>(['crystal']);
      return (
        <PrismThemeProvider
          theme={{
            components: {
              MultiSelectCombobox: { className: 'theme-combo', style: { maxWidth: '480px' } },
            },
          }}
        >
          <div data-testid="outside">Outside area</div>
          <MultiSelectCombobox
            options={SAMPLE_OPTIONS}
            value={selected}
            onChange={(next) => {
              onChange(next);
              setSelected(next);
            }}
            aria-label="Material picker"
            className="local-combo"
            data-testid="controlled-combo"
          />
        </PrismThemeProvider>
      );
    }

    render(<ControlledHarness />);

    const root = screen.getByTestId('controlled-combo');
    expect(root).toHaveClass('refractor-multi-select-combobox', 'theme-combo', 'local-combo');
    expect(root).toHaveStyle({ maxWidth: '480px' });

    const input = screen.getByRole('combobox', { name: 'Material picker' });

    // ArrowDown when closed opens dropdown and highlights first option
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const firstOpt = screen.getByRole('option', { name: /Crystal Glass/ });
    expect(input).toHaveAttribute('aria-activedescendant', firstOpt.id);

    // ArrowDown advances to second option; ArrowUp moves back
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const secondOpt = screen.getByRole('option', { name: /Emerald Accent/ });
    expect(input).toHaveAttribute('aria-activedescendant', secondOpt.id);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveAttribute('aria-activedescendant', firstOpt.id);

    // Mouse enter highlights third option
    const thirdOpt = screen.getByRole('option', { name: /Optical Slab/ });
    fireEvent.mouseEnter(thirdOpt);
    expect(thirdOpt).toHaveAttribute('data-highlighted', 'true');

    // IME composing Enter MUST NOT select or toggle
    const composingEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(input, composingEnter);
    expect(onChange).not.toHaveBeenCalled();

    // Normal Enter selects highlighted third option
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['crystal', 'slab']);

    // Backspace on empty query removes the last token ('slab')
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(onChange).toHaveBeenLastCalledWith(['crystal']);

    // Escape closes dropdown
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // ArrowUp when closed opens dropdown at the last candidate
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const lastOpt = screen.getByRole('option', { name: /Legacy Flat/ });
    expect(input).toHaveAttribute('aria-activedescendant', lastOpt.id);

    // Enter on disabled option is blocked
    const callCountBeforeDisabled = onChange.mock.calls.length;
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(callCountBeforeDisabled);

    // Clicking inside does NOT close; clicking outside closes
    fireEvent.mouseDown(root);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Chevron button toggles dropdown open and closed
    fireEvent.click(screen.getByRole('button', { name: 'Open options' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports creatable mode: trims whitespace, deduplicates tokens, ignores empty tokens, and creates via click or Enter', () => {
    const onChange = vi.fn();
    render(
      <MultiSelectCombobox
        options={SAMPLE_OPTIONS}
        creatable
        onChange={onChange}
        placeholder="Type or create..."
      />
    );

    const input = screen.getByRole('combobox', { name: 'Type or create...' });
    fireEvent.focus(input);

    // Whitespace-only query does NOT show Create option or add a token
    fireEvent.change(input, { target: { value: '    ' } });
    expect(screen.queryByRole('option', { name: /Create/ })).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();

    // Create custom trimmed token via Enter
    fireEvent.change(input, { target: { value: '  Prism Haze  ' } });
    const createOpt = screen.getByRole('option', { name: /Create "Prism Haze"/ });
    expect(createOpt).toBeInTheDocument();
    fireEvent.mouseEnter(createOpt);
    fireEvent.mouseDown(createOpt);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['Prism Haze']);
    expect(screen.getByText('Prism Haze')).toBeInTheDocument();

    // Exact duplicate (case-insensitive) does not offer Create option
    fireEvent.change(input, { target: { value: 'prism haze' } });
    expect(screen.queryByRole('option', { name: /Create/ })).not.toBeInTheDocument();
    expect(screen.getByText('No matching options')).toBeInTheDocument();

    // Create another custom token by clicking Create row
    fireEvent.change(input, { target: { value: 'Aurora' } });
    fireEvent.click(screen.getByRole('option', { name: /Create "Aurora"/ }));
    expect(onChange).toHaveBeenLastCalledWith(['Prism Haze', 'Aurora']);

    // Create custom token via Enter even when dropdown was closed by Escape
    fireEvent.change(input, { target: { value: 'Caustic' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['Prism Haze', 'Aurora', 'Caustic']);
  });

  it('enforces maxSelected cap, blocks disabled options, and handles non-finite/negative maxSelected safely', () => {
    const onChange = vi.fn();
    render(
      <MultiSelectCombobox
        options={SAMPLE_OPTIONS}
        defaultValue={['crystal', 'emerald', 'slab']}
        maxSelected={2}
        creatable
        onChange={onChange}
      />
    );

    // Initial defaultValue clamped to 2 tokens
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('Crystal Glass')).toBeInTheDocument();
    expect(screen.getByText('Emerald Accent')).toBeInTheDocument();
    expect(screen.queryByText('Optical Slab')).not.toBeInTheDocument();

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(screen.getByText('Maximum of 2 items selected')).toBeInTheDocument();

    // Unselected option is disabled when at maxSelected (both click and keyboard Enter blocked)
    const slabOpt = screen.getByRole('option', { name: /Optical Slab/ });
    expect(slabOpt).toBeDisabled();
    fireEvent.click(slabOpt);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', slabOpt.id);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();

    // Creatable option is also disabled when at maxSelected
    fireEvent.change(input, { target: { value: 'BrandNew' } });
    const createOpt = screen.getByRole('option', { name: /Create "BrandNew"/ });
    expect(createOpt).toBeDisabled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();

    // Arrow keys and Backspace while query is non-empty with zero candidates stay safe
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Backspace' });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();

    // Reopen and remove one token to re-enable selecting another
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Emerald Accent' }));
    expect(onChange).toHaveBeenLastCalledWith(['crystal']);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    const enabledSlabOpt = screen.getByRole('option', { name: /Optical Slab/ });
    expect(enabledSlabOpt).not.toBeDisabled();
    fireEvent.click(enabledSlabOpt);
    expect(onChange).toHaveBeenLastCalledWith(['crystal', 'slab']);

    // Non-finite maxSelected falls back to uncapped
    render(
      <MultiSelectCombobox
        options={SAMPLE_OPTIONS}
        maxSelected={Number.NaN}
        aria-label="Uncapped combobox"
      />
    );
    expect(screen.getByRole('combobox', { name: 'Uncapped combobox' })).toBeInTheDocument();
  });

  it('blocks all interactions when disabled (negative test)', () => {
    const onChange = vi.fn();
    render(
      <MultiSelectCombobox
        options={SAMPLE_OPTIONS}
        defaultValue={['crystal']}
        disabled
        onChange={onChange}
        data-testid="disabled-combo"
      />
    );

    const root = screen.getByTestId('disabled-combo');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const input = screen.getByRole('combobox');
    expect(input).toBeDisabled();

    // Clicking recessed well or focusing or pressing keys does not open or mutate
    fireEvent.click(root.querySelector('.prism-well') as Element);
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    const removeBtn = within(root).getByRole('button', { name: 'Remove Crystal Glass' });
    expect(removeBtn).toBeDisabled();
    fireEvent.click(removeBtn);

    const toggleBtn = within(root).getByRole('button', { name: 'Open options' });
    expect(toggleBtn).toBeDisabled();
    fireEvent.click(toggleBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('handles duplicate options, prototype-pollution keys, empty options, and adversarial XSS payloads safely', () => {
    const xss = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const onChange = vi.fn();

    render(
      <MultiSelectCombobox
        options={[
          { value: '__proto__', label: '__proto__' },
          { value: 'constructor', label: 'constructor' },
          { value: 'xss', label: xss },
          { value: 'xss', label: 'Duplicate ignored' },
        ]}
        creatable
        onChange={onChange}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);

    fireEvent.click(screen.getByRole('option', { name: '__proto__' }));
    fireEvent.click(screen.getByRole('option', { name: 'constructor' }));
    fireEvent.click(screen.getByRole('option', { name: xss }));

    expect(onChange).toHaveBeenLastCalledWith(['__proto__', 'constructor', 'xss']);
    expect(document.querySelector('script')).toBeNull();
    expect(({} as Record<string, string>).polluted).toBeUndefined();

    // Matching by value string works
    fireEvent.change(input, { target: { value: 'constructor' } });
    expect(screen.getByRole('option', { name: 'constructor' })).toBeInTheDocument();
  });
});
