import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MotionConfigProvider } from '../motion/MotionConfigProvider';
import { MagneticCursor } from './MagneticCursor';

describe('MagneticCursor', () => {
  it('tracks pointer movement and snaps reticle to data-magnetic-target bounds', () => {
    render(
      <MagneticCursor data-testid="stage">
        <button type="button" data-magnetic-target="true">
          Magnetic CTA
        </button>
      </MagneticCursor>
    );

    const stage = screen.getByTestId('stage');
    const button = screen.getByRole('button', { name: 'Magnetic CTA' });

    fireEvent.pointerMove(button, { clientX: 40, clientY: 20, pointerType: 'mouse' });
    const reticle = stage.querySelector('[data-snapped]');
    expect(reticle).toHaveAttribute('data-snapped', 'true');

    fireEvent.pointerLeave(stage);
    expect(reticle).toHaveAttribute('data-snapped', 'false');
  });

  it('omits reticle when disabled or in calm reduced-motion mode', () => {
    const { container } = render(
      <MotionConfigProvider reducedMotion="calm">
        <MagneticCursor>
          <span>Calm Stage</span>
        </MagneticCursor>
      </MotionConfigProvider>
    );
    expect(container.querySelector('[data-snapped]')).toBeNull();
  });
});
