import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  SortableList,
  type SortableListItem,
} from './index';

interface CustomPriorityItem extends SortableListItem {
  owner: string;
}

const BASE_ITEMS: ReadonlyArray<SortableListItem> = [
  { id: 'tokens', title: 'Optical Tokens', subtitle: 'Refractive CSS variables', badge: 'P0' },
  { id: 'focus', title: 'Focus Rings', subtitle: 'Keyboard-only outlines', badge: 'P1' },
  { id: 'theme', title: 'Theme Cascade', subtitle: 'MUI + Astryx sync' },
  { id: 'kernel', title: 'Kernel Baseline', subtitle: 'Pinned foundation', locked: true },
];

describe('SortableList', () => {
  it('renders prism-slab rows, rank orbs, badges, theme overrides, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SortableList: { className: 'theme-sortable', style: { paddingBottom: '12px' } },
          },
        }}
      >
        <SortableList
          ref={ref}
          defaultItems={BASE_ITEMS}
          ariaLabel="Release priority queue"
          className="custom-sortable"
          xstyle={{ '--prism-blur-px': '22px' }}
          data-testid="sortable-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('sortable-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-sortable-list', 'prism-slab', 'theme-sortable', 'custom-sortable');
    expect(root).toHaveAttribute('data-count', '4');
    expect(root).toHaveStyle({ paddingBottom: '12px' });

    const list = screen.getByRole('list', { name: 'Release priority queue' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(within(rows[0]!).getByText('#1')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('Optical Tokens')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('Refractive CSS variables')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('P0')).toBeInTheDocument();
    expect(rows[0]).toHaveAttribute('draggable', 'true');

    expect(within(rows[3]!).getByText('#4')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Locked')).toBeInTheDocument();
    expect(rows[3]).toHaveAttribute('draggable', 'false');
    expect(rows[3]).toHaveAttribute('data-locked', 'true');
  });

  it('reorders via Move Up / Move Down buttons, disables bounds/locked controls, and announces via aria-live', () => {
    const onReorder = vi.fn();

    render(<SortableList defaultItems={BASE_ITEMS} onReorder={onReorder} />);

    const moveTokensUp = screen.getByRole('button', { name: 'Move Optical Tokens up' });
    const moveTokensDown = screen.getByRole('button', { name: 'Move Optical Tokens down' });
    const moveFocusUp = screen.getByRole('button', { name: 'Move Focus Rings up' });
    const moveThemeDown = screen.getByRole('button', { name: 'Move Theme Cascade down' });
    const moveKernelUp = screen.getByRole('button', { name: 'Move Kernel Baseline up' });
    const moveKernelDown = screen.getByRole('button', { name: 'Move Kernel Baseline down' });

    // Top bound, locked item, and item directly above locked item are disabled cleanly
    expect(moveTokensUp).toBeDisabled();
    expect(moveTokensUp).toHaveClass('disabled:cursor-not-allowed');
    expect(moveThemeDown).toBeDisabled();
    expect(moveKernelUp).toBeDisabled();
    expect(moveKernelDown).toBeDisabled();

    // Move Focus Rings up to #1
    fireEvent.click(moveFocusUp);
    expect(onReorder).toHaveBeenCalledTimes(1);
    const [nextItems, fromIndex, toIndex] = onReorder.mock.calls[0]!;
    expect(nextItems.map((i: SortableListItem) => i.id)).toEqual(['focus', 'tokens', 'theme', 'kernel']);
    expect(fromIndex).toBe(1);
    expect(toIndex).toBe(0);
    expect(screen.getByRole('status')).toHaveTextContent('Moved Focus Rings to position 1 of 4');

    // Now move Optical Tokens (currently at index 1) down to index 2
    fireEvent.click(moveTokensDown);
    expect(onReorder).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('Moved Optical Tokens to position 3 of 4');

    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]!).getByText('Focus Rings')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Theme Cascade')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Optical Tokens')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Kernel Baseline')).toBeInTheDocument();
  });

  it('supports Alt+ArrowUp and Alt+ArrowDown keyboard reordering on grab handles', () => {
    const onReorder = vi.fn();

    render(<SortableList defaultItems={BASE_ITEMS} onReorder={onReorder} />);

    const tokensGrab = screen.getByRole('button', {
      name: 'Reorder Optical Tokens with Alt+ArrowUp or Alt+ArrowDown',
    });
    const focusGrab = screen.getByRole('button', {
      name: 'Reorder Focus Rings with Alt+ArrowUp or Alt+ArrowDown',
    });
    const kernelGrab = screen.getByRole('button', { name: 'Kernel Baseline is locked' });

    expect(kernelGrab).toBeDisabled();

    // Without Alt key or with non-arrow key -> no-op
    fireEvent.keyDown(focusGrab, { key: 'ArrowUp', altKey: false });
    fireEvent.keyDown(focusGrab, { key: 'Enter', altKey: true });
    expect(onReorder).not.toHaveBeenCalled();

    // Alt+ArrowUp at index 0 -> rejected out-of-bounds
    fireEvent.keyDown(tokensGrab, { key: 'ArrowUp', altKey: true });
    expect(onReorder).not.toHaveBeenCalled();

    // Alt+ArrowUp on index 1 moves Focus Rings to position 1 of 4
    fireEvent.keyDown(focusGrab, { key: 'ArrowUp', altKey: true });
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Moved Focus Rings to position 1 of 4');

    // Alt+ArrowDown on index 0 moves Focus Rings back to position 2 of 4
    fireEvent.keyDown(focusGrab, { key: 'ArrowDown', altKey: true });
    expect(onReorder).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('Moved Focus Rings to position 2 of 4');
  });

  it('supports HTML5 drag-and-drop with drop target indicator, dragLeave, dragEnd, and transfer fallbacks', () => {
    const onReorder = vi.fn();
    const store = new Map<string, string>();

    render(<SortableList defaultItems={BASE_ITEMS} onReorder={onReorder} />);

    const rows = screen.getAllByRole('listitem');
    const row0 = rows[0]!;
    const row1 = rows[1]!;
    const row2 = rows[2]!;

    // Drag start with dataTransfer
    fireEvent.dragStart(row0, {
      dataTransfer: {
        effectAllowed: 'none',
        setData: (type: string, val: string) => store.set(type, val),
      },
    });
    expect(row0).toHaveAttribute('data-dragging', 'true');
    expect(store.get('text/plain')).toBe('0');
    expect(store.get('application/x-refractor-sortable-id')).toBe('tokens');

    // Drag over row2 highlights drop target (repeated dragOver stays highlighted)
    fireEvent.dragOver(row2, { dataTransfer: { dropEffect: 'none' } });
    fireEvent.dragOver(row2, { dataTransfer: { dropEffect: 'none' } });
    expect(row2).toHaveAttribute('data-drop-target', 'true');

    // Drag leave on non-target row preserves active highlight
    fireEvent.dragLeave(row1);
    expect(row2).toHaveAttribute('data-drop-target', 'true');

    // Drag leave to inner child preserves highlight; drag leave outside clears highlight
    const innerText = within(row2).getByText('Theme Cascade');
    const innerLeave = createEvent.dragLeave(row2);
    Object.defineProperty(innerLeave, 'relatedTarget', { value: innerText });
    fireEvent(row2, innerLeave);
    expect(row2).toHaveAttribute('data-drop-target', 'true');

    const outerLeave = createEvent.dragLeave(row2);
    Object.defineProperty(outerLeave, 'relatedTarget', { value: row1 });
    fireEvent(row2, outerLeave);
    expect(row2).not.toHaveAttribute('data-drop-target');

    // Drop onto row2 using custom MIME ID payload
    fireEvent.dragOver(row2);
    fireEvent.drop(row2, {
      dataTransfer: {
        getData: (type: string) => store.get(type) ?? '',
      },
    });
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder.mock.calls[0]![1]).toBe(0);
    expect(onReorder.mock.calls[0]![2]).toBe(2);
    expect(screen.getByRole('status')).toHaveTextContent('Moved Optical Tokens to position 3 of 4');

    // Drop using numeric text/plain fallback when custom MIME is absent
    const updatedRows = screen.getAllByRole('listitem');
    fireEvent.drop(updatedRows[0]!, {
      dataTransfer: {
        getData: (type: string) => (type === 'text/plain' ? '2' : ''),
      },
    });
    expect(onReorder).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('Moved Optical Tokens to position 1 of 4');

    // Drag without dataTransfer falls back to internal draggedIndex, and dragEnd clears state
    const afterRows = screen.getAllByRole('listitem');
    fireEvent.dragStart(afterRows[0]!);
    expect(afterRows[0]).toHaveAttribute('data-dragging', 'true');
    fireEvent.dragEnd(afterRows[0]!);
    expect(afterRows[0]).not.toHaveAttribute('data-dragging');

    fireEvent.dragStart(afterRows[0]!);
    fireEvent.drop(afterRows[1]!);
    expect(onReorder).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('status')).toHaveTextContent('Moved Optical Tokens to position 2 of 4');
  });

  it('rejects locked item drags/drops, out-of-bounds indices, and malformed transfer payloads (adversarial)', () => {
    const onReorder = vi.fn();

    render(
      <SortableList
        defaultItems={[
          { id: 'pinned-top', title: 'Pinned Top', locked: true },
          { id: 'mid', title: 'Middle Task' },
          { id: 'pinned-bottom', title: 'Pinned Bottom', locked: true },
        ]}
        onReorder={onReorder}
      />
    );

    const rows = screen.getAllByRole('listitem');
    const topLocked = rows[0]!;
    const midUnlocked = rows[1]!;
    const bottomLocked = rows[2]!;

    // Middle task surrounded by locked items has both Up and Down disabled
    expect(screen.getByRole('button', { name: 'Move Middle Task up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Middle Task down' })).toBeDisabled();

    // DragStart on locked row is prevented and never enters dragging state
    const lockedStart = createEvent.dragStart(topLocked);
    fireEvent(topLocked, lockedStart);
    expect(lockedStart.defaultPrevented).toBe(true);
    expect(topLocked).not.toHaveAttribute('data-dragging');

    // DragOver on locked row does not highlight it
    fireEvent.dragStart(midUnlocked);
    fireEvent.dragOver(bottomLocked);
    expect(bottomLocked).not.toHaveAttribute('data-drop-target');

    // Drop onto locked row is rejected
    fireEvent.drop(bottomLocked, {
      dataTransfer: {
        getData: (type: string) =>
          type === 'application/x-refractor-sortable-id' ? 'mid' : '',
      },
    });
    expect(onReorder).not.toHaveBeenCalled();

    // Drop FROM locked row index via forged dataTransfer is rejected
    fireEvent.drop(midUnlocked, {
      dataTransfer: {
        getData: (type: string) => (type === 'text/plain' ? '0' : ''),
      },
    });
    expect(onReorder).not.toHaveBeenCalled();

    // Out-of-bounds, negative, non-numeric, nonexistent ID, same-index, and empty drops rejected
    for (const payload of ['-1', '99', 'NaN', 'evil']) {
      fireEvent.drop(midUnlocked, {
        dataTransfer: {
          getData: (type: string) => (type === 'text/plain' ? payload : ''),
        },
      });
    }
    fireEvent.drop(midUnlocked, {
      dataTransfer: {
        getData: (type: string) =>
          type === 'application/x-refractor-sortable-id' ? 'missing-id' : '',
      },
    });
    fireEvent.drop(midUnlocked, {
      dataTransfer: {
        getData: (type: string) => (type === 'text/plain' ? '1' : ''),
      },
    });
    fireEvent.drop(midUnlocked, {
      dataTransfer: {
        getData: () => '',
      },
    });
    fireEvent.drop(midUnlocked);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('supports controlled items, custom generic renderItem, duplicate ID deduplication, and emptyMessage', () => {
    function ControlledHarness() {
      const [items, setItems] = useState<CustomPriorityItem[]>([
        { id: 'c1', title: 'Alpha', owner: 'Ava' },
        { id: 'c2', title: 'Beta', owner: 'Marcus' },
        { id: 'c1', title: 'Duplicate Alpha', owner: 'Ignored' },
      ]);
      return (
        <SortableList<CustomPriorityItem>
          items={items}
          onReorder={(next) => setItems(next)}
          renderItem={(item, idx) => (
            <div data-testid={`custom-row-${item.id}`}>
              {item.title} — {item.owner} ({idx + 1})
            </div>
          )}
          aria-label="Custom controlled list"
        />
      );
    }

    const { rerender } = render(<ControlledHarness />);

    expect(screen.getByRole('list', { name: 'Custom controlled list' })).toBeInTheDocument();
    expect(screen.getByTestId('custom-row-c1')).toHaveTextContent('Alpha — Ava (1)');
    expect(screen.getByTestId('custom-row-c2')).toHaveTextContent('Beta — Marcus (2)');
    expect(screen.queryByText(/Duplicate Alpha/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Move Beta up' }));
    expect(screen.getByTestId('custom-row-c2')).toHaveTextContent('Beta — Marcus (1)');
    expect(screen.getByTestId('custom-row-c1')).toHaveTextContent('Alpha — Ava (2)');

    // Empty arrays render custom and default emptyMessage
    rerender(<SortableList items={[]} emptyMessage="Queue is currently empty." />);
    expect(screen.getByText('Queue is currently empty.')).toBeInTheDocument();

    rerender(<SortableList />);
    expect(screen.getByText('No items to reorder.')).toBeInTheDocument();
  });

  it('safely renders adversarial XSS payloads as literal text without script execution', () => {
    const xss = '<script>window.__sortableXss=1</script><img src=x onerror=alert(1)>';
    render(
      <SortableList
        defaultItems={[
          { id: 'x1', title: xss, subtitle: xss, badge: xss },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getAllByText(xss)).toHaveLength(3);
  });
});
