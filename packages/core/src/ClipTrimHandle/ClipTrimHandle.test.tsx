import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ClipTrimHandle,
  type ClipTone,
  type ClipTrimState,
} from './index';

function mockTrackRect(track: HTMLElement, left: number, width: number) {
  Object.defineProperty(track, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left,
      right: left + width,
      top: 0,
      bottom: 96,
      width,
      height: 96,
      x: left,
      y: 0,
      toJSON: () => ({}),
    }),
  });
}

describe('ClipTrimHandle', () => {
  it('renders prism-slab inspector, dimmed source regions, SVG fade curves, quad ARIA sliders, telemetry well, theme overrides, all 5 tones, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: {
            ClipTrimHandle: { className: 'theme-clip', style: { maxWidth: '640px' } },
          },
        }}
      >
        <ClipTrimHandle
          ref={ref}
          label="A004_OpticalIntro_4K.mov"
          totalDurationSec={30}
          defaultInSec={3}
          defaultOutSec={25}
          defaultFadeInSec={2}
          defaultFadeOutSec={2.5}
          tone="primary"
          className="local-clip"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="clip-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('clip-root');
    const headDim = screen.getByTestId('clip-trim-head-dim');
    const tailDim = screen.getByTestId('clip-trim-tail-dim');
    const body = screen.getByTestId('clip-trim-body');
    const inHandle = screen.getByRole('slider', { name: 'Trim clip start' });
    const outHandle = screen.getByRole('slider', { name: 'Trim clip end' });
    const fadeInHandle = screen.getByRole('slider', { name: 'Adjust fade in' });
    const fadeOutHandle = screen.getByRole('slider', { name: 'Adjust fade out' });

    expect(ClipTrimHandle.displayName).toBe('ClipTrimHandle');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('prism-slab', 'refractor-clip-trim-handle', 'theme-clip', 'local-clip');
    expect(root).toHaveStyle({ maxWidth: '640px' });
    expect(root).toHaveAttribute('data-tone', 'primary');
    expect(root).toHaveAttribute('data-tool', 'select');

    expect(screen.getByTestId('clip-trim-label')).toHaveTextContent('A004_OpticalIntro_4K.mov');
    expect(screen.getByTestId('clip-trim-duration-badge')).toHaveTextContent('22s');
    expect(screen.getByTestId('clip-trim-segments-badge')).toHaveTextContent('1 segment');
    expect(screen.getByTestId('clip-trim-tool-toggle')).toHaveAttribute('aria-pressed', 'false');

    // Dimmed source head/tail and active body geometry
    expect(headDim).toHaveStyle({ width: '10%' });
    expect(tailDim.style.left).toMatch(/^83\.333/);
    expect(body).toHaveClass('prism-crystal');
    expect(body.style.borderColor).toBe('var(--prism-primary-main)');

    // SVG fade ramps rendered with crisp strokes
    expect(screen.getByTestId('clip-trim-fade-in-ramp')).toBeInTheDocument();
    expect(screen.getByTestId('clip-trim-fade-out-ramp')).toBeInTheDocument();
    expect(screen.getByTestId('clip-trim-fade-in-curve')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('clip-trim-fade-out-curve')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );

    // Quad ARIA sliders
    expect(inHandle).toHaveAttribute('aria-valuemin', '0');
    expect(inHandle).toHaveAttribute('aria-valuemax', '24');
    expect(inHandle).toHaveAttribute('aria-valuenow', '3');
    expect(inHandle).toHaveAttribute('aria-valuetext', '3s');
    expect(inHandle).toHaveAttribute('tabindex', '0');

    expect(outHandle).toHaveAttribute('aria-valuemin', '4');
    expect(outHandle).toHaveAttribute('aria-valuemax', '30');
    expect(outHandle).toHaveAttribute('aria-valuenow', '25');
    expect(outHandle).toHaveAttribute('aria-valuetext', '25s');

    expect(fadeInHandle).toHaveAttribute('aria-valuemin', '0');
    expect(fadeInHandle).toHaveAttribute('aria-valuemax', '19.5');
    expect(fadeInHandle).toHaveAttribute('aria-valuenow', '2');
    expect(fadeInHandle).toHaveAttribute('aria-valuetext', '2s');

    expect(fadeOutHandle).toHaveAttribute('aria-valuemin', '0');
    expect(fadeOutHandle).toHaveAttribute('aria-valuemax', '20');
    expect(fadeOutHandle).toHaveAttribute('aria-valuenow', '2.5');
    expect(fadeOutHandle).toHaveAttribute('aria-valuetext', '2.5s');

    // Recessed prism-well telemetry readout
    const telemetry = screen.getByTestId('clip-trim-telemetry');
    expect(telemetry).toHaveClass('prism-well');
    expect(screen.getByTestId('clip-trim-telemetry-in')).toHaveTextContent('3s');
    expect(screen.getByTestId('clip-trim-telemetry-out')).toHaveTextContent('25s');
    expect(screen.getByTestId('clip-trim-telemetry-dur')).toHaveTextContent('22s');
    expect(screen.getByTestId('clip-trim-telemetry-fade-in')).toHaveTextContent('2s');
    expect(screen.getByTestId('clip-trim-telemetry-fade-out')).toHaveTextContent('2.5s');
    expect(screen.getByTestId('clip-trim-telemetry-splits')).toHaveTextContent('0');

    // Verify all 5 semantic optical tones map exclusively to --prism-* CSS vars
    const expectedTones: ReadonlyArray<[ClipTone, string]> = [
      ['secondary', 'var(--prism-secondary-main)'],
      ['emerald', 'var(--prism-success-main)'],
      ['amber', 'var(--prism-warning-main)'],
      ['rose', 'var(--prism-error-main)'],
    ];
    for (const [tone, token] of expectedTones) {
      rerender(
        <ClipTrimHandle label="A004_OpticalIntro_4K.mov" tone={tone} data-testid="clip-root" />
      );
      expect(screen.getByTestId('clip-root')).toHaveAttribute('data-tone', tone);
      expect(screen.getByTestId('clip-trim-body').style.borderColor).toBe(token);
    }
  });

  it('supports keyboard stepping across all four handles with fine/page/home/end bounds, fade coupling, and IME safety', () => {
    const onChange = vi.fn<(state: ClipTrimState) => void>();

    render(
      <ClipTrimHandle
        label="B012_Interview.mov"
        totalDurationSec={20}
        defaultInSec={4}
        defaultOutSec={14}
        defaultFadeInSec={3}
        defaultFadeOutSec={4}
        minClipSec={2}
        onChange={onChange}
      />
    );

    const inHandle = screen.getByRole('slider', { name: 'Trim clip start' });
    const outHandle = screen.getByRole('slider', { name: 'Trim clip end' });
    const fadeInHandle = screen.getByRole('slider', { name: 'Adjust fade in' });
    const fadeOutHandle = screen.getByRole('slider', { name: 'Adjust fade out' });

    // In-point: ArrowRight (+0.5), ArrowUp (+0.5), Shift+ArrowRight (+0.1), ArrowLeft (-0.5), ArrowDown (-0.5), PageUp (+2), PageDown (-2)
    fireEvent.keyDown(inHandle, { key: 'ArrowRight' });
    expect(inHandle).toHaveAttribute('aria-valuenow', '4.5');
    fireEvent.keyDown(inHandle, { key: 'ArrowUp' });
    expect(inHandle).toHaveAttribute('aria-valuenow', '5');
    fireEvent.keyDown(inHandle, { key: 'ArrowRight', shiftKey: true });
    expect(inHandle).toHaveAttribute('aria-valuenow', '5.1');
    fireEvent.keyDown(inHandle, { key: 'ArrowLeft' });
    expect(inHandle).toHaveAttribute('aria-valuenow', '4.6');
    fireEvent.keyDown(inHandle, { key: 'ArrowDown' });
    expect(inHandle).toHaveAttribute('aria-valuenow', '4.1');
    fireEvent.keyDown(inHandle, { key: 'PageUp' });
    expect(inHandle).toHaveAttribute('aria-valuenow', '6.1');
    fireEvent.keyDown(inHandle, { key: 'PageDown' });
    expect(inHandle).toHaveAttribute('aria-valuenow', '4.1');

    // Home -> 0, End -> outSec - minClipSec (14 - 2 = 12), which clamps fades to fit 2s duration!
    fireEvent.keyDown(inHandle, { key: 'Home' });
    expect(inHandle).toHaveAttribute('aria-valuenow', '0');
    // Pushing further left at 0 does not emit duplicate change
    const callsAtZero = onChange.mock.calls.length;
    fireEvent.keyDown(inHandle, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledTimes(callsAtZero);

    fireEvent.keyDown(inHandle, { key: 'End' });
    expect(inHandle).toHaveAttribute('aria-valuenow', '12');
    // Duration is now 2s; fadeIn clamped to 2s and fadeOut clamped to 0s so fadeIn + fadeOut <= 2s
    expect(fadeInHandle).toHaveAttribute('aria-valuenow', '2');
    expect(fadeOutHandle).toHaveAttribute('aria-valuenow', '0');
    expect(fadeInHandle).toHaveClass('z-40');
    expect(screen.queryByTestId('clip-trim-fade-out-ramp')).toBeNull();

    // Expand out-point to End (20s), then back to Home (inSec + minClip = 14s), then 18s
    fireEvent.keyDown(outHandle, { key: 'End' });
    expect(outHandle).toHaveAttribute('aria-valuenow', '20');
    fireEvent.keyDown(outHandle, { key: 'Home' });
    expect(outHandle).toHaveAttribute('aria-valuenow', '14');
    fireEvent.keyDown(outHandle, { key: 'PageUp' });
    fireEvent.keyDown(outHandle, { key: 'PageUp' });
    expect(outHandle).toHaveAttribute('aria-valuenow', '18'); // clip [12..18], dur=6s

    // Fade-in Home (0) hides ramp; End hits max (6 - 0 = 6); back down to 3
    fireEvent.keyDown(fadeInHandle, { key: 'Home' });
    expect(fadeInHandle).toHaveAttribute('aria-valuenow', '0');
    expect(screen.queryByTestId('clip-trim-fade-in-ramp')).toBeNull();
    fireEvent.keyDown(fadeInHandle, { key: 'End' });
    expect(fadeInHandle).toHaveAttribute('aria-valuenow', '6');
    fireEvent.keyDown(fadeInHandle, { key: 'PageDown' });
    fireEvent.keyDown(fadeInHandle, { key: 'ArrowLeft' });
    fireEvent.keyDown(fadeInHandle, { key: 'ArrowLeft' });
    expect(fadeInHandle).toHaveAttribute('aria-valuenow', '3');

    // Fade-out End stops cleanly at dur - fadeIn (6 - 3 = 3), never overlapping fade-in!
    fireEvent.keyDown(fadeOutHandle, { key: 'End' });
    expect(fadeOutHandle).toHaveAttribute('aria-valuenow', '3');
    fireEvent.keyDown(fadeOutHandle, { key: 'ArrowRight' }); // clamped at 3
    expect(fadeOutHandle).toHaveAttribute('aria-valuenow', '3');
    fireEvent.keyDown(fadeOutHandle, { key: 'Home' });
    expect(fadeOutHandle).toHaveAttribute('aria-valuenow', '0');

    // Unrelated key and IME composing event are safely ignored
    const callsBeforeIgnore = onChange.mock.calls.length;
    fireEvent.keyDown(inHandle, { key: 'Enter' });
    fireEvent.keyDown(inHandle, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(fadeOutHandle, { key: 'ArrowUp', isComposing: true });
    expect(onChange).toHaveBeenCalledTimes(callsBeforeIgnore);
  });

  it('supports window pointer dragging on all 4 handles with clamping, zero-width fallback, pointercancel, and unmount cleanup', () => {
    const onChange = vi.fn<(state: ClipTrimState) => void>();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount, rerender } = render(
      <ClipTrimHandle
        label="C008_DroneReveal.mov"
        totalDurationSec={30}
        defaultInSec={3}
        defaultOutSec={25}
        defaultFadeInSec={2}
        defaultFadeOutSec={2.5}
        minClipSec={2}
        onChange={onChange}
        data-testid="ptr-clip"
      />
    );

    const root = screen.getByTestId('ptr-clip');
    const track = screen.getByTestId('clip-trim-track');
    const inHandle = screen.getByRole('slider', { name: 'Trim clip start' });
    const outHandle = screen.getByRole('slider', { name: 'Trim clip end' });
    const fadeInHandle = screen.getByRole('slider', { name: 'Adjust fade in' });
    const fadeOutHandle = screen.getByRole('slider', { name: 'Adjust fade out' });

    // Zero-width track falls back without emitting NaN or calling onChange
    mockTrackRect(track, 0, 0);
    fireEvent.pointerDown(inHandle, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 90, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 90, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();

    // 300px wide track starting at x=100 => 10px per second (100..400 => 0..30s)
    mockTrackRect(track, 100, 300);

    // Non-primary mouse button (right click) ignored
    fireEvent.pointerDown(inHandle, { clientX: 160, button: 2, pointerId: 2 });
    expect(root).not.toHaveAttribute('data-dragging');
    expect(onChange).not.toHaveBeenCalled();

    // Drag In-Point without explicit pointerId (defaults to 0)
    fireEvent.pointerDown(inHandle, { clientX: 160 }); // 6s
    expect(root).toHaveAttribute('data-dragging', 'true');
    expect(inHandle).toHaveAttribute('data-dragging', 'true');
    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));
    expect(onChange).toHaveBeenLastCalledWith({
      inSec: 6,
      outSec: 25,
      fadeInSec: 2,
      fadeOutSec: 2.5,
      splits: [],
    });

    // Stray pointerId is ignored on move and up
    fireEvent.pointerMove(window, { clientX: 250, pointerId: 99 });
    fireEvent.pointerUp(window, { clientX: 250, pointerId: 99 });
    expect(inHandle).toHaveAttribute('aria-valuenow', '6');
    expect(root).toHaveAttribute('data-dragging', 'true');

    // Drag In-Point past outSec - minClip clamps to 23s (duration=2s => fadeIn=2, fadeOut=0)
    fireEvent.pointerMove(window, { clientX: 390 }); // 29s -> clamped to 23s
    expect(onChange).toHaveBeenLastCalledWith({
      inSec: 23,
      outSec: 25,
      fadeInSec: 2,
      fadeOutSec: 0,
      splits: [],
    });
    // Drag In-Point to 0s boundary and back to 5s, then finish via pointerup
    fireEvent.pointerMove(window, { clientX: 100 }); // 0s
    expect(inHandle).toHaveAttribute('aria-valuenow', '0');
    fireEvent.pointerMove(window, { clientX: 150 }); // 5s
    fireEvent.pointerUp(window, { clientX: 150 });
    expect(root).not.toHaveAttribute('data-dragging');
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));

    // Drag Out-Point with explicit pointerId and end via pointercancel
    fireEvent.pointerDown(outHandle, { clientX: 350, pointerId: 4 }); // 25s (unchanged)
    fireEvent.pointerMove(window, { clientX: 300, pointerId: 4 }); // 20s
    expect(outHandle).toHaveAttribute('aria-valuenow', '20');
    fireEvent.pointerCancel(window, { clientX: 300, pointerId: 4 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Drag Fade-In handle: clip is [5..20] (dur=15, fadeOut=0) -> x=200 (10s) => fadeIn=5s
    fireEvent.pointerDown(fadeInHandle, { clientX: 170, pointerId: 5 }); // 7s -> fadeIn=2
    fireEvent.pointerMove(window, { clientX: 200, pointerId: 5 }); // 10s -> fadeIn=5
    expect(fadeInHandle).toHaveAttribute('aria-valuenow', '5');
    fireEvent.pointerUp(window, { clientX: 200, pointerId: 5 });

    // Drag Fade-Out handle: x=260 (16s) => out(20) - 16 = 4s; pushing far left clamps to 15 - 5 = 10s
    fireEvent.pointerDown(fadeOutHandle, { clientX: 260, pointerId: 6 }); // fadeOut=4
    expect(fadeOutHandle).toHaveAttribute('aria-valuenow', '4');
    fireEvent.pointerMove(window, { clientX: 120, pointerId: 6 }); // 2s -> out - 2 = 18 -> clamped to 10s
    expect(fadeOutHandle).toHaveAttribute('aria-valuenow', '10');
    fireEvent.pointerUp(window, { clientX: 120, pointerId: 6 });

    // Disabling mid-drag detaches window listeners and clears dragging state
    fireEvent.pointerDown(inHandle, { clientX: 150, pointerId: 7 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    rerender(
      <ClipTrimHandle
        label="C008_DroneReveal.mov"
        totalDurationSec={30}
        defaultInSec={3}
        defaultOutSec={25}
        defaultFadeInSec={2}
        defaultFadeOutSec={2.5}
        minClipSec={2}
        disabled
        onChange={onChange}
        data-testid="ptr-clip"
      />
    );
    expect(root).not.toHaveAttribute('data-dragging');
    const callsWhenDisabled = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 180, pointerId: 7 });
    expect(onChange).toHaveBeenCalledTimes(callsWhenDisabled);

    // Re-enable, start drag, and unmount mid-drag -> cleans up listeners cleanly
    rerender(
      <ClipTrimHandle
        label="C008_DroneReveal.mov"
        totalDurationSec={30}
        defaultInSec={3}
        defaultOutSec={25}
        defaultFadeInSec={2}
        defaultFadeOutSec={2.5}
        minClipSec={2}
        onChange={onChange}
        data-testid="ptr-clip"
      />
    );
    fireEvent.pointerDown(screen.getByRole('slider', { name: 'Trim clip start' }), {
      clientX: 150,
      pointerId: 8,
    });
    removeSpy.mockClear();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('supports Razor Split mode (hover preview, canvas clicks, edge/duplicate guards), Split at Midpoint, split pruning on trim, and Reset', () => {
    const onChange = vi.fn<(state: ClipTrimState) => void>();
    const onSplit = vi.fn<(at: number, left: number, right: number) => void>();

    render(
      <ClipTrimHandle
        label="D001_HeroTitle.mov"
        totalDurationSec={30}
        defaultInSec={4}
        defaultOutSec={24}
        defaultFadeInSec={2}
        defaultFadeOutSec={2}
        onChange={onChange}
        onSplit={onSplit}
        data-testid="razor-clip"
      />
    );

    const root = screen.getByTestId('razor-clip');
    const track = screen.getByTestId('clip-trim-track');
    const body = screen.getByTestId('clip-trim-body');
    const toolToggle = screen.getByTestId('clip-trim-tool-toggle');
    const splitMidpointBtn = screen.getByTestId('clip-trim-split-midpoint');
    const resetBtn = screen.getByTestId('clip-trim-reset');

    // 300px track at x=0 => 10px per second (0..30s)
    mockTrackRect(track, 0, 300);

    // Clicking or hovering clip body in Select mode does not split or show preview
    fireEvent.pointerMove(body, { clientX: 140 });
    expect(screen.queryByTestId('clip-trim-razor-preview')).toBeNull();
    fireEvent.click(body, { clientX: 140 });
    expect(onSplit).not.toHaveBeenCalled();

    // Toggle into Razor Split mode
    fireEvent.click(toolToggle);
    expect(toolToggle).toHaveAttribute('aria-pressed', 'true');
    expect(toolToggle).toHaveTextContent('Razor Split');
    expect(root).toHaveAttribute('data-tool', 'razor');
    expect(body).toHaveAttribute('data-razor-ready', 'true');

    // Hover preview inside clip body, at edge (hidden), and leave (cleared)
    fireEvent.pointerMove(body, { clientX: 140 }); // 14s
    expect(screen.getByTestId('clip-trim-razor-preview')).toBeInTheDocument();
    fireEvent.pointerMove(body, { clientX: 40 }); // right on inSec=4s -> hidden
    expect(screen.queryByTestId('clip-trim-razor-preview')).toBeNull();
    fireEvent.pointerMove(body, { clientX: 150 });
    expect(screen.getByTestId('clip-trim-razor-preview')).toBeInTheDocument();
    fireEvent.pointerLeave(body);
    expect(screen.queryByTestId('clip-trim-razor-preview')).toBeNull();

    // Clicking on a handle in Razor mode stops propagation and does not split
    fireEvent.click(screen.getByRole('slider', { name: 'Trim clip start' }));
    expect(onSplit).not.toHaveBeenCalled();

    // Clicking at clip edge (4s) is ignored
    fireEvent.click(body, { clientX: 40 });
    expect(onSplit).not.toHaveBeenCalled();

    // Clicking inside clip body at 10s splits [4..24] into left=6s, right=14s
    fireEvent.click(body, { clientX: 100 });
    expect(onSplit).toHaveBeenLastCalledWith(10, 6, 14);
    expect(screen.getByTestId('clip-trim-segments-badge')).toHaveTextContent('2 segments');
    expect(screen.getByTestId('clip-trim-telemetry-splits')).toHaveTextContent('1');
    expect(screen.getAllByTestId('clip-trim-split-line')).toHaveLength(1);

    // Duplicate click right on existing cut (10s) is ignored
    fireEvent.click(body, { clientX: 100 });
    expect(onSplit).toHaveBeenCalledTimes(1);

    // Split at Midpoint splits longest segment [10..24] -> midpoint 17s (left=7, right=7)
    fireEvent.click(splitMidpointBtn);
    expect(onSplit).toHaveBeenLastCalledWith(17, 7, 7);
    expect(screen.getByTestId('clip-trim-segments-badge')).toHaveTextContent('3 segments');
    expect(screen.getByTestId('clip-trim-telemetry-splits')).toHaveTextContent('2');
    expect(screen.getAllByTestId('clip-trim-split-line')).toHaveLength(2);

    // Another Split at Midpoint exercises non-tail longest segment [10..17] -> midpoint 13.5s
    fireEvent.click(body, { clientX: 210 }); // splits [17..24] at 21s -> segments: [4..10](6), [10..17](7), [17..21](4), [21..24](3)
    expect(onSplit).toHaveBeenLastCalledWith(21, 4, 3);
    fireEvent.click(splitMidpointBtn); // longest is middle [10..17] -> midpoint 13.5s (left=3.5, right=3.5)
    expect(onSplit).toHaveBeenLastCalledWith(13.5, 3.5, 3.5);
    expect(screen.getByTestId('clip-trim-telemetry-splits')).toHaveTextContent('4');

    // Clicking clip body when track width is 0 safely no-ops
    mockTrackRect(track, 0, 0);
    const splitCallsBeforeZero = onSplit.mock.calls.length;
    fireEvent.click(body, { clientX: 120 });
    expect(onSplit).toHaveBeenCalledTimes(splitCallsBeforeZero);
    mockTrackRect(track, 0, 300);

    // Trimming out-point down to 16s prunes splits at 17s and 21s automatically
    const outHandle = screen.getByRole('slider', { name: 'Trim clip end' });
    fireEvent.pointerDown(outHandle, { clientX: 160, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 160, pointerId: 1 });
    expect(screen.getByTestId('clip-trim-telemetry-splits')).toHaveTextContent('2');
    expect(screen.getByTestId('clip-trim-segments-badge')).toHaveTextContent('3 segments');

    // Toggle back to Select mode clears razor hover preview and restores button label
    fireEvent.pointerMove(body, { clientX: 80 });
    expect(screen.getByTestId('clip-trim-razor-preview')).toBeInTheDocument();
    fireEvent.click(toolToggle);
    expect(toolToggle).toHaveAttribute('aria-pressed', 'false');
    expect(toolToggle).toHaveTextContent('Select');
    expect(screen.queryByTestId('clip-trim-razor-preview')).toBeNull();

    // Reset restores defaults and clears splits; second Reset is a clean no-op
    fireEvent.click(resetBtn);
    expect(onChange).toHaveBeenLastCalledWith({
      inSec: 4,
      outSec: 24,
      fadeInSec: 2,
      fadeOutSec: 2,
      splits: [],
    });
    expect(screen.getByTestId('clip-trim-telemetry-splits')).toHaveTextContent('0');
    expect(screen.getByTestId('clip-trim-segments-badge')).toHaveTextContent('1 segment');

    const callsAfterReset = onChange.mock.calls.length;
    fireEvent.click(resetBtn);
    expect(onChange).toHaveBeenCalledTimes(callsAfterReset);
  });

  it('supports fully controlled mode, ultra-narrow minClip disabling midpoint split, and adversarial prop sanitization', () => {
    function ControlledHarness() {
      const [clip, setClip] = useState<ClipTrimState>({
        inSec: 2,
        outSec: 18,
        fadeInSec: 1.5,
        fadeOutSec: 2,
        splits: [],
      });
      return (
        <ClipTrimHandle
          label="Controlled_Master.wav"
          totalDurationSec={20}
          inSec={clip.inSec}
          outSec={clip.outSec}
          fadeInSec={clip.fadeInSec}
          fadeOutSec={clip.fadeOutSec}
          onChange={setClip}
        />
      );
    }

    const { unmount } = render(<ControlledHarness />);
    const inHandle = screen.getByRole('slider', { name: 'Trim clip start' });
    expect(screen.getByTestId('clip-trim-telemetry-in')).toHaveTextContent('2s');
    fireEvent.keyDown(inHandle, { key: 'ArrowRight' });
    expect(screen.getByTestId('clip-trim-telemetry-in')).toHaveTextContent('2.5s');
    expect(screen.getByTestId('clip-trim-duration-badge')).toHaveTextContent('15.5s');
    unmount();

    // Adversarial: non-finite total, inverted/NaN/Infinity bounds, negative/huge fades, high-end pushback
    const { rerender } = render(
      <ClipTrimHandle
        label="Adversarial_NaN.mov"
        totalDurationSec={Number.NaN}
        minClipSec={Number.POSITIVE_INFINITY}
        inSec={Number.NaN}
        outSec={Number.POSITIVE_INFINITY}
        fadeInSec={-5}
        fadeOutSec={999}
      />
    );
    expect(screen.getByTestId('clip-trim-telemetry-in')).toHaveTextContent('0s');
    expect(screen.getByTestId('clip-trim-telemetry-out')).toHaveTextContent('30s');
    expect(screen.getByTestId('clip-trim-telemetry-fade-in')).toHaveTextContent('0s');
    expect(screen.getByTestId('clip-trim-telemetry-fade-out')).toHaveTextContent('30s');

    // Sub-minimum totalDurationSec clamped to 1s, inverted in/out with minClip pushback at high end
    rerender(
      <ClipTrimHandle
        label="Adversarial_Short.mov"
        totalDurationSec={-4}
        minClipSec={0.1}
        inSec={0.95}
        outSec={1}
        fadeInSec={0}
        fadeOutSec={0}
      />
    );
    expect(screen.getByTestId('clip-trim-telemetry-in')).toHaveTextContent('0.9s');
    expect(screen.getByTestId('clip-trim-telemetry-out')).toHaveTextContent('1s');
    expect(screen.getByTestId('clip-trim-telemetry-dur')).toHaveTextContent('0.1s');
    // Ultra-narrow 0.1s clip disables Split at Midpoint cleanly
    expect(screen.getByTestId('clip-trim-split-midpoint')).toBeDisabled();
  });

  it('blocks all interactions when disabled and safely renders XSS label payloads (negative & security tests)', () => {
    const onChange = vi.fn<(state: ClipTrimState) => void>();
    const onSplit = vi.fn<(at: number, left: number, right: number) => void>();
    const xssPayload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    render(
      <ClipTrimHandle
        label={xssPayload}
        disabled
        onChange={onChange}
        onSplit={onSplit}
        data-testid="disabled-clip"
      />
    );

    const root = screen.getByTestId('disabled-clip');
    const track = screen.getByTestId('clip-trim-track');
    const body = screen.getByTestId('clip-trim-body');
    const inHandle = screen.getByRole('slider', { name: 'Trim clip start' });
    const outHandle = screen.getByRole('slider', { name: 'Trim clip end' });
    const fadeInHandle = screen.getByRole('slider', { name: 'Adjust fade in' });
    const fadeOutHandle = screen.getByRole('slider', { name: 'Adjust fade out' });
    mockTrackRect(track, 0, 300);

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText(xssPayload)).toBeInTheDocument();

    for (const slider of [inHandle, outHandle, fadeInHandle, fadeOutHandle]) {
      expect(slider).toHaveAttribute('tabindex', '-1');
      expect(slider).toHaveAttribute('aria-disabled', 'true');
    }

    expect(screen.getByTestId('clip-trim-tool-toggle')).toBeDisabled();
    expect(screen.getByTestId('clip-trim-split-midpoint')).toBeDisabled();
    expect(screen.getByTestId('clip-trim-reset')).toBeDisabled();

    fireEvent.pointerDown(inHandle, { clientX: 80, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 120, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 120, pointerId: 1 });
    fireEvent.keyDown(inHandle, { key: 'ArrowRight' });
    fireEvent.keyDown(outHandle, { key: 'ArrowLeft' });
    fireEvent.keyDown(fadeInHandle, { key: 'ArrowRight' });
    fireEvent.keyDown(fadeOutHandle, { key: 'ArrowRight' });
    fireEvent.pointerMove(body, { clientX: 140 });
    fireEvent.click(body, { clientX: 140 });

    expect(onChange).not.toHaveBeenCalled();
    expect(onSplit).not.toHaveBeenCalled();
    expect(screen.queryByTestId('clip-trim-razor-preview')).toBeNull();
  });
});
