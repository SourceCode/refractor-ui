import React, { useState } from 'react';
import { Check, Code2, Copy, Eye, SlidersHorizontal } from 'lucide-react';
import { ComponentDocEntry } from './registry';
import { useAppSelector } from '../../system/store';

export interface ComponentDocCardProps {
  entry: ComponentDocEntry;
  onFocusSingle?: (id: string) => void;
  isFocusedView?: boolean;
  children: React.ReactNode;
}

export const ComponentDocCard: React.FC<ComponentDocCardProps> = ({
  entry,
  onFocusSingle,
  isFocusedView = false,
  children,
}) => {
  const studioGrid = useAppSelector((s) => s.system.studioGrid);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'props'>('preview');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(entry.codeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <section
      id={entry.id}
      aria-labelledby={`heading-${entry.id}`}
      className="scroll-mt-24 border border-slate-300/65 dark:border-slate-800 rounded-[24px] bg-white/45 dark:bg-slate-900/45 overflow-hidden"
    >
      {/* Documentation Header */}
      <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{entry.categoryTitle}</span>
            <span aria-hidden="true">·</span>
            <code className="font-mono text-slate-700 dark:text-slate-300">&lt;{entry.exportName} /&gt;</code>
          </div>
          <h3
            id={`heading-${entry.id}`}
            className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight"
          >
            {onFocusSingle && !isFocusedView ? (
              <button
                type="button"
                onClick={() => onFocusSingle(entry.id)}
                className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-left cursor-pointer"
              >
                {entry.title}
              </button>
            ) : (
              entry.title
            )}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {entry.summary}
          </p>
        </div>

        {/* MUI-style Preview / Code / Props Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            role="tablist"
            aria-label={`${entry.title} documentation tabs`}
            className="prism-crystal p-1 rounded-full inline-flex items-center gap-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'preview'}
              onClick={() => setActiveTab('preview')}
              className={`h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'preview'
                  ? 'prism-well text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'code'}
              onClick={() => setActiveTab('code')}
              className={`h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'code'
                  ? 'prism-well text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>TSX</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'props'}
              onClick={() => setActiveTab('props')}
              className={`h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'props'
                  ? 'prism-well text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Props</span>
            </button>
          </div>

          <button
            type="button"
            aria-label={`Copy ${entry.exportName} TSX snippet`}
            onClick={handleCopy}
            className="prism-crystal h-10 w-10 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Interactive Canvas / Source / API Body */}
      {activeTab === 'preview' && (
        <div
          className={`${
            studioGrid ? 'prism-studio-grid' : 'prism-studio-surface'
          } p-6 sm:p-8 min-h-[180px] flex items-center justify-center`}
        >
          <div className="w-full max-w-3xl flex flex-wrap items-center justify-center gap-4">
            {children}
          </div>
        </div>
      )}

      {activeTab === 'code' && (
        <div className="bg-slate-950 text-slate-100 p-5 overflow-x-auto">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
            <span>import &#123; {entry.exportName} &#125; from &apos;@/src/os&apos;;</span>
            <span>TypeScript JSX</span>
          </div>
          <pre className="text-xs font-mono leading-relaxed text-sky-200">
            <code>{entry.codeSnippet}</code>
          </pre>
        </div>
      )}

      {activeTab === 'props' && (
        <div className="p-5 overflow-x-auto bg-white/60 dark:bg-slate-900/60">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-4 font-semibold">Prop</th>
                <th className="py-2 pr-4 font-semibold">Type</th>
                <th className="py-2 pr-4 font-semibold">Default</th>
                <th className="py-2 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
              {entry.props.map((prop) => (
                <tr key={prop.name}>
                  <td className="py-2.5 pr-4 font-mono font-medium text-orange-700 dark:text-orange-400 whitespace-nowrap">
                    {prop.name}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {prop.type}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {prop.defaultValue}
                  </td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-300">{prop.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
