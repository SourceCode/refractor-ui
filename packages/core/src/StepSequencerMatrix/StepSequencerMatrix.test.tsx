import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  StepSequencerMatrix,
  type SequencerPresetIdMap,
  type SequencerTrackSpec,
  type SequencerTrackToneMap,
} from './index';

function fireComposingKeyDown(element: HTMLElement, key: string) {
  const event = createEvent.keyDown(element, { key });
  Object.defineProperty(event, 'isComposing', { value: true });
  fireEvent(element, event);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('StepSequencerMatrix', () => {
  it('renders default 4x16 optical-glass House groove, downbeats, overflow-x-auto wrapper, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    const toneMap: SequencerTrackToneMap = {
      primary: true,
      amber: true,
      info: true,
      emerald: true,
    };
    const presetMap: SequencerPresetIdMap = {
      house: true,
      breakbeat: true,
      clear: true,
    };
    expect(Object.keys(toneMap)).toHaveLength(4);
    expect(Object.keys(presetMap)).toHaveLength(3);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            StepSequencerMatrix: {
              className: 'theme-sequencer-slab',
              style: { maxWidth: '960px' },
            },
          },
        }}
      >
        <StepSequencerMatrix
          ref={ref}
          className="local-sequencer"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="seq-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('seq-root');
    expect(StepSequencerMatrix.displayName).toBe('StepSequencerMatrix');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-step-sequencer-matrix',
      'prism-slab',
      'theme-sequencer-slab',
      'local-sequencer'
    );
    expect(root).toHaveStyle({ maxWidth: '960px', marginTop: '8px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Step Sequencer Matrix');
    expect(root).toHaveAttribute('data-bpm', '120');
    expect(root).toHaveAttribute('data-preset', 'house');
    expect(root).not.toHaveAttribute('data-playing');

    expect(screen.getByTestId('step-sequencer-title')).toHaveTextContent('Step Sequencer Matrix');
    expect(screen.getByTestId('step-sequencer-transport')).toHaveTextContent('Play');
    expect(screen.getByTestId('step-sequencer-transport')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('step-sequencer-step-readout')).toHaveTextContent('Step 01/16');
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('120 BPM');
    expect(screen.getByRole('slider', { name: 'Tempo BPM' })).toHaveValue('120');

    // Matrix wrapped directly inside overflow-x-auto for mobile safety
    const grid = screen.getByRole('grid', { name: 'Step Sequencer Matrix pattern grid' });
    expect(grid.parentElement).toHaveClass('overflow-x-auto');

    // 16 step headers (01..16) with downbeat markers on 01, 05, 09, 13
    for (let stepIdx = 0; stepIdx < 16; stepIdx += 1) {
      const header = screen.getByTestId(`step-header-${stepIdx}`);
      expect(header).toHaveTextContent(String(stepIdx + 1).padStart(2, '0'));
      if (stepIdx % 4 === 0) {
        expect(header).toHaveAttribute('data-downbeat', 'true');
      } else {
        expect(header).not.toHaveAttribute('data-downbeat');
      }
      expect(header).not.toHaveAttribute('data-playhead');
    }

    // 4 default tracks x 16 step pads = 64 pads
    expect(screen.getByTestId('step-track-0')).toHaveTextContent('Kick');
    expect(screen.getByTestId('step-track-1')).toHaveTextContent('Snare');
    expect(screen.getByTestId('step-track-2')).toHaveTextContent('Hi-Hat');
    expect(screen.getByTestId('step-track-3')).toHaveTextContent('Synth');

    // Verify classic 4-on-the-floor House kick on steps 1, 5, 9, 13
    expect(screen.getByRole('button', { name: 'Kick step 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Kick step 2' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Kick step 5' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Kick step 9' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Kick step 13' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Snare step 5' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hi-Hat step 3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Synth step 1' })).toHaveAttribute('aria-pressed', 'true');

    // Preset highlight & polite status strip
    expect(screen.getByTestId('step-sequencer-preset-house')).toHaveAttribute('data-active', 'true');
    const status = screen.getByTestId('step-sequencer-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Stopped · 120 BPM · Step 01/16');
    expect(screen.getByTestId('step-sequencer-summary')).toHaveTextContent('4/4 tracks · 16 steps lit');

    // Enforce zero raw color literals in rendered markup
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(root.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('toggles step pads, mutes/unmutes tracks, and clears individual tracks with polite announcements', () => {
    const onPatternChange = vi.fn<(tracks: ReadonlyArray<SequencerTrackSpec>) => void>();

    render(<StepSequencerMatrix onPatternChange={onPatternChange} data-testid="edit-seq" />);

    const root = screen.getByTestId('edit-seq');
    const status = screen.getByTestId('step-sequencer-status');

    // Toggle Kick step 1 off
    const kickStep1 = screen.getByRole('button', { name: 'Kick step 1' });
    fireEvent.click(kickStep1);
    expect(kickStep1).toHaveAttribute('aria-pressed', 'false');
    expect(root).not.toHaveAttribute('data-preset');
    expect(status).toHaveTextContent('Kick step 1 cleared');
    expect(onPatternChange).toHaveBeenCalledTimes(1);
    expect(onPatternChange.mock.calls[0]?.[0][0]?.steps[0]).toBe(false);

    // Toggle Kick step 2 on
    const kickStep2 = screen.getByRole('button', { name: 'Kick step 2' });
    fireEvent.click(kickStep2);
    expect(kickStep2).toHaveAttribute('aria-pressed', 'true');
    expect(status).toHaveTextContent('Kick step 2 active');
    expect(onPatternChange).toHaveBeenCalledTimes(2);
    expect(onPatternChange.mock.calls[1]?.[0][0]?.steps[1]).toBe(true);

    // Mute and unmute Kick
    const muteKick = screen.getByRole('button', { name: 'Mute Kick' });
    expect(muteKick).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(muteKick);
    expect(muteKick).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('step-track-0')).toHaveAttribute('data-muted', 'true');
    expect(screen.getByTestId('step-pad-0-1')).toHaveAttribute('data-muted', 'true');
    expect(status).toHaveTextContent('Muted Kick');
    expect(screen.getByTestId('step-sequencer-summary')).toHaveTextContent('3/4 tracks · 16 steps lit');

    fireEvent.click(muteKick);
    expect(muteKick).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('step-track-0')).not.toHaveAttribute('data-muted');
    expect(status).toHaveTextContent('Unmuted Kick');

    // Clear Snare track only
    const clearSnare = screen.getByRole('button', { name: 'Clear Snare' });
    fireEvent.click(clearSnare);
    expect(screen.getByRole('button', { name: 'Snare step 5' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Snare step 13' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Kick step 5' })).toHaveAttribute('aria-pressed', 'true');
    expect(status).toHaveTextContent('Cleared Snare track');
    expect(screen.getByTestId('step-sequencer-summary')).toHaveTextContent('4/4 tracks · 14 steps lit');
  });

  it('switches between House, Breakbeat, and Clear presets and updates active preset markers', () => {
    const onPatternChange = vi.fn<(tracks: ReadonlyArray<SequencerTrackSpec>) => void>();

    render(<StepSequencerMatrix onPatternChange={onPatternChange} data-testid="preset-seq" />);

    const root = screen.getByTestId('preset-seq');
    const status = screen.getByTestId('step-sequencer-status');

    // Mute Kick first so we also verify loading Breakbeat restores active unmuted tracks
    fireEvent.click(screen.getByRole('button', { name: 'Mute Kick' }));
    expect(screen.getByRole('button', { name: 'Mute Kick' })).toHaveAttribute('aria-pressed', 'true');

    // Load Breakbeat preset
    fireEvent.click(screen.getByRole('button', { name: 'Breakbeat' }));
    expect(root).toHaveAttribute('data-preset', 'breakbeat');
    expect(screen.getByTestId('step-sequencer-preset-breakbeat')).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('button', { name: 'Mute Kick' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Kick step 7' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Kick step 5' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Snare step 8' })).toHaveAttribute('aria-pressed', 'true');
    expect(status).toHaveTextContent('Loaded Breakbeat preset');

    // Load Clear preset
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(root).toHaveAttribute('data-preset', 'clear');
    expect(screen.getByTestId('step-sequencer-preset-clear')).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('button', { name: 'Kick step 1' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('step-sequencer-summary')).toHaveTextContent('4/4 tracks · 0 steps lit');
    expect(status).toHaveTextContent('Cleared all sequencer tracks');

    // Reload House preset
    fireEvent.click(screen.getByRole('button', { name: 'House' }));
    expect(root).toHaveAttribute('data-preset', 'house');
    expect(screen.getByTestId('step-sequencer-preset-house')).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('button', { name: 'Kick step 5' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('step-sequencer-summary')).toHaveTextContent('4/4 tracks · 16 steps lit');
    expect(status).toHaveTextContent('Loaded House preset');
  });

  it('advances step clock cyclically 0..15, excludes muted tracks from onStepTick, updates rate on BPM change, and resets on Stop', () => {
    vi.useFakeTimers();
    const onStepTick = vi.fn<(stepIndex: number, activeTrackIds: ReadonlyArray<string>) => void>();

    render(<StepSequencerMatrix defaultBpm={120} onStepTick={onStepTick} data-testid="clock-seq" />);

    const root = screen.getByTestId('clock-seq');
    const transport = screen.getByTestId('step-sequencer-transport');
    const stepReadout = screen.getByTestId('step-sequencer-step-readout');
    const bpmSlider = screen.getByRole('slider', { name: 'Tempo BPM' });
    const status = screen.getByTestId('step-sequencer-status');

    // Stopped -> timers do nothing
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onStepTick).not.toHaveBeenCalled();

    // Start transport (120 BPM => 60000 / 120 / 4 = 125ms per 16th note)
    fireEvent.click(transport);
    expect(root).toHaveAttribute('data-playing', 'true');
    expect(transport).toHaveTextContent('Stop');
    expect(transport).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('step-header-0')).toHaveAttribute('data-playhead', 'true');
    expect(screen.getByTestId('step-pad-0-0')).toHaveAttribute('data-playhead', 'true');
    expect(status).toHaveTextContent('Playing at 120 BPM · Step 01/16');

    // Step 1 (index 1 -> Step 02/16, no active House tracks)
    act(() => {
      vi.advanceTimersByTime(125);
    });
    expect(stepReadout).toHaveTextContent('Step 02/16');
    expect(onStepTick).toHaveBeenLastCalledWith(1, []);

    // Step 2 (index 2 -> Step 03/16, Hi-Hat active)
    act(() => {
      vi.advanceTimersByTime(125);
    });
    expect(stepReadout).toHaveTextContent('Step 03/16');
    expect(onStepTick).toHaveBeenLastCalledWith(2, ['hi-hat']);

    // Step 3 (index 3 -> Step 04/16, Synth active) & Step 4 (index 4 -> Step 05/16, Kick + Snare)
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(stepReadout).toHaveTextContent('Step 05/16');
    expect(screen.getByTestId('step-header-4')).toHaveAttribute('data-playhead', 'true');
    expect(onStepTick).toHaveBeenLastCalledWith(4, ['kick', 'snare']);

    // Mute Kick mid-playback and verify muted track is excluded at downbeat step 8 (Step 09/16)
    fireEvent.click(screen.getByRole('button', { name: 'Mute Kick' }));
    act(() => {
      vi.advanceTimersByTime(125 * 4);
    });
    expect(stepReadout).toHaveTextContent('Step 09/16');
    expect(screen.getByTestId('step-pad-0-8')).toHaveAttribute('data-playhead', 'true');
    expect(screen.getByTestId('step-pad-0-8')).toHaveAttribute('data-muted', 'true');
    expect(onStepTick).toHaveBeenLastCalledWith(8, []);

    // Advance 8 more steps (indices 9..15 then cyclic wrap back to 0 -> Step 01/16)
    act(() => {
      vi.advanceTimersByTime(125 * 8);
    });
    expect(stepReadout).toHaveTextContent('Step 01/16');
    // At index 0, Kick is muted so only Synth fires
    expect(onStepTick).toHaveBeenLastCalledWith(0, ['synth']);

    // Change BPM to 150 while playing (60000 / 150 / 4 = 100ms per step)
    const callsBeforeBpmChange = onStepTick.mock.calls.length;
    fireEvent.change(bpmSlider, { target: { value: '150' } });
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('150 BPM');
    expect(status).toHaveTextContent('Tempo set to 150 BPM');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onStepTick).toHaveBeenCalledTimes(callsBeforeBpmChange + 1);
    expect(stepReadout).toHaveTextContent('Step 02/16');

    // Stop transport -> clears interval and resets playhead to Step 01/16
    const callsBeforeStop = onStepTick.mock.calls.length;
    fireEvent.click(transport);
    expect(root).not.toHaveAttribute('data-playing');
    expect(transport).toHaveTextContent('Play');
    expect(transport).toHaveAttribute('aria-pressed', 'false');
    expect(stepReadout).toHaveTextContent('Step 01/16');
    expect(status).toHaveTextContent('Stopped · Playhead reset to Step 01/16');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onStepTick).toHaveBeenCalledTimes(callsBeforeStop);
  });

  it('strictly clears step clock interval on unmount and when disabled dynamically while playing', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(window, 'clearInterval');
    const onStepTick = vi.fn<(stepIndex: number, activeTrackIds: ReadonlyArray<string>) => void>();

    const { unmount } = render(
      <StepSequencerMatrix defaultBpm={120} onStepTick={onStepTick} />
    );

    fireEvent.click(screen.getByTestId('step-sequencer-transport'));
    act(() => {
      vi.advanceTimersByTime(125);
    });
    expect(onStepTick).toHaveBeenCalledTimes(1);

    const clearsBeforeUnmount = clearSpy.mock.calls.length;
    unmount();
    expect(clearSpy.mock.calls.length).toBeGreaterThan(clearsBeforeUnmount);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onStepTick).toHaveBeenCalledTimes(1);

    // Dynamic disabled transition halts running playback and clears interval
    const onStepTick2 = vi.fn<(stepIndex: number, activeTrackIds: ReadonlyArray<string>) => void>();
    const { rerender } = render(
      <StepSequencerMatrix defaultBpm={120} onStepTick={onStepTick2} />
    );

    fireEvent.click(screen.getByTestId('step-sequencer-transport'));
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onStepTick2).toHaveBeenCalledTimes(2);

    rerender(<StepSequencerMatrix defaultBpm={120} disabled onStepTick={onStepTick2} />);
    expect(screen.getByTestId('step-sequencer-transport')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('step-sequencer-step-readout')).toHaveTextContent('Step 01/16');
    expect(screen.getByTestId('step-sequencer-status')).toHaveTextContent(
      'Transport halted · Sequencer disabled'
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onStepTick2).toHaveBeenCalledTimes(2);
  });

  it('sanitizes NaN, Infinity, and out-of-bounds BPM values across default, controlled, and input changes', () => {
    const onBpmChange = vi.fn<(bpm: number) => void>();

    const { rerender } = render(
      <StepSequencerMatrix defaultBpm={Number.NaN} onBpmChange={onBpmChange} />
    );
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('120 BPM');

    // Out-of-range slider inputs clamp to [60..200]
    const slider = screen.getByRole('slider', { name: 'Tempo BPM' });
    fireEvent.change(slider, { target: { value: '260' } });
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('200 BPM');
    expect(onBpmChange).toHaveBeenLastCalledWith(200);

    fireEvent.change(slider, { target: { value: '20' } });
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('60 BPM');
    expect(onBpmChange).toHaveBeenLastCalledWith(60);

    // Non-numeric change on <input type="range"> sanitizes safely within [60..200] (HTML5 range midpoint 130)
    fireEvent.change(slider, { target: { value: 'not-a-number' } });
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('130 BPM');
    expect(onBpmChange).toHaveBeenLastCalledWith(130);

    // Uncontrolled low/high defaultBpm clamping
    const { unmount: unmountLow } = render(<StepSequencerMatrix defaultBpm={15} />);
    expect(screen.getAllByTestId('step-sequencer-bpm-readout')[1]).toHaveTextContent('60 BPM');
    unmountLow();

    const { unmount: unmountHigh } = render(<StepSequencerMatrix defaultBpm={999} />);
    expect(screen.getAllByTestId('step-sequencer-bpm-readout')[1]).toHaveTextContent('200 BPM');
    unmountHigh();

    // Controlled Infinity & out-of-bounds BPM values sanitize cleanly
    rerender(<StepSequencerMatrix defaultBpm={128} bpm={Number.POSITIVE_INFINITY} />);
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('128 BPM');

    rerender(<StepSequencerMatrix defaultBpm={Number.NEGATIVE_INFINITY} bpm={35} />);
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('60 BPM');

    rerender(<StepSequencerMatrix bpm={245} />);
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('200 BPM');

    rerender(<StepSequencerMatrix bpm={132.6} />);
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('133 BPM');
  });

  it('supports bounded IME-safe 2D keyboard navigation (Arrows, Space, Enter) across the 4x16 pad grid', () => {
    render(<StepSequencerMatrix />);

    const topLeft = screen.getByTestId('step-pad-0-0');
    const step01 = screen.getByTestId('step-pad-0-1');
    const step11 = screen.getByTestId('step-pad-1-1');
    const step10 = screen.getByTestId('step-pad-1-0');
    const bottomRight = screen.getByTestId('step-pad-3-15');

    // Focus top-left and verify upper/left boundary clamping
    topLeft.focus();
    expect(document.activeElement).toBe(topLeft);

    fireEvent.keyDown(topLeft, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(topLeft);

    fireEvent.keyDown(topLeft, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(topLeft);

    // Navigate Right -> Down -> Left -> Up
    fireEvent.keyDown(topLeft, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(step01);

    fireEvent.keyDown(step01, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(step11);

    fireEvent.keyDown(step11, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(step10);

    fireEvent.keyDown(step10, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(topLeft);

    // Verify lower/right boundary clamping at (3, 15)
    bottomRight.focus();
    fireEvent.keyDown(bottomRight, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(bottomRight);
    fireEvent.keyDown(bottomRight, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(bottomRight);

    // Space and Enter toggle the focused pad
    step01.focus();
    expect(step01).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(step01, { key: ' ' });
    expect(step01).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(step01, { key: 'Enter' });
    expect(step01).toHaveAttribute('aria-pressed', 'false');

    // IME composing keydown events are completely ignored
    fireComposingKeyDown(step01, 'Enter');
    fireComposingKeyDown(step01, 'ArrowRight');
    expect(step01).toHaveAttribute('aria-pressed', 'false');
    expect(document.activeElement).toBe(step01);

    // Unrelated keys do not alter focus or pad state
    fireEvent.keyDown(step01, { key: 'Tab' });
    expect(step01).toHaveAttribute('aria-pressed', 'false');
  });

  it('supports controlled tracks and controlled bpm round-trip synchronization', () => {
    const initialTracks: ReadonlyArray<SequencerTrackSpec> = [
      {
        id: 'bass',
        name: 'Sub Bass',
        tone: 'primary',
        muted: false,
        steps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      },
      {
        id: 'lead',
        name: 'Lead Arp',
        tone: 'emerald',
        muted: false,
        steps: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      },
    ];

    function ControlledSequencerHarness() {
      const [tracks, setTracks] = useState<ReadonlyArray<SequencerTrackSpec>>(initialTracks);
      const [bpm, setBpm] = useState<number>(128);

      return (
        <StepSequencerMatrix
          title="Modular Rack"
          tracks={tracks}
          bpm={bpm}
          onPatternChange={setTracks}
          onBpmChange={setBpm}
          data-testid="controlled-seq"
        />
      );
    }

    render(<ControlledSequencerHarness />);

    expect(screen.getByTestId('step-sequencer-title')).toHaveTextContent('Modular Rack');
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('128 BPM');
    expect(screen.getByRole('button', { name: 'Sub Bass step 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Lead Arp step 3' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Sub Bass step 2' }));
    expect(screen.getByRole('button', { name: 'Sub Bass step 2' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(screen.getByRole('slider', { name: 'Tempo BPM' }), {
      target: { value: '142' },
    });
    expect(screen.getByTestId('step-sequencer-bpm-readout')).toHaveTextContent('142 BPM');
  });

  it('blocks all interactive controls, keyboard events, and slider changes when disabled', () => {
    const onPatternChange = vi.fn<(tracks: ReadonlyArray<SequencerTrackSpec>) => void>();
    const onBpmChange = vi.fn<(bpm: number) => void>();
    const onStepTick = vi.fn<(stepIndex: number, activeTrackIds: ReadonlyArray<string>) => void>();

    render(
      <StepSequencerMatrix
        disabled
        onPatternChange={onPatternChange}
        onBpmChange={onBpmChange}
        onStepTick={onStepTick}
        data-testid="disabled-seq"
      />
    );

    const root = screen.getByTestId('disabled-seq');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('step-sequencer-transport')).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Tempo BPM' })).toBeDisabled();
    expect(screen.getByTestId('step-sequencer-preset-house')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mute Kick' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear Kick' })).toBeDisabled();
    expect(screen.getByTestId('step-pad-0-0')).toBeDisabled();

    fireEvent.click(screen.getByTestId('step-sequencer-transport'));
    fireEvent.click(screen.getByTestId('step-pad-0-0'));
    fireEvent.click(screen.getByRole('button', { name: 'Mute Kick' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Kick' }));
    fireEvent.click(screen.getByTestId('step-sequencer-preset-breakbeat'));
    fireEvent.change(screen.getByRole('slider', { name: 'Tempo BPM' }), {
      target: { value: '175' },
    });
    fireEvent.keyDown(screen.getByTestId('step-pad-0-0'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByTestId('step-pad-0-0'), { key: 'ArrowRight' });

    expect(onPatternChange).not.toHaveBeenCalled();
    expect(onBpmChange).not.toHaveBeenCalled();
    expect(onStepTick).not.toHaveBeenCalled();
  });

  it('normalizes malformed defaultTracks, duplicate IDs, blank titles/names, and empty tracks gracefully', () => {
    const malformedTracks: ReadonlyArray<SequencerTrackSpec> = [
      {
        id: 'dup',
        name: '  ',
        tone: 'primary',
        muted: false,
        steps: [true, false],
      },
      {
        id: 'dup',
        name: 'Lead',
        tone: 'amber',
        muted: true,
        steps: Array.from({ length: 20 }, () => true),
      },
      {
        id: '   ',
        name: 'Perc',
        tone: 'info',
        muted: false,
        steps: [],
      },
    ];

    const { rerender } = render(
      <StepSequencerMatrix
        title="   "
        defaultTracks={malformedTracks}
        data-testid="adversarial-seq"
      />
    );

    expect(screen.getByTestId('step-sequencer-title')).toHaveTextContent('Step Sequencer Matrix');
    expect(screen.getByRole('button', { name: 'Track 1 step 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Track 1 step 16' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Lead step 16' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Perc step 1' })).toHaveAttribute('aria-pressed', 'false');

    // Empty controlled tracks renders graceful empty state and allows preset recovery
    const onPatternChange = vi.fn<(tracks: ReadonlyArray<SequencerTrackSpec>) => void>();
    rerender(<StepSequencerMatrix tracks={[]} onPatternChange={onPatternChange} />);

    expect(screen.getByTestId('step-sequencer-empty')).toHaveTextContent(
      'No sequencer tracks configured'
    );
    expect(screen.getByTestId('step-sequencer-summary')).toHaveTextContent('0/0 tracks · 0 steps lit');

    fireEvent.click(screen.getByTestId('step-sequencer-preset-house'));
    expect(onPatternChange).toHaveBeenCalledTimes(1);
    expect(onPatternChange.mock.calls[0]?.[0]).toHaveLength(4);
    expect(onPatternChange.mock.calls[0]?.[0][0]?.id).toBe('kick');

    fireEvent.click(screen.getByTestId('step-sequencer-preset-clear'));
    expect(onPatternChange).toHaveBeenCalledTimes(2);
    expect(onPatternChange.mock.calls[1]?.[0]).toHaveLength(4);
    expect(onPatternChange.mock.calls[1]?.[0][0]?.steps.every((s) => !s)).toBe(true);
  });
});
