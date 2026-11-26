import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AcousticActivityBar } from './AcousticActivityBar';

describe('AcousticActivityBar', () => {
  it('renders autonomous optical equalizer bars with React 19 ref and live levels binding', () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <AcousticActivityBar ref={ref} barCount={7} active tone="emerald" showLabel label="Voice input live" />
    );

    expect(ref.current).toBe(screen.getByRole('status', { name: 'Voice input live' }));
    expect(screen.getByText('Voice input live')).toBeInTheDocument();
    const bars = screen.getAllByTestId('acoustic-activity-bar-item');
    expect(bars).toHaveLength(7);
    expect(bars[0]?.className).toContain('prism-fx-acoustic-bar');

    rerender(
      <AcousticActivityBar ref={ref} levels={[0.25, 0.85, 0.5, Number.NaN]} active tone="cobalt" />
    );
    const liveBars = screen.getAllByTestId('acoustic-activity-bar-item');
    expect(liveBars).toHaveLength(4);
    expect(liveBars[1]?.style.height).toBe('85%');
  });

  it('pauses cleanly when inactive and clamps out-of-range barCount/heightPx', () => {
    render(<AcousticActivityBar active={false} barCount={99} heightPx={Number.NaN} />);
    const bars = screen.getAllByTestId('acoustic-activity-bar-item');
    expect(bars).toHaveLength(24);
    expect(bars[0]?.className).not.toContain('prism-fx-acoustic-bar');
  });
});
