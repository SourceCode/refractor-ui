import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CropStraightenOverlay,
  type CropAspectPreset,
  type CropAspectPresetMap,
  type CropTransformState,
} from './index';

function mockStageRect(el: HTMLElement, width = 400, height = 225) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    toJSON: () => ({}),
  });
}

describe('CropStraightenOverlay', () => {
  it('renders defaults, placeholder stage, theme overrides, xstyle, telemetry, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const aspectMapCheck: CropAspectPresetMap = {
      free: true,
      '16:9': true,
      '4:5': true,
      '1:1': true,
      '2.39:1': true,
    };
    expect(Object.keys(aspectMapCheck)).toHaveLength(5);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CropStraightenOverlay: {
              className: 'theme-overlay',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <CropStraightenOverlay
          ref={ref}
          className="local-overlay"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '16px' }}
          data-testid="overlay-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('overlay-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-crop-straighten-overlay',
      'prism-slab',
      'theme-overlay',
      'local-overlay'
    );
    expect(root).toHaveAttribute('data-aspect', 'free');
    expect(root).not.toHaveAttribute('data-straightened');
    expect(root).toHaveStyle({ maxWidth: '720px', padding: '16px' });

    expect(screen.getByText('RAW_Studio_Frame_01.dng')).toBeInTheDocument();
    expect(screen.getByTestId('crop-placeholder-stage')).toBeInTheDocument();
    expect(screen.getByTestId('crop-horizon-grid')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply Crop' })).toBeNull();

    const frame = screen.getByTestId('crop-frame');
    expect(frame).toHaveStyle({ left: '10%', top: '10%', width: '80%', height: '80%' });

    const backdrop = screen.getByTestId('crop-media-backdrop');
    expect(backdrop).toHaveStyle({ transform: 'rotate(0deg) scale(1)' });

    const telemetry = screen.getByTestId('crop-telemetry');
    expect(telemetry).toHaveAttribute('aria-live', 'polite');
    expect(telemetry).toHaveTextContent('X 10% · Y 10% · 80%×80% · 0.0° · Free');
  });

  it('renders custom children media and invokes onApply when Apply Crop is clicked', () => {
    const onApply = vi.fn<(state: CropTransformState) => void>();

    render(
      <CropStraightenOverlay
        mediaLabel="Studio_Grade_04.exr"
        defaultAspect="16:9"
        defaultRotationDeg={2.5}
        onApply={onApply}
      >
        <div data-testid="custom-preview-media">Live WebGL Canvas</div>
      </CropStraightenOverlay>
    );

    expect(screen.getByText('Studio_Grade_04.exr')).toBeInTheDocument();
    expect(screen.getByTestId('custom-preview-media')).toBeInTheDocument();
    expect(screen.queryByTestId('crop-placeholder-stage')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Apply Crop' }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      crop: { x: 10, y: 10, width: 80, height: 80 },
      rotationDeg: 2.5,
      aspect: '16:9',
    });
  });

  it('switches across all 5 aspect ratio presets and constrains crop proportionally inside 0..100', () => {
    const onChange = vi.fn<(state: CropTransformState) => void>();
    render(
      <CropStraightenOverlay
        defaultCrop={{ x: 20, y: 20, width: 60, height: 60 }}
        onChange={onChange}
      />
    );

    const presets: ReadonlyArray<{ label: string; id: CropAspectPreset; expectedVisualRatio: number | null }> = [
      { label: '16:9', id: '16:9', expectedVisualRatio: 16 / 9 },
      { label: '4:5', id: '4:5', expectedVisualRatio: 4 / 5 },
      { label: '1:1', id: '1:1', expectedVisualRatio: 1 },
      { label: '2.39:1', id: '2.39:1', expectedVisualRatio: 2.39 },
      { label: 'Free', id: 'free', expectedVisualRatio: null },
    ];

    for (const preset of presets) {
      const btn = screen.getByRole('button', { name: preset.label });
      fireEvent.click(btn);
      expect(btn).toHaveAttribute('aria-pressed', 'true');

      const latest = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
      expect(latest?.aspect).toBe(preset.id);
      const rect = latest?.crop;
      expect(rect).toBeDefined();
      expect(rect?.x).toBeGreaterThanOrEqual(0);
      expect(rect?.y).toBeGreaterThanOrEqual(0);
      expect(rect?.width).toBeGreaterThanOrEqual(15);
      expect(rect?.height).toBeGreaterThanOrEqual(15);
      expect((rect?.x ?? 0) + (rect?.width ?? 0)).toBeLessThanOrEqual(100);
      expect((rect?.y ?? 0) + (rect?.height ?? 0)).toBeLessThanOrEqual(100);

      if (preset.expectedVisualRatio !== null && rect) {
        const visualRatio = (rect.width * 16) / (rect.height * 9);
        expect(visualRatio).toBeCloseTo(preset.expectedVisualRatio, 1);
      }
    }
  });

  it('drags crop frame via pointer with clamping, ignores non-primary button and zero viewport', () => {
    const onChange = vi.fn<(state: CropTransformState) => void>();
    render(<CropStraightenOverlay onChange={onChange} />);

    const viewport = screen.getByTestId('crop-viewport');
    const frame = screen.getByTestId('crop-frame');
    mockStageRect(viewport, 400, 200);

    // Non-primary button ignored
    fireEvent.pointerDown(frame, { button: 2, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(window, { clientX: 150, clientY: 100 });
    expect(onChange).not.toHaveBeenCalled();

    // Primary drag right +40px (+10%) and down +20px (+10%)
    fireEvent.pointerDown(frame, { button: 0, clientX: 100, clientY: 50 });
    expect(frame).toHaveAttribute('data-dragging', 'move');
    fireEvent.pointerMove(window, { clientX: 140, clientY: 70 });
    expect(frame).toHaveStyle({ left: '20%', top: '20%', width: '80%', height: '80%' });

    // Overshoot past bottom-right clamps at x=20, y=20
    fireEvent.pointerMove(window, { clientX: 900, clientY: 900 });
    expect(frame).toHaveStyle({ left: '20%', top: '20%', width: '80%', height: '80%' });

    // Overshoot past top-left clamps at x=0, y=0
    fireEvent.pointerMove(window, { clientX: -500, clientY: -500 });
    expect(frame).toHaveStyle({ left: '0%', top: '0%', width: '80%', height: '80%' });

    fireEvent.pointerUp(window);
    expect(frame).not.toHaveAttribute('data-dragging');

    // After pointerup, further window moves do not fire
    const callsAfterUp = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 250, clientY: 150 });
    expect(onChange).toHaveBeenCalledTimes(callsAfterUp);

    // Zero-dimension viewport safely ignored
    mockStageRect(viewport, 0, 0);
    fireEvent.pointerDown(frame, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { clientX: 100, clientY: 100 });
    fireEvent.pointerCancel(window);
    expect(onChange).toHaveBeenCalledTimes(callsAfterUp);
    expect(frame).not.toHaveAttribute('data-dragging');
  });

  it('resizes all 4 corner handles via pointer in free and locked aspect ratios while enforcing min 15%', () => {
    const onChange = vi.fn<(state: CropTransformState) => void>();
    render(
      <CropStraightenOverlay
        defaultCrop={{ x: 20, y: 20, width: 60, height: 60 }}
        onChange={onChange}
      />
    );

    const viewport = screen.getByTestId('crop-viewport');
    const frame = screen.getByTestId('crop-frame');
    mockStageRect(viewport, 200, 200);

    // Top-left (nw): drag inward (+20px = +10%, +20px = +10%) -> x=30, y=30, w=50, h=50
    fireEvent.pointerDown(screen.getByTestId('crop-handle-nw'), { button: 0, clientX: 40, clientY: 40 });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 60 });
    fireEvent.pointerUp(window);
    expect(frame).toHaveStyle({ left: '30%', top: '30%', width: '50%', height: '50%' });

    // Top-right (ne): drag outward (+20px = +10%, -20px = -10%) -> x=30, y=20, w=60, h=60
    fireEvent.pointerDown(screen.getByTestId('crop-handle-ne'), { button: 0, clientX: 160, clientY: 60 });
    fireEvent.pointerMove(window, { clientX: 180, clientY: 40 });
    fireEvent.pointerUp(window);
    expect(frame).toHaveStyle({ left: '30%', top: '20%', width: '60%', height: '60%' });

    // Bottom-left (sw): drag outward (-20px = -10%, +20px = +10%) -> x=20, y=20, w=70, h=70
    fireEvent.pointerDown(screen.getByTestId('crop-handle-sw'), { button: 0, clientX: 60, clientY: 160 });
    fireEvent.pointerMove(window, { clientX: 40, clientY: 180 });
    fireEvent.pointerUp(window);
    expect(frame).toHaveStyle({ left: '20%', top: '20%', width: '70%', height: '70%' });

    // Bottom-right (se): shrink past minSizePct=15 -> clamps cleanly to 15%x15%
    fireEvent.pointerDown(screen.getByTestId('crop-handle-se'), { button: 0, clientX: 180, clientY: 180 });
    fireEvent.pointerMove(window, { clientX: 0, clientY: 0 });
    fireEvent.pointerUp(window);
    expect(frame).toHaveStyle({ left: '20%', top: '20%', width: '15%', height: '15%' });

    // Switch to locked 1:1 and drag se handle vertically dominant then horizontally dominant
    fireEvent.click(screen.getByRole('button', { name: '1:1' }));
    const seHandle = screen.getByTestId('crop-handle-se');

    fireEvent.pointerDown(seHandle, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 102, clientY: 140 }); // dy dominates
    fireEvent.pointerUp(window);
    const verticalLocked = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(verticalLocked?.aspect).toBe('1:1');
    expect(((verticalLocked?.crop.width ?? 0) * 16) / ((verticalLocked?.crop.height ?? 1) * 9)).toBeCloseTo(1, 1);

    fireEvent.pointerDown(seHandle, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 140, clientY: 100 }); // dx dominates
    fireEvent.pointerUp(window);
    const horizontalLocked = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(((horizontalLocked?.crop.width ?? 0) * 16) / ((horizontalLocked?.crop.height ?? 1) * 9)).toBeCloseTo(1, 1);
  });

  it('supports keyboard nudging on crop box and all 4 corner handles (±2% / Shift ±10%) with IME guard', () => {
    const onChange = vi.fn<(state: CropTransformState) => void>();
    render(
      <CropStraightenOverlay
        defaultCrop={{ x: 20, y: 20, width: 50, height: 50 }}
        onChange={onChange}
      />
    );

    const frame = screen.getByRole('group', { name: 'Move crop frame' });

    // Ignored keys and IME composition on crop body
    fireEvent.keyDown(frame, { key: 'Enter' });
    fireEvent.keyDown(frame, { key: 'ArrowRight', isComposing: true });
    expect(onChange).not.toHaveBeenCalled();

    // Move body with arrows and Shift+Arrow
    fireEvent.keyDown(frame, { key: 'ArrowRight' });
    expect(frame).toHaveStyle({ left: '22%', top: '20%' });
    fireEvent.keyDown(frame, { key: 'ArrowDown' });
    expect(frame).toHaveStyle({ left: '22%', top: '22%' });
    fireEvent.keyDown(frame, { key: 'ArrowLeft' });
    expect(frame).toHaveStyle({ left: '20%', top: '22%' });
    fireEvent.keyDown(frame, { key: 'ArrowUp' });
    expect(frame).toHaveStyle({ left: '20%', top: '20%' });
    fireEvent.keyDown(frame, { key: 'ArrowRight', shiftKey: true });
    expect(frame).toHaveStyle({ left: '30%', top: '20%' });

    // Corner handles: ignored keys & IME composition
    const nw = screen.getByRole('slider', { name: 'Resize crop top-left' });
    const ne = screen.getByRole('slider', { name: 'Resize crop top-right' });
    const sw = screen.getByRole('slider', { name: 'Resize crop bottom-left' });
    const se = screen.getByRole('slider', { name: 'Resize crop bottom-right' });

    const callsBeforeCorner = onChange.mock.calls.length;
    fireEvent.keyDown(nw, { key: 'Tab' });
    fireEvent.keyDown(nw, { key: 'ArrowLeft', isComposing: true });
    expect(onChange).toHaveBeenCalledTimes(callsBeforeCorner);

    // nw Shift+ArrowLeft expands left by 10% (x: 30 -> 20, width: 50 -> 60)
    fireEvent.keyDown(nw, { key: 'ArrowLeft', shiftKey: true });
    expect(frame).toHaveStyle({ left: '20%', top: '20%', width: '60%', height: '50%' });

    // ne ArrowUp expands top by 2% (y: 20 -> 18, height: 50 -> 52)
    fireEvent.keyDown(ne, { key: 'ArrowUp' });
    expect(frame).toHaveStyle({ left: '20%', top: '18%', width: '60%', height: '52%' });

    // sw ArrowDown expands bottom by 2% (height: 52 -> 54)
    fireEvent.keyDown(sw, { key: 'ArrowDown' });
    expect(frame).toHaveStyle({ left: '20%', top: '18%', width: '60%', height: '54%' });

    // se ArrowRight expands right by 2% (width: 60 -> 62)
    fireEvent.keyDown(se, { key: 'ArrowRight' });
    expect(frame).toHaveStyle({ left: '20%', top: '18%', width: '62%', height: '54%' });
  });

  it('operates the calibrated Straighten Dial (-45°..+45°), quick pills, 0-key level reset, and Reset button', () => {
    const onChange = vi.fn<(state: CropTransformState) => void>();
    render(
      <CropStraightenOverlay
        defaultCrop={{ x: 15, y: 15, width: 70, height: 70 }}
        defaultRotationDeg={0}
        defaultAspect="4:5"
        onChange={onChange}
      />
    );

    const slider = screen.getByRole('slider', { name: 'Straighten rotation degrees' });
    const readout = screen.getByTestId('straighten-readout');
    const backdrop = screen.getByTestId('crop-media-backdrop');

    expect(readout).toHaveTextContent('0.0°');

    // Quick +5° and -5° pills
    fireEvent.click(screen.getByRole('button', { name: 'Straighten plus 5 degrees' }));
    expect(readout).toHaveTextContent('+5.0°');
    expect(backdrop.style.transform).toContain('rotate(5deg)');
    expect(backdrop.style.transform).toContain('scale(');

    fireEvent.click(screen.getByRole('button', { name: 'Straighten minus 5 degrees' }));
    expect(readout).toHaveTextContent('0.0°');

    fireEvent.click(screen.getByRole('button', { name: 'Straighten minus 5 degrees' }));
    expect(readout).toHaveTextContent('-5.0°');
    expect(backdrop.style.transform).toContain('rotate(-5deg)');

    // Level reset 0° pill
    fireEvent.click(screen.getByRole('button', { name: 'Level reset to 0 degrees' }));
    expect(readout).toHaveTextContent('0.0°');

    // Direct slider input change
    fireEvent.change(slider, { target: { value: '12.5' } });
    expect(readout).toHaveTextContent('+12.5°');
    expect(screen.getByTestId('crop-telemetry')).toHaveTextContent('+12.5° · 4:5');

    // Non-0 key & IME composition ignored on slider, '0' key resets to 0°
    fireEvent.keyDown(slider, { key: 'a' });
    fireEvent.keyDown(slider, { key: '0', isComposing: true });
    expect(readout).toHaveTextContent('+12.5°');

    fireEvent.keyDown(slider, { key: '0' });
    expect(readout).toHaveTextContent('0.0°');

    // Mutate aspect & angle then click Reset -> restores defaultAspect '4:5' & rotation 0°
    fireEvent.click(screen.getByRole('button', { name: '2.39:1' }));
    fireEvent.change(slider, { target: { value: '-20' } });
    expect(readout).toHaveTextContent('-20.0°');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(readout).toHaveTextContent('0.0°');
    expect(screen.getByRole('button', { name: '4:5' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('supports controlled value mode without mutating internal state until parent updates value', () => {
    const onChange = vi.fn<(state: CropTransformState) => void>();
    const controlled: CropTransformState = {
      crop: { x: 10, y: 10, width: 80, height: 80 },
      rotationDeg: -3.5,
      aspect: 'free',
    };

    const { rerender } = render(
      <CropStraightenOverlay value={controlled} onChange={onChange} />
    );

    expect(screen.getByTestId('straighten-readout')).toHaveTextContent('-3.5°');

    fireEvent.click(screen.getByRole('button', { name: 'Straighten plus 5 degrees' }));
    expect(onChange).toHaveBeenCalledWith({
      crop: { x: 10, y: 10, width: 80, height: 80 },
      rotationDeg: 1.5,
      aspect: 'free',
    });
    // Still shows parent's controlled value until rerendered
    expect(screen.getByTestId('straighten-readout')).toHaveTextContent('-3.5°');

    rerender(
      <CropStraightenOverlay
        value={{ crop: { x: 25, y: 10, width: 50, height: 80 }, rotationDeg: 1.5, aspect: 'free' }}
        onChange={onChange}
      />
    );
    expect(screen.getByTestId('straighten-readout')).toHaveTextContent('+1.5°');
    expect(screen.getByTestId('crop-frame')).toHaveStyle({ left: '25%', width: '50%' });
  });

  it('enforces disabled state, cleans up active window listeners on disable and unmount', () => {
    const onChange = vi.fn<(state: CropTransformState) => void>();
    const onApply = vi.fn<(state: CropTransformState) => void>();

    const { rerender, unmount } = render(
      <CropStraightenOverlay onChange={onChange} onApply={onApply} data-testid="overlay" />
    );

    const viewport = screen.getByTestId('crop-viewport');
    const frame = screen.getByTestId('crop-frame');
    mockStageRect(viewport, 400, 200);

    // Start drag, then disable mid-drag -> must clean up listeners immediately
    fireEvent.pointerDown(frame, { button: 0, clientX: 100, clientY: 50 });
    expect(frame).toHaveAttribute('data-dragging', 'move');

    rerender(
      <CropStraightenOverlay
        disabled
        onChange={onChange}
        onApply={onApply}
        data-testid="overlay"
      />
    );

    expect(screen.getByTestId('overlay')).toHaveAttribute('data-disabled', 'true');
    expect(frame).not.toHaveAttribute('data-dragging');
    expect(frame).toHaveAttribute('tabindex', '-1');
    expect(frame).toHaveAttribute('aria-disabled', 'true');

    // Window move after disable mid-drag does nothing
    fireEvent.pointerMove(window, { clientX: 250, clientY: 150 });
    expect(onChange).not.toHaveBeenCalled();

    // Pointer, keyboard, slider, and buttons are all blocked while disabled
    fireEvent.pointerDown(frame, { button: 0, clientX: 100, clientY: 50 });
    fireEvent.keyDown(frame, { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByTestId('crop-handle-se'), { key: 'ArrowRight' });
    const slider = screen.getByRole('slider', { name: 'Straighten rotation degrees' });
    fireEvent.change(slider, { target: { value: '15' } });
    fireEvent.keyDown(slider, { key: '0' });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Crop' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();

    // Re-enable, begin a drag, then unmount mid-drag -> window listeners must detach cleanly
    rerender(
      <CropStraightenOverlay onChange={onChange} onApply={onApply} data-testid="overlay" />
    );
    fireEvent.pointerDown(screen.getByTestId('crop-frame'), { button: 0, clientX: 100, clientY: 50 });
    unmount();
    fireEvent.pointerMove(window, { clientX: 300, clientY: 150 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sanitizes adversarial NaN/Infinity/overflow inputs and renders XSS mediaLabel strictly as text', () => {
    const onApply = vi.fn<(state: CropTransformState) => void>();
    const xssLabel = '<script>window.__cropXss=1</script>RAW_Frame.dng';

    render(
      <CropStraightenOverlay
        mediaLabel={xssLabel}
        defaultCrop={{ x: Number.NaN, y: -40, width: Number.POSITIVE_INFINITY, height: 2 }}
        defaultRotationDeg={999}
        defaultAspect={'invalid-ratio' as CropAspectPreset}
        onApply={onApply}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText(xssLabel)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply Crop' }));
    const applied = onApply.mock.calls[0]?.[0];
    expect(applied).toBeDefined();
    expect(applied?.aspect).toBe('free');
    expect(applied?.rotationDeg).toBe(45);
    expect(applied?.crop.x).toBeGreaterThanOrEqual(0);
    expect(applied?.crop.y).toBeGreaterThanOrEqual(0);
    expect(applied?.crop.width).toBeGreaterThanOrEqual(15);
    expect(applied?.crop.height).toBeGreaterThanOrEqual(15);
    expect((applied?.crop.x ?? 0) + (applied?.crop.width ?? 0)).toBeLessThanOrEqual(100);
    expect((applied?.crop.y ?? 0) + (applied?.crop.height ?? 0)).toBeLessThanOrEqual(100);
  });
});
