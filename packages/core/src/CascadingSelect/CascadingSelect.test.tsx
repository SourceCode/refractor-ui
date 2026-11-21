import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CascadingSelect, type CascadeOptionNode } from './CascadingSelect';

const HIERARCHY_OPTIONS: CascadeOptionNode[] = [
  {
    id: 'na',
    label: 'North America',
    children: [
      {
        id: 'us',
        label: 'United States',
        children: [
          { id: 'sfo', label: 'San Francisco' },
          { id: 'nyc', label: 'New York', disabled: true },
        ],
      },
      {
        id: 'ca',
        label: 'Canada',
        children: [{ id: 'tor', label: 'Toronto' }],
      },
    ],
  },
  {
    id: 'eu',
    label: 'Europe',
    disabled: true,
    children: [{ id: 'de', label: 'Germany' }],
  },
  {
    id: 'remote',
    label: 'Global Edge',
    children: [],
  },
];

describe('CascadingSelect', () => {
  it('drills through columns, commits leaf path + nodes, formats breadcrumb, and clears in uncontrolled mode', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CascadingSelect: { className: 'theme-cascade', style: { maxWidth: '420px' } },
          },
        }}
      >
        <CascadingSelect
          ref={ref}
          options={HIERARCHY_OPTIONS}
          onChange={onChange}
          label="Region"
          className="local-cascade"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="cascade-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('cascade-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-cascading-select', 'theme-cascade', 'local-cascade');
    expect(root).toHaveStyle({ maxWidth: '420px' });

    const trigger = screen.getByRole('button', { name: 'Region' });
    expect(trigger).toHaveClass('prism-crystal');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveTextContent('Select hierarchy...');
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();

    // Open Level 1
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Region' })).toBeInTheDocument();
    expect(screen.getByText('Level 1')).toBeInTheDocument();

    // Expand Level 2 by clicking North America
    fireEvent.click(screen.getByRole('menuitem', { name: 'North America' }));
    expect(screen.getByText('Level 2')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    // Expand Level 3 by clicking United States
    fireEvent.click(screen.getByRole('menuitem', { name: 'United States' }));
    expect(screen.getByText('Level 3')).toBeInTheDocument();

    // Disabled leaf node cannot be selected
    const nycItem = screen.getByRole('menuitem', { name: 'New York' });
    expect(nycItem).toBeDisabled();
    fireEvent.click(nycItem);
    expect(onChange).not.toHaveBeenCalled();

    // Disabled branch node cannot expand
    const euItem = screen.getByRole('menuitem', { name: 'Europe' });
    expect(euItem).toBeDisabled();
    fireEvent.click(euItem);
    expect(screen.queryByRole('menuitem', { name: 'Germany' })).not.toBeInTheDocument();

    // Select leaf node San Francisco
    fireEvent.click(screen.getByRole('menuitem', { name: 'San Francisco' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const [ids, nodes] = onChange.mock.calls[0] as [string[], CascadeOptionNode[]];
    expect(ids).toEqual(['na', 'us', 'sfo']);
    expect(nodes.map((n) => n.label)).toEqual(['North America', 'United States', 'San Francisco']);

    // Popover closes, breadcrumb renders with default separator, and Clear button appears
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('North America / United States / San Francisco');
    expect(document.activeElement).toBe(trigger);

    // Reopen shows selected path pre-expanded across all 3 levels
    fireEvent.click(trigger);
    expect(screen.getByText('Level 3')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'San Francisco' })).toHaveAttribute(
      'data-selected',
      'true'
    );

    // Selecting root node with empty children[] commits as a leaf
    fireEvent.click(screen.getByRole('menuitem', { name: 'Global Edge' }));
    expect(trigger).toHaveTextContent('Global Edge');

    // Clear selection via inline × button
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(onChange).toHaveBeenLastCalledWith([], []);
    expect(trigger).toHaveTextContent('Select hierarchy...');
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
  });

  it('supports controlled mode, custom separator, defaultOpen, Escape/ArrowDown, IME guard, and outside click', () => {
    const onChange = vi.fn();

    function ControlledHarness() {
      const [path, setPath] = useState<string[]>(['na', 'ca', 'tor']);
      return (
        <div>
          <div data-testid="outside-area">Outside</div>
          <CascadingSelect
            options={HIERARCHY_OPTIONS}
            value={path}
            onChange={(nextIds, nextNodes) => {
              onChange(nextIds, nextNodes);
              setPath(nextIds);
            }}
            separator=" › "
            defaultOpen
            label=""
            placeholder="Pick location"
            data-testid="controlled-cascade"
          />
        </div>
      );
    }

    render(<ControlledHarness />);
    const root = screen.getByTestId('controlled-cascade');
    const trigger = screen.getByRole('button', { name: 'Pick location' });
    expect(trigger).toHaveTextContent('North America › Canada › Toronto');
    expect(screen.getByRole('menu', { name: 'Pick location' })).toBeInTheDocument();

    // IME composing Escape is ignored
    const composingEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(composingEsc, 'isComposing', { value: true });
    fireEvent(root, composingEsc);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Normal Escape closes popover and returns focus to trigger
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);

    // ArrowDown on trigger opens popover; pressing trigger again toggles closed; unrelated key is ignored
    fireEvent.keyDown(trigger, { key: 'Tab' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Clicking inside does not close; clicking outside closes
    fireEvent.mouseDown(root);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside-area'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('blocks interactions when disabled and handles empty options, stale paths, duplicates, and XSS payloads safely', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CascadingSelect
        options={HIERARCHY_OPTIONS}
        defaultValue={['na', 'us', 'sfo']}
        disabled
        onChange={onChange}
        data-testid="disabled-cascade"
      />
    );

    const root = screen.getByTestId('disabled-cascade');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const trigger = screen.getByRole('button', { name: 'Hierarchy' });
    expect(trigger).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    // Empty options renders empty fallback inside popover
    rerender(<CascadingSelect key="empty" options={[]} defaultOpen data-testid="disabled-cascade" />);
    expect(screen.getByTestId('cascading-select-empty')).toHaveTextContent(
      'No hierarchy options available'
    );

    // Unresolved path falls back to placeholder, duplicates deduplicated, XSS + prototype keys safe
    const xss = '<script>window.__cascadeXss=1</script><img src=x onerror=alert(1)>';
    const adversarialOptions: CascadeOptionNode[] = [
      { id: '__proto__', label: '__proto__' },
      { id: '__proto__', label: 'Duplicate ignored' },
      { id: 'constructor', label: xss },
    ];
    rerender(
      <CascadingSelect
        key="adversarial"
        options={adversarialOptions}
        defaultValue={['non-existent-id']}
        defaultOpen
        onChange={onChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Hierarchy' })).toHaveTextContent(
      'Select hierarchy...'
    );
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(2);
    fireEvent.click(screen.getByRole('menuitem', { name: xss }));
    expect(onChange).toHaveBeenLastCalledWith(['constructor'], [adversarialOptions[2]]);
    expect(document.querySelector('script')).toBeNull();
    expect(({} as Record<string, string>).polluted).toBeUndefined();
  });
});
