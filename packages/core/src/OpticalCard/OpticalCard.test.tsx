import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OpticalCard } from './OpticalCard';

describe('OpticalCard', () => {
  it('renders compound sub-parts with shared material and density context', () => {
    render(
      <OpticalCard.Root material="prism" density="touch" data-testid="card">
        <OpticalCard.PrismEdge position="top" />
        <OpticalCard.Header>Refractive Spec</OpticalCard.Header>
        <OpticalCard.Body>Compound optical glass layout.</OpticalCard.Body>
        <OpticalCard.Footer>Updated just now</OpticalCard.Footer>
      </OpticalCard.Root>
    );

    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('ARTICLE');
    expect(card).toHaveClass('prism-material-prism');
    expect(card).toHaveAttribute('data-density', 'touch');
    expect(screen.getByText('Refractive Spec')).toBeInTheDocument();
    expect(screen.getByText('Compound optical glass layout.')).toBeInTheDocument();
    expect(screen.getByText('Updated just now')).toBeInTheDocument();
  });
});
