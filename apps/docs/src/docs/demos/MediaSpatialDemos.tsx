import {
  AudioWaveformPlayer,
  BeforeAfterSlider,
  CustomVideoPlayer,
  InteractiveMapViewer,
  MediaLightbox,
  Product360Viewer,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';
import { assetUrl } from '../assetUrl';

export interface MediaSpatialDemosProps {
  componentId: string;
}

const AUDIO_PEAKS = [
  0.22, 0.45, 0.68, 0.52, 0.88, 0.74, 0.4, 0.62, 0.94, 0.81, 0.55, 0.34, 0.72, 0.9, 0.66, 0.48,
  0.84, 0.96, 0.7, 0.58, 0.42, 0.76, 0.61, 0.35, 0.5, 0.78, 0.64, 0.32, 0.46, 0.28,
];

const MAP_PINS = [
  { id: 'sf', label: 'San Francisco Studio', description: 'Optical Physics & Theme Lab', x: 18, y: 42, category: 'HQ' },
  { id: 'nyc', label: 'New York Hub', description: 'Design Systems Cluster', x: 34, y: 38, category: 'Hub', clusterCount: 4 },
  { id: 'ldn', label: 'London Lab', description: 'Accessibility & WCAG QA', x: 52, y: 30, category: 'Lab' },
  { id: 'tyo', label: 'Tokyo Edge', description: 'IME & Global Typography', x: 82, y: 46, category: 'Edge', clusterCount: 3 },
];

const MAP_ROUTES = [
  { id: 'r1', fromPinId: 'sf', toPinId: 'nyc', label: 'US Backbone' },
  { id: 'r2', fromPinId: 'nyc', toPinId: 'ldn', label: 'Transatlantic' },
  { id: 'r3', fromPinId: 'ldn', toPinId: 'tyo', label: 'APAC Link' },
];

export function MediaSpatialDemos({ componentId }: MediaSpatialDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'custom-video-player':
      return (
        <div className="w-full max-w-2xl">
          <CustomVideoPlayer
            title="Refractor Optical Glass Showcase (4K)"
            poster={assetUrl('src/assets/images/carousel_optical_glass_1_1795197571956.jpg')}
            durationSeconds={240}
            defaultCaptionsEnabled
            captionsText="Calibrated specular rim highlights adapt live across Alabaster and Obsidian themes."
            chapters={[
              { id: 'c1', title: 'Intro & Specular Rims', timeSeconds: 0 },
              { id: 'c2', title: 'MUI + Astryx Cascade', timeSeconds: 75 },
              { id: 'c3', title: 'Dark Mode Optics', timeSeconds: 165 },
            ]}
          />
        </div>
      );

    case 'audio-waveform-player':
      return (
        <div className="w-full max-w-2xl">
          <AudioWaveformPlayer
            title="Design Director Critique — Voice Note"
            subtitle="Elena Vance · Optical Depth Review"
            peaks={AUDIO_PEAKS}
            durationSeconds={142}
            defaultTimeSeconds={48}
            onSeek={(sec) =>
              dispatch(pushToast({ title: `Scrubbed audio to ${Math.round(sec)}s`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'media-lightbox':
      return (
        <div className="w-full max-w-2xl">
          <MediaLightbox
            mode="inline"
            defaultOpen
            items={[
              {
                id: 'img-1',
                title: 'Dichroic Optical Crystal Study',
                caption: 'Warm amber & sky-cyan edge caustics on studio alabaster.',
                src: assetUrl('src/assets/images/carousel_optical_glass_1_1795197571956.jpg'),
              },
              {
                id: 'img-2',
                title: 'Frosted Acrylic Precision Dials',
                caption: 'High-blur backdrop saturation paired with porcelain controls.',
                src: assetUrl('src/assets/images/carousel_optical_glass_2_1795197571569.jpg'),
              },
              {
                id: 'img-3',
                title: 'Optical Glass Design Specimen',
                caption: 'Canonical Refractor UI rendered component specimen.',
                src: assetUrl('assets/refractor-specimen.png'),
              },
            ]}
          />
        </div>
      );

    case 'before-after-slider':
      return (
        <div className="w-full max-w-2xl">
          <BeforeAfterSlider
            beforeLabel="Subtle Glass"
            afterLabel="Vivid Dispersion"
            beforeSrc={assetUrl('src/assets/images/carousel_optical_glass_1_1795197571956.jpg')}
            afterSrc={assetUrl('src/assets/images/carousel_optical_glass_2_1795197571569.jpg')}
            defaultPosition={52}
            heightPx={280}
          />
        </div>
      );

    case 'interactive-map-viewer':
      return (
        <div className="w-full">
          <InteractiveMapViewer
            pins={MAP_PINS}
            routes={MAP_ROUTES}
            defaultSelectedPinId="sf"
            heightPx={340}
            onSelectPin={(pin) => {
              if (pin) {
                dispatch(
                  pushToast({
                    title: pin.label,
                    description: pin.description,
                    tone: 'info',
                  })
                );
              }
            }}
          />
        </div>
      );

    case 'product-360-viewer':
      return (
        <div className="w-full max-w-xl">
          <Product360Viewer
            title="Refractor Prismatic Lens Unit"
            defaultAngle={35}
            heightPx={300}
          />
        </div>
      );

    default:
      return null;
  }
}
