import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ScreenCaptureHud,
  type CaptureOutputKind,
  type CaptureOutputKindMap,
  type CaptureSaveLocation,
  type CaptureSaveLocationMap,
  type CaptureTargetMode,
  type CaptureTargetModeMap,
  type ScreenCaptureResult,
} from './index';

describe('ScreenCaptureHud', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders prism-slab HUD toolbar, React 19 ref, theme overrides, default controls, and polite live status strip', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ScreenCaptureHud: {
              className: 'theme-capture-hud',
              style: { maxWidth: '860px' },
            },
          },
        }}
      >
        <ScreenCaptureHud
          ref={ref}
          className="local-capture-hud"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '16px' }}
          data-testid="capture-hud-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('capture-hud-root');
    expect(ScreenCaptureHud.displayName).toBe('ScreenCaptureHud');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-screen-capture-hud',
      'prism-slab',
      'theme-capture-hud',
      'local-capture-hud'
    );
    expect(root).toHaveStyle({ maxWidth: '860px', padding: '16px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Screen capture HUD');
    expect(root).toHaveAttribute('data-target', 'fullscreen');
    expect(root).toHaveAttribute('data-output', 'screenshot');
    expect(root).toHaveAttribute('data-phase', 'idle');

    // Toolbar & target radiogroup
    expect(screen.getByRole('toolbar', { name: 'Screen capture controls' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Capture target' })).toBeInTheDocument();

    const fullScreenRadio = screen.getByRole('radio', { name: 'Full Screen' });
    const windowRadio = screen.getByRole('radio', { name: 'Window' });
    const regionRadio = screen.getByRole('radio', { name: 'Region' });
    expect(fullScreenRadio).toHaveAttribute('aria-checked', 'true');
    expect(fullScreenRadio).toHaveAttribute('tabindex', '0');
    expect(windowRadio).toHaveAttribute('aria-checked', 'false');
    expect(windowRadio).toHaveAttribute('tabindex', '-1');
    expect(regionRadio).toHaveAttribute('aria-checked', 'false');
    expect(regionRadio).toHaveAttribute('tabindex', '-1');

    // Output switcher
    expect(screen.getByRole('button', { name: 'Screenshot' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Record Video' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Options cluster
    const timerSelect = screen.getByRole('combobox', { name: 'Capture countdown timer' });
    const saveSelect = screen.getByRole('combobox', { name: 'Capture save location' });
    const micButton = screen.getByRole('button', { name: 'Microphone' });
    expect(timerSelect).toHaveValue('0');
    expect(saveSelect).toHaveValue('desktop');
    expect(micButton).toBeDisabled();
    expect(micButton).toHaveAttribute('aria-pressed', 'false');

    // Action button & optional dismiss omitted
    expect(screen.getByRole('button', { name: 'Capture' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Close HUD' })).not.toBeInTheDocument();

    // Polite status strip
    const statusStrip = screen.getByTestId('screen-capture-status-strip');
    expect(statusStrip).toHaveAttribute('role', 'status');
    expect(statusStrip).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('screen-capture-status')).toHaveTextContent(
      'Ready · Full Screen · Screenshot · Desktop'
    );
    expect(screen.getByTestId('screen-capture-telemetry')).toHaveTextContent(
      'Full Screen · No Delay · Desktop'
    );
  });

  it('switches across all 3 capture targets via click and IME-safe Arrow/Home/End keyboard navigation', () => {
    render(<ScreenCaptureHud data-testid="hud" />);

    const root = screen.getByTestId('hud');
    const fullScreenRadio = screen.getByRole('radio', { name: 'Full Screen' });
    const windowRadio = screen.getByRole('radio', { name: 'Window' });
    const regionRadio = screen.getByRole('radio', { name: 'Region' });

    // Click switching
    fireEvent.click(windowRadio);
    expect(windowRadio).toHaveAttribute('aria-checked', 'true');
    expect(root).toHaveAttribute('data-target', 'window');
    expect(screen.getByTestId('screen-capture-status')).toHaveTextContent(
      'Capture target set to Window'
    );

    fireEvent.click(regionRadio);
    expect(regionRadio).toHaveAttribute('aria-checked', 'true');
    expect(root).toHaveAttribute('data-target', 'region');

    fireEvent.click(fullScreenRadio);
    expect(fullScreenRadio).toHaveAttribute('aria-checked', 'true');
    expect(root).toHaveAttribute('data-target', 'fullscreen');

    // ArrowRight wraps fullscreen -> window -> region -> fullscreen
    fullScreenRadio.focus();
    fireEvent.keyDown(fullScreenRadio, { key: 'ArrowRight' });
    expect(windowRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(windowRadio);

    fireEvent.keyDown(windowRadio, { key: 'ArrowDown' });
    expect(regionRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(regionRadio);

    fireEvent.keyDown(regionRadio, { key: 'ArrowRight' });
    expect(fullScreenRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(fullScreenRadio);

    // ArrowLeft / ArrowUp wraps backward fullscreen -> region -> window
    fireEvent.keyDown(fullScreenRadio, { key: 'ArrowLeft' });
    expect(regionRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(regionRadio);

    fireEvent.keyDown(regionRadio, { key: 'ArrowUp' });
    expect(windowRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(windowRadio);

    // End / Home jumps to region / fullscreen
    fireEvent.keyDown(windowRadio, { key: 'End' });
    expect(regionRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(regionRadio);

    fireEvent.keyDown(regionRadio, { key: 'Home' });
    expect(fullScreenRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(fullScreenRadio);

    // Unrelated key and IME composition are safely ignored
    fireEvent.keyDown(fullScreenRadio, { key: 'x' });
    expect(fullScreenRadio).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(fullScreenRadio, { key: 'ArrowRight', isComposing: true });
    expect(fullScreenRadio).toHaveAttribute('aria-checked', 'true');
    expect(root).toHaveAttribute('data-target', 'fullscreen');

    // IME composition guard on action buttons prevents premature activation during composition
    const captureBtn = screen.getByRole('button', { name: 'Capture' });
    const composingAllowed = fireEvent.keyDown(captureBtn, { key: 'Enter', isComposing: true });
    expect(composingAllowed).toBe(false);

    const normalAllowed = fireEvent.keyDown(captureBtn, { key: 'Enter', isComposing: false });
    expect(normalAllowed).toBe(true);
  });

  it('captures screenshots immediately when delay is 0, supports all save locations, and handles omitted onCaptureComplete', () => {
    const onCaptureComplete = vi.fn<(result: ScreenCaptureResult) => void>();

    const { rerender } = render(
      <ScreenCaptureHud
        defaultTarget="region"
        defaultIncludeMic={true}
        onCaptureComplete={onCaptureComplete}
      />
    );

    const saveSelect = screen.getByRole('combobox', { name: 'Capture save location' });

    // Switch through clipboard, documents, desktop, and adversarial unknown option value
    fireEvent.change(saveSelect, { target: { value: 'clipboard' } });
    expect(saveSelect).toHaveValue('clipboard');
    expect(screen.getByTestId('screen-capture-status')).toHaveTextContent(
      'Save destination set to Clipboard'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));
    expect(onCaptureComplete).toHaveBeenCalledTimes(1);
    expect(onCaptureComplete).toHaveBeenLastCalledWith({
      target: 'region',
      output: 'screenshot',
      delaySeconds: 0,
      saveLocation: 'clipboard',
      includeMic: false,
      durationSeconds: 0,
    });
    expect(screen.getByTestId('screen-capture-status')).toHaveTextContent(
      'Screenshot captured (Region) and saved to Clipboard'
    );

    fireEvent.change(saveSelect, { target: { value: 'documents' } });
    expect(saveSelect).toHaveValue('documents');

    fireEvent.change(saveSelect, { target: { value: 'invalid-location' } });
    expect(saveSelect).toHaveValue('desktop');

    // Safe capture when onCaptureComplete is omitted
    rerender(<ScreenCaptureHud defaultTarget="window" defaultSaveLocation="documents" />);
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));
    expect(screen.getByTestId('screen-capture-status')).toHaveTextContent(
      'Screenshot captured (Region) and saved to Desktop'
    );
  });

  it('runs a 3s screenshot countdown via window.setInterval, supports Cancel mid-countdown, and completes after ticking to 0', () => {
    vi.useFakeTimers();
    const onCaptureComplete = vi.fn<(result: ScreenCaptureResult) => void>();

    render(<ScreenCaptureHud onCaptureComplete={onCaptureComplete} data-testid="hud" />);

    const root = screen.getByTestId('hud');
    const timerSelect = screen.getByRole('combobox', { name: 'Capture countdown timer' });

    // Exercise all timer select options including adversarial fallback
    fireEvent.change(timerSelect, { target: { value: '5' } });
    expect(timerSelect).toHaveValue('5');
    fireEvent.change(timerSelect, { target: { value: '10' } });
    expect(timerSelect).toHaveValue('10');
    fireEvent.change(timerSelect, { target: { value: 'bad-delay' } });
    expect(timerSelect).toHaveValue('0');
    fireEvent.change(timerSelect, { target: { value: '3' } });
    expect(timerSelect).toHaveValue('3');

    // Start 3s countdown
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));
    expect(root).toHaveAttribute('data-phase', 'countdown');
    expect(screen.getByTestId('screen-capture-countdown')).toHaveTextContent('Capturing in 3s…');
    expect(screen.getByRole('radio', { name: 'Full Screen' })).toBeDisabled();
    expect(timerSelect).toBeDisabled();

    // Tick 1 second -> 2s remaining
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('screen-capture-countdown')).toHaveTextContent('Capturing in 2s…');
    expect(onCaptureComplete).not.toHaveBeenCalled();

    // Cancel mid-countdown
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(root).toHaveAttribute('data-phase', 'idle');
    expect(screen.getByRole('button', { name: 'Capture' })).toBeEnabled();
    expect(screen.getByTestId('screen-capture-status')).toHaveTextContent(
      'Capture countdown cancelled'
    );

    // Ensure no leaked interval completes after cancellation
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onCaptureComplete).not.toHaveBeenCalled();

    // Restart 3s countdown and let it complete
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));
    expect(screen.getByTestId('screen-capture-countdown')).toHaveTextContent('Capturing in 3s…');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('screen-capture-countdown')).toHaveTextContent('Capturing in 2s…');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('screen-capture-countdown')).toHaveTextContent('Capturing in 1s…');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root).toHaveAttribute('data-phase', 'idle');
    expect(onCaptureComplete).toHaveBeenCalledTimes(1);
    expect(onCaptureComplete).toHaveBeenLastCalledWith({
      target: 'fullscreen',
      output: 'screenshot',
      delaySeconds: 3,
      saveLocation: 'desktop',
      includeMic: false,
      durationSeconds: 0,
    });
  });

  it('records video with live REC elapsed timer, pulsing error dot, Microphone toggle, and emits exact durationSeconds on Stop Recording', () => {
    vi.useFakeTimers();
    const onCaptureComplete = vi.fn<(result: ScreenCaptureResult) => void>();

    render(
      <ScreenCaptureHud
        defaultTarget="window"
        defaultSaveLocation="documents"
        onCaptureComplete={onCaptureComplete}
        data-testid="hud"
      />
    );

    const root = screen.getByTestId('hud');
    const micToggle = screen.getByRole('button', { name: 'Microphone' });
    expect(micToggle).toBeDisabled();

    // Switch to Record Video mode
    fireEvent.click(screen.getByRole('button', { name: 'Record Video' }));
    expect(root).toHaveAttribute('data-output', 'recording');
    expect(screen.getByRole('button', { name: 'Record Video' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(micToggle).toBeEnabled();

    // Toggle Microphone on, off, then on
    fireEvent.click(micToggle);
    expect(micToggle).toHaveAttribute('aria-pressed', 'true');
    expect(root).toHaveAttribute('data-include-mic', 'true');
    expect(screen.getByTestId('screen-capture-status')).toHaveTextContent(
      'Microphone audio enabled'
    );

    fireEvent.click(micToggle);
    expect(micToggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('screen-capture-status')).toHaveTextContent(
      'Microphone audio muted'
    );

    fireEvent.click(micToggle);
    expect(micToggle).toHaveAttribute('aria-pressed', 'true');

    // Start recording immediately (delay = 0)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(root).toHaveAttribute('data-phase', 'recording');
    expect(screen.getByTestId('screen-capture-recording-indicator')).toHaveTextContent(
      'REC 00:00'
    );
    const recDot = screen.getByTestId('screen-capture-rec-dot');
    expect(recDot).toHaveClass('animate-pulse');
    expect(recDot.style.backgroundColor).toBe('var(--prism-error-main)');
    expect(screen.getByTestId('screen-capture-telemetry')).toHaveTextContent(
      'REC 00:00 · Mic On'
    );

    // Tick 1 second -> REC 00:01
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('screen-capture-recording-indicator')).toHaveTextContent(
      'REC 00:01'
    );

    // Tick another 64 seconds -> REC 01:05 (65s total)
    act(() => {
      vi.advanceTimersByTime(64000);
    });
    expect(screen.getByTestId('screen-capture-recording-indicator')).toHaveTextContent(
      'REC 01:05'
    );

    // Stop recording
    fireEvent.click(screen.getByRole('button', { name: 'Stop Recording' }));
    expect(root).toHaveAttribute('data-phase', 'idle');
    expect(onCaptureComplete).toHaveBeenCalledTimes(1);
    expect(onCaptureComplete).toHaveBeenLastCalledWith({
      target: 'window',
      output: 'recording',
      delaySeconds: 0,
      saveLocation: 'documents',
      includeMic: true,
      durationSeconds: 65,
    });
    expect(screen.getByTestId('screen-capture-status')).toHaveTextContent(
      'Recording saved (01:05 · Window · Documents/Captures)'
    );

    // Verify recording after a countdown with Microphone off
    fireEvent.click(micToggle);
    expect(micToggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.change(screen.getByRole('combobox', { name: 'Capture countdown timer' }), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(root).toHaveAttribute('data-phase', 'countdown');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(root).toHaveAttribute('data-phase', 'recording');
    expect(screen.getByTestId('screen-capture-telemetry')).toHaveTextContent(
      'REC 00:00 · Mic Off'
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('screen-capture-recording-indicator')).toHaveTextContent(
      'REC 00:02'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stop Recording' }));
    expect(onCaptureComplete).toHaveBeenLastCalledWith({
      target: 'window',
      output: 'recording',
      delaySeconds: 3,
      saveLocation: 'documents',
      includeMic: false,
      durationSeconds: 2,
    });

    // Switching back to Screenshot disables Microphone again
    fireEvent.click(screen.getByRole('button', { name: 'Screenshot' }));
    expect(screen.getByRole('button', { name: 'Microphone' })).toBeDisabled();
    expect(screen.getByTestId('screen-capture-status')).toHaveTextContent(
      'Output mode set to Screenshot'
    );
  });

  it('invokes onDismiss via Close HUD button and stops active timers cleanly on dismiss and unmount', () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const onCaptureComplete = vi.fn<(result: ScreenCaptureResult) => void>();
    const onDismiss = vi.fn<() => void>();

    const { unmount } = render(
      <ScreenCaptureHud
        defaultDelaySeconds={5}
        onCaptureComplete={onCaptureComplete}
        onDismiss={onDismiss}
      />
    );

    // Start countdown then click Close HUD
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));
    expect(screen.getByTestId('screen-capture-countdown')).toHaveTextContent('Capturing in 5s…');

    fireEvent.click(screen.getByRole('button', { name: 'Close HUD' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Capture' })).toBeEnabled();

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onCaptureComplete).not.toHaveBeenCalled();

    // Start countdown and unmount mid-countdown -> strict interval cleanup
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }));
    const clearsBeforeUnmount = clearIntervalSpy.mock.calls.length;
    unmount();
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearsBeforeUnmount);

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onCaptureComplete).not.toHaveBeenCalled();

    // Start recording and unmount mid-recording -> strict interval cleanup
    const recordingMount = render(
      <ScreenCaptureHud defaultOutput="recording" onCaptureComplete={onCaptureComplete} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('screen-capture-recording-indicator')).toHaveTextContent(
      'REC 00:02'
    );

    const clearsBeforeRecUnmount = clearIntervalSpy.mock.calls.length;
    recordingMount.unmount();
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearsBeforeRecUnmount);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onCaptureComplete).not.toHaveBeenCalled();
  });

  it('blocks all interactions when disabled, cancels active timers if disabled mid-flight, and validates extensible type maps', () => {
    vi.useFakeTimers();
    const onCaptureComplete = vi.fn<(result: ScreenCaptureResult) => void>();
    const onDismiss = vi.fn<() => void>();

    const { rerender } = render(
      <ScreenCaptureHud
        disabled
        defaultOutput="recording"
        onCaptureComplete={onCaptureComplete}
        onDismiss={onDismiss}
        data-testid="hud"
      />
    );

    const root = screen.getByTestId('hud');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');

    const fullScreenRadio = screen.getByRole('radio', { name: 'Full Screen' });
    const timerSelect = screen.getByRole('combobox', { name: 'Capture countdown timer' });
    const saveSelect = screen.getByRole('combobox', { name: 'Capture save location' });

    expect(fullScreenRadio).toBeDisabled();
    expect(fullScreenRadio).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('button', { name: 'Screenshot' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record Video' })).toBeDisabled();
    expect(timerSelect).toBeDisabled();
    expect(saveSelect).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Microphone' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close HUD' })).toBeDisabled();

    // Synthetic events while disabled must be no-ops
    fireEvent.keyDown(fullScreenRadio, { key: 'ArrowRight' });
    fireEvent.change(timerSelect, { target: { value: '10' } });
    fireEvent.change(saveSelect, { target: { value: 'clipboard' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close HUD' }));

    expect(root).toHaveAttribute('data-target', 'fullscreen');
    expect(timerSelect).toHaveValue('0');
    expect(saveSelect).toHaveValue('desktop');
    expect(onCaptureComplete).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();

    // Re-enable, start a countdown, then disable mid-countdown -> cancels timer cleanly
    rerender(
      <ScreenCaptureHud
        disabled={false}
        defaultOutput="recording"
        onCaptureComplete={onCaptureComplete}
        onDismiss={onDismiss}
        data-testid="hud"
      />
    );
    fireEvent.change(timerSelect, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(root).toHaveAttribute('data-phase', 'countdown');

    rerender(
      <ScreenCaptureHud
        disabled={true}
        defaultOutput="recording"
        onCaptureComplete={onCaptureComplete}
        onDismiss={onDismiss}
        data-testid="hud"
      />
    );
    expect(root).toHaveAttribute('data-phase', 'idle');
    expect(screen.getByTestId('screen-capture-status')).toHaveTextContent(
      'Capture cancelled while HUD is disabled'
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onCaptureComplete).not.toHaveBeenCalled();

    // Verify exported extensible maps align with union types
    const targetCheck: Record<keyof CaptureTargetModeMap, CaptureTargetMode> = {
      fullscreen: 'fullscreen',
      window: 'window',
      region: 'region',
    };
    const outputCheck: Record<keyof CaptureOutputKindMap, CaptureOutputKind> = {
      screenshot: 'screenshot',
      recording: 'recording',
    };
    const saveCheck: Record<keyof CaptureSaveLocationMap, CaptureSaveLocation> = {
      desktop: 'desktop',
      clipboard: 'clipboard',
      documents: 'documents',
    };
    expect(Object.keys(targetCheck)).toHaveLength(3);
    expect(Object.keys(outputCheck)).toHaveLength(2);
    expect(Object.keys(saveCheck)).toHaveLength(3);
  });
});
