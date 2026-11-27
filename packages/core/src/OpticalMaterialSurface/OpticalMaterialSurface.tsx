'use client';

import type { ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useDprMetrics } from '../hooks/useDprMetrics';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { useGpuPerformanceGuardrail } from '../utils/gpuGuardrails';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import {
  OPTICAL_MATERIAL_PRESETS,
  type OpticalMaterialTier,
} from '../utils/opticalMaterial';
import { themeProps } from '../utils/themeProps';

export interface OpticalMaterialSurfaceProps extends BaseProps<HTMLDivElement> {
  /** Named physical optical glass grade: `'wafer'`, `'lens'`, or `'prism'` (default: `'lens'`). */
  tier?: OpticalMaterialTier;
  /** Optional custom IOR override (defaults to preset IOR). */
  ior?: number;
  /** Optional custom blur radius override in pixels. */
  blurPx?: number;
  children?: ReactNode;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('optical-material-surface');

function OpticalMaterialSurfaceInner({
  tier = 'lens',
  ior,
  blurPx,
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: OpticalMaterialSurfaceProps) {
  const override = useComponentOverride('OpticalMaterialSurface');
  const preset = OPTICAL_MATERIAL_PRESETS[tier];
  const { hairlinePx } = useDprMetrics();
  const { tier: gpuTier } = useGpuPerformanceGuardrail();

  const effectiveIor = ior ?? preset.ior;
  const effectiveBlur = gpuTier === 'flat-opaque' ? 0 : (blurPx ?? preset.blurPx);

  const merged = mergeProps({
    themeTarget: themeProps('OpticalMaterialSurface', {
      tier,
      gpuTier,
    }),
    baseClassName: `${ROOT_CLASS} prism-material-${tier} p-4`,
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: {
      borderRadius: `${preset.borderRadiusPx}px`,
      borderWidth: `${Math.max(hairlinePx, preset.thicknessPx * hairlinePx)}px`,
      '--prism-material-ior': String(effectiveIor),
      '--prism-material-blur': `${effectiveBlur}px`,
      '--prism-material-dispersion': String(preset.dispersion),
      '--prism-material-tint-opacity': String(preset.tintOpacity),
    },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged} data-material-tier={tier} data-gpu-tier={gpuTier}>
      {children}
    </div>
  );
}

export const OpticalMaterialSurface = /*#__PURE__*/ memoWithDisplayName(OpticalMaterialSurfaceInner, 'OpticalMaterialSurface');
