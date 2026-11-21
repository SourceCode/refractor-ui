import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  Product360Viewer,
  type Product360Frame,
} from './index';

afterEach(() => {
  vi.useRealTimers();
});

describe('Product360Viewer', () => {
  it('renders 3D optical prism fallback SVG, HUD badges, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            Product360Viewer: { className: 'theme-360', style: { maxWidth: '720px' } },
          },
        }}
      >
        <Product360Viewer
          ref={ref}
          title="Sapphire Prism Core"
          heightPx={340}
          className="local-360"
          xstyle={{ '--prism-blur-px': '22px' }}
          style={{ borderRadius: '28px' }}
          data-testid="viewer-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('viewer-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-product-360-viewer',
      'prism-slab',
      'theme-360',
      'local-360'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', borderRadius: '28px' });
    expect(root).toHaveTextContent('Sapphire Prism Core');

    const stage = screen.getByTestId('product-360-stage');
    expect(stage).toHaveClass('prism-studio-grid', 'refractor-product-360-viewer__stage');
    expect(stage).toHaveStyle({ height: '340px' });

    expect(screen.getByTestId('product-360-angle-readout')).toHaveTextContent('0°');
    expect(screen.getByTestId('product-360-viewpoint')).toHaveTextContent('Front');
    expect(screen.getByTestId('product-360-prism-svg')).toBeInTheDocument();
    expect(screen.queryByTestId('product-360-frame-image')).toBeNull();

    // Ensure token-driven SVG prism uses semantic CSS vars (zero raw hex/rgb literals)
    const orbitDot = screen.getByTestId('product-360-orbit-dot');
    expect(orbitDot).toHaveAttribute('fill', 'var(--prism-primary-main)');
  });

  it('supports horizontal pointer drag-to-orbit, keyboard ArrowLeft/ArrowRight/Home, scrubber, and Reset 0° with cardinal viewpoint updates', () => {
    const onAngleChange = vi.fn<(deg: number) => void>();

    const { unmount } = render(
      <Product360Viewer defaultAngle={0} onAngleChange={onAngleChange} />
    );

    const stage = screen.getByTestId('product-360-stage');
    const readout = screen.getByTestId('product-360-angle-readout');
    const viewpoint = screen.getByTestId('product-360-viewpoint');
    const slider = screen.getByRole('slider', { name: 'Orbit angle' });

    const initialTopCap = screen.getByTestId('product-360-top-cap').getAttribute('points');

    // Keyboard ArrowRight (+15°), IME composing ignored, ArrowLeft (-15° wrapping around 0 -> 345°)
    fireEvent.keyDown(stage, { key: 'ArrowRight', isComposing: true });
    expect(readout).toHaveTextContent('0°');
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(readout).toHaveTextContent('15°');
    expect(onAngleChange).toHaveBeenLastCalledWith(15);

    const rotatedTopCap = screen.getByTestId('product-360-top-cap').getAttribute('points');
    expect(rotatedTopCap).not.toBe(initialTopCap);

    // ArrowLeft twice: 15 -> 0 -> 345
    fireEvent.keyDown(stage, { key: 'ArrowLeft' });
    expect(readout).toHaveTextContent('0°');
    fireEvent.keyDown(stage, { key: 'ArrowLeft' });
    expect(readout).toHaveTextContent('345°');
    expect(viewpoint).toHaveTextContent('Front');

    // Unrelated key ignored
    fireEvent.keyDown(stage, { key: 'Tab' });
    expect(readout).toHaveTextContent('345°');

    // Home resets to 0°
    fireEvent.keyDown(stage, { key: 'Home' });
    expect(readout).toHaveTextContent('0°');

    // Scrubber updates angle & cardinal viewpoints (Right=90, Rear=180, Left=270)
    fireEvent.change(slider, { target: { value: '90' } });
    expect(readout).toHaveTextContent('90°');
    expect(viewpoint).toHaveTextContent('Right');

    fireEvent.change(slider, { target: { value: '180' } });
    expect(readout).toHaveTextContent('180°');
    expect(viewpoint).toHaveTextContent('Rear');

    fireEvent.change(slider, { target: { value: '270' } });
    expect(readout).toHaveTextContent('270°');
    expect(viewpoint).toHaveTextContent('Left');

    // Reset 0° button resets back to 0°
    fireEvent.click(screen.getByRole('button', { name: 'Reset angle to 0 degrees' }));
    expect(readout).toHaveTextContent('0°');
    expect(viewpoint).toHaveTextContent('Front');

    // Secondary mouse button must not drag
    fireEvent.pointerDown(stage, { button: 2, clientX: 50 });
    fireEvent.pointerMove(window, { clientX: 200 });
    expect(readout).toHaveTextContent('0°');

    // Primary drag horizontally +90px (default 360px span in jsdom -> +90°)
    fireEvent.pointerDown(stage, { button: 0, clientX: 100 });
    expect(stage).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 190 });
    expect(readout).toHaveTextContent('90°');
    fireEvent.pointerUp(window);
    expect(stage).not.toHaveAttribute('data-dragging');

    // Mocked wide stage rect (>= 240px) scales drag proportionally across width
    vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 480,
      height: 300,
      right: 480,
      bottom: 300,
      toJSON: () => ({}),
    });
    fireEvent.pointerDown(stage, { button: 0, clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 220 }); // +120 / 480 * 360 = +90 -> 180°
    expect(readout).toHaveTextContent('180°');

    // Unmount mid-drag cleans up window listeners safely
    unmount();
    expect(() => {
      fireEvent.pointerMove(window, { clientX: 400 });
      fireEvent.pointerUp(window);
    }).not.toThrow();
  });

  it('toggles Auto-Spin with aria-pressed, advances angle on timer, and cleans up interval on toggle and unmount', () => {
    vi.useFakeTimers();
    const onAngleChange = vi.fn<(deg: number) => void>();

    const { unmount } = render(
      <Product360Viewer defaultAngle={355} onAngleChange={onAngleChange} />
    );

    const spinBtn = screen.getByRole('button', { name: 'Auto-Spin' });
    expect(spinBtn).toHaveAttribute('aria-pressed', 'false');

    // Enable auto-spin
    fireEvent.click(spinBtn);
    expect(spinBtn).toHaveAttribute('aria-pressed', 'true');

    // Advance 120ms -> 355 + 5 wraps cleanly to 0°
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(screen.getByTestId('product-360-angle-readout')).toHaveTextContent('0°');

    // Advance another 240ms -> +10° -> 10°
    act(() => {
      vi.advanceTimersByTime(240);
    });
    expect(screen.getByTestId('product-360-angle-readout')).toHaveTextContent('10°');

    // Toggle off stops interval
    fireEvent.click(spinBtn);
    expect(spinBtn).toHaveAttribute('aria-pressed', 'false');
    const callsWhenStopped = onAngleChange.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onAngleChange).toHaveBeenCalledTimes(callsWhenStopped);

    // Re-enable and unmount -> interval cleaned up cleanly with zero further callbacks
    fireEvent.click(spinBtn);
    unmount();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onAngleChange).toHaveBeenCalledTimes(callsWhenStopped);
  });

  it('renders nearest sanitized frame image, uses frame.label, rejects unsafe URLs, and falls back to 3D prism on load error', () => {
    const frames: ReadonlyArray<Product360Frame> = [
      {
        angle: 0,
        label: 'Front Lens',
        src: 'https://cdn.example.com/prism-front.webp',
      },
      {
        angle: 120,
        label: 'Right Chamfer',
        src: 'data:image/png;base64,iVBORw0KGgo=',
      },
      {
        angle: 240,
        label: 'Malicious Angle',
        src: 'javascript:alert(1)',
      },
      {
        angle: Number.NaN,
        label: 'Invalid NaN Angle',
        src: 'https://cdn.example.com/ignored.webp',
      },
    ];

    const { rerender } = render(
      <Product360Viewer frames={frames} defaultAngle={10} />
    );

    // At 10°, nearest frame is 0° ('Front Lens')
    expect(screen.getByTestId('product-360-viewpoint')).toHaveTextContent('Front Lens');
    const img = screen.getByTestId('product-360-frame-image');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/prism-front.webp');

    // Orbit to 115° -> nearest frame is 120° ('Right Chamfer', safe raster data URI)
    fireEvent.change(screen.getByRole('slider', { name: 'Orbit angle' }), {
      target: { value: '115' },
    });
    expect(screen.getByTestId('product-360-viewpoint')).toHaveTextContent('Right Chamfer');
    expect(screen.getByTestId('product-360-frame-image')).toHaveAttribute(
      'src',
      'data:image/png;base64,iVBORw0KGgo='
    );

    // Trigger image load errors on both safe frames -> gracefully falls back to 3D prism SVG
    fireEvent.error(screen.getByTestId('product-360-frame-image'));
    // Still has the other safe frame (front.webp)
    expect(screen.getByTestId('product-360-frame-image')).toHaveAttribute(
      'src',
      'https://cdn.example.com/prism-front.webp'
    );
    fireEvent.error(screen.getByTestId('product-360-frame-image'));
    expect(screen.queryByTestId('product-360-frame-image')).toBeNull();
    expect(screen.getByTestId('product-360-prism-svg')).toBeInTheDocument();

    // Unsafe-only & label-only frames never render an <img> element, and wraparound distance matches 0° from 350°
    rerender(
      <Product360Viewer
        frames={[
          { angle: 0, label: 'Hero Front', src: 'javascript:alert(1)' },
          { angle: 180, label: 'Rear Panel' },
        ]}
        angle={350}
      />
    );
    expect(screen.queryByTestId('product-360-frame-image')).toBeNull();
    expect(screen.getByTestId('product-360-prism-svg')).toBeInTheDocument();
    expect(screen.getByTestId('product-360-viewpoint')).toHaveTextContent('Hero Front');
  });

  it('supports controlled angle, normalizes extreme/negative/NaN angles, clamps heightPx (180..600), and reacts to autoRotate prop', () => {
    vi.useFakeTimers();
    const onAngleChange = vi.fn<(deg: number) => void>();

    const { rerender } = render(
      <Product360Viewer
        angle={-45}
        heightPx={Number.NaN}
        autoRotate={false}
        onAngleChange={onAngleChange}
      />
    );

    // -45 normalizes to 315° (Front); NaN heightPx defaults to 300px
    expect(screen.getByTestId('product-360-angle-readout')).toHaveTextContent('315°');
    expect(screen.getByTestId('product-360-viewpoint')).toHaveTextContent('Front');
    expect(screen.getByTestId('product-360-stage')).toHaveStyle({ height: '300px' });

    // Controlled keyboard step emits onAngleChange without mutating DOM until parent updates angle
    fireEvent.keyDown(screen.getByTestId('product-360-stage'), { key: 'ArrowRight' });
    expect(onAngleChange).toHaveBeenLastCalledWith(330);
    expect(screen.getByTestId('product-360-angle-readout')).toHaveTextContent('315°');

    // Extreme values: angle 760 -> 40°, heightPx 50 -> clamped to 180px, autoRotate prop switches true
    rerender(
      <Product360Viewer
        angle={760}
        heightPx={50}
        autoRotate
        onAngleChange={onAngleChange}
      />
    );
    expect(screen.getByTestId('product-360-angle-readout')).toHaveTextContent('40°');
    expect(screen.getByTestId('product-360-stage')).toHaveStyle({ height: '180px' });
    expect(screen.getByRole('button', { name: 'Auto-Spin' })).toHaveAttribute('aria-pressed', 'true');

    // NaN controlled angle normalizes to 0°; heightPx 1200 clamps to 600px
    rerender(
      <Product360Viewer
        angle={Number.NaN}
        heightPx={1200}
        autoRotate={false}
        onAngleChange={onAngleChange}
      />
    );
    expect(screen.getByTestId('product-360-angle-readout')).toHaveTextContent('0°');
    expect(screen.getByTestId('product-360-stage')).toHaveStyle({ height: '600px' });
    expect(screen.getByRole('button', { name: 'Auto-Spin' })).toHaveAttribute('aria-pressed', 'false');
  });
});
