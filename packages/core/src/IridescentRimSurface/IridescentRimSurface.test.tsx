import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IridescentRimSurface } from './IridescentRimSurface';

describe('IridescentRimSurface', () => {
  it('updates rim angle CSS custom properties on pointer movement and deviceorientation tilt', () => {
    const ref = createRef<HTMLDivElement>();
    const onMove = vi.fn();
    const { unmount } = render(
      <IridescentRimSurface
        ref={ref}
        spectrum="arctic"
        enableTilt
        onPointerMove={onMove}
        data-testid="rim-root"
      >
        <div className="p-4">Dichroic Tile</div>
      </IridescentRimSurface>
    );

    const root = screen.getByTestId('rim-root');
    expect(ref.current).toBe(root);
    expect(root.getAttribute('data-spectrum')).toBe('arctic');

    fireEvent.pointerMove(root, { clientX: 140, clientY: 30 });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(root.style.getPropertyValue('--prism-rim-angle')).toMatch(/deg$/);

    unmount();

    // Fresh mount to verify passive deviceorientation tilt leading-edge response directly
    const { getByTestId, unmount: unmountTilt } = render(
      <IridescentRimSurface spectrum="dichroic" enableTilt data-testid="rim-tilt">
        <span>Tilt card</span>
      </IridescentRimSurface>
    );
    const tiltRoot = getByTestId('rim-tilt');
    const tiltEvt = new Event('deviceorientation') as DeviceOrientationEvent;
    Object.defineProperty(tiltEvt, 'gamma', { value: 20 });
    Object.defineProperty(tiltEvt, 'beta', { value: 15 });
    window.dispatchEvent(tiltEvt);
    expect(tiltRoot.style.getPropertyValue('--prism-rim-x')).toBe('70%');

    unmountTilt();
  });

  it('supports recessed non-elevated mode, disabled guard, and non-finite intensity clamping', () => {
    render(
      <IridescentRimSurface elevated={false} disabled intensity={Number.NaN} spectrum="amber-rose" data-testid="rim-off">
        <span>Recessed</span>
      </IridescentRimSurface>
    );
    const root = screen.getByTestId('rim-off');
    expect(root.className).toContain('prism-well');
    fireEvent.pointerMove(root, { clientX: 20, clientY: 20 });
    expect(screen.getByTestId('iridescent-rim-surface-rim').style.opacity).toBe('0.2');
  });
});
