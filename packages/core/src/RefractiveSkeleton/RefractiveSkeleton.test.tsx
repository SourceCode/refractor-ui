import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RefractiveSkeleton, type RefractiveSkeletonPreset } from './RefractiveSkeleton';

describe('RefractiveSkeleton', () => {
  it('renders frosted optical skeleton across all presets and reveals children once loading finishes', () => {
    const ref = createRef<HTMLDivElement>();
    const presets: RefractiveSkeletonPreset[] = ['card', 'profile', 'article', 'media', 'metrics'];

    const { rerender } = render(
      <RefractiveSkeleton ref={ref} loading preset="card" lines={4} label="Loading analytics">
        <div>Loaded Dashboard</div>
      </RefractiveSkeleton>
    );

    expect(ref.current).toBe(screen.getByRole('status', { name: 'Loading analytics' }));
    expect(screen.queryByText('Loaded Dashboard')).toBeNull();

    for (const preset of presets) {
      rerender(
        <RefractiveSkeleton ref={ref} loading preset={preset} lines={3} animated={preset !== 'media'}>
          <div>Loaded Dashboard</div>
        </RefractiveSkeleton>
      );
      expect(screen.getByRole('status').getAttribute('data-preset')).toBe(preset);
    }

    rerender(
      <RefractiveSkeleton ref={ref} loading={false}>
        <div>Loaded Dashboard</div>
      </RefractiveSkeleton>
    );
    expect(screen.getByText('Loaded Dashboard')).toBeInTheDocument();
  });

  it('clamps non-finite lines and speed safely', () => {
    render(<RefractiveSkeleton loading lines={Number.NaN} speedSeconds={-10} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });
});
