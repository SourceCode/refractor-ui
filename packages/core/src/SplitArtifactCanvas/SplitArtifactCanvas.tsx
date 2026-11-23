'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Check,
  Code2,
  Columns2,
  Copy,
  Download,
  Eye,
  FileText,
  Layers,
  MessageSquare,
  PanelRight,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type ArtifactKind = 'code' | 'document' | 'preview';
export type ArtifactViewMode = 'split' | 'artifact-only' | 'conversation-only';

export interface ArtifactItem {
  /** Stable unique identifier for this artifact. */
  id: string;
  /** Human-readable artifact title displayed in tabs and header. */
  title: string;
  /** Artifact category ('code' | 'document' | 'preview'). */
  kind: ArtifactKind;
  /** Optional language or format identifier (e.g. 'typescript', 'markdown', 'html'). */
  language?: string;
  /** Literal source content always rendered as escaped text inside <pre><code>. */
  content: string;
  /** Optional live preview node enabling the Preview / Source mode toggle. */
  preview?: ReactNode;
  /** Optional version tag displayed in the artifact header pill (e.g. 'v1.2'). */
  version?: string;
}

export interface SplitArtifactCanvasProps extends BaseProps<HTMLDivElement> {
  /** Conversational transcript / prompt stream rendered in the left workspace pane. */
  conversationPane: ReactNode;
  /** Generated artifacts displayed in the right artifact workspace pane. */
  artifacts: ReadonlyArray<ArtifactItem>;
  /** Controlled active artifact identifier. */
  activeArtifactId?: string;
  /** Initial uncontrolled active artifact identifier (defaults to first artifact). */
  defaultArtifactId?: string;
  /** Callback invoked whenever the active artifact selection changes. */
  onActiveArtifactChange?: (id: string) => void;
  /** Controlled workspace layout mode ('split' | 'artifact-only' | 'conversation-only'). */
  viewMode?: ArtifactViewMode;
  /** Initial uncontrolled workspace layout mode (default 'split'). */
  defaultViewMode?: ArtifactViewMode;
  /** Callback invoked whenever the workspace layout mode changes. */
  onViewModeChange?: (mode: ArtifactViewMode) => void;
  /** Optional callback invoked when the active artifact source is copied. */
  onCopyArtifact?: (artifact: ArtifactItem) => void;
  /** Optional callback enabling and handling the artifact Download button. */
  onDownloadArtifact?: (artifact: ArtifactItem) => void;
  /** Heading label rendered for the conversation pane (default 'Conversation'). */
  conversationTitle?: string;
}

type ArtifactSurfaceMode = 'preview' | 'source';

const COPY_FEEDBACK_DURATION_MS = 1800;

const LAYOUT_OPTIONS: ReadonlyArray<{ mode: ArtifactViewMode; label: string }> = [
  { mode: 'split', label: 'Split' },
  { mode: 'conversation-only', label: 'Chat' },
  { mode: 'artifact-only', label: 'Artifact' },
];

const IDLE_PILL_BUTTON_CLASS =
  'text-slate-700 dark:text-slate-200 enabled:hover:bg-white/60 dark:enabled:hover:bg-white/10 enabled:hover:text-slate-950 dark:enabled:hover:text-white';

function getArtifactKindLabel(kind: ArtifactKind): string {
  switch (kind) {
    case 'code':
      return 'Code';
    case 'document':
      return 'Document';
    case 'preview':
      return 'Preview';
  }
}

function renderArtifactKindIcon(kind: ArtifactKind): ReactNode {
  switch (kind) {
    case 'code':
      return <Code2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'document':
      return <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'preview':
      return <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  }
}

function renderLayoutIcon(mode: ArtifactViewMode): ReactNode {
  switch (mode) {
    case 'split':
      return <Columns2 className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />;
    case 'conversation-only':
      return <MessageSquare className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />;
    case 'artifact-only':
      return <PanelRight className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />;
  }
}

function SplitArtifactCanvasInner({
  conversationPane,
  artifacts,
  activeArtifactId,
  defaultArtifactId,
  onActiveArtifactChange,
  viewMode,
  defaultViewMode = 'split',
  onViewModeChange,
  onCopyArtifact,
  onDownloadArtifact,
  conversationTitle = 'Conversation',
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: SplitArtifactCanvasProps) {
  const baseId = useId();
  const override = useComponentOverride('SplitArtifactCanvas');

  const uniqueArtifacts = useMemo<ArtifactItem[]>(() => {
    const seen = new Set<string>();
    const deduped: ArtifactItem[] = [];
    for (const item of artifacts) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        deduped.push(item);
      }
    }
    return deduped;
  }, [artifacts]);

  const [currentArtifactId, setCurrentArtifactId] = useControllableState<string>({
    value: activeArtifactId,
    defaultValue: defaultArtifactId ?? uniqueArtifacts[0]?.id ?? '',
    onChange: onActiveArtifactChange,
  });

  const [currentViewMode, setCurrentViewMode] = useControllableState<ArtifactViewMode>({
    value: viewMode,
    defaultValue: defaultViewMode,
    onChange: onViewModeChange,
  });

  const [surfaceOverrides, setSurfaceOverrides] = useState<ReadonlyMap<string, ArtifactSurfaceMode>>(
    () => new Map()
  );
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const activeArtifact =
    uniqueArtifacts.find((item) => item.id === currentArtifactId) ?? uniqueArtifacts[0];

  const hasPreview = Boolean(activeArtifact?.preview);
  const defaultSurface: ArtifactSurfaceMode =
    activeArtifact?.kind === 'preview' && hasPreview ? 'preview' : 'source';
  const activeSurfaceMode: ArtifactSurfaceMode =
    activeArtifact && hasPreview
      ? (surfaceOverrides.get(activeArtifact.id) ?? defaultSurface)
      : 'source';

  const selectArtifact = useCallback(
    (item: ArtifactItem) => {
      setCurrentArtifactId(item.id);
      setCopied(false);
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
      setStatusMessage(`Viewing artifact ${item.title}.`);
    },
    [setCurrentArtifactId]
  );

  const handleViewModeSelect = useCallback(
    (mode: ArtifactViewMode) => {
      setCurrentViewMode(mode);
      if (mode === 'split') {
        setStatusMessage('Layout switched to split view.');
      } else if (mode === 'conversation-only') {
        setStatusMessage('Layout switched to conversation only.');
      } else {
        setStatusMessage('Layout switched to artifact only.');
      }
    },
    [setCurrentViewMode]
  );

  const handleSurfaceChange = useCallback(
    (artifact: ArtifactItem, mode: ArtifactSurfaceMode) => {
      setSurfaceOverrides((prev) => {
        const next = new Map(prev);
        next.set(artifact.id, mode);
        return next;
      });
      setStatusMessage(
        mode === 'preview'
          ? `Showing live preview for ${artifact.title}.`
          : `Showing source for ${artifact.title}.`
      );
    },
    []
  );

  const handleCopyArtifact = useCallback(
    (artifact: ArtifactItem) => {
      try {
        const clipboard = navigator.clipboard;
        if (clipboard && typeof clipboard.writeText === 'function') {
          void Promise.resolve(clipboard.writeText(artifact.content)).catch(() => undefined);
        }
      } catch {
        // Clipboard API unavailable or blocked; fall through gracefully.
      }

      onCopyArtifact?.(artifact);
      setCopied(true);
      setStatusMessage(`Copied ${artifact.title} to clipboard.`);

      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, COPY_FEEDBACK_DURATION_MS);
    },
    [onCopyArtifact]
  );

  const handleDownloadArtifact = useCallback(
    (artifact: ArtifactItem) => {
      onDownloadArtifact?.(artifact);
      setStatusMessage(`Download requested for ${artifact.title}.`);
    },
    [onDownloadArtifact]
  );

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.nativeEvent.isComposing) return;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % uniqueArtifacts.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + uniqueArtifacts.length) % uniqueArtifacts.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = uniqueArtifacts.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const nextArtifact = uniqueArtifacts[nextIndex] as ArtifactItem;
      selectArtifact(nextArtifact);
      tabButtonRefs.current.get(nextArtifact.id)?.focus();
    }
  };

  const showConversation =
    currentViewMode === 'split' || currentViewMode === 'conversation-only';
  const showArtifact = currentViewMode === 'split' || currentViewMode === 'artifact-only';

  const merged = mergeProps({
    themeTarget: themeProps('split-artifact-canvas', {
      viewMode: currentViewMode,
      artifactKind: activeArtifact?.kind,
      empty: uniqueArtifacts.length === 0,
    }),
    baseClassName: 'prism-slab p-3.5 sm:p-4 flex flex-col gap-3.5 w-full overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const topbarClass = stableClassName('split-artifact-canvas', 'topbar');
  const conversationClass = stableClassName('split-artifact-canvas', 'conversation');
  const artifactClass = stableClassName('split-artifact-canvas', 'artifact');

  const artifactCountLabel =
    uniqueArtifacts.length === 1 ? '1 artifact' : `${uniqueArtifacts.length} artifacts`;

  const actionButtonClass =
    'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed';

  return (
    <div
      ref={ref}
      aria-label={ariaLabel ?? 'Split artifact workspace'}
      {...rest}
      {...merged}
    >
      <div
        className={cx(
          topbarClass,
          'prism-crystal rounded-2xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Layers
            aria-hidden="true"
            className="w-4 h-4 shrink-0 text-[var(--prism-secondary-dark)] dark:text-[var(--prism-secondary-main)]"
          />
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            Workspace
          </span>
          <span className="prism-well rounded-full px-2.5 py-0.5 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
            {artifactCountLabel}
          </span>
        </div>

        <div
          role="group"
          aria-label="Workspace layout"
          className="prism-well p-1 rounded-full inline-flex items-center gap-1"
        >
          {LAYOUT_OPTIONS.map((option) => {
            const active = currentViewMode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                aria-pressed={active}
                data-layout-option={option.mode}
                onClick={() => handleViewModeSelect(option.mode)}
                className={cx(
                  'prism-focus-ring h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                  active ? 'prism-btn-primary font-semibold' : IDLE_PILL_BUTTON_CLASS
                )}
              >
                {renderLayoutIcon(option.mode)}
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cx(
          'grid gap-3.5 min-h-[360px]',
          currentViewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {showConversation ? (
          <section
            aria-label={conversationTitle}
            data-pane="conversation"
            className={cx(
              conversationClass,
              'prism-crystal rounded-2xl flex flex-col overflow-hidden min-w-0'
            )}
          >
            <div className="px-4 py-2.5 border-b border-[var(--prism-divider)] flex items-center gap-2 shrink-0">
              <MessageSquare
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0 text-[var(--prism-text-secondary)]"
              />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--prism-text-secondary)] truncate">
                {conversationTitle}
              </h2>
            </div>
            <div className="p-4 flex-1 overflow-auto min-h-0">{conversationPane}</div>
          </section>
        ) : null}

        {showArtifact ? (
          <section
            aria-label="Artifact workspace"
            data-pane="artifact"
            className={cx(
              artifactClass,
              'prism-crystal rounded-2xl flex flex-col overflow-hidden min-w-0'
            )}
          >
            {activeArtifact ? (
              <>
                <div className="px-3.5 py-2.5 border-b border-[var(--prism-divider)] flex flex-col gap-2 shrink-0">
                  {uniqueArtifacts.length > 1 ? (
                    <div
                      role="tablist"
                      aria-label="Artifacts"
                      className="prism-well p-1 rounded-full flex items-center gap-1 overflow-x-auto max-w-full"
                    >
                      {uniqueArtifacts.map((item, idx) => {
                        const isSelected = item.id === activeArtifact.id;
                        return (
                          <button
                            key={item.id}
                            ref={(el) => {
                              if (el) {
                                tabButtonRefs.current.set(item.id, el);
                              } else {
                                tabButtonRefs.current.delete(item.id);
                              }
                            }}
                            id={`${baseId}-tab-${item.id}`}
                            type="button"
                            role="tab"
                            tabIndex={isSelected ? 0 : -1}
                            aria-selected={isSelected}
                            aria-controls={`${baseId}-panel-${item.id}`}
                            onClick={() => selectArtifact(item)}
                            onKeyDown={(e) => handleTabKeyDown(e, idx)}
                            className={cx(
                              'prism-focus-ring h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                              isSelected
                                ? 'prism-crystal text-slate-950 dark:text-white font-semibold'
                                : IDLE_PILL_BUTTON_CLASS
                            )}
                          >
                            {renderArtifactKindIcon(item.kind)}
                            <span>{item.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {renderArtifactKindIcon(activeArtifact.kind)}
                        <span className="truncate">{activeArtifact.title}</span>
                      </span>

                      <span
                        data-artifact-kind={activeArtifact.kind}
                        className="prism-well rounded-full px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap"
                      >
                        {getArtifactKindLabel(activeArtifact.kind)}
                      </span>

                      {activeArtifact.language ? (
                        <span
                          data-artifact-language={activeArtifact.language}
                          className="prism-well rounded-full px-2 py-0.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap"
                        >
                          {activeArtifact.language}
                        </span>
                      ) : null}

                      {activeArtifact.version ? (
                        <span
                          data-artifact-version={activeArtifact.version}
                          className="prism-well rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap"
                        >
                          {activeArtifact.version}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {hasPreview ? (
                        <div
                          role="group"
                          aria-label="Artifact surface mode"
                          className="prism-well p-0.5 rounded-full inline-flex items-center gap-0.5"
                        >
                          <button
                            type="button"
                            aria-pressed={activeSurfaceMode === 'preview'}
                            onClick={() => handleSurfaceChange(activeArtifact, 'preview')}
                            className={cx(
                              'prism-focus-ring h-6 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                              activeSurfaceMode === 'preview'
                                ? 'prism-btn-primary font-semibold'
                                : IDLE_PILL_BUTTON_CLASS
                            )}
                          >
                            <Eye className="w-3 h-3 shrink-0 relative z-10" aria-hidden="true" />
                            <span className="relative z-10">Preview</span>
                          </button>
                          <button
                            type="button"
                            aria-pressed={activeSurfaceMode === 'source'}
                            onClick={() => handleSurfaceChange(activeArtifact, 'source')}
                            className={cx(
                              'prism-focus-ring h-6 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                              activeSurfaceMode === 'source'
                                ? 'prism-btn-primary font-semibold'
                                : IDLE_PILL_BUTTON_CLASS
                            )}
                          >
                            <Code2 className="w-3 h-3 shrink-0 relative z-10" aria-hidden="true" />
                            <span className="relative z-10">Source</span>
                          </button>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleCopyArtifact(activeArtifact)}
                        data-copied={copied ? 'true' : undefined}
                        className={cx(
                          actionButtonClass,
                          copied ? 'prism-emerald font-semibold' : cx('prism-well', IDLE_PILL_BUTTON_CLASS)
                        )}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {onDownloadArtifact ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadArtifact(activeArtifact)}
                          className={cx(actionButtonClass, 'prism-well', IDLE_PILL_BUTTON_CLASS)}
                        >
                          <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>Download</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div
                  id={`${baseId}-panel-${activeArtifact.id}`}
                  role={uniqueArtifacts.length > 1 ? 'tabpanel' : undefined}
                  aria-labelledby={
                    uniqueArtifacts.length > 1 ? `${baseId}-tab-${activeArtifact.id}` : undefined
                  }
                  className="p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                  {activeSurfaceMode === 'preview' && hasPreview ? (
                    <div
                      data-artifact-surface="preview"
                      className="prism-well rounded-xl p-4 flex-1 overflow-auto min-h-0"
                    >
                      {activeArtifact.preview}
                    </div>
                  ) : (
                    <div
                      data-artifact-surface="source"
                      className="prism-well rounded-xl p-3.5 flex-1 overflow-auto min-h-0"
                    >
                      <pre className="m-0 text-xs sm:text-[13px] leading-relaxed font-mono text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">
                        <code data-language={activeArtifact.language}>{activeArtifact.content}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div
                data-empty-artifacts="true"
                className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-2.5"
              >
                <div className="prism-well w-11 h-11 rounded-2xl inline-flex items-center justify-center text-[var(--prism-text-secondary)]">
                  <Layers className="w-5 h-5" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  No artifacts yet
                </p>
                <p className="text-xs text-[var(--prism-text-secondary)] max-w-xs">
                  Generated code, structured documents, and live previews will appear here.
                </p>
              </div>
            )}
          </section>
        ) : null}
      </div>

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}

export const SplitArtifactCanvas = memo(SplitArtifactCanvasInner);
SplitArtifactCanvas.displayName = 'SplitArtifactCanvas';
