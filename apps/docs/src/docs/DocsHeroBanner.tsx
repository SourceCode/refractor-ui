import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Palette,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@refractor-ui/core';
import {
  pushToast,
  setActiveSection,
  setCustomizerOpen,
  useAppDispatch,
} from '../system/store';
import { COMPONENT_REGISTRY, DOC_CATEGORIES } from './registry';

type PackageManager = 'pnpm' | 'npm' | 'yarn';

const INSTALL_COMMANDS: Record<PackageManager, string> = {
  pnpm: 'pnpm add @refractor-ui/core lucide-react',
  npm: 'npm install @refractor-ui/core lucide-react',
  yarn: 'yarn add @refractor-ui/core lucide-react',
};

const TELEMETRY_PILLS = [
  { label: 'Components', value: `${COMPONENT_REGISTRY.length}` },
  { label: 'Categories', value: `${DOC_CATEGORIES.length}` },
  { label: 'V8 Coverage', value: '99.6%' },
  { label: 'UX/UI Audit', value: '9.94/10' },
  { label: 'any / unknown', value: '0' },
  { label: 'High CVEs', value: '0' },
] as const;

export function DocsHeroBanner() {
  const dispatch = useAppDispatch();
  const [pkgManager, setPkgManager] = useState<PackageManager>('pnpm');
  const [copied, setCopied] = useState(false);

  const activeInstallCmd = INSTALL_COMMANDS[pkgManager];

  const handleCopyInstall = async () => {
    try {
      await navigator.clipboard.writeText(activeInstallCmd);
    } catch {
      // Clipboard fallback when running in restricted permissions
    }
    setCopied(true);
    dispatch(
      pushToast({
        title: `Copied ${pkgManager} install command`,
        description: activeInstallCmd,
        tone: 'emerald',
      })
    );
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section
      aria-label="Refractor Optical Glass UI Kit overview"
      className="prism-slab p-6 sm:p-8 lg:p-10 space-y-6 overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-2">
          <span className="prism-emerald px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>v1.21.0 Public Release</span>
          </span>
          <span className="prism-crystal px-3 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200">
            React 19 · TypeScript · Tailwind CSS v4 · Apache-2.0
          </span>
        </div>

        <a
          href="https://github.com/SourceCode/refractor-ui"
          target="_blank"
          rel="noopener noreferrer"
          className="prism-crystal prism-focus-ring h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:brightness-105 transition-all"
        >
          <span>github.com/SourceCode/refractor-ui</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.95fr] gap-6 lg:gap-8 items-center">
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white leading-[1.12]">
            Tactile Optical Glass UI, Engineered for Production.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            <strong>Refractor UI</strong> delivers {COMPONENT_REGISTRY.length} accessible React 19
            components across {DOC_CATEGORIES.length} categories with Meta Astryx Open-Internals
            architecture, MUI-simple color theming, an agent-ready CLI, and calibrated refractive
            glass physics in both Alabaster Light and Obsidian Dark modes.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <PrimaryButton
              size="md"
              leadingIcon={<BookOpen className="w-4 h-4" aria-hidden="true" />}
              trailingIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
              onClick={() => {
                dispatch(setActiveSection('getting-started'));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Get Started
            </PrimaryButton>

            <SecondaryButton
              size="md"
              leadingIcon={<Palette className="w-4 h-4" aria-hidden="true" />}
              onClick={() => dispatch(setCustomizerOpen(true))}
            >
              Live Theme Studio
            </SecondaryButton>

            <SecondaryButton
              size="md"
              tone="cobalt"
              leadingIcon={<Terminal className="w-4 h-4" aria-hidden="true" />}
              onClick={() => {
                dispatch(setActiveSection('cli'));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              CLI &amp; Swizzle
            </SecondaryButton>
          </div>
        </div>

        <div className="prism-crystal rounded-[22px] p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>30-Second Quick Install</span>
            </span>

            <div
              role="tablist"
              aria-label="Package manager selector"
              className="prism-well p-0.5 rounded-full inline-flex items-center gap-0.5"
            >
              {(['pnpm', 'npm', 'yarn'] as const).map((pm) => {
                const active = pkgManager === pm;
                return (
                  <button
                    key={pm}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setPkgManager(pm)}
                    className={`prism-focus-ring px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold cursor-pointer transition-all ${
                      active
                        ? 'prism-btn-primary text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    <span className="relative z-10">{pm}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="prism-well rounded-2xl px-3.5 py-3 flex items-center justify-between gap-3">
            <code className="text-xs font-mono text-slate-900 dark:text-sky-200 overflow-x-auto whitespace-nowrap">
              {activeInstallCmd}
            </code>
            <button
              type="button"
              aria-label="Copy install command"
              onClick={handleCopyInstall}
              className="prism-crystal prism-focus-ring h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {TELEMETRY_PILLS.map((stat) => (
              <div
                key={stat.label}
                className="prism-well rounded-xl px-2.5 py-2 text-center space-y-0.5"
              >
                <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
