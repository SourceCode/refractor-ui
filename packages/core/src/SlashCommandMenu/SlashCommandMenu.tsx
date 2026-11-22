'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Blocks,
  Check,
  CheckSquare,
  Code2,
  FileText,
  Heading2,
  Link2,
  MessageSquareQuote,
  Minus,
  Slash,
  Sparkles,
  Table2,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { splitLiteralHighlight } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type SlashCommandGroup = 'blocks' | 'media' | 'data' | 'ai';

export interface SlashCommandOption {
  /** Stable unique identifier for the slash command option. */
  id: string;
  /** Primary display name of the block or action command. */
  label: string;
  /** Concise summary shown below the label and matched during filtering. */
  description: string;
  /** Semantic group heading (`'blocks' | 'media' | 'data' | 'ai'`). */
  group: SlashCommandGroup;
  /** Optional supplementary search keywords matched when filtering. */
  keywords?: ReadonlyArray<string>;
  /** Block snippet inserted into the document when the command is activated. */
  insertTemplate: string;
  /** Optional trailing slash-hint or shortcut keycap badge. */
  shortcut?: string;
}

export interface SlashCommandMenuProps extends BaseProps<HTMLDivElement> {
  /** Custom slash command definitions (defaults to 8 rich document block commands). */
  commands?: ReadonlyArray<SlashCommandOption>;
  /** Initial document editor text (defaults to empty string with slash-command placeholder). */
  defaultValue?: string;
  /** Whether the floating slash command palette starts open (defaults to `true`). */
  defaultMenuOpen?: boolean;
  /** Callback fired with the chosen command and updated document text after insertion. */
  onInsertCommand?: (command: SlashCommandOption, nextDocumentText: string) => void;
  /** Editor header title and accessible region label (defaults to `'Document Editor with Slash Commands'`). */
  title?: string;
}

interface SlashTriggerMatch {
  start: number;
  end: number;
  query: string;
}

interface NormalizedSlashEntry {
  uniqueKey: string;
  optionId: string;
  flatIndex: number;
  command: SlashCommandOption;
}

interface GroupedSlashSection {
  group: SlashCommandGroup;
  label: string;
  entries: ReadonlyArray<NormalizedSlashEntry>;
}

const DEFAULT_TITLE = 'Document Editor with Slash Commands';
const MAX_SLASH_QUERY_LENGTH = 40;

const GROUP_ORDER: ReadonlyArray<SlashCommandGroup> = ['blocks', 'media', 'data', 'ai'];

function getGroupLabel(group: SlashCommandGroup): string {
  switch (group) {
    case 'blocks':
      return 'Blocks';
    case 'media':
      return 'Media';
    case 'data':
      return 'Data';
    case 'ai':
      return 'AI';
  }
}

export const DEFAULT_SLASH_COMMANDS: ReadonlyArray<SlashCommandOption> = [
  {
    id: 'heading-2',
    label: 'Heading 2',
    description: 'Structured H2 section heading',
    group: 'blocks',
    keywords: ['h2', 'header', 'title', 'section'],
    insertTemplate: '## Section Heading\n',
    shortcut: '/h2',
  },
  {
    id: 'callout-admonition',
    label: 'Callout Admonition',
    description: 'Highlighted note or warning block',
    group: 'blocks',
    keywords: ['callout', 'admonition', 'note', 'alert', 'tip'],
    insertTemplate: '> [!NOTE]\n> Key optical insight.\n',
    shortcut: '/call',
  },
  {
    id: 'checklist',
    label: 'Checklist',
    description: 'Actionable markdown task items',
    group: 'blocks',
    keywords: ['todo', 'tasks', 'checkbox', 'list'],
    insertTemplate: '- [ ] First action item\n- [ ] Follow-up item\n',
    shortcut: '/todo',
  },
  {
    id: 'code-block',
    label: 'Code Block',
    description: 'Fenced syntax-highlighted snippet',
    group: 'blocks',
    keywords: ['code', 'snippet', 'pre', 'typescript'],
    insertTemplate: '```ts\nconst value = 42;\n```\n',
    shortcut: '/code',
  },
  {
    id: 'optical-divider',
    label: 'Optical Divider',
    description: 'Refractive horizontal section rule',
    group: 'blocks',
    keywords: ['divider', 'hr', 'line', 'separator', 'rule'],
    insertTemplate: '\n---\n',
    shortcut: '/div',
  },
  {
    id: 'embed-link',
    label: 'Embed Link',
    description: 'External media or resource card',
    group: 'media',
    keywords: ['embed', 'link', 'url', 'bookmark', 'video'],
    insertTemplate: '[Embedded Resource](https://example.com)\n',
    shortcut: '/embed',
  },
  {
    id: 'data-table',
    label: 'Data Table',
    description: 'Structured columns and rows grid',
    group: 'data',
    keywords: ['table', 'grid', 'spreadsheet', 'matrix', 'columns'],
    insertTemplate: '| Column A | Column B |\n| --- | --- |\n| Value 1 | Value 2 |\n',
    shortcut: '/table',
  },
  {
    id: 'ai-summary',
    label: 'AI Summary',
    description: 'Synthesize key highlights with AI',
    group: 'ai',
    keywords: ['ai', 'summary', 'tldr', 'assistant', 'generate'],
    insertTemplate: '### AI Summary\n- Key finding synthesized from the document.\n',
    shortcut: '/ai',
  },
];

function isWhitespaceChar(ch: string): boolean {
  return ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t';
}

function detectSlashTrigger(text: string, caretPos: number): SlashTriggerMatch | null {
  const safeCaret = Math.max(0, Math.min(caretPos, text.length));
  const beforeCaret = text.slice(0, safeCaret);
  const lineStart = beforeCaret.lastIndexOf('\n') + 1;
  const lineBeforeCaret = beforeCaret.slice(lineStart);

  let slashOffset = -1;
  for (let i = lineBeforeCaret.length - 1; i >= 0; i -= 1) {
    if (
      lineBeforeCaret.charAt(i) === '/' &&
      (i === 0 || isWhitespaceChar(lineBeforeCaret.charAt(i - 1)))
    ) {
      slashOffset = i;
      break;
    }
  }

  if (slashOffset === -1) {
    return null;
  }

  const query = lineBeforeCaret.slice(slashOffset + 1);
  if (
    query.length > MAX_SLASH_QUERY_LENGTH ||
    query.includes('\r') ||
    (query.length > 0 && isWhitespaceChar(query.charAt(0)))
  ) {
    return null;
  }

  return {
    start: lineStart + slashOffset,
    end: safeCaret,
    query,
  };
}

function computeCursorCoordinates(
  text: string,
  index: number
): { line: number; col: number; offsetPx: number } {
  const safeIndex = Math.max(0, Math.min(index, text.length));
  const before = text.slice(0, safeIndex);
  let line = 1;
  for (let i = 0; i < before.length; i += 1) {
    if (before.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  const lastNewline = before.lastIndexOf('\n');
  const colZeroBased = lastNewline === -1 ? before.length : before.length - lastNewline - 1;
  return {
    line,
    col: colZeroBased + 1,
    offsetPx: Math.min(colZeroBased * 7, 112),
  };
}

function matchesSlashQuery(command: SlashCommandOption, lowerQuery: string): boolean {
  if (!lowerQuery) {
    return true;
  }
  if (command.label.toLowerCase().includes(lowerQuery)) {
    return true;
  }
  if (command.description.toLowerCase().includes(lowerQuery)) {
    return true;
  }
  if (getGroupLabel(command.group).toLowerCase().includes(lowerQuery)) {
    return true;
  }
  if (command.shortcut && command.shortcut.toLowerCase().includes(lowerQuery)) {
    return true;
  }
  if (command.keywords) {
    for (const kw of command.keywords) {
      if (kw.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }
  }
  return false;
}

function renderHighlightedText(source: string, query: string): ReactNode {
  const segments = splitLiteralHighlight(source, query);
  let offset = 0;
  return segments.map((seg) => {
    const start = offset;
    offset += seg.text.length;
    const key = `${start}-${seg.highlighted ? 'h' : 'n'}-${seg.text.length}`;
    return seg.highlighted ? (
      <mark
        key={key}
        className="rounded-sm px-0.5 font-semibold"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--prism-primary-main) 22%, transparent)',
          color: 'var(--prism-text-primary)',
        }}
      >
        {seg.text}
      </mark>
    ) : (
      <span key={key}>{seg.text}</span>
    );
  });
}

function renderCommandIcon(command: SlashCommandOption): ReactNode {
  const iconClass = 'w-3.5 h-3.5 shrink-0';
  switch (command.id) {
    case 'heading-2':
      return (
        <Heading2
          className={iconClass}
          aria-hidden="true"
          style={{ color: 'var(--prism-primary-main)' }}
        />
      );
    case 'callout-admonition':
      return (
        <MessageSquareQuote
          className={iconClass}
          aria-hidden="true"
          style={{ color: 'var(--prism-warning-main)' }}
        />
      );
    case 'checklist':
      return (
        <CheckSquare
          className={iconClass}
          aria-hidden="true"
          style={{ color: 'var(--prism-success-main)' }}
        />
      );
    case 'code-block':
      return (
        <Code2
          className={iconClass}
          aria-hidden="true"
          style={{ color: 'var(--prism-info-main)' }}
        />
      );
    case 'optical-divider':
      return (
        <Minus
          className={iconClass}
          aria-hidden="true"
          style={{ color: 'var(--prism-text-secondary)' }}
        />
      );
    case 'embed-link':
      return (
        <Link2
          className={iconClass}
          aria-hidden="true"
          style={{ color: 'var(--prism-secondary-dark)' }}
        />
      );
    case 'data-table':
      return (
        <Table2
          className={iconClass}
          aria-hidden="true"
          style={{ color: 'var(--prism-info-main)' }}
        />
      );
    case 'ai-summary':
      return (
        <Sparkles
          className={iconClass}
          aria-hidden="true"
          style={{ color: 'var(--prism-primary-main)' }}
        />
      );
    default:
      switch (command.group) {
        case 'media':
          return (
            <Link2
              className={iconClass}
              aria-hidden="true"
              style={{ color: 'var(--prism-secondary-dark)' }}
            />
          );
        case 'data':
          return (
            <Table2
              className={iconClass}
              aria-hidden="true"
              style={{ color: 'var(--prism-info-main)' }}
            />
          );
        case 'ai':
          return (
            <Sparkles
              className={iconClass}
              aria-hidden="true"
              style={{ color: 'var(--prism-primary-main)' }}
            />
          );
        default:
          return (
            <Blocks
              className={iconClass}
              aria-hidden="true"
              style={{ color: 'var(--prism-primary-main)' }}
            />
          );
      }
  }
}

export function SlashCommandMenu({
  commands = DEFAULT_SLASH_COMMANDS,
  defaultValue = '',
  defaultMenuOpen = true,
  onInsertCommand,
  title = DEFAULT_TITLE,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SlashCommandMenuProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const override = useComponentOverride('SlashCommandMenu');

  const [documentText, setDocumentText] = useState<string>(defaultValue);
  const [cursorPos, setCursorPos] = useState<number>(defaultValue.length);
  const [slashTrigger, setSlashTrigger] = useState<SlashTriggerMatch | null>(() =>
    detectSlashTrigger(defaultValue, defaultValue.length)
  );
  const [menuOpen, setMenuOpen] = useState<boolean>(defaultMenuOpen);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [lastInsertedLabel, setLastInsertedLabel] = useState<string | null>(null);

  useEffect(() => {
    const pendingCaret = pendingCaretRef.current;
    const textarea = textareaRef.current;
    if (pendingCaret !== null && textarea) {
      pendingCaretRef.current = null;
      textarea.focus();
      textarea.setSelectionRange(pendingCaret, pendingCaret);
    }
  }, [documentText]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }
    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideMouseDown);
    return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
  }, [menuOpen]);

  const activeQuery = slashTrigger ? slashTrigger.query.trim() : '';
  const lowerQuery = activeQuery.toLowerCase();

  const { groupedSections, flattenedEntries } = useMemo(() => {
    const buckets = new Map<SlashCommandGroup, SlashCommandOption[]>();

    for (const command of commands) {
      if (!matchesSlashQuery(command, lowerQuery)) {
        continue;
      }
      const existing = buckets.get(command.group);
      if (existing) {
        existing.push(command);
      } else {
        buckets.set(command.group, [command]);
      }
    }

    const idCounts = new Map<string, number>();
    const flattened: NormalizedSlashEntry[] = [];
    const sections: GroupedSlashSection[] = [];

    for (const group of GROUP_ORDER) {
      const items = buckets.get(group);
      if (!items) {
        continue;
      }
      const entries: NormalizedSlashEntry[] = items.map((command) => {
        const occurrence = (idCounts.get(command.id) ?? 0) + 1;
        idCounts.set(command.id, occurrence);
        const flatIndex = flattened.length;
        const uniqueKey = `${command.id}::${occurrence}`;
        const optionId = `${listboxId}-opt-${flatIndex}`;
        const entry: NormalizedSlashEntry = {
          uniqueKey,
          optionId,
          flatIndex,
          command,
        };
        flattened.push(entry);
        return entry;
      });
      sections.push({
        group,
        label: getGroupLabel(group),
        entries,
      });
    }

    return {
      groupedSections: sections,
      flattenedEntries: flattened,
    };
  }, [commands, listboxId, lowerQuery]);

  const clampedIndex =
    flattenedEntries.length > 0
      ? Math.min(Math.max(activeIndex, 0), flattenedEntries.length - 1)
      : 0;

  const activeEntry = flattenedEntries[clampedIndex];

  const insertCommand = useCallback(
    (command: SlashCommandOption) => {
      const insertStart = slashTrigger
        ? slashTrigger.start
        : Math.max(0, Math.min(cursorPos, documentText.length));
      const insertEnd = slashTrigger ? slashTrigger.end : insertStart;

      const before = documentText.slice(0, insertStart);
      const after = documentText.slice(insertEnd);
      const nextDocumentText = `${before}${command.insertTemplate}${after}`;
      const nextCaret = before.length + command.insertTemplate.length;

      pendingCaretRef.current = nextCaret;
      setDocumentText(nextDocumentText);
      setCursorPos(nextCaret);
      setSlashTrigger(null);
      setMenuOpen(false);
      setActiveIndex(0);
      setLastInsertedLabel(command.label);
      onInsertCommand?.(command, nextDocumentText);
    },
    [cursorPos, documentText, onInsertCommand, slashTrigger]
  );

  const handleEditorChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = event.target.value;
    const caret = event.target.selectionStart;
    setDocumentText(nextText);
    setCursorPos(caret);

    const detected = detectSlashTrigger(nextText, caret);
    if (detected) {
      setSlashTrigger(detected);
      setMenuOpen(true);
      setActiveIndex(0);
    } else {
      setSlashTrigger(null);
      setMenuOpen(false);
      setActiveIndex(0);
    }
  }, []);

  const handleMenuNavigationKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.nativeEvent.isComposing || !menuOpen) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }

      if (flattenedEntries.length === 0) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((clampedIndex + 1) % flattenedEntries.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((clampedIndex - 1 + flattenedEntries.length) % flattenedEntries.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const targetEntry = flattenedEntries[clampedIndex] as NormalizedSlashEntry;
        insertCommand(targetEntry.command);
      }
    },
    [clampedIndex, flattenedEntries, insertCommand, menuOpen]
  );

  const handleToggleMenu = useCallback(() => {
    setMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setActiveIndex(0);
      }
      return next;
    });
  }, []);

  const anchorIndex = slashTrigger ? slashTrigger.start : cursorPos;
  const anchorCoords = computeCursorCoordinates(documentText, anchorIndex);

  const merged = mergeProps({
    themeTarget: themeProps('slash-command-menu', {
      menuOpen,
      filtering: activeQuery.length > 0,
    }),
    baseClassName: 'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 space-y-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('slash-command-menu', 'header');
  const editorClass = stableClassName('slash-command-menu', 'editor');
  const paletteClass = stableClassName('slash-command-menu', 'palette');
  const optionClass = stableClassName('slash-command-menu', 'option');

  return (
    <div
      ref={mergedRef}
      role="region"
      aria-label={title}
      {...rest}
      {...merged}
    >
      {/* Header & Insertion Feedback */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText
            className="w-4 h-4 shrink-0"
            aria-hidden="true"
            style={{ color: 'var(--prism-primary-main)' }}
          />
          <span
            data-testid="slash-command-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <span
            aria-live="polite"
            aria-atomic="true"
            data-testid="slash-command-feedback"
            className="prism-well inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium max-w-full truncate"
            style={{
              color: lastInsertedLabel
                ? 'var(--prism-success-dark)'
                : 'var(--prism-text-secondary)',
            }}
          >
            {lastInsertedLabel ? (
              <>
                <Check
                  className="w-3 h-3 shrink-0"
                  aria-hidden="true"
                  style={{ color: 'var(--prism-success-main)' }}
                />
                <span className="truncate">Inserted {lastInsertedLabel}</span>
              </>
            ) : (
              <span className="truncate">Type / for commands</span>
            )}
          </span>

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            aria-controls={menuOpen ? listboxId : undefined}
            data-testid="slash-command-toggle"
            onClick={handleToggleMenu}
            className={cx(
              menuOpen ? 'prism-btn-primary' : 'prism-crystal',
              'prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer shrink-0 transition-opacity'
            )}
            style={menuOpen ? undefined : { color: 'var(--prism-text-primary)' }}
          >
            <Slash className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Commands</span>
          </button>
        </div>
      </div>

      {/* Recessed Mini Document Block Editor */}
      <div className={cx(editorClass, 'prism-well rounded-2xl p-3 space-y-2 min-w-0 max-w-full')}>
        <textarea
          ref={textareaRef}
          aria-label="Document editor"
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          aria-controls={menuOpen ? listboxId : undefined}
          aria-activedescendant={menuOpen && activeEntry ? activeEntry.optionId : undefined}
          aria-autocomplete="list"
          value={documentText}
          onChange={handleEditorChange}
          onKeyDown={handleMenuNavigationKeyDown}
          placeholder="Type / to insert a block..."
          rows={5}
          className="prism-focus-ring w-full min-w-0 max-w-full rounded-xl bg-transparent px-1 py-0.5 text-sm leading-relaxed font-mono resize-y"
          style={{ color: 'var(--prism-text-primary)' }}
        />

        <div
          className="pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] min-w-0"
          style={{
            borderColor: 'var(--prism-divider)',
            color: 'var(--prism-text-secondary)',
          }}
        >
          <span className="font-mono tabular-nums" data-testid="slash-cursor-coords">
            Ln {anchorCoords.line}, Col {anchorCoords.col}
          </span>
          {slashTrigger ? (
            <span
              data-testid="slash-active-query-chip"
              className="px-2 py-0.5 rounded-full font-mono font-semibold truncate max-w-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
                color: 'var(--prism-primary-main)',
              }}
            >
              /{slashTrigger.query}
            </span>
          ) : (
            <span className="truncate">Press / to open block palette</span>
          )}
        </div>
      </div>

      {/* Inline Cursor-Anchored Floating Slash Palette */}
      {menuOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Slash commands"
          data-testid="slash-command-listbox"
          data-anchor-line={String(anchorCoords.line)}
          data-anchor-col={String(anchorCoords.col)}
          data-query={activeQuery || undefined}
          onKeyDown={handleMenuNavigationKeyDown}
          className={cx(
            paletteClass,
            'prism-slab relative z-30 w-[min(22rem,calc(100vw-2rem))] max-w-full p-2 space-y-2'
          )}
          style={
            anchorCoords.offsetPx > 0
              ? {
                  marginLeft: `min(${anchorCoords.offsetPx}px, max(0px, calc(100% - min(22rem, calc(100vw - 2rem)))))`,
                }
              : undefined
          }
        >
          {/* Palette Header */}
          <div
            className="px-2 py-1 border-b flex flex-wrap items-center justify-between gap-2 text-[11px] select-none"
            style={{
              borderColor: 'var(--prism-divider)',
              color: 'var(--prism-text-secondary)',
            }}
          >
            <span className="inline-flex items-center gap-1.5 font-mono font-semibold min-w-0 truncate">
              <span style={{ color: 'var(--prism-primary-main)' }}>/</span>
              <span className="truncate" style={{ color: 'var(--prism-text-primary)' }}>
                {activeQuery ? activeQuery : 'Insert block'}
              </span>
            </span>
            <span className="font-mono tabular-nums shrink-0" data-testid="slash-match-count">
              {flattenedEntries.length}{' '}
              {flattenedEntries.length === 1 ? 'command' : 'commands'}
            </span>
          </div>

          {/* Grouped Command List or Empty Status */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
            {groupedSections.length === 0 ? (
              <div
                role="status"
                data-testid="slash-command-empty"
                className="prism-well rounded-xl px-3 py-5 text-center space-y-1"
              >
                <p
                  className="text-xs font-semibold"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {activeQuery
                    ? `No commands matching "/${activeQuery}"`
                    : 'No slash commands available'}
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  Press Esc to dismiss or refine your query.
                </p>
              </div>
            ) : (
              groupedSections.map((section) => {
                const groupHeadingId = `${listboxId}-group-${section.group}`;
                return (
                  <div
                    key={section.group}
                    role="group"
                    aria-labelledby={groupHeadingId}
                    data-group={section.group}
                    className="space-y-1"
                  >
                    <div
                      id={groupHeadingId}
                      className="px-2 pt-0.5 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider select-none"
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      <span>{section.label}</span>
                      <span className="tabular-nums">{section.entries.length}</span>
                    </div>
                    <div className="space-y-0.5">
                      {section.entries.map((entry) => {
                        const isHighlighted = entry.flatIndex === clampedIndex;
                        return (
                          <button
                            key={entry.uniqueKey}
                            id={entry.optionId}
                            type="button"
                            role="option"
                            tabIndex={-1}
                            aria-selected={isHighlighted}
                            data-highlighted={isHighlighted ? 'true' : undefined}
                            data-command-id={entry.command.id}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActiveIndex(entry.flatIndex)}
                            onClick={() => insertCommand(entry.command)}
                            className={cx(
                              optionClass,
                              'prism-focus-ring w-full min-w-0 px-2.5 py-2 rounded-xl flex items-start justify-between gap-2.5 text-left transition-colors cursor-pointer'
                            )}
                            style={{
                              backgroundColor: isHighlighted
                                ? 'color-mix(in srgb, var(--prism-secondary-main) 18%, transparent)'
                                : 'transparent',
                              boxShadow: isHighlighted
                                ? 'inset 0 0 0 1px color-mix(in srgb, var(--prism-secondary-main) 38%, transparent)'
                                : undefined,
                              color: 'var(--prism-text-primary)',
                            }}
                          >
                            <span className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span
                                className="prism-crystal w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 mt-0.5"
                                aria-hidden="true"
                              >
                                {renderCommandIcon(entry.command)}
                              </span>
                              <span className="min-w-0 flex-1 block">
                                <span
                                  className="block text-xs font-semibold truncate"
                                  style={{ color: 'var(--prism-text-primary)' }}
                                >
                                  {renderHighlightedText(entry.command.label, activeQuery)}
                                </span>
                                <span
                                  className="block text-[11px] truncate mt-0.5"
                                  style={{ color: 'var(--prism-text-secondary)' }}
                                >
                                  {renderHighlightedText(entry.command.description, activeQuery)}
                                </span>
                              </span>
                            </span>

                            {entry.command.shortcut ? (
                              <kbd
                                className="prism-well px-1.5 py-0.5 rounded-md font-mono text-[10px] font-semibold shrink-0 mt-0.5"
                                style={{ color: 'var(--prism-text-secondary)' }}
                              >
                                {entry.command.shortcut}
                              </kbd>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Keyboard Navigation Legend */}
          <div
            className="px-2 pt-1.5 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] select-none"
            style={{
              borderColor: 'var(--prism-divider)',
              color: 'var(--prism-text-secondary)',
            }}
          >
            <span>↑↓ Navigate · ↵ Insert · Esc Close</span>
            <span className="font-mono text-[10px]">Slash Menu</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

SlashCommandMenu.displayName = 'SlashCommandMenu';
