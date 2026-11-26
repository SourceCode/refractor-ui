import { useState } from 'react';
import {
  AiFocusRing,
  AmbientAuraBleed,
  FluidMeshCanvas,
  GradientTextSelection,
  IridescentRimSurface,
  PrimaryButton,
  PrismaticCursorHalo,
  ReactiveInputShimmer,
  SecondaryButton,
  StatefulEnergyRibbon,
  type CursorHaloSpectrum,
  type EnergyRibbonState,
  type FluidMeshMood,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface GradientAiGlowFxDemosProps {
  componentId: string;
}

export function GradientAiGlowFxDemos({ componentId }: GradientAiGlowFxDemosProps) {
  const dispatch = useAppDispatch();
  const [spectrum, setSpectrum] = useState<CursorHaloSpectrum>('prismatic');
  const [processing, setProcessing] = useState(true);
  const [mood, setMood] = useState<FluidMeshMood>('creative');
  const [cadence, setCadence] = useState(0.45);
  const [auraBreathing, setAuraBreathing] = useState(true);
  const [shimmerTick, setShimmerTick] = useState(0);
  const [ribbonState, setRibbonState] = useState<EnergyRibbonState>('thinking');

  switch (componentId) {
    case 'prismatic-cursor-halo':
      return (
        <div className="space-y-3 w-full">
          <div className="flex flex-wrap gap-1.5">
            {(['prismatic', 'aurora', 'solar', 'emerald'] as const).map((item) => (
              <SecondaryButton
                key={item}
                size="sm"
                tone={spectrum === item ? 'cobalt' : 'crystal'}
                onClick={() => setSpectrum(item)}
              >
                {item}
              </SecondaryButton>
            ))}
          </div>
          <PrismaticCursorHalo spectrum={spectrum} radiusPx={240} intensity={0.85} className="p-5">
            <div className="space-y-1.5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Move cursor across this optical workspace
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tracks pointer coordinates via rAF-coalesced CSS variables with zero React re-renders.
              </p>
            </div>
          </PrismaticCursorHalo>
        </div>
      );

    case 'ai-focus-ring':
      return (
        <div className="space-y-3 w-full">
          <AiFocusRing active processing={processing} palette="ai-spectrum">
            <div className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Autonomous Shader Synthesis Prompt
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {processing ? 'Processing reasoning trace…' : 'Idle — click or focus to activate.'}
                </p>
              </div>
              <PrimaryButton size="sm" onClick={() => setProcessing((p) => !p)}>
                {processing ? 'Set Idle' : 'Simulate Processing'}
              </PrimaryButton>
            </div>
          </AiFocusRing>
        </div>
      );

    case 'fluid-mesh-canvas':
      return (
        <div className="space-y-3 w-full">
          <div className="flex flex-wrap items-center gap-2">
            {(['calm', 'creative', 'thinking', 'alert'] as const).map((m) => (
              <SecondaryButton
                key={m}
                size="sm"
                tone={mood === m ? 'cobalt' : 'crystal'}
                onClick={() => setMood(m)}
              >
                {m}
              </SecondaryButton>
            ))}
            <label className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-2 ml-auto">
              <span>Cadence</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={cadence}
                onChange={(e) => setCadence(Number(e.target.value))}
                className="w-24"
              />
            </label>
          </div>
          <FluidMeshCanvas mood={mood} cadence={cadence} className="p-6">
            <div className="prism-crystal rounded-2xl p-4 space-y-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Ambient Morphing Mesh Backdrop
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Hover to warp field focus; auto-pauses offscreen and in background tabs.
              </p>
            </div>
          </FluidMeshCanvas>
        </div>
      );

    case 'gradient-text-selection':
      return (
        <div className="space-y-3 w-full">
          <GradientTextSelection
            mode="editable"
            palette="spectrum"
            label="Focus or highlight inside prompt"
            onSubmit={(val) =>
              dispatch(pushToast({ title: 'Submitted gradient prompt', description: val, tone: 'emerald' }))
            }
          />
          <GradientTextSelection mode="prose" palette="aurora" label="Selectable optical prose" />
        </div>
      );

    case 'ambient-aura-bleed':
      return (
        <div className="space-y-4 w-full pb-4">
          <AmbientAuraBleed tone="prism" elevation="lg" breathing={auraBreathing}>
            <div className="prism-slab rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Antigravity Floating Optical Card
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Soft radial light bloom anchored beneath elevated glass surfaces.
                </p>
              </div>
              <SecondaryButton size="sm" onClick={() => setAuraBreathing((b) => !b)}>
                {auraBreathing ? 'Pause Drift' : 'Resume Drift'}
              </SecondaryButton>
            </div>
          </AmbientAuraBleed>
        </div>
      );

    case 'reactive-input-shimmer':
      return (
        <div className="space-y-3 w-full">
          <ReactiveInputShimmer
            shimmerTrigger={shimmerTick}
            onSubmit={(val) =>
              dispatch(
                pushToast({
                  title: 'Prompt shimmer dispatched',
                  description: val || '(empty prompt)',
                  tone: 'info',
                })
              )
            }
          />
          <div className="flex justify-end">
            <SecondaryButton size="sm" onClick={() => setShimmerTick((t) => t + 1)}>
              Replay Shimmer Sweep
            </SecondaryButton>
          </div>
        </div>
      );

    case 'iridescent-rim-surface':
      return (
        <IridescentRimSurface spectrum="dichroic" intensity={0.9} className="p-5 w-full">
          <div className="space-y-1.5">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Cursor-Reactive Dichroic Rim Surface
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Sweep pointer around the card to shift specular rim-light color temperature and angle.
            </p>
          </div>
        </IridescentRimSurface>
      );

    case 'stateful-energy-ribbon':
      return (
        <div className="space-y-3 w-full">
          <div className="flex flex-wrap gap-1.5">
            {(['idle', 'listening', 'thinking', 'streaming', 'success', 'error'] as const).map((st) => (
              <SecondaryButton
                key={st}
                size="sm"
                tone={ribbonState === st ? 'cobalt' : 'crystal'}
                onClick={() => setRibbonState(st)}
              >
                {st}
              </SecondaryButton>
            ))}
          </div>
          <div className="prism-slab relative overflow-hidden rounded-2xl p-5 pt-6">
            <StatefulEnergyRibbon state={ribbonState} position="top" thicknessPx={4} />
            <StatefulEnergyRibbon state={ribbonState} position="inline" thicknessPx={4} showLabel />
          </div>
        </div>
      );

    default:
      return null;
  }
}
