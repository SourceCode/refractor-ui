'use client';

import { memo, useId, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Database,
  FileCode,
  FileText,
  ListChecks,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type HandoffArtifactKind = 'file' | 'summary' | 'plan' | 'data';

export interface HandoffArtifact {
  /** Stable unique identifier for this transferred artifact. */
  id: string;
  /** Visible label rendered inside the clickable crystal pill. */
  label: string;
  /** Semantic artifact category selecting the pill icon (defaults to `'file'`). */
  kind?: HandoffArtifactKind;
}

export interface HandoffDividerProps extends BaseProps<HTMLDivElement> {
  /** Originating agent delegating control or context. */
  fromAgent: string;
  /** Receiving agent assuming execution ownership. */
  toAgent: string;
  /** Concise caption summarizing the delegation objective. */
  summary: string;
  /** Optional formatted timestamp rendered inside the delegation badge. */
  timestamp?: string;
  /** Optional list of artifacts transferred across the agent boundary. */
  artifacts?: HandoffArtifact[];
  /** Optional serialized handoff payload revealed inside a collapsible recessed well. */
  payload?: string;
  /** Initial expanded state for the optional payload inspector (defaults to `false`). */
  defaultExpanded?: boolean;
  /** Callback invoked when a user activates an artifact pill. */
  onArtifactClick?: (artifact: HandoffArtifact) => void;
}

function renderArtifactIcon(kind: HandoffArtifactKind): ReactNode {
  switch (kind) {
    case 'file':
      return (
        <FileCode aria-hidden="true" data-artifact-icon="file" className="w-3.5 h-3.5 shrink-0" />
      );
    case 'summary':
      return (
        <FileText
          aria-hidden="true"
          data-artifact-icon="summary"
          className="w-3.5 h-3.5 shrink-0"
        />
      );
    case 'plan':
      return (
        <ListChecks aria-hidden="true" data-artifact-icon="plan" className="w-3.5 h-3.5 shrink-0" />
      );
    case 'data':
      return (
        <Database aria-hidden="true" data-artifact-icon="data" className="w-3.5 h-3.5 shrink-0" />
      );
  }
}

function HandoffDividerInner({
  fromAgent,
  toAgent,
  summary,
  timestamp,
  artifacts,
  payload,
  defaultExpanded = false,
  onArtifactClick,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: HandoffDividerProps) {
  const override = useComponentOverride('HandoffDivider');
  const payloadPanelId = useId();
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);

  const hasTimestamp = Boolean(timestamp);
  const artifactList = artifacts && artifacts.length > 0 ? artifacts : undefined;
  const hasArtifacts = Boolean(artifactList);
  const hasPayload = Boolean(payload);

  const merged = mergeProps({
    themeTarget: themeProps('handoff-divider', {
      hasTimestamp,
      hasArtifacts,
      hasPayload,
      expanded: hasPayload && expanded,
      artifactCount: artifactList ? artifactList.length : 0,
    }),
    baseClassName: 'w-full py-3 flex flex-col items-center gap-2.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const ruleClass = stableClassName('handoff-divider', 'rule');
  const badgeClass = stableClassName('handoff-divider', 'badge');
  const summaryClass = stableClassName('handoff-divider', 'summary');
  const artifactsClass = stableClassName('handoff-divider', 'artifacts');
  const artifactClass = stableClassName('handoff-divider', 'artifact');
  const payloadToggleClass = stableClassName('handoff-divider', 'payload-toggle');
  const payloadClass = stableClassName('handoff-divider', 'payload');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel ?? `Agent handoff from ${fromAgent} to ${toAgent}`}
      {...rest}
      {...merged}
    >
      <div className="w-full flex items-center gap-3">
        <div
          aria-hidden="true"
          data-testid="handoff-divider-rule-left"
          className={cx(ruleClass, 'h-px flex-1 bg-[var(--prism-divider)]')}
        />

        <div
          data-testid="handoff-divider-badge"
          className={cx(
            badgeClass,
            'prism-crystal rounded-full px-3.5 py-1.5 inline-flex flex-wrap items-center justify-center gap-2 max-w-full'
          )}
        >
          <span
            data-testid="handoff-from-agent"
            className="text-xs font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {fromAgent}
          </span>

          <ArrowRight
            aria-hidden="true"
            data-testid="handoff-arrow-icon"
            className="w-3.5 h-3.5 shrink-0"
            style={STYLE_PRIMARY_MAIN}
          />

          <span
            data-testid="handoff-to-agent"
            className="text-xs font-semibold truncate"
            style={STYLE_PRIMARY_MAIN}
          >
            {toAgent}
          </span>

          {hasTimestamp ? (
            <>
              <span
                aria-hidden="true"
                className="w-px h-3 bg-[var(--prism-divider)] shrink-0"
              />
              <time
                data-testid="handoff-timestamp"
                className="text-[11px] font-mono tabular-nums shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                {timestamp}
              </time>
            </>
          ) : null}
        </div>

        <div
          aria-hidden="true"
          data-testid="handoff-divider-rule-right"
          className={cx(ruleClass, 'h-px flex-1 bg-[var(--prism-divider)]')}
        />
      </div>

      <p
        data-testid="handoff-summary"
        className={cx(
          summaryClass,
          'm-0 text-xs sm:text-sm leading-relaxed text-center max-w-2xl break-words'
        )}
        style={STYLE_TEXT_SECONDARY}
      >
        {summary}
      </p>

      {artifactList ? (
        <div
          role="group"
          aria-label="Handoff artifacts"
          className={cx(
            artifactsClass,
            'flex flex-wrap items-center justify-center gap-2 max-w-full'
          )}
        >
          {artifactList.map((artifact) => {
            const resolvedKind: HandoffArtifactKind = artifact.kind ?? 'file';
            return (
              <button
                key={artifact.id}
                type="button"
                data-artifact-id={artifact.id}
                data-artifact-kind={resolvedKind}
                onClick={() => onArtifactClick?.(artifact)}
                className={cx(
                  artifactClass,
                  'prism-crystal prism-focus-ring rounded-full px-3 py-1 inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]'
                )}
                style={STYLE_TEXT_PRIMARY}
              >
                <span
                  className="inline-flex items-center justify-center shrink-0"
                  style={STYLE_INFO_MAIN}
                >
                  {renderArtifactIcon(resolvedKind)}
                </span>
                <span className="truncate max-w-xs">{artifact.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {hasPayload ? (
        <div className="w-full flex flex-col items-center gap-2.5">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={payloadPanelId}
            onClick={() => setExpanded((prev) => !prev)}
            className={cx(
              payloadToggleClass,
              'prism-crystal prism-focus-ring rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {expanded ? (
              <>
                <ChevronUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Hide Payload</span>
              </>
            ) : (
              <>
                <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Inspect Payload</span>
              </>
            )}
          </button>

          {expanded ? (
            <div
              id={payloadPanelId}
              data-testid="handoff-payload"
              className={cx(
                payloadClass,
                'prism-well w-full rounded-2xl p-3.5 overflow-x-auto max-h-64 overflow-y-auto'
              )}
            >
              <pre
                className="m-0 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words"
                style={STYLE_TEXT_PRIMARY}
              >
                <code>{payload}</code>
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const HandoffDivider = memo(HandoffDividerInner);
HandoffDivider.displayName = 'HandoffDivider';
