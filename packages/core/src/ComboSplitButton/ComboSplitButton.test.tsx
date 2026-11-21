import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ComboSplitButton, type ComboSplitAction } from './ComboSplitButton';

function buildActions(perActionSpy?: () => void): ComboSplitAction[] {
  return [
    {
      id: 'staging',
      label: 'Deploy to Staging',
      description: 'Run canary smoke checks',
      icon: <span data-testid="action-icon-staging">S</span>,
      onSelect: perActionSpy,
    },
    {
      id: 'locked',
      label: 'Locked Action',
      description: 'Requires admin role',
      disabled: true,
    },
    {
      id: 'schedule',
      label: 'Schedule Release',
    },
    {
      id: 'rollback',
      label: 'Force Rollback',
      description: 'Immediately revert production',
      icon: <span data-testid="action-icon-rollback">!</span>,
      destructive: true,
    },
  ];
}

describe('ComboSplitButton', () => {
  it('invokes primary action, selects enabled actions (both callbacks), styles destructive items, and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onPrimaryClick = vi.fn();
    const onActionSelect = vi.fn();
    const perActionSelect = vi.fn();
    const actions = buildActions(perActionSelect);

    render(
      <ComboSplitButton
        ref={ref}
        label="Deploy"
        icon={<span data-testid="primary-icon">*</span>}
        onPrimaryClick={onPrimaryClick}
        actions={actions}
        onActionSelect={onActionSelect}
        className="custom-combo"
        style={{ marginTop: '4px' }}
        xstyle={{ '--prism-blur-px': '20px' }}
        data-testid="combo-root"
      />
    );

    const root = screen.getByTestId('combo-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-combo-split-button', 'custom-combo');
    expect(root).toHaveAttribute('data-tone', 'primary');
    expect(root).toHaveAttribute('data-size', 'md');
    expect(root).not.toHaveAttribute('data-open');

    expect(screen.getByRole('group', { name: 'Deploy' })).toBeInTheDocument();
    expect(screen.getByTestId('primary-icon')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deploy' }));
    expect(onPrimaryClick).toHaveBeenCalledTimes(1);

    const trigger = screen.getByRole('button', { name: 'More actions' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'More actions' });
    expect(menu).toHaveClass('prism-slab');
    expect(trigger).toHaveAttribute('aria-controls', menu.id);
    expect(root).toHaveAttribute('data-open', 'true');

    // Destructive item uses semantic --prism-rose-* / --prism-error-* tokens
    const destructiveItem = screen.getByRole('menuitem', { name: /Force Rollback/ });
    expect(destructiveItem).toHaveAttribute('data-destructive', 'true');
    expect(destructiveItem.style.color).toContain('--prism-rose-text');
    expect(destructiveItem.style.color).toContain('--prism-error-main');
    expect(screen.getByTestId('action-icon-rollback')).toBeInTheDocument();

    // Disabled menu item cannot fire
    const disabledItem = screen.getByRole('menuitem', { name: /Locked Action/ });
    expect(disabledItem).toBeDisabled();
    expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(disabledItem);
    expect(onActionSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Enabled menu item invokes both per-action onSelect and onActionSelect, then closes menu
    const stagingItem = screen.getByRole('menuitem', { name: /Deploy to Staging/ });
    expect(screen.getByTestId('action-icon-staging')).toBeInTheDocument();
    expect(screen.getByText('Run canary smoke checks')).toBeInTheDocument();
    fireEvent.click(stagingItem);

    expect(perActionSelect).toHaveBeenCalledTimes(1);
    expect(onActionSelect).toHaveBeenCalledTimes(1);
    expect(onActionSelect).toHaveBeenCalledWith(actions[0]);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('supports secondary tone, sm/md/lg sizes, custom menuLabel, and PrismThemeProvider overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: {
            ComboSplitButton: { className: 'theme-combo', style: { zIndex: 30 } },
          },
        }}
      >
        <ComboSplitButton
          label="Export CSV"
          tone="secondary"
          size="sm"
          menuLabel="Export formats"
          actions={[{ id: 'json', label: 'Export JSON' }]}
          data-testid="combo-sm"
        />
        <ComboSplitButton
          label="Publish All"
          tone="primary"
          size="lg"
          actions={[{ id: 'draft', label: 'Save Draft' }]}
          data-testid="combo-lg"
        />
      </PrismThemeProvider>
    );

    const smRoot = screen.getByTestId('combo-sm');
    expect(smRoot).toHaveClass('refractor-combo-split-button', 'theme-combo');
    expect(smRoot).toHaveAttribute('data-tone', 'secondary');
    expect(smRoot).toHaveAttribute('data-size', 'sm');
    expect(smRoot).toHaveStyle({ zIndex: '30' });
    expect(screen.getByRole('group', { name: 'Export CSV' })).toHaveClass(
      'prism-btn-secondary',
      'h-9'
    );
    expect(screen.getByRole('button', { name: 'Export formats' })).toBeInTheDocument();

    const lgRoot = screen.getByTestId('combo-lg');
    expect(lgRoot).toHaveAttribute('data-size', 'lg');
    expect(screen.getByRole('group', { name: 'Publish All' })).toHaveClass(
      'prism-btn-primary',
      'h-14'
    );
  });

  it('supports ArrowDown, ArrowUp, Home, End keyboard traversal across enabled items, Escape focus return, IME safety, and outside click', () => {
    const onKeyDown = vi.fn();
    const actions = buildActions();

    render(
      <div>
        <div data-testid="outside">Outside surface</div>
        <ComboSplitButton
          label="Run Pipeline"
          actions={actions}
          onKeyDown={onKeyDown}
          data-testid="kbd-combo"
        />
      </div>
    );

    const root = screen.getByTestId('kbd-combo');
    const trigger = screen.getByRole('button', { name: 'More actions' });

    // IME composing keydown must not open the menu
    trigger.focus();
    const composingOpen = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    Object.defineProperty(composingOpen, 'isComposing', { value: true });
    trigger.dispatchEvent(composingOpen);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // ArrowDown on closed trigger opens menu and focuses first enabled item
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    const staging = screen.getByRole('menuitem', { name: /Deploy to Staging/ });
    const schedule = screen.getByRole('menuitem', { name: /Schedule Release/ });
    const rollback = screen.getByRole('menuitem', { name: /Force Rollback/ });

    expect(document.activeElement).toBe(staging);

    // ArrowDown skips disabled "Locked Action" -> focuses "Schedule Release"
    fireEvent.keyDown(staging, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(schedule);

    // ArrowDown -> focuses "Force Rollback"
    fireEvent.keyDown(schedule, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(rollback);

    // ArrowDown wraps to first enabled item ("Deploy to Staging")
    fireEvent.keyDown(rollback, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(staging);

    // ArrowUp wraps backwards to last enabled item ("Force Rollback")
    fireEvent.keyDown(staging, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(rollback);

    // ArrowUp moves to "Schedule Release"
    fireEvent.keyDown(rollback, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(schedule);

    // Home focuses first enabled item; End focuses last enabled item
    fireEvent.keyDown(schedule, { key: 'Home' });
    expect(document.activeElement).toBe(staging);

    fireEvent.keyDown(staging, { key: 'End' });
    expect(document.activeElement).toBe(rollback);

    // Unrelated key leaves menu open
    fireEvent.keyDown(rollback, { key: 'a' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // IME composing Escape does not close menu
    const composingEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(composingEsc, 'isComposing', { value: true });
    rollback.dispatchEvent(composingEsc);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Escape closes menu and returns focus to trigger
    fireEvent.keyDown(rollback, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);

    // ArrowUp on closed trigger opens menu and focuses last enabled item
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: /Force Rollback/ })
    );

    // Clicking inside keeps menu open; outside mousedown closes menu
    fireEvent.mouseDown(root);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Open by clicking trigger (focus stays on trigger), then ArrowDown / ArrowUp starts from first / last
    fireEvent.click(trigger);
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: /Deploy to Staging/ })
    );

    fireEvent.click(trigger); // close
    fireEvent.click(trigger); // reopen
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: /Force Rollback/ })
    );

    expect(onKeyDown).toHaveBeenCalled();
  });

  it('handles disabled state, empty actions, and all-disabled actions safely (negative/edge cases)', () => {
    const onPrimaryClick = vi.fn();
    const onActionSelect = vi.fn();

    render(
      <>
        <ComboSplitButton
          label="Frozen"
          disabled
          onPrimaryClick={onPrimaryClick}
          actions={buildActions()}
          onActionSelect={onActionSelect}
          data-testid="disabled-combo"
        />
        <ComboSplitButton label="Solo" actions={[]} data-testid="empty-combo" />
        <ComboSplitButton
          label="All Locked"
          actions={[
            { id: 'a', label: 'Locked A', disabled: true },
            { id: 'b', label: 'Locked B', disabled: true },
          ]}
          onActionSelect={onActionSelect}
          menuLabel="All locked menu"
          data-testid="all-disabled-combo"
        />
      </>
    );

    const disabledRoot = screen.getByTestId('disabled-combo');
    expect(disabledRoot).toHaveAttribute('data-disabled', 'true');
    const frozenPrimary = screen.getByRole('button', { name: 'Frozen' });
    const frozenTrigger = disabledRoot.querySelector('button[aria-haspopup="menu"]');
    expect(frozenPrimary).toBeDisabled();
    expect(frozenTrigger).toBeDisabled();

    fireEvent.click(frozenPrimary);
    if (frozenTrigger) {
      fireEvent.click(frozenTrigger);
      fireEvent.keyDown(frozenTrigger, { key: 'ArrowDown' });
    }
    expect(onPrimaryClick).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Empty actions: primary works without onPrimaryClick; trigger is disabled
    const soloPrimary = screen.getByRole('button', { name: 'Solo' });
    const soloTrigger = screen
      .getByTestId('empty-combo')
      .querySelector('button[aria-haspopup="menu"]');
    expect(soloPrimary).not.toBeDisabled();
    expect(soloTrigger).toBeDisabled();
    fireEvent.click(soloPrimary);

    // All-disabled actions: menu opens, arrow/Home/End no-op safely without throwing
    const lockedTrigger = screen.getByRole('button', { name: 'All locked menu' });
    fireEvent.click(lockedTrigger);
    expect(screen.getByRole('menu', { name: 'All locked menu' })).toBeInTheDocument();
    fireEvent.keyDown(lockedTrigger, { key: 'ArrowDown' });
    fireEvent.keyDown(lockedTrigger, { key: 'ArrowUp' });
    fireEvent.keyDown(lockedTrigger, { key: 'Home' });
    fireEvent.keyDown(lockedTrigger, { key: 'End' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Locked A' }));
    expect(onActionSelect).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS strings safely as literal text without script execution', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <ComboSplitButton
        label={payload}
        menuLabel={payload}
        actions={[{ id: 'xss', label: payload, description: payload }]}
      />
    );

    const buttons = screen.getAllByRole('button', { name: payload });
    expect(buttons[0]).toHaveTextContent(payload);
    fireEvent.click(buttons[1]!);
    expect(screen.getByRole('menuitem')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
