'use client';

import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Film,
  Layers,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type ExportCodec = 'h264' | 'prores-422' | 'av1' | 'wav-24bit';
export type ExportResolution = '1080p' | '4k-uhd' | '1080x1920' | 'audio-only';
export type ExportSampleRate = '48kHz' | '96kHz';
export type RenderJobStatus =
  | 'queued'
  | 'rendering'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExportJobConfig {
  /** Sanitized output asset filename. */
  name: string;
  /** Video or audio container/codec preset. */
  codec: ExportCodec;
  /** Target raster resolution or audio-only delivery format. */
  resolution: ExportResolution;
  /** Target video encoding bitrate in Mbps, clamped to [1..500]. */
  bitrateMbps: number;
  /** Audio mastering sample rate. */
  sampleRate: ExportSampleRate;
}

export interface RenderQueueJob extends ExportJobConfig {
  /** Unique collision-safe render job identifier. */
  id: string;
  /** Current render lifecycle state. */
  status: RenderJobStatus;
  /** Render progress percentage clamped to [0..100]. */
  progressPct: number;
  /** Optional human-readable ETA or lifecycle status hint. */
  etaLabel?: string;
}

export interface ExportRenderQueueProps extends BaseProps<HTMLDivElement> {
  /** Controlled list of render jobs. */
  jobs?: ReadonlyArray<RenderQueueJob>;
  /** Initial render jobs for uncontrolled usage (defaults to 3 realistic jobs: rendering 64%, queued 0%, completed 100%). */
  defaultJobs?: ReadonlyArray<RenderQueueJob>;
  /** Callback fired whenever jobs are added, started, paused, resumed, cancelled, retried, removed, or cleared. */
  onJobsChange?: (jobs: RenderQueueJob[]) => void;
  /** Callback fired when a new preset job is appended via Add to Queue. */
  onEnqueue?: (config: ExportJobConfig, createdJob: RenderQueueJob) => void;
  /** Panel heading rendered in the prism-slab header (defaults to 'Export & Render Queue'). */
  title?: string;
  /** Disables the preset form, Clear Completed button, and all per-job actions (defaults to false). */
  disabled?: boolean;
}

interface CodecOption {
  value: ExportCodec;
  label: string;
}

interface ResolutionOption {
  value: ExportResolution;
  label: string;
}

interface SampleRateOption {
  value: ExportSampleRate;
  label: string;
}

interface StatusVisualMeta {
  label: string;
  accentToken: string;
  progressToken: string;
}

const DEFAULT_TITLE = 'Export & Render Queue';
const FALLBACK_EXPORT_NAME = 'Sequence_Master_Export';
const MIN_BITRATE_MBPS = 1;
const MAX_BITRATE_MBPS = 500;
const DEFAULT_BITRATE_MBPS = 35;
const MAX_EXPORT_NAME_LENGTH = 120;

const CODEC_OPTIONS: ReadonlyArray<CodecOption> = [
  { value: 'h264', label: 'H.264 MP4' },
  { value: 'prores-422', label: 'Apple ProRes 422' },
  { value: 'av1', label: 'AV1 Web' },
  { value: 'wav-24bit', label: 'WAV 24-bit PCM' },
];

const RESOLUTION_OPTIONS: ReadonlyArray<ResolutionOption> = [
  { value: '1080p', label: '1080p HD' },
  { value: '4k-uhd', label: '4K UHD' },
  { value: '1080x1920', label: '1080\u00D71920 Vertical' },
  { value: 'audio-only', label: 'Audio Only' },
];

const SAMPLE_RATE_OPTIONS: ReadonlyArray<SampleRateOption> = [
  { value: '48kHz', label: '48 kHz' },
  { value: '96kHz', label: '96 kHz' },
];

const DEFAULT_JOBS: ReadonlyArray<RenderQueueJob> = [
  {
    id: 'render-job-1',
    name: 'Prism_Hero_Master_v04',
    codec: 'prores-422',
    resolution: '4k-uhd',
    bitrateMbps: 147,
    sampleRate: '48kHz',
    status: 'rendering',
    progressPct: 64,
    etaLabel: '01:18 remaining',
  },
  {
    id: 'render-job-2',
    name: 'Social_Cutdown_9x16',
    codec: 'h264',
    resolution: '1080x1920',
    bitrateMbps: 24,
    sampleRate: '48kHz',
    status: 'queued',
    progressPct: 0,
    etaLabel: 'Waiting in queue',
  },
  {
    id: 'render-job-3',
    name: 'Soundtrack_Stem_24bit',
    codec: 'wav-24bit',
    resolution: 'audio-only',
    bitrateMbps: 5,
    sampleRate: '96kHz',
    status: 'completed',
    progressPct: 100,
    etaLabel: 'Ready for delivery',
  },
];

function isExportCodec(value: string): value is ExportCodec {
  return value === 'h264' || value === 'prores-422' || value === 'av1' || value === 'wav-24bit';
}

function isExportResolution(value: string): value is ExportResolution {
  return (
    value === '1080p' || value === '4k-uhd' || value === '1080x1920' || value === 'audio-only'
  );
}

function isExportSampleRate(value: string): value is ExportSampleRate {
  return value === '48kHz' || value === '96kHz';
}

function getCodecLabel(codec: ExportCodec): string {
  switch (codec) {
    case 'h264':
      return 'H.264 MP4';
    case 'prores-422':
      return 'Apple ProRes 422';
    case 'av1':
      return 'AV1 Web';
    case 'wav-24bit':
      return 'WAV 24-bit PCM';
  }
}

function getResolutionLabel(resolution: ExportResolution): string {
  switch (resolution) {
    case '1080p':
      return '1080p HD';
    case '4k-uhd':
      return '4K UHD';
    case '1080x1920':
      return '1080\u00D71920 Vertical';
    case 'audio-only':
      return 'Audio Only';
  }
}

function getSampleRateLabel(sampleRate: ExportSampleRate): string {
  switch (sampleRate) {
    case '48kHz':
      return '48 kHz';
    case '96kHz':
      return '96 kHz';
  }
}

function getStatusMeta(status: RenderJobStatus): StatusVisualMeta {
  switch (status) {
    case 'rendering':
      return {
        label: 'Rendering',
        accentToken: 'var(--prism-primary-main)',
        progressToken: 'var(--prism-primary-main)',
      };
    case 'paused':
      return {
        label: 'Paused',
        accentToken: 'var(--prism-warning-main)',
        progressToken: 'var(--prism-warning-main)',
      };
    case 'completed':
      return {
        label: 'Completed',
        accentToken: 'var(--prism-success-main)',
        progressToken: 'var(--prism-success-main)',
      };
    case 'failed':
      return {
        label: 'Failed',
        accentToken: 'var(--prism-error-main)',
        progressToken: 'var(--prism-error-main)',
      };
    case 'queued':
      return {
        label: 'Queued',
        accentToken: 'var(--prism-info-main)',
        progressToken: 'var(--prism-info-main)',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        accentToken: 'var(--prism-text-secondary)',
        progressToken: 'var(--prism-text-disabled)',
      };
  }
}

function renderStatusIcon(status: RenderJobStatus): ReactNode {
  switch (status) {
    case 'rendering':
      return <Film aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'paused':
      return <Pause aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'completed':
      return <CheckCircle2 aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'failed':
      return <AlertCircle aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'queued':
      return <Clock aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'cancelled':
      return <Ban aria-hidden="true" className="w-3 h-3 shrink-0" />;
  }
}

function sanitizeExportName(raw: string): string {
  let cleaned = '';
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    if (code >= 32 && code !== 127) {
      cleaned += raw.charAt(i);
    }
  }
  cleaned = cleaned
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\.{2,}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, MAX_EXPORT_NAME_LENGTH)
    .trim();
  return cleaned.length > 0 ? cleaned : FALLBACK_EXPORT_NAME;
}

function sanitizeBitrate(value: number): number {
  return Math.round(clampNumber(value, MIN_BITRATE_MBPS, MAX_BITRATE_MBPS, DEFAULT_BITRATE_MBPS));
}

function sanitizeProgress(value: number): number {
  return Math.round(clampNumber(value, 0, 100, 0));
}

function normalizeJobs(list: ReadonlyArray<RenderQueueJob>): RenderQueueJob[] {
  const seen = new Set<string>();
  const normalized: RenderQueueJob[] = [];
  for (const job of list) {
    const trimmedId = job.id.trim();
    if (!trimmedId || seen.has(trimmedId)) {
      continue;
    }
    seen.add(trimmedId);
    const cleanEta = job.etaLabel?.trim();
    normalized.push({
      ...job,
      id: trimmedId,
      name: sanitizeExportName(job.name),
      bitrateMbps: sanitizeBitrate(job.bitrateMbps),
      progressPct: sanitizeProgress(job.progressPct),
      etaLabel: cleanEta || undefined,
    });
  }
  return normalized;
}

function createCollisionSafeJobId(
  existingJobs: ReadonlyArray<RenderQueueJob>,
  nextSequence: () => number
): string {
  const existingIds = new Set(existingJobs.map((job) => job.id));
  let candidate = `render-job-${nextSequence()}`;
  while (existingIds.has(candidate)) {
    candidate = `render-job-${nextSequence()}`;
  }
  return candidate;
}

export function ExportRenderQueue({
  jobs,
  defaultJobs,
  onJobsChange,
  onEnqueue,
  title = DEFAULT_TITLE,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ExportRenderQueueProps) {
  const headingId = useId();
  const nameFieldId = useId();
  const codecFieldId = useId();
  const resolutionFieldId = useId();
  const bitrateFieldId = useId();
  const sampleRateFieldId = useId();

  const override = useComponentOverride('ExportRenderQueue');
  const isControlled = jobs !== undefined;
  const sequenceRef = useRef<number>(1);

  const [internalJobs, setInternalJobs] = useState<RenderQueueJob[]>(() =>
    normalizeJobs(defaultJobs ?? DEFAULT_JOBS)
  );
  const [nameInput, setNameInput] = useState<string>('');
  const [codec, setCodec] = useState<ExportCodec>('h264');
  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const [bitrateInput, setBitrateInput] = useState<string>(String(DEFAULT_BITRATE_MBPS));
  const [sampleRate, setSampleRate] = useState<ExportSampleRate>('48kHz');
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const currentJobs = useMemo(
    () => (isControlled ? normalizeJobs(jobs) : internalJobs),
    [isControlled, jobs, internalJobs]
  );

  const safeTitle = title.trim().length > 0 ? title.trim() : DEFAULT_TITLE;
  const isAudioCodec = codec === 'wav-24bit';
  const resolvedBitrate =
    bitrateInput.trim() === '' ? DEFAULT_BITRATE_MBPS : sanitizeBitrate(Number(bitrateInput));

  const renderingCount = currentJobs.filter((job) => job.status === 'rendering').length;
  const queuedCount = currentJobs.filter((job) => job.status === 'queued').length;
  const completedCount = currentJobs.filter((job) => job.status === 'completed').length;
  const totalCount = currentJobs.length;
  const clearCompletedDisabled = disabled || completedCount === 0;

  const commitJobs = (nextJobs: RenderQueueJob[], announcement: string) => {
    setLiveAnnouncement(announcement);
    if (!isControlled) {
      setInternalJobs(nextJobs);
    }
    onJobsChange?.(nextJobs);
  };

  const handleEnqueue = () => {
    const config: ExportJobConfig = {
      name: sanitizeExportName(nameInput),
      codec,
      resolution,
      bitrateMbps: resolvedBitrate,
      sampleRate,
    };
    const nextId = createCollisionSafeJobId(currentJobs, () => {
      const seq = sequenceRef.current;
      sequenceRef.current += 1;
      return seq;
    });
    const createdJob: RenderQueueJob = {
      ...config,
      id: nextId,
      status: 'queued',
      progressPct: 0,
      etaLabel: 'Waiting in queue',
    };
    const nextJobs = [...currentJobs, createdJob];
    setNameInput('');
    setBitrateInput(String(resolvedBitrate));
    setLiveAnnouncement(`Added "${createdJob.name}" to render queue.`);
    if (!isControlled) {
      setInternalJobs(nextJobs);
    }
    onEnqueue?.(config, createdJob);
    onJobsChange?.(nextJobs);
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    setNameInput(event.target.value);
  };

  const handleCodecChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (disabled) return;
    const next = event.target.value;
    if (isExportCodec(next)) {
      setCodec(next);
    }
  };

  const handleResolutionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (disabled) return;
    const next = event.target.value;
    if (isExportResolution(next)) {
      setResolution(next);
    }
  };

  const handleBitrateChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled || isAudioCodec) return;
    const raw = event.target.value;
    if (raw.trim() === '') {
      setBitrateInput('');
      return;
    }
    setBitrateInput(String(sanitizeBitrate(Number(raw))));
  };

  const handleBitrateBlur = () => {
    if (bitrateInput.trim() === '') {
      setBitrateInput(String(DEFAULT_BITRATE_MBPS));
    }
  };

  const handleSampleRateChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (disabled) return;
    const next = event.target.value;
    if (isExportSampleRate(next)) {
      setSampleRate(next);
    }
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (disabled || event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      handleEnqueue();
    }
  };

  const handleClearCompleted = () => {
    const remaining = currentJobs.filter((job) => job.status !== 'completed');
    const unit = completedCount === 1 ? 'job' : 'jobs';
    commitJobs(remaining, `Cleared ${completedCount} completed render ${unit}.`);
  };

  const updateJobById = (
    jobId: string,
    updater: (job: RenderQueueJob) => RenderQueueJob,
    announcement: string
  ) => {
    const nextJobs = currentJobs.map((job) => (job.id === jobId ? updater(job) : job));
    commitJobs(nextJobs, announcement);
  };

  const handlePauseJob = (job: RenderQueueJob) => {
    updateJobById(
      job.id,
      (item) => ({ ...item, status: 'paused', etaLabel: 'Paused' }),
      `Paused "${job.name}".`
    );
  };

  const handleStartOrResumeJob = (job: RenderQueueJob) => {
    const verb = job.status === 'paused' ? 'Resumed' : 'Started';
    updateJobById(
      job.id,
      (item) => ({ ...item, status: 'rendering', etaLabel: 'Rendering' }),
      `${verb} "${job.name}".`
    );
  };

  const handleCancelJob = (job: RenderQueueJob) => {
    updateJobById(
      job.id,
      (item) => ({ ...item, status: 'cancelled', etaLabel: 'Cancelled' }),
      `Cancelled "${job.name}".`
    );
  };

  const handleRetryJob = (job: RenderQueueJob) => {
    updateJobById(
      job.id,
      (item) => ({
        ...item,
        status: 'queued',
        progressPct: 0,
        etaLabel: 'Waiting in queue',
      }),
      `Re-queued "${job.name}" for retry.`
    );
  };

  const handleRemoveJob = (job: RenderQueueJob) => {
    const nextJobs = currentJobs.filter((item) => item.id !== job.id);
    commitJobs(nextJobs, `Removed "${job.name}" from render queue.`);
  };

  const telemetrySummary = `${renderingCount} rendering \u00B7 ${queuedCount} queued \u00B7 ${completedCount} done`;
  const previewName = sanitizeExportName(nameInput);
  const idleStatusSummary =
    totalCount === 0
      ? 'Queue empty \u00B7 Ready to schedule export presets.'
      : `Queue active \u00B7 ${totalCount} ${totalCount === 1 ? 'job' : 'jobs'} tracked.`;

  const merged = mergeProps({
    themeTarget: themeProps('export-render-queue', {
      disabled,
      empty: totalCount === 0,
      renderingCount,
      queuedCount,
      completedCount,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full p-4 sm:p-5 flex flex-col gap-4 min-w-0',
      disabled ? 'opacity-65' : undefined
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('export-render-queue', 'header');
  const formClass = stableClassName('export-render-queue', 'preset-form');
  const listClass = stableClassName('export-render-queue', 'list');
  const statusBarClass = stableClassName('export-render-queue', 'status-bar');

  const fieldControlClass =
    'prism-crystal prism-focus-ring h-9 w-full min-w-0 rounded-xl px-2.5 text-xs font-medium disabled:opacity-45 disabled:cursor-not-allowed transition-all';
  const actionBtnClass =
    'prism-crystal prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all';

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Header: Title, Telemetry Pill & Clear Completed */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full pb-3 border-b'
        )}
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <Film className="w-4 h-4 shrink-0" />
          </span>
          <h3
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate min-w-0"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {safeTitle}
          </h3>
          <span
            data-testid="export-queue-telemetry"
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {telemetrySummary}
          </span>
        </div>

        <button
          type="button"
          disabled={clearCompletedDisabled}
          data-testid="export-clear-completed"
          onClick={handleClearCompleted}
          className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-all"
        >
          <Trash2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Clear Completed</span>
        </button>
      </div>

      {/* Compact New Export Preset Form */}
      <div
        role="group"
        aria-label="New export preset"
        data-testid="export-preset-form"
        className={cx(
          formClass,
          'prism-well rounded-2xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 min-w-0 max-w-full'
        )}
      >
        {/* 1. Output Filename */}
        <div className="flex flex-col gap-1 min-w-0">
          <label
            htmlFor={nameFieldId}
            className="text-[10px] font-semibold uppercase tracking-wider truncate"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            Output Filename
          </label>
          <input
            id={nameFieldId}
            type="text"
            aria-label="Export output name"
            data-testid="export-name-input"
            value={nameInput}
            placeholder={FALLBACK_EXPORT_NAME}
            disabled={disabled}
            onChange={handleNameChange}
            onKeyDown={handleInputKeyDown}
            className={fieldControlClass}
            style={{ color: 'var(--prism-text-primary)' }}
          />
        </div>

        {/* 2. Codec */}
        <div className="flex flex-col gap-1 min-w-0">
          <label
            htmlFor={codecFieldId}
            className="text-[10px] font-semibold uppercase tracking-wider truncate"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            Codec
          </label>
          <select
            id={codecFieldId}
            aria-label="Export codec"
            data-testid="export-codec-select"
            value={codec}
            disabled={disabled}
            onChange={handleCodecChange}
            className={cx(fieldControlClass, 'cursor-pointer')}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {CODEC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Resolution */}
        <div className="flex flex-col gap-1 min-w-0">
          <label
            htmlFor={resolutionFieldId}
            className="text-[10px] font-semibold uppercase tracking-wider truncate"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            Resolution
          </label>
          <select
            id={resolutionFieldId}
            aria-label="Export resolution"
            data-testid="export-resolution-select"
            value={resolution}
            disabled={disabled}
            onChange={handleResolutionChange}
            className={cx(fieldControlClass, 'cursor-pointer')}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {RESOLUTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Target Bitrate Mbps */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between gap-1 min-w-0">
            <label
              htmlFor={bitrateFieldId}
              className="text-[10px] font-semibold uppercase tracking-wider truncate"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Bitrate
            </label>
            {isAudioCodec ? (
              <span
                data-testid="export-bitrate-pcm-badge"
                className="font-mono text-[10px] font-semibold whitespace-nowrap shrink-0"
                style={{ color: 'var(--prism-info-main)' }}
              >
                Lossless PCM
              </span>
            ) : (
              <span
                data-testid="export-bitrate-readout"
                className="font-mono text-[10px] font-semibold tabular-nums whitespace-nowrap shrink-0"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {resolvedBitrate} Mbps
              </span>
            )}
          </div>
          <input
            id={bitrateFieldId}
            type="number"
            min={MIN_BITRATE_MBPS}
            max={MAX_BITRATE_MBPS}
            step={1}
            aria-label="Target bitrate Mbps"
            data-testid="export-bitrate-input"
            value={isAudioCodec ? '' : bitrateInput}
            placeholder={isAudioCodec ? 'Lossless PCM' : String(DEFAULT_BITRATE_MBPS)}
            disabled={disabled || isAudioCodec}
            onChange={handleBitrateChange}
            onBlur={handleBitrateBlur}
            onKeyDown={handleInputKeyDown}
            className={cx(fieldControlClass, 'font-mono tabular-nums')}
            style={{ color: 'var(--prism-text-primary)' }}
          />
        </div>

        {/* 5. Audio Sample Rate */}
        <div className="flex flex-col gap-1 min-w-0">
          <label
            htmlFor={sampleRateFieldId}
            className="text-[10px] font-semibold uppercase tracking-wider truncate"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            Sample Rate
          </label>
          <select
            id={sampleRateFieldId}
            aria-label="Audio sample rate"
            data-testid="export-sample-rate-select"
            value={sampleRate}
            disabled={disabled}
            onChange={handleSampleRateChange}
            className={cx(fieldControlClass, 'cursor-pointer font-mono tabular-nums')}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {SAMPLE_RATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Preset Summary & Primary Add to Queue Action */}
        <div
          className="sm:col-span-2 lg:col-span-5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t min-w-0 max-w-full"
          style={{ borderColor: 'var(--prism-divider)' }}
        >
          <span
            data-testid="export-preset-summary"
            className="font-mono text-[11px] truncate min-w-0 max-w-full"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {`${previewName} \u00B7 ${getCodecLabel(codec)} \u00B7 ${getResolutionLabel(resolution)} \u00B7 ${isAudioCodec ? 'Lossless PCM' : `${resolvedBitrate} Mbps`} \u00B7 ${getSampleRateLabel(sampleRate)}`}
          </span>
          <button
            type="button"
            disabled={disabled}
            data-testid="export-add-to-queue"
            onClick={handleEnqueue}
            className="prism-btn-primary prism-focus-ring h-9 px-4 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-all"
          >
            <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
            <span className="relative z-10">Add to Queue</span>
          </button>
        </div>
      </div>

      {/* Active Render Queue List or Empty State */}
      {totalCount === 0 ? (
        <div
          role="status"
          data-testid="export-queue-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center flex flex-col items-center gap-2 min-w-0 max-w-full"
        >
          <Layers
            aria-hidden="true"
            className="w-5 h-5 shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          />
          <p className="text-sm font-semibold" style={{ color: 'var(--prism-text-primary)' }}>
            Render queue is empty
          </p>
          <p className="text-xs max-w-md" style={{ color: 'var(--prism-text-secondary)' }}>
            Configure an export preset above and click Add to Queue to schedule your next render.
          </p>
        </div>
      ) : (
        <div
          role="list"
          aria-label={`${safeTitle} jobs`}
          data-testid="export-queue-list"
          className={cx(listClass, 'flex flex-col gap-2.5 min-w-0 max-w-full')}
        >
          {currentJobs.map((job) => {
            const statusMeta = getStatusMeta(job.status);
            const isWavJob = job.codec === 'wav-24bit';
            const jobMerged = mergeProps({
              themeTarget: themeProps(
                'export-render-queue',
                {
                  status: job.status,
                  codec: job.codec,
                  resolution: job.resolution,
                },
                'job'
              ),
              baseClassName:
                'prism-well rounded-2xl p-3.5 flex flex-col gap-2.5 min-w-0 max-w-full transition-all',
            });

            return (
              <div
                key={job.id}
                role="listitem"
                data-testid={`render-job-card-${job.id}`}
                {...jobMerged}
              >
                {/* Top Row: Name, Metadata Badges & Semantic Status Pill */}
                <div className="flex flex-wrap items-start justify-between gap-2 min-w-0 max-w-full">
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <span
                      data-testid={`render-job-name-${job.id}`}
                      className="text-sm font-semibold tracking-tight truncate min-w-0"
                      style={{ color: 'var(--prism-text-primary)' }}
                    >
                      {job.name}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span
                        data-testid={`render-job-codec-${job.id}`}
                        className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold whitespace-nowrap shrink-0"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {getCodecLabel(job.codec)}
                      </span>
                      <span
                        data-testid={`render-job-resolution-${job.id}`}
                        className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[10px] font-medium whitespace-nowrap shrink-0"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {getResolutionLabel(job.resolution)}
                      </span>
                      <span
                        data-testid={`render-job-bitrate-${job.id}`}
                        className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[10px] font-medium tabular-nums whitespace-nowrap shrink-0"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {isWavJob ? 'Lossless PCM' : `${job.bitrateMbps} Mbps`}
                      </span>
                      <span
                        data-testid={`render-job-sample-rate-${job.id}`}
                        className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[10px] font-medium tabular-nums whitespace-nowrap shrink-0"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {getSampleRateLabel(job.sampleRate)}
                      </span>
                    </div>
                  </div>

                  <span
                    data-testid={`render-job-status-${job.id}`}
                    data-status={job.status}
                    className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap shrink-0"
                    style={{
                      color: statusMeta.accentToken,
                      boxShadow: `inset 0 0 0 1px ${statusMeta.accentToken}`,
                    }}
                  >
                    {renderStatusIcon(job.status)}
                    <span>{statusMeta.label}</span>
                  </span>
                </div>

                {/* Progress Bar Row */}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] min-w-0">
                    <span
                      data-testid={`render-job-eta-${job.id}`}
                      className="font-mono truncate min-w-0"
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      {job.etaLabel ?? statusMeta.label}
                    </span>
                    <span
                      data-testid={`render-job-pct-${job.id}`}
                      className="font-mono font-semibold tabular-nums whitespace-nowrap shrink-0"
                      style={{ color: 'var(--prism-text-primary)' }}
                    >
                      {job.progressPct}%
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-label={`${job.name} render progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={job.progressPct}
                    aria-valuetext={`${job.progressPct}% \u00B7 ${statusMeta.label}`}
                    data-testid={`render-job-progress-${job.id}`}
                    className="prism-crystal w-full h-2 rounded-full overflow-hidden p-0.5"
                  >
                    <div
                      data-testid={`render-job-progress-fill-${job.id}`}
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${job.progressPct}%`,
                        backgroundColor: statusMeta.progressToken,
                      }}
                    />
                  </div>
                </div>

                {/* Contextual Job Actions */}
                <div
                  className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t min-w-0"
                  style={{ borderColor: 'var(--prism-divider)' }}
                >
                  {job.status === 'rendering' ? (
                    <>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Pause ${job.name}`}
                        data-testid={`render-job-pause-${job.id}`}
                        onClick={() => handlePauseJob(job)}
                        className={actionBtnClass}
                        style={{ color: 'var(--prism-warning-main)' }}
                      >
                        <Pause aria-hidden="true" className="w-3 h-3 shrink-0" />
                        <span>Pause</span>
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Cancel ${job.name}`}
                        data-testid={`render-job-cancel-${job.id}`}
                        onClick={() => handleCancelJob(job)}
                        className={actionBtnClass}
                        style={{ color: 'var(--prism-error-main)' }}
                      >
                        <X aria-hidden="true" className="w-3 h-3 shrink-0" />
                        <span>Cancel</span>
                      </button>
                    </>
                  ) : null}

                  {job.status === 'paused' || job.status === 'queued' ? (
                    <>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`${job.status === 'paused' ? 'Resume' : 'Start'} ${job.name}`}
                        data-testid={`render-job-start-${job.id}`}
                        onClick={() => handleStartOrResumeJob(job)}
                        className={actionBtnClass}
                        style={{ color: 'var(--prism-primary-main)' }}
                      >
                        <Play aria-hidden="true" className="w-3 h-3 shrink-0" />
                        <span>{job.status === 'paused' ? 'Resume' : 'Start'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Cancel ${job.name}`}
                        data-testid={`render-job-cancel-${job.id}`}
                        onClick={() => handleCancelJob(job)}
                        className={actionBtnClass}
                        style={{ color: 'var(--prism-error-main)' }}
                      >
                        <X aria-hidden="true" className="w-3 h-3 shrink-0" />
                        <span>Cancel</span>
                      </button>
                    </>
                  ) : null}

                  {job.status === 'failed' || job.status === 'cancelled' ? (
                    <>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Retry ${job.name}`}
                        data-testid={`render-job-retry-${job.id}`}
                        onClick={() => handleRetryJob(job)}
                        className={actionBtnClass}
                        style={{ color: 'var(--prism-info-main)' }}
                      >
                        <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
                        <span>Retry</span>
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`Remove ${job.name}`}
                        data-testid={`render-job-remove-${job.id}`}
                        onClick={() => handleRemoveJob(job)}
                        className={actionBtnClass}
                        style={{ color: 'var(--prism-error-main)' }}
                      >
                        <Trash2 aria-hidden="true" className="w-3 h-3 shrink-0" />
                        <span>Remove</span>
                      </button>
                    </>
                  ) : null}

                  {job.status === 'completed' ? (
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={`Remove ${job.name}`}
                      data-testid={`render-job-remove-${job.id}`}
                      onClick={() => handleRemoveJob(job)}
                      className={actionBtnClass}
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      <Trash2 aria-hidden="true" className="w-3 h-3 shrink-0" />
                      <span>Remove</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Polite Live Queue Announcement Region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        data-testid="export-queue-live-status"
        className={cx(
          statusBarClass,
          'prism-well rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0 max-w-full'
        )}
        style={{ color: 'var(--prism-text-secondary)' }}
      >
        <span
          className="font-mono text-[11px] truncate min-w-0"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {liveAnnouncement || idleStatusSummary}
        </span>
        <span className="font-mono text-[11px] tabular-nums whitespace-nowrap shrink-0">
          {telemetrySummary}
        </span>
      </div>
    </div>
  );
}

ExportRenderQueue.displayName = 'ExportRenderQueue';
