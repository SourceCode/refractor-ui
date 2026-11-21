import { useState } from 'react';
import {
  AttachedContextBar,
  ConfidenceIndicator,
  ConnectedToolsDrawer,
  ContextTokenMeter,
  MemoryPersonaInspector,
  ModelParameterSwitcher,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface AiContextMemoryDemosProps {
  componentId: string;
}

export function AiContextMemoryDemos({ componentId }: AiContextMemoryDemosProps) {
  const dispatch = useAppDispatch();
  const [verified, setVerified] = useState(false);

  switch (componentId) {
    case 'context-token-meter':
      return (
        <div className="w-full max-w-xl space-y-4">
          <ContextTokenMeter
            maxTokens={128_000}
            segments={[
              { kind: 'system', label: 'System Prompt', tokens: 6_400 },
              { kind: 'files', label: 'Workspace Files', tokens: 48_200 },
              { kind: 'tools', label: 'MCP Schemas', tokens: 12_800 },
              { kind: 'history', label: 'Conversation', tokens: 34_100 },
            ]}
          />
          <ContextTokenMeter
            variant="radial"
            title="Active Radial Budget"
            maxTokens={128_000}
            segments={[
              { kind: 'system', label: 'System', tokens: 8_000 },
              { kind: 'files', label: 'Files', tokens: 64_000 },
              { kind: 'tools', label: 'Tools', tokens: 16_000 },
            ]}
          />
        </div>
      );

    case 'attached-context-bar':
      return (
        <div className="w-full max-w-2xl">
          <AttachedContextBar
            defaultItems={[
              { id: 'c-1', label: 'refractor.css', kind: 'file', tokens: 3_420, pinned: true },
              { id: 'c-2', label: 'packages/core/src/theme', kind: 'folder', tokens: 8_910 },
              { id: 'c-3', label: 'https://refractor-ui.dev/adr', kind: 'url', tokens: 1_240 },
              { id: 'c-4', label: 'colorMath.ts#L12-L44', kind: 'snippet', tokens: 410 },
            ]}
            onAddClick={() =>
              dispatch(pushToast({ title: 'Opened context picker', tone: 'info' }))
            }
          />
        </div>
      );

    case 'model-parameter-switcher':
      return (
        <div className="w-full max-w-md">
          <ModelParameterSwitcher
            defaultOpen
            models={[
              { id: 'prism-ultra', name: 'Prism Ultra 2.5', provider: 'Refractor AI', contextWindow: '1M', speedTier: 'reasoning', badge: 'Recommended' },
              { id: 'prism-pro', name: 'Prism Pro', provider: 'Refractor AI', contextWindow: '256K', speedTier: 'balanced' },
              { id: 'prism-flash', name: 'Prism Flash', provider: 'Refractor AI', contextWindow: '128K', speedTier: 'fast' },
            ]}
            onModelChange={(modelId) =>
              dispatch(pushToast({ title: `Switched model to ${modelId}`, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'memory-persona-inspector':
      return (
        <div className="w-full max-w-xl">
          <MemoryPersonaInspector
            mode="inline"
            defaultMemories={[
              { id: 'm-1', category: 'rule', content: 'Never use TypeScript any or unknown types anywhere in core or tests.', updatedAt: '2m ago' },
              { id: 'm-2', category: 'preference', content: 'Prefer optical --prism-* CSS custom properties over raw color literals.', updatedAt: '14m ago' },
              { id: 'm-3', category: 'fact', content: 'Monorepo uses pnpm workspaces with React 19 and Vitest 5.', updatedAt: '1h ago' },
            ]}
          />
        </div>
      );

    case 'connected-tools-drawer':
      return (
        <div className="w-full max-w-xl">
          <ConnectedToolsDrawer
            mode="inline"
            defaultServers={[
              { id: 'mcp-github', name: 'GitHub Repository MCP', description: 'Issues, PRs, releases, and Pages telemetry', health: 'connected', toolCount: 14, scopes: ['read', 'write', 'network'], enabled: true },
              { id: 'mcp-shell', name: 'Workspace Sandbox Runner', description: 'Isolated build, lint, and test execution', health: 'connected', toolCount: 6, scopes: ['read', 'execute'], enabled: true },
              { id: 'mcp-design', name: 'Optical Token Sync', description: 'Design system token inspector', health: 'degraded', toolCount: 4, scopes: ['read'], enabled: false },
            ]}
            onToggleServer={(serverId, enabled) =>
              dispatch(pushToast({ title: `${enabled ? 'Enabled' : 'Disabled'} ${serverId}`, tone: enabled ? 'emerald' : 'info' }))
            }
          />
        </div>
      );

    case 'confidence-indicator':
      return (
        <div className="flex flex-wrap items-center gap-3">
          <ConfidenceIndicator
            score={96}
            verified={verified}
            sourceCount={4}
            rationale="Cross-checked against 4 unit test suites, strict ESLint AST rules, and TypeScript compiler output."
            onMarkVerified={() => {
              setVerified(true);
              dispatch(pushToast({ title: 'Marked claim as human-verified', tone: 'emerald' }));
            }}
          />
          <ConfidenceIndicator
            score={74}
            sourceCount={2}
            rationale="Derived from two secondary telemetry sources; verify threshold parameters before production rollout."
          />
          <ConfidenceIndicator
            score={42}
            rationale="Low agreement across cited logs — operator review recommended."
            onMarkVerified={() =>
              dispatch(pushToast({ title: 'Reviewed low-confidence output', tone: 'amber' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
