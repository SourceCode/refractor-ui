import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChromaticDispersionEdge } from './ChromaticDispersionEdge';

describe('ChromaticDispersionEdge', () => {
  it('renders chromatic dispersion edge with clamped spread, pointer reaction, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onMove = vi.fn();
    render(
      <ChromaticDispersionEdge ref={ref} dispersion={2.0} onPointerMove={onMove} data-testid="disp-root">
        <div className="p-4">Prismatic Edge Card</div>
      </ChromaticDispersionEdge>
    );

    const root = screen.getByTestId('disp-root');
    expect(ref.current).toBe(root);
    expect(root.getAttribute('data-dispersion')).toBe('2.00');
    expect(screen.getByTestId('chromatic-dispersion-ring').style.boxShadow).toContain('3px');

    fireEvent.pointerMove(root, { clientX: 50, clientY: 50 });
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it('safely clamps non-finite dispersion values and supports CSS-only mode', () => {
    render(
      <ChromaticDispersionEdge dispersion={Number.NaN} intensity={-1} animated={false} disableWebGL data-testid="disp-safe">
        <span>Safe</span>
      </ChromaticDispersionEdge>
    );
    expect(screen.getByTestId('disp-safe').getAttribute('data-dispersion')).toBe('1.35');
    expect(screen.getByTestId('chromatic-dispersion-ring').style.opacity).toBe('0');
  });
});
