import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RefractiveLensContainer } from './RefractiveLensContainer';

describe('RefractiveLensContainer', () => {
  it('renders lens distortion shader host with IOR data attribute, pointer tracking, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onMove = vi.fn();
    render(
      <RefractiveLensContainer
        ref={ref}
        ior={1.65}
        magnification={1.06}
        onPointerMove={onMove}
        data-testid="lens-root"
      >
        <div className="p-4">Optical Acrylic Panel</div>
      </RefractiveLensContainer>
    );

    const root = screen.getByTestId('lens-root');
    expect(ref.current).toBe(root);
    expect(root.getAttribute('data-ior')).toBe('1.65');
    expect(screen.getByText('Optical Acrylic Panel')).toBeInTheDocument();

    fireEvent.pointerMove(root, { clientX: 90, clientY: 45 });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(root.style.getPropertyValue('--prism-lens-x')).toMatch(/%$/);
  });

  it('clamps invalid non-finite numeric props and skips pointer updates when non-interactive', () => {
    render(
      <RefractiveLensContainer
        ior={Number.NaN}
        lensRadius={99}
        magnification={1}
        interactive={false}
        disableWebGL
        data-testid="lens-static"
      >
        <span>Static lens</span>
      </RefractiveLensContainer>
    );

    const root = screen.getByTestId('lens-static');
    expect(root.getAttribute('data-ior')).toBe('1.49');
    fireEvent.pointerMove(root, { clientX: 30, clientY: 30 });
    expect(root.style.getPropertyValue('--prism-lens-x')).toBe('');
  });
});
