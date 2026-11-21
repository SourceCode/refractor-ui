import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CheckpointRollbackStrip, type AgentCheckpoint } from './index';

const SAMPLE_CHECKPOINTS: AgentCheckpoint[] = [
  {
    id: 'cp-1',
    label: 'Init workspace',
    turn: 1,
    timestamp: '10:02:11',
    filesChanged: 1,
    summary: 'Bootstrapped core package configuration.',
  },
  {
    id: 'cp-2',
    label: 'Implement parser',
    turn: 2,
    timestamp: '10:06:44',
    filesChanged: 4,
  },
  {
    id: 'cp-3',
    label: 'Add unit suite',
    turn: 3,
    timestamp: '10:11:05',
    filesChanged: 0,
    summary: 'Added 98% coverage Vitest assertions.',
  },
];

describe('CheckpointRollbackStrip', () => {
  it('defaults active selection to the last checkpoint, highlights it with --prism-primary-main, and fires select/rollback/fork', () => {
    const ref = createRef<HTMLDivElement>();
    const onSelectCheckpoint = vi.fn<(cp: AgentCheckpoint) => void>();
    const onRollback = vi.fn<(cp: AgentCheckpoint) => void>();
    const onFork = vi.fn<(cp: AgentCheckpoint) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CheckpointRollbackStrip: { className: 'theme-strip', style: { maxWidth: '680px' } },
          },
        }}
      >
        <CheckpointRollbackStrip
          ref={ref}
          checkpoints={SAMPLE_CHECKPOINTS}
          onSelectCheckpoint={onSelectCheckpoint}
          onRollback={onRollback}
          onFork={onFork}
          className="local-strip"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="checkpoint-root"
        />
      </PrismThemeProvider>
    );

    const region = screen.getByRole('region', { name: 'Agent checkpoints' });
    expect(ref.current).toBe(region);
    expect(region).toHaveClass(
      'refractor-checkpoint-rollback-strip',
      'prism-slab',
      'theme-strip',
      'local-strip'
    );
    expect(region).toHaveStyle({ maxWidth: '680px' });
    expect(region).toHaveAttribute('data-active-checkpoint-id', 'cp-3');

    const pill1 = screen.getByTestId('checkpoint-pill-cp-1');
    const pill2 = screen.getByTestId('checkpoint-pill-cp-2');
    const pill3 = screen.getByTestId('checkpoint-pill-cp-3');

    // Last checkpoint is active by default
    expect(pill3).toHaveAttribute('aria-pressed', 'true');
    expect(pill3).toHaveAttribute('data-active', 'true');
    expect(pill3.style.borderColor).toBe('var(--prism-primary-main)');
    expect(pill1).toHaveAttribute('aria-pressed', 'false');
    expect(pill1.style.borderColor).toBe('transparent');

    // Singular vs plural file count formatting
    expect(screen.getByTestId('checkpoint-files-cp-1')).toHaveTextContent('1 file');
    expect(screen.getByTestId('checkpoint-files-cp-2')).toHaveTextContent('4 files');
    expect(screen.getByTestId('checkpoint-files-cp-3')).toHaveTextContent('0 files');

    // Footer shows active checkpoint timestamp & summary
    expect(screen.getByTestId('checkpoint-timestamp')).toHaveTextContent('10:11:05');
    expect(screen.getByTestId('checkpoint-summary')).toHaveTextContent(
      'Added 98% coverage Vitest assertions.'
    );

    // Selecting cp-2 updates active checkpoint and hides summary when absent
    fireEvent.click(pill2);
    expect(onSelectCheckpoint).toHaveBeenCalledWith(SAMPLE_CHECKPOINTS[1]);
    expect(pill2).toHaveAttribute('aria-pressed', 'true');
    expect(pill3).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('checkpoint-timestamp')).toHaveTextContent('10:06:44');
    expect(screen.queryByTestId('checkpoint-summary')).not.toBeInTheDocument();

    // Rollback & Fork Conversation invoke callbacks with currently active checkpoint
    fireEvent.click(screen.getByRole('button', { name: 'Rollback' }));
    expect(onRollback).toHaveBeenCalledTimes(1);
    expect(onRollback).toHaveBeenCalledWith(SAMPLE_CHECKPOINTS[1]);

    fireEvent.click(screen.getByRole('button', { name: 'Fork Conversation' }));
    expect(onFork).toHaveBeenCalledTimes(1);
    expect(onFork).toHaveBeenCalledWith(SAMPLE_CHECKPOINTS[1]);
  });

  it('supports controlled activeCheckpointId, defaultActiveCheckpointId, and graceful fallback when ID is missing', () => {
    function ControlledStripHarness() {
      const [activeId, setActiveId] = useState<string>('cp-1');
      return (
        <CheckpointRollbackStrip
          checkpoints={SAMPLE_CHECKPOINTS}
          activeCheckpointId={activeId}
          onSelectCheckpoint={(cp) => setActiveId(cp.id)}
        />
      );
    }

    const { rerender, unmount } = render(<ControlledStripHarness />);
    expect(screen.getByTestId('checkpoint-pill-cp-1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('checkpoint-summary')).toHaveTextContent(
      'Bootstrapped core package configuration.'
    );

    fireEvent.click(screen.getByTestId('checkpoint-pill-cp-3'));
    expect(screen.getByTestId('checkpoint-pill-cp-3')).toHaveAttribute('aria-pressed', 'true');

    // Unknown activeCheckpointId gracefully falls back to the last checkpoint
    rerender(
      <CheckpointRollbackStrip
        checkpoints={SAMPLE_CHECKPOINTS}
        activeCheckpointId="cp-nonexistent"
      />
    );
    expect(screen.getByTestId('checkpoint-pill-cp-3')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('checkpoint-timestamp')).toHaveTextContent('10:11:05');

    unmount();

    // defaultActiveCheckpointId initializes uncontrolled mode on mount
    render(
      <CheckpointRollbackStrip
        checkpoints={SAMPLE_CHECKPOINTS}
        defaultActiveCheckpointId="cp-1"
      />
    );
    expect(screen.getByTestId('checkpoint-pill-cp-1')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders clean empty state when checkpoints array is empty', () => {
    render(<CheckpointRollbackStrip checkpoints={[]} data-testid="empty-strip" />);

    expect(screen.getByTestId('empty-strip')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('checkpoint-empty-state')).toHaveTextContent(
      'No checkpoints recorded yet.'
    );
    expect(screen.queryByTestId('checkpoint-detail-footer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rollback' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fork Conversation' })).not.toBeInTheDocument();
  });

  it('clamps negative and non-finite turn and filesChanged counts to >= 0 (negative/edge test)', () => {
    const edgeCheckpoints: AgentCheckpoint[] = [
      {
        id: 'cp-neg',
        label: 'Negative counts',
        turn: -5,
        timestamp: '00:00:00',
        filesChanged: -12,
      },
      {
        id: 'cp-nan',
        label: 'NaN counts',
        turn: Number.NaN,
        timestamp: '00:00:01',
        filesChanged: Number.POSITIVE_INFINITY,
      },
    ];

    render(<CheckpointRollbackStrip checkpoints={edgeCheckpoints} />);

    expect(screen.getByTestId('checkpoint-pill-cp-neg')).toHaveTextContent('Turn 0');
    expect(screen.getByTestId('checkpoint-files-cp-neg')).toHaveTextContent('0 files');
    expect(screen.getByTestId('checkpoint-pill-cp-nan')).toHaveTextContent('Turn 0');
    expect(screen.getByTestId('checkpoint-files-cp-nan')).toHaveTextContent('0 files');
  });

  it('disables checkpoint pills, Rollback, and Fork Conversation when disabled is true (negative test)', () => {
    const onSelectCheckpoint = vi.fn();
    const onRollback = vi.fn();
    const onFork = vi.fn();

    render(
      <CheckpointRollbackStrip
        checkpoints={SAMPLE_CHECKPOINTS}
        disabled
        onSelectCheckpoint={onSelectCheckpoint}
        onRollback={onRollback}
        onFork={onFork}
        data-testid="disabled-strip"
      />
    );

    expect(screen.getByTestId('disabled-strip')).toHaveAttribute('data-disabled', 'true');
    const pill1 = screen.getByTestId('checkpoint-pill-cp-1');
    const rollbackBtn = screen.getByRole('button', { name: 'Rollback' });
    const forkBtn = screen.getByRole('button', { name: 'Fork Conversation' });

    expect(pill1).toBeDisabled();
    expect(rollbackBtn).toBeDisabled();
    expect(forkBtn).toBeDisabled();

    fireEvent.click(pill1);
    fireEvent.click(rollbackBtn);
    fireEvent.click(forkBtn);

    expect(onSelectCheckpoint).not.toHaveBeenCalled();
    expect(onRollback).not.toHaveBeenCalled();
    expect(onFork).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS payloads in checkpoint label, timestamp, and summary as literal text', () => {
    const payload = '<script>window.__cpXss=1</script><img src=x onerror=alert(1)>';

    render(
      <CheckpointRollbackStrip
        checkpoints={[
          {
            id: 'cp-xss',
            label: payload,
            turn: 1,
            timestamp: payload,
            filesChanged: 2,
            summary: payload,
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(payload)).toHaveLength(3);
  });
});
