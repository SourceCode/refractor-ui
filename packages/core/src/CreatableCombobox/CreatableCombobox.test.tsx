import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CreatableCombobox, type CreatableOption } from './CreatableCombobox';

const SAMPLE_OPTIONS: CreatableOption[] = [
  { value: 'crystal', label: 'Crystal Glass', group: 'Surface' },
  { value: 'emerald', label: 'Emerald Accent', group: 'Palette' },
  { value: 'optical-slab', label: 'Optical/Slab' },
];

describe('CreatableCombobox', () => {
  it('filters by label, value, and group, selects existing option, and applies ref/className/xstyle/theme override', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CreatableCombobox: { className: 'theme-creatable', style: { maxWidth: '460px' } },
          },
        }}
      >
        <CreatableCombobox
          ref={ref}
          defaultOptions={SAMPLE_OPTIONS}
          defaultValue="crystal"
          onChange={onChange}
          label="Material Token"
          className="local-creatable"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="creatable-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('creatable-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-creatable-combobox', 'theme-creatable', 'local-creatable');
    expect(root).toHaveStyle({ maxWidth: '460px' });
    expect(root).toHaveAttribute('data-has-selection', 'true');

    const input = screen.getByRole('combobox', { name: 'Material Token' }) as HTMLInputElement;
    expect(input.value).toBe('Crystal Glass');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');

    // Clicking recessed well focuses input and opens listbox showing all options
    fireEvent.click(root.querySelector('.prism-well') as Element);
    expect(document.activeElement).toBe(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox', { name: 'Material Token' });
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(screen.getAllByRole('option')).toHaveLength(3);

    // Filter case-insensitively by group
    fireEvent.change(input, { target: { value: 'palette' } });
    const emeraldOpt = screen.getByRole('option', { name: /Emerald Accent/ });
    expect(emeraldOpt).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Crystal Glass/ })).not.toBeInTheDocument();

    // Select option via click (with mouseDown preventDefault)
    fireEvent.mouseDown(emeraldOpt);
    fireEvent.click(emeraldOpt);
    expect(onChange).toHaveBeenLastCalledWith('emerald', SAMPLE_OPTIONS[1]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input.value).toBe('Emerald Accent');

    // Filter by value string
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'optical-slab' } });
    expect(screen.getByRole('option', { name: 'Optical/Slab' })).toBeInTheDocument();
    // Exact value match hides create prompt
    expect(screen.queryByRole('option', { name: /Create/ })).not.toBeInTheDocument();
  });

  it('creates new options via default slug, handles slug collisions & non-ASCII, and supports onCreateOption hook', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CreatableCombobox
        defaultOptions={SAMPLE_OPTIONS}
        createPromptPrefix="Add"
        onChange={onChange}
        label=""
        placeholder="Pick or add..."
      />
    );

    const input = screen.getByRole('combobox', { name: 'Pick or add...' }) as HTMLInputElement;
    fireEvent.focus(input);

    // Whitespace-only query does not render create option
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.queryByRole('option', { name: /\+ Add/ })).not.toBeInTheDocument();

    // Exact label match (case-insensitive) hides create option
    fireEvent.change(input, { target: { value: 'crystal glass' } });
    expect(screen.queryByRole('option', { name: /\+ Add/ })).not.toBeInTheDocument();

    // Novel query renders "+ Add" option at the bottom of listbox
    fireEvent.change(input, { target: { value: '  Solar Prism  ' } });
    const createOpt = screen.getByRole('option', { name: /\+ Add "Solar Prism"/ });
    expect(createOpt).toBeInTheDocument();
    fireEvent.mouseEnter(createOpt);
    fireEvent.mouseDown(createOpt);
    fireEvent.click(createOpt);

    expect(onChange).toHaveBeenLastCalledWith('solar-prism', {
      value: 'solar-prism',
      label: 'Solar Prism',
    });
    expect(input.value).toBe('Solar Prism');

    // Reopening lists newly created option as selected
    fireEvent.focus(input);
    expect(screen.getByRole('option', { name: 'Solar Prism' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // Slug collision: "Optical Slab" collides with existing "optical-slab" -> "optical-slab-2", then "optical-slab-3"
    fireEvent.change(input, { target: { value: 'Optical Slab' } });
    fireEvent.click(screen.getByRole('option', { name: /\+ Add "Optical Slab"/ }));
    expect(onChange).toHaveBeenLastCalledWith('optical-slab-2', {
      value: 'optical-slab-2',
      label: 'Optical Slab',
    });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Optical_Slab' } });
    fireEvent.click(screen.getByRole('option', { name: /\+ Add "Optical_Slab"/ }));
    expect(onChange).toHaveBeenLastCalledWith('optical-slab-3', {
      value: 'optical-slab-3',
      label: 'Optical_Slab',
    });

    // Non-ASCII label falls back to lowercased trimmed label as slug
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '光学ガラス' } });
    fireEvent.click(screen.getByRole('option', { name: /\+ Add "光学ガラス"/ }));
    expect(onChange).toHaveBeenLastCalledWith('光学ガラス', {
      value: '光学ガラス',
      label: '光学ガラス',
    });

    // Custom onCreateOption returning an explicit CreatableOption
    const onCreateOption = vi.fn((label: string): CreatableOption => ({
      value: `custom-${label.toLowerCase()}`,
      label,
      group: 'Custom',
    }));
    rerender(
      <CreatableCombobox
        defaultOptions={SAMPLE_OPTIONS}
        onCreateOption={onCreateOption}
        onChange={onChange}
      />
    );
    const input2 = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.focus(input2);
    fireEvent.change(input2, { target: { value: 'Nebula' } });
    fireEvent.click(screen.getByRole('option', { name: /\+ Create "Nebula"/ }));
    expect(onCreateOption).toHaveBeenCalledWith('Nebula');
    expect(onChange).toHaveBeenLastCalledWith('custom-nebula', {
      value: 'custom-nebula',
      label: 'Nebula',
      group: 'Custom',
    });

    // Creating same custom value again deduplicates createdOptions cleanly
    const returningSame = vi.fn((): CreatableOption => ({
      value: 'custom-nebula',
      label: 'Nebula',
    }));
    rerender(
      <CreatableCombobox
        defaultOptions={SAMPLE_OPTIONS}
        onCreateOption={returningSame}
        onChange={onChange}
      />
    );
    fireEvent.focus(input2);
    fireEvent.change(input2, { target: { value: 'Nebula Two' } });
    fireEvent.click(screen.getByRole('option', { name: /\+ Create "Nebula Two"/ }));
    expect(onChange).toHaveBeenLastCalledWith('custom-nebula', {
      value: 'custom-nebula',
      label: 'Nebula',
    });
  });

  it('supports controlled options & value, keyboard navigation (Arrows, IME-safe Enter, Escape), chevron toggle, and outside click', () => {
    const onChange = vi.fn();

    function ControlledHarness() {
      const [opts, setOpts] = useState<CreatableOption[]>(SAMPLE_OPTIONS);
      const [val, setVal] = useState<string>('');
      return (
        <div>
          <div data-testid="outside">Outside</div>
          <CreatableCombobox
            options={opts}
            value={val}
            onCreateOption={(label) => {
              const created: CreatableOption = {
                value: label.toLowerCase(),
                label,
                group: 'User',
              };
              setOpts((prev) => [...prev, created]);
              return created;
            }}
            onChange={(nextVal, nextOpt) => {
              onChange(nextVal, nextOpt);
              setVal(nextVal);
            }}
            aria-label="Controlled combobox"
            data-testid="controlled-root"
          />
        </div>
      );
    }

    render(<ControlledHarness />);
    const root = screen.getByTestId('controlled-root');
    const input = screen.getByRole('combobox', { name: 'Controlled combobox' });

    // ArrowDown when closed opens listbox at first option
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const firstOpt = screen.getByRole('option', { name: /Crystal Glass/ });
    expect(input).toHaveAttribute('aria-activedescendant', firstOpt.id);

    // ArrowDown moves to second; ArrowUp moves back to first; mouseEnter moves to third
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const secondOpt = screen.getByRole('option', { name: /Emerald Accent/ });
    expect(input).toHaveAttribute('aria-activedescendant', secondOpt.id);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveAttribute('aria-activedescendant', firstOpt.id);
    const thirdOpt = screen.getByRole('option', { name: 'Optical/Slab' });
    fireEvent.mouseEnter(thirdOpt);
    expect(thirdOpt).toHaveAttribute('data-highlighted', 'true');

    // IME composing Enter is ignored
    const composingEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(input, composingEnter);
    expect(onChange).not.toHaveBeenCalled();

    // Enter selects highlighted third option and closes
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('optical-slab', SAMPLE_OPTIONS[2]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Enter while closed does nothing
    const callsBeforeClosedEnter = onChange.mock.calls.length;
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(callsBeforeClosedEnter);

    // ArrowUp when closed opens listbox at last option
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Escape closes listbox; Escape again while closed is a no-op
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });

    // Type novel text and press Enter to create via keyboard
    fireEvent.change(input, { target: { value: 'Quartz' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('quartz', {
      value: 'quartz',
      label: 'Quartz',
      group: 'User',
    });

    // Chevron toggle opens & closes; inside mousedown stays open; outside mousedown closes
    fireEvent.click(screen.getByRole('button', { name: 'Open options' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(root);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('blocks interactions when disabled, handles empty options, duplicates, prototype keys, and XSS safely', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CreatableCombobox
        defaultOptions={SAMPLE_OPTIONS}
        defaultValue="crystal"
        disabled
        onChange={onChange}
        data-testid="disabled-creatable"
      />
    );

    const root = screen.getByTestId('disabled-creatable');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const input = screen.getByRole('combobox');
    expect(input).toBeDisabled();
    fireEvent.click(root.querySelector('.prism-well') as Element);
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('button', { name: 'Open options' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    // Empty options displays empty state and handles ArrowDown/ArrowUp safely with 0 candidates
    rerender(<CreatableCombobox options={[]} onChange={onChange} />);
    const emptyInput = screen.getByRole('combobox');
    fireEvent.focus(emptyInput);
    expect(screen.getByTestId('creatable-combobox-empty')).toHaveTextContent('No matching options');
    fireEvent.keyDown(emptyInput, { key: 'ArrowDown' });
    fireEvent.keyDown(emptyInput, { key: 'ArrowUp' });

    // Duplicates, prototype pollution keys, and XSS payload rendered safely
    const xss = '<script>window.__comboXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <CreatableCombobox
        key="adversarial-combo"
        defaultOptions={[
          { value: '__proto__', label: '__proto__' },
          { value: '__proto__', label: 'Duplicate ignored' },
          { value: 'constructor', label: xss },
        ]}
        onChange={onChange}
      />
    );
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.click(screen.getByRole('option', { name: xss }));
    expect(onChange).toHaveBeenLastCalledWith('constructor', {
      value: 'constructor',
      label: xss,
    });
    expect(document.querySelector('script')).toBeNull();
    expect(({} as Record<string, string>).polluted).toBeUndefined();
  });
});
