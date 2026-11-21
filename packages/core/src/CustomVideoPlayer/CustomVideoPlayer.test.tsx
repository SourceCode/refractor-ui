import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CustomVideoPlayer, type VideoChapter } from './index';

const SAMPLE_CHAPTERS: readonly VideoChapter[] = [
  { id: 'intro', title: 'Opening Remarks', timeSeconds: 0 },
  { id: 'optics', title: 'Refractive Physics', timeSeconds: 65 },
  { id: 'demo', title: 'Interactive Studio', timeSeconds: 130 },
];

describe('CustomVideoPlayer', () => {
  it('renders default optical preview stage, ref, theme overrides, xstyle, and tabular timing', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CustomVideoPlayer: {
              className: 'theme-video-shell',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <CustomVideoPlayer
          ref={ref}
          className="custom-player"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="video-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('video-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-custom-video-player',
      'prism-slab',
      'theme-video-shell',
      'custom-player'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).not.toHaveAttribute('data-playing');
    expect(root).not.toHaveAttribute('data-has-media');

    expect(screen.getByTestId('video-preview-stage')).toBeInTheDocument();
    expect(screen.queryByTestId('video-element')).not.toBeInTheDocument();
    expect(screen.getByTestId('video-stage-title')).toHaveTextContent('Optical Media Stream');
    expect(screen.getByTestId('video-playback-badge')).toHaveTextContent('Paused');
    expect(screen.getByTestId('video-time-readout')).toHaveTextContent('00:00 / 03:00');
    expect(screen.getByTestId('video-speed-button')).toHaveTextContent('1x');
    expect(screen.queryByTestId('video-captions-overlay')).not.toBeInTheDocument();
    expect(screen.queryByTestId('video-chapter-strip')).not.toBeInTheDocument();
  });

  it('renders sanitized poster image and supports full transport controls on the optical preview stage without src', () => {
    const onPlayStateChange = vi.fn();

    render(
      <CustomVideoPlayer
        title="Studio Preview"
        poster="data:image/png;base64,iVBORw0KGgo="
        durationSeconds={95}
        onPlayStateChange={onPlayStateChange}
      />
    );

    const posterImg = screen.getByTestId('video-poster-image');
    expect(posterImg).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgo=');
    expect(posterImg).toHaveAttribute('alt', 'Studio Preview');
    expect(screen.getByTestId('video-time-readout')).toHaveTextContent('00:00 / 01:35');

    // Play/pause, speed, mute, and volume operate cleanly when no native <video> element is mounted
    fireEvent.click(screen.getByTestId('video-play-button'));
    expect(onPlayStateChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId('video-playback-badge')).toHaveTextContent('Playing');

    fireEvent.click(screen.getByTestId('video-speed-button'));
    expect(screen.getByTestId('video-speed-button')).toHaveTextContent('1.25x');

    fireEvent.change(screen.getByTestId('video-volume-slider'), { target: { value: '60' } });
    expect(screen.getByTestId('video-volume-slider')).toHaveValue('60');

    fireEvent.click(screen.getByTestId('video-mute-button'));
    expect(screen.getByTestId('video-mute-button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders native <video> for safe src and synchronizes play, pause, scrub, speed, volume, and media events', () => {
    const onPlayStateChange = vi.fn();
    const onTimeChange = vi.fn();

    render(
      <CustomVideoPlayer
        src="https://cdn.example.com/keynote.mp4"
        poster="https://cdn.example.com/poster.jpg"
        title="Keynote Stream"
        durationSeconds={200}
        onPlayStateChange={onPlayStateChange}
        onTimeChange={onTimeChange}
        data-testid="video-native-root"
      />
    );

    const root = screen.getByTestId('video-native-root');
    expect(root).toHaveAttribute('data-has-media', 'true');

    const videoEl = screen.getByTestId('video-element') as HTMLVideoElement;
    expect(videoEl).toHaveAttribute('src', 'https://cdn.example.com/keynote.mp4');
    expect(videoEl).toHaveAttribute('poster', 'https://cdn.example.com/poster.jpg');

    const playMock = vi.fn(() => Promise.resolve());
    const pauseMock = vi.fn();
    Object.defineProperty(videoEl, 'play', { value: playMock, configurable: true });
    Object.defineProperty(videoEl, 'pause', { value: pauseMock, configurable: true });

    const playBtn = screen.getByTestId('video-play-button');
    fireEvent.click(playBtn);
    expect(onPlayStateChange).toHaveBeenLastCalledWith(true);
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-playing', 'true');
    expect(screen.getByTestId('video-playback-badge')).toHaveTextContent('Playing');
    expect(playBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(playBtn);
    expect(onPlayStateChange).toHaveBeenLastCalledWith(false);
    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('video-playback-badge')).toHaveTextContent('Paused');

    // Timeline scrubber seek updates video currentTime and fires onTimeChange
    const scrubber = screen.getByLabelText('Timeline scrubber');
    fireEvent.change(scrubber, { target: { value: '75' } });
    expect(onTimeChange).toHaveBeenLastCalledWith(75);
    expect(videoEl.currentTime).toBe(75);
    expect(screen.getByTestId('video-time-readout')).toHaveTextContent('01:15 / 03:20');

    // Native timeupdate and ended events sync back to React state
    videoEl.currentTime = 120;
    fireEvent.timeUpdate(videoEl);
    expect(onTimeChange).toHaveBeenLastCalledWith(120);
    expect(screen.getByTestId('video-time-readout')).toHaveTextContent('02:00 / 03:20');

    fireEvent.click(playBtn);
    fireEvent.ended(videoEl);
    expect(onPlayStateChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByTestId('video-playback-badge')).toHaveTextContent('Paused');

    // Speed cycle: 1x -> 1.25x -> 1.5x -> 2x -> 0.5x -> 1x
    const speedBtn = screen.getByTestId('video-speed-button');
    const expectedCycle = ['1.25x', '1.5x', '2x', '0.5x', '1x'];
    for (const label of expectedCycle) {
      fireEvent.click(speedBtn);
      expect(speedBtn).toHaveTextContent(label);
    }
    expect(videoEl.playbackRate).toBe(1);

    // Volume slider & mute toggle behavior
    const volumeSlider = screen.getByTestId('video-volume-slider');
    const muteBtn = screen.getByTestId('video-mute-button');

    fireEvent.change(volumeSlider, { target: { value: '40' } });
    expect(videoEl.volume).toBeCloseTo(0.4);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.change(volumeSlider, { target: { value: '0' } });
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(root).toHaveAttribute('data-muted', 'true');

    // Unmuting when volume was 0 restores 50%
    fireEvent.click(muteBtn);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(volumeSlider).toHaveValue('50');
    expect(videoEl.volume).toBeCloseTo(0.5);

    // Muting with non-zero volume retains volume after unmuting
    fireEvent.click(muteBtn);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(volumeSlider).toHaveValue('0');
    fireEvent.click(muteBtn);
    expect(volumeSlider).toHaveValue('50');
  });

  it('supports chapter marker pins, chapter pill strip, and active chapter highlighting', () => {
    const onTimeChange = vi.fn();

    render(
      <CustomVideoPlayer
        durationSeconds={180}
        chapters={SAMPLE_CHAPTERS}
        onTimeChange={onTimeChange}
      />
    );

    expect(screen.getByTestId('video-chapter-pill-intro')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('video-chapter-pill-optics')).toHaveAttribute('aria-pressed', 'false');

    // Click track marker pin
    fireEvent.click(screen.getByTestId('video-chapter-marker-optics'));
    expect(onTimeChange).toHaveBeenLastCalledWith(65);
    expect(screen.getByTestId('video-time-readout')).toHaveTextContent('01:05 / 03:00');
    expect(screen.getByTestId('video-chapter-pill-optics')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('video-playback-badge')).toHaveTextContent('Refractive Physics');

    // Click chapter pill
    fireEvent.click(screen.getByTestId('video-chapter-pill-demo'));
    expect(onTimeChange).toHaveBeenLastCalledWith(130);
    expect(screen.getByTestId('video-time-readout')).toHaveTextContent('02:10 / 03:00');
    expect(screen.getByTestId('video-chapter-pill-demo')).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles frosted captions pill with default and custom captionsText', () => {
    const { rerender } = render(<CustomVideoPlayer />);

    const ccBtn = screen.getByTestId('video-captions-button');
    expect(ccBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('video-captions-overlay')).not.toBeInTheDocument();

    fireEvent.click(ccBtn);
    expect(ccBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('video-captions-overlay')).toHaveTextContent(
      'Live optical captions enabled'
    );

    rerender(
      <CustomVideoPlayer captionsText="Specular highlights refract across the optical prism." />
    );
    expect(screen.getByTestId('video-captions-overlay')).toHaveTextContent(
      'Specular highlights refract across the optical prism.'
    );

    fireEvent.click(ccBtn);
    expect(ccBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('video-captions-overlay')).not.toBeInTheDocument();
  });

  it('invokes requestFullscreen and falls back cleanly to visual expanded state if Fullscreen API throws', () => {
    render(<CustomVideoPlayer data-testid="fs-root" defaultCaptionsEnabled />);

    const root = screen.getByTestId('fs-root');
    const fsBtn = screen.getByTestId('video-fullscreen-button');
    expect(screen.getByTestId('video-captions-overlay')).toBeInTheDocument();

    const requestFullscreenMock = vi.fn(() => Promise.resolve());
    Object.defineProperty(root, 'requestFullscreen', {
      value: requestFullscreenMock,
      configurable: true,
    });

    fireEvent.click(fsBtn);
    expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
    expect(fsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(root).toHaveAttribute('data-fullscreen', 'true');
    expect(root).toHaveClass('fixed', 'inset-4', 'z-50');

    // Simulate document.fullscreenElement active when exiting fullscreen
    const exitFullscreenMock = vi.fn(() => Promise.resolve());
    Object.defineProperty(document, 'fullscreenElement', {
      value: root,
      configurable: true,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      value: exitFullscreenMock,
      configurable: true,
    });

    fireEvent.click(fsBtn);
    expect(exitFullscreenMock).toHaveBeenCalledTimes(1);
    expect(fsBtn).toHaveAttribute('aria-pressed', 'false');
    expect(root).not.toHaveAttribute('data-fullscreen');

    // Clean up document fullscreen mock and verify synchronous throw fallback
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
    Object.defineProperty(root, 'requestFullscreen', {
      value: vi.fn(() => {
        throw new Error('Fullscreen blocked');
      }),
      configurable: true,
    });

    fireEvent.click(fsBtn);
    expect(fsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(root).toHaveAttribute('data-fullscreen', 'true');

    // Exit when document.fullscreenElement is null
    fireEvent.click(fsBtn);
    expect(fsBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('handles play() rejection and synchronous throws without unhandled errors on native video (negative test)', async () => {
    render(<CustomVideoPlayer src="/media/demo.mp4" defaultSpeed={99} />);
    expect(screen.getByTestId('video-speed-button')).toHaveTextContent('1x');

    const videoEl = screen.getByTestId('video-element') as HTMLVideoElement;
    Object.defineProperty(videoEl, 'play', {
      value: vi.fn(() => Promise.reject(new Error('Autoplay rejected'))),
      configurable: true,
    });
    Object.defineProperty(videoEl, 'pause', {
      value: vi.fn(),
      configurable: true,
    });

    const playBtn = screen.getByTestId('video-play-button');
    fireEvent.click(playBtn);
    await Promise.resolve();
    expect(playBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(playBtn);
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');

    Object.defineProperty(videoEl, 'play', {
      value: vi.fn(() => {
        throw new Error('Autoplay policy');
      }),
      configurable: true,
    });

    fireEvent.click(playBtn);
    expect(playBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('strips javascript: URLs, clamps NaN/Infinity durations & chapter times, and renders XSS payloads literally (adversarial)', () => {
    const xssPayload = '<script>window.__videoXss=1</script><img src=x onerror=alert(1)>';
    const adversarialChapters: readonly VideoChapter[] = [
      { id: '__proto__', title: xssPayload, timeSeconds: Number.NaN },
      { id: '__proto__', title: 'Duplicate chapter', timeSeconds: Number.POSITIVE_INFINITY },
      { id: 'constructor', title: 'Negative chapter', timeSeconds: -50 },
    ];

    render(
      <CustomVideoPlayer
        src="javascript:alert(1)"
        poster="javascript:evil()"
        title={xssPayload}
        durationSeconds={Number.NaN}
        chapters={adversarialChapters}
        captionsText={xssPayload}
        defaultCaptionsEnabled
      />
    );

    // Dangerous src and poster must be stripped completely
    expect(screen.queryByTestId('video-element')).not.toBeInTheDocument();
    expect(screen.queryByTestId('video-poster-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('video-preview-stage')).toBeInTheDocument();

    // NaN duration falls back safely to 180s (03:00)
    expect(screen.getByTestId('video-time-readout')).toHaveTextContent('00:00 / 03:00');

    // XSS payload rendered strictly as literal text, never executed as DOM tags
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(xssPayload).length).toBeGreaterThanOrEqual(3);
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xssPayload);
  });

  it('clamps extreme Infinity and below-minimum durations cleanly (negative test)', () => {
    const { rerender } = render(<CustomVideoPlayer durationSeconds={Number.POSITIVE_INFINITY} />);
    expect(screen.getByTestId('video-time-readout')).toHaveTextContent('00:00 / 03:00');

    rerender(<CustomVideoPlayer durationSeconds={0} />);
    expect(screen.getByTestId('video-time-readout')).toHaveTextContent('00:00 / 00:01');

    rerender(<CustomVideoPlayer durationSeconds={100000} />);
    expect(screen.getByTestId('video-time-readout')).toHaveTextContent('00:00 / 1440:00');
  });
});
