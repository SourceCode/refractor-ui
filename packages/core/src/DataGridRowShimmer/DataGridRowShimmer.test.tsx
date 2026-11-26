import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataGridRowShimmer } from './DataGridRowShimmer';

describe('DataGridRowShimmer', () => {
  it('renders staggered skeleton rows inside an overflow-x-auto table and cross-fades to children once loaded', () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <DataGridRowShimmer
        ref={ref}
        loading
        rows={4}
        columns={['Service', 'Region', 'P95']}
        staggerMs={80}
        label="Loading services"
      >
        <div>Live Service Grid</div>
      </DataGridRowShimmer>
    );

    const status = screen.getByRole('status', { name: 'Loading services' });
    expect(ref.current).toBe(status);
    expect(screen.getAllByTestId('data-grid-row-shimmer-row')).toHaveLength(4);
    expect(screen.getByText('Service')).toBeInTheDocument();

    const waves = screen.getAllByTestId('data-grid-row-shimmer-wave');
    expect(waves[0]?.style.animationDelay).toBe('0ms');
    expect(waves[3]?.style.animationDelay).toBe('80ms');

    rerender(
      <DataGridRowShimmer ref={ref} loading={false}>
        <div>Live Service Grid</div>
      </DataGridRowShimmer>
    );
    expect(screen.getByText('Live Service Grid')).toBeInTheDocument();
  });

  it('handles empty columns fallback, non-finite row counts, and non-animated mode safely', () => {
    render(
      <DataGridRowShimmer loading rows={Number.NaN} columns={[]} animated={false} />
    );
    expect(screen.getAllByTestId('data-grid-row-shimmer-row')).toHaveLength(5);
    expect(screen.queryAllByTestId('data-grid-row-shimmer-wave')).toHaveLength(0);
  });
});
