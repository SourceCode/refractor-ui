import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FluidMeshCanvas } from './FluidMeshCanvas';

describe('FluidMeshCanvas', () => {
  it('renders ambient mesh canvas with CSS fallback in jsdom and reacts to pointer & mood updates', () => {
    const ref = createRef<HTMLDivElement>();
    const onMove = vi.fn();
    const { rerender } = render(
      <FluidMeshCanvas ref={ref} mood="thinking" cadence={0.8} onPointerMove={onMove} data-testid="mesh-root">
        <div className="p-4">Glass Card Content</div>
      </FluidMeshCanvas>
    );

    const root = screen.getByTestId('mesh-root');
    expect(ref.current).toBe(root);
    expect(root.getAttribute('data-mood')).toBe('thinking');
    expect(screen.getByTestId('fluid-mesh-canvas-gl').getAttribute('data-renderer')).toBe('css-fallback');
    expect(screen.getByText('Glass Card Content')).toBeInTheDocument();

    fireEvent.pointerMove(root, { clientX: 120, clientY: 60 });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(root.style.getPropertyValue('--prism-mesh-x')).toMatch(/%$/);

    rerender(
      <FluidMeshCanvas ref={ref} mood="alert" cadence={Number.NaN} intensity={99} animated={false} data-testid="mesh-root">
        <div>Updated</div>
      </FluidMeshCanvas>
    );
    expect(root.getAttribute('data-mood')).toBe('alert');
    expect(screen.getByTestId('fluid-mesh-canvas-fallback').className).not.toContain('prism-fx-caustic-overlay');
  });
});
