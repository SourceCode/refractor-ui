import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MotionConfigProvider } from '../motion/MotionConfigProvider';
import { LayoutMotionBox } from './LayoutMotionBox';

describe('LayoutMotionBox', () => {
  it('renders children and triggers scale-corrected FLIP layout transition on dependency change', () => {
    let rectCall = 0;
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => {
      rectCall += 1;
      if (rectCall === 1) {
        return { left: 0, top: 0, width: 120, height: 48, right: 120, bottom: 48, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      }
      return { left: 80, top: 20, width: 240, height: 96, right: 320, bottom: 116, x: 80, y: 20, toJSON: () => ({}) } as DOMRect;
    });

    const { rerender } = render(
      <LayoutMotionBox layoutDependency="compact" borderRadiusPx={20} data-testid="box">
        <span>Glass Pill</span>
      </LayoutMotionBox>
    );

    expect(screen.getByText('Glass Pill')).toBeInTheDocument();
    rerender(
      <LayoutMotionBox layoutDependency="expanded" borderRadiusPx={20} data-testid="box">
        <span>Glass Pill</span>
      </LayoutMotionBox>
    );

    expect(screen.getByTestId('box')).toHaveAttribute('data-layout', 'true');
    spy.mockRestore();
  });

  it('honors calm reduced-motion mode and animateLayout=false', () => {
    render(
      <MotionConfigProvider reducedMotion="calm">
        <LayoutMotionBox animateLayout={false} data-testid="calm-box">
          Calm Content
        </LayoutMotionBox>
      </MotionConfigProvider>
    );
    expect(screen.getByTestId('calm-box')).toHaveAttribute('data-calm', 'true');
    expect(screen.getByTestId('calm-box')).not.toHaveAttribute('data-layout');
  });
});
