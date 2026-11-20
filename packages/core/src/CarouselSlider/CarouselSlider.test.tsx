import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CarouselSlider, type CarouselSlide } from './CarouselSlider';

const SLIDES: CarouselSlide[] = [
  {
    id: 'slide-1',
    title: 'Dichroic Crystal Study',
    caption: 'Warm amber and cool cyan caustic dispersion.',
    imageSrc: '/images/study-1.jpg',
  },
  {
    id: 'slide-2',
    title: 'Frosted Lens Dials',
    caption: 'Recessed acrylic geometry with precision controls.',
    imageSrc: 'https://example.com/study-2.jpg',
  },
  {
    id: 'slide-3',
    title: 'Obsidian Surface Spec',
    caption: 'High-contrast nocturnal optical depth.',
    imageSrc: '/images/study-3.jpg',
  },
];

describe('CarouselSlider', () => {
  it('renders active slide, supports Next/Prev/dot/keyboard navigation, and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <CarouselSlider
        ref={ref}
        slides={SLIDES}
        className="custom-carousel"
        data-testid="carousel"
      />
    );

    const root = screen.getByTestId('carousel');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-carousel-slider', 'prism-slab', 'custom-carousel');
    expect(root).toHaveAttribute('aria-roledescription', 'carousel');
    expect(screen.getByText('Slide 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Dichroic Crystal Study' })).toHaveAttribute(
      'src',
      '/images/study-1.jpg'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(screen.getByText('Slide 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Frosted Lens Dials' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 3' }));
    expect(screen.getByText('Slide 3 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to slide 3' })).toHaveAttribute('aria-current', 'true');

    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(screen.getByText('Slide 1 of 3')).toBeInTheDocument();

    fireEvent.keyDown(root, { key: 'ArrowLeft' });
    expect(screen.getByText('Slide 3 of 3')).toBeInTheDocument();

    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.getByText('Slide 3 of 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(screen.getByText('Slide 2 of 3')).toBeInTheDocument();
  });

  it('falls back gracefully on broken image error while keeping other slides intact, and applies theme overrides', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { CarouselSlider: { className: 'theme-carousel', style: { maxWidth: '560px' } } },
        }}
      >
        <CarouselSlider slides={SLIDES} className="local-carousel" data-testid="themed-carousel" />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('themed-carousel');
    expect(root).toHaveClass('refractor-carousel-slider', 'theme-carousel', 'local-carousel');
    expect(root).toHaveStyle({ maxWidth: '560px' });

    const img = screen.getByRole('img', { name: 'Dichroic Crystal Study' });
    fireEvent.error(img);
    expect(screen.queryByRole('img', { name: 'Dichroic Crystal Study' })).toBeNull();
    expect(screen.getAllByText('Dichroic Crystal Study')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(screen.getByRole('img', { name: 'Frosted Lens Dials' })).toBeInTheDocument();
  });

  it('returns null for empty slides array (negative test)', () => {
    const { container } = render(<CarouselSlider slides={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('handles adversarial prototype-polluting slide IDs, javascript: URLs, and XSS captions safely', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <CarouselSlider
        slides={[
          {
            id: '__proto__',
            title: payload,
            caption: payload,
            imageSrc: 'javascript:alert(1)',
          },
        ]}
      />
    );

    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(payload).length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector('script')).toBeNull();
  });
});
