import { useState } from 'react';
import {
  type CommentItem,
  CommentThread,
  LivePresenceIndicator,
  type NotificationItem,
  NotificationCenter,
  PrimaryButton,
  ProductTour,
  type PresenceUser,
  type TourStep,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface CollaborationDemosProps {
  componentId: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Design Audit Approved',
    message: 'Elena Vance signed off on Alabaster & Obsidian optical contrast ratios (9.9/10).',
    timestamp: '2m ago',
    category: 'alert',
    tone: 'success',
    read: false,
    actor: 'Elena Vance',
    actions: [
      { id: 'inspect', label: 'View Audit', tone: 'primary' },
      { id: 'ack', label: 'Acknowledge', tone: 'crystal' },
    ],
  },
  {
    id: 'n2',
    title: '@maya mentioned you in NodeGraphCanvas',
    message: 'Can we verify bezier port contrast under Vivid refraction mode before v1.7.0?',
    timestamp: '14m ago',
    category: 'mention',
    tone: 'mention',
    read: false,
    actor: 'Maya Lin',
    actions: [{ id: 'reply', label: 'Jump to Thread', tone: 'crystal' }],
  },
  {
    id: 'n3',
    title: 'CI Coverage Threshold Exceeded',
    message: 'Vitest V8 coverage verified at 99.6% statements across 75 Astryx components.',
    timestamp: '1h ago',
    category: 'system',
    tone: 'info',
    read: true,
    actor: 'Refractor CI',
  },
];

const INITIAL_COMMENTS: CommentItem[] = [
  {
    id: 'c1',
    author: { id: 'u1', name: 'Elena Vance', role: 'Creative Director' },
    body: 'Checked specular rim luminance with @maya — the glass slab depth feels razor crisp in both light and dark modes.',
    timestamp: '10m ago',
    reactions: [
      { emoji: '✨', count: 4, reacted: true },
      { emoji: '🚀', count: 2, reacted: false },
    ],
    replies: [
      {
        id: 'c1-r1',
        author: { id: 'u2', name: 'Maya Lin', role: 'Staff UI Engineer' },
        body: 'Thanks @elena! Added keyboard focus parity and verified zero raw hex values in JSX.',
        timestamp: '6m ago',
        reactions: [{ emoji: '👍', count: 3, reacted: false }],
      },
    ],
  },
];

const MENTION_USERS = [
  { id: 'u1', handle: 'elena', name: 'Elena Vance', role: 'Creative Director' },
  { id: 'u2', handle: 'maya', name: 'Maya Lin', role: 'Staff UI Engineer' },
  { id: 'u3', handle: 'marcus', name: 'Marcus Chen', role: 'Security Lead' },
];

const PRESENCE_USERS: PresenceUser[] = [
  {
    id: 'p1',
    name: 'Elena Vance',
    role: 'Creative Director',
    status: 'editing',
    activity: 'Refining optical specular rims',
    cursor: { x: 24, y: 36, label: 'Elena · Specular Rim' },
  },
  {
    id: 'p2',
    name: 'Maya Lin',
    role: 'Staff UI Engineer',
    status: 'editing',
    activity: 'Auditing ARIA focus loops',
    cursor: { x: 68, y: 58, label: 'Maya · Focus Ring' },
  },
  {
    id: 'p3',
    name: 'Marcus Chen',
    role: 'Security Lead',
    status: 'online',
    activity: 'Running XSS sanitizer tests',
    cursor: { x: 46, y: 24, label: 'Marcus · Security' },
  },
  {
    id: 'p4',
    name: 'Priya Nair',
    role: 'Design Systems',
    status: 'viewing',
    activity: 'Inspecting Theme Studio',
  },
  {
    id: 'p5',
    name: 'Devon Park',
    role: 'DX Architect',
    status: 'idle',
    activity: 'Reviewing CLI swizzle output',
  },
  {
    id: 'p6',
    name: 'Sora Takahashi',
    role: 'Frontend QA',
    status: 'online',
    activity: 'Verifying V8 coverage gates',
  },
];

const TOUR_STEPS: TourStep[] = [
  {
    id: 'step-tokens',
    title: 'Dual MUI + Astryx Theme Engine',
    description:
      'Switch presets or tune primary/secondary hex colors in Theme Studio — caustic halos and WCAG contrast tokens recompute automatically.',
    badge: 'Step 1 of 3 · Theming',
    targetSelector: '[data-tour-target="theme-chip"]',
    placement: 'bottom',
  },
  {
    id: 'step-optics',
    title: 'Calibrated Glass Refraction',
    description:
      'Adjust refraction depth between Subtle, Standard, and Vivid to inspect how specular borders adapt across Alabaster and Obsidian modes.',
    badge: 'Step 2 of 3 · Optics',
    targetSelector: '[data-tour-target="optics-chip"]',
    placement: 'bottom',
  },
  {
    id: 'step-cli',
    title: 'Open Internals & Agent CLI',
    description:
      'Query component docs or eject any primitive locally via @refractor-ui/cli while preserving stable refractor-* hooks.',
    badge: 'Step 3 of 3 · CLI & Swizzle',
    targetSelector: '[data-tour-target="cli-chip"]',
    placement: 'bottom',
  },
];

export function CollaborationDemos({ componentId }: CollaborationDemosProps) {
  const dispatch = useAppDispatch();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [comments, setComments] = useState<CommentItem[]>(INITIAL_COMMENTS);
  const [overlayTourOpen, setOverlayTourOpen] = useState(false);

  switch (componentId) {
    case 'notification-center':
      return (
        <div className="w-full max-w-xl">
          <NotificationCenter
            mode="inline"
            items={notifications}
            onItemsChange={setNotifications}
            onActionClick={(item, actionId) => {
              dispatch(
                pushToast({
                  title: `Triggered "${actionId}"`,
                  description: item.title,
                  tone: 'emerald',
                })
              );
            }}
          />
        </div>
      );

    case 'comment-thread':
      return (
        <div className="w-full max-w-2xl">
          <CommentThread
            comments={comments}
            onCommentsChange={setComments}
            mentionUsers={MENTION_USERS}
            currentUser={{ id: 'u-me', name: 'Alex Rivera', role: 'Lead Architect' }}
            onAddComment={(body, parentId) => {
              dispatch(
                pushToast({
                  title: parentId ? 'Reply posted to thread' : 'New comment added',
                  description: body.slice(0, 64),
                  tone: 'info',
                })
              );
            }}
          />
        </div>
      );

    case 'live-presence-indicator':
      return (
        <div className="w-full max-w-2xl">
          <LivePresenceIndicator
            users={PRESENCE_USERS}
            maxVisible={4}
            showCursors
            onUserSelect={(user) => {
              dispatch(
                pushToast({
                  title: `${user.name} (${user.status})`,
                  description: user.activity ?? user.role,
                  tone: 'info',
                })
              );
            }}
          />
        </div>
      );

    case 'product-tour':
      return (
        <div className="w-full max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-tour-target="theme-chip"
                className="prism-crystal px-3 py-1.5 rounded-full text-xs font-medium text-[var(--prism-text-primary)]"
              >
                1. Theme Engine
              </span>
              <span
                data-tour-target="optics-chip"
                className="prism-crystal px-3 py-1.5 rounded-full text-xs font-medium text-[var(--prism-text-primary)]"
              >
                2. Optical Physics
              </span>
              <span
                data-tour-target="cli-chip"
                className="prism-crystal px-3 py-1.5 rounded-full text-xs font-medium text-[var(--prism-text-primary)]"
              >
                3. Agent CLI
              </span>
            </div>

            <PrimaryButton size="sm" onClick={() => setOverlayTourOpen(true)}>
              Launch Spotlight Tour
            </PrimaryButton>
          </div>

          <ProductTour
            mode="inline"
            defaultOpen
            steps={TOUR_STEPS}
            onComplete={() => {
              dispatch(
                pushToast({
                  title: 'Inline onboarding tour completed',
                  tone: 'emerald',
                })
              );
            }}
          />

          <ProductTour
            mode="overlay"
            open={overlayTourOpen}
            onOpenChange={setOverlayTourOpen}
            steps={TOUR_STEPS}
            onComplete={() => {
              setOverlayTourOpen(false);
              dispatch(
                pushToast({
                  title: 'Spotlight tour finished!',
                  tone: 'emerald',
                })
              );
            }}
          />
        </div>
      );

    default:
      return null;
  }
}
