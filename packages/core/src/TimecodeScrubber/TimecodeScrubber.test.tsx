import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  TimecodeScrubber,
  formatMusicalTimecode,
  formatSmpteTimecode,
  parseMusicalTimecode,
  parseSmpteTimecode,
  type TimecodeFormat,
} from './index';

describe('TimecodeScrubber helpers', () => {
  it('formats and parses SMPTE timecodes accurately across frame rates and edge cases', () => {
    expect(formatSmpteTimecode(0)).toBe('00:00:00:00');
    expect(formatSmpteTimecode(2535, 30)).toBe('00:01:24:15');
    expect(formatSmpteTimecode(108000, 30)).toBe('01:00:00:00');
    expect(formatSmpteTimecode(1445, 24)).toBe('00:01:00:05');
    expect(formatSmpteTimecode(119, 120)).toBe('00:00:00:119');
    expect(formatSmpteTimecode(29.9, 30)).toBe('00:00:00:29');

    // Negative / non-finite / clamped fps fallbacks
    expect(formatSmpteTimecode(-42, 30)).toBe('00:00:00:00');
    expect(formatSmpteTimecode(Number.NaN, 30)).toBe('00:00:00:00');
    expect(formatSmpteTimecode(Number.POSITIVE_INFINITY, 30)).toBe('00:00:00:00');
    expect(formatSmpteTimecode(10, 0)).toBe('00:00:10:00');
    expect(formatSmpteTimecode(240, 999)).toBe('00:00:02:00');
    expect(formatSmpteTimecode(30, Number.NaN)).toBe('00:00:01:00');

    // Valid SMPTE parsing (colon and drop-frame semicolon before FF)
    expect(parseSmpteTimecode('00:00:00:00')).toBe(0);
    expect(parseSmpteTimecode('00:01:24:15', 30)).toBe(2535);
    expect(parseSmpteTimecode(' 00:01:24;15 ', 30)).toBe(2535);
    expect(parseSmpteTimecode('01:00:00:00', 30)).toBe(108000);
    expect(parseSmpteTimecode('00:00:00:119', 120)).toBe(119);

    // Invalid SMPTE inputs
    expect(parseSmpteTimecode('', 30)).toBeNull();
    expect(parseSmpteTimecode('not-a-timecode', 30)).toBeNull();
    expect(parseSmpteTimecode('00:01:24', 30)).toBeNull();
    expect(parseSmpteTimecode('00:01:24:15:00', 30)).toBeNull();
    expect(parseSmpteTimecode('-00:01:24:15', 30)).toBeNull();
    expect(parseSmpteTimecode('00:60:00:00', 30)).toBeNull();
    expect(parseSmpteTimecode('00:00:60:00', 30)).toBeNull();
    expect(parseSmpteTimecode('00:00:00:30', 30)).toBeNull();
    expect(parseSmpteTimecode('99999999999999999999:00:00:00', 30)).toBeNull();
    expect(parseSmpteTimecode('100000000000000:00:00:00', 30)).toBeNull();
  });

  it('formats and parses musical Bars:Beats:Ticks (960 PPQN) timecodes accurately', () => {
    expect(formatMusicalTimecode(0)).toBe('001:1:000');
    // 30fps, 120 BPM, 4 beats/bar => 15 frames per beat, 60 frames per bar
    expect(formatMusicalTimecode(15, 30, 120, 4)).toBe('001:2:000');
    expect(formatMusicalTimecode(60, 30, 120, 4)).toBe('002:1:000');
    expect(formatMusicalTimecode(690, 30, 120, 4)).toBe('012:3:000');
    // Custom 3/4 waltz meter @ 120 BPM (45 frames per bar)
    expect(formatMusicalTimecode(45, 30, 120, 3)).toBe('002:1:000');

    // Negative / non-finite / clamped parameter bounds
    expect(formatMusicalTimecode(-5, 30, 120, 4)).toBe('001:1:000');
    expect(formatMusicalTimecode(Number.NaN, Number.NaN, Number.NaN, Number.NaN)).toBe('001:1:000');
    expect(formatMusicalTimecode(60, 30, 10, 1)).toBe('001:2:000'); // bpm->30, beatsPerBar->2
    expect(formatMusicalTimecode(60, 30, 999, 99)).toBe('001:11:000'); // bpm->300, beatsPerBar->12

    // Valid musical BBT parsing
    expect(parseMusicalTimecode('001:1:000')).toBe(0);
    expect(parseMusicalTimecode('001:2:000', 30, 120, 4)).toBe(15);
    expect(parseMusicalTimecode('012:3:000', 30, 120, 4)).toBe(690);
    expect(parseMusicalTimecode('012:3:480', 30, 120, 4)).toBe(698);
    expect(parseMusicalTimecode(' 002:1:000 ', 30, 120, 3)).toBe(45);

    // Invalid musical BBT inputs
    expect(parseMusicalTimecode('', 30, 120, 4)).toBeNull();
    expect(parseMusicalTimecode('00:01:02:03', 30, 120, 4)).toBeNull();
    expect(parseMusicalTimecode('abc:1:000', 30, 120, 4)).toBeNull();
    expect(parseMusicalTimecode('000:1:000', 30, 120, 4)).toBeNull();
    expect(parseMusicalTimecode('001:0:000', 30, 120, 4)).toBeNull();
    expect(parseMusicalTimecode('001:5:000', 30, 120, 4)).toBeNull();
    expect(parseMusicalTimecode('001:1:960', 30, 120, 4)).toBeNull();
    expect(parseMusicalTimecode('99999999999999999999:1:000', 30, 120, 4)).toBeNull();
    expect(parseMusicalTimecode('900719925474099:1:000', 30, 120, 4)).toBeNull();
    // Safe totalTicks that overflows frame calculation at 120fps / 30bpm
    expect(parseMusicalTimecode('1500000000000:1:000', 120, 30, 4)).toBeNull();
  });
});

describe('TimecodeScrubber', () => {
  it('renders prism-slab card, theme overrides, ref forwarding, format toggle, rate badge, and ARIA slider semantics', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            TimecodeScrubber: { className: 'theme-tc', style: { maxWidth: '420px' } },
          },
        }}
      >
        <TimecodeScrubber
          ref={ref}
          defaultFrame={2535}
          fps={30}
          maxFrame={108000}
          label="Master Playhead"
          className="local-tc"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="tc-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('tc-root');
    const slider = screen.getByRole('slider', { name: 'Master Playhead' });
    const well = screen.getByTestId('timecode-well');

    expect(TimecodeScrubber.displayName).toBe('TimecodeScrubber');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-timecode-scrubber',
      'prism-slab',
      'max-w-full',
      'theme-tc',
      'local-tc'
    );
    expect(root).toHaveAttribute('data-format', 'smpte');
    expect(root).toHaveAttribute('data-scrubbing', 'false');
    expect(root).toHaveAttribute('data-editing', 'false');
    expect(root).toHaveStyle({ maxWidth: '420px' });
    expect(well).toHaveClass('prism-well', 'flex-wrap', 'max-w-full');

    expect(slider).toHaveTextContent('00:01:24:15');
    expect(slider).toHaveAttribute('aria-valuenow', '2535');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '108000');
    expect(slider).toHaveAttribute('aria-valuetext', '00:01:24:15');
    expect(slider).toHaveClass('cursor-ew-resize');

    expect(screen.getByTestId('timecode-rate-badge')).toHaveTextContent('30 fps');
    expect(screen.getByTestId('timecode-format-smpte')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('timecode-format-musical')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('timecode-frame-meta')).toHaveTextContent('Frame 2535 / 108000');
  });

  it('scrubs horizontally via window pointer events with Shift fine (1 frame), Alt coarse (10 frames), clamping, and cleanup', () => {
    const onFrameChange = vi.fn<(frame: number, formatted: string) => void>();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    render(
      <TimecodeScrubber
        defaultFrame={10}
        maxFrame={50}
        fps={30}
        onFrameChange={onFrameChange}
        data-testid="tc-drag"
      />
    );

    const root = screen.getByTestId('tc-drag');
    const slider = screen.getByTestId('timecode-readout');

    // Right click is ignored
    fireEvent.pointerDown(slider, { clientX: 100, button: 2, pointerId: 1 });
    expect(root).toHaveAttribute('data-scrubbing', 'false');
    expect(onFrameChange).not.toHaveBeenCalled();

    // Primary drag starts window listeners
    fireEvent.pointerDown(slider, { clientX: 100, button: 0, pointerId: 3 });
    expect(root).toHaveAttribute('data-scrubbing', 'true');
    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), { passive: true });
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));

    // Sub-threshold +2px accumulates residual without emitting
    fireEvent.pointerMove(window, { clientX: 102, pointerId: 3 });
    expect(onFrameChange).not.toHaveBeenCalled();

    // Additional +2px completes 4px base step -> frame 11
    fireEvent.pointerMove(window, { clientX: 104, pointerId: 3 });
    expect(onFrameChange).toHaveBeenLastCalledWith(11, '00:00:00:11');

    // Shift fine scrub requires 12px per single frame
    fireEvent.pointerMove(window, { clientX: 112, pointerId: 3, shiftKey: true });
    expect(onFrameChange).toHaveBeenCalledTimes(1);
    fireEvent.pointerMove(window, { clientX: 116, pointerId: 3, shiftKey: true });
    expect(onFrameChange).toHaveBeenLastCalledWith(12, '00:00:00:12');

    // Alt coarse scrub jumps +10 frames per 4px step (+8px -> +20 frames -> 32)
    fireEvent.pointerMove(window, { clientX: 124, pointerId: 3, altKey: true });
    expect(onFrameChange).toHaveBeenLastCalledWith(32, '00:00:01:02');

    // Stray pointerId is ignored on move and end
    fireEvent.pointerMove(window, { clientX: 250, pointerId: 99 });
    fireEvent.pointerUp(window, { clientX: 250, pointerId: 99 });
    expect(root).toHaveAttribute('data-scrubbing', 'true');
    expect(slider).toHaveAttribute('aria-valuenow', '32');

    // Clamp cleanly to maxFrame=50 and suppress duplicate emissions
    fireEvent.pointerMove(window, { clientX: 300, pointerId: 3, altKey: true });
    expect(onFrameChange).toHaveBeenLastCalledWith(50, '00:00:01:20');
    const callsAtMax = onFrameChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 340, pointerId: 3, altKey: true });
    expect(onFrameChange).toHaveBeenCalledTimes(callsAtMax);

    // Drag back left (-8px -> -2 frames -> 48)
    fireEvent.pointerMove(window, { clientX: 332, pointerId: 3 });
    expect(onFrameChange).toHaveBeenLastCalledWith(48, '00:00:01:18');

    // End drag via pointerup removes window listeners cleanly
    fireEvent.pointerUp(window, { clientX: 332, pointerId: 3 });
    expect(root).toHaveAttribute('data-scrubbing', 'false');
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));

    // Post-drag window moves do nothing
    const callsAfterUp = onFrameChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 500, pointerId: 3 });
    expect(onFrameChange).toHaveBeenCalledTimes(callsAfterUp);

    // Cancel drag via pointercancel cleans up cleanly
    fireEvent.pointerDown(slider, { clientX: 100, pointerId: 5 });
    expect(root).toHaveAttribute('data-scrubbing', 'true');
    fireEvent.pointerCancel(window, { clientX: 100, pointerId: 5 });
    expect(root).toHaveAttribute('data-scrubbing', 'false');

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('detaches window drag listeners cleanly when unmounted mid-drag', () => {
    const onFrameChange = vi.fn<(frame: number, formatted: string) => void>();
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <TimecodeScrubber defaultFrame={5} maxFrame={100} onFrameChange={onFrameChange} />
    );

    const slider = screen.getByTestId('timecode-readout');
    fireEvent.pointerDown(slider, { clientX: 50, pointerId: 1 });
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));

    fireEvent.pointerMove(window, { clientX: 120, pointerId: 1 });
    expect(onFrameChange).not.toHaveBeenCalled();

    removeSpy.mockRestore();
  });

  it('supports ArrowLeft/ArrowRight, Alt+Arrow, PageUp/PageDown (±fps), Home/End, and IME-safe keyboard handling', () => {
    const onFrameChange = vi.fn<(frame: number, formatted: string) => void>();

    render(
      <TimecodeScrubber
        defaultFrame={30}
        maxFrame={120}
        fps={24}
        onFrameChange={onFrameChange}
      />
    );

    const slider = screen.getByTestId('timecode-readout');

    // ArrowRight (+1 -> 31), Alt+ArrowRight (+10 -> 41), ArrowLeft (-1 -> 40), Alt+ArrowLeft (-10 -> 30)
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onFrameChange).toHaveBeenLastCalledWith(31, '00:00:01:07');

    fireEvent.keyDown(slider, { key: 'ArrowRight', altKey: true });
    expect(onFrameChange).toHaveBeenLastCalledWith(41, '00:00:01:17');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onFrameChange).toHaveBeenLastCalledWith(40, '00:00:01:16');

    fireEvent.keyDown(slider, { key: 'ArrowLeft', altKey: true });
    expect(onFrameChange).toHaveBeenLastCalledWith(30, '00:00:01:06');

    // PageUp (+24 fps -> 54) and PageDown (-24 fps -> 30)
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(onFrameChange).toHaveBeenLastCalledWith(54, '00:00:02:06');

    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(onFrameChange).toHaveBeenLastCalledWith(30, '00:00:01:06');

    // End -> maxFrame (120) and duplicate End emits nothing
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onFrameChange).toHaveBeenLastCalledWith(120, '00:00:05:00');
    const callsAtEnd = onFrameChange.mock.calls.length;
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onFrameChange).toHaveBeenCalledTimes(callsAtEnd);

    // Home -> 0
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onFrameChange).toHaveBeenLastCalledWith(0, '00:00:00:00');

    // Unhandled key and IME composing keydown are ignored
    const callsBeforeIgnored = onFrameChange.mock.calls.length;
    fireEvent.keyDown(slider, { key: 'z' });
    fireEvent.keyDown(slider, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(slider, { key: 'Enter', isComposing: true });
    expect(onFrameChange).toHaveBeenCalledTimes(callsBeforeIgnored);
    expect(screen.queryByTestId('timecode-input')).toBeNull();

    // Non-composing Enter switches into direct text edit mode
    fireEvent.keyDown(slider, { key: 'Enter' });
    const input = screen.getByTestId('timecode-input');
    expect(input).toHaveValue('00:00:00:00');
  });

  it('supports inline direct editing via Edit button, double-click, SMPTE/BBT/integer parsing, clamping, error alert, and Escape revert', () => {
    const onFrameChange = vi.fn<(frame: number, formatted: string) => void>();

    render(
      <TimecodeScrubber
        defaultFrame={30}
        maxFrame={1000}
        fps={30}
        bpm={120}
        beatsPerBar={4}
        onFrameChange={onFrameChange}
        data-testid="tc-edit"
      />
    );

    const root = screen.getByTestId('tc-edit');

    // Enter edit mode via Edit button
    fireEvent.click(screen.getByTestId('timecode-edit-button'));
    expect(root).toHaveAttribute('data-editing', 'true');
    const input = screen.getByTestId('timecode-input');
    expect(input).toHaveValue('00:00:01:00');

    // IME composing Enter does not commit
    fireEvent.change(input, { target: { value: '00:00:02:15' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onFrameChange).not.toHaveBeenCalled();

    // Unhandled key in edit input stays in edit mode
    fireEvent.keyDown(input, { key: 'a' });
    expect(screen.getByTestId('timecode-input')).toBeInTheDocument();

    // Non-composing Enter commits SMPTE timestamp (75 frames)
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onFrameChange).toHaveBeenLastCalledWith(75, '00:00:02:15');
    expect(root).toHaveAttribute('data-editing', 'false');
    expect(screen.getByTestId('timecode-readout')).toHaveTextContent('00:00:02:15');

    // Enter edit mode via double-click and commit plain frame integer on blur (clamped to maxFrame=1000)
    fireEvent.doubleClick(screen.getByTestId('timecode-readout'));
    const input2 = screen.getByTestId('timecode-input');
    fireEvent.change(input2, { target: { value: '5000' } });
    fireEvent.blur(input2);
    expect(onFrameChange).toHaveBeenLastCalledWith(1000, '00:00:33:10');
    expect(screen.getByTestId('timecode-readout')).toHaveTextContent('00:00:33:10');

    // Unchanged value commit exits cleanly without duplicate onFrameChange
    const callsBeforeSame = onFrameChange.mock.calls.length;
    fireEvent.click(screen.getByTestId('timecode-edit-button'));
    fireEvent.blur(screen.getByTestId('timecode-input'));
    expect(onFrameChange).toHaveBeenCalledTimes(callsBeforeSame);

    // Invalid SMPTE shows inline error alert, typing clears error, Escape reverts cleanly
    fireEvent.click(screen.getByTestId('timecode-edit-button'));
    const input3 = screen.getByTestId('timecode-input');
    fireEvent.change(input3, { target: { value: '00:00:00:45' } });
    fireEvent.keyDown(input3, { key: 'Enter' });
    expect(screen.getByRole('alert')).toHaveTextContent(/Invalid SMPTE timecode/i);
    expect(input3).toHaveAttribute('aria-invalid', 'true');
    expect(root).toHaveAttribute('data-invalid', 'true');

    // Overflow plain frame integer also reports invalid
    fireEvent.change(input3, { target: { value: '9'.repeat(30) } });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.blur(input3);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Escape cancels and reverts without calling onFrameChange
    fireEvent.keyDown(input3, { key: 'Escape' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByTestId('timecode-input')).toBeNull();
    expect(screen.getByTestId('timecode-readout')).toHaveTextContent('00:00:33:10');
    expect(onFrameChange).toHaveBeenCalledTimes(callsBeforeSame);

    // Switch to musical BBT mode and test invalid musical error + Set button + Cancel button
    fireEvent.click(screen.getByTestId('timecode-format-musical'));
    expect(root).toHaveAttribute('data-format', 'musical');
    expect(screen.getByTestId('timecode-rate-badge')).toHaveTextContent('120 BPM');
    expect(screen.getByTestId('timecode-frame-meta')).toHaveTextContent('Frame 1000 / 1000 · 4/4');

    fireEvent.click(screen.getByTestId('timecode-edit-button'));
    const musicalInput = screen.getByTestId('timecode-input');
    fireEvent.change(musicalInput, { target: { value: '001:9:000' } });
    const applyBtn = screen.getByTestId('timecode-apply-button');
    fireEvent.mouseDown(applyBtn);
    fireEvent.click(applyBtn);
    expect(screen.getByRole('alert')).toHaveTextContent(/Invalid musical timecode/i);

    // Valid musical BBT commit via Set button -> 012:3:000 = frame 690
    fireEvent.change(musicalInput, { target: { value: '012:3:000' } });
    fireEvent.click(applyBtn);
    expect(onFrameChange).toHaveBeenLastCalledWith(690, '012:3:000');
    expect(screen.getByTestId('timecode-readout')).toHaveTextContent('012:3:000');

    // Cancel button exits edit mode without committing
    fireEvent.click(screen.getByTestId('timecode-edit-button'));
    fireEvent.change(screen.getByTestId('timecode-input'), { target: { value: '001:1:000' } });
    const cancelBtn = screen.getByTestId('timecode-cancel-button');
    fireEvent.mouseDown(cancelBtn);
    fireEvent.click(cancelBtn);
    expect(screen.queryByTestId('timecode-input')).toBeNull();
    expect(screen.getByTestId('timecode-readout')).toHaveTextContent('012:3:000');
  });

  it('supports controlled frame and format state and exits edit mode cleanly on format switch', () => {
    const onFormatSpy = vi.fn<(fmt: TimecodeFormat) => void>();

    function ControlledHarness() {
      const [frame, setFrame] = useState<number>(60);
      const [fmt, setFmt] = useState<TimecodeFormat>('smpte');
      return (
        <TimecodeScrubber
          frame={frame}
          format={fmt}
          fps={30}
          bpm={120}
          beatsPerBar={4}
          onFrameChange={(next) => setFrame(next)}
          onFormatChange={(nextFmt) => {
            onFormatSpy(nextFmt);
            setFmt(nextFmt);
          }}
        />
      );
    }

    render(<ControlledHarness />);
    expect(screen.getByTestId('timecode-readout')).toHaveTextContent('00:00:02:00');

    // Clicking already-active SMPTE pill is a no-op
    fireEvent.click(screen.getByTestId('timecode-format-smpte'));
    expect(onFormatSpy).not.toHaveBeenCalled();

    // Open edit mode, then switch to BBT -> exits edit mode and switches cleanly
    fireEvent.click(screen.getByTestId('timecode-edit-button'));
    expect(screen.getByTestId('timecode-input')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('timecode-format-musical'));
    expect(onFormatSpy).toHaveBeenCalledWith('musical');
    expect(screen.queryByTestId('timecode-input')).toBeNull();
    expect(screen.getByTestId('timecode-readout')).toHaveTextContent('002:1:000');

    // Keyboard stepping in controlled musical mode updates formatted output
    fireEvent.keyDown(screen.getByTestId('timecode-readout'), { key: 'ArrowRight' });
    expect(screen.getByTestId('timecode-readout')).toHaveAttribute('aria-valuenow', '61');

    // Switch back to SMPTE
    fireEvent.click(screen.getByTestId('timecode-format-smpte'));
    expect(onFormatSpy).toHaveBeenLastCalledWith('smpte');
    expect(screen.getByTestId('timecode-readout')).toHaveTextContent('00:00:02:01');
  });

  it('sanitizes out-of-range and non-finite numeric props safely', () => {
    const { rerender } = render(
      <TimecodeScrubber
        defaultFrame={-10}
        maxFrame={0}
        fps={500}
        bpm={10}
        beatsPerBar={20}
        defaultFormat="musical"
      />
    );

    const slider = screen.getByTestId('timecode-readout');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '1');
    expect(screen.getByTestId('timecode-rate-badge')).toHaveTextContent('30 BPM');
    expect(screen.getByTestId('timecode-frame-meta')).toHaveTextContent('Frame 0 / 1 · 12/4');

    rerender(
      <TimecodeScrubber
        frame={Number.NaN}
        maxFrame={Number.POSITIVE_INFINITY}
        fps={Number.NaN}
        bpm={Number.NaN}
        beatsPerBar={Number.NaN}
        format="smpte"
      />
    );
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '108000');
    expect(screen.getByTestId('timecode-rate-badge')).toHaveTextContent('30 fps');
  });

  it('blocks all interactions when disabled and cleans up active drag/edit on disabled transition (negative test)', () => {
    const onFrameChange = vi.fn<(frame: number, formatted: string) => void>();
    const onFormatChange = vi.fn<(format: TimecodeFormat) => void>();

    const { rerender } = render(
      <TimecodeScrubber
        defaultFrame={30}
        onFrameChange={onFrameChange}
        onFormatChange={onFormatChange}
        disabled
        data-testid="tc-disabled"
      />
    );

    const root = screen.getByTestId('tc-disabled');
    const slider = screen.getByTestId('timecode-readout');

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(slider).toHaveAttribute('aria-disabled', 'true');
    expect(slider).toHaveAttribute('tabIndex', '-1');
    expect(slider).toHaveClass('cursor-not-allowed');
    expect(screen.getByTestId('timecode-edit-button')).toBeDisabled();
    expect(screen.getByTestId('timecode-format-smpte')).toBeDisabled();
    expect(screen.getByTestId('timecode-format-musical')).toBeDisabled();

    fireEvent.pointerDown(slider, { clientX: 50, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 150, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 150, pointerId: 1 });
    fireEvent.doubleClick(slider);
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'Enter' });
    fireEvent.click(screen.getByTestId('timecode-format-musical'));
    expect(onFrameChange).not.toHaveBeenCalled();
    expect(onFormatChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('timecode-input')).toBeNull();

    // Transition to disabled mid-drag detaches listeners cleanly
    rerender(
      <TimecodeScrubber
        defaultFrame={30}
        onFrameChange={onFrameChange}
        onFormatChange={onFormatChange}
        disabled={false}
        data-testid="tc-disabled"
      />
    );
    fireEvent.pointerDown(screen.getByTestId('timecode-readout'), { clientX: 20, pointerId: 2 });
    expect(root).toHaveAttribute('data-scrubbing', 'true');

    rerender(
      <TimecodeScrubber
        defaultFrame={30}
        onFrameChange={onFrameChange}
        onFormatChange={onFormatChange}
        disabled
        data-testid="tc-disabled"
      />
    );
    expect(root).toHaveAttribute('data-scrubbing', 'false');
    fireEvent.pointerMove(window, { clientX: 200, pointerId: 2 });
    expect(onFrameChange).not.toHaveBeenCalled();

    // Transition to disabled mid-edit cancels without committing
    rerender(
      <TimecodeScrubber
        defaultFrame={30}
        onFrameChange={onFrameChange}
        disabled={false}
        data-testid="tc-disabled"
      />
    );
    fireEvent.click(screen.getByTestId('timecode-edit-button'));
    fireEvent.change(screen.getByTestId('timecode-input'), { target: { value: '00:00:10:00' } });
    rerender(
      <TimecodeScrubber
        defaultFrame={30}
        onFrameChange={onFrameChange}
        disabled
        data-testid="tc-disabled"
      />
    );
    expect(screen.queryByTestId('timecode-input')).toBeNull();
    expect(onFrameChange).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS payloads in label and edit input as inert text with zero injected DOM nodes', () => {
    const payload = '<script>window.__tcXss=1</script><img src=x onerror=alert(1)>';
    const onFrameChange = vi.fn<(frame: number, formatted: string) => void>();

    render(<TimecodeScrubber label={payload} onFrameChange={onFrameChange} />);

    expect(screen.getByTestId('timecode-label')).toHaveTextContent(payload);
    fireEvent.click(screen.getByTestId('timecode-edit-button'));
    const input = screen.getByTestId('timecode-input');
    fireEvent.change(input, { target: { value: payload } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onFrameChange).not.toHaveBeenCalled();
  });
});
