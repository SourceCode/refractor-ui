import { useState } from 'react';
import {
  AnimatePresence,
  GestureSurface,
  LayoutMotionBox,
  MagneticCursor,
  PrimaryButton,
  ScrollLinkedStage,
  SecondaryButton,
  SharedElementTransition,
  SharedLayoutProvider,
  SpatialDepthDeck,
} from '@refractor-ui/core';

export interface MotionGesturesScrollDemosProps {
  componentId: string;
}

const DECK_LAYERS = [
  { id: 'optic-1', title: 'Primary Lens Plane', subtitle: 'Z:0px · Crisp focal surface' },
  { id: 'optic-2', title: 'Refractive Mid Layer', subtitle: 'Z:-38px · Secondary glass depth' },
  { id: 'optic-3', title: 'Caustic Backdrop', subtitle: 'Z:-76px · Ambient light field' },
];

export function MotionGesturesScrollDemos({ componentId }: MotionGesturesScrollDemosProps) {
  const [alignedRight, setAlignedRight] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'motion' | 'optics'>('motion');
  const [showToast, setShowToast] = useState(true);
  const [tapCount, setTapCount] = useState(0);

  if (componentId === 'layout-motion-box') {
    return (
      <div className="flex flex-col gap-3">
        <div className={`flex ${alignedRight ? 'justify-end' : 'justify-start'}`}>
          <LayoutMotionBox
            layoutDependency={alignedRight}
            borderRadiusPx={20}
            className="px-4 py-2.5 text-xs font-medium"
          >
            Scale-Corrected Glass Pill ({alignedRight ? 'Right' : 'Left'})
          </LayoutMotionBox>
        </div>
        <SecondaryButton size="sm" onClick={() => setAlignedRight((prev) => !prev)}>
          Toggle justify-content FLIP
        </SecondaryButton>
      </div>
    );
  }

  if (componentId === 'shared-element-transition') {
    const tabs: ReadonlyArray<'design' | 'motion' | 'optics'> = ['design', 'motion', 'optics'];
    return (
      <SharedLayoutProvider>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="relative rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer"
            >
              {activeTab === tab ? (
                <SharedElementTransition
                  layoutId="demo-active-pill"
                  borderRadiusPx={999}
                  className="prism-btn-primary px-3 py-1 rounded-full"
                >
                  {tab}
                </SharedElementTransition>
              ) : (
                <span className="prism-btn-secondary px-3 py-1 rounded-full">{tab}</span>
              )}
            </button>
          ))}
        </div>
      </SharedLayoutProvider>
    );
  }

  if (componentId === 'animate-presence') {
    return (
      <div className="flex flex-col gap-3">
        <SecondaryButton size="sm" onClick={() => setShowToast((prev) => !prev)}>
          {showToast ? 'Dismiss Glass Sheet' : 'Mount Glass Sheet'}
        </SecondaryButton>
        <AnimatePresence exitDurationMs={180}>
          {showToast ? (
            <div key="demo-sheet" className="prism-slab rounded-xl px-4 py-3 text-xs">
              Optical notification stays mounted until exit transition completes.
            </div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  if (componentId === 'gesture-surface') {
    return (
      <GestureSurface
        draggable
        dragBounds={{ minX: -60, maxX: 60, minY: -24, maxY: 24 }}
        onTap={() => setTapCount((c) => c + 1)}
        className="rounded-2xl p-4 text-xs"
      >
        Drag with momentum or tap/Enter (taps: {tapCount})
      </GestureSurface>
    );
  }

  if (componentId === 'magnetic-cursor') {
    return (
      <MagneticCursor className="rounded-2xl prism-well p-5 flex flex-wrap gap-3 items-center">
        <PrimaryButton size="sm" data-magnetic-target="true">
          Magnetic Primary
        </PrimaryButton>
        <SecondaryButton size="sm" data-magnetic-target="true">
          Snap Glass Tile
        </SecondaryButton>
      </MagneticCursor>
    );
  }

  if (componentId === 'scroll-linked-stage') {
    return (
      <ScrollLinkedStage title="Scroll-Linked Blur & Parallax" viewportHeightPx={180}>
        <div className="flex flex-col gap-3 text-xs">
          <p>Scroll inside this optical stage to drive sticky blur intensity and reading progress.</p>
          <p>Parallax depth shifts smoothly while respecting calm reduced-motion preferences.</p>
          <p>Native ScrollTimeline offloading is used automatically whenever supported.</p>
          <p>Bottom optical checkpoint reached.</p>
        </div>
      </ScrollLinkedStage>
    );
  }

  return <SpatialDepthDeck layers={DECK_LAYERS} pattern="depth-deck" />;
}
