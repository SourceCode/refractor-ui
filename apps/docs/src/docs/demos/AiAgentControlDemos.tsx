import {
  AgentControlBar,
  AgentPlanList,
  ApprovalGateCard,
  CheckpointRollbackStrip,
  InlineDiffReviewer,
  RecoveryRoutingCard,
  ToolCallCard,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface AiAgentControlDemosProps {
  componentId: string;
}

export function AiAgentControlDemos({ componentId }: AiAgentControlDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'agent-plan-list':
      return (
        <div className="w-full max-w-xl">
          <AgentPlanList
            title="Release Automation Plan"
            defaultSteps={[
              { id: 's-1', title: 'Audit TypeScript strictness across core', detail: 'Verify zero any/unknown', status: 'done' },
              { id: 's-2', title: 'Run Vitest V8 coverage suite', detail: 'Maintain >= 93% globally', status: 'active' },
              { id: 's-3', title: 'Build static GitHub Pages bundle', detail: 'Verify subpath asset URLs', status: 'pending' },
              { id: 's-4', title: 'Tag release & draft changelog notes', status: 'pending' },
            ]}
          />
        </div>
      );

    case 'tool-call-card':
      return (
        <div className="w-full max-w-xl space-y-2.5">
          <ToolCallCard
            toolName="search_codebase"
            category="search"
            status="success"
            durationMs={142}
            summary="Found 14 matching optical token references"
            defaultExpanded
            inputs={[
              { key: 'query', value: '--prism-caustic-opacity' },
              { key: 'scope', value: 'packages/core/src' },
            ]}
            outputs={[
              { key: 'matches', value: '14 files' },
              { key: 'topHit', value: 'packages/core/src/refractor.css:48' },
            ]}
          />
        </div>
      );

    case 'approval-gate-card':
      return (
        <div className="w-full max-w-xl">
          <ApprovalGateCard
            title="Publish Package Release"
            actionName="npm publish @refractor-ui/core@1.7.0"
            description="Agent requests explicit human sign-off before pushing a production registry tag."
            riskLevel="high"
            parameters={[
              { key: 'tag', label: 'Dist Tag', value: 'latest', editable: true },
              { key: 'registry', label: 'Registry', value: 'https://registry.npmjs.org', editable: false },
            ]}
            onApprove={(params) =>
              dispatch(
                pushToast({
                  title: 'Approved action',
                  description: `Dist tag: ${params.tag ?? 'latest'}`,
                  tone: 'emerald',
                })
              )
            }
            onReject={(reason) =>
              dispatch(
                pushToast({
                  title: 'Action rejected',
                  description: reason ?? 'Operator declined execution',
                  tone: 'amber',
                })
              )
            }
          />
        </div>
      );

    case 'agent-control-bar':
      return (
        <div className="w-full max-w-2xl">
          <AgentControlBar
            currentStepLabel="Running AST lint verification (116 components)"
            onPause={() => dispatch(pushToast({ title: 'Agent loop paused', tone: 'amber' }))}
            onResume={() => dispatch(pushToast({ title: 'Agent loop resumed', tone: 'emerald' }))}
            onStop={() => dispatch(pushToast({ title: 'Agent execution halted', tone: 'info' }))}
            onRedirect={(instruction) =>
              dispatch(pushToast({ title: 'Redirected agent', description: instruction, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'checkpoint-rollback-strip':
      return (
        <div className="w-full max-w-2xl">
          <CheckpointRollbackStrip
            checkpoints={[
              { id: 'cp-1', label: 'Initial scaffold', turn: 1, timestamp: '10:02', filesChanged: 4, summary: 'Created component directory & barrel exports' },
              { id: 'cp-2', label: 'Optical tokens', turn: 2, timestamp: '10:08', filesChanged: 2, summary: 'Applied --prism-* glass styles and ARIA roles' },
              { id: 'cp-3', label: 'Adversarial tests', turn: 3, timestamp: '10:15', filesChanged: 1, summary: 'Added XSS & prototype-pollution coverage (100%)' },
            ]}
            onRollback={(cp) =>
              dispatch(pushToast({ title: `Rolled back to Turn ${cp.turn}`, description: cp.label, tone: 'amber' }))
            }
            onFork={(cp) =>
              dispatch(pushToast({ title: `Forked conversation from Turn ${cp.turn}`, description: cp.label, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'inline-diff-reviewer':
      return (
        <div className="w-full max-w-2xl">
          <InlineDiffReviewer
            filePath="packages/core/src/theme/createPrismTheme.ts"
            hunks={[
              {
                id: 'hunk-1',
                header: '@@ -24,4 +24,5 @@ export function createPrismTheme(options)',
                lines: [
                  { kind: 'context', oldLine: 24, newLine: 24, content: 'const blurPx = clampNumber(optics.blurPx ?? 16, 4, 40);' },
                  { kind: 'remove', oldLine: 25, content: 'const causticOpacity = 1.0;' },
                  { kind: 'add', newLine: 25, content: 'const causticOpacity = resolveCausticOpacity(optics.refraction);' },
                  { kind: 'add', newLine: 26, content: 'const specularOpacity = optics.specularHighlight === false ? 0 : 1;' },
                ],
              },
            ]}
            onHunkDecision={(id, decision) =>
              dispatch(pushToast({ title: `Hunk ${id} ${decision}`, tone: decision === 'accepted' ? 'emerald' : 'amber' }))
            }
          />
        </div>
      );

    case 'recovery-routing-card':
      return (
        <div className="w-full max-w-2xl">
          <RecoveryRoutingCard
            title="Tool Execution Timed Out"
            errorCode="ERR_SUBPROCESS_TIMEOUT"
            errorMessage="The remote sandbox test runner did not respond within 30,000ms."
            stackTrace={'TimeoutError: Command exceeded 30000ms\n  at runTask (runner.ts:118:13)\n  at async executeAgentStep (loop.ts:74:9)'}
            routes={[
              { id: 'retry', label: 'Retry Once', description: 'Re-run with clean worker pool', kind: 'retry', primary: true },
              { id: 'edit', label: 'Edit Timeout', description: 'Increase threshold to 60s', kind: 'edit' },
              { id: 'switch', label: 'Switch Runner', description: 'Fallback to local Vitest threads', kind: 'switch' },
              { id: 'skip', label: 'Skip Step', description: 'Mark optional and continue', kind: 'skip' },
            ]}
            onSelectRoute={(route) =>
              dispatch(pushToast({ title: `Selected recovery: ${route.label}`, tone: 'info' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
