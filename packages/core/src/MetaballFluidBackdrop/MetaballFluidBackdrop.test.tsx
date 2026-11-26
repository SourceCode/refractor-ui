import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MetaballFluidBackdrop } from './MetaballFluidBackdrop';

describe('MetaballFluidBackdrop', () => {
  it('renders bounded orb count with CSS fallback and pointer interaction', () => {
    const ref = createRef<HTMLDivElement>();
    const onMove = vi.fn();
    render(
      <MetaballFluidBackdrop ref={ref} orbCount={4} onPointerMove={onMove} data-testid="meta-root">
        <div className="p-4">Frosted Glass Deck</div>
      </MetaballFluidBackdrop>
    );

    const root = screen.getByTestId('meta-root');
    expect(ref.current).toBe(root);
    expect(root.getAttribute('data-orb-count')).toBe('4');
    expect(screen.getAllByTestId('metaball-fluid-orb')).toHaveLength(4);
    expect(screen.getByText('Frosted Glass Deck')).toBeInTheDocument();

    fireEvent.pointerMove(root, { clientX: 100, clientY: 50 });
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it('clamps orbCount/speed safely and disables motion when animated=false', () => {
    render(
      <MetaballFluidBackdrop orbCount={99} speed={Number.NaN} animated={false} interactive={false} disableWebGL data-testid="meta-clamped">
        <span>Static</span>
      </MetaballFluidBackdrop>
    );
    expect(screen.getByTestId('meta-clamped').getAttribute('data-orb-count')).toBe('5');
    expect(screen.getAllByTestId('metaball-fluid-orb')[0]?.className).not.toContain('prism-fx-metaball');
  });
});
