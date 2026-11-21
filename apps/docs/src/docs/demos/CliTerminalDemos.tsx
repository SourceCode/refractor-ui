import { useState } from 'react';
import {
  CommandInputBar,
  CopyableCommandBlock,
  LiveLogStreamer,
  ProcessStatusPill,
  StructuredOutputViewer,
  TerminalEmulator,
  TerminalMultiplexer,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface CliTerminalDemosProps {
  componentId: string;
}

export function CliTerminalDemos({ componentId }: CliTerminalDemosProps) {
  const dispatch = useAppDispatch();
  const [buildStatus, setBuildStatus] = useState<'running' | 'success' | 'failed' | 'cancelled'>('running');

  switch (componentId) {
    case 'terminal-emulator':
      return (
        <div className="w-full max-w-2xl">
          <TerminalEmulator
            title="Refractor Optical Shell"
            defaultLines={[
              { id: 'l-1', text: '\u001b[1;32m✓ Connected\u001b[0m to refractor-ui workspace (Node v24)', kind: 'system' },
              { id: 'l-2', text: 'refractor@prism:~$ pnpm test:coverage', kind: 'command' },
              { id: 'l-3', text: '\u001b[36mINFO\u001b[0m  108 test suites passing · \u001b[32m99.5% coverage\u001b[0m', kind: 'stdout' },
            ]}
            onExecute={(cmd) => {
              if (cmd === 'status') {
                return '\u001b[32mOK\u001b[0m All 109 optical components healthy.';
              }
              return `\u001b[35m→\u001b[0m Ran "${cmd}" in 18ms`;
            }}
          />
        </div>
      );

    case 'command-input-bar':
      return (
        <div className="w-full max-w-xl">
          <CommandInputBar
            prompt="$"
            suggestions={[
              'refractor component PrimaryButton --dense',
              'refractor swizzle CommandInputBar --out src/ui',
              'refractor theme inspect obsidian',
              'pnpm test:coverage',
            ]}
            history={['pnpm lint:strict', 'pnpm build:pages']}
            onSubmit={(cmd) =>
              dispatch(pushToast({ title: `Executed command`, description: cmd, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'live-log-streamer':
      return (
        <div className="w-full max-w-2xl">
          <LiveLogStreamer
            entries={[
              { id: 'log-1', timestamp: '09:14:01.102', severity: 'debug', source: 'vite', message: 'Resolved 1915 modules in 42ms' },
              { id: 'log-2', timestamp: '09:14:01.488', severity: 'info', source: 'worker', message: 'Optical prism shader cache hydrated (5 themes)' },
              { id: 'log-3', timestamp: '09:14:02.019', severity: 'warn', source: 'bundle', message: 'Docs bundle exceeds 500 kB chunk budget' },
              { id: 'log-4', timestamp: '09:14:02.640', severity: 'error', source: 'lint', message: 'Rejected raw color literal in draft component' },
              { id: 'log-5', timestamp: '09:14:03.112', severity: 'info', source: 'deploy', message: 'Static GitHub Pages manifest verified' },
            ]}
          />
        </div>
      );

    case 'copyable-command-block':
      return (
        <div className="w-full max-w-xl">
          <CopyableCommandBlock
            title="Install Refractor Optical Glass UI"
            variants={[
              { id: 'pnpm', label: 'pnpm', command: 'pnpm add @refractor-ui/core --save-exact' },
              { id: 'npm', label: 'npm', command: 'npm install @refractor-ui/core --save-exact' },
              { id: 'yarn', label: 'yarn', command: 'yarn add @refractor-ui/core --exact' },
              { id: 'bun', label: 'bun', command: 'bun add @refractor-ui/core --exact' },
            ]}
            onCopy={(cmd) =>
              dispatch(pushToast({ title: 'Copied command to clipboard', description: cmd, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'process-status-pill':
      return (
        <div className="flex flex-wrap items-center gap-3">
          <ProcessStatusPill
            label="vite build"
            status={buildStatus}
            elapsedMs={2450}
            exitCode={buildStatus === 'failed' ? 1 : buildStatus === 'success' ? 0 : undefined}
            onStop={() => setBuildStatus('cancelled')}
            onRetry={() => setBuildStatus('running')}
          />
          <ProcessStatusPill label="vitest coverage" status="success" elapsedMs={15420} exitCode={0} />
          <ProcessStatusPill
            label="eslint --strict"
            status="failed"
            elapsedMs={890}
            exitCode={2}
            onRetry={() => dispatch(pushToast({ title: 'Retrying strict ESLint run', tone: 'info' }))}
          />
        </div>
      );

    case 'structured-output-viewer':
      return (
        <div className="w-full max-w-2xl">
          <StructuredOutputViewer
            title="Release Telemetry Payload"
            data={[
              { package: '@refractor-ui/core', version: '1.6.0', components: 109, coverage: 99.5, strict: true },
              { package: '@refractor-ui/cli', version: '1.6.0', components: 109, coverage: 98.4, strict: true },
              { package: '@refractor-ui/docs', version: '1.6.0', components: 109, coverage: 97.9, strict: true },
            ]}
          />
        </div>
      );

    case 'terminal-multiplexer':
      return (
        <div className="w-full max-w-3xl">
          <TerminalMultiplexer
            defaultLayout="split"
            defaultPanes={[
              {
                id: 'pane-dev',
                title: 'vite-dev',
                cwd: '~/refractor-ui/apps/docs',
                status: 'running',
                lines: ['VITE v8.3.8 ready in 194ms', '➜ Local: http://localhost:5173/'],
              },
              {
                id: 'pane-test',
                title: 'vitest',
                cwd: '~/refractor-ui',
                status: 'idle',
                lines: ['PASS packages/core (109 components)', 'Coverage: 99.5% statements'],
              },
            ]}
            onCommand={(paneId, cmd) => `[${paneId}] executed: ${cmd}`}
          />
        </div>
      );

    default:
      return null;
  }
}
