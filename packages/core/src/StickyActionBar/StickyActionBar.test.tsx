import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { StickyActionBar, type StickyActionItem } from './StickyActionBar';

describe('StickyActionBar', () => {
  it('renders floating optical toolbar, counter orb, live readout, all four tones, icons, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    const onCobalt = vi.fn();
    const onDelete = vi.fn();
    const onSelectAll = vi.fn();
    const onClear = vi.fn();

    const actions: StickyActionItem[] = [
      {
        id: 'publish',
        label: 'Publish',
        tone: 'primary',
        icon: <span data-testid="publish-icon">P</span>,
        onClick: onPrimary,
      },
      { id: 'export', label: 'Export', onClick: onSecondary },
      { id: 'share', label: 'Share', tone: 'cobalt', onClick: onCobalt },
      { id: 'delete', label: 'Delete', tone: 'destructive', onClick: onDelete },
    ];

    render(
      <StickyActionBar
        ref={ref}
        selectedCount={3}
        totalCount={12}
        actions={actions}
        onSelectAll={onSelectAll}
        onClearSelection={onClear}
        className="custom-bar"
        data-testid="bulk-bar"
      />
    );

    const toolbar = screen.getByTestId('bulk-bar');
    expect(ref.current).toBe(toolbar);
    expect(toolbar).toHaveAttribute('role', 'toolbar');
    expect(toolbar).toHaveAttribute('aria-label', 'Bulk selection actions');
    expect(toolbar).toHaveClass(
      'refractor-sticky-action-bar',
      'prism-crystal',
      'sticky',
      'bottom-4',
      'custom-bar'
    );
    expect(toolbar).toHaveAttribute('data-position', 'bottom');
    expect(toolbar).toHaveAttribute('data-selected-count', '3');

    const readout = screen.getByText('3 selected');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('of 12')).toBeInTheDocument();
    expect(screen.getByTestId('publish-icon')).toBeInTheDocument();

    const publishBtn = screen.getByRole('button', { name: /Publish/ });
    const exportBtn = screen.getByRole('button', { name: 'Export' });
    const shareBtn = screen.getByRole('button', { name: 'Share' });
    const deleteBtn = screen.getByRole('button', { name: 'Delete' });

    expect(publishBtn).toHaveClass('prism-btn-primary', 'disabled:cursor-not-allowed');
    expect(exportBtn).toHaveClass('prism-btn-secondary', 'disabled:cursor-not-allowed');
    expect(shareBtn).toHaveClass('prism-btn-cobalt', 'disabled:cursor-not-allowed');
    expect(deleteBtn).toHaveAttribute('data-tone', 'destructive');
    expect(deleteBtn).toHaveClass('disabled:cursor-not-allowed');

    fireEvent.click(publishBtn);
    fireEvent.click(exportBtn);
    fireEvent.click(shareBtn);
    fireEvent.click(deleteBtn);
    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(onCobalt).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onSelectAll).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('supports top and inline positions, custom selectionLabel, empty actions, and theme overrides', () => {
    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: {
            StickyActionBar: {
              className: 'theme-action-bar',
              style: { letterSpacing: '1px' },
            },
          },
        }}
      >
        <StickyActionBar
          selectedCount={5.9}
          totalCount={5}
          position="top"
          actions={[]}
          onSelectAll={vi.fn()}
          selectionLabel={(n) => `${n} layers active`}
          aria-label="Layer actions"
          className="local-bar"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginBottom: '8px' }}
          data-testid="bar"
        />
      </PrismThemeProvider>
    );

    const toolbar = screen.getByTestId('bar');
    expect(toolbar).toHaveAttribute('aria-label', 'Layer actions');
    expect(toolbar).toHaveAttribute('data-position', 'top');
    expect(toolbar).toHaveAttribute('data-selected-count', '5');
    expect(toolbar).toHaveClass(
      'refractor-sticky-action-bar',
      'sticky',
      'top-4',
      'theme-action-bar',
      'local-bar'
    );
    expect(toolbar).toHaveStyle({ letterSpacing: '1px', marginBottom: '8px' });
    expect(toolbar.style.getPropertyValue('--prism-blur-px')).toBe('20px');
    expect(screen.getByText('5 layers active')).toBeInTheDocument();
    // All items already selected -> Select all micro-control is disabled
    expect(screen.getByRole('button', { name: 'Select all' })).toBeDisabled();

    rerender(
      <StickyActionBar selectedCount={2} position="inline" actions={[]} data-testid="bar" />
    );
    const inlineBar = screen.getByTestId('bar');
    expect(inlineBar).toHaveAttribute('data-position', 'inline');
    expect(inlineBar).toHaveClass('relative');
    expect(inlineBar).not.toHaveClass('sticky');
  });

  it('hides completely when selectedCount is <= 0, NaN, or Infinity unless alwaysVisible is true (negative test)', () => {
    const actions: StickyActionItem[] = [{ id: 'a', label: 'Archive', onClick: vi.fn() }];
    const { rerender } = render(<StickyActionBar selectedCount={0} actions={actions} />);
    expect(screen.queryByRole('toolbar')).toBeNull();

    rerender(<StickyActionBar selectedCount={-4} actions={actions} />);
    expect(screen.queryByRole('toolbar')).toBeNull();

    rerender(<StickyActionBar selectedCount={NaN} actions={actions} />);
    expect(screen.queryByRole('toolbar')).toBeNull();

    rerender(<StickyActionBar selectedCount={Infinity} actions={actions} />);
    expect(screen.queryByRole('toolbar')).toBeNull();

    const onClear = vi.fn();
    rerender(
      <StickyActionBar
        selectedCount={NaN}
        totalCount={-10}
        alwaysVisible
        actions={actions}
        onClearSelection={onClear}
      />
    );
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('data-always-visible', 'true');
    expect(toolbar).toHaveAttribute('data-selected-count', '0');
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.queryByText(/of -10/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();

    // Escape when 0 items selected does not spuriously invoke onClearSelection
    fireEvent.keyDown(toolbar, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClear).not.toHaveBeenCalled();
  });

  it('blocks clicks on disabled actions and preserves disabled:cursor-not-allowed (negative test)', () => {
    const onDisabledClick = vi.fn();
    const onEnabledClick = vi.fn();

    render(
      <StickyActionBar
        selectedCount={2}
        actions={[
          {
            id: 'locked',
            label: 'Locked Delete',
            tone: 'destructive',
            disabled: true,
            onClick: onDisabledClick,
          },
          { id: 'ok', label: 'Duplicate', tone: 'secondary', onClick: onEnabledClick },
        ]}
      />
    );

    const lockedBtn = screen.getByRole('button', { name: 'Locked Delete' });
    expect(lockedBtn).toBeDisabled();
    expect(lockedBtn).toHaveClass('disabled:cursor-not-allowed');
    fireEvent.click(lockedBtn);
    expect(onDisabledClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(onEnabledClick).toHaveBeenCalledTimes(1);
  });

  it('invokes onClearSelection once on Escape from toolbar or window, and guards IME/preventDefault/non-Escape keys', () => {
    const onClear = vi.fn();
    const { rerender } = render(
      <StickyActionBar
        selectedCount={4}
        actions={[{ id: 'archive', label: 'Archive', onClick: vi.fn() }]}
        onClearSelection={onClear}
      />
    );

    const toolbar = screen.getByRole('toolbar');

    // Non-Escape keys are ignored
    fireEvent.keyDown(toolbar, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'a' });
    expect(onClear).not.toHaveBeenCalled();

    // IME composing Escape is ignored
    fireEvent.keyDown(toolbar, { key: 'Escape', isComposing: true });
    expect(onClear).not.toHaveBeenCalled();

    // Bubbling Escape on toolbar fires exactly ONCE (no duplicate global trigger)
    fireEvent.keyDown(toolbar, { key: 'Escape' });
    expect(onClear).toHaveBeenCalledTimes(1);

    // Escape from a focused child action button bubbles and fires exactly ONCE
    fireEvent.keyDown(screen.getByRole('button', { name: 'Archive' }), { key: 'Escape' });
    expect(onClear).toHaveBeenCalledTimes(2);

    // Global window Escape fires once
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClear).toHaveBeenCalledTimes(3);

    // Global IME composing Escape is ignored
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(onClear).toHaveBeenCalledTimes(3);

    // Consumer onKeyDown calling preventDefault suppresses Escape clear
    rerender(
      <StickyActionBar
        selectedCount={4}
        actions={[{ id: 'archive', label: 'Archive', onClick: vi.fn() }]}
        onClearSelection={onClear}
        onKeyDown={(e) => {
          if (e.key === 'Escape') e.preventDefault();
        }}
      />
    );
    fireEvent.keyDown(screen.getByRole('toolbar'), { key: 'Escape' });
    expect(onClear).toHaveBeenCalledTimes(3);

    // Without onClearSelection, Escape on toolbar is a safe no-op
    rerender(
      <StickyActionBar
        selectedCount={4}
        actions={[{ id: 'archive', label: 'Archive', onClick: vi.fn() }]}
      />
    );
    fireEvent.keyDown(screen.getByRole('toolbar'), { key: 'Escape' });
    expect(onClear).toHaveBeenCalledTimes(3);
  });

  it('safely renders adversarial XSS payloads in labels and custom selectionLabel as literal text', () => {
    const payload = '<script>window.__stickyXss=1</script><img src=x onerror=alert(1)>';
    render(
      <StickyActionBar
        selectedCount={1}
        selectionLabel={() => payload}
        actions={[{ id: 'xss', label: payload, onClick: vi.fn() }]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('button', { name: payload })).toHaveTextContent(payload);
    expect(screen.getAllByText(payload)).toHaveLength(2);
  });
});
