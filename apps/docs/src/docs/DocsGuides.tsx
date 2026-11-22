import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  Lock,
  Palette,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@refractor-ui/core';
import {
  type DocsPageSection,
  pushToast,
  setActiveCategory,
  setActiveSection,
  setCustomizerOpen,
  useAppDispatch,
} from '../system/store';
import { ThemeGallerySection } from './ThemeGallerySection';

export interface DocsGuidesProps {
  section: Exclude<DocsPageSection, 'catalog' | 'examples'>;
}

interface CodeBlockCardProps {
  title: string;
  filename?: string;
  code: string;
}

function CodeBlockCard({ title, filename, code }: CodeBlockCardProps) {
  const dispatch = useAppDispatch();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard fallback
    }
    setCopied(true);
    dispatch(pushToast({ title: `Copied ${title}`, tone: 'emerald' }));
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="prism-slab overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-300/45 dark:border-slate-700/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
          <span>{title}</span>
          {filename ? (
            <code className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-normal text-slate-600 dark:text-slate-300">
              {filename}
            </code>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--prism-text-primary)] cursor-pointer shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 relative z-10 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="relative z-10">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
              <span className="relative z-10">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="bg-slate-950 text-sky-200 p-5 text-xs font-mono leading-relaxed overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const CSS_IMPORT_SNIPPET = `@import "tailwindcss";
@source "../node_modules/@refractor-ui/core/dist";
@custom-variant dark (&:where(.dark, .dark *, [data-color-mode="dark"], [data-color-mode="dark"] *));

/* Refractor wraps reset in @layer base and optical classes in @layer components */
@import "@refractor-ui/core/reset.css";
@import "@refractor-ui/core/refractor.css";`;

const FIRST_APP_SNIPPET = `import {
  PrismThemeProvider,
  createPrismTheme,
  PrismCard,
  PrimaryButton,
  SecondaryButton,
} from '@refractor-ui/core';

const appTheme = createPrismTheme({
  palette: {
    mode: 'light',
    primary: { main: '#E75C24' },
    secondary: { main: '#38BDF8' },
  },
  optics: { refraction: 'standard', blurPx: 18 },
});

export function App() {
  return (
    <PrismThemeProvider theme={appTheme}>
      <PrismCard title="Refractor Optical Glass" kicker="Production Ready">
        <div className="flex gap-3 pt-2">
          <PrimaryButton size="md">Start Project</PrimaryButton>
          <SecondaryButton size="md">Explore Docs</SecondaryButton>
        </div>
      </PrismCard>
    </PrismThemeProvider>
  );
}`;

const SUBPATH_IMPORT_SNIPPET = `// Astryx-aligned tree-shakeable subpath imports for zero bundle bloat
import { PrimaryButton } from '@refractor-ui/core/PrimaryButton';
import { AdvancedDataGrid } from '@refractor-ui/core/AdvancedDataGrid';
import { NodeGraphCanvas } from '@refractor-ui/core/NodeGraphCanvas';
import { ProductTour } from '@refractor-ui/core/ProductTour';`;

const MUI_THEME_SNIPPET = `import { createPrismTheme, PrismThemeProvider } from '@refractor-ui/core';

// Pass a single hex color — Refractor derives light, dark, WCAG >= 4.5:1
// contrastText, and RGB caustic dispersion channels automatically.
export const brandTheme = createPrismTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7C3AED' },
    secondary: { main: '#06B6D4' },
    success: { main: '#10B981' },
  },
  shape: { borderRadius: 16, slabRadius: 24 },
  optics: {
    refraction: 'vivid',
    blurPx: 20,
    specularHighlight: true,
  },
  components: {
    PrimaryButton: { className: 'tracking-wide uppercase' },
  },
});`;

const ASTRYX_CASCADE_SNIPPET = `import { defineTheme, PrismThemeProvider } from '@refractor-ui/core';
import { alabasterTheme } from '@refractor-ui/theme-alabaster';

// Inherit an official preset and override tokens with [light, dark] tuples
export const studioTheme = defineTheme({
  name: 'studio-brand',
  extends: alabasterTheme,
  tokens: {
    '--prism-radius-slab': ['26px', '22px'],
    '--prism-caustic-opacity': ['1.1', '0.85'],
  },
  components: {
    PrismCard: { className: 'shadow-xl' },
  },
});`;

const CLI_SNIPPET = `# List all 314 components grouped across 55 canonical categories
npx @refractor-ui/cli component --list

# Inspect props, accessibility & examples (compact --dense mode for AI agents)
npx @refractor-ui/cli component AdvancedDataGrid --dense
npx @refractor-ui/cli component TransferList --detail full

# Read architectural & theming principles directly from your terminal
npx @refractor-ui/cli docs theme --dense
npx @refractor-ui/cli theme list

# Step 5 Open Internals: eject source into your repo with clean @refractor-ui/core imports
npx @refractor-ui/cli swizzle PrimaryButton --out src/components/ui

# Verify Astryx directory structure, SemVer lockstep, and zero any/unknown
npx @refractor-ui/cli check --strict`;

const TOKEN_ROWS = [
  { group: 'Primary Ramp', tokens: '--prism-primary-{main,light,dark,contrast,rgb}', role: 'Primary CTAs, active tabs, focus accents' },
  { group: 'Secondary / Crystal', tokens: '--prism-secondary-{main,light,dark,contrast,rgb}', role: 'Frosted shells, chart strokes, focus rings' },
  { group: 'Semantic States', tokens: '--prism-{info,success,warning,error}-{main,contrast,rgb}', role: 'Cobalt CTAs, emerald badges, warning/destructive states' },
  { group: 'Multi-Material Surfaces', tokens: '--prism-{window,surface,chrome}-{bg,border,shadow}, --prism-wallpaper', role: 'Full visual transformation across all 13 material archetypes' },
  { group: 'Refractive & FX Physics', tokens: '--prism-{blur-px,slab-blur-px,caustic-opacity,specular-opacity,fx-opacity,glow-rgb}', role: 'Backdrop blur, neon glow, scanlines, grids, noise & paper grain' },
  { group: 'Geometry, Type & Editor', tokens: '--prism-radius-{control,btn,pill,slab}, --prism-font-{sans,mono}, --prism-editor-*', role: 'Corner curvature, on-demand Google Fonts, and IDE syntax tokens' },
] as const;

const ESCALATION_STEPS = [
  { step: '01', title: 'Typed Props', detail: 'Start with strictly typed variants, tones, sizes, and controlled or uncontrolled props — zero any or unknown.' },
  { step: '02', title: 'Theme Tokens', detail: 'Customize colors, radii, blur, and refraction globally or locally via createPrismTheme() or defineTheme().' },
  { step: '03', title: 'Component Overrides', detail: 'Attach default classes or styles to any primitive through theme.components.<ComponentName>.' },
  { step: '04', title: 'Stable refractor-* & xstyle', detail: 'Target stable semantic classes (refractor-primary-button) and data-* state attributes without clobbering internals.' },
  { step: '05', title: 'CLI Swizzle (Full Ownership)', detail: 'Run `refractor swizzle <Name> --out <dir>` to eject clean source code with rewritten @refractor-ui/core imports.' },
] as const;

const ADRS = [
  { id: 'ADR-0001', title: 'Monorepo Hierarchy & Component Architecture', file: 'ADR-0001-monorepo-and-astryx-component-architecture.md', summary: 'Per-component directories, React 19 ref-as-prop, BaseProps, themeProps, mergeProps, and subpath exports.' },
  { id: 'ADR-0002', title: 'Zero any/unknown TypeScript & Two-Tier ESLint', file: 'ADR-0002-strict-typescript-zero-any-unknown-and-lint-governance.md', summary: '17 custom AST rules enforcing component contracts and eliminating wildcard escape hatches.' },
  { id: 'ADR-0003', title: 'Optical Theme Engine & CSS Token Cascade', file: 'ADR-0003-dual-mui-astryx-optical-theming-and-token-cascade.md', summary: 'Single-hex color derivation unified with CSS custom property cascades inside @layer components.' },
  { id: 'ADR-0004', title: 'Semantic Versioning 2.0.0 & Release Governance', file: 'ADR-0004-semantic-versioning-and-release-workflow.md', summary: 'Lockstep SemVer 2.0.0 manifests, Keep a Changelog 1.1.0, annotated tags, and automated drift checks.' },
  { id: 'ADR-0005', title: '93%+ Coverage & Adversarial Security Validation', file: 'ADR-0005-testing-adversarial-coverage-and-security-verification.md', summary: 'Mandatory >= 93% V8 coverage across all 4 metrics with positive, negative, and OWASP adversarial suites.' },
  { id: 'ADR-0006', title: 'Accessibility & 9.8/10+ Optical Glass Standard', file: 'ADR-0006-accessibility-and-optical-glass-design-standards.md', summary: 'WCAG AA/AAA contrast, keyboard-only :focus-visible, IME safety, and live Creative UX/UI Director sign-off.' },
] as const;

const SECURITY_INVARIANTS = [
  { title: 'Zero Unsafe HTML Injection', detail: 'Enforced by @refractor/no-dangerous-html and verified statically across all 314 components. RichTextEditor uses an allowlist AST sanitizer.' },
  { title: 'Strict URL & Color Allowlisting', detail: 'sanitizeUrl() blocks javascript:, vbscript:, data:text/html, and control-char obfuscation across avatars, croppers, and editors.' },
  { title: 'OWASP CSV Formula Neutralization', detail: 'AdvancedDataGrid prefixes =, +, -, @, tab, and carriage return cells with a single quote via sanitizeCsvCell() before export.' },
  { title: 'Prototype Pollution Immunity', detail: 'PivotTable, AdvancedDataGrid, VisualQueryBuilder, and GlobalSearchModal isolate dynamic keys inside ES Maps (__proto__/constructor safe).' },
  { title: 'ReDoS & Path Traversal Defense', detail: 'Linear-time highlighting/tokenization prevents catastrophic backtracking; CLI swizzle blocks .. segments and non-PascalCase paths.' },
] as const;

const RESPONSIVE_DEVICE_TARGETS = [
  { group: 'Android Mobile', devices: 'Google Pixel 10 (412×924), Pixel 10 Pro (410×914), Pixel 10 Pro XL (448×997), Samsung Galaxy S25 (360×780), Foldable Cover (344×882)' },
  { group: 'iOS Mobile', devices: 'iPhone 17 / 16 (393×852), iPhone 17 / 16 Pro (402×874), iPhone 17 / 16 Pro Max (440×956), Compact iPhone (375×667)' },
  { group: 'Tablets (Portrait & Landscape)', devices: 'iPad mini (744×1133), Google Pixel Tablet (800×1280), iPad Pro 11" (834×1194), iPad Pro 13" (1024×1366)' },
  { group: 'Desktop Viewports', devices: 'Compact Laptop (1280×800), Standard Studio Desktop (1440×900)' },
] as const;

export function DocsGuides({ section }: DocsGuidesProps) {
  const dispatch = useAppDispatch();

  if (section === 'getting-started') {
    return (
      <div className="space-y-8">
        <div className="prism-slab p-6 sm:p-8 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>Documentation Guide</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Getting Started with Refractor UI
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Install <code className="font-mono">@refractor-ui/core</code>, import the layered optical
            stylesheets, and wrap your React 19 application in{' '}
            <code className="font-mono">&lt;PrismThemeProvider&gt;</code>. Every primitive works out
            of the box with strict TypeScript types and zero configuration.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-600 dark:text-slate-300">
            <span className="prism-crystal px-3 py-1 rounded-full">React &gt;= 19.0.0</span>
            <span className="prism-crystal px-3 py-1 rounded-full">TypeScript &gt;= 5.8</span>
            <span className="prism-crystal px-3 py-1 rounded-full">Tailwind CSS v4</span>
            <span className="prism-crystal px-3 py-1 rounded-full">Node &gt;= 24</span>
          </div>
        </div>

        <CodeBlockCard
          title="1. Install Core Package & Icons"
          code={`pnpm add @refractor-ui/core lucide-react\n\n# Optional official optical theme presets\npnpm add @refractor-ui/theme-alabaster @refractor-ui/theme-obsidian @refractor-ui/theme-amethyst`}
        />

        <CodeBlockCard
          title="2. Import Layered Optical Stylesheets"
          filename="src/index.css"
          code={CSS_IMPORT_SNIPPET}
        />

        <CodeBlockCard
          title="3. Wrap Your App & Render Your First Optical Surface"
          filename="src/App.tsx"
          code={FIRST_APP_SNIPPET}
        />

        <CodeBlockCard
          title="4. Optional Tree-Shakeable Subpath Imports"
          filename="src/Dashboard.tsx"
          code={SUBPATH_IMPORT_SNIPPET}
        />

        <div className="prism-slab p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Ready to tailor Refractor to your brand palette?
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Explore single-hex MUI color derivation, Astryx cascade overrides, or jump straight into
              the 314-component catalog.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <PrimaryButton
              size="sm"
              trailingIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => dispatch(setActiveSection('theming'))}
            >
              Next: Theming &amp; Colors
            </PrimaryButton>
            <SecondaryButton
              size="sm"
              onClick={() => dispatch(setActiveCategory('overview'))}
            >
              Browse 314 Components
            </SecondaryButton>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'theming') {
    return (
      <div className="space-y-8">
        <div className="prism-slab p-6 sm:p-8 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <Palette className="w-4 h-4" aria-hidden="true" />
              <span>69 Multi-Material Themes · 13 Material Archetypes · 9 FX Overlays</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Theming, Materials, Fonts &amp; Visual FX
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Every primitive reads from <code className="font-mono">--prism-*</code> tokens and{' '}
              <code className="font-mono">[data-refractor-material]</code> /{' '}
              <code className="font-mono">[data-refractor-fx]</code> cascades. Click any of the 69
              themes below (5 Optical Glass presets + all 64 WebOS-v3 themes) to transform all 314
              components live with on-demand Google Fonts and GPU-friendly FX.
            </p>
          </div>
          <PrimaryButton
            size="md"
            leadingIcon={<Sparkles className="w-4 h-4" aria-hidden="true" />}
            onClick={() => dispatch(setCustomizerOpen(true))}
          >
            Open Live Theme Studio
          </PrimaryButton>
        </div>

        <ThemeGallerySection />

        <CodeBlockCard
          title="Full-Transformation Multi-Material Themes (@refractor-ui/themes)"
          filename="src/App.tsx"
          code={`import { PrismThemeProvider } from '@refractor-ui/core';\nimport { cyberpunkTheme, getThemeById, windows95Theme } from '@refractor-ui/themes';\n\n// Activate any of the 69 built-in themes with on-demand Google Fonts & FX\nexport function App() {\n  return (\n    <PrismThemeProvider theme={getThemeById('win11-mica') ?? windows95Theme} loadFonts>\n      {/* All 314 components adapt materials, corners, shadows, fonts & wallpapers */}\n    </PrismThemeProvider>\n  );\n}`}
        />

        <CodeBlockCard
          title="Ergonomic Single-Hex Palette Derivation (createPrismTheme)"
          filename="src/theme.ts"
          code={MUI_THEME_SNIPPET}
        />

        <CodeBlockCard
          title="Cascade Theme Inheritance (defineTheme)"
          filename="src/studioTheme.ts"
          code={ASTRYX_CASCADE_SNIPPET}
        />

        <div className="prism-slab p-6 space-y-4 overflow-x-auto">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Core Optical CSS Token Reference
          </h2>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-300/50 dark:border-slate-700/70 text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-4 font-semibold">Token Group</th>
                <th className="py-2 pr-4 font-semibold">CSS Custom Properties</th>
                <th className="py-2 font-semibold">Visual Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/80">
              {TOKEN_ROWS.map((row) => (
                <tr key={row.group}>
                  <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {row.group}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-slate-700 dark:text-sky-200">
                    {row.tokens}
                  </td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-300">{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (section === 'cli') {
    return (
      <div className="space-y-8">
        <div className="prism-slab p-6 sm:p-8 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            <Terminal className="w-4 h-4" aria-hidden="true" />
            <span>Open Internals &amp; Agent Tooling</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            @refractor-ui/cli &amp; Swizzle Escalation Path
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Built for both human teams and AI coding agents, <code className="font-mono">@refractor-ui/cli</code>{' '}
            surfaces dense machine-readable docs, verifies repository invariants, and safely ejects
            component source code when you need total customization.
          </p>
        </div>

        <div className="prism-slab p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-600 dark:text-orange-400" aria-hidden="true" />
            <span>5-Step Astryx Open Internals Escalation Path</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {ESCALATION_STEPS.map((item) => (
              <div key={item.step} className="prism-well rounded-2xl p-4 space-y-1.5">
                <span className="inline-block font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                  STEP {item.step}
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <CodeBlockCard title="CLI Command Reference" code={CLI_SNIPPET} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="prism-slab p-6 sm:p-8 space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Engineering Standards &amp; Certification</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Architecture, Accessibility &amp; OWASP Security
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Refractor enforces strict component engineering contracts at compile time, lint time, and test time —
          achieving <strong>99.6%+ statement coverage</strong>, <strong>0 high/critical CVEs</strong>,
          and a <strong>9.96/10 mean Creative UX/UI Director score</strong> across all 270 components.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Architecture Decision Records (ADR-0001 – ADR-0006)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ADRS.map((adr) => (
            <a
              key={adr.id}
              href={`https://github.com/SourceCode/refractor-ui/blob/main/docs/adr/${adr.file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="prism-slab prism-focus-ring p-5 space-y-2 hover:-translate-y-0.5 transition-all block"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="prism-crystal px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold text-slate-800 dark:text-slate-100">
                  {adr.id}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{adr.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {adr.summary}
              </p>
            </a>
          ))}
        </div>
      </div>

      <div className="prism-slab p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>Built-In OWASP Defense-in-Depth Invariants</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {SECURITY_INVARIANTS.map((item) => (
            <div key={item.title} className="prism-well rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="prism-slab p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
          <span>Multi-Device Responsive Verification Matrix (Desktop, Tablet &amp; Mobile)</span>
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          All 314 components and documentation views are validated across modern iOS, Android (including
          Google Pixel 10), tablet, and desktop aspect ratios with automated Vitest viewport matrix checks
          and live Chromium overflow inspection.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {RESPONSIVE_DEVICE_TARGETS.map((target) => (
            <div key={target.group} className="prism-well rounded-2xl p-4 space-y-1">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                {target.group}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {target.devices}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
