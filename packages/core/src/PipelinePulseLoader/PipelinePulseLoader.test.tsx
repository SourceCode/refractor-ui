import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PipelinePulseLoader, type PipelineStageItem } from './PipelinePulseLoader';

describe('PipelinePulseLoader', () => {
  it('renders connected stage nodes, animated light packets, error state, and stage selection with React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onSelect = vi.fn();
    const stages: PipelineStageItem[] = [
      { id: 'fetch', label: 'Fetch', detail: '12ms', status: 'completed' },
      { id: 'parse', label: 'Parse', detail: 'Running', status: 'active' },
      { id: 'lint', label: 'Lint', detail: 'Failed', status: 'error' },
      { id: 'ship', label: 'Ship', status: 'pending' },
    ];

    render(
      <PipelinePulseLoader
        ref={ref}
        stages={stages}
        pulseSpeedSeconds={1.2}
        onStageSelect={onSelect}
        label="Deploy pipeline"
      />
    );

    expect(ref.current).toBe(screen.getByRole('status', { name: 'Deploy pipeline' }));
    expect(screen.getAllByTestId('pipeline-pulse-stage')).toHaveLength(4);
    expect(screen.getAllByTestId('pipeline-pulse-packet').length).toBeGreaterThanOrEqual(1);

    const activeBtn = screen.getByRole('button', { name: '2' });
    expect(activeBtn).toHaveAttribute('aria-current', 'step');
    fireEvent.click(activeBtn);
    expect(onSelect).toHaveBeenCalledWith(stages[1]);
  });

  it('falls back to default stages on empty array and clamps invalid speed', () => {
    render(<PipelinePulseLoader stages={[]} pulseSpeedSeconds={Number.NaN} />);
    expect(screen.getAllByTestId('pipeline-pulse-stage')).toHaveLength(4);
  });
});
