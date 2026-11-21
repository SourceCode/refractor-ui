import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Brain,
  CheckCircle2,
  GitBranch,
  Layers,
  MessageSquare,
  Play,
  RotateCcw,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  AgentControlBar,
  AgentExecutionTrace,
  AgentPlanList,
  AgentRosterRail,
  ApprovalGateCard,
  AttachedContextBar,
  BadgeStatus,
  BottomNavigationBar,
  ChatMessageStream,
  CheckpointRollbackStrip,
  CitationChip,
  ConfidenceIndicator,
  ConnectedToolsDrawer,
  ContextTokenMeter,
  HandoffDivider,
  MemoryPersonaInspector,
  ModelParameterSwitcher,
  ParallelComparisonView,
  PrimaryButton,
  PromptComposer,
  RecoveryRoutingCard,
  ResponseActionBar,
  SecondaryButton,
  SplitArtifactCanvas,
  ThinkingAccordion,
  ToolCallCard,
  type AgentCheckpoint,
  type AgentMemoryItem,
  type AgentPlanStep,
  type AgentRosterMember,
  type AgentRunState,
  type AiModelOption,
  type ApprovalDecision,
  type ArtifactItem,
  type ArtifactViewMode,
  type AttachedContextItem,
  type BottomNavItem,
  type ChatMessage,
  type ComparisonCandidate,
  type ConnectedToolServer,
  type ContextTokenSegment,
  type HandoffArtifact,
  type ModelCapabilities,
  type PromptModelOption,
  type RecoveryRouteAction,
  type ResponseFeedback,
  type ThinkingStep,
  type ToolCallStatus,
  type TraceSpan,
} from '@refractor-ui/core';
import type { ExampleScreenSpec } from './types';

/* -------------------------------------------------------------------------- */
/* Screen 1: AI Chat & Cited Research Assistant                               */
/* -------------------------------------------------------------------------- */

interface ResearchCitation {
  id: string;
  index: number;
  label: string;
  title: string;
  domain: string;
  snippet: string;
  href?: string;
}

interface ResearchTurn {
  id: string;
  role: 'system' | 'user' | 'assistant';
  author?: string;
  content: string;
  timestamp?: string;
  streaming?: boolean;
  citations?: ReadonlyArray<ResearchCitation>;
  copySnippet?: string;
}

const RESEARCH_MODELS: AiModelOption[] = [
  {
    id: 'prism-ultra-25',
    name: 'Prism Ultra 2.5',
    provider: 'Refractor AI',
    contextWindow: '1M',
    speedTier: 'reasoning',
    badge: 'Reasoning',
  },
  {
    id: 'prism-pro-25',
    name: 'Prism Pro 2.5',
    provider: 'Refractor AI',
    contextWindow: '256K',
    speedTier: 'balanced',
    badge: 'Balanced',
  },
  {
    id: 'prism-flash-25',
    name: 'Prism Flash 2.5',
    provider: 'Refractor AI',
    contextWindow: '128K',
    speedTier: 'fast',
    badge: 'Fast',
  },
];

const INITIAL_CONTEXT_FILES: AttachedContextItem[] = [
  { id: 'ctx-css', label: 'packages/core/src/refractor.css', kind: 'file', tokens: 6_420, pinned: true },
  { id: 'ctx-theme', label: 'createPrismTheme.ts', kind: 'file', tokens: 4_860, pinned: true },
  { id: 'ctx-adr3', label: 'ADR-0003-optical-theming.md', kind: 'url', tokens: 3_180 },
];

const EXTRA_CONTEXT_POOL: ReadonlyArray<AttachedContextItem> = [
  { id: 'ctx-eslint', label: 'eslint-plugin-refractor/index.js', kind: 'file', tokens: 5_240 },
  { id: 'ctx-a11y', label: 'wcag-contrast-report.json', kind: 'snippet', tokens: 2_190 },
  { id: 'ctx-tokens', label: 'packages/themes/amethyst', kind: 'folder', tokens: 7_450 },
];

const CORE_CITATIONS: ReadonlyArray<ResearchCitation> = [
  {
    id: 'cit-adr3',
    index: 1,
    label: 'ADR-0003',
    title: 'Dual MUI + Astryx Optical Glass Theme Engine',
    domain: 'docs/adr/ADR-0003',
    snippet:
      'Passing a single hex color to createPrismTheme() derives light, dark, WCAG >= 4.5:1 contrastText, and caustic RGB channels.',
    href: 'https://github.com/SourceCode/refractor-ui',
  },
  {
    id: 'cit-css',
    index: 2,
    label: 'refractor.css',
    title: 'Layered Optical Refraction Tokens (@layer components)',
    domain: 'packages/core/src/refractor.css',
    snippet:
      'All prism-slab, prism-crystal, and prism-well surfaces read from --prism-* custom properties without !important overrides.',
    href: 'https://github.com/SourceCode/refractor-ui',
  },
];

const INITIAL_RESEARCH_TURNS: ResearchTurn[] = [
  {
    id: 'rt-sys',
    role: 'system',
    content: 'Refractor Research Workspace · Citations grounded in workspace ADRs & core source',
  },
  {
    id: 'rt-1',
    role: 'user',
    author: 'Maya Lin',
    content: 'How does Refractor keep contrast accessible across both light Alabaster and Obsidian dark themes?',
    timestamp: '10:14',
  },
  {
    id: 'rt-2',
    role: 'assistant',
    author: 'Refractor Research',
    content:
      'Refractor computes WCAG AA/AAA contrast tokens at theme creation time and scopes every optical surface inside @layer components. Both prism-slab and prism-crystal read --prism-text-primary and --prism-caustic-opacity so light and dark themes automatically recalibrate without raw hex overrides.',
    timestamp: '10:14',
    citations: CORE_CITATIONS,
    copySnippet:
      'const theme = createPrismTheme({ palette: { mode: "dark", primary: { main: "#e75c24" } }, optics: { refraction: "standard" } });',
  },
];

const INITIAL_THINKING_STEPS: ThinkingStep[] = [
  {
    id: 'th-1',
    title: 'Indexed attached CSS custom property definitions',
    toolName: 'read_file',
    durationMs: 240,
    status: 'done',
    detail: 'Verified 38 --prism-* semantic tokens in packages/core/src/refractor.css.',
  },
  {
    id: 'th-2',
    title: 'Cross-checked WCAG luminance formulas in colorMath',
    toolName: 'verify_contrast',
    durationMs: 410,
    status: 'done',
    detail: 'Confirmed >= 4.5:1 foreground contrast across primary, info, and emerald pills.',
  },
  {
    id: 'th-3',
    title: 'Grounded final response with verifiable source citations',
    toolName: 'cite_sources',
    durationMs: 185,
    status: 'done',
    detail: 'Attached ADR-0003 and refractor.css snippets to turn #2.',
  },
];

const QUICK_RESEARCH_PROMPTS: ReadonlyArray<string> = [
  'Audit focus-visible keyboard rings',
  'Compare Amethyst vs Obsidian tokens',
  'Summarize zero-any TypeScript rules',
];

function formatClockTime(offsetMinutes: number): string {
  const baseMinutes = 10 * 60 + 15 + offsetMinutes;
  const hh = String(Math.floor(baseMinutes / 60) % 24).padStart(2, '0');
  const mm = String(baseMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function AiChatWorkspaceScreen() {
  const [selectedModelId, setSelectedModelId] = useState<string>('prism-ultra-25');
  const [capabilities, setCapabilities] = useState<ModelCapabilities>({
    webSearch: true,
    codeExecution: true,
    extendedThinking: true,
    temperature: 0.35,
  });
  const [attachedItems, setAttachedItems] = useState<AttachedContextItem[]>(INITIAL_CONTEXT_FILES);
  const [turns, setTurns] = useState<ResearchTurn[]>(INITIAL_RESEARCH_TURNS);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>(INITIAL_THINKING_STEPS);
  const [thinkingOpen, setThinkingOpen] = useState<boolean>(false);
  const [composerValue, setComposerValue] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [feedbackByTurn, setFeedbackByTurn] = useState<Record<string, ResponseFeedback>>({});
  const [statusNotice, setStatusNotice] = useState<string>('Grounded in 3 workspace sources · Ready');
  const pendingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current);
      }
    };
  }, []);

  const promptModels: PromptModelOption[] = useMemo(
    () =>
      RESEARCH_MODELS.map((model) => ({
        id: model.id,
        label: model.name,
        badge: model.badge,
      })),
    []
  );

  const tokenSegments: ContextTokenSegment[] = useMemo(() => {
    const fileTokens = attachedItems.reduce((sum, item) => sum + (item.tokens ?? 0), 0);
    const toolTokens =
      (capabilities.webSearch ? 4_200 : 0) +
      (capabilities.codeExecution ? 5_100 : 0) +
      (capabilities.extendedThinking ? 3_800 : 0);
    const historyTokens = turns.reduce((sum, turn) => sum + Math.max(420, turn.content.length * 14), 0);
    return [
      { kind: 'system', label: 'System Policy', tokens: 6_400 },
      { kind: 'files', label: 'Attached Files', tokens: fileTokens },
      { kind: 'tools', label: 'Active Tools', tokens: toolTokens },
      { kind: 'history', label: 'Conversation', tokens: historyTokens },
    ];
  }, [attachedItems, capabilities, turns]);

  const activeModel = RESEARCH_MODELS.find((m) => m.id === selectedModelId) ?? RESEARCH_MODELS[0];

  const handleAttachContext = () => {
    const nextExtra = EXTRA_CONTEXT_POOL.find(
      (candidate) => !attachedItems.some((item) => item.id === candidate.id)
    );
    if (!nextExtra) {
      setStatusNotice('All sample workspace files are already attached.');
      return;
    }
    setAttachedItems((prev) => [...prev, nextExtra]);
    setStatusNotice(`Attached ${nextExtra.label} (+${(nextExtra.tokens ?? 0).toLocaleString('en-US')} tokens)`);
  };

  const handleRegenerateTurn = (turnId: string) => {
    const modeNote = capabilities.extendedThinking ? 'deep reasoning' : 'fast synthesis';
    setTurns((prev) =>
      prev.map((turn) =>
        turn.id === turnId
          ? {
              ...turn,
              content: `Re-synthesized via ${activeModel?.name ?? 'Prism Ultra 2.5'} (${modeNote}, temp ${capabilities.temperature.toFixed(2)}): Every Refractor optical surface inherits --prism-* contrast tokens inside @layer components, ensuring crisp WCAG readability across theme switches without cascade conflicts.`,
            }
          : turn
      )
    );
    setStatusNotice(`Regenerated response using ${activeModel?.name ?? 'active model'}`);
  };

  const submitPrompt = (prompt: string, modelId?: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
    }

    const chosenModelId = modelId ?? selectedModelId;
    setSelectedModelId(chosenModelId);
    const chosenModel = RESEARCH_MODELS.find((m) => m.id === chosenModelId) ?? activeModel;
    const turnOffset = turns.length;
    const timestamp = formatClockTime(turnOffset);
    const userId = `rt-user-${turnOffset + 1}`;
    const assistantId = `rt-ai-${turnOffset + 2}`;

    setComposerValue('');
    setIsGenerating(true);
    setThinkingOpen(true);
    setStatusNotice(`Synthesizing cited answer with ${chosenModel?.name ?? 'Prism Ultra 2.5'}...`);

    setThinkingSteps([
      {
        id: `th-${turnOffset}-1`,
        title: `Scanning ${attachedItems.length} attached workspace files`,
        toolName: 'search_context',
        durationMs: 190,
        status: 'done',
        detail: `Matched prompt terms against ${attachedItems.map((i) => i.label).join(', ') || 'system instructions'}.`,
      },
      {
        id: `th-${turnOffset}-2`,
        title: capabilities.webSearch
          ? 'Verifying design guidelines & live documentation'
          : 'Evaluating offline workspace evidence',
        toolName: capabilities.webSearch ? 'web_grounding' : 'local_ast',
        durationMs: 360,
        status: 'active',
        detail: `Temperature ${capabilities.temperature.toFixed(2)} · Extended thinking ${capabilities.extendedThinking ? 'enabled' : 'off'}.`,
      },
    ]);

    setTurns((prev) => [
      ...prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
      {
        id: userId,
        role: 'user',
        author: 'Maya Lin',
        content: trimmed,
        timestamp,
      },
      {
        id: assistantId,
        role: 'assistant',
        author: chosenModel?.name ?? 'Refractor Research',
        content: `Analyzing "${trimmed}" across ${attachedItems.length} pinned sources...`,
        timestamp,
        streaming: true,
      },
    ]);

    pendingTimerRef.current = window.setTimeout(() => {
      setIsGenerating(false);
      setThinkingSteps((prev) =>
        prev.map((step) => ({ ...step, status: 'done' }))
      );
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === assistantId
            ? {
                ...turn,
                streaming: false,
                content: `Verified answer for "${trimmed}": Based on ${attachedItems.length} active context files (${chosenModel?.name ?? 'Prism Ultra 2.5'}), Refractor enforces keyboard-only :focus-visible rings, zero any/unknown TypeScript contracts, and automatic optical contrast adaptation across every preset theme.`,
                citations: [
                  CORE_CITATIONS[0] as ResearchCitation,
                  {
                    id: `cit-turn-${turnOffset}`,
                    index: 2,
                    label: attachedItems[0]?.label.split('/').pop() ?? 'workspace',
                    title: `Grounded excerpt from ${attachedItems[0]?.label ?? 'workspace context'}`,
                    domain: 'workspace/context',
                    snippet: `Verified prompt query "${trimmed.slice(0, 64)}" against active pinned workspace tokens.`,
                  },
                ],
                copySnippet: `// Verified by ${chosenModel?.name ?? 'Prism Ultra 2.5'}\n// Prompt: ${trimmed}`,
              }
            : turn
        )
      );
      setStatusNotice(`Completed cited response · ${attachedItems.length} sources grounded`);
      pendingTimerRef.current = null;
    }, 650);
  };

  const streamMessages: ChatMessage[] = useMemo(
    () =>
      turns.map((turn) => {
        if (turn.role !== 'assistant' || turn.streaming) {
          return {
            id: turn.id,
            role: turn.role,
            author: turn.author,
            content: turn.content,
            timestamp: turn.timestamp,
            streaming: turn.streaming,
          };
        }
        return {
          id: turn.id,
          role: turn.role,
          author: turn.author,
          content: turn.content,
          timestamp: turn.timestamp,
          footer: (
            <div className="space-y-2 pt-1 min-w-0">
              {turn.citations && turn.citations.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[var(--prism-text-secondary)] mr-0.5">
                    Sources:
                  </span>
                  {turn.citations.map((citation) => (
                    <CitationChip
                      key={citation.id}
                      index={citation.index}
                      label={citation.label}
                      title={citation.title}
                      domain={citation.domain}
                      snippet={citation.snippet}
                      href={citation.href}
                      onInspect={() =>
                        setStatusNotice(`Inspecting citation [${citation.index}] ${citation.title}`)
                      }
                    />
                  ))}
                </div>
              ) : null}
              <ResponseActionBar
                contentToCopy={turn.copySnippet ?? turn.content}
                feedback={feedbackByTurn[turn.id] ?? null}
                onCopy={() => setStatusNotice('Copied grounded response snippet to clipboard')}
                onRegenerate={() => handleRegenerateTurn(turn.id)}
                onShare={() => setStatusNotice('Copied shareable citation permalink')}
                onFeedbackChange={(next) => {
                  setFeedbackByTurn((prev) => ({ ...prev, [turn.id]: next }));
                  if (next) {
                    setStatusNotice(
                      next === 'up'
                        ? 'Marked research answer helpful'
                        : 'Logged citation quality feedback'
                    );
                  }
                }}
              />
            </div>
          ),
        };
      }),
    [turns, feedbackByTurn, capabilities, activeModel]
  );

  return (
    <div className="@container w-full min-w-0 space-y-3.5">
      <div className="grid grid-cols-1 @3xl:grid-cols-12 gap-3.5 items-start min-w-0">
        <div className="@3xl:col-span-5 min-w-0 space-y-2">
          <ModelParameterSwitcher
            models={RESEARCH_MODELS}
            selectedModelId={selectedModelId}
            onModelChange={(id) => {
              setSelectedModelId(id);
              const found = RESEARCH_MODELS.find((m) => m.id === id);
              setStatusNotice(`Switched model to ${found?.name ?? id}`);
            }}
            capabilities={capabilities}
            onCapabilitiesChange={(nextCaps) => {
              setCapabilities(nextCaps);
              setStatusNotice(
                `Updated sampling temp ${nextCaps.temperature.toFixed(2)} · Web ${nextCaps.webSearch ? 'On' : 'Off'}`
              );
            }}
          />
          <div className="prism-well rounded-2xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[var(--prism-text-secondary)] min-w-0">
              <Sparkles
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0 text-[var(--prism-primary-main)]"
              />
              <span className="truncate">{statusNotice}</span>
            </span>
          </div>
        </div>

        <div className="@3xl:col-span-7 min-w-0">
          <ContextTokenMeter
            title="Active Research Context Budget"
            maxTokens={128_000}
            segments={tokenSegments}
          />
        </div>
      </div>

      <AttachedContextBar
        items={attachedItems}
        onItemsChange={(next) => {
          setAttachedItems(next);
          setStatusNotice(`Updated attached context (${next.length} items active)`);
        }}
        onAddClick={handleAttachContext}
        addLabel="Attach File"
      />

      <ThinkingAccordion
        open={thinkingOpen}
        onOpenChange={setThinkingOpen}
        isStreaming={isGenerating}
        title="Reasoning & Citation Verification"
        durationLabel={isGenerating ? 'Streaming...' : '0.84s'}
        steps={thinkingSteps}
      />

      <ChatMessageStream
        messages={streamMessages}
        maxHeightPx={340}
        ariaLabel="Cited research conversation"
      />

      <div className="space-y-2 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--prism-text-secondary)] mr-1">
            Try prompt:
          </span>
          {QUICK_RESEARCH_PROMPTS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={isGenerating}
              onClick={() => submitPrompt(suggestion)}
              className="prism-crystal prism-focus-ring rounded-full px-3 py-1 text-xs font-medium text-[var(--prism-text-primary)] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <PromptComposer
          value={composerValue}
          onChange={setComposerValue}
          models={promptModels}
          selectedModelId={selectedModelId}
          onModelChange={setSelectedModelId}
          attachmentsCount={attachedItems.length}
          isGenerating={isGenerating}
          maxLength={600}
          placeholder="Ask a technical question grounded in your attached workspace files..."
          onAttachClick={handleAttachContext}
          onVoiceToggle={(recording) =>
            setStatusNotice(recording ? 'Voice dictation active...' : 'Voice dictation paused')
          }
          onStop={() => {
            if (pendingTimerRef.current !== null) {
              window.clearTimeout(pendingTimerRef.current);
              pendingTimerRef.current = null;
            }
            setIsGenerating(false);
            setTurns((prev) => prev.map((t) => (t.streaming ? { ...t, streaming: false } : t)));
            setStatusNotice('Generation stopped by user');
          }}
          onSubmit={submitPrompt}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Screen 2: Split AI Chat & Live Artifact Preview Studio                     */
/* -------------------------------------------------------------------------- */

interface StudioTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  versionTag?: string;
}

interface StudioArtifactState {
  revision: number;
  showAnnualBadge: boolean;
  ctaTone: 'primary' | 'emerald';
  denseMetrics: boolean;
  headline: string;
  historyNotes: ReadonlyArray<string>;
}

const INITIAL_STUDIO_STATE: StudioArtifactState = {
  revision: 2,
  showAnnualBadge: true,
  ctaTone: 'primary',
  denseMetrics: false,
  headline: 'Prism Enterprise Seat',
  historyNotes: [
    'v1 — Initial optical glass pricing card with semantic --prism-* tokens',
    'v2 — Added annual savings badge and tabular monospace pricing layout',
  ],
};

const INITIAL_STUDIO_TURNS: StudioTurn[] = [
  {
    id: 'st-u1',
    role: 'user',
    text: 'Generate an optical glass Enterprise seat card with tabular pricing and zero raw hex values.',
  },
  {
    id: 'st-a1',
    role: 'assistant',
    text: 'Built OpticalPricingCard.tsx (v2) with interactive preview and semantic token overrides. Ask to adjust CTA tone, density, or badges below.',
    versionTag: 'v2',
  },
];

function AiArtifactCanvasScreen() {
  const [studio, setStudio] = useState<StudioArtifactState>(INITIAL_STUDIO_STATE);
  const [activeArtifactId, setActiveArtifactId] = useState<string>('pricing-card');
  const [viewMode, setViewMode] = useState<ArtifactViewMode>('split');
  const [turns, setTurns] = useState<StudioTurn[]>(INITIAL_STUDIO_TURNS);
  const [promptValue, setPromptValue] = useState<string>('');
  const [verified, setVerified] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<ResponseFeedback>(null);
  const [studioNotice, setStudioNotice] = useState<string>('Live preview synced to v2 TSX source');

  const applyIteration = (instruction: string) => {
    const trimmed = instruction.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();

    const nextRevision = studio.revision + 1;
    const nextCtaTone: 'primary' | 'emerald' = lower.includes('emerald')
      ? 'emerald'
      : lower.includes('primary') || lower.includes('amber') || lower.includes('tangerine')
        ? 'primary'
        : studio.ctaTone;
    const nextAnnualBadge = lower.includes('hide annual') || lower.includes('remove badge')
      ? false
      : lower.includes('annual') || lower.includes('badge') || lower.includes('discount')
        ? true
        : studio.showAnnualBadge;
    const nextDenseMetrics = lower.includes('dense') || lower.includes('metric') || lower.includes('sla')
      ? !studio.denseMetrics
      : studio.denseMetrics;

    const summaryNote = `v${nextRevision} — ${trimmed}`;
    setStudio({
      revision: nextRevision,
      showAnnualBadge: nextAnnualBadge,
      ctaTone: nextCtaTone,
      denseMetrics: nextDenseMetrics,
      headline: lower.includes('scale') ? 'Prism Scale Cluster' : studio.headline,
      historyNotes: [...studio.historyNotes, summaryNote],
    });

    setTurns((prev) => [
      ...prev,
      { id: `st-u-${nextRevision}`, role: 'user', text: trimmed },
      {
        id: `st-a-${nextRevision}`,
        role: 'assistant',
        text: `Updated OpticalPricingCard.tsx to v${nextRevision} (CTA: ${nextCtaTone}, annual badge: ${nextAnnualBadge ? 'visible' : 'hidden'}, metrics: ${nextDenseMetrics ? 'expanded' : 'standard'}).`,
        versionTag: `v${nextRevision}`,
      },
    ]);
    setPromptValue('');
    setStudioNotice(`Compiled live preview v${nextRevision} · 0 TypeScript errors`);
  };

  const generatedCardSource = useMemo(() => {
    const ctaClass = studio.ctaTone === 'emerald' ? 'prism-emerald' : 'prism-btn-primary';
    const badgeBlock = studio.showAnnualBadge
      ? `\n        <span className="prism-emerald rounded-full px-2.5 py-0.5 text-[11px] font-semibold">Save 20%</span>`
      : '';
    const metricBlock = studio.denseMetrics
      ? `\n      <div className="grid grid-cols-3 gap-2 pt-2 text-center">\n        <div className="prism-well rounded-xl p-2"><p className="text-[10px] opacity-70">SLA</p><p className="text-xs font-mono font-bold">99.99%</p></div>\n        <div className="prism-well rounded-xl p-2"><p className="text-[10px] opacity-70">Latency</p><p className="text-xs font-mono font-bold">14ms</p></div>\n        <div className="prism-well rounded-xl p-2"><p className="text-[10px] opacity-70">Seats</p><p className="text-xs font-mono font-bold">Unlimited</p></div>\n      </div>`
      : '';
    return `export interface OpticalPricingCardProps {\n  planName: string;\n  priceMonthly: number;\n  onUpgrade: () => void;\n}\n\nexport function OpticalPricingCard({ planName, priceMonthly, onUpgrade }: OpticalPricingCardProps) {\n  return (\n    <section className="prism-slab p-5 space-y-4 max-w-sm w-full">\n      <div className="flex items-center justify-between gap-2">\n        <h3 className="text-base font-semibold">{planName}</h3>${badgeBlock}\n      </div>\n      <p className="text-3xl font-mono font-bold tabular-nums">\${priceMonthly}<span className="text-xs font-normal">/mo</span></p>${metricBlock}\n      <button type="button" onClick={onUpgrade} className="${ctaClass} w-full h-10 rounded-full text-xs font-semibold">\n        Provision Workspace\n      </button>\n    </section>\n  );\n}`;
  }, [studio]);

  const artifacts: ReadonlyArray<ArtifactItem> = useMemo(
    () => [
      {
        id: 'pricing-card',
        title: 'OpticalPricingCard.tsx',
        kind: 'code',
        language: 'tsx',
        version: `v${studio.revision}`,
        content: generatedCardSource,
        preview: (
          <div className="w-full py-3 flex flex-col items-center justify-center gap-3">
            <div className="prism-slab p-5 space-y-4 w-full max-w-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--prism-text-secondary)]">
                    Refractor Cloud
                  </p>
                  <h4 className="text-base font-semibold text-[var(--prism-text-primary)]">
                    {studio.headline}
                  </h4>
                </div>
                {studio.showAnnualBadge ? (
                  <span className="prism-emerald rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                    Save 20% Annual
                  </span>
                ) : null}
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-mono font-bold tabular-nums text-[var(--prism-text-primary)]">
                  $49
                </span>
                <span className="text-xs text-[var(--prism-text-secondary)]">/ editor / month</span>
              </div>

              <ul className="space-y-1.5 text-xs text-[var(--prism-text-secondary)]">
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0 text-[var(--prism-success-main)]"
                  />
                  <span>130+ optical glass primitives &amp; 5 preset themes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0 text-[var(--prism-success-main)]"
                  />
                  <span>Dedicated MCP server &amp; strict AST lint governance</span>
                </li>
              </ul>

              {studio.denseMetrics ? (
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="prism-well rounded-xl p-2">
                    <p className="text-[10px] text-[var(--prism-text-secondary)]">SLA</p>
                    <p className="text-xs font-mono font-bold text-[var(--prism-text-primary)]">
                      99.99%
                    </p>
                  </div>
                  <div className="prism-well rounded-xl p-2">
                    <p className="text-[10px] text-[var(--prism-text-secondary)]">Edge p95</p>
                    <p className="text-xs font-mono font-bold text-[var(--prism-text-primary)]">
                      14ms
                    </p>
                  </div>
                  <div className="prism-well rounded-xl p-2">
                    <p className="text-[10px] text-[var(--prism-text-secondary)]">Audit</p>
                    <p className="text-xs font-mono font-bold text-[var(--prism-text-primary)]">
                      SOC2
                    </p>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  setStudioNotice(`Clicked live preview CTA on OpticalPricingCard v${studio.revision}`)
                }
                className={`${
                  studio.ctaTone === 'emerald' ? 'prism-emerald' : 'prism-btn-primary'
                } prism-focus-ring w-full h-10 rounded-full text-xs font-semibold cursor-pointer transition-all`}
              >
                Provision Optical Workspace
              </button>
            </div>
          </div>
        ),
      },
      {
        id: 'theme-tokens',
        title: 'prismThemeTokens.ts',
        kind: 'code',
        language: 'typescript',
        version: `v${studio.revision}`,
        content: `import { createPrismTheme } from '@refractor-ui/core';\n\nexport const studioTheme = createPrismTheme({\n  palette: {\n    mode: 'dark',\n    primary: { main: '${studio.ctaTone === 'emerald' ? '#26bc92' : '#e75c24'}' },\n    secondary: { main: '#38bdf8' },\n  },\n  optics: {\n    blurPx: 18,\n    refraction: '${studio.denseMetrics ? 'subtle' : 'standard'}',\n    specularHighlight: true,\n  },\n});`,
      },
      {
        id: 'design-spec',
        title: 'IterationLog.md',
        kind: 'document',
        language: 'markdown',
        version: `v${studio.revision}`,
        content: `# Artifact Iteration Changelog\n\n${studio.historyNotes.map((line) => `- ${line}`).join('\n')}\n\n## Verification Gates\n- Zero any / unknown types\n- WCAG >= 4.5:1 text contrast\n- Container-safe responsive layout`,
      },
    ],
    [studio, generatedCardSource]
  );

  const tokenSegments: ContextTokenSegment[] = useMemo(
    () => [
      { kind: 'system', label: 'UI Spec', tokens: 5_200 },
      { kind: 'files', label: 'Artifact Code', tokens: 3_400 + studio.revision * 680 },
      { kind: 'history', label: 'Revisions', tokens: turns.length * 1_150 },
    ],
    [studio.revision, turns.length]
  );

  const confidenceScore = Math.min(99, 92 + studio.revision * 2);

  return (
    <div className="@container w-full min-w-0 space-y-3.5">
      <div className="prism-slab p-3.5 sm:p-4 flex flex-col gap-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="prism-crystal rounded-full px-3 py-1 text-xs font-semibold text-[var(--prism-text-primary)] inline-flex items-center gap-1.5">
              <Layers aria-hidden="true" className="w-3.5 h-3.5 text-[var(--prism-primary-main)]" />
              <span>Artifact Studio · v{studio.revision}</span>
            </span>
            <ConfidenceIndicator
              score={confidenceScore}
              verified={verified}
              sourceCount={4}
              rationale="Generated TSX validated against Refractor BaseProps, zero any/unknown rules, and semantic --prism-* CSS token coverage."
              onMarkVerified={() => {
                setVerified(true);
                setStudioNotice(`Human-verified OpticalPricingCard v${studio.revision}`);
              }}
            />
          </div>
          <span className="text-xs text-[var(--prism-text-secondary)] truncate max-w-full">
            {studioNotice}
          </span>
        </div>

        <ContextTokenMeter
          title="Workbench Context Window"
          maxTokens={64_000}
          segments={tokenSegments}
        />
      </div>

      <SplitArtifactCanvas
        conversationTitle="Artifact Refinement Chat"
        activeArtifactId={activeArtifactId}
        onActiveArtifactChange={setActiveArtifactId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        artifacts={artifacts}
        onCopyArtifact={(artifact) =>
          setStudioNotice(`Copied ${artifact.title} (${artifact.version ?? 'latest'})`)
        }
        onDownloadArtifact={(artifact) =>
          setStudioNotice(`Prepared download bundle for ${artifact.title}`)
        }
        conversationPane={
          <div className="flex flex-col gap-3 min-w-0">
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={
                    turn.role === 'user'
                      ? 'prism-well rounded-2xl p-3 text-xs text-[var(--prism-text-primary)]'
                      : 'prism-crystal rounded-2xl p-3 text-xs text-[var(--prism-text-primary)]'
                  }
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold">
                      {turn.role === 'user' ? 'Engineer' : 'Refractor Studio AI'}
                    </span>
                    {turn.versionTag ? (
                      <span className="prism-emerald rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold">
                        {turn.versionTag}
                      </span>
                    ) : null}
                  </div>
                  <p className="leading-relaxed text-[var(--prism-text-secondary)]">{turn.text}</p>
                </div>
              ))}
            </div>

            <ResponseActionBar
              contentToCopy={generatedCardSource}
              feedback={feedback}
              onCopy={() => setStudioNotice(`Copied OpticalPricingCard.tsx v${studio.revision}`)}
              onRegenerate={() =>
                applyIteration(
                  studio.ctaTone === 'emerald'
                    ? 'Switch back to primary amber CTA'
                    : 'Switch CTA to emerald optical glass'
                )
              }
              onShare={() => setStudioNotice('Copied live artifact sandbox URL')}
              onFeedbackChange={(next) => {
                setFeedback(next);
                if (next) {
                  setStudioNotice(
                    next === 'up' ? 'Artifact iteration approved' : 'Marked iteration for tuning'
                  );
                }
              }}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyIteration('Switch CTA to emerald optical glass')}
                className="prism-crystal prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--prism-text-primary)] cursor-pointer"
              >
                Emerald CTA
              </button>
              <button
                type="button"
                onClick={() => applyIteration('Toggle dense SLA metric strip')}
                className="prism-crystal prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--prism-text-primary)] cursor-pointer"
              >
                {studio.denseMetrics ? 'Simplify metrics' : 'Add SLA metrics'}
              </button>
              <button
                type="button"
                onClick={() =>
                  applyIteration(
                    studio.showAnnualBadge ? 'Remove badge for clean header' : 'Add annual discount badge'
                  )
                }
                className="prism-crystal prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--prism-text-primary)] cursor-pointer"
              >
                {studio.showAnnualBadge ? 'Hide badge' : 'Add badge'}
              </button>
            </div>

            <PromptComposer
              value={promptValue}
              onChange={setPromptValue}
              placeholder="Refine the artifact (e.g. 'Add SLA metrics and emerald CTA')..."
              onSubmit={(prompt) => applyIteration(prompt)}
            />
          </div>
        }
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Screen 3: Autonomous AI Agent Workflow & Human Approval Gate               */
/* -------------------------------------------------------------------------- */

const INITIAL_PLAN_STEPS: AgentPlanStep[] = [
  {
    id: 'step-1',
    title: 'Run strict TypeScript & ESLint AST audit',
    detail: '0 any/unknown violations across 130 packages/core components',
    status: 'done',
  },
  {
    id: 'step-2',
    title: 'Execute Vitest suite & coverage verification',
    detail: 'Statements 97.4% · Branches 94.8% (>= 93% floor)',
    status: 'done',
  },
  {
    id: 'step-3',
    title: 'Deploy canary build to us-east-canary (15%)',
    detail: 'Blocked on explicit human operator approval gate',
    status: 'active',
  },
  {
    id: 'step-4',
    title: 'Verify edge p99 telemetry & promote 100%',
    detail: 'Automated rollout after 5m error-free observation window',
    status: 'pending',
  },
];

const INITIAL_CHECKPOINTS: AgentCheckpoint[] = [
  {
    id: 'cp-1',
    label: 'AST & Typecheck Clean',
    turn: 1,
    timestamp: '11:04',
    filesChanged: 3,
    summary: 'Passed strict ESLint and tsc --noEmit with zero warnings.',
  },
  {
    id: 'cp-2',
    label: 'Coverage Gate Passed',
    turn: 2,
    timestamp: '11:07',
    filesChanged: 2,
    summary: 'Verified >= 93% coverage across all 4 metrics.',
  },
  {
    id: 'cp-3',
    label: 'Pre-Canary Approval Hold',
    turn: 3,
    timestamp: '11:10',
    filesChanged: 1,
    summary: 'Prepared canary manifest; paused for human sign-off.',
  },
];

function AiAgentWorkflowScreen() {
  const [runState, setRunState] = useState<AgentRunState>('running');
  const [planSteps, setPlanSteps] = useState<AgentPlanStep[]>(INITIAL_PLAN_STEPS);
  const [gateDecision, setGateDecision] = useState<ApprovalDecision | undefined>(undefined);
  const [gateResetKey, setGateResetKey] = useState<number>(0);
  const [canaryStatus, setCanaryStatus] = useState<ToolCallStatus>('running');
  const [canaryOutputs, setCanaryOutputs] = useState<Array<{ key: string; value: string }>>([
    { key: 'state', value: 'awaiting_operator_signature' },
    { key: 'canaryCluster', value: 'us-east-canary' },
  ]);
  const [checkpoints, setCheckpoints] = useState<AgentCheckpoint[]>(INITIAL_CHECKPOINTS);
  const [activeCheckpointId, setActiveCheckpointId] = useState<string>('cp-3');
  const [recoveryResolved, setRecoveryResolved] = useState<string | null>(null);
  const [operatorLog, setOperatorLog] = useState<string>(
    'Agent paused at Step 3 — review parameters in Approval Gate before canary mutation.'
  );

  const activeStep = planSteps.find((s) => s.status === 'active') ?? planSteps[planSteps.length - 1];

  const handleStepForward = () => {
    const activeIndex = planSteps.findIndex((s) => s.status === 'active');
    if (activeIndex === -1) {
      setOperatorLog('All workflow steps are already completed.');
      return;
    }
    const nextSteps = planSteps.map((step, idx) => {
      if (idx === activeIndex) return { ...step, status: 'done' as const };
      if (idx === activeIndex + 1) return { ...step, status: 'active' as const };
      return step;
    });
    setPlanSteps(nextSteps);
    setRunState('running');
    setOperatorLog(`Stepped past "${planSteps[activeIndex]?.title ?? 'active step'}".`);
  };

  const handleApproveGate = (updatedParams: Record<string, string>) => {
    const cluster = updatedParams.cluster ?? 'us-east-canary';
    const traffic = updatedParams.traffic ?? '15%';
    setGateDecision('approved');
    setRunState('running');
    setCanaryStatus('success');
    setCanaryOutputs([
      { key: 'state', value: 'deployed' },
      { key: 'canaryCluster', value: cluster },
      { key: 'trafficWeight', value: traffic },
    ]);
    setPlanSteps((prev) =>
      prev.map((step) => {
        if (step.id === 'step-3') {
          return { ...step, status: 'done', detail: `Approved (${cluster} @ ${traffic})` };
        }
        if (step.id === 'step-4') {
          return { ...step, status: 'active' };
        }
        return step;
      })
    );
    const nextTurn = checkpoints.length + 1;
    const newCheckpoint: AgentCheckpoint = {
      id: `cp-${nextTurn}`,
      label: `Canary Approved (${traffic})`,
      turn: nextTurn,
      timestamp: '11:12',
      filesChanged: 1,
      summary: `Operator approved deploy to ${cluster} at ${traffic} traffic weight.`,
    };
    setCheckpoints((prev) => [...prev, newCheckpoint]);
    setActiveCheckpointId(newCheckpoint.id);
    setOperatorLog(`Approved canary release to ${cluster} (${traffic}) — advancing to telemetry check.`);
  };

  const handleRejectGate = (reason?: string) => {
    setGateDecision('rejected');
    setRunState('paused');
    setCanaryStatus('error');
    setCanaryOutputs([
      { key: 'state', value: 'rejected_by_operator' },
      { key: 'reason', value: reason ?? 'Manual hold requested' },
    ]);
    setPlanSteps((prev) =>
      prev.map((step) =>
        step.id === 'step-3'
          ? { ...step, status: 'failed', detail: reason ?? 'Rejected at approval gate' }
          : step
      )
    );
    setOperatorLog(
      `Rejected canary deploy${reason ? `: "${reason}"` : ''} — choose a fallback in Recovery Routing.`
    );
  };

  const handleResetGate = () => {
    setGateDecision(undefined);
    setGateResetKey((prev) => prev + 1);
    setCanaryStatus('running');
    setCanaryOutputs([
      { key: 'state', value: 'awaiting_operator_signature' },
      { key: 'canaryCluster', value: 'us-east-canary' },
    ]);
    setPlanSteps(INITIAL_PLAN_STEPS);
    setRunState('running');
    setRecoveryResolved(null);
    setOperatorLog('Reset approval gate and restored workflow to Turn 3 pre-canary checkpoint.');
  };

  const handleRollback = (cp: AgentCheckpoint) => {
    setActiveCheckpointId(cp.id);
    setGateDecision(undefined);
    setGateResetKey((prev) => prev + 1);
    setCanaryStatus('running');
    setRunState('paused');
    setPlanSteps(
      INITIAL_PLAN_STEPS.map((step, idx) => ({
        ...step,
        status: idx < cp.turn - 1 ? 'done' : idx === cp.turn - 1 ? 'active' : 'pending',
      }))
    );
    setOperatorLog(`Rolled back agent state to Turn ${cp.turn} (${cp.label}).`);
  };

  const handleFork = (cp: AgentCheckpoint) => {
    const forkId = `cp-fork-${checkpoints.length + 1}`;
    const forked: AgentCheckpoint = {
      id: forkId,
      label: `Fork · ${cp.label}`,
      turn: cp.turn,
      timestamp: '11:14',
      filesChanged: cp.filesChanged,
      summary: `Branched isolated sandbox from Turn ${cp.turn}.`,
    };
    setCheckpoints((prev) => [...prev, forked]);
    setActiveCheckpointId(forkId);
    setOperatorLog(`Forked isolated agent branch from Turn ${cp.turn}.`);
  };

  const handleRecoveryRoute = (route: RecoveryRouteAction) => {
    setRecoveryResolved(`Executed recovery strategy: ${route.label}`);
    if (route.kind === 'retry' || route.kind === 'switch') {
      setRunState('running');
      setCanaryStatus('success');
      setOperatorLog(`Recovered probe via "${route.label}" — agent loop resumed.`);
    } else if (route.kind === 'skip') {
      setRunState('running');
      setOperatorLog('Skipped optional latency probe and continued pipeline.');
    } else {
      setOperatorLog('Opened timeout parameter editor (60s threshold applied).');
    }
  };

  const gateTone =
    gateDecision === 'approved'
      ? 'online'
      : gateDecision === 'rejected'
        ? 'offline'
        : 'warning';
  const gateLabel =
    gateDecision === 'approved'
      ? 'Gate Approved'
      : gateDecision === 'rejected'
        ? 'Gate Rejected'
        : 'Approval Pending';

  return (
    <div className="@container w-full min-w-0 space-y-4">
      <div className="prism-crystal rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <BadgeStatus label={gateLabel} tone={gateTone} />
          <span className="text-xs text-[var(--prism-text-secondary)] break-words">
            {operatorLog}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <SecondaryButton
            size="sm"
            leadingIcon={<Play aria-hidden="true" className="w-3.5 h-3.5" />}
            onClick={handleStepForward}
          >
            Step Forward
          </SecondaryButton>
          {gateDecision !== undefined || runState === 'stopped' ? (
            <SecondaryButton
              size="sm"
              leadingIcon={<RotateCcw aria-hidden="true" className="w-3.5 h-3.5" />}
              onClick={handleResetGate}
            >
              Reset Workflow
            </SecondaryButton>
          ) : null}
        </div>
      </div>

      <AgentControlBar
        status={runState}
        onStatusChange={setRunState}
        currentStepLabel={activeStep?.title ?? 'Release pipeline idle'}
        onPause={() => setOperatorLog('Operator paused autonomous loop.')}
        onResume={() => setOperatorLog('Operator resumed autonomous loop.')}
        onStop={() => setOperatorLog('Emergency stop issued — click Reset Workflow to restart.')}
        onRedirect={(instruction) => {
          const nextId = `step-steer-${planSteps.length + 1}`;
          setPlanSteps((prev) => [
            ...prev,
            {
              id: nextId,
              title: `Steer: ${instruction}`,
              detail: 'Injected mid-flight by operator',
              status: 'pending',
            },
          ]);
          setOperatorLog(`Injected steering instruction into execution plan: "${instruction}"`);
        }}
      />

      <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-4 items-start min-w-0">
        <div className="space-y-4 min-w-0">
          <AgentPlanList
            title="Canary Release Plan"
            steps={planSteps}
            onStepsChange={setPlanSteps}
            editable
            onSelectStep={(step) => setOperatorLog(`Inspecting plan step: ${step.title}`)}
          />

          <div className="space-y-2.5 min-w-0">
            <ToolCallCard
              toolName="verify_release_gates"
              category="terminal"
              status="success"
              durationMs={412}
              summary="Lint, typecheck & 97.4% coverage verified"
              defaultExpanded
              inputs={[
                { key: 'command', value: 'pnpm test:coverage && pnpm lint:strict' },
                { key: 'floor', value: '93%' },
              ]}
              outputs={[
                { key: 'exitCode', value: '0' },
                { key: 'coverage', value: '97.4% stmts / 94.8% branches' },
              ]}
            />
            <ToolCallCard
              toolName="deploy_canary_release"
              category="api"
              status={canaryStatus}
              durationMs={canaryStatus === 'success' ? 684 : undefined}
              summary={
                canaryStatus === 'success'
                  ? 'Canary manifest applied to edge cluster'
                  : canaryStatus === 'error'
                    ? 'Execution blocked by operator rejection'
                    : 'Waiting for ApprovalGateCard authorization'
              }
              inputs={[
                { key: 'package', value: '@refractor-ui/core@1.21.0' },
                { key: 'strategy', value: 'progressive-canary' },
              ]}
              outputs={canaryOutputs}
              errorMessage={
                canaryStatus === 'error'
                  ? 'Mutation halted after operator declined approval gate.'
                  : undefined
              }
            />
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <ApprovalGateCard
            key={gateResetKey}
            title="Authorize Canary Rollout"
            actionName="deploy_canary_release --cluster us-east-canary"
            description="Review and optionally adjust rollout parameters before the agent mutates live production routing."
            riskLevel="high"
            decision={gateDecision}
            parameters={[
              { key: 'cluster', label: 'Target Cluster', value: 'us-east-canary', editable: true },
              { key: 'traffic', label: 'Canary Weight', value: '15%', editable: true },
              { key: 'sha', label: 'Artifact SHA', value: '8f3c91a', editable: false },
            ]}
            onApprove={handleApproveGate}
            onReject={handleRejectGate}
          />

          <RecoveryRoutingCard
            title={recoveryResolved ? 'Recovery Strategy Applied' : 'Synthetic Telemetry Probe Timed Out'}
            errorCode={recoveryResolved ? 'RECOVERY_ACTIVE' : 'ERR_CANARY_PROBE_TIMEOUT'}
            errorMessage={
              recoveryResolved ??
              'Region us-east-canary health probe did not respond within 15,000ms during pre-flight verification.'
            }
            stackTrace={
              'TimeoutError: Synthetic probe exceeded 15000ms\n  at checkCanaryHealth (deploy.ts:94:11)\n  at async executeAgentStep (orchestrator.ts:142:7)'
            }
            routes={[
              {
                id: 'retry-probe',
                label: 'Retry Once',
                description: 'Re-run health probe with fresh pool',
                kind: 'retry',
                primary: true,
              },
              {
                id: 'edit-timeout',
                label: 'Edit Timeout',
                description: 'Raise threshold from 15s to 60s',
                kind: 'edit',
              },
              {
                id: 'switch-region',
                label: 'Switch Region',
                description: 'Route probe through eu-west-2',
                kind: 'switch',
              },
              {
                id: 'skip-probe',
                label: 'Skip Probe',
                description: 'Rely on passive metrics only',
                kind: 'skip',
              },
            ]}
            onSelectRoute={handleRecoveryRoute}
          />
        </div>
      </div>

      <CheckpointRollbackStrip
        checkpoints={checkpoints}
        activeCheckpointId={activeCheckpointId}
        onSelectCheckpoint={(cp) => {
          setActiveCheckpointId(cp.id);
          setOperatorLog(`Previewing Turn ${cp.turn} snapshot: ${cp.label}`);
        }}
        onRollback={handleRollback}
        onFork={handleFork}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Screen 4: Multi-Agent Swarm Orchestration Console                          */
/* -------------------------------------------------------------------------- */

interface HandoffScenario {
  fromAgent: string;
  toAgent: string;
  timestamp: string;
  summary: string;
  artifacts: HandoffArtifact[];
  payload: string;
}

const INITIAL_SWARM_AGENTS: AgentRosterMember[] = [
  {
    id: 'coord',
    name: 'Coordinator',
    role: 'Planner',
    status: 'done',
    currentTask: 'Partitioned optical spec into 3 workstreams',
  },
  {
    id: 'architect',
    name: 'Core Architect',
    role: 'UI Engineer',
    status: 'thinking',
    currentTask: 'Benchmarking cascade layer vs CSS modules',
  },
  {
    id: 'auditor',
    name: 'Security Auditor',
    role: 'OWASP Reviewer',
    status: 'tool',
    currentTask: 'Scanning URL sanitizers & prototype guards',
  },
  {
    id: 'verifier',
    name: 'Release Verifier',
    role: 'QA & Coverage',
    status: 'waiting',
    currentTask: 'Queued for parallel consensus winner',
  },
];

const HANDOFFS_BY_AGENT: Record<string, HandoffScenario> = {
  coord: {
    fromAgent: 'Coordinator',
    toAgent: 'Core Architect',
    timestamp: '14:40 UTC',
    summary: 'Delegated zero-any React 19 optical component contracts and CSS @layer cascade targets.',
    artifacts: [
      { id: 'ha-1', label: 'ADR-0001.md', kind: 'plan' },
      { id: 'ha-2', label: 'BaseProps.ts', kind: 'file' },
      { id: 'ha-3', label: 'budget.json', kind: 'data' },
    ],
    payload: '{\n  "swarmId": "optical-v1-21",\n  "workers": 4,\n  "coverageFloor": 93\n}',
  },
  architect: {
    fromAgent: 'Core Architect',
    toAgent: 'Security Auditor',
    timestamp: '14:42 UTC',
    summary: 'Submitted 3 candidate styling architectures for XSS, contrast, and token-cascade verification.',
    artifacts: [
      { id: 'ha-4', label: 'refractor.css', kind: 'file' },
      { id: 'ha-5', label: 'candidate-eval.json', kind: 'data' },
    ],
    payload: '{\n  "candidates": 3,\n  "topCandidate": "cand-layer",\n  "strictTypes": true\n}',
  },
  auditor: {
    fromAgent: 'Security Auditor',
    toAgent: 'Release Verifier',
    timestamp: '14:44 UTC',
    summary: 'Cleared sanitizeUrl and isSafeObjectKey checks; handing off to coverage runner.',
    artifacts: [
      { id: 'ha-6', label: 'owasp-audit.md', kind: 'summary' },
      { id: 'ha-7', label: 'ast-lint.json', kind: 'data' },
    ],
    payload: '{\n  "criticalIssues": 0,\n  "rawHtmlUsages": 0,\n  "approvedForMerge": true\n}',
  },
  verifier: {
    fromAgent: 'Release Verifier',
    toAgent: 'Coordinator',
    timestamp: '14:46 UTC',
    summary: 'Compiled final coverage report (97.8%) and prepared candidate benchmark summary.',
    artifacts: [
      { id: 'ha-8', label: 'coverage-summary.json', kind: 'data' },
      { id: 'ha-9', label: 'release-notes.md', kind: 'summary' },
    ],
    payload: '{\n  "statements": 97.8,\n  "branches": 94.9,\n  "status": "ready"\n}',
  },
};

const INITIAL_TRACE_SPANS: TraceSpan[] = [
  {
    id: 'sp-1',
    agentName: 'Coordinator',
    label: 'Decompose optical architecture brief',
    kind: 'llm',
    status: 'ok',
    startMs: 0,
    durationMs: 360,
    tokens: 1_180,
    detail: 'Assigned Core Architect, Security Auditor, and Release Verifier to parallel lanes.',
  },
  {
    id: 'sp-2',
    agentName: 'Core Architect',
    label: 'search_codebase(--prism-caustic)',
    kind: 'retrieval',
    status: 'ok',
    startMs: 310,
    durationMs: 210,
    detail: 'Matched 42 token bindings across core and 5 preset theme packages.',
  },
  {
    id: 'sp-3',
    agentName: 'Coordinator',
    label: 'Handoff spec to Security Auditor',
    kind: 'handoff',
    status: 'ok',
    startMs: 490,
    durationMs: 120,
    detail: 'Transferred AST diff payload and zero-any constraint checklist.',
  },
  {
    id: 'sp-4',
    agentName: 'Security Auditor',
    label: 'eslint --max-warnings=0 (strict)',
    kind: 'tool',
    status: 'ok',
    startMs: 590,
    durationMs: 540,
    tokens: 480,
    detail: 'All 17 @refractor AST rules passed with zero warnings.',
  },
  {
    id: 'sp-5',
    agentName: 'Release Verifier',
    label: 'Evaluate 3 parallel candidate branches',
    kind: 'llm',
    status: 'running',
    startMs: 920,
    durationMs: 490,
    tokens: 1_640,
    detail: 'Scoring token composability, bundle overhead, and Tailwind v4 cascade purity.',
  },
];

const COMPARISON_CANDIDATES: ComparisonCandidate[] = [
  {
    id: 'cand-layer',
    label: 'CSS @layer Optical Tokens',
    model: 'Prism Ultra 2.5',
    latencyMs: 610,
    tokens: 428,
    score: 98,
    output:
      'Scope prism-slab and prism-crystal inside @layer components reading --prism-* tokens so Tailwind utilities compose predictably with zero !important overrides across all 5 preset themes.',
  },
  {
    id: 'cand-modules',
    label: 'Scoped CSS Modules',
    model: 'Prism Pro 2.5',
    latencyMs: 440,
    tokens: 365,
    score: 91,
    output:
      'Compile per-component CSS module hashes paired with shared custom properties; isolates specificity cleanly but increases bundler CSS fragmentation across multi-theme cascades.',
  },
];

const INITIAL_SWARM_MEMORIES: AgentMemoryItem[] = [
  {
    id: 'mem-1',
    category: 'rule',
    content: 'All shared primitives must forbid TypeScript any and unknown types.',
    updatedAt: '4m ago',
  },
  {
    id: 'mem-2',
    category: 'preference',
    content: 'Prefer @layer components CSS tokens over runtime inline style computation.',
    updatedAt: '12m ago',
  },
  {
    id: 'mem-3',
    category: 'fact',
    content: 'Coverage threshold is enforced at >= 93% across statements, branches, functions, and lines.',
    updatedAt: '28m ago',
  },
];

function MultiAgentOrchestratorScreen() {
  const [agents, setAgents] = useState<AgentRosterMember[]>(INITIAL_SWARM_AGENTS);
  const [activeAgentId, setActiveAgentId] = useState<string>('architect');
  const [spans, setSpans] = useState<TraceSpan[]>(INITIAL_TRACE_SPANS);
  const [selectedSpanId, setSelectedSpanId] = useState<string>('sp-2');
  const [winnerId, setWinnerId] = useState<string>('cand-layer');
  const [memories, setMemories] = useState<AgentMemoryItem[]>(INITIAL_SWARM_MEMORIES);
  const [swarmStatus, setSwarmStatus] = useState<string>(
    'Inspecting Core Architect · Select any specialist or candidate winner to steer consensus.'
  );

  const activeHandoff = HANDOFFS_BY_AGENT[activeAgentId] ?? (HANDOFFS_BY_AGENT.coord as HandoffScenario);
  const activeWinner =
    COMPARISON_CANDIDATES.find((c) => c.id === winnerId) ?? (COMPARISON_CANDIDATES[0] as ComparisonCandidate);

  const handleAdvanceTick = () => {
    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.status === 'thinking') {
          return { ...agent, status: 'tool', currentTask: 'Running optical token cascade benchmark' };
        }
        if (agent.status === 'tool') {
          return { ...agent, status: 'done', currentTask: 'Published verified audit artifact' };
        }
        if (agent.status === 'waiting') {
          return { ...agent, status: 'thinking', currentTask: 'Validating consensus winner metrics' };
        }
        return agent;
      })
    );
    setSpans((prev) =>
      prev.map((span) =>
        span.status === 'running'
          ? { ...span, status: 'ok', detail: 'Consensus scoring finished — top score 98/100.' }
          : span
      )
    );
    setSwarmStatus('Advanced swarm execution tick — all active spans progressed.');
  };

  const handlePromoteWinnerToMemory = () => {
    const ruleText = `Swarm consensus (${activeWinner.model ?? 'model'}): Adopt "${activeWinner.label}" (score ${activeWinner.score ?? 0}/100).`;
    if (memories.some((item) => item.content === ruleText)) {
      setSwarmStatus(`"${activeWinner.label}" is already persisted in shared swarm memory.`);
      return;
    }
    const nextMemory: AgentMemoryItem = {
      id: `mem-${memories.length + 1}`,
      category: 'rule',
      content: ruleText,
      updatedAt: 'just now',
    };
    setMemories((prev) => [nextMemory, ...prev]);
    setSwarmStatus(`Promoted "${activeWinner.label}" into Memory & Persona Inspector.`);
  };

  return (
    <div className="@container w-full min-w-0 space-y-4">
      <div className="prism-crystal rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <BadgeStatus label="Swarm Active" count={agents.length} tone="online" />
          <span className="text-xs text-[var(--prism-text-secondary)] break-words">
            {swarmStatus}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <SecondaryButton
            size="sm"
            leadingIcon={<GitBranch aria-hidden="true" className="w-3.5 h-3.5" />}
            onClick={handleAdvanceTick}
          >
            Advance Tick
          </SecondaryButton>
          <PrimaryButton
            size="sm"
            leadingIcon={<Brain aria-hidden="true" className="w-3.5 h-3.5" />}
            onClick={handlePromoteWinnerToMemory}
          >
            Promote Winner
          </PrimaryButton>
        </div>
      </div>

      <AgentRosterRail
        title="Active Specialist Swarm"
        agents={agents}
        activeAgentId={activeAgentId}
        onSelectAgent={(agent) => {
          setActiveAgentId(agent.id);
          const matchingSpan = spans.find((s) => s.agentName === agent.name);
          if (matchingSpan) {
            setSelectedSpanId(matchingSpan.id);
          }
          setSwarmStatus(`Focused ${agent.name} (${agent.role}) · ${agent.currentTask ?? 'Idle'}`);
        }}
      />

      <HandoffDivider
        fromAgent={activeHandoff.fromAgent}
        toAgent={activeHandoff.toAgent}
        timestamp={activeHandoff.timestamp}
        summary={activeHandoff.summary}
        artifacts={activeHandoff.artifacts}
        payload={activeHandoff.payload}
        onArtifactClick={(artifact) =>
          setSwarmStatus(`Opened handoff artifact "${artifact.label}" (${artifact.kind ?? 'file'})`)
        }
      />

      <ParallelComparisonView
        title="Architecture Candidate Consensus"
        candidates={COMPARISON_CANDIDATES}
        winnerId={winnerId}
        onSelectWinner={(candidate) => {
          setWinnerId(candidate.id);
          setSwarmStatus(
            `Selected consensus winner: ${candidate.label} (${candidate.score ?? 0}/100)`
          );
        }}
        onCopyWinner={(candidate) =>
          setSwarmStatus(`Copied winning strategy "${candidate.label}" to clipboard`)
        }
      />

      <div className="grid grid-cols-1 @4xl:grid-cols-12 gap-4 items-start min-w-0">
        <div className="@4xl:col-span-7 min-w-0">
          <AgentExecutionTrace
            title="Multi-Agent Waterfall Trace"
            spans={spans}
            selectedSpanId={selectedSpanId}
            onSelectSpan={(span) => {
              setSelectedSpanId(span.id);
              setSwarmStatus(
                `Inspecting span "${span.label}" (${span.durationMs}ms · ${span.agentName})`
              );
            }}
          />
        </div>

        <div className="@4xl:col-span-5 min-w-0">
          <MemoryPersonaInspector
            mode="inline"
            title="Shared Swarm Memory"
            memories={memories}
            onMemoriesChange={(next) => {
              setMemories(next);
              setSwarmStatus(`Shared swarm memory updated (${next.length} persistent entries)`);
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Screen 5: Mobile AI Copilot Companion App                                  */
/* -------------------------------------------------------------------------- */

type MobileCopilotTab = 'chat' | 'agents' | 'memory' | 'tools';

interface MobileTurn {
  id: string;
  role: 'user' | 'assistant';
  author: string;
  content: string;
  timestamp: string;
  cited?: boolean;
}

const INITIAL_MOBILE_TURNS: MobileTurn[] = [
  {
    id: 'mob-1',
    role: 'user',
    author: 'You',
    content: 'Did the nightly release build pass coverage?',
    timestamp: '09:18',
  },
  {
    id: 'mob-2',
    role: 'assistant',
    author: 'Prism Copilot',
    content:
      'Yes — all 132 suites passed with 97.4% statements and 0 strict ESLint errors. GitHub Pages artifact is staged.',
    timestamp: '09:18',
    cited: true,
  },
];

const MOBILE_THINKING_STEPS: ThinkingStep[] = [
  {
    id: 'mth-1',
    title: 'Queried GitHub Actions latest run #482',
    toolName: 'gh_runs',
    durationMs: 160,
    status: 'done',
  },
  {
    id: 'mth-2',
    title: 'Parsed V8 coverage summary artifact',
    toolName: 'read_json',
    durationMs: 95,
    status: 'done',
  },
];

const MOBILE_AGENTS: AgentRosterMember[] = [
  {
    id: 'ma-ci',
    name: 'CI Watchdog',
    role: 'Build Ops',
    status: 'done',
    currentTask: 'Verified v1.21.0 build green',
  },
  {
    id: 'ma-pr',
    name: 'PR Summarizer',
    role: 'Code Review',
    status: 'thinking',
    currentTask: 'Reviewing 4 docs example screens',
  },
  {
    id: 'ma-sec',
    name: 'Dependency Guard',
    role: 'Security',
    status: 'tool',
    currentTask: 'Checking lockfile advisories',
  },
];

const MOBILE_INITIAL_MEMORIES: AgentMemoryItem[] = [
  {
    id: 'mm-1',
    category: 'preference',
    content: 'Keep mobile summaries concise under 3 sentences with citations.',
    updatedAt: '10m ago',
  },
  {
    id: 'mm-2',
    category: 'rule',
    content: 'Alert immediately if test coverage drops below 93%.',
    updatedAt: '1h ago',
  },
];

const MOBILE_INITIAL_TOOLS: ConnectedToolServer[] = [
  {
    id: 'mt-github',
    name: 'GitHub Mobile MCP',
    description: 'PR checks, releases, and workflow status',
    health: 'connected',
    toolCount: 12,
    scopes: ['read', 'network'],
    enabled: true,
  },
  {
    id: 'mt-pager',
    name: 'Incident On-Call',
    description: 'Live alerts and runbook lookup',
    health: 'connected',
    toolCount: 5,
    scopes: ['read'],
    enabled: true,
  },
  {
    id: 'mt-calendar',
    name: 'Release Calendar',
    description: 'Deploy freeze windows & handoffs',
    health: 'degraded',
    toolCount: 3,
    scopes: ['read'],
    enabled: false,
  },
];

function isMobileCopilotTab(value: string): value is MobileCopilotTab {
  return value === 'chat' || value === 'agents' || value === 'memory' || value === 'tools';
}

function MobileAiCopilotScreen() {
  const [activeTab, setActiveTab] = useState<MobileCopilotTab>('chat');
  const [verified, setVerified] = useState<boolean>(false);
  const [turns, setTurns] = useState<MobileTurn[]>(INITIAL_MOBILE_TURNS);
  const [promptValue, setPromptValue] = useState<string>('');
  const [memories, setMemories] = useState<AgentMemoryItem[]>(MOBILE_INITIAL_MEMORIES);
  const [servers, setServers] = useState<ConnectedToolServer[]>(MOBILE_INITIAL_TOOLS);
  const [mobileNote, setMobileNote] = useState<string>('Synced · 2 agents active');

  const navItems: BottomNavItem[] = useMemo(
    () => [
      { id: 'chat', label: 'Chat', icon: <MessageSquare aria-hidden="true" className="w-4 h-4" /> },
      {
        id: 'agents',
        label: 'Agents',
        icon: <Bot aria-hidden="true" className="w-4 h-4" />,
        badgeCount: 2,
      },
      { id: 'memory', label: 'Memory', icon: <Brain aria-hidden="true" className="w-4 h-4" /> },
      { id: 'tools', label: 'Tools', icon: <Wrench aria-hidden="true" className="w-4 h-4" /> },
    ],
    []
  );

  const handleMobileSubmit = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const count = turns.length;
    const timestamp = formatClockTime(count + 4);
    setTurns((prev) => [
      ...prev,
      {
        id: `mob-u-${count + 1}`,
        role: 'user',
        author: 'You',
        content: trimmed,
        timestamp,
      },
      {
        id: `mob-a-${count + 2}`,
        role: 'assistant',
        author: 'Prism Copilot',
        content: `Checked "${trimmed}": Build #482 is healthy (p95 latency 18ms, 0 lint errors). Tap the citation chip below for run details.`,
        timestamp,
        cited: true,
      },
    ]);
    setPromptValue('');
    setMobileNote('Replied with live telemetry citation');
  };

  const chatMessages: ChatMessage[] = useMemo(
    () =>
      turns.map((turn) => ({
        id: turn.id,
        role: turn.role,
        author: turn.author,
        content: turn.content,
        timestamp: turn.timestamp,
        footer: turn.cited ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <CitationChip
              index={1}
              label="CI #482"
              title="Nightly Release Verification #482"
              domain="actions.github.com"
              snippet="Vitest coverage: 97.4% statements, 94.8% branches. Strict ESLint: 0 warnings."
              onInspect={() => setMobileNote('Opened CI #482 citation preview')}
            />
            <CitationChip
              index={2}
              label="Pages Build"
              title="GitHub Pages Static Bundle"
              domain="refractor-ui.dev"
              snippet="Production Vite bundle verified with zero broken subpath assets."
              onInspect={() => setMobileNote('Opened Pages Build citation preview')}
            />
          </div>
        ) : undefined,
      })),
    [turns]
  );

  return (
    <div className="w-full max-w-[390px] mx-auto min-w-0">
      <div className="prism-slab rounded-[28px] overflow-hidden flex flex-col min-w-0">
        <header className="px-3.5 py-3 border-b border-[var(--prism-divider)] flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="prism-btn-primary w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0">
              <Sparkles aria-hidden="true" className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--prism-text-primary)] truncate">
                Prism Copilot
              </p>
              <p className="text-[11px] text-[var(--prism-text-secondary)] truncate">
                {mobileNote}
              </p>
            </div>
          </div>

          <ConfidenceIndicator
            score={95}
            verified={verified}
            sourceCount={2}
            rationale="Verified against GitHub Actions build #482 and live coverage artifacts."
            onMarkVerified={() => {
              setVerified(true);
              setMobileNote('Output human-verified');
            }}
          />
        </header>

        <div className="p-3 space-y-2.5 flex-1 min-w-0">
          {activeTab === 'chat' ? (
            <>
              <ThinkingAccordion
                defaultOpen={false}
                title="2 verification steps"
                durationLabel="0.26s"
                steps={MOBILE_THINKING_STEPS}
              />

              <ChatMessageStream
                messages={chatMessages}
                maxHeightPx={240}
                ariaLabel="Mobile copilot conversation"
              />

              <div className="flex flex-wrap items-center gap-1.5">
                {(['Check latency', 'Summarize PR #48'] as const).map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleMobileSubmit(chip)}
                    className="prism-crystal prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--prism-text-primary)] cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <PromptComposer
                value={promptValue}
                onChange={setPromptValue}
                placeholder="Ask Prism Copilot..."
                onSubmit={handleMobileSubmit}
              />
            </>
          ) : null}

          {activeTab === 'agents' ? (
            <AgentRosterRail
              title="Background Agents"
              orientation="vertical"
              agents={MOBILE_AGENTS}
              onSelectAgent={(agent) =>
                setMobileNote(`${agent.name}: ${agent.currentTask ?? agent.status}`)
              }
            />
          ) : null}

          {activeTab === 'memory' ? (
            <MemoryPersonaInspector
              mode="inline"
              title="Copilot Memory"
              memories={memories}
              onMemoriesChange={(next) => {
                setMemories(next);
                setMobileNote(`${next.length} memories synced`);
              }}
            />
          ) : null}

          {activeTab === 'tools' ? (
            <ConnectedToolsDrawer
              mode="inline"
              title="Connected Tools"
              servers={servers}
              onServersChange={setServers}
              onToggleServer={(serverId, enabled) =>
                setMobileNote(`${enabled ? 'Enabled' : 'Paused'} ${serverId}`)
              }
            />
          ) : null}
        </div>

        <div className="px-2.5 pb-2.5 pt-1 border-t border-[var(--prism-divider)]">
          <BottomNavigationBar
            mode="inline"
            activeId={activeTab}
            items={navItems}
            ariaLabel="Mobile AI copilot navigation"
            onChange={(id, item) => {
              if (isMobileCopilotTab(id)) {
                setActiveTab(id);
                setMobileNote(`Viewing ${item.label}`);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Standalone Copy-Pasteable Full Code Snippets (Zero any / Zero unknown)     */
/* -------------------------------------------------------------------------- */

const AI_CHAT_WORKSPACE_CODE = `import { useState } from 'react';
import {
  AttachedContextBar,
  ChatMessageStream,
  CitationChip,
  ContextTokenMeter,
  ModelParameterSwitcher,
  PromptComposer,
  ResponseActionBar,
  ThinkingAccordion,
  type AiModelOption,
  type AttachedContextItem,
  type ChatMessage,
  type ModelCapabilities,
} from '@refractor-ui/core';

const MODELS: AiModelOption[] = [
  { id: 'prism-ultra', name: 'Prism Ultra 2.5', provider: 'Refractor AI', contextWindow: '1M', speedTier: 'reasoning', badge: 'Reasoning' },
  { id: 'prism-flash', name: 'Prism Flash 2.5', provider: 'Refractor AI', contextWindow: '128K', speedTier: 'fast', badge: 'Fast' },
];

export function CitedResearchAssistant() {
  const [modelId, setModelId] = useState('prism-ultra');
  const [capabilities, setCapabilities] = useState<ModelCapabilities>({
    webSearch: true,
    codeExecution: true,
    extendedThinking: true,
    temperature: 0.35,
  });
  const [contextItems, setContextItems] = useState<AttachedContextItem[]>([
    { id: 'f1', label: 'refractor.css', kind: 'file', tokens: 6420, pinned: true },
    { id: 'f2', label: 'ADR-0003.md', kind: 'url', tokens: 3180 },
  ]);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'm1', role: 'user', author: 'Maya Lin', content: 'How do optical glass tokens stay WCAG compliant?', timestamp: '10:14' },
    {
      id: 'm2',
      role: 'assistant',
      author: 'Prism Ultra 2.5',
      content: 'createPrismTheme() computes WCAG >= 4.5:1 foreground tokens and writes --prism-* variables scoped to @layer components.',
      timestamp: '10:14',
      footer: (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap gap-1.5">
            <CitationChip index={1} label="ADR-0003" title="Optical Theme Engine" domain="docs/adr" snippet="Automatic WCAG contrast math." />
          </div>
          <ResponseActionBar contentToCopy="createPrismTheme({ palette: { mode: 'dark' } })" />
        </div>
      ),
    },
  ]);

  const handleSubmit = (nextPrompt: string, chosenModel?: string) => {
    const trimmed = nextPrompt.trim();
    if (!trimmed) return;
    setPrompt('');
    setMessages((prev) => [
      ...prev,
      { id: \`u-\${prev.length + 1}\`, role: 'user', author: 'Maya Lin', content: trimmed, timestamp: '10:15' },
      { id: \`a-\${prev.length + 2}\`, role: 'assistant', author: chosenModel ?? modelId, content: \`Grounded reply for "\${trimmed}" across \${contextItems.length} files.\`, timestamp: '10:15' },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModelParameterSwitcher models={MODELS} selectedModelId={modelId} onModelChange={setModelId} capabilities={capabilities} onCapabilitiesChange={setCapabilities} />
        <ContextTokenMeter maxTokens={128_000} segments={[{ kind: 'system', label: 'Policy', tokens: 6400 }, { kind: 'files', label: 'Files', tokens: contextItems.reduce((s, i) => s + (i.tokens ?? 0), 0) }, { kind: 'history', label: 'Chat', tokens: messages.length * 1200 }]} />
      </div>
      <AttachedContextBar items={contextItems} onItemsChange={setContextItems} />
      <ThinkingAccordion title="Reasoning Trace" durationLabel="0.8s" steps={[{ id: 's1', title: 'Verified --prism-* CSS tokens', toolName: 'read_file', status: 'done', durationMs: 240 }]} />
      <ChatMessageStream messages={messages} maxHeightPx={340} />
      <PromptComposer value={prompt} onChange={setPrompt} models={MODELS.map((m) => ({ id: m.id, label: m.name, badge: m.badge }))} selectedModelId={modelId} attachmentsCount={contextItems.length} onSubmit={handleSubmit} />
    </div>
  );
}`;

const AI_ARTIFACT_CANVAS_CODE = `import { useState } from 'react';
import {
  ConfidenceIndicator,
  ContextTokenMeter,
  PromptComposer,
  ResponseActionBar,
  SplitArtifactCanvas,
  type ArtifactItem,
  type ArtifactViewMode,
} from '@refractor-ui/core';

export function SplitArtifactStudio() {
  const [revision, setRevision] = useState(2);
  const [emeraldCta, setEmeraldCta] = useState(false);
  const [verified, setVerified] = useState(false);
  const [viewMode, setViewMode] = useState<ArtifactViewMode>('split');
  const [prompt, setPrompt] = useState('');
  const [notes, setNotes] = useState<string[]>(['v2: Optical pricing card generated with --prism-* tokens.']);

  const ctaClass = emeraldCta ? 'prism-emerald' : 'prism-btn-primary';
  const cardCode = \`export function PricingCard() {
  return (
    <section className="prism-slab p-5 space-y-3">
      <h3 className="text-base font-semibold">Prism Enterprise</h3>
      <button type="button" className="\${ctaClass} w-full h-10 rounded-full text-xs font-semibold">Provision Workspace</button>
    </section>
  );
}\`;

  const artifacts: ArtifactItem[] = [
    {
      id: 'card',
      title: 'OpticalPricingCard.tsx',
      kind: 'code',
      language: 'tsx',
      version: \`v\${revision}\`,
      content: cardCode,
      preview: (
        <div className="prism-slab p-5 space-y-3 max-w-xs mx-auto">
          <h3 className="text-base font-semibold">Prism Enterprise</h3>
          <p className="text-2xl font-mono font-bold tabular-nums">$49/mo</p>
          <button type="button" className={\`\${ctaClass} w-full h-10 rounded-full text-xs font-semibold\`}>Provision Workspace</button>
        </div>
      ),
    },
  ];

  const handleIterate = (instruction: string) => {
    const nextRev = revision + 1;
    setRevision(nextRev);
    if (instruction.toLowerCase().includes('emerald')) setEmeraldCta(true);
    setNotes((prev) => [...prev, \`v\${nextRev}: \${instruction}\`]);
    setPrompt('');
  };

  return (
    <div className="space-y-4">
      <div className="prism-slab p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">Artifact Studio v{revision}</span>
          <ConfidenceIndicator score={96} verified={verified} sourceCount={4} onMarkVerified={() => setVerified(true)} />
        </div>
        <ContextTokenMeter maxTokens={64_000} segments={[{ kind: 'system', label: 'Spec', tokens: 5200 }, { kind: 'files', label: 'TSX', tokens: 3400 + revision * 600 }]} />
      </div>
      <SplitArtifactCanvas
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        artifacts={artifacts}
        conversationPane={
          <div className="space-y-3">
            {notes.map((entry) => (<div key={entry} className="prism-crystal rounded-2xl p-3 text-xs">{entry}</div>))}
            <ResponseActionBar contentToCopy={cardCode} onRegenerate={() => setEmeraldCta((v) => !v)} />
            <PromptComposer value={prompt} onChange={setPrompt} placeholder="Iterate on the live artifact..." onSubmit={handleIterate} />
          </div>
        }
      />
    </div>
  );
}`;

const AI_AGENT_WORKFLOW_CODE = `import { useState } from 'react';
import {
  AgentControlBar,
  AgentPlanList,
  ApprovalGateCard,
  CheckpointRollbackStrip,
  RecoveryRoutingCard,
  ToolCallCard,
  type AgentCheckpoint,
  type AgentPlanStep,
  type AgentRunState,
  type ApprovalDecision,
} from '@refractor-ui/core';

export function AgentApprovalWorkflow() {
  const [status, setStatus] = useState<AgentRunState>('running');
  const [decision, setDecision] = useState<ApprovalDecision | undefined>(undefined);
  const [steps, setSteps] = useState<AgentPlanStep[]>([
    { id: 's1', title: 'Run strict AST lint & typecheck', status: 'done' },
    { id: 's2', title: 'Deploy canary to us-east-canary (15%)', status: 'active' },
    { id: 's3', title: 'Verify telemetry & promote 100%', status: 'pending' },
  ]);
  const [checkpoints, setCheckpoints] = useState<AgentCheckpoint[]>([
    { id: 'cp1', label: 'Tests Passed', turn: 1, timestamp: '11:04', filesChanged: 2 },
    { id: 'cp2', label: 'Approval Hold', turn: 2, timestamp: '11:10', filesChanged: 1 },
  ]);

  const handleApprove = (params: Record<string, string>) => {
    setDecision('approved');
    setStatus('running');
    setSteps((prev) =>
      prev.map((s) => (s.id === 's2' ? { ...s, status: 'done', detail: \`Approved (\${params.traffic ?? '15%'})\` } : s.id === 's3' ? { ...s, status: 'active' } : s))
    );
  };

  return (
    <div className="space-y-4">
      <AgentControlBar
        status={status}
        onStatusChange={setStatus}
        currentStepLabel={steps.find((s) => s.status === 'active')?.title ?? 'Completed'}
        onRedirect={(instruction) => setSteps((prev) => [...prev, { id: \`steer-\${prev.length + 1}\`, title: instruction, status: 'pending' }])}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <AgentPlanList title="Canary Release Plan" steps={steps} onStepsChange={setSteps} editable />
          <ToolCallCard
            toolName="deploy_canary_release"
            category="api"
            status={decision === 'approved' ? 'success' : decision === 'rejected' ? 'error' : 'running'}
            inputs={[{ key: 'cluster', value: 'us-east-canary' }]}
            outputs={[{ key: 'state', value: decision ?? 'awaiting_signoff' }]}
          />
        </div>
        <div className="space-y-4">
          <ApprovalGateCard
            title="Authorize Canary Rollout"
            actionName="deploy_canary_release --cluster us-east-canary"
            riskLevel="high"
            decision={decision}
            parameters={[{ key: 'traffic', label: 'Canary Weight', value: '15%', editable: true }]}
            onApprove={handleApprove}
            onReject={() => {
              setDecision('rejected');
              setStatus('paused');
            }}
          />
          <RecoveryRoutingCard
            title="Synthetic Probe Timeout"
            errorCode="ERR_PROBE_TIMEOUT"
            errorMessage="Canary health probe exceeded 15,000ms."
            routes={[
              { id: 'retry', label: 'Retry Once', kind: 'retry', primary: true },
              { id: 'skip', label: 'Skip Probe', kind: 'skip' },
            ]}
            onSelectRoute={() => setStatus('running')}
          />
        </div>
      </div>
      <CheckpointRollbackStrip checkpoints={checkpoints} onFork={(cp) => setCheckpoints((prev) => [...prev, { ...cp, id: \`fork-\${prev.length + 1}\`, label: \`Fork · \${cp.label}\` }])} />
    </div>
  );
}`;

const MULTI_AGENT_ORCHESTRATOR_CODE = `import { useState } from 'react';
import {
  AgentExecutionTrace,
  AgentRosterRail,
  HandoffDivider,
  MemoryPersonaInspector,
  ParallelComparisonView,
  type AgentMemoryItem,
  type AgentRosterMember,
  type ComparisonCandidate,
  type TraceSpan,
} from '@refractor-ui/core';

const AGENTS: AgentRosterMember[] = [
  { id: 'coord', name: 'Coordinator', role: 'Planner', status: 'done', currentTask: 'Partitioned optical spec' },
  { id: 'arch', name: 'Core Architect', role: 'UI Engineer', status: 'thinking', currentTask: 'Comparing token strategies' },
  { id: 'sec', name: 'Security Auditor', role: 'OWASP Reviewer', status: 'tool', currentTask: 'Scanning URL sanitizers' },
];

const SPANS: TraceSpan[] = [
  { id: 'sp1', agentName: 'Coordinator', label: 'Decompose release spec', kind: 'llm', status: 'ok', startMs: 0, durationMs: 360, tokens: 1180 },
  { id: 'sp2', agentName: 'Core Architect', label: 'search_codebase(--prism)', kind: 'retrieval', status: 'ok', startMs: 310, durationMs: 210 },
  { id: 'sp3', agentName: 'Security Auditor', label: 'eslint --max-warnings=0', kind: 'tool', status: 'ok', startMs: 520, durationMs: 540, tokens: 480 },
];

const CANDIDATES: ComparisonCandidate[] = [
  { id: 'layer', label: 'CSS @layer Optical Tokens', model: 'Prism Ultra 2.5', latencyMs: 610, tokens: 428, score: 98, output: 'Scope prism-* classes inside @layer components for zero !important overrides.' },
  { id: 'modules', label: 'Scoped CSS Modules', model: 'Prism Pro 2.5', latencyMs: 440, tokens: 365, score: 91, output: 'Compile per-component module hashes paired with custom properties.' },
];

export function MultiAgentConsole() {
  const [activeAgentId, setActiveAgentId] = useState('arch');
  const [winnerId, setWinnerId] = useState('layer');
  const [memories, setMemories] = useState<AgentMemoryItem[]>([
    { id: 'm1', category: 'rule', content: 'Zero any or unknown types across core.', updatedAt: '4m ago' },
  ]);

  return (
    <div className="space-y-4">
      <AgentRosterRail agents={AGENTS} activeAgentId={activeAgentId} onSelectAgent={(agent) => setActiveAgentId(agent.id)} />
      <HandoffDivider
        fromAgent="Coordinator"
        toAgent="Core Architect"
        timestamp="14:42 UTC"
        summary="Transferred optical glass token constraints and strict lint budget."
        artifacts={[{ id: 'a1', label: 'ADR-0003.md', kind: 'plan' }, { id: 'a2', label: 'refractor.css', kind: 'file' }]}
        payload='{"coverageFloor":93,"strictTypes":true}'
      />
      <AgentExecutionTrace spans={SPANS} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ParallelComparisonView
          candidates={CANDIDATES}
          winnerId={winnerId}
          onSelectWinner={(candidate) => {
            setWinnerId(candidate.id);
            setMemories((prev) => [{ id: \`win-\${prev.length + 1}\`, category: 'rule', content: \`Adopted \${candidate.label}\`, updatedAt: 'now' }, ...prev]);
          }}
        />
        <MemoryPersonaInspector mode="inline" memories={memories} onMemoriesChange={setMemories} />
      </div>
    </div>
  );
}`;

const MOBILE_AI_COPILOT_CODE = `import { useState } from 'react';
import { Bot, Brain, MessageSquare, Wrench } from 'lucide-react';
import {
  AgentRosterRail,
  BottomNavigationBar,
  ChatMessageStream,
  CitationChip,
  ConfidenceIndicator,
  ConnectedToolsDrawer,
  MemoryPersonaInspector,
  PromptComposer,
  ThinkingAccordion,
  type BottomNavItem,
  type ChatMessage,
} from '@refractor-ui/core';

export function MobileAiCopilot() {
  const [tab, setTab] = useState('chat');
  const [verified, setVerified] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'user', author: 'You', content: 'Did nightly CI pass coverage?', timestamp: '09:18' },
    {
      id: '2',
      role: 'assistant',
      author: 'Prism Copilot',
      content: 'Yes — 132 suites passed at 97.4% coverage with zero lint warnings.',
      timestamp: '09:18',
      footer: <CitationChip index={1} label="CI #482" title="Nightly Build #482" domain="actions.github.com" />,
    },
  ]);

  const navItems: BottomNavItem[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'agents', label: 'Agents', icon: <Bot className="w-4 h-4" />, badgeCount: 2 },
    { id: 'memory', label: 'Memory', icon: <Brain className="w-4 h-4" /> },
    { id: 'tools', label: 'Tools', icon: <Wrench className="w-4 h-4" /> },
  ];

  const handleSubmit = (text: string) => {
    setPrompt('');
    setMessages((prev) => [
      ...prev,
      { id: \`u-\${prev.length + 1}\`, role: 'user', author: 'You', content: text, timestamp: '09:19' },
      { id: \`a-\${prev.length + 2}\`, role: 'assistant', author: 'Prism Copilot', content: \`Verified "\${text}" against live telemetry.\`, timestamp: '09:19' },
    ]);
  };

  return (
    <div className="prism-slab rounded-[28px] max-w-[390px] mx-auto overflow-hidden flex flex-col">
      <header className="px-3.5 py-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">Prism Copilot</span>
        <ConfidenceIndicator score={95} verified={verified} sourceCount={2} onMarkVerified={() => setVerified(true)} />
      </header>
      <div className="p-3 space-y-2.5">
        {tab === 'chat' && (
          <>
            <ThinkingAccordion defaultOpen={false} title="2 verification steps" durationLabel="0.26s" steps={[{ id: 's1', title: 'Queried CI #482', status: 'done', durationMs: 160 }]} />
            <ChatMessageStream messages={messages} maxHeightPx={240} />
            <PromptComposer value={prompt} onChange={setPrompt} placeholder="Ask Prism Copilot..." onSubmit={handleSubmit} />
          </>
        )}
        {tab === 'agents' && <AgentRosterRail orientation="vertical" agents={[{ id: 'ci', name: 'CI Watchdog', role: 'Ops', status: 'done', currentTask: 'Build green' }]} />}
        {tab === 'memory' && <MemoryPersonaInspector mode="inline" defaultMemories={[{ id: 'm1', category: 'rule', content: 'Keep mobile summaries under 3 sentences.' }]} />}
        {tab === 'tools' && <ConnectedToolsDrawer mode="inline" defaultServers={[{ id: 'gh', name: 'GitHub MCP', health: 'connected', toolCount: 12, scopes: ['read'], enabled: true }]} />}
      </div>
      <div className="p-2.5">
        <BottomNavigationBar mode="inline" activeId={tab} items={navItems} onChange={(id) => setTab(id)} />
      </div>
    </div>
  );
}`;

/* -------------------------------------------------------------------------- */
/* Exported AI Workflow Example Catalog                                       */
/* -------------------------------------------------------------------------- */

export const AI_WORKFLOW_EXAMPLES: ReadonlyArray<ExampleScreenSpec> = [
  {
    id: 'ai-chat-workspace',
    title: 'AI Chat & Cited Research Assistant',
    domain: 'ai-workflows',
    domainTitle: 'AI Chat, Copilots & Agent Workflows',
    summary:
      'Complete conversational research desk uniting live model & sampling controls, real-time token window budgeting, pinned workspace files, collapsible reasoning steps, inline verifiable citations, and a streaming prompt composer.',
    devices: ['web', 'tablet', 'mobile'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'ModelParameterSwitcher',
      'ContextTokenMeter',
      'AttachedContextBar',
      'ThinkingAccordion',
      'ChatMessageStream',
      'CitationChip',
      'ResponseActionBar',
      'PromptComposer',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'Synced ModelParameterSwitcher & ContextTokenMeter recalculate token budgets live as context files are attached or pruned.',
      'Inline CitationChip source popovers and ResponseActionBar nest directly inside ChatMessageStream turn footers.',
      'Collapsible ThinkingAccordion streams verification steps without cluttering primary reading hierarchy.',
      'Container-responsive layout transitions seamlessly from widescreen desktop to 768px tablet and 390px mobile.',
    ],
    fullCode: AI_CHAT_WORKSPACE_CODE,
    render: () => <AiChatWorkspaceScreen />,
  },
  {
    id: 'ai-artifact-canvas',
    title: 'Split AI Chat & Live Artifact Preview Studio',
    domain: 'ai-workflows',
    domainTitle: 'AI Chat, Copilots & Agent Workflows',
    summary:
      'Side-by-side generative engineering workbench pairing iterative prompt refinement, live reliability sign-off, and context telemetry with a tabbed multi-artifact live preview and typed TSX source inspector.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'SplitArtifactCanvas',
      'ConfidenceIndicator',
      'ContextTokenMeter',
      'ResponseActionBar',
      'PromptComposer',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'Prompting or tapping refinement presets updates both the interactive optical preview and typed TSX source simultaneously.',
      'Built-in Split, Chat, and Artifact view toggles keep tablet viewports spacious with zero horizontal overflow.',
      'ConfidenceIndicator surfaces automated verification rationale and allows one-click human sign-off.',
      'ResponseActionBar and ContextTokenMeter stay anchored in context across iterative revisions.',
    ],
    fullCode: AI_ARTIFACT_CANVAS_CODE,
    render: () => <AiArtifactCanvasScreen />,
  },
  {
    id: 'ai-agent-workflow',
    title: 'Autonomous AI Agent Workflow & Human Approval Gate',
    domain: 'ai-workflows',
    domainTitle: 'AI Chat, Copilots & Agent Workflows',
    summary:
      'Production human-in-the-loop agent mission control combining run-state steering, an editable multi-step plan, structured tool-call inspectors, high-risk approval sign-off, checkpoint rollback, and deterministic recovery routing.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'AgentControlBar',
      'AgentPlanList',
      'ToolCallCard',
      'ApprovalGateCard',
      'CheckpointRollbackStrip',
      'RecoveryRoutingCard',
      'BadgeStatus',
      'SecondaryButton',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'ApprovalGateCard enforces explicit operator authorization with editable canary rollout parameters before mutation.',
      'AgentControlBar pause, resume, stop, and mid-flight redirect instructions synchronize directly with AgentPlanList.',
      'CheckpointRollbackStrip performs real turn-by-turn state restoration and isolated branch forking.',
      'RecoveryRoutingCard pairs collapsible stack traces with one-click retry, fallback, and skip recovery paths.',
    ],
    fullCode: AI_AGENT_WORKFLOW_CODE,
    render: () => <AiAgentWorkflowScreen />,
  },
  {
    id: 'multi-agent-orchestrator',
    title: 'Multi-Agent Swarm Orchestration Console',
    domain: 'ai-workflows',
    domainTitle: 'AI Chat, Copilots & Agent Workflows',
    summary:
      'Coordinated multi-agent orchestration console uniting a specialist roster rail, structured inter-agent handoff payloads, filterable waterfall execution traces, side-by-side candidate output evaluation, and persistent shared memory.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'AgentRosterRail',
      'HandoffDivider',
      'AgentExecutionTrace',
      'ParallelComparisonView',
      'MemoryPersonaInspector',
      'BadgeStatus',
      'PrimaryButton',
      'SecondaryButton',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Selecting any specialist in AgentRosterRail synchronizes handoff payload context and highlights matching waterfall spans.',
      'ParallelComparisonView compares candidate latency, token cost, and quality scores before crowning a winner.',
      'One-click winner promotion writes the chosen architecture consensus straight into MemoryPersonaInspector.',
      'HandoffDivider reveals transferable artifact pills and structured JSON payloads without breaking workflow readability.',
    ],
    fullCode: MULTI_AGENT_ORCHESTRATOR_CODE,
    render: () => <MultiAgentOrchestratorScreen />,
  },
  {
    id: 'mobile-ai-copilot',
    title: 'Mobile AI Copilot Companion App',
    domain: 'ai-workflows',
    domainTitle: 'AI Chat, Copilots & Agent Workflows',
    summary:
      'Thumb-first handheld AI copilot companion framed with a compact reliability indicator header, touch-friendly streaming chat, collapsed reasoning trace, inline citation chips, quick prompt pills, and four-tab bottom navigation.',
    devices: ['mobile'],
    defaultPreviewFrame: 'mobile',
    componentsUsed: [
      'ConfidenceIndicator',
      'ThinkingAccordion',
      'ChatMessageStream',
      'CitationChip',
      'PromptComposer',
      'BottomNavigationBar',
      'AgentRosterRail',
      'MemoryPersonaInspector',
      'ConnectedToolsDrawer',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Thumb-anchored BottomNavigationBar switches natively between live Chat, Agents, Memory, and Tools screens.',
      'Compact mobile header embeds ConfidenceIndicator for immediate source grounding without crowding the 390px frame.',
      'Collapsed-by-default ThinkingAccordion and inline CitationChip pills preserve precious vertical reading space.',
      'One-tap starter chips and compact PromptComposer enable effortless single-hand mobile prompt submission.',
    ],
    fullCode: MOBILE_AI_COPILOT_CODE,
    render: () => <MobileAiCopilotScreen />,
  },
];
