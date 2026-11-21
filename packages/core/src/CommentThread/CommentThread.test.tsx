import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CommentThread,
  type CommentItem,
  type MentionUser,
} from './index';

const MENTION_USERS: readonly MentionUser[] = [
  { id: 'u-alex', handle: 'alex', name: 'Alex Rivera', role: 'Staff Engineer' },
  { id: 'u-maya', handle: 'maya.chen', name: 'Maya Chen', role: 'Accessibility' },
  { id: 'u-sam', handle: 'sam_ops', name: 'Sam Patel' },
];

const SAMPLE_COMMENTS: readonly CommentItem[] = [
  {
    id: 'c1',
    author: {
      id: 'u-alex',
      name: 'Alex Rivera',
      role: 'Staff Engineer',
      avatarSrc: 'https://example.com/alex.png',
    },
    body: 'Great progress! @maya.chen please check contrast against @sam_ops obsidian tokens.',
    timestamp: '10m ago',
    reactions: [
      { emoji: '👍', count: 2, reacted: true },
      { emoji: '🚀', count: 1, reacted: false },
    ],
    replies: [
      {
        id: 'c1-r1',
        author: {
          id: 'u-maya',
          name: 'Maya Chen',
          role: 'Accessibility',
        },
        body: 'Verified AA/AAA ratios on both surfaces.',
        timestamp: '5m ago',
        reactions: [{ emoji: '✨', count: 1, reacted: true }],
        replies: [
          {
            id: 'c1-r1-r1',
            author: { id: 'u-sam', name: 'Sam' },
            body: 'Shipped into v1.6.0!',
            timestamp: '1m ago',
          },
        ],
      },
    ],
  },
];

describe('CommentThread', () => {
  it('renders nested comments, vertical indent rails, safe @mention spans, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CommentThread: { className: 'theme-thread', style: { maxWidth: '640px' } },
          },
        }}
      >
        <CommentThread
          ref={ref}
          defaultComments={SAMPLE_COMMENTS}
          title="Optical Design Review"
          className="custom-thread"
          xstyle={{ '--prism-blur-px': '22px' }}
          data-testid="thread-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('thread-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-comment-thread', 'theme-thread', 'custom-thread');
    expect(root).toHaveAttribute('data-count', '3');
    expect(root).toHaveAttribute('data-max-depth', '3');
    expect(root).toHaveStyle({ maxWidth: '640px' });

    expect(screen.getByText('Optical Design Review')).toBeInTheDocument();
    expect(screen.getByTestId('comment-thread-count')).toHaveTextContent('3');

    // Mention badges rendered safely as span elements
    const mentions = root.querySelectorAll('[data-mention="true"]');
    expect(mentions).toHaveLength(2);
    expect(mentions[0]).toHaveTextContent('@maya.chen');
    expect(mentions[1]).toHaveTextContent('@sam_ops');

    // Nested reply indent rails exist for levels 1 and 2
    expect(screen.getByTestId('comment-replies-c1')).toBeInTheDocument();
    expect(screen.getByTestId('comment-replies-c1-r1')).toBeInTheDocument();

    // Depth 3 reply button is disabled because depth === maxDepth (3)
    const samReplyBtn = screen.getByRole('button', { name: 'Reply to Sam' });
    expect(samReplyBtn).toBeDisabled();
    expect(samReplyBtn).toHaveClass('disabled:cursor-not-allowed');

    // Single-word author initials fallback ('SA') and two-word initials ('MC')
    expect(screen.getByRole('img', { name: 'Maya Chen' })).toHaveTextContent('MC');
    expect(screen.getByRole('img', { name: 'Sam' })).toHaveTextContent('SA');
  });

  it('sanitizes avatarSrc URLs and falls back to crystal initials on unsafe protocols or image error', () => {
    const comments: CommentItem[] = [
      {
        id: 'av-valid',
        author: {
          id: 'u1',
          name: 'Valid Portrait',
          avatarSrc: 'https://example.com/valid.png',
        },
        body: 'Valid https avatar.',
        timestamp: 'now',
      },
      {
        id: 'av-xss',
        author: {
          id: 'u2',
          name: 'Blocked Script',
          avatarSrc: 'javascript:alert(1)',
        },
        body: 'Unsafe protocol blocked.',
        timestamp: 'now',
      },
      {
        id: 'av-blank',
        author: {
          id: 'u3',
          name: '   ',
          avatarSrc: 'data:text/html,<script>alert(1)</script>',
        },
        body: 'Blank author fallback.',
        timestamp: 'now',
      },
    ];

    render(<CommentThread defaultComments={comments} />);

    // Valid avatar renders <img> and falls back to initials on error
    const img = screen.getByRole('img', { name: 'Valid Portrait' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', 'https://example.com/valid.png');
    expect(img).toHaveAttribute('referrerPolicy', 'no-referrer');

    fireEvent.error(img);
    const fallback = screen.getByRole('img', { name: 'Valid Portrait' });
    expect(fallback.tagName).toBe('SPAN');
    expect(fallback).toHaveTextContent('VP');

    // Unsafe javascript: and data:text/html URLs never render an <img>
    const blocked = screen.getByRole('img', { name: 'Blocked Script' });
    expect(blocked.tagName).toBe('SPAN');
    expect(blocked).toHaveTextContent('BS');

    const blankFallback = screen.getByRole('img', { name: 'Anonymous' });
    expect(blankFallback).toHaveTextContent('?');
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });

  it('supports adding root comments, inline nested replies, cancel/Escape, and ignores whitespace submissions', () => {
    const onAddComment = vi.fn();
    const onCommentsChange = vi.fn();

    render(
      <CommentThread
        defaultComments={[]}
        currentUser={{ id: 'me', name: 'Jordan Lee', role: 'Lead' }}
        onAddComment={onAddComment}
        onCommentsChange={onCommentsChange}
      />
    );

    expect(screen.getByTestId('comment-thread-empty')).toBeInTheDocument();

    const mainInput = screen.getByLabelText('Add a comment');
    const postBtn = screen.getByRole('button', { name: 'Post comment' });
    expect(postBtn).toBeDisabled();

    // Whitespace-only Enter and form submission are ignored
    fireEvent.change(mainInput, { target: { value: '    ' } });
    expect(postBtn).toBeDisabled();
    fireEvent.keyDown(mainInput, { key: 'Enter' });
    expect(onAddComment).not.toHaveBeenCalled();

    // Shift+Enter does NOT submit
    fireEvent.change(mainInput, { target: { value: 'First optical comment' } });
    fireEvent.keyDown(mainInput, { key: 'Enter', shiftKey: true });
    expect(onAddComment).not.toHaveBeenCalled();

    // Submit via button click
    fireEvent.click(postBtn);
    expect(onAddComment).toHaveBeenLastCalledWith('First optical comment');
    expect(screen.getByText('First optical comment')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Comment added');
    expect(screen.getByTestId('comment-thread-count')).toHaveTextContent('1');

    // Submit second root comment via Enter key
    fireEvent.change(mainInput, { target: { value: 'Second comment via Enter' } });
    fireEvent.keyDown(mainInput, { key: 'Enter' });
    expect(onAddComment).toHaveBeenLastCalledWith('Second comment via Enter');
    expect(screen.getByTestId('comment-thread-count')).toHaveTextContent('2');

    // Open inline reply composer on first comment, toggle close, reopen, cancel via Escape, then submit
    const replyButtons = screen.getAllByRole('button', { name: 'Reply to Jordan Lee' });
    const firstReplyBtn = replyButtons[0];
    expect(firstReplyBtn).toBeDefined();

    fireEvent.click(firstReplyBtn!);
    expect(screen.getByLabelText('Write a reply to Jordan Lee')).toBeInTheDocument();

    // Clicking Reply toggle again closes it
    fireEvent.click(firstReplyBtn!);
    expect(screen.queryByLabelText('Write a reply to Jordan Lee')).not.toBeInTheDocument();

    // Open and cancel with Escape
    fireEvent.click(firstReplyBtn!);
    const replyInput = screen.getByLabelText('Write a reply to Jordan Lee');
    fireEvent.keyDown(replyInput, { key: 'Escape' });
    expect(screen.queryByLabelText('Write a reply to Jordan Lee')).not.toBeInTheDocument();

    // Open and cancel with Cancel button
    fireEvent.click(firstReplyBtn!);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Write a reply to Jordan Lee')).not.toBeInTheDocument();

    // Open and submit a reply
    fireEvent.click(firstReplyBtn!);
    const activeReplyInput = screen.getByLabelText('Write a reply to Jordan Lee');
    fireEvent.change(activeReplyInput, { target: { value: 'Nested reply text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    expect(onAddComment).toHaveBeenLastCalledWith('Nested reply text', 'comment-1');
    expect(screen.getByText('Nested reply text')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Reply added');
    expect(screen.getByTestId('comment-thread-count')).toHaveTextContent('3');

    // Reply inside a nested reply (depth 2 -> depth 3) exercises recursive appendReplyToTree
    const nestedReplyButtons = screen.getAllByRole('button', { name: 'Reply to Jordan Lee' });
    const level2ReplyBtn = nestedReplyButtons[1];
    fireEvent.click(level2ReplyBtn!);
    const level2Input = screen.getByLabelText('Write a reply to Jordan Lee');
    fireEvent.change(level2Input, { target: { value: 'Level 3 reply' } });
    fireEvent.keyDown(level2Input, { key: 'Enter' });
    expect(onAddComment).toHaveBeenLastCalledWith('Level 3 reply', 'comment-3');
    expect(screen.getByText('Level 3 reply')).toBeInTheDocument();
  });

  it('toggles emoji reactions (add, increment, decrement, remove) and resolves/reopens root threads', () => {
    const onToggleReaction = vi.fn();
    const onToggleResolve = vi.fn();

    const commentsWithSibling: readonly CommentItem[] = [
      ...SAMPLE_COMMENTS,
      {
        id: 'c2',
        author: { id: 'u-sam', name: 'Sam Patel' },
        body: 'Standalone sibling comment without reactions or replies.',
        timestamp: '2m ago',
      },
    ];

    render(
      <CommentThread
        defaultComments={commentsWithSibling}
        availableReactions={['👍', '✨', '🚀', '👀', '👀']}
        onToggleReaction={onToggleReaction}
        onToggleResolve={onToggleResolve}
      />
    );

    const rootArticle = document.querySelector('[data-comment-id="c1"]') as HTMLElement;
    const replyArticle = document.querySelector('[data-comment-id="c1-r1"]') as HTMLElement;
    const siblingActions = screen.getByTestId('comment-actions-c2');
    expect(rootArticle).not.toBeNull();
    expect(replyArticle).not.toBeNull();

    // Add a reaction to sibling comment that starts with reactions: undefined
    fireEvent.click(within(siblingActions).getByRole('button', { name: 'Add 👍 reaction' }));
    expect(onToggleReaction).toHaveBeenLastCalledWith('c2', '👍');
    expect(
      within(siblingActions).getByRole('button', { name: 'Toggle 👍 reaction (1)' })
    ).toHaveAttribute('aria-pressed', 'true');

    // Reply to sibling comment that starts with replies: undefined
    fireEvent.click(within(siblingActions).getByRole('button', { name: 'Reply to Sam Patel' }));
    const siblingReplyInput = screen.getByLabelText('Write a reply to Sam Patel');
    fireEvent.change(siblingReplyInput, { target: { value: 'First reply to Sam' } });
    fireEvent.keyDown(siblingReplyInput, { key: 'Enter' });
    expect(screen.getByText('First reply to Sam')).toBeInTheDocument();

    // Decrement existing reacted emoji with count 2 -> count 1, aria-pressed=false
    const thumbsBtn = within(rootArticle).getByRole('button', {
      name: 'Toggle 👍 reaction (2)',
    });
    expect(thumbsBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(thumbsBtn);
    expect(onToggleReaction).toHaveBeenLastCalledWith('c1', '👍');
    expect(
      within(rootArticle).getByRole('button', { name: 'Toggle 👍 reaction (1)' })
    ).toHaveAttribute('aria-pressed', 'false');

    // Increment un-reacted emoji 🚀 count 1 -> count 2, aria-pressed=true
    const rocketBtn = within(rootArticle).getByRole('button', {
      name: 'Toggle 🚀 reaction (1)',
    });
    expect(rocketBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(rocketBtn);
    expect(
      within(rootArticle).getByRole('button', { name: 'Toggle 🚀 reaction (2)' })
    ).toHaveAttribute('aria-pressed', 'true');

    // Add quick reaction 👀 -> appears with count 1; toggling again removes it
    const rootActions = screen.getByTestId('comment-actions-c1');
    const addEyesBtn = within(rootActions).getByRole('button', { name: 'Add 👀 reaction' });
    fireEvent.click(addEyesBtn);
    const eyesPill = within(rootActions).getByRole('button', {
      name: 'Toggle 👀 reaction (1)',
    });
    expect(eyesPill).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(eyesPill);
    expect(
      within(rootActions).queryByRole('button', { name: /Toggle 👀 reaction/ })
    ).not.toBeInTheDocument();

    // Toggle reaction on nested reply (depth 2) removes its count-1 reaction cleanly
    const replySparkles = within(replyArticle).getByRole('button', {
      name: 'Toggle ✨ reaction (1)',
    });
    fireEvent.click(replySparkles);
    expect(onToggleReaction).toHaveBeenLastCalledWith('c1-r1', '✨');
    expect(
      within(replyArticle).queryByRole('button', { name: /Toggle ✨ reaction/ })
    ).not.toBeInTheDocument();

    // Resolve and reopen root thread (nested reply has no Resolve button)
    expect(within(replyArticle).queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
    const resolveBtn = within(rootArticle).getByRole('button', { name: 'Resolve' });
    fireEvent.click(resolveBtn);
    expect(onToggleResolve).toHaveBeenLastCalledWith('c1');
    expect(rootArticle).toHaveAttribute('data-resolved', 'true');
    expect(within(rootArticle).getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Thread resolved');

    const reopenBtn = within(rootArticle).getByRole('button', { name: 'Reopen' });
    fireEvent.click(reopenBtn);
    expect(onToggleResolve).toHaveBeenCalledTimes(2);
    expect(rootArticle).not.toHaveAttribute('data-resolved');
    expect(screen.getByRole('status')).toHaveTextContent('Thread reopened');
  });

  it('provides live @mentions autocomplete with filtering, keyboard navigation, IME safety, Escape, and click selection', () => {
    const onAddComment = vi.fn();

    render(
      <CommentThread
        defaultComments={[]}
        mentionUsers={MENTION_USERS}
        onAddComment={onAddComment}
      />
    );

    const textarea = screen.getByLabelText('Add a comment') as HTMLTextAreaElement;

    // Typing '@' opens all mention users
    fireEvent.change(textarea, { target: { value: 'Hey @', selectionStart: 5 } });
    const listbox = screen.getByRole('listbox', { name: 'Mention suggestions' });
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    // ArrowDown and ArrowUp navigate suggestions with wrap-around; other keys leave listbox open
    fireEvent.keyDown(textarea, { key: 'a' });
    expect(screen.getByRole('listbox', { name: 'Mention suggestions' })).toBeInTheDocument();
    fireEvent.keyDown(textarea, { key: 'ArrowDown' });
    expect(within(listbox).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(textarea, { key: 'ArrowUp' });
    expect(within(listbox).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(textarea, { key: 'ArrowUp' });
    expect(within(listbox).getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');

    // IME-composing Enter does NOT select or submit
    const composingEnter = createEvent.keyDown(textarea, { key: 'Enter' });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(textarea, composingEnter);
    expect(textarea.value).toBe('Hey @');
    expect(onAddComment).not.toHaveBeenCalled();

    // Non-composing Enter inserts selected @sam_ops
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(textarea.value).toBe('Hey @sam_ops ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Filter by name ('maya') and dismiss with Escape
    fireEvent.change(textarea, {
      target: { value: 'Hey @sam_ops @may', selectionStart: 17 },
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(1);

    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(textarea.value).toBe('Hey @sam_ops @may');

    // Typing another character reopens filtered list; clicking inserts handle
    fireEvent.change(textarea, {
      target: { value: 'Hey @sam_ops @maya', selectionStart: 18 },
    });
    const mayaOpt = screen.getByRole('option', { name: /@maya\.chen/ });
    fireEvent.mouseDown(mayaOpt);
    fireEvent.click(mayaOpt);
    expect(textarea.value).toBe('Hey @sam_ops @maya.chen ');

    // Query with zero matches hides listbox
    fireEvent.change(textarea, {
      target: { value: '@nonexistent', selectionStart: 12 },
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports controlled comments mode and enforces maxDepth clamping on deep trees', () => {
    function buildDeepTree(levels: number): CommentItem {
      let current: CommentItem = {
        id: `depth-${levels}`,
        author: { id: `u-${levels}`, name: `Author ${levels}` },
        body: `Message at level ${levels}`,
        timestamp: 'now',
      };
      for (let i = levels - 1; i >= 1; i -= 1) {
        current = {
          id: `depth-${i}`,
          author: { id: `u-${i}`, name: `Author ${i}` },
          body: `Message at level ${i}`,
          timestamp: 'now',
          replies: [current],
        };
      }
      return current;
    }

    const deepRoot = buildDeepTree(8);

    const { rerender } = render(
      <CommentThread comments={[deepRoot]} maxDepth={0} />
    );

    // maxDepth=0 clamps to 1 -> only level 1 rendered
    expect(screen.getByText('Message at level 1')).toBeInTheDocument();
    expect(screen.queryByText('Message at level 2')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reply to Author 1' })).toBeDisabled();

    // maxDepth=99 clamps to 6 -> levels 1..6 rendered, levels 7..8 clamped
    rerender(<CommentThread comments={[deepRoot]} maxDepth={99} />);
    expect(screen.getByText('Message at level 6')).toBeInTheDocument();
    expect(screen.queryByText('Message at level 7')).not.toBeInTheDocument();
    expect(screen.getByTestId('comment-thread-count')).toHaveTextContent('6');

    // maxDepth=NaN falls back to 3 -> levels 1..3 rendered
    rerender(<CommentThread comments={[deepRoot]} maxDepth={Number.NaN} />);
    expect(screen.getByText('Message at level 3')).toBeInTheDocument();
    expect(screen.queryByText('Message at level 4')).not.toBeInTheDocument();

    // Controlled harness updates cleanly
    function ControlledHarness() {
      const [items, setItems] = useState<CommentItem[]>([
        {
          id: 'ctrl-1',
          author: { id: 'u1', name: 'Alex' },
          body: 'Controlled root',
          timestamp: 'now',
        },
      ]);
      return <CommentThread comments={items} onCommentsChange={setItems} />;
    }

    rerender(<ControlledHarness />);
    expect(screen.getByText('Controlled root')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Add a comment'), {
      target: { value: 'Added controlled' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(screen.getByText('Added controlled')).toBeInTheDocument();
  });

  it('enforces readOnly mode and defends against XSS payloads in body, author, and mentions (adversarial)', () => {
    const xss = '<script>window.__commentXss=1</script><img src=x onerror=alert(1)>';
    const onAddComment = vi.fn();
    const onToggleReaction = vi.fn();
    const onToggleResolve = vi.fn();

    render(
      <CommentThread
        readOnly
        defaultComments={[
          {
            id: 'xss-1',
            author: {
              id: 'u-xss',
              name: xss,
              role: xss,
              avatarSrc: 'javascript:alert(1)',
            },
            body: `${xss} @alex`,
            timestamp: 'now',
            reactions: [{ emoji: '👍', count: 1, reacted: true }],
          },
        ]}
        onAddComment={onAddComment}
        onToggleReaction={onToggleReaction}
        onToggleResolve={onToggleResolve}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelectorAll('img')).toHaveLength(0);
    expect(screen.getAllByText(xss).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('@alex')).toBeInTheDocument();
    expect(screen.getByText('Read only')).toBeInTheDocument();

    // All composers and mutators are disabled
    const textarea = screen.getByLabelText('Add a comment');
    expect(textarea).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Post comment' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Resolve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: `Reply to ${xss}` })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Toggle 👍 reaction (1)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add ✨ reaction' })).toBeDisabled();

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onAddComment).not.toHaveBeenCalled();
    expect(onToggleReaction).not.toHaveBeenCalled();
    expect(onToggleResolve).not.toHaveBeenCalled();
  });
});
