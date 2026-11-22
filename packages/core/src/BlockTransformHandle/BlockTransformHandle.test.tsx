import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  BlockTransformHandle,
  type BlockTransformHandleProps,
  type DocBlockKind,
  type DocBlockKindMap,
  type DocumentBlockItem,
} from './index';

interface MockDataTransfer {
  effectAllowed: string;
  dropEffect: string;
  setData: (format: string, value: string) => void;
  getData: (format: string) => string;
}

function createMockDataTransfer(initial?: Record<string, string>): MockDataTransfer {
  const store = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    setData: (format: string, value: string) => {
      store.set(format, value);
    },
    getData: (format: string) => store.get(format) ?? '',
  };
}

describe('BlockTransformHandle', () => {
  it('renders 4 default optical document blocks with React 19 ref, theme overrides, semantic tokens, and zero raw color literals', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            BlockTransformHandle: {
              className: 'theme-block-canvas',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <BlockTransformHandle
          ref={ref}
          className="local-block-canvas"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '20px' }}
          data-testid="block-canvas-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('block-canvas-root');
    expect(BlockTransformHandle.displayName).toBe('BlockTransformHandle');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-block-transform-handle',
      'prism-slab',
      'theme-block-canvas',
      'local-block-canvas'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', padding: '20px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Block Editor Canvas');
    expect(root).toHaveAttribute('data-count', '4');

    expect(screen.getByTestId('block-transform-count')).toHaveTextContent('4 blocks');
    expect(screen.getByTestId('block-transform-status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('block-transform-status')).toHaveTextContent(
      'Ready · Use block handle to transform or reorder'
    );

    // Default 4 blocks: heading, paragraph, callout, checklist
    expect(screen.getByTestId('block-row-block-heading')).toHaveAttribute('data-kind', 'heading');
    expect(screen.getByTestId('block-row-block-paragraph')).toHaveAttribute(
      'data-kind',
      'paragraph'
    );
    expect(screen.getByTestId('block-row-block-callout')).toHaveAttribute('data-kind', 'callout');
    expect(screen.getByTestId('block-row-block-checklist')).toHaveAttribute(
      'data-kind',
      'checklist'
    );

    expect(screen.getByTestId('block-body-block-heading').tagName).toBe('H3');
    expect(screen.getByTestId('block-body-block-paragraph').tagName).toBe('P');
    expect(screen.getByTestId('block-checkbox-block-checklist')).toHaveAttribute(
      'aria-checked',
      'false'
    );

    // Every left-hand handle exposes menu semantics
    const headingHandle = screen.getByTestId('block-handle-block-heading');
    expect(headingHandle).toHaveAttribute('aria-haspopup', 'menu');
    expect(headingHandle).toHaveAttribute('aria-expanded', 'false');
    expect(headingHandle).toHaveAttribute(
      'aria-label',
      'Block actions for Q3 Optical Design System Architectu…'
    );

    // Zero raw color literals anywhere in rendered DOM
    const rawColorRe = /(?:#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\()/;
    expect(root.innerHTML).not.toMatch(rawColorRe);
  });

  it('opens viewport-clamped transformer menu, transforms blocks in-place across all 6 kinds, and announces updates politely', () => {
    const onChange = vi.fn<(blocks: DocumentBlockItem[]) => void>();
    render(<BlockTransformHandle onChange={onChange} />);

    const paragraphHandle = screen.getByTestId('block-handle-block-paragraph');
    fireEvent.click(paragraphHandle);

    expect(paragraphHandle).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByTestId('block-menu-block-paragraph');
    expect(menu).toHaveAttribute('role', 'menu');
    expect(menu).toHaveClass('w-[min(15rem,calc(100vw-2rem))]');
    expect(paragraphHandle).toHaveAttribute('aria-controls', menu.id);

    // Current kind shows active checkmark and clicking it is a no-op for onChange
    const currentParagraphItem = within(menu).getByTestId('block-turn-into-paragraph');
    expect(currentParagraphItem).toHaveAttribute('aria-current', 'true');
    fireEvent.click(currentParagraphItem);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByTestId('block-transform-status')).toHaveTextContent(
      'Block 2 is already Paragraph'
    );

    // Turn Paragraph -> Quote
    fireEvent.click(paragraphHandle);
    fireEvent.click(screen.getByTestId('block-turn-into-quote'));
    expect(screen.getByTestId('block-row-block-paragraph')).toHaveAttribute('data-kind', 'quote');
    expect(screen.getByTestId('block-body-block-paragraph').tagName).toBe('BLOCKQUOTE');
    expect(screen.getByTestId('block-kind-badge-block-paragraph')).toHaveTextContent('Quote');
    expect(screen.getByTestId('block-transform-status')).toHaveTextContent(
      'Transformed block 2 to Quote'
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'block-paragraph', kind: 'quote' })])
    );

    // Turn Quote -> Code
    fireEvent.click(paragraphHandle);
    fireEvent.click(screen.getByTestId('block-turn-into-code'));
    expect(screen.getByTestId('block-row-block-paragraph')).toHaveAttribute('data-kind', 'code');
    expect(screen.getByTestId('block-body-block-paragraph').tagName).toBe('PRE');
    expect(screen.getByTestId('block-body-block-paragraph').querySelector('code')).not.toBeNull();
    expect(screen.getByTestId('block-transform-status')).toHaveTextContent(
      'Transformed block 2 to Code'
    );

    // Turn Code -> Checklist (initializes checked: false)
    fireEvent.click(paragraphHandle);
    fireEvent.click(screen.getByTestId('block-turn-into-checklist'));
    expect(screen.getByTestId('block-row-block-paragraph')).toHaveAttribute(
      'data-kind',
      'checklist'
    );
    const convertedCheckbox = screen.getByTestId('block-checkbox-block-paragraph');
    expect(convertedCheckbox).toHaveAttribute('aria-checked', 'false');

    // Toggle converted checklist block to complete and back to incomplete
    fireEvent.click(convertedCheckbox);
    expect(convertedCheckbox).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('block-transform-status')).toHaveTextContent(
      'Marked checklist block 2 as completed'
    );

    fireEvent.click(convertedCheckbox);
    expect(convertedCheckbox).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('block-transform-status')).toHaveTextContent(
      'Marked checklist block 2 as incomplete'
    );

    // Turn Checklist -> Heading -> Callout -> Paragraph
    fireEvent.click(paragraphHandle);
    fireEvent.click(screen.getByTestId('block-turn-into-heading'));
    expect(screen.getByTestId('block-body-block-paragraph').tagName).toBe('H3');

    fireEvent.click(paragraphHandle);
    fireEvent.click(screen.getByTestId('block-turn-into-callout'));
    expect(screen.getByTestId('block-row-block-paragraph')).toHaveAttribute('data-kind', 'callout');

    fireEvent.click(paragraphHandle);
    fireEvent.click(screen.getByTestId('block-turn-into-paragraph'));
    expect(screen.getByTestId('block-body-block-paragraph').tagName).toBe('P');
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(lastCall?.[1]).not.toHaveProperty('checked');
  });

  it('reorders blocks via Move Up, Move Down, Alt+Arrow keyboard shortcuts, and native drag-and-drop', () => {
    const onChange = vi.fn<(blocks: DocumentBlockItem[]) => void>();
    const initial: ReadonlyArray<DocumentBlockItem> = [
      { id: 'b1', kind: 'heading', text: 'First Block' },
      { id: 'b2', kind: 'paragraph', text: 'Second Block' },
      { id: 'b3', kind: 'quote', text: 'Third Block' },
    ];

    render(<BlockTransformHandle defaultBlocks={initial} onChange={onChange} title="Spec Doc" />);

    const getOrder = () =>
      screen.getAllByRole('listitem').map((el) => el.getAttribute('data-block-id'));
    expect(getOrder()).toEqual(['b1', 'b2', 'b3']);

    // Move Up disabled on first block; Move Down moves b1 to index 1
    fireEvent.click(screen.getByTestId('block-handle-b1'));
    expect(screen.getByTestId('block-action-move-up')).toBeDisabled();
    expect(screen.getByTestId('block-action-move-up')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByTestId('block-action-move-down'));
    expect(getOrder()).toEqual(['b2', 'b1', 'b3']);
    expect(document.activeElement).toBe(screen.getByTestId('block-handle-b1'));
    expect(screen.getByTestId('block-transform-status')).toHaveTextContent(
      'Moved Heading block to position 2 of 3'
    );

    // Move Down disabled on last block; Move Up moves b3 to index 1
    fireEvent.click(screen.getByTestId('block-handle-b3'));
    expect(screen.getByTestId('block-action-move-down')).toBeDisabled();
    fireEvent.click(screen.getByTestId('block-action-move-up'));
    expect(getOrder()).toEqual(['b2', 'b3', 'b1']);

    // Alt+ArrowUp / Alt+ArrowDown on handle grip
    const b1Handle = screen.getByTestId('block-handle-b1');
    fireEvent.keyDown(b1Handle, { key: 'ArrowDown', altKey: true }); // boundary no-op
    expect(getOrder()).toEqual(['b2', 'b3', 'b1']);
    fireEvent.keyDown(b1Handle, { key: 'ArrowUp', altKey: true });
    expect(getOrder()).toEqual(['b2', 'b1', 'b3']);
    fireEvent.keyDown(b1Handle, { key: 'ArrowDown', altKey: true });
    expect(getOrder()).toEqual(['b2', 'b3', 'b1']);

    // Native Drag-and-Drop with application/x-refractor-block-id payload
    const dt = createMockDataTransfer();
    const rowB2 = screen.getByTestId('block-row-b2');
    const rowB1 = screen.getByTestId('block-row-b1');

    fireEvent.dragStart(rowB2, { dataTransfer: dt });
    expect(rowB2).toHaveAttribute('data-dragging', 'true');
    expect(dt.effectAllowed).toBe('move');
    expect(dt.getData('application/x-refractor-block-id')).toBe('b2');

    fireEvent.dragOver(rowB1, { dataTransfer: dt });
    expect(rowB1).toHaveAttribute('data-drop-target', 'true');
    expect(dt.dropEffect).toBe('move');

    // DragOver again on same target hits no-op branch; dragLeave to child keeps dropTarget
    fireEvent.dragOver(rowB1, { dataTransfer: dt });
    const innerLeave = createEvent.dragLeave(rowB1);
    Object.defineProperty(innerLeave, 'relatedTarget', {
      value: screen.getByTestId('block-body-b1'),
    });
    fireEvent(rowB1, innerLeave);
    expect(rowB1).toHaveAttribute('data-drop-target', 'true');

    // DragLeave outside clears dropTarget
    const outerLeave = createEvent.dragLeave(rowB1);
    Object.defineProperty(outerLeave, 'relatedTarget', { value: document.body });
    fireEvent(rowB1, outerLeave);
    expect(rowB1).not.toHaveAttribute('data-drop-target');

    // DragLeave on non-target row is safe no-op
    fireEvent.dragLeave(rowB2);

    // Drop onto rowB1 moves b2 -> position 3
    fireEvent.drop(rowB1, { dataTransfer: dt });
    expect(getOrder()).toEqual(['b3', 'b1', 'b2']);
    expect(screen.getByTestId('block-transform-status')).toHaveTextContent(
      'Moved Paragraph block to position 3 of 3'
    );

    // Drag-and-drop via text/plain index fallback
    const textDt = createMockDataTransfer({ 'text/plain': '2' });
    fireEvent.drop(screen.getByTestId('block-row-b3'), { dataTransfer: textDt });
    expect(getOrder()).toEqual(['b2', 'b3', 'b1']);

    // Adversarial text/plain non-numeric & empty dataTransfer payloads do nothing
    const badDt = createMockDataTransfer({ 'text/plain': 'malicious-NaN' });
    fireEvent.drop(screen.getByTestId('block-row-b3'), { dataTransfer: badDt });
    const emptyDt = createMockDataTransfer();
    fireEvent.drop(screen.getByTestId('block-row-b3'), { dataTransfer: emptyDt });
    expect(getOrder()).toEqual(['b2', 'b3', 'b1']);

    // Drag-and-drop without dataTransfer falls back to React draggedIndex state
    fireEvent.dragStart(screen.getByTestId('block-row-b1'));
    fireEvent.dragOver(screen.getByTestId('block-row-b2'));
    fireEvent.drop(screen.getByTestId('block-row-b2'));
    expect(getOrder()).toEqual(['b1', 'b2', 'b3']);

    // Drop with no draggedIndex and no dataTransfer does nothing; dragEnd clears state
    fireEvent.drop(screen.getByTestId('block-row-b2'));
    expect(getOrder()).toEqual(['b1', 'b2', 'b3']);
    fireEvent.dragStart(screen.getByTestId('block-row-b1'));
    fireEvent.dragEnd(screen.getByTestId('block-row-b1'));
    expect(screen.getByTestId('block-row-b1')).not.toHaveAttribute('data-dragging');
  });

  it('duplicates blocks with collision-safe IDs right below and deletes down to the empty status state', () => {
    const onChange = vi.fn<(blocks: DocumentBlockItem[]) => void>();
    const initial: ReadonlyArray<DocumentBlockItem> = [
      { id: 'note', kind: 'paragraph', text: 'Release notes summary' },
      { id: 'todo', kind: 'checklist', text: 'Ship v1.34', checked: true },
    ];

    render(<BlockTransformHandle defaultBlocks={initial} onChange={onChange} />);

    // Duplicate 'note' -> 'note-copy' inserted at index 1
    fireEvent.click(screen.getByTestId('block-handle-note'));
    fireEvent.click(screen.getByTestId('block-action-duplicate'));

    let ids = screen.getAllByRole('listitem').map((el) => el.getAttribute('data-block-id'));
    expect(ids).toEqual(['note', 'note-copy', 'todo']);
    expect(document.activeElement).toBe(screen.getByTestId('block-handle-note-copy'));
    expect(screen.getByTestId('block-transform-status')).toHaveTextContent(
      'Duplicated Paragraph block at position 2 of 3'
    );

    // Duplicate 'note-copy' -> collision-safe 'note-copy-2' right below 'note-copy'
    fireEvent.click(screen.getByTestId('block-handle-note-copy'));
    fireEvent.click(screen.getByTestId('block-action-duplicate'));
    ids = screen.getAllByRole('listitem').map((el) => el.getAttribute('data-block-id'));
    expect(ids).toEqual(['note', 'note-copy', 'note-copy-2', 'todo']);

    // Duplicate 'todo' checklist preserves checked: true
    fireEvent.click(screen.getByTestId('block-handle-todo'));
    fireEvent.click(screen.getByTestId('block-action-duplicate'));
    expect(screen.getByTestId('block-checkbox-todo-copy')).toHaveAttribute('aria-checked', 'true');

    // Delete blocks down to 1 block (singular) and then 0 blocks (empty status state)
    for (const id of ['note-copy-2', 'note-copy', 'todo-copy', 'todo']) {
      fireEvent.click(screen.getByTestId(`block-handle-${id}`));
      fireEvent.click(screen.getByTestId('block-action-delete'));
    }

    expect(screen.getByTestId('block-transform-count')).toHaveTextContent('1 block');
    expect(screen.getByTestId('block-transform-status')).toHaveTextContent(
      'Deleted Checklist block. 1 block remaining'
    );
    expect(document.activeElement).toBe(screen.getByTestId('block-handle-note'));

    // Delete final block -> renders clean role="status" empty state
    fireEvent.click(screen.getByTestId('block-handle-note'));
    fireEvent.click(screen.getByTestId('block-action-delete'));
    expect(screen.getByTestId('block-transform-count')).toHaveTextContent('0 blocks');
    expect(screen.getByTestId('block-transform-status')).toHaveTextContent(
      'Deleted Paragraph block. 0 blocks remaining'
    );
    expect(screen.getByRole('status')).toHaveTextContent('No document blocks');
  });

  it('supports menu keyboard navigation (ArrowDown/ArrowUp/Home/End/Tab/Escape), outside click dismissal, and IME composition safety', () => {
    render(
      <div>
        <button type="button" data-testid="outside-btn">
          Outside
        </button>
        <BlockTransformHandle />
      </div>
    );

    const firstHandle = screen.getByTestId('block-handle-block-heading');
    const secondHandle = screen.getByTestId('block-handle-block-paragraph');

    // IME composing keyDown on grip does not open menu
    const composingGripDown = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingGripDown, 'isComposing', { value: true });
    firstHandle.dispatchEvent(composingGripDown);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Non-shortcut key on grip does nothing
    fireEvent.keyDown(firstHandle, { key: 'a' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // ArrowDown on grip opens menu and focuses first enabled menuitem
    fireEvent.keyDown(firstHandle, { key: 'ArrowDown' });
    const menu = screen.getByTestId('block-menu-block-heading');
    expect(document.activeElement).toBe(within(menu).getByTestId('block-turn-into-paragraph'));

    // ArrowUp wraps to Delete (last item), then ArrowUp again moves cleanly to Duplicate
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(within(menu).getByTestId('block-action-delete'));
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(within(menu).getByTestId('block-action-duplicate'));

    // ArrowDown moves back to Delete, then wraps to Paragraph (first item)
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(within(menu).getByTestId('block-action-delete'));
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(within(menu).getByTestId('block-turn-into-paragraph'));

    // End jumps to Delete; Home jumps back to Paragraph
    fireEvent.keyDown(menu, { key: 'End' });
    expect(document.activeElement).toBe(within(menu).getByTestId('block-action-delete'));
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(document.activeElement).toBe(within(menu).getByTestId('block-turn-into-paragraph'));

    // ArrowDown when focus is outside menu focuses first item cleanly
    firstHandle.focus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(within(menu).getByTestId('block-turn-into-paragraph'));

    // IME composing Escape inside menu is ignored
    const composingMenuEsc = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingMenuEsc, 'isComposing', { value: true });
    menu.dispatchEvent(composingMenuEsc);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Unrelated key inside menu keeps menu open
    fireEvent.keyDown(menu, { key: 'a' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Escape inside menu closes it and returns focus to grip
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(firstHandle);

    // Open menu via click, test Escape directly on grip, then Tab inside menu
    fireEvent.click(firstHandle);
    fireEvent.keyDown(firstHandle, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(firstHandle);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Open menu, test mousedown inside menu & active grip stays open, outside mousedown closes
    fireEvent.click(firstHandle);
    fireEvent.mouseDown(screen.getByRole('menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(firstHandle);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(firstHandle); // clicking same grip toggles closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Open menu, non-Node event target doesn't crash, outside click closes
    fireEvent.click(firstHandle);
    fireEvent.mouseDown(screen.getByTestId('outside-btn'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Switching directly to second block's grip opens second menu
    fireEvent.click(firstHandle);
    fireEvent.mouseDown(secondHandle);
    fireEvent.click(secondHandle);
    expect(screen.getByTestId('block-menu-block-paragraph')).toBeInTheDocument();

    // Window Escape ignores composing & non-Escape keys, then dismisses cleanly
    const composingWinEsc = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingWinEsc, 'isComposing', { value: true });
    window.dispatchEvent(composingWinEsc);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(secondHandle);
  });

  it('supports controlled mode, explicit empty arrays, disabled state, duplicate ID deduplication, and custom aria-label', () => {
    const onChange = vi.fn<(blocks: DocumentBlockItem[]) => void>();

    function ControlledHarness() {
      const [items, setItems] = useState<DocumentBlockItem[]>([
        { id: 'c1', kind: 'paragraph', text: '   ' },
        { id: 'c1', kind: 'heading', text: 'Duplicate ID ignored' },
        { id: 'c2', kind: 'checklist', text: 'Controlled task', checked: false },
      ]);
      const [isDisabled, setIsDisabled] = useState(false);

      return (
        <div>
          <button type="button" data-testid="toggle-disabled" onClick={() => setIsDisabled((v) => !v)}>
            Toggle Disabled
          </button>
          <button type="button" data-testid="clear-blocks" onClick={() => setItems([])}>
            Clear
          </button>
          <BlockTransformHandle
            blocks={items}
            disabled={isDisabled}
            aria-label="Custom Document Canvas"
            onChange={(next) => {
              onChange(next);
              setItems(next);
            }}
            data-testid="controlled-root"
          />
        </div>
      );
    }

    const { unmount } = render(<ControlledHarness />);
    const root = screen.getByTestId('controlled-root');
    expect(root).toHaveAttribute('aria-label', 'Custom Document Canvas');

    // Duplicate 'c1' deduplicated to 2 rows; whitespace-only text gets clean fallback label
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByTestId('block-handle-c1')).toHaveAttribute(
      'aria-label',
      'Block actions for Paragraph block 1'
    );

    // Open menu on c1, then flip disabled -> menu auto-closes and read-only badge appears
    fireEvent.click(screen.getByTestId('block-handle-c1'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('toggle-disabled'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByTestId('block-transform-disabled-badge')).toHaveTextContent('Read-only');
    expect(screen.getByTestId('block-handle-c1')).toBeDisabled();
    expect(screen.getByTestId('block-checkbox-c2')).toBeDisabled();
    expect(screen.getByTestId('block-row-c1')).toHaveAttribute('draggable', 'false');

    // Adversarial events while disabled are blocked safely
    fireEvent.keyDown(screen.getByTestId('block-handle-c1'), { key: 'ArrowDown' });
    fireEvent.dragStart(screen.getByTestId('block-row-c1'));
    fireEvent.dragOver(screen.getByTestId('block-row-c2'));
    fireEvent.drop(screen.getByTestId('block-row-c2'));
    expect(onChange).not.toHaveBeenCalled();

    // Re-enable, mutate in controlled mode (toggle checklist + transform c1), then clear externally
    fireEvent.click(screen.getByTestId('toggle-disabled'));
    fireEvent.click(screen.getByTestId('block-checkbox-c2'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('block-checkbox-c2')).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByTestId('block-handle-c1'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('clear-blocks'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No document blocks');
    unmount();

    // Uncontrolled explicit defaultBlocks={[]} renders clean empty state immediately
    render(<BlockTransformHandle defaultBlocks={[]} data-testid="empty-default-root" />);
    expect(screen.getByTestId('empty-default-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No document blocks');
  });

  it('safely renders adversarial XSS block content as literal text without script execution', () => {
    const xss = '<script>window.__blockXss=1</script><img src=x onerror=alert(1)>';
    render(
      <BlockTransformHandle
        title={xss}
        defaultBlocks={[{ id: 'xss-1', kind: 'code', text: xss }]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('block-body-xss-1')).toHaveTextContent(xss);
  });

  it('exports extensible DocBlockKindMap and strict typed props contract', () => {
    const kindMap: DocBlockKindMap = {
      paragraph: true,
      heading: true,
      callout: true,
      checklist: true,
      quote: true,
      code: true,
    };
    const kind: DocBlockKind = 'code';
    const item: DocumentBlockItem = { id: 'snippet', kind, text: 'const x = 1;' };
    const props: BlockTransformHandleProps = {
      defaultBlocks: [item],
      title: 'Code Notes',
      disabled: false,
    };

    expect(Object.keys(kindMap)).toEqual([
      'paragraph',
      'heading',
      'callout',
      'checklist',
      'quote',
      'code',
    ]);
    expect(props.defaultBlocks?.[0]?.kind).toBe('code');
  });
});
