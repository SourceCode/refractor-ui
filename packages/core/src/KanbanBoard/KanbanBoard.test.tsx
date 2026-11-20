import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  KanbanBoard,
  type KanbanCardItem,
  type KanbanColumnDef,
} from './index';

const BASE_COLUMNS: ReadonlyArray<KanbanColumnDef> = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'progress', title: 'In Progress', wipLimit: 2 },
  { id: 'done', title: 'Shipped' },
];

const BASE_CARDS: ReadonlyArray<KanbanCardItem> = [
  {
    id: 'c1',
    columnId: 'backlog',
    title: 'Design token cascade',
    description: 'Align refraction variables across themes.',
    assignee: 'Ava Chen',
    priority: 'critical',
    tags: ['tokens', 'optics', 'tokens', '   '],
  },
  {
    id: 'c2',
    columnId: 'progress',
    title: 'Audit focus rings',
    assignee: 'Marcus',
    priority: 'high',
    tags: ['a11y'],
  },
  {
    id: 'c3',
    columnId: 'progress',
    title: 'Polish slab shadows',
    priority: 'low',
  },
  {
    id: 'c4',
    columnId: 'done',
    title: 'Ship CLI scaffolding',
  },
];

describe('KanbanBoard', () => {
  it('renders columns, cards, priorities, tags, assignee pills, overrides, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onCardSelect = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            KanbanBoard: { className: 'theme-kanban', style: { paddingTop: '6px' } },
          },
        }}
      >
        <KanbanBoard
          ref={ref}
          columns={BASE_COLUMNS}
          defaultCards={BASE_CARDS}
          onCardSelect={onCardSelect}
          className="custom-board"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="board"
        />
      </PrismThemeProvider>
    );

    const board = screen.getByTestId('board');
    expect(ref.current).toBe(board);
    expect(board).toHaveClass('refractor-kanban-board', 'theme-kanban', 'custom-board');
    expect(board).toHaveAttribute('data-column-count', '3');
    expect(board).toHaveAttribute('data-card-count', '4');
    expect(board).toHaveStyle({ paddingTop: '6px' });

    const backlogCol = screen.getByRole('region', { name: 'Backlog' });
    expect(backlogCol).toHaveClass('prism-slab', 'refractor-kanban-board__column');
    expect(within(backlogCol).getByText('1')).toBeInTheDocument();
    expect(within(backlogCol).getByText('Design token cascade')).toBeInTheDocument();
    expect(within(backlogCol).getByText('Align refraction variables across themes.')).toBeInTheDocument();
    expect(within(backlogCol).getByText('Ava Chen')).toBeInTheDocument();
    expect(within(backlogCol).getAllByText('tokens')).toHaveLength(2);
    expect(within(backlogCol).getByText('optics')).toBeInTheDocument();

    const progressCol = screen.getByRole('region', { name: 'In Progress' });
    expect(within(progressCol).getByText('2/2')).toBeInTheDocument();
    expect(progressCol).not.toHaveAttribute('data-wip-exceeded');

    fireEvent.click(screen.getByRole('button', { name: 'Design token cascade' }));
    expect(onCardSelect).toHaveBeenCalledTimes(1);
    expect(onCardSelect).toHaveBeenCalledWith(BASE_CARDS[0]);
  });

  it('flags WIP limit overflow and handles negative or non-finite wipLimit safely', () => {
    const columns: KanbanColumnDef[] = [
      { id: 'active', title: 'Active', wipLimit: 1 },
      { id: 'invalid', title: 'Invalid Limit', wipLimit: -3 },
      { id: 'empty', title: 'Empty' },
    ];
    const cards: KanbanCardItem[] = [
      { id: 'a1', columnId: 'active', title: 'Task One', priority: 'medium' },
      { id: 'a2', columnId: 'active', title: 'Task Two', priority: 'high' },
      { id: 'i1', columnId: 'invalid', title: 'Task Three' },
    ];

    render(<KanbanBoard columns={columns} defaultCards={cards} />);

    const activeCol = screen.getByRole('region', { name: 'Active' });
    expect(activeCol).toHaveAttribute('data-wip-exceeded', 'true');
    expect(within(activeCol).getByText('2/1')).toBeInTheDocument();
    expect(within(activeCol).getByText('WIP limit exceeded')).toBeInTheDocument();

    const invalidCol = screen.getByRole('region', { name: 'Invalid Limit' });
    expect(invalidCol).not.toHaveAttribute('data-wip-exceeded');
    expect(within(invalidCol).getByText('1')).toBeInTheDocument();

    const emptyCol = screen.getByRole('region', { name: 'Empty' });
    expect(within(emptyCol).getByText('Drop cards here')).toBeInTheDocument();
  });

  it('supports keyboard Move Left / Move Right buttons and disables edge directions', () => {
    const onCardMove = vi.fn();
    const onCardsChange = vi.fn();

    render(
      <KanbanBoard
        columns={BASE_COLUMNS}
        defaultCards={BASE_CARDS}
        onCardMove={onCardMove}
        onCardsChange={onCardsChange}
      />
    );

    const moveLeftFirst = screen.getByRole('button', { name: 'Move Design token cascade left' });
    expect(moveLeftFirst).toBeDisabled();

    const moveRightLast = screen.getByRole('button', { name: 'Move Ship CLI scaffolding right' });
    expect(moveRightLast).toBeDisabled();

    // Move c1 from Backlog -> In Progress (triggers WIP overflow 3/2!)
    const moveRightFirst = screen.getByRole('button', {
      name: 'Move Design token cascade right to In Progress',
    });
    fireEvent.click(moveRightFirst);

    expect(onCardMove).toHaveBeenCalledWith('c1', 'backlog', 'progress');
    expect(onCardsChange).toHaveBeenCalledTimes(1);

    const progressCol = screen.getByRole('region', { name: 'In Progress' });
    expect(progressCol).toHaveAttribute('data-wip-exceeded', 'true');
    expect(within(progressCol).getByText('3/2')).toBeInTheDocument();

    // Move c1 back left -> Backlog
    const moveBack = screen.getByRole('button', {
      name: 'Move Design token cascade left to Backlog',
    });
    fireEvent.click(moveBack);
    expect(onCardMove).toHaveBeenLastCalledWith('c1', 'progress', 'backlog');
    expect(progressCol).not.toHaveAttribute('data-wip-exceeded');
  });

  it('supports HTML5 drag-and-drop with drop-zone highlighting, dragLeave, and dragEnd', () => {
    const onCardMove = vi.fn();
    const setData = vi.fn();
    let storedId = '';

    render(
      <KanbanBoard
        columns={BASE_COLUMNS}
        defaultCards={BASE_CARDS}
        onCardMove={onCardMove}
      />
    );

    const cardEl = screen.getByRole('article', { name: 'Design token cascade' });
    const doneCol = screen.getByRole('region', { name: 'Shipped' });
    const backlogCol = screen.getByRole('region', { name: 'Backlog' });

    fireEvent.dragStart(cardEl, {
      dataTransfer: {
        effectAllowed: 'none',
        setData: (type: string, val: string) => {
          setData(type, val);
          storedId = val;
        },
      },
    });
    expect(setData).toHaveBeenCalledWith('text/plain', 'c1');
    expect(cardEl).toHaveAttribute('data-dragging', 'true');

    // Drag over done column highlights it (repeated dragOver stays highlighted)
    fireEvent.dragOver(doneCol, { dataTransfer: { dropEffect: 'none' } });
    fireEvent.dragOver(doneCol, { dataTransfer: { dropEffect: 'none' } });
    expect(doneCol).toHaveAttribute('data-drop-target', 'true');

    // Drag leave on a non-target column preserves active drop target
    fireEvent.dragLeave(backlogCol);
    expect(doneCol).toHaveAttribute('data-drop-target', 'true');

    // Dragging over a child element keeps highlight; leaving column clears highlight
    const doneHeader = within(doneCol).getByText('Shipped');
    const innerLeave = createEvent.dragLeave(doneCol);
    Object.defineProperty(innerLeave, 'relatedTarget', { value: doneHeader });
    fireEvent(doneCol, innerLeave);
    expect(doneCol).toHaveAttribute('data-drop-target', 'true');

    const outerLeave = createEvent.dragLeave(doneCol);
    Object.defineProperty(outerLeave, 'relatedTarget', { value: backlogCol });
    fireEvent(doneCol, outerLeave);
    expect(doneCol).not.toHaveAttribute('data-drop-target');

    // Drag over again and drop onto done column
    fireEvent.dragOver(doneCol);
    fireEvent.drop(doneCol, {
      dataTransfer: {
        getData: (type: string) => (type === 'text/plain' ? storedId : ''),
      },
    });

    expect(onCardMove).toHaveBeenCalledWith('c1', 'backlog', 'done');
    expect(doneCol).not.toHaveAttribute('data-drop-target');
    expect(within(doneCol).getByText('Design token cascade')).toBeInTheDocument();

    // Drag without dataTransfer falls back to draggedCardId, and dragEnd clears state
    const card2 = screen.getByRole('article', { name: 'Audit focus rings' });
    fireEvent.dragStart(card2);
    expect(card2).toHaveAttribute('data-dragging', 'true');
    fireEvent.dragEnd(card2);
    expect(card2).not.toHaveAttribute('data-dragging');

    // Drop fallback using draggedCardId when dataTransfer is absent
    fireEvent.dragStart(card2);
    fireEvent.drop(doneCol);
    expect(onCardMove).toHaveBeenCalledWith('c2', 'progress', 'done');
  });

  it('rejects drops to nonexistent column IDs, nonexistent card IDs, and same-column drops (adversarial)', () => {
    const onCardMove = vi.fn();
    const onCardsChange = vi.fn();

    render(
      <KanbanBoard
        columns={BASE_COLUMNS}
        defaultCards={[
          ...BASE_CARDS,
          { id: 'orphan', columnId: 'deleted-col', title: 'Orphan card' },
        ]}
        onCardMove={onCardMove}
        onCardsChange={onCardsChange}
      />
    );

    expect(screen.queryByText('Orphan card')).not.toBeInTheDocument();

    const backlogCol = screen.getByRole('region', { name: 'Backlog' });
    const doneCol = screen.getByRole('region', { name: 'Shipped' });

    // Nonexistent target column override in transfer payload
    fireEvent.drop(doneCol, {
      dataTransfer: {
        getData: (type: string) =>
          type === 'text/plain'
            ? 'c1'
            : type === 'application/x-refractor-column'
              ? 'nonexistent-column'
              : '',
      },
    });
    expect(onCardMove).not.toHaveBeenCalled();
    expect(onCardsChange).not.toHaveBeenCalled();

    // Nonexistent card ID
    fireEvent.drop(doneCol, {
      dataTransfer: {
        getData: (type: string) => (type === 'text/plain' ? 'missing-card-id' : ''),
      },
    });
    expect(onCardMove).not.toHaveBeenCalled();

    // Same-column drop is a no-op
    fireEvent.drop(backlogCol, {
      dataTransfer: {
        getData: (type: string) => (type === 'text/plain' ? 'c1' : ''),
      },
    });
    expect(onCardMove).not.toHaveBeenCalled();
    expect(onCardsChange).not.toHaveBeenCalled();

    // Drop with no active dragged card and empty dataTransfer
    fireEvent.drop(doneCol);
    expect(onCardMove).not.toHaveBeenCalled();
  });

  it('supports IME-safe inline Quick Add, form submit, ID collision avoidance, and rejects whitespace titles', () => {
    const onCardAdd = vi.fn();
    const onCardsChange = vi.fn();

    render(
      <KanbanBoard
        columns={BASE_COLUMNS}
        defaultCards={[
          { id: 'kanban-card-1', columnId: 'backlog', title: 'Existing generated id' },
        ]}
        onCardAdd={onCardAdd}
        onCardsChange={onCardsChange}
      />
    );

    const input = screen.getByLabelText('Quick add card to Backlog');
    const addBtn = screen.getByRole('button', { name: 'Add card to Backlog' });
    expect(addBtn).toBeDisabled();

    // Whitespace-only submission via Enter and direct form submit is rejected; non-Enter keys ignored
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.change(input, { target: { value: '    ' } });
    expect(addBtn).toBeDisabled();
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.submit(input.closest('form')!);
    expect(onCardAdd).not.toHaveBeenCalled();

    // IME composition Enter is safely ignored
    fireEvent.change(input, { target: { value: 'Japanese IME Draft' } });
    const composingEnter = createEvent.keyDown(input, { key: 'Enter' });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(input, composingEnter);
    expect(onCardAdd).not.toHaveBeenCalled();

    // Non-composing Enter commits new card and skips colliding ID kanban-card-1
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCardAdd).toHaveBeenCalledWith('backlog', 'Japanese IME Draft');
    expect(screen.getByText('Japanese IME Draft')).toBeInTheDocument();
    expect(input).toHaveValue('');

    // Form submit button also commits cleanly
    fireEvent.change(input, { target: { value: '  Second Quick Task  ' } });
    expect(addBtn).toBeEnabled();
    fireEvent.click(addBtn);
    expect(onCardAdd).toHaveBeenLastCalledWith('backlog', 'Second Quick Task');
    expect(screen.getByText('Second Quick Task')).toBeInTheDocument();
  });

  it('hides quick add when allowQuickAdd is false and supports controlled mode & empty columns', () => {
    function ControlledHarness() {
      const [cards, setCards] = useState<KanbanCardItem[]>([
        { id: 'ctrl-1', columnId: 'backlog', title: 'Controlled item' },
      ]);
      return (
        <KanbanBoard
          columns={BASE_COLUMNS}
          cards={cards}
          onCardsChange={setCards}
          allowQuickAdd={false}
        />
      );
    }

    const { rerender } = render(<ControlledHarness />);
    expect(screen.queryByLabelText('Quick add card to Backlog')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Move Controlled item right to In Progress' })
    );
    const progressCol = screen.getByRole('region', { name: 'In Progress' });
    expect(within(progressCol).getByText('Controlled item')).toBeInTheDocument();

    rerender(<KanbanBoard columns={[]} defaultCards={[]} />);
    expect(screen.getByText('No workflow columns configured.')).toBeInTheDocument();
  });

  it('defends against XSS payloads, duplicate column IDs, and prototype-polluting column keys', () => {
    const xss = '<script>window.__kanbanXss=1</script><img src=x onerror=alert(1)>';
    const columns: KanbanColumnDef[] = [
      { id: '__proto__', title: xss },
      { id: '__proto__', title: 'Duplicate Ignored' },
      { id: 'constructor', title: 'Constructor Stage' },
    ];
    const cards: KanbanCardItem[] = [
      {
        id: 'xss-1',
        columnId: '__proto__',
        title: xss,
        description: xss,
        assignee: xss,
        tags: [xss],
      },
    ];

    render(<KanbanBoard columns={columns} defaultCards={cards} />);

    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByText('Duplicate Ignored')).not.toBeInTheDocument();
    expect(screen.getAllByText(xss).length).toBeGreaterThanOrEqual(4);
    expect(({} as Record<string, string>)['xss-1']).toBeUndefined();
  });
});
