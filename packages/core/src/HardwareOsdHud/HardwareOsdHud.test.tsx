import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_HARDWARE_OSD_PAYLOAD,
  HardwareOsdHud,
  type HardwareOsdKindMap,
  type HardwareOsdPayload,
} from './index';

function dispatchComposingKeyDown(target: Element, key: string): KeyboardEvent {
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

describe('HardwareOsdHud', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders default volume optical HUD with pointer-events-none capsule, theme override, xstyle, className, style, and ref passthrough', () => {
    const ref = createRef<HTMLDivElement>();
    const kindKeys: ReadonlyArray<keyof HardwareOsdKindMap> = [
      'volume',
      'brightness',
      'media',
      'caps-lock',
    ];
    expect(kindKeys).toHaveLength(4);
    expect(HardwareOsdHud.displayName).toBe('HardwareOsdHud');

    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            HardwareOsdHud: {
              className: 'theme-osd-override',
              style: { opacity: '0.97' },
            },
          },
        }}
      >
        <HardwareOsdHud
          ref={ref}
          className="local-osd-class"
          style={{ maxWidth: '480px' }}
          xstyle={{ '--prism-blur-px': '22px' }}
          data-testid="osd-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('osd-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Hardware OSD HUD');
    expect(root).toHaveClass(
      'refractor-hardware-osd-hud',
      'prism-slab',
      'theme-osd-override',
      'local-osd-class'
    );
    expect(root).toHaveStyle({ opacity: '0.97', maxWidth: '480px' });
    expect(root).toHaveAttribute('data-kind', 'volume');
    expect(root).toHaveAttribute('data-visible', 'true');
    expect(root).not.toHaveAttribute('data-disabled');

    const capsule = screen.getByRole('status');
    expect(capsule).toBe(screen.getByTestId('hardware-osd-capsule'));
    expect(capsule).toHaveClass(
      'refractor-hardware-osd-hud__capsule',
      'prism-crystal',
      'pointer-events-none'
    );
    expect(capsule).toHaveAttribute('aria-live', 'polite');
    expect(capsule).toHaveAttribute('aria-atomic', 'true');
    expect(capsule).toHaveAttribute('data-visible', 'true');
    expect(capsule).toHaveAttribute('data-kind', 'volume');
    expect(capsule).not.toHaveAttribute('data-muted');

    expect(DEFAULT_HARDWARE_OSD_PAYLOAD).toEqual({
      kind: 'volume',
      levelPct: 68,
      muted: false,
    });
    expect(screen.getByTestId('hardware-osd-icon-volume')).toBeInTheDocument();
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent('Volume');
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('68%');

    const levelBar = screen.getByTestId('hardware-osd-level-bar');
    expect(levelBar).toHaveAttribute('data-segments', '16');
    expect(levelBar).toHaveAttribute('data-lit-segments', '11');
    expect(levelBar).toHaveAttribute('data-muted', 'false');
    const firstSegment = screen.getByTestId('hardware-osd-segment-0');
    expect(firstSegment).toHaveAttribute('data-lit', 'true');
    expect(firstSegment.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(screen.getByTestId('hardware-osd-segment-10')).toHaveAttribute(
      'data-lit',
      'true'
    );
    expect(screen.getByTestId('hardware-osd-segment-11')).toHaveAttribute(
      'data-lit',
      'false'
    );
    expect(screen.getByTestId('hardware-osd-segment-15')).toHaveAttribute(
      'data-lit',
      'false'
    );

    expect(screen.getByTestId('hardware-osd-visibility-badge')).toHaveTextContent(
      'Active'
    );
    expect(screen.queryByTestId('hardware-osd-autohide-badge')).toBeNull();
    expect(screen.getByTestId('hardware-osd-triggers')).toBeInTheDocument();

    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('renders all 4 OSD kinds (volume active/muted/zero, brightness, media playing/paused, caps-lock ON/OFF) and custom label fallbacks', () => {
    const { rerender } = render(
      <HardwareOsdHud
        payload={{ kind: 'volume', levelPct: 68, muted: true }}
        showDemoTriggers={false}
      />
    );

    expect(screen.queryByTestId('hardware-osd-triggers')).toBeNull();
    expect(screen.getByTestId('hardware-osd-capsule')).toHaveAttribute(
      'data-muted',
      'true'
    );
    expect(
      screen.getByTestId('hardware-osd-icon-volume-muted')
    ).toBeInTheDocument();
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent('Muted');
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('68%');
    expect(screen.getByTestId('hardware-osd-level-bar')).toHaveAttribute(
      'data-muted',
      'true'
    );
    expect(screen.getByTestId('hardware-osd-level-bar')).toHaveClass(
      'opacity-60'
    );

    // Volume at 0% unmuted shows muted speaker icon and 0 lit segments
    rerender(
      <HardwareOsdHud
        payload={{ kind: 'volume', levelPct: 0, muted: false }}
        showDemoTriggers={false}
      />
    );
    expect(
      screen.getByTestId('hardware-osd-icon-volume-muted')
    ).toBeInTheDocument();
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent('Volume');
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('0%');
    expect(screen.getByTestId('hardware-osd-level-bar')).toHaveAttribute(
      'data-lit-segments',
      '0'
    );

    // Volume with undefined levelPct uses canonical 68% default
    rerender(
      <HardwareOsdHud
        payload={{ kind: 'volume', label: 'Studio Output' }}
        showDemoTriggers={false}
      />
    );
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent(
      'Studio Output'
    );
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('68%');

    // Brightness with custom and default levelPct
    rerender(
      <HardwareOsdHud
        payload={{ kind: 'brightness', levelPct: 80 }}
        showDemoTriggers={false}
      />
    );
    expect(
      screen.getByTestId('hardware-osd-icon-brightness')
    ).toBeInTheDocument();
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent(
      'Brightness'
    );
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('80%');
    expect(screen.getByTestId('hardware-osd-level-bar')).toHaveAttribute(
      'data-lit-segments',
      '13'
    );
    expect(
      screen.getByTestId('hardware-osd-segment-0').style.backgroundColor
    ).toBe('var(--prism-warning-main)');

    rerender(
      <HardwareOsdHud
        payload={{ kind: 'brightness', label: '   ' }}
        showDemoTriggers={false}
      />
    );
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent(
      'Brightness'
    );
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('70%');

    // Media Playing
    rerender(
      <HardwareOsdHud
        payload={{ kind: 'media', playing: true }}
        showDemoTriggers={false}
      />
    );
    expect(
      screen.getByTestId('hardware-osd-icon-media-play')
    ).toBeInTheDocument();
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent(
      'Media Playback'
    );
    const playingPill = screen.getByTestId('hardware-osd-state-pill');
    expect(playingPill).toHaveTextContent('Playing');
    expect(playingPill).toHaveAttribute('data-state', 'playing');
    expect(playingPill.style.color).toBe('var(--prism-success-main)');

    // Media Paused
    rerender(
      <HardwareOsdHud
        payload={{ kind: 'media', playing: false }}
        showDemoTriggers={false}
      />
    );
    expect(
      screen.getByTestId('hardware-osd-icon-media-pause')
    ).toBeInTheDocument();
    const pausedPill = screen.getByTestId('hardware-osd-state-pill');
    expect(pausedPill).toHaveTextContent('Paused');
    expect(pausedPill).toHaveAttribute('data-state', 'paused');
    expect(pausedPill.style.color).toBe('var(--prism-info-main)');

    // Caps Lock ON
    rerender(
      <HardwareOsdHud
        payload={{ kind: 'caps-lock', capsLockOn: true }}
        showDemoTriggers={false}
      />
    );
    expect(
      screen.getByTestId('hardware-osd-icon-caps-lock')
    ).toBeInTheDocument();
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent(
      'Caps Lock'
    );
    const capsOnPill = screen.getByTestId('hardware-osd-state-pill');
    expect(capsOnPill).toHaveTextContent('ON');
    expect(capsOnPill).toHaveAttribute('data-state', 'on');
    expect(capsOnPill.style.color).toBe('var(--prism-primary-main)');

    // Caps Lock OFF
    rerender(
      <HardwareOsdHud
        payload={{ kind: 'caps-lock', capsLockOn: false }}
        showDemoTriggers={false}
      />
    );
    const capsOffPill = screen.getByTestId('hardware-osd-state-pill');
    expect(capsOffPill).toHaveTextContent('OFF');
    expect(capsOffPill).toHaveAttribute('data-state', 'off');
    expect(capsOffPill.style.color).toBe('var(--prism-text-secondary)');
  });

  it('operates all 6 interactive Hardware Key Simulator triggers across every HUD kind', () => {
    const onVisibleChange = vi.fn();

    render(
      <HardwareOsdHud
        defaultVisible={false}
        onVisibleChange={onVisibleChange}
      />
    );

    const capsule = screen.getByRole('status');
    expect(capsule).toHaveAttribute('data-visible', 'false');
    expect(screen.getByTestId('hardware-osd-visibility-badge')).toHaveTextContent(
      'Faded'
    );

    const volDownBtn = screen.getByRole('button', { name: 'Vol -' });
    const volUpBtn = screen.getByRole('button', { name: 'Vol +' });
    const muteBtn = screen.getByRole('button', { name: 'Mute' });
    const brightUpBtn = screen.getByRole('button', { name: 'Bright +' });
    const mediaBtn = screen.getByRole('button', { name: 'Media Play/Pause' });
    const capsBtn = screen.getByRole('button', { name: 'Caps Lock' });

    // Triggering while hidden reveals the HUD and emits onVisibleChange(true)
    fireEvent.click(volDownBtn);
    expect(capsule).toHaveAttribute('data-visible', 'true');
    expect(onVisibleChange).toHaveBeenCalledTimes(1);
    expect(onVisibleChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('58%');

    // Clicking while already visible does not emit redundant onVisibleChange(true)
    fireEvent.click(volUpBtn);
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('68%');
    expect(onVisibleChange).toHaveBeenCalledTimes(1);

    // Clamp Vol + at 100%
    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(volUpBtn);
    }
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent(
      '100%'
    );
    expect(screen.getByTestId('hardware-osd-level-bar')).toHaveAttribute(
      'data-lit-segments',
      '16'
    );

    // Toggle Mute on and back off
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(muteBtn);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent('Muted');
    expect(capsule).toHaveAttribute('data-muted', 'true');

    fireEvent.click(muteBtn);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent('Volume');
    expect(capsule).not.toHaveAttribute('data-muted');

    // Step Brightness from 70% -> 80% -> 90% -> 100% -> wraps to 10%
    fireEvent.click(brightUpBtn);
    expect(capsule).toHaveAttribute('data-kind', 'brightness');
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent(
      'Brightness'
    );
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('80%');

    fireEvent.click(brightUpBtn);
    fireEvent.click(brightUpBtn);
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent(
      '100%'
    );
    fireEvent.click(brightUpBtn);
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('10%');

    // Toggle Media Play/Pause: false -> true (Playing) -> false (Paused)
    expect(mediaBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mediaBtn);
    expect(mediaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(capsule).toHaveAttribute('data-kind', 'media');
    expect(screen.getByTestId('hardware-osd-state-pill')).toHaveTextContent(
      'Playing'
    );

    fireEvent.click(mediaBtn);
    expect(mediaBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('hardware-osd-state-pill')).toHaveTextContent(
      'Paused'
    );

    // Toggle Caps Lock: false -> true (ON) -> false (OFF)
    expect(capsBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(capsBtn);
    expect(capsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(capsule).toHaveAttribute('data-kind', 'caps-lock');
    expect(screen.getByTestId('hardware-osd-state-pill')).toHaveTextContent(
      'ON'
    );

    fireEvent.click(capsBtn);
    expect(capsBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('hardware-osd-state-pill')).toHaveTextContent(
      'OFF'
    );
  });

  it('initializes remembered simulator channel states from non-volume defaultPayload', () => {
    const { unmount: unmountBright } = render(
      <HardwareOsdHud defaultPayload={{ kind: 'brightness', levelPct: 50 }} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bright +' }));
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('60%');
    unmountBright();

    const { unmount: unmountMedia } = render(
      <HardwareOsdHud defaultPayload={{ kind: 'media', playing: true }} />
    );
    expect(screen.getByRole('button', { name: 'Media Play/Pause' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Media Play/Pause' }));
    expect(screen.getByTestId('hardware-osd-state-pill')).toHaveTextContent(
      'Paused'
    );
    unmountMedia();

    render(
      <HardwareOsdHud defaultPayload={{ kind: 'caps-lock', capsLockOn: true }} />
    );
    expect(screen.getByRole('button', { name: 'Caps Lock' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Caps Lock' }));
    expect(screen.getByTestId('hardware-osd-state-pill')).toHaveTextContent(
      'OFF'
    );
  });

  it('handles autoHideMs fadeout, re-trigger timer reset, re-show after hide, and strict unmount cleanup', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const onVisibleChange = vi.fn();

    const { unmount } = render(
      <HardwareOsdHud autoHideMs={1500} onVisibleChange={onVisibleChange} />
    );

    const capsule = screen.getByRole('status');
    expect(capsule).toHaveAttribute('data-visible', 'true');
    expect(screen.getByTestId('hardware-osd-autohide-badge')).toHaveTextContent(
      'Auto-hide 1500ms'
    );

    // Advance 1000ms (< 1500ms): still visible
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(capsule).toHaveAttribute('data-visible', 'true');
    expect(onVisibleChange).not.toHaveBeenCalled();

    // Re-trigger via Vol + at t=1000ms -> MUST reset countdown to a fresh 1500ms
    fireEvent.click(screen.getByRole('button', { name: 'Vol +' }));
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('78%');

    // Advance 1000ms (total 2000ms from mount, 1000ms since reset): still visible!
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(capsule).toHaveAttribute('data-visible', 'true');
    expect(onVisibleChange).not.toHaveBeenCalled();

    // Advance final 500ms (1500ms since reset): fades out cleanly
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(capsule).toHaveAttribute('data-visible', 'false');
    expect(screen.getByTestId('hardware-osd-visibility-badge')).toHaveTextContent(
      'Faded'
    );
    expect(onVisibleChange).toHaveBeenCalledTimes(1);
    expect(onVisibleChange).toHaveBeenLastCalledWith(false);

    // Re-trigger after faded out -> shows again and schedules fresh 1500ms timer
    fireEvent.click(screen.getByRole('button', { name: 'Caps Lock' }));
    expect(capsule).toHaveAttribute('data-visible', 'true');
    expect(onVisibleChange).toHaveBeenCalledTimes(2);
    expect(onVisibleChange).toHaveBeenLastCalledWith(true);

    // Unmount mid-countdown -> timer strictly cleared and never fires after unmount
    act(() => {
      vi.advanceTimersByTime(700);
    });
    const clearCallsBeforeUnmount = clearTimeoutSpy.mock.calls.length;
    unmount();
    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(
      clearCallsBeforeUnmount
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onVisibleChange).toHaveBeenCalledTimes(2);
  });

  it('ignores non-positive and non-finite autoHideMs values without scheduling a fadeout', () => {
    vi.useFakeTimers();
    const onVisibleChange = vi.fn();

    const { rerender } = render(
      <HardwareOsdHud autoHideMs={-300} onVisibleChange={onVisibleChange} />
    );
    expect(screen.queryByTestId('hardware-osd-autohide-badge')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByRole('status')).toHaveAttribute('data-visible', 'true');
    expect(onVisibleChange).not.toHaveBeenCalled();

    rerender(
      <HardwareOsdHud
        autoHideMs={Number.NaN}
        onVisibleChange={onVisibleChange}
      />
    );
    rerender(
      <HardwareOsdHud
        autoHideMs={Number.POSITIVE_INFINITY}
        onVisibleChange={onVisibleChange}
      />
    );
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByRole('status')).toHaveAttribute('data-visible', 'true');
    expect(onVisibleChange).not.toHaveBeenCalled();
  });

  it('respects controlled payload and controlled visible state cleanly across updates and timers', () => {
    vi.useFakeTimers();
    const onVisibleChange = vi.fn();
    const initialControlled: HardwareOsdPayload = {
      kind: 'brightness',
      levelPct: 45,
    };

    const { rerender } = render(
      <HardwareOsdHud
        payload={initialControlled}
        visible={false}
        autoHideMs={1000}
        onVisibleChange={onVisibleChange}
      />
    );

    const capsule = screen.getByRole('status');
    expect(capsule).toHaveAttribute('data-visible', 'false');
    expect(capsule).toHaveAttribute('data-kind', 'brightness');
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('45%');

    // Clicking a demo trigger requests visibility via onVisibleChange(true)
    // without mutating controlled payload or controlled visible state
    fireEvent.click(screen.getByRole('button', { name: 'Caps Lock' }));
    expect(onVisibleChange).toHaveBeenCalledTimes(1);
    expect(onVisibleChange).toHaveBeenLastCalledWith(true);
    expect(capsule).toHaveAttribute('data-visible', 'false');
    expect(capsule).toHaveAttribute('data-kind', 'brightness');

    // Parent reveals controlled HUD -> autoHideMs timer starts
    rerender(
      <HardwareOsdHud
        payload={initialControlled}
        visible={true}
        autoHideMs={1000}
        onVisibleChange={onVisibleChange}
      />
    );
    expect(capsule).toHaveAttribute('data-visible', 'true');

    // Updating controlled payload mid-timer resets autoHideMs countdown
    act(() => {
      vi.advanceTimersByTime(700);
    });
    rerender(
      <HardwareOsdHud
        payload={{ kind: 'brightness', levelPct: 85 }}
        visible={true}
        autoHideMs={1000}
        onVisibleChange={onVisibleChange}
      />
    );
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('85%');

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onVisibleChange).toHaveBeenCalledTimes(1);

    // Completing reset countdown notifies onVisibleChange(false) while keeping visible pinned to controlled prop
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onVisibleChange).toHaveBeenCalledTimes(2);
    expect(onVisibleChange).toHaveBeenLastCalledWith(false);
    expect(capsule).toHaveAttribute('data-visible', 'true');

    // Parent hides controlled HUD -> clears any timer cleanly
    rerender(
      <HardwareOsdHud
        payload={{ kind: 'brightness', levelPct: 85 }}
        visible={false}
        autoHideMs={1000}
        onVisibleChange={onVisibleChange}
      />
    );
    expect(capsule).toHaveAttribute('data-visible', 'false');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onVisibleChange).toHaveBeenCalledTimes(2);
  });

  it('sanitizes NaN, Infinity, negative, and >100 levelPct values strictly to [0..100] and escapes XSS label payloads', () => {
    const xssLabel =
      '<script>window.__osdXss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <HardwareOsdHud
        payload={{ kind: 'volume', levelPct: Number.NaN, label: xssLabel }}
        showDemoTriggers={false}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('hardware-osd-label')).toHaveTextContent(xssLabel);
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('0%');
    expect(screen.getByTestId('hardware-osd-level-bar')).toHaveAttribute(
      'data-lit-segments',
      '0'
    );

    rerender(
      <HardwareOsdHud
        payload={{ kind: 'brightness', levelPct: Number.POSITIVE_INFINITY }}
        showDemoTriggers={false}
      />
    );
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('0%');

    rerender(
      <HardwareOsdHud
        payload={{ kind: 'volume', levelPct: -42 }}
        showDemoTriggers={false}
      />
    );
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('0%');

    rerender(
      <HardwareOsdHud
        payload={{ kind: 'brightness', levelPct: 245.7 }}
        showDemoTriggers={false}
      />
    );
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent(
      '100%'
    );
    expect(screen.getByTestId('hardware-osd-level-bar')).toHaveAttribute(
      'data-lit-segments',
      '16'
    );

    // Very small positive level (1%) still lights at least 1 optical segment
    rerender(
      <HardwareOsdHud
        payload={{ kind: 'volume', levelPct: 1 }}
        showDemoTriggers={false}
      />
    );
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('1%');
    expect(screen.getByTestId('hardware-osd-level-bar')).toHaveAttribute(
      'data-lit-segments',
      '1'
    );
  });

  it('enforces disabled state across all simulator controls and guards IME composing keyboard events', () => {
    const onVisibleChange = vi.fn();

    const { rerender } = render(
      <HardwareOsdHud
        disabled
        defaultVisible={false}
        onVisibleChange={onVisibleChange}
        data-testid="osd-disabled"
      />
    );

    const root = screen.getByTestId('osd-disabled');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const buttons = [
      screen.getByRole('button', { name: 'Vol -' }),
      screen.getByRole('button', { name: 'Vol +' }),
      screen.getByRole('button', { name: 'Mute' }),
      screen.getByRole('button', { name: 'Bright +' }),
      screen.getByRole('button', { name: 'Media Play/Pause' }),
      screen.getByRole('button', { name: 'Caps Lock' }),
    ];

    for (const button of buttons) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }

    // Even if an adversary strips the DOM disabled attribute, the handler guard blocks mutation
    const volUpDisabled = screen.getByRole('button', { name: 'Vol +' });
    volUpDisabled.removeAttribute('disabled');
    fireEvent.click(volUpDisabled);

    // Synthetic click on a disabled trigger must never mutate state or emit onVisibleChange
    expect(onVisibleChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveAttribute('data-visible', 'false');
    expect(screen.getByTestId('hardware-osd-readout')).toHaveTextContent('68%');

    // Re-enable and verify IME composition guard on keydown
    rerender(<HardwareOsdHud onVisibleChange={onVisibleChange} />);
    const volUpBtn = screen.getByRole('button', { name: 'Vol +' });

    const composingEvent = dispatchComposingKeyDown(volUpBtn, 'Enter');
    expect(composingEvent.defaultPrevented).toBe(true);

    const normalEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      isComposing: false,
    });
    volUpBtn.dispatchEvent(normalEvent);
    expect(normalEvent.defaultPrevented).toBe(false);
  });
});
