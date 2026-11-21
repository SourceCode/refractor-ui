import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { LiveLogStreamer, type LogEntry } from './LiveLogStreamer';

const SAMPLE_ENTRIES: LogEntry[] = [
  {
    id: 'log-1',
    timestamp: '10:15:01.002',
    severity: 'debug',
    source: 'scheduler',
    message: 'Checking job queue capacity',
  },
  {
    id: 'log-2',
    timestamp: '10:15:02.115',
    severity: 'info',
    source: 'builder',
    message: 'Compiled core bundle in 420ms',
  },
  {
    id: 'log-3',
    timestamp: '10:15:03.409',
    severity: 'warn',
    source: 'cache',
    message: 'Cache miss detected for prism theme tokens',
  },
  {
    id: 'log-4',
    timestamp: '10:15:04.880',
    severity: 'error',
    message: 'Connection refused on upstream registry',
  },
];

describe('LiveLogStreamer', () => {
  it('renders optical slab, forwards React 19 ref, composes theme overrides, and displays per-severity counts', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            LiveLogStreamer: {
              className: 'theme-log-slab',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <LiveLogStreamer
          ref={ref}
          entries={SAMPLE_ENTRIES}
          className="local-log-slab"
          xstyle={{ '--prism-slab-blur-px': '28px' }}
          style={{ marginBottom: '12px' }}
          data-testid="log-streamer"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('log-streamer');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-live-log-streamer',
      'prism-slab',
      'theme-log-slab',
      'local-log-slab'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.2px', marginBottom: '12px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('28px');
    expect(root).toHaveAttribute('data-following', 'true');
    expect(root).toHaveAttribute('aria-labelledby');

    expect(screen.getByText('Live Log Stream')).toBeInTheDocument();
    expect(screen.getByTestId('live-log-count')).toHaveTextContent('4/4');

    const logRegion = screen.getByRole('log');
    expect(logRegion).toHaveAttribute('aria-live', 'polite');
    expect(logRegion).toHaveStyle({ maxHeight: '280px' });

    const debugBtn = screen.getByRole('button', { name: /Debug 1/i });
    const infoBtn = screen.getByRole('button', { name: /Info 1/i });
    const warnBtn = screen.getByRole('button', { name: /Warn 1/i });
    const errorBtn = screen.getByRole('button', { name: /Error 1/i });
    expect(debugBtn).toHaveAttribute('aria-pressed', 'true');
    expect(infoBtn).toHaveAttribute('aria-pressed', 'true');
    expect(warnBtn).toHaveAttribute('aria-pressed', 'true');
    expect(errorBtn).toHaveAttribute('aria-pressed', 'true');

    expect(screen.getByText('scheduler')).toBeInTheDocument();
    expect(screen.getByText('Connection refused on upstream registry')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Jump to Bottom' })).toBeNull();
  });

  it('filters entries case-insensitively by message, source, and timestamp and supports IME-safe Escape and Clear button', () => {
    render(
      <LiveLogStreamer
        entries={SAMPLE_ENTRIES}
        title="Build Console"
        aria-label="Custom log label"
      />
    );

    const searchInput = screen.getByRole('textbox', { name: 'Filter log entries' });

    // Match by message (case-insensitive)
    fireEvent.change(searchInput, { target: { value: 'UPSTREAM' } });
    expect(screen.getByTestId('live-log-count')).toHaveTextContent('1/4');
    expect(screen.getByText('Connection refused on upstream registry')).toBeInTheDocument();
    expect(screen.queryByText('Checking job queue capacity')).toBeNull();

    // IME composing Escape must NOT clear the query
    fireEvent.keyDown(searchInput, { key: 'Escape', isComposing: true });
    expect(searchInput).toHaveValue('UPSTREAM');

    // Non-Escape key leaves query intact
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(searchInput).toHaveValue('UPSTREAM');

    // Non-composing Escape clears the query
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('live-log-count')).toHaveTextContent('4/4');

    // Escape when already empty is a clean no-op
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');

    // Match by source (case-insensitive)
    fireEvent.change(searchInput, { target: { value: 'CACHE' } });
    expect(screen.getByTestId('live-log-count')).toHaveTextContent('1/4');
    expect(screen.getByText('Cache miss detected for prism theme tokens')).toBeInTheDocument();

    // Clear search button clears the query
    fireEvent.click(screen.getByRole('button', { name: 'Clear log search' }));
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('live-log-count')).toHaveTextContent('4/4');

    // Match by timestamp
    fireEvent.change(searchInput, { target: { value: '10:15:02' } });
    expect(screen.getByTestId('live-log-count')).toHaveTextContent('1/4');
    expect(screen.getByText('Compiled core bundle in 420ms')).toBeInTheDocument();

    // No match displays emptyMessage
    fireEvent.change(searchInput, { target: { value: 'nonexistent-token' } });
    expect(screen.getByTestId('live-log-empty')).toHaveTextContent('No matching log entries.');
  });

  it('toggles severity filters, honors defaultSeverities, and invokes optional onClear', () => {
    const onClear = vi.fn();
    render(
      <LiveLogStreamer
        entries={SAMPLE_ENTRIES}
        defaultSeverities={['warn', 'error']}
        emptyMessage="All logs filtered out."
        onClear={onClear}
        data-testid="filtered-streamer"
      />
    );

    expect(screen.getByTestId('filtered-streamer')).toHaveAttribute('data-filtered', 'true');
    expect(screen.getByTestId('live-log-count')).toHaveTextContent('2/4');

    const debugBtn = screen.getByRole('button', { name: /Debug 1/i });
    const warnBtn = screen.getByRole('button', { name: /Warn 1/i });
    const errorBtn = screen.getByRole('button', { name: /Error 1/i });

    expect(debugBtn).toHaveAttribute('aria-pressed', 'false');
    expect(warnBtn).toHaveAttribute('aria-pressed', 'true');
    expect(errorBtn).toHaveAttribute('aria-pressed', 'true');

    // Re-enable debug
    fireEvent.click(debugBtn);
    expect(debugBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('live-log-count')).toHaveTextContent('3/4');

    // Disable all active severities -> shows custom emptyMessage
    fireEvent.click(debugBtn);
    fireEvent.click(warnBtn);
    fireEvent.click(errorBtn);
    expect(screen.getByTestId('live-log-empty')).toHaveTextContent('All logs filtered out.');
    expect(screen.getByTestId('filtered-streamer')).toHaveAttribute('data-empty', 'true');

    // Clear button invokes onClear
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('auto-scrolls when following, toggles Follow/Paused, pauses on manual scroll up, and jumps to bottom', () => {
    const { rerender } = render(
      <LiveLogStreamer entries={SAMPLE_ENTRIES.slice(0, 2)} defaultFollowing />
    );

    const logRegion = screen.getByRole('log');
    Object.defineProperty(logRegion, 'scrollHeight', { configurable: true, value: 600 });
    Object.defineProperty(logRegion, 'clientHeight', { configurable: true, value: 200 });

    // Adding a new entry while following scrolls to bottom
    rerender(<LiveLogStreamer entries={SAMPLE_ENTRIES} defaultFollowing />);
    expect(logRegion.scrollTop).toBe(600);

    // Scrolling near bottom keeps following enabled
    logRegion.scrollTop = 390;
    fireEvent.scroll(logRegion);
    expect(logRegion).toHaveAttribute('aria-live', 'polite');

    // Scrolling significantly upward pauses following and reveals Jump to Bottom
    logRegion.scrollTop = 100;
    fireEvent.scroll(logRegion);
    expect(logRegion).toHaveAttribute('aria-live', 'off');
    expect(screen.getByRole('button', { name: 'Paused' })).toHaveAttribute('aria-pressed', 'false');

    // Subsequent scroll while paused stays paused
    fireEvent.scroll(logRegion);
    expect(logRegion).toHaveAttribute('aria-live', 'off');

    // Updating entries while paused does NOT override scrollTop
    rerender(
      <LiveLogStreamer
        entries={[
          ...SAMPLE_ENTRIES,
          {
            id: 'log-5',
            timestamp: '10:15:06.100',
            severity: 'info',
            message: 'New log while paused',
          },
        ]}
        defaultFollowing
      />
    );
    expect(logRegion.scrollTop).toBe(100);

    // Clicking Jump to Bottom scrolls to bottom and resumes following
    fireEvent.click(screen.getByRole('button', { name: 'Jump to Bottom' }));
    expect(logRegion.scrollTop).toBe(600);
    expect(logRegion).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('button', { name: 'Jump to Bottom' })).toBeNull();

    // Clicking Follow pauses tailing explicitly
    fireEvent.click(screen.getByRole('button', { name: 'Follow' }));
    expect(logRegion).toHaveAttribute('aria-live', 'off');
    expect(screen.getByRole('button', { name: 'Jump to Bottom' })).toBeInTheDocument();
  });

  it('respects defaultFollowing=false and clamps maxHeight between 120 and 800 (including non-finite fallback)', () => {
    const { rerender } = render(
      <LiveLogStreamer entries={SAMPLE_ENTRIES} defaultFollowing={false} maxHeight={40} />
    );

    const logRegion = screen.getByRole('log');
    expect(logRegion).toHaveAttribute('aria-live', 'off');
    expect(logRegion).toHaveStyle({ maxHeight: '120px' });
    expect(screen.getByRole('button', { name: 'Jump to Bottom' })).toBeInTheDocument();

    rerender(<LiveLogStreamer entries={SAMPLE_ENTRIES} defaultFollowing={false} maxHeight={1500} />);
    expect(logRegion).toHaveStyle({ maxHeight: '800px' });

    rerender(
      <LiveLogStreamer entries={SAMPLE_ENTRIES} defaultFollowing={false} maxHeight={Number.NaN} />
    );
    expect(logRegion).toHaveStyle({ maxHeight: '280px' });
  });

  it('renders adversarial XSS payloads as literal text without injecting DOM nodes', () => {
    const payload = '<script>window.__logXss=1</script><img src=x onerror=alert(1)>';
    render(
      <LiveLogStreamer
        title={payload}
        emptyMessage={payload}
        entries={[
          {
            id: 'xss-1',
            timestamp: payload,
            severity: 'error',
            source: payload,
            message: payload,
          },
        ]}
      />
    );

    expect(screen.getAllByText(payload).length).toBeGreaterThanOrEqual(4);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
