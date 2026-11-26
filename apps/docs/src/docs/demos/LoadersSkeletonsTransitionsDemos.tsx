import { useState } from 'react';
import {
  AcousticActivityBar,
  AiThinkingOrb,
  DataGridRowShimmer,
  OrbitalRingSpinner,
  PipelinePulseLoader,
  PrimaryButton,
  RefractiveSkeleton,
  ScanlineRadarSweep,
  SecondaryButton,
  SegmentedGlassProgress,
  StreamingTokenReveal,
  type AiOrbState,
  type PipelineStageItem,
  type RefractiveSkeletonPreset,
  type ScanlineSweepMode,
} from '@refractor-ui/core';

export interface LoadersSkeletonsTransitionsDemosProps {
  componentId: string;
}

const STREAM_SAMPLE =
  'Refractor optical shaders compile cleanly at 60fps with DPR capping, offscreen visibility pausing, and pure tree-shakeable React 19 exports.';

export function LoadersSkeletonsTransitionsDemos({
  componentId,
}: LoadersSkeletonsTransitionsDemosProps) {
  const [skelLoading, setSkelLoading] = useState(true);
  const [skelPreset, setSkelPreset] = useState<RefractiveSkeletonPreset>('card');
  const [orbState, setOrbState] = useState<AiOrbState>('thinking');
  const [progress, setProgress] = useState(68);
  const [streamKey, setStreamKey] = useState(1);
  const [gridLoading, setGridLoading] = useState(true);
  const [acousticActive, setAcousticActive] = useState(true);
  const [activeStageIdx, setActiveStageIdx] = useState(2);
  const [scanMode, setScanMode] = useState<ScanlineSweepMode>('vertical');
  const [scanActive, setScanActive] = useState(true);

  switch (componentId) {
    case 'refractive-skeleton':
      return (
        <div className="space-y-3 w-full">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['card', 'profile', 'article', 'media', 'metrics'] as const).map((p) => (
              <SecondaryButton
                key={p}
                size="sm"
                tone={skelPreset === p ? 'cobalt' : 'crystal'}
                onClick={() => setSkelPreset(p)}
              >
                {p}
              </SecondaryButton>
            ))}
            <PrimaryButton size="sm" onClick={() => setSkelLoading((l) => !l)}>
              {skelLoading ? 'Reveal Data' : 'Show Skeleton'}
            </PrimaryButton>
          </div>
          <RefractiveSkeleton loading={skelLoading} preset={skelPreset} lines={3}>
            <div className="prism-slab rounded-2xl p-5 space-y-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Optical Glass Telemetry Loaded
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Resolved seamlessly without cumulative layout shift.
              </p>
            </div>
          </RefractiveSkeleton>
        </div>
      );

    case 'orbital-ring-spinner':
      return (
        <div className="flex flex-wrap items-center gap-6 py-2">
          <OrbitalRingSpinner size="sm" label="Small wait" />
          <OrbitalRingSpinner size="md" label="Syncing shards…" showLabel />
          <OrbitalRingSpinner size="lg" label="Large wait" />
        </div>
      );

    case 'ai-thinking-orb':
      return (
        <div className="space-y-4 w-full">
          <div className="flex flex-wrap gap-1.5">
            {(['idle', 'listening', 'thinking', 'generating', 'complete'] as const).map((st) => (
              <SecondaryButton
                key={st}
                size="sm"
                tone={orbState === st ? 'cobalt' : 'crystal'}
                onClick={() => setOrbState(st)}
              >
                {st}
              </SecondaryButton>
            ))}
          </div>
          <div className="flex justify-center py-2">
            <AiThinkingOrb state={orbState} sizePx={82} showLabel />
          </div>
        </div>
      );

    case 'segmented-glass-progress':
      return (
        <div className="space-y-4 w-full">
          <SegmentedGlassProgress value={progress} segments={10} tone="prism" label="Optical Pipeline" />
          <SegmentedGlassProgress value={Math.min(100, progress + 18)} segments={1} tone="emerald" label="Continuous Liquid Fill" />
          <div className="flex items-center gap-3">
            <input
              type="range"
              aria-label="Progress percentage"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="flex-1"
            />
            <SecondaryButton size="sm" onClick={() => setProgress((p) => (p >= 100 ? 15 : Math.min(100, p + 15)))}>
              +15%
            </SecondaryButton>
          </div>
        </div>
      );

    case 'streaming-token-reveal':
      return (
        <div className="space-y-3 w-full">
          <StreamingTokenReveal
            key={streamKey}
            text={STREAM_SAMPLE}
            revealRateMs={40}
            chunkSize={1}
          />
          <div className="flex justify-end">
            <SecondaryButton size="sm" onClick={() => setStreamKey((k) => k + 1)}>
              Replay Token Stream
            </SecondaryButton>
          </div>
        </div>
      );

    case 'data-grid-row-shimmer':
      return (
        <div className="space-y-3 w-full">
          <div className="flex justify-end">
            <PrimaryButton size="sm" onClick={() => setGridLoading((l) => !l)}>
              {gridLoading ? 'Load Table Data' : 'Show Staggered Cascade'}
            </PrimaryButton>
          </div>
          <DataGridRowShimmer
            loading={gridLoading}
            rows={4}
            columns={['Shader Module', 'Renderer', 'Frame Time', 'Status']}
          >
            <div className="w-full overflow-x-auto p-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300/50 dark:border-slate-700/60">
                    <th className="py-2 pr-4 font-semibold">Shader Module</th>
                    <th className="py-2 pr-4 font-semibold">Renderer</th>
                    <th className="py-2 pr-4 font-semibold">Frame Time</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 font-mono">refractive-lens</td>
                    <td className="py-2 pr-4">WebGL / CSS</td>
                    <td className="py-2 pr-4 font-mono">0.34ms</td>
                    <td className="py-2 text-emerald-600 dark:text-emerald-400 font-semibold">Ready</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </DataGridRowShimmer>
        </div>
      );

    case 'acoustic-activity-bar':
      return (
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <AcousticActivityBar active={acousticActive} barCount={11} tone="prism" showLabel label={acousticActive ? 'Voice stream active' : 'Muted'} />
          <SecondaryButton size="sm" onClick={() => setAcousticActive((a) => !a)}>
            {acousticActive ? 'Pause Audio' : 'Resume Audio'}
          </SecondaryButton>
        </div>
      );

    case 'pipeline-pulse-loader': {
      const labels = ['Fetch AST', 'Compile GLSL', 'Audit Coverage', 'Deploy Pages'];
      const stages: PipelineStageItem[] = labels.map((lbl, idx) => ({
        id: `stage-${idx}`,
        label: lbl,
        detail: idx < activeStageIdx ? 'Done' : idx === activeStageIdx ? 'Running…' : 'Queued',
        status: idx < activeStageIdx ? 'completed' : idx === activeStageIdx ? 'active' : 'pending',
      }));
      return (
        <div className="space-y-3 w-full">
          <PipelinePulseLoader
            stages={stages}
            onStageSelect={(st) => {
              const found = stages.findIndex((s) => s.id === st.id);
              if (found >= 0) setActiveStageIdx(found);
            }}
          />
          <div className="flex justify-end">
            <SecondaryButton size="sm" onClick={() => setActiveStageIdx((i) => (i + 1) % labels.length)}>
              Advance Stage
            </SecondaryButton>
          </div>
        </div>
      );
    }

    case 'scanline-radar-sweep':
      return (
        <div className="space-y-3 w-full">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['vertical', 'horizontal', 'radar'] as const).map((m) => (
              <SecondaryButton
                key={m}
                size="sm"
                tone={scanMode === m ? 'cobalt' : 'crystal'}
                onClick={() => setScanMode(m)}
              >
                {m}
              </SecondaryButton>
            ))}
            <PrimaryButton size="sm" onClick={() => setScanActive((a) => !a)}>
              {scanActive ? 'Stop Scan' : 'Start Scan'}
            </PrimaryButton>
          </div>
          <ScanlineRadarSweep active={scanActive} mode={scanMode} tone="cyan" statusLabel={`Security scan (${scanMode})`}>
            <pre className="p-5 text-xs font-mono text-slate-700 dark:text-slate-200 overflow-x-auto">
              <code>{`export const optics = createPrismTheme({\n  optics: { refraction: 'vivid', blurPx: 12 },\n});`}</code>
            </pre>
          </ScanlineRadarSweep>
        </div>
      );

    default:
      return null;
  }
}
