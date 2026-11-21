import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  SpeedDialButton,
  type SpeedDialAction,
  type SpeedDialDirection,
} from './SpeedDialButton';

function createActions(overrides?: Partial<Record<string, () => void>>): SpeedDialAction[] {
  return [
    {
      id: 'note',
      label: 'New note',
      icon: <span data-testid="icon-note">N</span>,
      tone: 'primary',
      onSelect: overrides?.note ?? vi.fn(),
    },
    {
      id: 'upload',
      label: 'Upload asset',
      icon: <span data-testid="icon-upload">U</span>,
      tone: 'emerald',
      onSelect: overrides?.upload ?? vi.fn(),
    },
    {
      id: 'share',
      label: 'Share link',
      icon: <span data-testid="icon-share">S</span>,
      tone: 'secondary',
      onSelect: overrides?.share ?? vi.fn(),
    },
    {
      id: 'pin',
      label: 'Pin draft',
      icon: <span data-testid="icon-pin">P</span>,
      tone: 'amber',
      onSelect: overrides?.pin ?? vi.fn(),
    },
    {
      id: 'delete',
      label: 'Delete draft',
      icon: <span data-testid="icon-delete">D</span>,
      tone: 'rose',
      disabled: true,
      onSelect: overrides?.delete ?? vi.fn(),
    },
    {
      id: 'inspect',
      label: 'Inspect optics',
      icon: <span data-testid="icon-inspect">I</span>,
    },
  ];
}

describe('SpeedDialButton', () => {
  it('toggles open in uncontrolled mode, forwards ref/overrides, renders tones, and invokes enabled actions', () => {
    const ref = createRef<HTMLDivElement>();
    const onOpenChange = vi.fn();
    const onSelectNote = vi.fn();
    const onSelectDelete = vi.fn();
    const actions = createActions({ note: onSelectNote, delete: onSelectDelete });

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SpeedDialButton: { className: 'theme-dial', style: { zIndex: 35 } },
          },
        }}
      >
        <SpeedDialButton
          ref={ref}
          actions={actions}
          onOpenChange={onOpenChange}
          className="custom-dial"
          style={{ marginRight: '12px' }}
          xstyle={{ '--prism-caustic-opacity': 1.25 }}
          data-testid="speed-dial"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('speed-dial');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-speed-dial-button', 'theme-dial', 'custom-dial');
    expect(root).toHaveStyle({ zIndex: '35', marginRight: '12px' });
    expect(root).toHaveAttribute('data-direction', 'up');
    expect(root).not.toHaveAttribute('data-open');

    const trigger = screen.getByRole('button', { name: 'Quick actions' });
    expect(trigger).toHaveClass('prism-btn-primary', 'prism-focus-ring', 'disabled:cursor-not-allowed');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(trigger.querySelector('svg')).toHaveClass('rotate-0');
    expect(screen.queryByRole('menu')).toBeNull();

    // Open via trigger click
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(trigger.querySelector('svg')).toHaveClass('rotate-45');

    const menu = screen.getByRole('menu', { name: 'Quick actions menu' });
    expect(trigger).toHaveAttribute('aria-controls', menu.id);

    // Verify all tones and default crystal button
    expect(screen.getByRole('menuitem', { name: 'New note' })).toHaveClass('prism-btn-primary');
    expect(screen.getByRole('menuitem', { name: 'Upload asset' })).toHaveClass('prism-emerald');
    expect(screen.getByRole('menuitem', { name: 'Share link' })).toHaveClass('prism-btn-secondary');
    expect(screen.getByRole('menuitem', { name: 'Pin draft' })).toHaveClass('prism-crystal');
    expect(screen.getByRole('menuitem', { name: 'Pin draft' })).toHaveAttribute('data-tone', 'amber');
    expect(screen.getByRole('menuitem', { name: 'Delete draft' })).toHaveClass('prism-crystal');
    expect(screen.getByRole('menuitem', { name: 'Delete draft' })).toHaveAttribute('data-tone', 'rose');
    expect(screen.getByRole('menuitem', { name: 'Inspect optics' })).toHaveClass('prism-crystal');
    expect(screen.getByRole('menuitem', { name: 'Inspect optics' })).toHaveAttribute('data-tone', 'crystal');

    // Disabled action does not trigger or close the dial
    const disabledItem = screen.getByRole('menuitem', { name: 'Delete draft' });
    expect(disabledItem).toBeDisabled();
    expect(disabledItem).toHaveClass('disabled:cursor-not-allowed');
    fireEvent.click(disabledItem);
    expect(onSelectDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Enabled action triggers callback and closes the dial
    fireEvent.click(screen.getByRole('menuitem', { name: 'New note' }));
    expect(onSelectNote).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('menu')).toBeNull();

    // Enabled action without onSelect closes cleanly
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Inspect optics' }));
    expect(screen.queryByRole('menu')).toBeNull();

    // Trigger click toggles closed when open
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('supports controlled open state and custom triggerLabel', () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    const actions: SpeedDialAction[] = [
      { id: 'create', label: 'Create canvas', icon: <span>+</span>, onSelect },
    ];

    const { rerender } = render(
      <SpeedDialButton
        actions={actions}
        open={false}
        onOpenChange={onOpenChange}
        triggerLabel="Canvas shortcuts"
      />
    );

    const trigger = screen.getByRole('button', { name: 'Canvas shortcuts' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('menu')).toBeNull();

    rerender(
      <SpeedDialButton
        actions={actions}
        open={true}
        onOpenChange={onOpenChange}
        triggerLabel="Canvas shortcuts"
      />
    );

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Create canvas' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it.each<{
    direction: Exclude<SpeedDialDirection, 'radial'>;
    expectedMenuClass: string;
    expectedLabelClass: string;
  }>([
    { direction: 'up', expectedMenuClass: 'flex-col-reverse', expectedLabelClass: 'right-full' },
    { direction: 'down', expectedMenuClass: 'flex-col', expectedLabelClass: 'right-full' },
    { direction: 'left', expectedMenuClass: 'flex-row-reverse', expectedLabelClass: 'bottom-full' },
    { direction: 'right', expectedMenuClass: 'flex-row', expectedLabelClass: 'bottom-full' },
  ])(
    'renders linear layout geometry for direction="$direction"',
    ({ direction, expectedMenuClass, expectedLabelClass }) => {
      render(
        <SpeedDialButton
          direction={direction}
          defaultOpen
          actions={[
            { id: 'a1', label: 'First', icon: <span>1</span> },
            { id: 'a2', label: 'Second', icon: <span>2</span> },
          ]}
          data-testid="linear-dial"
        />
      );

      const root = screen.getByTestId('linear-dial');
      expect(root).toHaveAttribute('data-direction', direction);

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('data-direction', direction);
      expect(menu).toHaveClass(expectedMenuClass);

      const labelPill = screen.getByText('First');
      expect(labelPill).toHaveClass('prism-crystal', expectedLabelClass);
    }
  );

  it('computes bounded radial arc coordinates for 1, 2, and 3+ actions', () => {
    const { rerender } = render(
      <SpeedDialButton
        direction="radial"
        defaultOpen
        actions={[{ id: 'only', label: 'Solo', icon: <span>1</span> }]}
      />
    );

    const soloWrapper = screen.getByRole('menuitem', { name: 'Solo' }).parentElement;
    expect(soloWrapper).not.toBeNull();
    expect(soloWrapper).toHaveAttribute('data-radial-x', '0');
    expect(soloWrapper).toHaveAttribute('data-radial-y', '-72');
    expect(soloWrapper).toHaveStyle({ transform: 'translate(0px, -72px)' });

    // 2 actions fan symmetrically on upper arc
    rerender(
      <SpeedDialButton
        direction="radial"
        defaultOpen
        actions={[
          { id: 'left', label: 'Left arc', icon: <span>L</span> },
          { id: 'right', label: 'Right arc', icon: <span>R</span> },
        ]}
      />
    );

    const leftArc = screen.getByRole('menuitem', { name: 'Left arc' }).parentElement;
    const rightArc = screen.getByRole('menuitem', { name: 'Right arc' }).parentElement;
    expect(leftArc).toHaveAttribute('data-radial-x', '-50.91');
    expect(leftArc).toHaveAttribute('data-radial-y', '-50.91');
    expect(rightArc).toHaveAttribute('data-radial-x', '50.91');
    expect(rightArc).toHaveAttribute('data-radial-y', '-50.91');

    // 3 actions fan across a 180-degree semi-circle with bounded 72px radius and normalized zero
    rerender(
      <SpeedDialButton
        direction="radial"
        defaultOpen
        actions={[
          { id: 'r1', label: 'Arc 1', icon: <span>1</span> },
          { id: 'r2', label: 'Arc 2', icon: <span>2</span> },
          { id: 'r3', label: 'Arc 3', icon: <span>3</span> },
        ]}
      />
    );

    const items = screen.getAllByRole('menuitem').map((btn) => btn.parentElement);
    expect(items[0]).toHaveAttribute('data-radial-x', '-72');
    expect(items[0]).toHaveAttribute('data-radial-y', '0');
    expect(items[1]).toHaveAttribute('data-radial-x', '0');
    expect(items[1]).toHaveAttribute('data-radial-y', '-72');
    expect(items[2]).toHaveAttribute('data-radial-x', '72');
    expect(items[2]).toHaveAttribute('data-radial-y', '0');

    for (const wrapper of items) {
      const x = Number(wrapper?.getAttribute('data-radial-x'));
      const y = Number(wrapper?.getAttribute('data-radial-y'));
      expect(Math.hypot(x, y)).toBeCloseTo(72, 1);
    }
  });

  it('supports openOnHover mode and respects disabled/default hover guards', () => {
    const onOpenChange = vi.fn();
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const actions: SpeedDialAction[] = [{ id: 'hover-act', label: 'Quick note', icon: <span>H</span> }];

    const { rerender } = render(
      <SpeedDialButton
        actions={actions}
        openOnHover
        onOpenChange={onOpenChange}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        data-testid="hover-dial"
      />
    );

    const root = screen.getByTestId('hover-dial');
    expect(root).toHaveAttribute('data-open-on-hover', 'true');

    // Leaving while already closed does not invoke onOpenChange
    fireEvent.mouseLeave(root);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    // Hover opens and leave closes
    fireEvent.mouseEnter(root);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseLeave(root);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('menu')).toBeNull();

    // Disabled ignores hover open/leave
    onOpenChange.mockClear();
    rerender(
      <SpeedDialButton
        actions={actions}
        openOnHover
        disabled
        onOpenChange={onOpenChange}
        data-testid="hover-dial"
      />
    );

    fireEvent.mouseEnter(root);
    fireEvent.mouseLeave(root);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();

    // Hover disabled by default (openOnHover=false)
    rerender(
      <SpeedDialButton
        actions={actions}
        openOnHover={false}
        onOpenChange={onOpenChange}
        data-testid="hover-dial"
      />
    );

    fireEvent.mouseEnter(root);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('closes on Escape (restoring focus to trigger), guards IME composition, and closes on outside click', () => {
    const onOpenChange = vi.fn();
    const actions: SpeedDialAction[] = [
      { id: 'one', label: 'Action one', icon: <span>1</span> },
      { id: 'two', label: 'Action two', icon: <span>2</span> },
    ];

    render(
      <div>
        <button type="button" data-testid="outside-btn">
          Outside target
        </button>
        <SpeedDialButton
          actions={actions}
          onOpenChange={onOpenChange}
          data-testid="escape-dial"
        />
      </div>
    );

    const root = screen.getByTestId('escape-dial');
    const trigger = screen.getByRole('button', { name: 'Quick actions' });
    const outsideBtn = screen.getByTestId('outside-btn');

    // Open and focus an action item
    fireEvent.click(trigger);
    const firstItem = screen.getByRole('menuitem', { name: 'Action one' });
    firstItem.focus();
    expect(document.activeElement).toBe(firstItem);

    // Non-Escape key keeps menu open
    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // IME composing Escape does not close menu
    fireEvent.keyDown(firstItem, { key: 'Escape', isComposing: true });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Escape inside menu closes once and restores focus to trigger
    onOpenChange.mockClear();
    fireEvent.keyDown(firstItem, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(document.activeElement).toBe(trigger);

    // Reopen and focus outside; window Escape closes and restores focus to trigger
    fireEvent.click(trigger);
    outsideBtn.focus();
    expect(document.activeElement).toBe(outsideBtn);

    // Non-Escape and IME-composing window Escape keep menu open
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    onOpenChange.mockClear();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger);

    // Reopen: mousedown inside keeps menu open; mousedown outside closes it
    fireEvent.click(trigger);
    fireEvent.mouseDown(root);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(outsideBtn);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('respects caller onKeyDown preventDefault on Escape', () => {
    render(
      <SpeedDialButton
        defaultOpen
        actions={[{ id: 'keep', label: 'Keep open', icon: <span>K</span> }]}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
          }
        }}
        data-testid="prevented-dial"
      />
    );

    fireEvent.keyDown(screen.getByTestId('prevented-dial'), { key: 'Escape' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('blocks interaction when disabled and handles empty actions safely (negative tests)', () => {
    const onOpenChange = vi.fn();
    render(
      <>
        <SpeedDialButton
          disabled
          defaultOpen
          actions={[{ id: 'locked', label: 'Locked action', icon: <span>L</span> }]}
          triggerLabel="Locked dial"
          onOpenChange={onOpenChange}
          data-testid="disabled-dial"
        />
        <SpeedDialButton
          defaultOpen
          openOnHover
          actions={[]}
          triggerLabel="Empty dial"
          onOpenChange={onOpenChange}
          data-testid="empty-dial"
        />
      </>
    );

    const disabledRoot = screen.getByTestId('disabled-dial');
    const disabledTrigger = screen.getByRole('button', { name: 'Locked dial' });
    expect(disabledRoot).toHaveAttribute('data-disabled', 'true');
    expect(disabledTrigger).toBeDisabled();
    expect(disabledTrigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(disabledTrigger);
    expect(screen.queryByRole('menu')).toBeNull();

    const emptyRoot = screen.getByTestId('empty-dial');
    const emptyTrigger = screen.getByRole('button', { name: 'Empty dial' });
    expect(emptyTrigger).not.toBeDisabled();
    expect(emptyTrigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(emptyTrigger);
    fireEvent.mouseEnter(emptyRoot);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS payloads strictly as literal text without script execution', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <SpeedDialButton
        defaultOpen
        triggerLabel={payload}
        actions={[{ id: 'xss', label: payload, icon: <span>!</span> }]}
      />
    );

    const trigger = screen.getByRole('button', { name: payload });
    expect(trigger).toHaveAttribute('aria-label', payload);

    const item = screen.getByRole('menuitem', { name: payload });
    expect(item).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
