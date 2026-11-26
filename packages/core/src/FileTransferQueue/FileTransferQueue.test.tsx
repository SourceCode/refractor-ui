import { createRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  FileTransferQueue,
  type FileTransferJob,
  type FileTransferOpKindMap,
  type FileTransferStatusMap,
} from './index';

function dispatchKeyDownWithComposition(
  target: HTMLElement,
  init: KeyboardEventInit & { isComposing: boolean }
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  Object.defineProperty(event, 'isComposing', { value: init.isComposing });
  target.dispatchEvent(event);
  return event;
}

describe('FileTransferQueue', () => {
  it('renders Open-Internals contracts, default 4 concurrent jobs across all 4 ops, theme overrides, xstyle, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const opMapCheck: FileTransferOpKindMap = {
      copy: true,
      move: true,
      upload: true,
      extract: true,
    };
    const statusMapCheck: FileTransferStatusMap = {
      running: true,
      paused: true,
      queued: true,
      completed: true,
      canceled: true,
    };
    expect(Object.values(opMapCheck).every(Boolean)).toBe(true);
    expect(Object.values(statusMapCheck).every(Boolean)).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            FileTransferQueue: {
              className: 'theme-transfer-queue',
              style: { maxWidth: '680px' },
            },
          },
        }}
      >
        <FileTransferQueue
          ref={ref}
          className="local-transfer-queue"
          xstyle={{ '--prism-blur-px': '22px' }}
          style={{ marginTop: '12px' }}
          data-testid="transfer-queue-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('transfer-queue-root');
    expect(ref.current).toBe(root);
    expect(FileTransferQueue.displayName).toBe('FileTransferQueue');
    expect(root).toHaveClass(
      'refractor-file-transfer-queue',
      'prism-slab',
      'min-w-0',
      'max-w-full',
      'theme-transfer-queue',
      'local-transfer-queue'
    );
    expect(root).toHaveStyle({ maxWidth: '680px', marginTop: '12px' });
    expect(root).toHaveAttribute('role', 'region');

    // Header responsive contract, title, active count pill, live throughput, Clear Completed, Collapse toggle
    const header = screen.getByTestId('transfer-queue-header');
    expect(header).toHaveClass('flex-wrap', 'min-w-0');
    expect(screen.getByRole('heading', { name: 'File Transfer Queue' })).toBeInTheDocument();
    expect(screen.getByTestId('transfer-queue-active-count')).toHaveTextContent('3 active');
    expect(screen.getByTestId('transfer-queue-throughput')).toHaveTextContent('412.5 MB/s');
    expect(screen.getByTestId('transfer-clear-completed')).toBeEnabled();

    const collapseBtn = screen.getByTestId('transfer-toggle-collapse');
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
    expect(collapseBtn).toHaveTextContent('Collapse');

    // Default 4 concurrent jobs spanning copy, upload, extract, move and running, paused, queued, completed
    expect(screen.getByRole('list', { name: 'File Transfer Queue jobs' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);

    // Operation badges
    expect(screen.getByTestId('transfer-job-op-transfer-job-1')).toHaveTextContent('Copy');
    expect(screen.getByTestId('transfer-job-op-transfer-job-2')).toHaveTextContent('Upload');
    expect(screen.getByTestId('transfer-job-op-transfer-job-3')).toHaveTextContent('Extract');
    expect(screen.getByTestId('transfer-job-op-transfer-job-4')).toHaveTextContent('Move');

    // Semantic status pills & --prism-* color tokens
    expect(screen.getByTestId('transfer-job-status-transfer-job-1')).toHaveTextContent('Running');
    expect(screen.getByTestId('transfer-job-status-transfer-job-1').style.color).toBe(
      'var(--prism-info-main)'
    );

    expect(screen.getByTestId('transfer-job-status-transfer-job-2')).toHaveTextContent('Paused');
    expect(screen.getByTestId('transfer-job-status-transfer-job-2').style.color).toBe(
      'var(--prism-warning-main)'
    );

    expect(screen.getByTestId('transfer-job-status-transfer-job-3')).toHaveTextContent('Queued');
    expect(screen.getByTestId('transfer-job-status-transfer-job-3').style.color).toBe(
      'var(--prism-secondary-main)'
    );

    expect(screen.getByTestId('transfer-job-status-transfer-job-4')).toHaveTextContent('Completed');
    expect(screen.getByTestId('transfer-job-status-transfer-job-4').style.color).toBe(
      'var(--prism-success-main)'
    );

    // Route & truncation-safe readout
    expect(screen.getByTestId('transfer-job-route-transfer-job-1')).toHaveTextContent(
      '/Volumes/CFexpress_A/Dailies -> /Volumes/Studio_NAS/Projects/Prism'
    );
    expect(screen.getByTestId('transfer-job-source-transfer-job-1')).toHaveClass('truncate', 'min-w-0');
    expect(screen.getByTestId('transfer-job-target-transfer-job-1')).toHaveClass('truncate', 'min-w-0');

    // Accessible progressbars
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(4);
    expect(progressBars[0]).toHaveAttribute('aria-valuemin', '0');
    expect(progressBars[0]).toHaveAttribute('aria-valuemax', '100');
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '68');
    expect(progressBars[1]).toHaveAttribute('aria-valuenow', '44');
    expect(progressBars[2]).toHaveAttribute('aria-valuenow', '0');
    expect(progressBars[3]).toHaveAttribute('aria-valuenow', '100');

    // Speed & ETA readouts
    expect(screen.getByTestId('transfer-job-speed-transfer-job-1')).toHaveTextContent('412.5 MB/s');
    expect(screen.getByTestId('transfer-job-eta-transfer-job-1')).toHaveTextContent('00:42 remaining');
    expect(screen.getByTestId('transfer-job-speed-transfer-job-2')).toHaveTextContent('0.0 MB/s');

    // Polite live footer
    const liveStatus = screen.getByTestId('transfer-queue-live-status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(liveStatus).toHaveTextContent('4 transfers tracked · 412.5 MB/s aggregate.');
    expect(screen.getByTestId('transfer-queue-summary')).toHaveTextContent(
      '1 running · 1 paused · 1 queued · 1 finished'
    );
  });

  it('supports Pause, Resume (paused & queued), Cancel, Retry, Dismiss, and Clear Completed with callbacks and live throughput updates', () => {
    const onJobsChange = vi.fn<(jobs: ReadonlyArray<FileTransferJob>) => void>();
    const onPauseJob = vi.fn<(jobId: string) => void>();
    const onResumeJob = vi.fn<(jobId: string) => void>();
    const onCancelJob = vi.fn<(jobId: string) => void>();
    const onRetryJob = vi.fn<(jobId: string) => void>();

    render(
      <FileTransferQueue
        onJobsChange={onJobsChange}
        onPauseJob={onPauseJob}
        onResumeJob={onResumeJob}
        onCancelJob={onCancelJob}
        onRetryJob={onRetryJob}
      />
    );

    // 1. Resume paused job-2 (64.2 MB/s) -> aggregate throughput sums 412.5 + 64.2 = 476.7 MB/s
    fireEvent.click(screen.getByTestId('transfer-job-resume-transfer-job-2'));
    expect(onResumeJob).toHaveBeenCalledWith('transfer-job-2');
    expect(screen.getByTestId('transfer-job-status-transfer-job-2')).toHaveTextContent('Running');
    expect(screen.getByTestId('transfer-queue-throughput')).toHaveTextContent('476.7 MB/s');
    expect(screen.getByTestId('transfer-queue-live-status')).toHaveTextContent(
      'Resumed "Refractor_Release_Assets.zip".'
    );

    // 2. Pause running job-1 (412.5 MB/s) -> aggregate throughput drops to 64.2 MB/s
    fireEvent.click(screen.getByTestId('transfer-job-pause-transfer-job-1'));
    expect(onPauseJob).toHaveBeenCalledWith('transfer-job-1');
    expect(screen.getByTestId('transfer-job-status-transfer-job-1')).toHaveTextContent('Paused');
    expect(screen.getByTestId('transfer-queue-throughput')).toHaveTextContent('64.2 MB/s');
    expect(screen.getByTestId('transfer-queue-live-status')).toHaveTextContent(
      'Paused "Studio_RAW_Plates_4K.tar".'
    );

    // 3. Resume queued job-3 -> becomes running (0.0 MB/s), then Cancel job-3 -> becomes Canceled (--prism-error-main)
    fireEvent.click(screen.getByTestId('transfer-job-resume-transfer-job-3'));
    expect(onResumeJob).toHaveBeenCalledWith('transfer-job-3');
    expect(screen.getByTestId('transfer-job-status-transfer-job-3')).toHaveTextContent('Running');

    fireEvent.click(screen.getByTestId('transfer-job-cancel-transfer-job-3'));
    expect(onCancelJob).toHaveBeenCalledWith('transfer-job-3');
    const canceledPill = screen.getByTestId('transfer-job-status-transfer-job-3');
    expect(canceledPill).toHaveTextContent('Canceled');
    expect(canceledPill.style.color).toBe('var(--prism-error-main)');
    expect(screen.getByTestId('transfer-job-retry-transfer-job-3')).toBeInTheDocument();
    expect(screen.getByTestId('transfer-job-dismiss-transfer-job-3')).toBeInTheDocument();

    // 4. Retry canceled job-1 after canceling it -> resets progress to 0 and status to running
    fireEvent.click(screen.getByTestId('transfer-job-cancel-transfer-job-1'));
    expect(onCancelJob).toHaveBeenCalledWith('transfer-job-1');
    expect(screen.getByTestId('transfer-job-status-transfer-job-1')).toHaveTextContent('Canceled');
    expect(screen.getByTestId('transfer-queue-active-count')).toHaveTextContent('1 active');

    fireEvent.click(screen.getByTestId('transfer-job-retry-transfer-job-1'));
    expect(onRetryJob).toHaveBeenCalledWith('transfer-job-1');
    expect(screen.getByTestId('transfer-job-status-transfer-job-1')).toHaveTextContent('Running');
    expect(screen.getByTestId('transfer-job-progress-transfer-job-1')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByTestId('transfer-job-pct-transfer-job-1')).toHaveTextContent('0%');
    expect(screen.getByTestId('transfer-queue-throughput')).toHaveTextContent('476.7 MB/s');
    expect(screen.getByTestId('transfer-queue-live-status')).toHaveTextContent(
      'Retrying "Studio_RAW_Plates_4K.tar".'
    );

    // 5. Dismiss canceled job-3 individually
    fireEvent.click(screen.getByTestId('transfer-job-dismiss-transfer-job-3'));
    expect(screen.queryByTestId('transfer-job-card-transfer-job-3')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByTestId('transfer-queue-live-status')).toHaveTextContent(
      'Dismissed "Optical_LUT_Archive.tar.gz".'
    );

    // 6. Clear Completed removes remaining completed job-4 (singular announcement) and disables button
    const clearBtn = screen.getByTestId('transfer-clear-completed');
    expect(clearBtn).toBeEnabled();
    fireEvent.click(clearBtn);
    expect(screen.queryByTestId('transfer-job-card-transfer-job-4')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(clearBtn).toBeDisabled();
    expect(screen.getByTestId('transfer-queue-live-status')).toHaveTextContent(
      'Cleared 1 finished transfer job.'
    );
    expect(onJobsChange).toHaveBeenCalled();
  });

  it('clears both completed and canceled jobs in Clear Completed with plural announcement and allows dismissing completed jobs', () => {
    const initialJobs: ReadonlyArray<FileTransferJob> = [
      {
        id: 'done-1',
        name: 'Done_File.bin',
        operation: 'copy',
        sourcePath: '/src/a',
        targetPath: '/dst/a',
        progressPct: 100,
        speedMbps: 0,
        etaLabel: 'Done',
        sizeLabel: '12 MB',
        status: 'completed',
      },
      {
        id: 'cancel-1',
        name: 'Canceled_File.bin',
        operation: 'upload',
        sourcePath: '/src/b',
        targetPath: '/dst/b',
        progressPct: 22,
        speedMbps: 0,
        etaLabel: 'Canceled',
        sizeLabel: '34 MB',
        status: 'canceled',
      },
      {
        id: 'active-1',
        name: 'Active_File.bin',
        operation: 'move',
        sourcePath: '/src/c',
        targetPath: '/dst/c',
        progressPct: 50,
        speedMbps: 110,
        etaLabel: '00:10',
        sizeLabel: '1.1 GB',
        status: 'running',
      },
    ];

    const { rerender } = render(<FileTransferQueue defaultJobs={initialJobs} />);

    // Clear Completed removes both completed and canceled jobs
    fireEvent.click(screen.getByTestId('transfer-clear-completed'));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByTestId('transfer-job-card-active-1')).toBeInTheDocument();
    expect(screen.getByTestId('transfer-clear-completed')).toBeDisabled();
    expect(screen.getByTestId('transfer-queue-live-status')).toHaveTextContent(
      'Cleared 2 finished transfer jobs.'
    );

    // Dismiss on a completed job directly
    rerender(<FileTransferQueue jobs={[initialJobs[0]!]} onJobsChange={vi.fn()} />);
    expect(screen.getByTestId('transfer-queue-live-status')).toBeInTheDocument();
    expect(screen.getByTestId('transfer-job-dismiss-done-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('transfer-job-dismiss-done-1'));
  });

  it('sanitizes NaN, Infinity, -Infinity, negative, and out-of-range progress/speeds and deduplicates IDs', () => {
    const dirtyJobs: ReadonlyArray<FileTransferJob> = [
      {
        id: '  ',
        name: 'Blank_Id_Ignored.bin',
        operation: 'copy',
        sourcePath: '/a',
        targetPath: '/b',
        progressPct: 50,
        speedMbps: 100,
        etaLabel: 'Ignored',
        sizeLabel: '1 MB',
        status: 'running',
      },
      {
        id: 'edge-1',
        name: 'NaN_Progress_And_Speed.iso',
        operation: 'copy',
        sourcePath: '/src/1',
        targetPath: '/dst/1',
        progressPct: Number.NaN,
        speedMbps: Number.NaN,
        etaLabel: '   ',
        sizeLabel: '2.0 GB',
        status: 'running',
      },
      {
        id: 'edge-1',
        name: 'Duplicate_Id_Ignored.iso',
        operation: 'move',
        sourcePath: '/src/dup',
        targetPath: '/dst/dup',
        progressPct: 99,
        speedMbps: 999,
        etaLabel: 'Dup',
        sizeLabel: '9 GB',
        status: 'running',
      },
      {
        id: 'edge-2',
        name: 'Overflow_Progress_Infinity_Speed.tar',
        operation: 'extract',
        sourcePath: '/src/2',
        targetPath: '/dst/2',
        progressPct: 185.4,
        speedMbps: Number.POSITIVE_INFINITY,
        etaLabel: '00:01',
        sizeLabel: '400 MB',
        status: 'running',
      },
      {
        id: 'edge-3',
        name: 'Negative_Values.zip',
        operation: 'upload',
        sourcePath: '/src/3',
        targetPath: '/dst/3',
        progressPct: -42,
        speedMbps: -88.5,
        etaLabel: '00:50',
        sizeLabel: '500 MB',
        status: 'running',
      },
      {
        id: 'edge-4',
        name: 'Valid_Running_Speed.mov',
        operation: 'move',
        sourcePath: '/src/4',
        targetPath: '/dst/4',
        progressPct: 67.6,
        speedMbps: 120.4,
        etaLabel: '00:15',
        sizeLabel: '4.2 GB',
        status: 'running',
      },
      {
        id: 'edge-5',
        name: 'Second_Valid_Running_Speed.mov',
        operation: 'copy',
        sourcePath: '/src/5',
        targetPath: '/dst/5',
        progressPct: Number.NEGATIVE_INFINITY,
        speedMbps: 85.6,
        etaLabel: '00:25',
        sizeLabel: '3.1 GB',
        status: 'running',
      },
      {
        id: 'edge-6',
        name: 'Paused_NonZero_Excluded.mov',
        operation: 'upload',
        sourcePath: '/src/6',
        targetPath: '/dst/6',
        progressPct: 30,
        speedMbps: 999.9,
        etaLabel: 'Paused',
        sizeLabel: '1.0 GB',
        status: 'paused',
      },
    ];

    render(
      <FileTransferQueue
        title="   "
        aria-label="Custom transfer monitor"
        jobs={dirtyJobs}
        data-testid="edge-queue"
      />
    );

    const root = screen.getByTestId('edge-queue');
    expect(root).toHaveAttribute('aria-label', 'Custom transfer monitor');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByRole('heading', { name: 'File Transfer Queue' })).toBeInTheDocument();

    // 6 deduplicated valid jobs (blank ID and duplicate edge-1 excluded)
    expect(screen.getAllByRole('listitem')).toHaveLength(6);

    // Progress clamping & NaN/Infinity guards
    expect(screen.getByTestId('transfer-job-progress-edge-1')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('transfer-job-eta-edge-1')).toHaveTextContent('Running');
    expect(screen.getByTestId('transfer-job-speed-edge-1')).toHaveTextContent('0.0 MB/s');

    expect(screen.getByTestId('transfer-job-progress-edge-2')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByTestId('transfer-job-speed-edge-2')).toHaveTextContent('0.0 MB/s');

    expect(screen.getByTestId('transfer-job-progress-edge-3')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('transfer-job-speed-edge-3')).toHaveTextContent('0.0 MB/s');

    expect(screen.getByTestId('transfer-job-progress-edge-4')).toHaveAttribute('aria-valuenow', '68');
    expect(screen.getByTestId('transfer-job-speed-edge-4')).toHaveTextContent('120.4 MB/s');

    expect(screen.getByTestId('transfer-job-progress-edge-5')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('transfer-job-speed-edge-5')).toHaveTextContent('85.6 MB/s');

    // Aggregate throughput sums ONLY finite running speeds: 120.4 + 85.6 = 206.0 MB/s (excludes paused 999.9)
    expect(screen.getByTestId('transfer-queue-throughput')).toHaveTextContent('206.0 MB/s');
  });

  it('supports Collapse/Expand button, defaultCollapsed, and IME-safe Escape keyboard collapse', () => {
    const onKeyDown = vi.fn<(event: ReactKeyboardEvent<HTMLDivElement>) => void>();

    render(
      <FileTransferQueue
        title="Floating Transfers"
        onKeyDown={onKeyDown}
        data-testid="collapsible-queue"
      />
    );

    const root = screen.getByTestId('collapsible-queue');
    const toggleBtn = screen.getByTestId('transfer-toggle-collapse');

    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('transfer-queue-panel')).toBeInTheDocument();

    // IME composing Escape MUST NOT collapse
    dispatchKeyDownWithComposition(root, { key: 'Escape', isComposing: true });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('transfer-queue-panel')).toBeInTheDocument();

    // Non-Escape key does not collapse
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    // Non-composing Escape collapses the floating queue panel
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(onKeyDown).toHaveBeenCalled();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(toggleBtn).toHaveTextContent('Expand');
    expect(screen.queryByTestId('transfer-queue-panel')).toBeNull();
    expect(screen.getByTestId('transfer-queue-live-status')).toHaveTextContent(
      'Floating Transfers collapsed.'
    );

    // Escape while already collapsed is a safe no-op
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Clicking Expand re-opens the job list
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(toggleBtn).toHaveTextContent('Collapse');
    expect(screen.getByTestId('transfer-queue-panel')).toBeInTheDocument();
    expect(screen.getByTestId('transfer-queue-live-status')).toHaveTextContent(
      'Floating Transfers expanded.'
    );

    // Clicking Collapse hides the job list again
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('transfer-queue-panel')).toBeNull();
  });

  it('respects defaultCollapsed={true} and caller onKeyDown preventDefault', () => {
    const { rerender } = render(<FileTransferQueue defaultCollapsed />);
    expect(screen.getByTestId('transfer-toggle-collapse')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('transfer-queue-panel')).toBeNull();

    // Caller preventDefault blocks Escape collapse on a fresh expanded instance
    rerender(
      <FileTransferQueue
        key="prevented"
        data-testid="prevented-queue"
        onKeyDown={(event) => {
          event.preventDefault();
        }}
      />
    );
    expect(screen.getByTestId('transfer-toggle-collapse')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(screen.getByTestId('prevented-queue'), { key: 'Escape' });
    expect(screen.getByTestId('transfer-toggle-collapse')).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders clean role="status" empty queue state when jobs={[]} and handles singular 1-transfer footer', () => {
    const { rerender } = render(<FileTransferQueue jobs={[]} />);

    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toBe(screen.getByTestId('transfer-queue-empty'));
    expect(emptyStatus).toHaveTextContent('No active file transfers');
    expect(screen.getByTestId('transfer-queue-active-count')).toHaveTextContent('0 active');
    expect(screen.getByTestId('transfer-queue-throughput')).toHaveTextContent('0.0 MB/s');
    expect(screen.getByTestId('transfer-clear-completed')).toBeDisabled();
    expect(screen.getByTestId('transfer-queue-live-status')).toHaveTextContent(
      'Queue empty · No file transfers in progress.'
    );

    // Single job exercises singular "1 transfer tracked" grammar
    rerender(
      <FileTransferQueue
        jobs={[
          {
            id: 'solo-1',
            name: 'Solo_Archive.zip',
            operation: 'extract',
            sourcePath: '/tmp/a',
            targetPath: '/tmp/b',
            progressPct: 10,
            speedMbps: 55,
            etaLabel: '00:08',
            sizeLabel: '120 MB',
            status: 'running',
          },
        ]}
      />
    );
    expect(screen.getByTestId('transfer-queue-live-status')).toHaveTextContent(
      '1 transfer tracked · 55.0 MB/s aggregate.'
    );
  });

  it('operates cleanly in controlled mode with external state updates', () => {
    const onPauseJob = vi.fn<(jobId: string) => void>();
    const onJobsChange = vi.fn<(jobs: ReadonlyArray<FileTransferJob>) => void>();

    function ControlledHarness() {
      const [controlledJobs, setControlledJobs] = useState<ReadonlyArray<FileTransferJob>>([
        {
          id: 'ctrl-1',
          name: 'Controlled_Sync.tar',
          operation: 'copy',
          sourcePath: '/local/sync',
          targetPath: '/remote/sync',
          progressPct: 35,
          speedMbps: 250,
          etaLabel: '00:20 remaining',
          sizeLabel: '5.0 GB',
          status: 'running',
        },
      ]);

      return (
        <FileTransferQueue
          jobs={controlledJobs}
          onPauseJob={onPauseJob}
          onJobsChange={(next) => {
            onJobsChange(next);
            setControlledJobs(next);
          }}
        />
      );
    }

    render(<ControlledHarness />);

    expect(screen.getByTestId('transfer-job-status-ctrl-1')).toHaveTextContent('Running');
    expect(screen.getByTestId('transfer-queue-throughput')).toHaveTextContent('250.0 MB/s');

    fireEvent.click(screen.getByTestId('transfer-job-pause-ctrl-1'));
    expect(onPauseJob).toHaveBeenCalledWith('ctrl-1');
    expect(onJobsChange).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('transfer-job-status-ctrl-1')).toHaveTextContent('Paused');
    expect(screen.getByTestId('transfer-queue-throughput')).toHaveTextContent('0.0 MB/s');
  });

  it('disables all controls and ignores Escape when disabled={true}', () => {
    const onJobsChange = vi.fn<(jobs: ReadonlyArray<FileTransferJob>) => void>();
    const onPauseJob = vi.fn<(jobId: string) => void>();

    render(
      <FileTransferQueue
        disabled
        onJobsChange={onJobsChange}
        onPauseJob={onPauseJob}
        data-testid="disabled-queue"
      />
    );

    const root = screen.getByTestId('disabled-queue');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('transfer-clear-completed')).toBeDisabled();
    expect(screen.getByTestId('transfer-toggle-collapse')).toBeDisabled();
    expect(screen.getByTestId('transfer-job-pause-transfer-job-1')).toBeDisabled();
    expect(screen.getByTestId('transfer-job-cancel-transfer-job-1')).toBeDisabled();
    expect(screen.getByTestId('transfer-job-resume-transfer-job-2')).toBeDisabled();
    expect(screen.getByTestId('transfer-job-dismiss-transfer-job-4')).toBeDisabled();

    fireEvent.click(screen.getByTestId('transfer-job-pause-transfer-job-1'));
    fireEvent.click(screen.getByTestId('transfer-clear-completed'));
    fireEvent.keyDown(root, { key: 'Escape' });

    expect(onPauseJob).not.toHaveBeenCalled();
    expect(onJobsChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('transfer-toggle-collapse')).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders adversarial XSS payloads in title, filename, paths, and labels strictly as escaped literal text', () => {
    const xssPayload = '<script>window.__transferXss=1</script><img src=x onerror=alert(1)>';

    render(
      <FileTransferQueue
        title={xssPayload}
        jobs={[
          {
            id: 'xss-1',
            name: xssPayload,
            operation: 'upload',
            sourcePath: `/mnt/${xssPayload}/src`,
            targetPath: `s3://bucket/${xssPayload}/dst`,
            progressPct: 50,
            speedMbps: 12.5,
            etaLabel: xssPayload,
            sizeLabel: xssPayload,
            status: 'running',
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();
    expect(screen.getByTestId('transfer-job-name-xss-1')).toHaveTextContent(xssPayload);
    expect(screen.getByTestId('transfer-job-source-xss-1')).toHaveTextContent(`/mnt/${xssPayload}/src`);
    expect(screen.getByTestId('transfer-job-target-xss-1')).toHaveTextContent(
      `s3://bucket/${xssPayload}/dst`
    );
    expect(screen.getByTestId('transfer-job-eta-xss-1')).toHaveTextContent(xssPayload);
    expect(screen.getByTestId('transfer-job-size-xss-1')).toHaveTextContent(xssPayload);
  });
});
