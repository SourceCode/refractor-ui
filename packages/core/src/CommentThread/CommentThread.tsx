'use client';

import {
  Fragment,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  CheckCircle2,
  MessageSquare,
  Reply,
  RotateCcw,
  Send,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface CommentReaction {
  /** Emoji glyph representing the reaction. */
  emoji: string;
  /** Number of users who applied this reaction. */
  count: number;
  /** Whether the current user has reacted with this emoji. */
  reacted?: boolean;
}

export interface CommentAuthor {
  /** Unique identifier for the author. */
  id: string;
  /** Display name rendered in the comment header. */
  name: string;
  /** Optional role badge (e.g., 'Design Systems', 'Staff Engineer'). */
  role?: string;
  /** Optional portrait URL validated through sanitizeUrl before rendering. */
  avatarSrc?: string;
}

export interface CommentItem {
  /** Unique identifier for the comment node. */
  id: string;
  /** Comment author metadata. */
  author: CommentAuthor;
  /** Plain-text comment body supporting safe @mention highlighting. */
  body: string;
  /** Human-readable relative or absolute timestamp. */
  timestamp: string;
  /** Optional emoji reactions attached to this comment. */
  reactions?: readonly CommentReaction[];
  /** Optional nested reply comments. */
  replies?: readonly CommentItem[];
  /** Whether a root discussion thread has been resolved. */
  resolved?: boolean;
}

export interface MentionUser {
  /** Unique identifier for the mentionable teammate. */
  id: string;
  /** Handle inserted after '@' (without leading '@'). */
  handle: string;
  /** Display name shown in the mention autocomplete listbox. */
  name: string;
  /** Optional role subtitle shown in the autocomplete option. */
  role?: string;
}

export interface CommentThreadProps extends BaseProps<HTMLDivElement> {
  /** Controlled comment tree. */
  comments?: readonly CommentItem[];
  /** Initial comment tree in uncontrolled mode. */
  defaultComments?: readonly CommentItem[];
  /** Fired whenever comments, replies, reactions, or resolved states change. */
  onCommentsChange?: (next: CommentItem[]) => void;
  /** Author identity applied to newly submitted comments and replies. */
  currentUser?: CommentAuthor;
  /** Directory of teammates suggested when typing '@' in composers. */
  mentionUsers?: readonly MentionUser[];
  /** Quick-add reaction emojis offered on each comment (defaults to ['👍', '✨', '🚀', '👀']). */
  availableReactions?: readonly string[];
  /** Fired when a new root comment or nested reply is submitted. */
  onAddComment?: (body: string, parentId?: string) => void;
  /** Fired when a reaction emoji is toggled on a comment. */
  onToggleReaction?: (commentId: string, emoji: string) => void;
  /** Fired when a root thread's resolved state is toggled. */
  onToggleResolve?: (commentId: string) => void;
  /** Maximum nesting depth rendered and permitted for replies (clamped 1..6, defaults to 3). */
  maxDepth?: number;
  /** Placeholder text for the main comment composer. */
  placeholder?: string;
  /** Disables composers, replies, reactions, and resolve toggles when true. */
  readOnly?: boolean;
  /** Heading title for the discussion thread (defaults to 'Discussion Thread'). */
  title?: string;
}

const DEFAULT_AVAILABLE_REACTIONS: readonly string[] = ['👍', '✨', '🚀', '👀'];
const DEFAULT_CURRENT_USER: CommentAuthor = { id: 'current-user', name: 'You' };
const EMPTY_MENTION_USERS: readonly MentionUser[] = [];
const MENTION_SPLIT_RE = /(@[A-Za-z0-9._-]{1,32})/g;
const MENTION_EXACT_RE = /^@[A-Za-z0-9._-]{1,32}$/;

interface BodySegment {
  key: string;
  text: string;
  isMention: boolean;
}

interface ActiveMention {
  start: number;
  end: number;
  query: string;
  key: string;
}

function parseBodyWithMentions(commentId: string, body: string): BodySegment[] {
  const parts = body.split(MENTION_SPLIT_RE);
  const segments: BodySegment[] = [];
  let offset = 0;
  for (const part of parts) {
    if (part.length === 0) continue;
    segments.push({
      key: `${commentId}-seg-${offset}`,
      text: part,
      isMention: MENTION_EXACT_RE.test(part),
    });
    offset += part.length;
  }
  return segments;
}

function getAuthorInitials(name: string): string {
  const [firstToken, secondToken] = name.trim().split(/\s+/).filter(Boolean);
  if (!firstToken) return '?';
  if (!secondToken) return firstToken.slice(0, 2).toUpperCase();
  return `${firstToken.charAt(0)}${secondToken.charAt(0)}`.toUpperCase();
}

function extractActiveMention(text: string, cursorPos: number): ActiveMention | null {
  const boundedCursor = Math.min(Math.max(0, cursorPos), text.length);
  const beforeCursor = text.slice(0, boundedCursor);
  if (!/(?:^|\s)@[A-Za-z0-9._-]{0,32}$/.test(beforeCursor)) {
    return null;
  }
  const start = beforeCursor.lastIndexOf('@');
  const query = beforeCursor.slice(start + 1);
  return { start, end: boundedCursor, query, key: `${start}:${query}` };
}

function countVisibleComments(
  nodes: readonly CommentItem[],
  depth: number,
  maxDepth: number
): number {
  let total = 0;
  for (const node of nodes) {
    total += 1;
    if (depth < maxDepth && node.replies && node.replies.length > 0) {
      total += countVisibleComments(node.replies, depth + 1, maxDepth);
    }
  }
  return total;
}

function appendReplyToTree(
  nodes: readonly CommentItem[],
  parentId: string,
  reply: CommentItem
): CommentItem[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        replies: [...(node.replies ?? []), reply],
      };
    }
    if (node.replies && node.replies.length > 0) {
      return {
        ...node,
        replies: appendReplyToTree(node.replies, parentId, reply),
      };
    }
    return node;
  });
}

function toggleReactionOnList(
  reactions: readonly CommentReaction[] | undefined,
  emoji: string
): CommentReaction[] {
  const existing = reactions ?? [];
  const found = existing.find((entry) => entry.emoji === emoji);
  if (!found) {
    return [...existing, { emoji, count: 1, reacted: true }];
  }
  const nextReactions: CommentReaction[] = [];
  for (const entry of existing) {
    if (entry.emoji !== emoji) {
      nextReactions.push(entry);
    } else if (entry.reacted) {
      const nextCount = entry.count - 1;
      if (nextCount > 0) {
        nextReactions.push({ ...entry, count: nextCount, reacted: false });
      }
    } else {
      nextReactions.push({ ...entry, count: entry.count + 1, reacted: true });
    }
  }
  return nextReactions;
}

function toggleReactionInTree(
  nodes: readonly CommentItem[],
  commentId: string,
  emoji: string
): CommentItem[] {
  return nodes.map((node) => {
    if (node.id === commentId) {
      return {
        ...node,
        reactions: toggleReactionOnList(node.reactions, emoji),
      };
    }
    if (node.replies && node.replies.length > 0) {
      return {
        ...node,
        replies: toggleReactionInTree(node.replies, commentId, emoji),
      };
    }
    return node;
  });
}

function toggleResolveInTree(
  nodes: readonly CommentItem[],
  commentId: string
): CommentItem[] {
  return nodes.map((node) =>
    node.id === commentId ? { ...node, resolved: !node.resolved } : node
  );
}

interface CommentAvatarProps {
  author: CommentAuthor;
}

function CommentAvatar({ author }: CommentAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const safeSrc = author.avatarSrc ? sanitizeUrl(author.avatarSrc, true) : '';
  const showImage = Boolean(safeSrc) && failedSrc !== safeSrc;
  const initials = getAuthorInitials(author.name);
  const accessibleName = author.name.trim() || 'Anonymous';

  return (
    <span className="prism-crystal w-8 h-8 rounded-full p-0.5 inline-flex items-center justify-center overflow-hidden shrink-0">
      {showImage ? (
        <img
          src={safeSrc}
          alt={accessibleName}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(safeSrc)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span
          role="img"
          aria-label={accessibleName}
          className="prism-well w-full h-full rounded-full flex items-center justify-center text-[11px] font-semibold tracking-tight"
          style={STYLE_TEXT_PRIMARY}
        >
          {initials}
        </span>
      )}
    </span>
  );
}

interface MentionComposerProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: (trimmedBody: string) => void;
  onCancel?: () => void;
  placeholder: string;
  submitLabel: string;
  ariaLabel: string;
  mentionUsers: readonly MentionUser[];
  disabled: boolean;
}

function MentionComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  submitLabel,
  ariaLabel,
  mentionUsers,
  disabled,
}: MentionComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listboxId = useId();
  const [cursorPos, setCursorPos] = useState(value.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const activeMention = useMemo(
    () => (disabled ? null : extractActiveMention(value, cursorPos)),
    [disabled, value, cursorPos]
  );

  const filteredMentions = useMemo(() => {
    if (!activeMention || activeMention.key === dismissedKey || mentionUsers.length === 0) {
      return [];
    }
    const query = activeMention.query.toLowerCase();
    return mentionUsers.filter(
      (user) =>
        user.handle.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query)
    );
  }, [activeMention, dismissedKey, mentionUsers]);

  const clampedIndex =
    filteredMentions.length > 0 ? activeIndex % filteredMentions.length : 0;

  const insertMention = (user: MentionUser, mention: ActiveMention) => {
    const inserted = `@${user.handle} `;
    const nextValue =
      value.slice(0, mention.start) + inserted + value.slice(mention.end);
    const nextCursor = mention.start + inserted.length;
    onChange(nextValue);
    setCursorPos(nextCursor);
    setActiveIndex(0);
    setDismissedKey(null);
    textareaRef.current?.focus();
  };

  const submitCurrent = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setCursorPos(0);
    setActiveIndex(0);
    setDismissedKey(null);
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitCurrent();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (activeMention && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length
        );
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedUser = filteredMentions[clampedIndex];
        if (selectedUser) {
          insertMention(selectedUser, activeMention);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDismissedKey(activeMention.key);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitCurrent();
      return;
    }

    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  const canSubmit = !disabled && value.trim().length > 0;

  return (
    <form onSubmit={handleFormSubmit} className="relative space-y-2">
      <div className="prism-well rounded-2xl p-2.5">
        <textarea
          ref={textareaRef}
          rows={2}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-expanded={filteredMentions.length > 0}
          aria-controls={filteredMentions.length > 0 ? listboxId : undefined}
          placeholder={placeholder}
          onChange={(e) => {
            const nextVal = e.target.value;
            onChange(nextVal);
            setCursorPos(e.target.selectionStart);
            setActiveIndex(0);
            setDismissedKey(null);
          }}
          onKeyDown={handleKeyDown}
          className="prism-focus-ring w-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={STYLE_TEXT_PRIMARY}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          {onCancel ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onCancel}
              className="prism-crystal prism-focus-ring h-8 px-3 rounded-full text-xs font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              style={STYLE_TEXT_SECONDARY}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={!canSubmit}
            className="prism-btn-primary prism-focus-ring h-8 px-4 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          >
            <Send aria-hidden="true" className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">{submitLabel}</span>
          </button>
        </div>
      </div>

      {activeMention && filteredMentions.length > 0 ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Mention suggestions"
          className="prism-slab absolute left-0 right-0 z-30 p-1.5 space-y-1 max-h-52 overflow-y-auto"
        >
          {filteredMentions.map((user, idx) => {
            const isSelected = idx === clampedIndex;
            return (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertMention(user, activeMention)}
                className={`prism-focus-ring w-full px-3 py-2 rounded-xl text-left flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                  isSelected ? 'prism-crystal font-semibold' : ''
                }`}
                style={STYLE_TEXT_PRIMARY}
              >
                <span className="min-w-0 flex items-center gap-2 truncate">
                  <span
                    className="font-mono font-semibold"
                    style={STYLE_PRIMARY_MAIN}
                  >
                    @{user.handle}
                  </span>
                  <span className="truncate">{user.name}</span>
                </span>
                {user.role ? (
                  <span
                    className="text-[11px] shrink-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {user.role}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </form>
  );
}

function CommentThreadInner({
  comments,
  defaultComments,
  onCommentsChange,
  currentUser = DEFAULT_CURRENT_USER,
  mentionUsers = EMPTY_MENTION_USERS,
  availableReactions = DEFAULT_AVAILABLE_REACTIONS,
  onAddComment,
  onToggleReaction,
  onToggleResolve,
  maxDepth = 3,
  placeholder = 'Add a comment... Use @ to mention teammates',
  readOnly = false,
  title = 'Discussion Thread',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CommentThreadProps) {
  const override = useComponentOverride('CommentThread');
  const headingId = useId();
  const idSeqRef = useRef(1);

  const effectiveMaxDepth = Math.floor(clampNumber(maxDepth, 1, 6, 3));

  const controlledComments = useMemo(
    () => (comments !== undefined ? [...comments] : undefined),
    [comments]
  );
  const initialComments = useMemo(
    () => (defaultComments !== undefined ? [...defaultComments] : []),
    [defaultComments]
  );

  const [currentComments, setCurrentComments] = useControllableState<CommentItem[]>({
    value: controlledComments,
    defaultValue: initialComments,
    onChange: onCommentsChange,
  });

  const [mainDraft, setMainDraft] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const uniqueAvailableReactions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const emoji of availableReactions) {
      if (emoji && !seen.has(emoji)) {
        seen.add(emoji);
        out.push(emoji);
      }
    }
    return out;
  }, [availableReactions]);

  const totalCommentCount = useMemo(
    () => countVisibleComments(currentComments, 1, effectiveMaxDepth),
    [currentComments, effectiveMaxDepth]
  );

  const createCommentNode = (body: string): CommentItem => {
    const nextId = `comment-${idSeqRef.current}`;
    idSeqRef.current += 1;
    return {
      id: nextId,
      author: currentUser,
      body,
      timestamp: 'Just now',
      reactions: [],
      replies: [],
    };
  };

  const handleAddRootComment = (trimmedBody: string) => {
    const nextNode = createCommentNode(trimmedBody);
    setCurrentComments([...currentComments, nextNode]);
    onAddComment?.(trimmedBody);
    setMainDraft('');
    setAnnouncement('Comment added');
  };

  const handleAddReply = (parentId: string, trimmedBody: string) => {
    const nextReply = createCommentNode(trimmedBody);
    setCurrentComments(appendReplyToTree(currentComments, parentId, nextReply));
    onAddComment?.(trimmedBody, parentId);
    setReplyDraft('');
    setReplyingToId(null);
    setAnnouncement('Reply added');
  };

  const handleToggleReaction = (commentId: string, emoji: string) => {
    setCurrentComments(toggleReactionInTree(currentComments, commentId, emoji));
    onToggleReaction?.(commentId, emoji);
    setAnnouncement(`Toggled ${emoji} reaction`);
  };

  const handleToggleResolve = (comment: CommentItem) => {
    const nextResolved = !comment.resolved;
    setCurrentComments(toggleResolveInTree(currentComments, comment.id));
    onToggleResolve?.(comment.id);
    setAnnouncement(nextResolved ? 'Thread resolved' : 'Thread reopened');
  };

  const merged = mergeProps({
    themeTarget: themeProps('CommentThread', {
      count: totalCommentCount,
      readOnly: Boolean(readOnly),
      maxDepth: effectiveMaxDepth,
    }),
    baseClassName: 'prism-slab p-5 space-y-4 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const renderCommentNode = (comment: CommentItem, depth: number) => {
    const isRoot = depth === 1;
    const isResolved = Boolean(comment.resolved);
    const replyDisabled = Boolean(readOnly) || depth >= effectiveMaxDepth;
    const isReplying = replyingToId === comment.id && !replyDisabled;
    const existingReactions = comment.reactions ?? [];
    const existingEmojiSet = new Set<string>(existingReactions.map((entry) => entry.emoji));
    const quickAddEmojis = uniqueAvailableReactions.filter(
      (emoji) => !existingEmojiSet.has(emoji)
    );
    const bodySegments = parseBodyWithMentions(comment.id, comment.body);
    const visibleReplies =
      depth < effectiveMaxDepth && comment.replies && comment.replies.length > 0
        ? comment.replies
        : [];

    return (
      <article
        key={comment.id}
        data-comment-id={comment.id}
        data-depth={String(depth)}
        data-resolved={isRoot && isResolved ? 'true' : undefined}
        className={`prism-cv-card rounded-2xl p-4 transition-[color,background-color,border-color,opacity,transform] ${
          isRoot && isResolved ? 'prism-well opacity-85' : 'prism-crystal'
        }`}
      >
        <div className="flex items-start gap-3">
          <CommentAvatar author={comment.author} />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex flex-wrap items-center gap-2">
                <span
                  className="text-sm font-semibold truncate"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {comment.author.name}
                </span>
                {comment.author.role ? (
                  <span
                    className="prism-well px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {comment.author.role}
                  </span>
                ) : null}
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {comment.timestamp}
                </span>
                {isRoot && isResolved ? (
                  <span className="prism-emerald px-2 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 aria-hidden="true" className="w-3 h-3" />
                    <span>Resolved</span>
                  </span>
                ) : null}
              </div>

              {isRoot ? (
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleToggleResolve(comment)}
                  className="prism-crystal prism-focus-ring h-7 px-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {isResolved ? (
                    <>
                      <RotateCcw aria-hidden="true" className="w-3 h-3" />
                      <span>Reopen</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 aria-hidden="true" className="w-3 h-3" />
                      <span>Resolve</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>

            <p
              className="text-sm leading-relaxed whitespace-pre-wrap break-words"
              style={STYLE_TEXT_PRIMARY}
            >
              {bodySegments.map((segment) =>
                segment.isMention ? (
                  <span
                    key={segment.key}
                    data-mention="true"
                    className="prism-well inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-semibold"
                    style={STYLE_PRIMARY_MAIN}
                  >
                    {segment.text}
                  </span>
                ) : (
                  <Fragment key={segment.key}>{segment.text}</Fragment>
                )
              )}
            </p>

            <div
              data-testid={`comment-actions-${comment.id}`}
              className="flex flex-wrap items-center gap-1.5 pt-1"
            >
              {existingReactions.map((reaction) => {
                const isReacted = Boolean(reaction.reacted);
                return (
                  <button
                    key={`${comment.id}-rx-${reaction.emoji}`}
                    type="button"
                    disabled={readOnly}
                    aria-pressed={isReacted}
                    aria-label={`Toggle ${reaction.emoji} reaction (${reaction.count})`}
                    onClick={() => handleToggleReaction(comment.id, reaction.emoji)}
                    className={`${
                      isReacted ? 'prism-emerald' : 'prism-well'
                    } prism-focus-ring h-7 px-2.5 rounded-full text-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]`}
                    style={
                      isReacted ? undefined : STYLE_TEXT_PRIMARY
                    }
                  >
                    <span aria-hidden="true">{reaction.emoji}</span>
                    <span className="font-mono text-[11px] font-semibold tabular-nums">
                      {reaction.count}
                    </span>
                  </button>
                );
              })}

              {quickAddEmojis.map((emoji) => (
                <button
                  key={`${comment.id}-add-${emoji}`}
                  type="button"
                  disabled={readOnly}
                  aria-label={`Add ${emoji} reaction`}
                  onClick={() => handleToggleReaction(comment.id, emoji)}
                  className="prism-well prism-focus-ring h-7 w-7 rounded-full text-xs inline-flex items-center justify-center opacity-75 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed enabled:hover:opacity-100 transition-opacity"
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              ))}

              <button
                type="button"
                disabled={replyDisabled}
                aria-label={`Reply to ${comment.author.name}`}
                onClick={() => {
                  if (replyingToId === comment.id) {
                    setReplyingToId(null);
                    setReplyDraft('');
                  } else {
                    setReplyingToId(comment.id);
                    setReplyDraft('');
                  }
                }}
                className="prism-crystal prism-focus-ring h-7 px-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ml-auto cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                style={STYLE_TEXT_PRIMARY}
              >
                <Reply aria-hidden="true" className="w-3 h-3" />
                <span>Reply</span>
              </button>
            </div>

            {isReplying ? (
              <div className="pt-2">
                <MentionComposer
                  value={replyDraft}
                  onChange={setReplyDraft}
                  onSubmit={(body) => handleAddReply(comment.id, body)}
                  onCancel={() => {
                    setReplyingToId(null);
                    setReplyDraft('');
                  }}
                  placeholder={`Reply to ${comment.author.name}...`}
                  submitLabel="Reply"
                  ariaLabel={`Write a reply to ${comment.author.name}`}
                  mentionUsers={mentionUsers}
                  disabled={replyDisabled}
                />
              </div>
            ) : null}

            {visibleReplies.length > 0 ? (
              <div
                data-testid={`comment-replies-${comment.id}`}
                className="mt-3 ml-2 pl-4 space-y-3 border-l"
                style={STYLE_BORDER_DIVIDER}
              >
                {visibleReplies.map((reply) => renderCommentNode(reply, depth + 1))}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div ref={ref} aria-labelledby={headingId} {...rest} {...merged}>
      <header
        className="flex items-center justify-between gap-3 pb-3 border-b"
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="min-w-0 flex items-center gap-2">
          <MessageSquare
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={STYLE_PRIMARY_MAIN}
          />
          <h3
            id={headingId}
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {readOnly ? (
            <span
              className="prism-well px-2.5 py-0.5 rounded-full text-[11px] font-medium"
              style={STYLE_TEXT_SECONDARY}
            >
              Read only
            </span>
          ) : null}
          <span
            data-testid="comment-thread-count"
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold tabular-nums"
            style={STYLE_TEXT_SECONDARY}
          >
            {totalCommentCount}
          </span>
        </div>
      </header>

      <div className="space-y-3">
        {currentComments.length === 0 ? (
          <div
            data-testid="comment-thread-empty"
            className="prism-well rounded-2xl px-4 py-8 text-center text-xs"
            style={STYLE_TEXT_SECONDARY}
          >
            No comments yet. Start the discussion below.
          </div>
        ) : (
          currentComments.map((comment) => renderCommentNode(comment, 1))
        )}
      </div>

      <MentionComposer
        value={mainDraft}
        onChange={setMainDraft}
        onSubmit={handleAddRootComment}
        placeholder={placeholder}
        submitLabel="Post comment"
        ariaLabel="Add a comment"
        mentionUsers={mentionUsers}
        disabled={readOnly}
      />

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

export const CommentThread = /*#__PURE__*/ memoWithDisplayName(CommentThreadInner, 'CommentThread');
