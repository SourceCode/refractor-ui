import { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  CheckCircle2,
  Database,
  GitMerge,
  GitPullRequest,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Webhook,
  Workflow,
} from 'lucide-react';
import {
  AdvancedDataGrid,
  type AdvancedGridColumn,
  BadgeStatus,
  Breadcrumbs,
  type BreadcrumbCrumb,
  BrushRangeScrubber,
  type BrushIndexRange,
  type BrushPoint,
  CodeEditor,
  type CodeDiagnostic,
  type CodeLanguage,
  ComboSplitButton,
  type ComboSplitAction,
  CommandInputBar,
  CommentThread,
  type CommentItem,
  CopyableCommandBlock,
  type DiffHunk,
  type DiffHunkStatus,
  DiffViewer,
  FacetedFilterBar,
  type FacetedFilterState,
  type FlowEdge,
  type FlowNode,
  type GridCellValue,
  type GridRowRecord,
  HoldToConfirmButton,
  InlineDiffReviewer,
  type JsonObject,
  KeycapBadge,
  LiveLogStreamer,
  type LogEntry,
  LivePresenceIndicator,
  type MentionUser,
  NodeGraphCanvas,
  type PresenceUser,
  PrimaryButton,
  type ProcessStatus,
  ProcessStatusPill,
  type QueryFieldSpec,
  type QueryGroupNode,
  type QueryNode,
  SankeyDiagram,
  type SankeyLink,
  type SankeyNode,
  SecondaryButton,
  SpeedDialButton,
  type SpeedDialAction,
  Stepper,
  type StepDefinition,
  StructuredOutputViewer,
  TerminalMultiplexer,
  type TerminalSessionPane,
  type TreeNodeItem,
  TreeView,
  VisualQueryBuilder,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';
import type { ExampleScreenSpec } from './types';

/* ============================================================================
 * 1. Cloud Code Editing Workspace & Terminal IDE
 * ============================================================================ */

interface IdeWorkspaceFile {
  id: string;
  name: string;
  path: string;
  folderId: string;
  language: CodeLanguage;
  initialContent: string;
  diagnostics: ReadonlyArray<CodeDiagnostic>;
}

const IDE_TREE_NODES: ReadonlyArray<TreeNodeItem> = [
  { id: 'dir-packages', name: 'packages', type: 'folder', parentId: null },
  { id: 'dir-core', name: 'core/src', type: 'folder', parentId: 'dir-packages' },
  {
    id: 'file-theme',
    name: 'opticalTheme.ts',
    type: 'file',
    parentId: 'dir-core',
    sizeBytes: 2480,
  },
  {
    id: 'file-caustics',
    name: 'causticEngine.ts',
    type: 'file',
    parentId: 'dir-core',
    sizeBytes: 1920,
  },
  {
    id: 'file-styles',
    name: 'refractor.css',
    type: 'file',
    parentId: 'dir-core',
    sizeBytes: 3140,
  },
  {
    id: 'file-manifest',
    name: 'package.json',
    type: 'file',
    parentId: 'dir-packages',
    sizeBytes: 1120,
  },
];

const IDE_FILES: readonly [IdeWorkspaceFile, ...IdeWorkspaceFile[]] = [
  {
    id: 'file-theme',
    name: 'opticalTheme.ts',
    path: 'packages/core/src/opticalTheme.ts',
    folderId: 'dir-core',
    language: 'typescript',
    initialContent: `import { createPrismTheme, type PrismTheme } from '@refractor-ui/core';

export interface OpticalPresetSpec {
  readonly id: 'alabaster' | 'obsidian';
  readonly blurPx: number;
  readonly saturationPct: number;
}

export function buildOpticalTheme(spec: OpticalPresetSpec): PrismTheme {
  return createPrismTheme({
    palette: {
      mode: spec.id === 'obsidian' ? 'dark' : 'light',
      primary: { main: '#E75C24' },
      secondary: { main: '#0284C7' },
    },
    optics: {
      refraction: 'vivid',
      blurPx: spec.blurPx,
      saturationPct: spec.saturationPct,
    },
  });
}`,
    diagnostics: [
      {
        line: 13,
        severity: 'warning',
        message: 'Verify >= 4.5:1 contrast ratio when pairing Vivid optics with dark backdrops.',
      },
    ],
  },
  {
    id: 'file-caustics',
    name: 'causticEngine.ts',
    path: 'packages/core/src/causticEngine.ts',
    folderId: 'dir-core',
    language: 'typescript',
    initialContent: `export type RefractionTier = 'subtle' | 'standard' | 'vivid';

export interface CausticShadowSpec {
  readonly opacity: number;
  readonly spreadPx: number;
  readonly specularAlpha: number;
}

export function computeCausticTokens(tier: RefractionTier): CausticShadowSpec {
  switch (tier) {
    case 'subtle':
      return { opacity: 0.14, spreadPx: 8, specularAlpha: 0.42 };
    case 'vivid':
      return { opacity: 0.34, spreadPx: 18, specularAlpha: 0.78 };
    case 'standard':
      return { opacity: 0.22, spreadPx: 12, specularAlpha: 0.62 };
  }
}`,
    diagnostics: [],
  },
  {
    id: 'file-styles',
    name: 'refractor.css',
    path: 'packages/core/src/refractor.css',
    folderId: 'dir-core',
    language: 'css',
    initialContent: `@layer components {
  .prism-slab {
    backdrop-filter: blur(var(--prism-blur-px)) saturate(var(--prism-saturation));
    border: 1px solid var(--prism-border-specular);
    border-radius: var(--prism-radius-slab);
    box-shadow: var(--prism-shadow-slab);
  }

  .prism-crystal {
    background: var(--prism-surface-crystal);
    box-shadow: var(--prism-shadow-crystal);
  }
}`,
    diagnostics: [
      {
        line: 3,
        severity: 'warning',
        message: 'Include -webkit-backdrop-filter fallback for Safari optical parity.',
      },
    ],
  },
  {
    id: 'file-manifest',
    name: 'package.json',
    path: 'packages/package.json',
    folderId: 'dir-packages',
    language: 'json',
    initialContent: `{
  "name": "@refractor-ui/core",
  "version": "1.12.0",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": "./dist/index.js",
    "./refractor.css": "./dist/refractor.css"
  }
}`,
    diagnostics: [],
  },
];

const INITIAL_TERMINAL_PANES: ReadonlyArray<TerminalSessionPane> = [
  {
    id: 'pane-tsc',
    title: 'tsc-watch',
    cwd: '~/refractor-ui/packages/core',
    status: 'running',
    lines: [
      'tsc --build --watch initialized (strict: true, zero any/unknown)',
      '10:42:08 - Found 0 errors. Watching for file changes.',
    ],
  },
  {
    id: 'pane-vitest',
    title: 'vitest',
    cwd: '~/refractor-ui',
    status: 'idle',
    lines: [
      'PASS packages/core/src/CodeEditor/CodeEditor.test.tsx (28 tests)',
      'V8 Coverage: 99.4% statements · 97.8% branches',
    ],
  },
];

function simulateIdeCommand(command: string): { output: string; nextStatus: ProcessStatus } {
  const normalized = command.trim().toLowerCase();
  if (normalized.includes('typecheck') || normalized.includes('tsc')) {
    return {
      output: '✓ tsc --noEmit passed across 4 workspace packages in 1.18s (0 errors).',
      nextStatus: 'success',
    };
  }
  if (normalized.includes('test')) {
    return {
      output: '✓ 142 test suites passed (1,894 tests) · V8 coverage 99.4% statements.',
      nextStatus: 'success',
    };
  }
  if (normalized.includes('lint')) {
    return {
      output: '✓ ESLint strict mode (17 Open-Internals rules): 0 errors, 0 warnings.',
      nextStatus: 'success',
    };
  }
  if (normalized.includes('fail')) {
    return {
      output: '✗ Exit code 1: simulated check failure on strict guard.',
      nextStatus: 'failed',
    };
  }
  return {
    output: `→ Executed "${command}" in 42ms · workspace clean.`,
    nextStatus: 'success',
  };
}

function CodeEditingIdeExample() {
  const dispatch = useAppDispatch();
  const [selectedFileId, setSelectedFileId] = useState<string>('file-theme');
  const [fileContents, setFileContents] = useState<Map<string, string>>(
    () => new Map(IDE_FILES.map((file) => [file.id, file.initialContent]))
  );
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(() => new Set());
  const [watchStatus, setWatchStatus] = useState<ProcessStatus>('running');
  const [panes, setPanes] = useState<TerminalSessionPane[]>(() =>
    INITIAL_TERMINAL_PANES.map((pane) => ({ ...pane, lines: [...pane.lines] }))
  );
  const [activePaneId, setActivePaneId] = useState<string>('pane-tsc');
  const [commandHistory, setCommandHistory] = useState<string[]>([
    'pnpm lint:strict',
    'pnpm test:coverage',
  ]);

  const activeFile = useMemo(
    () => IDE_FILES.find((file) => file.id === selectedFileId) ?? IDE_FILES[0],
    [selectedFileId]
  );

  const activeCode = fileContents.get(activeFile.id) ?? activeFile.initialContent;

  const activeDiagnostics = useMemo<ReadonlyArray<CodeDiagnostic>>(() => {
    const base = [...activeFile.diagnostics];
    if (activeCode.trim().length === 0) {
      base.push({
        line: 1,
        severity: 'error',
        message: 'Module source cannot be empty; export at least one typed symbol.',
      });
    }
    return base;
  }, [activeCode, activeFile.diagnostics]);

  const breadcrumbs = useMemo<BreadcrumbCrumb[]>(() => {
    const segments = activeFile.path.split('/');
    return [
      { id: 'root', label: 'refractor-ui' },
      ...segments.map((segment, index) => ({
        id: `seg-${segments.slice(0, index + 1).join('/')}`,
        label: segment,
      })),
    ];
  }, [activeFile.path]);

  const handleSelectTreeNode = (node: TreeNodeItem) => {
    if (node.type === 'file') {
      setSelectedFileId(node.id);
    }
  };

  const handleCodeChange = (nextCode: string) => {
    setFileContents((prev) => {
      const next = new Map(prev);
      next.set(activeFile.id, nextCode);
      return next;
    });
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.add(activeFile.id);
      return next;
    });
  };

  const handleSaveFile = () => {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(activeFile.id);
      return next;
    });
    setWatchStatus('success');
    setPanes((prev) =>
      prev.map((pane) =>
        pane.id === activePaneId
          ? {
              ...pane,
              status: 'idle',
              lines: [...pane.lines, `✓ Saved ${activeFile.path} · incremental rebuild 64ms`],
            }
          : pane
      )
    );
    dispatch(
      pushToast({
        title: `Saved ${activeFile.name}`,
        description: 'Incremental typecheck completed with 0 errors.',
        tone: 'emerald',
      })
    );
  };

  const handleCommandBarSubmit = (command: string) => {
    const { output, nextStatus } = simulateIdeCommand(command);
    setWatchStatus(nextStatus);
    setCommandHistory((prev) => [...prev, command]);
    setPanes((prev) =>
      prev.map((pane) =>
        pane.id === activePaneId
          ? {
              ...pane,
              status: nextStatus === 'failed' ? 'error' : 'idle',
              lines: [...pane.lines, `$ ${command}`, output],
            }
          : pane
      )
    );
    dispatch(
      pushToast({
        title: `Ran "${command}"`,
        description: output,
        tone: nextStatus === 'failed' ? 'critical' : 'emerald',
      })
    );
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="prism-slab p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <Breadcrumbs
            items={breadcrumbs}
            onNavigate={(crumbId) => {
              if (crumbId === 'root') {
                setSelectedFileId('file-manifest');
              } else if (crumbId.endsWith('core') || crumbId.endsWith('src')) {
                setSelectedFileId('file-theme');
              }
            }}
          />
          {dirtyIds.has(activeFile.id) ? (
            <span className="prism-well px-2.5 py-1 rounded-full text-[11px] font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap">
              Unsaved changes
            </span>
          ) : (
            <span className="prism-emerald px-2.5 py-1 rounded-full text-[11px] font-semibold text-white whitespace-nowrap">
              Synced
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ProcessStatusPill
            size="sm"
            label="tsc --watch"
            status={watchStatus}
            elapsedMs={1180}
            exitCode={watchStatus === 'failed' ? 1 : watchStatus === 'success' ? 0 : undefined}
            onStop={() => setWatchStatus('cancelled')}
            onRetry={() => setWatchStatus('running')}
          />
          <SecondaryButton size="sm" onClick={handleSaveFile}>
            <span>Save</span>
            <KeycapBadge keys={['⌘', 'S']} size="sm" description="Save active file" />
          </SecondaryButton>
          <span className="hidden sm:inline-flex items-center gap-1.5 prism-crystal px-2.5 py-1.5 rounded-full text-[11px] text-slate-600 dark:text-slate-300">
            <span>Quick Open</span>
            <KeycapBadge keys={['⌘', 'K']} size="sm" description="Open command palette" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
        <aside className="lg:col-span-4 min-w-0 space-y-2.5">
          <div className="prism-crystal rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-900 dark:text-white truncate">
              Workspace Explorer
            </span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              {IDE_FILES.length} files · {dirtyIds.size} dirty
            </span>
          </div>
          <TreeView
            nodes={IDE_TREE_NODES}
            selectedNodeId={activeFile.id}
            onSelectNode={handleSelectTreeNode}
            defaultExpandedIds={['dir-packages', 'dir-core']}
          />
        </aside>

        <section className="lg:col-span-8 min-w-0">
          <CodeEditor
            label={activeFile.path}
            language={activeFile.language}
            value={activeCode}
            onChange={handleCodeChange}
            diagnostics={activeDiagnostics}
            showLineNumbers
          />
        </section>
      </div>

      <div className="space-y-3 min-w-0">
        <TerminalMultiplexer
          panes={panes}
          onPanesChange={setPanes}
          activePaneId={activePaneId}
          onActivePaneChange={setActivePaneId}
          defaultLayout="split"
          onCommand={(_paneId, command) => {
            const { output, nextStatus } = simulateIdeCommand(command);
            setWatchStatus(nextStatus);
            return output;
          }}
        />
        <CommandInputBar
          prompt="refractor$"
          placeholder="Run workspace task (try: pnpm typecheck, pnpm test:coverage, pnpm lint:strict)"
          suggestions={[
            'pnpm typecheck',
            'pnpm test:coverage',
            'pnpm lint:strict',
            'refractor component CodeEditor --dense',
          ]}
          history={commandHistory}
          submitLabel="Execute"
          onSubmit={handleCommandBarSubmit}
        />
      </div>
    </div>
  );
}

const CODE_EDITING_IDE_CODE = `import { useState } from 'react';
import {
  Breadcrumbs, CodeEditor, CommandInputBar, KeycapBadge,
  type ProcessStatus, ProcessStatusPill, TerminalMultiplexer,
  type TerminalSessionPane, type TreeNodeItem, TreeView,
} from '@refractor-ui/core';

const WORKSPACE_NODES: ReadonlyArray<TreeNodeItem> = [
  { id: 'dir-src', name: 'src', type: 'folder', parentId: null },
  { id: 'f-theme', name: 'opticalTheme.ts', type: 'file', parentId: 'dir-src', sizeBytes: 2480 },
  { id: 'f-css', name: 'refractor.css', type: 'file', parentId: 'dir-src', sizeBytes: 3140 },
];

const INITIAL_SOURCES: Record<string, string> = {
  'f-theme': "export const optics = { refraction: 'vivid', blurPx: 20 } as const;",
  'f-css': '.prism-slab { backdrop-filter: blur(var(--prism-blur-px)); }',
};

export function CloudIdeWorkspace() {
  const [fileId, setFileId] = useState<string>('f-theme');
  const [sources, setSources] = useState<Record<string, string>>(INITIAL_SOURCES);
  const [status, setStatus] = useState<ProcessStatus>('running');
  const [activePaneId, setActivePaneId] = useState<string>('tsc');
  const [panes, setPanes] = useState<TerminalSessionPane[]>([
    { id: 'tsc', title: 'tsc-watch', cwd: '~/app', status: 'running', lines: ['0 errors found.'] },
    { id: 'test', title: 'vitest', cwd: '~/app', status: 'idle', lines: ['PASS 142 suites (99.4%)'] },
  ]);

  const activeName = fileId === 'f-css' ? 'refractor.css' : 'opticalTheme.ts';
  const activeLanguage = fileId === 'f-css' ? 'css' : 'typescript';

  const appendOutput = (command: string) => {
    setStatus('success');
    setPanes((prev) =>
      prev.map((pane) =>
        pane.id === activePaneId
          ? { ...pane, status: 'idle', lines: [...pane.lines, \`$ \${command}\`, '✓ Completed in 48ms'] }
          : pane
      )
    );
  };

  return (
    <div className="space-y-4">
      <header className="prism-slab p-4 flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[{ id: 'root', label: 'refractor-ui' }, { id: 'cur', label: activeName }]}
          onNavigate={() => setFileId('f-theme')}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ProcessStatusPill size="sm" label="tsc --watch" status={status} elapsedMs={1180} onStop={() => setStatus('cancelled')} onRetry={() => setStatus('running')} />
          <KeycapBadge keys={['⌘', 'K']} size="sm" description="Command Palette" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 min-w-0">
          <TreeView nodes={WORKSPACE_NODES} selectedNodeId={fileId} defaultExpandedIds={['dir-src']} onSelectNode={(n) => { if (n.type === 'file') setFileId(n.id); }} />
        </div>
        <div className="lg:col-span-8 min-w-0">
          <CodeEditor label={activeName} language={activeLanguage} value={sources[fileId] ?? ''} onChange={(next) => setSources((prev) => ({ ...prev, [fileId]: next }))} />
        </div>
      </div>

      <TerminalMultiplexer panes={panes} onPanesChange={setPanes} activePaneId={activePaneId} onActivePaneChange={setActivePaneId} defaultLayout="split" onCommand={(_id, cmd) => \`✓ Executed "\${cmd}"\`} />
      <CommandInputBar prompt="refractor$" suggestions={['pnpm typecheck', 'pnpm test:coverage', 'pnpm lint:strict']} onSubmit={appendOutput} />
    </div>
  );
}`;

/* ============================================================================
 * 2. Pull Request & Code Diff Review Workbench
 * ============================================================================ */

interface PrDiffFile {
  id: string;
  path: string;
  additions: number;
  deletions: number;
  hunks: ReadonlyArray<DiffHunk>;
  original: string;
  modified: string;
}

const PR_FILES: readonly [PrDiffFile, ...PrDiffFile[]] = [
  {
    id: 'color-math',
    path: 'packages/core/src/utils/colorMath.ts',
    additions: 14,
    deletions: 5,
    hunks: [
      {
        id: 'cm-hunk-1',
        header: '@@ -18,7 +18,11 @@ export function deriveCausticPair(hex: string)',
        lines: [
          { kind: 'context', oldLine: 18, newLine: 18, content: 'export function deriveCausticPair(hex: string): CausticPair {' },
          { kind: 'remove', oldLine: 19, content: '  const lum = relativeLuminance(hex);' },
          { kind: 'remove', oldLine: 20, content: '  return { warm: hex, cool: "#38BDF8" };' },
          { kind: 'add', newLine: 19, content: '  const rgb = parseSafeHex(hex);' },
          { kind: 'add', newLine: 20, content: '  const contrast = ensureWcagContrast(rgb, 4.5);' },
          { kind: 'add', newLine: 21, content: '  return { warm: toRgbString(contrast), cool: deriveComplementaryRim(rgb) };' },
          { kind: 'context', oldLine: 21, newLine: 22, content: '}' },
        ],
      },
      {
        id: 'cm-hunk-2',
        header: '@@ -44,6 +48,10 @@ export function ensureWcagContrast(rgb: RgbTuple, minRatio: number)',
        lines: [
          { kind: 'context', oldLine: 44, newLine: 48, content: 'export function ensureWcagContrast(rgb: RgbTuple, minRatio: number): RgbTuple {' },
          { kind: 'remove', oldLine: 45, content: '  return rgb;' },
          { kind: 'add', newLine: 49, content: '  const target = clampNumber(minRatio, 3, 21, 4.5);' },
          { kind: 'add', newLine: 50, content: '  return tuneLuminanceForContrast(rgb, target);' },
          { kind: 'context', oldLine: 46, newLine: 51, content: '}' },
        ],
      },
    ],
    original: `export function deriveCausticPair(hex: string): CausticPair {
  const lum = relativeLuminance(hex);
  return { warm: hex, cool: '#38BDF8' };
}

export function ensureWcagContrast(rgb: RgbTuple): RgbTuple {
  return rgb;
}`,
    modified: `export function deriveCausticPair(hex: string): CausticPair {
  const rgb = parseSafeHex(hex);
  const contrast = ensureWcagContrast(rgb, 4.5);
  return { warm: toRgbString(contrast), cool: deriveComplementaryRim(rgb) };
}

export function ensureWcagContrast(rgb: RgbTuple, minRatio: number): RgbTuple {
  const target = clampNumber(minRatio, 3, 21, 4.5);
  return tuneLuminanceForContrast(rgb, target);
}`,
  },
  {
    id: 'meniscus-css',
    path: 'packages/core/src/refractor.css',
    additions: 8,
    deletions: 2,
    hunks: [
      {
        id: 'css-hunk-1',
        header: '@@ -62,5 +62,9 @@ @layer components { .prism-crystal }',
        lines: [
          { kind: 'context', oldLine: 62, newLine: 62, content: '.prism-crystal {' },
          { kind: 'remove', oldLine: 63, content: '  border: 1px solid rgba(255, 255, 255, 0.35);' },
          { kind: 'add', newLine: 63, content: '  border: 1px solid var(--prism-border-specular);' },
          { kind: 'add', newLine: 64, content: '  box-shadow: var(--prism-shadow-crystal), var(--prism-caustic-rim);' },
          { kind: 'context', oldLine: 64, newLine: 65, content: '}' },
        ],
      },
    ],
    original: `.prism-crystal {
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(16px);
}`,
    modified: `.prism-crystal {
  border: 1px solid var(--prism-border-specular);
  box-shadow: var(--prism-shadow-crystal), var(--prism-caustic-rim);
  backdrop-filter: blur(var(--prism-blur-px));
}`,
  },
];

const PR_REVIEWERS: ReadonlyArray<PresenceUser> = [
  {
    id: 'rev-1',
    name: 'Elena Vance',
    role: 'Principal UI Architect',
    status: 'editing',
    activity: 'Reviewing colorMath.ts hunk #1',
  },
  {
    id: 'rev-2',
    name: 'Marcus Chen',
    role: 'Security & A11y Lead',
    status: 'online',
    activity: 'Verified WCAG 4.5:1 ratio clamp',
  },
  {
    id: 'rev-3',
    name: 'Priya Nair',
    role: 'Design Systems',
    status: 'viewing',
    activity: 'Inspecting caustic rim tokens',
  },
  {
    id: 'rev-4',
    name: 'Devon Park',
    role: 'Release Manager',
    status: 'idle',
    activity: 'Awaiting squash & merge',
  },
];

const PR_MENTIONS: ReadonlyArray<MentionUser> = [
  { id: 'rev-1', handle: 'elena', name: 'Elena Vance', role: 'Principal UI Architect' },
  { id: 'rev-2', handle: 'marcus', name: 'Marcus Chen', role: 'Security & A11y Lead' },
  { id: 'rev-3', handle: 'priya', name: 'Priya Nair', role: 'Design Systems' },
];

const INITIAL_PR_COMMENTS: ReadonlyArray<CommentItem> = [
  {
    id: 'pr-c1',
    author: { id: 'rev-1', name: 'Elena Vance', role: 'Principal UI Architect' },
    body: 'Nice catch moving the caustic rim onto --prism-caustic-rim @marcus — Alabaster and Obsidian both hold crisp contrast now.',
    timestamp: '8m ago',
    reactions: [
      { emoji: '✨', count: 3, reacted: true },
      { emoji: '👍', count: 2, reacted: false },
    ],
    replies: [
      {
        id: 'pr-c1-r1',
        author: { id: 'rev-2', name: 'Marcus Chen', role: 'Security & A11y Lead' },
        body: 'Confirmed zero raw hex literals in refractor.css and clamped minRatio between 3..21.',
        timestamp: '4m ago',
        reactions: [{ emoji: '🚀', count: 2, reacted: false }],
      },
    ],
  },
];

type PrLifecycleState = 'review-required' | 'changes-requested' | 'merged-squash' | 'merged-rebase';

function PullRequestDiffReviewExample() {
  const dispatch = useAppDispatch();
  const [activeFileId, setActiveFileId] = useState<string>('color-math');
  const [prState, setPrState] = useState<PrLifecycleState>('review-required');
  const [hunkDecisions, setHunkDecisions] = useState<Map<string, DiffHunkStatus>>(() => new Map());
  const [comments, setComments] = useState<CommentItem[]>(() => [...INITIAL_PR_COMMENTS]);

  const activeFile = useMemo(
    () => PR_FILES.find((file) => file.id === activeFileId) ?? PR_FILES[0],
    [activeFileId]
  );

  const totalHunks = useMemo(
    () => PR_FILES.reduce((acc, file) => acc + file.hunks.length, 0),
    []
  );

  const acceptedCount = useMemo(() => {
    let count = 0;
    for (const status of hunkDecisions.values()) {
      if (status === 'accepted') count += 1;
    }
    return count;
  }, [hunkDecisions]);

  const activeHunks = useMemo<DiffHunk[]>(
    () =>
      activeFile.hunks.map((hunk) => ({
        ...hunk,
        status: hunkDecisions.get(hunk.id) ?? 'pending',
      })),
    [activeFile.hunks, hunkDecisions]
  );

  const handleHunkDecision = (hunkId: string, decision: 'accepted' | 'rejected') => {
    setHunkDecisions((prev) => {
      const next = new Map(prev);
      next.set(hunkId, decision);
      return next;
    });
    if (decision === 'rejected') {
      setPrState('changes-requested');
    }
  };

  const handleBulkDecision = (decision: 'accepted' | 'rejected') => {
    setHunkDecisions((prev) => {
      const next = new Map(prev);
      for (const hunk of activeFile.hunks) {
        next.set(hunk.id, decision);
      }
      return next;
    });
    if (decision === 'rejected') {
      setPrState('changes-requested');
    }
  };

  const applyPrAction = (nextState: PrLifecycleState, title: string, detail: string) => {
    setPrState(nextState);
    setComments((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        author: { id: 'u-me', name: 'Alex Rivera', role: 'Lead Maintainer' },
        body: detail,
        timestamp: 'Just now',
      },
    ]);
    dispatch(
      pushToast({
        title,
        description: detail,
        tone: nextState === 'changes-requested' ? 'amber' : 'emerald',
      })
    );
  };

  const mergeActions: ComboSplitAction[] = [
    {
      id: 'squash',
      label: 'Squash & Merge',
      description: 'Combine 4 commits into one linear commit on main',
      icon: <GitMerge className="w-3.5 h-3.5" aria-hidden="true" />,
      onSelect: () =>
        applyPrAction(
          'merged-squash',
          'PR #418 Squash-Merged',
          'Squashed 4 commits into main (SHA 9a4e21b) after optical contrast verification.'
        ),
    },
    {
      id: 'rebase',
      label: 'Rebase & Merge',
      description: 'Fast-forward individual verified commits onto main',
      icon: <GitPullRequest className="w-3.5 h-3.5" aria-hidden="true" />,
      onSelect: () =>
        applyPrAction(
          'merged-rebase',
          'PR #418 Rebased onto main',
          'Rebased 4 signed commits cleanly onto main with 0 conflicts.'
        ),
    },
    {
      id: 'request-changes',
      label: 'Request Changes',
      description: 'Block merge until remaining review hunks are addressed',
      destructive: true,
      onSelect: () =>
        applyPrAction(
          'changes-requested',
          'Changes Requested on PR #418',
          'Requested follow-up edits before merging into main.'
        ),
    },
  ];

  const statusBadge =
    prState === 'merged-squash'
      ? { label: 'Merged · Squash', tone: 'online' as const }
      : prState === 'merged-rebase'
        ? { label: 'Merged · Rebase', tone: 'online' as const }
        : prState === 'changes-requested'
          ? { label: 'Changes Requested', tone: 'warning' as const }
          : acceptedCount === totalHunks
            ? { label: 'Approved · Ready', tone: 'online' as const }
            : { label: 'Review In Progress', tone: 'warning' as const };

  return (
    <div className="w-full min-w-0 space-y-4">
      <header className="prism-slab p-4 sm:p-5 space-y-4 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <BadgeStatus label={statusBadge.label} tone={statusBadge.tone} />
              <BadgeStatus
                label="Hunks Approved"
                count={acceptedCount}
                tone="counter"
              />
              <span className="prism-well px-2.5 py-1 rounded-full font-mono text-[11px] text-slate-600 dark:text-slate-300">
                feat/dichroic-meniscus → main
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
              #418 Calibrate dichroic meniscus contrast &amp; safe luminance clamping
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <LivePresenceIndicator
              users={PR_REVIEWERS}
              size="sm"
              maxVisible={3}
              showCountLabel={false}
              onUserSelect={(user) =>
                dispatch(
                  pushToast({
                    title: `${user.name} (${user.status})`,
                    description: user.activity ?? user.role,
                    tone: 'info',
                  })
                )
              }
            />
            <ComboSplitButton
              size="sm"
              tone="primary"
              label={prState.startsWith('merged') ? 'Merged' : 'Squash & Merge'}
              icon={<GitMerge className="w-3.5 h-3.5" aria-hidden="true" />}
              actions={mergeActions}
              onPrimaryClick={() =>
                applyPrAction(
                  'merged-squash',
                  'PR #418 Squash-Merged',
                  `Squashed and merged PR #418 (${acceptedCount}/${totalHunks} hunks approved).`
                )
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
          <div role="tablist" aria-label="Changed pull request files" className="flex flex-wrap items-center gap-1.5">
            {PR_FILES.map((file) => {
              const selected = file.id === activeFile.id;
              return (
                <button
                  key={file.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveFileId(file.id)}
                  className={`prism-focus-ring h-8 px-3 rounded-full text-xs font-mono inline-flex items-center gap-2 cursor-pointer transition-all ${
                    selected
                      ? 'prism-emerald text-white font-semibold'
                      : 'prism-crystal text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="truncate max-w-[200px] sm:max-w-none">{file.path}</span>
                  <span className={selected ? 'text-white/90' : 'text-emerald-600 dark:text-emerald-400'}>
                    +{file.additions}
                  </span>
                  <span className={selected ? 'text-white/90' : 'text-rose-600 dark:text-rose-400'}>
                    -{file.deletions}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            {acceptedCount}/{totalHunks} total hunks accepted
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 min-w-0">
        <div className="xl:col-span-7 min-w-0 space-y-4">
          <InlineDiffReviewer
            filePath={activeFile.path}
            hunks={activeHunks}
            onHunkDecision={handleHunkDecision}
            onAcceptAll={() => handleBulkDecision('accepted')}
            onRejectAll={() => handleBulkDecision('rejected')}
          />
          <DiffViewer
            title={`Full File Comparison · ${activeFile.path}`}
            originalLabel="main (v1.11.4)"
            modifiedLabel="feat/dichroic-meniscus"
            defaultViewMode="split"
            original={activeFile.original}
            modified={activeFile.modified}
          />
        </div>

        <div className="xl:col-span-5 min-w-0">
          <CommentThread
            title="Reviewer Discussion"
            comments={comments}
            onCommentsChange={setComments}
            mentionUsers={PR_MENTIONS}
            currentUser={{ id: 'u-me', name: 'Alex Rivera', role: 'Lead Maintainer' }}
            placeholder="Leave an inline review comment or @mention a reviewer..."
            onAddComment={(body) =>
              dispatch(
                pushToast({
                  title: 'Review comment posted',
                  description: body.slice(0, 64),
                  tone: 'info',
                })
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

const PULL_REQUEST_REVIEW_CODE = `import { useState } from 'react';
import {
  BadgeStatus, ComboSplitButton, CommentThread, type CommentItem,
  type DiffHunk, DiffViewer, InlineDiffReviewer, LivePresenceIndicator,
} from '@refractor-ui/core';

const HUNKS: DiffHunk[] = [
  {
    id: 'h1',
    header: '@@ -18,4 +18,5 @@ export function deriveCausticPair(hex: string)',
    lines: [
      { kind: 'remove', oldLine: 19, content: '  return { warm: hex, cool: "#38BDF8" };' },
      { kind: 'add', newLine: 19, content: '  const safe = ensureWcagContrast(parseSafeHex(hex), 4.5);' },
      { kind: 'add', newLine: 20, content: '  return { warm: toRgbString(safe), cool: deriveRim(safe) };' },
    ],
  },
];

const INITIAL_COMMENTS: CommentItem[] = [
  {
    id: 'c1',
    author: { id: 'u1', name: 'Elena Vance', role: 'Principal UI Architect' },
    body: 'Contrast ratio verified across Alabaster and Obsidian presets.',
    timestamp: '6m ago',
  },
];

export function PullRequestWorkbench() {
  const [status, setStatus] = useState<'review' | 'merged' | 'changes'>('review');
  const [approvedCount, setApprovedCount] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>(INITIAL_COMMENTS);

  return (
    <div className="space-y-4">
      <header className="prism-slab p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <BadgeStatus
            label={status === 'merged' ? 'Merged' : status === 'changes' ? 'Changes Requested' : 'Review Open'}
            tone={status === 'merged' ? 'online' : 'warning'}
          />
          <BadgeStatus label="Hunks Approved" count={approvedCount} tone="counter" />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <LivePresenceIndicator
            size="sm"
            users={[
              { id: 'r1', name: 'Elena Vance', status: 'editing', activity: 'Checking colorMath.ts' },
              { id: 'r2', name: 'Marcus Chen', status: 'online', activity: 'A11y verification' },
            ]}
          />
          <ComboSplitButton
            size="sm"
            label="Squash & Merge"
            onPrimaryClick={() => setStatus('merged')}
            actions={[
              { id: 'squash', label: 'Squash & Merge', onSelect: () => setStatus('merged') },
              { id: 'rebase', label: 'Rebase & Merge', onSelect: () => setStatus('merged') },
              { id: 'changes', label: 'Request Changes', destructive: true, onSelect: () => setStatus('changes') },
            ]}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 space-y-4 min-w-0">
          <InlineDiffReviewer
            filePath="packages/core/src/utils/colorMath.ts"
            hunks={HUNKS}
            onHunkDecision={(_id, decision) => setApprovedCount(decision === 'accepted' ? 1 : 0)}
            onAcceptAll={() => setApprovedCount(HUNKS.length)}
            onRejectAll={() => setApprovedCount(0)}
          />
          <DiffViewer title="colorMath.ts" originalLabel="main" modifiedLabel="feat/dichroic-meniscus" original="return { warm: hex, cool: '#38BDF8' };" modified="return { warm: toRgbString(safe), cool: deriveRim(safe) };" />
        </div>
        <div className="xl:col-span-5 min-w-0">
          <CommentThread comments={comments} onCommentsChange={setComments} title="Reviewer Discussion" />
        </div>
      </div>
    </div>
  );
}`;

/* ============================================================================
 * 3. CI/CD Deployment Pipeline & Live Log Console
 * ============================================================================ */

const PIPELINE_STEPS: StepDefinition[] = [
  { id: 'lint', title: 'Lint', subtitle: 'ESLint strict · 17 rules' },
  { id: 'unit-v8', title: 'Unit & V8', subtitle: 'Vitest · >= 93% gate' },
  { id: 'security', title: 'Security', subtitle: 'OWASP & SAST audit' },
  { id: 'pages', title: 'Pages', subtitle: 'Static CDN publish' },
];

const INITIAL_PIPELINE_LOGS: ReadonlyArray<LogEntry> = [
  {
    id: 'pl-1',
    timestamp: '10:48:02.104',
    severity: 'info',
    source: 'lint',
    message: 'REFRACTOR_STRICT_LINT=1 verified 184 source modules with 0 errors',
  },
  {
    id: 'pl-2',
    timestamp: '10:48:09.442',
    severity: 'info',
    source: 'vitest',
    message: '142 test suites passed · V8 statements 99.4%, branches 97.6%',
  },
  {
    id: 'pl-3',
    timestamp: '10:48:11.819',
    severity: 'debug',
    source: 'security',
    message: 'Verified sanitizeCsvCell, sanitizeUrl, and zero dangerouslySetInnerHTML',
  },
  {
    id: 'pl-4',
    timestamp: '10:48:14.006',
    severity: 'warn',
    source: 'pages',
    message: 'Docs showcase chunk 482 kB (within 500 kB edge budget)',
  },
];

function CiCdPipelineExample() {
  const dispatch = useAppDispatch();
  const [activeStage, setActiveStage] = useState<number>(2);
  const [stageOverrides, setStageOverrides] = useState<Map<string, ProcessStatus>>(() => new Map());
  const [logs, setLogs] = useState<LogEntry[]>(() => [...INITIAL_PIPELINE_LOGS]);
  const [rolledBack, setRolledBack] = useState<boolean>(false);
  const [logSeq, setLogSeq] = useState<number>(INITIAL_PIPELINE_LOGS.length + 1);

  const appendLog = (severity: LogEntry['severity'], source: string, message: string) => {
    const id = `pl-${logSeq}`;
    setLogSeq((n) => n + 1);
    const sec = String((15 + logSeq) % 60).padStart(2, '0');
    setLogs((prev) => [
      ...prev,
      {
        id,
        timestamp: `10:48:${sec}.${String((logSeq * 137) % 999).padStart(3, '0')}`,
        severity,
        source,
        message,
      },
    ]);
  };

  const getStageStatus = (index: number, id: string): ProcessStatus => {
    const override = stageOverrides.get(id);
    if (override) return override;
    if (index < activeStage) return 'success';
    if (index === activeStage) return 'running';
    return 'cancelled';
  };

  const handleAdvanceStage = () => {
    if (activeStage >= PIPELINE_STEPS.length) {
      setActiveStage(0);
      setRolledBack(false);
      setStageOverrides(new Map());
      appendLog('info', 'pipeline', 'Restarted release pipeline v1.12.0-rc.2 from Lint stage');
      return;
    }
    const completed = PIPELINE_STEPS[activeStage];
    if (!completed) return;
    const nextStage = activeStage + 1;
    const nextStep = PIPELINE_STEPS[nextStage];
    setActiveStage(nextStage);
    setStageOverrides((prev) => {
      const next = new Map(prev);
      next.delete(completed.id);
      return next;
    });
    appendLog(
      'info',
      completed.id,
      nextStep
        ? `Completed stage "${completed.title}" · advancing to ${nextStep.title}`
        : 'Pages edge deployment verified live at https://refractor-ui.dev'
    );
  };

  const handleRollbackConfirm = () => {
    setRolledBack(true);
    setActiveStage(3);
    appendLog(
      'warn',
      'rollback',
      'Operator confirmed atomic edge rollback from v1.12.0-rc.2 -> v1.11.4 (SHA 7c12d0f)'
    );
    dispatch(
      pushToast({
        title: 'Rollback Executed -> v1.11.4',
        description: 'Edge CDN pointer restored cleanly with zero downtime.',
        tone: 'amber',
      })
    );
  };

  const manifestData = useMemo<JsonObject>(
    () => ({
      release: rolledBack ? '1.11.4 (rolled-back)' : '1.12.0-rc.2',
      previousStable: '1.11.4',
      commit: rolledBack ? '7c12d0f' : '8f3a91c',
      stageProgress: `${Math.min(activeStage, PIPELINE_STEPS.length)}/${PIPELINE_STEPS.length}`,
      gates: {
        strictLint: activeStage > 0 ? 'passed' : 'running',
        v8CoveragePct: 99.4,
        owaspAudit: activeStage > 2 ? 'verified' : 'pending',
        pagesEdge: activeStage >= 4 && !rolledBack ? 'live' : rolledBack ? 'reverted' : 'queued',
      },
      artifacts: [
        { pkg: '@refractor-ui/core', gzipKb: 64.2, integrity: 'sha384-9f2a...c81' },
        { pkg: '@refractor-ui/docs', gzipKb: 148.6, integrity: 'sha384-4b1e...d09' },
      ],
    }),
    [activeStage, rolledBack]
  );

  return (
    <div className="w-full min-w-0 space-y-4">
      <section className="prism-slab p-4 sm:p-5 space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                Pipeline #9842
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">commit 8f3a91c</span>
              {rolledBack ? (
                <span className="prism-well px-2 py-0.5 rounded-full text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  Rolled Back to v1.11.4
                </span>
              ) : null}
            </div>
            <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
              Release v1.12.0-rc.2 · Production Pages Deploy
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton
              size="sm"
              leadingIcon={<Play className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={handleAdvanceStage}
            >
              {activeStage >= PIPELINE_STEPS.length ? 'Re-run Pipeline' : 'Advance Stage'}
            </PrimaryButton>
            <SecondaryButton
              size="sm"
              onClick={() =>
                appendLog(
                  'error',
                  'security',
                  'Simulated SAST advisory: verify SRI hash on external font preload'
                )
              }
            >
              Emit Alert Log
            </SecondaryButton>
          </div>
        </div>

        <Stepper
          steps={PIPELINE_STEPS}
          activeStepIndex={activeStage}
          onStepClick={(index) => {
            setActiveStage(index);
            const targetStep = PIPELINE_STEPS[index];
            if (targetStep) {
              appendLog('debug', targetStep.id, `Focused stage ${targetStep.title}`);
            }
          }}
        />

        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
          {PIPELINE_STEPS.map((step, index) => {
            const pillStatus = getStageStatus(index, step.id);
            const elapsedMs = (index + 1) * 1840;
            return (
              <ProcessStatusPill
                key={step.id}
                size="sm"
                label={step.title}
                status={pillStatus}
                elapsedMs={elapsedMs}
                exitCode={pillStatus === 'success' ? 0 : pillStatus === 'failed' ? 1 : undefined}
                onStop={() => {
                  setStageOverrides((prev) => new Map(prev).set(step.id, 'cancelled'));
                  appendLog('warn', step.id, `Cancelled ${step.title} worker manually`);
                }}
                onRetry={() => {
                  setStageOverrides((prev) => new Map(prev).set(step.id, 'running'));
                  setActiveStage(index);
                  appendLog('info', step.id, `Retrying stage ${step.title}...`);
                }}
              />
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
        <div className="lg:col-span-7 min-w-0 space-y-4">
          <LiveLogStreamer
            title="Pipeline Runner Stream"
            entries={logs}
            maxHeight={260}
            onClear={() => setLogs([])}
          />
          <CopyableCommandBlock
            title="CLI Diagnostics & Local Verification"
            variants={[
              {
                id: 'gates',
                label: 'CI Gates',
                command: 'pnpm check:repo && pnpm lint:strict && pnpm test:coverage',
              },
              {
                id: 'inspect',
                label: 'Inspect Run',
                command: 'gh run view 9842 --job security --log-failed',
              },
              {
                id: 'pages',
                label: 'Pages Build',
                command: 'pnpm build && pnpm build:pages --verify-manifest',
              },
            ]}
            onCopy={(cmd) =>
              dispatch(
                pushToast({
                  title: 'Copied diagnostic command',
                  description: cmd,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>

        <div className="lg:col-span-5 min-w-0 space-y-4">
          <StructuredOutputViewer
            title="Build Manifest JSON"
            defaultMode="tree"
            defaultExpandedDepth={2}
            data={manifestData}
            onCopy={() =>
              dispatch(
                pushToast({
                  title: 'Copied release manifest JSON',
                  tone: 'info',
                })
              )
            }
          />

          <div className="prism-crystal rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" aria-hidden="true" />
                  <span>Emergency Production Rollback</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Atomically repoints CDN edge traffic back to verified build{' '}
                  <code className="font-mono font-semibold">v1.11.4</code>.
                </p>
              </div>
            </div>
            <HoldToConfirmButton
              label="Hold to Rollback"
              holdingLabel="Reverting edge manifest..."
              confirmedLabel="Rolled Back to v1.11.4"
              tone="destructive"
              holdDurationMs={1100}
              onConfirm={handleRollbackConfirm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const CI_CD_PIPELINE_CODE = `import { useState } from 'react';
import {
  CopyableCommandBlock, HoldToConfirmButton, LiveLogStreamer, type LogEntry,
  PrimaryButton, ProcessStatusPill, Stepper, type StepDefinition, StructuredOutputViewer,
} from '@refractor-ui/core';

const STAGES: StepDefinition[] = [
  { id: 'lint', title: 'Lint', subtitle: 'ESLint strict' },
  { id: 'unit-v8', title: 'Unit & V8', subtitle: '99.4% coverage' },
  { id: 'security', title: 'Security', subtitle: 'OWASP & SAST' },
  { id: 'pages', title: 'Pages', subtitle: 'CDN Deploy' },
];

export function DeploymentPipelineConsole() {
  const [stage, setStage] = useState(2);
  const [rolledBack, setRolledBack] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', timestamp: '10:48:02', severity: 'info', source: 'lint', message: '0 strict ESLint errors' },
    { id: 'l2', timestamp: '10:48:09', severity: 'info', source: 'vitest', message: '142 suites passed (99.4%)' },
    { id: 'l3', timestamp: '10:48:14', severity: 'warn', source: 'pages', message: 'Bundle at 482 kB / 500 kB' },
  ]);

  const advance = () => {
    const next = stage >= STAGES.length ? 0 : stage + 1;
    setStage(next);
    setLogs((prev) => [
      ...prev,
      { id: \`l-\${prev.length + 1}\`, timestamp: '10:49:01', severity: 'info', source: 'deploy', message: \`Stage \${next}/4 active\` },
    ]);
  };

  return (
    <div className="space-y-4">
      <section className="prism-slab p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Release v1.12.0-rc.2</h3>
          <PrimaryButton size="sm" onClick={advance}>Advance Stage</PrimaryButton>
        </div>
        <Stepper steps={STAGES} activeStepIndex={stage} onStepClick={setStage} />
        <div className="flex flex-wrap gap-2">
          {STAGES.map((step, idx) => (
            <ProcessStatusPill
              key={step.id}
              size="sm"
              label={step.title}
              status={idx < stage ? 'success' : idx === stage ? 'running' : 'cancelled'}
              elapsedMs={(idx + 1) * 1800}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4 min-w-0">
          <LiveLogStreamer title="Runner Logs" entries={logs} onClear={() => setLogs([])} />
          <CopyableCommandBlock
            title="Replay Locally"
            variants={[
              { id: 'ci', label: 'CI Gates', command: 'pnpm lint:strict && pnpm test:coverage' },
              { id: 'pages', label: 'Pages', command: 'pnpm build && pnpm build:pages' },
            ]}
          />
        </div>
        <div className="lg:col-span-5 space-y-4 min-w-0">
          <StructuredOutputViewer
            title="Build Manifest JSON"
            data={{ version: rolledBack ? '1.11.4' : '1.12.0-rc.2', stage, coveragePct: 99.4, rolledBack }}
          />
          <HoldToConfirmButton
            label="Hold to Rollback"
            holdingLabel="Reverting edge..."
            confirmedLabel="Rolled Back to v1.11.4"
            tone="destructive"
            onConfirm={() => setRolledBack(true)}
          />
        </div>
      </div>
    </div>
  );
}`;

/* ============================================================================
 * 4. Visual Automation DAG & Flow Studio
 * ============================================================================ */

const INITIAL_DAG_NODES: readonly [FlowNode, ...FlowNode[]] = [
  { id: 'dag-hook', label: 'GitHub Push Hook', category: 'Trigger', x: 16, y: 152, tone: 'primary' },
  { id: 'dag-guard', label: 'Policy & SAST Gate', category: 'Guard', x: 224, y: 68, tone: 'cobalt' },
  { id: 'dag-canary', label: 'Canary Edge Rollout', category: 'Deploy', x: 224, y: 236, tone: 'emerald' },
  { id: 'dag-slo', label: 'SLO Burn Analyzer', category: 'Observe', x: 432, y: 152, tone: 'crystal' },
];

const INITIAL_DAG_EDGES: ReadonlyArray<FlowEdge> = [
  { id: 'de-1', sourceId: 'dag-hook', targetId: 'dag-guard', label: 'PR Push' },
  { id: 'de-2', sourceId: 'dag-hook', targetId: 'dag-canary', label: 'Tag' },
  { id: 'de-3', sourceId: 'dag-guard', targetId: 'dag-slo', label: 'Signed' },
  { id: 'de-4', sourceId: 'dag-canary', targetId: 'dag-slo', label: '5% Traffic' },
];

const BASE_SANKEY_NODES: ReadonlyArray<SankeyNode> = [
  { id: 'src-gh', label: 'GitHub Hooks', stage: 0, tone: 'primary' },
  { id: 'src-cron', label: 'Scheduled Jobs', stage: 0, tone: 'secondary' },
  { id: 'mid-guard', label: 'Policy Gate', stage: 1, tone: 'secondary' },
  { id: 'mid-canary', label: 'Canary Runner', stage: 1, tone: 'emerald' },
  { id: 'out-prod', label: 'Promoted Prod', stage: 2, tone: 'emerald' },
  { id: 'out-rollback', label: 'Auto Rollback', stage: 2, tone: 'rose' },
  { id: 'out-alert', label: 'Pager Alerts', stage: 2, tone: 'amber' },
];

function VisualWorkflowGraphExample() {
  const dispatch = useAppDispatch();
  const [nodes, setNodes] = useState<FlowNode[]>(() => [...INITIAL_DAG_NODES]);
  const [edges, setEdges] = useState<FlowEdge[]>(() => [...INITIAL_DAG_EDGES]);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(INITIAL_DAG_NODES[0]);
  const [runtimeRunning, setRuntimeRunning] = useState<boolean>(true);
  const [addedRunsBoost, setAddedRunsBoost] = useState<number>(0);
  const [selectedFlowLabel, setSelectedFlowLabel] = useState<string>(
    'Click any flow ribbon to inspect 24h automation throughput.'
  );

  const addTemplateNode = (
    label: string,
    category: string,
    tone: FlowNode['tone']
  ) => {
    const seq = nodes.length + 1;
    const newId = `dag-custom-${seq}`;
    const anchor = selectedNode ?? nodes[nodes.length - 1];
    const nextNode: FlowNode = {
      id: newId,
      label: `${label} #${seq}`,
      category,
      tone,
      x: Math.min(620, (anchor ? anchor.x : 180) + 190),
      y: 72 + ((seq * 64) % 210),
    };
    setNodes((prev) => [...prev, nextNode]);
    if (anchor) {
      setEdges((prev) => [
        ...prev,
        {
          id: `de-custom-${seq}`,
          sourceId: anchor.id,
          targetId: newId,
          label: category,
        },
      ]);
    }
    setSelectedNode(nextNode);
    setAddedRunsBoost((prev) => prev + 4);
    dispatch(
      pushToast({
        title: `Added "${nextNode.label}" to DAG`,
        description: anchor ? `Connected from ${anchor.label}` : 'Placed on automation canvas',
        tone: 'emerald',
      })
    );
  };

  const speedDialActions: SpeedDialAction[] = [
    {
      id: 'add-webhook',
      label: 'Webhook Trigger',
      icon: <Webhook className="w-4 h-4" aria-hidden="true" />,
      tone: 'primary',
      onSelect: () => addTemplateNode('Webhook Trigger', 'Trigger', 'primary'),
    },
    {
      id: 'add-guard',
      label: 'Policy Gate',
      icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" />,
      tone: 'secondary',
      onSelect: () => addTemplateNode('Policy Gate', 'Guard', 'cobalt'),
    },
    {
      id: 'add-canary',
      label: 'Canary Stage',
      icon: <Activity className="w-4 h-4" aria-hidden="true" />,
      tone: 'emerald',
      onSelect: () => addTemplateNode('Canary Stage', 'Deploy', 'emerald'),
    },
    {
      id: 'add-alert',
      label: 'Alert Sink',
      icon: <Bell className="w-4 h-4" aria-hidden="true" />,
      tone: 'amber',
      onSelect: () => addTemplateNode('Incident Alert', 'Alert', 'crystal'),
    },
  ];

  const sankeyLinks = useMemo<SankeyLink[]>(
    () => [
      { source: 'src-gh', target: 'mid-guard', value: 48 + addedRunsBoost },
      { source: 'src-gh', target: 'mid-canary', value: 22 },
      { source: 'src-cron', target: 'mid-guard', value: 18 },
      { source: 'src-cron', target: 'mid-canary', value: 14 },
      { source: 'mid-guard', target: 'out-prod', value: 54 + addedRunsBoost },
      { source: 'mid-guard', target: 'out-alert', value: 12 },
      { source: 'mid-canary', target: 'out-prod', value: 29 },
      { source: 'mid-canary', target: 'out-rollback', value: 7 },
    ],
    [addedRunsBoost]
  );

  return (
    <div className="w-full min-w-0 space-y-4">
      <header className="prism-slab p-4 sm:p-5 space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <BadgeStatus
              label={runtimeRunning ? 'Runtime Active' : 'Runtime Paused'}
              tone={runtimeRunning ? 'online' : 'warning'}
            />
            <BadgeStatus label="Nodes" count={nodes.length} tone="counter" />
            <BadgeStatus label="Edges" count={edges.length} tone="online" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton
              size="sm"
              leadingIcon={<Workflow className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => setRuntimeRunning((prev) => !prev)}
            >
              {runtimeRunning ? 'Pause Engine' : 'Resume Engine'}
            </SecondaryButton>
            <SecondaryButton
              size="sm"
              leadingIcon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => {
                setNodes([...INITIAL_DAG_NODES]);
                setEdges([...INITIAL_DAG_EDGES]);
                setSelectedNode(INITIAL_DAG_NODES[0]);
                setAddedRunsBoost(0);
              }}
            >
              Reset DAG
            </SecondaryButton>
          </div>
        </div>

        <div className="prism-well rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" aria-hidden="true" />
            {selectedNode ? (
              <span className="text-slate-700 dark:text-slate-200 truncate">
                Selected: <strong className="text-slate-900 dark:text-white">{selectedNode.label}</strong>{' '}
                ({selectedNode.category ?? 'Node'}) · ({Math.round(selectedNode.x)},{' '}
                {Math.round(selectedNode.y)})
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                Select or drag any node on the canvas to inspect coordinates and connections.
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            Drag ports to link · Use radial + below to spawn nodes
          </span>
        </div>
      </header>

      <div className="min-w-0">
        <NodeGraphCanvas
          height={360}
          nodes={nodes}
          edges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onSelectNode={setSelectedNode}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0 items-stretch">
        <div className="lg:col-span-4 min-w-0 prism-slab p-4 flex flex-col items-center justify-between gap-3 overflow-visible">
          <div className="w-full flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-900 dark:text-white">
              Radial Quick-Add Palette
            </span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              4 templates
            </span>
          </div>
          <div className="pt-20 pb-3 flex items-center justify-center w-full overflow-visible">
            <SpeedDialButton
              direction="radial"
              triggerLabel="Quick add automation node"
              actions={speedDialActions}
            />
          </div>
          <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 leading-relaxed">
            Click the floating crystal trigger to fan out radial node templates and wire them onto
            the active DAG node.
          </p>
        </div>

        <div className="lg:col-span-8 min-w-0 space-y-2">
          <SankeyDiagram
            title="24h Pipeline Execution Volume Breakdown"
            valueUnit="k runs"
            height={250}
            nodes={[...BASE_SANKEY_NODES]}
            links={sankeyLinks}
            onSelectLink={(link, source, target) => {
              const summary = `${source.label} → ${target.label}: ${link.value}k executions`;
              setSelectedFlowLabel(summary);
              dispatch(
                pushToast({
                  title: `${source.label} → ${target.label}`,
                  description: `${link.value}k automated runs in last 24h`,
                  tone: 'info',
                })
              );
            }}
          />
          <div className="prism-crystal rounded-2xl px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
            <span className="truncate">{selectedFlowLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const VISUAL_WORKFLOW_GRAPH_CODE = `import { useState } from 'react';
import { Activity, Bell, ShieldCheck, Webhook } from 'lucide-react';
import {
  BadgeStatus,
  type FlowEdge,
  type FlowNode,
  NodeGraphCanvas,
  SankeyDiagram,
  SpeedDialButton,
} from '@refractor-ui/core';

const INITIAL_NODES: FlowNode[] = [
  { id: 'n1', label: 'GitHub Push Hook', category: 'Trigger', x: 16, y: 140, tone: 'primary' },
  { id: 'n2', label: 'Policy & SAST Gate', category: 'Guard', x: 224, y: 68, tone: 'cobalt' },
  { id: 'n3', label: 'Canary Rollout', category: 'Deploy', x: 224, y: 212, tone: 'emerald' },
  { id: 'n4', label: 'SLO Burn Analyzer', category: 'Observe', x: 432, y: 140, tone: 'crystal' },
];

const INITIAL_EDGES: FlowEdge[] = [
  { id: 'e1', sourceId: 'n1', targetId: 'n2', label: 'PR' },
  { id: 'e2', sourceId: 'n1', targetId: 'n3', label: 'Tag' },
  { id: 'e3', sourceId: 'n2', targetId: 'n4' },
  { id: 'e4', sourceId: 'n3', targetId: 'n4' },
];

export function AutomationDagStudio() {
  const [nodes, setNodes] = useState<FlowNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<FlowEdge[]>(INITIAL_EDGES);

  const spawnNode = (label: string, category: string, tone: FlowNode['tone']) => {
    const id = \`n-\${nodes.length + 1}\`;
    const last = nodes[nodes.length - 1];
    setNodes((prev) => [...prev, { id, label, category, tone, x: 480, y: 80 + prev.length * 24 }]);
    if (last) {
      setEdges((prev) => [...prev, { id: \`e-\${prev.length + 1}\`, sourceId: last.id, targetId: id, label: category }]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="prism-slab p-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <BadgeStatus label="Runtime Active" tone="online" />
          <BadgeStatus label="Nodes" count={nodes.length} tone="counter" />
        </div>
        <div className="pt-16 px-10 overflow-visible">
          <SpeedDialButton
            direction="radial"
            triggerLabel="Add DAG node"
            actions={[
              { id: 'hook', label: 'Webhook', icon: <Webhook className="w-4 h-4" />, tone: 'primary', onSelect: () => spawnNode('Webhook', 'Trigger', 'primary') },
              { id: 'guard', label: 'Policy Gate', icon: <ShieldCheck className="w-4 h-4" />, tone: 'secondary', onSelect: () => spawnNode('Policy Gate', 'Guard', 'cobalt') },
              { id: 'canary', label: 'Canary', icon: <Activity className="w-4 h-4" />, tone: 'emerald', onSelect: () => spawnNode('Canary', 'Deploy', 'emerald') },
              { id: 'alert', label: 'Alert', icon: <Bell className="w-4 h-4" />, tone: 'amber', onSelect: () => spawnNode('Alert Sink', 'Alert', 'crystal') },
            ]}
          />
        </div>
      </div>

      <NodeGraphCanvas
        height={360}
        nodes={nodes}
        edges={edges}
        onNodesChange={setNodes}
        onEdgesChange={setEdges}
      />

      <SankeyDiagram
        title="24h Execution Volume Breakdown"
        valueUnit="k runs"
        nodes={[
          { id: 'hooks', label: 'Webhooks', stage: 0, tone: 'primary' },
          { id: 'gate', label: 'Policy Gate', stage: 1, tone: 'secondary' },
          { id: 'prod', label: 'Promoted', stage: 2, tone: 'emerald' },
          { id: 'rb', label: 'Rolled Back', stage: 2, tone: 'rose' },
        ]}
        links={[
          { source: 'hooks', target: 'gate', value: 64 },
          { source: 'gate', target: 'prod', value: 57 },
          { source: 'gate', target: 'rb', value: 7 },
        ]}
      />
    </div>
  );
}`;

/* ============================================================================
 * 5. Enterprise Data Grid & Visual Query Studio
 * ============================================================================ */

interface TelemetryServiceRow {
  id: string;
  service: string;
  tier: string;
  region: string;
  latencyMs: number;
  status: string;
  owner: string;
  deployedAt: string;
  dayIndex: number;
}

const BRUSH_TIMELINE_POINTS: ReadonlyArray<BrushPoint> = [
  { label: 'Nov 08', value: 42 },
  { label: 'Nov 09', value: 47 },
  { label: 'Nov 10', value: 51 },
  { label: 'Nov 11', value: 64 },
  { label: 'Nov 12', value: 59 },
  { label: 'Nov 13', value: 72 },
  { label: 'Nov 14', value: 78 },
  { label: 'Nov 15', value: 69 },
  { label: 'Nov 16', value: 84 },
  { label: 'Nov 17', value: 91 },
  { label: 'Nov 18', value: 88 },
  { label: 'Nov 19', value: 95 },
  { label: 'Nov 20', value: 92 },
  { label: 'Nov 21', value: 98 },
];

const INITIAL_TELEMETRY_ROWS: ReadonlyArray<TelemetryServiceRow> = [
  {
    id: 'svc-1',
    service: 'edge-router',
    tier: 'edge-cdn',
    region: 'us-west-2',
    latencyMs: 18,
    status: 'Healthy',
    owner: 'Clara Vance',
    deployedAt: '2026-11-12',
    dayIndex: 4,
  },
  {
    id: 'svc-2',
    service: 'auth-gateway',
    tier: 'auth-iam',
    region: 'eu-central-1',
    latencyMs: 34,
    status: 'Healthy',
    owner: 'Marcus Chen',
    deployedAt: '2026-11-14',
    dayIndex: 6,
  },
  {
    id: 'svc-3',
    service: 'billing-ledger',
    tier: 'billing',
    region: 'us-west-2',
    latencyMs: 112,
    status: 'Degraded',
    owner: 'Elena Rostova',
    deployedAt: '2026-11-16',
    dayIndex: 8,
  },
  {
    id: 'svc-4',
    service: 'prism-cdn-mesh',
    tier: 'edge-cdn',
    region: 'ap-south-1',
    latencyMs: 24,
    status: 'Healthy',
    owner: 'Priya Nair',
    deployedAt: '2026-11-17',
    dayIndex: 9,
  },
  {
    id: 'svc-5',
    service: 'query-planner',
    tier: 'core-api',
    region: 'eu-central-1',
    latencyMs: 164,
    status: 'Throttled',
    owner: 'Devon Park',
    deployedAt: '2026-11-18',
    dayIndex: 10,
  },
  {
    id: 'svc-6',
    service: 'token-signer',
    tier: 'auth-iam',
    region: 'us-west-2',
    latencyMs: 29,
    status: 'Healthy',
    owner: 'Sora Takahashi',
    deployedAt: '2026-11-19',
    dayIndex: 11,
  },
  {
    id: 'svc-7',
    service: 'stream-ingest',
    tier: 'core-api',
    region: 'ap-south-1',
    latencyMs: 86,
    status: 'Degraded',
    owner: 'Alex Rivera',
    deployedAt: '2026-11-10',
    dayIndex: 2,
  },
];

const QUERY_FIELDS: ReadonlyArray<QueryFieldSpec> = [
  { key: 'status', label: 'Status', type: 'select', options: ['Healthy', 'Degraded', 'Throttled'] },
  { key: 'region', label: 'Region', type: 'select', options: ['us-west-2', 'eu-central-1', 'ap-south-1'] },
  { key: 'latencyMs', label: 'P95 Latency (ms)', type: 'number' },
  { key: 'service', label: 'Service Name', type: 'text' },
  { key: 'deployedAt', label: 'Deployed Date', type: 'date' },
];

const DEFAULT_QUERY_AST: QueryGroupNode = {
  kind: 'group',
  id: 'root',
  combinator: 'AND',
  children: [
    { kind: 'rule', id: 'q-lat', field: 'latencyMs', operator: 'lessThan', value: '200' },
    {
      kind: 'group',
      id: 'grp-region',
      combinator: 'OR',
      children: [
        { kind: 'rule', id: 'q-r1', field: 'region', operator: 'equals', value: 'us-west-2' },
        { kind: 'rule', id: 'q-r2', field: 'region', operator: 'equals', value: 'eu-central-1' },
        { kind: 'rule', id: 'q-r3', field: 'region', operator: 'equals', value: 'ap-south-1' },
      ],
    },
  ],
};

const DATA_GRID_COLUMNS: ReadonlyArray<AdvancedGridColumn> = [
  { key: 'service', header: 'Service', width: 155, pinned: 'left', editable: true, sortable: true },
  { key: 'tier', header: 'Tier', width: 115, editable: true, sortable: true },
  { key: 'region', header: 'Region', width: 125, editable: true, sortable: true },
  { key: 'latencyMs', header: 'P95 (ms)', width: 105, align: 'right', editable: true, sortable: true },
  { key: 'status', header: 'Status', width: 115, editable: true, sortable: true },
  { key: 'owner', header: 'Owner', width: 140, editable: true, sortable: true },
  { key: 'deployedAt', header: 'Deployed', width: 120, sortable: true },
];

const DEFAULT_FACET_STATE: FacetedFilterState = {
  query: '',
  categories: [],
  minPrice: 0,
  maxPrice: 250,
};

function readTelemetryField(row: TelemetryServiceRow, field: string): string {
  switch (field) {
    case 'service':
      return row.service;
    case 'tier':
      return row.tier;
    case 'region':
      return row.region;
    case 'latencyMs':
      return String(row.latencyMs);
    case 'status':
      return row.status;
    case 'owner':
      return row.owner;
    case 'deployedAt':
      return row.deployedAt;
    default:
      return '';
  }
}

function evaluateQueryAst(node: QueryNode, row: TelemetryServiceRow): boolean {
  if (node.kind === 'group') {
    if (node.children.length === 0) return true;
    return node.combinator === 'AND'
      ? node.children.every((child) => evaluateQueryAst(child, row))
      : node.children.some((child) => evaluateQueryAst(child, row));
  }

  const rawFieldValue = readTelemetryField(row, node.field);
  const needle = node.value.trim();
  if (node.operator === 'isEmpty') {
    return rawFieldValue.trim().length === 0;
  }
  if (needle.length === 0) {
    return true;
  }

  const lowerVal = rawFieldValue.toLowerCase();
  const lowerNeedle = needle.toLowerCase();

  switch (node.operator) {
    case 'equals':
      return lowerVal === lowerNeedle;
    case 'notEquals':
      return lowerVal !== lowerNeedle;
    case 'contains':
      return lowerVal.includes(lowerNeedle);
    case 'startsWith':
      return lowerVal.startsWith(lowerNeedle);
    case 'greaterThan': {
      const a = Number(rawFieldValue);
      const b = Number(needle);
      return Number.isFinite(a) && Number.isFinite(b) ? a > b : true;
    }
    case 'lessThan': {
      const a = Number(rawFieldValue);
      const b = Number(needle);
      return Number.isFinite(a) && Number.isFinite(b) ? a < b : true;
    }
    case 'after':
      return rawFieldValue > needle;
    case 'before':
      return rawFieldValue < needle;
  }
}

function applyRowCellEdit(
  row: TelemetryServiceRow,
  columnKey: string,
  nextValue: GridCellValue
): TelemetryServiceRow {
  const str = String(nextValue);
  switch (columnKey) {
    case 'service':
      return { ...row, service: str };
    case 'tier':
      return { ...row, tier: str };
    case 'region':
      return { ...row, region: str };
    case 'latencyMs': {
      const parsed = Number(nextValue);
      return Number.isFinite(parsed) && parsed >= 0 ? { ...row, latencyMs: Math.round(parsed) } : row;
    }
    case 'status':
      return { ...row, status: str };
    case 'owner':
      return { ...row, owner: str };
    default:
      return row;
  }
}

function DatabaseQueryExplorerExample() {
  const dispatch = useAppDispatch();
  const [rows, setRows] = useState<TelemetryServiceRow[]>(() => [...INITIAL_TELEMETRY_ROWS]);
  const [queryAst, setQueryAst] = useState<QueryGroupNode>(DEFAULT_QUERY_AST);
  const [brushRange, setBrushRange] = useState<BrushIndexRange>([2, 12]);
  const [facetState, setFacetState] = useState<FacetedFilterState>(DEFAULT_FACET_STATE);

  const filteredRows = useMemo(() => {
    const searchNeedle = facetState.query.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.dayIndex < brushRange[0] || row.dayIndex > brushRange[1]) {
        return false;
      }
      if (facetState.categories.length > 0 && !facetState.categories.includes(row.tier)) {
        return false;
      }
      if (facetState.minPrice !== undefined && row.latencyMs < facetState.minPrice) {
        return false;
      }
      if (facetState.maxPrice !== undefined && row.latencyMs > facetState.maxPrice) {
        return false;
      }
      if (searchNeedle.length > 0) {
        const haystack = `${row.service} ${row.region} ${row.status} ${row.owner} ${row.tier}`.toLowerCase();
        if (!haystack.includes(searchNeedle)) {
          return false;
        }
      }
      return evaluateQueryAst(queryAst, row);
    });
  }, [brushRange, facetState, queryAst, rows]);

  const gridRecords = useMemo<GridRowRecord[]>(
    () =>
      filteredRows.map((row) => ({
        id: row.id,
        values: {
          service: row.service,
          tier: row.tier,
          region: row.region,
          latencyMs: row.latencyMs,
          status: row.status,
          owner: row.owner,
          deployedAt: row.deployedAt,
        },
      })),
    [filteredRows]
  );

  const avgLatency = useMemo(() => {
    if (filteredRows.length === 0) return 0;
    const total = filteredRows.reduce((sum, row) => sum + row.latencyMs, 0);
    return Math.round(total / filteredRows.length);
  }, [filteredRows]);

  const windowStartLabel = BRUSH_TIMELINE_POINTS[brushRange[0]]?.label ?? 'Nov 08';
  const windowEndLabel = BRUSH_TIMELINE_POINTS[brushRange[1]]?.label ?? 'Nov 21';

  const handleResetFilters = () => {
    setQueryAst(DEFAULT_QUERY_AST);
    setBrushRange([0, BRUSH_TIMELINE_POINTS.length - 1]);
    setFacetState(DEFAULT_FACET_STATE);
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <header className="prism-slab p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span className="prism-crystal px-3 py-1.5 rounded-full text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-sky-500 shrink-0" aria-hidden="true" />
            <span>analytics_prod.telemetry_services</span>
          </span>
          <BadgeStatus label="Matched Rows" count={filteredRows.length} tone="counter" />
          <BadgeStatus label={`${windowStartLabel} → ${windowEndLabel}`} tone="online" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="prism-well px-3 py-1.5 rounded-full font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-300">
            Avg P95: {avgLatency}ms
          </span>
          <SecondaryButton size="sm" onClick={handleResetFilters}>
            Reset Filters
          </SecondaryButton>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
        <div className="lg:col-span-7 min-w-0">
          <VisualQueryBuilder
            fields={QUERY_FIELDS}
            value={queryAst}
            onChange={setQueryAst}
            maxDepth={3}
            showPreview
          />
        </div>

        <div className="lg:col-span-5 min-w-0 flex flex-col gap-4">
          <BrushRangeScrubber
            title="Deployment Telemetry Window"
            tone="secondary"
            data={[...BRUSH_TIMELINE_POINTS]}
            range={brushRange}
            minSpan={2}
            onRangeChange={(nextRange) => setBrushRange(nextRange)}
          />

          <div className="prism-slab p-4 grid grid-cols-3 gap-2.5 text-center">
            <div className="prism-well rounded-xl p-2.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Visible</div>
              <div className="text-base font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                {filteredRows.length}/{rows.length}
              </div>
            </div>
            <div className="prism-well rounded-xl p-2.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Avg P95</div>
              <div className="text-base font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                {avgLatency}ms
              </div>
            </div>
            <div className="prism-well rounded-xl p-2.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Window</div>
              <div className="text-base font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                {brushRange[1] - brushRange[0] + 1}d
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <FacetedFilterBar
          value={facetState}
          onChange={setFacetState}
          resultCount={filteredRows.length}
          priceLabel="P95 Latency (ms)"
          priceBounds={{ min: 0, max: 250 }}
          showDateRange={false}
          searchPlaceholder="Filter services, regions, statuses, or owners..."
          categories={[
            { value: 'edge-cdn', label: 'Edge CDN', count: 2 },
            { value: 'auth-iam', label: 'Auth & IAM', count: 2 },
            { value: 'core-api', label: 'Core API', count: 2 },
            { value: 'billing', label: 'Billing', count: 1 },
          ]}
        />
      </div>

      <div className="min-w-0">
        <AdvancedDataGrid
          columns={DATA_GRID_COLUMNS}
          rows={gridRecords}
          exportFilename="refractor-telemetry-query.csv"
          emptyMessage="No telemetry services match the active query AST and time window."
          onCellEdit={(rowId, columnKey, nextValue) => {
            setRows((prev) =>
              prev.map((row) => (row.id === rowId ? applyRowCellEdit(row, columnKey, nextValue) : row))
            );
            dispatch(
              pushToast({
                title: `Updated ${columnKey}`,
                description: `Committed "${String(nextValue)}" to row ${rowId}`,
                tone: 'emerald',
              })
            );
          }}
          onExportCsv={(_csv, filename) =>
            dispatch(
              pushToast({
                title: `Exported ${filename}`,
                description: `${filteredRows.length} rows exported with OWASP formula neutralization.`,
                tone: 'info',
              })
            )
          }
        />
      </div>
    </div>
  );
}

const DATABASE_QUERY_EXPLORER_CODE = `import { useMemo, useState } from 'react';
import {
  AdvancedDataGrid, type AdvancedGridColumn, BrushRangeScrubber, type BrushIndexRange,
  FacetedFilterBar, type FacetedFilterState, type GridRowRecord,
  type QueryGroupNode, VisualQueryBuilder,
} from '@refractor-ui/core';

const COLUMNS: ReadonlyArray<AdvancedGridColumn> = [
  { key: 'service', header: 'Service', width: 155, pinned: 'left', editable: true, sortable: true },
  { key: 'region', header: 'Region', width: 125, editable: true, sortable: true },
  { key: 'latencyMs', header: 'P95 (ms)', width: 105, align: 'right', editable: true, sortable: true },
  { key: 'status', header: 'Status', width: 115, editable: true, sortable: true },
];

const INITIAL_ROWS: GridRowRecord[] = [
  { id: 'r1', values: { service: 'edge-router', region: 'us-west-2', latencyMs: 18, status: 'Healthy' } },
  { id: 'r2', values: { service: 'auth-gateway', region: 'eu-central-1', latencyMs: 34, status: 'Healthy' } },
  { id: 'r3', values: { service: 'billing-ledger', region: 'us-west-2', latencyMs: 112, status: 'Degraded' } },
];

export function EnterpriseQueryStudio() {
  const [rows, setRows] = useState<GridRowRecord[]>(INITIAL_ROWS);
  const [range, setRange] = useState<BrushIndexRange>([1, 5]);
  const [facets, setFacets] = useState<FacetedFilterState>({ query: '', categories: [] });
  const [queryAst, setQueryAst] = useState<QueryGroupNode>({
    kind: 'group',
    id: 'root',
    combinator: 'AND',
    children: [{ kind: 'rule', id: 'r1', field: 'status', operator: 'equals', value: 'Healthy' }],
  });

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        const q = facets.query.trim().toLowerCase();
        return !q || String(row.values.service ?? '').toLowerCase().includes(q);
      }),
    [facets.query, rows]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 min-w-0">
          <VisualQueryBuilder
            fields={[
              { key: 'status', label: 'Status', type: 'select', options: ['Healthy', 'Degraded'] },
              { key: 'latencyMs', label: 'P95 Latency', type: 'number' },
            ]}
            value={queryAst}
            onChange={setQueryAst}
          />
        </div>
        <div className="lg:col-span-5 min-w-0">
          <BrushRangeScrubber
            title="Telemetry Window"
            range={range}
            onRangeChange={(next) => setRange(next)}
            data={[
              { label: 'Nov 10', value: 48 }, { label: 'Nov 12', value: 64 },
              { label: 'Nov 14', value: 78 }, { label: 'Nov 16', value: 84 },
              { label: 'Nov 18', value: 91 }, { label: 'Nov 20', value: 96 },
            ]}
          />
        </div>
      </div>

      <FacetedFilterBar
        value={facets}
        onChange={setFacets}
        resultCount={visibleRows.length}
        categories={[{ value: 'edge', label: 'Edge CDN', count: 2 }, { value: 'auth', label: 'Auth', count: 1 }]}
      />

      <AdvancedDataGrid
        columns={COLUMNS}
        rows={visibleRows}
        onCellEdit={(rowId, colKey, nextVal) =>
          setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, values: { ...r.values, [colKey]: nextVal } } : r)))
        }
      />
    </div>
  );
}`;

/* ============================================================================
 * Exported Developer Operations Example Suite
 * ============================================================================ */

export const DEVELOPER_OPS_EXAMPLES: ReadonlyArray<ExampleScreenSpec> = [
  {
    id: 'code-editing-ide',
    title: 'Cloud Code Editing Workspace & Terminal IDE',
    domain: 'developer-ops',
    domainTitle: 'Code Editing, Diffs & DevOps',
    summary:
      'Interactive browser IDE combining breadcrumb path navigation, keyboard shortcut badges, live compiler status pills, file-tree switching into a syntax-highlighted editor, and a split terminal multiplexer driven by an autocomplete command bar.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'Breadcrumbs',
      'KeycapBadge',
      'ProcessStatusPill',
      'TreeView',
      'CodeEditor',
      'TerminalMultiplexer',
      'CommandInputBar',
      'SecondaryButton',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'Selecting any file in TreeView hot-swaps syntax language, diagnostics, and preserved dirty buffer state in CodeEditor.',
      'CommandInputBar executes commands directly into the active TerminalMultiplexer pane while syncing ProcessStatusPill telemetry.',
      'Responsive 12-column optical slab layout collapses gracefully to single-column stacking with zero overflow at 768px and 390px.',
    ],
    fullCode: CODE_EDITING_IDE_CODE,
    render: () => <CodeEditingIdeExample />,
  },
  {
    id: 'pull-request-diff-review',
    title: 'Pull Request & Code Diff Review Workbench',
    domain: 'developer-ops',
    domainTitle: 'Code Editing, Diffs & DevOps',
    summary:
      'Full Git pull request review studio uniting live reviewer presence avatars, split merge-strategy controls, per-hunk accept/reject diff approval, side-by-side/unified full-file diffs, and @mention-enabled inline discussion threads.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'BadgeStatus',
      'LivePresenceIndicator',
      'ComboSplitButton',
      'InlineDiffReviewer',
      'DiffViewer',
      'CommentThread',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Multi-file PR switcher updates InlineDiffReviewer hunks and full DiffViewer comparisons simultaneously while tracking global approval progress.',
      'ComboSplitButton exposes Squash & Merge, Rebase & Merge, and destructive Request Changes flows with immediate timeline audit entries.',
      'LivePresenceIndicator and CommentThread keep distributed reviewers aligned without crowding narrow tablet viewports.',
    ],
    fullCode: PULL_REQUEST_REVIEW_CODE,
    render: () => <PullRequestDiffReviewExample />,
  },
  {
    id: 'ci-cd-deployment-pipeline',
    title: 'CI/CD Deployment Pipeline & Live Log Console',
    domain: 'developer-ops',
    domainTitle: 'Code Editing, Diffs & DevOps',
    summary:
      'Release orchestration console pairing interactive 4-stage deployment progress, stoppable/retryable job pills, filterable live log streaming, multi-variant CLI replay blocks, structured build manifest inspection, and hold-to-confirm emergency rollback.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'Stepper',
      'ProcessStatusPill',
      'LiveLogStreamer',
      'CopyableCommandBlock',
      'StructuredOutputViewer',
      'HoldToConfirmButton',
      'PrimaryButton',
      'SecondaryButton',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Advancing stages or stopping/retrying job pills live-streams timestamped log entries and updates the StructuredOutputViewer JSON manifest.',
      'HoldToConfirmButton adds tactile safety friction for destructive production rollbacks with automatic post-rollback manifest reflection.',
      'CopyableCommandBlock packages CI replay and verification commands behind one-click crystal tabs.',
    ],
    fullCode: CI_CD_PIPELINE_CODE,
    render: () => <CiCdPipelineExample />,
  },
  {
    id: 'visual-workflow-graph',
    title: 'Visual Automation DAG & Flow Studio',
    domain: 'developer-ops',
    domainTitle: 'Code Editing, Diffs & DevOps',
    summary:
      'No-code DevOps workflow designer uniting a draggable, port-connectable DAG node canvas, radial quick-add template launcher, live runtime status pills, and an interactive 24-hour Sankey execution volume breakdown.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'NodeGraphCanvas',
      'SankeyDiagram',
      'SpeedDialButton',
      'BadgeStatus',
      'SecondaryButton',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Radial SpeedDialButton spawns and auto-wires new Webhook, Policy Gate, Canary, or Alert nodes directly onto NodeGraphCanvas.',
      'Selected node inspector surfaces live coordinates and category metadata while SankeyDiagram dynamically reflects throughput shifts.',
      'Generous headroom around the radial launcher guarantees zero clipping across Web, Tablet, and Mobile preview frames.',
    ],
    fullCode: VISUAL_WORKFLOW_GRAPH_CODE,
    render: () => <VisualWorkflowGraphExample />,
  },
  {
    id: 'database-query-explorer',
    title: 'Enterprise Data Grid & Visual Query Studio',
    domain: 'developer-ops',
    domainTitle: 'Code Editing, Diffs & DevOps',
    summary:
      'High-density data operations workbench linking a nested AND/OR visual query AST builder, interactive time-window brush scrubber, multi-facet filter bar, and an inline-editable, sortable, formula-safe CSV data grid.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'VisualQueryBuilder',
      'BrushRangeScrubber',
      'FacetedFilterBar',
      'AdvancedDataGrid',
      'BadgeStatus',
      'SecondaryButton',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'Every rule edit in VisualQueryBuilder, range drag in BrushRangeScrubber, and pill toggle in FacetedFilterBar live-filters AdvancedDataGrid in real time.',
      'Inline edits in AdvancedDataGrid commit cleanly to source records and preserve values across sorting, filtering, and OWASP-safe CSV export.',
      'Live telemetry KPI strip recalculates visible row ratios, window span, and average P95 latency on every interaction.',
    ],
    fullCode: DATABASE_QUERY_EXPLORER_CODE,
    render: () => <DatabaseQueryExplorerExample />,
  },
];

