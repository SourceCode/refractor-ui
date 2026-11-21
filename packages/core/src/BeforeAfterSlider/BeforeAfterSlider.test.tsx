import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { BeforeAfterSlider } from './BeforeAfterSlider';

const RASTER_BEFORE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const VALID_AFTER = 'https://example.com/optical-after.jpg';

function mockStageRect(el: HTMLElement, left = 0, width = 400, height = 280) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: 0,
    left,
    top: 0,
    width,
    height,
    right: left + width,
    bottom: height,
    toJSON: () => ({}),
  });
}

describe('BeforeAfterSlider', () => {
  it('renders sanitized images, clipped before layer, corner badges, readout, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            BeforeAfterSlider: { className: 'theme-slider', style: { maxWidth: '720px' } },
          },
        }}
      >
        <BeforeAfterSlider
          ref={ref}
          beforeLabel="Original"
          afterLabel="Refracted"
          beforeSrc={RASTER_BEFORE}
          afterSrc={VALID_AFTER}
          defaultPosition={62}
          heightPx={340}
          className="local-slider"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="slider-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('slider-root');
    expect(ref.current).toBe(root);
    expect(BeforeAfterSlider.displayName).toBe('BeforeAfterSlider');
    expect(root).toHaveClass(
      'refractor-before-after-slider',
      'prism-slab',
      'theme-slider',
      'local-slider'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', marginTop: '8px' });

    const stage = screen.getByTestId('before-after-stage');
    expect(stage).toHaveStyle({ height: '340px' });

    expect(screen.getByTestId('before-after-before-badge')).toHaveTextContent('Original');
    expect(screen.getByTestId('before-after-after-badge')).toHaveTextContent('Refracted');
    expect(screen.getByTestId('before-after-readout')).toHaveTextContent('62%');

    const beforeLayer = screen.getByTestId('before-after-before-layer');
    expect(beforeLayer).toHaveStyle({ clipPath: 'inset(0 38% 0 0)' });

    expect(screen.getByRole('img', { name: 'Original' })).toHaveAttribute('src', RASTER_BEFORE);
    expect(screen.getByRole('img', { name: 'Refracted' })).toHaveAttribute('src', VALID_AFTER);

    const handle = screen.getByRole('slider', { name: 'Before and after comparison slider' });
    expect(handle).toHaveAttribute('aria-valuemin', '0');
    expect(handle).toHaveAttribute('aria-valuemax', '100');
    expect(handle).toHaveAttribute('aria-valuenow', '62');
  });

  it('supports custom ReactNode content and optical fallback panels when neither src nor content is supplied', () => {
    const { rerender } = render(<BeforeAfterSlider />);

    expect(screen.getByTestId('before-after-before-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('before-after-after-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('before-after-readout')).toHaveTextContent('50%');
    expect(screen.getByTestId('before-after-stage')).toHaveStyle({ height: '280px' });

    rerender(
      <BeforeAfterSlider
        beforeContent={<div data-testid="custom-before">Light Theme</div>}
        afterContent={<div data-testid="custom-after">Dark Theme</div>}
      />
    );

    expect(screen.getByTestId('custom-before')).toHaveTextContent('Light Theme');
    expect(screen.getByTestId('custom-after')).toHaveTextContent('Dark Theme');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('handles keyboard controls (Arrow 5%, Shift+Arrow 1%, Home 0%, End 100%) and ignores IME composition', () => {
    const onPositionChange = vi.fn<(pct: number) => void>();
    render(
      <BeforeAfterSlider defaultPosition={50} onPositionChange={onPositionChange} />
    );

    const handle = screen.getByRole('slider', { name: 'Before and after comparison slider' });

    // IME composing ignored
    fireEvent.keyDown(handle, { key: 'ArrowRight', isComposing: true });
    expect(onPositionChange).not.toHaveBeenCalled();

    // Unrelated key ignored
    fireEvent.keyDown(handle, { key: 'Enter' });
    expect(onPositionChange).not.toHaveBeenCalled();

    // ArrowRight +5% -> 55%
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onPositionChange).toHaveBeenLastCalledWith(55);
    expect(handle).toHaveAttribute('aria-valuenow', '55');
    expect(screen.getByTestId('before-after-before-layer')).toHaveStyle({
      clipPath: 'inset(0 45% 0 0)',
    });

    // Shift+ArrowLeft -1% -> 54%
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(onPositionChange).toHaveBeenLastCalledWith(54);
    expect(handle).toHaveAttribute('aria-valuenow', '54');

    // Shift+ArrowRight +1% -> 55%
    fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true });
    expect(onPositionChange).toHaveBeenLastCalledWith(55);

    // ArrowLeft -5% -> 50%
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(onPositionChange).toHaveBeenLastCalledWith(50);

    // Home -> 0%
    fireEvent.keyDown(handle, { key: 'Home' });
    expect(onPositionChange).toHaveBeenLastCalledWith(0);
    expect(handle).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('before-after-readout')).toHaveTextContent('0%');

    // End -> 100%
    fireEvent.keyDown(handle, { key: 'End' });
    expect(onPositionChange).toHaveBeenLastCalledWith(100);
    expect(handle).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByTestId('before-after-readout')).toHaveTextContent('100%');
    expect(screen.getByTestId('before-after-before-layer')).toHaveStyle({
      clipPath: 'inset(0 0% 0 0)',
    });
  });

  it('supports pointer dragging on container and handle, clamps within [0..100], and ignores secondary mouse buttons', () => {
    const onPositionChange = vi.fn<(pct: number) => void>();
    render(<BeforeAfterSlider onPositionChange={onPositionChange} />);

    const stage = screen.getByTestId('before-after-stage');
    const handle = screen.getByTestId('before-after-handle');
    mockStageRect(stage, 100, 400, 280);

    // Non-primary mouse button ignored
    fireEvent.pointerDown(stage, { button: 2, clientX: 200 });
    expect(onPositionChange).not.toHaveBeenCalled();

    // Pointer down on stage jumps immediately to 25% (clientX 200 -> 100/400)
    fireEvent.pointerDown(stage, { button: 0, clientX: 200 });
    expect(stage).toHaveAttribute('data-dragging', 'true');
    expect(onPositionChange).toHaveBeenLastCalledWith(25);
    expect(screen.getByTestId('before-after-readout')).toHaveTextContent('25%');

    // Drag to 75% (clientX 400 -> 300/400)
    fireEvent.pointerMove(window, { clientX: 400 });
    expect(onPositionChange).toHaveBeenLastCalledWith(75);
    expect(screen.getByTestId('before-after-divider')).toHaveStyle({ left: '75%' });

    // Overshoot past right clamps to 100%
    fireEvent.pointerMove(window, { clientX: 900 });
    expect(onPositionChange).toHaveBeenLastCalledWith(100);

    // Overshoot past left clamps to 0%
    fireEvent.pointerMove(window, { clientX: -50 });
    expect(onPositionChange).toHaveBeenLastCalledWith(0);

    fireEvent.pointerUp(window);
    expect(stage).not.toHaveAttribute('data-dragging');

    // Drag initiated directly on the crystal handle bubbles cleanly
    fireEvent.pointerDown(handle, { button: 0, clientX: 300 });
    expect(onPositionChange).toHaveBeenLastCalledWith(50);
    fireEvent.pointerCancel(window);
    expect(stage).not.toHaveAttribute('data-dragging');
  });

  it('ignores pointer drag when stage has zero width and cleans up listeners on unmount', () => {
    const onPositionChange = vi.fn<(pct: number) => void>();
    const { unmount } = render(<BeforeAfterSlider onPositionChange={onPositionChange} />);

    const stage = screen.getByTestId('before-after-stage');
    mockStageRect(stage, 0, 0, 280);

    fireEvent.pointerDown(stage, { button: 0, clientX: 120 });
    fireEvent.pointerMove(window, { clientX: 240 });
    expect(onPositionChange).not.toHaveBeenCalled();

    unmount();
    fireEvent.pointerMove(window, { clientX: 300 });
    expect(onPositionChange).not.toHaveBeenCalled();
  });

  it('works in controlled position mode and clamps heightPx & adversarial numeric inputs', () => {
    const onPositionChange = vi.fn<(pct: number) => void>();
    const { rerender } = render(
      <BeforeAfterSlider
        position={30}
        heightPx={50}
        onPositionChange={onPositionChange}
      />
    );

    expect(screen.getByTestId('before-after-stage')).toHaveStyle({ height: '160px' });
    expect(screen.getByTestId('before-after-readout')).toHaveTextContent('30%');

    const handle = screen.getByRole('slider', { name: 'Before and after comparison slider' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onPositionChange).toHaveBeenLastCalledWith(35);
    // Controlled position stays 30% until parent updates prop
    expect(screen.getByTestId('before-after-readout')).toHaveTextContent('30%');

    rerender(
      <BeforeAfterSlider
        position={Number.NaN}
        heightPx={9999}
        onPositionChange={onPositionChange}
      />
    );
    expect(screen.getByTestId('before-after-stage')).toHaveStyle({ height: '700px' });
    expect(screen.getByTestId('before-after-readout')).toHaveTextContent('50%');

    rerender(
      <BeforeAfterSlider
        position={150}
        heightPx={Number.POSITIVE_INFINITY}
        onPositionChange={onPositionChange}
      />
    );
    expect(screen.getByTestId('before-after-stage')).toHaveStyle({ height: '280px' });
    expect(screen.getByTestId('before-after-readout')).toHaveTextContent('100%');
  });

  it('blocks unsafe beforeSrc and afterSrc protocols and renders labels as literal text (adversarial)', () => {
    render(
      <BeforeAfterSlider
        beforeLabel="<script>window.__xss=1</script>Before"
        afterLabel="<img src=x onerror=alert(1)>After"
        beforeSrc="javascript:alert(1)"
        afterSrc="data:text/html,<script>alert(2)</script>"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByTestId('before-after-before-blocked')).toHaveTextContent('Media URL blocked');
    expect(screen.getByTestId('before-after-after-blocked')).toHaveTextContent('Media URL blocked');
  });
});
