'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  Columns2,
  CornerDownLeft,
  Folder,
  Layers,
  Plus,
  Terminal,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type TerminalSessionStatus = 'running' | 'idle' | 'error';

export interface TerminalSessionPane {
  /** Unique terminal session identifier. */
  id: string;
  /** Session display title shown in tabs and pane header. */
  title: string;
  /** Optional current working directory label (e.g. '~/workspace'). */
  cwd?: string;
  /** Optional runtime status reflected by the status indicator dot (defaults to 'idle'). */
  status?: TerminalSessionStatus;
  /** Monospace terminal output lines rendered inside the pane scrollback. */
  lines: string[];
}

export type MultiplexerLayout = 'tabs' | 'split';

export interface TerminalMultiplexerProps extends BaseProps<HTMLDivElement> {
  /** Controlled list of open terminal session panes. */
  panes?: TerminalSessionPane[];
  /** Initial terminal panes when operating uncontrolled. */
  defaultPanes?: TerminalSessionPane[];
  /** Callback invoked whenever panes are added, closed, or receive command output. */
  onPanesChange?: (panes: TerminalSessionPane[]) => void;
  /** Controlled active session pane identifier. */
  activePaneId?: string;
  /** Initial active session pane identifier in uncontrolled mode. */
  defaultActivePaneId?: string;
  /** Callback fired when the active pane selection changes. */
  onActivePaneChange?: (id: string) => void;
  /** Controlled workspace layout ('tabs' | 'split'). */
  layout?: MultiplexerLayout;
  /** Initial workspace layout when operating uncontrolled (defaults to 'tabs'). */
  defaultLayout?: MultiplexerLayout;
  /** Callback fired when layout toggles between 'tabs' and 'split'. */
  onLayoutChange?: (layout: MultiplexerLayout) => void;
  /** Callback executed when a non-blank command is submitted; returned string is appended to output. */
  onCommand?: (paneId: string, command: string) => string | void;
  /** Maximum open panes allowed, clamped safely to 1..12 (defaults to 6). */
  maxPanes?: number;
}

const DEFAULT_PANES: TerminalSessionPane[] = [
  {
    id: 'session-1',
    title: 'Session 1',
    cwd: '~',
    status: 'idle',
    lines: ['Refractor shell ready. Type a command and press Enter.'],
  },
];

function getStatusColor(status: TerminalSessionStatus): string {
  switch (status) {
    case 'running':
      return 'var(--prism-success-main)';
    case 'error':
      return 'var(--prism-error-main)';
    case 'idle':
      return 'var(--prism-text-disabled)';
  }
}

function getStatusLabel(status: TerminalSessionStatus): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'error':
      return 'Error';
    case 'idle':
      return 'Idle';
  }
}

function toNumberedLines(
  paneId: string,
  lines: ReadonlyArray<string>
): Array<{ lineKey: string; text: string }> {
  const entries: Array<{ lineKey: string; text: string }> = [];
  let seq = 0;
  for (const text of lines) {
    seq += 1;
    entries.push({
      lineKey: `${paneId}-line-${seq}`,
      text,
    });
  }
  return entries;
}

function TerminalMultiplexerInner({
  panes,
  defaultPanes = DEFAULT_PANES,
  onPanesChange,
  activePaneId,
  defaultActivePaneId,
  onActivePaneChange,
  layout,
  defaultLayout = 'tabs',
  onLayoutChange,
  onCommand,
  maxPanes = 6,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TerminalMultiplexerProps) {
  const baseId = useId();
  const override = useComponentOverride('TerminalMultiplexer');

  const safeMaxPanes = Math.round(clampNumber(maxPanes, 1, 12, 6));

  const [currentPanes, setCurrentPanes] = useControllableState<TerminalSessionPane[]>({
    value: panes,
    defaultValue: defaultPanes,
    onChange: onPanesChange,
  });

  const initialActiveId = defaultActivePaneId ?? defaultPanes[0]?.id ?? '';

  const [rawActivePaneId, setActivePaneId] = useControllableState<string>({
    value: activePaneId,
    defaultValue: initialActiveId,
    onChange: onActivePaneChange,
  });

  const [currentLayout, setCurrentLayout] = useControllableState<MultiplexerLayout>({
    value: layout,
    defaultValue: defaultLayout,
    onChange: onLayoutChange,
  });

  const [drafts, setDrafts] = useState<ReadonlyMap<string, string>>(() => new Map());
  const nextSessionSeqRef = useRef(currentPanes.length + 1);

  const activePane = useMemo<TerminalSessionPane | undefined>(() => {
    return currentPanes.find((pane) => pane.id === rawActivePaneId) ?? currentPanes[0];
  }, [currentPanes, rawActivePaneId]);

  const effectiveActivePaneId = activePane?.id ?? '';
  const isAtMaxPanes = currentPanes.length >= safeMaxPanes;
  const isEmpty = !activePane;

  const handleAddPane = useCallback(() => {
    const existingIds = new Set(currentPanes.map((pane) => pane.id));
    let candidate = Math.max(1, nextSessionSeqRef.current);
    while (existingIds.has(`session-${candidate}`)) {
      candidate += 1;
    }
    nextSessionSeqRef.current = candidate + 1;

    const newPane: TerminalSessionPane = {
      id: `session-${candidate}`,
      title: `Session ${candidate}`,
      cwd: '~',
      status: 'idle',
      lines: [],
    };
    setCurrentPanes([...currentPanes, newPane]);
    setActivePaneId(newPane.id);
  }, [currentPanes, setCurrentPanes, setActivePaneId]);

  const handleClosePane = useCallback(
    (targetId: string) => {
      const targetIndex = currentPanes.findIndex((pane) => pane.id === targetId);
      const nextPanes = currentPanes.filter((pane) => pane.id !== targetId);
      setCurrentPanes(nextPanes);

      setDrafts((prev) => {
        if (!prev.has(targetId)) return prev;
        const next = new Map(prev);
        next.delete(targetId);
        return next;
      });

      if (effectiveActivePaneId === targetId) {
        const nextActive = nextPanes[Math.min(targetIndex, nextPanes.length - 1)]?.id ?? '';
        setActivePaneId(nextActive);
      }
    },
    [currentPanes, effectiveActivePaneId, setCurrentPanes, setActivePaneId]
  );

  const handleDraftChange = useCallback((paneId: string, nextValue: string) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(paneId, nextValue);
      return next;
    });
  }, []);

  const handleSubmitCommand = useCallback(
    (paneId: string) => {
      const trimmed = (drafts.get(paneId) ?? '').trim();
      if (trimmed.length === 0) {
        return;
      }

      setDrafts((prev) => {
        const next = new Map(prev);
        next.set(paneId, '');
        return next;
      });

      const response = onCommand?.(paneId, trimmed);
      const appended =
        typeof response === 'string' && response.length > 0
          ? [`$ ${trimmed}`, response]
          : [`$ ${trimmed}`];

      setCurrentPanes(
        currentPanes.map((pane) =>
          pane.id === paneId ? { ...pane, lines: [...pane.lines, ...appended] } : pane
        )
      );
    },
    [currentPanes, drafts, onCommand, setCurrentPanes]
  );

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (event.nativeEvent.isComposing || currentPanes.length <= 1) return;
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const targetIndex = (currentIndex + delta + currentPanes.length) % currentPanes.length;
      const targetPane = currentPanes[targetIndex] as TerminalSessionPane;
      setActivePaneId(targetPane.id);
    },
    [currentPanes, setActivePaneId]
  );

  const merged = mergeProps({
    themeTarget: themeProps('terminal-multiplexer', {
      layout: currentLayout,
      paneCount: currentPanes.length,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab w-full overflow-hidden flex flex-col',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const topbarClass = stableClassName('terminal-multiplexer', 'topbar');
  const workspaceClass = stableClassName('terminal-multiplexer', 'workspace');
  const paneClass = stableClassName('terminal-multiplexer', 'pane');

  const renderPaneSurface = (pane: TerminalSessionPane, isSplitMode: boolean) => {
    const status: TerminalSessionStatus = pane.status ?? 'idle';
    const isActive = pane.id === effectiveActivePaneId;
    const numberedLines = toNumberedLines(pane.id, pane.lines);
    const draftValue = drafts.get(pane.id) ?? '';
    const isDraftBlank = draftValue.trim().length === 0;
    const panePanelId = `${baseId}-panel-${pane.id}`;
    const paneTabId = `${baseId}-tab-${pane.id}`;

    return (
      <div
        key={pane.id}
        id={isSplitMode ? undefined : panePanelId}
        role={isSplitMode ? 'region' : 'tabpanel'}
        aria-labelledby={isSplitMode ? undefined : paneTabId}
        aria-label={isSplitMode ? pane.title : undefined}
        data-pane-id={pane.id}
        data-active={isActive ? 'true' : 'false'}
        onClick={isSplitMode ? () => setActivePaneId(pane.id) : undefined}
        className={cx(
          paneClass,
          'prism-crystal rounded-2xl border-2 flex flex-col overflow-hidden transition-[color,background-color,border-color,opacity,transform]',
          isSplitMode ? 'cursor-pointer' : 'w-full'
        )}
        style={{
          borderColor: isActive ? 'var(--prism-primary-main)' : 'var(--prism-well-border)',
        }}
      >
        <div
          className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b"
          style={STYLE_BORDER_DIVIDER}
        >
          <div className="min-w-0 flex items-center gap-2">
            <span
              data-pane-status={status}
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getStatusColor(status) }}
            />
            <span
              className="text-xs font-semibold truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {pane.title}
            </span>
            <span
              className="prism-well rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {getStatusLabel(status)}
            </span>
          </div>

          {pane.cwd ? (
            <span
              data-pane-cwd={pane.id}
              className="prism-well rounded-full px-2.5 py-0.5 inline-flex items-center gap-1 text-[11px] font-mono truncate max-w-full"
              style={STYLE_TEXT_SECONDARY}
            >
              <Folder className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{pane.cwd}</span>
            </span>
          ) : null}
        </div>

        <div
          data-pane-output={pane.id}
          className="prism-well m-3 mb-2 rounded-xl p-3 font-mono text-xs overflow-y-auto max-h-64 min-h-36 space-y-1"
          style={STYLE_TEXT_PRIMARY}
        >
          {numberedLines.length === 0 ? (
            <p className="italic" style={STYLE_TEXT_DISABLED}>
              No output yet.
            </p>
          ) : (
            numberedLines.map((line) => (
              <div
                key={line.lineKey}
                className="whitespace-pre-wrap break-words leading-relaxed"
              >
                {line.text}
              </div>
            ))
          )}
        </div>

        <div
          className="px-3 pb-3 pt-1 flex items-center gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="prism-well flex-1 rounded-xl px-3 py-1.5 flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="font-mono text-xs font-bold shrink-0"
              style={STYLE_PRIMARY_MAIN}
            >
              $
            </span>
            <input
              type="text"
              value={draftValue}
              aria-label={`Command input for ${pane.title}`}
              placeholder="Enter command..."
              onFocus={() => setActivePaneId(pane.id)}
              onChange={(event) => handleDraftChange(pane.id, event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || event.key !== 'Enter') {
                  return;
                }
                event.preventDefault();
                handleSubmitCommand(pane.id);
              }}
              className="prism-focus-ring w-full bg-transparent text-xs font-mono outline-none"
              style={STYLE_TEXT_PRIMARY}
            />
          </div>

          <button
            type="button"
            disabled={isDraftBlank}
            aria-label={`Run command in ${pane.title}`}
            onClick={() => handleSubmitCommand(pane.id)}
            className="prism-btn-secondary prism-focus-ring h-8 px-2.5 rounded-xl inline-flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] shrink-0"
          >
            <CornerDownLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Run</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div ref={ref} role="region" aria-label="Terminal Multiplexer" {...rest} {...merged}>
      <div
        className={cx(
          topbarClass,
          'px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
          <span
            className="prism-well w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Terminal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </span>

          <div
            role="tablist"
            aria-label="Terminal sessions"
            className="flex flex-wrap items-center gap-1.5 min-w-0"
          >
            {currentPanes.map((pane, idx) => {
              const status: TerminalSessionStatus = pane.status ?? 'idle';
              const isSelected = pane.id === effectiveActivePaneId;
              return (
                <div
                  key={pane.id}
                  className={cx(
                    'rounded-full inline-flex items-center p-0.5 gap-0.5 transition-[color,background-color,border-color,opacity,transform]',
                    isSelected ? 'prism-crystal' : 'prism-well opacity-80'
                  )}
                >
                  <button
                    id={`${baseId}-tab-${pane.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={`${baseId}-panel-${pane.id}`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActivePaneId(pane.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, idx)}
                    className="prism-focus-ring h-7 pl-2.5 pr-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer enabled:hover:opacity-100 transition-opacity"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    <span
                      data-tab-status={status}
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getStatusColor(status) }}
                    />
                    <span className="max-w-32 truncate">{pane.title}</span>
                  </button>

                  <button
                    type="button"
                    aria-label={`Close ${pane.title}`}
                    onClick={() => handleClosePane(pane.id)}
                    className="prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center cursor-pointer opacity-70 enabled:hover:opacity-100 transition-opacity"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <X className="w-3 h-3 shrink-0" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={isAtMaxPanes}
            aria-label="New session"
            onClick={handleAddPane}
            className="prism-well prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </button>
        </div>

        <div
          role="group"
          aria-label="Multiplexer layout"
          className="prism-well rounded-full p-1 inline-flex items-center gap-1 shrink-0"
        >
          <button
            type="button"
            aria-pressed={currentLayout === 'tabs'}
            onClick={() => setCurrentLayout('tabs')}
            className={cx(
              'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
              currentLayout === 'tabs'
                ? 'prism-btn-primary'
                : 'opacity-75 enabled:hover:opacity-100'
            )}
            style={currentLayout === 'tabs' ? undefined : { color: 'var(--prism-text-primary)' }}
          >
            <Layers className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
            <span className="relative z-10">Tabs</span>
          </button>

          <button
            type="button"
            aria-pressed={currentLayout === 'split'}
            onClick={() => setCurrentLayout('split')}
            className={cx(
              'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
              currentLayout === 'split'
                ? 'prism-btn-primary'
                : 'opacity-75 enabled:hover:opacity-100'
            )}
            style={currentLayout === 'split' ? undefined : { color: 'var(--prism-text-primary)' }}
          >
            <Columns2 className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
            <span className="relative z-10">Split</span>
          </button>
        </div>
      </div>

      <div className={cx(workspaceClass, 'p-4')}>
        {!activePane ? (
          <div
            data-testid="multiplexer-empty-state"
            className="prism-well rounded-2xl px-6 py-10 text-center flex flex-col items-center gap-3"
          >
            <Terminal
              className="w-7 h-7 opacity-65"
              aria-hidden="true"
              style={STYLE_TEXT_SECONDARY}
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
                No active terminal sessions
              </p>
              <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
                Start a new session to run commands and inspect output streams.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddPane}
              className="prism-btn-primary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
              <span className="relative z-10">New Session</span>
            </button>
          </div>
        ) : currentLayout === 'split' ? (
          <div
            data-testid="multiplexer-split-grid"
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {currentPanes.map((pane) => renderPaneSurface(pane, true))}
          </div>
        ) : (
          renderPaneSurface(activePane, false)
        )}
      </div>
    </div>
  );
}

export const TerminalMultiplexer = memo(TerminalMultiplexerInner);
TerminalMultiplexer.displayName = 'TerminalMultiplexer';
