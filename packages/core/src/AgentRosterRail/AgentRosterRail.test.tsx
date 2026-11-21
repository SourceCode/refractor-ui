import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AgentRosterRail,
  type AgentRosterMember,
  type AgentRosterStatus,
} from './index';

const SAMPLE_AGENTS: AgentRosterMember[] = [
  {
    id: 'planner',
    name: 'Lead Planner',
    role: 'Orchestrator',
    status: 'thinking',
    currentTask: 'Synthesizing multi-agent DAG',
  },
  {
    id: 'builder',
    name: 'Builder',
    role: 'Core Engineer',
    status: 'tool',
    currentTask: 'Executing Vitest coverage suite',
    avatarLabel: 'CE',
  },
  {
    id: 'verifier',
    name: 'Audit Guard Prime',
    role: 'Security Verifier',
    status: 'waiting',
    avatarLabel: '   ',
  },
  {
    id: 'release',
    name: 'Release Bot',
    role: 'Publisher',
    status: 'done',
  },
  {
    id: 'standby',
    name: '   ',
    role: 'Fallback Worker',
    status: 'idle',
  },
];

describe('AgentRosterRail', () => {
  it('renders header, active/total counter, all five statuses, initials fallback, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AgentRosterRail: { className: 'theme-roster', style: { maxWidth: '720px' } },
          },
        }}
      >
        <AgentRosterRail
          ref={ref}
          agents={SAMPLE_AGENTS}
          className="custom-roster"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="roster-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('roster-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-agent-roster-rail',
      'prism-slab',
      'theme-roster',
      'custom-roster'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-has-active', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    expect(screen.getByRole('heading', { name: 'Agent Roster' })).toBeInTheDocument();
    expect(screen.getByTestId('agent-roster-summary')).toHaveTextContent('2 active · 5 total');
    expect(screen.getByTestId('agent-roster-list')).toHaveAttribute(
      'data-orientation',
      'horizontal'
    );

    // Defaults to first agent selected
    const firstCard = screen.getByTestId('agent-roster-card-planner');
    expect(firstCard).toHaveAttribute('aria-current', 'true');
    expect(firstCard).toHaveAttribute('data-selected', 'true');
    expect(firstCard).toHaveAttribute('tabindex', '0');

    const secondCard = screen.getByTestId('agent-roster-card-builder');
    expect(secondCard).not.toHaveAttribute('aria-current');
    expect(secondCard).toHaveAttribute('tabindex', '-1');

    // Verify initials derivation: 2 words, custom avatarLabel, whitespace avatarLabel, single word, blank name
    expect(screen.getByTestId('agent-roster-avatar-planner')).toHaveTextContent('LP');
    expect(screen.getByTestId('agent-roster-avatar-builder')).toHaveTextContent('CE');
    expect(screen.getByTestId('agent-roster-avatar-verifier')).toHaveTextContent('AG');
    expect(screen.getByTestId('agent-roster-avatar-release')).toHaveTextContent('RB');
    expect(screen.getByTestId('agent-roster-avatar-standby')).toHaveTextContent('AG');

    // Verify single-word name initials when avatarLabel is omitted
    const expectedStatuses: readonly AgentRosterStatus[] = [
      'thinking',
      'tool',
      'waiting',
      'done',
      'idle',
    ];
    SAMPLE_AGENTS.forEach((agent, idx) => {
      expect(screen.getByTestId(`agent-roster-status-${agent.id}`)).toHaveAttribute(
        'data-status',
        expectedStatuses[idx]
      );
    });

    expect(screen.getByText('Thinking')).toBeInTheDocument();
    expect(screen.getByText('Tool')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
    expect(screen.getByTestId('agent-roster-task-planner')).toHaveTextContent(
      'Synthesizing multi-agent DAG'
    );
    expect(screen.queryByTestId('agent-roster-task-release')).not.toBeInTheDocument();
  });

  it('derives two-letter uppercase initials for single-word agent names without avatarLabel', () => {
    render(
      <AgentRosterRail
        title="Solo Swarm"
        agents={[
          {
            id: 'nova',
            name: 'nova',
            role: 'Synthesizer',
            status: 'idle',
          },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Solo Swarm' })).toBeInTheDocument();
    expect(screen.getByTestId('agent-roster-summary')).toHaveTextContent('0 active · 1 total');
    expect(screen.getByTestId('agent-roster-avatar-nova')).toHaveTextContent('NO');
  });

  it('supports uncontrolled click selection and horizontal IME-safe keyboard navigation', () => {
    const onSelectAgent = vi.fn();
    render(
      <AgentRosterRail
        agents={SAMPLE_AGENTS.slice(0, 3)}
        defaultActiveAgentId="builder"
        onSelectAgent={onSelectAgent}
      />
    );

    const plannerCard = screen.getByTestId('agent-roster-card-planner');
    const builderCard = screen.getByTestId('agent-roster-card-builder');
    const verifierCard = screen.getByTestId('agent-roster-card-verifier');

    expect(builderCard).toHaveAttribute('aria-current', 'true');

    // IME composing keydown must be ignored
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    builderCard.dispatchEvent(composingEvent);
    expect(onSelectAgent).not.toHaveBeenCalled();

    // Unrelated and vertical keys ignored in horizontal mode
    fireEvent.keyDown(builderCard, { key: 'ArrowDown' });
    fireEvent.keyDown(builderCard, { key: 'a' });
    expect(onSelectAgent).not.toHaveBeenCalled();

    // ArrowRight moves to verifier
    fireEvent.keyDown(builderCard, { key: 'ArrowRight' });
    expect(verifierCard).toHaveAttribute('aria-current', 'true');
    expect(document.activeElement).toBe(verifierCard);
    expect(onSelectAgent).toHaveBeenLastCalledWith(SAMPLE_AGENTS[2]);

    // ArrowRight wraps to planner
    fireEvent.keyDown(verifierCard, { key: 'ArrowRight' });
    expect(plannerCard).toHaveAttribute('aria-current', 'true');
    expect(document.activeElement).toBe(plannerCard);
    expect(onSelectAgent).toHaveBeenLastCalledWith(SAMPLE_AGENTS[0]);

    // ArrowLeft wraps back to verifier
    fireEvent.keyDown(plannerCard, { key: 'ArrowLeft' });
    expect(verifierCard).toHaveAttribute('aria-current', 'true');
    expect(document.activeElement).toBe(verifierCard);

    // Home jumps to first agent
    fireEvent.keyDown(verifierCard, { key: 'Home' });
    expect(plannerCard).toHaveAttribute('aria-current', 'true');
    expect(document.activeElement).toBe(plannerCard);

    // End jumps to last agent
    fireEvent.keyDown(plannerCard, { key: 'End' });
    expect(verifierCard).toHaveAttribute('aria-current', 'true');
    expect(document.activeElement).toBe(verifierCard);

    // Click selects builder
    fireEvent.click(builderCard);
    expect(builderCard).toHaveAttribute('aria-current', 'true');
    expect(onSelectAgent).toHaveBeenLastCalledWith(SAMPLE_AGENTS[1]);
  });

  it('supports vertical orientation and ArrowDown/ArrowUp keyboard navigation', () => {
    const onSelectAgent = vi.fn();
    render(
      <AgentRosterRail
        agents={SAMPLE_AGENTS.slice(0, 3)}
        orientation="vertical"
        onSelectAgent={onSelectAgent}
        data-testid="vertical-roster"
      />
    );

    expect(screen.getByTestId('vertical-roster')).toHaveAttribute('data-orientation', 'vertical');
    expect(screen.getByTestId('agent-roster-list')).toHaveAttribute('data-orientation', 'vertical');

    const plannerCard = screen.getByTestId('agent-roster-card-planner');
    const builderCard = screen.getByTestId('agent-roster-card-builder');
    const verifierCard = screen.getByTestId('agent-roster-card-verifier');

    // Horizontal keys ignored in vertical mode
    fireEvent.keyDown(plannerCard, { key: 'ArrowRight' });
    expect(onSelectAgent).not.toHaveBeenCalled();

    // ArrowDown moves to builder
    fireEvent.keyDown(plannerCard, { key: 'ArrowDown' });
    expect(builderCard).toHaveAttribute('aria-current', 'true');
    expect(document.activeElement).toBe(builderCard);

    // ArrowUp moves back to planner, then wraps to verifier
    fireEvent.keyDown(builderCard, { key: 'ArrowUp' });
    expect(plannerCard).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(plannerCard, { key: 'ArrowUp' });
    expect(verifierCard).toHaveAttribute('aria-current', 'true');
    expect(document.activeElement).toBe(verifierCard);
  });

  it('supports controlled activeAgentId mode and unmatched activeAgentId tab-stop fallback', () => {
    function ControlledRoster() {
      const [activeId, setActiveId] = useState<string>('nonexistent-id');
      return (
        <AgentRosterRail
          agents={SAMPLE_AGENTS.slice(0, 2)}
          activeAgentId={activeId}
          onSelectAgent={(agent) => setActiveId(agent.id)}
        />
      );
    }

    render(<ControlledRoster />);

    const plannerCard = screen.getByTestId('agent-roster-card-planner');
    const builderCard = screen.getByTestId('agent-roster-card-builder');

    // Unmatched activeId falls back to first card as tab stop while none have aria-current
    expect(plannerCard).not.toHaveAttribute('aria-current');
    expect(plannerCard).toHaveAttribute('tabindex', '0');
    expect(builderCard).toHaveAttribute('tabindex', '-1');

    fireEvent.click(builderCard);
    expect(builderCard).toHaveAttribute('aria-current', 'true');
    expect(builderCard).toHaveAttribute('tabindex', '0');
    expect(plannerCard).toHaveAttribute('tabindex', '-1');
  });

  it('renders clean empty state when agents array is empty (negative test)', () => {
    render(<AgentRosterRail agents={[]} data-testid="empty-roster" />);

    const root = screen.getByTestId('empty-roster');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).not.toHaveAttribute('data-has-active');
    expect(screen.getByTestId('agent-roster-summary')).toHaveTextContent('0 active · 0 total');
    expect(screen.getByTestId('agent-roster-empty')).toHaveTextContent(
      'No agents currently registered in this roster.'
    );
    expect(screen.queryByTestId('agent-roster-list')).not.toBeInTheDocument();
  });

  it('neutralizes adversarial XSS payloads and prototype-polluting agent IDs', () => {
    const xssPayload = '<script>window.__rosterXss=1</script><img src=x onerror=alert(1)>';
    const onSelectAgent = vi.fn();
    const adversarialAgents: AgentRosterMember[] = [
      {
        id: '__proto__',
        name: xssPayload,
        role: xssPayload,
        status: 'thinking',
        currentTask: xssPayload,
        avatarLabel: xssPayload,
      },
      {
        id: 'constructor',
        name: 'Safe Constructor',
        role: 'Worker',
        status: 'done',
      },
    ];

    render(
      <AgentRosterRail
        title={xssPayload}
        agents={adversarialAgents}
        onSelectAgent={onSelectAgent}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(xssPayload)).toHaveLength(5);

    const protoCard = screen.getByTestId('agent-roster-card-__proto__');
    const ctorCard = screen.getByTestId('agent-roster-card-constructor');
    fireEvent.keyDown(protoCard, { key: 'ArrowRight' });
    expect(ctorCard).toHaveAttribute('aria-current', 'true');
    expect(onSelectAgent).toHaveBeenCalledWith(adversarialAgents[1]);
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xssPayload);
  });
});
