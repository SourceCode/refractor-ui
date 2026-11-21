import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { NotificationCenter, type NotificationItem } from './index';

const SAMPLE_ITEMS: readonly NotificationItem[] = [
  {
    id: 'n1',
    title: 'Deploy Completed',
    message: 'Optical build v1.6.0 shipped to edge nodes.',
    timestamp: '2m ago',
    category: 'system',
    tone: 'success',
    read: false,
    actor: 'Release Bot',
  },
  {
    id: 'n2',
    title: 'Mentioned in Spec',
    message: '@alex asked for your review on the prism blur tokens.',
    timestamp: '10m ago',
    category: 'mention',
    tone: 'mention',
    read: false,
    actor: 'Alex Rivera',
    actions: [
      { id: 'approve', label: 'Approve', tone: 'primary' },
      { id: 'view', label: 'View Diff', tone: 'crystal' },
    ],
  },
  {
    id: 'n3',
    title: 'Latency Warning',
    message: 'P99 render latency crossed 12ms budget.',
    timestamp: '1h ago',
    category: 'alert',
    tone: 'warning',
    read: true,
  },
  {
    id: 'n4',
    title: 'Telemetry Digest',
    message: 'Weekly contrast audit report is ready.',
    timestamp: '3h ago',
    category: 'system',
    tone: 'info',
    read: false,
  },
];

describe('NotificationCenter', () => {
  it('renders dropdown mode with trigger capsule, unread badge, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            NotificationCenter: { className: 'theme-notif', style: { zIndex: 25 } },
          },
        }}
      >
        <NotificationCenter
          ref={ref}
          defaultItems={SAMPLE_ITEMS}
          title="Inbox Feed"
          triggerLabel="Alerts"
          className="custom-notif"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="notif-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('notif-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-notification-center', 'theme-notif', 'custom-notif');
    expect(root).toHaveAttribute('data-mode', 'dropdown');
    expect(root).toHaveAttribute('data-unread-count', '3');
    expect(root).toHaveStyle({ zIndex: '25' });

    const trigger = screen.getByRole('button', { name: /Alerts/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('3');
    expect(screen.queryByRole('region', { name: 'Inbox Feed' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Notifications panel opened');

    const region = screen.getByRole('region', { name: 'Inbox Feed' });
    expect(within(region).getByText('Deploy Completed')).toBeInTheDocument();
    expect(within(region).getByText('Release Bot')).toBeInTheDocument();
    expect(within(region).getByText('Mentioned in Spec')).toBeInTheDocument();
    expect(within(region).getByText('Latency Warning')).toBeInTheDocument();
    expect(within(region).getByText('Telemetry Digest')).toBeInTheDocument();

    // Toggling trigger again closes the dropdown
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('Notifications panel closed');
  });

  it('filters across All, Unread, and Mentions tabs with live tabular counts', () => {
    const itemsWithToneMention: readonly NotificationItem[] = [
      ...SAMPLE_ITEMS,
      {
        id: 'n5',
        title: 'Tone Mention Only',
        message: 'Tagged via tone without explicit category.',
        timestamp: '5m ago',
        tone: 'mention',
        read: true,
      },
    ];

    render(<NotificationCenter mode="inline" defaultItems={itemsWithToneMention} />);

    expect(screen.getByTestId('notification-tab-count-all')).toHaveTextContent('5');
    expect(screen.getByTestId('notification-tab-count-unread')).toHaveTextContent('3');
    expect(screen.getByTestId('notification-tab-count-mentions')).toHaveTextContent('2');

    const unreadTab = screen.getByRole('tab', { name: /Unread/ });
    fireEvent.click(unreadTab);
    expect(unreadTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Deploy Completed')).toBeInTheDocument();
    expect(screen.queryByText('Latency Warning')).not.toBeInTheDocument();

    const mentionsTab = screen.getByRole('tab', { name: /Mentions/ });
    fireEvent.click(mentionsTab);
    expect(mentionsTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Mentioned in Spec')).toBeInTheDocument();
    expect(screen.getByText('Tone Mention Only')).toBeInTheDocument();
    expect(screen.queryByText('Deploy Completed')).not.toBeInTheDocument();

    const allTab = screen.getByRole('tab', { name: /All/ });
    fireEvent.click(allTab);
    expect(allTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Latency Warning')).toBeInTheDocument();
  });

  it('supports individual read/unread toggle, mark all read, dismiss, and inline quick actions', () => {
    const onItemsChange = vi.fn();
    const onMarkRead = vi.fn();
    const onMarkAllRead = vi.fn();
    const onDismiss = vi.fn();
    const onActionClick = vi.fn();
    const itemActionClick = vi.fn();

    const items: NotificationItem[] = [
      {
        id: 'a1',
        title: 'PR Ready',
        message: 'Checks passed on feature branch.',
        timestamp: '1m ago',
        read: false,
        actions: [
          { id: 'merge', label: 'Merge PR', tone: 'primary', onClick: itemActionClick },
          { id: 'inspect', label: 'Inspect', tone: 'crystal' },
        ],
      },
      {
        id: 'a2',
        title: 'Security Scan',
        message: 'Zero vulnerabilities detected.',
        timestamp: '12m ago',
        tone: 'success',
        read: true,
      },
    ];

    render(
      <NotificationCenter
        mode="dropdown"
        defaultOpen
        defaultItems={items}
        onItemsChange={onItemsChange}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
        onDismiss={onDismiss}
        onActionClick={onActionClick}
      />
    );

    // Inline quick actions invoke both item action.onClick and container onActionClick
    fireEvent.click(screen.getByRole('button', { name: 'Merge PR' }));
    expect(itemActionClick).toHaveBeenCalledTimes(1);
    expect(itemActionClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
    expect(onActionClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }), 'merge');
    expect(screen.getByRole('status')).toHaveTextContent('Activated Merge PR for PR Ready');

    fireEvent.click(screen.getByRole('button', { name: 'Inspect' }));
    expect(onActionClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }), 'inspect');

    // Toggle unread -> read -> unread
    expect(screen.getByTestId('notification-unread-dot-a1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark PR Ready as read' }));
    expect(onMarkRead).toHaveBeenLastCalledWith('a1', true);
    expect(screen.queryByTestId('notification-unread-dot-a1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notification-unread-badge')).not.toBeInTheDocument();

    const markAllBtn = screen.getByRole('button', { name: 'Mark all read' });
    expect(markAllBtn).toBeDisabled();
    expect(markAllBtn).toHaveClass('disabled:cursor-not-allowed');

    fireEvent.click(screen.getByRole('button', { name: 'Mark PR Ready as unread' }));
    expect(onMarkRead).toHaveBeenLastCalledWith('a1', false);
    expect(screen.getByRole('status')).toHaveTextContent('Marked PR Ready as unread');
    expect(markAllBtn).toBeEnabled();

    // Mark all read
    fireEvent.click(markAllBtn);
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('notification-header-unread')).toHaveTextContent('0 unread');
    expect(screen.getByRole('status')).toHaveTextContent('All notifications marked as read');
    expect(markAllBtn).toBeDisabled();

    // Switch to Unread tab when 0 unread -> renders emptyMessage
    fireEvent.click(screen.getByRole('tab', { name: /Unread/ }));
    expect(screen.getByTestId('notification-empty-state')).toHaveTextContent(
      'You are all caught up.'
    );

    // Return to All tab and dismiss items
    fireEvent.click(screen.getByRole('tab', { name: /All/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss PR Ready' }));
    expect(onDismiss).toHaveBeenCalledWith('a1');
    expect(screen.queryByText('PR Ready')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Dismissed PR Ready');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Security Scan' }));
    expect(screen.getByTestId('notification-empty-state')).toBeInTheDocument();
  });

  it('dismisses dropdown and drawer via Escape, outside click, close button, and drawer backdrop', () => {
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <div>
        <button type="button">Outside Element</button>
        <NotificationCenter
          mode="dropdown"
          defaultOpen
          defaultItems={SAMPLE_ITEMS}
          onOpenChange={onOpenChange}
        />
      </div>
    );

    // Non-Escape key does not dismiss
    fireEvent.keyDown(document, { key: 'a' });
    expect(screen.getByRole('region', { name: 'Activity & Notifications' })).toBeInTheDocument();

    // Click inside dropdown does NOT dismiss
    fireEvent.mouseDown(screen.getByText('Deploy Completed'));
    expect(screen.getByRole('region', { name: 'Activity & Notifications' })).toBeInTheDocument();

    // Outside click dismisses dropdown
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside Element' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(
      screen.queryByRole('region', { name: 'Activity & Notifications' })
    ).not.toBeInTheDocument();

    // Reopen and dismiss with Escape
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('region', { name: 'Activity & Notifications' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('region', { name: 'Activity & Notifications' })
    ).not.toBeInTheDocument();

    // Drawer mode: dialog role, close button, and backdrop dismissal
    rerender(
      <NotificationCenter
        mode="drawer"
        defaultItems={SAMPLE_ITEMS}
        onOpenChange={onOpenChange}
      />
    );

    const drawerTrigger = screen.getByRole('button', { name: /Notifications/ });
    expect(drawerTrigger).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(drawerTrigger);

    const dialog = screen.getByRole('dialog', { name: 'Activity & Notifications' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Clicking inside dialog does NOT close via backdrop handler
    fireEvent.click(within(dialog).getByText('Deploy Completed'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Clicking backdrop closes drawer
    fireEvent.click(screen.getByTestId('notification-drawer-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reopen drawer and click explicit Close button
    fireEvent.click(drawerTrigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close notifications' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('omits trigger and close button in inline mode and supports controlled items & open state', () => {
    const { unmount } = render(
      <NotificationCenter
        mode="inline"
        defaultItems={[]}
        emptyMessage="Inbox is spotless."
      />
    );

    expect(screen.queryByRole('button', { name: /Notifications/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close notifications' })).not.toBeInTheDocument();
    expect(screen.getByTestId('notification-empty-state')).toHaveTextContent('Inbox is spotless.');

    // Escape in inline mode does not hide inline section
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('notification-empty-state')).toBeInTheDocument();
    unmount();

    // Controlled items & controlled open harness
    function ControlledHarness() {
      const [open, setOpen] = useState(false);
      const [items, setItems] = useState<NotificationItem[]>([
        {
          id: 'c1',
          title: 'Controlled Alert',
          message: 'Managed by parent state.',
          timestamp: 'now',
          read: false,
        },
      ]);
      return (
        <NotificationCenter
          mode="dropdown"
          open={open}
          onOpenChange={setOpen}
          items={items}
          onItemsChange={setItems}
        />
      );
    }

    render(<ControlledHarness />);
    expect(screen.queryByText('Controlled Alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByText('Controlled Alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Controlled Alert' }));
    expect(screen.queryByText('Controlled Alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('notification-empty-state')).toBeInTheDocument();
  });

  it('deduplicates duplicate IDs and defends against XSS and prototype-polluting keys (adversarial)', () => {
    const xss = '<script>window.__notifXss=1</script><img src=x onerror=alert(1)>';
    const adversarialItems: NotificationItem[] = [
      {
        id: '__proto__',
        title: xss,
        message: xss,
        timestamp: 'now',
        actor: xss,
        read: false,
      },
      {
        id: '__proto__',
        title: 'Duplicate Should Be Ignored',
        message: 'Second duplicate entry.',
        timestamp: '1m ago',
      },
      {
        id: 'constructor',
        title: 'Constructor Safe',
        message: 'Prototype key safe.',
        timestamp: '2m ago',
      },
    ];

    render(
      <NotificationCenter
        mode="inline"
        items={adversarialItems}
        emptyMessage={xss}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByText('Duplicate Should Be Ignored')).not.toBeInTheDocument();
    expect(screen.getAllByText(xss).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Constructor Safe')).toBeInTheDocument();
    expect(screen.getByTestId('notification-tab-count-all')).toHaveTextContent('2');
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xss);
  });
});
