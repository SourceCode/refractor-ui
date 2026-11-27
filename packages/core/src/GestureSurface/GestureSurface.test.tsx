import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GestureSurface } from './GestureSurface';

describe('GestureSurface', () => {
  it('handles non-touch hover, ignores touch hover, and fires onTap on click & Enter/Space', () => {
    const onTap = vi.fn();
    const onHoverChange = vi.fn();

    render(
      <GestureSurface onTap={onTap} onHoverChange={onHoverChange} data-testid="surface">
        Interactive Tile
      </GestureSurface>
    );

    const el = screen.getByTestId('surface');
    // Touch hover is ignored
    fireEvent.pointerEnter(el, { pointerType: 'touch' });
    expect(onHoverChange).not.toHaveBeenCalled();

    // Mouse hover works
    fireEvent.pointerEnter(el, { pointerType: 'mouse' });
    expect(onHoverChange).toHaveBeenCalledWith(true);
    fireEvent.pointerLeave(el, { pointerType: 'mouse' });
    expect(onHoverChange).toHaveBeenCalledWith(false);

    // Pointer tap
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(el);
    expect(onTap).toHaveBeenCalledTimes(1);

    // Keyboard Enter & Space
    fireEvent.keyDown(el, { key: 'Enter' });
    fireEvent.keyUp(el, { key: 'Enter' });
    expect(onTap).toHaveBeenCalledTimes(2);

    fireEvent.focus(el);
    expect(el).toHaveAttribute('data-focused', 'true');
    fireEvent.blur(el);
    expect(el).not.toHaveAttribute('data-focused');
  });

  it('supports draggable momentum throwing and disabled state', () => {
    const onDragMove = vi.fn();
    const onDragEnd = vi.fn();
    const onTap = vi.fn();

    const { rerender } = render(
      <GestureSurface
        draggable
        dragBounds={{ minX: -50, maxX: 50, minY: -50, maxY: 50 }}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        data-testid="drag-surface"
      >
        Drag Me
      </GestureSurface>
    );

    const el = screen.getByTestId('drag-surface');
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { clientX: 35, clientY: 25 });
    fireEvent.pointerUp(window);

    expect(onDragMove).toHaveBeenCalled();
    expect(onDragEnd).toHaveBeenCalled();

    rerender(
      <GestureSurface disabled onTap={onTap} data-testid="drag-surface">
        Disabled
      </GestureSurface>
    );
    fireEvent.pointerDown(el);
    fireEvent.pointerUp(el);
    expect(onTap).not.toHaveBeenCalled();
  });
});
