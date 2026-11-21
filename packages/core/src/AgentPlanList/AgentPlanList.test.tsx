import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AgentPlanList,
  type AgentPlanStep,
  type AgentPlanStepStatus,
} from './index';

const INITIAL_STEPS: AgentPlanStep[] = [
  {
    id: 'step-1',
    title: 'Inspect repository architecture',
    detail: 'Confirm Astryx BaseProps and theme token contracts.',
    status: 'done',
  },
  {
    id: 'step-2',
    title: 'Implement optical glass card',
    status: 'active',
  },
  {
    id: 'step-3',
    title: 'Verify strict ESLint rules',
    status: 'pending',
  },
  {
    id: 'step-4',
    title: 'Skip deprecated IE fallback',
    status: 'skipped',
  },
  {
    id: 'step-5',
    title: 'Re-run failing snapshot check',
    detail: 'Retry once token contrast is updated.',
    status: 'failed',
  },
];

describe('AgentPlanList', () => {
  it('renders header, tabular counter, progressbar, all five statuses, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AgentPlanList: { className: 'theme-plan', style: { maxWidth: '580px' } },
          },
        }}
      >
        <AgentPlanList
          ref={ref}
          defaultSteps={INITIAL_STEPS}
          className="custom-plan"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="plan-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('plan-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-agent-plan-list', 'prism-slab', 'theme-plan', 'custom-plan');
    expect(root).toHaveStyle({ maxWidth: '580px' });
    expect(root).toHaveAttribute('data-editable', 'true');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-complete');

    expect(screen.getByRole('heading', { name: 'Execution Plan' })).toBeInTheDocument();
    expect(screen.getByTestId('agent-plan-counter')).toHaveTextContent('1 / 5 complete');

    const progressbar = screen.getByRole('progressbar', { name: 'Execution Plan completion' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '20');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuetext', '1 / 5 complete');
    expect(screen.getByTestId('agent-plan-progress-fill')).toHaveStyle({ width: '20%' });

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);

    const expectedStatuses: readonly AgentPlanStepStatus[] = [
      'done',
      'active',
      'pending',
      'skipped',
      'failed',
    ];
    items.forEach((item, idx) => {
      expect(item).toHaveAttribute('data-step-status', expectedStatuses[idx]);
    });

    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(
      screen.getByText('Confirm Astryx BaseProps and theme token contracts.')
    ).toBeInTheDocument();
  });

  it('toggles statuses correctly across done, pending, active, skipped, and failed in uncontrolled mode', () => {
    const onStepsChange = vi.fn();

    render(<AgentPlanList defaultSteps={INITIAL_STEPS} onStepsChange={onStepsChange} />);

    // done -> pending
    const toggleDone = screen.getByTestId('agent-plan-status-step-1');
    expect(toggleDone).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggleDone);
    expect(screen.getByTestId('agent-plan-counter')).toHaveTextContent('0 / 5 complete');
    expect(screen.getByTestId('agent-plan-status-step-1')).toHaveAttribute('aria-pressed', 'false');

    // active -> done
    fireEvent.click(screen.getByTestId('agent-plan-status-step-2'));
    // pending -> done
    fireEvent.click(screen.getByTestId('agent-plan-status-step-3'));
    // skipped -> done
    fireEvent.click(screen.getByTestId('agent-plan-status-step-4'));
    // failed -> done
    fireEvent.click(screen.getByTestId('agent-plan-status-step-5'));
    // step-1 pending -> done
    fireEvent.click(screen.getByTestId('agent-plan-status-step-1'));

    expect(screen.getByTestId('agent-plan-counter')).toHaveTextContent('5 / 5 complete');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByTestId('agent-plan-progress-fill')).toHaveClass('prism-emerald');
    expect(onStepsChange).toHaveBeenCalledTimes(6);
  });

  it('adds steps via Add button and IME-safe Enter while ignoring blank and composing events', () => {
    const onStepsChange = vi.fn();
    render(
      <AgentPlanList
        defaultSteps={[{ id: 'plan-step-1', title: 'Existing step', status: 'pending' }]}
        onStepsChange={onStepsChange}
      />
    );

    const input = screen.getByRole('textbox', { name: 'Add step' });
    const addButton = screen.getByRole('button', { name: 'Add' });

    expect(addButton).toBeDisabled();

    // Whitespace-only should be ignored on Enter and keep button disabled
    fireEvent.change(input, { target: { value: '   ' } });
    expect(addButton).toBeDisabled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onStepsChange).not.toHaveBeenCalled();

    // Valid title added via IME-composing Enter must be ignored
    fireEvent.change(input, { target: { value: 'Draft release notes' } });
    expect(addButton).toBeEnabled();
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    input.dispatchEvent(composingEvent);
    expect(onStepsChange).not.toHaveBeenCalled();

    // Non-Enter key does not submit
    fireEvent.keyDown(input, { key: 'a' });
    expect(onStepsChange).not.toHaveBeenCalled();

    // Standard Enter adds step and avoids colliding with existing 'plan-step-1'
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onStepsChange).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Draft release notes')).toBeInTheDocument();
    expect(input).toHaveValue('');

    const itemsAfterFirstAdd = screen.getAllByRole('listitem');
    expect(itemsAfterFirstAdd).toHaveLength(2);
    expect(itemsAfterFirstAdd[1]).toHaveAttribute('data-step-id', 'plan-step-2');
    expect(itemsAfterFirstAdd[1]).toHaveAttribute('data-step-status', 'pending');

    // Add another step via Add button click
    fireEvent.change(input, { target: { value: '  Deploy preview  ' } });
    fireEvent.click(addButton);
    expect(screen.getByText('Deploy preview')).toBeInTheDocument();
    expect(screen.getByTestId('agent-plan-counter')).toHaveTextContent('0 / 3 complete');
  });

  it('removes steps via accessible Remove button and invokes onSelectStep when clicking step copy', () => {
    const onSelectStep = vi.fn();
    const onStepsChange = vi.fn();

    render(
      <AgentPlanList
        defaultSteps={INITIAL_STEPS.slice(0, 2)}
        onSelectStep={onSelectStep}
        onStepsChange={onStepsChange}
      />
    );

    fireEvent.click(screen.getByText('Inspect repository architecture'));
    expect(onSelectStep).toHaveBeenCalledTimes(1);
    expect(onSelectStep).toHaveBeenCalledWith(INITIAL_STEPS[0]);

    const removeButton = screen.getByRole('button', {
      name: 'Remove Implement optical glass card',
    });
    fireEvent.click(removeButton);

    expect(screen.queryByText('Implement optical glass card')).not.toBeInTheDocument();
    expect(screen.getByTestId('agent-plan-counter')).toHaveTextContent('1 / 1 complete');
    expect(onStepsChange).toHaveBeenCalledTimes(1);
  });

  it('supports controlled steps mode and read-only editable={false} mode', () => {
    function ControlledHarness() {
      const [steps, setSteps] = useState<AgentPlanStep[]>([
        { id: 'c1', title: 'Controlled task', status: 'pending' },
      ]);
      return (
        <div>
          <AgentPlanList
            title="Controlled Plan"
            steps={steps}
            onStepsChange={setSteps}
            data-testid="controlled-plan"
          />
        </div>
      );
    }

    const { rerender } = render(<ControlledHarness />);
    expect(screen.getByRole('heading', { name: 'Controlled Plan' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agent-plan-status-c1'));
    expect(screen.getByTestId('agent-plan-counter')).toHaveTextContent('1 / 1 complete');

    // Switch to read-only mode
    rerender(
      <AgentPlanList
        title="Audit Trail"
        steps={[{ id: 'r1', title: 'Locked step', status: 'done' }]}
        editable={false}
        data-testid="readonly-plan"
      />
    );

    const readOnlyRoot = screen.getByTestId('readonly-plan');
    expect(readOnlyRoot).not.toHaveAttribute('data-editable');
    expect(screen.queryByRole('textbox', { name: 'Add step' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('agent-plan-status-r1').tagName).toBe('SPAN');
    expect(within(screen.getByTestId('agent-plan-status-r1')).getByText('Done')).toBeInTheDocument();
  });

  it('renders clean empty state messages for both editable and read-only empty lists (negative test)', () => {
    const { rerender } = render(<AgentPlanList data-testid="empty-plan" />);

    expect(screen.getByTestId('empty-plan')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('agent-plan-counter')).toHaveTextContent('0 / 0 complete');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('agent-plan-empty')).toHaveTextContent(
      'No execution steps yet. Add a step below to start building the plan.'
    );

    rerender(<AgentPlanList steps={[]} editable={false} data-testid="empty-plan" />);
    expect(screen.getByTestId('agent-plan-empty')).toHaveTextContent(
      'No execution steps in this plan.'
    );
  });

  it('neutralizes adversarial XSS payloads and prototype-polluting step IDs', () => {
    const xssPayload = '<script>window.__planXss=1</script><img src=x onerror=alert(1)>';
    const adversarialSteps: AgentPlanStep[] = [
      {
        id: '__proto__',
        title: xssPayload,
        detail: xssPayload,
        status: 'failed',
      },
      {
        id: 'constructor',
        title: 'Safe constructor step',
        status: 'pending',
      },
    ];

    render(<AgentPlanList title={xssPayload} defaultSteps={adversarialSteps} />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(xssPayload)).toHaveLength(3);
    expect(screen.getByText('Safe constructor step')).toBeInTheDocument();
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xssPayload);
  });
});
