import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DirectoryFilterBar as BarrelDirectoryFilterBar,
  type DirectoryGroupByMap,
  type DirectoryTagToneMap,
} from './index';
import {
  DirectoryFilterBar,
  type DirectoryFilterItem,
  type DirectoryFilterState,
} from './DirectoryFilterBar';

describe('DirectoryFilterBar', () => {
  it('renders the default 8-item listing, dynamic Set extension pills, tag pills, live count, ref, theme override, and barrel exports', () => {
    const ref = createRef<HTMLDivElement>();
    const groupMapCheck: DirectoryGroupByMap = {
      none: true,
      kind: true,
      date: true,
      size: true,
    };
    const toneMapCheck: DirectoryTagToneMap = {
      primary: true,
      emerald: true,
      amber: true,
      info: true,
      rose: true,
    };
    expect(BarrelDirectoryFilterBar).toBe(DirectoryFilterBar);
    expect(groupMapCheck.size).toBe(true);
    expect(toneMapCheck.rose).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            DirectoryFilterBar: {
              className: 'theme-dir-filter',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <DirectoryFilterBar
          ref={ref}
          className="local-dir-filter"
          xstyle={{ '--prism-slab-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="dir-filter-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('dir-filter-root');
    expect(ref.current).toBe(root);
    expect(DirectoryFilterBar.displayName).toBe('DirectoryFilterBar');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveClass(
      'refractor-directory-filter-bar',
      'prism-slab',
      'theme-dir-filter',
      'local-dir-filter'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.2px', marginTop: '8px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('20px');
    expect(root).toHaveAttribute('data-group-by', 'none');
    expect(root).toHaveAttribute('data-sort-dir', 'asc');
    expect(root).toHaveAttribute('data-preview', 'true');

    expect(
      screen.getByRole('heading', { name: 'Directory Filter & Grouping' })
    ).toBeInTheDocument();

    const matchCount = screen.getByTestId('directory-filter-match-count');
    expect(matchCount).toHaveAttribute('aria-live', 'polite');
    expect(matchCount).toHaveTextContent('Showing 8 of 8 items');

    // Reset Filters hidden while default state is active
    expect(screen.queryByTestId('directory-filter-reset')).toBeNull();

    // Extension pills derived via Set in deterministic sorted order
    const extGroup = screen.getByTestId('directory-filter-extensions');
    const extButtons = within(extGroup).getAllByRole('button');
    expect(extButtons.map((btn) => btn.textContent)).toEqual([
      'All',
      '.pdf',
      '.png',
      '.tsx',
      '.wav',
      '.zip',
    ]);
    expect(screen.getByTestId('directory-filter-ext-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('directory-filter-ext-.tsx')).toHaveAttribute('aria-pressed', 'false');

    // Color tag pills strictly present with All active
    const tagGroup = screen.getByTestId('directory-filter-tags');
    const tagButtons = within(tagGroup).getAllByRole('button');
    expect(tagButtons.map((btn) => btn.textContent)).toEqual([
      'All',
      'Primary',
      'Emerald',
      'Amber',
      'Info',
      'Rose',
    ]);
    expect(screen.getByTestId('directory-filter-tag-all')).toHaveAttribute('aria-pressed', 'true');

    // Default 8 items sorted ascending alphabetically in flat list
    const renderedItems = screen.getAllByTestId('directory-filter-item');
    expect(renderedItems).toHaveLength(8);
    expect(renderedItems[0]).toHaveTextContent('Ambient_Studio_Master.wav');
    expect(renderedItems[7]).toHaveTextContent('WCAG_Audit_Report.pdf');
    expect(screen.queryByTestId('directory-filter-group-header')).toBeNull();
  });

  it('supports custom aria-label and falls back cleanly on blank title', () => {
    render(
      <DirectoryFilterBar
        title="   "
        aria-label="Project Folder Filters"
        data-testid="custom-aria-root"
      />
    );

    const root = screen.getByTestId('custom-aria-root');
    expect(root).toHaveAttribute('aria-label', 'Project Folder Filters');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(
      screen.getByRole('heading', { name: 'Directory Filter & Grouping' })
    ).toBeInTheDocument();
  });

  it('filters case-insensitively by filename with IME-safe Escape clear, Enter guard, and clear button', () => {
    const onChange = vi.fn();
    render(<DirectoryFilterBar onChange={onChange} />);

    const searchInput = screen.getByRole('searchbox', {
      name: 'Filter folder by filename',
    });

    // Escape when query is empty is a no-op
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();

    // Type case-insensitive substring query
    fireEvent.change(searchInput, { target: { value: 'PRISM' } });
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 1 of 8 items'
    );
    expect(screen.getAllByTestId('directory-filter-item')).toHaveLength(1);
    expect(screen.getByTestId('directory-filter-item')).toHaveTextContent('Prism_Hero_4K.png');
    expect(onChange).toHaveBeenLastCalledWith(
      {
        query: 'PRISM',
        extension: 'all',
        tag: 'all',
        groupBy: 'none',
        sortDir: 'asc',
      },
      1
    );

    // Enter while composing is ignored; Enter when not composing prevents default
    const composingEnterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnterEvent, 'isComposing', { value: true });
    searchInput.dispatchEvent(composingEnterEvent);
    expect(composingEnterEvent.defaultPrevented).toBe(false);

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    searchInput.dispatchEvent(enterEvent);
    expect(enterEvent.defaultPrevented).toBe(true);

    // Escape during IME composition must NOT clear the query
    const callsBeforeComposingEscape = onChange.mock.calls.length;
    const composingEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEscape, 'isComposing', { value: true });
    searchInput.dispatchEvent(composingEscape);
    expect(searchInput).toHaveValue('PRISM');
    expect(onChange).toHaveBeenCalledTimes(callsBeforeComposingEscape);

    // Non-composing Escape clears the query
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 8 of 8 items'
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: '' }),
      8
    );

    // Inline clear button clears query
    fireEvent.change(searchInput, { target: { value: 'Audit' } });
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 1 of 8 items'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear filename filter' }));
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 8 of 8 items'
    );
  });

  it('filters via extension pills, toggles active pills off, and supports All pill reset', () => {
    const onChange = vi.fn();
    render(<DirectoryFilterBar onChange={onChange} />);

    const tsxPill = screen.getByTestId('directory-filter-ext-.tsx');
    fireEvent.click(tsxPill);

    expect(tsxPill).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('directory-filter-ext-all')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 2 of 8 items'
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ extension: '.tsx' }),
      2
    );

    // Clicking active .tsx pill toggles back to 'all'
    fireEvent.click(tsxPill);
    expect(tsxPill).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('directory-filter-ext-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 8 of 8 items'
    );

    // Select .zip, then explicitly click All
    fireEvent.click(screen.getByTestId('directory-filter-ext-.zip'));
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 1 of 8 items'
    );
    fireEvent.click(screen.getByTestId('directory-filter-ext-all'));
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 8 of 8 items'
    );
  });

  it('filters via all 5 semantic color tag pills and resets via toggle or All pill', () => {
    const onChange = vi.fn();
    render(<DirectoryFilterBar onChange={onChange} />);

    const expectedCounts: ReadonlyArray<readonly [string, number]> = [
      ['primary', 1],
      ['emerald', 2],
      ['amber', 2],
      ['info', 1],
      ['rose', 1],
    ];

    for (const [tone, expected] of expectedCounts) {
      const pill = screen.getByTestId(`directory-filter-tag-${tone}`);
      fireEvent.click(pill);
      expect(pill).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
        `Showing ${expected} of 8 items`
      );
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ tag: tone }),
        expected
      );
    }

    // Toggling active 'rose' pill off returns to all 8 items (including untagged WCAG_Audit_Report.pdf)
    fireEvent.click(screen.getByTestId('directory-filter-tag-rose'));
    expect(screen.getByTestId('directory-filter-tag-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 8 of 8 items'
    );

    // Selecting 'primary' then clicking 'All' restores all 8 items
    fireEvent.click(screen.getByTestId('directory-filter-tag-primary'));
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 1 of 8 items'
    );
    fireEvent.click(screen.getByTestId('directory-filter-tag-all'));
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 8 of 8 items'
    );
  });

  it('supports all 4 groupBy modes (none, kind, date, size) and asc/desc sorting within groups', () => {
    const onChange = vi.fn();
    render(<DirectoryFilterBar onChange={onChange} />);

    const groupSelect = screen.getByRole('combobox', {
      name: 'Group directory items by',
    });
    const sortToggle = screen.getByTestId('directory-filter-sort-toggle');

    // Mode 1: none + desc sort
    expect(sortToggle).toHaveAttribute('aria-pressed', 'false');
    expect(sortToggle).toHaveTextContent('Sort Asc');
    fireEvent.click(sortToggle);
    expect(sortToggle).toHaveAttribute('aria-pressed', 'true');
    expect(sortToggle).toHaveTextContent('Sort Desc');
    const descFlatItems = screen.getAllByTestId('directory-filter-item');
    expect(descFlatItems[0]).toHaveTextContent('WCAG_Audit_Report.pdf');
    expect(descFlatItems[7]).toHaveTextContent('Ambient_Studio_Master.wav');

    // Toggle back to asc
    fireEvent.click(sortToggle);
    expect(sortToggle).toHaveAttribute('aria-pressed', 'false');

    // Mode 2: kind
    fireEvent.change(groupSelect, { target: { value: 'kind' } });
    const kindHeaders = screen
      .getAllByTestId('directory-filter-group-header')
      .map((el) => el.textContent);
    expect(kindHeaders).toEqual([
      'Archive1',
      'Audio1',
      'Document2',
      'Image2',
      'TypeScript2',
    ]);
    const kindGroups = screen.getAllByTestId('directory-filter-group');
    const tsGroupAsc = kindGroups[4];
    expect(tsGroupAsc).toBeDefined();
    if (!tsGroupAsc) throw new Error('Expected TypeScript group in ascending order');
    expect(tsGroupAsc).toHaveAttribute('data-group-label', 'TypeScript');
    const tsItemsAsc = within(tsGroupAsc).getAllByTestId('directory-filter-item');
    expect(tsItemsAsc[0]).toHaveTextContent('DirectoryFilterBar.tsx');
    expect(tsItemsAsc[1]).toHaveTextContent('PrimaryButton.tsx');

    // Switch to desc inside kind grouping
    fireEvent.click(sortToggle);
    const tsGroupDesc = screen.getAllByTestId('directory-filter-group')[4];
    expect(tsGroupDesc).toBeDefined();
    if (!tsGroupDesc) throw new Error('Expected TypeScript group in descending order');
    const tsItemsDesc = within(tsGroupDesc).getAllByTestId('directory-filter-item');
    expect(tsItemsDesc[0]).toHaveTextContent('PrimaryButton.tsx');
    expect(tsItemsDesc[1]).toHaveTextContent('DirectoryFilterBar.tsx');

    // Mode 3: date (Today -> This Week -> Earlier)
    fireEvent.change(groupSelect, { target: { value: 'date' } });
    const dateLabels = screen
      .getAllByTestId('directory-filter-group')
      .map((el) => el.getAttribute('data-group-label'));
    expect(dateLabels).toEqual(['Today', 'This Week', 'Earlier']);

    // Mode 4: size (Small -> Medium -> Large)
    fireEvent.change(groupSelect, { target: { value: 'size' } });
    const sizeLabels = screen
      .getAllByTestId('directory-filter-group')
      .map((el) => el.getAttribute('data-group-label'));
    expect(sizeLabels).toEqual([
      'Small (< 100 KB)',
      'Medium (100 KB–10 MB)',
      'Large (> 10 MB)',
    ]);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ groupBy: 'size', sortDir: 'desc' }),
      8
    );

    // Back to none via select
    fireEvent.change(groupSelect, { target: { value: 'none' } });
    expect(screen.queryByTestId('directory-filter-group-header')).toBeNull();
  });

  it('shows a clean role="status" empty state when 0 items match and resets all filters cleanly', () => {
    const onChange = vi.fn();
    render(<DirectoryFilterBar onChange={onChange} />);

    const searchInput = screen.getByRole('searchbox', {
      name: 'Filter folder by filename',
    });
    const groupSelect = screen.getByRole('combobox', {
      name: 'Group directory items by',
    });

    fireEvent.change(searchInput, { target: { value: 'nonexistent-file-xyz' } });
    fireEvent.click(screen.getByTestId('directory-filter-ext-.tsx'));
    fireEvent.click(screen.getByTestId('directory-filter-tag-rose'));
    fireEvent.change(groupSelect, { target: { value: 'size' } });
    fireEvent.click(screen.getByTestId('directory-filter-sort-toggle'));

    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 0 of 8 items'
    );
    const emptyState = screen.getByRole('status');
    expect(emptyState).toHaveAttribute('data-testid', 'directory-filter-empty');
    expect(emptyState).toHaveTextContent('No matching directory items');
    expect(screen.queryByTestId('directory-filter-preview')).toBeNull();

    // Click Reset Filters
    const resetBtn = screen.getByRole('button', { name: 'Reset Filters' });
    fireEvent.click(resetBtn);

    expect(searchInput).toHaveValue('');
    expect(groupSelect).toHaveValue('none');
    expect(screen.getByTestId('directory-filter-sort-toggle')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 8 of 8 items'
    );
    expect(screen.queryByTestId('directory-filter-empty')).toBeNull();
    expect(screen.queryByTestId('directory-filter-reset')).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith(
      {
        query: '',
        extension: 'all',
        tag: 'all',
        groupBy: 'none',
        sortDir: 'asc',
      },
      8
    );
  });

  it('hides the results preview when showResultsPreview={false} while keeping toolbar & live count interactive', () => {
    const onChange = vi.fn();
    render(<DirectoryFilterBar showResultsPreview={false} onChange={onChange} />);

    expect(screen.queryByTestId('directory-filter-preview')).toBeNull();
    expect(screen.queryByTestId('directory-filter-empty')).toBeNull();
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 8 of 8 items'
    );

    const searchInput = screen.getByRole('searchbox', {
      name: 'Filter folder by filename',
    });
    fireEvent.change(searchInput, { target: { value: 'no-such-match' } });

    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 0 of 8 items'
    );
    expect(screen.queryByTestId('directory-filter-empty')).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'no-such-match' }),
      0
    );
  });

  it('is immune to prototype-keyed (__proto__, constructor) kinds/dates/extensions, ReDoS metacharacters, duplicate IDs, and edge sizes', () => {
    const adversarialItems: ReadonlyArray<DirectoryFilterItem> = [
      {
        id: 'dup-id',
        name: 'spec[v1]+(a+)+$.tsx',
        extension: '.tsx',
        kind: '__proto__',
        sizeBytes: 512,
        modifiedGroup: '__proto__',
        tag: 'primary',
      },
      {
        id: 'dup-id',
        name: 'spec[v1]+(a+)+$.tsx',
        extension: '__proto__',
        kind: 'constructor',
        sizeBytes: -100,
        modifiedGroup: 'Last Quarter',
      },
      {
        id: 'blank-meta',
        name: 'blob.bin',
        extension: '.bin',
        kind: '   ',
        sizeBytes: Number.NaN,
        modifiedGroup: '   ',
      },
      {
        id: 'ignored-ext',
        name: 'Makefile',
        extension: '   ',
        kind: 'Build',
        sizeBytes: 512_000,
        modifiedGroup: 'Archive 2024',
      },
      {
        id: 'all-ext',
        name: 'manifest.all',
        extension: 'all',
        kind: 'Build',
        sizeBytes: 12_582_912,
        modifiedGroup: 'Today',
      },
    ];

    render(
      <DirectoryFilterBar
        items={adversarialItems}
        defaultValue={{ groupBy: 'kind' }}
        data-testid="adversarial-root"
      />
    );

    // Object.prototype must remain completely untouched
    expect(Object.prototype).not.toHaveProperty('spec[v1]+(a+)+$.tsx');

    // Extension pills safely include '__proto__' and '.bin' while ignoring blank/'all'
    expect(screen.getByTestId('directory-filter-ext-__proto__')).toBeInTheDocument();
    expect(screen.getByTestId('directory-filter-ext-.bin')).toBeInTheDocument();

    // Kind grouping renders '__proto__', 'constructor', 'Build', and blank fallback 'Other'
    const kindLabels = screen
      .getAllByTestId('directory-filter-group')
      .map((el) => el.getAttribute('data-group-label'));
    expect(kindLabels).toEqual(['__proto__', 'Build', 'constructor', 'Other']);

    // Byte formatting handles < 1024 B, negative/NaN sanitized to 0 B, KB, and MB
    const items = screen.getAllByTestId('directory-filter-item');
    expect(items).toHaveLength(5);
    expect(screen.getByTestId('adversarial-root')).toHaveTextContent('512 B');
    expect(screen.getByTestId('adversarial-root')).toHaveTextContent('0 B');
    expect(screen.getByTestId('adversarial-root')).toHaveTextContent('500 KB');
    expect(screen.getByTestId('adversarial-root')).toHaveTextContent('12 MB');

    // Date grouping places known 'Today' first, followed by custom dates sorted alphabetically
    const groupSelect = screen.getByRole('combobox', {
      name: 'Group directory items by',
    });
    fireEvent.change(groupSelect, { target: { value: 'date' } });
    const dateLabels = screen
      .getAllByTestId('directory-filter-group')
      .map((el) => el.getAttribute('data-group-label'));
    expect(dateLabels).toEqual([
      'Today',
      '__proto__',
      'Archive 2024',
      'Last Quarter',
      'Other',
    ]);

    // Filter safely by '__proto__' extension
    fireEvent.click(screen.getByTestId('directory-filter-ext-__proto__'));
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 1 of 5 items'
    );
    fireEvent.click(screen.getByTestId('directory-filter-ext-all'));

    // ReDoS & regex-metacharacter search matches literally without RegExp backtracking
    // Also switch to flat 'none' grouping to exercise identical-name ID tie-breaking & duplicate-key dedup
    fireEvent.change(groupSelect, { target: { value: 'none' } });
    const searchInput = screen.getByRole('searchbox', {
      name: 'Filter folder by filename',
    });
    fireEvent.change(searchInput, { target: { value: '[v1]+(a+)+$' } });
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 2 of 5 items'
    );
    expect(screen.getAllByTestId('directory-filter-item')).toHaveLength(2);

    // Pathological ReDoS string returns 0 instantly without throwing
    fireEvent.change(searchInput, {
      target: { value: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!' },
    });
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 0 of 5 items'
    );
  });

  it('supports controlled mode via value + onChange and uncontrolled defaultValue initialization', () => {
    function ControlledHarness() {
      const [filterState, setFilterState] = useState<DirectoryFilterState>({
        query: '',
        extension: '.png',
        tag: 'all',
        groupBy: 'none',
        sortDir: 'asc',
      });
      const [lastCount, setLastCount] = useState<number>(2);

      return (
        <div>
          <span data-testid="controlled-count">{String(lastCount)}</span>
          <DirectoryFilterBar
            value={filterState}
            onChange={(next, count) => {
              setFilterState(next);
              setLastCount(count);
            }}
          />
        </div>
      );
    }

    render(<ControlledHarness />);
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 2 of 8 items'
    );
    expect(screen.getByTestId('directory-filter-ext-.png')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(screen.getByTestId('directory-filter-tag-emerald'));
    expect(screen.getByTestId('controlled-count')).toHaveTextContent('1');
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 1 of 8 items'
    );
    expect(screen.getByTestId('directory-filter-item')).toHaveTextContent('Prism_Hero_4K.png');
  });

  it('respects frozen controlled value when parent does not update state', () => {
    const onChange = vi.fn();
    const frozenValue: DirectoryFilterState = {
      query: 'Primary',
      extension: 'all',
      tag: 'all',
      groupBy: 'none',
      sortDir: 'asc',
    };

    render(<DirectoryFilterBar value={frozenValue} onChange={onChange} />);
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 1 of 8 items'
    );

    fireEvent.click(screen.getByTestId('directory-filter-reset'));
    expect(onChange).toHaveBeenLastCalledWith(
      {
        query: '',
        extension: 'all',
        tag: 'all',
        groupBy: 'none',
        sortDir: 'asc',
      },
      8
    );
    // Still shows frozen controlled state
    expect(screen.getByTestId('directory-filter-match-count')).toHaveTextContent(
      'Showing 1 of 8 items'
    );
  });

  it('disables all interactive controls and blocks state changes when disabled={true}', () => {
    const onChange = vi.fn();
    render(
      <DirectoryFilterBar
        disabled
        defaultValue={{ query: 'Prism', extension: '.png' }}
        onChange={onChange}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const searchInput = screen.getByRole('searchbox', {
      name: 'Filter folder by filename',
    });
    const clearBtn = screen.getByTestId('directory-filter-clear-query');
    const groupSelect = screen.getByRole('combobox', {
      name: 'Group directory items by',
    });
    const sortToggle = screen.getByTestId('directory-filter-sort-toggle');
    const resetBtn = screen.getByTestId('directory-filter-reset');
    const extBtn = screen.getByTestId('directory-filter-ext-.tsx');
    const tagBtn = screen.getByTestId('directory-filter-tag-emerald');

    expect(searchInput).toBeDisabled();
    expect(clearBtn).toBeDisabled();
    expect(groupSelect).toBeDisabled();
    expect(sortToggle).toBeDisabled();
    expect(resetBtn).toBeDisabled();
    expect(extBtn).toBeDisabled();
    expect(tagBtn).toBeDisabled();

    // Even synthetic change/keyDown events are guarded by commitState
    fireEvent.change(searchInput, { target: { value: 'changed' } });
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    fireEvent.change(groupSelect, { target: { value: 'size' } });
    fireEvent.click(sortToggle);
    fireEvent.click(resetBtn);
    fireEvent.click(extBtn);
    fireEvent.click(tagBtn);

    expect(onChange).not.toHaveBeenCalled();
    expect(searchInput).toHaveValue('Prism');
    expect(groupSelect).toHaveValue('none');
  });
});
