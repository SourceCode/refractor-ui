import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SegmentedGlassProgress } from './SegmentedGlassProgress';

describe('SegmentedGlassProgress', () => {
  it('renders discrete optical segments, percentage readout, ARIA progressbar attributes, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SegmentedGlassProgress ref={ref} value={75} max={100} segments={8} tone="emerald" label="Bundle optimization" />
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    const bar = screen.getByRole('progressbar', { name: 'Bundle optimization' });
    expect(bar).toHaveAttribute('aria-valuenow', '75');
    expect(bar).toHaveAttribute('aria-valuetext', '75%');
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getAllByTestId('segmented-glass-progress-segment')).toHaveLength(8);
  });

  it('supports indeterminate sweep mode, hidden percentage, and non-finite clamping', () => {
    const { rerender } = render(
      <SegmentedGlassProgress indeterminate label="Indexing workspace" tone="cobalt" />
    );
    const bar = screen.getByRole('progressbar', { name: 'Indexing workspace' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByTestId('segmented-glass-progress-indeterminate')).toBeInTheDocument();

    rerender(
      <SegmentedGlassProgress value={Number.NaN} max={-5} segments={99} showPercentage={false} label="Clamped" />
    );
    expect(screen.getAllByTestId('segmented-glass-progress-segment')).toHaveLength(20);
  });
});
