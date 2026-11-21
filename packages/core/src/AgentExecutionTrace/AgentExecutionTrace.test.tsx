import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AgentExecutionTrace,
  type TraceSpan,
  type TraceSpanKind,
  type TraceSpanStatus,
} from './index';

const SAMPLE_SPANS: TraceSpan[] = [
  {
    id: 'span-1',
    agentName: 'Planner',
    label: 'Generate execution graph',
    kind: 'llm',
    status: 'ok',
    startMs: 0,
    durationMs: 400,
    tokens: 1200,
    detail: 'Produced 3 parallel workstreams with dependency edges.',
  },
  {
    id: 'span-2',
    agentName: 'Retriever',
    label: 'Query optical token specs',
    kind: 'retrieval',
    status: 'ok',
    startMs: 400,
    durationMs: 250,
    tokens: 340,
  },
  {
    id: 'span-3',
    agentName: 'Planner',
    label: 'Delegate build slice',
    kind: 'handoff',
    status: 'running',
    startMs: 650,
    durationMs: 150,
  },
  {
    id: 'span-4',
    agentName: 'Builder',
    label: 'Run strict ESLint gate',
    kind: 'tool',
    status: 'error',
    startMs: 800,
    durationMs: 1200,
    tokens: 95,
    detail: 'Rule @refractor/no-raw-color flagged 1 literal.',
  },
];

describe('AgentExecutionTrace', () => {
  it('renders header metrics, filter pills, waterfall bars, all kinds/statuses, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AgentExecutionTrace: { className: 'theme-trace', style: { maxWidth: '820px' } },
          },
        }}
      >
        <AgentExecutionTrace
          ref={ref}
          spans={SAMPLE_SPANS}
          className="custom-trace"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="trace-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('trace-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-agent-execution-trace',
      'prism-slab',
      'theme-trace',
      'custom-trace'
    );
    expect(root).toHaveStyle({ maxWidth: '820px' });
    expect(root).toHaveAttribute('data-filter', 'all');
    expect(root).toHaveAttribute('data-has-error', 'true');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-has-selection');

    expect(
      screen.getByRole('heading', { name: 'Execution Waterfall Trace' })
    ).toBeInTheDocument();
    // Max end = 800 + 1200 = 2000ms -> 2.00s
    expect(screen.getByTestId('agent-trace-total-duration')).toHaveTextContent('2.00s');
    // Total tokens = 1200 + 340 + 0 + 95 = 1,635 tokens
    expect(screen.getByTestId('agent-trace-total-tokens')).toHaveTextContent('1,635 tokens');
    expect(screen.getByTestId('agent-trace-span-count')).toHaveTextContent('4 spans');

    // Filter pill initial aria-pressed states
    expect(screen.getByTestId('agent-trace-filter-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('agent-trace-filter-llm')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('agent-trace-filter-tool')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('agent-trace-filter-handoff')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByTestId('agent-trace-filter-retrieval')).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Check kind/status attributes and proportional bar geometry (horizon = 2000ms)
    const expectedKinds: readonly TraceSpanKind[] = ['llm', 'retrieval', 'handoff', 'tool'];
    const expectedStatuses: readonly TraceSpanStatus[] = ['ok', 'ok', 'running', 'error'];
    SAMPLE_SPANS.forEach((span, idx) => {
      const row = screen.getByTestId(`agent-trace-row-${span.id}`);
      expect(row).toHaveAttribute('data-span-kind', expectedKinds[idx]);
      expect(row).toHaveAttribute('data-span-status', expectedStatuses[idx]);
    });

    const bar1 = screen.getByTestId('agent-trace-bar-span-1');
    expect(bar1).toHaveStyle({ left: '0%', width: '20%', minWidth: '4%' });
    const bar4 = screen.getByTestId('agent-trace-bar-span-4');
    expect(bar4).toHaveStyle({ left: '40%', width: '60%', minWidth: '4%' });
    expect(screen.getByTestId('agent-trace-duration-span-1')).toHaveTextContent('400ms');
    expect(screen.getByTestId('agent-trace-duration-span-4')).toHaveTextContent('1.20s');

    // Drawer is closed before selection
    expect(screen.queryByTestId('agent-trace-detail')).not.toBeInTheDocument();
  });

  it('filters spans by kind and resets via Show all spans when a filter has no matches', () => {
    const partialSpans = SAMPLE_SPANS.slice(0, 2); // llm + retrieval only
    render(<AgentExecutionTrace title="Partial Run" spans={partialSpans} />);

    expect(screen.getByRole('heading', { name: 'Partial Run' })).toBeInTheDocument();
    expect(screen.getByTestId('agent-trace-total-duration')).toHaveTextContent('650ms');

    // Filter to LLM
    fireEvent.click(screen.getByTestId('agent-trace-filter-llm'));
    expect(screen.getByTestId('agent-trace-filter-llm')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('agent-trace-filter-all')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('agent-trace-span-count')).toHaveTextContent('1 / 2 spans');
    expect(screen.getByTestId('agent-trace-row-span-1')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-trace-row-span-2')).not.toBeInTheDocument();

    // Filter to Tool (no matches) -> shows filtered empty state & Show all spans reset button
    fireEvent.click(screen.getByTestId('agent-trace-filter-tool'));
    expect(screen.getByTestId('agent-trace-empty')).toHaveTextContent(
      'No trace spans match the active kind filter.'
    );
    const resetBtn = screen.getByRole('button', { name: 'Show all spans' });
    fireEvent.click(resetBtn);
    expect(screen.getByTestId('agent-trace-filter-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('agent-trace-row-span-1')).toBeInTheDocument();
    expect(screen.getByTestId('agent-trace-row-span-2')).toBeInTheDocument();
  });

  it('selects spans in uncontrolled and controlled modes and renders recessed detail drawer', () => {
    const onSelectSpan = vi.fn();
    render(
      <AgentExecutionTrace
        spans={SAMPLE_SPANS}
        defaultSelectedSpanId="span-1"
        onSelectSpan={onSelectSpan}
      />
    );

    // Default selection opens drawer with detail text and token count
    expect(screen.getByTestId('agent-trace-row-span-1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('agent-trace-detail-agent')).toHaveTextContent('Planner');
    expect(screen.getByTestId('agent-trace-detail-label')).toHaveTextContent(
      'Generate execution graph'
    );
    expect(screen.getByTestId('agent-trace-detail-start')).toHaveTextContent('0ms');
    expect(screen.getByTestId('agent-trace-detail-duration')).toHaveTextContent('400ms');
    expect(screen.getByTestId('agent-trace-detail-tokens')).toHaveTextContent('1,200');
    expect(screen.getByTestId('agent-trace-detail-text')).toHaveTextContent(
      'Produced 3 parallel workstreams with dependency edges.'
    );

    // Click span without tokens or detail -> shows em-dash for tokens and omits detail text
    fireEvent.click(screen.getByTestId('agent-trace-row-span-3'));
    expect(onSelectSpan).toHaveBeenCalledWith(SAMPLE_SPANS[2]);
    expect(screen.getByTestId('agent-trace-detail-label')).toHaveTextContent(
      'Delegate build slice'
    );
    expect(screen.getByTestId('agent-trace-detail-start')).toHaveTextContent('650ms');
    expect(screen.getByTestId('agent-trace-detail-duration')).toHaveTextContent('150ms');
    expect(screen.getByTestId('agent-trace-detail-tokens')).toHaveTextContent('—');
    expect(screen.queryByTestId('agent-trace-detail-text')).not.toBeInTheDocument();

    // Controlled harness verification
    function ControlledTrace() {
      const [selectedId, setSelectedId] = useState<string>('span-2');
      return (
        <AgentExecutionTrace
          spans={SAMPLE_SPANS}
          selectedSpanId={selectedId}
          onSelectSpan={(span) => setSelectedId(span.id)}
        />
      );
    }

    const { container } = render(<ControlledTrace />);
    expect(container.querySelector('[data-testid="agent-trace-detail-label"]')).toHaveTextContent(
      'Query optical token specs'
    );
    const controlledRow4 = container.querySelector('[data-testid="agent-trace-row-span-4"]');
    expect(controlledRow4).not.toBeNull();
    if (controlledRow4) {
      fireEvent.click(controlledRow4);
    }
    expect(container.querySelector('[data-testid="agent-trace-detail-label"]')).toHaveTextContent(
      'Run strict ESLint gate'
    );
  });

  it('sanitizes negative, NaN, and Infinity startMs, durationMs, and tokens safely', () => {
    const corruptedSpans: TraceSpan[] = [
      {
        id: 'bad-1',
        agentName: 'Guard',
        label: 'Negative values',
        kind: 'llm',
        status: 'ok',
        startMs: -120,
        durationMs: -45,
        tokens: -500,
      },
      {
        id: 'bad-2',
        agentName: 'Guard',
        label: 'NaN and Infinity',
        kind: 'tool',
        status: 'ok',
        startMs: Number.NaN,
        durationMs: Number.POSITIVE_INFINITY,
        tokens: Number.NEGATIVE_INFINITY,
      },
    ];

    render(
      <AgentExecutionTrace
        spans={corruptedSpans}
        defaultSelectedSpanId="bad-1"
      />
    );

    expect(screen.getByTestId('agent-trace-total-duration')).toHaveTextContent('0ms');
    expect(screen.getByTestId('agent-trace-total-tokens')).toHaveTextContent('0 tokens');
    expect(screen.getByTestId('agent-trace-bar-bad-1')).toHaveStyle({
      left: '0%',
      width: '0%',
      minWidth: '4%',
    });
    expect(screen.getByTestId('agent-trace-bar-bad-2')).toHaveStyle({
      left: '0%',
      width: '0%',
      minWidth: '4%',
    });
    expect(screen.getByTestId('agent-trace-detail-start')).toHaveTextContent('0ms');
    expect(screen.getByTestId('agent-trace-detail-duration')).toHaveTextContent('0ms');
    expect(screen.getByTestId('agent-trace-detail-tokens')).toHaveTextContent('0');
  });

  it('renders clean empty state and singular span count for 0 and 1 spans (negative & boundary test)', () => {
    const { rerender } = render(<AgentExecutionTrace spans={[]} data-testid="empty-trace" />);

    expect(screen.getByTestId('empty-trace')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('agent-trace-total-duration')).toHaveTextContent('0ms');
    expect(screen.getByTestId('agent-trace-total-tokens')).toHaveTextContent('0 tokens');
    expect(screen.getByTestId('agent-trace-span-count')).toHaveTextContent('0 spans');
    expect(screen.getByTestId('agent-trace-empty')).toHaveTextContent(
      'No execution spans recorded yet.'
    );
    expect(screen.queryByRole('button', { name: 'Show all spans' })).not.toBeInTheDocument();

    rerender(
      <AgentExecutionTrace
        spans={[SAMPLE_SPANS[0]!]}
        data-testid="empty-trace"
      />
    );
    expect(screen.getByTestId('agent-trace-span-count')).toHaveTextContent('1 span');
  });

  it('neutralizes adversarial XSS payloads and prototype-polluting span IDs', () => {
    const xssPayload = '<script>window.__traceXss=1</script><img src=x onerror=alert(1)>';
    const adversarialSpans: TraceSpan[] = [
      {
        id: '__proto__',
        agentName: xssPayload,
        label: xssPayload,
        kind: 'llm',
        status: 'error',
        startMs: 10,
        durationMs: 25,
        tokens: 12,
        detail: xssPayload,
      },
      {
        id: 'constructor',
        agentName: 'Safe Agent',
        label: 'Safe Span',
        kind: 'handoff',
        status: 'ok',
        startMs: 35,
        durationMs: 15,
      },
    ];

    render(
      <AgentExecutionTrace
        title={xssPayload}
        spans={adversarialSpans}
        defaultSelectedSpanId="__proto__"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    // title + row agentName + row label + drawer agentName + drawer label + drawer detail = 6
    expect(screen.getAllByText(xssPayload)).toHaveLength(6);
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xssPayload);
  });
});
