import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DistributedTraceWaterfall,
  type TraceSpanItem,
  type DistributedTraceSpanStatusMap,
} from './index';

describe('DistributedTraceWaterfall', () => {
  it('renders Astryx contracts, default 8-span 420.0 ms OpenTelemetry checkout trace, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const statusMapCheck: DistributedTraceSpanStatusMap = {
      ok: true,
      slow: true,
      error: true,
    };
    expect(statusMapCheck.ok && statusMapCheck.slow && statusMapCheck.error).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            DistributedTraceWaterfall: {
              className: 'theme-trace-waterfall',
              style: { maxWidth: '960px' },
            },
          },
        }}
      >
        <DistributedTraceWaterfall
          ref={ref}
          className="local-trace-waterfall"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="trace-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('trace-root');
    expect(ref.current).toBe(root);
    expect(DistributedTraceWaterfall.displayName).toBe('DistributedTraceWaterfall');
    expect(root).toHaveClass(
      'refractor-distributed-trace-waterfall',
      'prism-slab',
      'theme-trace-waterfall',
      'local-trace-waterfall'
    );
    expect(root).toHaveStyle({ maxWidth: '960px', marginTop: '8px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-has-errors', 'true');
    expect(root).toHaveAttribute('data-has-selection', 'true');

    // Header telemetry pills
    expect(
      screen.getByRole('heading', { name: 'Distributed Trace Waterfall' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('trace-waterfall-trace-id')).toHaveTextContent('tr-9f4a-8c21');
    expect(screen.getByTestId('trace-waterfall-duration')).toHaveTextContent('420.0 ms');
    expect(screen.getByTestId('trace-waterfall-span-count')).toHaveTextContent('8 spans');

    const errorBadge = screen.getByTestId('trace-waterfall-error-badge');
    expect(errorBadge).toHaveTextContent('2 errors');
    expect(errorBadge.style.color).toBe('var(--prism-error-main)');

    // Responsive prism-well viewport & shared ruler ticks
    const viewport = screen.getByTestId('trace-waterfall-viewport');
    expect(viewport).toHaveClass('prism-well', 'rounded-2xl', 'p-3', 'overflow-x-auto');
    expect(screen.getByTestId('trace-ruler-tick-0')).toHaveTextContent('0ms');
    expect(screen.getByTestId('trace-ruler-tick-25')).toHaveTextContent('25% (105ms)');
    expect(screen.getByTestId('trace-ruler-tick-50')).toHaveTextContent('50% (210ms)');
    expect(screen.getByTestId('trace-ruler-tick-75')).toHaveTextContent('75% (315ms)');
    expect(screen.getByTestId('trace-ruler-tick-100')).toHaveTextContent('100% (420ms)');

    // 8 spans rendered across all 5 default services
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByTestId('trace-span-service-span-root')).toHaveTextContent('api-gateway');
    expect(screen.getByTestId('trace-span-service-span-auth')).toHaveTextContent('auth-svc');
    expect(screen.getByTestId('trace-span-service-span-pg-cart')).toHaveTextContent(
      'postgres-primary'
    );
    expect(screen.getByTestId('trace-span-service-span-redis-session')).toHaveTextContent(
      'redis-cache'
    );
    expect(screen.getByTestId('trace-span-service-span-billing-charge')).toHaveTextContent(
      'billing-worker'
    );

    // Semantic bar tokens: error -> --prism-error-main, slow -> --prism-warning-main, ok -> service token
    expect(screen.getByTestId('trace-span-bar-span-root').style.backgroundColor).toBe(
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('trace-span-bar-span-billing-charge').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('trace-span-bar-span-auth').style.backgroundColor).toBe(
      'var(--prism-info-main)'
    );
    expect(screen.getByTestId('trace-span-bar-span-pg-cart').style.backgroundColor).toBe(
      'var(--prism-secondary-main)'
    );
    expect(screen.getByTestId('trace-span-bar-span-redis-session').style.backgroundColor).toBe(
      'var(--prism-success-main)'
    );

    // Critical path badge present on critical spans and omitted on non-critical spans
    expect(screen.getByTestId('trace-span-critical-span-root')).toBeInTheDocument();
    expect(screen.queryByTestId('trace-span-critical-span-redis-session')).toBeNull();

    // Recessed aria-live="polite" span inspector renders default root span metadata & tags
    const inspector = screen.getByTestId('trace-span-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('trace-inspector-id')).toHaveTextContent('span-root');
    expect(screen.getByTestId('trace-inspector-parent')).toHaveTextContent('root');
    expect(screen.getByTestId('trace-inspector-status')).toHaveTextContent('Error');
    expect(screen.getByTestId('trace-inspector-duration')).toHaveTextContent('420.0 ms (100%)');
    expect(screen.getByTestId('trace-inspector-tags')).toHaveTextContent('http.method=POST');
    expect(screen.getByTestId('trace-inspector-tags')).toHaveTextContent('http.status_code=502');
  });

  it('selects spans via click and IME-safe Enter/Space, firing onSelectSpan and updating the live inspector', () => {
    const onSelectSpan = vi.fn<(span: TraceSpanItem) => void>();

    render(<DistributedTraceWaterfall onSelectSpan={onSelectSpan} aria-label="Custom Trace" />);

    // Click a slow span
    const slowRow = screen.getByTestId('trace-span-row-span-billing-charge');
    fireEvent.click(slowRow);
    expect(onSelectSpan).toHaveBeenCalledTimes(1);
    expect(onSelectSpan.mock.calls[0]?.[0].id).toBe('span-billing-charge');
    expect(slowRow).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('trace-inspector-id')).toHaveTextContent('span-billing-charge');
    expect(screen.getByTestId('trace-inspector-parent')).toHaveTextContent('span-root');
    expect(screen.getByTestId('trace-inspector-status')).toHaveTextContent('Slow');
    expect(screen.getByTestId('trace-inspector-critical')).toBeInTheDocument();
    expect(screen.getByTestId('trace-inspector-tags')).toHaveTextContent(
      'payment.provider=stripe-v2'
    );

    // IME composing Enter MUST NOT select
    const redisRow = screen.getByTestId('trace-span-row-span-redis-session');
    fireEvent.keyDown(redisRow, { key: 'Enter', isComposing: true });
    expect(onSelectSpan).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('trace-inspector-id')).toHaveTextContent('span-billing-charge');

    // Non-activation key MUST NOT select
    fireEvent.keyDown(redisRow, { key: 'Escape' });
    expect(onSelectSpan).toHaveBeenCalledTimes(1);

    // IME-safe Enter selects non-critical ok span
    fireEvent.keyDown(redisRow, { key: 'Enter' });
    expect(onSelectSpan).toHaveBeenCalledTimes(2);
    expect(onSelectSpan.mock.calls[1]?.[0].id).toBe('span-redis-session');
    expect(screen.getByTestId('trace-inspector-status')).toHaveTextContent('OK');
    expect(screen.queryByTestId('trace-inspector-critical')).toBeNull();
    expect(screen.getByTestId('trace-inspector-tags')).toHaveTextContent('cache.hit=true');

    // IME-safe Space selects error webhook span
    const webhookRow = screen.getByTestId('trace-span-row-span-billing-webhook');
    fireEvent.keyDown(webhookRow, { key: ' ' });
    expect(onSelectSpan).toHaveBeenCalledTimes(3);
    expect(onSelectSpan.mock.calls[2]?.[0].id).toBe('span-billing-webhook');
    expect(screen.getByTestId('trace-inspector-tags')).toHaveTextContent(
      'error.type=UpstreamTimeoutError'
    );
  });

  it('collapses and expands parent spans via aria-expanded chevrons', () => {
    render(<DistributedTraceWaterfall />);

    const billingToggle = screen.getByTestId('trace-span-toggle-span-billing-charge');
    expect(billingToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('trace-span-row-span-pg-ledger')).toBeInTheDocument();
    expect(screen.getByTestId('trace-span-row-span-billing-webhook')).toBeInTheDocument();

    // Collapse billing-charge -> hides its 2 child spans
    fireEvent.click(billingToggle);
    expect(billingToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('trace-span-row-span-pg-ledger')).toBeNull();
    expect(screen.queryByTestId('trace-span-row-span-billing-webhook')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);

    // Re-expand billing-charge -> restores its 2 child spans
    fireEvent.click(billingToggle);
    expect(billingToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('listitem')).toHaveLength(8);

    // Leaf span has no collapse toggle button
    expect(screen.queryByTestId('trace-span-toggle-span-pg-ledger')).toBeNull();
  });

  it('filters by Errors Only and Critical Path, resets cleanly, and handles zero-match filter states', () => {
    const { unmount } = render(<DistributedTraceWaterfall data-testid="filter-root" />);

    const errorsBtn = screen.getByTestId('trace-filter-errors');
    const criticalBtn = screen.getByTestId('trace-filter-critical');

    // Select a non-error span first, then enable Errors Only -> inspector falls back to first visible error span
    fireEvent.click(screen.getByTestId('trace-span-row-span-redis-session'));
    expect(screen.getByTestId('trace-inspector-id')).toHaveTextContent('span-redis-session');

    fireEvent.click(errorsBtn);
    expect(errorsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('trace-waterfall-span-count')).toHaveTextContent('2 / 8 spans');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByTestId('trace-inspector-id')).toHaveTextContent('span-root');

    // Combine with Critical Path and then reset via header Reset button
    fireEvent.click(criticalBtn);
    expect(criticalBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    fireEvent.click(screen.getByTestId('trace-filter-reset'));
    expect(errorsBtn).toHaveAttribute('aria-pressed', 'false');
    expect(criticalBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByRole('listitem')).toHaveLength(8);

    // Critical Path only narrows 8 -> 6 spans
    fireEvent.click(criticalBtn);
    expect(screen.getByTestId('trace-waterfall-span-count')).toHaveTextContent('6 / 8 spans');
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    unmount();

    // All-OK trace -> Errors Only shows clean role="status" empty filtered state + Reset Filters button
    const healthySpans: TraceSpanItem[] = [
      {
        id: 'ok-1',
        service: 'api-gateway',
        operation: 'GET /healthz',
        startMs: 0,
        durationMs: 12,
        status: 'ok',
      },
    ];
    render(<DistributedTraceWaterfall spans={healthySpans} />);
    expect(screen.getByTestId('trace-waterfall-span-count')).toHaveTextContent('1 span');
    expect(screen.getByTestId('trace-waterfall-error-badge')).toHaveTextContent('0 errors');
    expect(screen.getByTestId('trace-waterfall-error-badge').style.color).toBe(
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('trace-inspector-no-tags')).toHaveTextContent(
      'No tags attached to this span.'
    );

    fireEvent.click(screen.getByTestId('trace-filter-errors'));
    const filteredEmpty = screen.getByRole('status');
    expect(filteredEmpty).toHaveTextContent('No trace spans match the active filters.');
    expect(screen.queryByTestId('trace-span-inspector')).toBeNull();

    fireEvent.click(screen.getByTestId('trace-waterfall-empty-reset'));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByTestId('trace-span-inspector')).toBeInTheDocument();
  });

  it('renders clean role="status" empty state for spans=[] and handles zero-duration / singular error traces', () => {
    const { unmount } = render(
      <DistributedTraceWaterfall
        spans={[]}
        title="   "
        traceId="   "
        data-testid="empty-trace-root"
      />
    );

    const root = screen.getByTestId('empty-trace-root');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('heading', { name: 'Distributed Trace Waterfall' })).toBeInTheDocument();
    expect(screen.getByTestId('trace-waterfall-trace-id')).toHaveTextContent('tr-9f4a-8c21');
    expect(screen.getByTestId('trace-waterfall-duration')).toHaveTextContent('0.0 ms');
    expect(screen.getByTestId('trace-waterfall-span-count')).toHaveTextContent('0 spans');
    expect(screen.getByTestId('trace-waterfall-error-badge')).toHaveTextContent('0 errors');
    expect(screen.getByRole('status')).toHaveTextContent('No trace spans recorded');
    expect(screen.queryByTestId('trace-span-inspector')).toBeNull();
    unmount();

    // Single zero-duration error span exercises singular '1 error' and totalDurationMs === 0 safe horizon
    render(
      <DistributedTraceWaterfall
        traceId="tr-zero-1"
        title="Instant Failure Trace"
        spans={[
          {
            id: 'zero-err',
            service: 'api-gateway',
            operation: 'HEAD /ping',
            startMs: 0,
            durationMs: 0,
            status: 'error',
          },
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: 'Instant Failure Trace' })).toBeInTheDocument();
    expect(screen.getByTestId('trace-waterfall-trace-id')).toHaveTextContent('tr-zero-1');
    expect(screen.getByTestId('trace-waterfall-error-badge')).toHaveTextContent('1 error');
    expect(screen.getByTestId('trace-inspector-duration')).toHaveTextContent('0.0 ms (0%)');
  });

  it('safely caps deep nesting at depth 8 and breaks self-cycles, mutual cycles, and orphan parents', () => {
    const deepChain: TraceSpanItem[] = Array.from({ length: 11 }, (_, idx) => ({
      id: `d-${idx}`,
      parentId: idx === 0 ? null : `d-${idx - 1}`,
      service: 'api-gateway',
      operation: `hop-${idx}`,
      startMs: idx * 5,
      durationMs: 10,
      status: 'ok',
    }));

    const cyclicAndOrphanSpans: TraceSpanItem[] = [
      ...deepChain,
      {
        id: 'self-loop',
        parentId: 'self-loop',
        service: 'auth-svc',
        operation: 'SelfLoopOp',
        startMs: 0,
        durationMs: 20,
      },
      {
        id: 'orphan-span',
        parentId: 'missing-parent-999',
        service: 'redis-cache',
        operation: 'OrphanOp',
        startMs: 5,
        durationMs: 15,
      },
      {
        id: 'cyc-a',
        parentId: 'cyc-b',
        service: 'billing-worker',
        operation: 'CycleA',
        startMs: 10,
        durationMs: 25,
      },
      {
        id: 'cyc-b',
        parentId: 'cyc-a',
        service: 'postgres-primary',
        operation: 'CycleB',
        startMs: 15,
        durationMs: 15,
      },
    ];

    render(<DistributedTraceWaterfall spans={cyclicAndOrphanSpans} />);

    // All 15 spans rendered without infinite recursion or dropped cycle spans
    expect(screen.getAllByRole('listitem')).toHaveLength(15);

    // Depth capped strictly at 8 for d-8, d-9, d-10
    expect(screen.getByTestId('trace-span-row-d-0')).toHaveAttribute('data-span-depth', '0');
    expect(screen.getByTestId('trace-span-row-d-7')).toHaveAttribute('data-span-depth', '7');
    expect(screen.getByTestId('trace-span-row-d-8')).toHaveAttribute('data-span-depth', '8');
    expect(screen.getByTestId('trace-span-row-d-9')).toHaveAttribute('data-span-depth', '8');
    expect(screen.getByTestId('trace-span-row-d-10')).toHaveAttribute('data-span-depth', '8');

    // Self-cycle and orphan treated as roots (depth 0); mutual cycle recovered cleanly
    expect(screen.getByTestId('trace-span-row-self-loop')).toHaveAttribute('data-span-depth', '0');
    expect(screen.getByTestId('trace-span-row-orphan-span')).toHaveAttribute(
      'data-span-depth',
      '0'
    );
    expect(screen.getByTestId('trace-span-row-cyc-a')).toHaveAttribute('data-span-depth', '0');
    expect(screen.getByTestId('trace-span-row-cyc-b')).toHaveAttribute('data-span-depth', '1');
  });

  it('sanitizes adversarial inputs, deduplicates IDs, renders XSS payloads literally, and hashes custom services across all 5 tones', () => {
    const adversarialSpans: TraceSpanItem[] = [
      {
        id: '   ',
        service: 'ignored',
        operation: 'IgnoredBlankId',
        startMs: 0,
        durationMs: 10,
      },
      {
        id: 'adv-1',
        service: '   ',
        operation: '   ',
        startMs: Number.NaN,
        durationMs: -42,
        tags: [
          { key: '   ', value: 'skipped' },
          { key: 'payload', value: '<script>window.__xss=1</script>' },
          { key: 'payload', value: '<script>window.__xss=1</script>' },
        ],
      },
      {
        id: 'adv-1',
        service: 'duplicate-ignored',
        operation: 'DuplicateShouldBeSkipped',
        startMs: 10,
        durationMs: 100,
      },
      // Five consecutive custom service names deterministically exercise all 5 hash tone buckets
      { id: 'c-a', service: 'svc-a', operation: 'op-a', startMs: 0, durationMs: 20, status: 'ok' },
      { id: 'c-b', service: 'svc-b', operation: 'op-b', startMs: 5, durationMs: 20, status: 'ok' },
      { id: 'c-c', service: 'svc-c', operation: 'op-c', startMs: 10, durationMs: 20, status: 'ok' },
      { id: 'c-d', service: 'svc-d', operation: 'op-d', startMs: 15, durationMs: 20, status: 'ok' },
      { id: 'c-e', service: 'svc-e', operation: 'op-e', startMs: 20, durationMs: 20, status: 'ok' },
    ];

    render(<DistributedTraceWaterfall spans={adversarialSpans} />);

    // Blank and duplicate IDs filtered out -> 6 unique spans remain
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(document.querySelector('script')).toBeNull();

    // Blank service/operation fallback + negative/NaN numbers sanitized to 0.0 ms
    expect(screen.getByTestId('trace-span-service-adv-1')).toHaveTextContent('unknown-service');
    expect(screen.getByTestId('trace-span-operation-adv-1')).toHaveTextContent('unnamed-operation');
    expect(screen.getByTestId('trace-span-duration-adv-1')).toHaveTextContent('0.0 ms');

    // Duplicate XSS tags rendered literally without key collision
    const tagChips = screen.getAllByTestId('trace-inspector-tag-chip');
    expect(tagChips).toHaveLength(2);
    expect(tagChips[0]).toHaveTextContent('payload=<script>window.__xss=1</script>');

    // All 5 deterministic service tones assigned across svc-a..svc-e
    const tones = new Set(
      ['c-a', 'c-b', 'c-c', 'c-d', 'c-e'].map((id) =>
        screen.getByTestId(`trace-span-service-${id}`).getAttribute('data-service-tone')
      )
    );
    expect(tones).toEqual(new Set(['primary', 'secondary', 'emerald', 'amber', 'info']));
  });
});
