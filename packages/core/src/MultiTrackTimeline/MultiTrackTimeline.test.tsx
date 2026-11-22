import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  MultiTrackTimeline,
  type TimelineClip,
  type TimelineTrack,
  type TimelineTrackKindMap,
} from './index';

const BASE_TRACKS: ReadonlyArray<TimelineTrack> = [
  {
    id: 'v1',
    name: 'Camera A',
    kind: 'video',
    clips: [
      { id: 'c1', label: 'Opening Shot', startSec: 0, durationSec: 18 },
      { id: 'c2', label: 'Product Reveal', startSec: 20, durationSec: 22.5 },
    ],
  },
  {
    id: 'a1',
    name: 'Master Audio',
    kind: 'audio',
    clips: [{ id: 'c3', label: 'Ambient Score', startSec: 0, durationSec: 54 }],
  },
  {
    id: 'fx1',
    name: 'Optical Grade',
    kind: 'effect',
    clips: [{ id: 'c4', label: 'Caustic Bloom', startSec: 10, durationSec: 12 }],
  },
  {
    id: 'sub1',
    name: 'Captions EN',
    kind: 'subtitle',
    locked: true,
    clips: [{ id: 'c5', label: 'Intro VO', startSec: 2, durationSec: 9 }],
  },
];

describe('MultiTrackTimeline', () => {
  it('renders header, timecode, track kinds, optical clips, theme overrides, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const kindMapCheck: TimelineTrackKindMap = {
      video: true,
      audio: true,
      effect: true,
      subtitle: true,
    };
    expect(Object.keys(kindMapCheck)).toEqual(['video', 'audio', 'effect', 'subtitle']);

    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            MultiTrackTimeline: {
              className: 'theme-timeline',
              style: { marginTop: '6px' },
            },
          },
        }}
      >
        <MultiTrackTimeline
          ref={ref}
          tracks={BASE_TRACKS}
          durationSec={60}
          defaultCurrentTimeSec={12.5}
          className="custom-timeline"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="timeline"
        />
      </PrismThemeProvider>
    );

    expect(MultiTrackTimeline.displayName).toBe('MultiTrackTimeline');
    const root = screen.getByTestId('timeline');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-multi-track-timeline',
      'prism-slab',
      'theme-timeline',
      'custom-timeline'
    );
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Sequence Multi-Track Timeline');
    expect(root).toHaveAttribute('data-zoom', '1');
    expect(root).toHaveStyle({ marginTop: '6px' });

    expect(screen.getByText('Sequence Multi-Track Timeline')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-timecode')).toHaveTextContent('00:12.50 / 01:00.00');
    expect(screen.getByTestId('timeline-counts')).toHaveTextContent('4 tracks · 5 clips');

    // Verify all 4 track kind dots use semantic --prism-* tokens
    const videoDot = container.querySelector('[data-track-kind-dot="video"]') as HTMLElement;
    const audioDot = container.querySelector('[data-track-kind-dot="audio"]') as HTMLElement;
    const effectDot = container.querySelector('[data-track-kind-dot="effect"]') as HTMLElement;
    const subtitleDot = container.querySelector('[data-track-kind-dot="subtitle"]') as HTMLElement;
    expect(videoDot.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(audioDot.style.backgroundColor).toBe('var(--prism-secondary-main)');
    expect(effectDot.style.backgroundColor).toBe('var(--prism-success-main)');
    expect(subtitleDot.style.backgroundColor).toBe('var(--prism-warning-main)');

    // Verify optical clip surfaces
    const videoClip = container.querySelector('[data-clip-id="c1"]');
    const audioClip = container.querySelector('[data-clip-id="c3"]');
    const effectClip = container.querySelector('[data-clip-id="c4"]');
    const subtitleClip = container.querySelector('[data-clip-id="c5"]');
    expect(videoClip).toHaveClass('prism-btn-primary');
    expect(audioClip).toHaveClass('prism-crystal');
    expect(effectClip).toHaveClass('prism-emerald');
    expect(subtitleClip).toHaveClass('prism-crystal');
    expect(subtitleClip).toBeDisabled();

    // Playhead indicator uses signature tangerine token and positions at 12.5 / 60
    const playhead = screen.getByTestId('timeline-playhead');
    expect(playhead.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(playhead).toHaveAttribute('data-time-sec', '12.5');

    // Inspector shows playhead summary before any clip is selected (3 active clips at 12.5s: c1, c3, c4)
    const inspector = screen.getByTestId('timeline-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveTextContent('Playhead 00:12.50 / 01:00.00 · 3 active clips');

    // Ensure zero raw hex color literals leaked into rendered markup
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });

  it('switches zoom scales 1×, 2×, and 4× and scales canvas width and tick density', () => {
    const { container } = render(
      <MultiTrackTimeline
        tracks={BASE_TRACKS}
        durationSec={60}
        title="Master Edit"
        aria-label="Custom sequence region"
        data-testid="timeline-zoom"
      />
    );

    const root = screen.getByTestId('timeline-zoom');
    expect(root).toHaveAttribute('aria-label', 'Custom sequence region');
    expect(screen.getByText('Master Edit')).toBeInTheDocument();

    const canvas = screen.getByTestId('timeline-canvas');
    const zoom1Btn = screen.getByRole('button', { name: '1×' });
    const zoom2Btn = screen.getByRole('button', { name: '2×' });
    const zoom4Btn = screen.getByRole('button', { name: '4×' });

    expect(zoom1Btn).toHaveAttribute('aria-pressed', 'true');
    expect(canvas).toHaveStyle({ width: '640px' });
    const ticksAt1x = container.querySelectorAll('[data-ruler-tick]').length;

    fireEvent.click(zoom2Btn);
    expect(root).toHaveAttribute('data-zoom', '2');
    expect(zoom2Btn).toHaveAttribute('aria-pressed', 'true');
    expect(canvas).toHaveStyle({ width: '1280px' });
    const ticksAt2x = container.querySelectorAll('[data-ruler-tick]').length;
    expect(ticksAt2x).toBeGreaterThan(ticksAt1x);

    fireEvent.click(zoom4Btn);
    expect(root).toHaveAttribute('data-zoom', '4');
    expect(zoom4Btn).toHaveAttribute('aria-pressed', 'true');
    expect(canvas).toHaveStyle({ width: '2560px' });
    expect(screen.getByTestId('timeline-inspector')).toHaveTextContent('Zoom 4×');
    expect(container.querySelectorAll('[data-ruler-tick]').length).toBeGreaterThan(ticksAt2x);
  });

  it('scrubs playhead via ruler clicks and IME-safe keyboard controls in uncontrolled and controlled modes', () => {
    const onTimeChange = vi.fn();
    const { rerender } = render(
      <MultiTrackTimeline
        tracks={BASE_TRACKS}
        durationSec={60}
        defaultCurrentTimeSec={10}
        onTimeChange={onTimeChange}
      />
    );

    const ruler = screen.getByTestId('timeline-ruler');
    expect(ruler).toHaveAttribute('role', 'slider');
    expect(ruler).toHaveAttribute('aria-valuenow', '10');
    expect(ruler).toHaveAttribute('aria-valuetext', '00:10.00');

    // Click with zero-width default JSDOM rect falls back to canvasWidthPx (640)
    fireEvent.click(ruler, { clientX: 320 });
    expect(onTimeChange).toHaveBeenLastCalledWith(30);
    expect(screen.getByTestId('timeline-timecode')).toHaveTextContent('00:30.00 / 01:00.00');

    // Click with mocked bounding rect
    vi.spyOn(ruler, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 0,
      right: 500,
      bottom: 40,
      width: 400,
      height: 40,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.click(ruler, { clientX: 200 }); // 100/400 = 0.25 * 60 = 15s
    expect(onTimeChange).toHaveBeenLastCalledWith(15);
    expect(screen.getByTestId('timeline-timecode')).toHaveTextContent('00:15.00 / 01:00.00');

    // Keyboard stepping: ArrowRight (+1s), Shift+ArrowRight (+5s), ArrowLeft (-1s), Shift+ArrowLeft (-5s)
    fireEvent.keyDown(ruler, { key: 'ArrowRight' });
    expect(onTimeChange).toHaveBeenLastCalledWith(16);

    fireEvent.keyDown(ruler, { key: 'ArrowRight', shiftKey: true });
    expect(onTimeChange).toHaveBeenLastCalledWith(21);

    fireEvent.keyDown(ruler, { key: 'ArrowLeft' });
    expect(onTimeChange).toHaveBeenLastCalledWith(20);

    fireEvent.keyDown(ruler, { key: 'ArrowLeft', shiftKey: true });
    expect(onTimeChange).toHaveBeenLastCalledWith(15);

    // Home & End
    fireEvent.keyDown(ruler, { key: 'Home' });
    expect(onTimeChange).toHaveBeenLastCalledWith(0);

    // Clamping at 0 does not emit redundant callback
    const callsAtZero = onTimeChange.mock.calls.length;
    fireEvent.keyDown(ruler, { key: 'ArrowLeft' });
    expect(onTimeChange).toHaveBeenCalledTimes(callsAtZero);

    fireEvent.keyDown(ruler, { key: 'End' });
    expect(onTimeChange).toHaveBeenLastCalledWith(60);

    // Unrelated key and IME composition event are ignored
    const callsAtEnd = onTimeChange.mock.calls.length;
    fireEvent.keyDown(ruler, { key: 'a' });
    const imeEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    ruler.dispatchEvent(imeEvent);
    expect(onTimeChange).toHaveBeenCalledTimes(callsAtEnd);

    // Controlled currentTimeSec pins playhead until parent updates prop
    rerender(
      <MultiTrackTimeline
        tracks={BASE_TRACKS}
        durationSec={60}
        currentTimeSec={25}
        onTimeChange={onTimeChange}
      />
    );
    expect(screen.getByTestId('timeline-timecode')).toHaveTextContent('00:25.00 / 01:00.00');
    fireEvent.keyDown(ruler, { key: 'ArrowRight' });
    expect(onTimeChange).toHaveBeenLastCalledWith(26);
    expect(screen.getByTestId('timeline-timecode')).toHaveTextContent('00:25.00 / 01:00.00');
  });

  it('selects clips via click, Enter, and Space, blocks locked tracks, and updates live inspector', () => {
    const onSelectClip = vi.fn();
    const { container, rerender } = render(
      <MultiTrackTimeline
        tracks={BASE_TRACKS}
        durationSec={60}
        onSelectClip={onSelectClip}
        data-testid="timeline-select"
      />
    );

    const root = screen.getByTestId('timeline-select');
    const clip1 = container.querySelector('[data-clip-id="c1"]') as HTMLButtonElement;
    const clip2 = container.querySelector('[data-clip-id="c2"]') as HTMLButtonElement;
    const clip4 = container.querySelector('[data-clip-id="c4"]') as HTMLButtonElement;
    const lockedClip = container.querySelector('[data-clip-id="c5"]') as HTMLButtonElement;

    // Click selection
    fireEvent.click(clip1);
    expect(onSelectClip).toHaveBeenCalledWith(BASE_TRACKS[0]!.clips[0], BASE_TRACKS[0]);
    expect(clip1).toHaveAttribute('aria-pressed', 'true');
    expect(clip1).toHaveAttribute('data-selected', 'true');
    expect(root).toHaveAttribute('data-has-selection', 'true');
    expect(screen.getByTestId('timeline-inspector')).toHaveTextContent(
      'Camera A · Opening Shot · 0s–18s'
    );

    // Enter keyboard activation
    fireEvent.keyDown(clip2, { key: 'Enter' });
    expect(onSelectClip).toHaveBeenLastCalledWith(BASE_TRACKS[0]!.clips[1], BASE_TRACKS[0]);
    expect(clip2).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('timeline-inspector')).toHaveTextContent(
      'Camera A · Product Reveal · 20s–42.5s'
    );

    // Space keyboard activation
    fireEvent.keyDown(clip4, { key: ' ' });
    expect(onSelectClip).toHaveBeenLastCalledWith(BASE_TRACKS[2]!.clips[0], BASE_TRACKS[2]);
    expect(clip4).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('timeline-inspector')).toHaveTextContent(
      'Optical Grade · Caustic Bloom · 10s–22s'
    );

    // Unrelated key and IME composing keydown on clip are ignored
    const callsBeforeIgnored = onSelectClip.mock.calls.length;
    fireEvent.keyDown(clip1, { key: 'Tab' });
    const imeClipEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeClipEvent, 'isComposing', { value: true });
    clip1.dispatchEvent(imeClipEvent);
    expect(onSelectClip).toHaveBeenCalledTimes(callsBeforeIgnored);

    // Locked track clip cannot be selected via click or keyboard
    expect(lockedClip).toBeDisabled();
    expect(lockedClip).toHaveAttribute('data-locked', 'true');
    fireEvent.click(lockedClip);
    fireEvent.keyDown(lockedClip, { key: 'Enter' });
    fireEvent.keyDown(lockedClip, { key: ' ' });
    expect(onSelectClip).toHaveBeenCalledTimes(callsBeforeIgnored);

    // Controlled selectedClipId pins selection and handles unknown / null ID cleanly
    rerender(
      <MultiTrackTimeline
        tracks={BASE_TRACKS}
        durationSec={60}
        selectedClipId="c3"
        onSelectClip={onSelectClip}
        data-testid="timeline-select"
      />
    );
    expect(screen.getByTestId('timeline-inspector')).toHaveTextContent(
      'Master Audio · Ambient Score · 0s–54s'
    );
    fireEvent.click(clip1);
    expect(onSelectClip).toHaveBeenLastCalledWith(BASE_TRACKS[0]!.clips[0], BASE_TRACKS[0]);
    // Still shows controlled clip c3
    expect(screen.getByTestId('timeline-inspector')).toHaveTextContent(
      'Master Audio · Ambient Score · 0s–54s'
    );

    rerender(
      <MultiTrackTimeline
        tracks={BASE_TRACKS}
        durationSec={60}
        selectedClipId="nonexistent"
        data-testid="timeline-select"
      />
    );
    expect(root).not.toHaveAttribute('data-has-selection');
    expect(screen.getByTestId('timeline-inspector')).toHaveTextContent(
      'Playhead 00:00.00 / 01:00.00'
    );
  });

  it('toggles track Mute (M) and Lock (L) controls and syncs controlled prop updates', () => {
    const onToggleTrackMute = vi.fn();
    const onToggleTrackLock = vi.fn();
    const onSelectClip = vi.fn();

    const twoTracks: TimelineTrack[] = [
      {
        id: 'v1',
        name: 'Primary Video',
        kind: 'video',
        muted: false,
        locked: false,
        clips: [{ id: 'c1', label: 'Hero Clip', startSec: 0, durationSec: 10 }],
      },
      {
        id: 'a1',
        name: 'Voiceover',
        kind: 'audio',
        muted: false,
        locked: false,
        clips: [],
      },
    ];

    const { container, rerender } = render(
      <MultiTrackTimeline
        tracks={[twoTracks[0]!]}
        durationSec={30}
        defaultCurrentTimeSec={5}
        onToggleTrackMute={onToggleTrackMute}
        onToggleTrackLock={onToggleTrackLock}
        onSelectClip={onSelectClip}
      />
    );

    // Singular counts & singular active clip label
    expect(screen.getByTestId('timeline-counts')).toHaveTextContent('1 track · 1 clip');
    expect(screen.getByTestId('timeline-inspector')).toHaveTextContent('1 active clip');

    const muteBtn = screen.getByRole('button', { name: 'Mute Primary Video' });
    const lockBtn = screen.getByRole('button', { name: 'Lock Primary Video' });
    const lane = container.querySelector('[data-track-lane="v1"]') as HTMLDivElement;
    const clipBtn = container.querySelector('[data-clip-id="c1"]') as HTMLButtonElement;

    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(lockBtn).toHaveAttribute('aria-pressed', 'false');

    // Toggle mute ON then OFF then ON in uncontrolled mode
    fireEvent.click(muteBtn);
    expect(onToggleTrackMute).toHaveBeenCalledWith('v1', true);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(lane).toHaveAttribute('data-muted', 'true');
    expect(lane).toHaveClass('opacity-45');
    expect(screen.getByTestId('timeline-inspector')).toHaveTextContent('0 active clips');

    fireEvent.click(muteBtn);
    expect(onToggleTrackMute).toHaveBeenLastCalledWith('v1', false);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(muteBtn);
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');

    // Toggle lock ON -> disables clip
    fireEvent.click(lockBtn);
    expect(onToggleTrackLock).toHaveBeenCalledWith('v1', true);
    expect(lockBtn).toHaveAttribute('aria-pressed', 'true');
    expect(lane).toHaveAttribute('data-locked', 'true');
    expect(clipBtn).toBeDisabled();
    fireEvent.click(clipBtn);
    expect(onSelectClip).not.toHaveBeenCalled();

    // Parent updates v1 props to muted: true, locked: true while adding untouched a1 -> stale overrides prune cleanly
    const updatedTracksTrue: TimelineTrack[] = [
      { ...twoTracks[0]!, muted: true, locked: true },
      twoTracks[1]!,
    ];
    rerender(
      <MultiTrackTimeline
        tracks={updatedTracksTrue}
        durationSec={30}
        defaultCurrentTimeSec={5}
        onToggleTrackMute={onToggleTrackMute}
        onToggleTrackLock={onToggleTrackLock}
        onSelectClip={onSelectClip}
      />
    );
    expect(muteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(lockBtn).toHaveAttribute('aria-pressed', 'true');

    // Parent resets props back to false -> reflects fresh false props
    const updatedTracksFalse: TimelineTrack[] = [
      { ...twoTracks[0]!, muted: false, locked: false },
      twoTracks[1]!,
    ];
    rerender(
      <MultiTrackTimeline
        tracks={updatedTracksFalse}
        durationSec={30}
        defaultCurrentTimeSec={5}
        onToggleTrackMute={onToggleTrackMute}
        onToggleTrackLock={onToggleTrackLock}
        onSelectClip={onSelectClip}
      />
    );
    expect(muteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(lockBtn).toHaveAttribute('aria-pressed', 'false');
    expect(clipBtn).not.toBeDisabled();
  });

  it('derives duration from max clip end, clamps >= 1, formats sub-second and long ticks, and handles empty state', () => {
    const { container, rerender } = render(
      <MultiTrackTimeline tracks={[]} data-testid="timeline-empty-root" />
    );

    const root = screen.getByTestId('timeline-empty-root');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No timeline tracks configured');
    expect(screen.getByTestId('timeline-timecode')).toHaveTextContent('00:00.00 / 01:00.00');
    expect(screen.getByTestId('timeline-counts')).toHaveTextContent('0 tracks · 0 clips');

    // Derived duration from max clip end (45s)
    rerender(
      <MultiTrackTimeline
        tracks={[
          {
            id: 't1',
            name: 'Video 1',
            kind: 'video',
            clips: [{ id: 'c1', label: 'Main', startSec: 15, durationSec: 30 }],
          },
        ]}
      />
    );
    expect(screen.getByTestId('timeline-timecode')).toHaveTextContent('00:00.00 / 00:45.00');

    // Tracks with zero clips default duration to 60s
    rerender(
      <MultiTrackTimeline
        tracks={[{ id: 't-empty', name: 'Empty Audio', kind: 'audio', clips: [] }]}
      />
    );
    expect(screen.getByTestId('timeline-timecode')).toHaveTextContent('00:00.00 / 01:00.00');

    // Short clip < 1s clamps derived duration to >= 1s and renders sub-second ruler label (00:00.5)
    rerender(
      <MultiTrackTimeline
        tracks={[
          {
            id: 't-short',
            name: 'Flash FX',
            kind: 'effect',
            clips: [{ id: 'c-short', label: 'Spark', startSec: 0, durationSec: 0.4 }],
          },
        ]}
      />
    );
    expect(screen.getByTestId('timeline-timecode')).toHaveTextContent('00:00.00 / 00:01.00');
    expect(screen.getByText('00:00.5')).toBeInTheDocument();

    // Very long duration (86400s) uses fallback tick spacing without hanging
    rerender(
      <MultiTrackTimeline
        durationSec={86400}
        tracks={[
          {
            id: 't-long',
            name: 'Broadcast Feed',
            kind: 'video',
            clips: [{ id: 'c-long', label: '24h Stream', startSec: 0, durationSec: 3600 }],
          },
        ]}
      />
    );
    expect(container.querySelectorAll('[data-ruler-tick]').length).toBeLessThanOrEqual(65);
  });

  it('defends against adversarial numeric inputs, duplicates, blank labels, and XSS payloads', () => {
    const xss = '<script>window.__timelineXss=1</script><img src=x onerror=alert(1)>';
    const adversarialClips: ReadonlyArray<TimelineClip> = [
      { id: 'bad1', label: '   ', startSec: -20, durationSec: -5 },
      { id: 'bad1', label: 'Duplicate Clip Ignored', startSec: 5, durationSec: 5 },
      { id: 'bad2', label: xss, startSec: Number.NaN, durationSec: Number.POSITIVE_INFINITY },
      { id: 'beyond', label: 'Past End', startSec: 999, durationSec: 10 },
    ];
    const adversarialTracks: ReadonlyArray<TimelineTrack> = [
      { id: 'dup', name: '   ', kind: 'video', clips: adversarialClips },
      { id: 'dup', name: 'Duplicate Track Ignored', kind: 'audio', clips: [] },
      { id: 'xss-track', name: xss, kind: 'subtitle', clips: [] },
    ];

    const { rerender } = render(
      <MultiTrackTimeline
        title={xss}
        tracks={adversarialTracks}
        durationSec={-10}
        defaultCurrentTimeSec={Number.NaN}
      />
    );

    // Negative durationSec clamped to 1s; NaN time clamped to 0s
    expect(screen.getByTestId('timeline-timecode')).toHaveTextContent('00:00.00 / 00:01.00');

    // Duplicates dropped safely
    expect(screen.queryByText('Duplicate Track Ignored')).not.toBeInTheDocument();
    expect(screen.queryByText('Duplicate Clip Ignored')).not.toBeInTheDocument();

    // Blank names fall back cleanly
    expect(screen.getByText('Untitled Track')).toBeInTheDocument();
    expect(screen.getByText('Untitled Clip')).toBeInTheDocument();

    // XSS renders strictly as literal text, never as executable script
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getAllByText(xss).length).toBeGreaterThanOrEqual(3);

    // Non-finite durationSec falls back to derived clip duration
    rerender(
      <MultiTrackTimeline
        tracks={[
          {
            id: 'v1',
            name: 'Safe Track',
            kind: 'video',
            clips: [{ id: 'c1', label: 'Safe Clip', startSec: 0, durationSec: 25 }],
          },
        ]}
        durationSec={Number.NaN}
        currentTimeSec={Number.POSITIVE_INFINITY}
      />
    );
    expect(screen.getByTestId('timeline-timecode')).toHaveTextContent('00:00.00 / 00:25.00');
  });
});
