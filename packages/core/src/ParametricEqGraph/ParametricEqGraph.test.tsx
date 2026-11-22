import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_EQ_BANDS,
  EQ_FILTER_TYPES,
  ParametricEqGraph,
  type EqBand,
  type EqBandFilterTypeMap,
} from './index';

function mockSvgRect(svg: Element, width = 420, height = 190, left = 0, top = 0): void {
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  });
}

function bandToClient(freqHz: number, gainDb: number): { clientX: number; clientY: number } {
  const norm = (Math.log10(freqHz) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
  return {
    clientX: 38 + norm * 368,
    clientY: 90 - (gainDb / 18) * 76,
  };
}

describe('ParametricEqGraph', () => {
  it('renders default 4-band mastering EQ, 420x190 log SVG, inspector, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const filterMapCheck: EqBandFilterTypeMap = {
      'low-shelf': true,
      bell: true,
      'high-shelf': true,
    };
    expect(Object.keys(filterMapCheck)).toHaveLength(3);
    expect(DEFAULT_EQ_BANDS).toHaveLength(4);
    expect(EQ_FILTER_TYPES).toHaveLength(3);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ParametricEqGraph: {
              className: 'theme-parametric-eq',
              style: { maxWidth: '640px' },
            },
          },
        }}
      >
        <ParametricEqGraph
          ref={ref}
          className="local-parametric-eq"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="eq-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('eq-root');
    expect(ref.current).toBe(root);
    expect(ParametricEqGraph.displayName).toBe('ParametricEqGraph');
    expect(root).toHaveClass(
      'refractor-parametric-eq-graph',
      'prism-slab',
      'theme-parametric-eq',
      'local-parametric-eq'
    );
    expect(root).toHaveStyle({ maxWidth: '640px', marginTop: '8px' });
    expect(root).toHaveAttribute('data-band-count', '4');
    expect(root).toHaveAttribute('data-active-filter', 'low-shelf');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-dragging');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-flat');

    expect(screen.getByTestId('eq-title')).toHaveTextContent('Parametric 4-Band EQ');

    // Quick-select numbered pills 1..4
    const pill1 = screen.getByTestId('eq-band-pill-eq-band-1');
    const pill2 = screen.getByTestId('eq-band-pill-eq-band-2');
    const pill3 = screen.getByTestId('eq-band-pill-eq-band-3');
    const pill4 = screen.getByTestId('eq-band-pill-eq-band-4');
    expect(pill1).toHaveAttribute('aria-pressed', 'true');
    expect(pill1).toHaveTextContent('1');
    expect(pill2).toHaveAttribute('aria-pressed', 'false');
    expect(pill2).toHaveTextContent('2');
    expect(pill3).toHaveTextContent('3');
    expect(pill4).toHaveTextContent('4');
    expect(screen.getByTestId('eq-flatten-button')).toBeEnabled();

    // Responsive 420x190 SVG with zero raw colors or NaN
    const svg = screen.getByTestId('eq-graph-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 420 190');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\brgba?\s*\(/i);
    expect(svg.innerHTML).not.toMatch(/\bhsla?\s*\(/i);
    expect(svg.innerHTML).not.toContain('NaN');

    // Frequency and gain gridlines
    const freqGrids = screen.getAllByTestId('eq-freq-gridline');
    expect(freqGrids).toHaveLength(6);
    expect(svg).toHaveTextContent('50Hz');
    expect(svg).toHaveTextContent('100Hz');
    expect(svg).toHaveTextContent('250Hz');
    expect(svg).toHaveTextContent('1kHz');
    expect(svg).toHaveTextContent('4kHz');
    expect(svg).toHaveTextContent('10kHz');

    const gainGrids = screen.getAllByTestId('eq-gain-gridline');
    expect(gainGrids).toHaveLength(5);
    expect(svg).toHaveTextContent('+12');
    expect(svg).toHaveTextContent('+6');
    expect(svg).toHaveTextContent('0 dB');
    expect(svg).toHaveTextContent('-6');
    expect(svg).toHaveTextContent('-12');

    // Summed response curve + translucent fill + active band preview curve
    const responseCurve = screen.getByTestId('eq-response-curve');
    expect(responseCurve).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(responseCurve.getAttribute('d')).toMatch(/^M 38,/);
    expect(screen.getByTestId('eq-response-fill').getAttribute('d')).toMatch(/^M 38,90 L .* Z$/);
    expect(screen.getByTestId('eq-active-band-curve')).toBeInTheDocument();

    // 4 numbered draggable slider nodes with explicit ARIA labels
    const node1 = screen.getByRole('slider', { name: 'EQ Band 1 frequency and gain' });
    const node2 = screen.getByRole('slider', { name: 'EQ Band 2 frequency and gain' });
    const node3 = screen.getByRole('slider', { name: 'EQ Band 3 frequency and gain' });
    const node4 = screen.getByRole('slider', { name: 'EQ Band 4 frequency and gain' });
    expect(node1).toHaveAttribute('data-frequency-hz', '80');
    expect(node1).toHaveAttribute('data-gain-db', '2');
    expect(node1).toHaveAttribute('data-filter-type', 'low-shelf');
    expect(node1).toHaveAttribute('data-selected', 'true');
    expect(node2).toHaveAttribute('data-frequency-hz', '420');
    expect(node3).toHaveAttribute('data-frequency-hz', '2800');
    expect(node4).toHaveAttribute('data-frequency-hz', '10000');

    // Bottom Selected Band Inspector
    const inspector = screen.getByTestId('eq-band-inspector');
    expect(inspector).toHaveClass('prism-well', 'rounded-2xl', 'p-3', 'flex', 'flex-wrap', 'items-center', 'gap-3');
    expect(screen.getByTestId('eq-band-bypass-toggle')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('eq-filter-type-low-shelf')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('eq-filter-type-bell')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('eq-filter-type-high-shelf')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('eq-inspector-freq-readout')).toHaveTextContent('80 Hz');
    expect(screen.getByTestId('eq-inspector-gain-readout')).toHaveTextContent('+2.0 dB');
    expect(screen.getByTestId('eq-inspector-q-readout')).toHaveTextContent('0.7');
  });

  it('selects bands via header pills and SVG clicks, toggles bypass, switches filter types, adjusts sliders, and flattens EQ', () => {
    const onChange = vi.fn<(bands: EqBand[], activeBand: EqBand) => void>();
    render(<ParametricEqGraph title="Master Bus EQ" onChange={onChange} data-testid="eq-root" />);

    expect(screen.getByTestId('eq-title')).toHaveTextContent('Master Bus EQ');

    // Select Band 3 via header pill -> 2.8 kHz Bell
    fireEvent.click(screen.getByTestId('eq-band-pill-eq-band-3'));
    expect(screen.getByTestId('eq-band-pill-eq-band-3')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('eq-inspector-freq-readout')).toHaveTextContent('2.8 kHz');
    expect(screen.getByTestId('eq-inspector-gain-readout')).toHaveTextContent('+2.5 dB');
    expect(screen.getByTestId('eq-inspector-q-readout')).toHaveTextContent('1.6');
    expect(screen.getByTestId('eq-filter-type-bell')).toHaveAttribute('aria-pressed', 'true');

    // Clicking already-active filter type does not fire redundant onChange
    fireEvent.click(screen.getByTestId('eq-filter-type-bell'));
    expect(onChange).not.toHaveBeenCalled();

    // Switch Band 3 to High Shelf, then Low Shelf
    fireEvent.click(screen.getByTestId('eq-filter-type-high-shelf'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.objectContaining({ id: 'eq-band-3', type: 'high-shelf' })
    );
    expect(screen.getByTestId('eq-root')).toHaveAttribute('data-active-filter', 'high-shelf');

    fireEvent.click(screen.getByTestId('eq-filter-type-low-shelf'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.objectContaining({ id: 'eq-band-3', type: 'low-shelf' })
    );

    // Select Band 4 directly by clicking its SVG node
    fireEvent.click(screen.getByTestId('eq-band-node-eq-band-4'));
    expect(screen.getByTestId('eq-band-pill-eq-band-4')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('eq-inspector-freq-readout')).toHaveTextContent('10 kHz');

    // Adjust Frequency, Gain, and Q sliders in the inspector
    const curveBeforeSliders = screen.getByTestId('eq-response-curve').getAttribute('d');
    fireEvent.change(screen.getByTestId('eq-inspector-freq-slider'), { target: { value: '500' } });
    expect(screen.getByTestId('eq-inspector-freq-readout')).toHaveTextContent('632 Hz');

    fireEvent.change(screen.getByTestId('eq-inspector-gain-slider'), { target: { value: '-6.5' } });
    expect(screen.getByTestId('eq-inspector-gain-readout')).toHaveTextContent('-6.5 dB');

    fireEvent.change(screen.getByTestId('eq-inspector-q-slider'), { target: { value: '4.2' } });
    expect(screen.getByTestId('eq-inspector-q-readout')).toHaveTextContent('4.2');
    expect(screen.getByTestId('eq-response-curve').getAttribute('d')).not.toBe(curveBeforeSliders);

    // Bypass Band 4 -> hides active band preview curve and marks node/pill bypassed
    fireEvent.click(screen.getByTestId('eq-band-bypass-toggle'));
    expect(screen.getByTestId('eq-band-bypass-toggle')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('eq-band-bypass-toggle')).toHaveTextContent('Band 4 · Bypassed');
    expect(screen.queryByTestId('eq-active-band-curve')).not.toBeInTheDocument();
    expect(screen.getByTestId('eq-band-node-eq-band-4')).toHaveAttribute('data-enabled', 'false');
    expect(screen.getByTestId('eq-band-node-eq-band-4').getAttribute('aria-valuetext')).toContain(
      'bypassed'
    );
    expect(screen.getByTestId('eq-band-pill-eq-band-4')).toHaveAttribute('data-band-enabled', 'false');

    // Select Band 2 while Band 4 stays bypassed (verifies unselected bypassed node & pill styling)
    fireEvent.click(screen.getByTestId('eq-band-pill-eq-band-2'));
    expect(screen.getByTestId('eq-active-band-curve')).toBeInTheDocument();

    // Re-select Band 4 and re-enable it
    fireEvent.click(screen.getByTestId('eq-band-pill-eq-band-4'));
    fireEvent.click(screen.getByTestId('eq-band-bypass-toggle'));
    expect(screen.getByTestId('eq-band-bypass-toggle')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('eq-active-band-curve')).toBeInTheDocument();

    // Flatten EQ sets every band's gainDb to 0
    fireEvent.click(screen.getByTestId('eq-flatten-button'));
    expect(screen.getByTestId('eq-root')).toHaveAttribute('data-flat', 'true');
    expect(screen.getByTestId('eq-inspector-gain-readout')).toHaveTextContent('0.0 dB');
    const [lastBands, lastActive] = onChange.mock.calls.at(-1)!;
    expect(lastBands.every((b) => b.gainDb === 0)).toBe(true);
    expect(lastActive).toMatchObject({ id: 'eq-band-4', gainDb: 0 });
  });

  it('nudges band frequency and gain via keyboard (+/-1 dB, Shift +/-0.5 dB, Home -> 0 dB) and guards IME', () => {
    const onChange = vi.fn<(bands: EqBand[], activeBand: EqBand) => void>();
    render(<ParametricEqGraph onChange={onChange} />);

    const node1 = screen.getByRole('slider', { name: 'EQ Band 1 frequency and gain' });

    // Gain ArrowUp (+1 dB) and ArrowDown (-1 dB)
    fireEvent.keyDown(node1, { key: 'ArrowUp' });
    expect(node1).toHaveAttribute('data-gain-db', '3');
    fireEvent.keyDown(node1, { key: 'ArrowDown' });
    expect(node1).toHaveAttribute('data-gain-db', '2');

    // Fine gain with Shift (+/-0.5 dB)
    fireEvent.keyDown(node1, { key: 'ArrowUp', shiftKey: true });
    expect(node1).toHaveAttribute('data-gain-db', '2.5');
    fireEvent.keyDown(node1, { key: 'ArrowDown', shiftKey: true });
    expect(node1).toHaveAttribute('data-gain-db', '2');

    // Home flattens band gain to 0 dB; second Home is a no-op
    fireEvent.keyDown(node1, { key: 'Home' });
    expect(node1).toHaveAttribute('data-gain-db', '0');
    const callsAfterHome = onChange.mock.calls.length;
    fireEvent.keyDown(node1, { key: 'Home' });
    expect(onChange).toHaveBeenCalledTimes(callsAfterHome);

    // Log-frequency ArrowRight / ArrowLeft (normal and Shift fine step)
    const initialFreq = Number(node1.getAttribute('data-frequency-hz'));
    fireEvent.keyDown(node1, { key: 'ArrowRight' });
    const rightFreq = Number(node1.getAttribute('data-frequency-hz'));
    expect(rightFreq).toBeGreaterThan(initialFreq);

    fireEvent.keyDown(node1, { key: 'ArrowLeft' });
    const backFreq = Number(node1.getAttribute('data-frequency-hz'));
    expect(backFreq).toBeLessThan(rightFreq);

    fireEvent.keyDown(node1, { key: 'ArrowRight', shiftKey: true });
    const fineRightFreq = Number(node1.getAttribute('data-frequency-hz'));
    expect(fineRightFreq).toBeGreaterThan(backFreq);

    fireEvent.keyDown(node1, { key: 'ArrowLeft', shiftKey: true });
    expect(Number(node1.getAttribute('data-frequency-hz'))).toBeLessThan(fineRightFreq);

    // Unrelated keys and IME composing events are safely ignored
    const callsBeforeIgnored = onChange.mock.calls.length;
    fireEvent.keyDown(node1, { key: 'Escape' });
    const imeEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    node1.dispatchEvent(imeEvent);
    expect(onChange).toHaveBeenCalledTimes(callsBeforeIgnored);
  });

  it('drags band nodes via pointer events and cleans up window listeners on pointerup, pointercancel, disable, empty, and unmount', () => {
    const onChange = vi.fn<(bands: EqBand[], activeBand: EqBand) => void>();
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { rerender, unmount } = render(
      <ParametricEqGraph onChange={onChange} data-testid="eq-root" />
    );

    const svg = screen.getByTestId('eq-graph-svg');
    const node2 = screen.getByTestId('eq-band-node-eq-band-2');

    // Secondary mouse button and zero-sized rect are ignored safely
    fireEvent.pointerDown(node2, { button: 2, pointerId: 1 });
    mockSvgRect(svg, 0, 0);
    fireEvent.pointerDown(node2, { button: 0, pointerId: 1 });
    expect(screen.getByTestId('eq-root')).not.toHaveAttribute('data-dragging');

    // Valid drag on Band 2
    mockSvgRect(svg, 420, 190);
    fireEvent.pointerDown(node2, { button: 0, pointerId: 14 });
    expect(screen.getByTestId('eq-root')).toHaveAttribute('data-dragging', 'true');
    expect(node2).toHaveAttribute('data-dragging', 'true');

    // Unrelated pointerId move/up are ignored
    fireEvent.pointerMove(window, { ...bandToClient(1000, 9), pointerId: 99 });
    fireEvent.pointerUp(window, { pointerId: 99 });
    expect(node2).toHaveAttribute('data-frequency-hz', '420');

    // Matching pointerId moves Band 2 to ~1000 Hz, +9 dB
    fireEvent.pointerMove(window, { ...bandToClient(1000, 9), pointerId: 14 });
    expect(node2).toHaveAttribute('data-frequency-hz', '1000');
    expect(node2).toHaveAttribute('data-gain-db', '9');
    expect(screen.getByTestId('eq-inspector-freq-readout')).toHaveTextContent('1 kHz');
    expect(screen.getByTestId('eq-inspector-gain-readout')).toHaveTextContent('+9.0 dB');

    // Momentarily collapsed SVG rect during move is safely ignored
    mockSvgRect(svg, 0, 0);
    fireEvent.pointerMove(window, { ...bandToClient(2000, -6), pointerId: 14 });
    expect(node2).toHaveAttribute('data-frequency-hz', '1000');

    // Finish drag via pointerup
    mockSvgRect(svg, 420, 190);
    fireEvent.pointerUp(window, { pointerId: 14 });
    expect(screen.getByTestId('eq-root')).not.toHaveAttribute('data-dragging');

    // Cancel drag via pointercancel
    fireEvent.pointerDown(node2, { button: 0, pointerId: 15 });
    expect(screen.getByTestId('eq-root')).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerCancel(window, { pointerId: 15 });
    expect(screen.getByTestId('eq-root')).not.toHaveAttribute('data-dragging');

    // Toggle disabled=true mid-drag -> cleans up listeners immediately
    fireEvent.pointerDown(node2, { button: 0, pointerId: 16 });
    expect(screen.getByTestId('eq-root')).toHaveAttribute('data-dragging', 'true');
    rerender(<ParametricEqGraph disabled onChange={onChange} data-testid="eq-root" />);
    expect(screen.getByTestId('eq-root')).not.toHaveAttribute('data-dragging');

    // Re-enable, start drag, then unmount -> cleans up window listeners
    rerender(<ParametricEqGraph onChange={onChange} data-testid="eq-root" />);
    mockSvgRect(screen.getByTestId('eq-graph-svg'), 420, 190);
    fireEvent.pointerDown(screen.getByTestId('eq-band-node-eq-band-2'), {
      button: 0,
      pointerId: 17,
    });
    removeListenerSpy.mockClear();
    unmount();

    const removedEvents = removeListenerSpy.mock.calls.map((call) => call[0]);
    expect(removedEvents).toContain('pointermove');
    expect(removedEvents).toContain('pointerup');
    expect(removedEvents).toContain('pointercancel');
    removeListenerSpy.mockRestore();
  });

  it('supports controlled bands, empty state role="status", and adversarial band sanitization', () => {
    const controlledBands: EqBand[] = [
      { id: 'c1', label: 'Sub', frequencyHz: 60, gainDb: 4, q: 0.8, type: 'low-shelf', enabled: true },
      { id: 'c2', label: 'Mid', frequencyHz: 1000, gainDb: -3, q: 2, type: 'bell', enabled: true },
    ];
    const onChange = vi.fn<(bands: EqBand[], activeBand: EqBand) => void>();

    const { rerender } = render(
      <ParametricEqGraph bands={controlledBands} onChange={onChange} data-testid="eq-root" />
    );

    const nodeC2 = screen.getByTestId('eq-band-node-c2');
    fireEvent.keyDown(nodeC2, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'c2', gainDb: -2 })]),
      expect.objectContaining({ id: 'c2', gainDb: -2 })
    );
    // Controlled prop was not mutated internally
    expect(nodeC2).toHaveAttribute('data-gain-db', '-3');

    // Remove band mid-drag -> move is a safe no-op and active selection falls back to remaining band
    const svg = screen.getByTestId('eq-graph-svg');
    mockSvgRect(svg, 420, 190);
    fireEvent.pointerDown(nodeC2, { button: 0, pointerId: 21 });
    rerender(
      <ParametricEqGraph bands={[controlledBands[0]!]} onChange={onChange} data-testid="eq-root" />
    );
    const callsBeforeRemovedMove = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { ...bandToClient(500, 6), pointerId: 21 });
    expect(onChange).toHaveBeenCalledTimes(callsBeforeRemovedMove);
    fireEvent.pointerUp(window, { pointerId: 21 });
    expect(screen.getByTestId('eq-band-pill-c1')).toHaveAttribute('aria-pressed', 'true');

    // Controlled empty state (`bands={[]}`) renders clean role="status"
    rerender(<ParametricEqGraph bands={[]} onChange={onChange} data-testid="eq-root" />);
    expect(screen.getByTestId('eq-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No EQ bands configured');
    expect(screen.getByTestId('eq-flatten-button')).toBeDisabled();
    expect(screen.queryByTestId('eq-graph-svg')).not.toBeInTheDocument();
    expect(screen.queryByTestId('eq-band-inspector')).not.toBeInTheDocument();

    // Adversarial sanitization: blank IDs/labels, duplicate IDs, NaN/Infinity/out-of-bounds values
    const adversarialBands: EqBand[] = [
      {
        id: '   ',
        label: '   ',
        frequencyHz: Number.NaN,
        gainDb: Number.POSITIVE_INFINITY,
        q: Number.NEGATIVE_INFINITY,
        type: 'bell',
        enabled: true,
      },
      {
        id: 'dup',
        label: 'Over',
        frequencyHz: 999999,
        gainDb: 50,
        q: 99,
        type: 'high-shelf',
        enabled: true,
      },
      {
        id: 'dup',
        label: 'Under',
        frequencyHz: -100,
        gainDb: -40,
        q: -2,
        type: 'low-shelf',
        enabled: false,
      },
    ];

    rerender(<ParametricEqGraph bands={adversarialBands} data-testid="eq-root" />);
    const sanitizedSvg = screen.getByTestId('eq-graph-svg');
    expect(sanitizedSvg.innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('eq-band-node-eq-band-1')).toHaveAttribute('data-frequency-hz', '1000');
    expect(screen.getByTestId('eq-band-node-eq-band-1')).toHaveAttribute('data-gain-db', '0');
    expect(screen.getByTestId('eq-band-node-eq-band-1')).toHaveAttribute('data-q', '1');
    expect(screen.getByTestId('eq-band-node-dup')).toHaveAttribute('data-frequency-hz', '20000');
    expect(screen.getByTestId('eq-band-node-dup')).toHaveAttribute('data-gain-db', '18');
    expect(screen.getByTestId('eq-band-node-dup')).toHaveAttribute('data-q', '10');
    expect(screen.getByTestId('eq-band-node-dup-2')).toHaveAttribute('data-frequency-hz', '20');
    expect(screen.getByTestId('eq-band-node-dup-2')).toHaveAttribute('data-gain-db', '-18');
    expect(screen.getByTestId('eq-band-node-dup-2')).toHaveAttribute('data-q', '0.3');
  });

  it('renders empty state for uncontrolled defaultBands=[] and blocks all interactions when disabled', () => {
    const onChange = vi.fn<(bands: EqBand[], activeBand: EqBand) => void>();

    const emptyView = render(
      <ParametricEqGraph defaultBands={[]} onChange={onChange} data-testid="eq-root" />
    );
    expect(screen.getByRole('status')).toHaveTextContent('No EQ bands configured');
    emptyView.unmount();

    const { unmount } = render(
      <ParametricEqGraph disabled onChange={onChange} data-testid="eq-disabled-root" />
    );

    const disabledRoot = screen.getByTestId('eq-disabled-root');
    expect(disabledRoot).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('eq-band-pill-eq-band-1')).toBeDisabled();
    expect(screen.getByTestId('eq-flatten-button')).toBeDisabled();
    expect(screen.getByTestId('eq-band-bypass-toggle')).toBeDisabled();
    expect(screen.getByTestId('eq-filter-type-bell')).toBeDisabled();

    const node1 = screen.getByTestId('eq-band-node-eq-band-1');
    expect(node1).toHaveAttribute('tabindex', '-1');
    expect(node1).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(node1);
    fireEvent.pointerDown(node1, { button: 0, pointerId: 1 });
    fireEvent.keyDown(node1, { key: 'ArrowUp' });
    fireEvent.change(screen.getByTestId('eq-inspector-freq-slider'), { target: { value: '800' } });
    fireEvent.change(screen.getByTestId('eq-inspector-gain-slider'), { target: { value: '12' } });
    fireEvent.change(screen.getByTestId('eq-inspector-q-slider'), { target: { value: '5' } });

    expect(onChange).not.toHaveBeenCalled();
    unmount();
  });
});
