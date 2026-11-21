import { useState } from 'react';
import {
  Archive,
  Compass,
  Home,
  Inbox,
  Pin,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import {
  BottomNavigationBar,
  CookieConsentBanner,
  KeycapBadge,
  PullToRefresh,
  SwipeableActionRow,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface MobileUtilitiesDemosProps {
  componentId: string;
}

export function MobileUtilitiesDemos({ componentId }: MobileUtilitiesDemosProps) {
  const dispatch = useAppDispatch();
  const [refreshCount, setRefreshCount] = useState(0);
  const [consentOpen, setConsentOpen] = useState(true);

  switch (componentId) {
    case 'bottom-navigation-bar':
      return (
        <div className="w-full max-w-md">
          <BottomNavigationBar
            mode="inline"
            defaultActiveId="home"
            items={[
              { id: 'home', label: 'Home', icon: <Home className="h-4 w-4" /> },
              { id: 'explore', label: 'Explore', icon: <Compass className="h-4 w-4" /> },
              { id: 'search', label: 'Search', icon: <Search className="h-4 w-4" /> },
              { id: 'inbox', label: 'Inbox', icon: <Inbox className="h-4 w-4" />, badgeCount: 7 },
              { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
            ]}
            onChange={(id, item) =>
              dispatch(
                pushToast({
                  title: `Switched destination to ${item.label}`,
                  description: `Route ID: ${id}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'swipeable-action-row':
      return (
        <div className="w-full max-w-lg space-y-2.5">
          <SwipeableActionRow
            leftActions={[
              {
                id: 'pin',
                label: 'Pin',
                tone: 'primary',
                icon: <Pin className="h-3.5 w-3.5" />,
                onTrigger: () =>
                  dispatch(pushToast({ title: 'Pinned thread to top', tone: 'emerald' })),
              },
            ]}
            rightActions={[
              {
                id: 'archive',
                label: 'Archive',
                tone: 'amber',
                icon: <Archive className="h-3.5 w-3.5" />,
                onTrigger: () =>
                  dispatch(pushToast({ title: 'Archived thread', tone: 'info' })),
              },
              {
                id: 'delete',
                label: 'Delete',
                tone: 'rose',
                icon: <Trash2 className="h-3.5 w-3.5" />,
                onTrigger: () =>
                  dispatch(pushToast({ title: 'Moved thread to trash', tone: 'amber' })),
              },
            ]}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--prism-text-primary)]">
                  Refractor v1.5.0 Mobile Spec Review
                </p>
                <p className="text-xs text-[var(--prism-text-secondary)]">
                  Drag horizontally or use quick-action toggles to reveal actions.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[var(--prism-text-muted)]">2m</span>
            </div>
          </SwipeableActionRow>
        </div>
      );

    case 'pull-to-refresh':
      return (
        <div className="w-full max-w-lg">
          <PullToRefresh
            onRefresh={async () => {
              await new Promise((resolve) => setTimeout(resolve, 260));
              setRefreshCount((prev) => prev + 1);
              dispatch(pushToast({ title: 'Feed refreshed', tone: 'emerald' }));
            }}
          >
            <div className="space-y-2 p-3">
              <p className="text-xs font-medium text-[var(--prism-text-secondary)]">
                Sync generations completed: <span className="font-mono font-semibold text-[var(--prism-text-primary)]">{refreshCount}</span>
              </p>
              <div className="prism-crystal rounded-xl p-3 text-xs text-[var(--prism-text-primary)]">
                Release telemetry channel healthy — pull downward or click Refresh to check for new events.
              </div>
            </div>
          </PullToRefresh>
        </div>
      );

    case 'keycap-badge':
      return (
        <div className="flex flex-wrap items-center gap-4">
          <KeycapBadge keys={['⌘', 'K']} size="sm" description="Open global search" />
          <KeycapBadge keys={['Ctrl', 'Shift', 'P']} size="md" description="Open command palette" />
          <KeycapBadge keys={['Alt', 'Enter']} size="lg" description="Run active cell" />
        </div>
      );

    case 'cookie-consent-banner':
      return (
        <div className="w-full max-w-2xl space-y-3">
          {!consentOpen && (
            <button
              type="button"
              onClick={() => setConsentOpen(true)}
              className="prism-crystal prism-focus-ring rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--prism-text-primary)]"
            >
              Reopen Privacy Preferences
            </button>
          )}
          <CookieConsentBanner
            mode="inline"
            open={consentOpen}
            onOpenChange={setConsentOpen}
            policyHref="https://refractor-ui.dev/privacy"
            onSavePreferences={(prefs) =>
              dispatch(
                pushToast({
                  title: 'Saved privacy preferences',
                  description: `Analytics: ${prefs.analytics ? 'On' : 'Off'} · Marketing: ${prefs.marketing ? 'On' : 'Off'}`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    default:
      return null;
  }
}
