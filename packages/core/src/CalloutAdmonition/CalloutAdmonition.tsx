'use client';

import { useCallback, useId, type ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  FileText,
  Info,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER_TEXT_SECONDARY, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type AdmonitionKind = 'note' | 'tip' | 'warning' | 'danger' | 'abstract';

export interface CalloutAdmonitionProps extends BaseProps<HTMLElement> {
  /** Semantic admonition variant governing accent stripe, tinted medallion, badge, and default ARIA role (defaults to 'note'). */
  kind?: AdmonitionKind;
  /** Optional heading overriding the canonical default title ('Note', 'Tip', 'Warning', 'Danger', 'Summary'). */
  title?: string;
  /** Optional custom icon overriding the semantic Lucide icon for the selected kind. */
  icon?: ReactNode;
  /** Enables a collapsible disclosure header toggle while keeping the callout header and kind badge crisp (defaults to false). */
  collapsible?: boolean;
  /** Controlled open state when collapsible is enabled. */
  open?: boolean;
  /** Initial open state for uncontrolled collapsible mode (defaults to true). */
  defaultOpen?: boolean;
  /** Callback fired whenever the collapsible disclosure state toggles. */
  onOpenChange?: (open: boolean) => void;
  /** Optional trailing link, badge, or action button rendered in the admonition header. */
  actionSlot?: ReactNode;
  /** Body content rendered inside the optical-glass admonition slab. */
  children?: ReactNode;
}

interface AdmonitionVisual {
  defaultTitle: string;
  badgeLabel: string;
  accentToken: string;
  role: 'note' | 'alert';
  icon: ReactNode;
}

function getAdmonitionVisual(kind: AdmonitionKind): AdmonitionVisual {
  switch (kind) {
    case 'tip':
      return {
        defaultTitle: 'Tip',
        badgeLabel: 'tip',
        accentToken: 'var(--prism-success-main)',
        role: 'note',
        icon: <Lightbulb aria-hidden="true" className="w-4 h-4 shrink-0" />,
      };
    case 'warning':
      return {
        defaultTitle: 'Warning',
        badgeLabel: 'warning',
        accentToken: 'var(--prism-warning-main)',
        role: 'note',
        icon: <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0" />,
      };
    case 'danger':
      return {
        defaultTitle: 'Danger',
        badgeLabel: 'danger',
        accentToken: 'var(--prism-error-main)',
        role: 'alert',
        icon: <ShieldAlert aria-hidden="true" className="w-4 h-4 shrink-0" />,
      };
    case 'abstract':
      return {
        defaultTitle: 'Summary',
        badgeLabel: 'abstract',
        accentToken: 'var(--prism-secondary-main)',
        role: 'note',
        icon: <FileText aria-hidden="true" className="w-4 h-4 shrink-0" />,
      };
    case 'note':
      return {
        defaultTitle: 'Note',
        badgeLabel: 'note',
        accentToken: 'var(--prism-info-main)',
        role: 'note',
        icon: <Info aria-hidden="true" className="w-4 h-4 shrink-0" />,
      };
  }
}

const stripeClass = /*#__PURE__*/ stableClassName('callout-admonition', 'stripe');
const headerClass = /*#__PURE__*/ stableClassName('callout-admonition', 'header');
const toggleClass = /*#__PURE__*/ stableClassName('callout-admonition', 'toggle');
const iconClass = /*#__PURE__*/ stableClassName('callout-admonition', 'icon');
const titleClass = /*#__PURE__*/ stableClassName('callout-admonition', 'title');
const badgeClass = /*#__PURE__*/ stableClassName('callout-admonition', 'badge');
const chevronClass = /*#__PURE__*/ stableClassName('callout-admonition', 'chevron');
const actionsClass = /*#__PURE__*/ stableClassName('callout-admonition', 'actions');
const bodyClass = /*#__PURE__*/ stableClassName('callout-admonition', 'body');
const contentClass = /*#__PURE__*/ stableClassName('callout-admonition', 'content');

function CalloutAdmonitionInner({
  kind = 'note',
  title,
  icon,
  collapsible = false,
  open,
  defaultOpen = true,
  onOpenChange,
  actionSlot,
  children,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CalloutAdmonitionProps) {
  const override = useComponentOverride('CalloutAdmonition');
  const headingId = useId();
  const triggerId = useId();
  const bodyId = useId();

  const [controllableOpen, setControllableOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const isExpanded = collapsible ? controllableOpen : true;
  const visual = getAdmonitionVisual(kind);

  const trimmedTitle = title?.trim();
  const resolvedTitle = trimmedTitle || visual.defaultTitle;
  const isBadgeRedundant = resolvedTitle.toLowerCase() === visual.badgeLabel;
  const hasBody = children !== undefined && children !== null && children !== false;

  const handleToggle = useCallback(() => {
    setControllableOpen((prev) => !prev);
  }, [setControllableOpen]);

  const merged = mergeProps({
    themeTarget: themeProps('callout-admonition', {
      kind,
      collapsible,
      open: isExpanded,
    }),
    baseClassName: 'prism-contain-leaf prism-slab relative overflow-hidden w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const headerIdentity = (
    <>
      <span
        data-testid="callout-admonition-icon"
        className={cx(
          iconClass,
          'prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 border'
        )}
        style={{
          color: visual.accentToken,
          borderColor: `color-mix(in srgb, ${visual.accentToken} 34%, transparent)`,
          background: `color-mix(in srgb, ${visual.accentToken} 14%, var(--prism-well-end))`,
        }}
      >
        {icon ?? visual.icon}
      </span>

      <span
        id={headingId}
        data-testid="callout-admonition-title"
        className={cx(
          titleClass,
          'text-sm font-semibold leading-snug break-words min-w-0'
        )}
        style={STYLE_TEXT_PRIMARY}
      >
        {resolvedTitle}
      </span>

      <span
        data-testid="callout-admonition-badge"
        aria-hidden={isBadgeRedundant ? true : undefined}
        className={cx(
          badgeClass,
          'inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider border shrink-0'
        )}
        style={{
          color: visual.accentToken,
          borderColor: `color-mix(in srgb, ${visual.accentToken} 36%, transparent)`,
          background: `color-mix(in srgb, ${visual.accentToken} 12%, transparent)`,
        }}
      >
        {visual.badgeLabel}
      </span>
    </>
  );

  const defaultAriaLabelledBy = rest['aria-label'] ? undefined : headingId;

  return (
    <aside
      ref={ref}
      role={visual.role}
      aria-labelledby={defaultAriaLabelledBy}
      {...rest}
      {...merged}
    >
      <span
        aria-hidden="true"
        data-testid="callout-admonition-stripe"
        className={cx(
          stripeClass,
          'absolute inset-y-0 left-0 w-1.5 pointer-events-none'
        )}
        style={{
          backgroundColor: visual.accentToken,
          boxShadow: `0 0 14px color-mix(in srgb, ${visual.accentToken} 55%, transparent)`,
        }}
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-24 opacity-15"
        style={{
          background: `linear-gradient(90deg, ${visual.accentToken}, transparent)`,
        }}
      />

      <div className="relative pl-5 pr-4 py-3.5 sm:pl-6 sm:pr-5 sm:py-4 min-w-0 max-w-full">
        <div
          className={cx(
            headerClass,
            'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
          )}
        >
          {collapsible ? (
            <button
              id={triggerId}
              type="button"
              aria-expanded={isExpanded}
              aria-controls={bodyId}
              data-testid="callout-admonition-toggle"
              onClick={handleToggle}
              className={cx(
                toggleClass,
                'prism-focus-ring flex-1 min-w-0 max-w-full flex flex-wrap items-center justify-between gap-2.5 text-left rounded-xl px-1.5 py-1 -mx-1.5 -my-1 cursor-pointer transition-opacity duration-150 hover:opacity-90'
              )}
            >
              <span className="min-w-0 max-w-full flex flex-wrap items-center gap-2.5">
                {headerIdentity}
              </span>
              <ChevronDown
                aria-hidden="true"
                data-testid="callout-admonition-chevron"
                className={cx(
                  chevronClass,
                  'w-4 h-4 shrink-0 transition-transform duration-200',
                  isExpanded ? 'rotate-180' : 'rotate-0'
                )}
                style={STYLE_TEXT_SECONDARY}
              />
            </button>
          ) : (
            <div className="min-w-0 max-w-full flex-1 flex flex-wrap items-center gap-2.5">
              {headerIdentity}
            </div>
          )}

          {actionSlot ? (
            <div
              data-testid="callout-admonition-actions"
              className={cx(
                actionsClass,
                'shrink-0 flex flex-wrap items-center gap-2 max-w-full min-w-0'
              )}
            >
              {actionSlot}
            </div>
          ) : null}
        </div>

        {hasBody || collapsible ? (
          <div
            id={bodyId}
            role={collapsible ? 'region' : undefined}
            aria-labelledby={collapsible ? triggerId : undefined}
            hidden={collapsible && !isExpanded}
            data-testid="callout-admonition-body"
            data-open={isExpanded ? 'true' : 'false'}
            className={cx(
              bodyClass,
              'grid transition-[grid-template-rows,opacity] duration-200 ease-out min-w-0 max-w-full',
              isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="overflow-hidden min-w-0 max-w-full">
              {hasBody ? (
                <div
                  className={cx(
                    contentClass,
                    'mt-3 pt-3 border-t text-sm leading-relaxed break-words min-w-0 max-w-full'
                  )}
                  style={STYLE_BORDER_DIVIDER_TEXT_SECONDARY}
                >
                  {children}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export const CalloutAdmonition = /*#__PURE__*/ memoWithDisplayName(CalloutAdmonitionInner, 'CalloutAdmonition');
