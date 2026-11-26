import { useState } from 'react';
import {
  FacetedFilterBar,
  type FacetedFilterState,
  GlobalSearchModal,
  MultiSelectCombobox,
  PrimaryButton,
  VisualQueryBuilder,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface SearchDemosProps {
  componentId: string;
}

const GLOBAL_ITEMS = [
  { id: 'f1', title: 'refractor.css', subtitle: 'packages/core/src/refractor.css', type: 'Files', meta: '11 KB' },
  { id: 'f2', title: 'ADR-0003-dual-mui-open-internals-optical-theming.md', subtitle: 'docs/adr/', type: 'Files', meta: 'ADR' },
  { id: 'p1', title: 'Clara Vance', subtitle: 'Principal UX/UI Director', type: 'People', meta: 'Online' },
  { id: 'p2', title: 'Marcus Chen', subtitle: 'Optical Systems Architect', type: 'People', meta: 'Editing' },
  { id: 's1', title: 'Optical Theme Studio', subtitle: 'Customize palette & caustic intensity', type: 'Settings', shortcut: '⌘,' },
  { id: 's2', title: 'Strict Two-Tier Lint Policy', subtitle: 'REFRACTOR_STRICT_LINT=1', type: 'Settings', shortcut: 'CI' },
];

export function SearchDemos({ componentId }: SearchDemosProps) {
  const dispatch = useAppDispatch();
  const [facetState, setFacetState] = useState<FacetedFilterState>({
    query: '',
    categories: ['optics'],
    minPrice: 25,
    maxPrice: 400,
    dateFrom: '2026-11-01',
    dateTo: '2026-11-30',
  });
  const [tokens, setTokens] = useState<string[]>(['optics', 'react19']);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  switch (componentId) {
    case 'faceted-filter-bar':
      return (
        <div className="w-full">
          <FacetedFilterBar
            value={facetState}
            onChange={setFacetState}
            resultCount={Math.max(0, 42 - facetState.categories.length * 6)}
            categories={[
              { value: 'optics', label: 'Optical Glass', count: 24 },
              { value: 'data-viz', label: 'Data Visualization', count: 12 },
              { value: 'accessibility', label: 'WCAG AA', count: 58 },
              { value: 'security', label: 'OWASP Hardened', count: 16 },
            ]}
          />
        </div>
      );

    case 'visual-query-builder':
      return (
        <div className="w-full">
          <VisualQueryBuilder
            fields={[
              { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Review', 'Scheduled', 'Archived'] },
              { key: 'createdAt', label: 'Created Date', type: 'date' },
              { key: 'coverage', label: 'Coverage %', type: 'number' },
              { key: 'component', label: 'Component Name', type: 'text' },
            ]}
            defaultValue={{
              kind: 'group',
              id: 'root',
              combinator: 'AND',
              children: [
                { kind: 'rule', id: 'r1', field: 'status', operator: 'equals', value: 'Active' },
                { kind: 'rule', id: 'r2', field: 'createdAt', operator: 'after', value: '2026-01-01' },
              ],
            }}
          />
        </div>
      );

    case 'multi-select-combobox':
      return (
        <div className="w-full max-w-lg">
          <MultiSelectCombobox
            label="Component Capabilities & Tags"
            value={tokens}
            onChange={setTokens}
            creatable
            options={[
              { value: 'optics', label: 'Optical Glass', category: 'Visual' },
              { value: 'react19', label: 'React 19 Ref', category: 'Architecture' },
              { value: 'open-internals', label: 'Open-Internals Standard', category: 'Architecture' },
              { value: 'mui-theme', label: 'MUI Palette Sync', category: 'Theming' },
              { value: 'wcag-aa', label: 'WCAG 2.2 AA', category: 'Accessibility' },
              { value: 'owasp', label: 'OWASP Sanitized', category: 'Security' },
            ]}
          />
        </div>
      );

    case 'global-search-modal':
      return (
        <div className="flex flex-col items-center gap-3">
          <PrimaryButton onClick={() => setSearchModalOpen(true)}>
            Open Global Search Modal
          </PrimaryButton>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Searches across Files, People, and Settings simultaneously with literal highlighting and arrow-key navigation.
          </p>
          <GlobalSearchModal
            open={searchModalOpen}
            onClose={() => setSearchModalOpen(false)}
            items={GLOBAL_ITEMS}
            recentQueries={['refractor.css', 'Clara', 'Theme']}
            onSelectItem={(item) =>
              dispatch(
                pushToast({
                  title: `Opened ${item.title}`,
                  description: `${item.type} · ${item.subtitle ?? ''}`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    default:
      return null;
  }
}
