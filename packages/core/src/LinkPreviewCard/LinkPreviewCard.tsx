'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from 'react';
import {
  BookOpen,
  CircleDot,
  Clock,
  ExternalLink,
  FileText,
  GitBranch,
  User,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_BORDER_DIVIDER_TEXT_SECONDARY, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type LinkPreviewPlacement = 'top' | 'bottom';

export type LinkPreviewEntityKind = 'doc' | 'wiki' | 'issue' | 'repo' | 'external';

export interface LinkPreviewMetadata {
  /** Primary entity title rendered in the floating optical preview card. */
  title: string;
  /** Concise description clamped to two lines inside the preview card. */
  summary: string;
  /** Entity classification rendered as an optical badge and inline trigger icon. */
  kind?: LinkPreviewEntityKind;
  /** Optional relative or formatted last-updated timestamp (e.g. 'Updated 2h ago'). */
  updatedAt?: string;
  /** Optional author or owner attribution (e.g. 'Elena Vance'). */
  author?: string;
  /** Optional metadata tag labels rendered as compact optical glass pills. */
  tags?: ReadonlyArray<string>;
  /** Optional preview image URL sanitized via sanitizeUrl(thumbnailSrc, true). */
  thumbnailSrc?: string;
}

export interface LinkPreviewCardProps extends BaseProps<HTMLSpanElement> {
  /** Destination URL strictly sanitized via sanitizeUrl(href, false); unsafe schemes are blocked. */
  href: string;
  /** Visible inline anchor text. */
  label: string;
  /** Entity metadata displayed inside the floating prism-slab preview card. */
  preview: LinkPreviewMetadata;
  /** Vertical placement of the floating preview card ('top' | 'bottom', defaults to 'bottom'). */
  placement?: LinkPreviewPlacement;
  /** Controlled open state of the preview card. */
  open?: boolean;
  /** Initial open state when uncontrolled (defaults to false). */
  defaultOpen?: boolean;
  /** Callback invoked when the preview card open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Hover open delay in milliseconds, clamped 0..1000 (defaults to 120). */
  openDelayMs?: number;
  /** Hover close delay in milliseconds, clamped 0..1000 (defaults to 150). */
  closeDelayMs?: number;
  /** Opens safe links in a new browsing context with target="_blank" rel="noopener noreferrer" (defaults to false). */
  external?: boolean;
}

const DEFAULT_OPEN_DELAY_MS = 120;
const DEFAULT_CLOSE_DELAY_MS = 150;
const MIN_DELAY_MS = 0;
const MAX_DELAY_MS = 1000;

interface EntityKindConfig {
  badgeLabel: string;
  accentToken: string;
  renderIcon: (className: string) => ReactElement;
}

function getEntityKindConfig(kind: LinkPreviewEntityKind): EntityKindConfig {
  switch (kind) {
    case 'wiki':
      return {
        badgeLabel: 'Wiki',
        accentToken: 'var(--prism-secondary-dark)',
        renderIcon: (className) => <BookOpen aria-hidden="true" className={className} />,
      };
    case 'issue':
      return {
        badgeLabel: 'Issue',
        accentToken: 'var(--prism-warning-main)',
        renderIcon: (className) => <CircleDot aria-hidden="true" className={className} />,
      };
    case 'repo':
      return {
        badgeLabel: 'Repo',
        accentToken: 'var(--prism-success-main)',
        renderIcon: (className) => <GitBranch aria-hidden="true" className={className} />,
      };
    case 'external':
      return {
        badgeLabel: 'Link',
        accentToken: 'var(--prism-primary-main)',
        renderIcon: (className) => <ExternalLink aria-hidden="true" className={className} />,
      };
    case 'doc':
    default:
      return {
        badgeLabel: 'Doc',
        accentToken: 'var(--prism-info-main)',
        renderIcon: (className) => <FileText aria-hidden="true" className={className} />,
      };
  }
}

const triggerClass = /*#__PURE__*/ stableClassName('link-preview-card', 'trigger');
const bridgeClass = /*#__PURE__*/ stableClassName('link-preview-card', 'bridge');
const cardClass = /*#__PURE__*/ stableClassName('link-preview-card', 'card');
const thumbnailClass = /*#__PURE__*/ stableClassName('link-preview-card', 'thumbnail');
const headerClass = /*#__PURE__*/ stableClassName('link-preview-card', 'header');
const badgeClass = /*#__PURE__*/ stableClassName('link-preview-card', 'badge');
const titleClass = /*#__PURE__*/ stableClassName('link-preview-card', 'title');
const summaryClass = /*#__PURE__*/ stableClassName('link-preview-card', 'summary');
const metaClass = /*#__PURE__*/ stableClassName('link-preview-card', 'meta');
const tagsClass = /*#__PURE__*/ stableClassName('link-preview-card', 'tags');
const tagClass = /*#__PURE__*/ stableClassName('link-preview-card', 'tag');

function LinkPreviewCardInner({
  href,
  label,
  preview,
  placement = 'bottom',
  open,
  defaultOpen = false,
  onOpenChange,
  openDelayMs = DEFAULT_OPEN_DELAY_MS,
  closeDelayMs = DEFAULT_CLOSE_DELAY_MS,
  external = false,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onKeyDown,
  onClick,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: LinkPreviewCardProps) {
  const override = useComponentOverride('LinkPreviewCard');
  const dialogId = useId();
  const titleId = useId();
  const summaryId = useId();

  const containerRef = useRef<HTMLSpanElement>(null);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mergedRef = useMergedRefs(ref, containerRef);

  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const isOpenRef = useRef<boolean>(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const safeOpenDelayMs = Math.round(
    clampNumber(openDelayMs, MIN_DELAY_MS, MAX_DELAY_MS, DEFAULT_OPEN_DELAY_MS)
  );
  const safeCloseDelayMs = Math.round(
    clampNumber(closeDelayMs, MIN_DELAY_MS, MAX_DELAY_MS, DEFAULT_CLOSE_DELAY_MS)
  );

  const safeHref = sanitizeUrl(href, false);
  const hasSafeHref = safeHref.length > 0;
  const isInternalHref =
    hasSafeHref &&
    (safeHref.startsWith('#') ||
      safeHref.startsWith('/') ||
      safeHref.startsWith('./') ||
      safeHref.startsWith('../'));

  const resolvedKind: LinkPreviewEntityKind =
    preview.kind ?? (external ? 'external' : 'doc');
  const kindConfig = getEntityKindConfig(resolvedKind);

  const safeThumbnailSrc = preview.thumbnailSrc
    ? sanitizeUrl(preview.thumbnailSrc, true)
    : '';
  const hasSafeThumbnail = safeThumbnailSrc.length > 0;

  const trimmedSummary = preview.summary.trim();
  const hasSummary = trimmedSummary.length > 0;
  const trimmedAuthor = preview.author?.trim() ?? '';
  const trimmedUpdatedAt = preview.updatedAt?.trim() ?? '';
  const hasMetaRow = trimmedAuthor.length > 0 || trimmedUpdatedAt.length > 0;

  const visibleTags = useMemo(() => {
    if (!preview.tags || preview.tags.length === 0) return [];
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const rawTag of preview.tags) {
      const trimmed = rawTag.trim();
      if (trimmed.length > 0 && !seen.has(trimmed)) {
        seen.add(trimmed);
        cleaned.push(trimmed);
      }
    }
    return cleaned;
  }, [preview.tags]);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const commitOpen = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === isOpenRef.current) return;
      setIsOpen(nextOpen);
    },
    [setIsOpen]
  );

  const setOpenImmediate = useCallback(
    (nextOpen: boolean) => {
      clearTimers();
      commitOpen(nextOpen);
    },
    [clearTimers, commitOpen]
  );

  const scheduleOpen = useCallback(() => {
    clearTimers();
    if (isOpenRef.current) return;
    if (safeOpenDelayMs === 0) {
      commitOpen(true);
      return;
    }
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      commitOpen(true);
    }, safeOpenDelayMs);
  }, [clearTimers, commitOpen, safeOpenDelayMs]);

  const scheduleClose = useCallback(() => {
    clearTimers();
    if (!isOpenRef.current) return;
    if (safeCloseDelayMs === 0) {
      commitOpen(false);
      return;
    }
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      commitOpen(false);
    }, safeCloseDelayMs);
  }, [clearTimers, commitOpen, safeCloseDelayMs]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.key !== 'Escape') return;
      if (
        event.target instanceof Node &&
        containerRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpenImmediate(false);
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [isOpen, setOpenImmediate]);

  const handleAnchorClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (isInternalHref && !external) {
        event.preventDefault();
        setOpenImmediate(!isOpenRef.current);
      }
    },
    [external, isInternalHref, setOpenImmediate]
  );

  const handleUnsafeTriggerClick = useCallback(() => {
    setOpenImmediate(!isOpenRef.current);
  }, [setOpenImmediate]);

  const handleRootMouseEnter = composeEventHandlers(onMouseEnter, scheduleOpen);
  const handleRootMouseLeave = composeEventHandlers(onMouseLeave, scheduleClose);
  const handleRootFocus = composeEventHandlers(onFocus, () => {
    setOpenImmediate(true);
  });
  const handleRootBlur = composeEventHandlers(
    onBlur,
    (event: FocusEvent<HTMLSpanElement>) => {
      if (
        event.relatedTarget instanceof Node &&
        containerRef.current?.contains(event.relatedTarget)
      ) {
        return;
      }
      setOpenImmediate(false);
    }
  );
  const handleRootKeyDown = composeEventHandlers(
    onKeyDown,
    (event: ReactKeyboardEvent<HTMLSpanElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Escape' && isOpenRef.current) {
        event.preventDefault();
        setOpenImmediate(false);
        const triggerEl = hasSafeHref ? anchorRef.current : buttonRef.current;
        triggerEl?.focus();
      }
    }
  );
  const handleRootClick = composeEventHandlers(
    onClick,
    (event: MouseEvent<HTMLSpanElement>) => {
      if (!hasSafeHref || (isInternalHref && !external)) {
        return;
      }
      const triggerEl = anchorRef.current;
      if (
        event.defaultPrevented &&
        triggerEl &&
        event.target instanceof Node &&
        triggerEl.contains(event.target)
      ) {
        setOpenImmediate(!isOpenRef.current);
      }
    },
    false
  );

  const merged = mergeProps({
    themeTarget: themeProps('link-preview-card', {
      open: isOpen,
      placement,
      kind: resolvedKind,
      external: hasSafeHref && external,
      hasHref: hasSafeHref,
    }),
    baseClassName: 'relative inline-flex items-baseline max-w-full align-baseline',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const triggerClassName = cx(
    triggerClass,
    'prism-focus-ring inline-flex items-center gap-1 rounded-sm font-medium underline decoration-2 underline-offset-4 max-w-full cursor-pointer transition-opacity duration-150 hover:opacity-85'
  );

  const triggerStyle: CSSProperties = {
    color: 'var(--prism-text-primary)',
    textDecorationColor: 'var(--prism-primary-main)',
  };

  const triggerContent = (
    <>
      <span
        aria-hidden="true"
        className="inline-flex items-center shrink-0"
        style={{ color: kindConfig.accentToken }}
      >
        {kindConfig.renderIcon('w-3.5 h-3.5 shrink-0')}
      </span>
      <span className="truncate">{label}</span>
    </>
  );

  return (
    <span
      ref={mergedRef}
      {...rest}
      {...merged}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onFocus={handleRootFocus}
      onBlur={handleRootBlur}
      onKeyDown={handleRootKeyDown}
      onClick={handleRootClick}
    >
      {hasSafeHref ? (
        <a
          ref={anchorRef}
          href={safeHref}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? dialogId : undefined}
          onClick={handleAnchorClick}
          className={triggerClassName}
          style={triggerStyle}
        >
          {triggerContent}
        </a>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? dialogId : undefined}
          onClick={handleUnsafeTriggerClick}
          className={cx(triggerClassName, 'bg-transparent border-0 p-0 text-left')}
          style={triggerStyle}
        >
          {triggerContent}
        </button>
      )}

      {isOpen ? (
        <span
          data-testid="link-preview-bridge"
          data-placement={placement}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          className={cx(
            bridgeClass,
            'block absolute left-0 z-40',
            placement === 'top' ? 'bottom-full pb-2' : 'top-full pt-2'
          )}
        >
          <span
            id={dialogId}
            role="dialog"
            aria-labelledby={titleId}
            aria-describedby={hasSummary ? summaryId : undefined}
            className={cx(
              cardClass,
              'prism-slab block w-[min(20rem,calc(100vw-2rem))] p-3.5 text-left space-y-2.5'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {hasSafeThumbnail ? (
              <span
                className={cx(
                  thumbnailClass,
                  'prism-well block overflow-hidden rounded-xl border max-w-full'
                )}
                style={STYLE_BORDER_DIVIDER}
              >
                <img
                  src={safeThumbnailSrc}
                  alt={preview.title}
                  data-testid="link-preview-thumbnail"
                  loading="lazy"
                  className="block w-full max-w-full h-28 object-cover"
                />
              </span>
            ) : null}

            <span
              className={cx(
                headerClass,
                'flex items-center justify-between gap-2 max-w-full'
              )}
            >
              <span
                data-testid="link-preview-badge"
                data-kind={resolvedKind}
                className={cx(
                  badgeClass,
                  'prism-crystal inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide shrink-0'
                )}
                style={{ color: kindConfig.accentToken }}
              >
                {kindConfig.renderIcon('w-3 h-3 shrink-0')}
                <span>{kindConfig.badgeLabel}</span>
              </span>

              {hasSafeHref && external ? (
                <span
                  data-testid="link-preview-external-indicator"
                  className="inline-flex items-center gap-1 text-[11px] font-mono shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  <span>External</span>
                  <ExternalLink aria-hidden="true" className="w-3 h-3 shrink-0" />
                </span>
              ) : null}
            </span>

            <span
              id={titleId}
              data-testid="link-preview-title"
              className={cx(
                titleClass,
                'block text-sm font-semibold leading-snug break-words max-w-full'
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              {preview.title}
            </span>

            {hasSummary ? (
              <span
                id={summaryId}
                data-testid="link-preview-summary"
                className={cx(
                  summaryClass,
                  'block text-xs leading-relaxed break-words line-clamp-2 max-w-full'
                )}
                style={{
                  color: 'var(--prism-text-secondary)',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  lineClamp: 2,
                  overflow: 'hidden',
                }}
              >
                {preview.summary}
              </span>
            ) : null}

            {hasMetaRow ? (
              <span
                data-testid="link-preview-meta"
                className={cx(
                  metaClass,
                  'flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t text-[11px] max-w-full'
                )}
                style={STYLE_BORDER_DIVIDER_TEXT_SECONDARY}
              >
                {trimmedAuthor.length > 0 ? (
                  <span
                    data-testid="link-preview-author"
                    className="inline-flex items-center gap-1 min-w-0 max-w-full"
                  >
                    <User aria-hidden="true" className="w-3 h-3 shrink-0" />
                    <span className="truncate">{trimmedAuthor}</span>
                  </span>
                ) : null}
                {trimmedUpdatedAt.length > 0 ? (
                  <span
                    data-testid="link-preview-updated"
                    className="inline-flex items-center gap-1 font-mono tabular-nums min-w-0 max-w-full"
                  >
                    <Clock aria-hidden="true" className="w-3 h-3 shrink-0" />
                    <span className="truncate">{trimmedUpdatedAt}</span>
                  </span>
                ) : null}
              </span>
            ) : null}

            {visibleTags.length > 0 ? (
              <span
                data-testid="link-preview-tags"
                className={cx(tagsClass, 'flex flex-wrap items-center gap-1.5 max-w-full')}
              >
                {visibleTags.map((tag) => (
                  <span
                    key={tag}
                    data-testid="link-preview-tag"
                    className={cx(
                      tagClass,
                      'prism-well inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium max-w-full truncate'
                    )}
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {tag}
                  </span>
                ))}
              </span>
            ) : null}
          </span>
        </span>
      ) : null}
    </span>
  );
}

export const LinkPreviewCard = /*#__PURE__*/ memoWithDisplayName(LinkPreviewCardInner, 'LinkPreviewCard');
