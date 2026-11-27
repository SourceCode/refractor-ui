'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import type { ThemeDensityMode } from '../theme/types';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import type { OpticalMaterialTier } from '../utils/opticalMaterial';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface OpticalCardContextValue {
  readonly material: OpticalMaterialTier;
  readonly density: ThemeDensityMode;
}

const DEFAULT_CARD_CONTEXT: OpticalCardContextValue = /*#__PURE__*/ Object.freeze({
  material: 'lens',
  density: 'comfortable',
});

const OpticalCardContext = /*#__PURE__*/ createContext<OpticalCardContextValue>(
  DEFAULT_CARD_CONTEXT
);

export interface OpticalCardProps extends BaseProps<HTMLElement> {
  /** Optical glass material grade (`'wafer' | 'lens' | 'prism'`, default: `'lens'`). */
  material?: OpticalMaterialTier;
  /** Layout density mode (`'compact' | 'comfortable' | 'touch'`, default: `'comfortable'`). */
  density?: ThemeDensityMode;
  children?: ReactNode;
}

export interface OpticalCardHeaderProps extends BaseProps<HTMLDivElement> {
  children?: ReactNode;
}

export interface OpticalCardPrismEdgeProps extends BaseProps<HTMLDivElement> {
  /** Edge position (`'top' | 'bottom'`, default: `'top'`). */
  position?: 'top' | 'bottom';
}

export interface OpticalCardBodyProps extends BaseProps<HTMLDivElement> {
  children?: ReactNode;
}

export interface OpticalCardFooterProps extends BaseProps<HTMLDivElement> {
  children?: ReactNode;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('optical-card');
const HEADER_CLASS = /*#__PURE__*/ stableClassName('optical-card', 'header');
const EDGE_CLASS = /*#__PURE__*/ stableClassName('optical-card', 'prism-edge');
const BODY_CLASS = /*#__PURE__*/ stableClassName('optical-card', 'body');
const FOOTER_CLASS = /*#__PURE__*/ stableClassName('optical-card', 'footer');

const DENSITY_PADDING: Readonly<Record<ThemeDensityMode, string>> = /*#__PURE__*/ Object.freeze({
  compact: 'p-3 gap-2',
  comfortable: 'p-4 gap-3',
  touch: 'p-5 gap-4',
});

function OpticalCardRootInner({
  material = 'lens',
  density = 'comfortable',
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: OpticalCardProps) {
  const override = useComponentOverride('OpticalCard');
  const ctxValue = useMemo<OpticalCardContextValue>(
    () => ({ material, density }),
    [density, material]
  );

  const merged = mergeProps({
    themeTarget: themeProps('OpticalCard', { material, density }),
    baseClassName: `${ROOT_CLASS} prism-material-${material} relative overflow-hidden rounded-2xl flex flex-col ${DENSITY_PADDING[density]}`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <OpticalCardContext value={ctxValue}>
      <article ref={ref} {...rest} {...merged}>
        {children}
      </article>
    </OpticalCardContext>
  );
}

function OpticalCardHeaderInner({
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: OpticalCardHeaderProps) {
  const { density } = useContext(OpticalCardContext);
  const merged = mergeProps({
    baseClassName: `${HEADER_CLASS} flex items-center justify-between gap-2 font-semibold ${
      density === 'compact' ? 'text-xs' : 'text-sm'
    }`,
    userClassName: className,
    baseStyle: STYLE_TEXT_PRIMARY,
    xstyle,
    userStyle: style,
  });
  return (
    <div ref={ref} {...rest} {...merged}>
      {children}
    </div>
  );
}

function OpticalCardPrismEdgeInner({
  position = 'top',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: OpticalCardPrismEdgeProps) {
  const { material } = useContext(OpticalCardContext);
  const merged = mergeProps({
    baseClassName: `${EDGE_CLASS} pointer-events-none absolute inset-x-0 h-[2px] ${
      position === 'top' ? 'top-0' : 'bottom-0'
    }`,
    userClassName: className,
    baseStyle: {
      background:
        'linear-gradient(90deg, rgba(var(--prism-primary-rgb), 0.72), rgba(var(--prism-secondary-rgb), 0.72), rgba(var(--prism-info-rgb), 0.72))',
      opacity: material === 'prism' ? 0.95 : material === 'lens' ? 0.65 : 0.35,
    },
    xstyle,
    userStyle: style,
  });
  return <div ref={ref} aria-hidden="true" {...rest} {...merged} />;
}

function OpticalCardBodyInner({
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: OpticalCardBodyProps) {
  const merged = mergeProps({
    baseClassName: `${BODY_CLASS} text-xs leading-relaxed`,
    userClassName: className,
    baseStyle: STYLE_TEXT_SECONDARY,
    xstyle,
    userStyle: style,
  });
  return (
    <div ref={ref} {...rest} {...merged}>
      {children}
    </div>
  );
}

function OpticalCardFooterInner({
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: OpticalCardFooterProps) {
  const merged = mergeProps({
    baseClassName: `${FOOTER_CLASS} flex items-center justify-between gap-2 border-t pt-2.5 text-xs`,
    userClassName: className,
    baseStyle: { borderColor: 'var(--prism-border-divider)', ...STYLE_TEXT_SECONDARY },
    xstyle,
    userStyle: style,
  });
  return (
    <div ref={ref} {...rest} {...merged}>
      {children}
    </div>
  );
}

export const OpticalCardRoot = /*#__PURE__*/ memoWithDisplayName(OpticalCardRootInner, 'OpticalCardRoot');
export const OpticalCardHeader = /*#__PURE__*/ memoWithDisplayName(OpticalCardHeaderInner, 'OpticalCardHeader');
export const OpticalCardPrismEdge = /*#__PURE__*/ memoWithDisplayName(OpticalCardPrismEdgeInner, 'OpticalCardPrismEdge');
export const OpticalCardBody = /*#__PURE__*/ memoWithDisplayName(OpticalCardBodyInner, 'OpticalCardBody');
export const OpticalCardFooter = /*#__PURE__*/ memoWithDisplayName(OpticalCardFooterInner, 'OpticalCardFooter');

const OpticalCardBase = /*#__PURE__*/ memoWithDisplayName(OpticalCardRootInner, 'OpticalCard');

export type OpticalCardCompoundComponent = typeof OpticalCardBase & {
  readonly Root: typeof OpticalCardRoot;
  readonly Header: typeof OpticalCardHeader;
  readonly PrismEdge: typeof OpticalCardPrismEdge;
  readonly Body: typeof OpticalCardBody;
  readonly Footer: typeof OpticalCardFooter;
};

export const OpticalCard: OpticalCardCompoundComponent = /*#__PURE__*/ Object.assign(
  OpticalCardBase,
  {
    Root: OpticalCardRoot,
    Header: OpticalCardHeader,
    PrismEdge: OpticalCardPrismEdge,
    Body: OpticalCardBody,
    Footer: OpticalCardFooter,
  }
);
