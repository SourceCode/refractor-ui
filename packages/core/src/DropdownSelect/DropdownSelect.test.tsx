import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { DropdownSelect, type SelectOption } from './DropdownSelect';

const OPTIONS: SelectOption[] = [
  { value: 'alabaster', label: 'Alabaster Glass' },
  { value: 'obsidian', label: 'Obsidian Night' },
  { value: 'locked', label: 'Enterprise Vault', disabled: true },
];

describe('DropdownSelect', () => {
  it('opens listbox, selects an option, reflects selected state, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();

    render(
      <DropdownSelect
        ref={ref}
        label="Theme preset"
        options={OPTIONS}
        value="alabaster"
        onChange={onChange}
        className="custom-select"
        xstyle={{ '--prism-blur-px': '18px' }}
        data-testid="select-root"
      />
    );

    const root = screen.getByTestId('select-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-dropdown-select', 'custom-select');
    expect(root).not.toHaveAttribute('data-open');

    const trigger = screen.getByRole('button', { name: 'Theme preset' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('Alabaster Glass');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const selectedOpt = screen.getByRole('option', { name: 'Alabaster Glass' });
    expect(selectedOpt).toHaveAttribute('aria-selected', 'true');

    // Disabled option cannot be selected
    const lockedOpt = screen.getByRole('option', { name: 'Enterprise Vault' });
    expect(lockedOpt).toBeDisabled();
    fireEvent.click(lockedOpt);
    expect(onChange).not.toHaveBeenCalled();

    // Selecting enabled option calls onChange and closes listbox
    fireEvent.click(screen.getByRole('option', { name: 'Obsidian Night' }));
    expect(onChange).toHaveBeenCalledWith('obsidian');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows placeholder when unmatched, closes on Escape and outside click, and supports theme overrides', () => {
    const onKeyDown = vi.fn();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            DropdownSelect: { className: 'theme-select', style: { minWidth: '240px' } },
          },
        }}
      >
        <div data-testid="outside">Outside</div>
        <DropdownSelect
          options={OPTIONS}
          value="unknown-value"
          onChange={vi.fn()}
          placeholder="Choose material"
          onKeyDown={onKeyDown}
          className="local-select"
          data-testid="themed-select"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('themed-select');
    expect(root).toHaveClass('refractor-dropdown-select', 'theme-select', 'local-select');
    expect(root).toHaveStyle({ minWidth: '240px' });

    const trigger = screen.getByRole('button', { name: 'Choose material' });
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Non-Escape key keeps menu open; Escape closes it
    fireEvent.keyDown(root, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Reopen, mousedown inside keeps open, mousedown outside closes
    fireEvent.click(trigger);
    fireEvent.mouseDown(root);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('blocks opening when disabled or when options is empty (negative/adversarial)', () => {
    render(
      <>
        <DropdownSelect
          label="Disabled select"
          options={OPTIONS}
          value="alabaster"
          onChange={vi.fn()}
          disabled
          data-testid="disabled-select"
        />
        <DropdownSelect
          label="Empty select"
          options={[]}
          value=""
          onChange={vi.fn()}
        />
      </>
    );

    expect(screen.getByTestId('disabled-select')).toHaveAttribute('data-disabled', 'true');
    const disabledTrigger = screen.getByRole('button', { name: 'Disabled select' });
    expect(disabledTrigger).toBeDisabled();
    fireEvent.click(disabledTrigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    const emptyTrigger = screen.getByRole('button', { name: 'Empty select' });
    expect(emptyTrigger).toBeDisabled();
    expect(emptyTrigger).toHaveTextContent('Select');
    fireEvent.click(emptyTrigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('safely renders adversarial XSS strings in label, placeholder, and options', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <DropdownSelect
        label={payload}
        options={[{ value: 'xss', label: payload }]}
        value=""
        placeholder={payload}
        onChange={vi.fn()}
      />
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent(payload);
    fireEvent.click(trigger);
    expect(screen.getByRole('option')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });

  it('omits the C-ring loader by default and renders it only when loading={true}', () => {
    const { rerender } = render(
      <DropdownSelect
        label="Async Role"
        options={OPTIONS}
        value="alabaster"
        onChange={vi.fn()}
        data-testid="async-select"
      />
    );

    const root = screen.getByTestId('async-select');
    const trigger = screen.getByRole('button', { name: 'Async Role' });
    expect(screen.queryByTestId('dropdown-select-loader')).not.toBeInTheDocument();
    expect(root).not.toHaveAttribute('data-loading');
    expect(trigger).not.toHaveAttribute('aria-busy');

    rerender(
      <DropdownSelect
        label="Async Role"
        options={OPTIONS}
        value="alabaster"
        onChange={vi.fn()}
        loading
        data-testid="async-select"
      />
    );

    const loader = screen.getByTestId('dropdown-select-loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass('animate-spin', 'motion-reduce:animate-none');
    expect(root).toHaveAttribute('data-loading', 'true');
    expect(trigger).toHaveAttribute('aria-busy', 'true');
    expect(trigger).toBeDisabled();
  });
});
