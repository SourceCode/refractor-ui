import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ModalDialog } from './ModalDialog';

describe('ModalDialog', () => {
  it('renders nothing when closed and ignores Escape key (negative test)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModalDialog open={false} title="Hidden" onClose={onClose}>
        Body
      </ModalDialog>
    );

    expect(container.firstChild).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders title, description, body, confirm/cancel actions, Escape/backdrop close, and forwards ref/className', () => {
    const ref = createRef<HTMLDivElement>();
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ModalDialog
        ref={ref}
        open
        title="Publish Theme"
        description="Confirm theme rollout"
        confirmLabel="Publish now"
        onConfirm={onConfirm}
        onClose={onClose}
        className="custom-modal"
        data-testid="modal"
      >
        <p>Modal body content</p>
      </ModalDialog>
    );

    const dialog = screen.getByTestId('modal');
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveClass('refractor-modal-dialog', 'custom-modal');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(screen.getByRole('dialog', { name: 'Publish Theme' })).toBe(dialog);
    expect(screen.getByText('Confirm theme rollout')).toBeInTheDocument();
    expect(screen.getByText('Modal body content')).toBeInTheDocument();

    // Clicking inside body does not dismiss
    fireEvent.click(screen.getByText('Modal body content'));
    expect(onClose).not.toHaveBeenCalled();

    // Confirm triggers onConfirm then onClose
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Cancel, Close X, Escape, and Backdrop all call onClose
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onClose).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(4);

    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(5);
  });

  it('omits confirm button and description when not provided and applies theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { ModalDialog: { className: 'theme-modal', style: { padding: '24px' } } },
        }}
      >
        <ModalDialog open title="Notice" onClose={vi.fn()} className="local-modal">
          Read-only notice
        </ModalDialog>
      </PrismThemeProvider>
    );

    const dialog = screen.getByRole('dialog', { name: 'Notice' });
    expect(dialog).toHaveClass('refractor-modal-dialog', 'theme-modal', 'local-modal');
    expect(dialog).toHaveStyle({ padding: '24px' });
    expect(dialog).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });

  it('safely renders adversarial XSS title and description strings as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <ModalDialog open title={payload} description={payload} onClose={vi.fn()}>
        {payload}
      </ModalDialog>
    );

    expect(screen.getByRole('heading', { name: payload })).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
