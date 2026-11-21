import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ImageCropper, type CropAspectRatio, type CropResult } from './ImageCropper';

const VALID_IMAGE = 'https://example.com/prism-studio.jpg';
const RASTER_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function mockViewportRect(el: HTMLElement, width = 400, height = 250) {
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

describe('ImageCropper', () => {
  it('renders image, optical crop frame, stable classes, data attributes, overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ImageCropper: { className: 'theme-cropper', style: { maxWidth: '640px' } },
          },
        }}
      >
        <ImageCropper
          ref={ref}
          src={RASTER_DATA_URI}
          alt="Refractive hero"
          className="local-cropper"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '12px' }}
          data-testid="cropper-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('cropper-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-image-cropper',
      'prism-slab',
      'theme-cropper',
      'local-cropper'
    );
    expect(root).toHaveAttribute('data-aspect-ratio', 'free');
    expect(root).toHaveAttribute('data-media-state', 'ready');
    expect(root).toHaveStyle({ maxWidth: '640px', padding: '12px' });

    const img = screen.getByRole('img', { name: 'Refractive hero' });
    expect(img).toHaveAttribute('src', RASTER_DATA_URI);
    expect(img).toHaveStyle({ transform: 'scale(1) rotate(0deg)' });

    const frame = screen.getByTestId('crop-frame');
    expect(frame).toHaveStyle({ left: '15%', top: '15%', width: '70%', height: '70%' });
  });

  it('drags crop frame via pointer and clamps inside [0..100%], ignoring non-primary buttons', () => {
    const onCropChange = vi.fn<(result: CropResult) => void>();
    render(<ImageCropper src={VALID_IMAGE} onCropChange={onCropChange} />);

    const viewport = screen.getByTestId('crop-viewport');
    const frame = screen.getByTestId('crop-frame');
    mockViewportRect(viewport, 400, 200);

    // Secondary mouse button must be ignored
    fireEvent.pointerDown(frame, { button: 2, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 100 });
    expect(onCropChange).not.toHaveBeenCalled();

    // Drag right +40px (+10%) and down +20px (+10%)
    fireEvent.pointerDown(frame, { button: 0, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(window, { clientX: 140, clientY: 70 });
    expect(frame).toHaveStyle({ left: '25%', top: '25%', width: '70%', height: '70%' });

    // Overshoot past bottom-right corner clamps cleanly at x=30, y=30
    fireEvent.pointerMove(window, { clientX: 500, clientY: 500 });
    expect(frame).toHaveStyle({ left: '30%', top: '30%', width: '70%', height: '70%' });

    // Overshoot past top-left corner clamps cleanly at x=0, y=0
    fireEvent.pointerMove(window, { clientX: -300, clientY: -300 });
    expect(frame).toHaveStyle({ left: '0%', top: '0%', width: '70%', height: '70%' });

    fireEvent.pointerUp(window);
    expect(onCropChange).toHaveBeenCalled();
    const last = onCropChange.mock.calls[onCropChange.mock.calls.length - 1]?.[0];
    expect(last?.region).toEqual({ x: 0, y: 0, width: 70, height: 70 });
  });

  it('resizes crop frame via corner handle in free and locked aspect ratios while enforcing min 15%', () => {
    const onCropChange = vi.fn<(result: CropResult) => void>();
    render(
      <ImageCropper
        src={VALID_IMAGE}
        defaultCrop={{ x: 10, y: 10, width: 50, height: 50 }}
        onCropChange={onCropChange}
      />
    );

    const viewport = screen.getByTestId('crop-viewport');
    const frame = screen.getByTestId('crop-frame');
    const handle = screen.getByTestId('crop-resize-handle');
    mockViewportRect(viewport, 200, 200);

    // Free resize shrink past min 15%
    fireEvent.pointerDown(handle, { button: 0, clientX: 120, clientY: 120 });
    fireEvent.pointerMove(window, { clientX: 20, clientY: 20 });
    expect(frame).toHaveStyle({ width: '15%', height: '15%' });

    // Free resize grow
    fireEvent.pointerMove(window, { clientX: 160, clientY: 150 });
    expect(frame).toHaveStyle({ width: '70%', height: '65%' });
    fireEvent.pointerCancel(window);

    // Switch to 1:1 locked aspect ratio and drag vertically dominant
    fireEvent.click(screen.getByRole('button', { name: '1:1' }));
    expect(screen.getByRole('button', { name: '1:1' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.pointerDown(handle, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 102, clientY: 60 }); // dy = -20% dominates dx = +1%
    fireEvent.pointerUp(window);

    const lockedResult = onCropChange.mock.calls[onCropChange.mock.calls.length - 1]?.[0];
    expect(lockedResult?.aspectRatio).toBe('1:1');
    expect(lockedResult?.region.width).toBe(lockedResult?.region.height);
    expect(lockedResult?.region.width).toBeGreaterThanOrEqual(15);
  });

  it('ignores pointer move when viewport has zero dimensions and cleans up listeners on unmount', () => {
    const onCropChange = vi.fn();
    const { unmount } = render(<ImageCropper src={VALID_IMAGE} onCropChange={onCropChange} />);

    const viewport = screen.getByTestId('crop-viewport');
    const frame = screen.getByTestId('crop-frame');
    mockViewportRect(viewport, 0, 0);

    fireEvent.pointerDown(frame, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { clientX: 80, clientY: 80 });
    expect(onCropChange).not.toHaveBeenCalled();

    // Unmount while dragging should cleanly detach window listeners
    unmount();
    fireEvent.pointerMove(window, { clientX: 100, clientY: 100 });
    expect(onCropChange).not.toHaveBeenCalled();
  });

  it('supports keyboard nudging (Arrow keys move 2%, Shift+Arrow resizes) and ignores IME composition', () => {
    const onCropChange = vi.fn<(result: CropResult) => void>();
    render(
      <ImageCropper
        src={VALID_IMAGE}
        defaultCrop={{ x: 20, y: 20, width: 50, height: 50 }}
        onCropChange={onCropChange}
      />
    );

    const frame = screen.getByTestId('crop-frame');

    // Unrelated key ignored
    fireEvent.keyDown(frame, { key: 'Enter' });
    expect(onCropChange).not.toHaveBeenCalled();

    // IME composing ignored
    fireEvent.keyDown(frame, { key: 'ArrowRight', isComposing: true });
    expect(onCropChange).not.toHaveBeenCalled();

    // Move right, down, left, up
    fireEvent.keyDown(frame, { key: 'ArrowRight' });
    expect(frame).toHaveStyle({ left: '22%', top: '20%' });

    fireEvent.keyDown(frame, { key: 'ArrowDown' });
    expect(frame).toHaveStyle({ left: '22%', top: '22%' });

    fireEvent.keyDown(frame, { key: 'ArrowLeft' });
    expect(frame).toHaveStyle({ left: '20%', top: '22%' });

    fireEvent.keyDown(frame, { key: 'ArrowUp' });
    expect(frame).toHaveStyle({ left: '20%', top: '20%' });

    // Shift+Arrow resizes in free mode
    fireEvent.keyDown(frame, { key: 'ArrowRight', shiftKey: true });
    expect(frame).toHaveStyle({ width: '52%', height: '50%' });

    fireEvent.keyDown(frame, { key: 'ArrowDown', shiftKey: true });
    expect(frame).toHaveStyle({ width: '52%', height: '52%' });

    fireEvent.keyDown(frame, { key: 'ArrowLeft', shiftKey: true });
    expect(frame).toHaveStyle({ width: '50%', height: '52%' });

    fireEvent.keyDown(frame, { key: 'ArrowUp', shiftKey: true });
    expect(frame).toHaveStyle({ width: '50%', height: '50%' });

    // Shift+Arrow respects locked 16:9 ratio on both vertical and horizontal axes
    fireEvent.click(screen.getByRole('button', { name: '16:9' }));
    fireEvent.keyDown(frame, { key: 'ArrowUp', shiftKey: true });
    fireEvent.keyDown(frame, { key: 'ArrowRight', shiftKey: true });
    const latest = onCropChange.mock.calls[onCropChange.mock.calls.length - 1]?.[0];
    expect(latest?.aspectRatio).toBe('16:9');
    expect(latest?.region.height).toBeGreaterThanOrEqual(15);
  });

  it('controls aspect presets, zoom slider, ±90° rotation, reset, and Apply Crop CTA', () => {
    const onApplyCrop = vi.fn<(result: CropResult) => void>();
    const onCropChange = vi.fn<(result: CropResult) => void>();

    render(
      <ImageCropper
        src={VALID_IMAGE}
        defaultAspectRatio="4:3"
        onApplyCrop={onApplyCrop}
        onCropChange={onCropChange}
      />
    );

    expect(screen.getByRole('button', { name: '4:3' })).toHaveAttribute('aria-pressed', 'true');

    // Zoom slider
    const zoomInput = screen.getByLabelText('Zoom');
    fireEvent.change(zoomInput, { target: { value: '2.4' } });
    expect(screen.getByTestId('crop-zoom-readout')).toHaveTextContent('2.4x');
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'scale(2.4) rotate(0deg)' });

    // Rotate left 4 times wraps -360° cleanly to 0° (no -0), then rotate right +90°
    const rotateLeft = screen.getByRole('button', { name: 'Rotate left 90 degrees' });
    const rotateRight = screen.getByRole('button', { name: 'Rotate right 90 degrees' });
    fireEvent.click(rotateLeft);
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'scale(2.4) rotate(-90deg)' });
    fireEvent.click(rotateLeft);
    fireEvent.click(rotateLeft);
    fireEvent.click(rotateLeft);
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'scale(2.4) rotate(0deg)' });

    fireEvent.click(rotateRight);
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'scale(2.4) rotate(90deg)' });

    // Switch to Free aspect ratio and apply crop
    fireEvent.click(screen.getByRole('button', { name: 'Free' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Crop' }));

    expect(onApplyCrop).toHaveBeenCalledTimes(1);
    const applied = onApplyCrop.mock.calls[0]?.[0];
    expect(applied?.zoom).toBe(2.4);
    expect(applied?.rotationDeg).toBe(90);
    expect(applied?.aspectRatio).toBe('free');

    // Reset restores initial 4:3, zoom 1.0x, rotation 0°
    fireEvent.click(screen.getByRole('button', { name: 'Reset transform' }));
    expect(screen.getByRole('button', { name: '4:3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('crop-zoom-readout')).toHaveTextContent('1.0x');
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'scale(1) rotate(0deg)' });
  });

  it('blocks unsafe javascript: and data:text/html image URLs without rendering an <img> (adversarial)', () => {
    const onApplyCrop = vi.fn();
    const { rerender } = render(
      <ImageCropper src="javascript:alert(1)" onApplyCrop={onApplyCrop} />
    );

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByTestId('crop-fallback')).toHaveTextContent('Blocked unsafe media URL');
    expect(screen.getByTestId('crop-viewport')).toHaveAttribute('data-media-state', 'unsafe');

    const applyBtn = screen.getByRole('button', { name: 'Apply Crop' });
    expect(applyBtn).toBeDisabled();
    fireEvent.click(applyBtn);
    expect(onApplyCrop).not.toHaveBeenCalled();

    rerender(
      <ImageCropper src="data:text/html,<script>alert(1)</script>" onApplyCrop={onApplyCrop} />
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByTestId('crop-fallback')).toHaveTextContent('Blocked unsafe media URL');
  });

  it('handles broken image load errors cleanly and recovers when src changes (negative)', () => {
    const onApplyCrop = vi.fn();
    const { rerender } = render(
      <ImageCropper src="https://example.com/missing.png" onApplyCrop={onApplyCrop} />
    );

    const img = screen.getByRole('img');
    fireEvent.error(img);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByTestId('crop-fallback')).toHaveTextContent('Unable to load media preview');
    expect(screen.getByTestId('crop-viewport')).toHaveAttribute('data-media-state', 'error');
    expect(screen.getByRole('button', { name: 'Apply Crop' })).toBeDisabled();

    // Switching src to a fresh URL resets broken image state
    rerender(<ImageCropper src={VALID_IMAGE} onApplyCrop={onApplyCrop} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', VALID_IMAGE);
    expect(screen.getByRole('button', { name: 'Apply Crop' })).toBeEnabled();
  });

  it('sanitizes adversarial NaN, negative, and overflowing defaultCrop coordinates & XSS alt text', () => {
    const onApplyCrop = vi.fn<(result: CropResult) => void>();
    const xssAlt = '<script>window.__xss=1</script>Hero';

    const { rerender } = render(
      <ImageCropper
        src={VALID_IMAGE}
        alt={xssAlt}
        defaultCrop={{ x: Number.NaN, y: -50, width: Number.POSITIVE_INFINITY, height: -10 }}
        defaultAspectRatio={'invalid' as CropAspectRatio}
        onApplyCrop={onApplyCrop}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Apply Crop' }));

    const first = onApplyCrop.mock.calls[0]?.[0];
    expect(first).toBeDefined();
    expect(Number.isFinite(first?.region.x)).toBe(true);
    expect(Number.isFinite(first?.region.y)).toBe(true);
    expect(first?.region.x).toBeGreaterThanOrEqual(0);
    expect(first?.region.y).toBeGreaterThanOrEqual(0);
    expect(first?.region.width).toBeGreaterThanOrEqual(15);
    expect(first?.region.height).toBeGreaterThanOrEqual(15);
    expect((first?.region.x ?? 0) + (first?.region.width ?? 0)).toBeLessThanOrEqual(100);
    expect((first?.region.y ?? 0) + (first?.region.height ?? 0)).toBeLessThanOrEqual(100);
    expect(first?.aspectRatio).toBe('free');

    // Overflow coordinates clamp inside [0..100]
    rerender(
      <ImageCropper
        key="overflow"
        src={VALID_IMAGE}
        defaultCrop={{ x: 95, y: 95, width: 40, height: 40 }}
        defaultAspectRatio="16:9"
        onApplyCrop={onApplyCrop}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply Crop' }));
    const second = onApplyCrop.mock.calls[1]?.[0];
    expect((second?.region.x ?? 0) + (second?.region.width ?? 0)).toBeLessThanOrEqual(100);
    expect((second?.region.y ?? 0) + (second?.region.height ?? 0)).toBeLessThanOrEqual(100);
  });
});
