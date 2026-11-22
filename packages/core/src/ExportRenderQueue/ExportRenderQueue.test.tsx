import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ExportRenderQueue,
  type ExportCodecMap,
  type ExportJobConfig,
  type RenderQueueJob,
} from './index';

describe('ExportRenderQueue', () => {
  it('renders Astryx contracts, default 3 realistic jobs, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const codecMapCheck: ExportCodecMap = {
      h264: true,
      'prores-422': true,
      av1: true,
      'wav-24bit': true,
    };
    expect(
      codecMapCheck.h264 &&
        codecMapCheck['prores-422'] &&
        codecMapCheck.av1 &&
        codecMapCheck['wav-24bit']
    ).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ExportRenderQueue: {
              className: 'theme-export-queue',
              style: { maxWidth: '920px' },
            },
          },
        }}
      >
        <ExportRenderQueue
          ref={ref}
          className="local-export-queue"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '10px' }}
          data-testid="export-queue-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('export-queue-root');
    expect(ref.current).toBe(root);
    expect(ExportRenderQueue.displayName).toBe('ExportRenderQueue');
    expect(root).toHaveClass(
      'refractor-export-render-queue',
      'prism-slab',
      'theme-export-queue',
      'local-export-queue'
    );
    expect(root).toHaveStyle({ maxWidth: '920px', marginTop: '10px' });
    expect(root).toHaveAttribute('role', 'region');

    // Heading and queue telemetry pill
    expect(screen.getByRole('heading', { name: 'Export & Render Queue' })).toBeInTheDocument();
    expect(screen.getByTestId('export-queue-telemetry')).toHaveTextContent(
      '1 rendering · 1 queued · 1 done'
    );

    // Preset form layout contract
    const presetForm = screen.getByTestId('export-preset-form');
    expect(presetForm).toHaveClass(
      'prism-well',
      'rounded-2xl',
      'p-3',
      'grid',
      'grid-cols-1',
      'sm:grid-cols-2',
      'lg:grid-cols-5',
      'gap-2.5'
    );

    // Default 3 realistic jobs: rendering 64%, queued 0%, completed 100%
    expect(screen.getByRole('list', { name: 'Export & Render Queue jobs' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(3);
    expect(progressBars[0]).toHaveAttribute('aria-valuemin', '0');
    expect(progressBars[0]).toHaveAttribute('aria-valuemax', '100');
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '64');
    expect(progressBars[1]).toHaveAttribute('aria-valuenow', '0');
    expect(progressBars[2]).toHaveAttribute('aria-valuenow', '100');

    // Job metadata badges & semantic status pills
    expect(screen.getByTestId('render-job-codec-render-job-1')).toHaveTextContent(
      'Apple ProRes 422'
    );
    expect(screen.getByTestId('render-job-resolution-render-job-1')).toHaveTextContent('4K UHD');
    expect(screen.getByTestId('render-job-bitrate-render-job-1')).toHaveTextContent('147 Mbps');
    expect(screen.getByTestId('render-job-sample-rate-render-job-1')).toHaveTextContent('48 kHz');
    expect(screen.getByTestId('render-job-status-render-job-1').style.color).toBe(
      'var(--prism-primary-main)'
    );

    expect(screen.getByTestId('render-job-codec-render-job-2')).toHaveTextContent('H.264 MP4');
    expect(screen.getByTestId('render-job-resolution-render-job-2')).toHaveTextContent(
      '1080×1920 Vertical'
    );
    expect(screen.getByTestId('render-job-status-render-job-2').style.color).toBe(
      'var(--prism-info-main)'
    );

    expect(screen.getByTestId('render-job-codec-render-job-3')).toHaveTextContent(
      'WAV 24-bit PCM'
    );
    expect(screen.getByTestId('render-job-resolution-render-job-3')).toHaveTextContent(
      'Audio Only'
    );
    expect(screen.getByTestId('render-job-bitrate-render-job-3')).toHaveTextContent(
      'Lossless PCM'
    );
    expect(screen.getByTestId('render-job-sample-rate-render-job-3')).toHaveTextContent('96 kHz');
    expect(screen.getByTestId('render-job-status-render-job-3').style.color).toBe(
      'var(--prism-success-main)'
    );

    // Polite live status region
    const liveStatus = screen.getByTestId('export-queue-live-status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(liveStatus).toHaveTextContent('Queue active · 3 jobs tracked.');
  });

  it('enqueues configured presets with collision-safe IDs, IME-safe Enter submit, and callbacks', () => {
    const onEnqueue = vi.fn<(config: ExportJobConfig, createdJob: RenderQueueJob) => void>();
    const onJobsChange = vi.fn<(jobs: RenderQueueJob[]) => void>();

    render(<ExportRenderQueue onEnqueue={onEnqueue} onJobsChange={onJobsChange} />);

    const nameInput = screen.getByLabelText('Export output name');
    const codecSelect = screen.getByLabelText('Export codec');
    const resolutionSelect = screen.getByLabelText('Export resolution');
    const bitrateInput = screen.getByLabelText('Target bitrate Mbps');
    const sampleRateSelect = screen.getByLabelText('Audio sample rate');
    const addButton = screen.getByTestId('export-add-to-queue');

    // Configure AV1 4K UHD 96 kHz preset
    fireEvent.change(nameInput, { target: { value: '  Cinema_Trailer_AV1  ' } });
    fireEvent.change(codecSelect, { target: { value: 'av1' } });
    fireEvent.change(resolutionSelect, { target: { value: '4k-uhd' } });
    fireEvent.change(bitrateInput, { target: { value: '85' } });
    fireEvent.change(sampleRateSelect, { target: { value: '96kHz' } });

    expect(screen.getByTestId('export-preset-summary')).toHaveTextContent(
      'Cinema_Trailer_AV1 · AV1 Web · 4K UHD · 85 Mbps · 96 kHz'
    );

    // IME composition Enter MUST NOT submit
    fireEvent.keyDown(nameInput, { key: 'Enter', isComposing: true });
    expect(onEnqueue).not.toHaveBeenCalled();

    // Non-Enter key does not submit
    fireEvent.keyDown(nameInput, { key: 'Escape' });
    expect(onEnqueue).not.toHaveBeenCalled();

    // Click Add to Queue -> skips colliding render-job-1..3 and assigns render-job-4
    fireEvent.click(addButton);
    expect(onEnqueue).toHaveBeenCalledTimes(1);
    const firstCall = onEnqueue.mock.calls[0];
    expect(firstCall?.[0]).toEqual({
      name: 'Cinema_Trailer_AV1',
      codec: 'av1',
      resolution: '4k-uhd',
      bitrateMbps: 85,
      sampleRate: '96kHz',
    });
    expect(firstCall?.[1]).toEqual({
      id: 'render-job-4',
      name: 'Cinema_Trailer_AV1',
      codec: 'av1',
      resolution: '4k-uhd',
      bitrateMbps: 85,
      sampleRate: '96kHz',
      status: 'queued',
      progressPct: 0,
      etaLabel: 'Waiting in queue',
    });
    expect(onJobsChange).toHaveBeenCalledTimes(1);
    expect(onJobsChange.mock.calls[0]?.[0]).toHaveLength(4);
    expect(nameInput).toHaveValue('');
    expect(screen.getByTestId('export-queue-telemetry')).toHaveTextContent(
      '1 rendering · 2 queued · 1 done'
    );
    expect(screen.getByTestId('export-queue-live-status')).toHaveTextContent(
      'Added "Cinema_Trailer_AV1" to render queue.'
    );

    // Pressing Enter on empty input submits with deterministic fallback Sequence_Master_Export
    fireEvent.keyDown(nameInput, { key: 'Enter' });
    expect(onEnqueue).toHaveBeenCalledTimes(2);
    expect(onEnqueue.mock.calls[1]?.[1].id).toBe('render-job-5');
    expect(onEnqueue.mock.calls[1]?.[1].name).toBe('Sequence_Master_Export');
    expect(screen.getByTestId('render-job-codec-render-job-4')).toHaveTextContent('AV1 Web');
  });

  it('clamps target bitrate 1..500, restores blank draft on blur, and disables bitrate readout for wav-24bit', () => {
    const onEnqueue = vi.fn<(config: ExportJobConfig, createdJob: RenderQueueJob) => void>();
    render(<ExportRenderQueue onEnqueue={onEnqueue} />);

    const codecSelect = screen.getByLabelText('Export codec');
    const resolutionSelect = screen.getByLabelText('Export resolution');
    const sampleRateSelect = screen.getByLabelText('Audio sample rate');
    const bitrateInput = screen.getByLabelText('Target bitrate Mbps');

    // Clamp > 500 -> 500
    fireEvent.change(bitrateInput, { target: { value: '999' } });
    expect(bitrateInput).toHaveValue(500);
    expect(screen.getByTestId('export-bitrate-readout')).toHaveTextContent('500 Mbps');

    // Clamp < 1 -> 1
    fireEvent.change(bitrateInput, { target: { value: '-15' } });
    expect(bitrateInput).toHaveValue(1);
    expect(screen.getByTestId('export-bitrate-readout')).toHaveTextContent('1 Mbps');

    // Empty draft stays blank until blur restores 35 (non-empty blur keeps current value)
    fireEvent.blur(bitrateInput);
    expect(bitrateInput).toHaveValue(1);

    fireEvent.change(bitrateInput, { target: { value: '' } });
    expect(bitrateInput).toHaveValue(null);
    expect(screen.getByTestId('export-bitrate-readout')).toHaveTextContent('35 Mbps');
    fireEvent.blur(bitrateInput);
    expect(bitrateInput).toHaveValue(35);

    // Invalid select values are ignored safely
    fireEvent.change(codecSelect, { target: { value: 'invalid-codec' } });
    expect(codecSelect).toHaveValue('h264');
    fireEvent.change(resolutionSelect, { target: { value: '8k-invalid' } });
    expect(resolutionSelect).toHaveValue('1080p');
    fireEvent.change(sampleRateSelect, { target: { value: '192kHz' } });
    expect(sampleRateSelect).toHaveValue('48kHz');

    // Switch to wav-24bit -> bitrate input disabled and Mbps readout swapped for Lossless PCM
    fireEvent.change(codecSelect, { target: { value: 'wav-24bit' } });
    expect(bitrateInput).toBeDisabled();
    expect(screen.queryByTestId('export-bitrate-readout')).toBeNull();
    expect(screen.getByTestId('export-bitrate-pcm-badge')).toHaveTextContent('Lossless PCM');
    expect(screen.getByTestId('export-preset-summary')).toHaveTextContent('Lossless PCM');

    // Synthetic bitrate change while wav-24bit is active is ignored
    fireEvent.change(bitrateInput, { target: { value: '120' } });

    // Switching back to prores-422 re-enables bitrate and preserves prior value (35)
    fireEvent.change(codecSelect, { target: { value: 'prores-422' } });
    expect(bitrateInput).not.toBeDisabled();
    expect(bitrateInput).toHaveValue(35);

    // Enqueue wav-24bit job and verify Lossless PCM metadata badge
    fireEvent.change(codecSelect, { target: { value: 'wav-24bit' } });
    fireEvent.change(resolutionSelect, { target: { value: 'audio-only' } });
    fireEvent.click(screen.getByTestId('export-add-to-queue'));
    expect(onEnqueue).toHaveBeenLastCalledWith(
      expect.objectContaining({ codec: 'wav-24bit', resolution: 'audio-only', bitrateMbps: 35 }),
      expect.objectContaining({ id: 'render-job-4', status: 'queued' })
    );
    expect(screen.getByTestId('render-job-bitrate-render-job-4')).toHaveTextContent('Lossless PCM');
  });

  it('executes contextual actions across all 6 render job states (Pause, Resume, Start, Cancel, Retry, Remove)', () => {
    const onJobsChange = vi.fn<(jobs: RenderQueueJob[]) => void>();
    const initialJobs: RenderQueueJob[] = [
      {
        id: 'job-render',
        name: 'Master_Reel',
        codec: 'prores-422',
        resolution: '4k-uhd',
        bitrateMbps: 120,
        sampleRate: '48kHz',
        status: 'rendering',
        progressPct: 64,
        etaLabel: '00:45 remaining',
      },
      {
        id: 'job-queued',
        name: 'Web_Teaser',
        codec: 'h264',
        resolution: '1080p',
        bitrateMbps: 20,
        sampleRate: '48kHz',
        status: 'queued',
        progressPct: 0,
      },
      {
        id: 'job-failed',
        name: 'Corrupt_Clip',
        codec: 'av1',
        resolution: '1080x1920',
        bitrateMbps: 18,
        sampleRate: '48kHz',
        status: 'failed',
        progressPct: 42,
        etaLabel: 'Encoder error',
      },
      {
        id: 'job-done',
        name: 'Audio_Stem',
        codec: 'wav-24bit',
        resolution: 'audio-only',
        bitrateMbps: 5,
        sampleRate: '96kHz',
        status: 'completed',
        progressPct: 100,
        etaLabel: 'Done',
      },
    ];

    render(<ExportRenderQueue defaultJobs={initialJobs} onJobsChange={onJobsChange} />);

    // Job without etaLabel falls back to status label
    expect(screen.getByTestId('render-job-eta-job-queued')).toHaveTextContent('Queued');
    expect(screen.getByTestId('render-job-resolution-job-queued')).toHaveTextContent('1080p HD');

    // Failed job displays --prism-error-main and Retry + Remove
    expect(screen.getByTestId('render-job-status-job-failed').style.color).toBe(
      'var(--prism-error-main)'
    );
    expect(screen.getByRole('button', { name: 'Retry Corrupt_Clip' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Corrupt_Clip' })).toBeInTheDocument();

    // 1. Rendering -> Pause -> Paused (--prism-warning-main, preserves 64%)
    fireEvent.click(screen.getByRole('button', { name: 'Pause Master_Reel' }));
    expect(screen.getByTestId('render-job-status-job-render')).toHaveAttribute(
      'data-status',
      'paused'
    );
    expect(screen.getByTestId('render-job-status-job-render').style.color).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('render-job-progress-job-render')).toHaveAttribute(
      'aria-valuenow',
      '64'
    );
    expect(screen.getByTestId('export-queue-live-status')).toHaveTextContent(
      'Paused "Master_Reel".'
    );

    // 2. Paused -> Resume -> Rendering
    fireEvent.click(screen.getByRole('button', { name: 'Resume Master_Reel' }));
    expect(screen.getByTestId('render-job-status-job-render')).toHaveAttribute(
      'data-status',
      'rendering'
    );
    expect(screen.getByTestId('export-queue-live-status')).toHaveTextContent(
      'Resumed "Master_Reel".'
    );

    // 3. Rendering -> Cancel -> Cancelled (--prism-text-secondary) with Retry & Remove
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Master_Reel' }));
    expect(screen.getByTestId('render-job-status-job-render')).toHaveAttribute(
      'data-status',
      'cancelled'
    );
    expect(screen.getByTestId('render-job-status-job-render').style.color).toBe(
      'var(--prism-text-secondary)'
    );
    expect(screen.getByRole('button', { name: 'Retry Master_Reel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Master_Reel' })).toBeInTheDocument();

    // 4. Queued -> Start -> Rendering, then Cancel
    fireEvent.click(screen.getByRole('button', { name: 'Start Web_Teaser' }));
    expect(screen.getByTestId('render-job-status-job-queued')).toHaveAttribute(
      'data-status',
      'rendering'
    );
    expect(screen.getByTestId('export-queue-live-status')).toHaveTextContent(
      'Started "Web_Teaser".'
    );

    // 5. Failed -> Retry -> Queued at 0%
    fireEvent.click(screen.getByRole('button', { name: 'Retry Corrupt_Clip' }));
    expect(screen.getByTestId('render-job-status-job-failed')).toHaveAttribute(
      'data-status',
      'queued'
    );
    expect(screen.getByTestId('render-job-progress-job-failed')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByTestId('export-queue-live-status')).toHaveTextContent(
      'Re-queued "Corrupt_Clip" for retry.'
    );

    // 6. Queued -> Cancel -> Cancelled
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Corrupt_Clip' }));
    expect(screen.getByTestId('render-job-status-job-failed')).toHaveAttribute(
      'data-status',
      'cancelled'
    );

    // 7. Cancelled -> Remove
    fireEvent.click(screen.getByRole('button', { name: 'Remove Master_Reel' }));
    expect(screen.queryByTestId('render-job-card-job-render')).toBeNull();
    expect(screen.getByTestId('export-queue-live-status')).toHaveTextContent(
      'Removed "Master_Reel" from render queue.'
    );

    // 8. Completed -> Remove (only Remove button is shown)
    expect(screen.queryByRole('button', { name: 'Retry Audio_Stem' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Audio_Stem' }));
    expect(screen.queryByTestId('render-job-card-job-done')).toBeNull();
  });

  it('clears completed jobs (singular & plural) and shows clean role="status" empty state', () => {
    // Singular Clear Completed on default jobs
    const { unmount } = render(<ExportRenderQueue />);
    const clearBtn = screen.getByTestId('export-clear-completed');
    expect(clearBtn).not.toBeDisabled();

    fireEvent.click(clearBtn);
    expect(screen.getByTestId('export-queue-live-status')).toHaveTextContent(
      'Cleared 1 completed render job.'
    );
    expect(screen.getByTestId('export-clear-completed')).toBeDisabled();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    unmount();

    // Plural Clear Completed resulting in empty queue
    const twoCompleted: RenderQueueJob[] = [
      {
        id: 'done-1',
        name: 'Spot_A',
        codec: 'h264',
        resolution: '1080p',
        bitrateMbps: 20,
        sampleRate: '48kHz',
        status: 'completed',
        progressPct: 100,
      },
      {
        id: 'done-2',
        name: 'Spot_B',
        codec: 'av1',
        resolution: '4k-uhd',
        bitrateMbps: 55,
        sampleRate: '48kHz',
        status: 'completed',
        progressPct: 100,
      },
    ];

    render(<ExportRenderQueue defaultJobs={twoCompleted} data-testid="empty-test-root" />);
    fireEvent.click(screen.getByTestId('export-clear-completed'));

    expect(screen.getByTestId('export-queue-live-status')).toHaveTextContent(
      'Cleared 2 completed render jobs.'
    );
    expect(screen.queryByRole('list')).toBeNull();
    const emptyState = screen.getByRole('status');
    expect(emptyState).toHaveTextContent('Render queue is empty');
    expect(screen.getByTestId('empty-test-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('export-queue-telemetry')).toHaveTextContent(
      '0 rendering · 0 queued · 0 done'
    );
  });

  it('renders idle empty and singular job summaries cleanly on initial mount', () => {
    const { unmount } = render(<ExportRenderQueue defaultJobs={[]} title="   " />);
    expect(screen.getByRole('heading', { name: 'Export & Render Queue' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Render queue is empty');
    expect(screen.getByTestId('export-queue-live-status')).toHaveTextContent(
      'Queue empty · Ready to schedule export presets.'
    );
    unmount();

    render(
      <ExportRenderQueue
        title="Custom Delivery Queue"
        defaultJobs={[
          {
            id: 'solo-1',
            name: 'Solo_Master',
            codec: 'h264',
            resolution: '1080p',
            bitrateMbps: 25,
            sampleRate: '48kHz',
            status: 'queued',
            progressPct: 0,
          },
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: 'Custom Delivery Queue' })).toBeInTheDocument();
    expect(screen.getByTestId('export-queue-live-status')).toHaveTextContent(
      'Queue active · 1 job tracked.'
    );
  });

  it('supports controlled jobs mode without mutating DOM until parent updates props', () => {
    const onEnqueue = vi.fn<(config: ExportJobConfig, createdJob: RenderQueueJob) => void>();
    const onJobsChange = vi.fn<(jobs: RenderQueueJob[]) => void>();
    const controlledJobs: RenderQueueJob[] = [
      {
        id: 'ctrl-1',
        name: 'Controlled_Cut',
        codec: 'prores-422',
        resolution: '4k-uhd',
        bitrateMbps: 140,
        sampleRate: '48kHz',
        status: 'rendering',
        progressPct: 50,
      },
    ];

    const { rerender } = render(
      <ExportRenderQueue
        jobs={controlledJobs}
        onEnqueue={onEnqueue}
        onJobsChange={onJobsChange}
      />
    );

    // Enqueue calls onEnqueue & onJobsChange, but DOM stays at 1 until parent updates jobs
    fireEvent.change(screen.getByLabelText('Export output name'), {
      target: { value: 'Next_Export' },
    });
    fireEvent.click(screen.getByTestId('export-add-to-queue'));
    expect(onEnqueue).toHaveBeenCalledTimes(1);
    expect(onJobsChange).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    // Pause emits updated array while DOM remains rendering until rerender
    fireEvent.click(screen.getByRole('button', { name: 'Pause Controlled_Cut' }));
    expect(onJobsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'ctrl-1', status: 'paused', progressPct: 50 }),
    ]);
    expect(screen.getByTestId('render-job-status-ctrl-1')).toHaveAttribute(
      'data-status',
      'rendering'
    );

    // Parent pushes updated state
    rerender(
      <ExportRenderQueue
        jobs={[{ ...controlledJobs[0]!, status: 'paused', etaLabel: 'Paused' }]}
        onEnqueue={onEnqueue}
        onJobsChange={onJobsChange}
      />
    );
    expect(screen.getByTestId('render-job-status-ctrl-1')).toHaveAttribute('data-status', 'paused');
  });

  it('sanitizes adversarial filenames, deduplicates IDs, and clamps out-of-range job telemetry', () => {
    const onEnqueue = vi.fn<(config: ExportJobConfig, createdJob: RenderQueueJob) => void>();
    const adversarialJobs: RenderQueueJob[] = [
      {
        id: '   ',
        name: 'Ignored_Blank_Id',
        codec: 'h264',
        resolution: '1080p',
        bitrateMbps: 25,
        sampleRate: '48kHz',
        status: 'queued',
        progressPct: 0,
      },
      {
        id: 'adv-1',
        name: '<script>window.__xss=1</script>../../Reel\u0007\n_01',
        codec: 'h264',
        resolution: '1080p',
        bitrateMbps: Number.NaN,
        sampleRate: '48kHz',
        status: 'rendering',
        progressPct: 185,
        etaLabel: '   ',
      },
      {
        id: 'adv-1',
        name: 'Duplicate_Should_Be_Skipped',
        codec: 'av1',
        resolution: '4k-uhd',
        bitrateMbps: 50,
        sampleRate: '96kHz',
        status: 'queued',
        progressPct: 10,
      },
      {
        id: 'adv-2',
        name: '///:::***',
        codec: 'prores-422',
        resolution: '4k-uhd',
        bitrateMbps: 9999,
        sampleRate: '48kHz',
        status: 'failed',
        progressPct: -40,
      },
    ];

    render(<ExportRenderQueue defaultJobs={adversarialJobs} onEnqueue={onEnqueue} />);

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    // Control chars, path traversal, and angle brackets stripped
    expect(screen.getByTestId('render-job-name-adv-1')).toHaveTextContent(
      'scriptwindow.__xss=1scriptReel_01'
    );
    expect(screen.getByTestId('render-job-bitrate-adv-1')).toHaveTextContent('35 Mbps');
    expect(screen.getByTestId('render-job-progress-adv-1')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByTestId('render-job-eta-adv-1')).toHaveTextContent('Rendering');

    // Delimiter-only filename falls back to Sequence_Master_Export; bitrate clamped to 500; progress clamped to 0
    expect(screen.getByTestId('render-job-name-adv-2')).toHaveTextContent(
      'Sequence_Master_Export'
    );
    expect(screen.getByTestId('render-job-bitrate-adv-2')).toHaveTextContent('500 Mbps');
    expect(screen.getByTestId('render-job-progress-adv-2')).toHaveAttribute('aria-valuenow', '0');

    // Enqueueing an overly long string truncates cleanly to 120 characters
    const longInput = 'A'.repeat(160);
    fireEvent.change(screen.getByLabelText('Export output name'), {
      target: { value: longInput },
    });
    fireEvent.click(screen.getByTestId('export-add-to-queue'));
    expect(onEnqueue.mock.calls[0]?.[0].name).toHaveLength(120);
  });

  it('blocks all interactions when disabled is true', () => {
    const onEnqueue = vi.fn<(config: ExportJobConfig, createdJob: RenderQueueJob) => void>();
    const onJobsChange = vi.fn<(jobs: RenderQueueJob[]) => void>();

    render(
      <ExportRenderQueue
        disabled
        onEnqueue={onEnqueue}
        onJobsChange={onJobsChange}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');

    const nameInput = screen.getByLabelText('Export output name');
    const codecSelect = screen.getByLabelText('Export codec');
    const resolutionSelect = screen.getByLabelText('Export resolution');
    const bitrateInput = screen.getByLabelText('Target bitrate Mbps');
    const sampleRateSelect = screen.getByLabelText('Audio sample rate');
    const addButton = screen.getByTestId('export-add-to-queue');
    const clearButton = screen.getByTestId('export-clear-completed');

    expect(nameInput).toBeDisabled();
    expect(codecSelect).toBeDisabled();
    expect(resolutionSelect).toBeDisabled();
    expect(bitrateInput).toBeDisabled();
    expect(sampleRateSelect).toBeDisabled();
    expect(addButton).toBeDisabled();
    expect(clearButton).toBeDisabled();

    // Synthetic input/select/keyDown events must not mutate state
    fireEvent.change(nameInput, { target: { value: 'Blocked_Export' } });
    fireEvent.change(codecSelect, { target: { value: 'av1' } });
    fireEvent.change(resolutionSelect, { target: { value: '4k-uhd' } });
    fireEvent.change(bitrateInput, { target: { value: '120' } });
    fireEvent.change(sampleRateSelect, { target: { value: '96kHz' } });
    fireEvent.keyDown(nameInput, { key: 'Enter' });
    fireEvent.click(addButton);
    fireEvent.click(clearButton);
    fireEvent.click(screen.getByTestId('render-job-pause-render-job-1'));

    expect(nameInput).toHaveValue('');
    expect(codecSelect).toHaveValue('h264');
    expect(resolutionSelect).toHaveValue('1080p');
    expect(bitrateInput).toHaveValue(35);
    expect(sampleRateSelect).toHaveValue('48kHz');
    expect(onEnqueue).not.toHaveBeenCalled();
    expect(onJobsChange).not.toHaveBeenCalled();
  });
});
