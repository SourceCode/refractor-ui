import { useState } from 'react';
import {
  CodeEditor,
  ColorPicker,
  ImageCropper,
  InlineEditableField,
  RichTextEditor,
  SignaturePad,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';
import { assetUrl } from '../assetUrl';

export interface RichInputDemosProps {
  componentId: string;
}

const SAMPLE_TS_CODE = `import { createPrismTheme } from '@refractor-ui/core';

export const studioTheme = createPrismTheme({
  palette: {
    mode: 'light',
    primary: { main: '#E75C24' },
  },
  optics: { refraction: 'vivid', blurPx: 20 },
});`;

const SAMPLE_RICH_DOC = `# Optical Design Spec

Refractor surfaces pair **specular highlights** with *calibrated chromatic dispersion*.

- Zero raw color literals inside components
- Guaranteed >= 4.5:1 foreground text contrast

> Every surface scales cleanly across Light, Dark, and custom MUI palettes.`;

export function RichInputDemos({ componentId }: RichInputDemosProps) {
  const dispatch = useAppDispatch();
  const [richVal, setRichVal] = useState(SAMPLE_RICH_DOC);
  const [codeVal, setCodeVal] = useState(SAMPLE_TS_CODE);
  const [pickedHex, setPickedHex] = useState('#7C3AED');
  const [pickedAlpha, setPickedAlpha] = useState(0.92);
  const [inlineTitle, setInlineTitle] = useState('Refractor Optical Glass Kit v1.4');

  switch (componentId) {
    case 'rich-text-editor':
      return (
        <div className="w-full">
          <RichTextEditor
            label="Release Specification Canvas"
            value={richVal}
            onChange={setRichVal}
          />
        </div>
      );

    case 'code-editor':
      return (
        <div className="w-full">
          <CodeEditor
            label="theme.config.ts"
            language="typescript"
            value={codeVal}
            onChange={setCodeVal}
            diagnostics={[
              {
                line: 6,
                severity: 'warning',
                message: 'Consider pairing secondary.main for balanced cool caustic glow.',
              },
            ]}
          />
        </div>
      );

    case 'color-picker':
      return (
        <div className="w-full max-w-sm">
          <ColorPicker
            label="Primary Refractive Lens Color"
            value={pickedHex}
            alpha={pickedAlpha}
            onChange={(hex, alpha) => {
              setPickedHex(hex);
              setPickedAlpha(alpha);
            }}
          />
        </div>
      );

    case 'inline-editable-field':
      return (
        <div className="w-full max-w-md space-y-2">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Click or focus and press Enter to edit in place:
          </div>
          <InlineEditableField
            ariaLabel="Project release title"
            value={inlineTitle}
            required
            onSave={(next) => {
              setInlineTitle(next);
              dispatch(pushToast({ title: 'Title updated inline', description: next, tone: 'emerald' }));
            }}
          />
        </div>
      );

    case 'image-cropper':
      return (
        <div className="w-full max-w-xl">
          <ImageCropper
            src={assetUrl('src/assets/images/carousel_optical_glass_1_1795197571956.jpg')}
            alt="Dichroic Optical Crystal Study"
            onApplyCrop={(res) =>
              dispatch(
                pushToast({
                  title: `Applied ${res.aspectRatio} crop`,
                  description: `${Math.round(res.region.width)}% × ${Math.round(res.region.height)}% · ${res.zoom.toFixed(1)}x · ${res.rotationDeg}°`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'signature-pad':
      return (
        <div className="w-full max-w-lg">
          <SignaturePad
            label="Release Sign-Off Signature"
            onSave={(data) =>
              dispatch(
                pushToast({
                  title: 'Digital signature captured',
                  description: `${data.strokes.length} vector stroke(s) exported as SVG.`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    default:
      return null;
  }
}
