import { useState } from 'react';
import {
  type ChatMessage,
  ChatMessageStream,
  CitationChip,
  PrimaryButton,
  PromptComposer,
  ResponseActionBar,
  SplitArtifactCanvas,
  ThinkingAccordion,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface AiConversationalDemosProps {
  componentId: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    role: 'system',
    content: 'Refractor Optical AI Workspace · Context calibrated to v1.1.0',
  },
  {
    id: 'm2',
    role: 'user',
    author: 'Alex Rivera',
    content: 'Generate a dark-mode optical glass theme using amethyst violet accents.',
    timestamp: '09:41',
  },
  {
    id: 'm3',
    role: 'assistant',
    author: 'Refractor Assistant',
    content:
      'I derived a WCAG-compliant Amethyst Obsidian theme with automatic contrast text and caustic dispersion tokens ready to paste into PrismThemeProvider.',
    timestamp: '09:41',
    streaming: true,
  },
];

const MODEL_OPTIONS = [
  { id: 'prism-reason-2', label: 'Prism Reason 2.5', badge: 'Reasoning' },
  { id: 'prism-flash-2', label: 'Prism Flash 2.5', badge: 'Fast' },
  { id: 'prism-code-1', label: 'Prism Code Pro', badge: 'Code' },
];

export function AiConversationalDemos({ componentId }: AiConversationalDemosProps) {
  const dispatch = useAppDispatch();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [composerValue, setComposerValue] = useState('');
  const [generating, setGenerating] = useState(false);

  switch (componentId) {
    case 'chat-message-stream':
      return (
        <div className="w-full max-w-2xl space-y-3">
          <ChatMessageStream
            messages={messages}
            maxHeightPx={340}
          />
          <div className="flex justify-end">
            <PrimaryButton
              size="sm"
              onClick={() =>
                setMessages((prev) => [
                  ...prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
                  {
                    id: `m-${prev.length + 1}`,
                    role: prev.length % 2 === 0 ? 'user' : 'assistant',
                    author: prev.length % 2 === 0 ? 'Alex Rivera' : 'Refractor Assistant',
                    content:
                      prev.length % 2 === 0
                        ? 'Can you add subtle refraction intensity for focus states?'
                        : 'Updated optics.refraction to "subtle" while preserving crisp keyboard-only focus rings.',
                    timestamp: '09:42',
                    streaming: prev.length % 2 !== 0,
                  },
                ])
              }
            >
              Simulate Next Turn
            </PrimaryButton>
          </div>
        </div>
      );

    case 'prompt-composer':
      return (
        <div className="w-full max-w-2xl">
          <PromptComposer
            value={composerValue}
            onChange={setComposerValue}
            models={MODEL_OPTIONS}
            defaultModelId="prism-reason-2"
            attachmentsCount={2}
            isGenerating={generating}
            maxLength={500}
            onAttachClick={() =>
              dispatch(pushToast({ title: 'Opened context attachment picker', tone: 'info' }))
            }
            onVoiceToggle={(rec) =>
              dispatch(
                pushToast({
                  title: rec ? 'Voice dictation listening...' : 'Voice dictation stopped',
                  tone: rec ? 'emerald' : 'info',
                })
              )
            }
            onStop={() => {
              setGenerating(false);
              dispatch(pushToast({ title: 'Stopped response generation', tone: 'amber' }));
            }}
            onSubmit={(prompt, modelId) => {
              setGenerating(true);
              setComposerValue('');
              dispatch(
                pushToast({
                  title: `Submitted to ${modelId ?? 'default model'}`,
                  description: prompt.slice(0, 72),
                  tone: 'emerald',
                })
              );
              setTimeout(() => setGenerating(false), 1800);
            }}
          />
        </div>
      );

    case 'thinking-accordion':
      return (
        <div className="w-full max-w-2xl">
          <ThinkingAccordion
            defaultOpen
            isStreaming
            title="Reasoning & Tool Verification"
            durationLabel="2.4s"
            steps={[
              {
                id: 'st-1',
                title: 'Inspecting CSS custom property cascade',
                toolName: 'read_file',
                durationMs: 320,
                status: 'done',
                detail: 'Verified @layer components scoping in packages/core/src/refractor.css.',
              },
              {
                id: 'st-2',
                title: 'Computing WCAG AA/AAA foreground contrast',
                toolName: 'color_math',
                durationMs: 640,
                status: 'done',
                detail: 'Confirmed >= 4.5:1 ratio across primary, secondary, and emerald tokens.',
              },
              {
                id: 'st-3',
                title: 'Synthesizing typed React 19 component props',
                toolName: 'ts_check',
                durationMs: 1440,
                status: 'active',
                detail: 'Eliminating any/unknown wildcards and emitting BaseProps passthrough.',
              },
            ]}
          />
        </div>
      );

    case 'citation-chip':
      return (
        <div className="w-full max-w-xl prism-slab p-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          Refractor derives WCAG contrast tokens automatically from single hex inputs{' '}
          <CitationChip
            index={1}
            label="ADR-0003"
            title="Dual MUI + Astryx Optical Glass Theme Engine"
            domain="github.com/SourceCode/refractor-ui"
            snippet="Passing a single hex color to createPrismTheme() computes light, dark, WCAG >= 4.5:1 contrastText, and RGB caustic dispersion channels."
            href="https://github.com/SourceCode/refractor-ui/blob/main/docs/adr/ADR-0003-dual-mui-astryx-optical-theming-and-token-cascade.md"
            onInspect={() =>
              dispatch(pushToast({ title: 'Opened ADR-0003 citation inspector', tone: 'info' }))
            }
          />{' '}
          while enforcing strict zero <code className="font-mono text-xs">any</code>/
          <code className="font-mono text-xs">unknown</code> governance{' '}
          <CitationChip
            index={2}
            label="ADR-0002"
            title="Strict TypeScript & Two-Tier ESLint Governance"
            domain="github.com/SourceCode/refractor-ui"
            snippet="17 custom AST rules enforce Astryx component contracts and prevent wildcard TypeScript escape hatches."
            href="https://github.com/SourceCode/refractor-ui/blob/main/docs/adr/ADR-0002-strict-typescript-zero-any-unknown-and-lint-governance.md"
          />
          .
        </div>
      );

    case 'response-action-bar':
      return (
        <div className="w-full max-w-xl space-y-3">
          <div className="prism-slab p-4 text-sm text-slate-700 dark:text-slate-200">
            Generated optical theme snippet calibrated for Obsidian Dark Mode with 11.4:1 contrast.
          </div>
          <ResponseActionBar
            contentToCopy="const theme = createPrismTheme({ palette: { mode: 'dark', primary: { main: '#7C3AED' } } });"
            onCopy={() =>
              dispatch(pushToast({ title: 'Copied assistant response', tone: 'emerald' }))
            }
            onRegenerate={() =>
              dispatch(pushToast({ title: 'Regenerating assistant response...', tone: 'info' }))
            }
            onShare={() =>
              dispatch(pushToast({ title: 'Copied shareable response link', tone: 'info' }))
            }
            onFeedbackChange={(fb) => {
              if (fb) {
                dispatch(
                  pushToast({
                    title: fb === 'up' ? 'Marked response helpful' : 'Recorded feedback for improvement',
                    tone: fb === 'up' ? 'emerald' : 'amber',
                  })
                );
              }
            }}
          />
        </div>
      );

    case 'split-artifact-canvas':
      return (
        <div className="w-full">
          <SplitArtifactCanvas
            conversationTitle="Assistant Session"
            conversationPane={
              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-200">
                <div className="prism-well rounded-2xl p-3">
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">User</div>
                  Build a reusable optical glass KPI pill component with zero raw hex values.
                </div>
                <div className="prism-crystal rounded-2xl p-3">
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">Assistant</div>
                  Created <code className="font-mono">OpticalPill.tsx</code> with live preview on
                  the right pane. Toggle between Preview and Source or copy the artifact directly.
                </div>
              </div>
            }
            artifacts={[
              {
                id: 'art-1',
                title: 'OpticalPill.tsx',
                kind: 'code',
                language: 'tsx',
                version: 'v2',
                content: `export function OpticalPill({ label, value }: { label: string; value: string }) {\n  return (\n    <div className="prism-crystal rounded-full px-4 py-2 inline-flex items-center gap-2">\n      <span className="text-xs text-slate-500">{label}</span>\n      <span className="text-xs font-mono font-bold">{value}</span>\n    </div>\n  );\n}`,
                preview: (
                  <div className="flex flex-wrap items-center justify-center gap-3 py-6">
                    <div className="prism-crystal rounded-full px-4 py-2 inline-flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Latency</span>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        4.2ms
                      </span>
                    </div>
                    <div className="prism-emerald rounded-full px-4 py-2 text-xs font-semibold">
                      99.4% Coverage
                    </div>
                  </div>
                ),
              },
              {
                id: 'art-2',
                title: 'ReleaseNotes.md',
                kind: 'document',
                version: 'v1',
                content: `# Refractor UI v1.1.0\n\n- Added 6 AI & Conversational Interface components\n- Preserved >= 93% V8 coverage across all metrics`,
              },
            ]}
            onCopyArtifact={(art) =>
              dispatch(pushToast({ title: `Copied ${art.title}`, tone: 'emerald' }))
            }
            onDownloadArtifact={(art) =>
              dispatch(pushToast({ title: `Prepared download for ${art.title}`, tone: 'info' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
