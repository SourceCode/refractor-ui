import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  TransferList,
  type TransferListItem,
} from './index';

const SAMPLE_ITEMS: ReadonlyArray<TransferListItem> = [
  { id: 'tokens', label: 'Optical Tokens', description: 'CSS refraction variables' },
  { id: 'contrast', label: 'Contrast Guard', description: 'WCAG AA verification' },
  { id: 'focus', label: 'Focus Rings', description: 'Keyboard-only focus-visible' },
  { id: 'kernel', label: 'System Kernel', description: 'Locked baseline', disabled: true },
];

describe('TransferList', () => {
  it('renders both prism-slab pools, tabular counts, theme overrides, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            TransferList: { className: 'theme-transfer', style: { gap: '20px' } },
          },
        }}
      >
        <TransferList
          ref={ref}
          items={SAMPLE_ITEMS}
          defaultSelectedIds={['tokens']}
          availableTitle="Available Scopes"
          selectedTitle="Assigned Scopes"
          className="custom-transfer"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="transfer-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('transfer-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-transfer-list', 'theme-transfer', 'custom-transfer');
    expect(root).toHaveAttribute('data-available-count', '3');
    expect(root).toHaveAttribute('data-selected-count', '1');
    expect(root).toHaveAttribute('data-searchable', 'true');
    expect(root).toHaveStyle({ gap: '20px' });

    const availableBox = screen.getByRole('listbox', { name: 'Available Scopes' });
    const selectedBox = screen.getByRole('listbox', { name: 'Assigned Scopes' });
    expect(within(availableBox).getByText('Contrast Guard')).toBeInTheDocument();
    expect(within(availableBox).getByText('WCAG AA verification')).toBeInTheDocument();
    expect(within(availableBox).getByText('Focus Rings')).toBeInTheDocument();
    expect(within(availableBox).getByText('System Kernel')).toBeInTheDocument();
    expect(within(selectedBox).getByText('Optical Tokens')).toBeInTheDocument();

    expect(screen.getByTestId('transfer-count-available')).toHaveTextContent('3');
    expect(screen.getByTestId('transfer-count-selected')).toHaveTextContent('1');
  });

  it('transfers checked items right and left with toggle support and polite announcements', () => {
    const onChange = vi.fn();

    render(
      <TransferList
        items={SAMPLE_ITEMS}
        defaultSelectedIds={['tokens']}
        onChange={onChange}
      />
    );

    const moveCheckedRight = screen.getByRole('button', { name: 'Move checked items to Selected' });
    const moveCheckedLeft = screen.getByRole('button', { name: 'Move checked items to Available' });
    expect(moveCheckedRight).toBeDisabled();
    expect(moveCheckedLeft).toBeDisabled();

    // Check and uncheck Contrast Guard, then check both Contrast Guard and Focus Rings
    const contrastOpt = screen.getByRole('option', { name: /Contrast Guard/ });
    const focusOpt = screen.getByRole('option', { name: /Focus Rings/ });

    fireEvent.click(contrastOpt);
    expect(contrastOpt).toHaveAttribute('aria-selected', 'true');
    expect(contrastOpt).toHaveAttribute('data-checked', 'true');
    expect(screen.getByText('1 checked')).toBeInTheDocument();
    expect(moveCheckedRight).toBeEnabled();

    fireEvent.click(contrastOpt);
    expect(contrastOpt).toHaveAttribute('aria-selected', 'false');
    expect(moveCheckedRight).toBeDisabled();

    fireEvent.click(contrastOpt);
    fireEvent.click(focusOpt);
    expect(screen.getByText('2 checked')).toBeInTheDocument();

    fireEvent.click(moveCheckedRight);
    expect(onChange).toHaveBeenLastCalledWith(['tokens', 'contrast', 'focus']);
    expect(screen.getByRole('status')).toHaveTextContent('Moved 2 items to Selected');
    expect(moveCheckedRight).toBeDisabled();

    // Toggle and move single item back to Available
    const selectedBox = screen.getByRole('listbox', { name: 'Selected' });
    const tokensInSelected = within(selectedBox).getByRole('option', { name: /Optical Tokens/ });
    fireEvent.click(tokensInSelected);
    expect(tokensInSelected).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(tokensInSelected);
    expect(tokensInSelected).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(tokensInSelected);
    expect(moveCheckedLeft).toBeEnabled();

    fireEvent.click(moveCheckedLeft);
    expect(onChange).toHaveBeenLastCalledWith(['contrast', 'focus']);
    expect(screen.getByRole('status')).toHaveTextContent('Moved 1 item to Available');

    // Move single item right to cover singular right announcement
    const availableBox = screen.getByRole('listbox', { name: 'Available' });
    fireEvent.click(within(availableBox).getByRole('option', { name: /Optical Tokens/ }));
    fireEvent.click(moveCheckedRight);
    expect(screen.getByRole('status')).toHaveTextContent('Moved 1 item to Selected');
  });

  it('moves all enabled items right and left while NEVER transferring disabled items', () => {
    const items: TransferListItem[] = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'locked-left', label: 'Locked Left', disabled: true },
      { id: 'locked-right', label: 'Locked Right', disabled: true },
    ];
    const onChange = vi.fn();

    render(
      <TransferList
        items={items}
        defaultSelectedIds={['locked-right']}
        onChange={onChange}
      />
    );

    const availableBox = screen.getByRole('listbox', { name: 'Available' });
    const selectedBox = screen.getByRole('listbox', { name: 'Selected' });
    const moveAllRight = screen.getByRole('button', { name: 'Move all enabled items to Selected' });
    const moveAllLeft = screen.getByRole('button', { name: 'Move all enabled items to Available' });

    // Only locked-right is in Selected, so Move All Left MUST be disabled
    expect(moveAllLeft).toBeDisabled();
    expect(moveAllLeft).toHaveClass('disabled:cursor-not-allowed');
    expect(moveAllRight).toBeEnabled();

    // Clicking disabled options does nothing
    const lockedLeftOpt = within(availableBox).getByRole('option', { name: 'Locked Left' });
    const lockedRightOpt = within(selectedBox).getByRole('option', { name: 'Locked Right' });
    expect(lockedLeftOpt).toBeDisabled();
    expect(lockedLeftOpt).toHaveAttribute('aria-disabled', 'true');
    expect(lockedLeftOpt).toHaveAttribute('data-disabled', 'true');
    expect(lockedRightOpt).toBeDisabled();
    fireEvent.click(lockedLeftOpt);
    fireEvent.click(lockedRightOpt);
    expect(lockedLeftOpt).toHaveAttribute('aria-selected', 'false');
    expect(lockedRightOpt).toHaveAttribute('aria-selected', 'false');

    // Move all enabled right -> transfers Alpha & Beta, leaves Locked Left behind
    fireEvent.click(moveAllRight);
    expect(onChange).toHaveBeenLastCalledWith(['locked-right', 'a', 'b']);
    expect(within(availableBox).getByText('Locked Left')).toBeInTheDocument();
    expect(within(selectedBox).getByText('Alpha')).toBeInTheDocument();
    expect(within(selectedBox).getByText('Beta')).toBeInTheDocument();
    expect(moveAllRight).toBeDisabled();
    expect(moveAllLeft).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('Moved all 2 enabled items to Selected');

    // Move all enabled left -> returns Alpha & Beta, keeps Locked Right in Selected
    fireEvent.click(moveAllLeft);
    expect(onChange).toHaveBeenLastCalledWith(['locked-right']);
    expect(within(selectedBox).getByText('Locked Right')).toBeInTheDocument();
    expect(within(availableBox).getByText('Alpha')).toBeInTheDocument();
    expect(within(availableBox).getByText('Beta')).toBeInTheDocument();
    expect(moveAllLeft).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Moved all 2 enabled items to Available');
  });

  it('announces singular count for move-all actions when exactly 1 enabled item moves', () => {
    render(<TransferList items={[{ id: 'solo', label: 'Solo Scope' }]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Move all enabled items to Selected' }));
    expect(screen.getByRole('status')).toHaveTextContent('Moved all 1 enabled item to Selected');

    fireEvent.click(screen.getByRole('button', { name: 'Move all enabled items to Available' }));
    expect(screen.getByRole('status')).toHaveTextContent('Moved all 1 enabled item to Available');
  });

  it('supports independent IME-safe search filters, clear button, Escape reset, and searchable=false', () => {
    const onFormSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());

    const { rerender } = render(
      <form onSubmit={onFormSubmit}>
        <TransferList
          items={[
            { id: 'a', label: 'Alpha Prism', description: 'Warm caustic sheen' },
            { id: 'b', label: 'Beta Crystal' },
            { id: 'c', label: 'Gamma Slab', description: 'Deep frosted well' },
          ]}
          defaultSelectedIds={['c']}
        />
      </form>
    );

    const availableSearch = screen.getByLabelText('Filter Available');
    const selectedSearch = screen.getByLabelText('Filter Selected');
    const availableBox = screen.getByRole('listbox', { name: 'Available' });
    const selectedBox = screen.getByRole('listbox', { name: 'Selected' });

    // Filter Available by description match
    fireEvent.change(availableSearch, { target: { value: 'caustic' } });
    expect(within(availableBox).getByText('Alpha Prism')).toBeInTheDocument();
    expect(within(availableBox).queryByText('Beta Crystal')).not.toBeInTheDocument();
    // Selected pool stays unaffected
    expect(within(selectedBox).getByText('Gamma Slab')).toBeInTheDocument();

    // Non-matching query displays empty search placeholder
    fireEvent.change(availableSearch, { target: { value: 'zzz-none' } });
    expect(within(availableBox).getByText('No matching items')).toBeInTheDocument();

    // Enter does not submit wrapping form; non-special key does nothing
    fireEvent.keyDown(availableSearch, { key: 'a' });
    fireEvent.keyDown(availableSearch, { key: 'Enter' });
    expect(onFormSubmit).not.toHaveBeenCalled();

    // IME composition Escape does NOT clear query
    const composingEsc = createEvent.keyDown(availableSearch, { key: 'Escape' });
    Object.defineProperty(composingEsc, 'isComposing', { value: true });
    fireEvent(availableSearch, composingEsc);
    expect(availableSearch).toHaveValue('zzz-none');

    // Non-composing Escape clears Available query
    fireEvent.keyDown(availableSearch, { key: 'Escape' });
    expect(availableSearch).toHaveValue('');
    expect(within(availableBox).getByText('Beta Crystal')).toBeInTheDocument();

    // Selected search filters independently and clears via Clear button
    fireEvent.change(selectedSearch, { target: { value: 'missing' } });
    expect(within(selectedBox).getByText('No matching items')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Selected search' }));
    expect(selectedSearch).toHaveValue('');
    expect(within(selectedBox).getByText('Gamma Slab')).toBeInTheDocument();

    // searchable=false hides both search filters
    rerender(
      <TransferList
        items={SAMPLE_ITEMS}
        defaultSelectedIds={['tokens']}
        searchable={false}
      />
    );
    expect(screen.queryByLabelText('Filter Available')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Filter Selected')).not.toBeInTheDocument();
  });

  it('supports controlled selectedIds mode and deduplicates/ignores nonexistent IDs', () => {
    function ControlledHarness() {
      const [selected, setSelected] = useState<string[]>([
        'tokens',
        'tokens',
        'nonexistent-id',
      ]);
      return (
        <TransferList
          items={[
            ...SAMPLE_ITEMS,
            { id: 'tokens', label: 'Duplicate Optical Tokens' },
          ]}
          selectedIds={selected}
          onChange={setSelected}
        />
      );
    }

    render(<ControlledHarness />);

    const selectedBox = screen.getByRole('listbox', { name: 'Selected' });
    expect(screen.getByTestId('transfer-count-selected')).toHaveTextContent('1');
    expect(within(selectedBox).getByText('Optical Tokens')).toBeInTheDocument();
    expect(screen.queryByText('Duplicate Optical Tokens')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: /Contrast Guard/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Move checked items to Selected' }));
    expect(screen.getByTestId('transfer-count-selected')).toHaveTextContent('2');
    expect(within(selectedBox).getByText('Contrast Guard')).toBeInTheDocument();

    fireEvent.click(within(selectedBox).getByRole('option', { name: /Optical Tokens/ }));
    fireEvent.click(within(selectedBox).getByRole('option', { name: /Contrast Guard/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Move checked items to Available' }));
    expect(screen.getByRole('status')).toHaveTextContent('Moved 2 items to Available');
    expect(screen.getByTestId('transfer-count-selected')).toHaveTextContent('0');
    expect(within(selectedBox).getByText('No items in Selected')).toBeInTheDocument();
  });

  it('renders empty pool placeholders when items is empty and disables all transfer controls', () => {
    render(<TransferList items={[]} />);

    expect(screen.getByText('No items in Available')).toBeInTheDocument();
    expect(screen.getByText('No items in Selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move checked items to Selected' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move all enabled items to Selected' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move checked items to Available' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move all enabled items to Available' })).toBeDisabled();
  });

  it('defends against XSS payloads and prototype-polluting item IDs (adversarial)', () => {
    const xss = '<script>window.__transferXss=1</script><img src=x onerror=alert(1)>';
    const items: TransferListItem[] = [
      { id: '__proto__', label: xss, description: xss },
      { id: 'constructor', label: 'Constructor Safe' },
    ];

    render(
      <TransferList
        items={items}
        defaultSelectedIds={['__proto__', 'ghost']}
        availableTitle={xss}
        selectedTitle="Safe Selected"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getAllByText(xss).length).toBeGreaterThanOrEqual(3);
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xss);

    // Transfer constructor item cleanly
    fireEvent.click(screen.getByRole('option', { name: 'Constructor Safe' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move checked items to Safe Selected' }));
    expect(screen.getByTestId('transfer-count-selected')).toHaveTextContent('2');
  });
});
