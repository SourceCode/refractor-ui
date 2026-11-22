import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ControlCenterGrid,
  DEFAULT_CONTROL_CENTER_STATE,
  DEFAULT_CONTROL_CENTER_TRACKS,
  type ControlCenterState,
  type ControlCenterTrack,
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

describe('ControlCenterGrid', () => {
  it('renders default optical-glass bento shell with theme override, xstyle, className, style, and ref passthrough', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ControlCenterGrid: {
              className: 'theme-cc-override',
              style: { opacity: '0.96' },
            },
          },
        }}
      >
        <ControlCenterGrid
          ref={ref}
          className="local-cc-class"
          style={{ maxWidth: '420px' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="cc-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('cc-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Control Center');
    expect(root).toHaveClass(
      'refractor-control-center-grid',
      'prism-slab',
      'space-y-3',
      'theme-cc-override',
      'local-cc-class'
    );
    expect(root).toHaveStyle({ opacity: '0.96', maxWidth: '420px' });
    expect(root).toHaveAttribute('data-theme', 'light');
    expect(root).toHaveAttribute('data-wifi', 'true');
    expect(root).toHaveAttribute('data-bluetooth', 'true');
    expect(root).not.toHaveAttribute('data-do-not-disturb');
    expect(root).not.toHaveAttribute('data-playing');
    expect(root).not.toHaveAttribute('data-disabled');

    expect(screen.getByTestId('control-center-title')).toHaveTextContent(
      'Control Center'
    );
    expect(screen.getByTestId('control-center-active-badge')).toHaveTextContent(
      '2 Active'
    );
    expect(screen.getByTestId('control-center-theme-badge')).toHaveTextContent(
      'Alabaster'
    );
    expect(screen.getByTestId('control-center-status')).toHaveAttribute(
      'aria-live',
      'polite'
    );
    expect(screen.getByTestId('control-center-status')).toHaveTextContent(
      'Display 80% · Volume 65% · Paused'
    );

    expect(DEFAULT_CONTROL_CENTER_TRACKS).toHaveLength(3);
    expect(screen.getByTestId('control-center-track-title')).toHaveTextContent(
      'Refractive Resonance'
    );
    expect(screen.getByTestId('control-center-track-artist')).toHaveTextContent(
      'Prism Acoustics'
    );
    expect(
      screen.getByTestId('control-center-track-duration')
    ).toHaveTextContent('3:42');
    expect(
      screen.getByTestId('control-center-track-position')
    ).toHaveTextContent('1 / 3');
  });

  it('toggles all 4 large pill tiles (Wi-Fi, Bluetooth, Do Not Disturb, Theme) with semantic subtitles, aria-pressed, and polite announcements', () => {
    const onChange = vi.fn();

    render(<ControlCenterGrid onChange={onChange} data-testid="cc-tiles" />);

    const root = screen.getByTestId('cc-tiles');
    const wifiBtn = screen.getByRole('button', { name: /wi-fi/i });
    const btBtn = screen.getByRole('button', { name: /bluetooth/i });
    const dndBtn = screen.getByRole('button', { name: /do not disturb/i });
    const themeBtn = screen.getByRole('button', { name: /theme/i });
    const status = screen.getByRole('status');

    // Initial states
    expect(wifiBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('control-center-tile-subtitle-wifi')
    ).toHaveTextContent('Studio-5G');
    expect(btBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('control-center-tile-subtitle-bluetooth')
    ).toHaveTextContent('2 Devices');
    expect(dndBtn).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('control-center-tile-subtitle-dnd')
    ).toHaveTextContent('Off');
    expect(themeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('control-center-tile-subtitle-theme')
    ).toHaveTextContent('Alabaster Light');

    // Toggle Wi-Fi off -> on
    fireEvent.click(wifiBtn);
    expect(wifiBtn).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('control-center-tile-subtitle-wifi')
    ).toHaveTextContent('Off');
    expect(status).toHaveTextContent('Wi-Fi turned off');
    expect(screen.getByTestId('control-center-active-badge')).toHaveTextContent(
      '1 Active'
    );
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CONTROL_CENTER_STATE,
      wifi: false,
    });

    fireEvent.click(wifiBtn);
    expect(wifiBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('control-center-tile-subtitle-wifi')
    ).toHaveTextContent('Studio-5G');
    expect(status).toHaveTextContent('Wi-Fi enabled (Studio-5G)');

    // Toggle Bluetooth off -> on
    fireEvent.click(btBtn);
    expect(btBtn).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('control-center-tile-subtitle-bluetooth')
    ).toHaveTextContent('Off');
    expect(status).toHaveTextContent('Bluetooth turned off');

    fireEvent.click(btBtn);
    expect(btBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('control-center-tile-subtitle-bluetooth')
    ).toHaveTextContent('2 Devices');
    expect(status).toHaveTextContent('Bluetooth enabled (2 Devices)');

    // Toggle Do Not Disturb on -> off
    fireEvent.click(dndBtn);
    expect(dndBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('control-center-tile-subtitle-dnd')
    ).toHaveTextContent('Active');
    expect(root).toHaveAttribute('data-do-not-disturb', 'true');
    expect(screen.getByTestId('control-center-active-badge')).toHaveTextContent(
      '3 Active'
    );
    expect(status).toHaveTextContent('Do Not Disturb active');

    fireEvent.click(dndBtn);
    expect(dndBtn).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('control-center-tile-subtitle-dnd')
    ).toHaveTextContent('Off');
    expect(status).toHaveTextContent('Do Not Disturb turned off');

    // Toggle Theme light -> dark -> light
    fireEvent.click(themeBtn);
    expect(themeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('control-center-tile-subtitle-theme')
    ).toHaveTextContent('Obsidian Dark');
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByTestId('control-center-theme-badge')).toHaveTextContent(
      'Obsidian'
    );
    expect(status).toHaveTextContent('Theme switched to Obsidian Dark');

    fireEvent.click(themeBtn);
    expect(themeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('control-center-tile-subtitle-theme')
    ).toHaveTextContent('Alabaster Light');
    expect(root).toHaveAttribute('data-theme', 'light');
    expect(screen.getByTestId('control-center-theme-badge')).toHaveTextContent(
      'Alabaster'
    );
    expect(status).toHaveTextContent('Theme switched to Alabaster Light');
  });

  it('adjusts Display brightness and Output volume sliders and sanitizes NaN, Infinity, and out-of-range values', () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <ControlCenterGrid
        defaultValue={{
          brightnessPct: Number.NaN,
          volumePct: Number.POSITIVE_INFINITY,
        }}
        onChange={onChange}
      />
    );

    const brightnessSlider = screen.getByRole('slider', {
      name: 'Display brightness',
    });
    const volumeSlider = screen.getByRole('slider', {
      name: 'Output volume',
    });

    // Non-finite defaults cleanly fall back to canonical defaults (80% and 65%)
    expect(brightnessSlider).toHaveValue('80');
    expect(
      screen.getByTestId('control-center-brightness-pill')
    ).toHaveTextContent('80%');
    expect(volumeSlider).toHaveValue('65');
    expect(screen.getByTestId('control-center-volume-pill')).toHaveTextContent(
      '65%'
    );

    // Adjust brightness
    fireEvent.change(brightnessSlider, { target: { value: '42' } });
    expect(brightnessSlider).toHaveValue('42');
    expect(brightnessSlider).toHaveAttribute('aria-valuetext', '42%');
    expect(
      screen.getByTestId('control-center-brightness-pill')
    ).toHaveTextContent('42%');
    expect(screen.getByTestId('control-center-brightness-fill')).toHaveStyle({
      width: '42%',
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Display brightness set to 42%'
    );
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CONTROL_CENTER_STATE,
      brightnessPct: 42,
    });

    // Adjust volume to 0 (muted) then 95
    fireEvent.change(volumeSlider, { target: { value: '0' } });
    expect(volumeSlider).toHaveValue('0');
    expect(screen.getByTestId('control-center-volume-pill')).toHaveTextContent(
      '0%'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Output volume set to 0%'
    );

    fireEvent.change(volumeSlider, { target: { value: '95' } });
    expect(volumeSlider).toHaveValue('95');
    expect(screen.getByTestId('control-center-volume-pill')).toHaveTextContent(
      '95%'
    );
    expect(screen.getByTestId('control-center-volume-fill')).toHaveStyle({
      width: '95%',
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Output volume set to 95%'
    );

    // Out-of-bounds slider inputs clamp cleanly to [0..100]
    fireEvent.change(brightnessSlider, { target: { value: '185' } });
    expect(brightnessSlider).toHaveValue('100');
    fireEvent.change(volumeSlider, { target: { value: '-30' } });
    expect(volumeSlider).toHaveValue('0');

    // Controlled out-of-range / non-finite props sanitize strictly to [0..100]
    rerender(
      <ControlCenterGrid
        value={{
          ...DEFAULT_CONTROL_CENTER_STATE,
          brightnessPct: -40,
          volumePct: 245.7,
        }}
        onChange={onChange}
      />
    );
    expect(brightnessSlider).toHaveValue('0');
    expect(
      screen.getByTestId('control-center-brightness-pill')
    ).toHaveTextContent('0%');
    expect(volumeSlider).toHaveValue('100');
    expect(screen.getByTestId('control-center-volume-pill')).toHaveTextContent(
      '100%'
    );

    rerender(
      <ControlCenterGrid
        value={{
          ...DEFAULT_CONTROL_CENTER_STATE,
          brightnessPct: Number.NEGATIVE_INFINITY,
          volumePct: Number.NaN,
          playing: true,
        }}
        onChange={onChange}
      />
    );
    expect(brightnessSlider).toHaveValue('80');
    expect(volumeSlider).toHaveValue('65');
  });

  it('controls Now Playing Play/Pause and Next/Previous Track wraparound across all 3 default tracks', () => {
    const onChange = vi.fn();

    render(<ControlCenterGrid onChange={onChange} data-testid="cc-media" />);

    const root = screen.getByTestId('cc-media');
    const status = screen.getByRole('status');
    const prevBtn = screen.getByRole('button', { name: 'Previous Track' });
    const nextBtn = screen.getByRole('button', { name: 'Next Track' });

    // Start paused on track 0
    const playBtn = screen.getByRole('button', { name: 'Play' });
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Media Ready')).toBeInTheDocument();

    // Play -> Pause
    fireEvent.click(playBtn);
    const pauseBtn = screen.getByRole('button', { name: 'Pause' });
    expect(pauseBtn).toHaveAttribute('aria-pressed', 'true');
    expect(root).toHaveAttribute('data-playing', 'true');
    expect(screen.getByText('Now Playing')).toBeInTheDocument();
    expect(status).toHaveTextContent('Playing Refractive Resonance');
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CONTROL_CENTER_STATE,
      playing: true,
    });

    fireEvent.click(pauseBtn);
    expect(screen.getByRole('button', { name: 'Play' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(status).toHaveTextContent('Paused Refractive Resonance');

    // Step forward: 0 -> 1 -> 2 -> 0 (wraparound)
    fireEvent.click(nextBtn);
    expect(screen.getByTestId('control-center-track-title')).toHaveTextContent(
      'Caustic Horizon'
    );
    expect(
      screen.getByTestId('control-center-track-position')
    ).toHaveTextContent('2 / 3');
    expect(status).toHaveTextContent('Next track: Caustic Horizon');

    fireEvent.click(nextBtn);
    expect(screen.getByTestId('control-center-track-title')).toHaveTextContent(
      'Alabaster Pulse'
    );
    expect(
      screen.getByTestId('control-center-track-position')
    ).toHaveTextContent('3 / 3');
    expect(status).toHaveTextContent('Next track: Alabaster Pulse');

    fireEvent.click(nextBtn);
    expect(screen.getByTestId('control-center-track-title')).toHaveTextContent(
      'Refractive Resonance'
    );
    expect(
      screen.getByTestId('control-center-track-position')
    ).toHaveTextContent('1 / 3');
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CONTROL_CENTER_STATE,
      trackIndex: 0,
    });

    // Step backward from 0 wraps cleanly to 2 (Alabaster Pulse)
    fireEvent.click(prevBtn);
    expect(screen.getByTestId('control-center-track-title')).toHaveTextContent(
      'Alabaster Pulse'
    );
    expect(
      screen.getByTestId('control-center-track-position')
    ).toHaveTextContent('3 / 3');
    expect(status).toHaveTextContent('Previous track: Alabaster Pulse');
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CONTROL_CENTER_STATE,
      trackIndex: 2,
    });
  });

  it('handles empty tracks fallback, non-finite trackIndex, whitespace metadata, and dynamic queue shrink safely', () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <ControlCenterGrid
        title="   "
        tracks={[]}
        defaultValue={{ trackIndex: Number.NaN }}
        onChange={onChange}
      />
    );

    expect(screen.getByTestId('control-center-title')).toHaveTextContent(
      'Control Center'
    );
    expect(screen.getByTestId('control-center-track-title')).toHaveTextContent(
      'No Track Queued'
    );
    expect(screen.getByTestId('control-center-track-artist')).toHaveTextContent(
      'System Audio Idle'
    );
    expect(
      screen.getByTestId('control-center-track-duration')
    ).toHaveTextContent('0:00');
    expect(
      screen.getByTestId('control-center-track-position')
    ).toHaveTextContent('0 / 0');

    // Stepping Next/Previous on empty queue never produces NaN and announces safely
    fireEvent.click(screen.getByRole('button', { name: 'Next Track' }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CONTROL_CENTER_STATE,
      trackIndex: 0,
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'No tracks available in queue'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous Track' }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CONTROL_CENTER_STATE,
      trackIndex: 0,
    });

    // Play/Pause still works on empty queue
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Playing No Track Queued'
    );

    // Whitespace-only track metadata falls back cleanly
    const blankTrack: ReadonlyArray<ControlCenterTrack> = [
      { id: '   ', title: '   ', artist: ' ', durationLabel: '  ' },
    ];
    rerender(<ControlCenterGrid tracks={blankTrack} />);
    expect(screen.getByTestId('control-center-track-title')).toHaveTextContent(
      'Untitled Track'
    );
    expect(screen.getByTestId('control-center-track-artist')).toHaveTextContent(
      'Unknown Artist'
    );
    expect(
      screen.getByTestId('control-center-track-duration')
    ).toHaveTextContent('--:--');
    expect(
      screen.getByTestId('control-center-track-position')
    ).toHaveTextContent('1 / 1');
  });

  it('respects controlled value strictly without mutating until parent updates', () => {
    const onChange = vi.fn();
    const controlled: ControlCenterState = {
      wifi: false,
      bluetooth: false,
      doNotDisturb: true,
      theme: 'dark',
      brightnessPct: 55,
      volumePct: 30,
      playing: true,
      trackIndex: 1,
    };

    const { rerender } = render(
      <ControlCenterGrid value={controlled} onChange={onChange} />
    );

    expect(screen.getByTestId('control-center-status')).toHaveTextContent(
      'Display 55% · Volume 30% · Playing Caustic Horizon'
    );
    expect(screen.getByTestId('control-center-track-title')).toHaveTextContent(
      'Caustic Horizon'
    );
    expect(screen.getByRole('button', { name: /wi-fi/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Clicking Wi-Fi invokes onChange but keeps controlled UI pinned to false
    fireEvent.click(screen.getByRole('button', { name: /wi-fi/i }));
    expect(onChange).toHaveBeenCalledWith({ ...controlled, wifi: true });
    expect(screen.getByRole('button', { name: /wi-fi/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Parent updates controlled value -> UI updates immediately
    rerender(
      <ControlCenterGrid
        value={{ ...controlled, wifi: true, trackIndex: -1 }}
        onChange={onChange}
      />
    );
    expect(screen.getByRole('button', { name: /wi-fi/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // Negative controlled trackIndex wraps safely to last track (index 2)
    expect(screen.getByTestId('control-center-track-title')).toHaveTextContent(
      'Alabaster Pulse'
    );
  });

  it('enforces disabled state across all controls and guards IME composing keyboard events', () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <ControlCenterGrid
        disabled
        onChange={onChange}
        data-testid="cc-disabled"
      />
    );

    const root = screen.getByTestId('cc-disabled');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const wifiBtn = screen.getByRole('button', { name: /wi-fi/i });
    const btBtn = screen.getByRole('button', { name: /bluetooth/i });
    const dndBtn = screen.getByRole('button', { name: /do not disturb/i });
    const themeBtn = screen.getByRole('button', { name: /theme/i });
    const prevBtn = screen.getByRole('button', { name: 'Previous Track' });
    const playBtn = screen.getByRole('button', { name: 'Play' });
    const nextBtn = screen.getByRole('button', { name: 'Next Track' });
    const brightnessSlider = screen.getByRole('slider', {
      name: 'Display brightness',
    });
    const volumeSlider = screen.getByRole('slider', {
      name: 'Output volume',
    });

    for (const control of [
      wifiBtn,
      btBtn,
      dndBtn,
      themeBtn,
      prevBtn,
      playBtn,
      nextBtn,
      brightnessSlider,
      volumeSlider,
    ]) {
      expect(control).toBeDisabled();
    }

    // Synthetic events on disabled controls must not emit onChange or mutate state
    fireEvent.click(wifiBtn);
    fireEvent.click(playBtn);
    fireEvent.change(brightnessSlider, { target: { value: '15' } });
    fireEvent.change(volumeSlider, { target: { value: '10' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByTestId('control-center-brightness-pill')
    ).toHaveTextContent('80%');
    expect(screen.getByTestId('control-center-volume-pill')).toHaveTextContent(
      '65%'
    );

    // Re-enable and verify IME composition keydown guard
    rerender(<ControlCenterGrid onChange={onChange} />);
    const enabledWifi = screen.getByRole('button', { name: /wi-fi/i });
    const composingEvent = dispatchComposingKeyDown(enabledWifi, 'Enter');
    expect(composingEvent.defaultPrevented).toBe(true);

    const normalEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      isComposing: false,
    });
    enabledWifi.dispatchEvent(normalEvent);
    expect(normalEvent.defaultPrevented).toBe(false);
  });

  it('renders XSS payloads in title and track metadata strictly as escaped literal text', () => {
    const xssTitle = '<script>window.__ccXss=1</script><img src=x onerror=alert(1)>';
    const xssTrack: ReadonlyArray<ControlCenterTrack> = [
      {
        id: 'xss-track',
        title: '<script>alert("title")</script>',
        artist: '<img src=x onerror=alert("artist")>',
        durationLabel: '<b>9:99</b>',
      },
    ];

    render(<ControlCenterGrid title={xssTitle} tracks={xssTrack} />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('b')).toBeNull();

    expect(screen.getByTestId('control-center-title')).toHaveTextContent(
      xssTitle
    );
    expect(screen.getByTestId('control-center-track-title')).toHaveTextContent(
      '<script>alert("title")</script>'
    );
    expect(screen.getByTestId('control-center-track-artist')).toHaveTextContent(
      '<img src=x onerror=alert("artist")>'
    );
    expect(
      screen.getByTestId('control-center-track-duration')
    ).toHaveTextContent('<b>9:99</b>');
  });
});
