'use client';

import {
  memo,
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
  AlertCircle,
  Bold,
  Columns2,
  Eye,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  PenLine,
  Quote,
  RemoveFormatting,
  Underline,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { sanitizeHtml, sanitizeUrl } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export interface RichTextViewModeMap {
  write: true;
  split: true;
  preview: true;
}

export type RichTextViewMode = keyof RichTextViewModeMap;

type RichTextEditorBaseProps = Omit<BaseProps<HTMLDivElement>, 'children' | 'onChange'>;

export interface RichTextEditorProps extends RichTextEditorBaseProps {
  /** Controlled markdown or sanitized rich HTML document content. */
  value?: string;
  /** Initial uncontrolled document content. */
  defaultValue?: string;
  /** Invoked with sanitized content after every input edit or toolbar action. */
  onChange?: (sanitizedHtml: string) => void;
  /** Optional visible field label linked to the editor textarea. */
  label?: string;
  /** Placeholder text displayed when the editor is empty. */
  placeholder?: string;
  /** Locks editing and disables formatting toolbar controls. */
  readOnly?: boolean;
  /** Enables Write | Split | Preview view switching and live rich preview pane (default true). */
  showPreview?: boolean;
}

type PopoverKind = 'link' | 'image' | null;

type InlineNode =
  | { kind: 'text'; key: string; value: string }
  | { kind: 'strong'; key: string; children: InlineNode[] }
  | { kind: 'em'; key: string; children: InlineNode[] }
  | { kind: 'u'; key: string; children: InlineNode[] }
  | { kind: 'code'; key: string; value: string }
  | { kind: 'link'; key: string; href: string; label: string }
  | { kind: 'image'; key: string; src: string; alt: string };

interface ListItemEntry {
  id: string;
  text: string;
}

type RichBlock =
  | { kind: 'h1'; id: string; text: string }
  | { kind: 'h2'; id: string; text: string }
  | { kind: 'blockquote'; id: string; text: string }
  | { kind: 'p'; id: string; text: string }
  | { kind: 'ul'; id: string; items: ListItemEntry[] }
  | { kind: 'ol'; id: string; items: ListItemEntry[] };

const VIEW_MODES: ReadonlyArray<{ mode: RichTextViewMode; label: string }> = [
  { mode: 'write', label: 'Write' },
  { mode: 'split', label: 'Split' },
  { mode: 'preview', label: 'Preview' },
];

const MAX_INLINE_DEPTH = 6;

/**
 * Finds the matching closing ')' for a markdown link/image URL starting at `openParenIndex`,
 * supporting balanced nested parentheses such as `javascript:alert(1)` or Wikipedia URLs.
 */
function findClosingParen(input: string, openParenIndex: number): number {
  let depth = 1;
  for (let i = openParenIndex + 1; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '\n' || ch === '\r') return -1;
    if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Neutralizes unsafe protocol schemes (e.g. javascript:, vbscript:, data:text/html)
 * inside markdown link and image expressions using a single linear pass.
 */
function sanitizeMarkdownUrls(input: string): string {
  let out = '';
  let i = 0;
  const len = input.length;

  while (i < len) {
    const isImage = input[i] === '!' && input[i + 1] === '[';
    const isLink = input[i] === '[';

    if (isImage || isLink) {
      const labelStart = isImage ? i + 2 : i + 1;
      const closeBracket = input.indexOf(']', labelStart);
      if (closeBracket !== -1 && input[closeBracket + 1] === '(') {
        const closeParen = findClosingParen(input, closeBracket + 1);
        if (closeParen !== -1) {
          const label = input.slice(labelStart, closeBracket);
          const rawUrl = input.slice(closeBracket + 2, closeParen).trim();
          const safeUrl = sanitizeUrl(rawUrl, isImage);

          if (safeUrl) {
            out += isImage ? `![${label}](${safeUrl})` : `[${label}](${safeUrl})`;
          } else if (rawUrl.includes(':')) {
            out += isImage ? '' : label;
          } else {
            out += input.slice(i, closeParen + 1);
          }
          i = closeParen + 1;
          continue;
        }
      }
    }

    out += input.charAt(i);
    i += 1;
  }

  return out;
}

function sanitizeRichContent(raw: string): string {
  return sanitizeMarkdownUrls(sanitizeHtml(raw));
}

function unescapeAttrQuotes(value: string): string {
  return value.replace(/&quot;/g, '"');
}

function extractHtmlAttr(tagAttrs: string, attrName: string): string {
  const lower = tagAttrs.toLowerCase();
  const needle = `${attrName.toLowerCase()}="`;
  const idx = lower.indexOf(needle);
  if (idx === -1) return '';

  const valueStart = idx + needle.length;
  const endQuote = tagAttrs.indexOf('"', valueStart);
  if (endQuote === -1) return '';
  return unescapeAttrQuotes(tagAttrs.slice(valueStart, endQuote));
}

/**
 * Normalizes allowlisted HTML block tags into line-oriented blocks so both HTML
 * and markdown inputs render through one unified, safe AST pipeline.
 */
function normalizeBlockHtmlToLines(sanitized: string): string {
  const normalized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let out = '';
  let i = 0;
  const len = normalized.length;
  let activeList: 'ul' | 'ol' | null = null;
  let orderedIndex = 1;

  while (i < len) {
    if (normalized[i] === '<') {
      const closeIdx = normalized.indexOf('>', i + 1);
      if (closeIdx !== -1) {
        const inside = normalized.slice(i + 1, closeIdx).trim();
        const isClosing = inside.startsWith('/');
        const cleanInside = isClosing ? inside.slice(1).trim() : inside;
        const spaceIdx = cleanInside.search(/[\s/]/);
        const tag = (spaceIdx === -1 ? cleanInside : cleanInside.slice(0, spaceIdx)).toLowerCase();

        if (tag === 'br') {
          out += '\n';
          i = closeIdx + 1;
          continue;
        }
        if (tag === 'ul') {
          activeList = isClosing ? null : 'ul';
          out += '\n';
          i = closeIdx + 1;
          continue;
        }
        if (tag === 'ol') {
          activeList = isClosing ? null : 'ol';
          orderedIndex = 1;
          out += '\n';
          i = closeIdx + 1;
          continue;
        }
        if (tag === 'li') {
          if (!isClosing) {
            if (activeList === 'ol') {
              out += `\n${orderedIndex}. `;
              orderedIndex += 1;
            } else {
              out += '\n- ';
            }
          } else {
            out += '\n';
          }
          i = closeIdx + 1;
          continue;
        }
        if (tag === 'h1') {
          out += isClosing ? '\n' : '\n# ';
          i = closeIdx + 1;
          continue;
        }
        if (tag === 'h2' || tag === 'h3') {
          out += isClosing ? '\n' : '\n## ';
          i = closeIdx + 1;
          continue;
        }
        if (tag === 'blockquote') {
          out += isClosing ? '\n' : '\n> ';
          i = closeIdx + 1;
          continue;
        }
        if (tag === 'p') {
          out += '\n';
          i = closeIdx + 1;
          continue;
        }
      }
    }

    out += normalized.charAt(i);
    i += 1;
  }

  return out;
}

function isOrderedListPrefix(line: string): { text: string } | null {
  let digits = 0;
  while (digits < line.length) {
    const code = line.charCodeAt(digits);
    if (code >= 48 && code <= 57) {
      digits += 1;
    } else {
      break;
    }
  }
  if (digits > 0 && line[digits] === '.' && line[digits + 1] === ' ') {
    return { text: line.slice(digits + 2) };
  }
  return null;
}

function parseRichBlocks(sanitized: string): RichBlock[] {
  const expanded = normalizeBlockHtmlToLines(sanitized);
  const lines = expanded.split('\n');
  const blocks: RichBlock[] = [];
  let blockSeq = 0;
  let itemSeq = 0;
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i] as string;
    const trimmed = rawLine.trim();

    if (trimmed.length === 0) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blockSeq += 1;
      blocks.push({ kind: 'h2', id: `blk-${blockSeq}`, text: trimmed.slice(3) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blockSeq += 1;
      blocks.push({ kind: 'h1', id: `blk-${blockSeq}`, text: trimmed.slice(2) });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length) {
        const candidate = (lines[i] as string).trim();
        if (!candidate.startsWith('> ')) break;
        quoteLines.push(candidate.slice(2));
        i += 1;
      }
      blockSeq += 1;
      blocks.push({ kind: 'blockquote', id: `blk-${blockSeq}`, text: quoteLines.join(' ') });
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: ListItemEntry[] = [];
      while (i < lines.length) {
        const candidate = (lines[i] as string).trim();
        if (!candidate.startsWith('- ') && !candidate.startsWith('* ')) break;
        itemSeq += 1;
        items.push({ id: `li-${itemSeq}`, text: candidate.slice(2) });
        i += 1;
      }
      blockSeq += 1;
      blocks.push({ kind: 'ul', id: `blk-${blockSeq}`, items });
      continue;
    }

    const orderedStart = isOrderedListPrefix(trimmed);
    if (orderedStart) {
      const items: ListItemEntry[] = [];
      while (i < lines.length) {
        const candidate = (lines[i] as string).trim();
        const parsed = isOrderedListPrefix(candidate);
        if (!parsed) break;
        itemSeq += 1;
        items.push({ id: `oli-${itemSeq}`, text: parsed.text });
        i += 1;
      }
      blockSeq += 1;
      blocks.push({ kind: 'ol', id: `blk-${blockSeq}`, items });
      continue;
    }

    blockSeq += 1;
    blocks.push({ kind: 'p', id: `blk-${blockSeq}`, text: rawLine });
    i += 1;
  }

  return blocks;
}

function parseInlineNodes(source: string, prefix: string, depth = 0): InlineNode[] {
  const nodes: InlineNode[] = [];
  if (depth > MAX_INLINE_DEPTH) {
    return [{ kind: 'text', key: `${prefix}-max`, value: source }];
  }

  let i = 0;
  let seq = 0;
  let textBuf = '';
  const len = source.length;

  const flushText = () => {
    if (textBuf.length > 0) {
      seq += 1;
      nodes.push({ kind: 'text', key: `${prefix}-t-${seq}`, value: textBuf });
      textBuf = '';
    }
  };

  while (i < len) {
    const ch = source.charAt(i);

    // 1. Safe allowlisted inline HTML tags
    if (ch === '<') {
      const closeBracket = source.indexOf('>', i + 1);
      if (closeBracket !== -1) {
        const rawInside = source.slice(i + 1, closeBracket).trim();
        const spaceIdx = rawInside.search(/[\s/]/);
        const tag = (spaceIdx === -1 ? rawInside : rawInside.slice(0, spaceIdx)).toLowerCase();
        const attrs = spaceIdx === -1 ? '' : rawInside.slice(spaceIdx);

        if (tag === 'img') {
          const safeSrc = sanitizeUrl(extractHtmlAttr(attrs, 'src'), true);
          const safeAlt = extractHtmlAttr(attrs, 'alt');
          if (safeSrc) {
            flushText();
            seq += 1;
            nodes.push({ kind: 'image', key: `${prefix}-img-${seq}`, src: safeSrc, alt: safeAlt });
          }
          i = closeBracket + 1;
          continue;
        }

        if (
          tag === 'strong' ||
          tag === 'b' ||
          tag === 'em' ||
          tag === 'i' ||
          tag === 'u' ||
          tag === 'code' ||
          tag === 'a'
        ) {
          const closeToken = `</${tag}>`;
          const closePos = source.toLowerCase().indexOf(closeToken, closeBracket + 1);
          if (closePos !== -1) {
            const inner = source.slice(closeBracket + 1, closePos);
            flushText();
            seq += 1;
            const nodeKey = `${prefix}-${tag}-${seq}`;

            if (tag === 'strong' || tag === 'b') {
              nodes.push({
                kind: 'strong',
                key: nodeKey,
                children: parseInlineNodes(inner, nodeKey, depth + 1),
              });
            } else if (tag === 'em' || tag === 'i') {
              nodes.push({
                kind: 'em',
                key: nodeKey,
                children: parseInlineNodes(inner, nodeKey, depth + 1),
              });
            } else if (tag === 'u') {
              nodes.push({
                kind: 'u',
                key: nodeKey,
                children: parseInlineNodes(inner, nodeKey, depth + 1),
              });
            } else if (tag === 'code') {
              nodes.push({ kind: 'code', key: nodeKey, value: inner });
            } else {
              const safeHref = sanitizeUrl(extractHtmlAttr(attrs, 'href'), false);
              if (safeHref) {
                nodes.push({
                  kind: 'link',
                  key: nodeKey,
                  href: safeHref,
                  label: inner || safeHref,
                });
              } else {
                nodes.push({ kind: 'text', key: nodeKey, value: inner });
              }
            }

            i = closePos + closeToken.length;
            continue;
          }
        }
      }
    }

    // 2. Markdown image ![alt](url)
    if (ch === '!' && source[i + 1] === '[') {
      const closeBracket = source.indexOf(']', i + 2);
      if (closeBracket !== -1 && source[closeBracket + 1] === '(') {
        const closeParen = findClosingParen(source, closeBracket + 1);
        if (closeParen !== -1) {
          const alt = source.slice(i + 2, closeBracket);
          const rawSrc = source.slice(closeBracket + 2, closeParen).trim();
          const safeSrc = sanitizeUrl(rawSrc, true);
          flushText();
          if (safeSrc) {
            seq += 1;
            nodes.push({ kind: 'image', key: `${prefix}-mimg-${seq}`, src: safeSrc, alt });
          }
          i = closeParen + 1;
          continue;
        }
      }
    }

    // 3. Markdown link [label](url)
    if (ch === '[') {
      const closeBracket = source.indexOf(']', i + 1);
      if (closeBracket !== -1 && source[closeBracket + 1] === '(') {
        const closeParen = findClosingParen(source, closeBracket + 1);
        if (closeParen !== -1) {
          const label = source.slice(i + 1, closeBracket);
          const rawHref = source.slice(closeBracket + 2, closeParen).trim();
          const safeHref = sanitizeUrl(rawHref, false);
          flushText();
          seq += 1;
          if (safeHref) {
            nodes.push({
              kind: 'link',
              key: `${prefix}-mlnk-${seq}`,
              href: safeHref,
              label: label || safeHref,
            });
          } else {
            nodes.push({ kind: 'text', key: `${prefix}-mtxt-${seq}`, value: label });
          }
          i = closeParen + 1;
          continue;
        }
      }
    }

    // 4. Markdown bold **text**
    if (ch === '*' && source[i + 1] === '*') {
      const closeBold = source.indexOf('**', i + 2);
      if (closeBold > i + 2) {
        const inner = source.slice(i + 2, closeBold);
        flushText();
        seq += 1;
        const nodeKey = `${prefix}-mb-${seq}`;
        nodes.push({
          kind: 'strong',
          key: nodeKey,
          children: parseInlineNodes(inner, nodeKey, depth + 1),
        });
        i = closeBold + 2;
        continue;
      }
    }

    // 5. Markdown italic *text*
    if (ch === '*') {
      const closeItalic = source.indexOf('*', i + 1);
      if (closeItalic > i + 1) {
        const inner = source.slice(i + 1, closeItalic);
        flushText();
        seq += 1;
        const nodeKey = `${prefix}-mi-${seq}`;
        nodes.push({
          kind: 'em',
          key: nodeKey,
          children: parseInlineNodes(inner, nodeKey, depth + 1),
        });
        i = closeItalic + 1;
        continue;
      }
    }

    // 6. Markdown inline code `code`
    if (ch === '`') {
      const closeCode = source.indexOf('`', i + 1);
      if (closeCode > i + 1) {
        flushText();
        seq += 1;
        nodes.push({
          kind: 'code',
          key: `${prefix}-mc-${seq}`,
          value: source.slice(i + 1, closeCode),
        });
        i = closeCode + 1;
        continue;
      }
    }

    textBuf += ch;
    i += 1;
  }

  flushText();
  return nodes;
}

function renderInlineNodes(nodes: ReadonlyArray<InlineNode>): ReactNode {
  return nodes.map((node) => {
    switch (node.kind) {
      case 'text':
        return <span key={node.key}>{node.value}</span>;
      case 'strong':
        return (
          <strong key={node.key} className="font-semibold text-slate-950 dark:text-white">
            {renderInlineNodes(node.children)}
          </strong>
        );
      case 'em':
        return (
          <em key={node.key} className="italic">
            {renderInlineNodes(node.children)}
          </em>
        );
      case 'u':
        return (
          <u key={node.key} className="underline underline-offset-2">
            {renderInlineNodes(node.children)}
          </u>
        );
      case 'code':
        return (
          <code
            key={node.key}
            className="prism-crystal rounded-md px-1.5 py-0.5 text-xs font-mono text-slate-900 dark:text-slate-100"
          >
            {node.value}
          </code>
        );
      case 'link':
        return (
          <a
            key={node.key}
            href={node.href}
            rel="noopener noreferrer"
            className="text-[var(--prism-info-main)] dark:text-[var(--prism-secondary-main)] underline underline-offset-2 hover:opacity-80 prism-focus-ring rounded"
          >
            {node.label}
          </a>
        );
      case 'image':
        return (
          <img
            key={node.key}
            src={node.src}
            alt={node.alt}
            className="max-w-full rounded-xl border border-[var(--prism-well-border)] my-1.5 inline-block"
          />
        );
    }
  });
}

function stripBlockPrefix(line: string): string {
  if (line.startsWith('## ')) return line.slice(3);
  if (line.startsWith('# ')) return line.slice(2);
  if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('> ')) {
    return line.slice(2);
  }
  const ordered = isOrderedListPrefix(line);
  if (ordered) return ordered.text;
  return line;
}

function stripAllFormatting(input: string): string {
  const lines = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const strippedLines = lines.map((line) => stripBlockPrefix(line));
  const joined = strippedLines.join('\n');

  // Remove HTML tags linearly and unwrap markdown links/images & emphasis markers
  let noTags = '';
  let inTag = false;
  for (let i = 0; i < joined.length; i += 1) {
    const ch = joined.charAt(i);
    if (ch === '<') {
      inTag = true;
      continue;
    }
    if (ch === '>' && inTag) {
      inTag = false;
      continue;
    }
    if (!inTag) {
      noTags += ch;
    }
  }

  let plain = '';
  let i = 0;
  while (i < noTags.length) {
    const isImg = noTags[i] === '!' && noTags[i + 1] === '[';
    const isLnk = noTags[i] === '[';
    if (isImg || isLnk) {
      const start = isImg ? i + 2 : i + 1;
      const closeBracket = noTags.indexOf(']', start);
      if (closeBracket !== -1 && noTags[closeBracket + 1] === '(') {
        const closeParen = findClosingParen(noTags, closeBracket + 1);
        if (closeParen !== -1) {
          plain += noTags.slice(start, closeBracket);
          i = closeParen + 1;
          continue;
        }
      }
    }
    if (noTags[i] === '*' && noTags[i + 1] === '*') {
      i += 2;
      continue;
    }
    if (noTags[i] === '*' || noTags[i] === '`') {
      i += 1;
      continue;
    }
    plain += noTags.charAt(i);
    i += 1;
  }

  return plain;
}

function RichTextEditorInner({
  value,
  defaultValue = '',
  onChange,
  label,
  placeholder = 'Write with rich formatting or markdown...',
  readOnly = false,
  showPreview = true,
  className,
  style,
  xstyle,
  id,
  ref,
  ...rest
}: RichTextEditorProps) {
  const generatedId = useId();
  const editorId = id ?? generatedId;
  const override = useComponentOverride('RichTextEditor');

  const sanitizedDefault = useMemo(() => sanitizeRichContent(defaultValue), [defaultValue]);

  const [rawContent, setRawContent] = useControllableState<string>({
    value,
    defaultValue: sanitizedDefault,
    onChange,
  });

  const content = useMemo(() => sanitizeRichContent(rawContent), [rawContent]);

  const [viewMode, setViewMode] = useState<RichTextViewMode>('split');
  const [activePopover, setActivePopover] = useState<PopoverKind>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);

  const effectiveViewMode: RichTextViewMode = showPreview ? viewMode : 'write';

  useEffect(() => {
    const pending = pendingSelectionRef.current;
    const el = textareaRef.current;
    if (pending && el) {
      pendingSelectionRef.current = null;
      el.focus();
      el.setSelectionRange(pending.start, pending.end);
    }
  }, [content]);

  const emitSanitized = useCallback(
    (nextRaw: string, nextSelection?: { start: number; end: number }) => {
      if (readOnly) return;
      const clean = sanitizeRichContent(nextRaw);
      if (nextSelection) {
        pendingSelectionRef.current = nextSelection;
      }
      setRawContent(clean);
    },
    [readOnly, setRawContent]
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      emitSanitized(event.target.value);
    },
    [emitSanitized]
  );

  const getSelectionRange = useCallback((): { start: number; end: number } => {
    const el = textareaRef.current;
    if (!el) {
      return { start: content.length, end: content.length };
    }
    return {
      start: el.selectionStart,
      end: el.selectionEnd,
    };
  }, [content.length]);

  const applyInlineWrap = useCallback(
    (prefix: string, suffix: string, fallbackText: string) => {
      const { start, end } = getSelectionRange();
      const before = content.slice(0, start);
      const selected = content.slice(start, end);
      const after = content.slice(end);

      if (
        selected.length > prefix.length + suffix.length &&
        selected.startsWith(prefix) &&
        selected.endsWith(suffix)
      ) {
        const unwrapped = selected.slice(prefix.length, selected.length - suffix.length);
        emitSanitized(`${before}${unwrapped}${after}`, {
          start,
          end: start + unwrapped.length,
        });
        return;
      }

      const inner = selected.length > 0 ? selected : fallbackText;
      const inserted = `${prefix}${inner}${suffix}`;
      emitSanitized(`${before}${inserted}${after}`, {
        start: start + prefix.length,
        end: start + prefix.length + inner.length,
      });
    },
    [content, emitSanitized, getSelectionRange]
  );

  const applyLinePrefix = useCallback(
    (prefix: string, ordered = false) => {
      const { start, end } = getSelectionRange();
      const lineStart = start === 0 ? 0 : content.lastIndexOf('\n', start - 1) + 1;
      const nextNewline = content.indexOf('\n', end);
      const lineEnd = nextNewline === -1 ? content.length : nextNewline;

      const segment = content.slice(lineStart, lineEnd);
      const lines = segment.split('\n');
      let index = 0;
      const transformed = lines.map((line) => {
        index += 1;
        if (ordered) {
          const existingOrdered = isOrderedListPrefix(line);
          if (existingOrdered) {
            return existingOrdered.text;
          }
          return `${index}. ${stripBlockPrefix(line)}`;
        }
        if (line.startsWith(prefix)) {
          return line.slice(prefix.length);
        }
        return `${prefix}${stripBlockPrefix(line)}`;
      });

      const nextSegment = transformed.join('\n');
      const nextContent = `${content.slice(0, lineStart)}${nextSegment}${content.slice(lineEnd)}`;
      emitSanitized(nextContent, {
        start: lineStart,
        end: lineStart + nextSegment.length,
      });
    },
    [content, emitSanitized, getSelectionRange]
  );

  const handleClearFormatting = useCallback(() => {
    const { start, end } = getSelectionRange();
    if (start !== end) {
      const cleanedSelection = stripAllFormatting(content.slice(start, end));
      emitSanitized(`${content.slice(0, start)}${cleanedSelection}${content.slice(end)}`, {
        start,
        end: start + cleanedSelection.length,
      });
      return;
    }
    const cleanedAll = stripAllFormatting(content);
    emitSanitized(cleanedAll, { start: cleanedAll.length, end: cleanedAll.length });
  }, [content, emitSanitized, getSelectionRange]);

  const openLinkPopover = useCallback(() => {
    if (activePopover === 'link') {
      setActivePopover(null);
      return;
    }
    const { start, end } = getSelectionRange();
    setLinkLabel(content.slice(start, end));
    setLinkUrl('');
    setLinkError(null);
    setActivePopover('link');
  }, [activePopover, content, getSelectionRange]);

  const openImagePopover = useCallback(() => {
    if (activePopover === 'image') {
      setActivePopover(null);
      return;
    }
    setImageUrl('');
    setImageAlt('');
    setImageError(null);
    setActivePopover('image');
  }, [activePopover]);

  const handleInsertLink = useCallback(() => {
    const safeUrl = sanitizeUrl(linkUrl, false);
    if (!safeUrl) {
      setLinkError(
        'Unsafe or invalid URL rejected. Use https://, http://, mailto:, relative paths, or # anchors.'
      );
      return;
    }
    const { start, end } = getSelectionRange();
    const displayLabel = linkLabel.trim() || safeUrl;
    const snippet = `[${displayLabel}](${safeUrl})`;
    const nextContent = `${content.slice(0, start)}${snippet}${content.slice(end)}`;
    emitSanitized(nextContent, { start: start + snippet.length, end: start + snippet.length });
    setLinkUrl('');
    setLinkLabel('');
    setLinkError(null);
    setActivePopover(null);
  }, [content, emitSanitized, getSelectionRange, linkLabel, linkUrl]);

  const handleInsertImage = useCallback(() => {
    const safeSrc = sanitizeUrl(imageUrl, true);
    if (!safeSrc) {
      setImageError(
        'Unsafe or invalid image URL rejected. Use https://, http://, relative paths, or safe raster data:image URIs.'
      );
      return;
    }
    const { start, end } = getSelectionRange();
    const cleanAlt = imageAlt.trim().replace(/[\r\n[\]]/g, '');
    const snippet = `![${cleanAlt}](${safeSrc})`;
    const nextContent = `${content.slice(0, start)}${snippet}${content.slice(end)}`;
    emitSanitized(nextContent, { start: start + snippet.length, end: start + snippet.length });
    setImageUrl('');
    setImageAlt('');
    setImageError(null);
    setActivePopover(null);
  }, [content, emitSanitized, getSelectionRange, imageAlt, imageUrl]);

  const handleViewTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentMode: RichTextViewMode) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const idx = VIEW_MODES.findIndex((item) => item.mode === currentMode);
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextItem = VIEW_MODES[(idx + delta + VIEW_MODES.length) % VIEW_MODES.length];
      if (nextItem) {
        setViewMode(nextItem.mode);
      }
    },
    []
  );

  const parsedBlocks = useMemo(() => parseRichBlocks(content), [content]);

  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [content]);

  const charCount = content.length;

  const merged = mergeProps({
    themeTarget: themeProps('rich-text-editor', {
      readOnly,
      viewMode: effectiveViewMode,
      preview: showPreview,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 flex flex-col gap-3 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const toolbarClass = stableClassName('rich-text-editor', 'toolbar');
  const previewClass = stableClassName('rich-text-editor', 'preview');

  const toolbarBtnClass =
    'prism-focus-ring inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer enabled:hover:bg-slate-900/5 dark:enabled:hover:bg-white/10 disabled:opacity-45 disabled:cursor-not-allowed transition-colors';

  return (
    <div ref={ref} {...rest} {...merged}>
      {label || showPreview ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {label ? (
            <label
              htmlFor={editorId}
              className="text-xs font-semibold text-slate-800 dark:text-slate-100 tracking-tight"
            >
              {label}
            </label>
          ) : (
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Rich Text Editor
            </span>
          )}

          {showPreview ? (
            <div
              role="tablist"
              aria-label="Editor view mode"
              className="prism-well p-1 rounded-full inline-flex items-center gap-1"
            >
              {VIEW_MODES.map(({ mode, label: modeLabel }) => {
                const selected = effectiveViewMode === mode;
                const Icon = mode === 'write' ? PenLine : mode === 'split' ? Columns2 : Eye;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setViewMode(mode)}
                    onKeyDown={(e) => handleViewTabKeyDown(e, mode)}
                    className={cx(
                      'prism-focus-ring px-3 py-1 rounded-full inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors',
                      selected
                        ? 'prism-crystal text-slate-950 dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                    )}
                  >
                    <Icon aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>{modeLabel}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        role="toolbar"
        aria-label="Formatting toolbar"
        className={cx(
          toolbarClass,
          'prism-crystal rounded-full px-2.5 py-1.5 flex flex-wrap items-center gap-1'
        )}
      >
        <button
          type="button"
          aria-label="Bold"
          disabled={readOnly}
          onClick={() => applyInlineWrap('**', '**', 'bold text')}
          className={toolbarBtnClass}
        >
          <Bold aria-hidden="true" className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          aria-label="Italic"
          disabled={readOnly}
          onClick={() => applyInlineWrap('*', '*', 'italic text')}
          className={toolbarBtnClass}
        >
          <Italic aria-hidden="true" className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          aria-label="Underline"
          disabled={readOnly}
          onClick={() => applyInlineWrap('<u>', '</u>', 'underlined text')}
          className={toolbarBtnClass}
        >
          <Underline aria-hidden="true" className="w-3.5 h-3.5" />
        </button>

        <span aria-hidden="true" className="w-px h-4 bg-[var(--prism-divider)] mx-0.5" />

        <button
          type="button"
          aria-label="Heading 1"
          disabled={readOnly}
          onClick={() => applyLinePrefix('# ')}
          className={toolbarBtnClass}
        >
          <Heading1 aria-hidden="true" className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          aria-label="Heading 2"
          disabled={readOnly}
          onClick={() => applyLinePrefix('## ')}
          className={toolbarBtnClass}
        >
          <Heading2 aria-hidden="true" className="w-3.5 h-3.5" />
        </button>

        <span aria-hidden="true" className="w-px h-4 bg-[var(--prism-divider)] mx-0.5" />

        <button
          type="button"
          aria-label="Bullet list"
          disabled={readOnly}
          onClick={() => applyLinePrefix('- ')}
          className={toolbarBtnClass}
        >
          <List aria-hidden="true" className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          aria-label="Numbered list"
          disabled={readOnly}
          onClick={() => applyLinePrefix('1. ', true)}
          className={toolbarBtnClass}
        >
          <ListOrdered aria-hidden="true" className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          aria-label="Blockquote"
          disabled={readOnly}
          onClick={() => applyLinePrefix('> ')}
          className={toolbarBtnClass}
        >
          <Quote aria-hidden="true" className="w-3.5 h-3.5" />
        </button>

        <span aria-hidden="true" className="w-px h-4 bg-[var(--prism-divider)] mx-0.5" />

        <button
          type="button"
          aria-label="Insert link"
          aria-expanded={!readOnly && activePopover === 'link'}
          disabled={readOnly}
          onClick={openLinkPopover}
          className={cx(
            toolbarBtnClass,
            !readOnly && activePopover === 'link' && 'prism-well font-semibold'
          )}
        >
          <Link2 aria-hidden="true" className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          aria-label="Insert image"
          aria-expanded={!readOnly && activePopover === 'image'}
          disabled={readOnly}
          onClick={openImagePopover}
          className={cx(
            toolbarBtnClass,
            !readOnly && activePopover === 'image' && 'prism-well font-semibold'
          )}
        >
          <ImageIcon aria-hidden="true" className="w-3.5 h-3.5" />
        </button>

        <span aria-hidden="true" className="w-px h-4 bg-[var(--prism-divider)] mx-0.5" />

        <button
          type="button"
          aria-label="Clear formatting"
          disabled={readOnly}
          onClick={handleClearFormatting}
          className={toolbarBtnClass}
        >
          <RemoveFormatting aria-hidden="true" className="w-3.5 h-3.5" />
        </button>
      </div>

      {!readOnly && activePopover === 'link' ? (
        <div
          role="dialog"
          aria-label="Insert link"
          className="prism-crystal rounded-2xl p-3 flex flex-col gap-2.5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              aria-label="Link URL"
              value={linkUrl}
              placeholder="https://example.com"
              onChange={(e) => {
                setLinkUrl(e.target.value);
                if (linkError) setLinkError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleInsertLink();
                } else if (e.key === 'Escape') {
                  setActivePopover(null);
                }
              }}
              className="prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            <input
              type="text"
              aria-label="Link text"
              value={linkLabel}
              placeholder="Link label (optional)"
              onChange={(e) => setLinkLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleInsertLink();
                } else if (e.key === 'Escape') {
                  setActivePopover(null);
                }
              }}
              className="prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {linkError ? (
            <p
              role="alert"
              className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
            >
              <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>{linkError}</span>
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActivePopover(null)}
              className="prism-well prism-focus-ring h-8 px-3 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsertLink}
              className="prism-btn-primary prism-focus-ring h-8 px-4 rounded-full text-xs font-semibold cursor-pointer"
            >
              Apply link
            </button>
          </div>
        </div>
      ) : null}

      {!readOnly && activePopover === 'image' ? (
        <div
          role="dialog"
          aria-label="Insert image"
          className="prism-crystal rounded-2xl p-3 flex flex-col gap-2.5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              aria-label="Image URL"
              value={imageUrl}
              placeholder="https://example.com/prism.png"
              onChange={(e) => {
                setImageUrl(e.target.value);
                if (imageError) setImageError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleInsertImage();
                } else if (e.key === 'Escape') {
                  setActivePopover(null);
                }
              }}
              className="prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            <input
              type="text"
              aria-label="Image alt text"
              value={imageAlt}
              placeholder="Alternative text description"
              onChange={(e) => setImageAlt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleInsertImage();
                } else if (e.key === 'Escape') {
                  setActivePopover(null);
                }
              }}
              className="prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {imageError ? (
            <p
              role="alert"
              className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
            >
              <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>{imageError}</span>
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActivePopover(null)}
              className="prism-well prism-focus-ring h-8 px-3 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsertImage}
              className="prism-btn-primary prism-focus-ring h-8 px-4 rounded-full text-xs font-semibold cursor-pointer"
            >
              Apply image
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={cx(
          'grid gap-3',
          effectiveViewMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {effectiveViewMode !== 'preview' ? (
          <div className="prism-well rounded-2xl p-1">
            <textarea
              ref={textareaRef}
              id={editorId}
              aria-label={label ?? 'Rich text editor'}
              value={content}
              placeholder={placeholder}
              readOnly={readOnly}
              aria-readonly={readOnly || undefined}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || readOnly) return;
                if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                  const lower = e.key.toLowerCase();
                  if (lower === 'b') {
                    e.preventDefault();
                    applyInlineWrap('**', '**', 'bold text');
                  } else if (lower === 'i') {
                    e.preventDefault();
                    applyInlineWrap('*', '*', 'italic text');
                  } else if (lower === 'u') {
                    e.preventDefault();
                    applyInlineWrap('<u>', '</u>', 'underlined text');
                  }
                }
              }}
              className={cx(
                'prism-focus-ring w-full min-h-[200px] rounded-[14px] bg-transparent px-3.5 py-3 text-sm leading-6 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none block focus:outline-none disabled:cursor-not-allowed',
                readOnly && 'cursor-not-allowed opacity-75'
              )}
            />
          </div>
        ) : null}

        {showPreview && effectiveViewMode !== 'write' ? (
          <div
            role="region"
            aria-label="Rich text preview"
            className={cx(
              previewClass,
              'prism-well rounded-2xl px-4 py-3.5 min-h-[200px] text-sm leading-6 text-slate-800 dark:text-slate-100 space-y-2.5 overflow-auto'
            )}
          >
            {parsedBlocks.length === 0 ? (
              <p className="text-xs italic text-slate-400 dark:text-slate-500">
                Nothing to preview yet.
              </p>
            ) : (
              parsedBlocks.map((block) => {
                switch (block.kind) {
                  case 'h1':
                    return (
                      <h1
                        key={block.id}
                        className="text-xl font-bold tracking-tight text-slate-950 dark:text-white"
                      >
                        {renderInlineNodes(parseInlineNodes(block.text, block.id))}
                      </h1>
                    );
                  case 'h2':
                    return (
                      <h2
                        key={block.id}
                        className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50"
                      >
                        {renderInlineNodes(parseInlineNodes(block.text, block.id))}
                      </h2>
                    );
                  case 'blockquote':
                    return (
                      <blockquote
                        key={block.id}
                        className="border-l-2 border-[var(--prism-secondary-main)] pl-3.5 py-1 italic text-slate-600 dark:text-slate-300"
                      >
                        {renderInlineNodes(parseInlineNodes(block.text, block.id))}
                      </blockquote>
                    );
                  case 'ul':
                    return (
                      <ul key={block.id} className="list-disc pl-5 space-y-1">
                        {block.items.map((item) => (
                          <li key={item.id}>
                            {renderInlineNodes(parseInlineNodes(item.text, item.id))}
                          </li>
                        ))}
                      </ul>
                    );
                  case 'ol':
                    return (
                      <ol key={block.id} className="list-decimal pl-5 space-y-1">
                        {block.items.map((item) => (
                          <li key={item.id}>
                            {renderInlineNodes(parseInlineNodes(item.text, item.id))}
                          </li>
                        ))}
                      </ol>
                    );
                  case 'p':
                    return (
                      <p key={block.id}>
                        {renderInlineNodes(parseInlineNodes(block.text, block.id))}
                      </p>
                    );
                }
              })
            )}
          </div>
        ) : null}
      </div>

      <div
        aria-label="Document statistics"
        className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--prism-divider)] text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400"
      >
        <div className="flex items-center gap-3">
          <span data-metric="words">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
          <span data-metric="characters">
            {charCount} {charCount === 1 ? 'char' : 'chars'}
          </span>
        </div>
        {readOnly ? (
          <span className="prism-well rounded-full px-2.5 py-0.5 text-[11px] font-medium">
            Read-only
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const RichTextEditor = memo(RichTextEditorInner);
RichTextEditor.displayName = 'RichTextEditor';
