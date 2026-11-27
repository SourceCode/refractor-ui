import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SvgPathAnimator } from './SvgPathAnimator';

describe('SvgPathAnimator', () => {
  it('renders built-in presets, custom pathData, and viewBox updates with prism-contain-box', () => {
    const { container, rerender } = render(
      <SvgPathAnimator preset="checkmark" progress={0.75} label="Upload complete" />
    );
    const root = screen.getByRole('img', { name: 'Upload complete' });
    expect(root).toHaveAttribute('data-progress', '75');
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('prism-contain-box');
    expect(svg).toHaveAttribute('viewBox', '0 0 100 100');

    rerender(
      <SvgPathAnimator
        preset="sparkline"
        pathData="M 0 50 L 50 10 L 100 40"
        viewBox={[0, 0, 120, 60]}
        progress={1}
        label="Custom sparkline"
      />
    );
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 120 60');
  });
});
