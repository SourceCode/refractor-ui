import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ChatMessageStream, type ChatMessage } from './index';

const BASE_MESSAGES: readonly ChatMessage[] = [
  {
    id: 'sys-1',
    role: 'system',
    content: 'Session started in Alabaster optical mode.',
    timestamp: '09:00',
    footer: <span>System context ready</span>,
  },
  {
    id: 'user-1',
    role: 'user',
    author: 'Maya Lin',
    content: 'Explain optical caustic tokens.',
    timestamp: '09:01',
    status: 'sent',
    footer: <span>Edited 09:01</span>,
  },
  {
    id: 'assistant-1',
    role: 'assistant',
    author: 'Prism Assistant',
    avatarSrc: 'https://cdn.example.com/prism-avatar.png',
    content: 'Caustic opacity controls edge light dispersion.',
    timestamp: '09:01',
    status: 'sent',
    footer: <button type="button">Copy citation</button>,
  },
];

describe('ChatMessageStream', () => {
  it('renders empty state, semantic log role, theme overrides, xstyle, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: {
            ChatMessageStream: { className: 'theme-stream', style: { opacity: 0.98 } },
          },
        }}
      >
        <ChatMessageStream
          ref={ref}
          messages={[]}
          className="custom-stream"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="chat-root"
        />
      </PrismThemeProvider>
    );

    const log = screen.getByRole('log', { name: 'Conversation stream' });
    expect(ref.current).toBe(log);
    expect(log).toBe(screen.getByTestId('chat-root'));
    expect(log).toHaveClass('refractor-chat-message-stream', 'prism-slab', 'theme-stream', 'custom-stream');
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(log).toHaveAttribute('data-empty', 'true');
    expect(log).toHaveStyle({ maxHeight: '420px', opacity: '0.98' });
    expect(screen.getByTestId('chat-stream-empty')).toHaveTextContent(
      'Start a conversation to see messages here.'
    );
    expect(ChatMessageStream.displayName).toBe('ChatMessageStream');

    rerender(
      <ChatMessageStream
        messages={[]}
        emptyMessage="No AI turns yet."
        ariaLabel="Model output log"
        maxHeightPx={120}
      />
    );
    const clampedMin = screen.getByRole('log', { name: 'Model output log' });
    expect(clampedMin).toHaveStyle({ maxHeight: '180px' });
    expect(screen.getByTestId('chat-stream-empty')).toHaveTextContent('No AI turns yet.');

    rerender(<ChatMessageStream messages={[]} maxHeightPx={1400} />);
    expect(screen.getByRole('log')).toHaveStyle({ maxHeight: '900px' });

    rerender(<ChatMessageStream messages={[]} maxHeightPx={Number.NaN} />);
    expect(screen.getByRole('log')).toHaveStyle({ maxHeight: '420px' });
  });

  it('renders user, assistant, and system bubbles with avatars, initials, streaming caret, statuses, and footers', () => {
    const messages: ChatMessage[] = [
      ...BASE_MESSAGES,
      {
        id: 'sys-2',
        role: 'system',
        content: 'Context window expanded.',
      },
      {
        id: 'user-2',
        role: 'user',
        content: 'Still sending this turn...',
        timestamp: '09:02',
        status: 'sending',
        streaming: true,
      },
      {
        id: 'user-3',
        role: 'user',
        author: 'Maya Lin',
        content: 'Network dropped here.',
        status: 'error',
      },
      {
        id: 'assistant-2',
        role: 'assistant',
        author: 'Refractor',
        content: 'Generating answer',
        streaming: true,
      },
      {
        id: 'assistant-3',
        role: 'assistant',
        author: '   ',
        content: 'Model timeout occurred.',
        status: 'error',
      },
      {
        id: 'assistant-4',
        role: 'assistant',
        avatarSrc: 'data:image/png;base64,iVBORw0KGgo=',
        content: 'Data URI portrait loaded.',
      },
    ];

    render(<ChatMessageStream messages={messages} />);

    const log = screen.getByRole('log');
    expect(log).toHaveAttribute('data-streaming', 'true');
    expect(log).toHaveAttribute('data-count', '9');

    // System notices
    expect(screen.getByText('Session started in Alabaster optical mode.')).toBeInTheDocument();
    expect(screen.getByText('System context ready')).toBeInTheDocument();
    expect(screen.getByText('Context window expanded.')).toBeInTheDocument();

    // User bubbles: sent + footer, sending, error
    expect(screen.getByText('Explain optical caustic tokens.')).toBeInTheDocument();
    expect(screen.getByText('Edited 09:01')).toBeInTheDocument();
    expect(screen.getByTestId('message-sending-user-2')).toHaveTextContent('Sending...');
    expect(screen.getByTestId('message-error-user-3')).toHaveTextContent('Delivery failed');

    // Assistant avatar loads safely and falls back to initials on image error
    const avatarImg = screen.getByAltText('Prism Assistant');
    expect(avatarImg).toHaveAttribute('src', 'https://cdn.example.com/prism-avatar.png');
    expect(avatarImg).toHaveAttribute('referrerpolicy', 'no-referrer');
    fireEvent.error(avatarImg);
    expect(screen.getByRole('img', { name: 'Prism Assistant' })).toHaveTextContent('PA');

    // Assistant footer slot
    expect(screen.getByRole('button', { name: 'Copy citation' })).toBeInTheDocument();

    // Streaming pulse badge & caret + single-word author initials
    expect(screen.getByTestId('stream-indicator-assistant-2')).toHaveTextContent('Streaming');
    expect(screen.getByTestId('stream-caret-assistant-2')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Refractor' })).toHaveTextContent('RE');

    // Blank author fallback initials ('AI') + assistant error badge
    const assistantCards = screen.getAllByRole('img', { name: 'Assistant' });
    expect(assistantCards).toHaveLength(2);
    expect(assistantCards[0]).toHaveTextContent('AI');
    expect(screen.getByTestId('message-error-assistant-3')).toHaveTextContent('Error');

    // Raster data URI avatar allowed
    expect(screen.getByAltText('Assistant')).toHaveAttribute(
      'src',
      'data:image/png;base64,iVBORw0KGgo='
    );
  });

  it('tracks scroll position, shows Jump to latest when scrolled up, and respects autoScroll', () => {
    const onScroll = vi.fn();
    const { rerender } = render(
      <ChatMessageStream messages={BASE_MESSAGES} onScroll={onScroll} />
    );

    const log = screen.getByRole('log');
    let currentScrollTop = 700;
    Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(log, 'clientHeight', { configurable: true, value: 300 });
    Object.defineProperty(log, 'scrollTop', {
      configurable: true,
      get: () => currentScrollTop,
      set: (val: number) => {
        currentScrollTop = val;
      },
    });

    // Fallback scrollTop path (when scrollTo is not present on element)
    rerender(
      <ChatMessageStream
        messages={[
          ...BASE_MESSAGES,
          { id: 'u-next', role: 'user', content: 'Another message triggers autoScroll.' },
        ]}
        onScroll={onScroll}
      />
    );
    expect(currentScrollTop).toBe(1000);
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument();

    // User scrolls up away from bottom -> Jump to latest appears and caller onScroll fires
    currentScrollTop = 120;
    fireEvent.scroll(log);
    expect(onScroll).toHaveBeenCalledTimes(1);
    const jumpButton = screen.getByRole('button', { name: 'Jump to latest' });
    expect(jumpButton).toBeInTheDocument();

    // Incoming message while user scrolled up does NOT yank scrollTop back down
    rerender(
      <ChatMessageStream
        messages={[
          ...BASE_MESSAGES,
          { id: 'u-next', role: 'user', content: 'Another message triggers autoScroll.' },
          { id: 'a-next', role: 'assistant', content: 'Streaming reply while reading history.' },
        ]}
        onScroll={onScroll}
      />
    );
    expect(currentScrollTop).toBe(120);

    // Attach element.scrollTo and click Jump to latest -> smooth scroll & button hides
    const scrollToSpy = vi.fn();
    log.scrollTo = scrollToSpy;
    fireEvent.click(jumpButton);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' });
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument();

    // New message while autoScroll={true} calls scrollTo with 'auto'
    rerender(
      <ChatMessageStream
        messages={[
          ...BASE_MESSAGES,
          { id: 'u-next', role: 'user', content: 'Another message triggers autoScroll.' },
          { id: 'a-next', role: 'assistant', content: 'Streaming reply while reading history. More.' },
        ]}
        onScroll={onScroll}
      />
    );
    expect(scrollToSpy).toHaveBeenLastCalledWith({ top: 1000, behavior: 'auto' });

    // Scrolling back near bottom manually clears Jump button cleanly
    currentScrollTop = 100;
    fireEvent.scroll(log);
    expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeInTheDocument();
    currentScrollTop = 690;
    fireEvent.scroll(log);
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument();

    // autoScroll={false} skips automatic scrolling
    scrollToSpy.mockClear();
    rerender(
      <ChatMessageStream
        messages={[
          ...BASE_MESSAGES,
          { id: 'a-manual', role: 'assistant', content: 'Manual scroll mode message.' },
        ]}
        autoScroll={false}
      />
    );
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('deduplicates duplicate IDs and blocks XSS and unsafe avatar protocols (adversarial)', () => {
    const xssPayload = '<script>window.__chatXss=1</script><img src=x onerror=alert(1)>';
    const adversarialMessages: ChatMessage[] = [
      {
        id: '__proto__',
        role: 'assistant',
        author: xssPayload,
        avatarSrc: 'javascript:alert(1)',
        content: xssPayload,
      },
      {
        id: '__proto__',
        role: 'assistant',
        author: 'Duplicate Entry',
        content: 'Duplicate content should be ignored.',
      },
      {
        id: 'constructor',
        role: 'assistant',
        author: 'Safe Model',
        avatarSrc: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        content: 'Prototype key safe.',
      },
    ];

    render(<ChatMessageStream messages={adversarialMessages} />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.queryByText('Duplicate content should be ignored.')).not.toBeInTheDocument();
    expect(screen.getAllByText(xssPayload)).toHaveLength(2);
    expect(screen.getByText('Prototype key safe.')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveAttribute('data-count', '2');
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xssPayload);
  });
});
