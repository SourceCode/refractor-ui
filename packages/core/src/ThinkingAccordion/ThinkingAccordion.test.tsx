import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ThinkingAccordion,
  type ThinkingStep,
  type ThinkingStepStatus,
} from './index';

const TRACE_STEPS: readonly ThinkingStep[] = [
  {
    id: 's1',
    title: 'Locate optical glass token definitions',
    toolName: 'search_docs',
    durationMs: 140,
    status: 'done',
    detail: 'Found --prism-slab-top and --prism-well-start in refractor.css.',
  },
  {
    id: 's2',
    title: 'Validate WCAG AA contrast ratios',
    toolName: 'contrast_audit',
    durationMs: 42.6,
    status: 'done',
    detail: 'All text tokens exceed 4.5:1 across light and dark modes.',
  },
  {
    id: 's3',
    title: 'Cross-check citation references',
    durationMs: 0,
    status: 'done',
  },
  {
    id: 's4',
    title: 'Synthesize grounded answer',
    status: 'active',
    detail: 'Formatting structured explanation.',
  },
];

describe('ThinkingAccordion', () => {
  it('renders collapsed by default with default title, tabular step count, durationLabel, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ThinkingAccordion: { className: 'theme-trace', style: { maxWidth: '640px' } },
          },
        }}
      >
        <ThinkingAccordion
          ref={ref}
          steps={TRACE_STEPS}
          durationLabel="1.4s"
          className="custom-trace"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="thinking-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('thinking-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-thinking-accordion', 'prism-slab', 'theme-trace', 'custom-trace');
    expect(root).toHaveStyle({ maxWidth: '640px' });
    expect(root).not.toHaveAttribute('data-open');
    expect(root).not.toHaveAttribute('data-streaming');
    expect(root).not.toHaveAttribute('data-empty');

    const trigger = screen.getByRole('button', { name: /Reasoning trace/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls');
    expect(screen.getByTestId('thinking-step-count')).toHaveTextContent('3/4 steps');
    expect(screen.getByTestId('thinking-duration-label')).toHaveTextContent('1.4s');
    expect(screen.queryByTestId('thinking-streaming-pill')).not.toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('toggles open/closed in uncontrolled mode and renders all step statuses, tool badges, durations, and details', () => {
    const onOpenChange = vi.fn();
    const allStatusSteps: readonly ThinkingStep[] = [
      ...TRACE_STEPS,
      {
        id: 's5',
        title: 'Rate limit exceeded on optional lookup',
        toolName: 'web_fetch',
        durationMs: 310,
        status: 'error',
        detail: 'Skipped optional external mirror.',
      },
      {
        id: 's6',
        title: 'Queued follow-up check',
      },
    ];

    render(
      <ThinkingAccordion
        steps={allStatusSteps}
        title="Model deliberation"
        onOpenChange={onOpenChange}
        data-testid="trace-all"
      />
    );

    const trigger = screen.getByRole('button', { name: /Model deliberation/ });
    fireEvent.click(trigger);

    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('trace-all')).toHaveAttribute('data-open', 'true');

    const region = screen.getByRole('region', { name: /Model deliberation/ });
    expect(region.id).toBe(trigger.getAttribute('aria-controls'));

    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(6);

    const expectedStatuses: readonly ThinkingStepStatus[] = [
      'done',
      'done',
      'done',
      'active',
      'error',
      'pending',
    ];
    items.forEach((item, idx) => {
      expect(item).toHaveAttribute('data-step-status', expectedStatuses[idx]);
    });

    expect(screen.getByTestId('thinking-step-tool-s1')).toHaveTextContent('search_docs');
    expect(screen.getByTestId('thinking-step-tool-s5')).toHaveTextContent('web_fetch');
    expect(screen.queryByTestId('thinking-step-tool-s3')).not.toBeInTheDocument();

    expect(screen.getByTestId('thinking-step-duration-s1')).toHaveTextContent('140ms');
    expect(screen.getByTestId('thinking-step-duration-s2')).toHaveTextContent('43ms');
    expect(screen.getByTestId('thinking-step-duration-s3')).toHaveTextContent('0ms');
    expect(screen.queryByTestId('thinking-step-duration-s4')).not.toBeInTheDocument();

    expect(within(region).getByText('Found --prism-slab-top and --prism-well-start in refractor.css.')).toBeInTheDocument();
    expect(within(region).getByText('Skipped optional external mirror.')).toBeInTheDocument();
    expect(within(region).getByText('Error')).toBeInTheDocument();
    expect(within(region).getByText('Pending')).toBeInTheDocument();
    expect(within(region).getByText('In progress')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('supports controlled open state and singular step count readout', () => {
    function ControlledHarness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Force Open
          </button>
          <ThinkingAccordion
            open={open}
            onOpenChange={setOpen}
            steps={[{ id: 'only', title: 'Single check', status: 'done' }]}
          />
        </div>
      );
    }

    render(<ControlledHarness />);
    expect(screen.getByTestId('thinking-step-count')).toHaveTextContent('1/1 step');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Force Open' }));
    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByText('Single check')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reasoning trace/ }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('displays live Thinking... pill when isStreaming is true and handles empty steps fallback (negative test)', () => {
    const { rerender } = render(
      <ThinkingAccordion steps={[]} defaultOpen isStreaming data-testid="streaming-empty" />
    );

    expect(screen.getByTestId('streaming-empty')).toHaveAttribute('data-streaming', 'true');
    expect(screen.getByTestId('streaming-empty')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('thinking-streaming-pill')).toHaveTextContent('Thinking...');
    expect(screen.getByRole('status')).toHaveTextContent('Thinking...');
    expect(screen.getByTestId('thinking-step-count')).toHaveTextContent('0/0 steps');
    expect(screen.getByTestId('thinking-empty-state')).toHaveTextContent(
      'Initializing reasoning trace...'
    );

    rerender(<ThinkingAccordion steps={[]} defaultOpen isStreaming={false} data-testid="streaming-empty" />);
    expect(screen.queryByTestId('thinking-streaming-pill')).not.toBeInTheDocument();
    expect(screen.getByTestId('thinking-empty-state')).toHaveTextContent(
      'No reasoning steps recorded yet.'
    );
  });

  it('clamps negative durationMs and omits NaN or Infinity values cleanly (negative test)', () => {
    const edgeSteps: readonly ThinkingStep[] = [
      { id: 'neg', title: 'Negative timing', durationMs: -42, status: 'done' },
      { id: 'nan', title: 'NaN timing', durationMs: Number.NaN, status: 'done' },
      { id: 'inf', title: 'Infinite timing', durationMs: Number.POSITIVE_INFINITY, status: 'pending' },
    ];

    render(<ThinkingAccordion steps={edgeSteps} defaultOpen />);

    expect(screen.getByTestId('thinking-step-duration-neg')).toHaveTextContent('0ms');
    expect(screen.queryByTestId('thinking-step-duration-nan')).not.toBeInTheDocument();
    expect(screen.queryByTestId('thinking-step-duration-inf')).not.toBeInTheDocument();
  });

  it('renders adversarial XSS payloads as literal text and stays immune to prototype-polluting IDs', () => {
    const payload = '<script>window.__thinkingXss=1</script><img src=x onerror=alert(1)>';
    const adversarialSteps: readonly ThinkingStep[] = [
      {
        id: '__proto__',
        title: payload,
        toolName: payload,
        detail: payload,
        status: 'error',
      },
      {
        id: 'constructor',
        title: 'Safe constructor step',
        status: 'done',
      },
    ];

    render(
      <ThinkingAccordion
        steps={adversarialSteps}
        title={payload}
        durationLabel={payload}
        defaultOpen
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(payload)).toHaveLength(5);
    expect(screen.getByText('Safe constructor step')).toBeInTheDocument();
    expect(({} as Record<string, string>)['__proto__']).not.toBe(payload);
  });
});
