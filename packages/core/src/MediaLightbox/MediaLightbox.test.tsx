import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  MediaLightbox,
  type LightboxMediaItem,
  type MediaLightboxMode,
} from './MediaLightbox';

const RASTER_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const SAMPLE_ITEMS: ReadonlyArray<LightboxMediaItem> = [
  {
    id: 'img-1',
    title: 'Prism Slab Hero',
    caption: 'Dual caustic specular lighting test.',
    src: 'https://example.com/prism-1.jpg',
    kind: 'image',
  },
  {
    id: 'vid-2',
    title: 'Refraction Motion Study',
    src: 'https://example.com/motion.mp4',
    kind: 'video',
    thumbnailSrc: RASTER_DATA_URI,
  },
  {
    id: 'vid-3',
    title: 'Ambient Caustic Loop',
    src: '/media/caustic-loop.mp4',
    kind: 'video',
  },
];

describe('MediaLightbox', () => {
  it('renders overlay dialog with theme overrides, React 19 ref, counter, caption, and filmstrip', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            MediaLightbox: { className: 'theme-lightbox', style: { maxWidth: '960px' } },
          },
        }}
      >
        <MediaLightbox
          ref={ref}
          items={SAMPLE_ITEMS}
          className="local-lightbox"
          xstyle={{ '--prism-blur-px': '24px' }}
          style={{ padding: '20px' }}
          data-testid="lightbox-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('lightbox-root');
    expect(ref.current).toBe(root);
    expect(MediaLightbox.displayName).toBe('MediaLightbox');
    expect(root).toHaveAttribute('role', 'dialog');
    expect(root).toHaveAttribute('aria-modal', 'true');
    expect(root).toHaveAttribute('data-mode', 'overlay');
    expect(root).toHaveAttribute('data-media-kind', 'image');
    expect(root).toHaveClass(
      'refractor-media-lightbox',
      'fixed',
      'inset-0',
      'z-50',
      'bg-slate-950/90',
      'backdrop-blur-xl',
      'theme-lightbox',
      'local-lightbox'
    );
    expect(root).toHaveStyle({ maxWidth: '960px', padding: '20px' });
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('24px');

    expect(screen.getByText('Prism Slab Hero')).toBeInTheDocument();
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('1 / 3');
    expect(screen.getByTestId('lightbox-zoom-readout')).toHaveTextContent('100%');
    expect(screen.getByTestId('lightbox-caption')).toHaveTextContent(
      'Dual caustic specular lighting test.'
    );

    const image = screen.getByTestId('lightbox-image');
    expect(image).toHaveAttribute('src', 'https://example.com/prism-1.jpg');
    expect(image).toHaveAttribute('alt', 'Prism Slab Hero');

    const thumb1 = screen.getByTestId('lightbox-thumb-img-1');
    expect(thumb1).toHaveAttribute('aria-pressed', 'true');
    expect(thumb1).toHaveAttribute('aria-current', 'true');
    expect(thumb1).toHaveAttribute('data-active', 'true');
  });

  it('returns null when closed or when items list is empty', () => {
    const { container, rerender } = render(
      <MediaLightbox items={SAMPLE_ITEMS} defaultOpen={false} />
    );
    expect(container.firstChild).toBeNull();

    rerender(<MediaLightbox items={[]} defaultOpen />);
    expect(container.firstChild).toBeNull();
  });

  it('supports inline mode with prism-slab, hides close button unless onOpenChange is given, and handles inline keyboard arrows', () => {
    const onIndexChange = vi.fn<(idx: number) => void>();
    const onOpenChange = vi.fn<(open: boolean) => void>();

    const { rerender } = render(
      <MediaLightbox
        items={SAMPLE_ITEMS}
        mode="inline"
        onIndexChange={onIndexChange}
        data-testid="lightbox-inline"
      />
    );

    const root = screen.getByTestId('lightbox-inline');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).not.toHaveAttribute('aria-modal');
    expect(root).toHaveClass('prism-slab', 'bg-slate-950/90');
    expect(screen.queryByRole('button', { name: 'Close lightbox' })).toBeNull();

    // Inline mode handles ArrowRight/ArrowLeft on root, ignores Escape and IME composing
    fireEvent.keyDown(root, { key: 'ArrowRight', isComposing: true });
    expect(onIndexChange).not.toHaveBeenCalled();

    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.getByTestId('lightbox-inline')).toBeInTheDocument();

    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('2 / 3');
    expect(screen.getByTestId('lightbox-video')).toHaveAttribute(
      'src',
      'https://example.com/motion.mp4'
    );
    expect(screen.queryByTestId('lightbox-caption')).toBeNull();

    fireEvent.keyDown(root, { key: 'ArrowLeft' });
    expect(onIndexChange).toHaveBeenLastCalledWith(0);

    // Unrelated key is ignored
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(onIndexChange).toHaveBeenCalledTimes(2);

    // Passing onOpenChange in inline mode shows the close button
    rerender(
      <MediaLightbox
        items={SAMPLE_ITEMS}
        mode="inline"
        open
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close lightbox' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('cycles circularly via Prev/Next arrows, filmstrip thumbnails, and overlay window keyboard shortcuts', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onIndexChange = vi.fn<(idx: number) => void>();

    render(
      <MediaLightbox
        items={SAMPLE_ITEMS}
        mode="overlay"
        onOpenChange={onOpenChange}
        onIndexChange={onIndexChange}
      />
    );

    // Circular wrap backward from 0 -> 2
    fireEvent.click(screen.getByRole('button', { name: 'Previous media' }));
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('3 / 3');

    // Circular wrap forward from 2 -> 0
    fireEvent.click(screen.getByRole('button', { name: 'Next media' }));
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('1 / 3');

    // Filmstrip click selects index 1
    fireEvent.click(screen.getByTestId('lightbox-thumb-vid-2'));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByTestId('lightbox-thumb-vid-2')).toHaveAttribute('aria-pressed', 'true');

    // Overlay window keyboard shortcuts (IME composing ignored)
    fireEvent.keyDown(window, { key: 'ArrowRight', isComposing: true });
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('2 / 3');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('3 / 3');

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('2 / 3');

    // Escape closes overlay mode
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('steps zoom between 100% and 300% by 50%, supports pointer drag-to-pan when zoomed, and resets cleanly', () => {
    const { unmount } = render(<MediaLightbox items={SAMPLE_ITEMS} mode="inline" />);

    const zoomOut = screen.getByRole('button', { name: 'Zoom out' });
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    const resetBtn = screen.getByRole('button', { name: 'Reset zoom and pan' });
    const readout = screen.getByTestId('lightbox-zoom-readout');
    const stage = screen.getByTestId('lightbox-stage');
    const img = screen.getByTestId('lightbox-image');

    expect(zoomOut).toBeDisabled();
    expect(resetBtn).toBeDisabled();
    expect(readout).toHaveTextContent('100%');

    // Panning at 1x is a no-op
    fireEvent.pointerDown(stage, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 180, clientY: 160 });
    expect(img).toHaveStyle({ transform: 'translate3d(0px, 0px, 0) scale(1)' });

    // Zoom in up to 300%
    fireEvent.click(zoomIn);
    expect(readout).toHaveTextContent('150%');
    fireEvent.click(zoomIn);
    expect(readout).toHaveTextContent('200%');
    fireEvent.click(zoomIn);
    expect(readout).toHaveTextContent('250%');
    fireEvent.click(zoomIn);
    expect(readout).toHaveTextContent('300%');
    expect(zoomIn).toBeDisabled();
    expect(resetBtn).toBeEnabled();

    // Secondary button pointer down ignored
    fireEvent.pointerDown(stage, { button: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 150, clientY: 150 });
    expect(img).toHaveStyle({ transform: 'translate3d(0px, 0px, 0) scale(3)' });

    // Primary pointer drag pans and clamps
    fireEvent.pointerDown(stage, { button: 0, clientX: 100, clientY: 100 });
    expect(stage).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 160, clientY: 70 });
    expect(img).toHaveStyle({ transform: 'translate3d(60px, -30px, 0) scale(3)' });

    // Overshoot drag clamps within pan bounds
    fireEvent.pointerMove(window, { clientX: 5000, clientY: -5000 });
    expect(img).toHaveStyle({ transform: 'translate3d(640px, -640px, 0) scale(3)' });
    fireEvent.pointerUp(window);
    expect(stage).not.toHaveAttribute('data-dragging');

    // Reset restores 100% and 0,0 pan
    fireEvent.click(resetBtn);
    expect(readout).toHaveTextContent('100%');
    expect(img).toHaveStyle({ transform: 'translate3d(0px, 0px, 0) scale(1)' });
    expect(resetBtn).toBeDisabled();

    // Zoom in to 150%, pan, then zoom out back to 100% also re-centers pan
    fireEvent.click(zoomIn);
    fireEvent.pointerDown(stage, { button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(window, { clientX: 90, clientY: 80 });
    fireEvent.pointerCancel(window);
    expect(img).toHaveStyle({ transform: 'translate3d(40px, 30px, 0) scale(1.5)' });

    fireEvent.click(zoomOut);
    expect(readout).toHaveTextContent('100%');
    expect(img).toHaveStyle({ transform: 'translate3d(0px, 0px, 0) scale(1)' });

    // Prev/next pointerDown stops propagation and unmount while dragging cleans listeners
    fireEvent.click(zoomIn);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Previous media' }), {
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    expect(stage).not.toHaveAttribute('data-dragging');

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Next media' }), {
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    expect(stage).not.toHaveAttribute('data-dragging');

    fireEvent.pointerDown(stage, { button: 0, clientX: 10, clientY: 10 });
    unmount();
    fireEvent.pointerMove(window, { clientX: 50, clientY: 50 });
  });

  it('disables prev/next arrows and ignores arrow navigation when only one item is present', () => {
    const onIndexChange = vi.fn<(idx: number) => void>();
    render(
      <MediaLightbox
        items={[SAMPLE_ITEMS[0]!]}
        mode="overlay"
        onIndexChange={onIndexChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Previous media' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next media' })).toBeDisabled();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('strictly sanitizes image vs video URLs and blocks unsafe protocols with a clean notice (adversarial)', () => {
    const adversarialItems: ReadonlyArray<LightboxMediaItem> = [
      {
        id: 'xss-img',
        title: '<script>window.__xss=1</script>Untrusted Image',
        caption: '<img src=x onerror=alert(1)>',
        src: 'javascript:alert(1)',
        kind: 'image',
      },
      {
        id: 'data-html-img',
        title: 'HTML Data Payload',
        src: 'data:text/html,<script>alert(1)</script>',
        kind: 'image',
      },
      {
        id: 'data-video',
        title: 'Data URI Video Disallowed',
        src: RASTER_DATA_URI,
        kind: 'video',
        thumbnailSrc: 'vbscript:msgbox(1)',
      },
      {
        id: 'valid-raster',
        title: 'Safe Raster Image',
        src: RASTER_DATA_URI,
        kind: 'image',
      },
    ];

    render(
      <MediaLightbox
        items={adversarialItems}
        defaultIndex={Number.NaN}
        mode={'unexpected' as MediaLightboxMode}
        data-testid="lightbox-adv"
      />
    );

    // Invalid mode normalizes to overlay; NaN index normalizes to 0
    expect(screen.getByTestId('lightbox-adv')).toHaveAttribute('data-mode', 'overlay');
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('1 / 4');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByTestId('lightbox-image')).toBeNull();
    expect(screen.queryByTestId('lightbox-video')).toBeNull();
    expect(screen.getByTestId('lightbox-blocked')).toHaveTextContent('Media URL blocked');
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();

    // Index 1: data:text/html image blocked
    fireEvent.click(screen.getByTestId('lightbox-thumb-data-html-img'));
    expect(screen.queryByTestId('lightbox-image')).toBeNull();
    expect(screen.getByTestId('lightbox-blocked')).toHaveTextContent('Media URL blocked');

    // Index 2: video must use sanitizeUrl(src, false), so data:image/png is blocked for videos
    fireEvent.click(screen.getByTestId('lightbox-thumb-data-video'));
    expect(screen.queryByTestId('lightbox-video')).toBeNull();
    expect(screen.getByTestId('lightbox-blocked')).toHaveTextContent('Media URL blocked');

    // Index 3: raster data URI is permitted for images
    fireEvent.click(screen.getByTestId('lightbox-thumb-valid-raster'));
    expect(screen.getByTestId('lightbox-image')).toHaveAttribute('src', RASTER_DATA_URI);
  });

  it('respects controlled activeIndex and clamps out-of-range values', () => {
    const onKeyDown = vi.fn();
    const { rerender } = render(
      <MediaLightbox
        items={SAMPLE_ITEMS}
        mode="inline"
        activeIndex={99}
        onKeyDown={onKeyDown}
        data-testid="lightbox-ctrl"
      />
    );

    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('3 / 3');

    fireEvent.keyDown(screen.getByTestId('lightbox-ctrl'), { key: 'ArrowLeft' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);

    rerender(
      <MediaLightbox
        items={SAMPLE_ITEMS}
        mode="inline"
        activeIndex={-5}
        onKeyDown={(e) => e.preventDefault()}
        data-testid="lightbox-ctrl"
      />
    );
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('1 / 3');

    // Default-prevented root keyDown stops inline handler
    fireEvent.keyDown(screen.getByTestId('lightbox-ctrl'), { key: 'ArrowRight' });
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('1 / 3');
  });
});
