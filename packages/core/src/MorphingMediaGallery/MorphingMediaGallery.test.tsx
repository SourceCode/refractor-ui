import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MorphingMediaGallery } from './MorphingMediaGallery';

const ITEMS = [
  { id: '1', title: 'Refractive Slab', caption: 'Alabaster light mode', badge: '2D/3D' },
  { id: '2', title: 'Caustic Prism', caption: 'Obsidian dark mode', badge: 'GLSL' },
  { id: '3', title: 'Fluid Mesh', caption: 'Adaptive accent glow', badge: '120fps' },
];

describe('MorphingMediaGallery', () => {
  it('switches between 2D grid, 3D carousel, coverflow, and detail views with keyboard navigation', () => {
    const onViewModeChange = vi.fn();
    const onActiveIndexChange = vi.fn();

    render(
      <MorphingMediaGallery
        items={ITEMS}
        onViewModeChange={onViewModeChange}
        onActiveIndexChange={onActiveIndexChange}
      />
    );

    const region = screen.getByRole('region', { name: 'Morphing Media Gallery' });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(onActiveIndexChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('tab', { name: 'Coverflow' }));
    expect(onViewModeChange).toHaveBeenCalledWith('coverflow-3d');

    fireEvent.click(screen.getByRole('tab', { name: 'Detail' }));
    expect(onViewModeChange).toHaveBeenCalledWith('detail');

    fireEvent.keyDown(region, { key: 'Escape' });
    expect(onViewModeChange).toHaveBeenCalledWith('grid-2d');

    fireEvent.click(screen.getByRole('button', { name: 'Next media item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous media item' }));
    expect(onActiveIndexChange).toHaveBeenCalled();
  });
});
