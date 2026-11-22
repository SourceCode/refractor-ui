import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  WindowAttachedSheet,
  type WindowAttachedSheetTone,
  type WindowAttachedSheetToneMap,
} from './index';

describe('WindowAttachedSheet', () => {
  it('renders open attached sheet below titlebar by default with ref passthrough, optical tokens, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            WindowAttachedSheet: {
              className: 'theme-window-sheet',
              style: { opacity: '0.96' },
            },
          },
        }}
      >
        <WindowAttachedSheet
          ref={ref}
          className="local-sheet-workspace"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="sheet-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('sheet-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Window-attached sheet workspace');
    expect(root).toHaveClass(
      'refractor-window-attached-sheet',
      'prism-slab',
      'theme-window-sheet',
      'local-sheet-workspace'
    );
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).toHaveAttribute('data-tone', 'warning');
    expect(root).toHaveAttribute('data-sibling', 'true');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ opacity: '0.96' });

    // Responsive 2-window grid when showSiblingWindow is true (default)
    const grid = screen.getByTestId('window-attached-sheet-grid');
    expect(grid).toHaveClass(
      'grid-cols-1',
      'md:grid-cols-[1.35fr_0.85fr]',
      'gap-4'
    );

    // Primary target window & titlebar
    const targetWindow = screen.getByTestId(
      'window-attached-sheet-target-window'
    );
    expect(targetWindow).toHaveClass('prism-slab');
    expect(targetWindow).toHaveAttribute('data-sheet-open', 'true');
    expect(
      screen.getByRole('heading', { name: 'OpticalSpec_v2.md' })
    ).toBeInTheDocument();

    const trigger = screen.getByTestId('window-attached-sheet-trigger');
    expect(trigger).toHaveTextContent('Sheet Active');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('data-active', 'true');

    // Attached dialog anchored below titlebar with flat top edge & rounded bottom corners
    const dialog = screen.getByRole('dialog', {
      name: 'Save unsaved changes before closing?',
    });
    expect(dialog).toHaveAttribute('aria-modal', 'false');
    expect(dialog).toHaveAttribute('data-tone', 'warning');
    expect(dialog).toHaveClass('rounded-t-none', 'rounded-b-2xl');
    expect(dialog.style.borderTopLeftRadius).toBe('0px');
    expect(dialog.style.borderTopRightRadius).toBe('0px');
    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id);
    expect(dialog).toHaveAttribute('aria-describedby');

    // Default warning top accent stripe uses --prism-warning-main
    const stripe = screen.getByTestId('window-attached-sheet-accent-stripe');
    expect(stripe.style.backgroundColor).toBe('var(--prism-warning-main)');
    expect(screen.queryByTestId('window-attached-sheet-custom-content')).toBeNull();

    // Target window body is dimmed & blocked while sheet is open
    const body = screen.getByTestId('window-attached-sheet-body');
    expect(body).toHaveClass('pointer-events-none', 'opacity-45');
    expect(body).toHaveAttribute('aria-hidden', 'true');
    expect(body).toHaveAttribute('data-blocked', 'true');
    expect(screen.getByTestId('window-attached-sheet-scrim')).toBeInTheDocument();

    const bodyAction = screen.getByTestId('window-attached-sheet-body-action');
    expect(bodyAction).toBeDisabled();
    expect(bodyAction).toHaveAttribute('tabindex', '-1');

    // Polite status strip announces active state
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(/Sheet active on OpticalSpec_v2\.md/i);
  });

  it('keeps sibling window 100% interactive while primary window sheet is open', () => {
    render(<WindowAttachedSheet />);

    // Primary sheet is open and blocking primary window body
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('window-attached-sheet-body')).toHaveClass(
      'pointer-events-none'
    );

    // Sibling window stays completely usable
    const siblingWindow = screen.getByTestId(
      'window-attached-sheet-sibling-window'
    );
    expect(siblingWindow).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Reference Notes' })
    ).toBeInTheDocument();

    const pingBtn = screen.getByRole('button', {
      name: /Ping Sibling Window/i,
    });
    expect(pingBtn).toBeEnabled();
    expect(
      screen.getByTestId('window-attached-sheet-sibling-count')
    ).toHaveTextContent('0');

    fireEvent.click(pingBtn);
    expect(
      screen.getByTestId('window-attached-sheet-sibling-count')
    ).toHaveTextContent('1');
    expect(pingBtn).toHaveTextContent('Ping Sibling Window (1)');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sibling window Reference Notes pinged (1).'
    );

    fireEvent.click(pingBtn);
    expect(
      screen.getByTestId('window-attached-sheet-sibling-count')
    ).toHaveTextContent('2');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sibling window Reference Notes pinged (2).'
    );

    // Primary sheet remained open throughout sibling interactions
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes via Confirm, Cancel, and Escape, fires callbacks, unblocks target body, and supports reopening', () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <WindowAttachedSheet
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const status = screen.getByRole('status');
    const body = screen.getByTestId('window-attached-sheet-body');
    const bodyAction = screen.getByTestId('window-attached-sheet-body-action');
    const trigger = screen.getByTestId('window-attached-sheet-trigger');

    // 1. Confirm closes sheet, fires onConfirm + onOpenChange(false), unlocks target window body
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByTestId('window-attached-sheet-scrim')).toBeNull();
    expect(status).toHaveTextContent(
      'Confirmed "Confirm" on OpticalSpec_v2.md. Target window unlocked.'
    );
    expect(trigger).toHaveTextContent('Open Sheet');
    expect(trigger).toBeEnabled();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(trigger);

    // Target body is now unblocked and interactive
    expect(body).not.toHaveClass('pointer-events-none');
    expect(body).toHaveAttribute('aria-hidden', 'false');
    expect(body).toHaveAttribute('data-blocked', 'false');
    expect(bodyAction).toBeEnabled();
    expect(bodyAction).not.toHaveAttribute('tabindex');

    fireEvent.click(bodyAction);
    expect(screen.getByText('1 format pass')).toBeInTheDocument();
    expect(status).toHaveTextContent('Formatted OpticalSpec_v2.md (1).');

    fireEvent.click(bodyAction);
    expect(screen.getByText('2 format passes')).toBeInTheDocument();
    expect(status).toHaveTextContent('Formatted OpticalSpec_v2.md (2).');

    // 2. Reopen sheet via titlebar button -> moves focus to sheet & re-blocks body
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    const reopenedDialog = screen.getByRole('dialog');
    expect(document.activeElement).toBe(reopenedDialog);
    expect(body).toHaveClass('pointer-events-none');
    expect(bodyAction).toBeDisabled();
    expect(status).toHaveTextContent(
      'Sheet opened on OpticalSpec_v2.md: Save unsaved changes before closing?'
    );

    // 3. Cancel closes sheet and fires onCancel + onOpenChange(false)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(status).toHaveTextContent(
      'Cancelled sheet on OpticalSpec_v2.md. Target window unlocked.'
    );

    // 4. Reopen and dismiss via Escape on the sheet container
    fireEvent.click(trigger);
    const escapeDialog = screen.getByRole('dialog');

    // Non-Escape key does not dismiss
    fireEvent.keyDown(escapeDialog, { key: 'a' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(escapeDialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(status).toHaveTextContent(
      'Dismissed sheet on OpticalSpec_v2.md via Escape. Target window unlocked.'
    );
    expect(document.activeElement).toBe(trigger);
  });

  it('supports all 3 semantic tones (info, warning, critical) with --prism-* tokens', () => {
    const toneMapCheck: WindowAttachedSheetToneMap = {
      info: true,
      warning: true,
      critical: true,
    };
    const tones: ReadonlyArray<WindowAttachedSheetTone> = [
      'info',
      'warning',
      'critical',
    ];
    for (const entry of tones) {
      expect(toneMapCheck[entry]).toBe(true);
    }

    const { rerender } = render(
      <WindowAttachedSheet tone="info" data-testid="tone-root" />
    );

    expect(screen.getByTestId('tone-root')).toHaveAttribute('data-tone', 'info');
    expect(
      screen.getByTestId('window-attached-sheet-accent-stripe').style
        .backgroundColor
    ).toBe('var(--prism-info-main)');
    expect(
      screen.getByTestId('window-attached-sheet-tone-badge')
    ).toHaveTextContent('Info');
    expect(
      screen.getByTestId('window-attached-sheet-confirm')
    ).toHaveClass('prism-btn-cobalt');

    rerender(<WindowAttachedSheet tone="warning" data-testid="tone-root" />);
    expect(
      screen.getByTestId('window-attached-sheet-accent-stripe').style
        .backgroundColor
    ).toBe('var(--prism-warning-main)');
    expect(
      screen.getByTestId('window-attached-sheet-tone-badge')
    ).toHaveTextContent('Warning');
    expect(
      screen.getByTestId('window-attached-sheet-confirm')
    ).toHaveClass('prism-btn-primary');

    rerender(<WindowAttachedSheet tone="critical" data-testid="tone-root" />);
    expect(
      screen.getByTestId('window-attached-sheet-accent-stripe').style
        .backgroundColor
    ).toBe('var(--prism-error-main)');
    expect(
      screen.getByTestId('window-attached-sheet-tone-badge')
    ).toHaveTextContent('Critical');
    expect(
      screen.getByTestId('window-attached-sheet-confirm').style.backgroundColor
    ).toBe('var(--prism-error-main)');
  });

  it('renders custom children, custom labels, empty description omission, and showSiblingWindow={false}', () => {
    render(
      <WindowAttachedSheet
        windowTitle="ShaderPipeline.glsl"
        sheetTitle="Discard shader edits?"
        sheetDescription=""
        confirmLabel="Discard Now"
        cancelLabel="Keep Editing"
        showSiblingWindow={false}
        aria-label="Custom shader sheet"
        data-testid="single-window-root"
      >
        <p>3 unsaved uniform bindings will be reverted.</p>
      </WindowAttachedSheet>
    );

    const root = screen.getByTestId('single-window-root');
    expect(root).toHaveAttribute('aria-label', 'Custom shader sheet');
    expect(root).not.toHaveAttribute('data-sibling');

    const grid = screen.getByTestId('window-attached-sheet-grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).not.toHaveClass('md:grid-cols-[1.35fr_0.85fr]');
    expect(
      screen.queryByTestId('window-attached-sheet-sibling-window')
    ).toBeNull();

    expect(
      screen.getByRole('heading', { name: 'ShaderPipeline.glsl' })
    ).toBeInTheDocument();

    const dialog = screen.getByRole('dialog', {
      name: 'Discard shader edits?',
    });
    expect(dialog).not.toHaveAttribute('aria-describedby');
    expect(
      screen.queryByTestId('window-attached-sheet-description')
    ).toBeNull();

    expect(
      screen.getByTestId('window-attached-sheet-custom-content')
    ).toHaveTextContent('3 unsaved uniform bindings will be reverted.');
    expect(
      screen.getByRole('button', { name: 'Discard Now' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Keep Editing' })
    ).toBeInTheDocument();
  });

  it('guards Escape dismissal during active IME composition', () => {
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <WindowAttachedSheet onCancel={onCancel} onOpenChange={onOpenChange} />
    );

    const dialog = screen.getByRole('dialog');
    const composingEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEscape, 'isComposing', { value: true });
    fireEvent(dialog, composingEscape);

    expect(onCancel).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('supports controlled open state and defaultOpen={false}', () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <WindowAttachedSheet defaultOpen={false} data-testid="uncontrolled-closed" />
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('window-attached-sheet-trigger')).toHaveTextContent(
      'Open Sheet'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      /No active sheet on OpticalSpec_v2\.md/i
    );

    // Controlled open={false} -> clicking Open Sheet notifies onOpenChange(true) without self-mutating
    rerender(
      <WindowAttachedSheet
        open={false}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Sheet' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole('dialog')).toBeNull();

    // Parent updates open={true}
    rerender(
      <WindowAttachedSheet
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Controlled Confirm notifies callbacks without self-closing until parent updates open
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Controlled Cancel notifies callbacks without self-closing until parent updates open
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Parent closes sheet
    rerender(
      <WindowAttachedSheet
        open={false}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('respects disabled state across buttons and Escape dismissal', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <WindowAttachedSheet
        disabled
        onConfirm={onConfirm}
        onCancel={onCancel}
        onOpenChange={onOpenChange}
        data-testid="disabled-root"
      />
    );

    expect(screen.getByTestId('disabled-root')).toHaveAttribute(
      'data-disabled',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(
      screen.getByTestId('window-attached-sheet-trigger')
    ).toBeDisabled();
    expect(
      screen.getByTestId('window-attached-sheet-body-action')
    ).toBeDisabled();
    expect(
      screen.getByTestId('window-attached-sheet-sibling-ping')
    ).toBeDisabled();

    // Escape is ignored while disabled
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // When closed and disabled, Open Sheet cannot open
    rerender(
      <WindowAttachedSheet
        open={false}
        disabled
        onOpenChange={onOpenChange}
        data-testid="disabled-root"
      />
    );
    expect(screen.getByRole('button', { name: 'Open Sheet' })).toBeDisabled();
    expect(
      screen.getByTestId('window-attached-sheet-body-action')
    ).toBeDisabled();
  });

  it('handles blank label fallbacks, omitted callbacks, and adversarial XSS strings safely', () => {
    const { rerender } = render(
      <WindowAttachedSheet
        windowTitle="   "
        sheetTitle="   "
        confirmLabel="   "
        cancelLabel="   "
      />
    );

    expect(
      screen.getByRole('heading', { name: 'OpticalSpec_v2.md' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('dialog', {
        name: 'Save unsaved changes before closing?',
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    // Omitted callbacks never throw
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Sheet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Sheet' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    // Adversarial XSS strings render strictly as literal escaped text
    const xssPayload =
      '<script>window.__sheetXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <WindowAttachedSheet
        open={true}
        windowTitle={xssPayload}
        sheetTitle={xssPayload}
        sheetDescription={xssPayload}
        confirmLabel={xssPayload}
        cancelLabel={xssPayload}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(xssPayload).length).toBeGreaterThanOrEqual(5);
  });
});
