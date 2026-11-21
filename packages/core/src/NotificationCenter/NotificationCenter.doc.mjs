export const docs = {
  name: 'NotificationCenter',
  displayName: 'Notification Center (Activity Inbox)',
  group: 'Collaboration & Guidance',
  category: 'collaboration-guidance',
  keywords: ['notifications', 'inbox', 'activity', 'alerts', 'mentions', 'bell', 'drawer', 'dropdown'],
  usage: {
    description:
      'Optical glass activity inbox supporting dropdown, slide-over drawer, and inline layouts with a crystal bell trigger capsule, live tabular unread badge, All/Unread/Mentions filter tabs, mark-all-read, per-item read toggles, dismiss actions, and inline quick actions.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use dropdown mode in top navigation bars, drawer mode for dense enterprise activity feeds, and inline mode inside dedicated settings or dashboard panels.',
      },
      {
        guidance: true,
        description:
          'Attach concise primary or crystal inline actions (such as Approve, View PR, or Retry) so users can resolve alerts directly inside the inbox.',
      },
      {
        guidance: false,
        description:
          'Use NotificationCenter for ephemeral single-action confirmations; use ToastSnackbar for transient feedback.',
      },
    ],
    accessibility: [
      {
        name: 'Tablist Filtering & Live Announcements',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement: 'role="tablist", role="tab", aria-selected, aria-live="polite" status region',
        description:
          'Exposes All, Unread, and Mentions filters as an accessible tablist with live tabular counts and announces read, dismiss, panel open/close, and quick-action transitions politely.',
      },
      {
        name: 'Dismissible Overlay Controls',
        criterion: '2.1.1 Keyboard & 1.4.13 Content on Hover or Focus',
        requirement: 'Escape key and outside-click dismissal with keyboard-only prism-focus-ring',
        description:
          'Dropdown and drawer panels dismiss cleanly on Escape, outside clicks, or the header Close button, while exposing aria-expanded and aria-controls on the trigger capsule.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'readonly NotificationItem[]',
      defaultValue: 'undefined',
      description: 'Controlled notification items (duplicate IDs are deduplicated).',
    },
    {
      name: 'defaultItems',
      type: 'readonly NotificationItem[]',
      defaultValue: 'undefined',
      description: 'Initial notification items in uncontrolled mode.',
    },
    {
      name: 'onItemsChange',
      type: '(next: NotificationItem[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever notifications are marked read/unread or dismissed.',
    },
    {
      name: 'onMarkRead',
      type: '(id: string, read: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when an individual notification read state toggles.',
    },
    {
      name: 'onMarkAllRead',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when Mark all read is pressed.',
    },
    {
      name: 'onDismiss',
      type: '(id: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when a notification is dismissed.',
    },
    {
      name: 'onActionClick',
      type: '(item: NotificationItem, actionId: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when an inline notification quick action is clicked.',
    },
    {
      name: 'mode',
      type: "'dropdown' | 'drawer' | 'inline'",
      defaultValue: "'dropdown'",
      description: 'Presentation layout controlling trigger capsule and panel surface.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled visibility state for dropdown and drawer modes.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial visibility state for uncontrolled dropdown and drawer modes.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever dropdown or drawer open state changes.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Activity & Notifications'",
      description: 'Header heading displayed at the top of the notification panel.',
    },
    {
      name: 'triggerLabel',
      type: 'string',
      defaultValue: "'Notifications'",
      description: 'Label shown inside the trigger button capsule.',
    },
    {
      name: 'emptyMessage',
      type: 'string',
      defaultValue: "'You are all caught up.'",
      description: 'Placeholder text rendered when no notifications exist in the active view.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<NotificationCenter\n  mode="dropdown"\n  defaultItems={[\n    {\n      id: 'n1',\n      title: 'Deployment Succeeded',\n      message: 'Refractor v1.6.0 optical build passed all 24 gates.',\n      timestamp: '2m ago',\n      tone: 'success',\n      category: 'system',\n    },\n    {\n      id: 'n2',\n      title: 'Design Review Mention',\n      message: '@alex requested your contrast audit on CommentThread.',\n      timestamp: '14m ago',\n      tone: 'mention',\n      category: 'mention',\n      actor: 'Alex Rivera',\n      actions: [{ id: 'open', label: 'Review', tone: 'primary' }],\n    },\n  ]}\n/>`,
  ],
};
