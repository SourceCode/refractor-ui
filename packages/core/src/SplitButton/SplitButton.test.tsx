import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SplitButton, type SplitActionItem } from './SplitButton';

const ACTIONS: SplitActionItem[] = [
  { id: 'draft', label: 'Save as draft', description: 'Keep unpublished' },
  { id: 'schedule', label: 'Schedule release' },
  { id: 'archive', label: 'Archive', disabled: true },
];

describe('SplitButton', () => {
  it('invokes primary action, opens/selects menu actions, forwards ref, and reflects state', () => {
    const ref = createRef<HTMLDivElement>();
    const onPrimaryClick = vi.fn();
    const onSelectAction = vi.fn();

    render(
      <SplitButton
        ref={ref}
        label="Publish"
        onPrimaryClick={onPrimaryClick}
        actions={ACTIONS}
        onSelectAction={onSelectAction}
        className="custom-split"
        style={{ marginLeft: '8px' }}
        xstyle={{ '--prism-blur-px': '16px' }}
        data-testid="split-root"
      />
    );

    const root = screen.getByTestId('split-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-split-button', 'custom-split');
    expect(root).toHaveAttribute('data-tone', 'primary');
    expect(root).not.toHaveAttribute('data-open');

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onPrimaryClick).toHaveBeenCalledTimes(1);

    const trigger = screen.getByRole('button', { name: 'More actions for Publish' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Keep unpublished')).toBeInTheDocument();

    // Disabled menuitem does not trigger selection
    const archiveItem = screen.getByRole('menuitem', { name: 'Archive' });
    expect(archiveItem).toBeDisabled();
    fireEvent.click(archiveItem);
    expect(onSelectAction).not.toHaveBeenCalled();

    // Selecting an enabled menuitem invokes callback and closes menu
    fireEvent.click(screen.getByRole('menuitem', { name: /Save as draft/ }));
    expect(onSelectAction).toHaveBeenCalledWith(ACTIONS[0]);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes menu on Escape key and outside mousedown, and supports crystal tone + theme overrides', () => {
    const onKeyDown = vi.fn();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            SplitButton: { className: 'theme-split', style: { zIndex: 20 } },
          },
        }}
      >
        <div data-testid="outside">Outside area</div>
        <SplitButton
          label="Export"
          tone="crystal"
          onPrimaryClick={vi.fn()}
          actions={ACTIONS}
          onSelectAction={vi.fn()}
          onKeyDown={onKeyDown}
          className="local-split"
          data-testid="crystal-split"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('crystal-split');
    expect(root).toHaveClass('refractor-split-button', 'theme-split', 'local-split');
    expect(root).toHaveAttribute('data-tone', 'crystal');
    expect(root).toHaveStyle({ zIndex: '20' });

    const trigger = screen.getByRole('button', { name: 'More actions for Export' });

    // Open and close with Escape
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Open, click inside (stays open), then mousedown outside (closes)
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(root);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('blocks interactions when disabled and handles empty actions list safely (negative/adversarial)', () => {
    const onPrimaryClick = vi.fn();
    const onSelectAction = vi.fn();

    render(
      <>
        <SplitButton
          label="Locked"
          disabled
          onPrimaryClick={onPrimaryClick}
          actions={ACTIONS}
          onSelectAction={onSelectAction}
          data-testid="disabled-split"
        />
        <SplitButton
          label="Solo"
          onPrimaryClick={onPrimaryClick}
          actions={[]}
          onSelectAction={onSelectAction}
        />
      </>
    );

    expect(screen.getByTestId('disabled-split')).toHaveAttribute('data-disabled', 'true');
    const lockedPrimary = screen.getByRole('button', { name: 'Locked' });
    const lockedMore = screen.getByRole('button', { name: 'More actions for Locked' });
    expect(lockedPrimary).toBeDisabled();
    expect(lockedMore).toBeDisabled();
    fireEvent.click(lockedPrimary);
    fireEvent.click(lockedMore);
    expect(onPrimaryClick).not.toHaveBeenCalled();

    // Empty actions disables dropdown toggle but leaves primary enabled
    const soloMore = screen.getByRole('button', { name: 'More actions for Solo' });
    expect(soloMore).toBeDisabled();
    fireEvent.click(soloMore);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('safely renders adversarial XSS strings in label and action items', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <SplitButton
        label={payload}
        onPrimaryClick={vi.fn()}
        actions={[{ id: 'x', label: payload, description: payload }]}
        onSelectAction={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: payload })).toHaveTextContent(payload);
    fireEvent.click(screen.getByRole('button', { name: `More actions for ${payload}` }));
    expect(screen.getByRole('menuitem')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
