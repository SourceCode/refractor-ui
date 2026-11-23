'use client';

import { memo, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  AtSign,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Circle,
  Info,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_BG_DIVIDER, STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type NotificationTone = 'info' | 'mention' | 'warning' | 'success';
export type NotificationCategory = 'alert' | 'mention' | 'system';
export type NotificationCenterMode = 'dropdown' | 'drawer' | 'inline';
export type NotificationFilterTab = 'all' | 'unread' | 'mentions';

export interface NotificationAction {
  /** Unique identifier for the quick action within this notification item. */
  id: string;
  /** Visible button label. */
  label: string;
  /** Optical button style ('primary' refractive capsule or 'crystal' shell). */
  tone?: 'primary' | 'crystal';
  /** Optional item-level callback invoked when the action is triggered. */
  onClick?: (item: NotificationItem) => void;
}

export interface NotificationItem {
  /** Unique notification identifier (duplicate IDs are cleanly deduplicated). */
  id: string;
  /** Concise notification headline. */
  title: string;
  /** Body summary explaining the activity or alert. */
  message: string;
  /** Human-readable relative or absolute timestamp. */
  timestamp: string;
  /** Semantic category used for filtering ('alert' | 'mention' | 'system'). */
  category?: NotificationCategory;
  /** Visual accent tone ('info' | 'mention' | 'warning' | 'success'). */
  tone?: NotificationTone;
  /** Read state; defaults to false (unread). */
  read?: boolean;
  /** Optional teammate or service actor attribution. */
  actor?: string;
  /** Optional inline quick-action buttons attached to the notification. */
  actions?: readonly NotificationAction[];
}

type NotificationCenterBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface NotificationCenterProps extends NotificationCenterBaseProps {
  /** Controlled notification list. */
  items?: readonly NotificationItem[];
  /** Initial notification list for uncontrolled mode. */
  defaultItems?: readonly NotificationItem[];
  /** Fired whenever the notification list changes (read toggles, mark all read, or dismiss). */
  onItemsChange?: (next: NotificationItem[]) => void;
  /** Fired when an individual notification's read state is toggled. */
  onMarkRead?: (id: string, read: boolean) => void;
  /** Fired when all unread notifications are marked as read. */
  onMarkAllRead?: () => void;
  /** Fired when a notification is dismissed. */
  onDismiss?: (id: string) => void;
  /** Fired when an inline notification quick action is activated. */
  onActionClick?: (item: NotificationItem, actionId: string) => void;
  /** Presentation layout ('dropdown' | 'drawer' | 'inline', defaults to 'dropdown'). */
  mode?: NotificationCenterMode;
  /** Controlled open visibility state for dropdown and drawer modes. */
  open?: boolean;
  /** Initial open visibility state for uncontrolled dropdown and drawer modes. */
  defaultOpen?: boolean;
  /** Fired when panel open state changes in dropdown or drawer modes. */
  onOpenChange?: (open: boolean) => void;
  /** Panel heading title (defaults to 'Activity & Notifications'). */
  title?: string;
  /** Accessible and visible label for the trigger capsule (defaults to 'Notifications'). */
  triggerLabel?: string;
  /** Empty-state message displayed when no notifications match the current view. */
  emptyMessage?: string;
}

interface ToneVisual {
  icon: ReactNode;
  token: string;
}

function deduplicateNotifications(
  list: readonly NotificationItem[] | undefined
): NotificationItem[] {
  if (!list || list.length === 0) return [];
  const seen = new Set<string>();
  const unique: NotificationItem[] = [];
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  }
  return unique;
}

function isMentionItem(item: NotificationItem): boolean {
  return item.category === 'mention' || item.tone === 'mention';
}

function getToneVisual(tone: NotificationTone): ToneVisual {
  switch (tone) {
    case 'mention':
      return {
        icon: <AtSign aria-hidden="true" className="w-4 h-4 shrink-0" />,
        token: 'var(--prism-primary-main)',
      };
    case 'warning':
      return {
        icon: <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0" />,
        token: 'var(--prism-warning-main)',
      };
    case 'success':
      return {
        icon: <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />,
        token: 'var(--prism-success-main)',
      };
    case 'info':
    default:
      return {
        icon: <Info aria-hidden="true" className="w-4 h-4 shrink-0" />,
        token: 'var(--prism-info-main)',
      };
  }
}

function NotificationCenterInner({
  items,
  defaultItems,
  onItemsChange,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onActionClick,
  mode = 'dropdown',
  open,
  defaultOpen = false,
  onOpenChange,
  title = 'Activity & Notifications',
  triggerLabel = 'Notifications',
  emptyMessage = 'You are all caught up.',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: NotificationCenterProps) {
  const override = useComponentOverride('NotificationCenter');
  const titleId = useId();
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(ref, containerRef);

  const controlledItems = useMemo(
    () => (items !== undefined ? deduplicateNotifications(items) : undefined),
    [items]
  );
  const initialItems = useMemo(
    () => deduplicateNotifications(defaultItems),
    [defaultItems]
  );

  const [currentItems, setCurrentItems] = useControllableState<NotificationItem[]>({
    value: controlledItems,
    defaultValue: initialItems,
    onChange: onItemsChange,
  });

  const [currentOpen, setCurrentOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [activeFilter, setActiveFilter] = useState<NotificationFilterTab>('all');
  const [announcement, setAnnouncement] = useState('');

  const isPanelOpen = mode === 'inline' ? true : currentOpen;

  const unreadCount = useMemo(
    () => currentItems.filter((item) => !item.read).length,
    [currentItems]
  );

  const mentionsCount = useMemo(
    () => currentItems.filter((item) => isMentionItem(item)).length,
    [currentItems]
  );

  const filteredItems = useMemo(() => {
    if (activeFilter === 'unread') {
      return currentItems.filter((item) => !item.read);
    }
    if (activeFilter === 'mentions') {
      return currentItems.filter((item) => isMentionItem(item));
    }
    return currentItems;
  }, [activeFilter, currentItems]);

  useEffect(() => {
    if (mode === 'inline' || !currentOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCurrentOpen(false);
        setAnnouncement('Notifications panel closed');
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const rootEl = containerRef.current;
      if (rootEl && event.target instanceof Node && !rootEl.contains(event.target)) {
        setCurrentOpen(false);
        setAnnouncement('Notifications panel closed');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [mode, currentOpen, setCurrentOpen]);

  const handleToggleOpen = () => {
    const nextOpen = !currentOpen;
    setCurrentOpen(nextOpen);
    setAnnouncement(nextOpen ? 'Notifications panel opened' : 'Notifications panel closed');
  };

  const handleClosePanel = () => {
    setCurrentOpen(false);
    setAnnouncement('Notifications panel closed');
  };

  const handleToggleRead = (item: NotificationItem) => {
    const nextRead = !item.read;
    const nextItems = currentItems.map((entry) =>
      entry.id === item.id ? { ...entry, read: nextRead } : entry
    );
    setCurrentItems(nextItems);
    onMarkRead?.(item.id, nextRead);
    setAnnouncement(`Marked ${item.title} as ${nextRead ? 'read' : 'unread'}`);
  };

  const handleMarkAllRead = () => {
    const nextItems = currentItems.map((entry) =>
      entry.read ? entry : { ...entry, read: true }
    );
    setCurrentItems(nextItems);
    onMarkAllRead?.();
    setAnnouncement('All notifications marked as read');
  };

  const handleDismiss = (item: NotificationItem) => {
    const nextItems = currentItems.filter((entry) => entry.id !== item.id);
    setCurrentItems(nextItems);
    onDismiss?.(item.id);
    setAnnouncement(`Dismissed ${item.title}`);
  };

  const handleAction = (item: NotificationItem, action: NotificationAction) => {
    action.onClick?.(item);
    onActionClick?.(item, action.id);
    setAnnouncement(`Activated ${action.label} for ${item.title}`);
  };

  const filterTabs: ReadonlyArray<{
    id: NotificationFilterTab;
    label: string;
    count: number;
  }> = [
    { id: 'all', label: 'All', count: currentItems.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'mentions', label: 'Mentions', count: mentionsCount },
  ];

  const merged = mergeProps({
    themeTarget: themeProps('NotificationCenter', {
      mode,
      open: isPanelOpen,
      unreadCount,
      empty: currentItems.length === 0,
    }),
    baseClassName: mode === 'inline' ? 'w-full' : 'relative inline-block',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const panelBody = (
    <>
      <header
        className="flex items-center justify-between gap-3 pb-3 border-b"
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="min-w-0 flex items-center gap-2">
          <h3
            id={titleId}
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h3>
          <span
            data-testid="notification-header-unread"
            className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {unreadCount} unread
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={handleMarkAllRead}
            className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_PRIMARY}
          >
            <CheckCheck aria-hidden="true" className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>

          {mode !== 'inline' ? (
            <button
              type="button"
              aria-label="Close notifications"
              onClick={handleClosePanel}
              className="prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer transition-colors"
              style={STYLE_TEXT_SECONDARY}
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Filter notifications"
        className="prism-well p-1 rounded-full grid grid-cols-3 gap-1"
      >
        {filterTabs.map((tab) => {
          const selected = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveFilter(tab.id)}
              className={`prism-focus-ring h-8 px-2.5 rounded-full text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-[color,background-color,border-color,opacity,transform] ${
                selected ? 'prism-crystal font-semibold' : ''
              }`}
              style={{
                color: selected ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
              }}
            >
              <span>{tab.label}</span>
              <span
                data-testid={`notification-tab-count-${tab.id}`}
                className="font-mono text-[11px] tabular-nums opacity-85"
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 max-h-96 overflow-y-auto space-y-2 pr-0.5">
        {filteredItems.length === 0 ? (
          <div
            data-testid="notification-empty-state"
            className="prism-well rounded-2xl px-4 py-10 text-center text-xs"
            style={STYLE_TEXT_SECONDARY}
          >
            {emptyMessage}
          </div>
        ) : (
          <ul role="list" className="space-y-2">
            {filteredItems.map((item) => {
              const tone: NotificationTone = item.tone ?? 'info';
              const toneVisual = getToneVisual(tone);
              const isRead = Boolean(item.read);

              return (
                <li
                  key={item.id}
                  data-notification-id={item.id}
                  data-read={isRead ? 'true' : 'false'}
                  data-tone={tone}
                  className={`prism-cv-item rounded-2xl p-3.5 transition-[color,background-color,border-color,opacity,transform] ${
                    isRead ? 'prism-well opacity-80' : 'prism-crystal'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 w-8 h-8 rounded-full prism-well inline-flex items-center justify-center shrink-0"
                      style={{ color: toneVisual.token }}
                    >
                      {toneVisual.icon}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-1.5">
                          {!isRead ? (
                            <span
                              aria-hidden="true"
                              data-testid={`notification-unread-dot-${item.id}`}
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: toneVisual.token }}
                            />
                          ) : null}
                          <p
                            className="text-sm font-semibold truncate"
                            style={STYLE_TEXT_PRIMARY}
                          >
                            {item.title}
                          </p>
                        </div>

                        <div className="inline-flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            data-action="toggle-read"
                            aria-label={
                              isRead
                                ? `Mark ${item.title} as unread`
                                : `Mark ${item.title} as read`
                            }
                            onClick={() => handleToggleRead(item)}
                            className="prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer transition-colors"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            {isRead ? (
                              <Circle aria-hidden="true" className="w-3.5 h-3.5" />
                            ) : (
                              <Check aria-hidden="true" className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            data-action="dismiss"
                            aria-label={`Dismiss ${item.title}`}
                            onClick={() => handleDismiss(item)}
                            className="prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer transition-colors"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            <X aria-hidden="true" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p
                        className="text-xs leading-relaxed break-words"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {item.message}
                      </p>

                      <div
                        className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {item.actor ? (
                          <span className="font-medium" style={STYLE_TEXT_PRIMARY}>
                            {item.actor}
                          </span>
                        ) : null}
                        <span className="font-mono tabular-nums">{item.timestamp}</span>
                      </div>

                      {item.actions && item.actions.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          {item.actions.map((action) => {
                            const isPrimary = action.tone === 'primary';
                            return (
                              <button
                                key={`${item.id}-${action.id}`}
                                type="button"
                                onClick={() => handleAction(item, action)}
                                className={`${
                                  isPrimary ? 'prism-btn-primary' : 'prism-crystal'
                                } prism-focus-ring h-7 px-3 rounded-full text-xs font-medium inline-flex items-center justify-center cursor-pointer`}
                                style={isPrimary ? undefined : STYLE_TEXT_PRIMARY}
                              >
                                <span className="relative z-10">{action.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      {mode !== 'inline' ? (
        <button
          type="button"
          aria-expanded={currentOpen}
          aria-haspopup={mode === 'drawer' ? 'dialog' : 'true'}
          aria-controls={currentOpen ? panelId : undefined}
          onClick={handleToggleOpen}
          className="prism-crystal prism-focus-ring h-10 px-4 rounded-full inline-flex items-center gap-2 text-sm font-medium cursor-pointer transition-transform"
          style={STYLE_TEXT_PRIMARY}
        >
          <Bell aria-hidden="true" className="w-4 h-4 shrink-0" />
          <span>{triggerLabel}</span>
          {unreadCount > 0 ? (
            <span
              data-testid="notification-unread-badge"
              className="prism-btn-primary px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums leading-none"
            >
              <span className="relative z-10">{unreadCount}</span>
            </span>
          ) : null}
        </button>
      ) : null}

      {mode === 'inline' ? (
        <section
          id={panelId}
          aria-labelledby={titleId}
          className="prism-slab p-4 flex flex-col gap-3 w-full"
        >
          {panelBody}
        </section>
      ) : null}

      {mode === 'dropdown' && currentOpen ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={titleId}
          className="prism-slab absolute right-0 mt-2.5 w-[min(24rem,calc(100vw-2rem))] sm:min-w-[320px] max-w-md p-4 flex flex-col gap-3 z-40"
        >
          {panelBody}
        </div>
      ) : null}

      {mode === 'drawer' && currentOpen ? (
        <div
          data-testid="notification-drawer-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClosePanel();
            }
          }}
          className="fixed inset-0 z-50 flex justify-end prism-backdrop-scrim"
          style={STYLE_BG_DIVIDER}
        >
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="prism-slab h-full w-full max-w-md rounded-l-[28px] rounded-r-none p-5 flex flex-col gap-3"
          >
            {panelBody}
          </div>
        </div>
      ) : null}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

export const NotificationCenter = memo(NotificationCenterInner);
NotificationCenter.displayName = 'NotificationCenter';
