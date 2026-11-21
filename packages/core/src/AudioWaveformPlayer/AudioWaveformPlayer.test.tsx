import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { AudioWaveformPlayer } from './index';

const SAMPLE_PEAKS: readonly number[] = [0.2, 0.5, 0.9, 0.65, 0.4];

describe('AudioWaveformPlayer', () => {
  it('renders prism-slab audio player with default title, ref, theme overrides, timing, and waveform bars', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AudioWaveformPlayer: {
              className: 'theme-audio-card',
              style: { maxWidth: '540px' },
            },
          },
        }}
      >
        <AudioWaveformPlayer
          ref={ref}
          peaks={SAMPLE_PEAKS}
          subtitle="Session Recording"
          className="custom-audio"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="audio-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('audio-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-audio-waveform-player',
      'prism-slab',
      'theme-audio-card',
      'custom-audio'
    );
    expect(root).toHaveStyle({ maxWidth: '540px' });
    expect(root).not.toHaveAttribute('data-playing');
    expect(root).not.toHaveAttribute('data-fallback');

    expect(screen.getByTestId('audio-title')).toHaveTextContent('Audio Track');
    expect(screen.getByTestId('audio-subtitle')).toHaveTextContent('Session Recording');
    expect(screen.getByTestId('audio-time-readout')).toHaveTextContent('00:00 / 02:00');
    expect(screen.getByTestId('audio-speed-button')).toHaveTextContent('1x');

    const slider = screen.getByRole('slider', { name: 'Audio Track waveform scrubber' });
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '120');
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    // All 5 bars initially unplayed with secondary token & reduced opacity
    for (let i = 0; i < SAMPLE_PEAKS.length; i += 1) {
      const bar = screen.getByTestId(`waveform-bar-${i}`);
      expect(bar).toHaveAttribute('data-played', 'false');
      expect(bar.style.backgroundColor).toBe('var(--prism-secondary-main)');
      expect(bar.style.opacity).toBe('0.35');
    }
  });

  it('toggles play/pause, cycles speed (1x -> 1.25x -> 1.5x -> 2x -> 0.75x -> 1x), and seeks by clicking bars', () => {
    const onPlayStateChange = vi.fn();
    const onSeek = vi.fn();

    render(
      <AudioWaveformPlayer
        title="Optical Acoustics"
        peaks={SAMPLE_PEAKS}
        durationSeconds={100}
        onPlayStateChange={onPlayStateChange}
        onSeek={onSeek}
        data-testid="audio-interactive"
      />
    );

    const playBtn = screen.getByTestId('audio-play-button');
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(playBtn);
    expect(onPlayStateChange).toHaveBeenLastCalledWith(true);
    expect(playBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('audio-interactive')).toHaveAttribute('data-playing', 'true');

    fireEvent.click(playBtn);
    expect(onPlayStateChange).toHaveBeenLastCalledWith(false);
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');

    // Speed cycle exact order: 1x -> 1.25x -> 1.5x -> 2x -> 0.75x -> 1x
    const speedBtn = screen.getByTestId('audio-speed-button');
    expect(speedBtn).toHaveTextContent('1x');
    const cycle = ['1.25x', '1.5x', '2x', '0.75x', '1x'];
    for (const label of cycle) {
      fireEvent.click(speedBtn);
      expect(speedBtn).toHaveTextContent(label);
    }

    // Click middle bar (index 2 of 5 -> 50s of 100s)
    fireEvent.click(screen.getByTestId('waveform-bar-2'));
    expect(onSeek).toHaveBeenLastCalledWith(50);
    expect(screen.getByTestId('audio-time-readout')).toHaveTextContent('00:50 / 01:40');

    // Played bars use var(--prism-primary-main) and opacity 1
    const playedBar = screen.getByTestId('waveform-bar-0');
    expect(playedBar).toHaveAttribute('data-played', 'true');
    expect(playedBar.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(playedBar.style.opacity).toBe('1');

    // Unplayed trailing bar stays var(--prism-secondary-main)
    const unplayedBar = screen.getByTestId('waveform-bar-4');
    expect(unplayedBar).toHaveAttribute('data-played', 'false');
    expect(unplayedBar.style.backgroundColor).toBe('var(--prism-secondary-main)');

    // Click last bar (100s) marks all bars played
    fireEvent.click(screen.getByTestId('waveform-bar-4'));
    expect(onSeek).toHaveBeenLastCalledWith(100);
    expect(screen.getByTestId('waveform-bar-4')).toHaveAttribute('data-played', 'true');
  });

  it('supports keyboard seeking with ArrowRight, ArrowLeft, Home, End and ignores IME composition & unrelated keys', () => {
    const onSeek = vi.fn();

    render(
      <AudioWaveformPlayer
        peaks={SAMPLE_PEAKS}
        durationSeconds={120}
        defaultTimeSeconds={10}
        onSeek={onSeek}
      />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '10');

    // ArrowRight advances by 5s (120 / 24 = 5)
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onSeek).toHaveBeenLastCalledWith(15);
    expect(slider).toHaveAttribute('aria-valuenow', '15');

    // ArrowLeft rewinds by 5s
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onSeek).toHaveBeenLastCalledWith(10);
    expect(slider).toHaveAttribute('aria-valuenow', '10');

    // End jumps to full duration
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onSeek).toHaveBeenLastCalledWith(120);
    expect(slider).toHaveAttribute('aria-valuenow', '120');

    // Home jumps back to 0
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onSeek).toHaveBeenLastCalledWith(0);
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    // Unrelated key does not trigger onSeek
    const callsBefore = onSeek.mock.calls.length;
    fireEvent.keyDown(slider, { key: 'Tab' });
    expect(onSeek).toHaveBeenCalledTimes(callsBefore);

    // IME composing keydown is ignored
    const composingEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    slider.dispatchEvent(composingEvent);
    expect(onSeek).toHaveBeenCalledTimes(callsBefore);
  });

  it('supports controlled currentTimeSeconds prop and custom defaultSpeed', () => {
    function ControlledAudioHarness() {
      const [time, setTime] = useState(30);
      return (
        <div>
          <button type="button" onClick={() => setTime(90)}>
            Jump 90s
          </button>
          <AudioWaveformPlayer
            peaks={SAMPLE_PEAKS}
            durationSeconds={120}
            currentTimeSeconds={time}
            onSeek={setTime}
            defaultSpeed={1.5}
          />
        </div>
      );
    }

    render(<ControlledAudioHarness />);
    expect(screen.getByTestId('audio-speed-button')).toHaveTextContent('1.5x');
    expect(screen.getByTestId('audio-time-readout')).toHaveTextContent('00:30 / 02:00');

    fireEvent.click(screen.getByRole('button', { name: 'Jump 90s' }));
    expect(screen.getByTestId('audio-time-readout')).toHaveTextContent('01:30 / 02:00');

    fireEvent.click(screen.getByTestId('waveform-bar-0'));
    expect(screen.getByTestId('audio-time-readout')).toHaveTextContent('00:00 / 02:00');
  });

  it('renders graceful fallback waveform when peaks is empty and handles single-peak arrays (negative test)', () => {
    const { rerender } = render(
      <AudioWaveformPlayer peaks={[]} durationSeconds={60} data-testid="fallback-root" />
    );

    expect(screen.getByTestId('fallback-root')).toHaveAttribute('data-fallback', 'true');
    const scrubber = screen.getByTestId('audio-waveform-scrubber');
    expect(scrubber).toHaveAttribute('data-fallback-waveform', 'true');
    expect(screen.getByTestId('waveform-bar-0')).toBeInTheDocument();
    expect(screen.getByTestId('waveform-bar-15')).toBeInTheDocument();

    // Single peak array seeks cleanly to 0 without dividing by zero
    const onSeek = vi.fn();
    rerender(<AudioWaveformPlayer peaks={[0.5]} durationSeconds={60} onSeek={onSeek} />);
    fireEvent.click(screen.getByTestId('waveform-bar-0'));
    expect(onSeek).toHaveBeenLastCalledWith(0);
  });

  it('clamps NaN, Infinity, negative, and >1 peak values and durations cleanly (negative & adversarial)', () => {
    const xssPayload = '<script>window.__audioXss=1</script><img src=x onerror=alert(1)>';
    const hostilePeaks: readonly number[] = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -2,
      0,
      4.5,
      0.5,
    ];

    render(
      <AudioWaveformPlayer
        title={xssPayload}
        subtitle={xssPayload}
        peaks={hostilePeaks}
        durationSeconds={Number.NaN}
        defaultTimeSeconds={Number.POSITIVE_INFINITY}
        defaultSpeed={Number.NaN}
      />
    );

    // Fallback duration 120s (02:00), defaultTime 0 (00:00), speed 1x
    expect(screen.getByTestId('audio-time-readout')).toHaveTextContent('00:00 / 02:00');
    expect(screen.getByTestId('audio-speed-button')).toHaveTextContent('1x');

    // Peaks sanitized/clamped strictly to [0.08..1]
    expect(screen.getByTestId('waveform-bar-0')).toHaveAttribute('data-amplitude', '0.08');
    expect(screen.getByTestId('waveform-bar-1')).toHaveAttribute('data-amplitude', '0.08');
    expect(screen.getByTestId('waveform-bar-2')).toHaveAttribute('data-amplitude', '0.08');
    expect(screen.getByTestId('waveform-bar-3')).toHaveAttribute('data-amplitude', '0.08');
    expect(screen.getByTestId('waveform-bar-4')).toHaveAttribute('data-amplitude', '0.08');
    expect(screen.getByTestId('waveform-bar-5')).toHaveAttribute('data-amplitude', '1.00');
    expect(screen.getByTestId('waveform-bar-6')).toHaveAttribute('data-amplitude', '0.50');

    // XSS strings rendered strictly as literal text
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(xssPayload)).toHaveLength(2);
  });
});
