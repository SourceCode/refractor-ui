import { CoreDemos } from './demos/CoreDemos';

export interface ComponentLiveDemoProps {
  componentId: string;
}

export function ComponentLiveDemo({ componentId }: ComponentLiveDemoProps) {
  return <CoreDemos componentId={componentId} />;
}
