import { useState } from 'react';
import {
  AnimateNumber,
  MorphingMediaGallery,
  MotionPerformanceDoctor,
  MotionStudio,
  SecondaryButton,
  SplitTextReveal,
  SvgPathAnimator,
} from '@refractor-ui/core';

export interface AnimatedMediaToolingDemosProps {
  componentId: string;
}

const GALLERY_ITEMS = [
  { id: 'g1', title: 'Alabaster Prism', caption: 'High-clarity frosted specular slab', badge: 'Light' },
  { id: 'g2', title: 'Obsidian Caustic', caption: 'Deep refractive dark-mode lens', badge: 'Dark' },
  { id: 'g3', title: 'Solar Dispersion', caption: 'Chromatic rim dispersion highlights', badge: 'Prism' },
];

export function AnimatedMediaToolingDemos({ componentId }: AnimatedMediaToolingDemosProps) {
  const [metric, setMetric] = useState(4280.5);
  const [revealed, setRevealed] = useState(true);
  const [drawProgress, setDrawProgress] = useState(0.85);

  if (componentId === 'animate-number') {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <AnimateNumber value={metric} decimals={1} prefix="$" suffix=" MRR" className="text-xl" />
        <SecondaryButton size="sm" onClick={() => setMetric((v) => v + 342.4)}>
          Increment KPI
        </SecondaryButton>
      </div>
    );
  }

  if (componentId === 'split-text-reveal') {
    return (
      <div className="flex flex-col gap-3">
        <SplitTextReveal
          text="Refractive Motion Typography"
          splitBy="words"
          revealed={revealed}
          className="text-base font-semibold"
        />
        <SecondaryButton size="sm" onClick={() => setRevealed((r) => !r)}>
          {revealed ? 'Mask Headline' : 'Reveal Headline'}
        </SecondaryButton>
      </div>
    );
  }

  if (componentId === 'svg-path-animator') {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <SvgPathAnimator preset="checkmark" progress={drawProgress} label="Animated checkmark" />
        <SvgPathAnimator preset="sparkline" progress={drawProgress} label="Animated sparkline" />
        <SecondaryButton
          size="sm"
          onClick={() => setDrawProgress((p) => (p >= 1 ? 0.25 : 1))}
        >
          Toggle Draw ({Math.round(drawProgress * 100)}%)
        </SecondaryButton>
      </div>
    );
  }

  if (componentId === 'morphing-media-gallery') {
    return <MorphingMediaGallery items={GALLERY_ITEMS} />;
  }

  if (componentId === 'motion-studio') {
    return <MotionStudio initialToken="lively" />;
  }

  return (
    <MotionPerformanceDoctor
      sourceCode=".glass { transition: transform 180ms ease; } @media (prefers-reduced-motion: reduce) { .glass { transition: none; } }"
      frameDurationsMs={[8.2, 8.5, 8.1, 8.4, 8.3]}
    />
  );
}
