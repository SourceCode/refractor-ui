import { CoreDemos } from './demos/CoreDemos';
import { LayoutDemos } from './demos/LayoutDemos';

export interface ComponentLiveDemoProps {
  componentId: string;
}

const LAYOUT_IDS = new Set([
  'window-splitter',
  'dockable-panel',
  'master-detail-view',
  'virtualized-list',
  'masonry-grid',
  'sticky-action-bar',
]);

export function ComponentLiveDemo({ componentId }: ComponentLiveDemoProps) {
  if (LAYOUT_IDS.has(componentId)) {
    return <LayoutDemos componentId={componentId} />;
  }
  return <CoreDemos componentId={componentId} />;
}
