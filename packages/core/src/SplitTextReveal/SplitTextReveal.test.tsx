import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MotionConfigProvider } from '../motion/MotionConfigProvider';
import { SplitTextReveal } from './SplitTextReveal';

describe('SplitTextReveal', () => {
  it('segments text by words, chars, and lines while preserving single aria-label', () => {
    const { rerender } = render(
      <SplitTextReveal text="Optical Glass Motion" splitBy="words" revealed />
    );
    expect(screen.getByLabelText('Optical Glass Motion')).toBeInTheDocument();

    rerender(<SplitTextReveal text="Prism" splitBy="chars" revealed={false} />);
    expect(screen.getByLabelText('Prism')).not.toHaveAttribute('data-revealed');

    rerender(<SplitTextReveal text={'Line One\nLine Two'} splitBy="lines" revealed />);
    expect(screen.getByLabelText(/Line One\s+Line Two/)).toBeInTheDocument();
  });

  it('respects calm reduced-motion mode', () => {
    render(
      <MotionConfigProvider reducedMotion="calm">
        <SplitTextReveal text="Calm Reveal" data-testid="calm-split" />
      </MotionConfigProvider>
    );
    expect(screen.getByTestId('calm-split')).toHaveAttribute('data-calm', 'true');
  });
});
