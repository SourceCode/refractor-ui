import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_SYSTEM_ABOUT_INFO,
  SystemAboutCard,
  formatUptimeDuration,
  type SystemAboutInfo,
  type SystemAboutModeMap,
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

function dispatchComposingKeyDown(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    isComposing: true,
  });
  Object.defineProperty(event, 'isComposing', { value: true });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  restoreClipboardApis();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SystemAboutCard', () => {
  it('satisfies Astryx contracts, forwards React 19 ref, applies theme overrides, renders default Workstation profile, and emits zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const modeMap: SystemAboutModeMap = { inline: true, modal: true };
    expect(modeMap.inline && modeMap.modal).toBe(true);
    expect(SystemAboutCard.displayName).toBe('SystemAboutCard');
    expect(DEFAULT_SYSTEM_ABOUT_INFO.osName).toBe('Refractor OS');

    const { container, rerender } = render(
      <PrismThemeProvider
        theme={{
          components: {
            SystemAboutCard: {
              className: 'theme-about-override',
              style: { maxWidth: '580px' },
            },
          },
        }}
      >
        <SystemAboutCard
          ref={ref}
          className="local-about-class"
          style={{ marginTop: '8px' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="about-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('about-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveClass(
      'refractor-system-about-card',
      'prism-slab',
      'theme-about-override',
      'local-about-class'
    );
    expect(root).toHaveAttribute('data-mode', 'inline');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).not.toHaveAttribute('data-live-uptime');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ maxWidth: '580px', marginTop: '8px' });

    // Optical Prism SVG Emblem
    const emblem = screen.getByTestId('system-about-emblem');
    expect(emblem.tagName.toLowerCase()).toBe('svg');
    expect(emblem).toHaveAttribute('viewBox', '0 0 72 72');
    expect(emblem).toHaveAttribute('aria-hidden', 'true');

    // Identity header
    expect(screen.getByTestId('system-about-os-name')).toHaveTextContent('Refractor OS');
    expect(screen.getByTestId('system-about-codename')).toHaveTextContent('Prism Workstation');
    expect(screen.getByTestId('system-about-version-badge')).toHaveTextContent(
      'v15.4 · Build 24E218'
    );
    expect(screen.getByTestId('system-about-uptime')).toHaveTextContent('Uptime 14d 06h 22m 08s');
    expect(screen.getByTestId('system-about-uptime')).toHaveAttribute('data-live', 'false');
    expect(screen.queryByTestId('system-about-close')).toBeNull();

    // Hardware specs <dl>
    const dl = screen.getByTestId('system-about-specs');
    expect(dl.tagName.toLowerCase()).toBe('dl');
    expect(screen.getByTestId('system-about-spec-value-chip')).toHaveTextContent(
      'Refractor Silicon M4 Prism'
    );
    expect(screen.getByTestId('system-about-spec-value-memory')).toHaveTextContent(
      '64 GB Unified Optical'
    );
    expect(screen.getByTestId('system-about-spec-value-graphics')).toHaveTextContent(
      'Prism GPU 40-Core'
    );
    expect(screen.getByTestId('system-about-spec-value-display')).toHaveTextContent(
      '6K Pro Refractive XDR (6016×3384)'
    );
    expect(screen.getByTestId('system-about-spec-value-serial')).toHaveTextContent(
      '••••-••••-PRSM'
    );
    expect(screen.getByTestId('system-about-spec-value-serial')).toHaveAttribute(
      'data-masked',
      'true'
    );

    // Storage capacity meter
    const storageBar = screen.getByRole('progressbar', { name: 'Internal Optical NVMe usage' });
    expect(storageBar).toHaveAttribute('aria-valuemin', '0');
    expect(storageBar).toHaveAttribute('aria-valuemax', '100');
    expect(storageBar).toHaveAttribute('aria-valuenow', '41');
    expect(storageBar).toHaveAttribute('data-tone', 'normal');
    expect(screen.getByTestId('system-about-storage-readout')).toHaveTextContent(
      '412 / 1000 GB (41%)'
    );
    expect(screen.getByTestId('system-about-storage-fill').style.backgroundColor).toBe(
      'var(--prism-primary-main)'
    );

    // External sanitized links & copyright
    const releaseLink = screen.getByRole('link', { name: 'Release Notes' });
    expect(releaseLink).toHaveAttribute('href', 'https://refractor-ui.dev/releases/15.4');
    expect(releaseLink).toHaveAttribute('target', '_blank');
    expect(releaseLink).toHaveAttribute('rel', 'noopener noreferrer');

    const licenseLink = screen.getByRole('link', { name: 'Open Source Licenses' });
    expect(licenseLink).toHaveAttribute('href', 'https://refractor-ui.dev/licenses');
    expect(licenseLink).toHaveAttribute('target', '_blank');
    expect(licenseLink).toHaveAttribute('rel', 'noopener noreferrer');

    expect(screen.getByTestId('system-about-copyright')).toHaveTextContent(
      '© 2026 Refractor Optical Systems. All rights reserved.'
    );

    // Zero raw hex/rgb/hsl color literals anywhere in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);

    // Custom aria-label overrides aria-labelledby
    rerender(<SystemAboutCard aria-label="Workstation Details" data-testid="about-root" />);
    const updated = screen.getByTestId('about-root');
    expect(updated).toHaveAttribute('aria-label', 'Workstation Details');
    expect(updated).not.toHaveAttribute('aria-labelledby');
  });

  it('masks sensitive fields by default, toggles Reveal/Hide, masks short secrets fully, and reflects reveal state in Copy Diagnostics', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    setNavigatorClipboard({ writeText });
    const onCopyDiagnostics = vi.fn<(report: string) => void>();

    const customInfo: SystemAboutInfo = {
      ...DEFAULT_SYSTEM_ABOUT_INFO,
      specs: [
        ...DEFAULT_SYSTEM_ABOUT_INFO.specs,
        { id: 'pin', label: 'Hardware PIN', value: '99A1', sensitive: true },
      ],
    };

    render(<SystemAboutCard info={customInfo} onCopyDiagnostics={onCopyDiagnostics} />);

    // Short secret (<= 4 chars) is completely masked without leaking characters
    expect(screen.getByTestId('system-about-spec-value-pin')).toHaveTextContent('••••••••');

    const revealSerialBtn = screen.getByTestId('system-about-reveal-serial');
    expect(revealSerialBtn).toHaveAttribute('aria-pressed', 'false');
    expect(revealSerialBtn).toHaveAttribute('aria-label', 'Reveal Serial Number');

    // Copy Diagnostics while masked must NOT expose raw serial
    const copyBtn = screen.getByTestId('system-about-copy-btn');
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });

    expect(onCopyDiagnostics).toHaveBeenCalledTimes(1);
    const maskedReport = onCopyDiagnostics.mock.calls[0]?.[0] ?? '';
    expect(maskedReport).toContain('System: Refractor OS (Prism Workstation)');
    expect(maskedReport).toContain('Version: v15.4 · Build 24E218');
    expect(maskedReport).toContain('Uptime: 14d 06h 22m 08s');
    expect(maskedReport).toContain('Serial Number: ••••-••••-PRSM');
    expect(maskedReport).not.toContain('RFR-X9K4-8821-PRSM');
    expect(maskedReport).toContain('Hardware PIN: ••••••••');
    expect(maskedReport).not.toContain('99A1');
    expect(maskedReport).toContain('Storage (Internal Optical NVMe): 412 / 1000 GB (41%)');
    expect(writeText).toHaveBeenLastCalledWith(maskedReport);

    expect(copyBtn).toHaveAttribute('data-copied', 'true');
    expect(copyBtn).toHaveTextContent('Copied');
    expect(screen.getByTestId('system-about-status')).toHaveTextContent(
      'Diagnostics copied to clipboard.'
    );

    // Copied confirmation resets automatically after 2000ms
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(copyBtn).toHaveAttribute('data-copied', 'false');
    expect(copyBtn).toHaveTextContent('Copy Diagnostics');

    // Reveal Serial Number and re-copy -> raw serial now included
    fireEvent.click(revealSerialBtn);
    expect(revealSerialBtn).toHaveAttribute('aria-pressed', 'true');
    expect(revealSerialBtn).toHaveAttribute('aria-label', 'Hide Serial Number');
    expect(screen.getByTestId('system-about-spec-value-serial')).toHaveTextContent(
      'RFR-X9K4-8821-PRSM'
    );
    expect(screen.getByTestId('system-about-spec-value-serial')).toHaveAttribute(
      'data-masked',
      'false'
    );
    expect(screen.getByTestId('system-about-status')).toHaveTextContent(
      'Serial Number revealed.'
    );

    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });
    const revealedReport = onCopyDiagnostics.mock.calls[1]?.[0] ?? '';
    expect(revealedReport).toContain('Serial Number: RFR-X9K4-8821-PRSM');
    expect(revealedReport).toContain('Hardware PIN: ••••••••');

    // Re-hide Serial Number
    fireEvent.click(revealSerialBtn);
    expect(revealSerialBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('system-about-spec-value-serial')).toHaveTextContent(
      '••••-••••-PRSM'
    );
    expect(screen.getByTestId('system-about-status')).toHaveTextContent('Serial Number masked.');
  });

  it('handles clipboard rejection fallback, missing clipboard fallback, execCommand failure/throw, rapid re-clicks, and unmount during async copy', async () => {
    const onCopyDiagnostics = vi.fn<(report: string) => void>();

    // 1. navigator.clipboard.writeText rejects -> falls back cleanly to document.execCommand('copy')
    const rejectingWrite = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new Error('Permission denied'));
    const execCommand = vi.fn<(cmd: string) => boolean>().mockReturnValue(true);
    setNavigatorClipboard({ writeText: rejectingWrite });
    setDocumentExecCommand(execCommand);

    const { unmount } = render(<SystemAboutCard onCopyDiagnostics={onCopyDiagnostics} />);

    const copyBtn = screen.getByTestId('system-about-copy-btn');
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(rejectingWrite).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(copyBtn).toHaveAttribute('data-copied', 'true');
    expect(screen.getByTestId('system-about-status')).toHaveTextContent(
      'Diagnostics copied to clipboard.'
    );

    // 2. navigator.clipboard undefined + execCommand returns true -> fallback works
    setNavigatorClipboard(undefined);
    execCommand.mockClear();
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(copyBtn).toHaveAttribute('data-copied', 'true');

    // 3. navigator.clipboard undefined + execCommand returns false -> unavailable status
    execCommand.mockReturnValue(false);
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });
    expect(copyBtn).toHaveAttribute('data-copied', 'false');
    expect(screen.getByTestId('system-about-status')).toHaveTextContent(
      'Clipboard unavailable. Diagnostics report prepared.'
    );

    // 4. navigator.clipboard undefined + execCommand throws -> unavailable status (no uncaught error)
    execCommand.mockImplementation(() => {
      throw new Error('Blocked');
    });
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });
    expect(copyBtn).toHaveAttribute('data-copied', 'false');
    expect(screen.getByTestId('system-about-status')).toHaveTextContent(
      'Clipboard unavailable. Diagnostics report prepared.'
    );

    // 5. Both clipboard and execCommand undefined -> unavailable status
    setDocumentExecCommand(undefined);
    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });
    expect(copyBtn).toHaveAttribute('data-copied', 'false');
    expect(onCopyDiagnostics).toHaveBeenCalledTimes(5);

    // 6. Stale async attempt + unmount guard
    let resolveFirst: (() => void) | undefined;
    let resolveSecond: (() => void) | undefined;
    const controlledWrite = vi
      .fn<(text: string) => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSecond = resolve;
          })
      );
    setNavigatorClipboard({ writeText: controlledWrite });

    fireEvent.click(copyBtn);
    fireEvent.click(copyBtn);
    // First attempt resolves AFTER second was initiated -> ignored safely
    await act(async () => {
      resolveFirst?.();
      await Promise.resolve();
    });
    expect(copyBtn).toHaveAttribute('data-copied', 'false');

    // Unmount before second promise resolves -> mountedRef guards setState
    unmount();
    await act(async () => {
      resolveSecond?.();
      await Promise.resolve();
    });
  });

  it('runs Software Update check flow with polite status transitions and cleans up timers on unmount', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const onCheckUpdates = vi.fn<() => void>();

    const { unmount } = render(<SystemAboutCard onCheckUpdates={onCheckUpdates} />);

    const updateBtn = screen.getByRole('button', { name: 'Software Update…' });
    expect(updateBtn).toHaveAttribute('data-update-state', 'idle');

    fireEvent.click(updateBtn);
    expect(onCheckUpdates).toHaveBeenCalledTimes(1);
    expect(updateBtn).toHaveAttribute('data-update-state', 'checking');
    expect(screen.getByTestId('system-about-status')).toHaveTextContent(
      'Checking for updates…'
    );

    // Re-trigger mid-check resets pending timer cleanly
    act(() => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.click(updateBtn);
    expect(onCheckUpdates).toHaveBeenCalledTimes(2);
    expect(clearTimeoutSpy).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(updateBtn).toHaveAttribute('data-update-state', 'up-to-date');
    expect(screen.getByTestId('system-about-status')).toHaveTextContent('Up to date');

    // Start another update check and unmount before completion
    fireEvent.click(updateBtn);
    const clearCallsBefore = clearTimeoutSpy.mock.calls.length;
    unmount();
    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(clearCallsBefore);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it('ticks liveUptime every 1000ms, cleans up intervals on disable and unmount, and sanitizes uptime inputs', () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    // Direct unit checks on formatUptimeDuration including adversarial inputs
    expect(formatUptimeDuration(0)).toBe('0d 00h 00m 00s');
    expect(formatUptimeDuration(1_232_528)).toBe('14d 06h 22m 08s');
    expect(formatUptimeDuration(3661.9)).toBe('0d 01h 01m 01s');
    expect(formatUptimeDuration(-999)).toBe('0d 00h 00m 00s');
    expect(formatUptimeDuration(Number.NaN)).toBe('0d 00h 00m 00s');
    expect(formatUptimeDuration(Number.POSITIVE_INFINITY)).toBe('0d 00h 00m 00s');
    expect(formatUptimeDuration(Number.NEGATIVE_INFINITY)).toBe('0d 00h 00m 00s');

    const { rerender, unmount } = render(<SystemAboutCard liveUptime={false} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('system-about-uptime')).toHaveTextContent('Uptime 14d 06h 22m 08s');

    // Enable liveUptime -> ticks every 1000ms
    rerender(<SystemAboutCard liveUptime={true} data-testid="live-root" />);
    expect(screen.getByTestId('live-root')).toHaveAttribute('data-live-uptime', 'true');
    expect(screen.getByTestId('system-about-uptime')).toHaveAttribute('data-live', 'true');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('system-about-uptime')).toHaveTextContent('Uptime 14d 06h 22m 11s');

    // Disable liveUptime -> clears interval and stops incrementing
    const clearsBeforeDisable = clearIntervalSpy.mock.calls.length;
    rerender(<SystemAboutCard liveUptime={false} data-testid="live-root" />);
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearsBeforeDisable);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('system-about-uptime')).toHaveTextContent('Uptime 14d 06h 22m 11s');

    // Re-enable with adversarial NaN uptimeSeconds -> clamps to 0d 00h 00m 00s and ticks cleanly
    rerender(
      <SystemAboutCard
        liveUptime={true}
        info={{ ...DEFAULT_SYSTEM_ABOUT_INFO, uptimeSeconds: Number.NaN }}
      />
    );
    expect(screen.getByTestId('system-about-uptime')).toHaveTextContent('Uptime 0d 00h 00m 00s');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('system-about-uptime')).toHaveTextContent('Uptime 0d 00h 00m 02s');

    // Unmount cleans up active interval strictly
    const clearsBeforeUnmount = clearIntervalSpy.mock.calls.length;
    unmount();
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearsBeforeUnmount);
  });

  it('shifts storage bar semantic tone at >= 75% and >= 90%, clamps adversarial storage metrics, and supports minimal SystemAboutInfo profiles', async () => {
    const onCopyDiagnostics = vi.fn<(report: string) => void>();

    // Warning tone (>= 75% and < 90%)
    const { rerender } = render(
      <SystemAboutCard
        info={{
          ...DEFAULT_SYSTEM_ABOUT_INFO,
          storage: { usedGb: 780, totalGb: 1000, label: 'Scratch NVMe' },
        }}
      />
    );
    expect(screen.getByTestId('system-about-storage-bar')).toHaveAttribute('data-tone', 'warning');
    expect(screen.getByTestId('system-about-storage-bar')).toHaveAttribute('aria-valuenow', '78');
    expect(screen.getByTestId('system-about-storage-fill').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );

    // Critical tone (>= 90%) + clamping when usedGb > totalGb
    rerender(
      <SystemAboutCard
        info={{
          ...DEFAULT_SYSTEM_ABOUT_INFO,
          storage: { usedGb: 1400, totalGb: 1000 },
        }}
      />
    );
    expect(screen.getByTestId('system-about-storage-label')).toHaveTextContent('Storage');
    expect(screen.getByTestId('system-about-storage-bar')).toHaveAttribute('data-tone', 'critical');
    expect(screen.getByTestId('system-about-storage-bar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByTestId('system-about-storage-readout')).toHaveTextContent(
      '1000 / 1000 GB (100%)'
    );
    expect(screen.getByTestId('system-about-storage-fill').style.backgroundColor).toBe(
      'var(--prism-error-main)'
    );

    // NaN / Infinity / negative storage values clamp safely to 0%
    rerender(
      <SystemAboutCard
        info={{
          ...DEFAULT_SYSTEM_ABOUT_INFO,
          storage: { usedGb: Number.NaN, totalGb: Number.POSITIVE_INFINITY },
        }}
      />
    );
    expect(screen.getByTestId('system-about-storage-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('system-about-storage-readout')).toHaveTextContent('0 / 0 GB (0%)');

    rerender(
      <SystemAboutCard
        info={{
          ...DEFAULT_SYSTEM_ABOUT_INFO,
          storage: { usedGb: -50, totalGb: 500, label: '   ' },
        }}
      />
    );
    expect(screen.getByTestId('system-about-storage-label')).toHaveTextContent('Storage');
    expect(screen.getByTestId('system-about-storage-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('system-about-storage-readout')).toHaveTextContent('0 / 500 GB (0%)');

    // Minimal profile: no codename, empty version, empty buildNumber, empty specs, no storage, no links, no copyright
    rerender(
      <SystemAboutCard
        onCopyDiagnostics={onCopyDiagnostics}
        info={{
          osName: 'Minimal Core OS',
          version: '   ',
          buildNumber: '   ',
          uptimeSeconds: 65,
          specs: [],
        }}
      />
    );
    expect(screen.getByTestId('system-about-os-name')).toHaveTextContent('Minimal Core OS');
    expect(screen.queryByTestId('system-about-codename')).toBeNull();
    expect(screen.getByTestId('system-about-version-badge')).toHaveTextContent('v0.0');
    expect(screen.queryByTestId('system-about-specs')).toBeNull();
    expect(screen.queryByTestId('system-about-storage')).toBeNull();
    expect(screen.queryByTestId('system-about-links')).toBeNull();
    expect(screen.queryByTestId('system-about-copyright')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByTestId('system-about-copy-btn'));
      await Promise.resolve();
    });
    const minimalReport = onCopyDiagnostics.mock.calls[0]?.[0] ?? '';
    expect(minimalReport).toBe(
      ['System: Minimal Core OS', 'Version: v0.0', 'Uptime: 0d 00h 01m 05s'].join('\n')
    );

    // Pre-prefixed v-version does not duplicate leading 'v'
    rerender(
      <SystemAboutCard
        info={{
          osName: 'Refractor OS',
          version: 'v16.2',
          buildNumber: '25A101',
          uptimeSeconds: 10,
          specs: [],
          copyright: 'Copyright Notice Only',
        }}
      />
    );
    expect(screen.getByTestId('system-about-version-badge')).toHaveTextContent(
      'v16.2 · Build 25A101'
    );
    expect(screen.queryByTestId('system-about-links')).toBeNull();
    expect(screen.getByTestId('system-about-copyright')).toHaveTextContent('Copyright Notice Only');
  });

  it('blocks javascript:, data:, and vbscript: links via sanitizeUrl while preserving valid external and relative links and escaping XSS text', () => {
    const xssPayload = '<script>window.__aboutXss=1</script><img src=x onerror=alert(1)>';
    const infoWithLinks: SystemAboutInfo = {
      ...DEFAULT_SYSTEM_ABOUT_INFO,
      osName: xssPayload,
      links: [
        { id: 'https', label: 'Docs HTTPS', href: 'https://refractor-ui.dev/docs' },
        { id: 'http', label: 'Legacy HTTP', href: 'http://refractor-ui.dev/changelog' },
        { id: 'relative', label: 'Local License', href: '/licenses/mit' },
        { id: 'hash', label: 'Legal Section', href: '#legal' },
        { id: 'js', label: 'Malicious JS', href: 'javascript:alert(1)' },
        {
          id: 'data',
          label: 'Malicious Data',
          href: 'data:text/html,<script>alert(1)</script>',
        },
        { id: 'vbs', label: 'Malicious VBS', href: 'vbscript:msgbox(1)' },
        { id: 'obfuscated', label: 'Obfuscated JS', href: ' \u0000JavaScript:alert(2) ' },
      ],
    };

    render(<SystemAboutCard info={infoWithLinks} />);

    // XSS text rendered strictly as text nodes
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('system-about-os-name')).toHaveTextContent(xssPayload);

    // Valid external http(s) links get target="_blank" rel="noopener noreferrer"
    const httpsLink = screen.getByTestId('system-about-link-https');
    expect(httpsLink.tagName.toLowerCase()).toBe('a');
    expect(httpsLink).toHaveAttribute('href', 'https://refractor-ui.dev/docs');
    expect(httpsLink).toHaveAttribute('target', '_blank');
    expect(httpsLink).toHaveAttribute('rel', 'noopener noreferrer');

    const httpLink = screen.getByTestId('system-about-link-http');
    expect(httpLink.tagName.toLowerCase()).toBe('a');
    expect(httpLink).toHaveAttribute('target', '_blank');
    expect(httpLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Valid relative & hash links do not force target="_blank"
    const relLink = screen.getByTestId('system-about-link-relative');
    expect(relLink.tagName.toLowerCase()).toBe('a');
    expect(relLink).toHaveAttribute('href', '/licenses/mit');
    expect(relLink).not.toHaveAttribute('target');

    const hashLink = screen.getByTestId('system-about-link-hash');
    expect(hashLink.tagName.toLowerCase()).toBe('a');
    expect(hashLink).toHaveAttribute('href', '#legal');

    // Unsafe URLs are rendered as inert non-clickable spans, never <a> tags
    for (const blockedId of ['js', 'data', 'vbs', 'obfuscated']) {
      const blocked = screen.getByTestId(`system-about-link-blocked-${blockedId}`);
      expect(blocked.tagName.toLowerCase()).toBe('span');
      expect(blocked).toHaveAttribute('data-sanitized', 'blocked');
      expect(blocked).not.toHaveAttribute('href');
    }
    expect(screen.queryByRole('link', { name: /Malicious|Obfuscated/i })).toBeNull();
  });

  it('renders modal mode with open=false guard, backdrop/close dismissal, IME-safe Escape closing, and disabled enforcement', () => {
    const onClose = vi.fn<() => void>();
    const onCopyDiagnostics = vi.fn<(report: string) => void>();
    const onCheckUpdates = vi.fn<() => void>();

    // open=false in modal mode returns null and attaches no Escape handler
    const { container, rerender } = render(
      <SystemAboutCard mode="modal" open={false} onClose={onClose} />
    );
    expect(container.firstChild).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    // open=true renders role="dialog" aria-modal="true"
    rerender(
      <SystemAboutCard
        mode="modal"
        open={true}
        onClose={onClose}
        onCopyDiagnostics={onCopyDiagnostics}
        onCheckUpdates={onCheckUpdates}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBe(screen.getByTestId('system-about-backdrop'));
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('data-mode', 'modal');
    expect(dialog).toHaveAttribute('data-open', 'true');

    // Clicking inner panel stops propagation and does NOT dismiss
    fireEvent.click(screen.getByTestId('system-about-panel'));
    expect(onClose).not.toHaveBeenCalled();

    // Clicking backdrop calls onClose
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Clicking Close button calls onClose
    fireEvent.click(screen.getByTestId('system-about-close'));
    expect(onClose).toHaveBeenCalledTimes(2);

    // Escape on dialog closes EXACTLY ONCE (no double-firing on window bubble)
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);

    // Escape directly on window closes once
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(4);

    // Non-Escape keys do not dismiss
    fireEvent.keyDown(dialog, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(onClose).toHaveBeenCalledTimes(4);

    // IME composing Escape is ignored on both dialog and window
    dispatchComposingKeyDown(dialog, 'Escape');
    dispatchComposingKeyDown(window, 'Escape');
    expect(onClose).toHaveBeenCalledTimes(4);

    // IME composing keydown on interactive buttons calls preventDefault; non-composing does not
    const copyBtn = screen.getByTestId('system-about-copy-btn');
    const composingBtnEvt = dispatchComposingKeyDown(copyBtn, 'Enter');
    expect(composingBtnEvt.defaultPrevented).toBe(true);
    const normalBtnEvt = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      isComposing: false,
    });
    copyBtn.dispatchEvent(normalBtnEvt);
    expect(normalBtnEvt.defaultPrevented).toBe(false);

    // Caller onKeyDown preventDefault suppresses internal modal Escape handling
    rerender(
      <SystemAboutCard
        mode="modal"
        open={true}
        onClose={onClose}
        onKeyDown={(event) => event.preventDefault()}
      />
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(4);

    // Disabled state blocks all interactive actions, renders inert disabled links, and ignores DOM-stripped disabled attributes
    rerender(
      <SystemAboutCard
        mode="modal"
        open={true}
        disabled={true}
        onClose={onClose}
        onCopyDiagnostics={onCopyDiagnostics}
        onCheckUpdates={onCheckUpdates}
      />
    );
    const disabledDialog = screen.getByRole('dialog');
    expect(disabledDialog).toHaveAttribute('aria-disabled', 'true');
    expect(disabledDialog).toHaveAttribute('data-disabled', 'true');

    expect(screen.getByTestId('system-about-link-disabled-release-notes')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.queryByRole('link')).toBeNull();

    // Backdrop click, Escape on dialog & window ignored while disabled
    fireEvent.click(disabledDialog);
    fireEvent.keyDown(disabledDialog, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(4);

    // Adversarially stripping DOM `disabled` attribute is still blocked by handler guards
    const closeBtn = screen.getByTestId('system-about-close');
    const revealBtn = screen.getByTestId('system-about-reveal-serial');
    const disabledCopyBtn = screen.getByTestId('system-about-copy-btn');
    const disabledUpdateBtn = screen.getByTestId('system-about-update-btn');

    for (const button of [closeBtn, revealBtn, disabledCopyBtn, disabledUpdateBtn]) {
      expect(button).toBeDisabled();
      button.removeAttribute('disabled');
      fireEvent.click(button);
    }

    expect(onClose).toHaveBeenCalledTimes(4);
    expect(onCopyDiagnostics).not.toHaveBeenCalled();
    expect(onCheckUpdates).not.toHaveBeenCalled();
    expect(screen.getByTestId('system-about-spec-value-serial')).toHaveTextContent(
      '••••-••••-PRSM'
    );

    // Inline disabled mode also applies disabled styling & aria-disabled
    rerender(<SystemAboutCard mode="inline" disabled={true} data-testid="inline-disabled" />);
    const inlineDisabled = screen.getByTestId('inline-disabled');
    expect(inlineDisabled).toHaveAttribute('aria-disabled', 'true');
    expect(inlineDisabled).toHaveClass('opacity-65');
  });
});
