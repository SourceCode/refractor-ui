import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrbitalRingSpinner } from './OrbitalRingSpinner';

describe('OrbitalRingSpinner', () => {
  it('renders contained SVG orbital ring with accessible label and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <OrbitalRingSpinner ref={ref} size="lg" showLabel label="Compiling shaders…" strokeWidth={5} />
    );

    const status = screen.getByRole('status', { name: 'Compiling shaders…' });
    expect(ref.current).toBe(status);
    expect(screen.getByText('Compiling shaders…')).toBeInTheDocument();

    const svg = screen.getByTestId('orbital-ring-spinner-svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 64 64');
    expect(svg.getAttribute('class')).toContain('prism-contain-box');
    expect(svg.style.width).toBe('56px');
  });

  it('supports paused mode and clamps non-finite numeric props', () => {
    render(<OrbitalRingSpinner size="sm" paused strokeWidth={Number.NaN} speedSeconds={-2} />);
    const svg = screen.getByTestId('orbital-ring-spinner-svg');
    expect(svg.style.animationPlayState).toBe('paused');
    expect(svg.style.width).toBe('24px');
  });
});
