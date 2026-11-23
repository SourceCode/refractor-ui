'use client';

import { useId, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Database,
  FileCode,
  Globe,
  Loader2,
  Search,
  Terminal,
  Wrench,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_BORDER_ERROR, STYLE_ERROR_BORDER_TEXT, STYLE_ERROR_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type ToolCallCategory = 'search' | 'terminal' | 'file' | 'database' | 'api' | 'browser';

export type ToolCallStatus = 'running' | 'success' | 'error';

export interface ToolCallField {
  /** Field label or parameter key rendered in monospace typography. */
  key: string;
  /** Field value rendered strictly as literal text. */
  value: string;
}

export interface ToolCallCardProps extends BaseProps<HTMLDivElement> {
  /** Name of the invoked tool rendered in monospace typography. */
  toolName: string;
  /** Semantic category selecting the optical header icon (defaults to 'api'). */
  category?: ToolCallCategory;
  /** Lifecycle status of the tool call ('running' | 'success' | 'error'). */
  status: ToolCallStatus;
  /** Execution duration in milliseconds (rendered when finite and >= 0). */
  durationMs?: number;
  /** Optional concise one-line summary shown next to the tool name. */
  summary?: string;
  /** Structured input key/value fields rendered inside a recessed prism-well block when expanded. */
  inputs?: ToolCallField[];
  /** Structured output key/value fields rendered inside a recessed prism-well block when expanded. */
  outputs?: ToolCallField[];
  /** Optional error message rendered inside a role="alert" well when expanded. */
  errorMessage?: string;
  /** Initial expanded state for uncontrolled mode (defaults to false). */
  defaultExpanded?: boolean;
  /** Controlled expanded state for the payload inspector region. */
  expanded?: boolean;
  /** Callback invoked whenever the expanded state changes. */
  onExpandedChange?: (expanded: boolean) => void;
}

interface CategoryVisual {
  icon: ReactNode;
  colorToken: string;
  label: string;
}

interface KeyedField {
  reactKey: string;
  field: ToolCallField;
}

function getCategoryVisual(category: ToolCallCategory): CategoryVisual {
  switch (category) {
    case 'search':
      return {
        icon: <Search aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-info-main)',
        label: 'Search tool',
      };
    case 'terminal':
      return {
        icon: <Terminal aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-primary-main)',
        label: 'Terminal tool',
      };
    case 'file':
      return {
        icon: <FileCode aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-secondary-dark)',
        label: 'File tool',
      };
    case 'database':
      return {
        icon: <Database aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-success-dark)',
        label: 'Database tool',
      };
    case 'browser':
      return {
        icon: <Globe aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-info-light)',
        label: 'Browser tool',
      };
    case 'api':
      return {
        icon: <Wrench aria-hidden="true" className="w-4 h-4 shrink-0" />,
        colorToken: 'var(--prism-warning-main)',
        label: 'API tool',
      };
  }
}

function formatDurationMs(durationMs: number | undefined): string | null {
  if (durationMs === undefined || !Number.isFinite(durationMs) || durationMs < 0) {
    return null;
  }
  const roundedMs = Math.round(durationMs);
  if (roundedMs < 1000) {
    return `${roundedMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function buildKeyedFields(fields: ReadonlyArray<ToolCallField>): KeyedField[] {
  const counts = new Map<string, number>();
  return fields.map((field) => {
    const nextCount = (counts.get(field.key) ?? 0) + 1;
    counts.set(field.key, nextCount);
    return {
      reactKey: `${field.key}#${nextCount}`,
      field,
    };
  });
}

function renderStatusPill(status: ToolCallStatus): ReactNode {
  switch (status) {
    case 'running':
      return (
        <span
          data-testid="tool-call-status"
          data-status="running"
          className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0 border"
          style={{
            color: 'var(--prism-primary-main)',
            borderColor: 'var(--prism-warning-main)',
          }}
        >
          <Loader2
            aria-hidden="true"
            className="w-3 h-3 animate-spin motion-reduce:animate-none animate-pulse shrink-0"
          />
          <span>Running</span>
        </span>
      );
    case 'success':
      return (
        <span
          data-testid="tool-call-status"
          data-status="success"
          className="prism-emerald inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0"
        >
          <CheckCircle2 aria-hidden="true" className="w-3 h-3 shrink-0" />
          <span>Success</span>
        </span>
      );
    case 'error':
      return (
        <span
          data-testid="tool-call-status"
          data-status="error"
          className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0 border"
          style={STYLE_ERROR_BORDER_TEXT}
        >
          <AlertCircle aria-hidden="true" className="w-3 h-3 shrink-0" />
          <span>Error</span>
        </span>
      );
  }
}

interface PayloadBlockProps {
  heading: string;
  fields: ReadonlyArray<ToolCallField>;
  testId: string;
}

function PayloadBlock({ heading, fields, testId }: PayloadBlockProps) {
  const keyedFields = buildKeyedFields(fields);

  return (
    <div data-testid={testId} className="prism-well rounded-2xl p-3 space-y-2">
      <div
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={STYLE_TEXT_SECONDARY}
      >
        {heading}
      </div>
      <dl className="space-y-1.5 text-xs font-mono">
        {keyedFields.map(({ reactKey, field }) => (
          <div
            key={reactKey}
            className="grid grid-cols-1 sm:grid-cols-[minmax(100px,auto)_1fr] gap-x-3 gap-y-0.5 items-baseline border-b last:border-b-0 pb-1.5 last:pb-0"
            style={STYLE_BORDER_DIVIDER}
          >
            <dt
              className="font-semibold break-words"
              style={STYLE_TEXT_SECONDARY}
            >
              {field.key}
            </dt>
            <dd
              className="break-words whitespace-pre-wrap"
              style={STYLE_TEXT_PRIMARY}
            >
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const triggerClass = /*#__PURE__*/ stableClassName('tool-call-card', 'trigger');
const panelClass = /*#__PURE__*/ stableClassName('tool-call-card', 'panel');

function ToolCallCardInner({
  toolName,
  category = 'api',
  status,
  durationMs,
  summary,
  inputs,
  outputs,
  errorMessage,
  defaultExpanded = false,
  expanded,
  onExpandedChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ToolCallCardProps) {
  const override = useComponentOverride('ToolCallCard');
  const triggerId = useId();
  const panelId = useId();

  const [isExpanded, setIsExpanded] = useControllableState<boolean>({
    value: expanded,
    defaultValue: defaultExpanded,
    onChange: onExpandedChange,
  });

  const categoryVisual = getCategoryVisual(category);
  const formattedDuration = formatDurationMs(durationMs);

  const inputFields = inputs && inputs.length > 0 ? inputs : null;
  const outputFields = outputs && outputs.length > 0 ? outputs : null;
  const normalizedError = errorMessage && errorMessage.trim().length > 0 ? errorMessage : null;
  const hasError = normalizedError !== null;
  const hasPayload = inputFields !== null || outputFields !== null || hasError;

  const merged = mergeProps({
    themeTarget: themeProps('tool-call-card', {
      category,
      status,
      expanded: isExpanded,
      hasError,
    }),
    baseClassName: 'prism-slab overflow-hidden w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} {...rest} {...merged}>
      <button
        id={triggerId}
        type="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={() => setIsExpanded((prev) => !prev)}
        className={cx(
          triggerClass,
          'prism-focus-ring w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]'
        )}
      >
        <span className="min-w-0 flex items-center gap-2.5 flex-1">
          <span
            data-testid="tool-call-category-icon"
            data-category={category}
            className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{ color: categoryVisual.colorToken }}
          >
            {categoryVisual.icon}
            <span className="sr-only">{categoryVisual.label}</span>
          </span>

          <span className="min-w-0 flex flex-col gap-0.5">
            <code
              data-testid="tool-call-name"
              className="font-mono text-xs font-semibold truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {toolName}
            </code>
            {summary ? (
              <span
                data-testid="tool-call-summary"
                className="text-xs truncate"
                style={STYLE_TEXT_SECONDARY}
              >
                {summary}
              </span>
            ) : null}
          </span>
        </span>

        <span className="flex items-center gap-2 shrink-0">
          {renderStatusPill(status)}

          {formattedDuration !== null ? (
            <span
              data-testid="tool-call-duration"
              className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {formattedDuration}
            </span>
          ) : null}

          <ChevronDown
            aria-hidden="true"
            data-testid="tool-call-chevron"
            className={cx(
              'w-4 h-4 shrink-0 transition-transform duration-150',
              isExpanded && 'rotate-180'
            )}
            style={STYLE_TEXT_SECONDARY}
          />
        </span>
      </button>

      {isExpanded ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className={cx(panelClass, 'px-4 pb-4 pt-3 border-t space-y-2.5')}
          style={STYLE_BORDER_DIVIDER}
        >
          {!hasPayload ? (
            <div
              data-testid="tool-call-empty"
              className="prism-well rounded-2xl py-4 px-3 text-center"
            >
              <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
                No payload details recorded.
              </p>
            </div>
          ) : (
            <>
              {inputFields ? (
                <PayloadBlock heading="Inputs" fields={inputFields} testId="tool-call-inputs" />
              ) : null}

              {outputFields ? (
                <PayloadBlock heading="Outputs" fields={outputFields} testId="tool-call-outputs" />
              ) : null}

              {normalizedError ? (
                <div
                  role="alert"
                  data-testid="tool-call-error"
                  className="prism-well rounded-2xl p-3 border flex items-start gap-2.5"
                  style={STYLE_BORDER_ERROR}
                >
                  <AlertCircle
                    aria-hidden="true"
                    className="w-4 h-4 mt-0.5 shrink-0"
                    style={STYLE_ERROR_MAIN}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={STYLE_ERROR_MAIN}
                    >
                      Error
                    </div>
                    <p
                      className="font-mono text-xs leading-relaxed break-words whitespace-pre-wrap"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {normalizedError}
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const ToolCallCard = /*#__PURE__*/ memoWithDisplayName(ToolCallCardInner, 'ToolCallCard');
