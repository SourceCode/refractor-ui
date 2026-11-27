import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MotionPerformanceDoctor } from './MotionPerformanceDoctor';

describe('MotionPerformanceDoctor', () => {
  it('grades clean compositor animations as A (100/100)', () => {
    render(
      <MotionPerformanceDoctor
        sourceCode=".card { transition: transform 180ms ease; } @media (prefers-reduced-motion: reduce) { .card { transition: none; } }"
        frameDurationsMs={[8.2, 8.4, 8.1, 8.3]}
        data-testid="doctor"
      />
    );
    expect(screen.getByTestId('doctor')).toHaveAttribute('data-motion-grade', 'A');
    expect(screen.getByTestId('doctor')).toHaveAttribute('data-motion-score', '100');
  });

  it('flags layout-thrashing transition-all, animated backdrop-filter, and dropped frames', () => {
    render(
      <MotionPerformanceDoctor
        sourceCode=".bad { transition-all; transition: width 300ms, backdrop-filter 300ms; canvas.getContext('webgl'); }"
        frameDurationsMs={[16, 18, 32, 41, 38]}
        data-testid="doctor-bad"
      />
    );
    expect(screen.getByText(/transition-all/i)).toBeInTheDocument();
    expect(screen.getByText(/p95 frame time/i)).toBeInTheDocument();
    const score = Number(screen.getByTestId('doctor-bad').getAttribute('data-motion-score'));
    expect(score).toBeLessThan(60);
  });
});
