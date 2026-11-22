import {
  BlockTransformHandle,
  CalloutAdmonition,
  DocumentPageViewer,
  FloatingTableOfContents,
  FormulaSpreadsheetGrid,
  LinkPreviewCard,
  SlashCommandMenu,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface DocumentKnowledgeDemosProps {
  componentId: string;
}

export function DocumentKnowledgeDemos({ componentId }: DocumentKnowledgeDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'slash-command-menu':
      return (
        <div className="w-full max-w-2xl pb-8">
          <SlashCommandMenu
            defaultMenuOpen
            onInsertCommand={(cmd) =>
              dispatch(pushToast({ title: `Inserted ${cmd.label}`, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'block-transform-handle':
      return (
        <div className="w-full max-w-2xl">
          <BlockTransformHandle title="Product Spec Block Canvas" />
        </div>
      );

    case 'floating-table-of-contents':
      return (
        <div className="w-full max-w-sm">
          <FloatingTableOfContents
            sticky={false}
            onSelectHeading={(h) =>
              dispatch(pushToast({ title: `Jumped to "${h.title}"`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'callout-admonition':
      return (
        <div className="w-full max-w-2xl space-y-3">
          <CalloutAdmonition kind="tip" title="Optical Refraction Tip">
            Wrap custom surface rules inside CSS <code className="font-mono">@layer components</code>{' '}
            so Tailwind v4 utility classes compose cleanly without specificity conflicts.
          </CalloutAdmonition>
          <CalloutAdmonition kind="warning" title="Rate Limit Guardrail" collapsible>
            Webhook bursts exceeding 500 req/s automatically buffer into the regional retry queue.
          </CalloutAdmonition>
        </div>
      );

    case 'link-preview-card':
      return (
        <div className="prism-slab p-6 w-full max-w-xl text-sm text-slate-700 dark:text-slate-200 leading-relaxed pb-24">
          Hover or focus the inline entity link{' '}
          <LinkPreviewCard
            href="https://sourcecode.github.io/refractor-ui/#/architecture"
            label="ADR-0005 Security Architecture"
            defaultOpen
            external
            preview={{
              title: 'ADR-0005 · Testing, Coverage & Security Verification',
              summary:
                'Mandates >= 93% V8 coverage across all four metrics, OWASP sanitization invariants, and zero-any strictness across every core primitive.',
              kind: 'doc',
              author: 'Core Platform Team',
              updatedAt: 'Updated 2h ago',
              tags: ['ADR', 'OWASP', 'React 19'],
            }}
          />{' '}
          to inspect live knowledge-base metadata without leaving your document flow.
        </div>
      );

    case 'document-page-viewer':
      return (
        <div className="w-full max-w-3xl">
          <DocumentPageViewer documentTitle="Refractor_Optical_Spec_v2.pdf" />
        </div>
      );

    case 'formula-spreadsheet-grid':
      return (
        <div className="w-full max-w-3xl">
          <FormulaSpreadsheetGrid
            title="Q4 Optical Budget & Unit Economics"
            onCellChange={(_sheet, addr, _raw, computed) =>
              dispatch(pushToast({ title: `Updated ${addr} = ${computed}`, tone: 'emerald' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
