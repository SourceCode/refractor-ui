import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { PrismaticCursorHalo } from './PrismaticCursorHalo';

describe('PrismaticCursorHalo', () => {
  it('tracks pointer coordinates via CSS variables without losing children or React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onMove = vi.fn();
    render(
      <PrismThemeProvider loadFonts={false}>
        <PrismaticCursorHalo
          ref={ref}
          radiusPx={260}
          intensity={0.85}
          spectrum="aurora"
          onPointerMove={onMove}
          data-testid="halo-root"
        >
          <button type="button">Inspect Surface</button>
        </PrismaticCursorHalo>
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('halo-root');
    expect(ref.current).toBe(root);
    expect(root.getAttribute('data-spectrum')).toBe('aurora');

    const spotlight = screen.getByTestId('prismatic-cursor-halo-spotlight');
    expect(spotlight.style.opacity).toBe('0');

    fireEvent.pointerEnter(root, { clientX: 80, clientY: 40 });
    expect(spotlight.style.opacity).toBe('0.85');
    expect(root.style.getPropertyValue('--prism-halo-x')).toBe('80px');
    expect(root.style.getPropertyValue('--prism-halo-y')).toBe('40px');

    fireEvent.pointerMove(root, { clientX: 120, clientY: 60 });
    expect(onMove).toHaveBeenCalledTimes(1);

    fireEvent.pointerLeave(root);
    expect(spotlight.style.opacity).toBe('0');
  });

  it('supports keyboard focus parity, borderGlow toggle, disabled guard, and non-finite clamping', () => {
    render(
      <PrismaticCursorHalo radiusPx={Number.NaN} intensity={99} borderGlow={false} data-testid="halo-kb">
        <input aria-label="Workspace query" />
      </PrismaticCursorHalo>
    );

    const root = screen.getByTestId('halo-kb');
    expect(screen.queryByTestId('prismatic-cursor-halo-border')).toBeNull();
    expect(root.style.getPropertyValue('--prism-halo-r')).toBe('240px');

    const input = screen.getByLabelText('Workspace query');
    fireEvent.focus(input);
    expect(screen.getByTestId('prismatic-cursor-halo-spotlight').style.opacity).toBe('1');
    fireEvent.blur(input);
    expect(screen.getByTestId('prismatic-cursor-halo-spotlight').style.opacity).toBe('0');
  });

  it('suppresses spotlight when disabled', () => {
    render(
      <PrismaticCursorHalo disabled spectrum="solar" data-testid="halo-disabled">
        <span>Static panel</span>
      </PrismaticCursorHalo>
    );
    const root = screen.getByTestId('halo-disabled');
    fireEvent.pointerEnter(root, { clientX: 50, clientY: 50 });
    fireEvent.pointerMove(root, { clientX: 70, clientY: 70 });
    fireEvent.focus(root);
    expect(screen.getByTestId('prismatic-cursor-halo-spotlight').style.opacity).toBe('0');
  });
});
