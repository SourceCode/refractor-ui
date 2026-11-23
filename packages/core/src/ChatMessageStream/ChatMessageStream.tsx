'use client';

import { memo, useEffect, useMemo, useRef, useState, type ReactNode, type UIEvent } from 'react';
import { AlertCircle, ArrowDown, Info, MessageSquare } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { STYLE_BG_PRIMARY, STYLE_INFO_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ChatMessageRole = 'user' | 'assistant' | 'system';
export type ChatMessageStatus = 'sending' | 'sent' | 'error';

export interface ChatMessage {
  /** Unique message identifier (duplicate IDs are safely deduplicated). */
  id: string;
  /** Participant role controlling optical bubble surface and alignment. */
  role: ChatMessageRole;
  /** Optional display name shown in headers and used for initials fallback. */
  author?: string;
  /** Optional avatar image URL validated through sanitizeUrl before rendering. */
  avatarSrc?: string;
  /** Message body text rendered safely as plain text. */
  content: string;
  /** Optional human-readable timestamp displayed in tabular monospace. */
  timestamp?: string;
  /** Displays a live streaming pulse badge and typing caret when true. */
  streaming?: boolean;
  /** Delivery or generation state ('sending' | 'sent' | 'error'). */
  status?: ChatMessageStatus;
  /** Optional footer slot rendered beneath the message (e.g. CitationChip or ResponseActionBar). */
  footer?: ReactNode;
}

export interface ChatMessageStreamProps extends BaseProps<HTMLDivElement> {
  /** Ordered chat message entries (duplicate IDs are safely deduplicated). */
  messages: ReadonlyArray<ChatMessage>;
  /** Empty-state message displayed when no messages exist. */
  emptyMessage?: string;
  /** Maximum scrollable viewport height in pixels (clamped 180..900, defaults to 420). */
  maxHeightPx?: number;
  /** Automatically scroll to the newest message when the user is near the bottom (defaults to true). */
  autoScroll?: boolean;
  /** Accessible label for the conversation log region (defaults to 'Conversation stream'). */
  ariaLabel?: string;
}

const SCROLL_BOTTOM_THRESHOLD_PX = 48;

function deduplicateMessages(messages: ReadonlyArray<ChatMessage>): ChatMessage[] {
  const seen = new Set<string>();
  const unique: ChatMessage[] = [];
  for (const message of messages) {
    if (!seen.has(message.id)) {
      seen.add(message.id);
      unique.push(message);
    }
  }
  return unique;
}

function getAuthorInitials(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  const first = tokens[0];
  const second = tokens[1];
  if (!first) return 'AI';
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

interface AssistantAvatarProps {
  author: string;
  avatarSrc?: string;
}

function AssistantAvatar({ author, avatarSrc }: AssistantAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const safeSrc = avatarSrc ? sanitizeUrl(avatarSrc, true) : '';
  const showImage = Boolean(safeSrc) && failedSrc !== safeSrc;
  const accessibleName = author.trim() || 'Assistant';
  const initials = getAuthorInitials(author);

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

function scrollElementToBottom(el: HTMLDivElement, behavior: ScrollBehavior): void {
  if (typeof el.scrollTo === 'function') {
    el.scrollTo({ top: el.scrollHeight, behavior });
  } else {
    el.scrollTop = el.scrollHeight;
  }
}

function ChatMessageStreamInner({
  messages,
  emptyMessage = 'Start a conversation to see messages here.',
  maxHeightPx = 420,
  autoScroll = true,
  ariaLabel = 'Conversation stream',
  className,
  style,
  xstyle,
  onScroll,
  ref,
  ...rest
}: ChatMessageStreamProps) {
  const override = useComponentOverride('ChatMessageStream');
  const scrollRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(ref, scrollRef);
  const isNearBottomRef = useRef(true);
  const [showJumpButton, setShowJumpButton] = useState(false);

  const safeHeight = Math.round(clampNumber(maxHeightPx, 180, 900, 420));

  const uniqueMessages = useMemo(() => deduplicateMessages(messages), [messages]);
  const hasStreaming = useMemo(
    () => uniqueMessages.some((msg) => Boolean(msg.streaming)),
    [uniqueMessages]
  );

  const lastMessage = uniqueMessages[uniqueMessages.length - 1];
  const lastSignature = lastMessage
    ? `${lastMessage.id}:${lastMessage.content.length}:${Boolean(lastMessage.streaming)}`
    : '';

  useEffect(() => {
    const el = scrollRef.current;
    if (!autoScroll || !isNearBottomRef.current || !el) return;
    scrollElementToBottom(el, 'auto');
  }, [autoScroll, uniqueMessages.length, lastSignature]);

  const handleInternalScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD_PX;
    isNearBottomRef.current = nearBottom;
    setShowJumpButton(!nearBottom);
  };

  const handleJumpToLatest = () => {
    isNearBottomRef.current = true;
    setShowJumpButton(false);
    if (scrollRef.current) {
      scrollElementToBottom(scrollRef.current, 'smooth');
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('ChatMessageStream', {
      empty: uniqueMessages.length === 0,
      streaming: hasStreaming,
      count: uniqueMessages.length,
    }),
    baseClassName: 'prism-slab relative w-full overflow-y-auto p-4 space-y-3',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: { maxHeight: `${safeHeight}px` },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={mergedRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      {...rest}
      aria-label={ariaLabel}
      onScroll={composeEventHandlers(onScroll, handleInternalScroll)}
      {...merged}
    >
      {uniqueMessages.length === 0 ? (
        <div
          data-testid="chat-stream-empty"
          className="prism-well rounded-2xl px-4 py-10 flex flex-col items-center justify-center gap-2 text-center text-xs"
          style={STYLE_TEXT_SECONDARY}
        >
          <MessageSquare aria-hidden="true" className="w-5 h-5 opacity-75" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {uniqueMessages.map((msg) => {
            const isStreaming = Boolean(msg.streaming);
            const isError = msg.status === 'error';
            const isSending = msg.status === 'sending';

            if (msg.role === 'system') {
              return (
                <div
                  key={msg.id}
                  data-message-id={msg.id}
                  data-role="system"
                  data-status={msg.status}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className="prism-well rounded-full px-3.5 py-1.5 max-w-[88%] inline-flex items-center gap-2 text-xs text-center"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <Info
                      aria-hidden="true"
                      className="w-3.5 h-3.5 shrink-0"
                      style={STYLE_INFO_MAIN}
                    />
                    <span className="break-words">{msg.content}</span>
                    {msg.timestamp ? (
                      <span className="font-mono text-[10px] tabular-nums opacity-75 shrink-0">
                        {msg.timestamp}
                      </span>
                    ) : null}
                  </div>
                  {msg.footer ? (
                    <div data-testid={`message-footer-${msg.id}`} className="max-w-[88%]">
                      {msg.footer}
                    </div>
                  ) : null}
                </div>
              );
            }

            if (msg.role === 'user') {
              return (
                <article
                  key={msg.id}
                  data-message-id={msg.id}
                  data-role="user"
                  data-status={msg.status}
                  data-streaming={isStreaming ? 'true' : undefined}
                  className="flex flex-col items-end gap-1"
                >
                  {msg.author || msg.timestamp ? (
                    <div
                      className="flex items-center gap-2 px-1 text-[11px]"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {msg.author ? (
                        <span
                          className="font-medium"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          {msg.author}
                        </span>
                      ) : null}
                      {msg.timestamp ? (
                        <span className="font-mono tabular-nums">{msg.timestamp}</span>
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    className="prism-crystal rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[82%] border-[1.5px]"
                    style={{
                      borderColor: isError
                        ? 'var(--prism-error-main)'
                        : 'var(--prism-primary-main)',
                      color: 'var(--prism-text-primary)',
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                      {isStreaming ? (
                        <span
                          data-testid={`stream-caret-${msg.id}`}
                          aria-hidden="true"
                          className="inline-block w-1.5 h-4 ml-1 align-middle rounded-xs animate-pulse motion-reduce:animate-none"
                          style={STYLE_BG_PRIMARY}
                        />
                      ) : null}
                    </p>
                  </div>

                  {isSending ? (
                    <span
                      data-testid={`message-sending-${msg.id}`}
                      className="px-1 text-[11px] font-medium"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      Sending...
                    </span>
                  ) : null}

                  {isError ? (
                    <span
                      data-testid={`message-error-${msg.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{
                        backgroundColor: 'var(--prism-error-main)',
                        color: 'var(--prism-error-contrast)',
                      }}
                    >
                      <AlertCircle aria-hidden="true" className="w-3 h-3 shrink-0" />
                      <span>Delivery failed</span>
                    </span>
                  ) : null}

                  {msg.footer ? (
                    <div data-testid={`message-footer-${msg.id}`} className="pt-0.5 max-w-[82%]">
                      {msg.footer}
                    </div>
                  ) : null}
                </article>
              );
            }

            const assistantName = msg.author ?? 'Assistant';

            return (
              <article
                key={msg.id}
                data-message-id={msg.id}
                data-role="assistant"
                data-status={msg.status}
                data-streaming={isStreaming ? 'true' : undefined}
                className="prism-cv-item flex items-start gap-2.5 max-w-[88%]"
              >
                <AssistantAvatar author={assistantName} avatarSrc={msg.avatarSrc} />

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div
                    className="flex flex-wrap items-center gap-2 text-[11px]"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <span
                      className="font-semibold"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {assistantName}
                    </span>
                    {msg.timestamp ? (
                      <span className="font-mono tabular-nums">{msg.timestamp}</span>
                    ) : null}
                    {isStreaming ? (
                      <span
                        data-testid={`stream-indicator-${msg.id}`}
                        className="prism-emerald inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      >
                        <span
                          aria-hidden="true"
                          className="w-1.5 h-1.5 rounded-full animate-pulse motion-reduce:animate-none"
                          style={{ backgroundColor: 'var(--prism-success-contrast)' }}
                        />
                        <span>Streaming</span>
                      </span>
                    ) : null}
                    {isError ? (
                      <span
                        data-testid={`message-error-${msg.id}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: 'var(--prism-error-main)',
                          color: 'var(--prism-error-contrast)',
                        }}
                      >
                        <AlertCircle aria-hidden="true" className="w-3 h-3 shrink-0" />
                        <span>Error</span>
                      </span>
                    ) : null}
                  </div>

                  <div
                    className="prism-crystal rounded-2xl rounded-tl-sm px-4 py-3 border"
                    style={{
                      borderColor: isError ? 'var(--prism-error-main)' : 'var(--prism-divider)',
                      color: 'var(--prism-text-primary)',
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                      {isStreaming ? (
                        <span
                          data-testid={`stream-caret-${msg.id}`}
                          aria-hidden="true"
                          className="inline-block w-1.5 h-4 ml-1 align-middle rounded-xs animate-pulse motion-reduce:animate-none"
                          style={STYLE_BG_PRIMARY}
                        />
                      ) : null}
                    </p>
                  </div>

                  {msg.footer ? (
                    <div data-testid={`message-footer-${msg.id}`} className="pt-0.5">
                      {msg.footer}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showJumpButton && uniqueMessages.length > 0 ? (
        <div className="sticky bottom-1 flex justify-center pointer-events-none pt-1">
          <button
            type="button"
            onClick={handleJumpToLatest}
            className="pointer-events-auto prism-crystal prism-focus-ring h-8 px-3.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_PRIMARY}
          >
            <ArrowDown aria-hidden="true" className="w-3.5 h-3.5" />
            <span>Jump to latest</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export const ChatMessageStream = memo(ChatMessageStreamInner);
ChatMessageStream.displayName = 'ChatMessageStream';
