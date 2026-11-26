import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  FileConflictDialog,
  type FileConflictDialogModeMap,
  type FileConflictResolution,
  type FileConflictResolutionMap,
  type FileConflictVersion,
} from './index';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FileConflictDialog', () => {
  it('satisfies Open-Internals contracts, forwards React 19 ref, applies theme overrides, renders default side-by-side cards, and emits zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const resolutionMap: FileConflictResolutionMap = {
      replace: true,
      skip: true,
      'keep-both': true,
    };
    const modeMap: FileConflictDialogModeMap = {
      inline: true,
      modal: true,
    };
    expect(
      resolutionMap.replace &&
        resolutionMap.skip &&
        resolutionMap['keep-both'] &&
        modeMap.inline &&
        modeMap.modal
    ).toBe(true);

    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: {
            FileConflictDialog: {
              className: 'theme-conflict-override',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <FileConflictDialog
          ref={ref}
          className="local-conflict-class"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="conflict-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('conflict-root');
    expect(ref.current).toBe(root);
    expect(FileConflictDialog.displayName).toBe('FileConflictDialog');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveAttribute('aria-describedby');
    expect(root).toHaveClass(
      'refractor-file-conflict-dialog',
      'prism-slab',
      'theme-conflict-override',
      'local-conflict-class'
    );
    expect(root).toHaveAttribute('data-mode', 'inline');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).toHaveStyle({ maxWidth: '720px', marginTop: '8px' });

    // Default filename and side-by-side comparison cards
    expect(screen.getByTestId('file-conflict-filename')).toHaveTextContent(
      'OpticalGlass_Master_v4.exr'
    );
    expect(screen.getByTestId('file-conflict-incoming-label')).toHaveTextContent('Incoming File');
    expect(screen.getByTestId('file-conflict-existing-label')).toHaveTextContent('Existing File');
    expect(screen.getByTestId('file-conflict-incoming-size')).toHaveTextContent('148.4 MB');
    expect(screen.getByTestId('file-conflict-existing-size')).toHaveTextContent('118.4 MB');
    expect(screen.getByTestId('file-conflict-incoming-size-badge')).toHaveTextContent('Larger');
    expect(screen.getByTestId('file-conflict-existing-size-badge')).toHaveTextContent('Smaller');
    expect(screen.getByTestId('file-conflict-incoming-recency-badge')).toHaveTextContent('Newer');
    expect(screen.getByTestId('file-conflict-existing-recency-badge')).toHaveTextContent('Older');
    expect(screen.getByTestId('file-conflict-incoming-checksum')).toHaveTextContent('a4f9c21d…7e3b');
    expect(screen.getByTestId('file-conflict-existing-checksum')).toHaveTextContent('6b12e80a…4c91');

    // Apply to all checkbox visible for default remainingConflicts = 3, no Cancel button in inline without onCancel
    expect(
      screen.getByRole('checkbox', { name: 'Apply to all 3 remaining conflicts' })
    ).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(screen.queryByTestId('file-conflict-close')).toBeNull();

    // Zero raw color literals anywhere in rendered markup
    const rawColorRegex =
      /(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?)\s*\()/;
    expect(rawColorRegex.test(root.outerHTML)).toBe(false);

    // Custom aria-label omits aria-labelledby
    rerender(
      <FileConflictDialog aria-label="Custom conflict prompt" data-testid="conflict-root" />
    );
    const updatedRoot = screen.getByTestId('conflict-root');
    expect(updatedRoot).toHaveAttribute('aria-label', 'Custom conflict prompt');
    expect(updatedRoot).not.toHaveAttribute('aria-labelledby');
  });

  it('resolves Replace, Keep Both, and Skip with and without Apply to All and updates the polite status banner', () => {
    const onResolve = vi.fn<(resolution: FileConflictResolution, applyToAll: boolean) => void>();
    const onCancel = vi.fn<() => void>();

    render(
      <FileConflictDialog
        fileName="ShaderGraph.exr"
        remainingConflicts={3}
        onResolve={onResolve}
        onCancel={onCancel}
        data-testid="resolve-root"
      />
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('data-resolved', 'false');
    expect(status).toHaveTextContent('Choose how to resolve the conflict for ShaderGraph.exr.');

    // Replace without applyToAll
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(onResolve).toHaveBeenLastCalledWith('replace', false);
    expect(screen.getByTestId('resolve-root')).toHaveAttribute('data-resolution', 'replace');
    expect(screen.getByTestId('file-conflict-replace')).toHaveAttribute('data-active', 'true');
    expect(status).toHaveAttribute('data-resolved', 'true');
    expect(status).toHaveTextContent('Resolved: Replace (ShaderGraph.exr)');

    // Skip without applyToAll
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onResolve).toHaveBeenLastCalledWith('skip', false);
    expect(screen.getByTestId('file-conflict-skip')).toHaveAttribute('data-active', 'true');
    expect(status).toHaveTextContent('Resolved: Skip (ShaderGraph.exr)');

    // Toggle Apply to all 3 remaining conflicts -> Keep Both
    const checkbox = screen.getByRole('checkbox', { name: 'Apply to all 3 remaining conflicts' });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByTestId('resolve-root')).toHaveAttribute('data-apply-to-all', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Keep Both' }));
    expect(onResolve).toHaveBeenLastCalledWith('keep-both', true);
    expect(screen.getByTestId('file-conflict-keep-both')).toHaveAttribute('data-active', 'true');
    expect(status).toHaveTextContent('Resolved: Keep Both (applied to all 3 conflicts)');

    // Inline Cancel button appears when onCancel is provided
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('computes comparative size and recency badges across smaller/older, equal, B/KB/GB formatting, optional checksums, and NaN/negative sanitization', () => {
    const smallerOlderIncoming: FileConflictVersion = {
      label: 'Incoming File',
      path: '/incoming/small.bin',
      sizeBytes: 512,
      modifiedAt: '2026-10-01 08:00 UTC',
      modifiedTimestamp: 1_790_841_600_000,
    };
    const largerNewerExisting: FileConflictVersion = {
      label: 'Existing File',
      path: '/existing/large.bin',
      sizeBytes: 2_147_483_648,
      modifiedAt: '2026-11-22 16:00 UTC',
      modifiedTimestamp: 1_795_363_200_000,
      checksumShort: '   ',
    };

    const { rerender } = render(
      <FileConflictDialog
        incoming={smallerOlderIncoming}
        existing={largerNewerExisting}
      />
    );

    expect(screen.getByTestId('file-conflict-incoming-size')).toHaveTextContent('512 B');
    expect(screen.getByTestId('file-conflict-existing-size')).toHaveTextContent('2.00 GB');
    expect(screen.getByTestId('file-conflict-incoming-size-badge')).toHaveTextContent('Smaller');
    expect(screen.getByTestId('file-conflict-existing-size-badge')).toHaveTextContent('Larger');
    expect(screen.getByTestId('file-conflict-incoming-recency-badge')).toHaveTextContent('Older');
    expect(screen.getByTestId('file-conflict-existing-recency-badge')).toHaveTextContent('Newer');
    expect(screen.queryByTestId('file-conflict-incoming-checksum')).toBeNull();
    expect(screen.queryByTestId('file-conflict-existing-checksum')).toBeNull();

    // Equal KB sizes and identical timestamps
    const equalIncoming: FileConflictVersion = {
      label: 'Incoming File',
      path: '/src/tokens.json',
      sizeBytes: 2048,
      modifiedAt: '2026-11-22 12:00 UTC',
      modifiedTimestamp: 1_795_348_800_000,
    };
    const equalExisting: FileConflictVersion = {
      label: 'Existing File',
      path: '/dest/tokens.json',
      sizeBytes: 2048,
      modifiedAt: '2026-11-22 12:00 UTC',
      modifiedTimestamp: 1_795_348_800_000,
    };

    rerender(<FileConflictDialog incoming={equalIncoming} existing={equalExisting} />);

    expect(screen.getByTestId('file-conflict-incoming-size')).toHaveTextContent('2.0 KB');
    expect(screen.getByTestId('file-conflict-existing-size')).toHaveTextContent('2.0 KB');
    expect(screen.getByTestId('file-conflict-incoming-size-badge')).toHaveTextContent('Same size');
    expect(screen.getByTestId('file-conflict-existing-size-badge')).toHaveTextContent('Same size');
    expect(screen.getByTestId('file-conflict-incoming-recency-badge')).toHaveTextContent('Same time');
    expect(screen.getByTestId('file-conflict-existing-recency-badge')).toHaveTextContent('Same time');

    // NaN, Infinity, and negative byte sizes & non-finite timestamps sanitize cleanly
    const corruptIncoming: FileConflictVersion = {
      label: 'Incoming File',
      path: '/corrupt/a.dat',
      sizeBytes: Number.NaN,
      modifiedAt: 'Unknown',
      modifiedTimestamp: Number.NaN,
    };
    const negativeExisting: FileConflictVersion = {
      label: 'Existing File',
      path: '/corrupt/b.dat',
      sizeBytes: -4096,
      modifiedAt: 'Unknown',
      modifiedTimestamp: Number.POSITIVE_INFINITY,
    };

    rerender(<FileConflictDialog incoming={corruptIncoming} existing={negativeExisting} />);

    expect(screen.getByTestId('file-conflict-incoming-size')).toHaveTextContent('0 B');
    expect(screen.getByTestId('file-conflict-existing-size')).toHaveTextContent('0 B');
    expect(screen.getByTestId('file-conflict-incoming-size-badge')).toHaveTextContent('Same size');
    expect(screen.getByTestId('file-conflict-existing-size-badge')).toHaveTextContent('Same size');
    expect(screen.getByTestId('file-conflict-incoming-recency-badge')).toHaveTextContent('Same time');
    expect(screen.getByTestId('file-conflict-existing-recency-badge')).toHaveTextContent('Same time');
  });

  it('hides Apply to All when remainingConflicts <= 1 or invalid and forces applyToAll false on resolve', () => {
    const onResolve = vi.fn<(resolution: FileConflictResolution, applyToAll: boolean) => void>();

    const { rerender } = render(
      <FileConflictDialog remainingConflicts={4} onResolve={onResolve} />
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Apply to all 4 remaining conflicts' });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Shrink remainingConflicts to 1 -> checkbox disappears and applyToAll becomes false
    rerender(<FileConflictDialog remainingConflicts={1} onResolve={onResolve} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByTestId('file-conflict-remaining-badge')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(onResolve).toHaveBeenLastCalledWith('replace', false);

    // Zero, negative, and NaN counts also hide checkbox cleanly
    rerender(<FileConflictDialog remainingConflicts={0} />);
    expect(screen.queryByRole('checkbox')).toBeNull();

    rerender(<FileConflictDialog remainingConflicts={-5} />);
    expect(screen.queryByRole('checkbox')).toBeNull();

    rerender(<FileConflictDialog remainingConflicts={Number.NaN} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('handles modal mode: returns null when closed, renders frosted dialog backdrop, dismisses on Escape/backdrop/Cancel/Close, respects IME & stopPropagation, and cleans up listener on unmount', () => {
    const onCancel = vi.fn<() => void>();
    const modalRef = createRef<HTMLDivElement>();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    // Closed modal returns null and does not attach Escape listener
    const { container, rerender, unmount } = render(
      <FileConflictDialog mode="modal" open={false} onCancel={onCancel} />
    );
    expect(container.firstChild).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();

    // Open modal renders frosted backdrop with role="dialog" aria-modal="true"
    rerender(
      <FileConflictDialog
        ref={modalRef}
        mode="modal"
        open={true}
        onCancel={onCancel}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(modalRef.current).toBe(dialog);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('data-mode', 'modal');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    // Clicking inside the inner prism-slab panel stops propagation (does NOT dismiss)
    fireEvent.click(screen.getByTestId('file-conflict-panel'));
    expect(onCancel).not.toHaveBeenCalled();

    // Clicking frosted backdrop dismisses
    fireEvent.click(dialog);
    expect(onCancel).toHaveBeenCalledTimes(1);

    // Clicking modal Close icon and footer Cancel button dismisses
    fireEvent.click(screen.getByRole('button', { name: 'Close conflict dialog' }));
    expect(onCancel).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(3);

    // Non-Escape key does not dismiss
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onCancel).toHaveBeenCalledTimes(3);

    // IME composing Escape does not dismiss
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(onCancel).toHaveBeenCalledTimes(3);

    // Default-prevented Escape event does not dismiss
    const preventedEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    preventedEvent.preventDefault();
    window.dispatchEvent(preventedEvent);
    expect(onCancel).toHaveBeenCalledTimes(3);

    // Normal Escape key dismisses
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(4);

    // Custom aria-label in modal mode omits aria-labelledby
    rerender(
      <FileConflictDialog
        mode="modal"
        open={true}
        aria-label="Resolve transfer conflict"
        onCancel={onCancel}
      />
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Resolve transfer conflict');
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-labelledby');

    // Unmount cleans up window keydown listener
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(4);
  });

  it('renders XSS filenames and paths strictly as literal text and enforces disabled state in inline and modal modes', () => {
    const xss = '<script>window.__conflictXss=1</script><img src=x onerror=alert(1)>';
    const onResolve = vi.fn<(resolution: FileConflictResolution, applyToAll: boolean) => void>();
    const onCancel = vi.fn<() => void>();

    const adversarialIncoming: FileConflictVersion = {
      label: `Incoming ${xss}`,
      path: `/incoming/${xss}`,
      sizeBytes: 4096,
      modifiedAt: xss,
      modifiedTimestamp: 2000,
      checksumShort: xss,
    };
    const adversarialExisting: FileConflictVersion = {
      label: `Existing ${xss}`,
      path: `/existing/${xss}`,
      sizeBytes: 1024,
      modifiedAt: xss,
      modifiedTimestamp: 1000,
      checksumShort: xss,
    };

    const { rerender } = render(
      <FileConflictDialog
        fileName={xss}
        incoming={adversarialIncoming}
        existing={adversarialExisting}
        disabled={true}
        onResolve={onResolve}
        onCancel={onCancel}
        data-testid="adversarial-root"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('file-conflict-filename')).toHaveTextContent(xss);
    expect(screen.getByTestId('file-conflict-incoming-path')).toHaveTextContent(`/incoming/${xss}`);
    expect(screen.getByTestId('file-conflict-existing-path')).toHaveTextContent(`/existing/${xss}`);
    expect(screen.getByTestId('file-conflict-incoming-checksum')).toHaveTextContent(xss);

    // Inline disabled controls
    expect(screen.getByTestId('adversarial-root')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('file-conflict-apply-all')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Replace' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Keep Both' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    // Modal disabled mode blocks backdrop click, Escape key, and modal close button
    rerender(
      <FileConflictDialog
        mode="modal"
        open={true}
        disabled={true}
        onResolve={onResolve}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole('button', { name: 'Close conflict dialog' })).toBeDisabled();
    fireEvent.click(screen.getByRole('dialog'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
    expect(onResolve).not.toHaveBeenCalled();
  });
});
