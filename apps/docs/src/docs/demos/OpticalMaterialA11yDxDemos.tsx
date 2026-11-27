import { useState } from 'react';
import {
  AdaptiveContrastGlass,
  AmbientAccentExtractor,
  FocusPrismaticRing,
  LiveAnnouncerProvider,
  LiveAnnouncerRegion,
  OpticalCard,
  OpticalMaterialSurface,
  PrimaryButton,
  SecondaryButton,
  Slot,
  useHaptics,
  useLiveAnnouncer,
  useMicroAudio,
} from '@refractor-ui/core';

export interface OpticalMaterialA11yDxDemosProps {
  componentId: string;
}

function LiveAnnouncerDemoTrigger() {
  const { announce } = useLiveAnnouncer();
  return (
    <div className="flex flex-wrap gap-2">
      <SecondaryButton size="sm" onClick={() => announce('AI token stream completed.', 'polite')}>
        Polite Announcement
      </SecondaryButton>
      <PrimaryButton size="sm" onClick={() => announce('Validation error on field.', 'assertive')}>
        Assertive Alert
      </PrimaryButton>
    </div>
  );
}

export function OpticalMaterialA11yDxDemos({ componentId }: OpticalMaterialA11yDxDemosProps) {
  const [darkBackdrop, setDarkBackdrop] = useState(false);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const { playGlassClick } = useMicroAudio({ enabled: false });
  const { light } = useHaptics({ enabled: true });

  if (componentId === 'adaptive-contrast-glass') {
    const backdrop = darkBackdrop ? '#0f172a' : '#f1f5f9';
    return (
      <div className="flex flex-col gap-3">
        <AdaptiveContrastGlass backdropColor={backdrop} showTelemetry>
          <p className="text-xs font-medium">
            Foreground ink & inner bevels flip automatically for WCAG AA legibility.
          </p>
        </AdaptiveContrastGlass>
        <SecondaryButton size="sm" onClick={() => setDarkBackdrop((d) => !d)}>
          Switch Backdrop ({darkBackdrop ? 'Dark' : 'Bright'})
        </SecondaryButton>
      </div>
    );
  }

  if (componentId === 'optical-material-surface') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <OpticalMaterialSurface tier="wafer">Wafer (Thin Frosted)</OpticalMaterialSurface>
        <OpticalMaterialSurface tier="lens">Lens (Medium Card)</OpticalMaterialSurface>
        <OpticalMaterialSurface tier="prism">Prism (Thick Bevel)</OpticalMaterialSurface>
      </div>
    );
  }

  if (componentId === 'ambient-accent-extractor') {
    const palettes: ReadonlyArray<ReadonlyArray<string>> = [
      ['#0f172a', '#f97316', '#38bdf8'],
      ['#1e1b4b', '#a855f7', '#10b981'],
    ];
    return (
      <div className="flex flex-col gap-3">
        <AmbientAccentExtractor
          wallpaperSwatches={palettes[paletteIdx] ?? palettes[0]!}
          sourceLabel={paletteIdx === 0 ? 'Solar Horizon Wallpaper' : 'Amethyst Aurora Wallpaper'}
        >
          <p className="text-xs">Extracted primary & secondary hues tint rim glow in real time.</p>
        </AmbientAccentExtractor>
        <SecondaryButton size="sm" onClick={() => setPaletteIdx((i) => (i + 1) % palettes.length)}>
          Cycle Wallpaper Palette
        </SecondaryButton>
      </div>
    );
  }

  if (componentId === 'focus-prismatic-ring') {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <FocusPrismaticRing radius="full" forceVisible>
          <PrimaryButton
            size="sm"
            onClick={() => {
              playGlassClick();
              light();
            }}
          >
            Prismatic Focus Ring
          </PrimaryButton>
        </FocusPrismaticRing>
      </div>
    );
  }

  if (componentId === 'live-announcer-region') {
    return (
      <LiveAnnouncerProvider>
        <div className="flex flex-col gap-3">
          <LiveAnnouncerDemoTrigger />
          <LiveAnnouncerRegion
            politeMessage="Status channel ready (polite)"
            assertiveMessage="Alert channel ready (assertive)"
            visible
          />
        </div>
      </LiveAnnouncerProvider>
    );
  }

  if (componentId === 'slot-polymorphic') {
    return (
      <Slot className="prism-btn-primary inline-flex items-center rounded-full px-4 py-2 text-xs font-medium">
        <a href="#slot-polymorphic">Polymorphic Anchor via Slot (No wrapper div)</a>
      </Slot>
    );
  }

  return (
    <OpticalCard.Root material="prism" density="comfortable">
      <OpticalCard.PrismEdge position="top" />
      <OpticalCard.Header>Compound OpticalCard API</OpticalCard.Header>
      <OpticalCard.Body>
        Clean sub-parts (`Root`, `PrismEdge`, `Header`, `Body`, `Footer`) share material and density context.
      </OpticalCard.Body>
      <OpticalCard.Footer>Zero 40-prop mega-components</OpticalCard.Footer>
    </OpticalCard.Root>
  );
}
