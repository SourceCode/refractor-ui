import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_SYSTEM_TRAY_STATE,
  SystemTrayCluster,
  type SystemTrayIndicatorId,
  type SystemTrayState,
} from './index';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SystemTrayCluster', () => {
  it('renders defaults, semantic tokens, ref passthrough, responsive toolbar classes, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SystemTrayCluster: {
              className: 'theme-system-tray',
              style: { opacity: '0.97' },
            },
          },
        }}
      >
        <SystemTrayCluster
          ref={ref}
          className="local-tray-shell"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="tray-root"
        />
      </PrismThemeProvider>
    );

    expect(SystemTrayCluster.displayName).toBe('SystemTrayCluster');

    const root = screen.getByTestId('tray-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-system-tray-cluster',
      'prism-slab',
      'theme-system-tray',
      'local-tray-shell'
    );
    expect(root).toHaveStyle({ opacity: '0.97' });
    expect(root).not.toHaveAttribute('data-open');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('aria-disabled');

    const toolbar = screen.getByRole('toolbar', {
      name: 'System tray indicators',
    });
    expect(toolbar).toHaveClass('flex-wrap', 'min-w-0', 'justify-end');

    const indicatorIds: ReadonlyArray<SystemTrayIndicatorId> = [
      'wifi',
      'bluetooth',
      'battery',
      'volume',
      'keyboard',
      'clock',
    ];

    for (const id of indicatorIds) {
      const trigger = screen.getByTestId(`system-tray-trigger-${id}`);
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).not.toHaveAttribute('aria-controls');
      expect(trigger).toHaveClass('prism-focus-ring');
      expect(trigger).toHaveAttribute('tabindex', id === 'wifi' ? '0' : '-1');
    }

    expect(screen.getByTestId('system-tray-trigger-battery')).toHaveTextContent(
      '84%'
    );
    expect(
      screen.getByTestId('system-tray-trigger-keyboard')
    ).toHaveTextContent('US');
    expect(screen.getByTestId('system-tray-trigger-clock')).toHaveTextContent(
      '10:42 AM'
    );

    expect(screen.queryByRole('dialog')).toBeNull();

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(
      'System tray ready · Battery 84% · 10:42 AM'
    );
    expect(screen.getByTestId('system-tray-active-tag')).toHaveTextContent(
      'Idle'
    );
  });

  it('opens all 6 viewport-clamped indicator popovers and supports every interactive control', () => {
    const onChange = vi.fn<(state: SystemTrayState) => void>();
    const onOpenIndicatorChange =
      vi.fn<(indicator: SystemTrayIndicatorId | null) => void>();

    render(
      <SystemTrayCluster
        onChange={onChange}
        onOpenIndicatorChange={onOpenIndicatorChange}
        data-testid="interactive-root"
      />
    );

    const status = screen.getByRole('status');

    // 1. Wi-Fi popover & switch toggle
    const wifiTrigger = screen.getByTestId('system-tray-trigger-wifi');
    fireEvent.click(wifiTrigger);
    expect(onOpenIndicatorChange).toHaveBeenLastCalledWith('wifi');
    expect(wifiTrigger).toHaveAttribute('aria-expanded', 'true');

    const wifiDialog = screen.getByRole('dialog', { name: 'Wi-Fi' });
    expect(wifiTrigger).toHaveAttribute('aria-controls', wifiDialog.id);
    expect(wifiDialog).toHaveClass(
      'prism-slab',
      'w-[min(19rem,calc(100vw-2rem))]'
    );
    expect(screen.getByTestId('system-tray-wifi-network')).toHaveTextContent(
      'Prism Studio 6E'
    );
    expect(status).toHaveTextContent('Wi-Fi popover opened');

    const wifiSwitch = screen.getByRole('switch', { name: 'Wi-Fi' });
    expect(wifiSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(wifiSwitch);
    expect(wifiSwitch).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('system-tray-wifi-network')).toHaveTextContent(
      'Not connected'
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ wifiEnabled: false })
    );
    expect(status).toHaveTextContent('Wi-Fi turned off');

    // Toggle Wi-Fi back on
    fireEvent.click(wifiSwitch);
    expect(wifiSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('system-tray-wifi-network')).toHaveTextContent(
      'Prism Studio 6E'
    );
    expect(status).toHaveTextContent('Wi-Fi turned on (Prism Studio 6E)');

    // 2. Bluetooth popover & switch toggle
    fireEvent.click(screen.getByTestId('system-tray-trigger-bluetooth'));
    expect(onOpenIndicatorChange).toHaveBeenLastCalledWith('bluetooth');
    expect(screen.getByRole('dialog', { name: 'Bluetooth' })).toBeInTheDocument();
    expect(
      screen.getByTestId('system-tray-bluetooth-device')
    ).toHaveTextContent('Refractor Studio Pods');

    const btSwitch = screen.getByRole('switch', { name: 'Bluetooth' });
    expect(btSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(btSwitch);
    expect(btSwitch).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByTestId('system-tray-bluetooth-device')
    ).toHaveTextContent('Disconnected');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ bluetoothEnabled: false })
    );
    expect(status).toHaveTextContent('Bluetooth turned off');

    fireEvent.click(btSwitch);
    expect(btSwitch).toHaveAttribute('aria-checked', 'true');
    expect(status).toHaveTextContent(
      'Bluetooth turned on (Refractor Studio Pods)'
    );

    // 3. Battery popover, progressbar, charging badge, and Low Power Mode switch
    fireEvent.click(screen.getByTestId('system-tray-trigger-battery'));
    expect(screen.getByRole('dialog', { name: 'Battery' })).toBeInTheDocument();
    expect(screen.getByTestId('system-tray-battery-pct')).toHaveTextContent(
      '84%'
    );
    expect(
      screen.getByTestId('system-tray-battery-charging-badge')
    ).toHaveTextContent('On Battery');

    const progress = screen.getByRole('progressbar', {
      name: 'Battery charge level',
    });
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
    expect(progress).toHaveAttribute('aria-valuenow', '84');
    expect(screen.getByTestId('system-tray-battery-fill')).toHaveStyle({
      width: '84%',
    });

    const lowPowerSwitch = screen.getByRole('switch', {
      name: 'Low Power Mode',
    });
    expect(lowPowerSwitch).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(lowPowerSwitch);
    expect(lowPowerSwitch).toHaveAttribute('aria-checked', 'true');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ lowPowerMode: true })
    );
    expect(status).toHaveTextContent('Low Power Mode turned on');

    fireEvent.click(lowPowerSwitch);
    expect(lowPowerSwitch).toHaveAttribute('aria-checked', 'false');
    expect(status).toHaveTextContent('Low Power Mode turned off');

    // 4. Volume popover: range slider & Mute toggle
    fireEvent.click(screen.getByTestId('system-tray-trigger-volume'));
    expect(screen.getByRole('dialog', { name: 'Volume' })).toBeInTheDocument();
    const volumeSlider = screen.getByLabelText('System tray volume');
    expect(volumeSlider).toHaveAttribute('type', 'range');
    expect(volumeSlider).toHaveAttribute('min', '0');
    expect(volumeSlider).toHaveAttribute('max', '100');
    expect(volumeSlider).toHaveValue('68');

    fireEvent.change(volumeSlider, { target: { value: '35' } });
    expect(volumeSlider).toHaveValue('35');
    expect(
      screen.getByTestId('system-tray-volume-readout')
    ).toHaveTextContent('35%');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ volumePct: 35, muted: false })
    );
    expect(status).toHaveTextContent('Volume set to 35%');

    // Setting slider to 0 updates volume readout to 0%
    fireEvent.change(volumeSlider, { target: { value: '0' } });
    expect(
      screen.getByTestId('system-tray-volume-readout')
    ).toHaveTextContent('0%');

    // Toggle Mute on & off
    const muteBtn = screen.getByRole('button', { name: 'Mute' });
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(muteBtn);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('system-tray-volume-readout')
    ).toHaveTextContent('Muted');
    expect(status).toHaveTextContent('Audio muted');

    // Dragging slider to 0 while muted keeps muted state
    fireEvent.change(volumeSlider, { target: { value: '0' } });
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');

    // Dragging slider > 0 while muted restores audio
    fireEvent.change(volumeSlider, { target: { value: '72' } });
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('system-tray-volume-readout')
    ).toHaveTextContent('72%');

    // Explicit mute then explicit unmute
    fireEvent.click(muteBtn);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(muteBtn);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(status).toHaveTextContent('Audio unmuted (72%)');

    // 5. Keyboard layout popover: US / UK / DE / JP buttons with aria-pressed
    fireEvent.click(screen.getByTestId('system-tray-trigger-keyboard'));
    expect(
      screen.getByRole('dialog', { name: 'Keyboard Layout' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('system-tray-layout-US')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('system-tray-layout-JP')).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    fireEvent.click(screen.getByTestId('system-tray-layout-JP'));
    expect(screen.getByTestId('system-tray-layout-JP')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('system-tray-layout-US')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(
      screen.getByTestId('system-tray-trigger-keyboard')
    ).toHaveTextContent('JP');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyboardLayout: 'JP' })
    );
    expect(status).toHaveTextContent(
      'Keyboard layout switched to JP (Japanese (Romaji))'
    );

    fireEvent.click(screen.getByTestId('system-tray-layout-DE'));
    expect(
      screen.getByTestId('system-tray-trigger-keyboard')
    ).toHaveTextContent('DE');

    // 6. Clock popover: large tabular time, formatted date, and UTC readout
    fireEvent.click(screen.getByTestId('system-tray-trigger-clock'));
    expect(screen.getByRole('dialog', { name: 'Clock' })).toBeInTheDocument();
    expect(screen.getByTestId('system-tray-clock-time')).toHaveTextContent(
      '10:42 AM'
    );
    expect(screen.getByTestId('system-tray-clock-date')).toHaveTextContent(
      'Thu, Oct 24'
    );
    expect(screen.getByTestId('system-tray-clock-utc')).toHaveTextContent(
      '17:42 UTC'
    );
    expect(screen.getByTestId('system-tray-active-tag')).toHaveTextContent(
      'Clock'
    );
  });

  it('dismisses on re-click, outside pointerdown, and IME-safe Escape with focus restoration and strict window listener cleanup', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const countListenerCalls = (
      spy: typeof addSpy,
      eventType: 'pointerdown' | 'keydown'
    ) => spy.mock.calls.filter(([type]) => type === eventType).length;

    const { unmount } = render(
      <div>
        <button type="button" data-testid="outside-target">
          Outside Target
        </button>
        <SystemTrayCluster />
      </div>
    );

    // Closed initially -> zero window listeners attached
    expect(countListenerCalls(addSpy, 'pointerdown')).toBe(0);
    expect(countListenerCalls(addSpy, 'keydown')).toBe(0);

    const wifiTrigger = screen.getByTestId('system-tray-trigger-wifi');
    const volumeTrigger = screen.getByTestId('system-tray-trigger-volume');
    const status = screen.getByRole('status');

    // Open Wi-Fi -> attaches listeners; re-click dismisses and removes listeners
    fireEvent.click(wifiTrigger);
    expect(screen.getByRole('dialog', { name: 'Wi-Fi' })).toBeInTheDocument();
    expect(countListenerCalls(addSpy, 'pointerdown')).toBe(1);
    expect(countListenerCalls(addSpy, 'keydown')).toBe(1);

    fireEvent.click(wifiTrigger);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(status).toHaveTextContent('Wi-Fi popover closed');
    expect(countListenerCalls(removeSpy, 'pointerdown')).toBe(1);
    expect(countListenerCalls(removeSpy, 'keydown')).toBe(1);

    // Open Volume -> pointerdown inside popover or non-Node target stays open
    fireEvent.click(volumeTrigger);
    const volumeDialog = screen.getByRole('dialog', { name: 'Volume' });
    fireEvent.pointerDown(volumeDialog);
    expect(screen.getByRole('dialog', { name: 'Volume' })).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(screen.getByRole('dialog', { name: 'Volume' })).toBeInTheDocument();

    // Outside pointerdown closes popover and cleans up listeners
    fireEvent.pointerDown(screen.getByTestId('outside-target'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(status).toHaveTextContent('Volume popover closed');
    expect(countListenerCalls(removeSpy, 'pointerdown')).toBe(2);
    expect(countListenerCalls(removeSpy, 'keydown')).toBe(2);

    // Reopen Volume, focus inside control, guard composing Escape & non-Escape keys, then Escape restores focus to trigger
    fireEvent.click(volumeTrigger);
    const muteBtn = screen.getByTestId('system-tray-mute-button');
    act(() => {
      muteBtn.focus();
    });
    expect(document.activeElement).toBe(muteBtn);

    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('dialog', { name: 'Volume' })).toBeInTheDocument();

    const composingEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEscape, 'isComposing', { value: true });
    act(() => {
      window.dispatchEvent(composingEscape);
    });
    expect(screen.getByRole('dialog', { name: 'Volume' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(volumeTrigger);
    expect(status).toHaveTextContent('Volume popover closed');
    expect(countListenerCalls(removeSpy, 'pointerdown')).toBe(3);
    expect(countListenerCalls(removeSpy, 'keydown')).toBe(3);

    // Open again and unmount while open -> strictly cleans up listeners
    fireEvent.click(wifiTrigger);
    expect(countListenerCalls(addSpy, 'pointerdown')).toBe(4);
    expect(countListenerCalls(addSpy, 'keydown')).toBe(4);

    unmount();
    expect(countListenerCalls(removeSpy, 'pointerdown')).toBe(4);
    expect(countListenerCalls(removeSpy, 'keydown')).toBe(4);
  });

  it('supports IME-safe roving ArrowLeft/ArrowRight/Home/End toolbar navigation', () => {
    render(<SystemTrayCluster />);

    const wifi = screen.getByTestId('system-tray-trigger-wifi');
    const bluetooth = screen.getByTestId('system-tray-trigger-bluetooth');
    const battery = screen.getByTestId('system-tray-trigger-battery');
    const clock = screen.getByTestId('system-tray-trigger-clock');

    act(() => {
      wifi.focus();
    });
    expect(document.activeElement).toBe(wifi);

    // Composing ArrowRight MUST be ignored
    const composingRight = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingRight, 'isComposing', { value: true });
    fireEvent(wifi, composingRight);
    expect(document.activeElement).toBe(wifi);

    // Non-navigation key is ignored
    fireEvent.keyDown(wifi, { key: 'Tab' });
    expect(document.activeElement).toBe(wifi);

    // ArrowRight moves sequentially
    fireEvent.keyDown(wifi, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(bluetooth);
    expect(bluetooth).toHaveAttribute('tabindex', '0');
    expect(wifi).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(bluetooth, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(battery);

    // End jumps to last trigger (clock), ArrowRight wraps to first (wifi)
    fireEvent.keyDown(battery, { key: 'End' });
    expect(document.activeElement).toBe(clock);
    expect(clock).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(clock, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(wifi);

    // ArrowLeft from first wraps to last (clock); Home jumps back to first (wifi)
    fireEvent.keyDown(wifi, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(clock);

    fireEvent.keyDown(clock, { key: 'Home' });
    expect(document.activeElement).toBe(wifi);
    expect(wifi).toHaveAttribute('tabindex', '0');
  });

  it('supports controlled value and openIndicator without mutating state until parent updates', () => {
    const onChange = vi.fn<(state: SystemTrayState) => void>();
    const onOpenIndicatorChange =
      vi.fn<(indicator: SystemTrayIndicatorId | null) => void>();

    const controlledState: SystemTrayState = {
      ...DEFAULT_SYSTEM_TRAY_STATE,
      wifiEnabled: true,
      wifiNetwork: 'Studio Fiber',
      batteryPct: 18,
      charging: false,
      lowPowerMode: false,
    };

    const { rerender } = render(
      <SystemTrayCluster
        value={controlledState}
        openIndicator={null}
        onChange={onChange}
        onOpenIndicatorChange={onOpenIndicatorChange}
      />
    );

    const wifiTrigger = screen.getByTestId('system-tray-trigger-wifi');
    const batteryTrigger = screen.getByTestId('system-tray-trigger-battery');
    expect(batteryTrigger).toHaveTextContent('18%');

    // Clicking trigger requests opening without mutating while parent keeps openIndicator=null
    fireEvent.click(wifiTrigger);
    expect(onOpenIndicatorChange).toHaveBeenCalledWith('wifi');
    expect(screen.queryByRole('dialog')).toBeNull();

    // Parent opens Wi-Fi popover
    rerender(
      <SystemTrayCluster
        value={controlledState}
        openIndicator="wifi"
        onChange={onChange}
        onOpenIndicatorChange={onOpenIndicatorChange}
      />
    );
    expect(screen.getByRole('dialog', { name: 'Wi-Fi' })).toBeInTheDocument();

    // Toggling Wi-Fi invokes onChange with next state but keeps controlled value until parent commits
    const wifiSwitch = screen.getByRole('switch', { name: 'Wi-Fi' });
    fireEvent.click(wifiSwitch);
    expect(onChange).toHaveBeenCalledWith({
      ...controlledState,
      wifiEnabled: false,
    });
    expect(wifiSwitch).toHaveAttribute('aria-checked', 'true');

    // Parent commits updated state and switches to battery popover
    const nextState: SystemTrayState = {
      ...controlledState,
      wifiEnabled: false,
      charging: true,
      batteryPct: 62,
    };
    rerender(
      <SystemTrayCluster
        value={nextState}
        openIndicator="battery"
        onChange={onChange}
        onOpenIndicatorChange={onOpenIndicatorChange}
      />
    );
    expect(screen.getByRole('dialog', { name: 'Battery' })).toBeInTheDocument();
    expect(
      screen.getByTestId('system-tray-battery-charging-badge')
    ).toHaveTextContent('Charging');
    expect(screen.getByTestId('system-tray-battery-pct')).toHaveTextContent(
      '62%'
    );
  });

  it('blocks interactions when disabled and cleans up listeners if disabled while open', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const onChange = vi.fn<(state: SystemTrayState) => void>();
    const onOpenIndicatorChange =
      vi.fn<(indicator: SystemTrayIndicatorId | null) => void>();

    const { rerender } = render(
      <SystemTrayCluster
        disabled
        defaultOpenIndicator="wifi"
        onChange={onChange}
        onOpenIndicatorChange={onOpenIndicatorChange}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    const wifiTrigger = screen.getByTestId('system-tray-trigger-wifi');
    const bluetoothTrigger = screen.getByTestId('system-tray-trigger-bluetooth');

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(wifiTrigger).toBeDisabled();
    expect(wifiTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(wifiTrigger);
    fireEvent.keyDown(wifiTrigger, { key: 'ArrowRight' });
    expect(document.activeElement).not.toBe(bluetoothTrigger);
    expect(onOpenIndicatorChange).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();

    // Enable -> defaultOpenIndicator="wifi" becomes visible -> disable -> listeners strictly cleaned up
    rerender(
      <SystemTrayCluster
        disabled={false}
        defaultOpenIndicator="wifi"
        onChange={onChange}
        onOpenIndicatorChange={onOpenIndicatorChange}
        data-testid="disabled-root"
      />
    );
    expect(screen.getByRole('dialog', { name: 'Wi-Fi' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Wi-Fi popover open');

    const addedPointer = addSpy.mock.calls.filter(
      ([type]) => type === 'pointerdown'
    ).length;
    expect(addedPointer).toBe(1);

    rerender(
      <SystemTrayCluster
        disabled
        defaultOpenIndicator="wifi"
        onChange={onChange}
        onOpenIndicatorChange={onOpenIndicatorChange}
        data-testid="disabled-root"
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    const removedPointer = removeSpy.mock.calls.filter(
      ([type]) => type === 'pointerdown'
    ).length;
    expect(removedPointer).toBe(1);
  });

  it('clamps NaN and out-of-bounds percentages, handles blank string fallbacks, and escapes adversarial XSS inputs', () => {
    // NaN and out-of-bounds clamping via controlled value
    const { rerender } = render(
      <SystemTrayCluster
        openIndicator="battery"
        value={{
          ...DEFAULT_SYSTEM_TRAY_STATE,
          batteryPct: Number.NaN,
          volumePct: Number.POSITIVE_INFINITY,
          wifiNetwork: '   ',
          bluetoothDevice: '   ',
          clockLabel: '   ',
          dateLabel: '   ',
          utcLabel: '   ',
        }}
      />
    );

    expect(screen.getByTestId('system-tray-battery-pct')).toHaveTextContent(
      '0%'
    );
    expect(
      screen.getByRole('progressbar', { name: 'Battery charge level' })
    ).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('system-tray-trigger-clock')).toHaveTextContent(
      DEFAULT_SYSTEM_TRAY_STATE.clockLabel
    );

    // Out-of-bounds high > 100 and negative < 0
    rerender(
      <SystemTrayCluster
        openIndicator="battery"
        value={{
          ...DEFAULT_SYSTEM_TRAY_STATE,
          batteryPct: 185,
          volumePct: -25,
          charging: false,
          lowPowerMode: false,
        }}
      />
    );
    expect(screen.getByTestId('system-tray-battery-pct')).toHaveTextContent(
      '100%'
    );
    expect(
      screen.getByRole('progressbar', { name: 'Battery charge level' })
    ).toHaveAttribute('aria-valuenow', '100');

    rerender(
      <SystemTrayCluster
        openIndicator="volume"
        value={{
          ...DEFAULT_SYSTEM_TRAY_STATE,
          batteryPct: -12,
          volumePct: 142,
        }}
      />
    );
    expect(screen.getByTestId('system-tray-trigger-battery')).toHaveTextContent(
      '0%'
    );
    expect(screen.getByLabelText('System tray volume')).toHaveValue('100');

    // Blank strings render safe fallbacks across Wi-Fi, Bluetooth, and Clock popovers
    rerender(
      <SystemTrayCluster
        openIndicator="wifi"
        value={{
          ...DEFAULT_SYSTEM_TRAY_STATE,
          wifiNetwork: '   ',
          bluetoothDevice: '   ',
          clockLabel: '   ',
          dateLabel: '   ',
          utcLabel: '   ',
        }}
      />
    );
    expect(screen.getByTestId('system-tray-wifi-network')).toHaveTextContent(
      'Unnamed Network'
    );

    rerender(
      <SystemTrayCluster
        openIndicator="bluetooth"
        value={{
          ...DEFAULT_SYSTEM_TRAY_STATE,
          bluetoothDevice: '   ',
        }}
      />
    );
    expect(
      screen.getByTestId('system-tray-bluetooth-device')
    ).toHaveTextContent('No Device Paired');

    rerender(
      <SystemTrayCluster
        openIndicator="clock"
        value={{
          ...DEFAULT_SYSTEM_TRAY_STATE,
          clockLabel: '   ',
          dateLabel: '   ',
          utcLabel: '   ',
        }}
      />
    );
    expect(screen.getByTestId('system-tray-clock-time')).toHaveTextContent(
      DEFAULT_SYSTEM_TRAY_STATE.clockLabel
    );
    expect(screen.getByTestId('system-tray-clock-date')).toHaveTextContent(
      DEFAULT_SYSTEM_TRAY_STATE.dateLabel
    );
    expect(screen.getByTestId('system-tray-clock-utc')).toHaveTextContent(
      DEFAULT_SYSTEM_TRAY_STATE.utcLabel
    );

    // Adversarial XSS payloads rendered strictly as escaped literal text
    const xssPayload =
      '<script>window.__trayXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <SystemTrayCluster
        openIndicator="wifi"
        value={{
          ...DEFAULT_SYSTEM_TRAY_STATE,
          wifiNetwork: xssPayload,
          bluetoothDevice: xssPayload,
          clockLabel: xssPayload,
          dateLabel: xssPayload,
          utcLabel: xssPayload,
        }}
      />
    );
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('system-tray-wifi-network')).toHaveTextContent(
      xssPayload
    );
  });

  it('handles uncontrolled defaultValue with omitted callbacks without throwing', () => {
    render(
      <SystemTrayCluster
        defaultValue={{
          wifiEnabled: false,
          bluetoothEnabled: false,
          batteryPct: 15,
          charging: false,
          lowPowerMode: true,
          volumePct: 45,
          muted: true,
          keyboardLayout: 'UK',
        }}
      />
    );

    expect(screen.getByTestId('system-tray-trigger-battery')).toHaveTextContent(
      '15%'
    );
    expect(
      screen.getByTestId('system-tray-trigger-keyboard')
    ).toHaveTextContent('UK');

    fireEvent.click(screen.getByTestId('system-tray-trigger-wifi'));
    fireEvent.click(screen.getByRole('switch', { name: 'Wi-Fi' }));
    expect(screen.getByRole('switch', { name: 'Wi-Fi' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    fireEvent.click(screen.getByTestId('system-tray-trigger-battery'));
    expect(
      screen.getByTestId('system-tray-battery-charging-badge')
    ).toHaveTextContent('On Battery');
  });
});
