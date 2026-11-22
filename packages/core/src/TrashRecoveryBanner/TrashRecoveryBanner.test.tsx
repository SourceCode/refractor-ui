import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  TrashRecoveryBanner as BarrelTrashRecoveryBanner,
  type TrashRetentionUrgency,
  type TrashRetentionUrgencyMap,
} from './index';
import { TrashRecoveryBanner } from './TrashRecoveryBanner';

describe('TrashRecoveryBanner', () => {
  it('renders defaults, barrel exports, ref, theme override, xstyle, and normal urgency tokens', () => {
    const ref = createRef<HTMLDivElement>();
    const urgencyMapCheck: TrashRetentionUrgencyMap = {
      normal: true,
      warning: true,
      critical: true,
    };
    const sampleUrgency: TrashRetentionUrgency = 'normal';

    expect(BarrelTrashRecoveryBanner).toBe(TrashRecoveryBanner);
    expect(urgencyMapCheck[sampleUrgency]).toBe(true);
    expect(TrashRecoveryBanner.displayName).toBe('TrashRecoveryBanner');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            TrashRecoveryBanner: {
              className: 'theme-trash-banner',
              style: { letterSpacing: '0.15px' },
            },
          },
        }}
      >
        <TrashRecoveryBanner
          ref={ref}
          className="local-trash-banner"
          xstyle={{ '--prism-slab-blur-px': '24px' }}
          style={{ marginBottom: '12px' }}
          data-testid="trash-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('trash-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveAttribute('data-urgency', 'normal');
    expect(root).toHaveAttribute('data-auto-delete', 'enabled');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-confirming');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveClass(
      'refractor-trash-recovery-banner',
      'prism-slab',
      'theme-trash-banner',
      'local-trash-banner'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.15px', marginBottom: '12px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('24px');

    expect(screen.getByRole('heading', { name: 'Trash & Recovery' })).toBeInTheDocument();
    expect(screen.getByTestId('trash-metrics-badge')).toHaveTextContent('14 items · 2.4 GB');
    expect(screen.getByTestId('trash-retention-badge')).toHaveTextContent('Auto-delete in 30 days');
    expect(screen.getByTestId('trash-recovery-description')).toHaveTextContent(
      '14 items in Trash will be permanently deleted after 30 days.'
    );

    // Normal urgency strictly uses --prism-info-main
    expect(screen.getByTestId('trash-urgency-accent').style.backgroundColor).toBe(
      'var(--prism-info-main)'
    );
    expect(screen.getByTestId('trash-urgency-icon').style.color).toBe('var(--prism-info-main)');
    expect(screen.getByTestId('trash-urgency-label')).toHaveTextContent('Standard retention');

    // Action buttons present and enabled with default counts
    const restoreSelected = screen.getByRole('button', { name: 'Restore Selected (3)' });
    const restoreAll = screen.getByRole('button', { name: 'Restore All' });
    const emptyTrash = screen.getByRole('button', { name: 'Empty Trash' });
    expect(restoreSelected).toBeEnabled();
    expect(restoreAll).toBeEnabled();
    expect(emptyTrash).toBeEnabled();
    expect(screen.queryByTestId('trash-confirm-panel')).toBeNull();

    // Polite live status region
    const liveStatus = screen.getByTestId('trash-recovery-status');
    expect(liveStatus).toHaveAttribute('role', 'status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(liveStatus).toHaveAttribute('aria-atomic', 'true');
    expect(liveStatus).toHaveTextContent('14 items recoverable · 3 selected · 30 days remaining');
  });

  it('supports custom aria-label and handles blank totalSizeLabel without stray separators', () => {
    render(
      <TrashRecoveryBanner
        itemCount={4}
        selectedCount={2}
        totalSizeLabel="   "
        aria-label="Workspace Trash Retention"
        data-testid="custom-aria-root"
      />
    );

    const root = screen.getByTestId('custom-aria-root');
    expect(root).toHaveAttribute('aria-label', 'Workspace Trash Retention');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByTestId('trash-metrics-badge')).toHaveTextContent('4 items');
    expect(screen.getByTestId('trash-metrics-badge').textContent).not.toContain('·');

    fireEvent.click(screen.getByRole('button', { name: 'Empty Trash' }));
    expect(screen.getByTestId('trash-confirm-message')).toHaveTextContent(
      'Permanently delete 4 items? This action cannot be undone.'
    );
  });

  it('transitions semantic --prism-* urgency across normal (> 7d), warning (4..7d), and critical (<= 3d) with singular/plural copy', () => {
    const { rerender } = render(
      <TrashRecoveryBanner
        itemCount={8}
        selectedCount={1}
        retentionDays={8}
        data-testid="urgency-root"
      />
    );

    expect(screen.getByTestId('urgency-root')).toHaveAttribute('data-urgency', 'normal');
    expect(screen.getByTestId('trash-urgency-accent').style.backgroundColor).toBe(
      'var(--prism-info-main)'
    );
    expect(screen.getByTestId('trash-retention-badge')).toHaveTextContent('Auto-delete in 8 days');

    // Boundary: 7 days -> warning (--prism-warning-main)
    rerender(
      <TrashRecoveryBanner
        itemCount={5}
        selectedCount={2}
        retentionDays={7}
        data-testid="urgency-root"
      />
    );
    expect(screen.getByTestId('urgency-root')).toHaveAttribute('data-urgency', 'warning');
    expect(screen.getByTestId('trash-urgency-accent').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('trash-urgency-icon').style.color).toBe('var(--prism-warning-main)');
    expect(screen.getByTestId('trash-urgency-label')).toHaveTextContent('Expiring soon');
    expect(screen.getByTestId('trash-retention-badge')).toHaveTextContent('Auto-delete in 7 days');

    // Boundary: 4 days -> still warning
    rerender(
      <TrashRecoveryBanner
        itemCount={5}
        selectedCount={2}
        retentionDays={4}
        data-testid="urgency-root"
      />
    );
    expect(screen.getByTestId('urgency-root')).toHaveAttribute('data-urgency', 'warning');

    // Boundary: 3 days -> critical (--prism-error-main)
    rerender(
      <TrashRecoveryBanner
        itemCount={5}
        selectedCount={2}
        retentionDays={3}
        data-testid="urgency-root"
      />
    );
    expect(screen.getByTestId('urgency-root')).toHaveAttribute('data-urgency', 'critical');
    expect(screen.getByTestId('trash-urgency-accent').style.backgroundColor).toBe(
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('trash-urgency-icon').style.color).toBe('var(--prism-error-main)');
    expect(screen.getByTestId('trash-urgency-label')).toHaveTextContent('Immediate purge risk');

    // Singular: 1 item and 1 day
    rerender(
      <TrashRecoveryBanner
        itemCount={1}
        selectedCount={1}
        totalSizeLabel="12.5 MB"
        retentionDays={1}
        data-testid="urgency-root"
      />
    );
    expect(screen.getByTestId('urgency-root')).toHaveAttribute('data-urgency', 'critical');
    expect(screen.getByTestId('trash-metrics-badge')).toHaveTextContent('1 item · 12.5 MB');
    expect(screen.getByTestId('trash-retention-badge')).toHaveTextContent('Auto-delete in 1 day');
    expect(screen.getByTestId('trash-recovery-description')).toHaveTextContent(
      '1 item in Trash will be permanently deleted after 1 day.'
    );
    expect(screen.getByTestId('trash-recovery-status')).toHaveTextContent(
      '1 item recoverable · 1 selected · 1 day remaining'
    );
  });

  it('displays Auto-delete paused copy when autoDeleteEnabled={false} for both populated and empty states', () => {
    const { rerender } = render(
      <TrashRecoveryBanner
        itemCount={6}
        selectedCount={2}
        autoDeleteEnabled={false}
        data-testid="paused-root"
      />
    );

    expect(screen.getByTestId('paused-root')).toHaveAttribute('data-auto-delete', 'paused');
    expect(screen.getByTestId('trash-retention-badge')).toHaveTextContent('Auto-delete paused');
    expect(screen.getByTestId('trash-urgency-label')).toHaveTextContent('Auto-delete paused');
    expect(screen.getByTestId('trash-recovery-description')).toHaveTextContent(
      '6 items in Trash. Auto-delete paused — items remain recoverable until you empty Trash manually.'
    );
    expect(screen.getByTestId('trash-recovery-status')).toHaveTextContent(
      '6 items recoverable · 2 selected · Auto-delete paused'
    );

    rerender(
      <TrashRecoveryBanner
        itemCount={0}
        selectedCount={0}
        autoDeleteEnabled={false}
        data-testid="paused-root"
      />
    );

    expect(screen.getByRole('heading', { name: 'Trash is empty' })).toBeInTheDocument();
    expect(screen.getByTestId('trash-retention-badge')).toHaveTextContent('Auto-delete paused');
    expect(screen.getByTestId('trash-recovery-description')).toHaveTextContent(
      'No items currently in Trash. Auto-delete paused — deleted items remain until emptied manually.'
    );
  });

  it('renders Trash is empty state and disables all actions when itemCount={0}', () => {
    const onRestoreSelected = vi.fn();
    const onRestoreAll = vi.fn();
    const onEmptyTrash = vi.fn();

    render(
      <TrashRecoveryBanner
        itemCount={0}
        selectedCount={3}
        onRestoreSelected={onRestoreSelected}
        onRestoreAll={onRestoreAll}
        onEmptyTrash={onEmptyTrash}
        data-testid="empty-root"
      />
    );

    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('heading', { name: 'Trash is empty' })).toBeInTheDocument();
    expect(screen.getByTestId('trash-metrics-badge')).toHaveTextContent('0 items · 0 B');
    expect(screen.getByTestId('trash-recovery-status')).toHaveTextContent(
      'Trash is empty. No recoverable items.'
    );

    const restoreSelected = screen.getByRole('button', { name: 'Restore Selected (0)' });
    const restoreAll = screen.getByRole('button', { name: 'Restore All' });
    const emptyTrash = screen.getByRole('button', { name: 'Empty Trash' });

    expect(restoreSelected).toBeDisabled();
    expect(restoreAll).toBeDisabled();
    expect(emptyTrash).toBeDisabled();

    fireEvent.click(restoreSelected);
    fireEvent.click(restoreAll);
    fireEvent.click(emptyTrash);

    expect(onRestoreSelected).not.toHaveBeenCalled();
    expect(onRestoreAll).not.toHaveBeenCalled();
    expect(onEmptyTrash).not.toHaveBeenCalled();
  });

  it('disables only Restore Selected when selectedCount={0} while items remain in Trash', () => {
    const onRestoreSelected = vi.fn();
    const onRestoreAll = vi.fn();

    render(
      <TrashRecoveryBanner
        itemCount={9}
        selectedCount={0}
        onRestoreSelected={onRestoreSelected}
        onRestoreAll={onRestoreAll}
      />
    );

    const restoreSelected = screen.getByRole('button', { name: 'Restore Selected (0)' });
    const restoreAll = screen.getByRole('button', { name: 'Restore All' });
    const emptyTrash = screen.getByRole('button', { name: 'Empty Trash' });

    expect(restoreSelected).toBeDisabled();
    expect(restoreAll).toBeEnabled();
    expect(emptyTrash).toBeEnabled();

    fireEvent.click(restoreSelected);
    expect(onRestoreSelected).not.toHaveBeenCalled();

    fireEvent.click(restoreAll);
    expect(onRestoreAll).toHaveBeenCalledTimes(1);
  });

  it('invokes Restore Selected and Restore All callbacks and updates aria-live="polite" status text', () => {
    const onRestoreSelected = vi.fn();
    const onRestoreAll = vi.fn();

    render(
      <TrashRecoveryBanner
        itemCount={12}
        selectedCount={4}
        onRestoreSelected={onRestoreSelected}
        onRestoreAll={onRestoreAll}
      />
    );

    const status = screen.getByTestId('trash-recovery-status');
    fireEvent.click(screen.getByRole('button', { name: 'Restore Selected (4)' }));
    expect(onRestoreSelected).toHaveBeenCalledTimes(1);
    expect(status).toHaveTextContent('Restoring 4 items from Trash.');

    // Open confirmation then click Restore All -> dismisses confirmation and invokes onRestoreAll
    fireEvent.click(screen.getByRole('button', { name: 'Empty Trash' }));
    expect(screen.getByTestId('trash-confirm-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore All' }));
    expect(onRestoreAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('trash-confirm-panel')).toBeNull();
    expect(status).toHaveTextContent('Restoring all 12 items from Trash.');
  });

  it('enforces two-step Empty Trash confirmation with Cancel button, IME-safe Escape cancel, and explicit Confirm Empty Trash', () => {
    const onEmptyTrash = vi.fn();
    const onKeyDown = vi.fn();

    render(
      <TrashRecoveryBanner
        itemCount={10}
        selectedCount={2}
        totalSizeLabel="890 MB"
        onEmptyTrash={onEmptyTrash}
        onKeyDown={onKeyDown}
        data-testid="confirm-root"
      />
    );

    const root = screen.getByTestId('confirm-root');
    const status = screen.getByTestId('trash-recovery-status');

    // Escape while not confirming is a safe no-op
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onEmptyTrash).not.toHaveBeenCalled();

    // Step 1: Click Empty Trash reveals inline confirmation without deleting
    fireEvent.click(screen.getByRole('button', { name: 'Empty Trash' }));
    expect(onEmptyTrash).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-confirming', 'true');
    expect(screen.queryByRole('button', { name: 'Empty Trash' })).toBeNull();
    expect(screen.getByTestId('trash-confirm-panel')).toBeInTheDocument();
    expect(screen.getByTestId('trash-confirm-message')).toHaveTextContent(
      'Permanently delete 10 items (890 MB)? This action cannot be undone.'
    );
    expect(status).toHaveTextContent('Confirm permanent deletion of 10 items.');

    // Cancel button aborts cleanly without invoking onEmptyTrash
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onEmptyTrash).not.toHaveBeenCalled();
    expect(root).not.toHaveAttribute('data-confirming');
    expect(screen.queryByTestId('trash-confirm-panel')).toBeNull();
    expect(screen.getByRole('button', { name: 'Empty Trash' })).toBeInTheDocument();
    expect(status).toHaveTextContent('Empty Trash cancelled.');

    // Re-open confirmation -> IME composing Escape must NOT cancel
    fireEvent.click(screen.getByRole('button', { name: 'Empty Trash' }));
    const confirmBtn = screen.getByRole('button', { name: 'Confirm Empty Trash' });
    const composingEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEscape, 'isComposing', { value: true });
    fireEvent(confirmBtn, composingEscape);
    expect(composingEscape.defaultPrevented).toBe(false);
    expect(screen.getByTestId('trash-confirm-panel')).toBeInTheDocument();

    // Non-Escape key leaves confirmation open
    fireEvent.keyDown(confirmBtn, { key: 'a' });
    expect(screen.getByTestId('trash-confirm-panel')).toBeInTheDocument();

    // Non-composing Escape cancels cleanly and calls preventDefault
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    fireEvent(confirmBtn, escapeEvent);
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(onEmptyTrash).not.toHaveBeenCalled();
    expect(screen.queryByTestId('trash-confirm-panel')).toBeNull();
    expect(status).toHaveTextContent('Empty Trash cancelled.');

    // Step 2: Re-open and click Confirm Empty Trash invokes onEmptyTrash exactly once
    fireEvent.click(screen.getByRole('button', { name: 'Empty Trash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Empty Trash' }));
    expect(onEmptyTrash).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('trash-confirm-panel')).toBeNull();
    expect(status).toHaveTextContent('Permanently deleting 10 items from Trash.');
  });

  it('sanitizes selectedCount > itemCount, NaN, Infinity, negative numbers, and fractional floats safely', () => {
    const { rerender } = render(
      <TrashRecoveryBanner
        itemCount={4}
        selectedCount={99}
        retentionDays={6.9}
        data-testid="sanitize-root"
      />
    );

    expect(screen.getByRole('button', { name: 'Restore Selected (4)' })).toBeEnabled();
    expect(screen.getByTestId('trash-retention-badge')).toHaveTextContent('Auto-delete in 6 days');
    expect(screen.getByTestId('sanitize-root')).toHaveAttribute('data-urgency', 'warning');

    // NaN / Infinity / negative values must never leak NaN or negative numbers
    rerender(
      <TrashRecoveryBanner
        itemCount={Number.NaN}
        selectedCount={Number.POSITIVE_INFINITY}
        retentionDays={Number.NEGATIVE_INFINITY}
        data-testid="sanitize-root"
      />
    );

    const root = screen.getByTestId('sanitize-root');
    expect(root.textContent).not.toContain('NaN');
    expect(root.textContent).not.toContain('Infinity');
    expect(screen.getByRole('heading', { name: 'Trash is empty' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore Selected (0)' })).toBeDisabled();
    expect(screen.getByTestId('trash-retention-badge')).toHaveTextContent('Auto-delete in 0 days');
    expect(root).toHaveAttribute('data-urgency', 'critical');

    // Negative numbers clamped to 0
    rerender(
      <TrashRecoveryBanner
        itemCount={-12}
        selectedCount={-5}
        retentionDays={-3}
        data-testid="sanitize-root"
      />
    );

    expect(screen.getByRole('heading', { name: 'Trash is empty' })).toBeInTheDocument();
    expect(screen.getByTestId('trash-metrics-badge')).toHaveTextContent('0 items · 0 B');
    expect(screen.getByTestId('trash-retention-badge')).toHaveTextContent('Auto-delete in 0 days');
    expect(screen.getByRole('button', { name: 'Restore Selected (0)' })).toBeDisabled();
  });

  it('disables all controls when disabled={true} and auto-dismisses an open confirmation panel on disable or empty', () => {
    const onRestoreSelected = vi.fn();
    const onRestoreAll = vi.fn();
    const onEmptyTrash = vi.fn();

    const { rerender } = render(
      <TrashRecoveryBanner
        itemCount={7}
        selectedCount={2}
        onRestoreSelected={onRestoreSelected}
        onRestoreAll={onRestoreAll}
        onEmptyTrash={onEmptyTrash}
        data-testid="disabled-root"
      />
    );

    // Open two-step confirmation, then flip disabled={true}
    fireEvent.click(screen.getByRole('button', { name: 'Empty Trash' }));
    expect(screen.getByTestId('trash-confirm-panel')).toBeInTheDocument();

    rerender(
      <TrashRecoveryBanner
        itemCount={7}
        selectedCount={2}
        disabled
        onRestoreSelected={onRestoreSelected}
        onRestoreAll={onRestoreAll}
        onEmptyTrash={onEmptyTrash}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(screen.queryByTestId('trash-confirm-panel')).toBeNull();

    const restoreSelected = screen.getByRole('button', { name: 'Restore Selected (2)' });
    const restoreAll = screen.getByRole('button', { name: 'Restore All' });
    const emptyTrash = screen.getByRole('button', { name: 'Empty Trash' });

    expect(restoreSelected).toBeDisabled();
    expect(restoreAll).toBeDisabled();
    expect(emptyTrash).toBeDisabled();

    fireEvent.click(restoreSelected);
    fireEvent.click(restoreAll);
    fireEvent.click(emptyTrash);

    expect(onRestoreSelected).not.toHaveBeenCalled();
    expect(onRestoreAll).not.toHaveBeenCalled();
    expect(onEmptyTrash).not.toHaveBeenCalled();

    // Re-enable -> confirmation must stay closed until explicitly requested again
    rerender(
      <TrashRecoveryBanner
        itemCount={7}
        selectedCount={2}
        disabled={false}
        onRestoreSelected={onRestoreSelected}
        onRestoreAll={onRestoreAll}
        onEmptyTrash={onEmptyTrash}
        data-testid="disabled-root"
      />
    );
    expect(screen.queryByTestId('trash-confirm-panel')).toBeNull();
    expect(screen.getByRole('button', { name: 'Empty Trash' })).toBeEnabled();
  });
});
