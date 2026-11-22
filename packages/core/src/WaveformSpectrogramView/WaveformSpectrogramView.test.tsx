import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_AUDIO_SAMPLES,
  DEFAULT_DURATION_SEC,
  MIN_DURATION_SEC,
  SPECTROGRAM_BAND_COUNT,
  TRANSIENT_PEAK_THRESHOLD,
  WaveformSpectrogramView,
  type AudioCanvasMode,
  type AudioCanvasModeMap,
  type AudioEditAction,
  type AudioSelectionRange,
} from './index';

function mockSvgRect(svg: Element, width = 440, left = 0): void {
  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: left,
      y: 0,
      left,
      top: 0,
      right: left + width,
      bottom: 160,
      width,
      height: 160,
      toJSON: () => ({}),
    }),
  });
}

describe('WaveformSpectrogramView', () => {
  it('renders sculpted optical waveform + 6-band spectrogram defaults with ref, theme override, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const modeMap: AudioCanvasModeMap = {
      waveform: true,
      spectrogram: true,
      split: true,
    };
    expect(Object.keys(modeMap)).toHaveLength(3);
    expect(DEFAULT_AUDIO_SAMPLES).toHaveLength(48);
    expect(DEFAULT_DURATION_SEC).toBe(12.5);
    expect(MIN_DURATION_SEC).toBe(0.5);
    expect(TRANSIENT_PEAK_THRESHOLD).toBe(0.82);
    expect(SPECTROGRAM_BAND_COUNT).toBe(6);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            WaveformSpectrogramView: {
              className: 'theme-audio-canvas',
              style: { maxWidth: '880px' },
            },
          },
        }}
      >
        <WaveformSpectrogramView
          ref={ref}
          className="local-audio-canvas"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="audio-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('audio-root');
    expect(ref.current).toBe(root);
    expect(WaveformSpectrogramView.displayName).toBe('WaveformSpectrogramView');
    expect(root).toHaveClass(
      'refractor-waveform-spectrogram-view',
      'prism-slab',
      'theme-audio-canvas',
      'local-audio-canvas'
    );
    expect(root).toHaveStyle({ maxWidth: '880px', marginTop: '6px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-mode', 'split');
    expect(root).toHaveAttribute('data-zoom', '1');
    expect(root).not.toHaveAttribute('data-has-selection');
    expect(root).not.toHaveAttribute('data-modified');

    expect(screen.getByTestId('waveform-view-title')).toHaveTextContent(
      'Audio Waveform & Spectrogram'
    );

    const canvasWell = screen.getByTestId('waveform-canvas-well');
    expect(canvasWell).toHaveClass('prism-well', 'overflow-x-auto');

    const svg = screen.getByTestId('waveform-spectrogram-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 440 160');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    // Mirrored waveform bars + zero-crossing line + transient peaks > 0.82
    expect(screen.getByTestId('waveform-zero-line')).toBeInTheDocument();
    expect(screen.getByTestId('waveform-split-divider')).toBeInTheDocument();
    const posBars = screen.getAllByTestId('waveform-bar-positive');
    const negBars = screen.getAllByTestId('waveform-bar-negative');
    expect(posBars).toHaveLength(48);
    expect(negBars).toHaveLength(48);
    expect(posBars[0]).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(negBars[0]).toHaveAttribute('fill', 'var(--prism-secondary-main)');

    const peakDots = screen.getAllByTestId('waveform-peak-dot');
    const expectedPeaks = DEFAULT_AUDIO_SAMPLES.filter((v) => v > TRANSIENT_PEAK_THRESHOLD).length;
    expect(peakDots).toHaveLength(expectedPeaks);
    expect(peakDots[0]).toHaveAttribute('fill', 'var(--prism-warning-main)');

    // 6-band x 48-column spectrogram grid shaded via --prism-* tokens
    const specCells = screen.getAllByTestId('spectrogram-cell');
    expect(specCells).toHaveLength(SPECTROGRAM_BAND_COUNT * 48);
    const cellFills = new Set(specCells.map((cell) => cell.getAttribute('fill')));
    expect(cellFills.has('var(--prism-info-main)')).toBe(true);
    expect(cellFills.has('var(--prism-secondary-main)')).toBe(true);
    expect(cellFills.has('var(--prism-primary-main)')).toBe(true);

    // Recessed aria-live="polite" telemetry footer
    const footer = screen.getByTestId('waveform-telemetry-footer');
    expect(footer).toHaveClass('prism-well');
    expect(footer).toHaveAttribute('role', 'status');
    expect(footer).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('telemetry-duration')).toHaveTextContent('Duration 12.50s');
    expect(screen.getByTestId('telemetry-selection')).toHaveTextContent('Selection None');
    expect(screen.getByTestId('telemetry-samples')).toHaveTextContent('48 samples');
    expect(screen.getByTestId('telemetry-peak-db')).toHaveTextContent('Peak -0.5 dB');

    // Action buttons disabled when no active selection
    expect(screen.getByTestId('waveform-action-silence')).toBeDisabled();
    expect(screen.getByTestId('waveform-action-cut')).toBeDisabled();
    expect(screen.getByTestId('waveform-action-reset')).not.toBeDisabled();
  });

  it('switches view modes via click and IME-safe roving tablist keyboard navigation, plus controlled mode', () => {
    const onModeChange = vi.fn<(mode: AudioCanvasMode) => void>();
    render(<WaveformSpectrogramView title="Vocal Bus" onModeChange={onModeChange} />);

    expect(screen.getByTestId('waveform-view-title')).toHaveTextContent('Vocal Bus');

    // Clicking already-selected Split tab is a no-op
    fireEvent.click(screen.getByTestId('waveform-mode-split'));
    expect(onModeChange).not.toHaveBeenCalled();

    // Switch to Waveform only
    fireEvent.click(screen.getByTestId('waveform-mode-waveform'));
    expect(onModeChange).toHaveBeenLastCalledWith('waveform');
    expect(screen.getByTestId('waveform-band')).toBeInTheDocument();
    expect(screen.queryByTestId('spectrogram-band')).not.toBeInTheDocument();
    expect(screen.queryByTestId('waveform-split-divider')).not.toBeInTheDocument();

    // ArrowRight -> Spectrogram only
    fireEvent.keyDown(screen.getByTestId('waveform-mode-waveform'), { key: 'ArrowRight' });
    expect(onModeChange).toHaveBeenLastCalledWith('spectrogram');
    expect(screen.queryByTestId('waveform-band')).not.toBeInTheDocument();
    expect(screen.getByTestId('spectrogram-band')).toBeInTheDocument();

    // ArrowDown -> Split
    fireEvent.keyDown(screen.getByTestId('waveform-mode-spectrogram'), { key: 'ArrowDown' });
    expect(onModeChange).toHaveBeenLastCalledWith('split');
    expect(screen.getByTestId('waveform-band')).toBeInTheDocument();
    expect(screen.getByTestId('spectrogram-band')).toBeInTheDocument();

    // ArrowLeft -> Spectrogram, ArrowUp -> Waveform
    fireEvent.keyDown(screen.getByTestId('waveform-mode-split'), { key: 'ArrowLeft' });
    expect(onModeChange).toHaveBeenLastCalledWith('spectrogram');
    fireEvent.keyDown(screen.getByTestId('waveform-mode-spectrogram'), { key: 'ArrowUp' });
    expect(onModeChange).toHaveBeenLastCalledWith('waveform');

    // End -> Split, Home -> Waveform
    fireEvent.keyDown(screen.getByTestId('waveform-mode-waveform'), { key: 'End' });
    expect(onModeChange).toHaveBeenLastCalledWith('split');
    fireEvent.keyDown(screen.getByTestId('waveform-mode-split'), { key: 'Home' });
    expect(onModeChange).toHaveBeenLastCalledWith('waveform');

    // Unrelated key and IME composing event ignored
    const callsBefore = onModeChange.mock.calls.length;
    const wfTab = screen.getByTestId('waveform-mode-waveform');
    fireEvent.keyDown(wfTab, { key: 'Escape' });
    const imeEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    wfTab.dispatchEvent(imeEvent);
    expect(onModeChange).toHaveBeenCalledTimes(callsBefore);

    // Controlled mode stays synced with parent prop
    const onControlledMode = vi.fn<(mode: AudioCanvasMode) => void>();
    const { rerender } = render(
      <WaveformSpectrogramView
        mode="spectrogram"
        onModeChange={onControlledMode}
        data-testid="ctrl-view"
      />
    );
    expect(screen.getByTestId('ctrl-view')).toHaveAttribute('data-mode', 'spectrogram');
    fireEvent.click(screen.getAllByTestId('waveform-mode-waveform')[1]!);
    expect(onControlledMode).toHaveBeenCalledWith('waveform');
    expect(screen.getByTestId('ctrl-view')).toHaveAttribute('data-mode', 'spectrogram');

    rerender(
      <WaveformSpectrogramView
        mode="waveform"
        onModeChange={onControlledMode}
        data-testid="ctrl-view"
      />
    );
    expect(screen.getByTestId('ctrl-view')).toHaveAttribute('data-mode', 'waveform');
  });

  it('toggles 1x, 2x, and 4x zoom pills and expands the scrollable track', () => {
    render(<WaveformSpectrogramView data-testid="zoom-root" />);

    const track = screen.getByTestId('waveform-zoom-track');
    expect(track).toHaveStyle({ width: '100%' });
    expect(screen.getByTestId('waveform-zoom-1x')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('waveform-zoom-2x'));
    expect(screen.getByTestId('zoom-root')).toHaveAttribute('data-zoom', '2');
    expect(screen.getByTestId('waveform-zoom-2x')).toHaveAttribute('aria-pressed', 'true');
    expect(track).toHaveStyle({ width: '200%' });

    fireEvent.click(screen.getByTestId('waveform-zoom-4x'));
    expect(screen.getByTestId('zoom-root')).toHaveAttribute('data-zoom', '4');
    expect(screen.getByTestId('waveform-zoom-4x')).toHaveAttribute('aria-pressed', 'true');
    expect(track).toHaveStyle({ width: '400%' });

    fireEvent.click(screen.getByTestId('waveform-zoom-1x'));
    expect(screen.getByTestId('zoom-root')).toHaveAttribute('data-zoom', '1');
    expect(track).toHaveStyle({ width: '100%' });
  });

  it('supports pointer drag range selection, handle dragging, and cleans up window listeners on pointerup/pointercancel/disabled/unmount', () => {
    const onSelectionChange = vi.fn<(sel: AudioSelectionRange | null) => void>();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { rerender, unmount } = render(
      <WaveformSpectrogramView
        durationSec={12.5}
        onSelectionChange={onSelectionChange}
        data-testid="drag-root"
      />
    );

    const svg = screen.getByTestId('waveform-spectrogram-svg');
    // Zero-width rect guards safely without attaching listeners
    Object.defineProperty(svg, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 0,
        bottom: 160,
        width: 0,
        height: 160,
        toJSON: () => ({}),
      }),
    });
    fireEvent.pointerDown(svg, { clientX: 100, button: 0 });
    expect(screen.getByTestId('drag-root')).not.toHaveAttribute('data-dragging');

    // Mock 440px-wide SVG matching viewBox 0..440 (PLOT_LEFT=12, PLOT_WIDTH=416)
    mockSvgRect(svg, 440, 0);

    // Secondary mouse button is ignored
    fireEvent.pointerDown(svg, { clientX: 100, button: 2 });
    expect(screen.getByTestId('drag-root')).not.toHaveAttribute('data-dragging');

    // Drag from ~19.2% (x = 12 + 0.192 * 416 = 91.872) to 50% (x = 12 + 0.5 * 416 = 220)
    fireEvent.pointerDown(svg, { clientX: 91.872, button: 0 });
    expect(screen.getByTestId('drag-root')).toHaveAttribute('data-dragging', 'true');

    // Pointer move at identical anchor pct is a safe no-op
    fireEvent.pointerMove(window, { clientX: 91.872 });
    expect(onSelectionChange).not.toHaveBeenCalled();

    fireEvent.pointerMove(window, { clientX: 220 });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 19.2, endPct: 50 });
    expect(screen.getByTestId('selection-overlay-rect')).toBeInTheDocument();
    expect(screen.getByTestId('telemetry-selection')).toHaveTextContent('Selection 2.40s – 6.25s');

    fireEvent.pointerUp(window);
    expect(screen.getByTestId('drag-root')).not.toHaveAttribute('data-dragging');

    // Reverse drag right-to-left swaps cleanly & cleans up on pointercancel
    fireEvent.pointerDown(svg, { clientX: 300, button: 0 });
    fireEvent.pointerMove(window, { clientX: 100 });
    const reverseCall = onSelectionChange.mock.calls.at(-1)?.[0];
    expect(reverseCall).not.toBeNull();
    expect(reverseCall!.startPct).toBeLessThan(reverseCall!.endPct);
    fireEvent.pointerCancel(window);
    expect(screen.getByTestId('drag-root')).not.toHaveAttribute('data-dragging');

    // Drag start and end handles directly (including right-click ignore and zero-width guard)
    const startHandle = screen.getByTestId('selection-handle-start');
    const endHandle = screen.getByTestId('selection-handle-end');
    fireEvent.pointerDown(startHandle, { clientX: 100, button: 2 });
    expect(screen.getByTestId('drag-root')).not.toHaveAttribute('data-dragging');

    fireEvent.pointerDown(startHandle, { clientX: 100, button: 0 });
    expect(startHandle).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 12 + 0.25 * 416 });
    expect(onSelectionChange.mock.calls.at(-1)?.[0]?.startPct).toBe(25);
    fireEvent.pointerUp(window);

    fireEvent.pointerDown(endHandle, { clientX: 300, button: 0 });
    expect(endHandle).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 12 + 0.75 * 416 });
    expect(onSelectionChange.mock.calls.at(-1)?.[0]).toEqual({ startPct: 25, endPct: 75 });

    // Toggling disabled mid-drag cleans up window listeners
    rerender(
      <WaveformSpectrogramView
        durationSec={12.5}
        disabled
        onSelectionChange={onSelectionChange}
        data-testid="drag-root"
      />
    );
    expect(screen.getByTestId('drag-root')).not.toHaveAttribute('data-dragging');

    // Re-enable and start a drag, then unmount mid-drag to verify unmount cleanup
    rerender(
      <WaveformSpectrogramView
        durationSec={12.5}
        disabled={false}
        onSelectionChange={onSelectionChange}
        data-testid="drag-root"
      />
    );
    const svgAgain = screen.getByTestId('waveform-spectrogram-svg');
    mockSvgRect(svgAgain, 440, 0);
    fireEvent.pointerDown(svgAgain, { clientX: 120, button: 0 });
    expect(screen.getByTestId('drag-root')).toHaveAttribute('data-dragging', 'true');

    const pointerAdds = addSpy.mock.calls.filter(([t]) =>
      t === 'pointermove' || t === 'pointerup' || t === 'pointercancel'
    ).length;
    unmount();
    const pointerRemoves = removeSpy.mock.calls.filter(([t]) =>
      t === 'pointermove' || t === 'pointerup' || t === 'pointercancel'
    ).length;
    expect(pointerRemoves).toBe(pointerAdds);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('operates Selection Start and Selection End keyboard sliders (+-2%, PageUp/Down, Home/End, Escape, IME-safe)', () => {
    const onSelectionChange = vi.fn<(sel: AudioSelectionRange | null) => void>();
    render(<WaveformSpectrogramView durationSec={10} onSelectionChange={onSelectionChange} />);

    const startHandle = screen.getByRole('slider', { name: 'Selection Start' });
    const endHandle = screen.getByRole('slider', { name: 'Selection End' });

    expect(startHandle).toHaveAttribute('aria-valuenow', '0');
    expect(endHandle).toHaveAttribute('aria-valuenow', '100');

    // Escape when no selection is active is a no-op
    fireEvent.keyDown(startHandle, { key: 'Escape' });
    expect(onSelectionChange).not.toHaveBeenCalled();

    // ArrowRight on Selection Start steps +2% (0 -> 2%)
    fireEvent.keyDown(startHandle, { key: 'ArrowRight' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 2, endPct: 100 });
    expect(screen.getByTestId('telemetry-selection')).toHaveTextContent('Selection 0.20s – 10.00s');

    // PageUp (+10%) -> 12%, ArrowLeft (-2%) -> 10%, ArrowUp (+2%) -> 12%, ArrowDown (-2%) -> 10%
    fireEvent.keyDown(startHandle, { key: 'PageUp' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 12, endPct: 100 });
    fireEvent.keyDown(startHandle, { key: 'ArrowLeft' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 10, endPct: 100 });
    fireEvent.keyDown(startHandle, { key: 'ArrowUp' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 12, endPct: 100 });
    fireEvent.keyDown(startHandle, { key: 'ArrowDown' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 10, endPct: 100 });
    fireEvent.keyDown(startHandle, { key: 'PageDown' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 100 });

    // End jumps start to end - 1 (99), Home jumps back to 0
    fireEvent.keyDown(startHandle, { key: 'End' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 99, endPct: 100 });
    fireEvent.keyDown(startHandle, { key: 'Home' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 100 });

    // Boundary clamp at 0% does not fire duplicate onSelectionChange
    const countAtZero = onSelectionChange.mock.calls.length;
    fireEvent.keyDown(startHandle, { key: 'ArrowLeft' });
    expect(onSelectionChange).toHaveBeenCalledTimes(countAtZero);

    // Selection End keyboard steps
    fireEvent.keyDown(endHandle, { key: 'ArrowLeft' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 98 });
    fireEvent.keyDown(endHandle, { key: 'ArrowRight' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 100 });
    fireEvent.keyDown(endHandle, { key: 'Home' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 1 });
    fireEvent.keyDown(endHandle, { key: 'End' });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ startPct: 0, endPct: 100 });

    // Unrelated key and IME composing event ignored
    const callsBefore = onSelectionChange.mock.calls.length;
    fireEvent.keyDown(endHandle, { key: 'Tab' });
    const imeEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    endHandle.dispatchEvent(imeEvent);
    expect(onSelectionChange).toHaveBeenCalledTimes(callsBefore);

    // Escape clears selection
    fireEvent.keyDown(endHandle, { key: 'Escape' });
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByTestId('telemetry-selection')).toHaveTextContent('Selection None');
    expect(screen.queryByTestId('selection-overlay-rect')).not.toBeInTheDocument();
  });

  it('executes Silence Selection, Cut Selection, and Reset Audio cleanly and re-syncs when samples prop changes', () => {
    const initialSamples = [0.2, 0.4, 0.9, 0.85, 0.6, 0.5, 0.7, 0.3, 0.8, 0.1];
    const onEditSamples = vi.fn<(next: number[], action: AudioEditAction) => void>();
    const onSelectionChange = vi.fn<(sel: AudioSelectionRange | null) => void>();

    const { rerender } = render(
      <WaveformSpectrogramView
        samples={initialSamples}
        durationSec={10}
        defaultSelection={{ startPct: 20, endPct: 50 }}
        onEditSamples={onEditSamples}
        onSelectionChange={onSelectionChange}
        data-testid="edit-root"
      />
    );

    expect(screen.getByTestId('telemetry-duration')).toHaveTextContent('Duration 10.00s');
    expect(screen.getByTestId('telemetry-selection')).toHaveTextContent('Selection 2.00s – 5.00s');
    expect(screen.getByTestId('telemetry-samples')).toHaveTextContent('10 samples');

    // Silence Selection zeroes indices [2, 3, 4]
    fireEvent.click(screen.getByTestId('waveform-action-silence'));
    expect(onEditSamples).toHaveBeenLastCalledWith(
      [0.2, 0.4, 0, 0, 0, 0.5, 0.7, 0.3, 0.8, 0.1],
      'silence'
    );
    expect(screen.getByTestId('edit-root')).toHaveAttribute('data-modified', 'true');
    const barGroups = screen.getAllByTestId('waveform-bar-group');
    expect(barGroups[2]).toHaveAttribute('data-amplitude', '0.00');
    expect(barGroups[3]).toHaveAttribute('data-amplitude', '0.00');
    expect(barGroups[4]).toHaveAttribute('data-amplitude', '0.00');
    // Peak dropped from 0.9 to 0.8 (-1.9 dB), no longer > 0.82 transient warning
    expect(screen.getByTestId('telemetry-peak-db')).toHaveTextContent('Peak -1.9 dB');

    // Cut Selection slices out indices [2, 3, 4], leaving 7 samples and clearing selection
    fireEvent.click(screen.getByTestId('waveform-action-cut'));
    expect(onEditSamples).toHaveBeenLastCalledWith(
      [0.2, 0.4, 0.5, 0.7, 0.3, 0.8, 0.1],
      'cut'
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByTestId('telemetry-samples')).toHaveTextContent('7 samples');
    expect(screen.getByTestId('telemetry-duration')).toHaveTextContent('Duration 7.00s');
    expect(screen.getByTestId('telemetry-selection')).toHaveTextContent('Selection None');

    // Reset Audio restores all 10 original samples & original duration
    fireEvent.click(screen.getByTestId('waveform-action-reset'));
    expect(onEditSamples).toHaveBeenLastCalledWith(initialSamples, 'reset');
    expect(screen.getByTestId('edit-root')).not.toHaveAttribute('data-modified');
    expect(screen.getByTestId('telemetry-samples')).toHaveTextContent('10 samples');
    expect(screen.getByTestId('telemetry-duration')).toHaveTextContent('Duration 10.00s');
    expect(screen.getByTestId('telemetry-peak-db')).toHaveTextContent('Peak -0.9 dB');

    // Cutting full 0%..100% range transitions cleanly into empty state, recoverable via Reset Audio
    const endHandle = screen.getByTestId('selection-handle-end');
    fireEvent.keyDown(endHandle, { key: 'ArrowLeft' }); // creates [0, 98]
    fireEvent.keyDown(endHandle, { key: 'End' }); // expands to [0, 100]
    fireEvent.click(screen.getByTestId('waveform-action-cut'));
    expect(onEditSamples).toHaveBeenLastCalledWith([], 'cut');
    expect(screen.getByTestId('waveform-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('telemetry-samples')).toHaveTextContent('0 samples');
    expect(screen.getByTestId('telemetry-peak-db')).toHaveTextContent('Peak -∞ dB');

    // Updating parent samples prop resets edited buffer automatically
    rerender(
      <WaveformSpectrogramView
        samples={[0.5]}
        durationSec={4}
        onEditSamples={onEditSamples}
        data-testid="edit-root"
      />
    );
    expect(screen.queryByTestId('waveform-empty-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('edit-root')).not.toHaveAttribute('data-modified');
    expect(screen.getByTestId('telemetry-samples')).toHaveTextContent('1 sample');
    expect(screen.getByTestId('telemetry-peak-db')).toHaveTextContent('Peak -6.0 dB');
  });

  it('enforces disabled state, normalizes controlled inverted selections, and sanitizes adversarial inputs without NaN', () => {
    const onModeChange = vi.fn<(mode: AudioCanvasMode) => void>();
    const onSelectionChange = vi.fn<(sel: AudioSelectionRange | null) => void>();
    const onEditSamples = vi.fn<(next: number[], action: AudioEditAction) => void>();

    const { rerender } = render(
      <WaveformSpectrogramView
        samples={[Number.NaN, -0.5, 1.8, Number.POSITIVE_INFINITY, 0.4]}
        durationSec={0.1}
        selection={{ startPct: 120, endPct: -10 }}
        disabled
        onModeChange={onModeChange}
        onSelectionChange={onSelectionChange}
        onEditSamples={onEditSamples}
        data-testid="adv-root"
      />
    );

    const root = screen.getByTestId('adv-root');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('telemetry-duration')).toHaveTextContent('Duration 0.50s');
    expect(screen.getByTestId('telemetry-selection')).toHaveTextContent('Selection 0.00s – 0.50s');
    expect(screen.getByTestId('telemetry-peak-db')).toHaveTextContent('Peak 0.0 dB');

    const svg = screen.getByTestId('waveform-spectrogram-svg');
    expect(svg.innerHTML).not.toContain('NaN');
    mockSvgRect(svg, 440, 0);

    // Disabled controls ignore clicks, drags, and keyboard input
    fireEvent.pointerDown(svg, { clientX: 120, button: 0 });
    fireEvent.pointerDown(screen.getByTestId('selection-handle-start'), { clientX: 120, button: 0 });
    fireEvent.keyDown(screen.getByTestId('selection-handle-start'), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByTestId('waveform-mode-split'), { key: 'ArrowLeft' });
    fireEvent.click(screen.getByTestId('waveform-mode-waveform'));
    fireEvent.click(screen.getByTestId('waveform-action-silence'));
    fireEvent.click(screen.getByTestId('waveform-action-cut'));
    fireEvent.click(screen.getByTestId('waveform-action-reset'));

    expect(onModeChange).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onEditSamples).not.toHaveBeenCalled();

    // Non-finite duration falls back to 12.50s; empty samples renders safe empty state
    rerender(
      <WaveformSpectrogramView
        samples={[]}
        durationSec={Number.NaN}
        selection={null}
        data-testid="adv-root"
      />
    );
    expect(screen.getByTestId('waveform-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('telemetry-duration')).toHaveTextContent('Duration 12.50s');
    expect(screen.getByTestId('telemetry-samples')).toHaveTextContent('0 samples');
    expect(screen.getByTestId('telemetry-peak-db')).toHaveTextContent('Peak -∞ dB');

    // All-zero samples keep spectrogram floor valid and peak -∞ dB
    rerender(
      <WaveformSpectrogramView
        samples={[0, 0, 0]}
        durationSec={Number.POSITIVE_INFINITY}
        data-testid="adv-root"
      />
    );
    expect(screen.getByTestId('telemetry-duration')).toHaveTextContent('Duration 12.50s');
    expect(screen.getByTestId('telemetry-peak-db')).toHaveTextContent('Peak -∞ dB');
    const zeroCells = screen.getAllByTestId('spectrogram-cell');
    expect(zeroCells).toHaveLength(18);
    expect(zeroCells[0]).toHaveAttribute('fill-opacity', '0.06');
  });
});
