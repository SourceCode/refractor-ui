import { useState } from 'react';
import {
  CausticLightLayer,
  ChromaticDispersionEdge,
  FrostedGrainOverlay,
  HolographicFoilSheen,
  LiquidRippleTrigger,
  MetaballFluidBackdrop,
  OpticalDepthVignette,
  PrimaryButton,
  RefractiveLensContainer,
  SecondaryButton,
  type FrostedGrainSize,
  type HolographicFoilPreset,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface ShaderOpticalFxDemosProps {
  componentId: string;
}

export function ShaderOpticalFxDemos({ componentId }: ShaderOpticalFxDemosProps) {
  const dispatch = useAppDispatch();
  const [ior, setIor] = useState(1.52);
  const [dispersion, setDispersion] = useState(1.45);
  const [grainSize, setGrainSize] = useState<FrostedGrainSize>('fine');
  const [rippleCount, setRippleCount] = useState(0);
  const [foilPreset, setFoilPreset] = useState<HolographicFoilPreset>('dichroic');
  const [orbCount, setOrbCount] = useState(3);
  const [vignetteActive, setVignetteActive] = useState(true);

  switch (componentId) {
    case 'refractive-lens-container':
      return (
        <div className="space-y-3 w-full">
          <label className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3">
            <span>Index of Refraction ({ior.toFixed(2)})</span>
            <input
              type="range"
              min={1.0}
              max={2.2}
              step={0.05}
              value={ior}
              onChange={(e) => setIor(Number(e.target.value))}
              className="flex-1 max-w-44"
            />
          </label>
          <RefractiveLensContainer ior={ior} magnification={1.04} className="p-6">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Liquid Acrylic Optical Lens Container
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                WebGL/GLSL fragment refraction with Fresnel specular edge and seamless CSS fallback.
              </p>
            </div>
          </RefractiveLensContainer>
        </div>
      );

    case 'chromatic-dispersion-edge':
      return (
        <div className="space-y-3 w-full">
          <label className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3">
            <span>RGB Dispersion ({dispersion.toFixed(2)})</span>
            <input
              type="range"
              min={0.6}
              max={2.6}
              step={0.1}
              value={dispersion}
              onChange={(e) => setDispersion(Number(e.target.value))}
              className="flex-1 max-w-44"
            />
          </label>
          <ChromaticDispersionEdge dispersion={dispersion} className="p-5">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Prismatic RGB Edge Caustic Shader
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Splits light along curved perimeters into optical red/cyan/cobalt dispersion edges.
              </p>
            </div>
          </ChromaticDispersionEdge>
        </div>
      );

    case 'caustic-light-layer':
      return (
        <CausticLightLayer intensity={0.8} scale={1.3} speed={1.0} className="p-6 w-full">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Underwater Caustic Filament Projection
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Casts shifting bright optical filaments across hero surfaces and workspace headers.
            </p>
          </div>
        </CausticLightLayer>
      );

    case 'frosted-grain-overlay':
      return (
        <div className="space-y-3 w-full">
          <div className="flex flex-wrap gap-1.5">
            {(['fine', 'medium', 'coarse'] as const).map((sz) => (
              <SecondaryButton
                key={sz}
                size="sm"
                tone={grainSize === sz ? 'cobalt' : 'crystal'}
                onClick={() => setGrainSize(sz)}
              >
                {sz}
              </SecondaryButton>
            ))}
          </div>
          <FrostedGrainOverlay grainSize={grainSize} opacity={0.16} className="p-5">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Matte-Etched Procedural Micro-Grain Surface
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Eliminates 8-bit gradient banding with tactile optical film grain and zero idle cost.
              </p>
            </div>
          </FrostedGrainOverlay>
        </div>
      );

    case 'liquid-ripple-trigger':
      return (
        <LiquidRippleTrigger
          className="p-6 w-full"
          onRipple={(origin) => {
            setRippleCount((c) => c + 1);
            dispatch(
              pushToast({
                title: 'Refractive shockwave launched',
                description: `Origin (${Math.round(origin.normalizedX * 100)}%, ${Math.round(origin.normalizedY * 100)}%)`,
                tone: 'info',
              })
            );
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Click or press Enter anywhere to launch a shockwave
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Waves launched this session: <span className="font-mono font-semibold">{rippleCount}</span>
              </p>
            </div>
            <PrimaryButton size="sm">Trigger Wave</PrimaryButton>
          </div>
        </LiquidRippleTrigger>
      );

    case 'holographic-foil-sheen':
      return (
        <div className="space-y-3 w-full">
          <div className="flex flex-wrap gap-1.5">
            {(['dichroic', 'pearl', 'titanium', 'prism-gold'] as const).map((p) => (
              <SecondaryButton
                key={p}
                size="sm"
                tone={foilPreset === p ? 'cobalt' : 'crystal'}
                onClick={() => setFoilPreset(p)}
              >
                {p}
              </SecondaryButton>
            ))}
          </div>
          <HolographicFoilSheen preset={foilPreset} tiltDegrees={6} className="p-6">
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Refractor Pro Edition · 0042
              </div>
              <div className="text-base font-bold text-slate-950 dark:text-white">
                Dichroic Holographic Foil Card
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Move cursor across the badge to sweep pearlescent metallic sheen and 3D tilt.
              </p>
            </div>
          </HolographicFoilSheen>
        </div>
      );

    case 'metaball-fluid-backdrop':
      return (
        <div className="space-y-3 w-full">
          <div className="flex items-center gap-2">
            {([2, 3, 4, 5] as const).map((n) => (
              <SecondaryButton
                key={n}
                size="sm"
                tone={orbCount === n ? 'cobalt' : 'crystal'}
                onClick={() => setOrbCount(n)}
              >
                {n} Orbs
              </SecondaryButton>
            ))}
          </div>
          <MetaballFluidBackdrop orbCount={orbCount} className="p-6">
            <div className="prism-crystal rounded-2xl p-4 space-y-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Procedural SDF Metaball Fluid Surface
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Glowing optical orbs organically merge and separate behind frosted glass controls.
              </p>
            </div>
          </MetaballFluidBackdrop>
        </div>
      );

    case 'optical-depth-vignette':
      return (
        <div className="space-y-3 w-full">
          <div className="flex justify-end">
            <SecondaryButton size="sm" onClick={() => setVignetteActive((a) => !a)}>
              {vignetteActive ? 'Clear Depth Blur' : 'Focus Spotlight Gate'}
            </SecondaryButton>
          </div>
          <OpticalDepthVignette
            active={vignetteActive}
            blurPx={6}
            onDismiss={() => setVignetteActive(false)}
            foreground={
              vignetteActive ? (
                <div className="p-5 flex justify-center">
                  <div className="prism-slab rounded-2xl p-4 max-w-sm w-full space-y-2 shadow-xl">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Deployment Approval Gate
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Background canvas progressively dims and blurs; click veil or press Esc to dismiss.
                    </p>
                    <PrimaryButton size="sm" onClick={() => setVignetteActive(false)}>
                      Approve &amp; Dismiss
                    </PrimaryButton>
                  </div>
                </div>
              ) : undefined
            }
          >
            <div className="prism-slab p-6 space-y-2">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Inactive Background Workspace Layer
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Metrics, timelines, and sibling windows step back smoothly when a modal spotlight opens.
              </p>
            </div>
          </OpticalDepthVignette>
        </div>
      );

    default:
      return null;
  }
}
