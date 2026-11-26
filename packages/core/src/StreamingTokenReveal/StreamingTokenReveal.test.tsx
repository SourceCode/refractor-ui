import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StreamingTokenReveal } from './StreamingTokenReveal';

describe('StreamingTokenReveal', () => {
  it('progressively reveals streamed tokens and fires onRevealComplete with React 19 ref', () => {
    vi.useFakeTimers();
    const ref = createRef<HTMLDivElement>();
    const onComplete = vi.fn();

    try {
      render(
        <StreamingTokenReveal
          ref={ref}
          text="Optical glass shaders render smoothly."
          revealRateMs={30}
          chunkSize={2}
          onRevealComplete={onComplete}
          label="AI output"
        />
      );

      const region = screen.getByRole('region', { name: 'AI output' });
      expect(ref.current).toBe(region);
      expect(screen.getByTestId('streaming-token-reveal-edge')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.getByTestId('streaming-token-reveal-body').textContent).toContain(
        'Optical glass shaders render smoothly.'
      );
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('streaming-token-reveal-edge')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reveals immediately with skipAnimation and safely renders XSS-like payloads as text', () => {
    render(
      <StreamingTokenReveal
        text="<script>alert(1)</script> safe"
        skipAnimation
        streaming
      />
    );
    expect(screen.getByTestId('streaming-token-reveal-body').textContent).toContain('<script>alert(1)</script>');
    expect(screen.getByTestId('streaming-token-reveal-edge')).toBeInTheDocument();
  });
});
