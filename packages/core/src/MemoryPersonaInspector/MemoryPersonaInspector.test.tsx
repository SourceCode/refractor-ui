import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { MemoryPersonaInspector, type AgentMemoryItem } from './index';

const INITIAL_MEMORIES: AgentMemoryItem[] = [
  {
    id: 'mem-1',
    category: 'fact',
    content: 'Workspace uses pnpm monorepo with Vitest and React 19.',
    updatedAt: '2h ago',
  },
  {
    id: 'mem-2',
    category: 'preference',
    content: 'Keep responses concise and highlight exact file paths.',
    updatedAt: '1d ago',
  },
  {
    id: 'mem-3',
    category: 'rule',
    content: 'Never introduce any or unknown TypeScript types.',
  },
];

describe('MemoryPersonaInspector', () => {
  it('renders inline prism-slab region with ref, displayName, theme overrides, counts, category badges, and optional updatedAt', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            MemoryPersonaInspector: {
              className: 'theme-memory',
              style: { letterSpacing: '0.1px' },
            },
          },
        }}
      >
        <MemoryPersonaInspector
          ref={ref}
          defaultMemories={INITIAL_MEMORIES}
          title="Agent Context Memory"
          className="local-memory"
          style={{ maxWidth: '520px' }}
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="memory-inspector"
        />
      </PrismThemeProvider>
    );

    const region = screen.getByRole('region', { name: 'Agent Context Memory' });
    expect(MemoryPersonaInspector.displayName).toBe('MemoryPersonaInspector');
    expect(ref.current).toBe(region);
    expect(region).toHaveClass(
      'refractor-memory-persona-inspector',
      'prism-slab',
      'theme-memory',
      'local-memory'
    );
    expect(region).toHaveAttribute('data-mode', 'inline');
    expect(region).toHaveAttribute('data-filter', 'all');
    expect(region).toHaveStyle({ letterSpacing: '0.1px', maxWidth: '520px' });
    expect(region.style.getPropertyValue('--prism-blur-px')).toBe('18px');

    expect(screen.getByTestId('memory-total-count')).toHaveTextContent('3');
    expect(screen.getByTestId('memory-filter-count-all')).toHaveTextContent('3');
    expect(screen.getByTestId('memory-filter-count-fact')).toHaveTextContent('1');
    expect(screen.getByTestId('memory-filter-count-preference')).toHaveTextContent('1');
    expect(screen.getByTestId('memory-filter-count-rule')).toHaveTextContent('1');

    expect(screen.getByTestId('memory-filter-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('memory-filter-fact')).toHaveAttribute('aria-pressed', 'false');

    // Category badge visual mapping: fact -> secondary, preference -> primary, rule -> emerald
    expect(screen.getByTestId('memory-category-mem-1')).toHaveClass('prism-btn-secondary');
    expect(screen.getByTestId('memory-category-mem-1')).toHaveTextContent('Fact');
    expect(screen.getByTestId('memory-category-mem-2')).toHaveClass('prism-btn-primary');
    expect(screen.getByTestId('memory-category-mem-2')).toHaveTextContent('Preference');
    expect(screen.getByTestId('memory-category-mem-3')).toHaveClass('prism-emerald');
    expect(screen.getByTestId('memory-category-mem-3')).toHaveTextContent('Rule');

    // Optional updatedAt
    expect(screen.getByTestId('memory-updated-mem-1')).toHaveTextContent('2h ago');
    expect(screen.queryByTestId('memory-updated-mem-3')).not.toBeInTheDocument();

    expect(screen.getByTestId('memory-content-mem-1')).toHaveTextContent(
      'Workspace uses pnpm monorepo with Vitest and React 19.'
    );
  });

  it('filters memories by category pills and renders clean empty state when no memories match', () => {
    render(
      <MemoryPersonaInspector
        defaultMemories={[
          { id: 'f1', category: 'fact', content: 'Project targets Node 22.' },
        ]}
      />
    );

    const factsBtn = screen.getByTestId('memory-filter-fact');
    const prefsBtn = screen.getByTestId('memory-filter-preference');
    const rulesBtn = screen.getByTestId('memory-filter-rule');
    const allBtn = screen.getByTestId('memory-filter-all');

    fireEvent.click(factsBtn);
    expect(factsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(allBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('memory-item-f1')).toBeInTheDocument();

    fireEvent.click(prefsBtn);
    expect(prefsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('memory-item-f1')).not.toBeInTheDocument();
    expect(screen.getByTestId('memory-empty-state')).toHaveTextContent('No matching memories');

    fireEvent.click(rulesBtn);
    expect(rulesBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('memory-empty-state')).toHaveTextContent('No matching memories');

    fireEvent.click(allBtn);
    expect(screen.getByTestId('memory-item-f1')).toBeInTheDocument();
  });

  it('supports inline editing with prism-well input, IME-safe Enter, Escape cancel, explicit Save/Cancel, and ignores blank edits', () => {
    const onMemoriesChange = vi.fn<(items: AgentMemoryItem[]) => void>();

    render(
      <MemoryPersonaInspector
        defaultMemories={INITIAL_MEMORIES}
        onMemoriesChange={onMemoriesChange}
      />
    );

    // Enter edit mode on mem-1
    fireEvent.click(screen.getByRole('button', { name: 'Edit memory mem-1' }));
    const editInput = screen.getByTestId('memory-edit-input-mem-1');
    expect(editInput).toHaveClass('prism-well');
    expect(editInput).toHaveValue('Workspace uses pnpm monorepo with Vitest and React 19.');

    // Blank edit via Enter and Save button is ignored
    fireEvent.change(editInput, { target: { value: '    ' } });
    fireEvent.keyDown(editInput, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onMemoriesChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('memory-edit-input-mem-1')).toBeInTheDocument();

    // IME composing Enter is ignored
    fireEvent.change(editInput, { target: { value: '  Updated workspace fact  ' } });
    fireEvent.keyDown(editInput, { key: 'Enter', isComposing: true });
    expect(onMemoriesChange).not.toHaveBeenCalled();

    // Non-Enter/non-Escape key does nothing
    fireEvent.keyDown(editInput, { key: 'a' });
    expect(screen.getByTestId('memory-edit-input-mem-1')).toBeInTheDocument();

    // Normal Enter saves trimmed content
    fireEvent.keyDown(editInput, { key: 'Enter' });
    expect(onMemoriesChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('memory-edit-input-mem-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('memory-content-mem-1')).toHaveTextContent(
      'Updated workspace fact'
    );

    // Escape cancels edit without mutating content
    fireEvent.click(screen.getByRole('button', { name: 'Edit memory mem-2' }));
    const editInput2 = screen.getByTestId('memory-edit-input-mem-2');
    fireEvent.change(editInput2, { target: { value: 'Discarded edit' } });
    fireEvent.keyDown(editInput2, { key: 'Escape' });
    expect(screen.queryByTestId('memory-edit-input-mem-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('memory-content-mem-2')).toHaveTextContent(
      'Keep responses concise and highlight exact file paths.'
    );
    expect(onMemoriesChange).toHaveBeenCalledTimes(1);

    // Explicit Cancel button cancels edit, and explicit Save button commits edit
    fireEvent.click(screen.getByRole('button', { name: 'Edit memory mem-3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('memory-edit-input-mem-3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit memory mem-3' }));
    fireEvent.change(screen.getByTestId('memory-edit-input-mem-3'), {
      target: { value: 'Strict zero any/unknown policy.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByTestId('memory-content-mem-3')).toHaveTextContent(
      'Strict zero any/unknown policy.'
    );
    expect(onMemoriesChange).toHaveBeenCalledTimes(2);
  });

  it('forgets memories immediately and adds new memories across fact, preference, and rule with IME-safe Enter and blank-ignore', () => {
    const onMemoriesChange = vi.fn<(items: AgentMemoryItem[]) => void>();

    render(
      <MemoryPersonaInspector
        defaultMemories={[
          { id: 'memory-1', category: 'fact', content: 'Pre-existing colliding ID fact.' },
        ]}
        onMemoriesChange={onMemoriesChange}
      />
    );

    const categorySelect = screen.getByRole('combobox', { name: 'Memory category' });
    const addInput = screen.getByRole('textbox', { name: 'Add memory' });
    const addBtn = screen.getByRole('button', { name: 'Add' });

    // Blank submission ignored via button and Enter
    fireEvent.change(addInput, { target: { value: '   ' } });
    fireEvent.click(addBtn);
    fireEvent.keyDown(addInput, { key: 'Enter' });
    expect(onMemoriesChange).not.toHaveBeenCalled();

    // IME composing Enter ignored
    fireEvent.change(addInput, { target: { value: 'Prefer dark obsidian theme.' } });
    fireEvent.change(categorySelect, { target: { value: 'preference' } });
    fireEvent.keyDown(addInput, { key: 'Enter', isComposing: true });
    expect(onMemoriesChange).not.toHaveBeenCalled();

    // Normal Enter adds preference and avoids colliding with existing 'memory-1'
    fireEvent.keyDown(addInput, { key: 'Enter' });
    expect(onMemoriesChange).toHaveBeenCalledTimes(1);
    expect(addInput).toHaveValue('');
    expect(screen.getByTestId('memory-item-memory-2')).toBeInTheDocument();
    expect(screen.getByTestId('memory-category-memory-2')).toHaveTextContent('Preference');

    // Add a rule via Add button
    fireEvent.change(categorySelect, { target: { value: 'rule' } });
    fireEvent.change(addInput, { target: { value: '  Always run strict lint before commit.  ' } });
    fireEvent.click(addBtn);
    expect(screen.getByTestId('memory-content-memory-3')).toHaveTextContent(
      'Always run strict lint before commit.'
    );
    expect(screen.getByTestId('memory-category-memory-3')).toHaveClass('prism-emerald');

    // Switch back to fact category via select (covers fallback parseMemoryCategory branch)
    fireEvent.change(categorySelect, { target: { value: 'fact' } });
    fireEvent.change(addInput, { target: { value: 'Default branch is main.' } });
    fireEvent.click(addBtn);
    expect(screen.getByTestId('memory-category-memory-4')).toHaveTextContent('Fact');
    expect(screen.getByTestId('memory-total-count')).toHaveTextContent('4');

    // Forget removes target memory immediately
    fireEvent.click(screen.getByRole('button', { name: 'Forget memory memory-1' }));
    expect(screen.queryByTestId('memory-item-memory-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('memory-total-count')).toHaveTextContent('3');
  });

  it('supports drawer mode with controlled/uncontrolled open state, backdrop click, close button, and Escape dismissal without closing during active edit', () => {
    const { container: closedContainer } = render(
      <MemoryPersonaInspector mode="drawer" defaultOpen={false} />
    );
    expect(closedContainer.firstChild).toBeNull();

    function ControlledDrawerHarness() {
      const [open, setOpen] = useState<boolean>(true);
      const [items, setItems] = useState<AgentMemoryItem[]>(INITIAL_MEMORIES);

      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Reopen Inspector
          </button>
          <MemoryPersonaInspector
            mode="drawer"
            open={open}
            onOpenChange={setOpen}
            memories={items}
            onMemoriesChange={setItems}
          />
        </div>
      );
    }

    render(<ControlledDrawerHarness />);

    const dialog = screen.getByRole('dialog', { name: 'Memory & Persona' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('data-mode', 'drawer');

    // Clicking inside panel does NOT close drawer
    fireEvent.click(screen.getByTestId('memory-drawer-panel'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Pressing Escape while editing cancels edit WITHOUT closing drawer
    fireEvent.click(screen.getByRole('button', { name: 'Edit memory mem-1' }));
    fireEvent.keyDown(screen.getByTestId('memory-edit-input-mem-1'), { key: 'Escape' });
    expect(screen.queryByTestId('memory-edit-input-mem-1')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Composing Escape does NOT close drawer
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Normal Escape closes drawer when not editing
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reopen and close via backdrop click
    fireEvent.click(screen.getByRole('button', { name: 'Reopen Inspector' }));
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reopen and close via close button
    fireEvent.click(screen.getByRole('button', { name: 'Reopen Inspector' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close memory inspector' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides Edit, Forget, and Add Memory controls in readOnly mode and displays clean empty state when no memories exist (negative test)', () => {
    const { rerender } = render(
      <MemoryPersonaInspector defaultMemories={INITIAL_MEMORIES} readOnly />
    );

    expect(screen.getByTestId('memory-readonly-badge')).toHaveTextContent('Read-only');
    expect(screen.queryByRole('button', { name: /Edit memory/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Forget memory/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('memory-add-row')).not.toBeInTheDocument();

    rerender(<MemoryPersonaInspector memories={[]} readOnly />);
    expect(screen.getByTestId('memory-empty-state')).toHaveTextContent(
      'No agent memories are available to inspect.'
    );

    rerender(<MemoryPersonaInspector memories={[]} readOnly={false} />);
    expect(screen.getByTestId('memory-empty-state')).toHaveTextContent(
      'Add a fact, preference, or rule below to persist guidance.'
    );
  });

  it('renders XSS payloads in title, content, and updatedAt as escaped literal text (adversarial test)', () => {
    const payload = '<script>window.__memoryXss=1</script><img src=x onerror=alert(1)>';

    render(
      <MemoryPersonaInspector
        title={payload}
        defaultMemories={[
          {
            id: 'xss-1',
            category: 'rule',
            content: payload,
            updatedAt: payload,
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('region', { name: payload })).toBeInTheDocument();
    expect(screen.getByTestId('memory-content-xss-1')).toHaveTextContent(payload);
    expect(screen.getByTestId('memory-updated-xss-1')).toHaveTextContent(payload);
  });
});
