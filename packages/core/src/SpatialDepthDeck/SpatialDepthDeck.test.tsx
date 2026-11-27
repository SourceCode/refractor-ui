import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MotionConfigProvider } from '../motion/MotionConfigProvider';
import { SpatialDepthDeck } from './SpatialDepthDeck';

const LAYERS = [
  { id: 'l1', title: 'Primary Lens', subtitle: 'Front optical plane' },
  { id: 'l2', title: 'Middle Glass', subtitle: 'Mid depth plane' },
  { id: 'l3', title: 'Deep Backdrop', subtitle: 'Background caustic plane' },
];

describe('SpatialDepthDeck', () => {
  it('cycles layers via clicks and keyboard arrows across all 3D patterns', () => {
    const onActiveIndexChange = vi.fn();
    render(
      <SpatialDepthDeck
        layers={LAYERS}
        pattern="spin-blur"
        onActiveIndexChange={onActiveIndexChange}
      />
    );

    const region = screen.getByRole('region', { name: '3D Spatial Depth Deck' });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(onActiveIndexChange).toHaveBeenCalledWith(1);

    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(onActiveIndexChange).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole('button', { name: /Deep Backdrop/i }));
    expect(onActiveIndexChange).toHaveBeenCalledWith(2);

    fireEvent.pointerMove(region, { clientX: 50, clientY: 50, pointerType: 'mouse' });
    fireEvent.pointerLeave(region);
  });

  it('flattens 3D transforms in calm reduced-motion mode', () => {
    render(
      <MotionConfigProvider reducedMotion="calm">
        <SpatialDepthDeck layers={LAYERS} pattern="deeper-elements" />
      </MotionConfigProvider>
    );
    expect(screen.getByRole('region')).toHaveAttribute('data-calm', 'true');
  });
});
