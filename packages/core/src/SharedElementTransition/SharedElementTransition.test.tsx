import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MotionConfigProvider } from '../motion/MotionConfigProvider';
import { SharedElementTransition, SharedLayoutProvider } from './SharedElementTransition';

describe('SharedElementTransition', () => {
  it('morphs across shared layoutId when switching tabs or views', () => {
    let toggle = false;
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => {
      const left = toggle ? 140 : 10;
      const width = toggle ? 220 : 100;
      return { left, top: 10, width, height: 40, right: left + width, bottom: 50, x: left, y: 10, toJSON: () => ({}) } as DOMRect;
    });

    const { rerender } = render(
      <SharedLayoutProvider>
        <SharedElementTransition key="tab-a" layoutId="active-pill" data-testid="pill">
          Tab A
        </SharedElementTransition>
      </SharedLayoutProvider>
    );
    expect(screen.getByTestId('pill')).toHaveAttribute('data-layout-id', 'active-pill');

    toggle = true;
    rerender(
      <SharedLayoutProvider>
        <SharedElementTransition key="tab-b" layoutId="active-pill" borderRadiusPx={18} data-testid="pill">
          Tab B
        </SharedElementTransition>
      </SharedLayoutProvider>
    );
    expect(screen.getByText('Tab B')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('respects calm reduced-motion mode', () => {
    render(
      <MotionConfigProvider reducedMotion="calm">
        <SharedLayoutProvider>
          <SharedElementTransition layoutId="modal-card" data-testid="shared-calm">
            Calm Shared
          </SharedElementTransition>
        </SharedLayoutProvider>
      </MotionConfigProvider>
    );
    expect(screen.getByTestId('shared-calm')).toHaveAttribute('data-calm', 'true');
  });
});
