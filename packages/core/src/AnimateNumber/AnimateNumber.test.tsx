import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MotionConfigProvider } from '../motion/MotionConfigProvider';
import { AnimateNumber } from './AnimateNumber';

describe('AnimateNumber', () => {
  it('formats numeric readouts with prefix, suffix, and fixed decimals', () => {
    const { rerender } = render(
      <AnimateNumber value={1240.5} decimals={1} prefix="$" suffix=" USD" durationMs={0} />
    );
    expect(screen.getByText('$1,240.5 USD')).toBeInTheDocument();

    rerender(
      <AnimateNumber value={-12.4} decimals={1} suffix=" dB" durationMs={0} live="polite" />
    );
    expect(screen.getByText('-12.4 dB')).toBeInTheDocument();
  });

  it('snaps immediately in calm reduced-motion mode and handles NaN safely', () => {
    render(
      <MotionConfigProvider reducedMotion="calm">
        <AnimateNumber value={Number.NaN} data-testid="num" />
      </MotionConfigProvider>
    );
    expect(screen.getByTestId('num')).toHaveTextContent('0');
  });
});
