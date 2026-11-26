import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  PermissionsSharingMatrix,
  calculatePosixOctal,
  calculatePosixSymbolic,
  calculatePosixTripletOctal,
  calculatePosixTripletSymbolic,
  type CloudShareAccessLevel,
  type CloudShareAccessLevelMap,
  type CloudShareExpiry,
  type CloudShareExpiryMap,
  type PermissionsSharingState,
  type PosixBitKey,
  type PosixBitKeyMap,
  type PosixPermissionsState,
  type PosixScopeKey,
  type PosixScopeKeyMap,
} from './index';

interface MockClipboard {
  writeText: (text: string) => Promise<void>;
}

interface NavigatorWithClipboard {
  clipboard?: MockClipboard;
}

interface DocumentWithExecCommand {
  execCommand?: (commandId: string) => boolean;
}

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const originalExecCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');

function setNavigatorClipboard(value: MockClipboard | undefined): void {
  Object.defineProperty(navigator as NavigatorWithClipboard, 'clipboard', {
    configurable: true,
    writable: true,
    value,
  });
}

function setDocumentExecCommand(value: ((commandId: string) => boolean) | undefined): void {
  Object.defineProperty(document as DocumentWithExecCommand, 'execCommand', {
    configurable: true,
    writable: true,
    value,
  });
}

function restoreClipboardApis(): void {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    delete (navigator as NavigatorWithClipboard).clipboard;
  }

  if (originalExecCommandDescriptor) {
    Object.defineProperty(document, 'execCommand', originalExecCommandDescriptor);
  } else {
    delete (document as DocumentWithExecCommand).execCommand;
  }
}

afterEach(() => {
  restoreClipboardApis();
  vi.useRealTimers();
});

describe('PermissionsSharingMatrix', () => {
  it('computes pure POSIX octal and symbolic helpers accurately across all boundary modes', () => {
    const mode0000: PosixPermissionsState = {
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: false, execute: false },
      public: { read: false, write: false, execute: false },
    };
    const mode0754: PosixPermissionsState = {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: false, execute: true },
      public: { read: true, write: false, execute: false },
    };
    const mode0777: PosixPermissionsState = {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: true, execute: true },
      public: { read: true, write: true, execute: true },
    };

    expect(calculatePosixTripletOctal(mode0000.owner)).toBe(0);
    expect(calculatePosixTripletSymbolic(mode0000.owner)).toBe('---');
    expect(calculatePosixOctal(mode0000)).toBe('0000');
    expect(calculatePosixSymbolic(mode0000)).toBe('---------');

    expect(calculatePosixTripletOctal(mode0754.owner)).toBe(7);
    expect(calculatePosixTripletOctal(mode0754.group)).toBe(5);
    expect(calculatePosixTripletOctal(mode0754.public)).toBe(4);
    expect(calculatePosixOctal(mode0754)).toBe('0754');
    expect(calculatePosixSymbolic(mode0754)).toBe('rwxr-xr--');

    expect(calculatePosixOctal(mode0777)).toBe('0777');
    expect(calculatePosixSymbolic(mode0777)).toBe('rwxrwxrwx');
  });

  it('satisfies Open-Internals contracts, forwards React 19 ref, applies theme overrides, renders default 0754/rwxr-xr--, and wraps <table> directly inside overflow-x-auto', () => {
    const ref = createRef<HTMLDivElement>();
    const scopeMap: PosixScopeKeyMap = { owner: true, group: true, public: true };
    const bitMap: PosixBitKeyMap = { read: true, write: true, execute: true };
    const accessMap: CloudShareAccessLevelMap = {
      restricted: true,
      viewer: true,
      commenter: true,
      editor: true,
    };
    const expiryMap: CloudShareExpiryMap = { '7d': true, '30d': true, never: true };
    expect(
      scopeMap.owner &&
        scopeMap.group &&
        scopeMap.public &&
        bitMap.read &&
        bitMap.write &&
        bitMap.execute &&
        accessMap.restricted &&
        accessMap.viewer &&
        accessMap.commenter &&
        accessMap.editor &&
        expiryMap['7d'] &&
        expiryMap['30d'] &&
        expiryMap.never
    ).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            PermissionsSharingMatrix: {
              className: 'theme-psm-override',
              style: { maxWidth: '820px' },
            },
          },
        }}
      >
        <PermissionsSharingMatrix
          ref={ref}
          className="local-psm-class"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="psm-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('psm-root');
    expect(ref.current).toBe(root);
    expect(PermissionsSharingMatrix.displayName).toBe('PermissionsSharingMatrix');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveClass(
      'refractor-permissions-sharing-matrix',
      'prism-slab',
      'theme-psm-override',
      'local-psm-class'
    );
    expect(root).toHaveStyle({ maxWidth: '820px', marginTop: '8px' });
    expect(root).toHaveAttribute('data-octal', '0754');
    expect(root).toHaveAttribute('data-share-access', 'viewer');
    expect(root).not.toHaveAttribute('data-disabled');

    expect(screen.getByTestId('psm-resource-name')).toHaveTextContent('prism-shader-kernel.sh');
    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0754 · rwxr-xr--');
    expect(screen.getByTestId('psm-chmod-readout')).toHaveTextContent('chmod 0754');

    // Table structure and direct overflow-x-auto wrapper invariant
    const table = screen.getByRole('table', { name: 'POSIX Access Matrix' });
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();
    expect(table.parentElement?.tagName.toLowerCase()).toBe('div');
    expect(table.parentElement).toHaveClass('overflow-x-auto');

    // Per-row octal digit readouts
    expect(screen.getByTestId('psm-row-octal-owner')).toHaveTextContent('7');
    expect(screen.getByTestId('psm-row-octal-group')).toHaveTextContent('5');
    expect(screen.getByTestId('psm-row-octal-public')).toHaveTextContent('4');

    // Ownership inputs inside prism-well
    const ownerInput = screen.getByLabelText('Resource owner');
    const groupInput = screen.getByLabelText('Resource group');
    expect(ownerInput).toHaveValue('prism-admin');
    expect(groupInput).toHaveValue('optical-eng');
    expect(ownerInput.closest('.prism-well')).not.toBeNull();
    expect(groupInput.closest('.prism-well')).not.toBeNull();

    // Default Cloud Share badge & controls
    const accessBadge = screen.getByTestId('psm-access-badge');
    expect(accessBadge).toHaveTextContent('Viewer');
    expect(accessBadge).toHaveAttribute('data-tone', 'success');
    expect(screen.getByLabelText('Cloud link access level')).toHaveValue('viewer');
    expect(screen.getByLabelText('Link expiration')).toHaveValue('30d');
    expect(screen.getByTestId('psm-share-url')).toHaveTextContent(
      'https://prism.refractor.dev/share/prism-shader-kernel'
    );
    expect(screen.getByTestId('psm-copy-link-btn')).toBeEnabled();
  });

  it('supports custom aria-label and falls back to default resourceName when blank whitespace is supplied', () => {
    render(
      <PermissionsSharingMatrix
        resourceName="   "
        aria-label="Custom permissions panel"
        data-testid="psm-custom-label"
      />
    );

    const root = screen.getByTestId('psm-custom-label');
    expect(root).toHaveAttribute('aria-label', 'Custom permissions panel');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByTestId('psm-resource-name')).toHaveTextContent('prism-shader-kernel.sh');
  });

  it('toggles all 9 POSIX checkboxes accurately and recalculates octal, symbolic, per-row digits, and live announcements', () => {
    const onChange = vi.fn<
      (state: PermissionsSharingState, octal: string, symbolic: string) => void
    >();

    render(<PermissionsSharingMatrix onChange={onChange} />);

    // Verify all 9 initial states for 0754 (rwxr-xr--)
    const expectations: ReadonlyArray<{
      scope: PosixScopeKey;
      bit: PosixBitKey;
      label: string;
      initialChecked: boolean;
    }> = [
      { scope: 'owner', bit: 'read', label: 'Owner Read (4)', initialChecked: true },
      { scope: 'owner', bit: 'write', label: 'Owner Write (2)', initialChecked: true },
      { scope: 'owner', bit: 'execute', label: 'Owner Execute (1)', initialChecked: true },
      { scope: 'group', bit: 'read', label: 'Group Read (4)', initialChecked: true },
      { scope: 'group', bit: 'write', label: 'Group Write (2)', initialChecked: false },
      { scope: 'group', bit: 'execute', label: 'Group Execute (1)', initialChecked: true },
      { scope: 'public', bit: 'read', label: 'Public Read (4)', initialChecked: true },
      { scope: 'public', bit: 'write', label: 'Public Write (2)', initialChecked: false },
      { scope: 'public', bit: 'execute', label: 'Public Execute (1)', initialChecked: false },
    ];

    for (const item of expectations) {
      const box = screen.getByRole('checkbox', { name: item.label });
      expect(box).toHaveAttribute('aria-checked', item.initialChecked ? 'true' : 'false');
    }

    // Toggle every single one of the 9 checkboxes once (inverting 0754 -> 0023 / ----w--wx)
    for (const item of expectations) {
      fireEvent.click(screen.getByRole('checkbox', { name: item.label }));
    }

    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0023 · ----w--wx');
    expect(screen.getByTestId('psm-row-octal-owner')).toHaveTextContent('0');
    expect(screen.getByTestId('psm-row-octal-group')).toHaveTextContent('2');
    expect(screen.getByTestId('psm-row-octal-public')).toHaveTextContent('3');
    expect(screen.getByTestId('psm-live-region')).toHaveTextContent(
      'Public Execute enabled (0023 ----w--wx).'
    );

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall?.[1]).toBe('0023');
    expect(lastCall?.[2]).toBe('----w--wx');
    expect(lastCall?.[0].posix).toEqual({
      owner: { read: false, write: false, execute: false },
      group: { read: false, write: true, execute: false },
      public: { read: false, write: true, execute: true },
    });

    // Enable the remaining 6 bits to reach 0777 (rwxrwxrwx)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Owner Read (4)' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Owner Write (2)' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Owner Execute (1)' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Group Read (4)' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Group Execute (1)' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Public Read (4)' }));

    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0777 · rwxrwxrwx');
    expect(screen.getByTestId('psm-row-octal-owner')).toHaveTextContent('7');
    expect(screen.getByTestId('psm-row-octal-group')).toHaveTextContent('7');
    expect(screen.getByTestId('psm-row-octal-public')).toHaveTextContent('7');

    // Disable Owner Execute to verify disabled announcement phrasing
    fireEvent.click(screen.getByRole('checkbox', { name: 'Owner Execute (1)' }));
    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0677 · rw-rwxrwx');
    expect(screen.getByTestId('psm-live-region')).toHaveTextContent(
      'Owner Execute disabled (0677 rw-rwxrwx).'
    );
  });

  it('applies 0644 Standard, 0755 Executable, and 0600 Private quick presets with aria-pressed states', () => {
    const onChange = vi.fn<
      (state: PermissionsSharingState, octal: string, symbolic: string) => void
    >();

    render(<PermissionsSharingMatrix onChange={onChange} />);

    const preset0644 = screen.getByRole('button', { name: '0644 Standard' });
    const preset0755 = screen.getByRole('button', { name: '0755 Executable' });
    const preset0600 = screen.getByRole('button', { name: '0600 Private' });

    expect(preset0644).toHaveAttribute('aria-pressed', 'false');
    expect(preset0755).toHaveAttribute('aria-pressed', 'false');
    expect(preset0600).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(preset0644);
    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0644 · rw-r--r--');
    expect(screen.getByTestId('psm-row-octal-owner')).toHaveTextContent('6');
    expect(screen.getByTestId('psm-row-octal-group')).toHaveTextContent('4');
    expect(screen.getByTestId('psm-row-octal-public')).toHaveTextContent('4');
    expect(preset0644).toHaveAttribute('aria-pressed', 'true');
    expect(preset0644).toHaveClass('prism-btn-cobalt');
    expect(screen.getByTestId('psm-live-region')).toHaveTextContent(
      'Applied 0644 Standard preset (0644 rw-r--r--).'
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ownerName: 'prism-admin' }),
      '0644',
      'rw-r--r--'
    );

    fireEvent.click(preset0755);
    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0755 · rwxr-xr-x');
    expect(screen.getByTestId('psm-row-octal-owner')).toHaveTextContent('7');
    expect(screen.getByTestId('psm-row-octal-group')).toHaveTextContent('5');
    expect(screen.getByTestId('psm-row-octal-public')).toHaveTextContent('5');
    expect(preset0755).toHaveAttribute('aria-pressed', 'true');
    expect(preset0644).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(preset0600);
    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0600 · rw-------');
    expect(screen.getByTestId('psm-row-octal-owner')).toHaveTextContent('6');
    expect(screen.getByTestId('psm-row-octal-group')).toHaveTextContent('0');
    expect(screen.getByTestId('psm-row-octal-public')).toHaveTextContent('0');
    expect(preset0600).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ groupName: 'optical-eng' }),
      '0600',
      'rw-------'
    );
  });

  it('edits Owner and Group inputs and handles IME-safe Enter keydown', () => {
    const onChange = vi.fn<
      (state: PermissionsSharingState, octal: string, symbolic: string) => void
    >();

    render(<PermissionsSharingMatrix onChange={onChange} />);

    const ownerInput = screen.getByLabelText('Resource owner') as HTMLInputElement;
    const groupInput = screen.getByLabelText('Resource group') as HTMLInputElement;

    fireEvent.change(ownerInput, { target: { value: 'deploy-bot' } });
    expect(ownerInput).toHaveValue('deploy-bot');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ownerName: 'deploy-bot', groupName: 'optical-eng' }),
      '0754',
      'rwxr-xr--'
    );

    fireEvent.change(groupInput, { target: { value: 'release-ops' } });
    expect(groupInput).toHaveValue('release-ops');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ownerName: 'deploy-bot', groupName: 'release-ops' }),
      '0754',
      'rwxr-xr--'
    );

    // IME composition Enter must NOT blur the input
    ownerInput.focus();
    expect(document.activeElement).toBe(ownerInput);
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      isComposing: true,
    });
    ownerInput.dispatchEvent(composingEvent);
    expect(document.activeElement).toBe(ownerInput);

    // Non-Enter key must NOT blur
    fireEvent.keyDown(ownerInput, { key: 'a' });
    expect(document.activeElement).toBe(ownerInput);

    // Standard Enter (not composing) blurs cleanly
    fireEvent.keyDown(ownerInput, { key: 'Enter' });
    expect(document.activeElement).not.toBe(ownerInput);
  });

  it('cycles all cloud share access levels, semantic badge tones, expiration options, and disables expiry/copy when restricted', () => {
    const onChange = vi.fn<
      (state: PermissionsSharingState, octal: string, symbolic: string) => void
    >();

    render(<PermissionsSharingMatrix onChange={onChange} />);

    const accessSelect = screen.getByLabelText('Cloud link access level');
    const expirySelect = screen.getByLabelText('Link expiration');
    const badge = screen.getByTestId('psm-access-badge');
    const copyButton = screen.getByTestId('psm-copy-link-btn');
    const urlReadout = screen.getByTestId('psm-share-url');

    // Restricted -> info tone, disables expiry & copy
    fireEvent.change(accessSelect, { target: { value: 'restricted' } });
    expect(badge).toHaveTextContent('Restricted');
    expect(badge).toHaveAttribute('data-tone', 'info');
    expect(expirySelect).toBeDisabled();
    expect(copyButton).toBeDisabled();
    expect(urlReadout).toHaveAttribute('data-url-status', 'restricted');
    expect(screen.getByTestId('psm-live-region')).toHaveTextContent(
      'Cloud link access set to Restricted.'
    );

    // Programmatic expiry change while restricted must be ignored
    const callCountBeforeBlockedExpiry = onChange.mock.calls.length;
    fireEvent.change(expirySelect, { target: { value: '7d' } });
    expect(onChange.mock.calls.length).toBe(callCountBeforeBlockedExpiry);

    // Commenter -> warning tone, re-enables expiry & copy
    fireEvent.change(accessSelect, { target: { value: 'commenter' } });
    expect(badge).toHaveTextContent('Commenter');
    expect(badge).toHaveAttribute('data-tone', 'warning');
    expect(expirySelect).toBeEnabled();
    expect(copyButton).toBeEnabled();
    expect(urlReadout).toHaveAttribute('data-url-status', 'active');

    // Editor -> primary tone
    fireEvent.change(accessSelect, { target: { value: 'editor' } });
    expect(badge).toHaveTextContent('Editor');
    expect(badge).toHaveAttribute('data-tone', 'primary');

    // Viewer -> success tone
    fireEvent.change(accessSelect, { target: { value: 'viewer' } });
    expect(badge).toHaveTextContent('Viewer');
    expect(badge).toHaveAttribute('data-tone', 'success');

    // Link expiration options (7d, 30d, never)
    fireEvent.change(expirySelect, { target: { value: '7d' } });
    expect(expirySelect).toHaveValue('7d');
    expect(screen.getByTestId('psm-live-region')).toHaveTextContent('Link expiration set to 7 days.');

    fireEvent.change(expirySelect, { target: { value: 'never' } });
    expect(expirySelect).toHaveValue('never');
    expect(screen.getByTestId('psm-live-region')).toHaveTextContent('Link expiration set to Never.');

    fireEvent.change(expirySelect, { target: { value: '30d' } });
    expect(expirySelect).toHaveValue('30d');
    expect(screen.getByTestId('psm-live-region')).toHaveTextContent(
      'Link expiration set to 30 days.'
    );

    // Adversarial unrecognized select values are safely ignored
    const callCountBeforeInvalid = onChange.mock.calls.length;
    fireEvent.change(accessSelect, { target: { value: 'superadmin' } });
    fireEvent.change(expirySelect, { target: { value: '999d' } });
    expect(onChange.mock.calls.length).toBe(callCountBeforeInvalid);
  });

  it('copies share link via navigator.clipboard, announces status, resets after timer, and handles stale async resolution safely', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    setNavigatorClipboard({ writeText });

    const { unmount } = render(
      <PermissionsSharingMatrix shareUrl="https://prism.refractor.dev/share/shader-v2" />
    );

    const copyBtn = screen.getByRole('button', { name: 'Copy Share Link' });
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('https://prism.refractor.dev/share/shader-v2');
    expect(copyBtn).toHaveAttribute('data-copied', 'true');
    expect(copyBtn).toHaveTextContent('Copied Link');
    expect(screen.getByTestId('psm-live-region')).toHaveTextContent(
      'Share link copied to clipboard.'
    );

    // Resets copied badge after delay
    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(copyBtn).not.toHaveAttribute('data-copied');
    expect(copyBtn).toHaveTextContent('Copy Share Link');

    // Superseding copy attempt & unmount while pending must not throw or clobber state
    let resolvePending: (() => void) | null = null;
    const pendingWrite = vi.fn<(text: string) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          resolvePending = resolve;
        })
    );
    setNavigatorClipboard({ writeText: pendingWrite });

    fireEvent.click(copyBtn);
    unmount();
    await act(async () => {
      resolvePending?.();
      await Promise.resolve();
    });
  });

  it('falls back to document.execCommand when clipboard API rejects and announces politely when unavailable', async () => {
    const failingWrite = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new Error('Clipboard permission denied'));
    const execCopy = vi.fn<(commandId: string) => boolean>().mockReturnValue(true);

    setNavigatorClipboard({ writeText: failingWrite });
    setDocumentExecCommand(execCopy);

    render(<PermissionsSharingMatrix shareUrl="/share/local-asset" />);

    const copyBtn = screen.getByTestId('psm-copy-link-btn');
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });

    expect(failingWrite).toHaveBeenCalledWith('/share/local-asset');
    expect(execCopy).toHaveBeenCalledWith('copy');
    expect(copyBtn).toHaveAttribute('data-copied', 'true');
    expect(screen.getByTestId('psm-live-region')).toHaveTextContent(
      'Share link copied to clipboard.'
    );

    // When execCommand throws, reports clipboard unavailable
    setNavigatorClipboard(undefined);
    setDocumentExecCommand(() => {
      throw new Error('execCommand blocked');
    });

    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });

    expect(copyBtn).not.toHaveAttribute('data-copied');
    expect(screen.getByTestId('psm-live-region')).toHaveTextContent(
      'Clipboard unavailable. Select the share link to copy manually.'
    );

    // When both clipboard and execCommand are absent
    setDocumentExecCommand(undefined);
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });
    expect(screen.getByTestId('psm-live-region')).toHaveTextContent(
      'Clipboard unavailable. Select the share link to copy manually.'
    );

    // When execCommand returns false
    setDocumentExecCommand(() => false);
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });
    expect(copyBtn).not.toHaveAttribute('data-copied');
  });

  it('blocks unsafe javascript:, vbscript:, and data: shareUrl protocols via sanitizeUrl and neutralizes XSS strings', () => {
    const { rerender, container } = render(
      <PermissionsSharingMatrix
        resourceName="<script>alert('xss')</script>"
        shareUrl="javascript:alert(document.cookie)"
        defaultValue={{
          ownerName: '<img src=x onerror=alert(1)>',
          groupName: '<b>ops</b>',
        }}
      />
    );

    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByTestId('psm-resource-name')).toHaveTextContent(
      "<script>alert('xss')</script>"
    );
    expect(screen.getByLabelText('Resource owner')).toHaveValue('<img src=x onerror=alert(1)>');
    expect(screen.getByLabelText('Resource group')).toHaveValue('<b>ops</b>');

    const urlReadout = screen.getByTestId('psm-share-url');
    const copyBtn = screen.getByTestId('psm-copy-link-btn');
    expect(urlReadout).toHaveAttribute('data-url-status', 'blocked');
    expect(urlReadout).toHaveTextContent('Blocked unsafe share link protocol');
    expect(urlReadout.textContent).not.toContain('javascript:');
    expect(copyBtn).toBeDisabled();

    rerender(<PermissionsSharingMatrix shareUrl="vbscript:msgbox(1)" />);
    expect(screen.getByTestId('psm-share-url')).toHaveAttribute('data-url-status', 'blocked');
    expect(screen.getByTestId('psm-copy-link-btn')).toBeDisabled();

    rerender(<PermissionsSharingMatrix shareUrl="data:text/html,<script>alert(1)</script>" />);
    expect(screen.getByTestId('psm-share-url')).toHaveAttribute('data-url-status', 'blocked');
    expect(screen.getByTestId('psm-copy-link-btn')).toBeDisabled();

    rerender(<PermissionsSharingMatrix shareUrl="   " />);
    expect(screen.getByTestId('psm-share-url')).toHaveAttribute('data-url-status', 'empty');
    expect(screen.getByTestId('psm-share-url')).toHaveTextContent('No share link configured');
    expect(screen.getByTestId('psm-copy-link-btn')).toBeDisabled();
  });

  it('supports uncontrolled defaultValue and fully controlled value + onChange synchronization', () => {
    const initialPartialPosix: PosixPermissionsState = {
      owner: { read: true, write: true, execute: false },
      group: { read: false, write: false, execute: false },
      public: { read: false, write: false, execute: false },
    };

    const { unmount } = render(
      <PermissionsSharingMatrix
        defaultValue={{
          ownerName: 'kernel-bot',
          groupName: 'sec-team',
          posix: initialPartialPosix,
          shareAccess: 'restricted',
          shareExpiry: '7d',
        }}
      />
    );

    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0600 · rw-------');
    expect(screen.getByLabelText('Resource owner')).toHaveValue('kernel-bot');
    expect(screen.getByLabelText('Resource group')).toHaveValue('sec-team');
    expect(screen.getByLabelText('Cloud link access level')).toHaveValue('restricted');
    expect(screen.getByLabelText('Link expiration')).toHaveValue('7d');
    expect(screen.getByLabelText('Link expiration')).toBeDisabled();
    unmount();

    // Controlled harness
    const onControlledAudit = vi.fn<(octal: string, symbolic: string, access: CloudShareAccessLevel, expiry: CloudShareExpiry) => void>();

    function ControlledHarness() {
      const [state, setState] = useState<PermissionsSharingState>({
        ownerName: 'ci-runner',
        groupName: 'infra',
        posix: {
          owner: { read: true, write: true, execute: false },
          group: { read: true, write: false, execute: false },
          public: { read: true, write: false, execute: false },
        },
        shareAccess: 'viewer',
        shareExpiry: '30d',
      });

      return (
        <PermissionsSharingMatrix
          value={state}
          onChange={(next, nextOctal, nextSymbolic) => {
            onControlledAudit(nextOctal, nextSymbolic, next.shareAccess, next.shareExpiry);
            setState(next);
          }}
        />
      );
    }

    const { unmount: unmountControlled } = render(<ControlledHarness />);
    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0644 · rw-r--r--');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Owner Execute (1)' }));
    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0744 · rwxr--r--');
    expect(onControlledAudit).toHaveBeenLastCalledWith('0744', 'rwxr--r--', 'viewer', '30d');
    unmountControlled();

    // Controlled without state update stays pinned to value prop
    const pinnedState: PermissionsSharingState = {
      ownerName: 'pinned-user',
      groupName: 'pinned-group',
      posix: {
        owner: { read: true, write: false, execute: false },
        group: { read: false, write: false, execute: false },
        public: { read: false, write: false, execute: false },
      },
      shareAccess: 'commenter',
      shareExpiry: 'never',
    };
    const pinnedChange = vi.fn();

    render(<PermissionsSharingMatrix value={pinnedState} onChange={pinnedChange} />);
    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0400 · r--------');
    fireEvent.click(screen.getByRole('button', { name: '0755 Executable' }));
    expect(pinnedChange).toHaveBeenCalledWith(expect.any(Object), '0755', 'rwxr-xr-x');
    expect(screen.getByTestId('psm-posix-pill')).toHaveTextContent('0400 · r--------');
  });

  it('disables all interactive controls and blocks programmatic change mutations when disabled is true', () => {
    const onChange = vi.fn();

    render(<PermissionsSharingMatrix disabled onChange={onChange} data-testid="psm-disabled" />);

    const root = screen.getByTestId('psm-disabled');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveClass('opacity-75');

    const buttons = within(root).getAllByRole('button');
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }

    const checkboxes = within(root).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(9);
    for (const checkbox of checkboxes) {
      expect(checkbox).toBeDisabled();
    }

    const ownerInput = screen.getByLabelText('Resource owner');
    const groupInput = screen.getByLabelText('Resource group');
    const accessSelect = screen.getByLabelText('Cloud link access level');
    const expirySelect = screen.getByLabelText('Link expiration');

    expect(ownerInput).toBeDisabled();
    expect(groupInput).toBeDisabled();
    expect(accessSelect).toBeDisabled();
    expect(expirySelect).toBeDisabled();

    // Programmatic change events on disabled controls must not invoke onChange
    fireEvent.change(ownerInput, { target: { value: 'mutated' } });
    fireEvent.change(groupInput, { target: { value: 'mutated' } });
    fireEvent.change(accessSelect, { target: { value: 'editor' } });
    fireEvent.change(expirySelect, { target: { value: '7d' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
