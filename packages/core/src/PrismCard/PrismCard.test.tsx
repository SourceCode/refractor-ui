import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { PrismCard } from './PrismCard';

describe('PrismCard', () => {
  it('renders structured article card with kicker, title, children, footer, ref, and merged className', () => {
    const ref = createRef<HTMLElement>();

    render(
      <PrismCard
        ref={ref}
        kicker="Optical Token"
        title="Dichroic Surface"
        footer={<span data-testid="card-footer">24px Radius</span>}
        className="custom-card"
        xstyle={{ '--prism-slab-blur-px': '28px' }}
        data-testid="prism-card"
      >
        Refractive glass body copy.
      </PrismCard>
    );

    const card = screen.getByTestId('prism-card');
    expect(ref.current).toBe(card);
    expect(card.tagName).toBe('ARTICLE');
    expect(card).toHaveClass('refractor-prism-card', 'prism-slab', 'custom-card');
    expect(card).not.toHaveAttribute('data-specimen-slab');
    expect(screen.getByText('Optical Token')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dichroic Surface' })).toBeInTheDocument();
    expect(screen.getByText('Refractive glass body copy.')).toBeInTheDocument();
    expect(screen.getByTestId('card-footer')).toBeInTheDocument();
  });

  it('renders sculptural specimenSlab mode with custom and fallback titles and theme overrides', () => {
    const ref = createRef<HTMLElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            PrismCard: { className: 'theme-card', style: { maxWidth: '280px' } },
          },
        }}
      >
        <PrismCard ref={ref} specimenSlab title="Crystal Slab" data-testid="slab-custom" />
        <PrismCard specimenSlab data-testid="slab-default" />
      </PrismThemeProvider>
    );

    const custom = screen.getByTestId('slab-custom');
    expect(ref.current).toBe(custom);
    expect(custom.tagName).toBe('DIV');
    expect(custom).toHaveClass('refractor-prism-card', 'prism-slab', 'theme-card');
    expect(custom).toHaveAttribute('data-specimen-slab', 'true');
    expect(custom).toHaveStyle({ maxWidth: '280px' });
    expect(custom).toHaveTextContent('Crystal Slab');

    const fallback = screen.getByTestId('slab-default');
    expect(fallback).toHaveTextContent('Card');
  });

  it('renders cleanly when optional slots are omitted (negative / empty test)', () => {
    render(<PrismCard data-testid="empty-card" />);
    const card = screen.getByTestId('empty-card');
    expect(card.tagName).toBe('ARTICLE');
    expect(card.querySelector('h4')).toBeNull();
  });

  it('safely renders adversarial XSS payloads as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <PrismCard kicker={payload} title={payload}>
        {payload}
      </PrismCard>
    );
    expect(screen.getAllByText(payload)).toHaveLength(3);
    expect(document.querySelector('script')).toBeNull();
  });
});
