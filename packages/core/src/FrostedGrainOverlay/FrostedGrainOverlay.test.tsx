import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FrostedGrainOverlay } from './FrostedGrainOverlay';

describe('FrostedGrainOverlay', () => {
  it('renders procedural micro-grain SVG with viewBox, containment, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <FrostedGrainOverlay ref={ref} grainSize="medium" opacity={0.18} data-testid="grain-root">
        <div className="p-4">Matte Frosted Glass</div>
      </FrostedGrainOverlay>
    );

    const root = screen.getByTestId('grain-root');
    expect(ref.current).toBe(root);
    expect(root.getAttribute('data-grain-size')).toBe('medium');
    expect(screen.getByText('Matte Frosted Glass')).toBeInTheDocument();

    const svg = screen.getByTestId('frosted-grain-svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 160 160');
    expect(svg.getAttribute('class')).toContain('prism-contain-box');
    expect(svg.style.opacity).toBe('0.18');
  });

  it('clamps excessive opacity safely and supports animated coarse grain', () => {
    render(
      <FrostedGrainOverlay grainSize="coarse" opacity={5} animated disableWebGL>
        <span>Coarse</span>
      </FrostedGrainOverlay>
    );
    expect(screen.getByTestId('frosted-grain-svg').style.opacity).toBe('0.35');
  });
});
