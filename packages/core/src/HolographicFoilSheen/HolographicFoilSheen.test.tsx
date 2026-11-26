import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HolographicFoilSheen } from './HolographicFoilSheen';

describe('HolographicFoilSheen', () => {
  it('sweeps dichroic angle and applies subtle perspective tilt on hover, resetting on leave', () => {
    const ref = createRef<HTMLDivElement>();
    const onMove = vi.fn();
    render(
      <HolographicFoilSheen ref={ref} preset="prism-gold" tiltDegrees={6} onPointerMove={onMove} data-testid="foil-root">
        <div className="p-4">Pro License Badge</div>
      </HolographicFoilSheen>
    );

    const root = screen.getByTestId('foil-root');
    expect(ref.current).toBe(root);
    expect(root.getAttribute('data-preset')).toBe('prism-gold');

    fireEvent.pointerEnter(root);
    expect(root.getAttribute('data-hovered')).toBe('true');

    fireEvent.pointerMove(root, { clientX: 180, clientY: 40 });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(root.style.getPropertyValue('--prism-foil-angle')).toMatch(/deg$/);
    expect(root.style.transform).toContain('perspective(900px)');

    fireEvent.pointerLeave(root);
    expect(root.style.transform).toBe('');
    expect(root.getAttribute('data-hovered')).toBeNull();
  });

  it('respects disabled state and clamps non-finite parameters safely', () => {
    render(
      <HolographicFoilSheen disabled tiltDegrees={Number.NaN} intensity={99} preset="titanium" data-testid="foil-off">
        <span>Static</span>
      </HolographicFoilSheen>
    );
    const root = screen.getByTestId('foil-off');
    fireEvent.pointerEnter(root);
    fireEvent.pointerMove(root, { clientX: 50, clientY: 50 });
    expect(screen.getByTestId('holographic-foil-sheen-layer').style.opacity).toBe('0');
  });
});
