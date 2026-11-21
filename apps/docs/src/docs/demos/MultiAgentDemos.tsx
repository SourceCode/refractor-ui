import {
  AgentExecutionTrace,
  AgentRosterRail,
  HandoffDivider,
  ParallelComparisonView,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface MultiAgentDemosProps {
  componentId: string;
}

export function MultiAgentDemos({ componentId }: MultiAgentDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'agent-roster-rail':
      return (
        <div className="w-full max-w-3xl">
          <AgentRosterRail
            agents={[
              { id: 'coord', name: 'Coordinator', role: 'Planner', status: 'done', currentTask: 'Dispatched 4 parallel workers' },
              { id: 'builder', name: 'UI Builder', role: 'Core Engineer', status: 'thinking', currentTask: 'Drafting optical glass specs' },
              { id: 'sec', name: 'Security Auditor', role: 'OWASP Reviewer', status: 'tool', currentTask: 'Scanning XSS & URL sanitizers' },
              { id: 'docs', name: 'Docs Publisher', role: 'Release Ops', status: 'waiting', currentTask: 'Awaiting coverage gate' },
            ]}
            onSelectAgent={(agent) =>
              dispatch(pushToast({ title: `Inspecting ${agent.name}`, description: agent.currentTask, tone: 'info' }))
            }
          />
        </div>
      );

    case 'agent-execution-trace':
      return (
        <div className="w-full max-w-3xl">
          <AgentExecutionTrace
            spans={[
              { id: 'sp-1', agentName: 'Coordinator', label: 'Decompose release spec', kind: 'llm', status: 'ok', startMs: 0, durationMs: 420, tokens: 1_240, detail: 'Split 4 components across 2 isolated workers.' },
              { id: 'sp-2', agentName: 'UI Builder', label: 'search_codebase(BaseProps)', kind: 'retrieval', status: 'ok', startMs: 380, durationMs: 180, detail: 'Matched 126 component contracts.' },
              { id: 'sp-3', agentName: 'Coordinator', label: 'Delegate Security Suite', kind: 'handoff', status: 'ok', startMs: 520, durationMs: 110, detail: 'Transferred AST diff & coverage target.' },
              { id: 'sp-4', agentName: 'Security Auditor', label: 'vitest run --coverage', kind: 'tool', status: 'ok', startMs: 640, durationMs: 890, tokens: 640, detail: 'All 132 suites passed at 99.6% coverage.' },
            ]}
          />
        </div>
      );

    case 'handoff-divider':
      return (
        <div className="w-full max-w-2xl">
          <HandoffDivider
            fromAgent="Architecture Planner"
            toAgent="Optical Component Builder"
            timestamp="14:42 UTC"
            summary="Approved React 19 prop interfaces and --prism-* token mappings for Multi-Agent Orchestration."
            artifacts={[
              { id: 'art-1', label: 'ADR-0001.md', kind: 'plan' },
              { id: 'art-2', label: 'AgentRosterRail.tsx', kind: 'file' },
              { id: 'art-3', label: 'coverage-target.json', kind: 'data' },
            ]}
            payload={'{\n  "release": "1.9.0",\n  "components": 126,\n  "coverageFloor": 93\n}'}
            onArtifactClick={(artifact) =>
              dispatch(pushToast({ title: `Opened handoff artifact: ${artifact.label}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'parallel-comparison-view':
      return (
        <div className="w-full max-w-3xl">
          <ParallelComparisonView
            defaultWinnerId="cand-a"
            candidates={[
              {
                id: 'cand-a',
                label: 'Optical Prism Strategy',
                model: 'Prism Ultra 2.5',
                latencyMs: 640,
                tokens: 412,
                score: 98,
                output: 'Use CSS @layer components with --prism-* tokens so Tailwind utilities compose cleanly without !important overrides.',
              },
              {
                id: 'cand-b',
                label: 'Inline Style Fallback',
                model: 'Prism Flash',
                latencyMs: 280,
                tokens: 290,
                score: 84,
                output: 'Attach computed inline style maps directly to each component root to avoid external stylesheet imports.',
              },
            ]}
            onSelectWinner={(candidate) =>
              dispatch(pushToast({ title: `Selected winner: ${candidate.label}`, tone: 'emerald' }))
            }
            onCopyWinner={(candidate) =>
              dispatch(pushToast({ title: `Copied ${candidate.label} output`, tone: 'emerald' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
