'use client';

import { useId, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Shuffle,
  SkipForward,
  Sliders,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_CONTRAST, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type RecoveryRouteKind = 'retry' | 'edit' | 'switch' | 'skip';

export interface RecoveryRouteAction {
  /** Stable unique identifier for this recovery route. */
  id: string;
  /** Action label rendered inside the optical button/card. */
  label: string;
  /** Optional supporting explanation describing the recovery strategy. */
  description?: string;
  /** Optional semantic icon category ('retry' | 'edit' | 'switch' | 'skip'). */
  kind?: RecoveryRouteKind;
  /** Highlights this route as the primary refractive CTA (`prism-btn-primary`). */
  primary?: boolean;
  /** Prevents interaction and dims the route action. */
  disabled?: boolean;
  /** Optional route-specific selection handler invoked before `onSelectRoute`. */
  onSelect?: () => void;
}

export interface RecoveryRoutingCardProps extends BaseProps<HTMLDivElement> {
  /** Prominent failure title displayed in the diagnostic banner header. */
  title: string;
  /** Human-readable diagnostic failure description. */
  errorMessage: string;
  /** Optional machine-readable monospace error code pill (e.g., `ERR_TOOL_TIMEOUT`). */
  errorCode?: string;
  /** Optional raw stack trace or diagnostic log revealed inside a collapsible recessed well. */
  stackTrace?: string;
  /** Ordered list of recovery actions rendered as optical buttons/cards. */
  routes: RecoveryRouteAction[];
  /** Shared callback fired whenever an enabled recovery route is selected. */
  onSelectRoute?: (route: RecoveryRouteAction) => void;
  /** Initial expanded state for the optional stack trace panel (defaults to `false`). */
  defaultShowTrace?: boolean;
}

function renderRouteIcon(kind: RecoveryRouteKind | undefined): ReactNode {
  switch (kind) {
    case 'retry':
      return <RotateCcw aria-hidden="true" data-route-icon="retry" className="w-4 h-4 shrink-0" />;
    case 'edit':
      return <Sliders aria-hidden="true" data-route-icon="edit" className="w-4 h-4 shrink-0" />;
    case 'switch':
      return <Shuffle aria-hidden="true" data-route-icon="switch" className="w-4 h-4 shrink-0" />;
    case 'skip':
      return <SkipForward aria-hidden="true" data-route-icon="skip" className="w-4 h-4 shrink-0" />;
    default:
      return null;
  }
}

const headerClass = /*#__PURE__*/ stableClassName('recovery-routing-card', 'header');
const errorCodeClass = /*#__PURE__*/ stableClassName('recovery-routing-card', 'error-code');
const traceToggleClass = /*#__PURE__*/ stableClassName('recovery-routing-card', 'trace-toggle');
const traceClass = /*#__PURE__*/ stableClassName('recovery-routing-card', 'trace');
const routesClass = /*#__PURE__*/ stableClassName('recovery-routing-card', 'routes');
const routeClass = /*#__PURE__*/ stableClassName('recovery-routing-card', 'route');

function RecoveryRoutingCardInner({
  title,
  errorMessage,
  errorCode,
  stackTrace,
  routes,
  onSelectRoute,
  defaultShowTrace = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RecoveryRoutingCardProps) {
  const override = useComponentOverride('RecoveryRoutingCard');
  const tracePanelId = useId();
  const [showTrace, setShowTrace] = useState<boolean>(defaultShowTrace);

  const hasStackTrace = Boolean(stackTrace);
  const hasErrorCode = Boolean(errorCode);

  const handleSelectRoute = (route: RecoveryRouteAction) => {
    route.onSelect?.();
    onSelectRoute?.(route);
  };

  const merged = mergeProps({
    themeTarget: themeProps('recovery-routing-card', {
      hasErrorCode,
      hasStackTrace,
      traceExpanded: hasStackTrace && showTrace,
      routeCount: routes.length,
    }),
    baseClassName: 'prism-slab border p-4 sm:p-5 space-y-4 w-full',
    baseStyle: {
      borderColor: 'var(--prism-rose-border, var(--prism-error-main))',
    },
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="alert" {...rest} {...merged}>
      <div className={cx(headerClass, 'flex items-start gap-3')}>
        <span
          data-testid="recovery-alert-icon"
          className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 border"
          style={{
            color: 'var(--prism-rose-text, var(--prism-error-main))',
            borderColor: 'var(--prism-rose-border, var(--prism-error-main))',
          }}
        >
          <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0" />
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="text-sm font-semibold leading-snug break-words"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </h3>

            {hasErrorCode ? (
              <code
                data-testid="recovery-error-code"
                className={cx(
                  errorCodeClass,
                  'inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tracking-tight border shrink-0 bg-rose-500/12 dark:bg-rose-500/15'
                )}
                style={{
                  color: 'var(--prism-rose-text, var(--prism-error-main))',
                  borderColor: 'var(--prism-rose-border, var(--prism-error-main))',
                }}
              >
                {errorCode}
              </code>
            ) : null}
          </div>

          <p
            className="text-xs sm:text-sm leading-relaxed break-words"
            style={STYLE_TEXT_SECONDARY}
          >
            {errorMessage}
          </p>
        </div>
      </div>

      {hasStackTrace ? (
        <div className="space-y-2.5">
          <button
            type="button"
            aria-expanded={showTrace}
            aria-controls={tracePanelId}
            onClick={() => setShowTrace((prev) => !prev)}
            className={cx(
              traceToggleClass,
              'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {showTrace ? (
              <>
                <ChevronUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Hide trace</span>
              </>
            ) : (
              <>
                <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Show trace</span>
              </>
            )}
          </button>

          {showTrace ? (
            <div
              id={tracePanelId}
              data-testid="recovery-stack-trace"
              className={cx(
                traceClass,
                'prism-well rounded-2xl p-3.5 overflow-x-auto max-h-64 overflow-y-auto border'
              )}
              style={{ borderColor: 'var(--prism-rose-border, var(--prism-divider))' }}
            >
              <pre
                className="m-0 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words"
                style={STYLE_TEXT_PRIMARY}
              >
                <code>{stackTrace}</code>
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}

      {routes.length > 0 ? (
        <div
          role="group"
          aria-label="Recovery routes"
          className={cx(routesClass, 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1')}
        >
          {routes.map((route) => {
            const isPrimary = Boolean(route.primary);
            const isDisabled = Boolean(route.disabled);
            const icon = renderRouteIcon(route.kind);

            return (
              <button
                key={route.id}
                type="button"
                disabled={isDisabled}
                data-route-id={route.id}
                data-route-kind={route.kind}
                data-route-primary={isPrimary ? 'true' : undefined}
                onClick={isDisabled ? undefined : () => handleSelectRoute(route)}
                className={cx(
                  routeClass,
                  isPrimary ? 'prism-btn-primary' : 'prism-crystal',
                  'prism-focus-ring rounded-2xl px-3.5 py-2.5 text-left inline-flex items-start gap-2.5 transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105'
                )}
              >
                {icon ? (
                  <span
                    className="mt-0.5 inline-flex items-center justify-center shrink-0 relative z-10"
                    style={
                      isPrimary
                        ? STYLE_PRIMARY_CONTRAST
                        : STYLE_TEXT_PRIMARY
                    }
                  >
                    {icon}
                  </span>
                ) : null}

                <span className="min-w-0 flex-1 flex flex-col gap-0.5 relative z-10">
                  <span
                    className="text-xs sm:text-sm font-semibold leading-snug break-words"
                    style={
                      isPrimary
                        ? STYLE_PRIMARY_CONTRAST
                        : STYLE_TEXT_PRIMARY
                    }
                  >
                    {route.label}
                  </span>

                  {route.description ? (
                    <span
                      className={cx(
                        'text-xs leading-snug break-words',
                        isPrimary ? 'opacity-90' : ''
                      )}
                      style={
                        isPrimary
                          ? STYLE_PRIMARY_CONTRAST
                          : STYLE_TEXT_SECONDARY
                      }
                    >
                      {route.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export const RecoveryRoutingCard = /*#__PURE__*/ memoWithDisplayName(RecoveryRoutingCardInner, 'RecoveryRoutingCard');
